import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseStatus, TrainingCourseSummary, TrainingSessionStatus } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { normalizeTrainingDateTimeLocal, normalizeTrainingTimeOfDay, TRAINING_TIME_24H_PATTERN } from '../../utils/training-date.util';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';

/** Display/parse dates as dd/MM/yyyy in this form's datepickers. */
@Injectable()
export class TrainingSessionDmyDateAdapter extends NativeDateAdapter {
  parse(value: any): Date | null {
    if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split('/').map((v) => +v);
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return super.parse(value);
  }

  format(date: Date, _displayFormat: Object): string {
    const dd = ('0' + date.getDate()).slice(-2);
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

export const TRAINING_SESSION_DMY_FORMATS = {
  parse: { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = normalizeTrainingTimeOfDay(group.get('StartTime')?.value);
  const end = normalizeTrainingTimeOfDay(group.get('EndTime')?.value);
  if (!start || !end) {
    return null;
  }
  return end > start ? null : { endBeforeStart: true };
}

/** Parse API `yyyy-MM-dd` / datetime into a local Date for the picker. */
function toPickerDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Wire date as `yyyy-MM-dd`. */
function toWireDate(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) {
    return '';
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Combine picker date + HH:mm → `yyyy-MM-ddTHH:mm`. */
function combineDateAndTime(date: Date | null | undefined, time: string | null | undefined): string {
  const d = toWireDate(date);
  const t = normalizeTrainingTimeOfDay(time);
  if (!d || !t) {
    return '';
  }
  return `${d}T${t}`;
}

function splitDateTimeLocal(value: string | null | undefined): { date: Date | null; time: string } {
  const normalized = normalizeTrainingDateTimeLocal(value);
  if (!normalized) {
    return { date: null, time: '' };
  }
  const [datePart, timePart] = normalized.split('T');
  return {
    date: toPickerDate(datePart),
    time: normalizeTrainingTimeOfDay(timePart),
  };
}

@Component({
  selector: 'app-training-session-form',
  templateUrl: './training-session-form.component.html',
  styleUrls: ['./training-session-form.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'he-IL' },
    { provide: DateAdapter, useClass: TrainingSessionDmyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: TRAINING_SESSION_DMY_FORMATS },
  ],
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
        SessionDate: [null, Validators.required],
        StartTime: ['', [Validators.required, Validators.pattern(TRAINING_TIME_24H_PATTERN)]],
        EndTime: ['', [Validators.required, Validators.pattern(TRAINING_TIME_24H_PATTERN)]],
        Location: ['', Validators.required],
        LecturerEmployeeID: ['', Validators.required],
        Capacity: [null, [Validators.required, Validators.min(1)]],
        RegistrationCloseDate: [null, Validators.required],
        RegistrationCloseTime: ['', [Validators.required, Validators.pattern(TRAINING_TIME_24H_PATTERN)]],
        AttendanceOpenDate: [null, Validators.required],
        AttendanceOpenTime: ['', [Validators.required, Validators.pattern(TRAINING_TIME_24H_PATTERN)]],
        AttendanceCloseDate: [null, Validators.required],
        AttendanceCloseTime: ['', [Validators.required, Validators.pattern(TRAINING_TIME_24H_PATTERN)]],
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
          const regClose = splitDateTimeLocal(s.RegistrationCloseAt);
          const attOpen = splitDateTimeLocal(s.AttendanceOpenAt || s.AttendanceWindowOpenedAt);
          const attClose = splitDateTimeLocal(s.AttendanceCloseAt || s.AttendanceWindowClosedAt);
          this.form.patchValue({
            CourseId: s.CourseId,
            SessionDate: toPickerDate(s.SessionDate),
            StartTime: normalizeTrainingTimeOfDay(s.StartTime),
            EndTime: normalizeTrainingTimeOfDay(s.EndTime),
            Location: s.Location || '',
            LecturerEmployeeID: s.LecturerEmployeeID,
            Capacity: s.Capacity,
            RegistrationCloseDate: regClose.date,
            RegistrationCloseTime: regClose.time,
            AttendanceOpenDate: attOpen.date,
            AttendanceOpenTime: attOpen.time,
            AttendanceCloseDate: attClose.date,
            AttendanceCloseTime: attClose.time,
          });
          this.form.markAsPristine();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
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
    const attendanceOpenAt = combineDateAndTime(v.AttendanceOpenDate, v.AttendanceOpenTime);
    const attendanceCloseAt = combineDateAndTime(v.AttendanceCloseDate, v.AttendanceCloseTime);
    if (attendanceOpenAt && attendanceCloseAt && attendanceCloseAt < attendanceOpenAt) {
      this.snackBar.open('חלון הנוכחות אינו תקין.', 'סגור', { duration: 4000 });
      return;
    }
    this.saving = true;
    this.api
      .saveSession({
        Id: this.isEdit ? this.sessionId : null,
        CourseId: Number(v.CourseId),
        SessionDate: toWireDate(v.SessionDate),
        StartTime: normalizeTrainingTimeOfDay(v.StartTime),
        EndTime: normalizeTrainingTimeOfDay(v.EndTime),
        Location: v.Location,
        LecturerEmployeeID: v.LecturerEmployeeID,
        Capacity: Number(v.Capacity),
        RegistrationCloseAt: combineDateAndTime(v.RegistrationCloseDate, v.RegistrationCloseTime),
        AttendanceOpenAt: attendanceOpenAt,
        AttendanceCloseAt: attendanceCloseAt,
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
