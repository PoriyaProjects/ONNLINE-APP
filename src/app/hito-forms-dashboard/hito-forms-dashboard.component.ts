import { Component, OnInit, HostListener } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  HitoFormsChartItem,
  HitoFormsDashboardStats,
  HitoFormsDashboardService
} from './hito-forms-dashboard.service';

interface DetailModal {
  title: string;
  items: string[];
}

@Component({
  selector: 'app-hito-forms-dashboard',
  templateUrl: './hito-forms-dashboard.component.html',
  styleUrls: ['./hito-forms-dashboard.component.css']
})
export class HitoFormsDashboardComponent implements OnInit {

  /* ── Filters ── */
  selectedForms: string[] = [];
  selectedDepartments: string[] = [];
  selectedYears: string[] = [];
  selectedQuarters: string[] = [];
  formSearch = '';
  departmentSearch = '';

  /* ── Options ── */
  allYears: string[] = [];
  allQuarters: string[] = [];
  allDepartments: string[] = [];
  allForms: string[] = [];

  get filteredForms(): string[] {
    const s = this.formSearch.trim().toLowerCase();
    return s ? this.allForms.filter(n => n.toLowerCase().includes(s)) : this.allForms;
  }

  get filteredDepartments(): string[] {
    const s = this.departmentSearch.trim().toLowerCase();
    return s ? this.allDepartments.filter(d => d.toLowerCase().includes(s)) : this.allDepartments;
  }

  /* ── Data ── */
  stats: HitoFormsDashboardStats | null = null;
  chartData: HitoFormsChartItem[] = [];
  lastUpdateDate = '';

  /* ── Detail modal ── */
  detailModal: DetailModal | null = null;
  detailSearch = '';

  get filteredDetailItems(): string[] {
    if (!this.detailModal) return [];
    const s = this.detailSearch.trim().toLowerCase();
    return s ? this.detailModal.items.filter(i => i.toLowerCase().includes(s)) : this.detailModal.items;
  }

  /* ── Google Chart ── */
  chartColumns: any[] = [
    'מחלקה', 'ציון %',
    { role: 'annotation', type: 'string' },
    { role: 'style', type: 'string' }
  ];
  chartRows: any[][] = [];
  chartType = 'ColumnChart';
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 390;

  /* ── State ── */
  loading = false;
  loadingOptions = false;
  optionsLoadError: string | null = null;
  error: string | null = null;

