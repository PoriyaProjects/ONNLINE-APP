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
import { AddEditAuthorizedComponent } from "./add-edit-authorized/add-edit-authorized.component"
import { environment } from "src/environments/environment";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
export interface Authorized {
  RowID: string;
  SupplierID: string;
  AuthorizedConnectionName: string;
  AuthorizedConnectionID: string;
  AuthorizedNDA: string;
  AuthorizedAM: string;
  AuthorizedIDPic: string;
  InsertUser: string;
  InsertDateTime: string;
  UpdateUser: string;
  UpdateDateTime: string;
  Supliers: any[];
}
export interface Supplier {
  RowID: string;
  SupplierName: string;
  SupplierNameToShow: string;
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
  UpdateUser: string;
  UpdateDateTime: string;
}
@Component({
  selector: 'app-authorized',
  templateUrl: './authorized.component.html',
  styleUrls: ['./authorized.component.css']
})
export class AuthorizedComponent implements OnInit {

  TABLE_DATA: Authorized[] = [];
  FreeText: string = '';
  dataSource = new MatTableDataSource<Authorized>(this.TABLE_DATA);
  Suppliers: Supplier[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
    "SupplierID",
    "AuthorizedConnectionName",
    "AuthorizedConnectionID",
    // "DepartWorkRooms",
    "AuthorizedNDA",
    "AuthorizedAM",
    "AuthorizedIDPic",
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
    mMenuPerm.setRoutName("authorized");
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
    
    this.getSuppliersFromServer();
    
  }
  open(): void {
    const element: Authorized = {
      RowID: "0",
      SupplierID: "",
      AuthorizedConnectionName: "",
      AuthorizedConnectionID: "",
      AuthorizedNDA: "",
      AuthorizedAM: "",
      AuthorizedIDPic: "",
      InsertUser: localStorage.getItem("loginUserName"),
      InsertDateTime: (new Date()).toString(),
      UpdateUser: localStorage.getItem("loginUserName"),
      UpdateDateTime: (new Date()).toString(),
      Supliers: this.Suppliers
    };
    const dialogRef = this.dialog.open(AddEditAuthorizedComponent, {
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
  editRow(element: Authorized): void {
    const dialogRef = this.dialog.open(AddEditAuthorizedComponent, {
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
  openSnackBar(text) {
    this._snackBar.open(text, "", {
      duration: 2500,
      direction: "rtl",
      panelClass: "info",
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
  deleteRow(element: Authorized): void {
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
  public getSuppliersFromServer() {
    let tableLoader = false;
    if ($("#loader").hasClass("d-none")) {
      // ////////debugger
      tableLoader = true;
      $("#loader").removeClass("d-none");
    }
    this.http
      .post(environment.url + "GetAllSuppliers", {
        FreeText: this.FreeText
      }
      )
      .subscribe((Response) => {

        this.Suppliers =  Response["d"];
        this.getTableFromServer();
        
      });
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  public getTableFromServer() {
    let tableLoader = false;
    if ($("#loader").hasClass("d-none")) {
      // ////////debugger
      tableLoader = true;
      $("#loader").removeClass("d-none");
    }
    this.http
      .post(environment.url + "GetAllAuthorized", {
        FreeText: this.FreeText
      }
      )
      .subscribe((Response) => {
        //////////debugger
        this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
        for(var i = 0; i < Response["d"].length; i++){
          Response["d"][i].Supliers = this.Suppliers;
          let supSelected = this.Suppliers.filter((e)=>{
            return e.RowID == Response["d"][i].SupplierID;
          })
          if(supSelected.length)
            Response["d"][i].SupplierNameToShow = supSelected[0].SupplierName;
        }
        debugger
        this.TABLE_DATA = Response["d"];
        ////debugger

        this.dataSource = new MatTableDataSource<Authorized>(
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
