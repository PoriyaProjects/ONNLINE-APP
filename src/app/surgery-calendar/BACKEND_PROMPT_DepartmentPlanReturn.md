# Backend: Department Plan Return (החזרת תוכנית למחלקה עם הערות)

## Overview

Frontend feature for Dr. Dave (surgery planning coordinator) to return daily surgery plans to operating departments with optional per-surgery comments. Department secretary and department manager can mark treatment status and add response text. A report is available filtered by date range, departments, and treatment status.

## Required WebMethods

### 1. `GetDepartmentPlanReturn`

Load a saved return record (draft or sent) for a specific department/room/date.

**Request:**
```json
{
  "department": "אורולוגיה",
  "roomCode": "פז01-205",
  "planDate": "2026-07-26",
  "calendarRoomsArea": "פז"
}
```

**Response (`d`):**
```json
{
  "returnId": "guid-or-int",
  "department": "'אורולוגיה'",
  "departmentDisplay": "אורולוגיה",
  "roomCode": "פז01-205",
  "planDate": "2026-07-26",
  "calendarRoomsArea": "פז",
  "generalComment": "נא לשים לב לשינויי שעות",
  "generalResponseText": "",
  "treatmentStatus": "pending",
  "sentAt": "2026-07-26T08:30:00",
  "sentBy": "dave",
  "respondedAt": null,
  "respondedBy": null,
  "surgeries": [
    {
      "rowId": "12345",
      "caseNumber": "001234",
      "coordinatorComment": "נדרשת תיאום עם מחלקה",
      "departmentResponseText": "",
      "treatmentStatus": "pending"
    }
  ]
}
```

### 2. `SaveDepartmentPlanReturn`

Save coordinator comments before/after send.

**Request:** same shape as `GetDepartmentPlanReturn` response + `sentBy`.

**Response (`d`):** `returnId` string.

### 3. `SendDepartmentPlanReturnToDepartment`

Send HTML plan with comments by email (similar to `SentDepartmentFinalSurgeryPlan`).

**Endpoint:** `urlipracticom` (same as existing final plan send).

**Request:**
```json
{
  "returnId": "guid",
  "department": "'אורולוגיה'",
  "fileString": "<html>...</html>",
  "arrivalDate": "2026-07-26",
  "calendarRoomsArea": "פז",
  "roomCode": "פז01-205",
  "generalComment": "הערה כללית",
  "users": [
    { "FirstName": "מזכירה", "LastName": "אורולוגיה", "Email": "sec@tzmc.gov.il" }
  ]
}
```

**Recipients (server-side default when possible):**
- Operating department secretary
- Department manager

**Response (`d`):** `true` / `false`.

### 4. `SaveDepartmentPlanReturnResponse`

Department staff marks treatment completion.

**Request:**
```json
{
  "returnId": "guid",
  "generalResponseText": "טופל",
  "treatmentStatus": "completed",
  "respondedBy": "secretary_user",
  "surgeries": [
    {
      "rowId": "12345",
      "departmentResponseText": "בוצע תיאום",
      "treatmentStatus": "completed"
    }
  ]
}
```

**Response (`d`):** `true` / `false`.

### 5. `GetDepartmentPlanReturnReport`

Report of returned plans.

**HTTP GET query string (must match WebMethod param names):**

```
GetDepartmentPlanReturnReport?fromDate=2026-08-01&toDate=2026-08-31&departments=&treatmentStatus=&includeDeleted=true
```

| Query param | WebMethod arg | Notes |
|---|---|---|
| `fromDate` | `string fromDate` | `yyyy-MM-dd` → `@FromDate` |
| `toDate` | `string toDate` | `yyyy-MM-dd` → `@ToDate` |
| `departments` | `string[] departments` | empty = all; client sends comma-separated string |
| `treatmentStatus` | `string treatmentStatus` | empty = all |
| `includeDeleted` | `bool includeDeleted` | `true` / `false` |

**Response (`d`):** array of records (same shape as `GetDepartmentPlanReturn`).

**Server signature:**

```csharp
[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
public void GetDepartmentPlanReturnReport(
    string fromDate,
    string toDate,
    string[] departments = null,
    string treatmentStatus = "",
    bool includeDeleted = false)
```

Do **not** use `dateFrom`/`dateTo` in the WebMethod or query string.

## Treatment status values

| Value | Hebrew label |
|-------|--------------|
| `postponed` | הוזזה |
| `pending` | ממתין |
| `in_progress` | בטיפול |
| `completed` | בוצע |

## Interim frontend behavior (until backend is live)

- **Email send** falls back to existing `SentDepartmentFinalSurgeryPlan` when `SendDepartmentPlanReturnToDepartment` is missing.
- **Save / report / department response** are persisted in browser `localStorage` (`surgery_department_plan_returns_v1`) until server WebMethods exist.
- Department staff open **טיפול בתוכניות שהוחזרו** in the surgeries board header → **טיפול** on a row → mark status → **שמירת סטטוס טיפול**.


- `shared/department-plan-return.models.ts`
- `shared/department-plan-return-api.service.ts`
- `dialogs/department-plan-return-dialog.html`
- `dialogs/department-plan-return-report-dialog.html`
- `surgeries-management/surgeries-management.component.ts` (dialog components)

## Notes

- Surgery list is initially loaded from existing `GetSurgeriesPlannedExcel` when no saved return exists.
- `rowId` should map to surgery `Row_ID` when available, otherwise `casenumber`.
- Until backend is implemented, save/send/report calls fail gracefully and UI still loads surgeries from `GetSurgeriesPlannedExcel`.
