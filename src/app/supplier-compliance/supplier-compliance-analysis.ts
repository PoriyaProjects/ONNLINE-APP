import { SupplierUpsert } from './supplier-compliance.models';

export interface SupplierAnalysis {
  isDivision: boolean;
  isApproved: boolean;
  isMohSuspect: boolean;
  category: string;
  criticalityTier: string;
  recommendedAction: string;
  recommendedActionLevel: 'critical' | 'warning' | 'good' | 'muted';
  missingContactFields: string[];
}

const MOH_RE = /moh\.gov\.il/i;

// Mirrors SupplierAnalysis.NormalizeDocValue on the server. The document columns predate the
// כן/לא option list and still hold "1"/"0" for most rows, so both spellings have to be
// understood; values saved from the supplier card use the Hebrew form.
export function normalizeDocValue(v: string | null | undefined): string | null | undefined {
  if (v === '1') return 'כן';
  if (v === '0') return 'לא';
  return v;
}

function docSatisfied(v: string | null | undefined): boolean {
  const n = normalizeDocValue(v);
  return n === 'כן' || n === 'לא רלוונטי';
}

// Must stay identical to IsDivisionOf in SupplierAnalysis.cs. The hativaApproved checks below
// are the authoritative source — the name/notes heuristic is only a fallback for rows where
// the column was never set.
function isDivisionOf(
  s: Pick<SupplierUpsert, 'ndaSigned' | 'name' | 'notes' | 'hativaApproved'>,
): boolean {
  if (s.hativaApproved === '1') return true;
  if (s.hativaApproved === '0') return false;

  if (s.ndaSigned === 'משרד הבריאות') return true;
  const name = s.name || '';
  if (name.indexOf('(חטיבת') >= 0 || name.indexOf('(משרד הבריאות)') >= 0) return true;
  const notes = s.notes || '';
  return ['חטיבה', 'משרד הבריאות', 'מערך סייבר'].some((k) => notes.indexOf(k) >= 0);
}

export function computeSupplierAnalysis(
  s: SupplierUpsert,
  isCriticalSupplier: boolean | null = null,
): SupplierAnalysis {
  const div = isDivisionOf(s);
  const satNda = docSatisfied(s.ndaSigned);
  const satInfosec = docSatisfied(s.infosecQuestionnaireDocStatus);
  const approvedByForms = satNda && satInfosec;
  const active = s.status !== 'לא פעיל';
  const approved = (div || approvedByForms) && active;

  // Trimmed to match string.IsNullOrWhiteSpace on the server.
  const blank = (v: string | null | undefined) => !(v || '').trim();

  const missingContactFields: string[] = [];
  if (blank(s.contactPerson)) missingContactFields.push('שם איש קשר');
  if (blank(s.email)) missingContactFields.push('כתובת אימייל');
  if (blank(s.phone)) missingContactFields.push("מס' טלפון נייד");
  if (blank(s.service)) missingContactFields.push('תאור השרות / מוצר');

  const moh = !div && MOH_RE.test(s.email || '');

  let category: string;
  if (s.status === 'לא פעיל') category = 'לא פעיל';
  else if (div) category = 'חטיבה';
  else if (approved) category = 'מאושר';
  else if ((s.notes || '').trim()) category = 'בטיפול';
  else category = 'לא נוצר קשר';

  const bothMissing = !satNda && !satInfosec;

  // Criticality comes directly from the real DB's own computed column (IsCriticalSupplier),
  // not from a locally-recomputed score — see SupplierAnalysis.cs.
  const criticalityTier =
    isCriticalSupplier === true ? 'קריטי' : isCriticalSupplier === false ? 'לא קריטי' : 'לא ידוע';

  let recommendedAction: string;
  let recommendedActionLevel: SupplierAnalysis['recommendedActionLevel'];
  if (missingContactFields.length) {
    recommendedAction = `להשלים פרטי קשר חסרים (${missingContactFields.join(', ')}) — לא ניתן לפנות לספק כרגע`;
    recommendedActionLevel = 'critical';
  } else if (approved) {
    recommendedAction = 'ספק מאושר — אין פעולה נדרשת כרגע';
    recommendedActionLevel = 'good';
  } else if (s.status === 'לא פעיל') {
    recommendedAction = 'ספק מסומן לא פעיל — לבדוק אם עדיין רלוונטי לרשימה';
    recommendedActionLevel = 'muted';
  } else if (moh) {
    recommendedAction = 'לברר שיוך לחטיבה מול הגורם הרלוונטי (מייל בדומיין moh.gov.il) לפני המשך טיפול';
    recommendedActionLevel = 'warning';
  } else if (bothMissing) {
    recommendedAction = 'לשלוח לספק בקשה לטופס NDA ולשאלון אבטחת מידע';
    recommendedActionLevel = 'warning';
  } else if (!satNda) {
    recommendedAction = 'לבקש מהספק להשלים טופס NDA';
    recommendedActionLevel = 'warning';
  } else if (!satInfosec) {
    recommendedAction = 'לבקש מהספק להשלים שאלון אבטחת מידע';
    recommendedActionLevel = 'warning';
  } else {
    recommendedAction = 'להמשיך מעקב שוטף';
    recommendedActionLevel = 'muted';
  }

  return {
    isDivision: div,
    isApproved: approved,
    isMohSuspect: moh,
    category,
    criticalityTier,
    recommendedAction,
    recommendedActionLevel,
    missingContactFields,
  };
}

