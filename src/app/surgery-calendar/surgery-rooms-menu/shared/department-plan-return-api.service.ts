import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    const query = new HttpParams()
      .set('planDate', params.planDate)
      .set('roomCode', params.roomCode)
      .set('department', params.department)
      .set('calendarRoomsArea', params.calendarRoomsArea);

    return this.http
      .get(environment.url + 'GetDepartmentPlanReturn', { params: query })
      .pipe(
        map((res) => this.normalizeRecord(this.unwrapResponse(res))),
        catchError(() => of(null)),
        map((record) => record || this.findLocalRecord(params))
      );
  }

  saveCoordinatorReturn(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    const body = {
      returnId: payload.returnId || '',
      planDate: payload.planDate,
      roomCode: payload.roomCode,
      department: payload.department,
      departmentDisplay: payload.departmentDisplay,
      calendarRoomsArea: payload.calendarRoomsArea,
      generalComment: payload.generalComment || '',
      sentBy: payload.sentBy || '',
      rowsJson: this.serializeCoordinatorRowsJson(payload),
    };

    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturn', body)
      .pipe(
        map((res) => {
          const value = this.unwrapResponse(res);
          return value != null && value !== '' ? String(value) : null;
        }),
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
    const loginUser = localStorage.getItem('loginUserName');
    const sentBy = loginUser ? loginUser.toLowerCase() : '';

    return this.http
      .post<boolean | { d: boolean }>(environment.urlipracticom + 'SendDepartmentPlanReturnToDepartment', {
        returnId: payload.returnId || '',
        sentBy,
        department: payload.department,
        fileString: payload.fileString,
        arrivalDate: payload.arrivalDate,
        calendarRoomsArea: payload.calendarRoomsArea,
        detailedText: payload.generalComment || '',
        users: payload.users,
      })
      .pipe(
        map((res) => {
          const ok = this.unwrapBoolean(res);
          if (ok && payload.returnId) {
            this.markReturnAsSent(payload.returnId, sentBy);
          }
          return ok;
        }),
        catchError(() => this.sendReturnViaFinalPlan(payload))
      );
  }

  saveDepartmentResponse(payload: DepartmentPlanReturnResponsePayload): Observable<boolean> {
    const body = {
      returnId: payload.returnId,
      generalResponseText: payload.generalResponseText || '',
      respondedBy: payload.respondedBy || '',
      rowsJson: this.serializeResponseRowsJson(payload),
    };

    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturnResponse', body)
      .pipe(
        map((res) => this.unwrapBoolean(res)),
        catchError(() => of(false)),
        map((serverOk) => serverOk || this.applyLocalResponse(payload))
      );
  }

  getReport(filters: DepartmentPlanReturnReportFilters): Observable<DepartmentPlanReturnRecord[]> {
    const departments = (filters.departments || []).join(',');
    const query = new HttpParams()
      .set('fromDate', filters.dateFrom)
      .set('toDate', filters.dateTo)
      .set('departments', departments)
      .set('treatmentStatus', filters.treatmentStatus || 'all');

    return this.http
      .get(environment.url + 'GetDepartmentPlanReturnReport', { params: query })
      .pipe(
        map((res) => {
          const rows = this.unwrapResponse(res);
          const list = Array.isArray(rows) ? rows : [];
          return list
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

  getReturnsForBoard(planDate: string, calendarRoomsArea: string): DepartmentPlanReturnRecord[] {
    return this.readLocalRecords().filter((record) =>
      record.planDate === planDate &&
      record.calendarRoomsArea === calendarRoomsArea
    );
  }

  getActiveReturnsForRoom(
    planDate: string,
    roomCode: string,
    calendarRoomsArea: string,
  ): DepartmentPlanReturnRecord[] {
    return this.getReturnsForBoard(planDate, calendarRoomsArea).filter((record) =>
      record.roomCode === roomCode && this.recordNeedsDepartmentAction(record)
    );
  }

  recordNeedsDepartmentAction(record: DepartmentPlanReturnRecord): boolean {
    if (record.treatmentStatus === 'completed') {
      return false;
    }
    const hasAttention =
      !!(record.generalComment || '').trim() ||
      (record.surgeries || []).some((row) => (row.coordinatorComment || '').trim().length > 0);
    return !!(record.sentAt || hasAttention);
  }

  getReturnById(returnId: string): Observable<DepartmentPlanReturnRecord | null> {
    if (!returnId) {
      return of(null);
    }
    const local = this.readLocalRecords().find((record) => record.returnId === returnId) || null;
    const query = new HttpParams().set('returnId', returnId);

    return this.http
      .get(environment.url + 'GetDepartmentPlanReturnById', { params: query })
      .pipe(
        map((res) => this.normalizeRecord(this.unwrapResponse(res))),
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

  mapBoardSurgeriesToRows(surgeries: any[], roomCode = ''): DepartmentPlanReturnSurgeryRow[] {
    return (surgeries || [])
      .filter((surgery) => surgery?.Row_ID && surgery?.SurgeryPatientDetails && surgery?.SurgeryStatus !== 'Canceled')
      .map((surgery, index) => ({
        rowId: String(surgery.Row_ID || index),
        caseNumber: String(surgery.SurgeryPatientDetails?.PM_CASE_NUMBER || ''),
        room: String(surgery.SurgeryRoom || roomCode || ''),
        patientLabel: this.buildBoardPatientLabel(surgery),
        age: String(surgery.SurgeryPatientDetails?.PM_AGE || surgery.Age || ''),
        procedureName: this.buildBoardProcedureName(surgery),
        surgeon: String(
          surgery.DoctorSurgeon
          || surgery.SurgeonName
          || surgery.DoctorName
          || surgery.RequestDoctor
          || ''
        ),
        duration: String(surgery.AvgDauration || surgery.Duration || ''),
        existingNote: this.buildBoardExistingNote(surgery),
        coordinatorComment: '',
        departmentResponseText: '',
        treatmentStatus: 'pending' as DepartmentPlanTreatmentStatus,
      }));
  }

  filterBoardSurgeriesByDepartment(surgeries: any[], department: string | string[]): any[] {
    const labels = this.parseDepartmentLabels(department);
    if (!labels.length) {
      return surgeries || [];
    }
    const labelSet = new Set(labels);
    return (surgeries || []).filter((surgery) =>
      labelSet.has(String(surgery?.SurgeryRequestDepartments?.S_DEPARTMENT || '').trim())
    );
  }

  private serializeCoordinatorRowsJson(payload: DepartmentPlanReturnPayload): string {
    return JSON.stringify({
      treatmentStatus: payload.treatmentStatus || 'pending',
      surgeries: (payload.surgeries || []).map((row) => this.serializeSurgeryRow(row)),
    });
  }

  private serializeResponseRowsJson(payload: DepartmentPlanReturnResponsePayload): string {
    return JSON.stringify({
      treatmentStatus: payload.treatmentStatus || 'pending',
      surgeries: (payload.surgeries || []).map((row) => ({
        rowId: row.rowId,
        departmentResponseText: row.departmentResponseText || '',
        treatmentStatus: row.treatmentStatus || 'pending',
      })),
    });
  }

  private serializeSurgeryRow(row: DepartmentPlanReturnSurgeryRow): Record<string, string> {
    return {
      rowId: row.rowId,
      caseNumber: row.caseNumber || '',
      room: row.room || '',
      patientLabel: row.patientLabel || '',
      age: row.age || '',
      procedureName: row.procedureName || '',
      surgeon: row.surgeon || '',
      duration: row.duration || '',
      existingNote: row.existingNote || '',
      coordinatorComment: row.coordinatorComment || '',
      departmentResponseText: row.departmentResponseText || '',
      treatmentStatus: row.treatmentStatus || 'pending',
    };
  }

  private buildBoardPatientLabel(surgery: any): string {
    const first = String(surgery?.SurgeryPatientDetails?.PM_FIRST_NAME || '').trim();
    const last = String(surgery?.SurgeryPatientDetails?.PM_LAST_NAME || '').trim();
    const patientId = String(surgery?.SurgeryPatientDetails?.PM_PATIENT_ID || '').trim();
    const name = `${first} ${last}`.trim();
    if (name && patientId) {
      return `${name}, ${patientId}`;
    }
    return name || patientId;
  }

  private buildBoardProcedureName(surgery: any): string {
    const procedures = surgery?.SurgeriesCalendar_Susgeries ?? surgery?.SurgeriesCalendar_Surgeries ?? [];
    if (Array.isArray(procedures) && procedures.length > 0) {
      const names = procedures
        .map((item: any) => item?.Service_Name || item?.S_SERVICE_VAL)
        .filter(Boolean);
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    const services = surgery?.SurgeriesCalendar_Service ?? [];
    if (Array.isArray(services) && services.length > 0) {
      const names = services.map((item: any) => item?.Service_Name).filter(Boolean);
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    return String(
      surgery?.SurgeryServicesName?.S_SERVICE_VAL
      || surgery?.S_SERVICE_VAL
      || ''
    );
  }

  private buildBoardExistingNote(surgery: any): string {
    const parts = [
      surgery?.SurgeryReasonNoteRequest,
      surgery?.SurgeryReasonNote,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    return parts.join(' | ');
  }

  private parseDepartmentLabels(department: string | string[]): string[] {
    if (Array.isArray(department)) {
      return department.map((value) => String(value || '').trim()).filter(Boolean);
    }
    return this.stripDepartmentQuotes(String(department || ''))
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
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

  private unwrapResponse(res: unknown): unknown {
    if (res && typeof res === 'object' && 'd' in (res as Record<string, unknown>)) {
      return (res as Record<string, unknown>).d;
    }
    return res;
  }

  private unwrapBoolean(res: unknown): boolean {
    const value = this.unwrapResponse(res);
    return value === true || value === 'true' || value === 1 || value === '1';
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
      records[index] = {
        ...records[index],
        ...record,
        generalResponseText: record.generalResponseText || records[index].generalResponseText,
      };
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
      treatmentStatus: payload.treatmentStatus || 'pending',
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
    const rowsMeta = this.parseRowsJsonMeta(record.rowsJson || record.RowsJson);
    const surgeries = this.extractSurgeries(record);

    return {
      returnId: String(record.returnId || record.ReturnId || ''),
      department: String(record.department || ''),
      departmentDisplay: String(record.departmentDisplay || record.department || ''),
      roomCode: String(record.roomCode || ''),
      planDate: String(record.planDate || ''),
      calendarRoomsArea: String(record.calendarRoomsArea || ''),
      generalComment: String(record.generalComment || ''),
      generalResponseText: String(record.generalResponseText || ''),
      treatmentStatus: this.normalizeStatus(rowsMeta.treatmentStatus || record.treatmentStatus),
      sentAt: String(record.sentAt || ''),
      sentBy: String(record.sentBy || ''),
      respondedAt: record.respondedAt ? String(record.respondedAt) : null,
      respondedBy: record.respondedBy ? String(record.respondedBy) : null,
      surgeries,
    };
  }

  private extractSurgeries(record: Record<string, unknown>): DepartmentPlanReturnSurgeryRow[] {
    if (Array.isArray(record.surgeries)) {
      return record.surgeries.map((item, index) => this.mapSurgeryRow(item, index));
    }

    if (Array.isArray(record.Surgeries)) {
      return record.Surgeries.map((item, index) => this.mapSurgeryRow(item, index));
    }

    if (Array.isArray(record.rows)) {
      return record.rows.map((item, index) => this.mapSurgeryRow(item, index));
    }

    const rowsJson = record.rowsJson || record.RowsJson;
    if (typeof rowsJson === 'string' && rowsJson.trim()) {
      try {
        const parsed = JSON.parse(rowsJson);
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => this.mapSurgeryRow(item, index));
        }
        if (parsed && Array.isArray(parsed.surgeries)) {
          return parsed.surgeries.map((item: unknown, index: number) => this.mapSurgeryRow(item, index));
        }
      } catch {
        return [];
      }
    }

    return [];
  }

  private mapSurgeryRow(raw: unknown, index: number): DepartmentPlanReturnSurgeryRow {
    const item = (raw || {}) as Record<string, unknown>;
    return {
      rowId: String(item.rowId || item.Row_ID || item.RowId || item.casenumber || index),
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
    if (status === 'postponed' || status === 'completed' || status === 'in_progress') {
      return status;
    }
    return 'pending';
  }
}
