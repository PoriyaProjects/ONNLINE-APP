export type RehabIndicatorTone = 'excellent' | 'good' | 'warn' | 'danger' | 'neutral';

/** מחוון אינטראקטיבי – אחוז + השוואה לממוצע + כמות */
export interface RehabStatusIndicator {
  id: string;
  label: string;
  /** 0–100 לציור מחוון עגול */
  valuePct: number;
  displayValue: string;
  averageDisplay: string;
  /** הפרש באחוזים נקודות מול ממוצע (חיובי = מעל הממוצע) */
  deltaVsAvg: number;
  quantity: number;
  quantityMax: number;
  averageQuantity: number;
  tone: RehabIndicatorTone;
  quantityLabel: string;
}

export function getIndicatorToneClass(tone: RehabIndicatorTone): string {
  return `tone-${tone}`;
}

export function quantityBarPct(quantity: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (quantity / max) * 100));
}

export function averageMarkerPct(average: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (average / max) * 100));
}
