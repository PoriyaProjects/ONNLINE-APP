// =============================================================================
// RehabilitationOccupancyService.cs — C# 5 / App_Code (replace entire backend file)
// =============================================================================
// Connection: connetionString → SRV-APPDB / NAMER (IIS ChameleonConnection must match)
// Chameleon (linked): [SRV-CP-DB-3].[Chameleon].[dbo].Hospitalizations / MedicalRecords / SystemUnits / Patients
// Local NAMER: dbo.PATIENT_MONITORING, dbo.Invoices, dbo.Pay_Institute
// Dates: ParseD yyyy-MM-dd + SqlDbType.Date on ALL date params
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873";
    private const string ChameleonHospitalizations = "[SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations]";
    private const string ChameleonMedicalRecords = "[SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords]";
    private const string ChameleonSystemUnits = "[SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits]";
    private const string ChameleonPatients = "[SRV-CP-DB-3].[Chameleon].[dbo].[Patients]";

    private static string connetionString;

    static RehabilitationOccupancyService()
    {
        ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["ChameleonConnection"];
        if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
        {
            connetionString = settings.ConnectionString;
        }
        else
        {
            connetionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;Integrated Security=True";
        }
    }

    private static DateTime ParseD(string value)
    {
        DateTime result;
        string text = value == null ? null : value.Trim();
        if (!DateTime.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out result))
        {
            throw new ArgumentException("Date must be yyyy-MM-dd");
        }
        return result;
    }

    private static void ParseRange(string fromDate, string toDate, out DateTime from, out DateTime to)
    {
        from = ParseD(fromDate);
        to = ParseD(toDate);
        if (to < from)
        {
            throw new ArgumentException("ToDate must be >= FromDate");
        }
    }

    private static SqlParameter DateParam(string name, DateTime value)
    {
        SqlParameter param = new SqlParameter(name, SqlDbType.Date);
        param.Value = value.Date;
        return param;
    }

    private static SqlParameter NVarCharParam(string name, string value)
    {
        SqlParameter param = new SqlParameter(name, SqlDbType.NVarChar);
        param.Value = value;
        return param;
    }

    private static void AddPayerCategoryParams(SqlCommand cmd)
    {
        cmd.Parameters.Add(NVarCharParam("@CatKupatCholim", "\u05E7\u05D5\u05E4\u05EA \u05D7\u05D5\u05DC\u05D9\u05DD"));
        cmd.Parameters.Add(NVarCharParam("@CatTzahalDefense", "\u05E6\u05D4\u05F4\u05DC + \u05DE\u05E9\u05E8\u05D3 \u05D4\u05D1\u05D8\u05D7\u05D5\u05DF"));
        cmd.Parameters.Add(NVarCharParam("@CatOther", "\u05D0\u05D7\u05E8"));
        cmd.Parameters.Add(NVarCharParam("@PayerUnassigned", "\u05D8\u05E8\u05DD \u05E9\u05D5\u05D9\u05D9\u05DA"));
        cmd.Parameters.Add(NVarCharParam("@PayClalit", "\u05DB\u05DC\u05DC\u05D9\u05EA"));
        cmd.Parameters.Add(NVarCharParam("@PayMaccabi", "\u05DE\u05DB\u05D1\u05D9"));
        cmd.Parameters.Add(NVarCharParam("@PayLeumit", "\u05DC\u05D0\u05D5\u05DE\u05D9\u05EA"));
        cmd.Parameters.Add(NVarCharParam("@PayMeuhedet", "\u05DE\u05D0\u05D5\u05D7\u05D3\u05EA"));
    }

    private static void AddDirectionParams(SqlCommand cmd)
    {
        AddPayerCategoryParams(cmd);
        cmd.Parameters.Add(NVarCharParam("@PayPrivate", "\u05E4\u05E8\u05D8\u05D9"));
        cmd.Parameters.Add(NVarCharParam("@MoveRangeHospital", "\u05D0\u05D9\u05E9\u05E4\u05D5\u05D6"));
        cmd.Parameters.Add(NVarCharParam("@DirectionInternal", "\u05E4\u05E0\u05D9\u05DD"));
        cmd.Parameters.Add(NVarCharParam("@DirectionExternal", "\u05D7\u05D5\u05E5"));
    }

    // =========================================================================
    // 1.3 GetDailyOccupancy — #Hosp + Dates + RehabilitationUnits (u.Name)
    // =========================================================================
    public List<RehabilitationOccupancy> GetDailyOccupancy(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationOccupancy> results = new List<RehabilitationOccupancy>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

SELECT
    h.Admission_No,
    h.Unit,
    CAST(h.Admission_Date AS date) AS HospDate,
    CAST(h.Release_Date AS date) AS ReleaseDate
INTO #Hosp
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
LEFT JOIN " + ChameleonPatients + @" p WITH (NOLOCK) ON h.Patient = p.Patient
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
    FROM " + ChameleonSystemUnits + @" su WITH (NOLOCK)
    WHERE su.Hospital = 34
      AND su.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
)
SELECT
    d.OccupancyDate,
    u.Unit,
    u.Name,
    COUNT(DISTINCT h.Admission_No) AS OccupiedPatients
