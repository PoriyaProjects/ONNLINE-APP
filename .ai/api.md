# API Reference

## סקירה

כל ה-APIs נגישים מה-Angular דרך `HttpClient`. אין OpenAPI/Swagger ב-repository.

### בסיסי URL

| סביבה | `environment.url` | `environment.AuthUrl` | `environment.urlipracticom` |
|-------|-------------------|---------------------|----------------------------|
| Dev | `http://localhost:64964/WebService.asmx/` | אותו דבר | אותו דבר |
| Prod | `http://srv-apps-prod:999/WebService.asmx/` | `http://srv-apps-prod:47001/api/` | `http://srv-ipracticom:8080/WebService.asmx/` |
| Test | `http://srv-apps-test/RCF_WS/WebService.asmx/` | `http://srv-apps-test:47001/api/` | `http://srv-ipracticom:8080/WebService.asmx/` |

### פורמט בקשה/תגובה (ASMX)

```
POST {url}{MethodName}
Content-Type: application/json

{ "param1": value, ... }

Response: { "d": <payload> }
```

### אימות

- **אין Bearer token** ב-HTTP headers.
- Session ב-`localStorage` (`loginUserName`, `ID`).
- NPS שולח `user_id` (EmployeeID) בכל בקשה.
- `AuthUrl` משמש ל-SSO: `GET {AuthUrl}Authentication` עם `withCredentials: true`.

### שגיאות

- אין טיפול מרכזי בשגיאות HTTP.
- רוב הקומפוננטות מטפלות ב-`subscribe` error callback או לא מטפלות כלל.
- ASMX מחזיר `"TRUE"` / `"FALSE"` ל-Login.

---

## אימות (Authentication)

| Method | HTTP | URL | Body | Response | מטרה |
|--------|------|-----|------|----------|------|
| Authentication | GET | `{AuthUrl}Authentication` | — | `{ message: "DOMAIN\\user" }` | SSO Windows |
| Login | POST | `{url}Login` | `{ _userName, _mPassword }` | `"TRUE - ..."` / שגיאה | התחברות ידנית |
| GetUserFullNameByUserID | POST | `{url}GetUserFullNameByUserID` | `{ userID }` | פרטי עובד | טעינת פרופיל |
| GetPermLinkForUser | POST | `{url}GetPermLinkForUser` | `{ UserName, RoutName }` | `boolean` | הרשאת route |
| LinksLog | POST | `{url}LinksLog` | `{ usaerName, linkId }` | — | לוג ניווט |
| GetLoginUserDetails | POST | `{url}GetLoginUserDetails` | `{}` | פרטי משתמש | דשבורד |

**קובץ:** `src/app/login/login.component.ts`, `src/app/login/authentication.service.ts`

---

## Dashboard (Hub מרכזי)

| Method | Body עיקרי | מטרה |
|--------|------------|------|
| `GetOnnLineLinksToSearch` | `{}` | חיפוש קישורים |
| `GetShortCutsLinks` | `{ userName }` | קיצורי דרך |
| `GetFoldersLinks` | `{ userName }` | תיקיות |
| `GetBirthDayPeople` | `{ date }` | ימי הולדת |
| `AskAIRequestData` | `{ question, ... }` | שאילתת AI |
| `AskAIResponseData` | `{ requestId }` | תשובת AI |
| `AIUserFeedBack` | `{ feedback }` | משוב AI |
| `GetAWSClaudeConfiguration` | `{}` | הגדרות Claude |
| `SendNotificationToWhatsApp` | `{ ... }` | WhatsApp |
| `SaveClickToDB` | `{ linkId }` | לוג קליק |
| `OpenLM` | `{}` | פתיחת LM |
| `GetFeedLineContent` | `{}` | פיד |
| `UpdateFeedLineContent` | `{ content }` | עדכון פיד |
| `GetFoldersToManagement` | `{}` | ניהול תיקיות |
| `AddFoldersToManagement` | `{ folder }` | הוספת תיקייה |
| `UpdateFoldersToManagement` | `{ folder }` | עדכון תיקייה |
| `DeleteFoldersToManagement` | `{ id }` | מחיקת תיקייה |

**קובץ:** `src/app/dashboard/dashboard.component.ts`

---

## NPS (Nurses Permissions System)

כל ה-methods מתחילים ב-`Nps` ונקראים דרך `NpsBaseApiService`.

**קובץ:** `src/app/nps-permissions/services/nps-base-api.service.ts`

