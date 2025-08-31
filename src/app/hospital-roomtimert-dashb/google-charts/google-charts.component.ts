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
  surgeryDate: string;
}

export interface RoomData {
  roomId: string;
  date: string | null; 
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


refreshInterval: any;
countdownInterval: any;
private intervalId: any;
nextRefreshIn: number = 300; // 5 minutes in seconds
autoRefreshPaused = false;
lastLoaded: Date | null = null;



ngOnInit(): void {
  this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
  this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

  // initial load
  this.loadRoomsData();
  this.startAutoRefresh();

  // auto refresh every 5 minutes
  this.refreshInterval = setInterval(() => {
    this.loadRoomsData();
    this.nextRefreshIn = 300; // reset countdown
  }, 5 * 60 * 1000);

  // countdown updater (every second)
  this.countdownInterval = setInterval(() => {
    if (this.nextRefreshIn > 0) {
      this.nextRefreshIn--;
    }
  }, 1000);
  const saved = localStorage.getItem('rooms_allExpanded');
  if (saved === 'true') this.allExpanded = true;
  if (saved === 'false') this.allExpanded = false;
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

ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
  const target = event.target as Element;

  // --- keep your existing openGroup handling ---
  if (this.openGroup) {
    const activeCard = document
      .querySelector('.toggle-details[data-group="' + this.openGroup + '"]')
      ?.closest('.card') as HTMLElement | null;
    const activeDetails = document.getElementById('details_' + this.openGroup);

    if (
      activeCard &&
      activeDetails &&
      !activeCard.contains(target) &&
      !activeDetails.contains(target)
    ) {
      this.openGroup = null;
    }
  }

  // --- new: collapse expanded room when clicking outside any card ---
  if (this.activeRoomId) {
    // If click is not inside any .room-widget.card -> collapse
    const clickedCard = target.closest('.room-widget.card') as HTMLElement | null;
    if (!clickedCard) {
      this.activeRoomId = null;
    }
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




isLoading = false;
allExpanded: boolean = false;
activeRoomId: string | null = null;

toggleAll(): void {
  this.allExpanded = !this.allExpanded;
  localStorage.setItem('rooms_allExpanded', String(this.allExpanded));

  // When globally expanded, single selection is irrelevant
  if (this.allExpanded) {
    this.activeRoomId = null;
  }
}

/** Is this room currently expanded? */
isRoomExpanded(roomId: string): boolean {
  return this.allExpanded || this.activeRoomId === roomId;
}

/** Toggle a single room only when not in global mode */
toggleRoom(roomId: string): void {
  if (this.allExpanded) return; // global override: ignore individual clicks

  this.activeRoomId = (this.activeRoomId === roomId) ? null : roomId;

  if (this.activeRoomId) {
    // Keep your side-effect
    this.acknowledgeRoomEvent(roomId);
  }
}

/** Helpful for *ngFor performance */
trackByRoomId(index: number, room: any) {
  return room.roomId;
}





private acknowledgeRoomEvent(roomId: string): void {
  localStorage.setItem(`ack_${roomId}`, this.lastEventKeyForRoom(roomId));
}

isBlinking(room: RoomData): boolean {
  const currentKey = this.lastEventKeyForRoom(room.roomId);
  const acknowledgedKey = localStorage.getItem(`ack_${room.roomId}`);
  return currentKey !== acknowledgedKey;
}

private lastEventKeyForRoom(roomId: string): string {
  const room = this.roomsData.find(r => r.roomId === roomId);
  if (!room || !room.surgeries.length) return 'empty';
  const last = room.surgeries[room.surgeries.length - 1];
  return `${last.surgeryId}_${last.status}`;
}


loadRoomsData(): void {
  this.isLoading = true;
  this.googleChartsService.getSurgeryRooms(this.selectedDate).subscribe(result => {
    const rows = result.surgeries;

    const grouped = rows.reduce((acc, row) => {
      const roomId = row.SurgeryRoom;
      if (!acc[roomId]) acc[roomId] = [];
      acc[roomId].push({
        surgeryId: row.SurgeryID,
        patientNumber: row.PatientNumber,
        surgeryName: row.SurgeryName,
        surgeryCode: row.SurgeryCode,
        department: row.DepartName,
        status: row.SurgeryStatus,
        timeEntrance: row.TimeEntranceToTheOperatingRoom,
        timeExit: row.TimeExitingTheOperatingRoom
      });
      return acc;
    }, {} as Record<string, Surgery[]>);

   this.roomsData = Object.keys(grouped).map(roomId => {
  const list = grouped[roomId].slice().sort((a, b) => {
    const ae = this.parseClock(a.timeEntrance)?.getTime();
    const be = this.parseClock(b.timeEntrance)?.getTime();
    if (ae == null && be == null) return 0;
    if (ae == null) return 1;
    if (be == null) return -1;
    return ae - be;
  });

  const roomDate = list.length ? list[0].surgeryDate : undefined;

  return { roomId, surgeries: list, date: roomDate };
});




    this.isLoading = false;
    this.lastLoaded = new Date();
  }, err => {
    console.error(err);
    this.isLoading = false;
  });
}



getTurnoverTime(room: RoomData): string {
  if (!room?.surgeries?.length) return '--:--';

  // חיפוש הניתוח האחרון שהסתיים
  const lastCompleted = [...room.surgeries].reverse().find(s =>
    s.status === 'Completed' && (s.timeExit || s.timeExit === '00:00:00')
  );

  if (!lastCompleted) return '--:--';

  // אם זמן סיום הוא 00:00:00 נשתמש בזמן התחלה
  const exitTime = lastCompleted.timeExit && lastCompleted.timeExit !== '00:00:00'
    ? lastCompleted.timeExit
    : lastCompleted.timeEntrance;

  const exit = this.parseClock(exitTime);
  if (!exit) return '--:--';

  // הגבלת זמן עד 15:00
  const limit = new Date(exit);
  limit.setHours(15, 0, 0, 0);
  const now = new Date();
  const endTime = now < limit ? now : limit;

  const diffMin = Math.floor((endTime.getTime() - exit.getTime()) / 60000);

  if (diffMin > 20) {
    return this.formatHM(diffMin - 20);
  }

  return '--:--';
}

getTurnoverSummary(room: RoomData): string {
  if (!room?.surgeries?.length) return '--:--';

  let totalMinutes = 0;

  for (let i = 0; i < room.surgeries.length - 1; i++) {
    const current = room.surgeries[i];
    const next = room.surgeries[i + 1];
    if (!current?.timeExit || !next?.timeEntrance) continue;

    const exitTime = current.timeExit && current.timeExit !== '00:00:00'
      ? current.timeExit
      : current.timeEntrance;

    const exit = this.parseClock(exitTime);
    const entrance = this.parseClock(next.timeEntrance);
    if (!exit || !entrance) continue;

    const diffMin = Math.floor((entrance.getTime() - exit.getTime()) / 60000);
    if (diffMin > 20) totalMinutes += (diffMin - 20);
  }

  // also include idle after last completed surgery (if not in progress)
  const last = room.surgeries[room.surgeries.length - 1];
  if (last?.status === 'Completed') {
    const exitTime = last.timeExit && last.timeExit !== '00:00:00'
      ? last.timeExit
      : last.timeEntrance;

    const exit = this.parseClock(exitTime);
    if (exit) {
      const limit = new Date(exit);
      limit.setHours(15, 0, 0, 0);
      const now = new Date();
      const endTime = now < limit ? now : limit;

      const diffMin = Math.floor((endTime.getTime() - exit.getTime()) / 60000);
      if (diffMin > 20) totalMinutes += (diffMin - 20);
    }
  }

  return totalMinutes > 0 ? this.formatHM(totalMinutes) : '--:--';
}





getTurnoverClass(room: RoomData): string {
  const t = this.getTurnoverTime(room);
  if (!t || t === '--:--') return '';
  const [h, m] = t.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red-strong';
  if (minutes > 60) return 'metric-red';
  if (minutes > 45) return 'metric-orange';
  if (minutes > 20) return 'metric-yellow';
  return 'metric-ok';
}

getTurnoverTimeClass(room: RoomData): string {
  const value = this.getTurnoverTime(room);
  if (!value || value === '--:--') return 'neutral';

  const [h, m] = value.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes <= 20) return 'ok';          // ✅ normal
  if (minutes <= 45) return 'warning';     // 🟠 mild delay
  if (minutes <= 60) return 'bad';         // 🔴 delay
  if (minutes <= 120) return 'critical';   // 🔴 blinking red
  return 'severe';                         // 🔴 pulsing red
}



getRoomStatusClass(room: RoomData): string {
  if (!room || !room.surgeries?.length) return 'grey';

  // Determine if the room's date is a weekend (Fri=5, Sat=6)
  let isWeekend = false;
  if (room.date) {
    const roomDate = new Date(room.date);
    const day = roomDate.getDay();
    isWeekend = day === 5 || day === 6;
  }

  // If any surgery is in progress, always green (no blinking on weekend)
  if (room.surgeries.some(s => s.status === 'InProgress')) {
    return isWeekend ? 'green' : 'green-blink';
  }

  // Find last completed surgery with valid exit time
  const lastCompleted = [...room.surgeries].reverse().find(
    s => s.status === 'Completed' && s.timeExit && s.timeExit !== '00:00:00'
  );

  if (!lastCompleted) return 'grey';

  const exitTime = this.parseClock(lastCompleted.timeExit);
  if (!exitTime) return 'grey';

  const diffMin = (Date.now() - exitTime.getTime()) / 60000;

  // --- Weekend: never blinking ---
  if (isWeekend) {
    if (diffMin > 120) return 'red-120-ack';
    if (diffMin > 60)  return 'red-60-ack';
    if (diffMin > 45)  return 'red-45-ack';
    return 'grey';
  }

  // --- Weekday: blinking if not acknowledged ---
  const blinkingAllowed = this.isBlinking(room);
  if (diffMin > 120) return blinkingAllowed ? 'red-120' : 'red-120-ack';
  if (diffMin > 60)  return blinkingAllowed ? 'red-60'  : 'red-60-ack';
  if (diffMin > 45)  return blinkingAllowed ? 'red-45'  : 'red-45-ack';

  return 'grey';
}




getStartDiffClass(room: RoomData): string {
  const val = this.getStartDiff(room);
  if (!val || val === '--:--') return '';
  const [h, m] = val.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 60) return 'metric-red';
  if (minutes > 30) return 'metric-orange';
  if (minutes > 15) return 'metric-yellow';
  return 'metric-ok';
}




getTurnoverBetween(prev: Surgery, next: Surgery): string | null {
  if (!prev?.timeExit || !next?.timeEntrance) return null;

  const exit = this.parseClock(prev.timeExit);
  const entrance = this.parseClock(next.timeEntrance);
  if (!exit || !entrance) return null;

  // Clamp times within day boundaries
  const start = this.clampToDay(exit);
  const end   = this.clampToDay(entrance);
  const gap   = this.minutesBetween(start, end);

  // Only show turnover beyond baseline 20 min
  if (gap <= 20) return null;

  const overage = gap - 20;
  return this.formatHM(overage);
}



getTurnoverBetweenClass(prev: Surgery, next: Surgery): string {
  const raw = this.getTurnoverBetween(prev, next);
  if (!raw) return '';

  const [h, m] = raw.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red blink';
  if (minutes > 60)  return 'metric-red';
  if (minutes > 45)  return 'metric-orange';
  return 'metric-yellow';
}





