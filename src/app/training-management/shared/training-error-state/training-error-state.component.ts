import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-training-error-state',
  templateUrl: './training-error-state.component.html',
  styleUrls: ['./training-error-state.component.scss'],
})
export class TrainingErrorStateComponent {
  @Input() title = 'אירעה שגיאה';
  @Input() message = 'לא ניתן לטעון את הנתונים כרגע.';
  @Input() retryLabel = 'נסה שוב';
  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
