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
import { DoctorSummaryComponent  } from '../doctor-summary.component';
import { SurgerySummaryComponent  } from '../surgery-summary.component';
import { RoomSummaryComponent  } from '../room-summary.component';
import { ReplaySubject, Observable, BehaviorSubject } from 'rxjs';







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

  private buildUrlWithParams(baseUrl: string, params: { [key: string]: any }): string {
    const searchParams = new URLSearchParams();
  
    for (const key in params) {
      const value = params[key];
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === 'number' && isNaN(value))
      ) {
        searchParams.set(key, value.toString());
      }
    }
  
    const queryString = searchParams.toString();
  
    if (!queryString) return baseUrl;
  
    // ✅ If baseUrl already contains '?', use '&' instead of appending another '?'
    if (baseUrl.includes('?')) {
      return `${baseUrl}&${queryString}`;
    }
  
    return `${baseUrl}?${queryString}`;
  }
  


  private dparamSubject = new BehaviorSubject<number>(0);
  public dparam$ = this.dparamSubject.asObservable();

setDparam(value: number): void {
  this.dparamSubject.next(value);
}
  
  
  
  

  
  // Chart configuration constants
  public chartsReady$: Observable<void>;
  private chartsReadySubject = new ReplaySubject<void>(1);
  private chartsReadyResolved = false;
  private chartCache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    OPERATIONS: `${environment.url}/GetCathCombined?param=4&onlyLastMonth=false`,
    OPERATIONSF: `${environment.url}/GetCathCombined?param=12&onlyLastMonth=false`,
    OPERATIONS_3Y: `${environment.url}/GetCathCombined?param=36&onlyLastMonth=false`,
    INCOME: `${environment.url}/GetIncomeDataCombined`,
    INCOME_3Y: `${environment.url}/GetIncomeDataCombined`,
    TIME_AVG: `${environment.url}/GetExploitationTimeAvgJson?groupBy`,    
    GAUGE: `${environment.url}/GetCathCombined?param=1&onlyLastMonth=true`,
    EXPLOITATION: `${environment.url}/GetExploitationCombined`,
    EXPLOITATIONTYPES: `${environment.url}/GetExploitationCombined`,
    EXPLOITATIONMONTHLY: `${environment.url}/GetExploitationMonthlyCombined`,
    EXPLOITATIONWEEKLY: `${environment.url}/GetExploitationWeeklyCombined`,
    WORKING_DAYS : `${environment.url}/GetMonthWorkDays`,
    PIC_TABLE: `${environment.url}/GetPicDetailedDataCombined`
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
  
 

  

  constructor(private http: HttpClient, private chartPipeline: ChartDataPipelineService) {
    this.chartsReady$ = this.chartsReadySubject.asObservable();
  
    google.charts.load('current', {
      packages: ['corechart', 'gauge', 'controls', 'table']
    });
  
    google.charts.setOnLoadCallback(() => {
      this.chartsReadySubject.next();
      this.chartsReadySubject.complete();
    });
  }
  
  public async waitUntilChartsReady(): Promise<void> {
    if (this.chartsReadyResolved) return;
    return new Promise<void>((resolve) => {
      this.chartsReady$.subscribe(() => {
        this.chartsReadyResolved = true;
        resolve();
      });
    });
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


  



private async safeAwait(promise: Promise<any>, label: string): Promise<void> {
  try {
    await promise;
  } catch (e) {
    console.error(`❌ Failed to load chart: ${label}`, e);
  }
}



  
public async drawOperationsCharts(
  barChartOptions: any = {},
  lineChartOptions: any = {},
  param?: number,
  dparam?: number
): Promise<void> {
  await this.waitUntilChartsReady();

  await this.safeAwait((async () => {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.OPERATIONS, { param, dparam });
    const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    const processedData = this.processYearlyData(cleanData);
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);
    this.cachedChartData.operations = numericMonthData;

    const filteredData = filterOutCurrentMonth(numericMonthData);

    this.drawBarChart(numericMonthData, 'bar_chart', barChartOptions);
  })(), 'drawOperationsCharts');
}



