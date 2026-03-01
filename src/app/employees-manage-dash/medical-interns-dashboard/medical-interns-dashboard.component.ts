import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MedicalInternAddUpdateComponent } from './medical-intern-add-update/medical-intern-add-update.component';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


@Component({
  selector: 'app-medical-interns-dashboard',
  templateUrl: './medical-interns-dashboard.component.html',
  styleUrls: ['./medical-interns-dashboard.component.css']
})
export class MedicalInternsDashboardComponent implements OnInit {

  stats = {
    total: 0,
    withEmail: 0,
    withPhone: 0,
    uniqueDepartments: 0
  };

  TABLE_DATA: any[] = [];
  displayedColumns: string[] = [
    'Image', 'EmployeeID', 'FirstName', 'LastName', 'CellNumber', 'Email', 'Actions'
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  searchInternsGroup: FormGroup;
  DepartmentsList: any[] = [];
  loaded = false;
  url = environment.url;
  emptyIntern: any;

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.emptyIntern = this.getEmptyIntern();
    this.searchInternsGroup = this.formBuilder.group({
      EmployeeID: new FormControl('', null),
      FirstName: new FormControl('', null),
      LastName: new FormControl('', null),
      PhoneNumber: new FormControl('', null),
      Department: new FormControl('', null),
      On: new FormControl('', null),
    });
    this.getMedicalInterns();
    this.getDepartmentList();
  }

  getEmptyIntern(): any {
    return {
      RowID: '',
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      CellNumber: '',
      Email: '',
      DepartnentCode: '',
      DepartnentDescripton: '',
      ProfilePicture: 'http://srv-apps-prod/Images/default.jpg',
    };
  }

  get activeFiltersCount(): number {
    if (!this.searchInternsGroup) return 0;

    return Object.values(this.searchInternsGroup.value)
      .filter(v => v !== null && v !== undefined && v.toString().trim() !== '')
      .length;
  }


  getDepartmentList() {
    this.http.post(this.url + 'GetMedicalInternDepartments', { _InternPeriod: null }).subscribe((response) => {
      this.DepartmentsList = response['d'] || [];
    });
  }

  getMedicalInterns() {
    this.loaded = false;
    const EmployeeID = this.searchInternsGroup?.controls['EmployeeID']?.value || '';
    const firstName = this.searchInternsGroup?.controls['FirstName']?.value || '';
    const lastName = this.searchInternsGroup?.controls['LastName']?.value || '';
    const phoneNumber = this.searchInternsGroup?.controls['PhoneNumber']?.value || '';
    const department = this.searchInternsGroup?.controls['Department']?.value || '';
    const onValue = this.searchInternsGroup?.controls['On']?.value || '';
    this.http
      .post(this.url + 'GetMedicalInterns', {
        _employeeID: EmployeeID,
        _firstName: firstName,
        _lastName: lastName,
        _phoneNumber: phoneNumber,
        _department: department,
        _on: onValue,
      })
      .subscribe(
        (response) => {
          this.loaded = true;
          const data = response['d'] || [];

          this.TABLE_DATA = data;
          this.dataSource = new MatTableDataSource<any>(data);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;

          this.calculateStats(data);
        },
        () => {
          this.loaded = true;
          this.dataSource = new MatTableDataSource<any>([]);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        }
      );
  }

  private calculateStats(data: any[]): void {
    const total = data.length;
    const withEmail = data.filter(x => !!x.Email).length;
    const withPhone = data.filter(x => !!x.CellNumber).length;
    const uniqueDepartments = new Set(
      data.map(x => x.DepartnentDescripton).filter(x => !!x)
    ).size;

    this.stats = {
      total,
      withEmail,
      withPhone,
      uniqueDepartments
    };
  }

  resetSearch(): void {
    this.searchInternsGroup.reset({
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      PhoneNumber: '',
      Department: '',
      On: ''
    });

    this.getMedicalInterns();
  }

  clearSearchFields(): void {
    this.searchInternsGroup.reset({
      EmployeeID: '',
      FirstName: '',
      LastName: '',
      PhoneNumber: '',
      Department: '',
      On: ''
    });
  }

  clearTableFilter(input: HTMLInputElement): void {
    input.value = '';
    this.dataSource.filter = '';
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  addUpdateIntern(intern: any) {
    const dialogRef = this.dialog.open(MedicalInternAddUpdateComponent, {
      disableClose: true,
      width: '680px',
      maxWidth: '95vw',
    });
    dialogRef.componentInstance.intern = intern ? { ...intern } : { ...this.emptyIntern };
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 1) this.getMedicalInterns();
    });
  }

  navigateToDepartments(intern: any, event: Event) {
    event.stopPropagation();
    if (intern?.EmployeeID) {
      this.router.navigate(['/intern-departments-manage', intern.EmployeeID]);
    }
  }

  navigateToSms() {
    this.router.navigate(['/medical-interns-sms']);
  }

  exportToExcel(): void {
    if (!this.TABLE_DATA || this.TABLE_DATA.length === 0) return;

    const exportData = this.TABLE_DATA.map(x => ({
      תז: x.EmployeeID,
      שם_פרטי: x.FirstName,
      שם_משפחה: x.LastName,
      // מחלקה: x.DepartnentDescripton,
      טלפון: x.CellNumber,
      מייל: x.Email
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'סטאגרים': worksheet },
      SheetNames: ['סטאגרים']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'Medical_Interns.xlsx');
  }

}
