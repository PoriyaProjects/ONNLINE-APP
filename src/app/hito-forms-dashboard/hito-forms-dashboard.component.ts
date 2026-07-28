import { Component, OnInit, AfterViewInit, AfterViewChecked, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import html2canvas from 'html2canvas';
/** pptxgenjs@3.8.0 — pinned in package.json; newer releases ship TS 4.1+ type defs (${number}%) that break TS 3.8. */
import PptxGenJS from 'pptxgenjs';
import {
  HitoAnswerScoreRow,
  HitoFormsChartItem,
  HitoFormsDashboardStats,
  HitoFormsDashboardService,
} from './hito-forms-dashboard.service';

interface DetailModal {
  title: string;
  items: string[];
}

interface QuestionsTableCell {
  score: number;   // 0..100 rounded, or -1 when no data
  /**
   * Number of raw answer rows (HitoAnswerScoreRow) aggregated into this cell.
   * Shown in the native browser title tooltip as "N תשובות" — not the chart tooltip.
   * Each row is one scored answer for this question in this department/period.
   */
  count: number;
}

interface QuestionsTableRow {
  question: string;
  cells: QuestionsTableCell[];
}

interface QuestionsTableGroup {
  /** e.g. '2025 Q1' when multiple years/quarters are selected, '' for a single combination. */
  periodLabel: string;
  departments: string[];
  rows: QuestionsTableRow[];
}

@Component({
  selector: 'app-hito-forms-dashboard',
  templateUrl: './hito-forms-dashboard.component.html',
  styleUrls: ['./hito-forms-dashboard.component.css']
})
export class HitoFormsDashboardComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {


  @ViewChild('particleCanvas', { static: false }) particleCanvasRef!: ElementRef<HTMLCanvasElement>;

  private particleCtx!: CanvasRenderingContext2D;
  private particles: Array<{
    x: number; y: number; baseX: number; baseY: number;
    vx: number; vy: number; radius: number; alpha: number;
  }> = [];
  private particleAnimationId = 0;
  private particleMouse = { x: -9999, y: -9999 };
  private readonly PARTICLE_COUNT = 160;
  private readonly LINK_DISTANCE = 110;
  private readonly REPEL_RADIUS = 90;
  private readonly REPEL_STRENGTH = 3.2;
  private readonly RETURN_EASE = 0.02;
  private readonly DRIFT_SPEED = 0.15;
  private particleResizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private particleResizeBound = () => this.handleParticleResize();


  viewMode: 'forms' | 'questions' = 'forms';
  resultsDisplayMode: 'graph' | 'table' = 'graph';
  filterPanelOpen = false;
  activeFilterSection: 'primary' | 'period' | 'department' = 'primary';

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

  /* ── Questions mode ── */
  questionsLoading = false;
  questionsError: string | null = null;
  formsLoading = false;
  formsError: string | null = null;
  answerScoreForms: string[] = [];
  allQuestionTexts: string[] = [];
  selectedQuestionTexts: string[] = [];
  questionSearch = '';
  questionFormSearch = '';
  questionRows: HitoAnswerScoreRow[] = [];
  questionForms: string[] = [];
  selectedQuestionForms: string[] = [];
  questionDepartments: string[] = [];
  selectedQuestionDepartments: string[] = [];
  questionStats = {
    numQuestions: 0,
    numForms: 0,
    numDepartments: 0,
    avgScore: 0
  };
  periodMode: 'quarter' | 'semi' = 'quarter'; // Toggle between quarter and semi

  /** Questions-mode results table: department columns × question rows, one group per year/quarter combo. */
  questionsTableGroups: QuestionsTableGroup[] = [];

  get filteredQuestionTexts(): string[] {
    const s = (this.questionSearch || '').trim().toLowerCase();
    if (!s) return this.allQuestionTexts;
    return this.allQuestionTexts.filter(q => (q || '').toLowerCase().includes(s));
  }

  get filteredQuestionForms(): string[] {
    const s = (this.questionFormSearch || '').trim().toLowerCase();
    if (!s) return this.answerScoreForms;
    return this.answerScoreForms.filter(f => (f || '').toLowerCase().includes(s));
  }

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
    { role: 'tooltip', type: 'string', p: { html: true } },
    { role: 'annotation', type: 'string' },
    { role: 'style', type: 'string' }
  ];
  chartRows: any[][] = [];
  chartType = 'ColumnChart';
  chartOptions: Record<string, unknown> = {};
  chartWidth = 900;
  chartHeight = 390;

  /** When grouped: series labels (e.g. ['2025','2026'] or ['Q1','Q2']) and count. */
  chartSeriesLabels: string[] = [];
  get isGroupedChart(): boolean { return this.chartSeriesLabels.length > 1; }

  /** Legend chips for chart overlay (series colors or selected filters). */
  get chartLegendItems(): { label: string; color: string | null; isMode?: boolean }[] {
    const items: { label: string; color: string | null; isMode?: boolean }[] = [];

    if (this.viewMode === 'questions' && this.periodMode === 'semi') {
      items.push({ label: 'חציון', color: null, isMode: true });
    }

    if (this.chartSeriesLabels.length > 0) {
      return [
        ...items,
        ...this.chartSeriesLabels.map((label, i) => ({
          label,
          color: this.getSeriesColor(i)
        }))
      ];
    }

    this.selectedYears.forEach(y => items.push({ label: y, color: null }));
    this.selectedQuarters.forEach(q => items.push({ label: this.formatPeriodLegendLabel(q), color: null }));
    return items;
  }
  /** When true, chart is stacked (used for quarters: one column split into segments). */
  chartIsStacked = false;

  /* ── State ── */
  loading = false;
  loadingOptions = false;
  optionsLoadError: string | null = null;
  error: string | null = null;
  exportingPpt = false;

  readonly dashboardTitle = 'תמונת מצב שנתית שאלונים למחלקה';

  private readonly BAR_CLR = '#667eea';
  private readonly SERIES_COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
  private applyTimeout: ReturnType<typeof setTimeout> | null = null;
  private questionsSnapshot: Record<string, unknown> | null = null;
  private formsSnapshot: Record<string, unknown> | null = null;
  private questionsModeInitialized = false;

  private getCurrentYear(): string {
    return String(new Date().getFullYear());
  }
  private getCurrentQuarter(): string {
    const m = new Date().getMonth() + 1; // 1-12
    if (m <= 3) return 'Q1';
    if (m <= 6) return 'Q2';
    if (m <= 9) return 'Q3';
    return 'Q4';
  }

  /** Select current year and current quarter when options are available. */
  private applyDefaultYearQuarterFilters(): void {
    const cy = this.getCurrentYear();
    this.selectedYears = this.allYears.includes(cy)
      ? [cy]
      : (this.allYears.length > 0 ? [this.allYears[this.allYears.length - 1]] : []);
    const cq = this.getCurrentQuarter();
    this.selectedQuarters = this.allQuarters.includes(cq)
      ? [cq]
      : (this.allQuarters.length > 0 ? [this.allQuarters[0]] : []);
  }

  constructor(private svc: HitoFormsDashboardService, private hostEl: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.recalc();
    this.loadOptions();
  }


  ngAfterViewInit(): void {
    this.initParticleCanvas();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.particleAnimationId);
    window.removeEventListener('resize', this.particleResizeBound);
    if (this.particleResizeTimeout) clearTimeout(this.particleResizeTimeout);
  }

  ngAfterViewChecked(): void {
    // Keeps the questions-table sized so it never needs to scroll, even after
    // Angular re-renders it with new rows/columns.
    this.fitQuestionsTable();
  }

