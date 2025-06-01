import {
  Component,
  Input,
  OnInit,
  OnChanges,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { defaultChartOptions, extractChartData } from '../../utils/chart-config';
import { ChartLoaderService} from '../../utils/google-charts-loader';

import { sanitizeApiJson } from '../../utils/sanitize-util';
import { formatDateForApi } from '../../utils/api-utils';

declare var google: any;

@Component({
  selector: 'app-total-revenue-pie-chart',
  templateUrl: `./total-revenue-pie-chart.component.html`,
  styleUrls: []
})

export class TotalRevenuePieChart implements OnInit, OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'הכנסות';  
  @Input() timePeriod: string = 'last12months';

  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;
  chartData: any[] = [];
  isLoading = false;
  rawChartData: { label: string; value: number }[] = [];

  private chartsReady: boolean = false;

  onTimePeriodChange(): void {
    this.loadRevenueOverTime();
  }

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

  ngOnInit(): void {  
    this.chartId = 'chart_div_' + (this.chartTitle || 'chart').toLowerCase().replace(/\s+/g, '_');
    this.loadRevenueOverTime();
  }
  

  // ngAfterViewInit(): void {
  //   google.charts.load('current', { packages: ['corechart'] });
  
  //   google.charts.setOnLoadCallback(() => {
  //     this.safeDrawChart(); // <- ensures container is ready
  //   });
  // }

  ngAfterViewInit(): void {
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      this.chartsReady = true;
      this.safeDrawChart();
    });
  }

  ngOnChanges(): void {
    if (google.visualization && google.visualization.PieChart) {
      this.loadRevenueOverTime();
    }
  }

loadRevenueOverTime(): void {
  this.isLoading = true;

  this.ops.fetchTotalRevenuePieChart()
    .subscribe(
      rawData => {
        const data = sanitizeApiJson(rawData, 'label-value') as { label: string, value: number }[];

        this.chartData = [['Date', 'Revenue'], ...data.map(d => [d.label, d.value])];
        this.isLoading = false;

        // trigger draw only when DOM is ready
        this.safeDrawChart();
      },
      error => {
        console.error('Chart load error:', error);
        this.chartData = [['Date', 'Revenue']];
        this.isLoading = false;
      }
    );
    console.table(this.chartData); // optional: for debugging
}

  
// private safeDrawChart(attempt = 0): void {
//   if (this.chartContainer?.nativeElement) {
//     this.drawChart();
//   } else if (attempt < 10) {
//     setTimeout(() => this.safeDrawChart(attempt + 1), 100); // retry up to 10 times
//   } else {
//     console.warn('Chart container not initialized after retrying.');
//   }
// }

private safeDrawChart(attempt = 0): void {
  if (!this.chartsReady) {
    if (attempt < 10) {
      setTimeout(() => this.safeDrawChart(attempt + 1), 100);
    } else {
      console.warn('Google Charts not ready after retrying.');
    }
    return;
  }

  if (this.chartContainer?.nativeElement) {
    this.drawChart();
  } else if (attempt < 10) {
    setTimeout(() => this.safeDrawChart(attempt + 1), 100);
  } else {
    console.warn('Chart container not initialized after retrying.');
  }
}



  
    drawChart(): void {
    const data = google.visualization.arrayToDataTable(this.chartData);
    console.log(`[${this.constructor.name}]:` ,'📄 Google DataTable columns:', data.getNumberOfColumns());
    console.log(`[${this.constructor.name}]:` ,'📄 Google DataTable rows:', data.getNumberOfRows());    
    const options = {
      title: this.chartTitle || 'Total Revenue',
      curveType: 'function',
      
      height: 400,
      legend: { position: 'bottom' },
      hAxis: { title: 'Date', slantedText: true, slantedTextAngle: 45 },
      vAxis: { title: 'הכנסות (₪)', format: 'short' }
    };
    console.log(`[${this.constructor.name}]:` ,'📊 Final chart options:', options);
 console.table(this.chartData); // optional: for debugging
    const chart = new google.visualization.PieChart(this.chartContainer.nativeElement);
    chart.draw(data, options);
  }
  





timePeriodOptions = [
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'lastyear', label: 'Last Year' },
  { value: 'lastquarter', label: 'Last Quarter' },
  { value: 'last12months', label: 'Last 12 Months' }
];



}