# Doctors Permissions architecture

Angular 9 calls `Dp*` methods on `WebService.asmx`. The body is JSON. The response string is `{ ok, error, data }` inside the ASMX `d` envelope. The caller is the Windows identity resolved on the server. A `userId` in the body is ignored.

Email uses `SmtpClient`. SMS uses `Sms.sendSms`. Credentials and the scheduler key stay in the existing portal configuration and are not listed here.

## Folders

| Area | Path |
|---|---|
| Frontend module | `src/app/doctors-permissions/` |
| Routes | `doctors-permissions-routing.module.ts` |
| Navigation | `doctors-permissions-shell.component.ts` |
| HTTP | `services/doctor-permissions.service.ts` |
| Models | `models/dp.models.ts` |
| Status and dates | `utils/dp-status.ts` |
| Shared layout | `styles/dp.shared.scss` |
| Backend | `App_Code/DoctorPermissions/` |
| WebMethods | `App_Code/WebService.cs` |
| SQL | `docs/doctor-permissions/sql/` |

Backend files: `DoctorPermissionsAccess` (identity and scope), `DoctorPermissionsCommon` (status SQL, paging, errors), `DoctorPermissionsService` (reads), `DoctorPermissionsWrites` (profiles, catalog, templates, notes, settings), `DoctorPermissionsApprovals` (approve, reject, resubmit, override), `DoctorPermissionsAutomation` (job), `DoctorPermissionsNotifications` (send and retry).

`dp-status.ts` is the only place for permission Hebrew labels and chip classes. Do not copy the map into a page. Notification delivery labels (`QUEUED`, `SENT`, `FAILED`, `SKIPPED`) stay on the notifications page because they are not permission statuses. Dates render as `dd/MM/yyyy` and `dd/MM/yyyy HH:mm`.

Pages are Hebrew and `dir="rtl"`. Under 860px, tables with `dp-table-wrap` hide and `dp-cards` show. Settings uses the narrow page. Search, catalog, approvals, notifications, and organizational changes use the wide page.

## WebMethods

All are `POST` on `WebService.asmx`. Saves that take `payload` expect a JSON string.

| Method | Purpose | Important input |
|---|---|---|
| `DpGetAccessContext` | Who the caller is and which departments they may use | None |
| `DpSearchEmployees` | One row per employee, counts, page 50 | `q`, `departnentCode`, `functionId`, `jobTitleId`, `specialty`, `profileTemplateId`, `status`, `skip`, `take` |
| `DpGetEmployee` | Employee, profiles, permissions | `employeeId` |
| `DpGetMyPermissions` | Same payload for the caller | None |
| `DpGetPendingApprovals` | Queue, page 50, excludes the caller | `q`, `departnentCode`, `permissionId`, `profileName`, `minWaitDays`, `maxWaitDays`, `kind` (`new` or `renewal`), `skip`, `take` |
| `DpApprovePermission` | Pending or draft to `APPROVED` | `permissionId` |
| `DpRejectPermission` | Pending or draft to `REJECTED` | `permissionId`, `reason` |
| `DpBulkApprove` | Approve each id with the same method | `permissionIds`, up to 100 |
| `DpResubmitPermission` | Same rejected row back to pending | `permissionId`, `comment` |
| `DpAdminOverride` | Admin status change with a reason | `permissionId`, `newStatus`, `reason` |
| `DpGetPermissionCatalog` | Catalog rows | None |
| `DpSavePermission` | Create or update a catalog row | `payload` |
| `DpGetProfileTemplates` | Templates | None |
| `DpSaveProfileTemplate` | Create or update a template and its items | `payload` |
| `DpSaveEmployeeProfile` | Create or update one profile. A new template link adds missing permissions | `payload` |
| `DpAddProfilePermission` | Add one catalog permission to one profile | `employeeProfileId`, `permissionId` |
| `DpRemoveProfilePermission` | Cancel a draft or pending row | `permissionId` |
| `DpGetDashboard` | KPIs, department gaps, attention, drill-down | `departnentCode`, `managerId`, `permissionId`, `status`, `expFrom`, `expTo`, `metric`, `skip`, `take` |
| `DpGetDepartmentGaps` | Department counts | `departnentCode` |
| `DpGetHistory` | Audit timeline, page size up to 100 | `employeeId`, `category`, `fromDate`, `toDate`, `search`, `skip`, `take`, `facing` |
| `DpGetNotes` | Active notes, newest first | `employeeId` |
| `DpSaveNote` | Create, edit, or deactivate | `payload`: `employeeId`, `noteText`, optional `id`, `isActive` false to deactivate. Blank text is rejected |
| `DpGetSettings` | Roles, reminder rules, delay days, last editor | None |
| `DpSaveUserRole` | `kind` `role`, `rule`, or `delay`. Admin only | `payload` |
| `DpGetOrganizationalChanges` | Change list, page 50 | `q`, `departnentCode`, `changeType`, `detectedFrom`, `detectedTo`, `needsReview`, `skip`, `take` |
| `DpGetNotifications` | Delivery list, page 50 | `q`, `channel`, `status`, `eventType`, `fromDate`, `toDate`, `skip`, `take` |
| `DpRetryNotification` | Same failed row to `QUEUED`, then send | `id` |
| `DpProcessScheduledJobs` | Expiry, renewals, baseline, org changes, due notifications | `jobKey`, or an authenticated admin with an empty key |

`DpGetDashboard` returns `approvalDelayWarningDays` with the KPIs. `DpGetPendingApprovals` returns the same number with the page. There is no `DpUpdateSettings`. Delay, roles, and reminder rules all go through `DpSaveUserRole`.

## Job order

`DoctorPermissionsAutomation.Run` does expiry, then renewal creation, then baseline snapshots, then organizational detection, then `SendDue`. Caps are 500, 500, 500, and 200. The return includes `expired`, `renewalsCreated`, `alreadyHadRenewal`, `baselined`, `orgChanges`, `notificationsSent`, and `notificationsFailed`.

## Adding a status or a setting

A new stored status has to be added to the check constraint, `dp-status.ts`, the approve and override allow-list, the filters, and the history titles. Do not add one casually.

A new setting needs a missing-key seed, a fixed key in `SaveDelay`-style code, a range check, an admin field, and one `SETTINGS_UPDATED` audit on entity `Settings` when the value changes. Do not accept an arbitrary key from the browser.
