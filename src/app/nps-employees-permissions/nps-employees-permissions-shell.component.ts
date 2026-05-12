import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsDashboardSummary } from './models/nps.models';
import { NpsEmployeesPermissionsApiService } from './services/nps-employees-permissions-api.service';

/** Absolute app path for this lazy-loaded feature (matches `app.routing` path). */
const NPS_EMPLOYEES_PERMISSIONS_BASE = '/nps-employees-permissions';

interface NpsNavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-nps-employees-permissions-shell',
  templateUrl: './nps-employees-permissions-shell.component.html',
  styleUrls: ['./nps-employees-permissions-shell.component.scss'],
})
export class NpsEmployeesPermissionsShellComponent implements OnInit {
  /**
   * Sidenav links — default to employee-safe set until `NpsGetAccessContext` returns
   * (then managers/admins get the full list).
   */
  navItems: NpsNavItem[] = [{ path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/my-requests`, label: 'אישורי הרשאות', icon: 'fact_check' }];

  private readonly employeeNavItems: NpsNavItem[] = [
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/my-requests`, label: 'אישורי הרשאות', icon: 'fact_check' },
  ];

  private readonly fullNavItems: NpsNavItem[] = [
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/profiles`, label: 'פרופילים', icon: 'badge' },
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/actions`, label: 'קבוצות', icon: 'widgets' },
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/permissions`, label: 'פעולות', icon: 'lock' },
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/profile-rules`, label: 'כללי פרופיל', icon: 'rule' },
    { path: `${NPS_EMPLOYEES_PERMISSIONS_BASE}/my-requests`, label: 'אישורי הרשאות', icon: 'fact_check' },
  ];
  summary: NpsDashboardSummary | null = null;
  private readonly employeeId = localStorage.getItem('ID') || '';

  constructor(private router: Router, private api: NpsEmployeesPermissionsApiService) {}

  ngOnInit(): void {
    this.applyNavigationFromAccessContext();
    this.loadDashboardSummary();
  }

  get currentPageLabel(): string {
    const url = this.router.url || '';
    const match = this.navItems.find((item) => url.startsWith(item.path));
    return match?.label || 'ניהול הרשאות NPS';
  }

  private applyNavigationFromAccessContext(): void {
    this.api.getAccessContext(this.employeeId).subscribe(
      (ctx) => {
        this.navItems = ctx.canAccessNpsConfiguration ? [...this.fullNavItems] : [...this.employeeNavItems];
      },
      () => {
        this.navItems = [...this.employeeNavItems];
      },
    );
  }

  private loadDashboardSummary(): void {
    this.api.getDashboardSummary(this.employeeId).subscribe(
      (s) => (this.summary = s),
      () => (this.summary = null),
    );
  }
}
