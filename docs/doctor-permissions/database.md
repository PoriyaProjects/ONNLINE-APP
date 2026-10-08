# Doctors Permissions database

Scripts live in `docs/doctor-permissions/sql/`. They were not executed during development. Apply them in SSMS. Do not put connection strings or the scheduler key in this file.

`001_doctor_permissions.sql` runs against `NAMER`. It creates module tables only when missing, and indexes only when missing. Re-running it does not drop data and does not reset `ApprovalDelayWarningDays` if that key already exists. The seed inserts `14` only when the key is absent.

`002_onnline_menu.sql` inserts the portal link `doctors-permissions` / `הרשאות רופאים` into `OnnLine.dbo.Links` when that `LinkId` is missing, and refreshes the description if it exists. A person still needs a `LinksPermissions` row. `UserId` there is `ADUserName`, not `EmployeeID`. The module then enforces scope itself.

## NAMER sources

Read only. The spelling `Departnent` is intentional.

```sql
SELECT EmployeeID, FirstName, LastName, Title, FunctionID, DepartnentCode,
       JobTitleID, ManagerID1, ManagerID2, ADUserName, Email, CellNumber, EndWorkDate
FROM NAMER.dbo.EP_Employees
WHERE EndWorkDate IS NULL;
```

```sql
SELECT DepartnentCode, DepartnentDescripton, DepartnentShortDescripton
FROM NAMER.dbo.EP_Departnents;
```

`ManagerID1` and `ManagerID2` reference `EP_Employees.EmployeeID`. `RowID` is not used. This module does not insert or update `EP_Employees` or `EP_Departnents`.

## Tables

| Table | Purpose | Important keys |
|---|---|---|
| `DoctorPermissions` | Catalog item | `Code` unique. `DefaultValidityMonths` 1–120, default 36. `RenewalLeadMonths` 0–36 and strictly less than validity, default 3 |
| `DoctorPermissionProfileTemplates` | Blueprint for a department, function, and job | `DepartmentCode`, `FunctionID`, `JobTitleID`, `IsActive` |
| `DoctorPermissionProfileTemplateItems` | Permissions on a template | Unique `(ProfileTemplateId, PermissionId)`. `IsRequired`, `SortOrder` |
| `DoctorEmployeeProfiles` | One profile for one employee | `EmployeeId`, optional `ProfileTemplateId`, `IsActive`, `ClosedAt` |
| `DoctorEmployeeProfilePermissions` | One assignment | `EmployeeProfileId`, `PermissionId`, `Status`, `RenewalSourceId` points at the parent assignment |
| `DoctorPermissionApprovalActions` | Approve, reject, resubmit, and related actions | `EmployeeProfilePermissionId`, `Action`, `PerformedAt` |
| `DoctorEmployeeNotes` | Employee notes | `EmployeeId`, `NoteText` up to 4000, `IsActive` |
| `DoctorEmployeeOrgSnapshot` | Last seen department, function, and job | Primary key `EmployeeId`. Column `DepartnentCode` |
| `DoctorEmployeeOrganizationalChanges` | One changed field | `ChangeType`, `FieldName`, `OldValue`, `NewValue`, `ProcessingStatus`, `RelatedProfileId` |
| `DoctorPermissionNotificationRules` | When to notify | Unique `(NotificationType, DayOffset)`. Channel `EMAIL`, `SMS`, or `BOTH` |
| `DoctorPermissionNotifications` | One delivery | Status `QUEUED`, `SENT`, `FAILED`, `SKIPPED`. `RetryCount` |
| `DoctorPermissionAuditLog` | History source | `EntityType`, `EntityId`, `Action`, `PerformedAt` |
| `DoctorPermissionUserRoles` | `ADMIN` or `DEPARTMENT_MANAGER` | Active admin is unique per employee. Active department manager is unique per employee and `DepartnentCode` |
| `DoctorPermissionSettings` | Key/value | Only `ApprovalDelayWarningDays` is used |

## Relationships

`DoctorEmployeeProfiles.EmployeeId` is the NAMER employee. A profile may point at `DoctorPermissionProfileTemplates`. Assignments point at the profile and at `DoctorPermissions`. `RenewalSourceId` points at another assignment, the parent. Approval actions, notifications, and most audit rows point at the assignment id. Notes and the organizational snapshot point at `EmployeeId`. An organizational change may point at `RelatedProfileId`.

## Duplicate protection

`UX_DpEmpPerm_OpenSame` is unique on `(EmployeeProfileId, PermissionId)` where status is `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, or `SUSPENDED`. A rejected or cancelled row does not block a new open row. `UX_DpEmpPerm_OpenRenewal` is unique on `RenewalSourceId` where the child is `DRAFT` or `PENDING_APPROVAL`. `UQ_DpTemplateItems` blocks the same permission twice on one template. `UX_DpNotif_Slot` blocks a second delivery for the same assignment, recipient, type, day, and channel.

## Indexes that matter

`IX_DpEmpPerm_ProfileStatus`, `IX_DpEmpPerm_StatusExp`, and `IX_DpEmpPerm_RenewalSource` serve the employee card, expiry, and renewal lookup. `IX_DpApproval_Perm` serves waiting time. `IX_DpAudit_Entity` serves history. `IX_DpNotif_Status` and `IX_DpNotif_Created` serve the notification list. `IX_DpOrgChange_Detected` serves the organizational list. The script tail repeats the `IF NOT EXISTS` index creates so a database that already had the tables still receives later indexes.

## Notification rule seeds

Inserted only when that type and day are missing: `INITIAL_REQUEST` day 0, `REMINDER` days 3 and 7, `ESCALATION` day 14, `RENEWAL_REQUEST` day 0, `EXPIRY_APPROACHING` day 30. Channel default `BOTH`. The day-30 rule is a notification, not the on-screen expiring window. Expiring on screen uses `RenewalLeadMonths`.

## Manual edits

Do not set status or `RenewalSourceId` by hand unless recovering a known row. Approve, reject, and resubmit also write `DoctorPermissionApprovalActions` and `DoctorPermissionAuditLog`. A second open renewal child will fail the unique index.
