// =============================================================================
// Cath-Calendar.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Mock / implementation template for machines-calendar cath procedures backend.
// Modeled after surgery-calendar/mocks/docs/Surgeries-Calendar.cs with cath-specific
// rules: COMPLETED (SurgeriesRealTime + PCI) is separate from PLANNED (TBD).
//
// Copy to: App_Code/CathCalendarService.cs  (service class below)
// Then paste WebMethods from the bottom block into WebService.cs.
//
// Architecture:
//   Cath Calendar API
//        |
//   +----+----+
//   |         |
// COMPLETED  PLANNED (SQL not finalized — stub only)
//   |
// SurgeriesRealTime
//   |
// PCI (deduped by DOKNR)
//
// Business rules (critical):
//   - Primary key = SurgeryID (never dedupe by CaseNumber)
//   - Completed filter: SurgeryName = N'פעולת צנתור' AND SurgeryStatus = 'Completed'
//   - PCI is enrichment only; join via PCI_OneRow CTE (max 1 row per DOKNR)
//   - Do NOT use SurgeriesRealTime alone for future planned cath calendar
//   - Do NOT UNION completed + planned before RecordStatus is unified
//   - RoomType: פז* => PHYSICAL, ור* => VIRTUAL, else UNKNOWN
//   - 00:00:00 times => null (not midnight)
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

// --- DTOs --------------------------------------------------------------------

public class CathCalendarItem
{
    public string date { get; set; }
    public string caseNumber { get; set; }
    public string surgeryId { get; set; }
    public string room { get; set; }
    public string roomType { get; set; }
    public string surgeryType { get; set; }
    public string department { get; set; }
    public string status { get; set; }
    public string roomEntryTime { get; set; }
    public string cathStartTime { get; set; }
    public string cathEndTime { get; set; }
    public string roomExitTime { get; set; }
}

public class MachineRoomsCalendarDay
{
    public string ArrivalDate { get; set; }
    public string CalendarRoomsArea { get; set; }
    public int Physical { get; set; }
    public int Virtual { get; set; }
}

public class MachineAppointmentItem
{
    public string RoomCode { get; set; }
    public string ArrivalTime { get; set; }
    public string EndTime { get; set; }
    public string PatientName { get; set; }
    public string CaseNumber { get; set; }
    public string SurgeryId { get; set; }
    public string RecordStatus { get; set; }
}

public class MachinesCalendarPermissions
{
    public string UserDepartment { get; set; }
}

// --- Service -----------------------------------------------------------------

public class CathCalendarService
{
    private const string T_SurgeriesRealTime = "[dbo].[SurgeriesRealTime]";
    private const string T_PCI = "[dbo].[PCI]";

    // SurgeryName = פעולת צנתור
    private const string CathSurgeryName = "\u05E4\u05E2\u05D5\u05DC\u05EA \u05E6\u05E0\u05EA\u05D5\u05E8";
    private const string StatusCompleted = "Completed";
    private const string RecordStatusCompleted = "Completed";
    private const string RecordStatusPlanned = "Planned";

    private const string RoomTypePhysical = "PHYSICAL";
    private const string RoomTypeVirtual = "VIRTUAL";
    private const string RoomTypeUnknown = "UNKNOWN";

    private const string MachinesAreaLabel = "\u05DE\u05DB\u05D5\u05E0\u05D9\u05DD";

    private static string _connectionString;

    static CathCalendarService()
    {
        ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["ChameleonConnection"];
        if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
        {
            _connectionString = settings.ConnectionString;
        }
        else
        {
            _connectionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;Integrated Security=True";
        }
    }

    // -------------------------------------------------------------------------
    // Query 1 — GetCompletedCathProcedures
    // -------------------------------------------------------------------------
    public List<CathCalendarItem> GetCompletedCathProcedures(
        string fromDate,
        string toDate,
        string room,
        string status,
        string caseNumber,
        string surgeryId)
    {
        return QueryCompleted(BuildCompletedSql(false), delegate(SqlCommand cmd)
        {
            BindCompletedFilters(cmd, fromDate, toDate, room, status, caseNumber, surgeryId);
        });
    }

