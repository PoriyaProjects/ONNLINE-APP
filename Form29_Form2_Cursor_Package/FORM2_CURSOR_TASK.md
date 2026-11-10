# Cursor implementation task — Regulation 29 / Form 2 only

You are the engineer responsible for building **Form 2 (institutional/collective request)** as a SMALL submodule inside our existing hospital platform. The stack is **Angular (legacy version) + older C#/.NET**, backed by **SQL Server**. You must discover exact versions, existing services, and established implementation patterns before editing. No modernization project.

## Files and mandatory skill
- **Read and apply** `.cursor/skills/form29-institutional-ui/SKILL.md` for every Form 29 component, screen, layout, status, and preview. This skill is the mandatory design contract. The UI should be modern, polished, lively and colorful, but suitable for medical staff.
- Read `form29_materials/Form29_Development_Spec_HE.docx`, especially pp. **1–3, 5–9, 10–11**. The 11-page document is the requirements basis; **Form 3 is explicitly excluded**.
- Inspect `form29_materials/Form2_original.jpeg` (the scanned paper Form 2 with handwritten local notes). Extract field grouping and the three institutional signature positions. Handwritten notes are NOT regulatory approval.
- Inspect `form29_materials/Form29_SQL_Server_01_Schema.sql`. It is the initial **existing proposed schema**, not permission to run DDL. Check whether the `Form29` schema is already deployed, and use its table/column names as given. If missing or inconsistent, report the discrepancy and prepare a minimal corrective migration for review; **do not run database changes without explicit permission**.
- If the file layout differs, locate the same exact files in the workspace, not by guessing data.

## Scope and architecture
**Goal:** at the end, staff can open, edit, save, submit, inspect, and track a real **Form 2** request using the existing application's auth, services and SQL, and reviewers can exercise the approval UI safely where identity/signature rules are actually verified. We will **review this Form 2 before any Form 3 implementation**.

1. First inspect and write a concise plan in `FORM29_FORM2_IMPLEMENTATION_PLAN.md` documenting existing Angular/C# versions, relevant reusable components, real identity/department/medicine sources, selected route, endpoint pattern, existing file storage/signature/audit facilities, and which features are blocked by unanswered pharmacy policy. Then proceed to implementation **without waiting for approval**, except for destructive database operations or enabling live sign-off on unapproved rules.
2. Preserve existing application shell, navigation style, login/Windows identity integration (if used), existing C# endpoint style (e.g. ASMX if that is what the project uses), validation, SQL access, folder structures and coding conventions. Keep methods short, DTOs minimal, and SQL parameterized. No new framework, ORM, state management, UI kit, generic workflow engine, heavy abstractions or unrelated refactors.
3. Create only the minimal modules/components required, preferably a compact list/detail/editor structure following nearest established features. Do not add Form 3 tabs or patient-related fields; the current Form 2 screen must not depend on patient context.
4. Reuse existing employees, permissions, departments, drugs, storage, printable document and audit services. If a source is absent, clearly document the missing integration; **do not fabricate lookup data or silently fall back to an incorrect source**. Draft editing may remain available while authoritative external lookup is being resolved, but submission cannot accept unverified drug identity.
5. Implement UI in Hebrew RTL with the design skill's scoped styling; maintain keyboard usability and responsive layout. No global palette changes.

## Form 2 fields
Build grouped and simple inputs, with draft saving permitted even while partial. Required validations apply **on submission, enforced server-side**:
- Facility and department (id + displayed name snapshot; only units the user is authorized to access).
- Drug selected from a verified existing catalog: `DrugCode`, `DrugName`, `DoseForm`, `Route`, `Strength`, full `Composition` (including multi-ingredient concentrations/units), `Manufacturer`, `OriginCountry` (manufacturing country).
- `Indication` and separate `Rationale`.
- Annual `TotalQty` (positive `decimal(18,4)`) and `QtyUnit`; clear label **כמות כוללת לשנה**.
- Registration choices: Israel registration state (`IN_BASKET_NOT_REGISTERED`/`OFF_LABEL` as appropriate to the authorized Form 2 text), foreign registration flag and selected country codes/details (`CountriesJson`). For Western Europe require a named country. Do not invent country rule combinations; keep uncertain rule gating configurable only through already established patterns and flagged for pharmacy sign-off. Differentiate manufacturing country from registration country.
- Medical reference files via existing file service (`Form29.Files`, `Kind=REFERENCE`) if permitted; do not arbitrarily require attachments before pharmacy confirms policy.
- Full declaration text + `TemplateVersion` from the approved form, or non-binding review placeholder if unavailable. Do not invent regulatory statements.
- Conditional `RegistrationHolder`/`RegistrationCountry` ONLY if approved Form 2 template requires them; their storage columns already exist.
- Do not request patient details or personal doses/frequency in Form 2.

## Minimal Form 2 behavior
**A. List:** Add a Form 29/Form 2 navigation entry using the project's ordinary route conventions, with accessible requests only. List Form 2 rows with request ID, medication, department, requester, date, status, and current approval stage. Provide basic search (request ID / medicine) and status filter. Avoid a dashboard/analytics system.

