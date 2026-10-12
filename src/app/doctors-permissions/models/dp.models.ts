export interface DpLookup {
  id: string;
  name: string;
}

export interface DpAccess {
  employeeId: string;
  displayName: string;
  isAdmin: boolean;
  isDirectManager: boolean;
  isIndirectManager: boolean;
  isDepartmentManager: boolean;
  departmentCodes: string[];
  departments: DpLookup[];
  functions: DpLookup[];
  jobTitles: DpLookup[];
}

export interface DpEmployeeList {
  employeeId: string;
  firstName: string;
  lastName: string;
  departnentCode: string;
  departmentName: string;
  functionId: string;
  functionName: string;
  jobTitleId: string;
  jobTitleName: string;
  specialty: string;
  profileCount: number;
  activePermissions: number;
  pendingPermissions: number;
  rejectedPermissions: number;
  expiringPermissions: number;
  expiredPermissions: number;
}

export interface DpPermission {
  id: number;
  employeeProfileId: number;
  permissionId: number;
  code: string;
  name: string;
  category: string;
  status: string;
  approvalDate: string;
  expirationDate: string;
  rejectionReason: string;
  rejectedByName: string;
  approvedByName: string;
  renewalSourceId: number;
  renewalLeadMonths: number;
  createdAt: string;
  hasOpenRenewal: boolean;
  hasRejectedRenewal: boolean;
  renewalFrom: string;
  renewalChildId: number;
  renewalChildStatus: string;
  renewalChildCreatedAt: string;
  renewalChildReason: string;
  isCurrent: boolean;
  isExpired: boolean;
  isExpiring: boolean;
  profileName: string;
  departmentCode: string;
  departmentName: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  functionName: string;
  jobTitleName: string;
  specialty: string;
  templateName: string;
  description: string;
  sourceExpirationDate: string;
  priorRejectComment: string;
  priorRejectAt: string;
  priorRejectByName: string;
  submittedAt: string;
  wasResubmitted: boolean;
  approverRole: string;
}

export interface DpProfile {
  id: number;
  profileTemplateId: number;
  templateName: string;
  departmentCode: string;
  departmentName: string;
  functionId: string;
  functionName: string;
  jobTitleId: string;
  jobTitleName: string;
  specialty: string;
  profileName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  createdByName: string;
  updatedByName: string;
  permissions: DpPermission[];
}

export interface DpEmployeeDetail {
  employee: {
    employeeId: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    cellNumber: string;
    startWorkDate: string;
    departnentCode: string;
    departmentName: string;
    functionName: string;
    jobTitleName: string;
    manager1Name: string;
    manager2Name: string;
  };
  profiles: DpProfile[];
  canManage: boolean;
  isSelf: boolean;
}

export interface DpPage<T> {
  total: number;
  rows: T[];
  approvalDelayWarningDays?: number;
}

export interface DpCatalogItem {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  defaultValidityMonths: number;
  renewalLeadMonths: number;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  updatedByName: string;
  templateCount: number;
  assignmentCount: number;
  activeAssignmentCount: number;
}

export interface DpTemplateItem {
  id: number;
  permissionId: number;
  name: string;
  code: string;
  category: string;
  permissionActive: boolean;
  isRequired: boolean;
  sortOrder: number;
}

export interface DpTemplate {
  id: number;
  name: string;
  departmentCode: string;
  departmentName: string;
  functionId: string;
  functionName: string;
  jobTitleId: string;
  jobTitleName: string;
  specialty: string;
  description: string;
  isActive: boolean;
  updatedAt: string;
  permissionCount: number;
  activeProfileCount: number;
  profileCount: number;
  items: DpTemplateItem[];
}

export interface DpKpis {
  activeEmployees: number;
  activePermissions: number;
  pendingApprovals: number;
  rejectedPermissions: number;
  expiringPermissions: number;
  expiredPermissions: number;
  delayedApprovals: number;
}

export interface DpGap {
  departnentCode: string;
  departmentName: string;
  employees: number;
  active: number;
  pending: number;
  rejected: number;
  expiring: number;
  expired: number;
}

export interface DpDashboard {
  kpis: DpKpis;
  gaps: DpGap[];
  attention: DpPermission[];
  rows: DpPage<DpPermission>;
  orgReviewCount: number;
  approvalDelayWarningDays: number;
}

export interface DpNote {
  id: number;
  employeeId: string;
  noteText: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface DpHistory {
  id: number;
  action: string;
  category: string;
  title: string;
  occurredAt: string;
  actorName: string;
  isSystem: boolean;
  profileName: string;
  permissionName: string;
  reason: string;
  oldStatus: string;
  newStatus: string;
}

export interface DpRole {
  id: number;
  employeeId: string;
  employeeName: string;
  roleCode: string;
  departnentCode: string;
  departmentName: string;
  isActive: boolean;
}

export interface DpRule {
  id: number;
  notificationType: string;
  dayOffset: number;
  channel: string;
  isActive: boolean;
}

export interface DpSettings {
  roles: DpRole[];
  rules: DpRule[];
  approvalDelayWarningDays: number;
  updatedAt: string;
  updatedByName: string;
}
