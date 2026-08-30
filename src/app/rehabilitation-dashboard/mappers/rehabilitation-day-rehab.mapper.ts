import { REHAB_DAY_METRICS } from '../models/rehabilitation-dashboard.models';
import {
  DayRehabAvgTreatmentsPerPatientDto,
  DayRehabDischargesWithRecommendationDto,
  DayRehabPatientsByDirectionDto,
  DayRehabPatientsByPayerDto,
  DayRehabTreatmentsBySectorDto,
  DayRehabTreatmentsDailyCumulativeDto,
  DayRehabTreatmentsIndividualGroupDto,
  DayRehabTreatmentsPerPositionDto,
  RehabDayApiBlockCode,
} from '../models/rehabilitation-day-rehab.models';
import { RehabStatusBlock } from '../models/rehabilitation-status.models';

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function filterByDepartments<T extends { departmentName: string }>(
  rows: T[],
  selectedDepartments: string[],
): T[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments);
  return rows.filter((row) => selected.has(row.departmentName));
}

function emptyBlock(code: RehabDayApiBlockCode): RehabStatusBlock {
  const metric = REHAB_DAY_METRICS.find((m) => m.code === code);
  return {
    code,
    title: metric?.label ?? code,
    icon: metric?.icon ?? 'insights',
    help: metric?.help ?? '',
    kpis: [],
    indicators: [],
    tableColumns: [],
    tableRows: [],
    chartType: 'ColumnChart',
    chartColumns: [],
    chartRows: [],
  };
}

