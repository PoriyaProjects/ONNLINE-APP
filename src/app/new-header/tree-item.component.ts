import { HttpClient } from "@angular/common/http";
import { Component, Input, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from "@angular/material/snack-bar";
import { environment } from "src/environments/environment";
@Component({
    selector: "tree-item",
    templateUrl: "./tree-item.component.html",
    styleUrls: ["./tree-item.component.css"]
})
export class TreeItemComponent implements OnInit {

    @Input()
    public data: any = {};
    subject: any;
    row_id: any;
    canEdit: boolean = false;
    username = localStorage.getItem('loginUserName').toLowerCase();
    horizontalPosition: MatSnackBarHorizontalPosition = "start";
    verticalPosition: MatSnackBarVerticalPosition = "bottom";
    @ViewChild('modalLinkSubject', { static: true }) modalLinkSubject: TemplateRef<any>;

    constructor(
        private dialog: MatDialog,
        private http: HttpClient,
        private _snackBar: MatSnackBar
    ) {

    }

    ngOnInit(): void {
        if (this.username == 'adahabre' || this.username == 'malkobi') this.canEdit = true;
    }

    openSnackBar(message) {
        this._snackBar.open(message, "X", {
            duration: 2000,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
        });
    }

    saveLinkSubject() {
        this.http
            .post(
                environment.url + "SaveLinkSubject",
                {
                    _subject: this.subject,
                    _row_id: this.row_id,
                }
            )
            .subscribe((Response) => {
                if (Response['d']) this.closeModal();
                else alert("לא נשמר");
            });
    }

    linkSubject(link: any) {
        this.subject = link.LinkSubject;
        this.row_id = link.RowId;
        this.dialog.open(this.modalLinkSubject, {
            width: '600px',  // Adjust the width as needed
            height: '400px', // Adjust the height as needed
            maxWidth: '90vw', // Ensure it's responsive on smaller screens
            maxHeight: '90vh' // Prevent modal from exceeding screen height
        });
    }

    closeModal() {
        this.dialog.closeAll();
    }
}
