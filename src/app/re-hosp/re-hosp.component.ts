import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-re-hosp',
  templateUrl: './re-hosp.component.html',
  styleUrls: ['./re-hosp.component.css']
})

export class ReHospComponent implements OnInit {

  isLoading = false;
  IsbTirm = false;
  selectedPeriodType: string = ''; // Stores the selected period type
  selectedQuarter: string = ''; // Stores the selected quarter
  quarters: any[] = []; // Stores the quarter options
  numeratorValue: number = 0;
  percentage = 0;
  selectedColor: string = '';
  dialog_data: any;
  months: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  selectedMonth: string = '';
  showDropdown: boolean = false;
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;

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
    { value: '', label: '' }
  ];
  selectedValue: string = ''; // Initially empty or you can set a default value

  updateSelectedValue(value: string): void {
    this.selectedValue = value;
  }

  dataSource = new MatTableDataSource<any>();
  displayedColumnReHosp: string[] = [
    'CaseNumber',
    'FirstName',
    'LastName',
    'ID',
    'ReleaseDepartment',
    'release_text',
    'PM_LAST_ESHPOZE_DATE',
    'HospDepartment',
    'PM_MOVE_DATE',
    'admission_text'
  ]
  form: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    public dialog: MatDialog,
    private datePipe: DatePipe,
  ) {
    this.onPeriodTypeChange();
  }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      measureType: ['ReHosp'],
      EraChoosen: [''],
      selectedyear: [currentYear.toString()],
      formControlName: [''],
      MedicalDepartment: [''],
      DEVO: [''],
      Reporting: [''],
      selectedPeriod: [null], // Initialize with null or a default value
      fromDate: Date,
      toDate: Date,
      quarterDate: Date
    });
  }

  handleDialog(row) {
    this.dialog_data = row;
    this.dialog.open(this.modalContent, {
      width: '60%',
      disableClose: false
    });
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  fetchReHospReport(date1: string, date2: string): void {
    this.dataSource.data = [];
    this.IsbTirm = true;
    this.isLoading = true; // Start loading

    const url = `${environment.url}FetchReHospReport`;
    let data = {
      DateIn: date1,
      DateOut: date2
    };

    this.http.post(url, data).subscribe({
      next: (records: any) => {
        this.dataSource = new MatTableDataSource<any>(records['d']);
        // Custom filter for the "name" field
        this.dataSource.filterPredicate = (data, filter: string): boolean => {
          return data.HospDepartment.toLowerCase().includes(filter);
        };
        // Calculate the numerator value
        if (this.dataSource.filteredData.length > 0) {
          this.numeratorValue = parseInt(this.dataSource.filteredData[0].Numerator, 10);
        } else {
          this.numeratorValue = 0; // Or handle it as needed
        }
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
    const selectedyear = this.form.get('selectedyear').value; // Accessing the measureType value
    this.ReHosp();
  }

  ReHosp() {
    this.dataSource.data = [];
    let quarterDate = this.form.get('quarterDate').value;
    let fromDate = this.form.get('fromDate').value;
    let toDate = this.form.get('toDate').value;
    let selectedPeriod = this.form.get('selectedPeriod').value;
    let EraChoosen = this.form.get('EraChoosen').value;
    let selectedYear = this.form.get('selectedyear').value; // Ensure this matches your form control name exactly
    let dateNow = new Date();

    if ((!(toDate instanceof Date) && !(fromDate instanceof Date)) || ((toDate instanceof Date) > (fromDate instanceof Date))) {
      alert("Please enter valid dates");
      return;
    }
    if (!(toDate instanceof Date)) {
      toDate = this.datePipe.transform(dateNow, 'yyyy-MM-dd');
    }
    if (fromDate) {
      const formattedFromDate = this.datePipe.transform(fromDate, 'yyyy-MM-dd');
      const formattedToDate = this.datePipe.transform(toDate, 'yyyy-MM-dd');
      this.fetchReHospReport(formattedFromDate, formattedToDate);
    } else {
      alert("Please enter valid dates");
    }
  }
  saveNote(note_text, row_id) {
    this.http.post(environment.url + "SaveReHospNote", {
      _id: row_id,
      _note: note_text
    }).subscribe(res => {
      if (!res['d']) {
        alert("תקלה בשמירה.");
      }
    });
  }
  onClear() {
    this.dataSource.data = [];
  }

  exportexcel(): void {
    if (this.IsbTirm === true) {
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
      XLSX.writeFile(wb, "ReHosp.xlsx");
    }
    if (this.IsbTirm === false) {
    }
  }
}
