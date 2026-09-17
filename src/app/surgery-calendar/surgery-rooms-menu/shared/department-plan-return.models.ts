export type DepartmentPlanTreatmentStatus = 'postponed' | 'pending' | 'in_progress' | 'completed';

export interface DepartmentPlanReturnSurgeryRow {
  rowId: string;
  caseNumber: string;
  room: string;
  patientLabel: string;
  age: string;
  procedureName: string;
  surgeon: string;
  duration: string;
  existingNote: string;
  coordinatorComment: string;
  coordinatorCommentSentBy?: string;
  coordinatorCommentSentAt?: string;
  departmentResponseText: string;
  treatmentStatus: DepartmentPlanTreatmentStatus;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface DepartmentPlanReturnContext {
  department: string;
  departmentDisplay: string;
  roomCode: string;
  planDate: string;
  calendarRoomsArea: string;
}

export interface DepartmentPlanReturnPayload extends DepartmentPlanReturnContext {
  returnId?: string;
  generalComment: string;
  treatmentStatus?: DepartmentPlanTreatmentStatus;
  surgeries: DepartmentPlanReturnSurgeryRow[];
  sentBy: string;
}

export interface DepartmentPlanReturnResponsePayload {
  returnId: string;
  generalResponseText: string;
  treatmentStatus: DepartmentPlanTreatmentStatus;
  surgeries: Array<{
    rowId: string;
    departmentResponseText: string;
    treatmentStatus: DepartmentPlanTreatmentStatus;
  }>;
  respondedBy: string;
}

export interface DepartmentPlanReturnRecord extends DepartmentPlanReturnContext {
  returnId: string;
  generalComment: string;
  generalResponseText: string;
  treatmentStatus: DepartmentPlanTreatmentStatus;
  sentAt: string;
  sentBy: string;
  createdAt?: string;
  respondedAt: string | null;
  respondedBy: string | null;
  surgeries: DepartmentPlanReturnSurgeryRow[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface DepartmentPlanReturnReportFilters {
  dateFrom: string;
  dateTo: string;
  departments: string[];
  treatmentStatus: DepartmentPlanTreatmentStatus | 'all';
  includeDeleted?: boolean;
}

/** One report table row — a single arrangement comment (general or per-surgery). */
export interface DepartmentPlanReturnReportRow {
  record: DepartmentPlanReturnRecord;
  surgery?: DepartmentPlanReturnSurgeryRow;
  isGeneralComment: boolean;
  commentText: string;
}

export function flattenPlanReturnReportRows(
  records: DepartmentPlanReturnRecord[],
): DepartmentPlanReturnReportRow[] {
  const rows: DepartmentPlanReturnReportRow[] = [];
  records.forEach((record) => {
    const generalComment = (record.generalComment || '').trim();
    if (generalComment) {
      rows.push({
        record,
        isGeneralComment: true,
        commentText: generalComment,
      });
    }

    (record.surgeries || []).forEach((surgery) => {
      const coordinatorComment = resolveSurgeryArrangementComment(surgery);
      if (!coordinatorComment) {
        return;
      }
      rows.push({
        record,
        surgery: {
          ...surgery,
          coordinatorCommentSentBy: surgery.coordinatorCommentSentBy,
          coordinatorCommentSentAt: surgery.coordinatorCommentSentAt || record.sentAt || record.createdAt,
        },
        isGeneralComment: false,
        commentText: coordinatorComment,
      });
    });
  });
  return rows;
}

export const DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS: Record<DepartmentPlanTreatmentStatus, string> = {
  postponed: 'הוזזה',
  pending: 'ממתין',
  in_progress: 'בטיפול',
  completed: 'בוצע',
};

export const DEPARTMENT_PLAN_TREATMENT_STATUS_OPTIONS: DepartmentPlanTreatmentStatus[] = [
  'postponed',
  'pending',
  'in_progress',
  'completed',
];

/** Technical users whose arrangement comments must not appear in clinical views. */
export const PLAN_RETURN_TECHNICAL_TEST_USERS = new Set(['ccymerman']);

export function normalizePlanReturnUsername(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function isPlanReturnTechnicalTestUser(value?: string | null): boolean {
  return PLAN_RETURN_TECHNICAL_TEST_USERS.has(normalizePlanReturnUsername(value));
}

export function recordCreatedByTechnicalTestUser(record: DepartmentPlanReturnRecord): boolean {
  return isPlanReturnTechnicalTestUser(resolveRecordCreatedBy(record));
}

export function shouldDisplayPlanReturnRecord(record: DepartmentPlanReturnRecord): boolean {
  return !recordCreatedByTechnicalTestUser(record);
}

export function resolveAdUserDisplayName(
  username: string | null | undefined,
  directory: ReadonlyMap<string, string>,
): string {
  const key = normalizePlanReturnUsername(username);
  if (!key) {
    return '';
  }
  return directory.get(key) || String(username || '').trim();
}

export function departmentsMatchForPlanReturn(left: string, right: string): boolean {
  const normalize = (value: string): string =>
    stripDepartmentQuotes(value)
      .replace(/^מחלקת\s+/u, '')
      .trim()
      .toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) {
    return false;
  }
  return a === b || a.includes(b) || b.includes(a);
}

/** Whether the surgeries board should show a plan-return indicator for this record. */
export function recordQualifiesForBoardReturnIndicator(record: DepartmentPlanReturnRecord): boolean {
  return recordHasCoordinatorAttention(record);
}

export function countPlanReturnArrangementComments(record: DepartmentPlanReturnRecord): number {
  if (normalizeDeletedFlag(record.isDeleted)) {
    return 0;
  }
  let count = 0;
  if ((record.generalComment || '').trim()) {
    count += 1;
  }
  (record.surgeries || []).forEach((row) => {
    if (!surgeryRowIsSoftDeleted(row) && resolveSurgeryArrangementComment(row).length > 0) {
      count += 1;
    }
  });
  return count;
}

export interface PlanReturnCommentByCase {
  caseNumber: string;
  coordinatorComment: string;
  sentBy: string;
  sentAt: string;
  department: string;
}

export function normalizePlanReturnCaseNumber(value?: string | null): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  const withoutLeadingZeros = trimmed.replace(/^0+/, '');
  return withoutLeadingZeros || '0';
}

export function planReturnCaseNumbersMatch(left?: string | null, right?: string | null): boolean {
  const a = normalizePlanReturnCaseNumber(left);
  const b = normalizePlanReturnCaseNumber(right);
  return !!a && !!b && a === b;
}

export function firstNonEmptyText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

/** Fill per-surgery created-by metadata from row-level SentBy when the API stores it there. */
export function hydratePlanReturnRecordAuthorship(
  record: DepartmentPlanReturnRecord,
): DepartmentPlanReturnRecord {
  const recordSentBy = firstNonEmptyText(record.sentBy);
  const recordSentAt = firstNonEmptyText(record.sentAt, record.createdAt);
  const surgeries = (record.surgeries || []).map((row) => {
    const promoted = promoteApiArrangementCommentToCoordinator(row, recordSentAt);
    if (!resolveSurgeryArrangementComment(promoted) || surgeryRowIsSoftDeleted(promoted)) {
      return promoted;
    }
    return {
      ...promoted,
      coordinatorCommentSentBy: firstNonEmptyText(promoted.coordinatorCommentSentBy),
      coordinatorCommentSentAt: firstNonEmptyText(promoted.coordinatorCommentSentAt, recordSentAt),
    };
  });
  return {
    ...record,
    sentBy: recordSentBy,
    sentAt: firstNonEmptyText(record.sentAt, record.createdAt),
    surgeries,
  };
}

export function normalizePlanReturnRowId(value?: string | null): string {
  return String(value ?? '').trim();
}

export function planReturnRowIdsMatch(left?: string | null, right?: string | null): boolean {
  const a = normalizePlanReturnRowId(left);
  const b = normalizePlanReturnRowId(right);
  return !!a && !!b && a === b;
}

export interface PlanReturnCommentLookup {
  byCase: Map<string, PlanReturnCommentByCase>;
  byRowId: Map<string, PlanReturnCommentByCase>;
}

export function findPlanReturnCommentForBoardSurgery(
  lookup: PlanReturnCommentLookup,
  caseNumber: string,
  rowId: string,
): PlanReturnCommentByCase | undefined {
  if (caseNumber) {
    const byCase = lookup.byCase.get(caseNumber);
    if (byCase) {
      return byCase;
    }
  }
  if (rowId) {
    return lookup.byRowId.get(rowId);
  }
  return undefined;
}

/** Backend may store arrangement text in ExistingNote; promote to coordinatorComment for UI. */
export function promoteApiArrangementCommentToCoordinator(
  surgery: DepartmentPlanReturnSurgeryRow,
  recordSentAt = '',
): DepartmentPlanReturnSurgeryRow {
  if ((surgery.coordinatorComment || '').trim()) {
    return surgery;
  }
  const sentBy = (surgery.coordinatorCommentSentBy || '').trim();
  const arrangement = resolveSurgeryArrangementComment(surgery);
  if (!arrangement || !sentBy || surgeryRowIsSoftDeleted(surgery)) {
    return surgery;
  }
  return {
    ...surgery,
    coordinatorComment: arrangement,
    coordinatorCommentSentBy: sentBy,
    coordinatorCommentSentAt: firstNonEmptyText(surgery.coordinatorCommentSentAt, recordSentAt),
  };
}

/** Resolve the arrangement comment text for a saved surgery row. */
export function resolveSurgeryArrangementComment(
  surgery: DepartmentPlanReturnSurgeryRow,
): string {
  const coordinator = (surgery.coordinatorComment || '').trim();
  if (coordinator) {
    return coordinator;
  }
  if (surgeryRowIsSoftDeleted(surgery)) {
    return '';
  }
  const existing = (surgery.existingNote || '').trim();
  if (!existing) {
    return '';
  }
  const rowSentBy = (surgery.coordinatorCommentSentBy || '').trim();
  if (rowSentBy) {
    return existing;
  }
  return '';
}

/** Index arrangement comments by surgery case number and row id (surgery follows rooms). */
export function indexPlanReturnComments(
  records: DepartmentPlanReturnRecord[],
): PlanReturnCommentLookup {
  const byCase = new Map<string, PlanReturnCommentByCase>();
  const byRowId = new Map<string, PlanReturnCommentByCase>();

  records.forEach((record) => {
    const recordSentAt = firstNonEmptyText(record.sentAt, record.createdAt);
    const department = stripDepartmentQuotes(record.departmentDisplay || record.department);

    (record.surgeries || []).forEach((surgery) => {
      const comment = resolveSurgeryArrangementComment(surgery);
      if (!comment || surgeryRowIsSoftDeleted(surgery)) {
        return;
      }

      const entry: PlanReturnCommentByCase = {
        caseNumber: normalizePlanReturnCaseNumber(surgery.caseNumber),
        coordinatorComment: comment,
        sentBy: firstNonEmptyText(surgery.coordinatorCommentSentBy),
        sentAt: firstNonEmptyText(surgery.coordinatorCommentSentAt, recordSentAt),
        department,
      };

      const rowId = normalizePlanReturnRowId(surgery.rowId);
      if (rowId) {
        byRowId.set(rowId, entry);
      }

      const caseNumber = normalizePlanReturnCaseNumber(surgery.caseNumber);
      if (caseNumber) {
        const existing = byCase.get(caseNumber);
        if (!existing || comment.length >= (existing.coordinatorComment || '').length) {
          byCase.set(caseNumber, entry);
        }
      }
    });
  });

  return { byCase, byRowId };
}

/** @deprecated Use indexPlanReturnComments */
export function indexPlanReturnCommentsByCase(
  records: DepartmentPlanReturnRecord[],
): Map<string, PlanReturnCommentByCase> {
  return indexPlanReturnComments(records).byCase;
}

export function buildDepartmentFinalPlanEmailSubject(
  departmentDisplay: string,
  arrivalDate: string,
  calendarRoomsArea: string,
): string {
  return `אישור תוכנית סופית למחלקת ${departmentDisplay} - ${arrivalDate} - ${calendarRoomsArea}`;
}

/** Email subject for plan-return / arrangement comments (not final-plan approval). */
export function buildPlanReturnEmailSubject(
  departmentDisplay: string,
  arrivalDate: string,
  roomCode: string,
): string {
  return `הערה על הסידור - ${departmentDisplay} - ${arrivalDate} - ${roomCode}`;
}

export function stripDepartmentQuotes(value: string): string {
  return (value || '')
    .replace(/^'+|'+$/g, '')
    .replace(/','/g, ', ');
}

/** Plain department name(s) for WebService calls — never SQL-style quoted strings. */
export function normalizeDepartmentForServer(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripDepartmentQuotes(String(entry || '').trim()))
      .filter(Boolean)
      .join(',');
  }
  return stripDepartmentQuotes(String(value || '').trim());
}

