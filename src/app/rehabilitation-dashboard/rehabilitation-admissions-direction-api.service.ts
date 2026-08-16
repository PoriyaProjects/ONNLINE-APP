import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { mapToOccupancyDepartment } from './rehabilitation-bed-capacity.constants';
import { RehabilitationApiCacheService } from './rehabilitation-api-cache.service';
import { postRehabAsmx, parseRehabAsmxListResponse } from './rehabilitation-asmx-request.util';
import { RehabilitationAdmissionsByDirectionDto } from './rehabilitation-admissions-direction.models';

const METHOD = 'GetRehabilitationAdmissionsByDirection';

@Injectable({ providedIn: 'root' })
export class RehabilitationAdmissionsDirectionApiService {
  constructor(
    private http: HttpClient,
    private cache: RehabilitationApiCacheService,
  ) {}

  getRehabilitationAdmissionsByDirection(
    fromDate: string,
    toDate: string,
  ): Observable<RehabilitationAdmissionsByDirectionDto[]> {
    return this.cache.getCachedOrFetch(
      METHOD,
      fromDate,
      toDate,
      () => postRehabAsmx(this.http, METHOD, fromDate, toDate).pipe(
        map((response) => this.normalizeList(response)),
        catchError((err) => {
          console.error('[RehabilitationAdmissionsDirectionApi] GetRehabilitationAdmissionsByDirection failed', err);
          return throwError(() => err);
        }),
      ),
    ).pipe(map((result) => result.value));
  }

  invalidateCache(fromDate: string, toDate: string): void {
    this.cache.invalidate(METHOD, fromDate, toDate);
  }

  peekCache(fromDate: string, toDate: string): RehabilitationAdmissionsByDirectionDto[] | null {
    return this.cache.get(METHOD, fromDate, toDate);
  }

  private normalizeList(raw: unknown): RehabilitationAdmissionsByDirectionDto[] {
    return parseRehabAsmxListResponse(raw)
      .map((row) => this.normalizeRow(row))
      .filter((row): row is RehabilitationAdmissionsByDirectionDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationAdmissionsByDirectionDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const unit = Number(row.Unit ?? row.unit ?? 0);
    const rawDept = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawDept, unit || undefined);
    if (!canonical) {
      return null;
    }
    const direction = String(row.Direction ?? row.direction ?? '').trim();
    if (direction !== 'פנים' && direction !== 'חוץ') {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      funderName: String(row.FunderName ?? row.funderName ?? '').trim(),
      direction,
      admissionsCount: Number(row.AdmissionsCount ?? row.admissionsCount ?? 0),
      unit: Number(row.Unit ?? row.unit ?? 0),
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
