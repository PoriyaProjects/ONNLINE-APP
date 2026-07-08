// Copy into your SurgeriesCalendar class (same file as getNappProceduresListByRequestID).
// WebService wrapper is already in BACKEND_PROMPT_GetNappWaitingForVirtualRoomScheduling.md section 2.
//
// Wire the TODO helpers below to your existing methods if names differ.

using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

public partial class SurgeriesCalendar
{
    #region DTOs

    public class NappWaitingForVirtualRoomResult
    {
        public List<NappWaitingRowDto> WaitingList { get; set; }

        public NappWaitingForVirtualRoomResult()
        {
            WaitingList = new List<NappWaitingRowDto>();
        }
    }

    public class NappWaitingRowDto
    {
        public string CaseNumber { get; set; }
        public string RequestID { get; set; }
        public string RequestDate { get; set; }
        public string PatientFirstName { get; set; }
        public string PatientLastName { get; set; }
        public string PatientId { get; set; }
        public string RequestDepart { get; set; }
        public string SeodeDepart { get; set; }
        public string Department { get; set; }
        public string Urgency { get; set; }
        public string SurgeryType { get; set; }
        public int DurationMinutes { get; set; }
        public int? DrorDuration { get; set; }
        public int? WaitingDays { get; set; }
        public List<NappProcedureDto> Procedures { get; set; }
    }

    #endregion

    public NappWaitingForVirtualRoomResult GetNappWaitingForVirtualRoomScheduling(
        string fullDate,
        string calendarRoomsArea,
        string roomGroupDesc,
        string[] roomCodes)
    {
        var result = new NappWaitingForVirtualRoomResult();

        fullDate = (fullDate ?? "").Trim();
        calendarRoomsArea = (calendarRoomsArea ?? "").Trim();
        roomGroupDesc = (roomGroupDesc ?? "").Trim();
        roomCodes = roomCodes ?? new string[0];

        if (string.IsNullOrEmpty(fullDate))
            return result;

        var scheduledKeys = BuildScheduledCaseRequestKeys(fullDate, calendarRoomsArea);
        var allowedDepartments = ResolveDepartmentDisplayNames(roomCodes);
        var departmentDisplayCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            const string sql = @"
SELECT
    n.CaseNumber,
    n.RequestID,
    n.RequestDate,
    n.RequestDepart,
    n.SeodeDepart,
    n.Dauration,
    n.Urgency,
    n.SurgeryType,
    DATEDIFF(DAY, CAST(n.RequestDate AS date), CAST(@fullDate AS date)) AS WaitingDays
FROM [NAMER].[dbo].[NAPP] n WITH (NOLOCK)
WHERE (n.Canceled IS NULL OR n.Canceled <> 'X')
  AND n.RequestStatus = 20
ORDER BY n.RequestDate ASC, n.CaseNumber ASC";

            SqlCommand cmd = new SqlCommand(sql, myConnection);
            cmd.Parameters.AddWithValue("@fullDate", fullDate);

            myConnection.Open();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string caseNumber = ReadString(reader, "CaseNumber");
                    string requestId = ReadString(reader, "RequestID");
                    if (string.IsNullOrEmpty(caseNumber) || string.IsNullOrEmpty(requestId))
                        continue;

                    string compositeKey = caseNumber + "|" + requestId;
                    if (scheduledKeys.Contains(compositeKey))
                        continue;

                    string requestDepartCode = ReadString(reader, "RequestDepart");
                    string departDisplay = ResolveDepartmentDisplayName(
                        requestDepartCode,
                        departmentDisplayCache);

                    if (allowedDepartments.Count > 0 &&
                        !allowedDepartments.Contains(NormalizeDepartmentKey(departDisplay)))
                    {
                        continue;
                    }

                    int durationMinutes = ResolveNappDurationMinutes(
                        requestId,
                        ReadString(reader, "Dauration"));

                    dynamic patient = GetPatientDetailsByCaseNumber(caseNumber);

                    var row = new NappWaitingRowDto
                    {
                        CaseNumber = caseNumber,
                        RequestID = requestId,
                        RequestDate = FormatDateValue(reader["RequestDate"]),
                        PatientFirstName = patient != null ? patient.PM_FIRST_NAME : null,
                        PatientLastName = patient != null ? patient.PM_LAST_NAME : null,
                        PatientId = patient != null ? patient.PM_PATIENT_ID : null,
                        RequestDepart = departDisplay,
                        SeodeDepart = ReadString(reader, "SeodeDepart"),
                        Department = departDisplay,
                        Urgency = ReadString(reader, "Urgency"),
                        SurgeryType = ReadString(reader, "SurgeryType"),
                        DurationMinutes = durationMinutes,
                        DrorDuration = durationMinutes,
                        WaitingDays = reader["WaitingDays"] == DBNull.Value
                            ? (int?)null
                            : Convert.ToInt32(reader["WaitingDays"]),
                        Procedures = getNappProceduresListByRequestID(requestId)
                    };

                    result.WaitingList.Add(row);
                }
            }
        }

        return result;
    }

    private HashSet<string> BuildScheduledCaseRequestKeys(string fullDate, string calendarRoomsArea)
    {
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // TODO: replace with your existing calendar load — same as GetSurgeriesBySurgeryRoomCode WebMethod.
        dynamic calendar = GetSurgeriesBySurgeryRoomCode(fullDate, calendarRoomsArea);
        if (calendar?.SurgeriesCalendarClassList == null)
            return keys;

        foreach (var surgery in calendar.SurgeriesCalendarClassList)
        {
            if (surgery == null || surgery.SurgeryStatus == "Canceled")
                continue;

            string caseNumber = "";
            if (surgery.SurgeryPatientDetails != null)
                caseNumber = (surgery.SurgeryPatientDetails.PM_CASE_NUMBER ?? "").Trim();

            string requestId = !string.IsNullOrWhiteSpace(surgery.RequestID)
                ? surgery.RequestID.Trim()
                : (surgery.SurgeryID ?? "").Trim();

            if (string.IsNullOrEmpty(requestId) &&
                surgery.SurgeryRequestDepartments != null &&
                !string.IsNullOrWhiteSpace(surgery.SurgeryRequestDepartments.SD_ROW_ID))
            {
                requestId = surgery.SurgeryRequestDepartments.SD_ROW_ID.Trim();
            }

            if (!string.IsNullOrEmpty(caseNumber) && !string.IsNullOrEmpty(requestId))
                keys.Add(caseNumber + "|" + requestId);
        }

        return keys;
    }

    private HashSet<string> ResolveDepartmentDisplayNames(string[] roomCodes)
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (roomCodes == null)
            return names;

        foreach (string code in roomCodes)
        {
            string trimmed = (code ?? "").Trim();
            if (string.IsNullOrEmpty(trimmed))
                continue;

            int dash = trimmed.IndexOf('-');
            if (dash >= 0 && dash < trimmed.Length - 1)
                names.Add(NormalizeDepartmentKey(trimmed.Substring(dash + 1)));
        }

        return names;
    }

    private string ResolveDepartmentDisplayName(
        string requestDepartCode,
        Dictionary<string, string> cache)
    {
        string code = (requestDepartCode ?? "").Trim();
        if (string.IsNullOrEmpty(code))
            return "";

        if (cache.TryGetValue(code, out string cached))
            return cached;

        // Optional: uncomment if you have this helper in SurgeriesCalendar.
        // var dept = getSurgeryRequestDepartmentsByCode(code);
        // if (dept != null && !string.IsNullOrWhiteSpace(dept.S_DEPARTMENT))
        // {
        //     string display = dept.S_DEPARTMENT.Trim();
        //     cache[code] = display;
        //     return display;
        // }

        string fromSql = LookupDepartmentDisplayNameFromSql(code);
        if (!string.IsNullOrWhiteSpace(fromSql))
        {
            cache[code] = fromSql;
            return fromSql;
        }

        // 3) Last resort: return code as-is.
        cache[code] = code;
        return code;
    }

    private string LookupDepartmentDisplayNameFromSql(string requestDepartCode)
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            // TODO: confirm table name — often SurgeryRequestDepartments / SURGERY_REQUEST_DEPARTMENTS.
            const string sql = @"
