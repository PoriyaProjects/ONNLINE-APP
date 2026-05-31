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
  allQuestionTexts: string[] = [];
  selectedQuestionText = '';
  questionSearch = '';
  questionRows: HitoAnswerScoreRow[] = [];
  questionForms: string[] = [];
  selectedQuestionForms: string[] = [];
  questionDepartments: string[] = [];
  selectedQuestionDepartments: string[] = [];

  get filteredQuestionTexts(): string[] {
    const s = (this.questionSearch || '').trim().toLowerCase();
    if (!s) return this.allQuestionTexts;
    return this.allQuestionTexts.filter(q => (q || '').toLowerCase().includes(s));
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
  /** When true, chart is stacked (used for quarters: one column split into segments). */
  chartIsStacked = false;

  /* ── State ── */
  loading = false;
  loadingOptions = false;
  optionsLoadError: string | null = null;
  error: string | null = null;

  private readonly BAR_CLR = '#3B8AD9';
  private readonly SERIES_COLORS = ['#3B8AD9', '#E26B6B', '#50C878', '#F4A460', '#9B59B6', '#1ABC9C'];
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

    const many = bars > 6;
    const seriesOpt: Record<number, { color: string }> = {};
    this.chartSeriesLabels.forEach((_, i) => {
      seriesOpt[i] = { color: this.SERIES_COLORS[i % this.SERIES_COLORS.length] };
    });

    const vMax = this.chartIsStacked ? 100 * seriesCount : 100;
    const hasMultipleSeries = this.isGroupedChart || this.chartIsStacked;
    const topMargin = hasMultipleSeries ? 56 : 32;
    // Extra top space so (%) annotations sit above bars and don't get cut off
    const chartTop = topMargin + (hasMultipleSeries ? 28 : 0);
    const annotationFontSize = seriesCount > 4 ? 12 : (seriesCount > 2 ? 13 : (hasMultipleSeries ? 14 : 18));

    this.chartOptions = {
      legend: hasMultipleSeries ? { position: 'top', textStyle: { fontSize: 14, fontName: 'Arial' } } : 'none',
      backgroundColor: 'transparent',
      isStacked: this.chartIsStacked,
      bar: {
        groupWidth: this.chartIsStacked
          ? (bars <= 4 ? '50%' : bars <= 8 ? '62%' : '72%')
          : this.isGroupedChart
            ? (bars <= 4 ? '60%' : bars <= 8 ? '75%' : '85%')
            : (bars <= 4 ? '50%' : bars <= 8 ? '62%' : '72%')
      },
      series: Object.keys(seriesOpt).length > 0 ? seriesOpt : undefined,
      annotations: {
        alwaysOutside: true,
        textStyle: {
          fontSize: annotationFontSize,
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
      this.buildQuestionChartFromRows();
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
          const ann = v > 0 ? v + ' %' : '';
          return [it.Label || '', v, ann, this.BAR_CLR];
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
      this.loadAnswerScoreQuestions();
      this.selectedQuestionText = '';
      this.questionSearch = '';
      this.questionRows = [];
      this.questionForms = [];
      this.selectedQuestionForms = [];
      this.questionDepartments = [];
      this.selectedQuestionDepartments = [];
      this.chartRows = [];
      this.error = null;
      this.loading = false;
    } else {
      this.applyFilters();
    }
  }

  private loadAnswerScoreQuestions(): void {
    this.questionsLoading = true;
    this.questionsError = null;
    this.svc.getHitoAnswerScoreQuestions().subscribe({
      next: (questions) => {
        this.allQuestionTexts = questions || [];
        this.questionsLoading = false;
      },
      error: () => {
        this.questionsLoading = false;
        this.questionsError = 'שגיאה בטעינת שאלות';
      }
    });
  }

  selectQuestionText(val: string): void {
    this.selectedQuestionText = (val || '').trim();
    this.selectedQuestionForms = [];
    this.questionDepartments = [];
    this.selectedQuestionDepartments = [];
    this.questionRows = [];
    this.questionForms = [];
    this.fetchRowsForSelectedQuestion();
  }

  isQuestionTextSelected(val: string): boolean {
    return (this.selectedQuestionText || '') === (val || '');
  }

  private fetchRowsForSelectedQuestion(): void {
    const itemText = (this.selectedQuestionText || '').trim();
    if (!itemText) {
      this.chartRows = [];
      this.error = null;
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = null;
    this.svc.getHitoAnswerScoreRowsByQuestion({ itemText }).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.questionRows = data;
        this.questionForms = Array.from(
          new Set(data.map(r => (r.formName_Name || '').trim()).filter(v => v !== ''))
        ).sort((a, b) => a.localeCompare(b, 'he'));
        this.questionDepartments = Array.from(
          new Set(data.map(r => (r.department || '').trim()).filter(v => v !== ''))
        ).sort((a, b) => a.localeCompare(b, 'he'));
        this.selectedQuestionForms = [...this.questionForms];
        this.selectedQuestionDepartments = [...this.questionDepartments];
        this.buildQuestionChartFromRows();
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
    const yearSet = new Set(years);
    const selectedFormsSet = new Set(this.selectedQuestionForms);
    const selectedDeptsSet = new Set(this.selectedQuestionDepartments);
    const filtered = (this.questionRows || []).filter(r => {
      const rowForm = (r.formName_Name || '').trim();
      const rowDept = (r.department || '').trim();
      const rowYear = String(Number(r.DYear || 0));
      const yearOk = yearSet.size === 0 ? true : yearSet.has(rowYear);
      const formOk = this.selectedQuestionForms.length === 0 ? true : selectedFormsSet.has(rowForm);
      const deptOk = this.selectedQuestionDepartments.length === 0 ? true : selectedDeptsSet.has(rowDept);
      return yearOk && formOk && deptOk;
    });

    const deptToAgg = new Map<string, { sum: number; count: number }>();
    filtered.forEach(r => {
      const dept = (r.department || '').trim() || 'ללא מחלקה';
      if (!deptToAgg.has(dept)) deptToAgg.set(dept, { sum: 0, count: 0 });
      const score = Number(r.IntScore);
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
    this.chartColumns = ['מחלקה', 'ציון', { role: 'annotation', type: 'string' }];
    this.chartRows = depts.map(d => {
      const agg = deptToAgg.get(d)!;
      let avg = agg.count > 0 ? (agg.sum / agg.count) : 0;
      if (avg <= 1) avg *= 100;
      const ann = avg > 0 ? `${avg.toFixed(0)} %` : '';
      return [d, avg, ann];
    });
    this.chartData = this.chartRows.map((row: any[]) => ({ Label: String(row[0] || ''), Value: Number(row[1]) || 0 })) as HitoFormsChartItem[];
    this.lastUpdateDate = this.now();
    this.recalc();
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
        this.buildStackedQuartersChart(quarters, charts as HitoFormsChartItem[][]);
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
      this.chartColumns.push({ role: 'annotation', type: 'string' });
    });

    this.chartRows = departments.map(dept => {
      const values = labelToValues.get(dept) || [];
      const row: any[] = [dept];
      (nonZeroSeriesIndices.length > 0 ? nonZeroSeriesIndices : seriesLabels.map((_, i) => i)).forEach(idx => {
        const num = values[idx] != null ? values[idx]! : 0;
        const ann = num > 0 ? (num.toFixed(0)) + ' %' : '';
        row.push(num, ann);
      });
      return row;
    });
    this.recalc();
  }

  /** One column per department, split into stacked segments (one per quarter). Skip all-zero quarters so 0% don't overlap. */
  private buildStackedQuartersChart(quarters: string[], charts: HitoFormsChartItem[][]): void {
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
      this.chartColumns.push({ role: 'annotation', type: 'string' });
    });

    const indicesToShow = nonZeroSeriesIndices.length > 0 ? nonZeroSeriesIndices : quarters.map((_, i) => i);
    if (quartersToShow.length <= 1) {
      this.chartIsStacked = false;
      this.chartSeriesLabels = quartersToShow.length === 1 ? quartersToShow : [];
      this.chartColumns = ['מחלקה', quartersToShow[0] || 'ציון %', { role: 'annotation', type: 'string' }];
      this.chartRows = departments.map(dept => {
        const values = labelToValues.get(dept) || [];
        const idx = indicesToShow[0] ?? 0;
        const num = values[idx] != null ? values[idx]! : 0;
        const ann = num > 0 ? (num.toFixed(0)) + ' %' : '';
        return [dept, num, ann];
      });
    } else {
      this.chartRows = departments.map(dept => {
        const values = labelToValues.get(dept) || [];
        const row: any[] = [dept];
        indicesToShow.forEach(idx => {
          const num = values[idx] != null ? values[idx]! : 0;
          const ann = num > 0 ? (num.toFixed(0)) + ' %' : '';
          row.push(num, ann);
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

  closeDetail(): void { this.detailModal = null; this.detailSearch = ''; }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closeDetail();
  }

  private now(): string {
    const d = new Date(), p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getDate()}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}