// =============================================================================
// PciDashboardService.cs — paste into App_Code (C# 5 compatible)
// =============================================================================
// מקור: NAMER.dbo.RouiPCI
// Connection: ChameleonConnection → SRV-APPDB / NAMER
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Web.Script.Serialization;

public class PciDashboardService
{
    private const string PciTable = "[NAMER].[dbo].[RouiPCI]";
    private static JavaScriptSerializer Json;
    private static string connetionString;

    static PciDashboardService()
    {
        Json = new JavaScriptSerializer();
        Json.MaxJsonLength = int.MaxValue;

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

    private static string EmptyArray()
    {
        return "[]";
    }

    private static int ParseYear(string baseYear)
    {
        int year;
        if (!int.TryParse((baseYear ?? "").Trim(), out year) || year <= 0)
        {
            year = DateTime.Now.Year;
        }
        return year;
    }

    private static string SqlWeekPartExpr()
    {
        return "CASE WHEN [סוף / אמצע שבוע] IN (N'אמצ\"ש', N'אמצע שבוע') THEN N'אמצע שבוע' ELSE ISNULL([סוף / אמצע שבוע], N'') END";
    }

    private static string SqlRoomMinutesExpr()
    {
        return "CASE WHEN [זמן חדר] IS NULL THEN 0 WHEN TRY_CAST([זמן חדר] AS time) IS NOT NULL THEN DATEDIFF(MINUTE, CAST('00:00' AS time), TRY_CAST([זמן חדר] AS time)) ELSE TRY_CAST([זמן חדר] AS int) END";
    }

    private static void AddCommonFilters(SqlCommand cmd, string department, string surgeryType, string shift, string weekend, string rooms)
    {
        cmd.Parameters.AddWithValue("@department", (department ?? "").Trim());
        cmd.Parameters.AddWithValue("@surgeryType", (surgeryType ?? "").Trim());
        cmd.Parameters.AddWithValue("@shift", (shift ?? "").Trim());
        cmd.Parameters.AddWithValue("@weekend", (weekend ?? "").Trim().ToLowerInvariant());
        cmd.Parameters.AddWithValue("@rooms", (rooms ?? "").Trim());
    }

    private static string BuildCommonAndClause()
    {
        return @"
  AND (@department = '' OR ISNULL([מחלקה], [יחידה]) = @department)
  AND (@surgeryType = '' OR [סוג ניתוח] = @surgeryType)
  AND (@shift = '' OR [משמרת] = @shift)
  AND (
        @weekend = ''
        OR (@weekend = 'false' AND " + SqlWeekPartExpr() + @" = N'אמצע שבוע')
        OR (@weekend = 'true' AND " + SqlWeekPartExpr() + @" <> N'אמצע שבוע')
      )
  AND (@rooms = '' OR CAST([חדר ניתוח] AS nvarchar(50)) = @rooms)";
    }

    private static string QueryToJson(string sql, Action<SqlCommand> bind)
    {
        List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                bind(cmd);
                conn.Open();
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        Dictionary<string, object> row = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            object val = reader.GetValue(i);
                            row[reader.GetName(i)] = val == DBNull.Value ? null : val;
                        }
                        rows.Add(row);
                    }
                }
            }
        }
        return Json.Serialize(rows);
    }

    // -------------------------------------------------------------------------
    // Main dashboard
    // -------------------------------------------------------------------------

    public string GetCountByDept(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT
    [שנה] AS [Year],
    ISNULL([מחלקה], [יחידה]) AS [Wing],
    ISNULL([מחלקה], [יחידה]) AS [Department],
    [מנתח אחראי] AS [Doctor],
    MONTH([תאריך ניתוח]) AS [Month],
    [משמרת] AS [Shift],
    [סוג ניתוח] AS [UnifiedSurgeryType],
    " + SqlWeekPartExpr() + @" AS [WeekPart],
    KerenOfHos AS [FundType],
    CAST([חדר ניתוח] AS nvarchar(50)) AS [SurgeryRoom],
    COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] = @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה]), [מנתח אחראי], MONTH([תאריך ניתוח]), [משמרת], [סוג ניתוח], " + SqlWeekPartExpr() + @", KerenOfHos, CAST([חדר ניתוח] AS nvarchar(50))";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetMonthlyCounts(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], MONTH([תאריך ניתוח]) AS [Month], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], MONTH([תאריך ניתוח])
