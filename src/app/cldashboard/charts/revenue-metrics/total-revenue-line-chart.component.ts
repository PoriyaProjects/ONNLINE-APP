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
  selector: 'app-total-revenue-line-chart',
  templateUrl: './total-revenue-line-chart.component.html',
  styleUrls: []
})
export class TotalRevenueLineChart implements OnChanges, AfterViewInit {
  @Input() rawChartData: { label: string; value: number }[] = [];
  @Input() chartTitle: string = 'הכנסות - קו מגמה';

  // Inputs from parent
  @Input() deptCode: string = '';
  @Input() param: string = '';
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() granularity: string = 'month';
  @Input() isLoading: boolean = false;

  // Visualization Controls (default: global, can override)
  @Input() showTrendline: boolean = true;
  @Input() showAnnotations: boolean = true;
  @Input() showLegend: boolean = true;
  @Input() shortFormat: boolean = true;
  @Input() showPercentageAnnotations: boolean = false;
  @Input() showHtmlTooltip: boolean = true;
  @Input() isDarkMode: boolean = false;
  @Input() isStacked: boolean = false;
  @Input() isRtl: boolean = false;
  @Input() currency: string = '₪';
  @Input() locale: string = 'he';

  // Optional override flag
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

  granularityOptions = [
    { label: 'Monthly', value: 'month' },
    { label: 'Quarterly', value: 'quarter' },
    { label: 'Yearly', value: 'year' }
  ];

  constructor(private chartService: ChartLoaderService) {}

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

    const controls = this.useLocalOverride ? this.localControls : {
      showTrendline: this.showTrendline,
      showAnnotations: this.showAnnotations,
      showLegend: this.showLegend,
      shortFormat: this.shortFormat,
      showPercentageAnnotations: this.showPercentageAnnotations,
      showHtmlTooltip: this.showHtmlTooltip
    };

    this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
      showAnnotations: controls.showAnnotations,
      shortFormat: controls.shortFormat,
      showPercentage: controls.showPercentageAnnotations
    });

    const dataTable = google.visualization.arrayToDataTable(this.chartData);

    const options = getChartOptions({
      title: this.chartTitle,
      chartType: 'line',
      showLegend: controls.showLegend,
      //showTrendline: controls.showTrendline,
      showTrendline: true,
      showHtmlTooltip: controls.showHtmlTooltip,
      isDarkMode: this.isDarkMode,
      currency: this.currency,
      usePercent: controls.showPercentageAnnotations,
      isStacked: this.isStacked,
      isRtl: this.isRtl,
      locale: this.locale,
      height: 400
    });

    const chart = new google.visualization.LineChart(this.chartContainer.nativeElement);
    chart.draw(dataTable, options);
  }
}
