import { Component, HostListener, OnInit } from '@angular/core';
import {
  applyDarkChartOptions,
  buildRehabMockViewModel,
  RehabMockViewModel,
} from './rehabilitation-dashboard.mock-data';
import {
  MONTH_LABELS_HE,
  REHAB_DEPARTMENTS,
  REHAB_METRICS,
  RehabHospitalizationDaysMode,
  RehabKpiCard,
  RehabMetricDefinition,
  RehabMetricKey,
  RehabPeriodMode,
  RehabTableColumn,
  RehabTableRow,
} from './rehabilitation-dashboard.models';

@Component({
  selector: 'app-rehabilitation-dashboard',
  templateUrl: './rehabilitation-dashboard.component.html',
  styleUrls: ['./rehabilitation-dashboard.component.css'],
})
export class RehabilitationDashboardComponent implements OnInit {
  readonly dashboardTitle = 'דשבורד שיקום';
  readonly metrics = REHAB_METRICS;
  readonly allDepartments = REHAB_DEPARTMENTS;
  readonly monthOptions = MONTH_LABELS_HE.map((label, index) => ({ value: index, label })).filter((m) => m.value > 0);
  readonly availableYears = [2024, 2025, 2026];

  isDark = false;
  showFilterSidebar = true;
  showChartFullModal = false;
  selectedTableRowId: string | null = null;

  periodMode: RehabPeriodMode = 'monthly';
  hospitalizationDaysMode: RehabHospitalizationDaysMode = 'gross';
  activeMetric: RehabMetricKey = 'hospitalization-days';
  selectedYear = 2026;
  selectedMonth: number | null = null;

  selectedDepartments: string[] = [];
  isDeptFilterOpen = false;

  chartType = 'ColumnChart';
  chartColumns: (string | Record<string, unknown>)[] = [];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 360;

  kpis: RehabKpiCard[] = [];
  tableColumns: RehabTableColumn[] = [];
  tableRows: RehabTableRow[] = [];
  periodCaption = '';
  chartHeading = '';

  ngOnInit(): void {
    this.isDark = localStorage.getItem('rehabilitationDashboard.theme') === 'dark';
    this.recalcChartSize();
    this.refreshView();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  get activeMetricDef(): RehabMetricDefinition {
    return this.metrics.find((m) => m.key === this.activeMetric) || this.metrics[0];
  }

  get filterSummary(): string {
    const deptPart = this.selectedDepartments.length
      ? this.selectedDepartments.join(' · ')
      : 'כל מחלקות השיקום';
    const periodPart = this.periodMode === 'monthly' ? 'תצוגה חודשית' : 'תצוגה יומית';
    const monthPart = this.selectedMonth ? MONTH_LABELS_HE[this.selectedMonth] : 'כל השנה';
    return `${periodPart} · ${monthPart} ${this.selectedYear} · ${deptPart}`;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.selectedDepartments.length) count++;
    if (this.selectedMonth) count++;
    return count;
  }

  get showHospitalizationDaysToggle(): boolean {
    return this.activeMetric === 'hospitalization-days';
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('rehabilitationDashboard.theme', this.isDark ? 'dark' : 'light');
    this.applyViewModel(this.currentViewModel);
  }

  toggleFilterSidebar(): void {
    this.showFilterSidebar = !this.showFilterSidebar;
    setTimeout(() => this.recalcChartSize(), 320);
  }

  onMetricChange(metric: RehabMetricKey): void {
    this.activeMetric = metric;
    this.selectedTableRowId = null;
    this.refreshView();
  }

  onPeriodModeChange(mode: RehabPeriodMode): void {
    this.periodMode = mode;
    this.refreshView();
  }

  onHospitalizationDaysModeChange(mode: RehabHospitalizationDaysMode): void {
    this.hospitalizationDaysMode = mode;
    this.refreshView();
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.refreshView();
  }

  onMonthChange(month: number | null): void {
    this.selectedMonth = month;
    this.refreshView();
  }

  toggleDepartment(dept: string, event?: Event): void {
    event?.stopPropagation();
    const idx = this.selectedDepartments.indexOf(dept);
    if (idx >= 0) {
      this.selectedDepartments = this.selectedDepartments.filter((d) => d !== dept);
    } else {
      this.selectedDepartments = [...this.selectedDepartments, dept];
    }
    this.selectedTableRowId = null;
    this.refreshView();
  }

  clearDepartmentFilter(event?: Event): void {
    event?.stopPropagation();
    this.selectedDepartments = [];
    this.selectedTableRowId = null;
    this.refreshView();
  }

  resetFilters(): void {
    this.selectedDepartments = [];
    this.selectedMonth = null;
    this.selectedYear = 2026;
    this.periodMode = 'monthly';
    this.hospitalizationDaysMode = 'gross';
    this.selectedTableRowId = null;
    this.refreshView();
  }

  getDepartmentDisplay(): string {
    if (!this.selectedDepartments.length) return 'מחלקה: הכל';
    if (this.selectedDepartments.length === 1) return `מחלקה: ${this.selectedDepartments[0]}`;
    return `מחלקות: ${this.selectedDepartments.length} נבחרו`;
  }

  toggleDeptFilterDropdown(event: Event): void {
    event.stopPropagation();
    this.isDeptFilterOpen = !this.isDeptFilterOpen;
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.isDeptFilterOpen = false;
  }

  onTableRowClick(row: RehabTableRow): void {
    this.selectedTableRowId = this.selectedTableRowId === row.id ? null : row.id;
  }

  isRowSelected(row: RehabTableRow): boolean {
    return this.selectedTableRowId === row.id;
  }

  openChartFullModal(): void {
    this.showChartFullModal = true;
    this.recalcChartSize(true);
  }

  closeChartFullModal(): void {
    this.showChartFullModal = false;
    this.recalcChartSize();
  }

  getMetricHelp(): string {
    return this.activeMetricDef.help;
  }

  private currentViewModel!: RehabMockViewModel;

  refreshView(): void {
    const vm = buildRehabMockViewModel(
      this.activeMetric,
      this.periodMode,
      this.hospitalizationDaysMode,
      this.selectedDepartments,
      this.selectedTableRowId,
      this.selectedYear,
      this.selectedMonth,
    );
    this.applyViewModel(vm);
  }

  private applyViewModel(vm: RehabMockViewModel): void {
    this.currentViewModel = vm;
    this.chartHeading = vm.chartHeading;
    this.periodCaption = vm.periodCaption;
    this.kpis = vm.kpis;
    this.tableColumns = vm.tableColumns;
    this.tableRows = vm.tableRows.map((row) => ({
      ...row,
      highlight: this.isRowSelected(row),
    }));
    this.chartType = vm.chartType;
    this.chartColumns = vm.chartColumns;
    this.chartRows = vm.chartRows;
    this.chartOptions = this.isDark ? applyDarkChartOptions(vm.chartOptions) : vm.chartOptions;
  }

  private recalcChartSize(fullscreen = false): void {
    const sidebarWidth = this.showFilterSidebar ? 288 : 0;
    const tableWidth = Math.min(window.innerWidth * 0.28, 420);
    const padding = 48;
    const available = window.innerWidth - sidebarWidth - tableWidth - padding;
    this.chartWidth = Math.max(320, Math.floor(available));
    this.chartHeight = fullscreen
      ? Math.max(420, Math.floor(window.innerHeight * 0.72))
      : Math.max(280, Math.min(420, Math.floor(window.innerHeight * 0.42)));
  }
}
