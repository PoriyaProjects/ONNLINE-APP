import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  AfterViewChecked,
  Input,
  inject,
  ElementRef,
} from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatRadioChange } from "@angular/material/radio";
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { formatDate } from "@angular/common";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";

import {
  NgbModal,
  ModalDismissReasons,
  NgbModalOptions,
  NgbActiveModal,
} from "@ng-bootstrap/ng-bootstrap";
import * as $ from "jquery";
import {
  FormControl,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";

import { SelectionModel } from "@angular/cdk/collections";
import { environment } from "src/environments/environment";
import { ConfirmationDialogService } from "src/app/confirmation-dialog/confirmation-dialog.service";
import { MenuPerm } from "src/app/menu-perm";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
export interface WorkerCaseCat {
  RowID: string;
  CatName: string;
}
export interface WorkerCaseRowTable {
  RowID: string;
  WokerCaseBoxID: string;
  EmployeeID: string;
  EmployeeFirstName: string;
  EmployeeLastName: string;
  EmployeeGender: string;
  EmployeeDOB: string;
  RowStatus: string;
  Dose: string;
  WorkerCaseCats: string;
  WorkerCaseCatsName: string;
}
@Component({
  selector: 'app-edit-or-add-worker-case-dialog',
  templateUrl: './edit-or-add-worker-case-dialog.component.html',
  styleUrls: ['./edit-or-add-worker-case-dialog.component.css']
})
export class EditOrAddWorkerCaseDialogComponent implements OnInit {
  //activeModal = inject(NgbActiveModal);
  @ViewChild('editoraddemployee', { static: true }) modal: ElementRef<any>;
  @ViewChild("SendSmsToemergencymembersModal", { static: true })
  SendSmsToemergencymembersModal: NgbModal;
  @ViewChild(MatTable, { static: true }) table: MatTable<any>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";
  displayedColumns: string[] = [
    "Dose",
    "RowID",
    "EmployeeID",
    "FullName",
    "ConcatenatedCatsName",
  ];
  //private activeModal: NgbActiveModal;
  modalOptions: NgbModalOptions;
  modalOptionsPrint: NgbModalOptions = {
    windowClass: "modalOptionsPrint",
  };
  closeResult: string;
  opendModal: any;
  TABLE_DATA: WorkerCaseRowTable[] = [];
  WorkerCaseCats: WorkerCaseCat[] = [];
  WorkerData: WorkerCaseRowTable;
  rowFormData = {} as WorkerCaseRowTable;
  dataSource = new MatTableDataSource<WorkerCaseRowTable>(this.TABLE_DATA);
  selection = new SelectionModel<WorkerCaseRowTable>(true, []);
  loader: Boolean;
  tableLoader: Boolean;
  selectedOn: Boolean = false;
  resultsLength = 0;
  departStatus = 0;
  fliterVal = "";
  activeOrNot = "";
  BoxEmployee: FormGroup;
  GroupSmsToForm: FormGroup;
  submitted = false;
  perm: Boolean = false;
  NotAllOrNull: Boolean = false;
  constructor(
    private _snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private confirmationDialogService: ConfirmationDialogService,
    private activeModal: NgbActiveModal,
    private cdr: ChangeDetectorRef,
    private mMenuPerm: MenuPerm,
    public dialog: MatDialog,
    private dialogRef: MatDialogRef<EditOrAddWorkerCaseDialogComponent>
  ) { }
  checkValue(check: any, cat: any) {
    if (check.checked) {
      // Add if it doesn't exist
      if (this.BoxEmployee.value.WorkerCaseRelatedCat?.indexOf(cat.RowID) < 0) {
        this.BoxEmployee.value.WorkerCaseRelatedCat += "" + cat.RowID + ",";
        this.BoxEmployee.patchValue({
          WorkerCaseRelatedCat: this.BoxEmployee.value.WorkerCaseRelatedCat
        });
      }
    } else {
      // Remove if it exists
      if (this.BoxEmployee.value.WorkerCaseRelatedCat?.indexOf(cat.RowID) >= 0) {
        const updatedValue = this.BoxEmployee.value.WorkerCaseRelatedCat.split(',')
          .filter(id => id !== String(cat.RowID))
          .join(',');

        this.BoxEmployee.patchValue({
          WorkerCaseRelatedCat: updatedValue
        });
      }
    }
    console.log(this.BoxEmployee.value)
  }
  ngOnInit(): void {
    this.GetWorkerCaseCat();
    this.BoxEmployee = this.formBuilder.group({
      EmployeeID: ["", Validators.required],
      EmployeeFirstName: ["", Validators.required],
      EmployeeLastName: ["", Validators.required],
      EmployeeGender: ["", Validators.required],
      EmployeeDOB: ["", Validators.required],
      WokerCaseBoxID: [localStorage.getItem("CartoonID"), Validators.required],
      WorkerCaseRelatedCat: ["", Validators.required],
      RowID: ["0", false],
    });
  }
  openSnackBar() {
    this._snackBar.open("נשמר בהצלחה", "", {
      duration: 2500,
      direction: "rtl",
      panelClass: "success",
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
  openSnackBarBoxIsFound() {
    this._snackBar.open("מזהה קרטון נמצא", "", {
      duration: 2500,
      direction: "rtl",
      panelClass: "error",
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
  onSubmit() {
    this.submitted = true;
    debugger

    if (this.BoxEmployee.invalid) {
      return;
    }
    ////////debugger
    setTimeout(function () {
      $("#loader").removeClass("d-none");
    });
    //////debugger;
    this.http
      //.post(environment.url + "InsertOrUpdateBox", {
      .post(environment.url + "WorkerCaseInsertOrUpdateBox", {
        WokerCaseBox: this.BoxEmployee.value,
      })
      .subscribe((Response) => {
        ////debugger
        if (!Response["d"]) {
          this.getReport(null);
          this.openSnackBar();
          setTimeout(function () {
            $("#loader").addClass("d-none");
          });
          this.dialogRef.close([]);
          //this.modal?.elementRef.nativeElement.modal('hide');
        } else {
          $("#loader").addClass("d-none");
          this.openSnackBarBoxIsFound();
        }

      });
    // display form values on success
    //alert('SUCCESS!! :-)\n\n' + JSON.stringify(this.BoxForm.value, null, 4));

  }
  getReport($event: any): void {
    //////////debugger
    this.getTableFromServer(this.fliterVal, 0, 100);
  }
  public getTableFromServer(
    _FreeText: string,
    _pageIndex: number,
    _pageSize: number
  ) {
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
      .post(environment.url + "GetWokerCaseBoxEmployee", {
        textSearch: _FreeText,
        boxID: localStorage.getItem("CartoonID"),
        pageIndex: _pageIndex,
        pageSize: _pageSize,
      })
      .subscribe((Response) => {
        this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
        this.TABLE_DATA = Response["d"];
        debugger
        if (!this.TABLE_DATA[0]) {
          this.TABLE_DATA = [];

          this.dataSource = new MatTableDataSource<any>(
            this.TABLE_DATA
          );
          this.resultsLength = 0;
        } else {
          this.dataSource = new MatTableDataSource<any>(
            this.TABLE_DATA
          );
          this.resultsLength = this.TABLE_DATA.length;
        }

        setTimeout(function () {
          //////////debugger
          //if (tableLoader) {
          $("#loader").addClass("d-none");
          // }
        });
      });
  }
  onInputEmployeeIDBlur(event) {
    debugger
    this.GetWorkerDetails()
  }
  public GetWorkerDetails() {
    this.http
      .post(environment.url + "GetEmployeeData", { EmployeeID: this.BoxEmployee.value.EmployeeID })
      .subscribe((Response) => {
        //debugger
        this.WorkerData = Response["d"];
        this.BoxEmployee.patchValue({
          EmployeeFirstName: this.WorkerData.EmployeeFirstName,
          EmployeeLastName: this.WorkerData.EmployeeLastName,
          EmployeeGender: this.WorkerData.EmployeeGender,
          EmployeeDOB: this.WorkerData.EmployeeDOB
        });

      });
  }
  public GetWorkerCaseCat() {


    this.http
      .post(environment.url + "GetWorkerCaseCat", {})
      .subscribe((Response) => {
        //debugger
        this.WorkerCaseCats = Response["d"];

      });
  }
}