**B. Create/edit:** One clean RTL form. Load department context and verified drug catalog, let the user save partial `DRAFT`, use a compact summary, show server validation messages beside the fields, support reload/edit of owned drafts. `FormType=2` is fixed and never client-trusted. Never insert Form 2 data into `PatientDetails`.

**C. Submit and versioning:** `DRAFT -> PENDING` after server validation. Record logged-in submitter, server UTC timestamp, `TemplateVersion`, exact declaration text, stable SHA-256 content hash of a canonical submitted snapshot. After submit, submitted fields and associated evidence must be immutable. For a return, keep old version and create new `VersionNo` with same `CaseId`; don't overwrite approvals. Use existing `RowVer`/transaction checks to prevent duplicate submissions/approvals and lost updates.

**D. Approvals:** Show the planned three roles in this sequence, as proposed in the handwritten notes:
  1. מנהל שירותי הרוקחות
  2. יו"ר ועדת התרופות
  3. מנהל המוסד או מוסמך מטעמו
Use `Form29.Approvals` stages 1–3. The current stage is calculated from the DB's signed decisions, not controlled by Angular. Role, identity, delegation, row version and stage must be validated in the C# server before any decision. A real signature requires the institution's approved signature/audit mechanism and a reference in `SignatureRef`; **a UI checkbox or typed name is not an electronic-signature integration**. Return/reject needs a reason; return creates another version, reject is final, successful third signature leads to `APPROVED`. If the role mappings, order, authorized wording or signature mechanism are not verified, leave actual signing/final approval DISABLED and show a clear pending-policy state; still build the list/timeline and basic request workflow for review. Never simulate production approval under a privileged user.

**E. Preview and print:** Supply a visually clear preview of the entire Form 2 based on the scan, including statuses/checkboxes, full declaration and three signature areas. Use any existing PDF/print helper if available. A non-approved preview must visibly say **טיוטה — לא מסמך מאושר**. Only produce a purported official signed Form 2 PDF after approved exact template + genuine signature evidence + verified role flow; otherwise keep official export blocked. No external transmission in this iteration.

**F. Scope of post-approval:** Display validity and delivery sections only when there are verified values. Form 2 validity is at most 12 calendar months, but the start/reference signature is NOT confirmed; do not silently choose one. No automatic e-mail, fax, Ministry-of-Health submission, notifications, scheduled reminders, renewal automation, or Cameleon integration in this phase. Keep any existing `Deliveries` records distinct from approval; do not mislabel unsent as sent.

## Avoid complexity
- No large state machine library: status is a small server-side enum/string switch using the existing app style.
- Do not design 10 screens: one list, one edit/detail page, and preview/approval within the detail view is enough.
- Prefer reusing existing shared components and methods over writing new generic helpers.
- No new SQL master tables for drugs/departments/employees.
- No new API architecture, no backend rewrite, no schema redesign if supplied SQL fits.
- No new dependencies or external hosted services without explicit need.
- Keep every method and form model limited to fields actually used by Form 2.

## Required checks
1. Check build/compilation against actual Angular, TypeScript, and C# runtime versions (do not rely on unsupported syntax).
2. Validate Form 2 DRAFT save and reload; submit required fields only; reject zero or negative quantity; reject unauthorized department and unverified medication; reject any attempt to include `PatientDetails`.
3. Ensure every request list/detail/file/decision endpoint enforces server-side authorization and provides no cross-department data exposure.
4. Verify 3-stage order and no duplicate signature; a returning decision preserves prior request version, creates a new editable version, and requires fresh decisions on re-submission.
5. Simulate optimistic concurrency (double submit and simultaneous approval vs. withdrawal) using tests or existing test style; only one transaction succeeds.
6. Check signed/approved snapshots never change if catalog data changes.
7. Verify RTL, layout, empty/error/loading state, narrow viewport, no console errors, and print preview clearly distinguished from official PDF.
8. Run closest existing tests/build commands and record results. If something cannot be tested locally, state the blocker honestly rather than claiming success.

## Deliverables when finished
- Completed Form 2 code using existing app conventions, not isolated prototypes.
- `.cursor/skills/form29-institutional-ui/SKILL.md` kept in repo and explicitly used for all Form 29 UI choices.
- `FORM29_FORM2_IMPLEMENTATION_PLAN.md` with concise audit/decisions and final deviations.
- A short completion report: files changed; route; C# methods; actual DB objects used; demo/test instructions; commands run and results; screenshots if browser tooling is available; **unresolved decisions requiring pharmacy/institutional approval**.
- Stop. **Do not start Form 3**, do not deploy to production, and do not enable live approvals until reviewed.

## Important distinction
Requirements come from the signed-off institution policy and approved form, not from the visual mockup. Form 2 photo and specification are a solid development starting point; several choices in the specification are explicitly proposals. Build useful draft/submission/preview features now and expose genuine approval blockers rather than inventing legal, security, or medical rules.
