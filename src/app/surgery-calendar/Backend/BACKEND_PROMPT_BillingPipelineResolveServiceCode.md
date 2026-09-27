# Backend: `BillingPipelineResolveServiceCode`

## Status

Implemented on WebService:

```csharp
[WebMethod]
[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
public SurgeriesCalendar.BillingPipelineResult BillingPipelineResolveServiceCode(...)
```

## Frontend call

`POST WebService.asmx/BillingPipelineResolveServiceCode` with JSON body:

```json
{
  "hosp_report": "בוצע החלפת מפרק ברך ימין...",
  "diagnosis": "גונרתרוזיס",
  "department": "orthopedic",
  "surgery_date": "2026-07-21",
  "hospitalization_date": "2026-07-21",
  "release_date": "2026-07-24",
  "check_in_type": "elective",
  "icd9_diagnosis": []
}
```

## Expected response (`d` wrapper)

```json
{
  "serviceCode": "G0313",
  "price": 53603,
  "icd9Codes": ["81.54"],
  "drgCodes": ["G0313", "G00H4"]
}
```

## Frontend config

Both `environment.ts` and `environment.prod.ts` use:

```ts
billingPipelineMode: 'server'
```

Client timeout: **140 seconds** (API 1 Bedrock call can take ~60s).

## Dev fallback

If WebService is unavailable locally, set `billingPipelineMode: 'proxy'` and run `ng serve` (uses `proxy.conf.json`).

## Backend hardening (optional)

- Null-check `icd9_codes` / `is_primary_procedure` from API 1 before API 2
- Null-check `drg_codes` when mapping to `List<string>`
- Wrap in try/catch and return meaningful error JSON for the UI
