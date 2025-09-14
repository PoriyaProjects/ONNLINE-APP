import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse, sanitizeSoapChartData } from 'src/app/shared/sanitizesoapresponce';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  avgMinutes?: number; 
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

  private destroy$ = new Subject<void>();
private ackedRooms = new Set<string>();

  departmentMap = new Map<string, DepartmentData>();
  selectedDepartmentCharts: any[] = [];

  selectedDate: string = new Date().toISOString().split('T')[0]; 

   selectedDateObj: Date | null = this.selectedDate ? new Date(this.selectedDate) : null;
  roomsData: RoomData[] = [];
  openRoom: string | null = null; 


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

  
  activeDeptTab: 'avg' | 'agg' = 'avg';
  selectedDepartment: string | null = null;
  selectedDepartmentAvgCharts: any[] = [];
  selectedDepartmentAggCharts: any[] = [];
  selectedDepartmentAvgChartChunks: any[][] = [];
  selectedDepartmentAggChartChunks: any[][] = [];
  public selectedDepartmentChartChunks: any[][] = [];

 
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
nextRefreshIn: number = 300; 
autoRefreshPaused = false;
lastLoaded: Date | null = null;



ngOnInit(): void {
  this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
  this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

  
  this.loadRoomsData();
  this.startAutoRefresh();


  this.refreshInterval = setInterval(() => {
    this.loadRoomsData();
    this.nextRefreshIn = 300; 
  }, 5 * 60 * 1000);


  this.countdownInterval = setInterval(() => {
    if (this.nextRefreshIn > 0) {
      this.nextRefreshIn--;
    }
  }, 1000);
  const saved = localStorage.getItem('rooms_allExpanded');
  if (saved === 'true') this.allExpanded = true;
  if (saved === 'false') this.allExpanded = false;

   this.googleChartsService.ackAllRooms$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => this.markAllRoomsAcknowledged());

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
     this.destroy$.next();
  this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.loadCharts();
      this.redrawVisibleDepartmentCharts();      
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

    
    if (group === 'SetupTime' && this.isOpen('SetupTime')) {
      setTimeout(() => this.drawSetupTimeQSection(), 0);
    }
  }

  isOpen(group: string): boolean { return this.openGroup === group; }



  @HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent) {
  const target = event.target as Element;

 
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

  
  if (this.activeRoomId) {   
    const clickedCard = target.closest('.room-widget.card') as HTMLElement | null;
    if (!clickedCard) {
      this.activeRoomId = null;
    }
  }
}


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

  
  selectDepartment(deptName: string) {
    this.selectedDepartment = deptName;
    const dept = this.departmentMap.get(deptName);
    if (!dept) return;

    this.selectedDepartmentAvgCharts = [];
    this.selectedDepartmentAggCharts = [];
    this.selectedDepartmentCharts = [];

   
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


  onThemeChange(name: string) {
    this.palette.setTheme(name);
    this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

   
    this.loadCharts();
    this.redrawVisibleDepartmentCharts();

    this.googleChartsService.drawSummarizedMultiPeriodChart(
      'multiPeriodSummary',
      `${environment.url}/GetRoomTimeAvgD`,
      `${environment.url}/GetRoomAggregateDaysD`,
      '#A39DCD'
    );

    
    this.googleChartsService.drawAllDepartmentTables(
      this.elementIdsByPeriod,
      `${environment.url}/GetRoomTimeAvgDQ`
    );
    this.googleChartsService.drawAllDepartmentTablesSum(
      this.elementIdsByPeriodSummarized,
      `${environment.url}/GetRoomAggregateDaysDQ`
    );

    
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

  
  private async drawSetupTimeQSection(): Promise<void> {
    
    const url = `${environment.url}/GetRoomTimeAvgDQ`;
    try {
      await this.googleChartsService.drawSetupTimeQCharts(this.setupTimeQChartIds, url, true);
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

  
  if (this.allExpanded) {
    this.activeRoomId = null;
  }
}


isRoomExpanded(roomId: string): boolean {
  return this.allExpanded || this.activeRoomId === roomId;
}


toggleRoom(roomId: string): void {
  if (this.allExpanded) return; 

  this.activeRoomId = (this.activeRoomId === roomId) ? null : roomId;

  if (this.activeRoomId) {    
    this.acknowledgeRoomEvent(roomId);
  }
}


trackByRoomId(index: number, room: any) {
  return room.roomId;
}


private readonly ACK_NS = 'ack_'; 
private ackCache = new Map<string, string>(); 

private ackStorageKey(roomId: string): string {
  return `${this.ACK_NS}${this.storageDateKey()}:${roomId}`;
}
private legacyAckStorageKey(roomId: string): string { 
  return `${this.ACK_NS}${roomId}`;
}
private storageDateKey(): string {
  const d = this.selectedDate ? new Date(this.selectedDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
private lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
private lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch {}
}
private lsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}


private lastEventKeyForRoom(roomId: string): string {
  const room = this.roomsData.find(r => r.roomId === roomId);
  if (!room || !room.surgeries.length) return 'empty';
  const last = room.surgeries[room.surgeries.length - 1];
  return `${last.surgeryId}_${last.status}`;
}



private acknowledgeRoomEvent(roomId: string): void {
  const key = this.lastEventKeyForRoom(roomId);
  const storeKey = this.ackStorageKey(roomId);

  this.lsSet(storeKey, key);

  this.lsRemove(this.legacyAckStorageKey(roomId));

  this.ackCache.set(roomId, key);

  this.roomsData = [...(this.roomsData ?? [])];
}


isBlinking(room: RoomData): boolean {
  return !this.isRoomAcked(room);
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
        timeExit: row.TimeExitingTheOperatingRoom,
        surgeryDate: row.SurgeryDate,
        urgency: row.Urgency
      });
      return acc;
    }, {} as Record<string, Surgery[]>);



