import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  AfterViewInit
} from '@angular/core';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { toChartData } from '../../utils/date-utils';
import { getChartOptions } from '../../utils/chart-options.util';

declare var google: any;

@Component({
  selector: 'app-total-revenue-column-chart',
  templateUrl: './total-revenue-column-chart.component.html',
  styleUrls: []
})
export class TotalRevenueColumnChart implements OnChanges, AfterViewInit {
  @Input() rawChartData: { label: string; value: number }[] = [];
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() chartTitle: string = 'הכנסות - עמודות';
  @Input() isDarkMode: boolean = false;
  @Input() isStacked: boolean = false;
  @Input() isRtl: boolean = false;
  @Input() currency: string = '₪';
  @Input() locale: string = 'he';

  // Filters (לא נדרשים בפועל לציור אבל נחשבים ל־@Input)
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() granularity: string = 'month';

  // שליטה ויזואלית
  @Input() showTrendline = true;
  @Input() showAnnotations = true;
  @Input() showLegend = true;
  @Input() shortFormat = true;
  @Input() showPercentageAnnotations = false;
  @Input() showHtmlTooltip = true;
  @Input() isLoading: boolean = true;

  @ViewChild('chart') chartContainer!: ElementRef;
  chartData: any[] = [];

  constructor(private chartService: ChartLoaderService) {}

  granularityOptions = [
    { label: 'Monthly', value: 'month' },
    { label: 'Quarterly', value: 'quarter' },
    { label: 'Yearly', value: 'year' }
  ];
  



  ngAfterViewInit(): void {
    this.chartService.onReady(() => this.draw());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rawChartData'] && this.rawChartData?.length) {
      this.draw();
    }
  
    const redrawKeys = [
      'showTrendline',
      'showAnnotations',
      'showLegend',
      'shortFormat',
      'showPercentageAnnotations',
      'showHtmlTooltip',
      'isDarkMode',
      'isStacked',
      'isRtl',
      'currency',
      'locale'
    ];
  
    if (redrawKeys.some(key => key in changes)) {
      this.draw();
    }
  }
  
  onControlChange(): void {
    this.draw();
  }

  private draw(): void {
    if (!this.rawChartData?.length || !this.chartContainer?.nativeElement) return;

    this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
      showAnnotations: this.showAnnotations,
      shortFormat: this.shortFormat,
      showPercentage: this.showPercentageAnnotations
    });

    const dataTable = google.visualization.arrayToDataTable(this.chartData);

    const options = getChartOptions({
      title: this.chartTitle,
      chartType: 'column',
      showLegend: this.showLegend,
      showTrendline: this.showTrendline,
      showHtmlTooltip: this.showHtmlTooltip,
      isDarkMode: this.isDarkMode,
      currency: this.currency,
      usePercent: this.showPercentageAnnotations,
      isStacked: this.isStacked,
      isRtl: this.isRtl,
      locale: this.locale,
      height: 400,
    });

    const chart = new google.visualization.ColumnChart(this.chartContainer.nativeElement);
    chart.draw(dataTable, options);
  }
}
