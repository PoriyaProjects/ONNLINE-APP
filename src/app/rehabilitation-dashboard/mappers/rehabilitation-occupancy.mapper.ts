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

function monthSpanToRange(year: number, fromMonth: number, toMonth: number): RehabOccupancyDateRange {
  const startM = Math.min(fromMonth, toMonth);
  const endM = Math.max(fromMonth, toMonth);
  const today = new Date();
  const start = new Date(year, startM - 1, 1);
  let end = new Date(year, endM, 0);
  if (end > today) {
    end = today;
  }
  if (start > end) {
    return { fromDate: formatDateIso(end), toDate: formatDateIso(end) };
  }
  return { fromDate: formatDateIso(start), toDate: formatDateIso(end) };
}

export function getDashboardOccupancyDateRange(
  year: number,
  month: number | null,
  period: RehabPeriodMode,
  fromMonth: number | null = null,
  toMonth: number | null = null,
): RehabOccupancyDateRange {
  const today = new Date();
  const rangeStart = fromMonth && toMonth ? Math.min(fromMonth, toMonth) : null;
  const rangeEnd = fromMonth && toMonth ? Math.max(fromMonth, toMonth) : null;
  const effectiveMonth = rangeStart && rangeEnd && rangeStart === rangeEnd
    ? rangeStart
    : (month || rangeEnd);

  if (period !== 'daily' && rangeStart && rangeEnd && rangeStart !== rangeEnd) {
    return monthSpanToRange(year, rangeStart, rangeEnd);
  }

  if (period === 'daily') {
    if (rangeStart && rangeEnd) {
      return monthSpanToRange(year, rangeStart, rangeEnd);
    }
    let end = today;
    if (year < today.getFullYear()) {
      end = effectiveMonth ? new Date(year, effectiveMonth, 0) : new Date(year, 11, 31);
    } else if (year > today.getFullYear()) {
      end = effectiveMonth ? new Date(year, effectiveMonth, 0) : new Date(year, 0, 1);
    } else if (effectiveMonth) {
      end = new Date(year, effectiveMonth, 0);
      if (end > today) {
        end = today;
      }
    }
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { fromDate: formatDateIso(start), toDate: formatDateIso(end) };
  }

  if (effectiveMonth) {
    return monthSpanToRange(year, effectiveMonth, effectiveMonth);
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
  mode: 'daily' | 'weekly' | 'monthly',
  year?: number,
  month?: number | null,
  fromMonth?: number | null,
  toMonth?: number | null,
): RehabOccupancyDateRange {
  const today = new Date();
  const y = year ?? today.getFullYear();
  const rangeStart = fromMonth && toMonth ? Math.min(fromMonth, toMonth) : (month || null);
  const rangeEnd = fromMonth && toMonth ? Math.max(fromMonth, toMonth) : (month || null);
  if (mode === 'daily' && !rangeStart) {
    const iso = formatDateIso(getStatusDailyQueryDate(today));
    return { fromDate: iso, toDate: iso };
  }
  if (rangeStart && rangeEnd) {
    return monthSpanToRange(y, rangeStart, rangeEnd);
  }
  if (mode === 'weekly') {
    const currentMonth = y === today.getFullYear() ? today.getMonth() + 1 : 12;
    const from = Math.max(1, currentMonth - (6 - 1));
    return monthSpanToRange(y, from, currentMonth);
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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function occupancyTooltipToneColor(pct: number): string {
  if (pct >= 95) {
    return '#2dd4bf';
  }
  if (pct >= 80) {
    return '#38bdf8';
  }
  if (pct >= 60) {
    return '#fbbf24';
  }
  return '#f87171';
}

function occupancyPct(occupied: number, beds: number): number {
  if (beds <= 0) {
    return 0;
  }
  return (occupied / beds) * 100;
}

function sumDeptOccupiedOnDate(
  dayRows: RehabilitationOccupancyDto[],
  department: string,
): number {
  return dayRows
    .filter((row) => row.departmentName === department)
    .reduce((sum, row) => sum + row.occupiedPatients, 0);
}

function averageDeptOccupiedOverDates(deptRows: RehabilitationOccupancyDto[]): number {
  const byDate = new Map<string, number>();
  deptRows.forEach((row) => {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.occupiedPatients);
  });
  const dailyValues = Array.from(byDate.values());
  if (!dailyValues.length) {
    return 0;
  }
  return Math.round(dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length);
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
    { type: 'string', role: 'tooltip', p: { html: true } },
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
    chartNote: period === 'daily'
      ? 'כל עמודה = אחוז התפוסה ביום (7 ימים אחרונים).'
      : 'כל עמודה = ממוצע אחוז התפוסה בחודש (מיטות תפוסות מתוך קיבולת).',
    chartOptions: buildRehabColumnChartOptions({
      hTitle: period === 'daily' ? 'יום' : 'חודש',
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
  averageRows: RehabilitationOccupancyDto[] = [],
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
      : averageDeptOccupiedOverDates(deptRows);
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
  const monthlyPeriod = isDaily ? null : computePeriodOccupancy(filtered, depts, totalBeds);
  const monthlyAvgPct = isDaily ? 0 : computeWeeklyAveragePct(filtered, depts);
  const overallPct = isDaily
    ? (totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0)
    : monthlyAvgPct;
  const displayOccupied = isDaily ? totalOccupied : (monthlyPeriod?.occupied ?? 0);
  const avgOccupancyPct = isDaily
    ? overallPct
    : (averageRows.length
      ? computeElevenMonthAveragePct(filterRowsByDepartments(averageRows, selectedDepartments), depts)
      : computeWeeklyAveragePct(filtered, depts));

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
    const occ = isDaily
      ? parseFloat(String(row?.cells.occupancy).replace('%', '') || '0')
      : occupancyPct(Number(row?.cells.occupied ?? 0), top.beds || 1);
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
    const occ = isDaily
      ? parseFloat(String(row?.cells.occupancy).replace('%', '') || '0')
      : occupancyPct(Number(row?.cells.occupied ?? 0), low.beds || 1);
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
        buildOccupancyChartTooltip(String(row.cells.department), occupied, beds),
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
    help: isDaily
      ? 'תפוסות מיטות מתוך קיבולת קבועה (מקור: Chameleon – Hospitalizations).'
      : 'תפוסות מיטות מתוך קיבולת קבועה. הממוצע לשווואה במחוונים — 11 חודשים אחרונים (ללא חודש נוכחי).',
    kpis: [
      {
        label: isDaily ? `תפוסה (${dailyLabel})` : 'תפוסה ממוצעת (30 ימים)',
        value: formatPct(overallPct),
        accent: 'primary',
      },
      {
        label: 'מיטות תפוסות',
        value: `${formatNumber(displayOccupied)} / ${formatNumber(totalBeds)}`,
        accent: 'success',
      },
      {
        label: 'מיטות פנויות',
        value: formatNumber(Math.max(totalBeds - displayOccupied, 0)),
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
    chartType: isDaily ? 'ColumnChart' : 'ComboChart',
    chartColumns: isDaily
      ? ['מחלקה', 'תפוסות', { type: 'string', role: 'tooltip', p: { html: true } }, { type: 'string', role: 'annotation' }, 'קיבולת']
      : ['יום', 'תפוסות', { type: 'string', role: 'tooltip', p: { html: true } }, 'קיבולת'],
    chartRows,
    chartNote: isDaily
      ? undefined
      : '30 יום · ציר X: יום בחודש (DD) · עמודות=תפוסות · קו=קיבולת · ממוצע השוואה: 11 חודשים',
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

function buildOccupancyChartTooltip(
  dateLabel: string,
  occupied: number,
  beds: number,
): string {
  const pct = occupancyPct(occupied, beds);
  const available = Math.max(beds - occupied, 0);
  const toneColor = occupancyTooltipToneColor(pct);
  const wrap = [
    'direction:rtl',
    'text-align:right',
    'padding:12px 14px',
    'border-radius:12px',
    'background:linear-gradient(145deg,#1e293b 0%,#0f172a 100%)',
    'color:#f8fafc',
    'box-shadow:0 10px 28px rgba(15,23,42,0.4)',
    'font-family:Arial,sans-serif',
    'min-width:176px',
  ].join(';');

  return `<div class="rehab-occupancy-tooltip" style="${wrap}">
    <div style="font-size:12px;opacity:0.85;margin-bottom:6px">${escapeHtml(dateLabel)}</div>
    <div style="font-size:22px;font-weight:700;line-height:1.15;margin-bottom:6px;color:#7dd3fc">${escapeHtml(formatOccupancyFraction(occupied, beds))}</div>
    <div style="font-size:15px;font-weight:700;color:${toneColor};margin-bottom:10px">${escapeHtml(formatPct(pct))} תפוסה</div>
    <div style="font-size:12px;opacity:0.92;padding-top:8px;border-top:1px solid rgba(148,163,184,0.35)">
      <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
        <span>פנויות</span><strong>${escapeHtml(formatNumber(available))}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:16px">
        <span>קיבולת</span><strong>${escapeHtml(formatNumber(beds))}</strong>
      </div>
    </div>
  </div>`;
}

function buildWeeklyChartRows(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
): (string | number)[][] {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  return dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const occupied = dayRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
    const tooltipLabel = formatDailyChartLabel(date);
    return [
      formatDayOfMonthAxisLabel(date),
      occupied,
      buildOccupancyChartTooltip(tooltipLabel, occupied, totalBeds),
      totalBeds,
    ];
  });
}

function computeElevenMonthAveragePct(
  rows: RehabilitationOccupancyDto[],
  depts: { department: string; beds: number }[],
): number {
  const totalBeds = depts.reduce((sum, dept) => sum + dept.beds, 0);
  if (!rows.length || totalBeds <= 0) {
    return 0;
  }
  const months = Array.from(new Set(rows.map((row) => row.date.slice(0, 7)))).sort();
  const monthlyPcts = months.map((monthKey) => {
    const monthRows = rows.filter((row) => row.date.startsWith(monthKey));
    return computePeriodOccupancy(monthRows, depts, totalBeds).pct;
  });
  return monthlyPcts.reduce((sum, value) => sum + value, 0) / Math.max(monthlyPcts.length, 1);
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

  if (period === 'monthly' || period === 'weekly') {
    const today = new Date();
    const lastMonth = year === today.getFullYear() ? today.getMonth() + 1 : 12;
    return MONTH_LABELS_HE.slice(1, lastMonth + 1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const { occupied, pct } = computePeriodOccupancy(monthRows, depts, totalBeds);
      return [
        label,
        Math.round(pct * 10) / 10,
        buildOccupancyChartTooltip(label, occupied, totalBeds),
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
      buildOccupancyChartTooltip(label, occupied, totalBeds),
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
    return depts.reduce((sum, dept) => sum + sumDeptOccupiedOnDate(dayRows, dept.department), 0);
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

function formatDayOfMonthAxisLabel(date: string): string {
  if (!date || date.length < 10) {
    return date;
  }
  return String(Number(date.slice(8, 10)));
}

function formatChartPeriodLabel(date: string, period: RehabPeriodMode): string {
  if (!date) {
    return '';
  }
  if (period === 'monthly' || period === 'weekly') {
    const monthIndex = Number(date.slice(5, 7));
    return MONTH_LABELS_HE[monthIndex] || date;
  }
  return formatDailyChartLabel(date);
}
