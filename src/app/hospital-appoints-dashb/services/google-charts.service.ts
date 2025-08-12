// google-charts.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

declare global { interface Window { google?: any; } }

// DTOs
export interface DeptDto { Name: string; Q: number; AvgDay: number; }
export interface DoctorDto { Name: string; Department: string; Q: number; AvgDay: number; }

// HorizontalMultiPeriodChart contracts (kept for compatibility with your component)
export interface HmpcDataPoint { label: string; value: number; color?: string; tooltip?: string; }
export interface HmpcRow { category: string; periods: HmpcDataPoint[]; }

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  // ------------------------------------------------------------
  // Loader (once)
  // ------------------------------------------------------------
  private loaderPromise: Promise<void> | null = null;

  private loadGoogleCharts(): Promise<void> {
    if (this.loaderPromise) return this.loaderPromise;

    this.loaderPromise = new Promise<void>((resolve, reject) => {
      // Already initialized?
      if ((window as any).google?.visualization) { resolve(); return; }

      const onLoaded = () => {
        try {
          (window as any).google.charts.load('current', {
            packages: ['corechart', 'treemap', 'bar', 'table']
          });
          (window as any).google.charts.setOnLoadCallback(() => resolve());
        } catch (e) { reject(e); }
      };

      // If google.charts exists already, just load packages
      if ((window as any).google?.charts) { onLoaded(); return; }

      // Inject loader.js
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.async = true;
      script.onload = onLoaded;
      script.onerror = () => reject(new Error('Failed to load Google Charts loader.js'));
      document.head.appendChild(script);
    });

    return this.loaderPromise;
  }

  private googleReady(): boolean {
    return !!(window as any).google && !!(window as any).google.visualization;
  }

  /** Wait up to ~2s for google.visualization to be ready (in case it's loaded elsewhere). */
  async waitForGoogleReady(maxMs = 2000): Promise<void> {
    const start = Date.now();
    while (!this.googleReady() && Date.now() - start < maxMs) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // ------------------------------------------------------------
  // Data store
  // ------------------------------------------------------------
  private cache = new Map<string, string>();
  private departments: DeptDto[] = [];
  private doctors: DoctorDto[] = [];
  private dataPromise: Promise<void> | null = null;

  constructor(private http: HttpClient, private zone: NgZone) {}

  /** Execute code outside Angular change detection (for chart drawing). */
  runOutsideAngular<T>(fn: () => T): T {
    return this.zone.runOutsideAngular(fn);
  }

  // ------------------------------------------------------------
  // API
  // ------------------------------------------------------------
  private getAppointmentsUrl(): string {
    return `${environment.url}/GetAppointments`;
  }

  private async fetchWithCache(url: string): Promise<string> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const raw = await this.http.get(url, { responseType: 'text' }).toPromise();
    const text = (raw || '');
    this.cache.set(url, text);
    return text;
  }

  // ------------------------------------------------------------
  // Public: load once, robust normalization/sanitization
  // ------------------------------------------------------------
  async loadData(): Promise<void> {
    if (this.dataPromise) return this.dataPromise;

    this.dataPromise = (async () => {
      try {
        const raw = await this.fetchWithCache(this.getAppointmentsUrl());
        const parsed = this.normalizeResponseToObject(raw);

        const deps = parsed?.Departments || parsed?.departments || [];
        const docs = parsed?.Doctors || parsed?.doctors || [];

        this.departments = (deps as any[]).map(this.sanitizeDepartmentFromJson);
        this.doctors     = (docs as any[]).map(this.sanitizeDoctorFromJson);

        // Fallback in case shape is flat with DataType
        if (!this.departments.length && Array.isArray(parsed)) {
          const deps2: any[] = []; const docs2: any[] = [];
          parsed.forEach((r: any) => {
            const t = String(r?.DataType || '').toLowerCase();
            if (t === 'department') deps2.push(r);
            else if (t === 'doctor') docs2.push(r);
          });
          this.departments = deps2.map(this.sanitizeDepartmentFromJson);
          this.doctors     = docs2.map(this.sanitizeDoctorFromJson);
        }

        this.sortDefaults();
      } catch (err) {
        console.error('GetAppointments load error:', err);
        this.departments = [];
        this.doctors = [];
      }
    })();

    return this.dataPromise;
  }

  // ------------------------------------------------------------
  // Sanitization / parsing helpers
  // ------------------------------------------------------------
  private sanitizeDepartmentFromJson = (d: any): DeptDto => ({
    Name: this.safeStr(d?.Name ?? d?.name ?? d?.Depart_Name ?? ''),
    Q: this.toNum(d?.Q ?? d?.q ?? 0),
    AvgDay: this.toNum(d?.AvgDay ?? d?.avgDay ?? 0)
  });

  private sanitizeDoctorFromJson = (d: any): DoctorDto => ({
    Name: this.safeStr(d?.Name ?? d?.name ?? d?.Depart_Name2 ?? ''),
    Department: this.safeStr(d?.Department ?? d?.department ?? d?.Depart_Name ?? ''),
    Q: this.toNum(d?.Q ?? d?.q ?? 0),
    AvgDay: this.toNum(d?.AvgDay ?? d?.avgDay ?? 0)
  });

  private safeStr(v: any): string {
    if (v == null) return '';
    return String(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  private toNum(v: any): number {
    const n = Number(v);
    if (!isFinite(n) || isNaN(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  private sortDefaults() {
    // consistent UX
    this.departments.sort((a,b)=> b.Q - a.Q || b.AvgDay - a.AvgDay);
    this.doctors.sort((a,b)=> b.AvgDay - a.AvgDay || b.Q - a.Q);
  }

  /** Accepts XML-wrapped JSON, quoted JSON, plain JSON, or ASP.NET {"d": "..."} */
  private normalizeResponseToObject(raw: string | null | undefined): any | null {
    const txt = (raw || '').replace(/^\uFEFF/, '').trim();
    if (!txt) return null;

    // Case A: XML <string>...</string>
    if (txt.startsWith('<?xml') || txt.startsWith('<string')) {
      try {
        const doc = new DOMParser().parseFromString(txt, 'text/xml');
        const strNode = doc.getElementsByTagName('string')[0] || doc.documentElement;
        const inner = (strNode?.textContent || '').trim();
        return this.tryParseAnyJson(inner);
      } catch { /* fall through */ }
    }

    // Case B: ASP.NET {"d":"..."} wrapper
    try {
      const obj = JSON.parse(txt);
      if (obj && typeof obj.d === 'string') {
        return this.tryParseAnyJson(obj.d);
      }
      return obj; // plain JSON
    } catch {
      // Case C: quoted JSON "\"{...}\""
      return this.tryParseAnyJson(txt);
    }
  }

  /** Parse either plain JSON or quoted JSON string with escaped quotes */
  private tryParseAnyJson(s: string): any | null {
    const t = (s || '').trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      const inner = t.slice(1, -1).replace(/\\"/g, '"');
      try { return JSON.parse(inner); } catch { return null; }
    }
    try { return JSON.parse(t); } catch { return null; }
  }

  // ------------------------------------------------------------
  // Common draw helpers
  // ------------------------------------------------------------
  private debugLogData(tag: string) {
    console.log(`[Charts:${tag}] deps=${this.departments.length}, docs=${this.doctors.length}`,
      { deps: this.departments, docs: this.doctors });
  }

  private drawSafe<T extends { draw: Function }>(
    chart: T,
    data: any,
    options: any,
    containerId: string
  ) {
    try {
      const el = document.getElementById(containerId);
      if (!el) { console.warn(`[Charts] container #${containerId} not found`); return; }
      if (el.offsetHeight === 0) { console.warn(`[Charts] #${containerId} has 0 height`); }
      if (this.googleReady() && (window as any).google.visualization?.events) {
        (window as any).google.visualization.events.addListener(chart, 'error', (e: any) => {
          console.error(`[Charts] Google error in ${containerId}:`, e?.message, e);
        });
      }
      chart.draw(data, options);
    } catch (err) {
      console.error(`[Charts] draw failed in #${containerId}:`, err);
    }
  }

  // ------------------------------------------------------------
  // Row builders (tuples)
  // ------------------------------------------------------------
  private buildDoctorRows(): Array<[string, string, number, number]> {
    return this.doctors.map(d => [
      d.Name, d.Department, Number(d.Q) || 0, Number(d.AvgDay) || 0
    ]);
  }

  private buildDepartmentRows(): Array<[string, number, number]> {
    return this.departments.map(d => [
      d.Name, Number(d.Q) || 0, Number(d.AvgDay) || 0
    ]);
  }

  // ------------------------------------------------------------
  // Treemap (with drilldown; color by worst AvgDay)
  // ------------------------------------------------------------
// ===================== core (yours, kept) =====================
private buildDeptColorFromDeptAvg(): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of this.departments) m.set(d.Name, Number(d.AvgDay) || 0);
  return m;
}
private makeInvisibleUniqueId(name: string, dept: string): string {
  return `${name}\u2063${dept}`; // U+2063 invisible separator
}
private treemapMode: { mode: 'all' | 'dept'; dept?: string } = { mode: 'all' };

private mountBackButton(container: HTMLElement, onClick: () => void) {
  Array.from(container.querySelectorAll('.treemap-back')).forEach(n => n.remove());
  const btn = document.createElement('button');
  btn.className = 'treemap-back';
  btn.textContent = '⬅︎ חזרה';
  Object.assign(btn.style, {
    position: 'absolute', top: '8px', right: '8px', padding: '4px 8px',
    direction: 'rtl', fontSize: '12px', border: '1px solid #bbb',
    borderRadius: '4px', background: '#fff', cursor: 'pointer'
  } as any);
  btn.onclick = onClick;
  if (!container.style.position) container.style.position = 'relative';
  container.appendChild(btn);
}

// ===================== overlay engine (always-visible info) =====================

// detach (typing-safe for TS/Angular 9)
private detachOverlayObservers(container: HTMLElement) {
  const refs = (container as any)._treemapOverlayObservers as
    { mo: MutationObserver; ro: any } | undefined;
  if (refs) {
    refs.mo.disconnect();
    refs.ro.disconnect();
    delete (container as any)._treemapOverlayObservers;
  }
}

private getOverlayLayer(container: HTMLElement): HTMLDivElement {
  let layer = container.querySelector<HTMLDivElement>(':scope > .treemap-overlay-layer');
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'treemap-overlay-layer';
  Object.assign(layer.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '3'
  } as any);
  if (!container.style.position) container.style.position = 'relative';
  container.appendChild(layer);
  return layer;
}

// Reuse your tooltip generator, but strip outer wrapper
private tooltipInnerHtml(dt: any, options: any, row: number): string {
  const size = dt.getValue(row, 2);
  const color = dt.getValue(row, 3);
  const raw = typeof options.generateTooltip === 'function'
    ? options.generateTooltip(row, size, color) || ''
    : '';
  return raw.replace(/^<div[^>]*>/i, '').replace(/<\/div>\s*$/i, '');
}

// ---------- NEW: robust label normalization + matching ----------
private normalizeLabel(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[\u2063\u200E\u200F\u202A-\u202E]/g, '') // invisible sep + bidi marks
    .replace(/\u00A0/g, ' ')                            // NBSP -> space
    .replace(/\s+/g, ' ')                               // collapse spaces
    .replace(/[.…]+$/g, '')                             // trailing ellipsis chars
    .trim();
}

private findNodeByLabel(root: HTMLElement, label: string, used?: Set<HTMLElement>): HTMLElement | null {
  const want = this.normalizeLabel(label);

  // 1) aria-label contains
  const nodes = root.querySelectorAll<HTMLElement>('.google-visualization-treeMap-node[aria-label]');
  for (const n of Array.from(nodes)) {
    if (used?.has(n)) continue;
    const aria = this.normalizeLabel(n.getAttribute('aria-label') || '');
    if (aria.includes(want)) return n;
  }

  // 2) fallback: visible text equals
  const nodes2 = root.querySelectorAll<HTMLElement>('.google-visualization-treeMap-node');
  for (const n of Array.from(nodes2)) {
    if (used?.has(n)) continue;
    const txt = this.normalizeLabel(n.textContent || '');
    if (txt === want) return n;
  }

  return null;
}

// ---------- NEW: safe text fit (don’t mutate innerHTML) ----------
private adjustTextSize(el: HTMLElement, maxW: number, maxH: number) {
  let fs = 11;
  el.style.fontSize = `${fs}px`;
  el.style.lineHeight = '1.2';
  for (let i = 0; i < 6; i++) {
    if (el.scrollHeight <= maxH && el.scrollWidth <= maxW) break;
    fs -= 0.5;
    if (fs <= 8) { fs = 8; }
    el.style.fontSize = `${fs}px`;
    if (fs === 8) break;
  }
}

// ---------- COMBINED & REFACTORED: overlay renderer ----------
private renderAllOverlays(
  container: HTMLElement,
  dt: any,
  options: { headerHeight: number; generateTooltip: Function },
  clickable?: (row: number) => boolean
) {
  const layer = this.getOverlayLayer(container);
  layer.innerHTML = '';

  const headerTop = Math.max(0, (options.headerHeight ?? 18)) + 4; // slightly more space
  const containerRect = container.getBoundingClientRect();
  const used = new Set<HTMLElement>();

  for (let row = 0; row < dt.getNumberOfRows(); row++) {
    if (dt.getValue(row, 1) === null) continue; // skip root

    const label = String(dt.getValue(row, 0));
    const nodeEl = this.findNodeByLabel(container, label, used);
    if (!nodeEl) continue;
    used.add(nodeEl);

    // pointer cursor on actual node if clickable
    if (clickable) (nodeEl.style as any).cursor = clickable(row) ? 'pointer' : 'default';

    const r = nodeEl.getBoundingClientRect();

    // lenient size guard (still avoids illegible clutter)
    if (r.width < 30 || r.height < headerTop + 8) continue;

    const left = r.left - containerRect.left + 3;
    const top  = r.top  - containerRect.top  + headerTop;
    const maxWidth  = Math.max(0, r.width  - 6);
    const maxHeight = Math.max(0, r.height - headerTop - 4);

    const html = this.tooltipInnerHtml(dt, options, row);
    if (!html.trim()) continue;

    const box = document.createElement('div');
    box.className = 'treemap-inline';
    Object.assign(box.style, {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`,
      overflow: 'hidden',
      fontSize: '11px',
      lineHeight: '1.2',
      color: '#333',
      textShadow: '0 0 2px rgba(255,255,255,0.8)',
      padding: '2px',
      boxSizing: 'border-box'
    } as any);

    box.innerHTML = html;
    this.adjustTextSize(box, maxWidth, maxHeight);
    layer.appendChild(box);
  }
}

private attachOverlayObservers(
  container: HTMLElement,
  dt: any,
  options: any,
  clickable?: (row: number) => boolean
) {
  this.detachOverlayObservers(container);

  const mo = new MutationObserver(() => {
    requestAnimationFrame(() => this.renderAllOverlays(container, dt, options, clickable));
  });
  mo.observe(container, { childList: true, subtree: true });

  // Polyfill-friendly ResizeObserver (typed as any)
  const ResizeObs: any = (window as any).ResizeObserver || class {
    cb: Function;
    constructor(cb: Function) {
      this.cb = cb;
      window.addEventListener('resize', () => this.cb());
    }
    observe() { /* no-op for fallback */ }
    disconnect() { window.removeEventListener('resize', this.cb as any); }
  };

  const ro = new ResizeObs(() => {
    requestAnimationFrame(() => this.renderAllOverlays(container, dt, options, clickable));
  });
  ro.observe(container);

  (container as any)._treemapOverlayObservers = { mo, ro };
}

// ===================== public entry =====================
public async drawTreemap(targetId: string) {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  const el = document.getElementById(targetId) as HTMLElement | null;
  if (!el) return;

  if (this.treemapMode.mode === 'all') await this.drawTreemapAll(el);
  else await this.drawTreemapDept(el, this.treemapMode.dept!);
}

// ===================== ROOT VIEW =====================
private async drawTreemapAll(el: HTMLElement) {
  const g = (window as any).google;
  const dt = new g.visualization.DataTable();
  dt.addColumn('string', 'Node');
  dt.addColumn('string', 'Parent');
  dt.addColumn('number', 'Size');
  dt.addColumn('number', 'Color');

  const ROOT_ID = 'כלל';
  const deptColor = this.buildDeptColorFromDeptAvg();
  const globalMax = Math.max(0, ...Array.from(deptColor.values()));
  dt.addRow([ROOT_ID, null, 0, globalMax]);

  for (const [dept, q] of this.buildDepartmentRows()) {
    dt.addRow([dept, ROOT_ID, q, deptColor.get(dept) ?? 0]);
  }

  const options = {
    headerHeight: 18,
    fontColor: '#212121',
    minColor: '#43a047',
    midColor: '#fdd835',
    maxColor: '#e53935',
    showScale: true,
    useWeightedAverageForAggregation: false,
    generateTooltip: (row: number, size: number) => {
      const id = dt.getValue(row, 0) as string;
      if (id === ROOT_ID) return '';
      const deptAvg = dt.getValue(row, 3) as number;
      return `<div style="padding:0;direction:rtl">
                <b>${id}</b><br/>ממתינים: ${size} | ימים ממוצעים: ${deptAvg}
              </div>`;
    }
  };

  const chart = new g.visualization.TreeMap(el);

  // drilldown
  g.visualization.events.addListener(chart, 'select', () => {
    const sel = chart.getSelection();
    if (!sel.length) return;
    const r = sel[0].row;
    if (r == null) return;
    if (dt.getValue(r, 1) === ROOT_ID) {
      this.treemapMode = { mode: 'dept', dept: dt.getValue(r, 0) as string };
      this.drawTreemap(el.id);
    }
  });

  // overlays
  g.visualization.events.addListener(chart, 'ready', () => {
    this.renderAllOverlays(
      el, dt, options,
      (row) => dt.getValue(row, 1) === ROOT_ID // hand cursor on drillable depts
    );
    this.attachOverlayObservers(
      el, dt, options,
      (row) => dt.getValue(row, 1) === ROOT_ID
    );
    Array.from(el.querySelectorAll('.treemap-back')).forEach(n => n.remove());
  });

  this.drawSafe(chart, dt, options, el.id);
}

// ===================== DEPARTMENT VIEW =====================
private async drawTreemapDept(el: HTMLElement, deptName: string) {
  const g = (window as any).google;
  const dt = new g.visualization.DataTable();
  dt.addColumn('string', 'Node');
  dt.addColumn('string', 'Parent');
  dt.addColumn('number', 'Size');
  dt.addColumn('number', 'Color');

  const ROOT = deptName;
  const docs = this.buildDoctorRows().filter(([, d]) => d === deptName);
  const deptAvg = Number(this.departments.find(d => d.Name === deptName)?.AvgDay) || 0;

  dt.addRow([ROOT, null, 0, deptAvg]);
  for (const [name, dept, q, avg] of docs) {
    dt.addRow([this.makeInvisibleUniqueId(name, dept), ROOT, q, avg]);
  }

  const options = {
    headerHeight: 18,
    fontColor: '#212121',
    minColor: '#43a047',
    midColor: '#fdd835',
    maxColor: '#e53935',
    showScale: true,
    useWeightedAverageForAggregation: false,
    generateTooltip: (row: number, size: number) => {
      const rawId = dt.getValue(row, 0) as string;
      const label = rawId.replace(/\u2063.*$/, '');
      const colorVal = dt.getValue(row, 3) as number;
      if (label === ROOT) {
        return `<div style="padding:0;direction:rtl"><b>${ROOT}</b><br/>ימים ממוצעים (מחלקה): ${colorVal}</div>`;
      }
      return `<div style="padding:0;direction:rtl">
                <b>${label}</b><br/>מחלקה: ${ROOT}
                <br/>ממתינים: ${size} | ימים ממוצעים: ${colorVal}
              </div>`;
    }
  };

  const chart = new g.visualization.TreeMap(el);

  g.visualization.events.addListener(chart, 'ready', () => {
    this.renderAllOverlays(el, dt, options);   // not drillable here
    this.attachOverlayObservers(el, dt, options);

    this.mountBackButton(el, () => {
      this.detachOverlayObservers(el);
      this.treemapMode = { mode: 'all' };
      this.drawTreemap(el.id);
    });
  });

  this.drawSafe(chart, dt, options, el.id);
}



  // ------------------------------------------------------------
  // Other charts 
  // ------------------------------------------------------------
  public async drawComboDept(targetId: string) {
    await this.loadGoogleCharts();
    await this.waitForGoogleReady();
    if (!this.googleReady()) return;

    const dt = new (window as any).google.visualization.DataTable();
    dt.addColumn('string', 'מחלקה');

    // Q + annotation
    dt.addColumn('number', 'ממתינים (Q)');
    dt.addColumn({ type: 'string', role: 'annotation' });
    dt.addColumn({ type: 'string', role: 'annotationText' });

    // AvgDay (line, axis 1)
    dt.addColumn('number', 'ימים ממוצעים');

    this.buildDepartmentRows().forEach(([dept, q, avg]) => {
      const ann = `תורים: ${q}`;
      const annText = `תורים (Q): ${q}`;
      dt.addRow([dept, q, ann, annText, avg]);
    });

    const options: any = {
      seriesType: 'bars',
      series: { 1: { type: 'line', targetAxisIndex: 1 } },
      vAxes: { 0: { title: 'ממתינים (Q)' }, 1: { title: ' ימים ממוצעים' } },
      legend: { position: 'bottom' },
      chartArea: { left: 80, right: 60, top: 24, bottom: 60 },
      bar: { groupWidth: '70%' },
      annotations: { alwaysOutside: false, textStyle: { fontSize: 11, auraColor: 'none' } }
    };

    const chart = new (window as any).google.visualization.ComboChart(document.getElementById(targetId));
    this.drawSafe(chart, dt, options, targetId);
  }

  
private groupDoctorsByDept = true;

private mountGroupToggleButton(el: HTMLElement, onToggle: () => void) {
  Array.from(el.querySelectorAll('.group-toggle')).forEach(n => n.remove());
  const btn = document.createElement('button');
  btn.className = 'group-toggle';
  btn.textContent = this.groupDoctorsByDept ? 'בטל קיבוץ למחלקות' : 'קבץ לפי מחלקה';
  btn.style.position = 'absolute';
  btn.style.top = '8px';
  btn.style.right = '8px';
  btn.style.padding = '6px 10px';
  btn.style.direction = 'rtl';
  btn.style.fontSize = '12px';
  btn.style.border = '1px solid #bbb';
  btn.style.borderRadius = '6px';
  btn.style.background = '#fff';
  btn.style.cursor = 'pointer';
  btn.style.zIndex = '5';
  btn.onclick = onToggle;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.appendChild(btn);
}

public async drawLeaderboardDoctors(
  containerId: string,
  dir: 'asc' | 'desc' = 'desc' // sort by AvgDay
) {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  type Row = { name: string; dept: string; avg: number; q: number };

  // Build base rows
  const baseRows: Row[] = this.buildDoctorRows().map(([name, dept, q, avg]) => ({
    name, dept, avg: Number(avg) || 0, q: Number(q) || 0
  }));

  const sortInDept = (a: Row, b: Row) => (dir === 'asc' ? a.avg - b.avg : b.avg - a.avg);

  // Compose rows (grouped vs flat)
  let rows: Row[] = [];
  if (this.groupDoctorsByDept) {
    const byDept = new Map<string, Row[]>();
    for (let i = 0; i < baseRows.length; i++) {
      const r = baseRows[i];
      const arr = byDept.get(r.dept) || [];
      arr.push(r); byDept.set(r.dept, arr);
    }
    byDept.forEach(list => list.sort(sortInDept));

    const deptOrder = Array.from(byDept.keys()).sort((da, db) => {
      const la = byDept.get(da)!; const lb = byDept.get(db)!;
      const scoreA = la[0] ? la[0].avg : 0;
      const scoreB = lb[0] ? lb[0].avg : 0;
      return dir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });

    const out: Row[] = [];
    for (let i = 0; i < deptOrder.length; i++) {
      const list = byDept.get(deptOrder[i])!;
      for (let j = 0; j < list.length; j++) out.push(list[j]);
    }
    rows = out;
  } else {
    rows = baseRows.slice().sort(sortInDept);
  }

  // DataTable — label = "name – department"
  const google = (window as any).google;
  const dt = new google.visualization.DataTable();
  dt.addColumn('string', 'רופא – מחלקה');
  dt.addColumn('number', 'ימים ממוצעים');
  dt.addColumn({ type: 'string', role: 'annotation' });
  dt.addColumn({ type: 'string', role: 'annotationText' });
  dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

  const rowDept: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const display = `${r.name} – ${r.dept}`;
    const ann     = `ימים ${r.avg} | תורים ${r.q}`;
    const annText = `ימים ממוצעים: ${r.avg} · תורים: ${r.q}`;
    const tooltip =
      `<div style="direction:rtl;padding:6px 8px;font-size:12px">
         <div><b>${r.name}</b></div>
         <div>מחלקה: ${r.dept}</div>
         <div>ימים ממוצעים: <b>${r.avg}</b></div>
         <div>תורים: <b>${r.q}</b></div>
       </div>`;
    dt.addRow([display, r.avg, ann, annText, tooltip]);
    rowDept.push(r.dept);
  }

  // Sizing
  const rowHeight = 26;
  const vPad = 80;
  const height = Math.max(220, rows.length * rowHeight + vPad);
  const el = document.getElementById(containerId)!;
  el.style.height = `${height}px`;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const title = dir === 'asc'
    ? (this.groupDoctorsByDept ? 'רופאים לפי מחלקה — קצרים ← ארוכים' : 'כל הרופאים — קצרים ← ארוכים')
    : (this.groupDoctorsByDept ? 'רופאים לפי מחלקה — ארוכים ← קצרים' : 'כל הרופאים — ארוכים ← קצרים');

  // EXTRA right margin when grouped for fixed right-side dept labels
  const chartAreaLeft  = this.groupDoctorsByDept ? 220 : 140;
  const chartAreaRight = this.groupDoctorsByDept ? 110 : 24;

  const opts: any = {
    title,
    legend: 'none',
    chartArea: { left: chartAreaLeft, right: chartAreaRight, top: 40, bottom: 20 },
    hAxis: { minValue: 0 },
    height,
    bar: { groupWidth: '90%' },
    tooltip: { isHtml: true },
    annotations: {
      alwaysOutside: false,
      highContrast: true,
      textStyle: { fontSize: 11, auraColor: 'none', color: '#000' }
    }
  };

  const chart = new google.visualization.BarChart(el);

  // Overlays: alternating bands + separator lines + ONE rotated dept label per group
  const drawDeptOverlaysIfGrouped = () => {
    const old = el.querySelectorAll('.dept-band, .dept-sep, .dept-label-rot');
    for (let i = 0; i < old.length; i++) old[i].remove();
    if (!this.groupDoctorsByDept) return;

    const cli = chart.getChartLayoutInterface();
    const ca  = cli.getChartAreaBoundingBox();

    // Fixed X for all department labels: just to the RIGHT of bars (inside the reserved right margin)
    const labelX = ca.left + ca.width + 10; // 10px into the right margin

    // Build contiguous groups from current order
    const groups: Array<{dept: string; start: number; end: number}> = [];
    let start = 0;
    for (let i = 1; i <= rowDept.length; i++) {
      if (i === rowDept.length || rowDept[i] !== rowDept[start]) {
        groups.push({ dept: rowDept[start], start, end: i - 1 });
        start = i;
      }
    }

    const barBox = (i: number) => {
      try { return cli.getBoundingBox(`bar#0#${i}`); } catch { return null; }
    };

    for (let idx = 0; idx < groups.length; idx++) {
      const g = groups[idx];
      const topBox = barBox(g.start);
      const botBox = barBox(g.end);
      if (!topBox || !botBox) continue;

      const top = topBox.top - 2;
      const h   = (botBox.top + botBox.height) - topBox.top + 4;

      // alternating background
      if (idx % 2 === 0) {
        const band = document.createElement('div');
        band.className = 'dept-band';
        band.style.position = 'absolute';
        band.style.left = `${ca.left}px`;
        band.style.top = `${top}px`;
        band.style.width = `${ca.width}px`;
        band.style.height = `${h}px`;
        band.style.background = 'rgba(0,0,0,0.035)';
        band.style.pointerEvents = 'none';
        band.style.zIndex = '1';
        el.appendChild(band);
      }

      // separator (except first)
      if (idx > 0) {
        const sep = document.createElement('div');
        sep.className = 'dept-sep';
        sep.style.position = 'absolute';
        sep.style.left = `${ca.left}px`;
        sep.style.top = `${top}px`;
        sep.style.width = `${ca.width}px`;
        sep.style.height = '1px';
        sep.style.background = 'rgba(0,0,0,0.15)';
        sep.style.pointerEvents = 'none';
        sep.style.zIndex = '1';
        el.appendChild(sep);
      }

      // ONE rotated dept name per group — fixed right column, vertically centered
      const rot = document.createElement('div');
      rot.className = 'dept-label-rot';
      rot.textContent = g.dept;

      const centerY = top + h / 2;

      rot.style.position = 'absolute';
      rot.style.left = `${labelX}px`;
      rot.style.top = `${centerY}px`;
      rot.style.transform = 'translate(-50%, -50%) rotate(-90deg)';
      rot.style.transformOrigin = '50% 50%';
      rot.style.fontSize = '12px';
      rot.style.color = '#37474f';
      rot.style.pointerEvents = 'none';
      rot.style.direction = 'rtl';
      rot.style.zIndex = '2';
      rot.style.whiteSpace = 'nowrap';
      el.appendChild(rot);
    }
  };

  // After draw: overlays + toggle
  google.visualization.events.addListener(chart, 'ready', () => {
    drawDeptOverlaysIfGrouped();
    this.mountGroupToggleButton(el, () => {
      this.groupDoctorsByDept = !this.groupDoctorsByDept;
      this.drawLeaderboardDoctors(containerId, dir);
    });
  });

  this.drawSafe(chart, dt, opts, containerId);
}

  public async drawLeaderboardDepartments(
    containerId: string,
    dir: 'asc' | 'desc' = 'desc' // sort by AvgDay
  ) {
    await this.loadGoogleCharts();
    await this.waitForGoogleReady();
    if (!this.googleReady()) return;

    type Row = { name: string; avg: number; q: number };
    const rows: Row[] = this.buildDepartmentRows().map(([dept, q, avg]) => ({
      name: dept, avg: Number(avg) || 0, q: Number(q) || 0
    }));

    rows.sort((a, b) => dir === 'asc' ? a.avg - b.avg : b.avg - a.avg);

    const dt = new (window as any).google.visualization.DataTable();
    dt.addColumn('string', 'מחלקה');
    dt.addColumn('number', 'ימים ממוצעים');
    dt.addColumn({ type: 'string', role: 'annotation' });
    dt.addColumn({ type: 'string', role: 'annotationText' });
    dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

    rows.forEach(r => {
      const ann     = `ימים ${r.avg} | תורים ${r.q}`;
      const annText = `ימים ממוצעים: ${r.avg} · תורים: ${r.q}`;
      const tooltip =
        `<div style="direction:rtl;padding:6px 8px;font-size:12px">
           <div><b>${r.name}</b></div>
           <div>ימים ממוצעים: <b>${r.avg}</b></div>
           <div>תורים: <b>${r.q}</b></div>
         </div>`;
      dt.addRow([r.name, r.avg, ann, annText, tooltip]);
    });

    const rowHeight = 26;
    const vPad = 80;
    const height = Math.max(220, rows.length * rowHeight + vPad);
    const el = document.getElementById(containerId)!;
    el.style.height = `${height}px`;

    const title = dir === 'desc'
      ? 'כל המחלקות — ארוכים ← קצרים'
      : 'כל המחלקות — קצרים ← ארוכים';

    const opts: any = {
      title,
      legend: 'none',
      chartArea: { left: 140, right: 24, top: 40, bottom: 20 },
      hAxis: { minValue: 0 },
      height,
      bar: { groupWidth: '90%' },
      tooltip: { isHtml: true },
      annotations: {
        alwaysOutside: false,
        highContrast: true,
        textStyle: { fontSize: 11, auraColor: 'none', color: '#000' }
      }
    };

    const chart = new (window as any).google.visualization.BarChart(el);
    this.drawSafe(chart, dt, opts, containerId);
  }
}
