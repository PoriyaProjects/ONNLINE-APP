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



export interface InjuryMonitor {

  PM_CASE_NUMBER: string;
  PM_FIRST_NAME: string;
  PM_LAST_NAME: string;
  PM_PATIENT_ID: string;
  PM_FATHER_NAME: string;
  Age: string;
  ER_Start_Date: string;
  ER_Start_Time: string;
  ER_End_Date: string;
  ER_End_Time: string;
  First_Departmint_Start_Date: string;
  First_Departmint_Strat_Time: string;
  First_Departmint_End_Date: string;
  First_Departmint_End_Time: string;
  DATES_IN_DEPART: string;
  DEPART: string;
  Diagnosis: string;
  ReceiveCauseDes: string;
  PatientComplaint: string;
  ArrivingWith: string;
  OrgHandle: string;
  Doctors: string;

}



@Component({
  selector: 'app-injury-report',
  templateUrl: './injury-report.component.html',
  styleUrls: ['./injury-report.component.css'],
})

export class InjuryReportComponent implements OnInit {

  isLoading = false;
  IsInjury = false;
  selectedPeriodType: string = ''; // Stores the selected period type
  selectedQuarter: string = ''; // Stores the selected quarter
  quarters: any[] = []; // Stores the quarter options
  onesCount = { numerator: 0, denominator: 0 };
  percentage = 0;
  selectedColor: string = '';

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
    { value: 'Injury', label: 'Injury' }
  ];

  selectedValue: string = ''; // Initially empty or you can set a default value

  updateSelectedValue(value: string): void {
    this.selectedValue = value;
  }

  dataSource = new MatTableDataSource<InjuryMonitor[]>();

  // dataSourceDialysisss = new MatTableDataSource<>();

  displayedColumnsInjury: string[] = [
    'PM_CASE_NUMBER',
    'PM_FIRST_NAME',
    'PM_LAST_NAME',
    'PM_PATIENT_ID',
    'PM_FATHER_NAME',
    'Age',
    'ER_Start_Date',
    'ER_Start_Time',
    'ER_End_Date',
    'ER_End_Time',
    'First_Departmint_Start_Date',
    'First_Departmint_Strat_Time',
    'First_Departmint_End_Date',
    'First_Departmint_End_Time',
    'DATES_IN_DEPART',
    'DEPART',
    'Diagnosis',
    'ReceiveCauseDes',
    'PatienComplaint',
    'ArrivingWith',
    'OrgHandle',
    'Doctors'
  ]

  form: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private datePipe: DatePipe,
  ) {
    this.onPeriodTypeChange();
  }


  countOnes(data) {
    data.forEach(item => {

      if (item.Numerator == '1') {
        this.onesCount.numerator += 1;
      }
      if (item.denominator == '1') {
        // Assuming you also want to count '1's in the denominator
        this.onesCount.denominator += 1;
      }

      if (this.onesCount.denominator > 0) {
        this.percentage = Math.floor((this.onesCount.numerator / this.onesCount.denominator) * 100);;

      } else {
        this.percentage = 0
      }
    });
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
    console.log("init injury");
  }

  fetchInjuryReport(date1: string, date2: string) {
    this.dataSource.data = []
    this.IsInjury = true;
    this.isLoading = true; // Start loading
    console.log("fetchInjuryReport");
    const url = `${environment.url}FetchInjuryReport`;
    let data = {
      DateIn: date1,
      DateOut: date2
    }
    console.log(data.DateIn, data.DateOut);
    this.http.post<InjuryMonitor[]>(url, data).subscribe({
      next: (records: any) => {
        console.log("data", records.d);
        this.dataSource.data = records.d;
        console.log(this.dataSource.data);
        this.isLoading = false; // Stop loading upon success
        this.countOnes(this.dataSource.data)
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

    // if (measureType == 'Dialysis') {
    //   this.Dialysis();
    // }
    if (measureType == 'Injury') {
      this.Injury();
    }
    if (measureType == '') {
      alert("תבחר מדד בבקשה")
    }
  }


  Injury() {
    this.dataSource.data = [];
    let quarterDate = this.form.get('quarterDate').value;
    let fromDate = this.form.get('fromDate').value;
    let toDate = this.form.get('toDate').value;
    let selectedPeriod = this.form.get('selectedPeriod').value;
    let EraChoosen = this.form.get('EraChoosen').value;
    let selectedYear = this.form.get('selectedyear').value; // Ensure this matches your form control name exactly

   

    let dateNow = new Date();

    if((!(toDate instanceof Date) &&  !(fromDate instanceof Date)) || (  (toDate instanceof Date) > (fromDate instanceof Date) ) ) {
      alert("Please enter valid dates");
      console.log("1ssad")
      return;
    }
    if(!(toDate instanceof Date)){
      toDate = this.datePipe.transform(dateNow, 'yyyy-MM-dd');
    }

    if (selectedPeriod == 'blue') {

      if(fromDate){
        const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
        const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
        console.log(formattedFromDate, formattedToDate); // For debugging
        this.fetchInjuryReport(formattedFromDate, formattedToDate);

      }else{
        console.log("1ssad")
        alert("Please enter valid dates");
      }
    
     
     
    }

    if (selectedPeriod == 'red' && EraChoosen) {
      let formattedFromDate, formattedToDate;

      switch (EraChoosen) {
        case '1':
          formattedFromDate = `${selectedYear}-01-01`;
          formattedToDate = `${selectedYear}-03-31`;
          break;
        case '2':
          formattedFromDate = `${selectedYear}-04-01`;
          formattedToDate = `${selectedYear}-06-30`;
          break;
        case '3':
          formattedFromDate = `${selectedYear}-07-01`;
          formattedToDate = `${selectedYear}-09-30`;
          break;
        case '4':
          formattedFromDate = `${selectedYear}-10-01`;
          formattedToDate = `${selectedYear}-12-31`;
          break;
      }

      console.log("From Date: ", formattedFromDate, "To Date: ", formattedToDate); // For debugging
      this.fetchInjuryReport(formattedFromDate, formattedToDate); // Assuming you want to use these dates in your report fetching
    }

  }




  onClear() {
    this.dataSource.data = [];
  }


  exportexcel(): void {



    if (this.IsInjury === true) {
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
      XLSX.writeFile(wb, "Injury.xlsx");
    }



    if (this.IsInjury === false) {

    }

  }

}