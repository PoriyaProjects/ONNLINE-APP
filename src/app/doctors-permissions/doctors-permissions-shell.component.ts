import { Component, OnInit } from '@angular/core';
import { DpAccess } from './models/dp.models';
import { DoctorPermissionsService } from './services/doctor-permissions.service';

interface DpNav {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  show: (access: DpAccess) => boolean;
}

@Component({
  selector: 'app-dp-shell',
  templateUrl: './doctors-permissions-shell.component.html',
  styleUrls: ['./styles/dp.shared.scss'],
})
export class DoctorsPermissionsShellComponent implements OnInit {
  access: DpAccess;
  error = '';
  readonly nav: DpNav[] = [
    { path: 'dashboard', label: 'לוח בקרה', icon: 'fas fa-chart-pie', exact: true, show: () => true },
    { path: 'search', label: 'חיפוש עובדים', icon: 'fas fa-search', show: () => true },
    { path: 'approvals', label: 'ממתינים לאישור', icon: 'fas fa-check-circle', show: (a) => a.isAdmin || a.isDirectManager || a.isIndirectManager || a.isDepartmentManager },
    { path: 'my', label: 'ההרשאות שלי', icon: 'fas fa-user-md', show: () => true },
    { path: 'templates', label: 'תבניות', icon: 'fas fa-id-badge', show: (a) => a.isAdmin || a.isDepartmentManager },
    { path: 'catalog', label: 'קטלוג הרשאות', icon: 'fas fa-shield-alt', show: (a) => a.isAdmin },
    { path: 'hr', label: 'לוח HR', icon: 'fas fa-hospital', show: (a) => a.isAdmin },
    { path: 'organizational-changes', label: 'שינויים ארגוניים', icon: 'fas fa-exchange-alt', show: (a) => a.isAdmin },
    { path: 'notifications', label: 'התראות והודעות', icon: 'fas fa-bell', show: (a) => a.isAdmin },
    { path: 'settings', label: 'הגדרות', icon: 'fas fa-cog', show: (a) => a.isAdmin },
  ];

  constructor(private service: DoctorPermissionsService) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe(
      (access) => (this.access = access),
      (err) => (this.error = err.message || 'אירעה שגיאה')
    );
  }

  visible(item: DpNav): boolean {
    return !this.access || item.show(this.access);
  }
}
