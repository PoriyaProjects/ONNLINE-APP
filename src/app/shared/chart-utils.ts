import { limitToRecentYears } from "./limit-utils";
import { formatNumberShort } from "./number-utils";

export function addShortFormatAnnotations(
  dataTable: google.visualization.DataTable
): google.visualization.DataView {
  const view = new google.visualization.DataView(dataTable);
  const columns: any[] = [];
  const numCols = dataTable.getNumberOfColumns();

  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    columns.push(colIndex);

    const colType = dataTable.getColumnType(colIndex);
    if (colIndex > 0 && colType === 'number') {
      columns.push({
        calc: (dt: any, row: number) => {
          const val = dt.getValue(row, colIndex);
          const num = typeof val === 'number' ? val : parseFloat(val);
          return isNaN(num) ? null : formatNumberShort(num);
        },
        type: 'string',
        role: 'annotation'
      });
    }
  }

  view.setColumns(columns);
  return view;
}



export interface YearObject {
  Year: {
    value: number;
    Months: { name: string; y: string | number }[];
  };
}

/**
 * Filters out years with no valid monthly values and optionally limits to N most recent years.
 * @param jsonData Original JSON with yData array
 * @param limitYears Optional number of most recent years to keep (default = no limit)
 * @returns Filtered JSON with only valid and optionally recent years
 */
export function filterValidYears(
  jsonData: any,
  limitYears?: number
): { yData: YearObject[] } {
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