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
  selector: 'app-operations-gauge-chart',
  templateUrl: './operations-gauge-chart.component.html',
  styleUrls: []
})
export class OperationsGaugeChart implements OnChanges, AfterViewInit {
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
    if (google.visualization && google.visualization.Gauge) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchGaugeData(this.deptCode).subscribe(res => {
      const value = res?.d?.[1]?.y || 0;
      const data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Ops', Number(value)]
      ]);
      const chart = new google.visualization.Gauge(this.chartContainer.nativeElement);
      chart.draw(data, {
        width: 300,
        height: 200,
        redFrom: 90,
        redTo: 100,
        yellowFrom: 75,
        yellowTo: 90,
        minorTicks: 5
      });
    });
  }
}
