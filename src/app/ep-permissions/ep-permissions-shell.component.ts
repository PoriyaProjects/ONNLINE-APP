import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EpUserRole } from './models/nurse-permissions.models';
import { NursePermissionsService } from './services/nurse-permissions.service';

interface EpNavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  adminOnly?: boolean;
  roles?: EpUserRole[];
}

@Component({
  selector: 'app-ep-permissions-shell',
  templateUrl: './ep-permissions-shell.component.html',
  styleUrls: ['./ep-permissions-shell.component.scss'],
})
export class EpPermissionsShellComponent implements OnInit {
  readonly navItems: EpNavItem[] = [
    { path: '/ep-permissions/dashboard', label: 'לוח בקרה', icon: 'dashboard', exact: true },
    {
      path: '/ep-permissions/bulk-grant',
      label: 'הענקת הרשאות',
      icon: 'playlist_add_check',
      roles: ['Admin', 'DirectManager'],
    },
    { path: '/ep-permissions/admin', label: 'הגדרות מערכת', icon: 'settings', adminOnly: true },
  ];

  userRole: EpUserRole = 'Employee';
  availableRoles: EpUserRole[] = [];
  userName: string = localStorage.getItem('FirstName') + ' ' + localStorage.getItem('LastName') || '';

  constructor(private service: NursePermissionsService, private router: Router) { }

  ngOnInit(): void {
    this.service.userRoleChanges.subscribe((role) => (this.userRole = role));
    this.service.availableRolesChanges.subscribe((roles) => (this.availableRoles = roles || []));
    this.service.getDashboardSummary().subscribe(
      () => { },
      () => { },
    );
  }

  get showRoleSelector(): boolean {
    return this.availableRoles.length > 1;
  }

  isActiveRole(role: EpUserRole): boolean {
    return this.userRole === role;
  }

  selectRole(role: EpUserRole): void {
    if (this.userRole === role) {
      return;
    }

    this.service.selectRole(role);
    this.router.navigate(['/ep-permissions/dashboard']);
  }

  getRoleLabel(role: EpUserRole): EpUserRole {
    switch (role) {
      case 'Admin':
        return 'מנהל על';
      case 'DirectManager':
        return 'מנהל ישיר';
      case 'IndirectManager':
        return 'מנהל עקיף';
      case 'Employee':
        return 'עובד';
    }
    return role;
  }

  showNavItem(item: EpNavItem): boolean {
    if (item.roles && item.roles.length) {
      return item.roles.indexOf(this.userRole) >= 0;
    }

    if (item.adminOnly) {
      return this.userRole === 'Admin';
    }

    return true;
  }

  getUserRole(): EpUserRole {
    return this.getRoleLabel(this.userRole);
  }
}
