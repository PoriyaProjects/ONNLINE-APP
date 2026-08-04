import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TrainingRegistrationStatus,
  TrainingRegistrationSummary,
  TrainingSessionDetails,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { AdminCancelRegistrationDialogComponent } from '../dialogs/admin-cancel-registration-dialog/admin-cancel-registration-dialog.component';
import { AdminRegisterEmployeeDialogComponent } from '../dialogs/admin-register-employee-dialog/admin-register-employee-dialog.component';
import { ManualAttendanceDialogComponent } from '../dialogs/manual-attendance-dialog/manual-attendance-dialog.component';

@Component({
  selector: 'app-training-session-participants-page',
  templateUrl: './training-session-participants-page.component.html',
  styleUrls: ['./training-session-participants-page.component.scss'],
})
export class TrainingSessionParticipantsPageComponent implements OnInit, OnDestroy {
  sessionId = 0;
  session: TrainingSessionDetails | null = null;
  rows: TrainingRegistrationSummary[] = [];
  filtered: TrainingRegistrationSummary[] = [];
  loading = false;
  errorMessage: string | null = null;
  searchText = '';
  registrationStatusFilter = '';
  attendanceStatusFilter = '';
  busy = false;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getSessionDetails({ SessionId: this.sessionId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (sessionResult) => {
          if (sessionResult && sessionResult.Success && sessionResult.Data) {
            this.session = sessionResult.Data;
          }
          this.api
            .getSessionRegistrations({ SessionId: this.sessionId, ActingEmployeeID: '' })
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (regResult) => {
                this.loading = false;
                if (!regResult || !regResult.Success) {
                  this.rows = [];
                  this.filtered = [];
                  this.errorMessage = trainingErrorMessage(regResult, 'לא ניתן לטעון נרשמים.');
                  return;
                }
                this.rows = regResult.Data || [];
                this.applyFilters();
              },
              () => {
                this.loading = false;
                this.errorMessage = httpFailureMessage();
              }
            );
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    this.filtered = this.rows.filter((r) => {
      if (q && `${r.EmployeeFullName || ''} ${r.EmployeeID}`.toLowerCase().indexOf(q) < 0) {
        return false;
      }
      if (this.registrationStatusFilter !== '' && String(r.Status) !== this.registrationStatusFilter) {
        return false;
      }
      if (
        this.attendanceStatusFilter !== '' &&
        String(r.AttendanceStatus == null ? '' : r.AttendanceStatus) !== this.attendanceStatusFilter
      ) {
        return false;
      }
      return true;
    });
  }

  dateLabel(v: string | null | undefined): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }

  back(): void {
    this.router.navigate(['/training-management/admin/sessions']);
  }

  trackById(_i: number, row: TrainingRegistrationSummary): number {
    return row.Id;
  }

  openRegister(): void {
    if (!this.session || this.busy) {
      return;
    }
    const ref = this.dialog.open(AdminRegisterEmployeeDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data: {
        sessionId: this.sessionId,
        courseName: this.session.CourseName || '',
        sessionDate: this.dateLabel(this.session.SessionDate),
        timeLabel: `${this.session.StartTime} – ${this.session.EndTime}`,
        availablePlaces: this.session.AvailablePlaces,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result || !result.confirmed || !result.employeeId) {
        return;
      }
      this.busy = true;
      // Admin registration uses same endpoint; actor is manager; employee is selected.
      // Contract stores ActingEmployeeID as actor; employee to register must be supported later.
      // For Phase 4 blocked store, call Register with selected employee noted in reason path via ActingEmployeeID override attempt:
      this.api
        .registerEmployeeToSession({
          SessionId: this.sessionId,
          ActingEmployeeID: result.employeeId,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.snackBar.open('העובד נרשם למועד.', 'סגור', { duration: 3500 });
            this.load();
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  openCancel(row: TrainingRegistrationSummary): void {
    if (this.busy || row.Status !== TrainingRegistrationStatus.Registered) {
      return;
    }
    const ref = this.dialog.open(AdminCancelRegistrationDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data: {
        employeeName: row.EmployeeFullName || row.EmployeeID,
        courseName: row.CourseName || this.session?.CourseName || '',
        sessionDate: this.dateLabel(row.SessionDate || this.session?.SessionDate),
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result || !result.confirmed) {
        return;
      }
      this.busy = true;
      this.api
        .cancelEmployeeRegistration({
          RegistrationId: row.Id,
          Reason: result.reason,
          ActingEmployeeID: '',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.snackBar.open('ההרשמה בוטלה.', 'סגור', { duration: 3500 });
            this.load();
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  openAttendance(row: TrainingRegistrationSummary): void {
    if (this.busy) {
      return;
    }
    const ref = this.dialog.open(ManualAttendanceDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data: {
        employeeName: row.EmployeeFullName || row.EmployeeID,
        sessionLabel: `${this.session?.CourseName || ''} ${this.dateLabel(this.session?.SessionDate)}`,
        currentAttendanceStatus: row.AttendanceStatus != null ? row.AttendanceStatus : null,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result || !result.confirmed) {
        return;
      }
      this.busy = true;
      this.api
        .updateAttendanceManually({
          SessionId: this.sessionId,
          EmployeeID: row.EmployeeID,
          Attended: result.attended,
          Reason: result.reason,
          ActingEmployeeID: '',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busy = false;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.snackBar.open('הנוכחות עודכנה.', 'סגור', { duration: 3500 });
            this.load();
          },
          () => {
            this.busy = false;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }
}
