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
import { DatePipe } from '@angular/common';

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
  date_now: any = Date.now();
  Plan_Date: any;

  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.date_now = this.datePipe.transform(this.date_now, 'yyyy-MM-dd');
    this.getAllTrainingRequestFormsList("");
    this.changeTrainingPlanDate();
  }

  changeTrainingPlanDate() {
    if (this.UserName == "ttsarfati") this.Plan_Date = "";
    if (this.Plan_Date != "") this.Plan_Date = this.datePipe.transform(this.Plan_Date, 'yyyy-MM-dd')
    this.http
      .post(environment.url + "ChangeTrainingPlanDate", {
        plan_date: this.Plan_Date
      })
      .subscribe((Response) => {
        this.Plan_Date = Response['d'];
      });
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
    }
  }

  getDataToPDF(rowId) {
    this.http
      .post(environment.url + "GetTrainingRequestFormDataByID", {
        id: rowId,
      })
      .subscribe((Response) => {
        let formData = Response['d'];
        this.TrainingRequestSendLastAnswer(formData);
      });
  }


  async TrainingRequestSendLastAnswer(data) {
    let pdf = `<!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>בקשתך למענק השתלמות</title>
    </head>
    <body style="font-family: Arial, sans-serif;direction: rtl;text-align: right;padding: 200px;
    margin: 0;">
    <img style="width: 640px;" src='http://srv-apps-prod/assets/covid_2_header.png' />
    <br>
    <br>
        <p style="margin: 5px 0;">תאריך: ${this.date_now}</p><br>
        <p style="margin: 5px 0;">לכבוד:</p>
        <p style="margin: 5px 0;"><span>${data['A'].First_Name} ${data['A'].Family_Name}</span></p>
        <p style="margin: 5px 0;">${data['G'].Function_Department}</p>
        <p style="margin: 5px 0;">${data['A'].Passport_ID}</p>
      <br>
        <p style="font-size: 18px;font-weight: bold;margin-bottom: 5px;margin: 5px 0;">הנדון: בקשתך להשתלמות נדונה בתאריך 2025-02-20</p>
        <p style="margin: 5px 0;">לקורס: <span style="font-weight: bold;color: black;;padding: 2px 5px;
        border-radius: 5px;margin: 5px 0;">${data['B'].Request_Name}</span> 
        בין התאריכים <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${data['B'].Date_Start} - ${data['B'].Date_End}</span> 
        ב <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${data['B'].Request_Location}</span></p>
    
        <div style="font-size: 14px;margin-top: 15px;line-height: 1.6;">
            ${data['H'].Approved === "True" ? `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לאשר את הבקשה בכפוף לתנאים הבאים:</p>
            <ul style="margin-right: 20px;padding-right: 20px;list-style-type: disc;">
                ${data['H'].Transportaion === "True" ? `<li style="margin-bottom: 5px;">החזר נסיעות בגובה 100% בתנאי לנסיעה ברכב ציבורי.</li>` : ``}
            </ul>` : `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לא לאשר את הבקשה.</p>`
      }
            <p style="margin: 5px 0;">הערות ועדה: ${data['H'].Recommendations}</p>
            <p style="margin: 5px 0;">${data['B'].Training_Out == "True" && data['H'].Approved === "True" ? `נא לפנות לקב"ט לקבלת תדרוך לפני נסיעה לחו"ל, ללא קבלת התדרוך לפני הנסיעה לא תאושר הבקשה.` : ``}</p>
        </div>
        <br>
        <div style="float: left">
        	<p style="margin: 0px">בברכה,</p>
        	<p style="margin: 0px">מר שמעון סבח</p>
        	<p style="margin: 0px">מנהל אדמינסטרטיבי</p>
        	<p style="margin: 0px">יו"ר הועדה</p>
        </div><br><br><br><br><br><br>
        <div>
        	<p style="margin: 0px">העתקים:</p>
        	<p style="margin: 0px">הנהלת המרכז הרפואי</p>
        	<p style="margin: 0px">הממונה הישיר</p>
        	<p style="margin: 0px">מדור השכר</p>
        	<p style="margin: 0px">מחלקת משאבי אנוש</p>
        </div>
    </body>
    </html>
    `;
    this.confirmationDialogService
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http
            .post(environment.urlipracticom + "TrainingRequestSendLastAnswer", {
              pdfString: pdf,
              request_id: data['A'].Passport_ID
            })
            .subscribe((Response) => {
              if (Response['d']) {
                this.openSnackBar("נשלח בהצלחה");
              } else {
                this.openSnackBar("תקלה! לא נשלח");
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

  // trainingRequestApprovedOrNot(rowId, approved) {
  //   this.confirmationDialogService
  //     .confirm("נא לאשר..", "האם אתה בטוח ...? ")
  //     .then((confirmed) => {
  //       console.log("User confirmed:", confirmed);
  //       if (confirmed) {
  //         this.http
  //           .post(environment.url + "TrainingRequestApprovedOrNot", {
  //             id: rowId,
  //             approved: approved
  //           })
  //           .subscribe((Response) => {
  //             if (Response['d']) {
  //               this.getAllTrainingRequestFormsList("");
  //               this.openSnackBar("נשמר בהצלחה");
  //             } else {
  //               this.getAllTrainingRequestFormsList("");
  //               this.openSnackBar("תקלה! לא נשמר");
  //             }
  //           });
  //       } else {
  //       }
  //     })
  //     .catch(() =>
  //       console.log(
  //         "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
  //       )
  //     );
  // }

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

