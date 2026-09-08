import { MONTH_LABELS_HE } from '../models/rehabilitation-dashboard.models';
import { RehabTableRow } from '../models/rehabilitation-dashboard.models';
import { RehabilitationRevenueNetDto } from '../models/rehabilitation-revenue-net.models';
import { RehabStatusBlock } from '../models/rehabilitation-status.models';

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(n: number): string {
  return `₪${Math.round(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function changePctFromPrevMonth(revenue: number, prevRevenue: number | null): number | null {
  if (prevRevenue == null || prevRevenue <= 0 || revenue <= 0) {
    return null;
  }
  return ((revenue - prevRevenue) / prevRevenue) * 100;
}

export function roundedMomChangePct(revenue: number, prevRevenue: number | null): number | null {
  const changePct = changePctFromPrevMonth(revenue, prevRevenue);
  if (changePct == null) {
    return null;
  }
  return Math.round(changePct);
}

function formatMomChangeCell(revenue: number, prevRevenue: number | null): string {
  const changePct = roundedMomChangePct(revenue, prevRevenue);
  if (changePct == null) {
    return '—';
  }
  const arrow = changePct > 0 ? '▲ ' : changePct < 0 ? '▼ ' : '';
  const sign = changePct > 0 ? '+' : '';
  return `${arrow}${sign}${formatNumber(changePct, 0)}%`;
}

function momChangeTone(revenue: number, prevRevenue: number | null): 'up' | 'down' | 'neutral' {
  const changePct = roundedMomChangePct(revenue, prevRevenue);
  if (changePct == null || changePct === 0) {
    return 'neutral';
  }
  return changePct > 0 ? 'up' : 'down';
}

export type RehabRevenueChartUnit = 'amount' | 'percent';

function formatChartPercentAnnotation(revenue: number, prevRevenue: number | null): string {
  const changePct = roundedMomChangePct(revenue, prevRevenue);
  if (changePct == null) {
    return '';
  }
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct}%`;
}

function formatChartMoneyAnnotation(revenue: number): string {
  return revenue <= 0 ? '' : formatCurrency(revenue);
}

function buildRevenueTooltipHtml(
  title: string,
  revenue: number,
  prevRevenue: number | null,
  sharePct?: number | null,
): string {
  const tone = momChangeTone(revenue, prevRevenue);
  const toneColor = tone === 'up' ? '#16a34a' : tone === 'down' ? '#dc2626' : '#64748b';
  const momLabel = formatMomChangeCell(revenue, prevRevenue);
  const wrap = [
    'direction:rtl',
    'text-align:right',
    'padding:12px 14px',
    'border-radius:12px',
    'background:linear-gradient(145deg,#1e293b 0%,#0f172a 100%)',
    'color:#f8fafc',
    'box-shadow:0 10px 28px rgba(15,23,42,0.4)',
    'font-family:Arial,sans-serif',
    'min-width:168px',
  ].join(';');
  const shareLine = sharePct != null
    ? `<div style="font-size:12px;margin-bottom:6px;opacity:0.9">${escapeHtml(formatNumber(sharePct, 0))}% מסה״כ התקופה</div>`
    : '';

  return `<div class="rehab-revenue-tooltip" style="${wrap}">
    <div style="font-size:12px;opacity:0.85;margin-bottom:6px">${escapeHtml(title)}</div>
    <div style="font-size:20px;font-weight:700;line-height:1.15;margin-bottom:8px;letter-spacing:-0.02em">${escapeHtml(formatCurrency(revenue))}</div>
    ${shareLine}
    <div style="font-size:13px;font-weight:700;color:${toneColor}">${escapeHtml(momLabel === '—' ? 'אין השוואה לחודש קודם' : `${momLabel} מחודש קודם`)}</div>
  </div>`;
}

function buildRevenueTableTooltip(
  title: string,
  revenue: number,
  prevRevenue: number | null,
): string {
  return [
    title,
    formatCurrency(revenue),
    `${formatMomChangeCell(revenue, prevRevenue)} מחודש קודם`,
  ].join('\n');
}

function filterByDepartments(
  rows: RehabilitationRevenueNetDto[],
  selectedDepartments: string[],
): RehabilitationRevenueNetDto[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments);
  return rows.filter((row) => selected.has(row.departmentName));
}

interface MonthRevenueBucket {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
  daysInMonth: number;
}

function formatMonthShortLabel(year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  const yy = String(year % 100).padStart(2, '0');
  return `${mm}.${yy}`;
}

function monthKeyToBucket(key: string): MonthRevenueBucket {
  const [year, month] = key.split('-').map(Number);
  return {
    key,
    label: `${MONTH_LABELS_HE[month]} ${year}`,
    shortLabel: formatMonthShortLabel(year, month),
    revenue: 0,
    daysInMonth: new Date(year, month, 0).getDate(),
  };
}

function currentMonthKey(reference = new Date()): string {
  const today = new Date(reference);
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function buildRevenueRollingMonthBuckets(reference = new Date()): MonthRevenueBucket[] {
  const today = new Date(reference);
  const buckets: MonthRevenueBucket[] = [];
  // Server SQL: offsets 0..11 from current month. Client skips 0 → use 11..1 (11 months, no current).
  for (let offset = 11; offset >= 1; offset -= 1) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth() + 1;
    buckets.push(monthKeyToBucket(`${year}-${String(month).padStart(2, '0')}`));
  }
  return buckets;
}

export interface RehabRevenueMonthRange {
  fromDate: string;
  toDate: string;
}

