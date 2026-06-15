# Backend: `GetSurgeriesByDoctor_surgeries_dashborad` + `GetSurgeriesByDepartment_surgeries_dashborad`

שני endpoints חדשים לדשבורד **המלצות לניתוח** (wait-times).  
הקליינט Angular כבר קורא ל-endpoints אלה.

**מקור נתונים:** `[NAMER].[dbo].[SurgerydashboardForRoey] WITH (NOLOCK)`

**חלון זמן:** 5 שנים גלגוליות לפי `baseYear` → `YEAR([תאריך]) BETWEEN (baseYear - 4) AND baseYear`

---

## Endpoint 1 — `GetSurgeriesByDoctor_surgeries_dashborad`

### Request

| Item | Value |
|------|--------|
| **Method** | `GET` (ASMX ScriptService) |
| **URL** | `WebService.asmx/GetSurgeriesByDoctor_surgeries_dashborad` |

### Query parameters (כולם אופציונליים — פרמטר ריק = ללא סינון)

| Parameter | Example | Description |
|-----------|---------|-------------|
| `baseYear` | `2026` | שנה בסיס לחלון 5 שנים |
| `surgeryType` | `אלקטיבי` | סוג ניתוח מאוחד |
| `shift` | `בוקר` | משמרת |
| `site` | | אתר חדר ניתוח |
| `weekend` | `false` | `true` = סופ״ש, `false` = אמצע שבוע |
| `morningWork` | | `true` / `false` — עבודת בוקר |
| `rooms` | | רשימת חדרים מופרדת בפסיקים |

### Response

```json
[
  { "Year": 2025, "DoctorName": "ד\"ר כהן", "Count": 145 },
  { "Year": 2025, "DoctorName": "ד\"ר לוי", "Count": 92 }
]
```

### SQL ליבה

```sql
SELECT
    YEAR([תאריך]) AS [Year],
    ISNULL([מנתחת], [רופא אחראי]) AS DoctorName,
    COUNT(*) AS [Count]
FROM [NAMER].[dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
WHERE YEAR([תאריך]) BETWEEN @yearFrom AND @yearTo
  -- + פילטרים דינמיים (surgeryType, shift, site, weekend, morningWork, rooms)
  AND ISNULL([מנתחת], [רופא אחראי]) IS NOT NULL
  AND LTRIM(RTRIM(ISNULL([מנתחת], [רופא אחראי]))) <> ''
GROUP BY
    YEAR([תאריך]),
    ISNULL([מנתחת], [רופא אחראי])
ORDER BY
    [Year],
    [Count] DESC;
```

---

## Endpoint 2 — `GetSurgeriesByDepartment_surgeries_dashborad`

### Request

| Item | Value |
|------|--------|
| **Method** | `GET` (ASMX ScriptService) |
| **URL** | `WebService.asmx/GetSurgeriesByDepartment_surgeries_dashborad` |

אותם query parameters כמו Endpoint 1.

### Response

```json
[
  { "Year": 2025, "Department": "כירורגיה", "Count": 320 },
  { "Year": 2025, "Department": "א.א.ג.", "Count": 88 }
]
```

### SQL ליבה

```sql
SELECT
    YEAR([תאריך]) AS [Year],
    [מנתחת מאוגד] AS Department,
    COUNT(*) AS [Count]
FROM [NAMER].[dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
WHERE YEAR([תאריך]) BETWEEN @yearFrom AND @yearTo
  -- + פילטרים דינמיים
  AND [מנתחת מאוגד] IS NOT NULL
  AND LTRIM(RTRIM([מנתחת מאוגד])) <> ''
GROUP BY
    YEAR([תאריך]),
    [מנתחת מאוגד]
ORDER BY
    [Year],
    [Count] DESC;
```

---

## C# — DTOs + WebMethods

