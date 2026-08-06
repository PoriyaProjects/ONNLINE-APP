import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SessionCancelAdminData {
  courseName: string;
  sessionDate: string;
  timeLabel: string;
  location: string;
  registeredCount: number;
}

export interface SessionCancelAdminResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-session-cancel-admin-dialog',
  templateUrl: './session-cancel-admin-dialog.component.html',
})
export class SessionCancelAdminDialogComponent {
  reason = '';
  submitting = false;

  constructor(
    private ref: MatDialogRef<SessionCancelAdminDialogComponent, SessionCancelAdminResult>,
    @Inject(MAT_DIALOG_DATA) public data: SessionCancelAdminData
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
