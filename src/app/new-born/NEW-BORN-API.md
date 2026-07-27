# New-Born Dashboard — API Specification

מסמך אפיון ל-APIs הנדרשים לדשבורד לידות (`#/newborn`).

**Base URL (קיים):** `http://srv-ipracticom:8080/WebService.asmx/`  
**Base URL (סביבה):** `environment.urlipracticom` (למשל `GetPersonalDetails`)

**פורמט בקשה:** `POST` עם JSON body (ASP.NET ASMX — תגובה ב-`d`).

---

## 1. סיכום לידות לפי יישוב

**Endpoint מוצע:** `GetBirthSummaryByYishuv`

### Request

```json
{
  "startDate": "2022-01-01",
  "endDate": "2027-01-01",
  "year": null,
  "month": null,
  "yishuv": ""
}
```

| שדה | סוג | חובה | תיאור |
|-----|-----|------|--------|
| `startDate` | string (YYYY-MM-DD) | כן | תחילת טווח |
| `endDate` | string (YYYY-MM-DD) | כן | סוף טווח |
| `year` | number \| null | לא | סינון לפי שנה |
| `month` | number \| null | לא | סינון לפי חודש (1–12) |
| `yishuv` | string | לא | שם יישוב; ריק = הכל |

### Response (`d`)

```json
[
  { "Year": 2025, "Month": 7, "Yishuv": "טבריה", "Births": 42 },
  { "Year": 2025, "Month": 7, "Yishuv": "נצרת", "Births": 31 }
]
```

**מקור SQL (רפרנס):** סיכום לפי `Year`, `Month`, `Yishuv`, `COUNT(*) AS Births`.

---

## 2. פירוט לידות

**Endpoint מוצע:** `GetBirthDetails`

### Request

אותם פרמטרי סינון כמו בסעיף 1.

### Response (`d`)

```json
[
  {
    "Year": 2025,
    "PatientId": "123456789",
    "MotherDob": "1990-03-15",
    "MotherAgeAtBirth": 35,
    "NewbornDob": "2025-07-20",
    "City": "טבריה",
    "HealthFund": "כללית",
    "Nationality": "יהודי",
    "PreviousChildren": "2",
    "PregnancyWeek": 39,
    "PregnancyDay": 2,
    "BirthNumberAtHospital": 3,
    "TotalBirthsAtHospital": 12
  }
]
```

**מקור SQL (רפרנס):** `HEARING_REPORT` + `PM` — פרטי אם וילוד.

---

## 3. מעקב הריון

**Endpoint מוצע:** `GetPregnancyMonitoring`

### Request

```json
{
  "startDate": "2022-01-01",
  "endDate": "2027-01-01",
  "year": null,
  "month": null,
  "yishuv": "",
  "status": ""
}
```

| שדה נוסף | סוג | תיאור |
|----------|-----|--------|
| `status` | string | `לידה` \| `ללא לידה` \| `עדיין במעקב` \| ריק = הכל |

### Response (`d`)

```json
[
  {
    "Year": 2025,
    "Month": 7,
    "MonthYear": "07/2025",
    "PatientId": "987654321",
    "PatientNumber": "100234",
    "City": "נוף הגליל",
    "HealthFund": "מכבי",
    "Nationality": "ערבי",
    "Age": 28,
    "PreviousChildren": "1",
    "VisitDate": "2025-07-10",
    "PregnancyWeekLabel": "32+4",
    "EstimatedBirthDate": "2025-09-05",
    "DaysUntilEstimatedBirth": 57,
    "DaysAfterEstimatedBirth": 0,
    "VisitCount": 4,
    "FirstVisit": "2025-03-01",
    "LastVisit": "2025-07-10",
    "Status": "עדיין במעקב"
  }
]
```

---

## 4. סטטיסטיקה שבועית (מסך כניסה)

**Endpoint מוצע:** `GetWeeklyBirthStats`

### Request

```json
{
  "weeksBack": 12
}
```

### Response (`d`)

```json
{
  "currentWeekBirths": 18,
  "weeklyAverage": 15.4,
  "deltaPercent": 16.9,
  "weekLabel": "שבוע 30/2025",
  "trend": [
    { "weekLabel": "W19", "births": 14 },
    { "weekLabel": "W20", "births": 16 }
  ]
}
```

**הערה:** ניתן לחשב גם בצד לקוח מ-`GetBirthSummaryByYishuv` אם אין endpoint ייעודי.

---

## 5. השוואה חודשית לפי שנים (גרף חודשים)

**Endpoint מוצע:** `GetMonthlyBirthsByYear`

### Request

```json
{
  "month": 7,
  "yearFrom": 2021,
  "yearTo": 2025,
  "yishuv": ""
}
```

### Response (`d`)

```json
[
  { "year": 2021, "births": 38 },
  { "year": 2022, "births": 41 },
  { "year": 2023, "births": 35 },
  { "year": 2024, "births": 44 },
  { "year": 2025, "births": 42 }
]
```

**שימוש ב-UI:** מסך "גרף חודשים" — בחירת חודש + טווח שנים.

---

## 6. APIs קיימים — רישום לידות

אלו כבר מחוברים ב-`new-born.component.ts`:

### 6.1 `GetNewBornTable`

```json
{
  "_pageIndex": 0,
  "_pageSize": 10,
  "_freeText": "",
  "_fromDate": "2025-07-01",
  "_toDate": "2025-07-27"
}
```

**Response:** מערך רשומות עם `TotalRows` בשורה הראשונה.

### 6.2 `SaveNewBornForm`

```json
{
  "_patientForm": { /* שדות טופס לידה */ }
}
```

### 6.3 `selectNewBornUsers`

```json
{}
```

**Response:** רשימת עובדים `{ UserID, UserName, UserFullName, CellNumber }`.

### 6.4 `GetPersonalDetails` (דרך `environment.urlipracticom`)

```json
{
  "CaseNumber": "1234567"
}
```

**Response:** פרטי אם לפי מספר מקרה.

---

## מיפוי לשכבת השירות (`NewBornDataService`)

| מתודה בשירות | API |
|--------------|-----|
| `getBirthSummary()` | `GetBirthSummaryByYishuv` |
| `getBirthDetails()` | `GetBirthDetails` |
| `getPregnancyMonitoring()` | `GetPregnancyMonitoring` |
| `getWeeklyTrend()` / `computeWeeklyStats()` | `GetWeeklyBirthStats` או חישוב מסיכום |
| `computeMonthlyByYear()` | `GetMonthlyBirthsByYear` או חישוב מסיכום |

**מצב נוכחי:** Mock data ב-`new-born-data.service.ts` — יש להחליף ב-`HttpClient.post` כשה-endpoints יהיו זמינים.

---

## שגיאות והתנהגות צפויה

| קוד / מצב | התנהגות UI |
|-----------|------------|
| רשימה ריקה | הודעת "אין נתונים" |
| שגיאת רשת | הסתרת spinner, שמירת נתונים קודמים אם קיימים |
| `401` / `403` | הודעה למשתמש + הפניה להתחברות (לפי מדיניות האפליקציה) |

---

## הערות יישום

1. כל התאריכים בפורמט `YYYY-MM-DD`.
2. שמות שדות ב-Response ב-PascalCase (תואם לשאר ה-ASMX באפליקציה).
3. סינון `yishuv` ריק = ללא סינון גאוגרפי.
4. מומלץ endpoint אחד ל-KPI מסך כניסה (`GetWeeklyBirthStats`) כדי להפחית round-trips.
