import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  ConfirmTrainingAttendanceResponse,
  QrAttendanceSessionDetails,
  TrainingErrorCodes,
  TrainingValidationLimits,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, formatTrainingDateTime, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

export type AttendancePageState =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'success'
  | 'alreadyConfirmed'
  | 'invalidToken'
  | 'expiredToken'
  | 'revokedToken'
  | 'windowNotOpen'
  | 'windowClosed'
  | 'windowExpired'
  | 'sessionCancelled'
  | 'sessionCompleted'
  | 'notRegistered'
  | 'identityMismatch'
  | 'unauthorized'
  | 'networkError'
  | 'storeUnavailable'
  | 'missingToken'
  | 'genericError';

@Component({
  selector: 'app-employee-attendance-confirmation-page',
  templateUrl: './employee-attendance-confirmation-page.component.html',
  styleUrls: ['./employee-attendance-confirmation-page.component.scss'],
})
export class EmployeeAttendanceConfirmationPageComponent implements OnInit, OnDestroy {
  state: AttendancePageState = 'loading';
  statusMessage = '';
  token = '';
  session: QrAttendanceSessionDetails | null = null;
  confirmResult: ConfirmTrainingAttendanceResponse | null = null;
  form: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      IdentityNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]+$/),
          Validators.maxLength(TrainingValidationLimits.IdentityNumberMaxLength),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          this.resetSensitiveState();
          const raw = params.get('token') || '';
          this.token = decodeURIComponent(raw).trim();
          if (!this.token) {
            this.state = 'missingToken';
            this.statusMessage = 'קוד ה-QR חסר או אינו תקין.';
            return EMPTY;
          }
          this.state = 'loading';
          this.statusMessage = 'בודקים את קוד הנוכחות...';
          return this.api.getAttendanceSessionByToken({
            QrToken: this.token,
            ActingEmployeeID: '',
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(
        (result) => {
          if (!result) {
            return;
          }
          if (!result.Success) {
            this.applyErrorCode(result.ErrorCode, result.Message);
            this.session = null;
            return;
          }
          this.session = result.Data || null;
          if (!this.session) {
            this.state = 'genericError';
            this.statusMessage = 'לא ניתן לטעון את פרטי ההדרכה.';
            return;
          }
          if (this.session.ExistingAttendanceStatus != null && this.session.ExistingConfirmedAt) {
            this.state = 'alreadyConfirmed';
            this.statusMessage =
              this.session.SafeMessage || 'הנוכחות שלך כבר אושרה עבור הדרכה זו.';
            this.confirmResult = {
              AttendanceId: 0,
              RegistrationId: 0,
              SessionId: this.session.SessionId,
              ConfirmedAt: this.session.ExistingConfirmedAt,
              CertificateQueued: false,
              AlreadyConfirmed: true,
              CourseName: this.session.CourseName,
              SessionDate: this.session.SessionDate,
              SafeMessage: this.statusMessage,
            };
            return;
          }
          const canConfirm =
            this.session.CanConfirmAttendance != null
              ? !!this.session.CanConfirmAttendance
              : !!this.session.AttendanceWindowOpen;
          if (!canConfirm && !this.session.AttendanceWindowOpen) {
            this.state = 'windowNotOpen';
            this.statusMessage =
              this.session.SafeMessage || 'חלון אישור הנוכחות עדיין לא נפתח.';
            return;
          }
          this.state = 'ready';
          this.statusMessage =
            this.session.SafeMessage || 'יש לאמת את פרטיך ולאשר את השתתפותך בהדרכה.';
          this.form.reset({ IdentityNumber: '' });
        },
        () => {
          this.state = 'networkError';
          this.statusMessage = httpFailureMessage();
        }
      );
  }

  ngOnDestroy(): void {
    this.resetSensitiveState();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canSubmit(): boolean {
    return this.state === 'ready' && this.form.valid && !!this.token;
  }

  dateLabel(v: string | null | undefined): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }

  dateTimeLabel(v: string | null | undefined): string {
    return formatTrainingDateTime(parseTrainingDate(v)) || v || '—';
  }

  confirm(): void {
    if (!this.canSubmit || this.state === 'submitting') {
      this.form.markAllAsTouched();
      return;
    }
    this.state = 'submitting';
    this.statusMessage = 'מאשרים את הנוכחות שלך...';
    const identity = String(this.form.get('IdentityNumber').value || '').trim();
    this.api
      .confirmCourseAttendance({
        QrToken: this.token,
        IdentityNumber: identity,
        ActingEmployeeID: '',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.form.patchValue({ IdentityNumber: '' });
          this.form.markAsPristine();
          if (!result || !result.Success || !result.Data) {
            this.applyErrorCode(result && result.ErrorCode, result && result.Message);
            if (
              result &&
              (result.ErrorCode === TrainingErrorCodes.ValidationFailed ||
                result.ErrorCode === TrainingErrorCodes.IdentityMismatch)
            ) {
              if (result.ErrorCode === TrainingErrorCodes.IdentityMismatch) {
                this.state = 'identityMismatch';
              } else {
                this.state = 'ready';
                this.statusMessage = trainingErrorMessage({
                  ErrorCode: result.ErrorCode,
                  Message: result.Message,
                });
              }
            }
            return;
          }
          this.confirmResult = result.Data;
          if (result.Data.AlreadyConfirmed) {
            this.state = 'alreadyConfirmed';
            this.statusMessage =
              result.Data.SafeMessage || 'הנוכחות שלך כבר אושרה עבור הדרכה זו.';
          } else {
            this.state = 'success';
            this.statusMessage = result.Data.SafeMessage || 'הנוכחות אושרה בהצלחה.';
          }
          this.token = '';
        },
        () => {
          this.state = 'networkError';
          this.statusMessage = httpFailureMessage();
          this.form.patchValue({ IdentityNumber: '' });
        }
      );
  }

  retry(): void {
    const t = this.route.snapshot.paramMap.get('token');
    if (!t) {
      this.state = 'missingToken';
      return;
    }
    this.state = 'loading';
    this.statusMessage = 'בודקים את קוד הנוכחות...';
    this.api
      .getAttendanceSessionByToken({ QrToken: decodeURIComponent(t).trim(), ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success) {
            this.applyErrorCode(result && result.ErrorCode, result && result.Message);
            return;
          }
          this.session = result.Data || null;
          this.token = decodeURIComponent(t).trim();
          this.state = 'ready';
          this.statusMessage = 'יש לאמת את פרטיך ולאשר את השתתפותך בהדרכה.';
        },
        () => {
          this.state = 'networkError';
          this.statusMessage = httpFailureMessage();
        }
      );
  }

  goMyTrainings(): void {
    this.router.navigate(['/training-management/my-trainings']);
  }

  goHome(): void {
    this.router.navigate(['/training-management/courses']);
  }

  isFinalState(): boolean {
    return (
      this.state === 'success' ||
      this.state === 'alreadyConfirmed' ||
      this.state === 'invalidToken' ||
      this.state === 'expiredToken' ||
      this.state === 'revokedToken' ||
      this.state === 'windowClosed' ||
      this.state === 'windowExpired' ||
      this.state === 'sessionCancelled' ||
      this.state === 'sessionCompleted' ||
      this.state === 'notRegistered' ||
      this.state === 'unauthorized' ||
      this.state === 'missingToken'
    );
  }

  isRetryable(): boolean {
    return (
      this.state === 'networkError' ||
      this.state === 'storeUnavailable' ||
      this.state === 'windowNotOpen' ||
      this.state === 'genericError'
    );
  }

  private resetSensitiveState(): void {
    this.token = '';
    this.session = null;
    this.confirmResult = null;
    this.form.reset({ IdentityNumber: '' });
  }

  private applyErrorCode(code: string | null | undefined, fallback?: string | null): void {
    const c = code || '';
    const msg = trainingErrorMessage(
      { ErrorCode: c, Message: fallback },
      fallback || 'אירעה שגיאה.'
    );
    this.statusMessage = msg;
    switch (c) {
      case TrainingErrorCodes.QrInvalid:
        this.state = 'invalidToken';
        this.statusMessage = 'קוד ה-QR אינו תקין או שאינו קיים.';
        break;
      case TrainingErrorCodes.QrExpired:
        this.state = 'expiredToken';
        this.statusMessage = 'תוקף קוד ה-QR הסתיים.';
        break;
      case TrainingErrorCodes.QrRevoked:
        this.state = 'revokedToken';
        break;
      case TrainingErrorCodes.AttendanceWindowNotOpen:
      case TrainingErrorCodes.AttendanceNotOpen:
        this.state = 'windowNotOpen';
        this.statusMessage = 'חלון אישור הנוכחות עדיין לא נפתח.';
        break;
      case TrainingErrorCodes.AttendanceWindowClosed:
        this.state = 'windowClosed';
        this.statusMessage = 'חלון אישור הנוכחות נסגר.';
        break;
      case TrainingErrorCodes.AttendanceWindowExpired:
        this.state = 'windowExpired';
        break;
      case TrainingErrorCodes.SessionCancelled:
      case TrainingErrorCodes.SessionAlreadyCancelled:
        this.state = 'sessionCancelled';
        this.statusMessage = 'מועד ההדרכה בוטל ולא ניתן לאשר נוכחות.';
        break;
      case TrainingErrorCodes.SessionAlreadyCompleted:
        this.state = 'sessionCompleted';
        this.statusMessage = 'מועד ההדרכה כבר הושלם ולא ניתן לאשר נוכחות דרך קוד זה.';
        break;
      case TrainingErrorCodes.EmployeeNotRegistered:
        this.state = 'notRegistered';
        this.statusMessage = 'לא נמצא רישום פעיל שלך למועד הדרכה זה.';
        break;
      case TrainingErrorCodes.RegistrationCancelled:
        this.state = 'notRegistered';
        this.statusMessage = 'ההרשמה למועד זה בוטלה.';
        break;
      case TrainingErrorCodes.IdentityMismatch:
        this.state = 'identityMismatch';
        break;
      case TrainingErrorCodes.AttendanceAlreadyConfirmed:
        this.state = 'alreadyConfirmed';
        this.statusMessage = 'הנוכחות שלך כבר אושרה עבור הדרכה זו.';
        break;
      case TrainingErrorCodes.Unauthorized:
        this.state = 'unauthorized';
        break;
      case TrainingErrorCodes.DataStoreUnavailable:
      case TrainingErrorCodes.DatabaseDependencyMissing:
        this.state = 'storeUnavailable';
        this.statusMessage = 'שירות אישור הנוכחות אינו זמין כעת.';
        break;
      default:
        this.state = 'genericError';
        break;
    }
  }
}
