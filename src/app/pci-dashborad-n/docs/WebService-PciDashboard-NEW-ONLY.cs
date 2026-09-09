// =============================================================================
// WebService-PciDashboard-NEW-ONLY.cs — paste into WebService.cs
// =============================================================================
// Angular POST JSON sends all fields as WebMethod parameters (see signatures below).
// PciQs fallback supports legacy GET QueryString only.
//
// PREREQUISITE: copy PciDashboardService.cs into App_Code (same folder as WebService.cs).
//
// Field — add ONCE inside the WebService class (near other *_Service fields), e.g. after
// existing service field declarations:
//
//   PciDashboardService _PciDashboardService = new PciDashboardService();
//
// Without this line you get CS0103: The name '_PciDashboardService' does not exist.
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

private static string PciOr(string bodyValue, string qsValue)
{
    if (bodyValue != null && bodyValue.Trim().Length > 0)
    {
        return bodyValue.Trim();
    }
    return qsValue ?? "";
}

// --- Main dashboard ---

[WebMethod]
public string GetCountByDept_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetCountByDept(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetMonthlyCounts_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetMonthlyCounts(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetExploreSeries_pci_dashborad(
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
    return _PciDashboardService.GetExploreSeries(
        PciOr(fromDate, PciQs("fromDate")),
        PciOr(toDate, PciQs("toDate")),
        PciOr(grain, PciQs("grain")),
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetDepartmentYoY_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetDepartmentYoY(
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetUniqueDiagnoses_pci_dashborad()
{
    return _PciDashboardService.GetUniqueDiagnoses();
}

[WebMethod]
public string GetDepRoomFiveYears_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetDepRoomFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetAvgDurationYearlyFiveYears_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetAvgDurationFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetAvgSurgeriesPerDayPerRoomFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetAvgDurationFiveYears_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetAvgDurationFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetAvgFirstMorningEntry_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetAvgFirstMorningEntry(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetAvgLastMorningEnd_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetAvgLastMorningEnd(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetLossByWingYear_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetLossByWingYear(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetApprovedUtilization_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetApprovedUtilization(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetSurgeriesByDepartment_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetSurgeriesByDepartment(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

[WebMethod]
public string GetCountByDoctor_pci_dashborad(
    string baseYear,
    string department,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms)
{
    return _PciDashboardService.GetCountByDoctor(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")));
}

// --- Revenue ---

[WebMethod]
public string GetRevenueFilterOptions_pci_revenue_dashborad()
{
    return _PciDashboardService.GetRevenueFilterOptions();
}

[WebMethod]
public string GetRevenueByDeptFiveYears_pci_revenue_dashborad(
    string baseYear,
    string department,
    string billingDepartment,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms,
    string payer,
    string groupBy)
{
    return _PciDashboardService.GetRevenueByDeptFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(billingDepartment, PciQs("billingDepartment")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")),
        PciOr(payer, PciQs("payer")),
        PciOr(groupBy, PciQs("groupBy")));
}

[WebMethod]
public string GetRevenueByProcedureFiveYears_pci_revenue_dashborad(
    string baseYear,
    string department,
    string billingDepartment,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms,
    string payer,
    string groupBy)
{
    return _PciDashboardService.GetRevenueByProcedureFiveYears(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(billingDepartment, PciQs("billingDepartment")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")),
        PciOr(payer, PciQs("payer")),
        PciOr(groupBy, PciQs("groupBy")));
}

[WebMethod]
public string GetRevenueByMonth_pci_revenue_dashborad(
    string baseYear,
    string department,
    string billingDepartment,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms,
    string payer)
{
    return _PciDashboardService.GetRevenueByMonth(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(billingDepartment, PciQs("billingDepartment")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")),
        PciOr(payer, PciQs("payer")));
}

[WebMethod]
public string GetRevenueStackedComposite_pci_revenue_dashborad_wing(
    string baseYear,
    string department,
    string billingDepartment,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms,
    string payer)
{
    return _PciDashboardService.GetRevenueStackedComposite(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(billingDepartment, PciQs("billingDepartment")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")),
        PciOr(payer, PciQs("payer")));
}

[WebMethod]
public string GetServicePerformed_pci_revenue_dashborad(
    string baseYear,
    string department,
    string billingDepartment,
    string surgeryType,
    string shift,
    string site,
    string weekend,
    string morningWork,
    string rooms,
    string payer,
    string mode,
    string search,
    string listGroupBy,
    string serviceName,
    string unifiedCategory,
    string breakdownBy)
{
    return _PciDashboardService.GetServicePerformed(
        baseYear,
        PciOr(department, PciQs("department")),
        PciOr(billingDepartment, PciQs("billingDepartment")),
        PciOr(surgeryType, PciQs("surgeryType")),
        PciOr(shift, PciQs("shift")),
        PciOr(site, PciQs("site")),
        PciOr(weekend, PciQs("weekend")),
        PciOr(morningWork, PciQs("morningWork")),
        PciOr(rooms, PciQs("rooms")),
        PciOr(payer, PciQs("payer")),
        PciOr(mode, PciQs("mode")),
        PciOr(search, PciQs("search")),
        PciOr(listGroupBy, PciQs("listGroupBy")),
        PciOr(serviceName, PciQs("serviceName")),
        PciOr(unifiedCategory, PciQs("unifiedCategory")),
        PciOr(breakdownBy, PciQs("breakdownBy")));
}
