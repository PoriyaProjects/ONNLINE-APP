import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { TrainingRequestFormComponent } from './training-request-form/training-request-form.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { TrainingRequestDialogComponent } from './training-request-dialog/training-request-dialog.component';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-people-list-dialog',
  templateUrl: './people-list-dialog.component.html',
  styleUrls: ['./people-list-dialog.component.scss']
})
export class PeopleListDialogComponent {
  selectedPeople: any[] = [];
  constructor(
    public dialogRef: MatDialogRef<PeopleListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any[]
  ) { }

  close(): void {
    this.dialogRef.close(this.selectedPeople);
  }
}


@Component({
  selector: 'app-training-request-dashboard',
  templateUrl: './training-request-dashboard.component.html',
  styleUrls: ['./training-request-dashboard.component.scss']
})
export class TrainingRequestDashboardComponent implements OnInit {

  trainingRequests = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'Form_Fill_Date', 'First_Name', 'Passport_ID', 'Function_Department', 'Name_Location', 'Date', 'EApproved', 'FApproved', 'HApproved', 'Training_Fund_Answer', 'Galilean_Partnership_Description', 'Actions'
  ];
  peopleList = [
    { Full_Name: 'שמעון סבח', Role: 'יו"ר הועדה' },
    { Full_Name: 'יוסר מסאלחה', Role: 'אחראית הדרכה ופיתוח צוות בסיעוד' },
    { Full_Name: 'שרון מנחם', Role: 'מנהל משאבי אנוש' },
    { Full_Name: 'ד"ר מיכאל זרדב', Role: 'מנהל מחלקת רנטגן' },
    { Full_Name: 'לילך גסטר', Role: 'מנהלת כספים' },
    { Full_Name: 'תגל צרפתי', Role: 'מרכזת ועדה' },
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  UserName = localStorage.getItem('loginUserName').toLowerCase();
  FullName = localStorage.getItem('FirstName').toLowerCase() + ' ' + localStorage.getItem('LastName').toLowerCase();
  ID = localStorage.getItem('ID').toLowerCase();
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  trainingPlans: any[] = []; // Replace with a real data source
  date_now: any = Date.now();
  Plan_Date: any;
  Health_Plan_Date: any;
  loading: boolean;
  print_only_Protocol: boolean;
  change_plan_date: boolean;
  health_change_plan_date: boolean;
  decissions_list = [];
  filter_types: any = "";
  filter_plans: any = "";

  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.date_now = this.datePipe.transform(this.date_now, 'dd-MM-yyyy');
    this.getAllTrainingRequestFormsList();
    this.changeTrainingPlanDate();
    this.changeHealthTrainingPlanDate();
    this.getHRDepartmentEmployees();
    this.getTrainingRequestPlansList();
    // this.getHealthTrainingRequestPlansList();
  }

  changeTrainingPlanDate(): void {
    const resetUsers = ['ttsrefati', 'tkoren', 'adahabre'];

    if (!resetUsers.includes(this.UserName)) {
      this.Plan_Date = '';
      this.change_plan_date = false;
    } else {
      this.change_plan_date = true;
    }

    const formattedDate = this.Plan_Date
      ? this.datePipe.transform(this.Plan_Date, 'yyyy-MM-dd')
      : '';

    this.http.post<{ d: string }>(`${environment.url}ChangeTrainingPlanDate`, {
      plan_date: formattedDate
    })
      .pipe(
        catchError((error) => {
          console.error('Error changing training plan date', error);
          return of({ d: this.Plan_Date });
        })
      )
      .subscribe((response) => {
        this.Plan_Date = response.d;
      });
  }

  changeHealthTrainingPlanDate(): void {
    const resetUsers = ['ttsrefati', 'tkoren', 'adahabre', 'dnudelman'];

    if (!resetUsers.includes(this.UserName)) {
      this.Health_Plan_Date = '';
      this.health_change_plan_date = false;
    } else {
      this.health_change_plan_date = true;
    }

    const formattedDate = this.Health_Plan_Date
      ? this.datePipe.transform(this.Health_Plan_Date, 'yyyy-MM-dd')
      : '';

    this.http.post<{ d: string }>(`${environment.url}ChangeHealthTrainingPlanDate`, {
      plan_date: formattedDate
    })
      .pipe(
        catchError((error) => {
          console.error('Error changing training plan date', error);
          return of({ d: this.Health_Plan_Date });
        })
      )
      .subscribe((response) => {
        this.Health_Plan_Date = response.d;
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

  getTrainingRequestPlansList() {
    this.http
      .post(environment.url + "GetMedinaTrainingRequestPlansList", {})
      .subscribe((Response) => {
        this.decissions_list = Response["d"];
      });
  }

  getHealthTrainingRequestPlansList() {
    this.http
      .post(environment.url + "GetHealthTrainingRequestPlansList", {})
      .subscribe((Response) => {
        this.decissions_list = Response["d"];
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
        this.getAllTrainingRequestFormsList();
      });
    } else if (action == 'new') {
      this.dialog.open(TrainingRequestFormComponent, {
        disableClose: true,
        data: rowId,
        width: '90%',
        height: '90%'
      }).afterClosed().subscribe(res => {
        this.getAllTrainingRequestFormsList();
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
        .post(environment.url + "GetTrainingRequestProtocolList", {
          filter_plans: this.filter_plans
        })
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
      let data = await this.getDataToProtocolPDF();
      // data[]
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

  // create a pritable page with the provided data from trainingRequests dataSource
  // data = your trainingRequests dataSource (array of objects)
  printDataTable() {
    let data = this.trainingRequests.filteredData;
    if (!data || data.length === 0) {
      alert("No data to print");
      return;
    }

    // ✅ Define which columns to print (keys from your data objects)
    const columnTitles = ['מס בקשה', 'תאריך יצירה', 'שם מלא', 'מספר זהות', 'תפקיד/מחלקה', 'שם ההשתלמות', 'מיקום', 'תאריך התחלה', 'תאריך סיום']; // adjust as needed
    const selectedColumns = ['Row_ID', 'Form_Fill_Date', 'First_Name', 'Passport_ID', 'Function_Department', 'Request_Name', 'Request_Location', 'Date_Start', 'Date_End']; // adjust as needed

    // Build table headers
    let tableHeader = `<tr>`;
    for (let col of columnTitles) {
      tableHeader += `<th style="padding:8px; border:1px solid #ccc; background:#f5f5f5;">${col}</th>`;
    }
    tableHeader += `</tr>`;

    // Build table rows
    let tableRows = data.map(row => {
      let rowHtml = `<tr>`;
      for (let col of selectedColumns) {
        rowHtml += `<td style="padding:8px; border:1px solid #ccc;">${row[col] ?? ''}</td>`;
      }
      rowHtml += `</tr>`;
      return rowHtml;
    }).join('');

    // Full HTML with RTL + landscape
    const printContent = `
    <html dir="rtl" lang="he">
      <head>
        <title>בקשות השתלמות</title>
        <style>
          @page { size: landscape; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            direction: rtl;
            text-align: right;
          }
          h2 {
            text-align: center;
            margin-bottom: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          th, td { 
            padding: 8px; 
            border: 1px solid #ccc; 
          }
          th { 
            background: #f5f5f5; 
            font-weight: bold; 
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
        </style>
      </head>
      <body>
        <h2>בקשות השתלמות</h2>
        <table>
          ${tableHeader}
          ${tableRows}
        </table>
      </body>
    </html>
  `;

    // Open new window and print
    const popupWin = window.open('', '_blank', 'width=1200,height=900');
    popupWin!.document.open();
    popupWin!.document.write(printContent);
    popupWin!.document.close();
    popupWin!.print();
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
            <li style="margin-bottom: 5px;">מספר ימי העדרות שאושרו: ${data['H'].Approved_Absence_Time}, קוד רישום: ${data['H'].Code_Type}</li>
                ${data['H'].Transportaion === "True" ? `<li style="margin-bottom: 5px;">החזר נסיעות בגובה 100% לפי רפורמת דרך שווה.</li>
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
        	<p style="margin: 0px">${data['F'].Supervisor_Name.lastname} - מנהל עקיף</p>
        	<p style="margin: 0px">${data['E'].Supervisor_Name.lastname} - מנהל ישיר</p>
        	<p style="margin: 0px">מחלקת משאבי אנוש</p>
        </div>
    </body>
    </html>
    `;
  }

  createProtocolPdf(data) {
    const unselectedPeople = this.peopleList.filter(person =>
      !data[0].people_attendance.some(selected => selected.Full_Name === person.Full_Name)
    );
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
    <div style="text-align: left;">${this.date_now}</div>
    <div style="text-align: right;">סיכום ישיבת ועדת הדרכה מיום: ${data[0]['H'].Plan_Date}</div>
    <br /><br />
    <div style="text-align: right;">
      <strong>נוכחים:</strong><br />`
    for (const people of data[0].people_attendance) {
      print_content += `
      ${people.Full_Name}, ${people.Role}<br />
      `}
    print_content += `
      <br />
      <strong>נעדרים:</strong><br />`
    for (const people of unselectedPeople) {
      print_content += `
      ${people.Full_Name}, ${people.Role}<br />
      `}
    print_content += `
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
    תגל צרפתי - מנהלת הדרכה
    </div>
    <br />
    <br />
    <div>
    העתק:<br />
    ד"ר נועם יהודאי, מנהל המרכז הרפואי<br />
    מר שמעון סבח, מנהל אדמניסטרטיבי<br />
    גב' מלכה אמר מדמון, מנהלת הסיעוד<br />
    ועדת הדרכה<br />
    משאבי אנוש ושכר
    </div>
    </div>
  </div>
</div>
</body>
</html>
    `
    return print_content;
  }

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
              this.getAllTrainingRequestFormsList();
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

  getAllTrainingRequestFormsList() {
    this.loading = true;
    this.http
      .post(environment.url + "GetAllTrainingRequestFormsList", {
        _id: this.ID,
        _approved: this.filter_types,
        _decission_date: this.filter_plans
      })
      .subscribe((Response) => {
        this.trainingRequests = new MatTableDataSource<any>(Response["d"]);
        this.trainingRequests.paginator = this.paginator;
        this.trainingRequests.sort = this.sort;
        this.loading = false;
      });
  }

  getHRDepartmentEmployees() {
    this.print_only_Protocol = false;
    this.http
      .post(environment.url + "GetHRDepartmentEmployees", {})
      .subscribe((Response) => {
        const exists = Response['d'].some(obj =>
          Object.values(obj).some(val =>
            typeof val === 'string' && val.toLowerCase().includes(this.UserName)
          )
        );
        if (exists) this.print_only_Protocol = true;
      });
  }

  saveProtocolPeopleAttendance(res) {
    this.http
      .post(environment.url + "SaveProtocolPeopleAttendance", {
        data: res
      })
      .subscribe((Response) => {
        if (Response['d']) this.printProtocol();
        else this.openSnackBar("שגיאה בשמירת צוות");
      });
  }

  openPeopleDialog(): void {
    if (new Date(this.filter_plans) > new Date()) {
      this.openSnackBar("אין פרוטוקול לתאריך ועדה עתידי!");
      return;
    }
    this.dialog.open(PeopleListDialogComponent, {
      width: '500px',
      data: this.peopleList,
      direction: 'rtl'
    }).afterClosed().subscribe(res => {
      if (res != '') {
        this.saveProtocolPeopleAttendance(res);
      }
    });
  }
}

