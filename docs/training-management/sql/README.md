# Training Management SQL

**One file only:** [`training-management.sql`](training-management.sql)

## What it does

- Creates simple Training* tables (PK only — no FK / CHECK / UNIQUE constraints)
- Creates/alters helpers + **39** WebMethod stored procedures
- Joins people from existing:
  - `NAMER.dbo.EP_Employees` (`EmployeeID`, `FirstName`, `LastName`, `Email`, `DepartnentCode`, `EndWorkDate`, …)
  - `NAMER.dbo.EP_Departnents` (`DepartnentCode`, `DepartnentDescripton`)

Active employee filter:

```sql
EndWorkDate IS NULL AND EmployeeID NOT LIKE '00000%'
```

## How to run

1. Open `training-management.sql` in SSMS
2. Change `USE [Forms];` if needed
3. If `EP_Employees` is **not** in NAMER, replace `NAMER.dbo.EP_Employees` / `NAMER.dbo.EP_Departnents` with your database (e.g. `dbo.EP_Employees`)
4. Execute the whole script
5. Do **not** recreate `EP_Employees` / `EP_Departnents`

### Already installed?

If Training tables already exist, run [`patch-session-attendance-schedule.sql`](patch-session-attendance-schedule.sql) to add planned `AttendanceOpenAt` / `AttendanceCloseAt` and refresh `GetSessionDetails` / `SaveSession`.

## Notes

- QR: C# must pass `@TokenHash` (and `@ExpiresAt`) — raw token is never stored
- Identity confirm default: `IdentityNumber` must equal `ActingEmployeeID`
- Certificate PDF / email send stay in C#; SQL only stores metadata / queue rows
- No SQL was executed by the generator against your database
- Course `Code` is auto-generated (UUID) by the app/API on create; planned attendance times are separate from operational `AttendanceWindowOpenedAt` / `AttendanceWindowClosedAt`