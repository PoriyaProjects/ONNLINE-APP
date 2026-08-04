import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CourseSummaryReport, TrainingReportFilter } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { exportTrainingRowsToExcel } from '../../utils/training-report-excel.util';

@Component({
  selector: 'app-training-course-report-page',
  templateUrl: './training-course-report-page.component.html',
  styleUrls: ['../shared/training-report-page.shared.scss'],
})
export class TrainingCourseReportPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  rows: CourseSummaryReport[] = [];
  totalCount = 0;
  filter: TrainingReportFilter = { Skip: 0, Take: 50 };
  displayedColumns = [
    'CourseCode',
    'CourseName',
    'IsMandatory',
    'SessionCount',
    'RegisteredCount',
    'AttendedCount',
    'AttendanceRatePercent',
    'CertificateCount',
    'LastSessionDate',
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
      .getTrainingReports({ ReportType: 'CourseSummary', Filter: this.filter, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.rows = [];
            this.totalCount = 0;
            this.errorMessage = trainingErrorMessage(result, 'לא נמצאו נתוני קורסים.');
            return;
          }
          this.rows = (result.Data && result.Data.CourseSummary) || [];
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
  exportExcel(): void {
    try {
      exportTrainingRowsToExcel(
        'course-summary-report',
        'קורסים',
        ['קוד', 'שם', 'חובה', 'מועדים', 'רשומים', 'נוכחים', 'נוכחות %', 'תעודות', 'מועד אחרון'],
        this.rows.map((r) => [
          r.CourseCode,
          r.CourseName,
          r.IsMandatory ? 'כן' : 'לא',
          r.SessionCount,
          r.RegisteredCount,
          r.AttendedCount,
          r.AttendanceRatePercent != null ? r.AttendanceRatePercent : '',
          r.CertificateCount,
          this.formatDate(r.LastSessionDate),
        ]),
        ['דוח סיכום קורסים', 'נוצר: ' + new Date().toLocaleString('he-IL')]
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
