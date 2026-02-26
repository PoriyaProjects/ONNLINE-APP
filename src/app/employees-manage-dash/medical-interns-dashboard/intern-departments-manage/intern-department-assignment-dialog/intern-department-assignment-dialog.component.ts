import { Component, Inject, OnInit } from '@angular/core';
import { skip } from 'rxjs/operators';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-intern-department-assignment-dialog',
  templateUrl: './intern-department-assignment-dialog.component.html',
  styleUrls: ['./intern-department-assignment-dialog.component.css']
})
export class InternDepartmentAssignmentDialogComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  assignmentForm: FormGroup;
  departments: any[] = [];
  saveBtnWait = false;
  Api = environment.url;
  monthOptions: { value: string; label: string }[] = [];
  departmentsLoading = false;
  private readonly hebrewMonthFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

  constructor(
    public dialogRef: MatDialogRef<InternDepartmentAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.departments = [];
    const assignment = this.data?.assignment;
    const initialPeriod = assignment?.InternPeriod
      ? this.toPeriodString(new Date(assignment.InternPeriod))
      : null;
    this.assignmentForm = this.formBuilder.group({
      RowID: new FormControl(assignment?.RowID || '', null),
      DepartnentCodeFirst: new FormControl(assignment?.DepartnentCodeFirst || '', [Validators.required]),
      InternPeriod: new FormControl(initialPeriod || '', [Validators.required]),
      InternPeriodEnd: new FormControl(assignment?.InternPeriodEnd ? new Date(assignment.InternPeriodEnd) : null, null),
    });
    this.buildMonthOptions();
    if (initialPeriod) {
      this.getDepartmentsForPeriod(initialPeriod);
    }
    // this.assignmentForm.get('InternPeriod')?.valueChanges.pipe(skip(1)).subscribe((period) => {
    //   this.assignmentForm.patchValue({ DepartnentCodeFirst: '' }, { emitEvent: false });
    //   if (period) this.getDepartmentsForPeriod(period);
    //   else this.departments = [];
    // });
  }

  private toPeriodString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private buildMonthOptions(): void {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const startMonth = now.getMonth();
    const startYear = now.getFullYear();
    const endYear = now.getFullYear() + 2;
    for (let year = startYear; year <= endYear; year++) {
      const fromMonth = year === startYear ? startMonth : 0;
      for (let month = fromMonth; month < 12; month++) {
        const d = new Date(year, month, 1);
        options.push({ value: this.toPeriodString(d), label: this.hebrewMonthFormatter.format(d) });
      }
    }
    this.monthOptions = options;
  }

  getDepartmentsForPeriod(period: string): void {
    if (!period) return;
    this.departmentsLoading = true;
    this.departments = [];
    // const periodDate = period + '-01';
    this.http.post(this.Api + 'GetMedicalInternDepartments', { _InternPeriod: period }).subscribe(
      (response) => {
        this.departmentsLoading = false;
        this.departments = response['d'] || [];
      },
      () => {
        this.departmentsLoading = false;
        this.openSnackBar('שגיאה בטעינת המחלקות');
      }
    );
  }

  test(period: string): void {
    if (!period) {
      this.assignmentForm.patchValue({ InternPeriodEnd: null });
      return;
    }

    const [year, month] = period.split('-').map(Number);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // first day of next month

    this.assignmentForm.patchValue({
      InternPeriodEnd: endDate
    });

    this.getDepartmentsForPeriod(period);
  }

  save() {
    if (this.assignmentForm.invalid) {
      this.openSnackBar('שכחת שדה חובה!');
      this.assignmentForm.markAllAsTouched();
      return;
    }
    this.saveBtnWait = true;
    const formValue = this.assignmentForm.getRawValue();
    const internPeriodDate = formValue.InternPeriod ? new Date(formValue.InternPeriod + '-01') : null;
    const internPeriod = this.toPeriodString(internPeriodDate);
    const internPeriodEnd = this.toPeriodString(formValue.InternPeriodEnd);
    this.http.post(this.Api + 'SaveMedicalInternDepartmentAssignment', {
      _InternPeriod: internPeriod + "-01",
      _InternPeriodEnd: internPeriodEnd + "-01",
      _RowID: formValue.RowID,
      _departnentCodeFirst: formValue.DepartnentCodeFirst,
      _employeeID: this.data.employeeID,
    }).subscribe((response) => {
      this.saveBtnWait = false;
      if (response['d']) this.dialogRef.close(1);
    }, () => {
      this.saveBtnWait = false;
      this.openSnackBar('משהו השתבש, לא נשמר');
    });
  }

  openSnackBar(message: string) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  close() {
    this.dialogRef.close();
  }
}
