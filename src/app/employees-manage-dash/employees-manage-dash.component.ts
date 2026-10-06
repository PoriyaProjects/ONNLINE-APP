import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from "@angular/common/http";
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import * as XLSX from 'xlsx';
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { EmployeesAddUpdateComponent } from '../employees-manage-dash/employees-add-update/employees-add-update.component';
import { EmployeesUpdateManagersComponent } from './employees-update-managers/employees-update-managers.component';

@Component({
  selector: 'app-employees-manage-dash',
  templateUrl: './employees-manage-dash.component.html',
  styleUrls: ['./employees-manage-dash.component.css']
})
export class EmployeesManageDashComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = [
    'Image', 'EmployeeID', 'FirstName', 'LastName', 'DepartnentDescripton', 'SubDepartment', 'FunctionDescription', 'CellNumber', 'Email'
  ];

  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  UserName = (localStorage.getItem("loginUserName") || "").toLowerCase();
  managerType: string = "";

  DepartmentsList = [];
  SubDepartmentsList = [];
  FunctionsList = [];
  SektorsList = [];
  WorkPlacesList = [];
  DirectManagersList = [];
  IndirectManagersList = [];

  departmentAutocomplete = new FormControl('');
  roleAutocomplete = new FormControl('');
  subDepartmentAutocomplete = new FormControl('');
  directManagerAutocomplete = new FormControl('');
  indirectManagerAutocomplete = new FormControl('');

  filteredDepartments: Observable<any[]>;
  filteredRoles: Observable<any[]>;
  filteredSubDepartments: Observable<any[]>;
  filteredDirectManagers: Observable<any[]>;
  filteredIndirectManagers: Observable<any[]>;

  loaded: boolean = false;
  url = environment.url;
  employee: any;
  searchEmployeesGroup: FormGroup;

  // מנהל הרשמות לניקוי זיכרון
  private destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.initForm();

    if (localStorage.getItem("loginState") === "true") {
      this.getUserDepartmentForEmployees();
      this.getDirectManagersList();
      this.getIndirectManagersList();
      this.initSearchAutocompletes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Form Initialization ---
  private initForm(): void {
    this.searchEmployeesGroup = this.fb.group({
      EmpID: [''],
      EmpFirstName: [''],
      EmpLastName: [''],
      On: ['1'],
      MedGrad: ['0'],
      PhoneNumber: [''],
      Department: [''],
      SubDepartment: [''],
      Role: [''],
      Sektor: [''],
      WorkPlace: [''],
      StatusRow: ['2'],
      AcceptTerms: [false],
      ApprovedToBlossom: ['2'],
      InGym: [''],
      DirectManager: [''],
      IndirectManager: ['']
    });
  }

  // --- Autocompletes Setup ---
  private initSearchAutocompletes(): void {
    this.filteredDepartments = this.departmentAutocomplete.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      map(value => this.filterList(value, this.DepartmentsList, 'DepartnentDescripton'))
    );

    this.filteredRoles = this.roleAutocomplete.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      map(value => this.filterList(value, this.FunctionsList, 'FunctionDescription'))
    );

    this.filteredSubDepartments = this.subDepartmentAutocomplete.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      map(value => this.filterSubDepartments(value))
    );

    // ניקוי ID נסתר כאשר משתמש מוחק/משנה טקסט ידנית
    this.departmentAutocomplete.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (typeof val === 'string') this.searchEmployeesGroup.patchValue({ Department: '' });
    });
    this.roleAutocomplete.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (typeof val === 'string') this.searchEmployeesGroup.patchValue({ Role: '' });
    });
  }

  // --- Helper Methods for Filtering ---
  private filterList(value: any, list: any[], key: string): any[] {
    const text = (typeof value === 'string' ? value : value?.[key] || '').toLowerCase();
    if (!text) return list;
    return list.filter(item => (item[key] || '').toLowerCase().includes(text));
  }

  private filterSubDepartments(value: any): any[] {
    const text = (typeof value === 'string' ? value : value?.SubDepartmentDescription || '').toLowerCase();
    if (!text) return this.SubDepartmentsList;
    return this.SubDepartmentsList.filter(dept =>
      (dept.DepartnentDescripton || '').toLowerCase().includes(text) ||
      (dept.SubDepartmentDescription || '').toLowerCase().includes(text)
    );
  }

  // --- Display With Methods ---
  displayDepartment(dept: any): string { return dept?.DepartnentDescripton || ''; }
  displayRole(func: any): string { return func?.FunctionDescription || ''; }
  displaySubDepartment(subDept: any): string { return subDept?.SubDepartmentDescription || ''; }
  displayDirectManager(mgr: any): string { return mgr?.EmployeeID || ''; }
  displayIndirectManager(mgr: any): string { return mgr?.EmployeeID || ''; }

  // --- Selection Events ---
  onDepartmentSelected(dept: any): void { this.searchEmployeesGroup.patchValue({ Department: dept?.DepartnentCode || '' }); }
  onRoleSelected(func: any): void { this.searchEmployeesGroup.patchValue({ Role: func?.FunctionID || '' }); }
  onSubDepartmentSelected(subDept: any): void { this.searchEmployeesGroup.patchValue({ SubDepartment: subDept?.SubDepartmentCode || '' }); }
  onDirectManagerSelected(mgr: any): void { this.searchEmployeesGroup.patchValue({ DirectManager: mgr?.EmployeeID || '' }); }
  onIndirectManagerSelected(mgr: any): void { this.searchEmployeesGroup.patchValue({ IndirectManager: mgr?.EmployeeID || '' }); }

  // --- Data Fetching ---
  getUserDepartmentForEmployees() {
    this.http.post(`${this.url}getUserDepartmentForEmployees`, { userName: this.UserName })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const type = res.d;
        if (type == "1") this.managerType = "admin";
        else if (this.UserName == "dporat") this.managerType = "unknown";
        else if (type == "2") this.managerType = "research";
        else if (type == "0") this.managerType = "managerial";

        if (this.managerType !== "unknown") {
          this.GetEmployeesToUpdate(this.managerType, false);
          this.getEmployeeDepartmentList();
          this.getEmployeesFunctionsList();
          this.getSektorsList();
          this.getWorkPlacesList();
        }
      });
  }

  getDirectManagersList() {
    this.http.post(`${this.url}getDirectManagersList`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.DirectManagersList = res.d;
        this.filteredDirectManagers = this.directManagerAutocomplete.valueChanges.pipe(
          startWith(''),
          map(val => this.filterList(val, this.DirectManagersList, 'FirstName'))
        );
      });
  }

  getIndirectManagersList() {
    this.http.post(`${this.url}getIndirectManagersList`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.IndirectManagersList = res.d;
        this.filteredIndirectManagers = this.indirectManagerAutocomplete.valueChanges.pipe(
          startWith(''),
          map(val => this.filterList(val, this.IndirectManagersList, 'FirstName'))
        );
      });
  }

  getEmployeeDepartmentList() {
    this.http.post(`${this.url}GetEmployeeDepartmentList`, {}).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.DepartmentsList = res.d;
      this.SubDepartmentsList = this.DepartmentsList.filter(dept => dept.SubDepartmentDescription != null);
    });
  }

  getEmployeesFunctionsList() {
    this.http.post(`${this.url}GetEmployeesFunctionsListDistincted`, { _userName: this.UserName })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => this.FunctionsList = res.d);
  }

  getSektorsList() {
    this.http.post(`${this.url}getEmployeesBlossomSektorList`, {}).pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.SektorsList = res.d);
  }

  getWorkPlacesList() {
    this.http.post(`${this.url}GetWorkPlacesList`, {}).pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.WorkPlacesList = res.d);
  }

  // --- Main Search & Export ---
  private getSearchPayload(managerType: string) {
    const formValues = this.searchEmployeesGroup.value;
    return {
      _empId: formValues.EmpID,
      _empFirstName: formValues.EmpFirstName,
      _empLastName: formValues.EmpLastName,
      _on: formValues.On,
      _medGrad: formValues.MedGrad,
      _phoneNumber: formValues.PhoneNumber,
      _department: formValues.Department,
      _role: formValues.Role,
      _managerType: managerType,
      _sektor: formValues.Sektor,
      _workPlace: formValues.WorkPlace,
      _statusRow: formValues.StatusRow,
      _approvedToBlossom: formValues.ApprovedToBlossom,
      _userName: this.UserName,
      _InGym: formValues.InGym,
      _directManager: formValues.DirectManager,
      _indirectManager: formValues.IndirectManager
    };
  }

  GetEmployeesToUpdate(managerType: string, exportType: string | boolean) {
    this.loaded = false;
    const payload = this.getSearchPayload(managerType);

    // חפש עובדים וטען לטבלה
    if (!exportType) {
      this.http.post(`${this.url}GetEmployeesToUpdate`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          this.loaded = true;
          this.dataSource.data = res.d;
          this.setupTableFilter();
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      return;
    }

    // ייצוא עובדים
    if (exportType === true) {
      this.http.post(`${this.url}EmployeesExcelExport`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          const formattedData = res.d.map((emp: any) => ({
            'מזהה': emp.RowID,
            'תעודת זהות': emp.EmployeeID,
            'שם פרטי': emp.FirstName,
            'שם פרטי באנגלית': emp.FirstNameEng,
            'שם משפחה': emp.LastName,
            'שם משפחה באנגלית': emp.LastNameEng,
            'תואר': emp.JobTitleDescription,
            'מגדר': emp.Gender,
            'מייל': emp.Email,
            'מייל פרטי': emp.PersonalEmail,
            'מספר טלפון': emp.CellNumber,
            'תאריך לידה': emp.DateOfBirth,
            'כתובת': emp.Address,
            'תוארקופת חולים': emp.KupaName,
            'תחילת עבודה': emp.StartWorkDate,
            'סיום עבודה': emp.EndWorkDate,
            'צפי סיום עבודה': emp.DateToEndWork,
            'סיבת סיום עבודה': emp.ReasonDescription,
            'סקטור': emp.EmployeeSektorDescription,
            'מיקום לימודים': emp.InternLearnCountry,
            'ארץ לימודים': emp.DocLicence,
            'אונברסיטה': emp.InternLearnCountryDesc,
            'מספר רישיון': emp.InternUniversity,
            'תאריך קבלת רישיון': emp.DocStartExperience,
            'תיאור תפקיד': emp.FunctionDescription,
            'מיקום עבודה': emp.WorkPlaceDescription,
            'סקטור בבלוסום': emp.EmployeeBlossomSektor.EmployeeSektorBlossomDescription,
            'דירוג': emp.RankDescription,
            'מחלקה': emp.DepartnentDescripton,
            'תת מחלקה': emp.SubDepartment,
            'מנהל ישיר': emp.ManagerID1.firstname,
            'מנהל עקיף': emp.ManagerID2.firstname,
            'חלקיות משרה': emp.StandartJobType,
            'הערות': emp.Remarks,
            'סוג רכב': emp.CarType,
            'מספר רכב': emp.CarNumber,
            'סוג רכב 2': emp.CarType_2,
            'מספר רכב 2': emp.CarNumber_2,
            'מבצע תורנויות': emp.Toranot,
            'מאושר משאבי אנוש': emp.StatusRow,
            'מאושר בלוסום': emp.ApprovedToBlossom,
            'אישור תקנון': emp.AcceptTerms
          }));
          this.exportToExcel(formattedData, 'רשימת עובדים.xlsx');
          this.loaded = true;
        });
    }

    // ייצוא הכשרות
    if (exportType === 'tra') {
      this.http.post(`${this.url}EmployeesTrainingsExcelExport`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          const formattedData = res.d.map((item: any) => ({
            'תעודת זהות': item.Employee.EmployeeID,
            'שם פרטי': item.Employee.FirstName,
            'שם משפחה': item.Employee.LastName,
            'סקטור': item.Employee.EmployeeSektorDescription,
            'הכשרה': item.Trainings.TrainingSubject,
            'תאריך ביצוע': item.Trainings.StartDate,
            'תאריך פג תוקף': item.Trainings.EndDate,
            'הערה': item.Trainings.Note,
            'מחלקה': item.Trainings.DepartnentDescripton
          }));
          this.exportToExcel(formattedData, 'רשימת הכשרות.xlsx');
          this.loaded = true;
        });
    }
  }

  private exportToExcel(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value || '';
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private setupTableFilter(): void {
    this.dataSource.filterPredicate = (data: any, filter: string): boolean => {
      const normalizedFilter = filter.trim().toLowerCase();
      if (!normalizedFilter) return true;

      const searchableText = JSON.stringify(data).toLowerCase();
      const terms = normalizedFilter.split(/\s+/).filter(Boolean);
      return terms.every(term => searchableText.includes(term));
    };
  }

  // --- Actions ---
  chooseManagerTypeForMultiple(managerType: string) {
    this.managerType = managerType;
    this.GetEmployeesToUpdate(this.managerType, false);
  }

  addUpdateEmployee(employee: any) {
    let dialogRef = this.dialog.open(EmployeesAddUpdateComponent, { disableClose: true });
    dialogRef.componentInstance.employee = employee;
    dialogRef.componentInstance.managerType = this.managerType;
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result == 1) this.GetEmployeesToUpdate(this.managerType, false);
    });
  }

  openManagersDialog() {
    let dialogRef = this.dialog.open(EmployeesUpdateManagersComponent, { disableClose: true });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result == 1) this.GetEmployeesToUpdate(this.managerType, false);
    });
  }
}