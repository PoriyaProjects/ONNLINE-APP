import {
  getBedCapacityForYear,
  getTotalBedsForYear,
} from './rehabilitation-bed-capacity.constants';
import {
  getDepartmentsForSection,
  REHAB_DAY_METRICS,
  RehabKpiCard,
  RehabMetricDefinition,
  RehabSection,
  RehabTableColumn,
  RehabTableRow,
} from './rehabilitation-dashboard.models';
import {
  RehabIndicatorTone,
  RehabStatusBlock,
  RehabStatusIndicator,
  RehabStatusMode,
  RehabStatusViewModel,
} from './rehabilitation-status.models';

const KUPOT = ['כללית', 'מכבי', 'לאומית', 'מאוחדת'];
const DEFENCE_PAYER = 'צה״ל + משרד הביטחון';
const OTHER_PAYER = 'אחר';
const PAYERS = [...KUPOT, DEFENCE_PAYER, OTHER_PAYER];
const FUNDERS = ['קופת חולים', 'צה״ל + משרד הביטחון', 'פרטי', 'ביטוח לאומי'];
const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const PROFESSIONS = ['פיזיותרפיה', 'ריפוי בעיסוק', 'קלינאות תקשורת', 'פסיכולוגיה', 'סיעוד שיקומי'];

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

function toneFromDelta(delta: number, higherIsBetter = true): RehabIndicatorTone {
  const d = higherIsBetter ? delta : -delta;
  if (d >= 4) return 'excellent';
  if (d >= 0) return 'good';
  if (d >= -4) return 'warn';
  return 'danger';
}

function makeIndicator(
  id: string,
  label: string,
  valuePct: number,
  displayValue: string,
  averagePct: number,
  quantity: number,
  quantityMax: number,
  averageQuantity: number,
  quantityLabel: string,
  higherIsBetter = true,
): RehabStatusIndicator {
  return {
    id,
    label,
    valuePct: Math.min(100, Math.max(0, valuePct)),
    displayValue,
    averageDisplay: formatPct(averagePct),
    deltaVsAvg: valuePct - averagePct,
    quantity,
    quantityMax,
    averageQuantity,
    quantityLabel,
    tone: toneFromDelta(valuePct - averagePct, higherIsBetter),
  };
}

function occupancyOf(rows: RehabTableRow[], dept: { department: string }): number {
  const row = rows.filter((r) => r.department === dept.department)[0];
  return row ? parseFloat(String(row.cells.occupancy)) : 0;
}