| Method | Body עיקרי | Response | מטרה |
|--------|------------|----------|------|
| `NpsGetDashboardSummary` | `{ user_id }` | `NpsDashboardSummary` | סיכום דשבורד |
| `NpsGetAccessContext` | `{ user_id }` | `NpsAccessContext` | הרשאות UI |
| `NpsGetEmployees` | `{ user_id, skip, take, search }` | `NpsEmployeeListRow[]` | רשימת עובדים |
| `NpsGetEmployee` | `{ user_id, employeeId }` | `NpsEmployeeDetail` | פרטי עובד |
| `NpsGetEmployeeEducations` | `{ user_id, employeeId }` | educations | השכלות |
| `NpsGetEmployeeCurrentProfile` | `{ user_id, employeeId }` | profile | פרופיל נוכחי |
| `NpsGetEmployeeRequests` | `{ user_id, employeeId }` | requests | בקשות עובד |
| `NpsGetEmployeeAssignments` | `{ user_id, employeeId }` | assignments | שיוכים |
| `NpsResolveEmployeeProfile` | `{ user_id, employeeId }` | profile | פתרון פרופיל |
| `NpsCreateEmployeeRequest` | `{ user_id, employeeId }` | `{ RequestID }` | יצירת בקשה |
| `NpsGetEducations` | `{ user_id }` | catalog | קטלוג השכלה |
| `NpsGetSpecialties` | `{ user_id, educationId }` | catalog | התמחויות |
| `NpsGetPermissions` | `{ user_id }` | permissions | הרשאות |
| `NpsGetActions` | `{ user_id }` | actions | פעולות |
| `NpsGetDepartmentActions` | `{ user_id, departmentCode }` | rows | פעולות מחלקה |
| `NpsPutDepartmentActions` | `{ user_id, departmentCode, body }` | — | עדכון פעולות |
| `NpsGetProfiles` | `{ user_id }` | profiles | פרופילים |
| `NpsGetProfile` | `{ user_id, id }` | profile | פרופיל בודד |
| `NpsGetProfilePermissions` | `{ user_id, id }` | permissions | הרשאות פרופיל |
| `NpsPutProfilePermissions` | `{ user_id, id, body }` | — | עדכון הרשאות |
| `NpsGetProfileRules` | `{ user_id }` | rules | כללי פרופיל |
| `NpsPostProfileRule` | `{ user_id, body }` | `{ RuleID }` | יצירת כלל |
| `NpsPutProfileRule` | `{ user_id, id, body }` | — | עדכון כלל |
| `NpsDeleteProfileRule` | `{ user_id, id }` | — | מחיקת כלל |
| `NpsGetRequests` | `{ user_id, status, skip, take }` | requests | כל הבקשות |
| `NpsGetRequest` | `{ user_id, RequestID }` | detail | פרטי בקשה |
| `NpsGetMyApprovals` | `{ user_id }` | requests | אישורים שלי |
| `NpsGetMyRequests` | `{ user_id }` | requests | בקשות שלי |
| `NpsGetPermissionApprovalGrid` | `{ user_id, employeeId, ... }` | grid | רשת אישורים |
| `NpsGetManagerApprovalSummary` | `{ user_id, managerId }` | summary | סיכום מנהל |
| `NpsCreatePermissionRequestFromRule` | `{ user_id, employeeId, ruleId }` | — | בקשה מכלל |
| `NpsSetPermissionItemApproval` | `{ user_id, itemId, stepNo, approved }` | — | אישור פריט |
| `NpsSetPermissionItemsApproval` | `{ user_id, approvals[] }` | batch | אישור מרובה |
| `NpsApproveRequest` | `{ user_id, RequestID, body }` | — | אישור בקשה |
| `NpsRejectRequest` | `{ user_id, RequestID, body }` | — | דחיית בקשה |
| `NpsGetAssignments` | `{ user_id, ... }` | assignments | שיוכים |
| `NpsApplyEmployeeProfileAssignment` | `{ user_id, ... }` | — | החלת שיוך |
| `NpsGetAudit` | `{ user_id, entityType, skip, take }` | audit rows | ביקורת |
| `NpsProcessQueue` | `{ user_id, maxItems }` | — | עיבוד תור (admin) |
| `NpsPostProfile` / `NpsPutProfile` | `{ user_id, body }` | — | CRUD פרופיל |
| `NpsPostEducation` / `NpsPutEducation` | `{ user_id, body }` | — | CRUD השכלה |
| `NpsPostSpecialty` / `NpsPutSpecialty` | `{ user_id, body }` | — | CRUD התמחות |
| `NpsPostPermission` / `NpsPutPermission` | `{ user_id, body }` | — | CRUD הרשאה |
| `NpsPostAction` / `NpsPutAction` | `{ user_id, body }` | — | CRUD פעולה |
| `NpsGetDepartments` | `{ user_id }` | departments | מחלקות |

**מודלים:** `src/app/nps-permissions/models/nps.models.ts`

---

## דשבורדים — בית חולים

### Cath Lab (`hospital-cath-dashb`)

| Method | סוג | מטרה |
|--------|-----|------|
| `GetCathCombined` | POST | נתוני צנתור משולבים |
| `GetIncomeDataCombined` | POST | הכנסות |
| `GetExploitationCombined` | POST | ניצול |
| `GetExploitationMonthlyCombined` | POST | ניצול חודשי |
| `GetPicDetailedDataCombined` | POST | PIC מפורט |
| `GetMonthWorkDays` | POST | ימי עבודה |

