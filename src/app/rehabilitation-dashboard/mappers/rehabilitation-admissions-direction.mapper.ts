import { RehabTableRow } from '../models/rehabilitation-dashboard.models';
import { RehabilitationAdmissionsByDirectionDto } from '../models/rehabilitation-admissions-direction.models';
import { getStatusDailyWeekdayLabel } from './rehabilitation-occupancy.mapper';
import {
  RehabAdmissionsPeriodContext,
} from './rehabilitation-admissions-payer.mapper';
import { rehabMonthKeysInRange, rehabMonthShortLabel } from '../utils/rehabilitation-chart.utils';
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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDirectionTooltipHtml(
  direction: string,
  count: number,
  total: number,
  periodLabel: string,
  monthLabel?: string,
): string {
  const isInternal = direction === DIRECTION_INTERNAL;
  const title = isInternal ? 'קבלות פנים' : 'קבלות חוץ';
  const meaning = isInternal
    ? 'מטופלים שהתקבלו מתוך המרכז (אשפוז פנימי)'
    : 'מטופלים שהתקבלו מחוץ למרכז';
  const sharePct = total > 0 ? (count / total) * 100 : 0;
  const wrap = [
    'direction:rtl',
    'text-align:right',
    'padding:12px 14px',
    'border-radius:12px',
    'background:linear-gradient(145deg,#1e293b 0%,#0f172a 100%)',
    'color:#f8fafc',
    'box-shadow:0 10px 28px rgba(15,23,42,0.4)',
    'font-family:Arial,sans-serif',
    'min-width:200px',
    'max-width:280px',
  ].join(';');
  const periodLine = monthLabel
    ? `${monthLabel} · ${periodLabel}`
    : `תקופה: ${periodLabel}`;

  return `<div class="rehab-admissions-tooltip" style="${wrap}">
    <div style="font-size:12px;opacity:0.85;margin-bottom:4px">${escapeHtml(periodLine)}</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:6px">${escapeHtml(title)}</div>
    <div style="font-size:22px;font-weight:800;line-height:1.1;margin-bottom:4px;color:#7dd3fc">${escapeHtml(formatNumber(count))} קבלות</div>
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#cbd5e1">${escapeHtml(formatNumber(sharePct, 0))}% מכלל הקבלות (${escapeHtml(formatNumber(total))})</div>
    <div style="font-size:12px;opacity:0.92;padding-top:8px;border-top:1px solid rgba(148,163,184,0.35);line-height:1.45">${escapeHtml(meaning)}</div>
  </div>`;
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
  period?: RehabAdmissionsPeriodContext | null,
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const internal = sumByDirection(filtered, DIRECTION_INTERNAL);
  const external = sumByDirection(filtered, DIRECTION_EXTERNAL);
  const total = internal + external;
  const internalPct = total > 0 ? (internal / total) * 100 : 0;
  const avgInternalPct = internalPct;
  const byMonth = !!period?.byMonth && !!period.fromDate && !!period.toDate;
  const monthKeys = byMonth && period ? rehabMonthKeysInRange(period.fromDate, period.toDate) : [];
  const periodLabel = isDaily
    ? getStatusDailyWeekdayLabel()
    : (monthKeys.length === 1
      ? rehabMonthShortLabel(monthKeys[0])
      : (monthKeys.length > 1 ? `${monthKeys.length} חודשים` : '30 ימים'));
  const quantityLabel = `מספר קבלות (${periodLabel})`;
  const periodColumnLabel = periodLabel;

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
      `פנים (${periodLabel})`,
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
      `חוץ (${periodLabel})`,
      100 - internalPct,
      formatPct(100 - internalPct),
      100 - avgInternalPct,
      external,
      Math.max(internal, external, 20),
      Math.round(((100 - avgInternalPct) / 100) * Math.max(total, 1)),
      quantityLabel,
    ),
  ];

  const monthlyRows = byMonth
    ? monthKeys.map((key) => {
      const monthRows = filtered.filter((row) => row.date.slice(0, 7) === key);
      const monthInternal = sumByDirection(monthRows, DIRECTION_INTERNAL);
      const monthExternal = sumByDirection(monthRows, DIRECTION_EXTERNAL);
      const monthTotal = monthInternal + monthExternal;
      const monthLabel = rehabMonthShortLabel(key);
      return [
        monthLabel,
        monthInternal,
        buildDirectionTooltipHtml(DIRECTION_INTERNAL, monthInternal, monthTotal, periodLabel, monthLabel),
        monthExternal,
        buildDirectionTooltipHtml(DIRECTION_EXTERNAL, monthExternal, monthTotal, periodLabel, monthLabel),
        monthTotal > 0 ? formatNumber(monthTotal) : '',
      ];
    })
    : [];

  const annotationColumn = { type: 'string', role: 'annotation' };
  const tooltipColumn = { type: 'string', role: 'tooltip', p: { html: true } };

  return {
    code: '1.5',
    title: 'קבלות – פנים / חוץ לפי גורם מממן',
    icon: 'swap_horiz',
    help: 'פנים = קבלות מתוך המרכז (אשפוז). חוץ = קבלות שהגיעו מחוץ למרכז. העמודה מציגה מספר קבלות בתקופה שנבחרה.',
    kpis: [],
    indicators,
    tableColumns: [
      { key: 'funder', label: 'גורם מממן' },
      { key: 'direction', label: 'כיוון', align: 'center' },
      { key: 'count', label: periodColumnLabel, align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: byMonth ? 'ColumnChart' : 'BarChart',
    chartColumns: byMonth
      ? ['חודש', 'פנים', tooltipColumn, 'חוץ', tooltipColumn, annotationColumn]
      : ['כיוון', 'מספר קבלות', annotationColumn, tooltipColumn],
    chartRows: byMonth
      ? monthlyRows
      : [
        [
          DIRECTION_INTERNAL,
          internal,
          formatNumber(internal),
          buildDirectionTooltipHtml(DIRECTION_INTERNAL, internal, total, periodLabel),
        ],
        [
          DIRECTION_EXTERNAL,
          external,
          formatNumber(external),
          buildDirectionTooltipHtml(DIRECTION_EXTERNAL, external, total, periodLabel),
        ],
      ],
    chartNote: 'פנים = מתוך המרכז · חוץ = מחוץ למרכז',
  };
}
