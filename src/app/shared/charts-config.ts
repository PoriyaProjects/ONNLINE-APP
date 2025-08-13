import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
// ===== Optional: Department color provider (localStorage aware) =====
@Injectable({ providedIn: 'root' })
export class DepartmentColorService {
    private theme = 'classic';
    private palette: string[] = [];
    private map: { [dept: string]: string } = {};
  
    /** Call when the theme changes */
    setPalette(palette: string[], themeName: string) {
this.theme = themeName || 'classic';
this.palette = (palette && palette.length ? palette : []).slice();
this.map = {}; // reset in-memory map; per-theme persisted keys remain
    }
  
    colorFor(dept: string): string {
if (this.map[dept]) return this.map[dept];
const key = `deptColor_${this.theme}_${dept}`;
const stored = localStorage.getItem(key);
if (stored) { this.map[dept] = stored; return stored; }
const next = this.palette[(Object.keys(this.map).length) % (this.palette.length || 1)] || '#888';
this.map[dept] = next;
localStorage.setItem(key, next);
return next;
    }
  }

// ===== Palettes =====
export const CHART_SERIES_PALETTE: string[] = [
    '#C7CC9D', '#AEB3FF', '#DFB78A', '#7D98E2', '#DEBDE0', '#8FE5B7', '#783EC6'
  ];
  
  export const DEPARTMENT_BASE_PALETTE: string[] = [
    '#A39DCD', '#b9b473', '#8BB3DF', '#E2C87E', '#BEE0BD', '#E58FBC', '#8DC63F',
    '#B5AEA3', '#94AA64', '#F1D5D1', '#BC86B5', '#DA549E', '#AF4F76',
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
    '1-Yesterday': { label: 'אתמול',   color: '#f86b6b' },
    '2-CurrentMonth':    { label: 'החודש',   color: '#a17ef8' },
    '3-CurrentYear':     { label: 'השנה',    color: '#00b3d7' },
    '4-ParallelsPeriod': { label: 'השוואתי', color: '#fcd74e' }
  };
  
  const DATASOURCE_HE: Record<string, string> = {
    MorningDelay: 'איחור בוקר',
    EndDay: 'אובדן סוף יום',
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
const tip = 'ממוצע: ' + hhmm + '\nימי אובדן: ' + d;
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
  
  
// charts-config.ts


/** ---- Theme presets (same as we discussed earlier) ---- */
export interface DashboardPalette {
  name: string;
  series: string[];
  department: string[];
  datasource: { [k: string]: string };
  // optional: theme-specific status colors for tables
  tableStatus?: { good: string; warn: string; bad: string };
  tableHeatmap?: string[]; // light→dark shades for “bad”
}

const THEME_CLASSIC: DashboardPalette = {
  name: 'classic',
  series: ['#C7CC9D','#AEB3FF','#DFB78A','#7D98E2','#DEBDE0','#8FE5B7','#783EC6'],
  department: [
    '#A39DCD','#b9b473','#8BB3DF','#E2C87E','#BEE0BD','#E58FBC','#8DC63F',
    '#B5AEA3','#94AA64','#F1D5D1','#BC86B5','#DA549E','#AF4F76',
    '#FDB913','#00A79E','#C98846','#BE1E2D'
  ],
  datasource: { MorningDelay:'#A39DCD', EndDay:'#FFB74D', SetupTime:'#a17ef8' },
  tableStatus: { good:'#b9f6ca', warn:'#fff9c4', bad:'#ffcdd2' },
  tableHeatmap: ['#ffe5e5','#ffcccc','#ffb3b3','#ff9999','#ff8080','#e75858','#f06a6a','#f68383','#f89c9c','#fbb5b5']
};

const THEME_DARK: DashboardPalette = {
  name: 'dark',
  series: ['#9fc1ff','#7fd1ae','#ffd37f','#a29bfe','#ff9fbf','#7ff0ff','#c3f584'],
  department: ['#3b82f6','#22c55e','#eab308','#ef4444','#a855f7','#06b6d4','#f97316','#84cc16'],
  datasource: { MorningDelay:'#7aa2f7', EndDay:'#e5c07b', SetupTime:'#bb9af7' },
  tableStatus: { good:'#064e3b', warn:'#78350f', bad:'#7f1d1d' }, // darker cells for dark UI
  tableHeatmap: ['#7f1d1d','#991b1b','#b91c1c','#dc2626','#ef4444','#f87171','#fca5a5','#fecaca','#ffe4e6','#fff1f2']
};

const THEME_MONO: DashboardPalette = {
  name: 'mono',
  series: ['#111827','#1f2937','#374151','#4b5563','#6b7280','#9ca3af','#d1d5db'],
  department: ['#0f172a','#1e293b','#334155','#475569','#64748b','#94a3b8','#cbd5e1'],
  datasource: { MorningDelay:'#334155', EndDay:'#64748b', SetupTime:'#94a3b8' },
  tableStatus: { good:'#d1fae5', warn:'#fef9c3', bad:'#fee2e2' },
  tableHeatmap: ['#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a']
};

const THEME_PASTEL: DashboardPalette = {
    name: 'light pastel',
    department: [
'#A3C9F9', // pastel blue
'#F9D6A5', // pastel orange
'#C5E1A5', // pastel green
'#F9A8D4', // pastel pink
'#E6A5F7', // pastel purple
'#F8BBD0', // rose
'#B2DFDB', // teal
'#FFECB3', // butter yellow
'#DCEDC8', // light lime
'#FFE0B2', // light peach
'#D1C4E9', // lavender
'#FFCDD2', // light coral
    ],
    datasource: {  MorningDelay: '#90CAF9', // light blue
  EndDay: '#FFCC80', // light orange
  SetupTime:    '#CE93D8'  // light purple
},
    tableHeatmap: ['#FFF8E1', '#FFF3E0','#FBE9E7','#F3E5F5','#EDE7F6','#E8EAF6','#E0F7FA','#E0F2F1','#E8F5E9','#F1F8E9'  // darkest in this set, still light
    ],
    series: ['#64B5F6', '#81C784', '#FFD54F', '#FF8A65', '#BA68C8', '#4DD0E1', '#A1887F'    ],
    tableStatus: {good: '#C8E6C9',warn: '#FFF9C4',bad:  '#FFCDD2'    }
  };
  
  // charts-config.ts

const HIGH_CONTRAST: DashboardPalette = {
    name: 'high contrast',
  
    // Strong, distinct series for multi-series charts
    series: [
'#000000', // black
'#0052CC', // vivid blue
'#00875A', // strong green
'#C5221F', // google red
'#FF8B00', // deep orange
'#7C3AED', // purple
'#00B8D9'  // cyan
    ],
  
    // Bold rotation for departments (high separation)
    department: [
'#000000', '#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED',
'#0EA5E9', '#16A34A', '#B91C1C', '#F59E0B', '#2563EB', '#10B981',
'#EA580C', '#E11D48', '#4F46E5', '#14B8A6', '#A21CAF', '#111827'
    ],
  
    // DataSource colors (kept distinct and high-contrast)
    datasource: {
MorningDelay: '#0052CC', // vivid blue
EndDay: '#FF8B00', // deep orange
SetupTime:    '#7C3AED'  // purple
    },
  
    // Time-table status cells: dark backgrounds to ensure strong contrast
    // (readableTextColor will choose white text automatically)
    tableStatus: {
good: '#065F46', // emerald-900
warn: '#7C2D12', // amber-900
bad:  '#7F1D1D'  // red-900
    },
  
    // Heatmap (light -> dark red), ending in a very dark shade for maximum contrast
    tableHeatmap: [
'#FFF5F5', '#FFE3E3', '#FFC9C9', '#FFA8A8', '#FF8787',
'#FF6B6B', '#FA5252', '#F03E3E', '#C92A2A', '#7F1D1D'
    ]
  };
  

const THEMES: DashboardPalette[] = [THEME_CLASSIC, THEME_DARK, THEME_MONO, THEME_PASTEL, HIGH_CONTRAST];

@Injectable({ providedIn: 'root' })
export class PaletteService {
  private current: DashboardPalette;

  constructor() {
    const saved = localStorage.getItem('dashboard_theme');
    this.current = THEMES.find(t => t.name === saved) || THEME_CLASSIC;
  }

  get name() { return this.current.name; }
  list() { return THEMES.map(t => t.name); }
  setTheme(name: string) {
    const next = THEMES.find(t => t.name === name);
    if (!next) return;
    this.current = next;
    localStorage.setItem('dashboard_theme', next.name);
  }

  getSeriesPalette()     { return this.current.series.slice(); }
  getDepartmentPalette() { return this.current.department.slice(); }
  getDatasourceColors()  { return { ...this.current.datasource }; }
  getTableStatus() { return this.current.tableStatus || THEME_CLASSIC.tableStatus!; }
  getTableHeatmap(){ return (this.current.tableHeatmap || THEME_CLASSIC.tableHeatmap!).slice(); }
}

/** Department colors that vary by THEME (namespaced keys in localStorage) */



/** Status colors for tables (per theme) */
export function getStatusColors(palette: PaletteService) {
  return palette.getTableStatus(); // {good, warn, bad}
}

/** Heatmap scale for “bad” (per theme) */
export function getHeatmapScale(palette: PaletteService) {
  const shades = palette.getTableHeatmap(); // 10 shades
  return (value: number, max: number) => {
    if (!max || max <= 0) return shades[0];
    const idx = Math.min(shades.length - 1, Math.floor((value / max) * (shades.length - 1)));
    return shades[idx];
  };
}

/** Parse '#rrggbb' to rgb (0–255) */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }
  
  /** WCAG relative luminance (0..1) */
  export function relLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
    const toLin = (c: number) => {
const s = c / 255;
return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const R = toLin(r), G = toLin(g), B = toLin(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  
  /** Contrast ratio between two luminances (L1 ≥ L2) */
  export function contrastRatio(L1: number, L2: number): number {
    const [a, b] = L1 >= L2 ? [L1, L2] : [L2, L1];
    return (a + 0.05) / (b + 0.05);
  }
  
  /** Pick readable text color (#000/#fff) against bg; target ≥ 4.5:1 */
  export function readableTextColor(bgHex: string, light = '#ffffff', dark = '#000000', min = 4.5): string {
    const rgb = hexToRgb(bgHex);
    if (!rgb) return dark;
    const Lbg = relLuminance(rgb);
    const Ldark = 0.0;  // luminance(#000)
    const Llight = 1.0; // luminance(#fff)
    const cDark = contrastRatio(Lbg, Ldark);
    const cLight = contrastRatio(Lbg, Llight);
    // Prefer the one that meets min; otherwise pick the higher contrast
    if (cDark >= min && cLight >= min) return cDark >= cLight ? dark : light;
    if (cDark >= min) return dark;
    if (cLight >= min) return light;
    return cDark >= cLight ? dark : light;
  }
  
  /** Optional: add subtle outline to improve legibility on extremes */
  export function textOutlineCSS(fg: string): string {
    // Use opposite outline (if fg is white, outline dark; if black, outline light)
    const isLight = fg.toLowerCase() === '#ffffff' || fg.toLowerCase() === 'white';
    const shadow = isLight ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.35)';
    return `text-shadow: 0 0 1px ${shadow}, 0 0 2px ${shadow};`;
  }