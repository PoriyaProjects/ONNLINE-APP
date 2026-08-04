import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { of } from 'rxjs';
import {
  TrainingCertificateStatus,
  TrainingErrorCodes,
  TrainingNotificationStatus,
  TrainingNotificationType,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingOperationsErrorsPageComponent } from './training-operations-errors-page.component';

describe('TrainingOperationsErrorsPageComponent', () => {
  let fixture: ComponentFixture<TrainingOperationsErrorsPageComponent>;
  let component: TrainingOperationsErrorsPageComponent;
  let api: jasmine.SpyObj<TrainingManagementApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TrainingManagementApiService', [
      'getCertificateErrors',
      'getNotificationErrors',
      'retryCertificateGeneration',
      'resendCertificateEmail',
      'retryNotification',
    ]);
    api.getCertificateErrors.and.returnValue(of({ Success: true, Data: { Items: [], TotalCount: 0 } }));
    api.getNotificationErrors.and.returnValue(of({ Success: true, Data: [] }));

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatTableModule,
      ],
      declarations: [
        TrainingOperationsErrorsPageComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
      ],
      providers: [{ provide: TrainingManagementApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingOperationsErrorsPageComponent);
    component = fixture.componentInstance;
  });

  it('shows empty message when no failures', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'לא נמצאו תקלות פתוחות בתהליכי התעודות וההודעות'
    );
  }));

  it('loads certificate and notification errors', fakeAsync(() => {
    api.getCertificateErrors.and.returnValue(
      of({
        Success: true,
        Data: {
          Items: [
            {
              CertificateId: 1,
              CourseId: 1,
              CourseName: 'BLS',
              SessionId: 2,
              SessionDate: '2026-08-01',
              EmployeeID: '55',
              EmployeeFullName: 'Test',
              Status: TrainingCertificateStatus.Failed,
              AttemptCount: 2,
              SafeErrorMessage: 'יצירת התעודה נכשלה',
              Retryable: true,
            },
          ],
          TotalCount: 1,
        },
      })
    );
    api.getNotificationErrors.and.returnValue(
      of({
        Success: true,
        Data: [
          {
            Id: 10,
            NotificationType: TrainingNotificationType.CertificateEmail,
            Channel: 1,
            EmployeeID: '55',
            Status: TrainingNotificationStatus.Failed,
            AttemptCount: 1,
            InsertedAt: '2026-08-01',
            LastError: 'שליחת האימייל נכשלה',
            Retryable: true,
          },
        ],
      })
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.certificateErrors.length).toBe(1);
    expect(component.notificationErrors.length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('SMTP');
  }));

  it('prevents duplicate retry clicks', fakeAsync(() => {
    api.getCertificateErrors.and.returnValue(
      of({
        Success: true,
        Data: {
          Items: [
            {
              CertificateId: 7,
              CourseId: 1,
              CourseName: 'BLS',
              SessionId: 2,
              SessionDate: '2026-08-01',
              EmployeeID: '55',
              Status: TrainingCertificateStatus.Failed,
              AttemptCount: 1,
              Retryable: true,
            },
          ],
          TotalCount: 1,
        },
      })
    );
    api.retryCertificateGeneration.and.returnValue(
      of({ Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable })
    );
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    tick();
    const row = component.certificateErrors[0];
    component.retryCertificate(row);
    component.retryCertificate(row);
    expect(api.retryCertificateGeneration.calls.count()).toBe(1);
    tick();
  }));

  it('surfaces store-unavailable as safe error text', fakeAsync(() => {
    api.getCertificateErrors.and.returnValue(
      of({
        Success: false,
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
      })
    );
    api.getNotificationErrors.and.returnValue(
      of({
        Success: false,
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
      })
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.errorMessage.indexOf('Exception')).toBe(-1);
  }));
});
