# Hospital Current Patients Dashboard - API Reference & Examples

## Overview

This document provides complete API request/response examples for integrating the Hospital Current Patients Dashboard with your C# WebService backend.

---

## 1. FetchCurrentHospitalPatients

Fetches paginated list of active patients with filtering and search capabilities.

### Endpoint
```
POST /WebService.asmx/FetchCurrentHospitalPatients
```

### Request Body
```json
{
  "viewMode": "DEPART",
  "departmentFilter": "",
  "caseTypeFilter": "ALL",
  "onlyDangerCases": false,
  "onlyAranCases": false,
  "freeSearch": "",
  "pageIndex": 0,
  "pageSize": 10
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `viewMode` | string | ✅ | `'DEPART'` or `'DEPART_SEODE'` |
| `departmentFilter` | string | ✅ | Empty string `''` for all, or department key like `'CARDIO'` |
| `caseTypeFilter` | string | ✅ | `'ALL'`, `'1'` (admission), `'2'` (clinics), `'3'` (triage) |
| `onlyDangerCases` | boolean | ✅ | `true` to show only danger cases |
| `onlyAranCases` | boolean | ✅ | `true` to show only Aran cases |
| `freeSearch` | string | ✅ | Search term (matches name, ID, case #, room, bed, doctor, dept) |
| `pageIndex` | number | ✅ | 0-based page number |
| `pageSize` | number | ✅ | Rows per page (10, 25, 50, 100) |

### Response

**Success (HTTP 200):**
```json
{
  "d": [
    {
      "PatientId": "123456789",
      "FirstName": "יוסי",
      "LastName": "כהן",
      "PatientIdType": "ID",
      "Gender": "M",
      "DateOfBirth": "1965-03-21",
      "CaseNumber": "CASE-2024-0001",
      "CaseTypeName": "אשפוז",
      "CaseTypeKey": "1",
      "MoveCat": "2",
      "MoveType": "הוצאה",
      "MoveTypeLabel": "הוצאה מבית חולים",
      "MoveDate": "2024-01-15",
      "MoveTime": "14:30",
      "MoveDateEnd": null,
      "MoveTimeEnd": null,
      "ActiveDepartmentKey": "CARDIO",
      "ActiveDepartmentGroup": "קרדיולוגיה",
      "PrevDepartmentKey": "GENERAL",
      "PrevDepart": "פנימית כללית",
      "PrevSeodeDepart": null,
      "RoomName": "101",
      "RoomNumber": "101",
      "BedNumber": "A",
      "IsTemporaryLeave": false,
      "IsDanger": false,
      "IsAran": true,
      "AranNumber": "ARAN-2024-001",
      "AranPlace": "בית אבות כללי",
      "AranStatus": "pending",
      "HospitalizedDay": 3,
      "TotalTimeInHours": 72,
      "DocNameMalrad": "ד״ר דוד לוי",
      "Phone1": "050-1234567",
      "Phone2": "050-7654321",
      "FatherName": "אברהם כהן",
      "ReceiveCauseDes": "כאבים בחזה",
      "PatientComplaint": "קוצר נשימה",
      "Referrer": "קלינית כללית",
      "HosReferrer": "בית החולים שלום",
      "Payer": "כללית",
      "Commitment": "דרוש תשלום",
      "Comments": "מטופל עם בעיות כרוניות",
      "TotalRows": 42
    },
    {
      "PatientId": "987654321",
      "FirstName": "מרים",
      "LastName": "גולדברג",
      "PatientIdType": "ID",
      "Gender": "F",
      "DateOfBirth": "1958-07-14",
      "CaseNumber": "CASE-2024-0002",
      "CaseTypeName": "מיון",
      "CaseTypeKey": "3",
      "MoveCat": "1",
      "MoveType": "קבלה",
      "MoveTypeLabel": "קבלה לבית חולים",
      "MoveDate": "2024-01-15",
      "MoveTime": "16:45",
      "ActiveDepartmentKey": "ER",
      "ActiveDepartmentGroup": "חדר מיון",
      "RoomName": "TRIAGE-2",
      "BedNumber": "1",
      "IsTemporaryLeave": false,
      "IsDanger": true,
      "IsAran": false,
      "HospitalizedDay": 0,
      "TotalTimeInHours": 2,
      "DocNameMalrad": "ד״ר יוליה בוגדנוב",
      "Phone1": "054-9876543",
      "ReceiveCauseDes": "תאונה דרכים",
      "PatientComplaint": "פגיעה בראש",
      "Comments": "דורש ניטור צפוי",
      "TotalRows": 42
    }
  ]
}
```

**Error (HTTP 500):**
```json
{
  "Message": "An error occurred while executing the query",
  "ExceptionType": "System.Data.SqlClient.SqlException",
  "StackTrace": "..."
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `PatientId` | string | Unique patient identifier |
| `FirstName` | string | Patient first name |
| `LastName` | string | Patient last name |
| `Gender` | string | 'M' or 'F' |
| `DateOfBirth` | string | ISO date format |
| `CaseNumber` | string | Unique case/admission identifier |
| `CaseTypeName` | string | 'אשפוז' (admission), 'מרפאות' (clinics), 'מיון' (triage) |
| `CaseTypeKey` | string | '1', '2', or '3' |
| `MoveCat` | string | '1' (admission), '2' (transfer), '3' (discharge), '4-6' (temp leave) |
| `MoveTypeLabel` | string | Human-readable move type |
| `MoveDate` | string | 'YYYY-MM-DD' format |
| `MoveTime` | string | 'HH:mm' format |
| `ActiveDepartmentGroup` | string | Current department name |
| `RoomName` | string | Room name/number |
| `BedNumber` | string | Bed identifier |
| `IsTemporaryLeave` | boolean | Temporary absence flag |
| `IsDanger` | boolean | Critical case flag |
| `IsAran` | boolean | External placement flag |
| `HospitalizedDay` | number | Days in hospital |
| `TotalTimeInHours` | number | Total length of stay in hours |
| `DocNameMalrad` | string | Attending physician name |
| `TotalRows` | number | **IMPORTANT**: Total rows available (for pagination) |

### Example Requests

**Request 1: All patients, page 1**
```json
{
  "viewMode": "DEPART",
  "departmentFilter": "",
  "caseTypeFilter": "ALL",
  "onlyDangerCases": false,
  "onlyAranCases": false,
  "freeSearch": "",
  "pageIndex": 0,
  "pageSize": 10
}
```

**Request 2: Danger cases in Cardiology**
```json
{
  "viewMode": "DEPART",
  "departmentFilter": "CARDIO",
  "caseTypeFilter": "ALL",
  "onlyDangerCases": true,
  "onlyAranCases": false,
  "freeSearch": "",
  "pageIndex": 0,
  "pageSize": 25
}
```

**Request 3: Search for patient by name**
```json
{
  "viewMode": "DEPART",
  "departmentFilter": "",
  "caseTypeFilter": "1",
  "onlyDangerCases": false,
  "onlyAranCases": false,
  "freeSearch": "כהן יוסי",
  "pageIndex": 0,
  "pageSize": 10
}
```

---

## 2. FetchDepartmentSummary

Fetches census summary statistics per department for the given view mode.

### Endpoint
```
POST /WebService.asmx/FetchDepartmentSummary
```

### Request Body
```json
{
  "viewMode": "DEPART"
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `viewMode` | string | ✅ | `'DEPART'` or `'DEPART_SEODE'` |

### Response

**Success (HTTP 200):**
```json
{
  "d": [
    {
      "DepartmentKey": "CARDIO",
      "DepartmentName": "קרדיולוגיה",
      "ViewMode": "DEPART",
      "TotalPatients": 24,
      "EshpozCount": 15,
      "ClinicsCount": 7,
      "MiyunCount": 2,
      "DangerCasesCount": 2,
      "AranCasesCount": 1,
      "TemporaryLeaveCount": 0
    },
    {
      "DepartmentKey": "GENERAL",
      "DepartmentName": "פנימית כללית",
      "ViewMode": "DEPART",
      "TotalPatients": 38,
      "EshpozCount": 28,
      "ClinicsCount": 8,
      "MiyunCount": 2,
      "DangerCasesCount": 1,
      "AranCasesCount": 2,
      "TemporaryLeaveCount": 1
    },
    {
      "DepartmentKey": "SURGERY",
      "DepartmentName": "כירורגיה",
      "ViewMode": "DEPART",
      "TotalPatients": 18,
      "EshpozCount": 16,
      "ClinicsCount": 2,
      "MiyunCount": 0,
      "DangerCasesCount": 0,
      "AranCasesCount": 0,
      "TemporaryLeaveCount": 0
    },
    {
      "DepartmentKey": "ER",
      "DepartmentName": "חדר מיון",
      "ViewMode": "DEPART",
      "TotalPatients": 12,
      "EshpozCount": 2,
      "ClinicsCount": 0,
      "MiyunCount": 10,
      "DangerCasesCount": 2,
      "AranCasesCount": 0,
      "TemporaryLeaveCount": 0
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `DepartmentKey` | string | Unique department identifier (e.g., 'CARDIO', 'SURGERY') |
| `DepartmentName` | string | Display name in Hebrew |
| `ViewMode` | string | 'DEPART' or 'DEPART_SEODE' |
| `TotalPatients` | number | Sum of all case types |
| `EshpozCount` | number | Admission patients |
| `ClinicsCount` | number | Clinic/ambulatory patients |
| `MiyunCount` | number | Triage patients |
| `DangerCasesCount` | number | Critical cases |
| `AranCasesCount` | number | Patients placed in external facilities |
| `TemporaryLeaveCount` | number | Patients on temporary leave |

---

## 3. FetchMonitoringSyncState

Fetches current state to detect if data has changed since last fetch.

### Endpoint
```
POST /WebService.asmx/FetchMonitoringSyncState
```

### Request Body
```json
{}
```

### Response

**Success (HTTP 200):**
```json
{
  "d": {
    "ActiveCount": 92,
    "MaxInsertDateTime": "2024-01-15T16:48:30.1234567Z",
    "MaxMoveDate": "2024-01-15",
    "MaxMoveTime": "16:48"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `ActiveCount` | number | Total number of active patients |
| `MaxInsertDateTime` | string | Latest modification timestamp (ISO format) |
| `MaxMoveDate` | string | Date of latest patient movement |
| `MaxMoveTime` | string | Time of latest patient movement |

### Purpose

This endpoint is called by the polling engine to detect if patient data has changed. If any field differs from the previous call, the dashboard re-fetches patient and department data.

**Example Change Detection Logic:**
```typescript
const prevState = { ActiveCount: 90, MaxInsertDateTime: "2024-01-15T16:40:00Z" };
const newState = { ActiveCount: 92, MaxInsertDateTime: "2024-01-15T16:48:30Z" };

const hasChanged = prevState.ActiveCount !== newState.ActiveCount ||
                   prevState.MaxInsertDateTime !== newState.MaxInsertDateTime;
// hasChanged = true → Refetch patient data
```

---

## 4. FetchCaseMoveHistory

Fetches chronological movement history for a single patient case.

### Endpoint
```
POST /WebService.asmx/FetchCaseMoveHistory
```

### Request Body
```json
{
  "caseNumber": "CASE-2024-0001"
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `caseNumber` | string | ✅ | The case number to fetch history for |

### Response

**Success (HTTP 200):**
```json
{
  "d": [
    {
      "MoveSequence": 1,
      "MoveCat": "1",
      "MoveType": "ADMIT",
      "MoveTypeLabel": "קבלה לבית חולים",
      "MoveDate": "2024-01-13",
      "MoveTime": "08:15",
      "MoveDateEnd": null,
      "MoveTimeEnd": null,
      "MoveDepartKey": "ER",
      "MoveDepart": "חדר מיון",
      "MoveDepartSeodeKey": null,
      "MoveDepartSeode": null,
      "RoomName": "TRIAGE-1",
      "RoomNumber": "TRIAGE-1",
      "BedNumber": "1",
      "InsertDateTime": "2024-01-13T08:15:00Z",
      "InsertUserName": "nurse_01",
      "UpdateDateTime": null,
      "UpdateUserName": null
    },
    {
      "MoveSequence": 2,
      "MoveCat": "2",
      "MoveType": "TRANSFER",
      "MoveTypeLabel": "העברה בין מחלקות",
      "MoveDate": "2024-01-13",
      "MoveTime": "10:30",
      "MoveDateEnd": null,
      "MoveTimeEnd": null,
      "MoveDepartKey": "CARDIO",
      "MoveDepart": "קרדיולוגיה",
      "MoveDepartSeodeKey": "CARDIO-ICU",
      "MoveDepartSeode": "יחידה טיפול נמרץ",
      "RoomName": "101",
      "RoomNumber": "101",
      "BedNumber": "A",
      "InsertDateTime": "2024-01-13T10:30:00Z",
      "InsertUserName": "doctor_02",
      "UpdateDateTime": "2024-01-13T12:00:00Z",
      "UpdateUserName": "nurse_03"
    },
    {
      "MoveSequence": 3,
      "MoveCat": "4",
      "MoveType": "TEMP_LEAVE_START",
      "MoveTypeLabel": "התחלת חופשה זמנית",
      "MoveDate": "2024-01-15",
      "MoveTime": "14:00",
      "MoveDateEnd": null,
      "MoveTimeEnd": null,
      "MoveDepartKey": "CARDIO",
      "MoveDepart": "קרדיולוגיה",
      "InsertDateTime": "2024-01-15T14:00:00Z",
      "InsertUserName": "nurse_01"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `MoveSequence` | number | Chronological order (1-based) |
| `MoveCat` | string | Category: '1' (admission), '2' (transfer), '3' (discharge), '4' (temp leave start), '5' (temp leave end), '6' (temp leave) |
| `MoveTypeLabel` | string | Human-readable type |
| `MoveDate` | string | 'YYYY-MM-DD' format |
| `MoveTime` | string | 'HH:mm' format |
| `MoveDepart` | string | Destination department |
| `MoveDepartSeode` | string | Sub-department (if applicable) |
| `RoomName` | string | Room identifier |
| `BedNumber` | string | Bed identifier |
| `InsertDateTime` | string | When record was created (ISO format) |
| `InsertUserName` | string | User who created record |
| `UpdateDateTime` | string | When record was modified (if applicable) |
| `UpdateUserName` | string | User who modified record |

---

## HTTP Headers

All requests should include:

```http
POST /WebService.asmx/FetchCurrentHospitalPatients HTTP/1.1
Host: localhost:64964
Content-Type: application/json; charset=utf-8
Accept: application/json; charset=utf-8
Content-Length: 123

{ "viewMode": "DEPART", ... }
```

---

## Error Handling

### ASMX Error Response

If a WebService error occurs, the response is HTTP 500 with:

```json
{
  "Message": "Specified cast is not valid.",
  "ExceptionType": "System.InvalidCastException",
  "StackTrace": "   at PatientMonitoringDoing.GetCurrentPatients(...)"
}
```

### Client-Side Handling

The service automatically:
1. Catches HTTP 500 errors
2. Extracts the `Message` field
3. Throws an error with the message
4. Component displays snack bar notification
5. Retains existing data

---

## Testing Guide

### cURL Examples

**Test 1: Fetch all patients**
```bash
curl -X POST http://localhost:64964/WebService.asmx/FetchCurrentHospitalPatients \
  -H "Content-Type: application/json" \
  -d '{
    "viewMode": "DEPART",
    "departmentFilter": "",
    "caseTypeFilter": "ALL",
    "onlyDangerCases": false,
    "onlyAranCases": false,
    "freeSearch": "",
    "pageIndex": 0,
    "pageSize": 10
  }'
```

**Test 2: Get sync state**
```bash
curl -X POST http://localhost:64964/WebService.asmx/FetchMonitoringSyncState \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Test 3: Fetch case history**
```bash
curl -X POST http://localhost:64964/WebService.asmx/FetchCaseMoveHistory \
  -H "Content-Type: application/json" \
  -d '{"caseNumber": "CASE-2024-0001"}'
```

---

## Notes

- All dates/times are in **Israeli timezone (UTC+2 winter, UTC+3 summer)**
- Timestamps use **ISO 8601 format** with 'Z' suffix for UTC
- Empty strings (`""`) represent NULL/missing values
- All text is in **Hebrew (UTF-8)**
- Pagination is **0-based** (first page = 0)
- The `TotalRows` field on each patient row **must be used** to set paginator length

---

## Related Files

- Service: `src/app/hospital-current-patients-dashboard/services/hospital-current-patients.service.ts`
- Component: `src/app/hospital-current-patients-dashboard/hospital-current-patients-dashboard.component.ts`
- Models: `src/app/hospital-current-patients-dashboard/models/patient-monitoring.models.ts`
