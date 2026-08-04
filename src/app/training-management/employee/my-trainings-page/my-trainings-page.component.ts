import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TrainingRegistrationStatus,
  TrainingRegistrationSummary,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import {
  CancellationConfirmDialogComponent,
  CancellationConfirmDialogData,
} from '../cancellation-confirm-dialog/cancellation-confirm-dialog.component';

export type MyTrainingsTab = 'upcoming' | 'completed' | 'cancelled' | 'all';

export interface RegistrationCardVm {
  item: TrainingRegistrationSummary;
  dateLabel: string;
  timeLabel: string;
  registeredLabel: string;
  canCancel: boolean;
  cancelling: boolean;
  attendanceTone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done';
  certificateTone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done';
}

@Component({
  selector: 'app-my-trainings-page',
  templateUrl: './my-trainings-page.component.html',
  styleUrls: ['./my-trainings-page.component.scss'],
})
export class MyTrainingsPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  activeTab: MyTrainingsTab = 'upcoming';
  searchText = '';
  allItems: TrainingRegistrationSummary[] = [];
  viewModels: RegistrationCardVm[] = [];
  private destroy$ = new Subject<void>();
  private cancelInFlight = false;

  constructor(
    private api: TrainingManagementApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRegistrations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getEmployeeRegistrations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.allItems = [];
            this.viewModels = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון הרשמות.');
            return;
          }
          this.allItems = result.Data || [];
          this.applyFilters();
        },
        () => {
          this.loading = false;
          this.allItems = [];
          this.viewModels = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  setTab(tab: MyTrainingsTab): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  onSearchChanged(): void {
    this.applyFilters();
  }

  trackByRegistrationId(_index: number, vm: RegistrationCardVm): number {
    return vm.item.Id;
  }

  openCourse(courseId: number | null | undefined): void {
    if (courseId == null) {
      return;
    }
    this.router.navigate(['/training-management/courses', courseId]);
  }

  goToCourses(): void {
    this.router.navigate(['/training-management/courses']);
  }

  openCancel(vm: RegistrationCardVm): void {
    if (!vm.canCancel || this.cancelInFlight || vm.cancelling) {
      return;
    }
    const data: CancellationConfirmDialogData = {
      courseName: vm.item.CourseName || '',
      sessionDate: vm.dateLabel,
      startTime: vm.item.StartTime || '',
      endTime: vm.item.EndTime || '',
      location: vm.item.Location || '',
      cancellationDeadline: null,
    };
    const ref = this.dialog.open(CancellationConfirmDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data,
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result && result.confirmed) {
        this.submitCancel(vm, result.reason || '');
      }
    });
  }

  private submitCancel(vm: RegistrationCardVm, reason: string): void {
    if (this.cancelInFlight) {
      return;
    }
    this.cancelInFlight = true;
    vm.cancelling = true;
    this.api
      .cancelEmployeeRegistration({
        RegistrationId: vm.item.Id,
        Reason: reason || null,
        ActingEmployeeID: '',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.cancelInFlight = false;
          vm.cancelling = false;
          if (!result || !result.Success) {
            this.snackBar.open(trainingErrorMessage(result), 'סגור', { duration: 5000 });
            return;
          }
          this.snackBar.open('ההרשמה בוטלה בהצלחה.', 'סגור', { duration: 4000 });
          this.loadRegistrations();
        },
        () => {
          this.cancelInFlight = false;
          vm.cancelling = false;
          this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
        }
      );
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    const now = new Date();
    const filtered = this.allItems.filter((item) => {
      if (q) {
        const hay = `${item.CourseName || ''} ${item.Location || ''}`.toLowerCase();
        if (hay.indexOf(q) < 0) {
          return false;
        }
      }
      if (this.activeTab === 'all') {
        return true;
      }
      if (this.activeTab === 'cancelled') {
        return item.Status === TrainingRegistrationStatus.Cancelled;
      }
      if (this.activeTab === 'completed') {
        return (
          item.Status === TrainingRegistrationStatus.Attended ||
          item.Status === TrainingRegistrationStatus.Completed ||
          item.Status === TrainingRegistrationStatus.Absent
        );
      }
      // upcoming
      if (item.Status !== TrainingRegistrationStatus.Registered) {
        return false;
      }
      const d = parseTrainingDate(item.SessionDate);
      if (!d) {
        return true;
      }
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      return endOfDay.getTime() >= now.getTime();
    });

    this.viewModels = filtered.map((item) => this.toVm(item));
  }

  private toVm(item: TrainingRegistrationSummary): RegistrationCardVm {
    const dateLabel =
      formatTrainingDate(parseTrainingDate(item.SessionDate)) || item.SessionDate || '';
    const registeredLabel =
      formatTrainingDate(parseTrainingDate(item.RegisteredAt)) || item.RegisteredAt || '';
    const canCancel =
      item.Status === TrainingRegistrationStatus.Registered &&
      item.AttendanceStatus !== 1 &&
      item.AttendanceStatus !== 3;

    return {
      item,
      dateLabel,
      timeLabel: `${item.StartTime || ''} – ${item.EndTime || ''}`,
      registeredLabel,
      canCancel,
      cancelling: false,
      attendanceTone: this.toneForAttendance(item.AttendanceStatus),
      certificateTone: this.toneForCertificate(item.CertificateStatus),
    };
  }

  private toneForAttendance(
    status: number | null | undefined
  ): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' {
    if (status === 1 || status === 3) {
      return 'ok';
    }
    if (status === 0) {
      return 'danger';
    }
    if (status === 2) {
      return 'warn';
    }
    return 'neutral';
  }

  private toneForCertificate(
    status: number | null | undefined
  ): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' {
    if (status === 1 || status === 4) {
      return 'ok';
    }
    if (status === 5 || status === 0) {
      return 'danger';
    }
    if (status === 3) {
      return 'warn';
    }
    if (status === 2) {
      return 'neutral';
    }
    return 'neutral';
  }
}
