import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import * as XLSX from 'xlsx';
import { GoogleChartsService } from '../hospital-cath-dashb/services/google-charts.service';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
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

  //@ViewChild(MatPaginator) paginator: MatPaginator;
  
  @ViewChild(MatSort) sort: MatSort;

  constructor(private googleChartsService: GoogleChartsService) {}

  async ngOnInit(): Promise<void> {
    
    await this.googleChartsService.drawDataTable();
    const tableData = this.googleChartsService.getLastTableData() || [];


    this.dataSource.data = tableData;
    
    this.dataSource.sort = this.sort;
    this.displayedColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
    //this.dataSource.paginator = this.paginator;

    this.calculateTotals();
    console.log('🧮 Totals:', this.totalMap);
    
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



  columnFilters: { [key: string]: string } = {};

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
