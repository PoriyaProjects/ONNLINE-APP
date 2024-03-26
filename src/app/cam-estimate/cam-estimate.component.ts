import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Chart } from 'chart.js';
import { MatTableDataSource } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debugPort } from 'process';
import * as XLSX from 'xlsx';

export interface PatientRecord {

  Grade: string;
  Admission_No: string;
  Name: string;
  Entry_Date: string;
  First_Name: string;
  Last_Name: string;
  Id_Num: string;
  Age: string;
}



@Component({
  selector: 'app-cam-estimate',
  templateUrl: './cam-estimate.component.html',
  styleUrls: ['./cam-estimate.component.css'],
})

export class CAMEstimateComponent implements OnInit {

  TABLE_DATAExcel: any[] = [];
  dataSource = new MatTableDataSource<PatientRecord[]>();
  dataSourceExcel = new MatTableDataSource(this.TABLE_DATAExcel);
  managerType: string = "";
  displayedColumns: string[] = [
    'Grade',
    'Admission_No',
    'Name',
    'Entry_Date',
    'First_Name',
    'Last_Name',
    'Id_Num',
    'Age',
  ]
  form: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private datePipe: DatePipe,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      fromDate: Date,
      toDate: Date
    });

    console.log("caminit");

  }

  fetchPatientRecords(date1: string, date2: string) {
    console.log("cam");
    const url = `${environment.url}FetchPatientRecords`;
    let data = {
      DateIn: date1,
      DateOut: date2
    }
    console.log(data.DateIn, data.DateOut);
    this.http.post<PatientRecord[]>(url, data).subscribe({
      next: (records: any) => {
        console.log("data", records.d);
        this.dataSource.data = records.d;
        console.log(this.dataSource.data);
      },
      error: (error) => console.error('Error fetching patient records:', error)
    });
  }

  onSearch() {
    const fromDate = this.form.get('fromDate').value;
    const toDate = this.form.get('toDate').value;

    if (fromDate && toDate) {
      const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
      const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
      console.log(formattedFromDate, formattedToDate); // For debugging
      this.fetchPatientRecords(formattedFromDate, formattedToDate);
    }
  }

  onClear() {
    this.dataSource.data = [];
  }



  fileName = 'cam-etsimate.xlsx';
  exportexcel(): void {
    console.log("data:" , this.dataSource.filteredData);
    console.log("exportexcel");
    /* table id is passed over here */
    let element = document.getElementById('excel-table');
    console.log("element" , element);
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, this.fileName);

  }

}