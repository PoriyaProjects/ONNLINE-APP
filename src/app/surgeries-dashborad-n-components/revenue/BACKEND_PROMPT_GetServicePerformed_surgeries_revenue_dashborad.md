# Backend: `GetServicePerformed_surgeries_revenue_dashborad`

API קטן אחד לדשבורד **הכנסות → סוג שירות**.  
הקליינט Angular כבר קורא ל-endpoint זה.

---

## Request

| Item | Value |
|------|--------|
| **Method** | `GET` (ASMX ScriptService — כמו שאר revenue dashboard) |
| **URL** | `WebService.asmx/GetServicePerformed_surgeries_revenue_dashborad` |
| **Base** | אותו `environment.url` כמו `GetRevenueByDeptFiveYears_surgeries_revenue_dashborad` |

### Query parameters (כולם אופציונליים)

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | string | `summary` (ברירת מחדל) או `breakdown` |
| `baseYear` | string | שנה בסיס — לחיתוך 5 שנים אחרונות |
| `department` | string | מחלקה (Wing / MappedDept). **ריק = כל בית החולים** |
| `surgeryType` | string | סוג ניתוח (אלקטיבי / ססיה / דחוף) |
| `shift` | string | משמרת (בוקר / ערב / לילה) |
| `site` | string | אתר חדר ניתוח |
| `weekend` | string | `true` / `false` — סופ״ש מול אמצע שבוע |
| `payer` | string | גורם משלם |
| `search` | string | חיפוש חופשי ב־`שם_שירות` וב־`קטגוריה_מאוחדת` |
| `listGroupBy` | string | `service` (ברירת מחדל) או `category` — לסיכום בלבד |
| `serviceName` | string | שם שירות לפירוט (mode=breakdown) |
| `unifiedCategory` | string | קטגוריה מאוחדת לפירוט (mode=breakdown) |
| `breakdownBy` | string | `year` / `shift` / `month` — לפירוט בלבד |

