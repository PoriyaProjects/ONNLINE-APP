// =============================================================================
// WebService-Rehabilitation-NEW-ONLY.cs — paste into WebService.cs (App_Code)
// =============================================================================
// Requires RehabilitationOccupancyService.cs in App_Code (947 lines — full replace from docs/).
// All methods: string FromDate, string ToDate (yyyy-MM-dd) → ParseD in service.
//
// Field (add once near other service fields in WebService class, if not already present):
//   RehabilitationOccupancyService _RehabilitationOccupancyService = new RehabilitationOccupancyService();
//
// Paste ONLY this file after the existing 1.3–1.7 block (~6844). Do NOT re-paste 1.3–1.7.
// 10 WebMethods: 1.1, 1.2, 1.8, 2.1–2.8
// =============================================================================

// 1.1
[WebMethod]
public List<RehabilitationHospitalizationDays> GetRehabilitationHospitalizationDays(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetHospitalizationDays(FromDate, ToDate);
}

// 1.2
[WebMethod]
public List<RehabilitationAvgLengthOfStay> GetRehabilitationAvgLengthOfStay(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAvgLengthOfStay(FromDate, ToDate);
}

// 1.8
[WebMethod]
public List<RehabilitationTreatment> GetRehabilitationTreatments(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetTreatments(FromDate, ToDate);
}

// 2.1
[WebMethod]
public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabPatientsByPayer(FromDate, ToDate);
}

// 2.2
[WebMethod]
public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabPatientsByDirection(FromDate, ToDate);
}

// 2.3
[WebMethod]
public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabDischargesWithRecommendation(FromDate, ToDate);
}

// 2.4
[WebMethod]
public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsDailyCumulative(FromDate, ToDate);
}

// 2.5
[WebMethod]
public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsBySector(FromDate, ToDate);
}

// 2.6
[WebMethod]
public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsPerPosition(FromDate, ToDate);
}

// 2.7
[WebMethod]
public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabAvgTreatmentsPerPatient(FromDate, ToDate);
}

// 2.8
[WebMethod]
public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDayRehabTreatmentsIndividualGroup(FromDate, ToDate);
}
