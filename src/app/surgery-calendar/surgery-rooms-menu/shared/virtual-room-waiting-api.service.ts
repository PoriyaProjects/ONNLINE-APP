import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NappWaitingProcedure, NappWaitingRow } from './virtual-room-waiting.models';
import { isSurgeryWaitingRow, parseRequestDate } from './virtual-room-slot-planner';

export type VirtualRoomWaitingApiErrorKind = 'missing_web_method' | 'http_error';

const MAX_PROCEDURE_ENRICH_ROWS = 40;
const MIN_SURGERY_DURATION_MINUTES = 15;

export class VirtualRoomWaitingApiError extends Error {
  constructor(
    public readonly kind: VirtualRoomWaitingApiErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'VirtualRoomWaitingApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class VirtualRoomWaitingApiService {
  constructor(private http: HttpClient) {}

  /** [WebGet] ASMX — parameters in query string. */
  private asmxGetParams(entries: Record<string, string | string[]>): HttpParams {
    let params = new HttpParams();
    Object.entries(entries).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const trimmed = String(item ?? '').trim();
          if (trimmed) {
            params = params.append(key, trimmed);
          }
        });
        return;
      }
      params = params.set(key, String(value ?? ''));
    });
    return params;
  }

  getWaitingCandidates(payload: {
    fullDate: string;
    calendarRoomsArea: string;
    roomGroupDesc?: string;
    roomCodes?: string[];
  }): Observable<NappWaitingRow[]> {
    const params = this.asmxGetParams({
      _fullDate: payload.fullDate,
      _calendarRoomsArea: payload.calendarRoomsArea,
      _roomGroupDesc: payload.roomGroupDesc ?? '',
      _roomCodes: payload.roomCodes ?? [],
    });

    return this.http
      .get(environment.url + 'GetNappWaitingForVirtualRoomScheduling', { params })
      .pipe(
        map((response: any) => this.normalizeRows(response)),
        map((rows) => this.filterRelevantWaitingRows(rows)),
        switchMap((rows) => this.enrichWaitingRowsWithProcedures(rows)),
        catchError((error) => throwError(() => this.toApiError(error)))
      );
  }

  getProceduresByRequestId(requestId: string): Observable<NappWaitingProcedure[]> {
    const trimmed = String(requestId ?? '').trim();
    if (!trimmed) {
      return of([]);
    }

    const params = this.asmxGetParams({ _RequestID: trimmed });

    return this.http
      .get(environment.url + 'getNappProceduresListByRequestID', { params })
      .pipe(
        map((response: any) => this.normalizeProcedures(response?.d ?? response) ?? []),
        catchError(() => of([]))
      );
  }

  private filterRelevantWaitingRows(rows: NappWaitingRow[]): NappWaitingRow[] {
    return rows
      .filter((row) => isSurgeryWaitingRow(row))
      .sort((a, b) => {
        const waitDiff = (Number(b.WaitingDays) || 0) - (Number(a.WaitingDays) || 0);
        if (waitDiff !== 0) {
          return waitDiff;
        }
        return parseRequestDate(a.RequestDate) - parseRequestDate(b.RequestDate);
      });
  }

  private enrichWaitingRowsWithProcedures(rows: NappWaitingRow[]): Observable<NappWaitingRow[]> {
    const missing = rows
      .filter((row) => row.RequestID && (!row.Procedures || row.Procedures.length === 0))
      .slice(0, MAX_PROCEDURE_ENRICH_ROWS);

    if (missing.length === 0) {
      return of(rows);
    }

    return forkJoin(
      missing.map((row) =>
        this.getProceduresByRequestId(row.RequestID).pipe(
          map((procedures) => ({ requestId: row.RequestID, procedures }))
        )
      )
    ).pipe(
      map((results) => {
        const proceduresByRequestId = new Map<string, NappWaitingProcedure[]>();
        results.forEach(({ requestId, procedures }) => {
          if (procedures.length > 0) {
            proceduresByRequestId.set(requestId, procedures);
          }
        });

        return rows.map((row) => {
          const loaded = proceduresByRequestId.get(row.RequestID);
          if (!loaded || (row.Procedures && row.Procedures.length > 0)) {
            return row;
          }
          return { ...row, Procedures: loaded };
        });
      })
    );
  }

  private toApiError(error: any): VirtualRoomWaitingApiError {
    const body = this.readErrorBody(error);
    const isMissingMethod =
      /Unknown web method GetNappWaitingForVirtualRoomScheduling/i.test(body) ||
      /Unknown web method/i.test(body);

    if (isMissingMethod) {
      return new VirtualRoomWaitingApiError(
        'missing_web_method',
        'GetNappWaitingForVirtualRoomScheduling is not deployed on WebService.asmx'
      );
    }

    return new VirtualRoomWaitingApiError(
      'http_error',
      body || 'Failed to load NAPP waiting list'
    );
  }

  private readErrorBody(error: any): string {
    if (typeof error?.error === 'string') {
      return error.error;
    }
    if (error?.error?.Message) {
      return String(error.error.Message);
    }
    if (error?.message) {
      return String(error.message);
    }
    return '';
  }

  private normalizeRows(response: any): NappWaitingRow[] {
    const raw = response?.d ?? response;
    const list = Array.isArray(raw)
      ? raw
      : raw?.WaitingList
        ?? raw?.NappWaitingList
        ?? raw?.Candidates
        ?? [];

    return (list as any[])
      .map((row) => this.normalizeRow(row))
      .filter((row): row is NappWaitingRow => !!row);
  }

  private normalizeRow(row: any): NappWaitingRow | null {
    const caseNumber = String(
      row?.CaseNumber ?? row?.PM_CASE_NUMBER ?? row?.caseNumber ?? ''
    ).trim();
    const requestId = String(
      row?.RequestID ?? row?.RequestId ?? row?.requestId ?? ''
    ).trim();

    if (!caseNumber || !requestId) {
      return null;
    }

    const requestDepart = normalizeLabel(
      row?.RequestDepart ?? row?.RequestDepartment ?? row?.S_DEPARTMENT ?? ''
    );
    const seodeDepart = normalizeLabel(row?.SeodeDepart ?? row?.SeodeDepartment ?? row?.RequestSeodeDepart ?? '');
    const department = normalizeLabel(row?.Department ?? requestDepart);

    return {
      CaseNumber: caseNumber,
      RequestID: requestId,
      RequestDate: this.normalizeRequestDate(row?.RequestDate ?? row?.requestDate),
      PatientFirstName: row?.PatientFirstName ?? row?.PM_FIRST_NAME ?? row?.FirstName,
      PatientLastName: row?.PatientLastName ?? row?.PM_LAST_NAME ?? row?.LastName,
      PatientId: row?.PatientId ?? row?.PM_PATIENT_ID ?? row?.IDNumber,
      RequestDepart: requestDepart,
      SeodeDepart: seodeDepart,
      Department: department,
      Urgency: normalizeLabel(row?.Urgency),
      SurgeryType: normalizeLabel(row?.SurgeryType),
      DurationMinutes: this.normalizeDuration(row?.DurationMinutes ?? row?.Duration ?? row?.Dauration),
      DrorDuration: this.normalizeDuration(row?.DrorDuration ?? row?.DurationMinutes ?? row?.Dauration),
      ProcedureCodes: row?.ProcedureCodes ?? row?.SurgeryCodes,
      ProcedureNames: row?.ProcedureNames ?? row?.SurgeryNames,
      Procedures: this.normalizeProcedures(
        row?.Procedures ?? row?.SurgeriesCalendar_Susgeries ?? row?.NappProcedures
      ),
      WaitingDays: row?.WaitingDays ?? row?.waitingDays,
    };
  }

  private normalizeRequestDate(value: any): string | undefined {
    const raw = normalizeLabel(value);
    if (!raw) {
      return undefined;
    }

    const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      const [, day, month, year] = dmy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return iso[0];
    }

    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      const date = new Date(parsed);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return raw;
  }

  private normalizeDuration(value: any): number | undefined {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed) || parsed < MIN_SURGERY_DURATION_MINUTES) {
      return undefined;
    }
    return parsed;
  }

  private normalizeProcedures(raw: any): NappWaitingProcedure[] | undefined {
    if (!Array.isArray(raw)) {
      return undefined;
    }

    return raw
      .map((procedure) => this.normalizeProcedure(procedure))
      .filter((procedure): procedure is NappWaitingProcedure => !!procedure);
  }

  private normalizeProcedure(procedure: any): NappWaitingProcedure | null {
    if (!procedure || typeof procedure !== 'object') {
      return null;
    }

    const surgeryCode = String(
      procedure.Surgery_Code ?? procedure.SurgeryCode ?? procedure.NPCPCode ?? procedure.SurgeryID ?? ''
    ).trim();
    const surgeryName = String(
      procedure.Surgery_Name ?? procedure.SurgeryName ?? procedure.S_SERVICE_VAL ?? ''
    ).trim();

    if (!surgeryCode && !surgeryName) {
      return null;
    }

    return {
      SurgeryCode: surgeryCode,
      Surgery_Code: surgeryCode,
      SurgeryName: surgeryName,
      Surgery_Name: surgeryName,
      Catalog: procedure.Catalog ?? procedure.S_CATALOG,
      Side: procedure.Side,
      Priority: procedure.Priority,
      Depart: procedure.Depart,
      SeodeDepart: procedure.SeodeDepart,
      BloodUnit: procedure.BloodUnit,
      SurgeryType: procedure.SurgeryType,
      ServiceType: procedure.ServiceType,
    };
  }
}

function normalizeLabel(value: any): string {
  return String(value ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
