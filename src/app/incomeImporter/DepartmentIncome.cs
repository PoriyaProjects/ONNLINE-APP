using Microsoft.Office.Interop.Excel;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web.Services;

public class DepartmentIncome
{
    private readonly string connectionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";
    private readonly string tableName = "Excel_QuarterlyIncome";

    public List<DepartmentComparisonDto> GetDepartmentIncomeComparison(
        string medicalUnitIncome = null,
        string incomeCategory = null,
        string organization = null,
        string unifiedCategory = null)
    {
        try
        {
            List<DepartmentIncomeData> result = new List<DepartmentIncomeData>();

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                string query = @"
                    WITH LatestYear AS (
                        SELECT MAX(TRY_CAST(Year AS INT)) AS MaxYear
                        FROM Excel_QuarterlyIncome
                    ),
                    LatestYearMonth AS (
                        SELECT MAX(CASE Month
                            WHEN N'ינואר' THEN 1
                            WHEN N'פברואר' THEN 2
                            WHEN N'מרץ' THEN 3
                            WHEN N'אפריל' THEN 4
                            WHEN N'מאי' THEN 5
                            WHEN N'יוני' THEN 6
                            WHEN N'יולי' THEN 7
                            WHEN N'אוגוסט' THEN 8
                            WHEN N'ספטמבר' THEN 9
                            WHEN N'אוקטובר' THEN 10
                            WHEN N'נובמבר' THEN 11
                            WHEN N'דצמבר' THEN 12
                        END) AS MaxMonth
                        FROM Excel_QuarterlyIncome
                        CROSS JOIN LatestYear
                        WHERE TRY_CAST(Year AS INT) = LatestYear.MaxYear
                    ),
                    YearsToCompare AS (
                        SELECT DISTINCT TRY_CAST(Year AS INT) AS Year
                        FROM Excel_QuarterlyIncome
                        CROSS JOIN LatestYear
                        WHERE TRY_CAST(Year AS INT) BETWEEN LatestYear.MaxYear - 1 AND LatestYear.MaxYear
                    )
                    SELECT
                        PatientSummary AS DepartmentName,
                        Year,
                        TRY_CONVERT(DECIMAL(18,2), NetIncomeTotal) AS RealValue
                    FROM Excel_QuarterlyIncome
                    WHERE TRY_CAST(Year AS INT) IN (SELECT Year FROM YearsToCompare)
                        AND CASE Month
                            WHEN N'ינואר' THEN 1
                            WHEN N'פברואר' THEN 2
                            WHEN N'מרץ' THEN 3
                            WHEN N'אפריל' THEN 4
                            WHEN N'מאי' THEN 5
                            WHEN N'יוני' THEN 6
                            WHEN N'יולי' THEN 7
                            WHEN N'אוגוסט' THEN 8
                            WHEN N'ספטמבר' THEN 9
                            WHEN N'אוקטובר' THEN 10
                            WHEN N'נובמבר' THEN 11
                            WHEN N'דצמבר' THEN 12
                        END <= (SELECT MaxMonth FROM LatestYearMonth)
                        AND UnifiedDiagnosis LIKE N'%אגף כירורגי%'
                        AND NetIncomeTotal IS NOT NULL
                        AND NetIncomeTotal <> ''
                         AND (@MedicalUnitIncome IS NULL OR MedicalUnit_Income = @MedicalUnitIncome)
                        AND (@IncomeCategory IS NULL OR IncomeCategory = @IncomeCategory)
                        AND (@Organization IS NULL OR Organization = @Organization)
                        AND (@UnifiedCategory IS NULL OR UnifiedCategory = @UnifiedCategory)
                ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;
                    AddFilterParameters(cmd, medicalUnitIncome, incomeCategory, organization, unifiedCategory);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            string dept = reader["DepartmentName"].ToString();
                            string year = reader["Year"].ToString();
                            decimal value = reader["RealValue"] != DBNull.Value
                                ? Convert.ToDecimal(reader["RealValue"])
                                : 0m;

                            DepartmentIncomeData item = new DepartmentIncomeData();
                            item.DepartmentName = dept;
                            item.Year = year;
                            item.RealValue = value;

                            result.Add(item);
                        }
                    }
                }
            }

            List<string> years = result.Select(x => x.Year).Distinct().OrderByDescending(x => x).Take(2).ToList();
            if (years.Count == 0)
            {
                return new List<DepartmentComparisonDto>();
            }

            string year1 = years.Count > 1 ? years[1] : years[0];
            string year2 = years.Count > 0 ? years[0] : year1;

            List<DepartmentComparisonDto> groupedData = result
                .GroupBy(x => x.DepartmentName)
                .Select(g => new DepartmentComparisonDto
                {
                    DepartmentName = g.Key,
                    Income2024 = g.Where(x => x.Year == year1).Sum(x => x.RealValue),
                    Income2025 = g.Where(x => x.Year == year2).Sum(x => x.RealValue)
                })
                .OrderByDescending(x => x.Income2025)
                .ToList();

            return groupedData;
        }
        catch (Exception ex)
        {
            throw new Exception("Error in GetDepartmentIncomeComparison: " + ex.Message);
        }
    }

    public string GetYearlyTotalIncome()
    {
        try
        {
            List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
            string referenceYear = null;
            string referenceMonth = null;

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                using (SqlCommand cmdRef = new SqlCommand(@"
                    SELECT
                        CAST(MAX(TRY_CAST([Year] AS INT)) AS VARCHAR(20)) AS ReferenceYear,
                        CAST(MAX(
                            CASE
                                WHEN Month = N'ינואר' THEN 1
                                WHEN Month = N'פברואר' THEN 2
                                WHEN Month = N'מרץ' THEN 3
                                WHEN Month = N'אפריל' THEN 4
                                WHEN Month = N'מאי' THEN 5
                                WHEN Month = N'יוני' THEN 6
                                WHEN Month = N'יולי' THEN 7
                                WHEN Month = N'אוגוסט' THEN 8
                                WHEN Month = N'ספטמבר' THEN 9
                                WHEN Month = N'אוקטובר' THEN 10
                                WHEN Month = N'נובמבר' THEN 11
                                WHEN Month = N'דצמבר' THEN 12
                                ELSE NULL
                            END
                        ) AS VARCHAR(20)) AS ReferenceMonth
                    FROM Excel_QuarterlyIncome
                    WHERE TRY_CAST([Year] AS INT) = (
                        SELECT MAX(TRY_CAST([Year] AS INT))
                        FROM Excel_QuarterlyIncome
                    )", conn))
                {
                    cmdRef.CommandTimeout = 300;

                    using (SqlDataReader r = cmdRef.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            referenceYear = r["ReferenceYear"] != DBNull.Value ? r["ReferenceYear"].ToString() : null;
                            referenceMonth = r["ReferenceMonth"] != DBNull.Value ? r["ReferenceMonth"].ToString() : null;
                        }
                    }
                }

                string query = @"
                    WITH LatestYear AS (
                        SELECT MAX(TRY_CAST([Year] AS INT)) AS MaxYear
                        FROM Excel_QuarterlyIncome
                    ),
                    LatestYearMonth AS (
                        SELECT MAX(CASE Month
                            WHEN N'ינואר' THEN 1
                            WHEN N'פברואר' THEN 2
                            WHEN N'מרץ' THEN 3
                            WHEN N'אפריל' THEN 4
                            WHEN N'מאי' THEN 5
                            WHEN N'יוני' THEN 6
                            WHEN N'יולי' THEN 7
                            WHEN N'אוגוסט' THEN 8
                            WHEN N'ספטמבר' THEN 9
                            WHEN N'אוקטובר' THEN 10
                            WHEN N'נובמבר' THEN 11
                            WHEN N'דצמבר' THEN 12
                        END) AS MaxMonth
                        FROM Excel_QuarterlyIncome
                        CROSS JOIN LatestYear
                        WHERE TRY_CAST([Year] AS INT) = LatestYear.MaxYear
                    ),
                    YearsToCompare AS (
                        SELECT DISTINCT TRY_CAST([Year] AS INT) AS Year
                        FROM Excel_QuarterlyIncome
                        CROSS JOIN LatestYear
                        WHERE TRY_CAST([Year] AS INT) BETWEEN LatestYear.MaxYear - 1 AND LatestYear.MaxYear
                    )
                    SELECT
                        TRY_CAST([Year] AS INT) AS Year,
                        SUM(TRY_CONVERT(DECIMAL(18,2), NetIncomeTotal)) AS TotalRealValue
                    FROM Excel_QuarterlyIncome
                    WHERE TRY_CAST([Year] AS INT) IN (SELECT Year FROM YearsToCompare)
                        AND CASE Month
                            WHEN N'ינואר' THEN 1
                            WHEN N'פברואר' THEN 2
                            WHEN N'מרץ' THEN 3
                            WHEN N'אפריל' THEN 4
                            WHEN N'מאי' THEN 5
                            WHEN N'יוני' THEN 6
                            WHEN N'יולי' THEN 7
                            WHEN N'אוגוסט' THEN 8
                            WHEN N'ספטמבר' THEN 9
                            WHEN N'אוקטובר' THEN 10
                            WHEN N'נובמבר' THEN 11
                            WHEN N'דצמבר' THEN 12
                        END <= (SELECT MaxMonth FROM LatestYearMonth)
                    GROUP BY TRY_CAST([Year] AS INT)
                    ORDER BY Year ASC
                ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Dictionary<string, object> yearlyData = new Dictionary<string, object>();
                            yearlyData["Year"] = reader["Year"].ToString();
                            yearlyData["TotalRealValue"] =
                                reader["TotalRealValue"] != DBNull.Value
                                    ? Convert.ToDecimal(reader["TotalRealValue"])
                                    : 0m;

                            result.Add(yearlyData);
                        }
                    }
                }
            }

            Dictionary<string, object> response = new Dictionary<string, object>();
            response["d"] = result;
            response["referenceYear"] = referenceYear;
            response["referenceMonth"] = referenceMonth;

            return JsonConvert.SerializeObject(response);
        }
        catch (Exception ex)
        {
            Dictionary<string, object> error = new Dictionary<string, object>();
            error["error"] = ex.Message;
            return JsonConvert.SerializeObject(error);
        }
    }


    public List<DepartmentComparisonDto> GetDepartmentIncomeByDiagnosis(
      string diagnosis,
      string medicalUnitIncome = null,
      string incomeCategory = null,
      string organization = null,
      string unifiedCategory = null)
    {
        try
        {
            List<DepartmentIncomeData> result =
                new List<DepartmentIncomeData>();

            if (string.IsNullOrWhiteSpace(diagnosis))
                diagnosis = null;

            if (string.IsNullOrWhiteSpace(medicalUnitIncome))
                medicalUnitIncome = null;

            if (string.IsNullOrWhiteSpace(incomeCategory))
                incomeCategory = null;

            if (string.IsNullOrWhiteSpace(organization))
                organization = null;

            if (string.IsNullOrWhiteSpace(unifiedCategory))
                unifiedCategory = null;

            using (SqlConnection conn =
                new SqlConnection(connectionString))
            {
                conn.Open();

                string query = @"
WITH LatestYear AS (
    SELECT MAX(TRY_CAST(Year AS INT)) AS MaxYear
    FROM Excel_QuarterlyIncome
),
LatestYearMonth AS (
    SELECT MAX(CASE Month
        WHEN N'ינואר' THEN 1
        WHEN N'פברואר' THEN 2
        WHEN N'מרץ' THEN 3
        WHEN N'אפריל' THEN 4
        WHEN N'מאי' THEN 5
        WHEN N'יוני' THEN 6
        WHEN N'יולי' THEN 7
        WHEN N'אוגוסט' THEN 8
        WHEN N'ספטמבר' THEN 9
        WHEN N'אוקטובר' THEN 10
        WHEN N'נובמבר' THEN 11
        WHEN N'דצמבר' THEN 12
    END) AS MaxMonth
    FROM Excel_QuarterlyIncome
    CROSS JOIN LatestYear
    WHERE TRY_CAST(Year AS INT) = LatestYear.MaxYear
),
YearsToCompare AS (
    SELECT DISTINCT TRY_CAST(Year AS INT) AS Year
    FROM Excel_QuarterlyIncome
    CROSS JOIN LatestYear
    WHERE TRY_CAST(Year AS INT) >= LatestYear.MaxYear - 4
)
SELECT
    PatientSummary AS DepartmentName,
    Year,
    IncomeCategory,
    Organization,
    UnifiedCategory,
    MedicalUnit_Department_Income,
    SubMedicalUnit_Description,
    TRY_CONVERT(DECIMAL(18,2), NetIncomeTotal) AS RealValue
FROM Excel_QuarterlyIncome
WHERE TRY_CAST(Year AS INT) IN (SELECT Year FROM YearsToCompare)
    AND CASE Month
        WHEN N'ינואר' THEN 1
        WHEN N'פברואר' THEN 2
        WHEN N'מרץ' THEN 3
        WHEN N'אפריל' THEN 4
        WHEN N'מאי' THEN 5
        WHEN N'יוני' THEN 6
        WHEN N'יולי' THEN 7
        WHEN N'אוגוסט' THEN 8
        WHEN N'ספטמבר' THEN 9
        WHEN N'אוקטובר' THEN 10
        WHEN N'נובמבר' THEN 11
        WHEN N'דצמבר' THEN 12
    END <= (SELECT MaxMonth FROM LatestYearMonth)
    AND UnifiedDiagnosis LIKE N'%' + @Diagnosis + N'%'
    AND NetIncomeTotal IS NOT NULL
    AND NetIncomeTotal <> ''
     AND (
        @MedicalUnitIncome IS NULL
        OR MedicalUnit_Department_Income = @MedicalUnitIncome
    )
    AND (
        @IncomeCategory IS NULL
        OR IncomeCategory = @IncomeCategory
    )
    AND (
        @Organization IS NULL
        OR Organization = @Organization
    )
    AND (
        @UnifiedCategory IS NULL
        OR UnifiedCategory = @UnifiedCategory
    )
";
                using (SqlCommand cmd =
                    new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;

                    SqlParameter pDiagnosis =
                        new SqlParameter(
                            "@Diagnosis",
                            SqlDbType.NVarChar,
                            200);

                    pDiagnosis.Value =
                        diagnosis == null
                        ? (object)DBNull.Value
                        : diagnosis;

                    cmd.Parameters.Add(pDiagnosis);

                    SqlParameter pMedicalUnitIncome =
                        new SqlParameter(
                            "@MedicalUnitIncome",
                            SqlDbType.NVarChar,
                            200);

                    pMedicalUnitIncome.Value =
                        string.IsNullOrWhiteSpace(medicalUnitIncome)
                        || medicalUnitIncome == "הכל"
                        ? (object)DBNull.Value
                        : medicalUnitIncome;

                    cmd.Parameters.Add(pMedicalUnitIncome);

                    SqlParameter pIncomeCategory =
                        new SqlParameter(
                            "@IncomeCategory",
                            SqlDbType.NVarChar,
                            100);

                    pIncomeCategory.Value =
                        string.IsNullOrWhiteSpace(incomeCategory)
                        || incomeCategory == "הכל"
                        ? (object)DBNull.Value
                        : incomeCategory;

                    cmd.Parameters.Add(pIncomeCategory);

                    SqlParameter pOrganization =
                        new SqlParameter(
                            "@Organization",
                            SqlDbType.NVarChar,
                            100);

                    pOrganization.Value =
                        string.IsNullOrWhiteSpace(organization)
                        || organization == "הכל"
                        ? (object)DBNull.Value
                        : organization;

                    cmd.Parameters.Add(pOrganization);

                    SqlParameter pUnifiedCategory =
                        new SqlParameter(
                            "@UnifiedCategory",
                            SqlDbType.NVarChar,
                            100);

                    pUnifiedCategory.Value =
                        string.IsNullOrWhiteSpace(unifiedCategory)
                        || unifiedCategory == "הכל"
                        ? (object)DBNull.Value
                        : unifiedCategory;

                    cmd.Parameters.Add(pUnifiedCategory);

                    using (SqlDataReader reader =
                        cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            DepartmentIncomeData item =
                                new DepartmentIncomeData();

                            item.DepartmentName =
                                reader["DepartmentName"].ToString();

                            item.Year =
                                reader["Year"].ToString();

                            item.IncomeCategory =
                                reader["IncomeCategory"].ToString();

                            item.Organization =
                                reader["Organization"].ToString();

                            item.UnifiedCategory =
                                reader["UnifiedCategory"].ToString();

                            item.MedicalUnitIncome =
                                reader["MedicalUnit_Department_Income"].ToString();

                            item.SubMedicalUnitDescription =
                                reader["SubMedicalUnit_Description"].ToString();

                            item.RealValue =
                                reader["RealValue"] != DBNull.Value
                                ? Convert.ToDecimal(reader["RealValue"])
                                : 0m;

                            result.Add(item);
                        }
                    }
                }
            }

            List<string> distinctYears = result
                .Select(x => x.Year)
                .Distinct()
                .OrderByDescending(x => x)
                .Take(5)
                .ToList();

            if (distinctYears.Count == 0)
            {
                return new List<DepartmentComparisonDto>();
            }

            string year1 =
                distinctYears.Count > 1
                ? distinctYears[1]
                : distinctYears[0];

            string year2 =
                distinctYears.Count > 0
                ? distinctYears[0]
                : year1;

            List<DepartmentComparisonDto> groupedData =
                result
                .GroupBy(x => new
                {
                    x.DepartmentName,
                    x.IncomeCategory,
                    x.Organization,
                    x.UnifiedCategory,
                    x.MedicalUnitIncome,
                    x.SubMedicalUnitDescription
                })
                .Select(g => new DepartmentComparisonDto
                {
                    DepartmentName =
                        g.Key.DepartmentName,

                    IncomeCategory =
                        g.Key.IncomeCategory,

                    Organization =
                        g.Key.Organization,

                    UnifiedCategory =
                        g.Key.UnifiedCategory,

                    MedicalUnitIncome =
                        g.Key.MedicalUnitIncome,

                    SubMedicalUnitDescription =
                        g.Key.SubMedicalUnitDescription,

                    Income2024 =
                        g.Where(x => x.Year == year1)
                         .Sum(x => x.RealValue),

                    Income2025 =
                        g.Where(x => x.Year == year2)
                         .Sum(x => x.RealValue)
                })
                .OrderByDescending(x => x.Income2025)
                .ToList();

            return groupedData;
        }
        catch (Exception ex)
        {
            throw new Exception(
                "Error in GetDepartmentIncomeByDiagnosis: "
                + ex.Message);
        }
    }
    public List<dynamic> GetDepartmentDetailedData(
    string departmentName,
    string medicalUnitIncome = null,
    string incomeCategory = null,
    string organization = null,
    string unifiedCategory = null
)
    {
        try
        {
            List<dynamic> result = new List<dynamic>();

            // if (departmentName == "כירורגיה לב")
            // {
            //     return new List<dynamic>();
            // }

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                string getYearsQuery = @"
                SELECT TOP 5 Year
                FROM Excel_QuarterlyIncome
                GROUP BY Year
                ORDER BY TRY_CAST(Year AS INT) DESC
            ";

                List<string> recentYears = new List<string>();

                using (SqlCommand yearsCmd = new SqlCommand(getYearsQuery, conn))
                {
                    using (SqlDataReader yearsReader = yearsCmd.ExecuteReader())
                    {
                        while (yearsReader.Read())
                        {
                            recentYears.Add(yearsReader["Year"].ToString());
                        }
                    }
                }

                while (recentYears.Count < 5)
                {
                    recentYears.Add("0");
                }

                recentYears =
                    recentYears
                    .OrderBy(y => TryParseYear(y))
                    .ToList();

                string year1 = recentYears[0];
                string year2 = recentYears[1];
                string year3 = recentYears[2];
                string year4 = recentYears[3];
                string year5 = recentYears[4];

                string query = @"
WITH LatestYear AS (
    SELECT MAX(TRY_CAST(Year AS INT)) AS MaxYear
    FROM Excel_QuarterlyIncome
),
LatestYearMonth AS (
    SELECT MAX(CASE Month
        WHEN N'ינואר' THEN 1
        WHEN N'פברואר' THEN 2
        WHEN N'מרץ' THEN 3
        WHEN N'אפריל' THEN 4
        WHEN N'מאי' THEN 5
        WHEN N'יוני' THEN 6
        WHEN N'יולי' THEN 7
        WHEN N'אוגוסט' THEN 8
        WHEN N'ספטמבר' THEN 9
        WHEN N'אוקטובר' THEN 10
        WHEN N'נובמבר' THEN 11
        WHEN N'דצמבר' THEN 12
    END) AS MaxMonth
    FROM Excel_QuarterlyIncome
    CROSS JOIN LatestYear
    WHERE TRY_CAST(Year AS INT) = LatestYear.MaxYear
),
RealValuePivot AS (
    SELECT 
        CatalogName2,
        UnifiedCategory,
        [" + year1 + @"],
        [" + year2 + @"],
        [" + year3 + @"],
        [" + year4 + @"],
        [" + year5 + @"]
    FROM (
        SELECT
            CatalogName2,
            UnifiedCategory,
            Year,
            TRY_CONVERT(DECIMAL(18,2), NetIncomeTotal) AS RealValue
        FROM Excel_QuarterlyIncome
        WHERE PatientSummary = @DepartmentName
            AND Year IN ('" + year1 + "','" + year2 + "','" + year3 + "','" + year4 + "','" + year5 + @"')
            AND CASE Month
                WHEN N'ינואר' THEN 1
                WHEN N'פברואר' THEN 2
                WHEN N'מרץ' THEN 3
                WHEN N'אפריל' THEN 4
                WHEN N'מאי' THEN 5
                WHEN N'יוני' THEN 6
                WHEN N'יולי' THEN 7
                WHEN N'אוגוסט' THEN 8
                WHEN N'ספטמבר' THEN 9
                WHEN N'אוקטובר' THEN 10
                WHEN N'נובמבר' THEN 11
                WHEN N'דצמבר' THEN 12
            END <= (SELECT MaxMonth FROM LatestYearMonth)
            AND (@MedicalUnitIncome IS NULL OR MedicalUnit_Income = @MedicalUnitIncome)
            AND (@IncomeCategory IS NULL OR IncomeCategory = @IncomeCategory)
            AND (@Organization IS NULL OR Organization = @Organization)
            AND (@UnifiedCategory IS NULL OR UnifiedCategory = @UnifiedCategory)
    ) AS src
    PIVOT (
        SUM(RealValue)
        FOR Year IN (
            [" + year1 + @"],
            [" + year2 + @"],
            [" + year3 + @"],
            [" + year4 + @"],
            [" + year5 + @"]
        )
    ) AS pvt
),
ChargedUnitsPivot AS (
    SELECT 
        CatalogName2,
        [" + year1 + @"],
        [" + year2 + @"],
        [" + year3 + @"],
        [" + year4 + @"],
        [" + year5 + @"]
    FROM (
        SELECT
            CatalogName2,
            Year,
            TRY_CONVERT(DECIMAL(18,2), ChargedUnits) AS ChargedUnits
        FROM Excel_QuarterlyIncome
        WHERE PatientSummary = @DepartmentName
            AND Year IN ('" + year1 + "','" + year2 + "','" + year3 + "','" + year4 + "','" + year5 + @"')
            AND CASE Month
                WHEN N'ינואר' THEN 1
                WHEN N'פברואר' THEN 2
                WHEN N'מרץ' THEN 3
                WHEN N'אפריל' THEN 4
                WHEN N'מאי' THEN 5
                WHEN N'יוני' THEN 6
                WHEN N'יולי' THEN 7
                WHEN N'אוגוסט' THEN 8
                WHEN N'ספטמבר' THEN 9
                WHEN N'אוקטובר' THEN 10
                WHEN N'נובמבר' THEN 11
                WHEN N'דצמבר' THEN 12
            END <= (SELECT MaxMonth FROM LatestYearMonth)
            AND (@MedicalUnitIncome IS NULL OR MedicalUnit_Income = @MedicalUnitIncome)
            AND (@IncomeCategory IS NULL OR IncomeCategory = @IncomeCategory)
            AND (@Organization IS NULL OR Organization = @Organization)
            AND (@UnifiedCategory IS NULL OR UnifiedCategory = @UnifiedCategory)
    ) AS src
    PIVOT (
        SUM(ChargedUnits)
        FOR Year IN (
            [" + year1 + @"],
            [" + year2 + @"],
            [" + year3 + @"],
            [" + year4 + @"],
            [" + year5 + @"]
        )
    ) AS pvt
)

SELECT
    r.CatalogName2,
    r.UnifiedCategory,
    r.[" + year1 + @"] AS Cash2021,
    c.[" + year1 + @"] AS Units2021,
    r.[" + year2 + @"] AS Cash2022,
    c.[" + year2 + @"] AS Units2022,
    r.[" + year3 + @"] AS Cash2023,
    c.[" + year3 + @"] AS Units2023,
    r.[" + year4 + @"] AS Cash2024,
    c.[" + year4 + @"] AS Units2024,
    r.[" + year5 + @"] AS Cash2025,
    c.[" + year5 + @"] AS Units2025
FROM RealValuePivot r
LEFT JOIN ChargedUnitsPivot c
    ON r.CatalogName2 = c.CatalogName2
ORDER BY r.CatalogName2;
";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;

                    cmd.Parameters.AddWithValue(
                        "@DepartmentName",
                        departmentName);

                    AddFilterParameters(
                        cmd,
                        medicalUnitIncome,
                        incomeCategory,
                        organization,
                        unifiedCategory);

                    using (SqlDataReader reader =
                        cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            DepartmentDetailedDataDto row =
                                new DepartmentDetailedDataDto();

                            row.CatalogName =
                                reader["CatalogName2"].ToString();

                            row.UnifiedCategory =
                                reader["UnifiedCategory"].ToString();

                            row.Cash2021 =
                                reader["Cash2021"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Cash2021"])
                                : 0m;

                            row.Units2021 =
                                reader["Units2021"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Units2021"])
                                : 0m;

                            row.Cash2022 =
                                reader["Cash2022"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Cash2022"])
                                : 0m;

                            row.Units2022 =
                                reader["Units2022"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Units2022"])
                                : 0m;

                            row.Cash2023 =
                                reader["Cash2023"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Cash2023"])
                                : 0m;

                            row.Units2023 =
                                reader["Units2023"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Units2023"])
                                : 0m;

                            row.Cash2024 =
                                reader["Cash2024"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Cash2024"])
                                : 0m;

                            row.Units2024 =
                                reader["Units2024"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Units2024"])
                                : 0m;

                            row.Cash2025 =
                                reader["Cash2025"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Cash2025"])
                                : 0m;

                            row.Units2025 =
                                reader["Units2025"] != DBNull.Value
                                ? Convert.ToDecimal(reader["Units2025"])
                                : 0m;

                            result.Add(row);
                        }
                    }
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            throw new Exception(
                "Error in GetDepartmentDetailedData: "
                + ex.Message);
        }
    }


    public DepartmentIncomeFilterOptionsDto GetDepartmentIncomeFilterOptions()
    {
        try
        {
            DepartmentIncomeFilterOptionsDto result = new DepartmentIncomeFilterOptionsDto();
            result.medicalUnitIncome = new List<string>();
            result.incomeCategory = new List<string>();
            result.organization = new List<string>();
            result.unifiedCategory = new List<string>();

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                using (SqlCommand cmd = new SqlCommand(@"
                    SELECT DISTINCT MedicalUnit_Income
                    FROM Excel_QuarterlyIncome
                    WHERE MedicalUnit_Income IS NOT NULL AND MedicalUnit_Income <> ''
                    ORDER BY MedicalUnit_Income", conn))
                {
                    cmd.CommandTimeout = 300;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.medicalUnitIncome.Add(reader["MedicalUnit_Income"].ToString());
                        }
                    }
                }

                using (SqlCommand cmd = new SqlCommand(@"
                    SELECT DISTINCT IncomeCategory
                    FROM Excel_QuarterlyIncome
                    WHERE IncomeCategory IS NOT NULL AND IncomeCategory <> ''
                    ORDER BY IncomeCategory", conn))
                {
                    cmd.CommandTimeout = 300;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.incomeCategory.Add(reader["IncomeCategory"].ToString());
                        }
                    }
                }

                using (SqlCommand cmd = new SqlCommand(@"
                    SELECT DISTINCT Organization
                    FROM Excel_QuarterlyIncome
                    WHERE Organization IS NOT NULL AND Organization <> ''
                    ORDER BY Organization", conn))
                {
                    cmd.CommandTimeout = 300;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.organization.Add(reader["Organization"].ToString());
                        }
                    }
                }

                using (SqlCommand cmd = new SqlCommand(@"
                    SELECT DISTINCT UnifiedCategory
                    FROM Excel_QuarterlyIncome
                    WHERE UnifiedCategory IS NOT NULL AND UnifiedCategory <> ''
                    ORDER BY UnifiedCategory", conn))
                {
                    cmd.CommandTimeout = 300;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.unifiedCategory.Add(reader["UnifiedCategory"].ToString());
                        }
                    }
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            throw new Exception("Error in GetDepartmentIncomeFilterOptions: " + ex.Message);
        }
    }

    private void AddFilterParameters(
        SqlCommand cmd,
        string medicalUnitIncome,
        string incomeCategory,
        string organization,
        string unifiedCategory)
    {
        cmd.Parameters.AddWithValue("@MedicalUnitIncome",
            string.IsNullOrWhiteSpace(medicalUnitIncome) ? (object)DBNull.Value : medicalUnitIncome);

        cmd.Parameters.AddWithValue("@IncomeCategory",
            string.IsNullOrWhiteSpace(incomeCategory) ? (object)DBNull.Value : incomeCategory);

        cmd.Parameters.AddWithValue("@Organization",
            string.IsNullOrWhiteSpace(organization) ? (object)DBNull.Value : organization);

        cmd.Parameters.AddWithValue("@UnifiedCategory",
            string.IsNullOrWhiteSpace(unifiedCategory) ? (object)DBNull.Value : unifiedCategory);
    }

    private int TryParseYear(string year)
    {
        int result;
        return int.TryParse(year, out result) ? result : 0;
    }

    public List<string> GetUniqueDiagnoses()
    {
        try
        {
            List<string> diagnoses = new List<string>();

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                string query = @"
                    SELECT DISTINCT UnifiedDiagnosis
                    FROM Excel_QuarterlyIncome
                    WHERE UnifiedDiagnosis IS NOT NULL
                        AND UnifiedDiagnosis <> ''
                    ORDER BY UnifiedDiagnosis
                ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            diagnoses.Add(reader["UnifiedDiagnosis"].ToString());
                        }
                    }
                }
            }

            return diagnoses;
        }
        catch (Exception ex)
        {
            throw new Exception("Error in GetUniqueDiagnoses: " + ex.Message);
        }
    }




    public DepartmentIncomeYearlyDto GetDepartmentIncomeYearly(
   
        )
    {
        try
        {
            DepartmentIncomeYearlyDto result = new DepartmentIncomeYearlyDto();
            result.items = new List<DepartmentIncomeYearlyItemDto>();

            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

 
string query = @"
SET NOCOUNT ON;

DECLARE @CurrentYear INT = (
    SELECT MAX(TRY_CAST([Year] AS INT))
    FROM Excel_QuarterlyIncome
);

WITH LatestDataYear AS (
    SELECT MAX(TRY_CAST([Year] AS INT)) AS CurrentYear
    FROM Excel_QuarterlyIncome
),
LatestDataMonth AS (
    SELECT MAX(CASE [Month]
        WHEN N'ינואר' THEN 1
        WHEN N'פברואר' THEN 2
        WHEN N'מרץ' THEN 3
        WHEN N'אפריל' THEN 4
        WHEN N'מאי' THEN 5
        WHEN N'יוני' THEN 6
        WHEN N'יולי' THEN 7
        WHEN N'אוגוסט' THEN 8
        WHEN N'ספטמבר' THEN 9
        WHEN N'אוקטובר' THEN 10
        WHEN N'נובמבר' THEN 11
        WHEN N'דצמבר' THEN 12
    END) AS MaxMonth
    FROM Excel_QuarterlyIncome
    CROSS JOIN LatestDataYear
    WHERE TRY_CAST([Year] AS INT) = LatestDataYear.CurrentYear
),
IncomeBase AS (
    SELECT
        CAST([Year] AS INT) AS [Year],
        [Month],
        CASE [Month]
            WHEN N'ינואר' THEN 1
            WHEN N'פברואר' THEN 2
            WHEN N'מרץ' THEN 3
            WHEN N'אפריל' THEN 4
            WHEN N'מאי' THEN 5
            WHEN N'יוני' THEN 6
            WHEN N'יולי' THEN 7
            WHEN N'אוגוסט' THEN 8
            WHEN N'ספטמבר' THEN 9
            WHEN N'אוקטובר' THEN 10
            WHEN N'נובמבר' THEN 11
            WHEN N'דצמבר' THEN 12
        END AS MonthNumber,
        UnifiedDiagnosis,
        PatientSummary,
        UnifiedCategory,
        Organization,
        UnifiedPayer,
        PayerType,
        TRY_CAST(NetIncomeTotal AS DECIMAL(18,2)) AS Income
    FROM Excel_QuarterlyIncome
    CROSS JOIN LatestDataYear
    CROSS JOIN LatestDataMonth
    WHERE TRY_CAST([Year] AS INT) BETWEEN LatestDataYear.CurrentYear - 4 AND LatestDataYear.CurrentYear
        AND CASE [Month]
            WHEN N'ינואר' THEN 1
            WHEN N'פברואר' THEN 2
            WHEN N'מרץ' THEN 3
            WHEN N'אפריל' THEN 4
            WHEN N'מאי' THEN 5
            WHEN N'יוני' THEN 6
            WHEN N'יולי' THEN 7
            WHEN N'אוגוסט' THEN 8
            WHEN N'ספטמבר' THEN 9
            WHEN N'אוקטובר' THEN 10
            WHEN N'נובמבר' THEN 11
            WHEN N'דצמבר' THEN 12
        END <= LatestDataMonth.MaxMonth
)

SELECT
    [Year],
    [Month],
    MonthNumber,
    UnifiedDiagnosis,
    PatientSummary,
    UnifiedCategory,
    Organization,
    UnifiedPayer,
    PayerType,
    SUM(Income) AS Income
INTO #Base
FROM IncomeBase
GROUP BY
    [Year],
    [Month],
    MonthNumber,
    UnifiedDiagnosis,
    PatientSummary,
    UnifiedCategory,
    Organization,
    UnifiedPayer,
    PayerType;

CREATE INDEX IX_Base_Month ON #Base (MonthNumber, [Year]);

SELECT
    UnifiedDiagnosis,
    PatientSummary,
    [Month],
    MonthNumber,
    UnifiedCategory,
    Organization,
    UnifiedPayer,
    PayerType,

    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 4 THEN Income END),0) AS Year4,
    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 3 THEN Income END),0) AS Year3,
    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 2 THEN Income END),0) AS Year2,
    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 1 THEN Income END),0) AS Year1,
    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear THEN Income END),0) AS CurrentYear,

    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear THEN Income END),0)
    -
    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 1 THEN Income END),0)
    AS YTYDiff,

    CASE
        WHEN ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 1 THEN Income END),0) = 0
            THEN 0
        ELSE
            (
                (
                    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear THEN Income END),0)
                    -
                    ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 1 THEN Income END),0)
                )
                /
                ISNULL(SUM(CASE WHEN [Year] = @CurrentYear - 1 THEN Income END),0)
            ) * 100
    END AS YTYPercent

