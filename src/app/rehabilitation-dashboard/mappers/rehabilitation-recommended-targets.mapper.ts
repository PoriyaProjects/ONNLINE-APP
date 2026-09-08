import {
  getBedsForDepartment,
  getOccupancyDepartmentsForYear,
  REHAB_OCCUPANCY_DEPARTMENT_ORDER,
  REHAB_OCCUPANCY_TARGET_PERCENT,
} from '../constants/rehabilitation-bed-capacity.constants';
import { getStatusDailyDisplayLabel } from './rehabilitation-occupancy.mapper';
import { buildRehabChartTooltipHtml, REHAB_HTML_TOOLTIP_COL } from '../utils/rehabilitation-chart.utils';
import { RehabOccupancyDateRange } from '../models/rehabilitation-occupancy.models';
import { RehabTableRow } from '../models/rehabilitation-dashboard.models';
import { RehabilitationRecommendedTargetDto } from '../models/rehabilitation-recommended-targets.models';
import {
  RehabStatusBlock,
  RehabStatusIndicator,
} from '../models/rehabilitation-status.models';

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function formatOccupancyTooltip(valuePct: number, beds: number, label: string, department: string): string {
  const occupied = beds > 0 ? Math.round((valuePct / 100) * beds) : 0;
  const countLabel = beds > 0 ? `${occupied}/${beds}` : formatNumber(occupied);
  return buildRehabChartTooltipHtml(
    department,
    label,
    `${countLabel} · ${formatPct(valuePct)}`,
    'השוואת תפוסה בפועל ליעד ארגוני 95% מהקיבולת. ציר X = מחלקה, ציר Y = אחוז תפוסה.',
  );
}

function formatPatientDaysTooltip(actual: number, target: number, label: string, department: string): string {
  return buildRehabChartTooltipHtml(
    department,
    label,
    `${formatNumber(actual)} / ${formatNumber(target)} ימי תפוסה`,
    'סה״כ ימי תפוסה בפועל מול יעד (95% × קיבולת × ימים). ציר X = מחלקה, ציר Y = ימי תפוסה.',
  );
}

function toneFromGap(gap: number, usePatientDaySums: boolean): RehabStatusIndicator['tone'] {
  if (usePatientDaySums) {
    return gap >= 0 ? 'good' : 'warn';
  }
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
  usePatientDaySums: boolean,
): RehabStatusIndicator {
  const gap = actual - target;
  return {
    id,
    label,
    valuePct: usePatientDaySums
      ? (target > 0 ? Math.min(100, Math.max(0, (actual / target) * 100)) : 0)
      : Math.min(100, Math.max(0, actual)),
    displayValue: usePatientDaySums ? formatNumber(actual) : formatPct(actual),
    averageDisplay: usePatientDaySums ? formatNumber(target) : formatPct(target),
    deltaVsAvg: gap,
    quantity: Math.round(actual),
    quantityMax: Math.max(Math.round(actual), Math.round(target), 1),
    averageQuantity: Math.round(target),
    quantityLabel: note,
    tone: toneFromGap(gap, usePatientDaySums),
  };
}

