/*
================================================================================
  דשבורד שיקום — בלוק 1 (אשפוז) — כל ה-APIs ל-SSMS
  WebService.asmx methods: GetRehabilitation*
================================================================================
  הרצה: SSMS על NAMER (ChameleonConnection → SRV-APPDB)
  Chameleon: [SRV-CP-DB-3].[Chameleon].[dbo].*
  Local:     dbo.PATIENT_MONITORING, dbo.Invoices

  תאריכים = כמו דשבורד חודשי (שנת YYYY עד היום):
    FromDate = 01/01/YYYY
    ToDate   = היום (שנה נוכחית) או 31/12/YYYY (שנים קודמות)

  שנה לדוגמה — שנהריץ הכל חודשי 2026:
*/
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE
    WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date)
    ELSE DATEFROMPARTS(@Year, 12, 31)
END;

-- פרמטרים משותפים (כמו ב-C# AddPayerCategoryParams / AddDirectionParams)
DECLARE @CatKupatCholim nvarchar(50) = N'קופת חולים';
DECLARE @CatTzahalDefense nvarchar(50) = N'צה״ל + משרד הביטחון';
DECLARE @CatOther nvarchar(50) = N'אחר';
DECLARE @PayerUnassigned nvarchar(50) = N'טרם שויך';
DECLARE @PayClalit nvarchar(50) = N'כללית';
DECLARE @PayMaccabi nvarchar(50) = N'מכבי';
DECLARE @PayLeumit nvarchar(50) = N'לאומית';
DECLARE @PayMeuhedet nvarchar(50) = N'מאוחדת';
DECLARE @PayPrivate nvarchar(50) = N'פרטי';
DECLARE @MoveRangeHospital nvarchar(50) = N'אישפוז';
DECLARE @DirectionInternal nvarchar(50) = N'פנים';
DECLARE @DirectionExternal nvarchar(50) = N'חוץ';

PRINT '=== Block 1 monthly range ===';
PRINT '@FromDate = ' + CONVERT(varchar(10), @FromDate, 120);
PRINT '@ToDate   = ' + CONVERT(varchar(10), @ToDate, 120);
PRINT '';

/* =============================================================================
   1.3  GetRehabilitationOccupancy  →  GetDailyOccupancy
   שורה לכל: תאריך × מחלקה (10 units שיקום)
   ============================================================================= */
PRINT '--- 1.3 GetRehabilitationOccupancy (daily rows) ---';

IF OBJECT_ID('tempdb..#Hosp_13') IS NOT NULL DROP TABLE #Hosp_13;

SELECT
    h.Admission_No,
    h.Unit,
    CAST(h.Admission_Date AS date) AS HospDate,
    CAST(h.Release_Date AS date) AS ReleaseDate
INTO #Hosp_13
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND CAST(h.Admission_Date AS date) <= @ToDate
  AND (h.Release_Date IS NULL OR CAST(h.Release_Date AS date) > @FromDate)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH Dates AS (
    SELECT CAST(@FromDate AS date) AS OccupancyDate
    UNION ALL
    SELECT DATEADD(day, 1, OccupancyDate)
    FROM Dates
    WHERE OccupancyDate < CAST(@ToDate AS date)
),
RehabilitationUnits AS (
    SELECT su.Unit, su.Name
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits] su WITH (NOLOCK)
    WHERE su.Hospital = 34
      AND su.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
)
SELECT
    d.OccupancyDate AS [Date],
    u.Unit,
    u.Name AS DepartmentName,
    COUNT(DISTINCT h.Admission_No) AS OccupiedPatients
FROM Dates d
CROSS JOIN RehabilitationUnits u
LEFT JOIN #Hosp_13 h
    ON h.Unit = u.Unit
   AND h.HospDate <= d.OccupancyDate
   AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.OccupancyDate)
GROUP BY d.OccupancyDate, u.Unit, u.Name
ORDER BY d.OccupancyDate, u.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp_13;

GO

