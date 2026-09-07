// =============================================================================
// PciDashboardService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Hebrew column names use \\u escapes — safe for Windows-1252 App_Code compile.
// Source table: NAMER.dbo.RouiPCI
//
// Dashboard filters (surgeryType, shift, site, weekend, morningWork, rooms, department)
// are applied in BuildCommonAndClause(). WebService.cs must pass them from the client
// request (POST JSON body fields and/or QueryString via PciQs).
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

    // RouiPCI column names (Unicode escapes)
    private const string C_Year = "\u05E9\u05E0\u05D4";
    private const string C_Dept = "\u05DE\u05D7\u05DC\u05E7\u05D4";
    private const string C_Unit = "\u05D9\u05D7\u05D9\u05D3\u05D4";
    private const string C_Surgeon = "\u05DE\u05E0\u05EA\u05D7 \u05D0\u05D7\u05E8\u05D0\u05D9";
    private const string C_SurgeryDate = "\u05EA\u05D0\u05E8\u05D9\u05DA \u05E0\u05D9\u05EA\u05D5\u05D7";
    private const string C_Shift = "\u05DE\u05E9\u05DE\u05E8\u05EA";
    private const string C_SurgeryType = "\u05E1\u05D5\u05D2 \u05E0\u05D9\u05EA\u05D5\u05D7";
    private const string C_WeekPart = "\u05E1\u05D5\u05E3 / \u05D0\u05DE\u05E6\u05E2 \u05E9\u05D1\u05D5\u05E2";
    private const string C_SurgeryRoom = "\u05D7\u05D3\u05E8 \u05E0\u05D9\u05EA\u05D5\u05D7";
    private const string C_RoomTime = "\u05D6\u05DE\u05DF \u05D7\u05D3\u05E8";
    private const string C_Procedure = "\u05E4\u05E8\u05D5\u05E6\u05D3\u05D5\u05E8\u05D4";
    private const string C_NetRevenue = "\u05E1\u05DA \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05E0\u05D8\u05D5 \u05E0\u05D5\u05DE\u05D9\u05E0\u05DC\u05D9";
    private const string C_RoomEntry = "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05E9\u05E2\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05D3\u05E8";
    private const string C_SurgeryStart = "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05E9\u05E2\u05EA \u05EA\u05D7\u05D9\u05DC\u05EA \u05E0\u05D9\u05EA\u05D5\u05D7-\u05D7\u05EA\u05DA";
    private const string C_RoomExit = "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05E9\u05E2\u05EA \u05D9\u05E6\u05D9\u05D0\u05D4 \u05DE\u05D4\u05D7\u05D3\u05E8";
    private const string L_MidweekShort = "\u05D0\u05DE\u05E6\u05F4\u05E9";
    private const string L_Midweek = "\u05D0\u05DE\u05E6\u05E2 \u05E9\u05D1\u05D5\u05E2";
    private const string L_MorningShift = "\u05D1\u05D5\u05E7\u05E8";
    private const string S_SiteGeneral = "\u05D7\u05E0-\u05DB\u05DC\u05DC\u05D9";
    private const string S_SiteAmbulatory = "\u05D7\u05E0-\u05D0\u05DE\u05D1\u05D5\u05DC";
    private const string S_SiteMaternity = "\u05D7\u05E0-\u05D9\u05D5\u05DC\u05D3";
    private const string S_SiteDept = "\u05D7\u05E0-\u05DE\u05D7\u05DC\u05E7\u05D4";
    private const string S_SiteOral = "\u05D7\u05E0-\u05E4\u05D4\u05DC\u05E1\u05EA";

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

    private static string Q(string col)
    {
        return "[" + col + "]";
    }

    private static string DeptOrUnit()
    {
        return "ISNULL(" + Q(C_Dept) + ", " + Q(C_Unit) + ")";
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
        return "CASE WHEN " + Q(C_WeekPart) + " IN (N'" + L_MidweekShort + "', N'" + L_Midweek + "') THEN N'" + L_Midweek + "' ELSE ISNULL(" + Q(C_WeekPart) + ", N'') END";
    }

    private static string SqlRoomMinutesExpr()
    {
        return "CASE WHEN " + Q(C_RoomTime) + " IS NULL THEN 0 WHEN TRY_CAST(" + Q(C_RoomTime) + " AS time) IS NOT NULL THEN DATEDIFF(MINUTE, CAST('00:00' AS time), TRY_CAST(" + Q(C_RoomTime) + " AS time)) ELSE TRY_CAST(" + Q(C_RoomTime) + " AS int) END";
    }

    /** Site bucket for PCI cath-lab filters (matches Angular sidebar values). */
    private static string SqlSiteExpr()
    {
        string room = "LTRIM(RTRIM(CAST(" + Q(C_SurgeryRoom) + " AS nvarchar(100))))";
        return "CASE"
            + " WHEN " + room + " LIKE N'" + S_SiteAmbulatory + "%' THEN N'" + S_SiteAmbulatory + "'"
            + " WHEN " + room + " LIKE N'" + S_SiteMaternity + "%' THEN N'" + S_SiteMaternity + "'"
            + " WHEN " + room + " LIKE N'" + S_SiteDept + "%' THEN N'" + S_SiteDept + "'"
            + " WHEN " + room + " LIKE N'" + S_SiteOral + "%' THEN N'" + S_SiteOral + "'"
            + " WHEN " + room + " LIKE N'" + S_SiteGeneral + "%' THEN N'" + S_SiteGeneral + "'"
            + " ELSE " + room
            + " END";
    }

    private static void AddCommonFilters(
        SqlCommand cmd,
        string department,
        string surgeryType,
        string shift,
        string site,
        string weekend,
        string morningWork,
        string rooms)
    {
        cmd.Parameters.AddWithValue("@department", (department ?? "").Trim());
        cmd.Parameters.AddWithValue("@surgeryType", (surgeryType ?? "").Trim());
        cmd.Parameters.AddWithValue("@shift", (shift ?? "").Trim());
        cmd.Parameters.AddWithValue("@site", (site ?? "").Trim());
        cmd.Parameters.AddWithValue("@weekend", (weekend ?? "").Trim().ToLowerInvariant());
        cmd.Parameters.AddWithValue("@morningWork", (morningWork ?? "").Trim().ToLowerInvariant());
        cmd.Parameters.AddWithValue("@rooms", (rooms ?? "").Trim());
    }

    private static string BuildCommonAndClause()
    {
        string roomCsv = "N',' + LTRIM(RTRIM(CAST(" + Q(C_SurgeryRoom) + " AS nvarchar(100)))) + N','";
        string surgeryTypeCsv = "N',' + LTRIM(RTRIM(CAST(" + Q(C_SurgeryType) + " AS nvarchar(100)))) + N','";
        string shiftCsv = "N',' + LTRIM(RTRIM(CAST(" + Q(C_Shift) + " AS nvarchar(100)))) + N','";
        string siteCsv = "N',' + LTRIM(RTRIM(" + SqlSiteExpr() + ")) + N','";
        string deptCsv = "N',' + LTRIM(RTRIM(" + DeptOrUnit() + ")) + N','";
        return @"
  AND (@department = '' OR CHARINDEX(" + deptCsv + @", N',' + @department + N',') > 0)
  AND (@surgeryType = '' OR CHARINDEX(" + surgeryTypeCsv + @", N',' + @surgeryType + N',') > 0)
  AND (@shift = '' OR CHARINDEX(" + shiftCsv + @", N',' + @shift + N',') > 0)
  AND (@site = '' OR CHARINDEX(" + siteCsv + @", N',' + @site + N',') > 0)
  AND (
        @weekend = ''
        OR (@weekend = 'false' AND " + SqlWeekPartExpr() + @" = N'" + L_Midweek + @"')
        OR (@weekend = 'true' AND " + SqlWeekPartExpr() + @" <> N'" + L_Midweek + @"')
      )
  AND (
        @morningWork = ''
        OR (@morningWork = 'true'
            AND " + Q(C_Shift) + @" = N'" + L_MorningShift + @"'
            AND " + SqlWeekPartExpr() + @" = N'" + L_Midweek + @"')
        OR (@morningWork = 'false'
            AND NOT (" + Q(C_Shift) + @" = N'" + L_MorningShift + @"'
                     AND " + SqlWeekPartExpr() + @" = N'" + L_Midweek + @"'))
      )
  AND (
        @rooms = ''
        OR CHARINDEX(" + roomCsv + @", N',' + @rooms + N',') > 0
      )";
    }

    private static string BuildYearRangeClause()
    {
        return Q(C_Year) + @" BETWEEN @minYear AND @baseYear";
    }

    private static void AddYearRangeParameters(SqlCommand cmd, int baseYear)
    {
        cmd.Parameters.AddWithValue("@baseYear", baseYear);
        cmd.Parameters.AddWithValue("@minYear", baseYear - 4);
    }

    private static string QueryToJson(string sql, Action<SqlCommand> bind)
    {
        List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.CommandTimeout = 120;
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

    public string GetCountByDept(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        // Lighter GROUP BY (no surgeon/month) — charts aggregate by wing/shift/fund/year only.
        string sql = @"
SELECT
    CAST(" + Q(C_Year) + @" AS int) AS [Year],
    " + SqlSiteExpr() + @" AS [Site],
    " + DeptOrUnit() + @" AS [Wing],
    " + DeptOrUnit() + @" AS [Department],
    " + Q(C_Shift) + @" AS [Shift],
    " + Q(C_SurgeryType) + @" AS [UnifiedSurgeryType],
    " + SqlWeekPartExpr() + @" AS [WeekPart],
    KerenOfHos AS [FundType],
    CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50)) AS [SurgeryRoom],
    COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_SurgeryDate) + @" >= @fromDate AND " + Q(C_SurgeryDate) + @" < @toDate
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", " + Q(C_Shift) + @", " + Q(C_SurgeryType) + @", " + SqlWeekPartExpr() + @", KerenOfHos, CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@fromDate", new DateTime(year - 4, 1, 1));
            cmd.Parameters.AddWithValue("@toDate", new DateTime(year + 1, 1, 1));
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetMonthlyCounts(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        // Prefer surgery-date range (often indexed) over year column alone.
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year], CAST(MONTH(" + Q(C_SurgeryDate) + @") AS int) AS [Month], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_SurgeryDate) + @" >= @fromDate AND " + Q(C_SurgeryDate) + @" < @toDate
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", MONTH(" + Q(C_SurgeryDate) + @")
ORDER BY [Year], [Month]";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@fromDate", new DateTime(year - 4, 1, 1));
            cmd.Parameters.AddWithValue("@toDate", new DateTime(year + 1, 1, 1));
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetSurgeriesByDepartment(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], " + DeptOrUnit() + @" AS [Department], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + DeptOrUnit() + @"
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetCountByDoctor(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], " + Q(C_Surgeon) + @" AS [DoctorName], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + Q(C_Surgeon) + @"
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetDepartmentYoY(string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        string sql = @"
SELECT " + DeptOrUnit() + @" AS [DepartmentName],
       SUM(CASE WHEN " + Q(C_Year) + @" = YEAR(GETDATE()) - 1 THEN ISNULL(" + Q(C_NetRevenue) + @", 0) ELSE 0 END) AS [Income2024],
       SUM(CASE WHEN " + Q(C_Year) + @" = YEAR(GETDATE()) THEN ISNULL(" + Q(C_NetRevenue) + @", 0) ELSE 0 END) AS [Income2025]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" >= YEAR(GETDATE()) - 1
" + BuildCommonAndClause() + @"
GROUP BY " + DeptOrUnit() + @"
ORDER BY [Income2025] DESC";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetUniqueDiagnoses()
    {
        return EmptyArray();
    }

    public string GetDepRoomFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year],
       " + SqlSiteExpr() + @" AS [Site],
       " + DeptOrUnit() + @" AS [Wing],
       COUNT(DISTINCT CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))) AS [RoomCount],
       COUNT(*) AS [SurgeryCount]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit();
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetAvgDurationYearlyFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return GetAvgDurationFiveYears(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
    }

    public string GetAvgDurationFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year],
       " + SqlSiteExpr() + @" AS [Site],
       " + DeptOrUnit() + @" AS [Wing],
       " + DeptOrUnit() + @" AS [Department],
       " + Q(C_Shift) + @" AS [Shift],
       " + Q(C_SurgeryType) + @" AS [UnifiedSurgeryType],
       " + SqlWeekPartExpr() + @" AS [WeekendType],
       CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50)) AS [Room],
       COUNT(*) AS [Count],
       AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float)) AS [AvgDurationMin]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", " + Q(C_Shift) + @", " + Q(C_SurgeryType) + @", " + SqlWeekPartExpr() + @", CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetAvgFirstMorningEntry(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryRoomTimeMetric(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms, Q(C_RoomEntry));
    }

    public string GetAvgLastMorningEnd(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryRoomTimeMetric(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms, Q(C_RoomExit));
    }

    private string QueryRoomTimeMetric(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string column)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], " + DeptOrUnit() + @" AS [Wing],
       AVG(CAST(DATEPART(HOUR, " + column + @") * 60 + DATEPART(MINUTE, " + column + @") AS float)) AS [AvgMinutesFromMidnight]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
  AND " + column + @" IS NOT NULL
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + DeptOrUnit();
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetAvgSurgeriesPerDayPerRoomFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year],
       " + SqlSiteExpr() + @" AS [Site],
       " + DeptOrUnit() + @" AS [Wing],
       CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50)) AS [Room],
       COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT CAST(" + Q(C_SurgeryDate) + @" AS date)), 0) AS [AvgSurgeriesPerDay]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
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

    public string GetRevenueFilterOptions()
    {
        string sql = @"
SELECT DISTINCT " + DeptOrUnit() + @" AS Wing FROM " + PciTable + @" WITH (NOLOCK) WHERE " + DeptOrUnit() + @" IS NOT NULL;
SELECT DISTINCT " + Q(C_SurgeryType) + @" AS SurgeryType FROM " + PciTable + @" WITH (NOLOCK) WHERE " + Q(C_SurgeryType) + @" IS NOT NULL;
SELECT DISTINCT " + Q(C_Shift) + @" AS Shift FROM " + PciTable + @" WITH (NOLOCK) WHERE " + Q(C_Shift) + @" IS NOT NULL;
SELECT DISTINCT " + SqlSiteExpr() + @" AS Site FROM " + PciTable + @" WITH (NOLOCK) WHERE " + Q(C_SurgeryRoom) + @" IS NOT NULL;
SELECT DISTINCT KerenOfHos AS Payer FROM " + PciTable + @" WITH (NOLOCK) WHERE KerenOfHos IS NOT NULL;";
        List<string> wings = new List<string>();
        List<string> surgeryTypes = new List<string>();
        List<string> shifts = new List<string>();
        List<string> sites = new List<string>();
        List<string> payers = new List<string>();
        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.CommandTimeout = 120;
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
                            sites.Add(Convert.ToString(reader[0]));
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
            sites = sites,
            payers = payers
        });
    }

    public string GetRevenueByDeptFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string groupBy)
    {
        return QueryRevenueAgg(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms, payer, DeptOrUnit());
    }

    public string GetRevenueByProcedureFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string groupBy)
    {
        return QueryRevenueAgg(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms, payer, Q(C_Procedure));
    }

    private string QueryRevenueAgg(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string groupExpr)
    {
        int year = ParseYear(baseYear);
        string payerCsv = "N',' + LTRIM(RTRIM(KerenOfHos)) + N','";
        string sql = string.Format(@"
SELECT {0} AS [Year], {1} AS [GroupKey],
       SUM(ISNULL({2}, 0)) AS [TotalAmount],
       COUNT(*) AS [SurgeryCount]
FROM {3} WITH (NOLOCK)
WHERE {0} BETWEEN @baseYear - 4 AND @baseYear
{4}
  AND (@payer = '' OR CHARINDEX(" + payerCsv + @", N',' + @payer + N',') > 0)
GROUP BY {0}, {1}", Q(C_Year), groupExpr, Q(C_NetRevenue), PciTable, BuildCommonAndClause());
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
            cmd.Parameters.AddWithValue("@payer", (payer ?? "").Trim());
        });
    }

    public string GetRevenueByMonth(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer)
    {
        int year = ParseYear(baseYear);
        string payerCsv = "N',' + LTRIM(RTRIM(KerenOfHos)) + N','";
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], MONTH(" + Q(C_SurgeryDate) + @") AS [Month],
       SUM(ISNULL(" + Q(C_NetRevenue) + @", 0)) AS [TotalAmount],
       COUNT(*) AS [SurgeryCount]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 4 AND @baseYear
