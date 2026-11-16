# Cursor task: implement Regulation 29 — Form 3 (individual patient)

## Required references
- `form29_materials/Form3_original.jpeg` — **authoritative for the exact printed Hebrew wording, all labels, checkboxes, signatory titles, and footer text**. Handwriting is not official printed wording.
- `form29_materials/Form29_Development_Spec_HE.docx` — complete requirements; Form 3 is chiefly on page 4, workflow on 5, permissions on 6, post-approval on 7, data on 8–9, tests and undecided policy on 10–11.
- `.cursor/skills/form29-patient-ui/SKILL.md` — mandatory UI / integration skill.
- Existing implemented Form 2 inside the current repository — reuse rather than duplicate.

## Work autonomously in two phases
**Inspect and plan (first):** Inspect actual Angular version and routes, legacy C# API / ASMX conventions, Form 2 components and workflow, patient lookup and employee identity services, medicine lookup, secure files, existing signature pad, PDF generator and SQL schema. Write a short plan with exact files to change. **Then implement in this same task**, without stopping for a routine approval; do not deploy or turn on unresolved institutional live-signature rules.

**Build and verify:** Add Form 3 as a second form type in the existing Form 29 module. Keep Form 2 behavior unchanged and use the same colorful RTL UI style. Don't add a different framework, duplicate database catalog, generic form engine, or unnecessary dependencies.

## Exact Form 3 sections and controls
**1 — Patient and institution:** Patient name, ID, age, gender, institution and department. Reuse authenticated patient lookup / Cameleon context and present identity for physician verification. Patient data belongs to **one** patient and may only be seen by users authorized for that patient; allow partial drafts but not unverified submission.

**2 — Medication:** Use the **same search, data source and mappings as Form 2**, reading only `[Forms].[dbo].[Form29_Medicine_Report]`. Populate medicine name, dose form, administration route, active ingredient(s), manufacturer, and other verified catalog values. Explicitly allow missing manufacturing country to be completed by the permitted user; do not fabricate it. Keep the requested indication and rationale editable/physician-confirmed. Registered indications are reference data only; not automatically a requested indication.

**3 — Medical references:** Preserve the printed `לצרף אסמכתאות רפואיות (ספרות, מאמרים וכיו"ב)` instruction exactly. Reuse platform attachment service. The spec notes a decision is pending whether the file is always required; do not invent a hard rule.

**4 — Treatment instruction:** Include all original fields (do not rename printed labels): dose, dose unit, frequency, schedule details, treatment duration, required total quantity and its unit, period of supply when necessary. Offer simple calculation only for fixed compatible schedules (e.g. 2 units × twice daily × 5 days = 20 units). Otherwise require manual documented pharmacy review. Never approve >6 months' consumption; never convert mg to mL without verified concentration.

**5 — Physician declaration and regulatory checkboxes:** Transcribe **all printed paragraphs and every checkbox verbatim from the original Form 3 photograph**. In particular Form 3 says `התכשיר אינו רשום בפנקס התכשירים הרפואיים בישראל.` and separately includes `Off Label`. Preserve the foreign-country checkboxes including Western Europe name field, USA, Canada, Australia, Japan, plus the `אחר, שם הארץ` field specific to Form 3. Do **not** import Form 2's different Israel registration wording, abbreviate paragraphs, or replace checkbox groups with a drop-down. Keep declarations and consent evidence separate; the doctor must affirm informed written consent as printed, while any attached consent documentation follows confirmed institutional policy.

**6 — Treating physician:** Printed fields for physician name, medical license number, specialty, phone for inquiries, signature and date. Prefill trusted identity fields where available, let the authorized physician confirm, and reuse Form 2's canvas handwriting signature UI. The physician is **approval stage 0**: name + actual hand-drawn signature required; signing date is authoritative server timestamp shown as Israel local date; signed content/version is immutable. Do not allow signing for another physician through a manually typed name.

**7 — Institutional approvals:** Reuse the existing Form 2 stages and signature component: stage 1 `מנהל שירותי הרוקחות`, stage 2 `יו"ר ועדת התרופות`, stage 3 `מנהל המוסד או מוסמך מטעמו`. For each, display name input, canvas-drawn signature, read-only actual date; preserve the **exact role titles / printed positions** in PDF. Current authorized signer can sign; others see completed entries read-only. Keep return/reject reasons and original draft/version rules. Form 3 is approved after stages 0–3 all sign.

**8 — Validity/PDF/archival:** Max validity of six calendar months (shorter allowed) using existing verified validity reference policy. PDF must reproduce the complete original Form 3, including printed content, checkbox selections, names, signature images and dates, the six-month note, and bottom reporting/customs text. No auto-archival into the wrong patient: validate identity and use existing Cameleon PDF integration if available; otherwise record a pending manual archive task. External reporting and email have independent statuses, with no fake success. Do not claim an unsigned preview is approved.

## Database and services
Always use the **actual existing dbo table names**:
- `[dbo].[Form29_Requests]` for the shared request, `FormType=3`, immutable submitted medicine and declarations.
- `[dbo].[Form29_PatientDetails]` for patient, schedule, physician, written-consent flag, supply period (one row per request version).
- `[dbo].[Form29_Approvals]` for stages 0–3 and signature references.
- `[dbo].[Form29_Files]` for medical evidence, consent attachment / reference and PDFs.
- `[dbo].[Form29_Deliveries]` for optional PDF generation, Cameleon archival, notification and reporting status.

Inspect the **real SQL column definitions**, active services and query conventions. Don't create/rename existing tables, switch back to `Form29.*`, duplicate patient/medicine/employee master tables, or impose a migration unless an absolutely necessary missing field is proven and documented. Use parameterized SQL and existing permissions. Prefer the existing C# and Angular helpers.

## Test / acceptance checklist
1. Form 2 remains unchanged; navigation opens both form types appropriately.
2. All original Form 3 printed fields, paragraphs, checkbox options and footer text match the photo **word-for-word** both in UI and PDF.
3. Search/select medicine via existing catalog, correct field mappings, snapshot on submit.
4. Patient lookup and detail access restricted server-side; no unverified or wrong-patient submission/archival.
5. Draft save/reload, missing-field errors, fixed-dose calculation, variable-dose pharmacy review, six-month maximum.
6. Physician name, drawn signature and server date are saved as stage 0; then three institutional signatures work in order. No name-only/fake signs; no duplicate or out-of-order approvals.
7. Return/reject, versioning, PDF generation and archival status are independent and survive refresh.
8. Hebrew RTL works on desktop/mobile, no large UI libraries or framework upgrades.
9. Existing build and relevant tests pass; use only non-production/test patient data in screenshots.
10. Provide screenshots of the form and a sample PDF, files changed, tests run, and unresolved institutional rules. **Stop before deployment; do not begin other modules.**

If the source photo wording is unclear at a specific location, mark that location for manual verification instead of inventing legal/medical text. Unresolved pharmacy decisions are not permission to silently loosen patient-data or signature security.
