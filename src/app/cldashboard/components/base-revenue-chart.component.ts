import {
    AfterViewInit,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
    ViewChild,
    Directive
  } from '@angular/core';
  import { formatDateForApi } from '../utils/api-utils';
  import { toChartData } from '../utils/date-utils';
  import { OperationalChartService } from '../services/operational-chart.service';
  import { ChartLoaderService } from '../utils/google-charts-loader';
import { timeout } from 'rxjs/operators';
  
  @Directive()
  export abstract class BaseRevenueChartComponent implements OnInit, OnChanges, AfterViewInit {
    @Input() chartTitle = 'הכנסות';
    @Input() startDate = '';
    @Input() endDate = '';
    @Input() granularity = 'month';
    @Input() shortFormat = true;
    @Input() showTrendline = true;
    @Input() showAnnotations = true;
    @Input() showLegend = true;
    @Input() showPercentageAnnotations = false;
    @Input() showHtmlTooltip = false;
  
    @ViewChild('chart') chartContainer!: ElementRef;
  
    rawChartData: { label: string; value: number }[] = [];
    chartData: any[] = [];
    isLoading = false;
  
    constructor(
      protected ops: OperationalChartService,
      protected chartService: ChartLoaderService
    ) {}
  
    ngOnInit(): void {
      const dates = this.chartService.ensureDates(this.startDate, this.endDate);
      this.startDate = dates.startDate;
      this.endDate = dates.endDate;
    }
  
    ngAfterViewInit(): void {
      this.chartService.onReady(() => this.loadData());
    }
  
    ngOnChanges(): void {
      this.chartService.onReady(() => this.loadData());
    }
  
    onControlChange(): void {
      this.updateChartData();
      this.drawChart();
    }
  
    protected loadData(): void {
      if (!this.startDate || !this.endDate) return;
  
      this.isLoading = true;
      const apiStart = formatDateForApi(this.startDate);
      const apiEnd = formatDateForApi(this.endDate);
  
      this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, this.granularity).pipe(timeout(160000)).subscribe({
        next: (cleanedData) => {
          this.rawChartData = cleanedData;
          this.updateChartData();
          this.isLoading = false;
          this.drawChart();
        },
        error: (err) => {
          console.error('[Chart Load Error]:', err);
          this.chartData = [['Date', 'Revenue']];
          this.isLoading = false;
        }
      });
    }
  
    protected updateChartData(): void {
      this.chartData = toChartData(this.rawChartData, ['Date', 'Revenue'], {
        showAnnotations: this.showAnnotations,
        shortFormat: this.shortFormat,
        showPercentage: this.showPercentageAnnotations
      });
    }
  
    protected abstract drawChart(): void;
  }
  