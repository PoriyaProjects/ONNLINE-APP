import { Component, OnInit } from '@angular/core';
import { DpEmployeeDetail, DpHistory, DpPermission, DpProfile } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { daysUntil, displayStatus, formatDay, formatStamp, statusClass, statusLabel, waitDays } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-my',
  templateUrl: './dp-my.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpMyComponent implements OnInit {
  loading = true;
  error = '';
  detail: DpEmployeeDetail;
  history: DpHistory[] = [];
  historyOpen = false;
  historyLoading = false;
  historyError = '';
  profileFilter = 0;
  permFilter = '';
  label = statusLabel;
  chip = statusClass;
  shown = displayStatus;
  day = formatDay;
  stamp = formatStamp;
  readonly filters = [
    { key: '', label: 'הכל' },
    { key: 'active', label: 'פעילות' },
    { key: 'expiring', label: 'עומדות לפוג' },
    { key: 'pending', label: 'ממתינות' },
    { key: 'rejected', label: 'נדחו' },
    { key: 'expired', label: 'פגו' },
    { key: 'renewal', label: 'חידוש בתהליך' },
  ];

  constructor(private service: DoctorPermissionsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.mine().subscribe(
      (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.error = 'לא ניתן לטעון את ההרשאות שלך כרגע.';
      }
    );
  }

  employee(): any {
    return this.detail && this.detail.employee;
  }

  activeProfiles(): DpProfile[] {
    return ((this.detail && this.detail.profiles) || []).filter((row) => row.isActive);
  }

  closedProfiles(): DpProfile[] {
    return ((this.detail && this.detail.profiles) || []).filter((row) => !row.isActive);
  }

  shownProfiles(closed: boolean): DpProfile[] {
    const rows = closed ? this.closedProfiles() : this.activeProfiles();
    if (!this.profileFilter) {
      return rows;
    }
    return rows.filter((row) => row.id === this.profileFilter);
  }

  summary(): any {
    const perms: DpPermission[] = [];
    this.activeProfiles().forEach((row) => (row.permissions || []).forEach((perm) => perms.push(perm)));
    return {
      profiles: this.activeProfiles().length,
      active: perms.filter((perm) => perm.isCurrent).length,
      pending: perms.filter((perm) => perm.status === 'PENDING_APPROVAL').length,
      expiring: perms.filter((perm) => perm.isExpiring).length,
      rejected: perms.filter((perm) => perm.status === 'REJECTED').length,
      expired: perms.filter((perm) => perm.isExpired).length,
    };
  }

  counts(profile: DpProfile): any {
    const perms = (profile && profile.permissions) || [];
    return {
      active: perms.filter((perm) => perm.isCurrent).length,
      pending: perms.filter((perm) => perm.status === 'PENDING_APPROVAL').length,
    };
  }

  healthy(): boolean {
    const totals = this.summary();
    return !!(totals.active && !totals.pending && !totals.rejected && !totals.expiring && !totals.expired);
  }

  visiblePermissions(profile: DpProfile): DpPermission[] {
    return ((profile && profile.permissions) || []).filter((perm) => this.matches(perm));
  }

  remain(perm: DpPermission): number {
    if (!perm || !perm.isCurrent || !perm.expirationDate) {
      return 0;
    }
    const days = daysUntil(perm.expirationDate);
    return days > 0 ? days : 0;
  }

  waiting(perm: DpPermission): number {
    if (!perm || perm.status !== 'PENDING_APPROVAL') {
      return 0;
    }
    return waitDays(perm.submittedAt || perm.createdAt);
  }

  rejectReason(perm: DpPermission): string {
    const reason = ((perm && (perm.rejectionReason || perm.priorRejectComment)) || '').trim();
    return reason || 'לא צוינה סיבת דחייה.';
  }

  rejectActor(perm: DpPermission): string {
    const name = ((perm && (perm.rejectedByName || perm.priorRejectByName)) || '').trim();
    return name || 'משתמש מערכת';
  }

  openRenewal(perm: DpPermission): boolean {
    return !!perm && (perm.renewalChildStatus === 'PENDING_APPROVAL' || perm.renewalChildStatus === 'DRAFT');
  }

  toggleHistory(): void {
    this.historyOpen = !this.historyOpen;
    if (!this.historyOpen || this.history.length || this.historyLoading || !this.employee()) {
      return;
    }
    this.historyLoading = true;
    this.historyError = '';
    this.service.history(this.employee().employeeId, { facing: true, skip: 0, take: 50 }).subscribe(
      (page) => {
        this.history = (page && page.rows) || [];
        this.historyLoading = false;
      },
      () => {
        this.historyLoading = false;
        this.historyError = 'לא ניתן לטעון את ההרשאות שלך כרגע.';
      }
    );
  }

  private matches(perm: DpPermission): boolean {
    if (!perm) {
      return false;
    }
    if (this.permFilter === 'active') {
      return !!perm.isCurrent;
    }
    if (this.permFilter === 'expiring') {
      return !!perm.isExpiring;
    }
    if (this.permFilter === 'pending') {
      return perm.status === 'PENDING_APPROVAL';
    }
    if (this.permFilter === 'rejected') {
      return perm.status === 'REJECTED';
    }
    if (this.permFilter === 'expired') {
      return !!perm.isExpired;
    }
    if (this.permFilter === 'renewal') {
      return this.openRenewal(perm) || perm.renewalChildStatus === 'REJECTED';
    }
    if (perm.renewalSourceId && !perm.isCurrent) {
      return false;
    }
    return perm.renewalChildStatus !== 'APPROVED' && perm.renewalChildStatus !== 'EXPIRED';
  }
}
