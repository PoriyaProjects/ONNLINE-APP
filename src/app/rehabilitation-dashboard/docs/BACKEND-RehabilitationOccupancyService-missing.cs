// Lines 164-175: Hebrew SqlParameter .Value = "\u05E7\u05D5\u05E4\u05EA \u05D7\u05D5\u05DC\u05D9\u05DD" (unicode escapes, not SQL literals in C#).
// C# 5 / App_Code — copy entire file to App_Code/RehabilitationOccupancyService.cs (replace file).
// ParseExact yyyy-MM-dd + SqlDbType.Date on all date parameters (fixes d:[] empty responses).

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
    public const string MoveStatusApproved = "\u05D0\u05D9\u05E9\u05D5\u05E8";
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
    public const string MoveCatAdmission = "\u05E7\u05D1\u05DC\u05D4";
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

public static class RehabDateParse
{
    private static readonly string[] Formats = new string[] { "yyyy-MM-dd" };

    public static void ParseRange(string fromDate, string toDate, out DateTime from, out DateTime to)
    {
        string fromText = fromDate == null ? null : fromDate.Trim();
        string toText = toDate == null ? null : toDate.Trim();

        if (!DateTime.TryParseExact(fromText, Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out from))
        {
            throw new ArgumentException("FromDate must be yyyy-MM-dd", "fromDate");
        }
        if (!DateTime.TryParseExact(toText, Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out to))
        {
            throw new ArgumentException("ToDate must be yyyy-MM-dd", "toDate");
        }
        if (to < from)
        {
            throw new ArgumentException("ToDate must be >= FromDate");
        }
    }

    public static SqlParameter DateParam(string name, DateTime value)
    {
        SqlParameter param = new SqlParameter(name, SqlDbType.Date);
        param.Value = value.Date;
        return param;
    }
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

public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "85, 150685851, 49";

    private static string GetChameleonConnection()
    {
        return ConfigurationManager.ConnectionStrings["ChameleonConnection"].ConnectionString;
    }

    private static SqlParameter NVarCharParam(string name, string value)
    {
        SqlParameter param = new SqlParameter(name, SqlDbType.NVarChar);
        param.Value = value;
        return param;
    }