function formatDateHe(d: Date): string {
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getMonthRangeLabel(ref: Date): string {
  const end = new Date(ref);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  const fmt = (dt: Date) => dt.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  return `30 ימים אחרונים · ${fmt(start)} – ${fmt(end)}`;
}

export function buildRehabStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
  section: RehabSection = 'inpatient',
): RehabStatusViewModel {
  if (section === 'day-rehab') {
    return buildDayRehabStatusViewModel(mode, year, selectedDepartments);
  }

  const capacity = getBedCapacityForYear(year);
  const activeDepts = selectedDepartments.length
    ? capacity.filter((d) => selectedDepartments.includes(d.department))
    : capacity;
  const totalBeds = activeDepts.reduce((s, d) => s + d.beds, 0);
  const now = new Date();
  const isDaily = mode === 'daily';
  const periodLabel = isDaily
    ? `סטטוס יומי · ${formatDateHe(now)}`
    : `סטטוס חודשי · ${getMonthRangeLabel(now)}`;

  const salt = isDaily ? `daily-${now.toDateString()}` : `monthly-${year}-${now.getMonth()}`;

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
      buildRevenueNetBlock(isDaily, year, activeDepts, salt),
      buildTreatmentsBlock(isDaily, year, salt),
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
        occupancyFraction: `${occupied}/${dept.beds}`,
      },
    };
  });

  const totalOccupied = tableRows.reduce((s, r) => s + Number(r.cells.occupied), 0);
  const overallPct = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;
  const avgOccupancyPct = isDaily ? 84.5 : 86.2;

  const deptIndicator = (dept: { department: string; beds: number }, note: string): RehabStatusIndicator => {
    const row = tableRows.filter((r) => r.department === dept.department)[0];
    const occ = parseFloat(String(row.cells.occupancy));
    const avg = seeded(year, `${dept.department}-avg-pct`, 78, 90) + 0.5;
    return makeIndicator(
      `occ-${dept.department}`,
      dept.department,
      occ,
      formatPct(occ),
      avg,
      Number(row.cells.occupied),
      dept.beds,
      Math.round((avg / 100) * dept.beds),
      note,
    );
  };

  const byOccupancy = depts
    .slice()
    .sort((a, b) => occupancyOf(tableRows, b) - occupancyOf(tableRows, a));

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'occ-total',
      isDaily ? 'תפוסה כללית היום' : 'ממוצע שבועי',
      overallPct,
      formatPct(overallPct),
      avgOccupancyPct,
      totalOccupied,
      totalBeds,
      Math.round((avgOccupancyPct / 100) * totalBeds),
      'מיטות תפוסות',
    ),
  ];
  if (byOccupancy.length) {
    indicators.push(deptIndicator(byOccupancy[0], 'התפוסה הגבוהה'));
  }
  if (byOccupancy.length > 1) {
    indicators.push(deptIndicator(byOccupancy[byOccupancy.length - 1], 'התפוסה הנמוכה'));
  }

  const chartColumns: (string | Record<string, unknown>)[] = isDaily
    ? ['מחלקה', 'תפוסות', { type: 'string', role: 'annotation' }, 'קיבולת']
    : ['יום', 'תפוסות', { type: 'string', role: 'annotation' }, 'קיבולת'];

  let chartRows: (string | number)[][];
  if (isDaily) {
    chartRows = tableRows.map((r) => {
      const occupied = Number(r.cells.occupied);
      const beds = Number(r.cells.beds);
      return [
        r.cells.department,
        occupied,
        beds > 0 ? `${occupied}/${beds}` : `${occupied}`,
        beds,
      ];
    });
  } else {
    const weekTotalBeds = totalBeds;
    chartRows = WEEKDAY_LABELS.map((day, idx) => {
      const dayOccupied = seeded(year, `${salt}-day-occ-${idx}`, Math.round(totalBeds * 0.74), Math.round(totalBeds * 0.92));
      return [day, dayOccupied, `${dayOccupied}/${weekTotalBeds}`, weekTotalBeds];
    });
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
    indicators,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'beds', label: 'מיטות', align: 'center' },
      { key: 'occupied', label: isDaily ? 'תפוסות היום' : 'ממוצע תפוסות', align: 'center' },
      { key: 'occupancyFraction', label: 'מתוך קיבולת', align: 'center' },
      { key: 'occupancy', label: 'תפוסה %', align: 'center' },
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
  const avgTotal = isDaily ? 18 : 112;

  const payerStats = PAYERS.map((payer) => {
    const row = tableRows.filter((r) => r.id === `payer-${payer}`)[0];
    const avgShare = seeded(year, `${payer}-avg-sh`, 8, 22) + 0.3;
    return {
      payer,
      count: Number(String(row.cells.admissions).replace(/,/g, '')),
      share: parseFloat(String(row.cells.share)),
      avgShare,
      avgCount: Math.round((avgShare / 100) * avgTotal),
    };
  });

  const quantityLabel = isDaily ? 'קבלות היום' : 'קבלות שבוע';
  const groupIndicator = (id: string, label: string, group: typeof payerStats): RehabStatusIndicator => {
    const count = group.reduce((s, p) => s + p.count, 0);
    const share = group.reduce((s, p) => s + p.share, 0);
    const avgShare = group.reduce((s, p) => s + p.avgShare, 0);
    const avgCount = group.reduce((s, p) => s + p.avgCount, 0);
    return makeIndicator(
      id,
      label,
      share,
      formatPct(share),
      avgShare,
      count,
      Math.max(count, avgCount, 12),
      avgCount,
      quantityLabel,
    );
  };

  // Only the three groups the metric is defined by: קופות / צה״ל + מב״ט / אחר.
  const indicators: RehabStatusIndicator[] = [
    groupIndicator('payer-kupot', 'קופות חולים', payerStats.filter((p) => KUPOT.indexOf(p.payer) >= 0)),
    groupIndicator('payer-defence', 'צה״ל + מב״ט', payerStats.filter((p) => p.payer === DEFENCE_PAYER)),
    groupIndicator('payer-other', 'אחר', payerStats.filter((p) => p.payer === OTHER_PAYER)),
  ];

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
    indicators,
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
  const multiplier = isDaily ? 1 : 30;
  const internal = seeded(year, `${salt}-in`, 8, 22) * multiplier;
  const external = seeded(year, `${salt}-out`, 3, 12) * multiplier;
  const totalAdm = internal + external;
  const internalPct = (internal / totalAdm) * 100;
  const avgInternalPct = 68;

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'adm-internal',
      isDaily ? 'קבלות פנים' : 'פנים (30 ימים)',
      internalPct,
      formatPct(internalPct),
      avgInternalPct,
      internal,
      Math.max(internal, external, 20),
      Math.round((avgInternalPct / 100) * (avgInternalPct > 0 ? totalAdm : 1)),
      'מספר קבלות',
    ),
    makeIndicator(
      'adm-external',
      isDaily ? 'קבלות חוץ' : 'חוץ (30 ימים)',
      100 - internalPct,
      formatPct(100 - internalPct),
      100 - avgInternalPct,
      external,
      Math.max(internal, external, 20),
      Math.round(((100 - avgInternalPct) / 100) * totalAdm),
      'מספר קבלות',
      false,
    ),
  ];

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
      { label: isDaily ? 'פנים היום' : 'פנים (30 ימים)', value: formatNumber(internal), accent: 'primary' },
      { label: isDaily ? 'חוץ היום' : 'חוץ (30 ימים)', value: formatNumber(external), accent: 'warn' },
      { label: 'יחס פנים/חוץ', value: `${(internal / (external || 1)).toFixed(1)} : 1`, accent: 'muted' },
    ],
    indicators,
    tableColumns: [
      { key: 'funder', label: 'גורם מממן' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'count', label: isDaily ? 'היום' : '30 ימים', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'BarChart',
    chartColumns: ['כיוון', isDaily ? 'היום' : '30 ימים'],
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
  const orgTarget = 88;

  const deptGaps = depts
    .map((dept) => {
      const target = seeded(year, `${dept.department}-target`, 82, 92);
      const actual = target + seeded(year, `${salt}-${dept.department}-act`, -10, 6);
      return { department: dept.department, target, actual, gap: actual - target };
    })
    .sort((a, b) => b.gap - a.gap);

  const gapIndicator = (
    entry: { department: string; target: number; actual: number },
    note: string,
  ): RehabStatusIndicator => makeIndicator(
    `target-${entry.department}`,
    entry.department,
    entry.actual,
    formatPct(entry.actual),
    entry.target,
    Math.round(entry.actual),
    100,
    Math.round(entry.target),
    note,
  );

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'target-org',
      'יעד ארגוני',
      (metCount / depts.length) * 100,
      `${metCount}/${depts.length}`,
      orgTarget,
      metCount,
      depts.length,
      Math.round((orgTarget / 100) * depts.length),
      'מחלקות בעמידה',
    ),
  ];
  if (deptGaps.length) {
    indicators.push(gapIndicator(deptGaps[0], 'הפער הטוב ביותר'));
  }
  if (deptGaps.length > 1) {
    indicators.push(gapIndicator(deptGaps[deptGaps.length - 1], 'הפער הגדול ביותר'));
  }

  return {
    code: '1.6',
    title: 'יעדים מומלצים לשיקום',
    icon: 'flag',
    help: 'השוואת ביצוע מול יעדים מומלצים (תפוסה / יעדי שיקום).',
    kpis: [
      { label: 'מחלקות בעמידה', value: `${metCount}/${depts.length}`, accent: 'success' },
      { label: isDaily ? 'פער ממוצע היום' : 'פער ממוצע שבועי', value: formatPct(-1.8), accent: 'warn' },
      { label: 'יעד ארגוני', value: formatPct(orgTarget), accent: 'primary' },
    ],
    indicators,
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
    chartRows: deptGaps.map((entry) => [entry.department, entry.actual, entry.target]),
  };
}

