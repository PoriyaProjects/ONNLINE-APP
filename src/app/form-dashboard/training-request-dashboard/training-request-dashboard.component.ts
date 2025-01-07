import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { TrainingRequestFormComponent } from './training-request-form/training-request-form.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { TrainingRequestDialogComponent } from './training-request-dialog/training-request-dialog.component';

@Component({
  selector: 'app-training-request-dashboard',
  templateUrl: './training-request-dashboard.component.html',
  styleUrls: ['./training-request-dashboard.component.css']
})
export class TrainingRequestDashboardComponent implements OnInit {

  trainingRequests = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'Form_Fill_Date', 'First_Name', 'Family_Name', 'Passport_ID', 'Address', 'Phone_Number', 'Department', 'Actions'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  UserName = localStorage.getItem('loginUserName').toLowerCase();
  ID = localStorage.getItem('ID').toLowerCase();
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  trainingPlans: any[] = []; // Replace with a real data source

  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.getAllTrainingRequestFormsList("");
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.trainingRequests.filter = filterValue.trim().toLowerCase();
  }

  openDialog(trainingPlan?: any) {
    const dialogRef = this.dialog.open(TrainingRequestDialogComponent, {
      width: '90%',
      height: '90%',
      data: trainingPlan, // Pass data for editing
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (trainingPlan) {
          // Update existing plan
          Object.assign(trainingPlan, result);
        } else {
          // Add new plan
          this.trainingPlans.push(result);
        }
      }
    });
  }

  handleAction(rowId: string, action: string): void {
    // Add action handling logic here
    if (action == 'view') {
      this.dialog.open(TrainingRequestFormComponent, {
        disableClose: true,
        data: rowId,
        width: '90%',
        height: '90%'
      }).afterClosed().subscribe(res => {
        this.getAllTrainingRequestFormsList("");
      });
    } else if (action == 'new') {
      this.dialog.open(TrainingRequestFormComponent, {
        disableClose: true,
        data: rowId,
        width: '90%',
        height: '90%'
      }).afterClosed().subscribe(res => {
        this.getAllTrainingRequestFormsList("");
      });
    } else if (action == 'approve') {
      this.trainingRequestApprovedOrNot(rowId, true);
    } else if (action == 'reject') {
      this.trainingRequestApprovedOrNot(rowId, false);
    }
  }

  trainingRequestApprovedOrNot(rowId, approved) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http
            .post(environment.url + "TrainingRequestApprovedOrNot", {
              id: rowId,
              approved: approved
            })
            .subscribe((Response) => {
              if (Response['d']) {
                this.getAllTrainingRequestFormsList("");
                this.openSnackBar("נשמר בהצלחה");
              } else {
                this.getAllTrainingRequestFormsList("");
                this.openSnackBar("תקלה! לא נשמר");
              }
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );

  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  getAllTrainingRequestFormsList(approved) {
    this.http
      .post(environment.url + "GetAllTrainingRequestFormsList", {
        _id: this.ID,
        _approved: approved
      })
      .subscribe((Response) => {
        this.trainingRequests = new MatTableDataSource<any>(Response["d"]);
        this.trainingRequests.paginator = this.paginator;
        this.trainingRequests.sort = this.sort;
      });
  }
}

