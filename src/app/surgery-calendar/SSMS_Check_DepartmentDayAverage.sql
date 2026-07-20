/*
  SSMS – בדיקת DepartmentDayAverage ללוח ניתוחים
  ------------------------------------------------
  1. שנה את @FullDate ו-@SurRoomCode
  2. הרץ כל בלוק בנפרד (F5 על הבלוק המסומן)
*/

USE NAMER;
GO

DECLARE @FullDate date = '2026-07-20';           -- תאריך היום בלוח
DECLARE @SurRoomCode nvarchar(50) = N'חדר ניתוח כללי';  -- או: N'וירטואלי כללי'

-- ============================================================
-- 1) אילו חדרים שייכים לקבוצה?
-- ============================================================
SELECT
    srd.RoomGroupDesc,
    srd.SurgeryRoom
FROM NAMER.dbo.SurgeriesRoomDesc srd WITH (NOLOCK)
WHERE srd.RoomGroupDesc = @SurRoomCode
ORDER BY srd.SurgeryRoom;

-- ============================================================
-- 2) מה קורה היום בכל חדר? (DeptCnt = מספר מחלקות)
--     אם DeptCnt > 1 → DepartmentDayAverage יחזור 0 מה-API
-- ============================================================
;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        cal.SurgeryRoomDetails,
        cal.RequestedDepartmentDetails,
        dep.S_DEPARTMENT AS DepartmentName,
        TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) AS GrossPrice
    FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
    LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
        ON scs.SurgeryID = cal.SurgeryID
    LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK)
        ON v.LNRLS = cal.SurgeryID AND v.LEIST = 'OP_ANCHOR' AND v.STORN <> 'X'
    LEFT JOIN NAMER.dbo.V_NLEM dd WITH (NOLOCK)
        ON dd.FALNR = v.FALNR AND dd.PATNR = v.PATNR
       AND dd.IBGDT = CONVERT(date, cal.ArrivalDate) AND dd.LEIST LIKE 'DD%'
    LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK)
        ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))
    JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK)
        ON p.[קוד_השירות] = COALESCE(
            CASE WHEN v.InvoiceServiceCode IS NOT NULL AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0
                 THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) END,
            CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)), 3, 4) END,
            CASE WHEN v.PrintNote LIKE N'%קוד G%'
                 THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
            scm.NormalizedCode)
    LEFT JOIN NAMER.dbo.SurgeriesDepartments dep WITH (NOLOCK)
        ON dep.S_DEPARTMENT_CODE = cal.RequestedDepartmentDetails
    WHERE cal.ArrivalTime IS NOT NULL
      AND cal.SurgeryStatus <> 'Canceled'
      AND TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) > 0
      AND CONVERT(date, cal.ArrivalDate) = @FullDate
      AND cal.SurgeryRoomDetails IN (
          SELECT SurgeryRoom
          FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
          WHERE RoomGroupDesc = @SurRoomCode
      )
),
PerSurgery AS (
    SELECT
        Row_ID,
        WorkDate,
        SurgeryRoomDetails,
        RequestedDepartmentDetails,
        DepartmentName,
        MAX(GrossPrice) AS GrossPrice
    FROM Base
    GROUP BY Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails, DepartmentName
),
DayRoom AS (
    SELECT
        WorkDate,
        SurgeryRoomDetails,
        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt,
        MIN(RequestedDepartmentDetails) AS DepartmentCode,
        MIN(DepartmentName) AS DepartmentName,
        SUM(ISNULL(GrossPrice, 0)) AS DailyIncome
    FROM PerSurgery
    GROUP BY WorkDate, SurgeryRoomDetails
)
SELECT
    SurgeryRoomDetails AS SurgeryRoom,
    DeptCnt,
    DepartmentCode,
    DepartmentName,
    DailyIncome AS RoomGrossPriceTotal,
    CASE
        WHEN DeptCnt = 1 THEN N'ממוצע יוחזר (אם קיים בהיסטוריה)'
        ELSE N'ממוצע = 0 (יותר ממחלקה אחת היום)'
    END AS ApiDepartmentDayAverageNote
FROM DayRoom
ORDER BY SurgeryRoomDetails;

-- ============================================================
-- 3) פירוט מחלקות היום לחדר ספציפי (למשל פז01-204 / ור01-104)
-- ============================================================
DECLARE @CheckRoom nvarchar(50) = N'פז01-204';  -- שנה לפי הצורך

SELECT
    cal.SurgeryRoomDetails,
    cal.RequestedDepartmentDetails,
    dep.S_DEPARTMENT AS DepartmentName,
    COUNT(*) AS SurgeryCount,
    SUM(TRY_CONVERT(decimal(18, 2), p.[תעריף_ב])) AS RoughDailySum
FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
LEFT JOIN NAMER.dbo.SurgeriesDepartments dep WITH (NOLOCK)
    ON dep.S_DEPARTMENT_CODE = cal.RequestedDepartmentDetails
LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
    ON scs.SurgeryID = cal.SurgeryID
LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK)
    ON v.LNRLS = cal.SurgeryID AND v.LEIST = 'OP_ANCHOR' AND v.STORN <> 'X'
LEFT JOIN NAMER.dbo.V_NLEM dd WITH (NOLOCK)
    ON dd.FALNR = v.FALNR AND dd.PATNR = v.PATNR
   AND dd.IBGDT = CONVERT(date, cal.ArrivalDate) AND dd.LEIST LIKE 'DD%'
LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK)
    ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))
JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK)
    ON p.[קוד_השירות] = COALESCE(
        CASE WHEN v.InvoiceServiceCode IS NOT NULL AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0
             THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) END,
        CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)), 3, 4) END,
        CASE WHEN v.PrintNote LIKE N'%קוד G%'
             THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
        scm.NormalizedCode)
WHERE CONVERT(date, cal.ArrivalDate) = @FullDate
  AND cal.SurgeryRoomDetails = @CheckRoom
  AND cal.ArrivalTime IS NOT NULL
  AND cal.SurgeryStatus <> 'Canceled'
GROUP BY cal.SurgeryRoomDetails, cal.RequestedDepartmentDetails, dep.S_DEPARTMENT
ORDER BY SurgeryCount DESC;

-- ============================================================
-- 4) ממוצע היסטורי 6 חודשים (DepartmentAvg) – כמו ב-API
-- ============================================================
;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        cal.SurgeryRoomDetails,
        cal.RequestedDepartmentDetails,
        dep.S_DEPARTMENT AS DepartmentName,
        TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) AS GrossPrice
    FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
    LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
        ON scs.SurgeryID = cal.SurgeryID
    LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK)
        ON v.LNRLS = cal.SurgeryID AND v.LEIST = 'OP_ANCHOR' AND v.STORN <> 'X'
    LEFT JOIN NAMER.dbo.V_NLEM dd WITH (NOLOCK)
        ON dd.FALNR = v.FALNR AND dd.PATNR = v.PATNR
       AND dd.IBGDT = CONVERT(date, cal.ArrivalDate) AND dd.LEIST LIKE 'DD%'
    LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK)
        ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))
    JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK)
        ON p.[קוד_השירות] = COALESCE(
            CASE WHEN v.InvoiceServiceCode IS NOT NULL AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0
                 THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) END,
            CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)), 3, 4) END,
            CASE WHEN v.PrintNote LIKE N'%קוד G%'
                 THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
            scm.NormalizedCode)
    LEFT JOIN NAMER.dbo.SurgeriesDepartments dep WITH (NOLOCK)
        ON dep.S_DEPARTMENT_CODE = cal.RequestedDepartmentDetails
    WHERE cal.ArrivalTime IS NOT NULL
      AND cal.SurgeryStatus <> 'Canceled'
      AND TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) > 0
      AND CONVERT(date, cal.ArrivalDate) >= DATEADD(MONTH, -6, @FullDate)
      AND CONVERT(date, cal.ArrivalDate) < @FullDate
      AND cal.SurgeryRoomDetails IN (
          SELECT SurgeryRoom
          FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
          WHERE RoomGroupDesc = @SurRoomCode
      )
),
PerSurgery AS (
    SELECT
        Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails, DepartmentName,
        MAX(GrossPrice) AS GrossPrice
    FROM Base
    GROUP BY Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails, DepartmentName
),
DayRoom AS (
    SELECT
        WorkDate,
        SurgeryRoomDetails,
        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt,
        MIN(RequestedDepartmentDetails) AS DepartmentCode,
        MIN(DepartmentName) AS DepartmentName,
        SUM(ISNULL(GrossPrice, 0)) AS DailyIncome
    FROM PerSurgery
    GROUP BY WorkDate, SurgeryRoomDetails
),
DepartmentAvg AS (
    SELECT
        SurgeryRoomDetails,
        DepartmentCode,
        MIN(DepartmentName) AS DepartmentName,
        CAST(AVG(DailyIncome) AS decimal(18, 0)) AS DepartmentDayAverage,
        COUNT(*) AS HistoryDays
    FROM DayRoom
    WHERE DeptCnt = 1
    GROUP BY SurgeryRoomDetails, DepartmentCode
)
SELECT *
FROM DepartmentAvg
WHERE (@CheckRoom IS NULL OR SurgeryRoomDetails = @CheckRoom)
ORDER BY SurgeryRoomDetails, DepartmentDayAverage DESC;

