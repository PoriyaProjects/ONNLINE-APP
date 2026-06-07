import {
    Component,
    OnInit,
    ViewChild,
    Input,
    ElementRef,
    //ChangeDetectionStrategy,
    // ChangeDetectorRef
} from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
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
    FormArray,
    AbstractControl,
} from "@angular/forms";
import { BehaviorSubject } from "rxjs";
import { formatDate } from "@angular/common";
import { MenuPerm } from "../menu-perm";
import { environment } from "src/environments/environment";

export interface Demograph {
    FIRST_NAME: string;
    LAST_NAME: string;
    MID_NAME: string;
    ID: string;
    KUPA: string;
    GENDER: string;
    AGE: string;
    PATIENT_NUMBER: string;
    Case_Number: string;
    Depart: string;
    Seode_Depart: string;
}
export interface DropOption {
    value: string;
    name: string;
    viewValue: string;
    groupID: string;
    StorageConditions?: string;
    ExpireTime?: string;
}
export interface Prescription {
    PerscriptionID: string;
    ID: string;
    PatientFirstName: string;
    PatientLastName: string;
    FatherName: string;
    Age: string;
    sex: string;
    Kupa: string;
    Weight: string;
    Hight: string;
    TargetAUC: string;
    CreatinineLevel: string;
    Prognosis: string;
    ProtocolTreatment: string;
    Frequency: string;
    DateAdministrationMed: string;
    MedicationSensitivity: string;
    RegistrationDate: string;
    SaveDate: string;
    ModifyDate: string;
    Status: string;
    statusNotToDo: string;
    SensitivityUnknown: string;
    CourseNum: string;
    CompletionOfDetailsCheck: string;
    DosageCalculationCheck: string;
    CalcOfBodyAreaCheck: string;
    SolutionOfDilutionCheck: string;
    UserCreate: string;
    UserUpdate: string;
    Case_Number: string;
    Depart: string;
    Seode_Depart: string;
    hideOrShow: boolean;
}
export interface PrescriptionRow {
    noteVal: string;
    Dosage_UnitVal: string;
    Dosage_Unit_2_Val: string;
    finalMenonVal: string;
    Duration_Of_DeliveryVal: string;
    Solution_VolumeVal: string;
    SolutionVal: string;
    MenonValVal: string;
    MenonCalcVal: string;
    Way_Of_ProvidingVal: string;
    Days_ProtocolVal: string[];
    MedListVal: string;
    rowIdPreVal: string;
    newRow: Boolean;
}

export interface Drug {
    DrugName: string;
}
export interface DrugMetadata {
    MedID?: string;
    MedName: string;
    StorageConditions?: string;
    ExpireTime?: string;
}
export interface EmployeeOption {
    EmployeeID: string;
    FirstName: string;
    LastName: string;
    FullName: string;
}
@Component({
    //changeDetection: ChangeDetectionStrategy.OnPush,
    selector: "app-mersham",
    templateUrl: "./mersham.component.html",
    styleUrls: ["./mersham.component.css"],
})
export class MershamComponent implements OnInit {
    EDIT_ROW: Boolean;
    ROW_ID_IN_TABLE: number;
    tableColsPres: string[] = [
        "note",
        "Dosage_Unit",
        "finalMenon",
        "Duration_Of_Delivery",
        "Solution_Volume",
        "Solution",
        "Dosage_Unit_2_Val",
        "MenonCalc",
        "Menon",
        "Way_Of_Providing",
        "Days_Protocol",
        "MedList",
        "PRINT",
        "DELETE",
    ];
    tableColsPresPrint: string[] = [
        "SIN",
        "TIME",
        "TIME_END",
        "note",
        "Dosage_Unit",
        "finalMenon",
        "Duration_Of_Delivery",
        "Solution_Volume",
        "Solution",
        "Dosage_Unit_2_Val",
        "MenonCalc",
        "Menon",
        "Way_Of_Providing",
        "Days_Protocol",
        "MedList",
        "ROW_ID_PRE",
    ];
    patiant_number_or_id = "";
    drugs: Drug[] = [];
    employees: EmployeeOption[] = [];
    DeleteRowId: string;
    DeletePreRowId: string;
    tableDataPres: PrescriptionRow[] = [];
    tableDataPresPrint: PrescriptionRow[] = [];
    tableDataSrcPres = new BehaviorSubject<AbstractControl[]>([]); //new MatTableDataSource(this.tableDataPres);
    tableDataSrcPresPrint = new MatTableDataSource(this.tableDataPresPrint);
    rows: FormArray = this.formBuilder.array([]);
    //form: FormGroup = this.formBuilder.group({ 'SrcPresRows': this.rows });

    PrespictionFormRow: FormGroup = this.formBuilder.group({
        SrcPresRows: this.rows,
    });

    DemographData = {} as Demograph;
    @ViewChild(MatTable, { static: true }) table: MatTable<any>;
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;
    horizontalPosition: MatSnackBarHorizontalPosition = "center";
    verticalPosition: MatSnackBarVerticalPosition = "top";
    loadModalAfterCopy: Boolean;
    displayedColumns: string[] = [
        "PerscriptionID",
        "RegistrationDate",
        "DateAdministrationMed",
        "Prognosis",
        "ProtocolTreatment",
        "Status",
        "D_CLICK",
        "D_DELETE",
        //"PRINT"
    ];

    prem: Boolean;
    showDeleteBtn: Boolean;
    showCopyBtn: Boolean;
    isButtonVisible: Boolean;
    isCanceldVisible: Boolean;
    dis: Boolean;
    modalOptions: NgbModalOptions;
    closeResult: string;
    TABLE_DATA: Prescription[] = [];
    dataSource = new MatTableDataSource(this.TABLE_DATA);
    loader: Boolean;
    tableLoader: Boolean;
    resultsLength = 0;
    departStatus = 0;
    fliterVal = "";
    PrespictionForm: FormGroup;
    submitted = false;
    FIRST_NAME: string;
    LAST_NAME: string;
    MID_NAME: string;
    ID: string;
    GENDER: string;
    AGE: string;
    Case_Number: string;
    Depart: string;
    Seode_Depart: string;
    KUPA: string;

