import { Injectable, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { drawOverlayArcChartHelperRoomTime } from 'src/app/shared/ArcChartHelperRoomTime';
import { Subject } from 'rxjs';


import {
  CHART_SERIES_PALETTE,
  PERIOD_TYPE_MAP,
  DATASOURCE_COLORS,
  translateDataSource,
  translateTimeframe,
  formatToHHMM,
  generateHMMTicks,
  buildTimeTicksFromRaw,
  groupBy, num, cell, COLS, SoapRow,
  deepMerge,
  setChartTitle,
  scaleToRedShades,
  DEFAULT_CHART_AREA, DEFAULT_HAXIS, DEFAULT_ANNOTATIONS, 
  getHeatmapScale, getStatusColors, PaletteService,
  readableTextColor,
  textOutlineCSS,
  buildColumnOptions,
} from '../../shared/charts-config';
import { drawHorizontalMultiPeriodChartHelperRoomTime } from 'src/app/shared/drawHorizontalMultiPeriodChartHelperRoomTime';
import { RoomData, Surgery } from '../google-charts/google-charts.component';
import { map } from 'rxjs/operators';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  private cache = new Map<string, any>();
  private chartsReadySubject = new ReplaySubject<void>(1);
  public chartsReady$: Observable<void>;

  constructor(private http: HttpClient, private palette: PaletteService) {
    this.chartsReady$ = this.chartsReadySubject.asObservable();
    google.charts.load('current', { packages: ['corechart', 'table', 'treemap'] });
    google.charts.setOnLoadCallback(() => {
      this.chartsReadySubject.next();
      this.chartsReadySubject.complete();
    });
  }

  // Public fetchers (used by component)
  getAggregateData(dataType: string) {
    return this.http.get(
      `${environment.url}/GetRoomAggregateDaysD?dataType=${encodeURIComponent(dataType)}`,
      { responseType: 'text' as const }
    );
  }
  getAverageData(dataType: string) {
    return this.http.get(
      `${environment.url}/GetRoomTimeAvgD?dataType=${encodeURIComponent(dataType)}`,
      { responseType: 'text' as const }
    );
  }




getSurgeryRooms(date: string) {
  return this.http.get<{ date: string; surgeries: any[] }>(
    `${environment.url}/GetSurgeryRoomsByDate?date=${encodeURIComponent(date)}`
  );
}

  /** Clear cache */
  public clearCache(): void { this.cache.clear(); }

  /** Wait for charts */
  public async waitUntilChartsReady(): Promise<void> {
    return new Promise(resolve => this.chartsReady$.subscribe(() => resolve()));
  }

  /** Build URL */
  private buildUrl(base: string, params: { [k: string]: any }) {
    const search = new URLSearchParams();
    for (const key in params) if (params[key] != null) search.set(key, params[key]);
    return `${base}?${search.toString()}`;
  }

  /** Fetch API with caching */
  private async fetchWithCache(url: string): Promise<any> {
    if (this.cache.has(url)) return this.cache.get(url);
    const raw = await this.http.get(url, { responseType: 'text' }).toPromise();
    this.cache.set(url, raw);
    return raw;
  }

  // ========= Arc Charts =========
  public async drawRoomTimeArcCharts(containerIds: { [key: string]: string }): Promise<void> {
    try {
      const raw = await this.fetchWithCache(`${environment.url}/GetRoomTimeSummaryAllSeparated`);
      const clean = sanitizeSoapResponse(raw);
      if (!clean || !clean.rows || !clean.rows.length) {
        for (const id of Object.values(containerIds)) {
          const el = document.getElementById(id);
          if (el) el.innerHTML = 'אין נתונים להצגה';
        }
        return;
      }

      const dsColors = this.palette.getDatasourceColors();

      const grouped: {
        [ds: string]: {
          [type: string]: {
            agg: number; avg: number;
            aggDepts: { name: string; value: number }[];
            avgDepts: { name: string; value: number }[];
          }
        }
      } = {};

      (clean.rows as SoapRow[]).forEach(r => {
        const ds = cell(r, COLS.source) || 'Unknown';
        const type = cell(r, COLS.dataType) || 'Unknown';
        const depart = cell(r, COLS.depart) || '';
        const agg = num((r as any)?.c?.[4]?.v);
        const avg = num((r as any)?.c?.[5]?.v);
        if (!grouped[ds]) grouped[ds] = {};
        if (!grouped[ds][type]) grouped[ds][type] = { agg: 0, avg: 0, aggDepts: [], avgDepts: [] };
        grouped[ds][type].agg += agg;
        grouped[ds][type].avg += avg;
        if (agg > 0) grouped[ds][type].aggDepts.push({ name: depart, value: agg });
        if (avg > 0) grouped[ds][type].avgDepts.push({ name: depart, value: avg });
      });

      ['MorningDelay', 'EndDay', 'SetupTime'].forEach(ds => {
        const dsData = grouped[ds] || {};
        const yesterday = dsData['1-Yesterday'] || { agg: 0, avg: 0 };
        const currentMonth = dsData['2-CurrentMonth'] || { agg: 0, avg: 0 };
        const currentYear = dsData['3-CurrentYear'] || { agg: 0, avg: 0 };
        const parallels = dsData['4-ParallelsPeriod'] || { agg: 0, avg: 0 };

        const plannedMonthAgg = currentYear.agg;
        const plannedMonthAvg = currentYear.avg;

        const parallelsPerYearAgg = parallels.agg;
        const parallelsPerYearAvg = parallels.avg;

        const dsTitle = translateDataSource(ds);
        const dsColors = this.palette.getDatasourceColors();
        const arcColor = dsColors[ds] || this.palette.getSeriesPalette()[0];
        const prefix = `table${ds}_`;

        // AGG (number)
drawOverlayArcChartHelperRoomTime({
  containerId: containerIds[ds + '_agg'],
  yesterdayValue: yesterday.agg,
  isTime: false,
  title: dsTitle + ' – ימי אובדן',
  arcColor: arcColor,
  tooltipTableIdPrefix: prefix,
  // optional:
  // tooltipPeriod: '1-Yesterday',
  // radius: 50,
});

// AVG (time in seconds → HH:MM)
drawOverlayArcChartHelperRoomTime({
  containerId: containerIds[ds + '_avg'],
  yesterdayValue: yesterday.avg,
  isTime: true,
  title: dsTitle + ' ממוצע',
  arcColor: arcColor,
  tooltipTableIdPrefix: prefix,
  // optional:
  // tooltipPeriod: '1-Yesterday',
  // radius: 50,
});

      });

    } catch (err) {
      console.error('Error drawing room time arc charts:', err);
    }
  }

  // ========= Department Charts (colored bars) =========
  public async drawDepartmentChartsWithColors(
    elementIds: { [key: string]: string },
    url: string,
    dataType: string,
    titlePrefix: string,
    colorFn: (department: string) => string,
    isDays: boolean
  ): Promise<void> {
    await this.waitUntilChartsReady();

    try {
      const raw = await this.fetchWithCache(this.buildUrl(url, { dataType: dataType }));
      const clean = sanitizeSoapResponse(raw);
      if (!clean || !clean.rows || !clean.rows.length) {
        for (const id of Object.values(elementIds)) {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        }
        return;
      }

      const groupedRows = groupBy(clean.rows as SoapRow[], function (r) {
        return (cell(r, COLS.source) || 'Unknown') as string;
      });

      for (const dataSource in groupedRows) {
        const rows = groupedRows[dataSource];
        const elementId = (elementIds as any)[dataSource];
        if (!elementId) continue;
        const containerEl = document.getElementById(elementId);
        if (!containerEl) continue;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Department');
        dt.addColumn('number', 'Value');
        dt.addColumn({ type: 'string', role: 'style' });
        dt.addColumn({ type: 'string', role: 'annotation' });
        dt.addColumn({ type: 'string', role: 'tooltip' });

        let maxValue = 0;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const baseDepartment = (cell(r, COLS.depart) || '') as string;
          const periodDate: any = cell(r, COLS.periodDate);
          const rawValue = num(cell(r, COLS.value));
          let displayDepartment = baseDepartment;

          if (dataType === '4-ParallelsPeriod' && periodDate) {
            const yearSuffix = new Date(periodDate).getFullYear().toString().slice(-2);
            displayDepartment = baseDepartment + ' - ' + yearSuffix;
          }

          const color = colorFn(baseDepartment);
          if (rawValue > maxValue) maxValue = rawValue;

          const annotation = isDays ? String(rawValue.toFixed(0)) : formatToHHMM(rawValue);
          const tooltip = isDays ? rawValue.toFixed(1) + ' ימים' : formatToHHMM(rawValue);

          dt.addRow([displayDepartment, rawValue, 'color: ' + color, annotation, tooltip]);
        }

        const options: any = {
          height: 560,
          bar: { groupWidth: '65%' },
          //legend: { position: 'right' },
          annotations: DEFAULT_ANNOTATIONS,
          tooltip: { isHtml: false },
          hAxis: DEFAULT_HAXIS,
          vAxis: isDays
            ? { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(maxValue) + 1 } }
            : { minValue: 0, ticks: generateHMMTicks(maxValue, 1800) },
          chartArea: DEFAULT_CHART_AREA
        };

        setChartTitle(elementId + 'Title',
          translateDataSource(dataSource) + '' + titlePrefix +
          '<br><span style="font-size:12px">' + translateTimeframe(dataType) + ' ' + (isDays ? 'בימים' : 'ב-(HH:MM)') + '</span>'
        );

        new google.visualization.ColumnChart(containerEl).draw(dt, options);
      }
    } catch (err) {
      console.error('Error drawing charts:', err);
    }
  }

  // ========= Tables (Avg time) =========
  public async drawAllDepartmentTables(
  elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
  url: string,
  excludeCurrentYear: boolean = true
): Promise<void> {
  await this.waitUntilChartsReady();

  // helpers
  const isSetupDS = (ds: string) => /setup\s*time/i.test(String(ds || ''));
  const getQ = (r: any): number => {
    // Q is the last column in the row structure
    const cells = r?.cells ?? r?.c ?? r;
    if (Array.isArray(cells) && cells.length) {
      const last = cells[cells.length - 1];
      const v = last?.v ?? last?.value ?? last;
      const n = Number(v);
      return isFinite(n) ? n : 0;
    }
    // fall back to helper if your code exposes one:
    try {
      const v = (window as any)?.cell ? (window as any).cell(r, 9999) : null;
      const n = Number(v);
      return isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  try {
    for (const period of Object.keys(elementIdsByPeriod)) {
      const dsMap = elementIdsByPeriod[period];
      const status = this.palette.getTableStatus(); // { good, warn, bad }

      const raw = await this.fetchWithCache(this.buildUrl(url, { dataType: period }));
      const clean = sanitizeSoapResponse(raw);

      if (!clean || !clean.rows || !clean.rows.length) {
        for (const id of Object.values(dsMap) as string[]) {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        }
        continue;
      }

      // group rows by DataSource
      const groupedByDS = groupBy(clean.rows as SoapRow[], (r) =>
        String(cell(r, COLS.source) || 'Unknown')
      );

      // per datasource
      for (const dataSource of Object.keys(groupedByDS)) {
        const rows = groupedByDS[dataSource];
        const elementId = (dsMap as any)[dataSource] as string;
        if (!elementId) continue;

        // title
        const titleContainer = document.getElementById('title_' + elementId) as HTMLElement | null;
        if (titleContainer) {
          titleContainer.innerHTML =
            translateDataSource(dataSource) + ' - ' + translateTimeframe(period) + ' ';
          titleContainer.style.fontWeight = 'bold';
          titleContainer.style.fontSize = '16px';
          titleContainer.style.textAlign = 'center';
          titleContainer.style.margin = '10px 0';
        }

        const container = document.getElementById(elementId);
        if (!container) continue;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'מחלקה');

        const isParallelPeriod = period === '4-ParallelsPeriod';
        let uniqueYears: string[] = [];

        if (isParallelPeriod) {
          const currentYear = new Date().getFullYear().toString().substring(2);
          const yearSet: { [y: string]: true } = {};
          for (let i = 0; i < rows.length; i++) {
            const date = cell(rows[i], COLS.periodDate) as string;
            if (typeof date === 'string') {
              const match = date.match(/\d{4}/);
              if (match) {
                const y2 = match[0].substring(2);
                if (!(excludeCurrentYear && y2 === currentYear)) yearSet[y2] = true;
              }
            }
          }
          uniqueYears = Object.keys(yearSet).sort((a, b) => Number(b) - Number(a));
          for (let i = 0; i < uniqueYears.length; i++) {
            dt.addColumn('number', uniqueYears[i]);
          }
        } else {
          dt.addColumn('number', 'זמן');
        }

        // build department -> year/value map AND sum Q per department (SetupTime only)
        const departmentMap: { [dept: string]: { [year: string]: number } } = {};
        const qSumByDept: { [dept: string]: number } = {};

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const department = String(cell(r, COLS.depart) || '');
          const date = cell(r, COLS.periodDate) as string;
          let year = '';

          if (isParallelPeriod && typeof date === 'string') {
            const ym = date.match(/\d{4}/);
            if (ym) {
              year = ym[0].substring(2);
              if (excludeCurrentYear && year === new Date().getFullYear().toString().substring(2)) {
                continue;
              }
            }
          }

          const rawValue = num(cell(r, COLS.value));
          if (!departmentMap[department]) departmentMap[department] = {};
          if (isParallelPeriod && year) departmentMap[department][year] = rawValue;
          if (!isParallelPeriod) departmentMap[department]['value'] = rawValue;

          // Q: only for SetupTime
          if (isSetupDS(dataSource)) {
            const q = getQ(r);
            if (isFinite(q)) {
              qSumByDept[department] = (qSumByDept[department] || 0) + q;
            }
          }
        }

        // write rows with existing color logic; label may include (Q) for SetupTime if Q>0
        for (const department of Object.keys(departmentMap)) {
          const yearValues = departmentMap[department];

          const totalQ = qSumByDept[department] ?? 0;
          const showQ = isSetupDS(dataSource) && totalQ > 0;
          const deptWithQ = showQ ? `${department} (${Math.round(totalQ)})` : department;

          if (isParallelPeriod) {
            const rowIndex = dt.addRow();
            dt.setCell(rowIndex, 0, deptWithQ);

            for (let i = 0; i < uniqueYears.length; i++) {
              const y = uniqueYears[i];
              const rawValue = yearValues[y] != null ? yearValues[y] : null;
              const formatted = rawValue != null ? formatToHHMM(rawValue) : '';
              const colIndex = i + 1;

              if (rawValue != null) {
                dt.setCell(rowIndex, colIndex, rawValue, formatted);

                // THEMED traffic-light colors by minutes thresholds
                const minutes = rawValue / 60;
                const cellColor = minutes >= 60 ? status.bad : minutes > 30 ? status.warn : status.good;
                const fg = readableTextColor(cellColor);
                const outline = textOutlineCSS(fg);
                dt.setProperty(rowIndex, colIndex, 'style', `background-color:${cellColor}; color:${fg}; ${outline}`);
              }
            }
          } else {
            const rawValue = yearValues['value'] || 0;
            const formattedValue = formatToHHMM(rawValue);
            const rowIndex = dt.addRow([deptWithQ, { v: rawValue, f: formattedValue }]);

            const minutes = rawValue / 60;
            let rowColor = status.good;
            if (minutes > 30 && minutes <= 59) rowColor = status.warn;
            if (minutes >= 60) rowColor = status.bad;

            const fg = readableTextColor(rowColor);
            const outline = textOutlineCSS(fg);
            for (let col = 0; col < dt.getNumberOfColumns(); col++) {
              dt.setProperty(rowIndex, col, 'style', `background-color:${rowColor}; color:${fg}; ${outline}`);
            }
          }
        }

        new google.visualization.Table(container).draw(dt, {
          showRowNumber: false,
          width: '100%',
          height: '150px',
          allowHtml: true
        });
      }
    }
  } catch (err) {
    console.error('Error drawing all tables:', err);
  }
}



  public async drawAllDepartmentTablesSum(
  elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
  url: string,
  excludeCurrentYear: boolean = true
): Promise<void> {
  await this.waitUntilChartsReady();

  // helpers
  const isSetupDS = (ds: string) => /setup\s*time/i.test(String(ds || ''));
  const getQ = (r: any): number => {
    // Q is the last column in the SOAP/Google Charts row
    const cells = r?.cells ?? r?.c ?? r;
    if (Array.isArray(cells) && cells.length) {
      const last = cells[cells.length - 1];
      const v = last?.v ?? last?.value ?? last;
      const n = Number(v);
      return isFinite(n) ? n : 0;
    }
    try {
      // fallback if you have a helper available
      const v = (window as any)?.cell ? (window as any).cell(r, 9999) : null;
      const n = Number(v);
      return isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  try {
    for (const period of Object.keys(elementIdsByPeriod)) {
      const dsMap = elementIdsByPeriod[period];

      const raw = await this.fetchWithCache(this.buildUrl(url, { dataType: period }));
      const clean = sanitizeSoapResponse(raw);

      if (!clean || !clean.rows || !clean.rows.length) {
        for (const id of Object.values(dsMap) as string[]) {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        }
        continue;
      }

      const groupedByDS = groupBy(clean.rows as SoapRow[], (r) =>
        String(cell(r, COLS.source) || 'Unknown')
      );

      for (const dataSource of Object.keys(groupedByDS)) {
        const rows = groupedByDS[dataSource];
        const elementId = (dsMap as any)[dataSource] as string;
        if (!elementId) continue;

        const titleContainer = document.getElementById('title_' + elementId) as HTMLElement | null;
        if (titleContainer) {
          titleContainer.innerHTML = translateDataSource(dataSource) + ' - ' + translateTimeframe(period);
          titleContainer.style.fontWeight = 'bold';
          titleContainer.style.fontSize = '16px';
          titleContainer.style.textAlign = 'center';
          titleContainer.style.margin = '10px 0';
        }

        const container = document.getElementById(elementId);
        if (!container) continue;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'מחלקה');

        const isParallelPeriod = period === '4-ParallelsPeriod';
        let uniqueYears: string[] = [];

        if (isParallelPeriod) {
          const currentYear = new Date().getFullYear().toString().substring(2);
          const yearSet: { [y: string]: true } = {};
          for (let i = 0; i < rows.length; i++) {
            const date = cell(rows[i], COLS.periodDate) as string;
            if (typeof date === 'string') {
              const ym = date.match(/\d{4}/);
              if (ym) {
                const y2 = ym[0].substring(2);
                if (!(excludeCurrentYear && y2 === currentYear)) yearSet[y2] = true;
              }
            }
          }
          uniqueYears = Object.keys(yearSet).sort((a, b) => Number(b) - Number(a));
          for (let i = 0; i < uniqueYears.length; i++) dt.addColumn('number', uniqueYears[i]);
        } else {
          dt.addColumn('number', 'ימים');
        }

        // dept -> year/value AND sum Q per dept (SetupTime only)
        const departmentMap: { [dept: string]: { [year: string]: number } } = {};
        const qSumByDept: { [dept: string]: number } = {};

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const department = String(cell(r, COLS.depart) || '');
          const date = cell(r, COLS.periodDate) as string;
          let year = '';

          if (isParallelPeriod && typeof date === 'string') {
            const ym = date.match(/\d{4}/);
            if (ym) {
              year = ym[0].substring(2);
              if (excludeCurrentYear && year === new Date().getFullYear().toString().substring(2)) continue;
            }
          }

          const rawValue = num(cell(r, COLS.value));
          if (!departmentMap[department]) departmentMap[department] = {};
          if (isParallelPeriod && year) departmentMap[department][year] = rawValue;
          if (!isParallelPeriod) departmentMap[department]['value'] = rawValue;

          // Q aggregation only for SetupTime
          if (isSetupDS(dataSource)) {
            const q = getQ(r);
            if (isFinite(q)) qSumByDept[department] = (qSumByDept[department] || 0) + q;
          }
        }

        // THEME AWARE heat shades per table
        const allVals: number[] = [];
        for (const d of Object.keys(departmentMap)) {
          const rec = departmentMap[d];
          for (const y of Object.keys(rec)) allVals.push(rec[y]);
        }
        const maxVal = allVals.length ? Math.max.apply(null, allVals) : 0;

        const shades = this.palette.getTableHeatmap(); // from active theme
        const heat = (value: number) => {
          if (maxVal <= 0) return shades[0];
          const idx = Math.min(shades.length - 1, Math.floor((value / maxVal) * (shades.length - 1)));
          return shades[idx];
        };

        // rows
        for (const department of Object.keys(departmentMap)) {
          const vals = departmentMap[department];

          const totalQ = qSumByDept[department] ?? 0;
          const showQ = isSetupDS(dataSource) && totalQ > 0;
          const deptWithQ = showQ ? `${department} (${Math.round(totalQ)})` : department;

          if (isParallelPeriod) {
            const rowIndex = dt.addRow();
            dt.setCell(rowIndex, 0, deptWithQ);

            for (let i = 0; i < uniqueYears.length; i++) {
              const y = uniqueYears[i];
              const rawValue = vals[y] != null ? vals[y] : null;
              const formatted = rawValue != null ? Math.round(rawValue) + ' ימים' : '';
              const colIndex = i + 1;

              if (rawValue != null) {
                dt.setCell(rowIndex, colIndex, rawValue, formatted);

                // themed bg + readable fg per cell
                const bg = heat(rawValue);
                const fg = readableTextColor(bg);
                const outline = textOutlineCSS(fg);

                dt.setProperty(rowIndex, colIndex, 'style', `background-color:${bg}; color:${fg}; ${outline}`);
              }
            }
          } else {
            const rawValue = vals['value'] || 0;
            const formatted = Math.round(rawValue) + ' ימים';
            const rowIndex = dt.addRow([deptWithQ, { v: rawValue, f: formatted }]);

            const bg = heat(rawValue);
            const fg = readableTextColor(bg);
            const outline = textOutlineCSS(fg);

            for (let col = 0; col < dt.getNumberOfColumns(); col++) {
              dt.setProperty(rowIndex, col, 'style', `background-color:${bg}; color:${fg}; ${outline}`);
            }
          }
        }

        new google.visualization.Table(container).draw(dt, {
          showRowNumber: false,
          width: '100%',
          height: '150px',
          allowHtml: true
        });
      }
    }
  } catch (err) {
    console.error('Error drawing all tables:', err);
  }
}

  
  public async drawSummarizedMultiPeriodChart(
    containerId: string,
    avgUrl: string,
    aggUrl: string,
    _color: string
  ): Promise<void> {
    await this.waitUntilChartsReady();

    const periods = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];

    const toNum = function (v: any) { const n = Number(v || 0); return isFinite(n) ? n : 0; };
    const fmt = function (min: number) {
      const r = Math.round(min), h = Math.floor(r / 60), m = r % 60;
      return h + ':' + String(m).padStart(2, '0');
    };

    const avgOfComponents = function (rows: any[]) {
      const buckets: any = { SetupTime: [], EndDay: [], MorningDelay: [] };
      for (let i = 0; i < (rows || []).length; i++) {
        const r = rows[i], src = r?.c?.[0]?.v as string, val = toNum(r?.c?.[4]?.v);
        if (buckets[src]) buckets[src].push(val);
      }
      const avgRaw = {
        SetupTime: buckets.SetupTime.length ? buckets.SetupTime.reduce((a: number, b: number) => a + b, 0) / buckets.SetupTime.length : 0,
        EndDay: buckets.EndDay.length ? buckets.EndDay.reduce((a: number, b: number) => a + b, 0) / buckets.EndDay.length : 0,
        MorningDelay: buckets.MorningDelay.length ? buckets.MorningDelay.reduce((a: number, b: number) => a + b, 0) / buckets.MorningDelay.length : 0
      };
      const avgRounded = { SetupTime: Math.floor(avgRaw.SetupTime), EndDay: Math.floor(avgRaw.EndDay), MorningDelay: Math.floor(avgRaw.MorningDelay) };
      return avgRounded.SetupTime + avgRounded.EndDay + avgRounded.MorningDelay;
    };

    const sumTotals = function (rows: any[]) {
      const vals = (rows || []).map(r => toNum(r?.c?.[4]?.v));
      return vals.reduce((a, b) => a + b, 0);
    };

    const firstLineData: any = {};
    const secondLineData: any = {};

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const url = this.buildUrl(avgUrl, { dataType: p });
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
      firstLineData[p] = avgOfComponents(rows);
    }

    for (let i = 1; i < periods.length; i++) {
      const p = periods[i];
      const url = this.buildUrl(aggUrl, { dataType: p });
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
      secondLineData[p] = sumTotals(rows);
    }

    drawHorizontalMultiPeriodChartHelperRoomTime({
      containerId: containerId,
      title: 'אובדן חדרי ניתוח – סיכום תקופות',
      data: {
        yesterdayAvg: firstLineData['1-Yesterday'],
        monthAvg:     firstLineData['2-CurrentMonth'],
        yearAvg:      firstLineData['3-CurrentYear'],
        parallelAvg:  firstLineData['4-ParallelsPeriod'],
        monthAgg:     secondLineData['2-CurrentMonth'],
        yearAgg:      secondLineData['3-CurrentYear'],
        parallelAgg:  secondLineData['4-ParallelsPeriod']
      },
      colors: this.palette.getSeriesPalette(),
      rows: ['avg', 'agg']
    });
  }

  
  public async drawSummarizedMultiPeriodChartForDepartment(
    containerId: string,
    avgUrl: string,
    aggUrl: string,
    deptColor: string,
    departName: string,
    opts?: { deptParamKey?: string; matchDept?: (rowName: string, wanted: string) => boolean }
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    // periods order
    const periods: Array<'1-Yesterday' | '2-CurrentMonth' | '3-CurrentYear' | '4-ParallelsPeriod'> =
      ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
  
    const deptKey = (opts && opts.deptParamKey) || 'departName';
    const matchDept = (opts && opts.matchDept) || function (rowName: string, wanted: string) { return rowName === wanted; };
  
    const toNum = function (v: any) { const n = Number(v || 0); return isFinite(n) ? n : 0; };
  
    // sum of component averages (rounded down to minute) for this department
    const computeSumOfComponentAverages = function (rows: any[]) {
      const buckets: { [k: string]: number[] } = { SetupTime: [], EndDay: [], MorningDelay: [] };
      for (let i = 0; i < (rows || []).length; i++) {
        const r = rows[i];
        const dep = r && r.c && r.c[COLS.depart] ? r.c[COLS.depart].v as string : '';
        if (!matchDept(dep || '', departName)) continue;
        const src = r && r.c && r.c[COLS.source] ? r.c[COLS.source].v as string : '';
        const val = toNum(r && r.c && r.c[COLS.value] ? r.c[COLS.value].v : 0);
        if (buckets[src]) buckets[src].push(val);
      }
      const avgRaw = {
        SetupTime: buckets.SetupTime.length ? buckets.SetupTime.reduce((a, b) => a + b, 0) / buckets.SetupTime.length : 0,
        EndDay: buckets.EndDay.length ? buckets.EndDay.reduce((a, b) => a + b, 0) / buckets.EndDay.length : 0,
        MorningDelay: buckets.MorningDelay.length ? buckets.MorningDelay.reduce((a, b) => a + b, 0) / buckets.MorningDelay.length : 0
      };
      const avgRounded = {
        SetupTime: Math.floor(avgRaw.SetupTime),
        EndDay: Math.floor(avgRaw.EndDay),
        MorningDelay: Math.floor(avgRaw.MorningDelay)
      };
      return avgRounded.SetupTime + avgRounded.EndDay + avgRounded.MorningDelay;
    };
  
    // sum totals (minutes) for this department
    const computeSumLoss = function (rows: any[]) {
      const values: number[] = [];
      for (let i = 0; i < (rows || []).length; i++) {
        const r = rows[i];
        const dep = r && r.c && r.c[COLS.depart] ? r.c[COLS.depart].v as string : '';
        if (matchDept(dep || '', departName)) {
          values.push(toNum(r && r.c && r.c[COLS.value] ? r.c[COLS.value].v : 0));
        }
      }
      return values.reduce((a, b) => a + b, 0);
    };
  
    const first: { [k: string]: number } = {};   // sum of component averages per period
    const second: { [k: string]: number } = {};  // sum totals per period
  
    // build first line (component averages)
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const params: any = {}; params['dataType'] = p; params[deptKey] = departName;
      const raw = await this.fetchWithCache(this.buildUrl(avgUrl, params));
      const clean = sanitizeSoapResponse(raw);
      first[p] = computeSumOfComponentAverages(Array.isArray(clean && clean.rows) ? clean.rows : []);
    }
  
    // build second line (totals) – skip Yesterday as before
    for (let i = 1; i < periods.length; i++) {
      const p = periods[i];
      const params: any = {}; params['dataType'] = p; params[deptKey] = departName;
      const raw = await this.fetchWithCache(this.buildUrl(aggUrl, params));
      const clean = sanitizeSoapResponse(raw);
      second[p] = computeSumLoss(Array.isArray(clean && clean.rows) ? clean.rows : []);
    }
  
    // THEME: bars use department color; the rest come from the active series palette
    const seriesPalette = this.palette.getSeriesPalette(); // inject PaletteService in the service ctor
    const colors = [deptColor].concat(seriesPalette);
  
    drawHorizontalMultiPeriodChartHelperRoomTime({
      containerId: containerId,
      title: 'אובדן חדרי ניתוח – סיכום תקופות (' + departName + ')',
      data: {
        // First line: sum of (rounded) component averages
        yesterdayAvg: first['1-Yesterday'],
        monthAvg:     first['2-CurrentMonth'],
        yearAvg:      first['3-CurrentYear'],
        parallelAvg:  first['4-ParallelsPeriod'],
        // Second line: totals SUM
        monthAgg:     second['2-CurrentMonth'],
        yearAgg:      second['3-CurrentYear'],
        parallelAgg:  second['4-ParallelsPeriod']
      },
      colors: colors,
      rows: ['avg', 'agg']
    });
  }
  
  
  drawDepartmentChart(config: {
    containerId: string;
    data: any[][];
    chartTitle?: string;
    chartType?: 'ColumnChart' | 'ComboChart' | 'BarChart';
    color?: string;
    options?: any;
  }): void {
    const el = document.getElementById(config.containerId);
    if (!el || !(window as any).google?.visualization) return;

    const dt = new google.visualization.arrayToDataTable(config.data);

    const base: any = {
      title: config.chartTitle || '',
      height: 400,
      legend: 'none', //{ position: 'bottom' },
      tooltip: { isHtml: true },
      colors: config.color ? [config.color] : undefined
    };

    const opts = deepMerge(base, config.options || {});
    const Ctor =
      config.chartType === 'ComboChart' ? google.visualization.ComboChart :
      config.chartType === 'BarChart'   ? google.visualization.BarChart   :
                                          google.visualization.ColumnChart;

    new Ctor(el).draw(dt, opts);
  }

  // @HostListener('window:scroll', [])
  // onScroll() {
  //   const el = document.getElementById('stickyTabsFilters');
  //   if (el) {
  //     const isSticky = window.scrollY > 100;
  //     if (isSticky) el.classList.add('is-sticky');
  //     else el.classList.remove('is-sticky');
  //   }
  // }


  @HostListener('window:scroll', [])
