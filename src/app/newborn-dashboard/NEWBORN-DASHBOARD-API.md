# דשבורד לידות — API

**Route:** `#/newborn-dashboard` · **קומפוננטה:** `app-newborn-dashboard` (נפרדת לגמרי מ-`#/newborn`)

`POST` → `http://srv-ipracticom:8080/WebService.asmx/{Method}` · תגובה ב-`d`

---

## ❌ חסר — דשבורד (כרגע Mock)

| Method | מטרה | Response |
|--------|------|----------|
| `GetBirthSummaryByYishuv` | סיכום + גרפים | `[{Year, Month, Yishuv, Births}]` |
| `GetBirthDetails` | פירוט לידות | `[{Year, PatientId, NewbornDob, City, PregnancyWeek, ...}]` |
| `GetPregnancyMonitoring` | מעקב הריון | `[{Year, Month, PatientId, City, VisitDate, Status, ...}]` |

```json
{ "startDate": "2022-01-01", "endDate": "2027-01-01", "year": null, "month": null, "yishuv": "", "status": "" }
```

**אופציונלי:** `GetWeeklyBirthStats`, `GetMonthlyBirthsByYear` — ניתן לחשב מסיכום.

**שירות:** `NewbornDashboardDataService` → להחליף Mock ב-`HttpClient.post`.

---

## הערה

רישום לידות (`selectNewBornUsers`, `SaveNewBornForm`, `GetNewBornTable`) שייך לקומפוננטה הישנה `#/newborn` — לא לדשבורד.
