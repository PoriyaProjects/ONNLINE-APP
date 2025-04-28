import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from "src/environments/environment";
import {MatToolbarModule} from '@angular/material/toolbar';


export interface Department {
  id: string;
  name: string;
}

/**
 * Converts an array of year offsets (e.g., "0", "-1", "-2") to actual year strings.
 * Ensures the result is sorted chronologically from earliest to latest, regardless of input order.
 *
 * @param offsets Array of string offsets (e.g., ["0", "-1", "-2"])
 * @param baseYear Optional base year, defaults to current year
 * @returns Array of year strings in chronological order
 */
export function convertOffsetsToYears(
  offsets: string[],
  baseYear: number = new Date().getFullYear()
): string[] {
  // Detect if offsets are already in chronological order
  const isChronological = offsets.every((label, i, arr) => {
    return i === 0 || parseInt(arr[i]) > parseInt(arr[i - 1]);
  });

  // Reverse if not chronological
  const sortedOffsets = isChronological ? offsets : [...offsets].reverse();

  return sortedOffsets.map(offset => (baseYear + parseInt(offset)).toString());
}



declare var google: any; // Declare google as a global variable

@Injectable({
  providedIn: 'root'
})


export class GoogleChartsService {

  // Chart configuration constants
  private CHART_COLORS: string[] = ['#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8'];
  private TRENDLINE_COLORS: string[] = ['#2c5db0', '#247a3a', '#a32d25', '#c89a04', '#cc462a', '#6b3487'];

  // Chart type definitions
  public CHART_TYPES = {
    BAR: 'bar',
    LINE: 'line',
    THREE_YEAR: '3y',
    AS: 'as',
    TIME_AVG: 'timeavg',
    GAUGE: 'gauge'
  };

  // Data sources 
  // public DATA_SOURCES = {
  //   OPERATIONS: 'http://localhost:64964/WebService.asmx/GetCath?param=4&onlyLastMonth=false',
  //   INCOME: 'http://localhost:64964/WebService.asmx/GetTIncomeData',
  //   OPERATIONS_3Y:'http://localhost:64964/WebService.asmx/GetTIncomeData',
  //   TIME_AVG: './assets/data/time_avg_s-m.json',
  //   GAUGE: 'http://localhost:64964/WebService.asmx/GetCurrentCath?param=1&onlyLastMonth=true',
  //   //AS: './assets/data/as.json'
  //   AS: 'http://localhost:64964/WebService.asmx/GetExploitation'
  // };

  public DATA_SOURCES = {
    OPERATIONS: `${environment.url}/GetCath?param=4&onlyLastMonth=false`,
    INCOME: `${environment.url}/GetTIncomeData`,
    OPERATIONS_3Y: `${environment.url}/GetTIncomeData`,
    TIME_AVG: './assets/data/time_avg_s-m.json', 
    GAUGE: `${environment.url}/GetCurrentCath?param=1&onlyLastMonth=true`,
    AS: `${environment.url}/GetExploitation`
  };
  

  constructor(private http: HttpClient) {
    // Load the Google Charts packages
    google.charts.load('current', { packages: ['corechart', 'gauge', 'controls'] });
    google.charts.setOnLoadCallback(() => {
      console.log('Google Charts loaded');
      this.loadAndDrawCharts();
    });
  }


  private sanitizeSoapResponse(rawResponse: any): any {
    if (!rawResponse || typeof rawResponse !== 'string') {
      return rawResponse; // Already object
    }
  
    // Detect if this is a full SOAP XML starting with <?xml
    if (rawResponse.trim().startsWith('<?xml')) {
      const xmlStart = rawResponse.indexOf('<string');
      const xmlEnd = rawResponse.lastIndexOf('</string>');
  
      if (xmlStart !== -1 && xmlEnd !== -1) {
        const start = rawResponse.indexOf('>', xmlStart) + 1;
        const end = xmlEnd;
        if (start > 0 && end > start) {
          const jsonString = rawResponse.substring(start, end).trim();
          return JSON.parse(jsonString); // 🔥 Clean and parse
        }
      }
      console.error('SOAP XML detected but <string> tag missing.');
      return {}; // fallback empty object
    }
  
    // If not XML, assume it's clean JSON string
    try {
      return JSON.parse(rawResponse.trim());
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return {}; // fallback empty object
    }
  }
  
  
  
  
  