ORDER BY [Year], [Month]";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetSurgeriesByDepartment(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Department], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה])
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetCountByDoctor(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], [מנתח אחראי] AS [DoctorName], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], [מנתח אחראי]
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetDepartmentYoY()
    {
        string sql = @"
SELECT ISNULL([מחלקה], [יחידה]) AS [DepartmentName],
       SUM(CASE WHEN [שנה] = YEAR(GETDATE()) - 1 THEN ISNULL([סך הכנסות נטו נומינלי], 0) ELSE 0 END) AS [Income2024],
       SUM(CASE WHEN [שנה] = YEAR(GETDATE()) THEN ISNULL([סך הכנסות נטו נומינלי], 0) ELSE 0 END) AS [Income2025]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] >= YEAR(GETDATE()) - 1
GROUP BY ISNULL([מחלקה], [יחידה])
ORDER BY [Income2025] DESC";
        return QueryToJson(sql, delegate(SqlCommand cmd) { });
    }

    public string GetUniqueDiagnoses()
    {
        return EmptyArray();
    }

    public string GetDepRoomFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Wing],
       COUNT(DISTINCT CAST([חדר ניתוח] AS nvarchar(50))) AS [RoomCount],
       COUNT(*) AS [SurgeryCount]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה])";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetAvgDurationYearlyFiveYears(string baseYear)
    {
        return GetAvgDurationFiveYears(baseYear, "", "", "", "", "false", "", "");
    }

    public string GetAvgDurationFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Wing],
       AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float)) AS [AvgDurationMinutes]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה])";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetAvgFirstMorningEntry(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryRoomTimeMetric(baseYear, department, surgeryType, shift, weekend, rooms, "[תאריך ושעת כניסה לחדר]");
    }

    public string GetAvgLastMorningEnd(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryRoomTimeMetric(baseYear, department, surgeryType, shift, weekend, rooms, "[תאריך ושעת יציאה מהחדר]");
    }

    public string GetAvgSetup(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Wing],
       AVG(CAST(DATEDIFF(MINUTE, [תאריך ושעת כניסה לחדר], [תאריך ושעת תחילת ניתוח-חתך]) AS float)) AS [AvgSetupMinutes]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
  AND [תאריך ושעת כניסה לחדר] IS NOT NULL
  AND [תאריך ושעת תחילת ניתוח-חתך] IS NOT NULL
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה])";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    private string QueryRoomTimeMetric(string baseYear, string department, string surgeryType, string shift, string weekend, string rooms, string column)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Wing],
       AVG(CAST(DATEPART(HOUR, " + column + @") * 60 + DATEPART(MINUTE, " + column + @") AS float)) AS [AvgMinutesFromMidnight]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
  AND " + column + @" IS NOT NULL
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה])";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetAvgSurgeriesPerDayPerRoomFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], ISNULL([מחלקה], [יחידה]) AS [Wing],
       CAST([חדר ניתוח] AS nvarchar(50)) AS [Room],
       COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT CAST([תאריך ניתוח] AS date)), 0) AS [AvgSurgeriesPerDay]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY [שנה], ISNULL([מחלקה], [יחידה]), CAST([חדר ניתוח] AS nvarchar(50))";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, weekend, rooms);
        });
    }

    public string GetLossByWingYear(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return EmptyArray();
    }

    public string GetApprovedUtilization(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return EmptyArray();
    }

    // -------------------------------------------------------------------------
    // Revenue (RouiPCI — סך הכנסות נטו נומינלי)
    // -------------------------------------------------------------------------

    public string GetRevenueFilterOptions()
    {
        string sql = @"
SELECT DISTINCT ISNULL([מחלקה], [יחידה]) AS Wing FROM " + PciTable + @" WITH (NOLOCK) WHERE ISNULL([מחלקה], [יחידה]) IS NOT NULL;
SELECT DISTINCT [סוג ניתוח] AS SurgeryType FROM " + PciTable + @" WITH (NOLOCK) WHERE [סוג ניתוח] IS NOT NULL;
SELECT DISTINCT [משמרת] AS Shift FROM " + PciTable + @" WITH (NOLOCK) WHERE [משמרת] IS NOT NULL;
SELECT DISTINCT KerenOfHos AS Payer FROM " + PciTable + @" WITH (NOLOCK) WHERE KerenOfHos IS NOT NULL;";
        List<string> wings = new List<string>();
        List<string> surgeryTypes = new List<string>();
        List<string> shifts = new List<string>();
        List<string> payers = new List<string>();
        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        wings.Add(Convert.ToString(reader[0]));
                    }
                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            surgeryTypes.Add(Convert.ToString(reader[0]));
                        }
                    }
                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            shifts.Add(Convert.ToString(reader[0]));
                        }
                    }
                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            payers.Add(Convert.ToString(reader[0]));
                        }
                    }
                }
            }
        }
        return Json.Serialize(new
        {
            wings = wings,
            billingDepartments = wings,
            surgeryTypes = surgeryTypes,
            shifts = shifts,
            sites = new string[0],
            payers = payers
        });
    }

    public string GetRevenueByDeptFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string groupBy)
    {
        return QueryRevenueAgg(baseYear, department, surgeryType, shift, weekend, payer, "ISNULL([מחלקה], [יחידה])");
    }

    public string GetRevenueByProcedureFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string groupBy)
    {
        return QueryRevenueAgg(baseYear, department, surgeryType, shift, weekend, payer, "[פרוצדורה]");
    }

    private string QueryRevenueAgg(string baseYear, string department, string surgeryType, string shift, string weekend, string payer, string groupExpr)
    {
        int year = ParseYear(baseYear);
        string sql = string.Format(@"
SELECT [שנה] AS [Year], {0} AS [GroupKey],
       SUM(ISNULL([סך הכנסות נטו נומינלי], 0)) AS [TotalAmount],
       COUNT(*) AS [SurgeryCount]
FROM {1} WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
  AND (@department = '' OR ISNULL([מחלקה], [יחידה]) = @department)
  AND (@surgeryType = '' OR [סוג ניתוח] = @surgeryType)
  AND (@shift = '' OR [משמרת] = @shift)
  AND (@payer = '' OR KerenOfHos = @payer)
GROUP BY [שנה], {0}", groupExpr, PciTable);
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            cmd.Parameters.AddWithValue("@department", (department ?? "").Trim());
            cmd.Parameters.AddWithValue("@surgeryType", (surgeryType ?? "").Trim());
            cmd.Parameters.AddWithValue("@shift", (shift ?? "").Trim());
            cmd.Parameters.AddWithValue("@payer", (payer ?? "").Trim());
        });
    }

    public string GetRevenueByMonth(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT [שנה] AS [Year], MONTH([תאריך ניתוח]) AS [Month],
       SUM(ISNULL([סך הכנסות נטו נומינלי], 0)) AS [TotalAmount],
       COUNT(*) AS [SurgeryCount]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE [שנה] BETWEEN @baseYear - 4 AND @baseYear
GROUP BY [שנה], MONTH([תאריך ניתוח])";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
        });
    }

    public string GetRevenueStackedComposite(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer)
    {
        return EmptyArray();
    }

    public string GetServicePerformed(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string mode, string search, string listGroupBy, string serviceName, string unifiedCategory, string breakdownBy)
    {
        return EmptyArray();
    }

    // -------------------------------------------------------------------------
    // Wait-times / cancellations — אין מקור ב-RouiPCI (stub)
    // -------------------------------------------------------------------------

    public string GetRecommendationsYearly()
    {
        return EmptyArray();
    }

    public string GetRecommendationsMonthly()
    {
        return EmptyArray();
    }

    public string GetRecommendationsByDepartment()
    {
        return EmptyArray();
    }

    public string GetRecommendationsByDoctor(string department, string baseYear)
    {
        return EmptyArray();
    }

    public string GetRecommendationsByRecommendingDoctor(string department, string baseYear)
    {
        return EmptyArray();
    }

    public string GetTopRecommendedProcedures(string doctor, string department)
    {
        return EmptyArray();
    }

    public string GetEmergencyReplacementAnalysis()
    {
        return EmptyArray();
    }

    public string GetRecommendationMonthlyTrend()
    {
        return EmptyArray();
    }

    public string GetRecommendationBacklog()
    {
        return EmptyArray();
    }

    public string GetRecommendationAgingBuckets()
    {
        return EmptyArray();
    }

    public string GetCancellationsYearly(string baseYear, string department)
    {
        return EmptyArray();
    }

    public string GetCancellationsMonthly(string baseYear, string department)
    {
        return EmptyArray();
    }

    public string GetTopCancellationReasons(string baseYear, string department)
    {
        return EmptyArray();
    }

    public string GetCancellationReasonsByDepartment(string baseYear, string department)
    {
        return EmptyArray();
    }

    public string GetRoomOutcome(string baseYear, string department)
    {
        return EmptyArray();
    }
}
