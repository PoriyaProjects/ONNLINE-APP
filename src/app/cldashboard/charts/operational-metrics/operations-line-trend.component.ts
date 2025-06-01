import {
  Component,
  Input,
  OnChanges,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { defaultChartOptions, extractChartData } from '../../utils/chart-config';
import { ChartLoaderService} from '../../utils/google-charts-loader';


declare var google: any;

@Component({
  selector: 'app-operations-line-trend',
  templateUrl: './operations-line-trend.component.html',
  styleUrls: []
})

export class OperationsLineTrend implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = '';

  @ViewChild('chart') chartContainer!: ElementRef;
chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

 ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}

  ngOnChanges() {
    if (google.visualization && google.visualization.LineChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchLineTrend(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([['Month', 'Ops'], ...rows]);
      const chart = new google.visualization.LineChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle || 'Operations Trend',
        curveType: 'function',
        legend: { position: 'bottom' },
        hAxis: { title: 'Month' },
        vAxis: { minValue: 0 }
      });
    });
  }
}
