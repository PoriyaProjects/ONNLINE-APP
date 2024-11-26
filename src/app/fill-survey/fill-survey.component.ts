import {
    Component,
    OnInit,
    ViewChild,
    ChangeDetectorRef,
    ElementRef,
    Input,
    AfterViewInit,
    Inject,
} from "@angular/core";
import {
    FormGroup,
    FormControl,
    FormArray,
    Validators,
    FormBuilder,
    AbstractControl,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Question, Survey } from "./data-models";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, fromEvent, Subscription } from "rxjs";
import { Result } from "@zxing/library";
import { MatPaginator } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import {
    MatDialog,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from "@angular/material/dialog";
// import { ZXingScannerComponent } from '@zxing/ngx-scanner';
// import { BarcodeFormat } from '@zxing/library';
import { switchMap, takeUntil, pairwise } from "rxjs/operators";
import { DomSanitizer } from "@angular/platform-browser";
import { DatePipe } from "@angular/common";
import { ConfirmationDialogService } from "../confirmation-dialog/confirmation-dialog.service";
import { environment } from "src/environments/environment";

export class PersonalDetails {
    FirstName: string;
    FatherName: string;
    LastName: string;
    PersonID: string;
    DOB: string;
    Gender: string;
    PhoneNumber: string;
    Email: string;
    Address: string;
}
export class CheckBoxAnswers {
    QId: number;
    QAns: string[];
    QRequired: string;
}
export class Table {
    constructor(
        public Row_ID: string,
        public TableText: string,
        public SubTitle: string,
        public ColsType: string,
        public ColsSplitNumber: string,
        public TableStatus: string
    ) { }
}
@Component({
    selector: "signature-dialog",
    templateUrl: "signature-dialog.html",
})
export class DialogContentExampleDialog {
    // digital sign source : https://gist.github.com/anupkrbid/6447d97df6be6761d394f18895bc680d
    canvasEl: HTMLCanvasElement;
    @Input() width = 512;
    @Input() height = 418;
    @ViewChild("canvasinside") canvasinside: ElementRef;
    cx: CanvasRenderingContext2D;
    drawingSubscription: Subscription;
    constructor(
        public dialog: MatDialogRef<DialogContentExampleDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngAfterViewInit() {
        this.canvasEl = this.canvasinside.nativeElement;
        this.cx = this.canvasEl.getContext("2d");

        this.canvasEl.width = this.width;
        this.canvasEl.height = this.height;

        this.cx.lineWidth = 3;
        this.cx.lineCap = "round";
        this.cx.strokeStyle = "#000";
        this.captureEvents(this.canvasEl);
    }

    captureEvents(canvasEl: HTMLCanvasElement) {
        this.drawingSubscription = fromEvent(canvasEl, "mousedown")
            .pipe(
                switchMap((e) => {
                    return fromEvent(canvasEl, "mousemove").pipe(
                        takeUntil(fromEvent(canvasEl, "mouseup")),
                        takeUntil(fromEvent(canvasEl, "mouseleave")),

                        pairwise()
                    );
                })
            )
            .subscribe((res: [MouseEvent, MouseEvent]) => {
                const rect = canvasEl.getBoundingClientRect();

                const prevPos = {
                    x: res[0].clientX - rect.left,
                    y: res[0].clientY - rect.top,
                };

                const currentPos = {
                    x: res[1].clientX - rect.left,
                    y: res[1].clientY - rect.top,
                };

                this.drawOnCanvas(prevPos, currentPos);
            });
        fromEvent(canvasEl, "touchstart")
            .pipe(
                switchMap(() => {
                    return fromEvent(canvasEl, "touchmove").pipe(
                        takeUntil(fromEvent(canvasEl, "touchend")),
                        takeUntil(fromEvent(canvasEl, "touchcancel")),
                        pairwise()
                    );
                })
            )
            .subscribe((res: [TouchEvent, TouchEvent]) => {
                const rect = canvasEl.getBoundingClientRect();

                const prevPos = {
                    x: res[0].touches[0].clientX - rect.left,
                    y: res[0].touches[0].clientY - rect.top,
                };
                res[0].preventDefault();
                res[0].stopImmediatePropagation();

                const currentPos = {
                    x: res[1].touches[0].clientX - rect.left,
                    y: res[1].touches[0].clientY - rect.top,
                };
                res[1].preventDefault();
                res[1].stopImmediatePropagation();

                this.drawOnCanvas(prevPos, currentPos);
            });
    }

    drawOnCanvas(
        prevPos: { x: number; y: number },
        currentPos: { x: number; y: number }
    ) {
        if (!this.cx) {
            return;
        }

        this.cx.beginPath();

        if (prevPos) {
            this.cx.moveTo(prevPos.x, prevPos.y);
            this.cx.lineTo(currentPos.x, currentPos.y);

            this.cx.stroke();
        }
    }

    ngOnDestroy() {
        this.data.sign = this.canvasEl.toDataURL();
        this.drawingSubscription.unsubscribe();
        this.dialog.close(this.data);
    }

    sendToForm() {
        this.data.sign = this.canvasEl.toDataURL();
        this.dialog.close(this.data);
        // console.log(this.canvasEl);
    }
}
@Component({
    selector: "app-fill-survey",
    templateUrl: "./fill-survey.component.html",
    styleUrls: ["./fill-survey.component.css"],
})
export class FillSurveyComponent implements OnInit {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    displayedColumns: string[] = [];
    TABLE_DATA: Table[] = [];
    dataSource = new MatTableDataSource(this.TABLE_DATA);

    availableDevices: MediaDeviceInfo[];
    deviceCurrent: MediaDeviceInfo;
    deviceSelected: string;

    // formatsEnabled: BarcodeFormat[] = [
    //   BarcodeFormat.CODE_128,
    //   BarcodeFormat.DATA_MATRIX,
    //   BarcodeFormat.EAN_13,
    //   BarcodeFormat.QR_CODE,
    // ];

    hasDevices: boolean;
    hasPermission: boolean;

    qrResultString: string;

    torchEnabled = false;
    torchAvailable$ = new BehaviorSubject<boolean>(false);
    tryHarder = false;

    horizontalPosition: MatSnackBarHorizontalPosition = "start";
    verticalPosition: MatSnackBarVerticalPosition = "bottom";
    mPersonalDetails: PersonalDetails;
    selectedCheckbox: any[];
    selectedSubCheckbox: any[];
    editMode = false;

    public filter_form_response: any = [];
    public filter_question_response: any = [];
    public filter_option_response: any = [];
    answersData = new BehaviorSubject<AbstractControl[]>([]);

    _formID: string;
    _formName: string;
    _formOpenText: string;
    isCaseNumber: string;
    withCaseNumber: boolean;
    _formDate: string;
    _tableForm: string;
    CaseNumber: string = "";
    Passport: string = "";
    _questionArr = [];
    _optionArr = [];
    _checkBoxesOptionArr = [];
    _tableArr = [];
    maxDate = Date.now();
    canvasEl: HTMLCanvasElement;
    canvasT: HTMLCanvasElement;
    sign: any;
    date: string;
    time: string;

    userTable: FormGroup;
    control: FormArray;
    mode: boolean;
    touchedRows: any;

    constructor(
        public dialog: MatDialog,
        private _snackBar: MatSnackBar,
        private http: HttpClient,
        private formBuilder: FormBuilder,
        private confirmationDialogService: ConfirmationDialogService,
        private datePipe: DatePipe,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private _sanitizer: DomSanitizer
    ) { }

    // Digital Signature Section

    // @ViewChild('canvas') public canvas: ElementRef;

    // @Input() public width = 400;
    // @Input() public height = 150;

    // private cx: CanvasRenderingContext2D;

    // resetSign() {
    //   this.cx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    // }

    // public ngAfterViewInit() {
    //   this.canvasEl = this.canvas.nativeElement;
    //   this.cx = this.canvasEl.getContext('2d');

    //   this.cx.lineWidth = 3;
    //   this.cx.lineCap = 'round';
    //   this.cx.strokeStyle = '#000';

    //   this.captureEvents(this.canvasEl);
    // }

    // private captureEvents(canvasEl: HTMLCanvasElement) {
    //   fromEvent(canvasEl, 'mousedown')
    //     .pipe(
    //       switchMap((e) => {
    //         return fromEvent(canvasEl, 'mousemove')
    //           .pipe(
    //             takeUntil(fromEvent(canvasEl, 'mouseup')),
    //             takeUntil(fromEvent(canvasEl, 'mouseleave')),
    //             pairwise()
    //           )
    //       })
    //     )
    //     .subscribe((res: [MouseEvent, MouseEvent]) => {
    //       const rect = canvasEl.getBoundingClientRect();
    //       const prevPos = {
    //         x: res[0].clientX - rect.left,
    //         y: res[0].clientY - rect.top
    //       };
    //       const currentPos = {
    //         x: res[1].clientX - rect.left,
    //         y: res[1].clientY - rect.top
    //       };
    //       this.drawOnCanvas(prevPos, currentPos);
    //     });
    //   fromEvent(canvasEl, 'touchstart').pipe(switchMap(() => {
    //     return fromEvent(canvasEl, 'touchmove').pipe(
    //       takeUntil(fromEvent(canvasEl, 'touchend')),
    //       takeUntil(fromEvent(canvasEl, 'touchcancel')),
    //       pairwise()
    //     );
    //   })).subscribe((res: [TouchEvent, TouchEvent]) => {
    //     const rect = canvasEl.getBoundingClientRect();

    //     const prevPos = {
    //       x: res[0].touches[0].clientX - rect.left,
    //       y: res[0].touches[0].clientY - rect.top
    //     };
    //     res[0].preventDefault();
    //     res[0].stopImmediatePropagation();

    //     const currentPos = {
    //       x: res[1].touches[0].clientX - rect.left,
    //       y: res[1].touches[0].clientY - rect.top
    //     };
    //     res[1].preventDefault();
    //     res[1].stopImmediatePropagation();

    //     this.drawOnCanvas(prevPos, currentPos);
    //   });
    // }

    // private drawOnCanvas(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }) {
    //   if (!this.cx) { return; }

    //   this.cx.beginPath();

    //   if (prevPos) {
    //     this.cx.moveTo(prevPos.x, prevPos.y);
    //     this.cx.lineTo(currentPos.x, currentPos.y);
    //     this.cx.stroke();
    //   }
    // }

    //this comment is for the BarCode Scanner ** temporarly unavailable

    // clearResult(): void {
    //   this.qrResultString = null;
    // }

    // onCamerasFound(devices: MediaDeviceInfo[]): void {
    //   this.availableDevices = devices;
    //   this.hasDevices = Boolean(devices && devices.length);
    // }

    // onCodeResult(resultString: string) {
    //   this.qrResultString = resultString;
    //   console.log(resultString);
    //   this.caseNumberForm.controls['CaseNumber'].setValue(resultString);
    //   this.searchCaseNumber();
    // }

    // onDeviceSelectChange(selected: string) {
    //   const selectedStr = selected || '';
    //   if (this.deviceSelected === selectedStr) { return; }
    //   this.deviceSelected = selectedStr;
    //   const device = this.availableDevices.find(x => x.deviceId === selected);
    //   this.deviceCurrent = device || undefined;
    // }

    // onDeviceChange(device: MediaDeviceInfo) {
    //   const selectedStr = device?.deviceId || '';
    //   if (this.deviceSelected === selectedStr) { return; }
    //   this.deviceSelected = selectedStr;
    //   this.deviceCurrent = device || undefined;
    // }

    // onHasPermission(has: boolean) {
    //   this.hasPermission = has;
    // }

    // onTorchCompatible(isCompatible: boolean): void {
    //   this.torchAvailable$.next(isCompatible || false);
    // }

    // toggleTorch(): void {
    //   this.torchEnabled = !this.torchEnabled;
    // }

    // toggleTryHarder(): void {
    //   this.tryHarder = !this.tryHarder;
    // }

    ChekBoxQ: CheckBoxAnswers[];
    signatureArr: any[];
    signaturesArray: FormArray = this.formBuilder.array([]);
    // surveyAnswers: FormArray = this.formBuilder.array([]);
    checkBoxArray: FormArray = this.formBuilder.array([]);
    // TablesColsRows: FormArray = this.formBuilder.array([]);
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
    surveyAnswers: FormArray = this.formBuilder.array([
        {
            CheckBoxes: this.checkBoxArray,
        },
    ]);
    surveyForm: FormGroup = this.formBuilder.group({
        Answers: this.surveyAnswers,
        Tables: this.surveyTables,
    });

    caseNumberForm = new FormGroup({
        CaseNumber: new FormControl("", null),
        Passport: new FormControl("", null),
    });

    urlID: number;
    ifContinueForm: number;
    NurseID: number;

    ngOnInit() {
        if (this.activatedRoute.snapshot.params.id != undefined) {
            this.urlID = this.activatedRoute.snapshot.params.id;
            this.ifContinueForm = 0;
        }
        this.urlID;
        this.ifContinueForm;
        this.searchCaseNumber();
        let now = new Date();
        this.date = this.datePipe.transform(now, "yyyy-MM-dd");
        this.time = this.datePipe.transform(now, "HH:mm:ss");
        this.signatureArr = [];
        this.sign =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAGiCAYAAACRRH6CAAARv0lEQVR4Xu3WQQEAAAgCMelf2iA3GzB8sHMECBAgQIBATmC5xAITIECAAAECZwB4AgIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGg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";
    }

    myModel(e: any, id: string, questionIndex: number) {
        //return;\

        if (e.checked) {
            var result = this.ChekBoxQ.find((obj) => {
                return obj.QId === questionIndex;
            });
            result.QAns = result.QAns.filter((obj) => obj !== id);

            this.ChekBoxQ = this.ChekBoxQ.filter(
                (obj) => obj.QId != questionIndex
            );
            result.QAns.push(id);
            this.ChekBoxQ.push(result);
        } else {
            var result = this.ChekBoxQ.find((obj) => {
                return obj.QId === questionIndex;
            });

            if (result.QAns[0]) {
                result.QAns = result.QAns[0].split(",");
                result.QAns = result.QAns.filter((obj) => obj !== id);
            }
            //this.ChekBoxQ = this.ChekBoxQ.filter(obj => obj.QId != questionIndex);
            //this.ChekBoxQ.push(result);
        }
    }

    openSnackBar(message) {
        this._snackBar.open(message, "X", {
            duration: 3000,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
        });
    }

    openSignatureDialog(questID) {
        const dialogRef = this.dialog
            .open(DialogContentExampleDialog, {
                data: { sign: "", FormID: this.urlID, QuestionID: questID },
            })
            .afterClosed()
            .subscribe((data) => {
                //to show the sign in the template
                this.sign = this._sanitizer.bypassSecurityTrustResourceUrl(
                    data.sign
                );
                this.signatureArr.push(data);
            });
    }

    fillForm(continueForm) {
        this.surveyForm;
        let FormID = this._formID;
        let formData = this.surveyForm.getRawValue();
        let NurseInChargeID = String(this.NurseID);
        let Answers = [];
        let nurseInCharge = localStorage.getItem("loginUserName").toLowerCase();
        // let Signature = this.canvasEl.toDataURL();
        let surveyAnswers = formData.Answers;
        let Tables = [];
        let surveyTables = formData.Tables;
        let CaseNumber = this.caseNumberForm.controls["CaseNumber"].value;
        var survey = new Survey(
            FormID,
            CaseNumber,
            nurseInCharge,
            NurseInChargeID,
            Answers,
            surveyTables,
            Tables
        );
        var c = 0;
        var d = 0;
        surveyAnswers.forEach((answer, index, array) => {

            if (this._questionArr[index].QuestionType == "CheckBox") {
                answer.answerContent = this.ChekBoxQ[c].QAns.toString();
                c++;
            }

            if (this._questionArr[index].QuestionType == "Date") {
                answer.answerContent = this.datePipe.transform(answer.answerContent, 'yyyy-MM-dd');
            }

            if (this._questionArr[index].QuestionType == "Signature") {
                if (this.signatureArr.length > 0) {
                    if (
                        this.signatureArr[d].QuestionID ==
                        this._questionArr[index].QuestionID
                    ) {
                        answer.answerContent = this.signatureArr[d].sign;
                        d++;
                    }
                }
            }

            if (this._questionArr.length > index) {
                if (this._questionArr[index].QuestionType != "TextArea") {
                    let AnswerItem = {
                        AnswerID: index,
                        AnswerValue: answer.answerContent,
                        questionID: this._questionArr[index].QuestionID,
                        formID: this._formID,
                        AnswerType: this._questionArr[index].QuestionType,
                        questionValue: this._questionArr[index].QuestionValue,
                        PinQuestion: this._questionArr[index].PinQuestion,
                    };
                    survey.FormAnswers.push(AnswerItem);
                }
            }
        });

        if (!this.surveyForm.invalid) {
            this.confirmationDialogService
                .confirm("נא לאשר..", "האם אתה בטוח ...? ")
                .then((confirmed) => {
                    console.log("User confirmed:", confirmed);
                    if (confirmed) {
                        this.http
                            .post(
                                environment.url + "answerForm",
                                {
                                    _answerValues: survey,
                                    _ifContinue: continueForm,
                                }
                            )
                            .subscribe((Response) => {
                                if (Response["d"] != -1) {
                                    this.openSnackBar("!נשמר בהצלחה");
                                    let passport = survey.FormAnswers.filter(x => x.PinQuestion == '1' && x.AnswerType == 'ID')[0].AnswerValue;
                                    let pdf = this.getDataToSendToNamer(survey.FormID, this.CaseNumber, passport, "", "", Response['d'], survey.FormID);

                                } else {
                                    this.openSnackBar("משהו השתבש, לא נשמר");
                                }
                            });
                        this.dialog.closeAll();
                    } else {
                    }
                })
                .catch(() =>
                    console.log(
                        "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
                    )
                );
        } else {
            const invalid = [];
            const controls = this.surveyForm.controls["Answers"]["controls"];
            let counter = 1;
            for (const name in controls) {
                if (controls[name].invalid) {
                    invalid.push(counter);
                }
                counter = counter + 1;
            }
            this.openSnackBar("!שאלה מספר" + invalid[0] + " לא תקינה ");
        }
    }
    getDataToSendToNamer(FormID, caseNumber, personalPassport, FillDate, EmployeeUserName, row_ID, id) {
        this.http
            .post(
                environment.url + "GetPersonalDetailsForForms",
                {
                    _formID: FormID,
                    _caseNumber: caseNumber,
                    _personalPassport: personalPassport,
                    _fillDate: FillDate,
                    _employeeUserName: EmployeeUserName,
                    Row_ID: row_ID,
                }
            )
            .subscribe((Response) => {
                let all_forms_filter = Response["d"];
                if (all_forms_filter[0]) {
                    this.isCaseNumber = all_forms_filter[0].isCaseNumber;
                }
                let element = [];
                for (var i = 0; i < all_forms_filter.length; i++) {
                    if (all_forms_filter[i].Patient_ID != "") {
                        element.push({
                            FormID: all_forms_filter[i].formID,
                            PatientID: all_forms_filter[i].CaseNumber,
                            PatientName:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalFirstName +
                                " " +
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalLastName,
                            DateOfFillForm:
                                all_forms_filter[
                                    i
                                ].PatientsList[0].DateOfFillForm.split(" ")[0],
                            PatientBirthday:
                                all_forms_filter[
                                    i
                                ].PatientsList[0].PersonalBirthday.split(
                                    " "
                                )[0],
                            PatientPassport:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalID,
                            PatientPhone:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalPhone,
                            Row_ID: all_forms_filter[i].PatientsList[0]
                                .Row_ID,
                            PatientEmail:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalEmail,
                            PatientGender:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalGender,
                            PatientAddress:
                                all_forms_filter[i].PatientsList[0]
                                    .PersonalAddress,
                            SavedToNamer:
                                all_forms_filter[i].PatientsList[0]
                                    .SavedToNamer,
                            NurseInCharge:
                                all_forms_filter[i].PatientsList[0]
                                    .NurseFullName,
                            PersonFormID:
                                all_forms_filter[i].PersonFormID,
                            FormName: all_forms_filter[i].FormName,
                            Signature:
                                this._sanitizer.bypassSecurityTrustResourceUrl(
                                    all_forms_filter[i].Signature
                                ),
                            Questions: all_forms_filter[i].NurseAnswers,
                            NursesTable: all_forms_filter[i].NursesTable,
                        });
                    } else {
                        element.push({
                            FormID: all_forms_filter[i].formID,
                            PatientID: "",
                            PatientName: all_forms_filter[i].Patient_Name,
                            DateOfFillForm:
                                all_forms_filter[i].DateOfFillForm.split(
                                    " "
                                )[0],
                            PatientBirthday: "",
                            PatientPassport:
                                all_forms_filter[i].PersonalID,
                            PatientPhone: "",
                            Row_ID: "",
                            PatientEmail: "",
                            PatientGender: "",
                            SavedToNamer: "1",
                            PatientAddress: "",
                            NurseInCharge:
                                all_forms_filter[i].FirstName +
                                " " +
                                all_forms_filter[i].LastName,
                            PersonFormID:
                                all_forms_filter[i].PersonFormID,
                            FormName: all_forms_filter[i].FormName,
                            Signature:
                                this._sanitizer.bypassSecurityTrustResourceUrl(
                                    all_forms_filter[i].PersonalSignature
                                ),
                            Questions: all_forms_filter[i].NurseAnswers,
                            NursesTable: all_forms_filter[i].NursesTable,
                        });
                    }
                }
                let tableArr = [];
                element[0].NursesTable.forEach(e => {
                    tableArr.push(e);
                });
                let pdf = this.makePdfString(element[0], tableArr)
                this.http
                    .post(environment.urlipracticom + "createPdfOnServer", {
                        pdf: pdf
                    }
                    )
                    .subscribe((Response) => {
                        this.http
                            .post(environment.urlipracticom + "LinkPdfToPatientNamer", {
                                CaseNumber:
                                    this.CaseNumber,
                                FormID: id,
                                Catigory: "ZPO_ONLINE",
                                fileSource:
                                    Response["d"],
                            }
                            )
                            .subscribe((Response) => {
                                if (
                                    Response["d"] ==
                                    "success"
                                ) {
                                    this.openSnackBar(
                                        "! נשמר בהצלחה לתיק מטופל בנמר"
                                    );
                                } else {
                                    this.openSnackBar(
                                        "! משהו לא תקין"
                                    );
                                }
                            });
                    });
            });
    }
    makePdfString(element, tableArr) {
        let pdf = `
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
            pdf += `<div class="row text-right">
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
        pdf += `
                  <form>
                      <div class="row">
                          <h3>חלק שאלות :</h3>
                      </div>
                      `;
        element.Questions.forEach(item => {
            pdf += `<div class="row">
                        <div class="colr-12 brs-1">
                            <p class="fix-mb-5">
                                <span>
                                    <span><b>${item.questionValue}</b>:&nbsp;&nbsp;</span><span
                                        *ngIf="${item.AnswerType} != 'Signature'">${item.AnswerValue}</span><img
                                        *ngIf="${item.AnswerType} == 'Signature'" width="100" height="100"
                                        [src]="${item.AnswerValue}">
                                </span>
                            </p>
                        </div>
                    </div>`
        });
        pdf += `
                          <div class="row">
                              <h3 style="text-align: right;"><strong>חלק טבלאות</strong></h3>
                          </div>
                          `
        tableArr.forEach(table => {

            pdf += `<div style="margin-top: 20px;">
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
                pdf += `<th style="text-align: center;">
                                                      ${column.colsText}
                                                  </th>`;
            });
            pdf += `
                                              </tr>
                                              `
            table.rowsGroup.forEach(row => {
                pdf += `<tr>
                                                                            `;
                row.Answers.forEach((answer, output2) => {
                    pdf += `
                                                    <td>`;
                    if (output2 == '0' && row.rowsText != '') {
                        pdf += `
                                                        <span style="text-align: right;float: right;">${row.rowsText}</span>`;
                    } else {
                        pdf += `
                                                        <ng-template>
                                                        `;
                        if (answer.AnswerType == 'Text') {
                            pdf += `
                                                            <div>
                                                          ${answer.AnswerValue}
                                                      </div>`
                        }
                        if (answer.AnswerType == 'Time') {
                            pdf += `<div>
                                                          ${answer.AnswerValue}
                                                      </div>`
                        }
                        if (answer.AnswerType == 'Date') {
                            pdf += `<div>
                                                            ${answer.AnswerValue}
                                                        </div>`
                        }
                        if (answer.AnswerType == 'CheckBox') {
                            pdf += `
                                                            <section class="example-section">`
                            if (answer.AnswerValue == 'True') pdf += `<p>V</p>`;
                            else pdf += `<p></p>`;
                            pdf += `</section>`;
                        }
                        if (answer.AnswerType == 'Signature' && answer.AnswerValue != '') {
                            pdf += `
                                                            <div class="fix-my-width">
                                                            <img width="100" height="100" [src]="${answer.AnswerValue}">
                                                        </div>
                                                            `
                        }
                        pdf += `                                                      
                                                  </ng-template>`;
                    }
                    pdf += `</td>`;
                });
                `</tr>`;
            });
            pdf += `
                                          </table>
                                      </div>
                                  </div>
                              </div>`
        });
        pdf += `
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
        return pdf;
    }
    searchCaseNumber() {
        this.CaseNumber = this.caseNumberForm.controls["CaseNumber"].value;
        this.Passport = this.caseNumberForm.controls["Passport"].value;

        this.withCaseNumber = false;
        if (this.Passport != "") {
            this.http
                .post(
                    environment.url + "GetCardiologyPatientDetails",
                    {
                        _passport: this.Passport,
                    }
                )
                .subscribe((Response) => {
                    if (this.Passport != "") {
                        let passPatient = Response["d"];
                        this.mPersonalDetails.Address =
                            passPatient.Address;
                        this.mPersonalDetails.DOB = passPatient.DOB;
                        this.mPersonalDetails.Email =
                            passPatient.PatientEmail;
                        this.mPersonalDetails.FirstName =
                            passPatient.FirstName;
                        this.mPersonalDetails.FatherName =
                            passPatient.FatherName;
                        this.mPersonalDetails.LastName =
                            passPatient.LastName;
                        this.mPersonalDetails.PersonID =
                            passPatient.PersonID;
                        this.mPersonalDetails.PhoneNumber =
                            passPatient.PhoneNumber;
                        this.mPersonalDetails.Gender =
                            passPatient.Gender;
                        this.CaseNumber = passPatient.CaseNumber;
                        this.caseNumberForm.controls["CaseNumber"].setValue(
                            passPatient.CaseNumber
                        );
                    } else {
                        this.mPersonalDetails = Response["d"];
                    }
                    this.getForm(this.urlID, this.ifContinueForm, this.NurseID);
                    this.selectedSubCheckbox = new Array<any>();
                });
        } else {
            this.http
                .post(
                    environment.url + "GetPersonalDetails",
                    {
                        CaseNumber: this.CaseNumber,
                    }
                )
                .subscribe((Response) => {
                    if (this.Passport != "") {
                        let passPatient = Response["d"];
                        this.mPersonalDetails.Address =
                            passPatient[0].PatientAddress;
                        this.mPersonalDetails.DOB = passPatient[0].PatientDOB;
                        this.mPersonalDetails.Email =
                            passPatient[0].PatientEmail;
                        this.mPersonalDetails.FirstName =
                            passPatient[0].PatientFirstName;
                        this.mPersonalDetails.FatherName =
                            passPatient[0].PatientFatherName;
                        this.mPersonalDetails.LastName =
                            passPatient[0].PatientLastName;
                        this.mPersonalDetails.PersonID =
                            passPatient[0].PatientPersonID;
                        this.mPersonalDetails.PhoneNumber =
                            passPatient[0].PatientPhoneNumber;
                        this.mPersonalDetails.Gender =
                            passPatient[0].PatientGender;
                    } else {
                        this.mPersonalDetails = Response["d"];
                    }
                    this.getForm(this.urlID, this.ifContinueForm, this.NurseID);
                    this.selectedSubCheckbox = new Array<any>();
                });
        }
    }

    getForm(urlID, ifContinue, NurseID) {
        if (NurseID == undefined || NurseID == "" || NurseID == null) {
            NurseID = 0;
        }
        this.http
            .post(environment.url + "GetForm", {
                formFormID: urlID,
                _nurseid: NurseID,
            })
            .subscribe((Response) => {
                this.filter_form_response = Response["d"];
                this._formID = this.filter_form_response.FormID;
                this._formName = this.filter_form_response.FormName;
                this._tableForm = this.filter_form_response.TableForm;
                this._formOpenText = this.filter_form_response.FormOpenText;
                this._formDate = this.filter_form_response.FormDate;
                this.isCaseNumber = this.filter_form_response.isCaseNumber;
                this.NurseID = this.filter_form_response.NurseInChargeID;
                this.onlyColumns = this.formBuilder.array([]);
                this.TablesColsRows = this.formBuilder.array([]);
                this.surveyTables = this.formBuilder.array([]);
                var surveyTablesItem;
                var tableControl;
                var columnControlItem;

                if (
                    this.isCaseNumber == "1" &&
                    this.mPersonalDetails.PersonID == null
                ) {
                    this.openSnackBar("!מספר מקרה לא תקין");
                    this.withCaseNumber = true;
                } else {
                    this.withCaseNumber = false;
                    // initialize the tables
                    this.filter_form_response.FormTable.forEach((element) => {
                        this._tableArr.push(element);
                    });
                    // takes the data of each table
                    this.TABLE_DATA = [];
                    for (var i = 0; i < this._tableArr.length; i++) {
                        this.TablesColsRows = this.formBuilder.array([]);
                        this.TABLE_DATA.push({
                            Row_ID: this.filter_form_response.FormTable[i]
                                .Row_ID,
                            TableText:
                                this.filter_form_response.FormTable[i]
                                    .TableText,
                            SubTitle:
                                this.filter_form_response.FormTable[i].SubTitle,
                            ColsType:
                                this.filter_form_response.FormTable[i].ColsType,
                            ColsSplitNumber:
                                this.filter_form_response.FormTable[i]
                                    .ColsSplitNumber,
                            TableStatus:
                                this.filter_form_response.FormTable[i]
                                    .TableStatus,
                        });
                        let index = 0;
                        for (
                            var r = 0;
                            r < this._tableArr[i].rowsGroup.length;
                            r++
                        ) {
                            this.onlyColumns = this.formBuilder.array([]);
                            for (
                                var k = 0;
                                k < this._tableArr[i].colsGroup.length;
                                k++
                            ) {
                                if (
                                    this.filter_form_response.NurseInChargeID ==
                                    "0"
                                ) {
                                    if (
                                        this._tableArr[i].colsGroup[k]
                                            .ColType == "CheckBox"
                                    ) {
                                        surveyTablesItem =
                                            this.formBuilder.group({
                                                tableAnswerContent: [
                                                    false,
                                                    null,
                                                ],
                                                ColumnsValue: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].colsText,
                                                    null,
                                                ],
                                                ColType: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].ColType,
                                                    null,
                                                ],
                                                ColIDFK: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].Row_ID,
                                                    null,
                                                ],
                                            });
                                    } else {
                                        surveyTablesItem =
                                            this.formBuilder.group({
                                                tableAnswerContent: ["", null],
                                                ColumnsValue: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].colsText,
                                                    null,
                                                ],
                                                ColType: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].ColType,
                                                    null,
                                                ],
                                                ColIDFK: [
                                                    this._tableArr[i].colsGroup[
                                                        k
                                                    ].Row_ID,
                                                    null,
                                                ],
                                            });
                                    }
                                } else {
                                    if (
                                        this._tableArr[i].TableAnsweredGroup[
                                            index
                                        ].AnswerValue == "False"
                                    ) {
                                        this._tableArr[i].TableAnsweredGroup[
                                            index
                                        ].AnswerValue = false;
                                    } else if (
                                        this._tableArr[i].TableAnsweredGroup[
                                            index
                                        ].AnswerValue == "True"
                                    ) {
                                        this._tableArr[i].TableAnsweredGroup[
                                            index
                                        ].AnswerValue = true;
                                    }
                                    surveyTablesItem = this.formBuilder.group({
                                        Row_ID: [
                                            this._tableArr[i]
                                                .TableAnsweredGroup[index]
                                                .Row_ID,
                                            null,
                                        ],
                                        tableAnswerContent: [
                                            this._tableArr[i]
                                                .TableAnsweredGroup[index]
                                                .AnswerValue,
                                            null,
                                        ],
                                        ColumnsValue: [
                                            this._tableArr[i]
                                                .TableAnsweredGroup[index]
                                                .ColValue,
                                            null,
                                        ],
                                        ColType: [
                                            this._tableArr[i]
                                                .TableAnsweredGroup[index]
                                                .AnswerType,
                                            null,
                                        ],
                                        ColIDFK: [
                                            this._tableArr[i]
                                                .TableAnsweredGroup[index]
                                                .ColIDFK,
                                            null,
                                        ],
                                    });
                                }
                                index++;
                                this.onlyColumns.push(surveyTablesItem);
                            }
                            columnControlItem = this.formBuilder.group({
                                Columns: this.onlyColumns,
                                RowValue: [
                                    this._tableArr[i].rowsGroup[r].rowsText,
                                    null,
                                ],
                                RowIDFK: [
                                    this._tableArr[i].rowsGroup[r].Row_ID,
                                    null,
                                ],
                            });
                            this.TablesColsRows.push(columnControlItem);
                        }
                        this.updateView2();
                        tableControl = this.formBuilder.group({
                            ColumnRows: this.TablesColsRows,
                            TableID: [this._tableArr[i].Row_ID, null],
                        });
                        this.surveyTables.push(tableControl);
                    }
                    this.dataSource = new MatTableDataSource<any>(
                        this.TABLE_DATA
                    );
                    this.dataSource.paginator = this.paginator;

                    // this.getOption(this.urlID);
                    this.getQuestion(
                        this.urlID,
                        this.mPersonalDetails,
                        ifContinue,
                        NurseID
                    );
                }
                this.surveyForm = this.formBuilder.group({
                    Answers: this.surveyAnswers,
                    Tables: this.surveyTables,
                });
            });
        // this.ngAfterViewInit();
    }

    getQuestion(urlID, personalDetails, ifContinue, NurseID) {
        let userName = localStorage.getItem("loginUserName").toLowerCase();
        this.http
            .post(environment.url + "GetQuestion", {
                questionsFormID: urlID,
                isCaseNumber: this.isCaseNumber,
                nurseid: NurseID,
            })
            .subscribe((Response) => {
                this.filter_question_response = Response["d"];
                this.surveyAnswers = this.formBuilder.array([]);

                var that = this;

                this.ChekBoxQ = new Array<CheckBoxAnswers>();
                this.filter_question_response.forEach((element) => {
                    this.checkBoxArray = this.formBuilder.array([]);
                    this._questionArr.push(element);
                    this._optionArr.push(element.Options);
                    var surveyAnswersItem;
                    if (ifContinue == "1") {
                        element.Answers.forEach((ans) => {
                            if (element.QuestionType == "Signature") {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [ans.AnswerValue, null],
                                });
                            } else {
                                if (element.QuestionType == "CheckBox") {
                                    for (
                                        var i = 0;
                                        i < element.Options.length;
                                        i++
                                    ) {
                                        if (
                                            element.Options[i].QuestionIDFK ==
                                            element.QuestionID
                                        ) {
                                            var qOption =
                                                element.Options[i].OptionValue;

                                            if (
                                                ans.AnswerValue.indexOf(
                                                    qOption
                                                ) >= 0
                                            ) {
                                                surveyAnswersItem =
                                                    this.formBuilder.group({
                                                        answerContent: [
                                                            qOption,
                                                            null,
                                                        ],
                                                    });
                                            } else {
                                                surveyAnswersItem =
                                                    this.formBuilder.group({
                                                        answerContent: [
                                                            false,
                                                            null,
                                                        ],
                                                    });
                                            }
                                            this.checkBoxArray.push(
                                                surveyAnswersItem
                                            );
                                        }
                                    }
                                    this.surveyAnswers.push(this.checkBoxArray);
                                    // let splitted = ans.AnswerValue.split(",");
                                } else {
                                    surveyAnswersItem = this.formBuilder.group({
                                        answerContent: [ans.AnswerValue, null],
                                    });
                                }
                            }
                        });
                        if (element.QuestionType == "TextArea") {
                            surveyAnswersItem = this.formBuilder.group({
                                answerContent: [element.QuestionValue, null],
                            });
                        }
                    } else {
                        if (element.QuestionType == "CheckBox") {
                            for (var i = 0; i < element.Options.length; i++) {
                                if (
                                    element.Options[i].QuestionIDFK ==
                                    element.QuestionID
                                ) {
                                    surveyAnswersItem = this.formBuilder.group({
                                        answerContent: new FormControl(
                                            "",
                                            null
                                        ),
                                    });
                                    this.checkBoxArray.push(surveyAnswersItem);
                                }
                            }
                            this.surveyAnswers.push(this.checkBoxArray);
                            // let splitted = ans.AnswerValue.split(",");
                        }
                        if (element.QuestionType == "TextArea") {
                            surveyAnswersItem = this.formBuilder.group({
                                answerContent: [element.QuestionValue, null],
                            });
                        }
                        if (element.QuestionType == "Signature") {
                            surveyAnswersItem = this.formBuilder.group({
                                answerContent: [
                                    { value: userName, disabled: true },
                                    Validators.required,
                                ],
                            });
                        }
                        if (
                            element.QuestionIsRequired == "True" &&
                            element.QuestionType != "Signature" &&
                            element.QuestionType != "TextArea"
                        ) {
                            surveyAnswersItem = this.formBuilder.group({
                                answerContent: ["", Validators.required],
                            });
                        } else {
                            surveyAnswersItem = this.formBuilder.group({
                                answerContent: ["", null],
                            });
                        }
                    }
                    if (personalDetails.PersonID != null) {
                        if (element.PinQuestion == "1") {
                            if (
                                element.QuestionType == "Phone" &&
                                element.QuestionValue == "מספר טלפון"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        personalDetails.PhoneNumber,
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "ID" &&
                                element.QuestionValue == "ת.ז"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.PersonID,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.pattern(
                                                "[- +()0-9]{9,10}"
                                            ),
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Email" &&
                                element.QuestionValue == "כתובת מייל"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        personalDetails.Email,
                                        Validators.compose([
                                            Validators.pattern(
                                                "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$"
                                            ),
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Text" &&
                                element.QuestionValue == "שם פרטי"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.FirstName,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Text" &&
                                element.QuestionValue == "שם אב"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.FatherName,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Text" &&
                                element.QuestionValue == "שם משפחה"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.LastName,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Text" &&
                                element.QuestionValue == "כתובת"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.Address,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "Date" &&
                                element.QuestionValue == "תאריך לידה"
                            ) {
                                surveyAnswersItem = this.formBuilder.group({
                                    answerContent: [
                                        {
                                            value: personalDetails.DOB,
                                            disabled: true,
                                        },
                                        Validators.compose([
                                            Validators.required,
                                        ]),
                                    ],
                                });
                            } else if (
                                element.QuestionType == "RadioButton" &&
                                element.QuestionValue == "מין"
                            ) {
                                if (personalDetails.Gender == "1") {
                                    surveyAnswersItem = this.formBuilder.group({
                                        answerContent: [
                                            { value: "זכר", disabled: true },
                                            Validators.compose([
                                                Validators.required,
                                            ]),
                                        ],
                                    });
                                } else if (personalDetails.Gender == "2") {
                                    surveyAnswersItem = this.formBuilder.group({
                                        answerContent: [
                                            { value: "נקבה", disabled: true },
                                            Validators.compose([
                                                Validators.required,
                                            ]),
                                        ],
                                    });
                                } else {
                                    surveyAnswersItem = this.formBuilder.group({
                                        answerContent: [
                                            "אחר",
                                            Validators.compose([
                                                Validators.required,
                                            ]),
                                        ],
                                    });
                                }
                            }
                        }
                    }
                    //10725425

                    if (element.QuestionType == "CheckBox") {
                        if (ifContinue == "1") {
                            var nQ = new CheckBoxAnswers();
                            nQ.QRequired = element.QuestionIsRequired;
                            nQ.QId = element.QuestionID;
                            nQ.QAns = [element.Answers[0].AnswerValue];
                            that.ChekBoxQ.push(nQ);
                        } else {
                            var nQ = new CheckBoxAnswers();
                            nQ.QRequired = element.QuestionIsRequired;
                            nQ.QId = element.QuestionID;
                            nQ.QAns = [];
                            that.ChekBoxQ.push(nQ);
                        }
                    }
                    if (element.QuestionType != "CheckBox" && ifContinue == 1) {
                        this.surveyAnswers.push(surveyAnswersItem);
                    }
                    if (ifContinue == 0 && element.QuestionType != "CheckBox") {
                        this.surveyAnswers.push(surveyAnswersItem);
                    }
                });
                this.updateView();

                this.surveyForm = this.formBuilder.group({
                    Answers: this.surveyAnswers,
                    Tables: this.surveyTables,
                });
            });
    }

    updateView() {
        this.answersData.next(this.surveyAnswers.controls);
    }
    updateView2() {
        this.answersData.next(this.surveyTables.controls);
        this.answersData.next(this.TablesColsRows.controls);
        this.answersData.next(this.onlyColumns.controls);
    }

    onClose() {
        this.dialog.closeAll();
    }

    onSubmit() {
        this.fillForm(0);
        // var link = document.createElement('a');
        // link.download = 'download.png';
        // link.href = this.canvasEl.toDataURL();
        // link.click();
    }
}
