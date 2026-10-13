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
    { path: 'dashboard', label: 'לוח בקרה', icon: 'pie_chart', exact: true, show: () => true },
    { path: 'search', label: 'חיפוש עובדים', icon: 'search', show: () => true },
    { path: 'approvals', label: 'ממתינים לחתימה', icon: 'check_circle', show: (a) => a.isAdmin || a.isDirectManager || a.isIndirectManager || a.isDepartmentManager },
    { path: 'my', label: 'ההרשאות שלי', icon: 'person', show: () => true },
    { path: 'templates', label: 'פרופילים', icon: 'assignment_ind', show: (a) => a.isAdmin || a.isDepartmentManager },
    { path: 'catalog', label: 'קטלוג הרשאות', icon: 'security', show: (a) => a.isAdmin },
    { path: 'hr', label: 'לוח HR', icon: 'local_hospital', show: (a) => a.isAdmin },
    { path: 'organizational-changes', label: 'שינויים ארגוניים', icon: 'swap_horiz', show: (a) => a.isAdmin },
    { path: 'notifications', label: 'התראות והודעות', icon: 'notifications', show: (a) => a.isAdmin },
    { path: 'settings', label: 'הגדרות', icon: 'settings', show: (a) => a.isAdmin },
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
