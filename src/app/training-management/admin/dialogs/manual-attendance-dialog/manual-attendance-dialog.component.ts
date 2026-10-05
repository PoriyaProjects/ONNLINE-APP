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
}

@Component({
  selector: 'app-manual-attendance-dialog',
  templateUrl: './manual-attendance-dialog.component.html',
  styleUrls: ['./manual-attendance-dialog.component.scss'],
})
export class ManualAttendanceDialogComponent {
  attended = true;
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
      this.ref.close({ confirmed: false, attended: false });
    }
  }

  confirm(): void {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.ref.close({ confirmed: true, attended: this.attended });
  }
}
