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
/** Dept color = the department's own AvgDay (no aggregation from doctors) */
private buildDeptColorFromDeptAvg(): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of this.departments) {
    m.set(d.Name, Number(d.AvgDay) || 0); // exactly as provided by API
  }
  return m;
}

// Unique (but visually identical) node id to avoid collisions like "ללא שיוך רופא"
private makeInvisibleUniqueId(name: string, dept: string): string {
  return `${name}\u2063${dept}`; // U+2063 invisible separator
}

// Drilldown state
private treemapMode: { mode: 'all' | 'dept'; dept?: string } = { mode: 'all' };

// Small back button overlay
private mountBackButton(container: HTMLElement, onClick: () => void) {
  Array.from(container.querySelectorAll('.treemap-back')).forEach(n => n.remove());
  const btn = document.createElement('button');
  btn.className = 'treemap-back';
  btn.textContent = '⬅︎ חזרה';
  btn.style.position = 'absolute';
  btn.style.top = '8px';
  btn.style.right = '8px';
  btn.style.padding = '4px 8px';
  btn.style.direction = 'rtl';
  btn.style.fontSize = '12px';
  btn.style.border = '1px solid #bbb';
  btn.style.borderRadius = '4px';
  btn.style.background = '#fff';
  btn.style.cursor = 'pointer';
  btn.onclick = onClick;

  container.style.position = container.style.position || 'relative';
  container.appendChild(btn);
}

public async drawTreemap(targetId: string) {
  await this.loadGoogleCharts();
  await this.waitForGoogleReady();
  if (!this.googleReady()) return;

  const el = document.getElementById(targetId) as HTMLElement | null;
  if (!el) return;

  if (this.treemapMode.mode === 'all') {
    await this.drawTreemapAll(el);
  } else {
    await this.drawTreemapDept(el, this.treemapMode.dept!);
  }
}

// Root view: departments only (color = department's own AvgDay)
private async drawTreemapAll(el: HTMLElement) {
  const g = (window as any).google;
  const dt = new g.visualization.DataTable();
  dt.addColumn('string', 'Node');
  dt.addColumn('string', 'Parent');
  dt.addColumn('number', 'Size');
  dt.addColumn('number', 'Color');

  const ROOT_ID = 'כלל';
  const deptColor = this.buildDeptColorFromDeptAvg();
  const globalMax = Math.max(0, ...Array.from(deptColor.values())); // range for legend
  dt.addRow([ROOT_ID, null, 0, globalMax]);

  // Departments only (click to drill)
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
    generateTooltip: (row: number, size: number /*ignored*/, _value: number) => {
      const id = dt.getValue(row, 0) as string;
      if (id === ROOT_ID) return '';
      const deptAvg = dt.getValue(row, 3) as number; // read Color column explicitly
      return `<div style="padding:6px;direction:rtl">
                <b>${id}</b><br/>ממתינים: ${size} | ימים ממוצעים: ${deptAvg}
              </div>`;
    }
  };

  const chart = new g.visualization.TreeMap(el);
  g.visualization.events.addListener(chart, 'select', () => {
    const sel = chart.getSelection();
    if (!sel.length) return;
    const r = sel[0].row;
    if (r == null) return;
    const parent = dt.getValue(r, 1);
    const nodeId = dt.getValue(r, 0) as string;
    if (parent === ROOT_ID) {
      this.treemapMode = { mode: 'dept', dept: nodeId };
      this.drawTreemap(el.id);
    }
  });

  this.drawSafe(chart, dt, options, el.id);
  // remove back button on root
  Array.from(el.querySelectorAll('.treemap-back')).forEach(n => n.remove());
}

