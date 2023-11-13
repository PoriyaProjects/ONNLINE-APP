import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
export interface EventDepartDay {
  RowId: string;
  ServiceNumber: string;
  ServiceDescription: string;
  Depart: string;
  AppointmentDate: string;
  AppointmentTime: string;
  Duration: string;
  PatientNumber: string;
  PatientId: string;
  PatientFirstName: string;
  PatientLastName: string;
  UniqueServiceNumber: string;
  Total: string;
}
@Component({
  selector: 'app-clinics-patient-requests-dialog',
  templateUrl: './clinics-patient-requests-dialog.component.html',
  styleUrls: ['./clinics-patient-requests-dialog.component.css']
})
export class ClinicsPatientRequestsDialogComponent implements OnInit {
  title = "";
  date = "";
  total = "";
  roomNumber = "";
  totalService = "";
  patients = [];
  TABLE_DATA: EventDepartDay[] = [];
  dataSource = new MatTableDataSource<EventDepartDay>(this.TABLE_DATA);
  resultsLength = 0;
  displayedColumns: string[] = [
    "ServiceDescription",
    "AppointmentTime",
    "PatientNumber",
    "PatientId",
    "PatientFirstName",
    "PatientLastName",
    // "CLICK_sendtosafe",
  ];
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log(data)
    this.title = data.title
    this.date = data.date
    this.total = data.total
    this.patients = data.data
    this.totalService = data?.data[0]?.Total
    this.roomNumber = data.roomNumber
  }

  ngOnInit(): void {
    this.TABLE_DATA = [];
    this.TABLE_DATA = this.patients as EventDepartDay[]
    this.dataSource = new MatTableDataSource<EventDepartDay>(this.TABLE_DATA);;
  }

}
