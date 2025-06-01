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
  selector: 'app-cash-collections-rate-line-chart',
  templateUrl: './cash-collections-rate-line-chart.component.html',
  styleUrls: []
})
export class CashCollectionsRateLineChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'Cash Collections Rate';
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
    this.ops.fetchCashCollectionsRate(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Month', 'Collections %'],
        ...rows
      ]);
      const chart = new google.visualization.LineChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        curveType: 'function',
        hAxis: { title: 'Month' },
        vAxis: { minValue: 0, maxValue: 100 },
        legend: { position: 'bottom' }
      });
    });
  }
}
