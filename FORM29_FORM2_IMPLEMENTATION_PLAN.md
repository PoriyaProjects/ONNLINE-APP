# Form 2 implementation plan

Regulation 29, institutional Form 2 only. Form 3 is out of scope. Live signing and official PDF stay off.

## Stack found

- Angular 9.1, TypeScript 3.8, RxJS 6, hash routing in `src/app/core/app.routing.module.ts`. Lazy `NgModule`s are the pattern used by doctor permissions.
- ASP.NET 4.8 website in `RFC`: `WebService.asmx` plus `App_Code`. New work follows that shape: logic under `App_Code/Form29`, thin `[WebMethod]` wrappers on `WebService`.
- Identity is the existing `localStorage.ID` query parameter, checked against an active `NAMER.dbo.EP_Employees` row. This is not Windows authentication and is not an electronic signature.
- Form 29 request SQL uses the Forms catalog (`TrainingDb.GetFormsConnectionString`). Employee and department lookup stays on `NAMER_DB`. Commands stay parameterized.
- Dashboard links are rows in `OnnLine.dbo.Links` (`GetOnnlineLinksToSearch`). No link row is inserted in this phase.

## Route and API

- UI: `#/form29`, `#/form29/new`, `#/form29/:requestId`.
- ASMX methods on `WebService.asmx`: `F29GetContext`, `F29List`, `F29Get`, `F29SaveDraft`, `F29Submit`, `F29SearchDrugs`, `F29GetDrug`, `F29AddFile`, `F29GetFile`, `F29Decide`.
- `FormType` is fixed to 2 on the server. Patient-detail keys are rejected. Nothing is written to `dbo.Form29_PatientDetails`.

## Data sources

- Department: the caller's `EP_Employees.DepartnentCode` and `EP_Departnents.DepartnentDescripton` only. Any other department id is rejected.
- Facility: `FacilityId` and `FacilityName` are read only when those exact columns already exist on `EP_Employees` or `EP_Departnents`. No hospital name is hard-coded. If either value is missing, draft save still works and submit is rejected.
- Drug: read-only `Forms.dbo.Form29_Medicine_Report`. `DrugCode` is `[מספר רישום]`. The stored name is the Hebrew commercial name, or the English name when Hebrew is empty. `DoseForm`, `Route`, `Composition`, and `Manufacturer` come from `[צורת מינון]`, `[דרך מתן]`, `[מרכיב פעיל]`, and `[יצרן]`. Registration holder, registered indications, health basket, registration date, and veterinary use are shown as reference and are not written onto the request. Strength and country of manufacture are not in the catalog and stay empty. Submit requires the six stored snapshot fields. The client cannot type drug identity. Registered indications are not copied into the requested indication. Duplicate registration numbers use the first row ordered by Hebrew then English name.
- Files: optional `dbo.Form29_Files` rows with `Kind=REFERENCE`. Bytes go to `~/Form29Files/` on the site. SQL stores the relative path, not the file.
- Declaration stored by the server: `TemplateVersion=REVIEW-UNAPPROVED`, text `נוסח להשלמה ואישור הרוקחות`. Registration country is not in the catalog and is not shown as a stored field. Registration holder is display-only.

## Approval gate

Stages shown, in order: מנהל שירותי הרוקחות, יו״ר ועדת התרופות, מנהל המוסד / מוסמך מטעמו. `F29Decide` checks identity, visibility, `RowVer`, stage order, decision, and reason, then refuses without writing. There is no verified role map and no service that produces `SignatureRef`. A checkbox or typed name is not a signature. Return / reject / new `VersionNo` SQL is kept in source as `Form29Decisions.ReviewedSql` and is not executed.

Submitted rows are updated only while `Status='DRAFT'` and `RowVer` matches. Submit writes the canonical SHA-256 in the same update and then the row is immutable. Validity dates and `dbo.Form29_Deliveries` are not created.

## Menu row for IT — do not run here

