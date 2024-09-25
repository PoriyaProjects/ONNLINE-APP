import { HttpClient } from "@angular/common/http";
import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from "@angular/forms";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Router } from "@angular/router";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";
import { environment } from "src/environments/environment";
export interface Authorized {
  RowID: string;
  SupplierID: string;
  AuthorizedConnectionName: string;
  AuthorizedConnectionID: string;
  AuthorizedNDA: string;
  AuthorizedAM: string;
  AuthorizedIDPic: string;
  InsertUser: string;
  InsertDateTime: string;
  UpdateUser: string;
  UpdateDateTime: string;
  Supliers: [];
}


export interface DialogData {
  element: Authorized;
  dialog: MatDialog;
}
@Component({
  selector: 'app-add-edit-authorized',
  templateUrl: './add-edit-authorized.component.html',
  styleUrls: ['./add-edit-authorized.component.css']
})
export class AddEditAuthorizedComponent implements OnInit {
  suppliers = [

  ];
  supplierFilterControl = new FormControl();
  serverForm: FormGroup;
  loading: boolean = false;
  filteredSuppliers: Observable<any[]>;
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
    let supSelected = this.data.element.Supliers.filter((e: any) => {
      return e.RowID.toString() == this.data.element.SupplierID;
    })
    this.serverForm = this.formBuilder.group({
      RowID: [this.data.element.RowID, null],
      SupplierID: [supSelected, Validators.required],
      AuthorizedConnectionName: [this.data.element.AuthorizedConnectionName, null],
      AuthorizedConnectionID: [this.data.element.AuthorizedConnectionID, null],
      AuthorizedNDA: [this.data.element.AuthorizedNDA, null],
      AuthorizedAM: [this.data.element.AuthorizedAM, null],
      AuthorizedIDPic: [this.data.element.AuthorizedIDPic, null],
      InsertDateTime: [this.data.element.InsertDateTime, null],
      UpdateDateTime: [this.data.element.UpdateDateTime, null],
      InsertUser: [localStorage.getItem("loginUserName"), null],
      UpdateUser: [localStorage.getItem("loginUserName"), null],
    });
    this.suppliers = this.data.element.Supliers
    debugger
  }
  displayFn(supplier?: any): string | undefined {
    // let supSelected = sup.filter((e)=>{
    //   return e.RowID.toString == supplier;
    // }) 
    //debugger
    //console.log(this.data.element.SupplierID)
    if(supplier.length)
      return supplier ? supplier[0].ContactName : undefined;
    else if (supplier.ContactName)
      return supplier ? supplier.ContactName : undefined;
    else 
      return undefined
  }
  private filterSuppliers(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.suppliers.filter(supplier =>
      supplier.ContactName.toLowerCase().includes(filterValue)
    );
  }
  ngOnInit(): void {
    this.filteredSuppliers = this.supplierFilterControl.valueChanges
      .pipe(
        startWith(''),
        map(value => this.filterSuppliers(value))
      );
  }
  onSubmit(): void {
    this.loading = true;
    if(this.serverForm.value.SupplierID.length){
      this.serverForm.value.SupplierID = this.serverForm.value.SupplierID[0].RowID
    }else{
      this.serverForm.value.SupplierID = this.serverForm.value.SupplierID.RowID
    }
    
    
    debugger
    console.log(this.serverForm.value);
    this.http
      .post(
        environment.url + "InsertOrUpdateAuthorized",
        {
          mRowAuthorized: this.serverForm.value,
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
