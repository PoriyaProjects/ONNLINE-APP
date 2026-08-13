import {
  getBedsForDepartment,
  getOccupancyDepartmentsForYear,
  REHAB_OCCUPANCY_DEPARTMENT_ORDER,
  REHAB_OCCUPANCY_TARGET_PERCENT,
} from './rehabilitation-bed-capacity.constants';
import { getStatusDailyDisplayLabel } from './rehabilitation-occupancy.mapper';
import { RehabTableRow } from './rehabilitation-dashboard.models';
import { RehabilitationRecommendedTargetDto } from './rehabilitation-recommended-targets.models';
import {
  RehabStatusBlock,
  RehabStatusIndicator,
} from './rehabilitation-status.models';

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function formatOccupancyTooltip(valuePct: number, beds: number, label: string): string {
  const occupied = beds > 0 ? Math.round((valuePct / 100) * beds) : 0;
  const countLabel = beds > 0 ? `${occupied}/${beds}` : formatNumber(occupied);
  return `${label}: ${countLabel} · ${formatPct(valuePct)}`;
}

function toneFromGap(gap: number): RehabStatusIndicator['tone'] {
  if (gap >= 4) return 'excellent';
  if (gap >= 0) return 'good';
  if (gap >= -4) return 'warn';
  return 'danger';
}

function makeIndicator(
  id: string,
  label: string,
  actual: number,
  target: number,
  note: string,
): RehabStatusIndicator {
  return {
    id,
    label,
    valuePct: Math.min(100, Math.max(0, actual)),
    displayValue: formatPct(actual),
    averageDisplay: formatPct(target),
    deltaVsAvg: actual - target,
    quantity: Math.round(actual),
    quantityMax: 100,
    averageQuantity: Math.round(target),
    quantityLabel: note,
    tone: toneFromGap(actual - target),
  };
}

interface DepartmentTargetSummary {
  department: string;
  actual: number;
  target: number;
  gap: number;
  status: string;
}

function filterByDepartments(
  rows: RehabilitationRecommendedTargetDto[],
  selectedDepartments: string[],
): RehabilitationRecommendedTargetDto[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments);
  return rows.filter((row) => selected.has(row.departmentName));
}

function aggregateActualPercent(
  deptRows: RehabilitationRecommendedTargetDto[],
  department: string,
  year: number,
): number {
  if (deptRows.length === 1) {
    return deptRows[0].actualValue;
  }

  const totalPatientDays = deptRows.reduce(
    (sum, row) => sum + (row.totalOccupiedPatientDays ?? 0),
    0,
  );
  const totalDays = deptRows.reduce(
    (sum, row) => sum + (row.daysInPeriod ?? 0),
    0,
  );
  const capacity = getBedsForDepartment(year, department);

  if (totalPatientDays > 0 && totalDays > 0 && capacity > 0) {
    return Math.round((totalPatientDays / (capacity * totalDays)) * 10000) / 100;
  }

  const weightedDays = deptRows.reduce(
    (sum, row) => sum + (row.daysInPeriod ?? 1),
    0,
  );
  if (weightedDays > 0) {
    const weightedActual = deptRows.reduce(
      (sum, row) => sum + row.actualValue * (row.daysInPeriod ?? 1),
      0,
    ) / weightedDays;
    return Math.round(weightedActual * 100) / 100;
  }

  return deptRows.reduce((sum, row) => sum + row.actualValue, 0) / deptRows.length;
}

function aggregateByDepartment(
  rows: RehabilitationRecommendedTargetDto[],
  isDaily: boolean,
  year: number,
): DepartmentTargetSummary[] {
  const byDept = new Map<string, RehabilitationRecommendedTargetDto[]>();
  rows.forEach((row) => {
    const list = byDept.get(row.departmentName) || [];
    list.push(row);
    byDept.set(row.departmentName, list);
  });

  return REHAB_OCCUPANCY_DEPARTMENT_ORDER
    .map((department) => {
      const deptRows = byDept.get(department);
      if (!deptRows?.length) {
        return null;
      }
      if (isDaily) {
        const latest = deptRows
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .pop()!;
        return {
          department,
          actual: latest.actualValue,
          target: REHAB_OCCUPANCY_TARGET_PERCENT,
          gap: Math.round((latest.actualValue - REHAB_OCCUPANCY_TARGET_PERCENT) * 100) / 100,
          status: latest.actualValue >= REHAB_OCCUPANCY_TARGET_PERCENT ? 'עומד ביעד' : 'מתחת ליעד',
        };
      }
      const actual = aggregateActualPercent(deptRows, department, year);
      const target = REHAB_OCCUPANCY_TARGET_PERCENT;
      const gap = Math.round((actual - target) * 100) / 100;
      return {
        department,
        actual: Math.round(actual * 100) / 100,
        target,
        gap,
        status: gap >= 0 ? 'עומד ביעד' : 'מתחת ליעד',
      };
    })
    .filter((row): row is DepartmentTargetSummary => row != null);
}