`LinkId` is opened with `window.open`, so it must be the real SPA URL. Permissions are a separate `LinksPermissions` row. Neither insert is executed in this phase.

```sql
-- DO NOT RUN until the SPA host and the intended users are confirmed.
INSERT INTO [OnnLine].[dbo].[Links] ([LinkId], [LinkDescription], [LinkStatus], [Order], [SubToLinkId])
VALUES (N'https://<spa-host>/#/form29', N'טופס 2 — בקשה מוסדית (תקנה 29)', '1', '999', '0');
```

## Schema

Request tables on Forms: `dbo.Form29_Requests`, `dbo.Form29_Approvals`, `dbo.Form29_Files`, `dbo.Form29_PatientDetails`, `dbo.Form29_Deliveries`. This work does not create or rename them. If `dbo.Form29_Requests` is missing, the API returns `סכמת Form29 אינה פרוסה. יש להריץ את סקריפט הטבלאות לאחר בדיקה.`

## Pharmacy blockers

- Approved declaration wording and template.
- Role per stage, delegation, and signature order.
- An institutional signature mechanism that can fill `SignatureRef`.
- Which signature date starts the 12-month validity.
- Whether attachments are mandatory.
- Strength and country of manufacture are not on `Form29_Medicine_Report`. They stay blank. A separate strength column, if pharmacy requires one, is still unconfirmed.
- A facility id and name on the employee or department record.
- Country rules beyond the explicit Western Europe name requirement (`region` or `code` `WESTERN_EUROPE`).

## UI

Scoped `.form29-ui` from `.cursor/skills/form29-institutional-ui/SKILL.md`. Hebrew RTL, light surfaces, one scrolling form, visual progress header, summary column, print preview marked `טיוטה — לא מסמך מאושר`. Official PDF stays disabled.

## Verification

- Angular production build: `npx ng build --configuration=production --aot=true --output-hashing=all` with `NODE_OPTIONS` unset (Node 14.20 rejects `--openssl-legacy-provider`). Exit 0. Hash `9f9e7472ef251a1abcfd`. Later filter, search-row, and Hebrew transport-error edits compiled on `ng serve` (hash `605a4d1482fc55de67ac`).
- C# isolated compile of `App_Code/Form29` with `csc.exe` and `Bin\Newtonsoft.Json.dll` succeeded. `Form29RulesCheck` printed `Form29 rules ok`. No C# test project. Full site precompile was not run.
- Browser, desktop and about 390px: `#/form29` and `#/form29/new` render inside the existing shell. Empty service state shows `לא ניתן להתחבר לשירות. ודאו ש-WebService פועל.` Narrow width stacks the summary, filters, and institution fields. Search and `חיפוש` stay on one row. Screenshots: `form29-list-desktop.png`, `form29-editor-desktop.png`, `form29-editor-drug.png`, `form29-list-narrow.png`, `form29-editor-narrow.png`.

Not executed, so not passed:

- `Form29_SQL_Server_01_Schema.sql` was not run. `http://localhost:64964/WebService.asmx/` was down, and the browser had no `localStorage.ID`. Draft reload, submit failures, file download, department checks, and the signing refusal were not exercised against a database.
- Double-submit / `RowVer` was not run on SQL Server.
- Print preview was not opened. Official PDF stays disabled. `F29Decide` still refuses and writes nothing.

## Medicine catalog check

- Isolated `csc` of `App_Code/Form29` plus `TrainingDb.cs` exited 0. `Form29RulesCheck` printed `Form29 rules ok`.
- `ng serve` recompiled `form29-form29-module` (hash `2ee3614385a69742e5cf`). No live search against Forms was run from this session.

## Medicine catalog (Forms)

- Request SQL is `dbo.Form29_*` on the Forms connection. Employees stay on NAMER.
- Medicine search and `F29GetDrug` read `dbo.Form29_Medicine_Report`. Snapshot written to the request: registration number, Hebrew-or-English name, dose form, route, composition, manufacturer. Strength and origin stay empty. Holder, indications, basket, registration date, and veterinary use are reference-only.
