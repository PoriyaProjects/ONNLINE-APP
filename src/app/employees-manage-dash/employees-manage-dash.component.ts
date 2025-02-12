import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from "@angular/common/http";
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { EmployeesAddUpdateComponent } from '../employees-manage-dash/employees-add-update/employees-add-update.component';
import { MatSort } from '@angular/material/sort';
import * as XLSX from 'xlsx';
import { environment } from 'src/environments/environment';
import { EmployeesUpdateManagersComponent } from './employees-update-managers/employees-update-managers.component';

@Component({
  selector: 'app-employees-manage-dash',
  templateUrl: './employees-manage-dash.component.html',
  styleUrls: ['./employees-manage-dash.component.css']
})
export class EmployeesManageDashComponent implements OnInit, OnDestroy {

  TABLE_DATA: any[] = [];
  TABLE_DATAExcel: any[] = [];
  displayedColumns: string[] = [
    'Image', 'EmployeeID', 'FirstName', 'LastName', 'DepartnentDescripton', 'FunctionDescription', 'CellNumber', 'Gender', 'DateOfBirth', 'Email'
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);
  dataSourceExcel = new MatTableDataSource(this.TABLE_DATAExcel);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  managerType: string = "";
  all_employees = [];
  DepartmentsList = [];
  FunctionsList = [];
  SektorsList = [];
  WorkPlacesList = [];
  loaded: boolean = false;
  url = environment.url;
  employee: any;

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
    private formBuilder: FormBuilder) { }

  searchEmployeesGroup: FormGroup;

  ngOnInit(): void {
    this.employee = this.getEmployee();
    if (localStorage.getItem("loginState") == "true") {
      this.getUserDepartmentForEmployees();
      this.searchEmployeesGroup = this.formBuilder.group({
        EmpID: new FormControl('', null),
        EmpFirstName: new FormControl('', null),
        EmpLastName: new FormControl('', null),
        // Elective: new FormControl('0', null),
        On: new FormControl('1', null),
        MedGrad: new FormControl('0', null),
        PhoneNumber: new FormControl('', null),
        Department: new FormControl('', null),
        Role: new FormControl('', null),
        Sektor: new FormControl('', null),
        WorkPlace: new FormControl('', null),
        StatusRow: new FormControl('2', null),
        AcceptTerms: new FormControl(false, null),
        ApprovedToBlossom: new FormControl('2', null),
        InGym: new FormControl('', null),
      });

    }
  }

  ngOnDestroy(): void {
    // try {
    //   this.all_employees?.forEach(subscription => subscription.unsubscribe());
    //   this.DepartmentsList?.forEach(subscription => subscription.unsubscribe());
    //   this.FunctionsList?.forEach(subscription => subscription.unsubscribe());
    //   this.SektorsList?.forEach(subscription => subscription.unsubscribe());
    //   this.WorkPlacesList?.forEach(subscription => subscription.unsubscribe());
    // } catch (err) {
    //   console.error('Error unsubscribing:', err);
    // }
  }

  getEmployeeImage(employee_id) {
    const img = `http://srv-apps-prod/Images/${employee_id}.jpg`;
    return img;
  }

  // Handles the error event for a corrupt or missing image
  // onImageError(event: Event, id): void {
  //   console.log(id);
  //   const element = event.target as HTMLImageElement;
  //   element.src = 'http://srv-apps-prod/Images/default.jpg'; // Fallback image URL
  // }

  getEmployee(): any {
    return this.employee = {
      RowID: "",
      EmployeeIndex: "",
      StartWorkDate: "",
      EmployeeSektorID: "",
      EmployeeBlossomSektorID: "",
      Title: "",
      FunctionID: "",
      FunctionDescription: "",
      DepartnentCode: "",
      DepartnentDescripton: "",
      JobTitleID: "",
      Image: "",
      EmployeeID: "",
      ProfilePicture: "",
      FirstName: "",
      FirstNameEng: "",
      LastName: "",
      LastNameEng: "",
      Gender: "",
      RankID: "",
      ADUserName: "",
      Email: "",
      PersonalEmail: "",
      CellNumber: "",
      WorkPlaceID: "",
      EndWorkDate: "",
      DateToEndWork: "",
      CarType: "",
      CarType2: "",
      CarNumber: "",
      CarNumber2: "",
      Remarks: "",
      UpdateDate: "",
      L_LAT: "",
      L_LON: "",
      KupaID: "",
      KupaName: "",
      DateOfBirth: "",
      SentToMOHDate: "",
      DocLicence: "",
      DocStartExperience: "",
      InternLearnCountry: "",
      InternLearnCountryDesc: "",
      InternUniversity: "",
      StatusRow: "",
      AcceptTerms: "",
      ApprovedToBlossom: "",
      Toranot: "",
      WorkPlace: "",
      GymParticipation: {
        Row_ID: "",
        StartGymDate: "",
        EndGymDate: "",
        MedicalProblems: "",
        MedicalApproval: "",
        PausePeriod: "",
        PausePeriodExplain: "",
        Status: "",
        EmployeesID: "",
        GymParticipant: "",
      },
      EmployeeBlossomSektor: "",
    };
  }

  getUserDepartmentForEmployees() {
    this.http
      .post(this.url + "getUserDepartmentForEmployees", {
        userName: this.UserName
      })
      .subscribe((Response) => {
        let type = Response["d"];
        if (type == "1" || type == "3" || type == "5" || type == "10") {
          this.managerType = "admin";
        } else if (this.UserName == "dporat") {
          this.managerType = "unknown";
        } else if (type == "2") {
          this.managerType = "research";
        }
        if (this.managerType != "unknown") {
          this.GetEmployeesToUpdate(this.managerType, false);
          this.getEmployeeDepartmentList();
          this.getEmployeesFunctionsList();
          this.getSektorsList();
          this.getWorkPlacesList();
        }
      });
  }

  chooseManagerTypeForMultiple(managerType) {
    this.managerType = managerType;
    this.GetEmployeesToUpdate(this.managerType, false);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getEmployeeDepartmentList() {
    this.http
      .post(this.url + "GetEmployeeDepartmentList", {
      })
      .subscribe((Response) => {
        this.DepartmentsList = Response["d"];
      });
  }

  getEmployeesFunctionsList() {
    this.http
      .post(this.url + "GetEmployeesFunctionsListDistincted", {
        _userName: this.UserName
      })
      .subscribe((Response) => {
        this.FunctionsList = Response["d"];
      });
  }

  getSektorsList() {
    this.http
      .post(this.url + "getEmployeesBlossomSektorList", {
      })
      .subscribe((Response) => {
        this.SektorsList = Response["d"];
      });
  }

  getWorkPlacesList() {
    this.http
      .post(this.url + "GetWorkPlacesList", {
      })
      .subscribe((Response) => {
        this.WorkPlacesList = Response["d"];
      });
  }

  GetEmployeesToUpdate(managerType, toExcel) {
    this.loaded = false;
    let employeesToShow = "";
    let employeesWorkPlace = "";
    let empId = this.searchEmployeesGroup.controls['EmpID'].value;
    let empFirstName = this.searchEmployeesGroup.controls['EmpFirstName'].value;
    let empLastName = this.searchEmployeesGroup.controls['EmpLastName'].value;
    // let elective = this.searchEmployeesGroup.controls['Elective'].value;
    let on = this.searchEmployeesGroup.controls['On'].value;
    let medGrad = this.searchEmployeesGroup.controls['MedGrad'].value;
    let phoneNumber = this.searchEmployeesGroup.controls['PhoneNumber'].value;
    let department = this.searchEmployeesGroup.controls['Department'].value;
    let role = this.searchEmployeesGroup.controls['Role'].value;
    let sektor = this.searchEmployeesGroup.controls['Sektor'].value;
    let workPlace = this.searchEmployeesGroup.controls['WorkPlace'].value;
    let StatusRow = this.searchEmployeesGroup.controls['StatusRow'].value;
    let ApprovedToBlossom = this.searchEmployeesGroup.controls['ApprovedToBlossom'].value;
    let InGym = this.searchEmployeesGroup.controls['InGym'].value;
    this.http
      .post(this.url + "GetEmployeesToUpdate", {
        _empId: empId,
        _empFirstName: empFirstName,
        _empLastName: empLastName,
        // _elective: elective,
        _on: on,
        _medGrad: medGrad,
        _phoneNumber: phoneNumber,
        _department: department,
        _role: role,
        _managerType: managerType,
        _sektor: sektor,
        _workPlace: workPlace,
        _statusRow: StatusRow,
        _approvedToBlossom: ApprovedToBlossom,
        _userName: this.UserName,
        _InGym: InGym
      })
      .subscribe((Response) => {
        this.loaded = true;
        this.dataSource = new MatTableDataSource<any>(Response["d"]);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
    if (toExcel) {
      this.http
        .post(this.url + "EmployeesExcelExport", {
          _empId: empId,
          _empFirstName: empFirstName,
          _empLastName: empLastName,
          _on: on,
          _medGrad: medGrad,
          _phoneNumber: phoneNumber,
          _department: department,
          _role: role,
          _managerType: managerType,
          _sektor: sektor,
          _workPlace: workPlace,
          _statusRow: StatusRow,
          _approvedToBlossom: ApprovedToBlossom,
          _userName: this.UserName,
          _InGym: InGym
        })
        .subscribe((Response) => {
          this.dataSourceExcel = new MatTableDataSource<any>(Response["d"]);
          let that = this;
          setTimeout(() => {
            that.exportexcel();
          }, 1500);
        });
    }
  }

  fileName = 'Employees_List.xlsx';
  exportexcel(): void {
    /* table id is passed over here */
    let element = document.getElementById('excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, this.fileName);

  }

  addUpdateEmployee(employee) {
    let dialogRef = this.dialog.open(EmployeesAddUpdateComponent, { disableClose: true });
    dialogRef.componentInstance.employee = employee;
    dialogRef.componentInstance.managerType = this.managerType;
    dialogRef.afterClosed().subscribe(result => {
      if (result == 1) this.GetEmployeesToUpdate(this.managerType, false);
    });
  }

  openManagersDialog() {
    let dialogRef = this.dialog.open(EmployeesUpdateManagersComponent, { disableClose: true });
    dialogRef.afterClosed().subscribe(result => {
      if (result == 1) this.GetEmployeesToUpdate(this.managerType, false);
    });
  }

}
