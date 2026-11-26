# System Specification – Physician Evaluation Dashboard

## 1. Architecture & Development Guidelines (For Cursor)
* **Reference Project:** Before writing any code, inspect and follow the structure, naming conventions, and patterns of the existing project **`TRAINING-REQUEST-DASHBOARD`** (folder structure, Services, Models/DTOs, Controllers, authentication/authorization, styling, and shared components).
* **Simplicity (KISS):** Do not over-engineer the architecture. Do not introduce unnecessary third-party libraries or heavy design patterns that are not already used in `TRAINING-REQUEST-DASHBOARD`.
* **Tech Stack:**
  * **Frontend:** Angular 11 (integrated into the existing system, full RTL and Hebrew support).
  * **Backend:** C# (.NET – matching the existing version and infrastructure).
  * **Data Source:** All data is read from and persisted to the **Database (DB)**.

---

## 2. Purpose
Consolidate quantitative and qualitative metrics at the individual physician level into a single dashboard screen to support periodic employee evaluations by department managers and hospital management.

---

## 3. Roles & Permissions (RBAC)
*(All permissions must be strictly enforced on the Backend/Server side, not just in the UI).*

| Role / User | Viewing Scope | Action Permissions |
| :--- | :--- | :--- |
| **Senior Management, HR, IT** | All hospital departments and all physicians | View departments overview, drill down into any department, view any physician's dashboard |
| **Department Manager / Direct Manager** | Only physicians assigned to their department / direct subordinates | View list of direct subordinates only, view their individual dashboards |
| **Dafna** | Dedicated Excel upload interface | Upload **Excel** files for **Manual Reports / Attendance** |
| **Vered Cohen** | Dedicated Excel upload interface | Upload **Excel** files for **Overtime** |

---

## 4. Screens & User Flow (UI/UX)

### Screen 1: Departments Overview (Management, HR, IT Only)
* Displays all hospital departments with a quick search/filter input.
* Clicking a department navigates to the Physicians List (Screen 2) for that department.

### Screen 2: Physicians List
* **For Management / HR / IT:** Displays physicians belonging to the selected department, with a back button to return to Screen 1.
* **For Direct / Department Managers:** Serves as the main landing screen, displaying only their direct subordinates.
* Clicking a physician navigates to their personal dashboard (Screen 3).

### Screen 3: Physician Evaluation Dashboard
Full RTL layout consisting of a top filter bar and a 2x2 card grid:

* **Top Filter Bar:**
  * **Physician Selector (`"שם רופא"`):** Dropdown to switch between physicians (restricted to the logged-in user's permitted scope).
  * **Year Filter (`"סינון שנה"`):** Dropdown to select the target year (e.g., `2026`).

* **Card 1 (Top-Right) – Overtime (`"שעות נוספות – גרף לפי חודשים"`):**
  * 12-month bar chart displayed right-to-left (`"ינו'"` through `"דצמ'"`).
  * Footer displaying the last updated date: `"עודכן לאחרונה: DD/MM/YYYY"`.

* **Card 2 (Top-Left) – Manual Reports (`"דיווחים ידניים – גרף כמותי לפי חודשים"`):**
  * 12-month quantitative bar chart displayed right-to-left (`"ינו'"` through `"דצמ'"`).
  * Footer displaying the last updated date: `"עודכן לאחרונה: DD/MM/YYYY"`.
  * *Note: Do NOT include any edit/pencil icon on this card.*

* **Card 3 (Bottom-Right) – Public Inquiries (`"פניות הציבור – רבעוני"`):**
  * Quarterly summary table (`"רבעון 1"` to `"רבעון 4"`) with columns: `"תודות"` (Thank Yous count), `"תלונות"` (Complaints count), and a `"פירוט"` (Details) link.
  * Clicking `"פירוט"` opens a **Modal** displaying the list of inquiries for that quarter with the following fields:
    * Date
    * Inquiry Type (Thank You / Complaint)
    * Summary / Content
    * Status

* **Card 4 (Bottom-Left) – Physician Activity (`"פעילות הרופא/ה – חודשי"`):**
  * Table displaying **all 12 months with horizontal scrolling**, plus a highlighted `"סה"כ"` (Total) column.
  * Metric rows:
    * `"כמות קבלות"`
    * `"שחרורים"`
    * `"ניתוחים כמנתח ראשי"`
    * `"ניתוחים כמנתח משני"`

### Screen 4: Excel Upload Interface
* Accessible only to authorized users (**Dafna** – Manual Reports; **Vered Cohen** – Overtime) and **IT**.
* Each user sees and can upload only the Excel file type they are authorized for (`.xlsx` / `.xls`).
* **Upload Flow:** Parse the Excel file, run basic structural/data validation, save records to the DB, update the `"עודכן לאחרונה"` timestamp, and display clear success or error feedback.

---

## 5. Recommended Backend Endpoints (C#)
*(Adapt Controller names, DTOs, and Auth attributes to match `TRAINING-REQUEST-DASHBOARD`)*

1. `GET /api/physician-dashboard/departments` – Returns the list of departments (Management, HR, IT only).
2. `GET /api/physician-dashboard/physicians?departmentId={id}` – Returns physicians by department (for Management/HR/IT) or by direct subordination (for Direct Managers).
3. `GET /api/physician-dashboard/physician/{physicianId}/summary?year={year}` – Returns consolidated dashboard data for the selected physician and year (monthly overtime + last updated date, monthly manual reports + last updated date, quarterly public inquiries summary, and 12-month physician activity + totals).
4. `GET /api/physician-dashboard/physician/{physicianId}/inquiries?year={year}&quarter={q}` – Returns detailed public inquiries for the modal (Date, Type, Summary/Content, Status).
5. `POST /api/physician-dashboard/upload/manual-reports` – Uploads and processes the Manual Reports Excel file into the DB (Dafna / IT only).
6. `POST /api/physician-dashboard/upload/overtime` – Uploads and processes the Overtime Excel file into the DB (Vered Cohen / IT only).

---

## 6. Database schema

All five tables reference `EP_Employees.RowID` through `EmployeeRowID`. They do not use `EmployeeID`.

### `PD_PhysicianOvertime`

| Column | Notes |
| :--- | :--- |
| `RowID` | PK |
| `EmployeeRowID` | FK to `EP_Employees.RowID` |
| `Year` | |
| `Month` | 1–12 |
| `OvertimeHours` | DECIMAL |
| `UpdatedAt` | |
| `UpdatedBy` | |

Unique `(EmployeeRowID, Year, Month)`. Excel upload upserts on that key.

### `PD_PhysicianManualReports`

| Column | Notes |
| :--- | :--- |
| `RowID` | PK |
| `EmployeeRowID` | FK to `EP_Employees.RowID` |
| `Year` | |
| `Month` | 1–12 |
| `ReportCount` | INT |
| `UpdatedAt` | |
| `UpdatedBy` | |

Unique `(EmployeeRowID, Year, Month)`. Excel upload upserts on that key.

### `PD_PhysicianActivity`

| Column | Notes |
| :--- | :--- |
| `RowID` | PK |
| `EmployeeRowID` | FK to `EP_Employees.RowID` |
| `Year` | |
| `Month` | 1–12 |
| `AdmissionsCount` | |
| `DischargesCount` | |
| `PrimarySurgeriesCount` | |
| `SecondarySurgeriesCount` | |
| `UpdatedAt` | |

Unique `(EmployeeRowID, Year, Month)`. Dashboard totals are summed in the query. They are not stored.

### `PD_PublicInquiries`

| Column | Notes |
| :--- | :--- |
| `RowID` | PK |
| `EmployeeRowID` | FK to `EP_Employees.RowID` |
| `InquiryDate` | |
| `Year` | Computed |
| `Quarter` | Computed, 1–4 |
| `InquiryType` | `N'תודה'` or `N'תלונה'` |
| `Summary` | |
| `Status` | |
| `CreatedAt` | |

### `PD_UploadLogs`

| Column | Notes |
| :--- | :--- |
| `RowID` | PK |
| `UploadType` | `Overtime` or `ManualReports` |
| `FileName` | |
| `RecordsProcessed` | |
| `UploadedBy` | |
| `UploadedAt` | |

Every Excel upload inserts one row. `"עודכן לאחרונה"` is the latest `UploadedAt` for that `UploadType`, not `UpdatedAt` on the metric row.