### הכנסות (`hospital-income-dashb`)

| Method | מטרה |
|--------|------|
| `GetChargingChartMonthlyDataEExx` | גבייה חודשית |
| `GetChargingIncomeMonthly` | הכנסות חודשיות |
| `GetCurrentCath` | צנתור נוכחי |
| `GetYearlyIncomeFYData` | הכנסה שנתית |
| `GetChargingGrouspData` | קבוצות גבייה |

### הכנסות NB (`hospital-incomenb-dashb`)

| Method | HTTP | מטרה |
|--------|------|------|
| `GetChargingIncome` | GET | נתוני גבייה |

### תורים (`hospital-appoints-dashb`, `hospital-appointscl-dashb`)

| Method | מטרה |
|--------|------|
| `GetAppointments` | זמני המתנה |
| `GetAppointmentscl` | תורים CL |

### חדרי ניתוח (`hospital-roomtime-*-dashb`)

| Method | מטרה |
|--------|------|
| `GetRoomAggregateDaysD` | צבירה יומית |
| `GetRoomTimeAvgD` | ממוצע זמן |
| `GetRoomTimeSummaryAllSeparated` | סיכום |
| `GetSurgeryRooms` | רשימת חדרים |
| `GetSurgeryRoomsByDate` | חדרים לפי תאריך |

### BI כללי (`hospital-bi-dashboard`)

| Method | מטרה |
|--------|------|
| `GetTableViewForHospitalDashboard` | טבלת KPI |
| `GetStatsValues` | ערכי סטטיסטיקה |
| `GetHospitalDepartmentsTableChartList` | מחלקות |
| `LineBarChart` | גרף קו/עמודות |
| `TfosaDashBoardAppRefoee` | טונאז' |

### CL Dashboard (`cldashboard`)

| Method | מטרה |
|--------|------|
| `GetChargingChartData` | גרף גבייה |
| `GetIncome` | הכנסות |
| `GetCath` | צנתור |
| `GetIncomeData` | נתוני הכנסה |
| `GetExploitation` | ניצול |
| `GetDepartmentList` | מחלקות |
| `GetTimeTypes` | סוגי זמן |

---

## דשבורדים — ניתוחים

### הכנסות (`surgeries-revenue-api.service.ts`)

| Method suffix | מטרה |
|---------------|------|
| `GetRevenueByProcedureFiveYears_surgeries_revenue_dashborad` | הכנסה לפי פרוצדורה |
| `GetRevenueByDeptFiveYears_*` | לפי מחלקה |
| `GetRevenueByMonth_*` | חודשי |
| `GetRevenueFilterOptions_*` | אפשרויות סינון |
| `GetRevenueStackedComposite_*` | גרף מורכב |
| `GetServicePerformed_*` | שירותים שבוצעו |

### זמני המתנה (`surgeries-wait-times-api.service.ts`)

`GetRecommendationsYearly`, `GetRecommendationsMonthly`, `GetRecommendationsByDepartment`, `GetTopRecommendedProcedures`, `GetEmergencyReplacementAnalysis`, `GetRecommendationBacklog`, `GetRecommendationAgingBuckets`

### ביטולים (`surgeries-cancellations-api.service.ts`)

`GetCancellationsYearly`, `GetCancellationsMonthly`, `GetTopCancellationReasons`, `GetRoomOutcome`

---

## דשבורדים נוספים

| Feature | Methods עיקריים |
|---------|-----------------|
| Hito Forms | `GetHitoFormsDashboardStats`, `GetHitoFormsChartData`, `GetHitoQuestionScores` |
| Imaging | `GetImagingPerformanceDashboard`, `GetImagingOutpatientPerformanceDashboard` |
| Quality Measures | `GetAllQualityMeasuresList`, `GetAllQualityMeasuresDepartmentsList` |
| MRI Schedule | `GetMriScheduling`, `UpdateMriPattern`, `GetMriOrderDetails` |

---

## WebMethods נוספים (Legacy — בקומפוננטות)

מאות WebMethods נקראים ישירות מקומפוננטות. דוגמאות לפי דומיין:

| דומיין | Methods |
|--------|---------|
| COVID | `GetAllSarscov2`, `SubmitCovid19Report`, `GetAllReporting` |
| מחקרים | `GetResearchesTable`, `InsertOrUpdateResearches`, `getResearchPermission` |
| SMS | `SendSMSOnLine`, `SendSMSOnLineAdmin`, `GetMessagesTemp` |
| Cortinas | `GetCortinasAlerts`, `ChangeCortinasDate`, `SubmitCortinasDepart` |
| מטופלים | `findPatientByIDToCreateNewMove`, `createMovmentAtPatientMovment` |
| סקרים | `GetPolls` |
| איכות | `GetAllQualityMeasuresListToTableByParameters` |

**חיפוש:** `grep "environment.url +" src/app/` למציאת כל הקריאות.

---

## עדכון אחרון

נוצר: 2026-07-05. יש לעדכן כשמתווספים Services או WebMethods חדשים.
