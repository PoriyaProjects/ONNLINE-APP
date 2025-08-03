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
    google.charts.load('current', { packages: ['corechart'] });
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
        EndDay: 'סיום יום',
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
  
        // === Debugging values for each chart
        console.group(`Debug for ${dsTitle}`);
        console.log("CurrentMonth:", currentMonth);
        console.log("CurrentYear:", currentYear);
        console.log("ParallelsPeriod:", parallels);
        console.log("PlannedMonthAgg:", plannedMonthAgg);
        console.log("PlannedMonthAvg:", plannedMonthAvg);
        console.log("ParallelsPerYearAgg:", parallelsPerYearAgg);
        console.log("ParallelsPerYearAvg:", parallelsPerYearAvg);
        console.groupEnd();
  
        // === AggregateDays Chart ===
        console.log(`Drawing AGG chart for ${dsTitle}`, {
          gaugePlanned: plannedMonthAgg,
          gaugeTargetValue: parallelsPerYearAgg,
          gaugeValue: currentYear.agg
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
          isTime: true
        });
        
        
      });
  
    } catch (err) {
      console.error('Error drawing room time dual arc charts:', err);
    }
  }
  
  
}
