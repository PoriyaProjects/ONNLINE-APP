// =============================================================================
// WebService-MachineRtDashboard-NEW-ONLY.cs — paste into WebService.cs
// =============================================================================
// ASMX does NOT honor C# default params on GET — read optional args from QueryString.
//
// PREREQUISITE: copy MachineRtDashboardService.cs into App_Code.
//
// Field — add ONCE inside the WebService class (near other *_Service fields):
//
//   MachineRtDashboardService _MachineRtDashboardService = new MachineRtDashboardService();
//
// Angular routes:
//   GET  {environment.url}GetMachineRoomsRealtimeByDate?date=YYYY-MM-DD
//   GET  {environment.url}GetMachineRoomRealtimeByCode?date=YYYY-MM-DD&roomCode=cath-1
// =============================================================================

// --- helper (paste inside WebService class) ---

private string MachineRtQs(string key)
{
    if (Context != null && Context.Request != null && Context.Request.QueryString[key] != null)
    {
        return Context.Request.QueryString[key];
    }
    return "";
}

// --- Machine RT dashboard ---

[WebMethod]
public string GetMachineRoomsRealtimeByDate(string date)
{
    return _MachineRtDashboardService.GetMachineRoomsRealtimeByDate(date);
}

[WebMethod]
public string GetMachineRoomRealtimeByCode(string date, string roomCode)
{
    string resolvedRoomCode = roomCode;
    if (string.IsNullOrEmpty(resolvedRoomCode))
    {
        resolvedRoomCode = MachineRtQs("roomCode");
    }

    return _MachineRtDashboardService.GetMachineRoomRealtimeByCode(date, resolvedRoomCode);
}
