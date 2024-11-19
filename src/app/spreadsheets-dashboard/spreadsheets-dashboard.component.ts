import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { SpreadsheetComponent } from './spreadsheet/spreadsheet.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-spreadsheets-dashboard',
  templateUrl: './spreadsheets-dashboard.component.html',
  styleUrls: ['./spreadsheets-dashboard.component.css'],
  providers: [SpreadsheetComponent]
})
export class SpreadsheetsDashboardComponent implements OnInit {

  searchQuery: string = '';
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";

  spreadsheets = [];
  user_name = localStorage.getItem("loginUserName").toLowerCase();

  constructor(private http: HttpClient,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  openSpreadSheetDialog(spreadsheet) {
    let temp_dialog = this.dialog.open(SpreadsheetComponent);
    temp_dialog.updateSize('80%', '100%');
    temp_dialog.componentInstance.sheet_details = spreadsheet;
    temp_dialog.afterClosed().subscribe(response => {
      this.loadData();
    });
  }

  loadData(): void {
    this.http.post(environment.url + 'GetSpreadSheetsList', {
      _section: ''
    }).subscribe((response: any) => {
      this.spreadsheets = response['d'];
      // console.log(temp_data);
    });
  }

  addNewSheet() {
    let details = {
      SheetID: null,
      SheetName: 'Default Title',
      CreatedDate: null,
      UpdatedDate: null,
      CreatedUser: null,
      Status: 1,
    }
    let temp_dialog = this.dialog.open(SpreadsheetComponent);
    temp_dialog.updateSize('1000px', '100%');
    temp_dialog.componentInstance.sheet_details = details;
    temp_dialog.afterClosed().subscribe(response => {
      this.loadData();
    });
  }

  deleteSheet(SheetID) {
    this.http.post(environment.url + 'DeleteSpreadSheet', {
      _id: SheetID
    }).subscribe((response: any) => {
      if (response['d']) this.openSnackBar("נמחק בהצלחה");
      else this.openSnackBar("לא נמחק עקב תקלה");
      this.loadData();
    });
  }

  get filteredSpreadsheets() {
    return this.spreadsheets.filter((spreadsheet) =>
      spreadsheet.SheetName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}
