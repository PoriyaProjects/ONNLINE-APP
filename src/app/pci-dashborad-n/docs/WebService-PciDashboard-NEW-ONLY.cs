// =============================================================================
// WebService-PciDashboard-NEW-ONLY.cs — paste into WebService.cs (App_Code)
// =============================================================================
// דשבורד צינתורים (PCI) — העתק ל-WebService.cs.
// כרגע כל המתודות מחזירות רשימות ריקות (stub) עד חיבור SQL.
//
// Field (add once in WebService class):
//   PciDashboardService _PciDashboardService = new PciDashboardService();
//
// Requires PciDashboardService.cs in App_Code (create from surgeries dashboard service
// or implement queries against PCI/cath lab tables).
//
// Angular route: /#/pciDashboard
// environment.url prefix: WebService.asmx/
// =============================================================================

// --- Main dashboard ---

[WebMethod]
public string GetCountByDept_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetCountByDept(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetMonthlyCounts_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetMonthlyCounts(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
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
public string GetDepRoomFiveYears_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetDepRoomFiveYears(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetAvgDurationYearlyFiveYears_pci_dashborad(string baseYear)
{
    return _PciDashboardService.GetAvgDurationYearlyFiveYears(baseYear);
}

[WebMethod]
public string GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetAvgSurgeriesPerDayPerRoomFiveYears(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetAvgDurationFiveYears_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetAvgDurationFiveYears(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetAvgFirstMorningEntry_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetAvgFirstMorningEntry(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetAvgLastMorningEnd_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetAvgLastMorningEnd(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetAvgSetup_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetAvgSetup(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetLossByWingYear_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetLossByWingYear(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetApprovedUtilization_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetApprovedUtilization(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetSurgeriesByDepartment_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetSurgeriesByDepartment(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
}

[WebMethod]
public string GetCountByDoctor_pci_dashborad(string baseYear, string department, string surgeryType, string shift, string site, string weekend, string morningWork, string rooms)
{
    return _PciDashboardService.GetCountByDoctor(baseYear, department, surgeryType, shift, site, weekend, morningWork, rooms);
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
public string GetRecommendationsByDoctor_pci_dashborad(string department, string baseYear)
{
    return _PciDashboardService.GetRecommendationsByDoctor(department, baseYear);
}

[WebMethod]
public string GetRecommendationsByRecommendingDoctor_pci_dashborad(string department, string baseYear)
{
    return _PciDashboardService.GetRecommendationsByRecommendingDoctor(department, baseYear);
}

[WebMethod]
public string GetTopRecommendedProcedures_pci_dashborad(string doctor, string department)
{
    return _PciDashboardService.GetTopRecommendedProcedures(doctor, department);
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
public string GetCancellationsYearly_pci_dashborad(string baseYear, string department)
{
    return _PciDashboardService.GetCancellationsYearly(baseYear, department);
}

[WebMethod]
public string GetCancellationsMonthly_pci_dashborad(string baseYear, string department)
{
    return _PciDashboardService.GetCancellationsMonthly(baseYear, department);
}

[WebMethod]
public string GetTopCancellationReasons_pci_dashborad(string baseYear, string department)
{
    return _PciDashboardService.GetTopCancellationReasons(baseYear, department);
}

[WebMethod]
public string GetCancellationReasonsByDepartment_pci_dashborad(string baseYear, string department)
{
    return _PciDashboardService.GetCancellationReasonsByDepartment(baseYear, department);
}

[WebMethod]
public string GetRoomOutcome_pci_dashborad(string baseYear, string department)
{
    return _PciDashboardService.GetRoomOutcome(baseYear, department);
}

// --- Revenue ---

[WebMethod]
public string GetRevenueFilterOptions_pci_revenue_dashborad()
{
    return _PciDashboardService.GetRevenueFilterOptions();
}

[WebMethod]
public string GetRevenueByDeptFiveYears_pci_revenue_dashborad(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string groupBy)
{
    return _PciDashboardService.GetRevenueByDeptFiveYears(baseYear, department, billingDepartment, surgeryType, shift, site, weekend, payer, groupBy);
}

[WebMethod]
public string GetRevenueByProcedureFiveYears_pci_revenue_dashborad(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string groupBy)
{
    return _PciDashboardService.GetRevenueByProcedureFiveYears(baseYear, department, billingDepartment, surgeryType, shift, site, weekend, payer, groupBy);
}

[WebMethod]
public string GetRevenueByMonth_pci_revenue_dashborad(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer)
{
    return _PciDashboardService.GetRevenueByMonth(baseYear, department, billingDepartment, surgeryType, shift, site, weekend, payer);
}

[WebMethod]
public string GetRevenueStackedComposite_pci_revenue_dashborad_wing(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer)
{
    return _PciDashboardService.GetRevenueStackedComposite(baseYear, department, billingDepartment, surgeryType, shift, site, weekend, payer);
}

[WebMethod]
public string GetServicePerformed_pci_revenue_dashborad(string baseYear, string department, string billingDepartment, string surgeryType, string shift, string site, string weekend, string payer, string mode, string search, string listGroupBy, string serviceName, string unifiedCategory, string breakdownBy)
{
    return _PciDashboardService.GetServicePerformed(baseYear, department, billingDepartment, surgeryType, shift, site, weekend, payer, mode, search, listGroupBy, serviceName, unifiedCategory, breakdownBy);
}
