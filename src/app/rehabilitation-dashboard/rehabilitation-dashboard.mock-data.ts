import {
  getBedsForDepartment,
  getInpatientDepartmentsWithBeds,
  getTotalBedsForYear,
} from './rehabilitation-bed-capacity.constants';
import {
  MONTH_LABELS_HE,
  REHAB_DAY_DEPARTMENTS,
  REHAB_INPATIENT_DEPARTMENTS,
  RehabHospitalizationDaysMode,
  RehabKpiCard,
  RehabMetricKey,
  RehabPeriodMode,
  RehabTableColumn,
  RehabTableRow,
} from './rehabilitation-dashboard.models';

const PAYERS = ['כללית', 'מכבי', 'לאומית', 'מאוחדת', 'צה״ל + משרד הביטחון', 'אחר'];
const FUNDERS = ['קופת חולים', 'צה״ל + משרד הביטחון', 'פרטי', 'ביטוח לאומי'];
const PROFESSIONS = ['פיזיותרפיה', 'ריפוי בעיסוק', 'קלינאות תקשורת', 'פסיכולוגיה', 'סיעוד שיקומי'];
const SECTORS = ['שיקום פיזי', 'שיקום נוירולוגי', 'שיקום נשימתי', 'שיקום קוגניטיבי', 'שיקום גריאטרי'];

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

