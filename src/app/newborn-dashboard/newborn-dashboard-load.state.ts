export type DashboardDatasetKey = 'summary' | 'details' | 'monitoring';

export interface DatasetLoadState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  count: number;
  staging: boolean;
  stagedCount: number;
}

export interface DashboardLoadState {
  summary: DatasetLoadState;
  details: DatasetLoadState;
  monitoring: DatasetLoadState;
  requestId: number;
}

const emptyDataset = (): DatasetLoadState => ({
  loading: false,
  loaded: false,
  error: null,
  count: 0,
  staging: false,
  stagedCount: 0,
});

export function createDashboardLoadState(): DashboardLoadState {
  return {
    summary: emptyDataset(),
    details: emptyDataset(),
    monitoring: emptyDataset(),
    requestId: 0,
  };
}

export function startDatasetLoad(state: DashboardLoadState, key: DashboardDatasetKey): void {
  state[key] = { ...emptyDataset(), loading: true };
}

export function finishDatasetLoad(
  state: DashboardLoadState,
  key: DashboardDatasetKey,
  count: number,
  error: string | null = null
): void {
  state[key] = {
    loading: false,
    loaded: !error,
    error,
    count,
    staging: false,
    stagedCount: count,
  };
}

export function updateDatasetStaging(
  state: DashboardLoadState,
  key: DashboardDatasetKey,
  stagedCount: number,
  total: number
): void {
  state[key] = {
    ...state[key],
    staging: stagedCount < total,
    stagedCount,
    count: total,
  };
}

export function isAnyDatasetLoading(state: DashboardLoadState): boolean {
  return state.summary.loading || state.details.loading || state.monitoring.loading;
}

export function isAnyDatasetStaging(state: DashboardLoadState): boolean {
  return state.summary.staging || state.details.staging || state.monitoring.staging;
}

export function loadedDatasetCount(state: DashboardLoadState): number {
  return [state.summary, state.details, state.monitoring].filter((d) => d.loaded).length;
}
