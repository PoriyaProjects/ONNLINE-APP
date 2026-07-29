import { RehabKpiCard, RehabTableColumn, RehabTableRow } from './rehabilitation-dashboard.models';

export type RehabStatusMode = 'none' | 'daily' | 'weekly';

export interface RehabStatusBlock {
  code: string;
  title: string;
  icon: string;
  help: string;
  kpis: RehabKpiCard[];
  tableColumns: RehabTableColumn[];
  tableRows: RehabTableRow[];
  chartType: string;
  chartColumns: (string | Record<string, unknown>)[];
  chartRows: (string | number)[][];
}

export interface RehabStatusViewModel {
  mode: RehabStatusMode;
  periodLabel: string;
  totalBeds: number;
  bedCapacityNote: string;
  blocks: RehabStatusBlock[];
}
