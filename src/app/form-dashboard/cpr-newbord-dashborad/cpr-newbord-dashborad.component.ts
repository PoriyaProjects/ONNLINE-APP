import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CprNewbornFormComponent } from './cpr-newborn-form/cpr-newborn-form.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

const MOCK_DATA = [
  {
    babyName: 'דניאל',
    babyGender: 'זכר',
    babyWeight: 3.2,
    deliveryMethod: 'קיסרי',
    location: 'חדר לידה'
  },
  {
    babyName: 'מאיה',
    babyGender: 'נקבה',
    babyWeight: 2.9,
    deliveryMethod: 'ואגינלי',
    location: 'מחלקת יולדות'
  }
];

@Component({
  selector: 'app-cpr-newbord-dashborad',
  templateUrl: './cpr-newbord-dashborad.component.html',
  styleUrls: ['./cpr-newbord-dashborad.component.css']
})
export class CprNewbordDashboradComponent implements OnInit {
  displayedColumns: string[] = ['babyName', 'babyGender', 'babyWeight', 'deliveryMethod', 'location', 'actions'];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    // Replace with API call from your backend:
    this.dataSource.data = MOCK_DATA;
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
    console.log('Viewing:', element);
    // You can open a dialog or navigate
    this.dialog.open(CprNewbornFormComponent, {
      width: '90%',
      height: '90%'
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
        let all_users_filter = Response["d"];
      });
  }

}
