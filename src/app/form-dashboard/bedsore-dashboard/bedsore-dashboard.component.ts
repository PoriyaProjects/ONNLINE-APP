import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PatientDetails } from '../tumor-board/Tumor-data';
import { MatPaginator } from '@angular/material/paginator';
import { ConfirmationDialogService } from "../../confirmation-dialog/confirmation-dialog.service";
import { environment } from 'src/environments/environment';
import { BedsoreModalComponent } from './bedsore-modal/bedsore-modal.component';

@Component({
  selector: 'app-bedsore-dashboard',
  templateUrl: './bedsore-dashboard.component.html',
  styleUrls: ['./bedsore-dashboard.component.css']
})
export class BedsoreDashboardComponent implements OnInit {



  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";

  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  searchPatient: FormGroup;
  departsList = [];
  department = "";
  loading: boolean = false;
  searchPatientProgressBar: boolean = true;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  dataSource = new MatTableDataSource();
  dataSourcePatients = new MatTableDataSource();
  patientDetails: PatientDetails;
  @ViewChild('printmycontent') printmycontent: ElementRef;
  displayedColumns: string[] = [
    'delete', 'FormDate', 'CaseNumber', 'PatientName', 'edit', 'print', 'namer'
  ];
  displayedColumnsPatinets: string[] = [
    'delete', 'FormDate', 'CaseNumber', 'PatientName', 'edit', 'print', 'namer'
  ];
  elementToPrint: any;
  loaderPdfNamer = false;
  pdfString: string = ``;

  ngOnInit(): void {
    this.searchPatient = this.fb.group({
      Passport: ['', null],
      CaseNumber: ['', null]
    });
    this.getChamelleonCurrentPatients();
    this.getAllBedsoreList();
  }

  chooseDepartment(depart) {
    this.department = depart;
    this.dataSourcePatients.filter = this.department.trim().toLowerCase();
  }

  getChamelleonCurrentPatients() {
    this.http
      .post(environment.url + "GetChamelleonCurrentPatients", {
      })
      .subscribe((Response) => {
        this.dataSourcePatients = new MatTableDataSource<any>(Response["d"]);
        this.dataSourcePatients.paginator = this.paginator;
        this.departsList = this.groupByDepartments(this.dataSourcePatients.filteredData);
      });
  }

  groupByDepartments(items): any {
    let acc = [];
    items.forEach((element, index) => {
      const key = element.DepartName; // Replace 'category' with your desired property
      if (!acc.includes(key)) {
        acc.push(key);
      }
    });
    return acc;
  }

  getAllBedsoreList() {
    this.loading = true;
    this.http
      .post(environment.url + "GetAllBedsoreList", {
      })
      .subscribe((Response) => {
        this.dataSource = new MatTableDataSource<any>(Response["d"]);
        this.dataSource.paginator = this.paginator;
        this.loading = false;
      });
  }

  getPatients() {
    let caseNumber = this.searchPatient.controls['CaseNumber'].value;

    this.searchPatientProgressBar = false;
    this.http
      .post(environment.url + "getPatientDetailsByCaseNumber", {
        _caseNumber: caseNumber
      })
      .subscribe((Response) => {
        this.searchPatientProgressBar = true;
        let details = Response["d"];
        this.patientDetails = {
          RowID: null,
          Passport: details.PM_PATIENT_ID,
          FirstName: details.PM_FIRST_NAME,
          FatherName: details.PM_FATHER_NAME,
          LastName: details.PM_LAST_NAME,
          PhoneNumber: null,
          CaseNumber: details.PM_CASE_NUMBER,
          Address: null,
          DOB: details.PM_DOB,
        }
        this.openFormDialog(this.patientDetails);
      });
  }

  openFormDialog(PatientDetails) {
    PatientDetails = {
      RowID: PatientDetails.Row_ID,
      Passport: PatientDetails.IDNumber,
      FirstName: PatientDetails.FirstName,
      FatherName: PatientDetails.FatherName,
      LastName: PatientDetails.LastName,
      CaseNumber: PatientDetails.CaseNumber,
      DOB: PatientDetails.Age,
    }
    let dialogRef = this.dialog.open(BedsoreModalComponent, {
      data: {
        PatientDetails
      },
      width: '80%'
    });
    dialogRef.afterClosed().subscribe(result => {
      this.getAllBedsoreList();
    });
  }

