import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
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
  departmentsSecond: any[] = [];
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
    private _snackBar: MatSnackBar
  ) { }

  get departmentCodesForFirst(): string[] {
    return this.data?.departmentCodesForFirst ?? [];
  }

  get departmentCodesForSecond(): string[] {
    return this.data?.departmentCodesForSecond ?? [];
  }

  get showFirstDepartment(): boolean {
    return true;
  }

  get showSecondDepartment(): boolean {
    return true;
  }

  get departmentsForFirstDropdown(): any[] {
    return this.filterDepartmentsByCodes(this.departments, this.departmentCodesForFirst);
  }

  get departmentsForSecondDropdown(): any[] {
    return this.filterDepartmentsByCodes(this.departmentsSecond, this.departmentCodesForSecond);
  }

  private filterDepartmentsByCodes(depts: any[], codes: string[]): any[] {
    if (!codes || codes.length === 0) return depts;
    return depts.filter((d) => codes.includes(d.DepartnentCodeFirst));
  }

  ngOnInit(): void {
    this.departments = [];
    this.departmentsSecond = [];
    const assignment = this.data?.assignment;
    const initialPeriod = assignment?.InternPeriod
      ? this.toPeriodString(new Date(assignment.InternPeriod))
      : null;
    const showFirst = this.showFirstDepartment;
    const showSecond = this.showSecondDepartment;
    this.assignmentForm = this.formBuilder.group({
      RowID: new FormControl(assignment?.RowID || '', null),
      DepartnentCodeFirst: new FormControl(assignment?.DepartnentCodeFirst || '', showFirst ? null : []),
      DepartnentCodeSecond: new FormControl(assignment?.DepartnentCodeSecond || '', showSecond ? null : []),
      InternPeriod: new FormControl(initialPeriod || '', [Validators.required]),
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

    for (let i = 0; i < 12; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() + i,
        1
      );

      options.push({
        value: this.toPeriodString(d),
        label: this.hebrewMonthFormatter.format(d)
      });
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

  getDepartmentsForPeriodSecond(period: string): void {
    if (!period) return;
    this.departmentsLoading = true;
    this.departmentsSecond = [];
    // const periodDate = period + '-01';
    this.http.post(this.Api + 'GetMedicalInternDepartmentsSecond', { _InternPeriod: period }).subscribe(
      (response) => {
        this.departmentsLoading = false;
        this.departmentsSecond = response['d'] || [];
      },
      () => {
        this.departmentsLoading = false;
        this.openSnackBar('שגיאה בטעינת המחלקות');
      }
    );
  }

  selectPeriod(period: string): void {
    this.assignmentForm.patchValue({ InternPeriod: period });
    if (period) {
      this.getDepartmentsForPeriod(period);
      this.getDepartmentsForPeriodSecond(period);
    } else {
      this.departments = [];
      this.departmentsSecond = [];
    }
  }

  save() {
    if (this.assignmentForm.invalid) {
      this.openSnackBar('שכחת שדה חובה!');
      this.assignmentForm.markAllAsTouched();
      return;
    }
    this.saveBtnWait = true;
    const formValue = this.assignmentForm.getRawValue();
    const internPeriod = formValue.InternPeriod;
    const [year, month] = internPeriod ? internPeriod.split('-').map(Number) : [null, null];
    const internPeriodEnd = year && month
      ? this.toPeriodString(new Date(year, month, 1))
      : '';
    this.http.post(this.Api + 'SaveMedicalInternDepartmentAssignment', {
      _InternPeriod: internPeriod + "-01",
      _InternPeriodEnd: internPeriodEnd + "-01",
      _RowID: formValue.RowID,
      _departnentCodeFirst: formValue.DepartnentCodeFirst,
      _departnentCodeSecond: formValue.DepartnentCodeSecond || '',
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
