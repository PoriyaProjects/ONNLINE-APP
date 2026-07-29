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
import { computeGalaxyLayout } from './clinics-galaxy-layout';
import { GalaxyPlanetInput, GalaxyPlanetLayout } from './clinics-galaxy.models';
import { ClinicPressureInput, ClinicPressureResult, computeClinicPressure, topByPressure } from './clinics-galaxy-pressure';

// TypeScript's bundled DOM lib for this project's compiler version predates the
// ResizeObserver API, so declare a minimal ambient shape for it here.
declare global {
  interface ResizeObserverEntry {
    contentRect: { width: number; height: number };
  }
  class ResizeObserver {
    constructor(callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void);
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
  }
}

export interface GalaxyPlanetView extends GalaxyPlanetLayout {
  row: GetClinicsDashboardDto;
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
  FirstVisitThisYear: string;
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
        'FirstVisitThisYear',
        'FirstPatientEntryTime',
        'LastPatientExitTime',
        'StartTime',
        'EndTime'
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
        'ObejectPlanning',
        'WeekObject',
        'Visited_Last1Month',
        'Visited_Last3Months',
        'PostScreeningVisit',
        'PostHospitalizationVisit',
        'FirstVisitThisYear',
        'StartTime',
        'EndTime'
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
    FirstVisitThisYear: 'ביקור ראשון השנה'
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
  /** True until the very first successful/failed load transitions us into the dashboard view. */
  heroMode = true;
  /** True while the "AI analysis" sequence is playing (both on first load and on refresh). */
  scanning = false;
  /** Values actually rendered in the KPI cards — eased toward `summary` for a count-up effect. */
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
  /** Decorative particle slots for the hero background. */
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

  /** Only the busiest clinics are rendered as bubbles — readable with 50+ clinics in the data. */
  readonly galaxyMaxPlanets = 10;
  /** How many clinics show up in the horizontal pressure carousel. */
  readonly pressureRankingCount = 12;

  /** Every clinic currently rendered as a galaxy bubble (index 0 is always the center). */
  galaxyPlanets: GalaxyPlanetView[] = [];
  /** Total clinics in the current filter, so the UI can say "top 10 of N". */
  galaxyTotalClinicCount = 0;
  /** Clinics ranked by how "pressured" (busy/overloaded) they currently are. */
  pressureRanking: ClinicPressureResult[] = [];
  /**
   * One film-strip segment (padded/repeated). Template renders it twice for a seamless loop.
   */
  pressureFilmStrip: ClinicPressureResult[] = [];
  /** Twinkling star field behind clinic bubbles. */
  readonly galaxyStarSeeds: number[] = Array.from({ length: 72 }, (_, i) => i);
  /** Small decorative planets (visual only). */
  readonly galaxyDecorPlanets: GalaxyDecorPlanet[] = buildGalaxyDecorPlanets(48);
  /** Faint orbital ring radii as % of the shorter stage edge. */
  readonly galaxyDecorOrbitRadii: number[] = buildGalaxyOrbitRadii(5);

