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
import { MatSelectModule } from '@angular/material/select';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { MatDatepicker } from '@angular/material/datepicker';
import * as XLSX from 'xlsx';
import { cssNumber } from 'jquery';



export interface CathMonitor {
  CaseNumber: string;
  FirstName: string;
  LastName: string;
  IdNumber: string;
  DischargeDateFromMedicalCenter: string;
  DischargeDateFromHospitalizationDepartment: string;
  AdmissionDateToRelevantDepartment: string;
  ReleaseDateFromRelevantDepartment: string;
  CatheterEntryDate: string;
  CatheterEntryTime: string;
  CatheterExitDate: string;
  CatheterExitTime: string;
  CatheterDays: string;
  MedicalDepartment: string;
  NursingDepartment: string;

}




@Component({
  selector: 'app-cath-report',
  templateUrl: './cath-report.component.html',
  styleUrls: ['./cath-report.component.css']
})
export class CathReportComponent implements OnInit {

  isLoading = false;
  IsCath = false;
  selectedPeriodType: string = ''; // Stores the selected period type
  selectedQuarter: string = ''; // Stores the selected quarter
  quarters: any[] = []; // Stores the quarter options
  onesCount = { numerator: 0, denominator: 0 };
  percentage = 0;
  selectedColor: string = '';



  months: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  selectedMonth: string = '';
  showDropdown: boolean = false;

  selectMonth(month: string) {
    this.selectedMonth = month;
    this.showDropdown = false; // Hide dropdown after selecting a month
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }


  onPeriodTypeChange(): void {
    if (this.selectedPeriodType === 'quarterly') {
      // Assuming you want to list quarters for the current and next year
      const currentYear = new Date().getFullYear();
      this.quarters = [
        { label: `${currentYear}/Q1`, value: `${currentYear}-01` },
        { label: `${currentYear}/Q2`, value: `${currentYear}-04` },
        { label: `${currentYear}/Q3`, value: `${currentYear}-07` },
        { label: `${currentYear}/Q4`, value: `${currentYear}-10` },
        { label: `${currentYear + 1}/Q1`, value: `${currentYear + 1}-01` },
        // Add more as needed
      ];
    } else {
      this.quarters = []; // Clear or adjust the dropdown for other period types
    }
  }


  options = [
    { value: 'Cath', label: 'Cath' }
  ];
  selectedValue: string = ''; // Initially empty or you can set a default value

  updateSelectedValue(value: string): void {
    this.selectedValue = value;
  }


  dataSource = new MatTableDataSource<CathMonitor[]>();


  displayedColumnsCath: string[] = [
    'CaseNumber',
    'FirstName',
    'LastName',
    'IdNumber',
    'DischargeDateFromMedicalCenter',
    'DischargeDateFromHospitalizationDepartment',
    'AdmissionDateToRelevantDepartment',
    'ReleaseDateFromRelevantDepartment',
    'CatheterEntryDate',
    'CatheterEntryTime',
    'CatheterExitDate',
    'CatheterExitTime',
    'CatheterDays',
    'MedicalDepartment',
    'NursingDepartment'
  ]