@HostListener('window:resize')
  onResize(): void {
    this.recalc();
    this.fitQuestionsTable();
    this.handleParticleResize();
  }


  @HostListener('window:mousemove', ['$event'])
  onParticleMouseMove(event: MouseEvent): void {
    this.particleMouse.x = event.clientX;
    this.particleMouse.y = event.clientY;
  }

  @HostListener('window:mouseleave')
  onParticleMouseLeave(): void {
    this.particleMouse.x = -9999;
    this.particleMouse.y = -9999;
  }

  /* ── No-scroll table fitting ──
     Shrinks the questions-table font/padding just enough that the whole grid
     (all rows + all department columns) fits inside the fixed-height panel
     with no scrollbar, instead of clipping or scrolling. */
  private lastFitSignature = '';

  private fitQuestionsTable(): void {
    if (this.viewMode !== 'questions' || this.resultsDisplayMode !== 'table') return;
    const host = this.hostEl?.nativeElement;
    if (!host) return;
    const wrap = host.querySelector('.hd-table-scroll') as HTMLElement | null;
    if (!wrap || this.questionsTableGroups.length === 0) return;

    const rowCount = this.questionsTableGroups.reduce((n, g) => n + g.rows.length + 1, 0); // +1 avg row/group
    const colCount = Math.max(...this.questionsTableGroups.map(g => g.departments.length + 2), 1); // +1 question col, +1 avg col
    const signature = `${rowCount}x${colCount}x${wrap.clientWidth}x${wrap.clientHeight}`;
    if (signature === this.lastFitSignature) return;

    // Reset to the comfortable default, then shrink step-by-step (writing the
    // CSS vars straight to the DOM so each step can be measured immediately,
    // without waiting on an Angular change-detection cycle).
    let fontSize = 0.85, padY = 0.5, padX = 0.7;
    wrap.style.setProperty('--qtable-font', fontSize + 'rem');
    wrap.style.setProperty('--qtable-pad-y', padY + 'rem');
    wrap.style.setProperty('--qtable-pad-x', padX + 'rem');

    for (let i = 0; i < 16; i++) {
      const fitsX = wrap.scrollWidth <= wrap.clientWidth + 1;
      const fitsY = wrap.scrollHeight <= wrap.clientHeight + 1;
      if (fitsX && fitsY) break;
      if (fontSize <= 0.55 && padY <= 0.18 && padX <= 0.28) break;
      fontSize = Math.max(fontSize - 0.05, 0.55);
      padY = Math.max(padY - 0.03, 0.18);
      padX = Math.max(padX - 0.04, 0.28);
      wrap.style.setProperty('--qtable-font', fontSize + 'rem');
      wrap.style.setProperty('--qtable-pad-y', padY + 'rem');
      wrap.style.setProperty('--qtable-pad-x', padX + 'rem');
    }
    this.lastFitSignature = signature;
  }

  private recalc(): void {
    const vw = window.innerWidth;
    const chartContainer = this.hostEl?.nativeElement?.querySelector('.hd-main .hd-chart-scroll') as HTMLElement | null
      || this.hostEl?.nativeElement?.querySelector('.hd-chart-scroll') as HTMLElement | null;
    const mainEl = this.hostEl?.nativeElement?.querySelector('.hd-main') as HTMLElement | null;
    const seriesCount = Math.max(this.chartSeriesLabels.length, 1);
    const bars = Math.max(this.chartRows.length, 1);
    this.chartWidth = chartContainer
      ? Math.max(chartContainer.clientWidth - 12, 280)
      : Math.max(vw * 0.93, 280);
    this.chartHeight = chartContainer
      ? Math.max(chartContainer.clientHeight - 8, 180)
      : mainEl
        ? Math.max(mainEl.clientHeight - 48, 180)
        : (this.hostEl?.nativeElement
            ? this.hostEl.nativeElement.querySelector('.hd-chart')?.clientHeight - 90 || (vw < 640 ? 220 : 340)
            : (vw < 640 ? 220 : 340));

    const hasLongCategoryLabels = this.chartRows.some(r => String(r?.[0] ?? '').length > 14);
    const many = bars > 6;
    const shouldSlantLabels = many || hasLongCategoryLabels;
    const seriesOpt: Record<number, { color: string }> = {};
    this.chartSeriesLabels.forEach((_, i) => {
      seriesOpt[i] = { color: this.SERIES_COLORS[i % this.SERIES_COLORS.length] };
    });

    const vMax = this.chartIsStacked ? 100 * seriesCount : 100;
    const hasMultipleSeries = this.isGroupedChart || this.chartIsStacked;
    const topMargin = hasMultipleSeries ? 40 : 28;
    const chartTop = topMargin + (hasMultipleSeries ? 20 : 0);
    const annotationOutside = many || bars > 8;
    const annotationFontSize = many
      ? (bars > 14 ? 9 : bars > 10 ? 10 : 11)
      : (seriesCount > 4 ? 12 : (seriesCount > 2 ? 13 : (hasMultipleSeries ? 14 : 18)));

    this.chartOptions = {
      legend: 'none',
      backgroundColor: 'transparent',
      isStacked: this.chartIsStacked,
      bar: {
        groupWidth: this.chartIsStacked
          ? (bars <= 4 ? '50%' : bars <= 8 ? '62%' : '72%')
          : this.isGroupedChart
            ? (bars <= 4 ? '60%' : bars <= 8 ? '75%' : '85%')
            : (this.viewMode === 'questions'
                ? (bars <= 4 ? '38%' : bars <= 8 ? '50%' : '62%')
                : (bars <= 4 ? '50%' : bars <= 8 ? '62%' : '72%'))
      },
      series: Object.keys(seriesOpt).length > 0 ? seriesOpt : undefined,
      annotations: {
        alwaysOutside: annotationOutside,
        highContrast: false,
        textStyle: {
          fontSize: annotationFontSize,
          fontName: 'Arial',
          bold: true,
          color: annotationOutside ? '#1e293b' : '#FFFFFF',
          auraColor: annotationOutside ? '#ffffff' : 'none',
          opacity: 1
        },
        stem: {
          color: 'transparent',
          length: annotationOutside ? 3 : 0
        }
      },
      hAxis: {
        textStyle: {
          fontSize: many ? 11 : 15,
          fontName: 'Arial',
          color: '#1e293b',
          bold: true
        },
        slantedText: shouldSlantLabels,
        slantedTextAngle: bars > 12 ? 55 : bars > 8 ? 45 : 35,
        maxTextLines: 4,
        maxAlternation: 1,
        showTextEvery: 1
      },
      vAxis: {
        minValue: 0,
        maxValue: vMax,
        viewWindow: { min: 0, max: vMax },
        gridlines: { color: '#E8EAED', count: 6 },
        minorGridlines: { count: 0 },
        textStyle: { fontSize: 14, fontName: 'Arial', color: 'rgba(0, 0, 0, 1)' },
        baselineColor: '#CFD8DC'
      },
      chartArea: {
        width: '91%',
        height: many ? '48%' : '60%',
        top: annotationOutside ? chartTop + 12 : chartTop,
        right: 10,
        bottom: shouldSlantLabels ? 155 : 100
      },
      animation: { startup: true, duration: 500, easing: 'out' },
      tooltip: {
        textStyle: { fontName: 'Arial', fontSize: 16 },
        showColorCode: false,
        isHtml: true,
        trigger: 'both'
      },
      enableInteractivity: true,
      focusTarget: 'datum'
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
        if (this.selectedYears.length === 0 && this.allYears.length > 0) {
          this.applyDefaultYearQuarterFilters();
        } else if (this.selectedQuarters.length === 0 && this.allQuarters.length > 0) {
          const cq = this.getCurrentQuarter();
          this.selectedQuarters = this.allQuarters.includes(cq) ? [cq] : [this.allQuarters[0]];
        }
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
    if (this.viewMode === 'questions') {
      // In questions mode, rebuild chart when filters change
      if (this.questionRows.length > 0) {
        this.buildQuestionChartFromRows();
        this.buildQuestionsTable();
      }
      return;
    }
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

  /** When nothing selected, use current year (default). */
  private getEffectiveYears(): string[] {
    const selected = [...new Set(this.selectedYears)].filter(y => this.allYears.includes(y));
    if (selected.length > 0) return selected;
    const current = this.getCurrentYear();
    if (this.allYears.includes(current)) return [current];
    return this.allYears.length > 0 ? [this.allYears[this.allYears.length - 1]] : [];
  }

  /**
   * Selected quarters, or all quarters when none selected (= whole year).
   * Empty UI selection must send every quarter — backend treats blank as Q1 only.
   */
  private getEffectiveQuarters(): string[] {
    const allowed = this.viewMode === 'questions' ? this.periodOptions : this.allQuarters;
    if (this.selectedQuarters.length === 0) return [...allowed];
    return [...new Set(this.selectedQuarters)].filter(q => allowed.includes(q));
  }

  /** True only when the user explicitly picked quarter(s); false = whole year (all quarters). */
  private hasExplicitQuarterSelection(): boolean {
    return this.selectedQuarters.length > 0;
  }

  /* ── Apply ── */
  applyFilters(): void {
    if (this.viewMode === 'questions') {
      this.buildQuestionChartFromRows();
      this.buildQuestionsTable();
      return;
    }
    this.loading = true;
    this.error = null;
    const baseParams = {
      formNameFilter: this.selectedForms.join(','),
      departmentFilter: this.selectedDepartments.join(',')
    };
    const years = this.getEffectiveYears();
    const quarters = this.getEffectiveQuarters();
    const multiYear = years.length > 1;
    // Only split/stack by quarter when the user actually selected quarters.
    // No selection → one request with all quarters joined (full year aggregate).
    const multiQuarter = this.hasExplicitQuarterSelection() && quarters.length > 1;
    const combinedYearQuarter = multiYear && multiQuarter;

    if (combinedYearQuarter) {
      this.applyFiltersYearAndQuarter(baseParams, years, quarters);
      return;
    }
    if (multiYear) {
      this.applyFiltersGroupedByYears(baseParams, years);
      return;
    }
    if (multiQuarter) {
      this.applyFiltersGroupedByQuarters(baseParams, quarters, years);
      return;
    }

    const p = {
      year: years.join(','),
      quarter: quarters.join(','),
      ...baseParams
    };
    this.chartIsStacked = false;
    forkJoin({
      stats: this.svc.getDashboardStats(p),
      chart: this.svc.getChartData(p)
    }).subscribe({
      next: ({ stats, chart }) => {
        this.stats = stats ?? null;
        this.chartData = chart || [];
        this.chartSeriesLabels = [];
        this.lastUpdateDate = this.now();
        this.chartRows = this.chartData.map(it => {
          const v = Number(it.Value) || 0;
          const rounded = this.roundPercent(v);
          const subtitle = this.buildFilterSubtitle(years, quarters);
          const tooltip = v > 0 ? this.buildTooltipHtml(String(it.Label || ''), rounded, subtitle) : '';
          const ann = v > 0 ? rounded + '%' : '';
          return [it.Label || '', v, tooltip, ann, this.BAR_CLR];
        });
        this.recalc();
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      },
      error: () => { this.error = 'שגיאה בטעינת נתונים'; this.loading = false; }
    });
  }

  setViewMode(mode: 'forms' | 'questions'): void {
    if (mode === this.viewMode) return;

    if (this.viewMode === 'questions') {
      this.questionsSnapshot = this.captureQuestionsSnapshot();
    } else {
      this.formsSnapshot = this.captureFormsSnapshot();
    }

    this.viewMode = mode;
    this.detailModal = null;
    this.detailSearch = '';
    this.filterPanelOpen = false;
    this.lastFitSignature = '';

    if (mode === 'questions') {
      if (this.questionsSnapshot) {
        this.restoreQuestionsSnapshot(this.questionsSnapshot);
      } else {
        this.initQuestionsMode();
      }
    } else if (this.formsSnapshot) {
      this.restoreFormsSnapshot(this.formsSnapshot);
    } else {
      this.applyFilters();
    }

    setTimeout(() => {
      this.recalc();
      this.fitQuestionsTable();
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }


  private initParticleCanvas(): void {
    const canvas = this.particleCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.particleCtx = ctx;

    this.resizeParticleCanvas(canvas);
    this.createParticles();

    window.addEventListener('resize', this.particleResizeBound);
    this.animateParticles();
  }

  private resizeParticleCanvas(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    this.particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private createParticles(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = w < 600 ? Math.round(this.PARTICLE_COUNT * 0.5) : this.PARTICLE_COUNT;

    this.particles = Array.from({ length: count }, () => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        x, y,
        baseX: x, baseY: y,
        vx: (Math.random() - 0.5) * this.DRIFT_SPEED,
        vy: (Math.random() - 0.5) * this.DRIFT_SPEED,
        radius: Math.random() * 1.6 + 0.8,
        alpha: Math.random() * 0.5 + 0.4
      };
    });
  }

  private handleParticleResize(): void {
    const canvas = this.particleCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.particleResizeTimeout) clearTimeout(this.particleResizeTimeout);
    this.particleResizeTimeout = setTimeout(() => {
      this.resizeParticleCanvas(canvas);
      this.createParticles();
    }, 200);
  }

  private animateParticles = (): void => {
    if (!this.particleCtx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.particleCtx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      p.baseX += p.vx;
      p.baseY += p.vy;
      if (p.baseX < 0) p.baseX = w;
      if (p.baseX > w) p.baseX = 0;
      if (p.baseY < 0) p.baseY = h;
      if (p.baseY > h) p.baseY = 0;

      const dx = p.x - this.particleMouse.x;
      const dy = p.y - this.particleMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.REPEL_RADIUS) {
        const force = (this.REPEL_RADIUS - dist) / this.REPEL_RADIUS;
        const angle = Math.atan2(dy, dx);
        p.x += Math.cos(angle) * force * this.REPEL_STRENGTH;
        p.y += Math.sin(angle) * force * this.REPEL_STRENGTH;
      }

      p.x += (p.baseX - p.x) * this.RETURN_EASE;
      p.y += (p.baseY - p.y) * this.RETURN_EASE;

      this.particleCtx.beginPath();
      this.particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.particleCtx.fillStyle = `rgba(99, 179, 237, ${p.alpha})`;
      this.particleCtx.shadowBlur = 6;
      this.particleCtx.shadowColor = 'rgba(99, 179, 237, 0.8)';
      this.particleCtx.fill();
    }
    this.particleCtx.shadowBlur = 0;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.LINK_DISTANCE) {
          const opacity = (1 - dist / this.LINK_DISTANCE) * 0.15;
          this.particleCtx.beginPath();
          this.particleCtx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
          this.particleCtx.lineWidth = 0.6;
          this.particleCtx.moveTo(a.x, a.y);
          this.particleCtx.lineTo(b.x, b.y);
          this.particleCtx.stroke();
        }
      }
    }

    this.particleAnimationId = requestAnimationFrame(this.animateParticles);
  };
  
  setResultsDisplayMode(mode: 'graph' | 'table'): void {
    if (this.resultsDisplayMode === mode) return;
    this.resultsDisplayMode = mode;
    this.lastFitSignature = '';
    setTimeout(() => {
      this.recalc();
      this.fitQuestionsTable();
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }

  toggleFilterPanel(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  closeFilterPanel(): void {
    this.filterPanelOpen = false;
  }

  setFilterSection(section: 'primary' | 'period' | 'department'): void {
    this.activeFilterSection = section;
  }

  get hasResults(): boolean {
    if (this.viewMode === 'forms') {
      return this.chartRows.length > 0;
    }
    return this.questionRows.length > 0;
  }

  get showDisplayToggle(): boolean {
    return this.hasResults;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.viewMode === 'forms') {
      if (this.selectedForms.length > 0) count++;
      if (this.selectedDepartments.length > 0) count++;
    } else {
      if (this.selectedQuestionTexts.length > 0) count++;
      if (this.selectedQuestionForms.length > 0) count++;
      if (this.questionsDataLoaded && this.selectedQuestionDepartments.length < this.questionDepartments.length) count++;
    }
    if (this.selectedYears.length > 0 && this.selectedYears.length < this.allYears.length) count++;
    if (this.selectedQuarters.length > 0) count++;
    return count;
  }

  get formsTableRows(): { department: string; series: string; score: number }[] {
    const rows: { department: string; series: string; score: number }[] = [];
    if (!this.chartRows.length) return rows;

    const seriesLabels = this.chartSeriesLabels.length
      ? this.chartSeriesLabels
      : ['ציון'];

    this.chartRows.forEach(row => {
      const dept = String(row[0] || '');
      if (this.isGroupedChart || this.chartIsStacked || seriesLabels.length > 1) {
        let col = 1;
        seriesLabels.forEach(lbl => {
          rows.push({ department: dept, series: lbl, score: Number(row[col]) || 0 });
          col += 3;
        });
      } else {
        rows.push({ department: dept, series: seriesLabels[0], score: Number(row[1]) || 0 });
      }
    });
    return rows;
  }

private initQuestionsMode(): void {
  this.error = null;
  // Do not keep the forms chart when entering questions — show the "בחר..." empty state.
  this.chartRows = [];
  this.chartData = [];
  this.chartSeriesLabels = [];
  this.chartIsStacked = false;
  this.resultsDisplayMode = 'graph';
  if (!this.questionsModeInitialized) {
    if (this.answerScoreForms.length === 0) {
      this.loadAnswerScoreForms();
    }
    // לא טוענים שאלות אוטומטית בטעינה — רק אחרי שנבחר טופס (ראה loadAnswerScoreQuestions)
    this.questionsModeInitialized = true;
  }
}

  private captureQuestionsSnapshot(): Record<string, unknown> {
    return {
      selectedQuestionTexts: [...this.selectedQuestionTexts],
      selectedQuestionForms: [...this.selectedQuestionForms],
      questionSearch: this.questionSearch,
      questionFormSearch: this.questionFormSearch,
      questionRows: [...this.questionRows],
      questionForms: [...this.questionForms],
      questionDepartments: [...this.questionDepartments],
      selectedQuestionDepartments: [...this.selectedQuestionDepartments],
      questionsTableGroups: this.questionsTableGroups,
      questionStats: { ...this.questionStats },
      chartRows: this.chartRows,
      chartColumns: this.chartColumns,
      chartType: this.chartType,
      chartOptions: { ...this.chartOptions },
      chartSeriesLabels: [...this.chartSeriesLabels],
      chartIsStacked: this.chartIsStacked,
      chartData: [...this.chartData],
      lastUpdateDate: this.lastUpdateDate,
      error: this.error,
      resultsDisplayMode: this.resultsDisplayMode,
      periodMode: this.periodMode,
      answerScoreForms: [...this.answerScoreForms],
      allQuestionTexts: [...this.allQuestionTexts],
      loading: this.loading
    };
  }

  private restoreQuestionsSnapshot(snapshot: Record<string, unknown>): void {
    this.selectedQuestionTexts = (snapshot.selectedQuestionTexts as string[]) || [];
    this.selectedQuestionForms = (snapshot.selectedQuestionForms as string[]) || [];
    this.questionSearch = (snapshot.questionSearch as string) || '';
    this.questionFormSearch = (snapshot.questionFormSearch as string) || '';
    this.questionRows = (snapshot.questionRows as HitoAnswerScoreRow[]) || [];
    this.questionForms = (snapshot.questionForms as string[]) || [];
    this.questionDepartments = (snapshot.questionDepartments as string[]) || [];
    this.selectedQuestionDepartments = (snapshot.selectedQuestionDepartments as string[]) || [];
    this.questionsTableGroups = (snapshot.questionsTableGroups as QuestionsTableGroup[]) || [];
    this.questionStats = (snapshot.questionStats as {
      numQuestions: number;
      numForms: number;
      numDepartments: number;
      avgScore: number;
    }) || this.questionStats;
    this.chartRows = (snapshot.chartRows as any[][]) || [];
    this.chartColumns = (snapshot.chartColumns as any[]) || this.chartColumns;
    this.chartType = (snapshot.chartType as string) || this.chartType;
    this.chartOptions = (snapshot.chartOptions as Record<string, unknown>) || this.chartOptions;
    this.chartSeriesLabels = (snapshot.chartSeriesLabels as string[]) || [];
    this.chartIsStacked = !!snapshot.chartIsStacked;
    this.chartData = (snapshot.chartData as HitoFormsChartItem[]) || [];
    this.lastUpdateDate = (snapshot.lastUpdateDate as string) || '';
    this.error = (snapshot.error as string | null) || null;
    this.resultsDisplayMode = (snapshot.resultsDisplayMode as 'graph' | 'table') || 'graph';
    this.periodMode = (snapshot.periodMode as 'quarter' | 'semi') || this.periodMode;
    this.answerScoreForms = (snapshot.answerScoreForms as string[]) || this.answerScoreForms;
    this.allQuestionTexts = (snapshot.allQuestionTexts as string[]) || this.allQuestionTexts;
    this.loading = !!snapshot.loading;
    this.questionsModeInitialized = true;
  }

  private captureFormsSnapshot(): Record<string, unknown> {
    return {
      selectedForms: [...this.selectedForms],
      selectedDepartments: [...this.selectedDepartments],
      formSearch: this.formSearch,
      departmentSearch: this.departmentSearch,
      stats: this.stats,
      chartRows: this.chartRows,
      chartColumns: this.chartColumns,
      chartType: this.chartType,
      chartOptions: { ...this.chartOptions },
      chartSeriesLabels: [...this.chartSeriesLabels],
      chartIsStacked: this.chartIsStacked,
      chartData: [...this.chartData],
      lastUpdateDate: this.lastUpdateDate,
      error: this.error,
      resultsDisplayMode: this.resultsDisplayMode,
      loading: this.loading
    };
  }

  private restoreFormsSnapshot(snapshot: Record<string, unknown>): void {
    this.selectedForms = (snapshot.selectedForms as string[]) || [];
    this.selectedDepartments = (snapshot.selectedDepartments as string[]) || [];
    this.formSearch = (snapshot.formSearch as string) || '';
    this.departmentSearch = (snapshot.departmentSearch as string) || '';
    this.stats = (snapshot.stats as HitoFormsDashboardStats | null) ?? null;
    this.chartRows = (snapshot.chartRows as any[][]) || [];
    this.chartColumns = (snapshot.chartColumns as any[]) || this.chartColumns;
    this.chartType = (snapshot.chartType as string) || this.chartType;
    this.chartOptions = (snapshot.chartOptions as Record<string, unknown>) || this.chartOptions;
    this.chartSeriesLabels = (snapshot.chartSeriesLabels as string[]) || [];
    this.chartIsStacked = !!snapshot.chartIsStacked;
    this.chartData = (snapshot.chartData as HitoFormsChartItem[]) || [];
    this.lastUpdateDate = (snapshot.lastUpdateDate as string) || '';
    this.error = (snapshot.error as string | null) || null;
    this.resultsDisplayMode = (snapshot.resultsDisplayMode as 'graph' | 'table') || 'graph';
    this.loading = !!snapshot.loading;
  }

  private loadAnswerScoreForms(): void {
    this.formsLoading = true;
    this.formsError = null;
    this.svc.getHitoAnswerScoreForms().subscribe({
      next: (forms) => {
        this.answerScoreForms = forms || [];
        this.formsLoading = false;
      },
      error: () => {
        this.formsLoading = false;
        this.formsError = 'שגיאה בטעינת טפסים';
      }
    });
  }

private loadAnswerScoreQuestions(): void {
  // בלי טופס נבחר — לא קוראים ל-API, פשוט מנקים את רשימת השאלות.
  if (this.selectedQuestionForms.length === 0) {
    this.allQuestionTexts = [];
    this.selectedQuestionTexts = [];
    this.questionsLoading = false;
    this.questionsError = null;
    return;
  }

  this.questionsLoading = true;
  this.questionsError = null;
  const formNames = this.selectedQuestionForms.join(',');
  this.svc.getHitoAnswerScoreQuestions(formNames).subscribe({
    next: (questions) => {
      this.allQuestionTexts = questions || [];
      this.selectedQuestionTexts = this.selectedQuestionTexts.filter(
        q => this.allQuestionTexts.includes(q)
      );
      this.questionsLoading = false;
    },
    error: () => {
      this.questionsLoading = false;
      this.questionsError = 'שגיאה בטעינת שאלות';
    }
  });
}

  private reloadQuestionsForSelectedForms(): void {
    this.loadAnswerScoreQuestions();
  }

  toggleQuestionText(val: string): void {
    const trimmed = (val || '').trim();
    const idx = this.selectedQuestionTexts.indexOf(trimmed);
    if (idx === -1) {
      this.selectedQuestionTexts.push(trimmed);
    } else {
      this.selectedQuestionTexts.splice(idx, 1);
    }
    // Don't auto-fetch, wait for user to click Load button
  }

  isQuestionTextSelected(val: string): boolean {
    return this.selectedQuestionTexts.includes((val || '').trim());
  }

  toggleQuestionForm(val: string): void {
    const trimmed = (val || '').trim();
    const idx = this.selectedQuestionForms.indexOf(trimmed);
    if (idx === -1) {
      this.selectedQuestionForms.push(trimmed);
    } else {
      this.selectedQuestionForms.splice(idx, 1);
    }
    this.reloadQuestionsForSelectedForms();
    if (this.questionRows.length > 0) {
      this.buildQuestionChartFromRows();
      this.buildQuestionsTable();
    }
  }

  isQuestionFormSelected(val: string): boolean {
    return this.selectedQuestionForms.includes((val || '').trim());
  }

  selectAllQuestionForms(): void {
    const visible = this.filteredQuestionForms;
    visible.forEach(f => {
      if (!this.selectedQuestionForms.includes(f)) {
        this.selectedQuestionForms.push(f);
      }
    });
    this.reloadQuestionsForSelectedForms();
    if (this.questionRows.length > 0) {
      this.buildQuestionChartFromRows();
      this.buildQuestionsTable();
    }
  }

  clearQuestionForms(): void {
    this.selectedQuestionForms = [];
    this.reloadQuestionsForSelectedForms();
    if (this.questionRows.length > 0) {
      this.buildQuestionChartFromRows();
      this.buildQuestionsTable();
    }
  }

  loadQuestionsData(): void {
    if (this.selectedQuestionTexts.length === 0 && this.selectedQuestionForms.length === 0) {
      this.error = 'אנא בחר לפחות שאלה אחת או טופס אחד';
      return;
    }
    this.questionDepartments = [];
    this.selectedQuestionDepartments = [];
    this.questionRows = [];
    this.questionForms = [];
    this.questionsTableGroups = [];
    this.fetchRowsForSelectedQuestions();
  }

  clearQuestions(): void {
    this.selectedQuestionTexts = [];
    this.selectedQuestionForms = [];
    this.questionDepartments = [];
    this.selectedQuestionDepartments = [];
    this.questionRows = [];
    this.questionForms = [];
    this.chartRows = [];
    this.questionsTableGroups = [];
    this.error = null;
    this.questionStats = { numQuestions: 0, numForms: 0, numDepartments: 0, avgScore: 0 };
    this.reloadQuestionsForSelectedForms();
  }

  private fetchRowsForSelectedQuestions(): void {
    const hasQuestions = this.selectedQuestionTexts.length > 0;
    const hasForms = this.selectedQuestionForms.length > 0;
    if (!hasQuestions && !hasForms) {
      this.chartRows = [];
      this.questionsTableGroups = [];
      this.error = null;
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = null;
    this.svc.getHitoAnswerScoreRowsByQuestions({
      itemTexts: hasQuestions ? this.selectedQuestionTexts.join(',') : '',
      formNames: hasForms ? this.selectedQuestionForms.join(',') : ''
    }).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.questionRows = data;
        this.questionForms = Array.from(
          new Set(data.map(r => this.getRowFormName(r)).filter(v => v !== ''))
        ).sort((a, b) => a.localeCompare(b, 'he'));
        this.questionDepartments = Array.from(
          new Set(data.map(r => this.getRowDepartment(r)).filter(v => v !== ''))
        ).sort((a, b) => a.localeCompare(b, 'he'));
        this.selectedQuestionDepartments = [...this.questionDepartments];
        this.buildQuestionChartFromRows();
        this.buildQuestionsTable();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'שגיאה בטעינת נתונים';
      }
    });
  }

  private buildQuestionChartFromRows(): void {
    const years = this.getEffectiveYears();
    const selectedFormsSet = new Set(this.selectedQuestionForms);
    const selectedDeptsSet = new Set(this.selectedQuestionDepartments);
    const selectedPeriodKeys = this.getSelectedPeriodKeys();

    // If multiple years, show grouped columns
    if (years.length > 1) {
      // Multi-year + multi-period: split by both year and quarter/semi (e.g. 2025-Q1, 2025-Q2, 2024-Q1, 2024-Q2)
      if (selectedPeriodKeys.length > 1) {
        const selectedPeriodSet = new Set(selectedPeriodKeys);
        const deptToSeriesData = new Map<string, Map<string, { sum: number; count: number }>>();
        const seriesKeys: string[] = [];
        years.forEach(y => {
          selectedPeriodKeys.forEach(p => {
            seriesKeys.push(`${y}|${p}`);
          });
        });

        (this.questionRows || []).forEach(r => {
          const rowForm = this.getRowFormName(r);
          const rowDept = this.getRowDepartment(r) || 'ללא מחלקה';
          const rowYear = String(this.getRowYear(r));
          const rowPeriod = this.getRowPeriodKey(r);

          const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
          const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
          const yearOk = years.includes(rowYear);
          const periodOk = selectedPeriodSet.has(rowPeriod);

          if (!yearOk || !formOk || !deptOk || !periodOk) return;

          if (!deptToSeriesData.has(rowDept)) {
            deptToSeriesData.set(rowDept, new Map());
          }
          const seriesData = deptToSeriesData.get(rowDept)!;
          const key = `${rowYear}|${rowPeriod}`;
          if (!seriesData.has(key)) {
            seriesData.set(key, { sum: 0, count: 0 });
          }

          const score = this.getRowScore(r);
          if (!Number.isNaN(score)) {
            const agg = seriesData.get(key)!;
            agg.sum += score;
            agg.count += 1;
          }
        });

        const depts = Array.from(deptToSeriesData.keys()).sort((a, b) => a.localeCompare(b, 'he'));
        const seriesLabels = seriesKeys.map(key => {
          const [y, p] = key.split('|');
          return this.periodMode === 'quarter' ? `${y} Q${p}` : `${y} H${p}`;
        });

        this.chartIsStacked = false;
        this.chartSeriesLabels = seriesLabels;
        this.chartType = 'ColumnChart';

        this.chartColumns = ['מחלקה'];
        seriesLabels.forEach(lbl => {
          this.chartColumns.push(lbl);
          this.chartColumns.push(this.tooltipColumn());
          this.chartColumns.push({ role: 'annotation', type: 'string' });
        });

        this.chartRows = depts.map(dept => {
          const row: any[] = [dept];
          const seriesData = deptToSeriesData.get(dept)!;
          seriesKeys.forEach((key, i) => {
            const agg = seriesData.get(key);
            let avg = 0;
            let count = 0;
            if (agg && agg.count > 0) {
              avg = agg.sum / agg.count;
              count = agg.count;
              if (avg <= 1) avg *= 100;
            }
            const rounded = this.roundPercent(avg);
            const lbl = seriesLabels[i];
            const tooltip = avg > 0 ? this.buildTooltipHtml(dept, rounded, `${lbl} • ${count} שאלות`) : '';
            const ann = avg > 0 ? `${rounded}%\n(${count})` : '';
            row.push(avg, tooltip, ann);
          });
          return row;
        });

        this.chartData = depts.map(Label => ({ Label, Value: 0 }));
        this.updateQuestionStats(deptToSeriesData);
        this.lastUpdateDate = this.now();
        this.recalc();
        return;
      }

      const deptToYearData = new Map<string, Map<string, { sum: number; count: number }>>();

      (this.questionRows || []).forEach(r => {
        const rowForm = this.getRowFormName(r);
        const rowDept = this.getRowDepartment(r) || 'ללא מחלקה';
        const rowYear = String(this.getRowYear(r));

        const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
        const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
        const yearOk = years.includes(rowYear);
        const periodOk = this.matchesQuestionsPeriodFilter(r);

        if (!yearOk || !formOk || !deptOk || !periodOk) return;

        if (!deptToYearData.has(rowDept)) {
          deptToYearData.set(rowDept, new Map());
        }
        const yearData = deptToYearData.get(rowDept)!;
        if (!yearData.has(rowYear)) {
          yearData.set(rowYear, { sum: 0, count: 0 });
        }

        const score = this.getRowScore(r);
        if (!Number.isNaN(score)) {
          const agg = yearData.get(rowYear)!;
          agg.sum += score;
          agg.count += 1;
        }
      });

      const depts = Array.from(deptToYearData.keys()).sort((a, b) => a.localeCompare(b, 'he'));
      this.chartIsStacked = false;
      this.chartSeriesLabels = years;
      this.chartType = 'ColumnChart';

      this.chartColumns = ['מחלקה'];
      years.forEach(y => {
        this.chartColumns.push(y);
        this.chartColumns.push(this.tooltipColumn());
        this.chartColumns.push({ role: 'annotation', type: 'string' });
      });

      this.chartRows = depts.map(dept => {
        const row: any[] = [dept];
        const yearData = deptToYearData.get(dept)!;
        years.forEach(year => {
          const agg = yearData.get(year);
          let avg = 0;
          let count = 0;
          if (agg && agg.count > 0) {
            avg = agg.sum / agg.count;
            /*
             * count = number of matching HitoAnswerScoreRow records summed into this bar.
             * Shown in the Google Chart hover tooltip subtitle as "N שאלות" (e.g. "2 Questions")
             * and in the bar annotation as (N). Each record is one scored answer row after filters.
             */
            count = agg.count;
            if (avg <= 1) avg *= 100;
          }
          const rounded = this.roundPercent(avg);
          const tooltip = avg > 0 ? this.buildTooltipHtml(dept, rounded, `${count} שאלות`) : '';
          const ann = avg > 0 ? `${rounded}%\n(${count})` : '';
          row.push(avg, tooltip, ann);
        });
        return row;
      });

      this.chartData = depts.map(Label => ({ Label, Value: 0 }));
      this.updateQuestionStats(deptToYearData);
      this.lastUpdateDate = this.now();
      this.recalc();
      return;
    }

    // Single year + multiple periods (quarter/semi): split into separate columns per period
    if (years.length === 1 && selectedPeriodKeys.length > 1) {
      const selectedPeriodSet = new Set(selectedPeriodKeys);
      const deptToPeriodData = new Map<string, Map<string, { sum: number; count: number }>>();

      (this.questionRows || []).forEach(r => {
        const rowForm = this.getRowFormName(r);
        const rowDept = this.getRowDepartment(r) || 'ללא מחלקה';
        const rowYear = String(this.getRowYear(r));
        const rowPeriod = this.getRowPeriodKey(r);

        const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
        const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
        const yearOk = rowYear === years[0];
        const periodOk = selectedPeriodSet.has(rowPeriod);

        if (!yearOk || !formOk || !deptOk || !periodOk) return;

        if (!deptToPeriodData.has(rowDept)) {
          deptToPeriodData.set(rowDept, new Map());
        }
        const periodData = deptToPeriodData.get(rowDept)!;
        if (!periodData.has(rowPeriod)) {
          periodData.set(rowPeriod, { sum: 0, count: 0 });
        }

        const score = this.getRowScore(r);
        if (!Number.isNaN(score)) {
          const agg = periodData.get(rowPeriod)!;
          agg.sum += score;
          agg.count += 1;
        }
      });

      const depts = Array.from(deptToPeriodData.keys()).sort((a, b) => a.localeCompare(b, 'he'));
      const periodLabels = [...selectedPeriodKeys].sort((a, b) => Number(a) - Number(b));
      this.chartIsStacked = false;
      this.chartSeriesLabels = periodLabels.map(p => this.periodMode === 'quarter' ? `Q${p}` : `H${p}`);
      this.chartType = 'ColumnChart';

      this.chartColumns = ['מחלקה'];
      periodLabels.forEach(p => {
        this.chartColumns.push(this.periodMode === 'quarter' ? `Q${p}` : `H${p}`);
        this.chartColumns.push(this.tooltipColumn());
        this.chartColumns.push({ role: 'annotation', type: 'string' });
      });

      this.chartRows = depts.map(dept => {
        const row: any[] = [dept];
        const periodData = deptToPeriodData.get(dept)!;
        periodLabels.forEach(p => {
          const agg = periodData.get(p);
          let avg = 0;
          let count = 0;
          if (agg && agg.count > 0) {
            avg = agg.sum / agg.count;
            /*
             * count = number of matching HitoAnswerScoreRow records summed into this bar.
             * Shown in the Google Chart hover tooltip subtitle as "N שאלות" (e.g. "2 Questions")
             * and in the bar annotation as (N). Each record is one scored answer row after filters.
             */
            count = agg.count;
            if (avg <= 1) avg *= 100;
          }
          const rounded = this.roundPercent(avg);
          const pLabel = this.periodMode === 'quarter' ? `Q${p}` : `H${p}`;
          const tooltip = avg > 0 ? this.buildTooltipHtml(dept, rounded, `${pLabel} • ${count} שאלות`) : '';
          const ann = avg > 0 ? `${rounded}%\n(${count})` : '';
          row.push(avg, tooltip, ann);
        });
        return row;
      });

      this.chartData = depts.map(Label => ({ Label, Value: 0 }));
      this.updateQuestionStats(deptToPeriodData);
      this.lastUpdateDate = this.now();
      this.recalc();
      return;
    }

    // Single year - original logic
    const yearSet = new Set(years);
    const filtered = (this.questionRows || []).filter(r => {
      const rowForm = this.getRowFormName(r);
      const rowDept = this.getRowDepartment(r);
      const rowYear = String(this.getRowYear(r));
      const yearOk = yearSet.size === 0 ? true : yearSet.has(rowYear);
      const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
      const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
      const periodOk = this.matchesQuestionsPeriodFilter(r);
      return yearOk && formOk && deptOk && periodOk;
    });

    const deptToAgg = new Map<string, { sum: number; count: number }>();
    filtered.forEach(r => {
      const dept = this.getRowDepartment(r) || 'ללא מחלקה';
      if (!deptToAgg.has(dept)) deptToAgg.set(dept, { sum: 0, count: 0 });
      const score = this.getRowScore(r);
      if (!Number.isNaN(score)) {
        const agg = deptToAgg.get(dept)!;
        agg.sum += score;
        agg.count += 1;
      }
    });

    const depts = Array.from(deptToAgg.keys()).sort((a, b) => a.localeCompare(b, 'he'));
    this.chartIsStacked = false;
    this.chartSeriesLabels = [];
    this.chartType = 'ColumnChart';
    this.chartColumns = ['מחלקה', 'ציון', this.tooltipColumn(), { role: 'annotation', type: 'string' }];
    this.chartRows = depts.map(d => {
      const agg = deptToAgg.get(d)!;
      let avg = agg.count > 0 ? (agg.sum / agg.count) : 0;
      if (avg <= 1) avg *= 100;
      const count = agg.count;
      const rounded = this.roundPercent(avg);
      /*
       * count = matching answer-score rows for this department (see agg.count above).
       * Passed to buildTooltipHtml subtitle as "N שאלות" — the hover text like "2 Questions".
       */
      const tooltip = avg > 0 ? this.buildTooltipHtml(d, rounded, `${count} שאלות`) : '';
      const ann = avg > 0 ? `${rounded}%\n(${count})` : '';
      return [d, avg, tooltip, ann];
    });
    this.chartData = this.chartRows.map((row: any[]) => ({ Label: String(row[0] || ''), Value: Number(row[1]) || 0 })) as HitoFormsChartItem[];

    this.updateQuestionStats(deptToAgg);

    this.lastUpdateDate = this.now();
    this.recalc();
  }

  /**
   * Builds the questions-mode results TABLE: rows = questions, columns = departments, cell = % score.
   * Respects the same year/quarter filters as the chart — if more than one year and/or quarter (or semester)
   * is selected, the data is split into separate groups (one table per combination), each with its own
   * period label, instead of averaging everything together.
   */
  private buildQuestionsTable(): void {
    const years = this.getEffectiveYears();
    const periodKeys = this.getSelectedPeriodKeys();
    const selectedFormsSet = new Set(this.selectedQuestionForms);
    const selectedDeptsSet = new Set(this.selectedQuestionDepartments);
    const selectedQuestionsSet = new Set(this.selectedQuestionTexts);

    type Combo = { year: string | null; period: string | null; label: string };
    let combos: Combo[];

    if (years.length > 1 && periodKeys.length > 1) {
      combos = [];
      years.forEach(y => periodKeys.forEach(p => {
        const pLabel = this.periodMode === 'quarter' ? `Q${p}` : `H${p}`;
        combos.push({ year: y, period: p, label: `${y} ${pLabel}` });
      }));
    } else if (years.length > 1) {
      combos = years.map(y => ({ year: y, period: null, label: y }));
    } else if (periodKeys.length > 1) {
      combos = periodKeys.map(p => ({
        year: years[0] || null,
        period: p,
        label: this.periodMode === 'quarter' ? `Q${p}` : `H${p}`
      }));
    } else {
      combos = [{ year: years[0] || null, period: periodKeys[0] || null, label: '' }];
    }

    const groups: QuestionsTableGroup[] = combos.map(combo => {
      const rows = (this.questionRows || []).filter(r => {
        const rowForm = this.getRowFormName(r);
        const rowDept = this.getRowDepartment(r) || 'ללא מחלקה';
        const rowYear = String(this.getRowYear(r));
        const rowQuestion = String((r as any)?.itemText ?? '').trim();

        const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
        const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
        const yearOk = combo.year ? rowYear === combo.year : true;
        const periodOk = combo.period
          ? this.getRowPeriodKey(r) === combo.period
          : this.matchesQuestionsPeriodFilter(r);
        const questionOk = selectedQuestionsSet.size === 0 ? true : selectedQuestionsSet.has(rowQuestion);

        return formOk && deptOk && yearOk && periodOk && questionOk;
      });

      const departments = Array.from(
        new Set(rows.map(r => this.getRowDepartment(r) || 'ללא מחלקה'))
      ).sort((a, b) => a.localeCompare(b, 'he'));

      const questionTexts = this.selectedQuestionTexts.length > 0
        ? this.selectedQuestionTexts.filter(q => rows.some(r => String((r as any)?.itemText ?? '').trim() === q))
        : Array.from(new Set(rows.map(r => String((r as any)?.itemText ?? '').trim()).filter(t => t !== '')))
            .sort((a, b) => a.localeCompare(b, 'he'));

      const aggMap = new Map<string, Map<string, { sum: number; count: number }>>(); // question -> department -> agg
      rows.forEach(r => {
        const q = String((r as any)?.itemText ?? '').trim();
        const dept = this.getRowDepartment(r) || 'ללא מחלקה';
        const score = this.getRowScore(r);
        if (Number.isNaN(score)) return;
        if (!aggMap.has(q)) aggMap.set(q, new Map());
        const deptMap = aggMap.get(q)!;
        if (!deptMap.has(dept)) deptMap.set(dept, { sum: 0, count: 0 });
        const agg = deptMap.get(dept)!;
        agg.sum += score;
        agg.count += 1;
      });

      const tableRows: QuestionsTableRow[] = questionTexts.map(q => {
        const deptMap = aggMap.get(q);
        const cells: QuestionsTableCell[] = departments.map(d => {
          const agg = deptMap?.get(d);
          if (!agg || agg.count === 0) return { score: -1, count: 0 };
          let avg = agg.sum / agg.count;
          if (avg <= 1) avg *= 100;
          return { score: this.roundPercent(avg), count: agg.count };
        });
        return { question: q, cells };
      });

      return { periodLabel: combo.label, departments, rows: tableRows };
    });

    this.questionsTableGroups = groups.filter(g => g.departments.length > 0 && g.rows.length > 0);
    this.lastFitSignature = '';
  }

  /** CSS class for a table cell based on its score, for quick visual scanning. */
  cellClass(score: number): string {
    if (score < 0) return 'hd-qcell hd-qcell--empty';
    if (score >= 80) return 'hd-qcell hd-qcell--good';
    if (score >= 60) return 'hd-qcell hd-qcell--mid';
    return 'hd-qcell hd-qcell--low';
  }

  /** Average score for one question row (across department columns). Empty cells are excluded. */
  getRowAverage(cells: QuestionsTableCell[]): number {
    const valid = cells.filter(c => c.score >= 0);
    if (valid.length === 0) return -1;
    return this.roundPercent(valid.reduce((sum, c) => sum + c.score, 0) / valid.length);
  }

  /** Average score for one department column (across all question rows). Empty cells are excluded. */
  getColumnAverage(rows: QuestionsTableRow[], colIndex: number): number {
    const valid = rows
      .map(r => r.cells[colIndex])
      .filter(c => c && c.score >= 0)
      .map(c => c.score);
    if (valid.length === 0) return -1;
    return this.roundPercent(valid.reduce((sum, v) => sum + v, 0) / valid.length);
  }

  /** Grand average for an entire table group (all questions × all departments). */
  getGroupGrandAverage(group: QuestionsTableGroup): number {
    const scores: number[] = [];
    group.rows.forEach(row => {
      row.cells.forEach(c => {
        if (c.score >= 0) scores.push(c.score);
      });
    });
    if (scores.length === 0) return -1;
    return this.roundPercent(scores.reduce((sum, v) => sum + v, 0) / scores.length);
  }

  formatAvgScore(score: number): string {
    return score >= 0 ? score + '%' : '—';
  }

  formatChartScore(v: number): string {
    return v > 0 ? this.roundPercent(v) + '%' : '—';
  }

  private getRowFormName(r: any): string {
    return String((r?.formName_Name ?? r?.FormName_Name ?? r?.formName ?? r?.FormName ?? '')).trim();
  }

  private countDistinctQuestionTextsInRows(): number {
    const texts = new Set(
      (this.questionRows || [])
        .map(r => String(r?.itemText ?? '').trim())
        .filter(t => t !== '')
    );
    return texts.size;
  }

  private getRowDepartment(r: any): string {
    return String((r?.department ?? r?.Department ?? '')).trim();
  }

  private getRowYear(r: any): number {
    const y = Number(r?.DYear ?? r?.dYear ?? r?.Year ?? 0);
    return Number.isNaN(y) ? 0 : y;
  }

  private getRowScore(r: any): number {
    const s = Number(r?.IntScore ?? r?.intScore ?? r?.Score ?? r?.score);
    return Number.isNaN(s) ? NaN : s;
  }

  private getRowMonth(r: any): number {
    const m = Number(r?.DMonth ?? r?.dMonth ?? r?.Month ?? 0);
    return Number.isNaN(m) ? 0 : m;
  }

  private roundPercent(v: number): number {
    return Math.round(v);
  }

  /** Exposed for template score coloring in forms table view. */
  roundPercentPublic(v: number): number {
    return this.roundPercent(v);
  }

  private normalizeQuarterValue(v: string): string {
    const s = String(v || '').trim().toUpperCase();
    if (!s) return '';
    if (s.startsWith('Q')) return s.slice(1);
    return s;
  }

  private getSelectedPeriodKeys(): string[] {
    const normalized = this.selectedQuarters.map(q => this.normalizeQuarterValue(q)).filter(Boolean);
    return Array.from(new Set(normalized));
  }

  private getRowPeriodKey(r: any): string {
    const m = this.getRowMonth(r);
    if (m < 1 || m > 12) return '';
    if (this.periodMode === 'semi') return m <= 6 ? '1' : '2';
    return String(Math.ceil(m / 3));
  }

  private matchesQuestionsPeriodFilter(r: any): boolean {
    if (this.selectedQuarters.length === 0) return true;
    const m = this.getRowMonth(r);
    if (m < 1 || m > 12) return false;
    const selected = new Set(this.selectedQuarters.map(q => this.normalizeQuarterValue(q)));
    if (this.periodMode === 'semi') {
      const semi = m <= 6 ? '1' : '2';
      return selected.has(semi);
    }
    const quarter = String(Math.ceil(m / 3)); // 1..4
    return selected.has(quarter);
  }

  private updateQuestionStats(
    grouped:
      | Map<string, { sum: number; count: number }>
      | Map<string, Map<string, { sum: number; count: number }>>
  ): void {
    let totalScores = 0;
    let totalCount = 0;
    let deptCount = 0;

    if (grouped.size > 0) {
      const firstVal = grouped.values().next().value;
      if (firstVal && firstVal instanceof Map) {
        deptCount = grouped.size;
        (grouped as Map<string, Map<string, { sum: number; count: number }>>).forEach(yearMap => {
          yearMap.forEach(agg => {
            totalScores += agg.sum;
            totalCount += agg.count;
          });
        });
      } else {
        deptCount = grouped.size;
        (grouped as Map<string, { sum: number; count: number }>).forEach(agg => {
          totalScores += agg.sum;
          totalCount += agg.count;
        });
      }
    }

    this.questionStats = {
      numQuestions: this.selectedQuestionTexts.length > 0
        ? this.selectedQuestionTexts.length
        : this.countDistinctQuestionTextsInRows(),
      numForms: this.selectedQuestionForms.length > 0 ? this.selectedQuestionForms.length : this.questionForms.length,
      numDepartments: this.selectedQuestionDepartments.length > 0 ? this.selectedQuestionDepartments.length : deptCount,
      avgScore: totalCount > 0 ? ((totalScores / totalCount) <= 1 ? (totalScores / totalCount) * 100 : (totalScores / totalCount)) : 0
    };
  }

  /** Both multiple years and multiple quarters: grouped columns for each year+quarter combo (e.g. 2023 Q1, 2023 Q2, 2024 Q1, 2024 Q2). */
  private applyFiltersYearAndQuarter(
    baseParams: { formNameFilter: string; departmentFilter: string },
    years: string[],
    quarters: string[]
  ): void {
    const combos: { label: string; year: string; quarter: string }[] = [];
    years.forEach(y => quarters.forEach(q => combos.push({ label: `${y} ${q}`, year: y, quarter: q })));
    const chartRequests = combos.map(({ year, quarter }) =>
      this.svc.getChartData({ year, quarter, ...baseParams })
    );
    forkJoin([
      this.svc.getDashboardStats({
        year: years.join(','),
        quarter: quarters.join(','),
        ...baseParams
      }),
      ...chartRequests
    ]).subscribe({
      next: ([stats, ...charts]) => {
        this.stats = (stats ?? null) as HitoFormsDashboardStats | null;
        this.lastUpdateDate = this.now();
        this.buildGroupedChart(
          combos.map(c => c.label),
          charts as HitoFormsChartItem[][]
        );
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      },
      error: () => { this.error = 'שגיאה בטעינת נתונים'; this.loading = false; }
    });
  }

  private applyFiltersGroupedByYears(baseParams: { formNameFilter: string; departmentFilter: string }, years: string[]): void {
    const quarterStr = this.getEffectiveQuarters().join(',');
    const chartRequests = years.map(y =>
      this.svc.getChartData({
        year: y,
        quarter: quarterStr,
        ...baseParams
      })
    );
    forkJoin([
      this.svc.getDashboardStats({
        year: years.join(','),
        quarter: quarterStr,
        ...baseParams
      }),
      ...chartRequests
    ]).subscribe({
      next: ([stats, ...charts]) => {
        this.stats = (stats ?? null) as HitoFormsDashboardStats | null;
        this.lastUpdateDate = this.now();
        this.buildGroupedChart(years, charts as HitoFormsChartItem[][]);
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      },
      error: () => { this.error = 'שגיאה בטעינת נתונים'; this.loading = false; }
    });
  }

  private applyFiltersGroupedByQuarters(
    baseParams: { formNameFilter: string; departmentFilter: string },
    quarters: string[],
    years: string[]
  ): void {
    const yearStr = years.join(',');
    const chartRequests = quarters.map(q =>
      this.svc.getChartData({
        year: yearStr,
        quarter: q,
        ...baseParams
      })
    );
    forkJoin([
      this.svc.getDashboardStats({
        year: yearStr,
        quarter: quarters.join(','),
        ...baseParams
      }),
      ...chartRequests
    ]).subscribe({
      next: ([stats, ...charts]) => {
        this.stats = (stats ?? null) as HitoFormsDashboardStats | null;
        this.lastUpdateDate = this.now();
        this.buildStackedQuartersChart(quarters, charts as HitoFormsChartItem[][], years);
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      },
      error: () => { this.error = 'שגיאה בטעינת נתונים'; this.loading = false; }
    });
  }

  private buildGroupedChart(seriesLabels: string[], charts: HitoFormsChartItem[][]): void {
    this.chartIsStacked = false;
    const labelToValues = new Map<string, number[]>();
    seriesLabels.forEach((_, seriesIndex) => {
      (charts[seriesIndex] || []).forEach(it => {
        const label = (it.Label || '').trim();
        if (label === '') return;
        if (!labelToValues.has(label)) {
          labelToValues.set(label, new Array(seriesLabels.length).fill(null));
        }
        const arr = labelToValues.get(label)!;
        arr[seriesIndex] = Number(it.Value) ?? 0;
      });
    });
    const departments = Array.from(labelToValues.keys()).sort((a, b) => a.localeCompare(b, 'he'));
    const nonZeroSeriesIndices = seriesLabels
      .map((_, i) => i)
      .filter(i => departments.some(dept => (labelToValues.get(dept)![i] ?? 0) > 0));
    const labelsToShow = nonZeroSeriesIndices.length > 0
      ? nonZeroSeriesIndices.map(i => seriesLabels[i])
      : seriesLabels;

    this.chartData = departments.map(Label => ({ Label, Value: 0 }));
    this.chartSeriesLabels = labelsToShow;

    this.chartColumns = ['מחלקה'];
    labelsToShow.forEach(lbl => {
      this.chartColumns.push(lbl);
      this.chartColumns.push(this.tooltipColumn());
      this.chartColumns.push({ role: 'annotation', type: 'string' });
    });

    this.chartRows = departments.map(dept => {
      const values = labelToValues.get(dept) || [];
      const row: any[] = [dept];
      (nonZeroSeriesIndices.length > 0 ? nonZeroSeriesIndices : seriesLabels.map((_, i) => i)).forEach(idx => {
        const num = values[idx] != null ? values[idx]! : 0;
        const label = labelsToShow[nonZeroSeriesIndices.indexOf(idx)] || '';
        const rounded = this.roundPercent(num);
        const tooltip = num > 0 ? this.buildTooltipHtml(dept, rounded, label) : '';
        const ann = num > 0 ? rounded + '%' : '';
        row.push(num, tooltip, ann);
      });
      return row;
    });
    this.recalc();
  }

  /** One column per department, split into stacked segments (one per quarter). Skip all-zero quarters so 0% don't overlap. */
  private buildStackedQuartersChart(quarters: string[], charts: HitoFormsChartItem[][], years?: string[]): void {
    const effectiveYears = years ?? this.getEffectiveYears();
    this.chartIsStacked = true;
    const labelToValues = new Map<string, number[]>();
    quarters.forEach((_, seriesIndex) => {
      (charts[seriesIndex] || []).forEach(it => {
        const label = (it.Label || '').trim();
        if (label === '') return;
        if (!labelToValues.has(label)) {
          labelToValues.set(label, new Array(quarters.length).fill(null));
        }
        const arr = labelToValues.get(label)!;
        arr[seriesIndex] = Number(it.Value) ?? 0;
      });
    });
    const departments = Array.from(labelToValues.keys()).sort((a, b) => a.localeCompare(b, 'he'));
    const nonZeroSeriesIndices = quarters
      .map((_, i) => i)
      .filter(i => departments.some(dept => (labelToValues.get(dept)![i] ?? 0) > 0));
    const quartersToShow = nonZeroSeriesIndices.length > 0
      ? nonZeroSeriesIndices.map(i => quarters[i])
      : quarters;

    this.chartData = departments.map(Label => ({ Label, Value: 0 }));
    this.chartSeriesLabels = quartersToShow;

    this.chartColumns = ['מחלקה'];
    quartersToShow.forEach(lbl => {
      this.chartColumns.push(lbl);
      this.chartColumns.push(this.tooltipColumn());
      this.chartColumns.push({ role: 'annotation', type: 'string' });
    });

    const indicesToShow = nonZeroSeriesIndices.length > 0 ? nonZeroSeriesIndices : quarters.map((_, i) => i);
    if (quartersToShow.length <= 1) {
      this.chartIsStacked = false;
      this.chartSeriesLabels = quartersToShow.length === 1 ? quartersToShow : [];
      this.chartColumns = ['מחלקה', quartersToShow[0] || 'ציון %', this.tooltipColumn(), { role: 'annotation', type: 'string' }];
      this.chartRows = departments.map(dept => {
        const values = labelToValues.get(dept) || [];
        const idx = indicesToShow[0] ?? 0;
        const num = values[idx] != null ? values[idx]! : 0;
        const rounded = this.roundPercent(num);
        const subtitle = this.buildFilterSubtitle(effectiveYears, quartersToShow.slice(0, 1));
        const tooltip = num > 0 ? this.buildTooltipHtml(dept, rounded, subtitle) : '';
        const ann = num > 0 ? rounded + '%' : '';
        return [dept, num, tooltip, ann];
      });
    } else {
      this.chartRows = departments.map(dept => {
        const values = labelToValues.get(dept) || [];
        const row: any[] = [dept];
        indicesToShow.forEach((idx, i) => {
          const num = values[idx] != null ? values[idx]! : 0;
          const label = quartersToShow[i] || '';
          const rounded = this.roundPercent(num);
          const subtitle = [effectiveYears.join(', '), label].filter(Boolean).join(' • ');
          const tooltip = num > 0 ? this.buildTooltipHtml(dept, rounded, subtitle) : '';
          const ann = num > 0 ? rounded + '%' : '';
          row.push(num, tooltip, ann);
        });
        return row;
      });
    }
    this.recalc();
  }

  resetFilters(): void {
    this.selectedForms = [];
    this.selectedDepartments = [];
    this.formSearch = '';
    this.departmentSearch = '';
    this.applyDefaultYearQuarterFilters();
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return this.selectedForms.length > 0 || this.selectedDepartments.length > 0 ||
           this.selectedYears.length > 0 || this.selectedQuarters.length > 0;
  }

  get questionsDataLoaded(): boolean {
    return this.viewMode === 'questions' && this.questionRows.length > 0;
  }

  retry(): void { this.error = null; this.applyFilters(); }

  refreshData(): void {
    window.location.reload();
  }

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

  /** Opens modal with departments that match current filters (same as chart / stats.NumDepartments). */
  openDepartmentsList(): void {
    const items = (this.chartData || [])
      .map(it => (it.Label || '').trim())
      .filter(name => name !== '');
    this.detailModal = { title: 'רשימת מחלקות (' + items.length + ')', items };
    this.detailSearch = '';
  }

  openQuestionsList(): void {
    this.detailModal = {
      title: `רשימת שאלות (${this.selectedQuestionTexts.length})`,
      items: [...this.selectedQuestionTexts]
    };
    this.detailSearch = '';
  }

  openQuestionFormsList(): void {
    const items = this.selectedQuestionForms.length > 0
      ? [...this.selectedQuestionForms]
      : [...this.questionForms];
    this.detailModal = {
      title: `כמות שאלונים (${items.length})`,
      items
    };
    this.detailSearch = '';
  }

  togglePeriodMode(): void {
    this.periodMode = this.periodMode === 'quarter' ? 'semi' : 'quarter';
    // Clear selections when switching modes
    this.selectedQuarters = [];
  }

  get periodOptions(): string[] {
    if (this.periodMode === 'quarter') {
      return this.allQuarters; // Q1, Q2, Q3, Q4
    } else {
      return ['1', '2']; // Semi: 1 (Jan-Jun), 2 (Jul-Dec)
    }
  }

  get periodLabel(): string {
    return this.periodMode === 'quarter' ? 'רבעון' : 'חציון';
  }

  closeDetail(): void { this.detailModal = null; this.detailSearch = ''; }

  /** Builds a readable summary of active filters for export and display. */
  getFilterSummaryText(): string {
    const parts: string[] = [];
    const years = this.getEffectiveYears();
    const quarters = this.getEffectiveQuarters();

    if (this.viewMode === 'forms') {
      parts.push(this.selectedForms.length > 0
        ? `שאלונים: ${this.selectedForms.join(', ')}`
        : 'שאלונים: הכל');
      parts.push(this.selectedDepartments.length > 0
        ? `מחלקות: ${this.selectedDepartments.join(', ')}`
        : 'מחלקות: הכל');
    } else {
      if (this.selectedQuestionForms.length > 0) {
        parts.push(`טפסים: ${this.selectedQuestionForms.join(', ')}`);
      }
      if (this.selectedQuestionTexts.length > 0) {
        parts.push(`שאלות: ${this.selectedQuestionTexts.length} נבחרו`);
      }
      if (this.selectedQuestionDepartments.length > 0 && this.selectedQuestionDepartments.length < this.questionDepartments.length) {
        parts.push(`מחלקות: ${this.selectedQuestionDepartments.join(', ')}`);
      }
    }

    if (years.length) parts.push(`שנה: ${years.join(', ')}`);
    if (this.hasExplicitQuarterSelection() && quarters.length) {
      const qLabels = quarters.map(q => this.formatPeriodLegendLabel(q));
      parts.push(`${this.periodLabel}: ${qLabels.join(', ')}`);
    } else if (!this.hasExplicitQuarterSelection() && years.length) {
      parts.push('רבעון: כל השנה');
    }
    return parts.join('  •  ');
  }

  /** Exports the current dashboard view (title, filters, stats, chart, table, date, logo) to PowerPoint. */
  async exportToPowerPoint(): Promise<void> {
    if (this.exportingPpt) return;
    this.exportingPpt = true;
    try {
      const pptx = new PptxGenJS();
      pptx.author = 'HITO Dashboard';
      pptx.company = 'Hospital';
      pptx.subject = this.dashboardTitle;
      pptx.layout = 'LAYOUT_16x9';
      pptx.rtlMode = true;

      const logoData = await this.loadLogoBase64();
      const filterSummary = this.getFilterSummaryText();
      const exportDate = this.lastUpdateDate || this.now();

      // ── Slide 1: Title + filters + stats ──
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'F4F7FB' };

      if (logoData) {
        titleSlide.addImage({ data: logoData, x: 0.4, y: 0.3, w: 1.2, h: 0.6 });
      }

      titleSlide.addText(this.dashboardTitle, {
        x: 0.5, y: 1.0, w: 9, h: 0.7,
        fontSize: 28, bold: true, color: '1A202C', align: 'right', rtlMode: true
      });


    let cursorY = 1.65;

  const filterLines = this.buildFilterPptLines();
  const statsLines = this.buildExportStatsLines();
  const statsImg = await this.captureStatsBlockImage(exportDate, filterLines, statsLines);

  if (statsImg) {
    const displayWidthIn = 9;
    const displayHeightIn = (statsImg.height / statsImg.width) * displayWidthIn;
    titleSlide.addImage({
      data: statsImg.data,
      x: 0.5, y: 1.65, w: displayWidthIn, h: displayHeightIn
    });
  }




      // ── Slide 2: Chart image (when available) ──
      const chartCapture = await this.captureChartImage();
      if (chartCapture) {
        const chartSlide = pptx.addSlide();
        chartSlide.addText('תרשים ציונים', {
          x: 0.5, y: 0.25, w: 9, h: 0.45,
          fontSize: 20, bold: true, color: '667EEA', align: 'right', rtlMode: true
        });
        chartSlide.addImage({
          data: chartCapture,
          x: 0.35, y: 0.85, w: 9.3, h: 4.5
        });
      }

      // ── Slide 3+: Questions table with averages ──
      if (this.viewMode === 'questions' && this.questionsTableGroups.length > 0) {
        for (const group of this.questionsTableGroups) {
          const tableSlide = pptx.addSlide();
          const heading = group.periodLabel
            ? `טבלת שאלות — ${group.periodLabel}`
            : 'טבלת שאלות';
          tableSlide.addText(heading, {
            x: 0.5, y: 0.25, w: 9, h: 0.45,
            fontSize: 18, bold: true, color: '667EEA', align: 'right', rtlMode: true
          });

          const tableData = this.buildExportTableData(group);
          if (tableData.length > 0) {
            tableSlide.addTable(tableData, {
              x: 0.3, y: 0.85, w: 9.4,
              fontSize: 9,
              border: { type: 'solid', color: 'DEE2E6', pt: 0.5 },
              align: 'center',
              valign: 'middle',
              autoPage: true,
              autoPageRepeatHeader: true,
              colW: this.buildExportColumnWidths(group)
            });
          }
        }
      } else if (this.viewMode === 'forms' && this.chartRows.length > 0 && !chartCapture) {
        // Fallback: chart data as table when image capture failed
        const dataSlide = pptx.addSlide();
        dataSlide.addText('נתוני תרשים', {
          x: 0.5, y: 0.25, w: 9, h: 0.45,
          fontSize: 18, bold: true, color: '667EEA', align: 'right', rtlMode: true
        });
        const rows: any[] = [
          [{ text: 'מחלקה', options: { bold: true, fill: 'EBF4FF' } },
           { text: 'ציון %', options: { bold: true, fill: 'EBF4FF' } }]
        ];
        this.chartRows.forEach(r => {
          const label = String(r[0] || '');
          const val = typeof r[1] === 'number' ? this.roundPercent(r[1]) + '%' : '—';
          rows.push([label, val]);
        });
        dataSlide.addTable(rows, {
          x: 0.5, y: 1, w: 9, fontSize: 11, align: 'center',
          border: { type: 'solid', color: 'DEE2E6', pt: 0.5 }
        });
      }

      const stamp = new Date().toISOString().slice(0, 10);
      await pptx.writeFile({ fileName: `hito-dashboard-${stamp}.pptx` });
    } catch {
      this.error = 'שגיאה בייצוא ל-PowerPoint';
    } finally {
      this.exportingPpt = false;
    }
  }

