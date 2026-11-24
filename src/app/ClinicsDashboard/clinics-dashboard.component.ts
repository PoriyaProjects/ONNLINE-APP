import {
  AfterViewChecked,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ClinicsDashboardService } from './clinics-dashboard.service';
import {
  DepartmentAggregate,
  groupRowsByDepartment,
  topDepartmentsByTotal
} from './clinics-department-aggregation';
import { computeGalaxyLayout } from './clinics-galaxy-layout';
import { GalaxyPlanetInput, GalaxyPlanetLayout } from './clinics-galaxy.models';
import { ClinicPressureInput, ClinicPressureResult, computeClinicPressure, topByCapacityLoad } from './clinics-galaxy-pressure';
import { exportClinicsDashboardToExcel } from './clinics-dashboard-excel-export';

/**
 * Local ResizeObserver shims — TS 3.8's DOM lib does not ship these types,
 * and a `declare global` block collides when the IDE uses a newer lib.
 */
interface ClinicsResizeObserverEntry {
  contentRect: { width: number; height: number };
}

interface ClinicsResizeObserver {
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

type ClinicsResizeObserverCtor = new (
  callback: (entries: ClinicsResizeObserverEntry[], observer: ClinicsResizeObserver) => void
) => ClinicsResizeObserver;

function getResizeObserverCtor(): ClinicsResizeObserverCtor | null {
  const ctor = (typeof window !== 'undefined' && (window as any).ResizeObserver) as
    | ClinicsResizeObserverCtor
    | undefined;
  return ctor || null;
}

export interface GalaxyPlanetView extends GalaxyPlanetLayout {
  /** Galaxy bubbles represent departments (aggregated across all their clinics), not single clinics. */
  dept: DepartmentAggregate;
  name: string;
  patients: number;
  attendanceRate: number;
  hoursLabel: string;
}

/** Non-interactive backdrop planet for the galaxy stage. */
export interface GalaxyDecorPlanet {
  id: number;
  xPct: number;
  yPct: number;
  sizePx: number;
  theme: 'purple' | 'blue' | 'cyan' | 'green' | 'orange' | 'pink';
  ampPx: number;
  durationSec: number;
  delaySec: number;
  opacity: number;
}

const DECOR_THEMES: GalaxyDecorPlanet['theme'][] = [
  'purple', 'blue', 'cyan', 'green', 'orange', 'pink'
];

function buildGalaxyDecorPlanets(count: number): GalaxyDecorPlanet[] {
  const planets: GalaxyDecorPlanet[] = [];
  let seed = 0x9e3779b9;
  const next = () => {
    seed = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0);
    return (seed >>> 0) / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    planets.push({
      id: i,
      xPct: next() * 100,
      yPct: next() * 100,
      sizePx: Math.round(5 + next() * 20),
      theme: DECOR_THEMES[i % DECOR_THEMES.length],
      ampPx: Math.round((3 + next() * 5) * 10) / 10,
      durationSec: Math.round((9 + next() * 10) * 100) / 100,
      delaySec: Math.round((-next() * 12) * 100) / 100,
      opacity: Math.round((0.28 + next() * 0.32) * 100) / 100
    });
  }
  return planets;
}

function buildGalaxyOrbitRadii(count: number): number[] {
  const radii: number[] = [];
  for (let i = 0; i < count; i++) {
    radii.push(12 + i * ((88 - 12) / Math.max(1, count - 1)));
  }
  return radii;
}

/**
 * Mirrors the backend GetClinicsDashboardDto returned by
 * usp_OutpatientClinicStatistics (all fields are strings).
 */
export interface GetClinicsDashboardDto {
  VisitDate: string;
  ClinicName: string;
  /** The department this clinic belongs to — used to group the Galaxy view and the weekly table. */
  Depart_Name: string;
  StartTime: string;
  EndTime: string;
  Total: string;
  Arrived: string;
  NotArrived: string;
  ObejectPlanning: string;
  AmountToRequest: string;
  WeekObject: string;
  WeekDayObject: string;
  PostHospitalizationVisit: string;
  PostScreeningVisit: string;
  Visited_Last1Month: string;
  Visited_Last3Months: string;
  FirstPatientEntryTime: string;
  LastPatientExitTime: string;
  NewPatientsToClinic: string;
  /** Walk-in / unscheduled patients (מתפרצים). */
  PatientsWithoutOrder: string;
}

export interface ClinicsDashboardSummary {
  clinicCount: number;
  total: number;
  arrived: number;
  notArrived: number;
  /** NO SHOW % (notArrived / total). */
  arrivalRate: number;
  /** Walk-ins count (PatientsWithoutOrder sum). */
  walkIns: number;
  /** Walk-ins as % of all actual arrivals (invited + walk-ins). */
  walkInRate: number;
  /** Sum of AmountToRequest (absolute capacity). */
  capacityQuota: number;
  /** % ממכסה — actual arrivals / capacity quota. */
  capacity: number;
}

export type ClinicsReportTab = 'weekly' | 'planned' | 'room';

interface ReportTabConfig {
  id: ClinicsReportTab;
  label: string;
  description: string;
  columns: string[];
  /** When false, table waits for a dedicated API (not GetClinicsDashboard). */
  hasApi: boolean;
}

@Component({
  selector: 'app-clinics-dashboard',
  templateUrl: './clinics-dashboard.component.html',
  styleUrls: ['./clinics-dashboard.component.scss']
})
export class ClinicsForDashboardComponent implements OnInit, AfterViewChecked, OnDestroy {

