import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse, sanitizeSoapChartData } from 'src/app/shared/sanitizesoapresponce';

import {
  CHART_SERIES_PALETTE,
  PERIOD_TYPE_MAP,
  DEPARTMENT_BASE_PALETTE,
  DepartmentColorService,
  translateDataSource,
  translateTimeframe,
  formatToHHMM,
  buildTimeTicksFromRaw,
  buildColumnOptions,
  buildDeptDrilldown,
  stickyByMarker
} from '../../shared/charts-config';

interface DepartmentMetricEntry {
  period: string;
  source: string;
  aggregateDays?: number;
  avgMinutes?: number; // raw numeric (minutes or seconds)
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
      state('open',   style({ height: '*', opacity: 1, overflow: 'hidden', padding: '*' })),
      transition('closed <=> open', animate('300ms ease-in-out'))
    ])
  ]
})
export class RoomTimeDashboardComponent implements OnInit, AfterViewInit {
  departmentMap = new Map<string, DepartmentData>();
  selectedDepartmentCharts: any[] = [];

  readonly dataTypes = [
    { value: '1-Yesterday',      label: PERIOD_TYPE_MAP['1-Yesterday'].label },
    { value: '2-CurrentMonth',   label: PERIOD_TYPE_MAP['2-CurrentMonth'].label },
    { value: '3-CurrentYear',    label: PERIOD_TYPE_MAP['3-CurrentYear'].label },
    { value: '4-ParallelsPeriod',label: PERIOD_TYPE_MAP['4-ParallelsPeriod'].label }
  ];
  selectedDataType = '2-CurrentMonth';
  activeTab: 'avg' | 'agg' = 'avg';

  dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];
  openGroup: string | null = null;

  legendMinimized = false;
  private resizeTimeout: any;

  elementIdsByPeriod = {
    '1-Yesterday':       { MorningDelay: 'tableMorningDelay_1-Yesterday',       EndDay: 'tableEndDay_1-Yesterday',       SetupTime: 'tableSetupTime_1-Yesterday' },
    '2-CurrentMonth':    { MorningDelay: 'tableMorningDelay_2-CurrentMonth',    EndDay: 'tableEndDay_2-CurrentMonth',    SetupTime: 'tableSetupTime_2-CurrentMonth' },
    '3-CurrentYear':     { MorningDelay: 'tableMorningDelay_3-CurrentYear',     EndDay: 'tableEndDay_3-CurrentYear',     SetupTime: 'tableSetupTime_3-CurrentYear' },
    '4-ParallelsPeriod': { MorningDelay: 'tableMorningDelay_4-ParallelsPeriod', EndDay: 'tableEndDay_4-ParallelsPeriod', SetupTime: 'tableSetupTime_4-ParallelsPeriod' }
  };

  elementIdsByPeriodSummarized = {
    '1-Yesterday':       { MorningDelay: 'summaryMorningDelay_1-Yesterday',       EndDay: 'summaryEndDay_1-Yesterday',       SetupTime: 'summarySetupTime_1-Yesterday' },
    '2-CurrentMonth':    { MorningDelay: 'summaryMorningDelay_2-CurrentMonth',    EndDay: 'summaryEndDay_2-CurrentMonth',    SetupTime: 'summarySetupTime_2-CurrentMonth' },
    '3-CurrentYear':     { MorningDelay: 'summaryMorningDelay_3-CurrentYear',     EndDay: 'summaryEndDay_3-CurrentYear',     SetupTime: 'summarySetupTime_3-CurrentYear' },
    '4-ParallelsPeriod': { MorningDelay: 'summaryMorningDelay_4-ParallelsPeriod', EndDay: 'summaryEndDay_4-ParallelsPeriod', SetupTime: 'summarySetupTime_4-ParallelsPeriod' }
  };

  // dept drilldown
  activeDeptTab: 'avg' | 'agg' = 'avg';
  selectedDepartment: string | null = null;
  selectedDepartmentAvgCharts: any[] = [];
  selectedDepartmentAggCharts: any[] = [];
  selectedDepartmentAvgChartChunks: any[][] = [];
  selectedDepartmentAggChartChunks: any[][] = [];
  public selectedDepartmentChartChunks: any[][] = [];

  constructor(
    public googleChartsService: GoogleChartsService,
    private deptColors: DepartmentColorService
  ) {}

  ngOnInit(): void {
    this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
  }

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());

    this.googleChartsService.drawSummarizedMultiPeriodChart(
      'multiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      '#A39DCD'
    );

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

    stickyByMarker('stickyTabsFilters', 'deptStickyStart');
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
    if (tab === 'agg' && this.selectedDataType === '1-Yesterday') this.selectedDataType = '2-CurrentMonth';
    setTimeout(() => {
      this.loadCharts();
      this.redrawVisibleDepartmentCharts();
    }, 0);
  }

  onDeptTabChange(tab: 'avg' | 'agg') {
    this.activeDeptTab = tab;
    if (!this.selectedDepartment) return;

    const list = tab === 'avg' ? this.selectedDepartmentAvgCharts : this.selectedDepartmentAggCharts;
    if (!list || !list.length) return;

    const color = this.deptColors.colorFor(this.selectedDepartment);

    requestAnimationFrame(() => {
      list.forEach((cfg: { containerId: string; data: any[][]; chartTitle: string; vAxis?: any }) => {
        this.googleChartsService.drawDepartmentChart({
          containerId: cfg.containerId,
          data: cfg.data,
          chartType: 'ColumnChart',
          color,
          options: buildColumnOptions({
            vAxis: cfg.vAxis,
            title: cfg.chartTitle,
            titleTextStyle: { fontSize: 16, bold: true, color: '#000', alignment: 'center' }
          })
        });
      });
    });
  }

  public getDepartmentColor(department: string): string {
    return this.deptColors.colorFor(department);
  }

  // ===== Main charts =====
  loadCharts(): void {
    const chartsConfig = this.activeTab === 'avg'
      ? { ids: { MorningDelay: 'chartMorningDelayAvg', EndDay: 'chartEndDayAvg', SetupTime: 'chartSetupTimeAvg' },
          url: `${environment.url}/GetRoomTimeAvgD`, title: 'זמן ממוצע', isDays: false }
      : { ids: { MorningDelay: 'chartMorningDelayAgg', EndDay: 'chartEndDayAgg', SetupTime: 'chartSetupTimeAgg' },
          url: `${environment.url}/GetRoomAggregateDaysD`, title: 'ימי אובדן', isDays: true };

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
      'SetupTime_avg': 'SetupTime_avg'
    });

    // period data for legend + drilldown
    this.googleChartsService.getAggregateData(this.selectedDataType).subscribe((xml: string) => {
      const data = sanitizeSoapChartData(xml);
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          aggregateDays: row.Value
        });
      });
    });

    this.googleChartsService.getAverageData(this.selectedDataType).subscribe((xml: string) => {
      const data = sanitizeSoapChartData(xml);
      data.forEach(row => {
        this.insertDepartmentMetric(row.Depart_Name, {
          period: row.PeriodDate,
          source: row.DataSource,
          avgMinutes: row.Value
        });
      });
    });
  }

  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    localStorage.setItem('legendMinimized', String(this.legendMinimized));
  }

  getDepartments(): string[] {
    return Array.from(this.departmentMap.keys());
  }

  toggleGroup(group: string): void {
    this.openGroup = this.openGroup === group ? null : group;
    if (this.openGroup) {
      setTimeout(() => {
        const el = document.getElementById('group_' + group);
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

  isOpen(group: string): boolean { return this.openGroup === group; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.openGroup) return;
    const clickTarget = event.target as Node;
    const activeCard = document.querySelector('.toggle-details[data-group="' + this.openGroup + '"]')?.closest('.card') as HTMLElement;
    const activeDetails = document.getElementById('details_' + this.openGroup);
    if (activeCard && activeDetails && !activeCard.contains(clickTarget) && !activeDetails.contains(clickTarget)) {
      this.openGroup = null;
    }
  }

  // ===== Load entire dataset for all periods (tables) =====
  loadAllAggregateData() {
    this.dataTypes.forEach(period => {
      const dataType = period.value;
      this.googleChartsService.getAggregateData(dataType).subscribe(response => {
        const data = sanitizeSoapResponse(response);
        if (!data || !data.rows) return;
        data.rows.forEach((row: any) => {
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
        if (!data || !data.rows) return;
        data.rows.forEach((row: any) => {
          const avg = Number(row.c[4].v);
          this.insertDepartmentMetric(row.c[2].v, {
            period: row.c[1].v,
            source: row.c[0].v,
            avgMinutes: avg
          });
        });
      });
    });
  }

  insertDepartmentMetric(departName: string, newMetric: DepartmentMetricEntry) {
    if (!this.departmentMap.has(departName)) {
      this.departmentMap.set(departName, { departName: departName, metrics: [] });
    }
    const dept = this.departmentMap.get(departName)!;
    const existing = dept.metrics.find(m => m.period === newMetric.period && m.source === newMetric.source);
    if (existing) {
      if (newMetric.avgMinutes !== undefined) existing.avgMinutes = newMetric.avgMinutes;
      if (newMetric.aggregateDays !== undefined) existing.aggregateDays = newMetric.aggregateDays;
    } else {
      dept.metrics.push({ ...newMetric });
    }
  }

  // =============== Department drilldown ===============
  selectDepartment(deptName: string) {
    this.selectedDepartment = deptName;
    const dept = this.departmentMap.get(deptName);
    if (!dept) return;

    this.selectedDepartmentAvgCharts = [];
    this.selectedDepartmentAggCharts = [];
    this.selectedDepartmentCharts = [];

    // group metrics by source -> period
    const grouped = new Map<string, Map<string, { avg?: number; days?: number }>>();
    for (let i = 0; i < dept.metrics.length; i++) {
      const m = dept.metrics[i];
      if (!grouped.has(m.source)) grouped.set(m.source, new Map());
      const byPeriod = grouped.get(m.source)!;
      if (!byPeriod.has(m.period)) byPeriod.set(m.period, {});
      const rec = byPeriod.get(m.period)!;
      if (m.avgMinutes !== undefined) rec.avg = Number(m.avgMinutes);
      if (m.aggregateDays !== undefined) rec.days = Number(m.aggregateDays);
    }

    const displayOrder = ['1-Yesterday', '2-CurrentMonth', '3-CurrentYear', '4-ParallelsPeriod'];

    grouped.forEach((byPeriod, source) => {
      const metricsArr: Array<{ period: string; avg?: number; days?: number }> = [];
      for (let i = 0; i < displayOrder.length; i++) {
        const p = displayOrder[i];
        const rec = byPeriod.get(p) || {};
        metricsArr.push({ period: p, avg: (rec as any).avg, days: (rec as any).days });
      }

      const built = buildDeptDrilldown(metricsArr, displayOrder);

      const safeDept = deptName.replace(/\s+/g, '_');
      const safeSrc  = source.replace(/\s+/g, '_');

      this.selectedDepartmentAvgCharts.push({
        containerId: 'chart_avg_' + safeDept + '_' + safeSrc,
        data: built.avgData,
        chartTitle: translateDataSource(source) + ' – ' + deptName + ' (זמן ממוצע)',
        vAxis: built.vAxisAvg
      });
      this.selectedDepartmentAggCharts.push({
        containerId: 'chart_agg_' + safeDept + '_' + safeSrc,
        data: built.aggData,
        chartTitle: translateDataSource(source) + ' – ' + deptName + ' (ימי אובדן)',
        vAxis: built.vAxisAgg
      });

      this.selectedDepartmentCharts.push(
        this.selectedDepartmentAvgCharts[this.selectedDepartmentAvgCharts.length - 1],
        this.selectedDepartmentAggCharts[this.selectedDepartmentAggCharts.length - 1]
      );
    });

    this.selectedDepartmentAvgChartChunks = this.chunkArray(this.selectedDepartmentAvgCharts, 3);
    this.selectedDepartmentAggChartChunks = this.chunkArray(this.selectedDepartmentAggCharts, 3);
    this.selectedDepartmentChartChunks    = this.chunkArray(this.selectedDepartmentCharts, 3);

    setTimeout(() => {
      const isAvg = this.activeDeptTab === 'avg';
      const list  = isAvg ? this.selectedDepartmentAvgCharts : this.selectedDepartmentAggCharts;
      const color = this.getDepartmentColor(deptName);

      list.forEach((cfg: any) => {
        this.googleChartsService.drawDepartmentChart({
          containerId: cfg.containerId,
          data: cfg.data,
          chartType: 'ColumnChart',
          color,
          options: buildColumnOptions({
            vAxis: cfg.vAxis,
            title: cfg.chartTitle,
            titleTextStyle: { fontSize: 16, bold: true, color: '#000', alignment: 'center' }
          })
        });
      });
    }, 0);

    setTimeout(() => {
      this.googleChartsService.drawSummarizedMultiPeriodChartForDepartment(
        'DeptmultiPeriodSummary',
        `${environment.url}/GetRoomTimeAvgD`,
        `${environment.url}/GetRoomAggregateDaysD`,
        this.getDepartmentColor(deptName),
        deptName
      );
    }, 0);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) result.push(array.slice(i, i + chunkSize));
    return result;
  }

  private redrawVisibleDepartmentCharts(): void {
    if (!this.selectedDepartment) return;

    const list = this.activeDeptTab === 'avg'
      ? this.selectedDepartmentAvgCharts
      : this.selectedDepartmentAggCharts;

    const color = this.getDepartmentColor(this.selectedDepartment);

    requestAnimationFrame(() => {
      list.forEach((cfg: any) => {
        this.googleChartsService.drawDepartmentChart({
          containerId: cfg.containerId,
          data: cfg.data,
          chartType: 'ColumnChart',
          color,
          options: buildColumnOptions({
            vAxis: cfg.vAxis,
            title: cfg.chartTitle,
            titleTextStyle: { fontSize: 16, bold: true, color: '#000', alignment: 'center' }
          })
        });
      });
    });
  }
}
