import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-income-trend-chart',
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
export class IncomeTrendChartComponent implements OnChanges {
  @Input() departmentId: string;
  chartData: any[];
  chartOptions: any;
  loading = false;
  error = false;

  constructor(private dataService: ChartDataService) {}

  ngOnChanges() {
    this.fetchData();
  }

  fetchData() {
    this.loading = true;
    this.error = false;
    this.dataService.getIncomeTrendData().subscribe({
      next: data => {
        this.chartData = data;
        this.chartOptions = {
          title: 'Income Trends by Month',
          curveType: 'function',
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
