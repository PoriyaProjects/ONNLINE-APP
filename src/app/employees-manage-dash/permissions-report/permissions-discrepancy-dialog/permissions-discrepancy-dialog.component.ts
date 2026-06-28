import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface PermissionDiscrepancy {
  system_Row_ID: number;
  system_id: string;
  system_name: string;
  granted: boolean;
  employeeIDFK: string;
  UpdateDateTime: string;
  UpdateUser: string;
  Approved: boolean;
  UpdateApprovedDateTime: string;
  LogAction: string;
  Row_IDFK: number;
  employee_system: string | null;
  FullName: string;
}

@Component({
  selector: 'app-permissions-discrepancy-dialog',
  templateUrl: './permissions-discrepancy-dialog.component.html',
  styleUrls: ['./permissions-discrepancy-dialog.component.scss']
})
export class PermissionsDiscrepancyDialogComponent implements OnInit {

  displayedColumns: string[] = ['FullName', 'Sektor', 'Manager', 'system_name', 'discrepancy_type', 'granted', 'employee_system', 'UpdateDateTime'];
  dataSource = new MatTableDataSource<PermissionDiscrepancy>([]);
  isLoading = true;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }
  
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    this.dataSource.sort = sort;
  }

  constructor(
    public dialogRef: MatDialogRef<PermissionsDiscrepancyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.fetchDiscrepancies();
  }

  fetchDiscrepancies(): void {
    this.http.post<{ d: PermissionDiscrepancy[] }>(environment.url + 'GetPermissionsDiscrepancies', {})
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.d || [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching discrepancies:', err);
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