import { Component, ViewChild, ElementRef, Input } from '@angular/core';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { getChartOptions } from '../../utils/chart-options.util';
import { BaseRevenueChartComponent } from '../../components/base-revenue-chart.component';

declare var google: any;

@Component({
    selector: 'app-total-revenue-pie-chart',
    templateUrl: './total-revenue-pie-chart.component.html',
})
export class TotalRevenuePieChart extends BaseRevenueChartComponent {
    @ViewChild('chart') chartContainer!: ElementRef;

    constructor(private chartService: ChartLoaderService) {
        super();
        this.chartType = 'pie';
    }

    @Input() chartTitle = 'הכנסות';
    @Input() startDate: string = '';
    @Input() endDate: string = '';
    @Input() granularity: string = 'month';
    @Input() selectedDeptGroupId: number = 0;
    @Input() locale = 'he';
    @Input() currency = '₪';
    @Input() isRtl = false;
    @Input() isDarkMode = false;
    @Input() shortFormat = true;
    @Input() showAnnotations = true;
    @Input() showLegend = true;
    @Input() showPercentageAnnotations = false;
    @Input() showHtmlTooltip = true;
    @Input() showTrendline = true;  // Optional for consistent controls
    @Input() isStacked = false;     // Optional, in case pie gets changed to donut
    
    protected draw(): void {
        if (!this.rawChartData?.length || !this.chartContainer?.nativeElement) return;

        console.log('[PieChart draw] rawChartData:', this.rawChartData);

        const chartData = this.prepareChartData();
        console.log('[PieChart draw] chartData:', chartData);

        const dataTable = google.visualization.arrayToDataTable(chartData);
        const vAxisFormat = this.shortFormat ? 'short' : undefined;


        const options = getChartOptions({
          title: this.chartTitle,
          chartType: this.chartType,
          showLegend: this.showLegend,
          isDarkMode: this.isDarkMode,
          isStacked: this.isStacked ?? false,
          isRtl: this.isRtl,
          locale: this.locale,
          height: 400,
          showAnnotations: this.showAnnotations,
        
      });

        const chart = new google.visualization.PieChart(this.chartContainer.nativeElement);
        chart.draw(dataTable, options);
    }
}
