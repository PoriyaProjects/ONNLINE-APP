// תיקון לפונקציה GetDepartmentIncomeByDiagnosis
// הבעיה: השרת לא מחזיר את הנתונים של השנה הנוכחית (2026) - כל הערכים של Income2025 הם 0
// הפתרון: להשתמש באותה לוגיקה כמו GetDepartmentIncomeComparison

public List<DepartmentComparisonDto> GetDepartmentIncomeByDiagnosis(string diagnosis)
{
    try
    {
        List<DepartmentIncomeData> result = new List<DepartmentIncomeData>();

        using (SqlConnection conn = new SqlConnection(connectionString))
        {
            conn.Open();

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
                YearsToCompare AS (
                    SELECT DISTINCT Year
                    FROM Excel_QuarterlyIncome
                    CROSS JOIN LatestYear
                    WHERE TRY_CAST(Year AS INT) >= TRY_CAST(LatestYear.MaxYear AS INT) - 1
                )
                SELECT  
                    PatientSummary AS DepartmentName,
                    Year,
                    TRY_CONVERT(DECIMAL(18,2), RealValue) AS RealValue
                FROM Excel_QuarterlyIncome
                WHERE Year IN (SELECT Year FROM YearsToCompare)
                    AND Month IN (SELECT Month FROM LatestYearMonths)
                    AND UnifiedDiagnosis LIKE N'%' + @Diagnosis + N'%'
                    AND RealValue IS NOT NULL
                    AND RealValue != ''
                    AND PatientSummary != N'כירורגיה לב'
            ";

            using (SqlCommand cmd = new SqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@Diagnosis", diagnosis);
                cmd.CommandTimeout = 300;

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string dept = reader["DepartmentName"].ToString();
                        string year = reader["Year"].ToString();
                        decimal value = reader["RealValue"] != DBNull.Value
                            ? Convert.ToDecimal(reader["RealValue"])
                            : 0;

                        result.Add(new DepartmentIncomeData
                        {
                            DepartmentName = dept,
                            Year = year,
                            RealValue = value
                        });
                    }
                }
            }
        }

        // Dynamic grouping - finds the two latest years automatically (same as GetDepartmentIncomeComparison)
        var years = result.Select(x => x.Year).Distinct().OrderByDescending(x => x).Take(2).ToList();
        string year1 = years.Count > 1 ? years[1] : years[0]; // older year
        string year2 = years.Count > 0 ? years[0] : year1; // latest year

        var groupedData = result
            .GroupBy(x => x.DepartmentName)
            .Select(g => new DepartmentComparisonDto
            {
                DepartmentName = g.Key,
                Income2024 = g.Where(x => x.Year == year1).Sum(x => x.RealValue), // older year
                Income2025 = g.Where(x => x.Year == year2).Sum(x => x.RealValue)  // latest year
            })
            .OrderByDescending(x => x.Income2025)
            .ToList();

        return groupedData;
    }
    catch (Exception ex)
    {
        throw new Exception("Error in GetDepartmentIncomeByDiagnosis: " + ex.Message);
    }
}
