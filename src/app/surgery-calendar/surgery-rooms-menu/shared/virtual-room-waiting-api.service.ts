import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NappWaitingRow } from './virtual-room-waiting.models';
import { isSurgeryWaitingRow, parseRequestDate } from './virtual-room-slot-planner';

export type VirtualRoomWaitingApiErrorKind = 'missing_web_method' | 'http_error';

export const MAX_WAITING_CANDIDATES = 50;
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
        catchError((error) => throwError(() => this.toApiError(error)))
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
      })
      .slice(0, MAX_WAITING_CANDIDATES);
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

    const sDepartment = normalizeLabel(
      row?.S_DEPARTMENT
      ?? row?.SDepartment
      ?? row?.SurgeryRequestDepartments?.S_DEPARTMENT
      ?? row?.S_DEPARTMENT_NAME
      ?? ''
    );
    const serviceName = normalizeLabel(
      row?.Service_Name
      ?? row?.ServiceName
      ?? row?.SurgeriesCalendar_Service?.[0]?.Service_Name
      ?? ''
    );
    const toolName = normalizeLabel(
      row?.Tool_Name
      ?? row?.ToolName
      ?? row?.SurgeriesCalendar_Tools?.[0]?.Tool_Name
      ?? ''
    );
    const requestDepart = normalizeLabel(
      row?.RequestDepart ?? row?.RequestDepartment ?? ''
    );
    const seodeDepart = normalizeLabel(row?.SeodeDepart ?? row?.SeodeDepartment ?? row?.RequestSeodeDepart ?? '');
    const department = normalizeLabel(row?.Department ?? sDepartment ?? requestDepart);
    const procedures = this.normalizeProcedures(row);
    const depart = this.resolveDepartCode(row, procedures);
    const operatingDepartment = sDepartment
      || (requestDepart && !/חדרי ניתוח|^ניתוחים$/i.test(requestDepart) ? requestDepart : '')
      || normalizeLabel(row?.Department ?? '');

    return {
      CaseNumber: caseNumber,
      RequestID: requestId,
      RequestDate: this.normalizeRequestDate(row?.RequestDate ?? row?.requestDate),
      PatientFirstName: row?.PatientFirstName ?? row?.PM_FIRST_NAME ?? row?.FirstName,
      PatientLastName: row?.PatientLastName ?? row?.PM_LAST_NAME ?? row?.LastName,
      PatientId: row?.PatientId ?? row?.PM_PATIENT_ID ?? row?.IDNumber,
      DoctorSurgeon: normalizeLabel(
        row?.DoctorSurgeon ?? row?.SurgeonName ?? row?.DoctorName ?? row?.RequestDoctor ?? row?.Surgeon
      ),
      SDepartment: operatingDepartment,
      Depart: depart,
      SDepartmentShortDesc: normalizeLabel(
        row?.S_DEPARTMENT_SHORT_DESC ?? row?.SurgeryRequestDepartments?.S_DEPARTMENT_SHORT_DESC
      ),
      ServiceName: serviceName,
      ToolName: toolName,
      RequestDepart: requestDepart,
      SeodeDepart: seodeDepart,
      Department: department,
      Urgency: normalizeLabel(row?.Urgency),
      SurgeryType: normalizeLabel(row?.SurgeryType),
      DurationMinutes: this.normalizeDuration(row?.DurationMinutes ?? row?.Duration ?? row?.Dauration),
      DrorDuration: this.normalizeDuration(row?.DrorDuration ?? row?.DurationMinutes ?? row?.Dauration),
      ProcedureCodes: normalizeLabel(row?.ProcedureCodes),
      ProcedureNames: normalizeLabel(row?.ProcedureNames),
      Procedures: procedures,
      WaitingDays: row?.WaitingDays ?? row?.waitingDays,
    };
  }

  private resolveDepartCode(row: any, procedures: NappWaitingRow['Procedures']): string {
    const direct = normalizeLabel(
      row?.Depart
      ?? row?.S_DEPARTMENT_SHORT_DESC
      ?? row?.SurgeryRequestDepartments?.S_DEPARTMENT_SHORT_DESC
      ?? ''
    );
    if (direct) {
      return direct;
    }

    const procedureDepart = (procedures ?? []).map((item) => normalizeLabel(item?.Depart)).find(Boolean);
    return procedureDepart ?? '';
  }

  private normalizeProcedures(row: any): NappWaitingRow['Procedures'] {
    const source = row?.Procedures
      ?? row?.SurgeriesCalendar_Susgeries
      ?? row?.surgeries
      ?? [];

    if (!Array.isArray(source)) {
      return undefined;
    }

    return source.map((item: any) => ({
      SurgeryCode: item?.SurgeryCode ?? item?.Surgery_Code ?? item?.SurgeryID,
      SurgeryName: item?.SurgeryName ?? item?.Surgery_Name,
      Surgery_Code: item?.Surgery_Code ?? item?.SurgeryCode,
      Surgery_Name: item?.Surgery_Name ?? item?.SurgeryName,
      Priority: normalizeLabel(item?.Priority),
      Depart: normalizeLabel(item?.Depart),
      SeodeDepart: normalizeLabel(item?.SeodeDepart),
      ServiceType: normalizeLabel(item?.ServiceType ?? item?.Service_Name),
    }));
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
    const raw = String(value ?? '').trim();
    if (!raw) {
      return undefined;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_SURGERY_DURATION_MINUTES) {
      return parsed;
    }

    return undefined;
  }
}

function normalizeLabel(value: any): string {
  return String(value ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
