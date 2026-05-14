export interface NpsDashboardSummary {
  pendingRequestsCount: number;
  myPendingApprovalsCount: number;
  myPendingRequestsCount: number;
  /** Rows in `EP_Departnents`. */
  totalDepartmentsCount: number;
  /** Rows in `EP_NursePermissionActions`. */
  totalActionsCount: number;
  /** Rows in `EP_NursePermissionPermissions`. */
  totalPermissionsCount: number;
  /** Rows in `EP_NursePermissionNurses`. */
  totalNursesCount: number;
}

/** From `NpsGetAccessContext` / `GetAccessContext` (catalog vs employee-only NPS UI). */
export interface NpsAccessContext {
  currentEmployeeId: number;
  isGlobalAdmin: boolean;
  isManager1OfAnyEmployee: boolean;
  isManager2OfAnyEmployee: boolean;
  /** True when user may open profiles, rules, actions, permissions, audit, etc. */
  canAccessNpsConfiguration: boolean;
}

export interface NpsEmployeeListRow {
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  DepartnentCode: string;
}

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

export interface NpsManagerApprovalSummaryRow {
  EmployeeID: number;
  FullName: string;
  NotApprovedCount: number;
  LastUpdateDate?: string | null;
  Done: boolean;
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
  ProfileName: string;
  Description: string;
  IsActive: boolean;
  /** Optional; used when sending profile writes (server DTO). */
  Priority?: number;
  /** Optional; matches `EP_NursePermissionProfiles` / server `NpsProfileRow`. */
  DepartnentCode?: string | null;
  EducationID?: string | null;
  SpecialityID?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
}

/** Server `NpsProfileBodyDto` — camelCase JSON. */
export interface NpsProfileWriteBody {
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  departnentCode?: string | null;
  educationID?: string | null;
  specialityID?: string | null;
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
  PermissionName: string;
  PermissionDescription?: string;
  Description?: string;
  IsActive: boolean;
  ActionIDFK?: string | null;
}

export interface NpsAction {
  ActionID: number;
  ActionSubject: string;
  IsActive: boolean;
  Sort: number;
}

export interface NpsActionWriteBody {
  ActionSubject: string;
  IsActive: boolean;
  Sort: number;
}

export interface NpsDepartmentActionRow {
  Row_ID: number;
  DepartnentCodeIDFK: string;
  ActionIDFK: number;
  IsActive: boolean;
}

export interface NpsProfilePermission {
  ProfileID: number;
  PermissionID: number;
  IsGranted: boolean;
}

export interface NpsPermissionCardItem {
  PermissionID: number;
  PermissionName: string;
  Description?: string;
  IsActive: boolean;
  IsGranted: boolean;
}

export interface NpsPermissionCard {
  ActionID: number;
  ActionSubject: string;
  IsActive: boolean;
  Permissions: NpsPermissionCardItem[];
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

export interface NpsProfileRuleTableRow {
  RuleID?: number;
  ProfileID?: number;
  DepartnentCode?: string;
  EducationID?: number;
  SpecialtyID?: number;
  ProfileName: string;
  ActionSubject: string;
  GrantedPermissionsCount: number;
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
