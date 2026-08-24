import {
  getBedCapacityForYear,
  getTotalBedsForYear,
} from './rehabilitation-bed-capacity.constants';
import {
  getDepartmentsForSection,
  REHAB_DAY_METRICS,
  REHAB_INPATIENT_METRICS,
  RehabMetricDefinition,
  RehabSection,
} from './rehabilitation-dashboard.models';
import {
  RehabStatusBlock,
  RehabStatusMode,
  RehabStatusViewModel,
} from './rehabilitation-status.models';

function emptyStatusBlock(metric: RehabMetricDefinition): RehabStatusBlock {
  return {
    code: metric.code || '',
    title: metric.label,
    icon: metric.icon,
    help: metric.help,
    kpis: [],
    indicators: [],
    tableColumns: [],
    tableRows: [],
    chartType: 'ColumnChart',
    chartColumns: [],
    chartRows: [],
  };
}

export function buildRehabStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
  section: RehabSection = 'inpatient',
): RehabStatusViewModel {
  if (section === 'day-rehab') {
    return buildDayRehabEmptyStatusViewModel(mode, year, selectedDepartments);
  }
  return buildInpatientEmptyStatusViewModel(mode, year, selectedDepartments);
}

function buildInpatientEmptyStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
): RehabStatusViewModel {
  const capacity = getBedCapacityForYear(year);
  const activeDepts = selectedDepartments.length
    ? capacity.filter((d) => selectedDepartments.includes(d.department))
    : capacity;
  const totalBeds = activeDepts.reduce((s, d) => s + d.beds, 0);
  const statusMetrics = REHAB_INPATIENT_METRICS.filter((m) => m.code && m.code >= '1.3');

  return {
    mode,
    periodLabel: '',
    totalBeds: totalBeds || getTotalBedsForYear(year),
    bedCapacityNote: `קיבולת מיטות קבועה לשנת ${year} (סה״כ ${getTotalBedsForYear(year)} מיטות)`,
    blocks: statusMetrics.map(emptyStatusBlock),
  };
}

function buildDayRehabEmptyStatusViewModel(
  mode: RehabStatusMode,
  year: number,
  selectedDepartments: string[],
): RehabStatusViewModel {
  const allDepts = getDepartmentsForSection('day-rehab');
  const activeDepts = selectedDepartments.length
    ? allDepts.filter((d) => selectedDepartments.includes(d))
    : allDepts;

  return {
    mode,
    periodLabel: '',
    totalBeds: 0,
    bedCapacityNote: activeDepts.length === allDepts.length
      ? `כל מחלקות שיקום היום (${allDepts.length} מחלקות)`
      : `${activeDepts.length} מחלקות שיקום יום נבחרו`,
    blocks: REHAB_DAY_METRICS.map(emptyStatusBlock),
  };
}
