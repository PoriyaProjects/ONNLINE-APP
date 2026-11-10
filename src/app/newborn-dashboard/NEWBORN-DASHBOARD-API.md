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
| `GetBirthStreetHeatmap` | `{ startDate, endDate, year, month, yishuv }` — `year`/`month` = `null` means all |
| `GetGeographicDemographicData` | `{}` — מחזיר נתוני אזורים מ-`ROEI.dbo.GeographicDemographicData` |

**מפת חום:** `NewBorn.GetBirthStreetHeatmap` + `[WebMethod] GetBirthStreetHeatmap` ב-`WebService.cs`. אותו `connetionString`. `endDate` לא נכלל. אם הקריאה נכשלת, המפה מציגה הדגמה מקומית ומסמנת זאת.

**שירות:** `NewbornDashboardDataService` — `HttpClient.post` + חילוץ `d`.

**חישוב בלקוח:** מגמה שבועית ו-KPI מסך כניסה — מ-`GetBirthDetails` + `GetBirthSummaryByYishuv`.
נתוני האזורים נטענים מ-`GetGeographicDemographicData`; ההיררכיה והסיכומים מחושבים מהשורות שהשרת מחזיר. הלידות בפועל מחושבות בנפרד מתוך הסיכום לפי היישוב והתקופה שנבחרה.

**הערת מדד:** `ילדים לאישה` הוא יחס בין מספר הילדים במאגר למספר הנשים בגיל ההולדה, ולא שיעור לידות שנתי.

---

## הערה

רישום לידות (`#/newborn`) — APIs נפרדים, לא שייכים לדשבורד.
