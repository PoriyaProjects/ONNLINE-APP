import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-training-empty-state',
  templateUrl: './training-empty-state.component.html',
  styleUrls: ['./training-empty-state.component.scss'],
})
export class TrainingEmptyStateComponent {
  @Input() title = 'אין נתונים להצגה';
  @Input() message = '';
  @Input() actionLabel: string | null = null;
  @Input() icon = 'inbox';
  @Output() action = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }
}