```csharp
public class SurgeriesByDoctorRowDto
{
    public int Year { get; set; }
    public string DoctorName { get; set; }
    public int Count { get; set; }
}

public class SurgeriesByDepartmentRowDto
{
    public int Year { get; set; }
    public string Department { get; set; }
    public int Count { get; set; }
}

[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = true)]
public void GetSurgeriesByDoctor_surgeries_dashborad(
    string baseYear = "",
    string surgeryType = "",
    string shift = "",
    string site = "",
    string weekend = "",
    string morningWork = "",
    string rooms = "")
{
    try
    {
        var filters = BuildSurgerydashboardForRoeyFilters(
            baseYear, surgeryType, shift, site, weekend, morningWork, rooms);

        string sql = $@"
SELECT
    YEAR([תאריך]) AS [Year],
    ISNULL([מנתחת], [רופא אחראי]) AS DoctorName,
    COUNT(*) AS [Count]
FROM [NAMER].[dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
{filters.WhereSql}
  AND ISNULL([מנתחת], [רופא אחראי]) IS NOT NULL
  AND LTRIM(RTRIM(ISNULL([מנתחת], [רופא אחראי]))) <> N''
GROUP BY
    YEAR([תאריך]),
    ISNULL([מנתחת], [רופא אחראי])
ORDER BY
    [Year],
    [Count] DESC;";

        var rows = QuerySurgeriesByDoctor(sql, filters.Params);
        WriteJsonResponse(rows);
    }
    catch (Exception ex)
    {
        WriteJsonResponse(new { error = ex.Message });
    }
}

[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = true)]
public void GetSurgeriesByDepartment_surgeries_dashborad(
    string baseYear = "",
    string surgeryType = "",
    string shift = "",
    string site = "",
    string weekend = "",
    string morningWork = "",
    string rooms = "")
{
    try
    {
        var filters = BuildSurgerydashboardForRoeyFilters(
            baseYear, surgeryType, shift, site, weekend, morningWork, rooms);

        string sql = $@"
SELECT
    YEAR([תאריך]) AS [Year],
    [מנתחת מאוגד] AS Department,
    COUNT(*) AS [Count]
FROM [NAMER].[dbo].[SurgerydashboardForRoey] WITH (NOLOCK)
{filters.WhereSql}
  AND [מנתחת מאוגד] IS NOT NULL
  AND LTRIM(RTRIM([מנתחת מאוגד])) <> N''
GROUP BY
    YEAR([תאריך]),
    [מנתחת מאוגד]
ORDER BY
    [Year],
    [Count] DESC;";

        var rows = QuerySurgeriesByDepartment(sql, filters.Params);
        WriteJsonResponse(rows);
    }
    catch (Exception ex)
    {
        WriteJsonResponse(new { error = ex.Message });
    }
}
```

---

## C# — פילטרים משותפים (כמו שאר surgeries_dashborad)

