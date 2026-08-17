import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment } from './rehabilitation-bed-capacity.constants';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';
import { postRehabAsmx, parseRehabAsmxListResponse } from './rehabilitation-asmx-request.util';
import { RehabilitationOccupancyDto } from './rehabilitation-occupancy.models';

const METHOD = 'GetRehabilitationOccupancy';

@Injectable({ providedIn: 'root' })
export class RehabilitationOccupancyApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  /** ASMX POST JSON — opening the URL in a browser (GET) will fail with Missing parameter: FromDate. */
  getRehabilitationOccupancy(fromDate: string, toDate: string): Observable<RehabilitationOccupancyDto[]> {
    return this.cache.getCachedOrFetch(
      METHOD,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationOccupancyApi] GetRehabilitationOccupancy failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  getRehabilitationOccupancyByDate(date: string): Observable<RehabilitationOccupancyDto[]> {
    return this.getRehabilitationOccupancy(date, date);
  }

  invalidateCache(fromDate: string, toDate: string): void {
    this.cache.invalidate(METHOD, fromDate, toDate);
  }

  peekCache(fromDate: string, toDate: string): RehabilitationOccupancyDto[] | null {
    return this.cache.get(METHOD, fromDate, toDate);
  }

  private normalizeList(raw: unknown): RehabilitationOccupancyDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationOccupancyDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationOccupancyDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawName = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawName, unit || undefined);
    if (!canonical) {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      unit: Number(row.Unit ?? row.unit ?? 0),
      departmentName: canonical,
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
