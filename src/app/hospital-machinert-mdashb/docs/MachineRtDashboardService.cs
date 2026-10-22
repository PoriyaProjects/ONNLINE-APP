// =============================================================================
// MachineRtDashboardService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Web.Script.Serialization;

public class MachineRoomProcedureItem
{
    public string surgeryId { get; set; }
    public string caseNumber { get; set; }
    public string surgeryName { get; set; }
    public string department { get; set; }
    public string surgeonName { get; set; }
    public string status { get; set; }
    public string surgeryRoom { get; set; }
    public string roomEntryTime { get; set; }
    public string procedureStartTime { get; set; }
    public string procedureEndTime { get; set; }
    public string roomExitTime { get; set; }
    public string plannedStartTime { get; set; }
    public string plannedEndTime { get; set; }
}

public class MachineRoomRealtimeState
{
    public string roomCode { get; set; }
    public string roomLabel { get; set; }
    public string status { get; set; }
    public string lastUpdated { get; set; }
    public int completedCount { get; set; }
    public int plannedCount { get; set; }
    public MachineRoomProcedureItem inProgress { get; set; }
    public List<MachineRoomProcedureItem> completedToday { get; set; }
    public List<MachineRoomProcedureItem> plannedToday { get; set; }
}

public class MachineRoomsRealtimeResponse
{
    public string date { get; set; }
    public List<MachineRoomRealtimeState> rooms { get; set; }
}

public class MachineRtDashboardService
{
    private const string T_SurgeriesRealTime = "[dbo].[SurgeriesRealTime]";
    private const string T_PCI = "[dbo].[PCI]";
    private const string T_SurgeriesCalendar = "[NAMER].[dbo].[SurgeriesCalendar]";
    private const string T_SurgeriesCalendarPatients = "[NAMER].[dbo].[SurgeriesCalendarPatients]";
    private const string T_NamerUsers = "[NAMER].[dbo].[NAMER_USERS]";

    private const string L_Cath1 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1";
    private const string L_Cath2 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2";
    private const string L_Gastro = "\u05D7\u05D3\u05E8 \u05D2\u05E1\u05D8\u05E8\u05D5";
    private const string L_Angio = "\u05D7\u05D3\u05E8 \u05D0\u05E0\u05D2\u05D9\u05D5";

    private const string S_Empty = "\u05E4\u05E0\u05D5\u05D9";
    private const string S_InProgress = "\u05D1\u05EA\u05D4\u05DC\u05D9\u05DA";
    private const string S_Planned = "\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF";
    private const string S_Completed = "\u05D4\u05D5\u05E9\u05DC\u05DD";

    private static readonly JavaScriptSerializer Json = CreateSerializer();
    private static string _connectionString;

    private sealed class MachineRoomDefinition
    {
        public string Code;
        public string Label;
    }

    private sealed class SurgeryRealtimeRow
    {
        public string SurgeryId;
        public string CaseNumber;
        public string SurgeryRoom;
        public string SurgeryName;
        public string Department;
        public string SurgeonName;
        public string SurgeryStatus;
        public DateTime? RoomEntry;
        public DateTime? RoomExit;
        public DateTime? ProcedureStart;
        public DateTime? ProcedureEnd;
        public DateTime? PlannedStart;
        public DateTime? PlannedEnd;
        public string MachineRoomCode;
        public bool FromCalendar;
    }

    private sealed class RoomAggregate
    {
        public string Code;
        public string Label;
        public MachineRoomProcedureItem InProgress;
        public List<MachineRoomProcedureItem> Completed;
        public List<MachineRoomProcedureItem> Planned;
        public HashSet<string> SeenSurgeryIds;

        public RoomAggregate()
        {
            Completed = new List<MachineRoomProcedureItem>();
            Planned = new List<MachineRoomProcedureItem>();
            SeenSurgeryIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    static MachineRtDashboardService()
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

    private static JavaScriptSerializer CreateSerializer()
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = int.MaxValue;
        return serializer;
    }

    public string GetMachineRoomsRealtimeByDate(string date)
    {
        MachineRoomsRealtimeResponse response = BuildResponse(date);
        return Json.Serialize(response);
    }

