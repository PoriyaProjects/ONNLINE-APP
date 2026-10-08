import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsansweredComponent } from '../formsanswered/formsanswered.component';
import { UpdatesingleformComponent } from '../updatesingleform/updatesingleform.component';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Form {
  FormID: string;
  FormName: string;
  FormDate: string;
  FormDepartment: string;
}

export interface Patient {
  FormID: string;
  PatientID: string;
  PatientName: string;
  PatientPassport: string;
  PatientPhone: string;
  PatientEmail: string;
  NurseInCharge: string;
  PatientGender: string;
  PatientBirthday: string;
  PatientAddress: string;
  FormName: string;
  DateOfFillForm: string;
  Signature: any;
  Questions: any[];
  NursesTable: any[];
}

@Component({
  selector: 'app-updateform',
  templateUrl: './updateform.component.html',
  styleUrls: ['./updateform.component.scss']
})
export class UpdateformComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  department: string[] = [];
  _tableArr = [];
  formSearch: FormGroup;
  loading = false;
  printing = false;

  TABLE_DATA: Form[] = [];
  displayedColumns: string[] = [
    'FormID', 'FormName', 'formDepartment', 'FormDate', 'update', 'showAll'
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);
  rowFormData = {} as Patient;
  filteredOptions: Observable<string[]>;

  constructor(
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.formSearch = this.formBuilder.group({
      searchWord: [''],
      departmentControl: ['']
    });
    this.filteredOptions = this.formSearch.get('departmentControl').valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );
    this.loadDepartments();
    this.searchForm();
  }

  private _filter(value: any): string[] {
    const filterValue = (value == null ? '' : String(value)).toLowerCase();
    return this.department.filter(option => (option || '').toLowerCase().includes(filterValue));
  }

  openDialogToUpdate(id) {
    const dialogRef = this.dialog.open(UpdatesingleformComponent, { disableClose: true });
    dialogRef.componentInstance.urlID = id;
  }

  openDialogToAnsweredForms(id) {
    const dialogRef = this.dialog.open(FormsansweredComponent, { disableClose: true });
    dialogRef.updateSize('1000px', '100%');
    dialogRef.componentInstance.urlID = id;
    dialogRef.componentInstance.isDialog = true;
    dialogRef.afterClosed().subscribe(() => {
      const temp = sessionStorage.getItem('printForm');
      if (!temp) {
        return;
      }
      let data: any;
      try {
        data = JSON.parse(temp);
      } catch {
        return;
      }
      if (!data) {
        return;
      }
      this.rowFormData = data;
      this._tableArr = [];
      (this.rowFormData.NursesTable || []).forEach(element => {
        this._tableArr.push(element);
      });
      this.printing = true;
      setTimeout(() => {
        this.printing = false;
        window.print();
      }, 1500);
    });
  }

  searchForm() {
    const searchWord = this.formSearch.controls['searchWord'].value || '';
    let departmentControl = this.formSearch.controls['departmentControl'].value;
    if (departmentControl == null || departmentControl === undefined) {
      departmentControl = '';
    }
    const storedUser = localStorage.getItem('loginUserName');
    const UserName = storedUser ? storedUser.toLowerCase() : '';
    this.loading = true;
    this.http
      .post(environment.url + 'GetAllUsersForms', {
        _userName: UserName,
        _searchWord: searchWord,
        _departmentControl: departmentControl
      })
      .subscribe(
        (Response) => {
          this.loading = false;
          const rows = Response['d'] || [];
          this.TABLE_DATA = rows.map((row) => ({
            FormID: row.FormID,
            FormName: row.FormName,
            FormDate: row.FormDate,
            FormDepartment: row.FormDepartment,
          }));
          this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
          this.dataSource.paginator = this.paginator;
        },
        () => {
          this.loading = false;
          this.snackBar.open('לא ניתן לטעון את רשימת השאלונים.', 'סגור', { duration: 4000 });
        }
      );
  }

  private loadDepartments(): void {
    this.http
      .post(environment.url + 'GetFormsDeparts', {})
      .subscribe(
        (Response) => {
          const rows = Response['d'] || [];
          this.department = rows.map((element) => element.Depart_Name).filter((name) => !!name);
        },
        () => {
          this.snackBar.open('לא ניתן לטעון את רשימת המחלקות.', 'סגור', { duration: 4000 });
        }
      );
  }
}