FROM Dates d
CROSS JOIN RehabilitationUnits u
LEFT JOIN #Hosp h
    ON h.Unit = u.Unit
   AND h.HospDate <= d.OccupancyDate
   AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.OccupancyDate)
GROUP BY d.OccupancyDate, u.Unit, u.Name
ORDER BY d.OccupancyDate, u.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationOccupancy row = new RehabilitationOccupancy();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("OccupancyDate"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["Name"] as string ?? string.Empty;
                    row.OccupiedPatients = reader.GetInt32(reader.GetOrdinal("OccupiedPatients"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.4 GetAdmissionsByPayer — #Adm + #Units
    // =========================================================================
    public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByPayer> results = new List<RehabilitationAdmissionsByPayer>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

SELECT
    CAST(h.Admission_Date AS date) AS AdmissionDate,
    h.Unit,
    h.Admission_No,
    ROW_NUMBER() OVER (
        PARTITION BY h.Admission_No
        ORDER BY h.Admission_Date
    ) AS rn
INTO #Adm
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
  AND CAST(h.Admission_Date AS date) BETWEEN @FromDate AND @ToDate;

SELECT su.Unit, su.Name
INTO #Units
FROM " + ChameleonSystemUnits + @" su WITH (NOLOCK)
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
    u.Name
FROM (
    SELECT AdmissionDate, Unit, Admission_No
    FROM #Adm
    WHERE rn = 1
) fa
INNER JOIN #Units u ON fa.Unit = u.Unit
OUTER APPLY (
    SELECT TOP 1 mr.Pay_Institute
    FROM " + ChameleonMedicalRecords + @" mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
      AND mr.Admission_No = fa.Admission_No
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    fa.AdmissionDate,
    fa.Unit,
    u.Name,
    CASE
        WHEN payer.Pay_Institute IN (10, 11, 12, 13) THEN @CatKupatCholim
        WHEN payer.Pay_Institute = 98 THEN @CatTzahalDefense
        ELSE @CatOther
    END,
    CASE
        WHEN payer.Pay_Institute = 10 THEN @PayClalit
        WHEN payer.Pay_Institute = 11 THEN @PayMaccabi
        WHEN payer.Pay_Institute = 12 THEN @PayLeumit
        WHEN payer.Pay_Institute = 13 THEN @PayMeuhedet
        ELSE @PayerUnassigned
    END
ORDER BY [Date], fa.Unit, PayerCategory, PayerName;

DROP TABLE #Adm;
DROP TABLE #Units;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddPayerCategoryParams(cmd);
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationAdmissionsByPayer row = new RehabilitationAdmissionsByPayer();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.PayerCategory = reader["PayerCategory"] as string ?? string.Empty;
                    row.PayerName = reader["PayerName"] as string ?? string.Empty;
                    row.AdmissionsCount = reader.GetInt32(reader.GetOrdinal("AdmissionsCount"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["Name"] as string ?? string.Empty;
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.5 GetAdmissionsByDirection — PATIENT_MONITORING + unicode \u params
    // =========================================================================
    public List<RehabilitationAdmissionsByDirection> GetAdmissionsByDirection(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByDirection> results = new List<RehabilitationAdmissionsByDirection>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

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
    FROM " + ChameleonMedicalRecords + @" mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
      AND TRY_CONVERT(BIGINT, mr.Admission_No) = TRY_CONVERT(BIGINT, a.CaseNumber)
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    a.AdmissionDate,
    a.DepartmentCode,
    a.Source,
    payer.Pay_Institute
ORDER BY a.AdmissionDate, Unit;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddDirectionParams(cmd);
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationAdmissionsByDirection row = new RehabilitationAdmissionsByDirection();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.FunderName = reader["FunderName"] as string ?? string.Empty;
                    row.Direction = reader["Direction"] as string ?? string.Empty;
                    row.AdmissionsCount = reader.GetInt32(reader.GetOrdinal("AdmissionsCount"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.6 GetRecommendedTargets — @FromDateParam/@ToDateParam + #Hosp
    // =========================================================================
    public List<RehabilitationRecommendedTarget> GetRecommendedTargets(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationRecommendedTarget> results = new List<RehabilitationRecommendedTarget>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

SELECT
    h.Patient,
    h.Unit,
    CAST(h.Admission_Date AS date) AS Admission_Date,
    CAST(h.Release_Date AS date) AS Release_Date
INTO #Hosp
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
LEFT JOIN " + ChameleonPatients + @" p WITH (NOLOCK) ON h.Patient = p.Patient
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
    UNION ALL
    SELECT 85, N'המחלקה לגריאטריה שיקומית'
    UNION ALL
    SELECT 150685851, N'מחלקת שיקום כללי'
),
DailyOccupancy AS (
    SELECT
        d.OccupancyDate,
        u.Unit,
        u.DepartmentName,
        COUNT(DISTINCT h.Patient) AS OccupiedPatients
    FROM Dates d
    CROSS JOIN Units u
    LEFT JOIN #Hosp h
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
    COUNT(*) AS DaysInPeriod
FROM DailyOccupancy do
GROUP BY DATEFROMPARTS(YEAR(do.OccupancyDate), MONTH(do.OccupancyDate), 1), do.Unit, do.DepartmentName
ORDER BY MonthDate, do.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDateParam", from));
            cmd.Parameters.Add(DateParam("@ToDateParam", to));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    int totalOccupiedPatientDays = reader.GetInt32(reader.GetOrdinal("TotalOccupiedPatientDays"));
                    int daysInPeriod = reader.GetInt32(reader.GetOrdinal("DaysInPeriod"));
                    int capacity;
                    switch (unit)
                    {
                        case 49: capacity = 14; break;
                        case 85: capacity = 18; break;
                        case 150685851: capacity = 35; break;
                        default: capacity = 0; break;
                    }

                    decimal actualValue = 0;
                    if (capacity > 0 && daysInPeriod > 0)
                    {
                        actualValue = Math.Round(
                            (totalOccupiedPatientDays / (capacity * (decimal)daysInPeriod)) * 100m, 2);
                    }
                    const decimal targetValue = 95m;
                    decimal gap = Math.Round(actualValue - targetValue, 2);

                    RehabilitationRecommendedTarget row = new RehabilitationRecommendedTarget();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("MonthDate"));
                    row.Unit = unit;
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.ActualValue = actualValue;
                    row.TargetValue = targetValue;
                    row.Gap = gap;
                    row.MetricType = "\u05EA\u05E4\u05D5\u05E1\u05D4";
                    row.Status = actualValue >= targetValue
                        ? "\u05E2\u05D5\u05DE\u05D3 \u05D1\u05D9\u05E2\u05D3"
                        : "\u05DE\u05EA\u05D7\u05EA \u05DC\u05D9\u05E2\u05D3";
                    row.TotalOccupiedPatientDays = totalOccupiedPatientDays;
                    row.DaysInPeriod = daysInPeriod;
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.7 GetRevenueNet — wrapper; SQL has no date params
    // =========================================================================
    public List<RehabilitationRevenueNet> GetRevenueNet(string fromDate, string toDate)
    {
        return GetRevenueNetCore();
    }

    private List<RehabilitationRevenueNet> GetRevenueNetCore()
    {
        List<RehabilitationRevenueNet> results = new List<RehabilitationRevenueNet>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

;WITH Months AS (
    SELECT DATEADD(month, -n, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS MonthDate
    FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) AS v(n)
),
Units AS (
    SELECT * FROM (VALUES
        (85, N'גריאטריה שיקומית', N'המחלקה לגריאטריה שיקומית'),
        (49, N'שיקום ילדים', N'מחלקת שיקום ילדים'),
        (150685851, N'שיקום כללי', N'מחלקת שיקום כללי')
    ) AS u(Unit, SubMedicalUnit_Description, DepartmentName)
),
Base AS (
    SELECT
        DATEFROMPARTS(Year,
            CASE [Month]
                WHEN N'ינואר' THEN 1 WHEN N'פברואר' THEN 2 WHEN N'מרץ' THEN 3
                WHEN N'אפריל' THEN 4 WHEN N'מאי' THEN 5 WHEN N'יוני' THEN 6
                WHEN N'יולי' THEN 7 WHEN N'אוגוסט' THEN 8 WHEN N'ספטמבר' THEN 9
                WHEN N'אוקטובר' THEN 10 WHEN N'נובמבר' THEN 11 WHEN N'דצמבר' THEN 12
            END, 1) AS MonthDate,
        SubMedicalUnit_Description,
        TRY_CONVERT(decimal(18,2), NetIncomeTotal) AS NetIncomeTotal
    FROM dbo.Excel_QuarterlyIncome WITH (NOLOCK)
    WHERE SubMedicalUnit_Description IN (N'גריאטריה שיקומית', N'שיקום ילדים', N'שיקום כללי')
)
SELECT
    m.MonthDate,
    u.Unit,
    u.DepartmentName,
    ISNULL(SUM(b.NetIncomeTotal), 0) AS RevenueAmount
FROM Months m
CROSS JOIN Units u
LEFT JOIN Base b
    ON b.MonthDate = m.MonthDate
    AND b.SubMedicalUnit_Description = u.SubMedicalUnit_Description
GROUP BY m.MonthDate, u.Unit, u.DepartmentName
ORDER BY m.MonthDate, u.Unit;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationRevenueNet row = new RehabilitationRevenueNet();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("MonthDate"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.RevenueAmount = reader.GetDecimal(reader.GetOrdinal("RevenueAmount"));
                    results.Add(row);
                }
            }
        }

        Dictionary<DateTime, decimal> monthTotals = new Dictionary<DateTime, decimal>();
        for (int i = 0; i < results.Count; i++)
        {
            DateTime month = results[i].Date;
            decimal amount = results[i].RevenueAmount;
            if (monthTotals.ContainsKey(month))
            {
                monthTotals[month] += amount;
            }
            else
            {
                monthTotals[month] = amount;
            }
        }

        for (int i = 0; i < results.Count; i++)
        {
            DateTime month = results[i].Date;
            decimal monthTotal = monthTotals.ContainsKey(month) ? monthTotals[month] : 0;
            results[i].SharePercent = monthTotal > 0
                ? Math.Round((results[i].RevenueAmount / monthTotal) * 100m, 2)
                : 0m;
            int daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);
            results[i].RevenuePerDay = daysInMonth > 0
                ? Math.Round(results[i].RevenueAmount / daysInMonth, 2)
                : 0m;
        }

        return results;
    }

    // =========================================================================
    // 1.8 GetTreatments — stub (WHERE 1=0)
    // =========================================================================
    public List<RehabilitationTreatment> GetTreatments(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<RehabilitationTreatment>();
    }

    // =========================================================================
    // 1.1 GetHospitalizationDays — daily patient-days gross (all days in unit)
    //     vs net (from first MedicalRecords date on/after admission — treatment proxy)
    // =========================================================================
    public List<RehabilitationHospitalizationDays> GetHospitalizationDays(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationHospitalizationDays> results = new List<RehabilitationHospitalizationDays>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

SELECT
    h.Admission_No,
    h.Unit,
    CAST(h.Admission_Date AS date) AS AdmissionDate,
    CAST(h.Release_Date AS date) AS ReleaseDate,
    CAST(COALESCE(ts.TreatmentStartDate, h.Admission_Date) AS date) AS TreatmentStartDate
INTO #Hosp
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
LEFT JOIN " + ChameleonPatients + @" p WITH (NOLOCK) ON h.Patient = p.Patient
OUTER APPLY (
    SELECT TOP 1 CAST(mr.Record_Date AS date) AS TreatmentStartDate
    FROM " + ChameleonMedicalRecords + @" mr WITH (NOLOCK)
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
    FROM " + ChameleonSystemUnits + @" su WITH (NOLOCK)
    WHERE su.Hospital = 34
      AND su.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
),
DailyPatientDays AS (
    SELECT
        d.ReportDate,
        h.Unit,
        SUM(CASE
            WHEN h.AdmissionDate <= d.ReportDate
             AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate)
            THEN 1 ELSE 0
        END) AS GrossDays,
        SUM(CASE
            WHEN h.TreatmentStartDate <= d.ReportDate
             AND (h.ReleaseDate IS NULL OR h.ReleaseDate > d.ReportDate)
            THEN 1 ELSE 0
        END) AS NetDays
    FROM Dates d
    CROSS JOIN #Hosp h
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
    ON dpd.ReportDate = d.ReportDate
   AND dpd.Unit = u.Unit
ORDER BY d.ReportDate, u.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationHospitalizationDays row = new RehabilitationHospitalizationDays();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.GrossDays = reader.GetInt32(reader.GetOrdinal("GrossDays"));
                    row.NetDays = reader.GetInt32(reader.GetOrdinal("NetDays"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.2 GetAvgLengthOfStay — avg days per discharge (Release_Date in range)
    // =========================================================================
    public List<RehabilitationAvgLengthOfStay> GetAvgLengthOfStay(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAvgLengthOfStay> results = new List<RehabilitationAvgLengthOfStay>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

SELECT
    CAST(h.Release_Date AS date) AS [Date],
    h.Unit,
    u.Name AS DepartmentName,
    AVG(CAST(DATEDIFF(day, CAST(h.Admission_Date AS date), CAST(h.Release_Date AS date)) + 1 AS decimal(10, 2))) AS AvgLosDays,
    COUNT(*) AS PatientCount
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
LEFT JOIN " + ChameleonPatients + @" p WITH (NOLOCK) ON h.Patient = p.Patient
INNER JOIN " + ChameleonSystemUnits + @" u WITH (NOLOCK)
    ON u.Hospital = 34
   AND u.Unit = h.Unit
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (49, 85, 178, 231, 240, 255, 150685851, 150685853, 150685861, 150685873)
  AND h.Release_Date IS NOT NULL
  AND CAST(h.Release_Date AS date) BETWEEN @FromDate AND @ToDate
  AND CAST(h.Admission_Date AS date) <= CAST(h.Release_Date AS date)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%')
GROUP BY CAST(h.Release_Date AS date), h.Unit, u.Name
ORDER BY [Date], h.Unit;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationAvgLengthOfStay row = new RehabilitationAvgLengthOfStay();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.AvgLosDays = reader.GetDecimal(reader.GetOrdinal("AvgLosDays"));
                    row.PatientCount = reader.GetInt32(reader.GetOrdinal("PatientCount"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 2.1 GetDayRehabPatientsByPayer — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabPatientsByPayer>();
    }

    // =========================================================================
    // 2.2 GetDayRehabPatientsByDirection — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabPatientsByDirection>();
    }

    // =========================================================================
    // 2.3 GetDayRehabDischargesWithRecommendation — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabDischargesWithRecommendation>();
    }

    // =========================================================================
    // 2.4 GetDayRehabTreatmentsDailyCumulative — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsDailyCumulative>();
    }

    // =========================================================================
    // 2.5 GetDayRehabTreatmentsBySector — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsBySector>();
    }

    // =========================================================================
    // 2.6 GetDayRehabTreatmentsPerPosition — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsPerPosition>();
    }

    // =========================================================================
    // 2.7 GetDayRehabAvgTreatmentsPerPatient — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabAvgTreatmentsPerPatient>();
    }

    // =========================================================================
    // 2.8 GetDayRehabTreatmentsIndividualGroup — stub (SQL TBD)
    // =========================================================================
    public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsIndividualGroup>();
    }
}

public class RehabilitationOccupancy
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public int OccupiedPatients { get; set; }
}

public class RehabilitationAdmissionsByPayer
{
    public DateTime Date { get; set; }
    public string PayerCategory { get; set; }
    public string PayerName { get; set; }
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}

public class RehabilitationAdmissionsByDirection
{
    public DateTime Date { get; set; }
    public string FunderName { get; set; }
    public string Direction { get; set; }
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}

public class RehabilitationRecommendedTarget
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public decimal ActualValue { get; set; }
    public decimal TargetValue { get; set; }
    public decimal Gap { get; set; }
    public string MetricType { get; set; }
    public string Status { get; set; }
    public int TotalOccupiedPatientDays { get; set; }
    public int DaysInPeriod { get; set; }
}

public class RehabilitationRevenueNet
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public decimal RevenueAmount { get; set; }
    public decimal RevenuePerDay { get; set; }
    public decimal SharePercent { get; set; }
}