public async drawOPBarChartQ(
  barChartOptions: any = {},
  barChartQOptions: any = {},
  param?: number,
  dparam?: number
): Promise<void> {
  await this.waitUntilChartsReady();

  await this.safeAwait((async () => {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.OPERATIONSF, { param, dparam });
    const rawFData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanFData = sanitizeSoapResponse(rawFData);
    const quartalData = this.processQuartalData(cleanFData);

    this.drawBarChartQ(quartalData, 'line_chart', barChartQOptions);
  })(), 'drawOPBarChartQ');
}


public async drawIncomeCharts(
  barChartOptions: any = {},
  lineChartOptions: any = {},
  param?: number,
  dparam?: number
): Promise<void> {
  console.log('drawIncomeCharts call');
  await this.waitUntilChartsReady();

  await this.safeAwait((async () => {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.INCOME, { param, dparam });
    const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    const processedData = this.processYearlyData(cleanData);
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);
    this.cachedChartData.income = numericMonthData;

    const filteredData = filterOutCurrentMonth(numericMonthData);

    await this.fetchDataAndDrawDirect(
      filteredData,
      (data: any) => data,
      this.CHART_TYPES.BAR,
      'bar_chart2',
      barChartOptions
    );

   
  })(), 'drawIncomeCharts');
}


  
public async loadChart3Y(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
  console.log('loadChart3Y call');
  await this.waitUntilChartsReady();

  await this.safeAwait((async () => {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.INCOME_3Y, { param, dparam });
    const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    const processedData = convertHebrewMonthsToNumbers(cleanData);

    await this.fetchDataAndDrawDirect(
      processedData,
      (data: any) => data,
      this.CHART_TYPES.THREE_YEAR,
      'bar_chart_3y',
      chartOptions
    );
  })(), 'loadChart3Y');
}


  
public async loadOpChart3Y(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
  console.log('loadOpChart3Y call');
  await this.waitUntilChartsReady();

  await this.safeAwait((async () => {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.OPERATIONS_3Y, { param, dparam });
    const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    await this.fetchDataAndDrawDirect(
      cleanData,
      (data: any) => data,
      this.CHART_TYPES.OPTHREE_YEAR,
      'op_bar_chart_3y',
      chartOptions
    );
  })(), 'loadOpChart3Y');
}






  public async loadCombinedChart3Y(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
    console.log('loadCombinedChart3Y call');
    await this.waitUntilChartsReady();
  
    await this.safeAwait((async () => {
      const incomeUrl = this.buildUrlWithParams(this.DATA_SOURCES.INCOME_3Y, { param, dparam });
      const opUrl = this.buildUrlWithParams(this.DATA_SOURCES.OPERATIONS_3Y, { param, dparam });
  
      await this.loadAndMergeMultipleCharts(
        [
          {
            label: 'הכנסה',
            url: incomeUrl,
            chartType: 'bars',
            color: '#6ba1f8',
            normalizationFactor: 1,
            unitLabel: 'מיליון שקל',
            targetAxisIndex: 0,
            numberFormat: 'M'
          },
          {
            label: 'צנתורים',
            url: opUrl,
            chartType: 'line',
            color: '#1a1a1a',
            normalizationFactor: 1,
            unitLabel: 'פעולות',
            targetAxisIndex: 1
          }
        ],
        'merged_chart_3y',
        chartOptions,
        null,
        true
      );
    })(), 'loadCombinedChart3Y');
  }

  

  public async drawChartGaugeFunc(chartOptions: any = {}, textPosition: number = 190, param?: number, dparam?: number): Promise<void> {
    await this.waitUntilChartsReady();
  
    try {
      const url = this.buildUrlWithParams(this.DATA_SOURCES.GAUGE, { param, dparam });
      const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
      const cleanData = sanitizeSoapResponse(rawData);
  
      await this.fetchDataAndDrawDirect(cleanData, (data: any) => data, this.CHART_TYPES.GAUGE, 'gauge_chart', chartOptions);
  
      setTimeout(() => {
        this.positionGaugeChartText('gauge_chart', textPosition);
      }, 500);
  
    } catch (error) {
      const el = document.getElementById('gauge_chart');
      if (el) el.innerHTML = 'Failed to load gauge chart';
    }
  }

  
  public async drawExploitationChart(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
    console.log('drawExploitationChart call');
    await this.waitUntilChartsReady();
  
    await this.safeAwait((async () => {
      const url = this.buildUrlWithParams(this.DATA_SOURCES.EXPLOITATION, { param, dparam });
  
      const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
      const cleanData = sanitizeSoapResponse(rawData);
  
      await this.fetchDataAndDrawDirect(
        cleanData,
        this.processExploitationData.bind(this),
        this.CHART_TYPES.EXPLOITATION,
        'as_chart',
        chartOptions
      );
    })(), 'drawExploitationChart');
  }
  


  public async drawExploitationChartMonthly(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
    console.log('drawExploitationChartMonthly call');
    await this.waitUntilChartsReady();
  
    await this.safeAwait((async () => {
      const url = this.buildUrlWithParams(this.DATA_SOURCES.EXPLOITATIONMONTHLY, { param, dparam });
  
      const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
      const cleanData = sanitizeSoapResponse(rawData);
  
      await this.fetchDataAndDrawDirect(
        cleanData,
        this.processExploitationMonthlyData.bind(this),
        this.CHART_TYPES.EXPLOITATIONMONTHLY,
        'as_chart_monthly',
        chartOptions
      );
    })(), 'drawExploitationChartMonthly');
  }
  


  public async drawExploitationChartWeekly(chartOptions: any = {}, param?: number, dparam?: number): Promise<void> {
    console.log('drawExploitationChartWeekly call');
    await this.waitUntilChartsReady();
  
    await this.safeAwait((async () => {
      const url = this.buildUrlWithParams(this.DATA_SOURCES.EXPLOITATIONWEEKLY, { param, dparam });
  
      const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
      const cleanData = sanitizeSoapResponse(rawData);
  
      await this.fetchDataAndDrawDirect(
        cleanData,
        this.processExploitationData.bind(this),
        this.CHART_TYPES.EXPLOITATION,
        'as_chart_weekly',
        chartOptions
      );
  
      this.currentMonthValues = getWeeklySummaryAsPieValues(cleanData);
    })(), 'drawExploitationChartWeekly');
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
        //this.drawChartGauge(cleanData, elementId, chartOptions);
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
    console.log(`🖼️ drawChart call → ${chartType} → ${elementId}`);
  
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn(`Chart element not found: ${elementId}`);
      return;
    }
  
    if (!data) {
      el.innerHTML = '⚠️ אין נתונים להצגה';
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
      //[this.CHART_TYPES.GAUGE]: this.drawChartGauge.bind(this)
    };
  
    const drawer = chartDrawers[chartType];
    if (!drawer) {
      el.innerHTML = `⚠️ סוג גרף לא נתמך (${chartType})`;
      console.warn(`Unsupported chart type: ${chartType}`);
      return;
    }
  
    try {
      await drawer(data, elementId, chartOptions);
    } catch (error) {
      el.innerHTML = `⚠️ שגיאה בשרטוט גרף (${chartType})`;
      console.error(`Error drawing ${chartType} chart:`, error);
    }
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
  

    const HEBREW_MONTHS: { [key: string]: string } = {
      '1': 'ינואר',
      '2': 'פברואר',
      '3': 'מרץ',
      '4': 'אפריל',
      '5': 'מאי',
      '6': 'יוני',
      '7': 'יולי',
      '8': 'אוגוסט',
      '9': 'ספטמבר',
      '10': 'אוקטובר',
      '11': 'נובמבר',
      '12': 'דצמבר'
    };

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
  
    //const months = Object.keys(filteredYears[yearKeys[0]]);
    const months = Object.keys(filteredYears[yearKeys[0]]).sort((a, b) => parseInt(a) - parseInt(b));
    // const rows = months.map(month => {
    //   const row: any[] = [month];
    const rows = months.map(month => {
      const hebrewMonth = HEBREW_MONTHS[month] || month;
      const row: any[] = [hebrewMonth];
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
    const HEBREW_MONTHS: { [key: string]: string } = {
      '1': 'ינואר',
      '2': 'פברואר',
      '3': 'מרץ',
      '4': 'אפריל',
      '5': 'מאי',
      '6': 'יוני',
      '7': 'יולי',
      '8': 'אוגוסט',
      '9': 'ספטמבר',
      '10': 'אוקטובר',
      '11': 'נובמבר',
      '12': 'דצמבר'
    };
    
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    yearKeys.forEach(year => dataTable.addColumn('number', year));

    //const months = Object.keys(filteredYears[yearKeys[0]]);
    const months = Object.keys(filteredYears[yearKeys[0]]).sort((a, b) => parseInt(a) - parseInt(b));

    // const rows = months.map(month => {
    //   const row: any[] = [month];
    const rows = months.map(month => {
      const hebrewMonth = HEBREW_MONTHS[month] || month;
      const row: any[] = [hebrewMonth];
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
      //legend: 'none',
      legend: { position: 'bottom' },
      trendlines: {
        0: {
          type: 'linear',
          color: '#247a3a',
          lineWidth: 3,
          opacity: 0.7,
          showR2: true,
          visibleInLegend: true
        }
      },
      annotations: {
        alwaysOutside: false,
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
//      legend: 'none',
    legend: { position: 'bottom' },
      trendlines: {
        0: {
          type: 'linear',
          color: '#247a3a',
          lineWidth: 3,
          opacity: 0.7,
          showR2: true,
          visibleInLegend: true
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
      height: 480,
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
      height: 640,
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

public async getProcessedDataTable(dparam: number): Promise<{ data: any[], displayedColumns: string[] }> {
  await this.waitUntilChartsReady();

  const cacheKey = `PIC_TABLE_PARSED_dparam=${dparam}`;
  const cached = this.chartCache.get(cacheKey);
  const isFresh = cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS);

  if (isFresh) return cached.data;

  await this.drawDataTable(dparam);
  const tableData = this.getLastTableData() || [];

  const displayedColumns = tableData.length > 0
    ? Object.keys(tableData[0])
    : [];

  const dateColumn = displayedColumns.find(col => col.toLowerCase().includes('date'));

  const parsedData = dateColumn
    ? tableData.map(row => ({
        ...row,
        [dateColumn]: typeof row[dateColumn] === 'string'
          ? this.parseDateString(row[dateColumn])
          : row[dateColumn]
      }))
    : tableData;

  const result = { data: parsedData, displayedColumns };
  this.chartCache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}

private parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}




public async drawPicTableChart(
  elementId: string = 'pic_table_chart',
  options: any = {},
  dparam: number = 0
): Promise<void> {
  await this.waitUntilChartsReady();
  console.log('📊 drawPicTableChart called with dparam:', dparam);

  const el = document.getElementById(elementId);
  if (!el) return;

  const cacheKey = `PIC_TABLE_CHART_${elementId}_dparam=${dparam}`;
  const cached = this.chartCache.get(cacheKey);
  const isFresh = cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS);

  if (isFresh) {
    this.renderTable(el, cached.data, options);
    return;
  }

  try {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.PIC_TABLE, { dparam });
    const rawResponse: string = await this.http
      .get(url, { responseType: 'text' })
      .toPromise();

    const response = sanitizeSoapResponse(rawResponse);

    if (!response || !Array.isArray(response.rows) || !Array.isArray(response.cols)) {
      el.innerHTML = "No data available";
      return;
    }

    response.rows.reverse();
    this.normalizeDateColumns(response.rows, response.cols);

    const dataTable = new google.visualization.DataTable(response);
    this.lastTableDataTable = dataTable;
    this.chartCache.set(cacheKey, { data: dataTable, timestamp: Date.now() });

    this.renderTable(el, dataTable, options);
  } catch (error) {
    el.innerHTML = "Error loading table";
    console.error("❌ drawPicTableChart failed:", error);
  }
}


private renderTable(el: HTMLElement, dataTable: any, options: any = {}): void {
  this.appendTotalRow(dataTable);

  const chart = new google.visualization.Table(el);
  chart.draw(dataTable, {
    allowHtml: true,
    width: '100%',
    sort: 'event',
    ...options
  });
}

private normalizeDateColumns(rows: any[], cols: any[]): void {
  cols.forEach((col, idx) => {
    if (col.type === 'date') {
      rows.forEach(row => {
        const cell = row?.c?.[idx];
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
  });
}

private appendTotalRow(dataTable: any): void {
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



public async drawDualArcGaugeOverlay(
  elementId: string,
  param?: number,
  dparam?: number
): Promise<void> {
  try {
    const container = await this.waitForElement(elementId);
    if (!container) return;

    // --- Clean up all old content (SVG + children) ---
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const workingDaysInfo = await getWorkingDaysInfo(this.DATA_SOURCES.WORKING_DAYS);
    if (!workingDaysInfo?.totalWorkingDays) return;

    const url = this.buildUrlWithParams(this.DATA_SOURCES.GAUGE, { param, dparam });
    const rawData = await this.http.get(url, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);

    // Get latest year's data
    const yData = cleanData?.yData;
    if (!Array.isArray(yData) || yData.length === 0) return;
    const latestYearData = yData[yData.length - 1]?.Year;
    const months = latestYearData?.Months;
    if (!Array.isArray(months)) return;

    const currentIndex = workingDaysInfo.currentWorkingDayIndex ?? 1;
    const totalDays = workingDaysInfo.totalWorkingDays;
    const isFirstDay = currentIndex === 1;
    const isLastDay = currentIndex === totalDays;

    // Try to get the current month dynamically
    let monthData = this.getCurrentMonthFromDate(months);
    if (!monthData) {
      monthData = this.getFallbackMonthData(months);
    }
    if (!monthData) return;

    const value = monthData.y;

    // --- Dynamic target: previous year's same month +10% ---
    const currentMonthName = monthData.name;
    const prevYearData = yData.length > 1 ? yData[yData.length - 2]?.Year : null;
    let targetValue = 220; // fallback
    if (prevYearData?.Months) {
      const prevMonth = prevYearData.Months.find(m => m.name === currentMonthName);
      if (prevMonth?.y) {
        targetValue = prevMonth.y * 1.1; // add 10%
      }
    }

    const perDayTarget = targetValue / totalDays;
    const plannedIncludingToday = perDayTarget * currentIndex;

    const gaugeTargetStatus = this.evaluateStatus(value, {
      isFirstDay,
      isLastDay,
      plannedIncludingToday,
      targetValue,
      perDayTarget
    });

    const weeklyTable = latestYearData?.WeekSummaryTable;
    const pieValues = getWeeklySummaryAsPieValues(weeklyTable);

    // Draw fresh chart
    setTimeout(() => {
      drawOverlayDualArcChartHelper({
        containerId: elementId,
        workingDaysInfo,
        gaugePlanned: plannedIncludingToday,
        gaugeTargetValue: targetValue,
        gaugeValue: value,
        gaugeTargetStatus,
        currentMonthValues: pieValues,
        markerOptions: { radius: 14, fontSize: 10 }
      });
    }, 100);

  } catch (err) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '⚠️ Error loading dual arc overlay';
  }
}



/**
 * Get month data for the current month (based on today's date).
 */
private getCurrentMonthFromDate(months: any[]): any | null {
  const currentMonthName = new Date().toLocaleString('he-IL', { month: 'long' }); // Hebrew month names
  return months.find(m => m.name === currentMonthName) || null;
}




private waitForElement(id: string, retries = 10): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    let attempts = 0;
    const interval = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++attempts >= retries) {
        clearInterval(interval);
        resolve(el);
      }
    }, 100);
  });
}

