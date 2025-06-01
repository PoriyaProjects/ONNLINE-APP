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
  selector: 'app-billing-errors-bar-chart',
  templateUrl: './billing-errors-bar-chart.component.html',
  styleUrls: ['./billing-errors-bar-chart.component.css']
})
export class BillingErrorsBarChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'Billing Errors';
  @ViewChild('chart') chartContainer!: ElementRef;
chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

 ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}

  ngOnChanges() {
    if (google.visualization && google.visualization.ColumnChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchBillingErrors(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Label', 'Billing Errors'],
        ...rows
      ]);
      const chart = new google.visualization.ColumnChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        hAxis: { title: 'Label' },
        vAxis: { minValue: 0 },
        legend: { position: 'bottom' }
      });
    });
  }
}
