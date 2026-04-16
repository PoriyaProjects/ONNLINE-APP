import { HttpClient } from "@angular/common/http";
import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Router } from "@angular/router";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MenuPerm } from "../menu-perm";
import { EditOrAddSupplierComponent } from "./edit-or-add-supplier/edit-or-add-supplier.component"
import { environment } from "src/environments/environment";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
import * as XLSX from 'xlsx';
import {
  ABCList,
  ConnectionEssenceList,
  ConnectionMethodList,
  ConnectionTypeList,
  DNAList,
  IdentificationFormList,
  OperationTypeList,
  SecurityMeasuresList,
  SignedSecrecyAgreementList,
  StatusList,
  YesNoList
} from "src/app/core/lookup-lists";
export interface Supplier {
  RowID: string;
  SupplierName: string;
  ServerDescription: string;
  ContactName: string;
  ContactEmail: string;
  ContactTell: string;
  ConnectionEssence: string;
  ConnectionType: string;
  ConnectionMethod: string;
  IdentificationForm: string;
  SecurityMeasures: string;
  SignedConfidentialityAgreement: string;
  ContinuityRisk: string;
  RiskSensitivity: string;
  RiskEconomic: string;
  ProbabilityEvent: string;
  SupplierCategorize: string;
  TestAM: string;
  ISOCer: string;
  RowStatus: string;
  CorporateNDA: string;
  InsertDateTime: string;
  InsertUser: string;
  OperationType: string;
  SignedSecrecyAgreement: string;
  Comments: string;
  UpdateUser: string;
  UpdateDateTime: string;
}
@Component({
  selector: 'app-supplier',
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.css']
})
export class SupplierComponent implements OnInit {
  SignedSecrecyAgreementList = SignedSecrecyAgreementList;
  ConnectionEssenceList = ConnectionEssenceList;
  ConnectionTypeList = ConnectionTypeList;
  ConnectionMethodList = ConnectionMethodList;
  IdentificationFormList = IdentificationFormList;
  SecurityMeasuresList = SecurityMeasuresList;
  YesNoList = YesNoList;
  DNAList = DNAList;
  StatusList = StatusList;
  OperationTypeList = OperationTypeList;
  ABCList = ABCList;

