// =============================================================================
// WebService-PciDashboard-NEW-ONLY.cs — paste into WebService.cs
// =============================================================================
// ASMX does NOT honor C# default params on GET — read optional args from QueryString.
// Add helper once inside WebService class:
// =============================================================================

// --- helper (paste inside WebService class) ---

private string PciQs(string key)
{
    if (Context != null && Context.Request != null && Context.Request.QueryString[key] != null)
    {
        return Context.Request.QueryString[key];
    }
    return "";
}

// --- Main dashboard ---

[WebMethod]
public string GetCountByDept_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetCountByDept(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetMonthlyCounts_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetMonthlyCounts(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetDepartmentYoY_pci_dashborad()
{
    return _PciDashboardService.GetDepartmentYoY();
}

[WebMethod]
public string GetUniqueDiagnoses_pci_dashborad()
{
    return _PciDashboardService.GetUniqueDiagnoses();
}

[WebMethod]
public string GetDepRoomFiveYears_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetDepRoomFiveYears(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetAvgDurationYearlyFiveYears_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgDurationYearlyFiveYears(baseYear);
}

[WebMethod]
public string GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgSurgeriesPerDayPerRoomFiveYears(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetAvgDurationFiveYears_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgDurationFiveYears(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetAvgFirstMorningEntry_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgFirstMorningEntry(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetAvgLastMorningEnd_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgLastMorningEnd(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetAvgSetup_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgSetup(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetLossByWingYear_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetLossByWingYear(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetApprovedUtilization_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetApprovedUtilization(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetSurgeriesByDepartment_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetSurgeriesByDepartment(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

[WebMethod]
public string GetCountByDoctor_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetCountByDoctor(
        baseYear,
        PciQs("department"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("morningWork"),
        PciQs("rooms"));
}

// --- Wait times / recommendations ---

[WebMethod]
public string GetRecommendationsYearly_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationsYearly();
}

[WebMethod]
public string GetRecommendationsMonthly_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationsMonthly();
}

[WebMethod]
public string GetRecommendationsByDepartment_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationsByDepartment();
}

[WebMethod]
public string GetRecommendationsByDoctor_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationsByDoctor(PciQs("department"), PciQs("baseYear"));
}

[WebMethod]
public string GetRecommendationsByRecommendingDoctor_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationsByRecommendingDoctor(PciQs("department"), PciQs("baseYear"));
}

[WebMethod]
public string GetTopRecommendedProcedures_pci_dashborad()
{
    return _PciDashboardService.GetTopRecommendedProcedures(PciQs("doctor"), PciQs("department"));
}

[WebMethod]
public string GetEmergencyReplacementAnalysis_pci_dashborad()
{
    return _PciDashboardService.GetEmergencyReplacementAnalysis();
}

[WebMethod]
public string GetRecommendationMonthlyTrend_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationMonthlyTrend();
}

[WebMethod]
public string GetRecommendationBacklog_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationBacklog();
}

[WebMethod]
public string GetRecommendationAgingBuckets_pci_dashborad()
{
    return _PciDashboardService.GetRecommendationAgingBuckets();
}

// --- Cancellations ---

[WebMethod]
public string GetCancellationsYearly_pci_dashborad()
{
    return _PciDashboardService.GetCancellationsYearly(PciQs("baseYear"), PciQs("department"));
}

[WebMethod]
public string GetCancellationsMonthly_pci_dashborad()
{
    return _PciDashboardService.GetCancellationsMonthly(PciQs("baseYear"), PciQs("department"));
}

[WebMethod]
public string GetTopCancellationReasons_pci_dashborad()
{
    return _PciDashboardService.GetTopCancellationReasons(PciQs("baseYear"), PciQs("department"));
}

[WebMethod]
public string GetCancellationReasonsByDepartment_pci_dashborad()
{
    return _PciDashboardService.GetCancellationReasonsByDepartment(PciQs("baseYear"), PciQs("department"));
}

[WebMethod]
public string GetRoomOutcome_pci_dashborad()
{
    return _PciDashboardService.GetRoomOutcome(PciQs("baseYear"), PciQs("department"));
}

// --- Revenue ---

[WebMethod]
public string GetRevenueFilterOptions_pci_revenue_dashborad()
{
    return _PciDashboardService.GetRevenueFilterOptions();
}

[WebMethod]
public string GetRevenueByDeptFiveYears_pci_revenue_dashborad(string baseYear)
{
    return _PciDashboardService.GetRevenueByDeptFiveYears(
        baseYear,
        PciQs("department"),
        PciQs("billingDepartment"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("payer"),
        PciQs("groupBy"));
}

[WebMethod]
public string GetRevenueByProcedureFiveYears_pci_revenue_dashborad(string baseYear)
{
    return _PciDashboardService.GetRevenueByProcedureFiveYears(
        baseYear,
        PciQs("department"),
        PciQs("billingDepartment"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("payer"),
        PciQs("groupBy"));
}

[WebMethod]
public string GetRevenueByMonth_pci_revenue_dashborad(string baseYear)
{
    return _PciDashboardService.GetRevenueByMonth(
        baseYear,
        PciQs("department"),
        PciQs("billingDepartment"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("payer"));
}

[WebMethod]
public string GetRevenueStackedComposite_pci_revenue_dashborad_wing(string baseYear)
{
    return _PciDashboardService.GetRevenueStackedComposite(
        baseYear,
        PciQs("department"),
        PciQs("billingDepartment"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("payer"));
}

[WebMethod]
public string GetServicePerformed_pci_revenue_dashborad(string baseYear)
{
    return _PciDashboardService.GetServicePerformed(
        baseYear,
        PciQs("department"),
        PciQs("billingDepartment"),
        PciQs("surgeryType"),
        PciQs("shift"),
        PciQs("site"),
        PciQs("weekend"),
        PciQs("payer"),
        PciQs("mode"),
        PciQs("search"),
        PciQs("listGroupBy"),
        PciQs("serviceName"),
        PciQs("unifiedCategory"),
        PciQs("breakdownBy"));
}
