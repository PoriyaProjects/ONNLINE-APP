import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-nps-request-status-badge',
  templateUrl: './request-status-badge.component.html',
  styleUrls: ['./request-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpsRequestStatusBadgeComponent {
  @Input() status: string;

  get color(): string {
    switch ((this.status || '').toLowerCase()) {
      case 'approved':
        return 'primary';
      case 'rejected':
        return 'warn';
      case 'pending':
        return 'accent';
      default:
        return undefined;
    }
  }

  get statusClass(): string {
    switch ((this.status || '').toLowerCase()) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-default';
    }
  }
}
