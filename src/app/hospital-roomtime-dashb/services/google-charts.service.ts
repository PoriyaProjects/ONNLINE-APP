import { Injectable, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { drawHorizontalMultiPeriodChartHelperRoomTime } from 'src/app/shared/drawHorizontalMultiPeriodChartHelperRoomTime';

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
  textOutlineCSS
} from '../../shared/charts-config';

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
  public async drawRoomTimeDualArcCharts(containerIds: { [key: string]: string }): Promise<void> {
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

        drawOverlayDualArcChartHelperRoomTime({
          containerId: containerIds[ds + '_agg'],
          yesterdayValue: yesterday.agg,
          workingDaysInfo: { currentWorkingDayIndex: currentMonth.agg, totalWorkingDays: currentYear.agg || 1 },
          gaugePlanned: plannedMonthAgg,
          gaugeTargetValue: parallelsPerYearAgg,
          gaugeValue: currentYear.agg,
          gaugeTargetStatus: '✅',
          currentMonthValues: [],
          showMarker: true,
          title: dsTitle + ' – ימי אובדן',
          arcColor: arcColor,
          tooltipTableIdPrefix: prefix,
          isTime: false
        });

        drawOverlayDualArcChartHelperRoomTime({
          containerId: containerIds[ds + '_avg'],
          yesterdayValue: yesterday.avg,
          workingDaysInfo: { currentWorkingDayIndex: currentMonth.avg, totalWorkingDays: currentYear.avg || 1 },
          gaugePlanned: plannedMonthAvg,
          gaugeTargetValue: parallelsPerYearAvg,
          gaugeValue: currentYear.avg,
          gaugeTargetStatus: '✅',
          currentMonthValues: [],
          showMarker: true,
          title: dsTitle + ' – זמן אובדן (HH:MM)',
          arcColor: arcColor,
          tooltipTableIdPrefix: prefix,
          isTime: true
        });
      });

    } catch (err) {
      console.error('Error drawing room time dual arc charts:', err);
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
          legend: { position: 'right' },
          annotations: DEFAULT_ANNOTATIONS,
          tooltip: { isHtml: false },
          hAxis: DEFAULT_HAXIS,
          vAxis: isDays
            ? { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(maxValue) + 1 } }
            : { minValue: 0, ticks: generateHMMTicks(maxValue, 1800) },
          chartArea: DEFAULT_CHART_AREA
        };

        setChartTitle(elementId + 'Title',
          translateDataSource(dataSource) + ' - ' + titlePrefix +
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
  
    try {
      // iterate periods safely
      for (const period of Object.keys(elementIdsByPeriod)) {
        const dsMap = elementIdsByPeriod[period];
  
        // pull FRESH themed status colors per draw (so theme switches are reflected)
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
  
        // per datasource table
        for (const dataSource of Object.keys(groupedByDS)) {
          const rows = groupedByDS[dataSource];
          const elementId = (dsMap as any)[dataSource] as string;
          if (!elementId) continue;
  
          const titleContainer = document.getElementById('title_' + elementId) as HTMLElement | null;
          if (titleContainer) {
            titleContainer.innerHTML = translateDataSource(dataSource) + ' - ' + translateTimeframe(period) + ' ';
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
  
          // build department -> year/value map
          const departmentMap: { [dept: string]: { [year: string]: number } } = {};
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
          }
  
          // write rows + THEMED colors
          for (const department of Object.keys(departmentMap)) {
            const yearValues = departmentMap[department];
  
            if (isParallelPeriod) {
              const rowIndex = dt.addRow();
              dt.setCell(rowIndex, 0, department);
  
              for (let i = 0; i < uniqueYears.length; i++) {
                const y = uniqueYears[i];
                const rawValue = yearValues[y] != null ? yearValues[y] : null;
                const formatted = rawValue != null ? formatToHHMM(rawValue) : '';
                const colIndex = i + 1;
  
                if (rawValue != null) {
                  dt.setCell(rowIndex, colIndex, rawValue, formatted);
  
                  // minutes threshold → THEME traffic-light colors
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
              const rowIndex = dt.addRow([department, { v: rawValue, f: formattedValue }]);
  
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
  

  // ========= Tables (Days with heatmap) =========
  // public async drawAllDepartmentTablesSum(
  //   elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
  //   url: string,
  //   excludeCurrentYear: boolean = true
  // ): Promise<void> {
  //   await this.waitUntilChartsReady();
  
  //   try {
  //     // iterate periods safely
  //     for (const period of Object.keys(elementIdsByPeriod)) {
  //       const dsMap = elementIdsByPeriod[period];
  
  //       const raw = await this.fetchWithCache(this.buildUrl(url, { dataType: period }));
  //       const clean = sanitizeSoapResponse(raw);
  
  //       if (!clean || !clean.rows || !clean.rows.length) {
  //         for (const id of Object.values(dsMap) as string[]) {
  //           const container = document.getElementById(id);
  //           if (container) container.innerHTML = 'אין נתונים להצגה';
  //         }
  //         continue;
  //       }
  
  //       // group rows by DataSource
  //       const groupedByDS = groupBy(clean.rows as SoapRow[], (r) =>
  //         String(cell(r, COLS.source) || 'Unknown')
  //       );
  
  //       // per-DataSource table
  //       for (const dataSource of Object.keys(groupedByDS)) {
  //         const rows = groupedByDS[dataSource];
  //         const elementId = (dsMap as any)[dataSource] as string;
  //         if (!elementId) continue;
  
  //         const titleContainer = document.getElementById('title_' + elementId) as HTMLElement | null;
  //         if (titleContainer) {
  //           titleContainer.innerHTML = translateDataSource(dataSource) + ' - ' + translateTimeframe(period);
  //           titleContainer.style.fontWeight = 'bold';
  //           titleContainer.style.fontSize = '16px';
  //           titleContainer.style.textAlign = 'center';
  //           titleContainer.style.margin = '10px 0';
  //         }
  
  //         const container = document.getElementById(elementId);
  //         if (!container) continue;
  
  //         const dt = new google.visualization.DataTable();
  //         dt.addColumn('string', 'מחלקה');
  
  //         const isParallelPeriod = period === '4-ParallelsPeriod';
  //         let uniqueYears: string[] = [];
  
  //         if (isParallelPeriod) {
  //           const currentYear = new Date().getFullYear().toString().substring(2);
  //           const yearSet: { [y: string]: true } = {};
  //           for (let i = 0; i < rows.length; i++) {
  //             const date = cell(rows[i], COLS.periodDate) as string;
  //             if (typeof date === 'string') {
  //               const ym = date.match(/\d{4}/);
  //               if (ym) {
  //                 const y2 = ym[0].substring(2);
  //                 if (!(excludeCurrentYear && y2 === currentYear)) yearSet[y2] = true;
  //               }
  //             }
  //           }
  //           uniqueYears = Object.keys(yearSet).sort((a, b) => Number(b) - Number(a));
  //           for (let i = 0; i < uniqueYears.length; i++) dt.addColumn('number', uniqueYears[i]);
  //         } else {
  //           dt.addColumn('number', 'ימים');
  //         }
  
  //         // build department -> year/value map
  //         const departmentMap: { [dept: string]: { [year: string]: number } } = {};
  //         for (let i = 0; i < rows.length; i++) {
  //           const r = rows[i];
  //           const department = String(cell(r, COLS.depart) || '');
  //           const date = cell(r, COLS.periodDate) as string;
  //           let year = '';
  
  //           if (isParallelPeriod && typeof date === 'string') {
  //             const ym = date.match(/\d{4}/);
  //             if (ym) {
  //               year = ym[0].substring(2);
  //               if (excludeCurrentYear && year === new Date().getFullYear().toString().substring(2)) continue;
  //             }
  //           }
  
  //           const rawValue = num(cell(r, COLS.value));
  //           if (!departmentMap[department]) departmentMap[department] = {};
  //           if (isParallelPeriod && year) departmentMap[department][year] = rawValue;
  //           if (!isParallelPeriod) departmentMap[department]['value'] = rawValue;
  //         }
  
  //         // --- THEME-AWARE HEATMAP ---
  //         // gather all values to compute max (per table)
  //         const allVals: number[] = [];
  //         for (const d of Object.keys(departmentMap)) {
  //           const rec = departmentMap[d];
  //           for (const y of Object.keys(rec)) allVals.push(rec[y]);
  //         }
  //         const maxVal = allVals.length ? Math.max.apply(null, allVals) : 0;
  
  //         // pull FRESH shades from current theme and make a scaler
  //         const shades = this.palette.getTableHeatmap(); // e.g., 10 shades, light→dark
  //         const heat = (value: number) => {
  //           if (maxVal <= 0) return shades[0];
  //           const idx = Math.min(shades.length - 1, Math.floor((value / maxVal) * (shades.length - 1)));
  //           return shades[idx];
  //         };
  
  //         // write rows + themed heat colors
  //         for (const department of Object.keys(departmentMap)) {
  //           const vals = departmentMap[department];
  
  //           if (isParallelPeriod) {
  //             const rowIndex = dt.addRow();
  //             dt.setCell(rowIndex, 0, department);
  
  //             for (let i = 0; i < uniqueYears.length; i++) {
  //               const y = uniqueYears[i];
  //               const rawValue = vals[y] != null ? vals[y] : null;
  //               const formatted = rawValue != null ? Math.round(rawValue) + ' ימים' : '';
  //               const colIndex = i + 1;
  
  //               if (rawValue != null) {
  //                 dt.setCell(rowIndex, colIndex, rawValue, formatted);
  //                 dt.setProperty(rowIndex, colIndex, 'style', 'background-color:' + heat(rawValue) + '; color:#000;');
  //               }
  //             }
  //           } else {
  //             const rawValue = vals['value'] || 0;
  //             const formatted = Math.round(rawValue) + ' ימים';
  //             const rowIndex = dt.addRow([department, { v: rawValue, f: formatted }]);
  //             const rowColor = heat(rawValue);
  //             const fg = readableTextColor(rowColor);
  //             const outline = textOutlineCSS(fg);
  //             for (let col = 0; col < dt.getNumberOfColumns(); col++) {
  //               dt.setProperty(rowIndex, col, 'style', `background-color:${rowColor}; color:${fg}; ${outline}`);
  //             }
  //           }
  //         }
  
  //         new google.visualization.Table(container).draw(dt, {
  //           showRowNumber: false,
  //           width: '100%',
  //           height: '150px',
  //           allowHtml: true
  //         });
  //       }
  //     }
  //   } catch (err) {
  //     console.error('Error drawing all tables:', err);
  //   }
  // }
  

  // import at top of service
// import { readableTextColor, textOutlineCSS } from 'src/app/shared/charts-config';

public async drawAllDepartmentTablesSum(
  elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
  url: string,
  excludeCurrentYear: boolean = true
): Promise<void> {
  await this.waitUntilChartsReady();

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

        // dept -> year/value
        const departmentMap: { [dept: string]: { [year: string]: number } } = {};
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
        }

        // THEME AWARE heat shades per table
        const allVals: number[] = [];
        for (const d of Object.keys(departmentMap)) {
          const rec = departmentMap[d];
          for (const y of Object.keys(rec)) allVals.push(rec[y]);
        }
        const maxVal = allVals.length ? Math.max.apply(null, allVals) : 0;

        const shades = this.palette.getTableHeatmap(); // fresh, from active theme
        const heat = (value: number) => {
          if (maxVal <= 0) return shades[0];
          const idx = Math.min(shades.length - 1, Math.floor((value / maxVal) * (shades.length - 1)));
          return shades[idx];
        };

        // rows
        for (const department of Object.keys(departmentMap)) {
          const vals = departmentMap[department];

          if (isParallelPeriod) {
            const rowIndex = dt.addRow();
            dt.setCell(rowIndex, 0, department);

            for (let i = 0; i < uniqueYears.length; i++) {
              const y = uniqueYears[i];
              const rawValue = vals[y] != null ? vals[y] : null;
              const formatted = rawValue != null ? Math.round(rawValue) + ' ימים' : '';
              const colIndex = i + 1;

              if (rawValue != null) {
                dt.setCell(rowIndex, colIndex, rawValue, formatted);

                // 🔑 compute themed bg + readable fg for EACH cell
                const bg = heat(rawValue);
                const fg = readableTextColor(bg);
                const outline = textOutlineCSS(fg);

                dt.setProperty(
                  rowIndex,
                  colIndex,
                  'style',
                  `background-color:${bg}; color:${fg}; ${outline}`
                );
              }
            }
          } else {
            const rawValue = vals['value'] || 0;
            const formatted = Math.round(rawValue) + ' ימים';
            const rowIndex = dt.addRow([department, { v: rawValue, f: formatted }]);

            const bg = heat(rawValue);               // themed cell bg
            const fg = readableTextColor(bg);        // readable text vs bg
            const outline = textOutlineCSS(fg);      // subtle shadow

            for (let col = 0; col < dt.getNumberOfColumns(); col++) {
              dt.setProperty(
                rowIndex,
                col,
                'style',
                `background-color:${bg}; color:${fg}; ${outline}`
              );
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


  // ========= Totals summaries =========
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
      rows: ['agg', 'avg']
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
      rows: ['agg', 'avg']
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
      legend: { position: 'bottom' },
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

  @HostListener('window:scroll', [])
  onScroll() {
    const el = document.getElementById('stickyTabsFilters');
    if (el) {
      const isSticky = window.scrollY > 100;
      if (isSticky) el.classList.add('is-sticky');
      else el.classList.remove('is-sticky');
    }
  }
}
