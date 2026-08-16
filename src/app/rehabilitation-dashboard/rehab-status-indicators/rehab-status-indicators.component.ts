import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RehabStatusIndicator } from '../rehabilitation-status.models';
import { averageMarkerPct, getIndicatorToneClass, quantityBarPct } from './rehab-status-indicator.utils';

@Component({
  selector: 'app-rehab-status-indicators',
  templateUrl: './rehab-status-indicators.component.html',
  styleUrls: ['./rehab-status-indicators.component.css'],
})
export class RehabStatusIndicatorsComponent {
  @Input() indicators: RehabStatusIndicator[] = [];
  @Input() selectedId: string | null = null;
  @Input() compareCaption = 'ביחס לממוצע';

  @Output() indicatorSelect = new EventEmitter<string>();

  barPct(ind: RehabStatusIndicator): number {
    return quantityBarPct(ind.quantity, ind.quantityMax);
  }

  avgMarker(ind: RehabStatusIndicator): number {
    return averageMarkerPct(ind.averageQuantity, ind.quantityMax);
  }

  toneClass(ind: RehabStatusIndicator): string {
    return getIndicatorToneClass(ind.tone);
  }

  deltaLabel(ind: RehabStatusIndicator): string {
    const abs = Math.abs(ind.deltaVsAvg).toFixed(1);
    if (ind.deltaVsAvg > 0.05) return `${abs}% מעל הממוצע`;
    if (ind.deltaVsAvg < -0.05) return `${abs}% מתחת לממוצע`;
    return 'בהתאם לממוצע';
  }

  qtyDeltaLabel(ind: RehabStatusIndicator): string {
    if (!ind.averageQuantity) return '';
    const pct = ((ind.quantity - ind.averageQuantity) / ind.averageQuantity) * 100;
    const abs = Math.abs(pct).toFixed(0);
    if (pct > 1) return `+${abs}% בכמות`;
    if (pct < -1) return `-${abs}% בכמות`;
    return 'כמות דומה לממוצע';
  }

  onSelect(id: string): void {
    this.indicatorSelect.emit(this.selectedId === id ? '' : id);
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }
}