  printBoneMarrowForm(element) {
    this.elementToPrint = element;
    let that = this;
    setTimeout(function () {
      var style = "<style>p,mat-label,span{font-weight: bold;font-size: 18px;}h1{font-size: 12px;}.col-2{width: 20%;justify-content: center;}.note {text-align: center;font-family: monospace;font-weight: normal;}</style>";
      var printContents = that.printmycontent.nativeElement.innerHTML;
      style = style + printContents;
      var w = window.open();
      w.document.write(style);
      setTimeout(() => {
        w.print();
        w.close();
      }, 500);
    }, 600);
  }

  editFormDialog(data) {
    let dialogRef = this.dialog.open(BedsoreModalComponent, {
      data: {
        data
      },
      width: '80%'
    });
    dialogRef.afterClosed().subscribe(result => {
      this.getAllBedsoreList();
    });
  }

  applyFilter(event: Event) {
    let filterValue;
    if (event == undefined) {
      filterValue = "";
    } else if (event.isTrusted == undefined) {
      filterValue = event;
    } else {
      filterValue = (event.target as HTMLInputElement).value;
    }
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      data.PatientDetails['fullName'] = data.PatientDetails.FirstName + ' ' + data.PatientDetails.LastName;
      return data.PatientDetails.fullName.includes(filter);
    }
    // this.TABLE_DATA = this.TABLE_DATA.filter(x => x.includes(filterValue.trim().toLowerCase()));
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  deleteForm(formData) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http.post(environment.url + "DeleteBedsoreForm", {
            _formId: formData.Row_ID,
          }).subscribe((Response) => {
            if (Response['d']) this.openSnackBar("נמחק בהצלחה!");
            else this.openSnackBar("תקלה במחיקה!");
            this.getAllBedsoreList();
          });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }

  linkToNamer(data) {
    this.loaderPdfNamer = true;
    this.pdfString = `<!doctype html><html lang="he"><head><meta charset="utf-8"/><title>תיעוד פצע</title>
    <style>p,mat-label,span{font-weight: bold;font-size: 18px;}h1{font-size: 14px}.col-2{width: 16.66667%;justify-content: center;}.row{display: flex;margin-top: 10px;}</style>
    </head><body dir="rtl">
    <div class="d-none-desktop">
      <div class="d-none-desktop" dir="rtl">
          <div class="card-header border-bottomIn rel" style="text-align: center;">
              <img class="full-width" style="width: 100%;" src="https://poria.is-great.org/images/covid_2_header.png" />
              <h1 class="text-center pos-abs-center"><u>תיעוד פצע</u></h1>
          </div>
          <div class="row">
              <div class="col-12" style="width: 100%;text-align: center;float: right;">
                  <p>תאריך: `+ data.DateOfForm + `</p>
              </div>
          </div>
          <div class="row">
            <div class="col-2" style="float: right;">
                  <h5>ת.ז: <br>`+ data.PatientDetails.Passport + `</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>מספר מקרה: <br>`+ data.PatientDetails.CaseNumber + `</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם פרטי: <br>`+ data.PatientDetails.FirstName + `
                  </h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם אב: <br>`+ data.PatientDetails.FatherName + `
                  </h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם משפחה: <br>`+ data.PatientDetails.LastName + `
                  </h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>גיל: <br>`+ data.PatientDetails.DOB + `</h5>
              </div>
            </div>
            <hr>`;
    $("#loader_2").removeClass("d-none");
    this.http.post(environment.urlipracticom + "CreateBedsorePdf", {
      _patient: data.PatientDetails,
      html: this.pdfString,
      Catigory: "ZPO_BEDSOR"
    }
    )
      .subscribe((Response) => {
        let that = this;
        setTimeout(() => {
          that.http.post(environment.urlipracticom + "LinkPdfToPatientNamer", {
            // that.http.post("http://localhost:64964/WebService.asmx/LinkPdfToPatientNamer", {
            CaseNumber:
              data.PatientDetails.CaseNumber,
            FormID: data.Row_ID,
            Catigory: "ZPO_BEDSOR",
            fileSource:
              Response["d"],
          }
          )
            .subscribe((Response) => {
              if (
                Response["d"] == "success") {
                $("#loader_2").addClass("d-none");
                that.openSnackBar("! נשמר בהצלחה לתיק מטופל בנמר");
                this.loaderPdfNamer = false;
                this.getAllBedsoreList();
              } else {
                that.openSnackBar("! משהו לא תקין");
              }
            });
        }, 1000);
      });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}
