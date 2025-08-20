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
  stickyByMarker, PaletteService
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


export interface Surgery {
  surgeryId: string;
  patientNumber: string;
  surgeryName: string;
  surgeryCode: string;
  department: string;
  status: 'Planned' | 'InProgress' | 'Completed';
  timeEntrance: string;
  timeExit: string;
}

export interface RoomData {
  roomId: string;
  surgeries: Surgery[];
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
export class RoomTimeRTDashboardComponent implements OnInit, AfterViewInit {
  departmentMap = new Map<string, DepartmentData>();
  selectedDepartmentCharts: any[] = [];

selectedDate: string = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
roomsData: RoomData[] = [];
  openRoom: string | null = null; // track which widget is expanded


  readonly dataTypes = [
    { value: '1-Yesterday',       label: PERIOD_TYPE_MAP['1-Yesterday'].label },
    { value: '2-CurrentMonth',    label: PERIOD_TYPE_MAP['2-CurrentMonth'].label },
    { value: '3-CurrentYear',     label: PERIOD_TYPE_MAP['3-CurrentYear'].label },
    { value: '4-ParallelsPeriod', label: PERIOD_TYPE_MAP['4-ParallelsPeriod'].label }
  ];
  selectedDataType: '1-Yesterday'|'2-CurrentMonth'|'3-CurrentYear'|'4-ParallelsPeriod' = '2-CurrentMonth';
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

  // NEW: SetupTime Q charts (period -> chart div id)
  private setupTimeQChartIds: { [period: string]: string } = {
    '2-CurrentMonth':    'chartSetupTimeQ_2-CurrentMonth',
    '3-CurrentYear':     'chartSetupTimeQ_3-CurrentYear',
    '4-ParallelsPeriod': 'chartSetupTimeQ_4-ParallelsPeriod'
  };

  constructor(
    public googleChartsService: GoogleChartsService,
    private deptColors: DepartmentColorService,
    public palette: PaletteService
  ) {}

  ngOnInit(): void {
    this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
    this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

    this.googleChartsService.getSurgeryRooms(this.selectedDate).subscribe(data => {
     this.loadRoomsData();
  });
  }

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());

    this.googleChartsService.drawSummarizedMultiPeriodChart(
      'multiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      '#A39DCD'
    );

    // Tables with Q in last column
    this.googleChartsService.drawAllDepartmentTables(
      this.elementIdsByPeriod,
      `${environment.url}/GetRoomTimeAvgDQ`
    );

    this.googleChartsService.drawAllDepartmentTablesSum(
      this.elementIdsByPeriodSummarized,
      `${environment.url}/GetRoomAggregateDaysDQ`
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
      // redraw SetupTime Q charts if details are open
      if (this.isOpen('SetupTime')) this.drawSetupTimeQSection();
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
      if (this.isOpen('SetupTime')) this.drawSetupTimeQSection();
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
          url: `${environment.url}/GetRoomTimeAvgD`, title: '', isDays: false }
      : { ids: { MorningDelay: 'chartMorningDelayAgg', EndDay: 'chartEndDayAgg', SetupTime: 'chartSetupTimeAgg' },
          url: `${environment.url}/GetRoomAggregateDaysD`, title: '', isDays: true };

    this.googleChartsService.drawDepartmentChartsWithColors(
      chartsConfig.ids,
      chartsConfig.url,
      this.selectedDataType,
      chartsConfig.title,
      (dept: string) => this.getDepartmentColor(dept),
      chartsConfig.isDays
    );

    this.googleChartsService.drawRoomTimeArcCharts({
      'MorningDelay_agg': 'MorningDelay_agg',
      'MorningDelay_avg': 'MorningDelay_avg',
      'EndDay_agg': 'EndDay_agg',
      'EndDay_avg': 'EndDay_avg',
      'SetupTime_agg': 'SetupTime_agg',
      'SetupTime_avg': 'SetupTime_avg'
    });

    // legend + drilldown data
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
    const wasOpen = this.openGroup === group;
    this.openGroup = wasOpen ? null : group;

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

