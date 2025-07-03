export const DEFAULT_CHART_COLORS: string[] = ['#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8'];

export type SupportedChartType = 'column' | 'bar' | 'line' | 'pie' | 'area' | 'combo';

export interface ChartOptionsInput {
  title?: string;
  chartType?: SupportedChartType;
  height?: number;
  showLegend?: boolean;
  showTrendline?: boolean;
  showHtmlTooltip?: boolean;
  isDarkMode?: boolean;
  currency?: string;
  usePercent?: boolean;
  isStacked?: boolean;
  isRtl?: boolean;
  locale?: string;
  shortFormat?: boolean;
  showAnnotations?: boolean;
  colors?: string[];
  width?:number;
  hAxisDirection?: number;
}



export function getChartOptions({
  title = 'Chart',
  chartType = 'column',
  height = 400,
  width = 400,
  showLegend = true,
  showTrendline = true,
  showHtmlTooltip = true,
  isDarkMode = false,
  currency = '',
  usePercent = false,
  isStacked = false,
  isRtl = false,
  locale = 'he',
  colors,
  shortFormat = true,  
  showAnnotations = true, 
  hAxisDirection, 
}: ChartOptionsInput): any {
  
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const effectiveColors = (colors && colors.length > 0) ? colors : DEFAULT_CHART_COLORS;

  const vAxisFormat = usePercent
    ? '#\'%\''
    : currency
      ? `${currency}#,###`
      : shortFormat
        ? 'short'
        : undefined;

  const commonOptions: any = {
    title,
    height,
    width,
    backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
    chartArea: { width: '80%', height: '70%' },
    titleTextStyle: { color: textColor, fontSize: 18, bold: true },
    legend: showLegend ? { position: 'bottom', textStyle: { color: textColor } } : 'none',
    tooltip: { isHtml: showHtmlTooltip },
    direction: isRtl ? 'rtl' : 'ltr',
    locale,
    animation: {
      duration: 800,
      easing: 'out',
      startup: true
    },
    colors: effectiveColors,
  };

  // Non-pie → add axis, annotations, stacked if needed
  if (chartType !== 'pie') {
    commonOptions.hAxis = {
      title: 'תאריך',
      textStyle: { color: textColor },
      titleTextStyle: { color: textColor },
      slantedText: true,
      minValue: 0,
      slantedTextAngle: 45,
      direction: hAxisDirection ?? (isRtl ? -1 : 1),
    };

    commonOptions.vAxis = {
      title: chartType === 'bar' ? 'תאריך' : 'הכנסות',
      format: vAxisFormat,
      minValue: 0,
      textStyle: { color: textColor },
      titleTextStyle: { color: textColor }
    };

    if (showAnnotations) {
      commonOptions.annotations = {
        alwaysOutside: true,
        textStyle: { fontSize: 12, color: textColor }
      };
    }

    commonOptions.isStacked = (chartType === 'area' || chartType === 'combo' || isStacked) ? true : undefined;
  }

  // Trendlines → only on line/column/combo
  // if ((chartType === 'line' || chartType === 'column' || chartType === 'combo') && showTrendline) {
  //   commonOptions.trendlines = {
  //     0: {
  //       color: 'green',
  //       lineWidth: 2,
  //       opacity: 0.3,
  //       showR2: true,
  //       type: 'linear'
  //     }
  //   };
  // }

  if ((chartType === 'line' || chartType === 'column' || chartType === 'combo') && showTrendline) {
    // Create trendlines dynamically for all series (excluding label column)
    const trendlines: any = {};
    const seriesCount = effectiveColors.length; // Or: chartData[0].length - 1;
    for (let i = 0; i < seriesCount; i++) {
      trendlines[i] = {
        color: effectiveColors[i] || 'green',
        lineWidth: 2,
        opacity: 0.3,
        type: 'linear',
        showR2: true
      };
    }
    commonOptions.trendlines = trendlines;
  }

  // Special pie handling
  if (chartType === 'pie') {
    commonOptions.pieSliceText = usePercent ? 'percentage' : 'value';
    commonOptions.pieHole = 0; // donut = 0.4
    commonOptions.pieStartAngle = 100;
    commonOptions.legend = showLegend ? { position: 'right', textStyle: { color: textColor } } : 'none';
  }

  return commonOptions;
}


export function aggregateForPie(rawData: { label: string; value: number; deptGroupName: string }[]): { name: string; value: number }[] {
  const result: Record<string, number> = {};

  rawData.forEach(item => {
    const group = item.deptGroupName || 'לא ידוע';
    result[group] = (result[group] || 0) + item.value;
  });

  return Object.entries(result).map(([name, value]) => ({ name, value }));
}
