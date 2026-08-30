import {
  getOccupancyDepartmentsForYear,
  mapToOccupancyDepartment,
} from '../constants/rehabilitation-bed-capacity.constants';
import {
  MONTH_LABELS_HE,
  RehabDashboardViewModel,
  RehabPeriodMode,
  RehabTableRow,
} from '../models/rehabilitation-dashboard.models';
import { buildRehabColumnChartOptions } from '../utils/rehabilitation-chart.utils';
import { RehabilitationAvgLengthOfStayDto } from '../models/rehabilitation-avg-los.models';

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function normalizeDeptName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function filterRowsByDepartments(
  rows: RehabilitationAvgLengthOfStayDto[],
  selectedDepartments: string[],
): RehabilitationAvgLengthOfStayDto[] {
  const normalized = rows
    .map((row) => {
      const canonical = mapToOccupancyDepartment(row.departmentName);
      if (!canonical) {
        return null;
      }
      return { ...row, departmentName: canonical };
    })
    .filter((row): row is RehabilitationAvgLengthOfStayDto => !!row);

  if (!selectedDepartments.length) {
    return normalized;
  }
  const selected = new Set(selectedDepartments.map(normalizeDeptName));
  return normalized.filter((row) => selected.has(normalizeDeptName(row.departmentName)));
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

function weightedAvg(rows: RehabilitationAvgLengthOfStayDto[]): number {
  const totalPatients = rows.reduce((sum, row) => sum + row.patientCount, 0);
  if (totalPatients <= 0) {
    return 0;
  }
  const weighted = rows.reduce((sum, row) => sum + row.avgLosDays * row.patientCount, 0);
  return weighted / totalPatients;
}

function buildChartRows(
  rows: RehabilitationAvgLengthOfStayDto[],
  depts: { department: string }[],
  year: number,
  period: RehabPeriodMode,
): (string | number)[][] {
  if (period === 'monthly') {
    const today = new Date();
    const lastMonth = year === today.getFullYear() ? today.getMonth() + 1 : 12;
    return MONTH_LABELS_HE.slice(1, lastMonth + 1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const avg = weightedAvg(monthRows);
      return [label, Math.round(avg * 10) / 10, formatNumber(avg, 1)];
    });
  }

  const dates = Array.from(new Set(rows.map((row) => row.date))).sort().slice(-7);
  return dates.map((date) => {
    const label = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
    const dayRows = rows.filter((row) => row.date === date);
    const avg = weightedAvg(dayRows);
    return [label, Math.round(avg * 10) / 10, formatNumber(avg, 1)];
  });
}

export function mapAvgLosRowsToDashboardViewModel(
  rows: RehabilitationAvgLengthOfStayDto[],
  year: number,
  month: number | null,
  period: RehabPeriodMode,
  selectedDepartments: string[],
  selectedDepartment: string | null,
  periodCaption: string,
): RehabDashboardViewModel {
  const filtered = filterRowsByDepartments(rows, selectedDepartments);
  const depts = getOccupancyDepartmentsForYear(year, selectedDepartments);

  const chartColumns: (string | Record<string, unknown>)[] = [
    'תקופה',
    'ממוצע ימי אשפוז',
    { type: 'string', role: 'annotation' },
  ];
  const chartRows = buildChartRows(filtered, depts, year, period);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const deptRows = filtered.filter((row) => row.departmentName === dept.department);
    const avg = weightedAvg(deptRows);
    const patients = deptRows.reduce((sum, row) => sum + row.patientCount, 0);
    return {
      id: dept.department,
      department: dept.department,
      highlight: selectedDepartment === dept.department,
      cells: {
        department: dept.department,
        avgLos: formatNumber(avg, 1),
        patientCount: formatNumber(patients),
        discharges: patients,
      },
    };
  });

  const overallAvg = weightedAvg(filtered);
  const totalPatients = filtered.reduce((sum, row) => sum + row.patientCount, 0);
  const dates = Array.from(new Set(filtered.map((row) => row.date))).sort();
  const latestDate = dates[dates.length - 1] || '';

  return {
    chartHeading: 'משך אשפוז ממוצע (ימים)',
    periodCaption: `${periodCaption} · לפי תאריך שחרור${latestDate ? ` (עד ${latestDate})` : ''}`,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: buildRehabColumnChartOptions({
      hTitle: period === 'monthly' ? 'חודש' : 'יום',
      vTitle: 'ממוצע ימים',
      vMin: 0,
    }),
    kpis: [
      { label: 'ממוצע אשפוז כללי', value: formatNumber(overallAvg, 1), sub: 'ימים', accent: 'primary' },
      { label: 'משחררים בתקופה', value: formatNumber(totalPatients), accent: 'muted' },
      { label: 'מחלקות', value: formatNumber(depts.length), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'avgLos', label: 'ממוצע ימים', align: 'center' },
      { key: 'patientCount', label: 'משחררים', align: 'center' },
    ],
    tableRows,
  };
}
