import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface CourseStatusConfirmData {
  courseName: string;
  activate: boolean;
}

@Component({
  selector: 'app-course-status-confirm-dialog',
  templateUrl: './course-status-confirm-dialog.component.html',
  styleUrls: ['./course-status-confirm-dialog.component.scss'],
})
export class CourseStatusConfirmDialogComponent {
  submitting = false;

  constructor(
    private ref: MatDialogRef<CourseStatusConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: CourseStatusConfirmData
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
