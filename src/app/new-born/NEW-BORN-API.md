# דשבורד לידות — API

`POST` → `http://srv-ipracticom:8080/WebService.asmx/{Method}` · תגובה ב-`d`

---

## ✅ קיים — רישום לידות (מחובר)

| Method | Request | Response |
|--------|---------|----------|
| `selectNewBornUsers` | `{}` | `[{UserID, UserName, UserFullName, CellNumber}]` |
| `SaveNewBornForm` | `{ _patientForm: NewBornRowTable }` | void |
| `GetNewBornTable` | `{ _pageIndex, _pageSize, _freeText, _fromDate, _toDate }` | `[{...שדות טבלה..., TotalRows}]` |
| `GetPersonalDetails` | `{ CaseNumber }` | פרטי אם (דרך `environment.urlipracticom`) |

**טבלה:** `NAMER.dbo.NewBorn` · **עובדים:** `EP_Employees` (מחלקה = חדרי לידה)

---

## ❌ חסר — דשבורד נתונים (כרגע Mock)

| Method | מטרה | Response מינימלי |
|--------|------|------------------|
| `GetBirthSummaryByYishuv` | סיכום + גרפים | `[{Year, Month, Yishuv, Births}]` |
| `GetBirthDetails` | פירוט לידות | `[{Year, PatientId, NewbornDob, City, PregnancyWeek, PregnancyDay, ...}]` |
| `GetPregnancyMonitoring` | מעקב הריון | `[{Year, Month, PatientId, City, VisitDate, Status, ...}]` |

**סינון משותף לשלושתם:**
```json
{ "startDate": "2022-01-01", "endDate": "2027-01-01", "year": null, "month": null, "yishuv": "", "status": "" }
```

---

## אופציונלי (אפשר לחשב בלקוח מסיכום)

| Method | מטרה |
|--------|------|
| `GetWeeklyBirthStats` | מסך כניסה — לידות השבוע + מגמה |
| `GetMonthlyBirthsByYear` | גרף חודשים — `{month, yearFrom, yearTo}` → `[{year, births}]` |

> אם יש רק `GetBirthSummaryByYishuv` — מסך כניסה וגרף חודשים יכולים לעבוד בחישוב צד-לקוח.

---

## WebService.asmx — להוסיף

```csharp
[WebMethod] public List<BirthSummaryRow> GetBirthSummaryByYishuv(string startDate, string endDate, int? year, int? month, string yishuv) { ... }
[WebMethod] public List<BirthDetailRow> GetBirthDetails(string startDate, string endDate, int? year, int? month, string yishuv) { ... }
[WebMethod] public List<PregnancyMonitoringRow> GetPregnancyMonitoring(string startDate, string endDate, int? year, int? month, string yishuv, string status) { ... }
```

**מיפוי פרונט:** `NewBornDataService` → להחליף `of(mock)` ב-`HttpClient.post`.