interface DepartmentTargetSummary {
  department: string;
  actual: number;
  target: number;
  gap: number;
  status: string;
  usePatientDaySums: boolean;
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

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function inferDaysInPeriodBucket(
  monthDateIso: string,
  range: RehabOccupancyDateRange,
): number {
  const monthStart = parseIsoDate(monthDateIso);
  const rangeStart = parseIsoDate(range.fromDate);
  const rangeEnd = parseIsoDate(range.toDate);
  const bucketStart = monthStart > rangeStart ? monthStart : rangeStart;
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const bucketEnd = monthEnd < rangeEnd ? monthEnd : rangeEnd;
  if (bucketEnd < bucketStart) {
    return 0;
  }
  const msPerDay = 86400000;
  return Math.round((bucketEnd.getTime() - bucketStart.getTime()) / msPerDay) + 1;
}

function resolveBucketPatientDays(
  row: RehabilitationRecommendedTargetDto,
  department: string,
  year: number,
  range?: RehabOccupancyDateRange,
): { actualDays: number; targetDays: number; periodDays: number } {
  const capacity = getBedsForDepartment(year, department);
  const periodDays = row.daysInPeriod
    ?? (range ? inferDaysInPeriodBucket(row.date, range) : 0);

  if (row.totalOccupiedPatientDays != null && periodDays > 0) {
    const targetDays = capacity * periodDays * (REHAB_OCCUPANCY_TARGET_PERCENT / 100);
    return {
      actualDays: row.totalOccupiedPatientDays,
      targetDays: Math.round(targetDays * 100) / 100,
      periodDays,
    };
  }

  if (capacity <= 0 || periodDays <= 0) {
    return { actualDays: 0, targetDays: 0, periodDays: 0 };
  }

  const actualDays = (row.actualValue / 100) * capacity * periodDays;
  const targetDays = capacity * periodDays * (REHAB_OCCUPANCY_TARGET_PERCENT / 100);
  return {
    actualDays: Math.round(actualDays * 100) / 100,
    targetDays: Math.round(targetDays * 100) / 100,
    periodDays,
  };
}

function aggregateByDepartment(
  rows: RehabilitationRecommendedTargetDto[],
  isDaily: boolean,
  year: number,
  range?: RehabOccupancyDateRange,
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
          usePatientDaySums: false,
        };
      }

      let actualSum = 0;
      let targetSum = 0;
      deptRows.forEach((row) => {
        const bucket = resolveBucketPatientDays(row, department, year, range);
        actualSum += bucket.actualDays;
        targetSum += bucket.targetDays;
      });
      const gap = Math.round(actualSum - targetSum);
      return {
        department,
        actual: Math.round(actualSum),
        target: Math.round(targetSum),
        gap,
        status: actualSum >= targetSum ? 'עומד ביעד' : 'מתחת ליעד',
        usePatientDaySums: true,
      };
    })
    .filter((row): row is DepartmentTargetSummary => row != null);
}

