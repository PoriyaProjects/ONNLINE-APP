import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseStatus, TrainingCourseSummary, TrainingSessionStatus } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('StartTime')?.value;
  const end = group.get('EndTime')?.value;
  if (!start || !end) {
    return null;
  }
  return end > start ? null : { endBeforeStart: true };
}

@Component({
  selector: 'app-training-session-form',
  templateUrl: './training-session-form.component.html',
  styleUrls: ['./training-session-form.component.scss'],
})
export class TrainingSessionFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  courses: TrainingCourseSummary[] = [];
  loading = false;
  saving = false;
  errorMessage: string | null = null;
  isEdit = false;
  sessionId: number | null = null;
  registeredCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private api: TrainingManagementApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirm: ConfirmationDialogService
  ) {
    this.form = this.fb.group(
      {
        CourseId: [null, Validators.required],
        SessionDate: ['', Validators.required],
        StartTime: ['', Validators.required],
        EndTime: ['', Validators.required],
        Location: ['', Validators.required],
        LecturerEmployeeID: ['', Validators.required],
        Capacity: [null, [Validators.required, Validators.min(1)]],
        RegistrationCloseAt: ['', Validators.required],
        AttendanceOpenAt: ['', Validators.required],
        AttendanceCloseAt: ['', Validators.required],
      },
      { validators: endAfterStart }
    );
  }

  ngOnInit(): void {
    this.loadCourses();
    const idParam = this.route.snapshot.paramMap.get('sessionId');
    if (idParam) {
      this.isEdit = true;
      this.sessionId = Number(idParam);
      this.loadSession(this.sessionId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourses(): void {
    this.api
      .getCourses({ ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result && result.Success && result.Data) {
          this.courses = result.Data.filter((c) => c.Status === TrainingCourseStatus.Active);
        }
      });
  }

  loadSession(id: number): void {
    this.loading = true;
    this.api
      .getSessionDetails({ SessionId: id, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success || !result.Data) {
            this.errorMessage = trainingErrorMessage(result);
            return;
          }
          const s = result.Data;
          if (s.Status === TrainingSessionStatus.Cancelled || s.Status === TrainingSessionStatus.Completed) {
            this.errorMessage = 'המועד בוטל או הושלם ואינו ניתן לעריכה.';
            return;
          }
          this.registeredCount = s.RegisteredCount || 0;
          this.form.patchValue({
            CourseId: s.CourseId,
            SessionDate: s.SessionDate,
            StartTime: s.StartTime,
            EndTime: s.EndTime,
            Location: s.Location || '',
            LecturerEmployeeID: s.LecturerEmployeeID,
            Capacity: s.Capacity,
            RegistrationCloseAt: this.toDateTimeLocal(s.RegistrationCloseAt),
            AttendanceOpenAt: this.toDateTimeLocal(s.AttendanceOpenAt || s.AttendanceWindowOpenedAt),
            AttendanceCloseAt: this.toDateTimeLocal(s.AttendanceCloseAt || s.AttendanceWindowClosedAt),
          });
          this.form.markAsPristine();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  /** Convert API datetime to datetime-local input value. */
  private toDateTimeLocal(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const normalized = value.replace(' ', 'T');
    if (normalized.length >= 16) {
      return normalized.slice(0, 16);
    }
    return normalized;
  }

  capacityTooLow(): boolean {
    const cap = Number(this.form.get('Capacity')?.value);
    return !Number.isNaN(cap) && cap < this.registeredCount;
  }

  async back(): Promise<void> {
    if (this.form.dirty) {
      const ok = await this.confirm.confirm('יציאה', 'יש שינויים שלא נשמרו. לצאת בכל זאת?');
      if (!ok) {
        return;
      }
    }
    this.router.navigate(['/training-management/admin/sessions']);
  }

  save(): void {
    if (this.form.invalid || this.saving || this.capacityTooLow()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    if (v.AttendanceOpenAt && v.AttendanceCloseAt && v.AttendanceCloseAt < v.AttendanceOpenAt) {
      this.snackBar.open('חלון הנוכחות אינו תקין.', 'סגור', { duration: 4000 });
      return;
    }
    this.saving = true;
    this.api
      .saveSession({
        Id: this.isEdit ? this.sessionId : null,
        CourseId: Number(v.CourseId),
        SessionDate: v.SessionDate,
        StartTime: v.StartTime,
        EndTime: v.EndTime,
        Location: v.Location,
        LecturerEmployeeID: v.LecturerEmployeeID,
        Capacity: Number(v.Capacity),
        RegistrationCloseAt: v.RegistrationCloseAt,
        AttendanceOpenAt: v.AttendanceOpenAt,
        AttendanceCloseAt: v.AttendanceCloseAt,
        Status: TrainingSessionStatus.Open,
        ActingEmployeeID: '',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.saving = false;
          if (!result || !result.Success) {
            this.snackBar.open(trainingErrorMessage(result), 'סגור', { duration: 5000 });
            return;
          }
          this.form.markAsPristine();
          this.snackBar.open('המועד נשמר בהצלחה.', 'סגור', { duration: 3500 });
          this.router.navigate(['/training-management/admin/sessions']);
        },
        () => {
          this.saving = false;
          this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
        }
      );
  }
}
