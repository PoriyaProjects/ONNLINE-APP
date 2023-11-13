import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ClinicsPatientRequestsDialogComponent } from '../clinics-patient-requests-dialog/clinics-patient-requests-dialog.component';

@Component({
  selector: 'app-clinics-requests-dialog',
  templateUrl: './clinics-requests-dialog.component.html',
  styleUrls: ['./clinics-requests-dialog.component.css']
})
export class ClinicsRequestsDialogComponent implements OnInit {
  title = "";
  date = "";
  cards = [];
  constructor(    
    private http: HttpClient,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    console.log(data)
    this.title = data.title 
    this.date = data.date
    this.cards = data.data 
  }

  ngOnInit(): void {
  }
  onCardClick(card: any){
    console.log(card);
    $("#loader").removeClass("d-none");
    this.http
      .post(
        "http://srv-apps-prod/RCF_WS/WebService.asmx/GetPatientClinicDepartAppointmentsByDay",
        {
          Depart: card['Depart_ID'],
          AppointmentDate: card['AppointmentDate'],
          RoomNumber: card['RoomNumber'],
        }
      )
      .subscribe((Response) => {
        console.log(Response);
        let res = {
          title: card["Depart"],
          total: card["Total"],
          date:  card['AppointmentDate'],
          roomNumber:  card['RoomNumber'],
          data: Response["d"] as any[],         
        }
        const dialogRef = this.dialog.open(ClinicsPatientRequestsDialogComponent, {
          width: "95%",
          data: res
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log(`Dialog result: ${result}`);
        });
        $("#loader").addClass("d-none");
      });
  }
}