export function normalizeDeletedFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'TRUE') {
    return true;
  }
  if (typeof value === 'string' && ['yes', 'y', 'כן'].includes(value.trim().toLowerCase())) {
    return true;
  }
  return false;
}

export function formatDeletedTooltip(deletedBy?: string | null, deletedAt?: string | null): string {
  const by = (deletedBy || '').trim() || 'לא ידוע';
  const at = formatDeletedTimestamp(deletedAt);
  return `נמחק ע"י ${by}${at ? ` ב-${at}` : ''}`;
}

export function formatDeletedTimestamp(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return parsed.toLocaleString('he-IL');
}

export function resolveRecordCreatedBy(record: DepartmentPlanReturnRecord): string {
  return (record.sentBy || '').trim();
}

export function resolveRecordCreatedTimestamp(record: DepartmentPlanReturnRecord): string {
  return formatDeletedTimestamp(record.sentAt || record.createdAt);
}

export function formatCreatedTooltip(
  record: DepartmentPlanReturnRecord,
  directory?: ReadonlyMap<string, string>,
): string {
  const rawBy = resolveRecordCreatedBy(record);
  const by = directory ? resolveAdUserDisplayName(rawBy, directory) : rawBy;
  const at = resolveRecordCreatedTimestamp(record);
  if (by && at) {
    return `נוצר ע"י ${by} ב-${at}`;
  }
  if (by) {
    return `נוצר ע"י ${by}`;
  }
  if (at) {
    return `תאריך יצירה: ${at}`;
  }
  return '';
}

