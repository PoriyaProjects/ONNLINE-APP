/**
 * Hospital Current Patients & Ward Census Dashboard Models
 * Integration with PatientMonitoring WebService endpoints
 */

export interface CurrentPatientRow {
  PatientId: string;
  FirstName: string;
  LastName: string;
  PatientIdType: string;
  Gender: string;
  DateOfBirth: string;
  CaseNumber: string;
  CaseTypeName: string; // 'אשפוז' | 'מרפאות' | 'מיון'
  CaseTypeKey: string; // '1' | '2' | '3'
  MoveCat: string; // '1' (admission) | '2' (transfer) | '3' (discharge) | '4' (temp leave start) | '5' (temp leave end) | '6' (temp leave)
  MoveType: string;
  MoveTypeLabel: string;
  MoveDate: string; // 'YYYY-MM-DD'
  MoveTime: string; // 'HH:mm'
  MoveDateEnd?: string;
  MoveTimeEnd?: string;
  ActiveDepartmentKey: string;
  ActiveDepartmentGroup: string;
  PrevDepartmentKey?: string;
  PrevDepart?: string;
  PrevSeodeDepart?: string;
  RoomName?: string;
  RoomNumber?: string;
  BedNumber?: string;
  IsTemporaryLeave: boolean;
  IsDanger: boolean;
  IsAran: boolean;
  AranNumber?: string;
  AranPlace?: string;
  AranStatus?: string;
  HospitalizedDay: number;
  TotalTimeInHours: number;
  DocNameMalrad?: string;
  Phone1?: string;
  Phone2?: string;
  FatherName?: string;
  ReceiveCauseDes?: string;
  PatientComplaint?: string;
  Referrer?: string;
  HosReferrer?: string;
  Payer?: string;
  Commitment?: string;
  Comments?: string;
  TotalRows: number; // Server-side pagination
}

export interface DepartmentSummaryRow {
  DepartmentKey: string;
  DepartmentName?: string;
  ViewMode: string; // 'DEPART' | 'DEPART_SEODE'
  TotalPatients: number;
  EshpozCount: number; // Case Type 1
  ClinicsCount: number; // Case Type 2
  MiyunCount: number; // Case Type 3
  DangerCasesCount: number;
  AranCasesCount: number;
  TemporaryLeaveCount: number;
}

export interface PatientMoveHistoryRow {
  MoveSequence: number;
  MoveCat: string;
  MoveType: string;
  MoveTypeLabel: string;
  MoveDate: string; // 'YYYY-MM-DD'
  MoveTime: string; // 'HH:mm'
  MoveDateEnd?: string;
  MoveTimeEnd?: string;
  MoveDepartKey?: string;
  MoveDepart?: string;
  MoveDepartSeodeKey?: string;
  MoveDepartSeode?: string;
  RoomName?: string;
  RoomNumber?: string;
  BedNumber?: string;
  InsertDateTime: string; // ISO datetime
  InsertUserName?: string;
  UpdateDateTime?: string;
  UpdateUserName?: string;
}

export interface MonitoringSyncState {
  ActiveCount: number;
  MaxInsertDateTime: string; // ISO datetime
  MaxMoveDate: string; // 'YYYY-MM-DD'
  MaxMoveTime: string; // 'HH:mm'
}

export interface CurrentPatientsRequest {
  viewMode: 'DEPART' | 'DEPART_SEODE';
  departmentFilter: string; // '' for all departments
  caseTypeFilter: 'ALL' | '1' | '2' | '3';
  onlyDangerCases: boolean;
  onlyAranCases: boolean;
  freeSearch: string;
  pageIndex: number;
  pageSize: number;
}

export interface CurrentPatientsResponse {
  rows: CurrentPatientRow[];
  totalRows: number;
}