/* =============================================================================
   1.4  GetRehabilitationAdmissionsByPayer  →  GetAdmissionsByPayer
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;
DECLARE @CatKupatCholim nvarchar(50) = N'קופת חולים';
DECLARE @CatTzahalDefense nvarchar(50) = N'צה״ל + משרד הביטחון';
DECLARE @CatOther nvarchar(50) = N'אחר';
DECLARE @PayerUnassigned nvarchar(50) = N'טרם שויך';
DECLARE @PayClalit nvarchar(50) = N'כללית';
DECLARE @PayMaccabi nvarchar(50) = N'מכבי';
DECLARE @PayLeumit nvarchar(50) = N'לאומית';
DECLARE @PayMeuhedet nvarchar(50) = N'מאוחדת';

PRINT '--- 1.4 GetRehabilitationAdmissionsByPayer (daily rows) ---';

IF OBJECT_ID('tempdb..#Adm_14') IS NOT NULL DROP TABLE #Adm_14;
IF OBJECT_ID('tempdb..#Units_14') IS NOT NULL DROP TABLE #Units_14;

SELECT
    CAST(h.Admission_Date AS date) AS AdmissionDate,
    h.Unit,
    h.Admission_No,
    ROW_NUMBER() OVER (PARTITION BY h.Admission_No ORDER BY h.Admission_Date) AS rn
INTO #Adm_14
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
  AND CAST(h.Admission_Date AS date) BETWEEN @FromDate AND @ToDate;

SELECT su.Unit, su.Name
INTO #Units_14
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits] su WITH (NOLOCK)
WHERE su.Hospital = 34
  AND su.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873);

SELECT
    fa.AdmissionDate AS [Date],
    CASE
        WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim
        WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense
        ELSE @CatOther
    END AS PayerCategory,
    CASE
        WHEN payer.Pay_Institute = 10 THEN @PayClalit
        WHEN payer.Pay_Institute = 11 THEN @PayMaccabi
        WHEN payer.Pay_Institute = 12 THEN @PayLeumit
        WHEN payer.Pay_Institute = 13 THEN @PayMeuhedet
        ELSE @PayerUnassigned
    END AS PayerName,
    COUNT(*) AS AdmissionsCount,
    fa.Unit,
    u.Name AS DepartmentName
FROM (
    SELECT AdmissionDate, Unit, Admission_No
    FROM #Adm_14
    WHERE rn = 1
) fa
INNER JOIN #Units_14 u ON fa.Unit = u.Unit
OUTER APPLY (
    SELECT TOP 1 mr.Pay_Institute
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
      AND mr.Admission_No = fa.Admission_No
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    fa.AdmissionDate, fa.Unit, u.Name,
    CASE WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense ELSE @CatOther END,
    CASE WHEN payer.Pay_Institute = 10 THEN @PayClalit WHEN payer.Pay_Institute = 11 THEN @PayMaccabi WHEN payer.Pay_Institute = 12 THEN @PayLeumit WHEN payer.Pay_Institute = 13 THEN @PayMeuhedet ELSE @PayerUnassigned END
ORDER BY [Date], fa.Unit, PayerCategory, PayerName;

PRINT '--- 1.4 MONTHLY SUMMARY (stacked chart: kupot / tzahal / other) ---';
SELECT
    DATEFROMPARTS(YEAR(fa.AdmissionDate), MONTH(fa.AdmissionDate), 1) AS MonthDate,
    CASE
        WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim
        WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense
        ELSE @CatOther
    END AS PayerCategory,
    COUNT(*) AS AdmissionsCount
FROM (
    SELECT AdmissionDate, Unit, Admission_No
    FROM #Adm_14
    WHERE rn = 1
) fa
OUTER APPLY (
    SELECT TOP 1 mr.Pay_Institute
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
      AND mr.Admission_No = fa.Admission_No
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    DATEFROMPARTS(YEAR(fa.AdmissionDate), MONTH(fa.AdmissionDate), 1),
    CASE WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense ELSE @CatOther END
ORDER BY MonthDate, PayerCategory;

DROP TABLE #Adm_14;
DROP TABLE #Units_14;

GO

/* =============================================================================
   1.5  GetRehabilitationAdmissionsByDirection  →  GetAdmissionsByDirection
   מקור: PATIENT_MONITORING (לא Hospitalizations!)
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;
DECLARE @CatKupatCholim nvarchar(50) = N'קופת חולים';
DECLARE @CatTzahalDefense nvarchar(50) = N'צה״ל + משרד הביטחון';
DECLARE @CatOther nvarchar(50) = N'אחר';
DECLARE @PayPrivate nvarchar(50) = N'פרטי';
DECLARE @MoveRangeHospital nvarchar(50) = N'אישפוז';
DECLARE @DirectionInternal nvarchar(50) = N'פנים';
DECLARE @DirectionExternal nvarchar(50) = N'חוץ';

PRINT '--- 1.5 GetRehabilitationAdmissionsByDirection (daily rows) ---';

;WITH Admissions AS (
    SELECT
        CAST(pm.PM_MOVE_DATE AS date) AS AdmissionDate,
        LTRIM(RTRIM(pm.PM_CASE_NUMBER)) AS CaseNumber,
        LTRIM(RTRIM(pm.PM_MOVE_DEPART)) AS DepartmentCode,
        LTRIM(RTRIM(pm.PM_MOVE_RANGE)) AS Source,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(pm.PM_CASE_NUMBER))
            ORDER BY pm.PM_MOVE_DATE, pm.PM_MOVE_TIME
        ) AS rn
    FROM dbo.PATIENT_MONITORING pm WITH (NOLOCK)
    WHERE pm.PM_MOVE_DATE >= @FromDate
      AND pm.PM_MOVE_DATE < DATEADD(DAY, 1, @ToDate)
      AND LTRIM(RTRIM(pm.PM_MOVE_DEPART)) IN (N'רשיקום-י', N'רשיקום-כ', N'רגרי-ש')
      AND LTRIM(RTRIM(pm.PM_MOVE_CAT)) = '1'
      AND LTRIM(RTRIM(pm.PM_MOVE_TYPE)) = '01'
),
FirstAdmissions AS (
    SELECT AdmissionDate, CaseNumber, DepartmentCode, Source
    FROM Admissions
    WHERE rn = 1
)
SELECT
    a.AdmissionDate AS [Date],
    CASE a.DepartmentCode
        WHEN N'רשיקום-י' THEN 49
        WHEN N'רגרי-ש' THEN 85
        WHEN N'רשיקום-כ' THEN 150685851
    END AS Unit,
    CASE a.DepartmentCode
        WHEN N'רשיקום-י' THEN N'מחלקת שיקום ילדים'
        WHEN N'רגרי-ש' THEN N'המחלקה לגריאטריה שיקומית'
        WHEN N'רשיקום-כ' THEN N'מחלקת שיקום כללי'
    END AS DepartmentName,
    CASE
        WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim
        WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense
        WHEN payer.Pay_Institute = 99 THEN @PayPrivate
        ELSE @CatOther
    END AS FunderName,
    CASE
        WHEN LTRIM(RTRIM(a.Source)) = @MoveRangeHospital THEN @DirectionInternal
        ELSE @DirectionExternal
    END AS Direction,
    COUNT(*) AS AdmissionsCount
FROM FirstAdmissions a
OUTER APPLY (
    SELECT TOP 1 mr.Pay_Institute
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
      AND TRY_CONVERT(BIGINT, mr.Admission_No) = TRY_CONVERT(BIGINT, a.CaseNumber)
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    a.AdmissionDate, a.DepartmentCode, a.Source, payer.Pay_Institute
ORDER BY a.AdmissionDate, Unit;

PRINT '--- 1.5 MONTHLY SUMMARY ---';
;WITH Admissions AS (
    SELECT
        CAST(pm.PM_MOVE_DATE AS date) AS AdmissionDate,
        LTRIM(RTRIM(pm.PM_CASE_NUMBER)) AS CaseNumber,
        LTRIM(RTRIM(pm.PM_MOVE_RANGE)) AS Source,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(pm.PM_CASE_NUMBER))
            ORDER BY pm.PM_MOVE_DATE, pm.PM_MOVE_TIME
        ) AS rn
    FROM dbo.PATIENT_MONITORING pm WITH (NOLOCK)
    WHERE pm.PM_MOVE_DATE >= @FromDate
      AND pm.PM_MOVE_DATE < DATEADD(DAY, 1, @ToDate)
      AND LTRIM(RTRIM(pm.PM_MOVE_DEPART)) IN (N'רשיקום-י', N'רשיקום-כ', N'רגרי-ש')
      AND LTRIM(RTRIM(pm.PM_MOVE_CAT)) = '1'
      AND LTRIM(RTRIM(pm.PM_MOVE_TYPE)) = '01'
),
FirstAdmissions AS (
    SELECT AdmissionDate, Source FROM Admissions WHERE rn = 1
)
SELECT
    DATEFROMPARTS(YEAR(AdmissionDate), MONTH(AdmissionDate), 1) AS MonthDate,
    CASE WHEN LTRIM(RTRIM(Source)) = @MoveRangeHospital THEN @DirectionInternal ELSE @DirectionExternal END AS Direction,
    COUNT(*) AS AdmissionsCount
FROM FirstAdmissions
GROUP BY DATEFROMPARTS(YEAR(AdmissionDate), MONTH(AdmissionDate), 1),
    CASE WHEN LTRIM(RTRIM(Source)) = @MoveRangeHospital THEN @DirectionInternal ELSE @DirectionExternal END
ORDER BY MonthDate, Direction;

GO

/* =============================================================================
   1.6  GetRehabilitationRecommendedTargets  →  GetRecommendedTargets
   מחזיר bucket חודשי (MonthDate) — ActualValue מחושב ב-C# (יעד 95%)
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDateParam date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDateParam date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;

PRINT '--- 1.6 GetRehabilitationRecommendedTargets (monthly buckets + raw days) ---';

IF OBJECT_ID('tempdb..#Hosp_16') IS NOT NULL DROP TABLE #Hosp_16;

SELECT
    h.Patient,
    h.Unit,
    CAST(h.Admission_Date AS date) AS Admission_Date,
    CAST(h.Release_Date AS date) AS Release_Date
INTO #Hosp_16
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 150685851)
  AND CAST(h.Admission_Date AS date) <= @ToDateParam
  AND (h.Release_Date IS NULL OR CAST(h.Release_Date AS date) > @FromDateParam)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH Dates AS (
    SELECT CAST(@FromDateParam AS date) AS OccupancyDate
    UNION ALL
    SELECT DATEADD(day, 1, OccupancyDate)
    FROM Dates
    WHERE OccupancyDate < CAST(@ToDateParam AS date)
),
Units AS (
    SELECT 49 AS Unit, N'מחלקת שיקום ילדים' AS DepartmentName
    UNION ALL SELECT 85, N'המחלקה לגריאטריה שיקומית'
    UNION ALL SELECT 150685851, N'מחלקת שיקום כללי'
),
DailyOccupancy AS (
    SELECT
        d.OccupancyDate,
        u.Unit,
        u.DepartmentName,
        COUNT(DISTINCT h.Patient) AS OccupiedPatients
    FROM Dates d
    CROSS JOIN Units u
    LEFT JOIN #Hosp_16 h
        ON h.Unit = u.Unit
       AND h.Admission_Date <= d.OccupancyDate
       AND (h.Release_Date IS NULL OR h.Release_Date > d.OccupancyDate)
    GROUP BY d.OccupancyDate, u.Unit, u.DepartmentName
)
SELECT
    DATEFROMPARTS(YEAR(do.OccupancyDate), MONTH(do.OccupancyDate), 1) AS MonthDate,
    do.Unit,
    do.DepartmentName,
    SUM(do.OccupiedPatients) AS TotalOccupiedPatientDays,
    COUNT(*) AS DaysInPeriod,
    CASE do.Unit WHEN 49 THEN 14 WHEN 85 THEN 18 WHEN 150685851 THEN 35 ELSE 0 END AS BedCapacity,
    CAST(
        CASE
            WHEN do.Unit = 49 AND COUNT(*) > 0 THEN SUM(do.OccupiedPatients) * 100.0 / (14.0 * COUNT(*))
            WHEN do.Unit = 85 AND COUNT(*) > 0 THEN SUM(do.OccupiedPatients) * 100.0 / (18.0 * COUNT(*))
            WHEN do.Unit = 150685851 AND COUNT(*) > 0 THEN SUM(do.OccupiedPatients) * 100.0 / (35.0 * COUNT(*))
            ELSE 0
        END AS decimal(10, 2)
    ) AS ActualValuePct,
    CAST(95.0 AS decimal(10, 2)) AS TargetValuePct
FROM DailyOccupancy do
GROUP BY DATEFROMPARTS(YEAR(do.OccupancyDate), MONTH(do.OccupancyDate), 1), do.Unit, do.DepartmentName
ORDER BY MonthDate, do.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp_16;

GO

/* =============================================================================
   1.7  GetRehabilitationRevenueNet  →  GetRevenueNet
   ⚠️ מתעלם מ-FromDate/ToDate — תמיד 12 חודשים גלגוליים מ-GETDATE()
   ============================================================================= */
