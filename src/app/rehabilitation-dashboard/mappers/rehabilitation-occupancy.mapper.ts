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

/** Daily status queries use yesterday — today's data is often not loaded yet. */
export function getStatusDailyQueryDate(reference = new Date()): Date {
  const date = new Date(reference);
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatStatusDateHe(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getStatusDailyDisplayLabel(isDaily: boolean): string {
  return isDaily ? 'אתמול' : '30 ימים';
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

/** Matches server SQL: rolling 12 calendar months from GETDATE() (fromDate/toDate ignored by API). */
export function getRevenueNetDateRange(reference = new Date()): RehabOccupancyDateRange {
  const today = new Date(reference);
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    fromDate: formatDateIso(start),
    toDate: formatDateIso(end),
  };
}

export function formatRevenueNetMonthLabel(reference = new Date()): string {
  const range = getRevenueNetDateRange(reference);
  return `12 חודשים אחרונים · ${range.fromDate} – ${range.toDate}`;
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
    'מחלקה',
    'תפוסות',
    { type: 'string', role: 'annotation' },
    'קיבולת',
  ];
  const chartRows = buildDashboardChartRows(filtered, depts, year, month, period);
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
    chartHeading: 'תפוסת מיטות — תפוסות מתוך קיבולת',
    periodCaption: `${periodCaption} · נתונים ממערכת (עד ${formatChartPeriodLabel(latestDate, period, month)})`,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: {
      legend: { position: 'top', alignment: 'center' },
      chartArea: { left: 48, top: 36, right: 16, bottom: 40, width: '88%', height: '70%' },
      backgroundColor: 'transparent',
      isStacked: false,
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 12, bold: true },
      },
    },
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
      isDaily ? 'תפוסה כללית היום' : 'ממוצע חודשי',
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
        label: isDaily ? 'תפוסה היום' : 'תפוסה ממוצעת (30 ימים)',
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
      { key: 'occupied', label: isDaily ? 'תפוסות היום' : 'ממוצע תפוסות', align: 'center' },
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
  month: number | null,
  period: RehabPeriodMode,
): (string | number)[][] {
  if (period === 'monthly' && !month) {
    return MONTH_LABELS_HE.slice(1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const occupied = depts.reduce((sum, dept) => {
        const deptRows = monthRows.filter((row) => row.departmentName === dept.department);
        const deptOccupied = deptRows.reduce((acc, row) => acc + row.occupiedPatients, 0);
        return sum + (deptOccupied / Math.max(deptRows.length, 1));
      }, 0);
      const beds = depts.reduce((sum, dept) => sum + dept.beds, 0);
      return [label, Math.round(occupied), formatOccupancyFraction(Math.round(occupied), beds), beds];
    });
  }

  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  return dates.map((date) => {
    const label = formatChartPeriodLabel(date, period, month);
    const occupied = depts.reduce((sum, dept) => {
      const match = rows.find((item) => item.date === date && item.departmentName === dept.department);
      return sum + (match?.occupiedPatients ?? 0);
    }, 0);
    const beds = depts.reduce((sum, dept) => sum + dept.beds, 0);
    return [label, occupied, formatOccupancyFraction(occupied, beds), beds];
  });
}

function formatChartPeriodLabel(date: string, period: RehabPeriodMode, month: number | null): string {
  if (!date) {
    return '';
  }
  if (period === 'monthly' && !month) {
    const monthIndex = Number(date.slice(5, 7));
    return MONTH_LABELS_HE[monthIndex] || date;
  }
  if (period === 'monthly') {
    return date.slice(8, 10);
  }
  const dayIndex = new Date(`${date}T00:00:00`).getDay();
  return WEEKDAY_LABELS[dayIndex] || date;
}
