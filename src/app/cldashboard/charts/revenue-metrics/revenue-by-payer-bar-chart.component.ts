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
  selector: 'app-revenue-by-payer-bar-chart',
  templateUrl: './revenue-by-payer-bar-chart.component.html',
  styleUrls: []
})
export class RevenueByPayerBarChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() chartTitle: string = 'Revenue by Payer';
  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}
  private chartsReady: boolean = false;

ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}



  ngOnChanges() {
    if (google.visualization && google.visualization.BarChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchRevenueByPayer(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Payer', 'Revenue'],
        ...rows
      ]);
      const chart = new google.visualization.BarChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        hAxis: { title: 'Payer' },
        vAxis: { minValue: 0 },
        legend: { position: 'bottom' }
      });
    });
  }
}