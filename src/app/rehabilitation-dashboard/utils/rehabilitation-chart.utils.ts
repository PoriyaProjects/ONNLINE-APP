export const REHAB_CHART_PRIMARY = '#0077B6';
export const REHAB_CHART_STACK_COLORS = ['#0077B6', '#F4A261', '#64748B'];
export const REHAB_CHART_FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

export interface RehabColumnChartAxisConfig {
  hTitle: string;
  vTitle: string;
  vMin?: number;
  vMax?: number;
  vFormat?: string;
}

export function buildRehabColumnChartOptions(
  axes: RehabColumnChartAxisConfig,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const vAxis: Record<string, unknown> = {
    title: axes.vTitle,
    titleTextStyle: { fontSize: 12, bold: true, color: '#334155' },
    textStyle: { fontSize: 11, color: '#475569' },
    minValue: axes.vMin ?? 0,
    gridlines: { color: '#e2e8f0', count: 6 },
    minorGridlines: { color: '#f1f5f9' },
  };
  if (axes.vMax != null) {
    vAxis.maxValue = axes.vMax;
  }
  if (axes.vFormat) {
    vAxis.format = axes.vFormat;
  }

  return {
    legend: { position: 'none' },
    chartArea: { left: 56, top: 44, right: 16, bottom: 52, width: '88%', height: '66%' },
    backgroundColor: 'transparent',
    colors: [REHAB_CHART_PRIMARY],
    fontName: REHAB_CHART_FONT,
    bar: { groupWidth: '50%' },
    hAxis: {
      title: axes.hTitle,
      titleTextStyle: { fontSize: 12, bold: true, color: '#334155' },
      textStyle: { fontSize: 11, color: '#475569' },
      slantedText: false,
      showTextEvery: 1,
    },
    vAxis,
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 11,
        bold: true,
        color: '#0f172a',
        auraColor: 'none',
      },
      stem: { color: 'transparent', length: 6 },
    },
    tooltip: { isHtml: true, trigger: 'both' },
    ...extra,
  };
}

function mergeTextStyle(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(base || {}), ...patch };
}

export function applyDarkChartOptions(options: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(options)) as Record<string, unknown>;
  const legend = (clone.legend as Record<string, unknown>) || {};
  legend.textStyle = mergeTextStyle(legend.textStyle as Record<string, unknown>, {
    fontSize: 12,
    color: '#e5e7eb',
  });
  clone.legend = legend;

  const hAxis = (clone.hAxis as Record<string, unknown>) || {};
  hAxis.textStyle = mergeTextStyle(hAxis.textStyle as Record<string, unknown>, {
    fontSize: 11,
    color: '#cbd5e1',
  });
  hAxis.titleTextStyle = mergeTextStyle(hAxis.titleTextStyle as Record<string, unknown>, {
    color: '#e2e8f0',
  });
  clone.hAxis = hAxis;

  const vAxis = (clone.vAxis as Record<string, unknown>) || {};
  vAxis.textStyle = mergeTextStyle(vAxis.textStyle as Record<string, unknown>, {
    fontSize: 11,
    color: '#cbd5e1',
  });
  vAxis.titleTextStyle = mergeTextStyle(vAxis.titleTextStyle as Record<string, unknown>, {
    color: '#e2e8f0',
  });
  vAxis.gridlines = { color: 'rgba(148,163,184,0.25)' };
  vAxis.minorGridlines = { color: 'rgba(148,163,184,0.12)' };
  clone.vAxis = vAxis;

  const annotations = (clone.annotations as Record<string, unknown>) || {};
  annotations.textStyle = mergeTextStyle(annotations.textStyle as Record<string, unknown>, {
    color: '#f8fafc',
  });
  clone.annotations = annotations;

  return clone;
}

