import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { HospitalCurrentPatientsDashboardComponent } from './hospital-current-patients-dashboard.component';
import { HospitalCurrentPatientsService } from './services/hospital-current-patients.service';

describe('HospitalCurrentPatientsDashboardComponent', () => {
  let component: HospitalCurrentPatientsDashboardComponent;
  let fixture: ComponentFixture<HospitalCurrentPatientsDashboardComponent>;
  let mockService: jasmine.SpyObj<HospitalCurrentPatientsService>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('HospitalCurrentPatientsService', [
      'fetchCurrentPatients',
      'fetchDepartmentSummary',
      'fetchMonitoringSyncState',
      'fetchCaseMoveHistory',
      'startPolling',
      'stopPolling',
      'setLive',
      'currentPatients',
      'departmentSummary',
      'isLive',
      'lastUpdateTime',
      'highlightedRows',
      'calculateHospitalKpis'
    ]);

    await TestBed.configureTestingModule({
      declarations: [HospitalCurrentPatientsDashboardComponent],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        BrowserAnimationsModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        MatToolbarModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSidenavModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule
      ],
      providers: [
        { provide: HospitalCurrentPatientsService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HospitalCurrentPatientsDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(24)).toBe('1י\' 0ש\'');
    expect(component.formatDuration(5)).toBe('5ש\'');
    expect(component.formatDuration(48)).toBe('2י\' 0ש\'');
  });

  it('should get case type label', () => {
    expect(component.getCaseTypeLabel('1')).toBe('אשפוז');
    expect(component.getCaseTypeLabel('2')).toBe('מרפאות');
    expect(component.getCaseTypeLabel('3')).toBe('מיון');
  });

  it('should detect active filters', () => {
    expect(component.hasActiveFilters()).toBeFalsy();

    component.caseTypeFilter$.next('1');
    expect(component.hasActiveFilters()).toBeTruthy();

    component.caseTypeFilter$.next('ALL');
    expect(component.hasActiveFilters()).toBeFalsy();

    component.onlyDangerCases$.next(true);
    expect(component.hasActiveFilters()).toBeTruthy();
  });

  it('should toggle case type filter', () => {
    component.caseTypeFilter$.next('ALL');
    component.toggleCaseType('1');
    expect(component.caseTypeFilter$.value).toBe('1');

    component.toggleCaseType('1');
    expect(component.caseTypeFilter$.value).toBe('ALL');
  });

  it('should clear all filters', () => {
    component.caseTypeFilter$.next('1');
    component.onlyDangerCases$.next(true);
    component.onlyAranCases$.next(true);
    component.departmentFilter$.next('CARDIO');
    component.searchControl.setValue('test');

    component.clearFilters();

    expect(component.caseTypeFilter$.value).toBe('ALL');
    expect(component.onlyDangerCases$.value).toBeFalsy();
    expect(component.onlyAranCases$.value).toBeFalsy();
    expect(component.departmentFilter$.value).toBe('');
    expect(component.searchControl.value).toBe('');
  });

  it('should format date correctly', () => {
    const date = '2024-01-15';
    const formatted = component.formatDate(date);
    expect(formatted).toContain('15');
  });

  it('should get move category color', () => {
    expect(component.getMoveCategoryColor('1')).toBe('accent');
    expect(component.getMoveCategoryColor('2')).toBe('primary');
    expect(component.getMoveCategoryColor('3')).toBe('warn');
  });
});
