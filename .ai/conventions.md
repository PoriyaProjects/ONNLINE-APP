# קונבנציות פרויקט

## כללי

1. **שפה בקוד:** אנגלית — שמות, הערות, commits.
2. **שפה ב-UI:** עברית (RTL).
3. **שינויים מינימליים** — התאמה לסגנון הקיים.
4. **אין ספריות חדשות** אלא אם התבקש במפורש.
5. **עדיפות לשימוש חוזר** ב-Services ו-Utils קיימים.

---

## Angular

### גרסה וסטאק

| פריט | ערך נוכחי | יעד (הנחיות) |
|------|-----------|--------------|
| Angular | 9.1.13 | 20 |
| TypeScript | 3.8.3 | strict |
| Material | 9.2.4 | — |
| RxJS | 6.5.5 | — |
| Ivy | enabled | — |

### מבנה קומפוננטות

```
feature-name/
├── feature-name.component.ts
├── feature-name.component.html
├── feature-name.component.css
├── feature-name.component.spec.ts
└── [sub-components/]
```

- **NgModule** — רוב הקומפוננטות ב-`app.module.ts`.
- **Standalone** — לא בשימוש (יעד עתידי).
- **OnPush** — לא בשימוש נרחב (יעד עתידי).
- **Signals** — לא בשימוש (יעד עתידי).

### Selector

```typescript
@Component({
  selector: 'app-feature-name',
  ...
})
```

### Dependency Injection

```typescript
// שירותים גלובליים
@Injectable({ providedIn: 'root' })

// שירותים מקומיים למודול
@Injectable()
```

### HTTP

```typescript
// דפוס ASMX סטנדרטי
this.http.post(environment.url + 'MethodName', { param: value })
  .subscribe((response: any) => {
    const data = response['d'];
  });

// דפוס Service מודרני (NPS, dashboards)
this.http.post<{ d: T }>(url, body, { headers })
  .pipe(map(r => r.d !== undefined ? r.d : r));
```

- **אין nested subscriptions** — העדף `pipe` + `async` pipe ב-template.
- **אין Interceptor לאימות** — session ב-localStorage.

### RxJS

- `map`, `shareReplay`, `catchError`, `take` — בשימוש ב-NPS.
- הימנע מ-`subscribe` בתוך `subscribe`.

### Forms

- Reactive Forms (`ReactiveFormsModule`) — בטפסים חדשים.
- Template-driven — בקוד legacy.

### Routing

- **Hash URLs:** `#/dashboard`, `#/nps-permissions`.
- קובץ routing ראשי: `src/app/core/app.routing.module.ts`.
- Lazy loading: רק `nps-permissions`.

### Locale

```typescript
registerLocaleData(localeHe);
providers: [{ provide: MAT_DATE_LOCALE, useValue: 'he-IL' }]
```

---

## שמות

| סוג | דפוס | דוגמה |
|-----|------|--------|
| Component | PascalCase + Component | `DashboardComponent` |
| Service | PascalCase + Service | `NpsBaseApiService` |
| Module | PascalCase + Module | `NpsPermissionsModule` |
| Interface | PascalCase / Nps prefix | `NpsEmployeeDetail` |
| File (feature) | kebab-case | `nps-base-api.service.ts` |
| Folder | kebab-case | `hospital-cath-dashb` |
| WebMethod | PascalCase | `GetUserFullNameByUserID` |
| NPS WebMethod | Nps + PascalCase | `NpsGetEmployees` |

### הערות על שמות קיימים

- `DepartnentCode` — typo היסטורי, שמור לתאימות עם Backend.
- חלק מהתיקיות ללא מקף: `incomeImporter`, `TodayDashboardComponent`.

---

## DTO / Models

- מודלים typed: `src/app/nps-permissions/models/nps.models.ts`.
- דשבורדים חדשים: `*.models.ts` ליד ה-service.
- Legacy: `any` ו-`response['d']` — אל תרחיב בלי צורך.

### NPS DTO

- Body לשרת: לעיתים PascalCase (`DepartnentCode`, `EducationID`) להתאמה ל-C#.
- Response normalization: `normalize*` methods ב-service.

---

## SQL (הנחיות לפיתוח Backend)

- הימנע מ-`SELECT *`.
- שקול אינדקסים לפני מורכבות.
- הסבר JOINs.
- מנע שורות כפולות.
- אין SQL הרסני אלא אם התבקש.

---

## Git

- Branch לעבודה: `cursor/<descriptive-name>-0cd4`.
- Branch נוכחי לפי משתמש: `cursor/work-branch-114e`.
- Commit messages: אנגלית, משפטים מלאים.
- Push: `git push -u origin <branch-name>`.

---

## Build & Deploy

```bash
# Dev
npm start

# Production build
npm run build
# או
NODE_OPTIONS=--openssl-legacy-provider node --max_old_space_size=8192 ./node_modules/@angular/cli/bin/ng build --configuration=production
```

- `environment.prod.ts` מוחלף ב-build production (`angular.json` fileReplacements).
- Firebase Hosting: `firebase.json` → `dist/my-app`.

### Node

- `>=14.0.0 <24.0.0`
- `NODE_OPTIONS=--openssl-legacy-provider` נדרש ל-Angular 9 על Node חדש.

---

## בדיקות

- Unit: Karma + Jasmine (`*.spec.ts`).
- E2E: Protractor (`e2e/`).
- אין חובת tests לכל שינוי — רק כשמוסיפים כיסוי משמעותי.

---

## קבצי סביבה

```typescript
export const environment = {
  url: '...WebService.asmx/',
  urlipracticom: '...',
  AuthUrl: '...',
  hearingDetailsAsmxBase: '',
  npsUserId: localStorage.getItem('ID'),
  production: false
};
```

- **אל תשמור secrets** ב-environment.
- `npsUserId` נלקח מ-localStorage בזמן ריצה.

---

## תיעוד AI

- תיקיית `.ai/` — מקור אמת לפרויקט.
- קרא את כל הקבצים לפני כל שינוי קוד.
- עדכן `.ai/` כשמשתים architecture, API, DB, business rules.

---

## עדכון אחרון

נוצר: 2026-07-05.
