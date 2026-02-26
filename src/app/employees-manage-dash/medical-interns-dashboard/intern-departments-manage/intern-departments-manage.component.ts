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
  url = environment.url;

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

  addAssignment() {
    const dialogRef = this.dialog.open(InternDepartmentAssignmentDialogComponent, {
      disableClose: true,
      data: {
        employeeID: this.EmployeeID,
        departments: this.DepartmentsList,
        assignment: null
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
        assignment
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
}
