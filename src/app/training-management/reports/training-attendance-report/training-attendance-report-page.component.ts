import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AttendanceReportRow,
  TRAINING_ATTENDANCE_STATUS_HE,
  TRAINING_REGISTRATION_STATUS_HE,
  TrainingAttendanceStatus,
  TrainingRegistrationStatus,
  TrainingReportFilter,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { exportTrainingRowsToExcel } from '../../utils/training-report-excel.util';

@Component({
  selector: 'app-training-attendance-report-page',
  templateUrl: './training-attendance-report-page.component.html',
  styleUrls: ['../shared/training-report-page.shared.scss'],
})
export class TrainingAttendanceReportPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  rows: AttendanceReportRow[] = [];
  totalCount = 0;
  filter: TrainingReportFilter = { Skip: 0, Take: 50 };
  displayedColumns = [
    'EmployeeID',
    'EmployeeFullName',
    'DepartmentName',
    'CourseName',
    'SessionDate',
    'RegistrationStatus',
    'AttendanceStatus',
    'ConfirmedAt',
    'IsManualUpdate',
  ];
  private destroy$ = new Subject<void>();

  constructor(private api: TrainingManagementApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  onFilterApply(f: TrainingReportFilter): void {
    this.filter = { ...f, Skip: 0, Take: this.filter.Take || 50 };
    this.load();
  }
  onPage(e: PageEvent): void {
    this.filter = { ...this.filter, Skip: e.pageIndex * e.pageSize, Take: e.pageSize };
    this.load();
  }
  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getTrainingReports({ ReportType: 'Attendance', Filter: this.filter, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.rows = [];
            this.totalCount = 0;
            this.errorMessage = trainingErrorMessage(result, 'לא נמצאו נתוני נוכחות בטווח שנבחר.');
            return;
          }
          this.rows = (result.Data && result.Data.Attendance) || [];
          this.totalCount = (result.Data && result.Data.TotalCount) || this.rows.length;
        },
        () => {
          this.loading = false;
          this.rows = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }
  formatDate(v?: string | null): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }
  regLabel(s: number): string {
    return TRAINING_REGISTRATION_STATUS_HE[s as TrainingRegistrationStatus] || '—';
  }
  attLabel(s: number): string {
    return TRAINING_ATTENDANCE_STATUS_HE[s as TrainingAttendanceStatus] || '—';
  }
  exportExcel(): void {
    try {
      exportTrainingRowsToExcel(
        'attendance-report',
        'נוכחות',
        ['עובד', 'שם', 'סקטור', 'מחלקה', 'קורס', 'תאריך', 'הרשמה', 'נוכחות', 'אישור', 'ידני'],
        this.rows.map((r) => [
          r.EmployeeID,
          r.EmployeeFullName,
          r.EmployeeSektorDescription || '',
          r.DepartmentName || r.DepartmentCode || '',
          r.CourseName,
          this.formatDate(r.SessionDate),
          this.regLabel(r.RegistrationStatus),
          this.attLabel(r.AttendanceStatus),
          this.formatDate(r.ConfirmedAt),
          r.IsManualUpdate ? 'כן' : 'לא',
        ]),
        ['דוח נוכחות והיעדרויות', 'נוצר: ' + new Date().toLocaleString('he-IL')]
      );
      this.snackBar.open('הדוח נמצא בתהליך הפקה.', 'סגור', { duration: 2500 });
    } catch (e) {
      this.snackBar.open((e && (e as Error).message) || 'לא ניתן היה להפיק את הדוח.', 'סגור', { duration: 4000 });
    }
  }
  print(): void {
    window.print();
  }
}
