import {
  GALAXY_COLOR_THEMES,
  GALAXY_SIZE_PX,
  GalaxyColorTheme,
  GalaxyLayoutResult,
  GalaxyPlanetInput,
  GalaxyPlanetLayout,
  GalaxySizeTier
} from './clinics-galaxy.models';

/**
 * Horizontal Galaxy layout.
 *
 * Clinics are arranged left-to-right across the full stage width.
 * The busiest clinic sits near the middle; neighbors fan out with even gaps.
 * Diameters scale uniformly when needed so nothing overlaps or clips.
 * Motion is CSS float only.
 */

const STAGE_PADDING_X = 18;
const STAGE_PADDING_Y = 22;
const MIN_GAP = 12;
const FLOAT_BUDGET = 10;
/** Gentle vertical wave amplitude as a fraction of usable half-height. */
const WAVE_FRAC = 0.22;

interface SizedClinic {
  id: string;
  rank: number;
  sizePx: number;
  tier: GalaxySizeTier;
}

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

function sizeForRank(rank: number, total: number): { tier: GalaxySizeTier; sizePx: number } {
  if (rank === 0) {
    return { tier: 'large', sizePx: GALAXY_SIZE_PX.large };
  }

  const steps = Math.max(1, total - 1);
  const t = rank / steps;
  const sizePx = Math.round(
    GALAXY_SIZE_PX.medium - t * (GALAXY_SIZE_PX.medium - GALAXY_SIZE_PX.tiny)
  );
  const clamped = Math.max(GALAXY_SIZE_PX.tiny, Math.min(GALAXY_SIZE_PX.medium, sizePx));

  if (clamped >= 148) {
    return { tier: 'medium', sizePx: clamped };
  }
  if (clamped >= 116) {
    return { tier: 'small', sizePx: clamped };
  }
  return { tier: 'tiny', sizePx: clamped };
}

function resolveOrder(inputs: GalaxyPlanetInput[]): string[] {
  return [...inputs].sort((a, b) => b.patients - a.patients).map(i => i.id);
}

function assignUniqueColors(order: string[]): Map<string, GalaxyColorTheme> {
  const themes = [...GALAXY_COLOR_THEMES];
  const result = new Map<string, GalaxyColorTheme>();
  order.forEach((id, index) => {
    result.set(id, themes[index % themes.length]);
  });
  return result;
}

/**
 * Left→right display order with the largest clinic in the middle:
 * […odd ranks descending…, rank0, …even ranks ascending…]
 * e.g. ranks 0..9 → [9,7,5,3,1, 0, 2,4,6,8]
 */
function buildRowOrder(ranked: SizedClinic[]): SizedClinic[] {
  if (ranked.length <= 1) {
    return [...ranked];
  }

  const left: SizedClinic[] = [];
  const right: SizedClinic[] = [];

  for (let rank = 1; rank < ranked.length; rank++) {
    if (rank % 2 === 1) {
      left.push(ranked[rank]);
    } else {
      right.push(ranked[rank]);
    }
  }

  left.reverse();
  return [...left, ranked[0], ...right];
}

/**
 * Scale diameters so the row fits the stage width and height.
 * Returns the uniform scale factor (≤ 1).
 */
function fitRowScale(sizes: number[], stageW: number, stageH: number): number {
  const n = sizes.length;
  if (!n) {
    return 1;
  }

  const maxH = Math.max(48, stageH - 2 * (STAGE_PADDING_Y + FLOAT_BUDGET));
  const availW = Math.max(80, stageW - 2 * STAGE_PADDING_X);
  const sum = sizes.reduce((a, b) => a + b, 0);
  const gaps = Math.max(0, n - 1) * MIN_GAP;
  const needW = sum + gaps;

  let scale = 1;
  if (needW > availW) {
    scale = Math.min(scale, availW / needW);
  }

  const maxSize = Math.max(...sizes);
  if (maxSize * scale > maxH) {
    scale = Math.min(scale, maxH / maxSize);
  }

  return Math.max(0.35, Math.min(1, scale));
}