function formatCurrency(n: number): string {
  return `₪${formatNumber(n)}`;
}

function buildRevenueNetBlock(
  isDaily: boolean,
  year: number,
  depts: { department: string; beds: number }[],
  salt: string,
): RehabStatusBlock {
  const multiplier = isDaily ? 1 : 7;
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const revenue = seeded(year, `${salt}-${dept.department}-rev`, 42000, 168000) * multiplier;
    const avgRev = seeded(year, `${dept.department}-avg-rev`, 38000, 152000) * multiplier;
    const share = seeded(year, `${salt}-${dept.department}-rev-sh`, 12, 32) + 0.4;
    return {
      id: `rev-${dept.department}`,
      department: dept.department,
      cells: {
        department: dept.department,
        revenue: formatCurrency(revenue),
        perDay: formatCurrency(Math.round(revenue / (isDaily ? 1 : 7))),
        share: formatPct(share),
      },
    };
  });

  const totalRev = tableRows.reduce(
    (s, r) => s + Number(String(r.cells.revenue).replace(/[₪,]/g, '')),
    0,
  );
  const avgTotalRev = isDaily ? 312000 : 1984000;
  const overallShare = 100;

  const deptRevenues = depts.map((dept) => {
    const revenue = seeded(year, `${salt}-${dept.department}-rev`, 42000, 168000) * multiplier;
    const avgRev = seeded(year, `${dept.department}-avg-rev`, 38000, 152000) * multiplier;
    const share = (revenue / (totalRev || 1)) * 100;
    const avgShare = (avgRev / (avgTotalRev || 1)) * 100;
    return { department: dept.department, revenue, avgRev, share, avgShare };
  }).sort((a, b) => b.revenue - a.revenue);

  const quantityLabel = isDaily ? 'הכנסות היום' : 'הכנסות השבוע';
  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'rev-total',
      isDaily ? 'סה״כ היום' : 'סה״כ שבוע',
      overallShare,
      formatCurrency(totalRev),
      avgTotalRev,
      totalRev,
      Math.max(totalRev, avgTotalRev),
      avgTotalRev,
      quantityLabel,
    ),
  ];
  if (deptRevenues.length) {
    const top = deptRevenues[0];
    indicators.push(makeIndicator(
      `rev-${top.department}`,
      top.department,
      top.share,
      formatCurrency(top.revenue),
      top.avgShare,
      top.revenue,
      Math.max(top.revenue, top.avgRev),
      top.avgRev,
      'הכנסות מחלקה',
    ));
  }
  if (deptRevenues.length > 1) {
    const low = deptRevenues[deptRevenues.length - 1];
    indicators.push(makeIndicator(
      `rev-${low.department}`,
      low.department,
      low.share,
      formatCurrency(low.revenue),
      low.avgShare,
      low.revenue,
      Math.max(low.revenue, low.avgRev),
      low.avgRev,
      'הכנסות מחלקה',
    ));
  }

  return {
    code: '1.7',
    title: 'הכנסות לפי מחיר נטו',
    icon: 'payments',
    help: 'הכנסות מאשפוז שיקום לפי מחיר נטו, מפולח לפי מחלקה.',
    kpis: [
      { label: isDaily ? 'הכנסות היום' : 'הכנסות השבוע', value: formatCurrency(totalRev), accent: 'primary' },
      { label: 'ממוצע למחלקה', value: formatCurrency(Math.round(totalRev / depts.length)), accent: 'success' },
      { label: 'צמיחה מול ממוצע', value: `${totalRev >= avgTotalRev ? '+' : ''}${formatNumber(((totalRev - avgTotalRev) / avgTotalRev) * 100, 1)}%`, accent: 'warn' },
    ],
    indicators,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'revenue', label: isDaily ? 'היום' : 'שבוע', align: 'center' },
      { key: 'perDay', label: 'ליום', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: ['מחלקה', isDaily ? 'היום (אלפי ₪)' : 'שבוע (אלפי ₪)'],
    chartRows: deptRevenues.map((d) => [d.department, Math.round(d.revenue / 1000)]),
  };
}

