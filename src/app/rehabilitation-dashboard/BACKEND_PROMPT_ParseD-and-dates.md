# Backend: ParseD + תאריכים — למה SSMS מחזיר שורות וה-API `d:[]`

## הבעיה

ב-SSMS:

```sql
DECLARE @FromDate DATE = '2026-08-11';
DECLARE @ToDate   DATE = '2026-08-11';
-- SELECT ... → 2 שורות
```

ב-API עם `{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }` → `{"d":[]}`.

**זה לא אותו דבר** עד ש-ParseD, סוג הפרמטר, וה-SQL זהים.

---

## 1. תיקון `ParseD` (חובה)

ב-`RehabilitationOccupancyService.cs`:

```csharp
using System.Globalization;

private static DateTime ParseD(string s)
{
    if (string.IsNullOrWhiteSpace(s))
        throw new ArgumentException("Date is required", nameof(s));

    return DateTime.ParseExact(
        s.Trim(),
        "yyyy-MM-dd",
        CultureInfo.InvariantCulture,
        DateTimeStyles.None);
}
```

**לא** `dd/MM/yyyy`. **לא** `DateTime.Parse` חופשי. **לא** `/Date(ms)/`.

---

## 2. פרמטרי SQL — כמו SSMS `DATE`

```csharp
private static void AddDateRangeParameters(SqlCommand command, string fromDate, string toDate)
{
    var from = ParseD(fromDate);
    var to = ParseD(toDate);

    command.Parameters.Add("@FromDate", SqlDbType.Date).Value = from.Date;
    command.Parameters.Add("@ToDate", SqlDbType.Date).Value = to.Date;
}
```

**לא** `SqlDbType.DateTime` עם `DateTime.Now` או `MinValue`.

---

## 3. WebMethod — `string`, לא `DateTime`

```csharp
[WebMethod]
public List<RehabilitationOccupancy> GetRehabilitationOccupancy(string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetDailyOccupancy(FromDate, ToDate);
}

[WebMethod]
public List<RehabilitationAdmissionsByDirection> GetRehabilitationAdmissionsByDirection(
    string FromDate, string ToDate)
{
    return _RehabilitationOccupancyService.GetAdmissionsByDirection(FromDate, ToDate);
}
```

הפרונט שולח **מחרוזות** `"2026-08-11"`. אם החתימה `DateTime` — ה-deserializer עלול לשבור לפני `ParseD`.

---

## 4. בדיקת SSMS — אותו SQL כמו ב-C#

אל תשווה SELECT קצר ל-API מלא. הדבק **בדיוק** את ה-query מ-`GetAdmissionsByDirection` / `GetDailyOccupancy`:

```sql
DECLARE @FromDate DATE = '2026-08-11';
DECLARE @ToDate   DATE = '2026-08-11';

-- הדבק כאן את כל ה-query מהשירות (כולל CTE, rn=1, GROUP BY)
```

אם גם כאן 0 שורות — הבעיה ב-SQL.  
אם SSMS מחזיר שורות וה-API לא — הבעיה ב-ParseD / connection string / endpoint אחר.

---

## 5. endpoint ≠ ה-SQL שבדקת

| בדיקה ב-SSMS | API |
|--------------|-----|
| `PATIENT_MONITORING` + קבלות | `GetRehabilitationAdmissionsByDirection` |
| תפוסה / מאושפזים | `GetRehabilitationOccupancy` → `GetDailyOccupancy` (SQL **אחר**) |

שאילתת קבלות ב-SSMS **לא** אמורה להחזיר את אותן שורות כמו תפוסה.

---

## 6. דיבוג מהיר בשרת

```csharp
public List<RehabilitationOccupancy> GetDailyOccupancy(string fromDate, string toDate)
{
    var from = ParseD(fromDate);
    var to = ParseD(toDate);
    System.Diagnostics.Debug.WriteLine(
        $"GetDailyOccupancy raw=({fromDate},{toDate}) parsed=({from:yyyy-MM-dd},{to:yyyy-MM-dd})");
    // ...
}
```

אם `parsed=(0001-01-01,...)` — ParseD עדיין שבור.

---

## 7. פרונט (Angular)

שולח:

```json
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

סטטוס יומי = **אתמול** (לא היום). ב-Network tab ודא שהתאריך תואם למה שרצית ב-SSMS.

---

## 8. Connection string

`connetionString` / `ChameleonConnection` ב-IIS **חייב** להצביע על אותו SQL Server ו-DB כמו ב-SSMS שבו ראית 2 שורות.
