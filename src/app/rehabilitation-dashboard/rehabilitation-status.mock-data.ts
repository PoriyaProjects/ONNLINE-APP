import {
  getBedCapacityForYear,
  getTotalBedsForYear,
} from './rehabilitation-bed-capacity.constants';
import { RehabKpiCard, RehabTableColumn, RehabTableRow } from './rehabilitation-dashboard.models';
import {
  RehabStatusBlock,
  RehabStatusMode,
  RehabStatusViewModel,
} from './rehabilitation-status.models';

const PAYERS = ['כללית', 'מכבי', 'לאומית', 'מאוחדת', 'צה״ל + משרד הביטחון', 'אחר'];
const FUNDERS = ['קופת חולים', 'צה״ל + משרד הביטחון', 'פרטי', 'ביטוח לאומי'];
const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seeded(base: number, salt: string, min: number, max: number): number {
  const span = max - min + 1;
  return min + (hash(`${base}-${salt}`) % span);
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function formatDateHe(d: Date): string {
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getWeekRangeLabel(ref: Date): string {
  const end = new Date(ref);
  const start = new Date(ref);
  start.setDate(end.getDate() - 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function buildRehabStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
): RehabStatusViewModel {
  const capacity = getBedCapacityForYear(year);
  const activeDepts = selectedDepartments.length
    ? capacity.filter((d) => selectedDepartments.includes(d.department))
    : capacity;
  const totalBeds = activeDepts.reduce((s, d) => s + d.beds, 0);
  const now = new Date();
  const isDaily = mode === 'daily';
  const periodLabel = isDaily
    ? `סטטוס יומי · ${formatDateHe(now)}`
    : `סטטוס שבועי · ${getWeekRangeLabel(now)}`;

  const salt = isDaily ? `daily-${now.toDateString()}` : `weekly-${year}-${now.getMonth()}`;

  return {
    mode,
    periodLabel,
    totalBeds: totalBeds || getTotalBedsForYear(year),
    bedCapacityNote: `קיבולת מיטות קבועה לשנת ${year} (סה״כ ${getTotalBedsForYear(year)} מיטות)`,
    blocks: [
      buildOccupancyBlock(isDaily, year, activeDepts, totalBeds, salt),
      buildAdmissionsPayerBlock(isDaily, year, salt),
      buildAdmissionsInternalExternalBlock(isDaily, year, salt),
      buildRecommendedTargetsBlock(isDaily, year, activeDepts, salt),
    ],
  };
}

function buildOccupancyBlock(
  isDaily: boolean,
  year: number,
  depts: { department: string; beds: number }[],
  totalBeds: number,
  salt: string,
): RehabStatusBlock {
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const occupied = isDaily
      ? seeded(year, `${salt}-${dept.department}-occ`, Math.max(1, dept.beds - 4), dept.beds)
      : seeded(year, `${salt}-${dept.department}-avg`, Math.round(dept.beds * 0.72), Math.round(dept.beds * 0.94));
    const occupancyPct = (occupied / dept.beds) * 100;
    return {
      id: `occ-${dept.department}`,
      department: dept.department,
      cells: {
        department: dept.department,
        beds: dept.beds,
        occupied,
        occupancy: formatPct(occupancyPct),
        available: dept.beds - occupied,
      },
    };
  });

  const totalOccupied = tableRows.reduce((s, r) => s + Number(r.cells.occupied), 0);
  const overallPct = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;

  const chartColumns: (string | Record<string, unknown>)[] = isDaily
    ? ['מחלקה', 'תפוסה %', 'מיטות תפוסות']
    : ['יום', 'תפוסה %'];

  let chartRows: (string | number)[][];
  if (isDaily) {
    chartRows = tableRows.map((r) => [
      r.cells.department,
      parseFloat(String(r.cells.occupancy)),
      Number(r.cells.occupied),
    ]);
  } else {
    chartRows = WEEKDAY_LABELS.map((day, idx) => [
      day,
      seeded(year, `${salt}-day-${idx}`, 74, 92) + seeded(year, `${salt}-d2-${idx}`, 0, 9) / 10,
    ]);
  }

  const kpis: RehabKpiCard[] = [
    { label: isDaily ? 'תפוסה היום' : 'תפוסה ממוצעת שבועית', value: formatPct(overallPct), accent: 'primary' },
    { label: 'מיטות תפוסות', value: `${formatNumber(totalOccupied)} / ${formatNumber(totalBeds)}`, accent: 'success' },
    { label: 'מיטות פנויות', value: formatNumber(totalBeds - totalOccupied), accent: 'muted' },
  ];

  return {
    code: '1.3',
    title: 'תפוסה',
    icon: 'bed',
    help: 'אחוז תפוסת מיטות לפי קיבולת קבועה (מקור: טבלת מיטות לפי שנה).',
    kpis,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'beds', label: 'מיטות', align: 'center' },
      { key: 'occupied', label: isDaily ? 'תפוסות היום' : 'ממוצע תפוסות', align: 'center' },
      { key: 'occupancy', label: 'תפוסה', align: 'center' },
      { key: 'available', label: 'פנויות', align: 'center' },
    ],
    tableRows,
    chartType: isDaily ? 'ColumnChart' : 'LineChart',
    chartColumns,
    chartRows,
  };
}

