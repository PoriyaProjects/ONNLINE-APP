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

**שירות:** `NewbornDashboardDataService` — `HttpClient.post` + חילוץ `d`.

**חישוב בלקוח:** מגמה שבועית ו-KPI מסך כניסה — מ-`GetBirthDetails` + `GetBirthSummaryByYishuv`.

---

## הערה

רישום לידות (`#/newborn`) — APIs נפרדים, לא שייכים לדשבורד.
