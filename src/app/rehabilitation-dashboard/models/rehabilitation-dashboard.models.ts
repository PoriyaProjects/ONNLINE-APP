export type RehabPeriodMode = 'monthly' | 'daily';

export type RehabHospitalizationDaysMode = 'gross' | 'net';

export type RehabSection = 'inpatient' | 'day-rehab';

/** Section 1 – אשפוז בשיקום (1.1–1.8) */
export type RehabInpatientMetricKey =
  | 'hospitalization-days'
  | 'avg-los'
  | 'occupancy'
  | 'admissions-payer'
  | 'admissions-internal-external'
  | 'recommended-targets'
  | 'revenue-net'
  | 'treatments';

/** Section 2 – שיקום יום (2.1–2.8) */
export type RehabDayMetricKey =
  | 'day-patients-payer'
  | 'day-patients-internal-external'
  | 'day-discharges-recommendation'
  | 'day-treatments-daily-cumulative'
  | 'day-treatments-sectors'
  | 'day-treatments-per-position'
  | 'day-avg-treatments-per-patient'
  | 'day-treatments-individual-group';

export type RehabMetricKey = RehabInpatientMetricKey | RehabDayMetricKey;

export interface RehabMetricDefinition {
  key: RehabMetricKey;
  section: RehabSection;
  /** מספר מדד בתוכנית (למשל 1.1) */
  code?: string;
  label: string;
  shortLabel: string;
  icon: string;
  help: string;
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
  /** Row hover tooltip (plain text or HTML when used with matTooltip). */
  tooltip?: string;
  /** Optional tone per cell for conditional styling. */
  cellTones?: Record<string, 'up' | 'down' | 'neutral'>;
}

/** Dashboard chart/table view state (occupancy API and similar live metrics). */
export interface RehabDashboardViewModel {
  kpis: RehabKpiCard[];
  chartColumns: (string | Record<string, unknown>)[];
  chartRows: (string | number)[][];
  chartType: string;
  chartOptions: Record<string, unknown>;
  tableColumns: RehabTableColumn[];
  tableRows: RehabTableRow[];
  periodCaption: string;
  chartHeading: string;
}

export const REHAB_INPATIENT_DEPARTMENTS: string[] = [
  'גריאטריה שיקומית',
  'שיקום כללי',
  'שיקום ילדים',
];

export const REHAB_DAY_DEPARTMENTS: string[] = [
  'שיקום יום מבוגרים',
  'שיקום יום ילדים',
  'מרפאת שיקום יום מבוגרים',
  'מרפאת שיקום יום ילדים',
  'מרפאת שיקום ריאות',
];

export const REHAB_INPATIENT_METRICS: RehabMetricDefinition[] = [
  {
    key: 'hospitalization-days',
    section: 'inpatient',
    code: '1.1',
    label: 'ימי אשפוז – ברוטו / נטו',
    shortLabel: 'ימי אשפוז',
    icon: 'hotel',
    help: 'סה״כ ימי אשפוז במחלקות השיקום. ניתן להחליף בין ברוטו (כולל ימי המתנה) לנטו (ימי טיפול בפועל).',
  },
  {
    key: 'avg-los',
    section: 'inpatient',
    code: '1.2',
    label: 'משך אשפוז ממוצע',
    shortLabel: 'ממוצע אשפוז',
    icon: 'schedule',
    help: 'ממוצע ימי אשפוז למאושפז בשיקום, מחושב לפי תקופה ומחלקה.',
  },
  {
    key: 'occupancy',
    section: 'inpatient',
    code: '1.3',
    label: 'תפוסה',
    shortLabel: 'תפוסה',
    icon: 'bed',
    help: 'אחוז תפוסת מיטות במחלקות השיקום מתוך קיבולת מאושרת.',
  },
  {
    key: 'admissions-payer',
    section: 'inpatient',
    code: '1.4',
    label: 'קבלות לפי קופות / צה״ל + משרד הביטחון / אחר',
    shortLabel: 'קבלות – גורם משלם',
    icon: 'account_balance',
    help: 'פילוח קבלות חדשות לפי קופות חולים, צה״ל ומשרד הביטחון, וגורמים אחרים.',
  },
  {
    key: 'admissions-internal-external',
    section: 'inpatient',
    code: '1.5',
    label: 'קבלות – פנים / חוץ לפי גורם מממן',
    shortLabel: 'קבלות פנים/חוץ',
    icon: 'swap_horiz',
    help: 'הפרדה בין קבלות מפנים המרכז לבין קבלות מחוץ, לפי גורם מממן.',
  },
  {
    key: 'recommended-targets',
    section: 'inpatient',
    code: '1.6',
    label: 'יעדים מומלצים לשיקום',
    shortLabel: 'יעדים מומלצים',
    icon: 'flag',
    help: 'השוואה בין ביצוע בפועל ליעדים מומלצים לשיקום (ימי אשפוז, תפוסה, קבלות).',
  },
  {
    key: 'revenue-net',
    section: 'inpatient',
    code: '1.7',
    label: 'הכנסות לפי מחיר נטו',
    shortLabel: 'הכנסות נטו',
    icon: 'payments',
    help: 'הכנסות מאשפוז שיקום לפי מחיר נטו, מפולח לפי מחלקה ותקופה.',
  },
  {
    key: 'treatments',
    section: 'inpatient',
    code: '1.8',
    label: 'טיפולי מקצועות בריאות למאושפזים',
    shortLabel: 'טיפולים מקצועיים',
    icon: 'medical_services',
    help: 'סה״כ טיפולים לפי מקצוע וממוצע טיפולים למאושפז ביום (אמצע שבוע בלבד).',
  },
];