function formatCurrency(n: number): string {
  return `₪${formatNumber(Math.round(n))}`;
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function isDayMetric(metric: RehabMetricKey): boolean {
  return metric.indexOf('day-') === 0;
}

function defaultDepartments(metric: RehabMetricKey, year: number): string[] {
  return isDayMetric(metric) ? REHAB_DAY_DEPARTMENTS : getInpatientDepartmentsWithBeds(year);
}

function flattenRows<T>(arrays: T[][]): T[] {
  return arrays.reduce((acc, arr) => acc.concat(arr), [] as T[]);
}

function chartOptionsWithVAxisMax(maxValue: number, isDark = false, stacked = false): Record<string, unknown> {
  const base = baseChartOptions(isDark, stacked);
  const vAxis = (base.vAxis as Record<string, unknown>) || {};
  return {
    ...base,
    vAxis: { ...vAxis, maxValue },
  };
}

export interface RehabMockViewModel {
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

export function buildRehabMockViewModel(
  metric: RehabMetricKey,
  period: RehabPeriodMode,
  daysMode: RehabHospitalizationDaysMode,
  departments: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
): RehabMockViewModel {
  const activeDepts = departments.length ? departments : defaultDepartments(metric, year);
  const periodLabels = period === 'monthly'
    ? (month ? [MONTH_LABELS_HE[month]] : MONTH_LABELS_HE.slice(1))
  : ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].slice(0, 7);

  const periodCaption = period === 'monthly'
    ? (month ? `${MONTH_LABELS_HE[month]} ${year}` : `שנת ${year} – לפי חודשים`)
    : month
      ? `${MONTH_LABELS_HE[month]} ${year} – לפי ימים`
      : `שבוע אחרון – ${year}`;

  switch (metric) {
    case 'hospitalization-days':
      return buildHospitalizationDays(daysMode, period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'avg-los':
      return buildAvgLos(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'occupancy':
      return buildOccupancy(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'admissions-payer':
      return buildAdmissionsPayer(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'admissions-internal-external':
      return buildAdmissionsInternalExternal(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'recommended-targets':
      return buildRecommendedTargets(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'revenue-net':
      return buildRevenueNet(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'treatments':
      return buildTreatments(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-patients-payer':
      return buildDayPatientsPayer(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-patients-internal-external':
      return buildDayPatientsInternalExternal(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-discharges-recommendation':
      return buildDayDischargesRecommendation(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-treatments-daily-cumulative':
      return buildDayTreatmentsDailyCumulative(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-treatments-sectors':
      return buildDayTreatmentsSectors(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-treatments-per-position':
      return buildDayTreatmentsPerPosition(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-avg-treatments-per-patient':
      return buildDayAvgTreatmentsPerPatient(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    case 'day-treatments-individual-group':
      return buildDayTreatmentsIndividualGroup(period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
    default:
      return buildHospitalizationDays('gross', period, activeDepts, selectedDepartment, year, month, periodLabels, periodCaption);
  }
}

function baseChartOptions(isDark: boolean, stacked = false): Record<string, unknown> {
  return {
    legend: { position: 'top', alignment: 'center', textStyle: { fontSize: 12, color: isDark ? '#e5e7eb' : '#334155' } },
    chartArea: { left: 56, top: 48, right: 24, bottom: 48, width: '88%', height: '72%' },
    hAxis: {
      textStyle: { fontSize: 11, color: isDark ? '#cbd5e1' : '#475569' },
      slantedText: true,
      slantedTextAngle: 32,
    },
    vAxis: {
      textStyle: { fontSize: 11, color: isDark ? '#cbd5e1' : '#475569' },
      gridlines: { color: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)' },
      minValue: 0,
    },
    backgroundColor: 'transparent',
    isStacked: stacked,
    animation: { startup: true, duration: 500, easing: 'out' },
    tooltip: { textStyle: { fontSize: 12 } },
  };
}

function buildHospitalizationDays(
  daysMode: RehabHospitalizationDaysMode,
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const modeLabel = daysMode === 'gross' ? 'ברוטו' : 'נטו';
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', ...depts];
  const chartRows = periodLabels.map((label, idx) => {
    const row: (string | number)[] = [label];
    depts.forEach((dept) => {
      const base = daysMode === 'gross' ? 420 : 360;
      row.push(seeded(year + idx, `${dept}-${modeLabel}`, base - 80, base + 120));
    });
    return row;
  });

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const gross = seeded(year, dept, 9800, 14200);
    const net = Math.round(gross * 0.86);
    const value = daysMode === 'gross' ? gross : net;
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        gross: formatNumber(gross),
        net: formatNumber(net),
        delta: `${seeded(year, `${dept}-d`, -8, 12) > 0 ? '+' : ''}${seeded(year, `${dept}-d`, -8, 12)}%`,
      },
    };
  });

  const total = tableRows.reduce((sum, r) => {
    const raw = daysMode === 'gross' ? r.cells.gross : r.cells.net;
    return sum + Number(String(raw).replace(/,/g, ''));
  }, 0);

  return {
    chartHeading: `ימי אשפוז ${modeLabel} – לפי מחלקות שיקום`,
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#2563eb', '#7c3aed', '#0d9488', '#ea580c', '#db2777'] },
    kpis: [
      { label: `סה״כ ימי אשפוז ${modeLabel}`, value: formatNumber(total), accent: 'primary' },
      { label: 'מחלקות פעילות', value: String(depts.length), accent: 'muted' },
      { label: 'ממוצע למחלקה', value: formatNumber(Math.round(total / depts.length)), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'gross', label: 'ברוטו', align: 'center' },
      { key: 'net', label: 'נטו', align: 'center' },
      { key: 'delta', label: 'שינוי שנתי', align: 'center' },
    ],
    tableRows,
  };
}

function buildAvgLos(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'ממוצע ימים'];
  const chartRows = periodLabels.map((label, idx) => [
    label,
    seeded(year + idx, 'los', 18, 42) + seeded(year, label, 0, 8) / 10,
  ]);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const avg = seeded(year, dept, 22, 38) + 0.4;
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        avgDays: formatNumber(avg, 1),
        median: formatNumber(avg - 1.2, 1),
        admissions: formatNumber(seeded(year, `${dept}-adm`, 180, 420)),
      },
    };
  });

  const overall = tableRows.reduce((s, r) => s + Number(String(r.cells.avgDays).replace(/,/g, '')), 0) / tableRows.length;

  return {
    chartHeading: 'משך אשפוז ממוצע (ימים)',
    periodCaption,
    chartType: 'LineChart',
    chartColumns,
    chartRows,
    chartOptions: {
      ...baseChartOptions(false),
      curveType: 'function',
      pointSize: 6,
      colors: ['#7c3aed'],
    },
    kpis: [
      { label: 'ממוצע כללי', value: formatNumber(overall, 1), accent: 'primary' },
      { label: 'מחלקה הגבוהה', value: formatNumber(Math.max(...tableRows.map((r) => Number(String(r.cells.avgDays).replace(/,/g, '')))), 1), accent: 'warn' },
      { label: 'מחלקה הנמוכה', value: formatNumber(Math.min(...tableRows.map((r) => Number(String(r.cells.avgDays).replace(/,/g, '')))), 1), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'avgDays', label: 'ממוצע', align: 'center' },
      { key: 'median', label: 'חציון', align: 'center' },
      { key: 'admissions', label: 'קבלות', align: 'center' },
    ],
    tableRows,
  };
}

function buildOccupancy(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', ...depts];
  const chartRows = periodLabels.map((label, idx) => {
    const row: (string | number)[] = [label];
    depts.forEach((dept) => row.push(seeded(year + idx, `${dept}-occ`, 72, 96)));
    return row;
  });

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const beds = getBedsForDepartment(year, dept) || seeded(year, `${dept}-beds`, 14, 35);
    const occ = seeded(year, `${dept}-occ`, 72, 95);
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        occupancy: formatPct(occ),
        beds,
        occupied: Math.round((occ / 100) * beds),
      },
    };
  });

  const avgOcc = tableRows.reduce((s, r) => s + parseFloat(String(r.cells.occupancy)), 0) / tableRows.length;
  const totalBeds = getTotalBedsForYear(year);

  return {
    chartHeading: 'תפוסת מיטות (%)',
    periodCaption,
    chartType: 'AreaChart',
    chartColumns,
    chartRows,
    chartOptions: chartOptionsWithVAxisMax(100),
    kpis: [
      { label: 'תפוסה ממוצעת', value: formatPct(avgOcc), accent: 'primary' },
      { label: 'מיטות פעילות', value: formatNumber(totalBeds), sub: `קיבולת קבועה ${year}`, accent: 'muted' },
      { label: 'מיטות תפוסות', value: formatNumber(tableRows.reduce((s, r) => s + Number(r.cells.occupied), 0)), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'occupancy', label: 'תפוסה', align: 'center' },
      { key: 'beds', label: 'מיטות', align: 'center' },
      { key: 'occupied', label: 'תפוסות', align: 'center' },
    ],
    tableRows,
  };
}

function buildAdmissionsPayer(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', ...PAYERS];
  const chartRows = periodLabels.map((label, idx) => {
    const row: (string | number)[] = [label];
    PAYERS.forEach((payer) => row.push(seeded(year + idx, payer, 8, 48)));
    return row;
  });

  const tableRows: RehabTableRow[] = PAYERS.map((payer) => ({
    id: payer,
    highlight: selectedDepartment === payer,
    cells: {
      payer,
      admissions: formatNumber(seeded(year, payer, 120, 680)),
      share: formatPct(seeded(year, `${payer}-share`, 6, 28)),
      trend: `${seeded(year, `${payer}-t`, -6, 14) > 0 ? '▲' : '▼'} ${Math.abs(seeded(year, `${payer}-t`, -6, 14))}%`,
    },
  }));

  return {
    chartHeading: 'קבלות לפי גורם משלם',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false, true), isStacked: true },
    kpis: [
      { label: 'סה״כ קבלות', value: formatNumber(tableRows.reduce((s, r) => s + Number(String(r.cells.admissions).replace(/,/g, '')), 0)), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(62), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(14), accent: 'warn' },
    ],
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: 'קבלות', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
      { key: 'trend', label: 'מגמה', align: 'center' },
    ],
    tableRows,
  };
}

function buildAdmissionsInternalExternal(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['גורם מממן', 'פנים', 'חוץ'];
  const chartRows = FUNDERS.map((funder) => [
    funder,
    seeded(year, `${funder}-in`, 40, 180),
    seeded(year, `${funder}-out`, 12, 90),
  ]);

  const tableRows: RehabTableRow[] = flattenRows(FUNDERS.map((funder) => {
    const internal = seeded(year, `${funder}-in`, 40, 180);
    const external = seeded(year, `${funder}-out`, 12, 90);
    return [
      {
        id: `${funder}-in`,
        department: funder,
        highlight: selectedDepartment === funder,
        cells: { funder, direction: 'פנים', count: formatNumber(internal), share: formatPct((internal / (internal + external)) * 100) },
      },
      {
        id: `${funder}-out`,
        department: funder,
        cells: { funder, direction: 'חוץ', count: formatNumber(external), share: formatPct((external / (internal + external)) * 100) },
      },
    ];
  }));

  return {
    chartHeading: 'קבלות פנים / חוץ לפי גורם מממן',
    periodCaption,
    chartType: 'BarChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#2563eb', '#f59e0b'] },
    kpis: [
      { label: 'קבלות פנים', value: formatNumber(chartRows.reduce((s, r) => s + Number(r[1]), 0)), accent: 'primary' },
      { label: 'קבלות חוץ', value: formatNumber(chartRows.reduce((s, r) => s + Number(r[2]), 0)), accent: 'warn' },
      { label: 'יחס פנים/חוץ', value: '2.4 : 1', accent: 'muted' },
    ],
    tableColumns: [
      { key: 'funder', label: 'גורם מממן' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'count', label: 'קבלות', align: 'center' },
      { key: 'share', label: 'נתח בגורם', align: 'center' },
    ],
    tableRows,
  };
}

