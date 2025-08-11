import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
// ===== Optional: Department color provider (localStorage aware) =====
@Injectable({ providedIn: 'root' })
export class DepartmentColorService {
  private map: { [dept: string]: string } = {};
  private palette = DEPARTMENT_BASE_PALETTE.slice(); // ← use constant directly

  colorFor(dept: string): string {
    if (this.map[dept]) return this.map[dept];
    const stored = localStorage.getItem('deptColor_' + dept);
    if (stored) { this.map[dept] = stored; return stored; }
    const next = this.palette[Object.keys(this.map).length % this.palette.length];
    this.map[dept] = next;
    localStorage.setItem('deptColor_' + dept, next);
    return next;
  }

  /** optional runtime swap */
  setPalette(palette: string[]) {
    this.palette = (palette && palette.length ? palette : DEPARTMENT_BASE_PALETTE).slice();
  }
}

// ===== Palettes =====
export const CHART_SERIES_PALETTE: string[] = [
    '#C7CC9D', '#AEB3FF', '#DFB78A', '#7D98E2', '#DEBDE0', '#8FE5B7', '#783EC6'
  ];
  
  export const DEPARTMENT_BASE_PALETTE: string[] = [
    '#A39DCD', '#FFF9AE', '#8BB3DF', '#E2C87E', '#BEE0BD', '#E58FBC', '#8DC63F',
    '#8DC63F', '#B5AEA3', '#94AA64', '#F1D5D1', '#BC86B5', '#DA549E', '#AF4F76',
    '#FDB913', '#00A79E', '#C98846', '#BE1E2D'
  ];
  
  // Fixed colors per DataSource (used by arc charts)
  export const DATASOURCE_COLORS: Record<string, string> = {
    MorningDelay: '#A39DCD',
    EndDay: '#FFB74D',
    SetupTime: '#a17ef8'
  };
  
  // ===== Periods / Translations =====
  export const PERIOD_TYPE_MAP: { [key: string]: { label: string; color: string } } = {
    '1-Yesterday':       { label: 'אתמול',   color: '#f86b6b' },
    '2-CurrentMonth':    { label: 'החודש',   color: '#a17ef8' },
    '3-CurrentYear':     { label: 'השנה',    color: '#00b3d7' },
    '4-ParallelsPeriod': { label: 'השוואתי', color: '#fcd74e' }
  };
  
  const DATASOURCE_HE: Record<string, string> = {
    MorningDelay: 'איחור בוקר',
    EndDay: 'אובדן יום',
    SetupTime: 'עודף Setup Time'
  };
  const TIMEFRAME_HE: Record<string, string> = {
    '1-Yesterday': 'אתמול',
    '2-CurrentMonth': 'החודש',
    '3-CurrentYear': 'השנה',
    '4-ParallelsPeriod': 'השוואתי'
  };
  
  export function translateDataSource(key: string): string {
    return DATASOURCE_HE[key] || key;
  }
  export function translateTimeframe(value: string): string {
    return TIMEFRAME_HE[value] || value;
  }
  
  // ===== Time helpers =====
  // NOTE: accepts seconds and renders HH:MM (0-padded minutes)
  export function formatToHHMM(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds as any)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours + ':' + String(minutes).padStart(2, '0');
  }
  
  export function generateHMMTicks(maxValueSeconds: number, stepSeconds: number): Array<{ v: number; f: string }> {
    const out: Array<{ v: number; f: string }> = [];
    if (!isFinite(maxValueSeconds) || maxValueSeconds < 0) return out;
    for (let v = 0; v <= maxValueSeconds; v += stepSeconds) out.push({ v, f: formatToHHMM(v) });
    return out;
  }
  
  // Auto-detect raw unit (seconds vs minutes), then build HH:MM ticks & max view
  export function buildTimeTicksFromRaw(values: number[]) {
    var detectSeconds = function (vals: number[]) {
      if (!vals || !vals.length) return false;
      var max = Math.max.apply(null, vals);
      var manyDiv60 = vals.filter(function (v) { return v % 60 === 0; }).length >= Math.ceil(vals.length * 0.6);
      return max >= 30 * 60 && manyDiv60;
    };
    var niceStep = function (m: number) {
      return m <= 30 ? 5 : m <= 60 ? 10 : m <= 120 ? 15 : m <= 240 ? 30 : m <= 480 ? 60 : 120;
    };
  
    var useSeconds = detectSeconds(values);
    var scale = useSeconds ? 60 : 1; // numeric units per minute
    var mins = values.map(function (v) { return v / scale; });
    var maxMin = Math.max.apply(null, [0].concat(mins));
    var stepMin = niceStep(maxMin || 60);
    var maxRoundedMin = Math.ceil((maxMin || stepMin) / stepMin) * stepMin;
  
    var ticks: { v: number; f: string }[] = [];
    for (var m = 0; m <= maxRoundedMin; m += stepMin) {
      var v = m * scale;
      var h = Math.floor(m / 60), mm = m % 60;
      ticks.push({ v: v, f: String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0') });
    }
    return { ticks: ticks, viewMax: maxRoundedMin * scale };
  }
  
  // ===== Data & columns helpers =====
  export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<K, T[]> {
    const out = {} as Record<K, T[]>;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const k = key(item) as any;
      if (!out[k]) out[k] = [];
      out[k].push(item);
    }
    return out;
  }
  export const num = (v: any): number => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  };
  export const cell = (r: any, i: number) => r && r.c && r.c[i] ? r.c[i].v : undefined;
  
  export interface SoapRow { c: Array<{ v: any }>; }
  export const COLS = { source: 0, dataType: 1, depart: 2, periodDate: 3, value: 4 } as const;
  
  // ===== Options / UI helpers =====
  export function deepMerge(a: any, b: any): any {
    if (!b) return a;
    const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k in b) {
      const v = (b as any)[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k] || {}, v) : v;
    }
    return out;
  }
  
  export const DEFAULT_CHART_AREA = { left: 50, top: 40, right: 20, width: '80%', height: '70%' };
  export const DEFAULT_HAXIS = { slantedText: true, slantedTextAngle: 45 };
  export const DEFAULT_ANNOTATIONS = { alwaysOutside: true, textStyle: { fontSize: 16 } };
  
  export function buildColumnOptions(overrides?: any): any {
    return deepMerge({
      annotations: { alwaysOutside: true, textStyle: { fontSize: 11, color: '#000', auraColor: 'none' } },
      legend: { position: 'bottom' },
      tooltip: { isHtml: true },
      chartArea: deepMerge(DEFAULT_CHART_AREA, { left: 60, top: 60, width: '85%', height: '65%' }),
      height: 400,
      hAxis: deepMerge(DEFAULT_HAXIS, { textStyle: { fontSize: 12 }, showTextEvery: 1, maxAlternation: 1, minTextSpacing: 0 })
    }, overrides || {});
  }
  
  export function setChartTitle(elementId: string, titleHtml: string) {
    const el = document.getElementById(elementId) as HTMLElement;
    if (!el) return;
    el.innerHTML = titleHtml;
    el.style.textAlign = 'center';
    el.style.fontSize = '16px';
    el.style.fontWeight = 'bold';
    el.style.marginBottom = '5px';
  }
  
  export function scaleToRedShades(values: number[]) {
    const maxVal = Math.max.apply(null, [0].concat(values));
    const shades = ['#ffe5e5','#ffcccc','#ffb3b3','#ff9999','#ff8080','#e75858','#f06a6a','#f68383','#f89c9c','#fbb5b5'];
    return function (v: number) {
      if (maxVal === 0) return shades[0];
      const idx = Math.floor(Math.min(1, v / maxVal) * (shades.length - 1));
      return shades[idx];
    };
  }
  
  // Build department drilldown rows + vAxes for both series
  export function buildDeptDrilldown(
    metrics: Array<{ period: string; avg?: number; days?: number }>,
    order: string[]
  ) {
    const avgData: any[][] = [['DataType', 'AvgTime', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]];
    const aggData: any[][] = [['DataType', 'Aggregate Days', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]];
    const raw: number[] = [];
  
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      const m = metrics.find(x => x.period === p);
      const a = m && typeof m.avg === 'number' ? m.avg : 0;
      const d = m && typeof m.days === 'number' ? m.days : 0;
      raw.push(a);
      const label = translateTimeframe(p);
      // For tooltip/annotation we want HH:MM — our formatter expects seconds.
      const hhmm = formatToHHMM(a * 60);
      const tip = 'זמן ממוצע: ' + hhmm + '\nימי אובדן: ' + d;
      avgData.push([label, a, tip, hhmm]);
      aggData.push([label, d, tip, String(d)]);
    }
  
    const ticksInfo = buildTimeTicksFromRaw(raw);
    return {
      avgData,
      aggData,
      vAxisAvg: { ticks: ticksInfo.ticks, viewWindow: { min: 0, max: ticksInfo.viewMax } },
      vAxisAgg: { minValue: 0, format: '0' }
    };
  }
  
  // ===== Simple DOM helper =====
  export function stickyByMarker(stickyId: string, markerId: string) {
    const stickyEl = document.getElementById(stickyId);
    const markerEl = document.getElementById(markerId);
    if (!stickyEl || !markerEl) return;
    const observer = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.isIntersecting) stickyEl.classList.remove('is-sticky');
        else stickyEl.classList.add('is-sticky');
      }
    });
    observer.observe(markerEl);
  }
  
  
  