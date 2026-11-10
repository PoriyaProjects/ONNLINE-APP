import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
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
import { saveAs } from 'file-saver';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-people-list-dialog',
  templateUrl: './people-list-dialog.component.html',
  styleUrls: ['./people-list-dialog.component.scss']
})
export class PeopleListDialogComponent {
  selectedPeople: any[] = [];
  Decision_Date: any = null;
  Medina: string = '1';
  selectedMeeting: any = null;
  medinaPeopleList: any[] = [];
  healthPeopleList: any[] = [];
  peopleList: any[] = [];
  savedMeetings: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<PeopleListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.medinaPeopleList = data?.medinaPeopleList || [];
    this.healthPeopleList = data?.healthPeopleList || [];
    this.savedMeetings = data?.savedMeetings || [];
    if (data?.Decision_Date) {
      this.Decision_Date = data.Decision_Date;
    }
    this.refreshPeopleList();
  }

  refreshPeopleList(): void {
    this.peopleList = String(this.Medina) === '1' ? this.medinaPeopleList : this.healthPeopleList;
  }

  onMedinaChange(): void {
    this.selectedPeople = [];
    this.refreshPeopleList();
  }

  meetingLabel(meeting: any): string {
    const typeLabel = meeting.Medina == '1' || meeting.Medina == 1 ? 'מדינה' : 'בריאות';
    return `${meeting.Decision_Date} (${typeLabel})`;
  }

  save(): void {
    if (!this.Decision_Date) {
      return;
    }
    if (!this.selectedPeople || this.selectedPeople.length === 0) {
      return;
    }
    this.dialogRef.close({
      action: 'save',
      people: this.selectedPeople,
      Decision_Date: this.Decision_Date,
      Medina: this.Medina
    });
  }

  reprint(): void {
    if (!this.selectedMeeting) {
      return;
    }
    this.dialogRef.close({
      action: 'reprint',
      Decision_Date: this.selectedMeeting.Decision_Date,
      Medina: String(this.selectedMeeting.Medina)
    });
  }
}

@Component({
  selector: 'app-training-request-dashboard',
  templateUrl: './training-request-dashboard.component.html',
  styleUrls: ['./training-request-dashboard.component.scss']
})
export class TrainingRequestDashboardComponent implements OnInit, AfterViewInit {

