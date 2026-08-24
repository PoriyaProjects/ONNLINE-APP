# אפיון צד שרת — דשבורד שיקום (`rehabilitation-dashboard`)

**גרסה:** 1.0  
**תאריך:** 11.08.2026  
**צרכן:** `/#/rehabilitation-dashboard`  
**פרוטוקול:** ASMX `WebService.asmx` · `POST` · JSON · `{ "d": [...] }`  
**מקור נתונים:** `ChameleonConnection` (SQL Server)

---

## 1. כללים משותפים

### בקשה (כל הפונקציות)

```http
POST {baseUrl}/WebService.asmx/{MethodName}
Content-Type: application/json
```

```json
{
  "FromDate": "2026-08-11",
  "ToDate": "2026-08-11"
}
```

> **חובה:** השרת (`ParseD` / `ParseExact`) מצפה ל-**`yyyy-MM-dd`** — לא `dd/MM/yyyy`, לא `/Date(ms)/`.

| תצוגה בפרונט | FromDate | ToDate |
|--------------|----------|--------|
| סטטוס יומי | היום | היום |
| סטטוס חודשי | היום − 29 | היום (אתמול) — 30 ימים |
| דשבורד — חודש | 01.MM.YYYY | יום אחרון בחודש |
| דשבורד — שנה | 01.01.YYYY | 31.12.YYYY |

### רישום ב-`WebService.cs`

```csharp
private readonly RehabilitationOccupancyService _RehabilitationOccupancyService =
    new RehabilitationOccupancyService();
// + שירותים נוספים לפי הצורך

[WebMethod]
[OperationContract]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(
    string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDailyOccupancy(FromDate, ToDate);
}
```

> **חובה:** endpoint אחד לכל מדד. אין GET נפרד. פרמטרים ב-PascalCase.

### מחלקות שיקום רלוונטיות (אשפוז)

הפרונט מציג **רק** שלוש מחלקות אלו. שאר המחלקות מה-API יסוננו.

| DepartmentName (Chameleon) | שם תצוגה | קיבולת 2026 |
|--------------------------|----------|-------------|
| `המחלקה לגריאטריה שיקומית` | גריאטריה שיקומית | 18 |
| `מחלקת שיקום כללי` | שיקום כללי | 35 |
| `מחלקת שיקום ילדים` | שיקום ילדים | 14 |

קיבולת מיטות מנוהלת בפרונט (`rehabilitation-bed-capacity.constants.ts`) — השרת מחזיר רק `OccupiedPatients`.

---

## 2. פונקציות נדרשות

### 2.1 `GetRehabilitationOccupancy` — מדד 1.3 תפוסה ✅ מחובר