  form: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private datePipe: DatePipe,
  ) {
    this.onPeriodTypeChange();
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      measureType: [''],
      EraChoosen: [''],
      selectedyear: [''],
      formControlName: [''],
      selectedPeriod: [null], // Initialize with null or a default value
      fromDate: Date,
      toDate: Date,
      quarterDate: Date
    });
    console.log("init Cath");
  }

  fetchCathReport(date1: string, date2: string) {
    this.dataSource.data = []
    this.IsCath = true;
    this.isLoading = true; // Start loading
    console.log("fetchCathReport");
    const url = `${environment.url}FetchCathReport`;
    let data = {
      DateIn: date1,
      DateOut: date2
    }
    console.log(data.DateIn, data.DateOut);
    this.http.post<CathMonitor[]>(url, data).subscribe({
      next: (records: any) => {
        console.log("data", records.d);
        this.dataSource.data = records.d;
        console.log(this.dataSource.data);
        this.isLoading = false; // Stop loading upon success
      },
      error: (error) => {
        console.error('Error fetching patient records:', error);
        this.isLoading = false; // Stop loading upon error
      }
    });
  }



  onSearch() {
    const measureType = this.form.get('measureType').value; // Accessing the measureType value
    console.log('Selected measure type:', measureType); // Log the selected measure type
    const selectedyear = this.form.get('selectedyear').value; // Accessing the measureType value

    if (measureType == 'Cath') {
      if (selectedyear == '') {
        alert("תבחר שנה בבקשה")
      }else{

        this.Cath();
      }
    }
    if (measureType == '') {
      alert("תבחר מדד בבקשה")
    }
  }


  Cath() {

    console.log("inside cath function");



    this.dataSource.data = [];
    let quarterDate = this.form.get('quarterDate').value;
    let fromDate = this.form.get('fromDate').value;
    let toDate = this.form.get('toDate').value;
    let selectedPeriod = this.form.get('selectedPeriod').value;
    let EraChoosen = this.form.get('EraChoosen').value;
    let selectedYear = this.form.get('selectedyear').value; // Ensure this matches your form control name exactly



    let dateNow = new Date();

    if (selectedPeriod == 'red' && EraChoosen) {

      let formattedFromDate, formattedToDate;

      switch (EraChoosen) {
        case '1':
          formattedFromDate = `${selectedYear}-01-01`;
          formattedToDate = `${selectedYear}-01-31`;
          break;
        case '2':
          formattedFromDate = `${selectedYear}-02-01`;
          formattedToDate = `${selectedYear}-02-28`; // Assuming February has 28 days
          break;
        case '3':
          formattedFromDate = `${selectedYear}-03-01`;
          formattedToDate = `${selectedYear}-03-31`;
          break;
        case '4':
          formattedFromDate = `${selectedYear}-04-01`;
          formattedToDate = `${selectedYear}-04-30`;
          break;
        case '5':
          formattedFromDate = `${selectedYear}-05-01`;
          formattedToDate = `${selectedYear}-05-31`;
          break;
        case '6':
          formattedFromDate = `${selectedYear}-06-01`;
          formattedToDate = `${selectedYear}-06-30`;
          break;
        case '7':
          formattedFromDate = `${selectedYear}-07-01`;
          formattedToDate = `${selectedYear}-07-31`;
          break;
        case '8':
          formattedFromDate = `${selectedYear}-08-01`;
          formattedToDate = `${selectedYear}-08-31`;
          break;
        case '9':
          formattedFromDate = `${selectedYear}-09-01`;
          formattedToDate = `${selectedYear}-09-30`;
          break;
        case '10':
          formattedFromDate = `${selectedYear}-10-01`;
          formattedToDate = `${selectedYear}-10-31`;
          break;
        case '11':
          formattedFromDate = `${selectedYear}-11-01`;
          formattedToDate = `${selectedYear}-11-30`;
          break;
        case '12':
          formattedFromDate = `${selectedYear}-12-01`;
          formattedToDate = `${selectedYear}-12-31`;
          break;
      }

      console.log("From Date: ", formattedFromDate, "To Date: ", formattedToDate); // For debugging
      this.fetchCathReport(formattedFromDate, formattedToDate); // Assuming you want to use these dates in your report fetching
    }

  }



  onClear() {
    this.dataSource.data = [];
  }




  exportexcel(): void {



    if (this.IsCath === true) {
      if (!this.dataSource || !this.dataSource.filteredData || this.dataSource.filteredData.length === 0) {
        alert('The data is empty!');
        return;
      }

      const dataToExport = this.dataSource.filteredData.map(item => {
        const itemCopy = { ...item };
        delete itemCopy['__type'];
        return itemCopy;
      });

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, "Cath.xlsx");
    }



    if (this.IsCath === false) {

    }

  }

}
