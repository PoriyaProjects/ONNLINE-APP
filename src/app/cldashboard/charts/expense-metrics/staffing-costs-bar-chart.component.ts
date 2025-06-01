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
  selector: 'app-staffing-costs-bar-chart',
  templateUrl: './staffing-costs-bar-chart.component.html',
  styleUrls: []
})
export class StaffingCostsBarChart implements OnChanges, AfterViewInit {
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'Staffing Costs';
  @ViewChild('chart') chartContainer!: ElementRef;
chartId: any;

  constructor(private chartLoader: ChartLoaderService, private ops: OperationalChartService) {}

 ngAfterViewInit() {
  this.chartLoader.onReady(() => this.loadChart());
}

  ngOnChanges() {
    if (google.visualization && google.visualization.BarChart) {
      this.loadChart();
    }
  }

  loadChart() {
    this.ops.fetchStaffingCosts(this.deptCode).subscribe(res => {
      const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map(r => [r.x, Number(r.y)]) || [];
      const data = google.visualization.arrayToDataTable([
        ['Category', 'Cost'],
        ...rows
      ]);
      const chart = new google.visualization.BarChart(this.chartContainer.nativeElement);
      chart.draw(data, {
        title: this.chartTitle,
        hAxis: { title: 'Cost' },
        vAxis: { title: 'Category' },
        legend: { position: 'none' }
      });
    });
  }
}
