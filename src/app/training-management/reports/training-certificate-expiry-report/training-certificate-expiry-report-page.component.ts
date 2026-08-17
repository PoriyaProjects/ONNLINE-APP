import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ExpiringCertificateReport,
  TRAINING_CERTIFICATE_STATUS_HE,
  TrainingCertificateStatus,
  TrainingReportFilter,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { buildCertificateHtml } from '../../utils/training-certificate-html.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { exportTrainingRowsToExcel } from '../../utils/training-report-excel.util';

@Component({
  selector: 'app-training-certificate-expiry-report-page',
  templateUrl: './training-certificate-expiry-report-page.component.html',
  styleUrls: ['../shared/training-report-page.shared.scss'],
})
export class TrainingCertificateExpiryReportPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  downloadError: string | null = null;
  rows: ExpiringCertificateReport[] = [];
  totalCount = 0;
  filter: TrainingReportFilter = { Skip: 0, Take: 50 };
  displayedColumns = [
    'EmployeeID',
    'EmployeeFullName',
    'DepartmentName',
    'CourseName',
    'CertificateNumber',
    'IssuedAt',
    'ExpiresAt',
    'DaysUntilExpiry',
    'Status',
    'actions',
  ];
  private destroy$ = new Subject<void>();
  private downloadInFlight = false;

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
      .getTrainingReports({ ReportType: 'ExpiringCertificates', Filter: this.filter, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.rows = [];
            this.totalCount = 0;
            this.errorMessage = trainingErrorMessage(result, 'לא נמצאו תעודות בטווח שנבחר.');
            return;
          }
          this.rows = (result.Data && result.Data.ExpiringCertificates) || [];
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
    return TRAINING_CERTIFICATE_STATUS_HE[s as TrainingCertificateStatus] || '—';
  }
  download(row: ExpiringCertificateReport): void {
    const status = row.Status as TrainingCertificateStatus;
    const canDownload =
      status === TrainingCertificateStatus.Issued ||
      status === TrainingCertificateStatus.Sent;
    if (!canDownload || this.downloadInFlight) {
      return;
    }
    this.downloadInFlight = true;
    this.downloadError = null;
    this.api
      .downloadEmployeeCertificate({
        CertificateId: row.CertificateId,
        ActingEmployeeID: '',
        HtmlContent: buildCertificateHtml({
          EmployeeFullName: row.EmployeeFullName,
          EmployeeID: row.EmployeeID,
          CourseName: row.CourseName,
          SessionDate: row.IssuedAt || row.ExpiresAt,
          CertificateNumber: row.CertificateNumber,
        }),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.downloadInFlight = false;
          if (!result || !result.Success || !result.Data || !result.Data.ContentBase64) {
            this.downloadError = trainingErrorMessage(result, 'לא ניתן להוריד את התעודה כרגע.');
            return;
          }
          const cleaned = String(result.Data.ContentBase64).replace(/^data:application\/pdf;base64,/, '');
          const binary = atob(cleaned);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = (result.Data.FileName || 'certificate.pdf').replace(/[\\/:*?"<>|]/g, '_');
          a.click();
          URL.revokeObjectURL(url);
        },
        () => {
          this.downloadInFlight = false;
          this.downloadError = 'לא ניתן להוריד את התעודה כרגע.';
        }
      );
  }
  exportExcel(): void {
    try {
      exportTrainingRowsToExcel(
        'certificate-expiry-report',
        'תעודות',
        ['עובד', 'שם', 'מחלקה', 'קורס', 'מספר', 'הנפקה', 'תפוגה', 'ימים', 'סטטוס'],
        this.rows.map((r) => [
          r.EmployeeID,
          r.EmployeeFullName,
          r.DepartmentName || r.DepartmentCode || '',
          r.CourseName,
          r.CertificateNumber,
          this.formatDate(r.IssuedAt),
          this.formatDate(r.ExpiresAt),
          r.DaysUntilExpiry,
          this.statusLabel(r.Status),
        ]),
        ['דוח תוקף תעודות', 'נוצר: ' + new Date().toLocaleString('he-IL')]
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
