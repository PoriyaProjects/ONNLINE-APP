import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { RehabilitationOccupancyDto } from './rehabilitation-occupancy.models';

const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class RehabilitationOccupancyApiService {
  private readonly base = (environment.url || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  /** Single ASMX endpoint: GetRehabilitationOccupancy(FromDate, ToDate) */
  getRehabilitationOccupancy(fromDate: string, toDate: string): Observable<RehabilitationOccupancyDto[]> {
    return this.http.post<unknown>(this.base + 'GetRehabilitationOccupancy', {
      FromDate: fromDate,
      ToDate: toDate,
    }, { headers: JSON_HEADERS }).pipe(
      map((response) => this.normalizeList(response)),
      catchError((err) => {
        console.error('[RehabilitationOccupancyApi] GetRehabilitationOccupancy failed', err);
        return of([]);
      }),
    );
  }

  getRehabilitationOccupancyByDate(date: string): Observable<RehabilitationOccupancyDto[]> {
    return this.getRehabilitationOccupancy(date, date);
  }

  private normalizeList(raw: unknown): RehabilitationOccupancyDto[] {
    let payload: unknown = raw;
    if (payload && typeof payload === 'object' && (payload as { d?: unknown }).d != null) {
      payload = (payload as { d: unknown }).d;
    }
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(payload)) {
      return [];
    }
    return payload
      .map((row) => this.normalizeRow(row))
      .filter((row) => !!row.departmentName);
  }

  private normalizeRow(raw: unknown): RehabilitationOccupancyDto {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      unit: Number(row.Unit ?? row.unit ?? 0),
      departmentName: String(row.DepartmentName ?? row.departmentName ?? '').trim(),
      occupiedPatients: Number(row.OccupiedPatients ?? row.occupiedPatients ?? 0),
    };
  }

  private normalizeDate(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      const dotnetMatch = /\/Date\((\d+)\)\//.exec(value);
      if (dotnetMatch) {
        return new Date(Number(dotnetMatch[1])).toISOString().slice(0, 10);
      }
      if (value.length >= 10) {
        return value.slice(0, 10);
      }
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value);
  }
}
