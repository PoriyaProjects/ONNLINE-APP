import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { MDCRipple } from '@material/ripple';
import { environment } from 'src/environments/environment';



@Component({
  selector: 'app-google-charts-time',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class RoomTimeDashboardComponent implements OnInit, AfterViewInit {
  dataTypes = [
    { value: '1-Yesterday', label: 'אתמול' },
    { value: '2-CurrentMonth', label: 'החודש' },
    { value: '3-CurrentYear', label: 'השנה' },
    { value: '4-ParallelsPeriod', label: 'השוואתי' }
  ];
  selectedDataType = '2-CurrentMonth';

  // Tabs
  activeTab: 'avg' | 'agg' = 'avg';

  // 13‑color palette for departments
  departmentColors: string[] = [
    '#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b',
    '#a17ef8', '#ff8c42', '#c4e86b', '#00d4a3', '#ff9ed4',
    '#8bdbf2', '#d48efc', '#ffb347'
  ];
  departmentColorMap: { [dept: string]: string } = {};

  constructor(public googleChartsService: GoogleChartsService) {}

  private resizeTimeout: any;
  //ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());
  }


  @HostListener('window:resize', ['$event'])
  onResize() {
    // Debounce to avoid too many redraws
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.loadCharts();
    }, 300);
  }

  
  onDataTypeChange(): void {
    this.loadCharts();
  }

  onTabChange(tab: 'avg' | 'agg'): void {
    this.activeTab = tab; // update immediately for UI
    setTimeout(() => this.loadCharts(), 0); // redraw charts after DOM update
  }
  

  // Assign colors consistently to departments
  getDepartmentColor(department: string): string {
    if (!this.departmentColorMap[department]) {
      const index = Object.keys(this.departmentColorMap).length % this.departmentColors.length;
      this.departmentColorMap[department] = this.departmentColors[index];
    }
    return this.departmentColorMap[department];
  }



  loadCharts(): void {
    const chartsConfig = this.activeTab === 'avg'
      ? {
          ids: {
            MorningDelay: 'chartMorningDelayAvg',
            LostDays: 'chartLostDaysAvg',
            SetupTime: 'chartSetupTimeAvg'
          },
          url: `${environment.url}/GetRoomTimeAvgD`,
          title: 'זמן ממוצע (HH:MM)',
          isDays: false
        }
      : {
          ids: {
            MorningDelay: 'chartMorningDelayAgg',
            LostDays: 'chartLostDaysAgg',
            SetupTime: 'chartSetupTimeAgg'
          },
          url: `${environment.url}/GetRoomAggregateDaysD`,
          title: 'מספר ימים',
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
  }
  

  legendMinimized = false;

  ngOnInit(): void {
    // Restore state from localStorage
    const storedState = localStorage.getItem('legendMinimized');
    this.legendMinimized = storedState === 'true';
  }
  
  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    // Save state to localStorage
    localStorage.setItem('legendMinimized', this.legendMinimized.toString());
  }
  
  // Extract all department names from the color map (after charts are loaded)
  getDepartments(): string[] {
    return Object.keys(this.departmentColorMap);
  }
}