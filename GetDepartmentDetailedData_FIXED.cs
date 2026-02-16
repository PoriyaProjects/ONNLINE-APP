// תיקון לפונקציה GetDepartmentDetailedData
// הבעיה הייתה בשאילתה getYearsQuery - SELECT DISTINCT עם ORDER BY על ביטוי שלא ב-SELECT

public List<dynamic> GetDepartmentDetailedData(string departmentName)
{
    try
    {
        List<dynamic> result = new List<dynamic>();

        if (departmentName == "כירורגיה לב")
        {
            return new List<dynamic>();
        }

        using (SqlConnection conn = new SqlConnection(connectionString))
        {
            conn.Open();

            // תיקון: הסרת DISTINCT או שימוש ב-GROUP BY במקום
            // אפשרות 1: הסרת DISTINCT (מומלץ)
            string getYearsQuery = @"
                SELECT TOP 5 Year
                FROM Excel_QuarterlyIncome
                GROUP BY Year
                ORDER BY TRY_CAST(Year AS INT) DESC
            ";

            // אפשרות 2: אם צריך DISTINCT, השתמש ב-OFFSET/FETCH
            // string getYearsQuery = @"
            //     SELECT DISTINCT Year
            //     FROM Excel_QuarterlyIncome
            //     ORDER BY TRY_CAST(Year AS INT) DESC
            //     OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
            // ";

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

            // Pad with empty strings if less than 5 years
            while (recentYears.Count < 5)
            {
                recentYears.Add("0");
            }

            // Sort chronologically (oldest to newest)
            recentYears = recentYears.OrderBy(y => TryParseYear(y)).ToList();

            string year1 = recentYears[0];
            string year2 = recentYears[1];
            string year3 = recentYears[2];
            string year4 = recentYears[3];
            string year5 = recentYears[4];

            string query = @"
                WITH LatestYear AS (
                    SELECT MAX(Year) AS MaxYear
                    FROM Excel_QuarterlyIncome
                ),
                LatestYearMonths AS (
                    SELECT DISTINCT Month
                    FROM Excel_QuarterlyIncome
                    CROSS JOIN LatestYear
                    WHERE Year = LatestYear.MaxYear
                ),
                RealValuePivot AS (
                    SELECT CatalogName2, [" + year1 + @"], [" + year2 + @"], [" + year3 + @"], [" + year4 + @"], [" + year5 + @"]
                    FROM (
                        SELECT 
                            CatalogName2,
                            Year,
                            TRY_CONVERT(DECIMAL(18,2), RealValue) AS RealValue
                        FROM Excel_QuarterlyIncome
                        WHERE PatientSummary = @DepartmentName
                            AND Year IN ('" + year1 + "','" + year2 + "','" + year3 + "','" + year4 + "','" + year5 + @"')
                            AND Month IN (SELECT Month FROM LatestYearMonths)
                    ) AS src
                    PIVOT (
                        SUM(RealValue)
                        FOR Year IN ([" + year1 + @"], [" + year2 + @"], [" + year3 + @"], [" + year4 + @"], [" + year5 + @"])
                    ) AS pvt
                ),
                ChargedUnitsPivot AS (
                    SELECT CatalogName2, [" + year1 + @"], [" + year2 + @"], [" + year3 + @"], [" + year4 + @"], [" + year5 + @"]
                    FROM (
                        SELECT 
                            CatalogName2,
                            Year,
                            TRY_CONVERT(DECIMAL(18,2), ChargedUnits) AS ChargedUnits
                        FROM Excel_QuarterlyIncome
                        WHERE PatientSummary = @DepartmentName
                            AND Year IN ('" + year1 + "','" + year2 + "','" + year3 + "','" + year4 + "','" + year5 + @"')
                            AND Month IN (SELECT Month FROM LatestYearMonths)
                    ) AS src
                    PIVOT (
                        SUM(ChargedUnits)
                        FOR Year IN ([" + year1 + @"], [" + year2 + @"], [" + year3 + @"], [" + year4 + @"], [" + year5 + @"])
                    ) AS pvt
                )
                SELECT 
                    r.CatalogName2,
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
                LEFT JOIN ChargedUnitsPivot c ON r.CatalogName2 = c.CatalogName2
                ORDER BY r.CatalogName2;
            ";

            using (SqlCommand cmd = new SqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@DepartmentName", departmentName);
                cmd.CommandTimeout = 300;

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var row = new
                        {
                            CatalogName2 = reader["CatalogName2"].ToString(),
                            Cash2021 = reader["Cash2021"] != DBNull.Value ? Convert.ToDecimal(reader["Cash2021"]) : 0,
                            Units2021 = reader["Units2021"] != DBNull.Value ? Convert.ToDecimal(reader["Units2021"]) : 0,
                            Cash2022 = reader["Cash2022"] != DBNull.Value ? Convert.ToDecimal(reader["Cash2022"]) : 0,
                            Units2022 = reader["Units2022"] != DBNull.Value ? Convert.ToDecimal(reader["Units2022"]) : 0,
                            Cash2023 = reader["Cash2023"] != DBNull.Value ? Convert.ToDecimal(reader["Cash2023"]) : 0,
                            Units2023 = reader["Units2023"] != DBNull.Value ? Convert.ToDecimal(reader["Units2023"]) : 0,
                            Cash2024 = reader["Cash2024"] != DBNull.Value ? Convert.ToDecimal(reader["Cash2024"]) : 0,
                            Units2024 = reader["Units2024"] != DBNull.Value ? Convert.ToDecimal(reader["Units2024"]) : 0,
                            Cash2025 = reader["Cash2025"] != DBNull.Value ? Convert.ToDecimal(reader["Cash2025"]) : 0,
                            Units2025 = reader["Units2025"] != DBNull.Value ? Convert.ToDecimal(reader["Units2025"]) : 0
                        };
                        result.Add(row);
                    }
                }
            }
        }

        return result;
    }
    catch (Exception ex)
    {
        throw new Exception("Error in GetDepartmentDetailedData: " + ex.Message);
    }
}
