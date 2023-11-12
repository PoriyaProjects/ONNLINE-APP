import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

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
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    console.log(data)
    this.title = data.title 
    this.date = data.date
    this.cards = data.data 
  }

  ngOnInit(): void {
  }

}