function buildRecommendedTargets(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['מחלקה', 'בפועל', 'יעד מומלץ'];
  const chartRows = depts.map((dept) => {
    const target = seeded(year, `${dept}-target`, 80, 95);
    const actual = target + seeded(year, `${dept}-actual`, -12, 8);
    return [dept, actual, target];
  });

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const target = seeded(year, `${dept}-target`, 80, 95);
    const actual = target + seeded(year, `${dept}-actual`, -12, 8);
    const gap = actual - target;
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        actual: formatPct(actual),
        target: formatPct(target),
        gap: `${gap >= 0 ? '+' : ''}${formatNumber(gap, 1)}%`,
        status: gap >= 0 ? 'עומד ביעד' : 'מתחת ליעד',
      },
    };
  });

  return {
    chartHeading: 'יעדים מומלצים מול ביצוע (תפוסה / יעדי שיקום)',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#2563eb', '#94a3b8'] },
    kpis: [
      { label: 'מחלקות בעמידה ביעד', value: `${tableRows.filter((r) => String(r.cells.status).includes('עומד')).length}/${depts.length}`, accent: 'success' },
      { label: 'פער ממוצע', value: formatPct(-2.4), accent: 'warn' },
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
  };
}

function buildRevenueNet(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'הכנסות נטו (אלפי ₪)'];
  const chartRows = periodLabels.map((label, idx) => [
    label,
    seeded(year + idx, 'rev', 820, 1480),
  ]);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const revenue = seeded(year, `${dept}-rev`, 1200000, 4200000);
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        revenue: formatCurrency(revenue),
        perDay: formatCurrency(revenue / seeded(year, `${dept}-days`, 2800, 5200)),
        yoy: `${seeded(year, `${dept}-yoy`, -4, 18) > 0 ? '+' : ''}${seeded(year, `${dept}-yoy`, -4, 18)}%`,
      },
    };
  });

  const totalRev = tableRows.reduce((s, r) => s + Number(String(r.cells.revenue).replace(/[₪,]/g, '')), 0);

  return {
    chartHeading: 'הכנסות לפי מחיר נטו',
    periodCaption,
    chartType: 'ComboChart',
    chartColumns: [
      'תקופה',
      'הכנסות נטו (אלפי ₪)',
      { type: 'string', role: 'annotation' },
    ],
    chartRows: chartRows.map((row) => [row[0], row[1], formatNumber(Number(row[1]))]),
    chartOptions: {
      ...baseChartOptions(false),
      seriesType: 'bars',
      series: { 0: { type: 'bars', color: '#0d9488' } },
    },
    kpis: [
      { label: 'סה״כ הכנסות נטו', value: formatCurrency(totalRev), accent: 'primary' },
      { label: 'ממוצע למחלקה', value: formatCurrency(totalRev / depts.length), accent: 'success' },
      { label: 'צמיחה שנתית', value: '+6.8%', accent: 'warn' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'revenue', label: 'הכנסות', align: 'center' },
      { key: 'perDay', label: 'ליום אשפוז', align: 'center' },
      { key: 'yoy', label: 'שינוי שנתי', align: 'center' },
    ],
    tableRows,
  };
}

