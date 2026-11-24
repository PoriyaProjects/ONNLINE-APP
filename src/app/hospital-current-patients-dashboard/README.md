# Hospital Current Patients & Ward Census Dashboard

A real-time, RTL (Hebrew)-enabled Angular dashboard for monitoring active hospital patients and ward census using Angular Material and RxJS polling.

## Overview

This dashboard provides clinical staff with:
- **Real-time patient monitoring** with live update polling (4-5 second intervals)
- **View switching** between Department (`PM_MOVE_DEPART`) and Sub-Department (`PM_MOVE_DEPART_SEODE`) views
- **Advanced filtering** by case type, danger cases, Aran cases, search, and department
- **KPI summary** showing hospital-wide census metrics
- **Department census cards** with quick filtering
- **Patient table** with server-side pagination and sortable columns
- **Patient detail drawer** with case history and move timeline
- **Live/Pause toggle** to control background updates
- **Automatic row highlighting** when patient data changes

## Features

### 1. Real-Time Polling Engine
- Polls `FetchMonitoringSyncState` every 4-5 seconds
- Only refreshes `FetchCurrentHospitalPatients` and `FetchDepartmentSummary` when state changes
- Graceful error handling with snack bar notifications
- Pause/Resume capability to prevent screen flickering

### 2. View Modes
- **תצוגה 1 — מחלקה (PM_MOVE_DEPART)**: Primary department view
- **תצוגה 2 — מחלקת סעד (PM_MOVE_DEPART_SEODE)**: Sub-department/secondary unit view

### 3. Filtering & Search
- **Case Type Chips**: All / Admission / Clinics / Triage
- **Alert Toggles**: Danger Cases / Aran Cases
- **Free-text Search**: Matches patient name, ID, case #, room, bed, doctor, department (300ms debounce)
- **Department Filter**: Click department cards to toggle filter
- **Clear All Filters** button when any filter is active

### 4. KPI Dashboard
Interactive summary cards showing:
- Total active patients
- Admission / Clinics / Triage counts
- Danger cases
- Aran cases
- Temporary leave/absence count

Clicking KPI cards applies/toggles the matching filter.

### 5. Department Census Strip
Sortable, interactive cards per department showing:
- Department name and total patient count
- Mini breakdown: Admission / Clinics / Triage
- Warning badges if danger or Aran cases exist
- Click to filter patient table by department

### 6. Patients Table
Server-backed `mat-table` with columns:
- **Patient**: Full name, ID, gender, DOB (tooltip), alert badges
- **Case**: Case number + type label
- **Department**: Current active department + previous (if transferred)
- **Room & Bed**: Current location
- **Move Type**: Type label with semantic color + date/time
- **Duration**: Length of stay
- **Doctor**: Attending physician name

Clicking a row opens the patient detail drawer.

### 7. Patient Detail Drawer (Right Sidenav)
Shows:
- Full patient information (ID, DOB, phone, payer, etc.)
- Case history timeline with:
  - Move type and timestamp
  - Department/sub-department
  - Room and bed
  - User who made the change (if available)

### 8. Live Status & Controls
- **Live Badge**: Animated pulse when updates are active
- **Last Update Time**: ISO format timestamp
- **Refresh Button**: Manual data refresh
- **Pause/Resume Toggle**: Stop/start background polling

## Architecture

### File Structure
```
hospital-current-patients-dashboard/
├── models/
│   └── patient-monitoring.models.ts    # Data models & interfaces
├── services/
│   ├── hospital-current-patients.service.ts       # Main service
│   └── hospital-current-patients.service.spec.ts  # Unit tests
├── hospital-current-patients-dashboard.component.ts       # Component logic
├── hospital-current-patients-dashboard.component.html     # Template (RTL)
├── hospital-current-patients-dashboard.component.scss     # Styles
├── hospital-current-patients-dashboard.component.spec.ts  # Component tests
├── hospital-current-patients-dashboard.module.ts          # Feature module
└── hospital-current-patients-dashboard-routing.module.ts  # Routes
```

### Data Models

#### CurrentPatientRow
Represents a single active patient with:
- Demographics (ID, name, gender, DOB)
- Case info (number, type, Aran status)
- Location (department, room, bed)
- Movement info (move type, date/time, duration)
- Flags (danger, Aran, temporary leave)
- Contact & caregiver info
- TotalRows (for pagination)

#### DepartmentSummaryRow
Census summary per department:
- Total patients + breakdown by case type
- Danger & Aran case counts
- Temporary leave count

#### PatientMoveHistoryRow
Single movement record with:
- Move type, date, time
- Source/destination departments
- Room and bed
- Audit trail (insert/update user and timestamp)

#### MonitoringSyncState
Change detection state:
- `ActiveCount`: Number of active patients
- `MaxInsertDateTime`: Latest change timestamp
- `MaxMoveDate` / `MaxMoveTime`: Latest move timestamp

### Service (HospitalCurrentPatientsService)

**Key Methods:**
- `fetchCurrentPatients(request)` → Observable<CurrentPatientRow[]>
- `fetchDepartmentSummary(viewMode)` → Observable<DepartmentSummaryRow[]>
- `fetchMonitoringSyncState()` → Observable<MonitoringSyncState>
- `fetchCaseMoveHistory(caseNumber)` → Observable<PatientMoveHistoryRow[]>
- `startPolling(request$, interval)` → void
- `stopPolling()` → void
- `setLive(isLive)` → void
- `calculateHospitalKpis()` → KPI object

**Observables:**
- `currentPatients()` → Observable<CurrentPatientRow[]>
- `departmentSummary()` → Observable<DepartmentSummaryRow[]>
- `syncState()` → Observable<MonitoringSyncState | null>
- `isLive()` → Observable<boolean>
- `lastUpdateTime()` → Observable<Date | null>
- `highlightedRows()` → Observable<Set<string>>