  /**
   * Main function to load and draw all charts in sequence with custom options.
   */
  
  public loadAndDrawCharts(options: any = {}): void {
    const {
      operationsBarOptions = {},
      operationsLineOptions = {},
      incomeBarOptions = {
        annotations: { textStyle: { opacity: 0.9 }, style: 'html'},
        bar: { groupWidth: "80%" }
      },
      incomeLineOptions = {},
      gaugeOptions = {},
      timeAvgOptions = {},
      asOptions = {
        annotations: {
          alwaysOutside: false,
          textStyle: {
            fontSize: 11,
            color: '#fff',
            auraColor: 'none'
          }
        },
      },
      chart3YOptions = {
        trendlines: {
          0: {
            type: 'linear',
            color: '#247a3a',
            lineWidth: 2,
            opacity: 0.6,
            visibleInLegend: true
          }
        },
        vAxis: { format: 'short', minValue: 0 },
      },
      gaugeTextPosition = 120,       
      surgeryStatsOptions = {}  
    } = options;
  
    this.drawOperationsCharts(operationsBarOptions, operationsLineOptions)
      .then(() => this.drawIncomeCharts(incomeBarOptions, incomeLineOptions))
      .then(() => this.drawChartGaugeFunc(gaugeOptions, gaugeTextPosition))
      .then(() => this.initTimeAvgChart(timeAvgOptions))
      .then(() => this.drawASChart(asOptions))
      .then(() => this.loadChart3Y(chart3YOptions))      
      .then(() => console.log('All charts loaded successfully'))
      .catch(error => console.error('Error in chart loading sequence:', error));
  }
  

  

