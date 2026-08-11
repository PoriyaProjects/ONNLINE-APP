import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { RehabilitationOccupancyApiService } from './rehabilitation-occupancy-api.service';
import {
  getDashboardOccupancyDateRange,
  getStatusOccupancyDateRange,
  mapOccupancyRowsToDashboardViewModel,
  mapOccupancyRowsToStatusBlock,
} from './rehabilitation-occupancy.mapper';
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
export class RehabilitationDashboardComponent implements OnInit, OnDestroy {
  readonly dashboardTitle = 'דשבורד שיקום';
  /** Gray chart placeholders for mock metrics; live charts when occupancy API is connected. */
  readonly chartsPreviewMode = true;

  shouldUseChartPlaceholder(blockCode?: string): boolean {
    if (!this.chartsPreviewMode) {
      return false;
    }
    if (!this.occupancyApiConnected || this.occupancyLoading) {
      return true;
    }
    if (this.isStatusView) {
      return blockCode !== '1.3';
    }
    return this.activeMetric !== 'occupancy';
  }
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
  selectedStatusBlockCode = '1.3';

  occupancyLoading = false;
  occupancyApiConnected = false;

  private occupancySubscription?: Subscription;
  private currentViewModel!: RehabMockViewModel;

  constructor(private occupancyApi: RehabilitationOccupancyApiService) {}

  ngOnInit(): void {
    this.isDark = localStorage.getItem('rehabilitationDashboard.theme') === 'dark';
    this.recalcChartSize();
    this.refreshView();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  ngOnDestroy(): void {
    this.occupancySubscription?.unsubscribe();
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
    return true;
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
      this.selectedStatusBlockCode = '1.3';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    } else {
      this.statusMode = 'none';
      this.statusViewModel = null;
      this.selectedStatusBlockCode = '2.1';
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
    this.selectedStatusBlockCode = this.getDefaultStatusBlockCode();
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
      this.selectedStatusBlockCode = '2.1';
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
    const inpatientLabels: Record<string, string> = {
      '1.3': 'תפוסה',
      '1.4': 'קבלות – קופות / צה״ל / אחר',
      '1.5': 'קבלות – פנים / חוץ',
      '1.6': 'יעדים מומלצים',
      '1.7': 'הכנסות נטו',
      '1.8': 'טיפולים מקצועיים',
    };
    const dayLabels: Record<string, string> = {
      '2.1': 'מטופלים – קופות',
      '2.2': 'מטופלים פנים/חוץ',
      '2.3': 'משחררים + המלצה',
      '2.4': 'טיפולים יומי/מצטבר',
      '2.5': 'טיפולים לפי סקטור',
      '2.6': 'טיפולים למשרה',
      '2.7': 'ממוצע למטופל',
      '2.8': 'פרטני / קבוצתי',
    };
    return inpatientLabels[block.code] || dayLabels[block.code] || block.title;
  }

  private getDefaultStatusBlockCode(): string {
    return this.activeSection === 'inpatient' ? '1.3' : '2.1';
  }

  refreshView(): void {
    if (this.isStatusView) {
      this.refreshStatusView();
      return;
    }
    if (this.shouldLoadOccupancyFromApi()) {
      this.loadDashboardOccupancyFromApi();
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
    const baseModel = buildRehabStatusViewModel(
      this.statusMode,
      this.selectedYear,
      this.selectedDepartments,
      this.activeSection,
    );
    this.statusViewModel = baseModel;
    const blockCodes = baseModel.blocks.map((b) => b.code);
    if (blockCodes.indexOf(this.selectedStatusBlockCode) < 0) {
      this.selectedStatusBlockCode = blockCodes[0] || this.getDefaultStatusBlockCode();
    }
    this.statusChartOptions = this.buildStatusChartOptions();
    this.recalcChartSize();
    this.loadStatusOccupancyFromApi(baseModel);
  }

  private shouldLoadOccupancyFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'occupancy';
  }

  private loadDashboardOccupancyFromApi(): void {
    const range = getDashboardOccupancyDateRange(this.selectedYear, this.selectedMonth, this.periodMode);
    const periodCaption = this.buildPeriodCaption();
    this.occupancyLoading = true;
    this.occupancySubscription?.unsubscribe();
    this.occupancySubscription = this.occupancyApi
      .getRehabilitationOccupancy(range.fromDate, range.toDate)
      .subscribe((rows) => {
        this.occupancyLoading = false;
        if (!rows.length) {
          this.occupancyApiConnected = false;
          this.applyViewModel(buildRehabMockViewModel(
            this.activeMetric,
            this.periodMode,
            this.hospitalizationDaysMode,
            this.selectedDepartments,
            this.selectedTableRowId,
            this.selectedYear,
            this.selectedMonth,
          ));
          return;
        }
        this.occupancyApiConnected = true;
        const vm = mapOccupancyRowsToDashboardViewModel(
          rows,
          this.selectedYear,
          this.selectedMonth,
          this.periodMode,
          this.selectedDepartments,
          this.selectedTableRowId,
          periodCaption,
        );
        this.applyViewModel(vm);
      });
  }

  private loadStatusOccupancyFromApi(baseModel: RehabStatusViewModel): void {
    if (this.statusMode === 'none') {
      return;
    }
    const isDaily = this.statusMode === 'daily';
    const range = getStatusOccupancyDateRange(isDaily ? 'daily' : 'weekly');
    this.occupancyLoading = true;
    this.occupancySubscription?.unsubscribe();
    const request$ = this.occupancyApi.getRehabilitationOccupancy(range.fromDate, range.toDate);

    this.occupancySubscription = request$.subscribe((rows) => {
      this.occupancyLoading = false;
      if (!rows.length || !this.statusViewModel) {
        this.occupancyApiConnected = false;
        return;
      }
      this.occupancyApiConnected = true;
      const occupancyBlock = mapOccupancyRowsToStatusBlock(
        rows,
        isDaily,
        this.selectedYear,
        this.selectedDepartments,
      );
      this.statusViewModel = {
        ...this.statusViewModel,
        blocks: this.statusViewModel.blocks.map((block) =>
          (block.code === '1.3' ? occupancyBlock : block)),
      };
      this.recalcChartSize();
    });
  }

  private buildPeriodCaption(): string {
    if (this.periodMode === 'monthly') {
      return this.selectedMonth
        ? `${MONTH_LABELS_HE[this.selectedMonth]} ${this.selectedYear}`
        : `שנת ${this.selectedYear} – לפי חודשים`;
    }
    return this.selectedMonth
      ? `${MONTH_LABELS_HE[this.selectedMonth]} ${this.selectedYear} – לפי ימים`
      : `שבוע אחרון – ${this.selectedYear}`;
  }

  private buildStatusChartOptions(): Record<string, unknown> {
    const base = {
      legend: { position: 'top', alignment: 'center' },
      chartArea: { left: 48, top: 36, right: 16, bottom: 40, width: '88%', height: '70%' },
      backgroundColor: 'transparent',
      animation: { startup: false, duration: 0 },
      curveType: 'function',
      pointSize: 5,
      colors: ['#0077B6', '#94A3B8'],
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 12, bold: true },
      },
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
    // Chart sizing handled by dynamicResize / chart-with-expand (surgeries dashboard pattern).
  }
}
