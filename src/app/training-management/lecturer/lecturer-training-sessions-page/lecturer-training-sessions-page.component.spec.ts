import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TrainingErrorCodes, TrainingSessionStatus } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { LecturerTrainingSessionsPageComponent } from './lecturer-training-sessions-page.component';

describe('LecturerTrainingSessionsPageComponent', () => {
  let fixture: ComponentFixture<LecturerTrainingSessionsPageComponent>;
  let component: LecturerTrainingSessionsPageComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormsModule,
        NoopAnimationsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [
        LecturerTrainingSessionsPageComponent,
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
    fixture = TestBed.createComponent(LecturerTrainingSessionsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows error when store unavailable', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetLecturerSessions') >= 0);
    req.flush({
      d: { Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable, Message: 'blocked' },
    });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.cards.length).toBe(0);
  }));

  it('shows empty state when no assigned sessions', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetLecturerSessions') >= 0);
    req.flush({ d: { Success: true, Data: [] } });
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeNull();
    expect(component.cards.length).toBe(0);
  }));

  it('filters by search text', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetLecturerSessions') >= 0);
    req.flush({
      d: {
        Success: true,
        Data: [
          {
            Id: 1,
            CourseId: 1,
            CourseName: 'BLS',
            CourseCode: 'BLS',
            SessionDate: '2099-01-01',
            StartTime: '10:00',
            EndTime: '12:00',
            Location: 'אולם א',
            LecturerEmployeeID: '1',
            Capacity: 20,
            RegisteredCount: 5,
            AvailablePlaces: 15,
            RegistrationCloseAt: '2098-12-31',
            Status: TrainingSessionStatus.Open,
            AttendanceWindowOpen: false,
            ConfirmedAttendanceCount: 0,
          },
          {
            Id: 2,
            CourseId: 2,
            CourseName: 'ACLS',
            CourseCode: 'ACLS',
            SessionDate: '2099-02-01',
            StartTime: '10:00',
            EndTime: '12:00',
            Location: 'אולם ב',
            LecturerEmployeeID: '1',
            Capacity: 10,
            RegisteredCount: 2,
            AvailablePlaces: 8,
            RegistrationCloseAt: '2099-01-31',
            Status: TrainingSessionStatus.Open,
            AttendanceWindowOpen: false,
            ConfirmedAttendanceCount: 0,
          },
        ],
      },
    });
    tick();
    component.searchText = 'bls';
    component.applyFilters();
    expect(component.cards.length).toBe(1);
    expect(component.cards[0].session.CourseCode).toBe('BLS');
  }));
});
