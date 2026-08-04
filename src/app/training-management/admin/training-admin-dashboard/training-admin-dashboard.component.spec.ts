import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingAdminDashboardComponent } from './training-admin-dashboard.component';

describe('TrainingAdminDashboardComponent', () => {
  let fixture: ComponentFixture<TrainingAdminDashboardComponent>;
  let component: TrainingAdminDashboardComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [
        TrainingAdminDashboardComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
      ],
      providers: [
        TrainingManagementApiService,
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
      ],
    });
    fixture = TestBed.createComponent(TrainingAdminDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows unavailable/error state when dashboard stats fail', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.indexOf('GetTrainingDashboardStatistics') >= 0);
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
    expect(component.stats).toBeNull();
  }));
});
