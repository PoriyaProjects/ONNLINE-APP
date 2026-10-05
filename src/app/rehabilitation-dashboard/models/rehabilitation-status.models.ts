import { RehabKpiCard, RehabTableColumn, RehabTableRow } from './rehabilitation-dashboard.models';

export type RehabStatusMode = 'none' | 'daily' | 'weekly' | 'monthly';

export type RehabIndicatorTone = 'excellent' | 'good' | 'warn' | 'danger' | 'neutral';

export interface RehabStatusIndicator {
  id: string;
  label: string;
  valuePct: number;
  displayValue: string;
  averageDisplay: string;
  deltaVsAvg: number;
  quantity: number;
  quantityMax: number;
  averageQuantity: number;
  tone: RehabIndicatorTone;
  quantityLabel: string;
}

export interface RehabStatusBlock {
  code: string;
  title: string;
  icon: string;
  help: string;
  kpis: RehabKpiCard[];
  indicators: RehabStatusIndicator[];
  tableColumns: RehabTableColumn[];
  tableRows: RehabTableRow[];
  chartType: string;
  chartColumns: (string | Record<string, unknown>)[];
  chartRows: Array<Array<string | number | Record<string, unknown> | null>>;
  compareChartColumns?: (string | Record<string, unknown>)[];
  compareChartRows?: (string | number)[][];
  /** Footnote below chart (e.g. unassigned payer share excluded from pie). */
  chartNote?: string;
}

export interface RehabStatusViewModel {
  mode: RehabStatusMode;
  periodLabel: string;
  totalBeds: number;
  bedCapacityNote: string;
  blocks: RehabStatusBlock[];
}
