import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AdminCancelRegData {
  employeeName: string;
  courseName: string;
  sessionDate: string;
}

export interface AdminCancelRegResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-admin-cancel-registration-dialog',
  templateUrl: './admin-cancel-registration-dialog.component.html',
  styleUrls: ['./admin-cancel-registration-dialog.component.scss'],
})
export class AdminCancelRegistrationDialogComponent {
  reason = '';
  submitting = false;

  constructor(
    private ref: MatDialogRef<AdminCancelRegistrationDialogComponent, AdminCancelRegResult>,
    @Inject(MAT_DIALOG_DATA) public data: AdminCancelRegData
  ) {}

  cancel(): void {
    if (!this.submitting) {
      this.ref.close({ confirmed: false, reason: '' });
    }
  }

  confirm(): void {
    if (this.submitting || !this.reason.trim()) {
      return;
    }
    this.submitting = true;
    this.ref.close({ confirmed: true, reason: this.reason.trim() });
  }
}
