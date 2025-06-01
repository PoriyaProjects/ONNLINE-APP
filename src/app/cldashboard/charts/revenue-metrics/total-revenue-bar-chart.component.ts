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
  selector: 'app-total-revenue-bar-chart',
  templateUrl: './total-revenue-bar-chart.component.html',
  styleUrls: []
})
export class TotalRevenueBarChart implements OnChanges, AfterViewInit {
  @Input() rawChartData: { label: string; value: number }[] = [];
  @Input() chartTitle: string = 'הכנסות - בר אופקי';

  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() granularity: string = 'month';

  @Input() showTrendline = false;
  @Input() showAnnotations = true;
  @Input() shortFormat = true;
  @Input() showLegend = true;
  @Input() showPercentageAnnotations = false;
  @Input() showHtmlTooltip = true;
  @Input() isDarkMode = false;
  @Input() isStacked = false;
  @Input() isRtl = false;
  @Input() currency: string = '₪';
  @Input() locale: string = 'he';
  @Input() isLoading: boolean = true;

  
  // Local overrides
  useLocalOverride = false;
  localControls = {
    showTrendline: true,
    showAnnotations: true,
    showLegend: true,
    shortFormat: true,
    showPercentageAnnotations: false,
    showHtmlTooltip: true
  };
  
  @ViewChild('chart') chartContainer!: ElementRef;

  chartData: any[] = [];

  constructor(private chartService: ChartLoaderService) {}

  granularityOptions = [
    { label: 'Monthly', value: 'month' },
    { label: 'Quarterly', value: 'quarter' },
    { label: 'Yearly', value: 'year' }
  ];
  
  //isLoading = true;

  ngAfterViewInit(): void {
    this.chartService.onReady(() => this.draw());
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   if (changes['rawChartData'] && this.rawChartData?.length) {
  //     this.draw();
  //   }
  // }


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
  
  
  onGranularityChange(): void {
    this.draw();
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
      chartType: 'bar',
      showLegend: this.showLegend,
      showTrendline: this.showTrendline,
      showHtmlTooltip: this.showHtmlTooltip,
      isDarkMode: this.isDarkMode,
      currency: this.currency,
      usePercent: this.showPercentageAnnotations,
      isStacked: this.isStacked,
      isRtl: this.isRtl,
      locale: this.locale,
      height: 400
    });

    const chart = new google.visualization.BarChart(this.chartContainer.nativeElement);
    chart.draw(dataTable, options);
  }
}
