import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  public DATA_SOURCES = {
    OPERATIONS: './assets/data/h_operations_data_v4.json',
    INCOME: './assets/data/h_income_data_v4.json',
    OPERATIONS_3Y: './assets/data/h_operations_data_v4_3y.json',
    TIME_AVG: './assets/data/time_avg_s-m.json',
    GAUGE: './assets/data/gauge.json',
    //http://localhost:64964/WebService.asmx/GetStatsValues / {"deptCode": "10", "returnedPatients": false,   "timeLine": "1/2/3/4/5" (week/month/year/5y today/5y full ) }
    AS: './assets/data/as.json',
    OPbyDEPT:'http://localhost:64964/WebService.asmx/LineBarChartSurgeryStatistics'
  };

  constructor(private http: HttpClient) {
    // Load the Google Charts packages
    google.charts.load('current', { packages: ['corechart', 'gauge', 'controls'] });
    google.charts.setOnLoadCallback(() => {
      console.log('Google Charts loaded');
      this.loadAndDrawCharts();
    });
  }

  /**
   * Main function to load and draw all charts in sequence with custom options.
   */
  
  public loadAndDrawCharts(options: any = {}): void {
    const {
      operationsBarOptions = {},
      operationsLineOptions = {},
      incomeBarOptions = {
        annotations: { textStyle: { opacity: 0 } },
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
        }
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
      .then(() => this.drawSurgeryStatisticsChart('surgery_stats_chart', surgeryStatsOptions))      
      .then(() => console.log('All charts loaded successfully'))
      .catch(error => console.error('Error in chart loading sequence:', error));
  }
  

  public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.OPERATIONS, this.processYearlyData, this.CHART_TYPES.BAR, 'bar_chart', barChartOptions);
    await this.fetchDataAndDraw(this.DATA_SOURCES.OPERATIONS, this.processYearlyData, this.CHART_TYPES.LINE, 'line_chart', lineChartOptions);
    console.log('Operations charts complete');
  }

  public async drawIncomeCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.INCOME, this.processYearlyData, this.CHART_TYPES.BAR, 'bar_chart2', barChartOptions);
    await this.fetchDataAndDraw(this.DATA_SOURCES.INCOME, this.processYearlyData, this.CHART_TYPES.LINE, 'line_chart2', lineChartOptions);
    console.log('Income charts complete');
  }

  public async loadChart3Y(chartOptions: any = {}): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.OPERATIONS_3Y, (data: any) => data, this.CHART_TYPES.THREE_YEAR, 'bar_chart_3y', chartOptions);
    console.log('3-year chart complete');
  }

  public async initTimeAvgChart(chartOptions: any = {}): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.TIME_AVG, this.processTimeAvgData, this.CHART_TYPES.TIME_AVG, 'bar_chart_time_avg', chartOptions);
    console.log('Time average chart complete');
  }

  public async drawChartGaugeFunc(chartOptions: any = {}, textPosition: number = 120): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.GAUGE, (data: any) => data, this.CHART_TYPES.GAUGE, 'gauge_chart', chartOptions);
    this.positionGaugeChartText('gauge_chart', textPosition);
    console.log('Gauge chart complete');
  }

  public async drawASChart(chartOptions: any = {}): Promise<void> {
    await this.fetchDataAndDraw(this.DATA_SOURCES.AS, this.processASData, this.CHART_TYPES.AS, 'as_chart', chartOptions);
    console.log('AS chart complete');
  }

  

  /**
   * Fetch data from the provided URL, process it, and then draw the chart.
   */
  // private async fetchDataAndDraw(url: string, dataProcessor: Function, chartType: string, elementId: string, chartOptions: any = {}): Promise<void> {
  //   try {
  //     const data = await this.http.get(url).toPromise();
  //     const processedData = chartType === this.CHART_TYPES.GAUGE
  //       ? google.visualization.arrayToDataTable(data['data'])
  //       : dataProcessor.call(this, data);
  //     await this.drawChart(processedData, chartType, elementId, chartOptions);
  //   } catch (error) {
  //     console.error('Error fetching or processing data:', error);
  //     const el = document.getElementById(elementId);
  //     if (el) {
  //       el.innerHTML = 'Failed to load chart data. Check console and file path.';
  //     }
  //   }
  // }


  private async fetchDataAndDraw(
    url: string,
    dataProcessor: Function,
    chartType: string,
    elementId: string,
    chartOptions: any = {},
    postPayload: any = null
  ): Promise<void> {
    try {
      let data: any;
  
      if (postPayload) {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const response: any = await this.http.post(url, postPayload, { headers }).toPromise();
        data = typeof response?.d === 'string' ? JSON.parse(response.d) : response?.d || response;
      } else {
        data = await this.http.get(url).toPromise();
      }
  
      const processedData =
        chartType === this.CHART_TYPES.GAUGE
          ? google.visualization.arrayToDataTable(data['data'])
          : dataProcessor.call(this, data);
  
      await this.drawChart(processedData, chartType, elementId, chartOptions);
    } catch (error) {
      console.error('Error fetching or processing data:', error);
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
  dataTable.addColumn('date', 'Month');
  dataTable.addColumn('number', 'Value');
  dataTable.addColumn({ type: 'string', role: 'annotation' });

  const startYear = 2022;
  const startMonth = 0;

  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const rows = jsonData.yData.map((monthData: any, index: number) => {
    const valueRaw = monthData.y;

    if (valueRaw === undefined || valueRaw === null || valueRaw === '') {
      return [null, null, null];
    }

    const value = parseFloat(valueRaw);
    if (isNaN(value)) {
      console.error(`Invalid number in 'y' for index ${index}`);
      return [null, null, null];
    }

    const date = new Date(startYear, startMonth + index, 1);

    return [date, value, value.toString()];
  }).filter(row => row[0] !== null);

  dataTable.addRows(rows);

  const ticks = rows.map(row => {
    const date = row[0];
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
      title: 'חודש',
      ticks: ticks,
      slantedText: true,
      slantedTextAngle: 45
    },
    vAxis: {
      title: 'ערך'
    },
    interpolateNulls: false
  };

  const options = this.mergeDeep(defaultOptions, customOptions);

  const chart = new google.visualization.LineChart(document.getElementById(elementId));
  chart.draw(dataTable, options);
}



  private drawChartGauge(dataTable: any, elementId: string, customOptions: any = {}): void {
    //const targetValue = dataTable?.[1]?.[2] ?? 200;

    // Extract row data
  const row = dataTable?.[1];
  if (!row || row.length < 3) {
    console.error('Invalid data format for gauge chart.');
    return;
  }

  const label = row[0];
  const value = row[1];
  const targetValue = row[2];

  // Prepare chart data (only Label and Value)
  const chartData = [
    ['Label', 'Value'],
    [label, value]
  ];

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
      majorTicks: ["0", "", "", "", targetValue],
      animation: { duration: 1000, easing: 'out' },
      greenColor: '#6ba1f8',
      yellowColor: '#6ba1f8',
      redColor: '#cee9ff'
    };

    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.Gauge(document.getElementById(elementId));
    chart.draw(google.visualization.arrayToDataTable(chartData), options);
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



  


  //
  /* Surgery Statistics Chart */
  //
  public async drawSurgeryStatisticsChart(elementId: string, chartOptions: any = {}): Promise<void> {
    const url = this.DATA_SOURCES.OPbyDEPT;
    const payload = {
      param: '5',
      deptCode: '10',
      surgerydeptType: '0',
      filter: '',
      returnedPatients: false,
      periodList: '',
      graphNumber: 1
    };
  
    await this.fetchDataAndDraw(url, this.processSurgeryStatsData, this.CHART_TYPES.AS, elementId, chartOptions, payload);
  }
  
  
 

private processSurgeryStatsData(raw: any): google.visualization.DataTable | null {
  try {
    let [xLabels, departments, dataSeries] = raw;

    // Use helper to get sorted years and know if we need to reverse dataSeries
    const yearLabels = convertOffsetsToYears(xLabels);
    
    // Determine if input xLabels were reversed
    const isChronological = xLabels.every((label, i, arr) => {
      return i === 0 || parseInt(arr[i]) > parseInt(arr[i - 1]);
    });

    // Reverse dataSeries only if xLabels were not in chronological order
    if (!isChronological) {
      dataSeries = [...dataSeries].reverse();
    }

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'מחלקה');

    yearLabels.forEach(label => {
      dataTable.addColumn('number', label);
      dataTable.addColumn({ type: 'string', role: 'annotation' });
    });

    departments.forEach(department => {
      const row: any[] = [department];

      dataSeries.forEach(dataForYear => {
        const deptEntry = dataForYear.find((entry: any) => entry.depart === department);
        const y = deptEntry ? deptEntry.y : null;
        row.push(y, y != null ? y.toString() : null);
      });

      dataTable.addRow(row);
    });

    return dataTable;

  } catch (err) {
    console.error('Error processing surgery stats data:', err);
    return null;
  }
}

  
  
  
  
}
