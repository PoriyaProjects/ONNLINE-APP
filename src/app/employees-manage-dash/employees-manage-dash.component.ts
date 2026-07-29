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
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-employees-manage-dash',
  templateUrl: './employees-manage-dash.component.html',
  styleUrls: ['./employees-manage-dash.component.css']
})
export class EmployeesManageDashComponent implements OnInit, OnDestroy {

  TABLE_DATA: any[] = [];
  TABLE_DATAExcel: any[] = [];
  displayedColumns: string[] = [
    'Image', 'EmployeeID', 'FirstName', 'LastName', 'DepartnentDescripton', 'SubDepartment', 'FunctionDescription', 'CellNumber', 'Email'
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);
  dataSourceExcel = new MatTableDataSource(this.TABLE_DATAExcel);
  trainingdataSourceExcel = new MatTableDataSource();
  educationdataSourceExcel = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  UserName = localStorage.getItem("loginUserName").toLowerCase();
  managerType: string = "";
  all_employees = [];
  DepartmentsList = [];
  SubDepartmentsList = [];
  FunctionsList = [];
  SektorsList = [];
  WorkPlacesList = [];
  DirectManagersList = [];
  IndirectManagersList = [];
  departmentAutocomplete = new FormControl('');
  roleAutocomplete = new FormControl('');
  directManagerAutocomplete = new FormControl('');
  indirectManagerAutocomplete = new FormControl('');
  filteredDepartments: Observable<any[]> = new Observable<any[]>();
  filteredRoles: Observable<any[]> = new Observable<any[]>();
  filteredSubDepartments: Observable<any[]> = new Observable<any[]>();
  filteredDirectManagers: Observable<any[]> = new Observable<any[]>();
  filteredIndirectManagers: Observable<any[]> = new Observable<any[]>();
  subDepartmentAutocomplete = new FormControl('');
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
      this.getDirectManagersList();
      this.getIndirectManagersList();
      this.searchEmployeesGroup = this.formBuilder.group({
        EmpID: new FormControl('', null),
        EmpFirstName: new FormControl('', null),
        EmpLastName: new FormControl('', null),
        // Elective: new FormControl('0', null),
        On: new FormControl('1', null),
        MedGrad: new FormControl('0', null),
        PhoneNumber: new FormControl('', null),
        Department: new FormControl('', null),
        SubDepartment: new FormControl('', null),
        Role: new FormControl('', null),
        Sektor: new FormControl('', null),
        WorkPlace: new FormControl('', null),
        StatusRow: new FormControl('2', null),
        AcceptTerms: new FormControl(false, null),
        ApprovedToBlossom: new FormControl('2', null),
        InGym: new FormControl('', null),
        DirectManager: new FormControl('', null),
        IndirectManager: new FormControl('', null),
      });
      this.initSearchAutocompletes();

    }
  }

  private initSearchAutocompletes(): void {
    this.filteredDepartments = this.departmentAutocomplete.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterDepartments(value))
    );
    this.filteredRoles = this.roleAutocomplete.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterRoles(value))
    );
    this.departmentAutocomplete.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.searchEmployeesGroup.controls['Department'].setValue('');
      }
    });
    this.roleAutocomplete.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.searchEmployeesGroup.controls['Role'].setValue('');
      }
    });
    this.filteredSubDepartments = this.subDepartmentAutocomplete.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterSubDepartments(value))
    );
  }

  private filterDepartments(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.DepartnentDescripton || '').toLowerCase();
    return this.DepartmentsList.filter((dept) =>
      (dept.DepartnentDescripton || '').toLowerCase().includes(text)
    );
  }

  private filterRoles(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.FunctionDescription || '').toLowerCase();
    return this.FunctionsList.filter((func) =>
      (func.FunctionDescription || '').toLowerCase().includes(text)
    );
  }

  private filterSubDepartments(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.SubDepartmentDescription || '').toLowerCase();
    return this.SubDepartmentsList.filter((dept) =>
      (dept.DepartnentDescripton || '').toLowerCase().includes(text) &&
      (dept.SubDepartmentDescription || '').toLowerCase().includes(text)
    );
  }

  displayDepartment(dept: any): string {
    return dept?.DepartnentDescripton || '';
  }

  displayRole(func: any): string {
    return func?.FunctionDescription || '';
  }

  displaySubDepartment(subDept: any): string {
    return subDept?.SubDepartmentDescription || '';
  }

  onDepartmentSelected(dept: any): void {
    this.searchEmployeesGroup.controls['Department'].setValue(dept?.DepartnentCode || '');
  }

  onRoleSelected(func: any): void {
    this.searchEmployeesGroup.controls['Role'].setValue(func?.FunctionID || '');
  }

  onSubDepartmentSelected(subDept: any): void {
    this.searchEmployeesGroup.controls['SubDepartment'].setValue(subDept?.SubDepartmentCode || '');
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

  getDirectManagersList() {
    this.http
      .post(this.url + "getDirectManagersList", {
      })
      .subscribe((Response) => {
        this.DirectManagersList = Response["d"];
        this.filteredDirectManagers = this.directManagerAutocomplete.valueChanges.pipe(
          startWith(''),
          map((value) => this.filterDirectManagers(value))
        );
      });
  }
  getIndirectManagersList() {
    this.http
      .post(this.url + "getIndirectManagersList", {
      })
      .subscribe((Response) => {
        this.IndirectManagersList = Response["d"];
        this.filteredIndirectManagers = this.indirectManagerAutocomplete.valueChanges.pipe(
          startWith(''),
          map((value) => this.filterIndirectManagers(value))
        );
      });
  }
  private filterDirectManagers(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.FirstName || '').toLowerCase();
    if(text == '') {
      return this.DirectManagersList;
    }
    return this.DirectManagersList.filter((directManager) =>
      (directManager.FirstName || '').toLowerCase().includes(text)
    );
  }
  private filterIndirectManagers(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.FirstName || '').toLowerCase();
    if(text == '') {
      return this.IndirectManagersList;
    }
    return this.IndirectManagersList.filter((indirectManager) =>
      (indirectManager.FirstName || '').toLowerCase().includes(text)
    );
  }
  displayDirectManager(directManager: any): string {
    return directManager?.EmployeeID || '';
  }
  displayIndirectManager(indirectManager: any): string {
    return indirectManager?.EmployeeID || '';
  }
  onDirectManagerSelected(directManager: any): void {
    this.searchEmployeesGroup.controls['DirectManager'].setValue(directManager?.EmployeeID || '');
  }
  onIndirectManagerSelected(indirectManager: any): void {
    this.searchEmployeesGroup.controls['IndirectManager'].setValue(indirectManager?.EmployeeID || '');
  }
  chooseManagerTypeForMultiple(managerType) {
    this.managerType = managerType;
    this.GetEmployeesToUpdate(this.managerType, false);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value ?? '';
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private setupTableFilter(): void {
    this.dataSource.filterPredicate = (data: any, filter: string): boolean => {
      const normalizedFilter = (filter || '').trim().toLowerCase();
      if (!normalizedFilter) {
        return true;
      }

      const firstName = (data?.FirstName || '').toString().trim().toLowerCase();
      const lastName = (data?.LastName || '').toString().trim().toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const reverseFullName = `${lastName} ${firstName}`.trim();

      const searchableText = `${this.flattenObjectValues(data)} ${fullName} ${reverseFullName}`.toLowerCase();
      const terms = normalizedFilter.split(/\s+/).filter(Boolean);

      return terms.every(term => searchableText.includes(term));
    };
  }

  private flattenObjectValues(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map(item => this.flattenObjectValues(item)).join(' ');
    }

    if (typeof value === 'object') {
      return Object.values(value).map(item => this.flattenObjectValues(item)).join(' ');
    }

    return String(value);
  }

  getEmployeeDepartmentList() {
    this.http
      .post(this.url + "GetEmployeeDepartmentList", {
      })
      .subscribe((Response) => {
        this.DepartmentsList = Response["d"];
        this.SubDepartmentsList = this.DepartmentsList.filter((dept) => dept.SubDepartmentDescription != null);
        const selectedCode = this.searchEmployeesGroup?.controls['Department']?.value;
        const selectedDept = this.DepartmentsList.find((d) => d.DepartnentCode == selectedCode);
        if (selectedDept) {
          this.departmentAutocomplete.setValue(selectedDept, { emitEvent: false });
        }
      });
  }

  getEmployeesFunctionsList() {
    this.http
      .post(this.url + "GetEmployeesFunctionsListDistincted", {
        _userName: this.UserName
      })
      .subscribe((Response) => {
        this.FunctionsList = Response["d"];
        const selectedId = this.searchEmployeesGroup?.controls['Role']?.value;
        const selectedRole = this.FunctionsList.find((f) => f.FunctionID == selectedId);
        if (selectedRole) {
          this.roleAutocomplete.setValue(selectedRole, { emitEvent: false });
        }
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
    let directManager = this.searchEmployeesGroup.controls['DirectManager'].value;
    let indirectManager = this.searchEmployeesGroup.controls['IndirectManager'].value;
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
        _InGym: InGym,
        _directManager: directManager,
        _indirectManager: indirectManager
      })
      .subscribe((Response) => {
        this.loaded = true;
        this.dataSource = new MatTableDataSource<any>(Response["d"]);
        this.setupTableFilter();
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
      if (toExcel == 'tra') {
        this.http
          .post(this.url + "EmployeesTrainingsExcelExport", {
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
            _InGym: InGym,
            _directManager: directManager,
            _indirectManager: indirectManager
          })
          .subscribe((Response) => {
            this.trainingdataSourceExcel = new MatTableDataSource<any>(Response["d"]);
            let that = this;
            setTimeout(() => {
              that.trainingexportexcel();
            }, 1500);
          });
      }
    if (toExcel == 'edu') {
      this.http
        .post(this.url + "EmployeesEducationsExcelExport", {
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
          _InGym: InGym,
          _directManager: directManager,
          _indirectManager: indirectManager
        })
        .subscribe((Response) => {
          this.educationdataSourceExcel = new MatTableDataSource<any>(Response["d"]);
          let that = this;
          setTimeout(() => {
            that.educationexportexcel();
          }, 1500);
        });
    } else if (toExcel) {
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
          _InGym: InGym,
          _directManager: directManager,
          _indirectManager: indirectManager
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

  fileName = 'רשימת עובדים.xlsx';
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

  trainingfileName = 'רשימת הכשרות.xlsx';
  trainingexportexcel(): void {
    /* table id is passed over here */
    let element = document.getElementById('training-excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, this.trainingfileName);
  }
  
  educationfileName = 'רשימת השכלות.xlsx';
  educationexportexcel(): void {
    /* table id is passed over here */
    let element = document.getElementById('education-excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, this.educationfileName);
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
