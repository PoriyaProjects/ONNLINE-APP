# Backend compile fixes — RehabilitationOccupancyService (lines 164–175 area)

Deliverable: `RehabilitationOccupancyService.cs` (C# 5 / App_Code). Replace the entire backend file with it.

## ⚠ Do NOT use the PATIENT_MONITORING / SystemUnits variant

A broken copy used `dbo.PATIENT_MONITORING` + `dbo.SystemUnits` for occupancy/admissions. That schema **does not match** SSMS-validated rehab queries and returns empty/wrong API data.

**Use `dbo.Hospitalizations`** (+ `dbo.MedicalRecords` for `Pay_Institute` / direction) as in `RehabilitationOccupancyService.cs`:

| Method | Correct source |
|--------|----------------|
| `GetDailyOccupancy` | `Hospitalizations` (HPID, Unit, Hosp_Date, Discharge_Date) |
| `GetAdmissionsByPayer` | `Hospitalizations` + `MedicalRecords.Pay_Institute` |
| `GetAdmissionsByDirection` | `Hospitalizations.Admitted_From` (= `\u05D0\u05D9\u05E9\u05E4\u05D5\u05D6` → פנים) + `MedicalRecords` |
| `GetRecommendedTargets` | Same occupancy CTE as 1.3 (`Hospitalizations`) |
| `GetRevenueNet` | `Hospitalizations` + `Invoices` |

Connection: `Data Source=SRV-APPDB;Initial Catalog=NAMER;...` (IIS `ChameleonConnection` must point to the same DB used in SSMS).

## 1. `N'...'` is SQL, not C# (CS1012 / CS0103)

**Broken (C# array initializer):**
```csharp
private static readonly string[] RehabDepartmentNames =
{
    N'המחלקה לגריאטריה שיקומית',
    N'מחלקת שיקום כללי',
};
```

**Fixed — option A (UTF-8 file, plain C# strings):**
```csharp
private static readonly string[] RehabDepartmentNames =
{
    "המחלקה לגריאטריה שיקומית",
    "מחלקת שיקום כללי",
};
```

**Fixed — option B (unicode escapes):**
```csharp
"\u05d4\u05de\u05d7\u05dc\u05e7\u05d4 \u05dc\u05d2\u05e8\u05d9\u05d0\u05d8\u05e8\u05d9\u05d4 \u05e9\u05d9\u05e7\u05d5\u05de\u05d9\u05ea"
```

`N'...'` stays **inside SQL text** only (e.g. `@"... WHERE x = N'אישפוז' ..."`).

---

## 2. C# 6+ features → C# 5 (CS8026)

| Remove | Use instead |
|--------|-------------|
| `out var from, out var to` | `DateTime from; DateTime to;` then `ParseRange(..., out from, out to);` |
| `fromDate?.Trim()` | `fromDate == null ? null : fromDate.Trim()` |
| `nameof(fromDate)` | `"fromDate"` |
| `private string Conn => ...` | `private static string GetConn() { return ...; }` |
| `ParseRange(..., out _, out _)` | `DateTime unusedFrom; DateTime unusedTo; ParseRange(..., out unusedFrom, out unusedTo);` |

---

## 3. ParseD + `SqlDbType.Date` (fixes `d:[]` / CS0246 cascade)

**Broken:**
```csharp
public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(DateTime fromDate, DateTime toDate)
{
    DateTime from = DateTime.Parse(fromDate.ToString());
    cmd.Parameters.Add("@FromDate", SqlDbType.DateTime).Value = fromDate;
}
```

**Fixed:**
```csharp
public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
{
    DateTime from;
    DateTime to;
    RehabDateParse.ParseRange(fromDate, toDate, out from, out to);
    cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
    cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
    // SQL: AND CAST(pm.PM_MOVE_DATE AS date) BETWEEN @FromDate AND @ToDate
}
```

`RehabDateParse` uses `DateTime.TryParseExact(..., "yyyy-MM-dd", ...)` and `new SqlParameter(name, SqlDbType.Date)`.

WebMethod signatures: `string FromDate, string ToDate` — not `DateTime`.
