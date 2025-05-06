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


/**
 * Filters out years with no valid monthly values.
 * @param jsonData Original JSON with yData array
 * @returns Filtered JSON with only valid years
 */
export function filterValidYears(jsonData: any): any {
  if (!jsonData || !Array.isArray(jsonData.yData)) return { yData: [] };

  const filteredYears = jsonData.yData.filter((yearObject: any) => {
    const months = yearObject?.Year?.Months || [];
    return months.some((m: any) => {
      const y = parseFloat(m?.y);
      return !isNaN(y) && y > 0;
    });
  });

  return { yData: filteredYears };
}


declare var google: any; // Declare google as a global variable

@Injectable({
  providedIn: 'root'
})


export class GoogleChartsService {

  // Chart configuration constants
  private chartsReady: Promise<void>;
  private CHART_COLORS: string[] = ['#6ba1f8', '#5ed175', '#00b3d7', '#fcd74e', '#f86b6b', '#a17ef8'];

  // Chart type definitions
  public CHART_TYPES = {
    BAR: 'bar',
    LINE: 'line',
    THREE_YEAR: '3y',
    EXPLOITATION: 'exploitation',
    TIME_AVG: 'timeavg',
    GAUGE: 'gauge'
  };


  public DATA_SOURCES = {
    OPERATIONS: `${environment.url}/GetCath?param=4&onlyLastMonth=false`,
    INCOME: `${environment.url}/GetTIncomeData`,
    OPERATIONS_3Y: `${environment.url}/GetTIncomeData`,    
    TIME_AVG:`${environment.url}/GetExploitationTimeAvgJson?groupBy`,
    GAUGE: `${environment.url}/GetCurrentCath?param=1&onlyLastMonth=true`,
    EXPLOITATION: `${environment.url}/GetExploitation`    
  };
  

  constructor(private http: HttpClient) {
    this.chartsReady = new Promise((resolve) => {
      google.charts.load('current', { packages: ['corechart', 'gauge', 'controls'] });
      google.charts.setOnLoadCallback(() => {
        console.log('Google Charts loaded');
        resolve();
      });
    });
  
    this.chartsReady.then(() => this.loadAndDrawCharts());
  }


  private sanitizeSoapResponse(rawResponse: any): any {
    if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;
    if (rawResponse.trim().startsWith('<?xml')) {
      const xmlStart = rawResponse.indexOf('<string');
      const xmlEnd = rawResponse.lastIndexOf('</string>');
      if (xmlStart !== -1 && xmlEnd !== -1) {
        const start = rawResponse.indexOf('>', xmlStart) + 1;
        const jsonString = rawResponse.substring(start, xmlEnd).trim();
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.error('Failed to parse SOAP JSON:', e);
        }
      }
      return {};
    }
    try {
      return JSON.parse(rawResponse.trim());
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return {};
    }
  }

  

  
 

/**
 * Adds short-format annotation columns to each numeric series in a DataTable.
 * Also logs all values using a safe access pattern.
 */
