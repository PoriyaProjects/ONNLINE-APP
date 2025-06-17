import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { BaseRevenueChartComponent } from '../base-revenue-chart.component';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { getChartOptions } from '../../utils/chart-options.util';
import { throwError, timer } from 'rxjs';
import { catchError, retryWhen, scan, delay, map } from 'rxjs/operators';

@Component({
  selector: 'app-revenue-compare-years-chart',
  templateUrl: './kpi-revenue-compare-years-chart.component.html',
})
export class RevenueCompareYearsChartComponent extends BaseRevenueChartComponent implements OnInit {
  @Input() selectedDeptGroupId: number = 0;

  @Input() chartTitle = 'הכנסות שנתיות';
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
  
    this.chartService.fetchCompareRevenueDataOnce(deptParam).pipe(
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
          console.error('[RevenueCompareYearsChartComponent] Final fetchData error:', err);
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
          this.rawChartData = normalizedData; // ✅ now matches expected type
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
      });

      const container = document.getElementById('revenueCompareYearsChart');
      if (container) {
        const chart = new google.visualization.ColumnChart(container);
        chart.draw(dataTable, options);
      }
    });
  }

  protected prepareChartData(): any[] {
    const chartData: any[] = [['Year', 'הכנסה', { role: 'annotation' }]];
    const baseYear = new Date().getFullYear();
  
    const formatAnnotation = (value: number): string => {
      if (this.shortFormat) {
        if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
      }
      return value.toFixed(0);
    };
  
    // Convert your existing rawChartData into the expected alias/value shape
    const converted = this.rawChartData.map((row) => ({
      aliasName: row.label,
      TotalCharging: row.value,
    }));
  
    for (const row of converted) {
      const yearOffset = parseInt(row.aliasName, 10);
      if (isNaN(yearOffset)) continue;
  
      const yearLabel = (baseYear + yearOffset).toString(); // e.g. "2025"
      const value = row.TotalCharging || 0;
  
      chartData.push([yearLabel, value, formatAnnotation(value)]);
    }
  
    return chartData;
  }
  
  
}
