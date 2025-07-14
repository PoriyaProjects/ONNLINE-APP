import { HostListener, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from "src/environments/environment";
import { MatToolbarModule } from '@angular/material/toolbar';
import { formatNumberShort, parseDurationToDecimalHours, formatDecimalHoursToTime } from '../../shared/number-utils';
import { sanitizeSoapResponse, sanitizeSoapResponseAndFormatData, sanitizeSoapResponseDept } from '../../shared/sanitizesoapresponce';
import { addShortFormatAnnotations, filterValidYears, getWeeklySummaryAsPieValues } from '../../shared/chart-utils';
import { filterRecentOffsets, YearlyData, getCurrentMonthData, getWorkingDaysInfo, convertHebrewMonthsToNumbers, filterOutCurrentMonth, filterLastN } from '../../shared/date-utils';
import { sanitizeAndFilterYearMonthData } from '../../shared/chart-data-pipeline';
import { limitToRecentYears } from '../../shared/limit-utils';
import { ChartDataPipelineService } from '../../shared/ChartDataPipelineService';
import { drawOverlayDualArcChartHelper } from '../../shared/drawOverlayDualArcChartHelper';
import { TableComponent } from '../../shared/dataTable';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { map } from 'rxjs/operators';
import { drawOverlayDualArcChartHelperIncome } from 'src/app/shared/drawOverlayDualArcChartHelperIncome';

import { getDeptGroupHtml, getDepartmentLayoutHtml } from './templates';
import { Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private http: HttpClient, private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document) { }
}


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
    EXPLOITATIONMONTHLY: 'exploitation',
    TIME_AVG: 'timeavg',
    GAUGE: 'gauge'
  };


  public DATA_SOURCES = {
    OPERATIONS: `${environment.url}/GetChargingChartMonthlyDataEExx`,
    INCOME: `${environment.url}/GetChargingChartMonthlyDataEExx`,
    INCOMEDEPT: `${environment.url}/GetChargingIncomeMonthly`,
    INCOME_3Y: `${environment.url}/GetChargingChartMonthlyDataEExx`,
    GAUGE: `${environment.url}/GetCurrentCath?param=1&onlyLastMonth=true`,
    WORKING_DAYS: `${environment.url}/GetMonthWorkDays`,
    YEARLY_INCOME_FY: `${environment.url}/GetYearlyIncomeFYData?dimTimeTypeId=5&subDesc=&change=1&changeperc=1`
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
      google.charts.load('current', { packages: ['corechart', 'gauge', 'controls', 'table'] });
      google.charts.setOnLoadCallback(() => {
        resolve();
      });
    });

    this.chartsReady.then(() => this.loadAndDrawCharts());
  }

  public workingDaysInfo: { totalWorkingDays: number; currentWorkingDayIndex: number };


  // dept groups income bar chart
  public async drawIncomeDeptsLastMonthChartV(): Promise<void> {
    await this.chartsReady;

    try {
      const rawResponse = await this.http
        .get(`${environment.url}/GetChargingGrouspData?groupName=&deptName=`, { responseType: 'text' })
        .toPromise();

      const cleanJson: any = sanitizeSoapResponse(rawResponse);

      if (!Array.isArray(cleanJson)) {
        console.error('Invalid data format:', cleanJson);
        return;
      }

      // Group by department -> year -> charging
      const grouped = new Map<string, { [year: string]: number }>();
      const allYears = new Set<string>();

      cleanJson.forEach((item: any) => {
        const dept = item.department;
        const year = item.year;
        const charge = item.totalCharging || 0;

        if (!grouped.has(dept)) {
          grouped.set(dept, {});
        }

        grouped.get(dept)![year] = charge;
        allYears.add(year);
      });

      // Sort years (e.g. ['2024', '2025'])
      const sortedYears = Array.from(allYears).sort();
      const prevYear = sortedYears[sortedYears.length - 2];
      const currYear = sortedYears[sortedYears.length - 1];

      const formatShort = (num: number): string => {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
        return num.toString();
      };


      const dataRows = Array.from(grouped.entries())
        .map(([dept, yearMap]) => {
          const prev = yearMap[prevYear] || 0;
          const curr = yearMap[currYear] || 0;
          return [dept, prev, formatShort(prev), curr, formatShort(curr)];
        })
        .sort((a, b) => Number(b[3]) - Number(a[3]));

      const data = google.visualization.arrayToDataTable([
        ['קבוצה', prevYear, { role: 'annotation' }, currYear, { role: 'annotation' }],
        ...dataRows
      ]);

      const options = {
        title: 'הכנסות לפי קבוצות - מתחילת שנה מול תקופה השתקד',
        chartArea: { width: '70%', height: '80%' },
        legend: { position: 'top' },
        //isStacked: true,
        bar: { groupWidth: '75%' },
        annotations: {
          alwaysOutside: true,
          textStyle: { fontSize: 12, color: '#444' }
        },
        vAxis: { format: 'short', minValue: 0 },
        hAxis: {
          slantedText: true,
          slantedTextAngle: 45
        },
        colors: ['#6ba1f8', '#5ed175']
      };

      const container = document.getElementById('incomedeptslastmonthv');
      if (container) {
        const chart = new google.visualization.ColumnChart(container);
        chart.draw(data, options);
      }
    } catch (err) {
      console.error('Failed to load or parse department charging data:', err);
      const el = document.getElementById('incomedeptslastmonthv');
      if (el) el.innerHTML = 'שגיאה בטעינת הנתונים';
    }
  }

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
        height: 460,
        legend,
        bar: { groupWidth: '90%' },
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
    } = options;

    await this.chartsReady;

    try {
      await this.drawOperationsCharts(operationsBarOptions, operationsLineOptions);
    } catch (e) { //console.error("Operations Charts failed:", e); 
    }

    try {
      await this.drawIncomeCharts(incomeBarOptions, incomeLineOptions);
    } catch (e) { //console.error("Income Charts failed:", e); 
    }

    try {
      //await this.drawDataTable('pic_table_chart2', picTableOptions);
      await this.drawIncomeDeptsLastMonthChartV();
    } catch (e) { //console.error("drawDataTable failed:", e); 
    }

    try {
      await this.drawDualArcGaugeOverlay('arc_chart', 529000000);
      // Use dynamic (110% of previous year): drawDualArcGaugeOverlay('arc_chart');
      // Use fixed target (e.g. 5,000,000) drawDualArcGaugeOverlay('arc_chart', 5000000);

    } catch (e) {
      console.error("drawDualArcGaugeOverlay failed:", e);
    }


    try {
      await this.loadYearlyIncomeDataCombined('tabled_chart');
    } catch (e) {
      console.error("loadYearlyIncomeDataCombined failed:", e);
    }
    // try {
    //   await this.loadYearlyIncomeDataCombined('tabled_chart2', 2, 'matrix');
    // } catch (e) {
    //   console.error("loadYearlyIncomeDataCombined2 failed:", e);
    // }

    try {
      //await this.renderDepartmentButtons('deptgroups');
      this.renderDepartmentButtons({
        containerId: 'deptgroups',
        chartContainerId: 'deptchart',
        chartKind: ['bar', '3y', 'combined'] as (
          'bar' | 'line' | '3y' | 'op3y' | 'quarterly' |
          'timeavg' | 'gauge' | 'exploitation' | 'dualgauge' | 'combined'
        )[]
      });



    } catch (e) {
      console.error("|_| loadYearlyIncomeDataTable failed:", e);
    }

  }


  //monthly by years
  public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    await this.chartsReady;
    const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS, { responseType: 'text' }).toPromise();
    const cleanData = sanitizeSoapResponse(rawData);
    const yearsData = this.processYearlyData(cleanData);
    const processedData = this.processYearlyData(cleanData);
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);
    this.cachedChartData.operations = numericMonthData;
    const filteredData = filterOutCurrentMonth(numericMonthData);
    const filterLastNData = filterLastN(filteredData, 5);
    this.drawBarChart(filterLastNData, 'bar_chart', barChartOptions);

  }


  //monthly series
  public async drawIncomeCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
    const rawData = await this.http.get(this.DATA_SOURCES.INCOME, { responseType: 'text' }).toPromise();
    //console.log('IncomeCharts raw data:' + rawData);
    const cleanData = sanitizeSoapResponse(rawData);
    //console.log('IncomeCharts processed cleanData:' + JSON.stringify(cleanData));
    const processedData = this.processYearlyData(cleanData);
    //console.log('IncomeCharts processed data:' + JSON.stringify(processedData));
    const numericMonthData = convertHebrewMonthsToNumbers(processedData);
    this.cachedChartData.income = numericMonthData;
    const filteredData = filterOutCurrentMonth(numericMonthData);
    //console.log('IncomeCharts filteredData data:' + JSON.stringify(filteredData));
    //await this.fetchDataAndDrawDirect(filteredData, (data: any) => data, this.CHART_TYPES.BAR, 'bar_chart2', barChartOptions);
    await this.fetchDataAndDrawDirect(filteredData, (data: any) => data, this.CHART_TYPES.BAR, 'bar_chart2', { ...barChartOptions, grouped: false, groupByYear: false } // for cumulative
    );
    await this.fetchDataAndDrawDirect(filteredData, (data: any) => data, this.CHART_TYPES.LINE, 'line_chart2', lineChartOptions);
    //console.log('Income charts complete');
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
      //[this.CHART_TYPES.EXPLOITATION]: this.renderExploitationChart.bind(this),
      [this.CHART_TYPES.GAUGE]: this.drawChartGauge.bind(this)
    };

    const drawer = chartDrawers[chartType];
    if (!drawer) {
      //console.error(`Unsupported chart type: ${chartType}`);
      return;
    }


    return new Promise(resolve => {
      try {
        if (chartType === this.CHART_TYPES.BAR) {
          const grouped = chartOptions.grouped !== false; // default to true
          drawer(data, elementId, chartOptions, grouped);
        } else {
          drawer(data, elementId, chartOptions);
        }
        resolve();
      } catch (error) {
        console.error(`Error drawing ${chartType} chart:`, error);
        const el = document.getElementById(elementId);
        if (el) { el.innerHTML = 'Error drawing chart. Check //console.'; }
        resolve();
      }
    });
  }

  private processYearlyData(data: any): any {
    const rawData = data.data;
    const yearMonthMap: any = {};

    rawData.forEach((entry: any) => {
      const [year, month] = entry.key.split('-');
      const monthNumber = parseInt(month, 10);

      if (!yearMonthMap[year]) {
        yearMonthMap[year] = {};
      }

      // ✅ Use `charging` instead of `quantity`
      if (this.valueExists(entry.charging)) {
        yearMonthMap[year][monthNumber] = entry.charging;
      }
    });

    // Convert to YearlyData-like format
    const transformedData = Object.keys(yearMonthMap).map(year => ({
      Year: {
        value: parseInt(year, 10),
        Months: Object.entries(yearMonthMap[year]).map(([month, val]) => ({
          name: month,
          y: val
        }))
      }
    }));

    const limitedData = filterRecentOffsets<any>(transformedData, y => y.Year.value, 4);
    const years: any = {};

    limitedData.forEach((yearObject: any) => {
      const yearValue = yearObject.Year.value;
      years[yearValue] = {};
      yearObject.Year.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          const monthNumber = parseInt(month.name, 10);
          years[yearValue][monthNumber] = parseInt(month.y, 10);
        }
      });
    });

    return sanitizeAndFilterYearMonthData(years);
  }



  private valueExists(value: any): boolean {
    return value !== undefined && value !== null && value !== '' && !isNaN(value);
  }


  private drawBarChart(
    years: any,
    elementId: string,
    customOptions: any = {},
    groupByYear: boolean = true,
    grouped: boolean = true
  ): void {
    if (!google.visualization || !google.visualization.DataTable) return;

    const currentYear = new Date().getFullYear();
    const allowedYears = [String(currentYear), String(currentYear - 1)];

    const isValid = (val: any): boolean => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    };

    const filteredYears: any = {};
    Object.keys(years).forEach(year => {
      if (!allowedYears.includes(year)) return;
      const months = years[year];
      const hasValidMonth = Object.values(months).some(val => isValid(val));
      if (hasValidMonth) {
        filteredYears[year] = months;
      }
    });

    const yearKeys = Object.keys(filteredYears);
    if (yearKeys.length === 0) {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "אין נתונים להצגה";
      return;
    }

    const dataTable = new google.visualization.DataTable();

    if (groupByYear) {
      // === GROUPED BAR MODE ===
      const allMonthsSet = new Set<string>();
      yearKeys.forEach(year => {
        Object.keys(filteredYears[year]).forEach(month => {
          allMonthsSet.add(month);
        });
      });

      const months = Array.from(allMonthsSet).sort((a, b) => +a - +b);
      dataTable.addColumn('string', 'Month');

      yearKeys.forEach(year => {
        dataTable.addColumn('number', year);
        dataTable.addColumn({ type: 'string', role: 'annotation' });
      });

      const rows = months.map(month => {
        const row: any[] = [month];
        yearKeys.forEach(year => {
          const val = filteredYears[year]?.[month];
          const numVal = isValid(val) ? parseFloat(val) : null;
          row.push(numVal);
          row.push(numVal !== null ? formatNumberShort(numVal) : null);
        });
        return row;
      });

      dataTable.addRows(rows);
    } else {
      // === SEQUENTIAL TIMELINE MODE ===
      dataTable.addColumn('string', 'Month-Year');
      yearKeys.forEach(year => {
        dataTable.addColumn('number', year);
        dataTable.addColumn({ type: 'string', role: 'annotation' });
      });

      const rows: any[] = [];

      yearKeys.sort().forEach(year => {
        const months = Object.keys(filteredYears[year]).sort((a, b) => +a - +b);
        months.forEach(month => {
          const label = `${month.padStart(2, '0')}-${year}`;
          const row: any[] = [label];
          yearKeys.forEach(colYear => {
            if (colYear === year) {
              const val = filteredYears[year][month];
              const numVal = isValid(val) ? parseFloat(val) : null;
              row.push(numVal);
              row.push(numVal !== null ? formatNumberShort(numVal) : null);
            } else {
              row.push(null);
              row.push(null);
            }
          });
          rows.push(row);
        });
      });

      dataTable.addRows(rows);
    }

    const defaultOptions = {
      height: 400,
      legend: groupByYear ? { position: 'top' } : { position: 'top' },
      bar: { groupWidth: '75%' },
      annotations: {
        alwaysOutside: true,
        textStyle: { fontSize: 14, color: '#888', auraColor: '#FFFFFF' }
      },
      isStacked: groupByYear ? !grouped : false,
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

  //_GroupedView

  //monthly series
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

  //monthly series
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





  private callApi(
    endpoint: string,
    rawParams: { [key: string]: any },
    sanitize = false
  ): Observable<any> {
    const params = new URLSearchParams();

    Object.entries(rawParams).forEach(([key, value]) => {
      const safeValue = value !== undefined && value !== null ? String(value) : '';
      params.set(key, safeValue);
    });

    const url = `${environment.url}/${endpoint}?${params.toString()}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(res => {
        let clean = sanitize ? sanitizeSoapResponse(res) : res;

        // Attempt JSON.parse only if it's a string starting with [ or {
        if (typeof clean === 'string' && /^[\[{]/.test(clean.trim())) {
          try {
            return JSON.parse(clean);
          } catch (err) {
            console.warn(`[callApi] JSON parse failed for ${endpoint}`, err);
          }
        }

        return clean;
      })
    );
  }



  // 📊 General-purpose full query
  getChargingChartMonthlyDataEExFull(params: any): Observable<any> {
    return this.callApi('GetChargingChartMonthlyDataEExx', params, true);
  }

  // 📈 Year-over-year chart
  getYearlyComparisonData(): Observable<any> {
    return this.callApi('GetChargingChartMonthlyDataEExx', {
      groupBy: 'month',
      format: 'google',
      calcMode: 'absolute',
      compareToLast: 'false'
    }, true);
  }



  // 👥 Department group share
  getGroupShareData(): Observable<any> {
    return this.callApi('GetChargingChartMonthlyDataEExx', {
      groupBy: 'group',
      format: 'google'
    }, true);
  }

  // 📉 Growth trend
  getGrowthData(): Observable<any> {
    return this.callApi('GetChargingChartMonthlyDataEExx', {
      groupBy: 'month',
      format: 'google',
      calcMode: 'cumulative'
    }, true);
  }

  public formatPercentChange(current: number, previous: number): string {
    if (previous === 0) {
      return 'N/A'; // or '∞%' if that's your preference
    }

    const change = ((current - previous) / previous) * 100;
    const rounded = Math.abs(change).toFixed(1);
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
    const sign = change > 0 ? '+' : change < 0 ? '-' : '';

    return `${arrow} ${sign}${rounded}%`;
  }



  public async drawDualArcGaugeOverlay(
    elementId: string,
    targetOverride?: number
  ): Promise<void> {
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
        console.warn(`❌ Container "${elementId}" not found after retrying.`);
        return;
      }

      console.debug(`[GaugeOverlay] Fetching data from API...`);
      const response: any[] = await this.callApi('GetYearlyIncomeFYLData', {
        change: 1,
        changeperc: 1
      }, true).toPromise();

      if (!Array.isArray(response) || response.length === 0) {
        console.warn(`❌ No data received from API.`);
        return;
      }

      const now = new Date();
      const today = now.getDate();
      const rawMonth = now.getMonth() + 1;
      const adjustedMonth = today > 10 ? rawMonth - 1 : rawMonth - 2;

      if (adjustedMonth < 1) {
        console.warn(`⚠️ Adjusted month (${adjustedMonth}) is before January. Insufficient data.`);
        return;
      }

      const years = response.map(r => r.Year);
      const maxYear = Math.max(...years);
      const previousYear = maxYear - 1;

      const currentYearData = response.find(r => r.Year === maxYear);
      const previousYearData = response.find(r => r.Year === previousYear);

      if (!currentYearData || (!previousYearData && targetOverride === undefined)) {
        console.warn(`❌ Missing required data to compute target.`);
        return;
      }

      const gaugeValue = currentYearData.TotalCharging;
      const dynamicTarget = previousYearData?.TotalCharging * 1.1;

      const gaugeTargetValue = targetOverride ?? dynamicTarget;
      const perMonthTarget = gaugeTargetValue / 12;
      const plannedIncludingThisMonth = perMonthTarget * adjustedMonth;

      let gaugeTargetStatus: string;

      if (adjustedMonth === 1) {
        const relaxedThreshold = perMonthTarget * 0.5;
        gaugeTargetStatus = gaugeValue >= relaxedThreshold ? '✅' : '❌';
      } else if (adjustedMonth === 12) {
        gaugeTargetStatus = gaugeValue >= gaugeTargetValue ? '✅' : '❌';
      } else {
        gaugeTargetStatus = gaugeValue >= plannedIncludingThisMonth ? '✅' : '❌';
      }

      setTimeout(() => {
        drawOverlayDualArcChartHelperIncome({
          containerId: elementId,
          workingDaysInfo: {
            currentWorkingDayIndex: adjustedMonth,
            totalWorkingDays: 12
          },
          gaugePlanned: plannedIncludingThisMonth,
          gaugeTargetValue,
          gaugeValue,
          gaugeTargetStatus,
          currentMonthValues: [],
          markerOptions: { radius: 14, fontSize: 10 },
        });
      }, 100);

    } catch (err) {
      console.error('❌ Failed to draw dual arc overlay:', err);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = '⚠️ Error loading dual arc overlay';
      }
    }
  }




  private readonly yearlyIncomeTableHeaders: { [key: string]: string } = {
    Year: 'שנה',
    TotalCharging: 'הכנסות (₪)',
    Change: 'גידול',
    ChangePercent: 'גידול (%)'
  };


  //tables chart
  loadYearlyIncomeDataCombined(
    containerId: string,
    yearsToShow?: number,
    tableMode: 'full' | 'matrix' = 'full'
  ): void {
    const container = document.querySelector(`#${containerId}`);
    if (!container) return;

    const params = {
      change: 1,
      changeperc: 1
    };

    this.callApi('GetYearlyIncomeFYLData', params, true).subscribe(
      (response: any[]) => {
        if (!Array.isArray(response) || response.length === 0) {
          container.innerHTML = '<p>No data available.</p>';
          return;
        }

        // Sort descending by year
        response.sort((a, b) => b.Year - a.Year);

        const data = yearsToShow ? response.slice(0, yearsToShow) : response;
        const headerMap: { [key: string]: string } = this.yearlyIncomeTableHeaders || {};

        let html = '<table class="table table-bordered table-striped">';

        if (tableMode === 'full') {
          const preferredOrder = ['Year', 'TotalCharging', 'Change', 'ChangePercent'];
          const allKeys = new Set<string>();
          data.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));

          const columns = Array.from(allKeys).sort((a, b) => {
            const ia = preferredOrder.indexOf(a);
            const ib = preferredOrder.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });

          html += '<thead><tr>';
          columns.forEach(col => {
            html += `<th>${headerMap[col] || col}</th>`;
          });
          html += '</tr></thead><tbody style="direction:ltr;">';

          const currentYear = new Date().getFullYear();

          data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
              let value = row[col];

              if (col === 'Year') {
                const actualYear = currentYear + row[col]; // convert relative year
                value = actualYear;
              } else if (col === 'TotalCharging' && value != null) {
                value = formatNumberShort(value);
              } else if (col === 'Change' && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + formatNumberShort(Math.abs(value));
              } else if (col === 'ChangePercent' && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + Math.abs(value).toFixed(1) + '%';
              }

              html += `<td>${value != null ? value : ''}</td>`;
            });
            html += '</tr>';
          });


          html += '</tbody>';
        } else {
          const metrics = ['TotalCharging', 'Change', 'ChangePercent'];
          const currentYear = new Date().getFullYear();
        
          html += '<thead><tr><th>שנה</th>';
          metrics.forEach(metric => {
            html += `<th>${headerMap[metric] || metric}</th>`;
          });
          html += '</tr></thead><tbody>';
        
          data.forEach(row => {
            const actualYear = currentYear + row.Year; // row.Year is relative (e.g., 0, -1, -2)
            html += `<tr><td>${actualYear}</td>`;
        
            metrics.forEach(metric => {
              let value = row[metric];
              if (value != null && !isNaN(value)) {
                if (metric === 'TotalCharging') {
                  value = formatNumberShort(value);
                } else if (metric === 'Change') {
                  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                  value = sign + formatNumberShort(Math.abs(value));
                } else if (metric === 'ChangePercent') {
                  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                  value = sign + Math.abs(value).toFixed(1) + '%';
                }
              } else {
                value = '';
              }
              html += `<td>${value}</td>`;
            });
        
            html += '</tr>';
          });
        
          html += '</tbody>';
        }
        
        
        

        html += '</table>';
        container.innerHTML = html;
      },
      () => {
        container.innerHTML = '<p class="text-danger">Failed to load data.</p>';
      }
    );
  }



  //wipe out
  public async getChargingGroupButtons(): Promise<{ department: string, color: string }[]> {
    try {
      // console.log('[getChargingGroupButtons] Fetching data from API...');

      // const raw = await this.http
      //   .get(`${environment.url}/GetChargingGrouspDataEx?groupName=&deptName=`, {
      //     responseType: 'text',
      //   })
      //   .toPromise();

      const raw = await this.callApi('GetChargingIncome', {
        groupId: '',
        deptId: '',
        incomeCategory: 'totalCharging'  // or configurable
      }, true).toPromise();

      // console.log('[getChargingGroupButtons] Raw response:', raw);

      const cleanJson = sanitizeSoapResponse(raw);
      // console.log('[getChargingGroupButtons] Clean JSON after sanitizeSoapResponse:', cleanJson);

      if (!Array.isArray(cleanJson)) {
        //console.error('[getChargingGroupButtons] Invalid response format: expected array');
        return [];
      }

      if (cleanJson.length === 0) {
        //onsole.warn('[getChargingGroupButtons] Response array is empty');
        return [];
      }

      const allYears = cleanJson.map((r: any) => +r.Year).filter(y => !isNaN(y));
      // console.log('[getChargingGroupButtons] All years found:', allYears);

      if (allYears.length === 0) {
        //console.warn('[getChargingGroupButtons] No valid years found in data');
        return [];
      }

      const latestYear = Math.max(...allYears);
      // console.log('[getChargingGroupButtons] Latest year selected:', latestYear);

      const filtered = cleanJson.filter((r: any) => +r.Year === latestYear);
      //console.log(`[getChargingGroupButtons] Filtered rows for ${latestYear}:`, filtered);

      const map: { [dept: string]: string } = {};

      filtered.forEach((r: any) => {
        const dept = r.Department || '(unknown)';
        const change = r.ChangePercent;
        const val = parseFloat(change);
        let color = '#ccc';

        if (!isNaN(val)) {
          if (val > 20) color = '#006400';
          else if (val > 10) color = '#228B22';
          else if (val > 0) color = '#90EE90';
          else if (val === 0) color = '#e0e0e0';
          else if (val > -10) color = '#f08080';
          else if (val > -20) color = '#ff8c00';
          else color = '#8b0000';
        }

        map[dept] = color;
      });

      const buttons = Object.keys(map).map(dept => ({
        department: dept,
        color: map[dept],
        class: 'dept-button'
      }));

      // console.log('[getChargingGroupButtons] Final department buttons:', buttons);
      return buttons;
    } catch (err) {
      //console.error('[getChargingGroupButtons] Error fetching or processing data:', err);
      return [];
    }
  }



  /**
    * Loads department data and renders a chart for a specific department
    */

  public async renderDepartmentChart(
    dept: { name: string; id: string },
    elementId: string,
    group: { name: string; id: string },
    options: {
      includeTimeSeries?: boolean;
      timeSeriesElementId?: string;
      includeGaugeOverlay?: boolean;
      gaugeElementId?: string;
      incomeCategory?: string;
    } = {}
  ): Promise<void> {
    await this.chartsReady;

    try {
      const raw = await this.callApi('GetChargingIncome', {
        groupId: group.id,
        deptId: dept.id,
        incomeCategory: options.incomeCategory || 'totalCharging'
      }, true).toPromise();

      const clean: any[] = Array.isArray(raw) ? raw : [];
      if (!clean.length) {
        document.getElementById(elementId)!.innerHTML = 'אין מספיק נתונים להצגה';
        return;
      }

      const grouped: Record<string, number> = {};
      const allYears: Set<string> = new Set();

      clean.forEach((row: any) => {
        const year = row.Year;
        const val = row.TotalCharging ?? row.totalCharging ?? 0;
        grouped[year] = val;
        allYears.add(year);
      });

      const sortedYears = Array.from(allYears).sort();
      if (sortedYears.length < 2) {
        document.getElementById(elementId)!.innerHTML = 'אין מספיק נתונים להצגה';
        return;
      }

      const prev = sortedYears[sortedYears.length - 2];
      const curr = sortedYears[sortedYears.length - 1];
      const prevVal = grouped[prev] || 0;
      const currVal = grouped[curr] || 0;

      const formatShort = (num: number): string =>
        num >= 1_000_000 ? (num / 1_000_000).toFixed(1) + 'M'
          : num >= 1_000 ? (num / 1_000).toFixed(0) + 'K'
            : num.toString();

      const chartData = google.visualization.arrayToDataTable([
        ['שנה', prev, { role: 'annotation' }, curr, { role: 'annotation' }],
        [dept.name, prevVal, formatShort(prevVal), currVal, formatShort(currVal)],
      ]);

      const optionsBar = {
        title: `סה"כ חיובים - ${dept.name}`,
        chartArea: { width: '70%', height: '80%' },
        legend: { position: 'top' },
        isStacked: true,
        bar: { groupWidth: '75%' },
        annotations: { alwaysOutside: true, textStyle: { fontSize: 12, color: '#444' } },
        vAxis: { format: 'short', minValue: 0 },
        hAxis: { slantedText: true, slantedTextAngle: 45 },
        colors: ['#6ba1f8', '#5ed175']
      };

      const container = document.getElementById(elementId);
      if (container) {
        const chart = new google.visualization.BarChart(container);
        chart.draw(chartData, optionsBar);
      }

      if (options.includeGaugeOverlay && options.gaugeElementId) {
        await this.drawDepartmentGaugeOverlay(dept.id, options.gaugeElementId, group.id);
      }
    } catch (err) {
      console.error('Failed to render department chart:', err);
      document.getElementById(elementId)!.innerHTML = 'שגיאה בטעינת הנתונים';
    }
  }



  private async drawDepartmentGaugeOverlay(deptName: string, elementId: string, groupName?: string): Promise<void> {
    const raw = await this.callApi('GetYearlyIncomeFYLData', {
      groupName: groupName || '',
      deptName,
      change: 1,
      changeperc: 1
    }, true).toPromise();

    const clean = Array.isArray(raw) ? raw : [];
    const years = clean.map(r => r.Year);
    const maxYear = Math.max(...years);
    const prevYear = maxYear - 1;

    const current = clean.find(r => r.Year === maxYear);
    const previous = clean.find(r => r.Year === prevYear);

    if (!current || !previous) return;

    const value = current.TotalCharging;
    const target = previous.TotalCharging * 1.1;

    drawOverlayDualArcChartHelperIncome({
      containerId: elementId,
      workingDaysInfo: { currentWorkingDayIndex: new Date().getMonth(), totalWorkingDays: 12 },
      gaugeValue: value,
      gaugeTargetValue: target,
      gaugePlanned: target * ((new Date().getMonth() + 1) / 12),
      gaugeTargetStatus: value >= target ? '✅' : '❌',
      currentMonthValues: [],
      markerOptions: { radius: 14, fontSize: 10 },
    });
  }


  public async renderDepartmentButtons({
    containerId = 'deptgroups',
    chartContainerId = 'deptchart',
    chartKind = 'bar',
    incomeCategory = 'totalCharging'
  }: {
    containerId?: string;
    chartContainerId?: string;
    chartKind?: string | string[];
    incomeCategory?: string;
  }): Promise<void> {
    const container = document.getElementById(containerId);
    const chartContainer = document.getElementById(chartContainerId);
    const chartKinds = Array.isArray(chartKind) ? chartKind : [chartKind];

    if (!container || !chartContainer) {
      console.warn(`[renderDepartmentButtons] Missing container(s): #${containerId} or #${chartContainerId}`);
      return;
    }

    try {
      const raw = await this.callApi('GetChargingIncome', {
        groupId: null,
        deptId: null,
        incomeCategory: incomeCategory || 'totalCharging'
      }, true).toPromise();

      const clean = sanitizeSoapResponse(raw);
      if (!Array.isArray(clean) || clean.length === 0) {
        container.innerHTML = 'No department group data available.';
        return;
      }

      // Extract group info with latest ChargingPct
      const groupMap = new Map<number, { groupId: number; groupName: string; lastPct: number | null }>();
      // for (const row of clean) {
      //   const groupId = parseInt(row.GroupID);
      //   const groupName = row.GroupName?.trim();
      //   const pct = parseFloat(row.ChargingPct);
      //   if (!groupId || !groupName || isNaN(pct)) continue;

      //   groupMap.set(groupId, { groupId, groupName, lastPct: pct }); // always override with last
      // }

      for (const row of clean) {
        const groupId = parseInt(row.GroupID);
        const groupName = row.GroupName?.trim();
        const pct = parseFloat(row.ChargingPct);
        if (!groupId || !groupName || isNaN(pct)) continue;
      
        // Only set if this groupId hasn't been seen yet — this captures the *first* entry
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, { groupId, groupName, lastPct: pct });
        }
      }
      
      const sortedGroups = Array.from(groupMap.values())
        .sort((a, b) => (b.lastPct ?? 0) - (a.lastPct ?? 0));

      container.innerHTML = '';
      chartContainer.innerHTML = '';

      const totalButtons = sortedGroups.length;
      const spacePercent = 4;
      const totalSpace = (totalButtons - 1) * spacePercent;
      const buttonWidth = (100 - totalSpace) / totalButtons;

      sortedGroups.forEach(({ groupId, groupName, lastPct }, index) => {
        const button = document.createElement('button');
        const pctLabel = lastPct != null && !isNaN(lastPct)
          ? ` (${lastPct > 0 ? '+' : ''}${lastPct.toFixed(1)}%)`
          : '';
        button.textContent = `${groupName}${pctLabel}`;
        const color = this.getHeatColor(lastPct);

        button.style.cssText = `
        background-color: ${color};
        width: ${buttonWidth}%;
        display: inline-block;
        margin-left: ${index < totalButtons - 1 ? spacePercent : 0}%;
        border-radius: 10px;
        padding: 10px 20px;
        border: none;
        color: #fff;
        cursor: pointer;
      `;

        button.onclick = async () => {
          chartContainer.innerHTML = '<p>Loading department data...</p>';
          const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');
          chartContainer.innerHTML = '';

          const wrapper = document.createElement('div');
          wrapper.id = `wrapper-${groupSlug}`;
          wrapper.style.marginBottom = '40px';
          wrapper.style.textAlign = 'center';

          const heading = document.createElement('h2');
          heading.textContent = groupName;
          wrapper.appendChild(heading);

          const deptChartDiv = document.createElement('div');
          deptChartDiv.id = `deptchart-${groupSlug}`;

          for (const kind of chartKinds) {
            const chartId = `groupchart-${groupSlug}-${kind}`;
            const chartDiv = document.createElement('div');
            chartDiv.id = chartId;
            chartDiv.classList.add('group-chart');
            chartDiv.style.marginBottom = '30px';
            wrapper.appendChild(chartDiv);
          }

          const layoutWrapper = document.createElement('div');
          layoutWrapper.innerHTML = getDeptGroupHtml(groupSlug);
          deptChartDiv.appendChild(layoutWrapper);
          wrapper.appendChild(deptChartDiv);
          chartContainer.appendChild(wrapper);

          const deptRows = clean.filter(r => parseInt(r.GroupID) === groupId);
          //const seen = new Set<string>();
          // const latestDepts = [...deptRows].reverse().map(row => {
          //   const id = row.DeptID?.toString();
          //   const name = row.DeptName?.trim();
          //   const percent = parseFloat(row.ChargingPct);
          //   if (!id || !name || seen.has(id) || isNaN(percent)) return null;
          //   seen.add(id);
          //   return { id, name, percent };
          // }).filter(Boolean);
          const firstDepts: any[] = [];
          const seen = new Set<string>();
          
          for (const row of deptRows) {
            const id = row.DeptID?.toString();
            const name = row.DeptName?.trim();
            const percent = parseFloat(row.ChargingPct);
            if (!id || !name || seen.has(id) || isNaN(percent)) continue;
          
            seen.add(id);
            firstDepts.push({ id, name, percent });
          }
          
          const deptDynamic = document.getElementById(`dept-dynamic-${groupSlug}`);
          if (!deptDynamic) {
            console.warn(`Missing dynamic container: dept-dynamic-${groupSlug}`);
            return;
          }
          deptDynamic.innerHTML = '';

          const buttonBar = document.createElement('div');
          const chartZone = document.createElement('div');
          deptChartDiv.appendChild(buttonBar);
          deptChartDiv.appendChild(chartZone);

          //latestDepts.forEach((dept: any, i) => {
            firstDepts.forEach((dept: any, i) => {
            const button = document.createElement('button');
            const pctLabel = dept.percent != null && !isNaN(dept.percent)
              ? ` (${dept.percent > 0 ? '+' : ''}${dept.percent.toFixed(1)}%)`
              : '';
            button.textContent = `${dept.name}${pctLabel}`;

            button.title = `${dept.percent}%`;
            button.classList.add('mat-raised-button');
            button.style.cssText = `
            margin: 6px;
            padding: 8px 16px;
            border-radius: 6px;
            background-color: ${this.getHeatColor(dept.percent)};
            color: #fff;
          `;

            button.onclick = () => {
              chartZone.querySelectorAll('[id^="dept-wrapper-"]').forEach(el => el.remove());

              const deptSlug = dept.id.toLowerCase().replace(/\s+/g, '-');
              const deptNameSlug = dept.name;
              const wrapperId = `dept-wrapper-${deptSlug}`;
              const deptWrapper = document.createElement('div');
              deptWrapper.id = wrapperId;
              deptWrapper.innerHTML = getDepartmentLayoutHtml(deptSlug, deptNameSlug);
              chartZone.appendChild(deptWrapper);

              const dynamicArea = deptWrapper.querySelector(`#dept-dynamic-${deptSlug}`);
              if (!dynamicArea) return;
              dynamicArea.innerHTML = '';

              this.renderAllDepartmentCharts(dept, { id: groupId.toString(), name: groupName });


            };

            buttonBar.appendChild(button);
            if (i === 0) button.click();
          });
        };

        container.appendChild(button);
      });
    } catch (err) {
      console.error('[renderDepartmentButtons] ❌ Error rendering buttons:', err);
      container.innerHTML = 'Error loading department buttons.';
    }
  }






  public getHeatColor(change: string | number | null): string {
    let val: number | null = null;

    if (typeof change === 'string') {
      val = parseFloat(change.replace('%', '').trim());
    } else if (typeof change === 'number') {
      val = change;
    }

    if (val === null || isNaN(val)) return '#ccc'; // fallback

    if (val > 20) return '#006400';
    if (val > 10) return '#228B22';
    if (val > 0) return '#90EE90';
    if (val === 0) return '#e0e0e0';
    if (val > -10) return '#f08080';
    if (val > -20) return '#ff8c00';
    return '#8b0000';
  }

  public darkenColor(hex: string, percent: number): string {
    const amt = Math.round(2.55 * percent);
    return hex.replace(/^#/, '').replace(/../g, (c) =>
      ('0' + Math.max(0, parseInt(c, 16) - amt).toString(16)).slice(-2)
    ).padStart(6, '0').replace(/^(.{6})$/, '#$1');
  }



  public async renderAllDepartmentCharts(
    dept: { name: string; id: string },
    group: { name: string; id: string }
  ): Promise<void> {
    const suffix = `-${dept.id}`; // Used for DOM element IDs

    // ✅ Ensure layout exists for the department (by ID)
    await this.ensureDepartmentChartLayoutExists(dept.id, dept.name);

    // ✅ Render main department chart using ID-based API
    await this.renderDepartmentChart(
      { name: dept.name, id: dept.id },
      `chart${suffix}`,
      { name: group.name, id: group.id },
      {
        includeTimeSeries: true,
        timeSeriesElementId: `time${suffix}`,
        includeGaugeOverlay: true,
        gaugeElementId: `gauge${suffix}`,
        incomeCategory: 'totalCharging'
      }
    );

    // ✅ Department-level gauge/summary tables
    this.drawDualArcGaugeOverlay(`arc_chart${suffix}`);
    this.loadYearlyIncomeDataCombinedDept(`tabled_chart${suffix}`, dept.id, group.id, 'totalCharging', 5, 'full');
//    this.loadYearlyIncomeDataCombinedDept(`tabled_chart2${suffix}`, dept.id, group.id, 'totalCharging', 2, 'full');

    // ✅ Income trends (bar + line)
    await this.drawIncomeChartsDept(dept.id, group.id, suffix);

    // ✅ Operational trends (bar + line)
    //await this.drawOperationsChartsDept(dept.id, group.id, suffix);
    const barChartOptions = {grouped: true, groupByYear: true };
    
    await this.drawOperationsChartsDept(dept.id, group.id, suffix, barChartOptions);
    


    // ✅ Year-over-year income comparison for the department (now using IDs)
    await this.drawIncomeDeptsLastMonthChartVDept(group.id, dept.id, `incomedeptslastmonthv${suffix}`);

    // ⚠️ Growth trend (update if you build endpoint that accepts ID)
    this.loadGrowthTrendChartDept(dept.id, group.id, `growth_trend_chart${suffix}`);
  }




  private async ensureDepartmentChartLayoutExists(deptId: string, name: string): Promise<void> {
    const slug = deptId.toLowerCase().replace(/\s+/g, '-');
    const deptNameSlug = name;
    const wrapperId = `dept-wrapper-${slug}`;
    const chartZone = document.getElementById(`deptchart-${slug}`) || document.getElementById('deptchart');

    if (!chartZone) return;

    if (!document.getElementById(wrapperId)) {
      const wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.innerHTML = getDepartmentLayoutHtml(slug, deptNameSlug);
      chartZone.appendChild(wrapper);
    }
  }

  /**
   * Draws income bar and line charts for a specific department.
   *
   * @param deptId - Department ID (string)
   * @param groupId - Group ID (string)
   * @param suffix - Optional element ID suffix (used to build chart container IDs)
   */
  public async drawIncomeChartsDept(
    deptId: string,
    groupId: string,
    barChartOptions: any = {},
    lineChartOptions: any = {}
  ): Promise<void> {
    try {
      // Log the incoming params
      //console.log(`[drawIncomeCharts] DeptID: ${deptId}, GroupID: ${groupId}`);

      // Build the URL dynamically using the environment variable and parameters
      const requestUrl = `${environment.url}/GetChargingIncomeMonthly?groupId=${groupId}&deptId=${deptId}&incomeCategory=totalCharging`;

      // Fetch the raw data from the API
      const rawData = await this.http.get(requestUrl, { responseType: 'text' }).toPromise();
      //console.log('[drawIncomeCharts] Raw API Data:', rawData); // Log the raw data

      // Sanitize and clean the response
      const cleanData = sanitizeSoapResponseDept(rawData);
      //console.log('[drawIncomeCharts] Cleaned Data:', cleanData); // Log sanitized data

      // Process the data (assuming processYearlyData is already implemented)
      const processedData = this.processYearlyDataDept(cleanData);
      //console.log('[drawIncomeCharts] Processed Data:', processedData);

      // Convert Hebrew months to numbers
      const numericMonthData = convertHebrewMonthsToNumbers(processedData);
      this.cachedChartData.income = numericMonthData;
      //console.log('[drawIncomeCharts] Numeric Month Data:', numericMonthData);

      // Filter out the current month data
      const filteredData = filterOutCurrentMonth(numericMonthData);
      //console.log('[drawIncomeCharts] Filtered Data:', filteredData);

      // Check if filteredData is an object with at least one year with data
      if (!filteredData || Object.keys(filteredData).length === 0) {
        //console.warn('[drawIncomeCharts] No valid data to display after filtering');
        return;
      }



      //monthly by years
      // public async drawOperationsCharts(barChartOptions: any = {}, lineChartOptions: any = {}): Promise<void> {
      //   await this.chartsReady;
      //   const rawData = await this.http.get(this.DATA_SOURCES.OPERATIONS, { responseType: 'text' }).toPromise();    
      //   const cleanData = sanitizeSoapResponse(rawData);    
      //   const yearsData = this.processYearlyData(cleanData); 
      //   const processedData = this.processYearlyData(cleanData);
      //   const numericMonthData = convertHebrewMonthsToNumbers(processedData);   
      //   this.cachedChartData.operations = numericMonthData;
      //   const filteredData = filterOutCurrentMonth(numericMonthData);    
      //   const filterLastNData = filterLastN(filteredData ,5);    
      //   this.drawBarChart(filterLastNData, 'bar_chart', barChartOptions);

      // }


      // 📊 Draw Income Bar Chart
      console.log('[drawIncomeCharts] Triggering Bar chart drawing...');
      await this.fetchDataAndDrawDirect(
        filteredData,
        (data: any) => data, // Identity function to return the data as is
        this.CHART_TYPES.BAR,
        `bar_chart2-${deptId}`,
        { ...barChartOptions, grouped: false, groupByYear: false } // For cumulative data
      );

      console.log('[drawIncomeCharts] Bar chart2 drawn successfully');

      await this.fetchDataAndDrawDirectDept(
        filteredData,
        (data: any) => data, // Identity function to return the data as is
        this.CHART_TYPES.BAR,
        `bar_chart-${deptId}`,
        { ...barChartOptions, grouped: false, groupByYear: false } // For cumulative data
      );
      console.log('[drawIncomeCharts] Bar chart1 drawn successfully');


      // 📈 Draw Income Line Chart
      // console.log('[drawIncomeCharts] Triggering Line chart drawing...');
      // await this.fetchDataAndDrawDirect(
      //   filteredData,
      //   (data: any) => data, // Identity function to return the data as is
      //   this.CHART_TYPES.LINE,
      //   `bar_chart-${deptId}`,
      //   lineChartOptions
      // );

      console.log('[drawIncomeCharts] Line chart drawn successfully');
    } catch (err) {
      console.error('[drawIncomeCharts] Error occurred:', err);
    }
  }




  private processYearlyDataDept(data: any): any {
    const rawData = data.data;
    //console.log('[processYearlyData] Raw Data:', rawData); // Log raw data to inspect its structure

    const yearMonthMap: any = {};

    // Start processing from index 1 to skip the header row
    for (let i = 1; i < rawData.length; i++) {
      const entry = rawData[i];  // Get each row (excluding header)
      //console.log('[processYearlyData] Entry:', entry);  // Log each entry to inspect its values

      const [month, charging, quantity] = entry;  // Destructure the entry into month, charging, and quantity

      // Ensure the month and charging are valid before processing
      if (month && charging !== undefined && quantity !== undefined) {
        const [year, monthNumber] = month.split('-');  // Split the month string (e.g., '2022-01')
        if (!yearMonthMap[year]) {
          yearMonthMap[year] = {};
        }

        // Store the charging value for this year-month combination
        yearMonthMap[year][monthNumber] = charging;
      } else {
        console.warn(`[processYearlyData] Invalid entry at index ${i}:`, entry);  // Log invalid entries
      }
    }

    //console.log('[processYearlyData] Year-Month Map:', yearMonthMap);  // Log the processed map

    // Convert to YearlyData-like format
    const transformedData = Object.keys(yearMonthMap).map(year => ({
      Year: {
        value: parseInt(year, 10),
        Months: Object.entries(yearMonthMap[year]).map(([month, val]) => ({
          name: month,
          y: val
        }))
      }
    }));

    //console.log('[processYearlyData] Transformed Data:', transformedData);  // Log transformed data

    // Filter recent offsets and sanitize data
    const limitedData = filterRecentOffsets<any>(transformedData, y => y.Year.value, 4);
    //console.log('[processYearlyData] Limited Data (Filtered):', limitedData);

    const years: any = {};
    limitedData.forEach((yearObject: any) => {
      const yearValue = yearObject.Year.value;
      years[yearValue] = {};
      yearObject.Year.Months.forEach((month: any) => {
        if (this.valueExists(month.y)) {
          const monthNumber = parseInt(month.name, 10);
          years[yearValue][monthNumber] = parseInt(month.y, 10);
        }
      });
    });

    //console.log('[processYearlyData] Years Data:', years);  // Log final years data
    return sanitizeAndFilterYearMonthData(years);
  }



  /**
   * Draws a bar chart comparing current year vs. previous year income for a department.
   * Uses department and group IDs to fetch data from GetChargingIncome API.
   * 
   * @param groupId Group ID (string)
   * @param deptId Department ID (string)
   * @param elementId Target DOM element ID to render the chart
   */
  public async drawIncomeDeptsLastMonthChartVDept(
    groupId: string,
    deptId: string,
    elementId: string
  ): Promise<void> {
    await this.chartsReady;

    try {
      const raw = await this.callApi('GetChargingIncome', {
        groupId,
        deptId,
        incomeCategory: 'totalCharging'
      }, true).toPromise();

      const data = Array.isArray(raw) ? raw : [];
      const container = document.getElementById(elementId);

      if (!data.length || !container) {
        if (container) container.innerHTML = 'אין מספיק נתונים להצגה';
        return;
      }

      const grouped = new Map<string, Record<string, number>>();
      const allYears = new Set<string>();

      data.forEach(item => {
        const dept = item.DeptName || item.deptName || '';
        const year = item.Year;
        const val = item.TotalCharging ?? 0;

        if (!grouped.has(dept)) grouped.set(dept, {});
        grouped.get(dept)![year] = val;
        allYears.add(year);
      });

      const sortedYears = Array.from(allYears).sort();
      if (sortedYears.length < 2) {
        container.innerHTML = 'אין מספיק שנים להשוואה';
        return;
      }

      const [prevYear, currYear] = sortedYears.slice(-2);

      const formatShort = (num: number): string =>
        num >= 1_000_000 ? (num / 1_000_000).toFixed(1) + 'M' :
          num >= 1_000 ? (num / 1_000).toFixed(0) + 'K' : num.toString();

      const rows = Array.from(grouped.entries()).map(([deptName, yearMap]) => {
        const prev = yearMap[prevYear] || 0;
        const curr = yearMap[currYear] || 0;
        return [deptName, prev, formatShort(prev), curr, formatShort(curr), curr]; // extra value for sorting
      }).sort((a, b) => (b[5] as number) - (a[5] as number));

      const chartData = google.visualization.arrayToDataTable([
        ['קבוצה', prevYear, { role: 'annotation' }, currYear, { role: 'annotation' }],
        ...rows.map(r => r.slice(0, 5)) // remove raw curr before passing to chart
      ]);

      const options = {
        title: 'הכנסות לפי קבוצות - שנה מול שנה קודמת',
        chartArea: { width: '70%', height: '80%' },
        legend: { position: 'top' },
        bar: { groupWidth: '75%' },
        annotations: { alwaysOutside: true, textStyle: { fontSize: 12, color: '#444' } },
        vAxis: { format: 'short', minValue: 0 },
        hAxis: { slantedText: true, slantedTextAngle: 45 },
        colors: ['#6ba1f8', '#5ed175']
      };

      const chart = new google.visualization.ColumnChart(container);
      chart.draw(chartData, options);

    } catch (err) {
      console.error('❌ Failed to draw income chart:', err);
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = 'שגיאה בטעינת הנתונים';
    }
  }





  /**
   * Draws operational bar chart for a specific department.
   * Fetches and processes operational data, and renders a Google BarChart.
   * 
   * @param deptId - Department ID (string) – used for API filtering
   * @param groupId - Group ID (string) – optional group filter
   * @param elementIdSuffix - Element ID suffix for chart container (e.g. '-543')
   * @param barChartOptions - Optional chart styling and config options
   */
  public async drawOperationsChartsDept(
    deptId: string,
    groupId: string,
    elementIdSuffix: string = '',
    barChartOptions: any = {}
  ): Promise<void> {
    await this.chartsReady;
  
    try {
      // Fetch raw data from API
      const raw = await this.callApi('GetChargingIncomeMonthly', {
        deptId,
        groupId,
        incomeCategory: 'totalCharging'
      }, true).toPromise();
      
      // Debug log to inspect the raw data
      //console.log('Raw data received:', JSON.stringify(raw, null, 2));
  
      // Ensure raw data is an array and parse it
      const parsed = Array.isArray(raw) ? raw : [];
      if (!parsed.length) {
        const el = document.getElementById(`bar_chart-${elementIdSuffix}`);
        if (el) el.innerHTML = 'No data available.';
        return;
      }
  
      // Debug log to inspect the parsed data
      //console.log('Parsed data:', JSON.stringify(parsed, null, 2));
  
      // Convert Hebrew months to numeric values
      const numericMonthData = convertHebrewMonthsToNumbers(parsed);
      if (!Array.isArray(numericMonthData)) {
        throw new Error('Converted month data is not an array');
      }
  
      // Filter out current month data
      const filteredData = filterOutCurrentMonth(numericMonthData) || [];
      const filteredLastN = filterLastN(filteredData, 5) || [];
  
      // Prepare the chart element ID
      const elementId = `bar_chart-${elementIdSuffix}`;
  
      // Log the data being sent to the chart
      //console.log('Filtered Data:', JSON.stringify(filteredData, null, 2));
      //console.log('Filtered Last N:', JSON.stringify(filteredLastN, null, 2));
      //console.log('Chart options:', JSON.stringify(barChartOptions, null, 2));
  
      // Draw the bar chart with the filtered data and options
      this.drawBarChart(filteredLastN, elementId, barChartOptions);
  
    } catch (err) {
      // Handle errors gracefully and log them
      //console.error('Error in drawOperationsChartsDept:', err);
      const el = document.getElementById(`bar_chart-${elementIdSuffix}`);
      if (el) el.innerHTML = 'Error loading data.';
    }
  }
  

  private async fetchDataAndDrawDirectDept(
    cleanData: any,
    dataProcessor: Function,
    chartType: string,
    elementId: string,
    chartOptions: any = {}
  ): Promise<void> {
    try {
      if (!cleanData || (Array.isArray(cleanData) && cleanData.length === 0)) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = 'No data available to draw chart.';
        return;
      }

      // Gauge chart uses separate render logic
      if (chartType === this.CHART_TYPES.GAUGE) {
        this.drawChartGauge(cleanData, elementId, chartOptions);
        return;
      }

      // Apply user-defined processing
      const processed = dataProcessor.call(this, cleanData);

      let chartData = processed;

      // If applicable, enhance with annotations
      if (chartOptions.shortFormatAnnotations) {
        if (
          typeof processed.getNumberOfColumns === 'function' &&
          typeof processed.getValue === 'function'
        ) {
          chartData = addShortFormatAnnotations(processed);
        }
      }

      // Execute chart draw
      await this.drawChartDept(chartData, chartType, elementId, chartOptions);

    } catch (error) {
      console.error(`[fetchDataAndDrawDirect] ❌ Chart render failed for: #${elementId}`, error);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'שגיאה בטעינת התרשים.';
      }
    }
  }



  private async drawChartDept(
    data: any,
    chartType: string,
    elementId: string,
    chartOptions: any = {}
  ): Promise<void> {
    if (!data) {
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'שגיאה בעיבוד הנתונים.';  // Error in processing data
      }
      console.warn(`[drawChartDept] No data available for chart in element: ${elementId}`);
      return;
    }

    // Debug: Log the data and chart type
    
    //console.log(`[drawChartDept] Drawing chart with type: ${chartType} in element: ${elementId}`);
    //console.log(`[drawChartDept] Data to be drawn:`, data);
    //console.log(`[drawChartDept] Chart options:`, chartOptions);

    const chartDrawers: Record<string, Function> = {
      [this.CHART_TYPES.BAR]: this.drawBarChart.bind(this),
      [this.CHART_TYPES.LINE]: this.drawLineChart.bind(this),
      [this.CHART_TYPES.THREE_YEAR]: this.drawChart3Y.bind(this),
      [this.CHART_TYPES.OPTHREE_YEAR]: this.drawOpChart3Y.bind(this),
      [this.CHART_TYPES.GAUGE]: this.drawChartGauge.bind(this)
    };

    const drawer = chartDrawers[chartType];
    if (!drawer) {
      console.warn(`[drawChartDept] Unsupported chart type: ${chartType}`);
      const el = document.getElementById(elementId);
      if (el) {
        el.innerHTML = 'תרשים לא נתמך.';  // Unsupported chart type message
      }
      return;
    }

    // Create and return the promise
    return new Promise<void>(resolve => {
      try {
        // Debug: Log the decision-making process for chart drawing
        console.log(`[drawChartDept] Starting to draw chart of type: ${chartType} for element: ${elementId}`);

        // Use chart-specific options
        if (chartType === this.CHART_TYPES.BAR) {
          const grouped = chartOptions.grouped !== false; // default is true
          console.log(`[drawChartDept] Bar chart grouped: ${grouped}`);
          drawer(data, elementId, chartOptions, grouped);
        } else {
          drawer(data, elementId, chartOptions);
        }

        // Debug: Indicate chart drawing is complete
        console.log(`[drawChartDept] Chart of type ${chartType} successfully drawn in ${elementId}`);
        resolve();
      } catch (error) {
        console.error(`[drawChartDept] Failed to render chart (${chartType}) in #${elementId}:`, error);

        // Display error message in the element
        const el = document.getElementById(elementId);
        if (el) {
          el.innerHTML = 'שגיאה בעת ציור התרשים.';  // Error in drawing chart
        }

        // Resolve the promise to prevent hanging
        resolve();
      }
    });
  }




  /** 📈 Monthly revenue growth trend (line) per department */
  /**
   * Draws a line chart showing the growth trend of a department's income over time.
   *
   * @param deptId - Department ID (string)
   * @param groupId - Group ID (string)
   * @param containerId - DOM element ID to render chart into (default: 'growth_trend_chart')
   */
  
  public loadGrowthTrendChartDept(
    deptId: string,
    groupId: string,
    containerId?: string
  ): void {
    const finalContainerId = containerId || `growth_trend_chart-${deptId}`;
  
    this.callApi('GetChargingIncomeMonthly', {
      deptId,
      groupId,
      incomeCategory: 'totalCharging'
    }, true).subscribe(raw => {
      const parsed = sanitizeSoapResponseDept(raw)?.data || [];
  
      if (!Array.isArray(parsed) || parsed.length <= 1) {
        this.showNoDataMessage(finalContainerId);
        return;
      }
  
      const rows = parsed.slice(1); // remove header
      const allYears = new Set<string>();
      const chartMap: { [monthYear: string]: { [year: string]: number } } = {};
  
      rows.forEach(([monthStr, charging]) => {
        const [year, month] = monthStr.split('-');
        const label = `${month}-${year}`; // e.g., 01-2022
        if (!chartMap[label]) chartMap[label] = {};
        chartMap[label][year] = Number(charging) || 0;
        allYears.add(year);
      });
  
      const sortedYears = Array.from(allYears).sort();
      const chartData: any[][] = [];
      chartData.push(['חודש', ...sortedYears]);
  
      const sortedLabels = Object.keys(chartMap).sort((a, b) => {
        const [ma, ya] = a.split('-');
        const [mb, yb] = b.split('-');
        return new Date(`${ya}-${ma}-01`).getTime() - new Date(`${yb}-${mb}-01`).getTime();
      });
  
      sortedLabels.forEach(label => {
        const row: any[] = [label];
        sortedYears.forEach(year => {
          row.push(chartMap[label]?.[year] ?? null);
        });
        chartData.push(row);
      });
  
      const dataTable = google.visualization.arrayToDataTable(chartData);
  
      google.charts.setOnLoadCallback(() => {
        const container = document.getElementById(finalContainerId);
        if (!container) {
          console.warn(`⚠️ Container #${finalContainerId} not found`);
          return;
        }
      
        const chartData: any[][] = [
          ['חודש', 'סה״כ חיובים', { role: 'annotation' }]
        ];
      
        const formatNumberShort = (n: number): string => {
          if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
          if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
          return n.toString();
        };
      
        const rows = parsed.slice(1); // assume first row is headers
        rows.forEach(([monthStr, charging]) => {
          const value = Number(charging) || 0;
          chartData.push([
            monthStr,              // e.g., '01-2022'
            value,
            formatNumberShort(value)
          ]);
        });
      
        const dataTable = google.visualization.arrayToDataTable(chartData);
      
        const chart = new google.visualization.LineChart(container);
        chart.draw(dataTable, {
          legend: { position: 'none' },
          height: 500,
          chartArea: { width: '90%', height: '70%' },
          vAxis: {
            format: 'short',
            title: 'סה״כ חיובים'
          },
          hAxis: {
            slantedText: true,
            slantedTextAngle: 45,
            title: 'חודש'
          },
          colors: ['#6ba1f8'],
          pointSize: 5,
          lineWidth: 2,
          interpolateNulls: false,
          annotations: {
            alwaysOutside: true,
            textStyle: {
              fontSize: 11,
              color: '#000'
            }
          },
          trendlines: {
            0: {
              type: 'linear',
              color: '#999',
              lineWidth: 2,
              opacity: 0.5,
              visibleInLegend: true
            }
          }
        });

      });
      
      
    });
  }
  

  public loadYearlyIncomeDataCombinedDept(
    containerId: string,
    deptId: string,
    groupId: string,
    incomeCategory: string = 'totalCharging',
    yearsToShow?: number,
    tableMode: 'full' | 'matrix' = 'full'
  ): void {
    const container = document.querySelector(`#${containerId}`);
    if (!container) return;
  
    const params = {
      deptId,
      groupId,
      incomeCategory
    };
  
    this.callApi('GetChargingIncome', params, true).subscribe(
      (response: any[]) => {
        if (!Array.isArray(response) || response.length === 0) {
          container.innerHTML = '<p>No data available.</p>';
          return;
        }
  
        response.sort((a, b) => b.Year.localeCompare(a.Year));
        const data = yearsToShow ? response.slice(0, yearsToShow) : response;
  
        // Apply column renaming
        const headerMap: { [key: string]: string } = {
          ChargingPct: 'גידול (%)',
          ChargingDiff: 'גידול',
          Change: 'גידול',
          ChangePercent: 'גידול (%)',
          ...this.yearlyIncomeTableHeaders
        };
  
        let html = '<table class="table table-bordered table-striped">';
  
        if (tableMode === 'full') {
          const preferredOrder = ['Year', 'TotalCharging', 'Change', 'ChangePercent'];
  
          const allKeys = new Set<string>();
          data.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
  
          // Remove unwanted keys
          const ignored = new Set(['GroupName', 'GroupId', 'DeptName', 'DeptId', 'GroupID', 'DeptID']);
          const columns = Array.from(allKeys)
            .filter(key => !ignored.has(key))
            .sort((a, b) => {
              const ia = preferredOrder.indexOf(a);
              const ib = preferredOrder.indexOf(b);
              if (ia === -1 && ib === -1) return a.localeCompare(b);
              if (ia === -1) return 1;
              if (ib === -1) return -1;
              return ia - ib;
            });
  
          html += '<thead><tr>';
          columns.forEach(col => {
            html += `<th>${headerMap[col] || col}</th>`;
          });
          html += '</tr></thead><tbody style="direction:ltr;">';
  
          data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
              let value = row[col];
              if (col === 'TotalCharging' && value != null) {
                value = formatNumberShort(value);
              } else if ((col === 'Change' || col === 'ChargingDiff') && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + formatNumberShort(Math.abs(value));
              } else if ((col === 'ChangePercent' || col === 'ChargingPct') && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + Math.abs(value).toFixed(1) + '%';
              }
              html += `<td>${value != null ? value : ''}</td>`;
            });
            html += '</tr>';
          });
  
          html += '</tbody>';
        } else {
          const metrics = ['TotalCharging', 'Change', 'ChangePercent'];
  
          html += '<thead><tr><th>Year</th>';
          metrics.forEach(metric => {
            html += `<th>${headerMap[metric] || metric}</th>`;
          });
          html += '</tr></thead><tbody>';
  
          data.forEach(year => {
            html += `<tr><td>${year.Year}</td>`;
            metrics.forEach(metric => {
              let value = year[metric];
              if (metric === 'TotalCharging' && value != null) {
                value = formatNumberShort(value);
              } else if (metric === 'Change' && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + formatNumberShort(Math.abs(value));
              } else if (metric === 'ChangePercent' && value != null && !isNaN(value)) {
                const sign = value > 0 ? '+' : value < 0 ? '-' : '';
                value = sign + Math.abs(value).toFixed(1) + '%';
              }
              html += `<td>${value != null ? value : ''}</td>`;
            });
            html += '</tr>';
          });
  
          html += '</tbody>';
        }
  
        html += '</table>';
        container.innerHTML = html;
      },
      () => {
        container.innerHTML = '<p class="text-danger">Failed to load data.</p>';
      }
    );
  }
  




  private showNoDataMessage(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<div style="color: gray; text-align: center;">No data available</div>';
    }
  }


  public removeAllDepartmentWrappers(): void {
    const idPrefixes = ['dept-wrapper-', 'wrapper-', 'deptchart-'];

    idPrefixes.forEach(prefix => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(`[id^="${prefix}"]`));
      elements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });
  }


}



