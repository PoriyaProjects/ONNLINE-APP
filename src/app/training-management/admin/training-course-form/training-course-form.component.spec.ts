import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmptyStateComponent } from '../../shared/training-empty-state/training-empty-state.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { TrainingCourseFormComponent } from './training-course-form.component';

describe('TrainingCourseFormComponent', () => {
  let fixture: ComponentFixture<TrainingCourseFormComponent>;
  let component: TrainingCourseFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
      ],
      declarations: [
        TrainingCourseFormComponent,
        TrainingPageHeaderComponent,
        TrainingSkeletonComponent,
        TrainingStatusBadgeComponent,
        TrainingEmptyStateComponent,
        TrainingErrorStateComponent,
      ],
      providers: [
        { provide: TrainingManagementApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ConfirmationDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    });
    fixture = TestBed.createComponent(TrainingCourseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('auto-generates disabled code; requires name, type and duration > 0', () => {
    expect(component.form.get('Code').disabled).toBe(true);
    expect(component.form.get('Code').value).toBeTruthy();
    expect(component.form.valid).toBe(false);
    component.form.patchValue({
      Name: 'החייאה',
      CourseType: 'BLS',
      DurationHours: 0,
      IsMandatory: true,
      Status: 2,
    });
    expect(component.form.get('DurationHours').valid).toBe(false);
    component.form.patchValue({ DurationHours: 2 });
    expect(component.form.valid).toBe(true);
  });
});
