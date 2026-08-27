# Backend compile fixes — RehabilitationOccupancyService + WebService.cs

Deliverable: **`RehabilitationOccupancyService.cs`** (single file, C# 5 / App_Code) — copy to `App_Code/RehabilitationOccupancyService.cs`.

---

## 0. WebService.cs — CS0111 duplicates + CS0246 / CS1061 cascade

**Symptoms after pasting full `WebService-Rehabilitation-endpoints.cs`:**

| Error | Cause |
|-------|-------|
| CS0111 | `GetRehabilitationOccupancy`, `GetRehabilitationAdmissionsByPayer`, `GetRehabilitationAdmissionsByDirection`, `GetRehabilitationRecommendedTargets` defined twice (~6844 **and** ~6945–6989) |
| CS0246 | Missing DTOs: `RehabilitationHospitalizationDays`, `RehabilitationAvgLengthOfStay`, `DayRehab*` |
| CS1061 | `RehabilitationOccupancyService` missing `GetHospitalizationDays`, `GetAvgLengthOfStay`, `GetDayRehab*` |

**Fix (3 steps) — single-file deploy:**

1. **Delete duplicate WebMethods** at lines **6945–6989** in `WebService.cs`. Keep the original block at **~6844** (1.3–1.7).
2. Copy **`RehabilitationOccupancyService.cs`** from `docs/` to **`App_Code/RehabilitationOccupancyService.cs`** (full replace). One file contains: `RehabHebrew`, all DTOs, SQL methods 1.3–1.7 + `GetTreatments` stub, plus stub DTOs/methods for 1.1–1.2 and 2.1–2.8. Connection: `connetionString` with `ChameleonConnection` fallback → SRV-APPDB/NAMER. SQL uses `dbo.Hospitalizations` (not Chameleon linked server).
3. **Paste only the 11 NEW WebMethods** from `WebService-Rehabilitation-NEW-ONLY.cs` (or SECTION B of `WebService-Rehabilitation-endpoints.cs`) **after** the existing ~6844 block. Do **not** re-paste 1.3–1.7.

Optional field in `WebService.cs` (instead of `new` per call):

```csharp
private RehabilitationOccupancyService _RehabilitationOccupancyService = new RehabilitationOccupancyService();
```

**Files:**

| File | Purpose |
|------|---------|
| `RehabilitationOccupancyService.cs` | **Deploy this** — full service + all DTOs + stubs (947 lines) |
| `Rehabilitation-Stubs-ADD.cs` | **Deprecated** — do not deploy; use full file above |
| `WebService-Rehabilitation-NEW-ONLY.cs` | 11 new WebMethods only — paste into WebService.cs |
| `WebService-Rehabilitation-endpoints.cs` | SECTION A (reference) + SECTION B (new) |

## ⚠ CRITICAL — do NOT deploy the PATIENT_MONITORING / SystemUnits variant

A broken agent copy rewrote occupancy/admissions payer/targets to use `dbo.PATIENT_MONITORING` + `dbo.SystemUnits` (`PM_MOVE_DEPART_UNIT`, Hebrew `Pay_Institute` strings). **That breaks live APIs** (`d:[]` or wrong counts) even when SSMS queries on `Hospitalizations` return rows.

**Correct sources (as in `RehabilitationOccupancyService.cs`):**

| Method | Source |
|--------|--------|
| `GetDailyOccupancy` | `Hospitalizations` → `#Hosp` temp table + `SystemUnits` |
| `GetAdmissionsByPayer` | `Hospitalizations` + `MedicalRecords.Pay_Institute` **codes 10,11,12,13,98** |
| `GetRecommendedTargets` | Same `#Hosp` / `Hospitalizations` occupancy CTE |
| `GetAdmissionsByDirection` | `PATIENT_MONITORING` (ROW_NUMBER) + `MedicalRecords` — **only** this method |
| `GetRevenueNet` | `Invoices.Price` + `CaseNumber` + `PATIENT_MONITORING.PM_MOVE_DEPART` — **only** this method |

Connection field: `connetionString` → **SRV-APPDB / NAMER** (IIS `ChameleonConnection` must match SSMS).

Verify before deploy:

```bash
grep Hospitalizations docs/RehabilitationOccupancyService.cs   # occupancy, payer, targets
grep PATIENT_MONITORING docs/RehabilitationOccupancyService.cs # direction + revenue only
grep 'Pay_Institute IN (10' docs/RehabilitationOccupancyService.cs
grep '#Hosp' docs/RehabilitationOccupancyService.cs
```

Do **not** keep `BACKEND-RehabilitationOccupancyService-missing.cs` — it was a duplicate stub.

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
