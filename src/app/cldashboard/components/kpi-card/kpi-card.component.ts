import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class KpiCardComponent {
  @Input() label: string = '';
  @Input() value: number = 0;
  @Input() format: 'currency' | 'percent' | 'number' = 'number';

  get formattedValue(): string {
    if (this.format === 'currency') return '$' + this.value.toLocaleString();
    if (this.format === 'percent') return this.value.toFixed(2) + '%';
    return this.value.toLocaleString();
  }

  get isPositive(): boolean {
    return this.value > 0;
  }

  get isNegative(): boolean {
    return this.value < 0;
  }
}