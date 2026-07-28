import { AfterViewChecked, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ClinicsDashboardService } from './clinics-dashboard.service';
import { ClinicGalaxyEngine, GalaxyClinicData } from './clinics-galaxy.engine';

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
  styleUrls: ['./clinics-dashboard.component.css']
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
  @ViewChild('galaxyCanvas') galaxyCanvasRef: ElementRef<HTMLCanvasElement>;
  @ViewChild('galaxyTooltip') galaxyTooltipRef: ElementRef<HTMLElement>;

  private galaxyEngine: ClinicGalaxyEngine | null = null;

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
    this.ensureGalaxyEngine();
  }

  ngOnDestroy(): void {
    this.stopScanningTimer();
    if (this.counterAnimationFrame != null) {
      cancelAnimationFrame(this.counterAnimationFrame);
    }
    if (this.galaxyEngine) {
      this.galaxyEngine.destroy();
      this.galaxyEngine = null;
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
    this.feedGalaxyEngine();
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
    if (this.galaxyEngine) {
      this.galaxyEngine.selectClinic(this.clinicId(row));
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

  // ---- Galaxy canvas engine wiring ----

  private clinicId(row: GetClinicsDashboardDto): string {
    return `${row.ClinicName || 'clinic'}__${row.VisitDate || ''}__${row.StartTime || ''}`;
  }

  private ensureGalaxyEngine(): void {
    if (this.galaxyEngine || !this.galaxyCanvasRef || !this.showTable ||
        !this.hasLoadedOnce || this.scanning || !this.dataSource.filteredData.length) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.galaxyEngine = new ClinicGalaxyEngine(
        this.galaxyCanvasRef.nativeElement,
        this.galaxyTooltipRef ? this.galaxyTooltipRef.nativeElement : null,
        {
          onSelect: (id) => this.zone.run(() => this.selectClinicById(id))
        }
      );
      this.feedGalaxyEngine();
    });
  }

  private feedGalaxyEngine(): void {
    if (!this.galaxyEngine) {
      return;
    }
    const rows = this.dataSource.filteredData || [];
    const data: GalaxyClinicData[] = rows.map(row => ({
      id: this.clinicId(row),
      name: this.cellValue(row, 'ClinicName'),
      patients: this.clinicMetric(row, 'Total'),
      attendanceRate: this.clinicArrivalRate(row),
      loadRate: this.clinicLoadRate(row),
      hoursLabel: this.cellValue(row, 'HoursOpen')
    }));
    this.zone.runOutsideAngular(() => this.galaxyEngine.setData(data));
  }

  private selectClinicById(id: string): void {
    const row = (this.dataSource.filteredData || []).find(r => this.clinicId(r) === id);
    if (row) {
      this.selectedClinic = row;
    }
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