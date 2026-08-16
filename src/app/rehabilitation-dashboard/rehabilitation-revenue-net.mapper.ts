import { MONTH_LABELS_HE } from './rehabilitation-dashboard.models';
import { RehabTableRow } from './rehabilitation-dashboard.models';
import { RehabilitationRevenueNetDto } from './rehabilitation-revenue-net.models';
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

function changePctFromAvg(revenue: number, avgMonthly: number): number {
  if (avgMonthly <= 0) {
    return 0;
  }
  return ((revenue - avgMonthly) / avgMonthly) * 100;
}

function formatChangePct(changePct: number, avgMonthly: number): string {
  if (avgMonthly <= 0) {
    return '—';
  }
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${formatNumber(changePct, 1)}%`;
}

function formatChangeCell(changePct: number, avgMonthly: number): string {
  if (avgMonthly <= 0) {
    return '—';
  }
  const arrow = changePct > 0 ? '▲ ' : changePct < 0 ? '▼ ' : '';
  return `${arrow}${formatChangePct(changePct, avgMonthly)}`;
}

function changeTone(changePct: number, avgMonthly: number): 'up' | 'down' | 'neutral' {
  if (avgMonthly <= 0 || changePct === 0) {
    return 'neutral';
  }
  return changePct > 0 ? 'up' : 'down';
}

function formatVsAvgCell(revenue: number, avgMonthly: number): string {
  if (avgMonthly <= 0) {
    return '—';
  }
  const ratio = (revenue / avgMonthly) * 100;
  return `${formatNumber(ratio, 0)}% מהממוצע`;
}

function buildRevenueTooltipHtml(
  title: string,
  revenue: number,
  avgMonthly: number,
  daysInMonth: number,
): string {
  const changePct = changePctFromAvg(revenue, avgMonthly);
  const perDay = daysInMonth > 0 ? revenue / daysInMonth : 0;
  const tone = changeTone(changePct, avgMonthly);
  const toneColor = tone === 'up' ? '#16a34a' : tone === 'down' ? '#dc2626' : '#64748b';
  const changeLabel = formatChangeCell(changePct, avgMonthly);
  const vsAvg = formatVsAvgCell(revenue, avgMonthly);

  return `<div class="rehab-revenue-tooltip" dir="rtl">
    <div class="rehab-revenue-tooltip__title">${escapeHtml(title)}</div>
    <div class="rehab-revenue-tooltip__amount">${escapeHtml(formatCurrency(revenue))}</div>
    <div class="rehab-revenue-tooltip__row">
      <span class="rehab-revenue-tooltip__change" style="color:${toneColor}">${escapeHtml(changeLabel)}</span>
      <span class="rehab-revenue-tooltip__badge">${escapeHtml(vsAvg)}</span>
    </div>
    <div class="rehab-revenue-tooltip__footer">ממוצע חודשי ${escapeHtml(formatCurrency(avgMonthly))} · ליום ${escapeHtml(formatCurrency(perDay))}</div>
  </div>`;
}

function buildRevenueTableTooltip(
  title: string,
  revenue: number,
  avgMonthly: number,
  daysInMonth: number,
): string {
  const changePct = changePctFromAvg(revenue, avgMonthly);
  const perDay = daysInMonth > 0 ? revenue / daysInMonth : 0;
  return [
    title,
    formatCurrency(revenue),
    `${formatChangeCell(changePct, avgMonthly)} · ${formatVsAvgCell(revenue, avgMonthly)}`,
    `ממוצע חודשי: ${formatCurrency(avgMonthly)}`,
    `ליום: ${formatCurrency(perDay)}`,
  ].join('\n');
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

function buildLast12MonthBuckets(reference = new Date()): MonthRevenueBucket[] {
  const today = new Date(reference);
  const buckets: MonthRevenueBucket[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    buckets.push({
      key,
      label: `${MONTH_LABELS_HE[month]} ${year}`,
      shortLabel: formatMonthShortLabel(year, month),
      revenue: 0,
      daysInMonth: new Date(year, month, 0).getDate(),
    });
  }
  return buckets;
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
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const monthlyBuckets = aggregateRevenueByMonth(filtered, buildLast12MonthBuckets());
  const totalRev = monthlyBuckets.reduce((sum, bucket) => sum + bucket.revenue, 0);
  const monthsWithRevenue = monthlyBuckets.filter((bucket) => bucket.revenue > 0);
  const latestMonth = monthlyBuckets[monthlyBuckets.length - 1];
  const topMonth = [...monthlyBuckets].sort((a, b) => b.revenue - a.revenue)[0];
  const avgMonthly = monthsWithRevenue.length
    ? totalRev / monthsWithRevenue.length
    : 0;
  const latestChangePct = latestMonth ? changePctFromAvg(latestMonth.revenue, avgMonthly) : 0;

  const tableRows: RehabTableRow[] = [...monthlyBuckets].reverse().map((bucket) => {
    const changePct = changePctFromAvg(bucket.revenue, avgMonthly);
    const tone = changeTone(changePct, avgMonthly);
    return {
      id: `rev-${bucket.key}`,
      cells: {
        month: bucket.label,
        revenue: formatCurrency(bucket.revenue),
        vsAvg: formatVsAvgCell(bucket.revenue, avgMonthly),
        change: formatChangeCell(changePct, avgMonthly),
        perDay: formatCurrency(bucket.daysInMonth > 0 ? bucket.revenue / bucket.daysInMonth : 0),
      },
      tooltip: buildRevenueTableTooltip(bucket.label, bucket.revenue, avgMonthly, bucket.daysInMonth),
      cellTones: {
        vsAvg: tone,
        change: tone,
      },
    };
  });

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'rev-total',
      'סה״כ 12 חודשים',
      100,
      formatCurrency(totalRev),
      totalRev,
      Math.max(totalRev, 1),
      'הכנסות',
    ),
  ];
  if (latestMonth?.revenue > 0) {
    const share = totalRev > 0 ? (latestMonth.revenue / totalRev) * 100 : 0;
    indicators.push(makeIndicator(
      `rev-${latestMonth.key}`,
      `חודש אחרון (${latestMonth.shortLabel})`,
      share,
      formatCurrency(latestMonth.revenue),
      latestMonth.revenue,
      Math.max(totalRev, latestMonth.revenue, 1),
      'הכנסות חודש',
    ));
  }
  if (topMonth && topMonth.revenue > 0 && topMonth.key !== latestMonth?.key) {
    const share = totalRev > 0 ? (topMonth.revenue / totalRev) * 100 : 0;
    indicators.push(makeIndicator(
      `rev-top-${topMonth.key}`,
      `שיא (${topMonth.shortLabel})`,
      share,
      formatCurrency(topMonth.revenue),
      topMonth.revenue,
      Math.max(totalRev, topMonth.revenue, 1),
      'הכנסות חודש',
    ));
  }

  const tooltipColumn = { type: 'string', role: 'tooltip', p: { html: true } };

  return {
    code: '1.7',
    title: 'הכנסות לפי מחיר נטו',
    icon: 'payments',
    help: 'הכנסות מאשפוז שיקום לפי מחיר נטו — 12 חודשים אחרונים, עמודה לכל חודש (מקור: Invoices + PATIENT_MONITORING).',
    kpis: [
      {
        label: 'סה״כ 12 חודשים',
        value: formatCurrency(totalRev),
        accent: 'primary',
      },
      {
        label: `חודש אחרון (${latestMonth?.shortLabel || ''})`,
        value: formatCurrency(latestMonth?.revenue || 0),
        sub: avgMonthly > 0 && latestMonth?.revenue
          ? `${formatChangeCell(latestChangePct, avgMonthly)} מהממוצע`
          : undefined,
        accent: 'success',
      },
      {
        label: 'ממוצע חודשי',
        value: formatCurrency(avgMonthly),
        accent: 'warn',
      },
    ],
    indicators,
    tableColumns: [
      { key: 'month', label: 'חודש' },
      { key: 'revenue', label: 'הכנסות', align: 'center' },
      { key: 'vsAvg', label: 'לעומת ממוצע', align: 'center' },
      { key: 'change', label: 'שינוי %', align: 'center' },
      { key: 'perDay', label: 'ליום', align: 'center' },
    ],
    tableRows,
    chartType: 'ColumnChart',
    chartColumns: ['חודש', 'הכנסות (₪)', tooltipColumn],
    chartRows: monthlyBuckets.map((bucket) => {
      const revenue = Math.round(bucket.revenue);
      return [
        bucket.shortLabel,
        revenue,
        buildRevenueTooltipHtml(bucket.label, bucket.revenue, avgMonthly, bucket.daysInMonth),
      ];
    }),
    compareChartColumns: ['חודש', 'הכנסות (₪)', tooltipColumn],
    compareChartRows: monthlyBuckets.map((bucket) => {
      const revenue = Math.round(bucket.revenue);
      return [
        bucket.shortLabel,
        revenue,
        buildRevenueTooltipHtml(bucket.label, bucket.revenue, avgMonthly, bucket.daysInMonth),
      ];
    }),
  };
}
