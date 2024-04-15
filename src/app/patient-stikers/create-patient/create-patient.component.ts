import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

export interface PersonalDetails {
  PatientNumber: string;
  DateIn: string;
  TimeIn: string;
  FirstName: string;
  FatherName: string;
  LastName: string;
  PersonID: string;
  DOB: string;
  Gender: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
  CaseNumber: string;
  Depart: string;
  DepartDescription: string;
  SeodeDepart: string;
  SeodeDepartDescription: string;
  DischargeDate: string;
  InDate: string;
  DischargeTime: string;
  InTime: string;
  Age: string;
  PASSNR: string;
  ZNE_FNAMEZZ: string;
  ZNE_LNAMEZZ: string;
  DOTIM: string;
  DODAT: string;
}
@Component({
  selector: 'app-create-patient',
  templateUrl: './create-patient.component.html',
  styleUrls: ['./create-patient.component.css']
})
export class CreatePatientComponent implements OnInit {
  form: FormGroup;
  constructor(public dialogRef: MatDialogRef<CreatePatientComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PersonalDetails,
    private fb: FormBuilder) {
    this.form = this.fb.group({
      FirstName: ['', Validators.required],
      FatherName: ['', Validators.required],
      LastName: ['', Validators.required],
      PersonID: [data, Validators.required],
      DOB: ['', Validators.required],
      Gender: ['', Validators.required],
      PhoneNumber: ['', Validators.required],
      Address: ['', null],
      Depart: ["\u05de-\u05e4\u05e0\u05d9", null],
      SeodeDepart: ["\u05e1\u05de-\u05db\u05dc", null],
    });
  }

  ngOnInit(): void {

  }
  onNoClick(): void {
    if (this.form.valid)
      this.dialogRef.close(this.form.value)
  }
}
