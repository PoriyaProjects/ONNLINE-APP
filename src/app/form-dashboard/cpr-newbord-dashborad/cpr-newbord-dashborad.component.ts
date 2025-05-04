import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CprNewbornFormComponent } from './cpr-newborn-form/cpr-newborn-form.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cpr-newbord-dashborad',
  templateUrl: './cpr-newbord-dashborad.component.html',
  styleUrls: ['./cpr-newbord-dashborad.component.css']
})
export class CprNewbordDashboradComponent implements OnInit {
  displayedColumns: string[] = ['motherName', 'motherId', 'babyId', 'babyGender', 'babyWeight', 'deliveryMethod', 'location', 'actions'];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    // Replace with API call from your backend:
    this.dataSource.data = [];
    this.getNewBornCprList();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getAverageWeight(): number {
    const weights = this.dataSource.data.map((d: any) => d.babyWeight || 0);
    return weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
  }

  viewDetails(element: any) {
    // You can open a dialog or navigate
    let dg = this.dialog.open(CprNewbornFormComponent, {
      data: element,
      width: '90%',
      height: '90%'
    });
    dg.afterClosed().subscribe(res => {
      this.getNewBornCprList();
    });
  }

  editForm(element: any) {
    console.log('Editing:', element);
    // Navigate to edit form
  }

  getNewBornCprList() {
    this.http
      .post(environment.url + "GetNewBornCprList", {
      })
      .subscribe((Response) => {
        this.dataSource = new MatTableDataSource<any>(Response["d"])
      });
  }

}
