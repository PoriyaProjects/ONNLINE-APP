import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-employees-update-managers',
  templateUrl: './employees-update-managers.component.html',
  styleUrls: ['./employees-update-managers.component.css']
})
export class EmployeesUpdateManagersComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  managers: any[] = [];
  displayedColumns: string[] = ['deptSektor', 'deptName', 'managerId', 'update'];
  dataSource = new MatTableDataSource(this.managers);
  selection = new SelectionModel<any>(true, []);
  list_form: FormGroup;

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
    this.getUserDepartmentForEmployees();
  }

  getUserDepartmentForEmployees() {
    this.http
      .post(environment.url + "GetEmployeesSektorsList", {})
      .subscribe((Response) => {
        this.managers = Response['d'];
      });
  }

  submitSelected(manager: any) {
    console.log('Selected ManagerEmployeeID:', manager);
    // Perform your desired actions with the managerEmployeeID
    this.confirm
      .confirm("נא לאשר..", "האם אתה בטוח ...? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http
            .post(environment.url + "UpdateManagerEmployeeID", {
              _manager_obj: manager
            })
            .subscribe((Response) => {
              if (Response['d']) {
                this.openSnackBar("!נשמר בהצלחה");
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