PRINT '--- 1.7 GetRehabilitationRevenueNet (rolling 12 months — no date params) ---';

IF OBJECT_ID('tempdb..#Inv_17') IS NOT NULL DROP TABLE #Inv_17;
IF OBJECT_ID('tempdb..#Cases_17') IS NOT NULL DROP TABLE #Cases_17;

SELECT
    TRY_CONVERT(decimal(18, 2), i.Price) AS Price,
    LTRIM(RTRIM(i.CaseNumber)) AS CaseNumber,
    DATEFROMPARTS(YEAR(i.InvoiceDate), MONTH(i.InvoiceDate), 1) AS MonthDate
INTO #Inv_17
FROM dbo.Invoices i WITH (NOLOCK)
WHERE TRY_CONVERT(decimal(18, 2), i.Price) IS NOT NULL
  AND TRY_CONVERT(decimal(18, 2), i.Price) <> 0
  AND i.InvoiceDate >= DATEADD(month, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
  AND i.InvoiceDate < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1));

SELECT DISTINCT
    LTRIM(RTRIM(pm.PM_CASE_NUMBER)) AS CaseNumber,
    LTRIM(RTRIM(pm.PM_MOVE_DEPART)) AS PM_MOVE_DEPART
INTO #Cases_17
FROM dbo.PATIENT_MONITORING pm WITH (NOLOCK)
WHERE LTRIM(RTRIM(pm.PM_MOVE_DEPART)) IN (N'רגרי-ש', N'רשיקום-י', N'רשיקום-כ');

