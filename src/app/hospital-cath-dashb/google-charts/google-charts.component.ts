import { Component, AfterViewInit, HostListener } from '@angular/core';
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
    // setTimeout(() => {
    //   (document.getElementById('timeAvgGroupByDropdown') as HTMLSelectElement).value = 'yearly';
    //   this.drawTimeAvgChart();
    // }, 2500); 
    setTimeout(() => {
      try {
        const dropdown = document.getElementById('timeAvgGroupByDropdown') as HTMLSelectElement;
        if (dropdown) {
          dropdown.value = 'yearly';
          this.drawTimeAvgChart();
        }
      } catch (e) {
        console.error("Dropdown setting failed:", e);
      }
    }, 2500);
    
  }

  drawTimeAvgChart(): void {
    this.googleChartsService.drawTimeAvgChart('bar_chart_time_avg', {}, this.selectedTypes);
  }

  toggleType(type: string): void {
    this.selectedTypes[type] = !this.selectedTypes[type];
    this.drawTimeAvgChart();
  }

  updateSelectedTypes(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.selectedTypes[checkbox.value] = checkbox.checked;
    this.drawTimeAvgChart();
  }

private resizeTimeout: any;

@HostListener('window:resize')
onResize(): void {
  clearTimeout(this.resizeTimeout);
  this.resizeTimeout = setTimeout(() => {
    this.googleChartsService.redrawCharts();
  }, 300);
}
}

