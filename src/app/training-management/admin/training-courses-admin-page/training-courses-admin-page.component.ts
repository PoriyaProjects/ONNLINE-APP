import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseStatus, TrainingCourseSummary } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { formatDurationHoursLabel } from '../../utils/training-duration.util';
import { canActivateCourse, canDeactivateCourse } from '../../utils/training-status-transition.util';
import {
  CourseStatusConfirmDialogComponent,
} from '../dialogs/course-status-confirm-dialog/course-status-confirm-dialog.component';

@Component({
  selector: 'app-training-courses-admin-page',
  templateUrl: './training-courses-admin-page.component.html',
  styleUrls: ['./training-courses-admin-page.component.scss'],
})
export class TrainingCoursesAdminPageComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns = ['Name', 'CourseType', 'DurationMinutes', 'ValidityMonths', 'IsMandatory', 'Status', 'actions'];
  dataSource = new MatTableDataSource<TrainingCourseSummary>([]);
  loading = false;
  errorMessage: string | null = null;
  searchText = '';
  courseType = '';
  statusFilter: string = '';
  mandatoryFilter: string = '';
  courseTypes: string[] = [];
  busyId: number | null = null;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private all: TrainingCourseSummary[] = [];
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
      .getCourses({ ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.all = [];
            this.dataSource.data = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון קורסים.');
            return;
          }
          this.all = result.Data || [];
          this.courseTypes = Array.from(
            new Set(this.all.map((c) => c.CourseType).filter((t) => !!t) as string[])
          ).sort();
          this.applyFilters();
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  clearFilters(): void {
    this.searchText = '';
    this.courseType = '';
    this.statusFilter = '';
    this.mandatoryFilter = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    this.dataSource.data = this.all.filter((c) => {
      if (q && `${c.Code} ${c.Name} ${c.Description || ''}`.toLowerCase().indexOf(q) < 0) {
        return false;
      }
      if (this.courseType && c.CourseType !== this.courseType) {
        return false;
      }
      if (this.statusFilter !== '' && String(c.Status) !== this.statusFilter) {
        return false;
      }
      if (this.mandatoryFilter === '1' && !c.IsMandatory) {
        return false;
      }
      if (this.mandatoryFilter === '0' && c.IsMandatory) {
        return false;
      }
      return true;
    });
  }

  create(): void {
    this.router.navigate(['/training-management/admin/courses/new']);
  }

  durationLabel(minutes: number | null | undefined): string {
    return formatDurationHoursLabel(minutes) || '—';
  }

  edit(row: TrainingCourseSummary): void {
    this.router.navigate(['/training-management/admin/courses', row.Id, 'edit']);
  }

  canActivate(row: TrainingCourseSummary): boolean {
    return canActivateCourse(row.Status);
  }

  canDeactivate(row: TrainingCourseSummary): boolean {
    return canDeactivateCourse(row.Status);
  }

  toggleStatus(row: TrainingCourseSummary, activate: boolean): void {
    if (this.busyId != null) {
      return;
    }
    const ref = this.dialog.open(CourseStatusConfirmDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data: { courseName: row.Name, activate },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyId = row.Id;
      const req$ = activate
        ? this.api.activateCourse({ CourseId: row.Id, ActingEmployeeID: '' })
        : this.api.deactivateCourse({ CourseId: row.Id, ActingEmployeeID: '' });
      req$.pipe(takeUntil(this.destroy$)).subscribe(
        (result) => {
          this.busyId = null;
          if (!result || !result.Success) {
            this.snackBar.open(trainingErrorMessage(result), 'סגור', { duration: 5000 });
            return;
          }
          this.snackBar.open(activate ? 'הקורס הופעל.' : 'הקורס הושבת.', 'סגור', { duration: 3500 });
          this.load();
        },
        () => {
          this.busyId = null;
          this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
        }
      );
    });
  }

  statusTone(status: TrainingCourseStatus): 'ok' | 'neutral' | 'warn' {
    if (status === TrainingCourseStatus.Active) {
      return 'ok';
    }
    if (status === TrainingCourseStatus.Draft) {
      return 'warn';
    }
    return 'neutral';
  }
}