/**
 * Place a horizontal row: even leftover space as gaps, mild vertical stagger.
 * Coordinates are offsets from the stage center.
 */
function placeHorizontalRow(
  row: SizedClinic[],
  scale: number,
  stageW: number,
  stageH: number
): Map<string, { x: number; y: number; sizePx: number }> {
  const result = new Map<string, { x: number; y: number; sizePx: number }>();
  const n = row.length;
  if (!n) {
    return result;
  }

  const sizes = row.map(c => Math.max(48, Math.round(c.sizePx * scale)));
  const sum = sizes.reduce((a, b) => a + b, 0);
  const availW = Math.max(80, stageW - 2 * STAGE_PADDING_X);
  const leftover = Math.max(0, availW - sum);
  const gap = n > 1 ? leftover / (n - 1) : 0;

  const halfW = stageW / 2;
  const usableHalfH = Math.max(40, stageH / 2 - STAGE_PADDING_Y - FLOAT_BUDGET);
  const waveAmp = usableHalfH * WAVE_FRAC;

  let cursor = n === 1 ? halfW - sizes[0] / 2 : STAGE_PADDING_X;

  row.forEach((clinic, i) => {
    const sizePx = sizes[i];
    const centerX = cursor + sizePx / 2;
    const x = centerX - halfW;

    // Largest stays on the midline; neighbors alternate above/below for rhythm.
    let y = 0;
    if (clinic.rank !== 0) {
      y = (i % 2 === 0 ? -1 : 1) * waveAmp;
    }

    const maxY = usableHalfH - sizePx / 2;
    const clampedY = Math.max(-maxY, Math.min(maxY, y));

    result.set(clinic.id, { x, y: clampedY, sizePx });
    cursor += sizePx + gap;
  });

  return result;
}

export function computeGalaxyLayout(
  inputs: GalaxyPlanetInput[],
  containerSize: { width: number; height: number },
  _previousOrder?: string[]
): GalaxyLayoutResult {
  if (!inputs.length) {
    return { layouts: [], order: [] };
  }

  const order = resolveOrder(inputs);
  const colorById = assignUniqueColors(order);

  const ranked: SizedClinic[] = order.map((id, rank) => {
    const sized = sizeForRank(rank, order.length);
    return { id, rank, sizePx: sized.sizePx, tier: sized.tier };
  });

  const stageW = Math.max(240, containerSize.width);
  const stageH = Math.max(200, containerSize.height);
  const row = buildRowOrder(ranked);
  const scale = fitRowScale(
    row.map(c => c.sizePx),
    stageW,
    stageH
  );
  const placed = placeHorizontalRow(row, scale, stageW, stageH);

  const layouts: GalaxyPlanetLayout[] = ranked.map((clinic) => {
    const seed = hashString(clinic.id);
    const rand = seededRandom(seed);
    const pos = placed.get(clinic.id) || { x: 0, y: 0, sizePx: clinic.sizePx };

    return {
      id: clinic.id,
      rank: clinic.rank,
      isCenter: clinic.rank === 0,
      sizeTier: clinic.tier,
      sizePx: pos.sizePx,
      colorTheme: colorById.get(clinic.id) || 'blue',
      x: Math.round(pos.x * 10) / 10,
      y: Math.round(pos.y * 10) / 10,
      floatAmpY: Math.round((3.5 + rand() * 4.5) * 10) / 10,
      floatAmpX: Math.round((0.8 + rand() * 1.6) * 10) / 10,
      floatDuration: Math.round((5.5 + rand() * 4.5) * 100) / 100,
      floatDelay: Math.round((-rand() * 6) * 100) / 100,
      seed: seed % 1000
    };
  });

  return { layouts, order };
}

/** Kept for API compatibility — selection no longer reorders the galaxy. */
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
