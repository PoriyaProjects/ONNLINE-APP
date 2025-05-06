import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-gauge-chart',
  template: `
    <app-chart-container [loading]="loading" [error]="error">
      <google-chart
        *ngIf="!loading && !error"
        [type]="'Gauge'"
        [data]="chartData"
        [options]="chartOptions">
      </google-chart>
    </app-chart-container>
  `
})
export class GaugeChartComponent implements OnChanges {
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
    this.dataService.getGaugeData(this.departmentId).subscribe({
      next: data => {
        // Example response mapping
        const { current, target } = data;
        this.chartData = [['Label', 'Value'], ['Operations', current]];
        this.chartOptions = {
          max: target,
          greenFrom: 0,
          greenTo: target,
          width: 400,
          height: 120,
          minorTicks: 5
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
