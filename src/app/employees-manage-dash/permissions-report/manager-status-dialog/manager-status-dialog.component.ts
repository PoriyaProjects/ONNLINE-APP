import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ManagerApprovalStatus {
  'department': string;
  'sektor': string;
  'manager1': string;
  'manager_phone': string;
  'approved': number;
  'not_approved': number;
  'status': string;
}

@Component({
  selector: 'app-manager-status-dialog',
  templateUrl: './manager-status-dialog.component.html',
  styleUrls: ['./manager-status-dialog.component.scss']
})
export class ManagerStatusDialogComponent implements OnInit {

  displayedColumns: string[] = ['department', 'sektor', 'manager1', 'manager_phone', 'approved', 'not_approved', 'status'];
  dataSource = new MatTableDataSource<ManagerApprovalStatus>([]);
  isLoading = true;

  @ViewChild(MatSort) set matSort(sort: MatSort) {
    this.dataSource.sort = sort;
  }

  constructor(
    public dialogRef: MatDialogRef<ManagerStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    // החלף את הנתיב בהתאם ל-API האמיתי שלך שקורא ל-SQL
    this.http.post<{ d: ManagerApprovalStatus[] }>(environment.url + 'GetManagersApprovalSummary', {})
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.d || [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching summary:', err);
          this.isLoading = false;
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}