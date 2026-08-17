import { Component, Input } from '@angular/core';
import {
  TRAINING_ATTENDANCE_STATUS_HE,
  TRAINING_CERTIFICATE_STATUS_HE,
  TRAINING_COURSE_STATUS_HE,
  TRAINING_REGISTRATION_STATUS_HE,
  TRAINING_SESSION_STATUS_HE,
  trainingStatusLabel,
} from '../../models';

export type TrainingBadgeKind =
  | 'course'
  | 'session'
  | 'registration'
  | 'attendance'
  | 'certificate'
  | 'custom';

@Component({
  selector: 'app-training-status-badge',
  templateUrl: './training-status-badge.component.html',
  styleUrls: ['./training-status-badge.component.scss'],
})
export class TrainingStatusBadgeComponent {
  @Input() kind: TrainingBadgeKind = 'custom';
  @Input() status: number | null | undefined;
  @Input() label: string | null | undefined;
  @Input() tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' = 'neutral';
  @Input() icon: string | null = null;

  get displayLabel(): string {
    if (this.label) {
      return this.label;
    }
    switch (this.kind) {
      case 'course':
        return trainingStatusLabel(TRAINING_COURSE_STATUS_HE, this.status, '');
      case 'session':
        return trainingStatusLabel(TRAINING_SESSION_STATUS_HE, this.status, '');
      case 'registration':
        return trainingStatusLabel(TRAINING_REGISTRATION_STATUS_HE, this.status, '');
      case 'attendance':
        return trainingStatusLabel(TRAINING_ATTENDANCE_STATUS_HE, this.status, 'לא זמין');
      case 'certificate':
        return trainingStatusLabel(TRAINING_CERTIFICATE_STATUS_HE, this.status, 'לא זמין');
      default:
        return '';
    }
  }

  get iconName(): string {
    if (this.icon) {
      return this.icon;
    }
    switch (this.tone) {
      case 'ok':
        return 'check_circle';
      case 'warn':
        return 'warning';
      case 'danger':
        return 'cancel';
      case 'info':
        return 'info';
      case 'done':
        return 'verified';
      default:
        return 'label';
    }
  }
}
