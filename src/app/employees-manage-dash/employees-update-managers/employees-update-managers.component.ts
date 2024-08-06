import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-employees-update-managers',
  templateUrl: './employees-update-managers.component.html',
  styleUrls: ['./employees-update-managers.component.css']
})
export class EmployeesUpdateManagersComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  all_users_filter: any[] = [];
  displayedColumns: string[] = ['deptSektor', 'deptName', 'managerId', 'update'];
  dataSource = new MatTableDataSource();
  selection = new SelectionModel<any>(true, []);
  list_form: FormGroup;
  userfilter = new FormControl();
  filteredOptions2: Observable<string[]>;
  updating: boolean = false;
  update_manager: any;

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private confirm: ConfirmationDialogService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.list_form = this.formBuilder.group({
      EmployeeIndex: new FormControl('', null),
      EmployeeIndexDesc: new FormControl('', null),
      ManagerEmployeeID: new FormControl('', null),
    });
    this.filteredOptions2 = this.userfilter.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter2(value))
      );
    this.getUserDepartmentForEmployees();
  }

  private _filter2(value: any): string[] {
    const filterValue2 = value;
    if (typeof value !== 'string') {
      this.submitSelected(filterValue2);
    }
    return this.all_users_filter.filter(option => option.firstname.includes(filterValue2) || option.lastname.includes(filterValue2));
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getUserDepartmentForEmployees() {
    this.http
      .post(environment.url + "GetEmployeesSektorsList", {})
      .subscribe((Response) => {
        this.dataSource = new MatTableDataSource(Response['d']);
      });
  }

  getUsersToUpdateUser() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        this.all_users_filter = Response["d"];
      });
  }

  updateView(manager) {
    if (manager === null) this.updating = false;
    else {
      this.getUsersToUpdateUser();
      this.update_manager = manager;
      this.updating = true;
    }
  }

  submitSelected(manager: any) {
    this.confirm
      .confirm("נא לאשר..", "האם לבצע את השינוי ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.update_manager.ManagerEmployeeID = manager.id;
          this.http
            .post(environment.url + "UpdateManagerEmployeeID", {
              _manager_obj: this.update_manager
            })
            .subscribe((Response) => {
              if (Response['d']) {
                this.openSnackBar("!נשמר בהצלחה");
                this.updating = false;
              } else {
                this.openSnackBar("אירעה שגיאה, להתקשר לאמין!");
              }
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }
  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
