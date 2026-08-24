export function applyDarkChartOptions(options: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(options)) as Record<string, unknown>;
  const legend = (clone.legend as Record<string, unknown>) || {};
  legend.textStyle = { fontSize: 12, color: '#e5e7eb' };
  clone.legend = legend;
  const hAxis = (clone.hAxis as Record<string, unknown>) || {};
  hAxis.textStyle = { fontSize: 11, color: '#cbd5e1' };
  clone.hAxis = hAxis;
  const vAxis = (clone.vAxis as Record<string, unknown>) || {};
  vAxis.textStyle = { fontSize: 11, color: '#cbd5e1' };
  vAxis.gridlines = { color: 'rgba(148,163,184,0.2)' };
  clone.vAxis = vAxis;
  return clone;
}
