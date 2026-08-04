import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingSessionStatus, TrainingSessionSummary } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { canCancelSession, canEditSession } from '../../utils/training-status-transition.util';
import { SessionCancelAdminDialogComponent } from '../dialogs/session-cancel-admin-dialog/session-cancel-admin-dialog.component';

@Component({
  selector: 'app-training-sessions-admin-page',
  templateUrl: './training-sessions-admin-page.component.html',
  styleUrls: ['./training-sessions-admin-page.component.scss'],
})
export class TrainingSessionsAdminPageComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns = [
    'Id',
    'CourseName',
    'SessionDate',
    'time',
    'Location',
    'LecturerName',
    'capacity',
    'RegistrationCloseAt',
    'Status',
    'actions',
  ];
  dataSource = new MatTableDataSource<TrainingSessionSummary>([]);
  loading = false;
  errorMessage: string | null = null;
  searchText = '';
  statusFilter = '';
  availableOnly = false;
  busyId: number | null = null;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private all: TrainingSessionSummary[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private api: TrainingManagementApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getSessions({ ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.all = [];
            this.dataSource.data = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון מועדים.');
            return;
          }
          this.all = result.Data || [];
          this.applyFilters();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    this.dataSource.data = this.all.filter((s) => {
      if (
        q &&
        `${s.CourseName || ''} ${s.Location || ''} ${s.LecturerName || ''} ${s.Id}`.toLowerCase().indexOf(q) < 0
      ) {
        return false;
      }
      if (this.statusFilter !== '' && String(s.Status) !== this.statusFilter) {
        return false;
      }
      if (this.availableOnly && s.AvailablePlaces <= 0) {
        return false;
      }
      return true;
    });
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = '';
    this.availableOnly = false;
    this.applyFilters();
  }

  dateLabel(value: string): string {
    return formatTrainingDate(parseTrainingDate(value)) || value || '—';
  }

  create(): void {
    this.router.navigate(['/training-management/admin/sessions/new']);
  }

  edit(row: TrainingSessionSummary): void {
    this.router.navigate(['/training-management/admin/sessions', row.Id, 'edit']);
  }

  participants(row: TrainingSessionSummary): void {
    this.router.navigate(['/training-management/admin/sessions', row.Id, 'participants']);
  }

  allowEdit(row: TrainingSessionSummary): boolean {
    return canEditSession(row.Status);
  }

  allowCancel(row: TrainingSessionSummary): boolean {
    return canCancelSession(row.Status);
  }

  openCancel(row: TrainingSessionSummary): void {
    if (this.busyId != null) {
      return;
    }
    const ref = this.dialog.open(SessionCancelAdminDialogComponent, {
      width: '460px',
      direction: 'rtl',
      data: {
        courseName: row.CourseName || '',
        sessionDate: this.dateLabel(row.SessionDate),
        timeLabel: `${row.StartTime} – ${row.EndTime}`,
        location: row.Location || '',
        registeredCount: row.RegisteredCount,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result || !result.confirmed) {
        return;
      }
      this.busyId = row.Id;
      this.api
        .cancelSession({ SessionId: row.Id, Reason: result.reason, ActingEmployeeID: '' })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            this.busyId = null;
            if (!res || !res.Success) {
              this.snackBar.open(trainingErrorMessage(res), 'סגור', { duration: 5000 });
              return;
            }
            this.snackBar.open('המועד בוטל.', 'סגור', { duration: 3500 });
            this.load();
          },
          () => {
            this.busyId = null;
            this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
          }
        );
    });
  }

  statusTone(status: TrainingSessionStatus): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
    if (status === TrainingSessionStatus.Open) {
      return 'ok';
    }
    if (status === TrainingSessionStatus.Full) {
      return 'warn';
    }
    if (status === TrainingSessionStatus.Cancelled) {
      return 'danger';
    }
    if (status === TrainingSessionStatus.Completed) {
      return 'info';
    }
    return 'neutral';
  }
}
