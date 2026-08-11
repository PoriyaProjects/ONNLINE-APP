import {
  getBedCapacityForYear,
  getBedsForDepartment,
  getTotalBedsForYear,
} from './rehabilitation-bed-capacity.constants';
import { RehabMockViewModel } from './rehabilitation-dashboard.mock-data';
import {
  MONTH_LABELS_HE,
  RehabPeriodMode,
  RehabTableRow,
} from './rehabilitation-dashboard.models';
import { RehabOccupancyDateRange, RehabilitationOccupancyDto } from './rehabilitation-occupancy.models';
import {
  RehabIndicatorTone,
  RehabStatusBlock,
  RehabStatusIndicator,
} from './rehabilitation-status.models';

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

export function getStatusOccupancyDateRange(
  mode: 'daily' | 'weekly',
): RehabOccupancyDateRange {
  const today = new Date();
  if (mode === 'daily') {
    const iso = formatDateIso(today);
    return { fromDate: iso, toDate: iso };
  }
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { fromDate: formatDateIso(start), toDate: formatDateIso(today) };
}

function filterRowsByDepartments(
  rows: RehabilitationOccupancyDto[],
  selectedDepartments: string[],
): RehabilitationOccupancyDto[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments.map(normalizeDeptName));
  return rows.filter((row) => selected.has(normalizeDeptName(row.departmentName)));
}

function uniqueDepartments(rows: RehabilitationOccupancyDto[]): string[] {
  const names = new Set<string>();
  rows.forEach((row) => {
    if (row.departmentName) {
      names.add(row.departmentName);
    }
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'he'));
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
): RehabMockViewModel {
  const filtered = filterRowsByDepartments(rows, selectedDepartments);
  const departments = uniqueDepartments(filtered);

  const chartColumns: (string | Record<string, unknown>)[] = ['תקופה', ...departments];
  const chartRows = buildDashboardChartRows(filtered, departments, year, month, period);
  const tableRows: RehabTableRow[] = departments.map((dept) => {
    const latest = filtered
      .filter((row) => row.departmentName === dept)
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop();
    const beds = resolveBeds(year, dept);
    const occupied = latest?.occupiedPatients ?? 0;
    const occ = occupancyPct(occupied, beds);
    return {
      id: dept,
      department: dept,
      highlight: selectedDepartment === dept,
      cells: {
        department: dept,
        occupancy: beds > 0 ? formatPct(occ) : '—',
        beds: beds || '—',
        occupied,
      },
    };
  });

  const totalBeds = departments.reduce((sum, dept) => sum + resolveBeds(year, dept), 0);
  const totalOccupied = tableRows.reduce((sum, row) => sum + Number(row.cells.occupied), 0);
  const avgOcc = tableRows.length
    ? tableRows.reduce((sum, row) => sum + parseFloat(String(row.cells.occupancy).replace('%', '') || '0'), 0) / tableRows.length
    : 0;
  const dates = Array.from(new Set(filtered.map((row) => row.date))).sort();
  const latestDate = dates[dates.length - 1] || formatDateIso(new Date());

  return {
    chartHeading: 'תפוסת מיטות (%)',
    periodCaption: `${periodCaption} · נתונים ממערכת (עד ${formatChartPeriodLabel(latestDate, period, month)})`,
    chartType: 'AreaChart',
    chartColumns,
    chartRows,
    chartOptions: {
      legend: { position: 'top', alignment: 'center' },
      chartArea: { left: 48, top: 36, right: 16, bottom: 40, width: '88%', height: '70%' },
      backgroundColor: 'transparent',
      vAxis: { minValue: 0, maxValue: 100 },
      isStacked: false,
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
  const departmentNames = uniqueDepartments(filtered);
  const depts = departmentNames.map((department) => ({
    department,
    beds: resolveBeds(year, department),
  }));
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
      },
    };
  });

  const totalOccupied = tableRows.reduce((sum, row) => sum + Number(row.cells.occupied), 0);
  const overallPct = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;
  const avgOccupancyPct = isDaily ? overallPct : computeWeeklyAveragePct(filtered, year);

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
    chartRows = tableRows.map((row) => [
      row.cells.department,
      parseFloat(String(row.cells.occupancy).replace('%', '') || '0'),
      Number(row.cells.occupied),
    ]);
  } else {
    chartRows = buildWeeklyChartRows(filtered, year, avgOccupancyPct);
  }

  return {
    code: '1.3',
    title: 'תפוסה',
    icon: 'bed',
    help: 'אחוז תפוסת מיטות לפי קיבולת קבועה (מקור: Chameleon – Hospitalizations).',
    kpis: [
      {
        label: isDaily ? 'תפוסה היום' : 'תפוסה ממוצעת שבועית',
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
      { key: 'occupancy', label: 'תפוסה', align: 'center' },
      { key: 'available', label: 'פנויות', align: 'center' },
    ],
    tableRows,
    chartType: isDaily ? 'ColumnChart' : 'LineChart',
    chartColumns: isDaily
      ? ['מחלקה', 'תפוסה %', 'מיטות תפוסות']
      : ['יום', 'תפוסה %', 'ממוצע'],
    chartRows,
  };
}

function computeWeeklyAveragePct(rows: RehabilitationOccupancyDto[], year: number): number {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  if (!dates.length) {
    return 0;
  }
  const dailyPcts = dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const occupied = dayRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
    const beds = dayRows.reduce((sum, row) => sum + resolveBeds(year, row.departmentName), 0);
    return occupancyPct(occupied, beds);
  });
  return dailyPcts.reduce((sum, value) => sum + value, 0) / dailyPcts.length;
}

function buildWeeklyChartRows(
  rows: RehabilitationOccupancyDto[],
  year: number,
  avgOccupancyPct: number,
): (string | number)[][] {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  return dates.map((date, index) => {
    const dayRows = rows.filter((row) => row.date === date);
    const occupied = dayRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
    const beds = dayRows.reduce((sum, row) => sum + resolveBeds(year, row.departmentName), 0);
    const label = WEEKDAY_LABELS[index] || date.slice(5);
    return [label, Number(occupancyPct(occupied, beds).toFixed(1)), Number(avgOccupancyPct.toFixed(1))];
  });
}

function buildDashboardChartRows(
  rows: RehabilitationOccupancyDto[],
  departments: string[],
  year: number,
  month: number | null,
  period: RehabPeriodMode,
): (string | number)[][] {
  if (period === 'monthly' && !month) {
    return MONTH_LABELS_HE.slice(1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const chartRow: (string | number)[] = [label];
      departments.forEach((dept) => {
        const deptRows = monthRows.filter((row) => row.departmentName === dept);
        const occupied = deptRows.reduce((sum, row) => sum + row.occupiedPatients, 0);
        const beds = resolveBeds(year, dept);
        const days = Math.max(deptRows.length, 1);
        const avgOccupied = occupied / days;
        chartRow.push(beds > 0 ? Number(occupancyPct(avgOccupied, beds).toFixed(1)) : avgOccupied);
      });
      return chartRow;
    });
  }

  const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
  return dates.map((date) => {
    const label = formatChartPeriodLabel(date, period, month);
    const chartRow: (string | number)[] = [label];
    departments.forEach((dept) => {
      const match = rows.find((item) => item.date === date && item.departmentName === dept);
      const beds = resolveBeds(year, dept);
      const occupied = match?.occupiedPatients ?? 0;
      chartRow.push(beds > 0 ? Number(occupancyPct(occupied, beds).toFixed(1)) : occupied);
    });
    return chartRow;
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