SELECT
    inv.MonthDate AS [Date],
    CASE c.PM_MOVE_DEPART
        WHEN N'רגרי-ש' THEN 85
        WHEN N'רשיקום-י' THEN 49
        WHEN N'רשיקום-כ' THEN 150685851
    END AS Unit,
    CASE c.PM_MOVE_DEPART
        WHEN N'רגרי-ש' THEN N'המחלקה לגריאטריה שיקומית'
        WHEN N'רשיקום-י' THEN N'מחלקת שיקום ילדים'
        WHEN N'רשיקום-כ' THEN N'מחלקת שיקום כללי'
    END AS DepartmentName,
    SUM(inv.Price) AS RevenueAmount
FROM #Inv_17 inv
INNER JOIN #Cases_17 c
    ON TRY_CONVERT(BIGINT, inv.CaseNumber) = TRY_CONVERT(BIGINT, c.CaseNumber)
GROUP BY inv.MonthDate, c.PM_MOVE_DEPART
ORDER BY inv.MonthDate, Unit;

DROP TABLE #Inv_17;
DROP TABLE #Cases_17;

GO

/* =============================================================================
   1.8  GetRehabilitationTreatments  →  GetTreatments
   ⚠️ STUB בשרת — אין SQL; מחזיר רשימה ריקה. אין מה להריץ.
   ============================================================================= */
