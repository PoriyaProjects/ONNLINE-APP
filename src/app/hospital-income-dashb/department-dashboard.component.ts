import { Component, Input, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service';



@Component({
    selector: 'app-department-dashboard', 
    templateUrl: './department-dashboard.component.html'
  })
export class DepartmentDashboardComponent implements OnInit {
  @Input() deptId!: string;

  constructor(private chartsService: GoogleChartsService) {}

  ngOnInit(): void {
    console.log('✅ DepartmentDashboardComponent loaded with deptId:', this.deptId);
    if (this.deptId) {
      this.loadDepartmentCharts();
    } else {
      console.warn('⚠️ deptId is missing for DepartmentDashboardComponent.');
    }
  }

  private loadDepartmentCharts(): void {
    const barChartId = `dept-bar-${this.deptId}`;
    const lineChartId = `dept-line-${this.deptId}`;

    this.chartsService.drawDepartmentBarChart(this.deptId, barChartId)
      .catch(err => console.error('Bar chart error:', err));

    this.chartsService.drawDepartmentLineChart(this.deptId, lineChartId)
      .catch(err => console.error('Line chart error:', err));
  }
}

