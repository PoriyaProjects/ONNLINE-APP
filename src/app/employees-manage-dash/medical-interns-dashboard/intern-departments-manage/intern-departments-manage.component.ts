import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { environment } from 'src/environments/environment';
import { InternDepartmentAssignmentDialogComponent } from './intern-department-assignment-dialog/intern-department-assignment-dialog.component';

@Component({
  selector: 'app-intern-departments-manage',
  templateUrl: './intern-departments-manage.component.html',
  styleUrls: ['./intern-departments-manage.component.css']
})
export class InternDepartmentsManageComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  EmployeeID: string;
  intern: any;
  assignments: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['DepartnentDescripton', 'InternPeriod', 'InternPeriodEnd', 'Actions'];
  DepartmentsList: any[] = [];
  loaded = false;
  sendingPdf = false;
  /** All departments from API - for dialog dropdown fallback */
  allDepartments: any[] = [];
  /** Department codes selected for first and second dropdown (from EP_InternDisplayDepartments) */
  departmentCodesForFirst: string[] = [];
  departmentCodesForSecond: string[] = [];
  url = environment.url;
  urlipracticom = environment.urlipracticom;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.EmployeeID = this.route.snapshot.paramMap.get('EmployeeID');
    if (!this.EmployeeID) {
      this.router.navigate(['/medical-interns-dashboard']);
      return;
    }
    this.loadIntern();
    this.loadAssignments();
    this.loadAllDepartments();
  }

  loadAllDepartments(): void {
    this.http.post(this.url + 'GetMedicalInternDepartmentsAll', {}).subscribe(
      (response) => {
        const raw = response['d'] || [];
        this.allDepartments = raw;
        this.departmentCodesForFirst = [];
        this.departmentCodesForSecond = [];
        raw.forEach((r: any) => {
          const code = r.DepartCode || r.DepartnentCodeFirst || r.DepartmentCode || '';
          if (!code) return;
          if (r.FirstDepartment === '1' || r.FirstDepartment === 1) {
            this.departmentCodesForFirst.push(code);
          }
          if (r.SecondDepartment === '1' || r.SecondDepartment === 1) {
            this.departmentCodesForSecond.push(code);
          }
        });
      },
      () => {
        this.allDepartments = [];
        this.openSnackBar('שגיאה בטעינת רשימת המחלקות');
      }
    );
  }

  loadIntern() {
    this.http
      .post(this.url + 'GetMedicalInternByID', { _employeeID: this.EmployeeID })
      .subscribe(
        (response) => {
          this.intern = response['d'] || response['d']?.[0] || {};
        },
        () => {
          this.intern = { FirstName: '', LastName: '', EmployeeID: this.EmployeeID };
        }
      );
  }

  loadAssignments() {
    this.loaded = false;
    this.http
      .post(this.url + 'GetInternsDepartmentsByID', { _employeeID: this.EmployeeID })
      .subscribe(
        (response) => {
          this.loaded = true;
          const data = response['d'] || [];
          this.assignments = data;
          this.dataSource = new MatTableDataSource<any>(data);
          this.dataSource.paginator = this.paginator;
        },
        () => {
          this.loaded = true;
          this.dataSource = new MatTableDataSource<any>([]);
        }
      );
  }

  getDepartmentCodesForDialog(list: string[]): string[] {
    if (list.length > 0) return list;
    return this.allDepartments.map((d) => d.DepartCode || d.DepartnentCodeFirst || d.DepartmentCode).filter(Boolean);
  }

  addAssignment() {
    const dialogRef = this.dialog.open(InternDepartmentAssignmentDialogComponent, {
      disableClose: true,
      data: {
        employeeID: this.EmployeeID,
        departments: this.DepartmentsList,
        assignment: null,
        departmentCodesForFirst: this.getDepartmentCodesForDialog(this.departmentCodesForFirst),
        departmentCodesForSecond: this.getDepartmentCodesForDialog(this.departmentCodesForSecond)
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 1) this.loadAssignments();
    });
  }

  editAssignment(assignment: any) {
    const dialogRef = this.dialog.open(InternDepartmentAssignmentDialogComponent, {
      disableClose: true,
      data: {
        employeeID: this.EmployeeID,
        departments: this.DepartmentsList,
        assignment,
        departmentCodesForFirst: this.getDepartmentCodesForDialog(this.departmentCodesForFirst),
        departmentCodesForSecond: this.getDepartmentCodesForDialog(this.departmentCodesForSecond)
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 1) this.loadAssignments();
    });
  }

  deleteAssignment(assignment: any) {
    this.confirmationDialogService.confirm('מחיקה', 'האם אתה בטוח שברצונך למחוק את ההקצאה?', 'כן', 'לא')
      .then((confirmed) => {
        if (confirmed) {
          this.http
            .post(this.url + 'DeleteInternDepartmentAssignment', {
              _RowID: assignment.RowID,
            })
            .subscribe(
              (response) => {
                if (response['d']) {
                  this.openSnackBar('נמחק בהצלחה');
                  this.loadAssignments();
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

  formatDate(date: any) {
    if (!date) return '';
    return this.datePipe.transform(date, 'dd/MM/yyyy');
  }

  openSnackBar(message: string) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  backToDashboard() {
    this.router.navigate(['/medical-interns-dashboard']);
  }

  /**
   * Creates an HTML string with intern details and department assignments table,
   * then sends it as a string to the server (server can convert to PDF).
   */
  exportAndSendPdf() {
    if (!this.intern || this.assignments.length === 0) {
      this.openSnackBar('אין נתונים לייצוא');
      return;
    }
    const pdfString = this.buildPdfHtmlString();
    this.confirmationDialogService.confirm('שליחת PDF', 'האם אתה בטוח שברצונך לשלוח את ה-PDF לסטאזר?', 'כן', 'לא')
    .then((confirmed) => {
      if (confirmed) {
          this.sendingPdf = true;
          this.http
            .post(this.urlipracticom + 'SaveInternDepartmentsPDF', {
              pdfString: pdfString
            })
            .subscribe(
              (response) => {
                this.sendingPdf = false;
                if (response['d']) {
                  this.openSnackBar('ה-PDF נשלח לשרת בהצלחה');
                } else {
                  this.openSnackBar('השרת החזיר תשובה לא צפויה');
                }
              },
              () => {
                this.sendingPdf = false;
                this.openSnackBar('שגיאה בשליחת ה-PDF לשרת');
              }
            );  
        }
      })
      .catch(() => { this.sendingPdf = false; });
  }

  private buildPdfHtmlString(): string {
    const internName = `${this.intern.FirstName || ''} ${this.intern.LastName || ''}`.trim() || '-';
    const rows = this.assignments
      .map(
        (a) =>
          `<tr>
            <td>${(a.DepartnentDescripton || '-')}</td>
            <td>${this.formatDate(a.InternPeriod) || '-'}</td>
            <td>${this.formatDate(a.InternPeriodEnd) || '-'}</td>
          </tr>`
      )
      .join('');
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ניהול מחלקות סטאג'ר</title>
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #333; padding: 8px; }
    th { background: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <h1 class="text-center">ניהול מחלקות סטאג'ר</h1>
  <p><strong>שלום ${internName}, ${this.intern.EmployeeID || '-'}</strong></p>
  <p>בתאריך 1.3.2026 תתחילי את תקופת הסטאז' במרכז רפואי צפון.  
תכנית הסטאז' להלן נבנתה לפי הנחיות ועדת הסטאז' הארצית, דרישות המרכז הרפואי תוך התחשבות בבקשותיך.
התכנית עשויה להשתנות בהתאם לצרכי המרכז ולבקשתך.
</p>
  <table>
    <thead>
      <tr>
        <th>מחלקה</th>
        <th>תאריך התחלה</th>
        <th>תאריך סיום</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p>
    <strong>נא להתעדכן בלוח ההרצאות למהלך השנה, לפי דרישות הסטאז' - הנוכחות חובה.</strong>
  </p>
  <p>ניתן ליצור עימי קשר במייל: dporat@tzmc.gov.il</p>
  <p>או בווטסאפ: 052-3488228</p>
  <p>בהצלחה בהמשך הדרך, דלית</p>
</body>
</html>`;
  }
}
