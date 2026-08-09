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
  readonly chartsPreviewMode = true;
  readonly chartPlaceholderBars = [42, 68, 55, 78, 61, 74, 48, 82, 58];
  readonly monthOptions = MONTH_LABELS_HE.map((label, index) => ({ value: index, label })).filter((m) => m.value > 0);
  readonly availableYears = [2024, 2025, 2026];

  isDark = false;
  showTopDepartmentsSidebar = false;
  showGuidePanel = false;
  showChartFullModal = false;
  selectedTableRowId: string | null = null;

  activeSection: RehabSection = 'inpatient';
  statusMode: RehabStatusMode = 'daily';
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
  kpis: RehabKpiCard[] = [];
  tableColumns: RehabTableColumn[] = [];
  tableRows: RehabTableRow[] = [];
  periodCaption = '';
  chartHeading = '';

  statusViewModel: RehabStatusViewModel | null = null;
  statusChartOptions: Record<string, unknown> = { backgroundColor: 'transparent' };
  statusChartHeight = 320;
  selectedStatusBlockCode = '1.3';

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

  get activeStatusBlock(): RehabStatusBlock | null {
    if (!this.statusViewModel) {
      return null;
    }
    return this.statusViewModel.blocks.find((b) => b.code === this.selectedStatusBlockCode)
      || this.statusViewModel.blocks[0]
      || null;
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
    if (section === 'inpatient') {
      this.statusMode = 'daily';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    } else {
      this.statusMode = 'none';
      this.statusViewModel = null;
      this.refreshView();
    }
  }

  openDailyStatus(): void {
    this.statusMode = 'daily';
    this.showTopDepartmentsSidebar = false;
    this.refreshStatusView();
  }

  openWeeklyStatus(): void {
    this.statusMode = 'weekly';
    this.showTopDepartmentsSidebar = true;
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
    this.selectedStatusBlockCode = '1.3';
    this.showTopDepartmentsSidebar = true;
    this.recalcChartSize();
    this.refreshView();
  }

  onStatusBlockChange(code: string): void {
    if (!code || this.selectedStatusBlockCode === code) {
      return;
    }
    this.selectedStatusBlockCode = code;
    this.recalcChartSize();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('rehabilitationDashboard.theme', this.isDark ? 'dark' : 'light');
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.applyViewModel(this.currentViewModel);
    }
  }

  toggleTopDepartmentsSidebar(): void {
    this.showTopDepartmentsSidebar = !this.showTopDepartmentsSidebar;
    setTimeout(() => this.recalcChartSize(), 320);
  }

  showTopbarFilterActive(): boolean {
    return this.showTopDepartmentsSidebar || this.activeFilterCount > 0;
  }

  getTopbarFilterIcon(): string {
    return this.showTopbarFilterActive() ? 'filter_alt' : 'tune';
  }

  getTopbarFilterTooltip(): string {
    return this.showTopDepartmentsSidebar
      ? 'סגור סינון מתקדם'
      : 'פתח סינון מתקדם';
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
    if (this.activeSection === 'inpatient') {
      this.statusMode = 'daily';
      this.selectedStatusBlockCode = '1.3';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    } else {
      this.statusMode = 'none';
      this.statusViewModel = null;
      this.refreshView();
    }
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
  }

  closeChartFullModal(): void {
    this.showChartFullModal = false;
  }

  getMetricHelp(): string {
    return this.activeMetricDef.help;
  }

  getStatusBlockToggleLabel(block: RehabStatusBlock): string {
    const labels: Record<string, string> = {
      '1.3': 'תפוסה',
      '1.4': 'קבלות',
      '1.5': 'פנים / חוץ',
      '1.6': 'יעדים',
      '1.7': 'הכנסות',
      '1.8': 'טיפולים',
    };
    return labels[block.code] || block.title;
  }

  getStatusBlockHeadline(block: RehabStatusBlock): string {
    return block.kpis[0]?.value || '—';
  }

  getStatusSummaryColumns(block: RehabStatusBlock): RehabTableColumn[] {
    const cols = block.tableColumns;
    if (cols.length <= 3) {
      return cols;
    }
    return [cols[0], cols[cols.length - 2], cols[cols.length - 1]];
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
    const blockCodes = this.statusViewModel.blocks.map((b) => b.code);
    if (blockCodes.indexOf(this.selectedStatusBlockCode) < 0) {
      this.selectedStatusBlockCode = blockCodes[0] || '1.3';
    }
    this.statusChartOptions = this.buildStatusChartOptions();
    this.recalcChartSize();
  }

  private buildStatusChartOptions(): Record<string, unknown> {
    const base = {
      legend: { position: 'none' },
      chartArea: { left: 40, top: 16, right: 12, bottom: 32, width: '90%', height: '82%' },
      backgroundColor: 'transparent',
      animation: { startup: false, duration: 0 },
      curveType: 'function',
      pointSize: 4,
      colors: ['#2563eb'],
    };
    return this.isDark ? applyDarkChartOptions(base) : base;
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

  private recalcChartSize(): void {
    if (!this.isStatusView) {
      return;
    }

    this.statusChartHeight = Math.max(300, Math.min(520, Math.floor(window.innerHeight - 200)));
  }
}
