import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.css']
})
export class DashboardOverviewComponent {
  selectedDept = 'A';
  selectedPeriod = 'Q1';
  departments = ['A', 'B', 'C'];
  periods = ['Q1', 'Q2', 'Q3'];
}