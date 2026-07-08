# Backend: `GetNappWaitingForVirtualRoomScheduling`

Angular calls this when the user clicks **"המלצות מהמתנה"** on a virtual room board.

**Error today:** `Unknown web method GetNappWaitingForVirtualRoomScheduling` — add the WebMethod below next to `getNappProceduresListByRequestID` (which is already deployed).

---

## Request

```
POST WebService.asmx/GetNappWaitingForVirtualRoomScheduling
Content-Type: application/json
```

```json
{
  "_fullDate": "2026-07-08",
  "_calendarRoomsArea": "וירטואלי כללי",
  "_roomGroupDesc": "וירטואלי כללי",
  "_roomCodes": ["ור01-אורתופדיה", "ור01-כירורגיה"]
}
```

| Parameter | Notes |
|-----------|--------|
| `_fullDate` | `yyyy-MM-dd` |
| `_calendarRoomsArea` | Same as `_surRoomCode` in `GetSurgeriesBySurgeryRoomCode` |
| `_roomGroupDesc` | Virtual group label |
| `_roomCodes` | Board columns; department suffix after `-` is used for filtering (e.g. `אורתופדיה`) |

---

## Response

```json
{
  "d": {
    "WaitingList": [
      {
        "CaseNumber": "0031234567",
        "RequestID": "0000123456",
        "RequestDate": "2026-06-01",
        "PatientFirstName": "ישראל",
        "PatientLastName": "ישראלי",
        "PatientId": "0001234567",
        "RequestDepart": "אורתופדיה",
        "SeodeDepart": "מר-ילו",
        "Department": "אורתופדיה",
        "Urgency": "ללא עדיפות",
        "SurgeryType": "אלקטיבי",
        "DurationMinutes": 90,
        "DrorDuration": 90,
        "WaitingDays": 37,
        "Procedures": [
          {
            "SurgeryCode": "12345",
            "SurgeryName": "החלפת מפרק ירך",
            "Surgery_Code": "12345",
            "Surgery_Name": "החלפת מפרק ירך",
            "Catalog": "CPT",
            "Side": "ימין",
            "Priority": "",
            "Depart": "",
            "SeodeDepart": "",
            "BloodUnit": ""
          }
        ]
      }
    ]
  }
}
```

`RequestDepart` / `Department` must be the **display name** (`S_DEPARTMENT`, e.g. `אורתופדיה`) — not the SAP code (`מר-ילו`). Angular matches room columns by that Hebrew name.

---

## Already deployed — `getNappProceduresListByRequestID`

Use the **fixed** version in `BACKEND_PROMPT_getNappProceduresListByRequestID.md` (Canceled filter, null-safe reader, trimmed RequestID/S_ID join).

WebService wrapper:

```csharp
[WebGet]
[WebMethod]
[OperationContract]
public List<SurgeriesCalendar.NappProcedureDto> getNappProceduresListByRequestID(string _RequestID)
{
    return _SurgeriesCalendar.getNappProceduresListByRequestID(_RequestID);
}
```

Repository SQL (NAPP → NAPP_NPCPCode → SERVICES_NAME via trimmed `S_ID`):

```sql
SELECT DISTINCT npc.NPCPCode, sn.S_SERVICE_VAL, sn.S_CATALOG, npc.Side, ...
FROM [NAMER].[dbo].[NAPP] n
INNER JOIN [NAMER].[dbo].[NAPP_NPCPCode] npc ON n.VKGID = npc.VKGID
LEFT JOIN [NAMER].[dbo].[SERVICES_NAME] sn
    ON LTRIM(RTRIM(npc.NPCPCode)) = LTRIM(RTRIM(sn.S_ID))
WHERE LTRIM(RTRIM(n.RequestID)) = LTRIM(RTRIM(@RequestID))
  AND (n.Canceled IS NULL OR n.Canceled <> 'X')
  AND n.VKGID IS NOT NULL
```

---

## 1. DTOs — add to `SurgeriesCalendar` class

```csharp
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
```

---

## 2. WebService — add next to `getNappProceduresListByRequestID`