  readonly tabs: ReportTabConfig[] = [
    {
      id: 'weekly',
      label: 'סיכום משמרת שבועית',
      description: 'שורה לכל יומן / מחלקה',
      hasApi: true,
      columns: [
        'VisitDate',
        'ClinicName',
        'Total',
        'Arrived',
        'AmountToRequest',
        'PatientsWithoutOrder',
        'Visited_Last1Month',
        'Visited_Last3Months',
        'PostHospitalizationVisit',
        'PostScreeningVisit',
        'NewPatientsToClinic',
        'HoursOpen',
        'FirstPatientEntryTime',
        'LastPatientExitTime'
      ]
    },
    {
      id: 'planned',
      label: 'סיכום משמרת מתוכננת',
      description: 'תכנון לפי יומן / מחלקה',
      hasApi: true,
      columns: [
        'ClinicName',
        'VisitDate',
        'HoursOpen',
        'AmountToRequest',
        'Total',
        'Visited_Last1Month',
        'Visited_Last3Months',
        'PostScreeningVisit',
        'PostHospitalizationVisit',
        'NewPatientsToClinic'
      ]
    },
    {
      id: 'room',
      label: 'ניהול חדרים',
      description: 'שורה לכל חדר / מחשב — יושלם בהמשך',
      hasApi: false,
      columns: []
    }
  ];

  readonly columnLabels: Record<string, string> = {
    VisitDate: 'תאריך',
    HoursOpen: 'שעות פעילות',
    StartTime: 'שעת התחלה',
    EndTime: 'שעת סיום',
    Depart_Name: 'מחלקה',
    ClinicName: 'יומן',
    Total: 'מוזמנים',
    Arrived: 'הגיעו בפועל',
    AmountToRequest: 'מכסה מטופלים',
    ObejectPlanning: 'תכנון אובייקטים',
    WeekObject: 'אובייקט שבועי',
    Visited_Last1Month: 'חוזרים תוך חודש',
    Visited_Last3Months: 'חוזרים תוך 3 חודשים',
    PostScreeningVisit: 'ביקור לאחר אשפוז (45 ימים)',
    PostHospitalizationVisit: 'ביקור לאחר מיון (שבוע)',
    FirstPatientEntryTime: 'כניסת מטופל ראשון',
    LastPatientExitTime: 'יציאת מטופל אחרון',
    NewPatientsToClinic: 'ביקור ראשון השנה',
    PatientsWithoutOrder: 'מתפרצים'
  };

  activeTab: ClinicsReportTab = 'weekly';
  clinicSearch = '';
  workDateModel: Date | null = null;
  dateOutModel: Date | null = null;
  loading = false;
  exportingExcel = false;
  errorMessage: string | null = null;
  lastUpdated = '';
  hasLoadedOnce = false;
  selectedClinic: GetClinicsDashboardDto | null = null;
  /** Lightweight popup for planned-tab date validation (no MatDialog dependency). */
  cdAlertMessage: string | null = null;
  private cdAlertTimer: ReturnType<typeof setTimeout> | null = null;

  dataSource = new MatTableDataSource<GetClinicsDashboardDto>([]);
  /** Cached weekly API rows (סיכום משמרת שבועית). */
  private weeklyRows: GetClinicsDashboardDto[] = [];
  /** Cached forward/planned API rows (סיכום משמרת מתוכננת). */
  private plannedRows: GetClinicsDashboardDto[] = [];
  private plannedLoadedForKey = '';
  summary: ClinicsDashboardSummary = {
    clinicCount: 0,
    total: 0,
    arrived: 0,
    notArrived: 0,
    arrivalRate: 0,
    walkIns: 0,
    walkInRate: 0,
    capacityQuota: 0,
    capacity: 0
  };

  // ---- Presentation-only state (hero / AI-scan experience) ----
  heroMode = true;
  scanning = false;
  displaySummary: ClinicsDashboardSummary = {
    clinicCount: 0,
    total: 0,
    arrived: 0,
    notArrived: 0,
    arrivalRate: 0,
    walkIns: 0,
    walkInRate: 0,
    capacityQuota: 0,
    capacity: 0
  };
  readonly scanningMessages: string[] = [
    'מאתחל מערכת בינה מלאכותית רפואית...',
    'קורא לוחות זמנים של יומנים...',
    'מחשב שעות עבודה...',
    'מעבד נתוני מטופלים מוזמנים...',
    'בונה מדדי ביצועים...'
  ];
  scanningIndex = 0;
  readonly particleIndexes: number[] = Array.from({ length: 28 }, (_, i) => i);

  private scanningTimer: ReturnType<typeof setInterval> | null = null;
  private scanStartTime = 0;
  private readonly minScanDurationMs = 2600;
  private readonly scanMessageIntervalMs = 850;
  private counterAnimationFrame: number | null = null;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('galaxyStage') galaxyStageRef: ElementRef<HTMLElement>;
  @ViewChild('pressureTrack') pressureTrackRef: ElementRef<HTMLElement>;
  @ViewChildren('pressureSet') pressureSetRefs: QueryList<ElementRef<HTMLElement>>;

  readonly galaxyMaxPlanets = 10;
  readonly pressureRankingCount = 25;

