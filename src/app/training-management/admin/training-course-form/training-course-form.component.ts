import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseStatus, TrainingValidationLimits } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { hoursToMinutes, minutesToHours } from '../../utils/training-duration.util';

@Component({
  selector: 'app-training-course-form',
  templateUrl: './training-course-form.component.html',
  styleUrls: ['./training-course-form.component.scss'],
})
export class TrainingCourseFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  saving = false;
  errorMessage: string | null = null;
  isEdit = false;
  courseId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private api: TrainingManagementApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirm: ConfirmationDialogService
  ) {
    this.form = this.fb.group({
      Code: [{ value: '', disabled: true }],
      Name: ['', [Validators.required, Validators.maxLength(TrainingValidationLimits.CourseNameMaxLength)]],
      Description: ['', [Validators.maxLength(TrainingValidationLimits.CourseDescriptionMaxLength)]],
      CourseType: ['', Validators.required],
      DurationHours: [
        null,
        [
          Validators.required,
          Validators.min(TrainingValidationLimits.MinDurationHours),
          Validators.max(TrainingValidationLimits.MaxDurationHours),
        ],
      ],
      ValidityMonths: [null, [Validators.min(0)]],
      IsMandatory: [true, Validators.required],
      Status: [TrainingCourseStatus.Draft, Validators.required],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('courseId');
    if (idParam) {
      this.isEdit = true;
      this.courseId = Number(idParam);
      this.loadCourse(this.courseId);
    } else {
      this.form.get('Code').setValue(this.newCourseCode(), { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourse(id: number): void {
    this.loading = true;
    this.api
      .getCourseDetails({ CourseId: id, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success || !result.Data) {
            this.errorMessage = trainingErrorMessage(result);
            return;
          }
          const c = result.Data;
          this.form.patchValue({
            Code: c.Code,
            Name: c.Name,
            Description: c.Description || '',
            CourseType: c.CourseType || '',
            DurationHours: minutesToHours(c.DurationMinutes),
            ValidityMonths: c.ValidityMonths,
            IsMandatory: c.IsMandatory,
            Status: c.Status,
          });
          this.form.get('Code').disable({ emitEvent: false });
          this.form.get('Status').disable({ emitEvent: false });
          this.form.markAsPristine();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  /** Compact UUID (32 hex chars) — fits Course Code max length. */
  private newCourseCode(): string {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }

  async back(): Promise<void> {
    if (this.form.dirty) {
      const ok = await this.confirm.confirm('יציאה', 'יש שינויים שלא נשמרו. לצאת בכל זאת?');
      if (!ok) {
        return;
      }
    }
    this.router.navigate(['/training-management/admin/courses']);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    this.api
      .saveCourse({
        Id: this.isEdit ? this.courseId : null,
        Code: v.Code,
        Name: v.Name,
        Description: v.Description || null,
        CourseType: v.CourseType,
        DurationMinutes: hoursToMinutes(Number(v.DurationHours)),
        ValidityMonths: v.ValidityMonths != null && v.ValidityMonths !== '' ? Number(v.ValidityMonths) : null,
        IsMandatory: !!v.IsMandatory,
        Status: Number(v.Status),
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
          this.snackBar.open('הקורס נשמר בהצלחה.', 'סגור', { duration: 3500 });
          this.router.navigate(['/training-management/admin/courses']);
        },
        () => {
          this.saving = false;
          this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
        }
      );
  }
}
