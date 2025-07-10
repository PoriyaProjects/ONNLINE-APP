import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import * as XLSX from 'xlsx';
import { GoogleChartsService } from '../hospital-cath-dashb/services/google-charts.service';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class TableComponent implements OnInit {
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = [];
  totalMap: { [key: string]: number } = {};
  filterValue = '';
  columnFilters: { [key: string]: string } = {};

  @ViewChild(MatSort) sort: MatSort;

  constructor(private googleChartsService: GoogleChartsService) {}

  async ngOnInit(): Promise<void> {
    await this.googleChartsService.drawDataTable();
    let tableData = this.googleChartsService.getLastTableData() || [];

    if (tableData.length > 0) {
      this.displayedColumns = Object.keys(tableData[0]);

      const dateColumn = this.displayedColumns[2]; 
      tableData = tableData.map(row => {
        const rawDate = row[dateColumn];
        const parsedDate = typeof rawDate === 'string' ? this.parseDateString(rawDate) : rawDate;
        return { ...row, [dateColumn]: parsedDate };
      });
    }

    this.dataSource.data = tableData;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property];
      if (value instanceof Date) return value.getTime();
      return typeof value === 'string' ? value.toLowerCase() : value;
    };

    this.calculateTotals();
  }

  parseDateString(dateStr: string): Date {
    if (!dateStr) return new Date(NaN);
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  formatCell(value: any): string {
    if (value instanceof Date) {
      const day = value.getDate().toString().padStart(2, '0');
      const month = (value.getMonth() + 1).toString().padStart(2, '0');
      const year = value.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return value;
  }

  applyFilter(): void {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
  }

  calculateTotals(): void {
    this.totalMap = {};
    if (!this.dataSource.data.length) return;

    const sampleRow = this.dataSource.data[0];
    for (const key of Object.keys(sampleRow)) {
      if (typeof sampleRow[key] === 'number') {
        this.totalMap[key] = this.dataSource.data.reduce((acc, row) => acc + (row[key] || 0), 0);
      }
    }
  }

  exportToExcel(): void {
    const exportData = this.dataSource.filteredData;
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    XLSX.writeFile(workbook, 'connected_table_export.xlsx');
  }

  applyColumnFilter(event: Event, column: string): void {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.columnFilters[column] = value;

    this.dataSource.filterPredicate = (row, _) =>
      Object.entries(this.columnFilters).every(([col, val]) =>
        row[col]?.toString().toLowerCase().includes(val)
      );

    this.dataSource.filter = JSON.stringify(this.columnFilters); // trigger filter
  }
}
