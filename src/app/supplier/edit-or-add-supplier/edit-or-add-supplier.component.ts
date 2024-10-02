import { HttpClient } from "@angular/common/http";
import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from "@angular/forms";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Router } from "@angular/router";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { environment } from "src/environments/environment";
export interface Supplier {
  RowID: string;
  SupplierName: string;
  ServerDescription: string;
  ContactName: string;
  ContactEmail: string;
  ContactTell: string;
  ConnectionEssence: string;
  ConnectionType: string;
  ConnectionMethod: string;
  IdentificationForm: string;
  SecurityMeasures: string;
  SignedConfidentialityAgreement: string;
  ContinuityRisk: string;
  RiskSensitivity: string;
  RiskEconomic: string;
  ProbabilityEvent: string;
  SupplierCategorize: string;
  TestAM: string;
  CorporateNDA: string;
  ISOCer: string;
  RowStatus: string;
  InsertDateTime: string;
  InsertUser: string;
  UpdateUser: string;
  UpdateDateTime: string;
}


export interface DialogData {
  element: Supplier;
  dialog: MatDialog;
}
@Component({
  selector: 'app-edit-or-add-supplier',
  templateUrl: './edit-or-add-supplier.component.html',
  styleUrls: ['./edit-or-add-supplier.component.css']
})
export class EditOrAddSupplierComponent implements OnInit {
  ConnectionEssenceList: any = [
    {id: "1", value: 'תמיכה'},
    {id: "2", value: 'פיתוח'},
    {id: "3", value: 'שירותי ענן'},
    {id: "4", value: 'תחזוקה'},
    {id: "5", value: 'הטמעה'},
    {id: "6", value: 'פרוייקט'},
    {id: "7", value: 'ניטור'}
  ]
  ConnectionTypeList: any = [
    {id: "1", value: 'קבוע'},
    {id: "2", value: 'זמני'}
  ]
  ConnectionMethodList : any =  [
    {id: "1", value: 'מקומי'},
    {id: "2", value: 'מרחוק'}
  ]
  YesNoList  : any =  
  [
    {id: "0", value: 'לא'},
    {id: "1", value: 'כן'}
  ]
  ABCList : any = 
  [
    {id: "A", value: 'A'},
    {id: "B", value: 'B'},
    {id: "C", value: 'C'}
  ]
  serverForm: FormGroup;
  loading: boolean = false;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    /*
    public string RowID { get; set; }
        public string SupplierID { get; set; }
        public string AuthorizedConnectionName { get; set; }
        public string AuthorizedConnectionID { get; set; }
        public string AuthorizedNDA { get; set; }
        public string AuthorizedAM { get; set; }
        public string AuthorizedIDPic { get; set; }
        public string InsertUser { get; set; }
        public string InsertDateTime { get; set; }
        public string UpdateUser { get; set; }
        public string UpdateDateTime { get; set; }
    */
    debugger
    this.serverForm = this.formBuilder.group({
      RowID: [this.data.element.RowID, null],
      SupplierName: [this.data.element.SupplierName, Validators.required],
      ServerDescription: [this.data.element.ServerDescription, null],
      ContactName: [this.data.element.ContactName, null],
      ContactEmail: [this.data.element.ContactEmail,  Validators.required],
      ContactTell: [this.data.element.ContactTell, null],
      ConnectionEssence: [this.data.element.ConnectionEssence, null],
      ConnectionType: [this.data.element.ConnectionType, null],
      ConnectionMethod: [this.data.element.ConnectionMethod, null],
      IdentificationForm: [this.data.element.IdentificationForm, null],
      SecurityMeasures: [this.data.element.SecurityMeasures, null],
      SignedConfidentialityAgreement: [this.data.element.SignedConfidentialityAgreement, null],
      ContinuityRisk: [this.data.element.ContinuityRisk, null],
      RiskSensitivity: [this.data.element.RiskSensitivity, null],
      RiskEconomic: [this.data.element.RiskEconomic, null],
      CorporateNDA: [this.data.element.CorporateNDA, null],
      ProbabilityEvent: [this.data.element.ProbabilityEvent, null],
      SupplierCategorize: [this.data.element.SupplierCategorize, null],
      TestAM: [this.data.element.TestAM, null],
      ISOCer: [this.data.element.ISOCer, null],
      RowStatus: [this.data.element.RowStatus, null],
      InsertDateTime: [this.data.element.InsertDateTime, null],
      UpdateDateTime: [this.data.element.UpdateDateTime, null],
      UpdateUser: [localStorage.getItem("loginUserName"), null],
      InsertUser: [localStorage.getItem("loginUserName"), null],
    });
  }

  ngOnInit(): void { }
  onSubmit(): void {
    debugger
    this.loading = true;
    console.log(this.serverForm.value);
    this.http
      .post(
        environment.url + "InsertOrUpdateSuppliers",
        {
          RowSupplier: this.serverForm.value,
        }
      )
      .subscribe((Response) => {
        this.data.dialog.closeAll();
        this.loading = false;
        setTimeout(function () {
          //////debugger

          $("#loader").addClass("d-none");
        });
      });
  }

}
