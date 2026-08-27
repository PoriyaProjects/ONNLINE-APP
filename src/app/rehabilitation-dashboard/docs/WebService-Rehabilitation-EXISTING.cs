// =============================================================================
// WebService-Rehabilitation-EXISTING.cs — REFERENCE ONLY (1.3–1.7)
// =============================================================================
// אם כבר קיים — לא להדביק
//
// These WebMethods are typically already deployed in WebService.cs at ~6844.
// Pasting this block again causes CS0111 duplicate member errors (~6973–7017).
// =============================================================================

// 1.3
[WebMethod]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDailyOccupancy(FromDate, ToDate);
}

// 1.4
[WebMethod]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAdmissionsByPayer(FromDate, ToDate);
}

// 1.5
[WebMethod]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAdmissionsByDirection(FromDate, ToDate);
}

// 1.6
[WebMethod]
public List<RehabilitationRecommendedTarget> GetRehabilitationRecommendedTargets(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetRecommendedTargets(FromDate, ToDate);
}

// 1.7 — לא להוסיף overload ללא פרמטרים
[WebMethod]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetRevenueNet(FromDate, ToDate);
}
