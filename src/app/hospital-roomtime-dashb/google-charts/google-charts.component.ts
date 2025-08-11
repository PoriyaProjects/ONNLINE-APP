import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { sanitizeSoapResponse, sanitizeSoapChartData } from 'src/app/shared/sanitizesoapresponce';
import { drawHorizontalMultiPeriodChartHelperRoomTime } from 'src/app/shared/drawHorizontalMultiPeriodChartHelperRoomTime';

/** ✅ Move interfaces OUTSIDE the class */
interface DepartmentMetricEntry {
  period: string;
  source: string;
  aggregateDays?: number;
  avgMinutes?: number;
}

interface DepartmentData {
  departName: string;
  metrics: DepartmentMetricEntry[];
}

@Component({
  selector: 'app-google-charts-time',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css'],
  animations: [
    trigger('slideToggle', [
      state('closed', style({ height: '0', opacity: 0, overflow: 'hidden', padding: '0' })),
      state('open', style({ height: '*', opacity: 1, overflow: 'hidden', padding: '*' })),
      transition('closed <=> open', animate('300ms ease-in-out'))
    ])
  ]
})
export class RoomTimeDashboardComponent implements OnInit, AfterViewInit {
  departmentMap = new Map<string, DepartmentData>();
  selectedDepartmentCharts: any[] = [];

  readonly dataTypes = [
    { value: '1-Yesterday', label: 'אתמול' },
    { value: '2-CurrentMonth', label: 'החודש' },
    { value: '3-CurrentYear', label: 'השנה' },
    { value: '4-ParallelsPeriod', label: 'השוואתי' }
  ];
  selectedDataType = '2-CurrentMonth';
  activeTab: 'avg' | 'agg' = 'avg';

  dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];
  openGroup: string | null = null;

  readonly departmentColors: string[] = [
    '#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b',
    '#a17ef8', '#ff8c42', '#c4e86b', '#00d4a3', '#ff9ed4',
    '#8bdbf2', '#d48efc', '#ffb347'
  ];
  departmentColorMap: { [dept: string]: string } = {};
  legendMinimized = false;
  private resizeTimeout: any;

  elementIdsByPeriod = {
    '1-Yesterday': { MorningDelay: 'tableMorningDelay_1-Yesterday', EndDay: 'tableEndDay_1-Yesterday', SetupTime: 'tableSetupTime_1-Yesterday' },
    '2-CurrentMonth': { MorningDelay: 'tableMorningDelay_2-CurrentMonth', EndDay: 'tableEndDay_2-CurrentMonth', SetupTime: 'tableSetupTime_2-CurrentMonth' },
    '3-CurrentYear': { MorningDelay: 'tableMorningDelay_3-CurrentYear', EndDay: 'tableEndDay_3-CurrentYear', SetupTime: 'tableSetupTime_3-CurrentYear' },
    '4-ParallelsPeriod': { MorningDelay: 'tableMorningDelay_4-ParallelsPeriod', EndDay: 'tableEndDay_4-ParallelsPeriod', SetupTime: 'tableSetupTime_4-ParallelsPeriod' }
  };

  elementIdsByPeriodSummarized = {
    '1-Yesterday': { MorningDelay: 'summaryMorningDelay_1-Yesterday', EndDay: 'summaryEndDay_1-Yesterday', SetupTime: 'summarySetupTime_1-Yesterday' },
    '2-CurrentMonth': { MorningDelay: 'summaryMorningDelay_2-CurrentMonth', EndDay: 'summaryEndDay_2-CurrentMonth', SetupTime: 'summarySetupTime_2-CurrentMonth' },
    '3-CurrentYear': { MorningDelay: 'summaryMorningDelay_3-CurrentYear', EndDay: 'summaryEndDay_3-CurrentYear', SetupTime: 'summarySetupTime_3-CurrentYear' },
    '4-ParallelsPeriod': { MorningDelay: 'summaryMorningDelay_4-ParallelsPeriod', EndDay: 'summaryEndDay_4-ParallelsPeriod', SetupTime: 'summarySetupTime_4-ParallelsPeriod' }
  };

  


  constructor(public googleChartsService: GoogleChartsService) {}

  ngOnInit(): void {
    this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
   
  }

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());

    this.googleChartsService.drawSummarizedMultiPeriodChart(
      'multiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      '#6ba1f8'
    );

    this.loadAllPeriodCharts();

    this.googleChartsService.drawAllDepartmentTables(
      this.elementIdsByPeriod,
      `${environment.url}/GetRoomTimeAvgD`
    );

    this.googleChartsService.drawAllDepartmentTablesSum(
      this.elementIdsByPeriodSummarized,
      `${environment.url}/GetRoomAggregateDaysD`
    );


    this.loadAllAggregateData();
    this.loadAllAverageData();

    const stickyEl = document.getElementById('stickyTabsFilters'); // the one you want to release
    const markerEl = document.getElementById('deptStickyStart'); // the target marker
  
    if (!stickyEl || !markerEl) return;
  
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Marker is visible — release sticky
            stickyEl.classList.remove('is-sticky');
          } else {
            // Marker not visible — keep sticky
            stickyEl.classList.add('is-sticky');
          }
        });
      },
      { root: null, threshold: 0 } // default viewport root, trigger when any part is visible
    );
  
    observer.observe(markerEl);

  }

 
  @HostListener('window:resize')