export function mapRecommendedTargetsRowsToStatusBlock(
  rows: RehabilitationRecommendedTargetDto[],
  isDaily: boolean,
  year: number,
  selectedDepartments: string[],
  dateRange?: RehabOccupancyDateRange,
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const summaries = aggregateByDepartment(filtered, isDaily, year, dateRange);
  const depts = getOccupancyDepartmentsForYear(year, selectedDepartments);
  const usePatientDaySums = !isDaily;

  const tableRows: RehabTableRow[] = summaries.map((entry) => ({
    id: `target-${entry.department}`,
    department: entry.department,
    cells: {
      department: entry.department,
      actual: entry.usePatientDaySums ? formatNumber(entry.actual) : formatPct(entry.actual),
      target: entry.usePatientDaySums ? formatNumber(entry.target) : formatPct(entry.target),
      gap: entry.usePatientDaySums
        ? `${entry.gap >= 0 ? '+' : ''}${formatNumber(entry.gap)}`
        : `${entry.gap >= 0 ? '+' : ''}${formatNumber(entry.gap, 1)}%`,
      status: entry.status,
    },
  }));

  const metCount = summaries.filter((row) => row.status.includes('עומד')).length;
  const orgTarget = REHAB_OCCUPANCY_TARGET_PERCENT;
  const totalActual = summaries.reduce((sum, row) => sum + row.actual, 0);
  const totalTarget = summaries.reduce((sum, row) => sum + row.target, 0);
  const totalGap = totalActual - totalTarget;
  const avgGap = summaries.length && !usePatientDaySums
    ? summaries.reduce((sum, row) => sum + row.gap, 0) / summaries.length
    : 0;

  const deptGaps = summaries.slice().sort((a, b) => b.gap - a.gap);
  const bedsByDept = new Map(depts.map((dept) => [dept.department, dept.beds]));
  const actualLabel = isDaily ? 'בפועל' : 'סה״כ בפועל (ימי תפוסה)';
  const targetLabel = isDaily ? 'יעד' : 'סה״כ יעד (ימי תפוסה)';

  const indicators: RehabStatusIndicator[] = [
    {
      id: 'target-org',
      label: usePatientDaySums ? 'סה״כ ימי תפוסה' : 'יעד ארגוני',
      valuePct: usePatientDaySums
        ? (totalTarget > 0 ? Math.min(100, (totalActual / totalTarget) * 100) : 0)
        : (summaries.length ? (metCount / summaries.length) * 100 : 0),
      displayValue: usePatientDaySums ? formatNumber(totalActual) : `${metCount}/${summaries.length || depts.length}`,
      averageDisplay: usePatientDaySums ? formatNumber(totalTarget) : formatPct(orgTarget),
      deltaVsAvg: usePatientDaySums ? totalGap : 0,
      quantity: usePatientDaySums ? Math.round(totalActual) : metCount,
      quantityMax: Math.max(
        usePatientDaySums ? Math.round(totalActual) : metCount,
        usePatientDaySums ? Math.round(totalTarget) : Math.max(summaries.length, depts.length, 1),
        1,
      ),
      averageQuantity: usePatientDaySums
        ? Math.round(totalTarget)
        : Math.round((orgTarget / 100) * Math.max(summaries.length, 1)),
      quantityLabel: usePatientDaySums ? 'ימי תפוסה · בפועל / יעד' : 'מחלקות בעמידה',
      tone: usePatientDaySums
        ? (totalGap >= 0 ? 'good' : 'warn')
        : (metCount >= Math.ceil(summaries.length / 2) ? 'good' : 'warn'),
    },
  ];
  if (deptGaps.length) {
    indicators.push(makeIndicator(
      `target-${deptGaps[0].department}`,
      deptGaps[0].department,
      deptGaps[0].actual,
      deptGaps[0].target,
      usePatientDaySums ? 'הפער הטוב ביותר (ימי תפוסה)' : 'הפער הטוב ביותר',
      usePatientDaySums,
    ));
  }
  if (deptGaps.length > 1) {
    const worst = deptGaps[deptGaps.length - 1];
    indicators.push(makeIndicator(
      `target-${worst.department}`,
      worst.department,
      worst.actual,
      worst.target,
      usePatientDaySums ? 'הפער הגדול ביותר (ימי תפוסה)' : 'הפער הגדול ביותר',
      usePatientDaySums,
    ));
  }

  return {
    code: '1.6',
    title: 'יעדים מומלצים לשיקום',
    icon: 'flag',
    help: usePatientDaySums
      ? 'סיכום 30 יום: סה״כ ימי תפוסה בפועל מול סה״כ ימי יעד (95% × קיבולת × ימים).'
      : 'השוואת תפוסה בפועל מול יעד ארגוני של 95% מהקיבולת המאושרת.',
    kpis: usePatientDaySums
      ? [
        { label: 'סה״כ בפועל (ימי תפוסה)', value: formatNumber(totalActual), accent: 'primary' },
        { label: 'סה״כ יעד (ימי תפוסה)', value: formatNumber(totalTarget), accent: 'success' },
        {
          label: 'פער (ימי תפוסה)',
          value: `${totalGap >= 0 ? '+' : ''}${formatNumber(totalGap)}`,
          accent: totalGap >= 0 ? 'success' : 'warn',
        },
      ]
      : [
        {
          label: 'מחלקות בעמידה',
          value: `${metCount}/${summaries.length || depts.length}`,
          accent: 'success',
        },
        {
          label: `פער ממוצע ${getStatusDailyDisplayLabel(true)}`,
          value: `${avgGap >= 0 ? '+' : ''}${formatNumber(avgGap, 1)}%`,
          accent: avgGap >= 0 ? 'success' : 'warn',
        },
        { label: 'יעד ארגוני', value: formatPct(REHAB_OCCUPANCY_TARGET_PERCENT), accent: 'primary' },
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
      REHAB_HTML_TOOLTIP_COL,
      targetLabel,
      REHAB_HTML_TOOLTIP_COL,
    ],
    chartRows: deptGaps.map((entry) => {
      if (entry.usePatientDaySums) {
        return [
          entry.department,
          entry.actual,
          formatPatientDaysTooltip(entry.actual, entry.target, actualLabel, entry.department),
          entry.target,
          formatPatientDaysTooltip(entry.actual, entry.target, targetLabel, entry.department),
        ];
      }
      const beds = bedsByDept.get(entry.department) ?? 0;
      return [
        entry.department,
        entry.actual,
        formatOccupancyTooltip(entry.actual, beds, actualLabel, entry.department),
        entry.target,
        formatOccupancyTooltip(entry.target, beds, targetLabel, entry.department),
      ];
    }),
    chartNote: isDaily ? undefined : '30 יום אחרונים · סיכום ימי תפוסה',
  };
}