```csharp
[WebGet]
[WebMethod]
[OperationContract]
public SurgeriesCalendar.NappWaitingForVirtualRoomResult GetNappWaitingForVirtualRoomScheduling(
    string _fullDate,
    string _calendarRoomsArea,
    string _roomGroupDesc,
    string[] _roomCodes)
{
    return _SurgeriesCalendar.GetNappWaitingForVirtualRoomScheduling(
        _fullDate ?? "",
        _calendarRoomsArea ?? "",
        _roomGroupDesc ?? "",
        _roomCodes ?? new string[0]);
}
```

> Method name must be exactly `GetNappWaitingForVirtualRoomScheduling` (matches Angular URL).

---

## 3. Repository — add to `SurgeriesCalendar` class

```csharp
public NappWaitingForVirtualRoomResult GetNappWaitingForVirtualRoomScheduling(
    string fullDate,
    string calendarRoomsArea,
    string roomGroupDesc,
    string[] roomCodes)
{
    var result = new NappWaitingForVirtualRoomResult();
    var scheduledKeys = BuildScheduledCaseRequestKeys(fullDate, calendarRoomsArea);
    var allowedDepartments = ResolveDepartmentDisplayNames(roomCodes, calendarRoomsArea, roomGroupDesc);

    using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
    {
        string sql = @"
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
                string caseNumber = (reader["CaseNumber"] ?? "").ToString().Trim();
                string requestId = (reader["RequestID"] ?? "").ToString().Trim();
                if (string.IsNullOrEmpty(caseNumber) || string.IsNullOrEmpty(requestId))
                    continue;

                string compositeKey = caseNumber + "|" + requestId;
                if (scheduledKeys.Contains(compositeKey))
                    continue;

                string requestDepartCode = (reader["RequestDepart"] ?? "").ToString().Trim();
                string departDisplay = ResolveDepartmentDisplayName(requestDepartCode);

                if (allowedDepartments.Count > 0 &&
                    !allowedDepartments.Contains(NormalizeDepartmentKey(departDisplay)))
                {
                    continue;
                }

                int durationMinutes = ResolveNappDurationMinutes(
                    requestId,
                    (reader["Dauration"] ?? "").ToString().Trim());

                var patient = GetPatientDetailsByCaseNumber(caseNumber); // reuse existing helper

                var row = new NappWaitingRowDto
                {
                    CaseNumber = caseNumber,
                    RequestID = requestId,
                    RequestDate = FormatDateValue(reader["RequestDate"]),
                    PatientFirstName = patient != null ? patient.PM_FIRST_NAME : null,
                    PatientLastName = patient != null ? patient.PM_LAST_NAME : null,
                    PatientId = patient != null ? patient.PM_PATIENT_ID : null,
                    RequestDepart = departDisplay,
                    SeodeDepart = (reader["SeodeDepart"] ?? "").ToString().Trim(),
                    Department = departDisplay,
                    Urgency = (reader["Urgency"] ?? "").ToString().Trim(),
                    SurgeryType = (reader["SurgeryType"] ?? "").ToString().Trim(),
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

    // Reuse the same load path as GetSurgeriesBySurgeryRoomCode for this date + area.
    var calendar = getSurgeriesBySurgeryRoomCode(fullDate, calendarRoomsArea);
    if (calendar?.SurgeriesCalendarClassList == null)
        return keys;

    foreach (var surgery in calendar.SurgeriesCalendarClassList)
    {
        if (surgery == null || surgery.SurgeryStatus == "Canceled")
            continue;

        var patient = getSurgeryPatientDetailsByRowID(surgery.Row_ID);
        string caseNumber = patient != null ? (patient.PM_CASE_NUMBER ?? "").Trim() : "";
        string requestId = !string.IsNullOrWhiteSpace(surgery.RequestID)
            ? surgery.RequestID.Trim()
            : (surgery.SurgeryID ?? "").Trim();

        if (!string.IsNullOrEmpty(caseNumber) && !string.IsNullOrEmpty(requestId))
            keys.Add(caseNumber + "|" + requestId);
    }

    return keys;
}

private HashSet<string> ResolveDepartmentDisplayNames(
    string[] roomCodes,
    string calendarRoomsArea,
    string roomGroupDesc)
{
    var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    if (roomCodes != null)
    {
        foreach (string code in roomCodes)
        {
            string trimmed = (code ?? "").Trim();
            if (string.IsNullOrEmpty(trimmed))
                continue;

            int dash = trimmed.IndexOf('-');
            if (dash >= 0 && dash < trimmed.Length - 1)
            {
                names.Add(NormalizeDepartmentKey(trimmed.Substring(dash + 1)));
            }
        }
    }

    return names;
}

private string ResolveDepartmentDisplayName(string requestDepartCode)
{
    if (string.IsNullOrWhiteSpace(requestDepartCode))
        return "";

    // Reuse your existing helper — same as calendar surgeries use for SurgeryRequestDepartments.
    var dept = getSurgeryRequestDepartmentsByCode(requestDepartCode);
    if (dept != null && !string.IsNullOrWhiteSpace(dept.S_DEPARTMENT))
        return dept.S_DEPARTMENT.Trim();

    return requestDepartCode.Trim();
}

private string NormalizeDepartmentKey(string value)
{
    return (value ?? "").Trim().Replace(" ", "");
}

private int ResolveNappDurationMinutes(string requestId, string daurationPadded)
{
    // Optional: reuse AvgTimeForSurgeriesCodes if you already have it per request/procedure.
    int parsed;
    if (int.TryParse((daurationPadded ?? "").Trim(), out parsed) && parsed > 0)
        return parsed;

    var procedures = getNappProceduresListByRequestID(requestId);
    if (procedures != null && procedures.Count > 0)
    {
        // Fallback: existing avg-duration helper by procedure codes, if available.
    }

    return 60;
}

private string FormatDateValue(object dbValue)
{
    if (dbValue == null || dbValue == DBNull.Value)
        return null;

    DateTime dt;
    if (DateTime.TryParse(dbValue.ToString(), out dt))
        return dt.ToString("yyyy-MM-dd");

    return dbValue.ToString();
}
```

