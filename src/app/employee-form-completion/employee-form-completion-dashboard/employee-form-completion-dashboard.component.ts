import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { EmployeeFormCompletionResult, EmployeeFormCompletionRow, emptyResult } from '../employee-form-completion.models';
import { EmployeeFormCompletionService } from '../employee-form-completion.service';

@Component({
  selector: 'app-employee-form-completion-dashboard',
  templateUrl: './employee-form-completion-dashboard.component.html',
  styleUrls: ['./employee-form-completion-dashboard.component.scss'],
})
export class EmployeeFormCompletionDashboardComponent implements OnInit {
  data: EmployeeFormCompletionResult = emptyResult();
  loading = false;
  errorMessage = '';
  searchText = '';
  selectedDepartment = '';
  showCompletedOnly = false;

  constructor(private api: EmployeeFormCompletionService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.fetch().subscribe({
      next: (result) => {
        this.data = result;
        this.loading = false;
      },
      error: (err) => {
        this.data = emptyResult();
        this.loading = false;
        this.errorMessage =
          err?.error?.error ||
          err?.error?.Message ||
          'טעינת נתוני השלמת טפסים נכשלה — יש לבדוק את החיבור לשרת';
      },
    });
  }

  get departments(): string[] {
    const set = new Set<string>();
    for (const row of this.data.Employees) {
      const dept = (row.Department || '').trim();
      if (dept) {
        set.add(dept);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he', { sensitivity: 'base' }));
  }

  get filteredEmployees(): EmployeeFormCompletionRow[] {
    const text = this.searchText.trim().toLowerCase();
    const dept = this.selectedDepartment.trim();
    return this.data.Employees.filter((row) => {
      if (this.showCompletedOnly && !row.HasCompletedForm) {
        return false;
      }
      if (dept && (row.Department || '').trim() !== dept) {
        return false;
      }
      if (!text) {
        return true;
      }
      const hay = `${row.FirstName} ${row.LastName} ${row.Department} ${row.EmployeeID}`.toLowerCase();
      return hay.indexOf(text) >= 0;
    });
  }

  toggleStatusFilter(): void {
    this.showCompletedOnly = !this.showCompletedOnly;
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedDepartment = '';
    this.showCompletedOnly = false;
  }

  exportExcel(): void {
    const rows = this.filteredEmployees.map((row) => ({
      'מחלקה': row.Department || '—',
      'שם פרטי': row.FirstName || '—',
      'שם משפחה': row.LastName || '—',
      'סטטוס': row.HasCompletedForm ? 'הושלם' : '—',
    }));
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'עובדים');
    XLSX.writeFile(wb, 'השלמת_טפסים_עובדים.xlsx');
  }

  trackByEmployeeId(_index: number, row: EmployeeFormCompletionRow): string {
    return row.EmployeeID || `${row.FirstName}-${row.LastName}-${_index}`;
  }
}
