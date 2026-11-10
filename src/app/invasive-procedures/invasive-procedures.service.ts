import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  InvasiveCaseRow,
  InvasiveDepartmentChartItem,
  InvasiveDepartmentRow,
  InvasiveKpis,
  ALL_QUARTERS,
  InvasiveDateFilterMode,
  InvasiveQuarterScore,
  QuarterNumber,
  buildDepartmentCustomRangeChartItems,
  buildDepartmentQuarterChartItems,
  buildDepartmentSummariesFromCases,
  computeKpisFromCases,
  departmentOptionsFromCases,
  emptyKpis,
  filterCases,
  filterDepartments,
  filterEligibleCases,
  formatDateRangeLabel,
  quarterDateRange,
  quarterRangeLabel,
  round1,
  weightedCompletion
} from './invasive-procedures.models';

const BASE = (environment && environment.url ? environment.url : '').replace(/\/?$/, '/');

const JSON_HEADERS = new HttpHeaders({
  Accept: 'application/json; charset=utf-8',
  'Content-Type': 'application/json; charset=utf-8'
});

@Injectable({ providedIn: 'root' })
export class InvasiveProceduresService {
  dateFrom: Date;
  dateTo: Date;

  readonly departments$ = new BehaviorSubject<InvasiveDepartmentRow[]>([]);
  readonly cases$ = new BehaviorSubject<InvasiveCaseRow[]>([]);
  readonly kpis$ = new BehaviorSubject<InvasiveKpis>(emptyKpis());
  readonly loading$ = new BehaviorSubject<boolean>(false);
  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly lastUpdated$ = new BehaviorSubject<string>('');
  readonly search$ = new BehaviorSubject<string>('');
  readonly hasLoadedOnce$ = new BehaviorSubject<boolean>(false);
  readonly displayDepartments$ = new BehaviorSubject<InvasiveDepartmentRow[]>([]);
  readonly displayCases$ = new BehaviorSubject<InvasiveCaseRow[]>([]);
  readonly filteredKpis$ = new BehaviorSubject<InvasiveKpis>(emptyKpis());
  readonly quarterlyScores$ = new BehaviorSubject<InvasiveQuarterScore[]>([]);
  readonly quarterlyLoading$ = new BehaviorSubject<boolean>(false);
  readonly departmentChartScores$ = new BehaviorSubject<InvasiveDepartmentChartItem[]>([]);
  readonly departmentChartLoading$ = new BehaviorSubject<boolean>(false);
  readonly departmentOptions$ = new BehaviorSubject<string[]>([]);
  readonly filterYear$ = new BehaviorSubject<number>(new Date().getFullYear());
  readonly filterMode$ = new BehaviorSubject<InvasiveDateFilterMode>('quarters');
  readonly selectedQuarters$ = new BehaviorSubject<QuarterNumber[]>(ALL_QUARTERS.slice() as QuarterNumber[]);
  readonly customDateFrom$ = new BehaviorSubject<Date | null>(null);
  readonly customDateTo$ = new BehaviorSubject<Date | null>(null);
  readonly selectedDepartmentNames$ = new BehaviorSubject<string[]>([]);

  private appliedKey = '';
  private summaryKey = '';
  private casesKey = '';
  private summaryInFlight: Observable<InvasiveDepartmentRow[]> | null = null;
  private casesInFlight: Observable<InvasiveCaseRow[]> | null = null;
  private readonly rawFetchCache = new Map<string, Observable<InvasiveDepartmentRow[]>>();
  private readonly rawCasesFetchCache = new Map<string, Observable<InvasiveCaseRow[]>>();
  private quarterlyRowsCache = new Map<string, InvasiveDepartmentRow[][]>();

