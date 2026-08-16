import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { TrainingCoursesPageComponent } from './training-courses-page.component';

describe('TrainingCoursesPageComponent', () => {
  let fixture: ComponentFixture<TrainingCoursesPageComponent>;
  let component: TrainingCoursesPageComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [
        TrainingCoursesPageComponent,
        TrainingPageHeaderComponent,
        TrainingSkeletonComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
        TrainingStatusBadgeComponent,
      ],
      providers: [
        TrainingManagementApiService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    fixture = TestBed.createComponent(TrainingCoursesPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows error state when store unavailable', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetAvailableCourses') >= 0);
    req.flush({
      d: {
        Success: false,
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
        Message: 'blocked',
      },
    });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.viewModels.length).toBe(0);
  }));

  it('filters courses by search text', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetAvailableCourses') >= 0);
    req.flush({
      d: {
        Success: true,
        Data: [
          {
            Id: 1,
            Code: 'BLS',
            Name: 'החייאה בסיסית',
            IsMandatory: true,
            Status: 1,
            CourseType: 'קליני',
          },
          {
            Id: 2,
            Code: 'ACLS',
            Name: 'החייאה מתקדמת',
            IsMandatory: true,
            Status: 1,
            CourseType: 'קליני',
          },
        ],
      },
    });
    tick();
    component.searchText = 'בסיסית';
    component.applyFilters();
    expect(component.viewModels.length).toBe(1);
    expect(component.viewModels[0].course.Code).toBe('BLS');
  }));

  it('shows empty state when success with no courses', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetAvailableCourses') >= 0);
    req.flush({ d: { Success: true, Data: [] } });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeNull();
    expect(component.viewModels.length).toBe(0);
  }));
});
