import { RehabTableRow } from '../models/rehabilitation-dashboard.models';
import {
  REHAB_TREATMENT_PROFESSION_ORDER,
  RehabilitationTreatmentDto,
} from '../models/rehabilitation-treatments.models';
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

function toneFromDelta(delta: number): RehabStatusIndicator['tone'] {
  if (delta >= 4) return 'excellent';
  if (delta >= 0) return 'good';
  if (delta >= -4) return 'warn';
  return 'danger';
}

function makeIndicator(
  id: string,
  label: string,
  sharePct: number,
  displayValue: string,
  quantity: number,
  quantityMax: number,
  quantityLabel: string,
): RehabStatusIndicator {
  return {
    id,
    label,
    valuePct: Math.min(100, Math.max(0, sharePct)),
    displayValue,
    averageDisplay: formatPct(sharePct),
    deltaVsAvg: 0,
    quantity,
    quantityMax: Math.max(quantity, quantityMax, 1),
    averageQuantity: quantity,
    quantityLabel,
    tone: toneFromDelta(0),
  };
}

interface ProfessionSummary {
  profession: string;
  total: number;
  avgPerPatientDay: number;
}

function filterRows(
  rows: RehabilitationTreatmentDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabilitationTreatmentDto[] {
  let filtered = rows;
  if (!isDaily) {
    filtered = filtered.filter((row) => row.weekdayOnly);
  }
  if (selectedDepartments.length) {
    const selected = new Set(selectedDepartments);
    filtered = filtered.filter((row) => selected.has(row.departmentName));
  }
  return filtered;
}

function aggregateByProfession(rows: RehabilitationTreatmentDto[]): ProfessionSummary[] {
  const totals = new Map<string, { total: number; weightedAvg: number }>();
  rows.forEach((row) => {
    const profession = row.professionName;
    if (!profession) {
      return;
    }
    const current = totals.get(profession) || { total: 0, weightedAvg: 0 };
    current.total += row.totalTreatments;
    current.weightedAvg += row.avgPerPatientDay * row.totalTreatments;
    totals.set(profession, current);
  });

  const ordered = REHAB_TREATMENT_PROFESSION_ORDER
    .map((profession) => {
      const entry = totals.get(profession);
      if (!entry) {
        return null;
      }
      return {
        profession,
        total: entry.total,
        avgPerPatientDay: entry.total > 0 ? entry.weightedAvg / entry.total : 0,
      };
    })
    .filter((row) => row != null);

  const extras = Array.from(totals.entries())
    .filter(([profession]) => !REHAB_TREATMENT_PROFESSION_ORDER.includes(profession as typeof REHAB_TREATMENT_PROFESSION_ORDER[number]))
    .map(([profession, entry]) => ({
      profession,
      total: entry.total,
      avgPerPatientDay: entry.total > 0 ? entry.weightedAvg / entry.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return [...ordered, ...extras];
}

export function mapTreatmentsRowsToStatusBlock(
  rows: RehabilitationTreatmentDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterRows(rows, isDaily, selectedDepartments);
  const summaries = aggregateByProfession(filtered);
  const totalTreatments = summaries.reduce((sum, row) => sum + row.total, 0);
  const avgPerPatient = totalTreatments > 0
    ? summaries.reduce((sum, row) => sum + row.avgPerPatientDay * row.total, 0) / totalTreatments
    : 0;
  const quantityLabel = isDaily ? 'טיפולים היום' : 'טיפולים (אמצע שבוע)';
  const weekdayNote = isDaily ? 'יומי' : 'אמצע שבוע';

  const tableRows: RehabTableRow[] = summaries.map((entry) => ({
    id: `trt-${entry.profession}`,
    cells: {
      profession: entry.profession,
      total: formatNumber(entry.total),
      avgPerPatientDay: formatNumber(entry.avgPerPatientDay, 2),
      weekdayOnly: weekdayNote,
    },
  }));

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'trt-total',
      isDaily ? 'סה״כ היום' : 'סה״כ שבוע',
      100,
      formatNumber(totalTreatments),
      totalTreatments,
      Math.max(totalTreatments, 1),
      quantityLabel,
    ),
    makeIndicator(
      'trt-avg',
      'ממוצע למאושפז/יום',
      Math.min(100, avgPerPatient * 10),
      formatNumber(avgPerPatient, 2),
      Math.round(avgPerPatient * 10),
      40,
      'טיפולים למאושפז',
    ),
  ];
  if (summaries.length) {
    const top = summaries[0];
    const share = totalTreatments > 0 ? (top.total / totalTreatments) * 100 : 0;
    indicators.push(makeIndicator(
      `trt-${top.profession}`,
      top.profession,
      share,
      formatNumber(top.total),
      top.total,
      Math.max(totalTreatments, top.total, 1),
      quantityLabel,
    ));
  }

  return {
    code: '1.8',
    title: 'טיפולי מקצועות בריאות למאושפזים',
    icon: 'medical_services',
    help: 'סה״כ טיפולים לפי מקצוע וממוצע טיפולים למאושפז ביום (אמצע שבוע בלבד).',
    kpis: [
      {
        label: isDaily ? 'טיפולים היום' : 'טיפולים (אמצע שבוע)',
        value: formatNumber(totalTreatments),
        accent: 'primary',
      },
      {
        label: 'ממוצע למאושפז/יום',
        value: formatNumber(avgPerPatient, 2),
        accent: 'success',
      },
      {
        label: 'מקצועות פעילים',
        value: String(summaries.filter((row) => row.total > 0).length),
        accent: 'muted',
      },
    ],
    indicators,
    tableColumns: [
      { key: 'profession', label: 'מקצוע' },
      { key: 'total', label: isDaily ? 'היום' : 'שבוע', align: 'center' },
      { key: 'avgPerPatientDay', label: 'ממוצע/יום', align: 'center' },
      { key: 'weekdayOnly', label: 'הערה', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: ['מקצוע', 'סה״כ', 'ממוצע/יום'],
    chartRows: summaries.map((entry) => [
      entry.profession,
      entry.total,
      Number(entry.avgPerPatientDay.toFixed(2)),
    ]),
  };
}
