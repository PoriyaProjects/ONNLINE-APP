import { Component, Input, OnInit, AfterViewInit, OnChanges, ElementRef } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-google-chart',
  template: `<div [id]="chartId" style="width: 100%; height: 400px;">Loading chart...</div>`
})
export class GoogleChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() chartId!: string;
  @Input() chartType!: string;
  @Input() chartData!: any[];
  @Input() chartOptions: any = {};

  constructor(private el: ElementRef) {}

  ngOnInit() {
    google.charts.load('current', { packages: ['corechart', 'bar', 'gauge'] });
  }

  ngAfterViewInit() {
    google.charts.setOnLoadCallback(() => this.drawChart());
  }

  ngOnChanges() {
    if (google.visualization) {
      this.drawChart();
    }
  }

  drawChart() {
    if (!this.chartData || !this.chartType) return;
    const data = google.visualization.arrayToDataTable(this.chartData);
    const chartConstructor = google.visualization[this.chartType];
    const chart = new chartConstructor(this.el.nativeElement.querySelector(`#${this.chartId}`));
    chart.draw(data, this.chartOptions);
  }
}
