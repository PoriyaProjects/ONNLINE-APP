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
  RowID?: string;
  CaseNumber: string;
  RequestID: string;
  RequestDate?: string;
  WaitingFromDate?: string;
  PatientNumber?: string;
  PatientFirstName?: string;
  PatientLastName?: string;
  PatientId?: string;
  DoctorSurgeon?: string;
  ServiceNumber?: string;
  ServiceDescription?: string;
  /** Operating department name — same as SurgeryRequestDepartments.S_DEPARTMENT on the board. */
  SDepartment?: string;
  /** Short SAP department code — same as Depart on calendar surgeries. */
  Depart?: string;
  SDepartmentShortDesc?: string;
  ServiceName?: string;
  ToolName?: string;
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

export interface NappWaitingForVirtualRoomResult {
  WaitingList?: NappWaitingRow[];
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
