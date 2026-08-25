// =============================================================================
// RehabilitationOccupancyService.cs — C# 5 / App_Code (replace entire backend file)
// =============================================================================
// SQL source: dbo.Hospitalizations + dbo.MedicalRecords (NOT PATIENT_MONITORING)
// Connection: Data Source=SRV-APPDB;Initial Catalog=NAMER;... (ChameleonConnection in IIS)
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
    public const string PayClalit = "\u05DB\u05DC\u05DC\u05D9\u05EA";
    public const string PayMaccabi = "\u05DE\u05DB\u05D1\u05D9";
    public const string PayLeumit = "\u05DC\u05D0\u05D5\u05DE\u05D9\u05EA";
    public const string PayMeuhedet = "\u05DE\u05D0\u05D5\u05D7\u05D3\u05EA";
    public const string CatKupatCholim = "\u05E7\u05D5\u05E4\u05EA \u05D7\u05D5\u05DC\u05D9\u05DD";
    public const string PayTzahal = "\u05E6\u05D4\u05F4\u05DC";
    public const string PayDefense = "\u05DE\u05E9\u05E8\u05D3 \u05D4\u05D1\u05D8\u05D7\u05D5\u05DF";
    public const string CatTzahalDefense = "\u05E6\u05D4\u05F4\u05DC + \u05DE\u05E9\u05E8\u05D3 \u05D4\u05D1\u05D8\u05D7\u05D5\u05DF";
    public const string CatOther = "\u05D0\u05D7\u05E8";
    public const string PayerUnassigned = "\u05D8\u05E8\u05DD \u05E9\u05D5\u05D9\u05D9\u05DA";
    public const string MoveRangeHospital = "\u05D0\u05D9\u05E9\u05E4\u05D5\u05D6";
    public const string PayPrivate = "\u05E4\u05E8\u05D8\u05D9";
    public const string PayBituachLeumi = "\u05D1\u05D9\u05D8\u05D5\u05D7 \u05DC\u05D0\u05D5\u05DE\u05D9";
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
    public const string Empty = "";
}

