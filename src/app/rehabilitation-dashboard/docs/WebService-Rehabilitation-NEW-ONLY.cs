// =============================================================================
// WebService-Rehabilitation-NEW-ONLY.cs — paste ONLY these 11 WebMethods into WebService.cs
// =============================================================================
// Do NOT paste SECTION A methods (1.3–1.7) — they already exist at ~6844.
// Requires RehabilitationOccupancyService.cs in App_Code (DTOs + stub methods).
//
// Optional field (add once near other service fields):
//   private RehabilitationOccupancyService _RehabilitationOccupancyService = new RehabilitationOccupancyService();
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