### Adjust to your codebase

| Placeholder | Replace with |
|-------------|--------------|
| `getSurgeriesBySurgeryRoomCode` | Your existing method name / return type |
| `getSurgeryPatientDetailsByRowID` | Existing patient lookup |
| `getSurgeryRequestDepartmentsByCode` | Existing department lookup → `S_DEPARTMENT` |
| `GetPatientDetailsByCaseNumber` | Patient lookup by `CaseNumber`, or drop if unavailable |
| `RequestStatus = 20` | Confirm waiting statuses with SAP |
| `surgery.RequestID` | Use when `SurgeriesCalendar.RequestID` column exists; else `SurgeryID` |

---

## Business rules

1. **Read-only** — no writes to `SurgeriesCalendar`.
2. **Active NAPP only:** `(Canceled IS NULL OR Canceled <> 'X')`.
3. **Dedup:** skip when `CaseNumber|RequestID` already on the calendar that day in the same `CalendarRoomsArea`.
4. **Elective filter** is done in Angular (`דחוף`, `ססיה` excluded on client).
5. **Procedures:** `getNappProceduresListByRequestID` per row. Rows with `VKGID IS NULL` return empty `Procedures` (INNER JOIN in your SQL).
6. **Duration:** parse `NAPP.Dauration` padded string (`"0090"` → 90); default 60.

---

## Deploy checklist

1. Add DTOs + `GetNappWaitingForVirtualRoomScheduling` to `SurgeriesCalendar`.
2. Add WebMethod to `WebService.cs` (same attributes as `getNappProceduresListByRequestID`).
3. Rebuild + redeploy ASMX.
4. Smoke test:

```bash
curl -s -X POST "http://localhost:64964/WebService.asmx/GetNappWaitingForVirtualRoomScheduling" \
  -H "Content-Type: application/json" \
  -d '{"_fullDate":"2026-07-08","_calendarRoomsArea":"וירטואלי כללי","_roomGroupDesc":"וירטואלי כללי","_roomCodes":["ור01-אורתופדיה"]}'
```

Expected: HTTP 200, `{ "d": { "WaitingList": [ ... ] } }` — **not** `Unknown web method`.

5. Virtual room board → **המלצות מהמתנה** → dashed blocks on calendar.

---

## Frontend (this repo)

| File | Role |
|------|------|
| `shared/virtual-room-waiting-api.service.ts` | POST + normalize response |
| `shared/virtual-room-slot-planner.ts` | 07:30–15:00 slots, 20 min setup |
| `surgeries-management.component.ts` | Toggle + board overlay; shows clear error if WebMethod missing |
