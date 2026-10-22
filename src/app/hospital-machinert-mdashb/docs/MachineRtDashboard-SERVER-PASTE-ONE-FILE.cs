// =============================================================================
// Machine RT Dashboard — SERVER SINGLE PASTE FILE
// =============================================================================
//
// STEP 1 — Save this ENTIRE file as:
//   App_Code/MachineRtDashboardBundle.cs
//
// STEP 2 — Open App_Code/WebService.cs and paste ONLY the block marked
//   "WEBSERVICE PASTE BLOCK" at the bottom of this file:
//   - field _MachineRtDashboardService
//   - helpers + 2 WebMethods
//
// Connection: prefer WebService.connetionStringNAMER (see WEBSERVICE PASTE BLOCK).
// If only ChameleonConnection (Integrated Security) is used, SQL must allow the IIS
// app-pool machine account — otherwise login fails (PORIA\SRV-APPS-PROD$).
//
// Endpoints (GET):
//   GetMachineRoomsRealtimeByDate?date=yyyy-MM-dd
//   GetMachineRoomRealtimeByCode?date=yyyy-MM-dd&roomCode=cath-1
//
// Data:
//   cath-1 / cath-2  → PCI + SP_MR_PCI procedure description (same as GetPicDetailedDataCombined)
//   gastro / angio   → SurgeriesRealTime + PCI DocName
//   planned (all)    → SurgeriesCalendar
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Web.Script.Serialization;

#region DTOs

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
    public string error { get; set; }
}

#endregion

public class MachineRtDashboardService
{
    private const string T_SurgeriesRealTime = "[dbo].[SurgeriesRealTime]";
    private const string T_PCI = "[dbo].[PCI]";
    private const string T_SurgeriesCalendar = "[NAMER].[dbo].[SurgeriesCalendar]";
    private const string T_SurgeriesCalendarPatients = "[NAMER].[dbo].[SurgeriesCalendarPatients]";

    private const string L_Cath1 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1";
    private const string L_Cath2 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2";
    private const string L_Gastro = "\u05D7\u05D3\u05E8 \u05D2\u05E1\u05D8\u05E8\u05D5";
    private const string L_Angio = "\u05D7\u05D3\u05E8 \u05D0\u05E0\u05D2\u05D9\u05D5";

