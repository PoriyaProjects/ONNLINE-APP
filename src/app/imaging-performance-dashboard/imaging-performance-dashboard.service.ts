import { HttpClient, HttpHeaders } from '@angular/common/http';
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
export type OutpatientDepartmentCode = 'CT' | 'MRI';

export interface OutpatientImagingCaseRow {
  ItemID?: number;
  CreateDate?: string;
  AppoitmentDate?: string;
  ID?: string;
  PatientNumber?: string;
  FirstName?: string;
  LastName?: string;
  CaseNumber?: string;
  TechDate?: string;
  TechTime?: string;
  Depart?: string;
  DocDate?: string;
  DocTime?: string;
  DocName?: string;
  BKIDOT?: string;
  DIMOTAN?: string;
  TOR?: string;
  /** Calendar days from CreateDate to TOR (computed client-side). */
  DaysDiff?: number;
  /** Total hours from CreateDate to TOR (computed client-side). */
  HoursDiff?: number;
  MinutesCreateToBkidot?: number;
  MinutesBkidotToDimotan?: number;
  MinutesDimotanToTor?: number;
  /** TechDate+TechTime → DocDate+DocTime (backend: Minutes_To_Decision). */
  MinutesToDecision?: number;
}

export interface OutpatientImagingDoctor {
  DocName: string;
  CaseCount: number;
  AvgMinutesToDecision: number;
}

export interface OutpatientImagingDailyTrend {
  Day: string;
  CaseCount: number;
  AvgMinutesToDecision: number;
}

export interface OutpatientPipelineStage {
  Key: string;
  LabelHe: string;
  AvgMinutes: number;
  CaseCount: number;
}

export interface OutpatientImagingResult {
  TotalCases: number;
  DistinctPatients: number;
  AvgMinutesCreateToBkidot: number;
  AvgMinutesBkidotToDimotan: number;
  AvgMinutesDimotanToTor: number;
  /** Average Tech → Doc report time (backend: AvgMinutes_To_Decision). */
  AvgMinutesToDecision: number;
  /** Average calendar days CreateDate → TOR (from row Details). */
  AvgDaysCreateToTor: number;
  /** Average hours CreateDate → TOR (from row Details). */
  AvgHoursCreateToTor: number;
  PipelineStages: OutpatientPipelineStage[];
  Doctors: OutpatientImagingDoctor[];
  DailyTrend: OutpatientImagingDailyTrend[];
  Details: OutpatientImagingCaseRow[];
  Message?: string;
}

function normalizeOutpatientCaseRow(r: Record<string, unknown>): OutpatientImagingCaseRow {
  return {
    ItemID: numVal(r['ItemID'] ?? r['itemID']),
    CreateDate: strVal(r['CreateDate'] ?? r['createDate']),
    AppoitmentDate: strVal(r['AppoitmentDate'] ?? r['appoitmentDate'] ?? r['AppointmentDate']),
    ID: strVal(r['ID'] ?? r['Id']),
    PatientNumber: strVal(r['PatientNumber'] ?? r['patientNumber']),
    FirstName: strVal(r['FirstName'] ?? r['firstName']),
    LastName: strVal(r['LastName'] ?? r['lastName']),
    CaseNumber: strVal(r['CaseNumber'] ?? r['caseNumber']),
    TechDate: strVal(r['TechDate'] ?? r['techDate']),
    TechTime: strVal(r['TechTime'] ?? r['techTime']),
    Depart: strVal(r['Depart'] ?? r['depart']),
    DocDate: strVal(r['DocDate'] ?? r['docDate']),
    DocTime: strVal(r['DocTime'] ?? r['docTime']),
    DocName: strVal(r['DocName'] ?? r['docName']),
    BKIDOT: strVal(r['BKIDOT'] ?? r['Bkidot'] ?? r['bkidot']),
    DIMOTAN: strVal(r['DIMOTAN'] ?? r['Dimotan'] ?? r['dimotan']),
    TOR: strVal(r['TOR'] ?? r['Tor'] ?? r['tor']),
    MinutesCreateToBkidot: numVal(
      r['MinutesCreateToBkidot'] ?? r['minutesCreateToBkidot'] ?? r['Minutes_Create_To_Bkidot']
    ),
    MinutesBkidotToDimotan: numVal(
      r['MinutesBkidotToDimotan'] ?? r['minutesBkidotToDimotan'] ?? r['Minutes_Bkidot_To_Dimotan']
    ),
    MinutesDimotanToTor: numVal(
      r['MinutesDimotanToTor'] ?? r['minutesDimotanToTor'] ?? r['Minutes_Dimotan_To_Tor']
    ),
    MinutesToDecision: numVal(
      r['Minutes_To_Decision'] ?? r['MinutesToDecision'] ?? r['minutesToDecision']
        ?? r['MinutesTechToDoc'] ?? r['minutesTechToDoc'] ?? r['Minutes_Tech_To_Doc']
    ),
  };
}

