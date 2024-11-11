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


export interface DialogData {
  element: Supplier;
  showForm: boolean;
  dialog: MatDialog;
}
@Component({
  selector: 'app-edit-or-add-lab-tests',
  templateUrl: './edit-or-add-lab-tests.component.html',
  styleUrls: ['./edit-or-add-lab-tests.component.css']
})
export class EditOrAddLabTestsComponent implements OnInit {

  showForm: boolean= true;
  CatList  : any =  
  [
    {id: "1", value: 'בדיקות פנים'},
    {id: "2", value: 'בדיקות חוץ'}
  ]
  StatusList  : any =  
  [
    {id: "0", value: 'לא פעיל'},
    {id: "1", value: 'פעיל'}
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
    if(this.data.showForm == false){
      this.showForm = this.data.showForm;
    }else{
      this.serverForm = this.formBuilder.group({
        RowID: [this.data.element.RowID, null],
        TestCode: [this.data.element.TestCode, Validators.required],
        TestName_1: [this.data.element.TestName_1, null],
        TestName_2: [this.data.element.TestName_2, null],
        TestShortName: [this.data.element.TestShortName,  Validators.required],
        DoingLabName: [this.data.element.DoingLabName, null],
        SampleMaterial: [this.data.element.SampleMaterial, null],
        TypeTestOrSamplingTool: [this.data.element.TypeTestOrSamplingTool, null],
        SampleVolume: [this.data.element.SampleVolume, null],
        PickUpDeliveryConditions: [this.data.element.PickUpDeliveryConditions, null],
        LabTestTimeArrival: [this.data.element.LabTestTimeArrival, null],
        LabTestTime: [this.data.element.LabTestTime, null],
        LabHours: [this.data.element.LabHours, null],
        LabNotes: [this.data.element.LabNotes, null],
        TimeOfPerforming: [this.data.element.TimeOfPerforming, null],
        TestCat: [this.data.element.TestCat, null],
        StatusRow: [this.data.element.StatusRow, null],
        DateTimeInsert: [this.data.element.DateTimeInsert, null],
        UserInsert: [localStorage.getItem("loginUserName"), null],
        UserUpdate: [localStorage.getItem("loginUserName"), null],
        DateTimeUpdate: [this.data.element.DateTimeUpdate, null],
      });  
    }
    
  }

  ngOnInit(): void { }
  onSubmit(): void {
    debugger
    this.loading = true;
    console.log(this.serverForm.value);
    this.http
      .post(
        environment.url + "InsertOrUpdateLabTests",
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