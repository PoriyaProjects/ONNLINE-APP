import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DepartmentPlanReturnApiService } from '../shared/department-plan-return-api.service';
import {
  DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS,
  DepartmentPlanReturnRecord,
  DepartmentPlanTreatmentStatus,
} from '../shared/department-plan-return.models';
import { SURGERY_DEPT_PLAN_RETURN_DIALOG_PANEL_CLASS } from '../shared/surgeries-dialog-sizing';
import { DepartmentPlanReturnDialogComponent } from './department-plan-return-dialog.component';

@Component({
  selector: 'app-department-plan-return-report-dialog',
  templateUrl: './department-plan-return-report-dialog.html',
  styleUrls: ['../styles/components/department-plan-return-report-dialog.css'],
})
export class DepartmentPlanReturnReportDialogComponent implements OnInit {
  readonly statusLabels = DEPARTMENT_PLAN_TREATMENT_STATUS_LABELS;
  readonly statusOptions: Array<DepartmentPlanTreatmentStatus | 'all'> = [
    'all',
    'pending',
    'in_progress',
    'completed',
  ];

  loading = false;
  records: DepartmentPlanReturnRecord[] = [];
  dateFrom = '';
  dateTo = '';
  selectedDepartments: string[] = [];
  treatmentStatus: DepartmentPlanTreatmentStatus | 'all' = 'all';
  departmentOptions: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<DepartmentPlanReturnReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { departments?: string[]; defaultDate?: string },
    private api: DepartmentPlanReturnApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const defaultDate = this.data?.defaultDate ?? new Date().toISOString().slice(0, 10);
    this.dateFrom = defaultDate;
    this.dateTo = defaultDate;
    this.departmentOptions = [...(this.data?.departments ?? [])];
    this.loadReport();
  }

  close(): void {
    this.dialogRef.close();
  }

  loadReport(): void {
    this.loading = true;
    this.api
      .getReport({
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        departments: this.selectedDepartments,
        treatmentStatus: this.treatmentStatus,
      })
      .subscribe((records) => {
        this.records = records;
        this.loading = false;
      });
  }

  exportExcel(): void {
    if (this.records.length === 0) {
      this.openSnackBar('אין נתונים לייצוא');
      return;
    }

    const lines = [
      'תאריך,מחלקה,חדר,אזור,סטטוס טיפול,נשלח ע״י,תאריך שליחה,הערה כללית,מספר ניתוחים',
    ];

    this.records.forEach((record) => {
      lines.push([
        record.planDate,
        record.departmentDisplay || record.department,
        record.roomCode,
        record.calendarRoomsArea,
        this.statusLabels[record.treatmentStatus] ?? record.treatmentStatus,
        record.sentBy,
        record.sentAt,
        `"${String(record.generalComment ?? '').replace(/"/g, '""')}"`,
        record.surgeries?.length ?? 0,
      ].join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `דוח-תוכניות-שהוחזרו-למחלקות-${this.dateFrom}-${this.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  openRespondDialog(record: DepartmentPlanReturnRecord): void {
    this.dialog.open(DepartmentPlanReturnDialogComponent, {
      data: {
        mode: 'respond',
        department: record.department,
        roomCode: record.roomCode,
        planDate: record.planDate,
        calendarRoomsArea: record.calendarRoomsArea,
        returnId: record.returnId,
      },
      panelClass: SURGERY_DEPT_PLAN_RETURN_DIALOG_PANEL_CLASS,
      autoFocus: false,
      width: 'min(96vw, 1080px)',
      maxWidth: '98vw',
      height: 'min(90vh, 820px)',
      maxHeight: '94vh',
      direction: 'rtl',
    });
  }

  getStatusLabel(status: DepartmentPlanTreatmentStatus): string {
    return this.statusLabels[status] ?? status;
  }

  getStatusBadgeClass(status: DepartmentPlanTreatmentStatus): string {
    return `dept-plan-report__badge--${status}`;
  }

  getSurgeryCount(record: DepartmentPlanReturnRecord): number {
    return record.surgeries && record.surgeries.length ? record.surgeries.length : 0;
  }

  private openSnackBar(message: string): void {
    this.snackBar.open(message, 'X', { duration: 5000 });
  }
}
