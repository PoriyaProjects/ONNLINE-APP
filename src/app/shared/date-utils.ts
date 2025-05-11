import { YearObject } from './chart-utils';
import { limitToRecentYears } from './limit-utils';
/**
 * Filters either a string array of offsets or an array of objects containing offset values.
 * Keeps only the most recent N offsets from "0" to "-(maxOffsets - 1)".
 *
 * @param input Array of strings or objects
 * @param maxOffsets Number of most recent offsets to keep (default = 4)
 * @param offsetKey (Only for object array) Name of the property holding the offset string
 * @returns Filtered array
 */
export interface YearlyData {
  Year: {
    value: number;
    Months: any[]; // or a more specific type
  };
}
/**
 * Filters out years with no valid monthly values and optionally limits to N most recent years.
 * @param jsonData Original JSON with yData array
 * @param limitYears Optional number of most recent years to keep (default = no limit)
 * @returns Filtered JSON with only valid and optionally recent years
 */
export function filterValidYears(jsonData: any, limitYears?: number): { yData: YearObject[] } {
  if (!jsonData || !Array.isArray(jsonData.yData)) return { yData: [] };

  const validYears = jsonData.yData.filter((yearObject: any) => {
    const months = yearObject?.Year?.Months || [];
    return months.some((m: any) => {
      const y = parseFloat(m?.y);
      return !isNaN(y) && y > 0;
    });
  }) as YearObject[];

  const limited = limitYears
    ? limitToRecentYears<YearObject>(validYears, y => y.Year.value, limitYears)
    : validYears;

  return { yData: limited };
}

export { limitToRecentYears };

// src/app/shared/date-utils.ts

export function filterRecentOffsets<T>(
  data: T[],
  getYear: (item: T) => number,
  limitYears: number
): T[] {
  if (!Array.isArray(data)) return [];

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - (limitYears - 1);

  return data.filter(item => {
    const year = getYear(item);
    return typeof year === 'number' && year >= minYear && year <= currentYear;
  });
}