function avgMinutes(details: OutpatientImagingCaseRow[], pick: (r: OutpatientImagingCaseRow) => number | undefined): number {
  const vals = details.map(pick).filter((n): n is number => n != null && Number.isFinite(n));
  if (!vals.length) {
    return 0;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function numFromPayload(o: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const n = Number(o[k]);
    if (Number.isFinite(n) && n !== 0) {
      return n;
    }
  }
  return 0;
}

const OUTPATIENT_PIPELINE_LABELS: Record<string, string> = {
  CreateToBkidot: 'יצירה ← פקידות',
  BkidotToDimotan: 'פקידות ← דימותן',
  DimotanToTor: 'דימותן ← קביעת תור',
  TechToDoc: 'הדמיה ← דיווח רופא',
  ToDecision: 'הדמיה ← דיווח רופא',
  TotalProcess: 'יצירה ← קביעת תור (סה״כ)',
};

function parseApiDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  let s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s) && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar days between CreateDate and TOR (by local date). */
function differenceInDays(from: Date, to: Date): number {
  const ms = startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Total whole hours between two datetimes. */
function differenceInHours(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 3_600_000);
}

function enrichCreateToTorDiff(row: OutpatientImagingCaseRow): OutpatientImagingCaseRow {
  const create = parseApiDate(row.CreateDate);
  const tor = parseApiDate(row.TOR);
  if (!create || !tor || tor.getTime() < create.getTime()) {
    return row;
  }
  return {
    ...row,
    DaysDiff: differenceInDays(create, tor),
    HoursDiff: differenceInHours(create, tor),
  };
}

