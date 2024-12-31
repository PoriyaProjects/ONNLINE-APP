import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { TrainingRequestFormComponent } from './training-request-form/training-request-form.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-training-request-dashboard',
  templateUrl: './training-request-dashboard.component.html',
  styleUrls: ['./training-request-dashboard.component.css']
})
export class TrainingRequestDashboardComponent implements OnInit {

  trainingRequests = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'Form_Fill_Date', 'First_Name', 'Family_Name', 'Passport_ID', 'Address', 'Phone_Number', 'Department', 'Actions'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  UserName = localStorage.getItem('loginUserName').toLowerCase();

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.getAllTrainingRequestFormsList();
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
      });;
    }
  }

  getAllTrainingRequestFormsList() {
    this.http
      .post(environment.url + "GetAllTrainingRequestFormsList", {})
      .subscribe((Response) => {
        this.trainingRequests = new MatTableDataSource<any>(Response["d"]);
        this.trainingRequests.paginator = this.paginator;
        this.trainingRequests.sort = this.sort;
      });
  }
}

