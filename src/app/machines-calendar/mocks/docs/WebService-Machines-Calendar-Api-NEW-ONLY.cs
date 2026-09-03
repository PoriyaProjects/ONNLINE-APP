// =============================================================================
// WebService-Machines-Calendar-Api-NEW-ONLY.cs — paste into WebService.cs
// =============================================================================
// PREREQUISITE: copy machines-calendar-api.server.cs service class into App_Code
//               as MachinesCalendarApiService.cs
//
// Field — add ONCE inside WebService class:
//
//   MachinesCalendarApiService _MachinesCalendarApiService = new MachinesCalendarApiService();
//
// Optional QueryString helper for GET optional params:
// =============================================================================

private string MachinesCalendarApiQs(string key)
{
    if (Context != null && Context.Request != null && Context.Request.QueryString[key] != null)
    {
        return Context.Request.QueryString[key];
    }
    return "";
}

// --- Completed cath calendar (spec queries 1-4) ---

[WebMethod]
public List<CathCalendarItem> GetCompletedCathProcedures(string fromDate, string toDate, string room, string status, string caseNumber, string surgeryId)
{
    return _MachinesCalendarApiService.GetCompletedCathProcedures(fromDate, toDate, room, status, caseNumber, surgeryId);
}

[WebMethod]
public List<CathCalendarItem> GetCompletedCathProceduresByDate(string fromDate, string toDate)
{
    return _MachinesCalendarApiService.GetCompletedCathProceduresByDate(fromDate, toDate);
}

[WebMethod]
public List<CathCalendarItem> GetCompletedCathProceduresByRoom(string room, string fromDate, string toDate)
{
    return _MachinesCalendarApiService.GetCompletedCathProceduresByRoom(room, fromDate, toDate);
}

[WebMethod]
public CathCalendarItem GetCathProcedureBySurgeryId(string surgeryId)
{
    return _MachinesCalendarApiService.GetCathProcedureBySurgeryId(surgeryId);
}

// --- Planned cath calendar (spec query 5 — SQL TBD) ---

[WebMethod]
public List<CathCalendarItem> GetPlannedCathProcedures(string fromDate, string toDate, string room, string caseNumber)
{
    return _MachinesCalendarApiService.GetPlannedCathProcedures(fromDate, toDate, room, caseNumber);
}

// --- machines-calendar Angular routes (machines-calendar-api.server.ts) ---

[WebMethod]
public List<MachineRoomsCalendarDay> GetMachineRooms(string _month, string _year)
{
    return _MachinesCalendarApiService.GetMachineRooms(_month, _year);
}

[WebMethod]
public List<MachineRoomsCalendarDay> GetMachineRoomsByDate(string _date)
{
    return _MachinesCalendarApiService.GetMachineRoomsByDate(_date);
}

[WebMethod]
public List<MachineAppointmentItem> GetMachineAppointmentsByDate(string _fullDate, string _roomType, string _roomCode)
{
    string resolvedRoomCode = _roomCode;
    if (string.IsNullOrEmpty(resolvedRoomCode))
    {
        resolvedRoomCode = MachinesCalendarApiQs("roomCode");
    }
    return _MachinesCalendarApiService.GetMachineAppointmentsByDate(_fullDate, _roomType, resolvedRoomCode);
}

[WebMethod]
public MachinesCalendarPermissions GetMachinesCalendarUserNamePermissions(string _userName)
{
    return _MachinesCalendarApiService.GetMachinesCalendarUserNamePermissions(_userName);
}
