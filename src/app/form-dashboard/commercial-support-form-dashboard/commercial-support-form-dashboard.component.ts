import { DatePipe } from '@angular/common';
import { Component, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CommercialSupportFormDialogComponent } from './commercial-support-form-dialog/commercial-support-form-dialog.component';
import { CommercialSupportGatheringComponent } from './commercial-support-gathering/commercial-support-gathering.component';
import { CommercialSupportPresentationDialogComponent } from './commercial-support-presentation-dialog/commercial-support-presentation-dialog.component';
import { CommercialSupportResearchDialogComponent } from './commercial-support-research-dialog/commercial-support-research-dialog.component';
import { SupportRequestService } from './commercial-support.service';



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
  supportRequests = new MatTableDataSource<any>();
  searchValue = '';
  displayedColumns: string[] = ['id', 'requestType', 'requester', 'conferenceName', 'insertedDate', 'actions'];
  @ViewChild('requestDialog') requestDialog: TemplateRef<any>;

  constructor(
    private supportRequestService: SupportRequestService,
    private dialog: MatDialog
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
    }
    dialogTemp.afterClosed().subscribe(() => {
      this.loadRequests();
    });
  }

  editRequest(type: string | null, element: any) {
    let dialogTemp;
    // handle the selected option
    switch (element.Roler) {
      case 'A':
        dialogTemp = this.dialog.open(CommercialSupportFormDialogComponent, {
          disableClose: true,
          width: '50%',
          data: element
        });
        break;
      case 'B':
        dialogTemp = this.dialog.open(CommercialSupportResearchDialogComponent, {
          disableClose: true,
          width: '50%',
          data: element
        });
        break;
      case 'C':
        dialogTemp = this.dialog.open(CommercialSupportPresentationDialogComponent, {
          disableClose: true,
          width: '50%',
          data: element
        });
        break;
      case 'D':
        dialogTemp = this.dialog.open(CommercialSupportGatheringComponent, {
          disableClose: true,
          width: '50%',
          data: element
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
      },
      error: (err) => {
        console.error('שגיאה במחיקה:', err);
        alert('אירעה שגיאה במחיקה');
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
    const printContents = document.getElementById('print-area')!.innerHTML;

    const w = window.open('', '', 'width=1000,height=800');
    w!.document.write(`
    <html dir="rtl">
      <head>
        <title>פרוטוקול ועדה</title>
        <style>
          body { font-family: Arial; direction: rtl; }
          table, th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: #f0f0f0;
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
  }



}