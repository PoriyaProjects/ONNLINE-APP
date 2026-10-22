// =============================================================================
// MachineRtDashboardService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Real-time machine rooms dashboard (cath / gastro / angio).
// Copy to: App_Code/MachineRtDashboardService.cs
//
// Data source: dbo.SurgeriesRealTime (NAMER) — one row per SurgeryID.
// Room mapping:
//   cath-1  — \u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1  (e.g. \u05E4\u05D601-201)
//   cath-2  — \u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2  (e.g. \u05E4\u05D601-202)
//   gastro  — \u05D7\u05D3\u05E8 \u05D2\u05E1\u05D8\u05E8\u05D5
//   angio   — \u05D7\u05D3\u05E8 \u05D0\u05E0\u05D2\u05D9\u05D5
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Web.Script.Serialization;

public class MachineRoomRealtimeState
{
    public string roomCode { get; set; }
    public string roomLabel { get; set; }
    public string status { get; set; }
    public string lastUpdated { get; set; }
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
        public string SurgeryStatus;
        public DateTime? RoomEntry;
        public DateTime? RoomExit;
        public string MachineRoomCode;
    }

    private sealed class RoomAggregate
    {
        public string Code;
        public string Label;
        public bool HasActive;
        public string ActiveCaseNumber;
        public string ActiveSurgeryId;
        public int PlannedCount;
        public int CompletedCount;
        public DateTime? LastCompletedExit;
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
        DateTime targetDate = ParseDate(date);
        Dictionary<string, RoomAggregate> aggregates = BuildEmptyAggregates();
        List<SurgeryRealtimeRow> rows = LoadSurgeriesForDate(targetDate);

        for (int i = 0; i < rows.Count; i++)
        {
            ApplySurgeryToAggregate(aggregates, rows[i]);
        }

        MachineRoomsRealtimeResponse response = new MachineRoomsRealtimeResponse();
        response.date = targetDate.ToString("yyyy-MM-dd");
        response.rooms = BuildRoomStates(aggregates);
        return Json.Serialize(response);
    }

    public string GetMachineRoomRealtimeByCode(string date, string roomCode)
    {
        string normalizedCode = (roomCode ?? "").Trim().ToLowerInvariant();
        if (normalizedCode.Length == 0)
        {
            return "null";
        }

        DateTime targetDate = ParseDate(date);
        Dictionary<string, RoomAggregate> aggregates = BuildEmptyAggregates();
        List<SurgeryRealtimeRow> rows = LoadSurgeriesForDate(targetDate);

        for (int i = 0; i < rows.Count; i++)
        {
            if (rows[i].MachineRoomCode == normalizedCode)
            {
                ApplySurgeryToAggregate(aggregates, rows[i]);
            }
        }

        RoomAggregate aggregate;
        if (!aggregates.TryGetValue(normalizedCode, out aggregate))
        {
            return "null";
        }

        MachineRoomRealtimeState room = ToRoomState(aggregate);
        return Json.Serialize(room);
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
        MachineRoomRealtimeState room = new MachineRoomRealtimeState();
        room.roomCode = aggregate.Code;
        room.roomLabel = aggregate.Label;
        room.status = BuildStatusText(aggregate);
        room.lastUpdated = null;
        return room;
    }

    private static string BuildStatusText(RoomAggregate aggregate)
    {
        if (aggregate.HasActive)
        {
            if (!string.IsNullOrEmpty(aggregate.ActiveCaseNumber))
            {
                return S_InProgress + " — " + aggregate.ActiveCaseNumber;
            }

            return S_InProgress;
        }

        if (aggregate.PlannedCount > 0)
        {
            return S_Planned + " (" + aggregate.PlannedCount.ToString() + ")";
        }

        if (aggregate.CompletedCount > 0)
        {
            if (aggregate.LastCompletedExit.HasValue)
            {
                return S_Completed + " (" + aggregate.CompletedCount.ToString() + ") — "
                    + aggregate.LastCompletedExit.Value.ToString("HH:mm");
            }

            return S_Completed + " (" + aggregate.CompletedCount.ToString() + ")";
        }

        return S_Empty;
    }

    private static void ApplySurgeryToAggregate(Dictionary<string, RoomAggregate> aggregates, SurgeryRealtimeRow row)
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

        if (IsActiveSurgery(status, row.RoomEntry, row.RoomExit))
        {
            aggregate.HasActive = true;
            aggregate.ActiveCaseNumber = row.CaseNumber;
            aggregate.ActiveSurgeryId = row.SurgeryId;
            return;
        }

        if (IsPlannedStatus(status))
        {
            aggregate.PlannedCount += 1;
            return;
        }

        if (IsCompletedStatus(status))
        {
            aggregate.CompletedCount += 1;
            if (row.RoomExit.HasValue)
            {
                if (!aggregate.LastCompletedExit.HasValue || row.RoomExit.Value > aggregate.LastCompletedExit.Value)
                {
                    aggregate.LastCompletedExit = row.RoomExit;
                }
            }
        }
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
    s.SurgeryStatus,
    s.TimeEntranceToTheOperatingRoom AS RoomEntry,
    CASE
        WHEN s.TimeExitingTheOperatingRoom = CAST('00:00:00' AS time) THEN NULL
        ELSE s.TimeExitingTheOperatingRoom
    END AS RoomExit
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
                        row.SurgeryStatus = ReadString(reader, "SurgeryStatus");
                        row.RoomEntry = ReadDateTime(reader, "RoomEntry");
                        row.RoomExit = ReadDateTime(reader, "RoomExit");
                        row.MachineRoomCode = machineRoomCode;
                        rows.Add(row);
                    }
                }
            }
        }

        return rows;
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
