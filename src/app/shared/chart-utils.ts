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
