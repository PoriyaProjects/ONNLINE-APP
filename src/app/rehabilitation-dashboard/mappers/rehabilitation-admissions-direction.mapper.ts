import { RehabTableRow } from '../models/rehabilitation-dashboard.models';
import { RehabilitationAdmissionsByDirectionDto } from '../models/rehabilitation-admissions-direction.models';
import {
  RehabStatusBlock,
  RehabStatusIndicator,
} from '../models/rehabilitation-status.models';

const DIRECTION_INTERNAL = 'פנים';
const DIRECTION_EXTERNAL = 'חוץ';

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
  valuePct: number,
  displayValue: string,
  avgPct: number,
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
    averageDisplay: formatPct(avgPct),
    deltaVsAvg: valuePct - avgPct,
    quantity,
    quantityMax: Math.max(quantity, quantityMax, 1),
    averageQuantity,
    quantityLabel,
    tone: toneFromDelta(valuePct - avgPct),
  };
}

function filterByDepartments(
  rows: RehabilitationAdmissionsByDirectionDto[],
  selectedDepartments: string[],
): RehabilitationAdmissionsByDirectionDto[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments);
  return rows.filter((row) => selected.has(row.departmentName));
}

interface FunderDirectionAggregate {
  funderName: string;
  direction: string;
  count: number;
}

function aggregateByFunderDirection(
  rows: RehabilitationAdmissionsByDirectionDto[],
): FunderDirectionAggregate[] {
  const map = new Map<string, FunderDirectionAggregate>();
  rows.forEach((row) => {
    const key = `${row.funderName}::${row.direction}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += row.admissionsCount;
    } else {
      map.set(key, {
        funderName: row.funderName,
        direction: row.direction,
        count: row.admissionsCount,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function sumByDirection(rows: RehabilitationAdmissionsByDirectionDto[], direction: string): number {
  return rows
    .filter((row) => row.direction === direction)
    .reduce((sum, row) => sum + row.admissionsCount, 0);
}

export function mapAdmissionsDirectionRowsToStatusBlock(
  rows: RehabilitationAdmissionsByDirectionDto[],
  isDaily: boolean,
  selectedDepartments: string[],
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const internal = sumByDirection(filtered, DIRECTION_INTERNAL);
  const external = sumByDirection(filtered, DIRECTION_EXTERNAL);
  const total = internal + external;
  const internalPct = total > 0 ? (internal / total) * 100 : 0;
  const avgInternalPct = internalPct;
  const quantityLabel = isDaily ? 'מספר קבלות' : 'מספר קבלות (30 ימים)';
  const periodColumnLabel = isDaily ? 'היום' : '30 ימים';

  const byFunderDirection = aggregateByFunderDirection(filtered);
  const funderTotals = new Map<string, { internal: number; external: number }>();
  byFunderDirection.forEach((entry) => {
    const current = funderTotals.get(entry.funderName) || { internal: 0, external: 0 };
    if (entry.direction === DIRECTION_INTERNAL) {
      current.internal += entry.count;
    } else {
      current.external += entry.count;
    }
    funderTotals.set(entry.funderName, current);
  });

  const tableRows: RehabTableRow[] = [];
  Array.from(funderTotals.entries())
    .sort((a, b) => (b[1].internal + b[1].external) - (a[1].internal + a[1].external))
    .forEach(([funder, counts]) => {
      const fTotal = counts.internal + counts.external;
      tableRows.push({
        id: `${funder}-in`,
        cells: {
          funder,
          direction: DIRECTION_INTERNAL,
          count: formatNumber(counts.internal),
          share: formatPct(fTotal > 0 ? (counts.internal / fTotal) * 100 : 0),
        },
      });
      tableRows.push({
        id: `${funder}-out`,
        cells: {
          funder,
          direction: DIRECTION_EXTERNAL,
          count: formatNumber(counts.external),
          share: formatPct(fTotal > 0 ? (counts.external / fTotal) * 100 : 0),
        },
      });
    });

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'adm-internal',
      isDaily ? 'קבלות פנים' : 'פנים (30 ימים)',
      internalPct,
      formatPct(internalPct),
      avgInternalPct,
      internal,
      Math.max(internal, external, 20),
      Math.round((avgInternalPct / 100) * Math.max(total, 1)),
      quantityLabel,
    ),
    makeIndicator(
      'adm-external',
      isDaily ? 'קבלות חוץ' : 'חוץ (30 ימים)',
      100 - internalPct,
      formatPct(100 - internalPct),
      100 - avgInternalPct,
      external,
      Math.max(internal, external, 20),
      Math.round(((100 - avgInternalPct) / 100) * Math.max(total, 1)),
      quantityLabel,
    ),
  ];

  return {
    code: '1.5',
    title: 'קבלות – פנים / חוץ לפי גורם מממן',
    icon: 'swap_horiz',
    help: 'הפרדה בין קבלות פנים (PM_MOVE_RANGE=אישפוז) לחוץ, לפי מממן מ-MedicalRecords.Pay_Institute (מקור קבלות: PATIENT_MONITORING).',
    kpis: [
      { label: isDaily ? 'פנים היום' : 'פנים (30 ימים)', value: formatNumber(internal), accent: 'primary' },
      { label: isDaily ? 'חוץ היום' : 'חוץ (30 ימים)', value: formatNumber(external), accent: 'warn' },
      {
        label: 'יחס פנים/חוץ',
        value: `${(internal / (external || 1)).toFixed(1)} : 1`,
        accent: 'muted',
      },
    ],
    indicators,
    tableColumns: [
      { key: 'funder', label: 'גורם מממן' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'count', label: periodColumnLabel, align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'BarChart',
    chartColumns: ['כיוון', periodColumnLabel],
    chartRows: [
      [DIRECTION_INTERNAL, internal],
      [DIRECTION_EXTERNAL, external],
    ],
  };
}