public class RehabilitationTreatment
{
    public DateTime Date { get; set; }
    public string ProfessionName { get; set; }
    public int TotalTreatments { get; set; }
    public decimal AvgPerPatientDay { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public bool WeekdayOnly { get; set; }
}

public class RehabilitationHospitalizationDays
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public int GrossDays { get; set; }
    public int NetDays { get; set; }
}

public class RehabilitationAvgLengthOfStay
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public decimal AvgLosDays { get; set; }
    public int PatientCount { get; set; }
}

public class DayRehabPatientsByPayer
{
    public DateTime Date { get; set; }
    public string PayerName { get; set; }
    public int PatientCount { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabPatientsByDirection
{
    public DateTime Date { get; set; }
    public string Direction { get; set; }
    public string FunderName { get; set; }
    public int PatientCount { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabDischargesWithRecommendation
{
    public DateTime Date { get; set; }
    public int DischargeCount { get; set; }
    public int TreatedHere { get; set; }
    public int NotTreatedHere { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabTreatmentsDailyCumulative
{
    public DateTime Date { get; set; }
    public int DailyCount { get; set; }
    public int CumulativeCount { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabTreatmentsBySector
{
    public DateTime Date { get; set; }
    public string SectorName { get; set; }
    public int TreatmentCount { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabTreatmentsPerPosition
{
    public DateTime Date { get; set; }
    public string SectorName { get; set; }
    public decimal TreatmentsPerPosition { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabAvgTreatmentsPerPatient
{
    public DateTime Date { get; set; }
    public decimal AvgTreatments { get; set; }
    public int PatientCount { get; set; }
    public string DepartmentName { get; set; }
}

public class DayRehabTreatmentsIndividualGroup
{
    public DateTime Date { get; set; }
    public string TreatmentType { get; set; }
    public int TreatmentCount { get; set; }
    public string DepartmentName { get; set; }
}
