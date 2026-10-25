import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  BirthDetailRow,
  BirthSummaryRow,
  HomeSliceCard,
  NewbornDashboardDataService,
  NewBornDashboardFilters,
  NewBornDashboardKpis,
  PregnancyMonitoringRow,
  WeeklyBirthStats,
  WeeklyTrendPoint,
} from './newborn-dashboard-data.service';
import {
  createDashboardLoadState,
  DashboardDatasetKey,
  DashboardLoadState,
  finishDatasetLoad,
  isAnyDatasetLoading,
  isAnyDatasetStaging,
  loadedDatasetCount,
  startDatasetLoad,
  updateDatasetStaging,
} from './newborn-dashboard-load.state';
import {
  aggregateStreetHeat,
  BirthStreetHeatRow,
  buildHeatViewport,
  filterStreetHeatRows,
  fitHeatView,
  HeatSpotView,
  HeatTile,
  panHeatCenter,
  rankStreetHeat,
  StreetHeatMode,
  StreetHeatPoint,
  StreetHeatRank,
} from './street-heatmap.logic';

type ViewMode = 'home' | 'summary' | 'details' | 'monitoring' | 'heatmap';
type HomeSubView = 'landing' | 'monthly';
type DataDisplayMode = 'chart' | 'table';

const MONTH_LABELS = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const MONTHLY_YEAR_COLORS = [
  '#db2777', '#2563eb', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#0d9488',
];

interface MonthlyDrillLegendItem {
  label: string;
  color: string;
  births: number;
  year: number;
}

function buildYearColorMap(years: number[]): Map<number, string> {
  const sorted = [...years].sort((a, b) => a - b);
  const map = new Map<number, string>();
  sorted.forEach((year, index) => {
    map.set(year, MONTHLY_YEAR_COLORS[index % MONTHLY_YEAR_COLORS.length]);
  });
  return map;
}

@Component({
  selector: 'app-newborn-dashboard',
  templateUrl: './newborn-dashboard.component.html',
  styleUrls: ['./newborn-dashboard.component.css'],
})
export class NewbornDashboardComponent implements OnInit, OnDestroy {
  readonly dashboardTitle = 'דשבורד לידות';
  readonly statusOptions = ['', 'לידה', 'ללא לידה', 'עדיין במעקב'];
  readonly STAGED_TABLE_THRESHOLD = 80;
  readonly STAGED_TABLE_CHUNK = 40;
  readonly heatModeOptions: { id: StreetHeatMode; label: string; hint: string }[] = [
    { id: 'births', label: 'לידות', hint: 'עוצמה לפי כמות הלידות ברחוב' },
    { id: 'missed', label: 'ביקורים ללא לידה', hint: 'עוצמה לפי ביקורים במיון יולדות שלא הסתיימו בלידה אצלנו' },
    { id: 'loss', label: 'פספוס לידות', hint: 'עוצמה לפי אחוז הפספוס ברחוב. הרשימה מציגה גם את הכמות' },
    { id: 'potential', label: 'פוטנציאל', hint: 'עוצמה לפי כלל המקרים ברחוב — לידה וללא לידה' },
  ];

  loadState: DashboardLoadState = createDashboardLoadState();
  private loadSubs: Subscription[] = [];
  private stagedTimers: ReturnType<typeof setTimeout>[] = [];

  viewMode: ViewMode = 'home';
  homeSubView: HomeSubView = 'landing';
  dataDisplayMode: DataDisplayMode = 'chart';
  isDark = false;
  showFiltersSidebar = false;
  tableSearch = '';
  lastUpdateDate = '';
  weeklyChartHeight = 180;
  dataChartHeight = 320;

  weeklyStats: WeeklyBirthStats = { currentWeekBirths: 0, weeklyAverage: 0, deltaPercent: 0, weekLabel: '' };
  homeSlices: HomeSliceCard[] = [];
  weeklyTrend: WeeklyTrendPoint[] = [];
  selectedDrillMonth: number | null = null;
  yearRangeFrom: number;
  yearRangeTo: number;
  availableYears: number[] = [];

  weeklyChartType = 'ComboChart';
  weeklyChartColumns: (string | Record<string, unknown>)[] = [];
  weeklyChartRows: (string | number)[][] = [];
  weeklyChartOptions: Record<string, unknown> = {};

  monthlyDrillChartType = 'ColumnChart';
  monthlyDrillColumns: (string | Record<string, unknown>)[] = ['תקופה', 'לידות'];
  monthlyDrillRows: (string | number)[][] = [];
  monthlyDrillOptions: Record<string, unknown> = {};
  monthlyDrillLegend: MonthlyDrillLegendItem[] = [];
  monthlyYearColors: string[] = [];

  allSummaryRows: BirthSummaryRow[] = [];

