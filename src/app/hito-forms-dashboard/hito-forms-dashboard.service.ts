import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const BASE = (environment?.url || '').replace(/\/?$/, '/');

const JSON_HEADERS = new HttpHeaders({
  'Accept': 'application/json',
  'Content-Type': 'application/json'
});

export interface HitoFormsDashboardStats {
  NumQuestionnaires: number;
  NumWorkers?: number;  /* distinct workers (RepName) who filled forms */
  Workers?: string[];  /* list of distinct RepName for current filters */
  NumDepartments: number;
  Grade: number;
  NumQuestions: number;
}

export interface HitoFormsChartItem {
  Label: string;
  Value: number;
}

export interface HitoFormQuestionItem {
  itemId: number;
  itemText: string;
}

export interface HitoQuestionScoreRow {
  formName_Name: string;
  itemId: number;
  itemText: string;
  totalAnswers: number;
  positiveAnswers: number;
  percentPositive: number; // 0..100
}

export interface HitoAnswerScoreRow {
  department: string;
  Record_ID: number;
  DDate: string;
  DYear: number;
  DMonth: number;
  itemText: string;
  formName_Name: string;
  IntScore: number;
}

function unwrapD<T>(res: T | { d: T }): T {
  if (res != null && typeof res === 'object' && 'd' in res) {
    const d = (res as { d: T }).d;
    if (typeof d === 'string') {
      try { return JSON.parse(d) as T; } catch { return d as T; }
    }
    return d;
  }
  return res as T;
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value != null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.string)) return obj.string as T[];
    if (Array.isArray(obj.int)) return obj.int as T[];
    if (Array.isArray(obj.ArrayOfString)) return obj.ArrayOfString as T[];
    if (Array.isArray(obj.ArrayOfInt)) return obj.ArrayOfInt as T[];
  }
  return [];
}

function toStrings(arr: (string | number | null | undefined)[]): string[] {
  return arr.map(x => (x != null && x !== '') ? String(x) : '').filter(s => s !== '');
}

@Injectable({ providedIn: 'root' })
export class HitoFormsDashboardService {

  constructor(private http: HttpClient) {}

  getQuestionnaireNames(search?: string): Observable<string[]> {
    const url = BASE + 'GetHitoFormsQuestionnaireNames';
    return this.http.post<unknown>(url, { search: search?.trim() || '' }, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  getYears(): Observable<string[]> {
    const url = BASE + 'GetHitoFormsYears';
    return this.http.post<unknown>(url, {}, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<number | string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  getQuarters(): Observable<string[]> {
    const url = BASE + 'GetHitoFormsQuarters';
    return this.http.post<unknown>(url, {}, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<number | string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  getDepartments(): Observable<string[]> {
    const url = BASE + 'GetHitoFormsDepartments';
    return this.http.post<unknown>(url, {}, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  getDashboardStats(params: {
    year?: string;
    quarter?: string;
    formNameFilter?: string;
    departmentFilter?: string;
  }): Observable<HitoFormsDashboardStats | null> {
    const url = BASE + 'GetHitoFormsDashboardStats';
    const body = {
      year: params.year || '',
      quarter: params.quarter || '',
      formNameFilter: (params.formNameFilter || '').trim(),
      departmentFilter: (params.departmentFilter || '').trim()
    };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => unwrapD(res) as HitoFormsDashboardStats),
      catchError(() => of(null))
    );
  }

  getChartData(params: {
    year?: string;
    quarter?: string;
    formNameFilter?: string;
    departmentFilter?: string;
  }): Observable<HitoFormsChartItem[]> {
    const url = BASE + 'GetHitoFormsChartData';
    const body = {
      year: params.year || '',
      quarter: params.quarter || '',
      formNameFilter: (params.formNameFilter || '').trim(),
      departmentFilter: (params.departmentFilter || '').trim()
    };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => {
        const arr = unwrapD(res);
        return Array.isArray(arr) ? arr : [];
      }),
      catchError(() => of([]))
    );
  }

  /** Questions-mode: list of questions (items) for a given form. Backend needs to implement. */
  getQuestionsByForm(params: { formName_Name: string }): Observable<HitoFormQuestionItem[]> {
    const url = BASE + 'GetHitoQuestionsByForm';
    const body = { formName_Name: (params.formName_Name || '').trim() };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => {
        const arr = unwrapD(res);
        return Array.isArray(arr) ? (arr as HitoFormQuestionItem[]) : [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Questions-mode: aggregated % by question (Score=1 vs all answers) for a given form.
   * Backend needs to implement.
   */
  getQuestionScores(params: {
    year?: string;
    formName_Name: string;
    itemIdsCsv?: string; // optional comma list
  }): Observable<HitoQuestionScoreRow[]> {
    const url = BASE + 'GetHitoQuestionScores';
    const body = {
      year: params.year || '',
      formName_Name: (params.formName_Name || '').trim(),
      itemIdsCsv: (params.itemIdsCsv || '').trim()
    };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => {
        const arr = unwrapD(res);
        return Array.isArray(arr) ? (arr as HitoQuestionScoreRow[]) : [];
      }),
      catchError(() => of([]))
    );
  }

  /** Questions-mode: distinct form names from HITO_Answer_Score_TempNew. */
  getHitoAnswerScoreForms(): Observable<string[]> {
    const url = BASE + 'GetHitoAnswerScoreForms';
    return this.http.post<unknown>(url, {}, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  /** Questions-mode: distinct question texts; optional formNames filter (comma-separated). */
  getHitoAnswerScoreQuestions(formNames?: string): Observable<string[]> {
    const url = BASE + 'GetHitoAnswerScoreQuestions';
    const body = { formNames: (formNames || '').trim() };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => toStrings(ensureArray<string>(unwrapD(res)))),
      catchError(err => throwError(() => err))
    );
  }

  /** Questions-mode: raw rows by selected question text. */
  getHitoAnswerScoreRowsByQuestion(params: { itemText: string }): Observable<HitoAnswerScoreRow[]> {
    const url = BASE + 'GetHitoAnswerScoreRowsByQuestion';
    const body = { itemText: (params.itemText || '').trim() };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => {
        const arr = unwrapD(res);
        return Array.isArray(arr) ? (arr as HitoAnswerScoreRow[]) : [];
      }),
      catchError(() => of([]))
    );
  }

  /** Questions-mode: raw rows by multiple selected question texts (comma-separated). */
  getHitoAnswerScoreRowsByQuestions(params: { itemTexts: string; formNames?: string }): Observable<HitoAnswerScoreRow[]> {
    const url = BASE + 'GetHitoAnswerScoreRowsByQuestions';
    const body = {
      itemTexts: (params.itemTexts || '').trim(),
      formNames: (params.formNames || '').trim()
    };
    return this.http.post<unknown>(url, body, { headers: JSON_HEADERS }).pipe(
      map(res => {
        const arr = unwrapD(res);
        return Array.isArray(arr) ? (arr as HitoAnswerScoreRow[]) : [];
      }),
      catchError(() => of([]))
    );
  }
}
