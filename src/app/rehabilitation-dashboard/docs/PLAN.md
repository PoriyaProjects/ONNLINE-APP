# תוכנית השלמת שרת — דשבורד שיקום

> מצב ענף: `cursor/work-branch-114e` · פרוטוקול: ASMX `WebService.asmx` · `{ "d": [...] }`  
> חוזה תאריכים: `FromDate`/`ToDate` כמחרוזות `yyyy-MM-dd` (ראה `README.md`)  
> **קוד C# מוכן לשרת:** `docs/RehabilitationOccupancyService.cs` · WebMethods להדבקה: `docs/WebService-Rehabilitation-NEW-ONLY.cs` · תיקוני קומפילציה: `docs/BACKEND-FIX-NOTES.md`

---

## 1. מטרה

דשבורד שיקום מלא — **סטטוס יומי/חודשי** + **תצוגת דשבורד** לכל מדדי אשפוז (1.1–1.8) ושיקום יום (2.1–2.8), ללא placeholder / mock.

**מצב נוכחי:** 16 WebMethods — 1.3–1.7 כבר בשרת ~6844; 10 חדשים ב-`WebService-Rehabilitation-NEW-ONLY.cs` (1.1, 1.2, 1.8, 2.1–2.8); 1.3–1.7 מחוברים בפרונט; **1.8 לא מחובר** (`REHAB_API_STATUS_BLOCK_CODES` ללא `'1.8'`); 1.1–1.2 ו-2.x — stubs (`d:[]`) עד SQL.

---

## 2. WebMethods — רשימה מלאה (16)

| מדד | WebMethod | Service method | DTO | מצב |
|-----|-----------|----------------|-----|-----|
| 1.1 | `GetRehabilitationHospitalizationDays` | `GetHospitalizationDays` | `RehabilitationHospitalizationDays` | stub |
| 1.2 | `GetRehabilitationAvgLengthOfStay` | `GetAvgLengthOfStay` | `RehabilitationAvgLengthOfStay` | stub |
| 1.3 | `GetRehabilitationOccupancy` | `GetDailyOccupancy` | `RehabilitationOccupancy` | SQL |
| 1.4 | `GetRehabilitationAdmissionsByPayer` | `GetAdmissionsByPayer` | `RehabilitationAdmissionsByPayer` | SQL |
| 1.5 | `GetRehabilitationAdmissionsByDirection` | `GetAdmissionsByDirection` | `RehabilitationAdmissionsByDirection` | SQL |
| 1.6 | `GetRehabilitationRecommendedTargets` | `GetRecommendedTargets` | `RehabilitationRecommendedTarget` | SQL |
| 1.7 | `GetRehabilitationRevenueNet` | `GetRevenueNet` | `RehabilitationRevenueNet` | SQL |
| 1.8 | `GetRehabilitationTreatments` | `GetTreatments` | `RehabilitationTreatment` | stub |
| 2.1 | `GetDayRehabPatientsByPayer` | `GetDayRehabPatientsByPayer` | `DayRehabPatientsByPayer` | stub |
| 2.2 | `GetDayRehabPatientsByDirection` | `GetDayRehabPatientsByDirection` | `DayRehabPatientsByDirection` | stub |
| 2.3 | `GetDayRehabDischargesWithRecommendation` | `GetDayRehabDischargesWithRecommendation` | `DayRehabDischargesWithRecommendation` | stub |
| 2.4 | `GetDayRehabTreatmentsDailyCumulative` | `GetDayRehabTreatmentsDailyCumulative` | `DayRehabTreatmentsDailyCumulative` | stub |
| 2.5 | `GetDayRehabTreatmentsBySector` | `GetDayRehabTreatmentsBySector` | `DayRehabTreatmentsBySector` | stub |
| 2.6 | `GetDayRehabTreatmentsPerPosition` | `GetDayRehabTreatmentsPerPosition` | `DayRehabTreatmentsPerPosition` | stub |
| 2.7 | `GetDayRehabAvgTreatmentsPerPatient` | `GetDayRehabAvgTreatmentsPerPatient` | `DayRehabAvgTreatmentsPerPatient` | stub |
| 2.8 | `GetDayRehabTreatmentsIndividualGroup` | `GetDayRehabTreatmentsIndividualGroup` | `DayRehabTreatmentsIndividualGroup` | stub |

הדבקה: `WebService-Rehabilitation-NEW-ONLY.cs` → `WebService.cs` (אחרי הבלוק הקיים ~6844). אל תדביק שוב את 1.3–1.7.

---

## 2b. APIs — פירוט שדות (חסרים / stubs)

