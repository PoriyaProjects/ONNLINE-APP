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
import { of } from 'rxjs';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { TrainingEmployeeAutocompleteComponent } from '../employee-autocomplete/employee-autocomplete.component';
import { TrainingErrorStateComponent } from '../../shared/training-error-state/training-error-state.component';
import { TrainingPageHeaderComponent } from '../../shared/training-page-header/training-page-header.component';
import { TrainingSkeletonComponent } from '../../shared/training-skeleton/training-skeleton.component';
import { TrainingStatusBadgeComponent } from '../../shared/training-status-badge/training-status-badge.component';
import { TrainingSessionFormComponent } from './training-session-form.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

describe('TrainingSessionFormComponent', () => {
  let fixture: ComponentFixture<TrainingSessionFormComponent>;
  let component: TrainingSessionFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatAutocompleteModule,
      ],
      declarations: [
        TrainingSessionFormComponent,
        TrainingEmployeeAutocompleteComponent,
        TrainingPageHeaderComponent,
        TrainingSkeletonComponent,
        TrainingStatusBadgeComponent,
        TrainingErrorStateComponent,
      ],
      providers: [
        {
          provide: TrainingManagementApiService,
          useValue: {
            getCourses: () => of({ Success: true, Data: [] }),
            getSessionDetails: () => of({ Success: false }),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ConfirmationDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    });
    fixture = TestBed.createComponent(TrainingSessionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('invalidates when end time is before start', () => {
    component.form.patchValue({
      CourseId: 1,
      SessionDate: '2026-09-01',
      StartTime: '12:00',
      EndTime: '11:00',
      Location: 'אולם',
      LecturerEmployeeID: '100',
      Capacity: 10,
      RegistrationCloseAt: '2026-08-30T10:00',
      AttendanceOpenAt: '2026-09-01T11:00',
      AttendanceCloseAt: '2026-09-01T13:00',
    });
    expect(component.form.hasError('endBeforeStart')).toBe(true);
    component.form.patchValue({ EndTime: '13:00' });
    expect(component.form.hasError('endBeforeStart')).toBe(false);
  });

  it('flags capacity below active registrations', () => {
    component.registeredCount = 5;
    component.form.patchValue({ Capacity: 3 });
    expect(component.capacityTooLow()).toBe(true);
    component.form.patchValue({ Capacity: 5 });
    expect(component.capacityTooLow()).toBe(false);
  });
});
