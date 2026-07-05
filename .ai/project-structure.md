# מבנה הפרויקט

## סקירת שורש

```
/workspace/
├── .ai/                    # תיעוד AI (מקור אמת)
├── src/                    # קוד Angular
├── e2e/                    # בדיקות E2E (Protractor)
├── shared/ngx-barcodeput/  # ספרייה מקומית
├── scripts/                # סקריפטי build
├── angular.json
├── package.json
├── firebase.json           # Firebase Hosting
├── NPS-README.md           # תיעוד NPS
└── README.md
```

---

## מודולים עיקריים

### Core (`src/app/core/`)

| קובץ | תפקיד |
|------|--------|
| `app.routing.module.ts` | Routes ראשיים (~400+ routes) |
| `material.module.ts` | Material imports מרוכזים |

### App Module (`src/app/app.module.ts`)

- Root NgModule מונוליתי.
- מייבא ~200+ קומפוננטות.
- רושם `LogAllRequestsInterceptor`.
- `HashLocationStrategy` ל-routing.

### NPS (`src/app/nps-permissions/`) — Lazy Module

```
nps-permissions/
├── nps-permissions.module.ts
├── nps-permissions-routing.module.ts
├── nps-configuration-access.guard.ts
├── models/nps.models.ts
├── services/nps-base-api.service.ts
└── [pages/components]
```

- נתיב: `#/nps-permissions`
- Redirect: `#/nurse-permissions-manage` → `#/nps-permissions`

---

## Feature Modules (דשבורדים עם NgModule משלהם)

| מודול | נתיב | תיאור |
|-------|------|--------|
| `hospital-cath-dashb` | `#/hospital-cath-dashb` | צנתור |
| `hospital-income-dashb` | `#/hospital-income-dashb` | הכנסות |
| `hospital-incomenb-dashb` | `#/hospital-incomenb-dashb` | הכנסות NB |
| `hospital-appoints-dashb` | `#/hospital-appoints-dashb` | תורים |
| `hospital-appointscl-dashb` | `#/hospital-appointscl-dashb` | תורים CL |
| `hospital-roomtime-dashb` | `#/hospital-roomtime-dashb` | חדרי ניתוח |
| `hospital-roomtimen-dashb` | `#/hospital-roomtimen-dashb` | חדרי ניתוח N |
| `hospital-roomtimert-dashb` | `#/hospital-roomtimert-dashb` | חדרי ניתוח RT |
| `hospital-roomtimert-mdashb` | `#/hospital-roomtimert-mdashb` | חדרי ניתוח RTm |
| `cldashboard` | `#/cldashboard` | דשבורד קליני-פיננסי |
| `charts` | `#/charts` | דמו charts |
| `infection-control` | `#/infection-control` | בקרת זיהומים |
| `nps-permissions` | `#/nps-permissions` | הרשאות אחיות |

---

## קומפוננטות משותפות (Shared)

### `src/app/shared/`

| רכיב | קובץ | תפקיד |
|------|------|--------|
| `SharedModule` | `shared.module.ts` | מייצא GoogleChart |
| `GoogleChartComponent` | `components/google-chart/` | עטיפת Google Charts |
| `HorizontalMultiPeriodChartComponent` | `horizontal-multi-period-chart.component.ts` | גרף מרובה תקופות |

### Utils

| קובץ | תפקיד |
|------|--------|
| `chart-utils.ts` | עזרי גרפים |
| `charts-config.ts` | הגדרות charts |
| `date-utils.ts` | תאריכים |
| `number-utils.ts` | מספרים |
| `limit-utils.ts` | הגבלות |
| `sanitize-util.ts` | ניקוי HTML |
| `sanitizesoapresponce.ts` | ניקוי תגובות SOAP |
| `dataTable.ts` | DataTables helpers |
| `ChartDataPipelineService.ts` | pipeline לנתוני chart |
| `drawOverlayDualArcChartHelper*.ts` | גרפי קשת |
| `ArcChartHelperRoomTime.ts` | room time charts |

### Services (Shared)

| Service | תפקיד |
|---------|--------|
| `chart-data.service.ts` | עיבוד נתוני chart |
| `auth.service.ts` | **Stub** — לא מיושם |

### UI משותף (מחוץ ל-shared/)

| רכיב | מיקום | תפקיד |
|------|--------|--------|
| `ConfirmationDialog` | `confirmation-dialog/` | מודל אישור |
| `MoneyLoader` | `money-loader/` | אינדיקטור טעינה |
| `FilterDepartsPipe` | `pipe/filter-departs.pipe.ts` | סינון מחלקות |

---

## Services לפי דומיין

