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
  styleUrls: ['./training-request-dashboard.component.scss']
})
export class TrainingRequestDashboardComponent implements OnInit {

  trainingRequests = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'Form_Fill_Date', 'First_Name', 'Passport_ID', 'Function_Department', 'Name_Location', 'Date', 'EApproved', 'FApproved', 'Training_Fund_Answer', 'HApproved', 'Actions'
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
  loading: boolean;

  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.date_now = this.datePipe.transform(this.date_now, 'dd-MM-yyyy');
    this.getAllTrainingRequestFormsList("");
    this.changeTrainingPlanDate();
  }

  changeTrainingPlanDate() {
    if (this.UserName == "ttsrefati") this.Plan_Date = "";
    if (this.Plan_Date != "") this.Plan_Date = this.datePipe.transform(this.Plan_Date, 'dd-MM-yyyy')
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
        if (res != null) {
          this.TrainingRequestSendLastAnswer(res);
        }
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

  async print(rowId: number) {
    const printWindow = window.open('', '_blank', 'width=1000,height=1000');
    if (!printWindow) {
      alert('לא ניתן לפתוח חלון הדפסה');
      return;
    }

    try {
      const data = await this.getDataToPDF(rowId);
      const pdfContent = this.createThePdfFile(data);

      printWindow.document.open();
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Give the browser a moment to render before triggering print
      setTimeout(() => {
        printWindow.print();
      }, 300); // Adjust the timeout if needed
    } catch (error) {
      console.error('שגיאה בהכנת או הדפסת PDF:', error);
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write('<h1>שגיאה בהכנת הדפסה</h1><p>אירעה שגיאה בעת יצירת תוכן ההדפסה.</p>');
        printWindow.document.close();
      } else {
        alert('אירעה שגיאה בהכנת הדפסה.');
      }
    }
  }

  getDataToPDF(rowId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http
        .post(environment.url + "GetTrainingRequestFormDataByID", { id: rowId })
        .subscribe({
          next: (response) => resolve(response['d']),
          error: (err) => reject(err)
        });
    });
  }

  getDataToProtocolPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http
        .post(environment.url + "GetTrainingRequestProtocolList", {})
        .subscribe({
          next: (response) => resolve(response['d']),
          error: (err) => reject(err)
        });
    });
  }


  async TrainingRequestSendLastAnswer(rowId) {
    let data = await this.getDataToPDF(rowId);
    let pdf = this.createThePdfFile(data);
    this.confirmationDialogService
      .confirm("נא לאשר..", "לשלוח את התשובה ...? ")
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

  async printProtocol() {
    const printWindow = window.open('', '_blank', 'width=1500,height=1000');
    if (!printWindow) {
      alert('לא ניתן לפתוח חלון הדפסה');
      return;
    }

    try {
      const data = await this.getDataToProtocolPDF();
      const pdfContent = this.createProtocolPdf(data);

      printWindow.document.open();
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Give the browser a moment to render before triggering print
      setTimeout(() => {
        printWindow.print();
      }, 300); // Adjust the timeout if needed
    } catch (error) {
      console.error('שגיאה בהכנת או הדפסת PDF:', error);
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write('<h1>שגיאה בהכנת הדפסה</h1><p>אירעה שגיאה בעת יצירת תוכן ההדפסה.</p>');
        printWindow.document.close();
      } else {
        alert('אירעה שגיאה בהכנת הדפסה.');
      }
    }
  }

  createThePdfFile(data) {
    return `<!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>בקשתך למענק השתלמות</title>
    </head>
    <body style="font-family: Arial, sans-serif;direction: rtl;text-align: right;padding: 50px;
    margin: 0;width: 640px;">
    <img style="width: 640px;" src='http://srv-apps-prod/assets/covid_2_header.png' />
    <br>
    <br>
        <p style="margin: 5px 0;">תאריך: ${this.date_now}</p><br>
        <p style="margin: 5px 0;">לכבוד:</p>
        <p style="margin: 5px 0;"><span>${data['A'].First_Name} ${data['A'].Family_Name}</span></p>
        <p style="margin: 5px 0;">${data['G'].Function_Department}</p>
        <p style="margin: 5px 0;">ת.ז: ${data['A'].Passport_ID}</p>
      <br>
        <p style="font-size: 18px;font-weight: bold;margin-bottom: 5px;margin: 5px 0;">הנדון: בקשתך להשתלמות נדונה בתאריך ${this.datePipe.transform(data['H'].Plan_Date, 'dd-MM-yyyy')}</p>
        <p style="margin: 5px 0;">לקורס: <span style="font-weight: bold;color: black;;padding: 2px 5px;
        border-radius: 5px;margin: 5px 0;">${data['B'].Request_Name}</span> 
        בין התאריכים <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${this.datePipe.transform(data['B'].Date_Start, 'dd-MM-yyyy')} - ${this.datePipe.transform(data['B'].Date_End, 'dd-MM-yyyy')}</span> 
        ב <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${data['B'].Request_Location}</span></p>
    
        <div style="font-size: 14px;margin-top: 15px;line-height: 1.6;">
            ${data['H'].Approved == "מאושר" || data['H'].Approved == "מאושר התחייבות חשב" ? `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לאשר את הבקשה בכפוף לתנאים הבאים:</p>
            <ul style="margin-right: 20px;padding-right: 20px;list-style-type: disc;">
                ${data['H'].Transportaion === "True" ? `<li style="margin-bottom: 5px;">החזר נסיעות בגובה 100% לפי רפורמת דרך שווה.</li>
                <li style="margin-bottom: 5px;">מספר ימי העדרות שאושרו: ${data['H'].Approved_Absence_Time}, קוד רישום: ${data['H'].Code_Type}</li>
                <p>יש להגיש קבלה מקורית למדור שכר עד חודשיים מיום ההנפקה</p>` : ``}
            </ul>` : `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לא לאשר את הבקשה.</p>`
      }
            <p style="margin: 5px 0;">הערות ועדה: ${data['H'].Recommendations}</p>
            ${data['D'].Training_Fund_Answer == "" ? `` : `<p style="margin: 5px 0;">תשובת התאגיד: ${data['D'].Training_Fund_Answer}</p>`}
            <p style="margin: 5px 0;">${data['B'].Training_Out == "True" && data['H'].Approved === "מאושר" ? `נא לפנות לקב"ט לקבלת תדרוך לפני נסיעה לחו"ל, ללא קבלת התדרוך לפני הנסיעה לא תאושר הבקשה.` : ``}</p>
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
        	<p style="margin: 0px">${data['E'].Supervisor_Name.lastname}</p>
        	<p style="margin: 0px">מחלקת משאבי אנוש</p>
        </div>
    </body>
    </html>
    `;
  }

  createProtocolPdf(data) {
    let print_content = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>בקשתך למענק השתלמות</title>
        <style>
        margin: 0.5,
        filename: 'meeting-summary.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        </style>
    </head>
    <body style="font-family: Arial, sans-serif;direction: rtl;text-align: right;padding: 50px;
    margin: 0;width: 640px;">
    <img style="width: 640px;" src='http://srv-apps-prod/assets/covid_2_header.png' />
    <br>
    <br>
    <div #pdfContent>
  <!-- Replace below with your dynamic printable HTML content -->
  <div style="font-family: Arial; direction: rtl; padding: 20px;">
    <div style="text-align: left;">04/05/2025</div>
    <div style="text-align: right;">סיכום ישיבת ועדת הדרכה מיום: 29/04/2025</div>
    <br /><br />
    <div style="text-align: right;">
      <strong>נוכחים:</strong><br />
      מר שמעון סבח, יו"ר הועדה<br />
      יוסר מסאלחה, אחראית הדרכה ופיתוח צוות בסיעוד<br />
      שרון מנחם, מנהל משאבי אנוש<br />
      ד"ר מיכאל ז'רדב,מנהל מחלקת רנטגן<br />
      לילך גסטר,מנהלת כספים<br />
      תגל צרפתי,מרכזת הועדה<br />
      <br />
    </div>
    <br />
    <div style="border-top: 1px solid #000; padding-top: 10px;">
      <strong>הבקשות שנדונו:</strong>
      <!-- Repeat the following block per request -->
      `
    for (const req of data) {
      print_content += `
          <div style="margin-top: 20px; padding: 10px 0; border-bottom: 1px dashed #aaa;">
            <strong>${req['A'].Family_Name} ${req['A'].First_Name}</strong><br />
            ${req['G'].Function_Department}<br />
            ${req['G'].Standart_Level}<br />
            ${req['B'].Request_Name}<br />
            ${req['B'].Date_Start}<br />
            ${req['B'].Date_End}<br />
            ${req['B'].Request_Location}<br />
            ${req['H'].Approved == '' ? '<strong>הבקשה נדחתה</strong>' : `<strong>הבקשה אושרה, להלן פירוט האישור</strong>:
                הימים שאושרו: ${req['H'].Approved_Absence_Time} , שעות שאושרו: 0 , בחינות: 0 , אש"ל: נדחה , נסיעות: ${req['H'].Transportaion == 'True' ? '100%' : '0%'} , שכר לימוד שאושר: ${(parseInt(req['H'].Approved_Percent) *
            parseInt(req['H'].Approved_Percent_Out_Of)) / 100
          }<br /> הערות:${req['H'].Recommendations == null ? '' : ''}${req['D'].Training_Fund_Answer == '' ? '' : ' , ' + req['D'].Training_Fund_Answer}${req['D'].Galilean_Partnership_Description == null ? '' : ' , ' + req['D'].Galilean_Partnership_Description}`}<br />
          </div>
        `;
    }
    print_content += `
    
    <div><br /><br />
    רשם:<br />
    תגל צרפתי - ממונה הדרכה
    </div>
    <br />
    <br />
    <div>
    העתק:<br />
    ד"ר נועם יהודאי, מנהל המרכז הרפואי<br />
    מר שמעון סבח, מנהל אדמניסטרטיבי<br />
    גב' מלכה אמר מדמון, מנהלת הסיעוד<br />
    ועדת הדרכה
    </div>
    </div>
  </div>
</div>
</body>
</html>
    `
    return print_content;
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

  cancelTrainingRequest(id) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "לבטל? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http
            .post(environment.url + "trainingRequestApprovedOrNot", {
              id: id,
            })
            .subscribe((Response) => {
              this.getAllTrainingRequestFormsList("");
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

  getAllTrainingRequestFormsList(approved) {
    this.loading = true;
    this.http
      .post(environment.url + "GetAllTrainingRequestFormsList", {
        _id: this.ID,
        _approved: approved
      })
      .subscribe((Response) => {
        this.trainingRequests = new MatTableDataSource<any>(Response["d"]);
        this.trainingRequests.paginator = this.paginator;
        this.trainingRequests.sort = this.sort;
        this.loading = false;
      });
  }
}

