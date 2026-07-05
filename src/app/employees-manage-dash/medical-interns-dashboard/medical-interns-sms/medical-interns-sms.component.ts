import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medical-interns-sms',
  templateUrl: './medical-interns-sms.component.html',
  styleUrls: ['./medical-interns-sms.component.css']
})
export class MedicalInternsSmsComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  sendSmsForm: FormGroup;
  internsList: any[] = [];
  selectedInternIds: Set<string> = new Set();
  loaded = false;
  url = environment.url;

  constructor(
    private _snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.sendSmsForm = this.formBuilder.group({
      smsText: ['', Validators.required],
      smsNumbers: ['', Validators.required],
    });
    this.loadInterns();
  }

  loadInterns() {
    this.loaded = false;
    this.http
      .post(this.url + 'GetMedicalInterns', {
        _employeeID: '',
        _firstName: '',
        _lastName: '',
        _phoneNumber: '',
        _department: '',
        _departmentSecond: '',
        _on: '1',
        _monthYear: '',
      })
      .subscribe(
        (response) => {
          this.loaded = true;
          this.internsList = response['d'] || [];
        },
        () => {
          this.loaded = true;
          this.internsList = [];
        }
      );
  }

  toggleIntern(intern: any) {
    const id = intern.RowID || intern.InternID || intern.EmployeeID;
    if (this.selectedInternIds.has(id)) {
      this.selectedInternIds.delete(id);
    } else {
      this.selectedInternIds.add(id);
    }
    this.updateSmsNumbersFromSelection();
  }

  isSelected(intern: any): boolean {
    const id = intern.RowID || intern.InternID || intern.EmployeeID;
    return this.selectedInternIds.has(id);
  }

  selectAll() {
    this.internsList.forEach((i) => this.selectedInternIds.add(i.RowID || i.InternID || i.EmployeeID));
    this.updateSmsNumbersFromSelection();
  }

  clearSelection() {
    this.selectedInternIds.clear();
    this.updateSmsNumbersFromSelection();
  }

  updateSmsNumbersFromSelection() {
    const numbers = this.internsList
      .filter((i) => this.selectedInternIds.has(i.RowID || i.InternID || i.EmployeeID))
      .map((i) => (i.CellNumber || '').replace(/\D/g, ''))
      .filter((n) => n.length >= 9);
    this.sendSmsForm.patchValue({ smsNumbers: numbers.join('\n') });
  }

  sendSms() {
    if (this.sendSmsForm.invalid) {
      this._snackBar.open('יש למלא תוכן הודעה ומספרי טלפון', 'X', {
        duration: 3000,
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      return;
    }
    this.http
      .post(this.url + 'SendSMSOnLineMedicalInterns', {
        smsText: this.sendSmsForm.value.smsText,
        smsNumbers: this.sendSmsForm.value.smsNumbers,
      })
      .subscribe(
        () => {
          this._snackBar.open('נשלח בהצלחה', '', {
            duration: 2500,
            direction: 'rtl',
            panelClass: 'success',
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.sendSmsForm.patchValue({ smsText: '', smsNumbers: '' });
        },
        () => {
          this._snackBar.open('שגיאה בשליחת הודעה', 'X', {
            duration: 3000,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
        }
      );
  }

  backToDashboard() {
    this.router.navigate(['/medical-interns-dashboard']);
  }
}
