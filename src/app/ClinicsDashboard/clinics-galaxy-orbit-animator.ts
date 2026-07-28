import gsap from 'gsap';
import { GalaxyPlanetLayout } from './clinics-galaxy.models';

/** DOM handles for one planet, supplied by the component after `*ngFor` renders. */
export interface GalaxyPlanetElements {
  planetEl: HTMLElement;
  /** Spoke line from the galaxy center to this planet (absent for the center itself). */
  lineEl?: SVGLineElement | null;
}

interface OrbitState {
  angle: number;
  angularSpeed: number;
  radius: number;
  size: number;
}

const RECENTER_DURATION = 1.35;

/**
 * Drives the continuous orbital motion and the "click to recenter" transition
 * for every clinic planet, entirely outside Angular's change detection.
 *
 * Rendering (HTML/SCSS) and physics (this class) are intentionally separate:
 * this animator never creates or removes DOM nodes — it only ever reads a
 * layout + writes CSS custom properties / SVG attributes on elements handed
 * to it by the component.
 */
export class GalaxyOrbitAnimator {
  private readonly states = new Map<string, OrbitState>();
  private elements = new Map<string, GalaxyPlanetElements>();
  private centerX = 0;
  private centerY = 0;
  private running = false;

  private readonly tick = () => this.onTick();

  setViewportCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  /** Registers/refreshes the planets this animator should keep moving. */
  sync(layouts: GalaxyPlanetLayout[], elements: Map<string, GalaxyPlanetElements>): void {
    this.elements = elements;
    const seen = new Set<string>();

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
        gsap.killTweensOf(existing, 'radius');
        gsap.to(existing, { radius: layout.orbitRadius, duration: RECENTER_DURATION, ease: 'power3.inOut' });
      }
      if (Math.abs(existing.size - layout.sizePx) > 0.5) {
        gsap.killTweensOf(existing, 'size');
        gsap.to(existing, { size: layout.sizePx, duration: RECENTER_DURATION, ease: 'power3.inOut' });
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
    gsap.ticker.add(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    gsap.ticker.remove(this.tick);
  }

  destroy(): void {
    this.stop();
    this.states.forEach(state => gsap.killTweensOf(state));
    this.states.clear();
    this.elements.clear();
  }

  private onTick(): void {
    const dt = Math.min(0.05, gsap.ticker.deltaRatio(60) / 60);

    this.states.forEach((state, id) => {
      state.angle += state.angularSpeed * dt;

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
  }
}
