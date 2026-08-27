# rehabilitation-dashboard — integration reference

**Route:** `/#/rehabilitation-dashboard`  
**Protocol:** ASMX `WebService.asmx` · `POST` · JSON · response `{ "d": [...] }`  
**DB:** `ChameleonConnection` (SQL Server)

---

## Date format contract

- Request body: **`FromDate` / `ToDate` as strings** in **`yyyy-MM-dd`** (not `dd/MM/yyyy`, not `/Date(ms)/`).
- Backend must use `ParseExact("yyyy-MM-dd")` + `SqlDbType.Date` — not free `DateTime.Parse` or `SqlDbType.DateTime`.
- WebMethod signatures should accept **`string FromDate, string ToDate`** so ASMX deserializer does not break before ParseD.
- Response `Date` fields: ASMX `/Date(ms)/` — frontend handles both.

```json
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

| UI context | FromDate | ToDate |
|------------|----------|--------|
| Status daily | yesterday | yesterday |
| Status monthly | today − 29 days | yesterday (30-day window) |
| Dashboard month | 1st of month | last day of month |
| Dashboard year | 01.01.YYYY | 31.12.YYYY |

---

## API endpoints (metrics 1.3–1.8)

| Block | WebMethod | Frontend status | Notes |
|-------|-----------|-----------------|-------|
| 1.3 תפוסה | `GetRehabilitationOccupancy` | **wired** | Dashboard + status; mapper filters 3 rehab units |
| 1.4 קבלות – גורם משלם | `GetRehabilitationAdmissionsByPayer` | **wired** | Status only |
| 1.5 קבלות – פנים/חוץ | `GetRehabilitationAdmissionsByDirection` | **wired** | Status; `PM_MOVE_RANGE=אישפוז` → פנים |
| 1.6 יעדים מומלצים | `GetRehabilitationRecommendedTargets` | **wired** | Status; monthly aggregation in mapper |
| 1.7 הכנסות נטו | `GetRehabilitationRevenueNet` | **wired** | Status **monthly only**; server returns rolling 12 months (ignores date params today) |
| 1.8 טיפולים מקצועיים | `GetRehabilitationTreatments` | **not wired** | Frontend service/mapper exist; **no backend endpoint** |

Empty `d:[]` is valid (not an error).

### Departments (inpatient display)

Frontend shows only three rehab units; other server rows are dropped in mappers.

| DepartmentName | Unit | Capacity 2026 |
|----------------|------|---------------|
| המחלקה לגריאטריה שיקומית | 85 | 18 |
| מחלקת שיקום כללי | 150685851 | 35 |
| מחלקת שיקום ילדים | 49 | 14 |

Capacity constants: `constants/rehabilitation-bed-capacity.constants.ts` (server returns `OccupiedPatients` only).

### Metric 1.8 — expected backend shape (when shipped)

- Professions: פיזיותרפיה, ריפוי בעיסוק, קלינאות תקשורת, פסיכולוגיה, סיעוד שיקומי
- Fields: `Date`, `ProfessionName`, `TotalTreatments`, `AvgPerPatientDay`, `Unit`, `DepartmentName`, `WeekdayOnly`
- Weekly status: aggregate **Wed–Thu only** when `WeekdayOnly = true`

---

## Known backend blockers

1. **ParseD / date params** — SSMS returns rows but API returns `d:[]` when methods use `DateTime.Parse` + `SqlDbType.DateTime` instead of `ParseExact` + `SqlDbType.Date`. Affects payer, direction, targets, revenue (occupancy already fixed). WebMethod `DateTime` params can deserialize badly before service code runs.
2. **`GetRehabilitationTreatments` missing** — block 1.8 UI uses placeholder data; API call fails until WebMethod is deployed.
3. **`GetAdmissionsByDirection`** — must use `DATE` params on `PATIENT_MONITORING`; compare SSMS query #6 to live SQL, not occupancy SQL.
4. **Connection string** — IIS `ChameleonConnection` must point to same server/DB as SSMS used for validation.

---

## Frontend folder structure

```
rehabilitation-dashboard/
├── rehabilitation-dashboard.component.{ts,html,css}   # dashboard + status views
├── models/          # DTOs, REHAB_API_STATUS_BLOCK_CODES, metric defs
├── services/        # *-api.service.ts per WebMethod + api-cache
├── mappers/         # rows → status blocks / chart series
├── utils/           # asmx-request, status.builder, chart utils
├── constants/       # bed capacity, department name mapping
├── state/           # api-load state helpers
└── rehab-status-indicators/   # status KPI chips
```

Shared ASMX helper: `utils/rehabilitation-asmx-request.util.ts` (`postRehabAsmx`, `parseRehabAsmxListResponse`).

---

## Backend docs (`docs/`)

| File | Purpose |
|------|---------|
| `RehabilitationOccupancyService.cs` | Deploy to `App_Code` — DTOs + service methods |
| `WebService-Rehabilitation-EXISTING.cs` | Reference only — 1.3–1.7 (אם כבר קיים — לא להדביק) |
| `WebService-Rehabilitation-NEW-ONLY.cs` | Paste into `WebService.cs` — 10 methods: 1.1, 1.2, 1.8, 2.1–2.8 |
| `BACKEND-FIX-NOTES.md` | Compile/deploy fixes (CS0111 duplicates, ParseD, C# 5) |
| `PLAN.md` | Metric map (1.1–1.8, 2.1–2.8) |

WebMethod names match `services/*-api.service.ts` `METHOD` constants exactly.

---

## When backend ships 1.8

1. Deploy `GetRehabilitationTreatments` on `WebService.asmx` with `string FromDate, string ToDate`.
2. Add **`'1.8'`** to `REHAB_API_STATUS_BLOCK_CODES` in `models/rehabilitation-dashboard.models.ts`:

```ts
export const REHAB_API_STATUS_BLOCK_CODES = ['1.3', '1.4', '1.5', '1.6', '1.7', '1.8'] as const;
```

3. Verify: status daily/monthly block 1.8 loads via `loadStatusBlockApi` → `loadStatusTreatmentsFromApi()` (already implemented).
4. Smoke test:

```http
POST {baseUrl}/WebService.asmx/GetRehabilitationTreatments
Content-Type: application/json

{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```

---

## Smoke tests (wired endpoints)

```http
POST {baseUrl}/WebService.asmx/GetRehabilitationOccupancy
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```
→ 3 rows (גריאטריה, כללי, ילדים) with `OccupiedPatients` ≥ 0 after mapper filter.

```http
POST {baseUrl}/WebService.asmx/GetRehabilitationAdmissionsByDirection
{ "FromDate": "2026-08-11", "ToDate": "2026-08-11" }
```
→ rows with `Direction` פנים/חוץ, `FunderName` קופות/צה״ל/פרטי/אחר.
