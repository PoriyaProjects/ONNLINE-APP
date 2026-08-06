import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TrainingAttendanceStatus } from '../../../models';

export interface ManualAttendanceData {
  employeeName: string;
  sessionLabel: string;
  currentAttendanceStatus: number | null;
}

export interface ManualAttendanceResult {
  confirmed: boolean;
  attended: boolean;
  reason: string;
}

@Component({
  selector: 'app-manual-attendance-dialog',
  templateUrl: './manual-attendance-dialog.component.html',
})
export class ManualAttendanceDialogComponent {
  attended = true;
  reason = '';
  submitting = false;
  AttendanceStatus = TrainingAttendanceStatus;

  constructor(
    private ref: MatDialogRef<ManualAttendanceDialogComponent, ManualAttendanceResult>,
    @Inject(MAT_DIALOG_DATA) public data: ManualAttendanceData
  ) {
    if (data.currentAttendanceStatus === TrainingAttendanceStatus.Confirmed) {
      this.attended = true;
    }
  }

  cancel(): void {
    if (!this.submitting) {
      this.ref.close({ confirmed: false, attended: false, reason: '' });
    }
  }

  confirm(): void {
    if (this.submitting || !this.reason.trim()) {
      return;
    }
    this.submitting = true;
    this.ref.close({ confirmed: true, attended: this.attended, reason: this.reason.trim() });
  }
}
