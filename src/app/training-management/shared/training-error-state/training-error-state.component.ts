import { Component, EventEmitter, Input, Output } from '@angular/core';

export type TrainingErrorVariant =
  | 'generic'
  | 'network'
  | 'unauthorized'
  | 'notFound'
  | 'validation'
  | 'operational';

@Component({
  selector: 'app-training-error-state',
  templateUrl: './training-error-state.component.html',
  styleUrls: ['./training-error-state.component.scss'],
})
export class TrainingErrorStateComponent {
  @Input() title = 'אירעה שגיאה';
  @Input() message = 'לא ניתן לטעון את הנתונים כרגע.';
  @Input() retryLabel = 'נסה שוב';
  @Input() variant: TrainingErrorVariant = 'generic';
  @Input() supportHint: string | null = null;
  @Output() retry = new EventEmitter<void>();

  get iconName(): string {
    switch (this.variant) {
      case 'network':
        return 'wifi_off';
      case 'unauthorized':
        return 'lock';
      case 'notFound':
        return 'help_outline';
      case 'validation':
        return 'rule';
      case 'operational':
        return 'build';
      default:
        return 'error_outline';
    }
  }

  onRetry(): void {
    this.retry.emit();
  }
}
