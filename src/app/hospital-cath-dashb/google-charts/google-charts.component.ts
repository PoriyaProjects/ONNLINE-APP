import { Component, AfterViewInit } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { MDCRipple } from '@material/ripple';

@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class GoogleChartsComponent implements AfterViewInit {

  selectedTypes: { [key: string]: boolean } = {
    'אלקטיבי': true,
    'דחוף': true,
    'ססיה': true
  };

  constructor(public googleChartsService: GoogleChartsService) {}

  ngAfterViewInit(): void {
    this.googleChartsService.loadAndDrawCharts();
    
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => new MDCRipple(button as HTMLElement));

    // Default load yearly chart
    setTimeout(() => {
      (document.getElementById('timeAvgGroupByDropdown') as HTMLSelectElement).value = 'yearly';
      this.drawTimeAvgChart();
    }, 500); // small delay to ensure charts library is ready
  }

  drawTimeAvgChart(): void {
    this.googleChartsService.drawTimeAvgChart('bar_chart_time_avg', {}, this.selectedTypes);
  }

  toggleType(type: string): void {
    this.selectedTypes[type] = !this.selectedTypes[type];
    this.drawTimeAvgChart();
  }
}