  /** Every department currently rendered as a galaxy bubble (index 0 is always the center). */
  galaxyPlanets: GalaxyPlanetView[] = [];
  /** Total departments in the current filter, so the UI can say "top 10 of N". */
  galaxyTotalDepartmentCount = 0;
  /** Clinics ranked by how "pressured" (busy/overloaded) they currently are. */
  pressureRanking: ClinicPressureResult[] = [];
  pressureFilmStrip: ClinicPressureResult[] = [];
  readonly galaxyStarSeeds: number[] = Array.from({ length: 72 }, (_, i) => i);
  readonly galaxyDecorPlanets: GalaxyDecorPlanet[] = buildGalaxyDecorPlanets(48);
  readonly galaxyDecorOrbitRadii: number[] = buildGalaxyOrbitRadii(5);

  private galaxyOrder: string[] = [];
  private galaxyInputs: GalaxyPlanetInput[] = [];
  private galaxyInputsById = new Map<string, GalaxyPlanetInput>();
  /** Galaxy bubble id (department name) → its aggregated department data. */
  private galaxyDeptsById = new Map<string, DepartmentAggregate>();
  /** Every filtered row, keyed by clinic id — used so carousel clicks can select a clinic outside the top 10. */
  private allRowsById = new Map<string, GetClinicsDashboardDto>();
  private galaxyContainerSize: { width: number; height: number } | null = null;
  private galaxyResizeObserver: ClinicsResizeObserver | null = null;
  private carouselRafId: number | null = null;
  private carouselOffsetPx = 0;
  private carouselLastMs = 0;
  private readonly carouselSpeedPxPerSec = 42;
  private carouselStripKey = '';
  /** True while the pointer is hovering the pressure carousel — freezes the auto-scroll. */
  carouselPaused = false;

  // ---- Weekly summary table: department rows with expandable clinic detail ----
  /** One aggregated row per department, sorted busiest → quietest. Feeds the expandable table. */
  departmentGroups: DepartmentAggregate[] = [];
  /** Active sort column for the department summary table. */
  deptSortKey = 'total';
  /** Sort direction for departmentGroups. */
  deptSortDir: 'asc' | 'desc' = 'desc';
  /** Department names currently expanded in the weekly table. */
  private expandedDepartments = new Set<string>();
  /** Department bubble/row highlighted from a Galaxy click. */
  selectedDepartmentName: string | null = null;

  /**
   * Which DepartmentAggregate fields to show as columns in the department
   * summary table, per tab — 'weekly' has real Arrived/NotArrived/arrival-rate
   * data, 'planned' is forward-looking and never receives arrivals, so those
   * columns are omitted rather than showing misleading zeros.
   */
  private readonly departmentColumnsByTab: Record<'weekly' | 'planned', { key: string; label: string }[]> = {
    weekly: [
      { key: 'clinicCount', label: 'יומנים' },
      { key: 'total', label: 'מוזמנים' },
      { key: 'actualArrivals', label: 'הגיעו בפועל' },
      { key: 'notArrived', label: 'לא הגיעו' },
      { key: 'amountToRequest', label: 'מכסת מטופלים' },
      { key: 'visitedLast1Month', label: 'חוזרים תוך חודש' },
      { key: 'visitedLast3Months', label: 'חוזרים תוך 3 חודשים' },
      { key: 'postScreeningVisit', label: 'ביקור לאחר מיון (שבוע)' },
      { key: 'postHospitalizationVisit', label: 'ביקור לאחר אשפוז (45 ימים)' },
      { key: 'newPatientsToClinic', label: 'ביקור ראשון השנה' },
      { key: 'noShowRate', label: 'NO SHOW %' },
      { key: 'walkInRate', label: 'מתפרצים %' },
      { key: 'capacityRate', label: 'ממכסה %' }
    ],
    planned: [
      { key: 'clinicCount', label: 'יומנים' },
      { key: 'total', label: 'מתוכננים' },
      { key: 'amountToRequest', label: 'מכסת מטופלים' },
      { key: 'visitedLast1Month', label: 'חוזרים תוך חודש' },
      { key: 'visitedLast3Months', label: 'חוזרים תוך 3 חודשים' },
      { key: 'postScreeningVisit', label: 'ביקור לאחר מיון (שבוע)' },
      { key: 'postHospitalizationVisit', label: 'ביקור לאחר אשפוז (45 ימים)' },
      { key: 'newPatientsToClinic', label: 'ביקור ראשון השנה' }
    ]
  };

  private readonly percentDepartmentKeys = new Set([
    'noShowRate',
    'walkInRate',
    'capacityRate'
  ]);

  constructor(private clinicsService: ClinicsDashboardService, private zone: NgZone) {}

  ngOnInit(): void {
    this.applyDefaultDateRange();
    this.dataSource.sortingDataAccessor = (row, property) => this.sortValue(row, property);
    this.dataSource.filterPredicate = (row, filter) =>
      (row.ClinicName || '').toLowerCase().includes(filter);
  }