// Dept view: selected department as root (root color = department's own AvgDay), doctors as leaves
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

  // root color = department's own AvgDay to keep legend consistent with dept view
  dt.addRow([ROOT, null, 0, deptAvg]);

  for (const [name, dept, q, avg] of docs) {
    dt.addRow([this.makeInvisibleUniqueId(name, dept), ROOT, q, avg]); // doctor AvgDay as-is (Color col)
  }

  const options = {
    headerHeight: 18,
    fontColor: '#212121',
    minColor: '#43a047',
    midColor: '#fdd835',
    maxColor: '#e53935',
    showScale: true,
    useWeightedAverageForAggregation: false,
    generateTooltip: (row: number, size: number /*ignored*/, _value: number) => {
      const rawId = dt.getValue(row, 0) as string;
      const label = rawId.replace(/\u2063.*$/, '');
      const colorVal = dt.getValue(row, 3) as number; // always get Color column
      if (label === ROOT) {
        return `<div style="padding:6px;direction:rtl"><b>${ROOT}</b><br/>ימים ממוצעים (מחלקה): ${colorVal}</div>`;
      }
      return `<div style="padding:6px;direction:rtl">
                <b>${label}</b><br/>מחלקה: ${ROOT}
                <br/>ממתינים: ${size} | ימים ממוצעים: ${colorVal}
              </div>`;
    }
  };

  const chart = new g.visualization.TreeMap(el);
  this.drawSafe(chart, dt, options, el.id);

  // Back button
  this.mountBackButton(el, () => {
    this.treemapMode = { mode: 'all' };
    this.drawTreemap(el.id);
  });
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

  // public async drawLeaderboardDoctors(
  //   containerId: string,
  //   dir: 'asc' | 'desc' = 'desc' // sort by AvgDay
  // ) {
  //   await this.loadGoogleCharts();
  //   await this.waitForGoogleReady();
  //   if (!this.googleReady()) return;

  //   type Row = { name: string; dept: string; avg: number; q: number };
  //   const rows: Row[] = this.buildDoctorRows().map(([name, dept, q, avg]) => ({
  //     name, dept, avg: Number(avg) || 0, q: Number(q) || 0
  //   }));

  //   rows.sort((a, b) => dir === 'asc' ? a.avg - b.avg : b.avg - a.avg);

  //   const dt = new (window as any).google.visualization.DataTable();
  //   dt.addColumn('string', 'רופא – מחלקה');
  //   dt.addColumn('number', 'ימים ממוצעים');
  //   dt.addColumn({ type: 'string', role: 'annotation' });
  //   dt.addColumn({ type: 'string', role: 'annotationText' });
  //   dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

  //   const rowDept: string[] = [];
  //   rows.forEach(r => {
  //     const display = `${r.name} – ${r.dept}`;
  //     const ann     = `ימים ${r.avg} | תורים ${r.q}`;
  //     const annText = `ימים ממוצעים: ${r.avg} · תורים: ${r.q}`;
  //     const tooltip =
  //       `<div style="direction:rtl;padding:6px 8px;font-size:12px">
  //          <div><b>${display}</b></div>
  //          <div>מחלקה: ${r.dept}</div>
  //          <div>ימים ממוצעים: <b>${r.avg}</b></div>
  //          <div>תורים: <b>${r.q}</b></div>
  //        </div>`;
  //     dt.addRow([display, r.avg, ann, annText, tooltip]);
  //     rowDept.push(r.dept);
  //   });

  //   const rowHeight = 26;
  //   const vPad = 80;
  //   const height = Math.max(220, rows.length * rowHeight + vPad);
  //   const el = document.getElementById(containerId)!;
  //   el.style.height = `${height}px`;

  //   const title = dir === 'desc' ? 'כל הרופאים — ארוכים ← קצרים' : 'כל הרופאים — קצרים ← ארוכים';

  //   const opts: any = {
  //     title,
  //     legend: 'none',
  //     chartArea: { left: 220, right: 24, top: 40, bottom: 20 },
  //     hAxis: { minValue: 0 },
  //     height,
  //     bar: { groupWidth: '90%' },
  //     tooltip: { isHtml: true },
  //     annotations: {
  //       alwaysOutside: false,
  //       highContrast: true,
  //       textStyle: { fontSize: 11, auraColor: 'none', color: '#000' }
  //     }
  //   };

  //   const chart = new (window as any).google.visualization.BarChart(el);

  //   // Pretty department bands
  //   (window as any).google.visualization.events.addListener(chart, 'ready', () => {
  //     Array.from(el.querySelectorAll('.dept-band, .dept-sep, .dept-label')).forEach(n => n.remove());
  //     const cli = chart.getChartLayoutInterface();
  //     const ca  = cli.getChartAreaBoundingBox();
  //     el.style.position = 'relative';

  //     // group contiguous by dept
  //     const groups: Array<{dept: string; start: number; end: number}> = [];
  //     let start = 0;
  //     for (let i = 1; i <= rowDept.length; i++) {
  //       if (i === rowDept.length || rowDept[i] !== rowDept[start]) {
  //         groups.push({ dept: rowDept[start], start, end: i - 1 });
  //         start = i;
  //       }
  //     }

  //     const barBox = (i: number) => {
  //       try { return cli.getBoundingBox(`bar#0#${i}`); } catch { return null; }
  //     };

  //     groups.forEach((g, idx) => {
  //       const topBox = barBox(g.start);
  //       const botBox = barBox(g.end);
  //       if (!topBox || !botBox) return;

  //       const top    = topBox.top - 2;
  //       const height = (botBox.top + botBox.height) - topBox.top + 4;

  //       if (idx % 2 === 0) {
  //         const band = document.createElement('div');
  //         band.className = 'dept-band';
  //         band.style.position = 'absolute';
  //         band.style.left = `${ca.left}px`;
  //         band.style.top = `${top}px`;
  //         band.style.width = `${ca.width}px`;
  //         band.style.height = `${height}px`;
  //         band.style.background = 'rgba(0,0,0,0.035)';
  //         band.style.pointerEvents = 'none';
  //         el.appendChild(band);
  //       }

  //       if (idx > 0) {
  //         const sep = document.createElement('div');
  //         sep.className = 'dept-sep';
  //         sep.style.position = 'absolute';
  //         sep.style.left = `${ca.left}px`;
  //         sep.style.top = `${top}px`;
  //         sep.style.width = `${ca.width}px`;
  //         sep.style.height = `1px`;
  //         sep.style.background = 'rgba(0,0,0,0.15)';
  //         sep.style.pointerEvents = 'none';
  //         el.appendChild(sep);
  //       }

  //       const lbl = document.createElement('div');
  //       lbl.className = 'dept-label';
  //       lbl.style.position = 'absolute';
  //       lbl.style.left = `${Math.max(8, ca.left - 200)}px`;
  //       lbl.style.width = `190px`;
  //       lbl.style.top = `${top}px`;
  //       lbl.style.height = `${height}px`;
  //       lbl.style.display = 'flex';
  //       lbl.style.alignItems = 'center';
  //       lbl.style.justifyContent = 'flex-end';
  //       lbl.style.fontSize = '12px';
  //       lbl.style.color = '#37474f';
  //       lbl.style.pointerEvents = 'none';
  //       lbl.style.direction = 'rtl';
  //       lbl.textContent = g.dept;
  //       el.appendChild(lbl);
  //     });
  //   });

  //   this.drawSafe(chart, dt, opts, containerId);
  // }

  // keep this state + helper in your service as before
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
