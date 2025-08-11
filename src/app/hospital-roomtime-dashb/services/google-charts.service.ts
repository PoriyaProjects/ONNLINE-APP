import { HostListener, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';
import { sanitizeSoapResponse } from '../../shared/sanitizesoapresponce';
import { drawOverlayDualArcChartHelperRoomTime } from '../../shared/drawOverlayDualArcChartHelperRoomTime';
import { environment } from 'src/environments/environment';
import { drawHorizontalMultiPeriodChartHelperRoomTime } from '../../shared/drawHorizontalMultiPeriodChartHelperRoomTime';

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



  /**
   * Arc Charts
   */
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

     
      const grouped: { 
        [ds: string]: { 
          [type: string]: { 
            agg: number; avg: number; 
            aggDepts: { name: string; value: number }[];
            avgDepts: { name: string; value: number }[];
          } 
        } 
      } = {};
      
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        const type = r.c[1]?.v || 'Unknown';
        const depart = r.c[2]?.v || '';
        const agg = Number(r.c[4]?.v ?? 0);
        const avg = Number(r.c[5]?.v ?? 0);
        if (!grouped[ds]) grouped[ds] = {};
        if (!grouped[ds][type]) grouped[ds][type] = { agg: 0, avg: 0, aggDepts: [], avgDepts: [] };
      
        grouped[ds][type].agg += agg;
        grouped[ds][type].avg += avg;
        if (agg > 0) grouped[ds][type].aggDepts.push({ name: depart, value: agg });
        if (avg > 0) grouped[ds][type].avgDepts.push({ name: depart, value: avg });
      });
      
      const getLeadingDept = (depts: { name: string; value: number }[] = []) =>
      depts.reduce((max, d) => (d.value > max.value ? d : max), { name: '', value: 0 });

      //console.group("Grouped Raw Data");
      //console.log(grouped);
      //console.groupEnd();

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
        EndDay: '#FFB74D',
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


  public async drawDepartmentChartsWithColors(
    elementIds: { [key: string]: string },
    url: string,
    dataType: string,
    titlePrefix: string,
    colorFn: (department: string) => string,
    isDays: boolean = false 
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
        dt.addColumn({ type: 'string', role: 'tooltip' }); 

        let maxValue = 0;
        rows.forEach(r => {
          const baseDepartment = r.c[2]?.v || '';
          const periodDate = r.c[3]?.v || '';
          const rawValue = Number(r.c[4]?.v ?? 0);

          let displayDepartment = baseDepartment;
          if (dataType === '4-ParallelsPeriod' && periodDate) {
            const yearSuffix = new Date(periodDate).getFullYear().toString().slice(-2);
            displayDepartment = `${baseDepartment} - ${yearSuffix}`;
          }

          const color = colorFn(baseDepartment);
          maxValue = Math.max(maxValue, rawValue);

          const annotation = isDays
            ? rawValue.toFixed(0)
            : this.formatToHHMM(rawValue);

          const tooltip = isDays
            ? `${rawValue.toFixed(1)} ימים`
            : this.formatToHHMM(rawValue); 

          dt.addRow([displayDepartment, rawValue, `color: ${color}`, annotation, tooltip]);
        });

        const options = {
          height: 560,
          bar: { groupWidth: '65%' },
          legend: { position: 'right' },
          annotations: { alwaysOutside: true, textStyle: { fontSize: 16 } },
          tooltip: { isHtml: false }, 
          hAxis: { slantedText: true, slantedTextAngle: 45 },
          vAxis: isDays
            ? { minValue: 0, format: '0.0', gridlines: { count: Math.ceil(maxValue) + 1 } }
            : { minValue: 0, ticks: this.generateHMMTicks(maxValue, 1800) },
          chartArea: { left: 50, top: 40, right: 20, width: '80%', height: '70%' }
        };


        // Set title separately
        const titleContainer = document.getElementById(`${elementId}Title`);
        

        if (titleContainer) {
          const timeframe = this.translateTimeframe(dataType);
          const subtitle = isDays
            ? `${timeframe} בימים`      // For days
            : `${timeframe} ב- (HH:MM)`;    // For time
        
          titleContainer.innerHTML = `
            ${this.translateDataSource(dataSource)} - ${titlePrefix} 
            <br><span style="font-size:12px">${subtitle}</span>
          `;
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


  public async drawAllDepartmentTables(
    elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
    url: string,
    excludeCurrentYear: boolean = true
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
            titleContainer.innerText = `${this.translateDataSource(dataSource)} - ${this.translateTimeframe(period)} `;
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
            const currentYear = new Date().getFullYear().toString().substring(2); // last 2 digits of current year
            const yearSet = new Set<string>();
            rows.forEach(r => {
              let date = r.c[3]?.v || '';
              if (typeof date === 'string') {
                const yearMatch = date.match(/\d{4}/);
                if (yearMatch) {
                  const yearStr = yearMatch[0].substring(2);
                  if (!(excludeCurrentYear && yearStr === currentYear)) {
                    yearSet.add(yearStr);
                  }
                }
              }
            });
            uniqueYears = Array.from(yearSet).sort((a, b) => Number(b) - Number(a)); // sort descending
            uniqueYears.forEach(y => dt.addColumn('number', y));
          } else {
            dt.addColumn('number', 'זמן');
          }

          // Group by department
          const departmentMap: { [dept: string]: { [year: string]: number } } = {};
          rows.forEach(r => {
            const department = r.c[2]?.v || '';
            let date = r.c[3]?.v || '';
            let year = '';

            if (isParallelPeriod && typeof date === 'string') {
              const yearMatch = date.match(/\d{4}/);
              if (yearMatch) {
                year = yearMatch[0].substring(2);
                if (excludeCurrentYear && year === new Date().getFullYear().toString().substring(2)) return;
              }
            }

            const rawValue = r.c[4]?.v != null && !isNaN(Number(r.c[4]?.v)) ? Number(r.c[4].v) : 0;
            if (!departmentMap[department]) departmentMap[department] = {};
            if (isParallelPeriod && year) departmentMap[department][year] = rawValue;
            if (!isParallelPeriod) departmentMap[department]['value'] = rawValue;
          });

          // Build rows + color cells
          for (const [department, yearValues] of Object.entries(departmentMap)) {
            if (isParallelPeriod) {
              const row: any[] = [department];
              const rowIndex = dt.addRow();
              dt.setCell(rowIndex, 0, department);

              uniqueYears.forEach((y, idx) => {
                const rawValue = yearValues[y] ?? null;
                const formatted = rawValue != null ? this.formatToHHMM(rawValue) : '';
                const colIndex = idx + 1;

                if (rawValue != null) {
                  dt.setCell(rowIndex, colIndex, rawValue, formatted);

                  // Color coding
                  const minutes = rawValue / 60;
                  let cellColor = '#b9f6ca'; // green
                  if (minutes > 30 && minutes <= 59) cellColor = '#fff9c4'; // yellow
                  if (minutes >= 60) cellColor = '#ffcdd2'; // red

                  dt.setProperty(rowIndex, colIndex, 'style', `background-color:${cellColor}; color:#000;`);
                }
              });
            } else {
              const rawValue = yearValues['value'] ?? 0;
              const formattedValue = this.formatToHHMM(rawValue);
              const rowIndex = dt.addRow([department, { v: rawValue, f: formattedValue }]);

              const minutes = rawValue / 60;
              let rowColor = '#b9f6ca';
              if (minutes > 30 && minutes <= 59) rowColor = '#fff9c4';
              if (minutes >= 60) rowColor = '#ffcdd2';
              for (let col = 0; col < dt.getNumberOfColumns(); col++) {
                dt.setProperty(rowIndex, col, 'style', `background-color:${rowColor}; color:#000;`);
              }
            }
          }

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


  public async drawAllDepartmentTablesSum(
    elementIdsByPeriod: { [period: string]: { [ds: string]: string } },
    url: string,
    excludeCurrentYear: boolean = true
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

          // === Title ===
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

          const isParallelPeriod = period === '4-ParallelsPeriod';
          let uniqueYears: string[] = [];

          if (isParallelPeriod) {
            const currentYear = new Date().getFullYear().toString().substring(2);
            const yearSet = new Set<string>();
            rows.forEach(r => {
              let date = r.c[3]?.v || '';
              if (typeof date === 'string') {
                const yearMatch = date.match(/\d{4}/);
                if (yearMatch) {
                  const yearStr = yearMatch[0].substring(2);
                  if (!(excludeCurrentYear && yearStr === currentYear)) {
                    yearSet.add(yearStr);
                  }
                }
              }
            });
            uniqueYears = Array.from(yearSet).sort((a, b) => Number(b) - Number(a)); // descending
            uniqueYears.forEach(y => dt.addColumn('number', y));
          } else {
            dt.addColumn('number', 'ימים');
          }

          // Group by department
          const departmentMap: { [dept: string]: { [year: string]: number } } = {};
          rows.forEach(r => {
            const department = r.c[2]?.v || '';
            let date = r.c[3]?.v || '';
            let year = '';

            if (isParallelPeriod && typeof date === 'string') {
              const yearMatch = date.match(/\d{4}/);
              if (yearMatch) {
                year = yearMatch[0].substring(2);
                if (excludeCurrentYear && year === new Date().getFullYear().toString().substring(2)) return;
              }
            }

            const rawValue = r.c[4]?.v != null && !isNaN(Number(r.c[4]?.v)) ? Number(r.c[4].v) : 0;
            if (!departmentMap[department]) departmentMap[department] = {};
            if (isParallelPeriod && year) departmentMap[department][year] = rawValue;
            if (!isParallelPeriod) departmentMap[department]['value'] = rawValue;
          });

          // Compute global max for scaling colors
          let maxVal = 0;
          Object.values(departmentMap).forEach(yearValues => {
            Object.values(yearValues).forEach(val => {
              if (val > maxVal) maxVal = val;
            });
          });

          // Helper: interpolate red shades (10 steps)
          const getRedShade = (value: number): string => {
            if (maxVal === 0) return '#ffcdd2';
            const intensity = Math.min(1, value / maxVal); // normalize 0–1
            const step = Math.floor(intensity * 9); // 0–9
            // generate progressively darker red shades
            // const redShades = [
            //   '#ffcdd2', '#f8b6b8', '#f49ea0', '#f08888', '#ec7070',
            //   '#e75858', '#e24040', '#de2828', '#da1010', '#d50000'
            // ];
            const redShades = [
              '#ffe5e5', // 1 - lightest
              '#ffcccc', // 2
              '#ffb3b3', // 3
              '#ff9999', // 4
              '#ff8080', // 5
              '#e75858', // 6 - strongest
              '#f06a6a', // 7
              '#f68383', // 8
              '#f89c9c', // 9
              '#fbb5b5'  // 10 - softest
            ];

            return redShades[step];
          };

          // Build rows + color cells
          for (const [department, yearValues] of Object.entries(departmentMap)) {
            if (isParallelPeriod) {
              const rowIndex = dt.addRow();
              dt.setCell(rowIndex, 0, department);

              uniqueYears.forEach((y, idx) => {
                const rawValue = yearValues[y] ?? null;
                const formatted = rawValue != null ? `${Math.round(rawValue)} ימים` : '';
                const colIndex = idx + 1;

                if (rawValue != null) {
                  dt.setCell(rowIndex, colIndex, rawValue, formatted);
                  dt.setProperty(rowIndex, colIndex, 'style', `background-color:${getRedShade(rawValue)}; color:#000;`);
                }
              });
            } else {
              const rawValue = yearValues['value'] ?? 0;
              const formattedValue = `${Math.round(rawValue)} ימים`; const rowIndex = dt.addRow([department, { v: rawValue, f: formattedValue }]);
              const rowColor = getRedShade(rawValue);
              for (let col = 0; col < dt.getNumberOfColumns(); col++) {
                dt.setProperty(rowIndex, col, 'style', `background-color:${rowColor}; color:#000;`);
              }
            }
          }

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


  public async drawSummarizedMultiPeriodChart(
    containerId: string,
    avgUrl: string,   // rows per component per dept (DataSource=MorningDelay/EndDay/SetupTime, Value in minutes)
    aggUrl: string,   // rows with totals to SUM (Value in minutes)
    color: string
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    // Periods order matters for UI
    const periods = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
  
    // payload indices (per your sample):
    // [0]=DataSource, [1]=DataType, [2]=Depart_Name, [3]=PeriodDate, [4]=Value
    const COL = { source: 0, value: 4 } as const;
  
    // ---------- utils ----------
    const toNum = (v: any) => {
      const n = Number(v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };
  
    const formatMinutesToHHMM = (min: number) => {
      const rounded = Math.round(min); // ensure no seconds
      const h = Math.floor(rounded / 60);
      const mm = rounded % 60;
      return `${h}:${mm.toString().padStart(2, '0')}`;
    };
  
    // ---------- FIRST LINE: SUM OF (ROUNDED) COMPONENT AVERAGES ----------
    // For each period:
    //   avgSetup = mean(Value where DataSource='SetupTime')
    //   avgEnd   = mean(Value where DataSource='EndDay')
    //   avgMorning = mean(Value where DataSource='MorningDelay')
    //   Round each average to nearest minute, THEN sum: avgSetup + avgEnd + avgMorning
    const computeSumOfComponentAverages = (rows: any[]) => {
      const buckets: Record<'SetupTime' | 'EndDay' | 'MorningDelay', number[]> = {
        SetupTime: [],
        EndDay: [],
        MorningDelay: [],
      };
  
      for (const r of rows ?? []) {
        const src = r?.c?.[COL.source]?.v as string;
        const val = toNum(r?.c?.[COL.value]?.v);
        if (src === 'SetupTime' || src === 'EndDay' || src === 'MorningDelay') {
          buckets[src].push(val);
        }
      }
  
      const avgRaw = {
        SetupTime: buckets.SetupTime.length ? buckets.SetupTime.reduce((a, b) => a + b, 0) / buckets.SetupTime.length : 0,
        EndDay: buckets.EndDay.length ? buckets.EndDay.reduce((a, b) => a + b, 0) / buckets.EndDay.length : 0,
        MorningDelay: buckets.MorningDelay.length ? buckets.MorningDelay.reduce((a, b) => a + b, 0) / buckets.MorningDelay.length : 0,
      };
  
      // Round each component average to the nearest minute BEFORE summing
      // const avgRounded = {
      //   SetupTime: Math.round(avgRaw.SetupTime),
      //   EndDay: Math.round(avgRaw.EndDay),
      //   MorningDelay: Math.round(avgRaw.MorningDelay),
      // };
  
      const avgRounded = {
        SetupTime: Math.floor(avgRaw.SetupTime),
        EndDay: Math.floor(avgRaw.EndDay),
        MorningDelay: Math.floor(avgRaw.MorningDelay),
      };
      const sumOfAverages = avgRounded.SetupTime + avgRounded.EndDay + avgRounded.MorningDelay;
  
      // Debug
      console.group('FIRST LINE | SUM OF (ROUNDED) COMPONENT AVERAGES');
      console.log('Counts:', {
        SetupTime: buckets.SetupTime.length,
        EndDay: buckets.EndDay.length,
        MorningDelay: buckets.MorningDelay.length
      });
      console.log('Averages (rounded minutes):', avgRounded);
      console.log(
        `Expression (HH:MM): ${formatMinutesToHHMM(avgRounded.SetupTime)} + ${formatMinutesToHHMM(avgRounded.EndDay)} + ${formatMinutesToHHMM(avgRounded.MorningDelay)} = ${formatMinutesToHHMM(sumOfAverages)}`
      );
      console.log(
        `Expression (raw minutes): ${avgRounded.SetupTime} + ${avgRounded.EndDay} + ${avgRounded.MorningDelay} = ${sumOfAverages}`
      );
      console.groupEnd();
  
      return { sumOfAverages, avgRounded };
    };
  
    // ---------- SECOND LINE: SUM TOTALS ----------
    const computeSumLossFromRows = (rows: any[]) => {
      const values = (rows ?? []).map(r => toNum(r?.c?.[COL.value]?.v));
      const total = values.reduce((a, b) => a + b, 0);
  
      // Debug
      console.group('SECOND LINE | SUM TOTALS');
      console.log('Row values (minutes):', values);
      console.log(`Sum = ${(values.length ? values.join(' + ') : '0')} = ${total} (${formatMinutesToHHMM(total)})`);
      console.groupEnd();
  
      return total;
    };
  
    const firstLineData: Record<string, number> = {};  // sum of rounded component averages (minutes)
    const secondLineData: Record<string, number> = {}; // total sums (minutes)
  
    // ----- build first line (sum of rounded component averages) -----
    for (const p of periods) {
      const url = this.buildUrl(avgUrl, { dataType: p });
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
      const { sumOfAverages } = computeSumOfComponentAverages(rows);
      firstLineData[p] = sumOfAverages;
      console.debug(`FIRST LINE (${p}) -> ${sumOfAverages} minutes (${formatMinutesToHHMM(sumOfAverages)}) | URL:`, url);
    }
  
    // ----- build second line (sum totals) -----
    // If your agg endpoint supports Yesterday as well, switch to "for (const p of periods)" and add yesterdayAgg below.
    for (const p of periods.slice(1)) {
      const url = this.buildUrl(aggUrl, { dataType: p });
      const raw = await this.fetchWithCache(url);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
      const total = computeSumLossFromRows(rows);
      secondLineData[p] = total;
      console.debug(`SECOND LINE (${p}) -> ${total} minutes (${formatMinutesToHHMM(total)}) | URL:`, url);
    }
  
    // ----- summary debug -----
    console.group('DEBUG SUMMARY | Line 1 = Sum of rounded component averages, Line 2 = Sums');
    console.log('Line 1 [min]:', firstLineData);
    console.log('Line 2 [min]:', secondLineData);
    console.groupEnd();
  
    // ----- draw -----
    drawHorizontalMultiPeriodChartHelperRoomTime({
      containerId,
      title: 'אובדן חדרי ניתוח – סיכום תקופות',
      data: {
        // First line: sum of (rounded) component averages
        yesterdayAvg: firstLineData['1-Yesterday'],
        monthAvg:     firstLineData['2-CurrentMonth'],
        yearAvg:      firstLineData['3-CurrentYear'],
        parallelAvg:  firstLineData['4-ParallelsPeriod'],
  
        // Second line: totals SUM
        monthAgg:     secondLineData['2-CurrentMonth'],
        yearAgg:      secondLineData['3-CurrentYear'],
        parallelAgg:  secondLineData['4-ParallelsPeriod'],
        // If agg supports Yesterday:
        // yesterdayAgg: secondLineData['1-Yesterday'],
      },
      colors: [
        '#6ba1f8', // blue
        '#a974f7', // purple
        '#ff8c42', // orange
        '#00cfc1', // teal
        '#ff69b4', // pink
        '#8b4513', // brown
      ],
      rows: ["agg","avg"]
    });
  }
  
  public async drawSummarizedMultiPeriodChartForDepartment(
    containerId: string,
    avgUrl: string,  // GetRoomTimeAvgD
    aggUrl: string,  // GetRoomAggregateDaysD
    color: string,
    departName: string,
    opts?: {
      /** query string key to use for department filtering (if your API expects a specific key) */
      deptParamKey?: string;           // default: 'departName'
      /** override how to compare department names (e.g., case-insensitive) */
      matchDept?: (rowName: string, wanted: string) => boolean;
    }
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    const periods = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'] as const;
    const COL = { source: 0, dataType: 1, depart: 2, periodDate: 3, value: 4 } as const;
  
    const deptKey = opts?.deptParamKey ?? 'departName';
    const matchDept = opts?.matchDept ?? ((rowName, wanted) => rowName === wanted);
  
    const toNum = (v: any) => {
      const n = Number(v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };
  
    const formatMinutesToHHMM = (min: number) => {
      const rounded = Math.round(min);
      const h = Math.floor(rounded / 60);
      const mm = rounded % 60;
      return `${h}:${mm.toString().padStart(2, '0')}`;
    };
  
    // ---- FIRST LINE: SUM of rounded component averages (per period) ----
    const computeSumOfComponentAverages = (rows: any[]) => {
      const buckets: Record<'SetupTime' | 'EndDay' | 'MorningDelay', number[]> = {
        SetupTime: [], EndDay: [], MorningDelay: []
      };
      for (const r of rows ?? []) {
        const dep = r?.c?.[COL.depart]?.v as string;
        if (!matchDept(dep ?? '', departName)) continue;
  
        const src = r?.c?.[COL.source]?.v as string;
        const val = toNum(r?.c?.[COL.value]?.v);
        if (src === 'SetupTime' || src === 'EndDay' || src === 'MorningDelay') {
          buckets[src].push(val);
        }
      }
  
      const avgRaw = {
        SetupTime: buckets.SetupTime.length ? buckets.SetupTime.reduce((a, b) => a + b, 0) / buckets.SetupTime.length : 0,
        EndDay: buckets.EndDay.length ? buckets.EndDay.reduce((a, b) => a + b, 0) / buckets.EndDay.length : 0,
        MorningDelay: buckets.MorningDelay.length ? buckets.MorningDelay.reduce((a, b) => a + b, 0) / buckets.MorningDelay.length : 0,
      };
  
      // Round EACH component to minute (floor to match your current impl), then sum
      const avgRounded = {
        SetupTime: Math.floor(avgRaw.SetupTime),
        EndDay: Math.floor(avgRaw.EndDay),
        MorningDelay: Math.floor(avgRaw.MorningDelay),
      };
      const sumOfAverages = avgRounded.SetupTime + avgRounded.EndDay + avgRounded.MorningDelay;
  
      // Debug (optional)
      // console.debug('DeptAvg rounded:', avgRounded, 'sum:', sumOfAverages, formatMinutesToHHMM(sumOfAverages));
  
      return { sumOfAverages, avgRounded };
    };
  
    // ---- SECOND LINE: SUM totals (per period) ----
    const computeSumLossFromRows = (rows: any[]) => {
      const values = (rows ?? [])
        .filter(r => matchDept(r?.c?.[COL.depart]?.v ?? '', departName))
        .map(r => toNum(r?.c?.[COL.value]?.v));
      return values.reduce((a, b) => a + b, 0);
    };
  
    const firstLineData: Record<string, number> = {};   // minutes
    const secondLineData: Record<string, number> = {};  // minutes
  
    // ----- build FIRST line: per period, sum of rounded component averages -----
    for (const p of periods) {
      // Try server-side filtering; if API ignores it, we’ll filter client-side.
      const urlWithDept = this.buildUrl(avgUrl, { dataType: p, [deptKey]: departName });
      const raw = await this.fetchWithCache(urlWithDept);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
  
      const { sumOfAverages } = computeSumOfComponentAverages(rows);
      firstLineData[p] = sumOfAverages;
      // console.debug(`Dept FIRST (${departName} | ${p}) -> ${sumOfAverages} min (${formatMinutesToHHMM(sumOfAverages)})`);
    }
  
    // ----- build SECOND line: totals SUM (note: you originally skip Yesterday for agg) -----
    for (const p of periods.slice(1)) {
      const urlWithDept = this.buildUrl(aggUrl, { dataType: p, [deptKey]: departName });
      const raw = await this.fetchWithCache(urlWithDept);
      const clean = sanitizeSoapResponse(raw);
      const rows = Array.isArray(clean?.rows) ? clean.rows : [];
  
      const total = computeSumLossFromRows(rows);
      secondLineData[p] = total;
      // console.debug(`Dept SECOND (${departName} | ${p}) -> ${total} min (${formatMinutesToHHMM(total)})`);
    }
  
    // ----- draw -----
    drawHorizontalMultiPeriodChartHelperRoomTime({
      containerId,
      title: `אובדן חדרי ניתוח – סיכום תקופות (${departName})`,
      data: {
        // First line: sum of (rounded) component averages
        yesterdayAvg: firstLineData['1-Yesterday'],
        monthAvg:     firstLineData['2-CurrentMonth'],
        yearAvg:      firstLineData['3-CurrentYear'],
        parallelAvg:  firstLineData['4-ParallelsPeriod'],
  
        // Second line: totals SUM
        monthAgg:     secondLineData['2-CurrentMonth'],
        yearAgg:      secondLineData['3-CurrentYear'],
        parallelAgg:  secondLineData['4-ParallelsPeriod'],
        // yesterdayAgg: secondLineData['1-Yesterday'], // uncomment if your agg supports it
      },
      colors: [
        color,        // keep department color as first (bars)
        '#a974f7',    // purple
        '#ff8c42',    // orange
        '#00cfc1',    // teal
        '#ff69b4',    // pink
        '#8b4513',    // brown
      ],
      rows: ["agg","avg"]
    });
  }
  
    
  
  
  

  getAggregateData(dataType: string): Observable<string> {
    return this.http.get(`${environment.url}/GetRoomAggregateDaysD?dataType=${dataType}`, {
      responseType: 'text' as const
    });
  }
  
  getAverageData(dataType: string): Observable<string> {
    return this.http.get(`${environment.url}/GetRoomTimeAvgD?dataType=${dataType}`, {
      responseType: 'text' as const
    });
  }
  
 
  drawDepartmentChart(config: {
    containerId: string;
    data: any[][];
    chartTitle?: string;
    chartType?: 'ColumnChart' | 'ComboChart' | 'BarChart'; // optional
    color?: string;
    options?: any; // must include your hAxis/vAxis if you pass them
  }): void {
    const el = document.getElementById(config.containerId);
    if (!el || !(window as any).google?.visualization) return;
  
    const dt = new google.visualization.arrayToDataTable(config.data);
  
    // Minimal base — DO NOT set hAxis/vAxis here (let caller control them)
    const base: any = {
      title: config.chartTitle ?? '',
      height: 400,
      legend: { position: 'bottom' },
      tooltip: { isHtml: true },
      colors: config.color ? [config.color] : undefined
    };
  
    // Deep merge so nested axis options from the component are preserved
    const merge = (a: any, b: any) => {
      if (!b) return a;
      const out = Array.isArray(a) ? [...a] : { ...a };
      for (const [k, v] of Object.entries(b)) {
        out[k] = v && typeof v === 'object' && !Array.isArray(v)
          ? merge(out[k] ?? {}, v)
          : v;
      }
      return out;
    };
    const opts = merge(base, config.options || {});
  
    // Default to classic ColumnChart (slantedText supported)
    const Ctor =
      config.chartType === 'ComboChart' ? google.visualization.ComboChart :
      config.chartType === 'BarChart'   ? google.visualization.BarChart   :
                                          google.visualization.ColumnChart;
  
    const chart = new Ctor(el);
    chart.draw(dt, opts);
  }
  

  @HostListener('window:scroll', [])
  onScroll() {
    const el = document.getElementById('stickyTabsFilters');
    if (el) {
      const isSticky = window.scrollY > 100; // adjust threshold if needed
      if (isSticky) {
        el.classList.add('is-sticky');
      } else {
        el.classList.remove('is-sticky');
      }
    }
  }

  public async drawDepartmentMultiPeriodSummary(
    containerId: string,
    departName: string,
    color: string,
    opts: {
      // if you already have the department metrics in memory, pass them here (fallback path)
      deptMetrics?: Array<{ period: string; source: string; avgMinutes?: number; aggregateDays?: number }>;
      // endpoints, same as your total summary function
      avgUrl?: string;      // e.g. `${environment.url}/GetRoomTimeAvgD`
      aggUrl?: string;      // e.g. `${environment.url}/GetRoomAggregateDaysD`
    } = {}
  ): Promise<void> {
    await this.waitUntilChartsReady();
  
    const container = document.getElementById(containerId);
    if (!container || !(window as any).google?.visualization) return;
  
    // Desired order / labels
    const order = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];
    const labelMap: Record<string,string> = {
      '1-Yesterday': 'אתמול',
      '2-CurrentMonth': 'החודש',
      '3-CurrentYear': 'השנה',
      '4-ParallelsPeriod': 'השוואתי'
    };
  
    // Try server-side filtered fetch first (if URLs provided)
    let seriesFromServer: { [period: string]: { avg?: number; days?: number } } | null = null;
    try {
      if (opts.avgUrl && opts.aggUrl) {
        // Try with departName param — change 'departName' to whatever your API expects
        const [avgRaw, aggRaw] = await Promise.all([
          this.fetchWithCache(this.buildUrl(opts.avgUrl, { dataType: '', departName })), // dataType blank => server returns all periods
          this.fetchWithCache(this.buildUrl(opts.aggUrl, { dataType: '', departName }))
        ]);
        const avgClean = sanitizeSoapResponse(avgRaw);
        const aggClean = sanitizeSoapResponse(aggRaw);
  
        const acc: any = {};
        avgClean?.rows?.forEach((r: any) => {
          const p = r.c[1]?.v;                 // Period
          const v = Number(r.c[4]?.v ?? 0);    // Value (minutes or seconds)
          if (!acc[p]) acc[p] = {};
          acc[p].avg = (acc[p].avg ?? 0) + v;
        });
        aggClean?.rows?.forEach((r: any) => {
          const p = r.c[1]?.v;
          const v = Number(r.c[4]?.v ?? 0);
          if (!acc[p]) acc[p] = {};
          acc[p].days = (acc[p].days ?? 0) + v;
        });
        seriesFromServer = acc;
      }
    } catch {
      seriesFromServer = null;
    }
  
    // Fallback: compute from in-memory deptMetrics (what the component already has)
    const series = seriesFromServer ?? (() => {
      const acc: any = {};
      (opts.deptMetrics ?? []).forEach(m => {
        const p = m.period;
        if (!acc[p]) acc[p] = { avg: 0, days: 0 };
        if (m.avgMinutes !== undefined) acc[p].avg += Number(m.avgMinutes);
        if (m.aggregateDays !== undefined) acc[p].days += Number(m.aggregateDays);
      });
      return acc;
    })();
  
    // Build DataTable: 2 series -> Avg time (raw) + Days
    const dt = new google.visualization.DataTable();
    dt.addColumn('string', 'תקופה');
    dt.addColumn('number', 'זמן ממוצע');  // raw numeric (minutes or seconds; we’ll fix ticks with labels)
    dt.addColumn('number', 'ימי אובדן');
  
    // collect raw avg values to build hh:mm ticks (seconds/minutes detection)
    const rawAvgVals: number[] = [];
    order.forEach(p => {
      const row = series[p] || {};
      const avg = Number(row.avg ?? 0);
      const days = Number(row.days ?? 0);
      rawAvgVals.push(avg);
      dt.addRow([labelMap[p] || p, avg, days]);
    });
  
    // Detect seconds and build hh:mm ticks
    const detectSeconds = (vals: number[]) => {
      if (!vals.length) return false;
      const max = Math.max(...vals);
      const manyDiv60 = vals.filter(v => v % 60 === 0).length >= Math.ceil(vals.length * 0.6);
      return max >= 30 * 60 && manyDiv60;
    };
    const niceStep = (m: number) => (m<=30?5:m<=60?10:m<=120?15:m<=240?30:m<=480?60:120);
  
    const useSeconds = detectSeconds(rawAvgVals);
    const scale = useSeconds ? 60 : 1; // numeric units per minute
    const mins = rawAvgVals.map(v => v / scale);
    const maxMin = Math.max(0, ...mins);
    const stepMin = niceStep(maxMin || 60);
    const maxRoundedMin = Math.ceil((maxMin || stepMin) / stepMin) * stepMin;
    const ticks: { v:number; f:string }[] = [];
    for (let m = 0; m <= maxRoundedMin; m += stepMin) {
      const v = m * scale;
      const h = Math.floor(m / 60), mm = m % 60;
      ticks.push({ v, f: `${h.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}` });
    }
  
    // Options: compact height, slanted labels (just like total)
    const options: google.visualization.ComboChartOptions = {
      height: 160,
      legend: { position: 'right' },
      tooltip: { isHtml: true },
      chartArea: { left: 50, top: 10, right: 20, width: '80%', height: '70%' },
      seriesType: 'bars',
      series: { 1: { type: 'line' } }, // 0=Avg bars, 1=Days line (tweak as you like)
      colors: color ? [color, '#333'] : undefined,
      hAxis: {
        slantedText: true,
        slantedTextAngle: 45,
        textStyle: { fontSize: 12 },
        showTextEvery: 1,
        maxAlternation: 1,
        minTextSpacing: 0
      },
      vAxes: {
        // v0: Avg time w/ hh:mm labels; v1: Days (right)
        0: { ticks, viewWindow: { min: 0, max: maxRoundedMin * scale } },
        1: { minValue: 0, format: '0' }
      },
      seriesMapping: undefined
    } as any;
  
    // map series to axes: 0 -> v0 (time), 1 -> v1 (days)
    (options as any).series = {
      0: { targetAxisIndex: 0, type: 'bars' },
      1: { targetAxisIndex: 1, type: 'line' }
    };
  
    // Use ComboChart to show both series clearly in the tiny height
    const chart = new google.visualization.ComboChart(container);
    chart.draw(dt, options);
  }

  
}