private getFallbackMonthData(months: any[]): any | undefined {
  const prevMonthNum = new Date().getMonth(); // 0-based
  const hebrewMonthMap: { [key: string]: number } = {
    'ינואר': 0, 'פברואר': 1, 'מרץ': 2,
    'אפריל': 3, 'מאי': 4, 'יוני': 5,
    'יולי': 6, 'אוגוסט': 7, 'ספטמבר': 8,
    'אוקטובר': 9, 'נובמבר': 10, 'דצמבר': 11
  };
  return months.find(m => hebrewMonthMap[m.name] === prevMonthNum);
}

private evaluateStatus(
  value: number,
  { isFirstDay, isLastDay, plannedIncludingToday, targetValue, perDayTarget }: {
    isFirstDay: boolean,
    isLastDay: boolean,
    plannedIncludingToday: number,
    targetValue: number,
    perDayTarget: number
  }
): string {
  if (isFirstDay) {
    const relaxed = perDayTarget * 0.5;
    return value >= relaxed ? '✅' : '❌';
  }
  if (isLastDay) {
    return value >= targetValue ? '✅' : '❌';
  }
  return value >= plannedIncludingToday ? '✅' : '❌';
}



private lastTableDataTable: any[] = [];

public getLastTableData(): any[] {
  return this.lastTableDataTable;
}





