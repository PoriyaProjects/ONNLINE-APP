import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-financial-line-chart',
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
export class FinancialLineChartComponent implements OnChanges {
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
    this.dataService.getFinancialData().subscribe({
      next: data => {
        this.chartData = data;
        this.chartOptions = {
          title: 'Financial Data (36 Months)',
          trendlines: { 0: {} },
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
