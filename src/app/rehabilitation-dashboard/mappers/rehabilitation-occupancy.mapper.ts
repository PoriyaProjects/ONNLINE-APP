import {
  getBedCapacityForYear,
  getBedsForDepartment,
  getOccupancyDepartmentsForYear,
  getTotalBedsForYear,
  mapToOccupancyDepartment,
} from '../constants/rehabilitation-bed-capacity.constants';
import {
  MONTH_LABELS_HE,
  RehabDashboardViewModel,
  RehabPeriodMode,
  RehabTableRow,
} from '../models/rehabilitation-dashboard.models';
import { RehabOccupancyDateRange, RehabilitationOccupancyDto } from '../models/rehabilitation-occupancy.models';
import {
  RehabIndicatorTone,
  RehabStatusBlock,
  RehabStatusIndicator,
} from '../models/rehabilitation-status.models';
import { buildRehabColumnChartOptions } from '../utils/rehabilitation-chart.utils';

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDeptName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function resolveBeds(year: number, departmentName: string): number {
  const direct = getBedsForDepartment(year, departmentName);
  if (direct > 0) {
    return direct;
  }
  const normalized = normalizeDeptName(departmentName);
  const match = getBedCapacityForYear(year).find(
    (row) => normalizeDeptName(row.department) === normalized,
  );
  return match?.beds ?? 0;
}

function toneFromDelta(delta: number): RehabIndicatorTone {
  if (delta >= 4) return 'excellent';
  if (delta >= 0) return 'good';
  if (delta >= -4) return 'warn';
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
    tone: toneFromDelta(valuePct - averagePct),
  };
}

export function getDashboardOccupancyDateRange(
  year: number,
  month: number | null,
  period: RehabPeriodMode,
): RehabOccupancyDateRange {
  const today = new Date();
  if (period === 'daily') {
    let end = today;
    if (year < today.getFullYear()) {
      end = month ? new Date(year, month, 0) : new Date(year, 11, 31);
    } else if (year > today.getFullYear()) {
      end = month ? new Date(year, month, 0) : new Date(year, 0, 1);
    } else if (month) {
      end = new Date(year, month, 0);
      if (end > today) {
        end = today;
      }
    }
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { fromDate: formatDateIso(start), toDate: formatDateIso(end) };
  }

  if (month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { fromDate: formatDateIso(start), toDate: formatDateIso(end) };
  }

  const yearEnd = year === today.getFullYear()
    ? today
    : new Date(year, 11, 31);
  return {
    fromDate: `${year}-01-01`,
    toDate: formatDateIso(yearEnd),
  };
}

/** Israeli rehab week: Sun–Thu work; Fri–Sat off. */
const REHAB_NON_WORKING_WEEKDAYS = new Set([5, 6]);

export interface RehabWorkWeekDay {
  day: number;
  short: string;
  label: string;
  working: boolean;
  isToday: boolean;
  isQueryDay: boolean;
}

export const REHAB_WORK_WEEK_DAYS: Omit<RehabWorkWeekDay, 'isToday' | 'isQueryDay'>[] = [
  { day: 0, short: 'א׳', label: 'ראשון', working: true },
  { day: 1, short: 'ב׳', label: 'שני', working: true },
  { day: 2, short: 'ג׳', label: 'שלישי', working: true },
  { day: 3, short: 'ד׳', label: 'רביעי', working: true },
  { day: 4, short: 'ה׳', label: 'חמישי', working: true },
  { day: 5, short: 'ו׳', label: 'שישי', working: false },
  { day: 6, short: 'ש׳', label: 'שבת', working: false },
];

export function isRehabNonWorkingDay(date: Date): boolean {
  return REHAB_NON_WORKING_WEEKDAYS.has(date.getDay());
}

