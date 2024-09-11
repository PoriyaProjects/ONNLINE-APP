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
}

export function customIPValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

    if (regex.test(control.value)) {
      return null;
    }

    return { ipError: true };
  };
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
    this.serverForm = this.formBuilder.group({
      RowID: [this.data.element.RowID, null],
      SupplierID: [this.data.element.SupplierID, Validators.required],
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
  }

  ngOnInit(): void { }
  onSubmit(): void {
    debugger
    this.loading = true;
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
