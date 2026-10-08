// =============================================================================
// PciDashboardService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Hebrew column names use \\u escapes — safe for Windows-1252 App_Code compile.
// Surgery metrics: NAMER.dbo.RouiPCI
// Revenue metrics: dbo.Excel_QuarterlyIncome, hardcoded scope MedicalUnit / subunit LIKE %cardio% (CardioToken)
//
// Dashboard filters (surgeryType, shift, site, weekend, morningWork, rooms, department)
// are applied in BuildCommonAndClause() for RouiPCI only.
// Revenue filters reuse the same WebMethod parameter names but bind Excel_QuarterlyIncome columns:
//   department        -> MedicalUnit_Department_Income
//   billingDepartment -> UnifiedCategory
//   surgeryType       -> IncomeCategory
//   shift             -> PayerType
//   site              -> Organization
//   payer             -> UnifiedPayer
//   groupBy procedure -> CatalogName2 (service name)
// WebService.cs must pass them from the client request (POST JSON body and/or QueryString via PciQs).
//
// Complete-month YoY (limitMonth): 5-year comparisons use January through (current month - 1)
// in EVERY year, so the incomplete current month is excluded. Example: 7 Oct -> Jan-Sep
// for 2022..2026. In January there are no complete months yet, so the window is the previous
// calendar year (limitMonth = 12). GetExploreSeries keeps the caller date range.
// GetLossByWingYear / GetApprovedUtilization: room-day averages by Year+Month.
// Same 8-arg signature as other RouiPCI APIs; empty string = no filter (all).
// Occupied = SUM(room minutes); lost = session - occupied.
// GetAvgDurationFiveYears: Year+Month+Wing only (same grain as first-entry / last-end).
// Do not GROUP BY site/shift/type/room here — that cartesian freezes the browser JSON parse.
// GetAvgDurationYearlyFiveYears: Year+Site+Wing+SurgeryType for the compare-departments modal.
// Department/Wing: map procedure name first (cath / EP / vascular / not-ours), else surgeon,
// else RouiPCI [Department]/[Unit] (doctor-based column).
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
    private const string IncomeTable = "[dbo].[Excel_QuarterlyIncome]";
    // Cardiology token (kuf-resh-dalet-yod) matched against MedicalUnit_Income / SubMedicalUnit_Description
    private const string CardioToken = "\u05E7\u05E8\u05D3\u05D9";

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
    private const string L_CathDept = "\u05E6\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD";
    private const string L_EpDept = "\u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E4\u05D9\u05D6\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4";
    private const string L_VascDept = "\u05DB\u05DC\u05D9 \u05D3\u05DD";
    private const string L_NotOurs = "\u05DC\u05D0 \u05E9\u05DC\u05E0\u05D5";
    private const string L_TaviDept = "TAVI";
    private const string L_RightCathDept = "\u05E6\u05E0\u05EA\u05D5\u05E8 \u05D9\u05DE\u05E0\u05D9";
    private const string L_BrainDept = "\u05DE\u05D5\u05D7";
    private const string L_OtherDept = "\u05D0\u05D7\u05E8";
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
        return SqlMappedDeptExpr();
    }

    private static string SqlHas(string col, string frag)
    {
        return "CHARINDEX(N'" + frag + "', " + col + ") > 0";
    }

    /// <summary>
    /// Procedure -&gt; department from the mapping table (cath / EP / vascular / not-ours).
    /// Unmapped procedure falls back to surgeon map, then RouiPCI department/unit.
    /// </summary>
    private static string SqlMappedDeptExpr()
    {
        string p = "LTRIM(RTRIM(ISNULL(CAST(" + Q(C_Procedure) + " AS nvarchar(400)), N'')))";
        string s = "LTRIM(RTRIM(ISNULL(CAST(" + Q(C_Surgeon) + " AS nvarchar(200)), N'')))";
        string raw = "LTRIM(RTRIM(ISNULL(" + Q(C_Dept) + ", ISNULL(" + Q(C_Unit) + ", N''))))";
        string cath = "N'" + L_CathDept + "'";
        string ep = "N'" + L_EpDept + "'";
        string vasc = "N'" + L_VascDept + "'";
        string notOurs = "N'" + L_NotOurs + "'";
        string tavi = "N'" + L_TaviDept + "'";
        string right = "N'" + L_RightCathDept + "'";
        string brain = "N'" + L_BrainDept + "'";
        string other = "N'" + L_OtherDept + "'";
        return "CASE"
            + " WHEN " + SqlHas(p, "\u05E9\u05D1\u05E5") + " THEN " + notOurs
            + " WHEN " + SqlHas(p, "\u05E0\u05D9\u05D5\u05E8\u05D5\u05DC\u05D5\u05D2") + " THEN " + notOurs
            + " WHEN " + SqlHas(p, "\u05E0\u05D5\u05D9\u05E8\u05D5\u05DC\u05D5\u05D2") + " THEN " + notOurs
            + " WHEN " + SqlHas(p, "\u05DE\u05D5\u05D7\u05D9\u05EA") + " THEN " + notOurs
            + " WHEN " + SqlHas(p, "\u05DC\u05DE\u05E2\u05D8") + " AND (" + SqlHas(p, "\u05E6\u05E0\u05EA\u05D5\u05E8 \u05DC\u05D1") + " OR " + SqlHas(p, "\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8 \u05DC\u05D1") + ") THEN " + vasc
            + " WHEN " + SqlHas(p, "\u05D4\u05D1\u05D8\u05E0\u05D9\u05EA") + " THEN " + vasc
            + " WHEN " + SqlHas(p, "\u05D3\u05D9\u05D0\u05DC\u05D9\u05D6\u05D4") + " THEN " + vasc
            + " WHEN " + SqlHas(p, "\u05DB\u05DC\u05D9 \u05D3\u05DD") + " THEN " + vasc
            + " WHEN " + SqlHas(p, "\u05E7\u05D5\u05E6\u05D1") + " THEN " + ep
            + " WHEN " + SqlHas(p, "\u05D0\u05DC\u05E7\u05D8\u05E8\u05D5") + " THEN " + ep
            + " WHEN " + SqlHas(p, "umbrella") + " THEN " + ep
            + " WHEN " + SqlHas(p, "\u05D0\u05D5\u05D6\u05E0\u05D9\u05EA") + " THEN " + ep
            + " WHEN " + SqlHas(p, "\u05DB\u05E8\u05D9\u05EA\u05EA") + " THEN " + ep
            + " WHEN " + SqlHas(p, "\u05E0\u05D2\u05E2") + " AND " + SqlHas(p, "\u05E8\u05E7\u05DE\u05D4") + " THEN " + ep
            + " WHEN " + SqlHas(p, "\u05E6\u05E0\u05EA\u05D5\u05E8 \u05DC\u05D1") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8 \u05DC\u05D1") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05DB\u05DC\u05D9\u05DC\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05DE\u05E1\u05EA\u05DD") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05DE\u05D7\u05D9\u05E6\u05D5\u05EA") + " THEN " + cath
            + " WHEN " + SqlHas(p, "PDA") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05E6\u05E0\u05EA\u05D5\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(p, "\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E1\u05D5\u05D3\u05E8\u05E1\u05E7\u05D9") + " THEN " + tavi
            + " WHEN " + SqlHas(s, "\u05D4\u05D9\u05D9\u05EA\u05D0\u05DD") + " THEN " + tavi
            + " WHEN " + SqlHas(s, "\u05D4\u05D9\u05EA\u05D0\u05DD") + " THEN " + tavi
            + " WHEN " + SqlHas(s, "\u05DE\u05D5\u05E1\u05D0 \u05E1\u05E2\u05D3") + " THEN " + ep
            + " WHEN " + SqlHas(s, "\u05DE\u05E8\u05E2\u05D9") + " THEN " + ep
            + " WHEN " + SqlHas(s, "\u05D9\u05D5\u05D0\u05E0\u05D3\u05E8\u05D9\u05D0\u05E1") + " THEN " + ep
            + " WHEN " + SqlHas(s, "\u05DE\u05E2\u05DC\u05E4\u05D9") + " THEN " + right
            + " WHEN " + SqlHas(s, "\u05DE\u05D0\u05D9\u05D5\u05D1\u05D9\u05E5") + " THEN " + brain
            + " WHEN " + SqlHas(s, "\u05D9\u05D5\u05E1\u05E4\u05D9") + " THEN " + vasc
            + " WHEN " + SqlHas(s, "\u05D0\u05D1\u05D5\u05D6\u05D5\u05DF") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D0\u05D1\u05D5 \u05D6\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05DB\u05E0\u05D2\u05E0") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05DB\u05E0\u05D2\u05D0\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D2\u05D1\u05E8\u05D9\u05D0\u05DC\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D1\u05DC\u05E0\u05E7") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E9\u05D7\u05D0\u05D3\u05D4") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D0\u05DE\u05D0\u05D9\u05E8\u05D4") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D0\u05DE\u05D9\u05E8\u05D4") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05DC\u05E0\u05D3\u05E1") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05DE\u05E8\u05D3\u05D4") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E1\u05D8\u05D5\u05DC\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E1\u05E2\u05D3\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D0\u05D1\u05DB\u05E8\u05D9\u05D4") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D7\u05DC\u05D7\u05DC") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D1\u05D9\u05E8\u05EA") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D9\u05E9\u05E8\u05D0\u05DC\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E7\u05D0\u05EA\u05D9") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E0\u05E1\u05D0\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E0\u05D9\u05D6\u05D0\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D0\u05E0\u05D3\u05E8") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05E4\u05DC\u05D3") + " THEN " + cath
            + " WHEN " + SqlHas(s, "\u05D1\u05E9\u05D9\u05E8") + " THEN " + cath
            + " WHEN " + raw + " IN (" + cath + ", " + ep + ", " + vasc + ", N'TAVI', " + right + ", " + brain + ") THEN " + raw
            + " WHEN " + raw + " <> N'' THEN " + raw
            + " ELSE " + other
            + " END";
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

    /// <summary>
    /// Last fully completed calendar month (1-12). October -> 9; January -> 12.
    /// </summary>
    private static int LastCompleteMonthNum()
    {
        DateTime now = DateTime.Now;
        if (now.Month <= 1)
        {
            return 12;
        }
        return now.Month - 1;
    }

    /// <summary>
    /// Clamp base year so January comparisons use the previous completed year.
    /// </summary>
    private static int AlignBaseYear(int requestedBaseYear)
    {
        DateTime now = DateTime.Now;
        int year = requestedBaseYear;
        if (year <= 0)
        {
            year = now.Year;
        }
        if (now.Month <= 1 && year >= now.Year)
        {
            return now.Year - 1;
        }
        if (year > now.Year)
        {
            return now.Year;
        }
        return year;
    }

    private static string BuildCompleteMonthClause()
    {
        return " AND MONTH(" + Q(C_SurgeryDate) + ") <= @limitMonth";
    }

    /// <summary>
    /// Prior years: all 12 months. Base year: January through limitMonth only.
    /// </summary>
    private static string BuildPriorYearsFullMonthClause()
    {
        return " AND (CAST(" + Q(C_Year) + " AS int) < @baseYear OR MONTH(" + Q(C_SurgeryDate) + ") <= @limitMonth)";
    }

    private static string BuildIncomeCompleteMonthClause(string monthExpr)
    {
        return " AND " + monthExpr + " IS NOT NULL AND " + monthExpr + " <= @limitMonth";
    }

    private static void BindCompleteMonthRange(SqlCommand cmd, int requestedBaseYear)
    {
        int year = AlignBaseYear(requestedBaseYear);
        cmd.Parameters.AddWithValue("@baseYear", year);
        cmd.Parameters.AddWithValue("@minYear", year - 4);
        cmd.Parameters.AddWithValue("@limitMonth", LastCompleteMonthNum());
        cmd.Parameters.AddWithValue("@fromDate", new DateTime(year - 4, 1, 1));
        cmd.Parameters.AddWithValue("@toDate", new DateTime(year + 1, 1, 1));
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
  AND LTRIM(RTRIM(" + DeptOrUnit() + @")) <> N'" + L_NotOurs + @"'
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
        // Complete months only: MONTH <= limitMonth in every year (fair YoY totals).
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
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", " + Q(C_Shift) + @", " + Q(C_SurgeryType) + @", " + SqlWeekPartExpr() + @", KerenOfHos, CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetMonthlyCounts(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        // Prefer surgery-date range (often indexed) over year column alone.
        // Same complete-month window as GetCountByDept so year-total sums stay aligned.
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year], CAST(MONTH(" + Q(C_SurgeryDate) + @") AS int) AS [Month], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_SurgeryDate) + @" >= @fromDate AND " + Q(C_SurgeryDate) + @" < @toDate
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", MONTH(" + Q(C_SurgeryDate) + @")
ORDER BY [Year], [Month]";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetSurgeriesByDepartment(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], " + DeptOrUnit() + @" AS [Department], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + DeptOrUnit() + @"
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetCountByDoctor(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT " + Q(C_Year) + @" AS [Year], " + Q(C_Surgeon) + @" AS [DoctorName], COUNT(*) AS [Count]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + Q(C_Surgeon) + @"
ORDER BY [Year], [Count] DESC";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetDepartmentYoY(string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        string sql = @"
SELECT " + DeptOrUnit() + @" AS [DepartmentName],
       SUM(CASE WHEN " + Q(C_Year) + @" = @baseYear - 1 THEN ISNULL(" + Q(C_NetRevenue) + @", 0) ELSE 0 END) AS [Income2024],
       SUM(CASE WHEN " + Q(C_Year) + @" = @baseYear THEN ISNULL(" + Q(C_NetRevenue) + @", 0) ELSE 0 END) AS [Income2025]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @baseYear - 1 AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + DeptOrUnit() + @"
ORDER BY [Income2025] DESC";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, DateTime.Now.Year);
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
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit();
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetAvgDurationYearlyFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year],
       " + SqlSiteExpr() + @" AS [Site],
       " + DeptOrUnit() + @" AS [Wing],
       ISNULL(" + Q(C_SurgeryType) + @", N'') AS [SurgeryType],
       COUNT(*) AS [Count],
       AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float)) AS [AvgMinutes],
       " + SqlFormatHm("AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float))") + @" AS [AvgHHMM]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", ISNULL(" + Q(C_SurgeryType) + @", N'')";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetAvgDurationFiveYears(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT CAST(" + Q(C_Year) + @" AS int) AS [Year],
       CAST(MONTH(" + Q(C_SurgeryDate) + @") AS int) AS [Month],
       " + DeptOrUnit() + @" AS [Wing],
       COUNT(*) AS [Count],
       AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float)) AS [AvgDurationMin]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildPriorYearsFullMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", MONTH(" + Q(C_SurgeryDate) + @"), " + DeptOrUnit();
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
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
SELECT " + Q(C_Year) + @" AS [Year],
       CAST(MONTH(" + Q(C_SurgeryDate) + @") AS int) AS [Month],
       " + DeptOrUnit() + @" AS [Wing],
       COUNT(*) AS [Count],
       AVG(CAST(DATEPART(HOUR, " + column + @") * 60 + DATEPART(MINUTE, " + column + @") AS float)) AS [AvgMinutesFromMidnight]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
  AND " + column + @" IS NOT NULL
" + BuildPriorYearsFullMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", MONTH(" + Q(C_SurgeryDate) + @"), " + DeptOrUnit();
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
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
WHERE " + Q(C_Year) + @" BETWEEN @minYear AND @baseYear
" + BuildCompleteMonthClause() + @"
" + BuildCommonAndClause() + @"
GROUP BY " + Q(C_Year) + @", " + SqlSiteExpr() + @", " + DeptOrUnit() + @", CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))";
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    public string GetLossByWingYear(string baseYear)
    {
        return GetLossByWingYear(baseYear, "", "", "", "", "", "", "");
    }

    public string GetLossByWingYear(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryPciRoomDayYearMetrics(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
    }

    public string GetApprovedUtilization(string baseYear)
    {
        return GetApprovedUtilization(baseYear, "", "", "", "", "", "", "");
    }

    public string GetApprovedUtilization(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        return QueryPciRoomDayYearMetrics(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
    }

    /// <summary>
    /// Per room-day from RouiPCI, then average by year+month.
    /// Sidebar filters via BuildCommonAndClause; empty param = no filter.
    /// Occupied = SUM(room minutes); lost = session(first entry..last exit) - occupied.
    /// </summary>
    private string QueryPciRoomDayYearMetrics(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
    {
        int year = ParseYear(baseYear);
        DateTime now = DateTime.Now;
        int limitMonth = now.Month <= 1 ? 12 : now.Month - 1;
        if (now.Month <= 1 && year >= now.Year)
        {
            year = now.Year - 1;
        }
        string occ = "CAST(" + SqlRoomMinutesExpr() + " AS float)";
        string dateCol = Q(C_SurgeryDate);
        string roomCol = "CAST(" + Q(C_SurgeryRoom) + " AS nvarchar(50))";
        string sql = @"
;WITH Src AS (
    SELECT
        CAST(" + Q(C_Year) + @" AS int) AS [Yr],
        CAST(" + dateCol + @" AS date) AS [D],
        " + roomCol + @" AS [Room],
        " + occ + @" AS [OccMin],
        TRY_CONVERT(datetime, " + Q(C_RoomEntry) + @") AS [Ent],
        TRY_CONVERT(datetime, " + Q(C_RoomExit) + @") AS [Ex]
    FROM " + PciTable + @" WITH (NOLOCK)
    WHERE " + dateCol + @" >= @fromDate AND " + dateCol + @" < @toDate
      AND MONTH(" + dateCol + @") <= @limitMonth
" + BuildCommonAndClause() + @"
),
DayAgg AS (
    SELECT
        [Yr],
        MONTH([D]) AS [Mo],
        [D],
        [Room],
        SUM([OccMin]) AS [OccupiedMin],
        CASE
            WHEN MIN([Ent]) IS NULL OR MAX([Ex]) IS NULL THEN 0
            WHEN DATEDIFF(MINUTE, MIN([Ent]), MAX([Ex])) > SUM([OccMin])
                THEN DATEDIFF(MINUTE, MIN([Ent]), MAX([Ex])) - SUM([OccMin])
            ELSE 0
        END AS [LostMin]
    FROM Src
    GROUP BY [Yr], [D], [Room]
    HAVING SUM([OccMin]) > 0
)
SELECT
    [Yr] AS [Year],
    [Mo] AS [Month],
    AVG([OccupiedMin]) AS [AvgApprovedMin],
    " + SqlFormatHm("AVG([OccupiedMin])") + @" AS [AvgApprovedHHMM],
    AVG([LostMin]) AS [Loss],
    " + SqlFormatHm("AVG([LostMin])") + @" AS [AvgLossTime],
    COUNT(*) AS [DayCount]
FROM DayAgg
GROUP BY [Yr], [Mo]
ORDER BY [Year], [Month]";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
    }

    private static string SqlFormatHm(string minutesExpr)
    {
        return "RIGHT(N'00' + CONVERT(varchar(8), CAST(" + minutesExpr + " AS int) / 60), 2)"
            + " + N':' + RIGHT(N'00' + CONVERT(varchar(8), CAST(" + minutesExpr + " AS int) % 60), 2)";
    }

    private static string SqlNetSum()
    {
        return "SUM(ISNULL(TRY_CONVERT(decimal(18,2), NetIncomeTotal), 0))";
    }

    private static string SqlUnitsSum()
    {
        return "SUM(ISNULL(TRY_CONVERT(decimal(18,4), ChargedUnits), 1))";
    }

    private static string SqlServiceNameExpr()
    {
        return "ISNULL(NULLIF(LTRIM(RTRIM(CatalogName2)), N''), ISNULL(LTRIM(RTRIM(CatalogCode2)), N''))";
    }

    private static string SqlIncomeMonthNum()
    {
        return "CASE LTRIM(RTRIM([Month]))"
            + " WHEN N'\u05D9\u05E0\u05D5\u05D0\u05E8' THEN 1"
            + " WHEN N'\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8' THEN 2"
            + " WHEN N'\u05DE\u05E8\u05E5' THEN 3"
            + " WHEN N'\u05D0\u05E4\u05E8\u05D9\u05DC' THEN 4"
            + " WHEN N'\u05DE\u05D0\u05D9' THEN 5"
            + " WHEN N'\u05D9\u05D5\u05E0\u05D9' THEN 6"
            + " WHEN N'\u05D9\u05D5\u05DC\u05D9' THEN 7"
            + " WHEN N'\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8' THEN 8"
            + " WHEN N'\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8' THEN 9"
            + " WHEN N'\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8' THEN 10"
            + " WHEN N'\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8' THEN 11"
            + " WHEN N'\u05D3\u05E6\u05DE\u05D1\u05E8' THEN 12"
            + " ELSE NULL END";
    }

    private static string IncomeLabel(string columnExpr)
    {
        return "ISNULL(NULLIF(LTRIM(RTRIM(" + columnExpr + ")), N''), N'-')";
    }

    private static string IncomeGroupExpr(string groupBy)
    {
        string g = (groupBy ?? "").Trim().ToLowerInvariant();
        if (g == "payer")
        {
            return IncomeLabel("UnifiedPayer");
        }
        if (g == "surgerytype")
        {
            return IncomeLabel("IncomeCategory");
        }
        if (g == "billingdept")
        {
            return IncomeLabel("UnifiedCategory");
        }
        if (g == "site")
        {
            return IncomeLabel("Organization");
        }
        if (g == "procedure" || g == "service")
        {
            return IncomeLabel(SqlServiceNameExpr());
        }
        return IncomeLabel("MedicalUnit_Department_Income");
    }

    private static string IncomeCsvMatch(string columnExpr, string paramName)
    {
        string csv = "N',' + LTRIM(RTRIM(ISNULL(" + columnExpr + ", N''))) + N','";
        return "(@" + paramName + " = N'' OR CHARINDEX(" + csv + ", N',' + @" + paramName + " + N',') > 0)";
    }

    private static string BuildIncomeAndClause()
    {
        return @"
  AND (
        ISNULL(MedicalUnit_Income, N'') LIKE N'%' + @cardio + N'%'
        OR ISNULL(SubMedicalUnit_Description, N'') LIKE N'%' + @cardio + N'%'
      )
  AND " + IncomeCsvMatch("MedicalUnit_Department_Income", "department") + @"
  AND " + IncomeCsvMatch("UnifiedCategory", "billingDepartment") + @"
  AND " + IncomeCsvMatch("IncomeCategory", "surgeryType") + @"
  AND " + IncomeCsvMatch("PayerType", "shift") + @"
  AND " + IncomeCsvMatch("Organization", "site") + @"
  AND " + IncomeCsvMatch("UnifiedPayer", "payer");
    }

    private static void AddIncomeFilters(
        SqlCommand cmd,
        string department,
        string billingDepartment,
        string surgeryType,
        string shift,
        string site,
        string payer)
    {
        cmd.Parameters.AddWithValue("@cardio", CardioToken);
        cmd.Parameters.AddWithValue("@department", (department ?? "").Trim());
        cmd.Parameters.AddWithValue("@billingDepartment", (billingDepartment ?? "").Trim());
        cmd.Parameters.AddWithValue("@surgeryType", (surgeryType ?? "").Trim());
        cmd.Parameters.AddWithValue("@shift", (shift ?? "").Trim());
        cmd.Parameters.AddWithValue("@site", (site ?? "").Trim());
        cmd.Parameters.AddWithValue("@payer", (payer ?? "").Trim());
    }

    public string GetRevenueFilterOptions()
    {
        string sql = @"
;WITH Src AS (
    SELECT
        LTRIM(RTRIM(MedicalUnit_Department_Income)) AS Wing,
        LTRIM(RTRIM(IncomeCategory)) AS IncomeCategory,
        LTRIM(RTRIM(UnifiedCategory)) AS UnifiedCategory,
        LTRIM(RTRIM(Organization)) AS Organization,
        LTRIM(RTRIM(UnifiedPayer)) AS Payer,
        LTRIM(RTRIM(PayerType)) AS PayerType
    FROM " + IncomeTable + @" WITH (NOLOCK)
    WHERE ISNULL(MedicalUnit_Income, N'') LIKE N'%' + @cardio + N'%'
       OR ISNULL(SubMedicalUnit_Description, N'') LIKE N'%' + @cardio + N'%'
)
SELECT DISTINCT N'wing' AS Dim, Wing AS Val FROM Src WHERE Wing IS NOT NULL AND Wing <> N''
UNION ALL
SELECT DISTINCT N'income' AS Dim, IncomeCategory FROM Src WHERE IncomeCategory IS NOT NULL AND IncomeCategory <> N''
UNION ALL
SELECT DISTINCT N'category' AS Dim, UnifiedCategory FROM Src WHERE UnifiedCategory IS NOT NULL AND UnifiedCategory <> N''
UNION ALL
SELECT DISTINCT N'org' AS Dim, Organization FROM Src WHERE Organization IS NOT NULL AND Organization <> N''
UNION ALL
SELECT DISTINCT N'payer' AS Dim, Payer FROM Src WHERE Payer IS NOT NULL AND Payer <> N''
UNION ALL
SELECT DISTINCT N'payerType' AS Dim, PayerType FROM Src WHERE PayerType IS NOT NULL AND PayerType <> N''
ORDER BY Dim, Val";
        List<string> wings = new List<string>();
        List<string> surgeryTypes = new List<string>();
        List<string> shifts = new List<string>();
        List<string> sites = new List<string>();
        List<string> payers = new List<string>();
        List<string> billingDepartments = new List<string>();
        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.CommandTimeout = 120;
                cmd.Parameters.AddWithValue("@cardio", CardioToken);
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string dim = Convert.ToString(reader["Dim"]);
                        string val = Convert.ToString(reader["Val"]);
                        if (string.IsNullOrEmpty(val))
                        {
                            continue;
                        }
                        if (dim == "wing")
                        {
                            wings.Add(val);
                        }
                        else if (dim == "income")
                        {
                            surgeryTypes.Add(val);
                        }
                        else if (dim == "category")
                        {
                            billingDepartments.Add(val);
                        }
                        else if (dim == "org")
                        {
                            sites.Add(val);
                        }
                        else if (dim == "payer")
                        {
                            payers.Add(val);
                        }
                        else if (dim == "payerType")
                        {
                            shifts.Add(val);
                        }
                    }
                }
            }
        }
        return Json.Serialize(new
        {
            wings = wings,
            billingDepartments = billingDepartments,
            surgeryTypes = surgeryTypes,
            shifts = shifts,
            sites = sites,
            payers = payers
        });
    }

    public string GetRevenueByDeptFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string groupBy)
    {
        return QueryIncomeAgg(baseYear, department, billingDepartment, surgeryType, shift, site, payer, IncomeGroupExpr(groupBy));
    }

    public string GetRevenueByProcedureFiveYears(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string groupBy)
    {
        return QueryIncomeAgg(baseYear, department, billingDepartment, surgeryType, shift, site, payer, IncomeGroupExpr("procedure"));
    }

    private string QueryIncomeAgg(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string payer, string groupExpr)
    {
        int year = ParseYear(baseYear);
        string sql = @"
SELECT TRY_CONVERT(int, [Year]) AS [Year],
       " + groupExpr + @" AS [GroupKey],
       " + SqlNetSum() + @" AS [TotalAmount],
       " + SqlUnitsSum() + @" AS [SurgeryCount],
       COUNT(*) AS [InvoiceCount],
       CASE WHEN " + SqlUnitsSum() + @" = 0 THEN 0
            ELSE " + SqlNetSum() + @" / NULLIF(" + SqlUnitsSum() + @", 0)
       END AS [AvgAmount]
FROM " + IncomeTable + @" WITH (NOLOCK)
WHERE TRY_CONVERT(int, [Year]) BETWEEN @minYear AND @baseYear
" + BuildIncomeCompleteMonthClause(SqlIncomeMonthNum()) + @"
" + BuildIncomeAndClause() + @"
GROUP BY TRY_CONVERT(int, [Year]), " + groupExpr;
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddIncomeFilters(cmd, department, billingDepartment, surgeryType, shift, site, payer);
        });
    }

    public string GetRevenueByMonth(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer)
    {
        int year = ParseYear(baseYear);
        string monthExpr = SqlIncomeMonthNum();
        string sql = @"
SELECT TRY_CONVERT(int, [Year]) AS [Year],
       " + monthExpr + @" AS [Month],
       " + SqlNetSum() + @" AS [TotalAmount],
       " + SqlUnitsSum() + @" AS [SurgeryCount],
       CASE WHEN " + SqlUnitsSum() + @" = 0 THEN 0
            ELSE " + SqlNetSum() + @" / NULLIF(" + SqlUnitsSum() + @", 0)
       END AS [AvgAmount]
FROM " + IncomeTable + @" WITH (NOLOCK)
WHERE TRY_CONVERT(int, [Year]) BETWEEN @minYear AND @baseYear
" + BuildIncomeCompleteMonthClause(monthExpr) + @"
" + BuildIncomeAndClause() + @"
GROUP BY TRY_CONVERT(int, [Year]), " + monthExpr;
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddIncomeFilters(cmd, department, billingDepartment, surgeryType, shift, site, payer);
        });
    }

    public string GetRevenueStackedComposite(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer)
    {
        int year = ParseYear(baseYear);
        string fund = IncomeLabel("Organization");
        string payerExpr = IncomeLabel("UnifiedPayer");
        string category = IncomeLabel("UnifiedCategory");
        string sql = @"
SELECT TRY_CONVERT(int, [Year]) AS [Year],
       " + fund + @" AS [FundKey],
       " + payerExpr + @" AS [PayerKey],
       " + category + @" AS [BillingCategoryKey],
       " + SqlNetSum() + @" AS [TotalAmount]
FROM " + IncomeTable + @" WITH (NOLOCK)
WHERE TRY_CONVERT(int, [Year]) BETWEEN @minYear AND @baseYear
" + BuildIncomeCompleteMonthClause(SqlIncomeMonthNum()) + @"
" + BuildIncomeAndClause() + @"
GROUP BY TRY_CONVERT(int, [Year]), " + fund + @", " + payerExpr + @", " + category;
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddIncomeFilters(cmd, department, billingDepartment, surgeryType, shift, site, payer);
        });
    }

    public string GetServicePerformed(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms, string payer, string mode, string search, string listGroupBy, string serviceName, string unifiedCategory, string breakdownBy)
    {
        int year = ParseYear(baseYear);
        string modeNorm = (mode ?? "summary").Trim().ToLowerInvariant();
        string breakdown = (breakdownBy ?? "year").Trim().ToLowerInvariant();
        string serviceExpr = SqlServiceNameExpr();
        string categoryExpr = "ISNULL(LTRIM(RTRIM(UnifiedCategory)), N'')";
        string incomeMonthWhere = BuildIncomeCompleteMonthClause(SqlIncomeMonthNum());
        string serviceFilter = @"
  AND (@serviceName = N'' OR " + serviceExpr + @" = @serviceName)
  AND (@unifiedCategory = N'' OR " + categoryExpr + @" = @unifiedCategory)
  AND (@search = N'' OR CHARINDEX(@search, " + serviceExpr + @") > 0 OR CHARINDEX(@search, " + categoryExpr + @") > 0)";
        string sql;
        if (modeNorm == "breakdown")
        {
            string periodSelect;
            string periodGroup;
            string extraWhere = "";
            if (breakdown == "month")
            {
                string monthExpr = SqlIncomeMonthNum();
                periodSelect = "CONVERT(varchar(10), " + monthExpr + ") AS [PeriodKey], TRY_CONVERT(int, [Year]) AS [Year], " + monthExpr + " AS [Month], N'' AS [Shift]";
                periodGroup = "TRY_CONVERT(int, [Year]), " + monthExpr;
                extraWhere = "  AND " + monthExpr + " IS NOT NULL";
            }
            else if (breakdown == "shift" || breakdown == "quarter")
            {
                string quarterExpr = IncomeLabel("CONVERT(nvarchar(20), Quarter)");
                string periodExpr = "CONVERT(varchar(4), TRY_CONVERT(int, [Year])) + N'/' + " + quarterExpr;
                periodSelect = periodExpr + " AS [PeriodKey], TRY_CONVERT(int, [Year]) AS [Year], 0 AS [Month], " + quarterExpr + " AS [Shift]";
                periodGroup = "TRY_CONVERT(int, [Year]), " + quarterExpr;
            }
            else
            {
                periodSelect = "CONVERT(varchar(4), TRY_CONVERT(int, [Year])) AS [PeriodKey], TRY_CONVERT(int, [Year]) AS [Year], 0 AS [Month], N'' AS [Shift]";
                periodGroup = "TRY_CONVERT(int, [Year])";
            }
            sql = @"
SELECT " + periodSelect + @",
       " + SqlUnitsSum() + @" AS [Count]
FROM " + IncomeTable + @" WITH (NOLOCK)
WHERE TRY_CONVERT(int, [Year]) BETWEEN @minYear AND @baseYear
" + incomeMonthWhere + @"
" + BuildIncomeAndClause() + serviceFilter + @"
" + extraWhere + @"
GROUP BY " + periodGroup;
        }
        else
        {
            sql = @"
SELECT " + serviceExpr + @" AS [ServiceName],
       " + categoryExpr + @" AS [UnifiedCategory],
       " + SqlUnitsSum() + @" AS [TotalCount]
FROM " + IncomeTable + @" WITH (NOLOCK)
WHERE TRY_CONVERT(int, [Year]) BETWEEN @minYear AND @baseYear
" + incomeMonthWhere + @"
" + BuildIncomeAndClause() + serviceFilter + @"
GROUP BY " + serviceExpr + @", " + categoryExpr;
        }
        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            BindCompleteMonthRange(cmd, year);
            AddIncomeFilters(cmd, department, billingDepartment, surgeryType, shift, site, payer);
            cmd.Parameters.AddWithValue("@serviceName", (serviceName ?? "").Trim());
            cmd.Parameters.AddWithValue("@unifiedCategory", (unifiedCategory ?? "").Trim());
            cmd.Parameters.AddWithValue("@search", (search ?? "").Trim());
        });
    }

    /// <summary>
    /// Explore series: day / week / month buckets for an arbitrary date range.
    /// Same sidebar filters as GetMonthlyCounts (BuildCommonAndClause).
    /// Week starts Sunday (independent of DATEFIRST).
    /// </summary>
    public string GetExploreSeries(
        string fromDate,
        string toDate,
        string grain,
        string department,
        string surgeryType,
        string shift,
        string site,
        string weekend,
        string morningWork,
        string rooms)
    {
        DateTime from;
        DateTime to;
        if (!DateTime.TryParse((fromDate ?? "").Trim(), out from))
        {
            from = DateTime.Today.AddDays(-90);
        }
        if (!DateTime.TryParse((toDate ?? "").Trim(), out to))
        {
            to = DateTime.Today;
        }
        from = from.Date;
        to = to.Date.AddDays(1);
        if (to <= from)
        {
            to = from.AddDays(1);
        }

        string g = (grain ?? "day").Trim().ToLowerInvariant();
        string dateCol = Q(C_SurgeryDate);
        string periodExpr;
        if (g == "week")
        {
            periodExpr = "DATEADD(DAY, -((DATEDIFF(DAY, 0, " + dateCol + ") + 1) % 7), CAST(" + dateCol + " AS date))";
        }
        else if (g == "month")
        {
            periodExpr = "DATEFROMPARTS(YEAR(" + dateCol + "), MONTH(" + dateCol + "), 1)";
        }
        else
        {
            periodExpr = "CAST(" + dateCol + " AS date)";
        }

        string sql = @"
SELECT CONVERT(varchar(10), " + periodExpr + @", 23) AS [PeriodStart],
       ISNULL(" + Q(C_SurgeryType) + @", N'') AS [SurgeryType],
       COUNT(*) AS [Count],
       AVG(CAST(" + SqlRoomMinutesExpr() + @" AS float)) AS [AvgDurationMin],
       COUNT(DISTINCT CAST(" + Q(C_SurgeryRoom) + @" AS nvarchar(50))) AS [UniqueRooms],
       COUNT(DISTINCT CAST(" + dateCol + @" AS date)) AS [UniqueDays]
FROM " + PciTable + @" WITH (NOLOCK)
WHERE " + dateCol + @" >= @fromDate AND " + dateCol + @" < @toDate
" + BuildCommonAndClause() + @"
GROUP BY " + periodExpr + @", ISNULL(" + Q(C_SurgeryType) + @", N'')
ORDER BY [PeriodStart], [SurgeryType]";

        return QueryToJson(sql, delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@fromDate", from);
            cmd.Parameters.AddWithValue("@toDate", to);
            AddCommonFilters(cmd, department, surgeryType, shift, site, weekend, morningWork, rooms);
        });
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