    public string GetMachineRoomRealtimeByCode(string date, string roomCode)
    {
        string normalizedCode = (roomCode ?? "").Trim().ToLowerInvariant();
        if (normalizedCode.Length == 0)
        {
            return "null";
        }

        MachineRoomsRealtimeResponse response = BuildResponse(date);
        for (int i = 0; i < response.rooms.Count; i++)
        {
            if (response.rooms[i].roomCode == normalizedCode)
            {
                return Json.Serialize(response.rooms[i]);
            }
        }

        return "null";
    }

    private static MachineRoomsRealtimeResponse BuildResponse(string date)
    {
        DateTime targetDate = ParseDate(date);
        Dictionary<string, RoomAggregate> aggregates = BuildEmptyAggregates();

        List<SurgeryRealtimeRow> realtimeRows = LoadSurgeriesForDate(targetDate);
        for (int i = 0; i < realtimeRows.Count; i++)
        {
            ApplyRow(aggregates, realtimeRows[i]);
        }

        List<SurgeryRealtimeRow> plannedRows = LoadPlannedSurgeriesForDate(targetDate);
        for (int i = 0; i < plannedRows.Count; i++)
        {
            ApplyRow(aggregates, plannedRows[i]);
        }

        MachineRoomsRealtimeResponse response = new MachineRoomsRealtimeResponse();
        response.date = targetDate.ToString("yyyy-MM-dd");
        response.rooms = BuildRoomStates(aggregates);
        return response;
    }

    private static List<MachineRoomRealtimeState> BuildRoomStates(Dictionary<string, RoomAggregate> aggregates)
    {
        List<MachineRoomDefinition> definitions = GetRoomDefinitions();
        List<MachineRoomRealtimeState> rooms = new List<MachineRoomRealtimeState>();
        string updatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        for (int i = 0; i < definitions.Count; i++)
        {
            MachineRoomDefinition definition = definitions[i];
            RoomAggregate aggregate = aggregates[definition.Code];
            MachineRoomRealtimeState room = ToRoomState(aggregate);
            room.lastUpdated = updatedAt;
            rooms.Add(room);
        }

        return rooms;
    }

    private static MachineRoomRealtimeState ToRoomState(RoomAggregate aggregate)
    {
        SortCompleted(aggregate.Completed);
        SortPlanned(aggregate.Planned);

        MachineRoomRealtimeState room = new MachineRoomRealtimeState();
        room.roomCode = aggregate.Code;
        room.roomLabel = aggregate.Label;
        room.inProgress = aggregate.InProgress;
        room.completedToday = aggregate.Completed;
        room.plannedToday = aggregate.Planned;
        room.completedCount = aggregate.Completed.Count;
        room.plannedCount = aggregate.Planned.Count;
        room.status = BuildStatusText(aggregate);
        room.lastUpdated = null;
        return room;
    }

    private static string BuildStatusText(RoomAggregate aggregate)
    {
        if (aggregate.InProgress != null)
        {
            if (!string.IsNullOrEmpty(aggregate.InProgress.caseNumber))
            {
                return S_InProgress + " \u2014 " + aggregate.InProgress.caseNumber;
            }

            return S_InProgress;
        }

        if (aggregate.Planned.Count > 0)
        {
            return S_Planned + " (" + aggregate.Planned.Count.ToString() + ")";
        }

        if (aggregate.Completed.Count > 0)
        {
            MachineRoomProcedureItem last = aggregate.Completed[0];
            if (!string.IsNullOrEmpty(last.roomExitTime))
            {
                return S_Completed + " (" + aggregate.Completed.Count.ToString() + ") \u2014 " + last.roomExitTime;
            }

            return S_Completed + " (" + aggregate.Completed.Count.ToString() + ")";
        }

        return S_Empty;
    }

