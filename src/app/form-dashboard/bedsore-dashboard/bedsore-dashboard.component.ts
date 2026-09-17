import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { PatientDetails } from '../tumor-board/Tumor-data';
import { MatPaginator } from '@angular/material/paginator';
import { ConfirmationDialogService } from "../../confirmation-dialog/confirmation-dialog.service";
import { BedsoreModalComponent } from './bedsore-modal/bedsore-modal.component';
import { BedsoreService } from './bedsore.service';
import {
  escapeHtml,
  filterChamelleonPatients,
  getBodyPartLabel,
  groupPatientsByDepartment,
  mapChamelleonToPatientDetails
} from './bedsore.utils';
import { of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-bedsore-dashboard',
  templateUrl: './bedsore-dashboard.component.html',
  styleUrls: ['./bedsore-dashboard.component.css']
})
export class BedsoreDashboardComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";

  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder,
    private bedsoreService: BedsoreService,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  searchPatient: FormGroup;
  allPatients: any[] = [];
  filteredPatientGroups: { departName: string; patients: any[] }[] = [];
  chamelleonFilter = '';
  loading = false;
  loadingPatients = false;
  searchPatientProgressBar = true;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  dataSource = new MatTableDataSource();
  patientDetails: PatientDetails;
  @ViewChild('printmycontent') printmycontent: ElementRef;
  displayedColumns: string[] = [
    'delete', 'FormDate', 'CaseNumber', 'PatientName', 'edit', 'print', 'namer'
  ];
  elementToPrint: any;
  loaderPdfNamer = false;
  getBodyPartLabel = getBodyPartLabel;

  ngOnInit(): void {
    this.searchPatient = this.fb.group({
      Passport: ['', null],
      CaseNumber: ['', null]
    });
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const fullName = `${data.PatientDetails?.FirstName || ''} ${data.PatientDetails?.LastName || ''}`.toLowerCase();
      return fullName.includes(filter);
    };
    this.getChamelleonCurrentPatients();
    this.getAllBedsoreList();
  }

  getChamelleonCurrentPatients() {
    this.loadingPatients = true;
    this.bedsoreService.getChamelleonCurrentPatients()
      .pipe(finalize(() => this.loadingPatients = false))
      .subscribe({
        next: (patients) => {
          this.allPatients = patients || [];
          this.refreshPatientGroups();
        },
        error: () => this.openSnackBar('שגיאה בטעינת מטופלים מקמיליון')
      });
  }

  applyChamelleonFilter(event: Event) {
    this.chamelleonFilter = (event.target as HTMLInputElement).value || '';
    this.refreshPatientGroups();
  }

  refreshPatientGroups() {
    const filtered = filterChamelleonPatients(this.allPatients, this.chamelleonFilter);
    this.filteredPatientGroups = groupPatientsByDepartment(filtered);
  }

  getAllBedsoreList() {
    this.loading = true;
    this.bedsoreService.getAllBedsoreList()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (forms) => {
          this.dataSource = new MatTableDataSource<any>(forms);
          this.dataSource.paginator = this.paginator;
        },
        error: () => this.openSnackBar('שגיאה בטעינת טפסים')
      });
  }

  getPatients() {
    const caseNumber = this.searchPatient.controls['CaseNumber'].value;
    this.searchPatientProgressBar = false;
    this.bedsoreService.getPatientDetailsByCaseNumber(caseNumber)
      .pipe(finalize(() => this.searchPatientProgressBar = true))
      .subscribe({
        next: (details) => {
          this.patientDetails = {
            RowID: null,
            Passport: details.PM_PATIENT_ID,
            FirstName: details.PM_FIRST_NAME,
            FatherName: details.PM_FATHER_NAME,
            LastName: details.PM_LAST_NAME,
            PhoneNumber: null,
            CaseNumber: details.PM_CASE_NUMBER,
            Address: null,
            DOB: details.PM_DOB,
          };
          this.openFormDialog(this.patientDetails);
        },
        error: () => this.openSnackBar('שגיאה בחיפוש מטופל')
      });
  }

  openFormDialog(patientSource) {
    const PatientDetails = mapChamelleonToPatientDetails(patientSource);
    const dialogRef = this.dialog.open(BedsoreModalComponent, {
      data: { PatientDetails },
      width: '80%'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.getAllBedsoreList();
      }
    });
  }

  printBedsoreForm(element) {
    this.elementToPrint = element;
    const that = this;
    const loadImages$ = element.ImagesList?.length
      ? of(element.ImagesList)
      : this.bedsoreService.getBedsoreImagesByRowID(element.Row_ID);

    loadImages$.subscribe({
      next: (images) => {
        this.elementToPrint = { ...element, ImagesList: images || [] };
        setTimeout(function () {
          const style = "<style>p,mat-label,span{font-weight: bold;font-size: 18px;}h1{font-size: 12px;}.col-2{width: 20%;justify-content: center;}.note {text-align: center;font-family: monospace;font-weight: normal;}</style>";
          const printContents = that.printmycontent.nativeElement.innerHTML;
          const w = window.open();
          w.document.write(style + printContents);
          setTimeout(() => {
            w.print();
            w.close();
          }, 500);
        }, 600);
      },
      error: () => this.openSnackBar('שגיאה בטעינת תמונות להדפסה')
    });
  }

  editFormDialog(data) {
    const dialogRef = this.dialog.open(BedsoreModalComponent, {
      data: { data },
      width: '80%'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.getAllBedsoreList();
      }
    });
  }

  applyFilter(event: Event) {
    let filterValue = '';
    if (event == undefined) {
      filterValue = '';
    } else if ((event as any).isTrusted == undefined) {
      filterValue = event as any;
    } else {
      filterValue = (event.target as HTMLInputElement).value;
    }
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  deleteForm(formData) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        if (confirmed) {
          this.bedsoreService.deleteBedsoreForm(formData.Row_ID).subscribe({
            next: (ok) => {
              this.openSnackBar(ok ? "נמחק בהצלחה!" : "תקלה במחיקה!");
              this.getAllBedsoreList();
            },
            error: () => this.openSnackBar("תקלה במחיקה!")
          });
        }
      })
      .catch(() => { });
  }

  linkToNamer(data) {
    this.loaderPdfNamer = true;
    const pd = { ...data.PatientDetails, BedsoreIDFK: data.PatientDetails.BedsoreIDFK || data.Row_ID };
    const category = 'ZPO_BEDSOR';

    const pdfString = `<!doctype html><html lang="he"><head><meta charset="utf-8"/><title>תיעוד פצע</title>
    <style>p,mat-label,span{font-weight: bold;font-size: 18px;}h1{font-size: 14px}.col-2{width: 16.66667%;justify-content: center;}.row{display: flex;margin-top: 10px;}.note{text-align:center;}</style>
    </head><body dir="rtl">
    <div class="d-none-desktop">
      <div class="d-none-desktop" dir="rtl">
          <div class="card-header border-bottomIn rel" style="text-align: center;">
              <img class="full-width" style="width: 100%;" src="https://poria.is-great.org/images/covid_2_header.png" />
              <h1 class="text-center pos-abs-center"><u>תיעוד פצע</u></h1>
          </div>
          <div class="row">
              <div class="col-12" style="width: 100%;text-align: center;float: right;">
                  <p>תאריך: ${escapeHtml(data.DateOfForm)}</p>
              </div>
          </div>
          <div class="row">
            <div class="col-2" style="float: right;">
                  <h5>ת.ז: <br>${escapeHtml(pd.Passport)}</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>מספר מקרה: <br>${escapeHtml(pd.CaseNumber)}</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם פרטי: <br>${escapeHtml(pd.FirstName)}</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם אב: <br>${escapeHtml(pd.FatherName)}</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>שם משפחה: <br>${escapeHtml(pd.LastName)}</h5>
              </div>
              <div class="col-2" style="float: right;">
                  <h5>גיל: <br>${escapeHtml(pd.DOB)}</h5>
              </div>
            </div>
            <hr>
            <div class="col-12">
              <div class="row"><h1><u>תמונות:</u></h1></div>`;

    this.bedsoreService.createBedsorePdf(pd, pdfString, category).pipe(
      switchMap((fileSource) => this.bedsoreService.linkPdfToPatientNamer(pd.CaseNumber, data.Row_ID, category, fileSource)),
      catchError(() => of(null)),
      finalize(() => this.loaderPdfNamer = false)
    ).subscribe({
      next: (result) => {
        if (result === 'success') {
          this.openSnackBar("! נשמר בהצלחה לתיק מטופל בנמר");
          this.getAllBedsoreList();
        } else if (result !== null) {
          this.openSnackBar("! משהו לא תקין");
        } else {
          this.openSnackBar("שגיאה בשמירה לנמר");
        }
      }
    });
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
