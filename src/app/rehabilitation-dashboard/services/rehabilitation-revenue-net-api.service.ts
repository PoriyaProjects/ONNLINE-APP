import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment } from '../constants/rehabilitation-bed-capacity.constants';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';
import { postRehabAsmx, parseRehabAsmxListResponse } from '../utils/rehabilitation-asmx-request.util';
import { getRevenueNetDateRange } from '../mappers/rehabilitation-occupancy.mapper';
import { RehabilitationRevenueNetDto } from '../models/rehabilitation-revenue-net.models';

const METHOD = 'GetRehabilitationRevenueNet';
/** Server SQL ignores FromDate/ToDate — always returns rolling 12 months from GETDATE(). */
const CACHE_RANGE_KEY = 'rolling-12m';

@Injectable({ providedIn: 'root' })
export class RehabilitationRevenueNetApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRehabilitationRevenueNet(): Observable<RehabilitationRevenueNetDto[]> {
    const { fromDate, toDate } = getRevenueNetDateRange();
    return this.cache.getCachedOrFetch(
      METHOD,
      CACHE_RANGE_KEY,
      '',
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationRevenueNetApi] GetRehabilitationRevenueNet failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(): void {
    this.cache.invalidate(METHOD, CACHE_RANGE_KEY, '');
  }

  peekCache(): RehabilitationRevenueNetDto[] | null {
    return this.cache.get(METHOD, CACHE_RANGE_KEY, '');
  }

  private normalizeList(raw: unknown): RehabilitationRevenueNetDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationRevenueNetDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationRevenueNetDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawDept = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawDept, unit || undefined);
    if (!canonical) {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      unit: Number(row.Unit ?? row.unit ?? 0),
      departmentName: canonical,
      revenueAmount: Number(row.RevenueAmount ?? row.revenueAmount ?? 0),
      revenuePerDay: Number(row.RevenuePerDay ?? row.revenuePerDay ?? 0),
      sharePercent: Number(row.SharePercent ?? row.sharePercent ?? 0),
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