function buildTreatmentsBlock(isDaily: boolean, year: number, salt: string): RehabStatusBlock {
  const multiplier = isDaily ? 1 : 5;
  const tableRows: RehabTableRow[] = PROFESSIONS.map((prof) => {
    const total = seeded(year, `${salt}-${prof}`, 42, 186) * multiplier;
    const avg = seeded(year, `${salt}-${prof}-avg`, 12, 38) / 10;
    return {
      id: `trt-${prof}`,
      cells: {
        profession: prof,
        total: formatNumber(total),
        avgPerPatientDay: formatNumber(avg, 2),
        weekdayOnly: 'אמצע שבוע',
      },
    };
  });

  const totalTreatments = tableRows.reduce(
    (s, r) => s + Number(String(r.cells.total).replace(/,/g, '')),
    0,
  );
  const avgTotal = isDaily ? 420 : 2100;
  const avgPerPatient = seeded(year, `${salt}-avg-pt`, 22, 32) / 10;

  const profStats = PROFESSIONS.map((prof) => {
    const total = seeded(year, `${salt}-${prof}`, 42, 186) * multiplier;
    const avg = seeded(year, `${salt}-${prof}-avg`, 12, 38) / 10;
    const avgTotalProf = seeded(year, `${prof}-avg-total`, 38, 164) * multiplier;
    const share = (total / (totalTreatments || 1)) * 100;
    const avgShare = (avgTotalProf / (avgTotal || 1)) * 100;
    return { prof, total, avg, avgTotalProf, share, avgShare };
  }).sort((a, b) => b.total - a.total);

  const quantityLabel = isDaily ? 'טיפולים היום' : 'טיפולים (אמצע שבוע)';
  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'trt-total',
      isDaily ? 'סה״כ היום' : 'סה״כ שבוע',
      (totalTreatments / (avgTotal || 1)) * 100,
      formatNumber(totalTreatments),
      avgTotal,
      totalTreatments,
      Math.max(totalTreatments, avgTotal),
      avgTotal,
      quantityLabel,
    ),
    makeIndicator(
      'trt-avg',
      'ממוצע למאושפז/יום',
      avgPerPatient * 10,
      formatNumber(avgPerPatient, 2),
      2.6,
      Math.round(avgPerPatient * 10),
      40,
      26,
      'טיפולים למאושפז',
    ),
  ];
  if (profStats.length) {
    const top = profStats[0];
    indicators.push(makeIndicator(
      `trt-${top.prof}`,
      top.prof,
      top.share,
      formatNumber(top.total),
      top.avgShare,
      top.total,
      Math.max(top.total, top.avgTotalProf),
      top.avgTotalProf,
      quantityLabel,
    ));
  }

  return {
    code: '1.8',
    title: 'טיפולי מקצועות בריאות למאושפזים',
    icon: 'medical_services',
    help: 'סה״כ טיפולים לפי מקצוע וממוצע טיפולים למאושפז ביום (אמצע שבוע בלבד).',
    kpis: [
      { label: isDaily ? 'טיפולים היום' : 'טיפולים (אמצע שבוע)', value: formatNumber(totalTreatments), accent: 'primary' },
      { label: 'ממוצע למאושפז/יום', value: formatNumber(avgPerPatient, 2), accent: 'success' },
      { label: 'מקצועות פעילים', value: String(PROFESSIONS.length), accent: 'muted' },
    ],
    indicators,
    tableColumns: [
      { key: 'profession', label: 'מקצוע' },
      { key: 'total', label: isDaily ? 'היום' : 'שבוע', align: 'center' },
      { key: 'avgPerPatientDay', label: 'ממוצע/יום', align: 'center' },
      { key: 'weekdayOnly', label: 'הערה', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: ['מקצוע', 'סה״כ', 'ממוצע/יום'],
    chartRows: profStats.map((p) => [p.prof, p.total, p.avg]),
    compareChartColumns: ['מקצוע', 'בפועל', 'ממוצע'],
    compareChartRows: profStats.slice(0, 3).map((p) => [p.prof, p.total, p.avgTotalProf]),
  };
}

function buildDayRehabStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
): RehabStatusViewModel {
  const allDepts = getDepartmentsForSection('day-rehab');
  const activeDepts = selectedDepartments.length
    ? allDepts.filter((d) => selectedDepartments.includes(d))
    : allDepts;
  const now = new Date();
  const isDaily = mode === 'daily';
  const periodLabel = isDaily
    ? `סטטוס יומי · ${formatDateHe(now)}`
    : `סטטוס חודשי · ${getMonthRangeLabel(now)}`;
  const salt = isDaily ? `day-daily-${now.toDateString()}` : `day-monthly-${year}-${now.getMonth()}`;
  const multiplier = isDaily ? 1 : 5;

  const blocks: RehabStatusBlock[] = REHAB_DAY_METRICS.map((metric, index) =>
    buildDayRehabStatusBlock(metric, isDaily, year, salt, activeDepts, index, multiplier),
  );

  return {
    mode,
    periodLabel,
    totalBeds: 0,
    bedCapacityNote: activeDepts.length === allDepts.length
      ? `כל מחלקות שיקום היום (${allDepts.length} מחלקות)`
      : `${activeDepts.length} מחלקות שיקום יום נבחרו`,
    blocks,
  };
}

