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
import { MatDialog } from "@angular/material/dialog";
import { EditOrAddWorkerCaseDialogComponent } from "src/app/edit-or-add-worker-case-dialog/edit-or-add-worker-case-dialog.component";
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
  selector: 'app-edit-or-add-worker-case',
  templateUrl: './edit-or-add-worker-case.component.html',
  styleUrls: ['./edit-or-add-worker-case.component.css']
})
export class EditOrAddWorkerCaseComponent implements OnInit {

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
    public dialog: MatDialog
  ) {
    console.log(activeModal)
    console.log(modalService)


  }
  @Input()
  GroupName: string;
  GroupNumber: string;
  numSelected: number;
  numRows: number;
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }
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
  masterToggle() {
    ////debugger
    // this.isAllSelected()
    //     ? this.selection.clear()
    //     : this.dataSource.data.forEach((row) => this.selection.select(row));
  }
  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }
  ngAfterViewInit(): void {
  }
  CheckNumberOfSelection() {
    if (this.selection.selected.length) {
      this.selectedOn = true;
    } else {
      this.selectedOn = false;
    }
  }
  ngOnInit(): void {
    this.selectedOn = false;
    this.SendSmsToemergencymembersModal;
    ////debugger;
    $("#loader").removeClass("d-none");
    this.GroupName = "";
    this.GroupNumber = "";
    this.activeOrNot = "-1";
    this.loader = false;
    this.dataSource = new MatTableDataSource(this.TABLE_DATA);

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

    console.log(this.BoxEmployee.value);

    this.getReport(this);
    this.GetWorkerCaseCat();
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
  openSendSnackBar() {
    this._snackBar.open("נשלח בהצלחה", "", {
      duration: 2500,
      direction: "rtl",
      panelClass: "success",
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
          this.modalService.dismissAll();

          //this.modal?.elementRef.nativeElement.modal('hide');
        } else {
          $("#loader").addClass("d-none");
          this.openSnackBarBoxIsFound();
        }

      });
    // display form values on success
    //alert('SUCCESS!! :-)\n\n' + JSON.stringify(this.BoxForm.value, null, 4));

  }


  openDialog() {
    const dialogRef = this.dialog.open(EditOrAddWorkerCaseDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
      
      this.getReport(null);
    });
  }


  showcasenumbers(content, _type, _element) {
    // ////debugger;

    localStorage.setItem("Print", "false");
    localStorage.setItem("CartoonID", _element.RowID);
    localStorage.setItem("CartoonUNID", _element.BoxName);
    localStorage.setItem("Total", _element.Total);
    this.modalService.open(content, this.modalOptions).result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
        // //debugger
        if ("Save" == result) {
          // ////////debugger;
          //this.saveChad(_element.ROW_ID);
        }
      },
      (reason) => {
        this.getReport(this);
        this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      }
    );
  }

  printcasenumbers(content, _type, _element) {
    debugger;
    localStorage.setItem("Print", "true");
    localStorage.setItem("CartoonID", _element.RowID);
    localStorage.setItem("CartoonUNID", _element.BoxName);
    localStorage.setItem("Total", _element.Total);
    this.activeModal = this.modalService.open(
      content,
      this.modalOptionsPrint
    );
  }

  CloseModalSendSms() {
    this.modalService.dismissAll();
  }
  onInputEmployeeIDBlur(event) {
    //debugger
    this.GetWorkerDetails()
  }
  open(content, _type, _element) {
    if (!_element || _element == "") {
      _element = {
        RowID: -1,
        WokerCaseBoxID: localStorage.getItem("CartoonID"),
        EmployeeID: "",
        EmployeeFirstName: "",
        EmployeeLastName: "",
        EmployeeGender: "",
        EmployeeDOB: "",
        RowStatus: "",
        Dose: "",
        WorkerCaseCats: ""
      }
    }
    this.GroupName = _element.GroupName;
    //////debugger;
    this.BoxEmployee = this.formBuilder.group({
      EmployeeID: [_element.EmployeeID, Validators.required],
      EmployeeFirstName: [_element.EmployeeFirstName, Validators.required],
      EmployeeLastName: [_element.EmployeeLastName, Validators.required],
      EmployeeGender: [_element.EmployeeGender, Validators.required],
      EmployeeDOB: [_element.EmployeeDOB, Validators.required],
      WokerCaseBoxID: [localStorage.getItem("CartoonID"), Validators.required],
      WorkerCaseRelatedCat: [_element.WorkerCaseCats, Validators.required],
      RowID: [_element.RowID, false],
    });
    // this.BoxEmployee.get('EmployeeID')?.valueChanges.subscribe(value => {
    //   debugger
    //   console.log('Text input changed:', value);
    // });
    this.opendModal = this.modalService.open(content, this.modalOptions).result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
        //////////debugger
        if ("Save" == result) {
          // ////////debugger;
          //this.saveChad(_element.ROW_ID);
        }
      },
      (reason) => {
        this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      }
    );
  }
  getReport($event: any): void {
    //////////debugger
    this.getTableFromServer(this.fliterVal, 0, 100);
  }
  applyFilter(filterValue: string) {
    this.fliterVal = filterValue;

    this.getTableFromServer(this.fliterVal, 0, this.paginator.pageSize);

    //this.dataSource.filter = filterValue.trim().toLowerCase();
  }


  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return "by pressing ESC";
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return "by clicking on a backdrop";
    } else {
      return `with: ${reason}`;
    }
  }

  getPaginatorData(event: PageEvent) {
    //console.log(this.paginator.pageIndex);

    this.getTableFromServer(this.fliterVal, 0, this.paginator.pageSize);
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
