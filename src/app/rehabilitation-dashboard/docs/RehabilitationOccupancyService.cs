// =============================================================================
// RehabilitationOccupancyService.cs — C# 5 / App_Code (replace entire backend file)
// =============================================================================
// Connection: connetionString → SRV-APPDB / NAMER (IIS ChameleonConnection must match)
// Chameleon (linked): [SRV-CP-DB-3].[Chameleon].[dbo].Hospitalizations / MedicalRecords / SystemUnits / Patients
// Local NAMER: dbo.PATIENT_MONITORING, dbo.Invoices, dbo.Pay_Institute
// Occupancy / payer / targets: Chameleon Hospitalizations (Admission_No, Admission_Date, Release_Date)
// Direction: dbo.PATIENT_MONITORING (ROW_NUMBER) + Chameleon MedicalRecords
// Revenue: dbo.Invoices.Price + CaseNumber + PATIENT_MONITORING.PM_MOVE_DEPART
// Dates: ParseExact yyyy-MM-dd + SqlDbType.Date on ALL @FromDate/@ToDate params
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

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

public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "85, 150685851, 49";
    private const string ChameleonHospitalizations = "[SRV-CP-DB-3].[Chameleon].[dbo].[Hospitalizations]";
    private const string ChameleonMedicalRecords = "[SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords]";
    private const string ChameleonSystemUnits = "[SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits]";
    private const string ChameleonPatients = "[SRV-CP-DB-3].[Chameleon].[dbo].[Patients]";

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
        cmd.Parameters.Add(NVarCharParam("@DeptGeriatric", "\u05D4\u05DE\u05D7\u05DC\u05E7\u05D4 \u05DC\u05D2\u05E8\u05D9\u05D0\u05D8\u05E8\u05D9\u05D4 \u05E9\u05D9\u05E7\u05D5\u05DE\u05D9\u05EA"));
        cmd.Parameters.Add(NVarCharParam("@DeptGeneral", "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05DB\u05DC\u05DC\u05D9"));
        cmd.Parameters.Add(NVarCharParam("@DeptPediatric", "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05D9\u05DC\u05D3\u05D9\u05DD"));
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
    su.Name AS DepartmentName,
    COUNT(DISTINCT h.Admission_No) AS OccupiedPatients
FROM DateRange dr
CROSS JOIN " + ChameleonSystemUnits + @" su WITH (NOLOCK)
LEFT JOIN #Hosp h
    ON h.Unit = su.Unit
   AND h.HospDate <= dr.dt
   AND (h.ReleaseDate IS NULL OR h.ReleaseDate > dr.dt)
WHERE su.Hospital = 34
  AND su.Unit IN (" + RehabUnitsInClause + @")
GROUP BY dr.dt, su.Unit, su.Name
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
        CAST(h.Admission_Date AS date) AS AdmissionDate,
        h.Unit,
        su.Name AS DepartmentName,
        h.Admission_No,
        ROW_NUMBER() OVER (
            PARTITION BY h.Admission_No
            ORDER BY h.Admission_Date
        ) AS rn
    FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
    INNER JOIN " + ChameleonSystemUnits + @" su WITH (NOLOCK) ON h.Unit = su.Unit
    WHERE h.Hospital = 34
      AND h.Delete_Date IS NULL
      AND h.Unit IN (" + RehabUnitsInClause + @")
      AND CAST(h.Admission_Date AS date) BETWEEN @FromDate AND @ToDate
),
FirstAdmissions AS (
    SELECT AdmissionDate, Unit, DepartmentName, Admission_No
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
    FROM " + ChameleonMedicalRecords + @" mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (" + RehabUnitsInClause + @")
      AND mr.Admission_No = fa.Admission_No
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
    FROM " + ChameleonMedicalRecords + @" mr WITH (NOLOCK)
    WHERE mr.Hospital = 34
      AND mr.Unit IN (" + RehabUnitsInClause + @")
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
    h.Admission_No,
    h.Unit,
    CAST(h.Admission_Date AS date) AS HospDate,
    CAST(h.Release_Date AS date) AS ReleaseDate
INTO #Hosp
FROM " + ChameleonHospitalizations + @" h WITH (NOLOCK)
LEFT JOIN " + ChameleonPatients + @" p WITH (NOLOCK) ON h.Patient = p.Patient
WHERE h.Hospital = 34
  AND h.Delete_Date IS NULL
  AND h.Unit IN (" + RehabUnitsInClause + @")
  AND CAST(h.Admission_Date AS date) <= @ToDate
  AND (h.Release_Date IS NULL OR CAST(h.Release_Date AS date) > @FromDate)
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
        COUNT(DISTINCT h.Admission_No) AS OccupiedPatients
    FROM DateRange dr
    CROSS JOIN (
        SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName, 18 AS Beds
        UNION ALL SELECT 150685851, @DeptGeneral, 35
        UNION ALL SELECT 49, @DeptPediatric, 14
    ) su
    LEFT JOIN #Hosp h
        ON h.Unit = su.Unit
       AND h.HospDate <= dr.dt
       AND (h.ReleaseDate IS NULL OR h.ReleaseDate > dr.dt)
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
            cmd.Parameters.Add(NVarCharParam("@MetricOccupancy", "\u05EA\u05E4\u05D5\u05E1\u05D4"));
            cmd.Parameters.Add(NVarCharParam("@StatusMet", "\u05E2\u05D5\u05DE\u05D3 \u05D1\u05D9\u05E2\u05D3"));
            cmd.Parameters.Add(NVarCharParam("@StatusBelow", "\u05DE\u05EA\u05D7\u05EA \u05DC\u05D9\u05E2\u05D3"));
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
        return GetRevenueNetInternal();
    }

    private List<RehabilitationRevenueNet> GetRevenueNetInternal()
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
            cmd.Parameters.Add(NVarCharParam("@ProfPhysio", "\u05E4\u05D9\u05D6\u05D9\u05D5\u05EA\u05E8\u05E4\u05D9\u05D4"));
            cmd.Parameters.Add(NVarCharParam("@ProfOT", "\u05E8\u05D9\u05E4\u05D5\u05D9 \u05D1\u05E2\u05D9\u05E1\u05D5\u05E7"));
            cmd.Parameters.Add(NVarCharParam("@ProfSpeech", "\u05E7\u05DC\u05D9\u05E0\u05D0\u05D5\u05EA \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA"));
            cmd.Parameters.Add(NVarCharParam("@ProfPsych", "\u05E4\u05E1\u05D9\u05DB\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4"));
            cmd.Parameters.Add(NVarCharParam("@ProfNursing", "\u05E1\u05D9\u05E2\u05D5\u05D3 \u05E9\u05D9\u05E7\u05D5\u05DE\u05D9"));
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
