import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-training-request-dialog',
  templateUrl: './training-request-dialog.component.html',
  styleUrls: ['./training-request-dialog.component.css'],
})
export class TrainingRequestDialogComponent {

  plansList = new MatTableDataSource();
  displayedColumns: string[] = [
    'Row_ID', 'DateFill', 'Name', 'Plan_Date', 'Actions'
  ];
  element_to_save: any;

  constructor(
    private http: HttpClient,
    private datePipe: DatePipe,
    private dialogRef: MatDialogRef<TrainingRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Data for edit mode
  ) {
    this.getTrainingRequestPlansList();
  }

  setDataToElement(event) {
    console.log(event);
  }

  addRow() {
    const newRow = {
      Row_ID: '',
      Name: '',
      Plan_Date: '',
    };
    // Add the new row to the data source
    const updatedData = [...this.plansList.data, newRow];
    this.plansList.data = updatedData;
  }

  save(element) {
    element.Plan_Date = this.datePipe.transform(element.Plan_Date, 'yyyy-MM-dd');
    console.log(element);
    this.http
      .post(environment.url + "SaveTrainingRequestPlan", {
        data: element
      })
      .subscribe((Response) => {
        if (Response['d']) alert("נשמר בהצלחה");
        else alert("תקלה! לא נשמר");
      });
  }

  getTrainingRequestPlansList() {
    this.http
      .post(environment.url + "GetTrainingRequestPlansList", {})
      .subscribe((Response) => {
        this.plansList = new MatTableDataSource<any>(Response["d"]);
      });
  }

  close() {
    this.dialogRef.close();
  }
}