/** Daily status: last working day before today (skip Fri/Sat; today often not loaded yet). */
export function getStatusDailyQueryDate(reference = new Date()): Date {
  const date = new Date(reference);
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  while (isRehabNonWorkingDay(date)) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

export function getRehabWorkWeekStrip(reference = new Date()): RehabWorkWeekDay[] {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  const queryDate = getStatusDailyQueryDate(reference);
  return REHAB_WORK_WEEK_DAYS.map((entry) => ({
    ...entry,
    isToday: today.getDay() === entry.day,
    isQueryDay: queryDate.getDay() === entry.day,
  }));
}

export function formatStatusDateHe(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getStatusDailyWeekdayLabel(reference = new Date()): string {
  return getStatusDailyQueryDate(reference).toLocaleDateString('he-IL', { weekday: 'long' });
}

export function getStatusDailyDisplayLabel(isDaily: boolean, reference = new Date()): string {
  if (!isDaily) {
    return '30 ימים';
  }
  return formatStatusDateHe(getStatusDailyQueryDate(reference));
}

export function getStatusOccupancyDateRange(
  mode: 'daily' | 'monthly',
): RehabOccupancyDateRange {
  const today = new Date();
  if (mode === 'daily') {
    const iso = formatDateIso(getStatusDailyQueryDate(today));
    return { fromDate: iso, toDate: iso };
  }
  const end = getStatusDailyQueryDate(today);
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return { fromDate: formatDateIso(start), toDate: formatDateIso(end) };
}

/** Client display window for 1.7 — server may ignore FromDate/ToDate. */
export function getRevenueNetDateRange(reference = new Date()): RehabOccupancyDateRange {
  const today = new Date(reference);
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return {
    fromDate: formatDateIso(start),
    toDate: formatDateIso(end),
  };
}

export function formatRevenueNetMonthLabel(reference = new Date()): string {
  const range = getRevenueNetDateRange(reference);
  return `11 חודשים · עד חודש קודם · ${range.fromDate} – ${range.toDate}`;
}

function normalizeOccupancyRows(rows: RehabilitationOccupancyDto[]): RehabilitationOccupancyDto[] {
  return rows
    .map((row) => {
      const canonical = mapToOccupancyDepartment(row.departmentName);
      if (!canonical) {
        return null;
      }
      return { ...row, departmentName: canonical };
    })
    .filter((row): row is RehabilitationOccupancyDto => !!row);
}

function filterRowsByDepartments(
  rows: RehabilitationOccupancyDto[],
  selectedDepartments: string[],
): RehabilitationOccupancyDto[] {
  const occupancyRows = normalizeOccupancyRows(rows);
  if (!selectedDepartments.length) {
    return occupancyRows;
  }
  const selected = new Set(selectedDepartments.map(normalizeDeptName));
  return occupancyRows.filter((row) => selected.has(normalizeDeptName(row.departmentName)));
}

function getDisplayDepartments(
  year: number,
  selectedDepartments: string[],
): { department: string; beds: number }[] {
  return getOccupancyDepartmentsForYear(year, selectedDepartments).map((row) => ({
    department: row.department,
    beds: row.beds,
  }));
}

function formatOccupancyFraction(occupied: number, beds: number): string {
  return beds > 0 ? `${occupied}/${beds}` : `${occupied}`;
}

function occupancyPct(occupied: number, beds: number): number {
  if (beds <= 0) {
    return 0;
  }
  return (occupied / beds) * 100;
}

export function mapOccupancyRowsToDashboardViewModel(
  rows: RehabilitationOccupancyDto[],
  year: number,
  month: number | null,
  period: RehabPeriodMode,
  selectedDepartments: string[],
  selectedDepartment: string | null,
  periodCaption: string,
): RehabDashboardViewModel {
  const filtered = filterRowsByDepartments(rows, selectedDepartments);
  const depts = getDisplayDepartments(year, selectedDepartments);
  const departments = depts.map((dept) => dept.department);

  const chartColumns: (string | Record<string, unknown>)[] = [
    'חודש',
    'אחוז תפוסה',
    { type: 'string', role: 'annotation' },
  ];
  const chartRows = buildDashboardChartRows(filtered, depts, year, period);
  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const latest = filtered
      .filter((row) => row.departmentName === dept.department)
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop();
    const beds = dept.beds;
    const occupied = latest?.occupiedPatients ?? 0;
    const occ = occupancyPct(occupied, beds);
    return {
      id: dept.department,
      department: dept.department,
      highlight: selectedDepartment === dept.department,
      cells: {
        department: dept.department,
        occupancy: beds > 0 ? formatPct(occ) : '—',
        beds: beds || '—',
        occupied,
        occupancyFraction: formatOccupancyFraction(occupied, beds),
      },
    };
  });

  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  const totalOccupied = tableRows.reduce((sum, row) => sum + Number(row.cells.occupied), 0);
  const avgOcc = tableRows.length
    ? tableRows.reduce((sum, row) => sum + parseFloat(String(row.cells.occupancy).replace('%', '') || '0'), 0) / tableRows.length
    : 0;
  const dates = Array.from(new Set(filtered.map((row) => row.date))).sort();
  const latestDate = dates[dates.length - 1] || formatDateIso(new Date());

  return {
    chartHeading: 'תפוסת מיטות — אחוז תפוסה ממוצע',
    periodCaption: `${periodCaption} · נתונים ממערכת (עד ${formatChartPeriodLabel(latestDate, period)})`,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartNote: period === 'monthly'
      ? 'כל עמודה = ממוצע אחוז התפוסה בחודש (מיטות תפוסות מתוך קיבולת).'
      : 'כל עמודה = אחוז התפוסה ביום (7 ימים אחרונים).',
    chartOptions: buildRehabColumnChartOptions({
      hTitle: period === 'monthly' ? 'חודש' : 'יום',
      vTitle: 'אחוז תפוסה',
      vMin: 0,
      vMax: 100,
      vFormat: "#'%'",
    }),
    kpis: [
      { label: 'תפוסה ממוצעת', value: formatPct(avgOcc), accent: 'primary' },
      {
        label: 'מיטות פעילות',
        value: formatNumber(totalBeds),
        sub: `קיבולת קבועה ${year}`,
        accent: 'muted',
      },
      { label: 'מיטות תפוסות', value: formatNumber(totalOccupied), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'occupancy', label: 'תפוסה', align: 'center' },
      { key: 'beds', label: 'מיטות', align: 'center' },
      { key: 'occupied', label: 'תפוסות', align: 'center' },
      { key: 'occupancyFraction', label: 'מתוך קיבולת', align: 'center' },
    ],
    tableRows,
  };
}

