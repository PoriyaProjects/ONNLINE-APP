import { HttpClient } from "@angular/common/http";
import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Router } from "@angular/router";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MenuPerm } from "../menu-perm";
import { AddOrEditSwitchesComponent } from "./add-or-edit-switches/add-or-edit-switches.component";
export interface Switches {
    RowID: string;
    Name: string;
    Place: string;    
    IPAddress: string;
    LastUserUpdated: string;
    LastUpdateTime: string;
}
@Component({
  selector: 'app-switches',
  templateUrl: './switches.component.html',
  styleUrls: ['./switches.component.css']
})
export class SwitchesComponent implements OnInit {
  TABLE_DATA: Switches[] = [];
  dataSource = new MatTableDataSource<Switches>(this.TABLE_DATA);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
      "Name",
      "Place",      
      "IPAddress",
      "editSwitches",
  ];
  resultsLength = 0;
  constructor(
      private _snackBarUsers: MatSnackBar,
      private router: Router,
      private http: HttpClient,
      private modalServiceresearchesusers: NgbModal,
      private formBuilderUsers: FormBuilder,
      activeModal: NgbActiveModal,
      private mMenuPerm: MenuPerm,
      public dialog: MatDialog
  ) {
      mMenuPerm.setRoutName("switches");
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
      this.getTableFromSwitches();
  }
  open(): void {
      const element: Switches = {
          RowID: "0",
          IPAddress: "",
          LastUpdateTime: "",
          LastUserUpdated: "",
          Name: "",
          Place: ""
      };
      const dialogRef = this.dialog.open(AddOrEditSwitchesComponent, {
          data: {
              element: element,
              dialog: this.dialog,
          },
      });

      dialogRef.afterClosed().subscribe((result) => {
          console.log(`Dialog result: ${result}`);
          this.getTableFromSwitches();
      });
  }
  editRow(element: Switches): void {
      const dialogRef = this.dialog.open(AddOrEditSwitchesComponent, {
          data: {
              element: element,
              dialog: this.dialog,
          },
      });

      dialogRef.afterClosed().subscribe((result) => {
          console.log(`Dialog result: ${result}`);
          this.getTableFromSwitches();
      });
  }
  applyFilter(event: Event) {
      const filterValue = (event.target as HTMLInputElement).value;
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
  public getTableFromSwitches() {
      let tableLoader = false;
      if ($("#loader").hasClass("d-none")) {
          // ////////debugger
          tableLoader = true;
          $("#loader").removeClass("d-none");
      }
      ////debugger
      //http://srv-apps-prod/RCF_WS/WebService.asmx/
      //http://srv-apps-prod/RCF_WS/WebService.asmx/
      this.http
          .post("http://srv-apps-prod/RCF_WS/WebService.asmx/getAllSwitches4Onnline", {
          //.post("http://srv-apps-prod/RCF_WS/WebService.asmx/getAllSwitches4Onnline",{

          }
          )
          .subscribe((Response) => {
              //////////debugger
              this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
              this.TABLE_DATA = Response["d"];
              ////debugger

              this.dataSource = new MatTableDataSource<Switches>(
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
