// =============================================================================
// RehabilitationOccupancyService — missing methods + ParseD fixes
// =============================================================================
// Location in backend repo (when deployed):
//   - Service: RehabilitationOccupancyService.cs
//   - WebMethods: WebService.asmx / WebService.cs
//
// Frontend contract: rehabilitation-dashboard/docs/README.md
// DB connection: ConfigurationManager.ConnectionStrings["ChameleonConnection"]
//
// Merge into existing RehabilitationOccupancyService; do NOT duplicate DTOs
// that already exist in your project.
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;

// ---------------------------------------------------------------------------
// Shared ParseD helper — reference implementation (occupancy 1.3 already uses this)
// ---------------------------------------------------------------------------
public static class RehabDateParse
{
    private static readonly string[] Formats = { "yyyy-MM-dd" };

    public static void ParseRange(string fromDate, string toDate, out DateTime from, out DateTime to)
    {
        if (!DateTime.TryParseExact(fromDate?.Trim(), Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out from))
        {
            throw new ArgumentException("FromDate must be yyyy-MM-dd", nameof(fromDate));
        }
        if (!DateTime.TryParseExact(toDate?.Trim(), Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out to))
        {
            throw new ArgumentException("ToDate must be yyyy-MM-dd", nameof(toDate));
        }
        if (to < from)
        {
            throw new ArgumentException("ToDate must be >= FromDate");
        }
    }

    public static SqlParameter DateParam(string name, DateTime value)
    {
        return new SqlParameter(name, SqlDbType.Date) { Value = value.Date };
    }
}

// ---------------------------------------------------------------------------
// DTOs — add only if not already defined in your project
// ---------------------------------------------------------------------------

public class RehabilitationTreatment
{
    public DateTime Date;
    public string ProfessionName;
    public int TotalTreatments;
    public decimal AvgPerPatientDay;
    public int Unit;
    public string DepartmentName;
    public bool WeekdayOnly; // true = Wed–Thu (SQL DATEPART weekday 4–5)
}

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

// Day-rehab DTOs (2.1–2.8) — stubs for future wiring
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
    public string TreatmentType; // "פרטני" | "קבוצתי"
    public int TreatmentCount;
    public string DepartmentName;
}

// ---------------------------------------------------------------------------
// RehabilitationOccupancyService — partial class additions
// ---------------------------------------------------------------------------
public partial class RehabilitationOccupancyService
{
    private static readonly string RehabUnitsInClause =
        "85, 150685851, 49"; // גריאטריה שיקומית, שיקום כללי, שיקום ילדים

    private static readonly string[] RehabDepartmentNames =
    {
        N'המחלקה לגריאטריה שיקומית',
        N'מחלקת שיקום כללי',
        N'מחלקת שיקום ילדים',
    };

    private static readonly string[] TreatmentProfessions =
    {
        N'פיזיותרפיה',
        N'ריפוי בעיסוק',
        N'קלינאות תקשורת',
        N'פסיכולוגיה',
        N'סיעוד שיקומי',
    };

    private string ChameleonConnection =>
        ConfigurationManager.ConnectionStrings["ChameleonConnection"].ConnectionString;

    // =========================================================================
    // P0 — 1.8 GetTreatments
    // =========================================================================
    /// <summary>
    /// Metric 1.8 — professional treatments for inpatients in 3 rehab units.
    /// Frontend: rehabilitation-treatments-api.service.ts
    /// Mapper filters WeekdayOnly=true for weekly (non-daily) status view.
    /// </summary>
    public List<RehabilitationTreatment> GetTreatments(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out var from, out var to);
        var results = new List<RehabilitationTreatment>();

        // TODO: Replace stub SQL once source table/columns are confirmed.
        // QUESTIONS FOR DBA / product owner:
        // 1. Which table holds inpatient professional treatments? (e.g. Treatments, TherapySessions, …)
        // 2. Treatment date column name?
        // 3. Profession column — raw code vs Hebrew label? Mapping table?
        // 4. One row = one treatment session, or aggregated elsewhere?
        // 5. AvgPerPatientDay denominator: occupied patient-days per dept/day from Hospitalizations?
        // 6. Unit/department join column (SystemUnits.Unit / DepartmentName)?
        // 7. Confirm Wed–Thu filter: DATEPART(weekday, TreatmentDate) IN (4, 5) with SET DATEFIRST 1?

