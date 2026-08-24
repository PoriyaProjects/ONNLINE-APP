# Backend fixes — `RehabilitationOccupancyService.cs`

> **אל תשמור connection string בקוד** — העבר ל-`Web.config` / `ChameleonConnection`.  
> **אל ת commit סיסמה ל-git.**

---

## 1. Helper אחיד (חובה בכל method)

```csharp
private static DateTime ParseD(string s)
{
    if (string.IsNullOrWhiteSpace(s))
        throw new ArgumentException("Date required", nameof(s));
    return DateTime.ParseExact(s.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture);
}

private static void BindDateRange(SqlCommand command, string fromDate, string toDate)
{
    command.Parameters.Add("@FromDate", SqlDbType.Date).Value = ParseD(fromDate).Date;
    command.Parameters.Add("@ToDate", SqlDbType.Date).Value = ParseD(toDate).Date;
}
```

**החלף בכל method** את `DateTime.Parse(fromDate)` / `SqlDbType.DateTime` ב-`BindDateRange(command, fromDate, toDate)`.

| Method | היום | צריך |
|--------|------|------|
| `GetDailyOccupancy` | ✅ ParseD + SqlDbType.Date | — |
| `GetAdmissionsByPayer` | ❌ `DateTime.Parse` | `BindDateRange` |
| `GetAdmissionsByDirection` | ❌ `DateTime.Parse` + **DateTime** | `BindDateRange` |
| `GetRecommendedTargets` | ❌ `DateTime.Parse` | `BindDateRange` |
| `GetRevenueNet` | ❌ `DateTime.Parse` | `BindDateRange` |

`GetAdmissionsByDirection` על `NAMER.dbo.PATIENT_MONITORING` — **חייב** `@FromDate/@ToDate` כ-`DATE`, כמו ב-SSMS.

---

## 2. פרונט — BODY

```json
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

סטטוס יומי = **אתמול** (לא היום).

---

## 3. SSMS — מה להשוות למה

| SSMS (מהרצת) | API |
|--------------|-----|
| שאילתות 1–6 על `PATIENT_MONITORING` | `GetAdmissionsByDirection` |
| `Hospitalizations` + `SystemUnits` | `GetDailyOccupancy` |
| `MedicalRecords` DISTINCT | `GetAdmissionsByPayer` |

שאילתה 6 ב-SSMS ≈ `GetAdmissionsByDirection` **אחרי** `BindDateRange`.  
אם #6 מחזיר שורות וה-API `d:[]` → כמעט תמיד `DateTime.Parse` / culture על IIS.

---

## 4. `GetDailyOccupancy` — למה `OccupiedPatients = 0`

ה-SQL מחזיר **10 יחידות × יום** (גם עם 0 תפוסה). אם ה-API מחזיר שורות עם 0:

- בדוק ב-SSMS את **אותו SQL** של `GetDailyOccupancy` עם `@FromDate/@ToDate`.
- סנן `Hospitalizations` לפי תאריך שחרור/קבלה — לא אותו SQL כמו קבלות ב-`PATIENT_MONITORING`.

חשוד — `WHERE` אחרי `LEFT JOIN Patients`:

```sql
WHERE p.Patient IS NULL OR (p.Id_Num NOT LIKE '%999999%' AND ...)
```

שקול להעביר סינון בדיקות ל-`JOIN` על `Patients`, לא ל-`WHERE` עם `p.Patient IS NULL`.

---

## 5. `GetAdmissionsByDirection` — SQL מסונכרן ל-SSMS #6

הגרסה בשרת (LEFT JOIN + `mr.rn = 1`) תואמת לשאילתת debug #6.  
ודא ש-`WHERE a.rn = 1` קיים לפני `GROUP BY`.

---

## 6. DTO `RehabilitationOccupancy.Unit`

בשרת: `long Unit`. ב-JSON זה בסדר. הפרונט קורא `Number(Unit)`.

---

## 7. בדיקת עשן

```http
POST .../GetRehabilitationAdmissionsByDirection
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

צפוי (לפי SSMS #6): שורות עם `Direction` פנים/חוץ, `FunderName` קופות/צה״ל/פרטי/אחר.

```http
POST .../GetRehabilitationOccupancy
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

צפוי: עד 10 שורות (יחידות), `OccupiedPatients` ≥ 0.

---

## 8. פרונט — סינון 3 מחלקות

הפרונט מציג רק: גריאטריה שיקומית, שיקום כללי, שיקום ילדים (Units 85, 150685851, 49).  
10 היחידות מהשרת — normal; השאר נזרקות ב-mapper.
