import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { GetClinicsDashboardDto } from './clinics-dashboard.component';

const BASE = (environment?.url || '').replace(/\/?$/, '/');

const JSON_HEADERS = new HttpHeaders({
  Accept: 'application/json; charset=utf-8',
  'Content-Type': 'application/json; charset=utf-8'
});

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

function asString(v: unknown): string {
  if (v == null) {
    return '';
  }
  return String(v).trim();
}

/** yyyy-MM-dd for reliable ASP.NET DateTime binding. */
function toIsoDateOnly(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function normalizeRow(raw: Record<string, unknown>): GetClinicsDashboardDto {
  return {
    VisitDate: asString(raw.VisitDate),
    ClinicName: asString(raw.ClinicName),
    Depart_Name: asString(raw.Depart_Name),
    StartTime: asString(raw.StartTime),
    EndTime: asString(raw.EndTime),
    Total: asString(raw.Total),
    Arrived: asString(raw.Arrived),
    NotArrived: asString(raw.NotArrived),
    ObejectPlanning: asString(raw.ObejectPlanning),
    AmountToRequest: asString(raw.AmountToRequest ?? raw.amountToRequest),
    WeekObject: asString(raw.WeekObject),
    WeekDayObject: asString(raw.WeekDayObject),
    PostHospitalizationVisit: asString(raw.PostHospitalizationVisit),
    PostScreeningVisit: asString(raw.PostScreeningVisit),
    Visited_Last1Month: asString(raw.Visited_Last1Month),
    Visited_Last3Months: asString(raw.Visited_Last3Months),
    FirstPatientEntryTime: asString(raw.FirstPatientEntryTime),
    LastPatientExitTime: asString(raw.LastPatientExitTime),
    // API field name; fallback if a legacy payload still sends FirstVisitThisYear
    NewPatientsToClinic: asString(raw.NewPatientsToClinic ?? raw.FirstVisitThisYear),
    PatientsWithoutOrder: asString(raw.PatientsWithoutOrder)
  };
}

function normalizeRows(payload: unknown): GetClinicsDashboardDto[] {
  if (payload == null) {
    return [];
  }
  const list = Array.isArray(payload) ? payload : [payload];
  return list
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && !Array.isArray(item))
    .map(normalizeRow);
}

function normalizeForwardRow(raw: Record<string, unknown>): GetClinicsDashboardDto {
  return {
    VisitDate: asString(raw.VisitDate),
    ClinicName: asString(raw.ClinicName),
    Depart_Name: asString(raw.Depart_Name),
    StartTime: asString(raw.StartTime),
    EndTime: asString(raw.EndTime),
    Total: asString(raw.Total),
    Arrived: '',
    NotArrived: '',
    ObejectPlanning: asString(raw.ObejectPlanning),
    AmountToRequest: asString(raw.AmountToRequest ?? raw.amountToRequest),
    WeekObject: asString(raw.WeekObject),
    WeekDayObject: '',
    PostHospitalizationVisit: asString(raw.PostHospitalizationVisit),
    PostScreeningVisit: asString(raw.PostScreeningVisit),
    Visited_Last1Month: asString(raw.Visited_Last1Month),
    Visited_Last3Months: asString(raw.Visited_Last3Months),
    FirstPatientEntryTime: '',
    LastPatientExitTime: '',
    NewPatientsToClinic: asString(raw.NewPatientsToClinic ?? raw.FirstVisitThisYear),
    PatientsWithoutOrder: asString(raw.PatientsWithoutOrder)
  };
}

function normalizeForwardRows(payload: unknown): GetClinicsDashboardDto[] {
  if (payload == null) {
    return [];
  }
  const list = Array.isArray(payload) ? payload : [payload];
  return list
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && !Array.isArray(item))
    .map(normalizeForwardRow);
}

@Injectable({ providedIn: 'root' })
export class ClinicsDashboardService {

  constructor(private http: HttpClient) {}

  /**
   * POST WebService.asmx/GetClinicsDashboard
   * Body: { workDate: 'yyyy-MM-dd', dateOut: 'yyyy-MM-dd' }
   */
  getClinicsDashboard(workDate: Date, dateOut: Date): Observable<GetClinicsDashboardDto[]> {
    const body = {
      workDate: toIsoDateOnly(workDate),
      dateOut: toIsoDateOnly(dateOut)
    };

    return this.http.post(BASE + 'GetClinicsDashboard', body, {
      headers: JSON_HEADERS,
      responseType: 'text'
    }).pipe(
      map(text => {
        const parsed = parseJsonBodyMaybeWithTrailingHtml(text);
        const unwrapped = unwrapAspNetD<unknown>(parsed);
        return normalizeRows(unwrapped);
      }),
      catchError(err => throwError(err))
    );
  }

  /**
   * POST WebService.asmx/GetClinicsDashboardForward
   * Body: { workDate: 'yyyy-MM-dd', dateOut: 'yyyy-MM-dd' }
   */
  getClinicsDashboardForward(workDate: Date, dateOut: Date): Observable<GetClinicsDashboardDto[]> {
    const body = {
      workDate: toIsoDateOnly(workDate),
      dateOut: toIsoDateOnly(dateOut)
    };

    return this.http.post(BASE + 'GetClinicsDashboardForward', body, {
      headers: JSON_HEADERS,
      responseType: 'text'
    }).pipe(
      map(text => {
        const parsed = parseJsonBodyMaybeWithTrailingHtml(text);
        const unwrapped = unwrapAspNetD<unknown>(parsed);
        return normalizeForwardRows(unwrapped);
      }),
      catchError(err => throwError(err))
    );
  }
}