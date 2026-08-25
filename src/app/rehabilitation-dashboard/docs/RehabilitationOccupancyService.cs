// =============================================================================
// RehabilitationOccupancyService.cs — C# 5 / App_Code (replace entire backend file)
// =============================================================================
// Connection: connetionString → SRV-APPDB / NAMER (IIS ChameleonConnection must match)
// Occupancy / payer / targets: dbo.Hospitalizations (+ MedicalRecords Pay_Institute codes)
// Direction: dbo.PATIENT_MONITORING (ROW_NUMBER) + MedicalRecords
// Revenue: dbo.Invoices.Price + CaseNumber + PATIENT_MONITORING.PM_MOVE_DEPART
// Dates: ParseExact yyyy-MM-dd + SqlDbType.Date on ALL @FromDate/@ToDate params
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

public static class RehabHebrew
{
    public const string DeptGeriatric = "\u05D4\u05DE\u05D7\u05DC\u05E7\u05D4 \u05DC\u05D2\u05E8\u05D9\u05D0\u05D8\u05E8\u05D9\u05D4 \u05E9\u05D9\u05E7\u05D5\u05DE\u05D9\u05EA";
    public const string DeptGeneral = "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05DB\u05DC\u05DC\u05D9";
    public const string DeptPediatric = "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05D9\u05DC\u05D3\u05D9\u05DD";
    public const string CatKupatCholim = "\u05E7\u05D5\u05E4\u05EA \u05D7\u05D5\u05DC\u05D9\u05DD";
    public const string CatTzahalDefense = "\u05E6\u05D4\u05F4\u05DC + \u05DE\u05E9\u05E8\u05D3 \u05D4\u05D1\u05D8\u05D7\u05D5\u05DF";
    public const string CatOther = "\u05D0\u05D7\u05E8";
    public const string PayerUnassigned = "\u05D8\u05E8\u05DD \u05E9\u05D5\u05D9\u05D9\u05DA";
    public const string PayClalit = "\u05DB\u05DC\u05DC\u05D9\u05EA";
    public const string PayMaccabi = "\u05DE\u05DB\u05D1\u05D9";
    public const string PayLeumit = "\u05DC\u05D0\u05D5\u05DE\u05D9\u05EA";
    public const string PayMeuhedet = "\u05DE\u05D0\u05D5\u05D7\u05D3\u05EA";
    public const string PayPrivate = "\u05E4\u05E8\u05D8\u05D9";
    public const string MoveRangeHospital = "\u05D0\u05D9\u05E9\u05E4\u05D5\u05D6";
    public const string DirectionInternal = "\u05E4\u05E0\u05D9\u05DD";
    public const string DirectionExternal = "\u05D7\u05D5\u05E5";
    public const string MetricOccupancy = "\u05EA\u05E4\u05D5\u05E1\u05D4";
    public const string StatusMet = "\u05E2\u05D5\u05DE\u05D3 \u05D1\u05D9\u05E2\u05D3";
    public const string StatusBelow = "\u05DE\u05EA\u05D7\u05EA \u05DC\u05D9\u05E2\u05D3";
    public const string ProfPhysio = "\u05E4\u05D9\u05D6\u05D9\u05D5\u05EA\u05E8\u05E4\u05D9\u05D4";
    public const string ProfOT = "\u05E8\u05D9\u05E4\u05D5\u05D9 \u05D1\u05E2\u05D9\u05E1\u05D5\u05E7";
    public const string ProfSpeech = "\u05E7\u05DC\u05D9\u05E0\u05D0\u05D5\u05EA \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA";
    public const string ProfPsych = "\u05E4\u05E1\u05D9\u05DB\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4";
    public const string ProfNursing = "\u05E1\u05D9\u05E2\u05D5\u05D3 \u05E9\u05D9\u05E7\u05D5\u05DE\u05D9";
}

public class RehabilitationOccupancy
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public int OccupiedPatients;
}

public class RehabilitationAdmissionsByPayer
{
    public DateTime Date;
    public string PayerCategory;
    public string PayerName;
    public int AdmissionsCount;
    public int Unit;
    public string DepartmentName;
}

public class RehabilitationAdmissionsByDirection
{
    public DateTime Date;
    public string FunderName;
    public string Direction;
    public int AdmissionsCount;
    public int Unit;
    public string DepartmentName;
}

public class RehabilitationRecommendedTarget
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal ActualValue;
    public decimal TargetValue;
    public decimal Gap;
    public string MetricType;
    public string Status;
    public int TotalOccupiedPatientDays;
    public int DaysInPeriod;
}

