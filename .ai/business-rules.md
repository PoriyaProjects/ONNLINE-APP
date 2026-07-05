# כללי עסק (Business Rules)

## אימות והרשאות

### התחברות
1. **SSO אוטומטי:** בטעינת דף Login, המערכת מנסה `GET Authentication` עם cookies של Windows.
2. **התחברות ידנית:** `Login` עם `_userName` ו-`_mPassword`. תשובה `"TRUE"` = הצלחה.
3. **Session:** נשמר ב-`localStorage` — אין JWT או refresh token.
4. **הצגת UI:** Header/Footer מוצגים רק כש-`loginState === "true"` ו-`loginUserName` לא ריק.

### הרשאות Route
- כל route יכול לבדוק הרשאה דרך `MenuPerm.setRoutName()` → `GetPermLinkForUser`.
- התוצאה: `boolean` — אין רמות הרשאה מפורטות ב-Frontend.
- **NPS Configuration:** רק `isGlobalAdmin` או מנהל (Manager1/Manager2) של לפחות עובד אחד (`canAccessNpsConfiguration`).

---

## NPS — מערכת הרשאות אחיות

### זיהוי משתמש
- כל קריאת NPS חייבת `user_id` = `EmployeeID` מ-`localStorage.ID`.
- Admin גלובלי: מוגדר ב-`NpsGlobalAdminEmployeeIds` ב-`Web.config` (שרת).

### זרימת אישורים
1. סדר קשיח: **Manager1 → Manager2 → Employee**.
2. רק המאשר של השלב הנוכחי יכול לאשר/לדחות.
3. `NpsApproveRequest` / `NpsRejectRequest` — אישור/דחייה ברמת בקשה.
4. `NpsSetPermissionItemApproval` — אישור ברמת פריט בודד.

### פתרון פרופיל (Profile Resolution)
- מבוסס על: מחלקה + השכלה + התמחות (tiers).
- בחירת פרופיל עם **Priority הנמוך ביותר** כשיש כמה התאמות.
- מימוש: `NpsProfileResolutionService` (שרת).

### תור שינויי מחלקה
- שינוי `DepartnentCode` מכניס שורה ל-`NPS.DepartmentChangeQueue`.
- `NpsProcessQueue` מעבד שורות `Pending` ויוצר בקשות אישור.
- חייב לרוץ מתוזמן (Task Scheduler / SQL Agent) — לא אוטומטי מה-UI בלבד.

### יצירת בקשות
- `NpsCreateEmployeeRequest` — בקשה כללית לעובד.
- `NpsCreatePermissionRequestFromRule` — בקשה מכלל פרופיל ספציפי.

---

## Dashboard מרכזי

### קיצורי דרך ותיקיות
- קיצורים אישיים לפי `loginUserName`.
- ניהול תיקיות: CRUD דרך `GetFoldersToManagement`, `AddFoldersToManagement` וכו'.
- לוג קליקים: `SaveClickToDB`, `LinksLog`.

### עוזר AI
1. `AskAIRequestData` — שליחת שאלה.
2. `AskAIResponseData` — קבלת תשובה (async).
3. `AIUserFeedBack` — משוב משתמש.
4. הגדרות מ-AWS Claude: `GetAWSClaudeConfiguration`.

### פיד (Feed Line)
- תוכן גלובלי: `GetFeedLineContent` / `UpdateFeedLineContent`.

---

## דשבורדים — כללי תצוגה

### דפוס כללי
- רוב הדשבורדים: בחירת טווח תאריכים + מחלקה → טעינת charts.
- תגובות ASMX לעיתים `responseType: 'text'` — יש לבצע `JSON.parse`.
- Unwrap: `response['d']` או `response.d`.

### Hospital BI
- `GetStatsValues` — KPI מרכזיים.
- `GetTableViewForHospitalDashboard` — טבלה מרכזית.
- Charts דינמיים לפי URL method name.

### Cath Lab
- נתונים משולבים (`*Combined`) — מפחיתים קריאות HTTP מרובות.

### הכנסות (Income)
- גבייה חודשית, שנתית, לפי קבוצות.
- `GetChargingIncome` (NB) — GET ישיר.

### חדרי ניתוח (Room Time)
- ממוצע זמן, צבירה יומית, סיכום לפי חדר.
- `GetSurgeryRoomsByDate` — פילטר לפי תאריך.

### ניתוחים — Revenue
- הכנסה לפי פרוצדורה, מחלקה, חודש — 5 שנים אחורה.
- פילטרים דינמיים: `GetRevenueFilterOptions_*`.

### ניתוחים — Wait Times
- המלצות לניתוח: שנתי, חודשי, לפי מחלקה.
- ניתוח backlog ו-aging buckets.