        const string sql = @"
-- TODO: implement against real treatment table
SELECT
    CAST(@FromDate AS date) AS [Date],
    p.ProfessionName,
    COUNT(*) AS TotalTreatments,
    CAST(0 AS decimal(10,2)) AS AvgPerPatientDay, -- TODO: COUNT(*) / NULLIF(patient_days, 0)
    d.Unit,
    d.DepartmentName,
    CASE WHEN DATEPART(weekday, CAST(@FromDate AS date)) IN (4, 5) THEN 1 ELSE 0 END AS WeekdayOnly
FROM (
    -- placeholder: one row per profession so smoke test returns shape
    SELECT ProfessionName FROM (VALUES
        (N'פיזיותרפיה'),
        (N'ריפוי בעיסוק'),
        (N'קלינאות תקשורת'),
        (N'פסיכולוגיה'),
        (N'סיעוד שיקומי')
    ) AS Professions(ProfessionName)
) p
CROSS JOIN (
    SELECT Unit, DepartmentName FROM (VALUES
        (85,  N'המחלקה לגריאטריה שיקומית'),
        (150685851, N'מחלקת שיקום כללי'),
        (49,  N'מחלקת שיקום ילדים')
    ) AS Depts(Unit, DepartmentName)
) d
WHERE 1 = 0; -- remove WHEN real query is ready; returns [] until then
";

        using (var conn = new SqlConnection(ChameleonConnection))
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
            cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
            conn.Open();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    results.Add(new RehabilitationTreatment
                    {
                        Date = reader.GetDateTime(reader.GetOrdinal("Date")),
                        ProfessionName = reader["ProfessionName"] as string ?? string.Empty,
                        TotalTreatments = reader.GetInt32(reader.GetOrdinal("TotalTreatments")),
                        AvgPerPatientDay = reader.GetDecimal(reader.GetOrdinal("AvgPerPatientDay")),
                        Unit = reader.GetInt32(reader.GetOrdinal("Unit")),
                        DepartmentName = reader["DepartmentName"] as string ?? string.Empty,
                        WeekdayOnly = reader.GetBoolean(reader.GetOrdinal("WeekdayOnly")),
                    });
                }
            }
        }

        return results;
    }

    // =========================================================================
    // P1 — 1.1 HospitalizationDays (gross / net)
    // =========================================================================
    public List<RehabilitationHospitalizationDays> GetHospitalizationDays(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out var from, out var to);
        var results = new List<RehabilitationHospitalizationDays>();

        // TODO: confirm GrossDays vs NetDays business rules and source table.
        // QUESTIONS:
        // 1. Source table — Hospitalizations? PATIENT_MONITORING?
        // 2. GrossDays = all bed-days including waiting? NetDays = treatment days only?
        // 3. Aggregation per calendar day per department, or period total repeated per day?

        throw new NotImplementedException(
            "GetHospitalizationDays (1.1): awaiting table structure. " +
            "Return fields: Date, Unit, DepartmentName, GrossDays, NetDays.");
    }

    // =========================================================================
    // P1 — 1.2 AvgLengthOfStay
    // =========================================================================
    public List<RehabilitationAvgLengthOfStay> GetAvgLengthOfStay(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out var from, out var to);
        var results = new List<RehabilitationAvgLengthOfStay>();

        // TODO: confirm LOS calculation (discharges in period vs census snapshot).
        // QUESTIONS:
        // 1. AvgLosDays = AVG(discharge_date - admission_date) for discharges in range?
        // 2. PatientCount = number of discharges or distinct patients?
        // 3. Per-day rows or one row per department for entire range?

        throw new NotImplementedException(
            "GetAvgLengthOfStay (1.2): awaiting table structure. " +
            "Return fields: Date, Unit, DepartmentName, AvgLosDays, PatientCount.");
    }

    // =========================================================================
    // P2 — Day rehab stubs (2.1–2.8)
    // =========================================================================
    public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.1 GetDayRehabPatientsByPayer — 5 day-rehab departments.");
    }

    public List<DayRehabPatientsByDirection> GetDayRehabPatientsByDirection(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.2 GetDayRehabPatientsByDirection.");
    }

    public List<DayRehabDischargesWithRecommendation> GetDayRehabDischargesWithRecommendation(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.3 GetDayRehabDischargesWithRecommendation.");
    }

    public List<DayRehabTreatmentsDailyCumulative> GetDayRehabTreatmentsDailyCumulative(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.4 GetDayRehabTreatmentsDailyCumulative.");
    }

    public List<DayRehabTreatmentsBySector> GetDayRehabTreatmentsBySector(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.5 GetDayRehabTreatmentsBySector.");
    }

    public List<DayRehabTreatmentsPerPosition> GetDayRehabTreatmentsPerPosition(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.6 GetDayRehabTreatmentsPerPosition.");
    }

    public List<DayRehabAvgTreatmentsPerPatient> GetDayRehabAvgTreatmentsPerPatient(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.7 GetDayRehabAvgTreatmentsPerPatient.");
    }

    public List<DayRehabTreatmentsIndividualGroup> GetDayRehabTreatmentsIndividualGroup(string fromDate, string toDate)
    {
        RehabDateParse.ParseRange(fromDate, toDate, out _, out _);
        throw new NotImplementedException("2.8 GetDayRehabTreatmentsIndividualGroup.");
    }
}

