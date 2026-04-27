export interface NpsDashboardSummary {
  pendingQueueCount: number;
  pendingRequestsCount: number;
  myPendingApprovalsCount: number;
  myPendingRequestsCount: number;
}

export interface NpsEmployeeListRow {
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  DepartnentCode: string;
}

<<<<<<< HEAD
/** Row from `NpsGetAssignments` / `NpsGetEmployeeAssignments` (enriched with ruleId). */
export interface NpsEmployeeProfileAssignmentRow {
  assignmentId: number;
  employeeId: number;
  ProfileID: number;
  ProfileName: string | null;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  isActive: boolean;
  sourceRequestID?: number | null;
  ruleId?: number | null;
  assignmentStatus?: string | null;
}

export interface NpsPermissionApprovalGridRow {
  RequestID: number;
  EmployeeID: number;
  FullName: string;
  RuleID?: number | null;
  ProfileID: number;
  ItemID: number;
  PermissionID: number;
  PermissionName: string;
  PermissionIsActive: boolean;
  RequestStatus: string;
  Manager1Approved: boolean;
  Manager2Approved: boolean;
  EmployeeApproved: boolean;
  Manager1ApproverID?: number | null;
  Manager2ApproverID?: number | null;
  EmployeeApproverID?: number | null;
  LastUpdateDate?: string | null;
}

export interface NpsCreatePermissionRequestFromRuleBody {
  employeeId: number;
  ruleId: number;
  notes?: string;
}

export interface NpsPermissionApprovalUpdateBody {
  itemId: number;
  stepNo: number;
  approved: boolean;
  comments?: string;
}

export interface NpsPermissionApprovalBatchBody {
  approvals: NpsPermissionApprovalUpdateBody[];
}

=======
>>>>>>> origin/main
export interface NpsEmployeeDetail {
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  DepartnentCode: string;
  DepartnentName: string;
  ManagerID1: number;
  ManagerName1: string;
  ManagerID2: number;
  ManagerName2: string;
  Email: string;
  ADUserName: string;
}

export interface NpsEducationRow {
  EmployeeEducationID: number;
  EducationID: number;
  EducationName: string;
  SpecialtyID: number;
  SpecialtyName: string;
  IsPrimary: boolean;
}

export interface NpsProfile {
  ProfileID: number;
  ProfileCode: string;
  ProfileName: string;
  Description: string;
  IsActive: boolean;
  /** Optional; used when sending profile writes (server DTO). */
  Priority?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

/** Server `NpsProfileBodyDto` — camelCase JSON. */
export interface NpsProfileWriteBody {
  name: string;
  profileCode?: string;
  description: string;
  isActive: boolean;
  priority: number;
}

/** Catalog row from `NpsGetEducations` (normalized). */
export interface NpsEducationCatalog {
  EducationID: string;
  EducationSubject: string;
  // Code?: string;
  // IsActive: boolean;
}

/** Catalog row from `NpsGetSpecialties` (normalized). */
export interface NpsSpecialtyCatalog {
  SpecialtyID: string;
  EducationID?: string | null;
  Speciality: string;
  SpecialtyCode?: string;
  IsActive: boolean;
}

export interface NpsPermission {
  PermissionID: number;
  PermissionKey: string;
  PermissionName: string;
  PermissionDescription: string;
  IsActive: boolean;
}

export interface NpsProfilePermission {
  ProfileID: number;
  PermissionID: number;
  IsGranted: boolean;
}

export interface NpsProfileRule {
  RuleID: number;
  ProfileID: number;
  DepartnentCode?: string;
  /** Server row / JSON may use `DepartmentCode`. */
  DepartmentCode?: string;
  EducationID?: number;
  SpecialtyID?: number;
  SpecialtyId?: number;
  IsActive: boolean;
  EffectiveFrom: string;
  EffectiveTo: string;
  RuleDescription: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface NpsRequestSummary {
  RequestID: number;
  EmployeeID: number;
  TargetProfileID: number;
  TargetProfileName: string;
  Status: string;
  CreatedUtc: string;
  CompletedUtc: string;
}

export interface NpsRequestStep {
  StepID: number;
  StepOrder: number;
  ApproverEmployeeID: number;
  ApproverName: string;
  Status: string;
  ActionUtc: string;
  Comments: string;
}

export interface NpsRequestDetail extends NpsRequestSummary {
  steps: NpsRequestStep[];
}

export interface NpsDepartment {
  DepartnentCode: string;
  DepartnentDescripton: string;
}

export interface NpsAuditRow {
  AuditID: number;
  ActorEmployeeID: number;
  ActionCode: string;
  EntityType: string;
  EntityID: string;
  DetailsJson: string;
  CreatedUtc: string;
}
