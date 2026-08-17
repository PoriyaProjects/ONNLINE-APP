import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment, REHAB_OCCUPANCY_TARGET_PERCENT } from './rehabilitation-bed-capacity.constants';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';
import { postRehabAsmx, parseRehabAsmxListResponse } from './rehabilitation-asmx-request.util';
import { RehabilitationRecommendedTargetDto } from './rehabilitation-recommended-targets.models';

const METHOD = 'GetRehabilitationRecommendedTargets';

@Injectable({ providedIn: 'root' })
export class RehabilitationRecommendedTargetsApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRehabilitationRecommendedTargets(
    fromDate: string,
    toDate: string,
  ): Observable<RehabilitationRecommendedTargetDto[]> {
    return this.cache.getCachedOrFetch(
      METHOD,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationRecommendedTargetsApi] GetRehabilitationRecommendedTargets failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(fromDate: string, toDate: string): void {
    this.cache.invalidate(METHOD, fromDate, toDate);
  }

  peekCache(fromDate: string, toDate: string): RehabilitationRecommendedTargetDto[] | null {
    return this.cache.get(METHOD, fromDate, toDate);
  }

  private normalizeList(raw: unknown): RehabilitationRecommendedTargetDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationRecommendedTargetDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationRecommendedTargetDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawDept = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawDept, unit || undefined);
    if (!canonical) {
      return null;
    }
    const actualValue = Number(row.ActualValue ?? row.actualValue ?? 0);
    const targetValue = REHAB_OCCUPANCY_TARGET_PERCENT;
    const gap = Math.round((actualValue - targetValue) * 100) / 100;
    const totalOccupiedPatientDays = Number(
      row.TotalOccupiedPatientDays ?? row.totalOccupiedPatientDays ?? NaN,
    );
    const daysInPeriod = Number(row.DaysInPeriod ?? row.daysInPeriod ?? NaN);
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      unit: Number(row.Unit ?? row.unit ?? 0),
      departmentName: canonical,
      actualValue,
      targetValue,
      gap,
      metricType: String(row.MetricType ?? row.metricType ?? 'תפוסה').trim(),
      status: gap >= 0 ? 'עומד ביעד' : 'מתחת ליעד',
      totalOccupiedPatientDays: Number.isFinite(totalOccupiedPatientDays)
        ? totalOccupiedPatientDays
        : undefined,
      daysInPeriod: Number.isFinite(daysInPeriod) ? daysInPeriod : undefined,
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
