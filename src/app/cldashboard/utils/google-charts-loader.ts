import { Injectable } from '@angular/core';
import { deepMerge } from '../utils/object-utils';


declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class ChartLoaderService {
  private chartsReady = false;
  private callbacks: (() => void)[] = [];

  private readonly CHART_COLORS: string[] = [
    '#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8'
  ];

  constructor() {
    this.loadGoogleCharts();
  }

  private loadGoogleCharts() {
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      this.chartsReady = true;
      this.callbacks.forEach(cb => cb());
    });
  }

  onReady(cb: () => void): void {
    if (this.chartsReady) cb();
    else this.callbacks.push(cb);
  }

  getColors(): string[] {
    return this.CHART_COLORS;
  }

  getBaseOptions(): any {
    return {
      colors: this.CHART_COLORS,
      legend: { position: 'bottom' },
      animation: {
        duration: 600,
        easing: 'out',
        startup: true
      },
      annotations: { alwaysOutside: true },
      trendlines: { 1: {type: 'linear', color: '#247a3a', lineWidth: 3, opacity: 0.7, showR2: true, visibleInLegend: false} }, 
      vAxis: { minValue: 0 }
    };
  }
 

  mergeOptions(
    chartType: 'LineChart' | 'ColumnChart' | 'BarChart' | 'AreaChart' | 'ComboChart',
    baseOptions: Record<string, any> = {}
  ): Record<string, any> {
    const commonDefaults = {
      height: 400,
      legend: { position: 'bottom' },
      annotations: {
        alwaysOutside: true,
        textStyle: {
          fontSize: 12,
          color: '#666',
          auraColor: 'none'
        }
      },
      hAxis: {
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        minValue: 0,
        format: 'short'
      },
      colors: this.CHART_COLORS
    };
  

    const chartSpecificDefaults: Record<string, any> = {
      LineChart: {
        curveType: 'function',
        trendlines: {
          1: {
            type: 'linear',
            color: '#247a3a',
            lineWidth: 3,
            opacity: 0.7,
            visibleInLegend: false,
            showR2: true
          }
        }
      },
      ColumnChart: {
        trendlines: {
          1: {
            type: 'linear',
            color: '#247a3a',
            lineWidth: 3,
            opacity: 0.7,
            visibleInLegend: false,
            showR2: true
          }
        }
      },
      BarChart: {},
      AreaChart: {},
      ComboChart: {}
    };
  
    const merged = this.deepMerge(
      commonDefaults,
      chartSpecificDefaults[chartType] || {}
    );
  
    return this.deepMerge(merged, baseOptions);
  }
  
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const isObject = (obj: any) =>
      obj && typeof obj === 'object' && !Array.isArray(obj);
  
    const output = { ...target };
  
    Object.keys(source).forEach(key => {
      const targetValue = (target as any)[key];
      const sourceValue = (source as any)[key];
  
      if (isObject(targetValue) && isObject(sourceValue)) {
        (output as any)[key] = this.deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue;
      }
    });
  
    return output;
  }

  

  drawChart(
    type: 'LineChart' | 'ColumnChart' | 'BarChart' | 'AreaChart' | 'PieChart' | 'ComboChart',
    element: HTMLElement,
    data: any,
    options: any
  ): void {
    let chart;
    switch (type) {
      case 'LineChart': chart = new google.visualization.LineChart(element); break;
      case 'ColumnChart': chart = new google.visualization.ColumnChart(element); break;
      case 'BarChart': chart = new google.visualization.BarChart(element); break;
      case 'AreaChart': chart = new google.visualization.AreaChart(element); break;
      case 'PieChart': chart = new google.visualization.PieChart(element); break;
      case 'ComboChart': chart = new google.visualization.ComboChart(element); break;
      default: throw new Error(`Unsupported chart type: ${type}`);
    }
    chart.draw(data, options);
  }

  public ensureDates(startDate: string, endDate: string): { startDate: string, endDate: string } {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), 0, 1);
    const defaultEnd = today;
  
    return {
      startDate: startDate || defaultStart.toISOString().split('T')[0],
      endDate: endDate || defaultEnd.toISOString().split('T')[0]
    };
  }
  
}


