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
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
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
      startTime: row.session.StartTime,
      endTime: row.session.EndTime,
      location: row.session.Location || '',
      lecturerName: row.session.LecturerName || '',
    };
    const ref = this.dialog.open(RegistrationConfirmDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data,
      disableClose: false,
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (confirmed) {
        this.submitRegister(row);
      }
    });
  }

  private submitRegister(row: SessionRowVm): void {
    if (this.registerInFlight) {
      return;
    }
    this.registerInFlight = true;
    row.registering = true;
    this.api
      .registerEmployeeToSession({ SessionId: row.session.Id, ActingEmployeeID: '' })
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
          this.snackBar.open('נרשמת בהצלחה למועד.', 'סגור', { duration: 4000 });
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
    return {
      session,
      dateLabel,
      timeLabel: `${session.StartTime} – ${session.EndTime}`,
      capacityLabel: `${session.RegisteredCount}/${session.Capacity} (פנויים: ${session.AvailablePlaces})`,
      closeLabel,
      availability,
      registering: false,
    };
  }
}
