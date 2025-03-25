import { HttpClient } from '@angular/common/http';
import { Component, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { Spreadsheet, CellSaveEventArgs } from '@syncfusion/ej2-angular-spreadsheet';

@Component({
    selector: 'app-spreadsheet',
    templateUrl: './spreadsheet.component.html',
    styleUrls: ['./spreadsheet.component.css']
})
export class SpreadsheetComponent implements OnInit {

    // @HostListener('paste', ['event'])
    // @HostListener('paste', ['event']) onPaste(event: ClipboardEvent) {
    //     console.log("trying to paste");
    //     event.preventDefault();
    // }

    horizontalPosition: MatSnackBarHorizontalPosition = "start";
    verticalPosition: MatSnackBarVerticalPosition = "bottom";
    data: any[] = [];
    columns: any[] = [];
    chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    last_cell = "";
    last_header_cell = "";
    last_column_cell = "";
    number_of_columns = 0;
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
            this.data = temp_data.map((row, index) => {
                const rowData: any = {};
                this.last_header_cell = this.chars[temp_data[0].Data.length - 1] + '1';
                row.Data.forEach(pair => {
                    rowData[pair.Key] = pair.Value;
                });
                this.last_cell = this.chars[temp_data[0].Data.length - 1] + (index + 3).toString();
                this.last_column_cell = 'A' + (index + 3).toString();
                return rowData;
            });
            // if (temp_data[0].CellID != '0') this.data = this.transformSpreadsheetData(temp_data);
            // console.log(this.data);
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

    onCellSave(args: CellSaveEventArgs): void {
        let address = '';
        let value = '';
//  && args['requestType'] == undefined
        if (args != null) {
            address = args.address;
            value = args.value;

            // Check if the pasted value is valid (e.g., not empty)
            if (value && value.toString().trim() == '') value = '-';
            this.saveCellTimeOut(address, value);
            // setTimeout(() => {
            // }, 1000);
        } else if (args != null && args['requestType'] == 'paste') alert("לא נשמר, אסור להשתמש בפעולת הדבקה.");
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

    ngAfterViewInit(): void {
        // this.spreadsheetObj.addDataValidation(
        //   {
        //     type: 'List',
        //     operator: 'Between',
        //     value1: 'HR,IT,Finance', // Comma-separated values for the dropdown
        //   },
        //   'K2' // Apply to the 'Department' column from row 2 to 100
        // );
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
        // for (let i = 0; i < Object.keys(rows[2]).length; i++) {
        //     this.columns.push({ width: 100 });
        // }
        // Convert rows object to array and return
        return Object.values(rows);
    }

    onSpreadsheetCreated(): void {
        this.spreadsheetObj.cellFormat({ textAlign: 'center' }, 'A1:' + this.last_cell);
        this.spreadsheetObj.cellFormat({ backgroundColor: '#357cd2', color: '#fff', fontWeight: 'bold' }, 'A1:' + this.last_header_cell);
        switch (this.sheet_details.SheetID) {
            case '1':
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, בוקר, ערב, לילה', ignoreBlank: false }, 'E2:' + this.addTenCellsDown('E', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, רגל ויד נגדיים למיטה בהצלבה, רגל ויד של אותו הצד למיטה, גפה אחת למיטה, שתי ידיים או שתי רגליים אלו לאלו, שתי ידיים וגם שתי רגליים אלו לאלו', ignoreBlank: false }, 'I2:' + this.addTenCellsDown('I', this.last_cell));
                break;
            case '3':
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, אלשיפא, מריזן, מד"א, אחר', ignoreBlank: false }, 'E2:' + this.addTenCellsDown('E', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, לא נדרש, בוצע', ignoreBlank: false }, 'F2:' + this.addTenCellsDown('F', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'H2:' + this.addTenCellsDown('H', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'I2:' + this.addTenCellsDown('I', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'J2:' + this.addTenCellsDown('J', this.last_cell));
                break;
            case '7':
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, בוקר, ערב, לילה', ignoreBlank: false }, 'E2:' + this.addTenCellsDown('E', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: "-, פנימית א', פנימית ב'", ignoreBlank: false }, 'D2:' + this.addTenCellsDown('D', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, רופא, אחות, רופא+אחות', ignoreBlank: false }, 'F2:' + this.addTenCellsDown('F', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'H2:' + this.addTenCellsDown('H', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'I2:' + this.addTenCellsDown('I', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'J2:' + this.addTenCellsDown('J', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, V', ignoreBlank: false }, 'K2:' + this.addTenCellsDown('K', this.last_cell));
                break;
            case '9':
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, דרגה 1, דרגה 2, דרגה 3, דרגה 4, DTI, לא מסווג', ignoreBlank: false }, 'I2:' + this.addTenCellsDown('I', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, מזרון ספוג, מזרון ויסקי, מזרון ריאקטיבי, מזרון דינמי', ignoreBlank: false }, 'J2:' + this.addTenCellsDown('J', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן, לא', ignoreBlank: false }, 'H2:' + this.addTenCellsDown('H', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, רמת סיכון נמוך, רמת סיכון בינוני, רמת סיכון גבוה', ignoreBlank: false }, 'G2:' + this.addTenCellsDown('G', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, פנימית א, פנימית ב, קרדיולוגיה, טיפול נמרץ לב, כירורגיה, אורטופדיה', ignoreBlank: false }, 'B2:' + this.addTenCellsDown('B', this.last_cell));
                break;
            case '10':
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, נווה כנרת, נופים, מהבית, רמת טבריה, מעון כפר כנא', ignoreBlank: false }, 'G2:' + this.addTenCellsDown('G', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן ,לא', ignoreBlank: false }, 'H2:' + this.addTenCellsDown('H', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, מטפלת מהמוסד, משפחה', ignoreBlank: false }, 'I2:' + this.addTenCellsDown('I', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן ,לא, לסירוגין', ignoreBlank: false }, 'J2:' + this.addTenCellsDown('J', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן ,לא, לא רלוונטי', ignoreBlank: false }, 'L2:' + this.addTenCellsDown('L', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, מגן ראש, חפץ ייחודי, הגבלה פיזית, אחר', ignoreBlank: false }, 'K2:' + this.addTenCellsDown('K', this.last_cell));
                this.spreadsheetObj.addDataValidation({ type: 'List', value1: '-, כן ,לא, לא מונה אפוטרופוס', ignoreBlank: false }, 'M2:' + this.addTenCellsDown('M', this.last_cell));
                break;
        }
        // setTimeout(() => {
        //     // this.spreadsheetObj.freezePanes(1, 0);
        //     // this.spreadsheetObj.goTo(this.last_column_cell);
        //     // this.spreadsheetObj.selectRange(this.last_column_cell);
        // }, 2500);
    }

    addTenCellsDown(column, original) {
        let result = (column + (parseInt(original.substring(1,)) + 10).toString());
        return result;
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
