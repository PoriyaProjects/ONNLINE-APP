import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  DepartmentPlanReturnPayload,
  DepartmentPlanReturnRecord,
  DepartmentPlanReturnReportFilters,
  DepartmentPlanReturnResponsePayload,
  DepartmentPlanReturnSurgeryRow,
  DepartmentPlanTreatmentStatus,
} from './department-plan-return.models';

@Injectable({ providedIn: 'root' })
export class DepartmentPlanReturnApiService {
  constructor(private http: HttpClient) {}

  loadReturnPlan(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord | null> {
    return this.http
      .post(environment.url + 'GetDepartmentPlanReturn', params)
      .pipe(
        map((res) => this.normalizeRecord(res?.['d'])),
        catchError(() => of(null))
      );
  }

  saveCoordinatorReturn(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturn', payload)
      .pipe(
        map((res) => (res?.['d'] ? String(res['d']) : null)),
        catchError(() => of(null))
      );
  }

  sendReturnToDepartment(payload: {
    returnId?: string;
    department: string;
    fileString: string;
    arrivalDate: string;
    calendarRoomsArea: string;
    roomCode: string;
    generalComment: string;
    users: Array<{ FirstName: string; LastName: string; Email: string }>;
  }): Observable<boolean> {
    return this.http
      .post(environment.urlipracticom + 'SendDepartmentPlanReturnToDepartment', payload)
      .pipe(
        map((res) => !!res?.['d']),
        catchError(() => of(false))
      );
  }

  saveDepartmentResponse(payload: DepartmentPlanReturnResponsePayload): Observable<boolean> {
    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturnResponse', payload)
      .pipe(
        map((res) => !!res?.['d']),
        catchError(() => of(false))
      );
  }

  getReport(filters: DepartmentPlanReturnReportFilters): Observable<DepartmentPlanReturnRecord[]> {
    return this.http
      .post(environment.url + 'GetDepartmentPlanReturnReport', filters)
      .pipe(
        map((res) => {
          const rows = Array.isArray(res?.['d']) ? res['d'] : [];
          return rows
            .map((row: unknown) => this.normalizeRecord(row))
            .filter((row): row is DepartmentPlanReturnRecord => row != null);
        }),
        catchError(() => of([]))
      );
  }

  mapPlannedExcelRows(data: any[]): DepartmentPlanReturnSurgeryRow[] {
    return (data ?? []).map((item, index) => ({
      rowId: String(item?.row_id ?? item?.Row_ID ?? item?.casenumber ?? index),
      caseNumber: String(item?.casenumber ?? ''),
      room: String(item?.room ?? ''),
      patientLabel: String(item?.id ?? ''),
      age: String(item?.age ?? ''),
      procedureName: String(item?.s_name ?? ''),
      surgeon: String(item?.doctor ?? ''),
      duration: String(item?.duration ?? ''),
      existingNote: String(item?.note ?? ''),
      coordinatorComment: String(item?.coordinatorComment ?? ''),
      departmentResponseText: String(item?.departmentResponseText ?? ''),
      treatmentStatus: this.normalizeStatus(item?.treatmentStatus),
    }));
  }

  private normalizeRecord(raw: unknown): DepartmentPlanReturnRecord | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const record = raw as Record<string, unknown>;
    const surgeries = Array.isArray(record.surgeries)
      ? record.surgeries.map((item, index) => this.mapSurgeryRow(item, index))
      : [];

    return {
      returnId: String(record.returnId ?? record.ReturnId ?? ''),
      department: String(record.department ?? ''),
      departmentDisplay: String(record.departmentDisplay ?? record.department ?? ''),
      roomCode: String(record.roomCode ?? ''),
      planDate: String(record.planDate ?? ''),
      calendarRoomsArea: String(record.calendarRoomsArea ?? ''),
      generalComment: String(record.generalComment ?? ''),
      generalResponseText: String(record.generalResponseText ?? ''),
      treatmentStatus: this.normalizeStatus(record.treatmentStatus),
      sentAt: String(record.sentAt ?? ''),
      sentBy: String(record.sentBy ?? ''),
      respondedAt: record.respondedAt ? String(record.respondedAt) : null,
      respondedBy: record.respondedBy ? String(record.respondedBy) : null,
      surgeries,
    };
  }

  private mapSurgeryRow(raw: unknown, index: number): DepartmentPlanReturnSurgeryRow {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      rowId: String(item.rowId ?? item.Row_ID ?? item.casenumber ?? index),
      caseNumber: String(item.caseNumber ?? item.casenumber ?? ''),
      room: String(item.room ?? ''),
      patientLabel: String(item.patientLabel ?? item.id ?? ''),
      age: String(item.age ?? ''),
      procedureName: String(item.procedureName ?? item.s_name ?? ''),
      surgeon: String(item.surgeon ?? item.doctor ?? ''),
      duration: String(item.duration ?? ''),
      existingNote: String(item.existingNote ?? item.note ?? ''),
      coordinatorComment: String(item.coordinatorComment ?? ''),
      departmentResponseText: String(item.departmentResponseText ?? ''),
      treatmentStatus: this.normalizeStatus(item.treatmentStatus),
    };
  }

  private normalizeStatus(value: unknown): DepartmentPlanTreatmentStatus {
    const status = String(value ?? 'pending').toLowerCase();
    if (status === 'completed' || status === 'in_progress') {
      return status;
    }
    return 'pending';
  }
}
