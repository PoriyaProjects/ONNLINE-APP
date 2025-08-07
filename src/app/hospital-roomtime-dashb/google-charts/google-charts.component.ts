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

  }

  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.loadCharts(), 300);
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
    setTimeout(() => this.loadCharts(), 0);
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
    // You can expand this if you intend to use these element IDs
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
  
      // Example: use data to populate department metrics or charts
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          aggregateDays: row.Value
        });
      });
  
      // Or pass directly to chart renderer:
      //this.renderChartFromData(data);
      //drawDepartmentChartsWithColors
    });

    this.googleChartsService.getAverageData(this.selectedDataType)
    .subscribe((xml: string) => {
      const data = sanitizeSoapChartData(xml);
  
      // Example: use data to populate department metrics or charts
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          aggregateDays: row.Value
        });
      });
  
      // Or pass directly to chart renderer:
      //this.renderChartFromData(data);
      //drawDepartmentChartsWithColors
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
      const dataType = period.value; // 👈 get string value
  
      this.googleChartsService.getAggregateData(dataType).subscribe(response => {
        const data = sanitizeSoapResponse(response);
  
        if (!data?.rows) return;
  
        data.rows.forEach(row => {
          this.insertDepartmentMetric(row.c[2].v, {
            period: row.c[1].v,           // DataType (e.g., "2-CurrentMonth")
            source: row.c[0].v,           // DataSource (e.g., "EndDay")
            aggregateDays: row.c[4].v     // Value
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
    //this.departmentMap.clear();
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
  const data = this.departmentMap.get(deptName);
  if (!data) return;

  this.selectedDepartmentCharts = [];

  const sourceDataMap = new Map<string, Map<string, { avgMinutes?: number; aggregateDays?: number }>>();

  // Group data by source and period
  data.metrics.forEach(entry => {
    const { source, period, avgMinutes, aggregateDays } = entry;

    if (!sourceDataMap.has(source)) {
      sourceDataMap.set(source, new Map());
    }

    const dataTypeMap = sourceDataMap.get(source)!;

    if (!dataTypeMap.has(period)) {
      dataTypeMap.set(period, {});
    }

    const record = dataTypeMap.get(period)!;
    if (avgMinutes !== undefined) record.avgMinutes = avgMinutes;
    if (aggregateDays !== undefined) record.aggregateDays = aggregateDays;
  });

  // Define desired period display order
  const displayOrder = [
    '1-Yesterday',
    '2-CurrentMonth',
    '3-CurrentYear',
    '4-ParallelsPeriod'
  ];

  sourceDataMap.forEach((dataTypeMap, source) => {
    const avgChartData: any[][] = [
      ['DataType', 'AvgTime (min)', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]
    ];

    const aggChartData: any[][] = [
      ['DataType', 'Aggregate Days', { role: 'tooltip', type: 'string' }, { role: 'annotation' }]
    ];

    // Use desired order
    displayOrder.forEach(dataType => {
      const val = dataTypeMap.get(dataType);
      if (!val) return;

      const avg = val.avgMinutes ?? 0;
      const days = val.aggregateDays ?? 0;
      const tooltip = `זמן ממוצע: ${this.formatMinutesToHHMM(avg)}\nימי אובדן: ${days}`;

      avgChartData.push([
        dataType,
        avg,
        tooltip,
        this.formatMinutesToHHMM(avg)
      ]);

      aggChartData.push([
        dataType,
        days,
        tooltip,
        days.toString()
      ]);
    });

    const safeSource = source.replace(/\s+/g, '_');
    const safeDept = deptName.replace(/\s+/g, '_');

    const avgContainerId = `chart_avg_${safeDept}_${safeSource}`;
    const aggContainerId = `chart_agg_${safeDept}_${safeSource}`;

    const avgTitle = `${this.convertSourceToHebrew(source)} – ${deptName} (זמן ממוצע)`;
    const aggTitle = `${this.convertSourceToHebrew(source)} – ${deptName} (ימי אובדן)`;

    // Push chart configs for rendering template if needed
    this.selectedDepartmentCharts.push(
      {
        dept: deptName,
        source,
        containerId: avgContainerId,
        data: avgChartData,
        chartTitle: avgTitle
      },
      {
        dept: deptName,
        source,
        containerId: aggContainerId,
        data: aggChartData,
        chartTitle: aggTitle
      }
    );

    // Draw both charts
    setTimeout(() => {
      this.googleChartsService.drawDepartmentChart({
        containerId: avgContainerId,
        data: avgChartData,
        chartTitle: avgTitle,
        chartType: 'ColumnChart',
        color: this.getDepartmentColor(deptName),
        options: {
          annotations: {
            alwaysOutside: true,
            textStyle: { fontSize: 11, color: '#000', auraColor: 'none' }
          },
          hAxis: {
            slantedText: true,
            slantedTextAngle: 45,
            textStyle: { fontSize: 12 }
          },
          legend: { position: 'bottom' },
          tooltip: { isHtml: true },
          chartArea: { left: 60, top: 60, width: '85%', height: '65%' },
          height: 400
        }
      });

      this.googleChartsService.drawDepartmentChart({
        containerId: aggContainerId,
        data: aggChartData,
        chartTitle: aggTitle,
        chartType: 'ColumnChart',
        color: this.getDepartmentColor(deptName),
        options: {
          annotations: {
            alwaysOutside: true,
            textStyle: { fontSize: 11, color: '#000', auraColor: 'none' }
          },
          hAxis: {
            slantedText: true,
            slantedTextAngle: 45,
            textStyle: { fontSize: 12 }
          },
          legend: { position: 'bottom' },
          tooltip: { isHtml: true },
          chartArea: { left: 60, top: 60, width: '85%', height: '65%' },
          height: 400
        }
      });
    }, 0);
  });

  // Split charts into rows of 3
  this.selectedDepartmentChartChunks = this.chunkArray(this.selectedDepartmentCharts, 3);
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

}
