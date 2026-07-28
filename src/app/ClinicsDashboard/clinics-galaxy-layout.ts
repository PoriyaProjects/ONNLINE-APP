import {
  GALAXY_COLOR_THEMES,
  GALAXY_ICONS,
  GALAXY_SIZE_PX,
  GalaxyColorTheme,
  GalaxyLayoutResult,
  GalaxyPlanetInput,
  GalaxyPlanetLayout,
  GalaxySizeTier
} from './clinics-galaxy.models';

/**
 * Pure layout engine for the Galaxy View.
 *
 * No DOM access, no animation — just deterministic math that turns a list of
 * clinics (+ an optional "who's currently the center" order) into concentric,
 * non-overlapping orbital positions. Kept isolated so it can be unit-tested
 * and reused by both the initial render and the click-to-recenter transition.
 */

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sizeTierFor(ratio: number): GalaxySizeTier {
  if (ratio >= 0.62) {
    return 'large';
  }
  if (ratio >= 0.34) {
    return 'medium';
  }
  if (ratio >= 0.14) {
    return 'small';
  }
  return 'tiny';
}

/**
 * Builds the clinic rank order (index 0 = galaxy center).
 * - With no previous order (fresh dataset), the largest clinic wins the center.
 * - With a previous order, membership is preserved so unrelated clinics don't
 *   jump rings when the list is merely refreshed; brand new clinics are
 *   appended (largest-first) into the outer rings.
 */
function resolveOrder(inputs: GalaxyPlanetInput[], previousOrder?: string[]): string[] {
  const byPatientsDesc = [...inputs].sort((a, b) => b.patients - a.patients);
  if (!previousOrder || !previousOrder.length) {
    return byPatientsDesc.map(i => i.id);
  }
  const known = new Set(previousOrder);
  const stillPresent = previousOrder.filter(id => inputs.some(i => i.id === id));
  const freshIds = byPatientsDesc.filter(i => !known.has(i.id)).map(i => i.id);
  return [...stillPresent, ...freshIds];
}

interface RingSlot {
  ring: number;
  ringCount: number;
  ringIndexInRing: number;
  radius: number;
}

/**
 * Distributes ordered clinic ids into concentric rings whose capacity grows
 * with their circumference, so bigger/further rings can hold more planets
 * without overlapping. Ring 0 always holds exactly the center clinic.
 */
function assignRings(
  order: string[],
  sizeById: Map<string, number>,
  containerMinDim: number
): Map<string, RingSlot> {
  const baseRadius = Math.max(170, containerMinDim * 0.2);
  const ringGap = Math.max(120, containerMinDim * 0.13);

  const buckets: string[][] = [[]];
  let ring = 0;
  let capacity = 1;

  order.forEach((id) => {
    if (buckets[ring].length >= capacity) {
      ring += 1;
      buckets[ring] = [];
      const radius = baseRadius + (ring - 1) * ringGap;
      const avgSize = sizeById.get(id) || GALAXY_SIZE_PX.small;
      capacity = Math.max(4, Math.floor((2 * Math.PI * radius) / (avgSize * 1.35)));
    }
    buckets[ring].push(id);
  });

  const result = new Map<string, RingSlot>();
  buckets.forEach((bucket, ringIdx) => {
    const radius = ringIdx === 0 ? 0 : baseRadius + (ringIdx - 1) * ringGap;
    bucket.forEach((id, indexInRing) =>
      result.set(id, { ring: ringIdx, ringCount: bucket.length, ringIndexInRing: indexInRing, radius }));
  });
  return result;
}

export function computeGalaxyLayout(
  inputs: GalaxyPlanetInput[],
  containerSize: { width: number; height: number },
  previousOrder?: string[]
): GalaxyLayoutResult {
  if (!inputs.length) {
    return { layouts: [], order: [] };
  }

  const order = resolveOrder(inputs, previousOrder);
  const byId = new Map(inputs.map(i => [i.id, i]));
  const maxPatients = Math.max(1, ...inputs.map(i => i.patients));

  const sizeById = new Map<string, number>();
  const tierById = new Map<string, GalaxySizeTier>();
  order.forEach((id) => {
    const clinic = byId.get(id);
    const ratio = clinic ? clinic.patients / maxPatients : 0;
    const tier = sizeTierFor(ratio);
    tierById.set(id, tier);
    sizeById.set(id, GALAXY_SIZE_PX[tier]);
  });

  const minDim = Math.max(320, Math.min(containerSize.width, containerSize.height));
  const rings = assignRings(order, sizeById, minDim);

  const layouts: GalaxyPlanetLayout[] = order.map((id, rank) => {
    const clinic = byId.get(id);
    const seed = hashString(id);
    const rand = seededRandom(seed);
    const ringInfo = rings.get(id) || { ring: 0, ringCount: 1, ringIndexInRing: 0, radius: 0 };
    const isCenter = ringInfo.ring === 0;

    const evenSpacing = ringInfo.ringCount > 0 ? (Math.PI * 2) / ringInfo.ringCount : 0;
    const jitter = (rand() - 0.5) * evenSpacing * 0.3;
    const ringRotationOffset = ringInfo.ring * 0.4;
    const baseAngle = isCenter ? 0 : ringInfo.ringIndexInRing * evenSpacing + jitter + ringRotationOffset;

    const revolutionSeconds = 34 + ringInfo.ring * 20;
    const direction = ringInfo.ring % 2 === 0 ? 1 : -1;
    const angularSpeed = isCenter
      ? 0
      : ((Math.PI * 2) / revolutionSeconds) * direction * (0.82 + rand() * 0.36);

    const colorTheme: GalaxyColorTheme = GALAXY_COLOR_THEMES[seed % GALAXY_COLOR_THEMES.length];
    const icon = GALAXY_ICONS[seed % GALAXY_ICONS.length];

    return {
      id,
      rank,
      ring: ringInfo.ring,
      ringCount: ringInfo.ringCount,
      isCenter,
      sizeTier: tierById.get(id) || 'small',
      sizePx: sizeById.get(id) || GALAXY_SIZE_PX.small,
      colorTheme,
      icon,
      baseAngle,
      angularSpeed,
      orbitRadius: ringInfo.radius,
      seed: seed % 1000
    };
  });

  return { layouts, order };
}

/**
 * Swaps the clicked clinic into rank 0 (center) and the previous center into
 * the rank the clicked clinic vacated, then recomputes the full layout from
 * that order. Everything else keeps its rank, so only the two swapped
 * clinics need to animate to new orbits.
 */
export function swapToCenter(order: string[], clickedId: string): string[] {
  const idx = order.indexOf(clickedId);
  if (idx <= 0) {
    return order;
  }
  const next = [...order];
  const previousCenter = next[0];
  next[0] = clickedId;
  next[idx] = previousCenter;
  return next;
}
