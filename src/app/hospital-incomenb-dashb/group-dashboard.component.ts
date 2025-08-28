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
        //this.chartsService.drawGroupBarChart(this.groupName, barId),
        //this.chartsService.drawGroupLineChart(this.groupName, lineId)
      ]);
    } catch (error) {
      console.warn(`❌ Failed to render charts for group "${this.groupName}"`, error);
    }
  

  }
  
  

}
