// =============================================================================
// WebService-Rehabilitation-endpoints.cs — copy-paste into WebService.cs (~6844)
// =============================================================================
// Requires RehabilitationOccupancyService.cs in App_Code (same DTOs + service).
// All methods: string FromDate, string ToDate (yyyy-MM-dd) → ParseD in service.
// =============================================================================

[WebMethod]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDailyOccupancy(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetAdmissionsByPayer(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetAdmissionsByDirection(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationRecommendedTarget> GetRehabilitationRecommendedTargets(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetRecommendedTargets(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetRevenueNet(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationTreatment> GetRehabilitationTreatments(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetTreatments(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationHospitalizationDays> GetRehabilitationHospitalizationDays(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetHospitalizationDays(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAvgLengthOfStay> GetRehabilitationAvgLengthOfStay(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetAvgLengthOfStay(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabPatientsByPayer(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabPatientsByDirection(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabDischargesWithRecommendation(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabTreatmentsDailyCumulative(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabTreatmentsBySector(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabTreatmentsPerPosition(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabAvgTreatmentsPerPatient(FromDate, ToDate);
}

[WebMethod]
public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string FromDate, string ToDate)
{
    return new RehabilitationOccupancyService().GetDayRehabTreatmentsIndividualGroup(FromDate, ToDate);
}
