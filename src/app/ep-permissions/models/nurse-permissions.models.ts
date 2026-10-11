export type EpUserRole = 'Admin' | 'DirectManager' | 'IndirectManager' | 'Employee' | string;

export type EpCheckType = 'Direct' | 'Indirect' | 'Employee';

export interface EpDashboardSummary {
  TotalEmployees: number;
  DepartmentsCount: number;
  PendingChecks: number;
  UserRole: EpUserRole;
  AvailableRoles?: EpUserRole[];
}

export interface EpEmployee {
  EmployeeId: string;
  FirstName: string;
  LastName: string;
  DepartmentCode: string;
  DepartmentName: string;
  Email: string;
  PendingChecks: number;
  ProfileID?: number;
  ProfileName?: string;
  FullName?: string;
}

export interface EpPermission {
  PermissionID: number;
  PermissionCode: string;
  PermissionName: string;
  Description: string;
  IsActive: boolean;
}

export interface EpPermissionGroup {
  GroupID: number;
  GroupName: string;
  Description: string;
  IsActive: boolean;
  PermissionIds?: number[];
}

export interface EpProfile {
  ProfileID: number;
  ProfileName: string;
  DepartnentCode: string;
  DepartnentDescripton?: string;
  EducationID: number;
  EducationSubject?: string;
  SpecialtyID: number;
  Speciality?: string;
  IsActive: boolean;
  GroupIds?: number[];
}

export interface EpPermissionGridItem {
  PermissionID: number;
  PermissionCode: string;
  PermissionName: string;
  Description?: string;
  DirectManagerCheck: boolean;
  DirectCheckDate: string;
  IndirectManagerCheck: boolean;
  IndirectCheckDate: string;
  EmployeeCheck: boolean;
  EmployeeCheckDate: string;
  AssociatedGroups?: string;
}

export interface EpEmployeePermissionGrid {
  EmployeeId: string;
  FirstName: string;
  LastName: string;
  DepartmentName: string;
  ProfileName?: string;
  EducationSubject?: string;
  Speciality?: string;
  UserRole: EpUserRole;
  Items: EpPermissionGridItem[];
}

export interface EpAdminSetupResult {
  Success: boolean;
  Message: string;
  Data: any;
}

export interface EpOperationResult {
  Success: boolean;
  Message: string;
}

export interface EpBulkGrantPayload {
  employeeIds: string[];
  permissionIds: number[];
}

export interface EpLookupItem {
  Id: string;
  Name: string;
}
