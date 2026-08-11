import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-training-page-header',
  templateUrl: './training-page-header.component.html',
  styleUrls: ['./training-page-header.component.scss'],
})
export class TrainingPageHeaderComponent {
  @Input() icon = 'school';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badgeLabel: string | null = null;
  @Input() badgeTone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'done' = 'info';
  @Input() primaryLabel: string | null = null;
  @Input() primaryIcon: string | null = null;
  @Input() secondaryLabel: string | null = null;
  @Input() counterLabel: string | null = null;
  @Input() compact = false;

  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();

  onPrimary(): void {
    this.primary.emit();
  }

  onSecondary(): void {
    this.secondary.emit();
  }
}