    // -------------------------------------------------------------------------
    // Query 2 — GetCompletedCathProceduresByDate
    // -------------------------------------------------------------------------
    public List<CathCalendarItem> GetCompletedCathProceduresByDate(string fromDate, string toDate)
    {
        return GetCompletedCathProcedures(fromDate, toDate, "", StatusCompleted, "", "");
    }

    // -------------------------------------------------------------------------
    // Query 3 — GetCompletedCathProceduresByRoom
    // -------------------------------------------------------------------------
    public List<CathCalendarItem> GetCompletedCathProceduresByRoom(string room, string fromDate, string toDate)
    {
        return GetCompletedCathProcedures(fromDate, toDate, room, StatusCompleted, "", "");
    }

    // -------------------------------------------------------------------------
    // Query 4 — GetCathProcedureBySurgeryId
    // -------------------------------------------------------------------------
    public CathCalendarItem GetCathProcedureBySurgeryId(string surgeryId)
    {
        string id = (surgeryId ?? "").Trim();
        if (id.Length == 0)
        {
            return null;
        }

        List<CathCalendarItem> rows = QueryCompleted(BuildCompletedSql(true), delegate(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue("@SurgeryID", id);
        });

        if (rows == null || rows.Count == 0)
        {
            return null;
        }

        return rows[0];
    }

    // -------------------------------------------------------------------------
    // Query 5 — GetPlannedCathProcedures
    // NOT FINAL — planning source for cath procedures is still TBD (SurgeriesCalendar / V_NLEM).
    // Do NOT query SurgeriesRealTime with SurgeryDate > GETDATE() as the sole planning source.
    // -------------------------------------------------------------------------
    public List<CathCalendarItem> GetPlannedCathProcedures(
        string fromDate,
        string toDate,
        string room,
        string caseNumber)
    {
        // Intentionally returns empty until planning source is confirmed.
        return new List<CathCalendarItem>();
    }

    // -------------------------------------------------------------------------
    // machines-calendar month summary (stub — aggregate from completed when wired)
    // -------------------------------------------------------------------------
    public List<MachineRoomsCalendarDay> GetMachineRooms(string month, string year)
    {
        return BuildPlaceholderMonthDays(ParseMonth(month), ParseYear(year));
    }

    public List<MachineRoomsCalendarDay> GetMachineRoomsByDate(string date)
    {
        DateTime day = ParseDate(date);
        MachineRoomsCalendarDay row = new MachineRoomsCalendarDay();
        row.ArrivalDate = day.ToString("yyyy-MM-dd");
        row.CalendarRoomsArea = MachinesAreaLabel;
        row.Physical = 0;
        row.Virtual = 0;
        List<MachineRoomsCalendarDay> list = new List<MachineRoomsCalendarDay>();
        list.Add(row);
        return list;
    }

    // -------------------------------------------------------------------------
    // machines-calendar day board — physical completed cath mapped to 4 rooms
    // roomCode: cath-1 | cath-2 | gastro | angio  (optional filter)
    // -------------------------------------------------------------------------
    public List<MachineAppointmentItem> GetMachineAppointmentsByDate(
        string fullDate,
        string roomType,
        string roomCode)
    {
        List<MachineAppointmentItem> result = new List<MachineAppointmentItem>();
        string normalizedType = (roomType ?? "").Trim().ToLowerInvariant();

        if (normalizedType == "virtual")
        {
            return result;
        }

        string date = ParseDate(fullDate).ToString("yyyy-MM-dd");
        List<CathCalendarItem> completed = GetCompletedCathProceduresByDate(date, date);
        string filterCode = (roomCode ?? "").Trim().ToLowerInvariant();

        for (int i = 0; i < completed.Count; i++)
        {
            CathCalendarItem item = completed[i];
            string mappedCode = MapRoomToMachineCode(item.room);
            if (filterCode.Length > 0 && mappedCode != filterCode)
            {
                continue;
            }

            MachineAppointmentItem appt = new MachineAppointmentItem();
            appt.RoomCode = mappedCode;
            appt.ArrivalTime = item.roomEntryTime;
            appt.EndTime = item.roomExitTime ?? item.cathEndTime;
            appt.PatientName = null;
            appt.CaseNumber = item.caseNumber;
            appt.SurgeryId = item.surgeryId;
            appt.RecordStatus = RecordStatusCompleted;
            result.Add(appt);
        }

        return result;
    }

