import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Form, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-nutrition-system',
  templateUrl: './nutrition-system.component.html',
  styleUrls: ['./nutrition-system.component.css']
})
export class NutritionSystemComponent implements OnInit {


  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  nutritionHosData = [];
  nutritionCliData = [];
  departmentsData = [];
  clinicsData = [];
  dataSourceHos = new MatTableDataSource(this.nutritionHosData);
  dataSourceCli = new MatTableDataSource(this.nutritionCliData);
  searchGroup: FormGroup;
  departmentsFormControl = new FormControl([]);
  clinicsFormControl = new FormControl([]);
  numberOfDepartments: number;
  numberOfClinics: number;

  displayedColumns: string[] = ['CaseNumber', 'IDNumber', 'FirstName', 'LastName', 'FatherName', 'Age', 'DepartName'
    , 'RoomNumber', 'HospitalizationDate', 'HospitalizationDuration', 'FoodType', 'FoodTexture', 'CurrentAllergy'
    , 'OldAllergy', 'LiquidCertification', 'NutritionAnamnezes', 'EatingNotes'];

  applyFilter(event) {
    let filterValue;
    if (event == undefined) {
      filterValue = "";
    } else if (event.isTrusted == undefined) {
      filterValue = event;
    } else {
      filterValue = (event.target as HTMLInputElement).value;
    }
    this.dataSourceHos.filter = filterValue.trim().toLowerCase();
  }

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.searchGroup = this.fb.group({
      Departments: new FormControl([], null),
      Clinics: new FormControl([], null)
    });
    this.getNutritionsPatietnsList([]);
  }

  searchPatients() {
    let searchString = [...this.searchGroup.controls['Departments'].value, ...this.searchGroup.controls['Clinics'].value];
    this.getNutritionsPatietnsList(searchString);
  }

  selectAllDepartments() {
    if (this.departmentsFormControl.value.length === this.numberOfDepartments) {
      this.searchGroup.controls['Departments'].setValue([]);
      this.departmentsFormControl.setValue([]);
    } else {
      this.searchGroup.controls['Departments'].setValue(this.departmentsData);
      this.departmentsFormControl.setValue(this.departmentsData);
    }
  }

  selectAllClinics() {
    if (this.clinicsFormControl.value.length === this.numberOfClinics) {
      this.searchGroup.controls['Clinics'].setValue([]);
      this.clinicsFormControl.setValue([]);
    } else {
      this.searchGroup.controls['Clinics'].setValue(this.clinicsData);
      this.clinicsFormControl.setValue(this.clinicsData);
    }
  }

  deselectAllDepartments() {
    this.departmentsFormControl.setValue([]);
  }

  deselectAllClinics() {
    this.clinicsFormControl.setValue([]);
  }

  // onDepartmentChange(event: MatSelectionListChange) {
  //   if (event.option[0].selected) {
  //     this.departmentsFormControl.setValue(this.departmentsData);
  //   } else {
  //     this.departmentsFormControl.setValue(event.source.selectedOptions.filter(option => option.value));
  //   }
  // }

  async getNutritionsPatietnsList(searchDepts) {
    this.http
      .post(environment.url + "GetNutritionsPatietnsList", {
        _searchArr: searchDepts
      })
      .subscribe((Response) => {
        this.nutritionHosData = Response["d"].filter(x => x.UnitType == 'h');
        this.nutritionCliData = Response["d"].filter(x => x.UnitType == 'v');
        this.dataSourceHos = new MatTableDataSource([...this.nutritionHosData, ...this.nutritionCliData]);
        // enter the departments to seperate array
        this.nutritionHosData.forEach(element => {
          this.departmentsData.push(element.DepartName);
        });
        this.nutritionCliData.forEach(element => {
          this.clinicsData.push(element.DepartName);
        });
        this.dataSourceHos.paginator = this.paginator;
        this.dataSourceHos.sort = this.sort;
        // distinct the duplicates from departments array
        this.departmentsData = Array.from(this.departmentsData.reduce((m, t) => m.set(t, t), new Map()).values());
        this.clinicsData = Array.from(this.clinicsData.reduce((m, t) => m.set(t, t), new Map()).values());
        this.numberOfDepartments = this.departmentsData.length;
        this.numberOfClinics = this.clinicsData.length;
      });
  }

  fileName = 'Nutrition_Patients.xlsx';
  // export the table to excel file
  exportToExcel() {
    /* table id is passed over here */
    let element = document.getElementById('excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, this.fileName);
  }

  // filter the table where is not null or empty by the type recieved
  async filterTypes(event) {
    /*
    1 - סוג כלכלה
    2 - סוג מרקם
    3 - רגישויות אשפוז נוכחי
    4 - רגישויות בעבר
    */
    if (event == 1) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.FoodType !== '');
    if (event == 2) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.FoodTexture !== '');
    if (event == 3) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.CurrentAllergy !== '');
    if (event == 4) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.OldAllergy !== '');
  }

  resetData() {
    this.dataSourceHos.data = this.nutritionHosData;
  }

}
