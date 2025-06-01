import { formatNumberShort } from '../../shared/number-utils';
export function ensureDates(startDate: string, endDate: string): { startDate: string, endDate: string } {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), 0, 1); // Jan 1
    const defaultEnd = today;
  
    const safeStart = startDate || defaultStart.toISOString().split('T')[0];
    const safeEnd = endDate || defaultEnd.toISOString().split('T')[0];
  
    return { startDate: safeStart, endDate: safeEnd };
  }
  

  export function formatDateForApi(date: string): string {
    if (!date || date.length !== 10) return '';
    const [yyyy, mm, dd] = date.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  

export function toChartData(
  data: { label: string; value: number }[],
  columns: [string, string],
  options: { showAnnotations?: boolean; shortFormat?: boolean; showPercentage?: boolean } = {}
): any[][] {
  const { showAnnotations = true, shortFormat = true, showPercentage = false } = options;

  const total = showPercentage ? data.reduce((acc, d) => acc + d.value, 0) : 0;

  const header: any[] = [columns[0], columns[1]];
  if (showAnnotations) {
    header.push({ type: 'string', role: 'annotation' });
  }

  const rows = data.map(d => {
    const row = [d.label, d.value];
    if (showAnnotations) {
      const annotation = showPercentage
        ? `${d.value} (${((d.value / total) * 100).toFixed(1)}%)`
        : shortFormat
        ? formatShortNumber(d.value)
        : d.value.toString();
      row.push(annotation);
    }
    return row;
  });

  return [header, ...rows];
}


export interface ChartRow {
  label: string;
  values: number[];
}

export interface ChartOptions {
  showAnnotations?: boolean;
  shortFormat?: boolean;
  showPercentage?: boolean;
}

export interface ChartSeriesConfig {
  label: string;
  axis?: number; // optional axis index
  role?: 'annotation' | 'tooltip' | 'style'; // default is value
  format?: 'short' | 'long' | 'percent'; // affects annotations
  showAnnotation?: boolean;
  showPercentage?: boolean;
  useTooltip?: boolean;
  color?: string;
}


export function toLineChartData(
  data: ChartRow[],
  columns: string[], // e.g. ['Date', 'Revenue', 'Expenses']
  options: ChartOptions = {}
): any[][] {
  const {
    showAnnotations = true,
    shortFormat = true,
    showPercentage = false
  } = options;

  const valueColumns = columns.slice(1); // first is the category (e.g., "Date")
  const numSeries = valueColumns.length;

  // Calculate totals if needed for percentage annotations
  const totals: number[] = Array(numSeries).fill(0);
  if (showPercentage) {
    data.forEach(row => {
      row.values.forEach((val, i) => {
        totals[i] += val;
      });
    });
  }

  // Build headers
  const header: any[] = [columns[0]];
  valueColumns.forEach(() => {
    header.push(...(showAnnotations ? ['value', { type: 'string', role: 'annotation' }] : ['value']));
  });

  // Build rows
  const rows: any[][] = data.map(row => {
    const rowData: any[] = [row.label];
    row.values.forEach((val, i) => {
      rowData.push(val);

      if (showAnnotations) {
        const annotation = showPercentage
          ? `${val} (${((val / totals[i]) * 100).toFixed(1)}%)`
          : shortFormat
          ? formatShortNumber(val)
          : val.toString();
        rowData.push(annotation);
      }
    });
    return rowData;
  });

  return [header, ...rows];
}


export function toChartDataAdvanced(
  data: { label: string; values: number[] }[],
  categoryLabel: string,
  seriesConfigs: ChartSeriesConfig[]
): any[][] {
  const headers: any[] = [categoryLabel];

  const totals = Array(seriesConfigs.length).fill(0);
  data.forEach(row =>
    row.values.forEach((v, i) => (totals[i] += v))
  );

  // Build header with optional role columns
  seriesConfigs.forEach((cfg, idx) => {
    headers.push(cfg.label);

    if (cfg.showAnnotation) {
      headers.push({ type: 'string', role: 'annotation' });
    }

    if (cfg.useTooltip) {
      headers.push({ type: 'string', role: 'tooltip' });
    }

    if (cfg.color) {
      headers.push({ type: 'string', role: 'style' });
    }
  });

  // Build rows
  const rows = data.map(row => {
    const rowData: any[] = [row.label];

    row.values.forEach((value, i) => {
      const cfg = seriesConfigs[i];
      rowData.push(value);

      if (cfg.showAnnotation) {
        const annotation = cfg.showPercentage
          ? `${value} (${((value / totals[i]) * 100).toFixed(1)}%)`
          : cfg.format === 'short'
          ? formatShortNumber(value)
          : value.toString();
        rowData.push(annotation);
      }

      if (cfg.useTooltip) {
        const tip = `${cfg.label}: ${value}`;
        rowData.push(tip);
      }

      if (cfg.color) {
        rowData.push(`color: ${cfg.color}`);
      }
    });

    return rowData;
  });

  return [headers, ...rows];
}

function formatShortNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}



export function toMultiSeriesChartData(
  categories: string[],
  series: { name: string; values: number[] }[],
  showAnnotations: boolean = false,
  shortFormat: boolean = true,
  showPercentageAnnotations: boolean = false
): any[][] {
  const headers: any[] = ['Category', ...series.reduce((acc, s) => {
    return acc.concat(
      showAnnotations
        ? [s.name, { type: 'string', role: 'annotation' }]
        : [s.name]
    );
  }, [])];

  const rows: any[][] = categories.map((cat, i) => {
    const row: any[] = [cat];
    const total = series.reduce((sum, s) => sum + (s.values[i] || 0), 0);

    series.forEach(s => {
      const val = s.values[i] ?? 0;
      const raw = val.toString();
      const short = formatNumberShort(val);
      const percent = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '';

      const annotation = showPercentageAnnotations
        ? `${shortFormat ? short : raw} (${percent})`
        : shortFormat ? short : raw;

      row.push(val);
      if (showAnnotations) row.push(annotation);
    });

    return row;
  });

  return [headers, ...rows];
}
