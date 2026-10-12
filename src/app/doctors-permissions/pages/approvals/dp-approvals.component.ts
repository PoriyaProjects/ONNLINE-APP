import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { DpAccess, DpCatalogItem, DpPermission } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatDay, statusClass, statusLabel, waitDays } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-approvals',
  templateUrl: './dp-approvals.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpApprovalsComponent implements OnInit {
  loading = true;
  error = '';
  rows: DpPermission[] = [];
  selected: { [id: number]: boolean } = {};
  rejectId = 0;
  reason = '';
  busyId = 0;
  bulkBusy = false;
  detailsId = 0;
  skip = 0;
  total = 0;
  q = '';
  departnentCode = '';
  permissionId = 0;
  profileName = '';
  waitRange = '';
  kind = '';
  access: DpAccess;
  catalog: DpCatalogItem[] = [];
  readonly pageSize = 50;
  label = statusLabel;
  chip = statusClass;
  day = formatDay;

  constructor(
    private service: DoctorPermissionsService,
    private snack: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.departnentCode = this.route.snapshot.queryParamMap.get('departnentCode') || '';
    this.q = this.route.snapshot.queryParamMap.get('q') || '';
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.service.catalog().subscribe((rows) => (this.catalog = rows || []));
    this.load();
  }

  apply(): void {
    if (this.busyId || this.bulkBusy) {
      return;
    }
    this.skip = 0;
    this.selected = {};
    this.load();
  }

  reset(): void {
    this.q = '';
    this.departnentCode = '';
    this.permissionId = 0;
    this.profileName = '';
    this.waitRange = '';
    this.kind = '';
    this.apply();
  }

  filtered(): boolean {
    return !!(this.q || this.departnentCode || this.permissionId || this.profileName || this.waitRange || this.kind);
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.fetchPage(false, false);
  }

  approve(id: number): void {
    if (this.busyId || this.bulkBusy) {
      return;
    }
    this.busyId = id;
    this.service.approve(id).subscribe(
      () => {
        this.snack.open('ההרשאה אושרה בהצלחה.', 'סגור', { duration: 2000 });
        this.fetchPage(true, false);
      },
      (err) => {
        this.error = err.message;
        this.fetchPage(true, true);
      }
    );
  }

  confirmReject(): void {
    const reason = (this.reason || '').trim();
    if (this.busyId || this.bulkBusy) {
      return;
    }
    if (!reason) {
      this.error = 'יש להזין סיבת דחייה.';
      return;
    }
    this.busyId = this.rejectId;
    this.service.reject(this.rejectId, reason).subscribe(
      () => {
        this.rejectId = 0;
        this.reason = '';
        this.snack.open('ההרשאה נדחתה.', 'סגור', { duration: 2000 });
        this.fetchPage(true, false);
      },
      (err) => {
        this.error = err.message;
        this.fetchPage(true, true);
      }
    );
  }

  bulk(): void {
    if (this.busyId || this.bulkBusy) {
      return;
    }
    const ids = this.rows.filter((row) => this.selected[row.id]).map((row) => row.id);
    if (!ids.length || !confirm('לאשר ' + ids.length + ' הרשאות שנבחרו?')) {
      return;
    }
    this.bulkBusy = true;
    this.service.bulkApprove(ids).subscribe(
      (result) => {
        const approved = result && result.approved ? result.approved.length : 0;
        const failed = result && result.failed ? result.failed.length : 0;
        const text = failed ? 'אושרו ' + approved + '. כבר טופלו ' + failed : 'אושרו ' + approved;
        this.snack.open(text, 'סגור', { duration: 2500 });
        this.selected = {};
        this.fetchPage(true, false);
      },
      (err) => {
        this.error = err.message;
        this.selected = {};
        this.fetchPage(true, true);
      }
    );
  }

  rejectRow(): DpPermission {
    const id = this.rejectId;
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i].id === id) {
        return this.rows[i];
      }
    }
    return null;
  }

  openReject(id: number): void {
    if (this.busyId || this.bulkBusy) {
      return;
    }
    this.rejectId = id;
    this.reason = '';
    this.error = '';
  }

  page(delta: number): void {
    if (this.busyId || this.bulkBusy) {
      return;
    }
    this.skip = Math.max(0, this.skip + delta);
    this.selected = {};
    this.load();
  }

  selectedCount(): number {
    return this.rows.filter((row) => this.selected[row.id]).length;
  }

  allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every((row) => this.selected[row.id]);
  }

  togglePage(checked: boolean): void {
    if (!checked) {
      this.selected = {};
      return;
    }
    this.rows.forEach((row) => (this.selected[row.id] = true));
  }

  waitText(value: string): string {
    const days = waitDays(value);
    if (days <= 0) {
      return 'היום';
    }
    if (days === 1) {
      return 'יום אחד';
    }
    return days + ' ימים';
  }

  delayDays = 14;

  delayed(value: string): boolean {
    return waitDays(value) >= this.delayDays;
  }

  roleText(row: DpPermission): string {
    return row.functionName || row.jobTitleName || '';
  }

  private bounds(): { min: number; max: number } {
    if (this.waitRange === '3') {
      return { min: 0, max: 3 };
    }
    if (this.waitRange === '7') {
      return { min: 4, max: 7 };
    }
    if (this.waitRange === '14') {
      return { min: 8, max: 14 };
    }
    if (this.waitRange === '15') {
      return { min: 15, max: 0 };
    }
    return { min: 0, max: 0 };
  }

  private fetchPage(done: boolean, keepError: boolean): void {
    if (!keepError) {
      this.error = '';
    }
    const bounds = this.bounds();
    this.service.pending(this.skip, {
      q: this.q,
      departnentCode: this.departnentCode,
      permissionId: this.permissionId,
      profileName: this.profileName,
      minWaitDays: bounds.min,
      maxWaitDays: bounds.max,
      kind: this.kind,
    }).subscribe(
      (page) => {
        this.rows = page.rows || [];
        this.total = page.total || 0;
        const days = Number(page.approvalDelayWarningDays);
        if (page.approvalDelayWarningDays != null && days >= 0 && days <= 365) {
          this.delayDays = days;
        }
        if (this.skip > 0 && !this.rows.length) {
          this.skip = Math.max(0, this.skip - this.pageSize);
          this.fetchPage(done, keepError);
          return;
        }
        this.loading = false;
        if (done) {
          this.busyId = 0;
          this.bulkBusy = false;
        }
      },
      (err) => {
        this.loading = false;
        this.busyId = 0;
        this.bulkBusy = false;
        if (!keepError) {
          this.error = err.message || 'אירעה שגיאה';
        }
      }
    );
  }
}
