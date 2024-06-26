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
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      measureType: ['Cath'],
      EraChoosen: [''],
      selectedyear: [currentYear.toString()],
      formControlName: [''],
      MedicalDepartment: [''],
      selectedPeriod: [null], // Initialize with null or a default value
      fromDate: Date,
      toDate: Date,
      quarterDate: Date
    });
    console.log("init Cath");
  }

  fetchCathReport(date1: string, date2: string) {
    let selectedDepart = this.form.get('MedicalDepartment').value;
    console.log("selectedDepart" , selectedDepart);

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
        let fetchedData = records.d;

        if (selectedDepart) {
          console.log("inside");
          console.log("Selected Department:", selectedDepart);
          fetchedData = fetchedData.filter(record => {
            console.log("Record MedicalDepartment:", record.MedicalDepartment);
            return record.MedicalDepartment.includes(selectedDepart);
          });
        }
  
        this.dataSource.data = fetchedData;
        console.log(this.dataSource.data);


       // this.dataSource.data = records.d;
       // console.log(this.dataSource.data);
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
        this.Cath();
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

    if((!(toDate instanceof Date) &&  !(fromDate instanceof Date)) || (  (toDate instanceof Date) > (fromDate instanceof Date) ) ) {
      alert("Please enter valid dates");
      console.log("1ssad")
      return;
    }
    if(!(toDate instanceof Date)){
      console.log("yeo")
      toDate = this.datePipe.transform(dateNow, 'yyyy-MM-dd');
    }



      if(fromDate){
        const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
        const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
        console.log(formattedFromDate, formattedToDate); // For debugging
        this.fetchCathReport(formattedFromDate, formattedToDate);

      }else{
        console.log("1ssad")
        alert("Please enter valid dates");
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