function buildAdmissionsPayerBlock(isDaily: boolean, year: number, salt: string): RehabStatusBlock {
  const multiplier = isDaily ? 1 : 7;
  const tableRows: RehabTableRow[] = PAYERS.map((payer) => {
    const count = seeded(year, `${salt}-${payer}`, 1, 8) * multiplier;
    return {
      id: `payer-${payer}`,
      cells: {
        payer,
        admissions: formatNumber(count),
        share: formatPct(seeded(year, `${salt}-${payer}-sh`, 6, 28)),
      },
    };
  });

  const total = tableRows.reduce((s, r) => s + Number(String(r.cells.admissions).replace(/,/g, '')), 0);

  return {
    code: '1.4',
    title: 'קבלות – לפי קופות / צה״ל + משרד הביטחון / אחר',
    icon: 'account_balance',
    help: 'פילוח קבלות חדשות לפי גורם משלם.',
    kpis: [
      { label: isDaily ? 'קבלות היום' : 'קבלות השבוע', value: formatNumber(total), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(61), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(13), accent: 'warn' },
    ],
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: isDaily ? 'קבלות היום' : 'קבלות שבוע', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'PieChart',
    chartColumns: ['גורם משלם', 'קבלות'],
    chartRows: PAYERS.map((payer) => [
      payer,
      seeded(year, `${salt}-chart-${payer}`, 2, 14) * multiplier,
    ]),
  };
}

function buildAdmissionsInternalExternalBlock(isDaily: boolean, year: number, salt: string): RehabStatusBlock {
  const multiplier = isDaily ? 1 : 7;
  const internal = seeded(year, `${salt}-in`, 8, 22) * multiplier;
  const external = seeded(year, `${salt}-out`, 3, 12) * multiplier;

  const tableRows: RehabTableRow[] = [];
  FUNDERS.forEach((funder) => {
    const fIn = seeded(year, `${salt}-${funder}-in`, 2, 10) * multiplier;
    const fOut = seeded(year, `${salt}-${funder}-out`, 1, 6) * multiplier;
    tableRows.push({
      id: `${funder}-in`,
      cells: { funder, direction: 'פנים', count: formatNumber(fIn), share: formatPct((fIn / (fIn + fOut || 1)) * 100) },
    });
    tableRows.push({
      id: `${funder}-out`,
      cells: { funder, direction: 'חוץ', count: formatNumber(fOut), share: formatPct((fOut / (fIn + fOut || 1)) * 100) },
    });
  });

  return {
    code: '1.5',
    title: 'קבלות – פנים / חוץ לפי גורם מממן',
    icon: 'swap_horiz',
    help: 'הפרדה בין קבלות מפנים המרכז לבין קבלות מחוץ.',
    kpis: [
      { label: isDaily ? 'פנים היום' : 'פנים השבוע', value: formatNumber(internal), accent: 'primary' },
      { label: isDaily ? 'חוץ היום' : 'חוץ השבוע', value: formatNumber(external), accent: 'warn' },
      { label: 'יחס פנים/חוץ', value: `${(internal / (external || 1)).toFixed(1)} : 1`, accent: 'muted' },
    ],
    tableColumns: [
      { key: 'funder', label: 'גורם מממן' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'count', label: isDaily ? 'היום' : 'שבוע', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'BarChart',
    chartColumns: ['כיוון', isDaily ? 'היום' : 'השבוע'],
    chartRows: [
      ['פנים', internal],
      ['חוץ', external],
    ],
  };
}

function buildRecommendedTargetsBlock(
  isDaily: boolean,
  year: number,
  depts: { department: string; beds: number }[],
  salt: string,
): RehabStatusBlock {
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const target = seeded(year, `${dept.department}-target`, 82, 92);
    const actual = target + seeded(year, `${salt}-${dept.department}-act`, -10, 6);
    const gap = actual - target;
    return {
      id: `target-${dept.department}`,
      department: dept.department,
      cells: {
        department: dept.department,
        actual: formatPct(actual),
        target: formatPct(target),
        gap: `${gap >= 0 ? '+' : ''}${formatNumber(gap, 1)}%`,
        status: gap >= 0 ? 'עומד ביעד' : 'מתחת ליעד',
      },
    };
  });

  const metCount = tableRows.filter((r) => String(r.cells.status).includes('עומד')).length;

  return {
    code: '1.6',
    title: 'יעדים מומלצים לשיקום',
    icon: 'flag',
    help: 'השוואת ביצוע מול יעדים מומלצים (תפוסה / יעדי שיקום).',
    kpis: [
      { label: 'מחלקות בעמידה', value: `${metCount}/${depts.length}`, accent: 'success' },
      { label: isDaily ? 'פער ממוצע היום' : 'פער ממוצע שבועי', value: formatPct(-1.8), accent: 'warn' },
      { label: 'יעד ארגוני', value: formatPct(88), accent: 'primary' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'actual', label: 'בפועל', align: 'center' },
      { key: 'target', label: 'יעד', align: 'center' },
      { key: 'gap', label: 'פער', align: 'center' },
      { key: 'status', label: 'סטטוס', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: ['מחלקה', 'בפועל', 'יעד'],
    chartRows: depts.map((dept) => {
      const target = seeded(year, `${dept.department}-target`, 82, 92);
      const actual = target + seeded(year, `${salt}-${dept.department}-act`, -10, 6);
      return [dept.department, actual, target];
    }),
  };
}
