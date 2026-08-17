import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TRAINING_CERTIFICATE_STATUS_HE,
  TrainingCertificateStatus,
  TrainingCertificateSummary,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

export interface CertificateCardVm {
  item: TrainingCertificateSummary;
  sessionDateLabel: string;
  issuedLabel: string;
  expiresLabel: string;
  statusLabel: string;
  isExpired: boolean;
  isPending: boolean;
  isFailed: boolean;
  isIssuedWithoutFile: boolean;
  canDownload: boolean;
  downloading: boolean;
  statusTone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done';
}

@Component({
  selector: 'app-my-certificates-page',
  templateUrl: './my-certificates-page.component.html',
  styleUrls: ['./my-certificates-page.component.scss'],
})
export class MyCertificatesPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  downloadError: string | null = null;
  viewModels: CertificateCardVm[] = [];
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

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.downloadError = null;
    this.api
      .getEmployeeCertificates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.viewModels = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון תעודות.');
            return;
          }
          const items = result.Data || [];
          this.viewModels = items.map((item) => this.toVm(item));
        },
        () => {
          this.loading = false;
          this.viewModels = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  trackById(_index: number, vm: CertificateCardVm): number {
    return vm.item.Id;
  }

  download(vm: CertificateCardVm): void {
    if (!vm.canDownload || vm.downloading || this.downloadInFlight) {
      return;
    }
    this.downloadError = null;
    this.downloadInFlight = true;
    vm.downloading = true;
    this.api
      .downloadEmployeeCertificate({ CertificateId: vm.item.Id, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.downloadInFlight = false;
          vm.downloading = false;
          if (!result || !result.Success || !result.Data || !result.Data.ContentBase64) {
            this.downloadError = trainingErrorMessage(result, 'לא ניתן להוריד את התעודה כרגע.');
            return;
          }
          try {
            this.saveBase64Pdf(result.Data.ContentBase64, result.Data.FileName || 'certificate.pdf');
            this.snackBar.open('התעודה הורדה בהצלחה.', 'סגור', { duration: 3000 });
          } catch (_e) {
            this.downloadError = 'לא ניתן להוריד את התעודה כרגע.';
          }
        },
        () => {
          this.downloadInFlight = false;
          vm.downloading = false;
          this.downloadError = 'לא ניתן להוריד את התעודה כרגע.';
        }
      );
  }

  private toVm(item: TrainingCertificateSummary): CertificateCardVm {
    const status = item.Status;
    const isExpired =
      status === TrainingCertificateStatus.Expired || this.isPastExpiry(item.ExpiresAt);
    const isPending = status === TrainingCertificateStatus.Pending;
    const isFailed = status === TrainingCertificateStatus.Failed;
    const isIssuedWithoutFile =
      (status === TrainingCertificateStatus.Issued || status === TrainingCertificateStatus.Sent) &&
      !item.DownloadAvailable;
    return {
      item,
      sessionDateLabel: formatTrainingDate(parseTrainingDate(item.SessionDate)) || item.SessionDate || '—',
      issuedLabel: formatTrainingDate(parseTrainingDate(item.IssuedAt)) || item.IssuedAt || '—',
      expiresLabel: item.ExpiresAt
        ? formatTrainingDate(parseTrainingDate(item.ExpiresAt)) || item.ExpiresAt
        : 'ללא תאריך תפוגה',
      statusLabel: TRAINING_CERTIFICATE_STATUS_HE[status] || 'לא ידוע',
      isExpired,
      isPending,
      isFailed,
      isIssuedWithoutFile,
      canDownload: !!item.DownloadAvailable && !isFailed && status !== TrainingCertificateStatus.Void,
      downloading: false,
      statusTone: this.toneForStatus(status, isExpired),
    };
  }

  private toneForStatus(
    status: TrainingCertificateStatus,
    isExpired: boolean
  ): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' {
    if (isExpired || status === TrainingCertificateStatus.Expired) {
      return 'danger';
    }
    if (status === TrainingCertificateStatus.Sent || status === TrainingCertificateStatus.Issued) {
      return 'ok';
    }
    if (status === TrainingCertificateStatus.Pending) {
      return 'info';
    }
    if (status === TrainingCertificateStatus.Failed || status === TrainingCertificateStatus.Void) {
      return 'danger';
    }
    return 'neutral';
  }

  private isPastExpiry(expiresAt?: string | null): boolean {
    if (!expiresAt) {
      return false;
    }
    const d = parseTrainingDate(expiresAt);
    if (!d) {
      return false;
    }
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    return end.getTime() < Date.now();
  }

  private saveBase64Pdf(base64: string, fileName: string): void {
    const cleaned = String(base64).replace(/^data:application\/pdf;base64,/, '');
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.replace(/[\\/:*?"<>|]/g, '_');
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
