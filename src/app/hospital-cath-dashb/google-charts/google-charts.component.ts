import { Component, AfterViewInit, HostListener } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { MDCRipple } from '@material/ripple';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class GoogleChartsComponent implements AfterViewInit {
  departments = [
    { label: 'לב', value: 0 },
    { label: 'מוח', value: 1 },
    { label: 'כירורגיה', value: 5 }
  ];

  selectedDepartmentValue = 0;
  isAdmin = false;
  showDepartmentSelector = false;

  private lastParam?: number;
  private lastDparam?: number;

  constructor(
    public googleChartsService: GoogleChartsService,
    private route: ActivatedRoute
  ) {}

  ngAfterViewInit(): void {
    const userDepartment = (localStorage.getItem('Depart') || '').trim();
    const adminDepartments = ['ניהול', 'מערכות מידע', 'תקציבים', 'הנהלת המרכז הרפואי', 'הנהלה אדמיניסטרטיבית', '19'];

    this.isAdmin = adminDepartments.includes(userDepartment);
    this.showDepartmentSelector = this.isAdmin;

    if (!this.isAdmin) {
      this.selectedDepartmentValue = this.mapDepartmentToValue(userDepartment);
    }

    this.googleChartsService.chartsReady$.pipe(take(1)).subscribe(() => {
      this.loadCharts();
    });

    document.querySelectorAll('.mdc-button').forEach(button =>
      new MDCRipple(button as HTMLElement)
    );
  }

  private loadCharts(): void {
    const param = this.getQueryParam();
    const dparam = this.selectedDepartmentValue;

    // Skip if already loaded
    if (param === this.lastParam && dparam === this.lastDparam) {
      console.log('⚠️ Same param/dparam – skipping reload');
      return;
    }

    console.log('📊 Loading charts with param:', param, 'dparam:', dparam);
    this.googleChartsService.loadAllDashboardCharts(param, dparam);

    this.lastParam = param;
    this.lastDparam = dparam;
  }

  // onDepartmentChange(): void {
  //   this.loadCharts();
  // }

  onDepartmentChange(): void {
    const dparam = this.selectedDepartmentValue;
    const param = this.getQueryParam();
  
    if (param === this.lastParam && dparam === this.lastDparam) {
      return;
    }
  
    this.lastParam = param;
    this.lastDparam = dparam;
  
    this.googleChartsService.clearCache();
    this.googleChartsService.setDparam(dparam); // 🔥 Notify table to reload
    this.googleChartsService.loadAllDashboardCharts(param, dparam);
  }

  
  refreshAll(): void {
    const param = this.getQueryParam();
    const dparam = this.selectedDepartmentValue;

    console.log('🔄 Refresh requested');
    this.lastParam = undefined;
    this.lastDparam = undefined;

    this.googleChartsService.clearCache();
    this.googleChartsService.loadAllDashboardCharts(param, dparam);
  }

  private mapDepartmentToValue(dept: string): number {
    return dept.includes('מוח') ? 1 : dept.includes('כירורגיה') ? 5 : 0;
  }

  private getQueryParam(): number | undefined {
    const value = this.route.snapshot.queryParamMap.get('param');
    return value ? Number(value) : undefined;
  }
}