  private readonly BAR_CLR = '#3B8AD9';
  private applyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private svc: HitoFormsDashboardService) {}

  ngOnInit(): void {
    this.recalc();
    this.loadOptions();
  }

  @HostListener('window:resize')
  onResize(): void { this.recalc(); }

  private recalc(): void {
    const vw = window.innerWidth;
    const bars = Math.max(this.chartData.length, 1);
    const perBar = 140; // wide enough for Hebrew labels
    this.chartWidth = Math.max(bars * perBar + 100, vw * 0.93, 500);
    // Chart height matches the CSS .hd-chart height minus padding
    this.chartHeight = vw < 640 ? 240 : 390;

    const many = bars > 6;
    this.chartOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      bar: { groupWidth: bars <= 4 ? '50%' : bars <= 8 ? '62%' : '72%' },
      annotations: {
        alwaysOutside: true,
        textStyle: {
          fontSize: 18,
          fontName: 'Arial',
          bold: true,
          color: 'rgba(0, 0, 0, 1)',
          opacity: 1
        }
      },
      hAxis: {
        textStyle: {
          fontSize: 15,
          fontName: 'Arial',
          color: 'rgba(0, 0, 0, 1)'
        },
        slantedText: many,
        slantedTextAngle: bars > 12 ? 55 : bars > 8 ? 40 : 30,
        maxTextLines: 4,
        maxAlternation: 1
      },
      vAxis: {
        minValue: 0,
        maxValue: 100,
        viewWindow: { min: 0, max: 100 },
        gridlines: { color: '#E8EAED', count: 6 },
        minorGridlines: { count: 0 },
        textStyle: { fontSize: 14, fontName: 'Arial', color: 'rgba(0, 0, 0, 1)' },
        baselineColor: '#CFD8DC'
      },
      chartArea: {
        width: '91%',
        height: many ? '50%' : '60%',
        top: 32,
        right: 10,
        bottom: many ? 130 : 70
      },
      animation: { startup: true, duration: 500, easing: 'out' },
      tooltip: {
        textStyle: { fontName: 'Arial', fontSize: 16 },
        showColorCode: false
      },
      enableInteractivity: true,
      focusTarget: 'category'
    };
  }

  /* ── Load options ── */
  loadOptions(): void {
    this.loadingOptions = true;
    this.optionsLoadError = null;
    forkJoin({
      years: this.svc.getYears(),
      quarters: this.svc.getQuarters(),
      departments: this.svc.getDepartments(),
      names: this.svc.getQuestionnaireNames()
    }).subscribe({
      next: ({ years, quarters, departments, names }) => {
        this.allYears = years || [];
        this.allQuarters = quarters || [];
        this.allDepartments = departments || [];
        this.allForms = names || [];
        this.loadingOptions = false;
        this.applyFilters();
      },
      error: (err) => {
        this.loadingOptions = false;
        this.optionsLoadError = 'שגיאה בטעינת רשימות: ' + (err?.message || '');
      }
    });
  }

  retryLoadOptions(): void { this.optionsLoadError = null; this.loadOptions(); }

  /* ── Toggle with auto-apply ── */
  private scheduleApply(): void {
    if (this.applyTimeout) clearTimeout(this.applyTimeout);
    this.applyTimeout = setTimeout(() => { this.applyTimeout = null; this.applyFilters(); }, 400);
  }

  toggle(arr: string[], val: string): void {
    const i = arr.indexOf(val); i === -1 ? arr.push(val) : arr.splice(i, 1);
    this.scheduleApply();
  }
  isIn(arr: string[], val: string): boolean { return arr.includes(val); }
  toggleAll(arr: string[], all: string[]): void {
    arr.length === all.length ? (arr.length = 0) : (arr.length = 0, arr.push(...all));
    this.scheduleApply();
  }
  allChecked(arr: string[], all: string[]): boolean {
    return all.length > 0 && arr.length === all.length;
  }

  /* ── Apply ── */
  applyFilters(): void {
    this.loading = true;
    this.error = null;
    const p = {
      year: this.selectedYears.join(','),
      quarter: this.selectedQuarters.join(','),
      formNameFilter: this.selectedForms.join(','),
      departmentFilter: this.selectedDepartments.join(',')
    };
    forkJoin({
      stats: this.svc.getDashboardStats(p),
      chart: this.svc.getChartData(p)
    }).subscribe({
      next: ({ stats, chart }) => {
        this.stats = stats ?? null;
        this.chartData = chart || [];
        this.lastUpdateDate = this.now();
        this.chartRows = this.chartData.map(it => {
          const v = Number(it.Value) || 0;
          return [it.Label || '', v, v + ' %', this.BAR_CLR];
        });
        this.recalc();
        this.loading = false;
        // Trigger chart redraw after DOM update
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      },
      error: () => { this.error = 'שגיאה בטעינת נתונים'; this.loading = false; }
    });
  }

  resetFilters(): void {
    this.selectedForms = []; this.selectedDepartments = [];
    this.selectedYears = []; this.selectedQuarters = [];
    this.formSearch = ''; this.departmentSearch = '';
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return this.selectedForms.length > 0 || this.selectedDepartments.length > 0 ||
           this.selectedYears.length > 0 || this.selectedQuarters.length > 0;
  }

  retry(): void { this.error = null; this.applyFilters(); }

  fmtGrade(g: number | null | undefined): string {
    if (g == null) return '—';
    return (Number.isInteger(g) ? g : g.toFixed(1)) + ' %';
  }

  openFormsList(): void {
    const items = this.selectedForms.length > 0 ? [...this.selectedForms] : [...this.allForms];
    this.detailModal = { title: 'רשימת שאלונים (' + items.length + ')', items };
    this.detailSearch = '';
  }

  /** Opens modal with list of workers (ממלאים) from stats.Workers */
  openWorkersList(): void {
    const items = this.stats && this.stats.Workers ? [...this.stats.Workers] : [];
    this.detailModal = { title: 'רשימת ממלאים (' + items.length + ')', items };
    this.detailSearch = '';
  }

  openDepartmentsList(): void {
    const items = this.selectedDepartments.length > 0 ? [...this.selectedDepartments] : [...this.allDepartments];
    this.detailModal = { title: 'רשימת מחלקות (' + items.length + ')', items };
    this.detailSearch = '';
  }

  closeDetail(): void { this.detailModal = null; this.detailSearch = ''; }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closeDetail();
  }

  private now(): string {
    const d = new Date(), p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getDate()}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}