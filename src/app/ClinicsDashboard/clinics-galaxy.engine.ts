/**
 * ClinicGalaxyEngine
 * ------------------
 * A dependency-free HTML5 Canvas engine that renders every clinic as a glowing,
 * orbiting "planet" inside an animated medical galaxy. No external animation
 * libraries are required (no GSAP/D3/Three.js), which keeps this safe to drop
 * into an Angular 9 app without touching the dependency tree.
 *
 * Responsibilities:
 *  - Continuous 60fps animation loop (orbit, float, breathing glow, pulses).
 *  - Concentric-ring layout: the largest clinic sits at the center, every
 *    other clinic orbits around it in rings sized by patient volume.
 *  - Animated glowing connections between the center and nearby clinics.
 *  - Mouse interaction: hover (tooltip + glow), click-to-recenter (cinematic
 *    swap animation), drag-to-pan and wheel-to-zoom with inertia.
 *  - A living animated background: nebula blobs, parallax starfield, drifting
 *    particles.
 */

// TypeScript's bundled DOM lib for this project's compiler version predates the
// ResizeObserver API, so declare a minimal ambient shape for it here.
declare global {
  interface ResizeObserverEntry {
    target: Element;
  }
  class ResizeObserver {
    constructor(callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void);
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
  }
}

export interface GalaxyClinicData {
  id: string;
  name: string;
  patients: number;
  attendanceRate: number;
  loadRate: number;
  hoursLabel: string;
}

export interface GalaxyEngineCallbacks {
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  hue: string;
  depth: number;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  hue: string;
  phase: number;
}

interface GalaxyNode {
  id: string;
  data: GalaxyClinicData;
  themeIndex: number;
  ring: number;
  ringCount: number;
  ringIndexInRing: number;
  angle: number;
  angularSpeed: number;
  targetRadius: number;
  currentRadius: number;
  targetSize: number;
  currentSize: number;
  floatPhase: number;
  floatSpeed: number;
  breathPhase: number;
  breathSpeed: number;
  hoverT: number;
  isCenter: boolean;
  x: number;
  y: number;
  displaySize: number;
  seed: number;
}

