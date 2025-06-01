export type SupportedChartType = 'column' | 'bar' | 'line';

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
}

export function getChartOptions({
  title = 'Chart',
  chartType = 'column',
  height = 400,
  showLegend = true,
  showTrendline = false,
  showHtmlTooltip = true,
  isDarkMode = false,
  currency = '',
  usePercent = false,
  isStacked = false,
  isRtl = false,
  locale = 'he'
}: ChartOptionsInput): any {
  const textColor = isDarkMode ? '#ffffff' : '#333333';

  const vAxisFormat = usePercent
    ? '#\'%\''
    : currency
      ? `${currency}#,###`
      : undefined;

  const options: any = {
    title,
    height,
    isStacked: isStacked || undefined,
    tooltip: { isHtml: showHtmlTooltip },
    backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
    legend: showLegend ? { position: 'bottom', textStyle: { color: textColor } } : 'none',
    chartArea: { width: '80%', height: '70%' },
    titleTextStyle: { color: textColor, fontSize: 18, bold: true },
    hAxis: {
      title: 'תאריך',
      textStyle: { color: textColor },
      titleTextStyle: { color: textColor },
      slantedText: true,
      slantedTextAngle: 45,
      direction: isRtl ? -1 : 1
    },
    vAxis: {
      title: chartType === 'bar' ? 'תאריך' : 'הכנסות',
      format: vAxisFormat,
      textStyle: { color: textColor },
      titleTextStyle: { color: textColor }
    },
    annotations: {
      alwaysOutside: true,
      textStyle: { fontSize: 12, color: textColor }
    },
    direction: isRtl ? 'rtl' : 'ltr',
    locale,
    animation: {
      duration: 800,
      easing: 'out',
      startup: true
    }
  };

    if ((chartType === 'line' || chartType === 'column') && showTrendline) {
    options.trendlines = { 1: { 
      color: 'green',
      lineWidth: 2,
      opacity: 0.3,
      type: 'linear'} };
  }

  return options;
}
