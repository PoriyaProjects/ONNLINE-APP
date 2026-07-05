// =============================================================================
// Paste into: SurgeriesCalendar class (RFC / App_Code)
// Replace the existing GetSurgeriesRoomPricesBySurgeryRoomCode method.
// Also add SurgeryProcedurePrices to SurgeriesRoomDayClass (see below).
// =============================================================================

// --- Model change (SurgeriesRoomDayClass) ------------------------------------

public class SurgeriesRoomDayClass
{
    public List<SurgeryPriceItem> SurgeryPrices { get; set; }
    public List<SurgeryPriceItem> SurgeryProcedurePrices { get; set; }
    public List<SurgeryRoomPriceSummary> RoomPriceSummaries { get; set; }
}

// SurgeryPriceItem — no change required:
// public class SurgeryPriceItem
// {
//     public string Row_ID { get; set; }       // cal.Row_ID OR scs.Row_ID depending on list
//     public string GrossPrice { get; set; }
//     public bool IsEstimated { get; set; }
// }

// --- WebService wrapper (unchanged) ------------------------------------------

[WebGet]
[WebMethod]
[OperationContract]
public SurgeriesCalendar.SurgeriesRoomDayClass GetSurgeriesRoomPricesBySurgeryRoomCode(string _fullDate, string _surRoomCode)
{
    return _SurgeriesCalendar.GetSurgeriesRoomPricesBySurgeryRoomCode(_fullDate, _surRoomCode);
}

// --- Full implementation -----------------------------------------------------

