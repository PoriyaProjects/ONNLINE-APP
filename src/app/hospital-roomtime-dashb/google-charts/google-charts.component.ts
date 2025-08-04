import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { drawOverlayDualArcChartHelperRoomTime } from 'src/app/shared/drawOverlayDualArcChartHelperRoomTime';
import { sanitizeSoapResponse } from 'src/app/shared/sanitizesoapresponce';

@Component({
  selector: 'app-google-charts-time',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css'],
})
export class RoomTimeDashboardComponent implements OnInit, AfterViewInit {
  // Data type options
  readonly dataTypes = [
    { value: '1-Yesterday', label: 'אתמול' },
    { value: '2-CurrentMonth', label: 'החודש' },
    { value: '3-CurrentYear', label: 'השנה' },
    { value: '4-ParallelsPeriod', label: 'השוואתי' }
  ];
  selectedDataType = '2-CurrentMonth';

  activeTab: 'avg' | 'agg' = 'avg';
  treeMapActiveTab: 'MorningDelay' | 'EndDay' | 'SetupTime' = 'MorningDelay';

  // Colors for departments
  readonly departmentColors: string[] = [
    '#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b',
    '#a17ef8', '#ff8c42', '#c4e86b', '#00d4a3', '#ff9ed4',
    '#8bdbf2', '#d48efc', '#ffb347'
  ];
  departmentColorMap: { [dept: string]: string } = {};

  legendMinimized = false;
  private resizeTimeout: any;

  // === New: For expand/collapse table groups ===
  openGroup: string | null = null;
  dataSources = ['MorningDelay', 'EndDay', 'SetupTime'];

  elementIdsByPeriod = {
    '1-Yesterday': { MorningDelay: 'tableMorningDelay_1-Yesterday', EndDay: 'tableEndDay_1-Yesterday', SetupTime: 'tableSetupTime_1-Yesterday' },
    '2-CurrentMonth': { MorningDelay: 'tableMorningDelay_2-CurrentMonth', EndDay: 'tableEndDay_2-CurrentMonth', SetupTime: 'tableSetupTime_2-CurrentMonth' },
    '3-CurrentYear': { MorningDelay: 'tableMorningDelay_3-CurrentYear', EndDay: 'tableEndDay_3-CurrentYear', SetupTime: 'tableSetupTime_3-CurrentYear' },
    '4-ParallelsPeriod': { MorningDelay: 'tableMorningDelay_4-ParallelsPeriod', EndDay: 'tableEndDay_4-ParallelsPeriod', SetupTime: 'tableSetupTime_4-ParallelsPeriod' }
  };

  constructor(public googleChartsService: GoogleChartsService) {}

  ngOnInit(): void {
    const storedState = localStorage.getItem('legendMinimized');
    this.legendMinimized = storedState === 'true';
  }

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());
    this.loadAllPeriodCharts();

    // === Load tables ===
    this.googleChartsService.drawAllDepartmentTables(
      this.elementIdsByPeriod,
      `${environment.url}/GetRoomTimeAvgD`
    );

    this.googleChartsService.drawGroupedComparisonCharts(
      'comparisonAggChart',
      'comparisonAvgChart',
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

  /** Handle resize */
  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.loadCharts(), 300);
  }

  /** Handle timeframe change */
  onDataTypeChange(): void {
    this.loadCharts();
  }

  onTabChange(tab: 'avg' | 'agg'): void {
    this.activeTab = tab;
    if (this.activeTab === 'agg' && this.selectedDataType === '1-Yesterday') {
      this.selectedDataType = '2-CurrentMonth';
    }
    setTimeout(() => this.loadCharts(), 0);
  }

  /** Consistent department colors */
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

  /** Load bar & arc charts */
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

  /** Legend toggle */
  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    localStorage.setItem('legendMinimized', this.legendMinimized.toString());
  }

  /** Departments for legend */
  getDepartments(): string[] {
    return Object.keys(this.departmentColorMap);
  }

  /** === Expand/collapse group logic === */
  toggleGroup(group: string): void {
    this.openGroup = this.openGroup === group ? null : group;

    if (this.openGroup) {
      setTimeout(() => {
        const el = document.getElementById(`group_${group}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const offset = window.pageYOffset + rect.top - 60;
          window.scrollTo({ top: offset, behavior: 'smooth' });

          // Flash effect
          el.classList.add('flash-highlight');
          setTimeout(() => el.classList.remove('flash-highlight'), 1500);
        }
      }, 300);
    }
  }

  isOpen(group: string): boolean {
    return this.openGroup === group;
  }
}
