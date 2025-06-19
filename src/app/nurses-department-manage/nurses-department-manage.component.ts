import { HttpClient } from '@angular/common/http';
import { Component, Inject, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { NursesDashboardComponent } from '../nurses-dashboard/nurses-dashboard.component';
import { Router } from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { environment } from 'src/environments/environment';
import { SpreadsheetComponent } from '../spreadsheets-dashboard/spreadsheet/spreadsheet.component';

@Component({
  selector: 'bug-report-component',
  templateUrl: './bugModal.html',
  styleUrls: ['./nurses-department-manage.component.css']
})
export class BugReportComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  reportSubject: any;
  phoneNumber: any;

  constructor(public dialog: MatDialog,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: string,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<NursesDepartmentManageComponent>,
    private formBuilder: FormBuilder,
    private datePipe: DatePipe) {

  }

  ngOnInit() {

  }


  submitBugReport() {
    if ((this.phoneNumber == "" || this.phoneNumber == undefined) || (this.reportSubject == "" || this.reportSubject == undefined)) {
      this.openSnackBar("להשלים שדות חובה");
    } else {
      this.http
        .post(environment.url + "ReportBugNursesSystem", {
          _phoneNumber: this.phoneNumber,
          _reportSubject: this.reportSubject,
          _userName: this.UserName,
        })
        .subscribe((Response) => {
          if (Response["d"]) {
            this.openSnackBar("נשלח לטיפול");
          } else {
            this.openSnackBar("משהו השתבש לא נשלח");
          }
        });
    }
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}

@Component({
  selector: 'app-nurses-department-manage',
  templateUrl: './nurses-department-manage.component.html',
  styleUrls: ['./nurses-department-manage.component.css']
})
export class NursesDepartmentManageComponent implements OnInit {


  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>();
  spreadsheets = [];

  displayedColumns2: string[] = ['casenumber', 'departmentmedical', 'roomnumber', 'lastname', 'firstname', 'dadname', 'age', 'gender', 'enterdate', 'entertime', 'displayreports'];
  dataSource2 = new MatTableDataSource<any>();
  dataSourceFullSpare = new MatTableDataSource<any>();
  @ViewChild('modalBug', { static: true }) modalBug: TemplateRef<any>;
  @ViewChild('modalOtherApps', { static: true }) modalOtherApps: TemplateRef<any>;

  applyFilter(event: Event, filval: string) {
    if (filval == '') {
      this.dataSource2 = this.dataSourceFullSpare;
      const filterValue = (event.target as HTMLInputElement).value;
      this.dataSource2.filter = filterValue;
    } else {
      if (filval == "מונשם") {
        let newArr = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION.includes(filval) && !obj.SSP_DESCRIPTION.includes("ECMO"));
        this.dataSource2 = new MatTableDataSource<any>(newArr);
      } else if (filval == "ארן") {
        let newArr = this.dataSource2.filteredData.filter((obj) => obj.AranStatus !== '');
        this.dataSource2 = new MatTableDataSource<any>(newArr);
      } else {
        this.dataSource2 = this.dataSourceFullSpare;
        this.dataSource2.filter = filval;
      }
    }
  }
  constructor(public dialog: MatDialog,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: string,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<NursesDepartmentManageComponent>,
    private formBuilder: FormBuilder,
    private datePipe: DatePipe) { }

  event: Event;
  deliveryRoomDialog: string;
  numberOfCVA: number = 0;
  numberOfNeurology: number = 0;
  departCode: string;
  updateSubscription: any;
  Dept_Name: string;
  ifAdmin: string;
  loading: boolean;
  Patientsloading: boolean;
  patientsTable: boolean;
  departmentArray = [];
  ELEMENT_DATA = [];
  ELEMENT_DATA2 = [];
  RespiratorsCount: string = "0";
  CatheterCount: string = "0";
  CentralCatheterCount: string = "0";
  IsolationCount: string = "0";
  PhLimitationCount: string = "0";
  CoronaStatus: string = '';
  AranStatus: string = '';
  departmentRelease: FormGroup;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  date = new Date();
  myDate = this.datePipe.transform(this.date, 'yyyy-MM-dd');
  timer: any;
  arrayOfMedDepts = [];
  phoneNumber: any;
  reportSubject: any;
  nursingCount: any;
  // dateTimeGroup: FormGroup;
  // numberOfDays = 0;
  // newDate: string = this.datePipe.transform(this.date, 'yyyy-MM-dd');
  // dateToDisplayString: string = this.datePipe.transform(this.date, 'yyyy-MM-dd');

  ngOnInit(): void {
    this.loadData();
    if (this.Dept_Name == 'מיון יולדות (חדר לידה)' || this.Dept_Name == 'חדר לידה') {
      this.displayedColumns = ['nursing', 'receipts', 'released'];
    } else if (this.Dept_Name == 'ילוד בריא' || this.Dept_Name == 'יולדות') {
      this.displayedColumns = ['nursing', 'receipts', 'released', 'plannedtorelease', 'holiday'];
    }
    else {
      this.displayedColumns = ['nursing', 'receipts', 'released', 'plannedtorelease', 'holiday', 'respirators', 'catheter', 'centralcatheter', 'isolation', 'phlimitation', 'death', 'kpc', 'complex'];
    }
    this.loading = true;
    this.patientsTable = true;
    this.Patientsloading = false;
    this.departmentRelease = new FormGroup({
      plannedToRelease: new FormControl('', null),
    });
    this.getPatientsPerDepart(this.event, '');
    this.getDepartDetails();
    this.getSubmitPlannedToRealse('0');
    // this.dateTimeGroup = this.formBuilder.group({
    //   ReportStartDate: new FormControl('', null),
    //   ReportEndDate: new FormControl('', null)
    // });
  }

  getSubmitPlannedToRealse(ifsaved) {
    this.http
      .post(environment.url + "GetSubmitPlannedToRealse", {
        _plannedToRelease: this.departmentRelease.controls['plannedToRelease'].value,
        _departCode: this.departCode,
        userName: localStorage.getItem('loginUserName').toLowerCase()
      })
      .subscribe((Response) => {
        this.departmentRelease.controls['plannedToRelease'].setValue(Response["d"]);
      });
    if (ifsaved == '1') {
      this.openSnackBar("נשמר בהצלחה");
      this.ngOnInit();
    }
  }

  closeModal() {
    // this.checkIfToRefresh(false);
    this.dialogRef.close();
  }

  closeApps() {
    this.dialog.closeAll();
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  displayReports(caseNumber, asDialog, Dept_Name, firstname, lastname, gender, dob, description, corona, reportType) {
    let dialogRef = this.dialog.open(NursesDashboardComponent, { disableClose: true });
    dialogRef.componentInstance.caseNumber = caseNumber;
    dialogRef.componentInstance.asDialog = asDialog;
    dialogRef.componentInstance.Dept_Name = Dept_Name;
    dialogRef.componentInstance.firstname = firstname;
    dialogRef.componentInstance.lastname = lastname;
    dialogRef.componentInstance.gender = gender;
    dialogRef.componentInstance.dob = dob;
    dialogRef.componentInstance.description = description;
    dialogRef.componentInstance.corona = corona;
    dialogRef.componentInstance.reportType = reportType;
    dialogRef.componentInstance.nursingCount = this.nursingCount;
    dialogRef.afterClosed()
      .subscribe((data) => {
        if (data) {
          this.dialogRef.close(data);
        }
        // clearInterval(this.updateSubscription);
      })
  }

  bugReport() {
    let dialogRef = this.dialog.open(BugReportComponent);
    dialogRef.componentInstance.reportSubject = this.reportSubject;
    dialogRef.componentInstance.phoneNumber = this.phoneNumber;
  }

  changeDepartByUser(departCode, departName) {
    this.departCode = departCode;
    this.Dept_Name = departName;
    this.ngOnInit();
  }

  // changeDisplayDateTime() {
  //   let startDate = this.dateTimeGroup.controls['ReportStartDate'].value;
  //   let endDate = this.dateTimeGroup.controls['ReportEndDate'].value;
  //   let start_date = this.datePipe.transform(startDate, 'yyyy-MM-dd');
  //   let end_date = this.datePipe.transform(endDate, 'yyyy-MM-dd');
  //   let start_time = this.datePipe.transform(startDate, 'HH:mm');
  //   let end_time = this.datePipe.transform(endDate, 'HH:mm');
  //   console.log(start_date + ' ' + start_time);
  //   console.log(end_date + ' ' + end_time);
  // }

  // displayDateNavigate(dateN){
  //   let dte = new Date();
  //   let dateToDisplay = new Date();
  //   if (dateN == 'before') {
  //     this.numberOfDays++;
  //   } else if (dateN == 'next') {
  //     this.numberOfDays--;
  //   } else {
  //     this.numberOfDays;
  //   }
  //   dte.setDate(dte.getDate() - this.numberOfDays);
  //   let pipe = new DatePipe('en-US');
  //   this.newDate = pipe.transform(dte.toString(), 'yyyy-MM-dd');
  //   this.dateToDisplayString = this.newDate;
  //   this.getDepartDetails();
  //   this.getPatientsPerDepart(this.event, '');
  // }

  loadData(): void {
    this.http.post(environment.url + 'GetSpreadSheetsList', {
      _section: 'Nurses'
    }).subscribe((response: any) => {
      let permission_to = ['1', '7', '10'];
      response['d'].forEach(element => {
        if (element.SheetID == '1' || element.SheetID == '7' || element.SheetID == '10') {
          this.spreadsheets.push(element);
        }
      });
      // console.log(temp_data); 1 7 10
    });
  }

  openSpreadSheets(sheet) {
    let dialog = this.dialog.open(SpreadsheetComponent);
    dialog.updateSize('80%', '100%');
    dialog.componentInstance.sheet_details = sheet;
  }


  openGoogleSheets() {
    window.open("https://docs.google.com/spreadsheets/d/1045oyB5WpXvgKHnIoxBgRHVxWqnXeTWnOVoo1YRpE84/edit?usp=sharing", "_blank");
  }
  openGoogleSheets2() {
    window.open("https://docs.google.com/spreadsheets/d/1as8TwO3WurD4Mn8aIuaDVbtMHyr6Bgu_bGS1w91TPA4/edit?usp=sharing", "_blank");
  }
  openGoogleSheets3() {
    window.open("https://docs.google.com/spreadsheets/d/1wJj9XGJBTUzoK-PEJUFy1CVt368N904Fn6cgKYvgBIs/edit?usp=sharing", "_blank");
  }
  openGoogleSheets4() {
    window.open("https://docs.google.com/spreadsheets/d/1FNFp3SB_NUFYrEI1juvbWuo4Ell6J8yf_8JyV4rliUc/edit?usp=sharing", "_blank");
  }

  otherApps() {
    this.dialog.open(this.modalOtherApps, { width: '60%', disableClose: false });
  }

  getDepartDetails() {
    this.http
      .post(environment.url + "GetDepartDetails", {
        _departCode: this.departCode,
        _datePointer: ""
      })
      .subscribe((Response) => {
        this.ELEMENT_DATA = Response["d"];
        if (this.ELEMENT_DATA.length == 0) {
          this.openSnackBar("לא נטען, מרענן מחדש...");
          setTimeout(() => {
            this.getDepartDetails();
          }, 7000);
        } else {
          // this.RespiratorsCount = this.ELEMENT_DATA[0].RespiratorsCount;
          // this.CatheterCount = this.ELEMENT_DATA[0].CatheterCount;
          // this.CentralCatheterCount = this.ELEMENT_DATA[0].CentralCatheterCount;
          // this.IsolationCount = this.ELEMENT_DATA[0].IsolationCount;
          // this.PhLimitationCount = this.ELEMENT_DATA[0].PhLimitationCount;
          this.loading = false;
          this.dataSource = new MatTableDataSource<any>(this.ELEMENT_DATA);
          this.nursingCount = this.dataSource.filteredData[0].NursingCount;
        }
      });
  }

  getPatientsPerDepart(event: Event, subDepart: string) {
    this.Patientsloading = true;
    this.http
      .post(environment.url + "GetPatientsPerDepart", {
        _departCode: this.departCode,
        _datePointer: ""
      })
      .subscribe((Response) => {
        this.dataSource2 = new MatTableDataSource<any>(Response["d"]);
        this.dataSourceFullSpare = new MatTableDataSource<any>(Response["d"]);
        let uniqueMedDeparts = [];
        this.arrayOfMedDepts = [];
        uniqueMedDeparts = this.dataSource2.filteredData.map(item => item.PM_MOVE_DEPART)
          .filter((value, index, self) => self.indexOf(value) === index);

        uniqueMedDeparts.forEach(element => {
          let medDepart = {
            name: '',
            number: 0
          }
          medDepart.name = element;
          medDepart.number = this.dataSource2.filteredData.filter((obj) => obj.PM_MOVE_DEPART === element).length;
          this.arrayOfMedDepts.push(medDepart);
        });

        if (this.dataSource2.filteredData.length > 0) {
          let coronaExists = this.dataSource2.filteredData.filter((obj) => obj.CoronaStatus === 'מאומת קורונה').length;
          let aranExists = this.dataSource2.filteredData.filter((obj) => obj.AranStatus !== '').length;
          this.RespiratorsCount = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION?.includes('מונשם') && !obj.SSP_DESCRIPTION?.includes('ECMO')).length.toString();
          this.CatheterCount = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION?.includes('שתן')).length.toString();
          this.CentralCatheterCount = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION?.includes('מרכזי')).length.toString();
          this.IsolationCount = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION?.includes('בידוד') || obj.kpcType.includes('בידוד')).length.toString();
          this.PhLimitationCount = this.dataSource2.filteredData.filter((obj) => obj.SSP_DESCRIPTION?.includes('פיזית')).length.toString();
          if (coronaExists > 0) {
            this.CoronaStatus = '1'
          }
          if (aranExists > 0) {
            this.AranStatus = '1'
          }
        }
        if (subDepart != '') {
          this.patientsTable = true;
          this.applyFilter(event, subDepart);
        }
        this.Patientsloading = false;
      });
  }


}
