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
export interface Server {
    RowID: string;
    Name: string;
    Place: string;
    IPAddress: string;
    LastUserUpdated: string;
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
    element: Server;
    dialog: MatDialog;
}
@Component({
    selector: 'app-add-or-edit-switches',
    templateUrl: './add-or-edit-switches.component.html',
    styleUrls: ['./add-or-edit-switches.component.css']
})
export class AddOrEditSwitchesComponent implements OnInit {
    serverForm: FormGroup;
    loading: boolean = false;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        private formBuilder: FormBuilder,
        private http: HttpClient
    ) {
        this.serverForm = this.formBuilder.group({
            RowID: [this.data.element.RowID, null],
            Name: [this.data.element.Name, Validators.required],
            Place: [this.data.element.Place, null],
            IPAddress: [this.data.element.IPAddress, null],
            LastUserUpdated: [localStorage.getItem("loginUserName"), null],
        });
    }

    ngOnInit(): void { }
    onSubmit(): void {
        this.loading = true;
        console.log(this.serverForm.value);
        this.http
            .post(
                "http://srv-apps-prod/RCF_WS/WebService.asmx/insertOrUpdateSwitches4Onnline",
                // "http://srv-apps-prod/RCF_WS/WebService.asmx/insertOrUpdateSwitches4Onnline",
                {
                    mRowSwitches4Onnline: this.serverForm.value,
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
