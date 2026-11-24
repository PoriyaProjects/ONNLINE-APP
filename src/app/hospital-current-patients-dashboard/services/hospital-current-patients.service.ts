import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, timer, throwError } from 'rxjs';
import { catchError, map, switchMap, tap, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  CurrentPatientRow,
  DepartmentSummaryRow,
  PatientMoveHistoryRow,
  MonitoringSyncState,
  CurrentPatientsRequest
} from '../models/patient-monitoring.models';

const BASE_URL = (environment.url || '').replace(/\/?$/, '/');

const JSON_HEADERS = new HttpHeaders({
  Accept: 'application/json; charset=utf-8',
  'Content-Type': 'application/json; charset=utf-8'
});

/**
 * Unwrap ASP.NET AJAX { d: ... } wrapper
 */
function unwrap<T>(res: unknown): T {
  if (res == null) {
    return null as unknown as T;
  }
  if (typeof res === 'object' && res !== null && 'd' in res) {
    return (res as { d: T }).d;
  }
  return res as T;
}

/**
 * Handle ASMX errors (HTTP 500 with { Message, StackTrace, ExceptionType })
 */
function handleAsmxError(error: any) {
  console.error('ASMX Error:', error);
  const message = error?.error?.Message || error?.message || 'Unknown error';
  return throwError(() => new Error(message));
}

@Injectable({
  providedIn: 'root'
})
export class HospitalCurrentPatientsService {
  private currentPatients$ = new BehaviorSubject<CurrentPatientRow[]>([]);
  private departmentSummary$ = new BehaviorSubject<DepartmentSummaryRow[]>([]);
  private syncState$ = new BehaviorSubject<MonitoringSyncState | null>(null);
  private isLive$ = new BehaviorSubject<boolean>(true);
  private lastUpdateTime$ = new BehaviorSubject<Date | null>(null);
  private highlightedRows$ = new BehaviorSubject<Set<string>>(new Set());
  private pollingSubscription: any;

  constructor(private http: HttpClient) {}

  /**
   * Fetch current patients for the given filters
   */
  fetchCurrentPatients(req: CurrentPatientsRequest): Observable<CurrentPatientRow[]> {
    return this.http.post<{ d: CurrentPatientRow[] }>(
      `${BASE_URL}FetchCurrentHospitalPatients`,
      {
        viewMode: req.viewMode,
        departmentFilter: req.departmentFilter,
        caseTypeFilter: req.caseTypeFilter,
        onlyDangerCases: req.onlyDangerCases,
        onlyAranCases: req.onlyAranCases,
        freeSearch: req.freeSearch,
        pageIndex: req.pageIndex,
        pageSize: req.pageSize
      },
      { headers: JSON_HEADERS }
    ).pipe(
      map(response => unwrap<CurrentPatientRow[]>(response)),
      tap(rows => {
        this.currentPatients$.next(rows);
        this.lastUpdateTime$.next(new Date());
      }),
      catchError(handleAsmxError)
    );
  }

  /**
   * Fetch department census summary
   */
  fetchDepartmentSummary(viewMode: 'DEPART' | 'DEPART_SEODE'): Observable<DepartmentSummaryRow[]> {
    return this.http.post<{ d: DepartmentSummaryRow[] }>(
      `${BASE_URL}FetchDepartmentSummary`,
      { viewMode },
      { headers: JSON_HEADERS }
    ).pipe(
      map(response => unwrap<DepartmentSummaryRow[]>(response)),
      tap(rows => {
        this.departmentSummary$.next(rows);
        this.lastUpdateTime$.next(new Date());
      }),
      catchError(handleAsmxError)
    );
  }

  /**
   * Fetch monitoring sync state to detect changes
   */
  fetchMonitoringSyncState(): Observable<MonitoringSyncState> {
    return this.http.post<{ d: MonitoringSyncState }>(
      `${BASE_URL}FetchMonitoringSyncState`,
      {},
      { headers: JSON_HEADERS }
    ).pipe(
      map(response => unwrap<MonitoringSyncState>(response)),
      tap(state => this.syncState$.next(state)),
      catchError(handleAsmxError)
    );
  }

  /**
   * Fetch case/patient movement history
   */
  fetchCaseMoveHistory(caseNumber: string): Observable<PatientMoveHistoryRow[]> {
    return this.http.post<{ d: PatientMoveHistoryRow[] }>(
      `${BASE_URL}FetchCaseMoveHistory`,
      { caseNumber },
      { headers: JSON_HEADERS }
    ).pipe(
      map(response => unwrap<PatientMoveHistoryRow[]>(response)),
      catchError(handleAsmxError)
    );
  }

