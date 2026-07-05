# Backend — `GetSurgeriesRoomPricesBySurgeryRoomCode`

> **קובץ מוכן להדבקה:** `GetSurgeriesRoomPricesBySurgeryRoomCode.FULL.cs` — פונקציה מלאה + שינוי מודל.

## Root cause

The current SQL sums all procedure catalog prices per surgery:

```sql
ISNULL(SUM(TRY_CONVERT(decimal(18,2), p.[תעריף_ב])), 0) AS GrossPrice
...
GROUP BY cal.Row_ID
```

When a surgery has **two procedures** at ~50,000 ₪ each, the API returns **100,000 ₪**.
Business rule: **one billed service per surgery slot = MAX(catalog prices), not SUM**.

The room summary query (`summaryString`) has the same issue: `Base` emits one row per procedure, then `DayRoom` sums them.

---

## Fix 1 — Surgery billing price (`pricesString`)

Replace `SUM` with `MAX`:

```sql
SELECT
    cal.Row_ID,
    ISNULL(MAX(TRY_CONVERT(decimal(18,2), p.[תעריף_ב])), 0) AS GrossPrice,
    MAX(CASE
        WHEN v.InvoiceServiceCode IS NULL OR LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) = 0 THEN 1
        ELSE 0
    END) AS IsEstimated
FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
    ON scs.SurgeryID = cal.SurgeryID
LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK)
    ON v.LNRLS = cal.SurgeryID
   AND v.LEIST = 'OP_ANCHOR'
   AND v.STORN <> 'X'
   AND v.InvoiceServiceCode IS NOT NULL
   AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0
LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK)
    ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))
JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK)
    ON p.[קוד_השירות] = COALESCE(
        CASE WHEN v.InvoiceServiceCode IS NOT NULL
             THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5)
        END,
        scm.NormalizedCode)
WHERE cal.ArrivalDate = @FullDate
  AND cal.ArrivalTime IS NOT NULL
  AND cal.SurgeryStatus <> 'Canceled'
  AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0
  AND cal.SurgeryRoomDetails IN (
      SELECT SurgeryRoom
      FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
      WHERE RoomGroupDesc = @SurRoomCode)
GROUP BY cal.Row_ID;
```

> Use parameters (`@FullDate`, `@SurRoomCode`) instead of string concatenation.

---

## Fix 2 — Per-procedure catalog prices (for UI table)

Add a second list to `SurgeriesRoomDayClass`:

```csharp
public List<SurgeryPriceItem> SurgeryProcedurePrices { get; set; }
```

`SurgeryPriceItem.Row_ID` = `SurgeriesCalendar_Surgeries.Row_ID` (procedure row, not calendar row).

```sql
SELECT
    scs.Row_ID,
    cal.Row_ID AS CalendarRow_ID,
    ISNULL(TRY_CONVERT(decimal(18,2), p.[תעריף_ב]), 0) AS GrossPrice,
    CASE
        WHEN v.InvoiceServiceCode IS NULL OR LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) = 0 THEN 1
        ELSE 0
    END AS IsEstimated
FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
INNER JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
    ON scs.SurgeryID = cal.SurgeryID
-- same JOINs to v, scm, p as pricesString
WHERE cal.ArrivalDate = @FullDate
  AND cal.ArrivalTime IS NOT NULL
  AND cal.SurgeryStatus <> 'Canceled'
  AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0
  AND cal.SurgeryRoomDetails IN (
      SELECT SurgeryRoom
      FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
      WHERE RoomGroupDesc = @SurRoomCode);
```

No `GROUP BY` — one row per procedure.

---

## Fix 3 — Room daily summary (`summaryString`)

Aggregate **MAX per surgery** before summing room totals:

```sql
;WITH ProcedurePrices AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        cal.SurgeryRoomDetails,
        cal.RequestedDepartmentDetails,
        TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) AS GrossPrice
    FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
    LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
        ON scs.SurgeryID = cal.SurgeryID
    -- same JOINs ...
    WHERE cal.ArrivalTime IS NOT NULL
      AND cal.SurgeryStatus <> 'Canceled'
      AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0
      AND CONVERT(date, cal.ArrivalDate) >= DATEADD(MONTH, -6, @FullDate)
      AND CONVERT(date, cal.ArrivalDate) <= @FullDate
      AND cal.SurgeryRoomDetails IN (
          SELECT SurgeryRoom
          FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
          WHERE RoomGroupDesc = @SurRoomCode)
),
SurgeryBilling AS (
    SELECT
        Row_ID,
        WorkDate,
        SurgeryRoomDetails,
        RequestedDepartmentDetails,
        MAX(GrossPrice) AS GrossPrice
    FROM ProcedurePrices
    GROUP BY Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails
),
DayRoom AS (
    SELECT
        WorkDate,
        SurgeryRoomDetails,
        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt,
        MIN(RequestedDepartmentDetails) AS DepartmentCode,
        SUM(GrossPrice) AS DailyIncome
    FROM SurgeryBilling
    GROUP BY WorkDate, SurgeryRoomDetails
)
-- CurrentDay / DepartmentAvg unchanged, but read from SurgeryBilling logic
```

---

## Expected result

| Scenario | Before (SUM) | After (MAX) |
|----------|--------------|-------------|
| 2 procedures × 50,000 ₪ | 100,000 ₪ billed | 50,000 ₪ billed |
| Procedure table row 1 | 100,000 ₪ (inherited) | 50,000 ₪ |
| Procedure table row 2 | 100,000 ₪ (inherited) | 50,000 ₪ |
| Room daily total (2 such surgeries) | 200,000 ₪ | 100,000 ₪ |

---

## Frontend (already prepared)

`surgeries-management.component.ts` reads:

- `SurgeryPrices` → `cal.Row_ID` (billing price per surgery slot)
- `SurgeryProcedurePrices` → `scs.Row_ID` (catalog price per procedure row)

After deploying backend Fix 1 + Fix 2, refresh the calendar board.
