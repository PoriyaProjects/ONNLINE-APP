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