public SurgeriesRoomDayClass GetSurgeriesRoomPricesBySurgeryRoomCode(string _fullDate, string _surRoomCode)
{
    SurgeriesRoomDayClass result = new SurgeriesRoomDayClass();
    result.SurgeryPrices = new List<SurgeryPriceItem>();
    result.SurgeryProcedurePrices = new List<SurgeryPriceItem>();
    result.RoomPriceSummaries = new List<SurgeryRoomPriceSummary>();

    const string priceJoins =
        "LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK) " +
        "    ON scs.SurgeryID = cal.SurgeryID " +
        "LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK) " +
        "    ON v.LNRLS = cal.SurgeryID " +
        "   AND v.LEIST = 'OP_ANCHOR' " +
        "   AND v.STORN <> 'X' " +
        "   AND v.InvoiceServiceCode IS NOT NULL " +
        "   AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0 " +
        "LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK) " +
        "    ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code)) " +
        "JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK) " +
        "    ON p.[קוד_השירות] = COALESCE( " +
        "        CASE WHEN v.InvoiceServiceCode IS NOT NULL " +
        "             THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) " +
        "        END, " +
        "        scm.NormalizedCode) ";

    const string roomFilter =
        "  AND cal.SurgeryRoomDetails IN ( " +
        "      SELECT SurgeryRoom " +
        "      FROM NAMER.dbo.SurgeriesRoomDesc WITH (NOLOCK) " +
        "      WHERE RoomGroupDesc = @SurRoomCode) ";

    // Billing price per surgery slot: MAX(catalog), not SUM.
    string pricesString =
        "SELECT " +
        "    cal.Row_ID, " +
        "    ISNULL(MAX(TRY_CONVERT(decimal(18,2), p.[תעריף_ב])), 0) AS GrossPrice, " +
        "    MAX(CASE " +
        "        WHEN v.InvoiceServiceCode IS NULL OR LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) = 0 THEN 1 " +
        "        ELSE 0 " +
        "    END) AS IsEstimated " +
        "FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK) " +
        priceJoins +
        "WHERE cal.ArrivalDate = @FullDate " +
        "  AND cal.ArrivalTime IS NOT NULL " +
        "  AND cal.SurgeryStatus <> 'Canceled' " +
        "  AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0 " +
        roomFilter +
        "GROUP BY cal.Row_ID";

    // Catalog price per procedure row (scs.Row_ID) — one row per procedure.
    string procedurePricesString =
        "SELECT " +
        "    scs.Row_ID, " +
        "    ISNULL(TRY_CONVERT(decimal(18,2), p.[תעריף_ב]), 0) AS GrossPrice, " +
        "    CASE " +
        "        WHEN v.InvoiceServiceCode IS NULL OR LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) = 0 THEN 1 " +
        "        ELSE 0 " +
        "    END AS IsEstimated " +
        "FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK) " +
        "INNER JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH (NOLOCK) " +
        "    ON scs.SurgeryID = cal.SurgeryID " +
        "LEFT JOIN NAMER.dbo.V_NLEM v WITH (NOLOCK) " +
        "    ON v.LNRLS = cal.SurgeryID " +
        "   AND v.LEIST = 'OP_ANCHOR' " +
        "   AND v.STORN <> 'X' " +
        "   AND v.InvoiceServiceCode IS NOT NULL " +
        "   AND LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) > 0 " +
        "LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH (NOLOCK) " +
        "    ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code)) " +
        "JOIN ROEI.dbo.MOH_PriceList_2026 p WITH (NOLOCK) " +
        "    ON p.[קוד_השירות] = COALESCE( " +
        "        CASE WHEN v.InvoiceServiceCode IS NOT NULL " +
        "             THEN RIGHT(REPLACE(LTRIM(RTRIM(v.InvoiceServiceCode)), ',', ''), 5) " +
        "        END, " +
        "        scm.NormalizedCode) " +
        "WHERE cal.ArrivalDate = @FullDate " +
        "  AND cal.ArrivalTime IS NOT NULL " +
        "  AND cal.SurgeryStatus <> 'Canceled' " +
        "  AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0 " +
        roomFilter;

    // Room summary: MAX per surgery, then SUM billed surgeries per room/day.
    string summaryString =
        ";WITH ProcedurePrices AS ( " +
        "    SELECT " +
        "        cal.Row_ID, " +
        "        CONVERT(date, cal.ArrivalDate) AS WorkDate, " +
        "        cal.SurgeryRoomDetails, " +
        "        cal.RequestedDepartmentDetails, " +
        "        TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) AS GrossPrice " +
        "    FROM NAMER.dbo.SurgeriesCalendar cal WITH (NOLOCK) " +
        priceJoins +
        "    WHERE cal.ArrivalTime IS NOT NULL " +
        "      AND cal.SurgeryStatus <> 'Canceled' " +
        "      AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0 " +
        "      AND CONVERT(date, cal.ArrivalDate) >= DATEADD(MONTH, -6, @FullDate) " +
        "      AND CONVERT(date, cal.ArrivalDate) <= @FullDate " +
        roomFilter +
        "), " +
        "SurgeryBilling AS ( " +
        "    SELECT " +
        "        Row_ID, " +
        "        WorkDate, " +
        "        SurgeryRoomDetails, " +
        "        RequestedDepartmentDetails, " +
        "        MAX(GrossPrice) AS GrossPrice " +
        "    FROM ProcedurePrices " +
        "    GROUP BY Row_ID, WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails " +
        "), " +
        "DayRoom AS ( " +
        "    SELECT " +
        "        WorkDate, " +
        "        SurgeryRoomDetails, " +
        "        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt, " +
        "        MIN(RequestedDepartmentDetails) AS DepartmentCode, " +
        "        SUM(GrossPrice) AS DailyIncome " +
        "    FROM SurgeryBilling " +
        "    GROUP BY WorkDate, SurgeryRoomDetails " +
        "), " +
        "CurrentDay AS ( " +
        "    SELECT SurgeryRoomDetails, DeptCnt, DepartmentCode, DailyIncome AS RoomGrossPriceTotal " +
        "    FROM DayRoom " +
        "    WHERE WorkDate = @FullDate " +
        "), " +
        "DepartmentAvg AS ( " +
        "    SELECT SurgeryRoomDetails, DepartmentCode, CAST(AVG(DailyIncome) AS decimal(18,0)) AS DepartmentDayAverage " +
        "    FROM DayRoom " +
        "    WHERE WorkDate < @FullDate AND DeptCnt = 1 " +
        "    GROUP BY SurgeryRoomDetails, DepartmentCode " +
        ") " +
        "SELECT c.SurgeryRoomDetails AS SurgeryRoom, " +
        "    CAST(c.RoomGrossPriceTotal AS decimal(18,0)) AS RoomGrossPriceTotal, " +
        "    CASE WHEN c.DeptCnt = 1 AND c.RoomGrossPriceTotal > 0 THEN ISNULL(d.DepartmentDayAverage, 0) ELSE 0 END AS DepartmentDayAverage " +
        "FROM CurrentDay c " +
        "LEFT JOIN DepartmentAvg d ON d.SurgeryRoomDetails = c.SurgeryRoomDetails AND d.DepartmentCode = c.DepartmentCode " +
        "ORDER BY c.SurgeryRoomDetails";

    using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
    {
        myConnection.Open();

        // 1) Billing price per calendar row (MAX)
        using (SqlCommand pricesCmd = new SqlCommand(pricesString, myConnection))
        {
            pricesCmd.Parameters.Add("@FullDate", SqlDbType.Date).Value = DateTime.Parse(_fullDate);
            pricesCmd.Parameters.Add("@SurRoomCode", SqlDbType.NVarChar, 50).Value = _surRoomCode ?? string.Empty;

            using (SqlDataReader pricesReader = pricesCmd.ExecuteReader())
            {
                while (pricesReader.Read())
                {
                    SurgeryPriceItem item = new SurgeryPriceItem();
                    item.Row_ID = pricesReader["Row_ID"].ToString().Trim();
                    item.GrossPrice = pricesReader["GrossPrice"] == DBNull.Value
                        ? "0"
                        : pricesReader["GrossPrice"].ToString().Trim();
                    item.IsEstimated = pricesReader["IsEstimated"].ToString() == "1";
                    result.SurgeryPrices.Add(item);
                }
            }
        }

        // 2) Catalog price per procedure row (scs.Row_ID)
        using (SqlCommand procedurePricesCmd = new SqlCommand(procedurePricesString, myConnection))
        {
            procedurePricesCmd.Parameters.Add("@FullDate", SqlDbType.Date).Value = DateTime.Parse(_fullDate);
            procedurePricesCmd.Parameters.Add("@SurRoomCode", SqlDbType.NVarChar, 50).Value = _surRoomCode ?? string.Empty;

            using (SqlDataReader procedurePricesReader = procedurePricesCmd.ExecuteReader())
            {
                while (procedurePricesReader.Read())
                {
                    SurgeryPriceItem item = new SurgeryPriceItem();
                    item.Row_ID = procedurePricesReader["Row_ID"].ToString().Trim();
                    item.GrossPrice = procedurePricesReader["GrossPrice"] == DBNull.Value
                        ? "0"
                        : procedurePricesReader["GrossPrice"].ToString().Trim();
                    item.IsEstimated = procedurePricesReader["IsEstimated"].ToString() == "1";
                    result.SurgeryProcedurePrices.Add(item);
                }
            }
        }

        // 3) Room daily summary
        using (SqlCommand summaryCmd = new SqlCommand(summaryString, myConnection))
        {
            summaryCmd.Parameters.Add("@FullDate", SqlDbType.Date).Value = DateTime.Parse(_fullDate);
            summaryCmd.Parameters.Add("@SurRoomCode", SqlDbType.NVarChar, 50).Value = _surRoomCode ?? string.Empty;

            using (SqlDataReader summaryReader = summaryCmd.ExecuteReader())
            {
                while (summaryReader.Read())
                {
                    SurgeryRoomPriceSummary summary = new SurgeryRoomPriceSummary();
                    summary.SurgeryRoom = summaryReader["SurgeryRoom"].ToString().Trim();
                    summary.RoomGrossPriceTotal = summaryReader["RoomGrossPriceTotal"] == DBNull.Value
                        ? "0"
                        : summaryReader["RoomGrossPriceTotal"].ToString().Trim();
                    summary.DepartmentDayAverage = summaryReader["DepartmentDayAverage"] == DBNull.Value
                        ? "0"
                        : summaryReader["DepartmentDayAverage"].ToString().Trim();
                    result.RoomPriceSummaries.Add(summary);
                }
            }
        }
    }

    return result;
}