export function surgeryRowIsSoftDeleted(row: DepartmentPlanReturnSurgeryRow): boolean {
  return normalizeDeletedFlag(row.isDeleted);
}

export function recordIsSoftDeleted(record: DepartmentPlanReturnRecord): boolean {
  if (normalizeDeletedFlag(record.isDeleted)) {
    return true;
  }
  const surgeries = record.surgeries || [];
  if (!surgeries.length) {
    return false;
  }
  return surgeries.every((row) => surgeryRowIsSoftDeleted(row));
}

export function recordHasDeletedItems(record: DepartmentPlanReturnRecord): boolean {
  if (recordIsSoftDeleted(record)) {
    return true;
  }
  return (record.surgeries || []).some((row) => surgeryRowIsSoftDeleted(row));
}

/** Coordinator attention comment — separate from existing surgery notes. */
export function recordHasCoordinatorAttention(record: DepartmentPlanReturnRecord): boolean {
  if (normalizeDeletedFlag(record.isDeleted)) {
    return false;
  }
  if ((record.generalComment || '').trim()) {
    return true;
  }
  const activeRows = (record.surgeries || []).filter((row) => !surgeryRowIsSoftDeleted(row));
  if (!activeRows.length) {
    return false;
  }
  return activeRows.some((row) => resolveSurgeryArrangementComment(row).length > 0);
}

export function recordNeedsDepartmentAction(record: DepartmentPlanReturnRecord): boolean {
  if (record.treatmentStatus === 'completed') {
    return false;
  }
  return !!(record.sentAt || recordHasCoordinatorAttention(record));
}
