import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { TrainingSessionDetails } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import {
  LecturerAttendanceSummary,
  summarizeLecturerAttendance,
} from '../../utils/lecturer-attendance-summary.util';
import { formatTrainingDate, formatTrainingDateTime, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { buildTrainingAttendanceQrPayload } from '../../utils/training-qr-payload.util';

@Component({
  selector: 'app-lecturer-session-qr-display',
  templateUrl: './lecturer-session-qr-display.component.html',
  styleUrls: ['./lecturer-session-qr-display.component.scss'],
})
export class LecturerSessionQrDisplayComponent implements OnInit, OnDestroy {
  sessionId = 0;
  session: TrainingSessionDetails | null = null;
  /** In-memory only */
  qrToken: string | null = null;
  qrPayload = '';
  expiresAt: string | null = null;
  countdownLabel = '';
  expired = false;
  closed = false;
  loading = false;
  errorMessage: string | null = null;
  summary: LecturerAttendanceSummary = {
    registered: 0,
    confirmed: 0,
    awaiting: 0,
    missing: 0,
    cancelled: 0,
    remaining: 0,
  };
  lastRefreshLabel: string | null = null;
  fullscreenSupported = false;
  private destroy$ = new Subject<void>();
  private pollSub: Subscription | null = null;
  private countdownSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    this.fullscreenSupported =
      typeof document !== 'undefined' &&
      !!(document.documentElement.requestFullscreen || (document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen);
    this.bootstrap();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopCountdown();
    this.qrToken = null;
    this.qrPayload = '';
    this.destroy$.next();
    this.destroy$.complete();
    this.exitFullscreenSafe();
  }

  bootstrap(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getSessionDetails({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (sessionResult) => {
          if (!sessionResult || !sessionResult.Success || !sessionResult.Data) {
            this.loading = false;
            this.errorMessage = trainingErrorMessage(sessionResult, 'לא ניתן לטעון את המועד.');
            return;
          }
          this.session = sessionResult.Data;
          this.closed = !this.session.AttendanceWindowOpen;
          if (this.closed) {
            this.loading = false;
            this.stopPolling();
            this.stopCountdown();
            return;
          }
          this.fetchActiveToken();
          this.startPolling();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  fetchActiveToken(): void {
    this.api
      .getActiveSessionQrToken({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success || !result.Data) {
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון את קוד ה-QR.');
            this.qrToken = null;
            this.qrPayload = '';
            return;
          }
          if (!result.Data.AttendanceWindowOpen) {
            this.closed = true;
            this.qrToken = null;
            this.qrPayload = '';
            this.stopPolling();
            this.stopCountdown();
            return;
          }
          this.qrToken = result.Data.QrToken;
          this.expiresAt = result.Data.ExpiresAt;
          this.qrPayload = buildTrainingAttendanceQrPayload(this.qrToken);
          this.startCountdown();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  regenerateToken(): void {
    this.api
      .generateSessionQrToken({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success || !result.Data) {
            this.snackBar.open(trainingErrorMessage(result), 'סגור', { duration: 5000 });
            return;
          }
          this.qrToken = result.Data.QrToken;
          this.expiresAt = result.Data.ExpiresAt;
          this.qrPayload = buildTrainingAttendanceQrPayload(this.qrToken);
          this.expired = false;
          this.startCountdown();
          this.snackBar.open('קוד QR עודכן.', 'סגור', { duration: 3000 });
        },
        () => this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 })
      );
  }

  dateLabel(v: string | null | undefined): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }

  exit(): void {
    this.exitFullscreenSafe();
    this.router.navigate(['/training-management/lecturer/sessions', this.sessionId]);
  }

  toggleFullscreen(): void {
    if (!this.fullscreenSupported || typeof document === 'undefined') {
      return;
    }
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(el) as Promise<void> | void;
          if (p && typeof (p as Promise<void>).catch === 'function') {
            (p as Promise<void>).catch(() => undefined);
          }
        } catch (_e) {
          /* browser rejected */
        }
      }
    } else {
      this.exitFullscreenSafe();
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
        this.summary = summarizeLecturerAttendance(result.Data || []);
        this.lastRefreshLabel = formatTrainingDateTime(new Date()) || '';
      });
  }

  private stopPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownSub = timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.tickCountdown());
  }

  private stopCountdown(): void {
    if (this.countdownSub) {
      this.countdownSub.unsubscribe();
      this.countdownSub = null;
    }
  }

  private tickCountdown(): void {
    const exp = parseTrainingDate(this.expiresAt);
    if (!exp) {
      this.countdownLabel = '—';
      return;
    }
    const ms = exp.getTime() - Date.now();
    if (ms <= 0) {
      this.expired = true;
      this.countdownLabel = '00:00';
      this.stopCountdown();
      this.bootstrap();
      return;
    }
    this.expired = false;
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    this.countdownLabel = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private exitFullscreenSafe(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    if (document.fullscreenElement || (doc as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
      const exit = document.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) {
        try {
          const p = exit.call(document) as Promise<void> | void;
          if (p && typeof (p as Promise<void>).catch === 'function') {
            (p as Promise<void>).catch(() => undefined);
          }
        } catch (_e) {
          /* ignore */
        }
      }
    }
  }
}
