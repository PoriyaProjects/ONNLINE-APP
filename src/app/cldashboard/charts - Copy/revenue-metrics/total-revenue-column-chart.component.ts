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
import { toChartData, formatDateForApi } from '../../utils/date-utils';
import { getChartOptions } from '../../utils/chart-options.util';
import { OperationalChartService } from '../../services/operational-chart.service';
import { sanitizeApiJson } from '../../utils/sanitize-util';
import { retry } from 'rxjs/internal/operators/retry';

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

  @ViewChild('chart') chartContainer!: ElementRef;

  // Filters & state
  @Input() startDate: string = '2024-01-01';
  @Input() endDate: string = '2025-05-31';
  @Input() granularity: string = 'month';
  granularityOptions = [
    { label: 'Daily', value: 'day' },
    { label: 'Monthly', value: 'month' },
    { label: 'Yearly', value: 'year' }
  ];
  isLoading: boolean = false;

  // Visual controls
  
  showTrendline = true;
  showAnnotations = true;
  showLegend = true;
  shortFormat = true;
  showPercentageAnnotations = false;
  showHtmlTooltip = true;
  
  chartData: any[] = [];

  constructor(
    private chartService: ChartLoaderService,
    private ops: OperationalChartService
  ) {}

  ngAfterViewInit(): void {
    this.chartService.onReady(() => this.loadData());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startDate'] || changes['endDate'] || changes['granularity']) {
      this.loadData();
    }
  }

  onControlChange(): void {
    this.draw();
  }

  loadData(): void {
    if (!this.startDate || !this.endDate) return;
    this.isLoading = true;

    const apiStart = formatDateForApi(this.startDate);
    const apiEnd = formatDateForApi(this.endDate);

    this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, this.granularity).pipe(retry(10)).subscribe({
      next: (data) => {
        this.rawChartData = data;
        this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
          showAnnotations: this.showAnnotations,
          shortFormat: this.shortFormat,
          showPercentage: this.showPercentageAnnotations
        });
        this.draw();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Chart Load Error]', err);
        this.chartData = [['Date', 'Revenue']];
        this.isLoading = false;
      }
    });
  }

  private draw(): void {
    if (!this.chartData || !this.chartContainer?.nativeElement) return;

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
      height: 400
    });

    const chart = new google.visualization.ColumnChart(this.chartContainer.nativeElement);
    chart.draw(dataTable, options);
  }
}