function monthBucketsFromDateRange(
  range: RehabRevenueMonthRange,
  reference = new Date(),
): MonthRevenueBucket[] {
  const excludeKey = currentMonthKey(reference);
  const buckets: MonthRevenueBucket[] = [];
  const cursor = new Date(Number(range.fromDate.slice(0, 4)), Number(range.fromDate.slice(5, 7)) - 1, 1);
  const end = new Date(Number(range.toDate.slice(0, 4)), Number(range.toDate.slice(5, 7)) - 1, 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key !== excludeKey) {
      buckets.push(monthKeyToBucket(key));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

function filterRevenueRowsForClientWindow(
  rows: RehabilitationRevenueNetDto[],
  buckets: MonthRevenueBucket[],
): RehabilitationRevenueNetDto[] {
  const allowedKeys = new Set(buckets.map((bucket) => bucket.key));
  return rows.filter((row) => {
    const key = row.date?.slice(0, 7);
    return !!key && allowedKeys.has(key);
  });
}

function buildRevenueMonthBuckets(
  range?: RehabRevenueMonthRange | null,
  reference = new Date(),
): MonthRevenueBucket[] {
  if (range?.fromDate && range?.toDate) {
    const selected = monthBucketsFromDateRange(range, reference);
    if (selected.length) {
      return selected;
    }
  }
  return buildRevenueRollingMonthBuckets(reference);
}

function aggregateRevenueByMonth(
  rows: RehabilitationRevenueNetDto[],
  buckets: MonthRevenueBucket[],
): MonthRevenueBucket[] {
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  rows.forEach((row) => {
    const key = row.date?.slice(0, 7);
    if (!key) {
      return;
    }
    const bucket = bucketByKey.get(key);
    if (bucket) {
      bucket.revenue += row.revenueAmount;
    }
  });
  return buckets;
}

export function mapRevenueNetRowsToStatusBlock(
  rows: RehabilitationRevenueNetDto[],
  selectedDepartments: string[],
  chartUnit: RehabRevenueChartUnit = 'amount',
  monthRange?: RehabRevenueMonthRange | null,
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const monthBuckets = buildRevenueMonthBuckets(monthRange);
  const monthlyBuckets = aggregateRevenueByMonth(
    filterRevenueRowsForClientWindow(filtered, monthBuckets),
    monthBuckets,
  );
  const periodTotal = monthlyBuckets.reduce((sum, bucket) => sum + bucket.revenue, 0);

  const tableRows: RehabTableRow[] = [...monthlyBuckets].reverse().map((bucket) => {
    const bucketIndex = monthlyBuckets.findIndex((item) => item.key === bucket.key);
    const prevRevenue = bucketIndex > 0 ? monthlyBuckets[bucketIndex - 1].revenue : null;
    const tone = momChangeTone(bucket.revenue, prevRevenue);
    const sharePct = periodTotal > 0 ? (bucket.revenue / periodTotal) * 100 : 0;
    return {
      id: `rev-${bucket.key}`,
      cells: {
        month: bucket.label,
        revenue: formatCurrency(bucket.revenue),
        share: `${formatNumber(sharePct, 0)}%`,
        mom: formatMomChangeCell(bucket.revenue, prevRevenue),
      },
      tooltip: buildRevenueTableTooltip(bucket.label, bucket.revenue, prevRevenue),
      cellTones: {
        mom: tone,
      },
    };
  });

  const annotationColumn = { type: 'string', role: 'annotation' };
  const tooltipColumn = { type: 'string', role: 'tooltip', p: { html: true } };
  const asPercent = chartUnit === 'percent';

  return {
    code: '1.7',
    title: 'הכנסות לפי מחיר נטו',
    icon: 'payments',
    help: 'הכנסות מאשפוז שיקום לפי מחיר נטו — עמודה או נקודה לכל חודש בטווח שנבחר (ללא חודש נוכחי; מיושם בפרונט. מקור: דו"ח הכנסות — Excel_QuarterlyIncome).',
    kpis: [],
    indicators: [],
    tableColumns: [
      { key: 'month', label: 'חודש' },
      { key: 'revenue', label: 'הכנסות', align: 'center' },
      { key: 'share', label: 'אחוז מסה״כ', align: 'center' },
      { key: 'mom', label: 'שינוי מחודש קודם', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: asPercent
      ? ['חודש', 'עלייה', annotationColumn, tooltipColumn, 'ירידה', annotationColumn, tooltipColumn]
      : ['חודש', 'הכנסות (₪)', annotationColumn, tooltipColumn],
    chartRows: monthlyBuckets.map((bucket) => {
      const bucketIndex = monthlyBuckets.findIndex((item) => item.key === bucket.key);
      const prevRevenue = bucketIndex > 0 ? monthlyBuckets[bucketIndex - 1].revenue : null;
      const sharePct = periodTotal > 0 ? (bucket.revenue / periodTotal) * 100 : 0;
      const tooltip = buildRevenueTooltipHtml(bucket.label, bucket.revenue, prevRevenue, sharePct);
      if (asPercent) {
        const momPct = roundedMomChangePct(bucket.revenue, prevRevenue);
        const annotation = formatChartPercentAnnotation(bucket.revenue, prevRevenue);
        const upValue = momPct != null && momPct >= 0 ? momPct : null;
        const downValue = momPct != null && momPct < 0 ? momPct : null;
        return [
          bucket.shortLabel,
          upValue,
          momPct != null && momPct >= 0 ? annotation : '',
          tooltip,
          downValue,
          momPct != null && momPct < 0 ? annotation : '',
          tooltip,
        ];
      }
      return [
        bucket.shortLabel,
        Math.round(bucket.revenue),
        formatChartMoneyAnnotation(bucket.revenue),
        tooltip,
      ];
    }),
  };
}