" + BuildCommonAndClause() + @"
  AND (@payer = '' OR CHARINDEX(" + payerCsv + @", N',' + @payer + N',') > 0)
GROUP BY " + Q(C_Year) + @", MONTH(" + Q(C_SurgeryDate) + @")";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@baseYear", year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
            cmd.Parameters.AddWithValue("@payer", (payer ?? "").Trim());
        });
    }

    public string GetRevenueStackedComposite(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer)
    {
        return EmptyArray();
    }

    public string GetServicePerformed(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string mode, string search, string listGroupBy, string serviceName, string unifiedCategory, string breakdownBy)
    {
        return EmptyArray();
    }

    // Legacy WebService wrappers (recommendations / cancellations) — PCI dashboard removed; stubs for App_Code compile.
    public string GetRecommendationsYearly() { return EmptyArray(); }
    public string GetRecommendationsMonthly() { return EmptyArray(); }
    public string GetRecommendationsByDepartment() { return EmptyArray(); }
    public string GetRecommendationsByDoctor(string department, string baseYear) { return EmptyArray(); }
    public string GetRecommendationsByRecommendingDoctor(string department, string baseYear) { return EmptyArray(); }
    public string GetTopRecommendedProcedures(string doctor, string department) { return EmptyArray(); }
    public string GetEmergencyReplacementAnalysis() { return EmptyArray(); }
    public string GetRecommendationMonthlyTrend() { return EmptyArray(); }
    public string GetRecommendationBacklog() { return EmptyArray(); }
    public string GetRecommendationAgingBuckets() { return EmptyArray(); }
    public string GetCancellationsYearly(string baseYear, string department) { return EmptyArray(); }
    public string GetCancellationsMonthly(string baseYear, string department) { return EmptyArray(); }
    public string GetTopCancellationReasons(string baseYear, string department) { return EmptyArray(); }
    public string GetCancellationReasonsByDepartment(string baseYear, string department) { return EmptyArray(); }
    public string GetRoomOutcome(string baseYear, string department) { return EmptyArray(); }
}
