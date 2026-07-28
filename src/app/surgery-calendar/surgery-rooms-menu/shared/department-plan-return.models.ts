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
  return activeRows.some((row) => (row.coordinatorComment || '').trim().length > 0);
}

export function recordNeedsDepartmentAction(record: DepartmentPlanReturnRecord): boolean {
  if (record.treatmentStatus === 'completed') {
    return false;
  }
  return !!(record.sentAt || recordHasCoordinatorAttention(record));
}
