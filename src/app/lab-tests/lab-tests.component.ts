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
import { EditOrAddLabTestsComponent } from "./edit-or-add-lab-tests/edit-or-add-lab-tests.component"
import { environment } from "src/environments/environment";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
export interface Supplier {
  RowID: string;
  TestCode: string;
  TestName_1: string;
  TestName_2: string;
  TestShortName: string;
  DoingLabName: string;
  SampleMaterial: string;
  TypeTestOrSamplingTool: string;
  SampleVolume: string;
  PickUpDeliveryConditions: string;
  LabTestTimeArrival: string;
  LabTestTime: string;
  LabHours: string;
  LabNotes: string;
  TimeOfPerforming: string;
  TestCat: string;
  StatusRow: string;
  DateTimeInsert: string;
  UserInsert: string;
  UserUpdate: string;
  DateTimeUpdate: string;
}
@Component({
  selector: 'app-lab-tests',
  templateUrl: './lab-tests.component.html',
  styleUrls: ['./lab-tests.component.css']
})
export class LabTestsComponent implements OnInit {

  StatusList: any = [
    {id: "-1", value: 'הכל'},
    {id: "0", value: 'לא פעיל'},
    {id: "1", value: 'פעיל'}
  ]
  CatList: any = [
    {id: "-1", value: 'הכל'},
    {id: "1", value: 'בדיקות פנים'},
    {id: "2", value: 'בדיקות חוץ'}
  ]
  TABLE_DATA: Supplier[] = [];
  FreeText: string = '';
  Status: string = '1';
  Cat: string = '-1';
  AdminToEdit = false;
  dataSource = new MatTableDataSource<Supplier>(this.TABLE_DATA);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
    "TestCode",
    "TestName_1",
    "TestName_2",
    "DoingLabName",
    "TypeTestOrSamplingTool",
    "PickUpDeliveryConditions",
    "LabTestTimeArrival",
   // "TestCat",
    // "DepartWorkRooms",
    //"TestShortName",
    //"DoingLabName",
    //"StatusRow",
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
    // mMenuPerm.setRoutName("LabTests");
    // setTimeout(() => {
    //   if (!mMenuPerm.getHasPerm()) {
    //     localStorage.clear();
    //     this.router.navigate(["login"]);
    //   }
    // }, 2000);
    switch(localStorage.getItem("loginUserName").toLowerCase()){
      //case "jmassalha":
      case "thajouj":
      case "massadi":
      case "hroshrosh":
        this.AdminToEdit = true;
        break;

    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  ngOnInit(): void {
    this.getTableFromServer();
  }
  openImage_3(){
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      data: {
        element: null,
        showForm: false,
        showImage_2: false,
        showImage_1: false,
        showImage_3: true,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });

  }
  openImage_1(){
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      data: {
        element: null,
        showForm: false,
        showImage_2: false,
        showImage_3: false,
        showImage_1: true,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });

  }
  openImage_2(){
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      data: {
        element: null,
        showForm: false,
        showImage_1: false,
        showImage_3: false,
        showImage_2: true,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });

  }
  open(): void {
    const element: Supplier = {
      RowID: "0",
      TestCode: "",
      TestName_1: "",
      TestName_2: "",
      TestShortName: "",
      DoingLabName: "",
      SampleMaterial: "",
      TypeTestOrSamplingTool: "",
      SampleVolume: "",
      PickUpDeliveryConditions: "",
      LabTestTimeArrival:  "",
      LabTestTime: "",
      LabHours:  "",
      LabNotes:  "",
      TimeOfPerforming:  "",
      TestCat: "",
      StatusRow:  "",
      UserInsert: localStorage.getItem("loginUserName"),
      DateTimeInsert: (new Date()).toString(),
      UserUpdate: localStorage.getItem("loginUserName"),
      DateTimeUpdate: (new Date()).toString(),
    };
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      
      width: "100%",    
      data: {
        showForm: true,
        showImage_1: false,
        showImage_3: false,
        showImage_2: false,
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
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      width: "100%", 
      data: {
        showForm: true,
        showImage_1: false,
        showImage_3: false,
        showImage_2: false,
        element: element,
        dialog: this.dialog,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      this.getTableFromServer();
    });

  }
  showRow(element: Supplier): void {
    const dialogRef = this.dialog.open(EditOrAddLabTestsComponent, {
      width: "100%", 
      data: {
        showForm: true,
        showImage_1: false,
        showImage_3: false,
        showImage_2: false,
        disable: true,
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
      .post(environment.url + "GetAllLabTests", {
        FreeText: this.FreeText,
        cat: this.Cat,
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
