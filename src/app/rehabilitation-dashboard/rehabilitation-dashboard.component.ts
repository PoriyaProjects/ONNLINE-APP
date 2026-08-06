import { Component, HostListener, OnInit } from '@angular/core';
import {
  buildRehabMockViewModel,
  RehabMockViewModel,
} from './rehabilitation-dashboard.mock-data';
import { getInpatientDepartmentsWithBeds } from './rehabilitation-bed-capacity.constants';
import {
  MONTH_LABELS_HE,
  REHAB_INPATIENT_METRICS,
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
  readonly metrics: RehabMetricDefinition[] = REHAB_INPATIENT_METRICS;
  readonly monthOptions = MONTH_LABELS_HE.map((label, index) => ({ value: index, label })).filter((m) => m.value > 0);
  readonly availableYears = [2024, 2025, 2026];

  periodMode: RehabPeriodMode = 'monthly';
  hospitalizationDaysMode: RehabHospitalizationDaysMode = 'gross';
  activeMetric: RehabMetricKey = 'hospitalization-days';
  selectedYear = 2026;
  selectedMonth: number | null = null;
  departmentFilter = 'all';

  chartType = 'ColumnChart';
  chartColumns: (string | Record<string, unknown>)[] = [];
  chartRows: (string | number)[][] = [];
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 320;

  kpis: RehabKpiCard[] = [];
  tableColumns: RehabTableColumn[] = [];
  tableRows: RehabTableRow[] = [];
  periodCaption = '';
  chartHeading = '';

  ngOnInit(): void {
    this.recalcChartSize();
    this.refreshView();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recalcChartSize();
  }

  get allDepartments(): string[] {
    return getInpatientDepartmentsWithBeds(this.selectedYear);
  }

  get selectedDepartments(): string[] {
    return this.departmentFilter === 'all' ? [] : [this.departmentFilter];
  }

  get activeMetricDef(): RehabMetricDefinition {
    return this.metrics.find((m) => m.key === this.activeMetric) || this.metrics[0];
  }

  get filterSummary(): string {
    const deptPart = this.departmentFilter === 'all'
      ? 'כל מחלקות השיקום'
      : this.departmentFilter;
    const periodPart = this.periodMode === 'monthly' ? 'תצוגה חודשית' : 'תצוגה יומית';
    const monthPart = this.selectedMonth ? MONTH_LABELS_HE[this.selectedMonth] : 'כל השנה';
    return `${periodPart} · ${monthPart} ${this.selectedYear} · ${deptPart}`;
  }

  get showHospitalizationDaysToggle(): boolean {
    return this.activeMetric === 'hospitalization-days';
  }

  onMetricChange(metric: RehabMetricKey): void {
    if (this.activeMetric === metric) return;
    this.activeMetric = metric;
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
    if (this.departmentFilter !== 'all' && !this.allDepartments.includes(this.departmentFilter)) {
      this.departmentFilter = 'all';
    }
    this.refreshView();
  }

  onMonthChange(month: number | null): void {
    this.selectedMonth = month;
    this.refreshView();
  }

  onDepartmentFilterChange(value: string): void {
    this.departmentFilter = value;
    this.refreshView();
  }

  refreshView(): void {
    const vm = buildRehabMockViewModel(
      this.activeMetric,
      this.periodMode,
      this.hospitalizationDaysMode,
      this.selectedDepartments,
      null,
      this.selectedYear,
      this.selectedMonth,
    );
    this.applyViewModel(vm);
  }

  private applyViewModel(vm: RehabMockViewModel): void {
    this.chartHeading = vm.chartHeading;
    this.periodCaption = vm.periodCaption;
    this.kpis = vm.kpis;
    this.tableColumns = vm.tableColumns;
    this.tableRows = vm.tableRows;
    this.chartType = vm.chartType;
    this.chartColumns = vm.chartColumns;
    this.chartRows = vm.chartRows;
    this.chartOptions = vm.chartOptions;
  }

  private recalcChartSize(): void {
    const padding = 48;
    const available = window.innerWidth - padding;
    this.chartWidth = Math.max(320, Math.min(available, 1100));
    this.chartHeight = Math.max(260, Math.min(360, Math.floor(window.innerHeight * 0.35)));
  }
}
