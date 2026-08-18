import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, filter, finalize, map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  DepartmentPlanReturnPayload,
  DepartmentPlanReturnRecord,
  DepartmentPlanReturnReportFilters,
  DepartmentPlanReturnResponsePayload,
  DepartmentPlanReturnSurgeryRow,
  DepartmentPlanTreatmentStatus,
  normalizeDeletedFlag,
  normalizeDepartmentForServer,
  departmentsMatchForPlanReturn,
  normalizePlanReturnCaseNumber,
  recordHasCoordinatorAttention,
  recordQualifiesForBoardReturnIndicator,
  surgeryRowIsSoftDeleted,
} from './department-plan-return.models';

const LOCAL_STORAGE_KEY = 'surgery_department_plan_returns_v1';

@Injectable({ providedIn: 'root' })
export class DepartmentPlanReturnApiService {
  private indicatorDetailsCache = new Map<string, DepartmentPlanReturnRecord>();
  private returnPlanInflight = new Map<string, Observable<DepartmentPlanReturnRecord | null>>();
  private reportRecordsByDate = new Map<string, Observable<DepartmentPlanReturnRecord[]>>();

  constructor(private http: HttpClient) {}

  loadReturnPlan(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord | null> {
    return forkJoin({
      primary: this.fetchReturnPlanRecordFromServer(params).pipe(catchError(() => of(null))),
      aliases: this.fetchReturnPlansFromRoomAliases(params),
      report: this.fetchReportRecords(params.planDate),
    }).pipe(
      map(({ primary, aliases, report }) => {
        const resolved = primary || this.findLocalRecord(params);
        const related = this.collectRelatedReturnRecordsForPlan(
          params,
          [...report, ...aliases],
          this.findLocalRecordsForDepartment(params),
        );
        if (!resolved && !related.length) {
          return null;
        }

        const base = resolved || this.buildEmptyReturnPlanShell(params);
        const merged = this.mergeSurgeryCommentsFromRelatedRooms(base, related);
        const enriched = this.enrichRecordWithReportMetadata(merged, report);
        this.upsertLocalRecord(enriched);
        return enriched;
      }),
    );
  }

  /** Lookup existing ReturnGroupId without writing — use before save to avoid duplicate INSERT. */
  lookupServerReturnId(
    payload: Pick<DepartmentPlanReturnPayload, 'returnId' | 'planDate' | 'roomCode' | 'department' | 'calendarRoomsArea'>,
  ): Observable<string | null> {
    return this.resolveExistingReturnIdForSave(payload).pipe(
      map((returnId) => this.resolveServerReturnId(returnId)),
    );
  }

  saveCoordinatorReturn(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    return this.resolveExistingReturnIdForSave(payload).pipe(
      switchMap((returnId) => this.postCoordinatorSave(payload, returnId)),
    );
  }

  private postCoordinatorSave(payload: DepartmentPlanReturnPayload, returnId: string): Observable<string | null> {
    const body: Record<string, string> = {
      returnId,
      planDate: payload.planDate,
      roomCode: payload.roomCode,
      department: normalizeDepartmentForServer(payload.department),
      departmentDisplay: payload.departmentDisplay || normalizeDepartmentForServer(payload.department),
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
          if (this.isAsmxMutationThreadAbort(err)) {
            if (returnId && this.isServerReturnId(returnId)) {
              this.upsertLocalRecord(this.buildRecordFromPayload({ ...payload, returnId }, returnId));
              return of(returnId);
            }
            return this.resolveReturnIdAfterSave(payload);
          }
          if (this.isDuplicatePlanReturnError(err)) {
            return this.resolveReturnIdAfterSave(payload).pipe(
              switchMap((resolvedId) => {
                if (!resolvedId || !this.isServerReturnId(resolvedId)) {
                  return of(null);
                }
                if (returnId) {
                  return of(returnId);
                }
                return this.postCoordinatorSave({ ...payload, returnId: resolvedId }, resolvedId);
              }),
            );
          }
          if (!err?.status) {
            const localReturnId = this.buildLocalReturnId(payload);
            this.upsertLocalRecord(this.buildRecordFromPayload(payload, localReturnId));
            return of(localReturnId);
          }
          return of(null);
        }),
        switchMap((serverId) => {
          if (serverId) {
            this.upsertLocalRecord(this.buildRecordFromPayload(payload, serverId));
            return of(serverId);
          }
          return this.resolveReturnIdAfterSave(payload);
        }),
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
        department: normalizeDepartmentForServer(payload.department),
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
      treatmentStatus: payload.treatmentStatus || 'pending',
      respondedBy: payload.respondedBy || '',
      rowsJson: this.serializeResponseRowsJson(payload),
    };

