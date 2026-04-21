import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
export class NpsShellComponent {
  readonly navItems: NpsNavItem[] = [
    { path: '/nps-permissions/dashboard', label: 'לוח בקרה', icon: 'space_dashboard', exact: true },
    { path: '/nps-permissions/profiles', label: 'פרופילים', icon: 'badge' },
    { path: '/nps-permissions/actions', label: 'קבוצות', icon: 'widgets' },
    { path: '/nps-permissions/permissions', label: 'פעולות', icon: 'lock' },
    { path: '/nps-permissions/profile-rules', label: 'כללי פרופיל', icon: 'rule' },
    { path: '/nps-permissions/employee-assignments', label: 'שיוכי עובדים', icon: 'assignment_ind' },
    { path: '/nps-permissions/requests', label: 'בקשות', icon: 'assignment' },
    { path: '/nps-permissions/my-approvals', label: 'אישורים שלי', icon: 'how_to_reg' },
    { path: '/nps-permissions/my-requests', label: 'הבקשות שלי', icon: 'fact_check' },
    { path: '/nps-permissions/audit', label: 'יומן ביקורת', icon: 'history' },
  ];

  constructor(private router: Router) {}

  get currentPageLabel(): string {
    const url = this.router.url || '';
    const match = this.navItems.find((item) => url.startsWith(item.path));
    return match?.label || 'ניהול הרשאות NPS';
  }
}
