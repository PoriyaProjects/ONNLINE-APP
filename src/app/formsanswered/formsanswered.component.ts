import { HttpClient } from "@angular/common/http";
import { Component, ElementRef, Inject, OnInit, ViewChild } from "@angular/core";
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
} from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { Router, ActivatedRoute } from "@angular/router";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DomSanitizer } from "@angular/platform-browser";
import { DatePipe } from "@angular/common";
import { BehaviorSubject } from "rxjs";
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
import { environment } from "src/environments/environment";

export interface Patient {
    FormID: string;
    PersonFormID: string;
    PatientID: string;
    PatientName: string;
    PatientPassport: string;
    PatientPhone: string;
    PatientEmail: string;
    NurseInCharge: string;
    PatientGender: string;
    SavedToNamer: string;
    PatientBirthday: string;
    Row_ID: string;
    PatientAddress: string;
    FormName: string;
    DateOfFillForm: string;
    Signature: any;
    Questions: string[];
    NursesTable: string[];
}

export interface Questions {
    QuestionVal: string;
    AnswerVal: string;
    CaseNumber: string;
}

@Component({
    selector: "app-formsanswered",
    templateUrl: "./formsanswered.component.html",
    styleUrls: ["./formsanswered.component.css"]
})
export class FormsansweredComponent implements OnInit {
    horizontalPosition: MatSnackBarHorizontalPosition = "start";
    verticalPosition: MatSnackBarVerticalPosition = "bottom";

    FormID: string;
    PatientID: string;
    PatientName: string;
    PatientPassport: string;
    PatientPhone: string;
    SavedToNamer: string;
    Row_ID: string;
    PatientEmail: string;
    PatientGender: string;
    PatientBirthday: string;
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    all_forms_filter = [];
    form_patients: Patient;
    // form_nurse: Nurse;
    all_questions_filter = [];
    all_answers_filter = [];
    all_package_filter = [];
    department = [];
    _tableArr = [];
    todaysDate = Date.now;
    UserName = localStorage.getItem("loginUserName").toLowerCase();
    pdf: string = "";
    formSearchPatient: FormGroup;
    formSearchEmployee: FormGroup;
    urlID: number;
    isDialog: boolean;
    isCaseNumber: string;
    isCaseNumber2: string;

    TABLE_DATA: Patient[] = [];
    rowFormData = {} as Patient;
    displayedColumns: string[] = [
        "PatientID",
        "PatientName",
        "PersonalID",
        "NurseInCharge",
        "PatientDate",
        "Print",
    ];
    expandedElement: Patient | null;
    dataSource = new MatTableDataSource(this.TABLE_DATA);
    answersData = new BehaviorSubject<AbstractControl[]>([]);

    constructor(
        public dialog: MatDialog,
        private router: Router,
        private http: HttpClient,
        private confirmationDialogService: ConfirmationDialogService,
        private _sanitizer: DomSanitizer,
        private _snackBar: MatSnackBar,
        private activatedRoute: ActivatedRoute,
        private formBuilder: FormBuilder
    ) { }

    onlyColumns: FormArray = this.formBuilder.array([]);
    TablesColsRows: FormArray = this.formBuilder.array([
        {
            Columns: this.onlyColumns,
            RowValue: ["", null],
            RowIDFK: ["", null],
        },
    ]);
    surveyTables: FormArray = this.formBuilder.array([
        {
            ColumnRows: this.TablesColsRows,
            TableID: new FormControl("", null),
        },
    ]);
    formPrint: FormGroup = this.formBuilder.group({
        rowFormData: new FormControl("", null),
        Tables: this.surveyTables,
    });

    ngOnInit(): void {
        if (this.activatedRoute.snapshot.params.id != undefined) {
            this.urlID = this.activatedRoute.snapshot.params.id;
        }
        this.formSearchPatient = new FormGroup({
            caseNumber: new FormControl("", null),
            personalPassport: new FormControl("", null),
            FillDate: new FormControl("", null),
            EmployeeUserName: new FormControl("", null),
        });
        this.formPrint = new FormGroup({
            rowFormData: new FormControl("", null),
            Tables: new FormControl("", null),
        });
        this.searchForm();
    }

