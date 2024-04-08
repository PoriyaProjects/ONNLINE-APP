import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MenuPerm } from '../menu-perm';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from "src/environments/environment";
import { MatDialog } from '@angular/material/dialog';
import { CreatePatientComponent } from './create-patient/create-patient.component';
export interface DialogData {
  Gender: string;
  PhoneNumber: string;
  Address: string;
  DOB: string;
  FirstName: string;
  LastName: string;
  PersonID: string;
}
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

  @ViewChild("stickers") stickers: ElementRef;

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
  loading = false;
  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";
  constructor(
    public router: Router,
    public http: HttpClient,
    public modalService: NgbModal,
    public _snackBar: MatSnackBar,
    private mMenuPerm: MenuPerm,
    private fb: FormBuilder,
    public dialog: MatDialog
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
  openDialog(): void {
    this.mPersonalDetails = this.form.value.textInput
    const dialogRef = this.dialog.open(CreatePatientComponent, {
      width: '750px',
      data: this.mPersonalDetails
    });

    dialogRef.afterClosed().subscribe((result: PersonalDetails) => {
      this.loading = true;
      if (result?.FirstName)
        this.http.post(environment.url + "createMovmentAtPatientMovment", {
          personalDetails: result
        }).subscribe((Response) => {
          var json = Response["d"];
          this.mPersonalDetails = json;
          let that = this;
          setTimeout(() => {
            that.openPrintWindow();
          }, 1500);

        })
      else
        this.loading = false
    });
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
  openPrintWindow() {
    var mywindow = window.open("", "PRINT");

    mywindow.document.write(
      "<html><head><style>.col-8{width:66%;float:right;}pl-20{padding-left: 20px;}p-20{padding: 0 20px;}.pos-1{position: relative;height: 124px;}.pos-1-1{padding-right: 10px;position: absolute;top: 25px;}.pos-1-2{position: absolute;top: 42px;z-index: 111;padding-right: 10px;}.pos-1-3{position: absolute;    right: -6px;top: 52px;height: 35px;overflow: hidden; }.pos-1-4{position: absolute;top: 87px;}.pos-1-5{padding-right: 16px;padding-left: 25px;position: absolute;top: 102px;}.ngx-barcode{width:100%;float:right;text-align: center}.fz-b{font-size:20px;    padding-top: 30px;}*, ::after, ::before {box-sizing: border-box;}.d-block{width:100%;float:right;}.col{width:100%;float:right;}.col-4{width:33%;float:right;}.col-6{width:50%;float:right;} .col-3{width:25%;float:right;}.text-center {text-align: center!important;}.text-right{text-align: right!important;}.text-left{text-align: left!important;}table {page-break-after: always;}.row{width:100%;float:right;}.col-6{width:50%; float:right;}</style><title>מדביקות</title>"
    );
    mywindow.document.write(
      '</head><body>'
    );
    mywindow.document.write(
      this.stickers.nativeElement.innerHTML
    );
    mywindow.document.write("</body></html>");

    mywindow.document.close(); // necessary for IE >= 10
    mywindow.focus(); // necessary for IE >= 10*/

    mywindow.print();
    mywindow.close();
    this.loading = false;
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
  }
  submitForm() {
    if (this.form.valid) {
      console.log('Form submitted:', this.form.value);
      this.loading = true;
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
          this.openDialog();
        } else if (i.CaseNumber) {
          this.http
            .post(
              environment.url + "GetPersonalDetailsFromDB",
              //"http://srv-ipracticom:8080/WebService.asmx/GetPersonalDetails",
              {
                CaseNumber: i.CaseNumber,
              }
            )
            .subscribe((Response) => {
              var json = Response["d"];
              this.mPersonalDetails = json;
              let that = this;
              setTimeout(() => {
                that.openPrintWindow();
              }, 1500);

              //debugger;
            });
        } else {
          //debugger
          this.http.post(environment.url + "createMovmentAtPatientMovment", {
            personalDetails: i
          }).subscribe((Response) => {
            var json = Response["d"];
            this.mPersonalDetails = json;
            let that = this;
            setTimeout(() => {
              that.openPrintWindow();
            }, 1500);

          })
        }
      })

    }
  }
}