  trainingRequests = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'Form_Fill_Date', 'First_Name', 'Passport_ID', 'Function_Department'/*, 'Standart_Level'*/, 'Name_Location', 'Date', 'EApproved', 'FApproved', 'HApproved', 'Training_Fund_Answer', 'Galilean_Partnership_Description', 'Actions'
  ];
  medinaPeopleList = [
    { Full_Name: 'שמעון סבח', Role: 'יו"ר הועדה' },
    { Full_Name: 'יוסר מסאלחה', Role: 'אחראית הדרכה ופיתוח צוות בסיעוד' },
    { Full_Name: 'ענבל דיטור', Role: 'מ"מ מנהל משאבי אנוש' },
    { Full_Name: 'ד"ר מיכאל זרדב', Role: 'מנהל מחלקת רנטגן' },
    { Full_Name: 'אורטל קובי', Role: 'מ"מ מנהלת כספים' },
    { Full_Name: 'תגל צרפתי', Role: 'מרכזת ועדה' },
  ];
  healthPeopleList = [
    { Full_Name: 'פרופ נועם יהודאי', Role: 'מנהל בית החולים' },
    { Full_Name: 'לימור נחמני', Role: 'מרכזת ועדות תאגיד' },
    { Full_Name: 'דורית נודלמן', Role: 'מנהלת תאגיד' },
  ];

  getPeopleListForMedina(medina: string): any[] {
    return String(medina) === '1' ? this.medinaPeopleList : this.healthPeopleList;
  }
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
  filter_request_type: any = "";
  filter_plans: any = "";
  searchText = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;
  filtersExpanded = false;
  fundingOptions = [
    {
      key: 'Registration_Funding',
      label: 'מימון רישום',
      options: [
        { key: 'approved', label: 'מאושר' },
        { key: 'partial', label: 'מאושר בגובה תמיכה' },
        { key: 'notApproved', label: 'לא מאושר' },
        { key: 'other', label: 'אחר' }
      ],
      answer: 'Registration_Funding_Answer'
    },
    {
      key: 'Flight_Funding',
      label: 'מימון טיסה',
      options: [
        { key: 'approved', label: 'מאושר' },
        { key: 'partial', label: 'מאושר בגובה תמיכה' },
        { key: 'notApproved', label: 'לא מאושר' },
        { key: 'other', label: 'אחר' }
      ],
      answer: 'Flight_Funding_Answer'
    },
    {
      key: 'Lodging_Funding',
      label: 'מימון לינה',
      options: [
        { key: 'approved', label: 'מאושר' },
        { key: 'partial', label: 'מאושר בגובה תמיכה' },
        { key: 'notApproved', label: 'לא מאושר' },
        { key: 'other', label: 'אחר' }
      ],
      answer: 'Lodging_Funding_Answer'
    }
  ];

  constructor(
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private confirmationDialogService: ConfirmationDialogService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.trainingRequests.filterPredicate = (data: any, filter: string) => this.matchesFilter(data, filter);
    this.date_now = this.datePipe.transform(this.date_now, 'dd-MM-yyyy');
    this.getAllTrainingRequestFormsList();
    this.changeTrainingPlanDate();
    this.changeHealthTrainingPlanDate();
    this.getHRDepartmentEmployees();
    this.getTrainingRequestPlansList();
    // this.getHealthTrainingRequestPlansList();
  }

  ngAfterViewInit(): void {
    this.bindTableControls();
  }

  private bindTableControls(): void {
    if (!this.trainingRequests) return;
    if (this.paginator) {
      this.trainingRequests.paginator = this.paginator;
    }
    if (this.sort) {
      this.trainingRequests.sort = this.sort;
    }
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
    const resetUsers = ['ttsrefati', 'tkoren', 'adahabre', 'dnudelman', 'lnachmani'];

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

  applyFilter(event?: Event) {
    if (event) {
      this.searchText = (event.target as HTMLInputElement).value;
    }
    this.applyCombinedFilter();
  }

  clearFilters(): void {
    this.filter_types = '';
    this.filter_request_type = '';
    this.filter_plans = '';
    this.searchText = '';
    this.fromDate = null;
    this.toDate = null;
    this.trainingRequests.filter = '';
    this.getAllTrainingRequestFormsList();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filter_types ||
      this.filter_request_type ||
      this.filter_plans ||
      this.fromDate ||
      this.toDate ||
      (this.searchText && this.searchText.trim())
    );
  }

  exportToExcel(): void {
    const rows = this.rowsForExport();
    if (!rows.length) {
      this.openSnackBar('אין נתונים לייצוא');
      return;
    }

    const data = rows.map((row) => ({
      'מס\' בקשה': row.Row_ID ?? '',
      'תאריך יצירה': row.Form_Fill_Date ?? '',
      'שם מלא': row.First_Name ?? '',
      'מספר זהות': row.Passport_ID ?? '',
      'תפקיד/מחלקה': row.Function_Department ?? '',
      'שם ההשתלמות': row.Request_Name ?? '',
      'מיקום': row.Request_Location ?? '',
      'תאריך התחלה': row.Date_Start ?? '',
      'תאריך סיום': row.Date_End ?? '',
      'מנהל ישיר': this.getApprovalPill(row.EApproved, 'manager').label,
      'מנהל עקיף': this.getApprovalPill(row.FApproved, 'manager').label,
      'ועדה': this.getApprovalPill(row.HApproved, 'committee').label,
      'תשובת תאגיד': row.Training_Fund_Answer ?? '',
      'שותפות גלילית': row.Galilean_Partnership_Description ?? '',
    }));

    const sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 24 },
      { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
      { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 28 },
    ];
    const book = XLSX.utils.book_new();
    book.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(book, sheet, 'בקשות');
    const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'בקשות-השתלמות.xlsx',
    );
  }

  private applyCombinedFilter(): void {
    const text = (this.searchText || '').trim().toLowerCase();
    const from = this.fromDate ? this.datePipe.transform(this.fromDate, 'yyyy-MM-dd') : '';
    const to = this.toDate ? this.datePipe.transform(this.toDate, 'yyyy-MM-dd') : '';
    this.trainingRequests.filter = !text && !from && !to
      ? ''
      : JSON.stringify({ text, from, to });
    if (this.trainingRequests.paginator) {
      this.trainingRequests.paginator.firstPage();
    }
  }

  private matchesFilter(data: any, filter: string): boolean {
    const criteria = this.readFilter(filter);
    if (criteria.text) {
      const blob = Object.keys(data || {}).reduce((current, key) => current + data[key] + '◬', '').toLowerCase();
      if (blob.indexOf(criteria.text) === -1) {
        return false;
      }
    }

    if (!criteria.from && !criteria.to) {
      return true;
    }

    const rowDay = this.dayStamp(data?.Form_Fill_Date);
    if (rowDay == null) {
      return false;
    }
    if (criteria.from && rowDay < this.dayStamp(criteria.from)) {
      return false;
    }
    if (criteria.to && rowDay > this.dayStamp(criteria.to)) {
      return false;
    }
    return true;
  }

  private readFilter(filter: string): { text: string; from: string; to: string } {
    try {
      const parsed = JSON.parse(filter);
      if (parsed && typeof parsed === 'object') {
        return {
          text: String(parsed.text || ''),
          from: String(parsed.from || ''),
          to: String(parsed.to || ''),
        };
      }
    } catch {
      // Older calls stored the search text directly.
    }
    return { text: filter || '', from: '', to: '' };
  }

  private dayStamp(value: any): number | null {
    const date = this.parseRowDate(value);
    return date ? date.getTime() : null;
  }

  private parseRowDate(value: any): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const text = String(value).trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }

    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private rowsForExport(): any[] {
    const filtered = this.trainingRequests.filteredData || [];
    if (this.trainingRequests.sort) {
      return this.trainingRequests.sortData(filtered.slice(), this.trainingRequests.sort);
    }
    return filtered;
  }

  get resultCount(): number {
    return this.trainingRequests?.filteredData?.length || 0;
  }

  get pagedRequests(): any[] {
    const data = this.trainingRequests?.filteredData || [];
    if (!this.paginator) {
      return data;
    }
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    return data.slice(start, start + this.paginator.pageSize);
  }

  getApprovalPill(value: string, kind: 'manager' | 'committee' = 'manager'): { tone: string; icon: string; label: string } {
    const v = (value || '').trim();
    if (v === 'מאושר' || v === 'מאושר התחייבות חשב') {
      return { tone: 'success', icon: 'check_circle', label: v === 'מאושר התחייבות חשב' ? 'מאושר התחייבות' : 'מאושר' };
    }
    if (v === 'לא מאושר') {
      return { tone: 'danger', icon: 'cancel', label: 'לא מאושר' };
    }
    if (!v) {
      return { tone: 'pending', icon: 'schedule', label: 'ממתין' };
    }
    if (kind === 'manager') {
      return { tone: 'pending', icon: 'schedule', label: v };
    }
    return { tone: 'pending', icon: 'schedule', label: v };
  }

  toggleFiltersExpanded(): void {
    this.filtersExpanded = !this.filtersExpanded;
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
        if (res === undefined) return;
        else if (res === null) this.getAllTrainingRequestFormsList();
        else this.TrainingRequestSendLastAnswer(res);
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

  getDataToProtocolPDF(filterPlans: string, medina: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http
        .post(environment.url + "GetTrainingRequestProtocolList", {
          filter_plans: filterPlans,
          medina: medina
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
              this.getAllTrainingRequestFormsList();
            });
        } else {
          this.getAllTrainingRequestFormsList();
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }

  async printProtocol(filterPlans?: string, medina?: string) {
    const planDate = filterPlans || this.filter_plans;
    const meetingType = medina != null && medina !== '' ? String(medina) : '1';
    const printWindow = window.open('', '_blank', 'width=1500,height=1000');
    if (!printWindow) {
      alert('לא ניתן לפתוח חלון הדפסה');
      return;
    }

    try {
      let data = await this.getDataToProtocolPDF(planDate, meetingType);
      // data[]
      const pdfContent = this.createProtocolPdf(data, meetingType);

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
    const columnTitles = ['מס בקשה', 'תאריך יצירה', 'שם מלא', 'מספר זהות', 'תפקיד/מחלקה', 'סקטור', 'שם ההשתלמות', 'מיקום', 'תאריך התחלה', 'תאריך סיום']; // adjust as needed
    const selectedColumns = ['Row_ID', 'Form_Fill_Date', 'First_Name', 'Passport_ID', 'Function_Department', 'Standart_Level', 'Request_Name', 'Request_Location', 'Date_Start', 'Date_End']; // adjust as needed

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
        <p style="font-size: 18px;font-weight: bold;margin-bottom: 5px;margin: 5px 0;">הנדון: בקשתך להשתלמות נדונה בתאריך ${this.datePipe.transform(data['H'].Opinion_Date, 'dd-MM-yyyy')}</p>
        <p style="margin: 5px 0;">ל ${data['H'].Training_Type == '' ? `` : `קורס: `}<span style="font-weight: bold;color: black;;padding: 2px 5px;
        border-radius: 5px;margin: 5px 0;">${data['B'].Request_Name}</span> 
        בין התאריכים <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${this.datePipe.transform(data['B'].Date_Start, 'dd-MM-yyyy')} - ${this.datePipe.transform(data['B'].Date_End, 'dd-MM-yyyy')}</span> 
        ב <span style="font-weight: bold;color: black;padding: 2px 5px;
        border-radius: 5px;">${data['B'].Request_Location}</span></p>
    <br>
        ${data['H'].Cancel_Request == "True" ? `<p style="margin: 5px 0;font-weight: bold;color: red;">הבקשה בוטלה</p>` : ``} ${data['H'].Cancel_Reason == '' ? `` : `<p style="margin: 5px 0;font-weight: bold;color: red;">${data['H'].Cancel_Reason}</p>`}

        <div style="font-size: 14px;margin-top: 15px;line-height: 1.6;">
            ${data['H'].Approved == "מאושר" || data['H'].Approved == "מאושר התחייבות חשב" ? `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לאשר את הבקשה בכפוף לתנאים הבאים:</p>
            <ul style="margin-right: 20px;padding-right: 20px;list-style-type: disc;">
            <li style="margin-bottom: 5px;">מספר ימי העדרות שאושרו: ${data['H'].Approved_Absence_Time}, קוד רישום: ${data['H'].Code_Type}</li>
            ${data['H'].Approved_Percent != '' ? `<li>שכ"ל מאושר: ${Math.round((parseFloat(data['H'].Approved_Percent) * parseFloat(data['H'].Approved_Percent_Out_Of)) / 100)} מתוך ${data['H'].Approved_Percent_Out_Of} (${data['H'].Approved_Percent}%)</li>` : ``}
                ${data['H'].Transportaion === "True" ? `<li style="margin-bottom: 5px;">החזר נסיעות בגובה 100% לפי רפורמת דרך שווה.</li>` : ``}
                ${data['H'].Approved == "מאושר" && data['H'].Approved_Percent != '' ? `<p>יש להגיש קבלה מקורית למדור שכר עד חודשיים מיום ההנפקה</p>` : ``}
                ${data['H'].Approved == "מאושר התחייבות חשב" ? `<p>שכ"ל דרך התחייבות חשב</p>` : ``}
            </ul>` : `
            <p style="margin: 5px 0;">הריני להודיעך כי הועדה החליטה, לא לאשר את הבקשה.</p>`
      }
            <p style="margin: 5px 0;">הערות ועדה: ${data['H'].Recommendations}</p>
            ${data['D'].Training_Fund_Answer == "" ? `` : `<p style="margin: 5px 0;">תשובת התאגיד: ${data['D'].Training_Fund_Answer}</p>`}
            ${data['D'].Registration_Funding == "" ? `` : `<p style="margin: 5px 0;">מימון רישום: ${this.getOptionLabel('Registration_Funding', data['D'].Registration_Funding)}</p> ${data['D'].Registration_Funding_Answer == '' ? `` : `<p style="margin: 5px 0;">הערה: ${data['D'].Registration_Funding_Answer}</p>`}`}
            ${data['D'].Lodging_Funding == "" ? `` : `<p style="margin: 5px 0;">מימון לינה: ${this.getOptionLabel('Flight_Funding', data['D'].Lodging_Funding)}</p> ${data['D'].Lodging_Funding_Answer == '' ? `` : `<p style="margin: 5px 0;">הערה: ${data['D'].Lodging_Funding_Answer}</p>`}`}
            ${data['D'].Flight_Funding == "" ? `` : `<p style="margin: 5px 0;">מימון טיסה: ${this.getOptionLabel('Lodging_Funding', data['D'].Flight_Funding)}</p> ${data['D'].Flight_Funding_Answer == '' ? `` : `<p style="margin: 5px 0;">הערה: ${data['D'].Flight_Funding_Answer}</p>`}`}
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

  getOptionLabel(sectionKey: string, selectedKey: string): string {
    if (!selectedKey) return '';

    const section = this.fundingOptions.find(f => f.key === sectionKey);
    if (!section) return '';

    const option = section.options.find(o => o.key === selectedKey);
    return option?.label || '';
  }

  createProtocolPdf(data, medina: string = '1') {
    if (!data || !data.length) {
      return `<!DOCTYPE html><html lang="he" dir="rtl"><body style="font-family: Arial; direction: rtl; padding: 40px;"><h2>אין נתונים לפרוטוקול בתאריך שנבחר</h2></body></html>`;
    }
    const attendance = data[0].people_attendance || [];
    const roster = this.getPeopleListForMedina(medina);
    const unselectedPeople = roster.filter(person =>
      !attendance.some(selected => selected.Full_Name === person.Full_Name)
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
    for (const people of attendance) {
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
            ${req['B'].Date_Start} - ${req['B'].Date_End}<br />
            ${req['B'].Request_Location}<br />
            ${req['H'].Approved == '' || req['H'].Approved == 'לא מאושר' ? '<strong>הבקשה נדחתה</strong>' : `<strong>הבקשה אושרה, להלן פירוט האישור</strong>:
                הימים שאושרו: ${req['H'].Approved_Absence_Time} , שעות שאושרו: 0 , בחינות: 0 , אש"ל: נדחה , נסיעות: ${req['H'].Transportaion == 'True' ? '100%' : '0%'} , שכר לימוד שאושר: ${(parseFloat(req['H'].Approved_Percent) *
            parseFloat(req['H'].Approved_Percent_Out_Of)) / 100
          }, קוד אישור: ${req['H'].Code_Type}.<br /> הערות:${req['H'].Recommendations == null ? '' : req['H'].Recommendations} ${req['D'].Training_Fund_Answer == '' ? '' : ' , ' + req['D'].Training_Fund_Answer}${req['D'].Galilean_Partnership_Description == null ? '' : ' , ' + req['D'].Galilean_Partnership_Description}`}<br />
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
    פרופ' נועם יהודאי, מנהל המרכז הרפואי<br />
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
        _decission_date: this.filter_plans,
        _request_type: this.filter_request_type
      })
      .subscribe({
        next: (Response) => {
          this.trainingRequests.data = Response["d"] || [];
          this.applyCombinedFilter();
          this.loading = false;
          setTimeout(() => this.bindTableControls());
        },
        error: () => {
          this.loading = false;
        }
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
    const decisionDate = this.datePipe.transform(res.Decision_Date, 'yyyy-MM-dd');
    this.http
      .post(environment.url + "SaveProtocolPeopleAttendance", {
        people: res.people,
        Decision_Date: decisionDate,
        Medina: String(res.Medina)
      })
      .subscribe((Response) => {
        if (Response['d'] && decisionDate) this.printProtocol(decisionDate, String(res.Medina));
        else this.openSnackBar("שגיאה בשמירת צוות");
      });
  }

  getProtocolMeetingDates(): Promise<any[]> {
    return new Promise((resolve) => {
      this.http
        .post(environment.url + "GetProtocolMeetingDates", {})
        .pipe(
          catchError((error) => {
            console.error('Error loading protocol meeting dates', error);
            return of({ d: [] });
          })
        )
        .subscribe((Response: any) => {
          resolve(Response['d'] || []);
        });
    });
  }

  openPeopleDialog(): void {
    this.getProtocolMeetingDates().then((savedMeetings) => {
      this.dialog.open(PeopleListDialogComponent, {
        width: '560px',
        data: {
          medinaPeopleList: this.medinaPeopleList,
          healthPeopleList: this.healthPeopleList,
          Decision_Date: this.filter_plans ? new Date(this.filter_plans) : null,
          savedMeetings: savedMeetings
        },
        direction: 'rtl'
      }).afterClosed().subscribe(res => {
        if (!res) return;
        if (res.action === 'reprint') {
          this.printProtocol(res.Decision_Date, String(res.Medina));
          return;
        }
        if (res.action === 'save') {
          const decisionDate = this.datePipe.transform(res.Decision_Date, 'yyyy-MM-dd');
          if (!decisionDate) {
            this.openSnackBar("יש לבחור תאריך ועדה!");
            return;
          }
          if (new Date(decisionDate) > new Date()) {
            this.openSnackBar("אין פרוטוקול לתאריך ועדה עתידי!");
            return;
          }
          this.saveProtocolPeopleAttendance(res);
        }
      });
    });
  }
}

