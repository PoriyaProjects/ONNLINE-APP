import { Component, OnInit } from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { formatDateForApi } from '../../utils/api-utils';
import { DepartmentService } from '../../services/department.service';
import { toChartData } from '../../utils/date-utils';
import { retry, timeout } from 'rxjs/operators';
import { getChartOptions } from '../../utils/chart-options.util';

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

  // Global chart display controls
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



  granularityOptions = [
    { label: 'Daily', value: 'day' },
    { label: 'Monthly', value: 'month' },
    { label: 'Yearly', value: 'year' }
  ];

  

  constructor(
    private deptService: DepartmentService,
    private ops: OperationalChartService,
    private chartLoader: ChartLoaderService
  ) {}

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
            showAnnotations: this.globalChartControls.showAnnotations,
            shortFormat: this.globalChartControls.shortFormat,
            showPercentage: this.globalChartControls.showPercentageAnnotations
          });
          this.isLoading = false;
        },
        error: () => {
          this.chartData = [['Date', 'Revenue']];
          this.isLoading = false;
        }
      });
  }

  // onGlobalControlChange(): void {
  //   // שיכפול אובייקט כדי לגרום ל-change detection
  //   this.globalChartControls = { ...this.globalChartControls };
  
  //   // עדכון הנתונים של התרשים לפי בקרות גלובליות
  //   if (this.rawChartData?.length) {
  //     this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
  //       showAnnotations: this.globalChartControls.showAnnotations,
  //       shortFormat: this.globalChartControls.shortFormat,
  //       showPercentage: this.globalChartControls.showPercentageAnnotations
  //     });
  
  //     // שרטוט מחודש של כל הגרפים עם ההגדרות החדשות
  //     this.drawAllCharts();
  //   }
  // }
  

  onGlobalControlChange() {
    this.loadChartData(); // טוען מחדש את הנתונים ומעביר את הערכים החדשים לכל הגרפים
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


  // drawAllCharts(): void {
  //   if (!this.chartData?.length || typeof google === 'undefined') return;
  
  //   const data = google.visualization.arrayToDataTable(this.chartData);
  
  //   const options = {
  //     ...this.globalChartControls,
  //     title: 'הכנסות',
  //     chartType: '', // יתעדכן לכל גרף בנפרד
  //     height: 400
  //   };
  
  //   const mergedOptions = (chartType: string) => getChartOptions({ ...options, chartType });
  
  //   const columnContainer = document.getElementById('columnChart');
  //   if (columnContainer) {
  //     const columnChart = new google.visualization.ColumnChart(columnContainer);
  //     columnChart.draw(data, mergedOptions('column'));
  //   }
  
  //   const lineContainer = document.getElementById('lineChart');
  //   if (lineContainer) {
  //     const lineChart = new google.visualization.LineChart(lineContainer);
  //     lineChart.draw(data, mergedOptions('line'));
  //   }
  
  //   const barContainer = document.getElementById('barChart');
  //   if (barContainer) {
  //     const barChart = new google.visualization.BarChart(barContainer);
  //     barChart.draw(data, mergedOptions('bar'));
  //   }
  // }

  drawAllCharts(): void {
    if (!this.chartData?.length || typeof google === 'undefined') return;
  
    const data = google.visualization.arrayToDataTable(this.chartData);
    
    const commonOptions = {
      ...this.globalChartControls,
      height: 400,
      currency: this.globalChartControls.currency,
      locale: this.globalChartControls.locale,
      isDarkMode: this.globalChartControls.isDarkMode,
      isRtl: this.globalChartControls.isRtl,
      isStacked: this.globalChartControls.isStacked,
      usePercent: this.globalChartControls.showPercentageAnnotations,
      showHtmlTooltip: this.globalChartControls.showHtmlTooltip,
      showTrendline: this.globalChartControls.showTrendline,
      showLegend: this.globalChartControls.showLegend,
      
    };
  
    const columnOptions = getChartOptions({
      ...commonOptions,
      chartType: 'column',
      title: 'הכנסות לפי עמודות'
    });
  
    const lineOptions = getChartOptions({
      ...commonOptions,
      chartType: 'line',
      title: 'הכנסות לפי קו מגמה'
    });
  
    const barOptions = getChartOptions({
      ...commonOptions,
      chartType: 'bar',
      title: 'הכנסות לפי בר אופקי'
    });
  
    const columnContainer = document.getElementById('columnChart');
    if (columnContainer) {
      new google.visualization.ColumnChart(columnContainer).draw(data, columnOptions);
    }
  
    const lineContainer = document.getElementById('lineChart');
    if (lineContainer) {
      new google.visualization.LineChart(lineContainer).draw(data, lineOptions);
    }
  
    const barContainer = document.getElementById('barChart');
    if (barContainer) {
      new google.visualization.BarChart(barContainer).draw(data, barOptions);
    }
  }
  
  
}
