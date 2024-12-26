import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { TrainingRequestFormComponent } from './training-request-form/training-request-form.component';

@Component({
  selector: 'app-training-request-dashboard',
  templateUrl: './training-request-dashboard.component.html',
  styleUrls: ['./training-request-dashboard.component.css']
})
export class TrainingRequestDashboardComponent implements OnInit {

  trainingRequests = [];

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
        data: rowId,
        width: '90%',
        height: '90%'
      });
    }
  }

  getAllTrainingRequestFormsList() {
    this.http
      .post(environment.url + "GetAllTrainingRequestFormsList", {})
      .subscribe((Response) => {
        this.trainingRequests = Response["d"];
      });
  }
}

