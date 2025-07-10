import { HostListener, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from "src/environments/environment";
import { MatToolbarModule } from '@angular/material/toolbar';
import { formatNumberShort, parseDurationToDecimalHours, formatDecimalHoursToTime } from '../../shared/number-utils';
import { sanitizeSoapResponse, sanitizeSoapResponseAndFormatData } from '../../shared/sanitizesoapresponce';
import { addShortFormatAnnotations, filterValidYears, getWeeklySummaryAsPieValues  } from '../../shared/chart-utils';
import { filterRecentOffsets, YearlyData, getCurrentMonthData, getWorkingDaysInfo, convertHebrewMonthsToNumbers, filterOutCurrentMonth } from '../../shared/date-utils';
import { sanitizeAndFilterYearMonthData} from '../../shared/chart-data-pipeline';
import { limitToRecentYears } from '../../shared/limit-utils';
import { ChartDataPipelineService } from '../../shared/ChartDataPipelineService';
import { drawOverlayDualArcChartHelper } from '../../shared/drawOverlayDualArcChartHelper';
import { TableComponent  } from '../../shared/dataTable';




export interface Department {
  id: string;
  name: string;
}

export interface ChartSourceConfig {
  label: string;
  url: string;
  chartType?: string;
  color?: string;
  normalizationFactor?: number;
  unitLabel?: string;
  targetAxisIndex?: number;
  numberFormat?: 'K' | 'M' | 'B'; // Optional display format
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

  public gaugeLabel: string;
  public gaugeValue: number;
  public gaugeTargetValue: number;
  public gaugePlanned: number;
  public gaugeTargetStatus: string;
  public currentMonthValues: any[] = [];


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
    EXPLOITATIONTYPES: 'exploitationtypes',
    EXPLOITATIONMONTHLY: 'exploitation',
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
    EXPLOITATION: `${environment.url}/GetExploitation`,
    EXPLOITATIONTYPES: `${environment.url}/GetExploitation`,
    EXPLOITATIONMONTHLY: `${environment.url}/GetExploitationMonthly`,
    EXPLOITATIONWEEKLY: `${environment.url}/GetExploitationWeekly`,
    WORKING_DAYS : `${environment.url}/GetMonthWorkDays`,
    PIC_TABLE: `${environment.url}/GetPicDetailedData`
  };

  private cachedChartData: {
    operations?: any;
    income?: any;
    exploitation?: any;
    exploitationMonthly?: any;
    exploitationWeekly?: any;
    timeAvg?: {
      data: any;
      selectedTypes: { [key: string]: boolean };
    };
  } = {};
  
 

  constructor(
    private http: HttpClient,
    private chartPipeline: ChartDataPipelineService
  ) {
    this.chartsReady = new Promise<void>((resolve) => {
      google.charts.load('current', {packages: ['corechart', 'gauge', 'controls', 'table']});
      google.charts.setOnLoadCallback(() => {
        resolve();
      });
    });
  
    this.chartsReady.then(() => this.loadAndDrawCharts());
  }

  private formatNumberHumanReadable(value: number, formatType: 'K' | 'M' | 'B'): string {
    if (value == null) return '';
    switch (formatType) {
      case 'K': return `${(value / 1_000).toFixed(1)}K`;
      case 'M': return `${(value / 1_000_000).toFixed(1)}M`;
      case 'B': return `${(value / 1_000_000_000).toFixed(1)}B`;
      default: return value.toString();
    }
  }

  public workingDaysInfo: { totalWorkingDays: number; currentWorkingDayIndex: number };


  
  
  /**
   * Main function to load and draw all charts in sequence with custom options.
   */


  public async loadAndDrawCharts(options: any = {}): Promise<void> {
    //console.log("loadAndDrawCharts triggered");
  
    const chartArea = { width: '85%', height: '70%' };
    const legend = { position: 'top' };
    const annotations = {
      alwaysOutside: true,
      textStyle: {
        fontSize: 11,
        auraColor: 'none'
      }
    };
    const vAxis = { minValue: 0, format: 'short' };
    const hAxis = { slantedText: true, slantedTextAngle: 45 };
    const colors = this.CHART_COLORS;
  
    const {
      operationsBarOptions = {
        chartArea,
        legend,
        bar: { groupWidth: '70%' },
        annotations,
        vAxis,
        hAxis,
        colors
      },
      barChartQOptions = {
        chartArea,
        legend, //: { position: 'none' }
        bar: { groupWidth: '90%' },
        isStacked: false,
        colors,
        annotations,
        vAxis,
        hAxis
      },     
      operationsLineOptions = {
        chartArea,
        legend,
        annotations,
        vAxis,
        hAxis,
        colors
      },
      incomeBarOptions = {
        chartArea,
        height:600,
        legend,
        bar: { groupWidth: '80%' },
        annotations: { ...annotations, textStyle: { ...annotations.textStyle, opacity: 0.9, auraColor: '#FFFFFF' } },
        vAxis,
        hAxis,
        colors
      },
      incomeLineOptions = {
        chartArea,
        legend,
        annotations,
        vAxis,
        hAxis,
        colors
      },
      gaugeOptions = {},
      exploitationOptions = {
        chartArea,
        legend,
        isStacked: true,
        annotations: {
          alwaysOutside: false,
          textStyle: {
            fontSize: 11,
            color: '#000',
            //auraColor: '#FFFFFF'
          }
        },
        series: {
          0: {},
          1: {},
          2: {},
          3: {},
          4: { color: 'transparent', visibleInLegend: false }
        },
        vAxis,
        hAxis,
        colors
      },
      exploitationMonthlyOptions = {
        chartArea,
        legend,
        isStacked: true,
        annotations: {
          alwaysOutside: false,
          textStyle: {
            fontSize: 11,
            color: '#000',
            //auraColor: '#FFFFFF'
          }
        },
        series: {
          0: {},
          1: {},
          2: {},
          3: {},
          4: { color: 'transparent', visibleInLegend: false }
        },
        vAxis,
        hAxis,
        colors
      },
      chart3YOptions = {
        chartArea,
        legend: 'none',
        trendlines: {
          0: {
            type: 'linear',
            color: '#247a3a',
            lineWidth: 2,
            opacity: 0.6,
            visibleInLegend: true
          }
        },
        vAxis,
        hAxis
      },
      Opchart3YOptions = {
        chartArea,
        legend: 'none',
        trendlines: {
          0: {
            type: 'linear',
            color: '#247a3a',
            lineWidth: 2,
            opacity: 0.6,
            visibleInLegend: true
          }
        },
        vAxis,
        hAxis
      },
      picTableOptions = {
        //showRowNumber: true,
        sort: 'event',
        allowHtml: true,
        width: '100%',
        chartArea,
        colors
      },
      CombinedChart3Y = {annotations},
      gaugeTextPosition = 150
    } = options;
  
    await this.chartsReady;
  
    try {
      await this.loadChart3Y(chart3YOptions);
    } catch (e) { //console.error("3Y Chart failed:", e); 
      }
  
    try {
      await this.loadOpChart3Y(Opchart3YOptions);
    } catch (e) { //console.error("3Y Operations Chart failed:", e); 
      }
  
    try {
      await this.drawOperationsCharts(operationsBarOptions, operationsLineOptions);
    } catch (e) { //console.error("Operations Charts failed:", e); 
      }
  
    try {
      await this.drawIncomeCharts(incomeBarOptions, incomeLineOptions);
    } catch (e) { //console.error("Income Charts failed:", e); 
      }
  
    try {
      await this.drawOPBarChartQ(barChartQOptions);
    } catch (e) { //console.error("Operationals Quarterly Charts failed:", e); 
      }
  
    try {
      await this.drawChartGaugeFunc(gaugeOptions, gaugeTextPosition);
    } catch (e) { //console.error("Gauge Chart failed:", e); 
      }

      try {
        await this.drawDualArcGaugeOverlay('arc_chart');
      } catch (e) { console.error("|_| drawDualArcGaugeOverlay failed:", e); 
        }
    
    try {
      await this.drawExploitationChart(exploitationOptions);
    } catch (e) { //console.error("Exploitation Chart failed:", e); 
      }
      try {
        await this.drawExploitationChartMonthly(exploitationMonthlyOptions);
      } catch (e) { //console.error("Exploitation Monthly Chart failed:", e); 
        }
        try {
          await this.drawExploitationChartWeekly(exploitationOptions);
        } catch (e) { //console.error("Exploitation Weekly Chart failed:", e); 
          }
    try {
      await this.loadCombinedChart3Y(chart3YOptions);
    } catch (e) { //console.error("Combined 3Y Chart failed:", e); 
      }

      try {
        await this.drawPicTableChart('pic_table_chart', picTableOptions);
      } catch (e) {
        //console.error("PIC Table Chart failed:", e);
      }
  

      try {
        //await this.drawDataTable('pic_table_chart2', picTableOptions);
        await this.drawDataTable();
      } catch (e) { //console.error("drawDataTable failed:", e); 
        }


    //console.log("Finished loadAndDrawCharts()");
  }
  
  public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    await this.chartsReady;
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS, { responseType: 'text' }).toPromise();    
    const cleanData = sanitizeSoapResponse(rawData);    
    const yearsData = this.processYearlyData(cleanData); 
    const processedData = this.processYearlyData(cleanData);
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);   
    this.cachedChartData.operations = numericMonthData;
    const filteredData = filterOutCurrentMonth(numericMonthData);
    this.drawBarChart(numericMonthData, 'bar_chart', barChartOptions);
    //this.drawBarChart(yearsData, 'bar_chart', barChartOptions);
    
   
  }

  public async drawOPBarChartQ(barChartOptions: any = {}, barChartQOptions : any = {}): Promise<void> {
    await this.chartsReady;    
    const rawFData = await this.http.get(this.DATA_SOURCES.OPERATIONSF, { responseType: 'text' }).toPromise();    
    const cleanFData = sanitizeSoapResponse(rawFData);    
    const quartalData = this.processQuartalData(cleanFData);        
    this.drawBarChartQ(quartalData, 'line_chart', barChartQOptions );    
  }

  public async drawIncomeCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    const processedData = this.processYearlyData(cleanData);
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);
    this.cachedChartData.income = numericMonthData;
    const filteredData = filterOutCurrentMonth(numericMonthData);
    await this.fetchDataAndDrawDirect(filteredData, (data: any) => data, this.CHART_TYPES.BAR, 'bar_chart2', barChartOptions);
    await this.fetchDataAndDrawDirect(filteredData, (data: any) => data, this.CHART_TYPES.LINE, 'line_chart2', lineChartOptions);
    //console.log('Income charts complete');
  }
  
  public async loadChart3Y(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME_3Y, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);  
    const processedData = convertHebrewMonthsToNumbers(cleanData);  
    await this.fetchDataAndDrawDirect(processedData, (data: any) => data, this.CHART_TYPES.THREE_YEAR, 'bar_chart_3y', chartOptions);
    //console.log('3-year chart complete');
  }
  
  public async loadOpChart3Y(chartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS_3Y, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.OPTHREE_YEAR, 'op_bar_chart_3y', chartOptions);
    //console.log('Operations 3-year chart complete');
  }


  public async loadCombinedChart3Y(chartOptions: any = {}): Promise<void> { 
    await this.loadAndMergeMultipleCharts(
      [
        { label: 'הכנסה', url: this.DATA_SOURCES.INCOME_3Y, chartType: 'bars', color: '#6ba1f8', normalizationFactor: 1, unitLabel: 'מיליון שקל', targetAxisIndex: 0, numberFormat: 'M' },
        { label: 'צנתורים', url: this.DATA_SOURCES.OPERATIONS_3Y, chartType: 'line', color: '#1a1a1a', normalizationFactor: 1, unitLabel: 'פעולות', targetAxisIndex: 1 }
      ],
      'merged_chart_3y',
      {},
      null,
      true
    );   
  }
 

  public async drawChartGaugeFunc(chartOptions: any = {}, textPosition: number = 190): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.GAUGE, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);   
    await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.GAUGE, 'gauge_chart', chartOptions);  
    setTimeout(() => {
      this.positionGaugeChartText('gauge_chart', textPosition);     
    }, 500);
    
  } catch (error) {
    
  }

  public async drawExploitationChart(chartOptions: any = {}): Promise<void> {
    try {
      //console.log('drawExploitationChart');
      const rawData = await this.http.get(this.DATA_SOURCES.EXPLOITATION, { responseType: 'text' }).toPromise();
      //const cleanData = JSON.parse(rawData);
      const cleanData = sanitizeSoapResponse(rawData);

      await this.fetchDataAndDrawDirect(cleanData, this.processExploitationData.bind(this), this.CHART_TYPES.EXPLOITATION, 'as_chart', chartOptions);      
      //console.log('Exploitation chart complete');
    } catch (error) {
      //console.error("Failed to fetch Exploitation chart data:", error);
      const el = document.getElementById('as_chart');
      if (el) el.innerHTML = "Error loading Exploitation chart.";
    }
  }


  public async drawExploitationChartMonthly(chartOptions: any = {}): Promise<void> {
    try {
      //console.log('drawExploitationChart');
      const rawData = await this.http.get(this.DATA_SOURCES.EXPLOITATIONMONTHLY, { responseType: 'text' }).toPromise();
      //const cleanData = JSON.parse(rawData);
      const cleanData = sanitizeSoapResponse(rawData);

      await this.fetchDataAndDrawDirect(cleanData, this.processExploitationMonthlyData.bind(this), this.CHART_TYPES.EXPLOITATIONMONTHLY, 'as_chart_monthly', chartOptions);      
      //console.log('Exploitation chart complete');
    } catch (error) {
      //console.error("Failed to fetch Exploitation chart data:", error);
      const el = document.getElementById('as_chart_monthly');
      if (el) el.innerHTML = "Error loading Exploitation chart.";
    }
  }


  public async drawExploitationChartWeekly(chartOptions: any = {}): Promise<void> {
    try {
      //console.log('draw Exploitation Chart wEEKLY');
      const rawData = await this.http.get(this.DATA_SOURCES.EXPLOITATIONWEEKLY, { responseType: 'text' }).toPromise();
      //const cleanData = JSON.parse(rawData);
      const cleanData = sanitizeSoapResponse(rawData);
    //  console.log('✅ cleanData from EXPLOITATIONWEEKLY:', cleanData);
    // console.log('🔍 yData[0]?.Year?.Months:', cleanData?.yData?.[0]?.Year?.Months);
    // console.log('📅 currentMonthIndex:', new Date().getMonth());
      await this.fetchDataAndDrawDirect(cleanData, this.processExploitationData.bind(this), this.CHART_TYPES.EXPLOITATION, 'as_chart_weekly', chartOptions);   
      
      //const currentMonthValues = this.getWeeklySummaryAsPieValues(cleanData);
      this.currentMonthValues = getWeeklySummaryAsPieValues(cleanData);
      
      //console.log('drawExploitationChartWeekly -> 📊 currentMonthValues:', this.currentMonthValues);
      //console.log('Exploitation chart wEEKLY complete');
    } catch (error) {
      //console.error("Failed to fetch Exploitation chart wEEKLY data:", error);
      const el = document.getElementById('as_chart_weekly');
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
          dataToRender = addShortFormatAnnotations(processedData);
        } else {
          //console.error('Processed data is not a valid DataTable. Cannot apply annotations.', processedData);
          dataToRender = processedData;  // fallback
        }
      } else {
        dataToRender = processedData;
      }



      // Render the chart
      await this.drawChart(dataToRender, chartType, elementId, chartOptions);
    } catch (error) {
      //console.error('Error processing or drawing chart:', error);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'Failed to load chart data. Check //console and file path.';
      }
    }
  }


  /**
   * Draw chart based on type with custom options.
   */
  private async drawChart(data: any, chartType: string, elementId: string, chartOptions: any = {}): Promise<void> {
    if (!data) {
      const el = document.getElementById(elementId);
      if (el) { el.innerHTML = 'Error processing data. Check //console.'; }
      return;
    }

    const chartDrawers: any = {
      [this.CHART_TYPES.BAR]: this.drawBarChart.bind(this),
      [this.CHART_TYPES.LINE]: this.drawLineChart.bind(this),
      [this.CHART_TYPES.THREE_YEAR]: this.drawChart3Y.bind(this),
      [this.CHART_TYPES.OPTHREE_YEAR]: this.drawOpChart3Y.bind(this),
      [this.CHART_TYPES.TIME_AVG]: this.drawTimeAvgChart.bind(this),
      [this.CHART_TYPES.EXPLOITATION]: this.renderExploitationChart.bind(this),
      [this.CHART_TYPES.EXPLOITATIONTYPES]: this.renderExploitationTypesChart.bind(this),
      [this.CHART_TYPES.GAUGE]: this.drawChartGauge.bind(this)
    };

    const drawer = chartDrawers[chartType];
    if (!drawer) {
      //console.error(`Unsupported chart type: ${chartType}`);
      return;
    }

    return new Promise(resolve => {
      try {
        drawer(data, elementId, chartOptions);
        resolve();
      } catch (error) {
        //console.error(`Error drawing ${chartType} chart:`, error);
        const el = document.getElementById(elementId);
        if (el) { el.innerHTML = 'Error drawing chart. Check //console.'; }
        resolve();
      }
    });
  }


  private processYearlyData(data: any): any {
    const limitedData = filterRecentOffsets<YearlyData>(data.yData, y => y.Year.value, 4);
    const years: any = {};
    limitedData.forEach((yearObject: any) => {
      const yearValue = yearObject.Year.value;
      years[yearValue] = {};
      yearObject.Year.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          const monthNumber = convertHebrewMonthsToNumbers[month.name] || month.name;
          years[yearValue][monthNumber] = parseInt(month.y, 10);
        }
      });
    });
      
    return sanitizeAndFilterYearMonthData(years);
  }
  
  private processQuartalData(data: any): any {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    const currentQuarterKey = `Q${currentQuarter}`;
  
    const quarters = {
      Q1: ['ינואר', 'פברואר', 'מרץ'],
      Q2: ['אפריל', 'מאי', 'יוני'],
      Q3: ['יולי', 'אוגוסט', 'ספטמבר'],
      Q4: ['אוקטובר', 'נובמבר', 'דצמבר']
    };
  
   
    const limitedData = filterRecentOffsets<YearlyData>(
      data.yData,
      y => y.Year.value,
      4
    );
  
    const years: any = {};
  
    limitedData.forEach((yearObject: any) => {
      const yearValue = yearObject.Year.value;
      const monthMap: { [name: string]: number } = {};
  
      yearObject.Year.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          monthMap[month.name] = parseInt(month.y, 10);
        }
      });
  
      const yearQuarters: any = {};
      for (const [quarter, months] of Object.entries(quarters)) {
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
      //console.error('Google Visualization not loaded');
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
        textStyle: { fontSize: 14, color: '#888', auraColor: '#FFFFFF' }
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
      //console.error('Google Visualization not loaded');
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
      chartArea: { width: '90%', height: '90%' },
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
      //console.error('Google Visualization not loaded');
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

  
  
  private drawBarChart_Q(years: any, elementId: string, customOptions: any = {}): void {
    if (!google.visualization || !google.visualization.DataTable) {
      //console.error('Google Visualization not loaded');
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
          auraColor: '#FFFFFF'
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
  
  //_GroupedView
    
  
  private drawBarChartQ(years: any, elementId: string, barChartQOptions: any = {}, customOptions: any = {}): void {
    if (!google.visualization || !google.visualization.DataTable) return;
  
    const isValid = (val: any): boolean => !isNaN(parseFloat(val));
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Year-Quarter');
    dataTable.addColumn('number', 'Value');
    dataTable.addColumn({ type: 'string', role: 'style' });       // 🎯 per-bar color
    dataTable.addColumn({ type: 'string', role: 'annotation' });
  
    const yearKeys = Object.keys(years).sort();
    const rows: any[] = [];
  
    yearKeys.forEach((year, yearIndex) => {
      const color = this.CHART_COLORS[yearIndex % this.CHART_COLORS.length];
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const val = years[year][q];
        if (isValid(val)) {
          rows.push([
            `${year} ${q}`,
            Number(val),
            `color: ${color}`,
            String(val)
          ]);
        }
      });
    });
  
    if (rows.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
  
    dataTable.addRows(rows);
  
    const mergedOptions = {
      legend: { position: 'none' }, // 📌 disable internal legend (style column doesn't support it)
      vAxis: { minValue: 0, format: 'short' },
      ...barChartQOptions,
      ...customOptions
    };
  
    const chart = new google.visualization.ColumnChart(document.getElementById(elementId));
    chart.draw(dataTable, mergedOptions);
  
    // ✅ Custom Legend Render (below the chart)
    this.renderYearLegend(yearKeys, elementId + '-legend');
  }


  private drawChart3Y(jsonData: any, elementId: string, customOptions: any = {}): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based
  
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('date', 'תאריך');
    dataTable.addColumn('number', 'ערך');
    dataTable.addColumn({ type: 'string', role: 'annotation' });
  
    const hebrewMonths = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
  
    const rows: any[] = [];
  
    jsonData?.yData?.forEach((yearObject: any) => {
      const year = yearObject.Year.value;
      yearObject.Year.Months.forEach((monthObj: any) => {
        const value = parseFloat(monthObj.y);
        if (!value || isNaN(value)) return;
  
        const monthIndex = hebrewMonths.indexOf(monthObj.name);
        if (monthIndex === -1) return;
  
        // ❌ Exclude current month of current year
        if (year === currentYear && monthIndex === currentMonth) return;
  
        const date = new Date(year, monthIndex, 1);
        rows.push([date, value, formatNumberShort(value)]);
      });
    });
  
    if (rows.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }
  
    rows.sort((a, b) => a[0].getTime() - b[0].getTime());
    dataTable.addRows(rows);
  
    const ticks = rows.map(row => {
      const date: Date = row[0];
      return { v: date, f: `${date.getMonth() + 1}/${date.getFullYear()}` };
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
        textStyle: { fontSize: 12, color: '#000' },
        auraColor: '#FFFFFF'
      },
      hAxis: {
        ticks,
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        format: 'short'
      },
      interpolateNulls: false
    };
  
    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.LineChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }
  
  private drawOpChart3Y(jsonData: any, elementId: string, customOptions: any = {}): void {
    const filteredData = filterValidYears(jsonData, 4); // Enforce 4 most recent valid years
  
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
        const value = parseFloat(monthObj.y);
        if (!value || isNaN(value)) return;
  
        const monthIndex = hebrewMonths.indexOf(monthObj.name);
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
  
    rows.sort((a, b) => a[0].getTime() - b[0].getTime());
    rows.pop(); // Optionally exclude latest month
  
    dataTable.addRows(rows);
  
    const ticks = rows.map(row => {
      const date: Date = row[0];
      return { v: date, f: `${date.getMonth() + 1}/${date.getFullYear()}` };
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
        textStyle: { fontSize: 12, color: '#000' },
        auraColor: '#FFFFFF'
      },
      hAxis: {
        ticks,
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        format: 'short'
      },
      interpolateNulls: false
    };
  
    const options = this.mergeDeep(defaultOptions, customOptions);
    const chart = new google.visualization.LineChart(document.getElementById(elementId));
    chart.draw(dataTable, options);
  }
  

  public async drawChartGauge(data: any, elementId: string, chartOptions: any = {}): Promise<void> {
    try {
      if (typeof elementId !== 'string') return;

      const container = document.getElementById(elementId);
      if (!container) return;


      const workingDaysInfo = await getWorkingDaysInfo(this.DATA_SOURCES.WORKING_DAYS);
      if (workingDaysInfo.totalWorkingDays === 0) return;

      this.workingDaysInfo = workingDaysInfo; // store for use


      const rawData = await this.http.get(this.DATA_SOURCES.GAUGE, { responseType: 'text' }).toPromise();
      const cleanData = sanitizeSoapResponse(rawData);
      const monthData = getCurrentMonthData(cleanData?.yData?.[0]?.Year?.Months);
      if (!monthData) return;

      const label = monthData.name || 'Current Month';
      const value = monthData.y;

      const targetValue = 220;
      const perDayTarget = targetValue / workingDaysInfo.totalWorkingDays;
      const plannedIncludingToday = perDayTarget * (workingDaysInfo.currentWorkingDayIndex ?? 1);

      this.gaugeLabel = label;
      this.gaugeValue = value;
      this.gaugeTargetValue = targetValue;
      this.gaugePlanned = plannedIncludingToday;

      const isLastWorkingDay = (workingDaysInfo.currentWorkingDayIndex === workingDaysInfo.totalWorkingDays);
      this.gaugeTargetStatus = isLastWorkingDay
        ? (this.gaugeValue >= this.gaugeTargetValue ? '✅' : '❌')
        : (this.gaugeValue >= this.gaugePlanned ? '✅' : '❌');

      const chartData = [
        ['Label', 'Value'],
        [label, value]
      ];

      const defaultOptions = {
        width: 400,
        height: 220,
        yellowFrom: 0,
        yellowTo: plannedIncludingToday,
        greenFrom: plannedIncludingToday,
        greenTo: targetValue,
        minorTicks: 0,
        max: targetValue,
        min: 0,
        majorTicks: ["0", "", "", "", "", targetValue.toString()],
        animation: { duration: 1000, easing: 'out' },
        greenColor: '#5ed175',
        yellowColor: '#f86b6b'
      };

      const options = { ...defaultOptions, ...chartOptions };
      const chart = new google.visualization.Gauge(container);
      chart.draw(google.visualization.arrayToDataTable(chartData), options);


    } catch (error) {
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'Failed to draw Gauge chart. See console.';
      }
      console.error('Gauge chart error:', error);
    }
  }


  private positionGaugeChartText(chartId: string = 'gauge_chart', topPosition: number = 190): number {
    if (!chartId) {      
      return 0;
    }
    const selector = `#${chartId} g > g > text`;
    const textElements = document.querySelectorAll(selector);
    if (textElements.length === 0) {      
      return 0;
    }
    textElements.forEach(textElement => {
      textElement.setAttribute('y', topPosition.toString());
      if (textElement instanceof SVGTextElement) {
        textElement.setAttribute('y', topPosition.toString());
        textElement.setAttribute('style', 'font-size: 22px !important;');
      }
    });
    
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
  
  private processTimeAvgData(jsonData: any): any {
    const rawData = jsonData.table && jsonData.table.rows ? jsonData.table.rows : [];
    const headerLabels = jsonData.table && jsonData.table.cols ? jsonData.table.cols.map((col: any) => col.label) : [];

    if (rawData.length === 0) {
      //console.error('No rows found in JSON data');
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
      //console.error(`Element with ID "${elementId}" not found.`);
      return;
    }

    this.http.get(url, { responseType: 'text' }).toPromise()
      .then(rawData => {
        const cleanData = sanitizeSoapResponse(rawData);

        if (!cleanData || !cleanData.cols || !cleanData.rows) {
          //console.error('Invalid or empty data for TimeAvg Chart');
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
            format: '00:00',
            auraColor: '#FFFFFF'
          },
          colors: this.CHART_COLORS.slice(0, dataTable.getNumberOfColumns() - 1),
          vAxis: {
            format: '00:00',
            minValue: 0,
            ticks: this.generateTimeAxisTicks(dataTable)
          },
          interpolateNulls: true,
          tooltip: { isHtml: true },
          hAxis: {            
            slantedText: true,
            slantedTextAngle: 45
          },
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
        //console.log(`TimeAvg Chart (${groupBy}) drawn successfully.`);
      })
      .catch(error => {
        //console.error('Error loading TimeAvg Chart data:', error);
        container.innerHTML = 'Failed to load chart data. Check //console.';
      });
  }


  // --- eof TimeAvgChart
  

private processExploitationData(data: any): any {
  //console.log('processExploitationData started');
  const chartData = new google.visualization.DataTable();

  try {
    const cols = data.cols;
    if (!cols || cols.length === 0) {
      throw new Error('No columns found in JSON.');
    }

    const valueColIndices: number[] = [];

    // Add columns and annotation columns for each numeric series
    cols.forEach((col: any, index: number) => {
      chartData.addColumn(col.type, col.label);
      if (index > 0 && col.type === 'number') {
        valueColIndices.push(index);
        chartData.addColumn({ type: 'string', role: 'annotation' });
      }
    });

    // Add dummy Total series + annotation for total
    chartData.addColumn('number', '');
    chartData.addColumn({ type: 'string', role: 'annotation' });

    const rows = data.rows;
    if (!rows || rows.length === 0) {
      throw new Error('No rows found in JSON.');
    }

    rows.forEach((row: any) => {
      const rowData: any[] = [];
      let rowSum = 0;

      // Pre-calculate the total of numeric columns
      valueColIndices.forEach((colIndex) => {
        const val = row.c[colIndex]?.v;
        if (val !== undefined && val !== null && val !== '') {
          rowSum += val;
        }
      });

      // Fill row data and annotations
      row.c.forEach((cell: any, index: number) => {
        const isCategory = index === 0;
        const val = cell?.v;

        if (isCategory) {
          rowData.push(val?.toString() || '');
        } else {
          const numericValue = val !== undefined && val !== null && val !== '' ? val : null;
          rowData.push(numericValue); // actual value

          // Calculate percentage annotation
          let annotationText = null;
          if (numericValue !== null && rowSum > 0) {
            const percent = ((numericValue / rowSum) * 100).toFixed(1);
            annotationText = `${numericValue} (${percent}%)`;
          } else if (numericValue !== null) {
            annotationText = `${numericValue}`;
          }

          rowData.push(annotationText);
        }
      });

      // Add dummy Total series
      rowData.push(0.001); // invisible minimal value for stacked bar visual alignment
      rowData.push(`${formatNumberShort(rowSum)}`);

      chartData.addRow(rowData);
    });

    return chartData;
  } catch (error) {
    //console.error('Error processing JSON data: ', error);
    return null;
  }
}


private processExploitationMonthlyData(data: any): any {
  //console.log('processExploitationData started');
  const chartData = new google.visualization.DataTable();

  try {
    const cols = data.cols;
    if (!cols || cols.length === 0) {
      throw new Error('No columns found in JSON.');
    }

    const valueColIndices: number[] = [];

    // Add columns and annotation columns for each numeric series
    cols.forEach((col: any, index: number) => {
      chartData.addColumn(col.type, col.label);
      if (index > 0 && col.type === 'number') {
        valueColIndices.push(index);
        chartData.addColumn({ type: 'string', role: 'annotation' });
      }
    });

    // Add dummy Total series + annotation for total
    chartData.addColumn('number', '');
    chartData.addColumn({ type: 'string', role: 'annotation' });

    const rows = data.rows;
    if (!rows || rows.length === 0) {
      throw new Error('No rows found in JSON.');
    }

    rows.forEach((row: any) => {
      const rowData: any[] = [];
      let rowSum = 0;

      // Pre-calculate the total of numeric columns
      valueColIndices.forEach((colIndex) => {
        const val = row.c[colIndex]?.v;
        if (val !== undefined && val !== null && val !== '') {
          rowSum += val;
        }
      });

      // Fill row data and annotations
      row.c.forEach((cell: any, index: number) => {
        const isCategory = index === 0;
        const val = cell?.v;

        if (isCategory) {
          rowData.push(val?.toString() || '');
        } else {const numericValue = val !== undefined && val !== null && val !== '' ? val : null;
          rowData.push(numericValue); // actual value
          
          // Annotation: show only the number, no percentage
          let annotationText = null;
          if (numericValue !== null) {
            annotationText = `${numericValue}`;
          }
          
          rowData.push(annotationText);
          
        }
      });

      // Add dummy Total series
      rowData.push(0.001); // invisible minimal value for stacked bar visual alignment
      rowData.push(`${formatNumberShort(rowSum)}`);

      chartData.addRow(rowData);
    });

    return chartData;
  } catch (error) {
    //console.error('Error processing JSON data: ', error);
    return null;
  }
}



  private renderExploitationChart(dataTable: any, elementId: string, options: any = {}): void {
    //console.log('renderExploitationChart started');
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
            auraColor: '#FFFFFF',
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
        auraColor: '#FFFFFF',
        textStyle: { fontSize: 12, color: '#000' } // default for value annotations
      },
      colors: this.CHART_COLORS,
      series: seriesOptions,
      vAxis: { format: 'short', minValue: 0 }
    };
  
    chart.draw(dataTable, this.mergeDeep(defaultOptions, options));
  }
  

  private renderExploitationTypesChart(dataTable: any, elementId: string, options: any = {}): void {
    //console.log('renderExploitationChart started');
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
            auraColor: '#FFFFFF',
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
        auraColor: '#FFFFFF',
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
  


private normalizeCategoryToYearMonth(category: any, fallbackYear: number): { year: number, month: number } | null {
  const hebrewMonthToNumber: { [key: string]: number } = {
    'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4,
    'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8,
    'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
  };

  if (!category) return null;
  const normalized = category.toString().trim();

  // Handle '2023 מאי'
  const matchHebrewYearMonth = normalized.match(/^(\d{4})\s([א-ת]+)$/);
  if (matchHebrewYearMonth) {
    const year = parseInt(matchHebrewYearMonth[1], 10);
    const monthName = matchHebrewYearMonth[2];
    const month = hebrewMonthToNumber[monthName];
    if (month) return { year, month };
  }

  // '2025 5' or '2025-5'
  const match = normalized.match(/^(\d{4})[\s\-](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (month >= 1 && month <= 12) return { year, month };
  }

  // Just month name
  if (hebrewMonthToNumber[normalized]) {
    return { year: fallbackYear, month: hebrewMonthToNumber[normalized] };
  }

  // Just a numeric month
  if (/^\d{1,2}$/.test(normalized)) {
    const month = parseInt(normalized, 10);
    return { year: fallbackYear, month };
  }

  return null;
}


private mergeMultipleDataTablesByCategory(
  dataTables: any[],
  sources: ChartSourceConfig[],
  allowedCategories: string[] | null = null,
  useIntersectionOnly: boolean = false
): any {
  const combinedData = new google.visualization.DataTable();
  combinedData.addColumn('string', 'Category');

  sources.forEach((s, index) => {
    let dynamicLabel = s.label;
    if (s.normalizationFactor && s.normalizationFactor !== 1) {
      dynamicLabel += ` (${s.unitLabel || 'normalized'})`;
    }
    combinedData.addColumn('number', dynamicLabel);
    combinedData.addColumn({ type: 'string', role: 'annotation' });
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const categoryMaps: Map<string, number>[] = dataTables.map((dt, index) => {
    const map = new Map<string, number>();
    const normalizationFactor = sources[index].normalizationFactor || 1;

    for (let i = 0; i < dt.getNumberOfRows(); i++) {
      const rawCategory = dt.getValue(i, 0);
      const rawValue = dt.getValue(i, 1);
      if (!rawCategory || rawValue == null) continue;

      const parsed = this.normalizeCategoryToYearMonth(rawCategory, currentYear);
      if (!parsed) {
        //console.warn(`❌ Unrecognized category: "${rawCategory}"`);
        continue;
      }

      if (parsed.year === currentYear && parsed.month === currentMonth) {
        //console.log(`⏭ Skipped current month: ${parsed.month}/${parsed.year}`);
        continue;
      }

      const formattedCategory = `${parsed.month}/${parsed.year}`;
      map.set(formattedCategory, rawValue / normalizationFactor);
    }

    return map;
  });

  // Aggregate all category keys
  const allCategorySet = new Set<string>();
  for (const map of categoryMaps) {
    for (const key of map.keys()) {
      allCategorySet.add(key);
    }
  }

  let allCategories: string[] = Array.from(allCategorySet);

  if (allowedCategories && allowedCategories.length > 0) {
    allCategories = allCategories.filter((cat: string) =>
      allowedCategories.includes(cat)
    );
  }

  if (useIntersectionOnly) {
    allCategories = this.getIntersectionOfCategories(categoryMaps);
  }

  allCategories.sort((a: string, b: string) => {
    const [am, ay] = a.split('/').map(Number);
    const [bm, by] = b.split('/').map(Number);
    return ay === by ? am - bm : ay - by;
  });

  for (const cat of allCategories) {
    const row: any[] = [cat];
    for (let index = 0; index < categoryMaps.length; index++) {
      const map = categoryMaps[index];
      const value = map.get(cat) ?? null;

      row.push(value);

      const formatType = sources[index].numberFormat;
      const annotation =
        value != null && formatType
          ? this.formatNumberHumanReadable(value, formatType)
          : value != null
          ? value.toString()
          : null;

      row.push(annotation);
    }
    combinedData.addRow(row);
  }

  //console.log(`✅ Built chart with ${combinedData.getNumberOfRows()} rows`);
  return combinedData;
}


public async loadAndMergeMultipleCharts(
  sources: ChartSourceConfig[],
  elementId: string,
  chartOptions: any = {},
  allowedCategories: string[] | null = null,
  useIntersectionOnly: boolean = false
): Promise<void> {
  try {
    const rawResponses = await Promise.all(
      sources.map(s => this.http.get(s.url, { responseType: 'text' }).toPromise())
    );

    const dataTables = rawResponses.map((raw, i) => {
      const parsed = sanitizeSoapResponseAndFormatData(raw, sources[i].label);
      return new google.visualization.DataTable(parsed);
    });

    const combinedData = this.mergeMultipleDataTablesByCategory(dataTables, sources, allowedCategories, useIntersectionOnly);

    const dynamicLabels = sources.map(s => {
      if (s.normalizationFactor && s.normalizationFactor !== 1) {
        return `${s.label} (${s.unitLabel || 'normalized'})`;
      }
      return s.label;
    });

    const colors = sources.map(s => s.color || '#000000');
    const series: any = {};
    sources.forEach((s, i) => {
      series[i] = s.chartType && s.chartType !== 'bars'
        ? { type: s.chartType, targetAxisIndex: s.targetAxisIndex ?? 0 }
        : { targetAxisIndex: s.targetAxisIndex ?? 0 };
    });

    const mergedOptions = {
      chartArea: { left: 70, right: 70, width: '75%', height: '70%' },
      legend: { position: 'top' },
      colors,
      seriesType: 'bars',
      series,
      vAxes: {
        0: { title: dynamicLabels.find((_, i) => sources[i].targetAxisIndex === 0) || 'Primary', minValue: 0, format: 'short' },
        1: { title: dynamicLabels.find((_, i) => sources[i].targetAxisIndex === 1) || 'Secondary', minValue: 0, format: 'short' }
      },
      hAxis: { slantedText: true, slantedTextAngle: 45 },
      annotations: { alwaysOutside: true, textStyle: { fontSize: 11, auraColor: '#FFFFFF' } },
      ...chartOptions
    };

    const chartContainer = document.getElementById(elementId);
    if (chartContainer) {
      const chart = new google.visualization.ComboChart(chartContainer);
      chart.draw(combinedData, mergedOptions);
    } else {
      //console.warn(`Chart container with id '${elementId}' not found.`);
    }

  } catch (error) {
    //console.error('Error loading merged chart:', error);
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = 'Failed to load merged chart.';
  }
}


private getIntersectionOfCategories(categoryMaps: Map<string, number>[]): string[] {
  if (categoryMaps.length === 0) {
    return [];
  }

  let intersection = Array.from(categoryMaps[0].keys());
  for (let i = 1; i < categoryMaps.length; i++) {
    intersection = intersection.filter(cat => categoryMaps[i].has(cat));
  }

  return intersection.sort();
}


private renderYearLegend(years: string[], legendElementId: string): void {
  const legendContainer = document.getElementById(legendElementId);
  if (!legendContainer) return;

  legendContainer.innerHTML = years
    .map((year, i) => {
      const color = this.CHART_COLORS[i % this.CHART_COLORS.length];
      return `
        <span style="display:inline-block; margin-right:12px;">
          <span style="display:inline-block; width:12px; height:12px; background-color:${color}; margin-right:6px; vertical-align:middle;"></span>
          <span style="vertical-align:middle;">${year}</span>
        </span>`;
    })
    .join('');
}


public async drawPicTableChart(
  elementId: string = 'pic_table_chart',
  options: any = {}
): Promise<void> {
  await this.chartsReady;

  const el = document.getElementById(elementId);
  if (!el) return;

  try {
    const url = this.DATA_SOURCES.PIC_TABLE;
    const rawResponse: string = await this.http
      .get(url, { responseType: 'text' })
      .toPromise();

    const response = sanitizeSoapResponse(rawResponse);

    if (!response || !Array.isArray(response.rows) || !Array.isArray(response.cols)) {
      el.innerHTML = "No data available";
      return;
    }

    // Reverse rows for UI
    response.rows.reverse();

    // ✅ Normalize only date columns
    response.cols.forEach((col, idx) => {
      if (col.type === 'date') {
        normalizeDateColumn(response.rows, idx);
      }
    });

    // Build and store DataTable
    const dataTable = new google.visualization.DataTable(response);
    this.lastTableDataTable = dataTable;

    // Optional: add summary
    appendTotalRow(dataTable);

    // Draw chart
    const chart = new google.visualization.Table(el);
    chart.draw(dataTable, {
      allowHtml: true,
      width: '100%',
      sort: 'event',
      ...options
    });

  } catch (error) {
    el.innerHTML = "Error loading table";
  }

  // === Utility: Normalize Date Column ===
  function normalizeDateColumn(rows: any[], columnIndex: number): void {
    rows.forEach((row) => {
      const cell = row?.c?.[columnIndex];
      if (!cell || !cell.v) return;

      if (typeof cell.v === 'string') {
        const match = cell.v.match(/^Date\((\d+),(\d+),(\d+)\)$/);
        if (match) {
          const [_, y, m, d] = match.map(Number);
          cell.v = new Date(y, m, d);
        } else {
          const parsed = new Date(cell.v);
          if (!isNaN(parsed.getTime())) {
            cell.v = parsed;
          }
        }
      }
    });
  }

  // === Utility: Append Total Row ===
  function appendTotalRow(dataTable: any): void {
    const totalRow: any[] = [];

    for (let i = 0; i < dataTable.getNumberOfColumns(); i++) {
      if (i === 0) {
        totalRow.push('Total');
      } else if (dataTable.getColumnType(i) === 'number') {
        const sum = Array.from({ length: dataTable.getNumberOfRows() }, (_, rowIndex) =>
          dataTable.getValue(rowIndex, i)
        ).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
        totalRow.push(sum);
      } else {
        totalRow.push(null);
      }
    }

    dataTable.addRow(totalRow);
  }
}



public redrawCharts(): void {
  if (!google.visualization) return;

  // Re-draw operations chart
  if (this.cachedChartData.operations) {
    const el = document.getElementById('bar_chart');
    if (el) this.drawBarChart(this.cachedChartData.operations, 'bar_chart');
  }

  // Re-draw income chart
  if (this.cachedChartData.income) {
    const elBar = document.getElementById('bar_chart2');
    const elLine = document.getElementById('line_chart2');
    if (elBar) this.drawBarChart(this.cachedChartData.income, 'bar_chart2');
    if (elLine) this.drawLineChart(this.cachedChartData.income, 'line_chart2');
  }

  // Re-draw exploitation charts
  if (this.cachedChartData.exploitation) {
    const el = document.getElementById('as_chart');
    if (el) this.renderExploitationChart(this.cachedChartData.exploitation, 'as_chart');
  }

  if (this.cachedChartData.exploitationMonthly) {
    const el = document.getElementById('as_chart_monthly');
    if (el) this.renderExploitationChart(this.cachedChartData.exploitationMonthly, 'as_chart_monthly');
  }

  if (this.cachedChartData.exploitationWeekly) {
    const el = document.getElementById('as_chart_weekly');
    if (el) this.renderExploitationChart(this.cachedChartData.exploitationWeekly, 'as_chart_weekly');
  }

  // Re-draw time average chart
  if (this.cachedChartData.timeAvg) {
    const el = document.getElementById('bar_chart_time_avg');
    if (el) {
      this.drawTimeAvgChart(
        'bar_chart_time_avg',
        {},
        this.cachedChartData.timeAvg.selectedTypes
      );
    }
  }

  
}



public async drawDualArcGaugeOverlay(elementId: string): Promise<void> {
  try {
    const waitForContainer = (id: string, retries = 10): Promise<HTMLElement | null> =>
      new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          const el = document.getElementById(id);
          if (el || ++attempts >= retries) {
            clearInterval(interval);
            resolve(el);
          }
        }, 100);
      });

    const container = await waitForContainer(elementId);
    if (!container) {
      //console.warn(`❌ Container "${elementId}" not found after retrying`);
      return;
    }

    //console.debug(`[Overlay Gauge] Target Element ID:`, elementId);

    const workingDaysInfo = await getWorkingDaysInfo(this.DATA_SOURCES.WORKING_DAYS);
    if (workingDaysInfo.totalWorkingDays === 0) {
      //console.warn(`❌ No working days in the current month`);
      return;
    }

    const currentIndex = workingDaysInfo.currentWorkingDayIndex ?? 1;
    const totalDays = workingDaysInfo.totalWorkingDays;

    const isFirstWorkingDay = currentIndex === 1;
    const isLastWorkingDay = currentIndex === totalDays;

    //console.debug(`[Overlay Gauge] Working Days Info:`);
    //console.table(workingDaysInfo);
    //console.log("currentIndex:", currentIndex);
    //console.log("isFirstWorkingDay:", isFirstWorkingDay);

    const rawData = await this.http.get(this.DATA_SOURCES.GAUGE, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    //console.debug(`[Overlay Gauge] Clean Data:`, cleanData);

    if (!Array.isArray(cleanData?.yData) || !cleanData.yData[0]?.Year?.Months) {
      //console.warn(`❌ cleanData.yData[0].Year.Months is missing or malformed`);
      return;
    }

    const months = cleanData.yData[0].Year.Months;
    //console.debug("months:", months);

    let monthData = getCurrentMonthData(months);
    if (!monthData && isFirstWorkingDay) {
      // ⬅️ Fallback to previous month data on first working day
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthNum = prevMonth.getMonth() + 1; // 1-based

      const hebrewMonthMap: { [key: string]: number } = {
        'ינואר': 1, 'פברואר': 2, 'מרץ': 3,
        'אפריל': 4, 'מאי': 5, 'יוני': 6,
        'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9,
        'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
      };

      const fallbackMonth = months.find(m => hebrewMonthMap[m.name] === prevMonthNum);
      if (fallbackMonth) {
        monthData = fallbackMonth;
        //console.warn(`⚠️ Using previous month's data (${fallbackMonth.name}) as fallback for gauge on first working day`);
      }
    }

    if (!monthData) {
      //console.warn(`❌ No month data available for current or fallback month`);
      //console.table(months);
      return;
    }

    //console.debug("monthData:", monthData);

    const value = monthData.y;
    const targetValue = 220;
    const perDayTarget = targetValue / totalDays;
    const plannedIncludingToday = perDayTarget * currentIndex;

    let gaugeTargetStatus: string;

    if (isFirstWorkingDay) {
      const relaxedThreshold = perDayTarget * 0.5;
      gaugeTargetStatus = value >= relaxedThreshold ? '✅' : '❌';
      //console.debug(`[Overlay Gauge] First working day: expected ≥ ${relaxedThreshold.toFixed(2)} (50% of per-day target)`);
    } else if (isLastWorkingDay) {
      gaugeTargetStatus = value >= targetValue ? '✅' : '❌';
      //console.debug(`[Overlay Gauge] Last working day: expected ≥ ${targetValue}`);
    } else {
      gaugeTargetStatus = value >= plannedIncludingToday ? '✅' : '❌';
      //console.debug(`[Overlay Gauge] Mid-month: expected ≥ ${plannedIncludingToday.toFixed(2)}`);
    }

    // console.debug(`[Overlay Gauge] Gauge Value: ${value}`);
    // console.debug(`[Overlay Gauge] Planned Value Up To Today: ${plannedIncludingToday.toFixed(2)}`);
    // console.debug(`[Overlay Gauge] Target Status: ${gaugeTargetStatus}`);

    const weeklyTable = cleanData?.yData?.[0]?.WeekSummaryTable;
    const parsedPieValues = getWeeklySummaryAsPieValues(weeklyTable);

    // console.debug(`[Overlay Gauge] Weekly Pie Values:`);
    // console.table(parsedPieValues);

    setTimeout(() => {
      drawOverlayDualArcChartHelper({
        containerId: elementId,
        workingDaysInfo,
        gaugePlanned: plannedIncludingToday,
        gaugeTargetValue: targetValue,
        gaugeValue: value,
        gaugeTargetStatus,
        currentMonthValues: parsedPieValues,
        markerOptions: { radius: 14, fontSize: 10 }
      });
    }, 100);

  } catch (err) {
    //console.error('❌ Failed to draw dual arc overlay:', err);
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = '⚠️ Error loading dual arc overlay';
    }
  }
}




