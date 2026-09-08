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

export function getSundayWeekStartIso(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - date.getDay());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatWeekLineLabel(weekStartIso: string): string {
  const [year, month, day] = weekStartIso.slice(0, 10).split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()}.${start.getMonth() + 1}–${end.getDate()}.${end.getMonth() + 1}`;
}

export function buildWeeklyLineChartRows(
  items: Array<{ date: string; value: number }>,
  fromDate: string,
  toDate: string,
  valueLabel: string,
  aggregate: 'sum' | 'avg' = 'sum',
): { columns: (string | Record<string, unknown>)[]; rows: (string | number)[][] } {
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
      rows.push([formatWeekLineLabel(weekStartIso), Number(value.toFixed(1))]);
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return {
    columns: ['שבוע', valueLabel],
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
