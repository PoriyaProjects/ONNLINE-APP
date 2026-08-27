import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment } from '../constants/rehabilitation-bed-capacity.constants';
import { RehabilitationAvgLengthOfStayDto } from '../models/rehabilitation-avg-los.models';
import { postRehabAsmx, parseRehabAsmxListResponse } from '../utils/rehabilitation-asmx-request.util';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';

const METHOD = 'GetRehabilitationAvgLengthOfStay';

@Injectable({ providedIn: 'root' })
export class RehabilitationAvgLosApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRehabilitationAvgLengthOfStay(
    fromDate: string,
    toDate: string,
  ): Observable<RehabilitationAvgLengthOfStayDto[]> {
    return this.cache.getCachedOrFetch(
      METHOD,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationAvgLosApi] GetRehabilitationAvgLengthOfStay failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(fromDate: string, toDate: string): void {
    this.cache.invalidate(METHOD, fromDate, toDate);
  }

  peekCache(fromDate: string, toDate: string): RehabilitationAvgLengthOfStayDto[] | null {
    return this.cache.get(METHOD, fromDate, toDate);
  }

  private normalizeList(raw: unknown): RehabilitationAvgLengthOfStayDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationAvgLengthOfStayDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationAvgLengthOfStayDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawName = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawName, unit || undefined);
    if (!canonical) {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      unit,
      departmentName: canonical,
      avgLosDays: Number(row.AvgLosDays ?? row.avgLosDays ?? 0),
      patientCount: Number(row.PatientCount ?? row.patientCount ?? 0),
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
