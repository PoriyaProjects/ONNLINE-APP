import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { BaseRevenueChartComponent } from '../base-revenue-chart.component';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { getChartOptions } from '../../utils/chart-options.util';
import { throwError } from 'rxjs';
import { catchError, retryWhen, scan, delay, map } from 'rxjs/operators';

@Component({
  selector: 'app-revenue-compare-months-chart',
  templateUrl: './kpi-revenue-compare-months-chart.component.html',
})
export class RevenueCompareMonthsChartComponent extends BaseRevenueChartComponent implements OnInit {
  @Input() selectedDeptGroupId: number = 0;
  @Input() chartTitle = 'הכנסות חודשיות';
  @Input() showAnnotations = true;
  @Input() shortFormat = true;
  @Input() isDarkMode = false;
  @Input() isRtl = false;
  @Input() locale = 'he';
  @Input() currency = '₪';
  @Input() isStacked = false;
  @Input() showLegend = true;
  @Input() showTrendline = true;
  @Input() usePercent = false;
  @Input() showHtmlTooltip = true;
  @Input() width = '800';

  constructor(
    private chartService: OperationalChartService,
    private chartLoader: ChartLoaderService
  ) {
    super();
    this.chartType = 'column';
  }

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['selectedDeptGroupId']) {
      this.fetchData();
    }
  }

  private fetchData(): void {
    this.isLoading = true;
    const deptParam = this.selectedDeptGroupId > 0 ? this.selectedDeptGroupId : '';

    this.chartService.fetchCompareMRevenueDataOnce(deptParam).pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((retryCount, err) => {
            if (retryCount >= 3) throw err;
            console.warn(`[Retry] Attempt ${retryCount + 1} after error:`, err.message || err);
            return retryCount + 1;
          }, 0),
          delay(1000)
        )
      ),
      catchError(err => {
        console.error('[RevenueCompareMonthsChartComponent] Final fetchData error:', err);
        this.isLoading = false;
        return throwError(() => err);
      }),
      map((data: { aliasName: string; TotalCharging: number }[]) =>
        data.map(item => ({
          label: item.aliasName,
          value: item.TotalCharging,
        }))
      )
    ).subscribe(
      (normalizedData) => {
        this.rawChartData = normalizedData;
        this.draw();
        this.isLoading = false;
      }
    );
  }

  protected draw(): void {
    this.chartLoader.ready$.subscribe((ready) => {
      if (!ready || !this.rawChartData?.length) return;

      const chartData = this.prepareChartData();
      const dataTable = google.visualization.arrayToDataTable(chartData);

      const options = getChartOptions({
        chartType: this.chartType,
        title: this.chartTitle,
        isDarkMode: this.isDarkMode,
        currency: this.currency,
        shortFormat: this.shortFormat,
        showAnnotations: this.showAnnotations,
        showLegend: this.showLegend,
        isRtl: this.isRtl,
        locale: this.locale,
        usePercent: this.usePercent,
        showHtmlTooltip: this.showHtmlTooltip,
        isStacked: this.isStacked,
        showTrendline: this.showTrendline,
        width: 1000,
      });

      const container = document.getElementById('revenueCompareMonthsChart');
      if (container) {
        const chart = new google.visualization.ColumnChart(container);
        chart.draw(dataTable, options);
      }
    });
  }

  protected prepareChartData(): any[] {
    const chartData: any[] = [['Month', 'הכנסה', { role: 'annotation' }]];

    const formatAnnotation = (value: number): string => {
      if (this.shortFormat) {
        if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
      }
      return value.toFixed(0);
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const converted = this.rawChartData.map((row) => ({
      aliasName: row.label,
      TotalCharging: row.value,
    }));

    for (const row of converted) {
      const [year, month] = row.aliasName.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const monthLabel = `${monthNames[monthIndex]} ${year}`;
      const value = row.TotalCharging || 0;
      chartData.push([monthLabel, value, formatAnnotation(value)]);
    }

    return chartData;
  }
}
