export interface NappWaitingProcedure {
  SurgeryCode?: string;
  SurgeryName?: string;
  Surgery_Code?: string;
  Surgery_Name?: string;
  Catalog?: string;
  Side?: string;
  Priority?: string;
  Depart?: string;
  SeodeDepart?: string;
  BloodUnit?: string;
  SurgeryType?: string;
  ServiceType?: string;
}

/** Raw row from GetNappWaitingForVirtualRoomScheduling (normalized on client). */
export interface NappWaitingRow {
  CaseNumber: string;
  RequestID: string;
  RequestDate?: string;
  PatientFirstName?: string;
  PatientLastName?: string;
  PatientId?: string;
  DoctorSurgeon?: string;
  RequestDepart?: string;
  SeodeDepart?: string;
  Department?: string;
  Urgency?: string;
  SurgeryType?: string;
  DurationMinutes?: number;
  DrorDuration?: number;
  ProcedureCodes?: string;
  ProcedureNames?: string;
  Procedures?: NappWaitingProcedure[];
  WaitingDays?: number;
}

export interface RoomDepartmentSurgerySummary {
  caseNumber: string;
  patientName: string;
  department: string;
  startTime: string;
  endTime: string;
}

export interface PlannedWaitingSlot {
  roomName: string;
  department: string;
  matchedDepartment: string;
  candidate: NappWaitingRow;
  surgeryStartMinutes: number;
  surgeryEndMinutes: number;
  setupStartMinutes: number;
  roomDepartmentSurgeries: RoomDepartmentSurgerySummary[];
  reasons: string[];
}
