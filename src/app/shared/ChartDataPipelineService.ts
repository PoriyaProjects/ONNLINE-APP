import { Injectable } from '@angular/core';
import { sanitizeSoapResponse } from './sanitizesoapresponce';
import { convertHebrewMonthsToNumbers } from './date-utils';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class ChartDataPipelineService {

  /**
   * Automatically detects data type and returns a clean, filtered Google DataTable.
   */
  public sanitizeAnyToCleanDataTable(rawDataOrTable: any): any {
    if (this.isGoogleDataTable(rawDataOrTable)) {
      return this.sanitizeDataTableAndRemoveLastMonth(rawDataOrTable);
    }

    return this.sanitizeAndFilterYearMonthData(rawDataOrTable);
  }

  /**
   * Full pipeline: raw SOAP/XML/JSON -> cleaned -> filtered -> Google DataTable.
   */
  public sanitizeAndFilterYearMonthData(rawData: any): any {
    try {
      const sanitized = sanitizeSoapResponse(rawData);
      const parsed = typeof sanitized === 'string' ? JSON.parse(sanitized) : sanitized;
  
      if (!parsed || !parsed.yData) {
        console.warn('[ChartDataPipeline] Missing yData:', parsed);
        return this.createEmptyDataTable();
      }
  
      const converted = convertHebrewMonthsToNumbers(parsed);
      const filtered = this.filterOutCurrentAndFutureMonths(converted);
  
      // If after filtering, data is empty, still return an empty DataTable
      if (Object.keys(filtered).length === 0) {
        console.warn('[ChartDataPipeline] All months filtered out. Returning empty DataTable.');
        return this.createEmptyDataTable();
      }
  
      return this.convertYearMonthObjectToDataTable(filtered);
    } catch (error) {
      console.error('[ChartDataPipeline] Failed to sanitize, parse, or filter data:', rawData, error);
      return this.createEmptyDataTable();
    }
  }
  
  private createEmptyDataTable(): any {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');
    return dataTable;
  }
  

  /**
   * Strictly filters out current and future months from object data.
   */
  public filterOutCurrentAndFutureMonths(data: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const result: Record<string, Record<string, number>> = {};

    Object.keys(data).forEach(yearStr => {
      const year = parseInt(yearStr, 10);
      const months = data[yearStr];

      const filteredMonths: Record<string, number> = {};
      Object.keys(months).forEach(monthStr => {
        const month = parseInt(monthStr, 10);

        if (
          (year === currentYear && month >= currentMonth) ||
          (year > currentYear)
        ) {
          // Skip
        } else {
          filteredMonths[monthStr] = months[monthStr];
        }
      });

      if (Object.keys(filteredMonths).length > 0) {
        result[yearStr] = filteredMonths;
      }
    });

    return result;
  }

  /**
   * Converts {year: {monthNumber: value}} object to Google DataTable.
   */
  public convertYearMonthObjectToDataTable(data: Record<string, Record<string, number>>): any {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Month');

    const years = Object.keys(data);
    years.forEach(year => {
      dataTable.addColumn('number', year);
      dataTable.addColumn({ type: 'string', role: 'annotation' });
    });

    const months = Array.from(
      new Set(years.reduce((acc, year) => acc.concat(Object.keys(data[year])), [] as string[]))
    ).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    months.forEach(month => {
      const row: any[] = [month];
      years.forEach(year => {
        const val = data[year][month] ?? null;
        row.push(val);
        row.push(val != null ? val.toString() : null);
      });
      dataTable.addRow(row);
    });

    return dataTable;
  }

  /**
   * Cleans an existing Google DataTable by converting Hebrew months and removing last row.
   */
  public sanitizeDataTableAndRemoveLastMonth(dataTable: any): any {
    if (!this.isGoogleDataTable(dataTable)) {
      console.error('[ChartDataPipeline] Invalid DataTable:', dataTable);
      return dataTable;
    }

    const monthMap: { [key: string]: string } = {
      'ינואר': '1', 'פברואר': '2', 'מרץ': '3', 'אפריל': '4',
      'מאי': '5', 'יוני': '6', 'יולי': '7', 'אוגוסט': '8',
      'ספטמבר': '9', 'אוקטובר': '10', 'נובמבר': '11', 'דצמבר': '12'
    };

    for (let i = 0; i < dataTable.getNumberOfRows(); i++) {
      const cat = dataTable.getValue(i, 0);
      if (monthMap[cat]) {
        dataTable.setValue(i, 0, monthMap[cat]);
      }
    }

    if (dataTable.getNumberOfRows() > 0) {
      dataTable.removeRow(dataTable.getNumberOfRows() - 1);
    }

    return dataTable;
  }

  /**
   * Validates if object is a Google DataTable.
   */
  private isGoogleDataTable(obj: any): boolean {
    return obj && typeof obj.getNumberOfRows === 'function' && typeof obj.getNumberOfColumns === 'function';
  }

}