```csharp
private sealed class SurgerydashboardFilters
{
    public string WhereSql { get; set; }
    public List<SqlParameter> Params { get; set; }
}

/// <summary>
/// בונה WHERE דינמי — פרמטרים ריקים מתעלמים מהם.
/// </summary>
private SurgerydashboardFilters BuildSurgerydashboardForRoeyFilters(
    string baseYear,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    int yearTo = DateTime.Now.Year;
    if (!string.IsNullOrWhiteSpace(baseYear))
        int.TryParse(baseYear.Trim(), out yearTo);

    int yearFrom = yearTo - 4;

    var where = new StringBuilder("WHERE YEAR([תאריך]) BETWEEN @yearFrom AND @yearTo");
    var pars = new List<SqlParameter>
    {
        new SqlParameter("@yearFrom", yearFrom),
        new SqlParameter("@yearTo", yearTo),
    };

    surgeryType = (surgeryType ?? "").Trim();
    shift = (shift ?? "").Trim();
    site = (site ?? "").Trim();
    weekend = (weekend ?? "").Trim().ToLowerInvariant();
    morningWork = (morningWork ?? "").Trim().ToLowerInvariant();
    rooms = (rooms ?? "").Trim();

    // surgeryType — תמיכה ברשימה מופרדת בפסיקים
    AppendCsvFilter(where, pars, surgeryType, "surgeryType",
        "ISNULL([סוג ניתוח מאוחד], ISNULL([סוג ניתוח], N''))");

    // shift
    AppendCsvFilter(where, pars, shift, "shift",
        "ISNULL([משמרת], ISNULL([Shift], N''))");

    // site
    AppendCsvFilter(where, pars, site, "site",
        "ISNULL([אתר], ISNULL([Site], N''))");

    // weekend — false = אמצע שבוע, true = סופ״ש
    if (weekend == "true")
    {
        where.Append(@"
  AND (
        ISNULL([יום_או_סופש], N'') LIKE N'%סופ%'
     OR ISNULL([IsWeekend], 0) = 1
  )");
    }
    else if (weekend == "false")
    {
        where.Append(@"
  AND (
        ISNULL([יום_או_סופש], N'') = N'אמצע שבוע'
     OR ISNULL([IsWeekend], 0) = 0
  )");
    }

    // morningWork — עבודת בוקר (התאימו לשם העמודה בטבלה)
    if (morningWork == "true")
    {
        where.Append(@"
  AND (
        ISNULL([עבודת בוקר], N'') IN (N'כן', N'1', N'true', N'True')
     OR ISNULL([MorningWork], 0) = 1
  )");
    }
    else if (morningWork == "false")
    {
        where.Append(@"
  AND (
        ISNULL([עבודת בוקר], N'') IN (N'לא', N'0', N'false', N'False')
     OR ISNULL([MorningWork], 0) = 0
  )");
    }

    // rooms — רשימת חדרים מופרדת בפסיקים
    AppendCsvFilter(where, pars, rooms, "room",
        "ISNULL([חדר ניתוח], ISNULL([SurgeryRoom], N''))");

    return new SurgerydashboardFilters { WhereSql = where.ToString(), Params = pars };
}

/// <summary>
/// מוסיף IN (...) לערכים מופרדים בפסיק; מתעלם ממחרוזת ריקה.
/// </summary>
private void AppendCsvFilter(
    StringBuilder where,
    List<SqlParameter> pars,
    string csv,
    string paramPrefix,
    string columnExpr)
{
    if (string.IsNullOrWhiteSpace(csv)) return;

    var values = csv.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
        .Select(v => v.Trim())
        .Where(v => v.Length > 0)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    if (values.Count == 0) return;

    if (values.Count == 1)
    {
        string p = "@" + paramPrefix;
        where.Append($" AND {columnExpr} = {p}");
        pars.Add(new SqlParameter(p, values[0]));
        return;
    }

    var inParts = new List<string>();
    for (int i = 0; i < values.Count; i++)
    {
        string p = "@" + paramPrefix + i;
        inParts.Add(p);
        pars.Add(new SqlParameter(p, values[i]));
    }
    where.Append($" AND {columnExpr} IN ({string.Join(", ", inParts)})");
}

private List<SurgeriesByDoctorRowDto> QuerySurgeriesByDoctor(
    string sql, List<SqlParameter> pars)
{
    var list = new List<SurgeriesByDoctorRowDto>();
    using (var conn = new SqlConnection(connectionString))
    using (var cmd = new SqlCommand(sql, conn))
    {
        cmd.Parameters.AddRange(pars.ToArray());
        conn.Open();
        using (var r = cmd.ExecuteReader())
        {
            while (r.Read())
            {
                list.Add(new SurgeriesByDoctorRowDto
                {
                    Year = Convert.ToInt32(r["Year"]),
                    DoctorName = r["DoctorName"]?.ToString() ?? "",
                    Count = Convert.ToInt32(r["Count"]),
                });
            }
        }
    }
    return list;
}

private List<SurgeriesByDepartmentRowDto> QuerySurgeriesByDepartment(
    string sql, List<SqlParameter> pars)
{
    var list = new List<SurgeriesByDepartmentRowDto>();
    using (var conn = new SqlConnection(connectionString))
    using (var cmd = new SqlCommand(sql, conn))
    {
        cmd.Parameters.AddRange(pars.ToArray());
        conn.Open();
        using (var r = cmd.ExecuteReader())
        {
            while (r.Read())
            {
                list.Add(new SurgeriesByDepartmentRowDto
                {
                    Year = Convert.ToInt32(r["Year"]),
                    Department = r["Department"]?.ToString() ?? "",
                    Count = Convert.ToInt32(r["Count"]),
                });
            }
        }
    }
    return list;
}
```

> **הערות ליישום:**
> - `WriteJsonResponse` — אותה פונקציית עזר כמו ב-`GetMonthlyCounts_surgeries_dashborad` / `GetCountByDoctor_surgeries_dashborad`.
> - `connectionString` — אותו connection string כמו בשאר methods של הדשבורד.
> - התאימו שמות עמודות (`[משמרת]`, `[עבודת בוקר]`, `[יום_או_סופש]`) לסכימה האמיתית אם שונים.
> - פרמטרים ריקים (`site=`, `rooms=`) **לא** מוסיפים תנאי WHERE.
> - `Department` = ערך `[מנתחת מאוגד]` בלבד — ללא המרות client-side.

---

## Checklist

1. הוסיפו שני `[WebMethod]` ל-`WebService.cs` (או partial class קיים).
2. חלון 5 שנים: `baseYear - 4` עד `baseYear` על `YEAR([תאריך])`.
3. `WITH (NOLOCK)` על `SurgerydashboardForRoey`.
4. החזירו מערך JSON (עטיפת `{ d: ... }` אם זה הסטנדרט אצלכם).
5. בדקו עם:
   - `GET .../GetSurgeriesByDoctor_surgeries_dashborad?baseYear=2026&surgeryType=אלקטיבי&shift=בוקר&weekend=false`
   - `GET .../GetSurgeriesByDepartment_surgeries_dashborad?baseYear=2026&surgeryType=אלקטיבי&shift=בוקר&weekend=false`
