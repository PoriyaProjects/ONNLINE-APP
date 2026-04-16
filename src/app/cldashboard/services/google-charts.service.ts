import { Injectable } from '@angular/core';


declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleChartsService {
  private isLoaded = false;

  constructor() {}

  load(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isLoaded) {
        resolve();
      } else {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(() => {
          this.isLoaded = true;
          resolve();
        });
      }
    });
  }
}