export function mapRecommendedTargetsRowsToStatusBlock(
  rows: RehabilitationRecommendedTargetDto[],
  isDaily: boolean,
  year: number,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const summaries = aggregateByDepartment(filtered, isDaily, year);
  const depts = getOccupancyDepartmentsForYear(year, selectedDepartments);

  const tableRows: RehabTableRow[] = summaries.map((entry) => ({
    id: `target-${entry.department}`,
    department: entry.department,
    cells: {
      department: entry.department,
      actual: formatPct(entry.actual),
      target: formatPct(entry.target),
      gap: `${entry.gap >= 0 ? '+' : ''}${formatNumber(entry.gap, 1)}%`,
      status: entry.status,
    },
  }));

  const metCount = summaries.filter((row) => row.status.includes('עומד')).length;
  const orgTarget = REHAB_OCCUPANCY_TARGET_PERCENT;
  const avgGap = summaries.length
    ? summaries.reduce((sum, row) => sum + row.gap, 0) / summaries.length
    : 0;

  const deptGaps = summaries.slice().sort((a, b) => b.gap - a.gap);
  const bedsByDept = new Map(depts.map((dept) => [dept.department, dept.beds]));
  const actualLabel = isDaily ? 'בפועל' : 'תפוסה בפועל';
  const targetLabel = isDaily ? 'יעד' : 'יעד חודשי';

  const indicators: RehabStatusIndicator[] = [
    {
      id: 'target-org',
      label: 'יעד ארגוני',
      valuePct: summaries.length ? (metCount / summaries.length) * 100 : 0,
      displayValue: `${metCount}/${summaries.length || depts.length}`,
      averageDisplay: formatPct(orgTarget),
      deltaVsAvg: 0,
      quantity: metCount,
      quantityMax: Math.max(summaries.length, depts.length, 1),
      averageQuantity: Math.round((orgTarget / 100) * Math.max(summaries.length, 1)),
      quantityLabel: 'מחלקות בעמידה',
      tone: metCount >= Math.ceil(summaries.length / 2) ? 'good' : 'warn',
    },
  ];
  if (deptGaps.length) {
    indicators.push(makeIndicator(
      `target-${deptGaps[0].department}`,
      deptGaps[0].department,
      deptGaps[0].actual,
      deptGaps[0].target,
      'הפער הטוב ביותר',
    ));
  }
  if (deptGaps.length > 1) {
    const worst = deptGaps[deptGaps.length - 1];
    indicators.push(makeIndicator(
      `target-${worst.department}`,
      worst.department,
      worst.actual,
      worst.target,
      'הפער הגדול ביותר',
    ));
  }

  return {
    code: '1.6',
    title: 'יעדים מומלצים לשיקום',
    icon: 'flag',
    help: 'השוואת תפוסה בפועל מול יעד ארגוני של 95% מהקיבולת המאושרת.',
    kpis: [
      {
        label: 'מחלקות בעמידה',
        value: `${metCount}/${summaries.length || depts.length}`,
        accent: 'success',
      },
      {
        label: isDaily ? `פער ממוצע ${getStatusDailyDisplayLabel(true)}` : 'פער ממוצע חודשי',
        value: `${avgGap >= 0 ? '+' : ''}${formatNumber(avgGap, 1)}%`,
        accent: avgGap >= 0 ? 'success' : 'warn',
      },
      { label: isDaily ? 'יעד ארגוני' : 'יעד חודשי', value: formatPct(REHAB_OCCUPANCY_TARGET_PERCENT), accent: 'primary' },
    ],
    indicators,
    tableColumns: [
      { key: 'department', label: 'מחלקה' },
      { key: 'actual', label: actualLabel, align: 'center' },
      { key: 'target', label: targetLabel, align: 'center' },
      { key: 'gap', label: 'פער', align: 'center' },
      { key: 'status', label: 'סטטוס', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: [
      'מחלקה',
      actualLabel,
      { type: 'string', role: 'tooltip' },
      targetLabel,
      { type: 'string', role: 'tooltip' },
    ],
    chartRows: deptGaps.map((entry) => {
      const beds = bedsByDept.get(entry.department) ?? 0;
      return [
        entry.department,
        entry.actual,
        formatOccupancyTooltip(entry.actual, beds, actualLabel),
        entry.target,
        formatOccupancyTooltip(entry.target, beds, targetLabel),
      ];
    }),
    chartNote: isDaily ? undefined : '30 יום אחרונים',
  };
}
