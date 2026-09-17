import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';

export interface DialysisReportPatient {
  Row_ID: string;
  Case_Number: string;
  Patient_ID: string;
  First_Name: string;
  Last_Name: string;
  Notified: string;
  Department: string;
}

@Component({
  selector: 'app-dialysis-report-patients',
  templateUrl: './dialysis-report-patients.component.html',
  styleUrls: ['./dialysis-report-patients.component.css']
})
export class DialysisReportPatientsComponent implements OnInit {
  isLoading = false;
  dataSource = new MatTableDataSource<DialysisReportPatient>([]);
  departments: string[] = [];

  totalCount = 0;
  notifiedCount = 0;
  notNotifiedCount = 0;
  distinctDepartments = 0;

  displayedColumns: string[] = [
    'Case_Number',
    'Patient_ID',
    'First_Name',
    'Last_Name',
    'Department',
    'HospitalDate',
    'HospitalTime'
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchPatients();
  }

  isNotified(value: string): boolean {
    if (value == null) {
      return false;
    }
    const v = String(value).trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'y';
  }

  recalculateKpis(): void {
    const rows = this.dataSource.filteredData || [];
    this.totalCount = rows.length;
    this.notifiedCount = rows.filter(r => this.isNotified(r.Notified)).length;
    this.notNotifiedCount = this.totalCount - this.notifiedCount;
    this.distinctDepartments = new Set(
      rows.map(r => (r.Department || '').trim()).filter(d => d.length > 0)
    ).size;
  }

  fetchPatients(): void {
    this.isLoading = true;
    const url = `${environment.url}FetchDialysisReportPatients`;
    this.http.post(url, {}).subscribe({
      next: (records: any) => {
        const rows: DialysisReportPatient[] = records?.d || [];
        this.dataSource = new MatTableDataSource<DialysisReportPatient>(rows);
        this.dataSource.filterPredicate = (data: DialysisReportPatient, filter: string): boolean => {
          const f = filter.trim().toLowerCase();
          if (!f) {
            return true;
          }
          const haystack = [
            data.Case_Number,
            data.Patient_ID,
            data.First_Name,
            data.Last_Name,
            data.Notified,
            data.Department
          ].join(' ').toLowerCase();
          return haystack.includes(f);
        };
        this.departments = Array.from(
          new Set(rows.map(r => (r.Department || '').trim()).filter(d => d.length > 0))
        ).sort();
        this.recalculateKpis();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching dialysis report patients:', error);
        this.isLoading = false;
      }
    });
  }

  applyTextFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.dataSource.filter = value.trim().toLowerCase();
    this.recalculateKpis();
  }

  applyDepartmentFilter(dept: string): void {
    this.dataSource.filter = (dept || '').trim().toLowerCase();
    this.recalculateKpis();
  }

  onClear(): void {
    this.dataSource.filter = '';
    this.recalculateKpis();
  }

  onRefresh(): void {
    this.fetchPatients();
  }

  notifiedLabel(value: string): string {
    return this.isNotified(value) ? 'כן' : 'לא';
  }

  exportexcel(): void {
    if (!this.dataSource || !this.dataSource.filteredData || this.dataSource.filteredData.length === 0) {
      alert('The data is empty!');
      return;
    }
    const dataToExport = this.dataSource.filteredData.map(item => {
      const itemCopy = { ...item };
      delete (itemCopy as any)['__type'];
      return itemCopy;
    });
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'DialysisReportPatients.xlsx');
  }
}
