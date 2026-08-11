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

| תצוגה בפרונט | FromDate | ToDate |
|--------------|----------|--------|
| סטטוס יומי | היום | היום |
| סטטוס שבועי | היום − 6 | היום |
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
    DateTime FromDate, DateTime ToDate)
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
public List<RehabilitationOccupancy> GetDailyOccupancy(DateTime fromDate, DateTime toDate)
```

---

### 2.2 `GetRehabilitationAdmissionsByPayer` — מדד 1.4 קבלות לפי גורם משלם ✅ מחובר

**שימוש:** סטטוס יומי/שבועי — בלוק 1.4.

#### סיווג Pay_Institute

| Pay_Institute | PayerCategory |
|---------------|---------------|
| 10, 11, 12, 13 | קופת חולים |
| 98 | צה״ל + משרד הביטחון |
| `NULL` / אחר | אחר (`PayerName` = `לא ידוע` אם אין שם במערכת) |

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

### 2.3 `GetRehabilitationAdmissionsByDirection` — מדד 1.5 קבלות פנים/חוץ

**שימוש:** סטטוס יומי/שבועי — בלוק 1.5.

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
    public string FunderName { get; set; }   // "קופת חולים" | "צה״ל + משרד הביטחון" | "פרטי" | "ביטוח לאומי"
    public string Direction { get; set; }    // "פנים" | "חוץ"
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}
```

#### לוגיקה

| Direction | הגדרה |
|-----------|--------|
| `פנים` | מטופל שהגיע ממחלקה/אשפוז אחר **באותו בית חולים** |
| `חוץ` | מבית חולים אחר, ממיון, או מהקהילה |

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
    public string MetricType { get; set; }     // "תפוסה" (ברירת מחדל)
    public string Status { get; set; }         // "עומד ביעד" | "מתחת ליעד"
}
```

#### לוגיקה

- שורה לכל מחלקת שיקום (3 מחלקות).
- `ActualValue` — תפוסה בפועל בטווח (יום: נקודתית, שבוע: ממוצע).
- `TargetValue` — מטבלת יעדים / פרמטר מערכת.
- `Gap >= 0` → `עומד ביעד`, אחרת → `מתחת ליעד`.

---

### 2.5 `GetRehabilitationRevenueNet` — מדד 1.7 הכנסות נטו

**שימוש:** סטטוס יומי/שבועי — בלוק 1.7 + דשבורד (עתידי).

#### חתימה

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationRevenueNet> GetRehabilitationRevenueNet(
    DateTime FromDate, DateTime ToDate)
```

#### מודל

```csharp
public class RehabilitationRevenueNet
{
    public DateTime Date { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
    public decimal RevenueAmount { get; set; }    // ₪ — סכום נטו בטווח
    public decimal RevenuePerDay { get; set; }    // RevenueAmount / מספר ימים
    public decimal SharePercent { get; set; }   // אופציונלי — ניתן לחשב בפרונט
}
```

#### לוגיקה

- **מחיר נטו** לפי הגדרת הנהלת חשבונות.
- שורה לכל מחלקה × תקופה.

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
| 1.5 קבלות – פנים/חוץ | `GetRehabilitationAdmissionsByDirection` | mock |
| 1.6 יעדים מומלצים | `GetRehabilitationRecommendedTargets` | mock |
| 1.7 הכנסות נטו | `GetRehabilitationRevenueNet` | mock |
| 1.8 טיפולים מקצועיים | `GetRehabilitationTreatments` | mock |

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
| `rehabilitation-status.mock-data.ts` | fallback ל-1.4–1.8 |
