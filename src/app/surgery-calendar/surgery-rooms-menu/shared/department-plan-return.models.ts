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
}

export interface DepartmentPlanReturnContext {
  department: string;
  departmentDisplay: string;
  roomCode: string;
  planDate: string;
  calendarRoomsArea: string;
}

export interface DepartmentPlanReturnPayload extends DepartmentPlanReturnContext {
  generalComment: string;
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
}

export interface DepartmentPlanReturnReportFilters {
  dateFrom: string;
  dateTo: string;
  departments: string[];
  treatmentStatus: DepartmentPlanTreatmentStatus | 'all';
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

export function stripDepartmentQuotes(value: string): string {
  return (value || '')
    .replace(/^'+|'+$/g, '')
    .replace(/','/g, ', ');
}
