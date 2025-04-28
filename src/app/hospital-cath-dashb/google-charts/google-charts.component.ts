import { Component, AfterViewInit } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { MDCRipple } from '@material/ripple';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';


@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class GoogleChartsComponent implements AfterViewInit {

  constructor(private chartsService: GoogleChartsService) {}

  ngAfterViewInit(): void {
    this.chartsService.loadAndDrawCharts();
    // Initialize MDC Ripple on buttons
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => new MDCRipple(button as HTMLElement));

  }
}


