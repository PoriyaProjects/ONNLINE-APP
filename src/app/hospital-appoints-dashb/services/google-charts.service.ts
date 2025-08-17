import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

declare global { interface Window { google?: any; } }

// DTOs
export interface DeptDto { Name: string; Q: number; AvgDay: number; }
export interface DoctorDto { Name: string; Department: string; Q: number; AvgDay: number; }

// HorizontalMultiPeriodChart contracts
export interface HmpcDataPoint { label: string; value: number; color?: string; tooltip?: string; }
export interface HmpcRow { category: string; periods: HmpcDataPoint[]; }

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  // ---------------- Loader ----------------
  private loaderPromise: Promise<void> | null = null;

  private loadGoogleCharts(): Promise<void> {
    if (this.loaderPromise) return this.loaderPromise;
    this.loaderPromise = new Promise<void>((resolve, reject) => {
      if ((window as any).google?.visualization) { resolve(); return; }
      const onLoaded = () => {
        try {
          (window as any).google.charts.load('current', { packages: ['corechart', 'treemap', 'bar', 'table'] });
          (window as any).google.charts.setOnLoadCallback(() => resolve());
        } catch (e) { reject(e); }
      };
      if ((window as any).google?.charts) { onLoaded(); return; }
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

  async waitForGoogleReady(maxMs = 2000): Promise<void> {
    const start = Date.now();
    while (!this.googleReady() && Date.now() - start < maxMs) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // ---------------- Data store ----------------
  private cache = new Map<string, string>();
  private departments: DeptDto[] = [];
  private doctors: DoctorDto[] = [];
  private dataPromise: Promise<void> | null = null;

  constructor(private http: HttpClient, private zone: NgZone) {}

  runOutsideAngular<T>(fn: () => T): T {
    return this.zone.runOutsideAngular(fn);
  }

  // ---------------- API ----------------
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

  // ---------------- Public load ----------------
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

  // ---------------- Sanitization ----------------
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
    this.departments.sort((a,b)=> b.Q - a.Q || b.AvgDay - a.AvgDay);
    this.doctors.sort((a,b)=> b.AvgDay - a.AvgDay || b.Q - a.Q);
  }

  private normalizeResponseToObject(raw: string | null | undefined): any | null {
    const txt = (raw || '').replace(/^\uFEFF/, '').trim();
    if (!txt) return null;

    if (txt.startsWith('<?xml') || txt.startsWith('<string')) {
      try {
        const doc = new DOMParser().parseFromString(txt, 'text/xml');
        const strNode = doc.getElementsByTagName('string')[0] || doc.documentElement;
        const inner = (strNode?.textContent || '').trim();
        return this.tryParseAnyJson(inner);
      } catch {}
    }

    try {
      const obj = JSON.parse(txt);
      if (obj && typeof obj.d === 'string') {
        return this.tryParseAnyJson(obj.d);
      }
      return obj;
    } catch {
      return this.tryParseAnyJson(txt);
    }
  }

  private tryParseAnyJson(s: string): any | null {
    const t = (s || '').trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      const inner = t.slice(1, -1).replace(/\\"/g, '"');
      try { return JSON.parse(inner); } catch { return null; }
    }
    try { return JSON.parse(t); } catch { return null; }
  }

  // ---------------- Common draw helper ----------------
  private drawSafe<T extends { draw: Function }>(
    chart: T, data: any, options: any, containerId: string
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

  // ---------------- Row builders ----------------
  private buildDoctorRows(): Array<[string, string, number, number]> {
    return this.doctors.map(d => [ d.Name, d.Department, d.Q || 0, d.AvgDay || 0 ]);
  }

  private buildDepartmentRows(): Array<[string, number, number]> {
    return this.departments.map(d => [ d.Name, d.Q || 0, d.AvgDay || 0 ]);
  }

  private buildDeptAvgMap(): Map<string, number> {
    const avgMap = new Map<string, number>();
    if (!Array.isArray(this.departments)) return avgMap;
    for (const d of this.departments) {
      const name = String(d?.Name || '').trim();
      const avg = Number(d?.AvgDay);
      avgMap.set(name, isNaN(avg) ? 0 : avg);
    }
    return avgMap;
  }

  private makeInvisibleUniqueId(name: string, dept: string): string {
    return `${name}\u2063${dept}`; // U+2063 invisible separator
  }

 // =========================
// Treemap: always-visible values  (baked into tile titles, no overlay)
// =========================
private treemapMode: { mode: 'all' | 'dept'; dept?: string } = { mode: 'all' };

/** Public entry from component */
public async drawTreemap(targetId: string): Promise<void> {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  const el = document.getElementById(targetId) as HTMLElement | null;
  if (!el) return;

  if (this.treemapMode.mode === 'all') await this.drawTreemapAll(el);
  else await this.drawTreemapDept(el, this.treemapMode.dept!);
}

/** Allow component to clean overlays on tab change/destroy (kept for compatibility) */
public teardownTreemapOverlays(targetId: string) {
  const el = document.getElementById(targetId) as HTMLElement | null;
  if (!el) return;
  try { this.detachOverlayObservers(el); } catch {}
  Array.from(el.querySelectorAll('.treemap-overlay-layer,.treemap-back')).forEach(n => n.remove());
}

/* ---------- Overlay engine (helpers kept but not used in treemap draw) ---------- */
private getTreemapHost(container: HTMLElement): HTMLElement {
  const known = container.querySelector<HTMLElement>('.google-visualization-treeMap, .google-visualization-chart');
  if (known) return known;
  const node = container.querySelector<HTMLElement>('.google-visualization-treeMap-node');
  if (node && node.offsetParent instanceof HTMLElement) return node.offsetParent;
  return container;
}
private getOverlayLayerOnHost(host: HTMLElement): HTMLDivElement {
  let layer = host.querySelector<HTMLDivElement>(':scope > .treemap-overlay-layer');
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'treemap-overlay-layer';
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '999' } as any);
  if (getComputedStyle(host).position === 'static') (host.style as any).position = 'relative';
  host.appendChild(layer);
  return layer;
}
private detachOverlayObservers(container: HTMLElement) {
  const refs = (container as any)._treemapOverlayObservers as { mo: MutationObserver; ro: any; host: HTMLElement } | undefined;
  if (refs) {
    refs.mo.disconnect();
    refs.ro.disconnect();
    const ls = (refs.host as any)._treemapScrollListeners as Array<[Element | Window, any]> | undefined;
    if (ls) { for (const [t, h] of ls) t.removeEventListener('scroll', h); delete (refs.host as any)._treemapScrollListeners; }
    delete (container as any)._treemapOverlayObservers;
  }
}
private normalizeLabel(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/[\u2063\u200E\u200F\u202A-\u202E]/g, '')
          .replace(/\u00A0/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[.…]+$/g, '')
          .trim();
}
private findNodeByLabel(root: HTMLElement, label: string, used?: Set<HTMLElement>): HTMLElement | null {
  const want = this.normalizeLabel(label);
  const byAria = root.querySelectorAll<HTMLElement>('.google-visualization-treeMap-node[aria-label]');
  for (const n of Array.from(byAria)) {
    if (used?.has(n)) continue;
    const aria = this.normalizeLabel(n.getAttribute('aria-label') || '');
    if (aria.includes(want)) return n;
  }
  const byText = root.querySelectorAll<HTMLElement>('.google-visualization-treeMap-node');
  for (const n of Array.from(byText)) {
    if (used?.has(n)) continue;
    const txt = this.normalizeLabel(n.textContent || '');
    if (txt === want) return n;
  }
  const nodes = root.querySelectorAll<HTMLElement>('.google-visualization-treeMap-node');
  for (const n of Array.from(nodes)) {
    if (used?.has(n)) continue;
    const txt = this.normalizeLabel(n.textContent || '');
    if (txt === want && n.closest('.google-visualization-treeMap-childnode')) return n;
  }
  return null;
}
private tooltipInnerHtml(dt: any, options: any, row: number): string {
  const size = dt.getValue(row, 2);
  const color = dt.getValue(row, 3);
  const raw = typeof options.generateTooltip === 'function' ? (options.generateTooltip(row, size, color) || '') : '';
  return raw.replace(/^<div[^>]*>/i, '').replace(/<\/div>\s*$/i, '');
}
private adjustTextSize(el: HTMLElement, maxW: number, maxH: number) {
  let fs = 18;
  el.style.fontSize = `${fs}px`;
  el.style.lineHeight = '1.2';
  el.style.display = 'block';
  el.style.overflow = 'hidden';
  el.style.textOverflow = 'ellipsis';
  for (let i = 0; i < 10; i++) {
    if (el.scrollHeight <= maxH && el.scrollWidth <= maxW) break;
    fs = Math.max(8, fs - 0.5);
    el.style.fontSize = `${fs}px`;
    if (fs === 14) break;
  }
}
private renderAllOverlays(
  container: HTMLElement,
  dt: any,
  options: { headerHeight: number; generateTooltip: Function },
  clickable?: (row: number) => boolean
) {/* kept for compatibility; not used */}
private attachOverlayObservers(
  container: HTMLElement,
  dt: any,
  options: any,
  clickable?: (row: number) => boolean
) {/* kept for compatibility; not used */}

/* ---------- Label builders + mapping for drilldown ---------- */
private labelToDept = new Map<string, string>();

private makeDeptLabel(name: string, q: number, avg: number): string {
  // keep it short to avoid ellipsis
  return `${name} · ימים:${avg} · תורים:${q}`;
}
private makeDoctorLabel(name: string, q: number, avg: number): string {
  return `${name} · ימים:${avg} · תורים:${q}`;
}

/* ---------- Treemap draw (departments root) ---------- */
private async drawTreemapAll(el: HTMLElement) {
  const g = (window as any).google;
  const dt = new g.visualization.DataTable();
  dt.addColumn('string', 'Node');   // shown in tile header
  dt.addColumn('string', 'Parent');
  dt.addColumn('number', 'Size');   // area = avgDays
  dt.addColumn('number', 'Color');  // color = avgDays

  const ROOT_ID = 'מרכז רפואי';

  const deptAvg = this.buildDeptAvgMap();
  const avgs = Array.from(deptAvg.values());
  const globalMax = avgs.length ? Math.max(...avgs) : 0;

  this.labelToDept.clear();
  dt.addRow([ROOT_ID, null, 0, globalMax]);

  // area=color = avgDays; bake Q+avg into the visible label
  for (const [dept, q, avgRaw] of this.buildDepartmentRows()) {
    const avg = deptAvg.get(dept) ?? (Number(avgRaw) || 0);
    const visible = this.makeDeptLabel(dept, q, avg);
    this.labelToDept.set(visible, dept);     // map visible → raw name
    dt.addRow([visible, ROOT_ID, avg, avg]); // label contains values
  }

  const options = {
    headerHeight: 24,
    fontColor: '#ffffff',
    minColor: '#43a047',
    midColor: '#fdd835',
    maxColor: '#e53935',
    showScale: true,
    useWeightedAverageForAggregation: false,
    // Tooltip optional; titles already show values
    generateTooltip: () => ''
  };

  const chart = new g.visualization.TreeMap(el);

  // Drilldown: translate the displayed label back to the raw department name
  g.visualization.events.addListener(chart, 'select', () => {
    const sel = chart.getSelection();
    if (!sel.length) return;
    const r = sel[0].row;
    if (r == null) return;
    if (dt.getValue(r, 1) === ROOT_ID) {
      const visible = dt.getValue(r, 0) as string;
      const rawDept = this.labelToDept.get(visible) || visible;
      this.treemapMode = { mode: 'dept', dept: rawDept };
      this.drawTreemap(el.id);
    }
  });

  this.drawSafe(chart, dt, options, el.id);
}

/* ---------- Treemap draw (department drilldown) ---------- */
private async drawTreemapDept(el: HTMLElement, deptName: string) {
  const g = (window as any).google;
  const dt = new g.visualization.DataTable();
  dt.addColumn('string', 'Node');   // shown in tile header
  dt.addColumn('string', 'Parent');
  dt.addColumn('number', 'Size');   // area = avgDays
  dt.addColumn('number', 'Color');  // color = avgDays

  const ROOT = deptName;
  const docs = this.buildDoctorRows().filter(([, d]) => d === deptName);
  const deptAvg = Number(this.departments.find(d => d.Name === deptName)?.AvgDay) || 0;

  dt.addRow([ROOT, null, 0, deptAvg]);

  for (const [name, dept, q, avg] of docs) {
    const a = Number(avg) || 0;
    const visible = this.makeDoctorLabel(name, q, a);
    // If you need uniqueness across duplicate names, you can append an invisible ID:
    // const uniqueVisible = `${visible}\u2063${name}\u2063${dept}`;
    dt.addRow([visible, ROOT, a, a]); // label contains values
  }

  const options = {
    headerHeight: 18,
    fontColor: '#212121',
    minColor: '#43a047',
    midColor: '#fdd835',
    maxColor: '#e53935',
    showScale: true,
    useWeightedAverageForAggregation: false,
    generateTooltip: () => '' // titles already have the data
  };

  const chart = new g.visualization.TreeMap(el);

  g.visualization.events.addListener(chart, 'ready', () => {
    // simple back button; no overlay syncing needed
    this.mountBackButton(el, () => {
      this.treemapMode = { mode: 'all' };
      this.drawTreemap(el.id);
    });
  });

  this.drawSafe(chart, dt, options, el.id);
}


/* ---------- Small UI helper  ---------- */
private mountBackButton(container: HTMLElement, onClick: () => void) {
  Array.from(container.querySelectorAll('.treemap-back')).forEach(n => n.remove());
  const btn = document.createElement('button');
  btn.className = 'treemap-back';
  btn.textContent = '⬅︎ חזרה';
  Object.assign(btn.style, {
    position: 'absolute', top: '8px', right: '8px', padding: '4px 8px',
    direction: 'rtl', fontSize: '12px', border: '1px solid #bbb',
    borderRadius: '4px', background: '#fff', cursor: 'pointer', zIndex: 1000
  } as any);
  btn.onclick = onClick;
  if (!container.style.position) container.style.position = 'relative';
  container.appendChild(btn);
}



/*************/
/* Table Chart
/*************/
  // Pastel palette for department backgrounds (stable per department)
// public palette = ['#A3C9F9', '#F9D6A5', '#C5E1A5', '#F9A8D4', '#E6A5F7', '#F8BBD0', '#B2DFDB', '#FFECB3', '#DCEDC8', '#FFE0B2', '#D1C4E9', '#FFCDD2'];
public palette = [ '#A39DCD','#b9b473','#8BB3DF','#E2C87E','#BEE0BD','#E58FBC','#8DC63F',
  '#B5AEA3','#94AA64','#F1D5D1','#BC86B5','#DA549E','#AF4F76',
  '#FDB913','#00A79E','#C98846','#BE1E2D'];
private groupDoctorsByDept = true;

// Stable index into the palette based on dept name
private deptColorIndex(dept: string): number {
  let h = 7;
  for (let i = 0; i < dept.length; i++) h = (h * 31 + dept.charCodeAt(i)) >>> 0;
  return h % this.palette.length;
}

// Convert HEX (#RRGGBB) to rgba
private hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// private mountGroupToggleButton(el: HTMLElement, onToggle: () => void) {
//   Array.from(el.querySelectorAll('.group-toggle')).forEach(n => n.remove());
//   const btn = document.createElement('button');
//   btn.className = 'group-toggle';
//   btn.textContent = this.groupDoctorsByDept ? 'בטל קיבוץ למחלקות' : 'קבץ לפי מחלקה';
//   Object.assign(btn.style, {
//     position: 'absolute', top: '8px', left: '8px', padding: '6px 10px',
//     direction: 'rtl', fontSize: '12px', border: '1px solid #bbb',
//     borderRadius: '6px', background: '#fff', cursor: 'pointer', zIndex: '5'
//   } as any);
//   btn.onclick = onToggle;
//   if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
//   el.appendChild(btn);
// }

public async drawLeaderboardDoctors(containerId: string, dir: 'asc' | 'desc' = 'desc') {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  type Row = { name: string; dept: string; avg: number; q: number };
  const baseRows: Row[] = this.buildDoctorRows().map(([name, dept, q, avg]) => ({ name, dept, avg: Number(avg) || 0, q: Number(q) || 0 }));
  const sortInDept = (a: Row, b: Row) => (dir === 'asc' ? a.avg - b.avg : b.avg - a.avg);

  let rows: Row[] = [];
  if (this.groupDoctorsByDept) {
    const byDept = new Map<string, Row[]>();
    for (const r of baseRows) (byDept.get(r.dept) || byDept.set(r.dept, []).get(r.dept)!).push(r);
    byDept.forEach(list => list.sort(sortInDept));
    const deptOrder = Array.from(byDept.keys()).sort((da, db) => {
      const la = byDept.get(da)!; const lb = byDept.get(db)!;
      const scoreA = la[0] ? la[0].avg : 0;
      const scoreB = lb[0] ? lb[0].avg : 0;
      return dir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
    for (const d of deptOrder) rows.push(...byDept.get(d)!);
  } else {
    rows = baseRows.slice().sort(sortInDept);
  }

  const google = (window as any).google;
  const dt = new google.visualization.DataTable();
  dt.addColumn('string', 'רופא – מחלקה');
  dt.addColumn('number', 'תור זמין');
  dt.addColumn({ type: 'string', role: 'annotation' });
  dt.addColumn({ type: 'string', role: 'annotationText' });
  dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

  const rowDept: string[] = [];
  for (const r of rows) {
    const display = `${r.name} – ${r.dept}`;
    const ann     = `ימים ${r.avg} | תורים ${r.q}`;
    const annText = `תור זמין: ${r.avg} · תורים: ${r.q}`;
    const tooltip =
      `<div style="direction:rtl;padding:6px 8px;font-size:12px">
         <div><b>${r.name}</b></div>
         <div>מחלקה: ${r.dept}</div>
         <div>תור זמין: <b>${r.avg}</b></div>
         <div>תורים: <b>${r.q}</b></div>
       </div>`;
    dt.addRow([display, r.avg, ann, annText, tooltip]);
    rowDept.push(r.dept);
  }

  const rowHeight = 26;
  const vPad = 80;
  const height = Math.max(220, rows.length * rowHeight + vPad);
  const el = document.getElementById(containerId)!;
  el.style.height = `${height}px`;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const title = dir === 'asc'
    ? (this.groupDoctorsByDept ? 'רופאים לפי מחלקה — קצרים ← ארוכים' : 'כל הרופאים — קצרים ← ארוכים')
    : (this.groupDoctorsByDept ? 'רופאים לפי מחלקה — ארוכים ← קצרים' : 'כל הרופאים — ארוכים ← קצרים');

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
    annotations: { alwaysOutside: false, highContrast: true, textStyle: { fontSize: 11, auraColor: 'none', color: '#000' } }
  };

  const chart = new google.visualization.BarChart(el);

  // === Refactored: use the provided pastel palette per department ===
  const drawDeptOverlaysIfGrouped = () => {
    const old = el.querySelectorAll('.dept-band, .dept-sep, .dept-label-rot');
    old.forEach(n => n.remove());
    if (!this.groupDoctorsByDept) return;

    const cli = chart.getChartLayoutInterface();
    const ca  = cli.getChartAreaBoundingBox();
    const labelX = ca.left + ca.width + 10;

    const groups: Array<{dept: string; start: number; end: number}> = [];
    let start = 0;
    for (let i = 1; i <= rowDept.length; i++) {
      if (i === rowDept.length || rowDept[i] !== rowDept[start]) {
        groups.push({ dept: rowDept[start], start, end: i - 1 });
        start = i;
      }
    }

    const barBox = (i: number) => { try { return cli.getBoundingBox(`bar#0#${i}`); } catch { return null; } };

    for (let idx = 0; idx < groups.length; idx++) {
      const g = groups[idx];
      const topBox = barBox(g.start);
      const botBox = barBox(g.end);
      if (!topBox || !botBox) continue;

      const top = topBox.top - 2;
      const h   = (botBox.top + botBox.height) - topBox.top + 4;

      // Choose color from palette (stable per department), add alpha for soft band
      const colorIdx = this.deptColorIndex(g.dept);
      const bandColor = this.hexToRgba(this.palette[colorIdx], 0.22);

      const band = document.createElement('div');
      band.className = 'dept-band';
      Object.assign(band.style, {
        position: 'absolute', left: `${ca.left}px`, top: `${top}px`,
        width: `${ca.width}px`, height: `${h}px`,
        background: bandColor,
        pointerEvents: 'none', zIndex: '1'
      } as any);
      el.appendChild(band);

      // subtle separator line between groups
      if (idx > 0) {
        const sep = document.createElement('div');
        sep.className = 'dept-sep';
        Object.assign(sep.style, {
          position: 'absolute', left: `${ca.left}px`, top: `${top}px`,
          width: `${ca.width}px`, height: '1px',
          background: 'rgba(0,0,0,0.12)',
          pointerEvents: 'none', zIndex: '1'
        } as any);
        el.appendChild(sep);
      }

      // rotated department label
      const rot = document.createElement('div');
      rot.className = 'dept-label-rot';
      rot.textContent = g.dept;
      const centerY = top + h / 2;
      Object.assign(rot.style, {
        position: 'absolute', left: `${labelX}px`, top: `${centerY}px`,
        transform: 'translate(-50%, -50%) rotate(-90deg)', transformOrigin: '50% 50%',
        fontSize: '12px', color: '#37474f', pointerEvents: 'none', direction: 'rtl',
        zIndex: '2', whiteSpace: 'nowrap'
      } as any);
      el.appendChild(rot);
    }
  };

  (window as any).google.visualization.events.addListener(chart, 'ready', () => {
    drawDeptOverlaysIfGrouped();
    // this.mountGroupToggleButton(el, () => {
    //   this.groupDoctorsByDept = !this.groupDoctorsByDept;
    //   this.drawLeaderboardDoctors(containerId, dir);
    // });
  });

  this.drawSafe(chart, dt, opts, containerId);
}

public async drawLeaderboardDepartments(containerId: string, dir: 'asc' | 'desc' = 'desc') {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  type Row = { name: string; avg: number; q: number };
  const rows: Row[] = this.buildDepartmentRows().map(([dept, q, avg]) => ({ name: dept, avg: Number(avg) || 0, q: Number(q) || 0 }));
  rows.sort((a, b) => dir === 'asc' ? a.avg - b.avg : b.avg - a.avg);

  const dt = new (window as any).google.visualization.DataTable();
  dt.addColumn('string', 'מחלקה');
  dt.addColumn('number', 'תור זמין');
  dt.addColumn({ type: 'string', role: 'annotation' });
  dt.addColumn({ type: 'string', role: 'annotationText' });
  dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

  rows.forEach(r => {
    const ann     = `ימים ${r.avg} | תורים ${r.q}`;
    const annText = `תור זמין: ${r.avg} · תורים: ${r.q}`;
    const tooltip =
      `<div style="direction:rtl;padding:6px 8px;font-size:12px">
         <div><b>${r.name}</b></div>
         <div>תור זמין: <b>${r.avg}</b></div>
         <div>תורים: <b>${r.q}</b></div>
       </div>`;
    dt.addRow([r.name, r.avg, ann, annText, tooltip]);
  });

  const rowHeight = 26;
  const vPad = 80;
  const height = Math.max(220, rows.length * rowHeight + vPad);
  const el = document.getElementById(containerId)!;
  el.style.height = `${height}px`;

  const title = dir === 'desc' ? 'כל המחלקות — ארוכים ← קצרים' : 'כל המחלקות — קצרים ← ארוכים';

  const opts: any = {
    title,
    legend: 'none',
    chartArea: { left: 140, right: 24, top: 40, bottom: 20 },
    hAxis: { minValue: 0 },
    height,
    bar: { groupWidth: '90%' },
    tooltip: { isHtml: true },
    annotations: { alwaysOutside: false, highContrast: true, textStyle: { fontSize: 11, auraColor: 'none', color: '#000' } }
  };

  const chart = new (window as any).google.visualization.BarChart(el);
  this.drawSafe(chart, dt, opts, containerId);
}




 // =========================
  // Table chart
  // =========================


  public async drawAppointmentsTable(
    target: string | HTMLElement,
    dir: 'asc' | 'desc' = 'desc'
  ) {
    await this.loadGoogleCharts();
    await this.waitForGoogleReady();
    if (!this.googleReady()) return;
  
    // ---- resolve container (works with *ngIf) ----
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) {
      console.warn('[drawAppointmentsTable] container not found:', target);
      return;
    }
  
    // SOURCE DATA — reuse existing transformations
    type Doc = { name: string; dept: string; q: number; avg: number };
    const doctorRows: Doc[] = this.buildDoctorRows().map(([name, dept, q, avg]) => ({
      name,
      dept,
      q: Number(q) || 0,
      avg: Number(avg) || 0
    }));
  
    const deptTotals = new Map<string, { q: number; avg: number }>();
    this.buildDepartmentRows().forEach(([dept, q, avg]: [string, number, number]) =>
      deptTotals.set(dept, { q: Number(q) || 0, avg: Number(avg) || 0 })
    );
  
    // GROUPING (display exactly what API returns, incl. "ללא רופא")
    const byDept = new Map<string, Doc[]>();
    for (const d of doctorRows)
      (byDept.get(d.dept) || byDept.set(d.dept, []).get(d.dept)!).push(d);
  
    type UiRow = { dept: string; doctor: string; q: number; avg: number; isHeader: boolean };
    const baseUi: UiRow[] = [];
  
    // Pastel palette for department backgrounds
    const palette = [
      '#A3C9F9', '#F9D6A5', '#C5E1A5', '#F9A8D4', '#E6A5F7', '#F8BBD0',
      '#B2DFDB', '#FFECB3', '#DCEDC8', '#FFE0B2', '#D1C4E9', '#FFCDD2'
    ];
    const deptBand = (dept: string) => {
      let h = 7; for (const ch of dept) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return palette[h % palette.length];
    };
  
    const deptOrder = Array.from(deptTotals.keys()).sort((a, b) => {
      const aa = deptTotals.get(a)?.avg ?? 0;
      const bb = deptTotals.get(b)?.avg ?? 0;
      return dir === 'asc' ? aa - bb : bb - aa;
    });
  
    for (const dept of deptOrder) {
      const totals = deptTotals.get(dept) ?? { q: 0, avg: 0 };
      const docs = (byDept.get(dept) || []).slice().sort((a, b) =>
        dir === 'asc' ? a.avg - b.avg : b.avg - a.avg
      );
      baseUi.push({ dept, doctor: dept, q: totals.q, avg: totals.avg, isHeader: true });
      docs.forEach(d => baseUi.push({ dept, doctor: d.name, q: d.q, avg: d.avg, isHeader: false }));
    }
  
    // host
    el.innerHTML = '';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  
    // ==== toolbar ====
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
      position: 'relative',
      padding: '8px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      direction: 'rtl',
      borderBottom: '1px solid #e0e0e0',
      background: '#fafafa',
      zIndex: '2'
    } as any);
  
    const searchWrap = document.createElement('div');
    Object.assign(searchWrap.style, { position: 'relative', display: 'inline-flex', alignItems: 'center' } as any);
  
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'חיפוש: מחלקה / רופא / תורים / ימים';
    Object.assign(searchInput.style, {
      width: '280px',
      padding: '6px 10px',
      border: '1px solid #cfd8dc',
      borderRadius: '6px',
      fontSize: '13px',
      outline: 'none',
      background: '#fff'
    } as any);
    searchWrap.appendChild(searchInput);
    toolbar.appendChild(searchWrap);
  
    // ---- colors toggle button (persisted) ----
    const LS_KEY_COLOR = 'appt_dept_colors_enabled';
    let colorsEnabled = ((): boolean => {
      const v = localStorage.getItem(LS_KEY_COLOR);
      return v === null ? true : v !== '0';
    })();
  
    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.textContent = colorsEnabled ? 'כבה צבעי מחלקות' : 'הפעל צבעי מחלקות';
    Object.assign(colorBtn.style, {
      position: 'absolute', top: '8px', left: '8px',
      padding: '6px 10px',
      border: '1px solid #cfd8dc',
      borderRadius: '6px',
      background: '#fff',
      cursor: 'pointer',
      fontSize: '13px'
    } as any);
    toolbar.appendChild(colorBtn);
  
    el.appendChild(toolbar);
  
    // table host (separate div so we never wipe the toolbar)
    const tableHost = document.createElement('div');
    const hostId = `apptTableHost_${Math.random().toString(36).slice(2)}`;
    tableHost.id = hostId;
    tableHost.style.padding = '8px';
    el.appendChild(tableHost);
  
    // ------- helper: dynamic widths for first 3 columns, table 100% -------
    const applyDynamicWidths = (hostId: string, fixedCols = 3) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      const tbl = host.querySelector('table') as HTMLTableElement | null;
      if (!tbl) return;
  
      // Make the table occupy full width; last (unfixed) column will grow.
      tbl.style.width = '100%';
      tbl.style.tableLayout = 'auto';
  
      // Ensure header cells wrapped
      const thead = tbl.querySelector('thead');
      if (thead) {
        thead.querySelectorAll('th').forEach((th, idx) => {
          if (idx < fixedCols) {
            if (!th.querySelector('.header-wrap')) {
              const txt = th.innerHTML;
              th.innerHTML = `<span class="header-wrap">${txt}</span>`;
            }
          }
        });
      }
  
      // Ensure body cells have inline-block wrappers + padding
      const tbody = tbl.querySelector('tbody');
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          tr.querySelectorAll('td').forEach((td, idx) => {
            if (idx < fixedCols) {
              if (!td.querySelector('.cell-wrap')) {
                const current = td.innerHTML;
                td.innerHTML = `<span class="cell-wrap">${current}</span>`;
              }
            }
          });
        });
      }
  
      // Wrapper styles for fixed columns
      const setWrapStyles = (el: Element) => {
        const s = (el as HTMLElement).style;
        s.display = 'inline-block';
        s.paddingLeft = '20px';
        s.paddingRight = '20px';
        s.whiteSpace = 'nowrap';
        s.boxSizing = 'content-box';
      };
      tbl.querySelectorAll('.cell-wrap').forEach(setWrapStyles);
      tbl.querySelectorAll('.header-wrap').forEach(setWrapStyles);
  
      // Measure max width per fixed column (including wrap + padding)
      const widths: number[] = new Array(fixedCols).fill(0);
  
      if (thead) {
        const ths = Array.from(thead.querySelectorAll('th')).slice(0, fixedCols);
        ths.forEach((th, i) => {
          const wrap = th.querySelector('.header-wrap') as HTMLElement | null;
          const w = wrap ? wrap.offsetWidth : (th as HTMLElement).offsetWidth;
          widths[i] = Math.max(widths[i], w);
        });
      }
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          Array.from(tr.children).slice(0, fixedCols).forEach((td, i) => {
            const wrap = (td as HTMLElement).querySelector('.cell-wrap') as HTMLElement | null;
            const w = wrap ? wrap.offsetWidth : (td as HTMLElement).offsetWidth;
            widths[i] = Math.max(widths[i], w);
          });
        });
      }
  
      // Lock widths on first fixedCols; leave the last column free to expand
      const setCellWidth = (cell: HTMLElement, w: number) => {
        cell.style.width = `${w}px`;
        cell.style.minWidth = `${w}px`;
        cell.style.maxWidth = `${w}px`;
      };
  
      if (thead) {
        const ths = Array.from(thead.querySelectorAll('th')) as HTMLElement[];
        ths.slice(0, fixedCols).forEach((th, i) => setCellWidth(th, widths[i]));
        // Ensure the last column header doesn't get constrained
        if (ths[fixedCols]) {
          ths[fixedCols].style.width = '';
          ths[fixedCols].style.minWidth = '';
          ths[fixedCols].style.maxWidth = '';
        }
      }
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          const tds = Array.from(tr.children) as HTMLElement[];
          tds.slice(0, fixedCols).forEach((td, i) => setCellWidth(td, widths[i]));
          // Unfix the last column cell
          if (tds[fixedCols]) {
            tds[fixedCols].style.width = '';
            tds[fixedCols].style.minWidth = '';
            tds[fixedCols].style.maxWidth = '';
          }
        });
      }
    };
  
    
    let currentUi: UiRow[] = baseUi.slice();
  
    const drawFiltered = (ui: UiRow[]) => {
      currentUi = ui.slice();
  
      const google = (window as any).google;
      const dt = new google.visualization.DataTable();
  
      dt.addColumn('string', 'מחלקה');
      dt.addColumn('string', 'רופא');
      dt.addColumn('number', 'תורים');
      dt.addColumn('number', 'ימי המתנה');
  
      const deptTotalQ = new Map<string, number>();
      ui.forEach(r => { if (r.isHeader) deptTotalQ.set(r.dept, r.q); });
  
      const ratingHtml = (dept: string, q: number) => {
        const total = Math.max(1, deptTotalQ.get(dept) || q);
        const scale = 5;
        const val = Math.min(scale, (q / total) * scale);
  
        let full = Math.floor(val);
        let half = (val - full) >= 0.5 ? 1 : 0;
        if (q > 0 && full + half === 0) half = 1;
  
        const empty = Math.max(0, scale - full - half);
        const icon = (n: string, style = '') => `<span class="material-icons" style="${style}">${n}</span>`;
  
        return `
          <div class="rating">
            ${icon('person').repeat(full)}
            ${half ? icon('person_outline', 'color:#9e9e9e;') : ''}
            ${icon('person_outline', 'color:#cfcfcf;').repeat(empty)}
            <span class="q-num" style="line-height:0.34em;vertical-align:text-top;">${q}</span>
          </div>
        `;
      };
  
      const totalBadge = (q: number) =>
        `<span class="q-total-badge" title="סה״כ תורים במחלקה תורים במחלקה">סה״כ תורים במחלקה ${q}</span>`;
  
      
      const maxAvg = Math.max(1, ...ui.map(r => r.avg));
      const avgBar = (avg: number) => {
        const p = Math.round((avg / maxAvg) * 100);
        const h = Math.round((1 - p / 100) * 120);
        const color = `hsl(${h}, 65%, 55%)`;
        return `
          <div class="avgbar">
            <div class="bar" style="width:${p}%;background:${color}">
              <span class="val">${avg}</span>
            </div>
          </div>`;
      };
  
      
      ui.forEach(r => {
        const deptCellHtml = r.isHeader
          ? `<span class="dept-bold">${r.dept}</span>`
          : `<span class="cell-muted">${r.dept}</span>`;
        const docCellHtml  = r.isHeader
          ? `<span class="dept-bold">${r.doctor}</span>`
          : r.doctor;
  
        const qCellHtml = r.isHeader ? totalBadge(r.q) : ratingHtml(r.dept, r.q);
  
        const deptCell = { v: r.dept,   f: `<span class="cell-wrap">${deptCellHtml}</span>` };
        const docCell  = { v: r.doctor, f: `<span class="cell-wrap">${docCellHtml}</span>` };
        const qCell    = { v: r.q,      f: `<span class="cell-wrap">${qCellHtml}</span>` };
        const avgCell  = { v: r.avg,    f: avgBar(r.avg) };
  
        dt.addRow([deptCell as any, docCell as any, qCell as any, avgCell as any]);
      });
  
      const table = new google.visualization.Table(document.getElementById(hostId));
      const opts: any = {
        allowHtml: true,        
        width: '100%',
        alternatingRowStyle: false,
        cssClassNames: { tableCell: 'app-table', headerCell: 'app-table' }
      };
  
      google.visualization.events.addListener(table, 'ready', () => {
        const host = document.getElementById(hostId)!;
        const trs = host.querySelectorAll('table tbody tr');
  
        
        const groupMeta: Array<{ dept: string; start: number; end: number; color: string }> = [];
        let startIdx = 0;
        for (let i = 1; i <= ui.length; i++) {
          if (i === ui.length || ui[i].dept !== ui[startIdx].dept) {
            const dept = ui[startIdx].dept;
            groupMeta.push({ dept, start: startIdx, end: i - 1, color: deptBand(dept) });
            startIdx = i;
          }
        }
  
        // apply or clear department colors based on current toggle
        groupMeta.forEach(g => {
          for (let r = g.start; r <= g.end; r++) {
            const tr = trs[r] as HTMLElement;
            if (!tr) continue;
            tr.style.background = colorsEnabled ? g.color : '';
          }
          const headerTr = trs[g.start] as HTMLElement;
          if (headerTr) headerTr.style.fontWeight = '700';
        });
  
        // this.mountGroupToggleButton(el, () => {
        //   this.drawAppointmentsTable(el, dir === 'asc' ? 'desc' : 'asc');
        // });
  
        const tbl = host.querySelector('table') as HTMLElement;
        if (tbl) tbl.setAttribute('dir', 'rtl');
  
        // After the table is in the DOM, fix first 3 column widths; last column fills the rest.
        applyDynamicWidths(hostId, 3);
      });
  
      this.drawSafe(table, dt, opts, hostId);
    };
  
    // initial draw with full dataset
    drawFiltered(baseUi);
  
    // ---- search wiring (always include department header) ----
    let searchTimer: any = null;
    const applySearch = () => {
      const q = (searchInput.value || '').toLowerCase().trim();
      if (!q) {
        drawFiltered(baseUi);
        return;
      }
  
      // Build filtered list while ALWAYS including the header of any matching department
      const filtered: UiRow[] = [];
      // group baseUi by department (preserving order)
      const deptBlocks: Record<string, UiRow[]> = {};
      const order: string[] = [];
      let curDept = '';
      baseUi.forEach(r => {
        if (r.isHeader) { curDept = r.dept; order.push(curDept); deptBlocks[curDept] = []; }
        deptBlocks[curDept].push(r);
      });
  
      for (const dept of order) {
        const block = deptBlocks[dept] || [];
        if (block.length === 0) continue;
  
        const header = block[0]; // header first
        const doctors = block.slice(1);
  
        const headerMatches =
          (header.dept || '').toLowerCase().includes(q) ||
          String(header.q).includes(q) ||
          String(header.avg).includes(q);
  
        const matchedDoctors = doctors.filter(d => {
          return (d.doctor || '').toLowerCase().includes(q)
              || (d.dept || '').toLowerCase().includes(q)
              || String(d.q).includes(q)
              || String(d.avg).includes(q);
        });
  
        if (headerMatches || matchedDoctors.length > 0) {
          filtered.push(header);                // ✅ always include header if anything in dept matches
          filtered.push(...(headerMatches ? doctors : matchedDoctors));
        }
      }
  
      drawFiltered(filtered);
    };
  
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applySearch, 200);
    });
  
    // toggle button behavior
    colorBtn.addEventListener('click', () => {
      colorsEnabled = !colorsEnabled;
      localStorage.setItem(LS_KEY_COLOR, colorsEnabled ? '1' : '0');
      colorBtn.textContent = colorsEnabled ? 'כבה צבעי מחלקות' : 'הפעל צבעי מחלקות';
      // redraw current view to apply/remove colors
      drawFiltered(currentUi);
    });
  }
  
  
  
}