public class RehabilitationRevenueNet
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal RevenueAmount;
    public decimal RevenuePerDay;
    public decimal SharePercent;
}

public class RehabilitationTreatment
{
    public DateTime Date;
    public string ProfessionName;
    public int TotalTreatments;
    public decimal AvgPerPatientDay;
    public int Unit;
    public string DepartmentName;
    public bool WeekdayOnly;
}

public class RehabilitationHospitalizationDays
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public int GrossDays;
    public int NetDays;
}

public class RehabilitationAvgLengthOfStay
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal AvgLosDays;
    public int PatientCount;
}

public class DayRehabPatientsByPayer
{
    public DateTime Date;
    public string PayerName;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabPatientsByDirection
{
    public DateTime Date;
    public string Direction;
    public string FunderName;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabDischargesWithRecommendation
{
    public DateTime Date;
    public int DischargeCount;
    public int TreatedHere;
    public int NotTreatedHere;
    public string DepartmentName;
}

public class DayRehabTreatmentsDailyCumulative
{
    public DateTime Date;
    public int DailyCount;
    public int CumulativeCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsBySector
{
    public DateTime Date;
    public string SectorName;
    public int TreatmentCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsPerPosition
{
    public DateTime Date;
    public string SectorName;
    public decimal TreatmentsPerPosition;
    public string DepartmentName;
}

public class DayRehabAvgTreatmentsPerPatient
{
    public DateTime Date;
    public decimal AvgTreatments;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsIndividualGroup
{
    public DateTime Date;
    public string TreatmentType;
    public int TreatmentCount;
    public string DepartmentName;
}

public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "85, 150685851, 49";

    private string connetionString;

    public RehabilitationOccupancyService()
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

    private static void AddRehabUnitParams(SqlCommand cmd)
    {
        cmd.Parameters.Add(NVarCharParam("@DeptGeriatric", RehabHebrew.DeptGeriatric));
        cmd.Parameters.Add(NVarCharParam("@DeptGeneral", RehabHebrew.DeptGeneral));
        cmd.Parameters.Add(NVarCharParam("@DeptPediatric", RehabHebrew.DeptPediatric));
    }

    private static void AddPayerCategoryParams(SqlCommand cmd)
    {
        cmd.Parameters.Add(NVarCharParam("@CatKupatCholim", RehabHebrew.CatKupatCholim));
        cmd.Parameters.Add(NVarCharParam("@CatTzahalDefense", RehabHebrew.CatTzahalDefense));
        cmd.Parameters.Add(NVarCharParam("@CatOther", RehabHebrew.CatOther));
        cmd.Parameters.Add(NVarCharParam("@PayerUnassigned", RehabHebrew.PayerUnassigned));
        cmd.Parameters.Add(NVarCharParam("@PayClalit", RehabHebrew.PayClalit));
        cmd.Parameters.Add(NVarCharParam("@PayMaccabi", RehabHebrew.PayMaccabi));
        cmd.Parameters.Add(NVarCharParam("@PayLeumit", RehabHebrew.PayLeumit));
        cmd.Parameters.Add(NVarCharParam("@PayMeuhedet", RehabHebrew.PayMeuhedet));
    }

    private static void AddDirectionParams(SqlCommand cmd)
    {
        AddPayerCategoryParams(cmd);
        cmd.Parameters.Add(NVarCharParam("@PayPrivate", RehabHebrew.PayPrivate));
        cmd.Parameters.Add(NVarCharParam("@MoveRangeHospital", RehabHebrew.MoveRangeHospital));
        cmd.Parameters.Add(NVarCharParam("@DirectionInternal", RehabHebrew.DirectionInternal));
        cmd.Parameters.Add(NVarCharParam("@DirectionExternal", RehabHebrew.DirectionExternal));
        AddRehabUnitParams(cmd);
    }

    // =========================================================================
    // 1.3 GetDailyOccupancy — Hospitalizations #Hosp temp table + SystemUnits
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
    h.HPID,
    h.Unit,
    CAST(h.Hosp_Date AS date) AS HospDate,
    CAST(h.Discharge_Date AS date) AS DischargeDate
INTO #Hosp
FROM dbo.Hospitalizations h WITH (NOLOCK)
LEFT JOIN dbo.Patients p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND CAST(h.Hosp_Date AS date) <= @ToDate
  AND (h.Discharge_Date IS NULL OR CAST(h.Discharge_Date AS date) > @FromDate)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH DateRange AS (
    SELECT CAST(@FromDate AS date) AS dt
    UNION ALL
    SELECT DATEADD(day, 1, dt)
    FROM DateRange
    WHERE dt < CAST(@ToDate AS date)
)
SELECT
    dr.dt AS [Date],
    su.Unit,
    su.DepartmentName,
    COUNT(DISTINCT h.HPID) AS OccupiedPatients
FROM DateRange dr
CROSS JOIN dbo.SystemUnits su WITH (NOLOCK)
LEFT JOIN #Hosp h
    ON h.Unit = su.Unit
   AND h.HospDate <= dr.dt
   AND (h.DischargeDate IS NULL OR h.DischargeDate > dr.dt)
WHERE su.Hospital = 34
GROUP BY dr.dt, su.Unit, su.DepartmentName
ORDER BY dr.dt, su.Unit
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
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.OccupiedPatients = reader.GetInt32(reader.GetOrdinal("OccupiedPatients"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.4 GetAdmissionsByPayer — Hospitalizations + MedicalRecords Pay_Institute 10-13,98
    // =========================================================================
    public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByPayer> results = new List<RehabilitationAdmissionsByPayer>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

;WITH Admissions AS (
    SELECT
        CAST(h.Hosp_Date AS date) AS AdmissionDate,
        h.Unit,
        su.DepartmentName,
        LTRIM(RTRIM(h.CaseNumber)) AS CaseNumber,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(h.CaseNumber))
            ORDER BY h.Hosp_Date
        ) AS rn
    FROM dbo.Hospitalizations h WITH (NOLOCK)
    INNER JOIN dbo.SystemUnits su WITH (NOLOCK) ON h.Unit = su.Unit
    WHERE h.Unit IN (" + RehabUnitsInClause + @")
      AND CAST(h.Hosp_Date AS date) BETWEEN @FromDate AND @ToDate
),
FirstAdmissions AS (
    SELECT AdmissionDate, Unit, DepartmentName, CaseNumber
    FROM Admissions
    WHERE rn = 1
)
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
    fa.DepartmentName
FROM FirstAdmissions fa
OUTER APPLY (
    SELECT TOP 1 mr.Pay_Institute
    FROM dbo.MedicalRecords mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND TRY_CONVERT(BIGINT, mr.Admission_No) = TRY_CONVERT(BIGINT, fa.CaseNumber)
    ORDER BY mr.Record_Date DESC
) payer
GROUP BY
    fa.AdmissionDate,
    fa.Unit,
    fa.DepartmentName,
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
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.5 GetAdmissionsByDirection — PATIENT_MONITORING ROW_NUMBER + unicode params
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
        WHEN N'רשיקום-י' THEN @DeptPediatric
        WHEN N'רגרי-ש' THEN @DeptGeriatric
        WHEN N'רשיקום-כ' THEN @DeptGeneral
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
    FROM dbo.MedicalRecords mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
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
    // 1.6 GetRecommendedTargets — Hospitalizations #Hosp occupancy CTE
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
    h.HPID,
    h.Unit,
    CAST(h.Hosp_Date AS date) AS HospDate,
    CAST(h.Discharge_Date AS date) AS DischargeDate
INTO #Hosp
FROM dbo.Hospitalizations h WITH (NOLOCK)
LEFT JOIN dbo.Patients p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND h.Unit IN (" + RehabUnitsInClause + @")
  AND CAST(h.Hosp_Date AS date) <= @ToDate
  AND (h.Discharge_Date IS NULL OR CAST(h.Discharge_Date AS date) > @FromDate)
  AND (p.Patient IS NULL OR p.Id_Num NOT LIKE '%999999%');

;WITH DateRange AS (
    SELECT CAST(@FromDate AS date) AS dt
    UNION ALL
    SELECT DATEADD(day, 1, dt)
    FROM DateRange
    WHERE dt < CAST(@ToDate AS date)
),
DailyOccupancy AS (
    SELECT
        dr.dt AS [Date],
        su.Unit,
        su.DepartmentName,
        su.Beds,
        COUNT(DISTINCT h.HPID) AS OccupiedPatients
    FROM DateRange dr
    CROSS JOIN (
        SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName, 18 AS Beds
        UNION ALL SELECT 150685851, @DeptGeneral, 35
        UNION ALL SELECT 49, @DeptPediatric, 14
    ) su
    LEFT JOIN #Hosp h
        ON h.Unit = su.Unit
       AND h.HospDate <= dr.dt
       AND (h.DischargeDate IS NULL OR h.DischargeDate > dr.dt)
    GROUP BY dr.dt, su.Unit, su.DepartmentName, su.Beds
)
SELECT
    do.[Date],
    do.Unit,
    do.DepartmentName,
    CASE
        WHEN do.Beds > 0 THEN CAST((CAST(do.OccupiedPatients AS decimal(10, 2)) / do.Beds) * 100.0 AS decimal(10, 2))
        ELSE CAST(0 AS decimal(10, 2))
    END AS ActualValue,
    CAST(95.0 AS decimal(10, 2)) AS TargetValue,
    CASE
        WHEN do.Beds > 0 THEN CAST(((CAST(do.OccupiedPatients AS decimal(10, 2)) / do.Beds) * 100.0) - 95.0 AS decimal(10, 2))
        ELSE CAST(0 AS decimal(10, 2))
    END AS Gap,
    @MetricOccupancy AS MetricType,
    CASE
        WHEN do.Beds > 0 AND (CAST(do.OccupiedPatients AS decimal(10, 2)) / do.Beds) * 100.0 >= 95.0
            THEN @StatusMet
        ELSE @StatusBelow
    END AS Status,
    do.OccupiedPatients AS TotalOccupiedPatientDays,
    1 AS DaysInPeriod
FROM DailyOccupancy do
ORDER BY do.[Date], do.Unit
OPTION (MAXRECURSION 366);

DROP TABLE #Hosp;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddRehabUnitParams(cmd);
            cmd.Parameters.Add(NVarCharParam("@MetricOccupancy", RehabHebrew.MetricOccupancy));
            cmd.Parameters.Add(NVarCharParam("@StatusMet", RehabHebrew.StatusMet));
            cmd.Parameters.Add(NVarCharParam("@StatusBelow", RehabHebrew.StatusBelow));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationRecommendedTarget row = new RehabilitationRecommendedTarget();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.ActualValue = reader.GetDecimal(reader.GetOrdinal("ActualValue"));
                    row.TargetValue = reader.GetDecimal(reader.GetOrdinal("TargetValue"));
                    row.Gap = reader.GetDecimal(reader.GetOrdinal("Gap"));
                    row.MetricType = reader["MetricType"] as string ?? string.Empty;
                    row.Status = reader["Status"] as string ?? string.Empty;
                    row.TotalOccupiedPatientDays = reader.GetInt32(reader.GetOrdinal("TotalOccupiedPatientDays"));
                    row.DaysInPeriod = reader.GetInt32(reader.GetOrdinal("DaysInPeriod"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.7 GetRevenueNet — Invoices.Price + CaseNumber + PATIENT_MONITORING.PM_MOVE_DEPART
    // =========================================================================
    public List<RehabilitationRevenueNet> GetRevenueNet(string fromDate, string toDate)
    {
        List<RehabilitationRevenueNet> results = new List<RehabilitationRevenueNet>();

        string sql = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

;WITH MonthlyRevenue AS (
    SELECT
        DATEFROMPARTS(YEAR(inv.InvoiceDate), MONTH(inv.InvoiceDate), 1) AS [Date],
        CASE LTRIM(RTRIM(pm.PM_MOVE_DEPART))
            WHEN N'רגרי-ש' THEN 85
            WHEN N'רשיקום-י' THEN 49
            WHEN N'רשיקום-כ' THEN 150685851
        END AS Unit,
        CASE LTRIM(RTRIM(pm.PM_MOVE_DEPART))
            WHEN N'רגרי-ש' THEN @DeptGeriatric
            WHEN N'רשיקום-י' THEN @DeptPediatric
            WHEN N'רשיקום-כ' THEN @DeptGeneral
        END AS DepartmentName,
        SUM(ISNULL(inv.Price, 0)) AS RevenueAmount,
        COUNT(DISTINCT CAST(inv.InvoiceDate AS date)) AS DaysWithRevenue
    FROM dbo.Invoices inv WITH (NOLOCK)
    INNER JOIN dbo.PATIENT_MONITORING pm WITH (NOLOCK)
        ON TRY_CONVERT(BIGINT, LTRIM(RTRIM(inv.CaseNumber)))
         = TRY_CONVERT(BIGINT, LTRIM(RTRIM(pm.PM_CASE_NUMBER)))
    WHERE LTRIM(RTRIM(pm.PM_MOVE_DEPART)) IN (N'רגרי-ש', N'רשיקום-י', N'רשיקום-כ')
      AND ISNULL(inv.Price, 0) <> 0
      AND inv.InvoiceDate >= DATEADD(month, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      AND inv.InvoiceDate < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY
        DATEFROMPARTS(YEAR(inv.InvoiceDate), MONTH(inv.InvoiceDate), 1),
        LTRIM(RTRIM(pm.PM_MOVE_DEPART))
),
DeptTotals AS (
    SELECT [Date], SUM(RevenueAmount) AS TotalRevenue
    FROM MonthlyRevenue
    GROUP BY [Date]
)
SELECT
    mr.[Date],
    mr.Unit,
    mr.DepartmentName,
    mr.RevenueAmount,
    CASE
        WHEN mr.DaysWithRevenue > 0 THEN CAST(mr.RevenueAmount / mr.DaysWithRevenue AS decimal(18, 2))
        ELSE CAST(0 AS decimal(18, 2))
    END AS RevenuePerDay,
    CASE
        WHEN dt.TotalRevenue > 0 THEN CAST((mr.RevenueAmount / dt.TotalRevenue) * 100.0 AS decimal(10, 2))
        ELSE CAST(0 AS decimal(10, 2))
    END AS SharePercent
FROM MonthlyRevenue mr
INNER JOIN DeptTotals dt ON mr.[Date] = dt.[Date]
WHERE mr.Unit IS NOT NULL
ORDER BY mr.[Date], mr.Unit;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.CommandTimeout = 120;
            AddRehabUnitParams(cmd);
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationRevenueNet row = new RehabilitationRevenueNet();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.RevenueAmount = reader.GetDecimal(reader.GetOrdinal("RevenueAmount"));
                    row.RevenuePerDay = reader.GetDecimal(reader.GetOrdinal("RevenuePerDay"));
                    row.SharePercent = reader.GetDecimal(reader.GetOrdinal("SharePercent"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    public List<RehabilitationRevenueNet> GetRevenueNet()
    {
        return GetRevenueNet(null, null);
    }

    // =========================================================================
    // 1.8 GetTreatments — stub (WHERE 1=0)
    // =========================================================================
    public List<RehabilitationTreatment> GetTreatments(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationTreatment> results = new List<RehabilitationTreatment>();

        string sql = @"
SELECT
    CAST(@FromDate AS date) AS [Date],
    p.ProfessionName,
    CAST(0 AS int) AS TotalTreatments,
    CAST(0 AS decimal(10,2)) AS AvgPerPatientDay,
    d.Unit,
    d.DepartmentName,
    CASE WHEN DATEPART(weekday, CAST(@FromDate AS date)) IN (4, 5) THEN 1 ELSE 0 END AS WeekdayOnly
FROM (
    SELECT ProfessionName FROM (VALUES
        (@ProfPhysio),
        (@ProfOT),
        (@ProfSpeech),
        (@ProfPsych),
        (@ProfNursing)
    ) AS Professions(ProfessionName)
) p
CROSS JOIN (
    SELECT Unit, DepartmentName FROM (VALUES
        (85,  @DeptGeriatric),
        (150685851, @DeptGeneral),
        (49,  @DeptPediatric)
    ) AS Depts(Unit, DepartmentName)
) d
WHERE 1 = 0;
";

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddRehabUnitParams(cmd);
            cmd.Parameters.Add(NVarCharParam("@ProfPhysio", RehabHebrew.ProfPhysio));
            cmd.Parameters.Add(NVarCharParam("@ProfOT", RehabHebrew.ProfOT));
            cmd.Parameters.Add(NVarCharParam("@ProfSpeech", RehabHebrew.ProfSpeech));
            cmd.Parameters.Add(NVarCharParam("@ProfPsych", RehabHebrew.ProfPsych));
            cmd.Parameters.Add(NVarCharParam("@ProfNursing", RehabHebrew.ProfNursing));
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    RehabilitationTreatment row = new RehabilitationTreatment();
                    row.Date = reader.GetDateTime(reader.GetOrdinal("Date"));
                    row.ProfessionName = reader["ProfessionName"] as string ?? string.Empty;
                    row.TotalTreatments = reader.GetInt32(reader.GetOrdinal("TotalTreatments"));
                    row.AvgPerPatientDay = reader.GetDecimal(reader.GetOrdinal("AvgPerPatientDay"));
                    row.Unit = reader.GetInt32(reader.GetOrdinal("Unit"));
                    row.DepartmentName = reader["DepartmentName"] as string ?? string.Empty;
                    row.WeekdayOnly = reader.GetBoolean(reader.GetOrdinal("WeekdayOnly"));
                    results.Add(row);
                }
            }
        }

        return results;
    }

    // =========================================================================
    // 1.1 GetHospitalizationDays — stub (SQL TBD)
    // =========================================================================
    public List<RehabilitationHospitalizationDays> GetHospitalizationDays(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<RehabilitationHospitalizationDays>();
    }

    // =========================================================================
    // 1.2 GetAvgLengthOfStay — stub (SQL TBD)
    // =========================================================================
    public List<RehabilitationAvgLengthOfStay> GetAvgLengthOfStay(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<RehabilitationAvgLengthOfStay>();
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
