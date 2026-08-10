import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface CompleteSessionDialogData {
  courseName: string;
  sessionDate: string;
  registered: number;
  confirmed: number;
  missing: number;
}

@Component({
  selector: 'app-complete-session-dialog',
  templateUrl: './complete-session-dialog.component.html',
  styleUrls: ['./complete-session-dialog.component.scss'],
})
export class CompleteSessionDialogComponent {
  submitting = false;

  constructor(
    private ref: MatDialogRef<CompleteSessionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: CompleteSessionDialogData
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
