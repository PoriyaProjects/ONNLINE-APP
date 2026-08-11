import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TrainingCertificateStatus, TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { MyCertificatesPageComponent } from './my-certificates-page.component';

describe('MyCertificatesPageComponent', () => {
  let fixture: ComponentFixture<MyCertificatesPageComponent>;
  let component: MyCertificatesPageComponent;
  let api: jasmine.SpyObj<TrainingManagementApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TrainingManagementApiService', [
      'getEmployeeCertificates',
      'downloadEmployeeCertificate',
    ]);
    api.getEmployeeCertificates.and.returnValue(of({ Success: true, Data: [] }));

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatSnackBarModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [
        MyCertificatesPageComponent,
        TrainingPageHeaderComponent,
        TrainingSkeletonComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
        TrainingStatusBadgeComponent,
      ],
      providers: [{ provide: TrainingManagementApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(MyCertificatesPageComponent);
    component = fixture.componentInstance;
  });

  it('shows empty state when no certificates', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.viewModels.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('עדיין לא קיימות תעודות זמינות עבורך');
  }));

  it('maps load error without writing to storage', fakeAsync(() => {
    api.getEmployeeCertificates.and.returnValue(
      of({
        Success: false,
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
        Message: 'blocked',
      })
    );
    const beforeLocal = localStorage.length;
    const beforeSession = sessionStorage.length;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(localStorage.length).toBe(beforeLocal);
    expect(sessionStorage.length).toBe(beforeSession);
  }));

  it('renders pending and generated statuses', fakeAsync(() => {
    api.getEmployeeCertificates.and.returnValue(
      of({
        Success: true,
        Data: [
          {
            Id: 1,
            CertificateNumber: 'TRN-2026-000001',
            EmployeeID: '100',
            CourseId: 1,
            CourseName: 'BLS',
            SessionId: 2,
            SessionDate: '2026-08-01',
            IssuedAt: '2026-08-01',
            ExpiresAt: null,
            Status: TrainingCertificateStatus.Pending,
            DownloadAvailable: false,
          },
          {
            Id: 2,
            CertificateNumber: 'TRN-2026-000002',
            EmployeeID: '100',
            CourseId: 1,
            CourseName: 'BLS',
            SessionId: 3,
            SessionDate: '2026-07-01',
            IssuedAt: '2026-07-01',
            ExpiresAt: '2026-07-01',
            Status: TrainingCertificateStatus.Issued,
            DownloadAvailable: true,
          },
        ],
      })
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.viewModels.length).toBe(2);
    expect(component.viewModels[0].isPending).toBe(true);
    expect(component.viewModels[1].canDownload).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('ללא תאריך תפוגה');
  }));

  it('prevents duplicate download clicks', fakeAsync(() => {
    api.getEmployeeCertificates.and.returnValue(
      of({
        Success: true,
        Data: [
          {
            Id: 9,
            CertificateNumber: 'TRN-2026-000009',
            EmployeeID: '100',
            CourseId: 1,
            CourseName: 'BLS',
            SessionId: 2,
            SessionDate: '2026-08-01',
            IssuedAt: '2026-08-01',
            Status: TrainingCertificateStatus.Sent,
            DownloadAvailable: true,
          },
        ],
      })
    );
    api.downloadEmployeeCertificate.and.returnValue(
      of({
        Success: false,
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
      }).pipe(delay(1))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const vm = component.viewModels[0];
    component.download(vm);
    component.download(vm);
    expect(api.downloadEmployeeCertificate.calls.count()).toBe(1);
    tick(1);
  }));

  it('does not persist certificate numbers in localStorage', fakeAsync(() => {
    api.getEmployeeCertificates.and.returnValue(
      of({
        Success: true,
        Data: [
          {
            Id: 3,
            CertificateNumber: 'SECRET-NUM',
            EmployeeID: '100',
            CourseId: 1,
            CourseName: 'BLS',
            SessionId: 2,
            SessionDate: '2026-08-01',
            IssuedAt: '2026-08-01',
            Status: TrainingCertificateStatus.Sent,
            DownloadAvailable: false,
          },
        ],
      })
    );
    fixture.detectChanges();
    tick();
    let found = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = key ? localStorage.getItem(key) : '';
      if ((val || '').indexOf('SECRET-NUM') >= 0) {
        found = true;
      }
    }
    expect(found).toBe(false);
  }));
});
