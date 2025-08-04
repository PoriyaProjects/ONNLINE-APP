import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';

@Component({
  selector: 'app-google-charts-time',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class RoomTimeDashboardComponent implements OnInit, AfterViewInit {
  // Data type options for radio buttons
  readonly dataTypes = [
    { value: '1-Yesterday', label: 'אתמול' },
    { value: '2-CurrentMonth', label: 'החודש' },
    { value: '3-CurrentYear', label: 'השנה' },
    { value: '4-ParallelsPeriod', label: 'השוואתי' }
  ];
  selectedDataType = '2-CurrentMonth';

  // Tabs
  activeTab: 'avg' | 'agg' = 'avg';

  // Colors for departments (persisted mapping)
  readonly departmentColors: string[] = [
    '#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b',
    '#a17ef8', '#ff8c42', '#c4e86b', '#00d4a3', '#ff9ed4',
    '#8bdbf2', '#d48efc', '#ffb347'
  ];
  departmentColorMap: { [dept: string]: string } = {};

  legendMinimized = false;
  private resizeTimeout: any;

  constructor(public googleChartsService: GoogleChartsService) {}

  ngOnInit(): void {
    // Restore legend panel state
    const storedState = localStorage.getItem('legendMinimized');
    this.legendMinimized = storedState === 'true';
  }

  ngAfterViewInit(): void {
    // Wait for Google Charts to be ready before loading
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());
    this.loadAllPeriodCharts();
    this.googleChartsService.drawGroupedComparisonCharts(
      'comparisonAggChart',   // Aggregate chart container ID
      'comparisonAvgChart',   // Average chart container ID
      `${environment.url}/GetRoomTimeSummaryAllSeparated`
    );
    this.googleChartsService.drawGroupedComparisonChartsByType(
      { 
        '1-Yesterday': 'comparisonAggYesterday',
        '2-CurrentMonth': 'comparisonAggMonth',
        '3-CurrentYear': 'comparisonAggYear',
        '4-ParallelsPeriod': 'comparisonAggParallel'
      },
      { 
        '1-Yesterday': 'comparisonAvgYesterday',
        '2-CurrentMonth': 'comparisonAvgMonth',
        '3-CurrentYear': 'comparisonAvgYear',
        '4-ParallelsPeriod': 'comparisonAvgParallel'
      },
      `${environment.url}/GetRoomTimeSummaryAllSeparated`
    );
    
  }

  /** Handle window resize (debounced) */
  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.loadCharts(), 300);
  }

  /** When timeframe radio changes */
  onDataTypeChange(): void {
    this.loadCharts();
    
  }

  /** When tab changes */
  // onTabChange(tab: 'avg' | 'agg'): void {
  //   this.activeTab = tab;
  //   // Allow UI to update before redrawing
  //   setTimeout(() => this.loadCharts(), 0);
  // }

  onTabChange(tab: 'avg' | 'agg'): void {
    this.activeTab = tab;
  
    // If switched to 'agg' and current selection is '1-Yesterday', change to '2-CurrentMonth'
    if (this.activeTab === 'agg' && this.selectedDataType === '1-Yesterday') {
      this.selectedDataType = '2-CurrentMonth';
    }
  
    // Allow UI to update before redrawing
    setTimeout(() => this.loadCharts(), 0);
  }
  
  /** Consistently map departments to colors (persist across reloads) */
  getDepartmentColor(department: string): string {
    if (!this.departmentColorMap[department]) {
      const stored = localStorage.getItem(`deptColor_${department}`);
      if (stored) {
        this.departmentColorMap[department] = stored;
      } else {
        const index = Object.keys(this.departmentColorMap).length % this.departmentColors.length;
        const color = this.departmentColors[index];
        this.departmentColorMap[department] = color;
        localStorage.setItem(`deptColor_${department}`, color);
      }
    }
    return this.departmentColorMap[department];
  }


  loadAllPeriodCharts(): void {
    const url = `${environment.url}/GetRoomTimeSummaryAllSeparated`;
  
    const elementIdsAvg = {
      '1-Yesterday': 'chartAvg_1-Yesterday',
      '2-CurrentMonth': 'chartAvg_2-CurrentMonth',
      '3-CurrentYear': 'chartAvg_3-CurrentYear',
      '4-ParallelsPeriod': 'chartAvg_4-ParallelsPeriod'
    };
  
    const elementIdsAgg = {
      '1-Yesterday': 'chartAgg_1-Yesterday',
      '2-CurrentMonth': 'chartAgg_2-CurrentMonth',
      '3-CurrentYear': 'chartAgg_3-CurrentYear',
      '4-ParallelsPeriod': 'chartAgg_4-ParallelsPeriod'
    };
  
    this.googleChartsService.drawCombinedBarChartsByPeriod(elementIdsAvg, elementIdsAgg, url);
  }
  
  
  


  /** Load charts based on active tab */
  loadCharts(): void {
    const chartsConfig = this.activeTab === 'avg'
      ? {
          ids: { MorningDelay: 'chartMorningDelayAvg', EndDay: 'chartEndDayAvg', SetupTime: 'chartSetupTimeAvg' },
          url: `${environment.url}/GetRoomTimeAvgD`,
          title: 'זמן ממוצע (HH:MM)',
          isDays: false
        }
      : {
          ids: { MorningDelay: 'chartMorningDelayAgg', EndDay: 'chartEndDayAgg', SetupTime: 'chartSetupTimeAgg' },
          url: `${environment.url}/GetRoomAggregateDaysD`,
          title: 'ימי אובדן',
          isDays: true
        };

    this.googleChartsService.drawDepartmentChartsWithColors(
      chartsConfig.ids,
      chartsConfig.url,
      this.selectedDataType,
      chartsConfig.title,
      (dept: string) => this.getDepartmentColor(dept),
      chartsConfig.isDays
    );

    this.googleChartsService.drawRoomTimeDualArcCharts({
      'MorningDelay_agg': 'MorningDelay_agg',
      'MorningDelay_avg': 'MorningDelay_avg',
      'EndDay_agg': 'EndDay_agg',
      'EndDay_avg': 'EndDay_avg',
      'SetupTime_agg': 'SetupTime_agg',
      'SetupTime_avg': 'SetupTime_avg',
    });
    
  }

  /** Toggle floating legend */
  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    localStorage.setItem('legendMinimized', this.legendMinimized.toString());
  }

  /** Return all mapped departments (for legend display) */
  getDepartments(): string[] {
    return Object.keys(this.departmentColorMap);
  }












  
}
