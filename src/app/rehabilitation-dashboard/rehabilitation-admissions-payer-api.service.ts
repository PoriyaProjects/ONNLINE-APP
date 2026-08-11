import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { mapToOccupancyDepartment } from './rehabilitation-bed-capacity.constants';
import { RehabilitationAdmissionsByPayerDto } from './rehabilitation-admissions-payer.models';

const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class RehabilitationAdmissionsPayerApiService {
  private readonly base = (environment.url || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  getRehabilitationAdmissionsByPayer(
    fromDate: string,
    toDate: string,
  ): Observable<RehabilitationAdmissionsByPayerDto[]> {
    return this.http.post<unknown>(this.base + 'GetRehabilitationAdmissionsByPayer', {
      FromDate: fromDate,
      ToDate: toDate,
    }, { headers: JSON_HEADERS }).pipe(
      map((response) => this.normalizeList(response)),
      catchError((err) => {
        console.error('[RehabilitationAdmissionsPayerApi] GetRehabilitationAdmissionsByPayer failed', err);
        return throwError(() => err);
      }),
    );
  }

  private normalizeList(raw: unknown): RehabilitationAdmissionsByPayerDto[] {
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
      .filter((row): row is RehabilitationAdmissionsByPayerDto => row != null);
  }

  private normalizeRow(raw: unknown): RehabilitationAdmissionsByPayerDto | null {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rawDept = String(row.DepartmentName ?? row.departmentName ?? '').trim();
    const canonical = mapToOccupancyDepartment(rawDept);
    if (!canonical) {
      return null;
    }
    return {
      date: this.normalizeDate(row.Date ?? row.date),
      payerCategory: String(row.PayerCategory ?? row.payerCategory ?? '').trim(),
      payerName: String(row.PayerName ?? row.payerName ?? 'לא ידוע').trim(),
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
