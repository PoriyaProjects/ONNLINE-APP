import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess, DpCatalogItem, DpDashboard, DpGap } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatDay, formatStamp, statusClass, statusLabel } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-dashboard',
  templateUrl: './dp-dashboard.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpDashboardComponent implements OnInit {
  hr = false;
  loading = true;
  error = '';
  data: DpDashboard;
  access: DpAccess;
  catalog: DpCatalogItem[] = [];
  departnentCode = '';
  managerId = '';
  permissionId = 0;
  metric = 'pending';
  expFrom = '';
  expTo = '';
  skip = 0;
  label = statusLabel;
  chip = statusClass;
  day = formatDay;
  stamp = formatStamp;
  readonly cards = [
    { key: 'activeEmployees', label: 'עובדים פעילים', field: 'activeEmployees', icon: 'fa-user-md', tone: 'slate' },
    { key: 'active', label: 'הרשאות פעילות', field: 'activePermissions', icon: 'fa-check-circle', tone: 'ok' },
    { key: 'pending', label: 'ממתינות לאישור', field: 'pendingApprovals', icon: 'fa-hourglass-half', tone: 'wait' },
    { key: 'rejected', label: 'הרשאות שנדחו', field: 'rejectedPermissions', icon: 'fa-times-circle', tone: 'bad' },
    { key: 'expiring', label: 'עומדות לפוג', field: 'expiringPermissions', icon: 'fa-exclamation-triangle', tone: 'wait' },
    { key: 'expired', label: 'הרשאות שפג תוקפן', field: 'expiredPermissions', icon: 'fa-calendar-times', tone: 'bad' },
    { key: 'delayed', label: 'אישורים בעיכוב', field: 'delayedApprovals', icon: 'fa-clock', tone: 'wait' },
  ];
  readonly metrics = [
    { key: 'pending', label: 'ממתינות לאישור' },
    { key: 'active', label: 'הרשאות פעילות' },
    { key: 'rejected', label: 'הרשאות שנדחו' },
    { key: 'expiring', label: 'עומדות לפוג' },
    { key: 'expired', label: 'הרשאות שפג תוקפן' },
    { key: 'delayed', label: 'אישורים בעיכוב' },
  ];

  constructor(
    private service: DoctorPermissionsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.hr = this.route.snapshot.data.hr === true;
    this.service.loadAccess().subscribe((access) => {
      this.access = access;
      if (this.hr) {
        this.service.catalog().subscribe((rows) => (this.catalog = rows || []));
      }
    });
    this.route.queryParamMap.subscribe((params) => {
      this.metric = params.get('metric') || 'pending';
      this.departnentCode = params.get('departnentCode') || '';
      this.managerId = params.get('managerId') || '';
      this.permissionId = Number(params.get('permissionId') || 0);
      this.expFrom = params.get('expFrom') || '';
      this.expTo = params.get('expTo') || '';
      this.skip = 0;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.dashboard({
      departnentCode: this.departnentCode,
      managerId: this.managerId,
      permissionId: this.permissionId,
      metric: this.metric === 'activeEmployees' ? '' : this.metric,
      status: '',
      expFrom: this.expFrom,
      expTo: this.expTo,
      skip: this.skip,
      take: 25,
    }).subscribe(
      (data) => {
        this.data = data;
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = err.message || 'אירעה שגיאה';
      }
    );
  }

  selectMetric(key: string): void {
    if (key === 'pending') {
      this.router.navigate(['/doctors-permissions/approvals'], {
        queryParams: { departnentCode: this.departnentCode || null },
      });
      return;
    }
    this.router.navigate(['/doctors-permissions/search'], {
      queryParams: {
        departnentCode: this.departnentCode || null,
        status: key === 'activeEmployees' ? null : key,
      },
    });
  }

  gap(row: DpGap, metric: string): void {
    this.router.navigate(['/doctors-permissions/search'], {
      queryParams: {
        departnentCode: row.departnentCode,
        status: metric === 'activeEmployees' ? null : metric,
      },
    });
  }

  apply(): void {
    this.skip = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        metric: this.metric,
        departnentCode: this.departnentCode || null,
        managerId: this.managerId || null,
        permissionId: this.permissionId || null,
        expFrom: this.expFrom || null,
        expTo: this.expTo || null,
      },
    });
  }

  kpiValue(field: string): number {
    if (!this.data || !this.data.kpis) {
      return 0;
    }
    return (this.data.kpis as any)[field] || 0;
  }

  emptyBoard(): boolean {
    const kpis = this.data && this.data.kpis;
    if (!kpis) {
      return false;
    }
    return !kpis.activeEmployees && !kpis.activePermissions && !kpis.pendingApprovals
      && !kpis.rejectedPermissions && !kpis.expiringPermissions && !kpis.expiredPermissions && !kpis.delayedApprovals;
  }

  page(delta: number): void {
    this.skip = Math.max(0, this.skip + delta);
    this.load();
  }
}
