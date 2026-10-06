import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { TreeItemDialogComponent } from "./tree-item-dialog/tree-item-dialog.component";

export function menuPinKey(link: any): string {
    if (!link) {
        return "";
    }
    return String(link.RowId || link.LinkId || "");
}

export const DEFAULT_PIN_LIMIT = 10;

@Component({
    selector: "tree-item",
    templateUrl: "./tree-item.component.html",
    styleUrls: ["./tree-item.component.css"]
})
export class TreeItemComponent implements OnInit {

    @Input()
    public data: any = {};
    @Input()
    public pinnedIds: string[] = [];
    @Output()
    public togglePin = new EventEmitter<any>();
    username = localStorage.getItem('loginUserName').toLowerCase();

    constructor(
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
    }

    isPinned(link: any): boolean {
        const key = menuPinKey(link);
        return !!key && this.pinnedIds.indexOf(key) !== -1;
    }

    onPinClick(event: Event, link: any) {
        event.preventDefault();
        event.stopPropagation();
        this.togglePin.emit(link);
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
