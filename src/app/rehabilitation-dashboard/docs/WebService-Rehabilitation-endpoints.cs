// =============================================================================
// WebService-Rehabilitation-endpoints.cs — reference + paste guide for WebService.cs
// =============================================================================
// Requires RehabilitationOccupancyService.cs in App_Code (same DTOs + service).
// All methods: string FromDate, string ToDate (yyyy-MM-dd) → ParseD in service.
//
// Optional field (add once near other service fields in WebService.cs):
//   private RehabilitationOccupancyService _RehabilitationOccupancyService = new RehabilitationOccupancyService();
// =============================================================================

// =============================================================================
// SECTION A — EXISTING (do NOT paste if already in WebService ~6844)
// =============================================================================
// These 5 WebMethods (1.3–1.7) are already deployed. Listed here for reference only.
// If you paste them again you get CS0111 duplicate member errors.
// =============================================================================

// 1.3 GetRehabilitationOccupancy        → GetDailyOccupancy
// 1.4 GetRehabilitationAdmissionsByPayer → GetAdmissionsByPayer
// 1.5 GetRehabilitationAdmissionsByDirection → GetAdmissionsByDirection
// 1.6 GetRehabilitationRecommendedTargets → GetRecommendedTargets
// 1.7 GetRehabilitationRevenueNet       → GetRevenueNet

/*
[WebMethod]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDailyOccupancy(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAdmissionsByPayer(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAdmissionsByDirection(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationRecommendedTarget> GetRehabilitationRecommendedTargets(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetRecommendedTargets(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetRevenueNet(FromDate, ToDate);
}
*/

// =============================================================================
// SECTION B — NEW ONLY (paste these after the existing block ~6844)
// =============================================================================
// 11 WebMethods: 1.1, 1.2, 1.8 + DayRehab 2.1–2.8
// See also: WebService-Rehabilitation-NEW-ONLY.cs (copy-paste ready, no comments)
// =============================================================================

[WebMethod]
public List<RehabilitationTreatment> GetRehabilitationTreatments(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetTreatments(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationHospitalizationDays> GetRehabilitationHospitalizationDays(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetHospitalizationDays(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAvgLengthOfStay> GetRehabilitationAvgLengthOfStay(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAvgLengthOfStay(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabPatientsByPayer(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabPatientsByDirection(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabDischargesWithRecommendation(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsDailyCumulative(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsBySector(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsPerPosition(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabAvgTreatmentsPerPatient(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsIndividualGroup(FromDate, ToDate);
}
