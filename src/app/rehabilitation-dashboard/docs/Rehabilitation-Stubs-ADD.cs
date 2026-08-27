// =============================================================================
// Rehabilitation-Stubs-ADD.cs — C# 5 / App_Code (ADD to existing service, do NOT replace)
// =============================================================================
// הוסף `partial` ל-class RehabilitationOccupancyService בקובץ הראשי
// העתק קובץ זה ל-App_Code
//
// Fixes CS0246 (missing DTOs) + CS1061 (missing GetHospitalizationDays / GetDayRehab*)
// when WebService.cs already has the new WebMethods but server service file is old.
// Main RehabilitationOccupancyService.cs must declare: public partial class RehabilitationOccupancyService
// ParseD/ParseRange already exist in main file — stubs call them via partial merge.
// =============================================================================

using System;
using System.Collections.Generic;
using System.Globalization;

public class RehabilitationHospitalizationDays
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public int GrossDays;
    public int NetDays;
}

public class RehabilitationAvgLengthOfStay
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal AvgLosDays;
    public int PatientCount;
}

public class DayRehabPatientsByPayer
{
    public DateTime Date;
    public string PayerName;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabPatientsByDirection
{
    public DateTime Date;
    public string Direction;
    public string FunderName;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabDischargesWithRecommendation
{
    public DateTime Date;
    public int DischargeCount;
    public int TreatedHere;
    public int NotTreatedHere;
    public string DepartmentName;
}

public class DayRehabTreatmentsDailyCumulative
{
    public DateTime Date;
    public int DailyCount;
    public int CumulativeCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsBySector
{
    public DateTime Date;
    public string SectorName;
    public int TreatmentCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsPerPosition
{
    public DateTime Date;
    public string SectorName;
    public decimal TreatmentsPerPosition;
    public string DepartmentName;
}

public class DayRehabAvgTreatmentsPerPatient
{
    public DateTime Date;
    public decimal AvgTreatments;
    public int PatientCount;
    public string DepartmentName;
}

public class DayRehabTreatmentsIndividualGroup
{
    public DateTime Date;
    public string TreatmentType;
    public int TreatmentCount;
    public string DepartmentName;
}

public partial class RehabilitationOccupancyService
{
    public List<RehabilitationHospitalizationDays> GetHospitalizationDays(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<RehabilitationHospitalizationDays>();
    }

    public List<RehabilitationAvgLengthOfStay> GetAvgLengthOfStay(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<RehabilitationAvgLengthOfStay>();
    }

    public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabPatientsByPayer>();
    }

    public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabPatientsByDirection>();
    }

    public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabDischargesWithRecommendation>();
    }

    public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsDailyCumulative>();
    }

    public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsBySector>();
    }

    public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsPerPosition>();
    }

    public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabAvgTreatmentsPerPatient>();
    }

    public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string fromDate, string toDate)
    {
        DateTime from;
        DateTime to;
        ParseRange(fromDate, toDate, out from, out to);
        return new List<DayRehabTreatmentsIndividualGroup>();
    }
}
