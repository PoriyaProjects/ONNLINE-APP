import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingDirectReport } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

export interface RegistrationConfirmDialogData {
  courseName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  lecturerName: string;
}

export interface RegistrationConfirmDialogResult {
  confirmed: boolean;
  targetEmployeeId: string;
  targetEmployeeName: string;
}

@Component({
  selector: 'app-registration-confirm-dialog',
  templateUrl: './registration-confirm-dialog.component.html',
  styleUrls: ['./registration-confirm-dialog.component.scss'],
})
export class RegistrationConfirmDialogComponent implements OnInit, OnDestroy {
  submitting = false;
  loadingReports = false;
  reportsError: string | null = null;
  reports: TrainingDirectReport[] = [];
  selectedEmployeeId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<
      RegistrationConfirmDialogComponent,
      RegistrationConfirmDialogResult
    >,
    private api: TrainingManagementApiService,
    @Inject(MAT_DIALOG_DATA) public data: RegistrationConfirmDialogData
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedReport(): TrainingDirectReport | null {
    if (!this.selectedEmployeeId) {
      return null;
    }
    for (let i = 0; i < this.reports.length; i++) {
      if (this.reports[i].EmployeeID === this.selectedEmployeeId) {
        return this.reports[i];
      }
    }
    return null;
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close({ confirmed: false, targetEmployeeId: '', targetEmployeeName: '' });
  }

  confirm(): void {
    if (this.submitting || !this.selectedEmployeeId) {
      return;
    }
    const report = this.selectedReport;
    this.submitting = true;
    this.dialogRef.close({
      confirmed: true,
      targetEmployeeId: this.selectedEmployeeId,
      targetEmployeeName: report ? report.FullName || report.EmployeeID : this.selectedEmployeeId,
    });
  }

  private loadReports(): void {
    this.loadingReports = true;
    this.reportsError = null;
    this.api
      .getDirectReportsForTraining()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loadingReports = false;
          if (!result || !result.Success) {
            this.reports = [];
            this.reportsError = trainingErrorMessage(result, 'לא ניתן לטעון את רשימת העובדים.');
            return;
          }
          this.reports = result.Data || [];
          if (this.reports.length === 0) {
            this.reportsError = 'אין עובדים תחת ניהולך הישיר.';
          }
        },
        () => {
          this.loadingReports = false;
          this.reports = [];
          this.reportsError = httpFailureMessage();
        }
      );
  }
}
