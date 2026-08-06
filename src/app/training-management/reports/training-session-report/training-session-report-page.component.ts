import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  SessionCompletionReport,
  TRAINING_SESSION_STATUS_HE,
  TrainingReportFilter,
  TrainingSessionStatus,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { exportTrainingRowsToExcel } from '../../utils/training-report-excel.util';

@Component({
  selector: 'app-training-session-report-page',
  templateUrl: './training-session-report-page.component.html',
  styleUrls: ['../shared/training-report-page.shared.scss'],
})
export class TrainingSessionReportPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  rows: SessionCompletionReport[] = [];
  totalCount = 0;
  filter: TrainingReportFilter = { Skip: 0, Take: 50 };
  displayedColumns = [
    'SessionId',
    'CourseName',
    'SessionDate',
    'Location',
    'LecturerName',
    'Capacity',
    'RegisteredCount',
    'AttendedCount',
    'AbsentCount',
    'CompletionRatePercent',
    'Status',
    'actions',
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private api: TrainingManagementApiService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

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
      .getTrainingReports({
        ReportType: 'SessionCompletion',
        Filter: this.filter,
        ActingEmployeeID: '',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.rows = [];
            this.totalCount = 0;
            this.errorMessage = trainingErrorMessage(result, 'לא נמצאו מועדי הדרכה התואמים למסננים שנבחרו.');
            return;
          }
          this.rows = (result.Data && result.Data.SessionCompletion) || [];
          this.totalCount = (result.Data && result.Data.TotalCount) || this.rows.length;
          if (!this.rows.length) {
            this.errorMessage = null;
          }
        },
        () => {
          this.loading = false;
          this.rows = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  statusLabel(s: number): string {
    return TRAINING_SESSION_STATUS_HE[s as TrainingSessionStatus] || '—';
  }

  formatDate(v?: string | null): string {
    return formatTrainingDate(parseTrainingDate(v)) || v || '—';
  }

  openParticipants(row: SessionCompletionReport): void {
    this.router.navigateByUrl('/training-management/admin/sessions/' + row.SessionId + '/participants');
  }

  exportExcel(): void {
    try {
      exportTrainingRowsToExcel(
        'session-completion-report',
        'מועדים',
        [
          'מזהה',
          'קורס',
          'תאריך',
          'מיקום',
          'מרצה',
          'מכסה',
          'רשומים',
          'נוכחים',
          'נעדרים',
          'אחוז השלמה',
          'סטטוס',
        ],
        this.rows.map((r) => [
          r.SessionId,
          r.CourseName,
          this.formatDate(r.SessionDate),
          r.Location || '',
          r.LecturerName || '',
          r.Capacity,
          r.RegisteredCount,
          r.AttendedCount,
          r.AbsentCount,
          r.CompletionRatePercent,
          this.statusLabel(r.Status),
        ]),
        ['דוח מועדי הדרכה', 'נוצר: ' + new Date().toLocaleString('he-IL')]
      );
      this.snackBar.open('הדוח נמצא בתהליך הפקה.', 'סגור', { duration: 2500 });
    } catch (e) {
      this.snackBar.open((e && (e as Error).message) || 'לא ניתן היה להפיק את הדוח.', 'סגור', {
        duration: 4000,
      });
    }
  }

  print(): void {
    window.print();
  }
}
