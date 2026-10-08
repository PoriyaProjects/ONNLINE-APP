export const DP_STATUS_LABELS: { [key: string]: string } = {
  DRAFT: 'טיוטה',
  PENDING_APPROVAL: 'ממתין לאישור',
  APPROVED: 'מאושר',
  REJECTED: 'נדחה',
  EXPIRED: 'פג תוקף',
  SUSPENDED: 'מושעה',
  CANCELLED: 'בוטל',
};

export function statusLabel(status: string): string {
  return DP_STATUS_LABELS[status] || status || '';
}

export function displayStatus(perm: { status: string; isExpired?: boolean }): string {
  if (!perm) {
    return '';
  }
  if (perm.isExpired || perm.status === 'EXPIRED') {
    return 'EXPIRED';
  }
  return perm.status || '';
}

export function statusClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'dp-chip dp-chip--ok';
    case 'PENDING_APPROVAL':
      return 'dp-chip dp-chip--wait';
    case 'DRAFT':
      return 'dp-chip dp-chip--draft';
    case 'REJECTED':
      return 'dp-chip dp-chip--bad';
    case 'EXPIRED':
      return 'dp-chip dp-chip--expired';
    case 'SUSPENDED':
      return 'dp-chip dp-chip--suspended';
    case 'CANCELLED':
      return 'dp-chip dp-chip--muted';
    default:
      return 'dp-chip dp-chip--muted';
  }
}

export function canApproveStatus(status: string): boolean {
  return status === 'DRAFT' || status === 'PENDING_APPROVAL';
}

export function canResubmitStatus(status: string): boolean {
  return status === 'REJECTED';
}

export function canRemoveStatus(status: string): boolean {
  return status === 'DRAFT' || status === 'PENDING_APPROVAL';
}

const DP_ACTION_LABELS: { [key: string]: string } = {
  CREATE: 'יצירה',
  UPDATE: 'עדכון',
  SAVE: 'שמירה',
  ADD: 'הוספת הרשאה',
  REMOVE: 'הסרת הרשאה',
  APPROVE: 'אישור',
  REJECT: 'דחייה',
  RESUBMIT: 'הגשה מחדש',
  ADMIN_OVERRIDE: 'חריגת מנהל',
  RENEWAL_STARTED: 'תחילת חידוש',
  EXPIRE: 'פקיעת תוקף',
  ORG_CHANGE: 'שינוי ארגוני',
  PROFILE_CREATE: 'יצירת פרופיל',
  PROFILE_UPDATE: 'עדכון פרופיל',
  TEMPLATE_CHANGED: 'החלפת תבנית',
  TEMPLATE_CREATED: 'יצירת תבנית',
  TEMPLATE_UPDATED: 'עדכון תבנית',
  TEMPLATE_ACTIVATED: 'הפעלת תבנית',
  TEMPLATE_DEACTIVATED: 'השבתת תבנית',
  TEMPLATE_PERMISSION_ADDED: 'הוספת הרשאה לתבנית',
  TEMPLATE_PERMISSION_REMOVED: 'הסרת הרשאה מתבנית',
  PERMISSION_ADD: 'הוספת הרשאה',
  PERMISSION_CREATED: 'יצירת הרשאה',
  PERMISSION_UPDATED: 'עדכון הרשאה',
  PERMISSION_ACTIVATED: 'הפעלת הרשאה',
  PERMISSION_DEACTIVATED: 'השבתת הרשאה',
  NOTE: 'הערה',
  NOTE_CREATED: 'נוספה הערה',
  NOTE_UPDATED: 'עודכנה הערה',
  NOTE_DEACTIVATED: 'ההערה הוסרה',
  DELETE: 'מחיקה',
};

export function actionLabel(action: string): string {
  return DP_ACTION_LABELS[action] || action || '';
}

export function formatDay(value: string): string {
  if (!value || value.length < 10) {
    return '—';
  }
  return value.substring(8, 10) + '/' + value.substring(5, 7) + '/' + value.substring(0, 4);
}

export function formatStamp(value: string): string {
  const day = formatDay(value);
  if (day === '—' || !value || value.length < 16) {
    return day;
  }
  return day + ' ' + value.substring(11, 16);
}

export function daysUntil(value: string): number {
  if (!value || value.length < 10) {
    return 0;
  }
  const then = Date.UTC(Number(value.substring(0, 4)), Number(value.substring(5, 7)) - 1, Number(value.substring(8, 10)));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then - today) / 86400000);
}

export function waitDays(value: string): number {
  if (!value || value.length < 10) {
    return 0;
  }
  const then = Date.UTC(Number(value.substring(0, 4)), Number(value.substring(5, 7)) - 1, Number(value.substring(8, 10)));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / 86400000));
}