private addShortFormatAnnotations(dataTable: google.visualization.DataTable): google.visualization.DataView {
  if (
    typeof dataTable?.getNumberOfColumns !== 'function' ||
    typeof dataTable?.getValue !== 'function'
  ) {
    throw new Error('Invalid DataTable passed to addShortFormatAnnotations');
  }

  console.log("addShortFormatAnnotations started");

  const view = new google.visualization.DataView(dataTable);
  const columns: any[] = [];
  const numCols = dataTable.getNumberOfColumns();
  const numRows = dataTable.getNumberOfRows();

  console.log('Preparing short-format annotations...');

  // Optional: use this section to sum or validate chart values
  for (let col = 1; col < numCols; col++) {  // skip label column
    let columnSum = 0;

    for (let row = 0; row < numRows; row++) {
      const value = dataTable.getValue(row, col);
      if (typeof value === 'number') {
        columnSum += value;
      }
    }

    console.log(`Sum of column ${col} (${dataTable.getColumnLabel(col)}):`, columnSum.toLocaleString());
  }

  // Build annotation-enhanced column list
  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    const colType = dataTable.getColumnType(colIndex);

    columns.push(colIndex); // keep original column

    if (colIndex > 0 && colType === 'number') {
      columns.push({
        calc: (dt: any, row: number) => {
          const val = dt.getValue(row, colIndex);
          const num = typeof val === 'number' ? val : parseFloat(val);
          if (isNaN(num)) return null;

          if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
          if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
          return num.toFixed(0);
        },
        type: 'string',
        role: 'annotation'
      });
    }
  }

  console.log('Final columns for view:', columns);
  view.setColumns(columns);
  return view;
}

  
  
  
  /**
   * Main function to load and draw all charts in sequence with custom options.
   */
  
  
  
  public async loadAndDrawCharts(options: any = {}): Promise<void> {
    console.log("loadAndDrawCharts triggered");
  
    const {
      operationsBarOptions = {},
      operationsLineOptions = {},
      incomeBarOptions = {
        shortFormatAnnotations: true,
        annotations: { textStyle: { opacity: 0.9 }, style: 'html' },
        bar: { groupWidth: "80%" }
      },
      incomeLineOptions = {},
      gaugeOptions = {},
      exploitationOptions = {
        isStacked: true,
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
      gaugeTextPosition = 120    } = options;
  
    await this.chartsReady;
  
    try {
      console.log("Loading 3Y Chart...");
      await this.loadChart3Y(chart3YOptions);
    } catch (e) {
      console.error("3Y Chart failed:", e);
    }
  
    try {
      console.log("Drawing Operations Charts...");
      await this.drawOperationsCharts(operationsBarOptions, operationsLineOptions);
    } catch (e) {
      console.error("Operations Charts failed:", e);
    }
  
    try {
      console.log("Drawing Income Charts...");
      await this.drawIncomeCharts(incomeBarOptions, incomeLineOptions);
    } catch (e) {
      console.error("Income Charts failed:", e);
    }
  
    try {
      console.log("Drawing Gauge Chart...");
      await this.drawChartGaugeFunc(gaugeOptions, gaugeTextPosition);
    } catch (e) {
      console.error("Gauge Chart failed:", e);
    }
  
    try {
      console.log("Drawing Time Avg Chart...");
      //await this.initTimeAvgChart(timeAvgOptions);
      await this.initTimeAvgChart(options.timeAvgOptions);
    } catch (e) {
      console.error("Time Avg Chart failed:", e);
    }
  
    try {
      console.log("Calling drawExploitationChart...");
      await this.drawExploitationChart(exploitationOptions);
    } catch (e) {
      console.error("Exploitation Chart failed:", e);
    }
  
    console.log("Finished loadAndDrawCharts()");
  }

  
  public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    await this.chartsReady;
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS, { responseType: 'text' }).toPromise();
    const cleanData = this.sanitizeSoapResponse(rawData);
    const yearsData = this.processYearlyData(cleanData);
    this.drawBarChart(yearsData, 'bar_chart', barChartOptions);
    this.drawLineChart(yearsData, 'line_chart', lineChartOptions);
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
  
  public async drawExploitationChart(chartOptions: any = {}): Promise<void> {
    try {
      console.log('drawExploitationChart');
      const rawData = await this.http.get(this.DATA_SOURCES.EXPLOITATION, { responseType: 'text' }).toPromise();
      //const cleanData = JSON.parse(rawData);
      const cleanData = this.sanitizeSoapResponse(rawData);
    
      await this.fetchDataAndDrawDirect(cleanData, this.processExploitationData.bind(this), this.CHART_TYPES.EXPLOITATION, 'as_chart', chartOptions);
      console.log('Exploitation chart complete');
    } catch (error) {
      console.error("Failed to fetch Exploitation chart data:", error);
      const el = document.getElementById('as_chart');
      if (el) el.innerHTML = "Error loading Exploitation chart.";
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
      // Special case for GAUGE chart
      if (chartType === this.CHART_TYPES.GAUGE) {
        this.drawChartGauge(cleanData, elementId, chartOptions);
        return;
      }
  
      // Process raw data
      const processedData = dataProcessor.call(this, cleanData);
      let dataToRender: any = processedData;
  
      // Optional: apply short-format annotations using a DataView
     if (chartOptions.shortFormatAnnotations) {
        if (
          typeof processedData.getNumberOfColumns === 'function' &&
          typeof processedData.getValue === 'function'
        ) {
          dataToRender = this.addShortFormatAnnotations(processedData);
        } else {
          console.error('Processed data is not a valid DataTable. Cannot apply annotations.', processedData);
          dataToRender = processedData;  // fallback
        }
      } else {
        dataToRender = processedData;
      }

      
  
      // Render the chart
      await this.drawChart(dataToRender, chartType, elementId, chartOptions);
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
      [this.CHART_TYPES.THREE_YEAR]: this.drawChart3Y.bind(this),
      [this.CHART_TYPES.TIME_AVG]: this.drawTimeAvgChart.bind(this),
      [this.CHART_TYPES.EXPLOITATION]: this.renderExploitationChart.bind(this),      
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
      const yearValue = yearObject.Year.value;
      years[yearValue] = {};
      yearObject.Year.Months.forEach((month: any) => {
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
    if (!google.visualization || !google.visualization.DataTable) {
      console.error('Google Visualization not loaded');
      return;
    }
  
    // Utility: check if value exists and is > 0
    const isValid = (val: any): boolean => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    };
  
    // Filter out years with no valid monthly data
    const filteredYears: any = {};
    Object.keys(years).forEach(year => {
      const months = years[year];
      const hasValidMonth = Object.values(months).some(val => isValid(val));
      if (hasValidMonth) {
        filteredYears[year] = months;
      }
    });
  
    const yearKeys = Object.keys(filteredYears);
    if (yearKeys.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה"; // Hebrew: No data to display
      return;
    }
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    yearKeys.forEach(year => {
      dataTable.addColumn('number', year);
      dataTable.addColumn({ type: 'string', role: 'annotation' });
    });
  
    const months = Object.keys(filteredYears[yearKeys[0]]);
    const rows = months.map(month => {
      const row: any[] = [month];
      yearKeys.forEach(year => {
        const val = filteredYears[year][month];
        row.push(isValid(val) ? val : null);
        row.push(isValid(val) ? val.toString() : null);
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
      colors: this.CHART_COLORS.slice(0, yearKeys.length),
      vAxis: { format: 'short', minValue: 0 }
    };
  
    const options = { ...defaultOptions, ...customOptions };
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }
  
 
  private drawLineChart(years: any, elementId: string, customOptions: any = {}): void {
    if (!google.visualization || !google.visualization.DataTable) {
      console.error('Google Visualization not loaded');
      return;
    }
  
    // Utility: check if a value is numeric and > 0
    const isValid = (val: any): boolean => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    };
  
    // Filter out years where all values are empty/0
    const filteredYears: any = {};
    Object.keys(years).forEach(year => {
      const months = years[year];
      const hasValidMonth = Object.values(months).some(val => isValid(val));
      if (hasValidMonth) {
        filteredYears[year] = months;
      }
    });
  
    const yearKeys = Object.keys(filteredYears);
    if (yearKeys.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה"; // Hebrew: No data to display
      return;
    }
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    yearKeys.forEach(year => dataTable.addColumn('number', year));
  
    const months = Object.keys(filteredYears[yearKeys[0]]);
    const rows = months.map(month => {
      const row: any[] = [month];
      yearKeys.forEach(year => {
        const val = filteredYears[year][month];
        row.push(isValid(val) ? val : null);
      });
      return row;
    });
  
    dataTable.addRows(rows);
  
    const defaultOptions = {
      chartArea: { width: '70%', height: '70%' },
      curveType: 'function',
      legend: { position: 'top' },
      colors: this.CHART_COLORS.slice(0, yearKeys.length),
      vAxis: { format: 'short', minValue: 0 }
    };
  
    const options = { ...defaultOptions, ...customOptions };
    const chart = new google.visualization.LineChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }
   

  private drawChart3Y(jsonData: any, elementId: string, customOptions: any = {}): void {
    const filteredData = filterValidYears(jsonData);
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('date', 'תאריך');
    dataTable.addColumn('number', 'ערך');
    dataTable.addColumn({ type: 'string', role: 'annotation' });
  
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
  
    filteredData.yData.forEach((yearObject: any) => {
      const year = yearObject.Year.value;
      const months = yearObject.Year.Months;
  
      months.forEach((monthObj: any) => {
        const monthName = monthObj.name;
        const valueRaw = monthObj.y;
  
        const value = parseFloat(valueRaw);
        if (!value || isNaN(value)) return;
  
        const monthIndex = hebrewMonths.indexOf(monthName);
        if (monthIndex === -1) return;
  
        const date = new Date(year, monthIndex, 1);
        rows.push([date, value, formatNumberShort(value)]);
      });
    });
  
    if (rows.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
  
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
 


  // --- Gauge Chart ----
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

  // --- eof Gauge Chart ----



   // Generate time-formatted ticks for axis
  private generateTimeAxisTicks(dataTable: any): any[] {
    // Find max value in the data
    let maxValue = 0;
    for (let col = 1; col < dataTable.getNumberOfColumns(); col++) {
      for (let row = 0; row < dataTable.getNumberOfRows(); row++) {
        const val = dataTable.getValue(row, col);
        if (val !== null && !isNaN(val) && val > maxValue) {
          maxValue = val;
        }
      }
    }
    
    // Round up to next hour and add some padding
    const roundedMax = Math.ceil(maxValue) + 1;
    
    // Create ticks at 1-hour or 30-minute intervals depending on data range
    const ticks = [];
    const interval = roundedMax <= 4 ? 0.5 : 1; // Use 30-min intervals for small ranges
    
    for (let i = 0; i <= roundedMax; i += interval) {
      ticks.push({
        v: i,
        f: this.formatDecimalHoursToTime(i)
      });
    }
    
    return ticks;
  }// --- TimeAvgChart
// --- Time Utilities and Data Processing ---

// This method ensures Google Charts API is loaded before using it
private ensureGoogleChartsLoaded(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.visualization && 
        typeof google.visualization.DataTable === 'function') {
      // Google Charts is already loaded
      resolve();
    } else {
      // Check if we're already loading Google Charts
      if (!window['googleChartsLoading']) {
        window['googleChartsLoading'] = true;
        
        // Load Google Charts dynamically
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://www.gstatic.com/charts/loader.js';
        
        script.onload = () => {
          // Once the loader is available, load the visualization library
          google.charts.load('current', {'packages':['corechart']});
          google.charts.setOnLoadCallback(() => {
            window['googleChartsLoading'] = false;
            resolve();
          });
        };
        
        script.onerror = () => {
          window['googleChartsLoading'] = false;
          reject('Failed to load Google Charts script');
        };
        
        document.head.appendChild(script);
      } else {
        // Wait for the existing loading process
        const checkLoaded = setInterval(() => {
          if (typeof google !== 'undefined' && google.visualization && 
              typeof google.visualization.DataTable === 'function') {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 100);
        
        // Set a timeout to avoid infinite waiting
        setTimeout(() => {
          clearInterval(checkLoaded);
          reject('Timeout waiting for Google Charts to load');
        }, 10000);
      }
    }
  });
}

private parseDurationToDecimalHours(durationString: any): number | null {
  // Check if input is null, undefined, or not a string
  if (durationString === null || durationString === undefined) { 
    return null; 
  }
  
  // Convert to string if it's not already a string
  const timeStr = String(durationString);
  if (!timeStr || timeStr.trim() === '') { 
    return null; 
  }
  
  // Split the time string and convert parts to numbers
  const parts = timeStr.split(':').map(n => parseInt(n, 10));
  if (parts.some(isNaN)) { return null; }
  
  if (parts.length === 2) {
    return parts[0] + (parts[1] / 60);
  } else if (parts.length === 3) {
    return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
  }
  
  return null;
}


private formatDecimalHoursToTime(decimalHours: number | null): string {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return '';
  }

  const isNegative = decimalHours < 0;
  const absHours = Math.abs(decimalHours);
  const hours = Math.floor(absHours);
  const minutes = Math.round((absHours - hours) * 60);

  let adjustedHours = hours;
  let adjustedMinutes = minutes;

  if (adjustedMinutes === 60) {
    adjustedHours += 1;
    adjustedMinutes = 0;
  }

  const formattedHours = adjustedHours.toString().padStart(2, '0');
  const formattedMinutes = adjustedMinutes.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${formattedHours}:${formattedMinutes}`;
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

public drawTimeAvgChart(
  elementId: string = 'bar_chart_time_avg',
  customOptions: any = {},
  selectedTypes: { [key: string]: boolean } = { 'אלקטיבי': true, 'דחוף': true, 'ססיה': true }
): void {
  const dropdownId = 'timeAvgGroupByDropdown';
  const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;

  // Fallback to a safe default if dropdown doesn't exist or has no value
  const groupBy = dropdown?.value?.trim() || 'month';

  const url = `${this.DATA_SOURCES.TIME_AVG}=${groupBy}`;

  // Ensure Google Charts API is loaded
  this.ensureGoogleChartsLoaded().then(() => {
    this.http.get(url, { responseType: 'text' }).toPromise()
      .then(rawData => {
        const cleanData = this.sanitizeSoapResponse(rawData);

        if (!cleanData || !cleanData.cols || !cleanData.rows) {
          console.error('Invalid or empty data for TimeAvg Chart');
          return;
        }

        // Create the data table
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', cleanData.cols[0].label); // Period (Month/Year)

        const includedIndexes: number[] = [];

        cleanData.cols.slice(1).forEach((col: any, idx: number) => {
          if (selectedTypes[col.label]) {
            dataTable.addColumn('number', col.label);
            includedIndexes.push(idx + 1); // +1 because we sliced
          }
        });

        if (includedIndexes.length === 0) {
          const el = document.getElementById(elementId);
          if (el) el.innerHTML = 'לא נבחרו עמודות להצגה';
          return;
        }

        // Add rows to the data table
        cleanData.rows.forEach((row: any) => {
          const original = row.c.map((cell: any) => cell ? cell.v : null);
          const rowData: any[] = [original[0]];

          includedIndexes.forEach((i: number) => {
            // Convert the value to decimal for internal calculations
            // Handle various input types safely
            let timeValue = null;
            if (original[i] !== null && original[i] !== undefined) {
              // If it's already a number, use it directly
              if (typeof original[i] === 'number') {
                timeValue = original[i];
              } else {
                // Try to parse as time string
                timeValue = this.parseDurationToDecimalHours(original[i]);
              }
            }
            rowData.push(timeValue);
          });

          dataTable.addRow(rowData);
        });

        // Create a formatter for HH:MM time format
        const timeFormatter = new google.visualization.NumberFormat({
          pattern: '00:00', // HH:MM format
          fractionDigits: 0
        });

        // Apply formatter to all numeric columns
        for (let i = 1; i < dataTable.getNumberOfColumns(); i++) {
          timeFormatter.format(dataTable, i);
        }

        const defaultOptions = {
          height: 500,
          legend: { position: 'top' },
          bar: { groupWidth: "70%" },
          annotations: {
            alwaysOutside: true,
            textStyle: { fontSize: 12, color: '#888' },
            format: '00:00' // HH:MM format for annotations
          },
          colors: this.CHART_COLORS.slice(0, dataTable.getNumberOfColumns() - 1),
          vAxis: { 
            format: '00:00', // HH:MM format for y-axis
            minValue: 0,
            // Format decimal hours as HH:MM in axis labels
            ticks: this.generateTimeAxisTicks(dataTable)
          },
          interpolateNulls: true,
          tooltip: { 
            isHtml: true
          },
          formatters: {
            // Format values in all columns
            number: [{
              columnNum: Array.from({ length: dataTable.getNumberOfColumns() - 1 }, (_, i) => i + 1),
              pattern: '00:00'
            }]
          }
        };
        
        // Merge with custom options
        const options = { ...defaultOptions, ...customOptions };

      
        // Get the container and create the chart
        const container = document.getElementById(elementId);
        if (!container) {
          console.error(`Element with ID "${elementId}" not found`);
          return;
        }
        
        const chart = new google.visualization.ColumnChart(container);
        
        // Create a view to handle custom formatting
        const view = new google.visualization.DataView(dataTable);
        
        // Set up column formatters to display time in HH:MM format
        const columns = [];
        columns.push(0); // First column stays the same (labels)
        
        // For each data column, create a calculated column with formatted values
        for (let i = 1; i < dataTable.getNumberOfColumns(); i++) {
  columns.push({
    calc: (dt, row) => {
      const value = dt.getValue(row, i);
      return {
        v: value,
        f: value !== null ? this.formatDecimalHoursToTime(value) : ''
      };
    },
    type: 'number',
    label: dataTable.getColumnLabel(i)
  });
}
        
        view.setColumns(columns);
        
        // Create a tooltip formatter
        if (google.visualization.events) {
          google.visualization.events.addListener(chart, 'ready', () => {
            google.visualization.events.addListener(chart, 'onmouseover', (e: any) => {
              if (e.row !== null && e.column > 0) {
                // Get the original value
                const value = dataTable.getValue(e.row, e.column);
                if (value !== null) {
                  // Select the hovered element to trigger tooltip
                  chart.setSelection([{row: e.row, column: e.column}]);
                }
              }
            });
          });
        }
        
        // Draw the chart with the view containing formatted values
        chart.draw(view, options);
        
        console.log(`TimeAvg Chart (${groupBy}) drawn successfully.`);
      })
      .catch(error => {
        console.error('Error loading TimeAvg Chart data:', error);
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = 'Failed to load chart data. Check console.';
      });
  }).catch(error => {
    console.error('Google Charts library not loaded:', error);
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = 'Failed to load Google Charts library.';
  });
}

// --- eof TimeAvgChart
 

  private processExploitationData(data: any): any {
    console.log('processExploitationData started');
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

  private renderExploitationChart(dataTable: any, elementId: string, options: any = {}): void {
    console.log('renderExploitationChart started');
    if (!dataTable || dataTable.getNumberOfRows() === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
  
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));
    const defaultOptions = {
      height: 400,
      legend: { position: 'top' },
      bar: { groupWidth: '75%' },
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 12, color: '#000' }
      },
      colors: this.CHART_COLORS,
      vAxis: { format: 'short', minValue: 0 }
    };
  
    chart.draw(dataTable, this.mergeDeep(defaultOptions, options));
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