    // NEW: render SetupTime Q charts on open
    if (group === 'SetupTime' && this.isOpen('SetupTime')) {
      setTimeout(() => this.drawSetupTimeQSection(), 0);
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
        chartTitle: translateDataSource(source) + ' – ' + deptName + ' (ממוצע)',
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

  // THEME
  onThemeChange(name: string) {
    this.palette.setTheme(name);
    this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

    // pick up new series/datasource palettes on redraw:
    this.loadCharts();
    this.redrawVisibleDepartmentCharts();

    this.googleChartsService.drawSummarizedMultiPeriodChart(
      'multiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      '#A39DCD'
    );

    // FIX: keep DQ endpoints here so Q is available in tables
    this.googleChartsService.drawAllDepartmentTables(
      this.elementIdsByPeriod,
      `${environment.url}/GetRoomTimeAvgDQ`
    );
    this.googleChartsService.drawAllDepartmentTablesSum(
      this.elementIdsByPeriodSummarized,
      `${environment.url}/GetRoomAggregateDaysDQ`
    );

    // redraw Q charts if SetupTime open
    if (this.isOpen('SetupTime')) this.drawSetupTimeQSection();
  }

  cycleTheme() {
    const all = this.palette.list();
    const idx = all.indexOf(this.palette.name);
    const next = all[(idx + 1) % all.length];
    this.onThemeChange(next);
  }

  getDepartmentColorPublic(dept: string) {
    return this.deptColors.colorFor(dept);
  }

  // ==== NEW: render SetupTime Q charts (counts) ====
  private async drawSetupTimeQSection(): Promise<void> {
    // Uses the endpoint that includes Q (last column)
    const url = `${environment.url}/GetRoomTimeAvgDQ`;
    try {
      await this.googleChartsService.drawSetupTimeQCharts(this.setupTimeQChartIds, url, /*excludeCurrentYear*/ true);
    } catch (e) {
      console.error('Error drawing SetupTime Q charts', e);
    }
  }



  loadRoomsData(): void {
  this.googleChartsService.getSurgeryRooms(this.selectedDate).subscribe(result => {
    const rows = result.surgeries;   // backend returns JSON string

    const grouped = rows.reduce((acc, row) => {
      const roomId = row.SurgeryRoom;
      if (!acc[roomId]) acc[roomId] = [];
      acc[roomId].push({
        surgeryId: row.SurgeryID,
        patientNumber: row.PatientNumber,
        surgeryName: row.SurgeryName,
        surgeryCode: row.SurgeryCode,
        department: row.DepartNameDoing,
        status: row.SurgeryStatus,
        timeEntrance: row.TimeEntranceToTheOperatingRoom,
        timeExit: row.TimeExitingTheOperatingRoom
      });
      return acc;
    }, {} as Record<string, Surgery[]>);

    this.roomsData = Object.keys(grouped).map(roomId => ({
      roomId,
      surgeries: grouped[roomId]
    }));
  });
}

  // --------- utility helpers ----------
private parseTime(t: string): Date | null {
  if (!t || t === '00:00:00') return null;
  const [h, m, s] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
}

private formatDiff(ms: number): string {
  if (isNaN(ms) || ms < 0) return '--:--';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${('0'+h).slice(-2)}:${('0'+m).slice(-2)}`;
}

getStartDiff(room: RoomData): string {
  const first = room.surgeries.find(s => this.parseTime(s.timeEntrance));
  if (!first) return '--:--';
  const entrance = this.parseTime(first.timeEntrance);
  const start = new Date(); start.setHours(7,30,0,0);
  return this.formatDiff(entrance.getTime() - start.getTime());
}

getEndDiff(room: RoomData): string {
  const completed = room.surgeries.filter(s => this.parseTime(s.timeExit));
  if (completed.length === 0) return '--:--';
  const lastExit = this.parseTime(completed[completed.length-1].timeExit);
  const end = new Date(); end.setHours(15,0,0,0);
  return this.formatDiff(end.getTime() - lastExit.getTime());
}

getTurnoverTime(room: RoomData): string {
  const completed = room.surgeries.filter(s => this.parseTime(s.timeEntrance) && this.parseTime(s.timeExit));
  let sum = 0;
  for (let i=1; i<completed.length; i++) {
    const prevExit = this.parseTime(completed[i-1].timeExit).getTime();
    const nextIn = this.parseTime(completed[i].timeEntrance).getTime();
    sum += (nextIn - prevExit) - (20*60000);
  }
  return this.formatDiff(sum);
}

plannedSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status === 'Planned');
}

activeSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status !== 'Planned');
}

toggleRoom(roomId: string) {
  this.openRoom = this.openRoom === roomId ? null : roomId;
}

}