**שימוש:** דשבורד (מדד תפוסה) + סטטוס יומי/שבועי (בלוק 1.3).

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationOccupancy
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public int OccupiedPatients { get; set; }
}
```

#### דוגמת Response

```json
{
  "d": [
    {
      "__type": "RehabilitationOccupancy",
      "Date": "/Date(1786395600000)/",
      "Unit": 150685851,
      "DepartmentName": "מחלקת שיקום כללי",
      "OccupiedPatients": 35
    },
    {
      "__type": "RehabilitationOccupancy",
      "Date": "/Date(1786395600000)/",
      "Unit": 49,
      "DepartmentName": "מחלקת שיקום ילדים",
      "OccupiedPatients": 9
    },
    {
      "__type": "RehabilitationOccupancy",
      "Date": "/Date(1786395600000)/",
      "Unit": 85,
      "DepartmentName": "המחלקה לגריאטריה שיקומית",
      "OccupiedPatients": 18
    }
  ]
}
```

#### לוגיקה

- שורה לכל `(Date, DepartmentName)`.
- `OccupiedPatients` = מספר מאושפזים פעילים במחלקה בתאריך.
- לטווח שבועי: שורה לכל יום × מחלקה.

#### שירות (קיים)

```csharp
public List<RehabilitationOccupancy> GetDailyOccupancy(string fromDate, string toDate)
```

> **ParseD:** `ParseExact("yyyy-MM-dd")` + `SqlDbType.Date` בכל ה-methods — ראה `BACKEND_PROMPT_RehabilitationOccupancyService-fixes.md`.  
> `GetAdmissionsByDirection` / payer / targets / revenue: **לא** `DateTime.Parse` + `SqlDbType.DateTime`.

---

### 2.2 `GetRehabilitationAdmissionsByPayer` — מדד 1.4 קבלות לפי גורם משלם ✅ מחובר

**שימוש:** סטטוס יומי/שבועי — בלוק 1.4.

#### סיווג Pay_Institute

| Pay_Institute | PayerCategory |
|---------------|---------------|
| 10, 11, 12, 13 | קופת חולים |
| 98 | צה״ל + משרד הביטחון |
| `NULL` / אחר | אחר (`PayerName` = `טרם שוייך` אם אין שם במערכת) |

#### Units

`49`, `85`, `150685851` — שלוש מחלקות השיקום בלבד.

#### מימוש

`RehabilitationOccupancyService.GetAdmissionsByPayer(fromDate, toDate)`  
מקור: `MedicalRecords` + `SystemUnits` + `Pay_Institute`, `Hospital = 34`, `ROW_NUMBER` לפי `Admission_No`.

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationAdmissionsByPayer
{
    public DateTime Date { get; set; }
    public string PayerCategory { get; set; }  // "קופת חולים" | "צה״ל + משרד הביטחון" | "אחר"
    public string PayerName { get; set; }      // "כללית" | "מכבי" | "לאומית" | "מאוחדת" | ...
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}
```

#### לוגיקה

- **קבלה חדשה** = קבלה ראשונה לאשפוז שיקום (לא העברה פנימית).
- `PayerCategory`:
  - `קופת חולים` ← כללית, מכבי, לאומית, מאוחדת
  - `צה״ל + משרד הביטחון`
  - `אחר` ← פרטי, ביטוח לאומי, וכל גורם אחר
- נתח (%) מחושב בפרונט.

---

### 2.3 `GetRehabilitationAdmissionsByDirection` — מדד 1.5 קבלות פנים/חוץ ✅ מחובר (פרונט)

**שימוש:** סטטוס יומי/חודשי — בלוק 1.5.

**מימוש שרת:** `BACKEND_PROMPT_GetAdmissionsByDirection.md` (העתקה מלאה ל-`RehabilitationOccupancyService.cs`).

#### מקורות

| טבלה | שימוש |
|------|--------|
| `PATIENT_MONITORING` | קבלה ראשונה — `ROW_NUMBER` לפי `PM_CASE_NUMBER`, סינון `PM_MOVE_CAT=1`, `PM_MOVE_TYPE=01` |
| `MedicalRecords` | `Pay_Institute` — `OUTER APPLY TOP 1`, join `TRY_CONVERT(BIGINT, Admission_No)` |

מחלקות: `רשיקום-י`, `רשיקום-כ`, `רגרי-ש` → Unit 49 / 150685851 / 85.

#### כיוון

| `PM_MOVE_RANGE` | `Direction` |
|-----------------|-------------|
| `אישפוז` | `פנים` |
| אחר | `חוץ` |

#### מממן (`Pay_Institute`)