export function mapOccupancyRowsToStatusBlock(
  rows: RehabilitationOccupancyDto[],
  isDaily: boolean,
  year: number,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterRowsByDepartments(rows, selectedDepartments);
  const depts = getDisplayDepartments(year, selectedDepartments);
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0) || getTotalBedsForYear(year);

  const dailyLabel = getStatusDailyWeekdayLabel();
  const targetDate = isDaily
    ? (filtered.map((row) => row.date).sort().pop() || formatDateIso(new Date()))
    : null;

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const deptRows = filtered.filter((row) => row.departmentName === dept.department);
    const occupied = isDaily
      ? (deptRows.find((row) => row.date === targetDate)?.occupiedPatients
        ?? deptRows[deptRows.length - 1]?.occupiedPatients
        ?? 0)
      : Math.round(
        deptRows.reduce((sum, row) => sum + row.occupiedPatients, 0)
          / Math.max(deptRows.length, 1),
      );
    const occ = occupancyPct(occupied, dept.beds);
    return {
      id: `occ-${dept.department}`,
      department: dept.department,
      cells: {
        department: dept.department,
        beds: dept.beds || '—',
        occupied,
        occupancy: dept.beds > 0 ? formatPct(occ) : '—',
        available: dept.beds > 0 ? dept.beds - occupied : '—',
        occupancyFraction: formatOccupancyFraction(occupied, dept.beds),
      },
    };
  });

  const totalOccupied = tableRows.reduce((sum, row) => sum + Number(row.cells.occupied), 0);
  const overallPct = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;
  const avgOccupancyPct = isDaily ? overallPct : computeWeeklyAveragePct(filtered, depts);

  const byOccupancy = depts
    .slice()
    .sort((a, b) => {
      const rowA = tableRows.find((row) => row.department === a.department);
      const rowB = tableRows.find((row) => row.department === b.department);
      return Number(rowB?.cells.occupied ?? 0) - Number(rowA?.cells.occupied ?? 0);
    });

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'occ-total',
      isDaily ? `תפוסה כללית (${dailyLabel})` : 'ממוצע חודשי',
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
    const top = byOccupancy[0];
    const row = tableRows.find((item) => item.department === top.department);
    const occ = parseFloat(String(row?.cells.occupancy).replace('%', '') || '0');
    indicators.push(makeIndicator(
      `occ-${top.department}`,
      top.department,
      occ,
      formatPct(occ),
      avgOccupancyPct,
      Number(row?.cells.occupied ?? 0),
      top.beds || 1,
      Math.round((avgOccupancyPct / 100) * (top.beds || 1)),
      'התפוסה הגבוהה',
    ));
  }
  if (byOccupancy.length > 1) {
    const low = byOccupancy[byOccupancy.length - 1];
    const row = tableRows.find((item) => item.department === low.department);
    const occ = parseFloat(String(row?.cells.occupancy).replace('%', '') || '0');
    indicators.push(makeIndicator(
      `occ-${low.department}`,
      low.department,
      occ,
      formatPct(occ),
      avgOccupancyPct,
      Number(row?.cells.occupied ?? 0),
      low.beds || 1,
      Math.round((avgOccupancyPct / 100) * (low.beds || 1)),
      'התפוסה הנמוכה',
    ));
  }

  let chartRows: (string | number)[][];
  if (isDaily) {
    chartRows = tableRows.map((row) => {
      const occupied = Number(row.cells.occupied);
      const beds = Number(row.cells.beds) || 0;
      return [
        row.cells.department,
        occupied,
        formatOccupancyFraction(occupied, beds),
        beds,
      ];
    });
  } else {
    chartRows = buildWeeklyChartRows(filtered, depts);
  }

  return {
    code: '1.3',
    title: 'תפוסה',
    icon: 'bed',
    help: 'תפוסות מיטות מתוך קיבולת קבועה (מקור: Chameleon – Hospitalizations).',
    kpis: [
      {
        label: isDaily ? `תפוסה (${dailyLabel})` : 'תפוסה ממוצעת (30 ימים)',
        value: formatPct(overallPct),
        accent: 'primary',
      },
      {
        label: 'מיטות תפוסות',
        value: `${formatNumber(totalOccupied)} / ${formatNumber(totalBeds)}`,
        accent: 'success',
      },
      {
        label: 'מיטות פנויות',
        value: formatNumber(Math.max(totalBeds - totalOccupied, 0)),
        accent: 'muted',
      },
    ],
    indicators,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'beds', label: 'מיטות', align: 'center' },
      { key: 'occupied', label: isDaily ? `תפוסות (${dailyLabel})` : 'ממוצע תפוסות', align: 'center' },
      { key: 'occupancyFraction', label: 'מתוך קיבולת', align: 'center' },
      { key: 'occupancy', label: 'תפוסה %', align: 'center' },
      { key: 'available', label: 'פנויות', align: 'center' },
    ],
    tableRows,
    chartType: isDaily ? 'ColumnChart' : 'LineChart',
    chartColumns: isDaily
      ? ['מחלקה', 'תפוסות', { type: 'string', role: 'annotation' }, 'קיבולת']
      : ['יום', 'תפוסות', { type: 'string', role: 'annotation' }, 'קיבולת'],
    chartRows,
  };
}

