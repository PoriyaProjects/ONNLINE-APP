# Backend prompt: `GetImagingOutpatientPerformanceDashboard`

Send this document to your backend developer. The Angular **Imaging Performance Dashboard** already calls this endpoint when the user selects **מרפאות חוץ** → **CT** or **MRI**.

---

## Request

### Endpoint

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **URL** | `WebService.asmx/GetImagingOutpatientPerformanceDashboard` (same base as other ASMX methods) |
| **Headers** | `Content-Type: application/json; charset=utf-8`, `Accept: application/json; charset=utf-8` |

### JSON body

```json
{
  "department": "CT",
  "fromDate": "2026-05-01",
  "toDate": "2026-05-27"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `department` | string | `"CT"` or `"MRI"` |
| `fromDate` | string | `yyyy-MM-dd` — filter start (inclusive), typically on `CreateDate` or `TechDate` |
| `toDate` | string | `yyyy-MM-dd` — filter end (inclusive) |

**Important:** Do **not** require query-string parameters. The frontend sends everything in the POST body (same pattern as `GetImagingPerformanceDashboard`).

---

## Source data (example row)

The UI is built for rows like:

| Column | Example | Role |
|--------|---------|------|
| ItemID | 101564 | Primary key |
| CreateDate | 2025-05-04 12:05:37.140 | Start of workflow |
| AppoitmentDate | 2025-05-11 15:25:00 | Appointment |
| PatientNumber | 0001104695 | Patient ID |
| FirstName / LastName | שמעון / אמר | Patient name |
| CaseNumber | 0031607898 | Case |
| TechDate / TechTime | 2025-05-11 / 15:29:51 | When imaging was performed |
| Depart | דימ-סיטי | Modality / department (use for CT vs MRI filter) |
| DocDate / DocTime | 2025-05-18 / 10:01:02 | Radiologist report time |
| DocName | קו.קרוגר | Reporting physician |
| BKIDOT | 2025-05-04 13:39:25.077 | QA / review milestone |
| DIMOTAN | 2025-05-04 20:55:24.990 | Second milestone |
| TOR | 2025-05-05 08:51:56.040 | Third milestone (תור) |

---

## Department filter (`department` parameter)

Apply in SQL/WHERE:

| `department` | Suggested filter on `Depart` |
|--------------|------------------------------|
| **CT** | `Depart` LIKE N'%סיטי%' OR `Depart` LIKE N'%CT%'` OR `Depart` = N'דימ-סיטי' |
| **MRI** | `Depart` LIKE N'%MRI%' OR `Depart` LIKE N'%מ.ר%'` OR `Depart` LIKE N'%מר%' |

Adjust to your real `Depart` values in the database.

---

## Per-row computed durations (minutes)

For each row where both endpoints exist and `end >= start`, compute:

```text
MinutesCreateToBkidot  = DATEDIFF(MINUTE, CreateDate, BKIDOT)
MinutesBkidotToDimotan = DATEDIFF(MINUTE, BKIDOT, DIMOTAN)
MinutesDimotanToTor    = DATEDIFF(MINUTE, DIMOTAN, TOR)
MinutesTechToDoc       = DATEDIFF(MINUTE, TechDateTime, DocDateTime)
```

Where:

- `TechDateTime` = combine `TechDate` + `TechTime` (e.g. `CAST(TechDate AS date)` + time part).
- `DocDateTime` = combine `DocDate` + `DocTime`.
- Ignore NULL dates; do not include negative intervals in averages.

---

## Aggregates for dashboard

Return one JSON object (wrapped in `{ "d": ... }` if using ASP.NET ScriptService):

```json
{
  "TotalCases": 1234,
  "DistinctPatients": 1100,
  "AvgMinutesCreateToBkidot": 95.5,
  "AvgMinutesBkidotToDimotan": 420.2,
  "AvgMinutesDimotanToTor": 720.0,
  "AvgMinutesTechToDoc": 10080.5,
  "PipelineStages": [
    { "Key": "CreateToBkidot", "LabelHe": "יצירה → ביקורת", "AvgMinutes": 95.5, "CaseCount": 1200 },
    { "Key": "BkidotToDimotan", "LabelHe": "ביקורת → דימותן", "AvgMinutes": 420.2, "CaseCount": 1180 },
    { "Key": "DimotanToTor", "LabelHe": "דימותן → תור", "AvgMinutes": 720.0, "CaseCount": 1150 },
    { "Key": "TechToDoc", "LabelHe": "הדמיה → דיווח רופא", "AvgMinutes": 10080.5, "CaseCount": 1100 }
  ],
  "Doctors": [
    { "DocName": "קו.קרוגר", "CaseCount": 45, "AvgMinutesTechToDoc": 9500.0 }
  ],
  "DailyTrend": [
    { "Day": "2026-05-01", "CaseCount": 12, "AvgMinutesTechToDoc": 9800.0 }
  ],
  "Details": [ /* array of case rows with all columns + Minutes* fields */ ]
}
```

### `Doctors`

Group by `DocName` where `DocName` is not null:

- `CaseCount` = count of rows
- `AvgMinutesTechToDoc` = average of `MinutesTechToDoc` for that doctor

### `DailyTrend`

Group by calendar day of `TechDate` (or `CreateDate` if TechDate is null):

- `Day` = `yyyy-MM-dd`
- `CaseCount`, `AvgMinutesTechToDoc`

### `Details`

Return the filtered rows (optionally paginated later). Each item should include original columns **and** the four `Minutes*` fields.

---

## Example SQL sketch (adjust table/schema names)

```sql
-- Replace [YourDb].[dbo].[ImagingOutpatientCases] with real table/view
DECLARE @DeptFilter NVARCHAR(50) = CASE
  WHEN @department = 'CT'  THEN N'%סיטי%'
  WHEN @department = 'MRI' THEN N'%MRI%'
  ELSE N'%'
