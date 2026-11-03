import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess, DpCatalogItem, DpDashboard, DpGap } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatDay, formatStamp, statusClass, statusLabel } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-dashboard',
  templateUrl: './dp-dashboard.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
  styles: [`
    button.dp-count {
      appearance: none;
      border: 0;
      background: #eef2ff;
      color: #312e81;
      min-width: 40px;
      height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      font: inherit;
      font-weight: 700;
      line-height: 32px;
      cursor: pointer;
    }
    button.dp-count:hover { background: #e0e7ff; }
    button.dp-kpi {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 10px 20px -4px rgba(15, 23, 42, 0.1);
      transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    button.dp-kpi:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.14);
    }
    button.dp-kpi .material-icons {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin-bottom: 4px;
      border-radius: 10px;
      background: rgba(100, 116, 139, 0.14);
      color: #475569;
      font-size: 20px;
    }
    button.dp-kpi.dp-kpi--ok .material-icons { background: rgba(21, 128, 61, 0.12); color: #15803d; }
    button.dp-kpi.dp-kpi--wait .material-icons { background: rgba(217, 119, 6, 0.14); color: #b45309; }
    button.dp-kpi.dp-kpi--bad .material-icons { background: rgba(185, 28, 28, 0.12); color: #b91c1c; }
    button.dp-kpi.dp-kpi--slate .material-icons { background: rgba(100, 116, 139, 0.14); color: #475569; }
    button.dp-kpi.dp-kpi--active {
      outline: none;
      border-color: #3f51b5;
      box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.25);
    }
    button.dp-kpi strong { font-size: 28px; line-height: 1.1; }
    button.dp-kpi span { color: #64748b; font-size: 13px; }
  `],
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
  activity = 'active';
  metric = 'active';
  expFrom = '';
  expTo = '';
  skip = 0;
  label = statusLabel;
  chip = statusClass;
  day = formatDay;
  stamp = formatStamp;
  readonly cards = [
    { key: 'activeEmployees', label: 'עובדים עם פרופיל פעיל', field: 'activeEmployees', icon: 'person', tone: 'slate' },
    { key: 'active', label: 'שיוכים פעילים', field: 'activePermissions', icon: 'check_circle', tone: 'ok' },
    { key: 'pending', label: 'ממתינים לחתימה', field: 'pendingApprovals', icon: 'hourglass_empty', tone: 'wait' },
    { key: 'inactive', label: 'שיוכים לא פעילים', field: 'expiredPermissions', icon: 'event_busy', tone: 'bad' },
    { key: 'delayed', label: 'חתימות בעיכוב', field: 'delayedApprovals', icon: 'schedule', tone: 'wait' },
  ];
  readonly metrics = [
    { key: 'active', label: 'שיוכים פעילים' },
    { key: 'pending', label: 'ממתינים לחתימה' },
    { key: 'delayed', label: 'חתימות בעיכוב' },
  ];
  readonly activities = [
    { key: 'active', label: 'פעיל' },
    { key: 'inactive', label: 'לא פעיל' },
    { key: 'all', label: 'הכל' },
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
      this.activity = this.normalizeActivity(params.get('activity'));
      this.metric = params.get('metric') || 'active';
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
      metric: this.metric === 'activeEmployees' ? 'active' : this.metric,
      status: this.activity,
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
      queryParams: this.searchQuery(this.departnentCode, key),
    });
  }

  gap(row: DpGap, metric: string): void {
    this.router.navigate(['/doctors-permissions/search'], {
      queryParams: this.searchQuery(row.departnentCode, metric),
    });
  }

  private searchQuery(departnentCode: string, key: string): any {
    const activity = key === 'inactive' ? 'inactive' : this.activity;
    return {
      departnentCode: departnentCode || null,
      status: key === 'activeEmployees' || key === 'active' ? null : key,
      activity: activity === 'active' ? null : activity,
    };
  }

  private normalizeActivity(value: string): string {
    if (value === 'inactive' || value === 'all') {
      return value;
    }
    return 'active';
  }

  onActivity(value: string): void {
    this.activity = this.normalizeActivity(value);
    this.apply();
  }

  apply(): void {
    this.skip = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        metric: this.metric,
        activity: this.activity === 'active' ? null : this.activity,
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
