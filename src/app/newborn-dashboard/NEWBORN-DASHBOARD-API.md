# דשבורד לידות — API

**Route:** `#/newborn-dashboard` · **Base:** `environment.urlipracticom`

`POST` → `{urlipracticom}{Method}` · תגובה ב-`d`

---

## ✅ מחובר

| Method | Request |
|--------|---------|
| `GetBirthSummaryByYishuv` | `{ startDate, endDate, year, month, yishuv }` |
| `GetBirthDetails` | `{ startDate, endDate, year, month, yishuv }` |
| `GetPregnancyMonitoring` | `{ startDate, endDate, year, month, yishuv, status }` |
| `GetBirthStreetHeatmap` | `{ startDate, endDate, year, month, yishuv }` — `year`/`month` = `0` means all |

**מפת חום:** `GetBirthStreetHeatmap.server.cs` — להדביק ב-`App_Code`, ואז WebMethod אחד בתוך `WebService` (מתועד בראש הקובץ). בלי משתני סביבה חדשים. אם הקריאה נכשלת, המפה מציגה הדגמה מקומית ומסמנת זאת.

**שירות:** `NewbornDashboardDataService` — `HttpClient.post` + חילוץ `d`.

**חישוב בלקוח:** מגמה שבועית ו-KPI מסך כניסה — מ-`GetBirthDetails` + `GetBirthSummaryByYishuv`.

---

## הערה

רישום לידות (`#/newborn`) — APIs נפרדים, לא שייכים לדשבורד.
