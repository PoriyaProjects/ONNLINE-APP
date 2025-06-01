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
  selector: 'app-bad-debt-rate-area-chart',
  templateUrl: './bad-debt-rate-area-chart.component.html',
  styleUrls: []
})
export class BadDebtRateAreaChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'Bad Debt Rate';
  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}



  ngOnChanges() {
    if (google.visualization && google.visualization.AreaChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchBadDebtRate(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Month', 'Bad Debt %'],
        ...rows
      ]);
      const chart = new google.visualization.AreaChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        hAxis: { title: 'Month' },
        vAxis: { minValue: 0, maxValue: 100 },
        legend: { position: 'bottom' },
        areaOpacity: 0.25
      });
    });
  }
}
