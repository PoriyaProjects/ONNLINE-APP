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
import { AddOrEditServerComponent } from "./add-or-edit-server/add-or-edit-server.component";
import { environment } from "src/environments/environment";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
export interface Server {
    RowId: string;
    ServerName: string;
    ServerType: string;
    HardWare: string;
    VSerialNumber: string;
    ServerRemarks: string;
    ServerLocation: string;
    ServerOS: string;
    ServerFunctions: string;
    ServerIPAddress: string;
    InsertDateTime: string;
    UpdateDateTime: string;
    UserInsert: string;
    UserUpdate: string;
}
@Component({
    selector: "app-servers-for-onnline",
    templateUrl: "./servers-for-onnline.component.html",
    styleUrls: ["./servers-for-onnline.component.css"],
})
export class ServersForOnnlineComponent implements OnInit {
    TABLE_DATA: Server[] = [];
    dataSource = new MatTableDataSource<Server>(this.TABLE_DATA);
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    displayedColumns: string[] = [
        "ServerName",
        "ServerType",
        "HardWare",
        // "DepartWorkRooms",
        "VSerialNumber",
        "ServerRemarks",
        "ServerLocation",
        "ServerOS",
        "ServerFunctions",
        "ServerIPAddress",
        "editServer",
        "deleteServer",
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
        mMenuPerm.setRoutName("servers4onnline");
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
        const element: Server = {
            RowId: "0",
            ServerName: "",
            ServerType: "",
            HardWare: "",
            VSerialNumber: "",
            ServerRemarks: "",
            ServerLocation: "",
            ServerOS: "",
            ServerFunctions: "",
            ServerIPAddress: "",
            InsertDateTime: "",
            UpdateDateTime: "",
            UserInsert: "",
            UserUpdate: "",
        };
        const dialogRef = this.dialog.open(AddOrEditServerComponent, {
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
    editRow(element: Server): void {
        const dialogRef = this.dialog.open(AddOrEditServerComponent, {
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
    deleteRow(element: Server): void {
        this.confirmationDialogService
        .confirm("נא לאשר..", "האם אתה בטוח ...? ")
        .then((confirmed) => {
          console.log("User confirmed:", confirmed);
          if (confirmed) {
            this.http
              .post(
                environment.url + "DeleteServerForOnnline",
                {
                  RowId: element.RowId
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
            .post(environment.url + "getAllServers4Onnline", {

            }
            )
            .subscribe((Response) => {
                //////////debugger
                this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
                this.TABLE_DATA = Response["d"];
                ////debugger

                this.dataSource = new MatTableDataSource<Server>(
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
