import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TRAINING_COMPLIANCE_STATUS_HE,
  TrainingComplianceReport,
  TrainingComplianceStatus,
  TrainingErrorCodes,
  TrainingReportFilter,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { exportTrainingRowsToExcel } from '../../utils/training-report-excel.util';

@Component({
  selector: 'app-training-compliance-report-page',
  templateUrl: './training-compliance-report-page.component.html',
  styleUrls: ['../shared/training-report-page.shared.scss'],
})
export class TrainingComplianceReportPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  complianceRulesMissing = false;
  rows: TrainingComplianceReport[] = [];
  totalCount = 0;
  filter: TrainingReportFilter = { Skip: 0, Take: 50 };
  displayedColumns = [
    'EmployeeID',
    'EmployeeFullName',
    'DepartmentCode',
    'CourseName',
    'ComplianceStatus',
    'LastCompletedAt',
    'CertificateExpiresAt',
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
    this.complianceRulesMissing = false;
    this.api
      .getTrainingReports({ ReportType: 'Compliance', Filter: this.filter, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.rows = [];
            this.totalCount = 0;
            if (result && result.ErrorCode === TrainingErrorCodes.ReportComplianceRulesMissing) {
              this.complianceRulesMissing = true;
              this.errorMessage = trainingErrorMessage(
                result,
                'לא הוגדרו כללי התאמה מלאים להכשרות החובה.'
              );
            } else {
              this.errorMessage = trainingErrorMessage(result, 'לא נמצאו נתוני עמידה בהכשרות החובה.');
            }
            return;
          }
          this.rows = (result.Data && result.Data.Compliance) || [];
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
  statusLabel(s: number): string {
    return TRAINING_COMPLIANCE_STATUS_HE[s as TrainingComplianceStatus] || '—';
  }
  exportExcel(): void {
    try {
      exportTrainingRowsToExcel(
        'compliance-report',
        'עמידה',
        ['עובד', 'שם', 'סקטור', 'מחלקה', 'קורס', 'סטטוס', 'השלמה אחרונה', 'תוקף תעודה'],
        this.rows.map((r) => [
          r.EmployeeID,
          r.EmployeeFullName,
          r.EmployeeSektorDescription || '',
          r.DepartmentCode || '',
          r.CourseName,
          this.statusLabel(r.ComplianceStatus),
          this.formatDate(r.LastCompletedAt),
          this.formatDate(r.CertificateExpiresAt),
        ]),
        ['דוח עמידה בהכשרות חובה', 'נוצר: ' + new Date().toLocaleString('he-IL')]
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