END;

;WITH base AS (
  SELECT
    *,
    TRY_CAST(TechDate AS date) AS TechD,
    TRY_CAST(DocDate AS date) AS DocD,
    DATEADD(SECOND, DATEDIFF(SECOND, 0, TRY_CAST(TechTime AS time)), TRY_CAST(TechDate AS datetime)) AS TechDateTime,
    DATEADD(SECOND, DATEDIFF(SECOND, 0, TRY_CAST(DocTime AS time)), TRY_CAST(DocDate AS datetime)) AS DocDateTime
  FROM [YourDb].[dbo].[ImagingOutpatientCases]  -- YOUR TABLE
  WHERE Depart LIKE @DeptFilter
    AND CAST(CreateDate AS date) BETWEEN @fromDate AND @toDate
),
calc AS (
  SELECT *,
    DATEDIFF(MINUTE, CreateDate, BKIDOT) AS MinutesCreateToBkidot,
    DATEDIFF(MINUTE, BKIDOT, DIMOTAN) AS MinutesBkidotToDimotan,
    DATEDIFF(MINUTE, DIMOTAN, TOR) AS MinutesDimotanToTor,
    DATEDIFF(MINUTE, TechDateTime, DocDateTime) AS MinutesTechToDoc
  FROM base
)
SELECT * FROM calc;
```

Then compute aggregates in C# or with additional SQL (`AVG`, `GROUP BY DocName`, `GROUP BY CAST(TechDate AS date)`).

---

## Response format

- **Success:** HTTP 200, JSON body (optionally `{ "d": <object or JSON string> }`).
- **Error:** HTTP 500 with message; avoid appending HTML after JSON (breaks Angular parser).

---

## Summary checklist for backend

1. Add **POST** `GetImagingOutpatientPerformanceDashboard`.
2. Accept `department` (`CT`|`MRI`), `fromDate`, `toDate` in JSON body.
3. Filter rows by department + date range.
4. Compute four minute intervals per row.
5. Return aggregates + `Doctors` + `DailyTrend` + `Details` as specified above.

Once deployed, the frontend path is: **מרפאות חוץ** → pick **CT** or **MRI** → dashboard loads automatically for the selected date range.
