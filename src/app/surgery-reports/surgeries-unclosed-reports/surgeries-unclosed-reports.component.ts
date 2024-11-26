import {
  Component,
  OnInit,
  ViewChild,
} from "@angular/core";

import * as XLSX from "xlsx";
import { HttpClient } from "@angular/common/http";
import { MatPaginator } from "@angular/material/paginator";
import {
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";

import {
  NgbModalOptions,
  NgbActiveModal,
} from "@ng-bootstrap/ng-bootstrap";
import {
  FormControl,
  FormBuilder,
  FormGroup,
} from "@angular/forms";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

export interface SurgeryDetails {
  CaseNumber: number;
  RequestDepart: string;
  DepartDoing: string;
  SurgeryRoom: string;
  SurgeryDate: string;
  SurgeryType: string;
  SurgeryCode: string;
  SurgeryName: string;
  Primary: string;
  PatientNumber: string;
  SurgenName: string;
  Role: string;
  PatientDOB: string;
  PatientFirstName: string;
  PatientLastName: string;

}
export interface SurgeryStaff {
  FullName: string;
}

@Component({
  selector: 'app-surgeries-unclosed-reports',
  templateUrl: './surgeries-unclosed-reports.component.html',
  styleUrls: ['./surgeries-unclosed-reports.component.css']
})
export class SurgeriesUnclosedReportsComponent implements OnInit {

  @ViewChild(MatTable, { static: true }) table: MatTable<any>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";

  displayedColumns: string[] = [
    "CaseNumber",
    "id",
    "first_name",
    "last_name",
    "date",
    "time",
    "room",
    "department",
    "surgeon",
    "cancel",
  ];

  modalOptions: NgbModalOptions = {
    windowClass: "marg-t-60",
    backdrop: "static",
    keyboard: false,
  };
  ShowSubmit: Boolean = true;
  loading: Boolean = true;
  closeResult: string;
  SurgeryStaffList: SurgeryStaff[] = [];
  rowFormData = {} as SurgeryDetails;
  dataSource = new MatTableDataSource();
  loader: Boolean;
  tableLoader: Boolean = false;
  resultsLength = 0;
  fliterValPatient = "";
  StatusPatient = "-1";
  patientForm: FormGroup;

  submitted = false;
  activeModal: NgbActiveModal;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    activeModal: NgbActiveModal,
  ) {
    this.activeModal = activeModal;
  }
  filteredOptions: Observable<SurgeryStaff[]>;
  startdateVal: string;
  Staff: string = "";
  enddateVal: string;
  UserFrom: string;
  myControl = new FormControl("");
  casenumber = "";
  opendCounter = 0;
  searchForm: FormGroup;

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      from_date: new FormControl(new Date(), null),
      to_date: new FormControl(new Date(), null),
    });
    this.loader = false;
  }

  public GetUnClosedSurgeries() {
    this.tableLoader = true;
    this.http
      .post(
        environment.url + "GetUnClosedSurgeries",
        {
          _fromDate: this.searchForm.value.from_date,
          _toDate: this.searchForm.value.to_date,
        }
      )
      .subscribe((Response) => {
        this.dataSource = new MatTableDataSource<any>(Response["d"]);
        this.dataSource.paginator = this.paginator;
        this.tableLoader = false;
      });
  }
  fileName = 'SurgeriesWithoutPDF.xlsx';
  exportexcel(): void {
    setTimeout(() => {
      /* table id is passed over here */
      let element = document.getElementById('excel-table');
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

      /* generate workbook and add the worksheet */
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      /* save to file */
      XLSX.writeFile(wb, this.fileName);
    }, 1000);
  }

}