export function buildRehabWeeklyLineChartOptions(
  vTitle: string,
  pointCount: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const dense = pointCount > 10;
  const showEvery = Math.max(1, Math.ceil(pointCount / 8));
  return {
    legend: { position: 'none' },
    backgroundColor: 'transparent',
    fontName: REHAB_CHART_FONT,
    colors: [REHAB_CHART_PRIMARY],
    areaOpacity: 0.18,
    lineWidth: 3,
    pointSize: dense ? 5 : 8,
    dataOpacity: 1,
    curveType: 'none',
    interpolateNulls: true,
    crosshair: {
      trigger: 'both',
      orientation: 'vertical',
      color: '#94a3b8',
      opacity: 0.4,
    },
    focusTarget: 'category',
    tooltip: REHAB_HTML_TOOLTIP_OPTIONS,
    chartArea: { left: 52, top: 18, right: 18, bottom: dense ? 64 : 48, width: '90%', height: dense ? '72%' : '78%' },
    hAxis: {
      title: '',
      textStyle: { fontSize: dense ? 10 : 11, color: '#64748b' },
      slantedText: dense,
      slantedTextAngle: 32,
      showTextEvery: showEvery,
      maxTextLines: 1,
      maxAlternation: 1,
      minTextSpacing: 18,
      baselineColor: '#e2e8f0',
      gridlines: { color: 'transparent' },
    },
    vAxis: {
      title: vTitle,
      titleTextStyle: { fontSize: 11, bold: true, color: '#475569' },
      textStyle: { fontSize: 11, color: '#64748b' },
      minValue: 0,
      baselineColor: '#cbd5e1',
      gridlines: { color: '#eef2f7', count: 5 },
      minorGridlines: { count: 0 },
    },
    ...extra,
  };
}

export function rehabMonthKeysInRange(fromDate: string, toDate: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(Number(fromDate.slice(0, 4)), Number(fromDate.slice(5, 7)) - 1, 1);
  const end = new Date(Number(toDate.slice(0, 4)), Number(toDate.slice(5, 7)) - 1, 1);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

export function rehabMonthShortLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${String(month).padStart(2, '0')}.${String(year % 100).padStart(2, '0')}`;
}

export function rehabIsoDaysInRange(fromDate: string, toDate: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Number(fromDate.slice(0, 4)),
    Number(fromDate.slice(5, 7)) - 1,
    Number(fromDate.slice(8, 10)),
  );
  const end = new Date(
    Number(toDate.slice(0, 4)),
    Number(toDate.slice(5, 7)) - 1,
    Number(toDate.slice(8, 10)),
  );
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    return keys;
  }
  while (cursor <= end) {
    keys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function rehabDayShortLabel(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10));
  const month = Number(isoDate.slice(5, 7));
  if (!day || !month) {
    return isoDate;
  }
  return `${day}.${month}`;
}

export function getSundayWeekStartIso(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - date.getDay());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const REHAB_HTML_TOOLTIP_COL: Record<string, unknown> = {
  type: 'string',
  role: 'tooltip',
  p: { html: true },
};

export const REHAB_HTML_TOOLTIP_OPTIONS = { isHtml: true, trigger: 'both' };

export function escapeRehabChartHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const REHAB_TOOLTIP_WRAP = [
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

export function buildRehabChartTooltipHtml(
  period: string,
  title: string,
  valueText: string,
  meaning: string,
  extra?: string,
): string {
  const extraHtml = extra
    ? `<div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#cbd5e1">${escapeRehabChartHtml(extra)}</div>`
    : '';
  return `<div class="rehab-chart-tooltip" style="${REHAB_TOOLTIP_WRAP}">
    <div style="font-size:12px;opacity:0.85;margin-bottom:4px">${escapeRehabChartHtml(period)}</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:6px">${escapeRehabChartHtml(title)}</div>
    <div style="font-size:22px;font-weight:800;line-height:1.1;margin-bottom:4px;color:#7dd3fc">${escapeRehabChartHtml(valueText)}</div>
    ${extraHtml}
    <div style="font-size:12px;opacity:0.92;padding-top:8px;border-top:1px solid rgba(148,163,184,0.35);line-height:1.45">${escapeRehabChartHtml(meaning)}</div>
  </div>`;
}

