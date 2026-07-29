export type RehabPeriodMode = 'monthly' | 'daily';

export type RehabHospitalizationDaysMode = 'gross' | 'net';

export type RehabMetricKey =
  | 'hospitalization-days'
  | 'avg-los'
  | 'occupancy'
  | 'admissions-payer'
  | 'admissions-internal-external'
  | 'recommended-targets'
  | 'revenue-net'
  | 'treatments';

export interface RehabMetricDefinition {
  key: RehabMetricKey;
  label: string;
  shortLabel: string;
  icon: string;
  help: string;
}

export interface RehabDepartmentRow {
  department: string;
  value: number;
  secondary?: number;
  target?: number;
  deltaPct?: number;
  trend?: 'up' | 'down' | 'flat';
}

export interface RehabKpiCard {
  label: string;
  value: string;
  sub?: string;
  accent?: 'primary' | 'success' | 'warn' | 'muted';
}

export interface RehabTableColumn {
  key: string;
  label: string;
  align?: 'right' | 'center' | 'left';
}

export interface RehabTableRow {
  id: string;
  cells: Record<string, string | number>;
  department?: string;
  highlight?: boolean;
}

export const REHAB_DEPARTMENTS: string[] = [
  'שיקום כללי',
  'שיקום ילדים',
  'שיקום ריאות',
  'שיקום יום מבוגרים',
  'שיקום יום ילדים',
];

export const REHAB_METRICS: RehabMetricDefinition[] = [
  {
    key: 'hospitalization-days',
    label: 'ימי אשפוז – ברוטו / נטו',
    shortLabel: 'ימי אשפוז',
    icon: 'hotel',
    help: 'סה״כ ימי אשפוז במחלקות השיקום. ניתן להחליף בין ברוטו (כולל ימי המתנה) לנטו (ימי טיפול בפועל).',
  },
  {
    key: 'avg-los',
    label: 'משך אשפוז ממוצע',
    shortLabel: 'ממוצע אשפוז',
    icon: 'schedule',
    help: 'ממוצע ימי אשפוז למאושפז בשיקום, מחושב לפי תקופה ומחלקה.',
  },
  {
    key: 'occupancy',
    label: 'תפוסה',
    shortLabel: 'תפוסה',
    icon: 'bed',
    help: 'אחוז תפוסת מיטות במחלקות השיקום מתוך קיבולת מאושרת.',
  },
  {
    key: 'admissions-payer',
    label: 'קבלות לפי קופות / צה״ל + משרד הביטחון / אחר',
    shortLabel: 'קבלות – גורם משלם',
    icon: 'account_balance',
    help: 'פילוח קבלות חדשות לפי קופות חולים, צה״ל ומשרד הביטחון, וגורמים אחרים.',
  },
  {
    key: 'admissions-internal-external',
    label: 'קבלות – פנים / חוץ לפי גורם מממן',
    shortLabel: 'קבלות פנים/חוץ',
    icon: 'swap_horiz',
    help: 'הפרדה בין קבלות מפנים המרכז לבין קבלות מחוץ, לפי גורם מממן.',
  },
  {
    key: 'recommended-targets',
    label: 'יעדים מומלצים לשיקום',
    shortLabel: 'יעדים מומלצים',
    icon: 'flag',
    help: 'השוואה בין ביצוע בפועל ליעדים מומלצים לשיקום (ימי אשפוז, תפוסה, קבלות).',
  },
  {
    key: 'revenue-net',
    label: 'הכנסות לפי מחיר נטו',
    shortLabel: 'הכנסות נטו',
    icon: 'payments',
    help: 'הכנסות מאשפוז שיקום לפי מחיר נטו, מפולח לפי מחלקה ותקופה.',
  },
  {
    key: 'treatments',
    label: 'טיפולי מקצועות בריאות למאושפזים',
    shortLabel: 'טיפולים מקצועיים',
    icon: 'medical_services',
    help: 'סה״כ טיפולים לפי מקצוע וממוצע טיפולים למאושפז ביום (אמצע שבוע בלבד).',
  },
];

export const MONTH_LABELS_HE = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
