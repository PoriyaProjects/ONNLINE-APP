// dashboard.component.ts
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { MatPaginator } from '@angular/material/paginator'
import { ServiceUnitEmailListDialogComponent } from './service-unit-email-list-dialog/service-unit-email-list-dialog.component';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-service-unit-email-list',
  templateUrl: './service-unit-email-list.component.html',
  styleUrls: ['./service-unit-email-list.component.css']
})
export class ServiceUnitEmailListComponent implements OnInit {

  searchTerm = '';
  columns: string[] = ['col1', 'col2', 'col3', 'actions'];
  data = [/* your data array */];
  filteredData = new MatTableDataSource<any>(this.data);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private http: HttpClient,) { }

  ngOnInit(): void {
    this.getDepartmentMailingList();
  }

  applyFilter() {
    this.filteredData.filter = this.searchTerm.trim().toLowerCase();

    if (this.filteredData.paginator) {
      this.filteredData.paginator.firstPage(); // Go to the first page when filter changes
    }
  }

  openDialog(element) {
    const dialogRef = this.dialog.open(ServiceUnitEmailListDialogComponent, {
      width: '60%',
      data: element != "" ? element.DepartmentHebFullDesc : ""
    });

    dialogRef.afterClosed().subscribe(result => {
      this.getDepartmentMailingList();
    });
  }

  getDepartmentMailingList() {
    this.http
      .post(environment.url + "GetDepartmentMailingList", {
      })
      .subscribe((Response) => {
        this.filteredData = new MatTableDataSource<any>(Response['d']);
        this.filteredData.paginator = this.paginator;
      });
  }

}