| Pay_Institute | FunderName |
|---------------|------------|
| 10, 11, 12, 13 | קופת חולים |
| 98 | צה״ל + משרד הביטחון |
| 99 | פרטי |
| NULL / אחר | אחר |

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationAdmissionsByDirection
{
    public DateTime Date { get; set; }
    public string FunderName { get; set; }   // "קופת חולים" | "צה״ל + משרד הביטחון" | "פרטי" | "אחר"
    public string Direction { get; set; }    // "פנים" | "חוץ"
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}
```

#### לוגיקה

| Direction | הגדרה |
|-----------|--------|
| `פנים` | `PM_MOVE_RANGE = אישפוז` |
| `חוץ` | כל מקור אחר |

---

### 2.4 `GetRehabilitationRecommendedTargets` — מדד 1.6 יעדים מומלצים

**שימוש:** סטטוס יומי/שבועי — בלוק 1.6.

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationRecommendedTarget> GetRehabilitationRecommendedTargets(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationRecommendedTarget
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public decimal ActualValue { get; set; }   // בפועל (%)
    public decimal TargetValue { get; set; }   // יעד מומלץ (%)
    public decimal Gap { get; set; }           // ActualValue - TargetValue
    public string MetricType { get; set; }     // "תפוסה חודשית"
    public string Status { get; set; }         // "עומד ביעד" | "מתחת ליעד"
    public decimal TotalOccupiedPatientDays { get; set; }  // מומלץ — לצבירה בפרונט
    public int DaysInPeriod { get; set; }                  // מומלץ — לצבירה בפרונט
}
```

#### לוגיקה

- שורה לכל **חודש קלנדרי × מחלקת שיקום** (3 מחלקות) בטווח `FromDate`–`ToDate`.
- חישוב תפוסה:
  - לכל יום בטווח: `OccupiedPatients` = מספר מטופלים מאושפזים באותו יום.
  - `TotalOccupiedPatientDays` = **`SUM(OccupiedPatients)`** — סך "ימי-תפוסה" (לא ממוצע יומי, לא מטופלים ייחודיים).
  - `DaysInPeriod` = מספר הימים בדלי.
  - `ActualValue` = `(TotalOccupiedPatientDays / (capacity × DaysInPeriod)) × 100` — אחוז תפוסה מול קיבולת מקסימלית אפשרית.
- קיבולת (`capacity`): ילדים 14 · גריאטריה 18 · כללי 35 (2026).
- **תצוגה חודשית (30 יום):** הפרונט **מסכם** את כל שורות ה-API (כולל חצאי חודש) ל:
  - **סה״כ בפועל** = SUM(`TotalOccupiedPatientDays`) או `(ActualValue/100 × capacity × DaysInPeriod)`
  - **סה״כ יעד** = SUM(`capacity × DaysInPeriod × 95%`)
  - KPI, טבלה וגרף מציגים **ימי תפוסה** (לא אחוזים)
- **תצוגה יומית:** אחוז תפוסה נקודתי מול יעד 95%

#### דוגמת Response

```json
{
  "d": [
    {
      "Date": "/Date(1754006400000)/",
      "Unit": 85,
      "DepartmentName": "המחלקה לגריאטריה שיקומית",
      "ActualValue": 88.5,
      "TargetValue": 95,
      "Gap": -6.5,
      "MetricType": "תפוסה חודשית",
      "Status": "מתחת ליעד",
      "TotalOccupiedPatientDays": 477,
      "DaysInPeriod": 30
    }
  ]
}
```

---

### 2.5 `GetRehabilitationRevenueNet` — מדד 1.7 הכנסות נטו

**שימוש:** סטטוס **חודשי בלבד** — בלוק 1.7 (גרף 12 חודשים, עמודה לחודש). לא מוצג בסטטוס יומי.

#### חתימה (WebService)

```csharp
[WebMethod]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(
    string fromDate, string toDate)
```

> **הערה:** `fromDate` / `toDate` **לא בשימוש** ב-SQL הנוכחי — השרת מחזיר תמיד 12 חודשים מתגלגלים לפי `GETDATE()`.

#### מודל

```csharp
public class RehabilitationRevenueNet
{
    public DateTime Date { get; set; }           // יום 1 בחודש (MonthDate)
    public int Unit { get; set; }                // 85 / 49 / 150685851
    public string DepartmentName { get; set; }   // שם תצוגה בעברית
    public decimal RevenueAmount { get; set; }   // SUM(Invoices.Price)
    public decimal RevenuePerDay { get; set; }   // 0 (מחושב בפרונט)
    public decimal SharePercent { get; set; }    // % מסה״כ התקופה (מחושב בשרת)
}
```

#### לוגיקה (שרת)

