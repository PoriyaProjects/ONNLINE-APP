import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-monthly-line-chart',
  template: `
    <app-chart-container [loading]="loading" [error]="error">
      <google-chart
        *ngIf="!loading && !error"
        [type]="'LineChart'"
        [data]="chartData"
        [options]="chartOptions">
      </google-chart>
    </app-chart-container>
  `
})
export class MonthlyLineChartComponent implements OnChanges {
  @Input() departmentId: string;
  chartData: any[];
  chartOptions: any;
  loading = false;
  error = false;

  constructor(private dataService: ChartDataService) {}

  ngOnChanges() {
    if (!this.departmentId) return;
    this.fetchData();
  }

  fetchData() {
    this.loading = true;
    this.error = false;
    this.dataService.getMonthlyOpsData(this.departmentId).subscribe({
      next: data => {
        this.chartData = data;
        this.chartOptions = {
          title: 'Monthly Trends',
          curveType: 'none',
          legend: { position: 'bottom' }
        };
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }
}