// =============================================================================
// ParseD FIXES — apply to EXISTING methods in RehabilitationOccupancyService
// =============================================================================
//
// Problem: DateTime.Parse + SqlDbType.DateTime → API returns d:[] despite SSMS rows.
// Fix: string params + ParseExact + SqlDbType.Date
//
// --- BEFORE (broken) ---
// public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(DateTime fromDate, DateTime toDate)
// {
//     cmd.Parameters.Add("@FromDate", SqlDbType.DateTime).Value = fromDate;
//     cmd.Parameters.Add("@ToDate", SqlDbType.DateTime).Value = toDate;
// }
//
// --- AFTER (fixed) ---
// public List<RehabilitationAdmissionsByPayer> GetAdmissionsByPayer(string fromDate, string toDate)
// {
//     RehabDateParse.ParseRange(fromDate, toDate, out var from, out var to);
//     cmd.Parameters.Add(RehabDateParse.DateParam("@FromDate", from));
//     cmd.Parameters.Add(RehabDateParse.DateParam("@ToDate", to));
//     // SQL: WHERE CAST(pm.EventDate AS date) BETWEEN @FromDate AND @ToDate
// }
//
// ---------------------------------------------------------------------------
// 1.4 GetAdmissionsByPayer — required response fields:
//   Date, PayerCategory, PayerName, AdmissionsCount, Unit, DepartmentName
//   PayerCategory: "קופת חולים" | "צה״ל + משרד הביטחון" | "אחר"
//   Filter: Units IN (85, 150685851, 49)
//
// 1.5 GetAdmissionsByDirection — required response fields:
//   Date, Direction ("פנים"|"חוץ"), FunderName, AdmissionsCount, Unit, DepartmentName
//   Source: PATIENT_MONITORING; PM_MOVE_RANGE = N'אישפוז' → Direction = N'פנים'
//   CRITICAL: use DATE params on PATIENT_MONITORING date column, NOT occupancy SQL
//   FunderName from MedicalRecords.Pay_Institute mapping
//
// 1.6 GetRecommendedTargets — required response fields:
//   Date, Unit, DepartmentName, ActualValue, TargetValue, Gap, MetricType, Status
//   Optional: TotalOccupiedPatientDays, DaysInPeriod (frontend uses for monthly rollup)
//   MetricType examples: "תפוסה" | "ימי_אשפוז" | "קבלות"
//   Status: "עומד ביעד" | "מתחת ליעד"
//
// 1.7 GetRevenueNet — required response fields:
//   Date, Unit, DepartmentName, RevenueAmount, RevenuePerDay, SharePercent
//   Current behavior: rolling 12 months (ignores FromDate/ToDate) — OK for monthly status
//   Optional future: honor request date range for dashboard
//
// =============================================================================

// =============================================================================
// WebService.asmx — WebMethod wrappers (add to WebService.cs)
// =============================================================================
/*
private readonly RehabilitationOccupancyService _RehabilitationService =
    new RehabilitationOccupancyService();

[WebMethod]
[OperationContract]
public List<RehabilitationTreatment> GetRehabilitationTreatments(string FromDate, string ToDate)
{
    return _RehabilitationService.GetTreatments(FromDate, ToDate);
}

[WebMethod]
[OperationContract]
public List<RehabilitationHospitalizationDays> GetRehabilitationHospitalizationDays(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetHospitalizationDays(FromDate, ToDate);
}

[WebMethod]
[OperationContract]
public List<RehabilitationAvgLengthOfStay> GetRehabilitationAvgLengthOfStay(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetAvgLengthOfStay(FromDate, ToDate);
}

// --- ParseD: change existing WebMethod signatures from DateTime to string ---
[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetAdmissionsByPayer(FromDate, ToDate);
}

[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetAdmissionsByDirection(FromDate, ToDate);
}

[WebMethod]
[OperationContract]
public List<RehabilitationRecommendedTarget> GetRehabilitationRecommendedTargets(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetRecommendedTargets(FromDate, ToDate);
}

[WebMethod]
[OperationContract]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(
    string FromDate, string ToDate)
{
    return _RehabilitationService.GetRevenueNet(FromDate, ToDate);
}

// P2 day-rehab (when ready):
[WebMethod]
[OperationContract]
public List<DayRehabPatientsByPayer> GetDayRehabPatientsByPayer(string FromDate, string ToDate)
{
    return _RehabilitationService.GetDayRehabPatientsByPayer(FromDate, ToDate);
}
// ... repeat for 2.2–2.8
*/

// =============================================================================
// Smoke test (Postman / curl)
// =============================================================================
/*
POST {baseUrl}/WebService.asmx/GetRehabilitationTreatments
Content-Type: application/json

{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }

Expected: { "d": [ { "Date": "/Date(...)/", "ProfessionName": "פיזיותרפיה",
  "TotalTreatments": 12, "AvgPerPatientDay": 1.5, "Unit": 85,
  "DepartmentName": "המחלקה לגריאטריה שיקומית", "WeekdayOnly": false } ] }

Weekly status: rows with WeekdayOnly=true are aggregated in frontend for non-daily view.
Departments must match Chameleon names (frontend maps to display names via unit alias).
*/
