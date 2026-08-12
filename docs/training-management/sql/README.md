# Training Management SQL

**One file only:** [`training-management.sql`](training-management.sql)

## What it does

- Creates simple Training* tables (PK only — no FK / CHECK / UNIQUE constraints)
- Creates/alters helpers + **41** WebMethod stored procedures
- Joins people from existing:
  - `NAMER.dbo.EP_Employees` (`EmployeeID`, `FirstName`, `LastName`, `Email`, `DepartnentCode`, `EndWorkDate`, …)
  - `NAMER.dbo.EP_Departnents` (`DepartnentCode`, `DepartnentDescripton`)

Active employee filter:

```sql
EndWorkDate IS NULL AND EmployeeID NOT LIKE '00000%'
```

**Time convention:** all timestamps use **local server time** via `GETDATE()` (same as the rest of the hospital apps). Do **not** use `SYSUTCDATETIME()`.

## How to run

1. Open `training-management.sql` in SSMS
2. Change `USE [Forms];` if needed
3. If `EP_Employees` is **not** in NAMER, replace `NAMER.dbo.EP_Employees` / `NAMER.dbo.EP_Departnents` with your database (e.g. `dbo.EP_Employees`)
4. Execute the whole script
5. Do **not** recreate `EP_Employees` / `EP_Departnents`

### Already installed?

1. Re-run the `CREATE OR ALTER PROCEDURE` section of `training-management.sql` (or the whole script — table `IF NOT EXISTS` is safe), **or** at minimum run [`patch-qr-expiry-local.sql`](patch-qr-expiry-local.sql) for QR open/confirm expiry.
2. Optional: [`patch-session-attendance-schedule.sql`](patch-session-attendance-schedule.sql) for planned `AttendanceOpenAt` / `AttendanceCloseAt`.
3. After QR local-time patch: lecturer **רענון קוד** (or close/reopen attendance).
4. Certificates staying **Pending (Status=3)** after attendance: run [`patch-issue-certificate-on-attendance.sql`](patch-issue-certificate-on-attendance.sql). Attendance confirm now **issues** the certificate row (Status=1).
5. Empty `TrainingCertificates.FilePath`: run [`patch-certificate-filepath.sql`](patch-certificate-filepath.sql) and recycle RFC. Confirm/generate now write a PDF under `C:\pdf\TrainingCertificates\` and store that path. Existing rows get a file on next download.

## Notes

- QR: C# passes `@TokenHash`; raw token is never stored. Expiry is set in SQL as `DATEADD(MINUTE, 30, GETDATE())`.
- Identity confirm default: `IdentityNumber` must equal `ActingEmployeeID`
- Certificate PDF is written in C# (`TrainingCertificatePdfWriter` + `RFC.CreateTrainingCertificatePdf`); SQL stores `FilePath` / hash after the file exists. Email send stays optional.
- No SQL was executed by the generator against your database
- Course `Code` is auto-generated (UUID) by the app/API on create; planned attendance times are separate from operational `AttendanceWindowOpenedAt` / `AttendanceWindowClosedAt`