| Service | מיקום |
|---------|--------|
| `AuthenticationService` | `login/` |
| `MenuPerm` | `menu-perm.ts` (root) |
| `NpsBaseApiService` | `nps-permissions/services/` |
| `GoogleChartsService` (cath) | `hospital-cath-dashb/services/` |
| `GoogleChartsService` (income) | `hospital-income-dashb/services/` |
| `ChargingIncomeService` | `hospital-incomenb-dashb/services/` |
| `HospitalBiService` | `hospital-bi-dashboard/` (message bus) |
| `HitoFormsDashboardService` | `hito-forms-dashboard/` |
| `ImagingPerformanceDashboardService` | `imaging-performance-dashboard/` |
| `MriScheduleService` | `mri-schedule/` |
| `SurgeriesRevenueApiService` | `surgeries-dashborad-n-components/revenue/` |
| `SurgeriesWaitTimesApiService` | `surgeries-dashborad-n-components/wait-times/` |
| `SurgeriesCancellationsApiService` | `surgeries-dashborad-n-components/cancellations/` |
| `CommercialSupportService` | `form-dashboard/commercial-support-form-dashboard/` |
| `ShortcutsService` | `dashboard/shortcuts-management/` |
| `DepartmentService` | `cldashboard/services/` |
| `OperationalChartService` | `cldashboard/services/` |
| `VoiceRecognitionService` | `header/service/` |
| `ConfirmationDialogService` | `confirmation-dialog/` |
| `DepartmentIncomeLocalCacheService` | `incomeImporter/` |

---

## Guards

| Guard | מיקום | תפקיד |
|-------|--------|--------|
| `NpsConfigurationAccessGuard` | `nps-permissions/` | הרשאות קונפיגורציה NPS |

> אין AuthGuard גלובלי.

---

## Interceptors

| Interceptor | מיקום | תפקיד |
|-------------|--------|--------|
| `LogAllRequestsInterceptor` | `log-all-requests.interceptor.ts` | לוג ניווט (`LinksLog`) |

---

## Pipes

| Pipe | מיקום | תפקיד |
|------|--------|--------|
| `FilterDepartsPipe` | `pipe/filter-departs.pipe.ts` | סינון רשימת מחלקות |

---

## Directives

| Directive | מיקום | תפקיד |
|-----------|--------|--------|
| `SmartAutoScrollDirective` | `hospital-roomtimert-mdashb/` | גלילה אוטומטית |

---

## Models / Interfaces

| קובץ | דומיין |
|------|--------|
| `nps-permissions/models/nps.models.ts` | NPS מלא |
| `hospital-incomenb-dashb/services/charging-income.models.ts` | הכנסות NB |
| `cldashboard/models/department.model.ts` | מחלקות |
| `surgeries-dashborad-n-components/revenue/surgeries-revenue.models.ts` | הכנסות ניתוחים |
| `surgeries-dashborad-n-components/wait-times/surgeries-wait-times.models.ts` | זמני המתנה |
| `surgeries-dashborad-n-components/cancellations/surgeries-cancellations.models.ts` | ביטולים |

---

## Layout Components

| Component | מיקום | תפקיד |
|-----------|--------|--------|
| `AppComponent` | `app.component.ts` | Shell, header/footer toggle |
| `HeaderComponent` | `header/` | כותרת |
| `NewHeaderComponent` | `new-header/` | כותרת חדשה |
| `FooterComponent` | `footer/` | תחתית |
| `LoginComponent` | `login/` | התחברות |
| `DashboardComponent` | `dashboard/` | דף בית |

---

## תיקיות Feature לפי דומיין (130+)

### בית חולים ואנליטיקה
`hospital-bi-dashboard`, `hospital-cath-dashb`, `hospital-income-dashb`, `hospital-incomenb-dashb`, `hospital-appoints-dashb`, `hospital-appointscl-dashb`, `hospital-roomtime-*`, `cldashboard`, `surgeries-dashborad-n`, `imaging-performance-dashboard`, `quality-measures-dashboard`, `clinic-activity-dashboard`, `dimot-activity-dashboard`, `incomeImporter`, `TodayDashboardComponent`, `automationprocessdashboard`, `hito-forms-dashboard`

### קליני
`surgery`, `surgery-calendar`, `surgery-control-main`, `cardiology-calendar`, `cath-report`, `colonoscopy`, `mri-schedule`, `maternity`, `new-born`, `infection-control`, `nutrition-system`, `nurses-dashboard`, `nurses-manage-dashboard`, `hearing`, `dialysis-report`, `emergency-room-report`, `lab-tests`

### טפסים
`form-dashboard`, `fill-survey`, `fill-report`, `formsanswered`, `updateform`, `polls`

### COVID
`coronaform`, `coronavaccine`, `covid19report`, `sarscov2`, `fast-covid19-test`, `fast-covid-test-dashboard`

### HR וניהול
`employees`, `employees-manage-dash`, `hr-dashboard`, `authorized`, `roles`, `worker-cases`, `profile-dept-association`

### תקשורת
`sendsms`, `sendsmsadmin`, `whatsapp-messages-dashboard`, `emailsdashboard`, `emailmanagement`

### IT ותשתיות
`servers`, `medigate-servers`, `switches`, `cables`, `scanners`, `ip-points`, `dev-manage`

### אחר
`consultations`, `researches`, `cortinas`, `drugs`, `invoices`, `ai-letters-dashboard`, `learning-requests-dashboard`, `spreadsheets-dashboard`

---

## Environments

| קובץ | שימוש |
|------|--------|
| `src/environments/environment.ts` | Dev (default) |
| `src/environments/environment.prod.ts` | Production build |
| `src/environments/environment.test.ts` | Test servers |
| `src/app/cldashboard/environments/` | Override למודול CL |

---

## עדכון אחרון

נוצר: 2026-07-05.
