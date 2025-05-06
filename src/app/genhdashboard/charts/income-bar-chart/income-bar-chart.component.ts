import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-income-bar-chart',
  template: `
    <app-chart-container [loading]="loading" [error]="error">
      <google-chart
        *ngIf="!loading && !error"
        [type]="'ColumnChart'"
        [data]="chartData"
        [options]="chartOptions">
      </google-chart>
    </app-chart-container>
  `
})
export class IncomeBarChartComponent implements OnChanges {
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
    this.dataService.getIncomeBarData().subscribe({
      next: data => {
        this.chartData = data;
        this.chartOptions = {
          title: 'Monthly Income (Bars)',
          legend: { position: 'top' },
          isStacked: false
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
