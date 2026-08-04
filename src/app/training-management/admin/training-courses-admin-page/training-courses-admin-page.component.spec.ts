import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TrainingCourseStatus, TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { TrainingCoursesAdminPageComponent } from './training-courses-admin-page.component';

describe('TrainingCoursesAdminPageComponent', () => {
  let fixture: ComponentFixture<TrainingCoursesAdminPageComponent>;
  let component: TrainingCoursesAdminPageComponent;
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
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatSnackBarModule,
      ],
      declarations: [
        TrainingCoursesAdminPageComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
        TrainingStatusBadgeComponent,
      ],
      providers: [
        TrainingManagementApiService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    fixture = TestBed.createComponent(TrainingCoursesAdminPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows error when getCourses fails', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetCourses') >= 0);
    req.flush({
      d: { Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable, Message: 'blocked' },
    });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.dataSource.data.length).toBe(0);
  }));

  it('filters courses by search text when data returns', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetCourses') >= 0);
    req.flush({
      d: {
        Success: true,
        Data: [
          {
            Id: 1,
            Code: 'BLS',
            Name: 'החייאה',
            CourseType: 'BLS',
            DurationMinutes: 240,
            IsMandatory: true,
            Status: TrainingCourseStatus.Active,
          },
          {
            Id: 2,
            Code: 'ACLS',
            Name: 'מתקדם',
            CourseType: 'ACLS',
            DurationMinutes: 480,
            IsMandatory: true,
            Status: TrainingCourseStatus.Active,
          },
        ],
      },
    });
    tick();
    fixture.detectChanges();
    component.searchText = 'bls';
    component.applyFilters();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].Code).toBe('BLS');
  }));

  it('shows empty list when success with no rows', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetCourses') >= 0);
    req.flush({ d: { Success: true, Data: [] } });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeNull();
    expect(component.dataSource.data.length).toBe(0);
  }));
});
