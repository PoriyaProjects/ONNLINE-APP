import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';
import { sanitizeSoapResponse } from '../../shared/sanitizesoapresponce';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { environment } from 'src/environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  private cache = new Map<string, any>();
  private chartsReadySubject = new ReplaySubject<void>(1);
  public chartsReady$: Observable<void>;

  /** Fixed colors for chart items */
  private readonly CHART_COLORS = ['#6ba1f8', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8', '#5ed175'];

  /** Map period types to Hebrew labels & colors */
  private readonly PERIOD_TYPE_MAP: { [key: string]: { label: string; color: string } } = {
    '1-Yesterday': { label: 'אתמול', color: '#f86b6b' },
    '2-CurrentMonth': { label: 'החודש', color: '#a17ef8' },
    '3-CurrentYear': { label: 'השנה', color: '#00b3d7' },
    '4-ParallelsPeriod': { label: 'השתקד', color: '#fcd74e' }
  };

  constructor(private http: HttpClient) {
    this.chartsReady$ = this.chartsReadySubject.asObservable();
    google.charts.load('current', { packages: ['corechart', 'table', 'treemap'] });
    google.charts.setOnLoadCallback(() => {
      this.chartsReadySubject.next();
      this.chartsReadySubject.complete();
    });
  }

  /** Clear cache */
  public clearCache(): void {
    this.cache.clear();
  }

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

  /** Convert seconds to HH:MM */
  private formatToHHMM(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /** Generate axis ticks with HH:MM formatting */
  private generateHMMTicks(maxValue: number, step: number = 3600): any[] {
    const ticks = [];
    for (let i = 0; i <= maxValue; i += step) {
      ticks.push({ v: i, f: this.formatToHHMM(i) });
    }
    return ticks;
  }



  /**
   * Draw multiple charts grouped by DataSource
   */
  public async drawGroupedRoomTimeCharts(
    elementIds: { [key: string]: string },
    url: string,
    dparam: string,
    titlePrefix: string,
    valueIndex: number,
    filterDataType?: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
    const raw = await this.fetchWithCache(this.buildUrl(url, { dparam }));
    const clean = sanitizeSoapResponse(raw);
  
    if (!clean || !clean.rows?.length) return;
  
    const filteredRows = filterDataType
      ? clean.rows.filter((r: any) => r.c[1]?.v === filterDataType)
      : clean.rows;
  }

  public async drawDepartmentCharts(
    elementIds: { [key: string]: string },
    url: string,
    dataType: string,
    titlePrefix: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const raw = await this.fetchWithCache(this.buildUrl(url, { dataType }));
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        Object.values(elementIds).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      // Group by DataSource
      const grouped: { [key: string]: any[] } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        if (!grouped[ds]) grouped[ds] = [];
        grouped[ds].push(r);
      });
  
      for (const [dataSource, rows] of Object.entries(grouped)) {
        const elementId = elementIds[dataSource];
        if (!elementId) continue;
        const container = document.getElementById(elementId);
        if (!container) continue;
  
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Department');
        dt.addColumn('number', 'Value');
        dt.addColumn({ type: 'string', role: 'style' });
        dt.addColumn({ type: 'string', role: 'annotation' });
  
        let maxValue = 0;
        rows.forEach(r => {
          const department = r.c[2]?.v || '';
          const value = r.c[3]?.v ?? 0;
          maxValue = Math.max(maxValue, value);
          dt.addRow([department, Number(value), 'color: #6ba1f8', this.formatToHHMM(Number(value))]);
        });
  
        const options = {
          title: `${titlePrefix} - ${dataSource}`,
          height: 400,
          bar: { groupWidth: '65%' },
          annotations: { alwaysOutside: true, textStyle: { fontSize: 13 } },
          hAxis: { slantedText: true, slantedTextAngle: 45 },
          vAxis: { minValue: 0, ticks: this.generateHMMTicks(maxValue, 1800) },
          legend: { position: 'none' }
        };
  
        new google.visualization.ColumnChart(container).draw(dt, options);
      }
    } catch (err) {
      console.error('Error drawing charts:', err);
    }
  }

  

  public async drawDepartmentChartsWithColors(
    elementIds: { [key: string]: string },
    url: string,
    dataType: string,
    titlePrefix: string,
    colorFn: (department: string) => string,
    isDays: boolean = false // NEW: controls formatting
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const raw = await this.fetchWithCache(this.buildUrl(url, { dataType }));
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        Object.values(elementIds).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      // Group by DataSource
      const grouped: { [key: string]: any[] } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        if (!grouped[ds]) grouped[ds] = [];
        grouped[ds].push(r);
      });
  
      for (const [dataSource, rows] of Object.entries(grouped)) {
        const elementId = elementIds[dataSource];
        if (!elementId) continue;
        const container = document.getElementById(elementId);
        if (!container) continue;
  
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Department');
        dt.addColumn('number', 'Value');
        dt.addColumn({ type: 'string', role: 'style' });
        dt.addColumn({ type: 'string', role: 'annotation' });
  
        let maxValue = 0;       
        // });
        rows.forEach(r => {
          const baseDepartment = r.c[2]?.v || '';
          const periodDate = r.c[3]?.v || '';
          const rawValue = Number(r.c[4]?.v ?? 0);
        
          // Displayed label: append year for ParallelsPeriod
          let displayDepartment = baseDepartment;
          if (dataType === '4-ParallelsPeriod' && periodDate) {
            const yearSuffix = new Date(periodDate).getFullYear().toString().slice(-2);
            displayDepartment = `${baseDepartment} - ${yearSuffix}`;
          }
        
          const color = colorFn(baseDepartment); // <--- use base name for color mapping
          maxValue = Math.max(maxValue, rawValue);
        
          const annotation = isDays 
            ? rawValue.toFixed(1)
            : this.formatToHHMM(rawValue);
        
          dt.addRow([displayDepartment, rawValue, `color: ${color}`, annotation]);
        });
        
        
        
            const options = {
            title: '', // remove default title`${titlePrefix} - ${dataSource}`,
            height: 560,
            bar: { groupWidth: '65%' },
            legend: { position: 'right' },
            annotations: { alwaysOutside: true, textStyle: { fontSize: 16 } },
            hAxis: { slantedText: true, slantedTextAngle: 45 },
            vAxis: isDays 
              //? { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(Math.max(...rowValues.slice(1))) + 1 } }
              ? { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(maxValue) + 1 } }
              //: { minValue: 0, ticks: this.generateHMMTicks(Math.max(...rowValues.slice(1)), 1800) },
              : { minValue: 0, ticks: this.generateHMMTicks(maxValue, 1800) },
            //colors,
            titleTextStyle: {
              alignment: 'start',     // Aligns text to the right
              fontSize: 16,
              bold: true,
              direction: 'rtl'
            },
            chartArea: { left: 50, top: 40, right: 20, width: '80%', height: '70%' } // Adjusts padding
          };


   // Set title separately