function buildTreatments(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['מקצוע', 'סה״כ טיפולים', 'ממוצע למאושפז/יום'];
  const chartRows = PROFESSIONS.map((prof) => {
    const total = seeded(year, prof, 1200, 4800);
    const avg = (seeded(year, `${prof}-avg`, 12, 38) / 10);
    return [prof, total, avg];
  });

  const tableRows: RehabTableRow[] = PROFESSIONS.map((prof) => {
    const total = seeded(year, prof, 1200, 4800);
    const avg = seeded(year, `${prof}-avg`, 12, 38) / 10;
    return {
      id: prof,
      highlight: selectedDepartment === prof,
      cells: {
        profession: prof,
        total: formatNumber(total),
        avgPerPatientDay: formatNumber(avg, 2),
        weekdayOnly: 'אמצע שבוע',
      },
    };
  });

  return {
    chartHeading: 'טיפולי מקצועות בריאות – סה״כ וממוצע יומי (אמצע שבוע)',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#2563eb', '#db2777'] },
    kpis: [
      { label: 'סה״כ טיפולים', value: formatNumber(chartRows.reduce((s, r) => s + Number(r[1]), 0)), accent: 'primary' },
      { label: 'ממוצע למאושפז/יום', value: formatNumber(2.6, 2), accent: 'success' },
      { label: 'מקצועות פעילים', value: String(PROFESSIONS.length), accent: 'muted' },
    ],
    tableColumns: [
      { key: 'profession', label: 'מקצוע' },
      { key: 'total', label: 'סה״כ', align: 'center' },
      { key: 'avgPerPatientDay', label: 'ממוצע/יום', align: 'center' },
      { key: 'weekdayOnly', label: 'הערה', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayPatientsPayer(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', ...PAYERS];
  const chartRows = periodLabels.map((label, idx) => {
    const row: (string | number)[] = [label];
    PAYERS.forEach((payer) => row.push(seeded(year + idx, `day-${payer}`, 12, 68)));
    return row;
  });

  const tableRows: RehabTableRow[] = PAYERS.map((payer) => ({
    id: payer,
    highlight: selectedDepartment === payer,
    cells: {
      payer,
      patients: formatNumber(seeded(year, `day-${payer}`, 80, 420)),
      share: formatPct(seeded(year, `day-${payer}-share`, 8, 32)),
      trend: `${seeded(year, `day-${payer}-t`, -5, 12) > 0 ? '▲' : '▼'} ${Math.abs(seeded(year, `day-${payer}-t`, -5, 12))}%`,
    },
  }));

  return {
    chartHeading: 'מטופלי שיקום יום – התחייבויות חדשות לפי קופות',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false, true), isStacked: true },
    kpis: [
      { label: 'סה״כ מטופלים חדשים', value: formatNumber(tableRows.reduce((s, r) => s + Number(String(r.cells.patients).replace(/,/g, '')), 0)), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(68), accent: 'success' },
      { label: 'ממוצע לקופה', value: formatNumber(186), accent: 'muted' },
    ],
    tableColumns: [
      { key: 'payer', label: 'קופה' },
      { key: 'patients', label: 'מטופלים', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
      { key: 'trend', label: 'מגמה', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayPatientsInternalExternal(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['מחלקה', 'פנים', 'חוץ'];
  const chartRows = depts.map((dept) => [
    dept,
    seeded(year, `${dept}-day-in`, 30, 120),
    seeded(year, `${dept}-day-out`, 10, 55),
  ]);

  const tableRows: RehabTableRow[] = flattenRows(depts.map((dept) => {
    const internal = seeded(year, `${dept}-day-in`, 30, 120);
    const external = seeded(year, `${dept}-day-out`, 10, 55);
    return [
      {
        id: `${dept}-in`,
        department: dept,
        highlight: selectedDepartment === dept,
        cells: { department: dept, direction: 'פנים', patients: formatNumber(internal), share: formatPct((internal / (internal + external)) * 100) },
      },
      {
        id: `${dept}-out`,
        department: dept,
        cells: { department: dept, direction: 'חוץ', patients: formatNumber(external), share: formatPct((external / (internal + external)) * 100) },
      },
    ];
  }));

  return {
    chartHeading: 'מטופלי שיקום יום – פנים / חוץ (התחייבויות חדשות)',
    periodCaption,
    chartType: 'BarChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#2563eb', '#f59e0b'] },
    kpis: [
      { label: 'מטופלים פנים', value: formatNumber(chartRows.reduce((s, r) => s + Number(r[1]), 0)), accent: 'primary' },
      { label: 'מטופלים חוץ', value: formatNumber(chartRows.reduce((s, r) => s + Number(r[2]), 0)), accent: 'warn' },
      { label: 'יחס פנים/חוץ', value: '2.1 : 1', accent: 'muted' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'patients', label: 'מטופלים', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayDischargesRecommendation(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'מטופלים אצלנו', 'לא מטופלים אצלנו'];
  const chartRows = periodLabels.map((label, idx) => [
    label,
    seeded(year + idx, 'disch-ours', 18, 62),
    seeded(year + idx, 'disch-not-ours', 8, 38),
  ]);

  const ours = seeded(year, 'disch-total-ours', 280, 520);
  const notOurs = seeded(year, 'disch-total-not', 120, 280);
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const deptOurs = seeded(year, `${dept}-ours`, 40, 120);
    const deptNot = seeded(year, `${dept}-not`, 15, 60);
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        ours: formatNumber(deptOurs),
        notOurs: formatNumber(deptNot),
        conversion: formatPct((deptOurs / (deptOurs + deptNot)) * 100),
      },
    };
  });

  return {
    chartHeading: 'משחררים מאשפוז שיקום עם המלצה לשיקום יום',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#0d9488', '#ea580c'] },
    kpis: [
      { label: 'מטופלים אצלנו', value: formatNumber(ours), accent: 'success' },
      { label: 'לא מטופלים אצלנו', value: formatNumber(notOurs), accent: 'warn' },
      { label: 'שיעור המרה', value: formatPct((ours / (ours + notOurs)) * 100), accent: 'primary' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקת מקור' },
      { key: 'ours', label: 'מטופלים אצלנו', align: 'center' },
      { key: 'notOurs', label: 'לא מטופלים', align: 'center' },
      { key: 'conversion', label: 'המרה', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayTreatmentsDailyCumulative(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  let cumulative = 0;
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'ליום', 'מצטבר'];
  const chartRows = periodLabels.map((label, idx) => {
    const daily = seeded(year + idx, 'day-treat', 120, 280);
    cumulative += daily;
    return [label, daily, cumulative];
  });

  const tableRows: RehabTableRow[] = depts.map((dept) => ({
    id: dept,
    department: dept,
    highlight: selectedDepartment === dept,
    cells: {
      department: dept,
      daily: formatNumber(seeded(year, `${dept}-daily`, 80, 220)),
      cumulative: formatNumber(seeded(year, `${dept}-cum`, 1200, 4800)),
      avgDaily: formatNumber(seeded(year, `${dept}-avg`, 90, 180)),
    },
  }));

  return {
    chartHeading: 'טיפולי שיקום יום – יומי ומצטבר',
    periodCaption,
    chartType: 'ComboChart',
    chartColumns,
    chartRows,
    chartOptions: {
      ...baseChartOptions(false),
      seriesType: 'bars',
      series: {
        0: { type: 'bars', color: '#2563eb' },
        1: { type: 'line', color: '#7c3aed', lineWidth: 2, pointSize: 5 },
      },
    },
    kpis: [
      { label: 'טיפולים היום', value: formatNumber(Number(chartRows[chartRows.length - 1]?.[1] || 0)), accent: 'primary' },
      { label: 'מצטבר תקופה', value: formatNumber(cumulative), accent: 'success' },
      { label: 'ממוצע יומי', value: formatNumber(Math.round(cumulative / chartRows.length)), accent: 'muted' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'daily', label: 'ליום', align: 'center' },
      { key: 'cumulative', label: 'מצטבר', align: 'center' },
      { key: 'avgDaily', label: 'ממוצע', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayTreatmentsSectors(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['סקטור', 'טיפולים'];
  const chartRows = SECTORS.map((sector) => [sector, seeded(year, sector, 400, 1800)]);

  const tableRows: RehabTableRow[] = SECTORS.map((sector) => ({
    id: sector,
    highlight: selectedDepartment === sector,
    cells: {
      sector,
      treatments: formatNumber(seeded(year, sector, 400, 1800)),
      share: formatPct(seeded(year, `${sector}-share`, 10, 28)),
      patients: formatNumber(seeded(year, `${sector}-pat`, 60, 220)),
    },
  }));

  const total = chartRows.reduce((s, r) => s + Number(r[1]), 0);

  return {
    chartHeading: 'התפלגות טיפולי שיקום יום לפי סקטורים',
    periodCaption,
    chartType: 'PieChart',
    chartColumns,
    chartRows,
    chartOptions: {
      pieHole: 0.35,
      legend: { position: 'right', alignment: 'center' },
      chartArea: { left: 10, top: 20, width: '90%', height: '80%' },
      backgroundColor: 'transparent',
    },
    kpis: [
      { label: 'סה״כ טיפולים', value: formatNumber(total), accent: 'primary' },
      { label: 'סקטורים פעילים', value: String(SECTORS.length), accent: 'muted' },
      { label: 'סקטור מוביל', value: SECTORS[0], accent: 'success' },
    ],
    tableColumns: [
      { key: 'sector', label: 'סקטור' },
      { key: 'treatments', label: 'טיפולים', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
      { key: 'patients', label: 'מטופלים', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayTreatmentsPerPosition(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['סקטור', 'טיפולים למשרה'];
  const chartRows = SECTORS.map((sector) => [sector, seeded(year, `${sector}-pos`, 8, 24)]);

  const tableRows: RehabTableRow[] = SECTORS.map((sector) => ({
    id: sector,
    highlight: selectedDepartment === sector,
    cells: {
      sector,
      perPosition: formatNumber(seeded(year, `${sector}-pos`, 8, 24), 1),
      positions: formatNumber(seeded(year, `${sector}-staff`, 4, 18)),
      total: formatNumber(seeded(year, `${sector}-tot`, 120, 480)),
    },
  }));

  return {
    chartHeading: 'טיפולי שיקום יום למשרה לפי סקטורים',
    periodCaption,
    chartType: 'BarChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), colors: ['#7c3aed'] },
    kpis: [
      { label: 'ממוצע למשרה', value: formatNumber(14.2, 1), accent: 'primary' },
      { label: 'סקטור עמוס', value: 'שיקום פיזי', accent: 'warn' },
      { label: 'תקנים פעילים', value: formatNumber(42), accent: 'muted' },
    ],
    tableColumns: [
      { key: 'sector', label: 'סקטור' },
      { key: 'perPosition', label: 'למשרה', align: 'center' },
      { key: 'positions', label: 'משרות', align: 'center' },
      { key: 'total', label: 'סה״כ', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayAvgTreatmentsPerPatient(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'ממוצע טיפולים למטופל'];
  const chartRows = periodLabels.map((label, idx) => [
    label,
    seeded(year + idx, 'avg-treat-pat', 18, 42) / 10,
  ]);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const avg = seeded(year, `${dept}-avg-pat`, 22, 38) / 10;
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        avgPerDay: formatNumber(avg, 2),
        patients: formatNumber(seeded(year, `${dept}-pat`, 80, 220)),
        treatments: formatNumber(seeded(year, `${dept}-tr`, 400, 1200)),
      },
    };
  });

  const overall = tableRows.reduce((s, r) => s + Number(String(r.cells.avgPerDay).replace(/,/g, '')), 0) / tableRows.length;

  return {
    chartHeading: 'ממוצע טיפולים ליום למטופל שיקום יום',
    periodCaption,
    chartType: 'LineChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false), curveType: 'function', colors: ['#0d9488'] },
    kpis: [
      { label: 'ממוצע כללי', value: formatNumber(overall, 2), accent: 'primary' },
      { label: 'מחלקה גבוהה', value: formatNumber(3.8, 2), accent: 'warn' },
      { label: 'מחלקה נמוכה', value: formatNumber(2.1, 2), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'avgPerDay', label: 'ממוצע/יום', align: 'center' },
      { key: 'patients', label: 'מטופלים', align: 'center' },
      { key: 'treatments', label: 'טיפולים', align: 'center' },
    ],
    tableRows,
  };
}

function buildDayTreatmentsIndividualGroup(
  period: RehabPeriodMode,
  depts: string[],
  selectedDepartment: string | null,
  year: number,
  month: number | null,
  periodLabels: string[],
  periodCaption: string,
): RehabMockViewModel {
  const individual = seeded(year, 'indiv', 1800, 3200);
  const group = seeded(year, 'group', 900, 2100);
  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', 'פרטני', 'קבוצתי'];
  const chartRows = periodLabels.map((label, idx) => [
    label,
    seeded(year + idx, 'indiv', 80, 180),
    seeded(year + idx, 'group', 40, 120),
  ]);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const ind = seeded(year, `${dept}-ind`, 200, 680);
    const grp = seeded(year, `${dept}-grp`, 100, 420);
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        individual: formatNumber(ind),
        group: formatNumber(grp),
        ratio: `${formatPct((ind / (ind + grp)) * 100)} פרטני`,
      },
    };
  });

  return {
    chartHeading: 'טיפולי שיקום יום – פרטני / קבוצתי',
    periodCaption,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: { ...baseChartOptions(false, true), isStacked: true, colors: ['#2563eb', '#db2777'] },
    kpis: [
      { label: 'טיפולים פרטניים', value: formatNumber(individual), accent: 'primary' },
      { label: 'טיפולים קבוצתיים', value: formatNumber(group), accent: 'success' },
      { label: 'יחס פרטני/קבוצתי', value: '1.6 : 1', accent: 'muted' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'individual', label: 'פרטני', align: 'center' },
      { key: 'group', label: 'קבוצתי', align: 'center' },
      { key: 'ratio', label: 'יחס', align: 'center' },
    ],
    tableRows,
  };
}

export function applyDarkChartOptions(options: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(options)) as Record<string, unknown>;
  const legend = (clone.legend as Record<string, unknown>) || {};
  legend.textStyle = { fontSize: 12, color: '#e5e7eb' };
  clone.legend = legend;
  const hAxis = (clone.hAxis as Record<string, unknown>) || {};
  hAxis.textStyle = { fontSize: 11, color: '#cbd5e1' };
  clone.hAxis = hAxis;
  const vAxis = (clone.vAxis as Record<string, unknown>) || {};
  vAxis.textStyle = { fontSize: 11, color: '#cbd5e1' };
  vAxis.gridlines = { color: 'rgba(148,163,184,0.2)' };
  clone.vAxis = vAxis;
  return clone;
}
