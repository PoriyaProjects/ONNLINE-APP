import { Injectable, NgZone } from '@angular/core';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(private zone: NgZone) {}

  /** Ensure Google Charts loader is available and loaded once */
  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = new Promise<void>((resolve) => {
      // Load the Google Charts script if not present
      if (!(window as any).google || !(window as any).google.charts) {
        const s = document.createElement('script');
        s.src = 'https://www.gstatic.com/charts/loader.js';
        s.async = true;
        s.onload = () => this.init(resolve);
        document.head.appendChild(s);
      } else {
        this.init(resolve);
      }
    });

    return this.loadingPromise;
  }

  private init(resolve: () => void) {
    (window as any).google.charts.load('current', { packages: ['corechart', 'table', 'bar', 'treemap'] });
    (window as any).google.charts.setOnLoadCallback(() => {
      this.loaded = true;
      resolve();
    });
  }

  /** Draws a chart by calling the given callback inside Angular's zone */
  draw(cb: () => void) {
    this.zone.runOutsideAngular(() => cb());
  }
}
