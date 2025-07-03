import { Component, AfterViewInit, HostListener } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { sanitizeSoapResponse, sanitizeSoapResponseAndFormatData } from '../../shared/sanitizesoapresponce';

import { MDCRipple } from '@material/ripple';

@Component({
  selector: 'app-google-income-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class GoogleChartsIncomeComponent implements AfterViewInit {

  deptGroups = [
    { id: 1, name: 'Internal' },
    { id: 2, name: 'Surgical' }
  ];

  departments = [
    { id: 101, groupId: 1, name: 'Internal A' },
    { id: 102, groupId: 1, name: 'Internal B' },
    { id: 201, groupId: 2, name: 'Surgery A' },
    { id: 202, groupId: 2, name: 'Surgery B' }
  ];

  filteredDepts = [];
  selectedDeptGroupId = 0;
  selectedDeptId = 0;

  selectedTypes: { [key: string]: boolean } = {
    'אלקטיבי': true,
    'דחוף': true,
    'ססיה': true
  };

  globalChartControls = {
    showTrendline: true,
    showAnnotations: true,
    showLegend: true,
    shortFormat: true,
    showPercentageAnnotations: false
  };

  private resizeTimeout: any;

  constructor(public googleChartsService: GoogleChartsService) {}



  
  ngAfterViewInit(): void {
    this.googleChartsService.loadAndDrawCharts();

    this.loadCharts();

    document.querySelectorAll('.mdc-button').forEach(btn => new MDCRipple(btn as HTMLElement));

    setTimeout(() => {
      const dropdown = document.getElementById('timeAvgGroupByDropdown') as HTMLSelectElement;
      if (dropdown) {
        dropdown.value = 'yearly';
        this.drawTimeAvgChart();
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

  onDeptGroupChange(groupId: number): void {
    this.filteredDepts = this.departments.filter(d => d.groupId === +groupId);
    this.selectedDeptId = 0;
  }

  onGlobalControlChange(): void {
    this.googleChartsService.loadAndDrawCharts();
  }

  @HostListener('window:resize')
  onResize(): void {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.googleChartsService.redrawCharts();
    }, 300);
  }

  /** 🔁 Loads all main charts at once */
  private loadCharts(): void {
    this.loadTopDepartmentsChart();
    this.loadYearlyComparisonChart();
    this.loadGroupShareChart();
    this.loadGrowthTrendChart();
    this.loadGrowthChart();
    
  }


  // 🧩 Shared helper
// private drawGoogleChart(
//   chartType: 'PieChart' | 'ColumnChart' | 'LineChart',
//   containerId: string,
//   data: any,
//   options: any
// ): void {
//   google.charts.setOnLoadCallback(() => {
//     const container = document.getElementById(containerId);
//     if (!container) {
//       console.warn(`Container not found: ${containerId}`);
//       return;
//     }

//     const chartConstructor = google.visualization[chartType];
//     if (!chartConstructor) {
//       console.error(`Unsupported chart type: ${chartType}`);
//       return;
//     }

//     const chart = new chartConstructor(container);
//     chart.draw(new google.visualization.DataTable(data), options);
//   });
// }


private drawGoogleChart(
  chartType: 'PieChart' | 'ColumnChart' | 'LineChart' | 'ColumnChart',
  containerId: string,
  data: any,
  options: any
): void {
  google.charts.setOnLoadCallback(() => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }

    // Validate data: must have cols and rows
    if (!data || !data.cols || !Array.isArray(data.cols) || data.cols.length === 0) {
      container.innerHTML = '<div style="text-align:center; color: gray; padding: 1em;">No columns defined in chart data</div>';
      console.warn(`Chart data for ${containerId} is missing columns.`);
      return;
    }

    if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      container.innerHTML = '<div style="text-align:center; color: gray; padding: 1em;">No data available</div>';
      console.warn(`Chart data for ${containerId} is empty.`);
      return;
    }

    try {
      const chartConstructor = google.visualization[chartType];
      if (!chartConstructor) {
        console.error(`Unsupported chart type: ${chartType}`);
        return;
      }

      const chart = new chartConstructor(container);
      chart.draw(new google.visualization.DataTable(data), options);
    } catch (error) {
      container.innerHTML = `<div style="color: red; text-align:center;">Error rendering chart</div>`;
      console.error(`Error drawing chart in container ${containerId}:`, error);
    }
  });
}



/** 🥧 Top 5 revenue departments */
private loadTopDepartmentsChart(): void {
  this.googleChartsService.getTopDepartmentsData().subscribe(raw => {
    const parsed = sanitizeSoapResponse(raw);

    if (!parsed?.data?.length) {
      this.showNoDataMessage('top_depts_chart');
      return;
    }

    const table = this.toGoogleChartTable(parsed.data, 'charging');

    google.charts.setOnLoadCallback(() => {
      const container = document.getElementById('top_depts_chart');
      if (!container) return;
      const chart = new google.visualization.PieChart(container);
      chart.draw(new google.visualization.DataTable(table), {
        title: 'Top 5 Departments by Revenue',
        pieHole: 0.4,
        legend: { position: 'right' }
      });
    });
  });
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


/** 🧩 Group contribution share */
private loadGroupShareChart(): void {
  this.googleChartsService.getGroupShareData().subscribe(raw => {
    const parsed = sanitizeSoapResponse(raw);

    if (!parsed?.data?.length) {
      this.showNoDataMessage('group_share_chart');
      return;
    }

    const table = this.toGoogleChartTable(parsed.data, 'charging');

    google.charts.setOnLoadCallback(() => {
      const container = document.getElementById('group_share_chart');
      if (!container) return;
      const chart = new google.visualization.PieChart(container);
      chart.draw(new google.visualization.DataTable(table), {
        title: 'Group Contribution Share',
        is3D: true,
        legend: { position: 'right' }
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