/** Label + value as two separate table cells — avoids bidi/RTL rendering bugs entirely. */
private buildLabelValueRow(label: string, value: string | number): any[] {
  return [
    { text: String(value), options: { align: 'left', valign: 'middle' } },
    { text: label, options: { align: 'right', bold: true, rtlMode: true, valign: 'middle' } }
  ];
}


/** Rough estimate of rendered text width in inches, for tight (non-stretched) label/value rows. */
private approxTextWidthIn(text: string, fontSizePt: number): number {
  const avgCharWidthPt = fontSizePt * 0.58; // heuristic factor for Arial-like fonts
  return (String(text).length * avgCharWidthPt) / 72;
}


/** Filter parts as separate {label, value} pairs — used only for PPTX export (avoids bidi issues from one long mixed string). */
private buildFilterPptRows(): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const years = this.getEffectiveYears();
  const quarters = this.getEffectiveQuarters();

  if (this.viewMode === 'forms') {
    rows.push({ label: 'שאלונים', value: this.selectedForms.length > 0 ? this.selectedForms.join(', ') : 'הכל' });
    rows.push({ label: 'מחלקות', value: this.selectedDepartments.length > 0 ? this.selectedDepartments.join(', ') : 'הכל' });
  } else {
    if (this.selectedQuestionForms.length > 0) {
      rows.push({ label: 'טפסים', value: this.selectedQuestionForms.join(', ') });
    }
    if (this.selectedQuestionTexts.length > 0) {
      rows.push({ label: 'שאלות', value: `${this.selectedQuestionTexts.length} נבחרו` });
    }
    if (this.selectedQuestionDepartments.length > 0 && this.selectedQuestionDepartments.length < this.questionDepartments.length) {
      rows.push({ label: 'מחלקות', value: this.selectedQuestionDepartments.join(', ') });
    }
  }

  if (years.length) rows.push({ label: 'שנה', value: years.join(', ') });
  if (this.hasExplicitQuarterSelection() && quarters.length) {
    rows.push({ label: this.periodLabel, value: quarters.map(q => this.formatPeriodLegendLabel(q)).join(', ') });
  } else if (!this.hasExplicitQuarterSelection() && years.length) {
    rows.push({ label: 'רבעון', value: 'כל השנה' });
  }

  return rows;
}




