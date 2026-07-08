import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NappWaitingProcedure, NappWaitingRow } from './virtual-room-waiting.models';

export type VirtualRoomWaitingApiErrorKind = 'missing_web_method' | 'http_error';

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

  getWaitingCandidates(payload: {
    fullDate: string;
    calendarRoomsArea: string;
    roomGroupDesc?: string;
    roomCodes?: string[];
  }): Observable<NappWaitingRow[]> {
    return this.http
      .post(environment.url + 'GetNappWaitingForVirtualRoomScheduling', {
        _fullDate: payload.fullDate,
        _calendarRoomsArea: payload.calendarRoomsArea,
        _roomGroupDesc: payload.roomGroupDesc ?? '',
        _roomCodes: payload.roomCodes ?? [],
      })
      .pipe(
        map((response: any) => this.normalizeRows(response)),
        catchError((error) => throwError(() => this.toApiError(error)))
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
      row?.RequestID ?? row?.RequestId ?? row?.requestId ?? row?.VKGID ?? ''
    ).trim();

    if (!caseNumber || !requestId) {
      return null;
    }

    return {
      CaseNumber: caseNumber,
      RequestID: requestId,
      RequestDate: row?.RequestDate ?? row?.requestDate,
      PatientFirstName: row?.PatientFirstName ?? row?.PM_FIRST_NAME ?? row?.FirstName,
      PatientLastName: row?.PatientLastName ?? row?.PM_LAST_NAME ?? row?.LastName,
      PatientId: row?.PatientId ?? row?.PM_PATIENT_ID ?? row?.IDNumber,
      RequestDepart: row?.RequestDepart ?? row?.RequestDepartment ?? row?.S_DEPARTMENT,
      SeodeDepart: row?.SeodeDepart ?? row?.SeodeDepartment,
      Department: row?.Department,
      Urgency: row?.Urgency,
      SurgeryType: row?.SurgeryType,
      DurationMinutes: row?.DurationMinutes ?? row?.Duration ?? row?.Dauration,
      DrorDuration: row?.DrorDuration,
      ProcedureCodes: row?.ProcedureCodes ?? row?.SurgeryCodes,
      ProcedureNames: row?.ProcedureNames ?? row?.SurgeryNames,
      Procedures: this.normalizeProcedures(
        row?.Procedures ?? row?.SurgeriesCalendar_Susgeries ?? row?.NappProcedures
      ),
      WaitingDays: row?.WaitingDays ?? row?.waitingDays,
    };
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
