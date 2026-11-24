import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  ALL_QUARTERS,
  InvasiveDateFilterMode,
  InvasiveKpis,
  InvasiveDepartmentChartItem,
  QuarterNumber,
  buildYearOptions,
  emptyKpis,
  resolveFilterDateRange,
  scoreLevel
} from '../invasive-procedures.models';
import { InvasiveProceduresService } from '../invasive-procedures.service';

@Component({
  selector: 'app-invasive-procedures-dashboard',
  templateUrl: './invasive-procedures-dashboard.component.html',
  styleUrls: ['./invasive-procedures-dashboard.component.scss']
})
export class InvasiveProceduresDashboardComponent implements OnInit, OnDestroy {
  kpis: InvasiveKpis = emptyKpis();
  gaugeScore = 0;
  gaugeFilled = 0;
  gaugeExpected = 0;
  loading = false;
  departmentChartLoading = false;
  errorMessage: string | null = null;
  lastUpdated = '';
  hasLoadedOnce = false;
  searchText = '';
  activeView: 'departments' | 'cases' = 'departments';

  filterMode: InvasiveDateFilterMode = 'quarters';
  filterYear = new Date().getFullYear();
  selectedQuarters: QuarterNumber[] = ALL_QUARTERS.slice() as QuarterNumber[];
  customDateFrom: Date | null = null;
  customDateTo: Date | null = null;

  readonly quarterCheckboxOptions: { value: QuarterNumber; label: string }[] = [
    { value: 1, label: 'Q1' },
    { value: 2, label: 'Q2' },
    { value: 3, label: 'Q3' },
    { value: 4, label: 'Q4' }
  ];
  yearOptions: number[] = buildYearOptions();
  departmentOptions: string[] = [];
  selectedDepartments: string[] = [];
  departmentChartScores: InvasiveDepartmentChartItem[] = [];

  private subs: Subscription[] = [];
  private departmentsSub: Subscription | null = null;
  private suppressAutoLoad = false;

  constructor(private api: InvasiveProceduresService, private router: Router) {}

  ngOnInit(): void {
    this.searchText = this.api.search$.value;
    this.filterMode = this.api.filterMode$.value;
    this.filterYear = this.api.filterYear$.value;
    this.selectedQuarters = this.api.selectedQuarters$.value.slice() as QuarterNumber[];
    this.customDateFrom = this.api.customDateFrom$.value;
    this.customDateTo = this.api.customDateTo$.value;
    this.selectedDepartments = (this.api.selectedDepartmentNames$.value || []).slice();
    this.syncActiveView(this.router.url);
    this.subs.push(
      this.api.filteredKpis$.subscribe(kpis => {
        this.kpis = kpis;
        this.syncGauge(kpis);
      }),
      this.api.loading$.subscribe(loading => this.loading = loading),
      this.api.departmentChartLoading$.subscribe(loading => this.departmentChartLoading = loading),
      this.api.error$.subscribe(err => this.errorMessage = err),
      this.api.lastUpdated$.subscribe(value => this.lastUpdated = value),
      this.api.departmentOptions$.subscribe(options => {
        this.departmentOptions = options || [];
        const pruned = this.pruneInvalidDepartmentSelection();
        if (pruned && this.hasLoadedOnce) {
          this.api.setDepartmentFilter(this.selectedDepartments);
        }
      }),
      this.api.departmentChartScores$.subscribe(scores => {
        this.departmentChartScores = scores || [];
      }),
      this.router.events.subscribe(e => {
        if (e instanceof NavigationEnd) {
          this.syncActiveView(e.urlAfterRedirects || e.url);
        }
      }),
      combineLatest([
        this.api.filterMode$,
        this.api.filterYear$,
        this.api.selectedQuarters$,
        this.api.customDateFrom$,
        this.api.customDateTo$
      ]).pipe(
        debounceTime(120),
        distinctUntilChanged((a, b) =>
          a[0] === b[0]
          && a[1] === b[1]
          && this.sameQuarters(a[2], b[2])
          && this.sameDate(a[3], b[3])
          && this.sameDate(a[4], b[4]))
      ).subscribe(([mode, year, quarters, from, to]) => {
        this.filterMode = mode;
        this.filterYear = year;
        this.selectedQuarters = (quarters || []).slice() as QuarterNumber[];
        this.customDateFrom = from;
        this.customDateTo = to;
        if (this.hasLoadedOnce && !this.suppressAutoLoad) {
          this.loadData(false);
        }
      })
    );
    this.applyDefaultFilters();
    this.loadDepartmentsForYear(this.filterYear);
  }