onResize() {
  clearTimeout(this.resizeTimeout);
  this.resizeTimeout = setTimeout(() => {
    this.loadCharts();                    
    this.redrawVisibleDepartmentCharts(); 
  }, 300);
}

  onDataTypeChange(): void {
    setTimeout(() => this.loadCharts(), 100);
  }

  onTabChange(tab: 'avg' | 'agg'): void {
    this.activeTab = tab;
    this.openGroup = null;
    if (tab === 'agg' && this.selectedDataType === '1-Yesterday') {
      this.selectedDataType = '2-CurrentMonth';
    }
    setTimeout(() => {
      this.loadCharts();
      this.redrawVisibleDepartmentCharts();   
    }, 0);
  }

  
  onDeptTabChange(tab: 'avg' | 'agg') {
    this.activeDeptTab = tab;
    if (!this.selectedDepartment) return;
  
    const list = tab === 'avg' ? this.selectedDepartmentAvgCharts : this.selectedDepartmentAggCharts;
    if (!list?.length) return;
  
    const color = this.getDepartmentColor(this.selectedDepartment);
  
    // same base options used elsewhere
    const baseOptions: google.visualization.ColumnChartOptions = {
      annotations: { alwaysOutside: true, textStyle: { fontSize: 11, color: '#000', auraColor: 'none' } },
      legend: { position: 'bottom' },
      tooltip: { isHtml: true },
      chartArea: { left: 60, top: 60, width: '85%', height: '65%' },
      height: 400,
      hAxis: {
        slantedText: true,
        slantedTextAngle: 45,
        textStyle: { fontSize: 12 },
        showTextEvery: 1,
        maxAlternation: 1,
        minTextSpacing: 0
      }
    };
  
    // wait for DOM to settle, then draw
    requestAnimationFrame(() => {
      list.forEach((cfg: { containerId: string; data: any[][]; chartTitle: string; vAxis?: any }) => {
        this.googleChartsService.drawDepartmentChart({
          containerId: cfg.containerId,
          data: cfg.data,
          chartType: 'ColumnChart', 
          color,
          options: {
            ...baseOptions,
            vAxis: cfg.vAxis,                 
            title: cfg.chartTitle,            
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              color: '#000',
              alignment: 'center'
            }
          }
        });
      });
    });
  }
  

  getDepartmentColor(department: string): string {
    if (!this.departmentColorMap[department]) {
      const stored = localStorage.getItem(`deptColor_${department}`);
      if (stored) {
        this.departmentColorMap[department] = stored;
      } else {
        const index = Object.keys(this.departmentColorMap).length % this.departmentColors.length;
        const color = this.departmentColors[index];
        this.departmentColorMap[department] = color;
        localStorage.setItem(`deptColor_${department}`, color);
      }
    }
    return this.departmentColorMap[department];
  }

  loadAllPeriodCharts(): void {
    const url = `${environment.url}/GetRoomTimeSummaryAllSeparated`;    
  }

  loadCharts(): void {
    const chartsConfig = this.activeTab === 'avg'
      ? {
          ids: { MorningDelay: 'chartMorningDelayAvg', EndDay: 'chartEndDayAvg', SetupTime: 'chartSetupTimeAvg' },
          url: `${environment.url}/GetRoomTimeAvgD`,
          title: 'זמן ממוצע',
          isDays: false
        }
      : {
          ids: { MorningDelay: 'chartMorningDelayAgg', EndDay: 'chartEndDayAgg', SetupTime: 'chartSetupTimeAgg' },
          url: `${environment.url}/GetRoomAggregateDaysD`,
          title: 'ימי אובדן',
          isDays: true
        };

    this.googleChartsService.drawDepartmentChartsWithColors(
      chartsConfig.ids,
      chartsConfig.url,
      this.selectedDataType,
      chartsConfig.title,
      (dept: string) => this.getDepartmentColor(dept),
      chartsConfig.isDays
    );

    this.googleChartsService.drawRoomTimeDualArcCharts({
      'MorningDelay_agg': 'MorningDelay_agg',
      'MorningDelay_avg': 'MorningDelay_avg',
      'EndDay_agg': 'EndDay_agg',
      'EndDay_avg': 'EndDay_avg',
      'SetupTime_agg': 'SetupTime_agg',
      'SetupTime_avg': 'SetupTime_avg',
    });

    this.googleChartsService.getAggregateData(this.selectedDataType)
    .subscribe((xml: string) => {
      const data = sanitizeSoapChartData(xml);
  
      
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          aggregateDays: row.Value
        });
      });
  
      
    });

    this.googleChartsService.getAverageData(this.selectedDataType)
    .subscribe((xml: string) => {
      const data = sanitizeSoapChartData(xml);
  
      
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          aggregateDays: row.Value
        });
      });
  
      
    });

  }

  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    localStorage.setItem('legendMinimized', this.legendMinimized.toString());
  }

  getDepartments(): string[] {
    return Array.from(this.departmentMap.keys());
  }

  toggleGroup(group: string): void {
    this.openGroup = this.openGroup === group ? null : group;
    if (this.openGroup) {
      setTimeout(() => {
        const el = document.getElementById(`group_${group}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const offset = window.pageYOffset + rect.top - 60;
          window.scrollTo({ top: offset, behavior: 'smooth' });
          el.classList.add('flash-highlight');
          setTimeout(() => el.classList.remove('flash-highlight'), 1500);
        }
      }, 300);
    }
  }

  isOpen(group: string): boolean {
    return this.openGroup === group;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.openGroup) return;

    const clickTarget = event.target as Node;

    const activeCard = document.querySelector(`.toggle-details[data-group="${this.openGroup}"]`)?.closest('.card');
    const activeDetails = document.getElementById(`details_${this.openGroup}`);

    if (activeCard && activeDetails && !activeCard.contains(clickTarget) && !activeDetails.contains(clickTarget)) {
      this.openGroup = null;
    }
  }

  
  loadAllAggregateData() {
    this.dataTypes.forEach(period => {
      const dataType = period.value;
  
      this.googleChartsService.getAggregateData(dataType).subscribe(response => {
        const data = sanitizeSoapResponse(response);
  
        if (!data?.rows) return;
  
        data.rows.forEach(row => {
          this.insertDepartmentMetric(row.c[2].v, {
            period: row.c[1].v,           
            source: row.c[0].v,           
            aggregateDays: row.c[4].v     
          });
        });
      });
    });
  }
  
  

  loadAllAverageData() {
    this.dataTypes.forEach(period => {
      const dataType = period.value;
  
      this.googleChartsService.getAverageData(dataType).subscribe(response => {
        const data = sanitizeSoapResponse(response);
        if (!data?.rows) return;
  
        data.rows.forEach(row => {
          const avgMinutes = Number(row.c[4].v);
          this.insertDepartmentMetric(row.c[2].v, {
            period: row.c[1].v,
            source: row.c[0].v,
            avgMinutes
          });
        });
      });
    });
  }
  
  
  
  

  insertDepartmentMetric(departName: string, newMetric: DepartmentMetricEntry) {
    
    if (!this.departmentMap.has(departName)) {
      
      this.departmentMap.set(departName, { departName, metrics: [] });
    }
  
    const dept = this.departmentMap.get(departName)!;
    const existing = dept.metrics.find(
      m => m.period === newMetric.period && m.source === newMetric.source
    );
  
    if (existing) {
      if (newMetric.avgMinutes !== undefined) {
        existing.avgMinutes = newMetric.avgMinutes;
      }
      if (newMetric.aggregateDays !== undefined) {
        existing.aggregateDays = newMetric.aggregateDays;
      }
    } else {
      dept.metrics.push({ ...newMetric });
    }
  }
  

  convertTimeToMinutes(timeStr: string): number {
    const [hh, mm] = timeStr.split(':');
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
  }


  selectedDepartment: string | null = null;
  
  public selectedDepartmentChartChunks: any[][] = [];



selectDepartment(deptName: string) {
  this.selectedDepartment = deptName;
  const dept = this.departmentMap.get(deptName);
  if (!dept) return;

  // reset lists
  this.selectedDepartmentAvgCharts = [];
  this.selectedDepartmentAggCharts = [];
  this.selectedDepartmentCharts = []; 

  
  const grouped = new Map<string, Map<string, { avgRaw?: number; days?: number }>>();
  for (const { source, period, avgMinutes, aggregateDays } of dept.metrics) {
    if (!grouped.has(source)) grouped.set(source, new Map());
    const byPeriod = grouped.get(source)!;
    if (!byPeriod.has(period)) byPeriod.set(period, {});
    const rec = byPeriod.get(period)!;
    if (avgMinutes !== undefined)  rec.avgRaw = Number(avgMinutes);     
    if (aggregateDays !== undefined) rec.days = Number(aggregateDays);
  }

  // column order
  const displayOrder = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];

  // base chart options (shared)
  const baseOptions: any = {
    annotations: { alwaysOutside: true, textStyle: { fontSize: 11, color: '#000', auraColor: 'none' } },
    legend: { position: 'bottom' },
    tooltip: { isHtml: true },
    chartArea: { left: 60, top: 60, width: '85%', height: '65%' },
    height: 400,
    // insist on slanted labels
    hAxis: {
      slantedText: true,
      slantedTextAngle: 45,
      textStyle: { fontSize: 12 },
      showTextEvery: 1,
      maxAlternation: 1,
      minTextSpacing: 0
    }
  };

  // ===== helpers for Avg axis =====
  const niceMinuteStep = (maxMin: number) =>
    maxMin <= 30 ? 5 : maxMin <= 60 ? 10 : maxMin <= 120 ? 15 : maxMin <= 240 ? 30 : maxMin <= 480 ? 60 : 120;

  // detect if a series is in SECONDS (not minutes)
  const detectSeconds = (values: number[]) => {
    if (!values.length) return false;
    const max = Math.max(...values);
    const manyDiv60 = values.filter(v => v % 60 === 0).length >= Math.ceil(values.length * 0.6);
    return max >= 30 * 60 && manyDiv60; // ≥ 30 min and many divisible by 60 ⇒ likely seconds
  };

  // build {v,f:'hh:mm'} ticks at proper numeric positions
  const buildTimeTicks = (valuesRaw: number[]) => {
    if (!valuesRaw.length) return { ticks: [], max: 0 };
    const useSeconds = detectSeconds(valuesRaw);
    const scale = useSeconds ? 60 : 1;            // numeric units per 1 minute on the axis
    const mins = valuesRaw.map(v => v / scale);   // normalize to minutes for step calc
    const maxMin = Math.max(0, ...mins);
    const stepMin = niceMinuteStep(maxMin || 60);
    const maxRoundedMin = Math.ceil((maxMin || stepMin) / stepMin) * stepMin;

    const ticks: { v: number; f: string }[] = [];
    for (let m = 0; m <= maxRoundedMin; m += stepMin) {
      ticks.push({ v: m * scale, f: this.formatMinutesToHHMM(m) });
    }
    return { ticks, max: maxRoundedMin * scale, useSeconds };
  };

  // ===== build per-source charts =====
  grouped.forEach((byPeriod, source) => {
    const avgData: any[][] = [
      ['DataType', 'AvgTime', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]
    ];
    const aggData: any[][] = [
      ['DataType', 'Aggregate Days', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]
    ];

    // collect rows once (so we can detect seconds correctly)
    const rowsForSource: Array<{ dt: string; raw: number; days: number }> = [];
    displayOrder.forEach(dt => {
      const v = byPeriod.get(dt);
      if (!v) return;
      rowsForSource.push({
        dt,
        raw: Number((v as any).avgRaw ?? 0),            // minutes OR seconds (raw numeric)
        days: Number((v as any).days ?? 0)
      });
    });

    // detect unit and push rows with translated labels
    const useSeconds = detectSeconds(rowsForSource.map(r => r.raw));
    const toDisplayMinutes = (val: number) => useSeconds ? Math.round(val / 60) : Math.round(val);

    rowsForSource.forEach(({ dt, raw, days }) => {
      const label = this.translateTimeframe(dt);        // ✅ X-axis bar names in Hebrew
      const displayMin = toDisplayMinutes(raw);         // for tooltip/annotation only
      const tip = `זמן ממוצע: ${this.formatMinutesToHHMM(displayMin)}\nימי אובדן: ${days}`;

      avgData.push([label, raw, tip, this.formatMinutesToHHMM(displayMin)]);
      aggData.push([label, days, tip, String(days)]);
    });

    // precompute vAxis (Avg -> hh:mm ticks; Agg -> integer days)
    const { ticks, max } = buildTimeTicks(rowsForSource.map(r => r.raw));

    const safeDept = deptName.replace(/\s+/g, '_');
    const safeSrc  = source.replace(/\s+/g, '_');

    const avgCfg = {
      dept: deptName,
      source,
      containerId: `chart_avg_${safeDept}_${safeSrc}`,
      data: avgData,
      chartTitle: `${this.convertSourceToHebrew(source)} – ${deptName} (זמן ממוצע)`,
      vAxis: { ticks, viewWindow: { min: 0, max } },
      titleTextStyle: { fontSize: 16, bold: true, color: '#000', alignment: 'center' }
    };
    const aggCfg = {
      dept: deptName,
      source,
      containerId: `chart_agg_${safeDept}_${safeSrc}`,
      data: aggData,
      chartTitle: `${this.convertSourceToHebrew(source)} – ${deptName} (ימי אובדן)`,
      vAxis: { minValue: 0, format: '0' },
      titleTextStyle: { fontSize: 16, bold: true, color: '#000', alignment: 'center' }
    };

    this.selectedDepartmentAvgCharts.push(avgCfg);
    this.selectedDepartmentAggCharts.push(aggCfg);
    this.selectedDepartmentCharts.push(avgCfg, aggCfg); // legacy
  });

  // chunk for grid
  this.selectedDepartmentAvgChartChunks = this.chunkArray(this.selectedDepartmentAvgCharts, 3);
  this.selectedDepartmentAggChartChunks = this.chunkArray(this.selectedDepartmentAggCharts, 3);
  this.selectedDepartmentChartChunks    = this.chunkArray(this.selectedDepartmentCharts, 3); // legacy

  // draw only the visible sub-tab (ensures slanted X + hh:mm for Avg)
  setTimeout(() => {
    const isAvg = this.activeDeptTab === 'avg';
    const list  = isAvg ? this.selectedDepartmentAvgCharts : this.selectedDepartmentAggCharts;
    const color = this.getDepartmentColor(deptName);

    list.forEach((cfg: any) => {
      const options = {
        ...baseOptions,
        vAxis: cfg.vAxis // Avg: hh:mm ticks; Agg: integer days
      };

      
      this.googleChartsService.drawDepartmentChart({
        containerId: cfg.containerId,
        data: cfg.data,
        chartType: 'ColumnChart',          // classic => slantedText works
        color,
        options: {
          ...options,                      // keep your vAxis/hAxis/etc.
          title: cfg.chartTitle,           // <-- set title here (not just in cfg)
          titleTextStyle: {
            fontSize: 16,
            bold: true,
            color: '#000',
            alignment: 'center'
          }
        }
      });
      
    });
  }, 0);

  setTimeout(() => {
    this.googleChartsService.drawSummarizedMultiPeriodChartForDepartment(
      'DeptmultiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      this.getDepartmentColor(deptName),
      deptName,
      {
        // optional overrides:
        // deptParamKey: 'Depart_Name',
        // matchDept: (rowName, wanted) => rowName?.toLowerCase() === wanted.toLowerCase()
      }
    );
  }, 0);
  
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

  convertSourceToHebrew(source: string): string {
    const map: Record<string, string> = {
      'MorningDelay': 'איחור בוקר',
      'EndDay': 'סיום יום',
      'SetupTime': 'זמן התארגנות'
    };
    return map[source] || source;
  }
  
  generateHHMMAxisTicks(): { v: number; f: string }[] {
    const ticks = [];
    for (let mins = 0; mins <= 240; mins += 30) {
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      const label = `${hours}:${minutes.toString().padStart(2, '0')}`;
      ticks.push({ v: mins, f: label });
    }
    return ticks;
  }

  
  formatMinutesToHHMM(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  getChartContainerId(dept: string, source: string): string {
    return `chart_${dept}_${source}`.replace(/\s+/g, '_');
  }

  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }




  // under existing fields:
activeDeptTab: 'avg' | 'agg' = 'avg';

selectedDepartmentAvgCharts: any[] = [];
selectedDepartmentAggCharts: any[] = [];
selectedDepartmentAvgChartChunks: any[][] = [];
selectedDepartmentAggChartChunks: any[][] = [];




/** Format minutes -> "hh:mm" (you already have formatMinutesToHHMM; use that if you like) */
private toHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}

/** Build nice tick size for minutes axis */
private niceMinuteStep(maxVal: number): number {
  if (maxVal <= 30) return 5;
  if (maxVal <= 60) return 10;
  if (maxVal <= 120) return 15;
  if (maxVal <= 240) return 30;
  if (maxVal <= 480) return 60;
  return 120;
}

/** Build vAxis ticks as {v:number,f:string} showing hh:mm, based on chart data rows */
private buildMinuteTicks(dataTableArray: any[][]): { v: number; f: string }[] {
  // data: [ ['DataType','Value',...], ['1-Yesterday', 34, ...], ... ]
  const vals = dataTableArray.slice(1).map(r => Number(r[1]) || 0);
  const maxVal = Math.max(0, ...vals);
  const step = this.niceMinuteStep(maxVal || 60);
  const maxRounded = Math.ceil((maxVal || step) / step) * step;

  const ticks: { v:number; f:string }[] = [];
  for (let v = 0; v <= maxRounded; v += step) {
    ticks.push({ v, f: this.toHHMM(v) });
  }
  return ticks;
}

/** Merge without losing existing nested option branches */
private deepMerge<T>(a: T, b: Partial<T>): T {
  const out: any = Array.isArray(a) ? [...(a as any)] : { ...(a as any) };
  for (const [k, v] of Object.entries(b as any)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = this.deepMerge(out[k] ?? {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// /** Apply dept-chart overrides, leaving other options intact */
// private applyDeptChartOptions(
//   kind: 'avg' | 'agg',
//   base: any,
//   dataTableArray: any[][]
// ): any {
//   // always slanted X labels
//   let merged = this.deepMerge(base || {}, {
//     hAxis: { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 12 } }
//   });

//   if (kind === 'avg') {
//     // Y axis in hh:mm
//     const ticks = this.buildMinuteTicks(dataTableArray);
//     merged = this.deepMerge(merged, {
//       vAxis: {
//         ticks,               // show "hh:mm" labels
//         viewWindow: {
//           min: 0,
//           max: ticks.length ? ticks[ticks.length - 1].v : undefined
//         }
//       }
//     });
//   }
//   return merged;
// }

/** Redraw the department charts that are currently visible (avg/agg sub-tab) */
private redrawVisibleDepartmentCharts(): void {
  if (!this.selectedDepartment) return;

  const baseOptions: any = {
    annotations: { alwaysOutside: true, textStyle: { fontSize: 11, color: '#000', auraColor: 'none' } },
    legend: { position: 'bottom' },
    tooltip: { isHtml: true },
    chartArea: { left: 60, top: 60, width: '85%', height: '65%' },
    height: 400,
    hAxis: {
      slantedText: true,
      slantedTextAngle: 45,
      textStyle: { fontSize: 12 },
      showTextEvery: 1,
      maxAlternation: 1,
      minTextSpacing: 0
    }
  };

  // pick the active sub-tab list
  const list = this.activeDeptTab === 'avg'
    ? this.selectedDepartmentAvgCharts
    : this.selectedDepartmentAggCharts;

  const color = this.getDepartmentColor(this.selectedDepartment);

  // redraw each chart with its precomputed vAxis + centered title
  requestAnimationFrame(() => {
    list.forEach((cfg: any) => {
      this.googleChartsService.drawDepartmentChart({
        containerId: cfg.containerId,
        data: cfg.data,
        chartType: 'ColumnChart',
        color,
        options: {
          ...baseOptions,
          vAxis: cfg.vAxis,                 // <-- keeps hh:mm ticks for avg / integer for agg
          title: cfg.chartTitle,
          titleTextStyle: {
            fontSize: 16,
            bold: true,
            color: '#000',
            alignment: 'center'
          }
        }
      });
    });
  });
}

}