    private static void AddDailyOccupancyHebrewParams(SqlCommand cmd)
    {
        SqlParameter statusParam = new SqlParameter("@MoveStatusApproved", SqlDbType.NVarChar);
        statusParam.Value = "\u05D0\u05D9\u05E9\u05D5\u05E8";
        cmd.Parameters.Add(statusParam);
        SqlParameter deptGeriatricParam = new SqlParameter("@DeptGeriatric", SqlDbType.NVarChar);
        deptGeriatricParam.Value = "\u05D4\u05DE\u05D7\u05DC\u05E7\u05D4 \u05DC\u05D2\u05E8\u05D9\u05D0\u05D8\u05E8\u05D9\u05D4 \u05E9\u05D9\u05E7\u05D5\u05DE\u05D9\u05EA";
        cmd.Parameters.Add(deptGeriatricParam);
        SqlParameter deptGeneralParam = new SqlParameter("@DeptGeneral", SqlDbType.NVarChar);
        deptGeneralParam.Value = "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05DB\u05DC\u05DC\u05D9";
        cmd.Parameters.Add(deptGeneralParam);
        SqlParameter deptPediatricParam = new SqlParameter("@DeptPediatric", SqlDbType.NVarChar);
        deptPediatricParam.Value = "\u05DE\u05D7\u05DC\u05E7\u05EA \u05E9\u05D9\u05E7\u05D5\u05DD \u05D9\u05DC\u05D3\u05D9\u05DD";
        cmd.Parameters.Add(deptPediatricParam);
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

    public List<RehabilitationOccupancy> GetDailyOccupancy(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        RehabDateParse.ParseRange(fromDate, toDate, out from, out to);

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
    COUNT(DISTINCT pm.PM_HPID) AS OccupiedPatients
FROM DateRange dr
CROSS JOIN (
    SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName
    UNION ALL SELECT 150685851, @DeptGeneral
    UNION ALL SELECT 49, @DeptPediatric
) su
LEFT JOIN dbo.PATIENT_MONITORING pm
    ON pm.PM_MOVE_DEPART_UNIT = su.Unit
   AND CAST(pm.PM_MOVE_DATE AS date) <= dr.dt
   AND (pm.PM_MOVE_DATE_END IS NULL OR CAST(pm.PM_MOVE_DATE_END AS date) > dr.dt)
   AND pm.PM_MOVE_STATUS = @MoveStatusApproved
WHERE su.Unit IN (" + RehabUnitsInClause + @")
GROUP BY dr.dt, su.Unit, su.DepartmentName
ORDER BY dr.dt, su.Unit
OPTION (MAXRECURSION 366);
";

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
            AddDailyOccupancyHebrewParams(cmd);
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

    public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        RehabDateParse.ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByPayer> results = new List<RehabilitationAdmissionsByPayer>();

        string sql = @"
SELECT
    CAST(pm.PM_MOVE_DATE AS date) AS [Date],
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
FROM dbo.PATIENT_MONITORING pm
INNER JOIN dbo.SystemUnits su ON pm.PM_MOVE_DEPART_UNIT = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON pm.PM_HPID = mr.HPID
WHERE su.Unit IN (" + RehabUnitsInClause + @")
  AND pm.PM_MOVE_RANGE = @MoveRangeHospital
  AND pm.PM_MOVE_CAT = @MoveCatAdmission
  AND CAST(pm.PM_MOVE_DATE AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(pm.PM_MOVE_DATE AS date),
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

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
            AddPayerMappingParams(cmd);
            cmd.Parameters.Add(NVarCharParam("@MoveRangeHospital", RehabHebrew.MoveRangeHospital));
            cmd.Parameters.Add(NVarCharParam("@MoveCatAdmission", RehabHebrew.MoveCatAdmission));
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

    public List<RehabilitationAdmissionsByDirection> GetAdmissionsByDirection(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        RehabDateParse.ParseRange(fromDate, toDate, out from, out to);

        List<RehabilitationAdmissionsByDirection> results = new List<RehabilitationAdmissionsByDirection>();

        string sql = @"
SELECT
    CAST(pm.PM_MOVE_DATE AS date) AS [Date],
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
        WHEN pm.PM_MOVE_RANGE = @MoveRangeHospital THEN @DirectionInternal
        ELSE @DirectionExternal
    END AS Direction,
    COUNT(*) AS AdmissionsCount,
    su.Unit,
    su.DepartmentName
FROM dbo.PATIENT_MONITORING pm
INNER JOIN dbo.SystemUnits su ON pm.PM_MOVE_DEPART_UNIT = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON pm.PM_HPID = mr.HPID
WHERE su.Unit IN (" + RehabUnitsInClause + @")
  AND pm.PM_MOVE_CAT = @MoveCatAdmission
  AND CAST(pm.PM_MOVE_DATE AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(pm.PM_MOVE_DATE AS date),
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
        WHEN pm.PM_MOVE_RANGE = @MoveRangeHospital THEN @DirectionInternal
        ELSE @DirectionExternal
    END,
    su.Unit,
    su.DepartmentName
ORDER BY [Date], su.Unit, Direction, FunderName;
";

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
            AddDirectionMappingParams(cmd);
            cmd.Parameters.Add(NVarCharParam("@MoveCatAdmission", RehabHebrew.MoveCatAdmission));
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

    public List<RehabilitationRecommendedTarget> GetRecommendedTargets(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        RehabDateParse.ParseRange(fromDate, toDate, out from, out to);

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
        COUNT(DISTINCT pm.PM_HPID) AS OccupiedPatients
    FROM DateRange dr
    CROSS JOIN (
        SELECT 85 AS Unit, @DeptGeriatric AS DepartmentName, 18 AS Beds
        UNION ALL SELECT 150685851, @DeptGeneral, 35
        UNION ALL SELECT 49, @DeptPediatric, 14
    ) su
    LEFT JOIN dbo.PATIENT_MONITORING pm
        ON pm.PM_MOVE_DEPART_UNIT = su.Unit
       AND CAST(pm.PM_MOVE_DATE AS date) <= dr.dt
       AND (pm.PM_MOVE_DATE_END IS NULL OR CAST(pm.PM_MOVE_DATE_END AS date) > dr.dt)
       AND pm.PM_MOVE_STATUS = @MoveStatusApproved
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

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
            AddRehabUnitParams(cmd);
            cmd.Parameters.Add(NVarCharParam("@MoveStatusApproved", RehabHebrew.MoveStatusApproved));
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

    public List<RehabilitationRevenueNet> GetRevenueNet(string fromDate, string toDate)
    {
        List<RehabilitationRevenueNet> results = new List<RehabilitationRevenueNet>();

        string sql = @"
;WITH MonthlyRevenue AS (
    SELECT
        DATEFROMPARTS(YEAR(CAST(pm.PM_MOVE_DATE AS date)), MONTH(CAST(pm.PM_MOVE_DATE AS date)), 1) AS [Date],
        su.Unit,
        su.DepartmentName,
        SUM(ISNULL(inv.NetAmount, 0)) AS RevenueAmount,
        COUNT(DISTINCT CAST(pm.PM_MOVE_DATE AS date)) AS DaysWithRevenue
    FROM dbo.PATIENT_MONITORING pm
    INNER JOIN dbo.SystemUnits su ON pm.PM_MOVE_DEPART_UNIT = su.Unit
    LEFT JOIN dbo.Invoices inv ON inv.HPID = pm.PM_HPID AND inv.InvoiceDate = CAST(pm.PM_MOVE_DATE AS date)
    WHERE su.Unit IN (" + RehabUnitsInClause + @")
      AND CAST(pm.PM_MOVE_DATE AS date) >= DATEADD(month, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      AND CAST(pm.PM_MOVE_DATE AS date) < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY
        DATEFROMPARTS(YEAR(CAST(pm.PM_MOVE_DATE AS date)), MONTH(CAST(pm.PM_MOVE_DATE AS date)), 1),
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

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
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

    public List<RehabilitationTreatment> GetTreatments(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        RehabDateParse.ParseRange(fromDate, toDate, out from, out to);

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

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
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
