import { Component, OnInit, HostListener } from '@angular/core';
import { forkJoin } from 'rxjs';
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
export class HitoFormsDashboardComponent implements OnInit {

  viewMode: 'forms' | 'questions' = 'forms';

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

  private readonly BAR_CLR = '#667eea';
  private readonly SERIES_COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
  private applyTimeout: ReturnType<typeof setTimeout> | null = null;

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

  constructor(private svc: HitoFormsDashboardService) {}

  ngOnInit(): void {
    this.recalc();
    this.loadOptions();
  }

  @HostListener('window:resize')
  onResize(): void { this.recalc(); }

  private recalc(): void {
    const vw = window.innerWidth;
    const seriesCount = Math.max(this.chartSeriesLabels.length, 1);
    const bars = Math.max(this.chartRows.length, 1);
    const totalBars = this.chartIsStacked ? bars : bars * seriesCount;
    const perBar = 140;
    this.chartWidth = Math.max(
      (this.chartIsStacked ? bars : totalBars) * (this.chartIsStacked ? perBar : perBar / seriesCount) + 100,
      vw * 0.93,
      500
    );
    this.chartHeight = vw < 640 ? 240 : 390;

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
    const annotationFontSize = seriesCount > 4 ? 12 : (seriesCount > 2 ? 13 : (hasMultipleSeries ? 14 : 18));

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
        alwaysOutside: false,
        textStyle: {
          fontSize: annotationFontSize,
          fontName: 'Arial',
          bold: true,
          color: '#FFFFFF',
          opacity: 1
        },
        stem: {
          color: 'transparent',
          length: 0
        }
      },
      hAxis: {
        textStyle: {
          fontSize: 15,
          fontName: 'Arial',
          color: 'rgba(0, 0, 0, 1)'
        },
        slantedText: shouldSlantLabels,
        slantedTextAngle: bars > 12 ? 55 : bars > 8 ? 45 : 35,
        maxTextLines: 4,
        maxAlternation: 1
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
        height: many ? '50%' : '60%',
        top: chartTop,
        right: 10,
        bottom: shouldSlantLabels ? 145 : 90
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
          const cy = this.getCurrentYear();
          this.selectedYears = this.allYears.includes(cy) ? [cy] : [this.allYears[this.allYears.length - 1]];
        }
        if (this.selectedQuarters.length === 0 && this.allQuarters.length > 0) {
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

  /** When nothing selected, use current quarter (default). */
  private getEffectiveQuarters(): string[] {
    const selected = [...new Set(this.selectedQuarters)].filter(q => this.allQuarters.includes(q));
    if (selected.length > 0) return selected;
    const current = this.getCurrentQuarter();
    if (this.allQuarters.includes(current)) return [current];
    return this.allQuarters.length > 0 ? [this.allQuarters[0]] : [];
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
    const multiQuarter = quarters.length > 1;
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
    this.viewMode = mode;
    this.detailModal = null;
    this.detailSearch = '';
    if (mode === 'questions') {
      this.selectedQuestionTexts = [];
      this.questionSearch = '';
      this.questionFormSearch = '';
      this.questionRows = [];
      this.questionForms = [];
      this.answerScoreForms = [];
      this.selectedQuestionForms = [];
      this.questionDepartments = [];
      this.selectedQuestionDepartments = [];
      this.chartRows = [];
      this.questionsTableGroups = [];
      this.error = null;
      this.loading = false;
      this.loadAnswerScoreForms();
      this.loadAnswerScoreQuestions();
      // Set default year to 2026, clear quarters
      this.selectedYears = ['2026'];
      this.selectedQuarters = [];
    } else {
      this.applyFilters();
    }
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
    this.questionsLoading = true;
    this.questionsError = null;
    const formNames = this.selectedQuestionForms.length > 0
      ? this.selectedQuestionForms.join(',')
      : '';
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
  }

  /** CSS class for a table cell based on its score, for quick visual scanning. */
  cellClass(score: number): string {
    if (score < 0) return 'hd-qcell hd-qcell--empty';
    if (score >= 80) return 'hd-qcell hd-qcell--good';
    if (score >= 60) return 'hd-qcell hd-qcell--mid';
    return 'hd-qcell hd-qcell--low';
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
    this.selectedYears = this.allYears.includes(this.getCurrentYear())
      ? [this.getCurrentYear()]
      : (this.allYears.length > 0 ? [this.allYears[this.allYears.length - 1]] : []);
    this.selectedQuarters = this.allQuarters.includes(this.getCurrentQuarter())
      ? [this.getCurrentQuarter()]
      : (this.allQuarters.length > 0 ? [this.allQuarters[0]] : []);
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
    const q = quarters ?? this.selectedQuarters;
    const parts: string[] = [];
    if (y.length) parts.push(y.join(', '));
    if (q.length) {
      parts.push(q.map(p => this.formatPeriodLegendLabel(p)).join(', '));
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