  filters: NewBornDashboardFilters = {
    startDate: '2022-01-01',
    endDate: '2027-01-01',
    year: null,
    month: null,
    yishuv: '',
    status: '',
  };

  yishuvOptions: string[] = [];
  yearOptions: number[] = [];
  kpis: NewBornDashboardKpis = {
    totalBirths: 0,
    uniqueCities: 0,
    avgPregnancyWeek: 0,
    monitoringActive: 0,
    monitoringDelivered: 0,
    monitoringMissed: 0,
  };

  summaryDataSource = new MatTableDataSource<BirthSummaryRow>([]);
  detailDataSource = new MatTableDataSource<BirthDetailRow>([]);
  monitoringDataSource = new MatTableDataSource<PregnancyMonitoringRow>([]);

  summaryColumns = ['Year', 'Yishuv', 'Births'];
  detailColumns = ['PatientId', 'NewbornDob', 'City', 'PregnancyWeek'];
  monitoringColumns = ['PatientId', 'City', 'VisitDate', 'Status'];

  chartType = 'ColumnChart';
  chartColumns: (string | Record<string, unknown>)[] = ['חודש', 'לידות'];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;

  heatMode: StreetHeatMode = 'births';
  heatMapType: 'roadmap' | 'hybrid' = 'roadmap';
  heatLoading = false;
  heatFromServer = true;
  heatPoints: StreetHeatPoint[] = [];
  heatRanking: StreetHeatRank[] = [];
  heatUnmapped: string[] = [];
  heatCenter = { lat: 32.86, lng: 35.36 };
  heatZoom = 10;
  heatTiles: HeatTile[] = [];
  heatSpots: HeatSpotView[] = [];
  @ViewChild('heatMapWrap') heatMapWrap: ElementRef;
  heatSelectedKey = '';
  heatCityOptions: string[] = [];
  private heatSourceRows: BirthStreetHeatRow[] = [];
  private heatSub: Subscription | null = null;
  private heatDrag: { x: number; y: number; lat: number; lng: number } | null = null;