export function formatWeekLineLabel(weekStartIso: string): string {
  const [year, month, day] = weekStartIso.slice(0, 10).split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()}.${start.getMonth() + 1}–${end.getDate()}.${end.getMonth() + 1}`;
}

export function formatWeekRangeWithYear(weekStartIso: string): string {
  const [year, month, day] = weekStartIso.slice(0, 10).split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  return `${fmt(start)}–${fmt(end)}`;
}

export interface RehabWeeklyLineChartSpec {
  seriesLabel: string;
  metricTitle: string;
  meaning: string;
  valueSuffix: string;
  vTitle: string;
  aggregate?: 'sum' | 'avg';
}

export function buildWeeklyLineChartRows(
  items: Array<{ date: string; value: number }>,
  fromDate: string,
  toDate: string,
  spec: RehabWeeklyLineChartSpec,
): { columns: (string | Record<string, unknown>)[]; rows: (string | number)[][] } {
  const aggregate = spec.aggregate ?? 'sum';
  const startIso = getSundayWeekStartIso(fromDate);
  const [toY, toM, toD] = toDate.slice(0, 10).split('-').map(Number);
  const rangeEnd = new Date(toY, toM - 1, toD);
  const rows: (string | number)[][] = [];
  const cursor = new Date(
    Number(startIso.slice(0, 4)),
    Number(startIso.slice(5, 7)) - 1,
    Number(startIso.slice(8, 10)),
  );

  while (cursor <= rangeEnd) {
    const weekStartIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const weekEndIso = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    const inWeek = items.filter((item) => {
      const date = item.date.slice(0, 10);
      return date >= weekStartIso && date <= weekEndIso;
    });
    if (inWeek.length) {
      const sum = inWeek.reduce((total, item) => total + item.value, 0);
      const value = aggregate === 'avg' ? sum / inWeek.length : sum;
      const rounded = Number(value.toFixed(1));
      const valueText = `${rounded.toLocaleString('he-IL', { maximumFractionDigits: 1 })} ${spec.valueSuffix}`;
      const extra = aggregate === 'avg' ? 'ממוצע יומי בשבוע' : 'סה״כ השבוע';
      rows.push([
        formatWeekLineLabel(weekStartIso),
        rounded,
        buildRehabChartTooltipHtml(
          `שבוע ${formatWeekRangeWithYear(weekStartIso)} (א׳–ש׳)`,
          spec.metricTitle,
          valueText,
          spec.meaning,
          extra,
        ),
      ]);
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return {
    columns: ['שבוע', spec.seriesLabel, REHAB_HTML_TOOLTIP_COL],
    rows,
  };
}

export function getDashboardYearMonthCount(year: number, reference = new Date()): number {
  return year === reference.getFullYear() ? reference.getMonth() + 1 : 12;
}

export function buildRehabStackedColumnChartOptions(
  axes: RehabColumnChartAxisConfig,
  monthCount: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return buildRehabColumnChartOptions(axes, {
    isStacked: true,
    colors: REHAB_CHART_STACK_COLORS,
    legend: {
      position: 'bottom',
      alignment: 'center',
      textStyle: { fontSize: 11, color: '#475569' },
    },
    hAxis: {
      title: axes.hTitle,
      titleTextStyle: { fontSize: 12, bold: true, color: '#334155' },
      textStyle: { fontSize: 11, color: '#475569' },
      slantedText: monthCount > 6,
      slantedTextAngle: 45,
      showTextEvery: 1,
    },
    chartArea: { left: 56, top: 36, right: 16, bottom: 72, width: '88%', height: '62%' },
    ...extra,
  });
}
