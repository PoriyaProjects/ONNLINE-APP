import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import {
  TrainingAttendanceRow,
  TrainingAttendanceStatus,
  TrainingSessionDetails,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import {
  LecturerAttendanceSummary,
  summarizeLecturerAttendance,
} from '../../utils/lecturer-attendance-summary.util';
import { formatTrainingDate, formatTrainingDateTime, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import {
  canCloseAttendanceWindow,
  canCompleteSession,
  canOpenAttendanceWindow,
  canShowQr,
} from '../../utils/training-status-transition.util';
import { CloseAttendanceDialogComponent } from '../dialogs/close-attendance-dialog/close-attendance-dialog.component';
import { CompleteSessionDialogComponent } from '../dialogs/complete-session-dialog/complete-session-dialog.component';
import { OpenAttendanceDialogComponent } from '../dialogs/open-attendance-dialog/open-attendance-dialog.component';

export type LecturerAttendanceFilter = 'all' | 'confirmed' | 'awaiting' | 'missing' | 'cancelled';

@Component({
  selector: 'app-lecturer-training-session-page',
  templateUrl: './lecturer-training-session-page.component.html',
  styleUrls: ['./lecturer-training-session-page.component.scss'],
})
export class LecturerTrainingSessionPageComponent implements OnInit, OnDestroy {
  sessionId = 0;
  session: TrainingSessionDetails | null = null;
  rows: TrainingAttendanceRow[] = [];
  filteredRows: TrainingAttendanceRow[] = [];
  summary: LecturerAttendanceSummary = {
    registered: 0,
    confirmed: 0,
    awaiting: 0,
    missing: 0,
    cancelled: 0,
    remaining: 0,
  };
  filter: LecturerAttendanceFilter = 'all';
  loading = false;
  refreshing = false;
  busy = false;
  errorMessage: string | null = null;
  lastRefreshLabel: string | null = null;
  /** In-memory QR token only — never persisted. */
  activeQrToken: string | null = null;
  activeQrExpiresAt: string | null = null;

  private destroy$ = new Subject<void>();
  private pollSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    this.load(false);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.activeQrToken = null;
    this.activeQrExpiresAt = null;
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(isRefresh: boolean): void {
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }
    this.errorMessage = null;
    this.api
      .getSessionDetails({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (sessionResult) => {
          if (!sessionResult || !sessionResult.Success || !sessionResult.Data) {
            this.loading = false;
            this.refreshing = false;
            this.session = null;
            this.errorMessage = trainingErrorMessage(sessionResult, 'לא ניתן לטעון את פרטי המועד.');
            this.stopPolling();
            return;
          }
          this.session = sessionResult.Data;
          this.syncPolling();
          this.loadAttendance(isRefresh);
        },
        () => {
          this.loading = false;
          this.refreshing = false;
          this.errorMessage = httpFailureMessage();
          this.stopPolling();
        }
      );
  }

  loadAttendance(isRefresh: boolean): void {
    this.api
      .getSessionAttendance({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          this.refreshing = false;
          if (!result || !result.Success) {
            if (!isRefresh) {
              this.rows = [];
              this.filteredRows = [];
              this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון רשימת נוכחות.');
            } else {
              this.snackBar.open(trainingErrorMessage(result, 'רענון הנוכחות נכשל.'), 'סגור', {
                duration: 4000,
              });
            }
            return;
          }
          this.rows = result.Data || [];
          this.summary = summarizeLecturerAttendance(this.rows);
          this.applyFilter();
          this.lastRefreshLabel = formatTrainingDateTime(new Date()) || '';
        },
        () => {
          this.loading = false;
          this.refreshing = false;
          if (!isRefresh) {
            this.errorMessage = httpFailureMessage();
          }
        }
      );
  }

  applyFilter(): void {
    const f = this.filter;
    this.filteredRows = this.rows.filter((r) => {
      if (f === 'all') {
        return true;
      }
      if (f === 'cancelled') {
        return r.AttendanceStatus === TrainingAttendanceStatus.Revoked;
      }
      if (f === 'confirmed') {
        return (
          r.AttendanceStatus === TrainingAttendanceStatus.Confirmed ||
          r.AttendanceStatus === TrainingAttendanceStatus.ManuallyConfirmed
        );
      }
      if (f === 'awaiting') {
        return r.AttendanceStatus === TrainingAttendanceStatus.Pending || r.AttendanceStatus == null;
      }
      if (f === 'missing') {
        return (
          r.AttendanceStatus !== TrainingAttendanceStatus.Revoked &&
          r.AttendanceStatus !== TrainingAttendanceStatus.Confirmed &&
          r.AttendanceStatus !== TrainingAttendanceStatus.ManuallyConfirmed
        );
      }
      return true;
    });
  }

  setFilter(f: LecturerAttendanceFilter): void {
    this.filter = f;
    this.applyFilter();
  }

  dateLabel(v: string | null | undefined): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }

  back(): void {
    this.router.navigate(['/training-management/lecturer/sessions']);
  }

  get canOpen(): boolean {
    return !!this.session && canOpenAttendanceWindow(this.session.Status, !!this.session.AttendanceWindowOpen);
  }

  get canClose(): boolean {
    return !!this.session && canCloseAttendanceWindow(this.session.Status, !!this.session.AttendanceWindowOpen);
  }

  get canQr(): boolean {
    return !!this.session && canShowQr(this.session.Status, !!this.session.AttendanceWindowOpen);
  }

  get canComplete(): boolean {
    return !!this.session && canCompleteSession(this.session.Status, !!this.session.AttendanceWindowOpen);
  }

  openAttendance(): void {
    if (!this.session || this.busy || !this.canOpen) {
      return;
    }
    const now = formatTrainingDateTime(new Date()) || '';
    const ref = this.dialog.open(OpenAttendanceDialogComponent, {
      width: '440px',
      direction: 'rtl',
      data: {
        courseName: this.session.CourseName || '',
        sessionDate: this.dateLabel(this.session.SessionDate),
        timeLabel: `${this.session.StartTime} – ${this.session.EndTime}`,
        currentTimeLabel: now,
        windowHint: 'חלון הנוכחות ייפתח לאישור סריקות QR.',
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busy = true;
      this.api
        .openAttendanceWindow({ SessionId: this.sessionId, ActingEmployeeID: '' })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success || !res.Data) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.activeQrToken = res.Data.QrToken || null;
            this.activeQrExpiresAt = res.Data.QrTokenExpiresAt || null;
            this.snackBar.open('חלון הנוכחות נפתח.', 'סגור', { duration: 3500 });
            this.load(true);
            if (this.activeQrToken) {
              this.router.navigate(['/training-management/lecturer/sessions', this.sessionId, 'qr']);
            }
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  showQr(): void {
    if (!this.canQr) {
      return;
    }
    this.router.navigate(['/training-management/lecturer/sessions', this.sessionId, 'qr']);
  }

  closeAttendance(): void {
    if (!this.session || this.busy || !this.canClose) {
      return;
    }
    const ref = this.dialog.open(CloseAttendanceDialogComponent, {
      width: '440px',
      direction: 'rtl',
      data: {
        courseName: this.session.CourseName || '',
        registered: this.summary.registered,
        confirmed: this.summary.confirmed,
        remaining: this.summary.remaining,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busy = true;
      this.api
        .closeAttendanceWindow({ SessionId: this.sessionId, ActingEmployeeID: '' })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.activeQrToken = null;
            this.activeQrExpiresAt = null;
            this.stopPolling();
            this.snackBar.open('חלון הנוכחות נסגר.', 'סגור', { duration: 3500 });
            this.load(true);
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  completeSession(): void {
    if (!this.session || this.busy || !this.canComplete) {
      return;
    }
    const ref = this.dialog.open(CompleteSessionDialogComponent, {
      width: '440px',
      direction: 'rtl',
      data: {
        courseName: this.session.CourseName || '',
        sessionDate: this.dateLabel(this.session.SessionDate),
        registered: this.summary.registered,
        confirmed: this.summary.confirmed,
        missing: this.summary.missing,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busy = true;
      this.api
        .completeTrainingSession({ SessionId: this.sessionId, ActingEmployeeID: '' })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.stopPolling();
            this.snackBar.open('המועד הושלם.', 'סגור', { duration: 3500 });
            this.load(true);
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  trackByRow(_i: number, row: TrainingAttendanceRow): number {
    return row.RegistrationId;
  }

  private syncPolling(): void {
    if (this.session && this.session.AttendanceWindowOpen) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.pollSub) {
      return;
    }
    this.pollSub = timer(0, 8000)
      .pipe(
        switchMap(() =>
          this.api.getSessionAttendance({ SessionId: this.sessionId, ActingEmployeeID: '' }).pipe(
            catchError(() => of(null))
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        if (!result || !result.Success) {
          return;
        }
        this.rows = result.Data || [];
        this.summary = summarizeLecturerAttendance(this.rows);
        this.applyFilter();
        this.lastRefreshLabel = formatTrainingDateTime(new Date()) || '';
      });
  }

  private stopPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }
}
