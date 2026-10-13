import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { DpAccess, DpPermission } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp, statusClass, statusLabel, waitDays } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-approvals',
  templateUrl: './dp-approvals.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpApprovalsComponent implements OnInit {
  loading = true;
  error = '';
  rows: DpPermission[] = [];
  busyKey = '';
  skip = 0;
  total = 0;
  q = '';
  departnentCode = '';
  permissionId = 0;
  profileName = '';
  waitRange = '';
  kind = '';
  access: DpAccess;
  readonly pageSize = 50;
  label = statusLabel;
  chip = statusClass;
  stamp = formatStamp;
  wait = waitDays;

  constructor(
    private service: DoctorPermissionsService,
    private snack: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') || '';
      this.departnentCode = params.get('departnentCode') || '';
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const range = this.waitBounds();
    this.service.pending(this.skip, {
      q: this.q,
      departnentCode: this.departnentCode,
      permissionId: this.permissionId,
      profileName: this.profileName,
      minWaitDays: range.min,
      maxWaitDays: range.max,
      kind: this.kind,
    }).subscribe(
      (page) => {
        this.rows = (page && page.rows) || [];
        this.total = (page && page.total) || 0;
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = (err && err.message) || 'לא ניתן לטעון את התור.';
      }
    );
  }

  waitBounds(): { min: number; max: number } {
    if (this.waitRange === '8-14') {
      return { min: 8, max: 14 };
    }
    if (this.waitRange === '15') {
      return { min: 15, max: 0 };
    }
    return { min: 0, max: 0 };
  }

  sign(row: DpPermission, slot: string): void {
    this.busyKey = slot + row.employeeId + row.profileId;
    this.service.approve(row.employeeId, row.profileId, slot).subscribe(
      () => {
        this.busyKey = '';
        this.snack.open('החתימה נרשמה', null, { duration: 2500 });
        this.load();
      },
      (err) => {
        this.busyKey = '';
        this.snack.open((err && err.message) || 'החתימה נכשלה', null, { duration: 3000 });
      }
    );
  }

  page(delta: number): void {
    this.skip = Math.max(0, this.skip + delta);
    this.load();
  }
}
