import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingCourseSummary } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';
import { formatTrainingDate, parseTrainingDate } from '../../utils/training-date.util';

export interface CourseCardVm {
  course: TrainingCourseSummary;
  durationLabel: string;
  validityLabel: string;
  sessionsLabel: string;
  nearestLabel: string;
  availabilityLabel: string;
}

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

  searchText = '';
  courseType = '';
  monthFilter = '';
  locationFilter = '';
  availableOnly = false;

  courseTypes: string[] = [];
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
            this.errorMessage = trainingErrorMessage(result, 'לא ניתן לטעון קורסים.');
            return;
          }
          this.courses = result.Data || [];
          this.rebuildFilterOptions();
          this.applyFilters();
        },
        () => {
          this.loading = false;
          this.courses = [];
          this.viewModels = [];
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  clearFilters(): void {
    this.searchText = '';
    this.courseType = '';
    this.monthFilter = '';
    this.locationFilter = '';
    this.availableOnly = false;
    this.applyFilters();
  }

  onFiltersChanged(): void {
    this.applyFilters();
  }

  openCourse(courseId: number): void {
    this.router.navigate(['/training-management/courses', courseId]);
  }

  trackByCourseId(_index: number, vm: CourseCardVm): number {
    return vm.course.Id;
  }

  private rebuildFilterOptions(): void {
    const types = new Set<string>();
    const locs = new Set<string>();
    const months = new Map<string, string>();

    this.courses.forEach((c) => {
      if (c.CourseType) {
        types.add(c.CourseType);
      }
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

    this.courseTypes = Array.from(types).sort();
    this.locations = Array.from(locs).sort();
    this.monthOptions = Array.from(months.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => (a.value < b.value ? -1 : 1));
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    const filtered = this.courses.filter((c) => {
      if (q) {
        const hay = `${c.Name} ${c.Code} ${c.Description || ''} ${c.CourseType || ''}`.toLowerCase();
        if (hay.indexOf(q) < 0) {
          return false;
        }
      }
      if (this.courseType && c.CourseType !== this.courseType) {
        return false;
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
      course.DurationMinutes != null ? `${course.DurationMinutes} דקות` : 'לא צוין';
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