FROM #Base

GROUP BY
    UnifiedDiagnosis,
    PatientSummary,
    [Month],
    MonthNumber,
    UnifiedCategory,
    Organization,
    UnifiedPayer,
    PayerType

ORDER BY
    MonthNumber,
    CurrentYear DESC;

DROP TABLE #Base;
 ";




                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.CommandTimeout = 300;

                     

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            DepartmentIncomeYearlyItemDto item = new DepartmentIncomeYearlyItemDto();

                            item.UnifiedDiagnosis = reader["UnifiedDiagnosis"].ToString();
                            item.PatientSummary = reader["PatientSummary"].ToString();
                            item.UnifiedCategory = reader["UnifiedCategory"].ToString();
                            item.Organization = reader["Organization"].ToString();
                            item.UnifiedPayer = reader["UnifiedPayer"].ToString();
                            item.PayerType = reader["PayerType"].ToString();

                            item.Year4 = Convert.ToDecimal(reader["Year4"]);
                            item.Year3 = Convert.ToDecimal(reader["Year3"]);
                            item.Year2 = Convert.ToDecimal(reader["Year2"]);
                            item.Year1 = Convert.ToDecimal(reader["Year1"]);
                            item.CurrentYear = Convert.ToDecimal(reader["CurrentYear"]);

                            item.Month = reader["Month"].ToString();

                            item.YTYDiff = Convert.ToDecimal(reader["YTYDiff"]);
                            item.YTYPercent = Convert.ToDecimal(reader["YTYPercent"]);

                            result.items.Add(item);
                        }
                    }
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            throw new Exception("Error in GetDepartmentIncomeYearly: " + ex.Message);
        }
    }
}

