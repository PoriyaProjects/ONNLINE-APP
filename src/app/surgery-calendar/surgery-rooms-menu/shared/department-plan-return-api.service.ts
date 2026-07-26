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

const LOCAL_STORAGE_KEY = 'surgery_department_plan_returns_v1';

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
        map((res) => this.normalizeRecord(res['d'])),
        catchError(() => of(null)),
        map((record) => record || this.findLocalRecord(params))
      );
  }

  saveCoordinatorReturn(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturn', payload)
      .pipe(
        map((res) => (res['d'] ? String(res['d']) : null)),
        catchError(() => of(null)),
        map((serverId) => {
          const returnId = serverId || this.buildLocalReturnId(payload);
          this.upsertLocalRecord(this.buildRecordFromPayload(payload, returnId));
          return returnId;
        })
      );
  }

  markReturnAsSent(returnId: string, sentBy?: string): void {
    if (!returnId) {
      return;
    }
    const records = this.readLocalRecords();
    const index = records.findIndex((record) => record.returnId === returnId);
    if (index < 0) {
      return;
    }
    records[index] = {
      ...records[index],
      sentAt: new Date().toISOString(),
      sentBy: sentBy || records[index].sentBy,
    };
    this.writeLocalRecords(records);
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
        map((res) => !!res['d']),
        catchError(() => this.sendReturnViaFinalPlan(payload))
      );
  }

  saveDepartmentResponse(payload: DepartmentPlanReturnResponsePayload): Observable<boolean> {
    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturnResponse', payload)
      .pipe(
        map((res) => !!res['d']),
        catchError(() => of(false)),
        map((serverOk) => serverOk || this.applyLocalResponse(payload))
      );
  }

  getReport(filters: DepartmentPlanReturnReportFilters): Observable<DepartmentPlanReturnRecord[]> {
    return this.http
      .post(environment.url + 'GetDepartmentPlanReturnReport', filters)
      .pipe(
        map((res) => {
          const rows = Array.isArray(res['d']) ? res['d'] : [];
          return rows
            .map((row: unknown) => this.normalizeRecord(row))
            .filter((row): row is DepartmentPlanReturnRecord => row != null);
        }),
        catchError(() => of([])),
        map((serverRows) => this.filterRecords(this.mergeRecords(serverRows, this.readLocalRecords()), filters))
      );
  }

  getPendingCount(): number {
    return this.readLocalRecords().filter((record) => record.treatmentStatus !== 'completed').length;
  }

  getReturnById(returnId: string): Observable<DepartmentPlanReturnRecord | null> {
    if (!returnId) {
      return of(null);
    }
    const local = this.readLocalRecords().find((record) => record.returnId === returnId) || null;
    return this.http
      .post(environment.url + 'GetDepartmentPlanReturnById', { returnId })
      .pipe(
        map((res) => this.normalizeRecord(res['d'])),
        catchError(() => of(local)),
        map((record) => record || local)
      );
  }

  mapPlannedExcelRows(data: any[]): DepartmentPlanReturnSurgeryRow[] {
    return (data || []).map((item, index) => ({
      rowId: String(item.row_id || item.Row_ID || item.casenumber || index),
      caseNumber: String(item.casenumber || ''),
      room: String(item.room || ''),
      patientLabel: String(item.id || ''),
      age: String(item.age || ''),
      procedureName: String(item.s_name || ''),
      surgeon: String(item.doctor || ''),
      duration: String(item.duration || ''),
      existingNote: String(item.note || ''),
      coordinatorComment: String(item.coordinatorComment || ''),
      departmentResponseText: String(item.departmentResponseText || ''),
      treatmentStatus: this.normalizeStatus(item.treatmentStatus),
    }));
  }

  private sendReturnViaFinalPlan(payload: {
    returnId?: string;
    department: string;
    fileString: string;
    arrivalDate: string;
    calendarRoomsArea: string;
    users: Array<{ FirstName: string; LastName: string; Email: string }>;
  }): Observable<boolean> {
    return this.http
      .post(environment.urlipracticom + 'SentDepartmentFinalSurgeryPlan', {
        department: payload.department,
        fileString: payload.fileString,
        arrivalDate: payload.arrivalDate,
        calendarRoomsArea: payload.calendarRoomsArea,
        users: payload.users,
      })
      .pipe(
        map((res) => {
          const ok = !!res['d'];
          if (ok && payload.returnId) {
            const loginUser = localStorage.getItem('loginUserName');
            this.markReturnAsSent(payload.returnId, loginUser ? loginUser.toLowerCase() : '');
          }
          return ok;
        }),
        catchError(() => of(false))
      );
  }

  private readLocalRecords(): DepartmentPlanReturnRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((row) => this.normalizeRecord(row))
        .filter((row): row is DepartmentPlanReturnRecord => row != null);
    } catch {
      return [];
    }
  }

  private writeLocalRecords(records: DepartmentPlanReturnRecord[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  }

  private upsertLocalRecord(record: DepartmentPlanReturnRecord): void {
    const records = this.readLocalRecords();
    const index = records.findIndex((item) => item.returnId === record.returnId);
    if (index >= 0) {
      records[index] = { ...records[index], ...record };
    } else {
      records.unshift(record);
    }
    this.writeLocalRecords(records);
  }

  private findLocalRecord(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): DepartmentPlanReturnRecord | null {
    const match = this.readLocalRecords().find((record) =>
      record.department === params.department &&
      record.roomCode === params.roomCode &&
      record.planDate === params.planDate &&
      record.calendarRoomsArea === params.calendarRoomsArea
    );
    return match || null;
  }

  private buildLocalReturnId(payload: DepartmentPlanReturnPayload): string {
    const key = [
      payload.planDate,
      payload.roomCode,
      payload.department,
      payload.calendarRoomsArea,
    ].join('|');
    return `local-${this.hashString(key)}`;
  }

  private buildRecordFromPayload(payload: DepartmentPlanReturnPayload, returnId: string): DepartmentPlanReturnRecord {
    return {
      returnId,
      department: payload.department,
      departmentDisplay: payload.departmentDisplay,
      roomCode: payload.roomCode,
      planDate: payload.planDate,
      calendarRoomsArea: payload.calendarRoomsArea,
      generalComment: payload.generalComment,
      generalResponseText: '',
      treatmentStatus: 'pending',
      sentAt: '',
      sentBy: payload.sentBy,
      respondedAt: null,
      respondedBy: null,
      surgeries: payload.surgeries,
    };
  }

  private applyLocalResponse(payload: DepartmentPlanReturnResponsePayload): boolean {
    const records = this.readLocalRecords();
    const index = records.findIndex((record) => record.returnId === payload.returnId);
    if (index < 0) {
      return false;
    }

    const current = records[index];
    const surgeryMap = new Map(payload.surgeries.map((row) => [row.rowId, row]));
    records[index] = {
      ...current,
      generalResponseText: payload.generalResponseText,
      treatmentStatus: payload.treatmentStatus,
      respondedAt: new Date().toISOString(),
      respondedBy: payload.respondedBy,
      surgeries: current.surgeries.map((surgery) => {
        const updated = surgeryMap.get(surgery.rowId);
        if (!updated) {
          return surgery;
        }
        return {
          ...surgery,
          departmentResponseText: updated.departmentResponseText,
          treatmentStatus: updated.treatmentStatus,
        };
      }),
    };
    this.writeLocalRecords(records);
    return true;
  }

  private mergeRecords(
    serverRows: DepartmentPlanReturnRecord[],
    localRows: DepartmentPlanReturnRecord[]
  ): DepartmentPlanReturnRecord[] {
    const byId = new Map<string, DepartmentPlanReturnRecord>();
    localRows.forEach((record) => byId.set(record.returnId, record));
    serverRows.forEach((record) => byId.set(record.returnId, { ...byId.get(record.returnId), ...record }));
    return Array.from(byId.values()).sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
  }

  private filterRecords(
    records: DepartmentPlanReturnRecord[],
    filters: DepartmentPlanReturnReportFilters
  ): DepartmentPlanReturnRecord[] {
    return records.filter((record) => {
      if (filters.dateFrom && record.planDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && record.planDate > filters.dateTo) {
        return false;
      }
      if (filters.departments && filters.departments.length > 0) {
        const departmentLabel = this.stripDepartmentQuotes(record.departmentDisplay || record.department);
        const matches = filters.departments.some((dept) => departmentLabel.indexOf(dept) >= 0);
        if (!matches) {
          return false;
        }
      }
      if (filters.treatmentStatus !== 'all' && record.treatmentStatus !== filters.treatmentStatus) {
        return false;
      }
      return true;
    });
  }

  private stripDepartmentQuotes(value: string): string {
    return (value || '')
      .replace(/^'+|'+$/g, '')
      .replace(/','/g, ', ');
  }

  private hashString(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
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
      returnId: String(record.returnId || record.ReturnId || ''),
      department: String(record.department || ''),
      departmentDisplay: String(record.departmentDisplay || record.department || ''),
      roomCode: String(record.roomCode || ''),
      planDate: String(record.planDate || ''),
      calendarRoomsArea: String(record.calendarRoomsArea || ''),
      generalComment: String(record.generalComment || ''),
      generalResponseText: String(record.generalResponseText || ''),
      treatmentStatus: this.normalizeStatus(record.treatmentStatus),
      sentAt: String(record.sentAt || ''),
      sentBy: String(record.sentBy || ''),
      respondedAt: record.respondedAt ? String(record.respondedAt) : null,
      respondedBy: record.respondedBy ? String(record.respondedBy) : null,
      surgeries,
    };
  }

  private mapSurgeryRow(raw: unknown, index: number): DepartmentPlanReturnSurgeryRow {
    const item = (raw || {}) as Record<string, unknown>;
    return {
      rowId: String(item.rowId || item.Row_ID || item.casenumber || index),
      caseNumber: String(item.caseNumber || item.casenumber || ''),
      room: String(item.room || ''),
      patientLabel: String(item.patientLabel || item.id || ''),
      age: String(item.age || ''),
      procedureName: String(item.procedureName || item.s_name || ''),
      surgeon: String(item.surgeon || item.doctor || ''),
      duration: String(item.duration || ''),
      existingNote: String(item.existingNote || item.note || ''),
      coordinatorComment: String(item.coordinatorComment || ''),
      departmentResponseText: String(item.departmentResponseText || ''),
      treatmentStatus: this.normalizeStatus(item.treatmentStatus),
    };
  }

  private normalizeStatus(value: unknown): DepartmentPlanTreatmentStatus {
    const status = String(value || 'pending').toLowerCase();
    if (status === 'completed' || status === 'in_progress') {
      return status;
    }
    return 'pending';
  }
}