export const GALAXY_THEMES = [
  { name: 'blue', core: '#59b8ff', mid: '#1c6fd0', edge: 'rgba(124,216,255,0.9)', glow: 'rgba(63,169,255,0.65)' },
  { name: 'purple', core: '#c39dff', mid: '#7c4de0', edge: 'rgba(210,180,255,0.9)', glow: 'rgba(180,140,255,0.65)' },
  { name: 'cyan', core: '#63f2e6', mid: '#159c95', edge: 'rgba(150,255,245,0.9)', glow: 'rgba(75,232,224,0.6)' },
  { name: 'orange', core: '#ffc46b', mid: '#d97f22', edge: 'rgba(255,214,150,0.9)', glow: 'rgba(255,180,84,0.6)' },
  { name: 'green', core: '#5fe8bd', mid: '#189a6d', edge: 'rgba(150,255,220,0.9)', glow: 'rgba(53,211,163,0.6)' },
  { name: 'pink', core: '#ff8ecb', mid: '#d13f8f', edge: 'rgba(255,180,220,0.9)', glow: 'rgba(255,107,176,0.6)' }
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** How many planets fit in ring N (ring 0 is always just the center). */
function ringCapacity(ring: number): number {
  if (ring <= 0) {
    return 1;
  }
  return 5 + (ring - 1) * 4;
}

export class ClinicGalaxyEngine {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = Math.min(2, (window.devicePixelRatio || 1));

  private nodes: GalaxyNode[] = [];
  private nodeMap = new Map<string, GalaxyNode>();
  private order: string[] = [];

  private stars: Star[] = [];
  private particles: Particle[] = [];

  private camera = {
    panX: 0, panY: 0, zoom: 1,
    targetPanX: 0, targetPanY: 0, targetZoom: 1,
    velX: 0, velY: 0
  };
  private userAdjustedCamera = false;

  private dragging = false;
  private dragMoved = false;
  private lastPointer = { x: 0, y: 0 };

  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  private rafId: number | null = null;
  private startTime = performance.now();
  private lastTime = this.startTime;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  private readonly onPointerMove = (ev: PointerEvent) => this.handlePointerMove(ev);
  private readonly onPointerDown = (ev: PointerEvent) => this.handlePointerDown(ev);
  private readonly onPointerUp = (ev: PointerEvent) => this.handlePointerUp(ev);
  private readonly onWheel = (ev: WheelEvent) => this.handleWheel(ev);
  private readonly onLeave = () => this.handlePointerLeave();

  constructor(
    private canvas: HTMLCanvasElement,
    private tooltipEl: HTMLElement | null,
    private callbacks: GalaxyEngineCallbacks = {}
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = ctx;

    this.buildBackground();
    this.attachEvents();
    this.resize();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      const parent = canvas.parentElement;
      if (parent) {
        this.resizeObserver.observe(parent);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  // ---------------------------------------------------------------- Public

  setData(data: GalaxyClinicData[]): void {
    const sorted = [...data].sort((a, b) => b.patients - a.patients);
    const maxPatients = sorted.length ? Math.max(1, sorted[0].patients) : 1;

    const nextNodes: GalaxyNode[] = [];
    const nextMap = new Map<string, GalaxyNode>();

    sorted.forEach((clinic, index) => {
      const existing = this.nodeMap.get(clinic.id);
      const seed = hashString(clinic.id || clinic.name || String(index));
      const rand = mulberry32(seed);
      const themeIndex = seed % GALAXY_THEMES.length;
      const isCenter = index === 0;

      const sizeFactor = Math.sqrt(clinic.patients / maxPatients || 0);
      const targetSize = isCenter
        ? 96 + sizeFactor * 34
        : 34 + sizeFactor * 46;

      const node: GalaxyNode = existing || {
        id: clinic.id,
        data: clinic,
        themeIndex,
        ring: 0,
        ringCount: 1,
        ringIndexInRing: 0,
        angle: rand() * Math.PI * 2,
        angularSpeed: 0,
        targetRadius: 0,
        currentRadius: 0,
        targetSize,
        currentSize: targetSize * 0.4,
        floatPhase: rand() * Math.PI * 2,
        floatSpeed: 0.35 + rand() * 0.35,
        breathPhase: rand() * Math.PI * 2,
        breathSpeed: 0.5 + rand() * 0.4,
        hoverT: 0,
        isCenter,
        x: 0, y: 0,
        displaySize: targetSize,
        seed
      };

      node.data = clinic;
      node.isCenter = isCenter;
      node.targetSize = targetSize;
      nextNodes.push(node);
      nextMap.set(clinic.id, node);
    });

    this.nodes = nextNodes;
    this.nodeMap = nextMap;
    this.order = nextNodes.map(n => n.id);

    if (this.selectedId && !nextMap.has(this.selectedId)) {
      this.selectedId = null;
    }
    if (this.hoveredId && !nextMap.has(this.hoveredId)) {
      this.hoveredId = null;
    }

    this.recomputeLayout(true);
  }

  selectClinic(id: string): void {
    if (!this.nodeMap.has(id)) {
      return;
    }
    this.selectedId = id;
    const centerId = this.order[0];
    if (id === centerId) {
      return;
    }
    const idx = this.order.indexOf(id);
    if (idx <= 0) {
      return;
    }
    // Swap ranks: clicked clinic becomes the new center, previous center
    // moves out into the orbit slot the clicked clinic vacated.
    this.order[0] = id;
    this.order[idx] = centerId;
    this.recomputeLayout(false);
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) {
      return;
    }
    const rect = parent.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildBackground();
    this.recomputeLayout(false);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.detachEvents();
  }

  // -------------------------------------------------------------- Layout

  private ringMetrics() {
    const minDim = Math.min(this.width, this.height);
    const baseRadius = Math.max(150, minDim * 0.17);
    const ringGap = Math.max(92, minDim * 0.105);
    return { baseRadius, ringGap };
  }

  private recomputeLayout(isFreshData: boolean): void {
    if (!this.nodes.length) {
      return;
    }
    const { baseRadius, ringGap } = this.ringMetrics();

    let ring = 0;
    let slotsLeftInRing = ringCapacity(0);
    let indexInRing = 0;
    let ringSizes: number[] = [];
    const ringBuckets: GalaxyNode[][] = [];

    this.order.forEach((id) => {
      const node = this.nodeMap.get(id);
      if (!node) {
        return;
      }
      if (slotsLeftInRing <= 0) {
        ring += 1;
        slotsLeftInRing = ringCapacity(ring);
        indexInRing = 0;
      }
      if (!ringBuckets[ring]) {
        ringBuckets[ring] = [];
      }
      ringBuckets[ring].push(node);
      node.ring = ring;
      node.ringIndexInRing = indexInRing;
      slotsLeftInRing -= 1;
      indexInRing += 1;
    });

    ringSizes = ringBuckets.map(b => (b ? b.length : 0));

    ringBuckets.forEach((bucket, ringIdx) => {
      if (!bucket) {
        return;
      }
      const count = bucket.length;
      const radius = ringIdx === 0 ? 0 : baseRadius + (ringIdx - 1) * ringGap;
      const direction = ringIdx % 2 === 0 ? 1 : -1;
      const angularSpeedBase = ringIdx === 0 ? 0.012 : (0.045 / (ringIdx + 0.6)) * direction;

      bucket.forEach((node) => {
        const rand = mulberry32(node.seed + ringIdx * 97);
        node.ringCount = count;
        node.targetRadius = radius;
        node.angularSpeed = angularSpeedBase * (0.75 + rand() * 0.5);
        if (count > 0 && ringIdx > 0 && isFreshData) {
          const evenSpacing = (Math.PI * 2) / count;
          const jitter = (rand() - 0.5) * evenSpacing * 0.28;
          node.angle = node.ringIndexInRing * evenSpacing + jitter + (ringIdx * 0.35);
        }
      });
    });

    if (!this.userAdjustedCamera) {
      const outer = baseRadius + Math.max(0, ringSizes.length - 2) * ringGap;
      const halfMin = Math.min(this.width, this.height) / 2;
      const fit = clamp((halfMin * 0.86) / Math.max(outer, 160), 0.5, 1.25);
      this.camera.targetZoom = fit;
      if (isFreshData) {
        this.camera.zoom = fit;
      }
      this.camera.targetPanX = 0;
      this.camera.targetPanY = 0;
    }
  }

  private shortestAngleLerp(from: number, to: number, t: number): number {
    let diff = (to - from) % (Math.PI * 2);
    if (diff > Math.PI) { diff -= Math.PI * 2; }
    if (diff < -Math.PI) { diff += Math.PI * 2; }
    return from + diff * t;
  }

  // ------------------------------------------------------------- Events

  private attachEvents(): void {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('pointerleave', this.onLeave);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
  }

  private handlePointerDown(ev: PointerEvent): void {
    this.dragging = true;
    this.dragMoved = false;
    this.lastPointer = { x: ev.clientX, y: ev.clientY };
    this.camera.velX = 0;
    this.camera.velY = 0;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  private handlePointerMove(ev: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;

    if (this.dragging) {
      const dx = ev.clientX - this.lastPointer.x;
      const dy = ev.clientY - this.lastPointer.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragMoved = true;
        this.userAdjustedCamera = true;
      }
      const wdx = dx / this.camera.zoom;
      const wdy = dy / this.camera.zoom;
      this.camera.panX += wdx;
      this.camera.panY += wdy;
      this.camera.targetPanX = this.camera.panX;
      this.camera.targetPanY = this.camera.panY;
      this.camera.velX = wdx;
      this.camera.velY = wdy;
      this.lastPointer = { x: ev.clientX, y: ev.clientY };
      this.setHover(null);
      return;
    }

    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTest(world.x, world.y);
    this.setHover(hit ? hit.id : null);
  }

  private handlePointerUp(ev: PointerEvent): void {
    if (this.dragging && !this.dragMoved) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);
      const hit = this.hitTest(world.x, world.y);
      if (hit) {
        this.selectClinic(hit.id);
        this.callbacks.onSelect?.(hit.id);
      }
    }
    this.dragging = false;
  }

  private handlePointerLeave(): void {
    this.dragging = false;
    this.setHover(null);
  }

  private handleWheel(ev: WheelEvent): void {
    ev.preventDefault();
    this.userAdjustedCamera = true;
    const rect = this.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const worldBefore = this.screenToWorld(sx, sy);

    const factor = Math.exp(-ev.deltaY * 0.0012);
    const newZoom = clamp(this.camera.zoom * factor, 0.4, 3);
    this.camera.zoom = newZoom;
    this.camera.targetZoom = newZoom;

    const cx = this.width / 2;
    const cy = this.height / 2;
    this.camera.panX = (sx - cx) / newZoom - worldBefore.x;
    this.camera.panY = (sy - cy) / newZoom - worldBefore.y;
    this.camera.targetPanX = this.camera.panX;
    this.camera.targetPanY = this.camera.panY;
  }

  private setHover(id: string | null): void {
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.canvas.style.cursor = id ? 'pointer' : 'grab';
      this.callbacks.onHover?.(id);
    }
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: (sx - cx) / this.camera.zoom - this.camera.panX,
      y: (sy - cy) / this.camera.zoom - this.camera.panY
    };
  }

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: cx + (x + this.camera.panX) * this.camera.zoom,
      y: cy + (y + this.camera.panY) * this.camera.zoom
    };
  }

  private hitTest(worldX: number, worldY: number): GalaxyNode | null {
    let best: GalaxyNode | null = null;
    let bestDist = Infinity;
    for (const node of this.nodes) {
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = node.displaySize / 2 + 4;
      if (dist <= r && dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  // ---------------------------------------------------------- Animation

  private buildBackground(): void {
    const rand = mulberry32(1337);
    const starCount = 160;
    this.stars = Array.from({ length: starCount }, () => ({
      x: (rand() - 0.5) * Math.max(1600, this.width * 2.4),
      y: (rand() - 0.5) * Math.max(1200, this.height * 2.4),
      r: 0.6 + rand() * 1.6,
      phase: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 1.1,
      hue: rand() > 0.82 ? '#7cd8ff' : (rand() > 0.6 ? '#ff9be3' : '#ffffff'),
      depth: 0.25 + rand() * 0.75
    }));

    const particleCount = 46;
    this.particles = Array.from({ length: particleCount }, (_, i) => {
      const pr = mulberry32(9001 + i);
      return {
        angle: pr() * Math.PI * 2,
        radius: 60 + pr() * Math.max(300, Math.min(this.width, this.height) * 0.6),
        speed: (pr() - 0.5) * 0.12,
        size: 1 + pr() * 2.2,
        hue: pr() > 0.5 ? 'rgba(124,216,255,0.9)' : 'rgba(190,150,255,0.9)',
        phase: pr() * Math.PI * 2
      };
    });
  }

  private readonly tick = (now: number) => {
    if (this.destroyed) {
      return;
    }
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const t = (now - this.startTime) / 1000;

    this.update(dt, t);
    this.render(t);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number, t: number): void {
    // Camera easing (smooth inertia toward target, plus residual drag velocity decay)
    this.camera.zoom = lerp(this.camera.zoom, this.camera.targetZoom, Math.min(1, dt * 4));
    this.camera.panX = lerp(this.camera.panX, this.camera.targetPanX, Math.min(1, dt * 4));
    this.camera.panY = lerp(this.camera.panY, this.camera.targetPanY, Math.min(1, dt * 4));

    for (const node of this.nodes) {
      if (!node.isCenter) {
        node.angle += node.angularSpeed * dt;
      } else {
        node.angle += 0.015 * dt;
      }

      node.currentRadius = lerp(node.currentRadius, node.targetRadius, Math.min(1, dt * 1.6));
      node.currentSize = lerp(node.currentSize, node.targetSize, Math.min(1, dt * 2.2));

      const isHovered = node.id === this.hoveredId;
      node.hoverT = lerp(node.hoverT, isHovered ? 1 : 0, Math.min(1, dt * 6));

      const floatOffset = Math.sin(t * node.floatSpeed + node.floatPhase) * (node.isCenter ? 6 : 9);
      const breathe = 1 + Math.sin(t * node.breathSpeed + node.breathPhase) * (node.isCenter ? 0.035 : 0.05);

      node.x = Math.cos(node.angle) * node.currentRadius;
      node.y = Math.sin(node.angle) * node.currentRadius + floatOffset;
      node.displaySize = node.currentSize * breathe * (1 + node.hoverT * 0.18);
    }
  }

  // ------------------------------------------------------------ Render

  private render(t: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    this.renderBackdrop(t);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(this.camera.panX, this.camera.panY);

    this.renderOrbitRings();
    this.renderConnections(t);

    const drawOrder = [...this.nodes].sort((a, b) => b.currentRadius - a.currentRadius);
    for (const node of drawOrder) {
      this.renderPlanet(node, t);
    }

    ctx.restore();

    this.updateTooltip();
  }

  private renderBackdrop(t: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#0d1a34');
    bg.addColorStop(0.55, '#060d1e');
    bg.addColorStop(1, '#020509');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Drifting nebula blobs
    const blobs = [
      { cx: 0.24 + Math.sin(t * 0.02) * 0.05, cy: 0.32 + Math.cos(t * 0.017) * 0.05, r: 0.55, color: 'rgba(63,120,255,0.16)' },
      { cx: 0.78 + Math.cos(t * 0.015) * 0.05, cy: 0.68 + Math.sin(t * 0.02) * 0.05, r: 0.5, color: 'rgba(180,90,255,0.13)' },
      { cx: 0.5 + Math.sin(t * 0.011) * 0.06, cy: 0.5 + Math.cos(t * 0.013) * 0.06, r: 0.6, color: 'rgba(60,220,255,0.08)' }
    ];
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const grad = ctx.createRadialGradient(w * b.cx, h * b.cy, 0, w * b.cx, h * b.cy, Math.max(w, h) * b.r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Parallax starfield + free-floating particles, gently offset by camera pan
    const parX = this.camera.panX * 0.06;
    const parY = this.camera.panY * 0.06;
    ctx.save();
    ctx.translate(w / 2 + parX, h / 2 + parY);
    for (const s of this.stars) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.fillStyle = s.hue;
      ctx.globalAlpha = twinkle * s.depth * 0.85;
      ctx.arc(s.x * s.depth * 0.3, s.y * s.depth * 0.3, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      const angle = p.angle + t * p.speed;
      const x = Math.cos(angle) * p.radius;
      const y = Math.sin(angle) * p.radius * 0.6;
      const glow = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + p.phase));
      ctx.beginPath();
      ctx.fillStyle = p.hue;
      ctx.globalAlpha = glow * 0.7;
      ctx.shadowColor = p.hue;
      ctx.shadowBlur = 6;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderOrbitRings(): void {
    const ctx = this.ctx;
    const { baseRadius, ringGap } = this.ringMetrics();
    const maxRing = this.nodes.reduce((m, n) => Math.max(m, n.ring), 0);
    ctx.save();
    for (let r = 1; r <= maxRing; r++) {
      const radius = baseRadius + (r - 1) * ringGap;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(124,216,255,0.10)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 10]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  private connectionAlpha(seedA: number, seedB: number, t: number): number {
    const phase = ((seedA ^ seedB) % 1000) / 1000 * Math.PI * 2;
    return 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.4 + phase));
  }

  private renderConnections(t: number): void {
    const ctx = this.ctx;
    const center = this.order.length ? this.nodeMap.get(this.order[0]) : null;
    if (!center) {
      return;
    }

    const drawLine = (a: GalaxyNode, b: GalaxyNode, highlighted: boolean) => {
      const alpha = this.connectionAlpha(a.seed, b.seed, t) * (highlighted ? 1 : 0.6);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      const ta = GALAXY_THEMES[a.themeIndex];
      const tb = GALAXY_THEMES[b.themeIndex];
      grad.addColorStop(0, ta.edge);
      grad.addColorStop(1, tb.edge);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = highlighted ? 2.1 : 1.1;
      ctx.shadowColor = ta.glow;
      ctx.shadowBlur = highlighted ? 14 : 6;
      ctx.stroke();
    };

    ctx.save();
    // Spokes: center to every other clinic.
    for (const node of this.nodes) {
      if (node.isCenter) {
        continue;
      }
      const highlighted = node.id === this.hoveredId || node.id === this.selectedId;
      drawLine(center, node, highlighted);
    }

    // Mesh: connect each planet to its nearest orbit-neighbour for a network feel.
    const others = this.nodes.filter(n => !n.isCenter);
    for (const node of others) {
      let nearest: GalaxyNode | null = null;
      let nearestDist = Infinity;
      for (const other of others) {
        if (other === node) { continue; }
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = other;
        }
      }
      if (nearest && Math.sqrt(nearestDist) < 260) {
        const highlighted = node.id === this.hoveredId || nearest.id === this.hoveredId;
        drawLine(node, nearest, highlighted);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderPlanet(node: GalaxyNode, t: number): void {
    const ctx = this.ctx;
    const theme = GALAXY_THEMES[node.themeIndex];
    const size = node.displaySize;
    const x = node.x;
    const y = node.y;
    const isHovered = node.hoverT > 0.01;
    const isSelected = node.id === this.selectedId;

    ctx.save();
    ctx.translate(x, y);

    // Outer halo (breathing glow)
    const haloR = size * (node.isCenter ? 2.2 : 1.85) * (1 + node.hoverT * 0.12);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
    halo.addColorStop(0, theme.glow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Rotating rings
    const ringCount = node.isCenter ? 3 : 1;
    for (let i = 0; i < ringCount; i++) {
      const spin = t * (node.isCenter ? (0.25 + i * 0.12) : 0.18) * (i % 2 === 0 ? 1 : -1);
      const ringRadius = size / 2 + 6 + i * (node.isCenter ? 12 : 0);
      ctx.save();
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.5);
      ctx.strokeStyle = node.isCenter ? 'rgba(255,255,255,0.35)' : theme.edge;
      ctx.lineWidth = node.isCenter ? 1.4 : 1;
      ctx.setLineDash(node.isCenter ? [4, 6] : []);
      ctx.globalAlpha = node.isCenter ? 0.55 : 0.5 + node.hoverT * 0.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Orbiting particles around the center clinic
    if (node.isCenter) {
      for (let i = 0; i < 6; i++) {
        const a = t * (0.5 + i * 0.06) + i * (Math.PI / 3);
        const r = size / 2 + 20 + Math.sin(t * 1.2 + i) * 4;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r * 0.9;
        ctx.beginPath();
        ctx.fillStyle = i % 2 === 0 ? '#bfe9ff' : '#e6c9ff';
        ctx.shadowColor = '#9fdcff';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.85;
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Core sphere
    const core = ctx.createRadialGradient(-size * 0.18, -size * 0.22, size * 0.05, 0, 0, size / 2);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.18, theme.core);
    core.addColorStop(0.62, theme.mid);
    core.addColorStop(1, 'rgba(4,8,20,0.95)');
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = (isHovered || isSelected) ? 30 : 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = isSelected ? 2.4 : 1.3;
    ctx.strokeStyle = isSelected ? '#ffffff' : theme.edge;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Medical cross icon
    const iconY = -size * 0.30;
    const crossSize = Math.max(4, size * 0.11);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(-crossSize * 0.16, iconY - crossSize / 2, crossSize * 0.32, crossSize);
    ctx.fillRect(-crossSize / 2, iconY - crossSize * 0.16, crossSize, crossSize * 0.32);

    // ECG trace inside the center clinic
    if (node.isCenter && size > 60) {
      ctx.save();
      ctx.beginPath();
      const ecgW = size * 0.62;
      const ecgY = size * 0.05;
      const points = 24;
      const scroll = (t * 60) % ecgW;
      for (let i = 0; i <= points; i++) {
        const px = -ecgW / 2 + (i / points) * ecgW;
        const shifted = px + scroll;
        const wrapped = ((shifted + ecgW / 2) % ecgW) - ecgW / 2;
        const phase = ((wrapped / ecgW) * Math.PI * 2 * 3);
        let py = Math.sin(phase) * 2;
        const spikePos = ((i / points) * 6) % 6;
        if (spikePos > 2.6 && spikePos < 3.4) {
          py = -Math.sin((spikePos - 2.6) / 0.8 * Math.PI) * (size * 0.16);
        }
        if (i === 0) {
          ctx.moveTo(px, ecgY + py);
        } else {
          ctx.lineTo(px, ecgY + py);
        }
      }
      ctx.strokeStyle = '#eafcff';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#9fe8ff';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Text content
    const showDetails = size > 46 || isHovered;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';

    const nameFont = clamp(size * (node.isCenter ? 0.135 : 0.16), 9, 17);
    ctx.font = `700 ${nameFont}px 'Rubik', 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'middle';
    const nameY = -size * 0.06;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(this.truncateText(ctx, node.data.name, size * 1.55), 0, nameY);

    if (showDetails) {
      const valueFont = clamp(size * (node.isCenter ? 0.2 : 0.22), 10, 24);
      ctx.font = `800 ${valueFont}px 'Rubik', 'Segoe UI', sans-serif`;
      ctx.fillText(String(node.data.patients), 0, nameY + valueFont * 1.05);

      const subFont = clamp(size * 0.115, 7, 12);
      ctx.font = `500 ${subFont}px 'Rubik', 'Segoe UI', sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.fillText(node.data.hoursLabel || '—', 0, nameY + valueFont * 1.05 + subFont * 1.5);
      ctx.fillStyle = node.data.attendanceRate >= 75 ? '#8dffce' : (node.data.attendanceRate >= 50 ? '#ffe08d' : '#ffb0b0');
      ctx.fillText(`${node.data.attendanceRate}% הגעה`, 0, nameY + valueFont * 1.05 + subFont * 3);
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (!text) {
      return '';
    }
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = text.slice(0, mid) + '…';
      if (ctx.measureText(candidate).width <= maxWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low > 0 ? text.slice(0, low) + '…' : '…';
  }

  private updateTooltip(): void {
    if (!this.tooltipEl) {
      return;
    }
    const node = this.hoveredId ? this.nodeMap.get(this.hoveredId) : null;
    if (!node) {
      this.tooltipEl.style.opacity = '0';
      this.tooltipEl.style.pointerEvents = 'none';
      return;
    }
    const screen = this.worldToScreen(node.x, node.y);
    const theme = GALAXY_THEMES[node.themeIndex];
    this.tooltipEl.style.opacity = '1';
    this.tooltipEl.style.transform =
      `translate(${screen.x}px, ${screen.y - node.displaySize * this.camera.zoom / 2 - 14}px) translate(-50%, -100%)`;
    this.tooltipEl.style.setProperty('--tooltip-accent', theme.core);
    this.tooltipEl.innerHTML = `
      <strong>${this.escapeHtml(node.data.name)}</strong>
      <span class="gtt-row"><b>${node.data.patients}</b> מוזמנים</span>
      <span class="gtt-row">${this.escapeHtml(node.data.hoursLabel || '—')}</span>
      <span class="gtt-row">אחוז הגעה: <b>${node.data.attendanceRate}%</b></span>
    `;
  }

  private escapeHtml(value: string): string {
    return (value || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c] || c));
  }
}
