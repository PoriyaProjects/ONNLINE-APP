import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-service-unit-email-list-dialog',
  templateUrl: './service-unit-email-list-dialog.component.html',
  styleUrls: ['./service-unit-email-list-dialog.component.css']
})
export class ServiceUnitEmailListDialogComponent implements OnInit {
  form: FormGroup;

  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  listFields = [
    { value: 'ToMailingList', desc: 'רשימת נמענים' },
    { value: 'CCMailingList', desc: 'רשימת מכותבים' },
    { value: 'ToMailingListThanksClick', desc: 'רשימת תפוצה - תודה בקליק' },
    { value: 'ToMailingListHospitalization', desc: 'רשימת תפוצה - אשפוז' }
  ];

  autoControl: { [key: string]: FormControl } = {};
  filteredOptions: { [key: string]: string[] } = {};

  allOptions = {
    ToMailingList: ['Option A', 'Option B', 'Option C'],
    CCMailingList: ['Alpha', 'Beta', 'Gamma'],
    ToMailingListThanksClick: ['Red', 'Green', 'Blue'],
    ToMailingListHospitalization: ['Cat', 'Dog', 'Mouse']
  };

  constructor(
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ServiceUnitEmailListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
    this.getDepartmentMailingList();
    this.getUsersToUpdateUser();

  }

  addChip(field: string, event: any): void {
    const value = (event.value || '').trim();
    const current = this.form.get(field).value;
    if (value && !current.includes(value)) {
      this.form.get(field).setValue([...current, value]);
    }
    this.autoControl[field].setValue('');
  }

  removeChip(field: string, item: string): void {
    const current = this.form.get(field)?.value || [];
    this.form.get(field)?.setValue(current.filter((v: string) => v !== item));
  }

  selected(field: string, event: any): void {
    const email = event.option.value;
    const current = this.form.get(field).value;
    if (!current.includes(email)) {
      this.form.get(field).setValue([...current, email]);
    }
    this.autoControl[field].setValue('');
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.http
      .post(environment.url + "SaveOrUpdateDepartmentMailingList", {
        dto: this.form.value
      })
      .subscribe((Response) => {
        if (Response['d']) {
          this.openSnackBar("נשמר בהצלחה");
          this.dialogRef.close();
        }
        else this.openSnackBar("שגיאה");
      });
  }

  getDepartmentMailingList() {
    this.http
      .post(environment.url + "GetDepartmentMailingListByID", {
        departmentName: this.data
      })
      .subscribe((Response) => {
        let temp = Response['d'];
        this.form = this.fb.group({
          DepartmentHebFullDesc: [temp?.DepartmentHebFullDesc || ''],
          VolunteerName: [temp?.VolunteerName || ''],
          VolunteerCellNumber: [temp?.VolunteerCellNumber || ''],
          ToMailingList: [temp?.ToMailingList || []],
          CCMailingList: [temp?.CCMailingList || []],
          ToMailingListThanksClick: [temp?.ToMailingListThanksClick || []],
          ToMailingListHospitalization: [temp?.ToMailingListHospitalization || []]
        });

      });
  }

  getUsersToUpdateUser() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        this.allOptions.CCMailingList = Response["d"];
        this.allOptions.ToMailingList = Response["d"];
        this.allOptions.ToMailingListHospitalization = Response["d"];
        this.allOptions.ToMailingListThanksClick = Response["d"];
        this.listFields.forEach(field => {
          this.autoControl[field.value] = new FormControl('');
          this.filteredOptions[field.value] = this.allOptions[field.value];
        });
        Object.keys(this.autoControl).forEach(field => {
          this.autoControl[field].valueChanges.subscribe(inputValue => {
            const search = inputValue?.toLowerCase() || '';
            this.filteredOptions[field] = this.allOptions[field].filter(option =>
              `${option.firstname} ${option.lastname} ${option.derug}`.toLowerCase().includes(search)
            );
          });
        });
      });
  }

  openSnackBar(message) {
    this._snackBar.open(message, 'X', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
