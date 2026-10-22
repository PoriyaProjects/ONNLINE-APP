// =============================================================================
// WebService-MachineRtDashboard-NEW-ONLY.cs — paste into WebService.cs (App_Code)
// =============================================================================
// ASMX does NOT honor C# default params on GET — resolve optional args from QueryString.
//
// PREREQUISITE: copy MachineRtDashboardService.cs into App_Code:
//   App_Code/MachineRtDashboardService.cs
//
// Field — add ONCE inside the WebService class (near other *_Service fields):
//
//   MachineRtDashboardService _MachineRtDashboardService = new MachineRtDashboardService();
//
// Angular client (machine-rt-dashboard.service.ts):
//   GET  {environment.url}GetMachineRoomsRealtimeByDate?date=YYYY-MM-DD
//   GET  {environment.url}GetMachineRoomRealtimeByCode?date=YYYY-MM-DD&roomCode=cath-1
//
// roomCode values: cath-1 | cath-2 | gastro | angio
// =============================================================================

// --- helpers (paste inside WebService class) ---

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
    if (bodyValue != null && bodyValue.Trim().Length > 0)
    {
        return bodyValue.Trim();
    }
    if (qsValue != null && qsValue.Trim().Length > 0)
    {
        return qsValue.Trim();
    }
    return "";
}

private string MachineRtResolveDate(string date)
{
    string resolved = MachineRtOr(date, MachineRtQs("date"));
    if (resolved.Length == 0)
    {
        resolved = MachineRtOr("", MachineRtQs("_date"));
    }
    if (resolved.Length == 0)
    {
        resolved = MachineRtOr("", MachineRtQs("_fullDate"));
    }
    return resolved;
}

private string MachineRtResolveRoomCode(string roomCode)
{
    string resolved = MachineRtOr(roomCode, MachineRtQs("roomCode"));
    if (resolved.Length == 0)
    {
        resolved = MachineRtOr("", MachineRtQs("_roomCode"));
    }
    return resolved.Trim().ToLowerInvariant();
}

private static bool MachineRtIsValidRoomCode(string roomCode)
{
    return roomCode == "cath-1"
        || roomCode == "cath-2"
        || roomCode == "gastro"
        || roomCode == "angio";
}

private string MachineRtErrorJson(string message, string date)
{
    string safeDate = (date ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
    string safeMessage = (message ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
    return "{\"date\":\"" + safeDate + "\",\"rooms\":[],\"error\":\"" + safeMessage + "\"}";
}

// --- Machine RT dashboard WebMethods ---

[WebMethod]
public string GetMachineRoomsRealtimeByDate(string date)
{
    string resolvedDate = MachineRtResolveDate(date);
    try
    {
        return _MachineRtDashboardService.GetMachineRoomsRealtimeByDate(resolvedDate);
    }
    catch (Exception ex)
    {
        return MachineRtErrorJson(ex.Message, resolvedDate);
    }
}

[WebMethod]
public string GetMachineRoomRealtimeByCode(string date, string roomCode)
{
    string resolvedDate = MachineRtResolveDate(date);
    string resolvedRoomCode = MachineRtResolveRoomCode(roomCode);

    if (resolvedRoomCode.Length == 0)
    {
        return "null";
    }

    if (!MachineRtIsValidRoomCode(resolvedRoomCode))
    {
        return "null";
    }

    try
    {
        return _MachineRtDashboardService.GetMachineRoomRealtimeByCode(resolvedDate, resolvedRoomCode);
    }
    catch (Exception)
    {
        return "null";
    }
}
