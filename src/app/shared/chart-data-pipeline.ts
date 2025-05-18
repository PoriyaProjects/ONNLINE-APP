import { convertHebrewMonthsToNumbers, filterOutCurrentMonth } from './date-utils';
/**
 * Universal data pipeline:
 * - Converts Hebrew month names to numeric.
 * - Removes current (incomplete) month.
 * - Supports Year-Month structures (object or DataTable).
 */
export function sanitizeAndFilterYearMonthData(data: any): any {
    if (!data) return data;
  
    // Case 1: Structured { year: { month: value } }
    if (typeof data === 'object' && !('getNumberOfRows' in data)) {
      const cleaned = { ...data };
  
      Object.keys(cleaned).forEach(year => {
        const months = cleaned[year];
        const normalized: any = {};
        Object.keys(months).forEach(month => {
          const monthNum = convertHebrewMonthsToNumbers[month] || month;
          normalized[monthNum] = months[month];
        });
        cleaned[year] = normalized;
      });
  
      return filterOutCurrentMonth(cleaned);
    }
  
    // Case 2: Google DataTable (✅ corrected to safely extract all columns)
    if (typeof data.getNumberOfRows === 'function' && typeof data.getValue === 'function') {
      // Hebrew → Numeric month conversion
      for (let i = 0; i < data.getNumberOfRows(); i++) {
        const category = data.getValue(i, 0);
        if (convertHebrewMonthsToNumbers[category]) {
          data.setValue(i, 0, convertHebrewMonthsToNumbers[category]);
        }
      }
  
      const currentMonth = (new Date().getMonth() + 1).toString();
      const columnsCount = data.getNumberOfColumns();
  
      // Build new filtered rows
      const filteredRows: any[] = [];
      for (let i = 0; i < data.getNumberOfRows(); i++) {
        const category = data.getValue(i, 0);
        if (category !== currentMonth) {
          const row: any[] = [];
          for (let col = 0; col < columnsCount; col++) {
            row.push(data.getValue(i, col));
          }
          filteredRows.push(row);
        }
      }
  
      // Clone table & replace with filtered rows
      const newTable = new google.visualization.DataTable(data.toJSON()); // Safer clone
      newTable.removeRows(0, newTable.getNumberOfRows());
      filteredRows.forEach(row => newTable.addRow(row));
      return newTable;
    }
  
    return data;
  }
  
  
  