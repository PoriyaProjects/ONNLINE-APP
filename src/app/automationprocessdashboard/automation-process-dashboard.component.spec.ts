import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AutomationProcessDashboardComponent } from './automation-process-dashboard.component';

describe('AutomationProcessDashboardComponent', () => {
  let component: AutomationProcessDashboardComponent;
  let fixture: ComponentFixture<AutomationProcessDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AutomationProcessDashboardComponent],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AutomationProcessDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 departments including NLP', () => {
    expect(component.departments.length).toBe(4);
    expect(component.departments[0].name).toBe('CT');
    expect(component.departments[1].name).toBe('MRI');
    expect(component.departments[2].name).toBe('GASTRO');
    expect(component.departments[3].name).toBe('NLP');
  });

  it('should initialize with no selected department', () => {
    expect(component.selectedDepartment).toBeNull();
    expect(component.metrics).toBeNull();
    expect(component.nlpMetrics).toBeNull();
  });

  it('should select department and load metrics', () => {
    const dept = component.departments[0];
    spyOn(component, 'loadDepartmentMetrics');
    component.selectDepartment(dept);
    expect(component.selectedDepartment).toBe(dept);
    expect(component.loadDepartmentMetrics).toHaveBeenCalledWith(1);
  });

  it('should select NLP and load NLP dashboard', () => {
    const dept = component.departments[3];
    spyOn(component, 'loadNlpDashboard');
    component.selectDepartment(dept);
    expect(component.selectedDepartment).toBe(dept);
    expect(component.loadNlpDashboard).toHaveBeenCalled();
  });

  it('should close department', () => {
    component.selectedDepartment = component.departments[0];
    component.metrics = {
      WaitingInternal: 5,
      WaitingTreatment: 3,
      InTreatment: 2,
      Closed: 10,
      CreatedToday: 8,
      HasCommitment: 4,
      StuckItems: 1,
      AverageProcessingTime: 45,
      SuccessRate: 95.5
    };

    component.closeDepartment();
    expect(component.selectedDepartment).toBeNull();
    expect(component.metrics).toBeNull();
    expect(component.nlpMetrics).toBeNull();
    expect(component.isDataLoaded).toBe(false);
  });

  it('should return correct status name', () => {
    expect(component.getStatusName(1)).toBe('Waiting Internal');
    expect(component.getStatusName(2)).toBe('Waiting Treatment');
    expect(component.getStatusName(3)).toBe('In Treatment');
    expect(component.getStatusName(4)).toBe('Success');
    expect(component.getStatusName(5)).toBe('Failed');
    expect(component.getStatusName(999)).toBe('Unknown');
  });

  it('should return correct status color', () => {
    expect(component.getStatusColor(1)).toBe('#ff9800');
    expect(component.getStatusColor(2)).toBe('#2196f3');
    expect(component.getStatusColor(3)).toBe('#f44336');
    expect(component.getStatusColor(4)).toBe('#4caf50');
    expect(component.getStatusColor(5)).toBe('#9c27b0');
    expect(component.getStatusColor(999)).toBe('#999');
  });

  it('should update trend chart', () => {
    const mockTrend = [
      {
        ProcessDate: new Date(2024, 11, 1),
        ItemCount: 10,
        AvgProcessingTime: 30,
        CompletedCount: 8
      }
    ];

    component.processingTrend = mockTrend;
    component.updateTrendChart();
    expect(component.chartData.length).toBe(1);
  });

  it('should update state chart', () => {
    const mockState = [
      { StateName: 'New', DisplayName: 'פריט בתהליך קליטה', Count: 5, Percentage: 20 }
    ];

    component.itemStates = mockState;
    component.updateStateChart();
    expect(component.stateChartData.length).toBe(1);
  });

  it('should initialize loading state', () => {
    expect(component.isLoading).toBe(false);
    expect(component.isDataLoaded).toBe(false);
  });

  it('should have NLP metrics properties', () => {
    expect(component.nlpMetrics).toBeNull();
    const mockNlpMetrics = {
      TotalRequestsLast30: 100,
      CompletedRequestsLast30: 85,
      ProcessedRequestsLast30: 90,
      AvgProcessingTimeLast30: 45,
      SuccessRateLast30: 85.5,
      TodayRequests: 10,
      TodayCompleted: 8,
      TodaySuccessRate: 80.0
    };
    component.nlpMetrics = mockNlpMetrics;
    expect(component.nlpMetrics.TodayRequests).toBe(10);
    expect(component.nlpMetrics.SuccessRateLast30).toBe(85.5);
  });
});