public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "85, 150685851, 49";

    // User-validated connection (IIS ChameleonConnection should match this server/DB)
    private const string DefaultConnectionString =
        "Data Source=SRV-APPDB;Initial Catalog=NAMER;Integrated Security=True";

    private static string GetConnectionString()
    {
        ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["ChameleonConnection"];
        if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
        {
            return settings.ConnectionString;
        }
        return DefaultConnectionString;
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

    private static void AddPayerMappingParams(SqlCommand cmd)
    {
        cmd.Parameters.Add(NVarCharParam("@PayClalit", RehabHebrew.PayClalit));
        cmd.Parameters.Add(NVarCharParam("@PayMaccabi", RehabHebrew.PayMaccabi));
        cmd.Parameters.Add(NVarCharParam("@PayLeumit", RehabHebrew.PayLeumit));
        cmd.Parameters.Add(NVarCharParam("@PayMeuhedet", RehabHebrew.PayMeuhedet));
        cmd.Parameters.Add(NVarCharParam("@CatKupatCholim", RehabHebrew.CatKupatCholim));
        cmd.Parameters.Add(NVarCharParam("@PayTzahal", RehabHebrew.PayTzahal));
        cmd.Parameters.Add(NVarCharParam("@PayDefense", RehabHebrew.PayDefense));
        cmd.Parameters.Add(NVarCharParam("@CatTzahalDefense", RehabHebrew.CatTzahalDefense));
        cmd.Parameters.Add(NVarCharParam("@CatOther", RehabHebrew.CatOther));
        cmd.Parameters.Add(NVarCharParam("@PayerUnassigned", RehabHebrew.PayerUnassigned));
        cmd.Parameters.Add(NVarCharParam("@Empty", RehabHebrew.Empty));
    }

    private static void AddDirectionMappingParams(SqlCommand cmd)
    {
        AddPayerMappingParams(cmd);
        cmd.Parameters.Add(NVarCharParam("@PayPrivate", RehabHebrew.PayPrivate));
        cmd.Parameters.Add(NVarCharParam("@PayBituachLeumi", RehabHebrew.PayBituachLeumi));
        cmd.Parameters.Add(NVarCharParam("@MoveRangeHospital", RehabHebrew.MoveRangeHospital));
        cmd.Parameters.Add(NVarCharParam("@DirectionInternal", RehabHebrew.DirectionInternal));
        cmd.Parameters.Add(NVarCharParam("@DirectionExternal", RehabHebrew.DirectionExternal));
    }

    // =========================================================================
    // 1.3 GetDailyOccupancy — WebMethod: GetRehabilitationOccupancy
    // Source: dbo.Hospitalizations (occupied beds by Unit + date range)
    // =========================================================================
    public List<RehabilitationOccupancy> GetDailyOccupancy(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationOccupancy> results = new List<RehabilitationOccupancy>();

        string sql = @"
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
CROSS JOIN (
    SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName
    UNION ALL SELECT 150685851, @DeptGeneral
    UNION ALL SELECT 49, @DeptPediatric
) su
LEFT JOIN dbo.Hospitalizations h
    ON h.Unit = su.Unit
   AND CAST(h.Hosp_Date AS date) <= dr.dt
   AND (h.Discharge_Date IS NULL OR CAST(h.Discharge_Date AS date) > dr.dt)
WHERE su.Unit IN (" + RehabUnitsInClause + @")
GROUP BY dr.dt, su.Unit, su.DepartmentName
ORDER BY dr.dt, su.Unit
OPTION (MAXRECURSION 366);
";

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddRehabUnitParams(cmd);
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
    // 1.4 GetAdmissionsByPayer — WebMethod: GetRehabilitationAdmissionsByPayer
    // Source: dbo.Hospitalizations + MedicalRecords.Pay_Institute
    // =========================================================================
    public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByPayer> results = new List<RehabilitationAdmissionsByPayer>();

        string sql = @"
SELECT
    CAST(h.Hosp_Date AS date) AS [Date],
    CASE
        WHEN mr.Pay_Institute IN (@PayClalit, @PayMaccabi, @PayLeumit, @PayMeuhedet)
            THEN @CatKupatCholim
        WHEN mr.Pay_Institute IN (@PayTzahal, @PayDefense)
            THEN @CatTzahalDefense
        ELSE @CatOther
    END AS PayerCategory,
    ISNULL(NULLIF(LTRIM(RTRIM(mr.Pay_Institute)), @Empty), @PayerUnassigned) AS PayerName,
    COUNT(*) AS AdmissionsCount,
    su.Unit,
    su.DepartmentName
FROM dbo.Hospitalizations h
INNER JOIN (
    SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName
    UNION ALL SELECT 150685851, @DeptGeneral
    UNION ALL SELECT 49, @DeptPediatric
) su ON h.Unit = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON h.HPID = mr.HPID
WHERE h.Unit IN (" + RehabUnitsInClause + @")
  AND CAST(h.Hosp_Date AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(h.Hosp_Date AS date),
    CASE
        WHEN mr.Pay_Institute IN (@PayClalit, @PayMaccabi, @PayLeumit, @PayMeuhedet)
            THEN @CatKupatCholim
        WHEN mr.Pay_Institute IN (@PayTzahal, @PayDefense)
            THEN @CatTzahalDefense
        ELSE @CatOther
    END,
    ISNULL(NULLIF(LTRIM(RTRIM(mr.Pay_Institute)), @Empty), @PayerUnassigned),
    su.Unit,
    su.DepartmentName
ORDER BY [Date], su.Unit, PayerCategory, PayerName;
";

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddPayerMappingParams(cmd);
            AddRehabUnitParams(cmd);
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
    // 1.5 GetAdmissionsByDirection — WebMethod: GetRehabilitationAdmissionsByDirection
    // Source: dbo.Hospitalizations + MedicalRecords; Admitted_From = אישפוז => פנים
    // @FromDate/@ToDate: SqlDbType.Date (not DateTime)
    // =========================================================================
    public List<RehabilitationAdmissionsByDirection> GetAdmissionsByDirection(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByDirection> results = new List<RehabilitationAdmissionsByDirection>();

        string sql = @"
SELECT
    CAST(h.Hosp_Date AS date) AS [Date],
    CASE
        WHEN mr.Pay_Institute IN (@PayClalit, @PayMaccabi, @PayLeumit, @PayMeuhedet)
            THEN @CatKupatCholim
        WHEN mr.Pay_Institute IN (@PayTzahal, @PayDefense)
            THEN @CatTzahalDefense
        WHEN mr.Pay_Institute = @PayPrivate
            THEN @PayPrivate
        WHEN mr.Pay_Institute = @PayBituachLeumi
            THEN @PayBituachLeumi
        ELSE @CatOther
    END AS FunderName,
    CASE
        WHEN h.Admitted_From = @MoveRangeHospital THEN @DirectionInternal
        ELSE @DirectionExternal
    END AS Direction,
    COUNT(*) AS AdmissionsCount,
    su.Unit,
    su.DepartmentName
FROM dbo.Hospitalizations h
INNER JOIN (
    SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName
    UNION ALL SELECT 150685851, @DeptGeneral
    UNION ALL SELECT 49, @DeptPediatric
) su ON h.Unit = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON h.HPID = mr.HPID
WHERE h.Unit IN (" + RehabUnitsInClause + @")
  AND CAST(h.Hosp_Date AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(h.Hosp_Date AS date),
    CASE
        WHEN mr.Pay_Institute IN (@PayClalit, @PayMaccabi, @PayLeumit, @PayMeuhedet)
            THEN @CatKupatCholim
        WHEN mr.Pay_Institute IN (@PayTzahal, @PayDefense)
            THEN @CatTzahalDefense
        WHEN mr.Pay_Institute = @PayPrivate
            THEN @PayPrivate
        WHEN mr.Pay_Institute = @PayBituachLeumi
            THEN @PayBituachLeumi
        ELSE @CatOther
    END,
    CASE
        WHEN h.Admitted_From = @MoveRangeHospital THEN @DirectionInternal
        ELSE @DirectionExternal
    END,
    su.Unit,
    su.DepartmentName
ORDER BY [Date], su.Unit, Direction, FunderName;
";

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(DateParam("@FromDate", from));
            cmd.Parameters.Add(DateParam("@ToDate", to));
            AddDirectionMappingParams(cmd);
            AddRehabUnitParams(cmd);
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
    // 1.6 GetRecommendedTargets — WebMethod: GetRehabilitationRecommendedTargets
    // Occupancy from dbo.Hospitalizations (same logic as 1.3)
    // =========================================================================
    public List<RehabilitationRecommendedTarget> GetRecommendedTargets(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationRecommendedTarget> results = new List<RehabilitationRecommendedTarget>();

        string sql = @"
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
    LEFT JOIN dbo.Hospitalizations h
        ON h.Unit = su.Unit
       AND CAST(h.Hosp_Date AS date) <= dr.dt
       AND (h.Discharge_Date IS NULL OR CAST(h.Discharge_Date AS date) > dr.dt)
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
";

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
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
    // 1.7 GetRevenueNet — WebMethod: GetRehabilitationRevenueNet
    // Rolling 12 months; ignores fromDate/toDate request params
    // =========================================================================
    public List<RehabilitationRevenueNet> GetRevenueNet(string fromDate, string toDate)
    {
        List<RehabilitationRevenueNet> results = new List<RehabilitationRevenueNet>();

        string sql = @"
;WITH MonthlyRevenue AS (
    SELECT
        DATEFROMPARTS(YEAR(CAST(h.Hosp_Date AS date)), MONTH(CAST(h.Hosp_Date AS date)), 1) AS [Date],
        su.Unit,
        su.DepartmentName,
        SUM(ISNULL(inv.NetAmount, 0)) AS RevenueAmount,
        COUNT(DISTINCT CAST(h.Hosp_Date AS date)) AS DaysWithRevenue
    FROM dbo.Hospitalizations h
    INNER JOIN (
        SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName
        UNION ALL SELECT 150685851, @DeptGeneral
        UNION ALL SELECT 49, @DeptPediatric
    ) su ON h.Unit = su.Unit
    LEFT JOIN dbo.Invoices inv ON inv.HPID = h.HPID AND inv.InvoiceDate = CAST(h.Hosp_Date AS date)
    WHERE h.Unit IN (" + RehabUnitsInClause + @")
      AND CAST(h.Hosp_Date AS date) >= DATEADD(month, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      AND CAST(h.Hosp_Date AS date) < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY
        DATEFROMPARTS(YEAR(CAST(h.Hosp_Date AS date)), MONTH(CAST(h.Hosp_Date AS date)), 1),
        su.Unit,
        su.DepartmentName
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
ORDER BY mr.[Date], mr.Unit;
";

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
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
    // 1.8 GetTreatments — WebMethod: GetRehabilitationTreatments (stub)
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

        using (SqlConnection conn = new SqlConnection(GetConnectionString()))
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
