import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { of } from 'rxjs';
import { TrainingErrorCodes } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingReportFiltersComponent } from '../shared/training-report-filters/training-report-filters.component';
import { TrainingComplianceReportPageComponent } from './training-compliance-report-page.component';

describe('TrainingComplianceReportPageComponent', () => {
  let fixture: ComponentFixture<TrainingComplianceReportPageComponent>;
  let component: TrainingComplianceReportPageComponent;
  let api: jasmine.SpyObj<TrainingManagementApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TrainingManagementApiService', ['getTrainingReports']);
    api.getTrainingReports.and.returnValue(
      of({
        Success: false,
        ErrorCode: TrainingErrorCodes.ReportComplianceRulesMissing,
        Message: 'rules',
      })
    );

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatTableModule,
      ],
      declarations: [
        TrainingComplianceReportPageComponent,
        TrainingReportFiltersComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
      ],
      providers: [{ provide: TrainingManagementApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingComplianceReportPageComponent);
    component = fixture.componentInstance;
  });

  it('surfaces compliance rules missing without marking all non-compliant', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.complianceRulesMissing).toBe(true);
    expect(component.rows.length).toBe(0);
    expect(component.errorMessage).toContain('כללי התאמה');
  }));
});
