import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-nps-request-status-badge',
  templateUrl: './request-status-badge.component.html',
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
}