  /**
   * Start background polling loop
   * Polls FetchMonitoringSyncState every 4-5 seconds
   * Only re-fetches patient/department data when state changes
   */
  startPolling(request$: Observable<CurrentPatientsRequest>, interval = 4500): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    this.pollingSubscription = this.isLive$
      .pipe(
        switchMap(isLive => {
          if (!isLive) {
            return new Observable(obs => {
              obs.complete();
            });
          }
          return timer(0, interval).pipe(
            switchMap(() => this.fetchMonitoringSyncState()),
            switchMap(newState => {
              const prevState = this.syncState$.value;
              const hasChanged = !prevState ||
                newState.ActiveCount !== prevState.ActiveCount ||
                newState.MaxInsertDateTime !== prevState.MaxInsertDateTime ||
                newState.MaxMoveDate !== prevState.MaxMoveDate ||
                newState.MaxMoveTime !== prevState.MaxMoveTime;

              if (hasChanged) {
                return request$.pipe(
                  switchMap(req => this.fetchCurrentPatients(req)),
                  switchMap(patients => request$.pipe(
                    switchMap(req => this.fetchDepartmentSummary(req.viewMode)),
                    map(depts => ({ patients, depts }))
                  ))
                );
              }
              return new Observable(obs => obs.next({ patients: [], depts: [] }));
            }),
            takeUntil(this.isLive$.pipe(
              switchMap(isLive => isLive ? new Observable(obs => obs.complete()) : new Observable(obs => obs.next(true)))
            ))
          );
        })
      )
      .subscribe({
        error: (err) => console.error('Polling error:', err)
      });
  }

  /**
   * Stop background polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Pause/resume live updates
   */
  setLive(isLive: boolean): void {
    this.isLive$.next(isLive);
  }

  /**
   * Observables for component subscription
   */
  currentPatients(): Observable<CurrentPatientRow[]> {
    return this.currentPatients$.asObservable();
  }

  departmentSummary(): Observable<DepartmentSummaryRow[]> {
    return this.departmentSummary$.asObservable();
  }

  syncState(): Observable<MonitoringSyncState | null> {
    return this.syncState$.asObservable();
  }

  isLive(): Observable<boolean> {
    return this.isLive$.asObservable();
  }

  lastUpdateTime(): Observable<Date | null> {
    return this.lastUpdateTime$.asObservable();
  }

  highlightedRows(): Observable<Set<string>> {
    return this.highlightedRows$.asObservable();
  }

  /**
   * Highlight a row (for animation)
   */
  highlightRow(caseNumber: string, duration = 2000): void {
    const highlighted = this.highlightedRows$.value;
    highlighted.add(caseNumber);
    this.highlightedRows$.next(new Set(highlighted));

    setTimeout(() => {
      highlighted.delete(caseNumber);
      this.highlightedRows$.next(new Set(highlighted));
    }, duration);
  }

  /**
   * Get current state without subscription
   */
  getCurrentPatients(): CurrentPatientRow[] {
    return this.currentPatients$.value;
  }

  getDepartmentSummary(): DepartmentSummaryRow[] {
    return this.departmentSummary$.value;
  }

  getSyncState(): MonitoringSyncState | null {
    return this.syncState$.value;
  }

  /**
   * Calculate hospital-wide KPIs from department summary
   */
  calculateHospitalKpis(): {
    totalPatients: number;
    eshpozCount: number;
    clinicsCount: number;
    miyunCount: number;
    dangerCasesCount: number;
    aranCasesCount: number;
    temporaryLeaveCount: number;
  } {
    const depts = this.departmentSummary$.value || [];
    return {
      totalPatients: depts.reduce((sum, d) => sum + d.TotalPatients, 0),
      eshpozCount: depts.reduce((sum, d) => sum + d.EshpozCount, 0),
      clinicsCount: depts.reduce((sum, d) => sum + d.ClinicsCount, 0),
      miyunCount: depts.reduce((sum, d) => sum + d.MiyunCount, 0),
      dangerCasesCount: depts.reduce((sum, d) => sum + d.DangerCasesCount, 0),
      aranCasesCount: depts.reduce((sum, d) => sum + d.AranCasesCount, 0),
      temporaryLeaveCount: depts.reduce((sum, d) => sum + d.TemporaryLeaveCount, 0)
    };
  }
}
