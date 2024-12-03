import { HttpClient } from "@angular/common/http";
import { Component, Inject, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from "@angular/material/snack-bar";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";


@Component({
  selector: 'app-tree-item-dialog',
  templateUrl: './tree-item-dialog.component.html',
  styleUrls: ['./tree-item-dialog.component.css']
})
export class TreeItemDialogComponent implements OnInit {

  htmlContent = '';
  sanitizedHtml: SafeHtml;
  _userLinks: FormGroup;
  canEdit: boolean = false;
  username = localStorage.getItem('loginUserName').toLowerCase();
  user_depart = localStorage.getItem('Depart').toLowerCase();
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  @ViewChild('modalLinkSubject', { static: true }) modalLinkSubject: TemplateRef<any>;
  filteredOptions: Observable<string[]>;
  reqfilter = new FormControl();
  filteredOptions2: Observable<string[]>;
  dofilter = new FormControl();
  employees = [];
  display_text: string;

  constructor(
    private dialog: MatDialogRef<TreeItemDialogComponent>,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private _snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder) { }

  ngOnInit(): void {
    if (this.user_depart != "מערכות מידע") this.sanitizedHtml = this.sanitizeHtml(this.data.LinkSubject, this.data.LinkDoingIDFK.FirstName + ' ' + this.data.LinkDoingIDFK.LastName);
    else {
      this.canEdit = true;
      this.getEmployeesList();
      this._userLinks = this.fb.group({
        RowId: new FormControl(this.data.RowId, null),
        LinkSubject: new FormControl(this.data.LinkSubject, null),
        LinkRequestedIDFK: new FormControl(this.data.LinkRequestedIDFK, null),
        LinkDoingIDFK: new FormControl(this.data.LinkDoingIDFK, null),
      })
      this.reqfilter.setValue({
        FirstName: this.data.LinkRequestedIDFK.FirstName + ' ' + this.data.LinkRequestedIDFK.LastName,
        EmployeeID: this.data.LinkRequestedIDFK.EmployeeID
      });
      this.dofilter.setValue({
        FirstName: this.data.LinkDoingIDFK.FirstName + ' ' + this.data.LinkDoingIDFK.LastName,
        EmployeeID: this.data.LinkDoingIDFK.EmployeeID
      });
      this.filteredOptions = this.reqfilter.valueChanges
        .pipe(
          startWith(''),
          map(value => this._filter(value))
        );
      this.filteredOptions2 = this.dofilter.valueChanges
        .pipe(
          startWith(''),
          map(value => this._filter2(value))
        );
    }
  }

  config: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '15rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      ['bold']
    ],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ]
  };

  // Function to sanitize the HTML content
  sanitizeHtml(htmlContent: string, doing_name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml('<div style="float: right;"><b>שם מבצע</b>: ' + doing_name + '</div><br><br>' + htmlContent);
  }

  decodeHtmlAndStripTags(htmlText: string): string {
    const parser = new DOMParser();
    const decodedString = parser.parseFromString(htmlText, 'text/html').body.textContent || "";
    return decodedString;
  }

  private _filter(value: any): string[] {
    const filterValue1 = value;
    // let manager: any = this.employees.filter(t => t.firstname === filterValue1);
    if (value != "" && value != undefined) {
      if (value.EmployeeID != undefined) this._userLinks.controls['LinkRequestedIDFK'].setValue(value);
    }
    return this.employees.filter(option => option.FirstName.includes(filterValue1));
  }

  private _filter2(value: any): string[] {
    const filterValue2 = value;
    // let manager: any = this.employees.filter(t => t.firstname === filterValue2);
    if (value != "" && value != undefined) {
      if (value.EmployeeID != undefined) this._userLinks.controls['LinkDoingIDFK'].setValue(value);
    }
    return this.employees.filter(option => option.FirstName.includes(filterValue2));
  }
  
  displayFn(usr: any): string {
    return usr && usr.FirstName ? usr.FirstName : "";
  }

  displayFn2(usr2: any): string {
    return usr2 && usr2.FirstName ? usr2.FirstName : "";
  }

  getEmployeesList() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        let all_users_filter = Response["d"];
        all_users_filter.forEach(element => {
          this.employees.push({
            FirstName: element.firstname + " " + element.lastname,
            EmployeeID: element.id,
            ADUserName: element.ADUserName.toLowerCase()
          });
        })
      });
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
          _subject: this._userLinks.value
        }
      )
      .subscribe((Response) => {
        if (Response['d']) this.closeModal();
        else alert("לא נשמר");
      });
  }

  closeModal() {
    this.dialog.close();
  }

}
