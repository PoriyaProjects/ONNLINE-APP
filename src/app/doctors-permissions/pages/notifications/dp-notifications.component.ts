import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-notifications',
  templateUrl: './dp-notifications.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpNotificationsComponent implements OnInit {
  loading = true;
  loaded = false;
  error = '';
  rows: any[] = [];
  total = 0;
  skip = 0;
  queued = 0;
  sent = 0;
  failed = 0;
  sentToday = 0;
  channel = '';
  status = '';
  eventType = '';
  fromDate = '';
  toDate = '';
  q = '';
  openId = 0;
  busyId = 0;
  readonly pageSize = 50;
  stamp = formatStamp;
  readonly channels = [
    { key: '', label: 'הכל' },
    { key: 'EMAIL', label: 'דוא"ל' },
    { key: 'SMS', label: 'SMS' },
  ];
  readonly statuses = [
    { key: '', label: 'הכל' },
    { key: 'QUEUED', label: 'ממתין לשליחה' },
    { key: 'SENT', label: 'נשלח' },
    { key: 'FAILED', label: 'נכשל' },
    { key: 'SKIPPED', label: 'דולג' },
  ];
  readonly events = [
    { key: '', label: 'הכל' },
    { key: 'INITIAL_REQUEST', label: 'הרשאה ממתינה לאישור' },
    { key: 'REMINDER', label: 'תזכורת: הרשאה ממתינה' },
    { key: 'ESCALATION', label: 'הסלמה: הרשאה ממתינה' },
    { key: 'RENEWAL_REQUEST', label: 'נפתח תהליך חידוש' },
    { key: 'EXPIRY_APPROACHING', label: 'הרשאה עומדת לפוג' },
  ];

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.notifications({
      q: (this.q || '').trim(),
      channel: this.channel,
      status: this.status,
      eventType: this.eventType,
      fromDate: this.fromDate,
      toDate: this.toDate,
      skip: this.skip,
      take: this.pageSize,
    }).subscribe(
      (page) => {
        this.rows = (page && page.rows) || [];
        this.total = (page && page.total) || 0;
        this.queued = (page && page.queued) || 0;
        this.sent = (page && page.sent) || 0;
        this.failed = (page && page.failed) || 0;
        this.sentToday = (page && page.sentToday) || 0;
        this.loaded = true;
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.error = 'לא ניתן לטעון את ההתראות כרגע.';
      }
    );
  }

  apply(): void {
    this.skip = 0;
    this.load();
  }

  showFailed(): void {
    this.status = 'FAILED';
    this.apply();
  }

  filtered(): boolean {
    return !!(this.channel || this.status || this.eventType || this.fromDate || this.toDate || (this.q || '').trim());
  }

  clear(): void {
    this.channel = '';
    this.status = '';
    this.eventType = '';
    this.fromDate = '';
    this.toDate = '';
    this.q = '';
    this.skip = 0;
    this.load();
  }

  page(delta: number): void {
    const next = this.skip + delta;
    if (next < 0 || next >= this.total) {
      return;
    }
    this.skip = next;
    this.load();
  }

  eventLabel(value: string): string {
    const row = this.events.filter((item) => item.key === value)[0];
    return row ? row.label : value || '';
  }

  channelLabel(value: string): string {
    return value === 'EMAIL' ? 'דוא"ל' : value === 'SMS' ? 'SMS' : value || '';
  }

  statusLabel(value: string): string {
    const row = this.statuses.filter((item) => item.key === value)[0];
    return row ? row.label : value || '';
  }

  statusClass(value: string): string {
    if (value === 'SENT') {
      return 'dp-chip dp-chip--ok';
    }
    if (value === 'QUEUED') {
      return 'dp-chip dp-chip--wait';
    }
    if (value === 'FAILED') {
      return 'dp-chip dp-chip--bad';
    }
    return 'dp-chip dp-chip--muted';
  }

  retry(row: any): void {
    if (!row || this.busyId || row.status !== 'FAILED' || row.retryCount >= 3) {
      return;
    }
    if (!window.confirm('לנסות לשלוח את ההתראה מחדש?')) {
      return;
    }
    this.busyId = row.id;
    this.service.retryNotification(row.id).subscribe(
      () => {
        this.busyId = 0;
        this.snack.open('ההתראה הועברה לשליחה מחדש.', 'סגור', { duration: 2500 });
        this.load();
      },
      (err) => {
        this.busyId = 0;
        this.error = (err && err.message) || 'לא ניתן לטעון את ההתראות כרגע.';
      }
    );
  }
}
