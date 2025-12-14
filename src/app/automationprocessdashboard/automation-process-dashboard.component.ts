import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from "src/environments/environment";

export interface DashboardMetricsDto {
  WaitingInternal: number;
  WaitingTreatment: number;
  InTreatment: number;
  Closed: number;
  CreatedToday: number;
  HasCommitment: number;
  StuckItems: number;
  AverageProcessingTime: number;
  SuccessRate: number;
}

export interface ProcessingTrendDto {
  ProcessDate: Date;
  ItemCount: number;
  AvgProcessingTime: number;
  CompletedCount: number;
}

export interface NlpMetricsDto {
  TotalRequestsLast30: number;
  CompletedRequestsLast30: number;
  ProcessedRequestsLast30: number;
  AvgProcessingTimeLast30: number;
  SuccessRateLast30: number;
  TodayRequests: number;
  TodayCompleted: number;
  TodaySuccessRate: number;
}

export interface StatusDistributionDto {
  Status: number;
  StatusName: string;
  Count: number;
  Percentage: number;
}

export interface ItemStateDto {
  StateName: string;
  DisplayName: string;
  Count: number;
  Percentage: number;
}

export interface DepartmentDto {
  id: number;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-automation-process-dashboard',
  templateUrl: './automation-process-dashboard.component.html',
  styleUrls: ['./automation-process-dashboard.component.css']
})
export class AutomationProcessDashboardComponent implements OnInit {

  departments: DepartmentDto[] = [
    { id: 1, name: 'CT', icon: '🩺' },
    { id: 2, name: 'MRI', icon: '🧲' },
    { id: 3, name: 'GASTRO', icon: '🔍' },
    { id: 0, name: 'NLP', icon: '🤖' }
  ];

  nlpMetrics: NlpMetricsDto | null = null;
  selectedDepartment: DepartmentDto | null = null;
  metrics: DashboardMetricsDto | null = null;
  processingTrend: ProcessingTrendDto[] = [];
  statusDistribution: StatusDistributionDto[] = [];
  itemStates: ItemStateDto[] = [];

  isLoading = false;
  isDataLoaded = false;

  chartData: any[] = [];
  chartColumns: any[] = [
    { type: 'string', label: 'Date' },
    { type: 'number', label: 'Items' },
    { type: 'number', label: 'Completed' }
  ];

  chartOptions: any = {
    title: 'Processing Trend - Last 30 Days',
    hAxis: { title: 'Date' },
    vAxis: { title: 'Count' },
    legend: { position: 'bottom' },
    colors: ['#667eea', '#4caf50']
  };

  stateChartData: any[] = [];
  stateChartColumns: any[] = [
    { type: 'string', label: 'State' },
    { type: 'number', label: 'Count' }
  ];

  stateChartOptions: any = {
    title: 'Item States Distribution',
    pieHole: 0.4,
    colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#ff6b6b', '#ffd93d', '#6bcf7f', '#ff9800']
  };

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  }

  selectDepartment(dept: DepartmentDto): void {
    this.selectedDepartment = dept;
    if (dept.id === 0) {
      this.loadNlpDashboard();
    } else {
      this.loadDepartmentMetrics(dept.id);
    }
  }

  loadNlpDashboard(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.loadNlpMetrics();
    
    this.isLoading = false;
    this.isDataLoaded = true;
  }

  loadNlpMetrics(): void {
    this.http.post(environment.url + "GetAutomationNlpMetrics", {})
      .subscribe(
        (response: any) => {
          this.nlpMetrics = response.d || response;
          this.snackBar.open('✓ NLP loaded', 'Close', { duration: 2000 });
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error:', error);
          this.snackBar.open('✗ Error loading NLP', 'Close', { duration: 3000 });
        }
      );
  }

  loadDepartmentMetrics(unitProcessID: number): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.http.post(environment.url + "GetAutomationDashboard", { unitProcessID: unitProcessID })
      .subscribe(
        (response: any) => {
          this.metrics = response.d || response;
          this.isDataLoaded = true;
          this.cdr.detectChanges();
          this.snackBar.open('✓ Department loaded', 'Close', { duration: 2000 });
          this.isLoading = false;
        },
        (error) => {
          console.error('Error:', error);
          this.isLoading = false;
          this.snackBar.open('✗ Error loading department', 'Close', { duration: 3000 });
        }
      );

    this.loadProcessingTrend(unitProcessID);
    this.loadStatusDistribution(unitProcessID);
    this.loadItemStates(unitProcessID);
  }

  loadProcessingTrend(unitProcessID: number): void {
    this.http.post(environment.url + "GetAutomationProcessingTrend", { unitProcessID: unitProcessID })
      .subscribe(
        (response: any) => {
          this.processingTrend = response.d || response;
          this.updateTrendChart();
          this.cdr.detectChanges();
        },
        (error) => console.error('Error:', error)
      );
  }

  loadStatusDistribution(unitProcessID: number): void {
    this.http.post(environment.url + "GetAutomationStatusDistribution", { unitProcessID: unitProcessID })
      .subscribe(
        (response: any) => {
          this.statusDistribution = response.d || response;
          this.cdr.detectChanges();
        },
        (error) => console.error('Error:', error)
      );
  }

  loadItemStates(unitProcessID: number): void {
    this.http.post(environment.url + "GetAutomationItemStates", { unitProcessID: unitProcessID })
      .subscribe(
        (response: any) => {
          this.itemStates = response.d || response;
          this.updateStateChart();
          this.cdr.detectChanges();
        },
        (error) => console.error('Error:', error)
      );
  }

  updateTrendChart(): void {
    this.chartData = this.processingTrend.map(t => [
      new Date(t.ProcessDate).toLocaleDateString('en-US'),
      t.ItemCount,
      t.CompletedCount
    ]);
  }

  updateStateChart(): void {
    this.stateChartData = this.itemStates.map(s => [
      s.DisplayName,
      s.Count
    ]);
  }

  closeDepartment(): void {
    this.selectedDepartment = null;
    this.metrics = null;
    this.nlpMetrics = null;
    this.processingTrend = [];
    this.statusDistribution = [];
    this.itemStates = [];
    this.isDataLoaded = false;
  }

  getStatusName(status: number): string {
    const map: { [key: number]: string } = {
      1: 'Waiting Internal',
      2: 'Waiting Treatment',
      3: 'In Treatment',
      4: 'Success',
      5: 'Failed'
    };
    return map[status] || 'Unknown';
  }

  getStatusColor(status: number): string {
    const map: { [key: number]: string } = {
      1: '#ff9800',
      2: '#2196f3',
      3: '#f44336',
      4: '#4caf50',
      5: '#9c27b0'
    };
    return map[status] || '#999';
  }
}