  /** Default range: one month back → today (ready for user to search). */
  private applyDefaultDateRange(): void {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to.getFullYear(), to.getMonth() - 1, to.getDate());
    this.workDateModel = from;
    this.dateOutModel = to;
  }

  /**
   * Shifts both date pickers one month forward without loading data —
   * user still clicks "הפעל חיפוש" to run the query.
   */
  shiftDatesOneMonthForward(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.applyDefaultDateRange();
    }
    this.workDateModel = this.addMonths(this.workDateModel as Date, 1);
    this.dateOutModel = this.addMonths(this.dateOutModel as Date, 1);
  }

  /** Same as forward, one month back — does not load data. */
  shiftDatesOneMonthBack(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.applyDefaultDateRange();
    }
    this.workDateModel = this.addMonths(this.workDateModel as Date, -1);
    this.dateOutModel = this.addMonths(this.dateOutModel as Date, -1);
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date.getTime());
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + months);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
    this.ensureGalaxyStageObserver();
    this.ensureCarouselRunning();
  }

  ngOnDestroy(): void {
    this.dismissCdAlert();
    this.stopScanningTimer();
    this.stopCarousel();
    if (this.counterAnimationFrame != null) {
      cancelAnimationFrame(this.counterAnimationFrame);
    }
    if (this.galaxyResizeObserver) {
      this.galaxyResizeObserver.disconnect();
      this.galaxyResizeObserver = null;
    }
  }

  get activeTabConfig(): ReportTabConfig {
    return this.tabs.find(t => t.id === this.activeTab) || this.tabs[0];
  }

  get displayedColumns(): string[] {
    return this.activeTabConfig.columns;
  }

  get showTable(): boolean {
    return this.activeTabConfig.hasApi;
  }

  get scanningMessage(): string {
    return this.scanningMessages[this.scanningIndex];
  }

  get scanProgressPercent(): number {
    return Math.round(((this.scanningIndex + 1) / this.scanningMessages.length) * 100);
  }

  get activeDepartmentColumns(): { key: string; label: string }[] {
    return this.departmentColumnsByTab[this.activeTab === 'planned' ? 'planned' : 'weekly'];
  }

  /**
   * Fixed column tracks for header + every data row.
   * Using max-content per row made each row size columns independently → headers
   * and values shifted out of sync. Fixed rem widths keep perfect alignment.
   */
  get departmentGridTemplateColumns(): string {
    const n = this.activeDepartmentColumns.length;
    // expand | name | N equal metric columns
    return '2.25rem 12.5rem' + (n > 0 ? ' repeat(' + n + ', 6.75rem)' : '');
  }

  setTab(tab: ClinicsReportTab): void {
    if (this.activeTab === tab) {
      return;
    }

    // Planned report is forward-looking — require a future-or-today date range first.
    if (tab === 'planned' && !this.validatePlannedDateRange()) {
      return;
    }

    this.activeTab = tab;
    this.errorMessage = null;

    if (tab === 'planned') {
      this.loadPlannedData();
    } else if (tab === 'weekly') {
      this.bindTableRows(this.weeklyRows);
    } else {
      this.dataSource.data = [];
      this.computeSummary([]);
      this.departmentGroups = [];
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  /** Close the small alert popup (or auto-cleared after a few seconds). */
  dismissCdAlert(): void {
    this.cdAlertMessage = null;
    if (this.cdAlertTimer != null) {
      clearTimeout(this.cdAlertTimer);
      this.cdAlertTimer = null;
    }
  }

  /**
   * Planned tab / forward API: both dates required, and neither may be before today.
   * On failure shows a small popup and returns false without changing tab state.
   */
  private validatePlannedDateRange(): boolean {
    if (!this.workDateModel || !this.dateOutModel) {
      this.openCdAlert('יש לבחור שני תאריכים לפני מעבר למשמרת מתוכננת');
      return false;
    }
    if (this.isDateBeforeToday(this.workDateModel) || this.isDateBeforeToday(this.dateOutModel)) {
      this.openCdAlert('התאריכים צריכים להיות גדולים מהיום הנוכחי');
      return false;
    }
    return true;
  }

  private isDateBeforeToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }

  private openCdAlert(message: string): void {
    this.cdAlertMessage = message;
    if (this.cdAlertTimer != null) {
      clearTimeout(this.cdAlertTimer);
    }
    this.cdAlertTimer = setTimeout(() => this.dismissCdAlert(), 5200);
  }

  applySearch(): void {
    this.dataSource.filter = (this.clinicSearch || '').trim().toLowerCase();
    this.computeSummary(this.dataSource.filteredData);
    this.selectedClinic = this.dataSource.filteredData[0] || null;
    this.rebuildDepartmentGroups();
    if (this.activeTab === 'weekly') {
      this.feedGalaxyPlanets();
    } else {
      this.galaxyPlanets = [];
      this.pressureRanking = [];
      this.pressureFilmStrip = [];
      this.stopCarousel();
    }
  }

  async exportToExcel(): Promise<void> {
    if (!this.showTable) {
      this.openCdAlert('אין טבלה לייצוא בלשונית הנוכחית');
      return;
    }
    if (!this.dataSource.filteredData.length) {
      this.openCdAlert('אין נתונים לייצוא. יש לבצע חיפוש תחילה.');
      return;
    }
    this.exportingExcel = true;
    try {
      await exportClinicsDashboardToExcel({
        tab: this.activeTab,
        tabLabel: this.activeTabConfig.label,
        dateFrom: this.formatExportDate(this.workDateModel),
        dateTo: this.formatExportDate(this.dateOutModel),
        departmentGroups: this.departmentGroups,
        departmentColumns: this.activeDepartmentColumns,
        clinicRows: this.dataSource.filteredData,
        clinicColumns: this.displayedColumns,
        clinicColumnLabels: this.columnLabels,
        departmentMetricValue: (dept, key) => this.departmentMetricValue(dept, key),
        isPercentDepartmentColumn: (key) => this.isPercentDepartmentColumn(key),
        clinicCellValue: (row, column) => this.cellValue(row, column)
      });
    } catch {
      this.openCdAlert('שגיאה בייצוא לאקסל. נסה שוב.');
    } finally {
      this.exportingExcel = false;
    }
  }

  loadData(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.errorMessage = 'נא לבחור טווח תאריכים';
      return;
    }

    if (this.activeTab === 'planned' && !this.validatePlannedDateRange()) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.hasLoadedOnce = true;
    this.plannedRows = [];
    this.plannedLoadedForKey = '';
    this.startScanning();

    if (this.activeTab === 'planned') {
      this.clinicsService
        .getClinicsDashboardForward(this.dateOutModel, this.workDateModel)
        .subscribe(
          rows => {
            this.plannedRows = rows || [];
            this.plannedLoadedForKey = this.dateRangeKey();
            this.bindTableRows(this.plannedRows);
            this.lastUpdated = this.formatReportUpdatedAt();
            this.finishScanning(() => {
              this.loading = false;
              this.animateSummaryCounters();
            });
          },
          err => this.handleLoadError(err)
        );
      return;
    }

    this.clinicsService
      .getClinicsDashboard(this.dateOutModel, this.workDateModel)
      .subscribe(
        rows => {
          this.weeklyRows = rows || [];
          this.bindTableRows(this.weeklyRows);
          this.lastUpdated = this.formatReportUpdatedAt();
          this.finishScanning(() => {
            this.loading = false;
            this.animateSummaryCounters();
          });
        },
        err => this.handleLoadError(err)
      );
  }

  private loadPlannedData(): void {
    if (!this.validatePlannedDateRange()) {
      this.bindTableRows([]);
      return;
    }

    const key = this.dateRangeKey();
    if (this.plannedLoadedForKey === key) {
      this.bindTableRows(this.plannedRows);
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.hasLoadedOnce = true;
    this.startScanning();

    this.clinicsService
      .getClinicsDashboardForward(this.dateOutModel, this.workDateModel)
      .subscribe(
        rows => {
          this.plannedRows = rows || [];
          this.plannedLoadedForKey = key;
          this.bindTableRows(this.plannedRows);
          this.lastUpdated = this.formatReportUpdatedAt();
          this.finishScanning(() => {
            this.loading = false;
            this.animateSummaryCounters();
          });
        },
        err => this.handleLoadError(err)
      );
  }

  private bindTableRows(rows: GetClinicsDashboardDto[]): void {
    this.dataSource.data = rows || [];
    this.applySearch();
  }

  private dateRangeKey(): string {
    const a = this.workDateModel ? this.workDateModel.toISOString().slice(0, 10) : '';
    const b = this.dateOutModel ? this.dateOutModel.toISOString().slice(0, 10) : '';
    return a + '|' + b;
  }

  private handleLoadError(err: any): void {
    this.dataSource.data = [];
    this.computeSummary([]);
    this.departmentGroups = [];
    this.errorMessage =
      (err && err.error && err.error.Message) ||
      (err && err.message) ||
      'שגיאה בטעינת נתוני יומנים. נסה שוב.';
    this.finishScanning(() => {
      this.loading = false;
      this.animateSummaryCounters();
    });
  }

  cellValue(row: GetClinicsDashboardDto, column: string): string {
    if (column === 'HoursOpen') {
      return this.hoursOpen(row);
    }
    if (column === 'VisitDate') {
      return this.formatVisitDate(row.VisitDate);
    }
    const raw = (row as any)[column];
    const value = raw == null ? '' : String(raw).trim();
    return value === '' ? '—' : value;
  }

  private formatExportDate(date: Date | null): string {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    const pad = (n: number) => ('0' + n).slice(-2);
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  /** Date only — strip trailing "00:00:00" (or any clock time) from API strings. */
  private formatVisitDate(value: string): string {
    const raw = (value || '').trim();
    if (!raw) {
      return '—';
    }
    // "20/07/2026 00:00:00" | "2026-07-20T00:00:00" | "20/07/2026"
    const datePart = raw.split(/[T\s]/)[0];
    return datePart || raw;
  }

  columnHeader(column: string): string {
    return this.columnLabels[column] || column;
  }

  noShowSeverity(row: GetClinicsDashboardDto): 'high' | 'medium' | 'none' {
    const total = Number(row.Total) || 0;
    const notArrived = Number(row.NotArrived) || 0;
    if (total === 0) {
      return 'none';
    }
    const rate = notArrived / total;
    if (rate >= 0.3) {
      return 'high';
    }
    if (rate >= 0.15) {
      return 'medium';
    }
    return 'none';
  }

  private hoursOpen(row: GetClinicsDashboardDto): string {
    const start = (row.StartTime || '').trim();
    const end = (row.EndTime || '').trim();
    if (!start && !end) {
      return '—';
    }
    if (start && end) {
      return start + ' – ' + end;
    }
    return start || end;
  }

  private sortValue(row: GetClinicsDashboardDto, property: string): string | number {
    if (property === 'HoursOpen') {
      return this.hoursOpen(row);
    }
    const raw = (row as any)[property];
    if (raw == null || raw === '') {
      return '';
    }
    const n = Number(raw);
    return Number.isFinite(n) && String(raw).trim() !== '' ? n : String(raw).toLowerCase();
  }

  private computeSummary(rows: GetClinicsDashboardDto[]): void {
    const total = rows.reduce((sum, r) => sum + (Number(r.Total) || 0), 0);
    const arrived = rows.reduce((sum, r) => sum + (Number(r.Arrived) || 0), 0);
    const notArrived = rows.reduce((sum, r) => sum + (Number(r.NotArrived) || 0), 0);
    const walkIns = rows.reduce((sum, r) => sum + (Number(r.PatientsWithoutOrder) || 0), 0);
    const capacityQuota = rows.reduce((sum, r) => sum + (Number(r.AmountToRequest) || 0), 0);
    const allArrivals = arrived + walkIns;

    this.summary = {
      clinicCount: rows.length,
      total,
      // "הגיעו בפועל" KPI = invited arrivals + walk-ins
      arrived: allArrivals,
      notArrived,
      // KPI shows NO SHOW % (not arrived / total), not arrival rate
      arrivalRate: total > 0 ? Math.round((notArrived / total) * 100) : 0,
      walkIns,
      walkInRate: allArrivals > 0 ? Math.round((walkIns / allArrivals) * 100) : 0,
      capacityQuota,
      // % ממכסה = הגיעו בפועל / מכסה
      capacity: capacityQuota > 0 ? Math.round((allArrivals / capacityQuota) * 100) : 0
    };
  }

  /** Report data is refreshed overnight; surface that cutover time (01:00), not "now". */
  private formatReportUpdatedAt(): string {
    const d = new Date();
    const pad = (n: number) => ('0' + n).slice(-2);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' 01:00';
  }

  private startScanning(): void {
    this.scanning = true;
    this.scanningIndex = 0;
    this.scanStartTime = Date.now();
    this.stopScanningTimer();
    this.scanningTimer = setInterval(() => {
      this.scanningIndex = Math.min(this.scanningIndex + 1, this.scanningMessages.length - 1);
    }, this.scanMessageIntervalMs);
  }

  private finishScanning(done: () => void): void {
    const elapsed = Date.now() - this.scanStartTime;
    const wait = Math.max(0, this.minScanDurationMs - elapsed);
    setTimeout(() => {
      this.stopScanningTimer();
      this.scanning = false;
      this.heroMode = false;
      done();
    }, wait);
  }

  private stopScanningTimer(): void {
    if (this.scanningTimer != null) {
      clearInterval(this.scanningTimer);
      this.scanningTimer = null;
    }
  }

  selectClinic(row: GetClinicsDashboardDto): void {
    this.selectedClinic = row;
  }

  isSelectedClinic(row: GetClinicsDashboardDto): boolean {
    return !!this.selectedClinic && this.selectedClinic === row;
  }

  clinicMetric(row: GetClinicsDashboardDto, field: keyof GetClinicsDashboardDto): number {
    return Number(row[field]) || 0;
  }

  clinicArrivalRate(row: GetClinicsDashboardDto): number {
    const total = this.clinicMetric(row, 'Total');
    const arrived = this.clinicMetric(row, 'Arrived');
    return total > 0 ? Math.round((arrived / total) * 100) : 0;
  }

  // ---- Galaxy + department wiring ----

  trackByPlanetId(_index: number, planet: GalaxyPlanetView): string {
    return planet.id;
  }

  selectPlanet(planet: GalaxyPlanetView): void {
    this.selectDepartment(planet.dept);
  }

  /** Highlights a department and expands it in the weekly table below. */
  selectDepartment(dept: DepartmentAggregate): void {
    if (!dept) {
      return;
    }
    this.selectedDepartmentName = dept.departName;
    this.expandedDepartments.add(dept.departName);
  }

  isSelectedDepartmentBubble(planet: GalaxyPlanetView): boolean {
    return !!this.selectedDepartmentName && planet.dept.departName === this.selectedDepartmentName;
  }

  toggleDepartment(dept: DepartmentAggregate): void {
    if (this.expandedDepartments.has(dept.departName)) {
      this.expandedDepartments.delete(dept.departName);
    } else {
      this.expandedDepartments.add(dept.departName);
    }
  }

  isDepartmentExpanded(dept: DepartmentAggregate): boolean {
    return this.expandedDepartments.has(dept.departName);
  }

  isSelectedDepartmentRow(dept: DepartmentAggregate): boolean {
    return this.selectedDepartmentName === dept.departName;
  }

  trackByDepartment(_index: number, dept: DepartmentAggregate): string {
    return dept.departName;
  }

  /**
   * Same pattern for every metric column including noShowRate, walkInRate, capacityRate:
   * read the precomputed field from DepartmentAggregate (set in groupRowsByDepartment).
   */
  departmentMetricValue(dept: DepartmentAggregate, key: string): number {
    if (!dept) {
      return 0;
    }
    const v = (dept as unknown as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  isPercentDepartmentColumn(key: string): boolean {
    return this.percentDepartmentKeys.has(key);
  }

  /**
   * Click-to-sort department table columns (NO SHOW, capacity %, walk-in %, etc.).
   * Same column again flips asc/desc.
   */
  sortDepartmentBy(key: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.deptSortKey === key) {
      this.deptSortDir = this.deptSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.deptSortKey = key;
      this.deptSortDir = 'desc';
    }
    this.applyDepartmentSort();
  }

  deptSortIndicator(key: string): string {
    if (this.deptSortKey !== key) {
      return '';
    }
    return this.deptSortDir === 'desc' ? ' ▼' : ' ▲';
  }

  private applyDepartmentSort(): void {
    const key = this.deptSortKey;
    const dir = this.deptSortDir === 'asc' ? 1 : -1;
    this.departmentGroups = [...this.departmentGroups].sort((a, b) => {
      if (key === 'departName') {
        return a.departName.localeCompare(b.departName, 'he') * dir;
      }
      const av = this.departmentMetricValue(a, key);
      const bv = this.departmentMetricValue(b, key);
      if (av === bv) {
        return a.departName.localeCompare(b.departName, 'he');
      }
      return (av - bv) * dir;
    });
  }

  private clinicId(row: GetClinicsDashboardDto): string {
    return `${row.ClinicName || 'clinic'}__${row.VisitDate || ''}__${row.StartTime || ''}`;
  }

  /**
   * Groups the currently filtered rows by department — the single source of
   * truth behind both summary tables (weekly + planned) and, when the weekly
   * tab is active, the Galaxy bubbles too.
   */
  private rebuildDepartmentGroups(): void {
    const rows = this.dataSource.filteredData || [];
    const allDepartments = groupRowsByDepartment(rows);
    this.departmentGroups = topDepartmentsByTotal(allDepartments, allDepartments.length);
    this.applyDepartmentSort();
    this.galaxyTotalDepartmentCount = allDepartments.length;
    this.pruneExpandedDepartments(allDepartments);
  }

  /**
   * Builds the Galaxy bubbles + the clinic-level pressure ranking from the
   * currently filtered rows. Only the top `galaxyMaxPlanets` departments (by
   * patient volume) become bubbles — with many departments in a dataset a
   * full galaxy stops being readable — while the "pressure" ranking
   * (busiest/most overloaded individual clinics) is computed from every
   * filtered row. Assumes `rebuildDepartmentGroups()` already ran this cycle.
   */
  private feedGalaxyPlanets(): void {
    const rows = this.dataSource.filteredData || [];
    this.allRowsById = new Map(rows.map(row => [this.clinicId(row), row]));

    const pressureInputs: ClinicPressureInput[] = rows.map(row => ({
      id: this.clinicId(row),
      name: this.cellValue(row, 'ClinicName'),
      visitDate: this.formatVisitDate(row.VisitDate),
      patients: this.clinicMetric(row, 'Total'),
      arrived: this.clinicMetric(row, 'Arrived'),
      notArrived: this.clinicMetric(row, 'NotArrived'),
      requested: this.clinicMetric(row, 'AmountToRequest'),
      walkIns: this.clinicMetric(row, 'PatientsWithoutOrder'),
      startTime: row.StartTime,
      endTime: row.EndTime
    }));
    this.pressureRanking = topByCapacityLoad(
      computeClinicPressure(pressureInputs),
      this.pressureRankingCount
    );
    this.pressureFilmStrip = this.buildPressureFilmStrip(this.pressureRanking);
    this.stopCarousel();

    const galaxyDepartments = topDepartmentsByTotal(this.departmentGroups, this.galaxyMaxPlanets);

    this.galaxyDeptsById = new Map(galaxyDepartments.map(dept => [dept.departName, dept]));
    this.galaxyInputs = galaxyDepartments.map(dept => ({
      id: dept.departName,
      name: dept.departName,
      patients: dept.total,
      attendanceRate: 0,
      hoursLabel: ''
    }));
    this.galaxyInputsById = new Map(this.galaxyInputs.map(input => [input.id, input]));
    this.refreshGalaxyLayout(true);
  }

  /** Drops expanded/selected department state for departments no longer present in the data. */
  private pruneExpandedDepartments(current: DepartmentAggregate[]): void {
    const validNames = new Set(current.map(d => d.departName));
    Array.from(this.expandedDepartments).forEach(name => {
      if (!validNames.has(name)) {
        this.expandedDepartments.delete(name);
      }
    });
    if (this.selectedDepartmentName && !validNames.has(this.selectedDepartmentName)) {
      this.selectedDepartmentName = null;
    }
  }

  selectPressureClinic(item: ClinicPressureResult): void {
    const row = this.allRowsById.get(item.id);
    if (row) {
      this.selectClinic(row);
    }
  }

  isSelectedPressureClinic(item: ClinicPressureResult): boolean {
    return !!this.selectedClinic && this.allRowsById.get(item.id) === this.selectedClinic;
  }

  private buildPressureFilmStrip(base: ClinicPressureResult[]): ClinicPressureResult[] {
    if (!base.length) {
      return [];
    }
    const strip: ClinicPressureResult[] = [];
    const minCards = Math.max(28, base.length * 4);
    while (strip.length < minCards) {
      for (let i = 0; i < base.length && strip.length < minCards; i++) {
        strip.push(base[i]);
      }
    }
    return strip;
  }

  trackByPressureFilm(index: number, item: ClinicPressureResult): string {
    return index + '__' + item.id;
  }

  private ensureCarouselRunning(): void {
    if (
      !this.pressureTrackRef ||
      !this.pressureSetRefs ||
      this.pressureSetRefs.length < 2 ||
      !this.pressureFilmStrip.length
    ) {
      this.stopCarousel();
      return;
    }

    const stripKey =
      this.pressureFilmStrip.length +
      ':' +
      (this.pressureRanking.length ? this.pressureRanking[0].id : '') +
      ':' +
      (this.pressureRanking.length ? this.pressureRanking[this.pressureRanking.length - 1].id : '');

    if (this.carouselRafId != null && this.carouselStripKey === stripKey) {
      return;
    }

    this.stopCarousel();
    this.carouselStripKey = stripKey;
    this.carouselOffsetPx = 0;
    this.carouselLastMs = performance.now();

    const track = this.pressureTrackRef.nativeElement;
    track.style.transform = 'translate3d(0,0,0)';

    this.zone.runOutsideAngular(() => {
      const tick = (nowMs: number) => {
        const trackEl = this.pressureTrackRef && this.pressureTrackRef.nativeElement;
        const firstSet = this.pressureSetRefs && this.pressureSetRefs.first;
        const setEl = firstSet && firstSet.nativeElement;
        if (!trackEl || !setEl || !this.pressureFilmStrip.length) {
          this.carouselRafId = null;
          return;
        }

        const trackLoopWidth = trackEl.scrollWidth / 2;
        const setWidth = setEl.getBoundingClientRect().width;
        const loopWidth = trackLoopWidth > 1 ? trackLoopWidth : setWidth;

        const dt = Math.min(0.05, (nowMs - this.carouselLastMs) / 1000);
        this.carouselLastMs = nowMs;

        // Keep the rAF loop alive while paused (so resuming is instant and jump-free),
        // just skip advancing the offset.
        if (loopWidth > 1 && !this.carouselPaused) {
          this.carouselOffsetPx += this.carouselSpeedPxPerSec * dt;
          if (this.carouselOffsetPx >= loopWidth) {
            this.carouselOffsetPx -= Math.floor(this.carouselOffsetPx / loopWidth) * loopWidth;
          }
          trackEl.style.transform =
            'translate3d(' + (-this.carouselOffsetPx).toFixed(2) + 'px,0,0)';
        }

        this.carouselRafId = requestAnimationFrame(tick);
      };
      this.carouselRafId = requestAnimationFrame(tick);
    });
  }

  /** Pauses the auto-scroll immediately (called on pointer enter). */
  pausePressureCarousel(): void {
    this.carouselPaused = true;
  }

  /** Resumes the auto-scroll from where it left off (called on pointer leave). */
  resumePressureCarousel(): void {
    this.carouselPaused = false;
    // Avoids a large-dt jump: the frame after resuming should measure from "now".
    this.carouselLastMs = performance.now();
  }

  private stopCarousel(): void {
    if (this.carouselRafId != null) {
      cancelAnimationFrame(this.carouselRafId);
      this.carouselRafId = null;
    }
    this.carouselOffsetPx = 0;
    this.carouselPaused = false;
    if (this.pressureTrackRef && this.pressureTrackRef.nativeElement) {
      this.pressureTrackRef.nativeElement.style.transform = 'translate3d(0,0,0)';
    }
  }

  private refreshGalaxyLayout(_resetOrder?: boolean): void {
    if (!this.galaxyContainerSize || !this.galaxyInputs.length) {
      this.galaxyPlanets = [];
      return;
    }

    const { layouts, order } = computeGalaxyLayout(
      this.galaxyInputs,
      this.galaxyContainerSize
    );

    this.galaxyOrder = order;
    this.galaxyPlanets = layouts.map(layout => this.toPlanetView(layout));
  }

  private toPlanetView(layout: GalaxyPlanetLayout): GalaxyPlanetView {
    const input = this.galaxyInputsById.get(layout.id);
    const dept = this.galaxyDeptsById.get(layout.id);
    return {
      ...layout,
      dept: this.galaxyDeptsById.get(layout.id) as DepartmentAggregate,
      name: input ? input.name : '',
      patients: input ? input.patients : 0,
      attendanceRate: input ? input.attendanceRate : 0,
      hoursLabel: input ? input.hoursLabel : ''
    };
  }

  private ensureGalaxyStageObserver(): void {
    if (!this.galaxyStageRef && this.galaxyResizeObserver) {
      this.galaxyResizeObserver.disconnect();
      this.galaxyResizeObserver = null;
      return;
    }
    const ResizeObserverCtor = getResizeObserverCtor();
    if (this.galaxyResizeObserver || !this.galaxyStageRef || !ResizeObserverCtor) {
      return;
    }
    this.galaxyResizeObserver = new ResizeObserverCtor((entries) => {
      const rect = entries[0] && entries[0].contentRect;
      if (!rect || rect.width < 1 || rect.height < 1) {
        return;
      }
      this.zone.run(() => {
        this.galaxyContainerSize = { width: rect.width, height: rect.height };
        this.refreshGalaxyLayout(false);
      });
    });
    this.galaxyResizeObserver.observe(this.galaxyStageRef.nativeElement);
  }

  private animateSummaryCounters(): void {
    if (this.counterAnimationFrame != null) {
      cancelAnimationFrame(this.counterAnimationFrame);
    }
    const duration = 900;
    const start = performance.now();
    const from = { ...this.displaySummary };
    const to = this.summary;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.displaySummary = {
        clinicCount: Math.round(from.clinicCount + (to.clinicCount - from.clinicCount) * eased),
        total: Math.round(from.total + (to.total - from.total) * eased),
        arrived: Math.round(from.arrived + (to.arrived - from.arrived) * eased),
        notArrived: Math.round(from.notArrived + (to.notArrived - from.notArrived) * eased),
        arrivalRate: Math.round(from.arrivalRate + (to.arrivalRate - from.arrivalRate) * eased),
        walkIns: Math.round(from.walkIns + (to.walkIns - from.walkIns) * eased),
        walkInRate: Math.round(from.walkInRate + (to.walkInRate - from.walkInRate) * eased),
        capacityQuota: Math.round(from.capacityQuota + (to.capacityQuota - from.capacityQuota) * eased),
        capacity: Math.round(from.capacity + (to.capacity - from.capacity) * eased)
      };
      if (t < 1) {
        this.counterAnimationFrame = requestAnimationFrame(step);
      } else {
        this.displaySummary = { ...to };
        this.counterAnimationFrame = null;
      }
    };
    this.counterAnimationFrame = requestAnimationFrame(step);
  }
}
