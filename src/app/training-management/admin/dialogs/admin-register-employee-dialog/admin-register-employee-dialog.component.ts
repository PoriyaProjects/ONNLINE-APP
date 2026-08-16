import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AdminRegisterData {
  sessionId: number;
  courseName: string;
  sessionDate: string;
  timeLabel: string;
  availablePlaces: number;
}

export interface AdminRegisterResult {
  confirmed: boolean;
  employeeId: string;
}

@Component({
  selector: 'app-admin-register-employee-dialog',
  templateUrl: './admin-register-employee-dialog.component.html',
  styleUrls: ['./admin-register-employee-dialog.component.scss'],
})
export class AdminRegisterEmployeeDialogComponent {
  employeeId = '';
  submitting = false;

  constructor(
    private ref: MatDialogRef<AdminRegisterEmployeeDialogComponent, AdminRegisterResult>,
    @Inject(MAT_DIALOG_DATA) public data: AdminRegisterData
  ) {}

  cancel(): void {
    if (!this.submitting) {
      this.ref.close({ confirmed: false, employeeId: '' });
    }
  }

  confirm(): void {
    if (this.submitting || !this.employeeId) {
      return;
    }
    this.submitting = true;
    this.ref.close({ confirmed: true, employeeId: this.employeeId });
  }
}
