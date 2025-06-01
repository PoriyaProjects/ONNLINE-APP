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
  selector: 'app-revenue-vs-budget-combo-chart',
  templateUrl: './revenue-vs-budget-combo-chart.component.html',
  styleUrls: []
})
export class RevenueVsBudgetComboChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() chartTitle: string = 'Revenue vs Budget';
  @ViewChild('chart') chartContainer!: ElementRef;
  chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}



  ngOnChanges() {
    if (google.visualization && google.visualization.ComboChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchRevenueVsBudget(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]
        ?.filter(r => r != null)
        .map(r => [r.x, Number(r.y1), Number(r.y2)]) || [];

      const data = google.visualization.arrayToDataTable([
        ['Month', 'Revenue', 'Budget'],
        ...rows
      ]);

      const chart = new google.visualization.ComboChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        vAxis: { title: 'Amount' },
        hAxis: { title: 'Month' },
        seriesType: 'bars',
        series: { 1: { type: 'line' } },
        legend: { position: 'bottom' }
      });
    });
  }
}
