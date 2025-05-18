import { YearObject } from './chart-utils';
import { limitToRecentYears } from './limit-utils';
import { sanitizeSoapResponse } from './sanitizesoapresponce';
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


/**
 * Returns the current month data from an array of months.
 * Tries by monthNumber, then by name, then falls back to the last item.
 * @param months Array of month objects, each with optional 'monthNumber' (1-12) or 'name' (e.g., 'January')
 * @returns The matched month object or null if not found
 */
// export function getCurrentMonthData(months: any[]): any | null {
//   if (!Array.isArray(months) || months.length === 0) {
//       console.error('[getCurrentMonthData] Invalid or empty months array.');
//       return null;
//   }

//   const currentMonthNumber = new Date().getMonth() + 1;

//   // First attempt by monthNumber property
//   const byNumber = months.find(m => m.monthNumber === currentMonthNumber);
//   if (byNumber) {
//       console.log('[getCurrentMonthData] Found by monthNumber:', byNumber);
//       return byNumber;
//   }

//   // Then attempt by name
//   const monthNames = [
//       'January', 'February', 'March', 'April', 'May', 'June',
//       'July', 'August', 'September', 'October', 'November', 'December'
//   ];
//   const currentMonthName = monthNames[currentMonthNumber - 1];
//   const byName = months.find(m => (m.name?.toLowerCase?.() ?? '') === currentMonthName.toLowerCase());
//   if (byName) {
//       console.log('[getCurrentMonthData] Found by name:', byName);
//       return byName;
//   }

//   // Fallback to last element if nothing matches
//   console.warn('[getCurrentMonthData] No exact match found, falling back to last item:', months[months.length - 1]);
//   return months[months.length - 1];
// }

export function getCurrentMonthData(months: any[]): any | null {
  if (!Array.isArray(months) || months.length === 0) {
      console.error('[getCurrentMonthData] Invalid or empty months array.');
      return null;
  }

  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = January
  const currentYear = now.getFullYear();

  const hebrewMonthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  const currentHebrewMonthName = hebrewMonthNames[currentMonth];

  console.log('[getCurrentMonthData] Searching for Hebrew month name:', currentHebrewMonthName);

  // 1. חיפוש לפי שם החודש בעברית
  const byHebrewName = months.find(m => (m.name ?? '').includes(currentHebrewMonthName));
  if (byHebrewName) {
      console.log('[getCurrentMonthData] Found by Hebrew month name:', byHebrewName);
      return byHebrewName;
  }

  // 2. Fallback - חיפוש לפי date (במדויק לחודש ושנה הנוכחיים בלבד)
  const byExactDate = months.find(m => {
      const dateStr = m.periodStartDate || m.date;
      if (!dateStr) return false;

      const monthDate = new Date(dateStr);
      return monthDate.getMonth() === currentMonth && monthDate.getFullYear() === currentYear;
  });

  if (byExactDate) {
      console.log('[getCurrentMonthData] Found by exact calendar date (month/year match):', byExactDate);
      return byExactDate;
  }

  console.warn('[getCurrentMonthData] No match found for current month and year. Returning null.');
  return null;
}


// export interface WorkingDaysInfo {
//   workingDays: Date[];
//   currentWorkingDayIndex: number | null;
//   totalWorkingDays: number;
// }

// export async function getWorkingDaysInfo(apiUrlBase: string): Promise<WorkingDaysInfo> {
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth() + 1; // 1-based

//   const apiUrl = `${apiUrlBase}?year=${year}&month=${month}`;

//   try {
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch working days data: ${response.statusText}`);
//     }

//     //const data: { Month: number; WorkingDays: number } = await response.json();
//     const rawText = await response.text();
//     const cleanData: { Month: number; WorkingDays: number } = sanitizeSoapResponse(rawText);
//     return {
//       workingDays: [],
//       currentWorkingDayIndex: null,
//       totalWorkingDays: cleanData?.WorkingDays ?? 0
//     };
//   } catch (error) {
//     console.error('Error fetching working days info:', error);

//     return {
//       workingDays: [],
//       currentWorkingDayIndex: null,
//       totalWorkingDays: 0
//     };
//   }
// }

/**
 * מחשב רשימת ימי עבודה עבור חודש ושנה, מתחשב בשישי-שבת.
 */
// function generateWorkingDaysForMonth(year: number, month: number): Date[] {
//   const workingDays: Date[] = [];
//   const date = new Date(year, month, 1);

//   while (date.getMonth() === month) {
//     const dayOfWeek = date.getDay();
//     if (dayOfWeek !== 5 && dayOfWeek !== 6) {
//       // לא שישי (5) ולא שבת (6)
//       workingDays.push(new Date(date));
//     }
//     date.setDate(date.getDate() + 1);
//   }

//   return workingDays;
// }

/**
 * מחשב currentWorkingDayIndex לפי היום הנוכחי ורשימת ימי עבודה.
 */
// function calculateCurrentWorkingDayIndex(workingDays: Date[]): number | null {
//   const today = new Date();
//   const index = workingDays.findIndex(d =>
//     d.getFullYear() === today.getFullYear() &&
//     d.getMonth() === today.getMonth() &&
//     d.getDate() === today.getDate()
//   );
//   return index !== -1 ? index : null;
// }




export interface WorkingDaysInfo {
  workingDays: Date[];
  currentWorkingDayIndex: number | null;
  totalWorkingDays: number;
}

// export async function getWorkingDaysInfo(apiUrlBase: string): Promise<WorkingDaysInfo> {
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth() + 1; // 1-based

//   const apiUrl = `${apiUrlBase}?year=${year}&month=${month}`;

//   try {
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch working days data: ${response.statusText}`);
//     }

