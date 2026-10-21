import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  EmployeeFormCompletionResult,
  EmployeeFormCompletionRow,
  emptyResult,
} from './employee-form-completion.models';

const BASE_URL = (environment.url || '').replace(/\/?$/, '/');
const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class EmployeeFormCompletionService {
  constructor(private http: HttpClient) {}

  fetch(): Observable<EmployeeFormCompletionResult> {
    return this.http
      .post<{ d: EmployeeFormCompletionResult }>(
        `${BASE_URL}FetchEmployeeFormCompletion`,
        {},
        { headers: JSON_HEADERS },
      )
      .pipe(
        map((response) => normalizeResult(response?.d)),
        catchError(asmxError),
      );
  }
}

function normalizeResult(raw: EmployeeFormCompletionResult | null | undefined): EmployeeFormCompletionResult {
  if (!raw || typeof raw !== 'object') {
    return emptyResult();
  }
  const employees = Array.isArray(raw.Employees) ? raw.Employees : [];
  return {
    TotalEmployees: numVal(raw.TotalEmployees),
    CompletedEmployees: numVal(raw.CompletedEmployees),
    CompletionRate: numVal(raw.CompletionRate),
    Employees: employees.map((row) => normalizeRow(row as unknown as Record<string, unknown>)),
  };
}

function normalizeRow(raw: Record<string, unknown>): EmployeeFormCompletionRow {
  return {
    EmployeeID: strVal(raw['EmployeeID']),
    FirstName: strVal(raw['FirstName']),
    LastName: strVal(raw['LastName']),
    Department: strVal(raw['Department']),
    HasCompletedForm:
      raw['HasCompletedForm'] === true || raw['HasCompletedForm'] === 'true' || raw['HasCompletedForm'] === 1,
    FormFillId: strVal(raw['FormFillId']),
  };
}

function strVal(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function numVal(v: unknown): number {
  if (v == null || v === '') {
    return 0;
  }
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function asmxError(err: HttpErrorResponse): Observable<never> {
  const message = typeof err.error?.Message === 'string' ? err.error.Message : null;
  if (!message) {
    return throwError(err);
  }
  return throwError(
    new HttpErrorResponse({
      error: { error: message },
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? undefined,
    }),
  );
}
