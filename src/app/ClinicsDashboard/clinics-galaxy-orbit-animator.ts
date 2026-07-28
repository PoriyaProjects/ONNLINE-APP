import { GalaxyPlanetLayout } from './clinics-galaxy.models';

/** DOM handles for one planet, supplied by the component after `*ngFor` renders. */
export interface GalaxyPlanetElements {
  planetEl: HTMLElement;
  /** Spoke line from the galaxy center to this planet (absent for the center itself). */
  lineEl?: SVGLineElement | null;
}

interface Tween {
  from: number;
  to: number;
  startMs: number;
  durationMs: number;
}

interface OrbitState {
  angle: number;
  angularSpeed: number;
  radius: number;
  size: number;
  radiusTween?: Tween;
  sizeTween?: Tween;
}

const RECENTER_DURATION_MS = 1350;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tweenValue(current: number, tween: Tween | undefined, nowMs: number): { value: number; done: boolean } {
  if (!tween) {
    return { value: current, done: true };
  }
  const t = Math.min(1, (nowMs - tween.startMs) / tween.durationMs);
  const value = tween.from + (tween.to - tween.from) * easeInOutCubic(t);
  return { value, done: t >= 1 };
}

/**
 * Drives the continuous orbital motion and the "click to recenter" transition
 * for every clinic planet, entirely outside Angular's change detection.
 *
 * Rendering (HTML/SCSS) and physics (this class) are intentionally separate:
 * this animator never creates or removes DOM nodes — it only ever reads a
 * layout + writes CSS custom properties / SVG attributes on elements handed
 * to it by the component. Implemented with a plain `requestAnimationFrame`
 * loop (no external animation library) so it has zero extra dependencies.
 */
export class GalaxyOrbitAnimator {
  private readonly states = new Map<string, OrbitState>();
  private elements = new Map<string, GalaxyPlanetElements>();
  private centerX = 0;
  private centerY = 0;
  private running = false;
  private rafId: number | null = null;
  private lastFrameMs = 0;

  private readonly tick = (nowMs: number) => this.onTick(nowMs);

  setViewportCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  /** Registers/refreshes the planets this animator should keep moving. */
  sync(layouts: GalaxyPlanetLayout[], elements: Map<string, GalaxyPlanetElements>): void {
    this.elements = elements;
    const seen = new Set<string>();
    const now = performance.now();

    layouts.forEach((layout) => {
      seen.add(layout.id);
      const existing = this.states.get(layout.id);
      if (!existing) {
        this.states.set(layout.id, {
          angle: layout.baseAngle,
          angularSpeed: layout.angularSpeed,
          radius: layout.orbitRadius,
          size: layout.sizePx
        });
        return;
      }

      existing.angularSpeed = layout.angularSpeed;
      if (Math.abs(existing.radius - layout.orbitRadius) > 0.5) {
        existing.radiusTween = { from: existing.radius, to: layout.orbitRadius, startMs: now, durationMs: RECENTER_DURATION_MS };
      }
      if (Math.abs(existing.size - layout.sizePx) > 0.5) {
        existing.sizeTween = { from: existing.size, to: layout.sizePx, startMs: now, durationMs: RECENTER_DURATION_MS };
      }
    });

    Array.from(this.states.keys()).forEach((id) => {
      if (!seen.has(id)) {
        this.states.delete(id);
      }
    });

    this.start();
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.states.clear();
    this.elements.clear();
  }

  private onTick(nowMs: number): void {
    if (!this.running) {
      return;
    }
    const dt = Math.min(0.05, (nowMs - this.lastFrameMs) / 1000);
    this.lastFrameMs = nowMs;

    this.states.forEach((state, id) => {
      state.angle += state.angularSpeed * dt;

      const radiusResult = tweenValue(state.radius, state.radiusTween, nowMs);
      state.radius = radiusResult.value;
      if (radiusResult.done) {
        state.radiusTween = undefined;
      }

      const sizeResult = tweenValue(state.size, state.sizeTween, nowMs);
      state.size = sizeResult.value;
      if (sizeResult.done) {
        state.sizeTween = undefined;
      }

      const x = Math.cos(state.angle) * state.radius;
      const y = Math.sin(state.angle) * state.radius * 0.82;

      const els = this.elements.get(id);
      if (!els) {
        return;
      }

      const planetStyle = els.planetEl.style;
      planetStyle.setProperty('--planet-x', `${x.toFixed(1)}px`);
      planetStyle.setProperty('--planet-y', `${y.toFixed(1)}px`);
      planetStyle.setProperty('--planet-size', `${state.size.toFixed(1)}px`);

      if (els.lineEl) {
        els.lineEl.setAttribute('x1', String(this.centerX));
        els.lineEl.setAttribute('y1', String(this.centerY));
        els.lineEl.setAttribute('x2', String(this.centerX + x));
        els.lineEl.setAttribute('y2', String(this.centerY + y));
      }
    });

    this.rafId = requestAnimationFrame(this.tick);
  }
}