  ngOnDestroy(): void {
    if (this.departmentsSub) {
      this.departmentsSub.unsubscribe();
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  loadData(forceRefresh?: boolean): void {
    const range = resolveFilterDateRange(
      this.filterMode,
      this.filterYear,
      this.selectedQuarters,
      this.customDateFrom,
      this.customDateTo
    );
    if (!range) {
      this.errorMessage = this.filterMode === 'custom'
        ? 'נא לבחור תאריך התחלה וסיום תקינים'
        : 'נא לבחור לפחות רבעון אחד';
      return;
    }
    if (range.from.getTime() > range.to.getTime()) {
      this.errorMessage = 'תאריך הסיום לא יכול להיות מוקדם מתאריך ההתחלה';
      return;
    }
    this.errorMessage = null;
    this.api.setDepartmentFilter(this.selectedDepartments || []);
    this.api.markLoadRequested();
    this.hasLoadedOnce = true;
    if (forceRefresh !== false) {
      this.api.clearQuarterlyCache();
    }
    this.api.applyDates(range.from, range.to);
    this.subs.push(
      this.api.loadCases(forceRefresh !== false).subscribe(
        () => { /* syncDisplayData runs in service */ },
        () => { /* error$ already set by the service */ }
      )
    );
  }

  onFilterModeChange(mode: InvasiveDateFilterMode): void {
    if (mode === this.filterMode) {
      return;
    }
    this.suppressAutoLoad = true;
    this.filterMode = mode;
    this.api.filterMode$.next(mode);
    if (mode === 'quarters') {
      this.customDateFrom = null;
      this.customDateTo = null;
      this.api.customDateFrom$.next(null);
      this.api.customDateTo$.next(null);
      if (!this.selectedQuarters.length) {
        this.selectedQuarters = ALL_QUARTERS.slice() as QuarterNumber[];
        this.api.selectedQuarters$.next(this.selectedQuarters);
      }
    } else {
      this.selectedQuarters = [];
      this.api.selectedQuarters$.next([]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      this.customDateFrom = from;
      this.customDateTo = today;
      this.api.customDateFrom$.next(from);
      this.api.customDateTo$.next(today);
    }
    this.suppressAutoLoad = false;
    if (this.hasLoadedOnce) {
      this.loadData(false);
    }
  }

  onYearChange(year: number): void {
    const parsed = Number(year);
    if (!isFinite(parsed)) {
      return;
    }
    this.filterYear = parsed;
    this.api.filterYear$.next(parsed);
    this.loadDepartmentsForYear(parsed);
  }

  onQuartersChange(values: QuarterNumber[]): void {
    this.selectedQuarters = (values || []).slice() as QuarterNumber[];
    this.api.selectedQuarters$.next(this.selectedQuarters);
  }

  onCustomFromChange(date: Date | null): void {
    this.customDateFrom = date;
    this.api.customDateFrom$.next(date);
  }

  onCustomToChange(date: Date | null): void {
    this.customDateTo = date;
    this.api.customDateTo$.next(date);
  }

  onDepartmentsChange(names: string[]): void {
    this.selectedDepartments = names || [];
  }

  onSearchChange(value: string): void {
    this.searchText = value || '';
    this.api.search$.next(this.searchText);
  }

  scoreClass(score: number): string {
    return 'ipd-kpi--' + scoreLevel(score);
  }

  gaugeLevelClass(): string {
    return 'ipd-gauge--' + scoreLevel(this.gaugeScore);
  }

  gaugeCircumference(): number {
    return 2 * Math.PI * 88;
  }

  gaugeDashOffset(): number {
    const pct = Math.max(0, Math.min(100, this.gaugeScore));
    return this.gaugeCircumference() * (1 - pct / 100);
  }

  barHeight(score: number): number {
    return Math.max(4, Math.min(100, score));
  }

  private applyDefaultFilters(): void {
    this.filterYear = new Date().getFullYear();
    this.filterMode = 'quarters';
    this.selectedQuarters = ALL_QUARTERS.slice() as QuarterNumber[];
    this.api.filterMode$.next(this.filterMode);
    this.api.filterYear$.next(this.filterYear);
    this.api.selectedQuarters$.next(this.selectedQuarters);
    this.api.customDateFrom$.next(null);
    this.api.customDateTo$.next(null);
  }

  private syncGauge(kpis: InvasiveKpis): void {
    this.gaugeFilled = kpis.filled;
    this.gaugeExpected = kpis.filled + kpis.missing;
    this.gaugeScore = this.gaugeExpected > 0 ? kpis.completion : 0;
  }

  private loadDepartmentsForYear(year: number): void {
    if (this.departmentsSub) {
      this.departmentsSub.unsubscribe();
    }
    this.departmentsSub = this.api.loadDepartmentsForYear(year).subscribe();
  }

  private pruneInvalidDepartmentSelection(): boolean {
    if (!this.selectedDepartments.length || !this.departmentOptions.length) {
      return false;
    }
    const allowed = new Set(this.departmentOptions);
    const next = this.selectedDepartments.filter(name => allowed.has(name));
    if (next.length !== this.selectedDepartments.length) {
      this.selectedDepartments = next;
      return true;
    }
    return false;
  }

  private syncActiveView(url: string): void {
    this.activeView = url.indexOf('/invasive-procedures/cases') >= 0 ? 'cases' : 'departments';
  }

  private sameQuarters(a: QuarterNumber[], b: QuarterNumber[]): boolean {
    const aa = (a || []).slice().sort().join(',');
    const bb = (b || []).slice().sort().join(',');
    return aa === bb;
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    const ta = a && !isNaN(a.getTime()) ? a.getTime() : -1;
    const tb = b && !isNaN(b.getTime()) ? b.getTime() : -1;
    return ta === tb;
  }
}
