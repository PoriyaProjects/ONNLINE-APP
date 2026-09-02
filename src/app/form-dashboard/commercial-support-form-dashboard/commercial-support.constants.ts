export const COMMITTEE_DECISION_USERS = ['okatz', 'adahabre', 'yghanem', 'aperetz'];

export const VIEW_ONLY_USERS = [
  'ttsrefati', 'dnudelman', 'adar', 'ebirati', 'owiesel'
];

export function isCommitteeDecisionUser(userName: string): boolean {
  return COMMITTEE_DECISION_USERS.includes((userName || '').toLowerCase());
}

export function isViewOnlyUser(userName: string): boolean {
  return VIEW_ONLY_USERS.includes((userName || '').toLowerCase());
}
