import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment } from './rehabilitation-bed-capacity.constants';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';
import { postRehabAsmx, parseRehabAsmxListResponse } from './rehabilitation-asmx-request.util';
import {
  normalizePayerName,
  RehabilitationAdmissionsByPayerDto,
} from './rehabilitation-admissions-payer.models';

const METHOD = 'GetRehabilitationAdmissionsByPayer';

@Injectable({ providedIn: 'root' })
export class RehabilitationAdmissionsPayerApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRehabilitationAdmissionsByPayer(
    fromDate: string,
    toDate: string,
  ): Observable<RehabilitationAdmissionsByPayerDto[]> {
    return this.cache.getCachedOrFetch(
      METHOD,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationAdmissionsPayerApi] GetRehabilitationAdmissionsByPayer failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(fromDate: string, toDate: string): void {
    this.cache.invalidate(METHOD, fromDate, toDate);
  }

  peekCache(fromDate: string, toDate: string): RehabilitationAdmissionsByPayerDto[] | null {
    return this.cache.get(METHOD, fromDate, toDate);
  }

  private normalizeList(raw: unknown): RehabilitationAdmissionsByPayerDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationAdmissionsByPayerDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationAdmissionsByPayerDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawDept = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawDept, unit || undefined);
    if (!canonical) {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      payerCategory: String(row.PayerCategory ?? row.payerCategory ?? '').trim(),
      payerName: normalizePayerName(String(row.PayerName ?? row.payerName ?? '')),
      admissionsCount: Number(row.AdmissionsCount ?? row.admissionsCount ?? 0),
      unit,
      departmentName: canonical,
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
