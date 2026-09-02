import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { CommercialSupportFormDialogComponent } from './commercial-support-form-dialog/commercial-support-form-dialog.component';
import { CommercialSupportGatheringComponent } from './commercial-support-gathering/commercial-support-gathering.component';
import { CommercialSupportPresentationDialogComponent } from './commercial-support-presentation-dialog/commercial-support-presentation-dialog.component';
import { CommercialSupportResearchDialogComponent } from './commercial-support-research-dialog/commercial-support-research-dialog.component';
import { SupportRequestService } from './commercial-support.service';
import { CommercialSupportProcurementDialogComponent } from './commercial-support-procurement-dialog/commercial-support-procurement-dialog.component';
import { CommercialSupportProtocolDialogComponent } from './commercial-support-protocol-dialog/commercial-support-protocol-dialog.component';
import { isCommitteeDecisionUser, isViewOnlyUser } from './commercial-support.constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';



@Component({
  selector: 'app-dialog-example',
  templateUrl: './dialog-example.component.html',
  styleUrls: ['./dialog-example.component.css']
})
export class DialogExampleComponent {

  decission_results = {
    Approved: "",
    Note: ""
  };
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DialogExampleComponent>,
    private supportRequestService: SupportRequestService,
    private _datePipe: DatePipe,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.decission_results = data;
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}

@Component({
  selector: 'app-commercial-support-form-dashboard',
  templateUrl: './commercial-support-form-dashboard.component.html',
  styleUrls: ['./commercial-support-form-dashboard.component.css']
})
export class CommercialSupportFormDashboardComponent {

  UserName = localStorage.getItem('loginUserName').toLowerCase();
  isCommitteeDecisionUser = isCommitteeDecisionUser;
  isViewOnlyUser = isViewOnlyUser;
  downloadingProtocol = false;
  supportRequests = new MatTableDataSource<any>();
  searchValue = '';
  displayedColumns: string[] = ['id', 'requestType', 'requester', 'conferenceName', 'insertedDate', 'approved', 'actions'];
  @ViewChild('requestDialog') requestDialog: TemplateRef<any>;
  protocolDate: string = '';
  protocolAttendees: any[] = [];
  peopleList = [
    { Full_Name: 'פרופ\' אבי פרץ', Role: 'יו"ר', IsManual: false },
    { Full_Name: 'ד"ר אודה-ליה כץ', Role: '', IsManual: false },
    { Full_Name: 'דורית נודלמן', Role: '', IsManual: false },
    { Full_Name: 'עו"ד אלון דר', Role: '', IsManual: false },
    { Full_Name: 'תגל צרפתי', Role: '', IsManual: false },
    { Full_Name: 'פרופ\' עידו בירתי', Role: '', IsManual: false },
    { Full_Name: 'פרופ\' אורי ויזל', Role: '', IsManual: false },
    { Full_Name: 'נאוה נמימי', Role: 'נציגת ציבור', IsManual: false }
  ];

  constructor(
    private supportRequestService: SupportRequestService,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRequests();
  }

  get draftRequestsCount(): number {
    if (!this.supportRequests?.data) {
      return 0;
    }

    return this.supportRequests.data.filter((x: any) =>
      x.Draft === true || x.Draft === 'True' || x.Draft === 'true'
    ).length;
  }

  loadRequests(): void {
    this.supportRequestService.getAllSupportRequests(this.UserName).subscribe(requests => {
      this.supportRequests = new MatTableDataSource<any>(requests['d']);
    });
  }

  getEmployeeImage(employee_id: string): string {
    const img = `http://srv-apps-prod/Images/${employee_id}.jpg`;
    return img;
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();

    this.searchValue = value;

    this.supportRequests.filterPredicate = (data: any, filter: string) => {
      const requester = (data.Requester || '').toLowerCase();
      const requestType = (data.RequestType || '').toLowerCase();

      return requester.includes(filter) || requestType.includes(filter);
    };

    this.supportRequests.filter = this.searchValue;
  }

  getInitials(fullName: string): string {
    if (!fullName) {
      return '?';
    }

    const parts = fullName.trim().split(' ').filter(x => x);

    if (parts.length === 1) {
      return parts[0].charAt(0);
    }

    return parts[0].charAt(0) + parts[1].charAt(0);
  }

