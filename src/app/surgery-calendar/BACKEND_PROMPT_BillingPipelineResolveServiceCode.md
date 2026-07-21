# Backend: `BillingPipelineResolveServiceCode`

## Why

The billing pipeline (`https://d1xxyoxurq9u57.cloudfront.net`) works over direct `POST`, but browser **CORS preflight (`OPTIONS`) returns 404**, so the Angular app cannot call it cross-origin.

The frontend therefore calls a **same-origin** ASMX method that proxies to the pipeline.

## Endpoint

`POST WebService.asmx/BillingPipelineResolveServiceCode`

### Request (JSON body)

```json
{
  "hosp_report": "בוצע החלפת מפרק ברך ימין...",
  "diagnosis": "גונרתרוזיס קשה בברך ימין",
  "department": "orthopedic",
  "surgery_date": "2026-07-21",
  "hospitalization_date": "2026-07-21",
  "release_date": "2026-07-24",
  "check_in_type": "elective",
  "icd9_diagnosis": ["715.16"]
}
```

### Response (`d` wrapper as usual)

```json
{
  "serviceCode": "G0313",
  "price": 53603,
  "icd9Codes": ["81.54"],
  "drgCodes": ["G0313", "G00H4"]
}
```

## Server implementation (C# sketch)

1. `POST {base}/api/text-to-icd9` with `hosp_report`, `diagnosis`, `department` — timeout **65s**
2. `POST {base}/api/icd9-to-drg` with `icd9_codes`, `is_primary_procedure`, dates, `check_in_type`, `icd9_diagnosis`
3. Return `chosen_service_code` and matching price from `service_code_prices`

Base URL: `https://d1xxyoxurq9u57.cloudfront.net`

## Frontend config

Production (`environment.prod.ts`):

```ts
billingPipelineMode: 'server'
```

Until deployed, dev uses Angular proxy (`billingPipelineMode: 'proxy'`).
