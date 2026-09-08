import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { applyDarkChartOptions } from './utils/rehabilitation-chart.utils';
import {
  getBedsForDepartment,
  getInpatientDepartmentsWithBeds,
} from './constants/rehabilitation-bed-capacity.constants';
import { buildRehabStatusViewModel } from './utils/rehabilitation-status.builder';
import { RehabStatusBlock, RehabStatusMode, RehabStatusViewModel } from './models/rehabilitation-status.models';
import { RehabilitationAdmissionsPayerApiService } from './services/rehabilitation-admissions-payer-api.service';
import { mapAdmissionsPayerRowsToStatusBlock, mapAdmissionsPayerRowsToDashboardViewModel } from './mappers/rehabilitation-admissions-payer.mapper';
import { RehabilitationAdmissionsDirectionApiService } from './services/rehabilitation-admissions-direction-api.service';
import { mapAdmissionsDirectionRowsToStatusBlock } from './mappers/rehabilitation-admissions-direction.mapper';
import { RehabilitationRecommendedTargetsApiService } from './services/rehabilitation-recommended-targets-api.service';
import { mapRecommendedTargetsRowsToStatusBlock } from './mappers/rehabilitation-recommended-targets.mapper';
import { RehabilitationRevenueNetApiService } from './services/rehabilitation-revenue-net-api.service';
import { mapRevenueNetRowsToStatusBlock } from './mappers/rehabilitation-revenue-net.mapper';
import { RehabilitationTreatmentsApiService } from './services/rehabilitation-treatments-api.service';
import { mapTreatmentsRowsToStatusBlock } from './mappers/rehabilitation-treatments.mapper';
import { mapDayRehabRowsToStatusBlock } from './mappers/rehabilitation-day-rehab.mapper';
import {
  getDayRehabBlockCodeForMetric,
  REHAB_DAY_API_BLOCK_CODES,
  RehabDayApiBlockCode,
} from './models/rehabilitation-day-rehab.models';
import { RehabilitationDayRehabApiService } from './services/rehabilitation-day-rehab-api.service';
import { RehabilitationOccupancyApiService } from './services/rehabilitation-occupancy-api.service';
import { RehabilitationOccupancyDto } from './models/rehabilitation-occupancy.models';
import { RehabilitationHospitalizationDaysApiService } from './services/rehabilitation-hospitalization-days-api.service';
import { RehabilitationAvgLosApiService } from './services/rehabilitation-avg-los-api.service';
import {
  getDashboardOccupancyDateRange,
  formatStatusDateHe,
  getRehabWorkWeekStrip,
  getStatusDailyQueryDate,
  RehabWorkWeekDay,
  getStatusOccupancyDateRange,
  formatRevenueNetMonthLabel,
  getRevenueNetDateRange,
  mapOccupancyRowsToDashboardViewModel,
  mapOccupancyRowsToStatusBlock,
} from './mappers/rehabilitation-occupancy.mapper';
import { mapHospitalizationDaysRowsToDashboardViewModel } from './mappers/rehabilitation-hospitalization-days.mapper';
import { mapAvgLosRowsToDashboardViewModel } from './mappers/rehabilitation-avg-los.mapper';
import {
  isRehabApiLoading,
  isRehabApiSuccess,
  RehabApiLoadState,
} from './state/rehabilitation-api-load.state';
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
  RehabDashboardViewModel,
  RehabTableColumn,
  RehabTableRow,
  REHAB_API_DASHBOARD_METRICS,
  REHAB_API_STATUS_BLOCK_CODES,
  isMonthlyOnlyStatusBlock,
} from './models/rehabilitation-dashboard.models';

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
    if (this.isStatusView) {
      if (blockCode && this.isStatusBlockApiBacked(blockCode)) {
        return !isRehabApiSuccess(this.getStatusBlockApiState(blockCode));
      }
      return true;
    }
    if (!REHAB_API_DASHBOARD_METRICS.includes(this.activeMetric)) {
      return true;
    }
    return !isRehabApiSuccess(this.getDashboardApiState());
  }

  get isAnyApiLoading(): boolean {
    if (!this.isStatusView) {
      if (this.isDashboardApiMetric()) {
        return isRehabApiLoading(this.getDashboardApiState());
      }
      return false;
    }
    const code = this.selectedStatusBlockCode;
    return this.isStatusBlockApiBacked(code) && isRehabApiLoading(this.getStatusBlockApiState(code));
  }

  isDashboardApiMetric(): boolean {
    return !this.isStatusView && REHAB_API_DASHBOARD_METRICS.includes(this.activeMetric);
  }

  getDashboardApiState(): RehabApiLoadState {
    switch (this.activeMetric) {
      case 'hospitalization-days':
        return this.hospitalizationDaysApiState;
      case 'avg-los':
        return this.avgLosApiState;
      case 'occupancy':
        return this.occupancyApiState;
      case 'admissions-payer':
        return this.admissionsPayerApiState;
      case 'admissions-internal-external':
        return this.admissionsDirectionApiState;
      case 'recommended-targets':
        return this.recommendedTargetsApiState;
      case 'revenue-net':
        return this.revenueNetApiState;
      case 'treatments':
        return this.treatmentsApiState;
      default: {
        const dayBlock = getDayRehabBlockCodeForMetric(this.activeMetric);
        if (dayBlock) {
          return this.getDayRehabApiState(dayBlock);
        }
        return 'idle';
      }
    }
  }

  getDashboardApiLabel(): string {
    const labels: Record<string, string> = {
      'hospitalization-days': 'ימי אשפוז',
      'avg-los': 'ממוצע אשפוז',
      occupancy: 'נתוני תפוסה',
      'admissions-payer': 'נתוני קבלות',
      'admissions-internal-external': 'קבלות פנים/חוץ',
      'recommended-targets': 'יעדים מומלצים',
      'revenue-net': 'הכנסות נטו',
      treatments: 'טיפולים מקצועיים',
      'day-patients-payer': 'מטופלים – קופות',
      'day-patients-internal-external': 'מטופלים פנים/חוץ',
      'day-discharges-recommendation': 'משחררים + המלצה',
      'day-treatments-daily-cumulative': 'טיפולים יומי/מצטבר',
      'day-treatments-sectors': 'טיפולים לפי סקטור',
      'day-treatments-per-position': 'טיפולים למשרה',
      'day-avg-treatments-per-patient': 'ממוצע טיפולים למטופל',
      'day-treatments-individual-group': 'טיפולים פרטני/קבוצתי',
    };
    return labels[this.activeMetric] || 'נתונים';
  }

  isDashboardOccupancyApiBlock(): boolean {
    return !this.isStatusView && this.activeSection === 'inpatient' && this.activeMetric === 'occupancy';
  }

  isDashboardAdmissionsApiBlock(): boolean {
    return !this.isStatusView && this.activeSection === 'inpatient' && this.activeMetric === 'admissions-payer';
  }

  isStatusBlockApiBacked(blockCode: string): boolean {
    return (REHAB_API_STATUS_BLOCK_CODES as readonly string[]).includes(blockCode);
  }

  getStatusBlockApiState(blockCode: string): RehabApiLoadState {
    if (blockCode === '1.3') {
      return this.occupancyApiState;
    }
    if (blockCode === '1.4') {
      return this.admissionsPayerApiState;
    }
    if (blockCode === '1.5') {
      return this.admissionsDirectionApiState;
    }
    if (blockCode === '1.6') {
      return this.recommendedTargetsApiState;
    }
    if (blockCode === '1.7') {
      return this.revenueNetApiState;
    }
    if (blockCode === '1.8') {
      return this.treatmentsApiState;
    }
    if ((REHAB_DAY_API_BLOCK_CODES as readonly string[]).includes(blockCode)) {
      return this.getDayRehabApiState(blockCode as RehabDayApiBlockCode);
    }
    return 'idle';
  }

  isStatusBlockApiLoading(blockCode: string): boolean {
    return isRehabApiLoading(this.getStatusBlockApiState(blockCode));
  }

  isStatusBlockApiError(blockCode: string): boolean {
    return this.getStatusBlockApiState(blockCode) === 'error';
  }

  isStatusBlockApiEmpty(blockCode: string): boolean {
    return this.getStatusBlockApiState(blockCode) === 'empty';
  }

  isStatusBlockApiSuccess(blockCode: string): boolean {
    return isRehabApiSuccess(this.getStatusBlockApiState(blockCode));
  }

  getStatusBlockApiLabel(blockCode: string): string {
    const labels: Record<string, string> = {
      '1.3': 'נתוני תפוסה',
      '1.4': 'נתוני קבלות',
      '1.5': 'קבלות פנים/חוץ',
      '1.6': 'יעדים מומלצים',
      '1.7': 'הכנסות נטו',
      '1.8': 'טיפולים מקצועיים',
      '2.1': 'מטופלים – קופות',
      '2.2': 'מטופלים פנים/חוץ',
      '2.3': 'משחררים + המלצה',
      '2.4': 'טיפולים יומי/מצטבר',
      '2.5': 'טיפולים לפי סקטור',
      '2.6': 'טיפולים למשרה',
      '2.7': 'ממוצע טיפולים למטופל',
      '2.8': 'טיפולים פרטני/קבוצתי',
    };
    return labels[blockCode] || 'נתונים';
  }

  getStatusBlockApiSourceName(blockCode: string | null | undefined): string {
    return blockCode === '1.7' ? 'דו"ח הכנסות' : 'Chameleon';
  }

  retryStatusBlockApi(blockCode: string): void {
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    if (blockCode === '1.3') {
      this.occupancyApi.invalidateCache(range.fromDate, range.toDate);
      this.loadStatusOccupancyFromApi();
      return;
    }
    if (blockCode === '1.4') {
      this.admissionsPayerApi.invalidateCache(range.fromDate, range.toDate);
      this.loadStatusAdmissionsPayerFromApi();
      return;
    }
    if (blockCode === '1.5') {
      this.admissionsDirectionApi.invalidateCache(range.fromDate, range.toDate);
      this.loadStatusAdmissionsDirectionFromApi();
      return;
    }
    if (blockCode === '1.6') {
      this.recommendedTargetsApi.invalidateCache(range.fromDate, range.toDate);
      this.loadStatusRecommendedTargetsFromApi();
      return;
    }
    if (blockCode === '1.7') {
      if (this.statusMode !== 'monthly') {
        return;
      }
      this.revenueNetApi.invalidateCache();
      this.loadStatusRevenueNetFromApi();
      return;
    }
    if (blockCode === '1.8') {
      const range = this.getActiveStatusDateRange();
      this.treatmentsApi.invalidateCache(range.fromDate, range.toDate);
      this.loadStatusTreatmentsFromApi();
      return;
    }
    if ((REHAB_DAY_API_BLOCK_CODES as readonly string[]).includes(blockCode)) {
      const range = this.getActiveStatusDateRange();
      this.dayRehabApi.invalidateCache(blockCode as RehabDayApiBlockCode, range.fromDate, range.toDate);
      this.loadStatusDayRehabFromApi(blockCode as RehabDayApiBlockCode);
    }
  }

  retryDashboardApi(): void {
    const dashboardRange = this.getActiveDashboardDateRange();
    switch (this.activeMetric) {
      case 'hospitalization-days':
        this.hospitalizationDaysApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardHospitalizationDaysFromApi();
        return;
      case 'avg-los':
        this.avgLosApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardAvgLosFromApi();
        return;
      case 'admissions-payer':
        this.admissionsPayerApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardAdmissionsPayerFromApi();
        return;
      case 'admissions-internal-external':
        this.admissionsDirectionApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardAdmissionsDirectionFromApi();
        return;
      case 'recommended-targets':
        this.recommendedTargetsApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardRecommendedTargetsFromApi();
        return;
      case 'revenue-net':
        this.revenueNetApi.invalidateCache();
        this.loadDashboardRevenueNetFromApi();
        return;
      case 'treatments':
        this.treatmentsApi.invalidateCache(dashboardRange.fromDate, dashboardRange.toDate);
        this.loadDashboardTreatmentsFromApi();
        return;
      default: {
        const dayBlock = getDayRehabBlockCodeForMetric(this.activeMetric);
        if (dayBlock) {
          this.dayRehabApi.invalidateCache(dayBlock, dashboardRange.fromDate, dashboardRange.toDate);
          this.loadDashboardDayRehabFromApi(dayBlock);
          return;
        }
        this.retryDashboardOccupancyApi();
      }
    }
  }

  retryDashboardOccupancyApi(): void {
    const range = this.getActiveDashboardDateRange();
    this.occupancyApi.invalidateCache(range.fromDate, range.toDate);
    this.loadDashboardOccupancyFromApi();
  }

  onApiRetry(blockCode?: string | null): void {
    if (blockCode) {
      this.retryStatusBlockApi(blockCode);
      return;
    }
    this.retryDashboardApi();
  }

  isTableDataFromApi(): boolean {
    if (this.isStatusView && this.activeStatusBlock) {
      return this.isStatusBlockApiSuccess(this.activeStatusBlock.code);
    }
    if (this.isDashboardApiMetric()) {
      return isRehabApiSuccess(this.getDashboardApiState());
    }
    return false;
  }
  readonly monthOptions = MONTH_LABELS_HE.map((label, index) => ({ value: index, label })).filter((m) => m.value > 0);
  readonly availableYears = [2024, 2025, 2026];

  isDark = false;
  showTopDepartmentsSidebar = true;
  showGuidePanel = false;
  showChartFullModal = false;
  selectedTableRowId: string | null = null;

  activeSection: RehabSection = 'inpatient';
  statusMode: RehabStatusMode = 'daily';
  periodMode: RehabPeriodMode = 'daily';
  hospitalizationDaysMode: RehabHospitalizationDaysMode = 'gross';
  activeMetric: RehabMetricKey = 'admissions-payer';
  selectedYear = 2026;
  selectedMonth: number | null = null;
  selectedMonthFrom: number | null = null;
  selectedMonthTo: number | null = null;

  selectedDepartments: string[] = [];
  isDeptFilterOpen = false;
  isMonthFilterOpen = false;
  isMonthRangeFilterOpen = false;

  chartType = 'ColumnChart';
  chartColumns: (string | Record<string, unknown>)[] = [];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartNote = '';
  kpis: RehabKpiCard[] = [];
  tableColumns: RehabTableColumn[] = [];
  tableRows: RehabTableRow[] = [];
  periodCaption = '';
  chartHeading = '';

  statusViewModel: RehabStatusViewModel | null = null;
  statusChartOptions: Record<string, unknown> = { backgroundColor: 'transparent' };
  selectedStatusBlockCode = '1.4';

  occupancyApiState: RehabApiLoadState = 'idle';
  hospitalizationDaysApiState: RehabApiLoadState = 'idle';
  avgLosApiState: RehabApiLoadState = 'idle';
  admissionsPayerApiState: RehabApiLoadState = 'idle';
  admissionsDirectionApiState: RehabApiLoadState = 'idle';
  recommendedTargetsApiState: RehabApiLoadState = 'idle';
  revenueNetApiState: RehabApiLoadState = 'idle';
  treatmentsApiState: RehabApiLoadState = 'idle';
  dayRehabApiStates: Partial<Record<RehabDayApiBlockCode, RehabApiLoadState>> = {};

  private occupancySubscription?: Subscription;
  private hospitalizationDaysSubscription?: Subscription;
  private avgLosSubscription?: Subscription;
  private admissionsPayerSubscription?: Subscription;
  private admissionsDirectionSubscription?: Subscription;
  private recommendedTargetsSubscription?: Subscription;
  private revenueNetSubscription?: Subscription;
  private treatmentsSubscription?: Subscription;
  private dayRehabSubscription?: Subscription;
  private preloadSubscription?: Subscription;
  private statusApiRangeKey = '';
  private currentViewModel!: RehabDashboardViewModel;

  constructor(
    private occupancyApi: RehabilitationOccupancyApiService,
    private hospitalizationDaysApi: RehabilitationHospitalizationDaysApiService,
    private avgLosApi: RehabilitationAvgLosApiService,
    private admissionsPayerApi: RehabilitationAdmissionsPayerApiService,
    private admissionsDirectionApi: RehabilitationAdmissionsDirectionApiService,
    private recommendedTargetsApi: RehabilitationRecommendedTargetsApiService,
    private revenueNetApi: RehabilitationRevenueNetApiService,
    private treatmentsApi: RehabilitationTreatmentsApiService,
    private dayRehabApi: RehabilitationDayRehabApiService,
  ) {}

  ngOnInit(): void {
    this.isDark = localStorage.getItem('rehabilitationDashboard.theme') === 'dark';
    this.activeMetric = 'admissions-payer';
    this.selectedStatusBlockCode = '1.4';
    this.statusMode = 'daily';
    this.periodMode = 'daily';
    localStorage.setItem('rehabilitationDashboard.activeMetric', 'admissions-payer');
    this.recalcChartSize();
    this.refreshView();
    this.preloadAllRehabApisInBackground();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  ngOnDestroy(): void {
    this.occupancySubscription?.unsubscribe();
    this.hospitalizationDaysSubscription?.unsubscribe();
    this.avgLosSubscription?.unsubscribe();
    this.admissionsPayerSubscription?.unsubscribe();
    this.admissionsDirectionSubscription?.unsubscribe();
    this.recommendedTargetsSubscription?.unsubscribe();
    this.revenueNetSubscription?.unsubscribe();
    this.treatmentsSubscription?.unsubscribe();
    this.dayRehabSubscription?.unsubscribe();
    this.preloadSubscription?.unsubscribe();
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
    return this.statusMode === 'daily' ? 'יומי' : this.statusMode === 'monthly' ? 'חודשי' : '';
  }

  get periodToggleValue(): 'daily' | 'monthly' {
    return this.statusMode === 'monthly' || this.statusMode === 'daily'
      ? this.statusMode
      : this.periodMode;
  }

  get monthButtonLabel(): string {
    if (!this.selectedMonth) {
      return 'חודש';
    }
    const found = this.monthOptions.find((m) => m.value === this.selectedMonth);
    return found ? found.label : 'חודש';
  }

  get monthRangeButtonLabel(): string {
    if (!this.selectedMonthFrom || !this.selectedMonthTo) {
      return 'טווח חודשים';
    }
    const from = this.monthOptions.find((m) => m.value === this.selectedMonthFrom);
    const to = this.monthOptions.find((m) => m.value === this.selectedMonthTo);
    if (!from || !to) {
      return 'טווח חודשים';
    }
    return from.value === to.value ? from.label : `${from.label}–${to.label}`;
  }

  get showStatusPreviousDayNotice(): boolean {
    return this.statusMode === 'daily';
  }

  get statusPreviousDayNotice(): string {
    return `נתונים מיום העבודה האחרון · ${this.statusApiQueryDateLabel}`;
  }

  get statusWorkWeekDays(): RehabWorkWeekDay[] {
    return getRehabWorkWeekStrip();
  }

  get statusApiQueryDateLabel(): string {
    if (this.statusMode !== 'daily') {
      return '';
    }
    return formatStatusDateHe(getStatusDailyQueryDate());
  }

  getStatusBlockApiEmptyMessage(blockCode: string): string {
    if (blockCode === '1.7') {
      return 'לא נמצאו נתונים בטווח שנבחר. הפקת חשבוניות שיקום מתבצעת בעיקר בסוף כל חודש.';
    }
    const label = this.getStatusBlockApiLabel(blockCode);
    if (this.statusMode === 'daily') {
      return `אין ${label} ל${this.statusApiQueryDateLabel}`;
    }
    return `אין ${label} לתקופה שנבחרה`;
  }

  get revenueNetQueryPeriodNotice(): string {
    return `טווח שאילתה: ${formatRevenueNetMonthLabel()}`;
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
    const monthPart = this.getMonthFilterLabel();
    const periodPart = this.periodToggleValue === 'monthly'
      ? (monthPart || 'תצוגה חודשית')
      : 'תצוגה יומית';
    return `${periodPart} ${this.selectedYear} · ${deptPart}`;
  }

  get activeFilterCount(): number {
    return this.selectedDepartments.length ? 1 : 0;
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
      this.periodMode = 'daily';
      this.selectedStatusBlockCode = '1.4';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    } else {
      this.statusMode = 'daily';
      this.periodMode = 'daily';
      this.selectedStatusBlockCode = '2.1';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    }
  }

  openDailyStatus(): void {
    this.statusMode = 'daily';
    this.periodMode = 'daily';
    if (isMonthlyOnlyStatusBlock(this.selectedStatusBlockCode)) {
      this.selectedStatusBlockCode = this.getDefaultStatusBlockCode();
    }
    this.showTopDepartmentsSidebar = false;
    this.refreshStatusView();
  }

  openMonthlyStatus(): void {
    this.statusMode = 'monthly';
    this.periodMode = 'monthly';
    this.showTopDepartmentsSidebar = true;
    this.refreshStatusView();
  }

  onStatusModeChange(mode: 'daily' | 'monthly'): void {
    if (mode === 'daily') {
      this.openDailyStatus();
    } else {
      this.openMonthlyStatus();
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
    if (isMonthlyOnlyStatusBlock(code) && this.statusMode !== 'monthly') {
      return;
    }
    this.selectedStatusBlockCode = code;
    this.statusChartOptions = this.buildStatusChartOptions(code);
    this.loadStatusBlockApi(code);
    this.recalcChartSize();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('rehabilitationDashboard.theme', this.isDark ? 'dark' : 'light');
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
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
    localStorage.setItem('rehabilitationDashboard.activeMetric', metric);
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
    this.selectedMonthFrom = null;
    this.selectedMonthTo = null;
    this.isMonthFilterOpen = false;
    if (month != null) {
      this.openMonthlyStatus();
      return;
    }
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
    }
  }

  onMonthRangeFromChange(month: number | null): void {
    this.selectedMonthFrom = month;
    this.applyMonthRange();
  }

  onMonthRangeToChange(month: number | null): void {
    this.selectedMonthTo = month;
    this.applyMonthRange();
  }

  clearMonthRange(event?: Event): void {
    event?.stopPropagation();
    this.selectedMonthFrom = null;
    this.selectedMonthTo = null;
    if (this.isStatusView) {
      this.refreshStatusView();
    } else {
      this.refreshView();
    }
  }

  private applyMonthRange(): void {
    if (!this.selectedMonthFrom || !this.selectedMonthTo) {
      return;
    }
    this.selectedMonth = null;
    this.openMonthlyStatus();
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
      this.reapplyStatusBlocksFromRaw();
    } else {
      this.refreshView();
    }
  }

  clearDepartmentFilter(event?: Event): void {
    event?.stopPropagation();
    this.selectedDepartments = [];
    this.selectedTableRowId = null;
    if (this.isStatusView) {
      this.reapplyStatusBlocksFromRaw();
    } else {
      this.refreshView();
    }
  }

  resetFilters(): void {
    this.selectedDepartments = [];
    this.selectedMonth = null;
    this.selectedMonthFrom = null;
    this.selectedMonthTo = null;
    this.selectedYear = 2026;
    this.hospitalizationDaysMode = 'gross';
    this.selectedTableRowId = null;
    if (this.activeSection === 'inpatient') {
      this.statusMode = 'daily';
      this.periodMode = 'daily';
      this.selectedStatusBlockCode = '1.4';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
    } else {
      this.statusMode = 'daily';
      this.periodMode = 'daily';
      this.statusViewModel = null;
      this.selectedStatusBlockCode = '2.1';
      this.showTopDepartmentsSidebar = false;
      this.refreshStatusView();
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
    this.isMonthFilterOpen = false;
    this.isMonthRangeFilterOpen = false;
    this.isDeptFilterOpen = !this.isDeptFilterOpen;
  }

  toggleMonthFilterDropdown(event: Event): void {
    event.stopPropagation();
    this.isDeptFilterOpen = false;
    this.isMonthRangeFilterOpen = false;
    this.isMonthFilterOpen = !this.isMonthFilterOpen;
  }

  toggleMonthRangeFilterDropdown(event: Event): void {
    event.stopPropagation();
    this.isDeptFilterOpen = false;
    this.isMonthFilterOpen = false;
    this.isMonthRangeFilterOpen = !this.isMonthRangeFilterOpen;
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.isDeptFilterOpen = false;
    this.isMonthFilterOpen = false;
    this.isMonthRangeFilterOpen = false;
  }

  onTableRowClick(row: RehabTableRow): void {
    this.selectedTableRowId = this.selectedTableRowId === row.id ? null : row.id;
    this.refreshView();
  }

  isRowSelected(row: RehabTableRow): boolean {
    return this.selectedTableRowId === row.id;
  }

  getTableCellTone(row: RehabTableRow, colKey: string): 'up' | 'down' | 'neutral' | null {
    if (!row.cellTones) {
      return null;
    }
    return row.cellTones[colKey] || null;
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

  private getActiveStatusDateRange(mode: 'daily' | 'monthly' = this.getStatusRangeMode()) {
    return getStatusOccupancyDateRange(
      mode,
      this.selectedYear,
      this.selectedMonth,
      this.selectedMonthFrom,
      this.selectedMonthTo,
    );
  }

  private getActiveDashboardDateRange() {
    return getDashboardOccupancyDateRange(
      this.selectedYear,
      this.selectedMonth,
      this.periodMode,
      this.selectedMonthFrom,
      this.selectedMonthTo,
    );
  }

  private getMonthFilterLabel(): string {
    if (this.selectedMonthFrom && this.selectedMonthTo) {
      const from = this.monthOptions.find((m) => m.value === this.selectedMonthFrom);
      const to = this.monthOptions.find((m) => m.value === this.selectedMonthTo);
      if (!from || !to) {
        return '';
      }
      return from.value === to.value
        ? from.label
        : `${from.label}–${to.label}`;
    }
    if (this.selectedMonth) {
      return this.monthOptions.find((m) => m.value === this.selectedMonth)?.label || '';
    }
    return '';
  }

  private getDefaultStatusBlockCode(): string {
    return this.activeSection === 'inpatient' ? '1.4' : '2.1';
  }

  private getStatusRangeMode(): 'daily' | 'monthly' {
    return this.statusMode === 'daily' ? 'daily' : 'monthly';
  }

  private isStatusDailyPeriod(): boolean {
    return this.statusMode === 'daily';
  }

  refreshView(): void {
    if (this.isStatusView) {
      this.refreshStatusView();
      return;
    }
    if (this.shouldLoadHospitalizationDaysFromApi()) {
      this.loadDashboardHospitalizationDaysFromApi();
      return;
    }
    if (this.shouldLoadAvgLosFromApi()) {
      this.loadDashboardAvgLosFromApi();
      return;
    }
    if (this.shouldLoadAdmissionsPayerFromApi()) {
      this.loadDashboardAdmissionsPayerFromApi();
      return;
    }
    if (this.shouldLoadOccupancyFromApi()) {
      this.loadDashboardOccupancyFromApi();
      return;
    }
    if (this.shouldLoadAdmissionsDirectionFromApi()) {
      this.loadDashboardAdmissionsDirectionFromApi();
      return;
    }
    if (this.shouldLoadRecommendedTargetsFromApi()) {
      this.loadDashboardRecommendedTargetsFromApi();
      return;
    }
    if (this.shouldLoadRevenueNetFromApi()) {
      this.loadDashboardRevenueNetFromApi();
      return;
    }
    if (this.shouldLoadTreatmentsFromApi()) {
      this.loadDashboardTreatmentsFromApi();
      return;
    }
    if (this.shouldLoadDayRehabFromApi()) {
      const blockCode = getDayRehabBlockCodeForMetric(this.activeMetric);
      if (blockCode) {
        this.loadDashboardDayRehabFromApi(blockCode);
      }
      return;
    }
    this.applyInDevelopmentDashboardView();
  }

  private applyInDevelopmentDashboardView(): void {
    const metric = this.activeMetricDef;
    this.chartHeading = metric.label;
    this.periodCaption = this.buildPeriodCaption();
    this.chartType = 'ColumnChart';
    this.chartColumns = [];
    this.chartRows = [];
    this.kpis = [];
    this.tableColumns = [];
    this.tableRows = [];
    this.chartNote = '';
    this.chartOptions = this.isDark ? applyDarkChartOptions({ backgroundColor: 'transparent' }) : { backgroundColor: 'transparent' };
    this.recalcChartSize();
  }

  private isStatusBlockVisibleInCurrentMode(blockCode: string): boolean {
    return !isMonthlyOnlyStatusBlock(blockCode) || this.statusMode === 'monthly';
  }

  private refreshStatusView(): void {
    const baseModel = buildRehabStatusViewModel(
      this.statusMode,
      this.selectedYear,
      this.selectedDepartments,
      this.activeSection,
    );
    const strippedBlocks = baseModel.blocks.filter(
      (block) => this.isStatusBlockVisibleInCurrentMode(block.code),
    );
    this.statusViewModel = this.withStatusQueryPeriodLabel({ ...baseModel, blocks: strippedBlocks });
    const blockCodes = strippedBlocks.map((b) => b.code);
    if (blockCodes.indexOf(this.selectedStatusBlockCode) < 0) {
      this.selectedStatusBlockCode = blockCodes[0] || this.getDefaultStatusBlockCode();
    }
    this.statusChartOptions = this.buildStatusChartOptions();
    this.recalcChartSize();

    const rangeKey = this.getStatusApiRangeKey();
    if (rangeKey !== this.statusApiRangeKey) {
      this.statusApiRangeKey = rangeKey;
      this.resetStatusApiStates();
    }
    this.loadStatusBlockApi(this.selectedStatusBlockCode);
  }

  private getStatusApiRangeKey(): string {
    if (this.statusMode === 'none') {
      return '';
    }
    if (this.selectedStatusBlockCode === '1.7') {
      return 'revenue:rolling-12m';
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    return `${this.statusMode}:${range.fromDate}:${range.toDate}`;
  }

  private resetStatusApiStates(): void {
    this.occupancyApiState = 'idle';
    this.admissionsPayerApiState = 'idle';
    this.admissionsDirectionApiState = 'idle';
    this.recommendedTargetsApiState = 'idle';
    this.revenueNetApiState = 'idle';
    this.treatmentsApiState = 'idle';
    REHAB_DAY_API_BLOCK_CODES.forEach((code) => {
      this.dayRehabApiStates[code] = 'idle';
    });
  }

  private loadStatusBlockApi(blockCode: string): void {
    if (!this.isStatusBlockApiBacked(blockCode)) {
      return;
    }
    switch (blockCode) {
      case '1.3':
        this.loadStatusOccupancyFromApi();
        break;
      case '1.4':
        this.loadStatusAdmissionsPayerFromApi();
        break;
      case '1.5':
        this.loadStatusAdmissionsDirectionFromApi();
        break;
      case '1.6':
        this.loadStatusRecommendedTargetsFromApi();
        break;
      case '1.7':
        this.loadStatusRevenueNetFromApi();
        break;
      case '1.8':
        this.loadStatusTreatmentsFromApi();
        break;
      default:
        if ((REHAB_DAY_API_BLOCK_CODES as readonly string[]).includes(blockCode)) {
          this.loadStatusDayRehabFromApi(blockCode as RehabDayApiBlockCode);
        }
        break;
    }
  }

  private reapplyStatusBlocksFromRaw(): void {
    if (!this.statusViewModel) {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    let blocks = this.statusViewModel.blocks;
    if (isRehabApiSuccess(this.occupancyApiState)) {
      const cached = this.getStatusOccupancyRowsFromCache();
      if (cached?.length) {
        const block = mapOccupancyRowsToStatusBlock(
          cached,
          isDaily,
          this.selectedYear,
          this.selectedDepartments,
          this.getStatusOccupancyAverageRowsFromCache() ?? [],
        );
        blocks = blocks.map((b) => (b.code === '1.3' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.admissionsPayerApiState)) {
      const cached = this.getStatusPayerRowsFromCache();
      if (cached?.length) {
        const block = mapAdmissionsPayerRowsToStatusBlock(cached, isDaily, this.selectedDepartments);
        blocks = blocks.map((b) => (b.code === '1.4' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.admissionsDirectionApiState)) {
      const cached = this.getStatusDirectionRowsFromCache();
      if (cached?.length) {
        const block = mapAdmissionsDirectionRowsToStatusBlock(cached, isDaily, this.selectedDepartments);
        blocks = blocks.map((b) => (b.code === '1.5' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.recommendedTargetsApiState)) {
      const cached = this.getStatusTargetsRowsFromCache();
      if (cached?.length) {
        const range = this.getActiveStatusDateRange();
        const block = mapRecommendedTargetsRowsToStatusBlock(
          cached,
          isDaily,
          this.selectedYear,
          this.selectedDepartments,
          range,
        );
        blocks = blocks.map((b) => (b.code === '1.6' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.revenueNetApiState) && this.statusMode === 'monthly') {
      const cached = this.revenueNetApi.peekCache();
      if (cached?.length) {
        const block = mapRevenueNetRowsToStatusBlock(cached, this.selectedDepartments);
        blocks = blocks.map((b) => (b.code === '1.7' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.treatmentsApiState)) {
      const cached = this.getStatusTreatmentsRowsFromCache();
      if (cached?.length) {
        const block = mapTreatmentsRowsToStatusBlock(cached, isDaily, this.selectedDepartments);
        blocks = blocks.map((b) => (b.code === '1.8' ? block : b));
      }
    }
    REHAB_DAY_API_BLOCK_CODES.forEach((blockCode) => {
      if (!isRehabApiSuccess(this.getDayRehabApiState(blockCode))) {
        return;
      }
      const cached = this.getStatusDayRehabRowsFromCache(blockCode);
      if (cached?.length) {
        const block = mapDayRehabRowsToStatusBlock(blockCode, cached, isDaily, this.selectedDepartments);
        blocks = blocks.map((b) => (b.code === blockCode ? block : b));
      }
    });
    this.statusViewModel = { ...this.statusViewModel, blocks };
    this.recalcChartSize();
  }

  private getStatusOccupancyRowsFromCache() {
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    return this.occupancyApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusOccupancyAverageRowsFromCache() {
    if (this.isStatusDailyPeriod()) {
      return null;
    }
    const range = getRevenueNetDateRange();
    return this.occupancyApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusPayerRowsFromCache() {
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    return this.admissionsPayerApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusDirectionRowsFromCache() {
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    return this.admissionsDirectionApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusTargetsRowsFromCache() {
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    return this.recommendedTargetsApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusTreatmentsRowsFromCache() {
    const range = this.getActiveStatusDateRange();
    return this.treatmentsApi.peekCache(range.fromDate, range.toDate);
  }

  private getStatusDayRehabRowsFromCache(blockCode: RehabDayApiBlockCode) {
    const range = this.getActiveStatusDateRange();
    return this.dayRehabApi.peekCache(blockCode, range.fromDate, range.toDate);
  }

  private getDayRehabApiState(blockCode: RehabDayApiBlockCode): RehabApiLoadState {
    return this.dayRehabApiStates[blockCode] || 'idle';
  }

  private setDayRehabApiState(blockCode: RehabDayApiBlockCode, state: RehabApiLoadState): void {
    this.dayRehabApiStates[blockCode] = state;
  }

  private shouldLoadHospitalizationDaysFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'hospitalization-days';
  }

  private shouldLoadAvgLosFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'avg-los';
  }

  private shouldLoadAdmissionsPayerFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'admissions-payer';
  }

  private shouldLoadOccupancyFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'occupancy';
  }

  private shouldLoadAdmissionsDirectionFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'admissions-internal-external';
  }

  private shouldLoadRecommendedTargetsFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'recommended-targets';
  }

  private shouldLoadRevenueNetFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'revenue-net';
  }

  private shouldLoadTreatmentsFromApi(): boolean {
    return this.activeSection === 'inpatient' && this.activeMetric === 'treatments';
  }

  private shouldLoadDayRehabFromApi(): boolean {
    return this.activeSection === 'day-rehab' && !!getDayRehabBlockCodeForMetric(this.activeMetric);
  }

  /** Warm all live rehab API caches on entry so charts are ready when the user opens them. */
  private preloadAllRehabApisInBackground(): void {
    if (this.activeSection !== 'inpatient') {
      return;
    }

    const dailyRange = this.getActiveStatusDateRange('daily');
    const monthlyRange = this.getActiveStatusDateRange('monthly');
    const dashboardRange = this.getActiveDashboardDateRange();
    const safe = <T>(obs: Observable<T>, fallback: T) =>
      obs.pipe(catchError(() => of(fallback)));

    const tasks = [
      safe(this.hospitalizationDaysApi.getRehabilitationHospitalizationDays(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.avgLosApi.getRehabilitationAvgLengthOfStay(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.occupancyApi.getRehabilitationOccupancy(dailyRange.fromDate, dailyRange.toDate), []),
      safe(this.occupancyApi.getRehabilitationOccupancy(monthlyRange.fromDate, monthlyRange.toDate), []),
      safe(this.occupancyApi.getRehabilitationOccupancy(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.occupancyApi.getRehabilitationOccupancy(
        getRevenueNetDateRange().fromDate,
        getRevenueNetDateRange().toDate,
      ), []),
      safe(this.admissionsPayerApi.getRehabilitationAdmissionsByPayer(dailyRange.fromDate, dailyRange.toDate), []),
      safe(this.admissionsPayerApi.getRehabilitationAdmissionsByPayer(monthlyRange.fromDate, monthlyRange.toDate), []),
      safe(this.admissionsPayerApi.getRehabilitationAdmissionsByPayer(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.admissionsDirectionApi.getRehabilitationAdmissionsByDirection(dailyRange.fromDate, dailyRange.toDate), []),
      safe(this.admissionsDirectionApi.getRehabilitationAdmissionsByDirection(monthlyRange.fromDate, monthlyRange.toDate), []),
      safe(this.admissionsDirectionApi.getRehabilitationAdmissionsByDirection(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.recommendedTargetsApi.getRehabilitationRecommendedTargets(dailyRange.fromDate, dailyRange.toDate), []),
      safe(this.recommendedTargetsApi.getRehabilitationRecommendedTargets(monthlyRange.fromDate, monthlyRange.toDate), []),
      safe(this.recommendedTargetsApi.getRehabilitationRecommendedTargets(dashboardRange.fromDate, dashboardRange.toDate), []),
      safe(this.revenueNetApi.getRehabilitationRevenueNet(), []),
      safe(this.treatmentsApi.getRehabilitationTreatments(dailyRange.fromDate, dailyRange.toDate), []),
      safe(this.treatmentsApi.getRehabilitationTreatments(monthlyRange.fromDate, monthlyRange.toDate), []),
      safe(this.treatmentsApi.getRehabilitationTreatments(dashboardRange.fromDate, dashboardRange.toDate), []),
      ...[].concat(...REHAB_DAY_API_BLOCK_CODES.map((blockCode) => ([
        safe(this.dayRehabApi.getRows(blockCode, dailyRange.fromDate, dailyRange.toDate), []),
        safe(this.dayRehabApi.getRows(blockCode, monthlyRange.fromDate, monthlyRange.toDate), []),
        safe(this.dayRehabApi.getRows(blockCode, dashboardRange.fromDate, dashboardRange.toDate), []),
      ]))),
    ];

    this.preloadSubscription?.unsubscribe();
    this.preloadSubscription = forkJoin(tasks).subscribe(() => {
      this.applyPreloadedApiDataToView();
    });
  }

  private applyPreloadedApiDataToView(): void {
    if (this.isStatusView) {
      this.syncStatusApiStatesFromCache();
      this.reapplyStatusBlocksFromRaw();
      const selectedState = this.getStatusBlockApiState(this.selectedStatusBlockCode);
      if (selectedState === 'idle' || selectedState === 'loading') {
        this.loadStatusBlockApi(this.selectedStatusBlockCode);
      }
      return;
    }

    if (this.shouldLoadHospitalizationDaysFromApi() && !isRehabApiSuccess(this.hospitalizationDaysApiState)) {
      this.loadDashboardHospitalizationDaysFromApi();
      return;
    }

    if (this.shouldLoadAvgLosFromApi() && !isRehabApiSuccess(this.avgLosApiState)) {
      this.loadDashboardAvgLosFromApi();
      return;
    }

    if (this.shouldLoadAdmissionsPayerFromApi() && !isRehabApiSuccess(this.admissionsPayerApiState)) {
      this.loadDashboardAdmissionsPayerFromApi();
      return;
    }

    if (this.shouldLoadOccupancyFromApi() && !isRehabApiSuccess(this.occupancyApiState)) {
      this.loadDashboardOccupancyFromApi();
      return;
    }

    if (this.shouldLoadAdmissionsDirectionFromApi() && !isRehabApiSuccess(this.admissionsDirectionApiState)) {
      this.loadDashboardAdmissionsDirectionFromApi();
      return;
    }

    if (this.shouldLoadRecommendedTargetsFromApi() && !isRehabApiSuccess(this.recommendedTargetsApiState)) {
      this.loadDashboardRecommendedTargetsFromApi();
      return;
    }

    if (this.shouldLoadRevenueNetFromApi() && !isRehabApiSuccess(this.revenueNetApiState)) {
      this.loadDashboardRevenueNetFromApi();
      return;
    }

    if (this.shouldLoadTreatmentsFromApi() && !isRehabApiSuccess(this.treatmentsApiState)) {
      this.loadDashboardTreatmentsFromApi();
      return;
    }

    if (this.shouldLoadDayRehabFromApi()) {
      const blockCode = getDayRehabBlockCodeForMetric(this.activeMetric);
      if (blockCode && !isRehabApiSuccess(this.getDayRehabApiState(blockCode))) {
        this.loadDashboardDayRehabFromApi(blockCode);
      }
    }
  }

  private syncStatusApiStatesFromCache(): void {
    if (this.statusMode === 'none') {
      return;
    }
    const range = this.getActiveStatusDateRange();
    this.occupancyApiState = this.resolveStateFromCache(
      this.occupancyApi.peekCache(range.fromDate, range.toDate),
      this.occupancyApiState,
    );
    this.admissionsPayerApiState = this.resolveStateFromCache(
      this.admissionsPayerApi.peekCache(range.fromDate, range.toDate),
      this.admissionsPayerApiState,
    );
    this.admissionsDirectionApiState = this.resolveStateFromCache(
      this.admissionsDirectionApi.peekCache(range.fromDate, range.toDate),
      this.admissionsDirectionApiState,
    );
    this.recommendedTargetsApiState = this.resolveStateFromCache(
      this.recommendedTargetsApi.peekCache(range.fromDate, range.toDate),
      this.recommendedTargetsApiState,
    );
    if (this.statusMode === 'monthly') {
      this.revenueNetApiState = this.resolveStateFromCache(
        this.revenueNetApi.peekCache(),
        this.revenueNetApiState,
      );
    }
    this.treatmentsApiState = this.resolveStateFromCache(
      this.treatmentsApi.peekCache(range.fromDate, range.toDate),
      this.treatmentsApiState,
    );
    REHAB_DAY_API_BLOCK_CODES.forEach((blockCode) => {
      this.dayRehabApiStates[blockCode] = this.resolveStateFromCache(
        this.dayRehabApi.peekCache(blockCode, range.fromDate, range.toDate),
        this.getDayRehabApiState(blockCode),
      );
    });
  }

  private resolveStateFromCache(
    cached: unknown[] | null,
    current: RehabApiLoadState,
  ): RehabApiLoadState {
    if (cached == null || current === 'error') {
      return current;
    }
    return cached.length ? 'success' : 'empty';
  }

  private loadDashboardHospitalizationDaysFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const periodCaption = this.buildPeriodCaption();
    const cached = this.hospitalizationDaysApi.peekCache(range.fromDate, range.toDate);
    this.hospitalizationDaysApiState = this.resolveInitialApiState(cached);
    this.hospitalizationDaysSubscription?.unsubscribe();
    this.hospitalizationDaysSubscription = this.hospitalizationDaysApi
      .getRehabilitationHospitalizationDays(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.hospitalizationDaysApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.hospitalizationDaysApiState = 'success';
          const vm = mapHospitalizationDaysRowsToDashboardViewModel(
            rows,
            this.selectedYear,
            null,
            this.periodMode,
            this.selectedDepartments,
            this.selectedTableRowId,
            periodCaption,
            this.hospitalizationDaysMode,
          );
          this.applyViewModel(vm);
        },
        error: () => {
          this.hospitalizationDaysApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardAvgLosFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const periodCaption = this.buildPeriodCaption();
    const cached = this.avgLosApi.peekCache(range.fromDate, range.toDate);
    this.avgLosApiState = this.resolveInitialApiState(cached);
    this.avgLosSubscription?.unsubscribe();
    this.avgLosSubscription = this.avgLosApi
      .getRehabilitationAvgLengthOfStay(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.avgLosApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.avgLosApiState = 'success';
          const vm = mapAvgLosRowsToDashboardViewModel(
            rows,
            this.selectedYear,
            null,
            this.periodMode,
            this.selectedDepartments,
            this.selectedTableRowId,
            periodCaption,
          );
          this.applyViewModel(vm);
        },
        error: () => {
          this.avgLosApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardAdmissionsPayerFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const periodCaption = this.buildPeriodCaption();
    const cached = this.admissionsPayerApi.peekCache(range.fromDate, range.toDate);
    this.admissionsPayerApiState = this.resolveInitialApiState(cached);
    this.admissionsPayerSubscription?.unsubscribe();
    this.admissionsPayerSubscription = this.admissionsPayerApi
      .getRehabilitationAdmissionsByPayer(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.admissionsPayerApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.admissionsPayerApiState = 'success';
          const vm = mapAdmissionsPayerRowsToDashboardViewModel(
            rows,
            this.selectedYear,
            this.periodMode,
            this.selectedDepartments,
            periodCaption,
          );
          this.applyViewModel(vm);
        },
        error: () => {
          this.admissionsPayerApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private applyStatusBlockAsDashboardView(block: RehabStatusBlock, periodCaption: string): void {
    this.chartHeading = block.title;
    this.periodCaption = periodCaption;
    this.chartType = block.chartType;
    this.chartColumns = block.chartColumns;
    this.chartRows = block.chartRows;
    this.kpis = block.kpis;
    this.tableColumns = block.tableColumns;
    this.tableRows = block.tableRows;
    this.chartNote = block.chartNote ?? '';
    this.chartOptions = block.code === '1.7'
      ? this.buildStatusChartOptions('1.7')
      : this.isDark
        ? applyDarkChartOptions({ backgroundColor: 'transparent', legend: { position: 'right' } })
        : { backgroundColor: 'transparent', legend: { position: 'right' } };
    this.recalcChartSize();
  }

  private loadDashboardAdmissionsDirectionFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const isDaily = this.periodMode === 'daily';
    const cached = this.admissionsDirectionApi.peekCache(range.fromDate, range.toDate);
    this.admissionsDirectionApiState = this.resolveInitialApiState(cached);
    this.admissionsDirectionSubscription?.unsubscribe();
    this.admissionsDirectionSubscription = this.admissionsDirectionApi
      .getRehabilitationAdmissionsByDirection(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.admissionsDirectionApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.admissionsDirectionApiState = 'success';
          const block = mapAdmissionsDirectionRowsToStatusBlock(rows, isDaily, this.selectedDepartments);
          this.applyStatusBlockAsDashboardView(block, this.buildPeriodCaption());
        },
        error: () => {
          this.admissionsDirectionApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardRecommendedTargetsFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const isDaily = this.periodMode === 'daily';
    const cached = this.recommendedTargetsApi.peekCache(range.fromDate, range.toDate);
    this.recommendedTargetsApiState = this.resolveInitialApiState(cached);
    this.recommendedTargetsSubscription?.unsubscribe();
    this.recommendedTargetsSubscription = this.recommendedTargetsApi
      .getRehabilitationRecommendedTargets(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.recommendedTargetsApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.recommendedTargetsApiState = 'success';
          const block = mapRecommendedTargetsRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedYear,
            this.selectedDepartments,
            range,
          );
          this.applyStatusBlockAsDashboardView(block, this.buildPeriodCaption());
        },
        error: () => {
          this.recommendedTargetsApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardRevenueNetFromApi(): void {
    const cached = this.revenueNetApi.peekCache();
    this.revenueNetApiState = this.resolveInitialApiState(cached);
    this.revenueNetSubscription?.unsubscribe();
    this.revenueNetSubscription = this.revenueNetApi
      .getRehabilitationRevenueNet()
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.revenueNetApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.revenueNetApiState = 'success';
          const block = mapRevenueNetRowsToStatusBlock(rows, this.selectedDepartments);
          this.applyStatusBlockAsDashboardView(block, this.revenueNetQueryPeriodNotice);
        },
        error: () => {
          this.revenueNetApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardTreatmentsFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const isDaily = this.periodMode === 'daily';
    const cached = this.treatmentsApi.peekCache(range.fromDate, range.toDate);
    this.treatmentsApiState = this.resolveInitialApiState(cached);
    this.treatmentsSubscription?.unsubscribe();
    this.treatmentsSubscription = this.treatmentsApi
      .getRehabilitationTreatments(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.treatmentsApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.treatmentsApiState = 'success';
          const block = mapTreatmentsRowsToStatusBlock(rows, isDaily, this.selectedDepartments);
          this.applyStatusBlockAsDashboardView(block, this.buildPeriodCaption());
        },
        error: () => {
          this.treatmentsApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadDashboardDayRehabFromApi(blockCode: RehabDayApiBlockCode): void {
    const range = this.getActiveDashboardDateRange();
    const isDaily = this.periodMode === 'daily';
    const cached = this.dayRehabApi.peekCache(blockCode, range.fromDate, range.toDate);
    this.setDayRehabApiState(blockCode, this.resolveInitialApiState(cached));
    this.dayRehabSubscription?.unsubscribe();
    this.dayRehabSubscription = this.dayRehabApi
      .getRows(blockCode, range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.setDayRehabApiState(blockCode, 'empty');
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.setDayRehabApiState(blockCode, 'success');
          const block = mapDayRehabRowsToStatusBlock(blockCode, rows, isDaily, this.selectedDepartments);
          this.applyStatusBlockAsDashboardView(block, this.buildPeriodCaption());
        },
        error: () => {
          this.setDayRehabApiState(blockCode, 'error');
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadStatusDayRehabFromApi(blockCode: RehabDayApiBlockCode): void {
    if (this.statusMode === 'none' || this.activeSection !== 'day-rehab') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const cached = this.dayRehabApi.peekCache(blockCode, range.fromDate, range.toDate);
    this.setDayRehabApiState(blockCode, this.resolveInitialApiState(cached));
    this.dayRehabSubscription?.unsubscribe();
    this.dayRehabSubscription = this.dayRehabApi
      .getRows(blockCode, range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.setDayRehabApiState(blockCode, 'empty');
            return;
          }
          this.setDayRehabApiState(blockCode, 'success');
          const dayBlock = mapDayRehabRowsToStatusBlock(blockCode, rows, isDaily, this.selectedDepartments);
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === blockCode ? dayBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.setDayRehabApiState(blockCode, 'error');
        },
      });
  }

  private loadDashboardOccupancyFromApi(): void {
    const range = this.getActiveDashboardDateRange();
    const periodCaption = this.buildPeriodCaption();
    const cached = this.occupancyApi.peekCache(range.fromDate, range.toDate);
    this.occupancyApiState = this.resolveInitialApiState(cached);
    this.occupancySubscription?.unsubscribe();
    this.occupancySubscription = this.occupancyApi
      .getRehabilitationOccupancy(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length) {
            this.occupancyApiState = 'empty';
            this.applyInDevelopmentDashboardView();
            return;
          }
          this.occupancyApiState = 'success';
          const vm = mapOccupancyRowsToDashboardViewModel(
            rows,
            this.selectedYear,
            null,
            this.periodMode,
            this.selectedDepartments,
            this.selectedTableRowId,
            periodCaption,
          );
          this.applyViewModel(vm);
        },
        error: () => {
          this.occupancyApiState = 'error';
          this.applyInDevelopmentDashboardView();
        },
      });
  }

  private loadStatusOccupancyFromApi(): void {
    if (this.statusMode === 'none') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const avgRange = getRevenueNetDateRange();
    const cached = this.occupancyApi.peekCache(range.fromDate, range.toDate);
    this.occupancyApiState = this.resolveInitialApiState(cached);
    this.occupancySubscription?.unsubscribe();

    const occupancy$ = this.occupancyApi.getRehabilitationOccupancy(range.fromDate, range.toDate);
    const average$ = isDaily
      ? of([] as RehabilitationOccupancyDto[])
      : this.occupancyApi.getRehabilitationOccupancy(avgRange.fromDate, avgRange.toDate);

    this.occupancySubscription = forkJoin({ rows: occupancy$, averageRows: average$ })
      .subscribe({
        next: ({ rows, averageRows }) => {
          if (!rows.length || !this.statusViewModel) {
            this.occupancyApiState = 'empty';
            return;
          }
          this.occupancyApiState = 'success';
          const occupancyBlock = mapOccupancyRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedYear,
            this.selectedDepartments,
            averageRows,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.3' ? occupancyBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.occupancyApiState = 'error';
        },
      });
  }

  private loadStatusAdmissionsPayerFromApi(): void {
    if (this.statusMode === 'none' || this.activeSection !== 'inpatient') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const cached = this.admissionsPayerApi.peekCache(range.fromDate, range.toDate);
    this.admissionsPayerApiState = this.resolveInitialApiState(cached);
    this.admissionsPayerSubscription?.unsubscribe();

    this.admissionsPayerSubscription = this.admissionsPayerApi
      .getRehabilitationAdmissionsByPayer(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.admissionsPayerApiState = 'empty';
            return;
          }
          this.admissionsPayerApiState = 'success';
          const admissionsBlock = mapAdmissionsPayerRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedDepartments,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.4' ? admissionsBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.admissionsPayerApiState = 'error';
        },
      });
  }

  private loadStatusAdmissionsDirectionFromApi(): void {
    if (this.statusMode === 'none' || this.activeSection !== 'inpatient') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const cached = this.admissionsDirectionApi.peekCache(range.fromDate, range.toDate);
    this.admissionsDirectionApiState = this.resolveInitialApiState(cached);
    this.admissionsDirectionSubscription?.unsubscribe();

    this.admissionsDirectionSubscription = this.admissionsDirectionApi
      .getRehabilitationAdmissionsByDirection(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.admissionsDirectionApiState = 'empty';
            return;
          }
          this.admissionsDirectionApiState = 'success';
          const directionBlock = mapAdmissionsDirectionRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedDepartments,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.5' ? directionBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.admissionsDirectionApiState = 'error';
        },
      });
  }

  private loadStatusRecommendedTargetsFromApi(): void {
    if (this.statusMode === 'none' || this.activeSection !== 'inpatient') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const cached = this.recommendedTargetsApi.peekCache(range.fromDate, range.toDate);
    this.recommendedTargetsApiState = this.resolveInitialApiState(cached);
    this.recommendedTargetsSubscription?.unsubscribe();

    this.recommendedTargetsSubscription = this.recommendedTargetsApi
      .getRehabilitationRecommendedTargets(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.recommendedTargetsApiState = 'empty';
            return;
          }
          this.recommendedTargetsApiState = 'success';
          const targetsBlock = mapRecommendedTargetsRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedYear,
            this.selectedDepartments,
            range,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.6' ? targetsBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.recommendedTargetsApiState = 'error';
        },
      });
  }

  private loadStatusRevenueNetFromApi(): void {
    if (this.statusMode !== 'monthly' || this.activeSection !== 'inpatient') {
      return;
    }
    const cached = this.revenueNetApi.peekCache();
    this.revenueNetApiState = this.resolveInitialApiState(cached);
    this.revenueNetSubscription?.unsubscribe();

    this.revenueNetSubscription = this.revenueNetApi
      .getRehabilitationRevenueNet()
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.revenueNetApiState = 'empty';
            return;
          }
          this.revenueNetApiState = 'success';
          const revenueBlock = mapRevenueNetRowsToStatusBlock(
            rows,
            this.selectedDepartments,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.7' ? revenueBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.revenueNetApiState = 'error';
        },
      });
  }

  private loadStatusTreatmentsFromApi(): void {
    if (this.statusMode === 'none' || this.activeSection !== 'inpatient') {
      return;
    }
    const isDaily = this.isStatusDailyPeriod();
    const range = this.getActiveStatusDateRange();
    const cached = this.treatmentsApi.peekCache(range.fromDate, range.toDate);
    this.treatmentsApiState = this.resolveInitialApiState(cached);
    this.treatmentsSubscription?.unsubscribe();

    this.treatmentsSubscription = this.treatmentsApi
      .getRehabilitationTreatments(range.fromDate, range.toDate)
      .subscribe({
        next: (rows) => {
          if (!rows.length || !this.statusViewModel) {
            this.treatmentsApiState = 'empty';
            return;
          }
          this.treatmentsApiState = 'success';
          const treatmentsBlock = mapTreatmentsRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedDepartments,
          );
          this.statusViewModel = {
            ...this.statusViewModel,
            blocks: this.statusViewModel.blocks.map((block) =>
              (block.code === '1.8' ? treatmentsBlock : block)),
          };
          this.recalcChartSize();
        },
        error: () => {
          this.treatmentsApiState = 'error';
        },
      });
  }

  private resolveInitialApiState(cached: unknown[] | null): RehabApiLoadState {
    if (cached == null) {
      return 'loading';
    }
    return cached.length ? 'success' : 'empty';
  }

  private withStatusQueryPeriodLabel(model: RehabStatusViewModel): RehabStatusViewModel {
    if (model.mode === 'daily') {
      const queryDate = getStatusDailyQueryDate();
      return {
        ...model,
        periodLabel: `יומי · יום עבודה אחרון · ${formatStatusDateHe(queryDate)}`,
      };
    }
    const range = this.getActiveStatusDateRange('monthly');
    const monthLabel = this.getMonthFilterLabel();
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    };
    const span = `${fmt(range.fromDate)} – ${fmt(range.toDate)}`;
    return {
      ...model,
      periodLabel: monthLabel
        ? `חודשי · ${monthLabel} ${this.selectedYear} · ${span}`
        : `חודשי · 30 ימים אחרונים · ${span}`,
    };
  }

  private buildPeriodCaption(): string {
    if (this.periodMode === 'monthly') {
      return `שנת ${this.selectedYear} — עמודה לכל חודש`;
    }
    return `7 ימים אחרונים — ${this.selectedYear}`;
  }

  private buildStatusChartOptions(blockCode = this.selectedStatusBlockCode): Record<string, unknown> {
    const isRevenueChart = blockCode === '1.7';
    const isOccupancyTrend = blockCode === '1.3';
    const isColumnChart = blockCode === '1.6' || blockCode === '1.8' || isRevenueChart;
    const base: Record<string, unknown> = {
      legend: { position: 'top', alignment: 'center' },
      chartArea: {
        left: 48,
        top: 36,
        right: 16,
        bottom: isRevenueChart || isOccupancyTrend ? 56 : 40,
        width: '88%',
        height: isRevenueChart ? '68%' : '70%',
      },
      backgroundColor: 'transparent',
      animation: { startup: false, duration: 0 },
      colors: ['#0077B6', '#94A3B8', '#F4A261'],
    };
    if (isOccupancyTrend) {
      base.seriesType = 'bars';
      base.series = {
        0: { type: 'bars' },
        1: { type: 'line', lineWidth: 2, pointSize: 3 },
      };
      base.bar = { groupWidth: '55%' };
      base.hAxis = {
        textStyle: { fontSize: 9 },
        slantedText: true,
        slantedTextAngle: 60,
        showTextEvery: 1,
      };
      base.vAxis = {
        textStyle: { fontSize: 11 },
        gridlines: { color: 'rgba(148,163,184,0.35)' },
        minValue: 0,
      };
      base.tooltip = { isHtml: true, trigger: 'focus' };
    } else if (isColumnChart) {
      base.annotations = {
        alwaysOutside: true,
        textStyle: { fontSize: 12, bold: true },
      };
      base.hAxis = {
        textStyle: { fontSize: 11 },
        slantedText: true,
        slantedTextAngle: isRevenueChart ? 45 : 32,
        showTextEvery: 1,
      };
      base.vAxis = {
        textStyle: { fontSize: 11 },
        gridlines: { color: 'rgba(148,163,184,0.35)' },
        minValue: 0,
        format: isRevenueChart ? '#,###' : undefined,
      };
      if (blockCode === '1.6') {
        base.tooltip = { trigger: 'focus' };
      }
      if (isRevenueChart) {
        base.tooltip = { isHtml: true, trigger: 'focus' };
      }
    } else {
      base.curveType = 'function';
      base.pointSize = 5;
    }
    return this.isDark ? applyDarkChartOptions(base) : base;
  }

  private applyViewModel(vm: RehabDashboardViewModel): void {
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
    this.chartNote = vm.chartNote ?? '';
    this.chartOptions = this.isDark ? applyDarkChartOptions(vm.chartOptions) : vm.chartOptions;
  }

  private recalcChartSize(): void {
    // Chart sizing handled by dynamicResize / chart-with-expand (surgeries dashboard pattern).
  }
}