onScroll() {
  const stickyEl = document.getElementById('stickyTabsFilters');
  const deptTabsEl = document.querySelector('.department-tabs') as HTMLElement;

  if (!stickyEl || !deptTabsEl) return;

  // Calculate the scroll threshold: top position of .department-tabs
  const deptTabsTop = deptTabsEl.getBoundingClientRect().top + window.scrollY;

  const isSticky = window.scrollY >= deptTabsTop;
  stickyEl.classList.toggle('is-sticky', isSticky);
}




public async drawSetupTimeQCharts(
  elementIdsByPeriod: { [period: string]: string }, // period -> chart div id
  url: string,
  excludeCurrentYear: boolean = true
): Promise<void> {
  await this.waitUntilChartsReady();

  // ---- helpers (Angular 9 safe) ----
  var isSetupDS = function (ds: string): boolean {
    return /setup\s*time/i.test(String(ds || ''));
  };
  var getQ = function (r: any): number {
    var cells = (r && (r.cells || r.c)) || r;
    if (cells && cells.length && cells instanceof Array) {
      var last = cells[cells.length - 1];
      var v: any = (last && typeof last === 'object') ? (('v' in last) ? last.v : (last as any).value) : last;
      var n = Number(v);
      return isFinite(n) ? n : 0;
    }
    return 0;
  };

  // ---- pull colors from DashboardPalette FIRST ----
  // Expected shape (adapt if needed):
  //   getDashboardPalette() => { series: string[], datasources: { [key: string]: string } }
  var dash = (this.palette && (this.palette as any).getDashboardPalette)
    ? (this.palette as any).getDashboardPalette()
    : null;

  var seriesPalette = (dash && dash.series && dash.series.length)
    ? dash.series
    : ((this.palette && (this.palette as any).getSeriesPalette)
        ? (this.palette as any).getSeriesPalette()
        : ['#999', '#777', '#555', '#333', '#111']);

  // robust single-series color for SetupTime (DASHBOARD-DRIVEN)
  var pickSetupColor = function(): string {
    if (dash && dash.datasources && (dash.datasources as any)['SetupTime']) return (dash.datasources as any)['SetupTime'];
    if (dash && dash.series && dash.series.length) return dash.series[0];
    if (this && (this as any).palette && (this as any).palette.getDataSourceColor) {
      return (this as any).palette.getDataSourceColor('SetupTime');
    }
    if (seriesPalette && seriesPalette.length) return seriesPalette[0];
    return '#777';
  }.bind(this);

  for (var period in elementIdsByPeriod) {
    if (!elementIdsByPeriod.hasOwnProperty(period)) continue;

    var chartElId = elementIdsByPeriod[period];
    var titleEl = document.getElementById('title_' + chartElId);
    var chartEl = document.getElementById(chartElId);
    if (!chartEl) continue;

    // fetch + sanitize
    var raw = await this.fetchWithCache(this.buildUrl(url, { dataType: period }));
    var clean = sanitizeSoapResponse(raw);
    if (!clean || !clean.rows || !clean.rows.length) { chartEl.innerHTML = 'אין נתונים להצגה'; continue; }

    // filter SetupTime rows (DataSource at col 0)
    var setupRows: any[] = [];
    for (var i = 0; i < clean.rows.length; i++) {
      var rr: any = clean.rows[i];
      var cells0 = rr && (rr.cells || rr.c);
      var ds = '';
      if (cells0 && cells0.length) {
        var c0 = cells0[0];
        ds = String((c0 && typeof c0 === 'object') ? (('v' in c0) ? c0.v : c0.value || '') : (c0 || ''));
      }
      if (isSetupDS(ds)) setupRows.push(rr);
    }
    if (!setupRows.length) { chartEl.innerHTML = 'אין נתונים להצגה'; continue; }

    // aggregate Q
    var byDept: { [dept: string]: number } = {};
    var byDeptYear: { [dept: string]: { [yy: string]: number } } = {};
    var currYY = new Date().getFullYear().toString().substring(2);

    for (var j = 0; j < setupRows.length; j++) {
      var r = setupRows[j];
      var dept = String(cell(r, COLS.depart) || '');
      var q = getQ(r);
      var date = String(cell(r, COLS.periodDate) || '');
      var m = date.match(/\d{4}/);
      var yy = m ? m[0].substring(2) : '';

      if (period === '4-ParallelsPeriod') {
        if (excludeCurrentYear && yy === currYY) continue;
        if (!byDeptYear[dept]) byDeptYear[dept] = {};
        byDeptYear[dept][yy] = (byDeptYear[dept][yy] || 0) + q;
      } else {
        byDept[dept] = (byDept[dept] || 0) + q;
      }
    }

    var title = 'ספירת מקרים ' + translateDataSource('SetupTime') + ' - ' + translateTimeframe(period);

    // ========= Parallels (multi-years) =========
    if (period === '4-ParallelsPeriod') {
      var yearsSeen: { [yy: string]: true } = {};
      for (var deptKey in byDeptYear) {
        if (!byDeptYear.hasOwnProperty(deptKey)) continue;
        var perYear = byDeptYear[deptKey];
        for (var yyKey in perYear) if (perYear.hasOwnProperty(yyKey)) yearsSeen[yyKey] = true;
      }
      var years = Object.keys(yearsSeen).sort(function (a, b) { return Number(b) - Number(a); });
      if (!years.length) { chartEl.innerHTML = 'אין נתונים להצגה'; continue; }

      var dt = new google.visualization.DataTable();
      dt.addColumn('string', 'מחלקה');
      for (var yi = 0; yi < years.length; yi++) dt.addColumn('number', "'" + years[yi]);

      var anyRow = false;
      for (var dept2 in byDeptYear) {
        if (!byDeptYear.hasOwnProperty(dept2)) continue;
        var perYear2 = byDeptYear[dept2];
        var rowArr: any[] = [dept2];
        var nonZero = false;
        for (var yi2 = 0; yi2 < years.length; yi2++) {
          var y = years[yi2];
          var vnum = (perYear2 && perYear2[y] != null) ? perYear2[y] : 0;
          if (vnum > 0) nonZero = true;
          rowArr.push(vnum);
        }
        if (nonZero) { dt.addRow(rowArr); anyRow = true; }
      }
      if (!anyRow) { chartEl.innerHTML = 'אין נתונים להצגה'; continue; }

      // annotations
      var view = new google.visualization.DataView(dt);
      var cols: any[] = [0];
      for (var s = 0; s < years.length; s++) (function (seriesCol: number) {
        cols.push(seriesCol);
        cols.push({
          calc: function (dtAny: any, rowIdx: number) {
            var vv = dtAny.getValue(rowIdx, seriesCol);
            return (vv != null && vv !== 0) ? String(vv) : null;
          },
          type: 'string',
          role: 'annotation'
        });
      })(s + 1);
      view.setColumns(cols);

      // dashboard palette for multi-series
      var multiColors = seriesPalette.slice(0, years.length);

      var options = buildColumnOptions({
        //title: title,
        legend: { position: 'top' },
        hAxis: { slantedText: true },
        vAxis: { minValue: 0 },
        annotations: { alwaysOutside: true, textStyle: { fontSize: 12, bold: true } },
        bar: { groupWidth: '70%' },
        animation: { duration: 300, easing: 'out' }
      });
      // enforce dashboard colors AFTER buildColumnOptions
      options.colors = multiColors;
      var seriesMap: any = {};
      for (var si = 0; si < multiColors.length; si++) seriesMap[si] = { color: multiColors[si] };
      options.series = seriesMap;

      var chart = new google.visualization.ColumnChart(chartEl);
      chart.draw(view, options);

      if (titleEl) {
        titleEl.innerHTML = title;
        (titleEl as HTMLElement).style.fontWeight = 'bold';
        (titleEl as HTMLElement).style.fontSize = '16px';
        (titleEl as HTMLElement).style.textAlign = 'center';
        (titleEl as HTMLElement).style.margin = '10px 0';
      }
      continue;
    }

    // ========= Single period (month / year) — DASHBOARD COLOR =========
    var dt2 = new google.visualization.DataTable();
    dt2.addColumn('string', 'מחלקה');
    dt2.addColumn('number', 'כמות מקרים (Q)');

    var deptKeys = Object.keys(byDept).sort(function (a, b) { return (byDept[b] || 0) - (byDept[a] || 0); });
    var anyRow2 = false;
    for (var dk = 0; dk < deptKeys.length; dk++) {
      var dname = deptKeys[dk];
      var qval = byDept[dname] || 0;
      if (qval > 0) { dt2.addRow([dname, qval]); anyRow2 = true; }
    }
    if (!anyRow2) { chartEl.innerHTML = 'אין נתונים להצגה'; continue; }

    var view2 = new google.visualization.DataView(dt2);
    view2.setColumns([
      0, 1,
      { calc: function (dtAny: any, rowIdx: number) {
          var vv = dtAny.getValue(rowIdx, 1);
          return (vv != null && vv !== 0) ? String(vv) : null;
        }, type: 'string', role: 'annotation' }
    ]);

    // PICK COLOR STRICTLY FROM DASHBOARD
    var setupColor = pickSetupColor();

    var options2 = buildColumnOptions({
      //title: title,
      legend: 'none',
      hAxis: { slantedText: true },
      vAxis: { minValue: 0 },
      annotations: { alwaysOutside: true, textStyle: { fontSize: 12, bold: true } },
      bar: { groupWidth: '70%' },
      animation: { duration: 300, easing: 'out' },
      tooltip: { isHtml: true }
    });

    // enforce DashboardPalette color AFTER buildColumnOptions (both colors & series)
    options2.colors = [setupColor];
    options2.series = { 0: { color: setupColor } };

    var chart2 = new google.visualization.ColumnChart(chartEl);
    chart2.draw(view2, options2);

    if (titleEl) {
      titleEl.innerHTML = title;
      (titleEl as HTMLElement).style.fontWeight = 'bold';
      (titleEl as HTMLElement).style.fontSize = '16px';
      (titleEl as HTMLElement).style.textAlign = 'center';
      (titleEl as HTMLElement).style.margin = '10px 0';
    }
  }
}




private ackAllRoomsSubject = new Subject<void>();
  public ackAllRooms$ = this.ackAllRoomsSubject.asObservable();

  /** Triggers acknowledge-all for listeners (e.g., room components). */
  public triggerAcknowledgeAllRooms(): void {
    this.ackAllRoomsSubject.next();
  }



}