  private galaxyOrder: string[] = [];
  private galaxyInputs: GalaxyPlanetInput[] = [];
  private galaxyInputsById = new Map<string, GalaxyPlanetInput>();
  private galaxyRowsById = new Map<string, GetClinicsDashboardDto>();
  /** Every filtered row, keyed by clinic id — used so carousel clicks can select a clinic outside the top 10. */
  private allRowsById = new Map<string, GetClinicsDashboardDto>();
  private galaxyContainerSize: { width: number; height: number } | null = null;
  private galaxyResizeObserver: ResizeObserver | null = null;
  private carouselRafId: number | null = null;
  private carouselOffsetPx = 0;
  private carouselLastMs = 0;
  /** Pixels per second — continuous film-strip speed. */
  private readonly carouselSpeedPxPerSec = 42;
  /** Signature of the strip currently driving the ticker (restarts loop when data changes). */
  private carouselStripKey = '';

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
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  applySearch(): void {
    this.dataSource.filter = (this.clinicSearch || '').trim().toLowerCase();
    this.computeSummary(this.dataSource.filteredData);
    this.selectedClinic = this.dataSource.filteredData[0] || null;
    if (this.activeTab === 'weekly') {
      this.feedGalaxyPlanets();
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

  // ---- Presentation-only helpers (do not touch backend/business logic) ----

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
    // Selection only — layout always keeps the largest clinic in the center.
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

  clinicLoadRate(row: GetClinicsDashboardDto): number {
    const requested = this.clinicMetric(row, 'AmountToRequest');
    const total = this.clinicMetric(row, 'Total');
    return requested > 0 ? Math.min(100, Math.round((total / requested) * 100)) : 0;
  }

  clinicNoShowRate(row: GetClinicsDashboardDto): number {
    const total = this.clinicMetric(row, 'Total');
    const notArrived = this.clinicMetric(row, 'NotArrived');
    return total > 0 ? Math.round((notArrived / total) * 100) : 0;
  }

  // ---- Galaxy view wiring ----
  // Static collision layout (clinics-galaxy-layout.ts) + CSS float motion.

  trackByPlanetId(_index: number, planet: GalaxyPlanetView): string {
    return planet.id;
  }

  selectPlanet(planet: GalaxyPlanetView): void {
    this.selectClinic(planet.row);
  }

  private clinicId(row: GetClinicsDashboardDto): string {
    return `${row.ClinicName || 'clinic'}__${row.VisitDate || ''}__${row.StartTime || ''}`;
  }

  /**
   * Rebuilds the galaxy input list from the currently filtered rows and lays it out fresh.
   * Only the top `galaxyMaxPlanets` clinics (by patient volume) become planets — with 50+
   * clinics in a dataset a full galaxy stops being readable — while the "pressure" ranking
   * (busiest/most overloaded clinics) is computed from every filtered clinic, not just those 10.
   */
  private feedGalaxyPlanets(): void {
    const rows = this.dataSource.filteredData || [];
    this.allRowsById = new Map(rows.map(row => [this.clinicId(row), row]));
    this.galaxyTotalClinicCount = rows.length;

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

    const galaxyRows = [...rows]
      .sort((a, b) => this.clinicMetric(b, 'Total') - this.clinicMetric(a, 'Total'))
      .slice(0, this.galaxyMaxPlanets);

    this.galaxyRowsById = new Map(galaxyRows.map(row => [this.clinicId(row), row]));
    this.galaxyInputs = galaxyRows.map(row => ({
      id: this.clinicId(row),
      name: this.cellValue(row, 'ClinicName'),
      patients: this.clinicMetric(row, 'Total'),
      attendanceRate: this.clinicArrivalRate(row),
      hoursLabel: this.cellValue(row, 'HoursOpen')
    }));
    this.galaxyInputsById = new Map(this.galaxyInputs.map(input => [input.id, input]));
    this.refreshGalaxyLayout(true);
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

  /**
   * Pads/repeats the ranking so one strip is always wider than any viewport.
   * Template renders two identical strips back-to-back for a seamless loop.
   */
  private buildPressureFilmStrip(base: ClinicPressureResult[]): ClinicPressureResult[] {
    if (!base.length) {
      return [];
    }
    const strip: ClinicPressureResult[] = [];
    // ~270px/card; 28 cards ≈ 7500px — covers ultra-wide monitors even with 3 clinics.
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

        // Prefer half the track width (two identical sets) — immune to subpixel set quirks.
        const trackLoopWidth = trackEl.scrollWidth / 2;
        const setWidth = setEl.getBoundingClientRect().width;
        const loopWidth = trackLoopWidth > 1 ? trackLoopWidth : setWidth;

        const dt = Math.min(0.05, (nowMs - this.carouselLastMs) / 1000);
        this.carouselLastMs = nowMs;

        if (loopWidth > 1) {
          this.carouselOffsetPx += this.carouselSpeedPxPerSec * dt;
          // Invisible wrap: second set is identical, so subtracting one loop looks continuous.
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

  private stopCarousel(): void {
    if (this.carouselRafId != null) {
      cancelAnimationFrame(this.carouselRafId);
      this.carouselRafId = null;
    }
    this.carouselOffsetPx = 0;
    if (this.pressureTrackRef && this.pressureTrackRef.nativeElement) {
      this.pressureTrackRef.nativeElement.style.transform = 'translate3d(0,0,0)';
    }
  }

  /** Recomputes bubble positions/sizes. Always re-sorts largest → smallest. */
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
    return {
      ...layout,
      row: this.galaxyRowsById.get(layout.id) as GetClinicsDashboardDto,
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