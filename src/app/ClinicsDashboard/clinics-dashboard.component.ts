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
import { computeGalaxyLayout, swapToCenter } from './clinics-galaxy-layout';
import { GalaxyOrbitAnimator, GalaxyPlanetElements } from './clinics-galaxy-orbit-animator';
import { GalaxyPlanetInput, GalaxyPlanetLayout } from './clinics-galaxy.models';

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
      description: 'תכנון לפי מרפאה / מחלקה — יושלם בהמשך',
      hasApi: false,
      columns: []
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
    Visited_Last1Month: 'חוזרים תוך חודש',
    Visited_Last3Months: 'חוזרים תוך 3 חודשים',
    PostScreeningVisit: 'ביקור לאחר אשפוז',
    PostHospitalizationVisit: 'ביקור לאחר מיון',
    FirstPatientEntryTime: 'כניסת מטופל ראשון',
    LastPatientExitTime: 'יציאת מטופל אחרון',
    StartTime: 'שעת כניסה - מטופל ראשון',
    EndTime: 'שעת יציאה - מטופל אחרון',
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
  @ViewChildren('planetEl') planetElRefs: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('lineEl') lineElRefs: QueryList<ElementRef<SVGLineElement>>;

  /** Every clinic currently rendered as a galaxy planet (index 0 is always the center). */
  galaxyPlanets: GalaxyPlanetView[] = [];
  /** Same list minus the center clinic — used to render orbit spokes/lines in lockstep. */
  nonCenterPlanets: GalaxyPlanetView[] = [];
  /** Distinct orbit radii present, used to draw the faint decorative ring guides. */
  galaxyOrbitRadii: number[] = [];
  readonly galaxyParticleSeeds: number[] = Array.from({ length: 36 }, (_, i) => i);
  readonly galaxyCenterParticleSeeds: number[] = Array.from({ length: 6 }, (_, i) => i);

  private galaxyOrder: string[] = [];
  private galaxyInputs: GalaxyPlanetInput[] = [];
  private galaxyInputsById = new Map<string, GalaxyPlanetInput>();
  private galaxyRowsById = new Map<string, GetClinicsDashboardDto>();
  private galaxyContainerSize: { width: number; height: number } | null = null;
  private galaxyLayoutDirty = false;
  private galaxyOrbitAnimator: GalaxyOrbitAnimator | null = null;
  private galaxyResizeObserver: ResizeObserver | null = null;

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
    this.syncGalaxyAnimator();
  }

  ngOnDestroy(): void {
    this.stopScanningTimer();
    if (this.counterAnimationFrame != null) {
      cancelAnimationFrame(this.counterAnimationFrame);
    }
    if (this.galaxyOrbitAnimator) {
      this.galaxyOrbitAnimator.destroy();
      this.galaxyOrbitAnimator = null;
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
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  applySearch(): void {
    this.dataSource.filter = (this.clinicSearch || '').trim().toLowerCase();
    this.computeSummary(this.dataSource.filteredData);
    this.selectedClinic = this.dataSource.filteredData[0] || null;
    this.feedGalaxyPlanets();
  }

  loadData(): void {
    if (!this.workDateModel || !this.dateOutModel) {
      this.errorMessage = 'נא לבחור טווח תאריכים';
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.hasLoadedOnce = true;
    this.startScanning();

    this.clinicsService
      .getClinicsDashboard(this.dateOutModel, this.workDateModel)
      .subscribe(
        rows => {
          this.dataSource.data = rows || [];
          this.applySearch();
          this.lastUpdated = this.formatNow();
          this.finishScanning(() => {
            this.loading = false;
            this.animateSummaryCounters();
          });
        },
        err => {
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
      );
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
    this.selectedClinic = row;
    const id = this.clinicId(row);
    if (id !== this.galaxyOrder[0]) {
      this.galaxyOrder = swapToCenter(this.galaxyOrder, id);
      this.refreshGalaxyLayout(false);
    }
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
  // Rendering (this component/template) and animation (GalaxyOrbitAnimator)
  // are kept separate from the pure layout math (clinics-galaxy-layout.ts).

  trackByPlanetId(_index: number, planet: GalaxyPlanetView): string {
    return planet.id;
  }

  selectPlanet(planet: GalaxyPlanetView): void {
    this.selectClinic(planet.row);
  }

  private clinicId(row: GetClinicsDashboardDto): string {
    return `${row.ClinicName || 'clinic'}__${row.VisitDate || ''}__${row.StartTime || ''}`;
  }

  /** Rebuilds the galaxy input list from the currently filtered rows and lays it out fresh. */
  private feedGalaxyPlanets(): void {
    const rows = this.dataSource.filteredData || [];
    this.galaxyRowsById = new Map(rows.map(row => [this.clinicId(row), row]));
    this.galaxyInputs = rows.map(row => ({
      id: this.clinicId(row),
      name: this.cellValue(row, 'ClinicName'),
      patients: this.clinicMetric(row, 'Total'),
      attendanceRate: this.clinicArrivalRate(row),
      hoursLabel: this.cellValue(row, 'HoursOpen')
    }));
    this.galaxyInputsById = new Map(this.galaxyInputs.map(input => [input.id, input]));
    this.refreshGalaxyLayout(true);
  }

  /** Recomputes planet positions/sizes. `resetOrder` re-picks the largest clinic as center. */
  private refreshGalaxyLayout(resetOrder: boolean): void {
    if (!this.galaxyContainerSize || !this.galaxyInputs.length) {
      this.galaxyPlanets = [];
      this.nonCenterPlanets = [];
      this.galaxyOrbitRadii = [];
      return;
    }

    const { layouts, order } = computeGalaxyLayout(
      this.galaxyInputs,
      this.galaxyContainerSize,
      resetOrder ? undefined : this.galaxyOrder
    );

    this.galaxyOrder = order;
    this.galaxyPlanets = layouts.map(layout => this.toPlanetView(layout));
    this.nonCenterPlanets = this.galaxyPlanets.filter(p => !p.isCenter);
    this.galaxyOrbitRadii = Array.from(new Set(this.nonCenterPlanets.map(p => p.orbitRadius))).sort((a, b) => a - b);
    this.galaxyLayoutDirty = true;

    if (this.galaxyOrbitAnimator) {
      this.galaxyOrbitAnimator.setViewportCenter(this.galaxyContainerSize.width / 2, this.galaxyContainerSize.height / 2);
    }
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

  /** Hands the current layout + freshly rendered DOM nodes to the orbit animator. */
  private syncGalaxyAnimator(): void {
    if (!this.galaxyLayoutDirty || !this.galaxyPlanets.length) {
      return;
    }
    if (!this.planetElRefs || this.planetElRefs.length !== this.galaxyPlanets.length) {
      return;
    }

    if (!this.galaxyOrbitAnimator) {
      this.galaxyOrbitAnimator = new GalaxyOrbitAnimator();
      if (this.galaxyContainerSize) {
        this.galaxyOrbitAnimator.setViewportCenter(
          this.galaxyContainerSize.width / 2,
          this.galaxyContainerSize.height / 2
        );
      }
    }

    const lineElArray = this.lineElRefs ? this.lineElRefs.toArray() : [];
    const lineByPlanetId = new Map<string, SVGLineElement>();
    this.nonCenterPlanets.forEach((planet, idx) => {
      const ref = lineElArray[idx];
      if (ref) {
        lineByPlanetId.set(planet.id, ref.nativeElement);
      }
    });

    const planetElArray = this.planetElRefs.toArray();
    const elements = new Map<string, GalaxyPlanetElements>();
    this.galaxyPlanets.forEach((planet, idx) => {
      const ref = planetElArray[idx];
      if (!ref) {
        return;
      }
      elements.set(planet.id, {
        planetEl: ref.nativeElement,
        lineEl: lineByPlanetId.get(planet.id) || null
      });
    });

    const animator = this.galaxyOrbitAnimator;
    const layouts = this.galaxyPlanets;
    this.zone.runOutsideAngular(() => animator.sync(layouts, elements));
    this.galaxyLayoutDirty = false;
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