  constructor(private http: HttpClient) {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to.getFullYear(), to.getMonth() - 1, to.getDate());
    this.dateFrom = from;
    this.dateTo = to;
  }

  dateKey(from?: Date, to?: Date): string {
    return toIsoDateOnly(from || this.dateFrom) + '|' + toIsoDateOnly(to || this.dateTo);
  }

  markLoadRequested(): void {
    this.hasLoadedOnce$.next(true);
  }

  applyDates(from: Date, to: Date): void {
    const nextKey = this.dateKey(from, to);
    if (nextKey !== this.appliedKey) {
      this.summaryKey = '';
      this.casesKey = '';
    }
    this.dateFrom = from;
    this.dateTo = to;
    this.appliedKey = nextKey;
  }

  loadSummary(force?: boolean): Observable<InvasiveDepartmentRow[]> {
    const key = this.dateKey();
    if (!force && this.summaryKey === key) {
      return of(this.departments$.value);
    }
    if (this.summaryInFlight) {
      return this.summaryInFlight;
    }
    this.loading$.next(true);
    this.error$.next(null);
    this.summaryInFlight = this.postList<InvasiveDepartmentRow>(
      'FetchInvasiveProceduresSummary',
      ['Departments'],
      normalizeDepartmentRow
    ).pipe(
      tap(rows => {
        this.summaryKey = key;
        this.appliedKey = key;
        this.departments$.next(rows);
        this.syncDisplayData();
        this.lastUpdated$.next(formatClock());
      }),
      catchError(err => {
        this.summaryKey = '';
        this.departments$.next([]);
        this.displayDepartments$.next([]);
        this.filteredKpis$.next(emptyKpis());
        this.kpis$.next(emptyKpis());
        this.error$.next(apiErrorMessage(err, 'שגיאה בטעינת סיכום מחלקות. נסה שוב.'));
        return of([]);
      }),
      finalize(() => {
        this.loading$.next(false);
        this.summaryInFlight = null;
      }),
      shareReplay(1)
    );
    return this.summaryInFlight;
  }

  loadCases(force?: boolean): Observable<InvasiveCaseRow[]> {
    const key = this.dateKey();
    if (!force && this.casesKey === key) {
      return of(this.cases$.value);
    }
    if (this.casesInFlight) {
      return this.casesInFlight;
    }
    this.loading$.next(true);
    this.error$.next(null);
    this.casesInFlight = this.postList<InvasiveCaseRow>(
      'FetchInvasiveProceduresCases',
      ['Cases'],
      normalizeCaseRow
    ).pipe(
      tap(rows => {
        this.casesKey = key;
        this.appliedKey = key;
        this.cases$.next(rows);
        this.syncDisplayData();
        this.lastUpdated$.next(formatClock());
      }),
      catchError(err => {
        this.casesKey = '';
        this.cases$.next([]);
        this.syncDisplayData();
        this.error$.next(apiErrorMessage(err, 'שגיאה בטעינת פירוט מקרים. נסה שוב.'));
        return of([]);
      }),
      finalize(() => {
        this.loading$.next(false);
        this.casesInFlight = null;
      }),
      shareReplay(1)
    );
    return this.casesInFlight;
  }

  setDepartmentFilter(names: string[]): void {
    this.selectedDepartmentNames$.next(names || []);
    this.syncDisplayData();
  }

  syncDisplayData(): void {
    const eligibleAll = filterEligibleCases(this.cases$.value);
    this.departmentOptions$.next(departmentOptionsFromCases(eligibleAll));
    const eligibleVisible = filterCases(eligibleAll, this.selectedDepartmentNames$.value);
    const departments = buildDepartmentSummariesFromCases(eligibleVisible);
    const kpis = computeKpisFromCases(eligibleVisible);
    this.displayDepartments$.next(departments);
    this.displayCases$.next(eligibleVisible);
    this.filteredKpis$.next(kpis);
    this.kpis$.next(kpis);
    this.refreshDepartmentChart();
  }

  refreshDepartmentChart(): void {
    if (this.filterMode$.value === 'custom') {
      const from = this.customDateFrom$.value;
      const to = this.customDateTo$.value;
      if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
        this.departmentChartScores$.next([]);
        return;
      }
      const eligibleVisible = filterCases(
        filterEligibleCases(this.cases$.value),
        this.selectedDepartmentNames$.value
      );
      this.departmentChartScores$.next(
        buildDepartmentCustomRangeChartItems(eligibleVisible, from, to)
      );
      return;
    }

    const year = this.filterYear$.value;
    const quarters = this.normalizeQuarters(this.selectedQuarters$.value);
    if (!quarters.length) {
      this.departmentChartScores$.next([]);
      return;
    }

    this.departmentChartLoading$.next(true);
    forkJoin(
      quarters.map(quarter => {
        const range = quarterDateRange(year, quarter);
        return this.fetchCasesRaw(range.from, range.to).pipe(
          map(cases => ({ quarter, cases: cases || [] }))
        );
      })
    ).pipe(
      finalize(() => this.departmentChartLoading$.next(false))
    ).subscribe(
      parts => {
        const sorted = parts.sort((a, b) => a.quarter - b.quarter);
        this.departmentChartScores$.next(
          buildDepartmentQuarterChartItems(sorted, this.selectedDepartmentNames$.value, year)
        );
      },
      () => this.departmentChartScores$.next([])
    );
  }

  loadQuarterlyBreakdown(year: number, quarters: QuarterNumber[], force?: boolean): void {
    if (this.filterMode$.value === 'custom') {
      this.setCustomRangeChart();
      return;
    }
    const selectedQuarters = this.normalizeQuarters(quarters);
    if (!selectedQuarters.length) {
      this.quarterlyScores$.next([]);
      return;
    }
    const cacheKey = this.quarterlyCacheKey(year, selectedQuarters);
    if (!force && this.quarterlyRowsCache.has(cacheKey)) {
      this.refreshQuarterlyFromCache();
      return;
    }
    this.quarterlyLoading$.next(true);
    forkJoin(
      selectedQuarters.map(quarter => {
        const range = quarterDateRange(year, quarter);
        return this.fetchSummaryRaw(range.from, range.to).pipe(
          map(rows => ({ quarter, rows: rows || [] }))
        );
      })
    ).pipe(
      finalize(() => this.quarterlyLoading$.next(false))
    ).subscribe(
      parts => {
        const sorted = parts.sort((a, b) => a.quarter - b.quarter);
        const grouped = sorted.map(part => part.rows);
        this.quarterlyRowsCache.set(cacheKey, grouped);
        this.quarterlyScores$.next(this.buildQuarterScores(year, sorted));
      },
      () => this.quarterlyScores$.next([])
    );
  }

  clearQuarterlyCache(): void {
    this.quarterlyRowsCache.clear();
    this.quarterlyScores$.next([]);
    this.rawFetchCache.clear();
    this.rawCasesFetchCache.clear();
  }

  refreshChartFromState(): void {
    if (this.filterMode$.value === 'custom') {
      this.setCustomRangeChart();
      return;
    }
    this.refreshQuarterlyFromCache();
  }

  private refreshQuarterlyFromCache(): void {
    if (this.filterMode$.value === 'custom') {
      this.setCustomRangeChart();
      return;
    }
    const year = this.filterYear$.value;
    const quarters = this.normalizeQuarters(this.selectedQuarters$.value);
    if (!quarters.length) {
      this.quarterlyScores$.next([]);
      return;
    }
    const cacheKey = this.quarterlyCacheKey(year, quarters);
    const grouped = this.quarterlyRowsCache.get(cacheKey);
    if (!grouped) {
      return;
    }
    const parts = quarters.map((quarter, index) => ({
      quarter,
      rows: grouped[index] || []
    }));
    this.quarterlyScores$.next(this.buildQuarterScores(year, parts));
  }

  private setCustomRangeChart(): void {
    const from = this.customDateFrom$.value;
    const to = this.customDateTo$.value;
    if (!from || !to) {
      this.quarterlyScores$.next([]);
      return;
    }
    const w = weightedCompletion(this.displayDepartments$.value);
    this.quarterlyScores$.next([{
      quarter: 1,
      label: 'טווח',
      rangeLabel: formatDateRangeLabel(from, to),
      filled: w.filled,
      missing: w.missing,
      expected: w.expected,
      score: w.score
    }]);
  }

  private buildQuarterScores(
    year: number,
    parts: { quarter: QuarterNumber; rows: InvasiveDepartmentRow[] }[]
  ): InvasiveQuarterScore[] {
    const selected = this.selectedDepartmentNames$.value;
    const scores: InvasiveQuarterScore[] = [];
    for (let i = 0; i < parts.length; i++) {
      const quarter = parts[i].quarter;
      const filtered = filterDepartments(parts[i].rows, selected);
      const w = weightedCompletion(filtered);
      scores.push({
        quarter,
        label: 'Q' + quarter,
        rangeLabel: quarterRangeLabel(year, quarter),
        filled: w.filled,
        missing: w.missing,
        expected: w.expected,
        score: w.score
      });
    }
    return scores;
  }

  private quarterlyCacheKey(year: number, quarters: QuarterNumber[]): string {
    return year + '|' + quarters.join(',');
  }

  private normalizeQuarters(quarters: QuarterNumber[]): QuarterNumber[] {
    const unique = Array.from(new Set(quarters || [])).filter(
      (q): q is QuarterNumber => q === 1 || q === 2 || q === 3 || q === 4
    );
    unique.sort((a, b) => a - b);
    return unique;
  }

  private syncDepartmentOptions(rows: InvasiveDepartmentRow[]): void {
    const names: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const name = (rows[i].Name || '').trim();
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      names.push(name);
    }
    names.sort((a, b) => a.localeCompare(b, 'he'));
    this.departmentOptions$.next(names);
  }

  private fetchCasesRaw(from: Date, to: Date): Observable<InvasiveCaseRow[]> {
    const key = 'cases|' + toIsoDateOnly(from) + '|' + toIsoDateOnly(to);
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return of([]);
    }
    const cached = this.rawCasesFetchCache.get(key);
    if (cached) {
      return cached;
    }
    const request = this.postList<InvasiveCaseRow>(
      'FetchInvasiveProceduresCases',
      ['Cases'],
      normalizeCaseRow,
      from,
      to
    ).pipe(
      map(rows => rows || []),
      catchError(() => of([] as InvasiveCaseRow[])),
      shareReplay(1)
    );
    this.rawCasesFetchCache.set(key, request);
    return request;
  }

  private fetchSummaryRaw(from: Date, to: Date): Observable<InvasiveDepartmentRow[]> {
    const key = toIsoDateOnly(from) + '|' + toIsoDateOnly(to);
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return of([]);
    }
    const cached = this.rawFetchCache.get(key);
    if (cached) {
      return cached;
    }
    const request = this.postList<InvasiveDepartmentRow>(
      'FetchInvasiveProceduresSummary',
      ['Departments'],
      normalizeDepartmentRow,
      from,
      to
    ).pipe(
      map(rows => rows || []),
      catchError(() => of([] as InvasiveDepartmentRow[])),
      shareReplay(1)
    );
    this.rawFetchCache.set(key, request);
    return request;
  }

  private postList<T>(
    method: string,
    collectionKeys: string[],
    normalize: (raw: Record<string, unknown>) => T,
    from?: Date,
    to?: Date
  ): Observable<T[]> {
    const body = {
      DateIn: toIsoDateOnly(from != null ? from : this.dateFrom),
      DateOut: toIsoDateOnly(to != null ? to : this.dateTo)
    };
    return this.http.post(BASE + method, body, {
      headers: JSON_HEADERS,
      responseType: 'text'
    }).pipe(
      map(text => normalizeRows(parsePayload(text), collectionKeys, normalize))
    );
  }
}

