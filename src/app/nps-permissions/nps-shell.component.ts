import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NpsDashboardSummary } from './models/nps.models';
import { NpsBaseApiService } from './services/nps-base-api.service';

interface NpsNavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-nps-shell',
  templateUrl: './nps-shell.component.html',
  styleUrls: ['./nps-shell.component.scss'],
})
export class NpsShellComponent implements OnInit {
  /**
   * Sidenav links — default to employee-safe set until `NpsGetAccessContext` returns
   * (then managers/admins get the full list).
   */
  navItems: NpsNavItem[] = [
    // { path: '/nps-permissions/dashboard', label: 'לוח בקרה', icon: 'space_dashboard', exact: true },
    { path: '/nps-permissions/my-requests', label: 'אישורי הרשאות', icon: 'fact_check' },
  ];

  private readonly employeeNavItems: NpsNavItem[] = [
    // { path: '/nps-permissions/dashboard', label: 'לוח בקרה', icon: 'space_dashboard', exact: true },
    { path: '/nps-permissions/my-requests', label: 'אישורי הרשאות', icon: 'fact_check' },
    { path: '/nps-permissions/manager-permission-grants', label: 'הרשאות מנהל', icon: 'person_add' },
  ];

  private readonly fullNavItems: NpsNavItem[] = [
    // { path: '/nps-permissions/dashboard', label: 'לוח בקרה', icon: 'space_dashboard', exact: true },
    { path: '/nps-permissions/profiles', label: 'פרופילים', icon: 'badge' },
    { path: '/nps-permissions/actions', label: 'קבוצות', icon: 'widgets' },
    { path: '/nps-permissions/permissions', label: 'פעולות', icon: 'lock' },
    { path: '/nps-permissions/profile-rules', label: 'כללי פרופיל', icon: 'rule' },
    { path: '/nps-permissions/my-requests', label: 'אישורי הרשאות', icon: 'fact_check' },
    { path: '/nps-permissions/manager-permission-grants', label: 'הרשאות מנהל', icon: 'person_add' },
  ];
  summary: NpsDashboardSummary | null = null;
  private readonly employeeId = localStorage.getItem('ID') || '';

  constructor(private router: Router, private api: NpsBaseApiService) {}

  ngOnInit(): void {
    this.api.getAccessContext(this.employeeId).subscribe(
      (ctx) => {
        this.navItems = ctx.canAccessNpsConfiguration ? [...this.fullNavItems] : [...this.employeeNavItems];
      },
      () => {
        this.navItems = [...this.employeeNavItems];
      },
    );
    this.api.getDashboardSummary(this.employeeId).subscribe(
      (s) => (this.summary = s),
      () => (this.summary = null),
    );
  }

  get currentPageLabel(): string {
    const url = this.router.url || '';
    const match = this.fullNavItems.find((item) => url.startsWith(item.path));
    return match?.label || 'ניהול הרשאות NPS';
  }
}