    public MachinesCalendarPermissions GetMachinesCalendarUserNamePermissions(string userName)
    {
        MachinesCalendarPermissions permissions = new MachinesCalendarPermissions();
        permissions.UserDepartment = "All";
        return permissions;
    }

    // -------------------------------------------------------------------------
    // SQL
    // -------------------------------------------------------------------------

    private static string BuildCompletedSql(bool bySurgeryIdOnly)
    {
        string sql = @"
WITH PCI_OneRow AS
(
    SELECT *
    FROM
    (
        SELECT
            p.*,
            ROW_NUMBER() OVER
            (
                PARTITION BY p.DOKNR
                ORDER BY
                    p.SF_DATE DESC,
                    p.SF_ENDCUT DESC,
                    p.SF_EXROOM DESC
            ) AS rn
        FROM " + T_PCI + @" p WITH (NOLOCK)
    ) x
    WHERE rn = 1
)
SELECT
    CONVERT(varchar(10), s.SurgeryDate, 23) AS [date],

    CASE
        WHEN s.CaseNumber IS NOT NULL
             AND LTRIM(RTRIM(s.CaseNumber)) <> ''
             AND s.CaseNumber NOT IN ('0000000000', '00')
            THEN s.CaseNumber
        ELSE p.SF_CASE
    END AS [caseNumber],

    s.SurgeryID AS [surgeryId],

    COALESCE(
        NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''),
        CAST(p.RoomNumber AS varchar(50))
    ) AS [room],

    s.SurgeryName AS [surgeryType],
    s.DepartName AS [department],
    s.SurgeryStatus AS [status],

  CONVERT(varchar(8), s.TimeEntranceToTheOperatingRoom, 108) AS [roomEntryTime],

    CASE
        WHEN s.TimeCuttingTime = CAST('00:00:00' AS time) THEN NULL
        ELSE CONVERT(varchar(8), s.TimeCuttingTime, 108)
    END AS [cathStartTime],

    CASE
        WHEN s.TimeEndSurgery = CAST('00:00:00' AS time) THEN NULL
        ELSE CONVERT(varchar(8), s.TimeEndSurgery, 108)
    END AS [cathEndTime],

    CASE
        WHEN s.TimeExitingTheOperatingRoom = CAST('00:00:00' AS time) THEN NULL
        ELSE CONVERT(varchar(8), s.TimeExitingTheOperatingRoom, 108)
    END AS [roomExitTime]

FROM " + T_SurgeriesRealTime + @" s WITH (NOLOCK)
LEFT JOIN PCI_OneRow p
    ON p.DOKNR = s.SurgeryID
WHERE s.SurgeryName = @CathSurgeryName
  AND s.SurgeryStatus = @DefaultStatus";

        if (bySurgeryIdOnly)
        {
            sql += @"
  AND s.SurgeryID = @SurgeryID";
        }
        else
        {
            sql += @"
  AND (@FromDate IS NULL OR s.SurgeryDate >= @FromDate)
  AND (@ToDate IS NULL OR s.SurgeryDate < DATEADD(DAY, 1, @ToDate))
  AND (@Room = '' OR COALESCE(NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''), CAST(p.RoomNumber AS varchar(50))) = @Room)
  AND (@Status = '' OR s.SurgeryStatus = @Status)
  AND (@CaseNumber = '' OR
        CASE
            WHEN s.CaseNumber IS NOT NULL
                 AND LTRIM(RTRIM(s.CaseNumber)) <> ''
                 AND s.CaseNumber NOT IN ('0000000000', '00')
                THEN s.CaseNumber
            ELSE p.SF_CASE
        END = @CaseNumber)
  AND (@SurgeryID = '' OR s.SurgeryID = @SurgeryID)";
        }

        sql += @"
