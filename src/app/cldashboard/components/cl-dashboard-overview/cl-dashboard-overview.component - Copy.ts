import { Component, OnInit } from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { formatDateForApi } from '../../utils/api-utils';
import { DepartmentService } from '../../services/department.service';
import { toChartData } from '../../utils/date-utils';
import { retry, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-cl-dashboard-overview',
  templateUrl: './cl-dashboard-overview.component.html'
})
export class ClDashboardOverviewComponent implements OnInit {
  departments: { id: number, name: string }[] = [];
  periods: { id: number, name: string }[] = [];

  filters = {
    deptCode: '',
    param: '1',
    startDate: '2024-01-01',
    endDate: '2025-05-31',
    granularity: 'month'
  };

  rawChartData: { label: string; value: number }[] = [];
  chartData: any[] = [];

  isLoading = false;

  constructor(
    private deptService: DepartmentService,
    private ops: OperationalChartService,
    private chartLoader: ChartLoaderService
  ) {}

  
  globalChartControls = {
    showTrendline: true,
    showAnnotations: true,
    showLegend: true,
    shortFormat: true,
    showPercentageAnnotations: false,
    showHtmlTooltip: true,
    isDarkMode: false,
    isStacked: false,
    isRtl: false,
    currency: '₪',
    locale: 'he'
  };
  
  
  ngOnInit() {
    this.deptService.getDepartments().subscribe(list => {
      this.departments = list;
      this.filters.deptCode = localStorage.getItem('storage.Depart') || (list[0]?.id?.toString() || '1');
    });

    this.deptService.getTimeTypes().subscribe(periodList => {
      this.periods = periodList;
      if (!this.filters.param && periodList.length > 0) {
        this.filters.param = periodList[0].id.toString();
      }
    });

    this.chartLoader.onReady(() => this.loadChartData());
  }

  loadChartData() {
    this.isLoading = true;
    const { startDate, endDate, granularity } = this.filters;

    const apiStart = formatDateForApi(startDate);
    const apiEnd = formatDateForApi(endDate);

    this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, granularity)
      .pipe(timeout(60000), retry(10))
      .subscribe({
        next: (cleaned) => {
          this.rawChartData = cleaned;
          this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
            showAnnotations: true,
            shortFormat: true,
            showPercentage: false
          });
          this.isLoading = false;
        },
        error: () => {
          this.chartData = [['Date', 'Revenue']];
          this.isLoading = false;
        }
      });
  }

  onDepartmentChange(id: string) {
    this.filters.deptCode = id;
    localStorage.setItem('storage.Depart', id);
    this.loadChartData();
  }

  onPeriodChange(id: string) {
    this.filters.param = id;
    this.loadChartData();
  }

  updateFilters(updated: any) {
    this.filters = { ...this.filters, ...updated };
    this.loadChartData();
  }


  globalControls = {
    showTrendline: true,
    showAnnotations: true,
    showLegend: true,
    shortFormat: true,
    showPercentageAnnotations: false,
    showHtmlTooltip: true
  };
  
}
