import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medical-intern-add-update',
  templateUrl: './medical-intern-add-update.component.html',
  styleUrls: ['./medical-intern-add-update.component.css']
})
export class MedicalInternAddUpdateComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  intern: any;
  internForm: FormGroup;
  DepartmentsList: any[] = [];
  saveBtnWait = false;
  Api = environment.url;
  saveSuccess = false;

  constructor(
    public dialogRef: MatDialogRef<MedicalInternAddUpdateComponent>,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  ngOnInit(): void {
    this.internForm = this.formBuilder.group({
      RowID: new FormControl(this.intern?.RowID || '', null),
      EmployeeID: new FormControl({value: this.intern?.EmployeeID || '', disabled: true}, [Validators.required, Validators.pattern('[0-9 ]{1,9}')]),
      FirstName: new FormControl(this.intern?.FirstName || '', [Validators.required]),
      LastName: new FormControl(this.intern?.LastName || '', [Validators.required]),
      CellNumber: new FormControl(this.intern?.CellNumber || '', [Validators.required, Validators.pattern('[0-9 ]{10}')]),
      Email: new FormControl(this.intern?.Email || '', null),
      DepartnentCode: new FormControl(this.intern?.DepartnentCode || '', null),
      ProfilePicture: new FormControl(this.intern?.ProfilePicture || 'http://srv-apps-prod/Images/' + this.intern?.EmployeeID + '.jpg' || 'http://srv-apps-prod/Images/default.jpg', null),
    });
    this.getDepartmentList();
  }

  getDepartmentList() {
    this.http.post(this.Api + 'GetEmployeeDepartmentList', {}).subscribe((response) => {
      this.DepartmentsList = response['d'] || [];
    });
  }

  saveIntern() {
    this.saveSuccess = false;
    if (this.internForm.invalid) {
      this.openSnackBar('שכחת שדה חובה!');
      this.internForm.markAllAsTouched();
      return;
    }
    this.saveBtnWait = true;
    const formValue = this.internForm.getRawValue();
    const payload = {
      _intern: {
        RowID: formValue.RowID,
        EmployeeID: formValue.EmployeeID,
        FirstName: formValue.FirstName,
        LastName: formValue.LastName,
        CellNumber: formValue.CellNumber,
        Email: formValue.Email,
        DepartnentCode: formValue.DepartnentCode,
        ProfilePicture: formValue.ProfilePicture,
      }
    };
    this.http.post(this.Api + 'SaveMedicalIntern', payload).subscribe(
      (response) => {
        this.saveBtnWait = false;
        if (response['d']) {
          this.openSnackBar('נשמר בהצלחה');
          this.saveSuccess = true;
          this.dialogRef.close(1);
        } else {
          this.openSnackBar('משהו השתבש, לא נשמר');
        }
      },
      () => {
        this.saveBtnWait = false;
        this.openSnackBar('משהו השתבש, לא נשמר');
      }
    );
  }

  deleteIntern() {
    const rowId = this.internForm.get('RowID')?.value;
    const employeeID = this.internForm.get('EmployeeID')?.value;
    if (!rowId && !employeeID) {
      this.openSnackBar('לא ניתן למחוק רשומה חדשה');
      return;
    }
    this.confirmationDialogService.confirm('מחיקה', 'האם אתה בטוח שברצונך למחוק את הסטאג\'ר?', 'כן', 'לא')
      .then((confirmed) => {
        if (confirmed) {
          this.saveBtnWait = true;
          this.http
            .post(this.Api + 'DeleteMedicalIntern', {
              _rowId: rowId,
              _employeeID: employeeID,
            })
            .subscribe(
              (response) => {
                this.saveBtnWait = false;
                if (response['d']) {
                  this.openSnackBar('נמחק בהצלחה');
                  this.dialogRef.close(1);
                } else {
                  this.openSnackBar('משהו השתבש, לא נמחק');
                }
              },
              () => {
                this.saveBtnWait = false;
                this.openSnackBar('משהו השתבש, לא נמחק');
              }
            );
        }
      })
      .catch(() => { });
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
