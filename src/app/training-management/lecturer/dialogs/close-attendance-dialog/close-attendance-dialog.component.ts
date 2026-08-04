import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface CloseAttendanceDialogData {
  courseName: string;
  registered: number;
  confirmed: number;
  remaining: number;
}

@Component({
  selector: 'app-close-attendance-dialog',
  templateUrl: './close-attendance-dialog.component.html',
})
export class CloseAttendanceDialogComponent {
  submitting = false;

  constructor(
    private ref: MatDialogRef<CloseAttendanceDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: CloseAttendanceDialogData
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