/** Simple "label: value" line — plain string, no hidden control chars, no manual column widths. */
private plainLabelValue(label: string, value: string | number): string {
  return `${label}: ${value}`;
}

private buildExportStatsLines(): string[] {
  const lines: string[] = [];
  if (this.viewMode === 'forms' && this.stats) {
    lines.push(this.plainLabelValue('מספר ממלאים', this.stats.NumWorkers ?? '—'));
    lines.push(this.plainLabelValue('כמות מחלקות', this.stats.NumDepartments));
    lines.push(this.plainLabelValue('כמות שאלונים שמולאו', this.stats.NumQuestions));
    lines.push(this.plainLabelValue('ציון כולל', this.fmtGrade(this.stats.Grade)));
  } else if (this.viewMode === 'questions' && this.questionStats.numQuestions > 0) {
    lines.push(this.plainLabelValue('מספר שאלות', this.questionStats.numQuestions));
    lines.push(this.plainLabelValue('כמות שאלונים', this.questionStats.numForms));
    lines.push(this.plainLabelValue(
      'ציון לכולם',
      this.questionStats.avgScore > 0 ? this.questionStats.avgScore.toFixed(1) + ' %' : '—'
    ));
  }
  return lines;
}

private buildFilterPptLines(): string[] {
  const lines: string[] = [];
  const years = this.getEffectiveYears();
  const quarters = this.getEffectiveQuarters();

  if (this.viewMode === 'forms') {
    lines.push(this.plainLabelValue('שאלונים', this.selectedForms.length > 0 ? this.selectedForms.join(', ') : 'הכל'));
    lines.push(this.plainLabelValue('מחלקות', this.selectedDepartments.length > 0 ? this.selectedDepartments.join(', ') : 'הכל'));
  } else {
    if (this.selectedQuestionForms.length > 0) {
      lines.push(this.plainLabelValue('טפסים', this.selectedQuestionForms.join(', ')));
    }
    if (this.selectedQuestionTexts.length > 0) {
      lines.push(this.plainLabelValue('שאלות', `${this.selectedQuestionTexts.length} נבחרו`));
    }
    if (this.selectedQuestionDepartments.length > 0 && this.selectedQuestionDepartments.length < this.questionDepartments.length) {
      lines.push(this.plainLabelValue('מחלקות', this.selectedQuestionDepartments.join(', ')));
    }
  }

  if (years.length) lines.push(this.plainLabelValue('שנה', years.join(', ')));
  if (this.hasExplicitQuarterSelection() && quarters.length) {
    lines.push(this.plainLabelValue(this.periodLabel, quarters.map(q => this.formatPeriodLegendLabel(q)).join(', ')));
  } else if (!this.hasExplicitQuarterSelection() && years.length) {
    lines.push(this.plainLabelValue('רבעון', 'כל השנה'));
  }

  return lines;
}