public async drawDataTable(dparam: number): Promise<void> {
  await this.waitUntilChartsReady();
  console.log('📊 drawDataTable call dparam =', dparam);

  const cacheKey = `PIC_TABLE_dparam=${dparam}`;
  const cached = this.chartCache.get(cacheKey);
  const isFresh = cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS);

  if (isFresh) {
    this.lastTableDataTable = cached.data;
    return;
  }

  try {
    const url = this.buildUrlWithParams(this.DATA_SOURCES.PIC_TABLE, { dparam });
    const rawResponse: string = await this.http.get(url, { responseType: 'text' }).toPromise();
    const response = sanitizeSoapResponse(rawResponse);

    if (!Array.isArray(response?.rows) || !Array.isArray(response?.cols)) {
      console.warn("⚠️ Invalid PIC table API response format");
      this.lastTableDataTable = [];
      return;
    }

    response.rows.reverse();

    const parsedData = response.rows.map((row: any) => {
      const obj: any = {};
      row?.c?.forEach((cell: any, idx: number) => {
        const label = response.cols?.[idx]?.label?.trim()?.normalize("NFC") || `col${idx}`;
        let value = cell?.v ?? '';

        obj[label] = this.formatCellValue(value, idx);
      });
      return obj;
    });

    this.chartCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });
    this.lastTableDataTable = parsedData;

  } catch (error) {
    console.error("❌ drawDataTable failed:", error);
    this.lastTableDataTable = [];
  }
}