export function docChecklistState(v: string | null | undefined): 'ok' | 'na' | 'bad' {
  const n = normalizeDocValue(v);
  if (n === 'כן') return 'ok';
  if (n === 'לא רלוונטי') return 'na';
  return 'bad';
}

export interface TimelineItem {
  date: string | null;
  text: string;
}

export function buildTimeline(notes: string | null | undefined): TimelineItem[] {
  const trimmed = (notes || '').trim();
  if (!trimmed) return [];
  const chunks = trimmed.split(/\n\s*\n/);
  const dateRe = /(\d{1,2}[./\-]\d{1,2}[./\-](?:20)?\d{2})/;
  const items = chunks.map((c) => {
    const m = c.match(dateRe);
    return { date: m ? m[1] : null, text: c.trim() };
  });
  if (!items.some((it) => it.date)) return [{ date: null, text: trimmed }];
  return items;
}

export function reviewAge(dateStr: string | null | undefined): { text: string; cls: 'none' | 'fresh' | 'aging' | 'old' } {
  if (!dateStr) return { text: 'טרם תועדה בקרה', cls: 'none' };
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return { text: '', cls: 'none' };
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 0) return { text: 'תאריך עתידי — בקרה מתוכננת', cls: 'none' };
  if (days === 0) return { text: 'הבקרה בוצעה היום', cls: 'fresh' };
  if (days === 1) return { text: 'הבקרה בוצעה אתמול', cls: 'fresh' };
  if (days < 31) return { text: `הבקרה בוצעה לפני ${days} ימים`, cls: 'fresh' };
  const months = Math.round(days / 30.44);
  if (months < 12) return { text: `הבקרה בוצעה לפני ${months} חודשים`, cls: months >= 9 ? 'aging' : 'fresh' };
  const years = Math.floor(days / 365);
  const txt = years >= 2 ? `הבקרה בוצעה לפני למעלה מ-${years} שנים` : 'הבקרה בוצעה לפני למעלה משנה';
  return { text: `${txt} — מומלץ לחדש`, cls: 'old' };
}

export const CAT_PILL: Record<string, 'muted' | 'good' | 'warning' | 'critical'> = {
  חטיבה: 'muted', מאושר: 'good', בטיפול: 'warning', 'לא נוצר קשר': 'muted', 'לא פעיל': 'critical',
};
export const ACTION_ACCENT: Record<string, string> = {
  critical: 'var(--status-critical)', warning: 'var(--status-warning)', good: 'var(--status-good)', muted: 'var(--text-muted)',
};
