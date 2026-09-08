import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { writeRehabExcel, recordsToAoa } from './utils/rehabilitation-excel-export.util';
import { applyDarkChartOptions, buildWeeklyLineChartRows, buildRehabWeeklyLineChartOptions, REHAB_CHART_PRIMARY, REHAB_HTML_TOOLTIP_OPTIONS, RehabWeeklyLineChartSpec } from './utils/rehabilitation-chart.utils';
import {
  getBedsForDepartment,
  getInpatientDepartmentsWithBeds,
  mapToOccupancyDepartment,
} from './constants/rehabilitation-bed-capacity.constants';
import { buildRehabStatusViewModel } from './utils/rehabilitation-status.builder';
import { RehabStatusBlock, RehabStatusMode, RehabStatusViewModel } from './models/rehabilitation-status.models';
import { RehabilitationAdmissionsPayerApiService } from './services/rehabilitation-admissions-payer-api.service';
import { mapAdmissionsPayerRowsToStatusBlock, mapAdmissionsPayerRowsToDashboardViewModel, RehabAdmissionsPeriodContext } from './mappers/rehabilitation-admissions-payer.mapper';
import { RehabilitationAdmissionsDirectionApiService } from './services/rehabilitation-admissions-direction-api.service';
import { mapAdmissionsDirectionRowsToStatusBlock } from './mappers/rehabilitation-admissions-direction.mapper';
import { RehabilitationRecommendedTargetsApiService } from './services/rehabilitation-recommended-targets-api.service';
import { mapRecommendedTargetsRowsToStatusBlock } from './mappers/rehabilitation-recommended-targets.mapper';
import { RehabilitationRevenueNetApiService } from './services/rehabilitation-revenue-net-api.service';
import { mapRevenueNetRowsToStatusBlock, RehabRevenueChartUnit, RehabRevenueMonthRange } from './mappers/rehabilitation-revenue-net.mapper';
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
  revenueChartUnit: RehabRevenueChartUnit = 'amount';
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
  chartRows: Array<Array<string | number | Record<string, unknown> | null>> = [];
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

  get isMultiMonthStatusRange(): boolean {
    return this.statusMode === 'monthly'
      && this.selectedMonthFrom != null
      && this.selectedMonthTo != null
      && Math.abs(this.selectedMonthTo - this.selectedMonthFrom) > 0;
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
    const range = this.getRevenueMapperMonthRange();
    if (range) {
      return `טווח שאילתה: ${range.fromDate} – ${range.toDate}`;
    }
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

  get showRevenueUnitToggle(): boolean {
    if (this.isStatusView) {
      return this.selectedStatusBlockCode === '1.7';
    }
    return this.activeMetric === 'revenue-net';
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
    this.isMonthFilterOpen = false;
    this.isMonthRangeFilterOpen = false;
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

  exportToExcel(): void {
    const stamp = new Date().toISOString().slice(0, 10);
    const sheets: Array<{ name: string; rows: unknown[][] }> = [];
    const range = this.isStatusView ? this.getActiveStatusDateRange() : this.getActiveDashboardDateRange();
    sheets.push({
      name: 'סיכום',
      rows: [
        ['דשבורד שיקום'],
        ['תאריך ייצוא', stamp],
        ['אזור', this.sectionTitle],
        ['מצב', this.isStatusView ? this.statusModeLabel : 'דשבורד'],
        ['תקופה', this.isStatusView ? (this.statusViewModel?.periodLabel || '') : this.filterSummary],
        ['שנה', this.selectedYear],
        ['חודש', this.monthButtonLabel],
        ['טווח חודשים', this.monthRangeButtonLabel],
        ['מחלקות', this.getDepartmentDisplay()],
        ['FromDate', range.fromDate],
        ['ToDate', range.toDate],
        ['מדד', this.isStatusView ? (this.activeStatusBlock?.title || this.selectedStatusBlockCode) : this.activeMetricDef.label],
      ],
    });

    const pushChart = (
      name: string,
      columns: (string | Record<string, unknown>)[],
      rows: Array<Array<string | number | Record<string, unknown> | null>>,
    ) => {
      const keep = columns
        .map((col, index) => (typeof col === 'string' ? index : -1))
        .filter((index) => index >= 0);
      if (!keep.length) {
        return;
      }
      sheets.push({
        name,
        rows: [
          keep.map((index) => columns[index] as string),
          ...rows.map((row) => keep.map((index) => row[index])),
        ],
      });
    };

    const pushTable = (name: string, columns: { key: string; label: string }[], rows: { cells: Record<string, unknown> }[]) => {
      if (!columns.length) {
        return;
      }
      sheets.push({
        name,
        rows: [
          columns.map((col) => col.label),
          ...rows.map((row) => columns.map((col) => row.cells[col.key])),
        ],
      });
    };

    if (this.isStatusView && this.statusViewModel) {
      this.statusViewModel.blocks.forEach((block) => {
        if (block.kpis.length) {
          sheets.push({
            name: `${block.code} KPI`,
            rows: [['מדד', 'ערך', 'פירוט'], ...block.kpis.map((kpi) => [kpi.label, kpi.value, kpi.sub || ''])],
          });
        }
        pushTable(`${block.code} ${block.title}`, block.tableColumns, block.tableRows);
        if (block.chartRows.length) {
          pushChart(`${block.code} גרף`, block.chartColumns, block.chartRows);
        }
      });
    } else {
      if (this.kpis.length) {
        sheets.push({
          name: 'KPI',
          rows: [['מדד', 'ערך', 'פירוט'], ...this.kpis.map((kpi) => [kpi.label, kpi.value, kpi.sub || ''])],
        });
      }
      pushTable('טבלה', this.tableColumns, this.tableRows);
      if (this.chartRows.length) {
        pushChart('גרף', this.chartColumns, this.chartRows);
      }
    }

    const rawSheets: Array<{ name: string; rows: unknown[] }> = [
      { name: 'גולמי תפוסה', rows: this.getStatusOccupancyRowsFromCache() || [] },
      { name: 'גולמי תפוסה דשבורד', rows: this.occupancyApi.peekCache(
        this.getActiveDashboardDateRange().fromDate,
        this.getActiveDashboardDateRange().toDate,
      ) || [] },
      { name: 'גולמי קבלות משלם', rows: this.getStatusPayerRowsFromCache() || [] },
      { name: 'גולמי כיוון', rows: this.getStatusDirectionRowsFromCache() || [] },
      { name: 'גולמי יעדים', rows: this.getStatusTargetsRowsFromCache() || [] },
      { name: 'גולמי הכנסות', rows: this.revenueNetApi.peekCache() || [] },
      { name: 'גולמי טיפולים', rows: this.getStatusTreatmentsRowsFromCache() || [] },
      { name: 'גולמי ימי אשפוז', rows: this.hospitalizationDaysApi.peekCache(range.fromDate, range.toDate) || [] },
      { name: 'גולמי שהייה ממוצעת', rows: this.avgLosApi.peekCache(range.fromDate, range.toDate) || [] },
    ];
    REHAB_DAY_API_BLOCK_CODES.forEach((code) => {
      rawSheets.push({ name: `גולמי ${code}`, rows: this.getStatusDayRehabRowsFromCache(code) || [] });
    });
    rawSheets.forEach((sheet) => {
      if (!sheet.rows.length) {
        return;
      }
      sheets.push({ name: sheet.name, rows: recordsToAoa(sheet.rows) });
    });

    writeRehabExcel(`rehabilitation-dashboard-${stamp}`, sheets);
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

  onRevenueChartUnitChange(unit: RehabRevenueChartUnit): void {
    this.revenueChartUnit = unit;
    if (this.isStatusView) {
      this.reapplyStatusBlocksFromRaw();
      this.statusChartOptions = this.buildStatusChartOptions('1.7');
      return;
    }
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

  showStatusKpiStrip(block: RehabStatusBlock): boolean {
    return !!block.kpis?.length && block.code !== '1.4' && block.code !== '1.5' && block.code !== '1.7';
  }

  showStatusMetaLines(block: RehabStatusBlock): boolean {
    const dailyContext = this.showStatusPreviousDayNotice && block.code !== '1.7';
    const beds = block.code === '1.3' && !!this.statusViewModel?.bedCapacityNote;
    const mock = !this.isStatusBlockApiBacked(block.code);
    return dailyContext || beds || mock;
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

  private getRevenueMapperMonthRange(): RehabRevenueMonthRange | null {
    const hasRange = this.selectedMonthFrom != null && this.selectedMonthTo != null;
    const hasMonth = this.selectedMonth != null;
    if (!hasRange && !hasMonth) {
      return null;
    }
    return this.isStatusView
      ? this.getActiveStatusDateRange('monthly')
      : this.getActiveDashboardDateRange();
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

  private matchesSelectedDept(name: string | undefined): boolean {
    if (!this.selectedDepartments.length) {
      return true;
    }
    const raw = (name || '').trim();
    const canonical = mapToOccupancyDepartment(raw) || raw;
    return this.selectedDepartments.includes(canonical) || this.selectedDepartments.includes(raw);
  }

  private getDatedTotalsForStatusBlock(code: string): { date: string; value: number }[] {
    const dated = (rows: Array<{ date?: string; departmentName?: string; value: number }>) =>
      rows
        .filter((row) => this.matchesSelectedDept(row.departmentName) && row.date)
        .map((row) => ({ date: String(row.date).slice(0, 10), value: row.value }));

    if (code === '1.3') {
      return dated((this.getStatusOccupancyRowsFromCache() || []).map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.occupiedPatients,
      })));
    }
    if (code === '1.4') {
      return dated((this.getStatusPayerRowsFromCache() || []).map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.admissionsCount,
      })));
    }
    if (code === '1.5') {
      return dated((this.getStatusDirectionRowsFromCache() || []).map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.admissionsCount,
      })));
    }
    if (code === '1.6') {
      return dated((this.getStatusTargetsRowsFromCache() || []).map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.actualValue,
      })));
    }
    if (code === '1.7') {
      const rows = this.revenueNetApi.peekCache() || [];
      return dated(rows.map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.revenueAmount,
      })));
    }
    if (code === '1.8') {
      return dated((this.getStatusTreatmentsRowsFromCache() || []).map((row) => ({
        date: row.date, departmentName: row.departmentName, value: row.totalTreatments,
      })));
    }
    if ((REHAB_DAY_API_BLOCK_CODES as readonly string[]).includes(code)) {
      const blockCode = code as RehabDayApiBlockCode;
      const rows = this.getStatusDayRehabRowsFromCache(blockCode) || [];
      return dated(rows.map((row) => {
        const rec = row as Record<string, unknown>;
        return {
          date: String(rec.date || ''),
          departmentName: String(rec.departmentName || ''),
          value: this.getDayRehabWeeklyValue(blockCode, rec),
        };
      }));
    }
    return [];
  }

  private getDayRehabWeeklyValue(code: RehabDayApiBlockCode, row: Record<string, unknown>): number {
    if (code === '2.1' || code === '2.2') {
      return Number(row.patientCount ?? 0);
    }
    if (code === '2.3') {
      return Number(row.dischargeCount ?? 0);
    }
    if (code === '2.4') {
      return Number(row.dailyCount ?? 0);
    }
    if (code === '2.6') {
      return Number(row.treatmentsPerPosition ?? 0);
    }
    if (code === '2.7') {
      return Number(row.avgTreatments ?? 0);
    }
    return Number(row.treatmentCount ?? 0);
  }

  private getAdmissionsPeriodContext(): RehabAdmissionsPeriodContext {
    const range = this.isStatusView
      ? this.getActiveStatusDateRange()
      : this.getActiveDashboardDateRange();
    return {
      fromDate: range.fromDate,
      toDate: range.toDate,
      byMonth: this.isStatusView ? this.isMultiMonthStatusRange : this.periodMode === 'monthly',
    };
  }

  private getWeeklyLineSpec(code: string): RehabWeeklyLineChartSpec {
    const specs: Record<string, RehabWeeklyLineChartSpec> = {
      '1.3': {
        seriesLabel: 'תפוסות',
        metricTitle: 'תפוסת מיטות',
        valueSuffix: 'מאושפזים תפוסים',
        vTitle: 'מאושפזים תפוסים',
        aggregate: 'avg',
        meaning: 'ממוצע יומי של מאושפזים תפוסים בשבוע (א׳–ש׳). ציר X = שבוע, ציר Y = מספר מאושפזים תפוסים.',
      },
      '1.6': {
        seriesLabel: 'בפועל',
        metricTitle: 'יעדים מומלצים — ביצוע בפועל',
        valueSuffix: 'ערך בפועל',
        vTitle: 'ערך בפועל',
        aggregate: 'avg',
        meaning: 'ממוצע שבועי של הביצוע בפועל מול יעד. ציר X = שבוע, ציר Y = ערך בפועל.',
      },
      '1.8': {
        seriesLabel: 'טיפולים',
        metricTitle: 'טיפולים מקצועיים',
        valueSuffix: 'טיפולים',
        vTitle: 'מספר טיפולים',
        aggregate: 'sum',
        meaning: 'סה״כ טיפולים מקצועיים בשבוע (אמצע שבוע בלבד). ציר X = שבוע, ציר Y = מספר טיפולים.',
      },
      '2.1': {
        seriesLabel: 'מטופלים',
        metricTitle: 'מטופלי שיקום יום לפי קופות',
        valueSuffix: 'מטופלים',
        vTitle: 'מטופלים',
        aggregate: 'sum',
        meaning: 'סה״כ מטופלים עם התחייבויות חדשות בשבוע, לפי קופות. ציר X = שבוע, ציר Y = מספר מטופלים.',
      },
      '2.2': {
        seriesLabel: 'מטופלים',
        metricTitle: 'מטופלי שיקום יום פנים/חוץ',
        valueSuffix: 'מטופלים',
        vTitle: 'מטופלים',
        aggregate: 'sum',
        meaning: 'סה״כ מטופלים עם התחייבויות חדשות בשבוע, פנים וחוץ. ציר X = שבוע, ציר Y = מספר מטופלים.',
      },
      '2.3': {
        seriesLabel: 'משחררים',
        metricTitle: 'משחררים עם המלצה לשיקום יום',
        valueSuffix: 'משחררים',
        vTitle: 'משחררים',
        aggregate: 'sum',
        meaning: 'סה״כ משחררים מאשפוז שיקום עם המלצה לשיקום יום בשבוע. ציר X = שבוע, ציר Y = מספר משחררים.',
      },
      '2.4': {
        seriesLabel: 'טיפולים',
        metricTitle: 'טיפולי שיקום יום',
        valueSuffix: 'טיפולים',
        vTitle: 'טיפולים',
        aggregate: 'sum',
        meaning: 'סה״כ טיפולי שיקום יום בשבוע. ציר X = שבוע, ציר Y = מספר טיפולים.',
      },
      '2.5': {
        seriesLabel: 'טיפולים',
        metricTitle: 'טיפולים לפי סקטור',
        valueSuffix: 'טיפולים',
        vTitle: 'טיפולים',
        aggregate: 'sum',
        meaning: 'סה״כ טיפולי שיקום יום לפי סקטורים בשבוע. ציר X = שבוע, ציר Y = מספר טיפולים.',
      },
      '2.6': {
        seriesLabel: 'טיפולים למשרה',
        metricTitle: 'טיפולים למשרה',
        valueSuffix: 'טיפולים למשרה',
        vTitle: 'טיפולים למשרה',
        aggregate: 'avg',
        meaning: 'ממוצע שבועי של מספר טיפולים למשרה (תקן) בסקטורים. ציר X = שבוע, ציר Y = טיפולים למשרה.',
      },
      '2.7': {
        seriesLabel: 'ממוצע למטופל',
        metricTitle: 'ממוצע טיפולים למטופל',
        valueSuffix: 'טיפולים למטופל',
        vTitle: 'טיפולים למטופל',
        aggregate: 'avg',
        meaning: 'ממוצע שבועי של טיפולי שיקום יום למטופל ביום. ציר X = שבוע, ציר Y = ממוצע טיפולים.',
      },
      '2.8': {
        seriesLabel: 'טיפולים',
        metricTitle: 'טיפולים פרטני / קבוצתי',
        valueSuffix: 'טיפולים',
        vTitle: 'טיפולים',
        aggregate: 'sum',
        meaning: 'סה״כ טיפולי שיקום יום בשבוע, פרטני וקבוצתי. ציר X = שבוע, ציר Y = מספר טיפולים.',
      },
    };
    return specs[code] || {
      seriesLabel: 'ערך שבועי',
      metricTitle: 'ערך שבועי',
      valueSuffix: '',
      vTitle: 'ערך',
      aggregate: 'sum',
      meaning: 'כל נקודה = שבוע (א׳–ש׳). ציר X = שבוע, ציר Y = הערך שנמדד.',
    };
  }

  private withWeeklyLineChart(block: RehabStatusBlock): RehabStatusBlock {
    if (block.code === '1.4' || block.code === '1.5') {
      return block;
    }
    if (block.code === '1.7') {
      if (!this.isMultiMonthStatusRange) {
        return block;
      }
      return {
        ...block,
        chartType: 'LineChart',
      };
    }
    if (!this.isMultiMonthStatusRange) {
      return block;
    }
    const dated = this.getDatedTotalsForStatusBlock(block.code);
    if (!dated.length) {
      return block;
    }
    const range = this.getActiveStatusDateRange('monthly');
    const spec = this.getWeeklyLineSpec(block.code);
    const chart = buildWeeklyLineChartRows(
      dated,
      range.fromDate,
      range.toDate,
      spec,
    );
    if (!chart.rows.length) {
      return block;
    }
    return {
      ...block,
      chartType: 'AreaChart',
      chartColumns: chart.columns,
      chartRows: chart.rows,
    };
  }

  private patchStatusBlock(code: string, block: RehabStatusBlock): void {
    if (!this.statusViewModel) {
      return;
    }
    const next = this.withWeeklyLineChart(block);
    this.statusViewModel = {
      ...this.statusViewModel,
      blocks: this.statusViewModel.blocks.map((item) => (item.code === code ? next : item)),
    };
    if (code === this.selectedStatusBlockCode) {
      this.statusChartOptions = this.buildStatusChartOptions(code);
    }
    this.recalcChartSize();
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
        const block = mapAdmissionsPayerRowsToStatusBlock(
          cached,
          isDaily,
          this.selectedDepartments,
          this.getAdmissionsPeriodContext(),
        );
        blocks = blocks.map((b) => (b.code === '1.4' ? block : b));
      }
    }
    if (isRehabApiSuccess(this.admissionsDirectionApiState)) {
      const cached = this.getStatusDirectionRowsFromCache();
      if (cached?.length) {
        const block = mapAdmissionsDirectionRowsToStatusBlock(
          cached,
          isDaily,
          this.selectedDepartments,
          this.getAdmissionsPeriodContext(),
        );
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
        const block = mapRevenueNetRowsToStatusBlock(
          cached,
          this.selectedDepartments,
          this.revenueChartUnit,
          this.getRevenueMapperMonthRange(),
        );
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
    this.statusViewModel = {
      ...this.statusViewModel,
      blocks: blocks.map((b) => this.withWeeklyLineChart(b)),
    };
    this.statusChartOptions = this.buildStatusChartOptions();
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
            this.getActiveDashboardDateRange(),
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
    this.chartOptions = this.buildStatusChartOptions(block.code);
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
          const block = mapAdmissionsDirectionRowsToStatusBlock(
            rows,
            isDaily,
            this.selectedDepartments,
            this.getAdmissionsPeriodContext(),
          );
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
          const block = mapRevenueNetRowsToStatusBlock(
            rows,
            this.selectedDepartments,
            this.revenueChartUnit,
            this.getRevenueMapperMonthRange(),
          );
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
          this.patchStatusBlock(blockCode, dayBlock);
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
          this.patchStatusBlock('1.3', occupancyBlock);
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
            this.getAdmissionsPeriodContext(),
          );
          this.patchStatusBlock('1.4', admissionsBlock);
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
            this.getAdmissionsPeriodContext(),
          );
          this.patchStatusBlock('1.5', directionBlock);
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
          this.patchStatusBlock('1.6', targetsBlock);
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
            this.revenueChartUnit,
            this.getRevenueMapperMonthRange(),
          );
          this.patchStatusBlock('1.7', revenueBlock);
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
          this.patchStatusBlock('1.8', treatmentsBlock);
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
        periodLabel: `יום עבודה אחרון · ${formatStatusDateHe(queryDate)}`,
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
        ? `${monthLabel} ${this.selectedYear} · ${span}`
        : `30 ימים אחרונים · ${span}`,
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
    const isAdmissionsMonthly = blockCode === '1.4'
      && this.getAdmissionsPeriodContext().byMonth;
    const isDirectionTimeChart = blockCode === '1.5';
    const isWeeklyLine = this.isMultiMonthStatusRange && !isRevenueChart && !isAdmissionsMonthly && !isDirectionTimeChart;
    const isRevenueMonthlyLine = isRevenueChart && this.isMultiMonthStatusRange;
    const isColumnChart = (blockCode === '1.6' || blockCode === '1.8' || isRevenueChart || isAdmissionsMonthly || isDirectionTimeChart) && !isRevenueMonthlyLine;
    const percentRevenue = isRevenueChart && this.revenueChartUnit === 'percent';
    const base: Record<string, unknown> = {
      legend: { position: percentRevenue ? 'none' : 'top', alignment: 'center' },
      chartArea: {
        left: isRevenueChart ? (percentRevenue ? 56 : 80) : 48,
        top: percentRevenue ? 36 : 24,
        right: 12,
        bottom: percentRevenue ? 56 : (isWeeklyLine || isRevenueChart || isOccupancyTrend ? 48 : 32),
        width: '92%',
        height: isRevenueChart ? '78%' : '70%',
      },
      backgroundColor: 'transparent',
      animation: { startup: false, duration: 0 },
      colors: ['#0077B6', '#94A3B8', '#F4A261'],
      tooltip: REHAB_HTML_TOOLTIP_OPTIONS,
    };
    if (isWeeklyLine) {
      const weekly = this.getWeeklyLineSpec(blockCode);
      const pointCount = this.statusViewModel?.blocks.find((item) => item.code === blockCode)?.chartRows.length
        || this.chartRows.length
        || 12;
      Object.assign(base, buildRehabWeeklyLineChartOptions(weekly.vTitle, pointCount));
    } else if (isRevenueMonthlyLine) {
      const pointCount = this.statusViewModel?.blocks.find((item) => item.code === '1.7')?.chartRows.length
        || this.chartRows.length
        || 12;
      Object.assign(base, buildRehabWeeklyLineChartOptions('₪', pointCount, {
        areaOpacity: 0,
        colors: percentRevenue ? ['#16a34a', '#dc2626'] : [REHAB_CHART_PRIMARY],
        vAxis: {
          title: percentRevenue ? '' : 'הכנסות (₪)',
          titleTextStyle: { fontSize: 11, bold: true, color: '#475569' },
          textStyle: { fontSize: 11, color: '#64748b' },
          ...(percentRevenue ? {} : { minValue: 0 }),
          format: percentRevenue ? "0'%'" : '#,###',
          baselineColor: '#cbd5e1',
          gridlines: { color: '#eef2f7', count: 5 },
          minorGridlines: { count: 0 },
        },
        annotations: {
          alwaysOutside: true,
          highContrast: false,
          textStyle: { fontSize: 11, bold: true, auraColor: 'none' },
        },
      }));
    } else if (isOccupancyTrend) {
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
        ...(percentRevenue ? {} : { minValue: 0 }),
        format: isRevenueChart
          ? (percentRevenue ? "0'%'" : '#,###')
          : undefined,
      };
      if (percentRevenue) {
        base.colors = ['#16a34a', '#dc2626'];
        base.isStacked = true;
        base.legend = { position: 'none' };
        base.annotations = {
          alwaysOutside: true,
          highContrast: false,
          textStyle: { fontSize: 12, bold: true, auraColor: 'none' },
        };
      }
      if (isAdmissionsMonthly) {
        base.isStacked = true;
        base.colors = ['#0077B6', '#F4A261', '#64748B'];
        base.legend = { position: 'top', alignment: 'center' };
        base.hAxis = {
          ...(base.hAxis as Record<string, unknown> || {}),
          slantedText: true,
          slantedTextAngle: 45,
        };
      }
      if (isDirectionTimeChart) {
        const byMonth = this.getAdmissionsPeriodContext().byMonth;
        base.isStacked = false;
        base.colors = ['#0077B6', '#F4A261'];
        base.legend = { position: 'top', alignment: 'center' };
        base.bar = { groupWidth: byMonth ? '55%' : '72%' };
        base.hAxis = {
          title: byMonth ? 'חודש' : 'תאריך',
          titleTextStyle: { fontSize: 12, bold: true, color: '#334155' },
          textStyle: { fontSize: 10, color: '#475569' },
          slantedText: true,
          slantedTextAngle: 45,
          showTextEvery: 1,
        };
        base.vAxis = {
          title: 'מספר קבלות',
          titleTextStyle: { fontSize: 12, bold: true, color: '#334155' },
          textStyle: { fontSize: 11, color: '#475569' },
          gridlines: { color: 'rgba(148,163,184,0.35)' },
          minValue: 0,
          format: '0',
        };
        base.tooltip = { isHtml: true, trigger: 'both' };
        base.chartArea = { left: 72, top: 40, right: 16, bottom: 72, width: '86%', height: '66%' };
      }
      if (blockCode === '1.6') {
        base.tooltip = REHAB_HTML_TOOLTIP_OPTIONS;
      }
      if (isRevenueChart) {
        base.tooltip = { isHtml: true, trigger: 'focus' };
      }
    } else if (blockCode === '1.4') {
      base.legend = { position: 'right', alignment: 'center' };
      base.chartArea = { left: 16, top: 24, right: 96, bottom: 16, width: '70%', height: '78%' };
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