    FIRST_NAME_In: string;
    LAST_NAME_In: string;
    MID_NAME_In: string;
    ID_In: string;
    GENDER_In: string;
    AGE_In: string;
    Case_Number_In: string;
    Depart_In: string;
    Seode_Depart_In: string;
    KUPA_In: string;
    ShowPerm: boolean;
    Carboplatin: Boolean;
    calcByGender: number;
    rowElementPres: Prescription = {
        PerscriptionID: "",
        ID: "",
        PatientFirstName: "",
        PatientLastName: "",
        FatherName: "",
        Age: "",
        sex: "",
        Kupa: "",
        Weight: "",
        Hight: "",
        TargetAUC: "",
        CreatinineLevel: "",
        Prognosis: "",
        ProtocolTreatment: "",
        Frequency: "",
        DateAdministrationMed: "",
        MedicationSensitivity: "",
        RegistrationDate: "",
        SaveDate: "",
        ModifyDate: "",
        Status: "",
        statusNotToDo: "",
        SensitivityUnknown: "",
        CourseNum: "",
        CompletionOfDetailsCheck: "",
        DosageCalculationCheck: "",
        CalcOfBodyAreaCheck: "",
        SolutionOfDilutionCheck: "",
        UserCreate: "",
        UserUpdate: "",
        Case_Number: "",
        Depart: "",
        Seode_Depart: "",
        hideOrShow: true,
    };
    constructor(
        private activeModal: NgbActiveModal,
        private _snackBar: MatSnackBar,
        private router: Router,
        private http: HttpClient,
        private modalService: NgbModal,
        private elementRef: ElementRef,
        //private cdRef:ChangeDetectorRef,
        private formBuilder: FormBuilder,
        private mMenuPerm: MenuPerm
    ) {
        mMenuPerm.setRoutName("mersham");
        setTimeout(function () {
            //  debugger
            if (mMenuPerm.getHasPerm()) {
            } else {
                localStorage.clear();
                this.router.navigate(["login"]);
            }
        }, 1000);

        let that = this;
        window.onbeforeprint = function () {
            console.log("This will be called before the user prints.");
            that.editRow(null, null, that.rowElementPres, "false");
            var head =
                document.head || document.getElementsByTagName("head")[0];
            var style = document.createElement("style");
            style.type = "text/css";
            style.media = "print";
            var landscape = true;
            style.appendChild(
                document.createTextNode(
                    landscape
                        ? "@page { size: A4 landscape; margin: 0in;}"
                        : "@page { size: A4;  margin: 0in; }"
                )
            );

            head.appendChild(style);
        };
    }
    @Input()
    fullnameVal: string;
    rowElement: Prescription = {
        PerscriptionID: "",
        ID: "",
        PatientFirstName: "",
        PatientLastName: "",
        FatherName: "",
        Age: "",
        sex: "",
        Kupa: "",
        Weight: "",
        Hight: "",
        TargetAUC: "",
        CreatinineLevel: "",
        Prognosis: "",
        ProtocolTreatment: "",
        Frequency: "",
        DateAdministrationMed: "",
        MedicationSensitivity: "",
        RegistrationDate: "",
        SaveDate: "",
        ModifyDate: "",
        Status: "",
        statusNotToDo: "",
        SensitivityUnknown: "",
        CourseNum: "",
        CompletionOfDetailsCheck: "",
        DosageCalculationCheck: "",
        CalcOfBodyAreaCheck: "",
        SolutionOfDilutionCheck: "",
        UserCreate: "",
        UserUpdate: "",
        Case_Number: "",
        Depart: "",
        Seode_Depart: "",
        hideOrShow: true,
    };
    weightVal: string;
    heightVal: string;
    areaVal: string;
    noteVal: string;
    Sensitivity: string;
    SensitivityBool: boolean;
    Calc_Type: DropOption[];
    Dosage_Unit: DropOption[];
    Notes: DropOption[];
    Dosage_Unit_2_Val: DropOption[];
    ROW_ID_PRE: string;
    Duration_Of_Delivery: DropOption[];
    Solution: DropOption[];
    Solution_Volume: DropOption[];
    Way_Of_Providing: DropOption[];
    MedList: DropOption[];
    ArrayDrus: Array<Array<DropOption>> = [];
    Days_Protocol: DropOption[];
    PresRowIdVal: string;
    filterdDataArray: DropOption[];
    MedListConst: DropOption[];
    drugMetadataList: DrugMetadata[] = [];
    loadModalAfterClose: Boolean;
    printForm: {
        MedicationSensitivityVal: string;
        SensitivityVal: Boolean;
        regesterdateIN: string;
        weightVal: string;
        heightVal: string;
        areaVal: string;
        targetAUCVal: string;
        levelVal: string;
        diagnosisVal: string;
        protocolVal: string;
        frequencyVal: string;
        courseNumVal: string;
        takedateIN: string;
        statusRowVal: Boolean;
        statusNotToDo: Boolean;
    };
    rowLabelForm: FormGroup;
    selectedRowForPrint: PrescriptionRow;
    rowLabelSubmitted: boolean;
    ngOnInit(): void {
        this.ROW_ID_PRE = "";
        //this.rowElementPres =
        $("body").addClass("bg-blue-light");
        this.prem = true;
        this.ShowPerm = true;
        this.getPermission();
        this.printForm = {
            MedicationSensitivityVal: "",
            SensitivityVal: false,
            regesterdateIN: "",
            weightVal: "",
            heightVal: "",
            areaVal: "",
            targetAUCVal: "",
            levelVal: "",
            diagnosisVal: "",
            protocolVal: "",
            frequencyVal: "",
            courseNumVal: "",
            takedateIN: "",
            statusRowVal: false,
            statusNotToDo: false,
        };
        this.rowLabelForm = this.formBuilder.group({
            preparationTime: ["", Validators.required],
            preparerEmployeeId: ["", Validators.required],
            checkerEmployeeId: ["", Validators.required],
        });
        this.rowLabelSubmitted = false;
        this.selectedRowForPrint = null;
        this.Carboplatin = false;
        this.showDeleteBtn = false;
        this.DeleteRowId = "";
        this.DeletePreRowId = "";
        this.PresRowIdVal = "";
        this.isButtonVisible = true;
        this.isCanceldVisible = false;
        this.EDIT_ROW = false;
        this.ROW_ID_IN_TABLE = 0;
        this.weightVal = "0";
        this.heightVal = "0";
        this.areaVal = "0";
        this.noteVal = "";
        this.loader = false;
        this.dataSource = new MatTableDataSource(this.TABLE_DATA);
        this.loadModalAfterCopy = false;
        this.loadModalAfterClose = false;
        // if (
        //     localStorage.getItem("loginState") != "true" ||
        //     localStorage.getItem("loginUserName") == ""
        // ) {
        //     this.router.navigate(["login"]);
        // } else if (
        //     localStorage.getItem("loginUserName").toLowerCase() ==
        //         "jmassalha" ||
        //     localStorage.getItem("loginUserName").toLowerCase() == "samer" ||
        //     localStorage.getItem("loginUserName").toLowerCase() == "owertheim"
        // ) {
        // } else {
        //     this.router.navigate(["login"]);
        //     ///$("#chadTable").DataTable();
        // }
        this.getDropDownFromServer();
        this.getEmployeesForLabelPrint();
        //this.cdRef.detectChanges();
    }
    ClearMershmData() {
        ////////debugger
        this.rows = this.formBuilder.array([]);
        this.PrespictionFormRow = this.formBuilder.group({
            SrcPresRows: this.rows,
        });
        this.PrespictionForm = this.formBuilder.group({
            weightVal: [null, Validators.required],
            heightVal: [null, Validators.required],
            areaVal: [{ value: "0", disabled: false }, false],
            targetAUCVal: ["", false],
            levelVal: ["", false],
            diagnosisVal: ["", false],
            protocolVal: ["", false],
            frequencyVal: ["", false],
            courseNumVal: ["", false],
            takedateIN: [null, Validators.required],
            regesterdateIN: [
                new FormControl(new Date()).value,
                Validators.required,
            ],
            rowIdVal: [this.ROW_ID_PRE, false],
            SensitivityVal: [false, Validators.required],
            MedicationSensitivityVal: [
                "",
                [Validators.required, Validators.pattern("[A-Za-z0-9 ]*")],
            ],
            statusRowVal: [false, false],
            statusNotToDo: [false, false],
        });
        //////debugger
        this.updateView();
        //////debugger
    }
    checkIfCarboplatin($event) {
        // ////////debugger

        this.Carboplatin = false;
        var hasCarboplatin = false;
        for (var i = 0; i < this.rows.value.length; i++) {
            var arr = this.rows.value[i].MedListVal.split("___");
            var d = this.MedList.findIndex((obj) => {
                return obj.value === arr[0];
            });
            if (d >= 0) {
                this.rows.value[i].groupID = this.MedList[d].groupID;
            }

            if (arr[0] === "I.CARBOPLATIN") {
                hasCarboplatin = true;
            }
        }
        if (hasCarboplatin) {
            this.Carboplatin = true;
            this.PrespictionForm.controls.levelVal.setValidators([
                Validators.required,
            ]);
            this.PrespictionForm.controls.levelVal.updateValueAndValidity();
            this.PrespictionForm.controls.targetAUCVal.setValidators([
                Validators.required,
            ]);
            this.PrespictionForm.controls.targetAUCVal.updateValueAndValidity();
        } else {
            this.PrespictionForm.controls.targetAUCVal.setValidators(null);
            this.PrespictionForm.controls.targetAUCVal.updateValueAndValidity();
            this.PrespictionForm.controls.levelVal.setValidators(null);
            this.PrespictionForm.controls.levelVal.updateValueAndValidity();
            this.Carboplatin = false;
        }
        this.calcPres();
    }
    calcPres() {
        for (var i = 0; i < this.rows.value.length; i++) {
            ////////////////debugger
            var arr = this.rows.value[i].MedListVal.split("___");
            var d = this.MedList.findIndex((obj) => {
                return obj.value === arr[0];
            });
            if (d >= 0) {
                this.rows.value[i].groupID = this.MedList[d].groupID;
            }
            if (
                this.rows.value[i].groupID != "" &&
                this.rows.value[i].groupID != null
            ) {
                ////////////////debugger
                if (
                    this.rows.value[i].MenonValVal === "" ||
                    this.rows.value[i].MenonValVal == null
                ) {
                    this.rows.value[i].MenonValVal = 0;
                }
                switch (this.rows.value[i].groupID) {
                    case "1":
                        break;
                    case "2":
                    case "5":
                        this.rows.controls[i]["controls"].MenonCalcVal.setValue(
                            (
                                parseFloat(this.PrespictionForm.value.areaVal) *
                                parseFloat(this.rows.value[i].MenonValVal)
                            ).toFixed(1)
                        );
                        break;
                    case "3":
                    case "6":
                    case "7":
                        this.rows.controls[i]["controls"].MenonCalcVal.setValue(
                            (
                                parseFloat(
                                    this.PrespictionForm.value.weightVal
                                ) * parseFloat(this.rows.value[i].MenonValVal)
                            ).toFixed(1)
                        );
                        break;
                    case "4":
                        switch (this.GENDER) {
                            case "זכר":
                                this.calcByGender = 1;
                                break;
                            default:
                                this.calcByGender = 0.85;
                        }
                        var AgeX =
                            (((140 - parseFloat(this.AGE)) *
                                parseFloat(
                                    this.PrespictionForm.value.weightVal
                                )) /
                                (72 *
                                    parseFloat(
                                        this.PrespictionForm.value.levelVal
                                    ))) *
                            this.calcByGender;
                        //     this.PrespictionForm.value.weightVal
                        // )
                        //     ) ;
                        // (((parseFloat(
                        //     this.PrespictionForm.value.weightVal
                        // )
                        //     ) *
                        //     (140 - parseFloat(this.AGE))) /
                        //     72*parseFloat(
                        //         this.PrespictionForm.value.levelVal
                        //     )) *
                        // this.calcByGender;

                        //debugger;
                        this.rows.controls[i]["controls"].MenonCalcVal.setValue(
                            (
                                parseFloat(
                                    this.PrespictionForm.value.targetAUCVal
                                ) *
                                (AgeX + 25)
                            ).toFixed(1)
                        );
                        break;
                    default:
                        this.rows.controls[i]["controls"].MenonCalcVal.setValue(
                            ""
                        );
                }
            }
        }
        this.updateView();

        this.tableDataPresPrint = this.rows.value;
        this.tableDataSrcPresPrint = new MatTableDataSource(
            this.tableDataPresPrint
        );
    }
    openSnackBar(AlertTxt, Type) {
        // //////debugger
        this._snackBar.open(AlertTxt, "", {
            duration: 2500,
            direction: "rtl",
            panelClass: Type,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
        });
    }
    delete(c, type) {
        //  ////////////////debugger
        if (type == "true") {
            var d = this.rows.value.findIndex((obj) => {
                return obj.rowIdPreVal === this.DeleteRowId;
            });
            //////////////debugger
            if (this.rows.value[d].newRow == "false") {
                this.http
                    .post(
                        environment.url + "DeletePresRowInside",
                        {
                            _rowID: this.DeleteRowId,
                        }
                    )
                    .subscribe((Response) => {
                        //this.getReport("");
                        setTimeout(function () {
                            // $("#loader").addClass("d-none");
                            //this.DeleteRowId = "";
                            //this.openSnackBar("נמחק בהצלחה", "success");
                        }, 500);
                    });
            }

            this.rows.removeAt(d);
            this.updateView();
            this.tableDataPresPrint = this.rows.value;
            this.tableDataSrcPresPrint = new MatTableDataSource(
                this.tableDataPresPrint
            );
            this.DeleteRowId = "";
        } else {
            this.DeleteRowId = "";
        }
        c("close modal");
        // //////////////////debugger
        // this.modalService._modalStack._windowCmpts[1].dismiss()
    }
    getPermission() {
        this.http
            .post(
                environment.url + "selectPermission",
                {
                    _UserName: localStorage.getItem("loginUserName"),
                }
            )
            .subscribe((Response) => {
                // //////////debugger
                var json = JSON.parse(Response["d"]);
                switch (json) {
                    case 0:
                    case "0":
                        break;
                    case 1:
                    case "1":
                        break;
                    case "2":
                    case 2:
                        this.ShowPerm = false;
                        this.prem = false;
                        this.displayedColumns = [
                            "PerscriptionID",
                            "RegistrationDate",
                            "DateAdministrationMed",
                            "Prognosis",
                            "ProtocolTreatment",
                            "Status",
                            "D_CLICK",
                        ];
                        break;
                    case "3":
                    case 3:
                        this.prem = false;
                        this.ShowPerm = false;
                        this.displayedColumns = [
                            "PerscriptionID",
                            "RegistrationDate",
                            "DateAdministrationMed",
                            "Prognosis",
                            "ProtocolTreatment",
                            "Status",
                            "D_CLICK",
                        ];
                        break;
                    default:
                        localStorage.clear();
                        this.router.navigate(["login"]);
                }
                setTimeout(function () {
                    // $("#loader").addClass("d-none");
                    //this.DeleteRowId = "";
                    //this.openSnackBar("נמחק בהצלחה", "success");
                }, 500);
            });
    }
    closrModal(c) {
        c("close modal");
    }
    deleteRow(content, _type, _element, rowIdx) {
        this.ArrayDrus.splice(rowIdx, 1);
        this.DeleteRowId = _element.value.rowIdPreVal;
        this.modalOptions = {
            windowClass: "custom-class",
        };
        this.modalService.open(content, this.modalOptions).result.then(
            (result) => {
                this.closeResult = `Closed with: ${result}`;
                ////////////////////////////debugger
                if ("Save" == result) {
                    // //////////////////////////debugger;
                    //this.saveChad(_element.ROW_ID);
                }
            },
            (reason) => {
                this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
            }
        );
        this.modalOptions = {};
    }

