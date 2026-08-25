// =============================================================================
// Replace entire RehabilitationOccupancyService.cs with this file
// =============================================================================
// ASP.NET App_Code · C# 5 compatible · no namespace
// Connection: ConfigurationManager.ConnectionStrings["ChameleonConnection"]
// Frontend contract: rehabilitation-dashboard/docs/README.md
// WebMethods in WebService.cs call these service methods (string FromDate/ToDate).
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

// ---------------------------------------------------------------------------
// ParseD — yyyy-MM-dd + SqlDbType.Date (not DateTime.Parse / SqlDbType.DateTime)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
public class RehabilitationOccupancyService
{
    private const string RehabUnitsInClause = "85, 150685851, 49";

    private static string GetChameleonConnection()
    {
        return ConfigurationManager.ConnectionStrings["ChameleonConnection"].ConnectionString;
    }

    // =========================================================================
    // 1.3 GetDailyOccupancy — WebMethod: GetRehabilitationOccupancy
    // =========================================================================
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
    SELECT 85 AS Unit, N'המחלקה לגריאטריה שיקומית' AS DepartmentName
    UNION ALL SELECT 150685851, N'מחלקת שיקום כללי'
    UNION ALL SELECT 49, N'מחלקת שיקום ילדים'
) su
LEFT JOIN dbo.PATIENT_MONITORING pm
    ON pm.PM_MOVE_DEPART_UNIT = su.Unit
   AND CAST(pm.PM_MOVE_DATE AS date) <= dr.dt
   AND (pm.PM_MOVE_DATE_END IS NULL OR CAST(pm.PM_MOVE_DATE_END AS date) > dr.dt)
   AND pm.PM_MOVE_STATUS = N'אישור'
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
    // =========================================================================
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
        WHEN mr.Pay_Institute IN (N'כללית', N'מכבי', N'לאומית', N'מאוחדת')
            THEN N'קופת חולים'
        WHEN mr.Pay_Institute IN (N'צה״ל', N'משרד הביטחון')
            THEN N'צה״ל + משרד הביטחון'
        ELSE N'אחר'
    END AS PayerCategory,
    ISNULL(NULLIF(LTRIM(RTRIM(mr.Pay_Institute)), N''), N'טרם שוייך') AS PayerName,
    COUNT(*) AS AdmissionsCount,
    su.Unit,
    su.DepartmentName