  // --------- utility helpers ----------



 private formatMinutesToHHMM(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '--:--';
  const minutes = Math.round(totalMinutes); // normalize to whole minutes
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}


  private parseClock(t: string): Date | null {
  if (!t || typeof t !== 'string') return null;
  const parts = t.split(':').map(n => Number(n));
  if (parts.length < 2 || parts.some(isNaN)) return null;
  const [h, m, s = 0] = parts;
  const d = new Date();
  d.setHours(h, m, s, 0);
  return isNaN(d.getTime()) ? null : d;
}


private formatDiff(ms: number): string {
  if (isNaN(ms)) return '--:--';
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  return `${sign}${('0'+h).slice(-2)}:${('0'+m).slice(-2)}`;
}






getStartDiff(room: RoomData): string {
  const safeStart = this.parseClock('07:00');
  const safeEnd = this.parseClock('07:30');
  if (!safeStart || !safeEnd) return '--:--';

  if (!room.surgeries || room.surgeries.length === 0) return '--:--';

  // Sort surgeries by entrance time just in case
  const sortedSurgeries = room.surgeries
    .map(s => ({ ...s, entrance: this.parseClock(s.timeEntrance) }))
    .filter(s => s.entrance) // remove invalid times
    .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

  // Check for surgery inside safe zone
  const firstInSafeZone = sortedSurgeries.find(
    s => s.entrance! >= safeStart && s.entrance! <= safeEnd
  );
  if (firstInSafeZone) return '00:00';

  // Otherwise, take first surgery after safe zone
  const firstAfterSafeZone = sortedSurgeries.find(
    s => s.entrance! > safeEnd
  );

  if (!firstAfterSafeZone) return '--:--';

  const diffMs = firstAfterSafeZone.entrance!.getTime() - safeEnd.getTime();
  return this.formatDiff(diffMs);
}






getEndDiff(room: RoomData): string {
  const opening = this.parseClock('07:30');
  const closing = this.parseClock('15:00');
  if (!closing || !opening) return '--:--';

  // Filter surgeries within the working day
  const validExits = room.surgeries
    .map(s => {
      // If timeExit is 00:00:00, use start time
      const exitTime = s.timeExit && s.timeExit !== '00:00:00' ? s.timeExit : s.timeEntrance;
      const exit = this.parseClock(exitTime);
      return exit;
    })
    .filter(d => d && d >= opening && d <= closing);

  if (validExits.length === 0) {
    return this.formatDiff(0);
  }

  const lastExit = validExits[validExits.length - 1];

  // Do not count time after 15:00
  const endTime = lastExit! > closing ? closing : lastExit!;

  const diffMs = closing.getTime() - lastExit!.getTime();
  return diffMs > 0 ? this.formatDiff(diffMs) : this.formatDiff(0);
}

getEndDiffClass(room: RoomData): string {
  const val = this.getEndDiff(room);
  if (!val || val === '--:--') return '';
  const [h, m] = val.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes < 30) return 'metric-red'; // very little time left
  if (minutes < 60) return 'metric-orange';
  if (minutes < 120) return 'metric-yellow';
  return 'metric-ok';
}



plannedSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status === 'Planned');
}

activeSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status !== 'Planned');
}




formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

manualRefresh(): void {
  this.loadRoomsData();
  this.nextRefreshIn = 300; // reset countdown
}

toggleAutoRefresh(): void {
  this.autoRefreshPaused = !this.autoRefreshPaused;
  if (this.autoRefreshPaused) {
    this.clearIntervals();
  } else {
    this.startAutoRefresh();
  }
}

private startAutoRefresh(): void {
  this.clearIntervals();
  this.nextRefreshIn = 300;

  this.refreshInterval = setInterval(() => {
    if (!this.autoRefreshPaused) {
      this.loadRoomsData();
      this.nextRefreshIn = 300;
    }
  }, 5 * 60 * 1000);

  this.countdownInterval = setInterval(() => {
    if (!this.autoRefreshPaused && this.nextRefreshIn > 0) {
      this.nextRefreshIn--;
    }
  }, 1000);
}

private clearIntervals(): void {
  if (this.refreshInterval) clearInterval(this.refreshInterval);
  if (this.countdownInterval) clearInterval(this.countdownInterval);
}

onDateChange(): void {
  // pause auto refresh
  if (!this.autoRefreshPaused) {
    this.autoRefreshPaused = true;
    this.clearIntervals();
  }

  // load data for the selected date
  this.loadRoomsData();
}


private openingOfDay(): Date {
  const d = new Date();
  d.setHours(7, 30, 0, 0);
  return d;
}

private closingOfDay(): Date {
  const d = new Date();
  d.setHours(15, 0, 0, 0);
  return d;
}

private clampToDay(d: Date): Date {
  const open = this.openingOfDay().getTime();
  const close = this.closingOfDay().getTime();
  return new Date(Math.min(close, Math.max(open, d.getTime())));
}

private minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60000));
}

private formatHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}`;
}



statusTranslations: Record<string, string> = {
  'Completed': 'הסתיים',
  'InProgress': 'בתהליך',
  'Scheduled': 'מתוכנן',
  'Cancelled': 'בוטל',  
};

translateStatus(status: string): string {
  return this.statusTranslations[status] || status;
}

}
