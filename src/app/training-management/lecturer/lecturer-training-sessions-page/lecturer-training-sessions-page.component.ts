import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingSessionStatus, TrainingSessionSummary } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

export type LecturerSessionFilterKey = 'upcoming' | 'today' | 'completed' | 'cancelled' | 'all';

export interface LecturerSessionCardVm {
  session: TrainingSessionSummary;
  dateLabel: string;
  timeLabel: string;
  windowLabel: string;
}

@Component({
  selector: 'app-lecturer-training-sessions-page',
  templateUrl: './lecturer-training-sessions-page.component.html',
  styleUrls: ['./lecturer-training-sessions-page.component.scss'],
})
export class LecturerTrainingSessionsPageComponent implements OnInit, OnDestroy {
  loading = false;
  refreshing = false;
  errorMessage: string | null = null;
  filter: LecturerSessionFilterKey = 'upcoming';
  searchText = '';
  cards: LecturerSessionCardVm[] = [];
  private all: TrainingSessionSummary[] = [];
  private destroy$ = new Subject<void>();

  constructor(private api: TrainingManagementApiService, private router: Router) {}

  ngOnInit(): void {
    this.load(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(isRefresh: boolean): void {
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }
    this.errorMessage = null;
    this.api
      .getLecturerSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          this.refreshing = false;
          if (!result || !result.Success) {
            this.all = [];
            this.cards = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון את המועדים המשויכים.');
            return;
          }
          this.all = result.Data || [];
          this.applyFilters();
        },
        () => {
          this.loading = false;
          this.refreshing = false;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  setFilter(key: LecturerSessionFilterKey): void {
    this.filter = key;
    this.applyFilters();
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    const today = formatTrainingDate(new Date());
    const filtered = this.all.filter((s) => {
      if (q) {
        const hay = `${s.CourseName || ''} ${s.CourseCode || ''} ${s.Location || ''}`.toLowerCase();
        if (hay.indexOf(q) < 0) {
          return false;
        }
      }
      const status = s.Status;
      const dateStr = formatTrainingDate(parseTrainingDate(s.SessionDate));
      if (this.filter === 'cancelled') {
        return status === TrainingSessionStatus.Cancelled;
      }
      if (this.filter === 'completed') {
        return status === TrainingSessionStatus.Completed;
      }
      if (this.filter === 'today') {
        return dateStr === today && status !== TrainingSessionStatus.Cancelled;
      }
      if (this.filter === 'upcoming') {
        if (status === TrainingSessionStatus.Cancelled || status === TrainingSessionStatus.Completed) {
          return false;
        }
        if (!dateStr || !today) {
          return true;
        }
        return dateStr >= today;
      }
      return true;
    });
    this.cards = filtered.map((s) => this.toCard(s));
  }

  openSession(session: TrainingSessionSummary): void {
    this.router.navigate(['/training-management/lecturer/sessions', session.Id]);
  }

  trackById(_i: number, card: LecturerSessionCardVm): number {
    return card.session.Id;
  }

  private toCard(s: TrainingSessionSummary): LecturerSessionCardVm {
    const dateLabel = formatTrainingDate(parseTrainingDate(s.SessionDate)) || s.SessionDate || '—';
    const windowOpen = !!s.AttendanceWindowOpen;
    return {
      session: s,
      dateLabel,
      timeLabel: `${s.StartTime || ''} – ${s.EndTime || ''}`.trim(),
      windowLabel: windowOpen ? 'חלון נוכחות פתוח' : 'חלון נוכחות סגור',
    };
  }
}