function toIsoDateOnly(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function formatClock(): string {
  const d = new Date();
  const hh = ('0' + d.getHours()).slice(-2);
  const mm = ('0' + d.getMinutes()).slice(-2);
  return hh + ':' + mm;
}

function parsePayload(raw: string): unknown {
  const text = unwrapXmlString((raw || '').trim());
  if (!text) {
    return null;
  }
  const parsed = parseJsonBodyMaybeWithTrailingHtml(text);
  const unwrapped = unwrapAspNetD(parsed);
  if (unwrapped != null && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    const o = unwrapped as Record<string, unknown>;
    if (Array.isArray(o['Cases'])) {
      return o['Cases'];
    }
    if (Array.isArray(o['Departments'])) {
      return o['Departments'];
    }
  }
  return unwrapped;
}

function unwrapXmlString(raw: string): string {
  if (!raw) {
    return '';
  }
  if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
    return raw;
  }
  const match = raw.match(/<(?:string|diffgr:DocumentElement|DocumentElement)[^>]*>([\s\S]*?)<\/(?:string|diffgr:DocumentElement|DocumentElement)>/i);
  if (!match) {
    return raw;
  }
  return decodeXml(match[1].trim());
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function unwrapAspNetD(res: unknown): unknown {
  if (res == null) {
    return null;
  }
  if (typeof res === 'object' && res !== null && 'd' in res) {
    const d = (res as { d: unknown }).d;
    if (typeof d === 'string') {
      const s = d.trim();
      if (!s) {
        return null;
      }
      try {
        return JSON.parse(s);
      } catch {
        return parseJsonBodyMaybeWithTrailingHtml(s);
      }
    }
    return d;
  }
  return res;
}

function parseJsonBodyMaybeWithTrailingHtml(raw: string): unknown | null {
  const s = (raw || '').trim();
  if (!s) {
    return null;
  }
  let cut = -1;
  const markers = [/<!DOCTYPE\b/i, /<\s*html\b/i];
  for (let i = 0; i < markers.length; i++) {
    const idx = s.search(markers[i]);
    if (idx >= 0 && (cut < 0 || idx < cut)) {
      cut = idx;
    }
  }
  const jsonPart = cut >= 0 ? s.slice(0, cut).trim() : s;
  try {
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

function normalizeRows<T>(
  payload: unknown,
  collectionKeys: string[],
  normalize: (raw: Record<string, unknown>) => T
): T[] {
  const list = extractArray(payload, collectionKeys);
  return list
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && !Array.isArray(item))
    .map(normalize);
}

function extractArray(payload: unknown, collectionKeys: string[]): unknown[] {
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload !== 'object') {
    return [];
  }
  const o = payload as Record<string, unknown>;
  for (let i = 0; i < collectionKeys.length; i++) {
    const value = o[collectionKeys[i]];
    if (Array.isArray(value)) {
      return value;
    }
  }
  const keys = Object.keys(o);
  for (let i = 0; i < keys.length; i++) {
    const value = o[keys[i]];
    if (Array.isArray(value)) {
      return value;
    }
  }
  if (o['Message'] != null && o['Department'] == null && o['Admission_No'] == null && o['DepartmentName'] == null) {
    return [];
  }
  return [o];
}

function normalizeDepartmentRow(raw: Record<string, unknown>): InvasiveDepartmentRow {
  const filled = numVal(raw['Total_Filled']);
  const missing = numVal(raw['Total_NotFilled']);
  let completion = toPercent(raw['Overall_Fill_Percentage']);
  if (completion === 0 && (filled + missing) > 0) {
    completion = round1((filled / (filled + missing)) * 100);
  }
  return {
    Unit: raw['Unit'] != null ? raw['Unit'] as number | string : '',
    Name: strVal(raw['Name']),
    Total_Cases: numVal(raw['Total_Cases']),
    Avg_SignIn_Score: toPercent(raw['Avg_SignIn_Score']),
    Avg_TimeOut_Score: toPercent(raw['Avg_TimeOut_Score']),
    Avg_SignOut_Score: toPercent(raw['Avg_SignOut_Score']),
    Avg_Total_Score: toPercent(raw['Avg_Total_Score']),
    Total_Filled: filled,
    Total_NotFilled: missing,
    Overall_Fill_Percentage: completion
  };
}

function normalizeCaseRow(raw: Record<string, unknown>): InvasiveCaseRow {
  return {
    Unit: raw['Unit'] != null ? raw['Unit'] as number | string : undefined,
    Department: strVal(raw['Department']),
    Admission_No: strVal(raw['Admission_No']),
    Medical_Record: strVal(raw['Medical_Record']),
    Procedure_Name: strVal(raw['Procedure_Name']),
    SignIn_Filled: numVal(raw['SignIn_Filled']),
    SignIn_NotFilled: numVal(raw['SignIn_NotFilled']),
    SignIn_Score: toPercent(raw['SignIn_Score']),
    TimeOut_Filled: numVal(raw['TimeOut_Filled']),
    TimeOut_NotFilled: numVal(raw['TimeOut_NotFilled']),
    TimeOut_Score: toPercent(raw['TimeOut_Score']),
    SignOut_Filled: numVal(raw['SignOut_Filled']),
    SignOut_NotFilled: numVal(raw['SignOut_NotFilled']),
    SignOut_Score: toPercent(raw['SignOut_Score']),
    Total_Filled: numVal(raw['Total_Filled']),
    Total_NotFilled: numVal(raw['Total_NotFilled']),
    Total_Score: toPercent(raw['Total_Score']),
    SignIn_Doctor_Status: strVal(raw['SignIn_Doctor_Status']),
    SignIn_Nurse_Status: strVal(raw['SignIn_Nurse_Status']),
    TimeOut_Doctor_Status: strVal(raw['TimeOut_Doctor_Status']),
    TimeOut_Nurse_Status: strVal(raw['TimeOut_Nurse_Status']),
    SignOut_Doctor_Status: strVal(raw['SignOut_Doctor_Status']),
    SignOut_Nurse_Status: strVal(raw['SignOut_Nurse_Status']),
    SignIn_Doctor_Name: strVal(raw['SignIn_Doctor_Name']),
    SignIn_Nurse_Name: strVal(raw['SignIn_Nurse_Name']),
    TimeOut_Doctor_Name: strVal(raw['TimeOut_Doctor_Name']),
    TimeOut_Nurse_Name: strVal(raw['TimeOut_Nurse_Name']),
    SignOut_Doctor_Name: strVal(raw['SignOut_Doctor_Name']),
    SignOut_Nurse_Name: strVal(raw['SignOut_Nurse_Name'])
  };
}

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (raw[key] != null && raw[key] !== '') {
      return raw[key];
    }
  }
  const map: { [k: string]: unknown } = {};
  const rawKeys = Object.keys(raw);
  for (let i = 0; i < rawKeys.length; i++) {
    map[rawKeys[i].toLowerCase().replace(/[\s_]/g, '')] = raw[rawKeys[i]];
  }
  for (let i = 0; i < keys.length; i++) {
    const compact = keys[i].toLowerCase().replace(/[\s_]/g, '');
    if (map[compact] != null && map[compact] !== '') {
      return map[compact];
    }
  }
  return null;
}

function strVal(v: unknown): string {
  if (v == null) {
    return '';
  }
  return String(v).trim();
}

function numVal(v: unknown): number {
  if (v == null || v === '') {
    return 0;
  }
  const n = Number(String(v).replace('%', '').replace(',', ''));
  return isFinite(n) ? n : 0;
}

function toPercent(v: unknown): number {
  const n = numVal(v);
  if (!isFinite(n) || n === 0) {
    return 0;
  }
  if (n > 0 && n <= 1) {
    return round1(n * 100);
  }
  return round1(n);
}

function apiErrorMessage(err: any, fallback: string): string {
  if (err && err.error && typeof err.error.Message === 'string' && err.error.Message) {
    return err.error.Message;
  }
  if (err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}