  constructor(private dataService: NewbornDashboardDataService) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearRangeFrom = currentYear - 4;
    this.yearRangeTo = currentYear;
    this.isDark = localStorage.getItem('newbornDashboard.theme') === 'dark';
    this.applyTableFilterPredicate();
    this.recalcLayoutHeights();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.clearLoadSubscriptions();
    this.clearStagedTimers();
    if (this.heatSub) this.heatSub.unsubscribe();
  }

  get isAnyLoading(): boolean {
    return isAnyDatasetLoading(this.loadState);
  }

  get isAnyStaging(): boolean {
    return isAnyDatasetStaging(this.loadState);
  }

  get loadingProgressText(): string {
    const parts: string[] = [];
    if (this.loadState.summary.loading) parts.push('סיכום');
    if (this.loadState.details.loading) parts.push('פירוט');
    if (this.loadState.monitoring.loading) parts.push('מעקב');
    if (!parts.length && this.isAnyStaging) return 'מציג נתונים בשלבים...';
    if (!parts.length) return '';
    return `טוען: ${parts.join(' · ')} (${loadedDatasetCount(this.loadState)}/3)`;
  }

  isDatasetLoading(key: DashboardDatasetKey): boolean {
    return this.loadState[key].loading;
  }

  isDatasetStaging(key: DashboardDatasetKey): boolean {
    return this.loadState[key].staging;
  }

  datasetCount(key: DashboardDatasetKey): number {
    return this.loadState[key].count;
  }

  datasetStagedCount(key: DashboardDatasetKey): number {
    return this.loadState[key].stagedCount;
  }

  isCurrentViewLoading(): boolean {
    if (this.viewMode === 'home' && this.homeSubView === 'landing') {
      return this.loadState.summary.loading || this.loadState.details.loading;
    }
    if (this.viewMode === 'home' && this.homeSubView === 'monthly') {
      return this.loadState.summary.loading;
    }
    if (this.viewMode === 'summary') return this.loadState.summary.loading;
    if (this.viewMode === 'details') return this.loadState.details.loading;
    if (this.viewMode === 'monitoring') return this.loadState.monitoring.loading;
    return false;
  }

  get currentDataKey(): DashboardDatasetKey | null {
    if (this.viewMode === 'summary' || this.viewMode === 'details' || this.viewMode === 'monitoring') {
      return this.viewMode;
    }
    return null;
  }

  isCurrentViewStaging(): boolean {
    const key = this.currentDataKey;
    return key ? this.isDatasetStaging(key) : false;
  }

  currentStagedCount(): number {
    const key = this.currentDataKey;
    return key ? this.datasetStagedCount(key) : 0;
  }

  currentDatasetTotal(): number {
    const key = this.currentDataKey;
    return key ? this.datasetCount(key) : 0;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChart();
    this.recalcHomeCharts();
    this.recalcLayoutHeights();
    this.resizeHeatmap();
  }

  get isDataView(): boolean {
    return this.viewMode === 'summary' || this.viewMode === 'details' || this.viewMode === 'monitoring';
  }

  get homeSlicesCompact(): HomeSliceCard[] {
    return this.homeSlices.slice(0, 2);
  }

  get dataKpis(): { label: string; value: string; accent?: string }[] {
    if (this.viewMode === 'summary') {
      return [
        { label: 'סה״כ לידות', value: String(this.kpis.totalBirths) },
        { label: 'יישובים', value: String(this.kpis.uniqueCities) },
        { label: 'עדכון', value: this.lastUpdateDate || '—', accent: 'muted' },
      ];
    }
    if (this.viewMode === 'details') {
      return [
        { label: 'רשומות', value: String(this.detailDataSource.data.length) },
        { label: 'יישובים', value: String(this.kpis.uniqueCities) },
        { label: 'ממוצע שבוע הריון', value: String(this.kpis.avgPregnancyWeek || '—') },
      ];
    }
    return [
      { label: 'במעקב', value: String(this.kpis.monitoringActive), accent: 'accent' },
      { label: 'לידה', value: String(this.kpis.monitoringDelivered), accent: 'success' },
      { label: 'ללא לידה', value: String(this.kpis.monitoringMissed), accent: 'warn' },
    ];
  }

  setViewMode(mode: ViewMode): void {
    this.leaveHeatmap(mode);
    this.viewMode = mode;
    if (mode === 'heatmap') {
      this.recalcLayoutHeights();
      this.loadHeatmap();
      return;
    }
    if (mode === 'home') {
      this.homeSubView = 'landing';
      this.buildHomeCharts();
      return;
    }
    this.tableSearch = '';
    this.applyTableSearch();
    this.buildChart();
    this.recalcChart();
  }

  openHeatmap(): void {
    this.setViewMode('heatmap');
  }

  openMonthlyChart(): void {
    this.viewMode = 'home';
    this.homeSubView = 'monthly';
    this.selectedDrillMonth = null;
    this.buildMonthlyDrillChart();
    this.recalcLayoutHeights();
  }

  closeMonthlyChart(): void {
    this.homeSubView = 'landing';
    this.recalcLayoutHeights();
  }

  openDataView(mode: ViewMode = 'summary'): void {
    this.leaveHeatmap(mode);
    this.viewMode = mode;
    this.dataDisplayMode = 'chart';
    this.tableSearch = '';
    this.applyTableSearch();
    if (!this.summaryDataSource.data.length) {
      this.loadDashboard();
    } else {
      this.buildChart();
      this.recalcChart();
    }
  }

  setDataSubMode(mode: 'summary' | 'details' | 'monitoring'): void {
    this.viewMode = mode;
    this.tableSearch = '';
    this.applyTableSearch();
    this.buildChart();
    this.recalcChart();
  }

  toggleDataDisplay(): void {
    this.dataDisplayMode = this.dataDisplayMode === 'chart' ? 'table' : 'chart';
    if (this.dataDisplayMode === 'chart') {
      this.recalcChart();
    }
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('newbornDashboard.theme', this.isDark ? 'dark' : 'light');
    this.recalcChart();
    this.recalcHomeCharts();
  }

  toggleFiltersSidebar(): void {
    this.showFiltersSidebar = !this.showFiltersSidebar;
  }

  refreshDashboard(): void {
    this.loadDashboard();
    if (this.viewMode === 'heatmap') this.loadHeatmap();
  }

  applyFilters(): void {
    this.loadDashboard();
    if (this.viewMode === 'heatmap') this.loadHeatmap();
    this.showFiltersSidebar = false;
  }

  resetFilters(): void {
    this.filters = {
      startDate: '2022-01-01',
      endDate: '2027-01-01',
      year: null,
      month: null,
      yishuv: '',
      status: '',
    };
    this.loadDashboard();
    if (this.viewMode === 'heatmap') this.loadHeatmap();
  }

  applyTableSearch(): void {
    const q = (this.tableSearch || '').trim().toLowerCase();
    this.summaryDataSource.filter = q;
    this.detailDataSource.filter = q;
    this.monitoringDataSource.filter = q;
  }

  clearTableSearch(): void {
    this.tableSearch = '';
    this.applyTableSearch();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filters.year != null) count++;
    if (this.filters.month != null) count++;
    if (this.filters.yishuv) count++;
    if (this.filters.status) count++;
    return count;
  }

  get filterSummaryText(): string {
    const parts: string[] = [];
    if (this.filters.year != null) parts.push(`שנה: ${this.filters.year}`);
    if (this.filters.month != null) parts.push(`חודש: ${this.monthLabel(this.filters.month)}`);
    if (this.filters.yishuv) parts.push(`יישוב: ${this.filters.yishuv}`);
    if (this.filters.status) parts.push(`סטטוס: ${this.filters.status}`);
    parts.push(`טווח: ${this.filters.startDate} — ${this.filters.endDate}`);
    return parts.join(' · ');
  }

  get heatModeHint(): string {
    const match = this.heatModeOptions.find((mode) => mode.id === this.heatMode);
    return match ? match.hint : '';
  }

  get graphPanelTitle(): string {
    if (this.viewMode === 'summary') return 'לידות לפי חודש';
    if (this.viewMode === 'details') return 'פילוח לידות לפי יישוב';
    if (this.viewMode === 'monitoring') return 'סטטוס מעקב הריון';
    return '';
  }

  get tablePanelTitle(): string {
    if (this.viewMode === 'summary') return 'סיכום לידות לפי יישוב';
    if (this.viewMode === 'details') return 'פירוט לידות';
    if (this.viewMode === 'monitoring') return 'מעקב הריון — ביקורים';
    return '';
  }

  monthLabel(month: number): string {
    return MONTH_LABELS[month] || String(month);
  }

  monthPeriodLabel(month: number, year: number): string {
    const yy = String(year % 100).padStart(2, '0');
    return `${month}.${yy}`;
  }

  statusClass(status: string): string {
    if (status === 'לידה') return 'status-chip status-chip--delivered';
    if (status === 'ללא לידה') return 'status-chip status-chip--missed';
    return 'status-chip status-chip--active';
  }

  openMonthDrill(month: number): void {
    this.selectedDrillMonth = month;
    this.buildMonthlyDrillChart();
  }

  showAllMonthsChart(): void {
    this.selectedDrillMonth = null;
    this.buildMonthlyDrillChart();
  }

  onYearRangeChange(): void {
    if (this.yearRangeFrom > this.yearRangeTo) {
      const tmp = this.yearRangeFrom;
      this.yearRangeFrom = this.yearRangeTo;
      this.yearRangeTo = tmp;
    }
    this.buildMonthlyDrillChart();
  }

  get weeklyDeltaClass(): string {
    if (this.weeklyStats.deltaPercent > 0) return 'delta-up';
    if (this.weeklyStats.deltaPercent < 0) return 'delta-down';
    return 'delta-flat';
  }

  get monthlyDrillTitle(): string {
    if (this.selectedDrillMonth == null) {
      return 'לידות לפי חודשים — קיבוץ שנתי';
    }
    return `${this.monthLabel(this.selectedDrillMonth)} — פירוט חודש.שנה`;
  }

  setHeatMode(mode: StreetHeatMode): void {
    this.heatMode = mode;
    this.renderHeatmap(false);
  }

  setHeatMapType(type: 'roadmap' | 'hybrid'): void {
    this.heatMapType = type;
    this.paintHeatmap();
  }

  onHeatCityChange(): void {
    this.applyHeatRows(true);
  }

  focusHeatStreet(row: StreetHeatRank): void {
    this.heatSelectedKey = row.city + '\n' + row.street;
    if (row.lat == null || row.lng == null) return;
    this.heatCenter = { lat: row.lat, lng: row.lng };
    this.heatZoom = Math.max(this.heatZoom, 14);
    this.paintHeatmap();
  }

  stepHeatZoom(delta: number): void {
    this.heatZoom = Math.max(7, Math.min(16, this.heatZoom + delta));
    this.paintHeatmap();
  }

  onHeatWheel(event: WheelEvent): void {
    event.preventDefault();
    this.stepHeatZoom(event.deltaY < 0 ? 1 : -1);
  }

  onHeatPointerDown(event: PointerEvent): void {
    this.heatDrag = {
      x: event.clientX,
      y: event.clientY,
      lat: this.heatCenter.lat,
      lng: this.heatCenter.lng,
    };
  }

  onHeatPointerMove(event: PointerEvent): void {
    if (!this.heatDrag) return;
    const next = panHeatCenter(
      this.heatDrag.lat,
      this.heatDrag.lng,
      this.heatZoom,
      event.clientX - this.heatDrag.x,
      event.clientY - this.heatDrag.y
    );
    this.heatCenter = next;
    this.paintHeatmap();
  }

  onHeatPointerUp(): void {
    this.heatDrag = null;
  }

  private leaveHeatmap(next: ViewMode): void {
    if (this.viewMode !== 'heatmap' || next === 'heatmap') return;
    this.heatDrag = null;
  }

  loadHeatmap(): void {
    if (this.heatSub) this.heatSub.unsubscribe();
    this.heatLoading = true;
    this.heatSub = this.dataService.getBirthStreetHeatmap({ ...this.filters, yishuv: '' }).subscribe({
      next: (result) => {
        this.heatLoading = false;
        this.heatFromServer = result.fromServer;
        this.heatSourceRows = result.rows;
        this.refreshHeatCityOptions();
        this.applyHeatRows(true);
        setTimeout(() => this.fitHeatmap(), 0);
      },
      error: () => {
        this.heatLoading = false;
        this.heatFromServer = false;
        this.heatPoints = [];
        this.heatRanking = [];
        this.heatTiles = [];
        this.heatSpots = [];
      },
    });
  }

  private refreshHeatCityOptions(): void {
    const cities = new Set<string>();
    this.heatSourceRows.forEach((row) => {
      if (row.City) cities.add(row.City);
    });
    this.yishuvOptions.forEach((city) => cities.add(city));
    this.heatCityOptions = Array.from(cities).sort((a, b) => a.localeCompare(b, 'he'));
  }

  private applyHeatRows(fit: boolean): void {
    const rows = filterStreetHeatRows(this.heatSourceRows, this.filters);
    const aggregated = aggregateStreetHeat(rows);
    this.heatUnmapped = aggregated.unmapped;
    this.renderHeatmap(fit, aggregated.points);
  }

  private renderHeatmap(fit: boolean, points?: StreetHeatPoint[]): void {
    if (points) this.heatPoints = points;
    this.heatRanking = rankStreetHeat(this.heatPoints, this.heatMode);
    if (fit) this.fitHeatmap();
    else this.paintHeatmap();
  }

  private fitHeatmap(): void {
    const size = this.heatMapSize();
    const fitted = fitHeatView(this.heatRanking, size.width, size.height);
    this.heatCenter = { lat: fitted.lat, lng: fitted.lng };
    this.heatZoom = fitted.zoom;
    this.paintHeatmap();
  }

  private resizeHeatmap(): void {
    if (this.viewMode !== 'heatmap') return;
    this.paintHeatmap();
  }

  private paintHeatmap(): void {
    const size = this.heatMapSize();
    const view = buildHeatViewport({
      lat: this.heatCenter.lat,
      lng: this.heatCenter.lng,
      zoom: this.heatZoom,
      width: size.width,
      height: size.height,
      satellite: this.heatMapType === 'hybrid',
      points: this.heatRanking,
    });
    this.heatTiles = view.tiles;
    this.heatSpots = view.spots;
  }

  private heatMapSize(): { width: number; height: number } {
    const wrap = this.heatMapWrap && this.heatMapWrap.nativeElement;
    return {
      width: wrap && wrap.clientWidth > 80 ? wrap.clientWidth : 800,
      height: wrap && wrap.clientHeight > 80 ? wrap.clientHeight : 480,
    };
  }

  private buildHomeView(): void {
    this.weeklyStats = this.dataService.computeWeeklyStats(
      this.allSummaryRows,
      this.detailDataSource.data
    );
    this.homeSlices = this.dataService.computeHomeSlices(this.allSummaryRows);
    this.weeklyTrend = this.dataService.getWeeklyTrend(this.detailDataSource.data);
    this.availableYears = this.dataService.getAvailableYears(this.allSummaryRows);
    this.buildHomeCharts();
    this.lastUpdateDate = this.now();
    this.recalcLayoutHeights();
  }

  private buildHomeCharts(): void {
    const avg = this.weeklyStats.weeklyAverage;
    this.weeklyChartColumns = [
      'שבוע',
      'לידות',
      { type: 'number', role: 'annotation' },
      'ממוצע שבועי',
    ];
    this.weeklyChartRows = this.weeklyTrend.map((p) => [
      p.weekLabel,
      p.births,
      String(p.births),
      avg,
    ]);
    if (this.homeSubView === 'monthly') {
      this.buildMonthlyDrillChart();
    }
    this.recalcHomeCharts();
  }

  private getYearRangeList(): number[] {
    const from = Math.min(this.yearRangeFrom, this.yearRangeTo);
    const to = Math.max(this.yearRangeFrom, this.yearRangeTo);
    const years: number[] = [];
    for (let year = from; year <= to; year++) {
      years.push(year);
    }
    return years;
  }

  private sumMonthYearBirths(month: number, year: number): number {
    return this.allSummaryRows
      .filter((r) => r.Month === month && r.Year === year)
      .reduce((sum, r) => sum + (Number(r.Births) || 0), 0);
  }

  private sumYearBirths(year: number): number {
    return this.allSummaryRows
      .filter((r) => r.Year === year)
      .reduce((sum, r) => sum + (Number(r.Births) || 0), 0);
  }

  private buildMonthlyDrillChart(): void {
    const years = this.getYearRangeList();
    if (!years.length) {
      this.monthlyDrillRows = [];
      this.monthlyDrillLegend = [];
      this.monthlyYearColors = [];
      this.recalcHomeCharts();
      return;
    }

    const yearColors = buildYearColorMap(years);
    this.monthlyYearColors = years.map((year) => yearColors.get(year) || MONTHLY_YEAR_COLORS[0]);
    this.monthlyDrillLegend = years
      .slice()
      .sort((a, b) => b - a)
      .map((year) => ({
        label: String(year),
        color: yearColors.get(year) || MONTHLY_YEAR_COLORS[0],
        births: this.sumYearBirths(year),
        year,
      }));

    if (this.selectedDrillMonth == null) {
      this.buildGroupedMonthsChart(years);
    } else {
      this.buildSingleMonthChart(this.selectedDrillMonth, years, yearColors);
    }

    this.recalcHomeCharts();
  }

  /** כל 12 החודשים — בכל קבוצה עמודה לכל שנה, צבע קבוע לשנה */
  private buildGroupedMonthsChart(years: number[]): void {
    this.monthlyDrillChartType = 'ColumnChart';
    this.monthlyDrillColumns = ['חודש', ...years.map((y) => String(y))];
    this.monthlyDrillRows = [];

    for (let month = 1; month <= 12; month++) {
      const row: (string | number)[] = [this.monthLabel(month)];
      years.forEach((year) => {
        row.push(this.sumMonthYearBirths(month, year));
      });
      this.monthlyDrillRows.push(row);
    }
  }

  /** חודש בודד — תוויות 11.26, 11.25... צבע לפי שנה */
  private buildSingleMonthChart(
    month: number,
    years: number[],
    yearColors: Map<number, string>
  ): void {
    const sortedYears = years.slice().sort((a, b) => b - a);
    this.monthlyDrillChartType = 'ColumnChart';
    this.monthlyDrillColumns = [
      'תקופה',
      'לידות',
      { role: 'style' },
      { role: 'annotation', type: 'string' },
    ];

    this.monthlyDrillLegend = sortedYears.map((year) => ({
      label: this.monthPeriodLabel(month, year),
      color: yearColors.get(year) || MONTHLY_YEAR_COLORS[0],
      births: this.sumMonthYearBirths(month, year),
      year,
    }));

    this.monthlyDrillRows = this.monthlyDrillLegend.map((item) => [
      item.label,
      item.births,
      item.color,
      String(item.births),
    ]);
  }

  private recalcLayoutHeights(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const compact = vh < 720;
    this.chartWidth = Math.max(Math.min(vw - 48, 1200), 280);
    this.weeklyChartHeight = compact ? 140 : vh < 900 ? 165 : 190;
    this.dataChartHeight = compact ? 260 : vh < 900 ? 300 : 340;
  }

  private recalcHomeCharts(): void {
    const textColor = this.isDark ? '#e5e7eb' : '#0f172a';
    const gridColor = this.isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

    this.weeklyChartOptions = {
      legend: { position: 'top', alignment: 'center', textStyle: { color: textColor, fontName: 'Arial' } },
      backgroundColor: 'transparent',
      seriesType: 'bars',
      series: {
        0: { color: '#ec4899', targetAxisIndex: 0 },
        1: { type: 'line', color: '#2563eb', lineWidth: 2, pointSize: 0, targetAxisIndex: 0 },
      },
      bar: { groupWidth: '55%' },
      hAxis: { textStyle: { fontSize: 10, color: textColor, fontName: 'Arial' }, slantedText: true, slantedTextAngle: 35 },
      vAxis: { minValue: 0, gridlines: { color: gridColor }, textStyle: { color: textColor, fontName: 'Arial' } },
      chartArea: { width: '90%', height: '62%', top: 40, left: 50 },
      annotations: { alwaysOutside: true, textStyle: { fontSize: 10, color: textColor, auraColor: 'none' } },
      animation: { startup: true, duration: 450, easing: 'out' },
    };

    const bars = Math.max(this.monthlyDrillRows.length, 1);
    const isGroupedMonths = this.selectedDrillMonth == null;

    if (isGroupedMonths) {
      this.monthlyDrillOptions = {
        legend: { position: 'top', alignment: 'center', textStyle: { color: textColor, fontName: 'Arial' } },
        colors: this.monthlyYearColors,
        backgroundColor: 'transparent',
        isStacked: false,
        bar: { groupWidth: bars > 8 ? '72%' : '80%' },
        hAxis: {
          title: 'חודש',
          titleTextStyle: { color: textColor, fontSize: 11 },
          textStyle: { fontSize: 11, color: textColor, fontName: 'Arial' },
          slantedText: true,
          slantedTextAngle: 35,
        },
        vAxis: {
          title: 'לידות',
          titleTextStyle: { color: textColor, fontSize: 11 },
          minValue: 0,
          gridlines: { color: gridColor },
          textStyle: { color: textColor, fontName: 'Arial' },
        },
        chartArea: { width: '88%', height: '58%', top: 48, left: 56 },
        animation: { startup: true, duration: 450, easing: 'out' },
      };
      return;
    }

    this.monthlyDrillOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      bar: { groupWidth: bars <= 3 ? '45%' : bars <= 5 ? '55%' : '65%' },
      hAxis: {
        title: 'חודש.שנה',
        titleTextStyle: { color: textColor, fontSize: 11, italic: false },
        textStyle: { fontSize: 13, color: textColor, fontName: 'Arial', bold: true },
      },
      vAxis: {
        title: 'לידות',
        titleTextStyle: { color: textColor, fontSize: 11 },
        minValue: 0,
        gridlines: { color: gridColor },
        textStyle: { color: textColor, fontName: 'Arial' },
      },
      chartArea: { width: '88%', height: '62%', top: 28, left: 56 },
      annotations: { alwaysOutside: true, textStyle: { fontSize: 12, color: textColor, auraColor: 'none' } },
      animation: { startup: true, duration: 450, easing: 'out' },
    };
  }

  private loadDashboard(): void {
    this.clearLoadSubscriptions();
    this.clearStagedTimers();
    this.loadState.requestId += 1;
    const requestId = this.loadState.requestId;

    startDatasetLoad(this.loadState, 'summary');
    startDatasetLoad(this.loadState, 'details');
    startDatasetLoad(this.loadState, 'monitoring');

    const onSummary = this.dataService.getBirthSummary(this.filters).pipe(
      finalize(() => {
        if (requestId !== this.loadState.requestId) return;
        if (this.loadState.summary.loading) {
          finishDatasetLoad(this.loadState, 'summary', 0, 'שגיאה בטעינת סיכום');
        }
      })
    ).subscribe({
      next: (summary) => {
        if (requestId !== this.loadState.requestId) return;
        const rows = summary || [];
        finishDatasetLoad(this.loadState, 'summary', rows.length);
        this.applySummaryRows(rows);
        this.onDatasetReady('summary');
      },
      error: () => {
        if (requestId !== this.loadState.requestId) return;
        finishDatasetLoad(this.loadState, 'summary', 0, 'שגיאה בטעינת סיכום');
      },
    });

    const onDetails = this.dataService.getBirthDetails(this.filters).pipe(
      finalize(() => {
        if (requestId !== this.loadState.requestId) return;
        if (this.loadState.details.loading) {
          finishDatasetLoad(this.loadState, 'details', 0, 'שגיאה בטעינת פירוט');
        }
      })
    ).subscribe({
      next: (details) => {
        if (requestId !== this.loadState.requestId) return;
        const rows = details || [];
        finishDatasetLoad(this.loadState, 'details', rows.length);
        this.applyDetailRows(rows);
        this.onDatasetReady('details');
      },
      error: () => {
        if (requestId !== this.loadState.requestId) return;
        finishDatasetLoad(this.loadState, 'details', 0, 'שגיאה בטעינת פירוט');
      },
    });

    const onMonitoring = this.dataService.getPregnancyMonitoring(this.filters).pipe(
      finalize(() => {
        if (requestId !== this.loadState.requestId) return;
        if (this.loadState.monitoring.loading) {
          finishDatasetLoad(this.loadState, 'monitoring', 0, 'שגיאה בטעינת מעקב');
        }
      })
    ).subscribe({
      next: (monitoring) => {
        if (requestId !== this.loadState.requestId) return;
        const rows = monitoring || [];
        finishDatasetLoad(this.loadState, 'monitoring', rows.length);
        this.applyMonitoringRows(rows);
        this.onDatasetReady('monitoring');
      },
      error: () => {
        if (requestId !== this.loadState.requestId) return;
        finishDatasetLoad(this.loadState, 'monitoring', 0, 'שגיאה בטעינת מעקב');
      },
    });

    this.loadSubs = [onSummary, onDetails, onMonitoring];
  }

  private onDatasetReady(key: DashboardDatasetKey): void {
    this.recomputeDerivedState();
    this.lastUpdateDate = this.now();

    if (this.viewMode === 'home') {
      this.buildHomeView();
    } else if (key === this.viewMode || key === 'summary') {
      this.buildChart();
      this.recalcChart();
    }
  }

  private applySummaryRows(rows: BirthSummaryRow[]): void {
    this.allSummaryRows = rows;
    this.yishuvOptions = this.dataService.getYishuvOptions(rows);
    this.stageIntoDataSource('summary', rows, this.summaryDataSource);
  }

  private applyDetailRows(rows: BirthDetailRow[]): void {
    this.stageIntoDataSource('details', rows, this.detailDataSource);
  }

  private applyMonitoringRows(rows: PregnancyMonitoringRow[]): void {
    this.stageIntoDataSource('monitoring', rows, this.monitoringDataSource);
  }

  private stageIntoDataSource<T>(
    key: DashboardDatasetKey,
    rows: T[],
    dataSource: MatTableDataSource<T>
  ): void {
    if (rows.length <= this.STAGED_TABLE_THRESHOLD) {
      dataSource.data = rows;
      updateDatasetStaging(this.loadState, key, rows.length, rows.length);
      this.applyTableSearch();
      return;
    }

    updateDatasetStaging(this.loadState, key, 0, rows.length);
    dataSource.data = [];
    let index = 0;
    const acc: T[] = [];

    const pump = () => {
      if (index >= rows.length) {
        updateDatasetStaging(this.loadState, key, rows.length, rows.length);
        this.applyTableSearch();
        if (this.isDataView && !this.isDatasetLoading(key)) {
          this.buildChart();
          this.recalcChart();
        }
        return;
      }

      const next = rows.slice(index, index + this.STAGED_TABLE_CHUNK);
      acc.push(...next);
      dataSource.data = [...acc];
      index += this.STAGED_TABLE_CHUNK;
      updateDatasetStaging(this.loadState, key, acc.length, rows.length);
      this.applyTableSearch();
      this.recomputeDerivedState();

      if (this.isDataView && this.viewMode === key) {
        this.buildChart();
        this.recalcChart();
      }

      const timer = setTimeout(pump, 0);
      this.stagedTimers.push(timer);
    };

    pump();
  }

  private recomputeDerivedState(): void {
    const summary = this.summaryDataSource.data;
    const details = this.detailDataSource.data;
    const monitoring = this.monitoringDataSource.data;
    this.yearOptions = this.dataService.getYearOptions(summary, details, monitoring);
    this.kpis = this.dataService.computeKpis(summary, monitoring, details);
    this.availableYears = this.dataService.getAvailableYears(this.allSummaryRows);
  }

  private clearLoadSubscriptions(): void {
    this.loadSubs.forEach((s) => s.unsubscribe());
    this.loadSubs = [];
  }

  private clearStagedTimers(): void {
    this.stagedTimers.forEach((t) => clearTimeout(t));
    this.stagedTimers = [];
  }

  private buildChart(): void {
    if (this.viewMode === 'summary') {
      const byMonth = new Map<string, number>();
      this.summaryDataSource.data.forEach((r) => {
        const key = `${r.Year}-${String(r.Month).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) || 0) + r.Births);
      });
      this.chartColumns = ['חודש', 'לידות'];
      this.chartRows = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, births]) => [key, births]);
      return;
    }
    if (this.viewMode === 'details') {
      const byCity = new Map<string, number>();
      this.detailDataSource.data.forEach((r) => {
        const city = (r.City || 'לא ידוע').trim();
        byCity.set(city, (byCity.get(city) || 0) + 1);
      });
      this.chartColumns = ['יישוב', 'לידות'];
      this.chartRows = Array.from(byCity.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([city, count]) => [city, count]);
      return;
    }
    if (this.viewMode === 'monitoring') {
      const statusOrder = ['לידה', 'עדיין במעקב', 'ללא לידה'];
      this.chartColumns = ['סטטוס', 'מטופלות'];
      this.chartRows = statusOrder.map((status) => [
        status,
        this.monitoringDataSource.data.filter((r) => r.Status === status).length,
      ]);
    }
  }

  private recalcChart(): void {
    this.recalcLayoutHeights();
    const textColor = this.isDark ? '#e5e7eb' : '#0f172a';
    const gridColor = this.isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
    const bars = Math.max(this.chartRows.length, 1);

    this.chartOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      bar: { groupWidth: bars > 8 ? '72%' : '55%' },
      colors: this.viewMode === 'monitoring' ? ['#22c55e', '#3b82f6', '#f97316'] : ['#ec4899'],
      hAxis: {
        textStyle: { fontSize: bars > 10 ? 10 : 12, color: textColor, fontName: 'Arial' },
        slantedText: bars > 6,
        slantedTextAngle: 35,
      },
      vAxis: { minValue: 0, gridlines: { color: gridColor }, textStyle: { color: textColor, fontName: 'Arial' } },
      chartArea: { width: '88%', height: '68%', top: 24, left: 56 },
      animation: { startup: true, duration: 450, easing: 'out' },
    };
  }

  private applyTableFilterPredicate(): void {
    const predicate = (data: unknown, filter: string) => {
      if (!filter) return true;
      return Object.values(data as Record<string, unknown>).some((v) =>
        String(v ?? '').toLowerCase().includes(filter)
      );
    };
    this.summaryDataSource.filterPredicate = predicate;
    this.detailDataSource.filterPredicate = predicate;
    this.monitoringDataSource.filterPredicate = predicate;
  }

  private now(): string {
    const d = new Date();
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}
