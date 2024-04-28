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



export interface PciMonitor {

  Measurment_ID: string;
  Hospital_ID: string;
  Patient_ID: string;
  Patientbikoret_ID: string;
  ID_Types: string;
  Case_Number: string;
  OtherHosp: string;
  Hosp_Date: string;
  Hosp_Time: string;
  Discharge_Date: string;
  Death_Date: string;
  Death_Time: string;
  Date_Of_Birth: string;
  Gender: string;
  Adress_Street: string;
  Adress_House: string;
  Adress_CityName: string;
  CityCode: string;
  SES: string;
  Insurance_Provider: string;
  CatheterStart_Date: string;
  CatheterStart_Time: string;
  CatheterEnd_Date: string;
  CatheterEnd_Time: string;
  Diagnosis_ICD: string;
  Procedure_ICD: string;
  Procedure_ICD_Local: string;
  Trombolitic_Therapy: string;
  Remarks: string;
  Numerator: string;
  denominator: string;

}

export interface DialysisReport {
  Measurment_ID: string;
  Hospital_ID: string;
  Department_ID: string;
  Institute_ID: string;
  Institute_Name: string;
  Patient_ID: string;
  Patientbikoret_ID: string;
  ID_Types: string;
  Birth_Year: string;
  Gender: string;
  Adress_Street: string;
  Adress_House: string;
  Adress_CityName: string;
  CityCode: string;
  SES: string;
  Insurance_Provider: string;
  Death_Date: string;
  Diagnosis_ICD: string;
  Procedure_ICD: string;
  Diagnosis_ICD_Diabetes: string;
  Case_Number1: string;
  Dialysis_Report1_Date: string;
  Dialysis1_Date: string;
  URR_KtV_Type1: string;
  Test_Type1: string;
  URR_KtV_Value1: string;
  Weight_Value: string;
  Dialysis_Start_Time1: string;
  Dialysis_End_Time1: string;
  Dialysis_Number1: string;
  Dialysis_Hour1: string;
  Dialysis_Test1: string;
  Case_Number2: string;
  Dialysis_Report2_Date: string;
  Dialysis2_Date: string;
  URR_KtV_Type2: string;
  Test_Type2: string;
  URR_KtV_Value2: string;
  Dialysis_Start_Time2: string;
  Dialysis_End_Time2: string;
  Dialysis_Number2: string;
  Dialysis_Hour2: string;
  Dialysis_Test2: string;
  Case_Number3: string;
  Dialysis_Report3_Date: string;
  Dialysis3_Date: string;
  URR_KtV_Type3: string;
  Test_Type3: string;
  URR_KtV_Value3: string;
  Dialysis_Start_Time3: string;
  Dialysis_End_Time3: string;
  Dialysis_Number3: string;
  Dialysis_Hour3: string;
  Dialysis_Test3: string;
  Dialysis_Refuse: string;
  DialysisEnd_Date: string;
  Remarks: string;
  Numerator: string;
  denominator: string;

}


@Component({
  selector: 'app-dialysis-report',
  templateUrl: './dialysis-report.component.html',
  styleUrls: ['./dialysis-report.component.css'],
})

export class DialysisReportComponent implements OnInit {

  isLoading = false;
  IsPci = false;
  selectedPeriodType: string = ''; // Stores the selected period type
  selectedQuarter: string = ''; // Stores the selected quarter
  quarters: any[] = []; // Stores the quarter options
  onesCount = { numerator: 0, denominator: 0 };
  percentage = 0;


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


  selectedColor: string = '';


  options = [
    { value: 'Dialysis', label: 'Dialysis' },
    { value: 'PCI', label: 'PCI' }
  ];

  selectedValue: string = ''; // Initially empty or you can set a default value

  updateSelectedValue(value: string): void {
    this.selectedValue = value;
  }



  dataSource = new MatTableDataSource<PciMonitor[]>();

  dataSourceDialysis = new MatTableDataSource<DialysisReport[]>();

  displayedColumnsPci: string[] = [
    'Measurment_ID',
    'Hospital_ID',
    'Patient_ID',
    'Patientbikoret_ID',
    'ID_Types',
    'Case_Number',
    'OtherHosp',
    'Hosp_Date',
    'Hosp_Time',
    'Discharge_Date',
    'Death_Date',
    'Death_Time',
    'Date_Of_Birth',
    'Gender',
    'Adress_Street',
    'Adress_House',
    'Adress_CityName',
    'CityCode',
    'SES',
    'Insurance_Provider',
    'CatheterStart_Date',
    'CatheterStart_Time',
    'CatheterEnd_Date',
    'CatheterEnd_Time',
    'Diagnosis_ICD',
    'Procedure_ICD',
    'Procedure_ICD_Local',
    'Trombolitic_Therapy',
    'Remarks',
    'Numerator',
    'denominator'
  ]