    private static void ApplyRow(Dictionary<string, RoomAggregate> aggregates, SurgeryRealtimeRow row)
    {
        if (row == null || string.IsNullOrEmpty(row.MachineRoomCode))
        {
            return;
        }

        RoomAggregate aggregate;
        if (!aggregates.TryGetValue(row.MachineRoomCode, out aggregate))
        {
            return;
        }

        if (!string.IsNullOrEmpty(row.SurgeryId) && aggregate.SeenSurgeryIds.Contains(row.SurgeryId))
        {
            return;
        }

        if (!string.IsNullOrEmpty(row.SurgeryId))
        {
            aggregate.SeenSurgeryIds.Add(row.SurgeryId);
        }

        MachineRoomProcedureItem item = ToProcedureItem(row);
        string status = (row.SurgeryStatus ?? "").Trim();

        if (IsActiveSurgery(status, row.RoomEntry, row.RoomExit))
        {
            if (aggregate.InProgress == null || IsLater(row.RoomEntry, aggregate.InProgress.roomEntryTime))
            {
                aggregate.InProgress = item;
            }
            return;
        }

        if (IsPlannedStatus(status))
        {
            aggregate.Planned.Add(item);
            return;
        }

        if (IsCompletedStatus(status))
        {
            aggregate.Completed.Add(item);
        }
    }

    private static bool IsLater(DateTime? candidate, string existingTimeText)
    {
        if (!candidate.HasValue)
        {
            return false;
        }

        if (string.IsNullOrEmpty(existingTimeText))
        {
            return true;
        }

        DateTime existing;
        if (!DateTime.TryParse(existingTimeText, out existing))
        {
            return true;
        }

        return candidate.Value > existing;
    }

    private static MachineRoomProcedureItem ToProcedureItem(SurgeryRealtimeRow row)
    {
        MachineRoomProcedureItem item = new MachineRoomProcedureItem();
        item.surgeryId = row.SurgeryId;
        item.caseNumber = row.CaseNumber;
        item.surgeryName = row.SurgeryName;
        item.department = row.Department;
        item.surgeonName = row.SurgeonName;
        item.status = row.SurgeryStatus;
        item.surgeryRoom = row.SurgeryRoom;
        item.roomEntryTime = FormatTime(row.RoomEntry);
        item.procedureStartTime = FormatTime(row.ProcedureStart);
        item.procedureEndTime = FormatTime(row.ProcedureEnd);
        item.roomExitTime = FormatTime(row.RoomExit);
        item.plannedStartTime = FormatTime(row.PlannedStart);
        item.plannedEndTime = FormatTime(row.PlannedEnd);
        return item;
    }

    private static void SortCompleted(List<MachineRoomProcedureItem> items)
    {
        items.Sort(delegate(MachineRoomProcedureItem a, MachineRoomProcedureItem b)
        {
            return string.Compare(b.roomExitTime, a.roomExitTime, StringComparison.Ordinal);
        });
    }

    private static void SortPlanned(List<MachineRoomProcedureItem> items)
    {
        items.Sort(delegate(MachineRoomProcedureItem a, MachineRoomProcedureItem b)
        {
            return string.Compare(a.plannedStartTime, b.plannedStartTime, StringComparison.Ordinal);
        });
    }

