import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import * as XLSX from 'xlsx';
import { GoogleChartsService } from '../hospital-cath-dashb/services/google-charts.service';
import { MatSort } from '@angular/material/sort';
import { distinctUntilChanged } from 'rxjs/operators';

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

  // async ngOnInit(): Promise<void> {
  //   const userDepartment = (localStorage.getItem('Depart') || '').trim();
  //   const dparam = this.mapDepartmentToValue(userDepartment);
  
  //   // 🔁 Reset before new load
  //   this.dataSource.data = [];
  //   this.displayedColumns = [];
  //   this.totalMap = {};
  //   this.filterValue = '';
  //   this.columnFilters = {};
  
  //   await this.googleChartsService.waitUntilChartsReady();
  //   await this.googleChartsService.drawDataTable(dparam);
  
  //   const tableData = this.googleChartsService.getLastTableData() || [];
  
  //   if (tableData.length > 0) {
  //     this.displayedColumns = Object.keys(tableData[0]);
  
  //     const dateColumn = this.displayedColumns.find(col => col.toLowerCase().includes('date'));
  //     if (dateColumn) {
  //       this.dataSource.data = tableData.map(row => ({
  //         ...row,
  //         [dateColumn]: typeof row[dateColumn] === 'string'
  //           ? this.parseDateString(row[dateColumn])
  //           : row[dateColumn]
  //       }));
  //     } else {
  //       this.dataSource.data = tableData;
  //     }
  //   }
  
  //   this.dataSource.sort = this.sort;
  //   this.dataSource.sortingDataAccessor = (item, property) => {
  //     const value = item[property];
  //     return value instanceof Date ? value.getTime() : (typeof value === 'string' ? value.toLowerCase() : value);
  //   };
  
  //   this.calculateTotals();
  // }
  
  private lastDparam?: number;

  ngOnInit(): void {
    this.googleChartsService.dparam$
      .pipe(distinctUntilChanged())
      .subscribe(dparam => {
        this.refreshTableForDparam(dparam, true); // Force table refresh
      });
  }
  
  
  private async refreshTableForDparam(dparam: number, forceRefresh: boolean = false): Promise<void> {
    if (!forceRefresh && this.lastDparam === dparam) {
      console.log('ℹ️ Table already loaded for dparam:', dparam);
      return;
    }
  
    this.lastDparam = dparam;
    this.dataSource.data = [];
    this.displayedColumns = [];
    this.totalMap = {};
    this.filterValue = '';
    this.columnFilters = {};
  
    await this.googleChartsService.waitUntilChartsReady();
    await this.googleChartsService.drawDataTable(dparam);  // caching handled inside
  
    const tableData = this.googleChartsService.getLastTableData() || [];
  
    if (tableData.length > 0) {
      this.displayedColumns = Object.keys(tableData[0]);
  
      const dateColumn = this.displayedColumns.find(col =>
        col.toLowerCase().includes('date')
      );
  
      this.dataSource.data = dateColumn
        ? tableData.map(row => ({
            ...row,
            [dateColumn]: typeof row[dateColumn] === 'string'
              ? this.parseDateString(row[dateColumn])
              : row[dateColumn]
          }))
        : tableData;
    }
  
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property];
      return value instanceof Date
        ? value.getTime()
        : typeof value === 'string'
        ? value.toLowerCase()
        : value;
    };
  
    this.calculateTotals();
  }
  

 private async loadTableForDparam(dparam: number): Promise<void> {
  this.dataSource.data = [];
  this.displayedColumns = [];
  this.totalMap = {};
  this.filterValue = '';
  this.columnFilters = {};

  await this.googleChartsService.drawDataTable(dparam);
  const tableData = this.googleChartsService.getLastTableData() || [];

  if (tableData.length > 0) {
    this.displayedColumns = Object.keys(tableData[0]);

    const dateColumn = this.displayedColumns.find(col =>
      col.toLowerCase().includes('date')
    );

    this.dataSource.data = dateColumn
      ? tableData.map(row => ({
          ...row,
          [dateColumn]: typeof row[dateColumn] === 'string'
            ? this.parseDateString(row[dateColumn])
            : row[dateColumn]
        }))
      : tableData;
  }

  this.dataSource.sort = this.sort;
  this.dataSource.sortingDataAccessor = (item, property) => {
    const value = item[property];
    return value instanceof Date
      ? value.getTime()
      : typeof value === 'string'
      ? value.toLowerCase()
      : value;
  };

  this.calculateTotals();
}

  
  

  private mapDepartmentToValue(dept: string): number {
    if (dept.includes('מוח')) return 1;
    if (dept.includes('כירורגיה')) return 5;
    return 0;
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
    this.dataSource.filterPredicate = (row, filter) => {
      const filterText = filter.toLowerCase();
      return Object.values(row).some(value =>
        this.getCellStringValue(value).includes(filterText)
      );
    };
  
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


  private getCellStringValue(value: any): string {
    if (value instanceof Date) {
      const day = value.getDate().toString().padStart(2, '0');
      const month = (value.getMonth() + 1).toString().padStart(2, '0');
      const year = value.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return value?.toString().toLowerCase() || '';
  }

  private renderTable(el: HTMLElement, dataTable: any, options: any = {}): void {
    this.appendTotalRow(dataTable);
  
    const chart = new google.visualization.Table(el);
    chart.draw(dataTable, {
      allowHtml: true,
      width: '100%',
      sort: 'event',
      ...options
    });
  }
  
  private normalizeDateColumns(rows: any[], cols: any[]): void {
    cols.forEach((col, idx) => {
      if (col.type === 'date') {
        rows.forEach(row => {
          const cell = row?.c?.[idx];
          if (!cell || !cell.v) return;
  
          if (typeof cell.v === 'string') {
            const match = cell.v.match(/^Date\((\d+),(\d+),(\d+)\)$/);
            if (match) {
              const [_, y, m, d] = match.map(Number);
              cell.v = new Date(y, m, d);
            } else {
              const parsed = new Date(cell.v);
              if (!isNaN(parsed.getTime())) {
                cell.v = parsed;
              }
            }
          }
        });
      }
    });
  }
  
  private appendTotalRow(dataTable: any): void {
    const totalRow: any[] = [];
  
    for (let i = 0; i < dataTable.getNumberOfColumns(); i++) {
      if (i === 0) {
        totalRow.push('Total');
      } else if (dataTable.getColumnType(i) === 'number') {
        const sum = Array.from({ length: dataTable.getNumberOfRows() }, (_, rowIndex) =>
          dataTable.getValue(rowIndex, i)
        ).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
        totalRow.push(sum);
      } else {
        totalRow.push(null);
      }
    }
  
    dataTable.addRow(totalRow);
  }
  

}