function computeWeeklyAveragePct(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
): number {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  if (!dates.length) {
    return 0;
  }
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  const dailyPcts = dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const occupied = dayRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
    return occupancyPct(occupied, totalBeds);
  });
  return dailyPcts.reduce((sum, value) => sum + value, 0) / dailyPcts.length;
}

function buildWeeklyChartRows(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
): (string | number)[][] {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  return dates.map((date, index) => {
    const dayRows = rows.filter((row) => row.date === date);
    const occupied = dayRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
    const label = WEEKDAY_LABELS[index] || date.slice(5);
    return [
      label,
      occupied,
      formatOccupancyFraction(occupied, totalBeds),
      totalBeds,
    ];
  });
}

function buildDashboardChartRows(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
  year: number,
  period: RehabPeriodMode,
): (string | number)[][] {
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  if (totalBeds <= 0) {
    return [];
  }

  if (period === 'monthly') {
    const today = new Date();
    const lastMonth = year === today.getFullYear() ? today.getMonth() + 1 : 12;
    return MONTH_LABELS_HE.slice(1, lastMonth + 1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const { occupied, pct } = computePeriodOccupancy(monthRows, depts, totalBeds);
      return [
        label,
        Math.round(pct * 10) / 10,
        `${formatPct(pct)} · ${formatOccupancyFraction(occupied, totalBeds)}`,
      ];
    });
  }

  const dates = Array.from(new Set(rows.map((row) => row.date))).sort().slice(-7);
  return dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const { occupied, pct } = computePeriodOccupancy(dayRows, depts, totalBeds);
    const label = formatDailyChartLabel(date);
    return [
      label,
      Math.round(pct * 10) / 10,
      `${formatPct(pct)} · ${formatOccupancyFraction(occupied, totalBeds)}`,
    ];
  });
}

function computePeriodOccupancy(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
  totalBeds: number,
): { occupied: number; pct: number } {
  if (!rows.length) {
    return { occupied: 0, pct: 0 };
  }
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  const dailyOccupied = dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    return depts.reduce((sum, dept) => {
      const match = dayRows.find((item) => item.departmentName === dept.department);
      return sum + (match?.occupiedPatients ?? 0);
    }, 0);
  });
  const occupied = Math.round(
    dailyOccupied.reduce((sum, value) => sum + value, 0) / Math.max(dailyOccupied.length, 1),
  );
  return { occupied, pct: occupancyPct(occupied, totalBeds) };
}

function formatDailyChartLabel(date: string): string {
  if (!date || date.length < 10) {
    return date;
  }
  const day = date.slice(8, 10);
  const month = date.slice(5, 7);
  return `${day}/${month}`;
}

function formatChartPeriodLabel(date: string, period: RehabPeriodMode): string {
  if (!date) {
    return '';
  }
  if (period === 'monthly') {
    const monthIndex = Number(date.slice(5, 7));
    return MONTH_LABELS_HE[monthIndex] || date;
  }
  return formatDailyChartLabel(date);
}
