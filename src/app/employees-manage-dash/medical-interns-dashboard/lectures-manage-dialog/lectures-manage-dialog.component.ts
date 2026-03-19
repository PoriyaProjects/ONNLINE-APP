import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-lectures-manage-dialog',
  templateUrl: './lectures-manage-dialog.component.html',
  styleUrls: ['./lectures-manage-dialog.component.css']
})
export class LecturesManageDialogComponent implements OnInit, OnDestroy {

  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  creating_pdf = false;
  url = environment.url;
  lectures: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['LectureDate', 'LectureTime', 'LectureDescription', 'LectureLocationDescription', 'LectureEmployeeID', 'Actions'];
  loaded = false;
  internsList: any[] = [];
  filteredInterns$: Observable<any[]>;
  lectureForm: FormGroup;
  dateRangeForm: FormGroup;
  editingLectureId: number | null = null;
  saveBtnWait = false;
  private destroy$ = new Subject<void>();

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
    this.dateRangeForm = this.formBuilder.group({
      startDate: new FormControl('', null),
      endDate: new FormControl('', null)
    });
  }

  ngOnInit(): void {
    this.loadLectures();
    this.loadInterns();
    this.setupInternAutocomplete();
    this.setupDateRangeFilter();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDateRangeFilter(): void {
    this.dateRangeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.applyDateRangeFilter();
    });
  }

  private applyDateRangeFilter(): void {
    this.dataSource.filterPredicate = (row: any, filterStr: string) => {
      let start: string, end: string;
      try {
        const f = JSON.parse(filterStr || '{}');
        start = f.startDate || '';
        end = f.endDate || '';
      } catch {
        return true;
      }
      if (!start && !end) return true;
      const rowDate = row.LectureDate ? new Date(row.LectureDate).getTime() : 0;
      if (start && rowDate < new Date(start).getTime()) return false;
      if (end && rowDate > new Date(end + 'T23:59:59').getTime()) return false;
      return true;
    };
    const start = this.dateRangeForm.get('startDate')?.value || '';
    const end = this.dateRangeForm.get('endDate')?.value || '';
    this.dataSource.filter = JSON.stringify({ startDate: start, endDate: end });
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
        this.applyDateRangeFilter();
        this.addLecture();
      },
      () => {
        this.loaded = true;
        this.lectures = [];
        this.dataSource = new MatTableDataSource<any>([]);
        this.applyDateRangeFilter();
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

  exportLecturesToPdf(): void {
    const rows = this.dataSource.filteredData || [];
    if (rows.length === 0) {
      this.openSnackBar('אין הרצאות לייצוא');
      return;
    }
    this.creating_pdf = true;

    setTimeout(() => {
      const element = this.pdfContent?.nativeElement;
      if (!element) {
        this.creating_pdf = false;
        this.openSnackBar('שגיאה בייצוא קובץ PDF');
        return;
      }

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('רשימת_הרצאות_סטאגרים.pdf');
        this.openSnackBar('הייצוא הושלם בהצלחה');
        this.creating_pdf = false;
      }).catch(() => {
        this.creating_pdf = false;
        this.openSnackBar('שגיאה בייצוא קובץ PDF');
      });
    }, 0);
  }

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