    private static bool IsActiveSurgery(string status, DateTime? roomEntry, DateTime? roomExit)
    {
        if (string.Equals(status, "InProgress", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (IsCompletedStatus(status) || IsCanceledStatus(status))
        {
            return false;
        }

        if (roomEntry.HasValue && !roomExit.HasValue)
        {
            return true;
        }

        return false;
    }

    private static bool IsPlannedStatus(string status)
    {
        return string.Equals(status, "Planned", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsCompletedStatus(string status)
    {
        return string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsCanceledStatus(string status)
    {
        return string.Equals(status, "Canceled", StringComparison.OrdinalIgnoreCase)
            || string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, RoomAggregate> BuildEmptyAggregates()
    {
        Dictionary<string, RoomAggregate> map = new Dictionary<string, RoomAggregate>();
        List<MachineRoomDefinition> definitions = GetRoomDefinitions();

        for (int i = 0; i < definitions.Count; i++)
        {
            MachineRoomDefinition definition = definitions[i];
            RoomAggregate aggregate = new RoomAggregate();
            aggregate.Code = definition.Code;
            aggregate.Label = definition.Label;
            map[definition.Code] = aggregate;
        }

        return map;
    }

    private static List<MachineRoomDefinition> GetRoomDefinitions()
    {
        List<MachineRoomDefinition> list = new List<MachineRoomDefinition>();
        list.Add(CreateDefinition("cath-1", L_Cath1));
        list.Add(CreateDefinition("cath-2", L_Cath2));
        list.Add(CreateDefinition("gastro", L_Gastro));
        list.Add(CreateDefinition("angio", L_Angio));
        return list;
    }

    private static MachineRoomDefinition CreateDefinition(string code, string label)
    {
        MachineRoomDefinition definition = new MachineRoomDefinition();
        definition.Code = code;
        definition.Label = label;
        return definition;
    }

    private static List<SurgeryRealtimeRow> LoadSurgeriesForDate(DateTime targetDate)
    {
        List<SurgeryRealtimeRow> rows = new List<SurgeryRealtimeRow>();

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
    s.SurgeryID,
    CASE
        WHEN s.CaseNumber IS NOT NULL
             AND LTRIM(RTRIM(s.CaseNumber)) <> ''
             AND s.CaseNumber NOT IN ('0000000000', '00')
            THEN s.CaseNumber
        ELSE p.SF_CASE
    END AS CaseNumber,
    COALESCE(
        NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''),
        CAST(p.RoomNumber AS varchar(50))
    ) AS SurgeryRoom,
    s.SurgeryName,
    s.DepartName AS Department,
    COALESCE(NULLIF(LTRIM(RTRIM(p.DocName)), ''), NULLIF(LTRIM(RTRIM(s.SurgeonDoctor)), '')) AS SurgeonName,
    s.SurgeryStatus,
    s.TimeEntranceToTheOperatingRoom AS RoomEntry,
    CASE WHEN s.TimeCuttingTime = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeCuttingTime END AS ProcedureStart,
    CASE WHEN s.TimeEndSurgery = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeEndSurgery END AS ProcedureEnd,
    CASE WHEN s.TimeExitingTheOperatingRoom = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeExitingTheOperatingRoom END AS RoomExit,
    CAST(NULL AS time) AS PlannedStart,
    CAST(NULL AS time) AS PlannedEnd
FROM " + T_SurgeriesRealTime + @" s WITH (NOLOCK)
LEFT JOIN PCI_OneRow p
    ON p.DOKNR = s.SurgeryID
WHERE s.SurgeryDate >= @TargetDate
  AND s.SurgeryDate < DATEADD(DAY, 1, @TargetDate)
  AND COALESCE(
        NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''),
        CAST(p.RoomNumber AS varchar(50)),
        ''
      ) <> ''";

        ReadSurgeryRows(sql, targetDate, rows, false);
        return rows;
    }

    private static List<SurgeryRealtimeRow> LoadPlannedSurgeriesForDate(DateTime targetDate)
    {
        List<SurgeryRealtimeRow> rows = new List<SurgeryRealtimeRow>();

        string sql = @"
SELECT
    b.SurgeryID,
    ISNULL(pat.PM_CASE_NUMBER, '') AS CaseNumber,
    b.SurgeryRoomDetails AS SurgeryRoom,
    ISNULL(b.RequestedDepartmentDetails, '') AS Department,
    CASE
        WHEN CONCAT(nu.UserFirstName, ' ', nu.UserLastName) = '' THEN b.SurgeonDoctor
        ELSE CONCAT(nu.UserFirstName, ' ', nu.UserLastName)
    END AS SurgeonName,
    b.SurgeryStatus,
    CAST(NULL AS datetime) AS RoomEntry,
    CAST(NULL AS datetime) AS ProcedureStart,
    CAST(NULL AS datetime) AS ProcedureEnd,
    CAST(NULL AS datetime) AS RoomExit,
    b.ArrivalTime AS PlannedStart,
    b.EndTime AS PlannedEnd,
    ISNULL(b.SurgeryType, '') AS SurgeryName
FROM " + T_SurgeriesCalendar + @" b WITH (NOLOCK)
LEFT JOIN " + T_SurgeriesCalendarPatients + @" pat WITH (NOLOCK)
    ON pat.SurgeriesCalendarIDFK = b.Row_ID
LEFT JOIN " + T_NamerUsers + @" nu WITH (NOLOCK)
    ON b.SurgeonDoctor = nu.VMA
   AND nu.StatusDescription = N'\u05DC\u05D0 \u05E0\u05E2\u05D5\u05DC'
   AND nu.VMA <> ''
WHERE b.ArrivalDate >= @TargetDate
  AND b.ArrivalDate < DATEADD(DAY, 1, @TargetDate)
  AND ISNULL(b.SurgeryRoomDetails, N'') <> N''
  AND b.SurgeryRoomDetails NOT LIKE N'%\u05D5\u05E8%'
  AND b.SurgeryStatus = 'Planned'";

        ReadSurgeryRows(sql, targetDate, rows, true);
        return rows;
    }

    private static void ReadSurgeryRows(string sql, DateTime targetDate, List<SurgeryRealtimeRow> rows, bool fromCalendar)
    {
        using (SqlConnection conn = new SqlConnection(_connectionString))
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.Parameters.Add("@TargetDate", SqlDbType.Date).Value = targetDate.Date;
                conn.Open();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string surgeryRoom = ReadString(reader, "SurgeryRoom");
                        string machineRoomCode = MapRoomToMachineCode(surgeryRoom);
                        if (machineRoomCode == "unknown")
                        {
                            continue;
                        }

                        SurgeryRealtimeRow row = new SurgeryRealtimeRow();
                        row.SurgeryId = ReadString(reader, "SurgeryID");
                        row.CaseNumber = ReadString(reader, "CaseNumber");
                        row.SurgeryRoom = surgeryRoom;
                        row.SurgeryName = ReadString(reader, "SurgeryName");
                        row.Department = ReadString(reader, "Department");
                        row.SurgeonName = ReadString(reader, "SurgeonName");
                        row.SurgeryStatus = ReadString(reader, "SurgeryStatus");
                        row.RoomEntry = ReadDateTime(reader, "RoomEntry");
                        row.ProcedureStart = ReadDateTime(reader, "ProcedureStart");
                        row.ProcedureEnd = ReadDateTime(reader, "ProcedureEnd");
                        row.RoomExit = ReadDateTime(reader, "RoomExit");
                        row.PlannedStart = ReadDateTime(reader, "PlannedStart");
                        row.PlannedEnd = ReadDateTime(reader, "PlannedEnd");
                        row.MachineRoomCode = machineRoomCode;
                        row.FromCalendar = fromCalendar;
                        rows.Add(row);
                    }
                }
            }
        }
    }