-- ============================================================
-- 5) תוצאה סופית – בדיוק כמו GetSurgeriesRoomPricesBySurgeryRoomCode
-- ============================================================
;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        cal.SurgeryRoomDetails,
        cal.RequestedDepartmentDetails,
        TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) AS GrossPrice
    FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
    LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK)
        ON scs.SurgeryID = cal.SurgeryID
    LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK)
        ON v.LNRLS = cal.SurgeryID AND v.LEIST = 'OP_ANCHOR' AND v.STORN <> 'X'
    LEFT JOIN NAMER.dbo.V_NLEM dd WITH (NOLOCK)
        ON dd.FALNR = v.FALNR AND dd.PATNR = v.PATNR
       AND dd.IBGDT = CONVERT(date, cal.ArrivalDate) AND dd.LEIST LIKE 'DD%'
    LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK)
        ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))
    JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK)
        ON p.[קוד_השירות] = COALESCE(
            CASE WHEN v.InvoiceServiceCode IS NOT NULL AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0
                 THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) END,
            CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)), 3, 4) END,
            CASE WHEN v.PrintNote LIKE N'%קוד G%'
                 THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
            scm.NormalizedCode)
    WHERE cal.ArrivalTime IS NOT NULL
      AND cal.SurgeryStatus <> 'Canceled'
      AND TRY_CONVERT(decimal(18, 2), p.[תעריף_ב]) > 0
      AND CONVERT(date, cal.ArrivalDate) >= DATEADD(MONTH, -6, @FullDate)
      AND CONVERT(date, cal.ArrivalDate) <= @FullDate
      AND cal.SurgeryRoomDetails IN (
          SELECT SurgeryRoom
          FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK)
          WHERE RoomGroupDesc = @SurRoomCode
      )
),
PerSurgery AS (
    SELECT Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails, MAX(GrossPrice) AS GrossPrice
    FROM Base
    GROUP BY Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails
),
DayRoom AS (
    SELECT
        WorkDate,
        SurgeryRoomDetails,
        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt,
        MIN(RequestedDepartmentDetails) AS DepartmentCode,
        SUM(ISNULL(GrossPrice, 0)) AS DailyIncome
    FROM PerSurgery
    GROUP BY WorkDate, SurgeryRoomDetails
),
CurrentDay AS (
    SELECT SurgeryRoomDetails, DeptCnt, DepartmentCode, DailyIncome AS RoomGrossPriceTotal
    FROM DayRoom
    WHERE WorkDate = @FullDate
),
DepartmentAvg AS (
    SELECT
        SurgeryRoomDetails,
        DepartmentCode,
        CAST(AVG(DailyIncome) AS decimal(18, 0)) AS DepartmentDayAverage
    FROM DayRoom
    WHERE WorkDate < @FullDate AND DeptCnt = 1
    GROUP BY SurgeryRoomDetails, DepartmentCode
)
SELECT
    c.SurgeryRoomDetails AS SurgeryRoom,
    c.DeptCnt,
    c.DepartmentCode,
    CAST(c.RoomGrossPriceTotal AS decimal(18, 0)) AS RoomGrossPriceTotal,
    d.DepartmentDayAverage AS HistoricalDepartmentDayAverage,
    CASE
        WHEN c.DeptCnt = 1 AND c.RoomGrossPriceTotal > 0
            THEN ISNULL(d.DepartmentDayAverage, 0)
        ELSE 0
    END AS DepartmentDayAverage_ApiResult
FROM CurrentDay c
LEFT JOIN DepartmentAvg d
    ON d.SurgeryRoomDetails = c.SurgeryRoomDetails
   AND d.DepartmentCode = c.DepartmentCode
ORDER BY c.SurgeryRoomDetails;

-- ============================================================
-- 6) השוואת וירטואלי מול פיזי (ור 01-104 ↔ פז 01-204)
-- ============================================================
SELECT
    v.SurgeryRoom AS VirtualRoom,
    REPLACE(v.SurgeryRoom, N'ור', N'פז') AS NaiveMappedPhysical,
    CASE
        WHEN v.SurgeryRoom LIKE N'ור%-1%'
            THEN STUFF(v.SurgeryRoom, PATINDEX(N'%-1%', v.SurgeryRoom), 2, N'-2')
        ELSE REPLACE(v.SurgeryRoom, N'ור', N'פז')
    END AS SuggestedPhysicalRoom
FROM NAMER.dbo.SurgeriesRoomDesc v WITH (NOLOCK)
WHERE v.RoomGroupDesc = N'וירטואלי כללי'
ORDER BY v.SurgeryRoom;
