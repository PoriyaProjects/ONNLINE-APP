import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { EmployeeAttendanceConfirmationPageComponent } from './employee-attendance-confirmation-page.component';

describe('EmployeeAttendanceConfirmationPageComponent', () => {
  let fixture: ComponentFixture<EmployeeAttendanceConfirmationPageComponent>;
  let component: EmployeeAttendanceConfirmationPageComponent;
  let httpMock: HttpTestingController;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ token: 'tok-1' }));
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [EmployeeAttendanceConfirmationPageComponent],
      providers: [
        TrainingManagementApiService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            snapshot: { paramMap: convertToParamMap({ token: 'tok-1' }) },
          },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    fixture = TestBed.createComponent(EmployeeAttendanceConfirmationPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows store unavailable when GetAttendanceSessionByToken fails', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetAttendanceSessionByToken') >= 0);
    expect(req.request.body.QrToken).toBe('tok-1');
    req.flush({
      d: { Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable, Message: 'blocked' },
    });
    tick();
    fixture.detectChanges();
    expect(component.state).toBe('storeUnavailable');
  }));

  it('requires identity and disables confirm when invalid', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetAttendanceSessionByToken') >= 0);
    req.flush({
      d: {
        Success: true,
        Data: {
          SessionId: 1,
          CourseId: 1,
          CourseName: 'BLS',
          SessionDate: '2026-09-01',
          StartTime: '10:00',
          EndTime: '12:00',
          Location: 'אולם',
          AttendanceWindowOpen: true,
          RequiresIdentityConfirmation: true,
          CanConfirmAttendance: true,
        },
      },
    });
    tick();
    fixture.detectChanges();
    expect(component.state).toBe('ready');
    expect(component.canSubmit).toBe(false);
    component.form.patchValue({ IdentityNumber: '123456789' });
    expect(component.canSubmit).toBe(true);
  }));

  it('prevents duplicate confirm submission', fakeAsync(() => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.indexOf('GetAttendanceSessionByToken') >= 0)
      .flush({
        d: {
          Success: true,
          Data: {
            SessionId: 1,
            CourseId: 1,
            CourseName: 'BLS',
            SessionDate: '2026-09-01',
            StartTime: '10:00',
            EndTime: '12:00',
            AttendanceWindowOpen: true,
            RequiresIdentityConfirmation: true,
            CanConfirmAttendance: true,
          },
        },
      });
    tick();
    component.form.patchValue({ IdentityNumber: '123456789' });
    component.confirm();
    expect(component.state).toBe('submitting');
    component.confirm();
    const confirms = httpMock.match((r) => r.url.indexOf('ConfirmCourseAttendance') >= 0);
    expect(confirms.length).toBe(1);
    confirms[0].flush({
      d: {
        Success: true,
        Data: {
          AttendanceId: 1,
          RegistrationId: 1,
          SessionId: 1,
          ConfirmedAt: '2026-09-01T10:05:00',
          CertificateQueued: false,
        },
      },
    });
    tick();
    expect(component.state).toBe('success');
    expect(localStorage.getItem('QrToken')).toBeNull();
    expect(sessionStorage.getItem('IdentityNumber')).toBeNull();
  }));

  it('maps already-confirmed error', fakeAsync(() => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.indexOf('GetAttendanceSessionByToken') >= 0)
      .flush({
        d: { Success: false, ErrorCode: TrainingErrorCodes.AttendanceAlreadyConfirmed, Message: 'x' },
      });
    tick();
    expect(component.state).toBe('alreadyConfirmed');
  }));
});