export const REHAB_DAY_METRICS: RehabMetricDefinition[] = [
  {
    key: 'day-patients-payer',
    section: 'day-rehab',
    code: '2.1',
    label: 'מטופלים (התחייבויות חדשות) לפי קופות',
    shortLabel: 'מטופלים – קופות',
    icon: 'groups',
    help: 'מספר מטופלי שיקום יום עם התחייבויות חדשות, מפולח לפי קופות חולים.',
  },
  {
    key: 'day-patients-internal-external',
    section: 'day-rehab',
    code: '2.2',
    label: 'מטופלים (התחייבויות חדשות) לפי פנים וחוץ',
    shortLabel: 'מטופלים פנים/חוץ',
    icon: 'compare_arrows',
    help: 'התחייבויות חדשות לשיקום יום – פילוח בין מטופלים מפנים המרכז לבין מחוץ.',
  },
  {
    key: 'day-discharges-recommendation',
    section: 'day-rehab',
    code: '2.3',
    label: 'משחררים מאשפוז שיקום עם המלצה לשיקום יום',
    shortLabel: 'משחררים + המלצה',
    icon: 'exit_to_app',
    help: 'משחררים משיקום באשפוז עם המלצה לשיקום יום – מטופלים אצלנו / לא מטופלים אצלנו.',
  },
  {
    key: 'day-treatments-daily-cumulative',
    section: 'day-rehab',
    code: '2.4',
    label: 'טיפולי שיקום יום – ליום ומצטבר',
    shortLabel: 'טיפולים יומי/מצטבר',
    icon: 'stacked_line_chart',
    help: 'טיפולי שיקום יום – כמות ליום נבחר ומצטבר לתקופה.',
  },
  {
    key: 'day-treatments-sectors',
    section: 'day-rehab',
    code: '2.5',
    label: 'התפלגות טיפולים לפי סקטורים',
    shortLabel: 'טיפולים לפי סקטור',
    icon: 'pie_chart',
    help: 'פילוח טיפולי שיקום יום לפי סקטורים טיפוליים.',
  },
  {
    key: 'day-treatments-per-position',
    section: 'day-rehab',
    code: '2.6',
    label: 'טיפולים למשרה לפי סקטורים',
    shortLabel: 'טיפולים למשרה',
    icon: 'badge',
    help: 'מספר טיפולים למשרה (תקן) בכל סקטור שיקום יום.',
  },
  {
    key: 'day-avg-treatments-per-patient',
    section: 'day-rehab',
    code: '2.7',
    label: 'ממוצע טיפולים ליום למטופל',
    shortLabel: 'ממוצע למטופל',
    icon: 'calculate',
    help: 'ממוצע טיפולי שיקום יום למטופל ביום, לפי מחלקה ותקופה.',
  },
  {
    key: 'day-treatments-individual-group',
    section: 'day-rehab',
    code: '2.8',
    label: 'טיפולים לפי פרטני / קבוצתי',
    shortLabel: 'פרטני / קבוצתי',
    icon: 'people',
    help: 'התפלגות טיפולי שיקום יום בין טיפול פרטני לטיפול קבוצתי.',
  },
];

export const REHAB_METRICS: RehabMetricDefinition[] = [
  ...REHAB_INPATIENT_METRICS,
  ...REHAB_DAY_METRICS,
];

export const MONTH_LABELS_HE = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function getMetricsForSection(section: RehabSection): RehabMetricDefinition[] {
  return section === 'inpatient' ? REHAB_INPATIENT_METRICS : REHAB_DAY_METRICS;
}

export function getDepartmentsForSection(section: RehabSection): string[] {
  return section === 'inpatient' ? REHAB_INPATIENT_DEPARTMENTS : REHAB_DAY_DEPARTMENTS;
}

export function getDefaultMetricForSection(section: RehabSection): RehabMetricKey {
  return section === 'inpatient' ? 'admissions-payer' : getMetricsForSection(section)[0].key;
}

/** Status blocks wired to live WebService methods (1.3–1.7). 1.8 pending backend. */
export const REHAB_API_STATUS_BLOCK_CODES = ['1.3', '1.4', '1.5', '1.6', '1.7'] as const;

/** Status blocks shown only in monthly status view (not daily). */
export const REHAB_MONTHLY_ONLY_STATUS_BLOCK_CODES = ['1.7'] as const;

export function isMonthlyOnlyStatusBlock(blockCode: string): boolean {
  return (REHAB_MONTHLY_ONLY_STATUS_BLOCK_CODES as readonly string[]).includes(blockCode);
}

/** Dashboard metrics with a live API. */
export const REHAB_API_DASHBOARD_METRICS: RehabMetricKey[] = [
  'admissions-payer',
  'occupancy',
  'admissions-internal-external',
  'recommended-targets',
  'revenue-net',
];
