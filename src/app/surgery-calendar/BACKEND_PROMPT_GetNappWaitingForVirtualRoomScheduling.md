# Backend: `GetNappWaitingForVirtualRoomScheduling`

Angular calls this when the user clicks **"המלצות מהמתנה"** on a virtual room board.

**Error today:** `Unknown web method GetNappWaitingForVirtualRoomScheduling` — add the WebMethod below next to `getNappProceduresListByRequestID` (which is already deployed).

## Common mistake — wrong method name / signature

If you see `missing value for parameter: '_RequestID'` when Angular clicks **המלצות מהמתנה**, you likely put `getNappProceduresListByRequestID` logic under the **wrong** WebMethod name:

```csharp
// WRONG — Angular POSTs _fullDate/_roomCodes here, not _RequestID
[WebMethod]
public List<NappProcedureDto> GetNappWaitingForVirtualRoomScheduling(string _RequestID)
{
    return _SurgeriesCalendar.getNappProceduresListByRequestID(_RequestID);
}
```

Angular makes **two** calls. They are **not** interchangeable:

| WebMethod | Body parameters | Returns |
|-----------|-----------------|---------|
| `GetNappWaitingForVirtualRoomScheduling` | `_fullDate`, `_calendarRoomsArea`, `_roomGroupDesc`, `_roomCodes` | `WaitingList` rows |
| `getNappProceduresListByRequestID` | `_RequestID` | `List<NappProcedureDto>` |

You need **both** WebMethods in `WebService.cs`.

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
[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = false)]
public List<SurgeriesCalendar.NappProcedureDto> getNappProceduresListByRequestID(string _RequestID = "")
{
    return _SurgeriesCalendar.getNappProceduresListByRequestID(_RequestID ?? "");
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
[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = false)]
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

**Ready-to-paste implementation:** `BACKEND_GetNappWaitingForVirtualRoomScheduling.cs` (same folder as this doc).

Copy the DTOs + `GetNappWaitingForVirtualRoomScheduling` + helpers into your `SurgeriesCalendar` class, then wire the three `TODO` helpers at the bottom:

| TODO in `.cs` file | Your existing method |
|--------------------|----------------------|
| `GetSurgeriesBySurgeryRoomCode` | Same as WebMethod `GetSurgeriesBySurgeryRoomCode` (`_fullDate`, `_surRoomCode`) |
| `GetPatientDetailsByCaseNumber` | WebMethod `GetPatientDetailsByCaseNumber` (`_caseNumber`) |
| `getSurgeryRequestDepartmentsByCode` | Department lookup → `S_DEPARTMENT` |
| `LookupDepartmentDisplayNameFromSql` | Adjust table name if not `SurgeryRequestDepartments` |

Summary of logic:

```csharp
public NappWaitingForVirtualRoomResult GetNappWaitingForVirtualRoomScheduling(...)
{
    // 1. Load already-scheduled CaseNumber|RequestID keys from calendar (dedup)
    // 2. Query NAPP waiting rows (RequestStatus = 20, not canceled)
    // 3. Filter by department names parsed from _roomCodes (suffix after '-')
    // 4. Enrich each row: patient, duration, Procedures via getNappProceduresListByRequestID
    // 5. Return { WaitingList: [...] }
}
```

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
