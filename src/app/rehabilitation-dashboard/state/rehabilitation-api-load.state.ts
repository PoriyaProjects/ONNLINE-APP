/** Unified load state for rehabilitation dashboard API calls. */
export type RehabApiLoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export function isRehabApiLoading(state: RehabApiLoadState): boolean {
  return state === 'loading';
}

export function isRehabApiSuccess(state: RehabApiLoadState): boolean {
  return state === 'success';
}

export function isRehabApiFailure(state: RehabApiLoadState): boolean {
  return state === 'error' || state === 'empty';
}
