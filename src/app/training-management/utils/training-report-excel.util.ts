import * as XLSX from 'xlsx';
import { TRAINING_REPORT_EXPORT_MAX_ROWS } from '../models';

/** Prefix cells that Excel would treat as formulas. */
export function excelSafeCell(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  const s = String(value);
  if (s.length > 0 && '=@+-'.indexOf(s.charAt(0)) >= 0) {
    return "'" + s;
  }
  return s;
}

export function assertExportRowLimit(rowCount: number): string | null {
  if (rowCount > TRAINING_REPORT_EXPORT_MAX_ROWS) {
    return 'הדוח המבוקש גדול מדי. יש לצמצם את טווח התאריכים או להוסיף מסננים.';
  }
  return null;
}

export function exportTrainingRowsToExcel(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<unknown>>,
  metaLines?: string[]
): void {
  const limitMsg = assertExportRowLimit(rows.length);
  if (limitMsg) {
    throw new Error(limitMsg);
  }
  const aoa: unknown[][] = [];
  if (metaLines && metaLines.length) {
    metaLines.forEach((line) => aoa.push([excelSafeCell(line)]));
    aoa.push([]);
  }
  aoa.push(headers.map((h) => excelSafeCell(h)));
  rows.forEach((r) => aoa.push(r.map((c) => excelSafeCell(c))));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31) || 'Report');
  const safeName = (fileName || 'training-report').replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, safeName.endsWith('.xlsx') ? safeName : safeName + '.xlsx');
}
