import { Component, AfterViewInit, OnInit } from '@angular/core';
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
  departments: { label: string; value: string }[] = [];
  selectedDepartmentValue = '';
  isAdmin = false;
  showDepartmentSelector = false;

  constructor(
    public googleChartsService: GoogleChartsService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngAfterViewInit(): void {
    this.googleChartsService.chartsReady$.subscribe(() => this.loadCharts());
  }

  /** Load departments list from API */
  private loadDepartments(): void {
    this.http.get<string>(`${environment.url}/GetRoomTimeDept`, { responseType: 'text' as 'json' })
      .subscribe({
        next: (res: string) => {
          const cleanData = this.sanitizeSoapResponse(res);
          const deptArray: string[] = JSON.parse(cleanData);
          this.departments = deptArray.map(d => ({ label: d, value: d }));

          const userDepartment = (localStorage.getItem('Depart') || '').trim();
          const adminDepartments = ['ניהול', 'מערכות מידע', 'תקציבים', 'הנהלת המרכז הרפואי', 'הנהלה אדמיניסטרטיבית', '19'];

          this.isAdmin = adminDepartments.includes(userDepartment);
          this.showDepartmentSelector = this.isAdmin;

          this.selectedDepartmentValue = this.isAdmin
            ? this.departments[0]?.value || ''
            : userDepartment;
        },
        error: err => console.error('Failed to load departments', err)
      });
  }

  /** Reload charts */
  onDepartmentChange(): void {
    this.googleChartsService.clearCache();
    this.loadCharts();
  }

  /** Draw all charts */
  loadCharts(): void {
    const dparam = this.selectedDepartmentValue;

    // 1st row: AvgTime
    this.googleChartsService.drawGroupedRoomTimeCharts(
      {
        MorningDelay: 'chartMorningDelayAvg',
        LostDays: 'chartLostDaysAvg',
        SetupTime: 'chartSetupTimeAvg'
      },
      `${environment.url}/GetRoomTimeAvg`,
      dparam,
      'זמן ממוצע (HH:MM)',
      3
    );

    // 2nd row: AggregateDays
    this.googleChartsService.drawGroupedRoomTimeCharts(
      {
        MorningDelay: 'chartMorningDelayAgg',
        LostDays: 'chartLostDaysAgg',
        SetupTime: 'chartSetupTimeAgg'
      },
      `${environment.url}/GetRoomTimeAggregated`,
      dparam,
      'ימים מצטברים',
      3
    );
  }

  /** Strip SOAP wrapper */
  private sanitizeSoapResponse(response: string): string {
    const startIndex = response.indexOf('[');
    const endIndex = response.lastIndexOf(']');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Invalid SOAP response');
    }
    return response.substring(startIndex, endIndex + 1);
  }
}
