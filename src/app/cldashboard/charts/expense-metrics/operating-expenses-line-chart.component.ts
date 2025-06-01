import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { defaultChartOptions, extractChartData } from '../../utils/chart-config';
import { ChartLoaderService} from '../../utils/google-charts-loader';

import { MatCardModule } from '@angular/material/card';

declare var google: any;

@Component({
  selector: 'app-operating-expenses-line-chart',
  templateUrl: './operating-expenses-line-chart.component.html',
  styleUrls: []
})


export class OperatingExpensesLineChart implements OnInit, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = '';

  @ViewChild('chart') chartContainer!: ElementRef;

  chartId: string = '';

  ngOnInit(): void {
    this.chartId = 'chart_div_' + (this.chartTitle || 'chart').toLowerCase().replace(/\s+/g, '_');
  }

  ngAfterViewInit() {
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => this.drawChart());
  }

  drawChart(): void {
    const data = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Personnel', 42000],
      ['Supplies', 18000],
      ['Rent', 15000]
    ]);

    const options = {
      title: this.chartTitle || 'Operating Expenses',
      width: 450,
      height: 300,
      legend: { position: 'bottom' },
      hAxis: { title: 'Expense Category' },
      vAxis: { title: 'Amount ($)' }
    };

    const chart = new google.visualization.ColumnChart(this.chartContainer.nativeElement);
    chart.draw(data, options);
  }
}
