import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpAccess, DpRole, DpRule, DpSettings } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp } from '../../utils/dp-status';
@Component({
  selector: 'app-dp-settings',
  templateUrl: './dp-settings.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpSettingsComponent implements OnInit {
  access: DpAccess;
  data: DpSettings;
  loading = true;
  error = '';
  role: any = { employeeId: '', roleCode: 'DEPARTMENT_MANAGER', departnentCode: '', isActive: true, kind: 'role' };
  delayDays = 14;
  savedDelay = 14;
  savingDelay = false;
  delayError = '';
  updatedAt = '';
  updatedByName = '';
  stamp = formatStamp;

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.settings().subscribe(
      (data) => {
        this.data = data;
        const days = Number(data.approvalDelayWarningDays);
        this.delayDays = data.approvalDelayWarningDays == null || days < 0 || days > 365 ? 14 : days;
        this.savedDelay = this.delayDays;
        this.updatedAt = data.updatedAt || '';
        this.updatedByName = data.updatedByName || '';
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = err.message;
      }
    );
  }

  saveRole(): void {
    this.service.saveRole(this.role).subscribe(
      () => {
        this.snack.open('ההרשאה נשמרה', 'סגור', { duration: 2000 });
        this.role = { employeeId: '', roleCode: 'DEPARTMENT_MANAGER', departnentCode: '', isActive: true, kind: 'role' };
        this.load();
      },
      (err) => (this.error = err.message)
    );
  }

  deactivate(row: DpRole): void {
    this.service.saveRole({
      kind: 'role', id: row.id, employeeId: row.employeeId, roleCode: row.roleCode, departnentCode: row.departnentCode, isActive: !row.isActive,
    }).subscribe(
      () => this.load(),
      (err) => (this.error = err.message)
    );
  }

  saveRule(row: DpRule): void {
    this.service.saveRole({ kind: 'rule', id: row.id, dayOffset: Number(row.dayOffset), isActive: row.isActive, channel: row.channel }).subscribe(
      () => this.snack.open('כלל התזכורת עודכן', 'סגור', { duration: 2000 }),
      (err) => (this.error = err.message)
    );
  }

  dirtyDelay(): boolean {
    return Number(this.delayDays) !== this.savedDelay;
  }

  cancelDelay(): void {
    this.delayDays = this.savedDelay;
    this.delayError = '';
  }

  saveDelay(): void {
    const days = Number(this.delayDays);
    if (this.delayDays === null || this.delayDays === undefined || ('' + this.delayDays) === '' || days !== Math.floor(days) || days < 0 || days > 365) {
      this.delayError = 'מספר הימים חייב להיות בין 0 ל-365.';
      return;
    }
    this.savingDelay = true;
    this.delayError = '';
    this.service.saveRole({ kind: 'delay', approvalDelayWarningDays: days }).subscribe(
      () => {
        this.savingDelay = false;
        this.savedDelay = days;
        this.snack.open('ההגדרות נשמרו בהצלחה.', 'סגור', { duration: 2000 });
        this.load();
      },
      (err) => {
        this.savingDelay = false;
        this.delayError = err.message;
      }
    );
  }

  ruleName(type: string): string {
    if (type === 'INITIAL_REQUEST') {
      return 'הרשאה ממתינה לאישור';
    }
    if (type === 'REMINDER') {
      return 'תזכורת: הרשאה ממתינה';
    }
    if (type === 'ESCALATION') {
      return 'הסלמה: הרשאה ממתינה';
    }
    if (type === 'RENEWAL_REQUEST') {
      return 'נפתח תהליך חידוש';
    }
    if (type === 'EXPIRY_APPROACHING') {
      return 'הרשאה עומדת לפוג';
    }
    return type;
  }
}