const titleContainer = document.getElementById(`${elementId}Title`);
if (titleContainer) {
  const timeframe = this.translateTimeframe(dataType); // << added
  titleContainer.innerText = `${titlePrefix} - ${this.translateDataSource(dataSource)} (${timeframe})`;
  titleContainer.style.textAlign = 'center';
  titleContainer.style.fontSize = '16px';
  titleContainer.style.fontWeight = 'bold';
  titleContainer.style.marginBottom = '5px';
}


    // Draw chart inside the chart container (no more wiping out the title)
    const chartContainer = document.getElementById(elementId);
    if (chartContainer) {
      new google.visualization.ColumnChart(chartContainer).draw(dt, options);
    }



        new google.visualization.ColumnChart(container).draw(dt, options);
      }
    } catch (err) {
      console.error('Error drawing charts:', err);
    }
  }
  


  private translateDataSource(key: string): string {
    const map: { [key: string]: string } = {
      MorningDelay: 'איחור בוקר',
      EndDay: 'אובדן יום',
      SetupTime: 'עודף Setup Time'
    };
    return map[key] || key; // fallback to original if no translation found
  }

  private translateTimeframe(value: string): string {
    const map: { [key: string]: string } = {
      '1-Yesterday': 'אתמול',
      '2-CurrentMonth': 'החודש',
      '3-CurrentYear': 'השנה',
      '4-ParallelsPeriod': 'השוואתי'
    };
    return map[value] || value;
  }
  

  public async drawCombinedBarChartsByPeriod(
    elementIdsAvg: { [period: string]: string },
    elementIdsAgg: { [period: string]: string },
    url: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        Object.values({ ...elementIdsAvg, ...elementIdsAgg }).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      // --- Fixed order & colors ---
      const order = ['MorningDelay', 'EndDay', 'SetupTime'];
      const colorMap: { [key: string]: string } = {
        MorningDelay: '#f86b6b',
        EndDay: '#fcd74e',
        SetupTime: '#6ba1f8'
      };
  
      // --- Grouping ---
      const groupedAvg: { [period: string]: { [ds: string]: number } } = {};
      const groupedAgg: { [period: string]: { [ds: string]: number } } = {};
  
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        const period = r.c[1]?.v || 'Unknown';
        const agg = Number(r.c[4]?.v ?? 0);
        const avg = Number(r.c[5]?.v ?? 0);
  
        if (!groupedAvg[period]) groupedAvg[period] = {};
        if (!groupedAgg[period]) groupedAgg[period] = {};
  
        groupedAvg[period][ds] = (groupedAvg[period][ds] || 0) + avg;
        groupedAgg[period][ds] = (groupedAgg[period][ds] || 0) + agg;
      });
  
      // --- Helper: build chart ---
      const buildChart = (
        containerId: string,
        values: { [ds: string]: number },
        isAvg: boolean,
        title: string,
        maxFormatter: (val: number) => any
      ) => {
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'DataSource');
        dt.addColumn('number', isAvg ? 'AvgTime' : 'AggregateDays');
        dt.addColumn({ type: 'string', role: 'annotation' });
        dt.addColumn({ type: 'string', role: 'style' });
  
        let maxValue = 0;
        order.forEach(ds => {
          const val = values[ds] || 0;
          maxValue = Math.max(maxValue, val);
          const label = this.translateDataSource(ds);
          const annotation = isAvg ? this.formatToHHMM(val) : val.toFixed(1);
          dt.addRow([label, val, annotation, `color: ${colorMap[ds] || '#6ba1f8'}`]);
        });
  
        const options = {
          title,
          height: 400,
          legend: { position: 'none' },
          bar: { groupWidth: '65%' },
          annotations: { alwaysOutside: true, textStyle: { fontSize: 13, bold: true } },
          vAxis: isAvg
            ? { minValue: 0, ticks: this.generateHMMTicks(maxValue, 1800) }
            : { minValue: 0, format: '0.0' },
          hAxis: { slantedText: true, slantedTextAngle: 45 }
        };
  
        const container = document.getElementById(containerId);
        if (container) new google.visualization.ColumnChart(container).draw(dt, options);
      };
  
      // --- Draw AvgTime charts ---
      for (const [period, dsValues] of Object.entries(groupedAvg)) {
        const title = `${this.translateTimeframe(period)} - זמן ממוצע (HH:MM)`;
        buildChart(elementIdsAvg[period], dsValues, true, title, this.formatToHHMM);
      }
  
      // --- Draw AggregateDays charts ---
      for (const [period, dsValues] of Object.entries(groupedAgg)) {
        const title = `${this.translateTimeframe(period)} - ימי אובדן`;
        buildChart(elementIdsAgg[period], dsValues, false, title, val => val.toFixed(1));
      }
  
    } catch (err) {
      console.error('Error drawing charts:', err);
    }
  }
  
  
  
  public async drawRoomTimeDualArcCharts(containerIds: { [key: string]: string }): Promise<void> {
    try {
      const raw = await this.fetchWithCache(`${environment.url}/GetRoomTimeSummaryAllSeparated`);
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        Object.values(containerIds).forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      const grouped: { [ds: string]: { [type: string]: { agg: number; avg: number } } } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        const type = r.c[1]?.v || 'Unknown';
        const agg = Number(r.c[4]?.v ?? 0);
        const avg = Number(r.c[5]?.v ?? 0);
        if (!grouped[ds]) grouped[ds] = {};
        grouped[ds][type] = { agg, avg };
      });
  
      console.group("Grouped Raw Data");
      console.log(grouped);
      console.groupEnd();
  
      // Hebrew mapping for DataSource & DataType
      const dataSourceHebrew: { [key: string]: string } = {
        MorningDelay: 'איחור בוקר',
        EndDay: 'סוף יום',
        SetupTime: 'זמן Setup'
      };
      const dataTypeHebrew: { [key: string]: string } = {
        '1-Yesterday': 'אתמול',
        '2-CurrentMonth': 'החודש',
        '3-CurrentYear': 'השנה',
        '4-ParallelsPeriod': 'השוואתי'
      };
  
      // Fixed colors per DataSource
      const dataSourceColors: { [key: string]: string } = {
        MorningDelay: '#6ba1f8',
        EndDay: '#f86b6b',
        SetupTime: '#a17ef8'
      };
  
      const dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];
  
      dataSources.forEach(ds => {
        const dsData = grouped[ds] || {};
        const yesterday = dsData['1-Yesterday'] || { agg: 0, avg: 0 };
        const currentMonth = dsData['2-CurrentMonth'] || { agg: 0, avg: 0 };
        const currentYear = dsData['3-CurrentYear'] || { agg: 0, avg: 0 };
        const parallels = dsData['4-ParallelsPeriod'] || { agg: 0, avg: 0 };
  
        const yearsInPeriod = 1; // adjust if Parallels covers multiple years
  
        // Middle arc (CurrentMonth vs CurrentYear/12) – currently just using full value
        const plannedMonthAgg = currentYear.agg;
        const plannedMonthAvg = currentYear.avg;
  
        // Outer arc (CurrentYear vs Parallels/year count)
        const parallelsPerYearAgg = parallels.agg / yearsInPeriod;
        const parallelsPerYearAvg = parallels.avg / yearsInPeriod;
  
        const dsTitle = dataSourceHebrew[ds] || ds;
        const yearTitle = dataTypeHebrew['3-CurrentYear'] || 'השנה';
        const arcColor = dataSourceColors[ds] || '#6ba1f8';
        const prefix = `table${ds}_`; // e.g., "tableMorningDelay_"
  
        // === Debugging values for each chart
        console.group(`Debug for ${dsTitle}`);
        console.log("CurrentMonth:", currentMonth);
        console.log("CurrentYear:", currentYear);
        console.log("ParallelsPeriod:", parallels);
        console.log("PlannedMonthAgg:", plannedMonthAgg);
        console.log("PlannedMonthAvg:", plannedMonthAvg);
        console.log("ParallelsPerYearAgg:", parallelsPerYearAgg);
        console.log("ParallelsPerYearAvg:", parallelsPerYearAvg);
        console.log("tooltipTableIdPrefix:", prefix);
        
        console.groupEnd();
  
        // === AggregateDays Chart ===
        console.log(`Drawing AGG chart for ${dsTitle}`, {
          gaugePlanned: plannedMonthAgg,
          gaugeTargetValue: parallelsPerYearAgg,
          gaugeValue: currentYear.agg, prefix
          
        });
  
        drawOverlayDualArcChartHelperRoomTime({
          containerId: containerIds[`${ds}_agg`],
          yesterdayValue: yesterday.agg, // Semi-circle value
          workingDaysInfo: { currentWorkingDayIndex: currentMonth.agg, totalWorkingDays: currentYear.agg || 1 }, 
          gaugePlanned: plannedMonthAgg,
          gaugeTargetValue: parallelsPerYearAgg,
          gaugeValue: currentYear.agg,
          gaugeTargetStatus: '✅',
          currentMonthValues: [],
          showMarker: true,
          title: `${dsTitle} – ימי אובדן`,
          arcColor: arcColor,
          tooltipTableIdPrefix: prefix,
          isTime: false
        });
        
        drawOverlayDualArcChartHelperRoomTime({
          containerId: containerIds[`${ds}_avg`],
          yesterdayValue: yesterday.avg, // Semi-circle value
          workingDaysInfo: { currentWorkingDayIndex: currentMonth.avg, totalWorkingDays: currentYear.avg || 1 }, 
          gaugePlanned: plannedMonthAvg,
          gaugeTargetValue: parallelsPerYearAvg,
          gaugeValue: currentYear.avg,
          gaugeTargetStatus: '✅',
          currentMonthValues: [],
          showMarker: true,
          title: `${dsTitle} – זמן אובדן (HH:MM)`,
          arcColor: arcColor,
          //tooltipTableId: 'myTable',
          //tableMorningDelay_1-Yesterday
          tooltipTableIdPrefix: prefix,
          isTime: true
        });
        
        
      });
  
    } catch (err) {
      console.error('Error drawing room time dual arc charts:', err);
    }
  }
  
  // public async drawGroupedComparisonCharts(
  //   elementIdsAgg: { [key: string]: string },
  //   elementIdsAvg: { [key: string]: string },
  //   url: string
  // ): Promise<void> {
  //   await this.waitUntilChartsReady();
  
  //   try {
  //     const raw = await this.fetchWithCache(url);
  //     const clean = sanitizeSoapResponse(raw);
  
  //     if (!clean || !clean.rows?.length) {
  //       Object.values({ ...elementIdsAgg, ...elementIdsAvg }).forEach(id => {
  //         const container = document.getElementById(id);
  //         if (container) container.innerHTML = 'אין נתונים להצגה';
  //       });
  //       return;
  //     }
  
  //     // --- Fixed order ---
  //     const dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];
  //     const periods = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
  
  //     // Hebrew mappings
  //     const dsHebrew: { [k: string]: string } = {
  //       MorningDelay: 'איחור בוקר',
  //       EndDay: 'סוף יום',
  //       SetupTime: 'זמן Setup'
  //     };
  //     const periodHebrew: { [k: string]: string } = {
  //       '1-Yesterday': 'אתמול',
  //       '2-CurrentMonth': 'החודש',
  //       '3-CurrentYear': 'השנה',
  //       '4-ParallelsPeriod': 'השוואתי'
  //     };
  
  //     // Colors per DataSource
  //     const colorMap: { [key: string]: string } = {
  //       MorningDelay: '#6ba1f8',
  //       EndDay: '#f86b6b',
  //       SetupTime: '#a17ef8'
  //     };
  
  //     // --- Group by DataSource & Period ---
  //     const grouped: { [ds: string]: { [period: string]: { agg: number; avg: number } } } = {};
  //     clean.rows.forEach((r: any) => {
  //       const ds = r.c[0]?.v || 'Unknown';
  //       const period = r.c[1]?.v || 'Unknown';
  //       const agg = Number(r.c[4]?.v ?? 0);
  //       const avg = Number(r.c[5]?.v ?? 0);
  //       if (!grouped[ds]) grouped[ds] = {};
  //       grouped[ds][period] = { agg, avg };
  //     });
  
  //     // === Build DataTable ===
  //     const buildDataTable = (isAvg: boolean) => {
  //       const dt = new google.visualization.DataTable();
  //       dt.addColumn('string', 'תקופה');
  //       dataSources.forEach(ds => {
  //         dt.addColumn('number', dsHebrew[ds]);
  //         dt.addColumn({ type: 'string', role: 'annotation' });
  //         dt.addColumn({ type: 'string', role: 'style' });
  //       });
  
  //       let maxValue = 0;
  //       periods.forEach(period => {
  //         const row: any[] = [periodHebrew[period]];
  
  //         dataSources.forEach(ds => {
  //           const val = grouped[ds]?.[period]?.[isAvg ? 'avg' : 'agg'] || 0;
  //           maxValue = Math.max(maxValue, val);
  //           const annotation = isAvg ? this.formatToHHMM(val) : val.toFixed(1);
  //           row.push(val, annotation, `color: ${colorMap[ds]}`);
  //         });
  
  //         dt.addRow(row);
  //       });
  
  //       return { dt, maxValue };
  //     };
  
  //     // === Aggregate Chart ===
  //     const { dt: dtAgg, maxValue: maxAgg } = buildDataTable(false);
  //     const optionsAgg = {
  //       title: 'השוואת ימי אובדן לפי תקופות',
  //       height: 500,
  //       isStacked: false,
  //       legend: { position: 'top', textStyle: { fontSize: 14 } },
  //       annotations: { alwaysOutside: true, textStyle: { fontSize: 12, bold: true } },
  //       vAxis: { minValue: 0, format: '0.0' },
  //       hAxis: { slantedText: false },
  //       chartArea: { left: 60, top: 60, right: 20, width: '80%', height: '70%' }
  //     };
  //     const containerAgg = document.getElementById(elementIdsAgg['default']);
  //     if (containerAgg) new google.visualization.ColumnChart(containerAgg).draw(dtAgg, optionsAgg);
  
  //     // === Average Chart ===
  //     const { dt: dtAvg, maxValue: maxAvg } = buildDataTable(true);
  //     const optionsAvg = {
  //       title: 'השוואת זמן אובדן (HH:MM) לפי תקופות',
  //       height: 500,
  //       isStacked: false,
  //       legend: { position: 'top', textStyle: { fontSize: 14 } },
  //       annotations: { alwaysOutside: true, textStyle: { fontSize: 12, bold: true } },
  //       vAxis: { minValue: 0, ticks: this.generateHMMTicks(maxAvg, 1800) },
  //       hAxis: { slantedText: false },
  //       chartArea: { left: 60, top: 60, right: 20, width: '80%', height: '70%' },
  //       tooltip: { isHtml: true }
  //     };
  //     const containerAvg = document.getElementById(elementIdsAvg['default']);
  //     if (containerAvg) new google.visualization.ColumnChart(containerAvg).draw(dtAvg, optionsAvg);
  
  //   } catch (err) {
  //     console.error('Error drawing grouped comparison charts:', err);
  //   }
  // }
  
  public async drawGroupedComparisonChartsByType(
    elementIdsAgg: { [period: string]: string },
    elementIdsAvg: { [period: string]: string },
    url: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        Object.values({ ...elementIdsAgg, ...elementIdsAvg }).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      // --- Fixed order & colors ---
      const dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];
      const periods = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
  
      const dsHebrew: { [k: string]: string } = {
        MorningDelay: 'איחור בוקר',
        EndDay: 'סוף יום',
        SetupTime: 'זמן Setup'
      };
      const periodHebrew: { [k: string]: string } = {
        '1-Yesterday': 'אתמול',
        '2-CurrentMonth': 'החודש',
        '3-CurrentYear': 'השנה',
        '4-ParallelsPeriod': 'השוואתי'
      };
  
      const colorMap: { [key: string]: string } = {
        MorningDelay: '#6ba1f8',
        EndDay: '#f86b6b',
        SetupTime: '#a17ef8'
      };
  
      // --- Group by DataType -> DataSource ---
      const grouped: { [period: string]: { [ds: string]: { agg: number; avg: number } } } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        const period = r.c[1]?.v || 'Unknown';
        const agg = Number(r.c[4]?.v ?? 0);
        const avg = Number(r.c[5]?.v ?? 0);
        if (!grouped[period]) grouped[period] = {};
        grouped[period][ds] = { agg, avg };
      });
  
      // --- Build DataTable with tooltips ---
      const buildDataTable = (isAvg: boolean) => {
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'תקופה');
        dataSources.forEach(ds => {
          dt.addColumn('number', dsHebrew[ds]);                // value
          dt.addColumn({ type: 'string', role: 'annotation' }); // annotation (on bar)
          dt.addColumn({ type: 'string', role: 'style' });      // bar color
          dt.addColumn({ type: 'string', role: 'tooltip' });    // tooltip (formatted only)
        });
  
        const rows: any[] = [];
        let maxValue = 0;
  
        periods.forEach(period => {
          const row: any[] = [periodHebrew[period]];
          dataSources.forEach(ds => {
            const val = grouped[period]?.[ds]?.[isAvg ? 'avg' : 'agg'] || 0;
            maxValue = Math.max(maxValue, val);
            const formatted = isAvg ? this.formatToHHMM(val) : val.toFixed(1);
            row.push(val, formatted, `color: ${colorMap[ds]}`, formatted); // tooltip = formatted value
          });
          rows.push(row);
        });
  
        dt.addRows(rows);
        return { dt, maxValue };
      };
  
      // --- Draw chart ---
      const drawChart = (containerId: string, title: string, dt: any, maxValue: number, isAvg: boolean) => {
        const options = {
          title: title,
          height: 450,
          legend: { position: 'top', textStyle: { fontSize: 14 } },
          bar: { groupWidth: '55%' },
          isStacked: false, // side-by-side grouping
          annotations: { alwaysOutside: true, textStyle: { fontSize: 12, bold: true } },
          vAxis: isAvg
            ? { minValue: 0, ticks: this.generateHMMTicks(maxValue, 1800) }
            : { minValue: 0, format: '0.0' },
          chartArea: { left: 60, top: 60, right: 20, width: '80%', height: '70%' },
          tooltip: { isHtml: true }
        };
  
        const container = document.getElementById(containerId);
        if (container) new google.visualization.ColumnChart(container).draw(dt, options);
      };
  
      // Build & draw Aggregate chart
      const { dt: dtAgg, maxValue: maxAgg } = buildDataTable(false);
      drawChart('comparisonAggGrouped', 'השוואת ימי אובדן לפי תקופה', dtAgg, maxAgg, false);
  
      // Build & draw Average chart
      const { dt: dtAvg, maxValue: maxAvg } = buildDataTable(true);
      drawChart('comparisonAvgGrouped', 'השוואת זמן אובדן (HH:MM) לפי תקופה', dtAvg, maxAvg, true);
  
    } catch (err) {
      console.error('Error drawing grouped comparison charts by type:', err);
    }
  }
  
  public async drawGroupedComparisonCharts(
    aggElementId: string,
    avgElementId: string,
    url: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
  
      if (!clean || !clean.rows?.length) {
        [aggElementId, avgElementId].forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }
  
      // === Explicit mappings ===
      const dataSourceOrder = ['MorningDelay', 'EndDay', 'SetupTime'];
      const dataTypeOrder = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
  
      const dataSourceHebrew: { [key: string]: string } = {
        MorningDelay: 'איחור בוקר',
        EndDay: 'סוף יום',
        SetupTime: 'זמן Setup'
      };
  
      const dataTypeHebrew: { [key: string]: string } = {
        '1-Yesterday': 'אתמול',
        '2-CurrentMonth': 'החודש',
        '3-CurrentYear': 'השנה',
        '4-ParallelsPeriod': 'השוואתי'
      };
  
      const colorMap: { [key: string]: string } = {
        '1-Yesterday': '#6ba1f8',
        '2-CurrentMonth': '#fcd74e',
        '3-CurrentYear': '#00cc66',
        '4-ParallelsPeriod': '#f86b6b'
      };
  
      // === Group data ===
      const grouped: { [ds: string]: { [type: string]: { agg: number; avg: number } } } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        const type = r.c[1]?.v || 'Unknown';
        const agg = Number(r.c[4]?.v ?? 0);
        const avg = Number(r.c[5]?.v ?? 0);
  
        if (!grouped[ds]) grouped[ds] = {};
        grouped[ds][type] = { agg, avg };
      });
  
      // === Build DataTables ===
      const buildDataTable = (isAvg: boolean) => {
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'קטגוריה'); // X-axis (DataSource)
        dataTypeOrder.forEach(type => {
          dt.addColumn('number', dataTypeHebrew[type]);
          dt.addColumn({ type: 'string', role: 'tooltip' });
          dt.addColumn({ type: 'string', role: 'style' });
        });
  
        let maxValue = 0;
  
        dataSourceOrder.forEach(ds => {
          const row: any[] = [dataSourceHebrew[ds]];
          dataTypeOrder.forEach(type => {
            const val = grouped[ds]?.[type]?.[isAvg ? 'avg' : 'agg'] || 0;
            maxValue = Math.max(maxValue, val);
            const formatted = isAvg ? this.formatToHHMM(val) : val.toFixed(1);
            row.push(val, formatted, `color: ${colorMap[type]}`);
          });
          dt.addRow(row);
        });
  
        return { dt, maxValue };
      };
  
      const { dt: aggDt, maxValue: maxAgg } = buildDataTable(false);
      const { dt: avgDt, maxValue: maxAvg } = buildDataTable(true);
  
      // === Chart options ===
      const buildOptions = (title: string, max: number, isAvg: boolean) => ({
        title: title,
        height: 450,
        legend: { position: 'top', textStyle: { fontSize: 14 } },
        bar: { groupWidth: '70%' },
        annotations: { alwaysOutside: true, textStyle: { fontSize: 13, bold: true } },
        tooltip: { trigger: 'focus', textStyle: { fontSize: 14 } },
        vAxis: isAvg
          ? { minValue: 0, ticks: this.generateHMMTicks(max, 1800) }
          : { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(max) + 1 } },
        hAxis: { slantedText: true, slantedTextAngle: 0 },
        isStacked: false,
        titleTextStyle: { fontSize: 16, bold: true, direction: 'rtl' },
        chartArea: { left: 80, top: 80, right: 30, width: '80%', height: '65%' }
      });
  
      // === Draw charts ===
      const aggContainer = document.getElementById(aggElementId);
      if (aggContainer) {
        new google.visualization.ColumnChart(aggContainer).draw(
          aggDt,
          buildOptions('השוואת ימי אובדן בין תקופות', maxAgg, false)
        );
      }
  
      const avgContainer = document.getElementById(avgElementId);
      if (avgContainer) {
        new google.visualization.ColumnChart(avgContainer).draw(
          avgDt,
          buildOptions('השוואת זמן אובדן ממוצע (HH:MM) בין תקופות', maxAvg, true)
        );
      }
    } catch (err) {
      console.error('Error drawing grouped comparison charts:', err);
    }
  }
  
  public async drawAllDepartmentTables(
    elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
    url: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      for (const [period, dsMap] of Object.entries(elementIdsByPeriod)) {
        const raw = await this.fetchWithCache(this.buildUrl(url, { dataType: period }));
        const clean = sanitizeSoapResponse(raw);
  
        if (!clean || !clean.rows?.length) {
          Object.values(dsMap).forEach(id => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = 'אין נתונים להצגה';
          });
          continue;
        }
  
        const groupedByDS: { [ds: string]: any[] } = {};
        clean.rows.forEach((r: any) => {
          const ds = r.c[0]?.v || 'Unknown';
          if (!groupedByDS[ds]) groupedByDS[ds] = [];
          groupedByDS[ds].push(r);
        });
  
        for (const [dataSource, rows] of Object.entries(groupedByDS)) {
          const elementId = dsMap[dataSource];
          if (!elementId) continue;
  
          const titleContainer = document.getElementById(`title_${elementId}`);
          if (titleContainer) {
            titleContainer.innerText = `${this.translateDataSource(dataSource)} - ${this.translateTimeframe(period)}`;
            titleContainer.style.fontWeight = 'bold';
            titleContainer.style.fontSize = '16px';
            titleContainer.style.textAlign = 'center';
            titleContainer.style.margin = '10px 0';
          }
  
          const container = document.getElementById(elementId);
          if (!container) continue;
  
          const dt = new google.visualization.DataTable();
          dt.addColumn('string', 'מחלקה');
  
          const includeDateColumn = period === '4-ParallelsPeriod';
          if (includeDateColumn) {
            dt.addColumn('string', 'שנה');
          }
  
          dt.addColumn('number', 'זמן');
  
          rows.forEach(r => {
            const department = r.c[2]?.v || '';
            let date = r.c[3]?.v || '';
  
            // === Extract only year if period is 4-ParallelsPeriod ===
            if (includeDateColumn && typeof date === 'string') {
              const yearMatch = date.match(/\d{4}/); // Extract 4-digit year
              date = yearMatch ? yearMatch[0] : '';
            } else {
              date = '';
            }
  
            const rawValue = r.c[4]?.v != null && !isNaN(Number(r.c[4]?.v)) ? Number(r.c[4].v) : 0;
            const formattedValue = this.formatToHHMM(rawValue);
  
            if (includeDateColumn) {
              dt.addRow([department, date, { v: rawValue, f: formattedValue }]);
            } else {
              dt.addRow([department, { v: rawValue, f: formattedValue }]);
            }
          });
  
          const table = new google.visualization.Table(container);
          table.draw(dt, {
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
  
    
}