- מקור: `Invoices` + `PATIENT_MONITORING` (התאמת `CaseNumber` עם `LTRIM(STR(TRY_CAST(...)))`).
- מחלקות: `רגרי-ש` → גריאטריה (85), `רשיקום-י` → ילדים (49), `רשיקום-כ` → כללי (150685851).
- סינון: חשבוניות לא מבוטלות, `Price <> 0`.
- טווח: `InvoiceDate >= חודש נוכחי − 11` עד סוף חודש נוכחי.
- **שורה לכל חודש × מחלקה** — הפרונט מסכם לעמודה אחת לחודש בגרף.

#### פרונט

- גרף: 12 עמודות (חודש אחרון = עמודה ימנית).
- `d:[]` באמצע חודש — תקין (חשבוניות מופקות בעיקר בסוף חודש).

---

### 2.6 `GetRehabilitationTreatments` — מדד 1.8 טיפולים מקצועיים

**שימוש:** סטטוס יומי/שבועי — בלוק 1.8.

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationTreatment> GetRehabilitationTreatments(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationTreatment
{
    public DateTime Date { get; set; }
    public string ProfessionName { get; set; }
    public int TotalTreatments { get; set; }
    public decimal AvgPerPatientDay { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public bool WeekdayOnly { get; set; }
}
```

#### מקצועות נדרשים

| ProfessionName |
|----------------|
| פיזיותרפיה |
| ריפוי בעיסוק |
| קלינאות תקשורת |
| פסיכולוגיה |
| סיעוד שיקומי |

#### לוגיקה

- **טיפול** = רישום טיפול מקצועי למאושפז פעיל באשפוז שיקום.
- `AvgPerPatientDay` = `TotalTreatments / מאושפזים פעילים / ימים`.
- סטטוס שבועי: לסיכום שבועי — **רק ימי ג׳–ה׳** (`WeekdayOnly = true`).

---

## 3. סיכום

| מדד | WebMethod | סטטוס פרונט |
|-----|-----------|-------------|
| 1.3 תפוסה | `GetRehabilitationOccupancy` | **מחובר** |
| 1.4 קבלות – גורם משלם | `GetRehabilitationAdmissionsByPayer` | **מחובר** |
| 1.5 קבלות – פנים/חוץ | `GetRehabilitationAdmissionsByDirection` | **מחובר** (פרונט) · SQL ב-BACKEND_PROMPT |
| 1.6 יעדים מומלצים | `GetRehabilitationRecommendedTargets` | **מחובר** |
| 1.7 הכנסות נטו | `GetRehabilitationRevenueNet` | **מחובר** |
| 1.8 טיפולים מקצועיים | — | **בפיתוח** (אין API) |

> מדדים 2.1–2.8 (שיקום יום) — **לא נדרשים כרגע**. יתווספו במסמך נפרד.

---

## 4. קריטריוני קבלה

1. כל method רשום ב-`WebService.cs` עם `[WebMethod]` + `[OperationContract]`.
2. פרמטרים: `FromDate`, `ToDate` — `DateTime`, PascalCase ב-JSON.
3. `Date` ב-response: תמיכה ב-`/Date(ms)/` (ASMX).
4. רשימה ריקה `[]` — תקין, לא שגיאה.
5. בדיקת עשן לתפוסה:

```bash
POST /WebService.asmx/GetRehabilitationOccupancy
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

→ 3 שורות (גריאטריה, כללי, ילדים) עם `OccupiedPatients` > 0.

---

## 5. קבצי פרונט קשורים

| קובץ | תפקיד |
|------|--------|
| `rehabilitation-occupancy-api.service.ts` | קריאת API תפוסה |
| `rehabilitation-occupancy.mapper.ts` | מיפוי לגרף/טבלה |
| `rehabilitation-bed-capacity.constants.ts` | קיבולת מיטות + מיפוי שמות מחלקה |
| `rehabilitation-status.builder.ts` | מבנה בלוקים ריק לסטטוס (נתונים מ-API) |
