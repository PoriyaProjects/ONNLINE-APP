import { Component, AfterViewInit, HostListener, Renderer2 } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { sanitizeSoapResponse, sanitizeSoapResponseAndFormatData } from '../../shared/sanitizesoapresponce';


import { MDCRipple } from '@material/ripple';

@Component({
  selector: 'app-google-income-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class GoogleChartsIncomeNBComponent implements AfterViewInit {

  private resizeTimeout: any;
  constructor(public googleChartsService: GoogleChartsService, private renderer: Renderer2) {}
  
  ngAfterViewInit(): void {    
    this.loadCharts();    
  }

  ngOnInit(): void {
    const link = this.renderer.createElement('link');
    link.rel = 'stylesheet';
    link.href = './assets/kassets/klubamed.css';
    document.head.appendChild(link);
  }

  @HostListener('window:resize')
  onResize(): void {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.loadCharts();      
    }, 300);
  }

  /** 🔁 Loads all main charts at once */
  private loadCharts(): void {    
    this.loadYearlyComparisonChart();    
    this.loadGrowthTrendChart();
    this.loadGrowthChart();    
  }




/** 📊 Year-over-year comparison */
private loadYearlyComparisonChart(): void {
  this.googleChartsService.getYearlyComparisonData().subscribe(raw => {
    const parsed = sanitizeSoapResponse(raw);

    if (!parsed?.data?.length) {
      this.showNoDataMessage('yearly_comparison_chart');
      return;
    }

    const table = this.toGoogleChartTable(parsed.data, 'charging');

    google.charts.setOnLoadCallback(() => {
      const container = document.getElementById('yearly_comparison_chart');
      if (!container) return;
      const chart = new google.visualization.ColumnChart(container);
      chart.draw(new google.visualization.DataTable(table), {
        title: 'Year-over-Year Revenue Comparison',
        hAxis: { title: 'Month' },
        vAxis: { title: 'Revenue' },
        legend: { position: 'top' }
      });
    });
  });
}


/** 📈 Monthly revenue growth trend (line) */
private loadGrowthTrendChart(): void {
  this.googleChartsService.getGrowthData().subscribe(raw => {
    const parsed = sanitizeSoapResponse(raw);

    if (!parsed?.data?.length) {
      this.showNoDataMessage('growth_trend_chart');
      return;
    }

    const table = this.toGoogleChartTable(parsed.data, 'charging');

    google.charts.setOnLoadCallback(() => {
      const container = document.getElementById('growth_trend_chart');
      if (!container) return;
      const chart = new google.visualization.LineChart(container);
      chart.draw(new google.visualization.DataTable(table), {
        //title: 'Monthly Revenue Growth',
        curveType: 'function',
        legend: { position: 'bottom' }
      });
    });
  });
}


/** 📉 Monthly revenue growth (column) */
private loadGrowthChart(): void {
  this.googleChartsService.getGrowthData().subscribe(raw => {
    const parsed = sanitizeSoapResponse(raw);

    if (!parsed?.data?.length) {
      this.showNoDataMessage('growth_chart');
      return;
    }

    const table = this.toGoogleChartTable(parsed.data, 'charging');

    google.charts.setOnLoadCallback(() => {
      const container = document.getElementById('growth_chart');
      if (!container) return;
      const chart = new google.visualization.ColumnChart(container);
      chart.draw(new google.visualization.DataTable(table), {
        title: 'Monthly Growth Rate',
        hAxis: { title: 'Month' },
        vAxis: { title: 'Revenue' }
      });
    });
  });
}



private toGoogleChartTable(data: any[], valueKey: 'quantity' | 'charging') {
  return {
    cols: [
      { id: 'key', label: 'Key', type: 'string' },
      { id: valueKey, label: this.capitalize(valueKey), type: 'number' }
    ],
    rows: data.map(item => ({
      c: [
        { v: item.key },
        { v: item[valueKey] }
      ]
    }))
  };
}

private showNoDataMessage(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<div style="color: gray; text-align: center;">No data available</div>';
  }
}

private capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

  
}
