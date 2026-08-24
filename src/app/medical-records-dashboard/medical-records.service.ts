import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  BoxDetailRow,
  BoxStatusSummary,
  CaseDetailRow,
  CasesPerDateSummary,
  MedicalRecordsDashboardDTO,
  MissingCasesSummary,
  WrongCaseDetailRow,
} from './medical-records.model';

function parseJsonBodyMaybeWithTrailingHtml(raw: string): unknown | null {
  const s = (raw || '').trim();
  if (!s) {
    return null;
  }
  let cut = -1;
  for (const re of [/<!DOCTYPE\b/i, /<\s*html\b/i]) {
    const i = s.search(re);
    if (i >= 0 && (cut < 0 || i < cut)) {
      cut = i;
    }
  }
  const jsonPart = cut >= 0 ? s.slice(0, cut).trim() : s;
  try {
    return JSON.parse(jsonPart) as unknown;
  } catch {
    return null;
  }
}

function unwrapAspNetD<T>(res: unknown): T | null {
  if (res == null) {
    return null;
  }
  if (typeof res === 'object' && res !== null && 'd' in res) {
    const d = (res as { d: unknown }).d;
    if (typeof d === 'string') {
      const s = d.trim();
      if (!s) {
        return null;
      }
      try {
        return JSON.parse(s) as T;
      } catch {
        return null;
      }
    }
    return d as T;
  }
  return res as T;
}

function asArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as T[];
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizePayload(payload: unknown): MedicalRecordsDashboardDTO {
  const obj = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};

  const boxStatusSummaries = asArray<Record<string, unknown>>(obj['BoxStatusSummaries'] ?? obj['boxStatusSummaries'])
    .map((r): BoxStatusSummary => ({
      Remarks: str(r['Remarks'] ?? r['remarks']),
      BoxCount: num(r['BoxCount'] ?? r['boxCount']),
    }));

  const casesPerDateSummaries = asArray<Record<string, unknown>>(obj['CasesPerDateSummaries'] ?? obj['casesPerDateSummaries'])
    .map((r): CasesPerDateSummary => ({
      MDate: str(r['MDate'] ?? r['mDate']),
      TotalCases: num(r['TotalCases'] ?? r['totalCases']),
    }));

  const missingCasesSummaries = asArray<Record<string, unknown>>(obj['MissingCasesSummaries'] ?? obj['missingCasesSummaries'])
    .map((r): MissingCasesSummary => ({
      BoxID: str(r['BoxID'] ?? r['boxId']),
      MissingCount: num(r['MissingCount'] ?? r['missingCount']),
    }));

  const boxDetails = asArray<Record<string, unknown>>(obj['BoxDetails'] ?? obj['boxDetails'])
    .map((r): BoxDetailRow => ({
      BoxID: str(r['BoxID'] ?? r['boxId']),
      InsertDate: str(r['InsertDate'] ?? r['insertDate']),
      QOnnline: (r['QOnnline'] ?? r['qOnnline']) as number | null | undefined,
      QNamer: num(r['QNamer'] ?? r['qNamer']),
      BoxStatus: num(r['BoxStatus'] ?? r['boxStatus']),
      Remarks: str(r['Remarks'] ?? r['remarks']),
    }));

  const caseDetails = asArray<Record<string, unknown>>(obj['CaseDetails'] ?? obj['caseDetails'])
    .map((r): CaseDetailRow => ({
      BoxID: str(r['BoxID'] ?? r['boxId']),
      CaseNumber: str(r['CaseNumber'] ?? r['caseNumber']),
      SavedByImageStore: str(r['SavedByImageStore'] ?? r['savedByImageStore']),
      MDate: str(r['MDate'] ?? r['mDate']),
    }));

  const wrongCaseDetails = asArray<Record<string, unknown>>(obj['WrongCaseDetails'] ?? obj['wrongCaseDetails'])
    .map((r): WrongCaseDetailRow => ({
      BoxID: str(r['BoxID'] ?? r['boxId']),
      CaseNumber: str(r['CaseNumber'] ?? r['caseNumber']),
    }));

  return {
    BoxStatusSummaries: boxStatusSummaries,
    CasesPerDateSummaries: casesPerDateSummaries,
    MissingCasesSummaries: missingCasesSummaries,
    BoxDetails: boxDetails,
    CaseDetails: caseDetails,
    WrongCaseDetails: wrongCaseDetails,
  };
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordsService {
  private readonly endpoint = `${(environment?.url || '').replace(/\/?$/, '/')}GetMedicalRecordsDashboardData`;

  constructor(private readonly http: HttpClient) {}

  getDashboardData(
    boxIdFilter?: string,
    statusFilter?: string,
    mDateFilter?: string
  ): Observable<MedicalRecordsDashboardDTO> {
    const params = new HttpParams()
      .set('boxIdFilter', boxIdFilter || '')
      .set('statusFilter', statusFilter || '')
      .set('mDateFilter', mDateFilter || '');

    return this.http.get(this.endpoint, { params, responseType: 'text' }).pipe(
      map(text => normalizePayload(unwrapAspNetD<unknown>(parseJsonBodyMaybeWithTrailingHtml(text)))),
      catchError(() => of(normalizePayload(null)))
    );
  }
}