SELECT TOP 1 S_DEPARTMENT
FROM [NAMER].[dbo].[SurgeryRequestDepartments] WITH (NOLOCK)
WHERE LTRIM(RTRIM(S_DEPARTMENT_SHORT_DESC)) = LTRIM(RTRIM(@code))
   OR LTRIM(RTRIM(S_DEPARTMENT)) = LTRIM(RTRIM(@code))
   OR LTRIM(RTRIM(CAST(SD_ROW_ID AS nvarchar(50)))) = LTRIM(RTRIM(@code))";

            SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@code", requestDepartCode);
            conn.Open();

            object scalar = cmd.ExecuteScalar();
            if (scalar == null || scalar == DBNull.Value)
                return "";

            return scalar.ToString().Trim();
        }
    }

    private static string NormalizeDepartmentKey(string value)
    {
        return (value ?? "").Trim().Replace(" ", "");
    }

    private int ResolveNappDurationMinutes(string requestId, string daurationPadded)
    {
        int parsed;
        string trimmed = (daurationPadded ?? "").Trim();
        if (int.TryParse(trimmed, out parsed) && parsed > 0)
            return parsed;

        // NAPP sometimes stores padded values like "0090".
        if (trimmed.Length > 2 && int.TryParse(trimmed, out parsed) && parsed > 0)
            return parsed;

        return 60;
    }

    private static string FormatDateValue(object dbValue)
    {
        if (dbValue == null || dbValue == DBNull.Value)
            return null;

        DateTime dt;
        if (DateTime.TryParse(dbValue.ToString(), out dt))
            return dt.ToString("yyyy-MM-dd");

        return dbValue.ToString();
    }

    // -------------------------------------------------------------------------
    // TODO: replace method names below with your existing SurgeriesCalendar methods.
    // -------------------------------------------------------------------------

    private object GetPatientDetailsByCaseNumber(string caseNumber)
    {
        return getSurgeryCalendarPatientDetailsByCaseNumber(caseNumber);
    }

    private object GetSurgeriesBySurgeryRoomCode(string fullDate, string surRoomCode)
    {
        return getSurgeriesBySurgeryRoomCode(fullDate, surRoomCode);
    }
}
