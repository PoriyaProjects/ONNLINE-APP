# מסמך אפיון API — דשבורד שיקום (5 endpoints נוספים)

**גרסה:** 1.0  
**תאריך:** 11.08.2026  
**מצב:** טיוטה לפיתוח backend  
**צרכן:** Angular SPA — `/#/rehabilitation-dashboard`  
**מקור נתונים:** Chameleon (SQL Server)  
**API קיים (מחובר):** `GetRehabilitationOccupancy` — מדד **1.3 תפוסה**

---

## 1. כללים משותפים

### 1.1 פרוטוקול

| פרמטר | ערך |
|--------|-----|
| Base URL | `{environment.url}` → `WebService.asmx/` |
| Method | `POST` |
| Content-Type | `application/json` |
| Response wrapper | `{ "d": [...] }` (ASMX סטנדרטי) |
| תאריכים | `yyyy-MM-dd` (ISO), PascalCase בגוף הבקשה |

### 1.2 פרמטרי בקשה (משותפים לכל ה-endpoints)

```json
{
  "FromDate": "2026-08-11",
  "ToDate":   "2026-08-11"
}
```

| תצוגה | FromDate | ToDate |
|--------|----------|--------|
| סטטוס יומי | היום | היום (זהה) |
| סטטוס שבועי | היום − 6 | היום |
| דשבורד חודשי | 01.MM.YYYY | יום אחרון בחודש |
| דשבורד שנתי | 01.01.YYYY | 31.12.YYYY |

### 1.3 חתימת C# מומלצת (בדומה ל-1.3)

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByPayer> GetRehabilitationAdmissionsByPayer(
    DateTime FromDate, DateTime ToDate)
{
    return _RehabilitationService.GetAdmissionsByPayer(FromDate, ToDate);
}
```

### 1.4 מחלקות אשפוז שיקום (סינון אופציונלי)

| Unit / DepartmentName (Chameleon) | שם תצוגה | קיבולת 2026 |
|-----------------------------------|----------|-------------|
| המחלקה לגריאטריה שיקומית | גריאטריה שיקומית | 18 |
| מחלקת שיקום כללי | שיקום כללי | 35 |
| מחלקת שיקום ילדים | שיקום ילדים | 14 |

> אם אין סינון בבקשה — מחזירים את כל מחלקות השיקום. הפרונט מציג **רק** שלוש המחלקות לעיל.

### 1.5 טיפול בשגיאות

| מצב | התנהגות בפרונט |
|-----|----------------|
| שגיאת ASMX / רשת | fallback ל-mock data |
| רשימה ריקה | fallback ל-mock |
| הצלחה | גרף חי + טבלה + KPI |

---

## 2. API #1 — קבלות לפי גורם משלם

**מדד:** 1.4  
**Method:** `GetRehabilitationAdmissionsByPayer`

### בקשה

```
POST WebService.asmx/GetRehabilitationAdmissionsByPayer
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

### DTO

```csharp
public class RehabilitationAdmissionsByPayer
{
    public DateTime Date;
    public string PayerCategory;    // "קופת חולים" | "צה״ל + משרד הביטחון" | "אחר"
    public string PayerName;        // "כללית" | "מכבי" | "לאומית" | "מאוחדת" | ...
    public int AdmissionsCount;
    public int Unit;
    public string DepartmentName;
}
```

### כללי עסק

- קבלה חדשה = אירוע קבלה ראשון לאשפוז שיקום (לא העברה פנימית).
- קיבוץ `PayerCategory`: קופות חולים / צה״ל+מב״ט / אחר.
- נתח (%) מחושב בפרונט.

---

## 3. API #2 — קבלות פנים / חוץ

**מדד:** 1.5  
**Method:** `GetRehabilitationAdmissionsByDirection`

### DTO

```csharp
public class RehabilitationAdmissionsByDirection
{
    public DateTime Date;
    public string FunderName;       // "קופת חולים" | "צה״ל + משרד הביטחון" | "פרטי" | "ביטוח לאומי"
    public string Direction;        // "פנים" | "חוץ"
    public int AdmissionsCount;
    public int Unit;
    public string DepartmentName;
}
```

| Direction | הגדרה |
|-----------|--------|
| פנים | מטופל ממחלקה/אשפוז אחר **באותו בית חולים** |
| חוץ | מבית חולים אחר, ממיון, או מהקהילה |

---

## 4. API #3 — יעדים מומלצים

**מדד:** 1.6  
**Method:** `GetRehabilitationRecommendedTargets`

### DTO

```csharp
public class RehabilitationRecommendedTarget
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal ActualValue;
    public decimal TargetValue;
    public decimal Gap;
    public string MetricType;       // "תפוסה" | "ימי_אשפוז" | "קבלות"
    public string Status;           // "עומד ביעד" | "מתחת ליעד"
}
```

---

## 5. API #4 — הכנסות נטו

**מדד:** 1.7  
**Method:** `GetRehabilitationRevenueNet`

### DTO

```csharp
public class RehabilitationRevenueNet
{
    public DateTime Date;
    public int Unit;
    public string DepartmentName;
    public decimal RevenueAmount;   // ₪
    public decimal RevenuePerDay;
    public decimal SharePercent;
}
```

---

## 6. API #5 — טיפולים מקצועיים

**מדד:** 1.8  
**Method:** `GetRehabilitationTreatments`

### DTO

```csharp
public class RehabilitationTreatment
{
    public DateTime Date;
    public string ProfessionName;
    public int TotalTreatments;
    public decimal AvgPerPatientDay;
    public int Unit;
    public string DepartmentName;
    public bool WeekdayOnly;       // true = אמצע שבוע (ג׳–ה׳)
}
```

מקצועות: פיזיותרפיה, ריפוי בעיסוק, קלינאות תקשורת, פסיכולוגיה, סיעוד שיקומי.

---

## 7. סיכום endpoints

| # | מדד | Method | סטטוס |
|---|-----|--------|--------|
| 1.3 | תפוסה | `GetRehabilitationOccupancy` | **מחובר** |
| 1.4 | קבלות – גורם משלם | `GetRehabilitationAdmissionsByPayer` | נדרש |
| 1.5 | קבלות – פנים/חוץ | `GetRehabilitationAdmissionsByDirection` | נדרש |
| 1.6 | יעדים מומלצים | `GetRehabilitationRecommendedTargets` | נדרש |
| 1.7 | הכנסות נטו | `GetRehabilitationRevenueNet` | נדרש |
| 1.8 | טיפולים מקצועיים | `GetRehabilitationTreatments` | נדרש |

---

## 8. Acceptance Criteria

1. כל method ב-`WebService.cs` עם `[WebMethod]` — endpoint אחד לכל מדד.
2. פרמטרים: `FromDate`, `ToDate` (PascalCase).
3. Connection string: `ChameleonConnection`.
4. Response: `List<T>` עטוף ב-`{ d: [...] }`.
5. רשימה ריקה מותרת (לא שגיאה).