| מדד | WebMethod (מוצע) | מה להחזיר | עדיפות |
|-----|------------------|-----------|--------|
| **1.1** ימי אשפוז ברוטו/נטו | `GetRehabilitationHospitalizationDays` | `Date`, `Unit`, `DepartmentName`, `GrossDays`, `NetDays` | P1 |
| **1.2** ממוצע אשפוז | `GetRehabilitationAvgLengthOfStay` | `Date`, `Unit`, `DepartmentName`, `AvgLosDays`, `PatientCount` | P1 |
| **1.8** טיפולים מקצועיים | `GetRehabilitationTreatments` | `Date`, `ProfessionName`, `TotalTreatments`, `AvgPerPatientDay`, `Unit`, `DepartmentName`, `WeekdayOnly` | **P0** |
| **2.1** מטופלים – קופות | `GetDayRehabPatientsByPayer` | `Date`, `PayerName`, `PatientCount`, `DepartmentName` | P2 |
| **2.2** מטופלים פנים/חוץ | `GetDayRehabPatientsByDirection` | `Date`, `Direction`, `FunderName`, `PatientCount`, `DepartmentName` | P2 |
| **2.3** משחררים + המלצה | `GetDayRehabDischargesWithRecommendation` | `Date`, `DischargeCount`, `TreatedHere`, `NotTreatedHere`, `DepartmentName` | P2 |
| **2.4** טיפולים יומי/מצטבר | `GetDayRehabTreatmentsDailyCumulative` | `Date`, `DailyCount`, `CumulativeCount`, `DepartmentName` | P2 |
| **2.5** טיפולים לפי סקטור | `GetDayRehabTreatmentsBySector` | `Date`, `SectorName`, `TreatmentCount`, `DepartmentName` | P2 |
| **2.6** טיפולים למשרה | `GetDayRehabTreatmentsPerPosition` | `Date`, `SectorName`, `TreatmentsPerPosition`, `DepartmentName` | P2 |
| **2.7** ממוצע למטופל | `GetDayRehabAvgTreatmentsPerPatient` | `Date`, `AvgTreatments`, `PatientCount`, `DepartmentName` | P2 |
| **2.8** פרטני / קבוצתי | `GetDayRehabTreatmentsIndividualGroup` | `Date`, `TreatmentType`, `TreatmentCount`, `DepartmentName` | P2 |

- מקצועות 1.8: פיזיותרפיה, ריפוי בעיסוק, קלינאות תקשורת, פסיכולוגיה, סיעוד שיקומי.
- סטטוס שבועי 1.8: צבירה **רביעי–חמישי בלבד** כש-`WeekdayOnly=true`.
- מחלקות אשפוז: 3 יחידות שיקום בלבד (מסנן פרונט קיים).
- מחלקות שיקום יום: 5 מחלקות (`REHAB_DAY_DEPARTMENTS`).

---

## 3. APIs קיימים — תיקונים נדרשים

בעיה משותפת: `DateTime.Parse` + `SqlDbType.DateTime` → `d:[]` למרות ש-SSMS מחזיר שורות. תיקון: **`ParseExact("yyyy-MM-dd")`**, **`SqlDbType.Date`**, חתימה **`string FromDate, string ToDate`**.

| WebMethod | מדד | תיקון ספציפי |
|-----------|-----|--------------|
| `GetRehabilitationOccupancy` | 1.3 | ✅ תוקן — סימן ייחוס |
| `GetRehabilitationAdmissionsByPayer` | 1.4 | ParseD + `SqlDbType.Date`; שדות: `Date`, `PayerCategory`, `PayerName`, `AdmissionsCount`, `Unit`, `DepartmentName` |
| `GetRehabilitationAdmissionsByDirection` | 1.5 | ParseD + `DATE` על `PATIENT_MONITORING`; `PM_MOVE_RANGE=אישפוז` → פנים; שדות: `Direction`, `FunderName`, `AdmissionsCount` |
| `GetRehabilitationRecommendedTargets` | 1.6 | ParseD; שדות: `ActualValue`, `TargetValue`, `Gap`, `MetricType`, `Status`; אופציונלי: `TotalOccupiedPatientDays`, `DaysInPeriod` |
| `GetRehabilitationRevenueNet` | 1.7 | ParseD; **כיום מתעלם מתאריכי בקשה** — מחזיר 12 חודשים גלגוליים; לשקול כיבוד `FromDate`/`ToDate` לדשבורד |

- `ChameleonConnection` ב-IIS חייב להצביע לאותו DB שבו אומתו שאילתות SSMS.

---

## 4. מטלות שרת לפי עדיפות

