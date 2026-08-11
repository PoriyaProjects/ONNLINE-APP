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
  /** In-memory only — raw token is never persisted server-side (hash only). */
  qrToken: string | null = null;
  qrPayload = '';
  expiresAt: string | null = null;
  countdownLabel = '';
  expired = false;
  closed = false;
  loading = false;
  mintingToken = false;
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
  /** Optional token handed off from open-attendance navigation. */
  private pendingNavToken: string | null = null;
  private pendingNavExpiresAt: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private snackBar: MatSnackBar
  ) {
    const nav = this.router.getCurrentNavigation();
    const state =
      (nav && nav.extras && nav.extras.state) ||
      (typeof history !== 'undefined' ? history.state : null);
    if (state) {
      this.pendingNavToken = state.qrToken || null;
      this.pendingNavExpiresAt = state.expiresAt || state.qrTokenExpiresAt || null;
    }
  }

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    this.fullscreenSupported =
      typeof document !== 'undefined' &&
      !!(
        document.documentElement.requestFullscreen ||
        (document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void })
          .webkitRequestFullscreen
      );
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
            this.qrToken = null;
            this.qrPayload = '';
            this.stopPolling();
            this.stopCountdown();
            return;
          }
          if (this.pendingNavToken) {
            this.applyToken(this.pendingNavToken, this.pendingNavExpiresAt);
            this.pendingNavToken = null;
            this.pendingNavExpiresAt = null;
            this.loading = false;
            this.startPolling();
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
          if (!result || !result.Success || !result.Data) {
            this.loading = false;
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון את קוד ה-QR.');
            this.qrToken = null;
            this.qrPayload = '';
            return;
          }
          if (!result.Data.AttendanceWindowOpen) {
            this.loading = false;
            this.closed = true;
            this.qrToken = null;
            this.qrPayload = '';
            this.stopPolling();
            this.stopCountdown();
            return;
          }
          // Server stores hash only — raw token is not recoverable. Mint a display token.
          if (result.Data.QrToken) {
            this.loading = false;
            this.applyToken(result.Data.QrToken, result.Data.ExpiresAt);
            return;
          }
          this.ensureDisplayToken(false);
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  regenerateToken(): void {
    this.ensureDisplayToken(true);
  }

  /** Mint a new raw QR token for projector display (updates stored hash). */
  private ensureDisplayToken(showSnack: boolean): void {
    if (this.mintingToken || this.closed) {
      return;
    }
    this.mintingToken = true;
    this.api
      .generateSessionQrToken({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          this.mintingToken = false;
          if (!result || !result.Success || !result.Data || !result.Data.QrToken) {
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן להפיק קוד QR.');
            if (showSnack) {
              this.snackBar.open(this.errorMessage, 'סגור', { duration: 5000 });
            }
            return;
          }
          this.errorMessage = null;
          this.applyToken(result.Data.QrToken, result.Data.ExpiresAt);
          if (showSnack) {
            this.snackBar.open('קוד QR עודכן.', 'סגור', { duration: 3000 });
          }
        },
        () => {
          this.loading = false;
          this.mintingToken = false;
          if (showSnack) {
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        }
      );
  }

  private applyToken(token: string, expiresAt: string | null | undefined): void {
    this.qrToken = token;
    this.expiresAt = expiresAt || null;
    this.qrPayload = buildTrainingAttendanceQrPayload(this.qrToken);
    this.expired = false;
    this.closed = false;
    this.startCountdown();
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
          this.api
            .getSessionAttendance({ SessionId: this.sessionId, ActingEmployeeID: '' })
            .pipe(catchError(() => of(null)))
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
    // Expiry is server local time (GETDATE()), same as browser local for on-prem hospital apps.
    const exp = parseTrainingDate(this.expiresAt);
    if (!exp) {
      this.countdownLabel = '—';
      return;
    }
    const ms = exp.getTime() - Date.now();
    if (ms <= 0) {
      this.expired = true;
      this.countdownLabel = '00:00';
      this.qrPayload = '';
      this.stopCountdown();
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
    if (
      document.fullscreenElement ||
      (doc as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
    ) {
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