//     const rawText = await response.text();
//     // נניח שה-API מחזיר גם רשימה של תאריכים בפורמט ISO (תקן לכך את הפונקציה שלך לפי המבנה האמיתי של ה-API)
//     const cleanData = sanitizeSoapResponse(rawText) as { WorkingDaysList: string[]; WorkingDays: number };

//     const workingDays = (cleanData?.WorkingDaysList ?? []).map(dateStr => new Date(dateStr));

//     const currentDayIndex = workingDays.findIndex(date =>
//       date.getFullYear() === today.getFullYear() &&
//       date.getMonth() === today.getMonth() &&
//       date.getDate() === today.getDate()
//     );

//     return {
//       workingDays,
//       currentWorkingDayIndex: currentDayIndex !== -1 ? currentDayIndex : null,
//       totalWorkingDays: workingDays.length
//     };
//   } catch (error) {
//     console.error('Error fetching working days info:', error);

//     return {
//       workingDays: [],
//       currentWorkingDayIndex: null,
//       totalWorkingDays: 0
//     };
//   }
// }

export async function getWorkingDaysInfo(apiUrlBase: string): Promise<WorkingDaysInfo> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-based

  const apiUrl = `${apiUrlBase}?year=${year}&month=${month}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch working days data: ${response.statusText}`);
    }

    const rawText = await response.text();
    const cleanData = sanitizeSoapResponse(rawText) as { Month: number; WorkingDays: number };

    // מחולל ימי עבודה רק לפי שישי/שבת (ללא חגים)
    const workingDays = generateWorkingDaysForMonth(today.getFullYear(), cleanData.Month - 1);

    // חותך רק את ה-WorkingDays הראשונים (לפי המספר שה-API סיפק, כולל חגים)
    const adjustedWorkingDays = workingDays.slice(0, cleanData.WorkingDays);

    const currentDayIndex = calculateCurrentWorkingDayIndex(adjustedWorkingDays);

    return {
      workingDays: adjustedWorkingDays,
      currentWorkingDayIndex: currentDayIndex,
      totalWorkingDays: adjustedWorkingDays.length
    };
  } catch (error) {
    console.error('Error fetching working days info:', error);

    return {
      workingDays: [],
      currentWorkingDayIndex: null,
      totalWorkingDays: 0
    };
  }
}

/**
 * ימי עבודה רק לפי שישי-שבת.
 */
function generateWorkingDaysForMonth(year: number, month: number): Date[] {
  const workingDays: Date[] = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return workingDays;
}

/**
 * מחשב את ה-index של היום הנוכחי ברשימת ימי עבודה.
 */
function calculateCurrentWorkingDayIndex(workingDays: Date[]): number | null {
  const today = new Date();
  const index = workingDays.findIndex(d =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
  return index !== -1 ? index : null;
}



/**
 * Converts any object with Hebrew month keys to numeric month keys ("1" to "12").
 * Supports deeply nested structures as well.
 */
export function convertHebrewMonthsToNumbers(input: any): any {
  const monthMap: { [key: string]: string } = {
    'ינואר': '1',
    'פברואר': '2',
    'מרץ': '3',
    'אפריל': '4',
    'מאי': '5',
    'יוני': '6',
    'יולי': '7',
    'אוגוסט': '8',
    'ספטמבר': '9',
    'אוקטובר': '10',
    'נובמבר': '11',
    'דצמבר': '12'
  };

  if (Array.isArray(input)) {
    return input.map(item => convertHebrewMonthsToNumbers(item));
  } else if (typeof input === 'object' && input !== null) {
    const output: any = {};
    Object.keys(input).forEach(key => {
      const newKey = monthMap[key] || key;
      output[newKey] = convertHebrewMonthsToNumbers(input[key]);
    });
    return output;
  } else {
    return input;
  }
}



/**
 * Removes current month data from a Year-Month structured dataset.
 */
export function filterOutCurrentMonth(data: any): any {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  const filteredData: any = {};

  Object.keys(data).forEach(year => {
    const yearNumber = parseInt(year, 10);
    const months = data[year];

    const filteredMonths = Object.keys(months).reduce((acc: any, month) => {
      const monthNumber = parseInt(month, 10);
      if (!(yearNumber === currentYear && monthNumber === currentMonth)) {
        acc[month] = months[month];
      }
      return acc;
    }, {});

    if (Object.keys(filteredMonths).length > 0) {
      filteredData[year] = filteredMonths;
    }
  });

  return filteredData;
}