ORDER BY s.SurgeryDate, s.TimeEntranceToTheOperatingRoom, s.SurgeryID";

        return sql;
    }

    private static void BindCompletedFilters(
        SqlCommand cmd,
        string fromDate,
        string toDate,
        string room,
        string status,
        string caseNumber,
        string surgeryId)
    {
        cmd.Parameters.AddWithValue("@CathSurgeryName", CathSurgeryName);
        cmd.Parameters.AddWithValue("@DefaultStatus", StatusCompleted);
        cmd.Parameters.AddWithValue("@FromDate", ParseNullableDate(fromDate));
        cmd.Parameters.AddWithValue("@ToDate", ParseNullableDate(toDate));
        cmd.Parameters.AddWithValue("@Room", (room ?? "").Trim());
        cmd.Parameters.AddWithValue("@Status", string.IsNullOrEmpty(status) ? StatusCompleted : status.Trim());
        cmd.Parameters.AddWithValue("@CaseNumber", (caseNumber ?? "").Trim());
        cmd.Parameters.AddWithValue("@SurgeryID", (surgeryId ?? "").Trim());
    }

    private static List<CathCalendarItem> QueryCompleted(string sql, Action<SqlCommand> bind)
    {
        List<CathCalendarItem> rows = new List<CathCalendarItem>();

        using (SqlConnection conn = new SqlConnection(_connectionString))
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                bind(cmd);
                conn.Open();
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        CathCalendarItem item = new CathCalendarItem();
                        item.date = ReadString(reader, "date");
                        item.caseNumber = ReadString(reader, "caseNumber");
                        item.surgeryId = ReadString(reader, "surgeryId");
                        item.room = ReadString(reader, "room");
                        item.roomType = ResolveRoomType(item.room);
                        item.surgeryType = ReadString(reader, "surgeryType");
                        item.department = ReadString(reader, "department");
                        item.status = ReadString(reader, "status");
                        item.roomEntryTime = NormalizeTimeOutput(ReadString(reader, "roomEntryTime"));
                        item.cathStartTime = NormalizeTimeOutput(ReadString(reader, "cathStartTime"));
                        item.cathEndTime = NormalizeTimeOutput(ReadString(reader, "cathEndTime"));
                        item.roomExitTime = NormalizeTimeOutput(ReadString(reader, "roomExitTime"));
                        rows.Add(item);
                    }
                }
            }
        }

        return rows;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static string ResolveRoomType(string room)
    {
        string value = (room ?? "").Trim();
        if (value.Length == 0)
        {
            return RoomTypeUnknown;
        }

        if (value.IndexOf("\u05D5\u05E8", StringComparison.Ordinal) == 0)
        {
            return RoomTypeVirtual;
        }

        if (value.IndexOf("\u05E4\u05D6", StringComparison.Ordinal) == 0)
        {
            return RoomTypePhysical;
        }

        return RoomTypeUnknown;
    }

    private static string MapRoomToMachineCode(string room)
    {
        string value = (room ?? "").Trim();
        if (value.Length == 0)
        {
            return "unknown";
        }

        string lower = value.ToLowerInvariant();
        if (lower.Contains("201") || lower.Contains("cath-1") || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1"))
        {
            return "cath-1";
        }

        if (lower.Contains("202") || lower.Contains("cath-2") || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2"))
        {
            return "cath-2";
        }

        if (lower.Contains("gastro") || value.Contains("\u05D2\u05E1\u05D8\u05E8\u05D5"))
        {
            return "gastro";
        }

        if (lower.Contains("angio") || value.Contains("\u05D0\u05E0\u05D2\u05D9\u05D5"))
        {
            return "angio";
        }

        return "unknown";
    }

    private static string NormalizeTimeOutput(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        if (value == "00:00:00" || value == "00:00")
        {
            return null;
        }

        return value;
    }

    private static string ReadString(SqlDataReader reader, string column)
    {
        int ordinal = reader.GetOrdinal(column);
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        return Convert.ToString(reader.GetValue(ordinal));
    }

    private static object ParseNullableDate(string value)
    {
        DateTime parsed;
        if (DateTime.TryParse((value ?? "").Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
        {
            return parsed.Date;
        }

        return DBNull.Value;
    }

    private static DateTime ParseDate(string value)
    {
        DateTime parsed;
        if (DateTime.TryParse((value ?? "").Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
        {
            return parsed.Date;
        }

        return DateTime.Now.Date;
    }

    private static int ParseMonth(string month)
    {
        int parsed;
        if (int.TryParse((month ?? "").Trim(), out parsed) && parsed >= 1 && parsed <= 12)
        {
            return parsed;
        }

        return DateTime.Now.Month;
    }

    private static int ParseYear(string year)
    {
        int parsed;
        if (int.TryParse((year ?? "").Trim(), out parsed) && parsed > 1900)
        {
            return parsed;
        }

        return DateTime.Now.Year;
    }

    private static List<MachineRoomsCalendarDay> BuildPlaceholderMonthDays(int month, int year)
    {
        List<MachineRoomsCalendarDay> days = new List<MachineRoomsCalendarDay>();
        int daysInMonth = DateTime.DaysInMonth(year, month);

        for (int day = 1; day <= daysInMonth; day++)
        {
            MachineRoomsCalendarDay row = new MachineRoomsCalendarDay();
            row.ArrivalDate = new DateTime(year, month, day).ToString("yyyy-MM-dd");
            row.CalendarRoomsArea = MachinesAreaLabel;
            row.Physical = 0;
            row.Virtual = 0;
            days.Add(row);
        }

        return days;
    }
}

// =============================================================================
// WebService-CathCalendar-NEW-ONLY — paste into WebService.cs (App_Code)
// =============================================================================
// Field — add ONCE inside WebService class:
//
//   CathCalendarService _CathCalendarService = new CathCalendarService();
//
// Optional QueryString helper for GET optional params:
//
// private string CathQs(string key)
// {
//     if (Context != null && Context.Request != null && Context.Request.QueryString[key] != null)
//     {
//         return Context.Request.QueryString[key];
//     }
//     return "";
// }
//
// --- Completed cath calendar (spec queries 1-4) ---
//
// [WebMethod]
// public List<CathCalendarItem> GetCompletedCathProcedures(string fromDate, string toDate, string room, string status, string caseNumber, string surgeryId)
// {
//     return _CathCalendarService.GetCompletedCathProcedures(fromDate, toDate, room, status, caseNumber, surgeryId);
// }
//
// [WebMethod]
// public List<CathCalendarItem> GetCompletedCathProceduresByDate(string fromDate, string toDate)
// {
//     return _CathCalendarService.GetCompletedCathProceduresByDate(fromDate, toDate);
// }
//
// [WebMethod]
// public List<CathCalendarItem> GetCompletedCathProceduresByRoom(string room, string fromDate, string toDate)
// {
//     return _CathCalendarService.GetCompletedCathProceduresByRoom(room, fromDate, toDate);
// }
//
// [WebMethod]
// public CathCalendarItem GetCathProcedureBySurgeryId(string surgeryId)
// {
//     return _CathCalendarService.GetCathProcedureBySurgeryId(surgeryId);
// }
//
// --- Planned cath calendar (spec query 5 — SQL TBD) ---
//
// [WebMethod]
// public List<CathCalendarItem> GetPlannedCathProcedures(string fromDate, string toDate, string room, string caseNumber)
// {
//     return _CathCalendarService.GetPlannedCathProcedures(fromDate, toDate, room, caseNumber);
// }
//
// --- machines-calendar Angular routes ---
//
// [WebMethod]
// public List<MachineRoomsCalendarDay> GetMachineRooms(string _month, string _year)
// {
//     return _CathCalendarService.GetMachineRooms(_month, _year);
// }
//
// [WebMethod]
// public List<MachineRoomsCalendarDay> GetMachineRoomsByDate(string _date)
// {
//     return _CathCalendarService.GetMachineRoomsByDate(_date);
// }
//
// [WebMethod]
// public List<MachineAppointmentItem> GetMachineAppointmentsByDate(string _fullDate, string _roomType, string _roomCode)
// {
//     string resolvedRoomCode = _roomCode;
//     if (string.IsNullOrEmpty(resolvedRoomCode))
//     {
//         resolvedRoomCode = CathQs("roomCode");
//     }
//     return _CathCalendarService.GetMachineAppointmentsByDate(_fullDate, _roomType, resolvedRoomCode);
// }
//
// [WebMethod]
// public MachinesCalendarPermissions GetMachinesCalendarUserNamePermissions(string _userName)
// {
//     return _CathCalendarService.GetMachinesCalendarUserNamePermissions(_userName);
// }
// =============================================================================
