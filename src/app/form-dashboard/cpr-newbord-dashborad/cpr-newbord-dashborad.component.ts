import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CprNewbornFormComponent } from './cpr-newborn-form/cpr-newborn-form.component';

@Component({
  selector: 'app-cpr-newbord-dashborad',
  templateUrl: './cpr-newbord-dashborad.component.html',
  styleUrls: ['./cpr-newbord-dashborad.component.css']
})
export class CprNewbordDashboradComponent implements OnInit {

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {
  }

  open() {
    this.dialog.open(CprNewbornFormComponent, {
      width: '90%',
      height: '90%'
    });
  }

}