public class DepartmentIncomeFilterOptionsDto
{
    public List<string> medicalUnitIncome { get; set; }
    public List<string> incomeCategory { get; set; }
    public List<string> organization { get; set; }
    public List<string> unifiedCategory { get; set; }
}

// DTO Classes
public class DepartmentIncomeData
{
    public string DepartmentName { get; set; }

    public string Year { get; set; }

    public decimal RealValue { get; set; }

    public string IncomeCategory { get; set; }

    public string Organization { get; set; }

    public string UnifiedCategory { get; set; }

    public string MedicalUnitIncome { get; set; }

    public string SubMedicalUnitDescription { get; set; }
}

public class DepartmentComparisonDto
{

    public string DepartmentName { get; set; }

    public string IncomeCategory { get; set; }

    public string Organization { get; set; }

    public string UnifiedCategory { get; set; }

    public string MedicalUnitIncome { get; set; }

    public string SubMedicalUnitDescription { get; set; }

    public decimal Income2024 { get; set; }

    public decimal Income2025 { get; set; }
}

public class DepartmentDetailedDataDto
{
    public string UnifiedCategory { get; set; }
    public string DepartmentName { get; set; }
    public string Year { get; set; }
    public string Month { get; set; }
    public string UnifiedDiagnosis { get; set; }
    public string IncomeCategory { get; set; }
    public string MedicalUnitIncome { get; set; }
    public decimal RealValue { get; set; }
    public decimal ChargedUnits { get; set; }
    public string CatalogName { get; set; }

    public decimal Cash2021 { get; set; }
    public decimal Units2021 { get; set; }
    public decimal Cash2022 { get; set; }
    public decimal Units2022 { get; set; }
    public decimal Cash2023 { get; set; }
    public decimal Units2023 { get; set; }
    public decimal Cash2024 { get; set; }
    public decimal Units2024 { get; set; }
    public decimal Cash2025 { get; set; }
    public decimal Units2025 { get; set; }
}
public class DepartmentIncomeYearlyDto
{
    public List<DepartmentIncomeYearlyItemDto> items { get; set; }
}

public class DepartmentIncomeYearlyItemDto
{
    public string UnifiedDiagnosis { get; set; }

    public string PatientSummary { get; set; }

    public string UnifiedCategory { get; set; }

    public string Organization { get; set; }

    public string UnifiedPayer { get; set; }

    public string PayerType { get; set; }

    public decimal Year4 { get; set; }

    public decimal Year3 { get; set; }

    public decimal Year2 { get; set; }

    public decimal Year1 { get; set; }

    public decimal CurrentYear { get; set; }

    public string Month { get; set; }

    public decimal YTYDiff { get; set; }

    public decimal YTYPercent { get; set; }
}