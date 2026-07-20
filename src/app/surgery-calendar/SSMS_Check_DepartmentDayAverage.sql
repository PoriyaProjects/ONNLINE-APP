/*
  SSMS – בדיקת DepartmentDayAverage ללוח ניתוחים
  ------------------------------------------------
  1. שנה את @FullDate, @SurRoomCode, @CheckRoom
  2. הרץ כל בלוק בנפרד (F5 על הבלוק המסומן)
*/

USE NAMER;
GO

DECLARE @FullDate date = '2026-07-20';
DECLARE @SurRoomCode nvarchar(50) = N'חדר ניתוח כללי';  -- או: N'וירטואלי כללי'
DECLARE @CheckRoom nvarchar(50) = N'פז01-204';

-- ============================================================
-- 1) אילו חדרים שייכים לקבוצה?
-- ============================================================
SELECT
    srd.RoomGroupDesc,
    LTRIM(RTRIM(srd.SurgeryRoom)) AS SurgeryRoom
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
        LTRIM(RTRIM(cal.SurgeryRoomDetails)) AS SurgeryRoomDetails,
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
      AND CONVERT(date, cal.ArrivalDate) = @FullDate
      AND LTRIM(RTRIM(cal.SurgeryRoomDetails)) IN (
          SELECT LTRIM(RTRIM(SurgeryRoom))
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
        MAX(GrossPrice) AS GrossPrice
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
)
SELECT
    SurgeryRoomDetails AS SurgeryRoom,
    DeptCnt,
    DepartmentCode,
    DailyIncome AS RoomGrossPriceTotal,
    CASE
        WHEN DeptCnt = 1 THEN N'ממוצע יוחזר (אם קיים בהיסטוריה)'
        ELSE N'ממוצע = 0 (יותר ממחלקה אחת היום)'
    END AS ApiDepartmentDayAverageNote
FROM DayRoom
ORDER BY SurgeryRoomDetails;

-- ============================================================
-- 3) פירוט מחלקות היום לחדר ספציפי
-- ============================================================
SELECT
    LTRIM(RTRIM(cal.SurgeryRoomDetails)) AS SurgeryRoom,
    cal.RequestedDepartmentDetails AS DepartmentCode,
    COUNT(*) AS SurgeryCount
FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK)
WHERE CONVERT(date, cal.ArrivalDate) = @FullDate
  AND LTRIM(RTRIM(cal.SurgeryRoomDetails)) = LTRIM(RTRIM(@CheckRoom))
  AND cal.ArrivalTime IS NOT NULL
  AND cal.SurgeryStatus <> 'Canceled'
GROUP BY LTRIM(RTRIM(cal.SurgeryRoomDetails)), cal.RequestedDepartmentDetails
ORDER BY SurgeryCount DESC;

-- ============================================================
-- 4) ממוצע היסטורי 6 חודשים (DepartmentAvg)
-- ============================================================
;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        LTRIM(RTRIM(cal.SurgeryRoomDetails)) AS SurgeryRoomDetails,
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
      AND CONVERT(date, cal.ArrivalDate) < @FullDate
      AND LTRIM(RTRIM(cal.SurgeryRoomDetails)) IN (
          SELECT LTRIM(RTRIM(SurgeryRoom))
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
DepartmentAvg AS (
    SELECT
        SurgeryRoomDetails,
        DepartmentCode,
        CAST(AVG(DailyIncome) AS decimal(18, 0)) AS DepartmentDayAverage,
        COUNT(*) AS HistoryDays
    FROM DayRoom
    WHERE DeptCnt = 1
    GROUP BY SurgeryRoomDetails, DepartmentCode
)
SELECT *
FROM DepartmentAvg
WHERE LTRIM(RTRIM(SurgeryRoomDetails)) = LTRIM(RTRIM(@CheckRoom))
ORDER BY DepartmentDayAverage DESC;

-- ============================================================
-- 5) תוצאה סופית – בדיוק כמו GetSurgeriesRoomPricesBySurgeryRoomCode
-- ============================================================
;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        LTRIM(RTRIM(cal.SurgeryRoomDetails)) AS SurgeryRoomDetails,
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
      AND LTRIM(RTRIM(cal.SurgeryRoomDetails)) IN (
          SELECT LTRIM(RTRIM(SurgeryRoom))
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
-- 6) מיפוי וירטואלי → פיזי (הנכון: ור01-104 → פז01-204)
-- ============================================================
SELECT
    LTRIM(RTRIM(v.SurgeryRoom)) AS VirtualRoom,
    REPLACE(LTRIM(RTRIM(v.SurgeryRoom)), N'ור', N'פז') AS NaiveMappedPhysical_WRONG,
    REPLACE(REPLACE(LTRIM(RTRIM(v.SurgeryRoom)), N'ור', N'פז'), N'-1', N'-2') AS PairedPhysicalRoom_CORRECT
FROM NAMER.dbo.SurgeriesRoomDesc v WITH (NOLOCK)
WHERE v.RoomGroupDesc = N'וירטואלי כללי'
ORDER BY v.SurgeryRoom;

-- ============================================================
-- 7) מה הוירטואלי אמור להציג? ממוצע מהחדר הפיזי המקביל
--     דוגמה: ור01-104 → פז01-204 → 56085
-- ============================================================
DECLARE @VirtualRoom nvarchar(50) = N'ור01-104';
DECLARE @PairedPhysicalRoom nvarchar(50) =
    REPLACE(REPLACE(LTRIM(RTRIM(@VirtualRoom)), N'ור', N'פז'), N'-1', N'-2');

;WITH Base AS (
    SELECT
        cal.Row_ID,
        CONVERT(date, cal.ArrivalDate) AS WorkDate,
        LTRIM(RTRIM(cal.SurgeryRoomDetails)) AS SurgeryRoomDetails,
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
      AND LTRIM(RTRIM(cal.SurgeryRoomDetails)) = LTRIM(RTRIM(@PairedPhysicalRoom))
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
    @VirtualRoom AS VirtualRoom,
    @PairedPhysicalRoom AS PairedPhysicalRoom,
    c.SurgeryRoomDetails AS PhysicalSurgeryRoom,
    c.DeptCnt AS PhysicalDeptCntToday,
    c.DepartmentCode AS PhysicalDepartmentToday,
    CAST(c.RoomGrossPriceTotal AS decimal(18, 0)) AS PhysicalRoomGrossPriceToday,
    d.DepartmentDayAverage AS HistoricalDepartmentDayAverage,
    CASE
        WHEN c.DeptCnt = 1 AND c.RoomGrossPriceTotal > 0
            THEN ISNULL(d.DepartmentDayAverage, 0)
        ELSE 0
    END AS ExpectedVirtualBenchmark
FROM CurrentDay c
LEFT JOIN DepartmentAvg d
    ON d.SurgeryRoomDetails = c.SurgeryRoomDetails
   AND d.DepartmentCode = c.DepartmentCode;