### ניתוחים — Cancellations
- ביטולים שנתי/חודשי, סיבות מובילות, תוצאות חדר.

---

## לוח ניתוחים — מחירון (Surgery Calendar)

### חיוב לניתוח עם מספר פרוצדורות
- **חיוב אחד לחלון ניתוח:** מחושב לפי **המחירון הגבוה ביותר** מבין הפרוצדורות (`SurgeriesCalendar_Susgeries`) — **לא סכום**.
- **שרת:** `GetSurgeriesRoomPricesBySurgeryRoomCode` חייב להשתמש ב-`MAX` ולא ב-`SUM` ב-`pricesString`. ראה `src/app/surgery-calendar/BACKEND_PROMPT_GetSurgeriesRoomPricesBySurgeryRoomCode.md`.
- **מחירון לכל פרוצדורה:** שדה `SurgeryProcedurePrices` (מפתח `scs.Row_ID`) — נדרש בשרת לתצוגה בטבלה.
- **ססיה בהכנסה לחדר:** `ססיה`, `ססיה - אשפוז` וכל `SurgeryType` שמתחיל ב-`ססיה` — לא נכללים ב"סה״כ הכנסה לחדר ביום".

---

| טופס | כללים עיקריים |
|------|---------------|
| CPR | טפסי החייאה, דשבורד יילודים |
| Tumor Board | ועדת גידולים |
| Bedsore | פצעי לחץ |
| Bone Marrow | שתל מח עצם |
| Training Request | בקשות הדרכה |
| Commercial Support | בקשות תמיכה מסחרית — חלק נשמר ב-iPracticom |

---

## COVID-19

- מעקב תוצאות: `GetAllSarscov2`, `GetAllSarscov2Results`.
- דיווח: `SubmitCovid19Report`, `GetAllReporting`.
- טפסים: coronaform, coronavaccine, fast-covid19-test.

---

## מטופלים ותנועות

- `findPatientByIDToCreateNewMove` — איתור מטופל ליצירת תנועה.
- `createMovmentAtPatientMovment` — יצירת תנועה.
- `GetPersonalDetailsFromDB` — פרטים אישיים.

---

## Cortinas (קיבולת)

- התראות: `GetCortinasAlerts`.
- עדכון תאריכים: `ChangeCortinasDate`.
- הגשת מחלקות/חדרים/מיטות: `SubmitCortinasDepart*`.

---

## תקשורת

### SMS
- `SendSMSOnLine` — משתמש רגיל.
- `SendSMSOnLineAdmin` — מנהל, עם תבניות (`GetMessagesTemp`).

### WhatsApp
- `SendNotificationToWhatsApp` — מהדשבורד.

### Email
- ניהול מיילים: `emailsdashboard`, `emailmanagement`.
- פניות ציבור: `public-inquiries-charts`.

---

## מחקרים

- הרשאות: `getResearchPermission`.
- CRUD: `InsertOrUpdateResearches`, `GetResearchesTable`.
- משתמשים ומטופלים במחקר: טבלאות נפרדות.

---

## איכות (Quality Measures)

- רשימה מלאה: `GetAllQualityMeasuresList`.
- לפי פרמטרים: `GetAllQualityMeasuresListToTableByParameters`.
- מחלקות: `GetAllQualityMeasuresDepartmentsList`.

---

## Hito Forms (שביעות רצון)

- בחירת שאלון ושנה → `GetHitoFormsDashboardStats`.
- Charts: `GetHitoFormsChartData`, `GetHitoQuestionScores`.
- פירוט תשובות: `GetHitoAnswerScoreRowsByQuestion`.

---

## Imaging Performance

- ביצועי הדמיה: `GetImagingPerformanceDashboard`.
- אמבולטורי: `GetImagingOutpatientPerformanceDashboard`.

---

## MRI Schedule

- לוח זמנים: `GetMriScheduling`.
- עדכון תבנית: `UpdateMriPattern`.
- פרטי הזמנה: `GetMriOrderDetails`.

---

## Income Importer

- Cache מקומי ב-`localStorage` דרך `department-income-local-cache.service.ts`.
- לא תלוי ב-HTTP לשמירת cache.

---

## לוגיקת ולידציה (Frontend)

- רוב הטפסים: Reactive Forms או template-driven ללא ולידציה מרכזית.
- NPS: ולידציה בשרת — Frontend שולח DTOs.
- Login: בדיקת `username && password` לפני שליחה.

---

## עדכון אחרון

נוצר: 2026-07-05. יש לעדכן כשנוספת לוגיקה עסקית חדשה.
