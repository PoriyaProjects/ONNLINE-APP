import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-lectures-manage-dialog',
  templateUrl: './lectures-manage-dialog.component.html',
  styleUrls: ['./lectures-manage-dialog.component.css']
})
export class LecturesManageDialogComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  url = environment.url;
  lectures: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['LectureDate', 'LectureTime', 'LectureDescription', 'LectureLocationDescription', 'LectureEmployeeID', 'Actions'];
  loaded = false;
  internsList: any[] = [];
  lectureForm: FormGroup;
  editingLectureId: number | null = null;
  saveBtnWait = false;

  constructor(
    public dialogRef: MatDialogRef<LecturesManageDialogComponent>,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
    private datePipe: DatePipe
  ) {
    this.lectureForm = this.formBuilder.group({
      LectureID: new FormControl(null, null),
      LectureDate: new FormControl('', [Validators.required]),
      LectureTime: new FormControl('', null),
      LectureDescription: new FormControl('', [Validators.required]),
      LectureLocationDescription: new FormControl('', null),
      LectureEmployeeID: new FormControl('', null)
    });
  }

  ngOnInit(): void {
    this.loadLectures();
    this.loadInterns();
  }

  loadInterns(): void {
    this.http.post(this.url + 'GetMedicalInterns', {
      _employeeID: '',
      _firstName: '',
      _lastName: '',
      _phoneNumber: '',
      _department: '',
      _on: ''
    }).subscribe(
      (response) => {
        this.internsList = response['d'] || [];
      },
      () => { this.internsList = []; }
    );
  }

  loadLectures(): void {
    this.loaded = false;
    this.http.post(this.url + 'GetInternLectures', {}).subscribe(
      (response) => {
        this.loaded = true;
        this.lectures = response['d'] || [];
        this.dataSource = new MatTableDataSource<any>(this.lectures);
        this.addLecture();
      },
      () => {
        this.loaded = true;
        this.lectures = [];
        this.dataSource = new MatTableDataSource<any>([]);
        this.addLecture();
        this.openSnackBar('שגיאה בטעינת ההרצאות');
      }
    );
  }

  // formatDate(date: any): string {
  //   if (!date) return '';
  //   return this.datePipe.transform(date, 'dd/MM/yyyy') || '';
  // }

  addLecture(): void {
    this.editingLectureId = null;
    this.lectureForm.reset({
      LectureID: null,
      LectureDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      LectureTime: '',
      LectureDescription: '',
      LectureLocationDescription: '',
      LectureEmployeeID: ''
    });
  }

  editLecture(lecture: any): void {
    this.editingLectureId = lecture.LectureID;
    const dateStr = lecture.LectureDate
      ? this.datePipe.transform(new Date(lecture.LectureDate), 'yyyy-MM-dd')
      : '';
    this.lectureForm.patchValue({
      LectureID: lecture.LectureID,
      LectureDate: dateStr,
      LectureTime: lecture.LectureTime || '',
      LectureDescription: lecture.LectureDescription || '',
      LectureLocationDescription: lecture.LectureLocationDescription || '',
      LectureEmployeeID: lecture.LectureEmployeeID || ''
    });
  }

  cancelEdit(): void {
    this.editingLectureId = null;
    this.lectureForm.reset({ LectureID: null, LectureDate: '', LectureTime: '', LectureDescription: '', LectureLocationDescription: '', LectureEmployeeID: '' });
  }

  saveLecture(): void {
    if (this.lectureForm.invalid) {
      this.lectureForm.markAllAsTouched();
      this.openSnackBar('שכחת שדה חובה!');
      return;
    }
    this.saveBtnWait = true;
    this.http.post(this.url + 'SaveInternLecture', {
      lecture: this.lectureForm.getRawValue()
    }).subscribe(
      (response) => {
        this.saveBtnWait = false;
        if (response['d']) {
          this.openSnackBar('נשמר בהצלחה');
          this.cancelEdit();
          this.loadLectures();
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

  deleteLecture(lecture: any): void {
    this.confirmationDialogService.confirm('מחיקה', 'האם אתה בטוח שברצונך למחוק את ההרצאה?', 'כן', 'לא')
      .then((confirmed) => {
        if (confirmed) {
          this.http.post(this.url + 'DeleteInternLecture', { _LectureID: lecture.LectureID }).subscribe(
            (response) => {
              if (response['d']) {
                this.openSnackBar('נמחק בהצלחה');
                this.loadLectures();
              } else {
                this.openSnackBar('משהו השתבש, לא נמחק');
              }
            },
            () => this.openSnackBar('משהו השתבש, לא נמחק')
          );
        }
      })
      .catch(() => { });
  }

  // getInternName(employeeId: string): string {
  //   const intern = this.internsList.find((i) => i.EmployeeID === employeeId);
  //   return intern ? `${intern.FirstName || ''} ${intern.LastName || ''}`.trim() : employeeId || '-';
  // }

  openSnackBar(message: string): void {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
