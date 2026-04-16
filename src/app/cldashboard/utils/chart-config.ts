export const defaultChartOptions = {
    legend: { position: 'bottom' },
    hAxis: { title: 'Time' },
    vAxis: { title: 'Value' }
  };

export const defaultLineChartOptions = {
    legend: { position: 'bottom' },
    hAxis: { title: 'Time' },
    vAxis: { title: 'Value' }
  };

  export function extractChartData(res: any, xLabel: string, yLabel: string): any[][] {
    const rows = res?.d?.[2]?.[0]?.filter(r => r != null).map((r: any) => [r.x, Number(r.y)]) || [];
    return [[xLabel, yLabel], ...rows];
  }