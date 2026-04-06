/*
  The NPS Angular module (nps-base-api.service) calls ASP.NET Web API at {host}/api/... (see NPS-README.md).
  These ASMX methods are optional legacy wrappers on NursesPermissions — not the same URLs as /api/employees etc.

  If a client still posts JSON to WebService.asmx, use the { d: ... } envelope like other ONNLINE endpoints.

  GetNursePermissionsAccessContext  — body: {}
    Returns: { employeeId, isGlobalAdmin, isReadOnlyAll, isReadOnlyScoped, manageableDepartmentCodes[], applicationRoles[] }

  SearchNursesForPermissions — body: { "query": "..." }
    Returns: NurseSearchResult[]

  GetEmployeePermissionAssignments — body: { "employeeId": number }
  GetNurseEffectivePermissions — body: { "employeeId": number }
  GetPermissionProfilesCatalog — body: {}
  GetPermissionProfileMatrix — body: { "profileId": number }
  GetPermissionProfileRuleSets — body: { "profileId": number }
  GetPermissionAssignmentAudit — body: { "employeeId": number|null, "from": string?, "to": string? }
  GetNursePermissionsDashboardKpis — body: {}
  RecalculateNursePermissionProfiles — body: { "employeeId": number }
    Should invoke dbo.sp_EP_RecalculateEmployeePermissionProfiles.
*/
