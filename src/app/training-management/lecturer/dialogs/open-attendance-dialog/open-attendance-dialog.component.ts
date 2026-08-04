import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface OpenAttendanceDialogData {
  courseName: string;
  sessionDate: string;
  timeLabel: string;
  currentTimeLabel: string;
  windowHint: string;
}

@Component({
  selector: 'app-open-attendance-dialog',
  templateUrl: './open-attendance-dialog.component.html',
})
export class OpenAttendanceDialogComponent {
  submitting = false;

  constructor(
    private ref: MatDialogRef<OpenAttendanceDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: OpenAttendanceDialogData
  ) {}

  cancel(): void {
    if (!this.submitting) {
      this.ref.close(false);
    }
  }

  confirm(): void {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.ref.close(true);
  }
}
