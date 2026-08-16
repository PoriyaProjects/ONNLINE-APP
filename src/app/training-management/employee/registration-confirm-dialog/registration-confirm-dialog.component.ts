import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RegistrationConfirmDialogData {
  courseName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  lecturerName: string;
}

@Component({
  selector: 'app-registration-confirm-dialog',
  templateUrl: './registration-confirm-dialog.component.html',
  styleUrls: ['./registration-confirm-dialog.component.scss'],
})
export class RegistrationConfirmDialogComponent {
  submitting = false;

  constructor(
    private dialogRef: MatDialogRef<RegistrationConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: RegistrationConfirmDialogData
  ) {}

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.dialogRef.close(true);
  }
}