function buildDayRehabStatusBlock(
  metric: RehabMetricDefinition,
  isDaily: boolean,
  year: number,
  salt: string,
  depts: string[],
  index: number,
  multiplier: number,
): RehabStatusBlock {
  const code = metric.code || `2.${index + 1}`;
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const value = seeded(year, `${salt}-${metric.key}-${dept}`, 12, 88) * multiplier;
    const avg = seeded(year, `${metric.key}-${dept}-avg`, 10, 72) * multiplier;
    const share = seeded(year, `${salt}-${metric.key}-${dept}-sh`, 8, 34) + 0.2;
    return {
      id: `${metric.key}-${dept}`,
      department: dept,
      cells: {
        department: dept,
        value: formatNumber(value),
        share: formatPct(share),
        avg: formatNumber(avg),
      },
    };
  });

  const total = tableRows.reduce(
    (sum, row) => sum + Number(String(row.cells.value).replace(/,/g, '')),
    0,
  );
  const topDept = tableRows.slice().sort(
    (a, b) => Number(String(b.cells.value).replace(/,/g, '')) - Number(String(a.cells.value).replace(/,/g, '')),
  )[0];

  const kpis: RehabKpiCard[] = [
    {
      label: isDaily ? 'סה״כ היום' : 'סה״כ השבוע',
      value: formatNumber(total),
      accent: 'primary',
    },
    {
      label: 'מחלקות פעילות',
      value: String(depts.length),
      accent: 'success',
    },
    {
      label: topDept ? 'מחלקה מובילה' : 'מחלקה מובילה',
      value: topDept ? String(topDept.cells.department) : '—',
      accent: 'muted',
    },
  ];

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      `${metric.key}-total`,
      isDaily ? 'סה״כ היום' : 'סה״כ שבוע',
      Math.min(100, 62 + index * 4),
      formatNumber(total),
      Math.round(total * 0.92),
      total,
      Math.max(total, 1),
      Math.round(total * 0.92),
      isDaily ? 'יחידות היום' : 'יחידות שבוע',
    ),
  ];

  if (topDept) {
    const topValue = Number(String(topDept.cells.value).replace(/,/g, ''));
    indicators.push(makeIndicator(
      `${metric.key}-top`,
      String(topDept.cells.department),
      parseFloat(String(topDept.cells.share)),
      formatNumber(topValue),
      parseFloat(String(topDept.cells.share)) - 2,
      topValue,
      Math.max(topValue, 1),
      Math.round(topValue * 0.9),
      isDaily ? 'יחידות היום' : 'יחידות שבוע',
    ));
  }

  return {
    code,
    title: metric.label,
    icon: metric.icon,
    help: metric.help,
    kpis,
    indicators,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'value', label: isDaily ? 'היום' : 'שבוע', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
      { key: 'avg', label: 'ממוצע', align: 'center' },
    ],
    tableRows,
    chartType: isDaily ? 'ColumnChart' : 'LineChart',
    chartColumns: isDaily
      ? ['מחלקה', isDaily ? 'היום' : 'שבוע']
      : ['יום', 'ערך', 'ממוצע'],
    chartRows: isDaily
      ? tableRows.map((row) => [
        row.cells.department,
        Number(String(row.cells.value).replace(/,/g, '')),
      ])
      : WEEKDAY_LABELS.map((day, dayIndex) => [
        day,
        seeded(year, `${salt}-${metric.key}-day-${dayIndex}`, 20, 96) * multiplier,
        Math.round(total / 7),
      ]),
  };
}