    public printRowForm(row): void {
        sessionStorage.setItem('printForm', JSON.stringify(row));
        if (this.isDialog) {
            this.dialog.closeAll();
        } else {
            let temp = sessionStorage.getItem('printForm');
            let data = JSON.parse(temp);
            if (!data) {
                return;
            }
            this.rowFormData = data;
            this._tableArr = [];
            this.rowFormData.NursesTable.forEach(element => {
                this._tableArr.push(element);
            });

            $("#loader").removeClass("d-none");
            setTimeout(function () {
                $("#loader").addClass("d-none");
                window.print();
            }, 1500);
        }
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    openSnackBar(message) {
        this._snackBar.open(message, "X", {
            duration: 5000,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
        });
    }

    saveFormToNamer(element) {
        element.NursesTable.forEach(e => {
            this._tableArr.push(e);
        });
        this.pdf = `
        <!doctype html>
        <html lang="he">
          <head>
            <meta charset="utf-8"/>
              <title>מערכת טפסים אונליין</title>
              <style>
              body {
                direction: rtl;
                text-align: right;
            }
            .card {
                min-height: 100%;
            }
            .card-header {
                position: relative;
                border-bottom: 1px solid #ccc;
            }
            .full-width {
                width: 100%;
            }
            .pos-abs-center {
                position: absolute;
                text-align: center;
            }
            .pd-10 {
                padding: 10px;
            }
            .row {
                width: 100%;
                display: flex;
            }
            .col-12{
                width: 100%
            }
            .col-6{
                width: 50%
            }
            .col-4{
                width: 25%
            }
            .text-up {
                text-transform: uppercase;
            }
            .text-right {
                text-align: right;
            }
            .pad-30 {
                padding: 30px;
            }
            .justify-content-md-center {
                justify-content: center;
            }
            .b-bottom {
                border-bottom: 1px solid #ccc;
                display: inline-block;
                padding: 2px 4px;
            }
            .fix-mb-5 {
                margin-bottom: 5px;
            }
            #table-overflow {
                overflow-x: auto;
            }
            .responsive-table {
                width: 100%;
                border-collapse: collapse;
            }
            .responsive-table th, .responsive-table td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: center;
            }
            .example-section p {
                margin: 0;
            }
            .fix-my-width {
                width: fit-content;
            }
            .pos-botom-fixed {
                position: fixed;
                bottom: 0;
                width: 100%;
            }
    </style>
          </head>
          <body dir="rtl">
        <div dir="rtl" class="card">
              <div class="card-header">
                  <img class="full-width" src="https://poria.is-great.org/images/covid_2_header.png" />
                  <h2 class="text-center">${element.FormName}</h2>
                  <h2 class="text-center" style="top: 100px;">${element.DateOfFillForm}</h2>
              </div>
              <div class="card-body">
                  <div class="row">
                      <div class="col-12">
                          <h4>פרטים אישיים</h4>
                      </div>
                  </div>
                  <br />
                  `;
        if (element.PatientID != '') {
            this.pdf += `<div class="row text-right">
                    <div class="col-4">
                          <label><b>מספר מקרה</b></label>
                          <span class="b-bottom">${element.PatientID}</span>
                      </div>
                      <div class="col-4">
                          <label><b>תעודת זהות</b></label>
                          <span class="b-bottom">${element.PatientPassport}</span>
                      </div>
                      <div class="col-4">
                          <label><b>שם נבדק</b></label>
                          <span class="b-bottom">${element.PatientName
                }</span>
                      </div>
      
                      <div class="col-4">
                          <label><b>טלפון נייד</b></label>
                          <span class="b-bottom">${element.PatientPhone
                }</span>
                      </div>
      
                      <div class="col-4">
                          <label><b>מין</b></label><span class="b-bottom">${element.PatientGender
                }</span>
                      </div>
                      <div class="col-4">
                          <label><b>תאריך לידה</b></label><span class="b-bottom">${element.PatientBirthday
                }</span>
                      </div>
                      <div class="col-6">
                          <label><b>מייל</b></label><span class="b-bottom">${element.PatientEmail}</span>
                      </div>
                      <div class="col-6">
                          <label><b>כתובת</b></label><span class="b-bottom">${element.PatientAddress
                }</span>
                      </div>
                  </div>
                    `
        }
        this.pdf += `
                  <form>
                      <div class="row">
                          <h3>חלק שאלות :</h3>
                      </div>
                      `;
        element.Questions.forEach(item => {
            this.pdf += `<div class="row">
                        <div class="colr-12 brs-1">
                            <p class="fix-mb-5">
                                <span>
                                    <span><b>${item.questionValue}</b>:&nbsp;&nbsp;</span>`;
                                    if(item.AnswerType != 'Signature'){
                                        this.pdf += `<span>${item.AnswerValue}</span>`
                                    }else{
                                        this.pdf += `<img width="100" height="100" [src]="${item.AnswerValue}">`;
                                    }
                                    this.pdf += `
                                </span>
                            </p>
                        </div>
                    </div>`
        });
        this.pdf += `
                          <div class="row">
                              <h3 style="text-align: right;"><strong>חלק טבלאות</strong></h3>
                          </div>
                          `
        this._tableArr.forEach(table => {

            this.pdf += `<div style="margin-top: 20px;">
                                  <mat-divider></mat-divider>
                                  <div class="row" style="display: block;">
                                      <h3 style="text-align: center;">${table.TableText}</h3>
                                  </div>
          
                                  <mat-divider></mat-divider>
                                  <div class="row" style="display: block;">
                                      <h4 style="text-align: center;font-size: 22px;">${table.SubTitle}</h4>
                                  </div>
                                  <div class="row" id="table-overflow">
                                      <div class="col">
                                          <table class="table responsive-table">
                                              <tr>
                                              `;
            table.colsGroup.forEach(column => {
                this.pdf += `<th style="text-align: center;">
                                                      ${column.colsText}
                                                  </th>`;
            });
            this.pdf += `
                                              </tr>
                                              `
            table.rowsGroup.forEach(row => {
                this.pdf += `<tr>
                                                                            `;
                row.Answers.forEach((answer, output2) => {
                    this.pdf += `
                                                    <td>`;
                    if (output2 == '0' && row.rowsText != '') {
                        this.pdf += `
                                                        <span style="text-align: right;float: right;">${row.rowsText}</span>`;
                    } else {
                        this.pdf += `
                                                        <ng-template>
                                                        `;
                        if (answer.AnswerType == 'Text') {
                            this.pdf += `
                                                            <div>
                                                          ${answer.AnswerValue}
                                                      </div>`
                        }
                        if (answer.AnswerType == 'Time') {
                            this.pdf += `<div>
                                                          ${answer.AnswerValue}
                                                      </div>`
                        }
                        if (answer.AnswerType == 'Date') {
                            this.pdf += `<div>
                                                            ${answer.AnswerValue}
                                                        </div>`
                        }
                        if (answer.AnswerType == 'CheckBox') {
                            this.pdf += `
                                                            <section class="example-section">`
                            if (answer.AnswerValue == 'True') this.pdf += `<p>V</p>`;
                            else this.pdf += `<p></p>`;
                            this.pdf += `</section>`;
                        }
                        if (answer.AnswerType == 'Signature' && answer.AnswerValue != '') {
                            this.pdf += `
                                                            <div class="fix-my-width">
                                                            <img width="100" height="100" [src]="${answer.AnswerValue}">
                                                        </div>
                                                            `
                        }
                        this.pdf += `                                                      
                                                  </ng-template>`;
                    }
                    this.pdf += `</td>`;
                });
                `</tr>`;
            });
            this.pdf += `
                                          </table>
                                      </div>
                                  </div>
                              </div>`
        });
        this.pdf += `
                  </form>      
              </div>      
              <div class="card-footer" style="margin-top: 250px;"></div>
              <div class="pos-botom-fixed">
                  <img class="full-width" src="https://poria.is-great.org/images/covid_footer.png" />
              </div>
          </div>
          </body>
        </html>
        `;
        this.confirmationDialogService
            .confirm("נא לאשר..", "האם אתה בטוח ...? ")
            .then((confirmed) => {
                console.log("User confirmed:", confirmed);
                if (confirmed) {
                    let patientIDPr = element.PatientID;
                    if (patientIDPr == "0") {
                        patientIDPr = element.PatientPassport;
                    }
                    this.http
                        .post(
                            environment.urlipracticom + "createPdfOnServer",
                            {
                                pdf: this.pdf,
                            }
                        )
                        .subscribe((Response) => {
                            this.http
                                .post(
                                    environment.urlipracticom + "LinkPdfToPatientNamer",
                                    {
                                        CaseNumber: patientIDPr,
                                        FormID: element.FormID,
                                        Catigory: "ZPO_ONLINE",
                                        fileSource: Response["d"],
                                    }
                                )
                                .subscribe((Response) => {
                                    if (Response["d"] == "success") {
                                        this.openSnackBar(
                                            "! נשמר בהצלחה לתיק מטופל בנמר"
                                        );
                                    } else {
                                        this.openSnackBar("! משהו לא תקין");
                                    }
                                });
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

    updateView2() {
        this.answersData.next(this.surveyTables.controls);
        this.answersData.next(this.TablesColsRows.controls);
        this.answersData.next(this.onlyColumns.controls);
    }

    onClose() {
        this.dialog.closeAll();
    }

    searchForm() {
        let caseNumber = this.formSearchPatient.controls["caseNumber"].value;
        let personalPassport =
            this.formSearchPatient.controls["personalPassport"].value;
        let FillDate = this.formSearchPatient.controls["FillDate"].value;
        let EmployeeUserName =
            this.formSearchPatient.controls["EmployeeUserName"].value;
        let FormID = this.urlID;
        let pipe = new DatePipe("en-US");
        if (!(FillDate == undefined || FillDate == "" || FillDate == null)) {
            FillDate = pipe.transform(FillDate, "yyyy/MM/dd");
        } else {
            FillDate = "";
        }
        if (caseNumber == undefined) {
            caseNumber = null;
        }
        if (personalPassport == undefined || personalPassport == null) {
            personalPassport = "";
        }

        this.http
            .post(
                environment.url + "GetPersonalDetailsForForms",
                {
                    _formID: FormID,
                    _caseNumber: caseNumber,
                    _personalPassport: personalPassport,
                    _fillDate: FillDate,
                    _employeeUserName: EmployeeUserName,
                    Row_ID: "",
                }
            )
            .subscribe((Response) => {
                this.all_forms_filter = Response["d"];
                if (this.all_forms_filter[0]) {
                    this.isCaseNumber = this.all_forms_filter[0].isCaseNumber;
                }
                this.TABLE_DATA = [];
                for (var i = 0; i < this.all_forms_filter.length; i++) {
                    if (this.all_forms_filter[i].Patient_ID != "") {
                        this.TABLE_DATA.push({
                            FormID: this.all_forms_filter[i].formID,
                            PatientID: this.all_forms_filter[i].CaseNumber,
                            PatientName:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalFirstName +
                                " " +
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalLastName,
                            DateOfFillForm:
                                this.all_forms_filter[
                                    i
                                ].PatientsList[0].DateOfFillForm.split(" ")[0],
                            PatientBirthday:
                                this.all_forms_filter[
                                    i
                                ].PatientsList[0].PersonalBirthday.split(
                                    " "
                                )[0],
                            PatientPassport:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalID,
                            PatientPhone:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalPhone,
                            Row_ID: this.all_forms_filter[i].PatientsList[0]
                                .Row_ID,
                            PatientEmail:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalEmail,
                            PatientGender:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalGender,
                            PatientAddress:
                                this.all_forms_filter[i].PatientsList[0]
                                    .PersonalAddress,
                            SavedToNamer:
                                this.all_forms_filter[i].PatientsList[0]
                                    .SavedToNamer,
                            NurseInCharge:
                                this.all_forms_filter[i].PatientsList[0]
                                    .NurseFullName,
                            PersonFormID:
                                this.all_forms_filter[i].PersonFormID,
                            FormName: this.all_forms_filter[i].FormName,
                            Signature:
                                this._sanitizer.bypassSecurityTrustResourceUrl(
                                    this.all_forms_filter[i].Signature
                                ),
                            Questions: this.all_forms_filter[i].NurseAnswers,
                            NursesTable: this.all_forms_filter[i].NursesTable,
                        });
                    } else {
                        this.TABLE_DATA.push({
                            FormID: this.all_forms_filter[i].formID,
                            PatientID: "",
                            PatientName: this.all_forms_filter[i].Patient_Name,
                            DateOfFillForm:
                                this.all_forms_filter[i].DateOfFillForm.split(
                                    " "
                                )[0],
                            PatientBirthday: "",
                            PatientPassport:
                                this.all_forms_filter[i].PersonalID,
                            PatientPhone: "",
                            Row_ID: "",
                            PatientEmail: "",
                            PatientGender: "",
                            SavedToNamer: "1",
                            PatientAddress: "",
                            NurseInCharge:
                                this.all_forms_filter[i].FirstName +
                                " " +
                                this.all_forms_filter[i].LastName,
                            PersonFormID:
                                this.all_forms_filter[i].PersonFormID,
                            FormName: this.all_forms_filter[i].FormName,
                            Signature:
                                this._sanitizer.bypassSecurityTrustResourceUrl(
                                    this.all_forms_filter[i].PersonalSignature
                                ),
                            Questions: this.all_forms_filter[i].NurseAnswers,
                            NursesTable: this.all_forms_filter[i].NursesTable,
                        });
                    }
                }
                this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
                this.dataSource.paginator = this.paginator;
            });
    }

    //this.imagePath = this._sanitizer.bypassSecurityTrustResourceUrl(this.all_forms_filter[i].Signature
    //+ toReturnImage.base64string);
}
