import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  DepartmentPlanReturnPayload,
  DepartmentPlanReturnRecord,
  DepartmentPlanReturnReportFilters,
  DepartmentPlanReturnResponsePayload,
  DepartmentPlanReturnSoftDeleteMarker,
  DepartmentPlanReturnSurgeryRow,
  DepartmentPlanTreatmentStatus,
  normalizeDeletedFlag,
  recordHasCoordinatorAttention,
} from './department-plan-return.models';

const LOCAL_STORAGE_KEY = 'surgery_department_plan_returns_v1';
const SOFT_DELETED_STORAGE_KEY = 'surgery_department_plan_soft_deleted_v1';

@Injectable({ providedIn: 'root' })
export class DepartmentPlanReturnApiService {
  private indicatorDetailsCache = new Map<string, DepartmentPlanReturnRecord>();

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
    const body: Record<string, string> = {
      returnId: this.resolveServerReturnId(payload.returnId) || '',
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
      .post(environment.url + 'SaveDepartmentPlanReturn', body, { responseType: 'text' })
      .pipe(
        map((text) => this.extractSavedReturnIdFromText(text)),
        catchError((err) => {
          const fromBody = this.extractSavedReturnIdFromText(
            typeof err?.error === 'string' ? err.error : ''
          );
          if (fromBody) {
            this.upsertLocalRecord(this.buildRecordFromPayload(payload, fromBody));
            return of(fromBody);
          }
          if (!err?.status) {
            const returnId = this.buildLocalReturnId(payload);
            this.upsertLocalRecord(this.buildRecordFromPayload(payload, returnId));
            return of(returnId);
          }
          return of(null);
        }),
        map((serverId) => {
          if (!serverId) {
            return null;
          }
          this.upsertLocalRecord(this.buildRecordFromPayload(payload, serverId));
          return serverId;
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
    emailBody?: string;
    arrivalDate: string;
    calendarRoomsArea: string;
    roomCode: string;
    generalComment: string;
    users: Array<{ FirstName: string; LastName: string; Email: string }>;
  }): Observable<boolean> {
    const returnId = this.resolveServerReturnId(payload.returnId);
    if (!returnId) {
      return of(false);
    }

    const loginUser = localStorage.getItem('loginUserName');
    const sentBy = loginUser ? loginUser.toLowerCase() : '';

    return this.http
      .post<boolean | { d: boolean }>(environment.urlipracticom + 'SendDepartmentPlanReturnToDepartment', {
        returnId,
        sentBy,
        department: payload.department,
        fileString: payload.fileString,
        arrivalDate: payload.arrivalDate,
        calendarRoomsArea: payload.calendarRoomsArea,
        detailedText: payload.emailBody || payload.fileString || payload.generalComment || '',
        users: payload.users,
      })
      .pipe(
        map((res) => {
          const ok = this.unwrapBoolean(res);
          if (ok) {
            this.markReturnAsSent(returnId, sentBy);
          }
          return ok;
        }),
        catchError(() => this.sendReturnViaFinalPlan({ ...payload, returnId }))
      );
  }

  saveDepartmentResponse(payload: DepartmentPlanReturnResponsePayload): Observable<boolean> {
    const returnId = this.resolveServerReturnId(payload.returnId);
    if (!returnId) {
      return of(this.applyLocalResponse(payload));
    }

    const body = {
      returnId,
      generalResponseText: payload.generalResponseText || '',
      respondedBy: payload.respondedBy || '',
      rowsJson: this.serializeResponseRowsJson(payload),
    };

    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturnResponseMethod', body)
      .pipe(
        map((res) => this.unwrapBoolean(res)),
        catchError(() => of(false)),
        map((serverOk) => serverOk || this.applyLocalResponse(payload))
      );
  }

  deleteDepartmentPlanReturn(
    returnId: string,
    rowId: string | null | undefined,
    deletedBy: string,
    context?: Omit<DepartmentPlanReturnSoftDeleteMarker, 'deletedAt' | 'deletedBy' | 'rowId'> & { rowId?: string },
  ): Observable<boolean> {
    const serverReturnId = this.resolveServerReturnId(returnId);
    if (!serverReturnId) {
      return of(false);
    }

    const normalizedRowId = rowId ? String(rowId) : '';

    return this.http
      .post(environment.url + 'DeleteDepartmentPlanReturn', {
        returnId: serverReturnId,
        rowId: normalizedRowId,
        deletedBy: deletedBy || '',
      }, { responseType: 'text' })
      .pipe(
        map((text) => this.parseSuccessFromAsmxText(text)),
        tap((ok) => {
          if (!ok || !context) {
            return;
          }
          this.registerSoftDeletedReturn({
            ...context,
            returnId: serverReturnId,
            rowId: normalizedRowId,
            deletedBy: deletedBy || '',
            deletedAt: new Date().toISOString(),
          });
        }),
        catchError((err) => {
          const fromBody = typeof err?.error === 'string'
            ? this.parseSuccessFromAsmxText(err.error)
            : this.parseSuccessFromAsmxResponse(err?.error);
          return of(fromBody);
        }),
      );
  }

  registerSoftDeletedReturn(marker: DepartmentPlanReturnSoftDeleteMarker): void {
    const markers = this.readSoftDeletedMarkers().filter((item) =>
      !(item.returnId === marker.returnId && (item.rowId || '') === (marker.rowId || ''))
    );
    markers.unshift(marker);
    this.writeSoftDeletedMarkers(markers);
  }

  getReport(filters: DepartmentPlanReturnReportFilters): Observable<DepartmentPlanReturnRecord[]> {
    return this.http
      .get(environment.url + 'GetDepartmentPlanReturnReport?' + this.buildReportQueryString({
        ...filters,
        includeDeleted: true,
      }))
      .pipe(
        map((res) => this.unwrapListResponse(res)),
        map((rows) => rows
          .map((row: unknown) => this.normalizeRecord(row))
          .filter((row): row is DepartmentPlanReturnRecord => row != null)),
        map((serverRows) => this.groupReturnRecordsByReturnId(serverRows)),
        map((serverRows) => serverRows.map((record) => this.finalizeRecordDeletedState(record))),
        map((serverRows) => this.mergeSoftDeletedMarkers(serverRows, filters)),
        map((serverRows) => this.filterRecords(serverRows, filters)),
        catchError(() => of(this.mergeSoftDeletedMarkers([], filters))),
      );
  }

  getPendingCount(): number {
    return this.readLocalRecords().filter((record) => record.treatmentStatus !== 'completed').length;
  }

  getReturnsForBoard(planDate: string, calendarRoomsArea: string): DepartmentPlanReturnRecord[] {
    const normalizedDate = this.normalizePlanDate(planDate);
    const normalizedArea = this.normalizeCalendarArea(calendarRoomsArea);
    return this.readLocalRecords().filter((record) =>
      this.normalizePlanDate(record.planDate) === normalizedDate &&
      this.matchesCalendarArea(record.calendarRoomsArea, normalizedArea)
    );
  }

  loadBoardReturnIndicators(planDate: string, calendarRoomsArea: string): Observable<DepartmentPlanReturnRecord[]> {
    const normalizedDate = this.normalizePlanDate(planDate);
    const normalizedArea = this.normalizeCalendarArea(calendarRoomsArea);
    const localRecords = this.getReturnsForBoard(normalizedDate, normalizedArea);
    const cachedRecords = this.getCachedIndicatorRecords(normalizedDate, normalizedArea);

    return this.fetchReportRecords(normalizedDate).pipe(
      map((reportRecords) => this.mergeBoardIndicatorRecords([
        ...reportRecords,
        ...cachedRecords,
        ...localRecords,
      ], normalizedArea)),
      catchError(() => of(this.mergeBoardIndicatorRecords([...cachedRecords, ...localRecords], normalizedArea))),
    );
  }

  prefetchBoardReturnDetails(
    planDate: string,
    calendarRoomsArea: string,
    pairs: Array<{ roomCode: string; department: string }>,
  ): Observable<void> {
    const normalizedDate = this.normalizePlanDate(planDate);
    const normalizedArea = this.normalizeCalendarArea(calendarRoomsArea);
    const uniquePairs = this.dedupeRoomDepartmentPairs(pairs);
    if (!uniquePairs.length) {
      return of(void 0);
    }

    return forkJoin(
      uniquePairs.map((pair) => this.fetchReturnPlanFromServer({
        planDate: normalizedDate,
        roomCode: pair.roomCode,
        department: pair.department,
        calendarRoomsArea: normalizedArea,
      }))
    ).pipe(
      map((records) => {
        records.forEach((record) => {
          if (!record || !this.matchesCalendarArea(record.calendarRoomsArea, normalizedArea)) {
            return;
          }
          this.cacheIndicatorRecord(record);
        });
      }),
      catchError(() => of(void 0)),
    );
  }

  clearIndicatorDetailsCache(): void {
    this.indicatorDetailsCache.clear();
  }

  private fetchReportRecords(planDate: string): Observable<DepartmentPlanReturnRecord[]> {
    return this.http
      .get(environment.url + 'GetDepartmentPlanReturnReport?' + this.buildReportQueryString({
        dateFrom: planDate,
        dateTo: planDate,
        departments: [],
        treatmentStatus: 'all',
      }))
      .pipe(
        map((res) => this.unwrapListResponse(res)),
        map((rows) => rows
          .map((row: unknown) => this.normalizeRecord(row))
          .filter((row): row is DepartmentPlanReturnRecord => row != null)),
        map((records) => this.groupReturnRecordsByReturnId(records)),
      );
  }

  private fetchReturnPlanFromServer(params: {
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
        map((record) => {
          if (!record) {
            return null;
          }
          if (record.returnId || recordHasCoordinatorAttention(record)) {
            return record;
          }
          return null;
        }),
      );
  }

  private mergeBoardIndicatorRecords(
    records: DepartmentPlanReturnRecord[],
    calendarRoomsArea: string,
  ): DepartmentPlanReturnRecord[] {
    return this.groupReturnRecordsByReturnId(records)
      .filter((record) => this.matchesCalendarArea(record.calendarRoomsArea, calendarRoomsArea));
  }

  private dedupeRoomDepartmentPairs(
    pairs: Array<{ roomCode: string; department: string }>,
  ): Array<{ roomCode: string; department: string }> {
    const seen = new Set<string>();
    return pairs.filter((pair) => {
      const roomCode = this.normalizeRoomCode(pair.roomCode);
      const department = String(pair.department || '').trim();
      if (!roomCode || !department) {
        return false;
      }
      const key = `${roomCode}|${department}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).map((pair) => ({
      roomCode: this.normalizeRoomCode(pair.roomCode),
      department: String(pair.department || '').trim(),
    }));
  }

  private getCachedIndicatorRecords(
    planDate: string,
    calendarRoomsArea: string,
  ): DepartmentPlanReturnRecord[] {
    return Array.from(this.indicatorDetailsCache.values()).filter((record) =>
      this.normalizePlanDate(record.planDate) === planDate &&
      this.matchesCalendarArea(record.calendarRoomsArea, calendarRoomsArea)
    );
  }

  private cacheIndicatorRecord(record: DepartmentPlanReturnRecord): void {
    const key = record.returnId || [
      this.normalizePlanDate(record.planDate),
      this.normalizeRoomCode(record.roomCode),
      record.department,
      this.normalizeCalendarArea(record.calendarRoomsArea),
    ].join('|');
    this.indicatorDetailsCache.set(key, record);
  }

  private normalizePlanDate(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw;
  }

  private normalizeCalendarArea(value: string): string {
    return String(value || '').trim();
  }

  private normalizeRoomCode(value: string): string {
    return String(value || '').trim();
  }

  private matchesCalendarArea(left: string, right: string): boolean {
    return this.normalizeCalendarArea(left) === this.normalizeCalendarArea(right);
  }

  private buildReportQueryString(filters: DepartmentPlanReturnReportFilters): string {
    const departments = filters.departments && filters.departments.length > 0
      ? filters.departments.join(',')
      : '';
    const treatmentStatus = filters.treatmentStatus && filters.treatmentStatus !== 'all'
      ? filters.treatmentStatus
      : '';

    const parts = [
      `fromDate=${encodeURIComponent(filters.dateFrom)}`,
      `toDate=${encodeURIComponent(filters.dateTo)}`,
      `departments=${encodeURIComponent(departments)}`,
      `treatmentStatus=${encodeURIComponent(treatmentStatus)}`,
      `includeDeleted=${filters.includeDeleted ? '1' : '0'}`,
    ];
    return parts.join('&');
  }

  private unwrapListResponse(res: unknown): unknown[] {
    const value = this.unwrapResponse(res);
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return this.unwrapListResponse(JSON.parse(value));
      } catch {
        return [];
      }
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      for (const key of ['records', 'Records', 'items', 'Items', 'rows', 'Rows', 'data', 'Data']) {
        if (Array.isArray(obj[key])) {
          return obj[key] as unknown[];
        }
      }
    }
    return [];
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
    const groupStatus = payload.treatmentStatus || 'pending';
    const rows = (payload.surgeries || []).map((row, index) => ({
      RowId: this.resolveSurgeryRowId(row, index),
      CaseNumber: row.caseNumber || '',
      PatientLabel: row.patientLabel || '',
      ProcedureName: row.procedureName || '',
      Surgeon: row.surgeon || '',
      ExistingNote: row.existingNote || '',
      CoordinatorComment: row.coordinatorComment || '',
      SurgeryTreatmentStatus: row.treatmentStatus || 'pending',
      TreatmentStatus: groupStatus,
    }));
    return JSON.stringify(rows);
  }

  private serializeResponseRowsJson(payload: DepartmentPlanReturnResponsePayload): string {
    const rows = (payload.surgeries || []).map((row, index) => ({
      RowId: this.resolveSurgeryRowId(row, index),
      DepartmentResponseText: row.departmentResponseText || '',
    }));
    return JSON.stringify(rows);
  }

  private resolveSurgeryRowId(row: { rowId?: string; caseNumber?: string }, index: number): string {
    const rowId = String(row.rowId || '').trim();
    if (rowId) {
      return rowId;
    }
    const caseNumber = String(row.caseNumber || '').trim();
    if (caseNumber) {
      return caseNumber;
    }
    return `row-${index + 1}`;
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

  private resolveServerReturnId(returnId?: string): string | null {
    if (!returnId || !this.isServerReturnId(returnId)) {
      return null;
    }
    return returnId;
  }

  isServerReturnId(returnId?: string): boolean {
    if (!returnId || returnId === '00000000-0000-0000-0000-000000000000') {
      return false;
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(returnId);
  }

  private unwrapResponse(res: unknown): unknown {
    if (res && typeof res === 'object' && 'd' in (res as Record<string, unknown>)) {
      return (res as Record<string, unknown>).d;
    }
    return res;
  }

  private unwrapBoolean(res: unknown): boolean {
    const value = this.unwrapResponse(res);
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj.success === true || obj.success === 'true' || obj.d === true) {
        return true;
      }
    }
    return false;
  }

  private parseSuccessFromAsmxResponse(res: unknown): boolean {
    if (typeof res === 'string') {
      return this.parseSuccessFromAsmxText(res);
    }
    return this.unwrapBoolean(res);
  }

  private parseSuccessFromAsmxText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    if (/"success"\s*:\s*true/i.test(trimmed)) {
      return true;
    }

    try {
      if (this.unwrapBoolean(JSON.parse(trimmed))) {
        return true;
      }
    } catch {
      const splitIndex = trimmed.indexOf('}{');
      if (splitIndex >= 0) {
        try {
          return this.unwrapBoolean(JSON.parse(trimmed.slice(0, splitIndex + 1)));
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  private extractSavedReturnId(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value === 'string') {
      return this.isServerReturnId(value) ? value : this.extractSavedReturnIdFromText(value);
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const id = obj.returnId ?? obj.ReturnId ?? obj.ReturnGroupId;
      if (id != null && id !== '') {
        return String(id);
      }
    }
    const asString = String(value);
    return this.isServerReturnId(asString) ? asString : null;
  }

  private extractSavedReturnIdFromHttpResponse(res: unknown): string | null {
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      const direct = this.extractSavedReturnId(obj);
      if (direct) {
        return direct;
      }
      const fromWrapper = this.extractSavedReturnId(obj.d);
      if (fromWrapper) {
        return fromWrapper;
      }
    }
    if (typeof res === 'string') {
      return this.extractSavedReturnIdFromText(res);
    }
    return null;
  }

  private extractSavedReturnIdFromText(text: string): string | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const trimmed = text.trim();
    const idMatch = trimmed.match(/"(?:returnId|ReturnGroupId|ReturnId)"\s*:\s*"([^"]+)"/i);
    if (idMatch?.[1] && this.isServerReturnId(idMatch[1])) {
      return idMatch[1];
    }

    try {
      return this.extractSavedReturnIdFromHttpResponse(JSON.parse(trimmed));
    } catch {
      const splitIndex = trimmed.indexOf('}{');
      if (splitIndex >= 0) {
        try {
          return this.extractSavedReturnIdFromHttpResponse(JSON.parse(trimmed.slice(0, splitIndex + 1)));
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  private flattenApiRecord(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const record = raw as Record<string, unknown>;
    const header = record.header || record.Header;
    if (header && typeof header === 'object' && !Array.isArray(header)) {
      return {
        ...(header as Record<string, unknown>),
        surgeries: record.surgeries || record.Surgeries || [],
      };
    }

    return record;
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
    if (!recordHasCoordinatorAttention(record)) {
      this.removeLocalRecordsForContext(record);
      return;
    }

    let records = this.readLocalRecords().filter((item) =>
      !this.isSameReturnContext(item, record) || item.returnId === record.returnId
    );
    const index = records.findIndex((item) => item.returnId === record.returnId);
    if (index >= 0) {
      records[index] = {
        ...records[index],
        ...record,
        generalResponseText: record.generalResponseText || records[index].generalResponseText,
      };
      this.cacheIndicatorRecord(records[index]);
    } else {
      records.unshift(record);
      this.cacheIndicatorRecord(record);
    }
    this.writeLocalRecords(records);
  }

  private removeLocalRecordsForContext(record: DepartmentPlanReturnRecord): void {
    const records = this.readLocalRecords().filter((item) => !this.isSameReturnContext(item, record));
    this.writeLocalRecords(records);
    this.removeCachedIndicatorRecord(record);
  }

  private removeCachedIndicatorRecord(record: DepartmentPlanReturnRecord): void {
    const keys = [
      record.returnId,
      [
        this.normalizePlanDate(record.planDate),
        this.normalizeRoomCode(record.roomCode),
        record.department,
        this.normalizeCalendarArea(record.calendarRoomsArea),
      ].join('|'),
    ].filter(Boolean) as string[];
    keys.forEach((key) => this.indicatorDetailsCache.delete(key));
  }

  private isSameReturnContext(
    left: Pick<DepartmentPlanReturnRecord, 'planDate' | 'roomCode' | 'department' | 'calendarRoomsArea'>,
    right: Pick<DepartmentPlanReturnRecord, 'planDate' | 'roomCode' | 'department' | 'calendarRoomsArea'>,
  ): boolean {
    return this.normalizePlanDate(left.planDate) === this.normalizePlanDate(right.planDate) &&
      this.normalizeRoomCode(left.roomCode) === this.normalizeRoomCode(right.roomCode) &&
      left.department === right.department &&
      this.matchesCalendarArea(left.calendarRoomsArea, right.calendarRoomsArea);
  }

  private groupReturnRecordsByReturnId(records: DepartmentPlanReturnRecord[]): DepartmentPlanReturnRecord[] {
    const groups = new Map<string, DepartmentPlanReturnRecord>();
    records.forEach((record) => {
      const normalizedRecord: DepartmentPlanReturnRecord = {
        ...record,
        planDate: this.normalizePlanDate(record.planDate),
        roomCode: this.normalizeRoomCode(record.roomCode),
        calendarRoomsArea: this.normalizeCalendarArea(record.calendarRoomsArea),
        surgeries: [...(record.surgeries || [])],
      };
      const key = normalizedRecord.returnId || [
        normalizedRecord.planDate,
        normalizedRecord.roomCode,
        normalizedRecord.department,
        normalizedRecord.calendarRoomsArea,
      ].join('|');
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, normalizedRecord);
        return;
      }

      this.mergeReturnRecordHeaders(existing, normalizedRecord);

      const surgeryIds = new Set(existing.surgeries.map((row) => row.rowId));
      (normalizedRecord.surgeries || []).forEach((row) => {
        if (!surgeryIds.has(row.rowId)) {
          existing.surgeries.push(row);
          surgeryIds.add(row.rowId);
          return;
        }
        const index = existing.surgeries.findIndex((item) => item.rowId === row.rowId);
        if (index >= 0) {
          existing.surgeries[index] = this.mergeSurgeryRow(existing.surgeries[index], row);
        }
      });
    });
    return Array.from(groups.values());
  }

  private mergeReturnRecordHeaders(
    target: DepartmentPlanReturnRecord,
    source: DepartmentPlanReturnRecord,
  ): void {
    if (!target.returnId && source.returnId) {
      target.returnId = source.returnId;
    }
    if (!(target.generalComment || '').trim() && (source.generalComment || '').trim()) {
      target.generalComment = source.generalComment;
    }
    if (!(target.generalResponseText || '').trim() && (source.generalResponseText || '').trim()) {
      target.generalResponseText = source.generalResponseText;
    }
    if (!target.sentAt && source.sentAt) {
      target.sentAt = source.sentAt;
    }
    if (!target.sentBy && source.sentBy) {
      target.sentBy = source.sentBy;
    }
    if (target.treatmentStatus === 'pending' && source.treatmentStatus !== 'pending') {
      target.treatmentStatus = source.treatmentStatus;
    }
    if (!target.isDeleted && source.isDeleted) {
      target.isDeleted = source.isDeleted;
    }
    if (!target.deletedAt && source.deletedAt) {
      target.deletedAt = source.deletedAt;
    }
    if (!target.deletedBy && source.deletedBy) {
      target.deletedBy = source.deletedBy;
    }
  }

  private mergeSurgeryRow(
    target: DepartmentPlanReturnSurgeryRow,
    source: DepartmentPlanReturnSurgeryRow,
  ): DepartmentPlanReturnSurgeryRow {
    return {
      ...target,
      coordinatorComment: (target.coordinatorComment || '').trim()
        ? target.coordinatorComment
        : source.coordinatorComment,
      departmentResponseText: (target.departmentResponseText || '').trim()
        ? target.departmentResponseText
        : source.departmentResponseText,
      treatmentStatus: target.treatmentStatus !== 'pending' ? target.treatmentStatus : source.treatmentStatus,
      isDeleted: target.isDeleted || source.isDeleted,
      deletedAt: target.deletedAt || source.deletedAt || null,
      deletedBy: target.deletedBy || source.deletedBy || null,
    };
  }

  private readSoftDeletedMarkers(): DepartmentPlanReturnSoftDeleteMarker[] {
    try {
      const raw = sessionStorage.getItem(SOFT_DELETED_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeSoftDeletedMarkers(markers: DepartmentPlanReturnSoftDeleteMarker[]): void {
    sessionStorage.setItem(SOFT_DELETED_STORAGE_KEY, JSON.stringify(markers.slice(0, 200)));
  }

  private finalizeRecordDeletedState(record: DepartmentPlanReturnRecord): DepartmentPlanReturnRecord {
    const surgeries = record.surgeries || [];
    if (!normalizeDeletedFlag(record.isDeleted) && surgeries.length > 0) {
      const allDeleted = surgeries.every((row) => normalizeDeletedFlag(row.isDeleted));
      if (allDeleted) {
        const latest = surgeries[surgeries.length - 1];
        record.isDeleted = true;
        record.deletedAt = record.deletedAt || latest?.deletedAt || null;
        record.deletedBy = record.deletedBy || latest?.deletedBy || null;
      }
    }
    return record;
  }

  private mergeSoftDeletedMarkers(
    records: DepartmentPlanReturnRecord[],
    filters: DepartmentPlanReturnReportFilters,
  ): DepartmentPlanReturnRecord[] {
    const byReturnId = new Map<string, DepartmentPlanReturnRecord>();
    records.forEach((record) => {
      if (record.returnId) {
        byReturnId.set(record.returnId, record);
      }
    });

    const markers = this.readSoftDeletedMarkers().filter((marker) =>
      this.markerMatchesReportFilters(marker, filters)
    );

    markers.forEach((marker) => {
      const existing = byReturnId.get(marker.returnId);
      if (existing) {
        this.applySoftDeleteMarker(existing, marker);
        return;
      }

      const synthetic = this.buildSyntheticDeletedRecord(marker);
      byReturnId.set(marker.returnId, synthetic);
    });

    return Array.from(byReturnId.values()).sort((a, b) =>
      String(b.planDate).localeCompare(String(a.planDate))
    );
  }

  private markerMatchesReportFilters(
    marker: DepartmentPlanReturnSoftDeleteMarker,
    filters: DepartmentPlanReturnReportFilters,
  ): boolean {
    const planDate = this.normalizePlanDate(marker.planDate);
    if (filters.dateFrom && planDate < this.normalizePlanDate(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && planDate > this.normalizePlanDate(filters.dateTo)) {
      return false;
    }
    if (filters.departments && filters.departments.length > 0) {
      const departmentLabel = this.stripDepartmentQuotes(marker.departmentDisplay || marker.department);
      const matches = filters.departments.some((dept) => departmentLabel.indexOf(dept) >= 0);
      if (!matches) {
        return false;
      }
    }
    return true;
  }

  private applySoftDeleteMarker(
    record: DepartmentPlanReturnRecord,
    marker: DepartmentPlanReturnSoftDeleteMarker,
  ): void {
    if (!marker.rowId) {
      record.isDeleted = true;
      record.deletedAt = marker.deletedAt;
      record.deletedBy = marker.deletedBy;
      record.surgeries = (record.surgeries || []).map((row) => ({
        ...row,
        isDeleted: true,
        deletedAt: marker.deletedAt,
        deletedBy: marker.deletedBy,
      }));
      return;
    }

    record.surgeries = (record.surgeries || []).map((row) => {
      if (row.rowId !== marker.rowId) {
        return row;
      }
      return {
        ...row,
        isDeleted: true,
        deletedAt: marker.deletedAt,
        deletedBy: marker.deletedBy,
      };
    });
    this.finalizeRecordDeletedState(record);
  }

  private buildSyntheticDeletedRecord(marker: DepartmentPlanReturnSoftDeleteMarker): DepartmentPlanReturnRecord {
    return {
      returnId: marker.returnId,
      department: marker.department,
      departmentDisplay: marker.departmentDisplay || marker.department,
      roomCode: this.normalizeRoomCode(marker.roomCode),
      planDate: this.normalizePlanDate(marker.planDate),
      calendarRoomsArea: this.normalizeCalendarArea(marker.calendarRoomsArea || ''),
      generalComment: '',
      generalResponseText: '',
      treatmentStatus: 'pending',
      sentAt: '',
      sentBy: '',
      respondedAt: null,
      respondedBy: null,
      isDeleted: true,
      deletedAt: marker.deletedAt,
      deletedBy: marker.deletedBy,
      surgeries: [],
    };
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
    const existing = this.readLocalRecords().find((record) =>
      record.returnId === returnId || this.isSameReturnContext(record, {
        planDate: payload.planDate,
        roomCode: payload.roomCode,
        department: payload.department,
        calendarRoomsArea: payload.calendarRoomsArea,
      })
    );

    return {
      returnId,
      department: payload.department,
      departmentDisplay: payload.departmentDisplay,
      roomCode: payload.roomCode,
      planDate: payload.planDate,
      calendarRoomsArea: payload.calendarRoomsArea,
      generalComment: payload.generalComment,
      generalResponseText: existing?.generalResponseText || '',
      treatmentStatus: payload.treatmentStatus || 'pending',
      sentAt: existing?.sentAt || '',
      sentBy: existing?.sentBy || payload.sentBy,
      respondedAt: existing?.respondedAt ?? null,
      respondedBy: existing?.respondedBy ?? null,
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
    const record = this.flattenApiRecord(raw);
    if (!record) {
      return null;
    }

    const surgeries = this.extractSurgeries(record);
    const groupTreatmentStatus = this.readGroupTreatmentStatus(record, surgeries);

    return {
      returnId: String(record.returnId || record.ReturnId || record.ReturnGroupId || ''),
      department: String(record.department || record.Department || ''),
      departmentDisplay: String(
        record.departmentDisplay || record.DepartmentDisplay || record.department || record.Department || ''
      ),
      roomCode: this.normalizeRoomCode(String(record.roomCode || record.RoomCode || '')),
      planDate: this.normalizePlanDate(String(record.planDate || record.PlanDate || '')),
      calendarRoomsArea: this.normalizeCalendarArea(String(record.calendarRoomsArea || record.CalendarRoomsArea || '')),
      generalComment: String(record.generalComment || record.GeneralComment || ''),
      generalResponseText: String(record.generalResponseText || record.GeneralResponseText || ''),
      treatmentStatus: this.normalizeStatus(groupTreatmentStatus),
      sentAt: String(record.sentAt || record.SentAt || ''),
      sentBy: String(record.sentBy || record.SentBy || ''),
      respondedAt: (record.respondedAt || record.RespondedAt) ? String(record.respondedAt || record.RespondedAt) : null,
      respondedBy: (record.respondedBy || record.RespondedBy) ? String(record.respondedBy || record.RespondedBy) : null,
      isDeleted: normalizeDeletedFlag(
        record.isDeleted ?? record.IsDeleted ?? record.IS_DELETED ?? record.is_deleted
      ),
      deletedAt: (record.deletedAt || record.DeletedAt) ? String(record.deletedAt || record.DeletedAt) : null,
      deletedBy: (record.deletedBy || record.DeletedBy) ? String(record.deletedBy || record.DeletedBy) : null,
      surgeries,
    };
  }

  private readGroupTreatmentStatus(
    record: Record<string, unknown>,
    surgeries: DepartmentPlanReturnSurgeryRow[],
  ): string | undefined {
    const rawList = record.surgeries || record.Surgeries;
    if (Array.isArray(rawList) && rawList.length > 0) {
      const first = rawList[0] as Record<string, unknown>;
      const status = first.TreatmentStatus || first.treatmentStatus;
      if (status != null && status !== '') {
        return String(status);
      }
    }

    const status = record.TreatmentStatus || record.treatmentStatus;
    if (status != null && status !== '') {
      return String(status);
    }

    return surgeries[0]?.treatmentStatus;
  }

  private parseRowsJsonMeta(rowsJson: unknown): { treatmentStatus?: string } {
    if (typeof rowsJson !== 'string' || !rowsJson.trim()) {
      return {};
    }
    try {
      const parsed = JSON.parse(rowsJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          treatmentStatus: parsed.TreatmentStatus || parsed.treatmentStatus,
        };
      }
    } catch {
      return {};
    }
    return {};
  }

  private extractSurgeries(record: Record<string, unknown>): DepartmentPlanReturnSurgeryRow[] {
    if (record.RowId || record.rowId) {
      return [this.mapSurgeryRow(record, 0)];
    }

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
        if (parsed && Array.isArray(parsed.Surgeries)) {
          return parsed.Surgeries.map((item: unknown, index: number) => this.mapSurgeryRow(item, index));
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
      rowId: String(item.rowId || item.RowId || item.Row_ID || item.casenumber || index),
      caseNumber: String(item.caseNumber || item.CaseNumber || item.casenumber || ''),
      room: String(item.room || item.Room || ''),
      patientLabel: String(item.patientLabel || item.PatientLabel || item.id || ''),
      age: String(item.age || item.Age || ''),
      procedureName: String(item.procedureName || item.ProcedureName || item.s_name || ''),
      surgeon: String(item.surgeon || item.Surgeon || item.doctor || ''),
      duration: String(item.duration || item.Duration || ''),
      existingNote: String(item.existingNote || item.ExistingNote || item.note || ''),
      coordinatorComment: String(item.coordinatorComment || item.CoordinatorComment || ''),
      departmentResponseText: String(item.departmentResponseText || item.DepartmentResponseText || ''),
      treatmentStatus: this.normalizeStatus(
        item.SurgeryTreatmentStatus || item.surgeryTreatmentStatus || item.treatmentStatus || item.TreatmentStatus
      ),
      isDeleted: normalizeDeletedFlag(
        item.isDeleted ?? item.IsDeleted ?? item.IS_DELETED ?? item.is_deleted
      ),
      deletedAt: (item.deletedAt || item.DeletedAt) ? String(item.deletedAt || item.DeletedAt) : null,
      deletedBy: (item.deletedBy || item.DeletedBy) ? String(item.deletedBy || item.DeletedBy) : null,
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