PRINT '--- 1.8 GetRehabilitationTreatments — STUB (no SQL deployed yet) ---';
SELECT
    CAST(NULL AS date) AS [Date],
    CAST(NULL AS nvarchar(100)) AS ProfessionName,
    CAST(NULL AS int) AS TotalTreatments,
    CAST(NULL AS decimal(10, 2)) AS AvgPerPatientDay,
    CAST(NULL AS int) AS Unit,
    CAST(NULL AS nvarchar(200)) AS DepartmentName
WHERE 1 = 0;

GO

/* =============================================================================
   1.1  GetRehabilitationHospitalizationDays  →  GetHospitalizationDays
   שורה לכל: תאריך × מחלקה — GrossDays / NetDays
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;

PRINT '--- 1.1 GetRehabilitationHospitalizationDays (daily rows) ---';

IF OBJECT_ID('tempdb..#Hosp_11') IS NOT NULL DROP TABLE #Hosp_11;

SELECT
    h.Admission_No,
    h.Unit,
    CAST(h.Admission_Date AS date) AS AdmissionDate,
    CAST(h.Release_Date AS date) AS ReleaseDate,
    CAST(COALESCE(ts.TreatmentStartDate, h.Admission_Date) AS date) AS TreatmentStartDate
INTO #Hosp_11
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
OUTER APPLY (
    SELECT TOP 1 CAST(mr.Record_Date AS date) AS TreatmentStartDate
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Admission_No = h.Admission_No
      AND CAST(mr.Record_Date AS date) >= CAST(h.Admission_Date AS date)
    ORDER BY mr.Record_Date ASC
) ts
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
  AND CAST(h.Admission_Date AS date) <= @ToDate
  AND (h.Release_Date IS NULL OR CAST(h.Release_Date AS date) > @FromDate)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH Dates AS (
    SELECT CAST(@FromDate AS date) AS ReportDate
    UNION ALL
    SELECT DATEADD(day, 1, ReportDate)
    FROM Dates
    WHERE ReportDate < CAST(@ToDate AS date)
),
RehabilitationUnits AS (
    SELECT su.Unit, su.Name
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits] su WITH (NOLOCK)
    WHERE su.Hospital = 34
      AND su.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
),
DailyPatientDays AS (
    SELECT
        d.ReportDate,
        h.Unit,
        SUM(CASE WHEN h.AdmissionDate <= d.ReportDate AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate) THEN 1 ELSE 0 END) AS GrossDays,
        SUM(CASE WHEN h.TreatmentStartDate <= d.ReportDate AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate) THEN 1 ELSE 0 END) AS NetDays
    FROM Dates d
    CROSS JOIN #Hosp_11 h
    GROUP BY d.ReportDate, h.Unit
)
SELECT
    d.ReportDate AS [Date],
    u.Unit,
    u.Name AS DepartmentName,
    ISNULL(dpd.GrossDays, 0) AS GrossDays,
    ISNULL(dpd.NetDays, 0) AS NetDays
FROM Dates d
CROSS JOIN RehabilitationUnits u
LEFT JOIN DailyPatientDays dpd
    ON dpd.ReportDate = d.ReportDate AND dpd.Unit = u.Unit
ORDER BY d.ReportDate, u.Unit
OPTION (MAXRECURSION 366);

PRINT '--- 1.1 MONTHLY SUMMARY (sum gross/net by month, units 49+85+150685851) ---';
;WITH Dates AS (
    SELECT CAST(@FromDate AS date) AS ReportDate
    UNION ALL
    SELECT DATEADD(day, 1, ReportDate) FROM Dates WHERE ReportDate < CAST(@ToDate AS date)
),
DailyPatientDays AS (
    SELECT
        d.ReportDate,
        h.Unit,
        SUM(CASE WHEN h.AdmissionDate <= d.ReportDate AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate) THEN 1 ELSE 0 END) AS GrossDays,
        SUM(CASE WHEN h.TreatmentStartDate <= d.ReportDate AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate) THEN 1 ELSE 0 END) AS NetDays
    FROM Dates d
    CROSS JOIN #Hosp_11 h
    WHERE h.Unit IN (49, 85, 150685851)
    GROUP BY d.ReportDate, h.Unit
)
SELECT
    DATEFROMPARTS(YEAR(ReportDate), MONTH(ReportDate), 1) AS MonthDate,
    SUM(GrossDays) AS TotalGrossDays,
    SUM(NetDays) AS TotalNetDays
FROM DailyPatientDays
GROUP BY DATEFROMPARTS(YEAR(ReportDate), MONTH(ReportDate), 1)
ORDER BY MonthDate
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp_11;

GO

/* =============================================================================
   1.2  GetRehabilitationAvgLengthOfStay  →  GetAvgLengthOfStay
   שורה לכל: תאריך שחרור × מחלקה
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;

PRINT '--- 1.2 GetRehabilitationAvgLengthOfStay (by release date) ---';

SELECT
    CAST(h.Release_Date AS date) AS [Date],
    h.Unit,
    u.Name AS DepartmentName,
    AVG(CAST(DATEDIFF(day, CAST(h.Admission_Date AS date), CAST(h.Release_Date AS date)) + 1 AS decimal(10, 2))) AS AvgLosDays,
    COUNT(*) AS PatientCount
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
INNER JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits] u WITH (NOLOCK)
    ON u.Hospital = 34 AND u.Unit = h.Unit
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
  AND h.Release_Date IS NOT NULL
  AND CAST(h.Release_Date AS date) BETWEEN @FromDate AND @ToDate
  AND CAST(h.Admission_Date AS date) <= CAST(h.Release_Date AS date)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%')
GROUP BY CAST(h.Release_Date AS date), h.Unit, u.Name
ORDER BY [Date], h.Unit;

PRINT '--- 1.2 MONTHLY SUMMARY (weighted avg LOS by month) ---';
SELECT
    DATEFROMPARTS(YEAR(CAST(h.Release_Date AS date)), MONTH(CAST(h.Release_Date AS date)), 1) AS MonthDate,
    AVG(CAST(DATEDIFF(day, CAST(h.Admission_Date AS date), CAST(h.Release_Date AS date)) + 1 AS decimal(10, 2))) AS AvgLosDays,
    COUNT(*) AS PatientCount
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 150685851)
  AND h.Release_Date IS NOT NULL
  AND CAST(h.Release_Date AS date) BETWEEN @FromDate AND @ToDate
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%')
GROUP BY DATEFROMPARTS(YEAR(CAST(h.Release_Date AS date)), MONTH(CAST(h.Release_Date AS date)), 1)
ORDER BY MonthDate;

GO

/* =============================================================================
   1.3 MONTHLY OCCUPANCY SUMMARY (fix — full query for dashboard chart)
   ============================================================================= */