    deletePerRow(content, _type, _element) {
        //  //////////////debugger
        //////////////////debugger
        this.DeletePreRowId = _element.PerscriptionID;
        this.modalOptions = {
            windowClass: "custom-class",
        };
        this.modalService.open(content, this.modalOptions).result.then(
            (result) => {
                this.closeResult = `Closed with: ${result}`;
                ////////////////////////////debugger
                if ("Save" == result) {
                    // //////////////////////////debugger;
                    //this.saveChad(_element.ROW_ID);
                }
            },
            (reason) => {
                this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
            }
        );
        this.modalOptions = {};
    }
    deletePre(c, type) {
        c("close modal");
        if ($("#loader").hasClass("d-none")) {
            $("#loader").removeClass("d-none");
        }
        this.http
            .post(environment.url + "DeletePresRow", {
                _rowID: this.DeletePreRowId,
            })
            .subscribe((Response) => {
                this.getReport("");
                setTimeout(function () {
                    $("#loader").addClass("d-none");
                    this.DeletePreRowId = null;
                }, 500);

                this.openSnackBar("נמחק בהצלחה", "success");
            });
    }

    printRowInside() {
        //////////debugger
        this.editRow(null, null, this.rowElementPres, "false");
        setTimeout(function () {
            var head =
                document.head || document.getElementsByTagName("head")[0];
            var style = document.createElement("style");
            style.type = "text/css";
            style.media = "print";
            var landscape = true;
            style.appendChild(
                document.createTextNode(
                    landscape
                        ? "@page { size: A4 landscape; margin: 0in;}"
                        : "@page { size: A4;  margin: 0in; }"
                )
            );

            head.appendChild(style);
            window.print();
            setTimeout(function () {
                head.removeChild(style);
            }, 500);
        }, 1000);
    }
    printRow(element) {
        this.editRow(null, null, element, "false");
        setTimeout(function () {
            window.print();
        }, 1000);
    }
    openRowLabelPrint(content, rowIdx) {
        if (!this.rows || !this.rows.at(rowIdx)) {
            return;
        }
        this.selectedRowForPrint = (this.rows.at(rowIdx) as FormGroup).getRawValue();
        this.rowLabelSubmitted = false;
        this.rowLabelForm.patchValue({
            preparationTime: this.getCurrentTimeValue(),
            preparerEmployeeId: "",
            checkerEmployeeId: "",
        });
        this.modalService.open(content, {
            windowClass: "row-label-print-modal",
            backdrop: "static",
        });
    }
    printSelectedRowLabel(modal) {
        this.rowLabelSubmitted = true;
        if (
            !this.rowLabelForm ||
            this.rowLabelForm.invalid ||
            !this.selectedRowForPrint
        ) {
            return;
        }
        const printWindow = window.open(
            "",
            "_blank",
            "width=480,height=720"
        );
        if (!printWindow) {
            this.openSnackBar("לא ניתן לפתוח חלון הדפסה", "error");
            return;
        }
        printWindow.document.open();
        printWindow.document.write(this.buildRowLabelHtml());
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
        modal.close("print");
    }
    formatDate(date) {
        var d = date,
            month = "" + (d.getMonth() + 1),
            day = "" + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = "0" + month;
        if (day.length < 2) day = "0" + day;

        return [day, month, year].join("/");
    }
    private resolvePatientId(): string {
        const currentId = String(this.ID || "").trim();
        if (currentId !== "") {
            this.ID = currentId;
            return currentId;
        }
        const fallbackId = String(this.ID_In || "").trim();
        if (fallbackId !== "") {
            this.ID = fallbackId;
            return fallbackId;
        }
        const searchId = String(this.patiant_number_or_id || "").trim();
        if (searchId !== "") {
            this.ID = searchId;
            return searchId;
        }
        return "";
    }
    private getCurrentTimeValue(): string {
        const now = new Date();
        const hours =
            now.getHours() < 10
                ? "0" + now.getHours().toString()
                : now.getHours().toString();
        const minutes =
            now.getMinutes() < 10
                ? "0" + now.getMinutes().toString()
                : now.getMinutes().toString();
        return hours + ":" + minutes;
    }
    private getCurrentPreparationDate(): string {
        if (!this.PrespictionForm) {
            return "";
        }
        const takeDate = this.PrespictionForm.get("takedateIN")
            ? this.PrespictionForm.get("takedateIN").value
            : "";
        return this.formatLabelDate(takeDate);
    }
    private formatLabelDate(value): string {
        if (!value) {
            return "";
        }
        if (value instanceof Date) {
            return this.formatDate(value);
        }
        const stringValue = String(value).trim();
        if (stringValue === "") {
            return "";
        }
        if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(stringValue)) {
            return stringValue.replace(/-/g, "/");
        }
        const parsedDate = new Date(stringValue);
        if (isNaN(parsedDate.getTime())) {
            return stringValue;
        }
        return this.formatDate(parsedDate);
    }
    private getCurrentPreparationDateValue(): Date {
        if (!this.PrespictionForm || !this.PrespictionForm.get("takedateIN")) {
            return new Date();
        }
        const takeDate = this.PrespictionForm.get("takedateIN").value;
        if (takeDate instanceof Date && !isNaN(takeDate.getTime())) {
            return new Date(
                takeDate.getFullYear(),
                takeDate.getMonth(),
                takeDate.getDate()
            );
        }
        const stringValue = String(takeDate || "").trim();
        const dateParts = stringValue.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
        if (dateParts) {
            return new Date(
                parseInt(dateParts[3], 10),
                parseInt(dateParts[2], 10) - 1,
                parseInt(dateParts[1], 10)
            );
        }
        const parsedDate = new Date(stringValue);
        if (!isNaN(parsedDate.getTime())) {
            return new Date(
                parsedDate.getFullYear(),
                parsedDate.getMonth(),
                parsedDate.getDate()
            );
        }
        return new Date();
    }
    private getPreparationDateTime(preparationTime: string): Date {
        const date = this.getCurrentPreparationDateValue();
        const timeParts = String(preparationTime || "").split(":");
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        date.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
        return date;
    }
    private formatLabelDateTime(date: Date): string {
        if (!date || isNaN(date.getTime())) {
            return "";
        }
        const hours =
            date.getHours() < 10
                ? "0" + date.getHours().toString()
                : date.getHours().toString();
        const minutes =
            date.getMinutes() < 10
                ? "0" + date.getMinutes().toString()
                : date.getMinutes().toString();
        return this.formatDate(date) + " " + hours + ":" + minutes;
    }
    private normalizeDrugName(value): string {
        return String(value || "")
            .split("___")[0]
            .trim()
            .toLowerCase();
    }
    private findDrugMetadataByName(drugName: string): DrugMetadata {
        const normalizedDrugName = this.normalizeDrugName(drugName);
        if (!normalizedDrugName || !this.drugMetadataList) {
            return null;
        }
        return this.drugMetadataList.find((item) => {
            return this.normalizeDrugName(item.MedName) === normalizedDrugName;
        });
    }
    private getDrugMetadata(row: PrescriptionRow): DropOption | DrugMetadata {
        if (!row || !this.MedList) {
            return null;
        }
        const drugValue = String(row.MedListVal || "").split("___")[0];
        const drug = this.MedList.find((item) => {
            return (
                String(item.value || "") === drugValue ||
                String(item.viewValue || "") === drugValue ||
                String(item.name || "") === drugValue
            );
        });
        const metadata =
            this.findDrugMetadataByName(drugValue) ||
            (drug
                ? this.findDrugMetadataByName(
                      drug.value || drug.viewValue || drug.name
                  )
                : null);
        if (drug && metadata) {
            drug.StorageConditions = metadata.StorageConditions;
            drug.ExpireTime = metadata.ExpireTime;
        }
        return metadata || drug;
    }
    getPreparationDateTimeDisplay(): string {
        if (!this.rowLabelForm) {
            return "";
        }
        const formValue = this.rowLabelForm.getRawValue();
        return this.formatLabelDateTime(
            this.getPreparationDateTime(formValue.preparationTime)
        );
    }
    getExpirationDateTimeDisplay(row: PrescriptionRow): string {
        const drug = this.getDrugMetadata(row);
        const expireTime = drug ? parseFloat(String(drug.ExpireTime || "")) : NaN;
        if (isNaN(expireTime)) {
            return "";
        }
        const formValue = this.rowLabelForm ? this.rowLabelForm.getRawValue() : {};
        const expirationDate = this.getPreparationDateTime(
            formValue.preparationTime
        );
        expirationDate.setMinutes(expirationDate.getMinutes() + expireTime * 60);
        return this.formatLabelDateTime(expirationDate);
    }
    getStorageConditionsDisplay(row: PrescriptionRow): string {
        const drug = this.getDrugMetadata(row);
        return drug ? String(drug.StorageConditions || "").trim() : "";
    }
    private getDoseLabel(row: PrescriptionRow): string {
        return [row.finalMenonVal, row.Dosage_UnitVal || row.Dosage_Unit_2_Val]
            .filter((value) => value !== null && value !== undefined && value !== "")
            .join(" ");
    }
    private getFinalVolumeLabel(row: PrescriptionRow): string {
        if (!row || row.Solution_VolumeVal === null || row.Solution_VolumeVal === undefined || row.Solution_VolumeVal === "") {
            return "";
        }
        return String(row.Solution_VolumeVal) + ' מ"ל';
    }
    private getAdministrationRateLabel(row: PrescriptionRow): string {
        if (!row || !row.Duration_Of_DeliveryVal) {
            return "";
        }
        return String(row.Duration_Of_DeliveryVal) + " דקות";
    }
    getPatientFullName(): string {
        return (
            String(this.FIRST_NAME_In || this.FIRST_NAME || "").trim() +
            " " +
            String(this.LAST_NAME_In || this.LAST_NAME || "").trim()
        ).trim();
    }
    private getPatientIdentifier(): string {
        return String(this.ID || this.ID_In || this.patiant_number_or_id || "").trim();
    }
    getPatientIdentifierDisplay(): string {
        return this.getPatientIdentifier();
    }
    getDoseLabelDisplay(row: PrescriptionRow): string {
        if (!row) {
            return "";
        }
        return this.getDoseLabel(row);
    }
    getFinalVolumeLabelDisplay(row: PrescriptionRow): string {
        if (!row) {
            return "";
        }
        return this.getFinalVolumeLabel(row);
    }
    getAdministrationRateLabelDisplay(row: PrescriptionRow): string {
        if (!row) {
            return "";
        }
        return this.getAdministrationRateLabel(row);
    }
    private getEmployeeFullName(employeeId: string): string {
        const employee = this.employees.find(
            (item) => String(item.EmployeeID) === String(employeeId)
        );
        return employee ? employee.FullName : "";
    }
    private getLabelFallbackValue(value: string): string {
        return value && String(value).trim() !== "" ? value : "לא הוגדר";
    }
    private escapeHtml(value): string {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    private buildCode39BarcodeSvg(value: string): string {
        const barcodeValue = String(value || "")
            .trim()
            .toUpperCase()
            .replace(/[^0-9A-Z .$/+%-]/g, "");
        if (!barcodeValue) {
            return "";
        }
        const patterns = {
            "0": "nnnwwnwnn",
            "1": "wnnwnnnnw",
            "2": "nnwwnnnnw",
            "3": "wnwwnnnnn",
            "4": "nnnwwnnnw",
            "5": "wnnwwnnnn",
            "6": "nnwwwnnnn",
            "7": "nnnwnnwnw",
            "8": "wnnwnnwnn",
            "9": "nnwwnnwnn",
            A: "wnnnnwnnw",
            B: "nnwnnwnnw",
            C: "wnwnnwnnn",
            D: "nnnnwwnnw",
            E: "wnnnwwnnn",
            F: "nnwnwwnnn",
            G: "nnnnnwwnw",
            H: "wnnnnwwnn",
            I: "nnwnnwwnn",
            J: "nnnnwwwnn",
            K: "wnnnnnnww",
            L: "nnwnnnnww",
            M: "wnwnnnnwn",
            N: "nnnnwnnww",
            O: "wnnnwnnwn",
            P: "nnwnwnnwn",
            Q: "nnnnnnwww",
            R: "wnnnnnwwn",
            S: "nnwnnnwwn",
            T: "nnnnwnwwn",
            U: "wwnnnnnnw",
            V: "nwwnnnnnw",
            W: "wwwnnnnnn",
            X: "nwnnwnnnw",
            Y: "wwnnwnnnn",
            Z: "nwwnwnnnn",
            "-": "nwnnnnwnw",
            ".": "wwnnnnwnn",
            " ": "nwwnnnwnn",
            "$": "nwnwnwnnn",
            "/": "nwnwnnnwn",
            "+": "nwnnnwnwn",
            "%": "nnnwnwnwn",
            "*": "nwnnwnwnn",
        };
        const narrow = 2;
        const wide = 5;
        const height = 42;
        const quietZone = 10;
        let x = quietZone;
        let bars = "";
        const encodedValue = "*" + barcodeValue + "*";
        for (let charIndex = 0; charIndex < encodedValue.length; charIndex++) {
            const pattern = patterns[encodedValue[charIndex]];
            if (!pattern) {
                continue;
            }
            for (let index = 0; index < pattern.length; index++) {
                const width = pattern[index] === "w" ? wide : narrow;
                if (index % 2 === 0) {
                    bars +=
                        '<rect x="' +
                        x +
                        '" y="0" width="' +
                        width +
                        '" height="' +
                        height +
                        '" />';
                }
                x += width;
            }
            x += narrow;
        }
        const svgWidth = x + quietZone;
        return (
            '<svg class="barcode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
            svgWidth +
            " " +
            height +
            '" preserveAspectRatio="none" aria-label="' +
            this.escapeHtml(barcodeValue) +
            '"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">' +
            bars +
            "</g></svg>"
        );
    }
    private buildLabelSectionHtml(
        items: Array<{ label: string; value?: string; valueHtml?: string }>,
        columnCount: number
    ): string {
        const cellsHtml = items.map((item) => this.buildLabelCellHtml(item)).join("");
        return (
            '<div class="label-section label-section--' +
            columnCount +
            '">' +
            cellsHtml +
            "</div>"
        );
    }
    private buildLabelCellHtml(
        item: { label: string; value?: string; valueHtml?: string },
        extraClass: string = ""
    ): string {
        const valueHtml =
            item.valueHtml !== undefined
                ? item.valueHtml
                : this.escapeHtml(item.value || "");
        return (
            '<div class="label-cell' +
            (extraClass ? " " + extraClass : "") +
            '">' +
            '<div class="label-title">' +
            this.escapeHtml(item.label) +
            "</div>" +
            '<div class="label-value">' +
            valueHtml +
            "</div>" +
            "</div>"
        );
    }
    private buildPatientDrugSectionHtml(
        patientName: string,
        patientId: string,
        drugName: string,
        preparerName: string,
        checkerName: string
    ): string {
        return (
            '<div class="label-section label-section--middle">' +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({
                label: "שם מטופל",
                value: patientName,
            }) +
            this.buildLabelCellHtml({
                label: "ת.ז",
                value: patientId,
            }) +
            "</div>" +
            '<div class="label-column label-column--drug">' +
            this.buildLabelCellHtml(
                {
                    label: "שם תרופה",
                    value: drugName,
                },
                "label-cell--drug"
            ) +
            "</div>" +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({
                label: "שם מכין",
                value: preparerName,
            }) +
            this.buildLabelCellHtml({
                label: "שם בודק",
                value: checkerName,
            }) +
            "</div>" +
            "</div>"
        );
    }
    private buildRowLabelHtml(): string {
        const row = this.selectedRowForPrint;
        const formValue = this.rowLabelForm.getRawValue();
        const batchNumber = String(row.rowIdPreVal || "").trim();
        const barcodeHtml = this.buildCode39BarcodeSvg(batchNumber);
        const preparerName = this.getLabelFallbackValue(
            this.getEmployeeFullName(formValue.preparerEmployeeId)
        );
        const checkerName = this.getLabelFallbackValue(
            this.getEmployeeFullName(formValue.checkerEmployeeId)
        );
        // Top section: 3 equal columns — (שם מוסד + מכין) | (מספר אצווה + שעה ותאריך) | (ברקוד + בדק)
        const topSectionHtml =
            '<div class="label-section label-section--3">' +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({ label: "שם מוסד", value: "בית מרקחת מרכז רפואי צפון" }) +
            this.buildLabelCellHtml({ label: "מכין", value: preparerName }) +
            "</div>" +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({ label: "מספר אצווה", value: this.getLabelFallbackValue(batchNumber) }) +
            this.buildLabelCellHtml({ label: "שעה ותאריך", value: this.getLabelFallbackValue(this.getPreparationDateTimeDisplay()) }) +
            "</div>" +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({ label: "ברקוד", valueHtml: barcodeHtml || this.escapeHtml("לא הוגדר") }) +
            this.buildLabelCellHtml({ label: "בדק", value: checkerName }) +
            "</div>" +
            "</div>";
        // Middle section: 25/50/25 — (שם מטופל + מינון + תמיסה) | (שם תרופה) | (ת.ז + דרך מתן + נפח סופי)
        const middleSectionHtml =
            '<div class="label-section label-section--middle">' +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({ label: "שם מטופל", value: this.getLabelFallbackValue(this.getPatientFullName()) }) +
            this.buildLabelCellHtml({ label: "מינון", value: this.getLabelFallbackValue(this.getDoseLabel(row)) }) +
            this.buildLabelCellHtml({ label: "תמיסה", value: this.getLabelFallbackValue(row.SolutionVal) }) +
            "</div>" +
            '<div class="label-column label-column--drug">' +
            this.buildLabelCellHtml({ label: "שם תרופה", value: this.getLabelFallbackValue(row.MedListVal) }, "label-cell--drug") +
            "</div>" +
            '<div class="label-column label-column--stack">' +
            this.buildLabelCellHtml({ label: "ת.ז", value: this.getLabelFallbackValue(this.getPatientIdentifier()) }) +
            this.buildLabelCellHtml({ label: "דרך מתן", value: this.getLabelFallbackValue(row.Way_Of_ProvidingVal) }) +
            this.buildLabelCellHtml({ label: "נפח סופי", value: this.getLabelFallbackValue(this.getFinalVolumeLabel(row)) }) +
            "</div>" +
            "</div>";
        // Bottom section: 3 equal flat cells — תאריך ושעת תפוגה | קצב מתן | חתימת אחות/אח
        const bottomSectionHtml = this.buildLabelSectionHtml([
            { label: "תאריך ושעת תפוגה", value: this.getLabelFallbackValue(this.getExpirationDateTimeDisplay(row)) },
            { label: "קצב מתן", value: this.getLabelFallbackValue(this.getAdministrationRateLabel(row)) },
            { label: "תנאי אחסון", value: this.getLabelFallbackValue(this.getStorageConditionsDisplay(row)) },
        ], 3);
        const labelSectionsHtml = topSectionHtml + middleSectionHtml + bottomSectionHtml;
        return (
            '<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8" />' +
            "<title>מדבקת הכנה</title>" +
            "<style>" +
            "body{font-family:Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;}" +
            ".label-card{padding:0;width:81mm;height:69.5mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;}" +
            ".label-section{display:grid;gap:0;flex:1 1 0;min-height:0;}" +
            ".label-section:first-child{height:2cm;min-height:2cm;max-height:2cm;flex:0 0 2cm;overflow:hidden;}" +
            ".label-section:first-child .label-cell{justify-content:center;align-items:center;text-align:center;}" +
            ".label-section--3{grid-template-columns:repeat(3,1fr);}" +
            ".label-section--4{grid-template-columns:repeat(4,1fr);}" +
            ".label-section--middle{grid-template-columns:25% 50% 25%;}" +
            ".label-column{display:flex;flex-direction:column;min-width:0;}" +
            ".label-column--stack .label-cell{flex:1 1 0;min-height:0;}" +
            ".label-column--drug .label-cell{flex:1 1 0;justify-content:center;}" +
            ".label-cell--drug .label-title{font-size:11px;}" +
            ".label-cell--drug .label-value{font-size:11px;font-weight:700;line-height:1.1;}" +
            ".label-cell{padding:2px 3px;box-sizing:border-box;text-align:center;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:2px;overflow:hidden;}" +
            ".label-title{font-weight:700;font-size:9px;line-height:1.1;}" +
            ".label-value{font-size:9px;line-height:1.1;word-break:break-word;}" +
            ".barcode{display:block;width:100%;height:28px;margin:0 auto;}" +
            "@page{size:85mm 75mm;margin:3.5mm 2mm 2mm;}" +
            "</style></head><body>" +
            '<div class="label-card">' +
            labelSectionsHtml +
            "</div></body></html>"
        );
    }

    saveAndClose() {
        this.PrespictionForm.value.statusRowVal = true;
        this.loadModalAfterClose = true;
    }
    checkMyValue(ele, rowIdx) {
        // //debugger
        var MenonCalcVal = this.rows.value[rowIdx].MenonCalcVal;
        var _f5ivePre =
            (parseFloat(this.rows.value[rowIdx].MenonCalcVal) * 5) / 100;
        if (parseFloat(ele) - _f5ivePre > parseFloat(MenonCalcVal)) {
            this.rows.controls[rowIdx]["controls"]["noteVal"].setValidators([
                Validators.required,
            ]);
            this.rows.controls[rowIdx]["controls"][
                "noteVal"
            ].updateValueAndValidity();
        } else if (parseFloat(ele) + _f5ivePre < parseFloat(MenonCalcVal)) {
            this.rows.controls[rowIdx]["controls"]["noteVal"].setValidators([
                Validators.required,
            ]);
            this.rows.controls[rowIdx]["controls"][
                "noteVal"
            ].updateValueAndValidity();
        } else {
            this.rows.controls[rowIdx]["controls"]["noteVal"].setValidators(
                null
            );
            this.rows.controls[rowIdx]["controls"][
                "noteVal"
            ].updateValueAndValidity();
        }
        ////debugger
    }
    editRow(content, _type, _element, openModal) {
        this.FIRST_NAME_In = _element.PatientFirstName;
        this.LAST_NAME_In = _element.PatientLastName;
        this.MID_NAME_In = _element.FatherName;
        this.ID_In = _element.ID;
        this.GENDER_In = _element.sex;
        this.AGE_In = _element.Age;
        this.KUPA_In = _element.Kupa;
        this.Case_Number_In = _element.Case_Number;
        this.Depart_In = _element.Depart;
        this.Seode_Depart_In = _element.Seode_Depart;

        this.ROW_ID_PRE = _element.PerscriptionID;
        this.rowElementPres = _element;
        //////////////////debugger;
        // this.PrespictionFormRow = this.formBuilder.group({
        //     noteVal: ["", false],
        //     Dosage_UnitVal: ["", false],
        //     Dosage_Unit_2_Val: ["", false],
        //     finalMenonVal: ["", false],
        //     Duration_Of_DeliveryVal: ["", false],
        //     Solution_VolumeVal: ["", false],
        //     SolutionVal: ["", false],
        //     MenonValVal: ["", false],
        //     Way_Of_ProvidingVal: ["", false],
        //     Days_ProtocolVal: ["", false],
        //     MenonCalcVal: [{value:"", disabled: true}, false],
        //     MedListVal: ["", false],
        //     rowIdPreVal: [this.ROW_ID_IN_TABLE + 1, false],
        // });
        this.SensitivityBool = false;
        var _status = false;
        var _statusNotToDo = false;
        this.dis = false;
        $(document).find("#prespictionsDetailsBtn").removeClass("d-none");
        $(document).find("#submitAll").removeClass("d-none");
        if (_element.Status == "שמור") {
            this.dis = _status = false;
            this.isButtonVisible = true;
            this.showCopyBtn = true;
            this.isCanceldVisible = false;
            // debugger
            if (!_element.hideOrShow) {
                this.dis = _status = true;
            }
        } else if (_element.Status == "נעול") {
            this.dis = _status = true;
            this.showCopyBtn = true;
            this.isButtonVisible = false;
            this.isCanceldVisible = false;
            ////////////////////debugger
        } else {
            this.showCopyBtn = false;
            this.dis = true;
            this.isCanceldVisible = true;
            this.isButtonVisible = false;
        }
        if (_element.statusNotToDo == "1") {
            _statusNotToDo = true;
        }
        var _requerd_sen = Validators.required;
        var _requerd_drug = Validators.required;
        if (_element.SensitivityUnknown.toLowerCase().trim() == "true") {
            this.SensitivityBool = true;
            _requerd_sen = Validators.required;
            _requerd_drug = null;
        } else {
            _requerd_sen = null;
            _requerd_drug = Validators.required;
        }
        ////////////////////debugger
        /*
        DateAdministrationMed
        RegistrationDate
        */
        var dateIN = null;
        var dateT = null;
        //////debugger
        if (
            _element.DateAdministrationMed != "" &&
            typeof _element.DateAdministrationMed != "object"
        ) {
            var dArr = _element.DateAdministrationMed.split("-");
            dateT = new FormControl(
                new Date(
                    parseInt(dArr[2]),
                    parseInt(dArr[1]) - 1,
                    parseInt(dArr[0])
                )
            ).value;
        }
        if (
            _element.RegistrationDate != "" &&
            typeof _element.RegistrationDate != "object"
        ) {
            var dArr = _element.RegistrationDate.split("-");
            dateIN = new FormControl(
                new Date(
                    parseInt(dArr[2]),
                    parseInt(dArr[1]) - 1,
                    parseInt(dArr[0])
                )
            ).value;
        }
        this.printForm.weightVal = _element.Weight;
        this.printForm.heightVal = _element.Hight;
        this.printForm.areaVal = Math.sqrt(
            (parseFloat(_element.Weight) * parseFloat(_element.Hight)) / 3600
        ).toFixed(1);
        this.printForm.targetAUCVal = _element.TargetAUC;
        this.printForm.levelVal = _element.CreatinineLevel;
        this.printForm.diagnosisVal = _element.Prognosis;
        this.printForm.protocolVal = _element.ProtocolTreatment;
        this.printForm.frequencyVal = _element.Frequency;
        this.printForm.courseNumVal = _element.CourseNum;
        if (dateT != null && dateT != "") {
            this.printForm.takedateIN = this.formatDate(dateT);
        } else {
            this.printForm.takedateIN = null;
        }

        this.printForm.regesterdateIN = this.formatDate(dateIN);
        this.printForm.SensitivityVal = this.SensitivityBool;
        this.printForm.MedicationSensitivityVal =
            _element.MedicationSensitivity;
        this.printForm.statusRowVal = _status;
        // //////////debugger
        this.PrespictionForm = this.formBuilder.group({
            weightVal: [
                { value: _element.Weight, disabled: this.dis },
                Validators.required,
            ],
            heightVal: [
                { value: _element.Hight, disabled: this.dis },
                Validators.required,
            ],
            areaVal: [
                {
                    value: Math.sqrt(
                        (parseFloat(_element.Weight) *
                            parseFloat(_element.Hight)) /
                            3600
                    ).toFixed(1),
                    disabled: false,
                },
                false,
            ],
            targetAUCVal: [
                { value: _element.TargetAUC, disabled: this.dis },
                false,
            ],
            levelVal: [
                { value: _element.CreatinineLevel, disabled: this.dis },
                false,
            ],
            diagnosisVal: [
                { value: _element.Prognosis, disabled: this.dis },
                Validators.required,
            ],
            protocolVal: [
                { value: _element.ProtocolTreatment, disabled: this.dis },
                Validators.required,
            ],
            frequencyVal: [
                { value: _element.Frequency, disabled: this.dis },
                false,
            ],
            courseNumVal: [
                { value: _element.CourseNum, disabled: this.dis },
                false,
            ],
            takedateIN: [
                { value: dateT, disabled: this.dis },
                Validators.required,
            ],
            regesterdateIN: [
                { value: dateIN, disabled: this.dis },
                Validators.required,
            ],
            rowIdVal: [
                { value: _element.PerscriptionID, disabled: false },
                false,
            ],
            SensitivityVal: [
                { value: this.SensitivityBool, disabled: this.dis },
                _requerd_sen,
            ],
            MedicationSensitivityVal: [
                { value: _element.MedicationSensitivity, disabled: this.dis },
                _requerd_drug,
            ],
            statusRowVal: [{ value: _status, disabled: this.dis }, false],
            statusNotToDo: [{ value: _statusNotToDo, disabled: false }, false],
        });
        this.PresRowIdVal = _element.PerscriptionID;
        ////////////////////debugger

        this.getPresFromServer(_element.PerscriptionID);
        if (openModal == "true") {
            this.modalService
                .open(content, {
                    windowClass: "width-1010",
                    backdrop: "static",
                    keyboard: false,
                })
                .result.then(
                    (result) => {
                        this.closeResult = `Closed with: ${result}`;
                        ////////////////////////////debugger
                        if ("Save" == result) {
                            // //////////////////////////debugger;
                            //this.saveChad(_element.ROW_ID);
                        }
                    },
                    (reason) => {
                        this.closeResult = `Dismissed ${this.getDismissReason(
                            reason
                        )}`;
                    }
                );
        }
        /*
         */
        //if ($("#loader").hasClass("d-none")) {
        $("#loader").addClass("d-none");
        //}
    }
    copyRowPres(element) {
        if ($("#loader").hasClass("d-none")) {
            $("#loader").removeClass("d-none");
        }
        this.PrespictionForm.enable();
        this.rows.enable();
        // ////////debugger
        // return
        for (var i = 0; i < this.rows.value.length; i++) {
            this.rows.value[i]["Days_ProtocolVal"] =
                this.rows.value[i]["Days_ProtocolVal"].join(",");
        }
        //debugger
        var copyParent = this.PrespictionForm.value;
        var copyrows = this.rows.value;

        copyParent.statusRowVal = "false";
        copyParent.rowIdVal = "-100";
        var dateNow = new FormControl(new Date()).value;
        //////debugger
        copyParent.regesterdateIN = dateNow;
        copyParent.takedateIN = null;
        //////debugger
        for (var i = 0; i < copyrows.length; i++) {
            //////////debugger;
            copyrows[i].newRow = "true";
            copyrows[i].rowIdPreVal = -1 * i;
        }
        if (copyParent.takedateIN) {
            copyParent.takedateIN = formatDate(
                copyParent.takedateIN,
                "yyyy-MM-dd",
                "en-US"
            );
        }
        copyParent.regesterdateIN = formatDate(
            copyParent.regesterdateIN,
            "yyyy-MM-dd",
            "en-US"
        );
        if (copyParent.statusNotToDo) {
            copyParent.statusNotToDo = "1";
        } else {
            copyParent.statusNotToDo = "0";
        }
        var ParentFrom = copyParent;
        var tableFrom = copyrows;
        //debugger
        //return
        var patientId = this.resolvePatientId();
        this.http
            .post(
                environment.url + "SubmitPrecpiction",
                {
                    //.post(environment.url + "SubmitPrecpiction", {
                    ParentFrom: ParentFrom,
                    tableFrom: tableFrom,
                    patientId: patientId,
                    loginUserName: localStorage
                        .getItem("loginUserName")
                        .toLowerCase(),
                }
            )
            .subscribe((Response) => {
                this.openSnackBar("נשמר בהצלחה", "success");
                this.loadModalAfterCopy = true;
                this.getReport("");
                this.modalService.dismissAll();
            });
    }
    clearForm() {
        this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
        this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
        this.resultsLength = 0;
        this.fliterVal = "";
        this.patiant_number_or_id = "";
        this.ID = "";
        this.ID_In = "";
        $(document).find("#demographData").addClass("d-none");
    }
    public applyFilterSearch(value, index, element) {
        this.elementRef.nativeElement = document.getElementById(
            "singleSelect" + index
        );
        // ////debugger
        this.filterdDataArray = [];
        this.search(value, index);
    }
    search(value: string, index) {
        let filter = value.toLowerCase();
        for (let i = 0; i < this.MedListConst.length; i++) {
            let option = this.MedListConst[i];
            if (option.viewValue.toLowerCase().indexOf(filter) >= 0) {
                this.filterdDataArray.push(option);
            }
        }
        this.ArrayDrus[index] = this.filterdDataArray;
        //////////////////debugger
    }

    editRowPre(content, _type, _element) {
        this.EDIT_ROW = true;
        ////////////////////debugger
        // this.PrespictionFormRow = this.formBuilder.group({
        //     noteVal: [{value:_element.noteVal, disabled: this.dis}, false],
        //     Dosage_UnitVal: [{value:_element.Dosage_UnitVal, disabled: this.dis}, false],
        //     Dosage_Unit_2_Val: [{value:_element.Dosage_Unit_2_Val, disabled: this.dis}, false],
        //     finalMenonVal: [{value:_element.finalMenonVal, disabled: this.dis}, false],
        //     Duration_Of_DeliveryVal: [{value:_element.Duration_Of_DeliveryVal, disabled: this.dis}, false],
        //     Solution_VolumeVal: [{value:_element.Solution_VolumeVal, disabled: this.dis}, false],
        //     SolutionVal: [{value:_element.SolutionVal, disabled: this.dis}, false],
        //     MenonValVal: [{value:_element.MenonValVal, disabled: this.dis}, false],
        //     MenonCalcVal: [{value:_element.MenonCalcVal, disabled: this.dis}, false],
        //     Way_Of_ProvidingVal: [{value:_element.Way_Of_ProvidingVal, disabled: this.dis}, false],
        //     Days_ProtocolVal: [{value:_element.Days_ProtocolVal, disabled: this.dis}, false],
        //     MedListVal: [{value:_element.MedListVal, disabled: this.dis}, false],
        //     rowIdPreVal: [{value:_element.rowIdPreVal, disabled: this.dis}, false],
        // });
        //debugger
        this.modalService.open(content, this.modalOptions).result.then(
            (result) => {
                this.closeResult = `Closed with: ${result}`;
                ////////////////////////////debugger
                if ("Save" == result) {
                    // //////////////////////////debugger;
                    //this.saveChad(_element.ROW_ID);
                }
            },
            (reason) => {
                this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
            }
        );
    }

    changeActiveNo($event) {
        //////////////debugger;
        if ($event.checked) {
            this.Sensitivity = "1";
            this.PrespictionForm.controls.MedicationSensitivityVal.setValidators(
                null
            );
        } else {
            this.Sensitivity = "0";
            this.PrespictionForm.controls.MedicationSensitivityVal.setValidators(
                [Validators.required, Validators.pattern("[A-Za-z0-9]*")]
            );
        }
        this.PrespictionForm.controls.MedicationSensitivityVal.updateValueAndValidity();
    }
    changeActive($event) {
        if ($event.checked) {
            this.Sensitivity = "1";
        } else {
            this.Sensitivity = "0";
        }
    }
    changeActiveAndSave($event, _element) {
        // //debugger
        if ($event.checked) {
            $event = "1";
        } else {
            $event = "0";
        } ////debugger
        this.http
            .post(
                environment.url + "SubmitPrecpictionNotToServe",
                {
                    status: $event,
                    patientId: _element.ROW_ID_PRE,
                    loginUserName: localStorage
                        .getItem("loginUserName")
                        .toLowerCase(),
                }
            )
            .subscribe((Response) => {
                this.openSnackBar("נשמר בהצלחה", "success");
                this.getReport("");
                // if ($("#loader").hasClass("d-none")) {
                // $("#loader").addClass("d-none");
                // }
            });
    }
    onSubmit() {
        ////debugger
        ////////////////////debugger
        this.submitted = true;
        ////////////////////////////debugger
        // stop here if form is invalid
        ////debugger
        if (this.PrespictionForm.invalid || this.rows.invalid) {
            this.openSnackBar(
                "נא למלא את כל השדות המסומנים באדום",
                "error-font-gib"
            );
            return;
        }

        if ($("#loader").hasClass("d-none")) {
            $("#loader").removeClass("d-none");
        }
        if (this.PrespictionForm.value.statusRowVal) {
            this.PrespictionForm.value.statusRowVal = "true";
        } else {
            this.PrespictionForm.value.statusRowVal = "false";
        }
        if (this.PrespictionForm.value.statusNotToDo) {
            this.PrespictionForm.value.statusNotToDo = "1";
        } else {
            this.PrespictionForm.value.statusNotToDo = "0";
        }
        //this.PrespictionForm.value.regesterdateIN.setDate(this.PrespictionForm.value.regesterdateIN.getDate() + 1)
        //this.PrespictionForm.value.takedateIN.setDate(this.PrespictionForm.value.takedateIN.getDate() + 1)

        this.PrespictionForm.value.takedateIN = formatDate(
            this.PrespictionForm.value.takedateIN,
            "yyyy-MM-dd",
            "en-US"
        );
        this.PrespictionForm.value.regesterdateIN = formatDate(
            this.PrespictionForm.value.regesterdateIN,
            "yyyy-MM-dd",
            "en-US"
        );
        //this.PrespictionForm.value.statusRowVal = ;
        var ParentFrom = this.PrespictionForm.value;
        for (var i = 0; i < this.rows.value.length; i++) {
            this.rows.value[i]["Days_ProtocolVal"] =
                this.rows.value[i]["Days_ProtocolVal"].join(",");
        }
        var tableFrom = this.rows.value;
        var patientId = this.resolvePatientId();
        //return
        // //////////debugger
        this.http
            .post(
                environment.url + "SubmitPrecpiction",
                //environment.url + "SubmitPrecpiction",
                {
                    //  .post(environment.url + "SubmitPrecpiction", {
                    //    prentFromId: '',
                    ParentFrom: ParentFrom,
                    tableFrom: tableFrom,
                    patientId: patientId,
                    loginUserName: localStorage
                        .getItem("loginUserName")
                        .toLowerCase(),
                }
            )
            .subscribe((Response) => {
                this.openSnackBar("נשמר בהצלחה", "success");
                this.getReport("");
                // if ($("#loader").hasClass("d-none")) {
                // $("#loader").addClass("d-none");
                // }
            });
        // display form values on success
        //alert('SUCCESS!! :-)\n\n' + JSON.stringify(this.PrespictionForm.value, null, 4));
        this.modalService.dismissAll();
    }

    onSubmitRow() {
        // return "";
    }
    getReport($event: any): void {
        ////////////////////////debugger
        const filterValue = (this.fliterVal || "").trim();
        if (filterValue !== "") {
            this.fliterVal = filterValue;
            this.patiant_number_or_id = filterValue;
            this.getTableFromServer(
                this.paginator.pageIndex,
                50,
                filterValue
            );
        } else {
            this.openSnackBar("נא להזין תעודת זהות", "error-font-gib");
        }
    }
    applyFilter(filterValue: string) {
        const trimmedValue = (filterValue || "").trim();
        this.fliterVal = trimmedValue;
        this.patiant_number_or_id = trimmedValue;
        if (trimmedValue === "") {
            this.clearForm();
            return;
        }
        this.getTableFromServer(
            this.paginator.pageIndex,
            this.paginator.pageSize,
            trimmedValue
        );

        //this.dataSource.filter = filterValue.trim().toLowerCase();
    }
    calcArea(event) {
        this.heightVal = parseFloat(
            this.PrespictionForm.value.heightVal
        ).toFixed(1);
        this.weightVal = parseFloat(
            this.PrespictionForm.value.weightVal
        ).toFixed(1);
        if (this.heightVal == "NaN") {
            this.heightVal = "0";
        }
        if (this.weightVal == "NaN") {
            this.weightVal = "0";
        }
        ////////////debugger
        this.PrespictionForm.removeControl("areaVal");
        this.PrespictionForm.addControl("areaVal", new FormControl(""));
        ////////////////////debugger
        this.areaVal = Math.sqrt(
            (parseFloat(this.heightVal) * parseFloat(this.weightVal)) / 3600
        ).toFixed(1);

        this.PrespictionForm.removeControl("areaVal");
        this.PrespictionForm.addControl(
            "areaVal",
            new FormControl({ value: this.areaVal, disabled: false })
        );
        //  //////debugger
        // if(this.areaVal)
        this.PrespictionForm.controls.areaVal.setValue(this.areaVal);
        // else
        //   this.PrespictionForm.controls.areaVal.setValue(0);
        //////////debugger
        this.calcPres();
    }
    open(content, _type, _element) {
        this.ArrayDrus = [];
        this.getDropDownFromServer();
        ////////////////////debugger
        this.ROW_ID_PRE = "";
        this.PresRowIdVal = "";
        this.rows = this.formBuilder.array([]);
        this.PrespictionFormRow = this.formBuilder.group({
            SrcPresRows: this.rows,
        });
        this.updateView();

        this.tableDataPresPrint = this.rows.value;
        this.tableDataSrcPresPrint = new MatTableDataSource(
            this.tableDataPresPrint
        );
        this.dis = false;
        this.SensitivityBool = false;
        this.isCanceldVisible = false;
        this.isButtonVisible = true;
        this.tableDataPres.splice(0, this.tableDataPres.length);
        var _status = false;
        var _statusNotToDo = false;
        if (_element.Status == "שמור") {
            _status = false;
        } else if (_element.Status == "נעול") {
            _status = true;
        }
        if (_element.statusNotToDo == "1") {
            _statusNotToDo = true;
        } else {
            _statusNotToDo = false;
        }
        //debugger
        this.SensitivityBool = false;
        this.PrespictionForm = this.formBuilder.group({
            weightVal: [null, Validators.required],
            heightVal: [null, Validators.required],
            areaVal: [{ value: "0", disabled: false }, false],
            targetAUCVal: ["", false],
            levelVal: ["", false],
            diagnosisVal: ["", false],
            protocolVal: ["", false],
            frequencyVal: ["", false],
            courseNumVal: ["", false],
            takedateIN: [null, Validators.required],
            regesterdateIN: [
                new FormControl(new Date()).value,
                Validators.required,
            ],
            rowIdVal: ["-100", false],
            SensitivityVal: [this.SensitivityBool, Validators.required],
            MedicationSensitivityVal: [
                "",
                [Validators.required, Validators.pattern("[A-Za-z0-9 ]*")],
            ],
            statusRowVal: [_status, false],
            statusNotToDo: [_statusNotToDo, false],
        });
        let ngbModalOptions: NgbModalOptions = {
            backdrop: "static",
            keyboard: false,
        };
        ////////////////////debugger
        this.modalService.open(content, ngbModalOptions).result.then(
            (result) => {
                this.closeResult = `Closed with: ${result}`;
                //////////////////////////debugger
                if ("Save" == result) {
                    // ////////////////////////debugger;
                    //this.saveChad(_element.ROW_ID);
                }
            },
            (reason) => {
                this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
            }
        );
    }
    openRow(content, _type, _element) {
        this.EDIT_ROW = false;
        this.ROW_ID_IN_TABLE = this.rows.length;
        ////////////////debugger
        //this.tableDataSrcPres = new MatTableDataSource(this.tableDataPres);
        const row = this.formBuilder.group({
            noteVal: ["", false],
            Dosage_UnitVal: ["", false],
            Dosage_Unit_2_Val: ["", false],
            finalMenonVal: ["", false],
            Duration_Of_DeliveryVal: ["", false],
            Solution_VolumeVal: ["", false],
            SolutionVal: ["", false],
            MenonValVal: ["", false],
            Way_Of_ProvidingVal: ["", false],
            Days_ProtocolVal: [[], false],
            MenonCalcVal: [{ value: "", disabled: false }, false],
            MedListVal: ["", false],
            rowIdPreVal: [this.ROW_ID_IN_TABLE + 1, false],
            groupID: ["", false],
            newRow: ["true", false],
        });
        this.ArrayDrus.push(this.MedListConst);
        // this.DeleteRowId = (this.ROW_ID_IN_TABLE + 1).toString();
        this.rows.push(row);
        this.updateView();

        // this.tableDataPresPrint = this.rows.value;
        // this.tableDataSrcPresPrint = new MatTableDataSource(this.tableDataPresPrint);

        // this.modalService.open(content, this.modalOptions).result.then(
        //     (result) => {
        //         this.closeResult = `Closed with: ${result}`;
        //         //////////////////////////debugger
        //         if ("Save" == result) {
        //             // ////////////////////////debugger;
        //             //this.saveChad(_element.ROW_ID);
        //         }
        //     },
        //     (reason) => {
        //         this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        //     }
        // );
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
        this.getTableFromServer(
            this.paginator.pageIndex,
            this.paginator.pageSize,
            this.fliterVal
        );
    }

    public getDropDownFromServer() {
        ////////////////////////debugger

        this.http
            .post(
                environment.url + "GetDropDownsOptions",
                {}
            )
            .subscribe((Response) => {
                var json = JSON.parse(JSON.parse(Response["d"]));
                this.Calc_Type = JSON.parse(json["Calc_Type"]);
                this.Dosage_Unit = JSON.parse(json["Dosage_Unit"]);
                this.Duration_Of_Delivery = JSON.parse(
                    json["Duration_Of_Delivery"]
                );
                this.Solution = JSON.parse(json["Solution"]);
                this.Solution_Volume = JSON.parse(json["Solution_Volume"]);
                this.Way_Of_Providing = JSON.parse(json["Way_Of_Providing"]);
                this.MedList = this.MedListConst = JSON.parse(json["MedList"]);
                this.mergeDrugMetadataIntoMedList();
                this.getDrugMetadataFromServer();
                this.Days_Protocol = JSON.parse(json["Days_Protocol"]);
                this.Notes = JSON.parse(json["Notes"]);
                ////////////////////////debugger
            });
    }
    private getDrugMetadataFromServer() {
        this.http
            .post(environment.url + "getDrugsTbl", {
                _pageIndex: 0,
                _pageSize: 10000,
                _FreeText: "",
                _GroupID: "-1",
            })
            .subscribe((Response) => {
                var json = JSON.parse(Response["d"]);
                json = JSON.parse(json);
                const drugData = JSON.parse(json["aaData"]);
                this.drugMetadataList = drugData.map((drug) => {
                    return {
                        MedID: drug.MedID,
                        MedName: drug.MedName,
                        StorageConditions: drug.StorageConditions,
                        ExpireTime: drug.ExpireTime,
                    };
                });
                this.mergeDrugMetadataIntoMedList();
            });
    }
    private mergeDrugMetadataIntoMedList() {
        if (!this.MedList || !this.drugMetadataList) {
            return;
        }
        this.MedList.forEach((drug) => {
            const metadata =
                this.findDrugMetadataByName(drug.value) ||
                this.findDrugMetadataByName(drug.viewValue) ||
                this.findDrugMetadataByName(drug.name);
            if (metadata) {
                drug.StorageConditions = metadata.StorageConditions;
                drug.ExpireTime = metadata.ExpireTime;
            }
        });
    }
    public getEmployeesForLabelPrint() {
        this.http
            .post(environment.url + "GetEmployeesMed", {
                pageIndex: 0,
                pageSize: 1000,
                serachTxt: "",
            })
            .subscribe((Response) => {
                const employees = Array.isArray(Response["d"])
                    ? Response["d"]
                    : [];
                this.employees = employees.map((employee) => {
                    const firstName = String(employee.FirstName || "").trim();
                    const lastName = String(employee.LastName || "").trim();
                    return {
                        EmployeeID: employee.EmployeeID,
                        FirstName: employee.FirstName,
                        LastName: employee.LastName,
                        FullName: (firstName + " " + lastName).trim(),
                    };
                });
            });
    }

    public getPresFromServer(_presID: string) {
        this.getDropDownFromServer();
        ////////////////////////debugger
        let tableLoader = false;
        if ($("#loader").hasClass("d-none")) {
            // ////////////////////////debugger
            tableLoader = true;
            $("#loader").removeClass("d-none");
        }
        this.http
            .post(environment.url + "GetPresRows", {
                ID: _presID,
            })
            .subscribe((Response) => {
                ////////////debugger
                this.rows = this.formBuilder.array([]);
                this.PrespictionFormRow = this.formBuilder.group({
                    SrcPresRows: this.rows,
                });
                this.updateView();
                this.tableDataPres.splice(0, this.tableDataPres.length);
                var json = JSON.parse(JSON.parse(Response["d"]));
                var Medicine_Prescriptions = JSON.parse(
                    json["Medicine_Prescriptions"]
                );
                this.ArrayDrus = [];
                this.drugs = [];
                this.tableDataPresPrint = [];
                for (var i = 0; i < Medicine_Prescriptions.length; i++) {
                    // //////////////////debugger
                    /*
                     */
                    var clc = "";
                    if (
                        parseFloat(
                            Medicine_Prescriptions[i].DosageCalc
                        ).toFixed(1) != "NaN"
                    ) {
                        clc = parseFloat(
                            Medicine_Prescriptions[i].DosageCalc
                        ).toFixed(1);
                    }
                    var d = this.MedList.findIndex((obj) => {
                        return obj.value === Medicine_Prescriptions[i].DrugName;
                    });
                    var groupID = "";
                    if (d > -1) {
                        groupID = this.MedList[d].groupID;
                    }

                    //  //////////////////debugger
                    const row = this.formBuilder.group({
                        noteVal: [
                            {
                                value: Medicine_Prescriptions[i].ChangeNotes,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        Dosage_Unit_2_Val: [
                            {
                                value: Medicine_Prescriptions[i].DosingUnit,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        Dosage_UnitVal: [
                            {
                                value: Medicine_Prescriptions[i]
                                    .DosingUnitFinal,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        finalMenonVal: [
                            {
                                value: Medicine_Prescriptions[i].DosageFinal,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        Duration_Of_DeliveryVal: [
                            {
                                value: Medicine_Prescriptions[i].Duration,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        Solution_VolumeVal: [
                            {
                                value: Medicine_Prescriptions[i].SolutionVol,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        SolutionVal: [
                            {
                                value: Medicine_Prescriptions[i].Solution,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        MenonValVal: [
                            {
                                value: Medicine_Prescriptions[i].Dosage,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        MenonCalcVal: [{ value: clc, disabled: false }, false],
                        Way_Of_ProvidingVal: [
                            {
                                value: Medicine_Prescriptions[i]
                                    .MedAdministrationType,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        Days_ProtocolVal: [
                            {
                                value: Medicine_Prescriptions[
                                    i
                                ].ProtocolDay.split(","),
                                disabled: this.dis,
                            },
                            false,
                        ],
                        MedListVal: [
                            {
                                value: Medicine_Prescriptions[i].DrugName,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        rowIdPreVal: [
                            {
                                value: Medicine_Prescriptions[i].MedicinID,
                                disabled: this.dis,
                            },
                            false,
                        ],
                        groupID: [groupID, false],
                        newRow: ["false", false],
                    });

                    this.ArrayDrus.push(this.MedListConst);

                    ////debugger
                    this.tableDataPresPrint.push({
                        noteVal: Medicine_Prescriptions[i].ChangeNotes,
                        Dosage_UnitVal: Medicine_Prescriptions[i].DosingUnit,
                        Dosage_Unit_2_Val:
                            Medicine_Prescriptions[i].DosingUnitFinal,
                        finalMenonVal: Medicine_Prescriptions[i].DosageFinal,
                        Duration_Of_DeliveryVal:
                            Medicine_Prescriptions[i].Duration,
                        Solution_VolumeVal:
                            Medicine_Prescriptions[i].SolutionVol,
                        SolutionVal: Medicine_Prescriptions[i].Solution,
                        MenonValVal: Medicine_Prescriptions[i].Dosage,
                        MenonCalcVal: clc,
                        Way_Of_ProvidingVal:
                            Medicine_Prescriptions[i].MedAdministrationType,
                        Days_ProtocolVal:
                            Medicine_Prescriptions[i].ProtocolDay.split(","),
                        MedListVal: Medicine_Prescriptions[i].DrugName,
                        rowIdPreVal: Medicine_Prescriptions[i].MedicinID,
                        newRow: false,
                    });
                    //debugger
                    if (
                        clc != "" &&
                        clc != "0" &&
                        clc != "0.00" &&
                        Medicine_Prescriptions[i].DrugName != "" &&
                        (groupID == "1" || groupID == "4")
                    ) {
                        this.drugs.indexOf(
                            Medicine_Prescriptions[i].DrugName
                        ) === -1
                            ? this.drugs.push({
                                  DrugName: Medicine_Prescriptions[i].DrugName,
                              })
                            : console.log("This item already exists");
                    }

                    this.rows.push(row);
                }

                this.updateView();

                this.tableDataSrcPresPrint = new MatTableDataSource(
                    this.tableDataPresPrint
                );
                // this.tableDataSrcPres = new MatTableDataSource(this.tableDataPres);
                //////////////////debugger;
                setTimeout(function () {
                    //////////////////////////debugger
                    if (tableLoader) {
                        $("#loader").addClass("d-none");
                    }
                });
            });
    }

    updateView() {
        this.tableDataSrcPres.next(this.rows.controls);
    }
    public getTableFromServer(
        _pageIndex: number,
        _pageSize: number,
        _FreeText: string
    ) {
        this.getDropDownFromServer();
        ////////////////////////debugger
        let tableLoader = false;
        if ($("#loader").hasClass("d-none")) {
            // ////////////////////////debugger
            tableLoader = true;
            $("#loader").removeClass("d-none");
        } else {
            tableLoader = true;
        }
        this.http
            .post(
                environment.url + "GetDemographData",
                {
                    _id: _FreeText,
                    _pageIndex: _pageIndex,
                    _pageSize: _pageSize,
                }
            )
            .subscribe((Response) => {
                this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
                var json = JSON.parse(JSON.parse(Response["d"]));
                let DataPrecpiction = JSON.parse(json["Prescriptions"]);
                let Patient = JSON.parse(json["Patient"]);
                ////////////////////////debugger
                this.DemographData = Patient;
                if (this.DemographData[0]) {
                    this.FIRST_NAME_In = this.FIRST_NAME =
                        this.DemographData[0].FIRST_NAME;
                    this.LAST_NAME_In = this.LAST_NAME =
                        this.DemographData[0].LAST_NAME;
                    this.MID_NAME_In = this.MID_NAME =
                        this.DemographData[0].MID_NAME;
                    this.ID_In = this.ID = this.DemographData[0].ID;
                    this.GENDER_In = this.GENDER = this.DemographData[0].GENDER;
                    this.AGE_In = this.AGE = this.DemographData[0].AGE;
                    this.KUPA_In = this.KUPA = this.DemographData[0].KUPA;
                    this.Case_Number_In = this.Case_Number =
                        this.DemographData[0].Case_Number;
                    this.Depart_In = this.Depart = this.DemographData[0].Depart;
                    this.Seode_Depart_In = this.Seode_Depart =
                        this.DemographData[0].Seode_Depart;

                    $(document).find("#demographData").removeClass("d-none");
                    $(document)
                        .find("#prespictionsDetailsBtn")
                        .prop("disabled", false);
                } else {
                    this.openSnackBar("לא נמצא נתונים", "error");
                    $(document)
                        .find("#prespictionsDetailsBtn")
                        .prop("disabled", true);
                }

                //////////////////////////debugger
                for (var i = 0; i < DataPrecpiction.length; i++) {
                    ////debugger;
                    var ShowRow = false;
                    if (DataPrecpiction[i].Status == "נעול") {
                        ShowRow = true;
                    } else if (this.prem) {
                        // //debugger
                        ShowRow = true;
                    } else {
                        ShowRow = false;
                    }
                    this.TABLE_DATA.push({
                        PerscriptionID: DataPrecpiction[i].PerscriptionID,
                        ID: DataPrecpiction[i].ID,
                        PatientFirstName: DataPrecpiction[i].PatientFirstName,
                        PatientLastName: DataPrecpiction[i].PatientLastName,
                        FatherName: DataPrecpiction[i].FatherName,
                        Age: DataPrecpiction[i].Age,
                        sex: DataPrecpiction[i].sex,
                        Kupa: DataPrecpiction[i].Kupa,
                        Weight: DataPrecpiction[i].Weight,
                        Hight: DataPrecpiction[i].Hight,
                        TargetAUC: DataPrecpiction[i].TargetAUC,
                        CreatinineLevel: DataPrecpiction[i].CreatinineLevel,
                        Prognosis: DataPrecpiction[i].Prognosis,
                        ProtocolTreatment: DataPrecpiction[i].ProtocolTreatment,
                        Frequency: DataPrecpiction[i].Frequency,
                        DateAdministrationMed:
                            DataPrecpiction[i].DateAdministrationMed,
                        MedicationSensitivity:
                            DataPrecpiction[i].MedicationSensitivity,
                        RegistrationDate: DataPrecpiction[i].RegistrationDate,
                        SaveDate: DataPrecpiction[i].SaveDate,
                        ModifyDate: DataPrecpiction[i].ModifyDate,
                        Status: DataPrecpiction[i].Status,
                        statusNotToDo: DataPrecpiction[i].statusNotToDo,
                        SensitivityUnknown:
                            DataPrecpiction[i].SensitivityUnknown,
                        CourseNum: DataPrecpiction[i].CourseNum,
                        CompletionOfDetailsCheck:
                            DataPrecpiction[i].CompletionOfDetailsCheck,
                        DosageCalculationCheck:
                            DataPrecpiction[i].DosageCalculationCheck,
                        CalcOfBodyAreaCheck:
                            DataPrecpiction[i].CalcOfBodyAreaCheck,
                        SolutionOfDilutionCheck:
                            DataPrecpiction[i].SolutionOfDilutionCheck,
                        UserCreate: DataPrecpiction[i].UserCreate,
                        UserUpdate: DataPrecpiction[i].UserUpdate,
                        Case_Number: DataPrecpiction[i].Case_Number,
                        Depart: DataPrecpiction[i].Depart,
                        Seode_Depart: DataPrecpiction[i].Seode_Depart,
                        hideOrShow: ShowRow,
                    });
                    switch (DataPrecpiction[i].Status) {
                        case "שמור":
                            this.showDeleteBtn = true;
                            break;
                        default:
                            this.showDeleteBtn = false;
                    }
                }

                // ////////////////////////debugger
                this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
                this.resultsLength = parseInt(json["iTotalRecords"]);
                var loadModalAfterCopy = this.loadModalAfterCopy;
                var that = this;
                this.loadModalAfterCopy = false;
                setTimeout(function () {
                    //////////////////////////debugger
                    if (that.loadModalAfterClose) {
                        //////debugger
                        var rowToLoad = $(document).find(
                            "#formTable tbody>tr>td:contains(" +
                                that.ROW_ID_PRE +
                                ")"
                        );
                        rowToLoad.parents("tr:first").find("button").click();
                        that.loadModalAfterClose = false;
                    }
                    if (loadModalAfterCopy) {
                        $(document)
                            .find("#formTable tbody>tr:first td:nth(6) button")
                            .click();
                    }
                    if (tableLoader) {
                        $("#loader").addClass("d-none");
                    }
                });
            });
    }
}
