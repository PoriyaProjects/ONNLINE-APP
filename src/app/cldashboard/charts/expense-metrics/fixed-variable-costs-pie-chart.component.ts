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
  selector: 'app-fixed-variable-costs-pie-chart',
  templateUrl: './fixed-variable-costs-pie-chart.component.html',
  styleUrls: []
})
export class FixedVariableCostsPieChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'Fixed vs Variable Costs';
  @ViewChild('chart') chartContainer!: ElementRef;
chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

 ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}

  ngOnChanges() {
    if (google.visualization && google.visualization.PieChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchFixedVariableCosts(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Type', 'Cost'],
        ...rows
      ]);
      const chart = new google.visualization.PieChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        pieHole: 0.3,
        legend: { position: 'right' }
      });
    });
  }
}
