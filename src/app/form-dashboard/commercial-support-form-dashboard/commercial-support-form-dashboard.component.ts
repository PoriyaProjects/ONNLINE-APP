import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CommercialSupportFormDialogComponent } from './commercial-support-form-dialog/commercial-support-form-dialog.component';
import { CommercialSupportGatheringComponent } from './commercial-support-gathering/commercial-support-gathering.component';
import { CommercialSupportPresentationDialogComponent } from './commercial-support-presentation-dialog/commercial-support-presentation-dialog.component';
import { CommercialSupportResearchDialogComponent } from './commercial-support-research-dialog/commercial-support-research-dialog.component';
import { SupportRequestService } from './commercial-support.service';

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

  loadRequests(): void {
    this.supportRequestService.getAllSupportRequests(this.UserName).subscribe(requests => {
      this.supportRequests = new MatTableDataSource<any>(requests['d']);
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.searchValue = value;
    this.supportRequests.filterPredicate = (data: any, filter: string) =>
      data.requester.toLowerCase().includes(filter);
    this.supportRequests.filter = this.searchValue;
  }

  clearFilter(): void {
    this.searchValue = '';
    this.supportRequests.filter = '';
  }

  // viewRequest2(request: any) {
  //   // Example: open a dialog with details
  //   const dialogRef = this.dialog.open(CommercialSupportFormDialogComponent, {
  //     disableClose: true,
  //     width: '80%',
  //     data: request // אפשר להעביר כאן דאטה אם צריך
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       // אם המשתמש שמר משהו בדיאלוג
  //       this.loadRequests(); // טען מחדש את הבקשות
  //     }
  //   });
  // }

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
          width: '50%'
        });
        break;
      case 'B':
        dialogTemp = this.dialog.open(CommercialSupportResearchDialogComponent, {
          width: '50%'
        });
        break;
      case 'C':
        dialogTemp = this.dialog.open(CommercialSupportPresentationDialogComponent, {
          width: '50%'
        });
        break;
      case 'D':
        dialogTemp = this.dialog.open(CommercialSupportGatheringComponent, {
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
          width: '50%',
          data: element
        });
        break;
      case 'B':
        dialogTemp = this.dialog.open(CommercialSupportResearchDialogComponent, {
          width: '50%',
          data: element
        });
        break;
      case 'C':
        dialogTemp = this.dialog.open(CommercialSupportPresentationDialogComponent, {
          width: '50%',
          data: element
        });
        break;
      case 'D':
        dialogTemp = this.dialog.open(CommercialSupportGatheringComponent, {
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


}