  displayedColumnsDialysis: string[] = [
    'Measurment_ID',
    'Hospital_ID',
    'Department_ID',
    'Institute_ID',
    'Institute_Name',
    'Patient_ID',
    'Patientbikoret_ID',
    'ID_Types',
    'Birth_Year',
    'Gender',
    'Adress_Street',
    'Adress_House',
    'Adress_CityName',
    'CityCode',
    'SES',
    'Insurance_Provider',
    'Death_Date',
    'Diagnosis_ICD',
    'Procedure_ICD',
    'Diagnosis_ICD_Diabetes',
    'Case_Number1',
    'Dialysis_Report1_Date',
    'Dialysis1_Date',
    'URR_KtV_Type1',
    'Test_Type1',
    'URR_KtV_Value1',
    'Weight_Value',
    'Dialysis_Start_Time1',
    'Dialysis_End_Time1',
    'Dialysis_Number1',
    'Dialysis_Hour1',
    'Dialysis_Test1',
    'Case_Number2',
    'Dialysis_Report2_Date',
    'Dialysis2_Date',
    'URR_KtV_Type2',
    'Test_Type2',
    'URR_KtV_Value2',
    'Dialysis_Start_Time2',
    'Dialysis_End_Time2',
    'Dialysis_Number2',
    'Dialysis_Hour2',
    'Dialysis_Test2',
    'Case_Number3',
    'Dialysis_Report3_Date',
    'Dialysis3_Date',
    'URR_KtV_Type3',
    'Test_Type3',
    'URR_KtV_Value3',
    'Dialysis_Start_Time3',
    'Dialysis_End_Time3',
    'Dialysis_Number3',
    'Dialysis_Hour3',
    'Dialysis_Test3',
    'Dialysis_Refuse',
    'DialysisEnd_Date',
    'Remarks',
    'Numerator',
    'denominator'
  ]

  form: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private datePipe: DatePipe,
  ) {
    this.onPeriodTypeChange();
  }


  prepareDataForExcelExport(dataSource: any[]) {
   
    let modifiedData = JSON.parse(JSON.stringify(dataSource));
    modifiedData.forEach(row => {
      if (row['Hospital_ID']) {
       
        row['Hospital_ID'] = `${row['Hospital_ID']}`;
      }
    });
  
    return modifiedData;
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
        this.percentage = Math.floor((this.onesCount.denominator / this.onesCount.numerator) * 100);

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
    console.log("init");
  }

  fetchPciReport(date1: string, date2: string) {
    this.dataSource.data = [];
    this.dataSourceDialysis.data = [];
    this.IsPci = true;
    this.isLoading = true; // Start loading
    console.log("fetchPciReport");
    const url = `${environment.url}FetchPciReport`;
    let data = {
      DateIn: date1,
      DateOut: date2
    }
    console.log(data.DateIn, data.DateOut);
    this.http.post<PciMonitor[]>(url, data).subscribe({
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


  fetchDialysisReport(date1: string, date2: string) {
    this.dataSource.data = [];
    this.dataSourceDialysis.data = [];
    this.isLoading = true;
    console.log("fetchDialysisReport");
    const url = `${environment.url}FetchDialysisReport`;
    let data = {
      DateIn: date1,
      DateOut: date2
    }
    this.http.post<DialysisReport[]>(url, data).subscribe({
      next: (records: any) => {
        console.log("dataSourceDialysis", records.d);
        this.dataSourceDialysis.data = records.d;
        console.log(this.dataSourceDialysis.data);
        this.isLoading = false;
        this.countOnes(this.dataSourceDialysis.data)
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

    if (measureType == 'Dialysis') {
      this.Dialysis();
    }
    if (measureType == 'Pci') {
      this.Pci();
    }
    if (measureType == '') {
      alert("תבחר מדד בבקשה")
    }
  }


  Pci() {
    const quarterDate = this.form.get('quarterDate').value;
    const fromDate = this.form.get('fromDate').value;
    const toDate = this.form.get('toDate').value;
    const selectedPeriod = this.form.get('selectedPeriod').value;
    const EraChoosen = this.form.get('EraChoosen').value;
    const selectedYear = this.form.get('selectedyear').value; // Ensure this matches your form control name exactly

    if (selectedPeriod == 'blue') {

      if (fromDate && toDate) { // Check if fromDate and toDate are not 'Empty'
        const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
        const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
        console.log(formattedFromDate, formattedToDate); // For debugging
        this.fetchPciReport(formattedFromDate, formattedToDate);
      } else {
        console.log('Please ensure all form fields are filled out correctly.');
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
      this.fetchPciReport(formattedFromDate, formattedToDate); // Assuming you want to use these dates in your report fetching
    }

  }




  Dialysis() {
    const formControlName = this.form.get('formControlName').value;
    const quarterDate = this.form.get('quarterDate').value;
    const fromDate = this.form.get('fromDate').value;
    const toDate = this.form.get('toDate').value;
    const selectedPeriod = this.form.get('selectedPeriod').value;
    const EraChoosen = this.form.get('EraChoosen').value;
    const selectedYear = this.form.get('selectedyear').value; // Ensure this matches your form control name exactly



    if (selectedPeriod == 'blue') {
      if (fromDate && toDate) { // Check if measureType is not 'Empty'
        const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
        const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
        console.log(formattedFromDate, formattedToDate); // For debugging
        this.fetchDialysisReport(formattedFromDate, formattedToDate); // Assuming you want to use the measureType in your report fetching
      } else {
        console.log('Please ensure all form fields are filled out correctly.');
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
      this.fetchDialysisReport(formattedFromDate, formattedToDate); // Assuming you want to use these dates in your report fetching
    }

  }




  onClear() {
    this.dataSource.data = [];
    this.dataSourceDialysis.data = [];
  }


  exportexcel(): void {



    if (this.IsPci === true) {
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
      XLSX.writeFile(wb, "Pci.xlsx");
    }

  

  if (this.IsPci === false) {
    if (!this.dataSourceDialysis || !this.dataSourceDialysis.filteredData || this.dataSourceDialysis.filteredData.length === 0) {
      alert('The data is empty!');
      return;
    }

    const dataToExport = this.dataSourceDialysis.filteredData.map(item => {
      const itemCopy = { ...item };
      delete itemCopy['__type'];
      return itemCopy;
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, "Dialysis.xlsx");
  }

}

}