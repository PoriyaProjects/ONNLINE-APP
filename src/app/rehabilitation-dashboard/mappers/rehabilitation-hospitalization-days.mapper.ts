import {
  getOccupancyDepartmentsForYear,
  mapToOccupancyDepartment,
} from '../constants/rehabilitation-bed-capacity.constants';
import {
  MONTH_LABELS_HE,
  RehabDashboardViewModel,
  RehabHospitalizationDaysMode,
  RehabPeriodMode,
  RehabTableRow,
} from '../models/rehabilitation-dashboard.models';
import { RehabilitationHospitalizationDaysDto } from '../models/rehabilitation-hospitalization-days.models';
import { buildRehabColumnChartOptions, buildRehabChartTooltipHtml, REHAB_HTML_TOOLTIP_COL } from '../utils/rehabilitation-chart.utils';

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

function getDaysValue(
  row: RehabilitationHospitalizationDaysDto,
  mode: RehabHospitalizationDaysMode,
): number {
  return mode === 'gross' ? row.grossDays : row.netDays;
}

function filterRowsByDepartments(
  rows: RehabilitationHospitalizationDaysDto[],
  selectedDepartments: string[],
): RehabilitationHospitalizationDaysDto[] {
  const normalized = rows
    .map((row) => {
      const canonical = mapToOccupancyDepartment(row.departmentName);
      if (!canonical) {
        return null;
      }
      return { ...row, departmentName: canonical };
    })
    .filter((row): row is RehabilitationHospitalizationDaysDto => !!row);

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

function buildChartRows(
  rows: RehabilitationHospitalizationDaysDto[],
  depts: { department: string }[],
  year: number,
  period: RehabPeriodMode,
  mode: RehabHospitalizationDaysMode,
): (string | number)[][] {
  if (period === 'monthly') {
    const today = new Date();
    const lastMonth = year === today.getFullYear() ? today.getMonth() + 1 : 12;
    return MONTH_LABELS_HE.slice(1, lastMonth + 1).map((label, index) => {
      const monthNumber = index + 1;
      const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
      const total = depts.reduce((sum, dept) => {
        const deptTotal = monthRows
          .filter((row) => row.departmentName === dept.department)
          .reduce((acc, row) => acc + getDaysValue(row, mode), 0);
        return sum + deptTotal;
      }, 0);
      return [
        label,
        total,
        buildRehabChartTooltipHtml(
          label,
          `ימי אשפוז (${mode === 'gross' ? 'ברוטו' : 'נטו'})`,
          `${formatNumber(total)} ימים`,
          mode === 'gross'
            ? 'סה״כ ימי אשפוז כולל ימי המתנה. ציר X = חודש, ציר Y = ימי אשפוז.'
            : 'סה״כ ימי טיפול בפועל (נטו). ציר X = חודש, ציר Y = ימי אשפוז.',
        ),
        formatNumber(total),
      ];
    });
  }

  const dates = Array.from(new Set(rows.map((row) => row.date))).sort().slice(-7);
  return dates.map((date) => {
    const label = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
    const total = depts.reduce((sum, dept) => {
      const match = rows.find((item) => item.date === date && item.departmentName === dept.department);
      return sum + (match ? getDaysValue(match, mode) : 0);
    }, 0);
    return [
      label,
      total,
      buildRehabChartTooltipHtml(
        label,
        `ימי אשפוז (${mode === 'gross' ? 'ברוטו' : 'נטו'})`,
        `${formatNumber(total)} ימים`,
        mode === 'gross'
          ? 'סה״כ ימי אשפוז כולל ימי המתנה. ציר X = יום, ציר Y = ימי אשפוז.'
          : 'סה״כ ימי טיפול בפועל (נטו). ציר X = יום, ציר Y = ימי אשפוז.',
      ),
      formatNumber(total),
    ];
  });
}

export function mapHospitalizationDaysRowsToDashboardViewModel(
  rows: RehabilitationHospitalizationDaysDto[],
  year: number,
  month: number | null,
  period: RehabPeriodMode,
  selectedDepartments: string[],
  selectedDepartment: string | null,
  periodCaption: string,
  mode: RehabHospitalizationDaysMode,
): RehabDashboardViewModel {
  const filtered = filterRowsByDepartments(rows, selectedDepartments);
  const depts = getOccupancyDepartmentsForYear(year, selectedDepartments);
  const modeLabel = mode === 'gross' ? 'ברוטו' : 'נטו';

  const chartColumns: (string | Record<string, unknown>)[] = [
    'תקופה',
    `ימי אשפוז (${modeLabel})`,
    REHAB_HTML_TOOLTIP_COL,
    { type: 'string', role: 'annotation' },
  ];
  const chartRows = buildChartRows(filtered, depts, year, period, mode);

  const tableRows: RehabTableRow[] = depts.map((dept) => {
    const deptRows = filtered.filter((row) => row.departmentName === dept.department);
    const grossTotal = deptRows.reduce((sum, row) => sum + row.grossDays, 0);
    const netTotal = deptRows.reduce((sum, row) => sum + row.netDays, 0);
    const displayTotal = mode === 'gross' ? grossTotal : netTotal;
    const avgPerDay = deptRows.length ? displayTotal / deptRows.length : 0;
    return {
      id: dept.department,
      department: dept.department,
      highlight: selectedDepartment === dept.department,
      cells: {
        department: dept.department,
        days: formatNumber(displayTotal),
        grossDays: formatNumber(grossTotal),
        netDays: formatNumber(netTotal),
        avgPerDay: formatNumber(avgPerDay, 1),
      },
    };
  });

  const totalGross = tableRows.reduce((sum, row) => sum + Number(String(row.cells.grossDays).replace(/,/g, '')), 0);
  const totalNet = tableRows.reduce((sum, row) => sum + Number(String(row.cells.netDays).replace(/,/g, '')), 0);
  const totalDisplay = mode === 'gross' ? totalGross : totalNet;
  const dates = Array.from(new Set(filtered.map((row) => row.date))).sort();
  const latestDate = dates[dates.length - 1] || '';

  return {
    chartHeading: `ימי אשפוז — ${modeLabel}`,
    periodCaption: `${periodCaption} · נתונים ממערכת${latestDate ? ` (עד ${latestDate})` : ''}`,
    chartType: 'ColumnChart',
    chartColumns,
    chartRows,
    chartOptions: buildRehabColumnChartOptions({
      hTitle: period === 'monthly' ? 'חודש' : 'יום',
      vTitle: `ימי אשפוז (${modeLabel})`,
      vMin: 0,
    }),
    kpis: [
      { label: `סה״כ ימי אשפוז (${modeLabel})`, value: formatNumber(totalDisplay), accent: 'primary' },
      { label: 'ברוטו', value: formatNumber(totalGross), accent: 'muted' },
      { label: 'נטו', value: formatNumber(totalNet), accent: 'success' },
    ],
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'days', label: `ימים (${modeLabel})`, align: 'center' },
      { key: 'grossDays', label: 'ברוטו', align: 'center' },
      { key: 'netDays', label: 'נטו', align: 'center' },
      { key: 'avgPerDay', label: 'ממוצע ליום', align: 'center' },
    ],
    tableRows,
  };
}
