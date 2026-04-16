import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/* =======================
   Interfaces
======================= */
interface NutritionPatient {
  CaseNumber: string;
  IDNumber: string;
  FirstName: string;
  LastName: string;
  FatherName: string;
  Age: number;
  DepartName: string;
  UnitType: 'h';
  FoodType?: string;
  FoodTexture?: string;
  CurrentAllergy?: string;
  OldAllergy?: string;
  Liquid_Type?: string;
  Food_Orders?: string;
}

/* =======================
   Component
======================= */
@Component({
  selector: 'app-departmental-texture-report',
  templateUrl: './departmental-texture-report.component.html',
  styleUrls: ['./departmental-texture-report.component.css']
})
export class DepartmentalTextureReportComponent implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  /* Data */
  private allData: NutritionPatient[] = [];
  hospitalData: NutritionPatient[] = [];

  dataSource = new MatTableDataSource<NutritionPatient>();

  /* Filters */
  searchForm!: FormGroup;
  departmentsCtrl = new FormControl([]);

  departments: string[] = [];

  displayedColumns: string[] = [
    'CaseNumber',
    'IDNumber',
    'LastName',
    'FatherName',
    'CurrentAllergy',
    'FoodType',
    'FoodTexture',
    'Liquid_Type',
    'Food_Orders'
  ];
  creating_pdf = false;


  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  /* =======================
     Lifecycle
  ======================= */
  ngOnInit(): void {
    this.initForm();
    this.loadPatients([]);
  }

  /* =======================
     Initialization
  ======================= */
  private initForm(): void {
    this.searchForm = this.fb.group({
      Departments: [[]],
      ViewMode: ['department']
    });
  }

  /* =======================
     API
  ======================= */
  loadPatients(selectedUnits: string[]): void {
    this.http.post<any>(environment.url + 'GetNutritionsPatietnsList', {
      _searchArr: selectedUnits
    }).subscribe(res => {
      this.allData = res.d || [];
      this.splitUnits();
      this.prepareFilters();
      this.initTable();
    });
  }

  viewModeToggle() {
    if (this.searchForm.value.ViewMode == 'kitchen') {
      this.resetTable();
      this.displayedColumns = [
        'CaseNumber',
        'IDNumber',
        'LastName',
        'FatherName',
        'DepartName',
        'CurrentAllergy',
        'FoodType',
        'FoodTexture',
        'Liquid_Type',
        'Food_Orders'
      ];
    } else {
      this.displayedColumns = [
        'CaseNumber',
        'IDNumber',
        'LastName',
        'FatherName',
        'CurrentAllergy',
        'FoodType',
        'FoodTexture',
        'Liquid_Type',
        'Food_Orders'
      ];
    }

  }

  /* =======================
     Data Handling
  ======================= */
  private splitUnits(): void {
    this.hospitalData = this.allData.filter(x => x.UnitType === 'h');
  }

  private prepareFilters(): void {
    this.departments = [...new Set(this.hospitalData.map(x => x.DepartName))];
  }

  private initTable(): void {
    this.dataSource.data = [...this.hospitalData];
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  get isDepartmentView(): boolean {
    return this.searchForm?.get('ViewMode')?.value === 'department';
  }

  /* =======================
     Search
  ======================= */
  searchPatients(): void {
    const selected = [
      this.searchForm.value.Departments,
    ];
    this.loadPatients(selected);
  }

  toggleAllDepartments(): void {
    const allSelected = this.departmentsCtrl.value?.length === this.departments.length;
    this.departmentsCtrl.setValue(allSelected ? [] : this.departments);
    this.searchForm.get('Departments')?.setValue(this.departmentsCtrl.value);
    this.searchPatients();
  }

  /* =======================
     Table Filter
  ======================= */
  applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
  }

  filterByType(type: number): void {
    const map = {
      1: 'FoodType',
      2: 'FoodTexture',
      3: 'CurrentAllergy',
      4: 'OldAllergy'
    };

    const field = map[type];
    if (!field) return;

    this.dataSource.data = this.hospitalData.filter(x => !!x[field]);
  }

  resetTable(): void {
    this.searchForm.controls['Departments'].setValue([]);
    this.loadPatients([]);
  }

  /* =======================
     Excel Export
  ======================= */
  exportToExcel(): void {
    let excelFileName = this.searchForm.value.ViewMode == 'kitchen' ? 'מטבח.xlsx' : this.searchForm.value.Departments + ' - דוח מרקמים.xlsx';
    const table = document.getElementById('excel-table');
    if (!table) return;

    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.searchForm.value.ViewMode == 'kitchen' ? 'מטבח.xlsx' : this.searchForm.value.Departments);

    XLSX.writeFile(wb, excelFileName);
  }

  exportToPdf(): void {
    this.creating_pdf = true;

    // Allow Angular to render the PDF DOM
    setTimeout(() => {
      const element = this.pdfContent.nativeElement;

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(this.searchForm.value.Departments + ' - דוח_מרקמי_תזונה.pdf');

        // 🔴 Hide PDF DOM after export
        this.creating_pdf = false;
      });
    }, 0);
  }
}
