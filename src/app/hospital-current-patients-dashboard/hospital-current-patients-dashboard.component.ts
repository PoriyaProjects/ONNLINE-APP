import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { Subject, Observable, BehaviorSubject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';

import { HospitalCurrentPatientsService } from './services/hospital-current-patients.service';
import {
  CurrentPatientRow,
  DepartmentSummaryRow,
  PatientMoveHistoryRow,
  CurrentPatientsRequest
} from './models/patient-monitoring.models';

@Component({
  selector: 'app-hospital-current-patients-dashboard',
  templateUrl: './hospital-current-patients-dashboard.component.html',
  styleUrls: ['./hospital-current-patients-dashboard.component.scss']
})
export class HospitalCurrentPatientsDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator | null = null;
  @ViewChild(MatSort) sort: MatSort | null = null;
  @ViewChild('detailDrawer') detailDrawer: MatSidenav | null = null;

  // View & Filter State
  viewMode$ = new BehaviorSubject<'DEPART' | 'DEPART_SEODE'>('DEPART');
  caseTypeFilter$ = new BehaviorSubject<'ALL' | '1' | '2' | '3'>('ALL');
  onlyDangerCases$ = new BehaviorSubject<boolean>(false);
  onlyAranCases$ = new BehaviorSubject<boolean>(false);
  departmentFilter$ = new BehaviorSubject<string>('');
  pageIndex$ = new BehaviorSubject<number>(0);
  pageSize$ = new BehaviorSubject<number>(10);

  searchControl = new FormControl('');

  // Data
  departmentSummary$ = this.patientService.departmentSummary();
  isLive$ = this.patientService.isLive();
  lastUpdateTime$ = this.patientService.lastUpdateTime();
  highlightedRows$ = this.patientService.highlightedRows();

  // Table
  displayedColumns: string[] = [
    'fullName',
    'patientId',
    'caseNumber',
    'caseType',
    'activeDepart',
    'roomBed',
    'moveType',
    'hospitalizedDay',
    'doctor'
  ];
  dataSource = new MatTableDataSource<CurrentPatientRow>([]);

  // Patient Detail Drawer
  selectedPatient: CurrentPatientRow | null = null;
  caseHistory$ = new BehaviorSubject<PatientMoveHistoryRow[]>([]);
  caseHistoryLoading$ = new BehaviorSubject<boolean>(false);

  // KPI Summary
  kpis$ = new BehaviorSubject<any>(null);

  private destroy$ = new Subject<void>();
  private currentRequest$ = new BehaviorSubject<CurrentPatientsRequest>({
    viewMode: 'DEPART',
    departmentFilter: '',
    caseTypeFilter: 'ALL',
    onlyDangerCases: false,
    onlyAranCases: false,
    freeSearch: '',
    pageIndex: 0,
    pageSize: 10
  });

  constructor(
    private patientService: HospitalCurrentPatientsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilterPipeline();
    this.startPolling();
    this.updateKpis();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.patientService.stopPolling();
  }

  /**
   * Setup reactive pipeline for filters and patients fetching
   */
  private setupFilterPipeline(): void {
    this.currentRequest$
      .pipe(
        switchMap(req =>
          this.patientService.fetchCurrentPatients(req).pipe(
            startWith([] as CurrentPatientRow[])
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (patients) => {
          this.dataSource.data = patients;
          if (this.paginator) {
            this.paginator.length = patients.length > 0 ? patients[0].TotalRows : 0;
          }
        },
        error: (err) => {
          this.snackBar.open('שגיאה בטעינת נתוני מטופלים', 'סגור', { duration: 5000 });
          console.error('Error fetching patients:', err);
        }
      });

    // Wire up view mode changes
    this.viewMode$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(mode => {
        this.updateCurrentRequest({ viewMode: mode, departmentFilter: '', pageIndex: 0 });
        this.updateKpis();
      });

    // Wire up case type filter
    this.caseTypeFilter$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(caseType => {
        this.updateCurrentRequest({ caseTypeFilter: caseType, pageIndex: 0 });
      });

    // Wire up danger cases toggle
    this.onlyDangerCases$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(onlyDanger => {
        this.updateCurrentRequest({ onlyDangerCases: onlyDanger, pageIndex: 0 });
      });

    // Wire up aran cases toggle
    this.onlyAranCases$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(onlyAran => {
        this.updateCurrentRequest({ onlyAranCases: onlyAran, pageIndex: 0 });
      });

    // Wire up department filter
    this.departmentFilter$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(dept => {
        this.updateCurrentRequest({ departmentFilter: dept, pageIndex: 0 });
      });

    // Wire up search with debounce
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(search => {
        this.updateCurrentRequest({ freeSearch: search || '', pageIndex: 0 });
      });

    // Wire up pagination
    this.pageIndex$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(pageIndex => {
        this.updateCurrentRequest({ pageIndex });
      });

    this.pageSize$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(pageSize => {
        this.updateCurrentRequest({ pageSize, pageIndex: 0 });
      });
  }

  /**
   * Update current request and fetch
   */
  private updateCurrentRequest(partial: Partial<CurrentPatientsRequest>): void {
    const current = this.currentRequest$.value;
    this.currentRequest$.next({ ...current, ...partial });
  }

  /**
   * Start background polling
   */
  private startPolling(): void {
    this.patientService.startPolling(this.currentRequest$.asObservable());
  }

  /**
   * Update KPI summary
   */
  private updateKpis(): void {
    this.departmentSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const kpis = this.patientService.calculateHospitalKpis();
        this.kpis$.next(kpis);
      });
  }

  /**
   * Toggle live/pause
   */
  toggleLive(): void {
    this.patientService.isLive()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLive => {
        this.patientService.setLive(!isLive);
      });
  }

  /**
   * Refresh data immediately
   */
  refreshData(): void {
    const req = this.currentRequest$.value;
    this.patientService.fetchCurrentPatients(req).pipe(takeUntil(this.destroy$)).subscribe({
      error: (err) => {
        this.snackBar.open('שגיאה בעדכון הנתונים', 'סגור', { duration: 3000 });
        console.error('Refresh error:', err);
      }
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.caseTypeFilter$.next('ALL');
    this.onlyDangerCases$.next(false);
    this.onlyAranCases$.next(false);
    this.departmentFilter$.next('');
    this.searchControl.setValue('');
  }

  /**
   * Check if any filter is active
   */
  hasActiveFilters(): boolean {
    return (
      this.caseTypeFilter$.value !== 'ALL' ||
      this.onlyDangerCases$.value ||
      this.onlyAranCases$.value ||
      this.departmentFilter$.value !== '' ||
      (this.searchControl.value || '').trim() !== ''
    );
  }

  /**
   * Handle view mode change
   */
  onViewModeChange(mode: 'DEPART' | 'DEPART_SEODE'): void {
    this.viewMode$.next(mode);
  }

  /**
   * Toggle case type filter
   */
  toggleCaseType(caseType: 'ALL' | '1' | '2' | '3'): void {
    if (this.caseTypeFilter$.value === caseType) {
      this.caseTypeFilter$.next('ALL');
    } else {
      this.caseTypeFilter$.next(caseType);
    }
  }

  /**
   * Click department card to filter
   */
  selectDepartment(deptKey: string): void {
    const current = this.departmentFilter$.value;
    if (current === deptKey) {
      this.departmentFilter$.next('');
    } else {
      this.departmentFilter$.next(deptKey);
    }
  }

  /**
   * Click KPI card to apply filter
   */
  applyKpiFilter(filterType: 'DANGER' | 'ARAN' | 'TEMP_LEAVE'): void {
    if (filterType === 'DANGER') {
      this.onlyDangerCases$.next(!this.onlyDangerCases$.value);
    } else if (filterType === 'ARAN') {
      this.onlyAranCases$.next(!this.onlyAranCases$.value);
    } else if (filterType === 'TEMP_LEAVE') {
      this.caseTypeFilter$.next(this.caseTypeFilter$.value === 'ALL' ? '1' : 'ALL');
    }
  }

  /**
   * Toggle danger cases filter
   */
  toggleDangerCases(): void {
    this.onlyDangerCases$.next(!this.onlyDangerCases$.value);
  }

  /**
   * Toggle Aran cases filter
   */
  toggleAranCases(): void {
    this.onlyAranCases$.next(!this.onlyAranCases$.value);
  }

  /**
   * Open patient detail drawer
   */
  openPatientDetails(patient: CurrentPatientRow): void {
    this.selectedPatient = patient;
    this.caseHistoryLoading$.next(true);
    this.patientService.fetchCaseMoveHistory(patient.CaseNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.caseHistory$.next(history);
          this.caseHistoryLoading$.next(false);
          if (this.detailDrawer) {
            this.detailDrawer.open();
          }
        },
        error: (err) => {
          this.caseHistoryLoading$.next(false);
          this.snackBar.open('שגיאה בטעינת היסטוריית התנועות', 'סגור', { duration: 3000 });
          console.error('Error fetching history:', err);
        }
      });
  }

  /**
   * Close detail drawer
   */
  closeDetails(): void {
    if (this.detailDrawer) {
      this.detailDrawer.close();
    }
    this.selectedPatient = null;
  }

  /**
   * Handle paginator change
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex$.next(event.pageIndex);
    this.pageSize$.next(event.pageSize);
  }

  /**
   * Handle sort change
   */
  onSortChange(sort: Sort): void {
    // Server-side sorting can be implemented here if needed
    console.log('Sort event:', sort);
  }

  /**
   * Format time duration
   */
  formatDuration(hours: number): string {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}י' ${remainingHours}ש'`;
    }
    return `${remainingHours}ש'`;
  }

  /**
   * Format date
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL');
  }

  /**
   * Get case type label
   */
  getCaseTypeLabel(caseTypeKey: string): string {
    switch (caseTypeKey) {
      case '1': return 'אשפוז';
      case '2': return 'מרפאות';
      case '3': return 'מיון';
      default: return '';
    }
  }

  /**
   * Get move category color
   */
  getMoveCategoryColor(moveCat: string): string {
    switch (moveCat) {
      case '1': return 'accent'; // admission
      case '2': return 'primary'; // transfer
      case '3': return 'warn'; // discharge
      case '4':
      case '5':
      case '6': return 'accent'; // temp leave
      default: return 'primary';
    }
  }

  /**
   * Check if row should be highlighted
   */
  isRowHighlighted(caseNumber: string): Observable<boolean> {
    return this.highlightedRows$.pipe(
      switchMap((highlighted: Set<string>) => of(highlighted.has(caseNumber)))
    );
  }

  /**
   * Format last update time
   */
  formatLastUpdateTime(date: Date | null): string {
    if (!date) return 'לא עדכן';
    return date.toLocaleTimeString('he-IL');
  }
}
