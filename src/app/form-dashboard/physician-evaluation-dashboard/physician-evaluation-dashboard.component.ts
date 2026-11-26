import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { InquiryDetailsDialogComponent } from './inquiry-details-dialog.component';
import {
  ActivityMonth,
  DashboardSummary,
  EvalPhysician,
  MonthValue,
  PhysicianEvaluationService
} from './physician-evaluation.service';

@Component({
  selector: 'app-physician-evaluation-dashboard',
  templateUrl: './physician-evaluation-dashboard.component.html',
  styleUrls: ['./physician-evaluation-dashboard.component.scss']
})
export class PhysicianEvaluationDashboardComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chartCard') chartCard: ElementRef;
  fullName = ((localStorage.getItem('FirstName') || '') + ' ' + (localStorage.getItem('LastName') || '')).trim();
  horizontalPosition: MatSnackBarHorizontalPosition = 'start';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  monthLabels = ['ינו\'', 'פבר\'', 'מרץ', 'אפר\'', 'מאי', 'יוני', 'יולי', 'אוג\'', 'ספט\'', 'אוק\'', 'נוב\'', 'דצמ\''];
  summaryLoading = false;
  canUpload = false;
  physicians: EvalPhysician[] = [];
  departmentId = '';
  physicianId = '';
  year = new Date().getFullYear();
  years: number[] = [];
  summary: DashboardSummary = null;
  overtimeChart: any[] = [];
  manualChart: any[] = [];
  activityRows: { label: string; values: number[]; total: number }[] = [];
  chartWidth = 280;
  skeletonSlots = [1, 2, 3, 4];
  private loadedPhysicianId = '';
  private physicianSub: Subscription;
  chartType = 'ColumnChart';
  overtimeColumns = ['חודש', 'שעות'];
  manualColumns = ['חודש', 'כמות'];
  overtimeOptions = this.buildChartOptions(0);
  manualOptions = this.buildChartOptions(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: PhysicianEvaluationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 4; y--) {
      this.years.push(y);
    }
  }

  ngOnInit(): void {
    this.departmentId = this.route.snapshot.queryParamMap.get('departmentId') || '';
    this.api.getDepartments().subscribe(home => {
      const data = home || ({} as any);
      this.canUpload = !!(data.CanUploadManualReports || data.CanUploadOvertime);
    }, () => {});
    this.api.getPhysicians(this.departmentId).subscribe(rows => {
      this.physicians = rows || [];
      this.ensurePhysicianOption();
    }, () => {});
    this.physicianSub = this.route.paramMap.subscribe(params => {
      const nextId = params.get('physicianId') || '';
      this.physicianId = nextId;
      if (nextId && nextId !== this.loadedPhysicianId) {
        this.loadSummary();
      }
    });
  }

  ngAfterViewChecked(): void {
    this.fitCharts();
  }

  ngOnDestroy(): void {
    if (this.physicianSub) {
      this.physicianSub.unsubscribe();
    }
  }

  backToList(): void {
    if (this.departmentId) {
      this.router.navigate(['/physician-evaluation-dashboard/department', this.departmentId]);
      return;
    }
    this.router.navigate(['/physician-evaluation-dashboard/physicians']);
  }

  onPhysicianChange(nextId: string): void {
    const current = this.route.snapshot.paramMap.get('physicianId');
    if (!nextId || nextId === current) {
      return;
    }
    const queryParams = this.departmentId ? { departmentId: this.departmentId } : {};
    this.router.navigate(['/physician-evaluation-dashboard/physician', nextId], { queryParams: queryParams });
  }

  onYearChange(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    if (!this.physicianId) {
      return;
    }
    this.summaryLoading = true;
    const requestedId = this.physicianId;
    this.api.getSummary(requestedId, Number(this.year)).subscribe(data => {
      if (requestedId !== this.physicianId) {
        return;
      }
      this.summaryLoading = false;
      if (!data || !data.Allowed) {
        this.summary = null;
        this.openSnackBar('אין הרשאה לצפות ברופא זה');
        return;
      }
      this.loadedPhysicianId = requestedId;
      this.summary = data;
      this.ensurePhysicianOption();
      this.overtimeChart = this.buildChart(data.Overtime);
      this.manualChart = this.buildChart(data.ManualReports);
      this.overtimeOptions = this.buildChartOptions(this.seriesMax(data.Overtime));
      this.manualOptions = this.buildChartOptions(this.seriesMax(data.ManualReports));
      this.activityRows = this.buildActivity(data);
    }, () => {
      this.summaryLoading = false;
      this.openSnackBar('לא ניתן לטעון את לוח הבקרה');
    });
  }

  openInquiries(quarter: number): void {
    this.api.getInquiries(this.physicianId, Number(this.year), quarter).subscribe(rows => {
      this.dialog.open(InquiryDetailsDialogComponent, {
        width: '720px',
        maxWidth: '96vw',
        panelClass: 'pe-inquiry-dialog',
        backdropClass: 'pe-inquiry-backdrop',
        data: {
          quarter: quarter,
          rows: rows || [],
          sourcePending: !!(this.summary && this.summary.InquiriesSourcePending)
        }
      });
    }, () => {
      this.openSnackBar('לא ניתן לטעון את פירוט הפניות');
    });
  }

  chartSeriesEmpty(months: MonthValue[], updatedAt: string): boolean {
    return this.seriesMax(months) <= 0 && !(updatedAt || '').trim();
  }

  inquiriesEmpty(): boolean {
    const rows = this.summary && this.summary.Inquiries;
    if (!rows || !rows.length) {
      return true;
    }
    return rows.every(row => !row.Thanks && !row.Complaints);
  }

  activityEmpty(): boolean {
    if (!this.activityRows.length) {
      return true;
    }
    return this.activityRows.every(row => !row.total && row.values.every(value => !value));
  }

  chartCaption(months: MonthValue[], unit: string): string {
    if (!months) {
      return '';
    }
    return months.map(m => this.monthLabels[m.Month - 1] + ' ' + m.Value + ' ' + unit).join(', ');
  }

  private fitCharts(): void {
    const el = this.chartCard && this.chartCard.nativeElement;
    if (!el) {
      return;
    }
    const width = Math.max(280, Math.floor(el.clientWidth - 32));
    if (width !== this.chartWidth) {
      this.chartWidth = width;
    }
  }

  private ensurePhysicianOption(): void {
    if (!this.physicianId) {
      return;
    }
    const exists = this.physicians.some(p => p.EmployeeID === this.physicianId);
    if (exists) {
      return;
    }
    this.physicians = [{
      EmployeeID: this.physicianId,
      FullName: (this.summary && this.summary.PhysicianName) || this.physicianId,
      DepartmentId: this.departmentId,
      DepartmentName: ''
    }].concat(this.physicians);
  }

  private seriesMax(months: MonthValue[]): number {
    let max = 0;
    (months || []).forEach(item => {
      const value = Number(item && item.Value || 0);
      if (value > max) {
        max = value;
      }
    });
    return max;
  }

  private buildChartOptions(maxValue: number): any {
    const viewWindow: { min: number; max?: number } = { min: 0 };
    if (maxValue <= 0) {
      viewWindow.max = 4;
    }
    return {
      legend: { position: 'none' },
      colors: ['#0891B2'],
      backgroundColor: 'transparent',
      hAxis: { direction: -1, textStyle: { color: '#64748B', fontSize: 11 } },
      vAxis: {
        minValue: 0,
        baseline: 0,
        viewWindowMode: maxValue <= 0 ? 'explicit' : 'pretty',
        viewWindow: viewWindow,
        format: '0',
        textStyle: { color: '#64748B', fontSize: 11 },
        gridlines: { color: 'rgba(15, 23, 42, 0.08)' },
        baselineColor: '#CBD5E1'
      },
      chartArea: { width: '82%', height: '68%', left: 48, right: 12, top: 12, bottom: 40 },
      bar: { groupWidth: '58%' },
      tooltip: { textStyle: { color: '#1E293B', fontSize: 13 } }
    };
  }

  private buildChart(months: MonthValue[]): any[] {
    const byMonth = {};
    (months || []).forEach(m => { byMonth[m.Month] = Number(m.Value || 0); });
    return this.monthLabels.map((label, index) => [label, byMonth[index + 1] || 0]);
  }

  private buildActivity(summary: DashboardSummary): { label: string; values: number[]; total: number }[] {
    const metrics: { key: keyof ActivityMonth; label: string }[] = [
      { key: 'Admissions', label: 'כמות קבלות' },
      { key: 'Discharges', label: 'שחרורים' },
      { key: 'PrimarySurgeries', label: 'ניתוחים כמנתח ראשי' },
      { key: 'SecondarySurgeries', label: 'ניתוחים כמנתח משני' }
    ];
    return metrics.map(metric => {
      const values = [];
      for (let month = 1; month <= 12; month++) {
        const found = (summary.Activity || []).find(item => item.Month === month);
        values.push(found ? Number(found[metric.key] || 0) : 0);
      }
      const total = summary.ActivityTotal ? Number(summary.ActivityTotal[metric.key] || 0) : 0;
      return { label: metric.label, values: values, total: total };
    });
  }

  private openSnackBar(message: string): void {
    this.snackBar.open(message, 'סגור', {
      duration: 4000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }
}
