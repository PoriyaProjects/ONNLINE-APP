import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { TrainingErrorCodes, TrainingRegistrationStatus } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { MyTrainingsPageComponent } from './my-trainings-page.component';

describe('MyTrainingsPageComponent', () => {
  let fixture: ComponentFixture<MyTrainingsPageComponent>;
  let component: MyTrainingsPageComponent;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormsModule,
        NoopAnimationsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
      ],
      declarations: [
        MyTrainingsPageComponent,
        TrainingPageHeaderComponent,
        TrainingSkeletonComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
        TrainingStatusBadgeComponent,
      ],
      providers: [
        TrainingManagementApiService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({
              afterClosed: () => of({ confirmed: true, reason: 'בדיקה' }),
            }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(MyTrainingsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads registrations into upcoming tab', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetEmployeeRegistrations') >= 0);
    req.flush({
      d: {
        Success: true,
        Data: [
          {
            Id: 10,
            SessionId: 1,
            CourseId: 2,
            CourseName: 'BLS',
            EmployeeID: '1',
            RegisteredAt: '2026-08-01T10:00:00',
            SessionDate: '2099-09-01',
            StartTime: '09:00:00',
            EndTime: '12:00:00',
            Status: TrainingRegistrationStatus.Registered,
          },
        ],
      },
    });
    tick();
    expect(component.viewModels.length).toBe(1);
    expect(component.viewModels[0].canCancel).toBe(true);
  }));

  it('handles cancellation business error', fakeAsync(() => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.indexOf('GetEmployeeRegistrations') >= 0)
      .flush({
        d: {
          Success: true,
          Data: [
            {
              Id: 10,
              SessionId: 1,
              CourseName: 'BLS',
              EmployeeID: '1',
              RegisteredAt: '2026-08-01T10:00:00',
              SessionDate: '2099-09-01',
              StartTime: '09:00:00',
              EndTime: '12:00:00',
              Status: TrainingRegistrationStatus.Registered,
            },
          ],
        },
      });
    tick();
    const vm = component.viewModels[0];
    component.openCancel(vm);
    tick();
    const cancelReq = httpMock.expectOne((r) => r.url.indexOf('CancelEmployeeRegistration') >= 0);
    cancelReq.flush({
      d: {
        Success: false,
        ErrorCode: TrainingErrorCodes.CancellationNotAllowed,
        Message: 'no',
      },
    });
    tick();
    expect(snackBar.open).toHaveBeenCalled();
  }));
});
