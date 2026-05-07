import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const BASE = (environment?.url || '').replace(/\/?$/, '/');

export interface ImagingDoctor {
  DocName: string;
  AvgMinutesToDecision: number;
  CaseCount: number;
}

export interface ImagingDailyTrend {
  Day: string;
  AvgMinutesToDecision: number;
  CaseCount: number;
}

/** One imaging case for the KPI drill-down; maps common ER / hospital API names (PascalCase). */
export interface ImagingCaseDetailRow {
  Id_Num?: string;
  Admission_No?: string;
  Admission_Date?: string;
  Patient_Name?: string;
  Department_Name?: string;
  Room_Name?: string;
  Doctor_Name?: string;
  ERBOE?: string;
  Send_Time?: string;
  Accept_Time?: string;
  MinutesToDecision?: number;
  Visit_Date?: string;
}

export interface ImagingPerformanceResult {
  TotalPatientsWithImaging: number;
  DistinctAdmissionCount: number;
  AvgMinutesToDecision: number;
  Doctors: ImagingDoctor[];
  DailyTrend: ImagingDailyTrend[];
  /** Normalized optional rows (legacy). */
  Details?: ImagingCaseDetailRow[];
  /** Exact objects returned under Details / CaseDetails / Cases (for dynamic table). */
  DetailsRaw?: Record<string, unknown>[];
  Message?: string;
}

/** Same ASMX / ScriptMethod JSON shape as GetEmergencyRoomPatients: prefer `data.d`, string JSON, or raw object. */
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

/**
 * ASMX may write valid JSON and then append an HTML error page when a late exception occurs
 * ("Server cannot clear headers after HTTP headers have been sent"). responseType: 'json' then fails.
 * Parse as text and use only the JSON prefix.
 */
function parseJsonBodyMaybeWithTrailingHtml(raw: string): unknown | null {
  const s = (raw ?? '').trim();
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

function asArray<T>(raw: unknown): T[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  if (typeof raw === 'object') {
    return [raw as unknown as T];
  }
  return [];
}

function extractDetailRawRows(raw: unknown): Record<string, unknown>[] {
  const list = asArray<unknown>(raw);
  return list
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({ ...item }));
}

function strVal(v: unknown): string | undefined {
  if (v == null) {
    return undefined;
  }
  const s = String(v).trim();
  return s || undefined;
}

function numVal(v: unknown): number | undefined {
  if (v == null || v === '') {
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Accept single object or array from ASMX (e.g. ImagingPerformanceCaseRow). */
function normalizeDetailRow(r: Record<string, unknown>): ImagingCaseDetailRow {
  return {
    Id_Num: strVal(r['Id_Num'] ?? r['id_Num'] ?? r['id_num']),
    Admission_No: strVal(
      r['Admission_No'] ?? r['admission_No'] ?? r['AdmissionNo'] ?? r['admissionNo'] ?? r['Admission']
    ),
    Admission_Date: strVal(r['Admission_Date'] ?? r['admission_Date'] ?? r['AdmissionDate'] ?? r['admissionDate']),
    Patient_Name: strVal(r['Patient_Name'] ?? r['patient_Name'] ?? r['PatientName']),
    Department_Name: strVal(
      r['Department_Name'] ?? r['department_Name'] ?? r['DepartmentName'] ?? r['DocDepart'] ?? r['docDepart']
    ),
    Room_Name: strVal(r['Room_Name'] ?? r['room_Name'] ?? r['RoomName']),
    Doctor_Name: strVal(
      r['Doctor_Name'] ?? r['doctor_Name'] ?? r['DoctorName'] ?? r['doctorName'] ?? r['DocName'] ?? r['docName'] ?? r['Doctor']
    ),
    ERBOE: strVal(r['ERBOE'] ?? r['Erboe']),
    Send_Time: strVal(
      r['Send_Time'] ?? r['send_Time'] ?? r['SendTime'] ?? r['sendTime'] ?? r['ImagingTime'] ?? r['imagingTime'] ?? r['Time'] ?? r['time']
    ),
    Accept_Time: strVal(
      r['Accept_Time'] ?? r['accept_Time'] ?? r['AcceptTime'] ?? r['acceptTime'] ?? r['DecisionTime'] ?? r['decisionTime']
    ),
    MinutesToDecision: numVal(
      r['MinutesToDecision'] ?? r['minutesToDecision'] ?? r['Minutes_To_Decision'] ?? r['minutes_To_Decision']
    ),
    Visit_Date: strVal(r['Visit_Date'] ?? r['visit_Date'] ?? r['VisitDate']),
  };
}

function asDetailRows(raw: unknown): ImagingCaseDetailRow[] {
  const list = asArray<unknown>(raw);
  return list
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && !Array.isArray(item))
    .map(normalizeDetailRow);
}

function normalizeResult(raw: unknown): ImagingPerformanceResult | null {
  const payload = unwrapAspNetD<unknown>(raw);
  if (payload == null || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const doctors = asArray<ImagingDoctor>(o['Doctors']);
  const daily = asArray<ImagingDailyTrend>(o['DailyTrend']);
  const detailsRaw = o['Details'] ?? o['CaseDetails'] ?? o['Cases'] ?? o['PatientRows'];
  const detailsParsed = detailsRaw != null ? asDetailRows(detailsRaw) : [];
  const detailsRawRows = detailsRaw != null ? extractDetailRawRows(detailsRaw) : [];
  return {
    TotalPatientsWithImaging: Number(o['TotalPatientsWithImaging']) || 0,
    DistinctAdmissionCount: Number(o['DistinctAdmissionCount']) || 0,
    AvgMinutesToDecision: Number(o['AvgMinutesToDecision']) || 0,
    Doctors: doctors,
    DailyTrend: daily,
    Details: detailsParsed,
    DetailsRaw: detailsRawRows,
    Message: typeof o['Message'] === 'string' ? o['Message'] : undefined,
  };
}

export type SourceType = 'EmergencyVisits' | 'OutpatientClinics';

@Injectable({ providedIn: 'root' })
export class ImagingPerformanceDashboardService {

  /** Match emergency-room-report: ASMX returns JSON when Accept asks for JSON (otherwise XML → parse error). */
  private readonly jsonHeaders = new HttpHeaders({
    Accept: 'application/json; charset=utf-8',
    'Content-Type': 'application/json; charset=utf-8',
  });

  constructor(private http: HttpClient) {}

  getData(
    sourceType: SourceType,
    fromDate: string,
    toDate: string
  ): Observable<ImagingPerformanceResult | null> {
    const url = BASE + 'GetImagingPerformanceDashboard';
    // ASP.NET ScriptService / RestHandler parses each GET value as JSON — bare EmergencyVisits is invalid;
    // JSON.stringify yields "EmergencyVisits" / "2026-05-01" which deserialize as strings.
    const params = new HttpParams()
      .set('sourceType', JSON.stringify(sourceType))
      .set('fromDate', JSON.stringify(fromDate))
      .set('toDate', JSON.stringify(toDate));

    return this.http.get(url, { params, headers: this.jsonHeaders, responseType: 'text' }).pipe(
      map(text => normalizeResult(parseJsonBodyMaybeWithTrailingHtml(text))),
      catchError(() => of(null))
    );
  }
}
