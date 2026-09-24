import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseSummary } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';
import { formatDurationHoursLabel } from '../../utils/training-duration.util';

export interface CourseCardVm {
  course: TrainingCourseSummary;
  durationLabel: string;
  validityLabel: string;
  sessionsLabel: string;
  nearestLabel: string;
  availabilityLabel: string;
}

export interface CourseTypeCardVm {
  typeKey: string;
  label: string;
  courseCount: number;
  availableCount: number;
}

const UNTYPED_KEY = '__none__';
const UNTYPED_LABEL = 'ללא סוג';

@Component({
  selector: 'app-training-courses-page',
  templateUrl: './training-courses-page.component.html',
  styleUrls: ['./training-courses-page.component.scss'],
})
export class TrainingCoursesPageComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  courses: TrainingCourseSummary[] = [];
  viewModels: CourseCardVm[] = [];
  typeCards: CourseTypeCardVm[] = [];

  /** types = group cards; courses = list under selected type */
  viewMode: 'types' | 'courses' = 'types';
  selectedTypeKey: string | null = null;

  searchText = '';
  monthFilter = '';
  locationFilter = '';
  availableOnly = false;

  locations: string[] = [];
  monthOptions: { value: string; label: string }[] = [];

  private destroy$ = new Subject<void>();

  constructor(private api: TrainingManagementApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get headerTitle(): string {
    if (this.viewMode === 'courses' && this.selectedTypeKey != null) {
      return this.typeLabel(this.selectedTypeKey);
    }
    return 'קורסים זמינים';
  }

  get headerSubtitle(): string {
    if (this.viewMode === 'courses') {
      return 'בחרו קורס ובדקו מועדים לרישום עובדים.';
    }
    return 'בחרו סוג הדרכה לצפייה בקורסים הזמינים.';
  }

  get headerCounter(): string | null {
    if (this.loading || this.errorMessage) {
      return null;
    }
    if (this.viewMode === 'types') {
      return `${this.typeCards.length} סוגים`;
    }
    return `${this.viewModels.length} קורסים`;
  }

  loadCourses(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getAvailableCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success) {
            this.courses = [];
            this.viewModels = [];
            this.typeCards = [];
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון קורסים.');
            return;
          }
          this.courses = result.Data || [];
          this.rebuildFilterOptions();
          this.refreshViews();
        },
        () => {
          this.loading = false;
          this.courses = [];
          this.viewModels = [];
          this.typeCards = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  clearFilters(): void {
    this.searchText = '';
    this.monthFilter = '';
    this.locationFilter = '';
    this.availableOnly = false;
    this.refreshViews();
  }

  onFiltersChanged(): void {
    this.refreshViews();
  }

  selectType(card: CourseTypeCardVm): void {
    this.selectedTypeKey = card.typeKey;
    this.viewMode = 'courses';
    this.refreshViews();
  }

  backToTypes(): void {
    this.viewMode = 'types';
    this.selectedTypeKey = null;
    this.refreshViews();
  }

  openCourse(courseId: number): void {
    this.router.navigate(['/training-management/courses', courseId]);
  }

  trackByCourseId(_index: number, vm: CourseCardVm): number {
    return vm.course.Id;
  }

  trackByTypeKey(_index: number, card: CourseTypeCardVm): string {
    return card.typeKey;
  }

  private typeKeyOf(c: TrainingCourseSummary): string {
    return c.CourseType && c.CourseType.trim() ? c.CourseType.trim() : UNTYPED_KEY;
  }

  private typeLabel(key: string): string {
    return key === UNTYPED_KEY ? UNTYPED_LABEL : key;
  }

  private rebuildFilterOptions(): void {
    const locs = new Set<string>();
    const months = new Map<string, string>();

    this.courses.forEach((c) => {
      if (c.NearestSessionLocation) {
        locs.add(c.NearestSessionLocation);
      }
      const d = parseTrainingDate(c.NearestSessionDate);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
        months.set(key, label);
      }
    });

    this.locations = Array.from(locs).sort();
    this.monthOptions = Array.from(months.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => (a.value < b.value ? -1 : 1));
  }

  private refreshViews(): void {
    if (this.viewMode === 'types') {
      this.buildTypeCards();
      this.viewModels = [];
    } else {
      this.applyCourseFilters();
    }
  }

  private buildTypeCards(): void {
    const map = new Map<string, { count: number; available: number }>();
    this.courses.forEach((c) => {
      const key = this.typeKeyOf(c);
      const cur = map.get(key) || { count: 0, available: 0 };
      cur.count += 1;
      if (c.HasAvailablePlaces === true) {
        cur.available += 1;
      }
      map.set(key, cur);
    });

    this.typeCards = Array.from(map.entries())
      .map(([typeKey, v]) => ({
        typeKey,
        label: this.typeLabel(typeKey),
        courseCount: v.count,
        availableCount: v.available,
      }))
      .sort((a, b) => {
        if (a.typeKey === UNTYPED_KEY) {
          return 1;
        }
        if (b.typeKey === UNTYPED_KEY) {
          return -1;
        }
        return a.label.localeCompare(b.label, 'he');
      });
  }

  private applyCourseFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    const selected = this.selectedTypeKey;
    const filtered = this.courses.filter((c) => {
      if (selected != null && this.typeKeyOf(c) !== selected) {
        return false;
      }
      if (q) {
        const hay = `${c.Name} ${c.Code} ${c.Description || ''} ${c.CourseType || ''}`.toLowerCase();
        if (hay.indexOf(q) < 0) {
          return false;
        }
      }
      if (this.locationFilter && c.NearestSessionLocation !== this.locationFilter) {
        return false;
      }
      if (this.availableOnly && c.HasAvailablePlaces === false) {
        return false;
      }
      if (this.availableOnly && c.HasAvailablePlaces == null && (c.UpcomingSessionsCount || 0) <= 0) {
        return false;
      }
      if (this.monthFilter) {
        const d = parseTrainingDate(c.NearestSessionDate);
        if (!d) {
          return false;
        }
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== this.monthFilter) {
          return false;
        }
      }
      return true;
    });

    this.viewModels = filtered.map((c) => this.toVm(c));
  }

  private toVm(course: TrainingCourseSummary): CourseCardVm {
    const durationLabel =
      course.DurationMinutes != null ? formatDurationHoursLabel(course.DurationMinutes) || 'לא צוין' : 'לא צוין';
    const validityLabel =
      course.ValidityMonths != null ? `${course.ValidityMonths} חודשים` : 'ללא תפוגה';
    const sessionsLabel =
      course.UpcomingSessionsCount != null
        ? `${course.UpcomingSessionsCount} מועדים קרובים`
        : 'מועדים יוצגו בפרטי הקורס';
    const nearest =
      formatTrainingDate(parseTrainingDate(course.NearestSessionDate)) ||
      course.NearestSessionDate ||
      '';
    const nearestLabel = nearest
      ? `מועד קרוב: ${nearest}${course.NearestSessionLocation ? ' · ' + course.NearestSessionLocation : ''}`
      : '';
    let availabilityLabel = 'לבדיקת זמינות';
    if (course.HasAvailablePlaces === true) {
      availabilityLabel = 'יש מקומות פנויים';
    } else if (course.HasAvailablePlaces === false) {
      availabilityLabel = 'אין מקומות פנויים כרגע';
    }

    return {
      course,
      durationLabel,
      validityLabel,
      sessionsLabel,
      nearestLabel,
      availabilityLabel,
    };
  }
}