### Component (HospitalCurrentPatientsDashboardComponent)

**State Management:**
- BehaviorSubjects for view mode, filters, pagination
- RxJS streams for reactive filter pipeline
- MatTableDataSource for table pagination/sort

**Key Methods:**
- `setupFilterPipeline()` → Sets up reactive streams for all filters
- `startPolling()` → Begins background updates
- `toggleLive()` → Pause/resume updates
- `refreshData()` → Force immediate refresh
- `clearFilters()` → Reset all filters
- `openPatientDetails(patient)` → Open drawer and load history
- `closeDetails()` → Close detail drawer

**Helper Methods:**
- `formatDuration(hours)` → 'Xי' Yש'' format
- `formatDate(dateStr)` → he-IL locale date
- `getCaseTypeLabel(key)` → 'אשפוז' / 'מרפאות' / 'מיון'
- `getMoveCategoryColor(moveCat)` → Material color theme

## Integration with WebService

The service automatically:
1. **Unwraps ASP.NET AJAX { d: ... } wrapper** in all responses
2. **Handles ASMX errors** (HTTP 500 responses with { Message, StackTrace })
3. **Uses POST** for all WebService calls (ASMX requirement)
4. **Sets proper headers** (Accept/Content-Type: application/json)

### Endpoint Configuration
All endpoints route to `environment.url` (default: `http://localhost:64964/WebService.asmx/`):
- `FetchCurrentHospitalPatients`
- `FetchDepartmentSummary`
- `FetchCaseMoveHistory`
- `FetchMonitoringSyncState`

## Usage in App

### 1. Add to App Routing
The module has been registered in `src/app/core/app.routing.module.ts`:
```typescript
{ path: "hospital-current-patients-dashb", component: HospitalCurrentPatientsDashboardComponent }
```

Navigate to: `/hospital-current-patients-dashb`

### 2. Add to Navigation Menu
Update your menu component to include:
```html
<a mat-list-item routerLink="/hospital-current-patients-dashb">
  <mat-icon>monitor_heart</mat-icon>
  <span> Dashboard | Matzav Patients Besachar</span>
</a>
```

### 3. Import Module (if needed separately)
```typescript
import { HospitalCurrentPatientsDashboardModule } from './hospital-current-patients-dashboard/hospital-current-patients-dashboard.module';

@NgModule({
  imports: [
    HospitalCurrentPatientsDashboardModule
  ]
})
export class FeatureModule { }
```

## RTL (Hebrew) Support

- All template attributes use `dir="rtl"` at root level
- SCSS uses `direction: rtl` via flexbox/grid
- Material components natively support RTL
- Text direction: right-to-left throughout
- Icon positions adapted for RTL (sidenav on right)

## Styling & Theme

### Colors
- **Primary**: Material Blue (#1976d2)
- **Accent**: Material Pink (#f44336)
- **Warn**: Material Orange (#ff9800)
- **Success/Highlight**: Material Green (#4caf50)

### Responsive Breakpoints
- **Desktop** (> 1024px): Full layout with multi-column grids
- **Tablet** (600px - 1024px): 2-column KPI/department layout
- **Mobile** (< 600px): Single-column, full-width drawer

### Animations
- **Pulse**: Live badge (2s infinite)
- **Highlight**: Row change animation (2s ease-out)
- **Hover**: Card elevation and shadow

## Performance Considerations

1. **Polling Interval**: 4-5 seconds (configurable)
2. **Change Detection**: Only fetches on `MonitoringSyncState` changes
3. **Pagination**: Server-side (10, 25, 50, 100 rows/page)
4. **Search Debounce**: 300ms to reduce API calls
5. **takeUntil**: All subscriptions cleaned up in `ngOnDestroy`
6. **OnPush Change Detection**: Recommended for child components

## Error Handling

- **Network errors**: Snack bar notification (5s), data retained
- **Server errors**: ASMX error response parsed and displayed
- **Missing fields**: Safe optional chaining (`?.`) throughout template
- **Null states**: Loading spinners and empty states handled

## Testing

Unit tests included for:
- Service HTTP calls and unwrapping
- Component filter logic
- KPI calculations
- Date/time formatting
- Filter state management

Run tests:
```bash
npm run test
```

## Future Enhancements

- [ ] Export patient list to Excel/CSV
- [ ] Print patient detail card
- [ ] Advanced filter builder
- [ ] Saved filter presets
- [ ] Column visibility toggle
- [ ] Dashboard theme customization
- [ ] Multi-language support (AR, EN)
- [ ] WebSocket real-time updates (instead of polling)
- [ ] Patient alerts/notifications
- [ ] Department load balancing view

## Dependencies

**Angular Material Components Used:**
- `MatToolbar` - Command bar
- `MatButtonToggleGroup` - View switcher
- `MatChips` - Filter chips
- `MatFormField` / `MatInput` - Search box
- `MatCard` - KPI/Department/Info cards
- `MatTable` / `MatPaginator` / `MatSort` - Patient table
- `MatSidenav` - Detail drawer
- `MatIcon` - Icons throughout
- `MatProgressSpinner` - Loading states
- `MatSnackBar` - Error/status notifications
- `MatTooltip` - Contextual help

**RxJS Operators:**
- `switchMap`, `tap`, `map`, `catchError`
- `debounceTime`, `distinctUntilChanged`
- `takeUntil` - Subscription cleanup
- `BehaviorSubject` - State management
- `timer` - Polling interval

## License & Attribution

Part of the ONNLINE-APP hospital management system.
Developed for real-time patient monitoring in clinical settings.
