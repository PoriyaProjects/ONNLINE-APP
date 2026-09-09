import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { TreeItemDialogComponent } from "./tree-item-dialog/tree-item-dialog.component";


@Component({
    selector: "tree-item",
    templateUrl: "./tree-item.component.html",
    styleUrls: ["./tree-item.component.css"]
})
export class TreeItemComponent implements OnInit {

    @Input()
    public data: any = {};
    username = localStorage.getItem('loginUserName').toLowerCase();

    constructor(
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
    }

    linkSubject(link: any) {
        this.dialog.open(TreeItemDialogComponent, {
            data: link,
            width: '1000px',  // Adjust the width as needed
            height: '720px', // Adjust the height as needed
            maxWidth: '100vw', // Ensure it's responsive on smaller screens
            maxHeight: '100vh' // Prevent modal from exceeding screen height
        });
    }

}
