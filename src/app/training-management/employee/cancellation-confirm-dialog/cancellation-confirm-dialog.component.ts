import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface CancellationConfirmDialogData {
  courseName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  employeeName?: string | null;
  cancellationDeadline?: string | null;
}

export interface CancellationConfirmDialogResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-cancellation-confirm-dialog',
  templateUrl: './cancellation-confirm-dialog.component.html',
  styleUrls: ['./cancellation-confirm-dialog.component.scss'],
})
export class CancellationConfirmDialogComponent {
  reason = '';
  submitting = false;

  constructor(
    private dialogRef: MatDialogRef<
      CancellationConfirmDialogComponent,
      CancellationConfirmDialogResult
    >,
    @Inject(MAT_DIALOG_DATA) public data: CancellationConfirmDialogData
  ) {}

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close({ confirmed: false, reason: '' });
  }

  confirm(): void {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.dialogRef.close({ confirmed: true, reason: this.reason.trim() });
  }
}
