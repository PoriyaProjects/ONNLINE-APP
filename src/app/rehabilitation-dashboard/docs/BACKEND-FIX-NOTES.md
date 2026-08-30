# Backend compile fixes — RehabilitationOccupancyService + WebService.cs

Deliverable: **`RehabilitationOccupancyService.cs`** (single file, C# 5 / App_Code) — copy to `App_Code/RehabilitationOccupancyService.cs`.

---

## 0. WebService.cs — CS0111 duplicates + CS0246 / CS1061 cascade

**Symptoms after pasting full `WebService-Rehabilitation.cs` (or the old combined file):**

| Error | Cause |
|-------|-------|
| CS0111 | `GetRehabilitationOccupancy`, `GetRehabilitationAdmissionsByPayer`, `GetRehabilitationAdmissionsByDirection`, `GetRehabilitationRecommendedTargets`, `GetRehabilitationRevenueNet` defined twice (~6844 **and** ~6973–7017) |
| CS0246 | Missing DTOs: `RehabilitationHospitalizationDays`, `RehabilitationAvgLengthOfStay`, `DayRehab*` |
| CS1061 | `RehabilitationOccupancyService` missing `GetHospitalizationDays`, `GetAvgLengthOfStay`, `GetDayRehab*` |

### תיקון — 3 שלבים (בסדר)

1. **מחק שורות 6973–7017** ב-`WebService.cs` (הכפילות של 1.3–1.7). השאר הבלוק המקורי ב-**~6844**.
2. **החלף `RehabilitationOccupancyService.cs` המלא מ-docs** (947 שורות) → `App_Code/RehabilitationOccupancyService.cs` (החלפה מלאה). זה פותר CS0246 / CS1061 — כל ה-DTOs + `GetHospitalizationDays`, `GetAvgLengthOfStay`, `GetDayRehab*` וכו'.
3. **הדבק רק `WebService-Rehabilitation-NEW-ONLY.cs`** אחרי הבלוק הקיים (~6844). **אל** תדביק `WebService-Rehabilitation-EXISTING.cs` — אם כבר קיים, לא להדביק.

שדה ב-`WebService.cs` (אם עדיין לא קיים):

```csharp
RehabilitationOccupancyService _RehabilitationOccupancyService = new RehabilitationOccupancyService();
```

Chameleon `SystemUnits` column is **`Name`** — select as `su.Name AS DepartmentName` (not `su.DepartmentName`).

**Files:**

| File | Purpose |
|------|---------|
| `RehabilitationOccupancyService.cs` | **Deploy this** — full service + all DTOs + stubs (947 lines) |
| `WebService-Rehabilitation-EXISTING.cs` | **Reference only** — 1.3–1.7 (אם כבר קיים — לא להדביק) |
| `WebService-Rehabilitation-NEW-ONLY.cs` | **Paste this** — 10 WebMethods: 1.1, 1.2, 1.8, 2.1–2.8 |

## ⚠ CRITICAL — do NOT deploy the PATIENT_MONITORING / SystemUnits variant

A broken agent copy rewrote occupancy/admissions payer/targets to use `dbo.PATIENT_MONITORING` + `dbo.SystemUnits` (`PM_MOVE_DEPART_UNIT`, Hebrew `Pay_Institute` strings). **That breaks live APIs** (`d:[]` or wrong counts) even when SSMS queries on `Hospitalizations` return rows.

**Correct sources (as in `RehabilitationOccupancyService.cs`):**

Connection field: `connetionString` → **SRV-APPDB / NAMER** (IIS `ChameleonConnection` must match SSMS).

**NAMER schema split:** Chameleon clinical tables are accessed via linked server `[SRV-CP-DB-3].[Chameleon].[dbo].*` — **not** local `dbo.Hospitalizations` / `dbo.MedicalRecords` / `dbo.SystemUnits` / `dbo.Patients` (those do not exist in NAMER and cause *Invalid object name*). Local NAMER tables: `dbo.PATIENT_MONITORING`, `dbo.Invoices`, `dbo.Pay_Institute`.

Chameleon `Hospitalizations` columns: `Admission_No`, `Unit`, `Admission_Date`, `Release_Date`, `Hospital`, `Delete_Date`, `Patient` (not `HPID` / `Hosp_Date` / `Discharge_Date` / `CaseNumber`).

| Method | Source |
|--------|--------|
| `GetDailyOccupancy` | Chameleon `Hospitalizations` → `#Hosp` temp table + Chameleon `SystemUnits` |
| `GetAdmissionsByPayer` | Chameleon `Hospitalizations` + Chameleon `MedicalRecords.Pay_Institute` **codes 10,11,12,13,98** |
| `GetRecommendedTargets` | Same `#Hosp` / Chameleon `Hospitalizations` occupancy CTE |
| `GetAdmissionsByDirection` | `PATIENT_MONITORING` (ROW_NUMBER) + Chameleon `MedicalRecords` — **only** this method |
| `GetRevenueNet` | `dbo.Excel_QuarterlyIncome` (`NetIncomeTotal`) — **only** this method |

Verify before deploy:

```bash
grep 'SRV-CP-DB-3' docs/RehabilitationOccupancyService.cs          # Chameleon linked tables
grep 'dbo\.Hospitalizations' docs/RehabilitationOccupancyService.cs # must be empty
grep PATIENT_MONITORING docs/RehabilitationOccupancyService.cs       # direction + revenue only
grep 'Pay_Institute IN (10' docs/RehabilitationOccupancyService.cs
grep '#Hosp' docs/RehabilitationOccupancyService.cs
```

Do **not** keep `BACKEND-RehabilitationOccupancyService-missing.cs` — it was a duplicate stub.

---

## 0b. Runtime — duplicate `GetRehabilitationRevenueNet` WebMethods

**Symptom:** ASP.NET runtime error — two WebMethods named `GetRehabilitationRevenueNet`: one with `(string, string)` and one with `()`.

**Cause:** A parameterless `[WebMethod] GetRehabilitationRevenueNet()` was added alongside the dated overload. ASMX allows only one WebMethod per name.

**Fix in `WebService.cs`:**

1. **Delete** any `[WebMethod] GetRehabilitationRevenueNet()` **without parameters**.
2. **Keep only:** `GetRehabilitationRevenueNet(string FromDate, string ToDate)`.

In `RehabilitationOccupancyService.cs`, do **not** expose a public parameterless `GetRevenueNet()` — use only `GetRevenueNet(string fromDate, string toDate)`.

---

## 1. `N'...'` is SQL, not C# (CS1012 / CS0103)

**Broken (C# array initializer):**
```csharp
private static readonly string[] RehabDepartmentNames =
{
    N'המחלקה לגריאטריה שיקומית',
    N'מחלקת שיקום כללי',
};
```

**Fixed — unicode escapes in C# params (lines 164–175 pattern):**
```csharp
statusParam.Value = "\u05D0\u05D9\u05E9\u05D5\u05E8";
```

`N'...'` stays **inside SQL text** only (e.g. `@"... WHERE x = N'אישפוז' ..."`).

---

## 2. C# 6+ features → C# 5 (CS8026)

| Remove | Use instead |
|--------|-------------|
| `out var from, out var to` | `DateTime from; DateTime to;` then `ParseRange(..., out from, out to);` |
| `fromDate?.Trim()` | `fromDate == null ? null : fromDate.Trim()` |
| `nameof(fromDate)` | `"fromDate"` |
| `private string Conn => ...` | `private string connetionString;` + ctor |
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
    ParseRange(fromDate, toDate, out from, out to);
    cmd.Parameters.Add(DateParam("@FromDate", from));
    cmd.Parameters.Add(DateParam("@ToDate", to));
}
```

`ParseD` uses `DateTime.TryParseExact(..., "yyyy-MM-dd", ...)` and `new SqlParameter(name, SqlDbType.Date)`.

WebMethod signatures: `string FromDate, string ToDate` — not `DateTime`.