function avgNumeric(details: OutpatientImagingCaseRow[], pick: (r: OutpatientImagingCaseRow) => number | undefined): number {
  const vals = details.map(pick).filter((n): n is number => n != null && Number.isFinite(n));
  if (!vals.length) {
    return 0;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function rtlStageLabel(label: string): string {
  return (label || '').replace(/\s*→\s*/g, ' ← ');
}

function normalizeOutpatientResult(raw: unknown): OutpatientImagingResult | null {
  const payload = unwrapAspNetD<unknown>(raw);
  if (payload == null || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const detailsRaw = o['Details'] ?? o['Cases'] ?? o['Rows'];
  const details = detailsRaw != null
    ? asArray<unknown>(detailsRaw)
      .filter((item): item is Record<string, unknown> =>
        item != null && typeof item === 'object' && !Array.isArray(item))
      .map(normalizeOutpatientCaseRow)
      .map(enrichCreateToTorDiff)
    : [];

  const avgDaysCreateToTor = avgNumeric(details, r => r.DaysDiff);
  const avgHoursCreateToTor = avgNumeric(details, r => r.HoursDiff);

  let avgCreateToBkidot = numFromPayload(
    o,
    'AvgMinutesCreateToBkidot',
    'AvgMinutes_CreateToBkidot',
    'AvgMinutes_Create_To_Bkidot'
  );
  let avgBkidotToDimotan = numFromPayload(
    o,
    'AvgMinutesBkidotToDimotan',
    'AvgMinutes_BkidotToDimotan',
    'AvgMinutes_Bkidot_To_Dimotan'
  );
  let avgDimotanToTor = numFromPayload(
    o,
    'AvgMinutesDimotanToTor',
    'AvgMinutes_DimotanToTor',
    'AvgMinutes_Dimotan_To_Tor'
  );
  let avgToDecision = numFromPayload(
    o,
    'AvgMinutesToDecision',
    'AvgMinutes_To_Decision',
    'AvgMinutesTechToDoc',
    'AvgMinutes_Tech_To_Doc'
  );

  if (!avgCreateToBkidot && details.length) {
    avgCreateToBkidot = avgMinutes(details, r => r.MinutesCreateToBkidot);
  }
  if (!avgBkidotToDimotan && details.length) {
    avgBkidotToDimotan = avgMinutes(details, r => r.MinutesBkidotToDimotan);
  }
  if (!avgDimotanToTor && details.length) {
    avgDimotanToTor = avgMinutes(details, r => r.MinutesDimotanToTor);
  }
  if (!avgToDecision && details.length) {
    avgToDecision = avgMinutes(details, r => r.MinutesToDecision);
  }

  const pipelineRaw = o['PipelineStages'] ?? o['Stages'];
  let pipeline = asArray<OutpatientPipelineStage>(pipelineRaw).map(s => ({
    ...s,
    LabelHe: rtlStageLabel(OUTPATIENT_PIPELINE_LABELS[s.Key] ?? s.LabelHe ?? ''),
  }));

  const pipelineAvgByKey: Record<string, number> = {
    CreateToBkidot: avgCreateToBkidot,
    BkidotToDimotan: avgBkidotToDimotan,
    DimotanToTor: avgDimotanToTor,
    TechToDoc: avgToDecision,
    ToDecision: avgToDecision,
  };

  pipeline = pipeline.map(s => {
    const fallback = pipelineAvgByKey[s.Key];
    const avg = (s.AvgMinutes > 0 ? s.AvgMinutes : fallback) ?? 0;
    return {
      ...s,
      LabelHe: rtlStageLabel(OUTPATIENT_PIPELINE_LABELS[s.Key] ?? s.LabelHe ?? ''),
      AvgMinutes: avg,
    };
  });

  if (!pipeline.length) {
    pipeline = [
      { Key: 'CreateToBkidot', LabelHe: OUTPATIENT_PIPELINE_LABELS.CreateToBkidot, AvgMinutes: avgCreateToBkidot, CaseCount: details.length },
      { Key: 'BkidotToDimotan', LabelHe: OUTPATIENT_PIPELINE_LABELS.BkidotToDimotan, AvgMinutes: avgBkidotToDimotan, CaseCount: details.length },
      { Key: 'DimotanToTor', LabelHe: OUTPATIENT_PIPELINE_LABELS.DimotanToTor, AvgMinutes: avgDimotanToTor, CaseCount: details.length },
      { Key: 'TechToDoc', LabelHe: OUTPATIENT_PIPELINE_LABELS.TechToDoc, AvgMinutes: avgToDecision, CaseCount: details.length },
    ];
  }

  const doctorsRaw = asArray<Record<string, unknown>>(o['Doctors']);
  const doctors: OutpatientImagingDoctor[] = doctorsRaw.map(d => ({
    DocName: String(d['DocName'] ?? d['docName'] ?? ''),
    CaseCount: Number(d['CaseCount']) || 0,
    AvgMinutesToDecision: Number(
      d['AvgMinutesToDecision'] ?? d['AvgMinutes_To_Decision']
        ?? d['AvgMinutesTechToDoc'] ?? d['AvgMinutes_Tech_To_Doc']
    ) || 0,
  }));

  const trendRaw = asArray<Record<string, unknown>>(o['DailyTrend']);
  const dailyTrend: OutpatientImagingDailyTrend[] = trendRaw.map(t => ({
    Day: String(t['Day'] ?? t['day'] ?? ''),
    CaseCount: Number(t['CaseCount']) || 0,
    AvgMinutesToDecision: Number(
      t['AvgMinutesToDecision'] ?? t['AvgMinutes_To_Decision']
        ?? t['AvgMinutesTechToDoc'] ?? t['AvgMinutes_Tech_To_Doc']
    ) || 0,
  }));

  return {
    TotalCases: Number(o['TotalCases']) || details.length,
    DistinctPatients: Number(o['DistinctPatients']) || 0,
    AvgMinutesCreateToBkidot: avgCreateToBkidot,
    AvgMinutesBkidotToDimotan: avgBkidotToDimotan,
    AvgMinutesDimotanToTor: avgDimotanToTor,
    AvgMinutesToDecision: avgToDecision,
    AvgDaysCreateToTor: avgDaysCreateToTor,
    AvgHoursCreateToTor: avgHoursCreateToTor,
    PipelineStages: pipeline,
    Doctors: doctors,
    DailyTrend: dailyTrend,
    Details: details,
    Message: typeof o['Message'] === 'string' ? o['Message'] : undefined,
  };
}

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
    // ASMX ScriptMethods typically expect method args in POST body (not query string).
    // Sending parameters in the URL can lead to "500 Internal Server Error" for certain serializers.
    return this.http.post(url, { sourceType, fromDate, toDate }, { headers: this.jsonHeaders, responseType: 'text' }).pipe(
      map(text => normalizeResult(parseJsonBodyMaybeWithTrailingHtml(text))),
      catchError(() => of(null))
    );
  }

  getOutpatientData(
    department: OutpatientDepartmentCode,
    fromDate: string,
    toDate: string
  ): Observable<OutpatientImagingResult | null> {
    const url = BASE + 'GetImagingOutpatientPerformanceDashboard';
    return this.http.post(
      url,
      { department, fromDate, toDate },
      { headers: this.jsonHeaders, responseType: 'text' }
    ).pipe(
      map(text => normalizeOutpatientResult(parseJsonBodyMaybeWithTrailingHtml(text))),
      catchError(() => of(null))
    );
  }
}