    private static string MapRoomToMachineCode(string room)
    {
        string value = (room ?? "").Trim();
        if (value.Length == 0)
        {
            return "unknown";
        }

        string lower = value.ToLowerInvariant();

        if (lower.Contains("201")
            || lower.Contains("cath-1")
            || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1"))
        {
            return "cath-1";
        }

        if (lower.Contains("202")
            || lower.Contains("cath-2")
            || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2"))
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

    private static string FormatTime(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.ToString("HH:mm:ss");
    }

    private static DateTime ParseDate(string date)
    {
        DateTime parsed;
        if (DateTime.TryParse((date ?? "").Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
        {
            return parsed.Date;
        }

        return DateTime.Now.Date;
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

    private static DateTime? ReadDateTime(SqlDataReader reader, string column)
    {
        int ordinal = reader.GetOrdinal(column);
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        object value = reader.GetValue(ordinal);
        if (value is DateTime)
        {
            return (DateTime)value;
        }

        if (value is TimeSpan)
        {
            DateTime today = DateTime.Today;
            TimeSpan time = (TimeSpan)value;
            return today.Add(time);
        }

        DateTime parsed;
        if (DateTime.TryParse(Convert.ToString(value), out parsed))
        {
            return parsed;
        }

        return null;
    }
}
