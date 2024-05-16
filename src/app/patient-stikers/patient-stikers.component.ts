import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MenuPerm } from '../menu-perm';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { environment } from "src/environments/environment";
import { MatDialog } from '@angular/material/dialog';
import { CreatePatientComponent } from './create-patient/create-patient.component';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
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
  departs: any[] = [];
  seodedeparts: any[] = [];
  form: FormGroup;
  checked = false;
  indeterminate = false;
  departsfiltered: Observable<any[]>;
  seodedepartsfiltered: Observable<any[]>;
  @ViewChild("stickers") stickers: ElementRef;
  labelPosition: 'before' | 'after' = 'after';
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
  private _filterseode(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.seodedeparts.filter(option => option.DepartID.toLowerCase().indexOf(filterValue) === 0);
  }
  private _filterdepart(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.departs.filter(option => option.DepartID.toLowerCase().indexOf(filterValue) === 0);
  }
  openDialog(): void {
    this.mPersonalDetails = this.form.value.textInput
    const dialogRef = this.dialog.open(CreatePatientComponent, {
      width: '750px',
      data: this.mPersonalDetails
    });

    dialogRef.afterClosed().subscribe((result: PersonalDetails) => {
      this.loading = true;
      if (this.form.value.depart) {
        result.Depart = this.form.value?.depart;
      }
      if (this.form.value.seodeDepart) {
        result.SeodeDepart = this.form.value?.seodeDepart;
      }


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
    this.getNamerDepatrs();

    this.CreateNewMovment = this.fb.group({
      PersonID: ["", null],
      PatientNumber: ["", null],
      CaseNumber: ["", null],
      Gender: ["", null],
      FirstName: ["", null],
      LastName: ["", null],
      FatherName: ["", null],
      Depart: ["", null],
      SeodeDepart: ["", null],
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
      textInput: ['', Validators.required],
      depart: ['', null],
      seodeDepart: ['', null],
    });
    let departCont = this.form.get('depart') as FormControl;
    let seodeDepartCont = this.form.get('seodeDepart') as FormControl;
    this.departsfiltered = departCont.valueChanges.pipe(
      startWith(''),
      map(value => this._filterdepart(value))
    );
    this.seodedepartsfiltered = seodeDepartCont.valueChanges.pipe(
      startWith(''),
      map(value => this._filterseode(value))
    );
  }
  changePos() {
    this.checked = !this.checked
    if (!this.checked) {
      this.form.get("depart").patchValue("");
      this.form.get("seodeDepart").patchValue("");
    }
  }
  openPrintWindow() {
    var mywindow = window.open("", "PRINT");

    mywindow.document.write(
      "<html><head><style>.col-8{width:66%;float:right;}.pos-1-2{    position: relative;margin-top: -6px;font-size: 14px;}.pos-1-4{    margin-top: -12px;position: relative;margin-bottom: 6px;    font-size: 15px;}.pos-1-3{    margin-top: -12px;position: relative;z-index: -1;}.pos-1-5{margin-top:-10px;margin-bottom: 16px;font-size: 14px;}.pl-20{padding-left: 20px;}.p-20{padding: 0 20px;}.ngx-barcode{width:100%;float:right;text-align: center}.fz-b{font-size:20px;    padding-top: 30px;}.pos-1-4{margin-top: -12px;position: relative;margin-bottom: 10px;}*, ::after, ::before {box-sizing: border-box;margin: 0;padding: 0;}.d-block{width:100%;float:right;}.col{width:100%;float:right;}.col-4{width:33%;float:right;}.col-6{width:50%;float:right;} .col-3{width:25%;float:right;}.text-center {text-align: center!important;}.text-right{text-align: right!important;}.text-left{text-align: left!important;}table {page-break-after: always;}.row{width:100%;float:right;font-weight: bold !important;}.col-6{width:50%; float:right;}td{padding-left:10px;}tr>td:last-child{padding-right:15px;}body{font-family: Arial;font-weight: bolder !important;}</style><title>מדביקות</title>"
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
    //mywindow.close();
    this.loading = false;
    this.CreateNewMovment = this.fb.group({
      PersonID: ["", null],
      PatientNumber: ["", null],
      CaseNumber: ["", null],
      Gender: ["", null],
      FirstName: ["", null],
      LastName: ["", null],
      FatherName: ["", null],
      Depart: ["", null],
      SeodeDepart: ["", null],
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
      //return
      this.loading = true;
      // You can perform any further actions like sending the form data to a backend service.

      //this.http.post("http://localhost/RCF_WS/WebService.asmx/findPatientByIDToCreateNewMove", {
      this.http.post(environment.url + "findPatientByIDToCreateNewMove", {
        PatientId: this.form.value.textInput,
        depart: this.form.value.depart,
        seodeDepart: this.form.value.seodeDepart
      }).subscribe((t: any) => {
        var i = t.d;
        if (this.form.value.depart != '') {
          i.depart = this.form.value.depart
          i.seodeDepart = this.form.value.seodeDepart

        }
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
                depart: this.form.value.depart,
                seodeDepart: this.form.value.seodeDepart
              }
            )
            .subscribe((Response) => {
              var json = Response["d"];
              this.mPersonalDetails = json;
              if (!this.mPersonalDetails.PersonID) {
                this.mPersonalDetails.PersonID = this.form.value.textInput
              }
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
            if (!this.mPersonalDetails.PersonID) {
              this.mPersonalDetails.PersonID = this.form.value.textInput
            }
            let that = this;
            setTimeout(() => {
              that.openPrintWindow();
            }, 1500);

          })
        }
      })

    }
  }
  getNamerDepatrs() {
    this.http
      .post(
        environment.url + "GetNamerDepatrs",
        //"http://srv-ipracticom:8080/WebService.asmx/GetPersonalDetails",
        {
          type: 'R',
        }
      )
      .subscribe((Response) => {
        //debugger
        var json = Response["d"];
        this.departs = json;

        //debugger;
      });
    this.http
      .post(
        environment.url + "GetNamerDepatrs",
        //"http://srv-ipracticom:8080/WebService.asmx/GetPersonalDetails",
        {
          type: 'S',
        }
      )
      .subscribe((Response) => {
        //debugger
        var json = Response["d"];
        this.seodedeparts = json;

        //debugger;
      });
  }
}