### P0 — חוסם סטטוס אשפוז
1. פריסת `GetRehabilitationTreatments` — חתימת `string FromDate, string ToDate`, ParseD, 3 מחלקות שיקום.
2. תיקון ParseD ב-`GetRehabilitationAdmissionsByPayer` (1.4).
3. תיקון ParseD + SQL נכון ב-`GetRehabilitationAdmissionsByDirection` (1.5).
4. תיקון ParseD ב-`GetRehabilitationRecommendedTargets` (1.6).
5. תיקון ParseD ב-`GetRehabilitationRevenueNet` (1.7).
6. Smoke: כל 6+1 endpoints עם `{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }` → `d` לא ריק (או `[]` תקף).

### P1 — השלמת דשבורד אשפוז
7. `GetRehabilitationHospitalizationDays` (1.1) — ברוטו/נטו לפי תקופה ומחלקה.
8. `GetRehabilitationAvgLengthOfStay` (1.2).
9. (אופציונלי) `GetRehabilitationRevenueNet` — כיבוד טווח תאריכים בדשבורד.

### P2 — שיקום יום (מחוץ ל-wiring נוכחי)
10. WebMethods 2.1–2.8 לפי טבלה §2.
11. אימות מחלקות שיקום יום (5 יחידות).

---

## 5. מטלות פרונט אחרי שרת

| אירוע שרת | פעולת פרונט |
|-----------|-------------|
| **1.8 נפרס** | הוסף `'1.8'` ל-`REHAB_API_STATUS_BLOCK_CODES`; `loadStatusTreatmentsFromApi()` יופעל אוטומטית |
| **1.8 + דשבורד** | הוסף `'treatments'` ל-`REHAB_API_DASHBOARD_METRICS` + `loadDashboardTreatmentsFromApi()` |
| **תיקון 1.4–1.7** | ללא שינוי קוד — services/mappers קיימים; אימות סטטוס + דשבורד |
| **1.1 נפרס** | service + mapper חדשים; חיבור `hospitalization-days` (ברוטו/נטו toggle קיים) |
| **1.2 נפרס** | service + mapper; חיבור `avg-los` |
| **2.x נפרס** | `REHAB_DAY_*` constants חדשים; services/mappers; הרחבת `loadStatusBlockApi` לסקשן `day-rehab` |

קוד מוכן היום (ממתין ל-backend): `rehabilitation-treatments-api.service.ts`, `rehabilitation-treatments.mapper.ts`, `loadStatusTreatmentsFromApi()` — **לא נקרא** כי `'1.8'` חסר מ-`REHAB_API_STATUS_BLOCK_CODES`.

---

## 6. מדדים — מטריצה סופית

| קוד | שם | סטטוס | דשבורד | פרונט | שרת |
|-----|-----|--------|--------|-------|-----|
| 1.1 | ימי אשפוז | — | placeholder | mock | **API חסר** |
| 1.2 | ממוצע אשפוז | — | placeholder | mock | **API חסר** |
| 1.3 | תפוסה | wired | wired | service+mapper | קיים (תוקן) |
| 1.4 | קבלות – גורם משלם | wired | wired | service+mapper | קיים — **ParseD** |
| 1.5 | קבלות פנים/חוץ | wired | wired | service+mapper | קיים — **ParseD+SQL** |
| 1.6 | יעדים מומלצים | wired | wired | service+mapper | קיים — **ParseD** |
| 1.7 | הכנסות נטו | wired (חודשי) | wired | service+mapper | קיים — **ParseD**; תאריכים מתעלמים |
| 1.8 | טיפולים מקצועיים | **לא wired** | placeholder | service+mapper מוכן | **API חסר** |
| 2.1 | מטופלים – קופות | empty shell | placeholder | mock | **API חסר** |
| 2.2 | מטופלים פנים/חוץ | empty shell | placeholder | mock | **API חסר** |
| 2.3 | משחררים + המלצה | empty shell | placeholder | mock | **API חסר** |
| 2.4 | טיפולים יומי/מצטבר | empty shell | placeholder | mock | **API חסר** |
| 2.5 | טיפולים לפי סקטור | empty shell | placeholder | mock | **API חסר** |
| 2.6 | טיפולים למשרה | empty shell | placeholder | mock | **API חסר** |
| 2.7 | ממוצע למטופל | empty shell | placeholder | mock | **API חסר** |
| 2.8 | פרטני / קבוצתי | empty shell | placeholder | mock | **API חסר** |

**סיכום:** 16 WebMethods מוגדרים; 5 עם SQL מלא (1.3–1.7); 11 stubs (1.1–1.2, 1.8, 2.1–2.8) — מחזירים `d:[]` עד השלמת SQL.