**חשוב:** אם לא נשלחים פרמטרי סינון (מחלקה, משמרת וכו') — השרת מחזיר נתונים על **כלל בית החולים**.

---

## Response

### mode = `summary`

```json
[
  {
    "ServiceName": "כריתת תוספתן",
    "UnifiedCategory": "כירורגיה כללית",
    "TotalCount": 842
  }
]
```

### mode = `breakdown`

```json
[
  {
    "PeriodKey": "2024",
    "Year": 2024,
    "Month": 0,
    "Shift": "",
    "Count": 156
  }
]
```

---

## C# — WebMethod מלא

```csharp
public class ServicePerformedSummaryDto
{
    public string ServiceName { get; set; }
    public string UnifiedCategory { get; set; }
    public int TotalCount { get; set; }
}

public class ServicePerformedBreakdownDto
{
    public string PeriodKey { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string Shift { get; set; }
    public int Count { get; set; }
}

[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = true)]
public void GetServicePerformed_surgeries_revenue_dashborad(
    string mode = "summary",
    string baseYear = "",
    string department = "",
    string surgeryType = "",
    string shift = "",
    string site = "",
    string weekend = "",
    string payer = "",
    string search = "",
    string listGroupBy = "service",
    string serviceName = "",
    string unifiedCategory = "",
    string breakdownBy = "year")
{
    try
    {
        mode = (mode ?? "summary").Trim().ToLowerInvariant();
        if (mode != "breakdown") mode = "summary";

        int yearBase = DateTime.Now.Year;
        if (!string.IsNullOrWhiteSpace(baseYear))
            int.TryParse(baseYear.Trim(), out yearBase);

        int yearFrom = yearBase - 4;

        department = (department ?? "").Trim();
        surgeryType = (surgeryType ?? "").Trim();
        shift = (shift ?? "").Trim();
        site = (site ?? "").Trim();
        weekend = (weekend ?? "").Trim();
        payer = (payer ?? "").Trim();
        search = (search ?? "").Trim();
        listGroupBy = (listGroupBy ?? "service").Trim().ToLowerInvariant();
        serviceName = (serviceName ?? "").Trim();
        unifiedCategory = (unifiedCategory ?? "").Trim();
        breakdownBy = (breakdownBy ?? "year").Trim().ToLowerInvariant();

        var filters = BuildServicePerformedWhere(
            yearFrom, yearBase,
            department, surgeryType, shift, site, weekend, payer, search);

        if (mode == "summary")
        {
            var rows = QueryServicePerformedSummary(filters, listGroupBy);
            WriteJsonResponse(rows);
            return;
        }

        var detail = QueryServicePerformedBreakdown(
            filters, serviceName, unifiedCategory, breakdownBy);
        WriteJsonResponse(detail);
    }
    catch (Exception ex)
    {
        WriteJsonResponse(new { error = ex.Message });
    }
}

private sealed class ServicePerformedFilters
{
    public string WhereSql { get; set; }
    public List<SqlParameter> Params { get; set; }
}

private ServicePerformedFilters BuildServicePerformedWhere(
    int yearFrom, int yearTo,
    string department, string surgeryType, string shift,
    string site, string weekend, string payer, string search)
{
    var where = new StringBuilder(@"
WHERE [Year] BETWEEN @yearFrom AND @yearTo
  AND ISNULL([שם_שירות], '') <> ''");

    var pars = new List<SqlParameter>
    {
        new SqlParameter("@yearFrom", yearFrom),
        new SqlParameter("@yearTo", yearTo),
    };

    if (!string.IsNullOrEmpty(department))
    {
        where.Append(@"
  AND (
        ISNULL([Wing], '') = @department
     OR ISNULL([MappedDept], '') = @department
     OR ISNULL([S_DEPARTMENT], '') = @department
  )");
        pars.Add(new SqlParameter("@department", department));
    }

    if (!string.IsNullOrEmpty(surgeryType))
    {
        where.Append(" AND ISNULL([SurgeryType], '') = @surgeryType");
        pars.Add(new SqlParameter("@surgeryType", surgeryType));
    }

    if (!string.IsNullOrEmpty(shift))
    {
        where.Append(" AND ISNULL([Shift], '') = @shift");
        pars.Add(new SqlParameter("@shift", shift));
    }

    if (!string.IsNullOrEmpty(site))
    {
        where.Append(" AND ISNULL([Site], '') = @site");
        pars.Add(new SqlParameter("@site", site));
    }

    if (!string.IsNullOrEmpty(payer))
    {
        where.Append(" AND ISNULL([Payer], '') = @payer");
        pars.Add(new SqlParameter("@payer", payer));
    }

    if (weekend == "true")
        where.Append(" AND ISNULL([IsWeekend], 0) = 1");
    else if (weekend == "false")
        where.Append(" AND ISNULL([IsWeekend], 0) = 0");

    if (!string.IsNullOrEmpty(search))
    {
        where.Append(@"
  AND (
        [שם_שירות] LIKE @search
     OR [קטגוריה_מאוחדת] LIKE @search
  )");
        pars.Add(new SqlParameter("@search", "%" + search + "%"));
    }

    return new ServicePerformedFilters { WhereSql = where.ToString(), Params = pars };
}

private List<ServicePerformedSummaryDto> QueryServicePerformedSummary(
    ServicePerformedFilters filters, string listGroupBy)
{
    string groupExpr = listGroupBy == "category"
        ? "ISNULL([קטגוריה_מאוחדת], N'—')"
        : "ISNULL([שם_שירות], N'—')";

    string sql = $@"
SELECT
    CASE WHEN @listGroupBy = 'category' THEN N'' ELSE ISNULL([שם_שירות], N'—') END AS ServiceName,
    ISNULL([קטגוריה_מאוחדת], N'—') AS UnifiedCategory,
    COUNT(*) AS TotalCount
FROM [dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
{filters.WhereSql}
GROUP BY
    CASE WHEN @listGroupBy = 'category' THEN ISNULL([קטגוריה_מאוחדת], N'—')
         ELSE ISNULL([שם_שירות], N'—') END,
    CASE WHEN @listGroupBy = 'category' THEN N'' ELSE ISNULL([שם_שירות], N'—') END,
    ISNULL([קטגוריה_מאוחדת], N'—')
ORDER BY TotalCount ASC;";

    var pars = new List<SqlParameter>(filters.Params)
    {
        new SqlParameter("@listGroupBy", listGroupBy == "category" ? "category" : "service"),
    };

    var list = new List<ServicePerformedSummaryDto>();
    using (var conn = new SqlConnection(ConfigurationManager.ConnectionStrings["YourConn"].ConnectionString))
    using (var cmd = new SqlCommand(sql, conn))
    {
        cmd.Parameters.AddRange(pars.ToArray());
        conn.Open();
        using (var r = cmd.ExecuteReader())
        {
            while (r.Read())
            {
                list.Add(new ServicePerformedSummaryDto
                {
                    ServiceName = r["ServiceName"]?.ToString() ?? "",
                    UnifiedCategory = r["UnifiedCategory"]?.ToString() ?? "",
                    TotalCount = Convert.ToInt32(r["TotalCount"]),
                });
            }
        }
    }
    return list;
}

private List<ServicePerformedBreakdownDto> QueryServicePerformedBreakdown(
    ServicePerformedFilters filters,
    string serviceName,
    string unifiedCategory,
    string breakdownBy)
{
    var where = new StringBuilder(filters.WhereSql);
    var pars = new List<SqlParameter>(filters.Params);

    if (!string.IsNullOrEmpty(serviceName))
    {
        where.Append(" AND ISNULL([שם_שירות], '') = @serviceName");
        pars.Add(new SqlParameter("@serviceName", serviceName));
    }
    if (!string.IsNullOrEmpty(unifiedCategory))
    {
        where.Append(" AND ISNULL([קטגוריה_מאוחדת], '') = @unifiedCategory");
        pars.Add(new SqlParameter("@unifiedCategory", unifiedCategory));
    }

    string selectPeriod;
    string groupBy;
    string orderBy;

    switch ((breakdownBy ?? "year").ToLowerInvariant())
    {
        case "shift":
            selectPeriod = "ISNULL([Shift], N'—')";
            groupBy = "ISNULL([Shift], N'—')";
            orderBy = "COUNT(*) ASC";
            break;
        case "month":
            selectPeriod = "CAST([Month] AS varchar(2)) + N'/' + CAST([Year] AS varchar(4))";
            groupBy = "[Year], [Month]";
            orderBy = "[Year], [Month]";
            break;
        default:
            selectPeriod = "CAST([Year] AS varchar(4))";
            groupBy = "[Year]";
            orderBy = "[Year] ASC";
            breakdownBy = "year";
            break;
    }

    string sql = $@"
SELECT
    {selectPeriod} AS PeriodKey,
    ISNULL([Year], 0) AS [Year],
    ISNULL([Month], 0) AS [Month],
    ISNULL([Shift], N'') AS [Shift],
    COUNT(*) AS [Count]
FROM [dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
{where}
GROUP BY {groupBy}, ISNULL([Year], 0), ISNULL([Month], 0), ISNULL([Shift], N'')
ORDER BY {orderBy};";

    var list = new List<ServicePerformedBreakdownDto>();
    using (var conn = new SqlConnection(ConfigurationManager.ConnectionStrings["YourConn"].ConnectionString))
    using (var cmd = new SqlCommand(sql, conn))
    {
        cmd.Parameters.AddRange(pars.ToArray());
        conn.Open();
        using (var r = cmd.ExecuteReader())
        {
            while (r.Read())
            {
                list.Add(new ServicePerformedBreakdownDto
                {
                    PeriodKey = r["PeriodKey"]?.ToString() ?? "",
                    Year = Convert.ToInt32(r["Year"]),
                    Month = Convert.ToInt32(r["Month"]),
                    Shift = r["Shift"]?.ToString() ?? "",
                    Count = Convert.ToInt32(r["Count"]),
                });
            }
        }
    }
    return list;
}
```

> **הערות ליישום:**
> - התאימו שמות עמודות (`Wing`, `Shift`, `Year`, `Month`, `SurgeryType`, `Site`, `Payer`, `IsWeekend`) לסכימה האמיתית של `SurgerydashboardForRoey`.
> - `WriteJsonResponse` — אותה פונקציית עזר כמו בשאר WebMethods של הדשבורד.
> - כשאין `department` / `shift` / פרמטרים אחרים — אין סינון עליהם → **כל בית החולים**.
> - `serviceName` ו־`unifiedCategory` ריקים ב־`breakdown` → סיכום שנתי לכל בית החולים (לכרטיסי שנה בקליינט).

---

## SQL לדוגמה (סיכום)

```sql
DECLARE @yearFrom int = YEAR(GETDATE()) - 4;
DECLARE @yearTo   int = YEAR(GETDATE());

SELECT
    ISNULL([שם_שירות], N'—')      AS ServiceName,
    ISNULL([קטגוריה_מאוחדת], N'—') AS UnifiedCategory,
    COUNT(*)                      AS TotalCount
FROM [dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
WHERE [Year] BETWEEN @yearFrom AND @yearTo
  AND ISNULL([שם_שירות], '') <> ''
  -- אופציונלי: AND [Wing] = @department
GROUP BY [שם_שירות], [קטגוריה_מאוחדת]
ORDER BY TotalCount ASC;
```
