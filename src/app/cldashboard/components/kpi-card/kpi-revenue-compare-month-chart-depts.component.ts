import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { BaseRevenueChartComponent } from '../base-revenue-chart.component';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { getChartOptions } from '../../utils/chart-options.util';
import { throwError } from 'rxjs';
import { catchError, retryWhen, scan, delay, map } from 'rxjs/operators';

@Component({
  selector: 'app-revenue-compare-months-chart-depts',
  templateUrl: './kpi-revenue-compare-month-chart-depts.component.html',
})
export class RevenueCompareMonthChartDeptsComponent extends BaseRevenueChartComponent implements OnInit {
  @Input() selectedDeptGroupId: number = 0;
  @Input() chartTitle = '5 מחלקות מובילות';
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
  @Input() width = 400;

  constructor(
    private chartService: OperationalChartService,
    private chartLoader: ChartLoaderService
  ) {
    super();
    this.chartType = 'bar';
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

    this.chartService.fetchCompareCMRevenueDataOnce(deptParam).pipe(
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
        console.error('[revenueCompareMonthsChartDepts] Final fetchData error:', err);
        this.isLoading = false;
        return throwError(() => err);
      }),
      map((data: { aliasName: string; TotalCharging: number }[]) => {
        return data
          .sort((a, b) => b.TotalCharging - a.TotalCharging)
          .slice(0, 5)
          .map(item => ({
            label: item.aliasName,
            value: item.TotalCharging,
          }));
      })
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
        width: this.width
      });

      const container = document.getElementById('revenueCompareMonthsChartDepts');
      if (container) {
        const chart = new google.visualization.BarChart(container);
        chart.draw(dataTable, options);
      }
    });
  }

  protected prepareChartData(): any[] {
    const chartData: any[] = [['Alias', 'הכנסה', { role: 'annotation' }]];
    const formatAnnotation = (value: number): string => {
      if (this.shortFormat) {
        if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
      }
      return value.toFixed(0);
    };

    for (const row of this.rawChartData) {
      const label = `ID ${row.label}`; // Replace with map[row.label] if desired
      const value = row.value || 0;
      chartData.push([label, value, formatAnnotation(value)]);
    }

    return chartData;
  }
}