private lastTableDataTable: any[] = [];

public getLastTableData(): any[] {
  return this.lastTableDataTable;
}



public async drawDataTable(): Promise<void> {
  await this.chartsReady;

  try {
    const url = this.DATA_SOURCES.PIC_TABLE;
    const rawResponse: string = await this.http.get(url, { responseType: 'text' }).toPromise();
    const response = sanitizeSoapResponse(rawResponse);

    if (!response || !Array.isArray(response.rows) || !Array.isArray(response.cols)) {
      this.lastTableDataTable = [];
      return;
    }

    // Reverse rows to match Google Charts rendering
    response.rows.reverse();

    // Format helper
    const formatDateToDDMMYYYY = (date: Date | string): string => {
      if (!date || date === '') return '';
      
      const d = new Date(date);
      
      // Enhanced validation
      if (isNaN(d.getTime()) || !isFinite(d.getTime())) {
        return '';
      }
      
      // Double-check individual components before formatting
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return '';
      }
      
      return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    };

    // ✅ New: skip formatting by column index
    const shouldSkipFormatting = (idx: number): boolean => {
      const skipIndexes = [1,9]; 
      const shouldSkip = skipIndexes.includes(idx);      
      return shouldSkip;
    };

    const parsedData = response.rows.map((row: any) => {
      const obj: any = {};
    
      row?.c?.forEach((cell: any, idx: number) => {
        const rawLabel = response.cols?.[idx]?.label || `col${idx}`;
        const colLabel = rawLabel.trim().normalize("NFC");
        let value = cell?.v ?? '';
        
        // ✅ NEW: Handle invalid Date objects first
        if (value instanceof Date) {
          if (isNaN(value.getTime())) {
            console.log(`Found invalid Date object in col ${idx}, converting to empty string`);
            value = '';
          } else {
            // Valid Date object - format it
            value = formatDateToDDMMYYYY(value);
          }
        }
        // Force value to string for skip-format columns (like PatientNumber)
        else if (shouldSkipFormatting(idx)) {
          value = String(value);
        }
        // Only format if it's a string and NOT skipped
        else if (typeof value === 'string') {
          const dateMatch = value.match(/^Date\((\d+),(\d+),(\d+)\)$/);
          if (dateMatch) {
            const [_, y, m, d] = dateMatch.map(Number);
            value = formatDateToDDMMYYYY(new Date(y, m, d));
          }
          else if (/^\d{2}:\d{2}:\d{2}\.\d+/.test(value)) {
            const timeParts = value.split(':');
            value = `${timeParts[0]}:${timeParts[1]}`;
          }
          else if ((idx === 3 || idx === 6 || idx === 7) && /^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
            const parts = value.split(':');
            value = `${parts[0].padStart(2, '0')}:${parts[1]}`;
          }
          else if (value.includes('-') && value.includes('T')) {
            const isoDate = new Date(value);
            if (!isNaN(isoDate.getTime())) {
              value = formatDateToDDMMYYYY(isoDate);
            }
          }
        }
      
        obj[colLabel] = value;
      });
    
      return obj;
    });
    

    this.lastTableDataTable = parsedData;
  } catch (error) {
    this.lastTableDataTable = [];
  }
}



 }
  