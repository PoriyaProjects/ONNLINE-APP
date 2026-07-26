# Backend: Department Plan Return (החזרת תוכנית למחלקה עם הערות)

## Overview

Frontend feature for Dr. Dave (surgery planning coordinator) to return daily surgery plans to operating departments with optional per-surgery comments. Department secretary and department manager can mark treatment status and add response text. A report is available filtered by date range, departments, and treatment status.

## Required WebMethods

### 1. `GetDepartmentPlanReturn`

Load a saved return record (draft or sent) for a specific department/room/date.

**Request:**
```json
{
  "department": "'אורולוגיה'",
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

**Request:**
```json
{
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "departments": ["אורולוגיה", "אורתופדיה"],
  "treatmentStatus": "all"
}
```

`treatmentStatus` values: `all` | `pending` | `in_progress` | `completed`.

**Response (`d`):** array of records (same shape as `GetDepartmentPlanReturn`).

## Treatment status values

| Value | Hebrew label |
|-------|--------------|
| `pending` | ממתין לטיפול |
| `in_progress` | בטיפול |
| `completed` | הושלם |

## Frontend files

- `shared/department-plan-return.models.ts`
- `shared/department-plan-return-api.service.ts`
- `dialogs/department-plan-return-dialog.component.ts`
- `dialogs/department-plan-return-report-dialog.component.ts`

## Notes

- Surgery list is initially loaded from existing `GetSurgeriesPlannedExcel` when no saved return exists.
- `rowId` should map to surgery `Row_ID` when available, otherwise `casenumber`.
- Until backend is implemented, save/send/report calls fail gracefully and UI still loads surgeries from `GetSurgeriesPlannedExcel`.
