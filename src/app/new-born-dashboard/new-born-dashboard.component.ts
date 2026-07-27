import { Component, HostListener, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import {
  BirthDetailRow,
  BirthSummaryRow,
  NewBornDashboardFilters,
  NewBornDashboardKpis,
  NewBornDashboardService,
  PregnancyMonitoringRow,
} from './new-born-dashboard.service';

type DashboardViewMode = 'summary' | 'details' | 'monitoring';

const MONTH_LABELS = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

@Component({
  selector: 'app-new-born-dashboard',
  templateUrl: './new-born-dashboard.component.html',
  styleUrls: ['./new-born-dashboard.component.css'],
})
export class NewBornDashboardComponent implements OnInit {
  readonly dashboardTitle = 'דשבורד לידות';
  readonly monthLabels = MONTH_LABELS;
  readonly statusOptions = ['', 'לידה', 'ללא לידה', 'עדיין במעקב'];

  viewMode: DashboardViewMode = 'summary';
  isDark = false;
  loading = false;
  showFiltersSidebar = false;
  tableSearch = '';
  lastUpdateDate = '';

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

  summaryRows: BirthSummaryRow[] = [];
  detailRows: BirthDetailRow[] = [];
  monitoringRows: PregnancyMonitoringRow[] = [];

  summaryDataSource = new MatTableDataSource<BirthSummaryRow>([]);
  detailDataSource = new MatTableDataSource<BirthDetailRow>([]);
  monitoringDataSource = new MatTableDataSource<PregnancyMonitoringRow>([]);

  summaryColumns = ['Year', 'Month', 'Yishuv', 'Births'];
  detailColumns = [
    'Year', 'PatientId', 'MotherAgeAtBirth', 'NewbornDob', 'City',
    'HealthFund', 'Nationality', 'PregnancyWeek', 'BirthNumberAtHospital',
  ];
  monitoringColumns = [
    'MonthYear', 'PatientId', 'City', 'HealthFund', 'VisitDate',
    'PregnancyWeekLabel', 'EstimatedBirthDate', 'Status',
  ];

  chartType = 'ColumnChart';
  chartColumns: (string | Record<string, unknown>)[] = ['חודש', 'לידות'];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 360;

  constructor(private readonly dashboardService: NewBornDashboardService) {}

  ngOnInit(): void {
    this.isDark = localStorage.getItem('newbornDash.theme') === 'dark';
    this.applyTableFilterPredicate();
    this.loadDashboard();
    this.recalcChart();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChart();
  }

  setViewMode(mode: DashboardViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.tableSearch = '';
    this.applyTableSearch();
    this.buildChart();
    this.recalcChart();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('newbornDash.theme', this.isDark ? 'dark' : 'light');
    this.recalcChart();
  }

  toggleFiltersSidebar(): void {
    this.showFiltersSidebar = !this.showFiltersSidebar;
  }

  refreshDashboard(): void {
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
    return 'סטטוס מעקב הריון';
  }

  get tablePanelTitle(): string {
    if (this.viewMode === 'summary') return 'סיכום לידות לפי יישוב';
    if (this.viewMode === 'details') return 'פירוט לידות';
    return 'מעקב הריון — ביקורים';
  }

  monthLabel(month: number): string {
    return MONTH_LABELS[month] || String(month);
  }

  statusClass(status: string): string {
    if (status === 'לידה') return 'status-chip status-chip--delivered';
    if (status === 'ללא לידה') return 'status-chip status-chip--missed';
    return 'status-chip status-chip--active';
  }

  private loadDashboard(): void {
    this.loading = true;
    forkJoin({
      summary: this.dashboardService.getBirthSummary(this.filters),
      details: this.dashboardService.getBirthDetails(this.filters),
      monitoring: this.dashboardService.getPregnancyMonitoring(this.filters),
    }).subscribe({
      next: ({ summary, details, monitoring }) => {
        this.summaryRows = summary || [];
        this.detailRows = details || [];
        this.monitoringRows = monitoring || [];

        this.summaryDataSource.data = this.summaryRows;
        this.detailDataSource.data = this.detailRows;
        this.monitoringDataSource.data = this.monitoringRows;

        this.yishuvOptions = this.dashboardService.getYishuvOptions(this.summaryRows);
        this.yearOptions = this.dashboardService.getYearOptions(
          this.summaryRows,
          this.detailRows,
          this.monitoringRows
        );
        this.kpis = this.dashboardService.computeKpis(
          this.summaryRows,
          this.monitoringRows,
          this.detailRows
        );

        this.applyTableSearch();
        this.buildChart();
        this.recalcChart();
        this.lastUpdateDate = this.now();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private buildChart(): void {
    if (this.viewMode === 'summary') {
      const byMonth = new Map<string, number>();
      this.summaryRows.forEach(r => {
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
      this.detailRows.forEach(r => {
        const city = (r.City || 'לא ידוע').trim();
        byCity.set(city, (byCity.get(city) || 0) + 1);
      });
      this.chartColumns = ['יישוב', 'לידות'];
      this.chartRows = Array.from(byCity.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([city, count]) => [city, count]);
      return;
    }

    const statusOrder = ['לידה', 'עדיין במעקב', 'ללא לידה'];
    const counts = statusOrder.map(status => ({
      status,
      count: this.monitoringRows.filter(r => r.Status === status).length,
    }));
    this.chartColumns = ['סטטוס', 'מטופלות'];
    this.chartRows = counts.map(c => [c.status, c.count]);
  }

  private recalcChart(): void {
    const vw = window.innerWidth;
    this.chartWidth = Math.max(Math.min(vw - 80, 1200), 320);
    this.chartHeight = vw < 768 ? 280 : 360;

    const textColor = this.isDark ? '#e5e7eb' : '#0f172a';
    const gridColor = this.isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
    const bars = Math.max(this.chartRows.length, 1);

    this.chartOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      bar: { groupWidth: bars > 8 ? '72%' : '55%' },
      colors: this.viewMode === 'monitoring'
        ? ['#22c55e', '#3b82f6', '#f97316']
        : ['#ec4899'],
      hAxis: {
        textStyle: { fontSize: bars > 10 ? 10 : 12, color: textColor, fontName: 'Arial' },
        slantedText: bars > 6,
        slantedTextAngle: 35,
      },
      vAxis: {
        minValue: 0,
        gridlines: { color: gridColor },
        textStyle: { color: textColor, fontName: 'Arial' },
      },
      chartArea: { width: '88%', height: '68%', top: 24, left: 56 },
      animation: { startup: true, duration: 450, easing: 'out' },
    };
  }

  private applyTableFilterPredicate(): void {
    const predicate = (data: unknown, filter: string) => {
      if (!filter) return true;
      return Object.values(data as Record<string, unknown>).some(v =>
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