FROM dbo.PATIENT_MONITORING pm
INNER JOIN dbo.SystemUnits su ON pm.PM_MOVE_DEPART_UNIT = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON pm.PM_HPID = mr.HPID
WHERE su.Unit IN (" + RehabUnitsInClause + @")
  AND pm.PM_MOVE_RANGE = N'אישפוז'
  AND pm.PM_MOVE_CAT = N'קבלה'
  AND CAST(pm.PM_MOVE_DATE AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(pm.PM_MOVE_DATE AS date),
    CASE
        WHEN mr.Pay_Institute IN (N'כללית', N'מכבי', N'לאומית', N'מאוחדת')
            THEN N'קופת חולים'
        WHEN mr.Pay_Institute IN (N'צה״ל', N'משרד הביטחון')
            THEN N'צה״ל + משרד הביטחון'
        ELSE N'אחר'
    END,
    ISNULL(NULLIF(LTRIM(RTRIM(mr.Pay_Institute)), N''), N'טרם שוייך'),
    su.Unit,
    su.DepartmentName
ORDER BY [Date], su.Unit, PayerCategory, PayerName;
";

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
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
    // Uses SqlDbType.Date on PATIENT_MONITORING.PM_MOVE_DATE (not DateTime).
    // PM_MOVE_RANGE = N'אישפוז' => Direction = N'פנים'.
    // =========================================================================
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
        WHEN mr.Pay_Institute IN (N'כללית', N'מכבי', N'לאומית', N'מאוחדת')
            THEN N'קופת חולים'
        WHEN mr.Pay_Institute IN (N'צה״ל', N'משרד הביטחון')
            THEN N'צה״ל + משרד הביטחון'
        WHEN mr.Pay_Institute = N'פרטי'
            THEN N'פרטי'
        WHEN mr.Pay_Institute = N'ביטוח לאומי'
            THEN N'ביטוח לאומי'
        ELSE N'אחר'
    END AS FunderName,
    CASE
        WHEN pm.PM_MOVE_RANGE = N'אישפוז' THEN N'פנים'
        ELSE N'חוץ'
    END AS Direction,
    COUNT(*) AS AdmissionsCount,
    su.Unit,
    su.DepartmentName
FROM dbo.PATIENT_MONITORING pm
INNER JOIN dbo.SystemUnits su ON pm.PM_MOVE_DEPART_UNIT = su.Unit
LEFT JOIN dbo.MedicalRecords mr ON pm.PM_HPID = mr.HPID
WHERE su.Unit IN (" + RehabUnitsInClause + @")
  AND pm.PM_MOVE_CAT = N'קבלה'
  AND CAST(pm.PM_MOVE_DATE AS date) BETWEEN @FromDate AND @ToDate
GROUP BY
    CAST(pm.PM_MOVE_DATE AS date),
    CASE
        WHEN mr.Pay_Institute IN (N'כללית', N'מכבי', N'לאומית', N'מאוחדת')
            THEN N'קופת חולים'
        WHEN mr.Pay_Institute IN (N'צה״ל', N'משרד הביטחון')
            THEN N'צה״ל + משרד הביטחון'
        WHEN mr.Pay_Institute = N'פרטי'
            THEN N'פרטי'
        WHEN mr.Pay_Institute = N'ביטוח לאומי'
            THEN N'ביטוח לאומי'
        ELSE N'אחר'
    END,
    CASE
        WHEN pm.PM_MOVE_RANGE = N'אישפוז' THEN N'פנים'
        ELSE N'חוץ'
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
    // =========================================================================
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
        SELECT 85 AS Unit, N'המחלקה לגריאטריה שיקומית' AS DepartmentName, 18 AS Beds
        UNION ALL SELECT 150685851, N'מחלקת שיקום כללי', 35
        UNION ALL SELECT 49, N'מחלקת שיקום ילדים', 14
    ) su
    LEFT JOIN dbo.PATIENT_MONITORING pm
        ON pm.PM_MOVE_DEPART_UNIT = su.Unit
       AND CAST(pm.PM_MOVE_DATE AS date) <= dr.dt
       AND (pm.PM_MOVE_DATE_END IS NULL OR CAST(pm.PM_MOVE_DATE_END AS date) > dr.dt)
       AND pm.PM_MOVE_STATUS = N'אישור'
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
    N'תפוסה' AS MetricType,
    CASE
        WHEN do.Beds > 0 AND (CAST(do.OccupiedPatients AS decimal(10, 2)) / do.Beds) * 100.0 >= 95.0
            THEN N'עומד ביעד'
        ELSE N'מתחת ליעד'
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
    // Ignores fromDate/toDate — rolling 12 months from GETDATE().
    // =========================================================================
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

    // =========================================================================
    // 1.8 GetTreatments — WebMethod: GetRehabilitationTreatments (stub)
    // =========================================================================
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
        (N'פיזיותרפיה'),
        (N'ריפוי בעיסוק'),
        (N'קלינאות תקשורת'),
        (N'פסיכולוגיה'),
        (N'סיעוד שיקומי')
    ) AS Professions(ProfessionName)
) p
CROSS JOIN (
    SELECT Unit, DepartmentName FROM (VALUES
        (85,  N'המחלקה לגריאטריה שיקומית'),
        (150685851, N'מחלקת שיקום כללי'),
        (49,  N'מחלקת שיקום ילדים')
    ) AS Depts(Unit, DepartmentName)
) d
WHERE 1 = 0;
";

        using (SqlConnection conn = new SqlConnection(GetChameleonConnection()))
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
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
