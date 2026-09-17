// =============================================================================
// MachineRtDashboardService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Stub service for real-time machine rooms dashboard (cath / gastro / angio).
// Copy to: App_Code/MachineRtDashboardService.cs
//
// Rooms:
//   cath-1  — \u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1
//   cath-2  — \u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2
//   gastro  — \u05D7\u05D3\u05E8 \u05D2\u05E1\u05D8\u05E8\u05D5
//   angio   — \u05D7\u05D3\u05E8 \u05D0\u05E0\u05D2\u05D9\u05D5
// =============================================================================

using System;
using System.Collections.Generic;
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
    private static readonly JavaScriptSerializer Json = CreateSerializer();

    private const string L_Cath1 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 1";
    private const string L_Cath2 = "\u05D7\u05D3\u05E8 \u05E6\u05D9\u05E0\u05EA\u05D5\u05E8\u05D9\u05DD 2";
    private const string L_Gastro = "\u05D7\u05D3\u05E8 \u05D2\u05E1\u05D8\u05E8\u05D5";
    private const string L_Angio = "\u05D7\u05D3\u05E8 \u05D0\u05E0\u05D2\u05D9\u05D5";
    private const string S_InDevelopment = "\u05E2\u05D3\u05D9\u05D9\u05DF \u05D1\u05E4\u05D9\u05EA\u05D5\u05D7";

    private static JavaScriptSerializer CreateSerializer()
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = int.MaxValue;
        return serializer;
    }

    public string GetMachineRoomsRealtimeByDate(string date)
    {
        string normalizedDate = NormalizeDate(date);
        MachineRoomsRealtimeResponse response = new MachineRoomsRealtimeResponse();
        response.date = normalizedDate;
        response.rooms = BuildAllRooms();
        return Json.Serialize(response);
    }

    public string GetMachineRoomRealtimeByCode(string date, string roomCode)
    {
        string normalizedDate = NormalizeDate(date);
        string normalizedCode = (roomCode ?? "").Trim().ToLowerInvariant();
        MachineRoomRealtimeState room = FindRoom(normalizedCode);

        if (room == null)
        {
            return "null";
        }

        MachineRoomRealtimeState copy = new MachineRoomRealtimeState();
        copy.roomCode = room.roomCode;
        copy.roomLabel = room.roomLabel;
        copy.status = room.status;
        copy.lastUpdated = room.lastUpdated;

        return Json.Serialize(copy);
    }

    private static string NormalizeDate(string date)
    {
        string value = (date ?? "").Trim();
        if (value.Length == 0)
        {
            return DateTime.Now.ToString("yyyy-MM-dd");
        }
        return value;
    }

    private static List<MachineRoomRealtimeState> BuildAllRooms()
    {
        List<MachineRoomRealtimeState> rooms = new List<MachineRoomRealtimeState>();
        rooms.Add(CreateRoom("cath-1", L_Cath1));
        rooms.Add(CreateRoom("cath-2", L_Cath2));
        rooms.Add(CreateRoom("gastro", L_Gastro));
        rooms.Add(CreateRoom("angio", L_Angio));
        return rooms;
    }

    private static MachineRoomRealtimeState CreateRoom(string code, string label)
    {
        MachineRoomRealtimeState room = new MachineRoomRealtimeState();
        room.roomCode = code;
        room.roomLabel = label;
        room.status = S_InDevelopment;
        room.lastUpdated = null;
        return room;
    }

    private static MachineRoomRealtimeState FindRoom(string roomCode)
    {
        List<MachineRoomRealtimeState> rooms = BuildAllRooms();
        for (int i = 0; i < rooms.Count; i++)
        {
            if (rooms[i].roomCode == roomCode)
            {
                return rooms[i];
            }
        }
        return null;
    }
}
