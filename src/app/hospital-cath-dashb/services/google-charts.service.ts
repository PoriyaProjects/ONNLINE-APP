import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from "src/environments/environment";
import { MatToolbarModule } from '@angular/material/toolbar';
import { formatNumberShort, parseDurationToDecimalHours, formatDecimalHoursToTime } from '../../shared/number-utils';
import { sanitizeSoapResponse } from '../../shared/sanitizesoapresponce';


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
    OPTHREE_YEAR: 'op3y',
    EXPLOITATION: 'exploitation',
    TIME_AVG: 'timeavg',
    GAUGE: 'gauge'
  };


  public DATA_SOURCES = {
    OPERATIONS: `${environment.url}/GetCath?param=4&onlyLastMonth=false`,
    OPERATIONSF: `${environment.url}/GetCath?param=12&onlyLastMonth=false`,
    OPERATIONS_3Y: `${environment.url}/GetCath?param=36&onlyLastMonth=false`,
    INCOME: `${environment.url}/GetIncomeData`,
    INCOME_3Y: `${environment.url}/GetIncomeData`,
    TIME_AVG: `${environment.url}/GetExploitationTimeAvgJson?groupBy`,
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


  // private sanitizeSoapResponse(rawResponse: any): any {
  //   if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;
  
  //   const trimmed = rawResponse.trim();
  
  //   // Match opening <string ...> and closing </string>
  //   const stringTagOpenMatch = trimmed.match(/<string[^>]*>/);
  //   const stringTagCloseIndex = trimmed.indexOf('</string>');
  
  //   if (stringTagOpenMatch && stringTagCloseIndex !== -1) {
  //     const start = stringTagOpenMatch.index! + stringTagOpenMatch[0].length;
  //     const content = trimmed.substring(start, stringTagCloseIndex).trim();
  
  //     // Remove outer quotes if present and unescape
  //     const unquoted = content.startsWith('"') && content.endsWith('"')
  //       ? content.slice(1, -1).replace(/\\"/g, '"')
  //       : content;
  
  //     try {
  //       return JSON.parse(unquoted);
  //     } catch (e) {
  //       console.warn('Failed to parse JSON from <string> content, returning raw:', e);
  //       return unquoted;
  //     }
  //   }
  
  //   // If not wrapped in <string>, try to parse directly as JSON
  //   try {
  //     return JSON.parse(trimmed);
  //   } catch (e) {
  //     console.warn('Failed to parse JSON, returning raw string:', e);
  //     return trimmed;
  //   }
  // }
  
   

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

  

  getWorkingDaysInfo(): {
    workingDays: Date[],
    currentWorkingDayIndex: number | null,
    totalWorkingDays: number
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
  
    const workingDays: Date[] = [];
    let currentWorkingDayIndex: number | null = null;
  
    const date = new Date(year, month, 1);
  
    while (date.getMonth() === month) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, ..., 6 = Saturday
  
      if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday–Thursday (Israeli weekdays)
        const clonedDate = new Date(date);
        workingDays.push(clonedDate);
  
        // Check if today matches this working day
        if (
          clonedDate.getDate() === today.getDate() &&
          clonedDate.getMonth() === today.getMonth() &&
          clonedDate.getFullYear() === today.getFullYear()
        ) {
          currentWorkingDayIndex = workingDays.length; // 1-based index
        }
      }
  
      date.setDate(date.getDate() + 1);
    }
    
    return {
      workingDays,
      currentWorkingDayIndex,
      totalWorkingDays: workingDays.length
    };
    
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
      Opchart3YOptions = {
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
      gaugeTextPosition = 150 } = options;

    await this.chartsReady;

    try {
      console.log("Loading 3Y Chart...");
      await this.loadChart3Y(chart3YOptions);
    } catch (e) {
      console.error("3Y Chart failed:", e);
    }

    try {
      console.log("Loading 3Y Operations Chart...");
      await this.loadOpChart3Y(Opchart3YOptions);
    } catch (e) {
      console.error("3Y Operations Chart failed:", e);
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
    const rawFData = await this.http.get(this.DATA_SOURCES.OPERATIONSF, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    const cleanFData = sanitizeSoapResponse(rawFData);
    const yearsData = this.processYearlyData(cleanData);
    const quartalData = this.processQuartalData(cleanFData);
    this.drawBarChart(yearsData, 'bar_chart', barChartOptions);
    this.drawBarChartQ(quartalData, 'line_chart', lineChartOptions);
    //this.drawLineChartQ(quartalData, 'line_chart', lineChartOptions);
  }
  public async drawIncomeCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.BAR, 'bar_chart2', barChartOptions);
    await this.fetchDataAndDrawDirect(cleanData, this.processYearlyData, this.CHART_TYPES.LINE, 'line_chart2', lineChartOptions);
    console.log('Income charts complete');
  }

  public async loadChart3Y(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME_3Y, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.THREE_YEAR, 'bar_chart_3y', chartOptions);
    console.log('3-year chart complete');
  }

  public async loadOpChart3Y(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS_3Y, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.OPTHREE_YEAR, 'op_bar_chart_3y', chartOptions);
    console.log('Operations 3-year chart complete');
  }

  public async initTimeAvgChart(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.TIME_AVG, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    await this.fetchDataAndDrawDirect(cleanData, this.processTimeAvgData, this.CHART_TYPES.TIME_AVG, 'bar_chart_time_avg', chartOptions);
    console.log('Time average chart complete');
  }

  public async drawChartGaugeFunc(chartOptions: any = {}, textPosition: number = 150): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.GAUGE, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.GAUGE, 'gauge_chart', chartOptions);
    this.positionGaugeChartText('gauge_chart', textPosition);
    console.log('Gauge chart complete');
  }

  public async drawExploitationChart(chartOptions: any = {}): Promise<void> {
    try {
      console.log('drawExploitationChart');
      const rawData = await this.http.get(this.DATA_SOURCES.EXPLOITATION, { responseType: 'text' }).toPromise();
      //const cleanData = JSON.parse(rawData);
      const cleanData = sanitizeSoapResponse(rawData);

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
      [this.CHART_TYPES.OPTHREE_YEAR]: this.drawOpChart3Y.bind(this),
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

  private processQuartalData(data: any): any {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth(); // 0-based: Jan=0
  
    const quarters = {
      Q1: ['ינואר', 'פברואר', 'מרץ'],
      Q2: ['אפריל', 'מאי', 'יוני'],
      Q3: ['יולי', 'אוגוסט', 'ספטמבר'],
      Q4: ['אוקטובר', 'נובמבר', 'דצמבר']
    };
  
    const currentQuarter = Math.floor(currentMonthIndex / 3) + 1;
    const currentQuarterKey = `Q${currentQuarter}`;
  
    const years: any = {};
  
    data.yData.forEach((yearObject: any) => {
      const yearValue = yearObject.Year.value;
      const monthMap: { [name: string]: number } = {};
  
      // Build a map of month name to value
      yearObject.Year.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          monthMap[month.name] = parseInt(month.y, 10);
        }
      });
  
      // Process only full quarters
      const yearQuarters: any = {};
      for (const [quarter, months] of Object.entries(quarters)) {
        // Skip current (possibly incomplete) quarter of current year
        if (yearValue === currentYear && quarter === currentQuarterKey) continue;
  
        const hasAllMonths = months.every(name => name in monthMap);
        if (hasAllMonths) {
          const sum = months.reduce((acc, name) => acc + monthMap[name], 0);
          yearQuarters[quarter] = sum;
        }
      }
  
      if (Object.keys(yearQuarters).length > 0) {
        years[yearValue] = yearQuarters;
      }
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
  

    const isValid = (val: any): boolean => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    };
  
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
      if (el) el.innerHTML = "אין נתונים להצגה"; // No data to display
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
        const numVal = isValid(val) ? parseFloat(val) : null;
        row.push(numVal);
        row.push(numVal !== null ? formatNumberShort(numVal) : null);
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

  private drawLineChartQ(years: any, elementId: string, customOptions: any = {}): void {
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

  
  
  private drawBarChartQ(years: any, elementId: string, customOptions: any = {}): void {
    if (!google.visualization || !google.visualization.DataTable) {
      console.error('Google Visualization not loaded');
      return;
    }
  
    const isValid = (val: any): boolean => {
      const num = parseFloat(val);
      return !isNaN(num);
    };
  
    const filteredYears: any = {};
    Object.keys(years).forEach(year => {
      const quarters = years[year];
      const hasValidQuarter = Object.values(quarters).some(val => isValid(val));
      if (hasValidQuarter) {
        filteredYears[year] = quarters;
      }
    });
  
    const yearKeys = Object.keys(filteredYears);
    if (yearKeys.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
  
    const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'רבעון'); // X-axis: Quarter
  
    // Add columns: number + annotation per year
    yearKeys.forEach(year => {
      dataTable.addColumn('number', year);
      dataTable.addColumn({ type: 'string', role: 'annotation' });
    });
  
    const rows = quarterLabels.map(q => {
      const row: any[] = [q]; // start row with quarter name
      yearKeys.forEach(year => {
        const val = filteredYears[year][q];
        if (isValid(val)) {
          row.push(Number(val));
          row.push(String(val));
        } else {
          row.push(null);
          row.push(null);
        }
      });
      return row;
    }).filter(row => row.slice(1).some(v => v !== null)); // keep rows with at least one value
  
    dataTable.addRows(rows);
  
    const defaultOptions = {
      chartArea: { width: '80%', height: '70%' },
      legend: { position: 'top' },
      bar: { groupWidth: '60%' },
      isStacked: false,
      colors: this.CHART_COLORS.slice(0, yearKeys.length),
      annotations: {
        alwaysOutside: true,
        textStyle: {
          fontSize: 11,
          auraColor: 'none'
        }
      },
      vAxis: {
        minValue: 0,
        format: 'short'
      },
      hAxis: {
        //title: 'רבעון'
      }
    };
  
    const options = { ...defaultOptions, ...customOptions };
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));
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
        //f: `${hebrewMonths[month]} ${year}`
        f: `${month}/${year}` // Display as MM/YYYY
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

  private drawOpChart3Y(jsonData: any, elementId: string, customOptions: any = {}): void {
    const filteredData = filterValidYears(jsonData);

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('date', 'תאריך');
    dataTable.addColumn('number', 'ערך');
    dataTable.addColumn({ type: 'string', role: 'annotation' });

    const hebrewMonths = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    // const formatNumberShort = (num: number): string => {
    //   if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    //   if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    //   if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    //   return num.toString();
    // };

    

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

    if (rows.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
    
    // Remove the last month (latest date) from the graph
    rows.sort((a, b) => a[0].getTime() - b[0].getTime()); // Ensure sorted by date
    rows.pop(); // Remove last item
    
    dataTable.addRows(rows);
    

    const ticks = rows.map(row => {
      const date: Date = row[0];
      const month = date.getMonth();
      const year = date.getFullYear();
      return {
        v: date,
        //f: `${hebrewMonths[month]} ${year}`
        f: `${month}/${year}` // Display as MM/YYYY
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
      const { totalWorkingDays, currentWorkingDayIndex } = this.getWorkingDaysInfo();
      const planedUpToday = targetValue / totalWorkingDays * (currentWorkingDayIndex - 1);

      const chartData = [
        ['Label', 'Value'],
        [label, value]
      ];

      console.log('Gauge Chart Prepared:', { label, value, targetValue, chartData });

      const defaultOptions = {
        width: 400,
        height: 220,
        redFrom: targetValue,
        redTo: targetValue,
        yellowFrom: planedUpToday,
        yellowTo: targetValue,
        greenFrom: 0,
        greenTo: planedUpToday,
        minorTicks: 0,
        max: targetValue,
        min: 0,
        majorTicks: ["0", "", "", "", targetValue.toString()],
        animation: { duration: 1000, easing: 'out' },
        greenColor: '#f86b6b',
        yellowColor: '#5ed175',
        redColor: '#5ed175'
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
      if (textElement instanceof SVGTextElement) {
        textElement.setAttribute('y', topPosition.toString());
        textElement.setAttribute('style', 'font-size: 22px !important;');
      }
    });
    console.log(`Repositioned ${textElements.length} text elements to ${topPosition}px from top`);
    return textElements.length;
  }

  // --- eof Gauge Chart ----


  // --- TimeAvgChart ---
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
        f: formatDecimalHoursToTime(i)
      });
    }

    return ticks;
  }
  
  
  // --- Time Utilities and Data Processing ---
  // private parseDurationToDecimalHours(durationString: any): number | null {
  //   // Check if input is null, undefined, or not a string
  //   if (durationString === null || durationString === undefined) {
  //     return null;
  //   }

  //   // Convert to string if it's not already a string
  //   const timeStr = String(durationString);
  //   if (!timeStr || timeStr.trim() === '') {
  //     return null;
  //   }

  //   // Split the time string and convert parts to numbers
  //   const parts = timeStr.split(':').map(n => parseInt(n, 10));
  //   if (parts.some(isNaN)) { return null; }

  //   if (parts.length === 2) {
  //     return parts[0] + (parts[1] / 60);
  //   } else if (parts.length === 3) {
  //     return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
  //   }

  //   return null;
  // }

  // private formatDecimalHoursToTime(decimalHours: number | null): string {
  //   if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
  //     return '';
  //   }

  //   const isNegative = decimalHours < 0;
  //   const absHours = Math.abs(decimalHours);
  //   const hours = Math.floor(absHours);
  //   const minutes = Math.round((absHours - hours) * 60);

  //   let adjustedHours = hours;
  //   let adjustedMinutes = minutes;

  //   if (adjustedMinutes === 60) {
  //     adjustedHours += 1;
  //     adjustedMinutes = 0;
  //   }

  //   const formattedHours = adjustedHours.toString().padStart(2, '0');
  //   const formattedMinutes = adjustedMinutes.toString().padStart(2, '0');

  //   return `${isNegative ? '-' : ''}${formattedHours}:${formattedMinutes}`;
  // }

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
        processedRow.push(row[i] ? parseDurationToDecimalHours(row[i]) : null);
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
    const dropdown = document.getElementById('timeAvgGroupByDropdown') as HTMLSelectElement;
    const groupBy = dropdown?.value?.trim() || 'month';
    const url = `${this.DATA_SOURCES.TIME_AVG}=${groupBy}`;
    const container = document.getElementById(elementId);

    if (!container) {
      console.error(`Element with ID "${elementId}" not found.`);
      return;
    }

    this.http.get(url, { responseType: 'text' }).toPromise()
      .then(rawData => {
        const cleanData = sanitizeSoapResponse(rawData);

        if (!cleanData || !cleanData.cols || !cleanData.rows) {
          console.error('Invalid or empty data for TimeAvg Chart');
          container.innerHTML = 'No data available for display.';
          return;
        }

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', cleanData.cols[0].label); // Time period label (e.g., Month/Year)

        const includedIndexes: number[] = [];
        cleanData.cols.slice(1).forEach((col: any, idx: number) => {
          if (selectedTypes[col.label]) {
            dataTable.addColumn('number', col.label);
            includedIndexes.push(idx + 1); // +1 due to slicing offset
          }
        });

        if (includedIndexes.length === 0) {
          container.innerHTML = 'לא נבחרו עמודות להצגה';
          return;
        }

        cleanData.rows.forEach((row: any) => {
          const original = row.c.map((cell: any) => (cell ? cell.v : null));
          const rowData: any[] = [original[0]];

          includedIndexes.forEach((i) => {
            const value = original[i];
            const timeValue = typeof value === 'number'
              ? value
              : parseDurationToDecimalHours(value);
            rowData.push(timeValue);
          });

          dataTable.addRow(rowData);
        });

        // Format numbers as HH:MM
        const timeFormatter = new google.visualization.NumberFormat({
          pattern: '00:00',
          fractionDigits: 0
        });
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
            format: '00:00'
          },
          colors: this.CHART_COLORS.slice(0, dataTable.getNumberOfColumns() - 1),
          vAxis: {
            format: '00:00',
            minValue: 0,
            ticks: this.generateTimeAxisTicks(dataTable)
          },
          interpolateNulls: true,
          tooltip: { isHtml: true }
        };

        const options = { ...defaultOptions, ...customOptions };
        const chart = new google.visualization.ColumnChart(container);
        const view = new google.visualization.DataView(dataTable);

        // Custom columns with formatted values
        const columns: any[] = [0]; // First column (labels)
        for (let i = 1; i < dataTable.getNumberOfColumns(); i++) {
          columns.push({
            sourceColumn: i,
            calc: (dt: any, row: number) => {
              const value = dt.getValue(row, i);
              return {
                v: value,
                f: value !== null ? formatDecimalHoursToTime(value) : ''
              };
            },
            type: 'number',
            label: dataTable.getColumnLabel(i)
          });
        }

        view.setColumns(columns);

        // Add tooltip interaction
        google.visualization.events.addListener(chart, 'ready', () => {
          google.visualization.events.addListener(chart, 'onmouseover', (e: any) => {
            if (e.row !== null && e.column > 0) {
              const value = dataTable.getValue(e.row, e.column);
              if (value !== null) {
                chart.setSelection([{ row: e.row, column: e.column }]);
              }
            }
          });
        });

        chart.draw(view, options);
        console.log(`TimeAvg Chart (${groupBy}) drawn successfully.`);
      })
      .catch(error => {
        console.error('Error loading TimeAvg Chart data:', error);
        container.innerHTML = 'Failed to load chart data. Check console.';
      });
  }


  // --- eof TimeAvgChart

  // private formatNumberShort(num: number): string {
  //   if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  //   if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  //   if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  //   return num.toString();
  // }

  
  private processExploitationData(data: any): any {
    console.log('processExploitationData started');
    const chartData = new google.visualization.DataTable();
  
    try {
      const cols = data.cols;
      if (!cols || cols.length === 0) {
        throw new Error('No columns found in JSON.');
      }
  
      const valueColIndices: number[] = [];
  
      // Step 1: Add original columns + individual annotation columns
      cols.forEach((col: any, index: number) => {
        chartData.addColumn(col.type, col.label);
        if (index > 0 && col.type === 'number') {
          valueColIndices.push(index);
          chartData.addColumn({ type: 'string', role: 'annotation' });
        }
      });
  
      // Step 2: Add extra invisible total series + annotation column
      chartData.addColumn('number', 'Total'); // dummy data series
      chartData.addColumn({ type: 'string', role: 'annotation' }); // annotation for total
  
      const rows = data.rows;
      if (!rows || rows.length === 0) {
        throw new Error('No rows found in JSON.');
      }
  
      rows.forEach((row: any) => {
        const rowData: any[] = [];
        let rowSum = 0;
  
        row.c.forEach((cell: any, index: number) => {
          const isCategory = index === 0;
          const val = cell?.v;
  
          if (isCategory) {
            rowData.push(val?.toString() || '');
          } else {
            const numericValue = val !== undefined && val !== null && val !== '' ? val : null;
            rowData.push(numericValue); // value
  
            if (numericValue !== null) {
              rowSum += numericValue;
            }
  
            // Individual value annotation
            rowData.push(numericValue !== null ? numericValue.toString() : null);
          }
        });
  
        // Add dummy data for total series: value = null, annotation = total string
        rowData.push(0.001); // invisible value
 //       rowData.push(`Total: ${this.formatNumberShort ? this.formatNumberShort(rowSum) : rowSum.toLocaleString()}`);
 rowData.push(`Total: ${formatNumberShort(rowSum)}`);

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
  
    const totalSeriesIndex = (dataTable.getNumberOfColumns() - 1) / 2 - 1; // last series index
  
    const seriesOptions: any = {
      [totalSeriesIndex]: {
        color: 'transparent',
        visibleInLegend: false,
        enableInteractivity: false,
        annotations: {
          style: 'point', // Required to apply custom annotation style
          textStyle: {
            fontSize: 14,
            bold: true,
            color: '#333' // Or any other custom color
          }
        }
      }
    };
  
    const defaultOptions = {
      height: 400,
      legend: { position: 'top' },
      bar: { groupWidth: '75%' },
      isStacked: true,
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 12, color: '#000' } // default for value annotations
      },
      colors: this.CHART_COLORS,
      series: seriesOptions,
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
