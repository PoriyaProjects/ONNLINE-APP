import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';
import { sanitizeSoapResponse } from '../../shared/sanitizesoapresponce';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  private cache = new Map<string, any>();
  private chartsReadySubject = new ReplaySubject<void>(1);
  public chartsReady$: Observable<void>;

  /** Fixed colors for chart items */
  private readonly CHART_COLORS = ['#6ba1f8', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8', '#5ed175'];

  /** Map period types to Hebrew labels & colors */
  private readonly PERIOD_TYPE_MAP: { [key: string]: { label: string; color: string } } = {
    '1-Yesterday': { label: 'אתמול', color: '#f86b6b' },
    '2-CurrentMonth': { label: 'החודש', color: '#a17ef8' },
    '3-CurrentYear': { label: 'השנה', color: '#00b3d7' },
    '4-ParallelsPeriod': { label: 'השתקד', color: '#fcd74e' }
  };

  constructor(private http: HttpClient) {
    this.chartsReady$ = this.chartsReadySubject.asObservable();
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      this.chartsReadySubject.next();
      this.chartsReadySubject.complete();
    });
  }

  /** Clear cache */
  public clearCache(): void {
    this.cache.clear();
  }

  /** Wait for charts */
  public async waitUntilChartsReady(): Promise<void> {
    return new Promise(resolve => this.chartsReady$.subscribe(() => resolve()));
  }

  /** Build URL */
  private buildUrl(base: string, params: { [k: string]: any }) {
    const search = new URLSearchParams();
    for (const key in params) if (params[key] != null) search.set(key, params[key]);
    return `${base}?${search.toString()}`;
  }

  /** Fetch API with caching */
  private async fetchWithCache(url: string): Promise<any> {
    if (this.cache.has(url)) return this.cache.get(url);
    const raw = await this.http.get(url, { responseType: 'text' }).toPromise();
    this.cache.set(url, raw);
    return raw;
  }

  /** Convert seconds to HH:MM */
  private formatToHHMM(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /** Generate axis ticks with HH:MM formatting */
  private generateHMMTicks(maxValue: number, step: number = 3600): any[] {
    const ticks = [];
    for (let i = 0; i <= maxValue; i += step) {
      ticks.push({ v: i, f: this.formatToHHMM(i) });
    }
    return ticks;
  }

  /** Translate a period type to Hebrew */
  private translatePeriodType(type: string): string {
    return this.PERIOD_TYPE_MAP[type]?.label || type;
  }

  /** Get color for a given period type */
  private getColorForType(type: string): string {
    return this.PERIOD_TYPE_MAP[type]?.color || this.CHART_COLORS[0];
  }

  /** Create a custom legend below a chart */
  private createLegend(container: HTMLElement): void {
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.marginTop = '10px';
    legend.style.gap = '20px';

    Object.values(this.PERIOD_TYPE_MAP).forEach(period => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '5px';
      item.style.fontSize = '14px';

      const colorBox = document.createElement('div');
      colorBox.style.width = '15px';
      colorBox.style.height = '15px';
      colorBox.style.backgroundColor = period.color;

      const label = document.createElement('span');
      label.innerText = period.label;

      item.appendChild(colorBox);
      item.appendChild(label);
      legend.appendChild(item);
    });

    container.appendChild(legend);
  }

  /**
   * Draw multiple charts grouped by DataSource
   */
  public async drawGroupedRoomTimeCharts(
    elementIds: { [key: string]: string },
    url: string,
    dparam: string,
    titlePrefix: string,
    valueIndex: number
  ): Promise<void> {
    await this.waitUntilChartsReady();

    try {
      const raw = await this.fetchWithCache(this.buildUrl(url, { dparam }));
      const clean = sanitizeSoapResponse(raw);

      if (!clean || !clean.rows?.length) {
        Object.values(elementIds).forEach(id => {
          const container = document.getElementById(id);
          if (container) container.innerHTML = 'אין נתונים להצגה';
        });
        return;
      }

      const isAvgTime = titlePrefix.includes('זמן ממוצע');

      // Group rows by DataSource
      const grouped: { [key: string]: any[] } = {};
      clean.rows.forEach((r: any) => {
        const ds = r.c[0]?.v || 'Unknown';
        if (!grouped[ds]) grouped[ds] = [];
        grouped[ds].push(r);
      });

      // Draw chart for each group
      for (const [dataSource, rows] of Object.entries(grouped)) {
        const elementId = elementIds[dataSource];
        if (!elementId) continue;
        const container = document.getElementById(elementId);
        if (!container) continue;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Period');
        dt.addColumn('number', 'Value');
        dt.addColumn({ type: 'string', role: 'style' }); // individual bar color
        dt.addColumn({ type: 'string', role: 'annotation' });

        let maxValue = 0;
        rows.forEach(r => {
          const type = r.c[1]?.v || '';
          const date = r.c[2]?.v || '';
          const value = r.c[valueIndex]?.v ?? 0;
          maxValue = Math.max(maxValue, value);

          const hebrewType = this.translatePeriodType(type);
          const color = this.getColorForType(type);
          const label = `${hebrewType} (${date})`;
          const formatted = isAvgTime ? this.formatToHHMM(Number(value)) : String(value);

          dt.addRow([label, Number(value), `color: ${color}`, formatted]);
        });

        // Format tooltip and axis for AvgTime
        if (isAvgTime) {
          for (let i = 0; i < dt.getNumberOfRows(); i++) {
            const val = dt.getValue(i, 1);
            dt.setFormattedValue(i, 1, this.formatToHHMM(val));
          }
        }

        const options = {
          title: `${titlePrefix} - ${dataSource}`,
          height: 400,
          bar: { groupWidth: '65%' },
          annotations: { alwaysOutside: true, textStyle: { fontSize: 13 } },
          hAxis: { slantedText: true, slantedTextAngle: 45 },
          vAxis: isAvgTime
            ? { minValue: 0, ticks: this.generateHMMTicks(maxValue, 3600) }
            : { minValue: 0 },
          legend: { position: 'none' }
        };

        new google.visualization.ColumnChart(container).draw(dt, options);
        this.createLegend(container); // add custom legend below each chart
      }
    } catch (err) {
      console.error('Error drawing grouped charts:', err);
      Object.values(elementIds).forEach(id => {
        const container = document.getElementById(id);
        if (container) container.innerHTML = 'שגיאה בטעינת נתונים';
      });
    }
  }
}