this.roomsData = Object.keys(grouped).map(roomId => {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function sortKey(self: any, s: any, fallbackDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || fallbackDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = self.parseClockWithDate(eClock, base);
    var exit     = self.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    
    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS;

    
    if (xClockRaw) {
      var ep = String(eClock).split(':'), xp = String(xClockRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0]) * 60 + (+ep[1]);
        var xMin = (+xp[0]) * 60 + (+xp[1]);
        if (xMin < eMin) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  var self = this;
  var list = grouped[roomId].slice().sort(function(a, b) {
    return sortKey(self, a, self.selectedDate) - sortKey(self, b, self.selectedDate);
  });

    const roomDate = list.length ? (list[0].surgeryDate || this.selectedDate) : this.selectedDate;
  return { roomId, surgeries: list, date: roomDate };
});


 this.refreshAckCache();

    this.isLoading = false;
    this.lastLoaded = new Date();
  }, err => {
    console.error(err);
    this.isLoading = false;
  });
}



getTurnoverTime(room: RoomData): string {
  if (!room?.surgeries?.length) return '--:--';

  
  const lastCompleted = [...room.surgeries].reverse().find(s =>
    s.status === 'Completed' && (s.timeExit || s.timeExit === '00:00:00')
  );

  if (!lastCompleted) return '--:--';

  
  const exitTime = lastCompleted.timeExit && lastCompleted.timeExit !== '00:00:00'
    ? lastCompleted.timeExit
    : lastCompleted.timeEntrance;

  const exit = this.parseClock(exitTime);
  if (!exit) return '--:--';  
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
  if (!room || !room.surgeries || !room.surgeries.length || !room.date) return '--:--';

  var dayStart = this.workingStart(room.date);  
  var dayEnd   = this.workingEnd(room.date);    
  var DAY_MS   = 24 * 60 * 60 * 1000;

  function statusKind(raw: any): 'completed' | 'inprogress' | 'other' {
    var s = (raw == null ? '' : String(raw)).toLowerCase();
    if (s.indexOf('complete') >= 0 || s.indexOf('finished') >= 0 || s.indexOf('הסת') >= 0) return 'completed';
    if (s.indexOf('inprogress') >= 0 || s.indexOf('in progress') >= 0 || s.indexOf('ongoing') >= 0 || s.indexOf('בתהל') >= 0) return 'inprogress';
    return 'other';
  }

  
  function clockToDate(clock: string, baseDate: string | Date): Date | null {
    if (!clock) return null;
    var parts = String(clock).split(':');
    if (parts.length < 2) return null;
    var d = new Date(baseDate);
    var hh = +parts[0], mm = +parts[1], ss = parts.length > 2 ? +parts[2] : 0;
    if (isNaN(hh) || isNaN(mm) || isNaN(ss)) return null;
    d.setHours(hh, mm, ss, 0);
    return d;
  }

  
  var intervals: { entrance: Date; exit: Date; kind: 'completed' | 'inprogress'; sortStart: Date; }[] = [];

  for (var i = 0; i < room.surgeries.length; i++) {
    var s: any = room.surgeries[i];

    var kind = statusKind(s && s.status);
    if (kind === 'other') continue; 

    var eClock = s ? (s.timeEntrance != null ? s.timeEntrance : (s as any).TimeEntranceToTheOperatingRoom) : null;
    var xRaw   = s ? (s.timeExit     != null ? s.timeExit     : (s as any).TimeExitingTheOperatingRoom) : null;
    if (!eClock) continue;

    var base   = s ? (s.surgeryDate  != null ? s.surgeryDate  : (s as any).SurgeryDate) : null;
    var anchor = base || room.date;

    var entrance = clockToDate(eClock, anchor);
    var exit     = clockToDate((xRaw && xRaw !== '00:00:00') ? xRaw : eClock, anchor);
    if (!entrance || !exit) continue;

    
    if (exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

    
    var overlaps = (entrance < dayEnd) && (exit > dayStart);
    if (!overlaps) continue;

    
    var sortStart = entrance;
    if (xRaw && xRaw !== '00:00:00') {
      var ep = String(eClock).split(':'), xp = String(xRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0]) * 60 + (+ep[1]);
        var xMin = (+xp[0]) * 60 + (+xp[1]);
        if (xMin < eMin) sortStart = new Date(entrance.getTime() - DAY_MS);
      }
    }

    intervals.push({ entrance: entrance, exit: exit, kind: kind, sortStart: sortStart });
  }

  
  if (!intervals.length) return '--:--';

  
  intervals.sort(function(a, b){ return a.sortStart.getTime() - b.sortStart.getTime(); });

  
  var total = 0;
  for (var j = 0; j < intervals.length - 1; j++) {
    var curEnd   = clampToWindow(intervals[j].exit,   dayStart, dayEnd);
    var nextBeg  = clampToWindow(intervals[j+1].entrance, dayStart, dayEnd);
    var gap = Math.max(0, Math.floor((nextBeg.getTime() - curEnd.getTime()) / 60000));
    if (gap > 20) total += (gap - 20);
  }

  
  var last = intervals[intervals.length - 1];
  if (last.kind === 'completed') {
    var lastExit = clampToWindow(last.exit, dayStart, dayEnd);
    var now = new Date();
    var end = clampToWindow(now < dayEnd ? now : dayEnd, dayStart, dayEnd);
    var idle = Math.max(0, Math.floor((end.getTime() - lastExit.getTime()) / 60000));
    if (idle > 20) total += (idle - 20);
  }

  return total > 0 ? this.formatHM(total) : '--:--';  
  function clampToWindow(d: Date, start: Date, end: Date): Date {
    return new Date(Math.min(end.getTime(), Math.max(start.getTime(), d.getTime())));
  }
}



