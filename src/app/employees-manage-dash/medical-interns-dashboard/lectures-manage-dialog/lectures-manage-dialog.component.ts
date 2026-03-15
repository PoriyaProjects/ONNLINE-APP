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
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

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
  filteredInterns$: Observable<any[]>;
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
    this.setupInternAutocomplete();
  }

  private setupInternAutocomplete(): void {
    this.filteredInterns$ = this.lectureForm.get('LectureEmployeeID').valueChanges.pipe(
      startWith(''),
      map((value) => {
        const filterValue = typeof value === 'string' ? value : (value ? this.getInternDisplay(value) : '');
        return filterValue ? this.filterInterns(filterValue) : this.internsList.slice();
      })
    );
  }

  displayInternFn = (intern: any): string => {
    return this.getInternDisplay(intern);
  };

  getInternDisplay(intern: any): string {
    if (!intern) return '';
    if (typeof intern === 'string') return intern;
    return `${intern.FirstName || ''} ${intern.LastName || ''} (${intern.EmployeeID || ''})`.trim();
  }

  private filterInterns(value: string): any[] {
    const term = (value || '').toLowerCase();
    return this.internsList.filter(
      (i) =>
        (i.FirstName || '').toLowerCase().includes(term) ||
        (i.LastName || '').toLowerCase().includes(term) ||
        (i.EmployeeID || '').toLowerCase().includes(term)
    );
  }

  // loadInterns(): void {
  //   this.http.post(this.url + 'GetMedicalInterns', {
  //     _employeeID: '',
  //     _firstName: '',
  //     _lastName: '',
  //     _phoneNumber: '',
  //     _department: '',
  //     _on: ''
  //   }).subscribe(
  //     (response) => {
  //       this.internsList = response['d'] || [];
  //       this.setupInternAutocomplete();
  //     },
  //     () => { this.internsList = []; }
  //   );
  // }

  loadInterns(): void {
    this.loaded = false;
    this.http
      .post(this.url + "GetEmployeesToUpdate", {
        _empId: '',
        _empFirstName: '',
        _empLastName: '',
        _on: '1',
        _medGrad: '',
        _phoneNumber: '',
        _department: '',
        _role: '',
        _managerType: '',
        _sektor: '',
        _workPlace: '',
        _statusRow: '1',
        _approvedToBlossom: '1',
        _userName: 'admin',
        _InGym: ''
      })
      .subscribe((Response) => {
        this.loaded = true;
        this.internsList = Response["d"] || [];
        this.setupInternAutocomplete();
      },
        () => {
          this.loaded = true;
          this.internsList = [];
          this.setupInternAutocomplete();
        });
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
    const intern = this.internsList.find((i) => i.EmployeeID === lecture.LectureEmployeeID);
    this.lectureForm.patchValue({
      LectureID: lecture.LectureID,
      LectureDate: dateStr,
      LectureTime: lecture.LectureTime || '',
      LectureDescription: lecture.LectureDescription || '',
      LectureLocationDescription: lecture.LectureLocationDescription || '',
      LectureEmployeeID: intern || lecture.LectureEmployeeID || ''
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
    const raw = this.lectureForm.getRawValue();
    const employeeId = typeof raw.LectureEmployeeID === 'object' && raw.LectureEmployeeID
      ? raw.LectureEmployeeID.EmployeeID
      : (raw.LectureEmployeeID || '');
    const lecture = { ...raw, LectureEmployeeID: employeeId };
    this.http.post(this.url + 'SaveInternLecture', {
      lecture
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