/** Label + value as two adjacent cells sized to content (not stretched), anchored to the right margin. */
private addLabelValueLine(
  slide: any,
  label: string,
  value: string | number,
  y: number,
  fontSize: number,
  opts: { bold?: boolean; color?: string } = {}
): void {
  const rightMargin = 9.5;
  const valueStr = String(value);
  const labelW = Math.min(Math.max(this.approxTextWidthIn(label, fontSize) + 0.3, 0.8), 4);
  const valueW = Math.min(Math.max(this.approxTextWidthIn(valueStr, fontSize) + 0.3, 0.5), 6.5);
  const totalW = labelW + valueW;
  const x = Math.max(rightMargin - totalW, 0.5);

  slide.addTable(
    [[
      { text: valueStr, options: { align: 'left', valign: 'middle', color: opts.color || '2D3748', bold: !!opts.bold } },
      { text: label, options: { align: 'right', valign: 'middle', bold: true, color: opts.color || '2D3748', rtlMode: true } }
    ]],
    {
      x, y, w: totalW, colW: [valueW, labelW],
      fontSize,
      border: { type: 'none' },
      margin: [0, 0.05, 0, 0.05],
      autoPage: false
    }
  );
}

private buildExportStatsRows(): any[][] {
  const rows: any[][] = [];
  if (this.viewMode === 'forms' && this.stats) {
    rows.push(this.buildLabelValueRow('מספר ממלאים', this.stats.NumWorkers ?? '—'));
    rows.push(this.buildLabelValueRow('כמות מחלקות', this.stats.NumDepartments));
    rows.push(this.buildLabelValueRow('כמות שאלונים שמולאו', this.stats.NumQuestions));
    rows.push(this.buildLabelValueRow('ציון כולל', this.fmtGrade(this.stats.Grade)));
  } else if (this.viewMode === 'questions' && this.questionStats.numQuestions > 0) {
    rows.push(this.buildLabelValueRow('מספר שאלות', this.questionStats.numQuestions));
    rows.push(this.buildLabelValueRow('כמות שאלונים', this.questionStats.numForms));
    rows.push(this.buildLabelValueRow(
      'ציון לכולם',
      this.questionStats.avgScore > 0 ? this.questionStats.avgScore.toFixed(1) + ' %' : '—'
    ));
  }
  return rows;
}

  private buildExportTableData(group: QuestionsTableGroup): any[] {
    const header: any[] = [
      { text: 'שאלה', options: { bold: true, fill: 'EBF4FF', align: 'right' } },
      ...group.departments.map(d => ({ text: d, options: { bold: true, fill: 'EBF4FF' } })),
      { text: 'ממוצע', options: { bold: true, fill: 'E2E8F0' } }
    ];
    const rows: any[] = [header];

    group.rows.forEach(row => {
      const rowAvg = this.getRowAverage(row.cells);
      rows.push([
        { text: row.question, options: { align: 'right', fontSize: 8 } },
        ...row.cells.map(c => ({
          text: c.score >= 0 ? c.score + '%' : '—',
          options: { fill: c.score >= 80 ? 'C6F6D5' : c.score >= 60 ? 'FEFCBF' : c.score >= 0 ? 'FED7D7' : 'FFFFFF' }
        })),
        { text: this.formatAvgScore(rowAvg), options: { bold: true, fill: 'EDF2F7' } }
      ]);
    });

    const avgRow: any[] = [
      { text: 'ממוצע', options: { bold: true, fill: 'E2E8F0', align: 'right' } },
      ...group.departments.map((_, i) => ({
        text: this.formatAvgScore(this.getColumnAverage(group.rows, i)),
        options: { bold: true, fill: 'EDF2F7' }
      })),
      { text: this.formatAvgScore(this.getGroupGrandAverage(group)), options: { bold: true, fill: 'CBD5E0' } }
    ];
    rows.push(avgRow);
    return rows;
  }

  private buildExportColumnWidths(group: QuestionsTableGroup): number[] {
    const deptCount = group.departments.length;
    const questionW = 2.2;
    const avgW = 0.7;
    const remaining = 9.4 - questionW - avgW;
    const deptW = deptCount > 0 ? remaining / deptCount : 1;
    return [questionW, ...Array(deptCount).fill(deptW), avgW];
  }

  private async loadLogoBase64(): Promise<string | null> {
    try {
      const response = await fetch('assets/images/logo.png');
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject();
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private async captureChartImage(): Promise<string | null> {
    const host = this.hostEl?.nativeElement;
    if (!host || this.chartRows.length === 0) return null;

    const target = host.querySelector('.hd-chart-track') as HTMLElement | null
      || host.querySelector('.hd-chart-scroll') as HTMLElement | null;
    if (!target) return null;

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }


  private async captureStatsBlockImage(
  exportDate: string,
  filterLines: string[],
  statsLines: string[]
): Promise<{ data: string; width: number; height: number } | null> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '0';
  container.style.width = '900px';
  container.style.direction = 'rtl';
  container.style.textAlign = 'right';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.background = '#F4F7FB';
  container.style.color = '#2D3748';
  container.style.padding = '4px';

  const dateHtml = exportDate
    ? `<div style="font-size:16px; color:#4A5568; margin-bottom:14px;">${this.escapeHtml('תאריך ייצוא: ' + exportDate)}</div>`
    : '';

  const filterHtml = filterLines.length > 0
    ? `<div style="font-size:16px; font-weight:bold; margin-bottom:6px;">סינון:</div>` +
      filterLines.map(l => `<div style="font-size:14px; margin-bottom:4px;">${this.escapeHtml(l)}</div>`).join('')
    : '';

  const statsHtml = statsLines.length > 0
    ? `<div style="margin-top:20px;">` +
      statsLines.map(l => `<div style="font-size:20px; font-weight:bold; color:#1A202C; margin-bottom:8px;">${this.escapeHtml(l)}</div>`).join('') +
      `</div>`
    : '';

  container.innerHTML = dateHtml + filterHtml + statsHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#F4F7FB',
      logging: false
    });
    return { data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closeDetail();
  }

  private now(): string {
    const d = new Date(), p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getDate()}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  getSeriesColor(index: number): string {
    return this.SERIES_COLORS[index % this.SERIES_COLORS.length];
  }

  private tooltipColumn(): any {
    return { role: 'tooltip', type: 'string', p: { html: true } };
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatPeriodLegendLabel(period: string): string {
    if (this.periodMode === 'semi') {
      if (period === '1' || period === 'H1') return 'H1';
      if (period === '2' || period === 'H2') return 'H2';
      return period.startsWith('H') ? period : `H${period}`;
    }
    return period.startsWith('Q') ? period : period;
  }

  private buildFilterSubtitle(years?: string[], quarters?: string[]): string {
    const y = years ?? this.getEffectiveYears();
    const parts: string[] = [];
    if (y.length) parts.push(y.join(', '));
    if (this.hasExplicitQuarterSelection()) {
      const q = quarters ?? this.getEffectiveQuarters();
      if (q.length) {
        parts.push(q.map(p => this.formatPeriodLegendLabel(p)).join(', '));
      }
    } else if (y.length) {
      parts.push('כל השנה');
    }
    return parts.join(' • ');
  }

  private buildTooltipHtml(title: string, percent: number, subtitle?: string): string {
    const safeTitle = this.escapeHtml(title);
    const safeSubtitle = subtitle ? this.escapeHtml(subtitle) : '';
    return `<div dir="rtl" style="padding:10px 12px;border-radius:10px;background:#1f2937;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);font-family:Arial,sans-serif;min-width:140px;text-align:right;direction:rtl;">
      <div style="font-size:12px;opacity:.9;margin-bottom:6px;text-align:right;">${safeTitle}</div>
      <div style="font-size:20px;font-weight:700;line-height:1;text-align:right;">${percent}%</div>
      ${safeSubtitle ? `<div style="font-size:11px;opacity:.85;margin-top:6px;text-align:right;">${safeSubtitle}</div>` : ''}
    </div>`;
  }
}