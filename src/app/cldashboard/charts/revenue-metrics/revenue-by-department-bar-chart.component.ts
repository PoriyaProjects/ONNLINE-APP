import {
  Component,
  Input,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';

declare var google: any;


@Component({
  selector: 'app-revenue-by-department-bar-chart',
  templateUrl: './revenue-by-department-bar-chart.component.html',
  styleUrls: []
})


export class RevenueByDepartmentBarChart implements OnInit, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = '';

  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;

  ngOnInit(): void {
    google.charts.load('current', { packages: ['corechart'] });
  }

  ngAfterViewInit(): void {
    this.chartId = 'chart_div_' + (this.chartTitle || 'chart').toLowerCase().replace(/\s+/g, '_');
    google.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  drawChart(): void {
    const data = google.visualization.arrayToDataTable([
      ['Department', 'Revenue'],
      ['Cardiology', 420000],
      ['Neurology', 360000],
      ['Pediatrics', 280000]
    ]);

    const options = {
      title: this.chartTitle || 'Revenue by Department',
      width: 450,
      height: 300,
      legend: { position: 'bottom' },
      hAxis: { title: 'Department' },
      vAxis: { title: 'Revenue ($)' }
    };

    const chart = new google.visualization.ColumnChart(this.chartContainer.nativeElement);
    chart.draw(data, options);
  }
}
