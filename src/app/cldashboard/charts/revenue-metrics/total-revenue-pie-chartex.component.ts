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
import { ensureDates } from '../../utils/date-utils';

import { sanitizeApiJson } from '../../utils/sanitize-util';
import { formatDateForApi } from '../../utils/api-utils';

declare var google: any;

@Component({
  selector: 'app-total-revenue-pie-chartex',
  templateUrl: `./total-revenue-pie-chartex.component.html`,
  styleUrls: []
})
export class TotalRevenuePieChartEx implements OnInit, OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'הכנסות לפי מקור';
  @Input() timePeriod: string = 'last12months';
  @Input() startDate: string = '';
  @Input() endDate: string = '';

  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;
  chartData: any[] = [];
  isLoading = false;
  rawChartData: { label: string; value: number }[] = [];
  private chartsReady: boolean = false;

  timePeriodOptions = [
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisyear', label: 'This Year' },
    { value: 'lastyear', label: 'Last Year' },
    { value: 'last2years', label: 'Last 2 Years' },
    { value: 'last3years', label: 'Last 3 Years' },
    { value: 'last4years', label: 'Last 4 Years' },
    { value: 'last5years', label: 'Last 5 Years' },
    { value: 'custom', label: 'Custom Range' }
  ];

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

  ngOnInit(): void {
    this.chartId = 'chart_div_' + (this.chartTitle || 'chart').toLowerCase().replace(/\s+/g, '_');
    this.loadChart(); // Initial load
  }

  // ngAfterViewInit(): void {
  //   google.charts.load('current', { packages: ['corechart'] });
  //   google.charts.setOnLoadCallback(() => this.safeDrawChart());
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
      this.loadChart();
    }
  }

  onTimePeriodChange(): void {
    if (this.timePeriod !== 'custom') {
      this.loadChart();
    }
  }

  applyFilters(): void {
    if (this.timePeriod === 'custom') {
      if (!this.startDate || !this.endDate) {
        alert('Please select a start and end date.');
        return;
      }
    }
    this.loadChart();
  }

  loadChart(): void {
    this.isLoading = true;

    const isCustom = this.timePeriod === 'custom';
    const start = isCustom ? formatDateForApi(this.startDate) : '';
    const end = isCustom ? formatDateForApi(this.endDate) : '';
    const period = isCustom ? '' : this.timePeriod;

    this.ops.fetchTotalRevenuePieChartEx(start, end, period).subscribe(
      rawData => {
        const data = sanitizeApiJson(rawData, 'label-value') as { label: string; value: number }[];
        this.chartData = [['Source', 'Revenue'], ...data.map(d => [d.label, d.value])];
        this.isLoading = false;
        this.safeDrawChart();
      },
      error => {
        console.error('Chart load error:', error);
        this.chartData = [['Source', 'Revenue']];
        this.isLoading = false;
      }
    );
   // console.log(this.chartData); // optional: for debugging

  }

  // private safeDrawChart(attempt = 0): void {
  //   if (this.chartContainer?.nativeElement) {
  //     this.drawChart();
  //   } else if (attempt < 10) {
  //     setTimeout(() => this.safeDrawChart(attempt + 1), 100);
  //   } else {
  //    // console.warn('Chart container not initialized after retrying.');
  //   }
  // }

  private safeDrawChart(attempt = 0): void {
    if (!this.chartsReady) {
      if (attempt < 10) {
        setTimeout(() => this.safeDrawChart(attempt + 1), 100);
      } else {
       // console.warn('Google Charts not ready after retrying.');
      }
      return;
    }
  
    if (this.chartContainer?.nativeElement) {
      this.drawChart();
    } else if (attempt < 10) {
      setTimeout(() => this.safeDrawChart(attempt + 1), 100);
    } else {
     // console.warn('Chart container not initialized after retrying.');
    }
  }
  

    drawChart(): void {
    const data = google.visualization.arrayToDataTable(this.chartData);
   // console.log(`[${this.constructor.name}]:` ,'📄 Google DataTable columns:', data.getNumberOfColumns());
   // console.log(`[${this.constructor.name}]:` ,'📄 Google DataTable rows:', data.getNumberOfRows());    
    const options = {
      title: this.chartTitle || 'Total Revenue by Source',
      is3D: true,
      animation: {
        duration: 700,
        easing: 'out',
        startup: true
      },
      legend: { position: 'bottom' },
      height: 400
    };
    
   // console.log(`[${this.constructor.name}]:` ,'📊 Final chart options:', options);
// console.log(this.chartData); // optional: for debugging
    const chart = new google.visualization.PieChart(this.chartContainer.nativeElement);
    chart.draw(data, options);
  }
}