private workingStart(): Date;
private workingStart(baseDate: string | Date): Date;
private workingStart(baseDate?: string | Date): Date {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(7, 30, 0, 0);  
  return d;
}

private workingEnd(): Date;
private workingEnd(baseDate: string | Date): Date;
private workingEnd(baseDate?: string | Date): Date {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(15, 0, 0, 0); 
  return d;
}
private clampToWindow(d: Date, start: Date, end: Date): Date {
  return new Date(Math.min(end.getTime(), Math.max(start.getTime(), d.getTime())));
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

   if (minutes >= 120) return 'severe';    
  if (minutes >= 60)  return 'critical';  
  if (minutes >= 45)  return 'bad';      
  if (minutes > 20)   return 'warning';  
  return 'ok';
}



sortByChronologicalStart(a: any, b: any, roomDate: string | Date): number {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function clockToDate(clk: string, base: any) { return this.parseClockWithDate(clk, base); }

  function sortKey(s: any, baseDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || baseDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = this.parseClockWithDate(eClock, base);
    var exit = this.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    
    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS;

    
    if (xClockRaw) {
      var eParts = String(eClock).split(':'), xParts = String(xClockRaw).split(':');
      if (eParts.length >= 2 && xParts.length >= 2) {
        var eNum = (+eParts[0]) * 60 + (+eParts[1]);
        var xNum = (+xParts[0]) * 60 + (+xParts[1]);
        if (xNum < eNum) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  var ka = sortKey.call(this, a, roomDate);
  var kb = sortKey.call(this, b, roomDate);
  return ka - kb;
}

sortSurgeriesForDisplay(surgeries: any[], roomDate: string | Date): any[] {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function sortKey(self: any, s: any, baseDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || baseDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = self.parseClockWithDate(eClock, base);
    var exit     = self.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS; 

    if (xClockRaw) { 
      var ep = String(eClock).split(':'), xp = String(xClockRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0])*60 + (+ep[1]);
        var xMin = (+xp[0])*60 + (+xp[1]);
        if (xMin < eMin) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  
  var self = this;
  return (surgeries || []).slice().sort(function(a,b){
    return sortKey(self, a, roomDate) - sortKey(self, b, roomDate);
  });
}


getRoomStatusClass(room: RoomData): string {
  if (!room || !room.surgeries?.length) return 'grey';

  const isWeekend = this.isWeekend(room.date);

  
  if (room.surgeries.some(s => s.status === 'InProgress')) {
    return isWeekend ? 'green' : 'green-blink';
  }

  
  const lastCompleted = [...room.surgeries].reverse().find(
    s => s.status === 'Completed' && s.timeExit && s.timeExit !== '00:00:00'
  );
  if (!lastCompleted) return 'grey';

  const exitAt = this.parseClockWithDate(lastCompleted.timeExit, room.date);

  if (!exitAt) return 'grey';

  const diffMin = Math.max(0, (Date.now() - exitAt.getTime()) / 60000);


  if (isWeekend) {
    if (diffMin > 120) return 'red-120-ack';
    if (diffMin > 60)  return 'red-60-ack';
    if (diffMin > 45)  return 'red-45-ack';
    return 'grey';
  }


  const isAcked = this.isRoomAcked(room);
  if (diffMin > 120) return isAcked ? 'red-120-ack' : 'red-120';
  if (diffMin > 60)  return isAcked ? 'red-60-ack'  : 'red-60';
  if (diffMin > 45)  return isAcked ? 'red-45-ack'  : 'red-45';
  return 'grey';
}


private isWeekend(dateLike?: string | Date): boolean {
  const d = dateLike ? new Date(dateLike) : new Date();
  const day = d.getDay();
  return day === 5 || day === 6;
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

private isRealCase(s?: Surgery): boolean {
  return !!s && (s.status === 'Completed' || s.status === 'InProgress');
}

private toInterval(s: Surgery, baseDate?: string | Date) {
  const eClock = s.timeEntrance;
  const xClock = s.timeExit && s.timeExit !== '00:00:00' ? s.timeExit : s.timeEntrance;

  const entrance = eClock ? this.parseClockWithDate(eClock, baseDate ?? s.surgeryDate) : null;
  let exit      = xClock ? this.parseClockWithDate(xClock, baseDate ?? s.surgeryDate) : null;

  if (entrance && exit && exit.getTime() < entrance.getTime()) {
    exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
  }
  return { entrance, exit: exit ?? entrance };
}

private overlapsWindow(entrance: Date | null, exit: Date | null, start: Date, end: Date): boolean {
  if (!entrance || !exit) return false;
  return entrance < end && exit > start; 
}

getTurnoverBetween(prev: Surgery, next: Surgery): string | null {  
  if (!this.isRealCase(prev) || !this.isRealCase(next)) return null;

  
  const baseDate = next.surgeryDate ?? prev.surgeryDate ?? this.selectedDate;
  const dayStart = this.workingStart(baseDate); 
  const dayEnd   = this.workingEnd(baseDate);   

  const p = this.toInterval(prev, baseDate);
  const n = this.toInterval(next, baseDate);
  if (!p.entrance || !p.exit || !n.entrance || !n.exit) return null;

  
  if (!this.overlapsWindow(p.entrance, p.exit, dayStart, dayEnd)) return null;
  if (!this.overlapsWindow(n.entrance, n.exit, dayStart, dayEnd)) return null;

  
  const prevEnd   = this.clampToWindow(p.exit, dayStart, dayEnd);
  const nextStart = this.clampToWindow(n.entrance, dayStart, dayEnd);

  const gap = this.minutesBetween(prevEnd, nextStart);
  if (gap <= 20) return null; 
  return this.formatHM(gap - 20);
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


private isInProgress(raw: any): boolean {
  var s = (raw == null ? '' : String(raw)).toLowerCase();
  return s === 'inprogress' || s === 'in progress' || s.indexOf('בתהל') >= 0;
}

private getSurgeryIdFromAny(s: any): string {
  if (!s) return '';
  if (s.surgeryId != null && s.surgeryId !== '') return String(s.surgeryId);
  if (s.SurgeryID != null && s.SurgeryID !== '') return String(s.SurgeryID);
  return '';
}

private entranceMillisForSort(s: any, roomDate: string | Date): number {
  var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
  var base   = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || roomDate;
  var d = eClock ? this.parseClockWithDate(eClock, base) : null;
  return d ? d.getTime() : -Infinity;
}

getHeaderInProgressId(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return '';


  var inProg: any[] = [];
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    var status = (s && s.status != null ? s.status : (s && s.status));
    if (this.isInProgress(status)) inProg.push(s);
  }

  if (!inProg.length) return ''; 

  var picked = inProg.slice().sort((a, b) =>
    this.entranceMillisForSort(b, room.date || this.selectedDate) -
    this.entranceMillisForSort(a, room.date || this.selectedDate)
  )[0];

  return this.getSurgeryIdFromAny(picked) || '';
}



  // --------- utility helpers ----------

 private formatMinutesToHHMM(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '--:--';
  const minutes = Math.round(totalMinutes); 
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

private parseClockWithDate(clock: string, baseDate?: string | Date): Date | null {
  const t = this.parseClock(clock); 
  if (!t) return null;
  if (!baseDate) return t;

  const base = new Date(baseDate);
  base.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
  return base;
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


  const sortedSurgeries = room.surgeries
    .map(s => ({ ...s, entrance: this.parseClock(s.timeEntrance) }))
    .filter(s => s.entrance) 
    .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

  const firstInSafeZone = sortedSurgeries.find(
    s => s.entrance! >= safeStart && s.entrance! <= safeEnd
  );
  if (firstInSafeZone) return '00:00';

  
  const firstAfterSafeZone = sortedSurgeries.find(
    s => s.entrance! > safeEnd
  );

  if (!firstAfterSafeZone) return '--:--';

  const diffMs = firstAfterSafeZone.entrance!.getTime() - safeEnd.getTime();
  return this.formatDiff(diffMs);
}



getEndDiff(room: RoomData): string {
  const opening = this.parseClock('07:30');
  const closing = this.parseClock('14:40');
  if (!closing || !opening) return '--:--';


  const validExits = room.surgeries
    .map(s => {
      const exitTime = s.timeExit && s.timeExit !== '00:00:00' ? s.timeExit : s.timeEntrance;
      const exit = this.parseClock(exitTime);
      return exit;
    })
    .filter(d => d && d >= opening && d <= closing);

  if (validExits.length === 0) {
    return this.formatDiff(0);
  }

  const lastExit = validExits[validExits.length - 1];

  const endTime = lastExit! > closing ? closing : lastExit!;

  const diffMs = closing.getTime() - lastExit!.getTime();
  return diffMs > 0 ? this.formatDiff(diffMs) : this.formatDiff(0);
}

getEndDiffClass(room: RoomData): string {
  const val = this.getEndDiff(room);
  if (!val || val === '--:--') return '';
  const [h, m] = val.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red';
  if (minutes > 60)  return 'metric-orange';
  if (minutes > 30)  return 'metric-yellow';
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
  this.nextRefreshIn = 300; 
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
  if (!this.autoRefreshPaused) {
    this.autoRefreshPaused = true;
    this.clearIntervals();
  }

  
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


acknowledgeAllRooms(): void {
  this.googleChartsService.triggerAcknowledgeAllRooms();

  for (const r of this.roomsData ?? []) {
    if (!r?.roomId) continue;
    const key = this.lastEventKeyForRoom(r.roomId);
    const storeKey = this.ackStorageKey(r.roomId);
    this.lsSet(storeKey, key);
    this.lsRemove(this.legacyAckStorageKey(r.roomId));
    this.ackCache.set(r.roomId, key);
  }

  
  this.roomsData = [...(this.roomsData ?? [])];
  console.log('acknowledged all rooms');
}


private refreshAckCache(): void {
  this.ackCache.clear();
  for (const r of this.roomsData ?? []) {
    const stored =
      this.lsGet(this.ackStorageKey(r.roomId)) ??
      this.lsGet(this.legacyAckStorageKey(r.roomId));
    if (stored) this.ackCache.set(r.roomId, stored);
  }
}

private markAllRoomsAcknowledged(): void {
  for (const r of this.roomsData ?? []) {
    if (r?.roomId) this.ackedRooms.add(r.roomId);
  }

  this.roomsData = [...(this.roomsData ?? [])];
}


private isRoomAcked(room: RoomData): boolean {
  if (!room?.roomId) return false;

  const currentKey = this.lastEventKeyForRoom(room.roomId);
  const storedKey =
    this.ackCache.get(room.roomId) ??
    this.lsGet(this.ackStorageKey(room.roomId)) ??
    this.lsGet(this.legacyAckStorageKey(room.roomId));

  return !!storedKey && storedKey === currentKey;
}


private readonly PLANNED_SET = new Set(['Planned', 'Scheduled']);

trackBySurgeryId = (_: number, s: Surgery) => s?.surgeryId ?? _;




private roomNameOverrides: Record<string, string> = {
  'פז01-201': 'חדר ניתוח 1',  
  'פז01-202': 'חדר ניתוח 2',
  'פז01-203': 'חדר ניתוח 3',
  'פז01-204': 'חדר ניתוח 4',
  'פז01-205': 'חדר ניתוח 5',
  'פז01-206': 'חדר ניתוח 6',
  'פז01-207': 'חדר ניתוח 7',
};

translateRoomId(id?: string): string {
  if (!id) return '';


  const hit = this.roomNameOverrides[id];
  if (hit) return hit;


  const norm = String(id).trim();
  const firstSeg = norm.split(/[-–—]/)[0]; 
  let numStr: string | null = null;


  const m1 = firstSeg.match(/(\d{1,2})(?!.*\d)/);
  if (m1) numStr = m1[1];

  
  if (!numStr) {
    const m2 = norm.match(/\b(0?[1-9]|[1-9]\d)\b/);
    if (m2) numStr = m2[1];
  }

  if (numStr) {
    const n = parseInt(numStr, 10);
    if (!Number.isNaN(n)) return `חדר ניתוח ${n}`;
  }

  
  return norm;
}



hasActionAfterWorkingStart(room: RoomData): boolean {
  if (!room?.surgeries?.length) return false;
  const ws = this.workingStart(room.date);
  return room.surgeries.some(s => {
    if (!s?.timeEntrance) return false;
    const entrance = this.parseClockWithDate(s.timeEntrance, room.date);
    if (!entrance || entrance < ws) return false;
    return s.status === 'InProgress' || s.status === 'Completed';
  });
}


private isBeforeToday(dateLike?: string | Date): boolean {
  if (!dateLike) return false;               
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateLike); d.setHours(0,0,0,0);
  return d.getTime() < today.getTime();
}


shouldShowStartDiff(room: RoomData): boolean {
  const baseDate = room?.date ?? this.selectedDate;  
  if (this.isBeforeToday(baseDate)) return true;
  return !this.hasActionAfterWorkingStart(room);
}




private isInProgressStatus(raw: any): boolean {
  var s = (raw == null ? '' : String(raw)).toLowerCase().trim();
  return s === 'inprogress' || s === 'in progress' || s.indexOf('בתהל') >= 0;
}

private getSurgeryIdSafe(s: any): string {

  if (s && s.surgeryId != null && s.surgeryId !== '') return String(s.surgeryId);
  var rawId = s ? (s as any).SurgeryID : null;
  return rawId != null && rawId !== '' ? String(rawId) : '—';
}

private entranceMillisForSortSafe(s: any, roomDate: string | Date): number {
  var eClock = s ? (s.timeEntrance != null ? s.timeEntrance : (s as any).TimeEntranceToTheOperatingRoom) : null;
  var base   = s ? (s.surgeryDate != null ? s.surgeryDate : (s as any).SurgeryDate) : null;
  var anchor = base || roomDate;
  var d = eClock ? this.parseClockWithDate(eClock, anchor) : null;
  return d ? d.getTime() : -Infinity;
}


getHeaderInProgressLabel(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return 'פנוי';

  var inProg: any[] = [];
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    if (this.isInProgressStatus(s && s.status)) inProg.push(s);
  }
  if (!inProg.length) return 'פנוי';

  
  var picked = inProg.slice().sort((a, b) =>
    this.entranceMillisForSortSafe(b, room.date || this.selectedDate) -
    this.entranceMillisForSortSafe(a, room.date || this.selectedDate)
  )[0];

  return this.getSurgeryIdSafe(picked);
}





private getHeaderInProgressIdPlain(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return '';
  var best: any = null, bestTs = -Infinity;
  var anchor = room.date || this.selectedDate;

  for (var i = 0; i < room.surgeries.length; i++) {
    var s: any = room.surgeries[i];
    if (!s || s.status !== 'InProgress') continue;

    var eClock = s.timeEntrance;
    var base   = s.surgeryDate || anchor;
    var d      = eClock ? this.parseClockWithDate(eClock, base) : null;
    var ts     = d ? d.getTime() : -Infinity;
    if (ts > bestTs) { best = s; bestTs = ts; }
  }
  if (!best) return '';
  return String(best.surgeryId || (best as any).SurgeryID || '');
}


getHeaderProgressText(room: RoomData): string {
  var n = 0, x = 0;
  if (!room || !room.surgeries || !room.surgeries.length) return '0 מתוך 0';

  var dayStart = this.workingStart(room.date || this.selectedDate);
  var dayEnd   = this.workingEnd(room.date || this.selectedDate);
  var DAY_MS   = 24 * 60 * 60 * 1000;

  for (var i = 0; i < room.surgeries.length; i++) {
    var s: any = room.surgeries[i];
    var eClock = s && s.timeEntrance;
    if (!eClock) continue;

    var xRaw   = s && s.timeExit;
    var base   = (s && s.surgeryDate) || (room.date || this.selectedDate);

    var entrance = this.parseClockWithDate(eClock, base);
    var exit     = this.parseClockWithDate((xRaw && xRaw !== '00:00:00') ? xRaw : eClock, base);
    if (!entrance || !exit) continue;
    if (exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

    var overlaps = (entrance < dayEnd) && (exit > dayStart);
    if (!overlaps) continue;

    x++;
    if (s.status === 'Completed' || s.status === 'InProgress') n++;
  }
  return n + ' מתוך ' + x;
}


private isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth() &&
         a.getDate()     === b.getDate();
}


isRoomToday(room: RoomData): boolean {
  const base = room && room.date ? new Date(room.date) : new Date(this.selectedDate);
  const now  = new Date();
  return this.isSameLocalDay(base, now);
}



private urgencyIconRaw(u: any): string {
  var s = (u == null ? '' : String(u)).trim();
  if (!s) return '';
  var low = s.toLowerCase();


  if (s.indexOf('דחוף') >= 0 || low.indexOf('urgent') >= 0) return '🚑';     // or '⚠️'
  if (s.indexOf('ססיה') >= 0 || s.indexOf('אשפוז') >= 0 || low.indexOf('inpatient') >= 0) return '🏥';
  if (s.indexOf('אלקטיב') >= 0 || low.indexOf('elect') >= 0) return '📖';
  if (s.indexOf('ללא עדיפות') >= 0 || low.indexOf('no priority') >= 0 || low.indexOf('none') >= 0 || low.indexOf('routine') >= 0) return '⬇️';
  if (s.indexOf('אמבולטורי') >= 0 || low.indexOf('ambulatory') >= 0 || low.indexOf('outpatient') >= 0) return '🚶';
  return '';
}


getUrgencyIconFromSurgery(s: any): string {
  if (!s) return '';
  var u = (s.urgency != null ? s.urgency : (s as any).Urgency);
  return this.urgencyIconRaw(u);
}


getHeaderProgressIcon(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return '';

  var anchor = room.date || this.selectedDate;
  var dayStart = this.workingStart(anchor);
  var dayEnd   = this.workingEnd(anchor);
  var DAY_MS   = 24 * 60 * 60 * 1000;


  function parse(self: any, clk: string, base: any): Date | null {
    return clk ? self.parseClockWithDate(clk, base) : null;
  }
  function overlaps(e: Date, x: Date): boolean {
    return e < dayEnd && x > dayStart;
  }
  function startTs(self: any, s: any): number {
    var base = s.surgeryDate || anchor;
    var e = parse(self, s.timeEntrance, base);
    var x = parse(self, (s.timeExit && s.timeExit !== '00:00:00') ? s.timeExit : s.timeEntrance, base);
    if (!e || !x) return Number.POSITIVE_INFINITY;
    if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
    return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
  }


  var bestInProg: any = null, bestTs = -Infinity;
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    if (s.status !== 'InProgress') continue;
    var ts = startTs(this, s);
    if (ts !== Number.POSITIVE_INFINITY && ts > bestTs) { bestInProg = s; bestTs = ts; }
  }
  if (bestInProg) return this.getUrgencyIconFromSurgery(bestInProg);


  var next: any = null, nextTs = Number.POSITIVE_INFINITY;
  for (var j = 0; j < room.surgeries.length; j++) {
    var t = room.surgeries[j];
    if (t.status === 'Completed') continue;
    var ts2 = startTs(this, t);
    if (ts2 < nextTs) { next = t; nextTs = ts2; }
  }
  if (next) return this.getUrgencyIconFromSurgery(next);


  var last: any = null, lastTs = -Infinity;
  for (var k = 0; k < room.surgeries.length; k++) {
    var c = room.surgeries[k];
    if (c.status !== 'Completed') continue;
    var ts3 = startTs(this, c);
    if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) { last = c; lastTs = ts3; }
  }
  if (last) return this.getUrgencyIconFromSurgery(last);

  return '';
}

hasInProgress(room: RoomData): boolean {
  if (!room || !room.surgeries || !room.surgeries.length) return false;
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    if (s && s.status === 'InProgress') return true;
  }
  return false;
}



getUrgencyTextFromSurgery(s: any): string {
  if (!s) return '';
  var u = (s.urgency != null ? s.urgency : (s as any).Urgency);
  return u != null ? String(u) : '';
}


getHeaderProgressTitle(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return '';

  var anchor = room.date || this.selectedDate;
  var dayStart = this.workingStart(anchor);
  var dayEnd   = this.workingEnd(anchor);
  var DAY_MS   = 24 * 60 * 60 * 1000;
  var chosen: any = null;
  var chosenTs = -Infinity;

  function parse(self: any, clk: string, base: any): Date | null {
    return clk ? self.parseClockWithDate(clk, base) : null;
  }
  function overlaps(e: Date, x: Date): boolean {
    return e < dayEnd && x > dayStart;
  }
  function startTs(self: any, s: any): number {
    var base = s.surgeryDate || anchor;
    var e = parse(self, s.timeEntrance, base);
    var x = parse(self, (s.timeExit && s.timeExit !== '00:00:00') ? s.timeExit : s.timeEntrance, base);
    if (!e || !x) return Number.POSITIVE_INFINITY;
    if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
    return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
  }

  
  for (var i = 0; i < room.surgeries.length; i++) {
    var s1 = room.surgeries[i];
    if (s1.status !== 'InProgress') continue;
    var ts1 = startTs(this, s1);
    if (ts1 !== Number.POSITIVE_INFINITY && ts1 > chosenTs) { chosen = s1; chosenTs = ts1; }
  }
  
  if (!chosen) {
    var next: any = null, nextTs = Number.POSITIVE_INFINITY;
    for (var j = 0; j < room.surgeries.length; j++) {
      var s2 = room.surgeries[j];
      if (s2.status === 'Completed') continue;
      var ts2 = startTs(this, s2);
      if (ts2 < nextTs) { next = s2; nextTs = ts2; }
    }
    chosen = next;
  }
  
  if (!chosen) {
    var last: any = null, lastTs = -Infinity;
    for (var k = 0; k < room.surgeries.length; k++) {
      var s3 = room.surgeries[k];
      if (s3.status !== 'Completed') continue;
      var ts3 = startTs(this, s3);
      if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) { last = s3; lastTs = ts3; }
    }
    chosen = last;
  }

  return chosen ? this.getUrgencyTextFromSurgery(chosen) : '';
}


  onMatDateChange(d: Date | null) {
    if (!d || isNaN(d.getTime())) { this.selectedDate = null as any; return; }
    const yyyy = d.getFullYear();
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const dd = ('0' + d.getDate()).slice(-2);
    this.selectedDate = `${yyyy}-${mm}-${dd}`;
    this.onDateChange();
  }
  
}
