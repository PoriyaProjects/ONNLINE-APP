import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CertificateErrorDto,
  TRAINING_CERTIFICATE_STATUS_HE,
  TRAINING_NOTIFICATION_STATUS_HE,
  TrainingCertificateStatus,
  TrainingNotificationStatus,
  TrainingNotificationSummary,
  TrainingNotificationType,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

/** Hebrew labels for notification types (Phase 7 ops). */
export const TRAINING_NOTIFICATION_TYPE_LABELS: Readonly<Record<number, string>> = {
  [TrainingNotificationType.SessionReminder]: 'תזכורת למועד',
  [TrainingNotificationType.CertificateEmail]: 'דוא״ל תעודה',
  [TrainingNotificationType.SessionCancelled]: 'ביטול מועד',
};

@Component({
  selector: 'app-training-operations-errors-page',
  templateUrl: './training-operations-errors-page.component.html',
  styleUrls: ['./training-operations-errors-page.component.scss'],
})
export class TrainingOperationsErrorsPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  certificateErrors: CertificateErrorDto[] = [];
  notificationErrors: TrainingNotificationSummary[] = [];
  filterForm: FormGroup;
  actionInFlight = false;
  certificateColumns = [
    'process',
    'course',
    'session',
    'employee',
    'status',
    'attempts',
    'lastAttempt',
    'error',
    'actions',
  ];
  notificationColumns = [
    'process',
    'course',
    'session',
    'employee',
    'status',
    'attempts',
    'lastAttempt',
    'error',
    'actions',
  ];

  readonly certStatusOptions = [
    { value: TrainingCertificateStatus.Failed, label: TRAINING_CERTIFICATE_STATUS_HE[TrainingCertificateStatus.Failed] },
    { value: TrainingCertificateStatus.Pending, label: TRAINING_CERTIFICATE_STATUS_HE[TrainingCertificateStatus.Pending] },
    { value: TrainingCertificateStatus.Void, label: TRAINING_CERTIFICATE_STATUS_HE[TrainingCertificateStatus.Void] },
  ];

  readonly notificationStatusOptions = [
    { value: TrainingNotificationStatus.Failed, label: TRAINING_NOTIFICATION_STATUS_HE[TrainingNotificationStatus.Failed] },
    { value: TrainingNotificationStatus.Pending, label: TRAINING_NOTIFICATION_STATUS_HE[TrainingNotificationStatus.Pending] },
  ];

  readonly notificationTypeOptions = [
    { value: TrainingNotificationType.CertificateEmail, label: TRAINING_NOTIFICATION_TYPE_LABELS[TrainingNotificationType.CertificateEmail] },
    { value: TrainingNotificationType.SessionReminder, label: TRAINING_NOTIFICATION_TYPE_LABELS[TrainingNotificationType.SessionReminder] },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private api: TrainingManagementApiService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      FromDate: [''],
      ToDate: [''],
      EmployeeSearch: [''],
      RetryableOnly: [true],
      CertificateStatus: [TrainingCertificateStatus.Failed],
      NotificationStatus: [TrainingNotificationStatus.Failed],
      NotificationType: [null as number | null],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    const f = this.filterForm.getRawValue();
    let pending = 2;
    let hadError = false;

    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading = false;
        if (hadError && this.certificateErrors.length === 0 && this.notificationErrors.length === 0) {
          this.errorMessage = this.errorMessage || 'לא ניתן לטעון תקלות תפעול.';
        }
      }
    };

    this.api
      .getCertificateErrors({
        FromDate: f.FromDate || null,
        ToDate: f.ToDate || null,
        EmployeeSearch: f.EmployeeSearch || null,
        RetryableOnly: f.RetryableOnly,
        Status: f.CertificateStatus != null ? f.CertificateStatus : null,
        Skip: 0,
        Take: 100,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success) {
            hadError = true;
            this.certificateErrors = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון תקלות תעודות.');
          } else {
            this.certificateErrors = (result.Data && result.Data.Items) || [];
          }
          done();
        },
        () => {
          hadError = true;
          this.certificateErrors = [];
          this.errorMessage = httpFailureMessage();
          done();
        }
      );

    this.api
      .getNotificationErrors({
        FromDate: f.FromDate || null,
        ToDate: f.ToDate || null,
        EmployeeSearch: f.EmployeeSearch || null,
        RetryableOnly: f.RetryableOnly,
        Status: f.NotificationStatus != null ? f.NotificationStatus : null,
        NotificationType: f.NotificationType != null ? f.NotificationType : null,
        Skip: 0,
        Take: 100,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success) {
            hadError = true;
            this.notificationErrors = [];
            if (!this.errorMessage) {
              this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון תקלות התראות.');
            }
          } else {
            this.notificationErrors = result.Data || [];
          }
          done();
        },
        () => {
          hadError = true;
          this.notificationErrors = [];
          if (!this.errorMessage) {
            this.errorMessage = httpFailureMessage();
          }
          done();
        }
      );
  }

  applyFilters(): void {
    this.load();
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    return formatTrainingDate(parseTrainingDate(value)) || value;
  }

  certificateStatusLabel(status: number): string {
    return TRAINING_CERTIFICATE_STATUS_HE[status as TrainingCertificateStatus] || '—';
  }

  notificationStatusLabel(status: number): string {
    return TRAINING_NOTIFICATION_STATUS_HE[status as TrainingNotificationStatus] || '—';
  }

  notificationTypeLabel(type: number): string {
    return TRAINING_NOTIFICATION_TYPE_LABELS[type] || 'התראה';
  }

  get hasAnyRows(): boolean {
    return this.certificateErrors.length > 0 || this.notificationErrors.length > 0;
  }

  retryCertificate(row: CertificateErrorDto): void {
    if (this.actionInFlight || !row.Retryable) {
      return;
    }
    if (!window.confirm('להפעיל מחדש הפקת תעודה עבור ' + (row.EmployeeFullName || row.EmployeeID) + '?')) {
      return;
    }
    this.actionInFlight = true;
    this.snackBar.open('הפעולה נשלחה לעיבוד מחדש.', 'סגור', { duration: 2500 });
    this.api
      .retryCertificateGeneration({
        CertificateId: row.CertificateId,
        ActingEmployeeID: '',
        Reason: 'Admin retry from operations console',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.actionInFlight = false;
          if (!result || !result.Success) {
            this.snackBar.open(
              trainingErrorMessage(result, 'העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.'),
              'סגור',
              { duration: 4000 }
            );
            return;
          }
          this.snackBar.open('העיבוד הושלם בהצלחה.', 'סגור', { duration: 3000 });
          this.load();
        },
        () => {
          this.actionInFlight = false;
          this.snackBar.open('העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.', 'סגור', { duration: 4000 });
        }
      );
  }

  resendCertificateEmail(row: CertificateErrorDto): void {
    if (this.actionInFlight) {
      return;
    }
    if (!window.confirm('לשלוח מחדש את דוא״ל התעודה עבור ' + (row.EmployeeFullName || row.EmployeeID) + '?')) {
      return;
    }
    this.actionInFlight = true;
    this.snackBar.open('הפעולה נשלחה לעיבוד מחדש.', 'סגור', { duration: 2500 });
    this.api
      .resendCertificateEmail({ CertificateId: row.CertificateId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.actionInFlight = false;
          if (!result || !result.Success) {
            this.snackBar.open(
              trainingErrorMessage(result, 'העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.'),
              'סגור',
              { duration: 4000 }
            );
            return;
          }
          this.snackBar.open('העיבוד הושלם בהצלחה.', 'סגור', { duration: 3000 });
          this.load();
        },
        () => {
          this.actionInFlight = false;
          this.snackBar.open('העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.', 'סגור', { duration: 4000 });
        }
      );
  }

  retryNotification(row: TrainingNotificationSummary): void {
    if (this.actionInFlight || row.Retryable === false) {
      return;
    }
    if (!window.confirm('לנסות שוב לשלוח התראה עבור ' + (row.EmployeeFullName || row.EmployeeID) + '?')) {
      return;
    }
    this.actionInFlight = true;
    this.snackBar.open('הפעולה נשלחה לעיבוד מחדש.', 'סגור', { duration: 2500 });
    this.api
      .retryNotification({ NotificationId: row.Id, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.actionInFlight = false;
          if (!result || !result.Success) {
            this.snackBar.open(
              trainingErrorMessage(result, 'העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.'),
              'סגור',
              { duration: 4000 }
            );
            return;
          }
          this.snackBar.open('העיבוד הושלם בהצלחה.', 'סגור', { duration: 3000 });
          this.load();
        },
        () => {
          this.actionInFlight = false;
          this.snackBar.open('העיבוד נכשל שוב. ניתן לעיין בפרטי התקלה.', 'סגור', { duration: 4000 });
        }
      );
  }
}
