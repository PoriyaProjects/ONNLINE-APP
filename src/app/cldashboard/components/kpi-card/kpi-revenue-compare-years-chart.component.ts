import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { BaseRevenueChartComponent } from '../base-revenue-chart.component';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { getChartOptions } from '../../utils/chart-options.util';
import { throwError } from 'rxjs';
import { catchError, retryWhen, scan, delay, map } from 'rxjs/operators';

interface ChargingDataRow {
  groupName: string;
  deptName: string;
  year: string; // "-1", "-2", etc.
  charging: number;
}

@Component({
  selector: 'app-revenue-compare-years-chart',
  templateUrl: './kpi-revenue-compare-years-chart.component.html',
})
export class RevenueCompareYearsChartComponent extends BaseRevenueChartComponent implements OnInit {
  @Input() selectedDeptGroupId: number = 0;
  @Input() selectedDeptId: string = '';

  @Input() chartTitle = 'הכנסות שנתיות';
  @Input() showAnnotations = true;
  @Input() shortFormat = true;
  @Input() isStacked = false;
  @Input() showLegend = true;
  @Input() showTrendline = true;
  @Input() usePercent = false;

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
    if (changes['selectedDeptGroupId'] || changes['selectedDeptId']) {
      this.fetchData();
    }
  }

  private fetchData(): void {
    this.isLoading = true;
    const groupId = this.selectedDeptGroupId > 0 ? this.selectedDeptGroupId.toString() : '';
    const deptId = this.selectedDeptId;

    this.chartService.fetchCompareRevenueDataOnce(groupId, deptId).pipe(
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
      map((rows: ChargingDataRow[]) => this.aggregateByYear(rows))
    ).subscribe((normalizedData) => {
      this.rawChartData = normalizedData;
      this.draw();
      this.isLoading = false;
    });
  }

  private aggregateByYear(rows: ChargingDataRow[]): { label: string; value: number }[] {
    const totals = new Map<string, number>();

    for (const row of rows) {
      const year = row.year.trim();
      const prev = totals.get(year) || 0;
      totals.set(year, prev + row.charging);
    }

    return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
  }

  protected draw(): void {
    this.chartLoader.ready$.subscribe((ready) => {
      if (!ready || !this.rawChartData?.length) return;

      const chartData = this.prepareChartData();
      const dataTable = google.visualization.arrayToDataTable(chartData);

      const options = getChartOptions({
        chartType: this.chartType,
        title: this.chartTitle,
        shortFormat: this.shortFormat,
        showAnnotations: this.showAnnotations,
        showLegend: this.showLegend,
        usePercent: this.usePercent,
        isStacked: this.isStacked,
        showTrendline: this.showTrendline,
        hAxisDirection: -1
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

    const sorted = [...this.rawChartData].sort(
      (a, b) => parseInt(a.label, 10) - parseInt(b.label, 10)
    );

    sorted.forEach((row, i) => {
      const yearOffset = parseInt(row.label, 10);
      const visualYear = isNaN(yearOffset) ? row.label : (baseYear + yearOffset).toString();
      const value = row.value || 0;
      chartData.push([visualYear, value, formatAnnotation(value)]);
    });

    return chartData;
  }
}
