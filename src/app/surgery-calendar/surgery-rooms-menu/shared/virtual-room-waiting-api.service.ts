import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NappWaitingRow } from './virtual-room-waiting.models';

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
        catchError(() => of([]))
      );
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
      Procedures: row?.Procedures ?? row?.SurgeriesCalendar_Susgeries ?? row?.NappProcedures,
      WaitingDays: row?.WaitingDays ?? row?.waitingDays,
    };
  }
}
