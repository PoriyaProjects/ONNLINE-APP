import { Component, Input, OnInit } from '@angular/core';
import { GoogleChartsService } from './services/google-charts.service';

@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html'
})
export class GroupDashboardComponent implements OnInit {
  @Input() groupName: string = '';
  departments: { id: string, name: string }[] = [];
  selectedDeptId: string | null = null;

  constructor(private chartsService: GoogleChartsService) {}

  

  async ngOnInit(): Promise<void> {
    const barId = 'group-bar-chart';
    const lineId = 'group-line-chart';
  
    try {
      // Run charts in parallel
      await Promise.all([
        this.chartsService.drawGroupBarChart(this.groupName, barId),
        this.chartsService.drawGroupLineChart(this.groupName, lineId)
      ]);
    } catch (error) {
      console.warn(`❌ Failed to render charts for group "${this.groupName}"`, error);
    }
  
    // Load departments
    this.chartsService.getDepartmentsByGroup(this.groupName).subscribe({
      next: (depts) => {
        this.departments = depts || [];
      },
      error: (err) => {
        console.error(`❌ Failed to load departments for group "${this.groupName}"`, err);
      }
    });
  }
  

  
  loadGroupCharts(): void {
    // Reuse any chart method, pass groupName only
    this.chartsService.drawIncomeChartsForGroup(this.groupName, 'group-bar-chart');
    this.chartsService.drawIncomeLineChartForGroup(this.groupName, 'group-line-chart');
  }

  loadDepartments(): void {
    this.chartsService.getDepartmentsByGroup(this.groupName).subscribe(res => {
      this.departments = res || [];
    });
  }

  showDepartment(deptId: string): void {
    this.selectedDeptId = deptId;
  }
}
