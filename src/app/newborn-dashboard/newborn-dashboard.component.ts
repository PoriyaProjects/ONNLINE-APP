import { Component, HostListener, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
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

type ViewMode = 'home' | 'summary' | 'details' | 'monitoring';
type HomeSubView = 'landing' | 'monthly';
type DataDisplayMode = 'chart' | 'table';

const MONTH_LABELS = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

@Component({
  selector: 'app-newborn-dashboard',
  templateUrl: './newborn-dashboard.component.html',
  styleUrls: ['./newborn-dashboard.component.css'],
})
export class NewbornDashboardComponent implements OnInit {
  readonly dashboardTitle = 'דשבורד לידות';
  readonly statusOptions = ['', 'לידה', 'ללא לידה', 'עדיין במעקב'];

  viewMode: ViewMode = 'home';
  homeSubView: HomeSubView = 'landing';
  dataDisplayMode: DataDisplayMode = 'chart';
  isDark = false;
  dashLoading = false;
  showFiltersSidebar = false;
  tableSearch = '';
  lastUpdateDate = '';
  weeklyChartHeight = 180;
  dataChartHeight = 320;

  weeklyStats: WeeklyBirthStats = { currentWeekBirths: 0, weeklyAverage: 0, deltaPercent: 0, weekLabel: '' };
  homeSlices: HomeSliceCard[] = [];
  weeklyTrend: WeeklyTrendPoint[] = [];
  selectedDrillMonth: number | null = 1;
  yearRangeFrom: number;
  yearRangeTo: number;
  availableYears: number[] = [];

  weeklyChartType = 'ComboChart';
  weeklyChartColumns: (string | Record<string, unknown>)[] = [];
  weeklyChartRows: (string | number)[][] = [];
  weeklyChartOptions: Record<string, unknown> = {};

  monthlyDrillChartType = 'ColumnChart';
  monthlyDrillColumns: (string | Record<string, unknown>)[] = ['שנה', 'לידות'];
  monthlyDrillRows: (string | number)[][] = [];
  monthlyDrillOptions: Record<string, unknown> = {};

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

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChart();
    this.recalcHomeCharts();
    this.recalcLayoutHeights();
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
    this.viewMode = mode;
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

  openMonthlyChart(): void {
    this.viewMode = 'home';
    this.homeSubView = 'monthly';
    if (this.selectedDrillMonth == null) {
      this.selectedDrillMonth = new Date().getMonth() + 1;
    }
    this.buildMonthlyDrillChart();
    this.recalcLayoutHeights();
  }

  closeMonthlyChart(): void {
    this.homeSubView = 'landing';
    this.recalcLayoutHeights();
  }

  openDataView(mode: ViewMode = 'summary'): void {
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
    if (this.viewMode === 'home') {
      this.buildHomeView();
      return;
    }
    this.loadDashboard();
  }

  applyFilters(): void {
    this.loadDashboard();
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

  statusClass(status: string): string {
    if (status === 'לידה') return 'status-chip status-chip--delivered';
    if (status === 'ללא לידה') return 'status-chip status-chip--missed';
    return 'status-chip status-chip--active';
  }

  openMonthDrill(month: number): void {
    this.selectedDrillMonth = month;
    this.buildMonthlyDrillChart();
  }

  onYearRangeChange(): void {
    if (this.yearRangeFrom > this.yearRangeTo) {
      const tmp = this.yearRangeFrom;
      this.yearRangeFrom = this.yearRangeTo;
      this.yearRangeTo = tmp;
    }
    if (this.selectedDrillMonth != null) {
      this.buildMonthlyDrillChart();
    }
  }

  get weeklyDeltaClass(): string {
    if (this.weeklyStats.deltaPercent > 0) return 'delta-up';
    if (this.weeklyStats.deltaPercent < 0) return 'delta-down';
    return 'delta-flat';
  }

  get monthlyDrillTitle(): string {
    if (this.selectedDrillMonth == null) return '';
    return `${this.monthLabel(this.selectedDrillMonth)} — השוואה שנתית`;
  }

  private buildHomeView(): void {
    this.allSummaryRows = this.dataService.getAllSummaryRows();
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
    if (this.selectedDrillMonth != null) {
      this.buildMonthlyDrillChart();
    }
    this.recalcHomeCharts();
  }

  private buildMonthlyDrillChart(): void {
    if (this.selectedDrillMonth == null) return;
    const points = this.dataService.computeMonthlyByYear(
      this.allSummaryRows,
      this.selectedDrillMonth,
      this.yearRangeFrom,
      this.yearRangeTo
    );
    this.monthlyDrillColumns = ['שנה', 'לידות', { role: 'annotation', type: 'string' }];
    this.monthlyDrillRows = points.map((p) => [String(p.year), p.births, String(p.births)]);
    this.recalcHomeCharts();
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
    this.monthlyDrillOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      colors: ['#db2777'],
      bar: { groupWidth: bars <= 3 ? '40%' : '55%' },
      hAxis: { textStyle: { fontSize: 12, color: textColor, fontName: 'Arial' } },
      vAxis: { minValue: 0, gridlines: { color: gridColor }, textStyle: { color: textColor, fontName: 'Arial' } },
      chartArea: { width: '88%', height: '68%', top: 24, left: 56 },
      annotations: { alwaysOutside: true, textStyle: { fontSize: 12, color: textColor, auraColor: 'none' } },
      animation: { startup: true, duration: 450, easing: 'out' },
    };
  }

  private loadDashboard(): void {
    this.dashLoading = true;
    forkJoin({
      summary: this.dataService.getBirthSummary(this.filters),
      details: this.dataService.getBirthDetails(this.filters),
      monitoring: this.dataService.getPregnancyMonitoring(this.filters),
    }).subscribe({
      next: ({ summary, details, monitoring }) => {
        this.summaryDataSource.data = summary || [];
        this.detailDataSource.data = details || [];
        this.monitoringDataSource.data = monitoring || [];
        this.yishuvOptions = this.dataService.getYishuvOptions(summary || []);
        this.yearOptions = this.dataService.getYearOptions(summary || [], details || [], monitoring || []);
        this.kpis = this.dataService.computeKpis(summary || [], monitoring || [], details || []);
        this.applyTableSearch();
        if (this.viewMode === 'home') {
          this.buildHomeView();
        } else {
          this.buildChart();
          this.recalcChart();
        }
        this.lastUpdateDate = this.now();
        this.dashLoading = false;
      },
      error: () => {
        this.dashLoading = false;
      },
    });
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
