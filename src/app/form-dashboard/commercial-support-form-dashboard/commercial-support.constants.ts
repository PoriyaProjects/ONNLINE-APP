export const UNSUPPORTED_FILE_TYPE_MESSAGE =
  'סוג הקובץ אינו נתמך. יש להעלות קובץ תמונה או PDF בלבד';

const IMAGE_OR_PDF_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tif', 'tiff'];

export function isImageOrPdfFile(file: File): boolean {
  const type = (file?.type || '').toLowerCase();
  if (type.startsWith('image/') || type === 'application/pdf') {
    return true;
  }
  const ext = (file?.name?.split('.').pop() || '').toLowerCase();
  return IMAGE_OR_PDF_EXTENSIONS.includes(ext);
}

export const COMMITTEE_DECISION_USERS = ['okatz', 'adahabre', 'yghanem'];

export const VIEW_ONLY_USERS = [
  'ttsrefati', 'dnudelman', 'adar', 'ebirati', 'owiesel', 'aperetz', 'okubi'
];

/** Display names for secondary-admin decision table */
export const VIEW_ONLY_USER_DISPLAY_NAMES: { [userName: string]: string } = {
  ttsrefati: 'תגל צרפתי',
  dnudelman: 'דורית נודלמן',
  adar: 'עו"ד אלון דר',
  ebirati: 'פרופ\' עידו בירתי',
  owiesel: 'פרופ\' אורי ויזל',
  aperetz: 'פרופ\' אבי פרץ',
  okubi: 'אורטל קובי'
};

export const SECONDARY_APPROVED_LABELS: { [key: string]: string } = {
  approved: 'מאושר',
  rejected: 'לא מאושר',
  chairman: 'אושר בדיון יו"ר',
  special: 'אושר בדיון מיוחד',
  other: 'אחר'
};

export function isCommitteeDecisionUser(userName: string): boolean {
  return COMMITTEE_DECISION_USERS.includes((userName || '').toLowerCase());
}

export function isViewOnlyUser(userName: string): boolean {
  return VIEW_ONLY_USERS.includes((userName || '').toLowerCase());
}

export interface SecondaryDecisionRow {
  UserName: string;
  DisplayName: string;
  DecisionDate: string;
  Approved: string;
  ApprovedLabel: string;
  Note: string;
}

export function getSecondaryApprovedLabel(approved: string): string {
  if (!approved) {
    return '';
  }
  return SECONDARY_APPROVED_LABELS[approved] || approved;
}

export function buildSecondaryDecisionRows(saved: any[]): SecondaryDecisionRow[] {
  const byUser: { [key: string]: any } = {};
  (saved || []).forEach((row) => {
    const key = (row.UserName || '').toLowerCase();
    if (key) {
      byUser[key] = row;
    }
  });

  return VIEW_ONLY_USERS.map((userName) => {
    const row = byUser[userName] || {};
    const approved = row.Approved || '';
    return {
      UserName: userName,
      DisplayName: VIEW_ONLY_USER_DISPLAY_NAMES[userName] || userName,
      DecisionDate: row.DecisionDate || '',
      Approved: approved,
      ApprovedLabel: getSecondaryApprovedLabel(approved),
      Note: row.Note || ''
    };
  });
}
