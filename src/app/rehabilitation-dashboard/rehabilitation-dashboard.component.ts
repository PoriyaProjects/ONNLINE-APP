import { Component, HostListener, OnInit } from '@angular/core';
import {
  applyDarkChartOptions,
  buildRehabMockViewModel,
  RehabMockViewModel,
} from './rehabilitation-dashboard.mock-data';
import {
  getBedsForDepartment,
  getInpatientDepartmentsWithBeds,
} from './rehabilitation-bed-capacity.constants';
import { buildRehabStatusViewModel } from './rehabilitation-status.mock-data';
import { RehabStatusBlock, RehabStatusMode, RehabStatusViewModel } from './rehabilitation-status.models';
import {
  getDefaultMetricForSection,
  getDepartmentsForSection,
  getMetricsForSection,
  MONTH_LABELS_HE,
  RehabHospitalizationDaysMode,
  RehabKpiCard,
  RehabMetricDefinition,
  RehabMetricKey,
  RehabPeriodMode,
  RehabSection,
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
  readonly monthOptions = MONTH_LABELS_HE.map((label, index) => ({ value: index, label })).filter((m) => m.value > 0);
  readonly availableYears = [2024, 2025, 2026];

  isDark = false;
  showFilterSidebar = true;
  showChartFullModal = false;
  selectedTableRowId: string | null = null;

  activeSection: RehabSection = 'inpatient';
  statusMode: RehabStatusMode = 'none';
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

  statusViewModel: RehabStatusViewModel | null = null;
  statusChartOptions: Record<string, unknown> = { backgroundColor: 'transparent' };
  statusCompareChartOptions: Record<string, unknown> = { backgroundColor: 'transparent' };
  statusChartWidth = 280;
  statusChartHeight = 160;
  selectedStatusIndicatorId: string | null = null;
  activeStatusBlockCode: string | null = null;

  ngOnInit(): void {
    this.isDark = localStorage.getItem('rehabilitationDashboard.theme') === 'dark';
    this.recalcChartSize();
    this.refreshView();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  get metrics(): RehabMetricDefinition[] {
    return getMetricsForSection(this.activeSection);
  }

  get allDepartments(): string[] {
    if (this.activeSection === 'inpatient') {
      return getInpatientDepartmentsWithBeds(this.selectedYear);
    }
    return getDepartmentsForSection(this.activeSection);
  }

  get showStatusButtons(): boolean {
    return this.activeSection === 'inpatient';
  }

  get isStatusView(): boolean {
    return this.statusMode !== 'none';
  }

  get statusModeLabel(): string {
    return this.statusMode === 'daily' ? 'סטטוס יומי' : this.statusMode === 'weekly' ? 'סטטוס שבועי' : '';
  }

  get sectionTitle(): string {
    return this.activeSection === 'inpatient' ? '1. אשפוז בשיקום' : '2. שיקום יום';
  }

  get sectionSubtitle(): string {
    return this.activeSection === 'inpatient'
      ? 'חודשי / יומי · לפי מחלקות אשפוז שיקום'
      : 'חודשי / יומי · לפי מחלקות שיקום יום';
  }

  get activeMetricDef(): RehabMetricDefinition {
    return this.metrics.find((m) => m.key === this.activeMetric) || this.metrics[0];
  }

  get filterSummary(): string {
    const deptPart = this.selectedDepartments.length
      ? this.selectedDepartments.join(' · ')
      : (this.activeSection === 'inpatient' ? 'כל מחלקות אשפוז השיקום' : 'כל מחלקות שיקום היום');
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

  onSectionChange(section: RehabSection): void {
    if (this.activeSection === section) return;
    this.activeSection = section;
    this.activeMetric = getDefaultMetricForSection(section);
    this.selectedDepartments = [];
    this.selectedTableRowId = null;
    this.statusMode = 'none';
    this.statusViewModel = null;
    this.refreshView();
  }

  openDailyStatus(): void {
    this.statusMode = 'daily';
    this.refreshStatusView();
  }

  openWeeklyStatus(): void {
    this.statusMode = 'weekly';
    this.refreshStatusView();
  }

  onStatusModeChange(mode: RehabStatusMode): void {
    if (mode === 'daily') {
      this.openDailyStatus();
    } else if (mode === 'weekly') {
      this.openWeeklyStatus();
    } else {
      this.closeStatusView();
    }
  }

  closeStatusView(): void {
    this.statusMode = 'none';
    this.statusViewModel = null;
    this.selectedStatusIndicatorId = null;
    this.activeStatusBlockCode = null;
    this.recalcChartSize();
  }

  onStatusIndicatorSelect(block: RehabStatusBlock, indicatorId: string): void {
    this.activeStatusBlockCode = block.code;
    this.selectedStatusIndicatorId = indicatorId || null;
  }

  isStatusRowHighlighted(block: RehabStatusBlock, row: RehabTableRow): boolean {
    if (!this.selectedStatusIndicatorId || this.activeStatusBlockCode !== block.code) {
      return false;
    }
    return row.id === this.selectedStatusIndicatorId
      || row.id.indexOf(this.selectedStatusIndicatorId) === 0;
  }

  getStatusCompareChartOptions(): Record<string, unknown> {
    const base = {
      legend: { position: 'top', alignment: 'center' },
      chartArea: { left: 48, top: 36, right: 16, bottom: 40, width: '88%', height: '70%' },
      backgroundColor: 'transparent',
      colors: ['#0d9488', '#94a3b8'],
      animation: { startup: true, duration: 500 },
      bar: { groupWidth: '72%' },
    };
    return this.isDark ? applyDarkChartOptions(base) : base;
  }

  getStatusChartOptions(base: Record<string, unknown>): Record<string, unknown> {
    return this.isDark ? applyDarkChartOptions(base) : base;
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
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
    }
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
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
    }
  }

  clearDepartmentFilter(event?: Event): void {
    event?.stopPropagation();
    this.selectedDepartments = [];
    this.selectedTableRowId = null;
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
    }
  }

  resetFilters(): void {
    this.selectedDepartments = [];
    this.selectedMonth = null;
    this.selectedYear = 2026;
    this.periodMode = 'monthly';
    this.hospitalizationDaysMode = 'gross';
    this.selectedTableRowId = null;
    this.statusMode = 'none';
    this.statusViewModel = null;
    this.refreshView();
  }

  getDepartmentDisplay(): string {
    if (!this.selectedDepartments.length) return 'מחלקה: הכל';
    if (this.selectedDepartments.length === 1) return `מחלקה: ${this.selectedDepartments[0]}`;
    return `מחלקות: ${this.selectedDepartments.length} נבחרו`;
  }

  getBedsForDept(department: string): number {
    return getBedsForDepartment(this.selectedYear, department);
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
    this.refreshView();
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
    if (this.isStatusView) {
      this.refreshStatusView();
      return;
    }
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

  private refreshStatusView(): void {
    this.statusViewModel = buildRehabStatusViewModel(
      this.statusMode,
      this.selectedYear,
      this.selectedDepartments,
    );
    this.statusChartOptions = this.getStatusChartOptions({
      legend: { position: 'top', alignment: 'center' },
      chartArea: { left: 48, top: 36, right: 16, bottom: 40, width: '88%', height: '70%' },
      backgroundColor: 'transparent',
      animation: { startup: true, duration: 500 },
      curveType: 'function',
      pointSize: 5,
      colors: ['#6366f1', '#0d9488', '#f59e0b', '#ec4899'],
    });
    this.selectedStatusIndicatorId = null;
    this.activeStatusBlockCode = null;
    this.recalcChartSize();
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

    if (this.isStatusView) {
      const chartColWidth = window.innerWidth > 1200 ? 0.42 : 0.88;
      const availableBlock = (window.innerWidth - (this.showFilterSidebar ? 288 : 0) - 64);
      this.statusChartWidth = Math.max(240, Math.floor(availableBlock * chartColWidth));
      this.statusChartHeight = Math.max(160, Math.min(220, Math.floor(window.innerHeight * 0.24)));
    }
  }
}