  public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.BAR, 'bar_chart', barChartOptions);
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.LINE, 'line_chart', lineChartOptions);
    
    console.log('Operations charts complete');
  }
  
  public async drawIncomeCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.BAR, 'bar_chart2', barChartOptions);
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.LINE, 'line_chart2', lineChartOptions);
  
    console.log('Income charts complete');
  }
  
  public async loadChart3Y(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS_3Y, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.THREE_YEAR, 'bar_chart_3y', chartOptions);
  
    console.log('3-year chart complete');
  }
  
  public async initTimeAvgChart(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.TIME_AVG, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, this.processTimeAvgData, this.CHART_TYPES.TIME_AVG, 'bar_chart_time_avg', chartOptions);
  
    console.log('Time average chart complete');
  }
  
  public async drawChartGaugeFunc(chartOptions: any = {}, textPosition: number = 120): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.GAUGE, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.GAUGE, 'gauge_chart', chartOptions);
    this.positionGaugeChartText('gauge_chart', textPosition);
  
    console.log('Gauge chart complete');
  }
  
  public async drawASChart(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.AS, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
  
    await this.fetchDataAndDrawDirect(cleanData, this.processASData, this.CHART_TYPES.AS, 'as_chart', chartOptions);
  
    console.log('AS chart complete');
  }
  

  private async fetchDataAndDraw(
    url: string,
    dataProcessor: Function,
    chartType: string,
    elementId: string,
    chartOptions: any = {},
    postPayload: any = null
  ): Promise<void> {
    try {
      let rawData: any;
  
      if (postPayload) {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const response: any = await this.http.post(url, postPayload, { headers }).toPromise();
        rawData = response?.d || response;
      } else {
        rawData = await this.http.get(url).toPromise();
      }
  
      // 🛡 Sanitize and parse in one step
      const cleanData = this.sanitizeSoapResponse(rawData);
  
      // Process data
      const processedData =
        chartType === this.CHART_TYPES.GAUGE
          ? google.visualization.arrayToDataTable(cleanData['data'])
          : dataProcessor.call(this, cleanData);
  
      // Draw chart
      await this.drawChart(processedData, chartType, elementId, chartOptions);
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'Failed to load chart data. Check console and file path.';
      }
    }
  }
  
  
  

  private async fetchDataAndDrawDirect(
    cleanData: any,
    dataProcessor: Function,
    chartType: string,
    elementId: string,
    chartOptions: any = {}
  ): Promise<void> {
    try {
      // Special case for GAUGE
      if (chartType === this.CHART_TYPES.GAUGE) {
        // Directly draw the chartGauge
        this.drawChartGauge(cleanData, elementId, chartOptions);
        return;
      }
  
      // Normal case for others (bar, line, etc.)
      const processedData = dataProcessor.call(this, cleanData);
      await this.drawChart(processedData, chartType, elementId, chartOptions);
    } catch (error) {
      console.error('Error processing or drawing chart:', error);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'Failed to load chart data. Check console and file path.';
      }
    }
  }
  


  /**
   * Draw chart based on type with custom options.
   */
  private async drawChart(data: any, chartType: string, elementId: string, chartOptions: any = {}): Promise<void> {
    if (!data) {
      const el = document.getElementById(elementId);
      if (el) { el.innerHTML = 'Error processing data. Check console.'; }
      return;
    }

    const chartDrawers: any = {
      [this.CHART_TYPES.BAR]: this.drawBarChart.bind(this),
      [this.CHART_TYPES.LINE]: this.drawLineChart.bind(this),
      [this.CHART_TYPES.THREE_YEAR]: this.drawChart3YJSON.bind(this),
      [this.CHART_TYPES.AS]: this.drawChartAS.bind(this),
      [this.CHART_TYPES.TIME_AVG]: this.drawTimeAvgChart.bind(this),
      [this.CHART_TYPES.GAUGE]: this.drawChartGauge.bind(this)
    };

    const drawer = chartDrawers[chartType];
    if (!drawer) {
      console.error(`Unsupported chart type: ${chartType}`);
      return;
    }

    return new Promise(resolve => {
      try {
        drawer(data, elementId, chartOptions);
        resolve();
      } catch (error) {
        console.error(`Error drawing ${chartType} chart:`, error);
        const el = document.getElementById(elementId);
        if (el) { el.innerHTML = 'Error drawing chart. Check console.'; }
        resolve();
      }
    });
  }

  private processYearlyData(data: any): any {
    const years: any = {};
    data.yData.forEach((yearObject: any) => {
      const yearInfo = yearObject.Year;
      const yearValue = yearInfo.value;
      years[yearValue] = {};
      yearInfo.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          years[yearValue][month.name] = parseInt(month.y, 10);
        }
      });
    });
    return years;
  }

  private valueExists(value: any): boolean {
    return value !== undefined && value !== null && value !== '' && !isNaN(value);
  }

  private drawBarChart(years: any, elementId: string, customOptions: any = {}): void {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    const yearKeys = Object.keys(years);
    yearKeys.forEach(year => {
      dataTable.addColumn('number', year);
      dataTable.addColumn({ type: 'string', role: 'annotation' });
    });
    const months = Object.keys(years[yearKeys[0]]);
    const rows = months.map((month: string) => {
      const row: any[] = [month];
      yearKeys.forEach(year => {
        const value = years[year][month];
        if (this.valueExists(value)) {
          row.push(value, value.toString());
        } else {
          row.push(null, null);
        }
      });
      return row;
    });
    dataTable.addRows(rows);

    const defaultOptions = {
      height: 400,
      legend: { position: 'top' },
      bar: { groupWidth: '75%' },
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 14, color: '#888' }
      },
      colors: this.CHART_COLORS.slice(0, yearKeys.length).concat(['#000000']),
      series: {},
      vAxis: { format: 'short', minValue: 0 },
      interpolateNulls: false
    };

    yearKeys.forEach((_: any, index: number) => {
      defaultOptions.series[index * 2] = { opacity: 0.3 };
    });

    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }

  private drawLineChart(years: any, elementId: string, customOptions: any = {}): void {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    const yearKeys = Object.keys(years);
    yearKeys.forEach(year => dataTable.addColumn('number', year));
    const months = Object.keys(years[yearKeys[0]]);
    const rows = months.map((month: string) => {
      const row: any[] = [month];
      yearKeys.forEach(year => {
        const value = years[year][month];
        row.push(this.valueExists(value) ? value : null);
      });
      return row;
    });
    dataTable.addRows(rows);

    const defaultOptions = {
      chartArea: { width: '70%', height: '70%' },
      curveType: 'function',
      legend: { position: 'top' },
      colors: this.CHART_COLORS.slice(0, yearKeys.length).concat(['#000000']),
      vAxis: { format: 'short', minValue: 0 },
      interpolateNulls: false
    };

    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.LineChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }



private drawChart3YJSON(jsonData: any, elementId: string, customOptions: any = {}): void {
  const dataTable = new google.visualization.DataTable();
  dataTable.addColumn('date', 'תאריך'); // Hebrew: Date
  dataTable.addColumn('number', 'ערך'); // Hebrew: Value
  dataTable.addColumn({ type: 'string', role: 'annotation' }); // Annotation column

  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const formatNumberShort = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const rows: any[] = [];

  jsonData.yData.forEach((yearObject: any) => {
    const year = yearObject.Year.value;
    const months = yearObject.Year.Months;

    months.forEach((monthObj: any) => {
      const monthName = monthObj.name;
      const valueRaw = monthObj.y;

      if (valueRaw === undefined || valueRaw === null || valueRaw === '') {
        return;
      }

      const value = parseFloat(valueRaw);
      if (isNaN(value)) {
        console.error(`Invalid 'y' value for ${monthName} ${year}`);
        return;
      }

      const monthNumber = hebrewMonths.indexOf(monthName);
      if (monthNumber === -1) {
        console.error(`Unknown month name: ${monthName}`);
        return;
      }

      const date = new Date(year, monthNumber, 1);

      // Format annotation here!
      rows.push([date, value, formatNumberShort(value)]);
    });
  });

  dataTable.addRows(rows);

  const ticks = rows.map(row => {
    const date: Date = row[0];
    const month = date.getMonth();
    const year = date.getFullYear();
    return {
      v: date,
      f: `${hebrewMonths[month]} ${year}`
    };
  });

  const defaultOptions = {
    curveType: 'function',
    legend: 'none',
    trendlines: {
      0: {
        type: 'linear',
        color: '#247a3a',
        lineWidth: 3,
        opacity: 0.7,
        showR2: true,
        visibleInLegend: false
      }
    },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 12,
        color: '#000'        
      }
    },
    hAxis: {
      title: '',
      ticks: ticks,
      slantedText: true,
      slantedTextAngle: 45
    },
    vAxis: {
      title: '',
      format: 'short' 
    },
    interpolateNulls: false,
  };

  const options = this.mergeDeep(defaultOptions, customOptions);

  const chart = new google.visualization.LineChart(document.getElementById(elementId));
  chart.draw(dataTable, options);
}


  private drawChartGauge(data: any, elementId: string, customOptions: any = {}): void {
    try {
      if (!data || !data.yData || !Array.isArray(data.yData)) {
        console.error('Invalid data format for Gauge chart.', data);
        return;
      }
  
      // Extract month data
      const monthData = data.yData[0]?.Year?.Months?.[0];
      if (!monthData) {
        console.error('No month data found in Gauge input.', data);
        return;
      }
  
      const label = monthData.name;  
      const value = monthData.y;     
      const targetValue = 200;       
  
      const chartData = [
        ['Label', 'Value'],
        [label, value]
      ];
  
      console.log('Gauge Chart Prepared:', { label, value, targetValue, chartData });
  
      const defaultOptions = {
        width: 400,
        height: 220,
        redFrom: 140,
        redTo: targetValue,
        yellowFrom: 140,
        yellowTo: 140,
        greenFrom: 0,
        greenTo: 139,
        minorTicks: 0,
        max: targetValue,
        min: 0,
        majorTicks: ["0", "", "", "", targetValue.toString()],
        animation: { duration: 1000, easing: 'out' },
        greenColor: '#6ba1f8',
        yellowColor: '#6ba1f8',
        redColor: '#cee9ff'
      };
  
      const options = this.mergeDeep(defaultOptions, customOptions);
  
      const chart = new google.visualization.Gauge(document.getElementById(elementId));
      chart.draw(google.visualization.arrayToDataTable(chartData), options);
  
    } catch (error) {
      console.error('Error drawing Gauge chart:', error);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'Failed to draw Gauge chart. See console.';
      }
    }
  }
  
  

  
  private positionGaugeChartText(chartId: string = 'gauge_chart', topPosition: number = 40): number {
    if (!chartId) {
      console.error('Chart ID is required');
      return 0;
    }
    const selector = `#${chartId} g > g > text`;
    const textElements = document.querySelectorAll(selector);
    if (textElements.length === 0) {
      console.warn(`No text elements found with selector: ${selector}`);
      return 0;
    }
    textElements.forEach(textElement => {
      textElement.setAttribute('y', topPosition.toString());
    });
    console.log(`Repositioned ${textElements.length} text elements to ${topPosition}px from top`);
    return textElements.length;
  }

  // --- Time Utilities and Data Processing ---

  private parseDurationToDecimalHours(durationString: string): number | null {
    if (!durationString) { return null; }
    const parts = durationString.split(':').map(n => parseInt(n, 10));
    if (parts.some(isNaN)) { return null; }
    if (parts.length === 2) {
      return parts[0] + (parts[1] / 60);
    } else if (parts.length === 3) {
      return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    }
    return null;
  }

  private formatToHHMM(decimalHours: number): string {
    if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
      return '';
    }
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private processTimeAvgData(jsonData: any): any {
    const rawData = jsonData.table && jsonData.table.rows ? jsonData.table.rows : [];
    const headerLabels = jsonData.table && jsonData.table.cols ? jsonData.table.cols.map((col: any) => col.label) : [];

    if (rawData.length === 0) {
      console.error('No rows found in JSON data');
      return { headers: [], data: [] };
    }

    const normalizedData = rawData.map((rowObject: any) => {
      const row = rowObject.c.map((cell: any) => (cell ? cell.v : null));
      const year = parseInt(row[0]);
      const processedRow = [year];
      for (let i = 1; i < row.length; i++) {
        processedRow.push(row[i] ? this.parseDurationToDecimalHours(row[i]) : null);
      }
      return processedRow;
    });

    return { headers: headerLabels, data: normalizedData };
  }

  private drawTimeAvgChart(chartData: any, elementId: string, customOptions: any = {}): void {
    const { headers, data } = chartData;
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('number', headers[0] || 'שנה');

    for (let i = 1; i < headers.length; i++) {
      dataTable.addColumn('number', headers[i] || `Series ${i}`);
    }
    dataTable.addRows(data);

    const defaultOptions: any = {
      hAxis: {
        title: headers[0] || 'שנה',
        format: '####'
      },
      vAxis: {
        title: 'משך (שעות)',
        minValue: 0,
        format: (value: any) => this.formatToHHMM(value)
      },
      series: {},
      trendlines: {
        0: {
          type: 'linear',
          color: '#247a3a',
          lineWidth: 3,
          opacity: 0.7,
          showR2: true,
          visibleInLegend: false
        }
    
      },
      height: 500,
      width: 900,
      chartArea: { left: '10%', top: '15%', width: '80%', height: '65%' },
      legend: { position: 'top' },
      interpolateNulls: false,
      tooltip: {
        formatter: function (tooltip: any) {
          if (tooltip.row === null) { return tooltip; }
          const dataTable = this.getDataTable();
          const value = dataTable.getValue(tooltip.row, tooltip.column);
          if (tooltip.column > 0 && value !== null) {
            tooltip.text = tooltip.text.replace(/\d+\.\d+/, this.formatToHHMM(value));
          }
          return tooltip;
        }.bind(this)
      }
    };

    // Set colors and trendlines for each series
    for (let i = 1; i < headers.length; i++) {
      const index = i - 1;
      const colorIndex = index % this.CHART_COLORS.length;
      defaultOptions.series[index] = {
        type: 'bars',
        color: this.CHART_COLORS[colorIndex]
      };
      defaultOptions.trendlines[index] = {
        type: 'linear',
        color: this.TRENDLINE_COLORS[colorIndex],
        lineWidth: 3,
        opacity: 0.7,
        visibleInLegend: true,
        labelInLegend: `${headers[i]} מגמה`
      };
    }

    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.ComboChart(document.getElementById(elementId));

    // Format y-axis labels after chart is drawn
    google.visualization.events.addListener(chart, 'ready', () => {
      const labels = document.querySelectorAll('text[text-anchor="end"][fill="#222222"]');
      labels.forEach(label => {
        const value = parseFloat(label.textContent || '');
        if (!isNaN(value)) {
          label.textContent = this.formatToHHMM(value);
        }
      });
    });

    chart.draw(dataTable, options);
  }

  private processASData(data: any): any {
    const chartData = new google.visualization.DataTable();
  
    try {
      const cols = data.cols;
      if (!cols || cols.length === 0) {
        throw new Error('No columns found in JSON.');
      }
  
      // Add original columns + annotation columns
      cols.forEach((col: any, index: number) => {
        chartData.addColumn(col.type, col.label);
        if (index > 0 && col.type === 'number') {
          chartData.addColumn({ type: 'string', role: 'annotation' });
        }
      });
  
      const rows = data.rows;
      if (!rows || rows.length === 0) {
        throw new Error('No rows found in JSON.');
      }
  
      rows.forEach((row: any) => {
        const rowData: any[] = [];
  
        row.c.forEach((cell: any, index: number) => {
          const isCategory = index === 0;
          const val = cell?.v;
  
          if (isCategory) {
            rowData.push(val?.toString() || '');
          } else {
            const numericValue = val !== undefined && val !== null && val !== '' ? val : null;
            rowData.push(numericValue); // value
            rowData.push(numericValue !== null ? numericValue.toString() : null); // annotation
          }
        });
  
        chartData.addRow(rowData);
      });
  
      return chartData;
    } catch (error) {
      console.error('Error processing JSON data: ', error);
      return null;
    }
  }
  

  private drawChartAS(data: any, elementId: string, customOptions: any = {}): void {
    if (!data) {
      const el = document.getElementById(elementId);
      if (el) { el.innerHTML = 'Error processing data. Check console.'; }
      return;
    }
    const defaultOptions = {
      legend: { position: 'top', maxLines: 3 },
      bar: { groupWidth: '75%' },
      isStacked: true,
      colors: this.CHART_COLORS,
      annotations: {
        alwaysOutside: false, 
        textStyle: {
          fontSize: 11,
          color: '#fff', 
          auraColor: 'none'
        }
      },     
      interpolateNulls: false
    };

    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));

    // google.visualization.events.addListener(chart, 'ready', () => {
    //   const annotations = chart.querySelectorAll('text[font-family]');
    //   annotations.forEach((el: any) => {
    //     if (el.innerHTML.match(/^[A-Z]$/)) {
    //       el.setAttribute('transform', `rotate(-90 ${el.getAttribute('x')} ${el.getAttribute('y')})`);
    //     }
    //   });
    // });
    chart.draw(data, options);
  }

  /**
   * Deep merge two objects.
   */
  private mergeDeep(target: any, source: any): any {
    if (!source) { return target; }
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }


}
