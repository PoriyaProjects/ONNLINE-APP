import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';

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

  displayedColumns: string[] = ['CaseNumber', 'IDNumber', 'FirstName', 'LastName', 'FatherName', 'Age', 'DepartName', 'RoomNumber', 'HospitalizationDate', 'HospitalizationDuration', 'FoodType', 'FoodTexture', 'CurrentAllergy', 'OldAllergy'];

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
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private _datePipe: DatePipe,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.getNutritionsPatietnsList();
  }

  async getNutritionsPatietnsList() {
    this.http
      .post(environment.url + "GetNutritionsPatietnsList", {
      })
      .subscribe((Response) => {
        this.nutritionHosData = Response["d"].filter(x => x.UnitType == 'h');
        this.nutritionCliData = Response["d"].filter(x => x.UnitType == 'v');
        this.dataSourceHos = new MatTableDataSource(Response["d"].filter(x => x.UnitType == 'h'));
        this.dataSourceCli = new MatTableDataSource(Response["d"].filter(x => x.UnitType == 'v'));
        // enter the departments to seperate array
        this.dataSourceHos.filteredData.forEach(element => {
          this.departmentsData.push(element.DepartName);
        });
        this.dataSourceCli.filteredData.forEach(element => {
          this.clinicsData.push(element.DepartName);
        });
        this.dataSourceHos.paginator = this.paginator;
        this.dataSourceHos.sort = this.sort;
        // distinct the duplicates from departments array
        this.departmentsData = Array.from(this.departmentsData.reduce((m, t) => m.set(t, t), new Map()).values());
      });
  }

  // export the table to excel file
  exportToExcel() {

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
