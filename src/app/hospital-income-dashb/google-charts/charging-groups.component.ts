import { Component, OnInit } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';

@Component({
  selector: 'app-charging-groups',
  templateUrl: './charging-groups.component.html',
  styleUrls: ['./charging-groups.component.css']
})
export class ChargingGroupsComponent implements OnInit {
  departmentButtons: { department: string; color: string }[] = [];

  constructor(private chartService: GoogleChartsService) {}

  ngOnInit(): void {
    console.log('[ChargingGroupsComponent] Loading department buttons...');
    this.chartService.renderDepartmentButtons('deptgroups');
  }

  private async loadButtons(): Promise<void> {
    try {
      this.departmentButtons = await this.chartService.getChargingGroupButtons();
      console.log('[ChargingGroupsComponent] Loaded:', this.departmentButtons);
    } catch (err) {
      console.error('[ChargingGroupsComponent] Failed to load buttons:', err);
    }
  }

  onDepartmentClick(dept: string): void {
    console.log(`[ChargingGroupsComponent] Department clicked: ${dept}`);
    this.chartService.renderDepartmentChart(dept, 'deptChart');
  }
}
