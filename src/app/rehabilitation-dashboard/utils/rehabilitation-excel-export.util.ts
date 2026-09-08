import * as XLSX from 'xlsx';

function excelSafeCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  const text = String(value);
  if (text.length > 0 && '=@+-'.indexOf(text.charAt(0)) >= 0) {
    return "'" + text;
  }
  return text;
}

function sheetName(name: string, index: number): string {
  const cleaned = (name || `גיליון ${index + 1}`).replace(/[\\/?*[\]]/g, ' ').trim();
  return (cleaned || `גיליון ${index + 1}`).slice(0, 31);
}

export function recordsToAoa(rows: unknown[]): unknown[][] {
  if (!rows.length) {
    return [['אין נתונים']];
  }
  const keys: string[] = [];
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') {
      return;
    }
    Object.keys(row as object).forEach((key) => {
      if (keys.indexOf(key) < 0) {
        keys.push(key);
      }
    });
  });
  if (!keys.length) {
    return [['אין נתונים']];
  }
  return [
    keys,
    ...rows.map((row) => {
      const rec = (row || {}) as Record<string, unknown>;
      return keys.map((key) => rec[key]);
    }),
  ];
}

export function writeRehabExcel(
  fileName: string,
  sheets: Array<{ name: string; rows: unknown[][] }>,
): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  sheets.forEach((sheet, index) => {
    let name = sheetName(sheet.name, index);
    if (used.has(name)) {
      name = sheetName(`${name} ${index + 1}`, index);
    }
    used.add(name);
    const aoa = (sheet.rows.length ? sheet.rows : [['אין נתונים']]).map((row) =>
      row.map((cell) => excelSafeCell(cell)),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  });
  const safeName = (fileName || 'rehabilitation-dashboard').replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, safeName.endsWith('.xlsx') ? safeName : `${safeName}.xlsx`);
}