    private const string S_Empty = "\u05E4\u05E0\u05D5\u05D9";
    private const string S_InProgress = "\u05D1\u05EA\u05D4\u05DC\u05D9\u05DA";
    private const string S_Planned = "\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF";
    private const string S_Completed = "\u05D4\u05D5\u05E9\u05DC\u05DD";
    private const string F_Cardiology = "DepartName LIKE N'%\u05E7\u05E8\u05D3\u05D9\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4%'";

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
    }

    private sealed class RoomAggregate
    {
        public string Code;
        public string Label;
        public MachineRoomProcedureItem InProgress;
        public List<MachineRoomProcedureItem> Completed;
        public List<MachineRoomProcedureItem> Planned;
        public HashSet<string> SeenKeys;

        public RoomAggregate()
        {
            Completed = new List<MachineRoomProcedureItem>();
            Planned = new List<MachineRoomProcedureItem>();
            SeenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    static MachineRtDashboardService()
    {
        _connectionString = ResolveDefaultConnectionString();
    }

    /// <summary>
    /// Call from WebService (same string as GetPicDetailedDataCombined / connetionStringNAMER).
    /// </summary>
    public void UseConnectionString(string connectionString)
    {
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            _connectionString = connectionString.Trim();
        }
    }

    private static string ResolveDefaultConnectionString()
    {
        string[] names = new string[] { "ChameleonConnection", "ConnectionString", "NAMERConnection" };
        for (int i = 0; i < names.Length; i++)
        {
            ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings[names[i]];
            if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
            {
                return settings.ConnectionString;
            }
        }

        return "Data Source=SRV-APPDB;Initial Catalog=NAMER;Integrated Security=True";
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

        LoadPciCathForDate(targetDate, aggregates);
        LoadPciGastroAngioForDate(targetDate, aggregates);

        List<SurgeryRealtimeRow> realtimeRows = LoadNonCathSurgeriesForDate(targetDate);
        for (int i = 0; i < realtimeRows.Count; i++)
        {
            ApplyRow(aggregates, realtimeRows[i], false);
        }

        List<SurgeryRealtimeRow> plannedRows = LoadPlannedSurgeriesForDate(targetDate);
        for (int i = 0; i < plannedRows.Count; i++)
        {
            ApplyRow(aggregates, plannedRows[i], true);
        }

        MachineRoomsRealtimeResponse response = new MachineRoomsRealtimeResponse();
        response.date = targetDate.ToString("yyyy-MM-dd");
        response.rooms = BuildRoomStates(aggregates);
        response.error = null;
        return response;
    }

    private static void LoadPciCathForDate(DateTime targetDate, Dictionary<string, RoomAggregate> aggregates)
    {
        Dictionary<string, string> descByCase = LoadProcedureDescByCase(targetDate);
        string sql =
            "SELECT " +
            "    p.SF_CASE AS CaseNumber, " +
            "    CAST(p.RoomNumber AS varchar(10)) AS SurgeryRoom, " +
            "    p.SF_TEROOM AS RoomEntry, " +
            "    p.SF_ENDCUT AS ProcedureEnd, " +
            "    p.SF_EXROOM AS RoomExit, " +
            "    p.DocName AS SurgeonName, " +
            "    s.SurgeryID AS SurgeryID " +
            "FROM " + T_PCI + " p WITH (NOLOCK) " +
            "LEFT JOIN " + T_SurgeriesRealTime + " s WITH (NOLOCK) " +
            "    ON p.SF_CASE = s.CaseNumber AND s.SurgeryDate = p.SF_DATE " +
            "WHERE p.SF_DATE = @TargetDate " +
            "  AND (s.DepartName IS NULL OR " + F_Cardiology + ") " +
            "ORDER BY p.SF_TEROOM, p.SF_CASE";

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
                        string caseNumber = ReadString(reader, "CaseNumber");
                        string roomNumber = ReadString(reader, "SurgeryRoom");
                        string machineCode = MapCathRoomNumber(roomNumber);
                        if (machineCode == null)
                        {
                            continue;
                        }

                        RoomAggregate aggregate = aggregates[machineCode];
                        string dedupeKey = caseNumber + "|" + machineCode;
                        if (aggregate.SeenKeys.Contains(dedupeKey))
                        {
                            continue;
                        }

                        aggregate.SeenKeys.Add(dedupeKey);

                        DateTime? roomEntry = ReadDateTime(reader, "RoomEntry");
                        DateTime? roomExit = ReadDateTime(reader, "RoomExit");
                        DateTime? procEnd = ReadDateTime(reader, "ProcedureEnd");

                        SurgeryRealtimeRow row = new SurgeryRealtimeRow();
                        row.SurgeryId = ReadString(reader, "SurgeryID");
                        row.CaseNumber = caseNumber;
                        row.SurgeryRoom = roomNumber;
                        row.SurgeonName = ReadString(reader, "SurgeonName");
                        row.SurgeryName = descByCase.ContainsKey(caseNumber) ? descByCase[caseNumber] : "";
                        row.Department = null;
                        row.RoomEntry = roomEntry;
                        row.ProcedureStart = roomEntry;
                        row.ProcedureEnd = procEnd;
                        row.RoomExit = roomExit;
                        row.MachineRoomCode = machineCode;
                        row.SurgeryStatus = ResolvePciStatus(roomEntry, roomExit, procEnd);

                        ApplyRow(aggregates, row, false);
                    }
                }
            }
        }
    }

    private static string ResolvePciStatus(DateTime? roomEntry, DateTime? roomExit, DateTime? procEnd)
    {
        if (HasMeaningfulTime(roomExit) || HasMeaningfulTime(procEnd))
        {
            return "Completed";
        }

        if (HasMeaningfulTime(roomEntry))
        {
            return "InProgress";
        }

        return "Planned";
    }

    private static bool HasMeaningfulTime(DateTime? value)
    {
        if (!value.HasValue)
        {
            return false;
        }

        return value.Value.TimeOfDay.TotalSeconds > 0;
    }

    private static Dictionary<string, string> LoadProcedureDescByCase(DateTime targetDate)
    {
        Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        using (SqlConnection conn = new SqlConnection(_connectionString))
        {
            conn.Open();
            using (SqlCommand cmd = new SqlCommand("SP_MR_PCI", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add("@FromDate", SqlDbType.Date).Value = targetDate.Date;
                cmd.Parameters.Add("@ToDate", SqlDbType.Date).Value = targetDate.Date;

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        if (reader.IsDBNull(0) || reader.IsDBNull(3))
                        {
                            continue;
                        }

                        string caseNumber = reader.GetString(0);
                        string desc = reader.GetString(3);
                        if (!map.ContainsKey(caseNumber))
                        {
                            map.Add(caseNumber, desc);
                        }
                    }
                }
            }
        }

        return map;
    }

    private static string MapCathRoomNumber(string roomNumber)
    {
        string n = (roomNumber ?? "").Trim();
        if (n == "1")
        {
            return "cath-1";
        }

        if (n == "2")
        {
            return "cath-2";
        }

        return null;
    }

    private static string MapPciGastroAngioRoomNumber(string roomNumber)
    {
        string n = (roomNumber ?? "").Trim();
        if (n == "3" || n == "03")
        {
            return "gastro";
        }

        if (n == "4" || n == "04")
        {
            return "angio";
        }

        return null;
    }

    private static void LoadPciGastroAngioForDate(DateTime targetDate, Dictionary<string, RoomAggregate> aggregates)
    {
        Dictionary<string, string> descByCase = LoadProcedureDescByCase(targetDate);
        string sql =
            "SELECT " +
            "    p.SF_CASE AS CaseNumber, " +
            "    CAST(p.RoomNumber AS varchar(10)) AS SurgeryRoom, " +
            "    p.SF_TEROOM AS RoomEntry, " +
            "    p.SF_ENDCUT AS ProcedureEnd, " +
            "    p.SF_EXROOM AS RoomExit, " +
            "    p.DocName AS SurgeonName, " +
            "    s.SurgeryID AS SurgeryID " +
            "FROM " + T_PCI + " p WITH (NOLOCK) " +
            "LEFT JOIN " + T_SurgeriesRealTime + " s WITH (NOLOCK) " +
            "    ON p.SF_CASE = s.CaseNumber AND s.SurgeryDate = p.SF_DATE " +
            "WHERE p.SF_DATE = @TargetDate " +
            "  AND CAST(p.RoomNumber AS varchar(10)) IN ('3', '4', '03', '04') " +
            "ORDER BY p.SF_TEROOM, p.SF_CASE";

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
                        string caseNumber = ReadString(reader, "CaseNumber");
                        string roomNumber = ReadString(reader, "SurgeryRoom");
                        string machineCode = MapPciGastroAngioRoomNumber(roomNumber);
                        if (machineCode == null)
                        {
                            continue;
                        }

                        RoomAggregate aggregate = aggregates[machineCode];
                        string dedupeKey = caseNumber + "|" + machineCode;
                        if (aggregate.SeenKeys.Contains(dedupeKey))
                        {
                            continue;
                        }

                        aggregate.SeenKeys.Add(dedupeKey);

                        DateTime? roomEntry = ReadDateTime(reader, "RoomEntry");
                        DateTime? roomExit = ReadDateTime(reader, "RoomExit");
                        DateTime? procEnd = ReadDateTime(reader, "ProcedureEnd");

                        SurgeryRealtimeRow row = new SurgeryRealtimeRow();
                        row.SurgeryId = ReadString(reader, "SurgeryID");
                        row.CaseNumber = caseNumber;
                        row.SurgeryRoom = roomNumber;
                        row.SurgeonName = ReadString(reader, "SurgeonName");
                        row.SurgeryName = descByCase.ContainsKey(caseNumber) ? descByCase[caseNumber] : "";
                        row.Department = null;
                        row.RoomEntry = roomEntry;
                        row.ProcedureStart = roomEntry;
                        row.ProcedureEnd = procEnd;
                        row.RoomExit = roomExit;
                        row.MachineRoomCode = machineCode;
                        row.SurgeryStatus = ResolvePciStatus(roomEntry, roomExit, procEnd);

                        ApplyRow(aggregates, row, false);
                    }
                }
            }
        }
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

        if (aggregate.Completed.Count > 0)
        {
            MachineRoomProcedureItem last = aggregate.Completed[0];
            if (!string.IsNullOrEmpty(last.roomExitTime))
            {
                return S_Completed + " (" + aggregate.Completed.Count.ToString() + ") \u2014 " + last.roomExitTime;
            }

            return S_Completed + " (" + aggregate.Completed.Count.ToString() + ")";
        }

        if (aggregate.Planned.Count > 0)
        {
            return S_Planned + " (" + aggregate.Planned.Count.ToString() + ")";
        }

        return S_Empty;
    }

    private static void ApplyRow(Dictionary<string, RoomAggregate> aggregates, SurgeryRealtimeRow row, bool isPlannedRow)
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

        string status = (row.SurgeryStatus ?? "").Trim();
        bool plannedBucket = isPlannedRow || IsPlannedStatus(status);
        string dedupeKey = (row.CaseNumber ?? "") + "|" + row.MachineRoomCode + "|" + (plannedBucket ? "P" : "A");
        if (!string.IsNullOrEmpty(row.CaseNumber) && aggregate.SeenKeys.Contains(dedupeKey))
        {
            return;
        }

        if (!string.IsNullOrEmpty(row.CaseNumber))
        {
            aggregate.SeenKeys.Add(dedupeKey);
        }

        MachineRoomProcedureItem item = ToProcedureItem(row);

        if (!plannedBucket && IsActiveSurgery(status, row.RoomEntry, row.RoomExit))
        {
            if (aggregate.InProgress == null || IsLater(row.RoomEntry, aggregate.InProgress.roomEntryTime))
            {
                aggregate.InProgress = item;
            }

            return;
        }

        if (IsPlannedStatus(status) || isPlannedRow)
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

        return candidate.Value.TimeOfDay > existing.TimeOfDay;
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

        if (HasMeaningfulTime(roomEntry) && !HasMeaningfulTime(roomExit))
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

    private static List<SurgeryRealtimeRow> LoadNonCathSurgeriesForDate(DateTime targetDate)
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
                ORDER BY p.SF_DATE DESC, p.SF_ENDCUT DESC, p.SF_EXROOM DESC
            ) AS rn
        FROM " + T_PCI + @" p WITH (NOLOCK)
    ) x
    WHERE rn = 1
),
Calendar_OneRow AS
(
    SELECT *
    FROM
    (
        SELECT
            b.SurgeryID,
            b.ArrivalTime,
            b.EndTime,
            ROW_NUMBER() OVER (PARTITION BY b.SurgeryID ORDER BY b.ArrivalTime, b.Row_ID) AS rn
        FROM " + T_SurgeriesCalendar + @" b WITH (NOLOCK)
        WHERE b.ArrivalDate >= @TargetDate
          AND b.ArrivalDate < DATEADD(DAY, 1, @TargetDate)
    ) c
    WHERE c.rn = 1
)
SELECT
    s.SurgeryID,
    CASE
        WHEN s.CaseNumber IS NOT NULL AND LTRIM(RTRIM(s.CaseNumber)) <> ''
             AND s.CaseNumber NOT IN ('0000000000', '00') THEN s.CaseNumber
        ELSE p.SF_CASE
    END AS CaseNumber,
    COALESCE(NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''), CAST(p.RoomNumber AS varchar(50))) AS SurgeryRoom,
    s.SurgeryName,
    s.DepartName AS Department,
    NULLIF(LTRIM(RTRIM(p.DocName)), '') AS SurgeonName,
    s.SurgeryStatus,
    s.TimeEntranceToTheOperatingRoom AS RoomEntry,
    CASE WHEN s.TimeCuttingTime = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeCuttingTime END AS ProcedureStart,
    CASE WHEN s.TimeEndSurgery = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeEndSurgery END AS ProcedureEnd,
    CASE WHEN s.TimeExitingTheOperatingRoom = CAST('00:00:00' AS time) THEN NULL ELSE s.TimeExitingTheOperatingRoom END AS RoomExit,
    cal.ArrivalTime AS PlannedStart,
    cal.EndTime AS PlannedEnd