  isRequestApproved(element: any): string {
    const v = element?.Approved;
    if (v === true || v === 1) {
      return 'check';
    }
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'true' || s === 'approved' || s === 'chairman' || s === 'special' || s === 'other' || s === 'מאושר')
      return 'check';
    else if (s === null || s === undefined || s === "")
      return 'pending';
    else return 'close';
  }

  clearFilter(): void {
    this.searchValue = '';
    this.supportRequests.filter = '';
  }

  protocolData = [
    {
      title: 'תמיכה בכנס Euretina\n4–7.09.2025\nפריז, צרפת',
      company: 'Roche',
      doctor: 'ד"ר בילאל שחאדה\nעיניים',
      description: `תמיכה ברופא עיניים מומחה רשתית  
סכום כספי עד לסך 2,850 ₪ כולל תקורה לדמי רישום / טיסה  
ולינה (4 לילות)`,
      decision: 'מאושר'
    },
    {
      title: 'תמיכה בקורס SADI\n19–20.05.2025\nברצלונה, ספרד',
      company: 'ג’י-סי הלת’ קר בע"מ',
      doctor: 'ד"ר ואיל ח’ורי\nכירורגיה',
      description: `דמי רישום ולינה 2 לילות  
תמיכה עד 1,050€ כולל טיסה ולילה נוסף`,
      decision: 'מאושר'
    }
  ];

  openDialog() {
    this.dialog.open(this.requestDialog);
  }

  selectRequest(type: string) {
    this.dialog.closeAll();
    this.viewRequest(type); // Send the selected type
  }

  viewRequest(type: string | null) {
    let dialogTemp;
    // handle the selected option
    switch (type) {
      case 'A':
        dialogTemp = this.dialog.open(CommercialSupportFormDialogComponent, {
          disableClose: true,
          width: '50%'
        });
        break;
      case 'B':
        dialogTemp = this.dialog.open(CommercialSupportResearchDialogComponent, {
          disableClose: true,
          width: '50%'
        });
        break;
      case 'C':
        dialogTemp = this.dialog.open(CommercialSupportPresentationDialogComponent, {
          disableClose: true,
          width: '50%'
        });
        break;
      case 'D':
        dialogTemp = this.dialog.open(CommercialSupportGatheringComponent, {
          disableClose: true,
          width: '50%'
        });
        break;
      case 'E':
        dialogTemp = this.dialog.open(CommercialSupportProcurementDialogComponent, {
          disableClose: true,
          width: '50%'
        });
        break;
    }
    dialogTemp.afterClosed().subscribe(() => {
      this.loadRequests();
    });
  }

  editRequest(type: string | null, element: any) {
    const dialogData = { ...element, readOnly: isViewOnlyUser(this.UserName) };
    let dialogTemp;
    // handle the selected option
    switch (element.Roler) {
      case 'A':
        dialogTemp = this.dialog.open(CommercialSupportFormDialogComponent, {
          disableClose: true,
          width: '50%',
          data: dialogData
        });
        break;
      case 'B':
        dialogTemp = this.dialog.open(CommercialSupportResearchDialogComponent, {
          disableClose: true,
          width: '50%',
          data: dialogData
        });
        break;
      case 'C':
        dialogTemp = this.dialog.open(CommercialSupportPresentationDialogComponent, {
          disableClose: true,
          width: '50%',
          data: dialogData
        });
        break;
      case 'D':
        dialogTemp = this.dialog.open(CommercialSupportGatheringComponent, {
          disableClose: true,
          width: '50%',
          data: dialogData
        });
        break;
      case 'E':
        dialogTemp = this.dialog.open(CommercialSupportProcurementDialogComponent, {
          disableClose: true,
          width: '50%',
          data: dialogData
        });
        break;
    }
    dialogTemp.afterClosed().subscribe(() => {
      this.loadRequests();
    });
  }

  deleteRequest(request: any): void {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הבקשה של ${request.Requester}?`)) {
      return;
    }

    this.supportRequestService.deleteSupportRequest(request).subscribe({
      next: () => {
        // הסרה מהטבלה אחרי שמחיקה הצליחה
        const index = this.supportRequests.data.findIndex(r => r.Id === request);
        if (index !== -1) {
          this.supportRequests.data.splice(index, 1);
          this.supportRequests._updateChangeSubscription(); // לעדכן את הטבלה
        }
        alert('הבקשה נמחקה בהצלחה');
        this.loadRequests();
      },
      error: (err) => {
        console.error('שגיאה במחיקה:', err);
        alert('אירעה שגיאה במחיקה');
        this.loadRequests();
      }
    });
  }

  dialogRequest(element) {
    const dialogRef = this.dialog.open(DialogExampleComponent, {
      width: '30%',
      data: element
    });
    dialogRef.afterClosed().subscribe(result => {
      this.loadRequests();
    });
  }

  printTable(): void {
    const tableHeaders = ['מספר הבקשה', 'סוג הבקשה', 'מגיש הבקשה/עובד משתתף', 'תיאור', 'תאריך הבקשה'];

    const tableRows = this.supportRequests.filteredData.map(item => `
    <tr>
      <td>${item.Id || ''}</td>
      <td>${item.RequestType || ''}</td>
      <td>${item.Requester || ''}</td>
      <td>${item.Name || ''}</td>
      <td>${new Date(item.InsertedDate).toLocaleDateString('he-IL')}</td>
    </tr>
  `).join('');

    const htmlContent = `
    <html dir="rtl" lang="he">
      <head>
        <title>בקשות תמיכת גוף מסחרי</title>
        <style>
          body {
            font-family: 'Alef', sans-serif;
            direction: rtl;
            padding: 20px;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 20px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: #1e88e5;
            color: white;
          }
          tr:nth-child(even) td {
            background-color: #f5f5f5;
          }
        </style>
      </head>
      <body>
        <h1>דוח בקשות תמיכת גוף מסחרי</h1>
        <p style="text-align: center;">תאריך יצירה: ${new Date().toLocaleDateString('he-IL')}</p>
        <table>
          <thead>
            <tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank', 'width=1000,height=1000');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  }

  printProtocol() {
    this.supportRequestService.getSupportProtocolDates().subscribe({
      next: (Response) => {
        const savedMeetings = Response['d'] || [];
        this.dialog.open(CommercialSupportProtocolDialogComponent, {
          width: '560px',
          data: {
            peopleList: this.peopleList,
            savedMeetings: savedMeetings
          },
          direction: 'rtl'
        }).afterClosed().subscribe(res => {
          if (!res) {
            return;
          }
          const protocolDate = this.normalizeDate(res.ProtocolDate);
          if (!protocolDate) {
            this.snackBar.open('יש לבחור תאריך פרוטוקול', 'סגור', { duration: 3000 });
            return;
          }

          const runAction = (attendees: any[]) => {
            if (res.action === 'save') {
              this.supportRequestService.saveSupportProtocolAttendance(res.people, protocolDate).subscribe({
                next: (saveRes) => {
                  if (saveRes['d']) {
                    this.snackBar.open('נוכחות נשמרה בהצלחה', 'סגור', { duration: 3000 });
                  } else {
                    this.snackBar.open('שגיאה בשמירת נוכחות', 'סגור', { duration: 3000 });
                  }
                },
                error: () => this.snackBar.open('שגיאה בשמירת נוכחות', 'סגור', { duration: 3000 })
              });
              return;
            }
            if (res.action === 'download') {
              this.downloadProtocolPdf(protocolDate, attendees);
              return;
            }
            if (res.action === 'print') {
              this.runProtocolPrint(protocolDate, attendees);
            }
          };

          if (res.people?.length) {
            runAction(res.people);
            return;
          }

          this.supportRequestService.getSupportProtocolPeople(protocolDate).subscribe({
            next: (peopleRes) => runAction(peopleRes['d'] || []),
            error: () => this.snackBar.open('שגיאה בטעינת נוכחות', 'סגור', { duration: 3000 })
          });
        });
      },
      error: () => this.snackBar.open('שגיאה בטעינת תאריכי פרוטוקול', 'סגור', { duration: 3000 })
    });
  }

  isProtocolRow(r: any): boolean {
    if (!r || r.Approved == null || r.Approved === '') {
      return false;
    }
    if (!this.protocolDate) {
      return false;
    }
    const decisionDate = this.normalizeDate(r.DecisionDate);
    return !!decisionDate && decisionDate === this.protocolDate;
  }

  attendeeLabel(person: any): string {
    if (!person) {
      return '';
    }
    return person.Role ? `${person.Full_Name} (${person.Role})` : person.Full_Name;
  }

  private normalizeDate(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return this.formatYmdLocal(value);
    }
    const asString = String(value).trim();
    if (!asString || asString === 'null' || asString === 'undefined') {
      return '';
    }

    // ASP.NET JSON: /Date(1693785600000)/ or /Date(1693785600000+0300)/
    const msMatch = asString.match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//);
    if (msMatch) {
      return this.formatYmdLocal(new Date(parseInt(msMatch[1], 10)));
    }

    // Already yyyy-MM-dd or ISO datetime — take calendar date without TZ shift
    const iso = asString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    const parsed = new Date(asString);
    if (!isNaN(parsed.getTime())) {
      return this.formatYmdLocal(parsed);
    }
    return '';
  }

  private formatYmdLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private runProtocolPrint(protocolDate: string, attendees: any[]): void {
    this.protocolDate = protocolDate;
    this.protocolAttendees = attendees || [];
    this.cdr.detectChanges();

    setTimeout(() => {
      const printContents = document.getElementById('print-area')!.innerHTML;
      const w = window.open('', '', 'width=1000,height=800');
      w!.document.write(`
    <html dir="rtl">
      <head>
        <title>פרוטוקול ועדה</title>
        <style>
          body { font-family: Arial, 'Segoe UI', sans-serif; direction: rtl; text-align: right; }
          table, th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: right;
            vertical-align: top;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `);

      w!.document.close();
      w!.focus();
      w!.print();
      w!.close();
    });
  }

  private downloadProtocolPdf(protocolDate: string, attendees: any[]): void {
    this.protocolDate = protocolDate;
    this.protocolAttendees = attendees || [];
    this.downloadingProtocol = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      const element = document.getElementById('print-area');
      if (!element) {
        this.downloadingProtocol = false;
        this.snackBar.open('שגיאה בייצוא PDF', 'סגור', { duration: 3000 });
        return;
      }

      const restoreStyles = this.revealPrintAreaForCapture(element);

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (doc) => this.applyProtocolPrintStyles(doc.getElementById('print-area'))
      }).then(canvas => {
        restoreStyles();

        if (!canvas.width || !canvas.height) {
          throw new Error('Empty canvas');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`protocol_${protocolDate}.pdf`);
        this.downloadingProtocol = false;
        this.snackBar.open('הורדת PDF הושלמה', 'סגור', { duration: 3000 });
      }).catch((err) => {
        restoreStyles();
        this.downloadingProtocol = false;
        console.log(err);
        this.snackBar.open('שגיאה בייצוא PDF', 'סגור', { duration: 3000 });
      });
    }, 150);
  }

  private revealPrintAreaForCapture(element: HTMLElement): () => void {
    const prev = {
      display: element.style.display,
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      zIndex: element.style.zIndex,
      visibility: element.style.visibility,
    };

    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-10000px';
    element.style.top = '0';
    element.style.width = '1120px';
    element.style.zIndex = '-1';
    element.style.visibility = 'visible';
    this.applyProtocolPrintStyles(element);

    return () => {
      element.style.display = prev.display;
      element.style.position = prev.position;
      element.style.left = prev.left;
      element.style.top = prev.top;
      element.style.width = prev.width;
      element.style.zIndex = prev.zIndex;
      element.style.visibility = prev.visibility;
    };
  }

  private applyProtocolPrintStyles(root: HTMLElement | null): void {
    if (!root) {
      return;
    }

    root.setAttribute('dir', 'rtl');
    root.style.direction = 'rtl';
    root.style.textAlign = 'right';
    root.style.unicodeBidi = 'embed';
    root.style.fontFamily = "Arial, 'Segoe UI', sans-serif";
    root.style.color = '#000';
    root.style.background = '#fff';

    root.querySelectorAll('table').forEach((table) => {
      const el = table as HTMLElement;
      el.style.width = '100%';
      el.style.borderCollapse = 'collapse';
      el.style.direction = 'rtl';
    });

    root.querySelectorAll('th, td').forEach((cell) => {
      const el = cell as HTMLElement;
      el.style.border = '1px solid #000';
      el.style.padding = '8px';
      el.style.textAlign = 'right';
      el.style.verticalAlign = 'top';
    });

    root.querySelectorAll('th').forEach((cell) => {
      const el = cell as HTMLElement;
      el.style.backgroundColor = '#f0f0f0';
      el.style.fontWeight = 'bold';
    });
  }



}