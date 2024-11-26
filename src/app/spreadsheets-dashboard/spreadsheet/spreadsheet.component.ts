import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { Spreadsheet } from '@syncfusion/ej2-angular-spreadsheet';

@Component({
  selector: 'app-spreadsheet',
  templateUrl: './spreadsheet.component.html',
  styleUrls: ['./spreadsheet.component.css']
})
export class SpreadsheetComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  data: any[] = [];
  columns: any[] = [];
  last_cell = "";
  last_header_cell = "";
  @Input()
  sheet_details: any;
  user_name: string = localStorage.getItem("loginUserName");
  @ViewChild('spreadsheet') spreadsheetObj: Spreadsheet;

  constructor(private http: HttpClient,
    private _snackBar: MatSnackBar,) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.post(environment.url + 'GetSpreadSheetsCellsData', {
      id: this.sheet_details.SheetID
    }).subscribe((response: any) => {
      let temp_data: any = response['d'];
      // console.log(temp_data);
      this.sheet_details.SheetID = temp_data[0].SheetID;
      if (temp_data[0].CellID != '0') this.data = this.transformSpreadsheetData(temp_data);
      this.onSpreadsheetCreated();
    });
  }

  // onSpreadsheetCreated(spreadsheet: Spreadsheet): void {
  //   // Department column (Column C)
  //   spreadsheet.addDataValidation({
  //     type: 'List',
  //     operator: 'EqualTo',
  //     value1: this.departmentOptions.join(','),
  //   }, 'C2:C100');

  //   // Age column (Column B) with fixed age ranges
  //   spreadsheet.addDataValidation({
  //     type: 'List',
  //     operator: 'EqualTo',
  //     value1: '20,25,30,35,40',
  //   }, 'B2:B100');
  // }

  onCellSave(args: any): void {
    let address = '';
    let value = '';
    if (args != null) {
      address = args.address;
      value = args.value;
    }
    setTimeout(() => {
      this.saveCellTimeOut(address, value);
    }, 1000);
  }

  saveCellTimeOut(address, value) {
    this.http
      .post(environment.url + 'UpdateSpreadSheetsCell', {
        cell_adress: address,
        sheet: this.sheet_details,
        user_name: this.user_name,
        value: value,
      })
      .subscribe({
        next: () => this.openSnackBar('נשמר בהצלחה'),
        error: (err) => this.openSnackBar('תקלה בשמירה:' + err),
      });
  }

  transformSpreadsheetData(rawData: any[]): any[] {
    const rows: { [key: string]: any } = {}; // Object to hold rows
    const headers: { [key: string]: string } = {}; // Object to hold headers

    rawData.forEach((cell) => {
      const cellAddress = cell.CellAddress.split('!')[1];
      const column = cellAddress.match(/[A-Z]+/)[0]; // Extract column letter
      const row = parseInt(cellAddress.match(/\d+/)[0], 10); // Extract row number

      if (row === 1) {
        this.last_header_cell = cellAddress;
        // If it's the first row, treat it as the header
        headers[column] = cell.CellValue; // Save the column name
      } else {
        this.last_cell = cellAddress;
        // For other rows, assign cell values
        if (!rows[row]) {
          rows[row] = {}; // Initialize row object if not present
        }
        const columnName = headers[column]; // Use header name or fallback to column letter
        rows[row][columnName] = cell.CellValue;
      }
    });

    // Convert rows object to array and return
    return Object.values(rows);
  }

  onSpreadsheetCreated(): void {
    // this.spreadsheetObj.wrap('A1:' + this.last_header_cell, true);
    this.spreadsheetObj.cellFormat({ textAlign: 'center' }, 'A1:Z10000');
    this.spreadsheetObj.cellFormat({ backgroundColor: '#357cd2', color: '#fff', fontWeight: 'bold' }, 'A1:' + this.last_header_cell);
  }

  charToNumber(char: string): number {
    if (!/^[A-Z]$/i.test(char)) {
      throw new Error('Input must be a single English alphabet character.');
    }

    // Convert the character to uppercase and subtract 64 (A = 1, B = 2, ..., Z = 26)
    return char.toUpperCase().charCodeAt(0) - 64;
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
