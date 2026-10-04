import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TrainingCourseDetails,
  TrainingCourseSummary,
  TrainingSessionSummary,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import {
  buildSessionAvailability,
  SessionAvailabilityView,
} from '../../utils/session-availability.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { formatTrainingDate, formatTrainingTimeLabel, parseTrainingDate } from '../../utils/training-date.util';
import { minutesToHours } from '../../utils/training-duration.util';
import {
  RegistrationConfirmDialogComponent,
  RegistrationConfirmDialogData,
} from '../registration-confirm-dialog/registration-confirm-dialog.component';

export interface SessionRowVm {
  session: TrainingSessionSummary;
  dateLabel: string;
  timeLabel: string;
  capacityLabel: string;
  closeLabel: string;
  availability: SessionAvailabilityView;
  capacityPercent: number;
  availBarClass: '' | 'few' | 'full';
  availabilityTone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done';
  registering: boolean;
}

@Component({
  selector: 'app-training-course-details-page',
  templateUrl: './training-course-details-page.component.html',
  styleUrls: ['./training-course-details-page.component.scss'],
})
export class TrainingCourseDetailsPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  course: TrainingCourseDetails | TrainingCourseSummary | null = null;
  sessionRows: SessionRowVm[] = [];
  private courseId = 0;
  private destroy$ = new Subject<void>();
  private registerInFlight = false;

  get durationHoursLabel(): string {
    if (!this.course || this.course.DurationMinutes == null) {
      return '';
    }
    const h = minutesToHours(this.course.DurationMinutes);
    if (h == null) {
      return '';
    }
    return `${h} שעות`;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainingManagementApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('courseId'));
      this.courseId = id;
      if (!id || Number.isNaN(id)) {
        this.errorMessage = 'מזהה קורס אינו תקין.';
        return;
      }
      this.loadAll();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getCourseDetails({ CourseId: this.courseId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (courseResult) => {
          if (courseResult && courseResult.Success && courseResult.Data) {
            this.course = courseResult.Data;
            this.loadSessions();
            return;
          }
          // Fallback: try available courses list for summary, then sessions
          this.api
            .getAvailableCourses()
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (listResult) => {
                const found =
                  listResult && listResult.Success && listResult.Data
                    ? listResult.Data.find((c) => c.Id === this.courseId)
                    : null;
                if (found) {
                  this.course = found;
                } else if (listResult && !listResult.Success) {
                  this.loading = false;
                  this.errorMessage = trainingErrorMessage(listResult);
                  return;
                } else if (courseResult && !courseResult.Success) {
                  this.loading = false;
                  this.errorMessage = trainingErrorMessage(courseResult);
                  return;
                } else {
                  this.course = {
                    Id: this.courseId,
                    Code: '',
                    Name: 'קורס הדרכה',
                    IsMandatory: false,
                    Status: 1,
                  };
                }
                this.loadSessions();
              },
              () => {
                this.loading = false;
                this.errorMessage = httpFailureMessage();
              }
            );
        },
        () => {
          this.loading = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  private loadSessions(): void {
    this.api
      .getCourseSessions({ CourseId: this.courseId, ActingEmployeeID: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.sessionRows = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון מועדים.');
            return;
          }
          this.errorMessage = null;
          const sessions = result.Data || [];
          this.sessionRows = sessions.map((s) => this.toRow(s));
        },
        () => {
          this.loading = false;
          this.sessionRows = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  backToList(): void {
    this.router.navigate(['/training-management/courses']);
  }

  trackBySessionId(_index: number, row: SessionRowVm): number {
    return row.session.Id;
  }

  openRegister(row: SessionRowVm): void {
    if (this.registerInFlight || row.registering || !row.availability.canShowRegister) {
      return;
    }
    const data: RegistrationConfirmDialogData = {
      courseName: this.course ? this.course.Name : row.session.CourseName || '',
      sessionDate: row.dateLabel,
      startTime: formatTrainingTimeLabel(row.session.StartTime),
      endTime: formatTrainingTimeLabel(row.session.EndTime),
      location: row.session.Location || '',
      lecturerName: row.session.LecturerName || '',
    };
    const ref = this.dialog.open(RegistrationConfirmDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data,
      disableClose: false,
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result && result.confirmed && result.targetEmployeeId) {
        this.submitRegister(row, result.targetEmployeeId);
      }
    });
  }

  private submitRegister(row: SessionRowVm, targetEmployeeId: string): void {
    if (this.registerInFlight) {
      return;
    }
    this.registerInFlight = true;
    row.registering = true;
    this.api
      .registerEmployeeToSession({
        SessionId: row.session.Id,
        ActingEmployeeID: '',
        TargetEmployeeID: targetEmployeeId,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.registerInFlight = false;
          row.registering = false;
          if (!result || !result.Success) {
            this.snackBar.open(trainingErrorMessage(result), 'סגור', { duration: 5000 });
            this.loadSessions();
            return;
          }
          this.snackBar.open('העובד נרשם בהצלחה למועד.', 'סגור', { duration: 4000 });
          this.loadSessions();
        },
        () => {
          this.registerInFlight = false;
          row.registering = false;
          this.snackBar.open(httpFailureMessage(), 'סגור', { duration: 5000 });
        }
      );
  }

  private toRow(session: TrainingSessionSummary): SessionRowVm {
    const dateLabel =
      formatTrainingDate(parseTrainingDate(session.SessionDate)) || session.SessionDate;
    const closeLabel =
      formatTrainingDate(parseTrainingDate(session.RegistrationCloseAt)) ||
      session.RegistrationCloseAt;
    const availability = buildSessionAvailability({
      Status: session.Status,
      AvailablePlaces: session.AvailablePlaces,
      RegistrationCloseAt: session.RegistrationCloseAt,
      IsRegisteredByCurrentEmployee: session.IsRegisteredByCurrentEmployee,
      CanRegister: session.CanRegister,
    });
    const capacity = session.Capacity > 0 ? session.Capacity : 0;
    const registered = session.RegisteredCount != null ? session.RegisteredCount : 0;
    const capacityPercent =
      capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
    return {
      session,
      dateLabel,
      timeLabel: `${formatTrainingTimeLabel(session.StartTime)} – ${formatTrainingTimeLabel(session.EndTime)}`,
      capacityLabel: `${session.RegisteredCount}/${session.Capacity} (פנויים: ${session.AvailablePlaces})`,
      closeLabel,
      availability,
      capacityPercent,
      availBarClass: this.availBarClassFor(availability.kind),
      availabilityTone: this.toneForAvailability(availability.kind),
      registering: false,
    };
  }

  private availBarClassFor(kind: SessionAvailabilityView['kind']): '' | 'few' | 'full' {
    if (kind === 'few') {
      return 'few';
    }
    if (kind === 'full' || kind === 'closed' || kind === 'cancelled') {
      return 'full';
    }
    return '';
  }

  private toneForAvailability(
    kind: SessionAvailabilityView['kind']
  ): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' {
    switch (kind) {
      case 'available':
        return 'ok';
      case 'few':
        return 'warn';
      case 'full':
      case 'closed':
      case 'cancelled':
        return 'danger';
      case 'registered':
        return 'info';
      case 'completed':
        return 'done';
      default:
        return 'neutral';
    }
  }
}