FROM " + T_SurgeriesRealTime + @" s WITH (NOLOCK)
LEFT JOIN PCI_OneRow p ON p.DOKNR = s.SurgeryID
LEFT JOIN Calendar_OneRow cal ON cal.SurgeryID = s.SurgeryID
WHERE s.SurgeryDate >= @TargetDate
  AND s.SurgeryDate < DATEADD(DAY, 1, @TargetDate)
  AND (
      COALESCE(NULLIF(LTRIM(RTRIM(s.SurgeryRoom)), ''), CAST(p.RoomNumber AS varchar(50)), '') <> ''
      OR s.SurgeryName LIKE N'%" + "\u05D2\u05E1\u05D8\u05E8" + @"%'
      OR s.DepartName LIKE N'%" + "\u05D2\u05E1\u05D8\u05E8" + @"%'
      OR s.SurgeryName LIKE N'%" + "\u05D0\u05E0\u05D3\u05D5\u05E1\u05E7\u05D5\u05E4" + @"%'
      OR s.SurgeryName LIKE N'%" + "\u05E7\u05D5\u05DC\u05D5\u05E0\u05D5\u05E1\u05E7\u05D5\u05E4" + @"%'
      OR s.SurgeryName LIKE N'%" + "\u05D0\u05E0\u05D2\u05D9\u05D5" + @"%'
      OR s.DepartName LIKE N'%" + "\u05D0\u05E0\u05D2\u05D9\u05D5" + @"%'
  )";

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
                        string surgeryName = ReadString(reader, "SurgeryName");
                        string department = ReadString(reader, "Department");
                        string machineRoomCode = MapRoomToMachineCode(surgeryRoom, surgeryName, department);
                        if (machineRoomCode != "gastro" && machineRoomCode != "angio")
                        {
                            continue;
                        }

                        rows.Add(ReadSurgeryRow(reader, machineRoomCode, ResolveDisplaySurgeryRoom(surgeryRoom, department)));
                    }
                }
            }
        }

        return rows;
    }

    private static List<SurgeryRealtimeRow> LoadPlannedSurgeriesForDate(DateTime targetDate)
    {
        List<SurgeryRealtimeRow> rows = new List<SurgeryRealtimeRow>();

        string sql = @"
WITH PCI_OneRow AS
(
    SELECT *
    FROM
    (
        SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.DOKNR ORDER BY p.SF_DATE DESC) AS rn
        FROM " + T_PCI + @" p WITH (NOLOCK)
    ) x
    WHERE rn = 1
)
SELECT
    b.SurgeryID,
    ISNULL(pat.PM_CASE_NUMBER, '') AS CaseNumber,
    b.SurgeryRoomDetails AS SurgeryRoom,
    ISNULL(b.RequestedDepartmentDetails, '') AS Department,
    NULLIF(LTRIM(RTRIM(pci.DocName)), '') AS SurgeonName,
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
LEFT JOIN PCI_OneRow pci WITH (NOLOCK) ON pci.DOKNR = b.SurgeryID
WHERE b.ArrivalDate >= @TargetDate
  AND b.ArrivalDate < DATEADD(DAY, 1, @TargetDate)
  AND b.SurgeryStatus = 'Planned'
  AND (
      (ISNULL(b.SurgeryRoomDetails, N'') <> N'' AND b.SurgeryRoomDetails NOT LIKE N'%" + "\u05D5\u05E8" + @"%')
      OR ISNULL(b.RequestedDepartmentDetails, N'') LIKE N'%" + "\u05D2\u05E1\u05D8\u05E8" + @"%'
      OR ISNULL(b.SurgeryType, N'') LIKE N'%" + "\u05D2\u05E1\u05D8\u05E8" + @"%'
      OR ISNULL(b.RequestedDepartmentDetails, N'') LIKE N'%" + "\u05D0\u05E0\u05D2\u05D9\u05D5" + @"%'
      OR ISNULL(b.SurgeryType, N'') LIKE N'%" + "\u05D0\u05E0\u05D2\u05D9\u05D5" + @"%'
  )";

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
                        string surgeryName = ReadString(reader, "SurgeryName");
                        string department = ReadString(reader, "Department");
                        string machineRoomCode = MapRoomToMachineCode(surgeryRoom, surgeryName, department);
                        if (machineRoomCode == "unknown")
                        {
                            continue;
                        }

                        rows.Add(ReadSurgeryRow(reader, machineRoomCode, ResolveDisplaySurgeryRoom(surgeryRoom, department)));
                    }
                }
            }
        }

        return rows;
    }

    private static SurgeryRealtimeRow ReadSurgeryRow(SqlDataReader reader, string machineRoomCode, string surgeryRoom)
    {
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
        return row;
    }

    private static string ResolveDisplaySurgeryRoom(string surgeryRoom, string department)
    {
        string room = (surgeryRoom ?? "").Trim();
        if (room.Length > 0)
        {
            return room;
        }

        string dept = (department ?? "").Trim();
        return dept.Length > 0 ? dept : null;
    }

    private static string MapRoomToMachineCode(string room, string surgeryName = null, string department = null)
    {
        string value = (room ?? "").Trim();
        if (value.Length > 0)
        {
            string lower = value.ToLowerInvariant();

            if (lower == "1" || lower.Contains("201") || lower.Contains("cath-1") || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1"))
            {
                return "cath-1";
            }

            if (lower == "2" || lower.Contains("202") || lower.Contains("cath-2") || value.Contains("\u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2"))
            {
                return "cath-2";
            }

            if (lower == "3" || lower == "03" || lower.Contains("gastro") || value.Contains("\u05D2\u05E1\u05D8\u05E8\u05D5")
                || value.Contains("\u05DE\u05DB\u05D5\u05DF \u05D2\u05E1\u05D8\u05E8") || lower.Contains("-301") || lower.Contains("-401"))
            {
                return "gastro";
            }

            if (lower == "4" || lower == "04" || lower.Contains("angio") || value.Contains("\u05D0\u05E0\u05D2\u05D9\u05D5")
                || lower.Contains("-302") || lower.Contains("-402") || lower.Contains("-403"))
            {
                return "angio";
            }
        }

        string fromName = MapMachineCodeFromSurgeryName(surgeryName);
        if (fromName != null)
        {
            return fromName;
        }

        string fromDept = MapMachineCodeFromDepartment(department);
        if (fromDept != null)
        {
            return fromDept;
        }

        return "unknown";
    }

    private static string MapMachineCodeFromDepartment(string department)
    {
        string value = (department ?? "").Trim();
        if (value.Length == 0)
        {
            return null;
        }

        if (value.Contains("\u05D0\u05E0\u05D2\u05D9\u05D5") || value.Contains("\u05D5\u05E1\u05E7\u05D5\u05DC\u05E8"))
        {
            return "angio";
        }

        if (value.Contains("\u05D2\u05E1\u05D8\u05E8") || value.Contains("\u05D2\u05E1\u05D8\u05E8\u05D5\u05D0\u05E0\u05D8\u05E8\u05D5\u05DC\u05D5\u05D2"))
        {
            return "gastro";
        }

        return null;
    }

    private static string MapMachineCodeFromSurgeryName(string surgeryName)
    {
        string value = (surgeryName ?? "").Trim();
        if (value.Length == 0)
        {
            return null;
        }

        string lower = value.ToLowerInvariant();
        if (value.Contains("\u05D0\u05E0\u05D2\u05D9\u05D5") || lower.Contains("angio") || value.Contains("\u05E2\u05D5\u05E8\u05E7\u05D9\u05DD"))
        {
            return "angio";
        }

        if (value.Contains("\u05D2\u05E1\u05D8\u05E8") || lower.Contains("gastro") || value.Contains("\u05D0\u05E0\u05D3\u05D5\u05E1\u05E7\u05D5\u05E4")
            || value.Contains("\u05E7\u05D5\u05DC\u05D5\u05E0\u05D5\u05E1\u05E7\u05D5\u05E4") || value.Contains("\u05D2\u05E1\u05D8\u05E8\u05D5\u05D0\u05E0\u05D8\u05E8\u05D5\u05DC\u05D5\u05D2"))
        {
            return "gastro";
        }

        return null;
    }

    private static string FormatTime(DateTime? value)
    {
        if (!HasMeaningfulTime(value))
        {
            return null;
        }

        return value.Value.ToString("HH:mm");
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

// =============================================================================
// WEBSERVICE PASTE BLOCK — copy lines below into class WebService { ... }
// (Do NOT save this block as a separate file.)
// =============================================================================
/*
    private MachineRtDashboardService _MachineRtDashboardService;

    private MachineRtDashboardService MachineRtDashboard
    {
        get
        {
            if (_MachineRtDashboardService == null)
            {
                _MachineRtDashboardService = new MachineRtDashboardService();
                // Same SQL login as the rest of WebService (required on PROD when ChameleonConnection is Windows auth):
                if (!string.IsNullOrEmpty(connetionStringNAMER))
                {
                    _MachineRtDashboardService.UseConnectionString(connetionStringNAMER);
                }
            }

            return _MachineRtDashboardService;
        }
    }

    private string MachineRtQs(string key)
    {
        if (Context != null && Context.Request != null && Context.Request.QueryString[key] != null)
        {
            return Context.Request.QueryString[key];
        }
        return "";
    }

    private static string MachineRtOr(string bodyValue, string qsValue)
    {
        if (bodyValue != null && bodyValue.Trim().Length > 0) return bodyValue.Trim();
        if (qsValue != null && qsValue.Trim().Length > 0) return qsValue.Trim();
        return "";
    }

    private string MachineRtResolveDate(string date)
    {
        string resolved = MachineRtOr(date, MachineRtQs("date"));
        if (resolved.Length == 0) resolved = MachineRtOr("", MachineRtQs("_date"));
        if (resolved.Length == 0) resolved = MachineRtOr("", MachineRtQs("_fullDate"));
        return resolved;
    }

    private string MachineRtResolveRoomCode(string roomCode)
    {
        string resolved = MachineRtOr(roomCode, MachineRtQs("roomCode"));
        if (resolved.Length == 0) resolved = MachineRtOr("", MachineRtQs("_roomCode"));
        return resolved.Trim().ToLowerInvariant();
    }

    private static bool MachineRtIsValidRoomCode(string roomCode)
    {
        return roomCode == "cath-1" || roomCode == "cath-2" || roomCode == "gastro" || roomCode == "angio";
    }

    private string MachineRtErrorJson(string message, string date)
    {
        string safeDate = (date ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        string safeMessage = (message ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        return "{\"date\":\"" + safeDate + "\",\"rooms\":[],\"error\":\"" + safeMessage + "\"}";
    }

    [WebMethod]
    [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
    public string GetMachineRoomsRealtimeByDate(string date)
    {
        string resolvedDate = MachineRtResolveDate(date);
        try
        {
            return MachineRtDashboard.GetMachineRoomsRealtimeByDate(resolvedDate);
        }
        catch (Exception ex)
        {
            return MachineRtErrorJson(ex.Message, resolvedDate);
        }
    }

    [WebMethod]
    [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
    public string GetMachineRoomRealtimeByCode(string date, string roomCode)
    {
        string resolvedDate = MachineRtResolveDate(date);
        string resolvedRoomCode = MachineRtResolveRoomCode(roomCode);
        if (resolvedRoomCode.Length == 0 || !MachineRtIsValidRoomCode(resolvedRoomCode))
        {
            return "null";
        }

        try
        {
            return MachineRtDashboard.GetMachineRoomRealtimeByCode(resolvedDate, resolvedRoomCode);
        }
        catch (Exception)
        {
            return "null";
        }
    }
*/