  StatusListSearch: any = [
    { id: "-1", value: 'הכול' },
    { id: "0", value: 'לא פעיל' },
    { id: "1", value: 'פעיל' }
  ]
  TABLE_DATA: Supplier[] = [];
  FreeText: string = '';
  Status: string = '-1';
  dataSource = new MatTableDataSource<Supplier>(this.TABLE_DATA);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
    "SupplierName",
    "ServerDescription",
    "ContactName",
    // "DepartWorkRooms",
    "ContactEmail",
    "ContactTell",
    "RowStatus",
    "editAuthorized"
  ];
  resultsLength = 0;
  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";
  constructor(
    private _snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private modalServiceresearchesusers: NgbModal,
    private formBuilderUsers: FormBuilder,
    activeModal: NgbActiveModal,
    private mMenuPerm: MenuPerm,
    public dialog: MatDialog,
    private confirmationDialogService: ConfirmationDialogService,
  ) {
    mMenuPerm.setRoutName("suppliers");
    setTimeout(() => {
      if (!mMenuPerm.getHasPerm()) {
        localStorage.clear();
        this.router.navigate(["login"]);
      }
    }, 2000);
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  ngOnInit(): void {
    this.getTableFromServer();
  }
  open(): void {
    const element: Supplier = {
      RowID: "0",
      SupplierName: "",
      ServerDescription: "",
      ContactName: "",
      ContactEmail: "",
      ContactTell: "",
      ConnectionEssence: "",
      ConnectionType: "",
      ConnectionMethod: "",
      IdentificationForm: "",
      SecurityMeasures: "",
      SignedConfidentialityAgreement: "",
      ContinuityRisk: "",
      RiskSensitivity: "",
      RiskEconomic: "",
      ProbabilityEvent: "",
      SupplierCategorize: "",
      CorporateNDA: "",
      TestAM: "",
      ISOCer: "",
      RowStatus: "",
      OperationType: "",
      Comments: "",
      SignedSecrecyAgreement: "",
      InsertUser: localStorage.getItem("loginUserName"),
      InsertDateTime: (new Date()).toString(),
      UpdateUser: localStorage.getItem("loginUserName"),
      UpdateDateTime: (new Date()).toString(),
    };
    const dialogRef = this.dialog.open(EditOrAddSupplierComponent, {
      data: {
        element: element,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      this.getTableFromServer();
    });
  }
  editRow(element: Supplier): void {
    const dialogRef = this.dialog.open(EditOrAddSupplierComponent, {
      data: {
        element: element,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      this.getTableFromServer();
    });

  }
  /**
   * Helper: Takes an ID (e.g., "1") and finds the text value (e.g., "תמיכה")
   * from the provided list.
   */
  getLabelFromList(id: any, list: any[]): string {
    if (id === null || id === undefined) return '';
    // We convert both to string to ensure "1" matches 1
    const foundItem = list.find(item => item.id.toString() === id.toString());
    return foundItem ? foundItem.value : id;
  }

  exportToExcel(): void {
    const rawData = this.dataSource.filteredData; // Get data currently in table

    // Map each row: Convert ID -> Text using your lists
    const exportData = rawData.map((row: any) => {
      return {
        'מזהה': row.RowID,
        'שם ספק': row.SupplierName,
        'תאור השרות': row.ServerDescription,
        'איש קשר': row.ContactName,
        'אימייל': row.ContactEmail,
        'טלפון': row.ContactTell,

        // --- Lists Mapped Here ---

        // 1. ConnectionEssenceList
        'מהות הספק': this.getLabelFromList(row.ConnectionEssence, this.ConnectionEssenceList),

        // 2. ConnectionTypeList
        'סוג החיבור': this.getLabelFromList(row.ConnectionType, this.ConnectionTypeList),

        // 3. ConnectionMethodList
        'אופן החיבור': this.getLabelFromList(row.ConnectionMethod, this.ConnectionMethodList),

        // 4. IdentificationFormList
        'צורת ההזדהות': this.getLabelFromList(row.IdentificationForm, this.IdentificationFormList),

        // 5. SecurityMeasuresList
        'אמצעי אבטחה': this.getLabelFromList(row.SecurityMeasures, this.SecurityMeasuresList),

        // 6. DNAList (Used for "NDA ארגוני" in your HTML)
        // Note: You reused formControlName="ContinuityRisk" in your HTML twice. 
        // I am assuming this one is stored as "SignedConfidentialityAgreement" or similar in your DB?
        // If it is truly "ContinuityRisk", it might conflict with the one below.
        'NDA ארגוני': this.getLabelFromList(row.SignedConfidentialityAgreement, this.DNAList),

        // 7. YesNoList
        'שאלון א.מ': this.getLabelFromList(row.TestAM, this.YesNoList),
        'מוסמך ISO': this.getLabelFromList(row.ISOCer, this.YesNoList),

        // 8. ABCList (Used for Risk Assessments)
        'סיכון רציפות עסקית': this.getLabelFromList(row.ContinuityRisk, this.ABCList),
        'סיכון רגישות המידע': this.getLabelFromList(row.RiskSensitivity, this.ABCList),
        'סיכון כלכלי': this.getLabelFromList(row.RiskEconomic, this.ABCList),
        'סבירות התממשות': this.getLabelFromList(row.ProbabilityEvent, this.ABCList),
        'סיווג ספק': this.getLabelFromList(row.SupplierCategorize, this.ABCList),

        // 9. StatusList
        'מצב': this.getLabelFromList(row.RowStatus, this.StatusList),

        // 10. OperationTypeList
        'סוג מערכת': this.getLabelFromList(row.OperationType, this.OperationTypeList),

        // 11. SignedSecrecyAgreementList
        'הסכם סודיות חתום': this.getLabelFromList(row.SignedSecrecyAgreement, this.SignedSecrecyAgreementList),

        'הערות': row.Comments
      };
    });

    // Generate Excel File
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');

    // Auto-width columns (optional aesthetic fix)
    const wscols = Object.keys(exportData[0] || {}).map(k => ({ wch: 20 }));
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, 'Suppliers_List.xlsx');
  }
  openSnackBar(text) {
    this._snackBar.open(text, "", {
      duration: 2500,
      direction: "rtl",
      panelClass: "info",
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
  deleteRow(element: Supplier): void {
    this.confirmationDialogService
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http
            .post(
              environment.url + "DeleteServerForOnnline",
              {
                RowId: element.RowID
              }
            )
            .subscribe((Response) => {
              if (Response["d"]) {
                this.openSnackBar("נמחק בהצלחה");
                this.getTableFromServer();
              } else {
                this.openSnackBar("משהו השתבש, לא נמחק !");
                this.getTableFromServer();
              }
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }
  applyFilter() {
    this.getTableFromServer();
  }
  public getTableFromServer() {
    let tableLoader = false;
    if ($("#loader").hasClass("d-none")) {
      // ////////debugger
      tableLoader = true;
      $("#loader").removeClass("d-none");
    }
    this.http
      .post(environment.url + "GetAllSuppliers", {
        FreeText: this.FreeText,
        status: this.Status,
      }
      )
      .subscribe((Response) => {
        //////////debugger
        this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
        this.TABLE_DATA = Response["d"];
        ////debugger

        this.dataSource = new MatTableDataSource<Supplier>(
          this.TABLE_DATA
        );
        // debugger
        this.resultsLength = this.TABLE_DATA.length;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        setTimeout(function () {
          //////////debugger
          //if (tableLoader) {
          $("#loader").addClass("d-none");
          // }
        });
      });
  }

}