DECLARE @Year int = 2026;
DECLARE @FromDate date = DATEFROMPARTS(@Year, 1, 1);
DECLARE @ToDate date = CASE WHEN @Year = YEAR(GETDATE()) THEN CAST(GETDATE() AS date) ELSE DATEFROMPARTS(@Year, 12, 31) END;

PRINT '--- 1.3 MONTHLY SUMMARY occupancy % (3 main depts, total beds=67) ---';

IF OBJECT_ID('tempdb..#Hosp_13m') IS NOT NULL DROP TABLE #Hosp_13m;

SELECT h.Admission_No, h.Unit,
    CAST(h.Admission_Date AS date) AS HospDate,
    CAST(h.Release_Date AS date) AS ReleaseDate
INTO #Hosp_13m
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations] h WITH (NOLOCK)
LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[Patients] p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34 AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 150685851)
  AND CAST(h.Admission_Date AS date) <= @ToDate
  AND (h.Release_Date IS NULL OR CAST(h.Release_Date AS date) > @FromDate)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH Dates AS (
    SELECT CAST(@FromDate AS date) AS OccupancyDate
    UNION ALL
    SELECT DATEADD(day, 1, OccupancyDate) FROM Dates WHERE OccupancyDate < CAST(@ToDate AS date)
),
Units AS (
    SELECT 49 AS Unit, 14 AS Beds UNION ALL SELECT 85, 18 UNION ALL SELECT 150685851, 35
),
Daily AS (
    SELECT d.OccupancyDate, SUM(cnt) AS Occupied
    FROM Dates d
    CROSS APPLY (
        SELECT COUNT(DISTINCT h.Admission_No) AS cnt
        FROM #Hosp_13m h
        INNER JOIN Units u ON u.Unit = h.Unit
        WHERE h.HospDate <= d.OccupancyDate
          AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.OccupancyDate)
    ) x
    GROUP BY d.OccupancyDate
)
SELECT
    DATEFROMPARTS(YEAR(OccupancyDate), MONTH(OccupancyDate), 1) AS MonthDate,
    AVG(Occupied) AS AvgOccupiedPatients,
    CAST(AVG(Occupied) * 100.0 / 67.0 AS decimal(10, 1)) AS AvgOccupancyPct,
    67 AS TotalBeds
FROM Daily
GROUP BY DATEFROMPARTS(YEAR(OccupancyDate), MONTH(OccupancyDate), 1)
ORDER BY MonthDate
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp_13m;

PRINT '=== Done. Compare row counts to WebService JSON d[] length ===';