private formatCellValue(value: any, idx: number): string {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : this.formatDate(value);
  }

  if ([1].includes(idx)) return String(value ?? '');

  if (typeof value === 'string') {
    const isDotNet = /^Date\((\d+),(\d+),(\d+)\)$/.exec(value);
    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const isFullIso = value.includes('-') && value.includes('T');
    const isTimeMs = /^\d{2}:\d{2}:\d{2}\.\d+/.test(value);
    const isBasicTime = /^\d{1,2}:\d{2}:\d{2}$/.test(value);

    if (isIso || isFullIso) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? '' : this.formatDate(parsed);
    }
    if (isDotNet) {
      const [, y, m, d] = isDotNet.map(Number);
      const parsed = new Date(y, m, d);
      return isNaN(parsed.getTime()) ? '' : this.formatDate(parsed);
    }
    if (isTimeMs || isBasicTime) {
      const [hh, mm] = value.split(':');
      return `${hh.padStart(2, '0')}:${mm}`;
    }
  }

  return value?.toString() ?? '';
}

private formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}


public loadAllDashboardCharts(param: number | undefined, dparam: number): void {
  console.log('📊 loadAllDashboardCharts call with param:', param, 'dparam:', dparam);

  const drawTasks = [
    () => this.drawOperationsCharts({}, {}, param, dparam),
    () => this.drawOPBarChartQ({}, {}, param, dparam),
    () => this.drawIncomeCharts({}, {}, param, dparam),
    () => this.loadChart3Y({}, param, dparam),
    () => this.loadOpChart3Y({}, param, dparam),
    () => this.loadCombinedChart3Y({}, param, dparam),
    //() => this.drawChartGaugeFunc({}, 190, param, dparam),
    () => this.drawDualArcGaugeOverlay('arc_chart', param, dparam),
    () => this.drawExploitationChart({}, param, dparam),
    () => this.drawExploitationChartWeekly({}, param, dparam),
    () => this.drawExploitationChartMonthly({}, param, dparam),
    //() => this.drawDataTable(dparam),
    //() => this.drawPicTableChart('pic_table_chart2', {}, dparam)
    
  ];

  drawTasks.forEach(task => {
    this.safeAwait(task(), task.name || 'anonymous draw task');
  });

  // Optional raw fetch log (still optional)
  const queryParams = { param, dparam };
  const picTableUrl = this.buildUrlWithParams(this.DATA_SOURCES.PIC_TABLE, queryParams);

  // this.http.get(picTableUrl).subscribe(
  //   data => console.log('📦 Pic Table Data loaded'),
  //   error => {
  //     console.error('❌ Error loading GetPicDetailedData:', error);
  //     const el = document.getElementById('pic_table_chart2');
  //     if (el) el.innerHTML = 'שגיאה בטעינת נתונים (טבלה)';
  //   }
  // );
}




public clearCache(): void {
  this.chartCache.clear();
  console.log('📦 Chart cache cleared.');
}


 }
  