    return this.http
      .post(environment.url + 'SaveDepartmentPlanReturnResponseMethod', body, { responseType: 'text' })
      .pipe(
        map((text) => this.interpretAsmxMutationOutcome(text)),
        catchError((err) => of(this.interpretAsmxMutationOutcome(null, err))),
        map((serverOk) => {
          if (serverOk) {
            this.applyLocalResponse(payload);
            return true;
          }
          return this.applyLocalResponse(payload);
        }),
      );
  }

  deleteDepartmentPlanReturn(
    returnId: string,
    rowId: string | null | undefined,
    deletedBy: string,
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
        map((text) => this.interpretAsmxMutationOutcome(text)),
        catchError((err) => of(this.interpretAsmxMutationOutcome(null, err))),
        tap((ok) => {
          if (ok) {
            this.applyLocalSoftDelete(returnId, normalizedRowId, deletedBy);
          }
        }),
      );
  }

  ensureServerReturnId(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    const existing = this.resolveServerReturnId(payload.returnId);
    if (existing) {
      return of(existing);
    }
    return this.lookupServerReturnId(payload).pipe(
      switchMap((lookupId) => {
        if (lookupId) {
          return of(lookupId);
        }
        return this.saveCoordinatorReturn(payload).pipe(
          map((id) => (id && this.isServerReturnId(id) ? id : null)),
        );
      }),
    );
  }

  deleteCoordinatorSurgeryComment(
    payload: DepartmentPlanReturnPayload,
    rowId: string,
    deletedBy: string,
  ): Observable<{ success: boolean; returnId: string | null }> {
    return this.ensureServerReturnId(payload).pipe(
      switchMap((returnId) => {
        if (!returnId) {
          return of({ success: false, returnId: null });
        }
        return this.deleteDepartmentPlanReturn(returnId, rowId, deletedBy).pipe(
          map((success) => ({ success, returnId })),
        );
      }),
    );
  }

  deleteCoordinatorGeneralComment(
    payload: DepartmentPlanReturnPayload,
    deletedBy: string,
  ): Observable<{ success: boolean; returnId: string | null }> {
    const hasActiveSurgeryComments = (payload.surgeries || []).some((row) =>
      !surgeryRowIsSoftDeleted(row) && (row.coordinatorComment || '').trim().length > 0
    );

    return this.ensureServerReturnId(payload).pipe(
      switchMap((returnId) => {
        if (!returnId) {
          return of({ success: false, returnId: null });
        }
        if (!hasActiveSurgeryComments) {
          return this.deleteDepartmentPlanReturn(returnId, '', deletedBy).pipe(
            map((success) => ({ success, returnId })),
          );
        }
        const clearedPayload: DepartmentPlanReturnPayload = {
          ...payload,
          returnId,
          generalComment: '',
        };
        return this.saveCoordinatorReturn(clearedPayload).pipe(
          map((id) => ({ success: !!id, returnId: id || returnId })),
        );
      }),
    );
  }

  deleteCoordinatorEntireGroup(
    payload: DepartmentPlanReturnPayload,
    deletedBy: string,
  ): Observable<{ success: boolean; returnId: string | null }> {
    return this.ensureServerReturnId(payload).pipe(
      switchMap((returnId) => {
        if (!returnId) {
          return of({ success: false, returnId: null });
        }
        return this.deleteDepartmentPlanReturn(returnId, '', deletedBy).pipe(
          map((success) => ({ success, returnId })),
        );
      }),
    );
  }

  getReport(filters: DepartmentPlanReturnReportFilters): Observable<DepartmentPlanReturnRecord[]> {
    return forkJoin([
      this.fetchReportRawRows({ ...filters, includeDeleted: false }),
      this.fetchReportRawRows({ ...filters, includeDeleted: true }),
    ]).pipe(
      map(([activeRows, deletedRows]) => [...activeRows, ...deletedRows]),
      map((rows) => this.mapReportRowsToRecords(rows)),
      map((serverRows) => this.filterRecords(serverRows, filters)),
      catchError(() => of([])),
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

  loadBoardReturnIndicators(
    planDate: string,
    calendarRoomsArea: string,
    _pairs: Array<{ roomCode: string; department: string }> = [],
    _roomCodes: string[] = [],
  ): Observable<DepartmentPlanReturnRecord[]> {
    const normalizedDate = this.normalizePlanDate(planDate);
    const normalizedArea = this.normalizeCalendarArea(calendarRoomsArea);
    this.pruneStaleLocalRecords(normalizedDate, normalizedArea);

    return this.fetchReportRecords(normalizedDate).pipe(
      switchMap((reportRecords) => {
        const candidates = this.collectAllCommentCandidatesForBoard(
          normalizedDate,
          normalizedArea,
          reportRecords,
        );
        const returnIds = this.collectHydrationReturnIds(candidates);
        if (!returnIds.length) {
          return of(candidates);
        }

        return forkJoin(
          returnIds.map((returnId) =>
            this.getReturnById(returnId).pipe(catchError(() => of(null))),
          ),
        ).pipe(
          map((hydrated) => {
            const hydratedRecords = hydrated.filter((record): record is DepartmentPlanReturnRecord => !!record);
            return this.groupReturnRecordsByReturnId([...candidates, ...hydratedRecords]);
          }),
        );
      }),
      tap((records) => {
        records.forEach((record) => {
          if (recordQualifiesForBoardReturnIndicator(record)) {
            this.upsertLocalRecord(record);
          }
        });
      }),
      catchError(() => of([])),
    );
  }

  private collectAllCommentCandidatesForBoard(
    planDate: string,
    calendarRoomsArea: string,
    reportRecords: DepartmentPlanReturnRecord[],
  ): DepartmentPlanReturnRecord[] {
    const candidates: DepartmentPlanReturnRecord[] = [
      ...reportRecords,
      ...this.readLocalRecords(),
      ...Array.from(this.indicatorDetailsCache.values()),
    ].filter((record) =>
      this.normalizePlanDate(record.planDate) === planDate &&
      this.matchesCalendarArea(record.calendarRoomsArea, calendarRoomsArea)
    );
    return this.groupReturnRecordsByReturnId(candidates);
  }

  private collectHydrationReturnIds(records: DepartmentPlanReturnRecord[]): string[] {
    return Array.from(new Set(
      records
        .map((record) => this.resolveServerReturnId(record.returnId))
        .filter((returnId): returnId is string => !!returnId),
    ));
  }

  private collectBoardIndicatorRecords(
    planDate: string,
    roomCodesOnBoard: Set<string>,
    reportRecords: DepartmentPlanReturnRecord[],
  ): DepartmentPlanReturnRecord[] {
    const candidates: DepartmentPlanReturnRecord[] = [
      ...reportRecords,
      ...this.readLocalRecords(),
      ...Array.from(this.indicatorDetailsCache.values()),
    ];
    const seen = new Set<string>();
    const matching: DepartmentPlanReturnRecord[] = [];
    candidates.forEach((record) => {
      if (!this.recordMatchesBoardIndicator(record, planDate, roomCodesOnBoard)) {
        return;
      }
      const dedupeKey = (record.returnId || '').trim()
        || [
          this.normalizePlanDate(record.planDate),
          this.normalizeRoomCode(record.roomCode),
          normalizeDepartmentForServer(record.department),
          this.normalizeCalendarArea(record.calendarRoomsArea),
        ].join('|');
      if (seen.has(dedupeKey)) {
        return;
      }
      seen.add(dedupeKey);
      matching.push(record);
    });
    return this.groupReturnRecordsByReturnId(matching);
  }

  private recordMatchesBoardIndicator(
    record: DepartmentPlanReturnRecord,
    planDate: string,
    roomCodesOnBoard: Set<string>,
  ): boolean {
    if (!recordQualifiesForBoardReturnIndicator(record)) {
      return false;
    }
    if (this.normalizePlanDate(record.planDate) !== planDate) {
      return false;
    }
    return this.roomCodeMatchesIndicatorSet(record.roomCode, roomCodesOnBoard);
  }

  private roomCodeMatchesIndicatorSet(roomCode: string, roomCodesOnBoard: Set<string>): boolean {
    const normalized = this.normalizeRoomCode(roomCode).toLowerCase();
    if (!normalized) {
      return false;
    }
    for (const candidate of roomCodesOnBoard) {
      if (String(candidate || '').trim().toLowerCase() === normalized) {
        return true;
      }
    }
    return false;
  }

  prefetchBoardReturnDetails(
    planDate: string,
    calendarRoomsArea: string,
    _pairs: Array<{ roomCode: string; department: string }> = [],
    _roomCodes: string[] = [],
  ): Observable<void> {
    const normalizedDate = this.normalizePlanDate(planDate);
    const normalizedArea = this.normalizeCalendarArea(calendarRoomsArea);

    return this.fetchReportRecords(normalizedDate).pipe(
      map((records) => {
        records.forEach((record) => {
          if (!this.matchesCalendarArea(record.calendarRoomsArea, normalizedArea)) {
            return;
          }
          if (recordQualifiesForBoardReturnIndicator(record)) {
            this.cacheIndicatorRecord(record);
            return;
          }
          this.removeCachedIndicatorRecord(record);
        });
      }),
      catchError(() => of(void 0)),
    );
  }

  clearIndicatorDetailsCache(): void {
    this.indicatorDetailsCache.clear();
  }

  private fetchReportRecords(planDate: string): Observable<DepartmentPlanReturnRecord[]> {
    const normalizedDate = this.normalizePlanDate(planDate);
    if (!normalizedDate) {
      return of([]);
    }

    let cached$ = this.reportRecordsByDate.get(normalizedDate);
    if (!cached$) {
      cached$ = this.fetchReportRawRows({
        dateFrom: normalizedDate,
        dateTo: normalizedDate,
        departments: [],
        treatmentStatus: 'all',
        includeDeleted: false,
      }).pipe(
        map((rows) => this.mapReportRowsToRecords(rows)),
        shareReplay(1),
      );
      this.reportRecordsByDate.set(normalizedDate, cached$);
    }
    return cached$;
  }

  private enrichRecordWithReportMetadata(
    record: DepartmentPlanReturnRecord,
    reportRecords: DepartmentPlanReturnRecord[],
  ): DepartmentPlanReturnRecord {
    const match = reportRecords.find((row) =>
      row.returnId && record.returnId && row.returnId === record.returnId
    ) || reportRecords.find((row) =>
      this.normalizePlanDate(row.planDate) === this.normalizePlanDate(record.planDate) &&
      this.normalizeRoomCode(row.roomCode) === this.normalizeRoomCode(record.roomCode) &&
      (
        departmentsMatchForPlanReturn(row.department, record.department) ||
        departmentsMatchForPlanReturn(
          row.departmentDisplay || row.department,
          record.departmentDisplay || record.department,
        )
      )
    );
    if (!match) {
      return record;
    }

    return {
      ...record,
      returnId: record.returnId || match.returnId,
      sentBy: (record.sentBy || '').trim() || match.sentBy,
      sentAt: (record.sentAt || '').trim() || match.sentAt,
      createdAt: (record.createdAt || '').trim() || match.createdAt,
    };
  }

  private fetchReportRawRows(filters: DepartmentPlanReturnReportFilters): Observable<unknown[]> {
    return this.http
      .get(
        environment.url + 'GetDepartmentPlanReturnReport?' + this.buildReportQueryString(filters),
        { responseType: 'text' },
      )
      .pipe(
        map((text) => this.unwrapListResponse(this.parseAsmxJsonText(text))),
        catchError((err) => {
          const raw = typeof err?.error === 'string' ? err.error : '';
          return of(this.unwrapListResponse(this.parseAsmxJsonText(raw)));
        }),
      );
  }

  private mapReportRowsToRecords(rows: unknown[]): DepartmentPlanReturnRecord[] {
    const normalized = rows
      .map((row) => this.normalizeRecord(row))
      .filter((row): row is DepartmentPlanReturnRecord => row != null);
    const grouped = this.groupReturnRecordsByReturnId(normalized);
    return grouped.map((record) =>
      this.finalizeRecordDeletedState(this.enrichRecordCreatedMetadata(record, normalized)),
    );
  }

  private enrichRecordCreatedMetadata(
    record: DepartmentPlanReturnRecord,
    allRows: DepartmentPlanReturnRecord[],
  ): DepartmentPlanReturnRecord {
    const siblings = allRows.filter((row) =>
      row.returnId && record.returnId && row.returnId === record.returnId
    );
    if (!siblings.length) {
      return record;
    }

    let sentBy = (record.sentBy || '').trim();
    let sentAt = (record.sentAt || '').trim();
    let createdAt = (record.createdAt || '').trim();

    siblings.forEach((row) => {
      const rowSentBy = (row.sentBy || '').trim();
      const rowSentAt = (row.sentAt || '').trim();
      const rowCreatedAt = (row.createdAt || '').trim();
      if (!sentBy && rowSentBy) {
        sentBy = rowSentBy;
      }
      if (!sentAt && rowSentAt) {
        sentAt = rowSentAt;
      }
      if (!createdAt && rowCreatedAt) {
        createdAt = rowCreatedAt;
      } else if (rowCreatedAt && createdAt && rowCreatedAt < createdAt) {
        createdAt = rowCreatedAt;
      }
    });

    return {
      ...record,
      sentBy,
      sentAt,
      createdAt,
    };
  }

  private parseAsmxJsonText(text: string): unknown {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      const splitIndex = trimmed.indexOf('}{');
      if (splitIndex < 0) {
        return null;
      }

      const firstPart = trimmed.slice(0, splitIndex + 1);
      try {
        return JSON.parse(firstPart);
      } catch {
        try {
          return JSON.parse(trimmed.slice(splitIndex + 1));
        } catch {
          return null;
        }
      }
    }
  }

  /** Unwrap ASMX `{ d: ... }`, nested JSON strings, and plain GUID responses. */
  private unwrapAsmxPayload(value: unknown): unknown {
    let current = value;
    for (let depth = 0; depth < 6; depth++) {
      if (current == null) {
        return null;
      }
      if (typeof current === 'string') {
        const trimmed = current.trim();
        if (!trimmed) {
          return null;
        }
        if (this.isServerReturnId(trimmed)) {
          return trimmed;
        }
        const parsed = this.parseAsmxJsonText(trimmed);
        if (parsed == null || parsed === trimmed) {
          return trimmed;
        }
        current = parsed;
        continue;
      }
      if (typeof current === 'object' && !Array.isArray(current) && 'd' in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>).d;
        continue;
      }
      break;
    }
    return current;
  }

  private buildReturnPlanQuery(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): HttpParams {
    return new HttpParams()
      .set('planDate', params.planDate)
      .set('roomCode', params.roomCode)
      .set('department', normalizeDepartmentForServer(params.department))
      .set('calendarRoomsArea', params.calendarRoomsArea);
  }

  private fetchReturnPlanRecordFromServer(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord | null> {
    const cacheKey = this.buildReturnPlanCacheKey(params);
    const inflight = this.returnPlanInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request$ = this.executeReturnPlanHttpGet(params, false).pipe(
      shareReplay(1),
      finalize(() => this.returnPlanInflight.delete(cacheKey)),
    );
    this.returnPlanInflight.set(cacheKey, request$);
    return request$;
  }

  private executeReturnPlanHttpGet(
    params: {
      department: string;
      roomCode: string;
      planDate: string;
      calendarRoomsArea: string;
    },
    trustServerMatch = false,
  ): Observable<DepartmentPlanReturnRecord | null> {
    const query = this.buildReturnPlanQuery(params);
    const url = environment.url + 'GetDepartmentPlanReturn';

    return this.http.get(url, { params: query }).pipe(
      map((res) => this.normalizeRecordFromApiPayload(res, trustServerMatch ? undefined : params)),
      catchError(() =>
        this.http.get(url, { params: query, responseType: 'text' }).pipe(
          map((text) => this.normalizeRecordFromApiPayload(text, trustServerMatch ? undefined : params)),
          catchError(() => of(null)),
        ),
      ),
      map((record) => {
        if (record && recordHasCoordinatorAttention(record)) {
          this.cacheIndicatorRecord(record);
        }
        return record;
      }),
    );
  }

  private buildReturnPlanCacheKey(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): string {
    return [
      this.normalizePlanDate(params.planDate),
      this.normalizeRoomCode(params.roomCode),
      normalizeDepartmentForServer(params.department),
      this.normalizeCalendarArea(params.calendarRoomsArea),
    ].join('|');
  }

  private matchesReturnPlanRequest(
    record: DepartmentPlanReturnRecord,
    params: {
      department: string;
      roomCode: string;
      planDate: string;
      calendarRoomsArea: string;
    },
  ): boolean {
    return this.normalizePlanDate(record.planDate) === this.normalizePlanDate(params.planDate) &&
      this.normalizeRoomCode(record.roomCode) === this.normalizeRoomCode(params.roomCode) &&
      normalizeDepartmentForServer(record.department) === normalizeDepartmentForServer(params.department) &&
      this.matchesCalendarArea(record.calendarRoomsArea, params.calendarRoomsArea);
  }

  private normalizeRecordFromApiPayload(
    res: unknown,
    requestParams?: {
      department: string;
      roomCode: string;
      planDate: string;
      calendarRoomsArea: string;
    },
  ): DepartmentPlanReturnRecord | null {
    const payload = this.unwrapAsmxPayload(
      typeof res === 'string' ? this.parseAsmxJsonText(res) : res,
    );
    const record = this.normalizeRecord(payload);
    if (!record) {
      return null;
    }
    if (requestParams && !this.matchesReturnPlanRequest(record, requestParams)) {
      return null;
    }
    return record;
  }

  /** Avoid duplicate INSERT when a group already exists in DB but the dialog has no returnId yet. */
  private resolveExistingReturnIdForSave(
    payload: Pick<DepartmentPlanReturnPayload, 'returnId' | 'planDate' | 'roomCode' | 'department' | 'calendarRoomsArea'>,
  ): Observable<string> {
    const existing = this.resolveServerReturnId(payload.returnId);
    if (existing) {
      return of(existing);
    }

    const lookupParams = {
      planDate: payload.planDate,
      roomCode: payload.roomCode,
      department: payload.department,
      calendarRoomsArea: payload.calendarRoomsArea,
    };

    const local = this.findLocalRecord(lookupParams);
    const fromLocal = this.resolveServerReturnId(local?.returnId);
    if (fromLocal) {
      return of(fromLocal);
    }

    return this.lookupReturnPlanAcrossCalendarAreas(lookupParams).pipe(
      switchMap((record) => {
        const fromGet = this.resolveServerReturnId(record?.returnId);
        if (fromGet) {
          return of(fromGet);
        }
        return this.fetchReportRecords(payload.planDate).pipe(
          map((records) => this.findMatchingReturnId(records, lookupParams)),
        );
      }),
      map((returnId) => returnId || ''),
    );
  }

  private lookupReturnPlanAcrossCalendarAreas(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord | null> {
    const candidates = this.getCalendarAreaLookupCandidates(params.calendarRoomsArea);
    return from(candidates).pipe(
      concatMap((calendarRoomsArea) =>
        this.executeReturnPlanHttpGet({ ...params, calendarRoomsArea }, true).pipe(
          catchError(() => of(null)),
        ),
      ),
      filter((record): record is DepartmentPlanReturnRecord =>
        !!record && !!this.resolveServerReturnId(record.returnId)),
      take(1),
      defaultIfEmpty(null),
    );
  }

  private getCalendarAreaLookupCandidates(area: string): string[] {
    const normalized = this.normalizeCalendarArea(area);
    const candidates = new Set<string>([normalized]);
    const aliasGroups: Record<string, string[]> = {
      'חדר ניתוח כללי': ['פז', 'וירטואלי כללי', 'ור'],
      'פז': ['חדר ניתוח כללי', 'וירטואלי כללי', 'ור'],
      'וירטואלי כללי': ['חדר ניתוח כללי', 'פז', 'ור'],
      'ור': ['חדר ניתוח כללי', 'פז', 'וירטואלי כללי'],
      'חדר לידה': ['וירטואלי חדר לידה', 'פז02', 'פז03'],
      'וירטואלי חדר לידה': ['חדר לידה'],
      'חדר ניתוח כללי ססיה': ['וירטואלי כללי ססיה', 'פז04'],
      'וירטואלי כללי ססיה': ['חדר ניתוח כללי ססיה'],
      'חדר ניתוח אמבולטורי': ['וירטואלי אמבולטורי', 'פז05'],
      'וירטואלי אמבולטורי': ['חדר ניתוח אמבולטורי'],
      'ניתוח ליד מיטת החולה': ['וירטואלי ניתוח ליד', 'פז06'],
      'וירטואלי ניתוח ליד': ['ניתוח ליד מיטת החולה'],
    };
    (aliasGroups[normalized] || []).forEach((value) => candidates.add(value));
    return Array.from(candidates);
  }

  private findMatchingReturnId(
    records: DepartmentPlanReturnRecord[],
    params: {
      planDate: string;
      roomCode: string;
      department: string;
      calendarRoomsArea: string;
    },
  ): string {
    const strict = records.find((record) => this.matchesReturnPlanRequest(record, params));
    if (strict) {
      return this.resolveServerReturnId(strict.returnId) || '';
    }

    const loose = records.find((record) =>
      this.normalizePlanDate(record.planDate) === this.normalizePlanDate(params.planDate) &&
      this.normalizeRoomCode(record.roomCode) === this.normalizeRoomCode(params.roomCode) &&
      normalizeDepartmentForServer(record.department) === normalizeDepartmentForServer(params.department),
    );
    return this.resolveServerReturnId(loose?.returnId) || '';
  }

  private isDuplicatePlanReturnError(err: unknown): boolean {
    const body = (err as { error?: unknown })?.error;
    const text = typeof body === 'string'
      ? body
      : typeof body === 'object' && body
        ? JSON.stringify(body)
        : String(err || '');
    return /UQ_SurgeryArrangementComment|duplicate key/i.test(text)
      || /Violation of UNIQUE KEY constraint/i.test(text);
  }

  private resolveReturnIdAfterSave(payload: DepartmentPlanReturnPayload): Observable<string | null> {
    return this.fetchReturnPlanRecordFromServer({
      planDate: payload.planDate,
      roomCode: payload.roomCode,
      department: payload.department,
      calendarRoomsArea: payload.calendarRoomsArea,
    }).pipe(
      map((record) => {
        if (record?.returnId) {
          this.upsertLocalRecord(record);
          return record.returnId;
        }
        if (recordHasCoordinatorAttention(this.buildRecordFromPayload(payload, this.buildLocalReturnId(payload)))) {
          const localId = this.buildLocalReturnId(payload);
          this.upsertLocalRecord(this.buildRecordFromPayload(payload, localId));
          return localId;
        }
        return null;
      }),
    );
  }

  private fetchReturnPlanFromServer(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord | null> {
    return this.fetchReturnPlanRecordFromServer(params).pipe(
      map((record) => {
        if (!record || !recordHasCoordinatorAttention(record)) {
          return null;
        }
        return record;
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
      const department = normalizeDepartmentForServer(pair.department || '');
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
    const normalizedLeft = this.normalizeCalendarArea(left);
    const normalizedRight = this.normalizeCalendarArea(right);
    if (normalizedLeft === normalizedRight) {
      return true;
    }
    return this.areEquivalentPlanReturnCalendarAreas(normalizedLeft, normalizedRight);
  }

  private areEquivalentPlanReturnCalendarAreas(left: string, right: string): boolean {
    if (!left || !right) {
      return false;
    }
    const equivalents: Record<string, string> = {
      'פז': 'חדר ניתוח כללי',
      'וירטואלי כללי': 'חדר ניתוח כללי',
      'ור': 'חדר ניתוח כללי',
      'וירטואלי חדר לידה': 'חדר לידה',
      'וירטואלי כללי ססיה': 'חדר ניתוח כללי ססיה',
      'וירטואלי אמבולטורי': 'חדר ניתוח אמבולטורי',
      'וירטואלי ניתוח ליד': 'ניתוח ליד מיטת החולה',
    };
    const normalize = (value: string) => equivalents[value] || value;
    return normalize(left) === normalize(right);
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
      `includeDeleted=${filters.includeDeleted ? 'true' : 'false'}`,
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
        map((res) => this.normalizeRecordFromApiPayload(res)),
        catchError(() => of(local)),
        map((record) => record || local),
        switchMap((record) => {
          if (!record) {
            return of(null);
          }
          return this.fetchReportRecords(record.planDate).pipe(
            map((reportRecords) => this.enrichRecordWithReportMetadata(record, reportRecords)),
          );
        }),
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
    const rows = (payload.surgeries || []).map((row, index) => {
      const rowPayload: Record<string, string> = {
        RowId: this.resolveSurgeryRowId(row, index),
        CaseNumber: row.caseNumber || '',
        PatientLabel: row.patientLabel || '',
        ProcedureName: row.procedureName || '',
        Surgeon: row.surgeon || '',
        ExistingNote: row.existingNote || '',
        CoordinatorComment: row.coordinatorComment || '',
        SurgeryTreatmentStatus: row.treatmentStatus || 'pending',
        TreatmentStatus: groupStatus,
      };
      if ((row.coordinatorComment || '').trim()) {
        rowPayload.SentBy = (row.coordinatorCommentSentBy || payload.sentBy || '').trim();
        rowPayload.SentAt = (row.coordinatorCommentSentAt || '').trim();
      }
      return rowPayload;
    });
    return JSON.stringify(rows);
  }

  private serializeResponseRowsJson(payload: DepartmentPlanReturnResponsePayload): string {
    const groupStatus = payload.treatmentStatus || 'pending';
    const rows = (payload.surgeries || []).map((row, index) => ({
      RowId: this.resolveSurgeryRowId(row, index),
      DepartmentResponseText: row.departmentResponseText || '',
      SurgeryTreatmentStatus: row.treatmentStatus || 'pending',
      TreatmentStatus: groupStatus,
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
        department: normalizeDepartmentForServer(payload.department),
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

  /** WriteJsonResponse + Response.End() aborts the thread after the payload is written. */
  private isAsmxWriteJsonThreadAbort(value: unknown): boolean {
    if (value == null) {
      return false;
    }
    if (typeof value === 'string') {
      return /Thread was being aborted|ThreadAbortException/i.test(value);
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const message = String(obj.Message ?? obj.message ?? '');
      const exceptionType = String(obj.ExceptionType ?? obj.exceptionType ?? '');
      return /thread was being aborted/i.test(message)
        || /ThreadAbortException/i.test(exceptionType);
    }
    return false;
  }

  /** ASMX void methods that use WriteJsonResponse may surface ThreadAbort as HTTP 500. */
  private interpretAsmxMutationOutcome(text: string | null | undefined, err?: unknown): boolean {
    if (text && this.parseSuccessFromAsmxText(text)) {
      return true;
    }
    if (this.isAsmxWriteJsonThreadAbort(text)) {
      return true;
    }
    if (err == null) {
      return false;
    }
    const httpErr = err as { error?: unknown; message?: string };
    if (this.isAsmxWriteJsonThreadAbort(httpErr.error)) {
      return true;
    }
    if (typeof httpErr.error === 'string') {
      return this.parseSuccessFromAsmxText(httpErr.error);
    }
    if (httpErr.error && typeof httpErr.error === 'object') {
      if (this.parseSuccessFromAsmxResponse(httpErr.error)) {
        return true;
      }
    }
    return this.isAsmxWriteJsonThreadAbort(JSON.stringify(httpErr.error ?? httpErr.message ?? httpErr));
  }

  private isAsmxMutationThreadAbort(err: unknown): boolean {
    return this.interpretAsmxMutationOutcome(null, err);
  }

  private parseSuccessFromAsmxResponse(res: unknown): boolean {
    if (this.isAsmxWriteJsonThreadAbort(res)) {
      return true;
    }
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
    if (this.isAsmxWriteJsonThreadAbort(trimmed)) {
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
    if (this.isServerReturnId(trimmed)) {
      return trimmed;
    }

    const dGuidMatch = trimmed.match(
      /"d"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"/i,
    );
    if (dGuidMatch?.[1]) {
      return dGuidMatch[1];
    }

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
      normalizeDepartmentForServer(left.department) === normalizeDepartmentForServer(right.department) &&
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

      const surgeryIds = new Set(existing.surgeries.map((surgeryRow) => surgeryRow.rowId));
      const surgeryCases = new Map(
        existing.surgeries
          .map((surgeryRow) => [normalizePlanReturnCaseNumber(surgeryRow.caseNumber), surgeryRow] as const)
          .filter(([caseNumber]) => !!caseNumber),
      );
      (normalizedRecord.surgeries || []).forEach((row) => {
        const caseNumber = normalizePlanReturnCaseNumber(row.caseNumber);
        const caseMatch = caseNumber ? surgeryCases.get(caseNumber) : undefined;
        if (caseMatch) {
          Object.assign(caseMatch, this.mergeSurgeryRow(caseMatch, row));
          if (row.rowId) {
            surgeryIds.add(row.rowId);
          }
          return;
        }
        if (!surgeryIds.has(row.rowId)) {
          existing.surgeries.push(row);
          surgeryIds.add(row.rowId);
          if (caseNumber) {
            surgeryCases.set(caseNumber, row);
          }
          return;
        }
        const index = existing.surgeries.findIndex((item) => item.rowId === row.rowId);
        if (index >= 0) {
          existing.surgeries[index] = this.mergeSurgeryRow(existing.surgeries[index], row);
          if (caseNumber) {
            surgeryCases.set(caseNumber, existing.surgeries[index]);
          }
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
    if (!(target.generalComment || '').trim() && (source.generalComment || '').trim() && !normalizeDeletedFlag(source.isDeleted)) {
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
    if (!target.sentAt && source.sentAt) {
      target.sentAt = source.sentAt;
    }
    if (!target.createdAt && source.createdAt) {
      target.createdAt = source.createdAt;
    } else if (source.createdAt && target.createdAt && source.createdAt < target.createdAt) {
      target.createdAt = source.createdAt;
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
      coordinatorComment: this.mergeCoordinatorComment(target, source),
      coordinatorCommentSentBy: (target.coordinatorCommentSentBy || '').trim()
        || (source.coordinatorCommentSentBy || '').trim(),
      coordinatorCommentSentAt: (target.coordinatorCommentSentAt || '').trim()
        || (source.coordinatorCommentSentAt || '').trim(),
      departmentResponseText: (target.departmentResponseText || '').trim()
        ? target.departmentResponseText
        : source.departmentResponseText,
      treatmentStatus: target.treatmentStatus !== 'pending' ? target.treatmentStatus : source.treatmentStatus,
      isDeleted: target.isDeleted || source.isDeleted,
      deletedAt: target.deletedAt || source.deletedAt || null,
      deletedBy: target.deletedBy || source.deletedBy || null,
    };
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

  private mergeCoordinatorComment(
    target: DepartmentPlanReturnSurgeryRow,
    source: DepartmentPlanReturnSurgeryRow,
  ): string {
    const targetComment = (target.coordinatorComment || '').trim();
    const sourceComment = (source.coordinatorComment || '').trim();
    if (surgeryRowIsSoftDeleted(target)) {
      return targetComment;
    }
    if (surgeryRowIsSoftDeleted(source)) {
      return targetComment;
    }
    return targetComment || sourceComment;
  }

  private applyLocalSoftDelete(
    returnId: string,
    rowId: string,
    deletedBy: string,
  ): void {
    const serverReturnId = this.resolveServerReturnId(returnId);
    if (!serverReturnId) {
      return;
    }

    const records = this.readLocalRecords();
    const index = records.findIndex((record) => record.returnId === serverReturnId);
    if (index < 0) {
      Array.from(this.indicatorDetailsCache.entries()).forEach(([key, cached]) => {
        if (cached.returnId === serverReturnId) {
          this.indicatorDetailsCache.delete(key);
        }
      });
      return;
    }

    const deletedAt = new Date().toISOString();
    const record = { ...records[index], surgeries: [...(records[index].surgeries || [])] };
    if (!rowId) {
      record.isDeleted = true;
      record.deletedAt = deletedAt;
      record.deletedBy = deletedBy;
      record.surgeries = record.surgeries.map((row) => ({
        ...row,
        isDeleted: true,
        deletedAt,
        deletedBy,
      }));
    } else {
      record.surgeries = record.surgeries.map((row) => {
        if (row.rowId !== rowId) {
          return row;
        }
        return {
          ...row,
          isDeleted: true,
          deletedAt,
          deletedBy,
        };
      });
    }

    const updated = this.finalizeRecordDeletedState(record);
    if (recordHasCoordinatorAttention(updated)) {
      records[index] = updated;
      this.writeLocalRecords(records);
      this.cacheIndicatorRecord(updated);
    } else {
      records.splice(index, 1);
      this.writeLocalRecords(records);
      this.removeCachedIndicatorRecord(updated);
    }
  }

  private pruneStaleLocalRecords(planDate: string, calendarRoomsArea: string): void {
    const records = this.readLocalRecords().filter((record) => {
      if (this.normalizePlanDate(record.planDate) !== planDate) {
        return true;
      }
      if (!this.matchesCalendarArea(record.calendarRoomsArea, calendarRoomsArea)) {
        return true;
      }
      return recordHasCoordinatorAttention(record);
    });
    this.writeLocalRecords(records);
  }

  private fetchReturnPlansFromRoomAliases(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): Observable<DepartmentPlanReturnRecord[]> {
    const aliases = Array.from(this.expandPlanReturnRoomCodeAliases(params.roomCode))
      .filter((code) => code !== this.normalizeRoomCode(params.roomCode));
    if (!aliases.length) {
      return of([]);
    }

    return forkJoin(
      aliases.map((roomCode) =>
        this.fetchReturnPlanRecordFromServer({ ...params, roomCode }).pipe(catchError(() => of(null))),
      ),
    ).pipe(
      map((records) => records.filter((record): record is DepartmentPlanReturnRecord => !!record)),
    );
  }

  private findLocalRecord(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): DepartmentPlanReturnRecord | null {
    const department = normalizeDepartmentForServer(params.department);
    const match = this.readLocalRecords().find((record) =>
      normalizeDepartmentForServer(record.department) === department &&
      this.normalizeRoomCode(record.roomCode) === this.normalizeRoomCode(params.roomCode) &&
      this.normalizePlanDate(record.planDate) === this.normalizePlanDate(params.planDate) &&
      this.matchesCalendarArea(record.calendarRoomsArea, params.calendarRoomsArea)
    );
    return match || null;
  }

  private collectRelatedReturnRecordsForPlan(
    params: {
      department: string;
      roomCode: string;
      planDate: string;
      calendarRoomsArea: string;
    },
    reportRecords: DepartmentPlanReturnRecord[],
    localRecords: DepartmentPlanReturnRecord[] = [],
  ): DepartmentPlanReturnRecord[] {
    const department = normalizeDepartmentForServer(params.department);
    const planDate = this.normalizePlanDate(params.planDate);
    const related = [
      ...reportRecords,
      ...localRecords,
      ...Array.from(this.indicatorDetailsCache.values()),
    ].filter((record) =>
      this.normalizePlanDate(record.planDate) === planDate &&
      departmentsMatchForPlanReturn(record.department, department) &&
      this.matchesCalendarArea(record.calendarRoomsArea, params.calendarRoomsArea)
    );
    return this.groupReturnRecordsByReturnId(related);
  }

  private findLocalRecordsForDepartment(params: {
    department: string;
    planDate: string;
    calendarRoomsArea: string;
  }): DepartmentPlanReturnRecord[] {
    const department = normalizeDepartmentForServer(params.department);
    const planDate = this.normalizePlanDate(params.planDate);
    return this.readLocalRecords().filter((record) =>
      this.normalizePlanDate(record.planDate) === planDate &&
      departmentsMatchForPlanReturn(record.department, department) &&
      this.matchesCalendarArea(record.calendarRoomsArea, params.calendarRoomsArea)
    );
  }

  private mergeSurgeryCommentsFromRelatedRooms(
    base: DepartmentPlanReturnRecord,
    related: DepartmentPlanReturnRecord[],
  ): DepartmentPlanReturnRecord {
    const surgeryByCase = new Map<string, DepartmentPlanReturnSurgeryRow>();
    let sentBy = (base.sentBy || '').trim();
    let sentAt = (base.sentAt || '').trim();
    let createdAt = (base.createdAt || '').trim();

    const ingest = (row: DepartmentPlanReturnSurgeryRow, record: DepartmentPlanReturnRecord): void => {
      const caseNumber = normalizePlanReturnCaseNumber(row.caseNumber);
      if (!caseNumber || surgeryRowIsSoftDeleted(row)) {
        return;
      }
      const hasComment = !!(row.coordinatorComment || '').trim();
      if (hasComment) {
        if (!sentBy && (record.sentBy || '').trim()) {
          sentBy = String(record.sentBy).trim();
        }
        if (!sentAt && (record.sentAt || '').trim()) {
          sentAt = String(record.sentAt).trim();
        }
        if (!createdAt && (record.createdAt || '').trim()) {
          createdAt = String(record.createdAt).trim();
        }
      }
      const enriched: DepartmentPlanReturnSurgeryRow = {
        ...row,
        coordinatorCommentSentBy: (row.coordinatorCommentSentBy || '').trim() || record.sentBy || '',
        coordinatorCommentSentAt: (row.coordinatorCommentSentAt || '').trim()
          || record.sentAt
          || record.createdAt
          || '',
      };
      const existing = surgeryByCase.get(caseNumber);
      surgeryByCase.set(caseNumber, existing ? this.mergeSurgeryRow(existing, enriched) : enriched);
    };

    related.forEach((record) => (record.surgeries || []).forEach((row) => ingest(row, record)));
    (base.surgeries || []).forEach((row) => ingest(row, base));

    const mergedSurgeries = (base.surgeries || []).length
      ? (base.surgeries || []).map((row) => {
          const caseNumber = normalizePlanReturnCaseNumber(row.caseNumber);
          const merged = caseNumber ? surgeryByCase.get(caseNumber) : undefined;
          return merged ? this.mergeSurgeryRow(row, merged) : row;
        })
      : Array.from(surgeryByCase.values());

    return {
      ...base,
      sentBy: sentBy || base.sentBy,
      sentAt: sentAt || base.sentAt,
      createdAt: createdAt || base.createdAt,
      surgeries: mergedSurgeries,
    };
  }

  private buildEmptyReturnPlanShell(params: {
    department: string;
    roomCode: string;
    planDate: string;
    calendarRoomsArea: string;
  }): DepartmentPlanReturnRecord {
    const department = normalizeDepartmentForServer(params.department);
    return {
      returnId: '',
      department,
      departmentDisplay: department,
      roomCode: this.normalizeRoomCode(params.roomCode),
      planDate: this.normalizePlanDate(params.planDate),
      calendarRoomsArea: this.normalizeCalendarArea(params.calendarRoomsArea),
      generalComment: '',
      generalResponseText: '',
      treatmentStatus: 'pending',
      sentAt: '',
      sentBy: '',
      respondedAt: null,
      respondedBy: null,
      surgeries: [],
    };
  }

  private expandPlanReturnRoomCodeAliases(roomCode: string): Set<string> {
    const aliases = new Set<string>();
    const normalized = this.normalizeRoomCode(roomCode);
    if (!normalized) {
      return aliases;
    }
    aliases.add(normalized);
    if (/ור/.test(normalized)) {
      aliases.add(this.mapVirtualRoomCodeToPhysical(normalized));
    }
    if (/פז/.test(normalized)) {
      aliases.add(this.mapPhysicalRoomCodeToVirtual(normalized));
    }
    return aliases;
  }

  private roomCodeMatchesAliasSet(roomCode: string, aliases: Set<string>): boolean {
    const normalized = this.normalizeRoomCode(roomCode).toLowerCase();
    if (!normalized) {
      return false;
    }
    for (const candidate of aliases) {
      if (String(candidate || '').trim().toLowerCase() === normalized) {
        return true;
      }
    }
    return false;
  }

  private mapVirtualRoomCodeToPhysical(roomCode: string): string {
    const code = String(roomCode ?? '').trim();
    if (!/ור/.test(code)) {
      return code;
    }

    const pairedMatch = code.match(/ור\s*(\d+)-1(\d+)/);
    if (pairedMatch) {
      return `פז${pairedMatch[1]}-2${pairedMatch[2]}`;
    }

    const numberMatch = code.match(/(\d+-\d+)/);
    if (numberMatch) {
      const physicalNumber = numberMatch[1].replace(/^(\d+)-1(\d+)$/, '$1-2$2');
      return `פז${physicalNumber}`;
    }

    const fallback = code.startsWith('ור') ? code.slice(2).trim() : code;
    return fallback ? `פז${fallback}` : code;
  }

  private mapPhysicalRoomCodeToVirtual(roomCode: string): string {
    const code = String(roomCode ?? '').trim();
    if (!/פז/.test(code)) {
      return code;
    }

    const pairedMatch = code.match(/פז\s*(\d+)-2(\d+)/);
    if (pairedMatch) {
      return `ור${pairedMatch[1]}-1${pairedMatch[2]}`;
    }

    const numberMatch = code.match(/(\d+-\d+)/);
    if (numberMatch) {
      const virtualNumber = numberMatch[1].replace(/^(\d+)-2(\d+)$/, '$1-1$2');
      return `ור${virtualNumber}`;
    }

    const fallback = code.startsWith('פז') ? code.slice(2).trim() : code;
    return fallback ? `ור${fallback}` : code;
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
        department: normalizeDepartmentForServer(payload.department),
        calendarRoomsArea: payload.calendarRoomsArea,
      })
    );

    return {
      returnId,
      department: normalizeDepartmentForServer(payload.department),
      departmentDisplay: payload.departmentDisplay || normalizeDepartmentForServer(payload.department),
      roomCode: payload.roomCode,
      planDate: payload.planDate,
      calendarRoomsArea: payload.calendarRoomsArea,
      generalComment: payload.generalComment,
      generalResponseText: existing?.generalResponseText || '',
      treatmentStatus: payload.treatmentStatus || 'pending',
      sentAt: existing?.sentAt || '',
      sentBy: existing?.sentBy || payload.sentBy,
      createdAt: existing?.createdAt || '',
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
      department: normalizeDepartmentForServer(String(record.department || record.Department || '')),
      departmentDisplay: this.stripDepartmentQuotes(
        String(record.departmentDisplay || record.DepartmentDisplay || record.department || record.Department || '')
      ),
      roomCode: this.normalizeRoomCode(String(record.roomCode || record.RoomCode || '')),
      planDate: this.normalizePlanDate(String(record.planDate || record.PlanDate || '')),
      calendarRoomsArea: this.normalizeCalendarArea(String(record.calendarRoomsArea || record.CalendarRoomsArea || '')),
      generalComment: String(record.generalComment || record.GeneralComment || ''),
      generalResponseText: String(record.generalResponseText || record.GeneralResponseText || ''),
      treatmentStatus: this.normalizeStatus(groupTreatmentStatus),
      sentAt: this.readOptionalText(record, 'sentAt', 'SentAt'),
      sentBy: this.readOptionalText(record, 'sentBy', 'SentBy', 'createdBy', 'CreatedBy'),
      createdAt: this.readOptionalText(record, 'createdAt', 'CreatedAt'),
      respondedAt: (record.respondedAt || record.RespondedAt) ? String(record.respondedAt || record.RespondedAt) : null,
      respondedBy: (record.respondedBy || record.RespondedBy) ? String(record.respondedBy || record.RespondedBy) : null,
      isDeleted: this.readDeletedFlag(record),
      deletedAt: this.readDeletedTimestamp(record, 'deletedAt', 'DeletedAt'),
      deletedBy: this.readDeletedText(record, 'deletedBy', 'DeletedBy'),
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
      coordinatorCommentSentBy: this.readOptionalText(
        item,
        'coordinatorCommentSentBy',
        'CoordinatorCommentSentBy',
        'commentSentBy',
        'CommentSentBy',
        'SentBy',
        'sentBy',
      ),
      coordinatorCommentSentAt: this.readOptionalText(
        item,
        'coordinatorCommentSentAt',
        'CoordinatorCommentSentAt',
        'commentSentAt',
        'CommentSentAt',
        'SentAt',
        'sentAt',
      ),
      departmentResponseText: String(item.departmentResponseText || item.DepartmentResponseText || ''),
      treatmentStatus: this.normalizeStatus(
        item.SurgeryTreatmentStatus || item.surgeryTreatmentStatus || item.treatmentStatus || item.TreatmentStatus
      ),
      isDeleted: this.readDeletedFlag(item),
      deletedAt: this.readDeletedTimestamp(item, 'deletedAt', 'DeletedAt'),
      deletedBy: this.readDeletedText(item, 'deletedBy', 'DeletedBy'),
    };
  }

  private normalizeStatus(value: unknown): DepartmentPlanTreatmentStatus {
    const status = String(value || 'pending').toLowerCase();
    if (status === 'postponed' || status === 'completed' || status === 'in_progress') {
      return status;
    }
    return 'pending';
  }

  private readOptionalText(
    source: Record<string, unknown>,
    ...keys: string[]
  ): string {
    for (const key of keys) {
      const value = source[key];
      if (value == null) {
        continue;
      }
      const text = String(value).trim();
      if (!text || text.toLowerCase() === 'null') {
        continue;
      }
      return text;
    }
    return '';
  }

  private readDeletedFlag(source: Record<string, unknown>): boolean {
    return normalizeDeletedFlag(
      source.isDeleted ?? source.IsDeleted ?? source.IS_DELETED ?? source.is_deleted
        ?? source.deleted ?? source.Deleted ?? source.IsDelete ?? source.isDelete,
    );
  }

  private readDeletedTimestamp(
    source: Record<string, unknown>,
    camelKey: string,
    pascalKey: string,
  ): string | null {
    const value = source[camelKey] ?? source[pascalKey];
    return value ? String(value) : null;
  }

  private readDeletedText(
    source: Record<string, unknown>,
    camelKey: string,
    pascalKey: string,
  ): string | null {
    const value = source[camelKey] ?? source[pascalKey];
    return value ? String(value) : null;
  }
}
