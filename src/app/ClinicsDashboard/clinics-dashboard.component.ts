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
import { ClinicPressureInput, ClinicPressureResult, computeClinicPressure, topByPressure } from './clinics-galaxy-pressure';

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
}

export interface ClinicsDashboardSummary {
  clinicCount: number;
  total: number;
  arrived: number;
  notArrived: number;
  arrivalRate: number;
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
      description: 'שורה לכל מרפאה / מחלקה',
      hasApi: true,
      columns: [
        'ClinicName',
        'HoursOpen',
        'AmountToRequest',
        'Total',
        'Arrived',
        'Visited_Last1Month',
        'Visited_Last3Months',
        'PostScreeningVisit',
        'PostHospitalizationVisit',
        'NewPatientsToClinic',
        'FirstPatientEntryTime',
        'LastPatientExitTime'
      ]
    },
    {
      id: 'planned',
      label: 'סיכום משמרת מתוכננת',
      description: 'תכנון לפי מרפאה / מחלקה',
      hasApi: true,
      columns: [
        'ClinicName',
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
    ClinicName: 'מרפאה',
    Depart_Name: 'מחלקה',
    HoursOpen: 'שעות פעילות',
    AmountToRequest: 'מכסה מטופלים',
    Total: 'מוזמנים',
    Arrived: 'הגיעו',
    ObejectPlanning: 'תכנון אובייקטים',
    WeekObject: 'אובייקט שבועי',
    Visited_Last1Month: 'חוזרים תוך חודש',
    Visited_Last3Months: 'חוזרים תוך 3 חודשים',
    PostScreeningVisit: 'ביקור לאחר אשפוז',
    PostHospitalizationVisit: 'ביקור לאחר מיון',
    FirstPatientEntryTime: 'כניסת מטופל ראשון',
    LastPatientExitTime: 'יציאת מטופל אחרון',
    StartTime: 'שעת התחלה',
    EndTime: 'שעת סיום',
    NewPatientsToClinic: 'ביקור ראשון השנה'
  };

  activeTab: ClinicsReportTab = 'weekly';
  clinicSearch = '';
  workDateModel: Date | null = null;
  dateOutModel: Date | null = null;
  loading = false;
  errorMessage: string | null = null;
  lastUpdated = '';
  hasLoadedOnce = false;
  selectedClinic: GetClinicsDashboardDto | null = null;

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
    arrivalRate: 0
  };

  // ---- Presentation-only state (hero / AI-scan experience) ----
  heroMode = true;
  scanning = false;
  displaySummary: ClinicsDashboardSummary = {
    clinicCount: 0,
    total: 0,
    arrived: 0,
    notArrived: 0,
    arrivalRate: 0
  };
  readonly scanningMessages: string[] = [
    'מאתחל מערכת בינה מלאכותית רפואית...',
    'קורא לוחות זמנים של מרפאות...',
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
  readonly pressureRankingCount = 12;

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
  private galaxyResizeObserver: ResizeObserver | null = null;
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
      { key: 'clinicCount', label: 'מרפאות' },
      { key: 'total', label: 'מוזמנים' },
      { key: 'arrived', label: 'הגיעו' },
      { key: 'notArrived', label: 'לא הגיעו' },
      { key: 'amountToRequest', label: 'מכסת מטופלים' },
      { key: 'visitedLast1Month', label: 'חוזרים תוך חודש' },
      { key: 'visitedLast3Months', label: 'חוזרים תוך 3 חודשים' },
      { key: 'postScreeningVisit', label: 'ביקור לאחר מיון' },
      { key: 'postHospitalizationVisit', label: 'ביקור לאחר אשפוז' },
      { key: 'newPatientsToClinic', label: 'ביקור ראשון השנה' },
      { key: 'arrivalRate', label: 'אחוז הגעה' }
    ],
    planned: [
      { key: 'clinicCount', label: 'מרפאות' },
      { key: 'total', label: 'מתוכננים' },
      { key: 'amountToRequest', label: 'מכסת מטופלים' },
      { key: 'visitedLast1Month', label: 'חוזרים תוך חודש' },
      { key: 'visitedLast3Months', label: 'חוזרים תוך 3 חודשים' },
      { key: 'postScreeningVisit', label: 'ביקור לאחר מיון' },
      { key: 'postHospitalizationVisit', label: 'ביקור לאחר אשפוז' },
      { key: 'newPatientsToClinic', label: 'ביקור ראשון השנה' }
    ]
  };

  constructor(private clinicsService: ClinicsDashboardService, private zone: NgZone) {}

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (row, property) => this.sortValue(row, property);
    this.dataSource.filterPredicate = (row, filter) =>
      (row.ClinicName || '').toLowerCase().includes(filter);
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
    this.ensureGalaxyStageObserver();
    this.ensureCarouselRunning();
  }

  ngOnDestroy(): void {
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

  setTab(tab: ClinicsReportTab): void {
    if (this.activeTab === tab) {
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

  loadData(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.errorMessage = 'נא לבחור טווח תאריכים';
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
            this.lastUpdated = this.formatNow();
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
          this.lastUpdated = this.formatNow();
          this.finishScanning(() => {
            this.loading = false;
            this.animateSummaryCounters();
          });
        },
        err => this.handleLoadError(err)
      );
  }

  private loadPlannedData(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.errorMessage = 'נא לבחור טווח תאריכים';
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
          this.lastUpdated = this.formatNow();
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
      'שגיאה בטעינת נתוני מרפאות. נסה שוב.';
    this.finishScanning(() => {
      this.loading = false;
      this.animateSummaryCounters();
    });
  }

  cellValue(row: GetClinicsDashboardDto, column: string): string {
    if (column === 'HoursOpen') {
      return this.hoursOpen(row);
    }
    const raw = (row as any)[column];
    const value = raw == null ? '' : String(raw).trim();
    return value === '' ? '—' : value;
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

    this.summary = {
      clinicCount: rows.length,
      total,
      arrived,
      notArrived,
      arrivalRate: total > 0 ? Math.round((arrived / total) * 100) : 0
    };
  }

  private formatNow(): string {
    const d = new Date();
    const pad = (n: number) => ('0' + n).slice(-2);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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

  departmentMetricValue(dept: DepartmentAggregate, key: string): number {
    return (dept as unknown as Record<string, number>)[key] ?? 0;
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
      patients: this.clinicMetric(row, 'Total'),
      arrived: this.clinicMetric(row, 'Arrived'),
      notArrived: this.clinicMetric(row, 'NotArrived'),
      requested: this.clinicMetric(row, 'AmountToRequest'),
      startTime: row.StartTime,
      endTime: row.EndTime
    }));
    this.pressureRanking = topByPressure(computeClinicPressure(pressureInputs), this.pressureRankingCount);
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
    if (this.galaxyResizeObserver || !this.galaxyStageRef || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.galaxyResizeObserver = new ResizeObserver((entries) => {
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
        arrivalRate: Math.round(from.arrivalRate + (to.arrivalRate - from.arrivalRate) * eased)
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