export function mapDayRehabRowsToStatusBlock(
  blockCode: RehabDayApiBlockCode,
  rows: unknown[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  switch (blockCode) {
    case '2.1':
      return mapPatientsByPayer(rows as DayRehabPatientsByPayerDto[], isDaily, selectedDepartments);
    case '2.2':
      return mapPatientsByDirection(rows as DayRehabPatientsByDirectionDto[], isDaily, selectedDepartments);
    case '2.3':
      return mapDischarges(rows as DayRehabDischargesWithRecommendationDto[], isDaily, selectedDepartments);
    case '2.4':
      return mapTreatmentsDailyCumulative(rows as DayRehabTreatmentsDailyCumulativeDto[], isDaily, selectedDepartments);
    case '2.5':
      return mapTreatmentsBySector(rows as DayRehabTreatmentsBySectorDto[], isDaily, selectedDepartments);
    case '2.6':
      return mapTreatmentsPerPosition(rows as DayRehabTreatmentsPerPositionDto[], isDaily, selectedDepartments);
    case '2.7':
      return mapAvgTreatmentsPerPatient(rows as DayRehabAvgTreatmentsPerPatientDto[], isDaily, selectedDepartments);
    case '2.8':
      return mapTreatmentsIndividualGroup(rows as DayRehabTreatmentsIndividualGroupDto[], isDaily, selectedDepartments);
    default:
      return emptyBlock(blockCode);
  }
}

function mapPatientsByPayer(
  rows: DayRehabPatientsByPayerDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = new Map<string, number>();
  filtered.forEach((row) => {
    const key = row.payerName || 'לא ידוע';
    totals.set(key, (totals.get(key) || 0) + row.patientCount);
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const periodLabel = isDaily ? 'היום' : '30 ימים';

  return {
    ...emptyBlock('2.1'),
    kpis: [
      { label: `מטופלים (${periodLabel})`, value: formatNumber(total), accent: 'primary' },
      { label: 'גורמים משלמים', value: formatNumber(entries.length), accent: 'muted' },
    ],
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'count', label: periodLabel, align: 'center' },
    ],
    tableRows: entries.map(([payer, count]) => ({
      id: `day-payer-${payer}`,
      cells: { payer, count: formatNumber(count) },
    })),
    chartType: 'PieChart',
    chartColumns: ['גורם משלם', 'מטופלים'],
    chartRows: entries.map(([payer, count]) => [payer, count]),
  };
}

function mapPatientsByDirection(
  rows: DayRehabPatientsByDirectionDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = new Map<string, number>();
  filtered.forEach((row) => {
    const key = `${row.direction} · ${row.funderName}`;
    totals.set(key, (totals.get(key) || 0) + row.patientCount);
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const periodLabel = isDaily ? 'היום' : '30 ימים';

  return {
    ...emptyBlock('2.2'),
    kpis: [
      { label: `מטופלים (${periodLabel})`, value: formatNumber(total), accent: 'primary' },
    ],
    tableColumns: [
      { key: 'segment', label: 'פנים/חוץ · מממן' },
      { key: 'count', label: periodLabel, align: 'center' },
    ],
    tableRows: entries.map(([segment, count]) => ({
      id: `day-direction-${segment}`,
      cells: { segment, count: formatNumber(count) },
    })),
    chartType: 'PieChart',
    chartColumns: ['קטגוריה', 'מטופלים'],
    chartRows: entries.map(([segment, count]) => [segment, count]),
  };
}

function mapDischarges(
  rows: DayRehabDischargesWithRecommendationDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = filtered.reduce(
    (acc, row) => ({
      dischargeCount: acc.dischargeCount + row.dischargeCount,
      treatedHere: acc.treatedHere + row.treatedHere,
      notTreatedHere: acc.notTreatedHere + row.notTreatedHere,
    }),
    { dischargeCount: 0, treatedHere: 0, notTreatedHere: 0 },
  );
  const periodLabel = isDaily ? 'היום' : '30 ימים';

  return {
    ...emptyBlock('2.3'),
    kpis: [
      { label: `משחררים (${periodLabel})`, value: formatNumber(totals.dischargeCount), accent: 'primary' },
      { label: 'מטופלים אצלנו', value: formatNumber(totals.treatedHere), accent: 'success' },
      { label: 'לא מטופלים אצלנו', value: formatNumber(totals.notTreatedHere), accent: 'warn' },
    ],
    tableColumns: [
      { key: 'dept', label: 'מחלקה' },
      { key: 'discharges', label: 'משחררים', align: 'center' },
      { key: 'here', label: 'מטופלים אצלנו', align: 'center' },
      { key: 'notHere', label: 'לא מטופלים', align: 'center' },
    ],
    tableRows: filtered.map((row) => ({
      id: `day-discharge-${row.departmentName}-${row.date}`,
      cells: {
        dept: row.departmentName,
        discharges: formatNumber(row.dischargeCount),
        here: formatNumber(row.treatedHere),
        notHere: formatNumber(row.notTreatedHere),
      },
    })),
    chartType: 'ColumnChart',
    chartColumns: ['קטגוריה', 'כמות'],
    chartRows: [
      ['משחררים', totals.dischargeCount],
      ['מטופלים אצלנו', totals.treatedHere],
      ['לא מטופלים אצלנו', totals.notTreatedHere],
    ],
  };
}

function mapTreatmentsDailyCumulative(
  rows: DayRehabTreatmentsDailyCumulativeDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const byDate = new Map<string, { daily: number; cumulative: number }>();
  filtered.forEach((row) => {
    if (!row.date) {
      return;
    }
    const current = byDate.get(row.date) || { daily: 0, cumulative: 0 };
    current.daily += row.dailyCount;
    current.cumulative += row.cumulativeCount;
    byDate.set(row.date, current);
  });
  const dates = Array.from(byDate.keys()).sort();
  const latest = dates.length ? byDate.get(dates[dates.length - 1])! : { daily: 0, cumulative: 0 };

  return {
    ...emptyBlock('2.4'),
    kpis: [
      { label: isDaily ? 'טיפולים היום' : 'טיפולים (30 ימים)', value: formatNumber(latest.daily), accent: 'primary' },
      { label: 'מצטבר', value: formatNumber(latest.cumulative), accent: 'success' },
    ],
    tableColumns: [
      { key: 'date', label: 'תאריך' },
      { key: 'daily', label: 'יומי', align: 'center' },
      { key: 'cumulative', label: 'מצטבר', align: 'center' },
    ],
    tableRows: dates.map((date) => ({
      id: `day-treatments-${date}`,
      cells: {
        date,
        daily: formatNumber(byDate.get(date)!.daily),
        cumulative: formatNumber(byDate.get(date)!.cumulative),
      },
    })),
    chartType: 'LineChart',
    chartColumns: ['תאריך', 'יומי', 'מצטבר'],
    chartRows: dates.map((date) => {
      const entry = byDate.get(date)!;
      return [date, entry.daily, entry.cumulative];
    }),
  };
}

function mapTreatmentsBySector(
  rows: DayRehabTreatmentsBySectorDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = new Map<string, number>();
  filtered.forEach((row) => {
    const key = row.sectorName || 'לא ידוע';
    totals.set(key, (totals.get(key) || 0) + row.treatmentCount);
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return {
    ...emptyBlock('2.5'),
    kpis: [{ label: 'סה״כ טיפולים', value: formatNumber(total), accent: 'primary' }],
    tableColumns: [
      { key: 'sector', label: 'סקטור' },
      { key: 'count', label: isDaily ? 'היום' : '30 ימים', align: 'center' },
    ],
    tableRows: entries.map(([sector, count]) => ({
      id: `day-sector-${sector}`,
      cells: { sector, count: formatNumber(count) },
    })),
    chartType: 'PieChart',
    chartColumns: ['סקטור', 'טיפולים'],
    chartRows: entries.map(([sector, count]) => [sector, count]),
  };
}

function mapTreatmentsPerPosition(
  rows: DayRehabTreatmentsPerPositionDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = new Map<string, { sum: number; count: number }>();
  filtered.forEach((row) => {
    const key = row.sectorName || 'לא ידוע';
    const current = totals.get(key) || { sum: 0, count: 0 };
    current.sum += row.treatmentsPerPosition;
    current.count += 1;
    totals.set(key, current);
  });
  const entries = Array.from(totals.entries())
    .map(([sector, stat]) => [sector, stat.count ? stat.sum / stat.count : 0] as const)
    .sort((a, b) => b[1] - a[1]);

  return {
    ...emptyBlock('2.6'),
    kpis: [{ label: 'סקטורים', value: formatNumber(entries.length), accent: 'primary' }],
    tableColumns: [
      { key: 'sector', label: 'סקטור' },
      { key: 'avg', label: 'טיפולים למשרה', align: 'center' },
    ],
    tableRows: entries.map(([sector, avg]) => ({
      id: `day-position-${sector}`,
      cells: { sector, avg: formatNumber(avg, 1) },
    })),
    chartType: 'ColumnChart',
    chartColumns: ['סקטור', 'טיפולים למשרה'],
    chartRows: entries.map(([sector, avg]) => [sector, Number(avg.toFixed(1))]),
  };
}

function mapAvgTreatmentsPerPatient(
  rows: DayRehabAvgTreatmentsPerPatientDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const byDept = new Map<string, { avgSum: number; patients: number; rows: number }>();
  filtered.forEach((row) => {
    const current = byDept.get(row.departmentName) || { avgSum: 0, patients: 0, rows: 0 };
    current.avgSum += row.avgTreatments;
    current.patients += row.patientCount;
    current.rows += 1;
    byDept.set(row.departmentName, current);
  });
  const entries = Array.from(byDept.entries())
    .map(([dept, stat]) => [dept, stat.rows ? stat.avgSum / stat.rows : 0, stat.patients] as const)
    .sort((a, b) => b[1] - a[1]);
  const overallAvg = entries.length
    ? entries.reduce((sum, [, avg]) => sum + avg, 0) / entries.length
    : 0;

  return {
    ...emptyBlock('2.7'),
    kpis: [{ label: 'ממוצע טיפולים למטופל', value: formatNumber(overallAvg, 1), accent: 'primary' }],
    tableColumns: [
      { key: 'dept', label: 'מחלקה' },
      { key: 'avg', label: 'ממוצע', align: 'center' },
      { key: 'patients', label: 'מטופלים', align: 'center' },
    ],
    tableRows: entries.map(([dept, avg, patients]) => ({
      id: `day-avg-${dept}`,
      cells: {
        dept,
        avg: formatNumber(avg, 1),
        patients: formatNumber(patients),
      },
    })),
    chartType: 'ColumnChart',
    chartColumns: ['מחלקה', 'ממוצע טיפולים'],
    chartRows: entries.map(([dept, avg]) => [dept, Number(avg.toFixed(1))]),
  };
}

function mapTreatmentsIndividualGroup(
  rows: DayRehabTreatmentsIndividualGroupDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const totals = new Map<string, number>();
  filtered.forEach((row) => {
    const key = row.treatmentType || 'לא ידוע';
    totals.set(key, (totals.get(key) || 0) + row.treatmentCount);
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return {
    ...emptyBlock('2.8'),
    kpis: [{ label: 'סה״כ טיפולים', value: formatNumber(total), accent: 'primary' }],
    tableColumns: [
      { key: 'type', label: 'סוג טיפול' },
      { key: 'count', label: isDaily ? 'היום' : '30 ימים', align: 'center' },
    ],
    tableRows: entries.map(([type, count]) => ({
      id: `day-type-${type}`,
      cells: { type, count: formatNumber(count) },
    })),
    chartType: 'PieChart',
    chartColumns: ['סוג', 'טיפולים'],
    chartRows: entries.map(([type, count]) => [type, count]),
  };
}
