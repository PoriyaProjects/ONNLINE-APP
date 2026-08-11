import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { of } from 'rxjs';
import { TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingReportFiltersComponent } from '../shared/training-report-filters/training-report-filters.component';
import { TrainingReportsDashboardComponent } from './training-reports-dashboard.component';

describe('TrainingReportsDashboardComponent', () => {
  let fixture: ComponentFixture<TrainingReportsDashboardComponent>;
  let component: TrainingReportsDashboardComponent;
  let api: jasmine.SpyObj<TrainingManagementApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TrainingManagementApiService', [
      'getTrainingDashboardStatistics',
      'getTrainingDashboardCharts',
    ]);
    api.getTrainingDashboardStatistics.and.returnValue(
      of({ Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable })
    );
    api.getTrainingDashboardCharts.and.returnValue(
      of({ Success: false, ErrorCode: TrainingErrorCodes.DataStoreUnavailable })
    );

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
      ],
      declarations: [
        TrainingReportsDashboardComponent,
        TrainingReportFiltersComponent,
        TrainingSkeletonComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
      ],
      providers: [
        { provide: TrainingManagementApiService, useValue: api },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingReportsDashboardComponent);
    component = fixture.componentInstance;
  });

  it('shows unavailable state without fake zero KPIs', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.stats).toBeNull();
    expect(component.errorMessage).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('לוח בקרה');
  }));

  it('does not invent chart metrics client-side', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.charts.length).toBe(0);
    expect(component.chartsUnavailable).toBe(true);
  }));
});
