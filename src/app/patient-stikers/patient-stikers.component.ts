import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MenuPerm } from '../menu-perm';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from "src/environments/environment";
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
  selector: 'app-patient-stikers',
  templateUrl: './patient-stikers.component.html',
  styleUrls: ['./patient-stikers.component.css']
})
export class PatientStikersComponent implements OnInit {
  form: FormGroup;
  CreateNewMovment: FormGroup;
  mPersonalDetails: PersonalDetails = {
    PatientNumber: "",
    DateIn: "",
    TimeIn: "",
    FirstName: "",
    FatherName: "",
    LastName: "",
    PersonID: "",
    DOB: "",
    Gender: "",
    PhoneNumber: "",
    Email: "",
    Address: "",
    CaseNumber: "",
    Depart: "",
    DepartDescription: "",
    SeodeDepart: "",
    SeodeDepartDescription: "",
    DischargeDate: "",
    InDate: "",
    DischargeTime: "",
    InTime: "",
    Age: "",
    PASSNR: "",
    ZNE_FNAMEZZ: "",
    ZNE_LNAMEZZ: "",
    DOTIM: "",
    DODAT: "",
  };
  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";
  constructor(
    public router: Router,
    public http: HttpClient,
    public modalService: NgbModal,
    public _snackBar: MatSnackBar,
    private mMenuPerm: MenuPerm,
    private fb: FormBuilder
  ) {
    mMenuPerm.setRoutName("patientstikers");
    setTimeout(() => {
      if (!mMenuPerm.getHasPerm()) {
        localStorage.clear();
        this.router.navigate(["login"]);
      }
    }, 2000);
    // //////debugger;
  }

  ngOnInit(): void {
    this.CreateNewMovment = this.fb.group({
      PersonID: ["", null],
      PatientNumber: ["", null],
      CaseNumber: ["", null],
      Gender: ["", null],
      FirstName: ["", null],
      LastName: ["", null],
      FatherName: ["", null],
      Depart: ["\u05de-\u05e4\u05e0\u05d9", null],
      SeodeDepart: ["\u05e1\u05de-\u05db\u05dc", null],
      DOB: ["", null],
      Address: ["", null],
      PhoneNumber: ["", null],
      InDate: ["", null],
      InTime: ["", null],
      DateIn: ["", null],
      TimeIn: ["", null],
      Email: ["", null],
      DepartDescription: ["", null],
      SeodeDepartDescription: ["", null],
      DischargeTime: ["", null],
      Age: ["", null],
      PASSNR: ["", null],
      ZNE_FNAMEZZ: ["", null],
      ZNE_LNAMEZZ: ["", null],
      DOTIM: ["", null],
      DODAT: ["", null],
      RealDateTime: [new Date(), null]
    })
    this.form = this.fb.group({
      option: ['1', Validators.required],
      textInput: ['', Validators.required]
    });
  }
  submitForm() {
    if (this.form.valid) {
      console.log('Form submitted:', this.form.value);

      // You can perform any further actions like sending the form data to a backend service.

      //this.http.post("http://localhost/RCF_WS/WebService.asmx/findPatientByIDToCreateNewMove", {
      this.http.post(environment.url + "findPatientByIDToCreateNewMove", {
        PatientId: this.form.value.textInput
      }).subscribe((t: any) => {
        var i = t.d;

        if (!i.FirstName) {
          this._snackBar.open("מטופל לא קיים", "", {
            duration: 2500,
            direction: "rtl",
            panelClass: "error",
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
        }
      })

  }
}
}
