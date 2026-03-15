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
}