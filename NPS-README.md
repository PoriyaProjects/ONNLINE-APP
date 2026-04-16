# Nurses Permissions System (NPS)

Production-oriented permissions dashboard: **ASP.NET Web API 2** on the RFC website (SQL Server / `NPS` schema + `dbo.EP_*`) and an **Angular 9** lazy-loaded module in ONNLINE-APP.

## Database

- **No migrations or DDL** are included. Tables must already exist; NPS backend code and SQL live in a single file, `RFC/App_Code/Nurses/NursesPermissions.cs`. Adjust the embedded SQL there if your physical schema differs.
- Connection string: `Web.config` → `connectionStrings` → **`NpsConnection`** (same catalog as `EP_*` and `NPS` unless you split databases).

## Backend (RFC)

1. **Binaries**: `System.Web.Http.dll`, `System.Web.Http.WebHost.dll`, `System.Net.Http.Formatting.dll` (Web API 5.2.9) must be in the site **`/bin`** folder (already present if you copied from NuGet `Microsoft.AspNet.WebApi.*` 5.2.9).
2. **`Global.asax`** calls `GlobalConfiguration.Configure(NpsWebApiConfig.Register)` to host attribute-routed APIs under **`/api/...`**.
3. **`Web.config`**: `compilation` references for the three assemblies above; CORS custom header **`x-dev-username`** for local dev.
4. **Admin users**: `appSettings` key **`NpsGlobalAdminEmployeeIds`** — comma-separated `EmployeeID` values for catalog/profile/audit/queue POST and employee `create-request`.
5. **Identity**: Current user is resolved from header **`x-dev-username`** (must match `EP_Employees.ADUserName`) or, when configured, authenticated `User.Identity`.
6. **Queue processing**: `POST /api/sync/process-queue` with JSON `{ "maxItems": 50 }` (admin). Schedule via **Task Scheduler** or SQL Agent calling that URL.

### Main API areas

- `GET /api/me`, `GET /api/dashboard/summary`
- `GET|POST|... /api/employees`, `.../departments`, educations, specialties, permissions, profiles, profile-rules, requests, assignments, audit
- `POST /api/sync/process-queue`

Legacy **WebService.asmx** nurse methods delegate to the same logic via `RFC/App_Code/Nurses/NursesPermissions.cs`.

## Frontend (ONNLINE-APP)

1. **`environment.ts` / `environment.prod.ts`**
   - **`url`**: must point at **`WebService.asmx/`** (e.g. `http://localhost:64964/WebService.asmx/`). The NPS client calls **`{url}NpsGetEmployees`**, **`{url}NpsGetDashboardSummary`**, etc. (same method names as in **`WebService.cs`**, implemented in **`NursesPermissions.cs`**).
   - **`npsUserId`**: EP **`EmployeeID`** as a string, sent as **`user_id`** on every NPS WebMethod (required for authorization).
2. **Route**: hash URL **`#/nps-permissions`** (lazy module). Legacy **`#/nurse-permissions-manage`** redirects to the same place.

## Operational notes

- **Department change queue**: something external must insert rows into `NPS.DepartmentChangeQueue` when `DepartnentCode` changes; the app processes **Pending** rows and creates approval requests.
- **Approvals**: strict order ManagerID1 → ManagerID2 → employee; only the current pending step’s approver can approve/reject.
- **Profile resolution**: implemented in `NpsProfileResolutionService` (department + education + specialty tiers, then lowest profile **Priority**).

## Angular version

The repo uses **Angular 9** / **Material 9**. The NPS UI targets that stack; upgrading to Angular 11+ is a separate migration.
