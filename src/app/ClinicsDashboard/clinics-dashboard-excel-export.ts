import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DepartmentAggregate } from './clinics-department-aggregation';
import type {
  GetClinicsDashboardDto,
  ClinicsReportTab
} from './clinics-dashboard.component';

export interface ClinicsExcelColumn {
  key: string;
  label: string;
}

export interface ClinicsExcelExportContext {
  tab: ClinicsReportTab;
  tabLabel: string;
  dateFrom: string;
  dateTo: string;
  departmentGroups: DepartmentAggregate[];
  departmentColumns: ClinicsExcelColumn[];
  clinicRows: GetClinicsDashboardDto[];
  clinicColumns: string[];
  clinicColumnLabels: Record<string, string>;
  departmentMetricValue: (dept: DepartmentAggregate, key: string) => number;
  isPercentDepartmentColumn: (key: string) => boolean;
  clinicCellValue: (row: GetClinicsDashboardDto, column: string) => string;
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF5' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
}

function styleDataRow(row: ExcelJS.Row): void {
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.eachCell(cell => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
}

function safeFilePart(value: string): string {
  return (value || 'export').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
}

export async function exportClinicsDashboardToExcel(ctx: ClinicsExcelExportContext): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Clinics Dashboard';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('סיכום מחלקות', {
    views: [{ rightToLeft: true }]
  });
  const detailSheet = workbook.addWorksheet('פירוט יומנים', {
    views: [{ rightToLeft: true }]
  });

  summarySheet.mergeCells(1, 1, 1, Math.max(2, ctx.departmentColumns.length + 1));
  const meta = summarySheet.getCell(1, 1);
  meta.value = `דוח: ${ctx.tabLabel} | תקופה: ${ctx.dateFrom} – ${ctx.dateTo}`;
  meta.font = { bold: true, size: 12 };
  meta.alignment = { horizontal: 'right', vertical: 'middle' };

  const summaryHeaders = ['מחלקה'].concat(ctx.departmentColumns.map(c => c.label));
  summarySheet.addRow(summaryHeaders);
  styleHeaderRow(summarySheet.getRow(2));

  for (let i = 0; i < ctx.departmentGroups.length; i++) {
    const dept = ctx.departmentGroups[i];
    const cells: (string | number)[] = [dept.departName];
    for (let c = 0; c < ctx.departmentColumns.length; c++) {
      const col = ctx.departmentColumns[c];
      const value = ctx.departmentMetricValue(dept, col.key);
      if (ctx.isPercentDepartmentColumn(col.key)) {
        cells.push(value / 100);
      } else {
        cells.push(value);
      }
    }
    const row = summarySheet.addRow(cells);
    styleDataRow(row);
    for (let c = 0; c < ctx.departmentColumns.length; c++) {
      const col = ctx.departmentColumns[c];
      if (ctx.isPercentDepartmentColumn(col.key)) {
        const cell = row.getCell(c + 2);
        cell.numFmt = '0.0%';
      }
    }
  }

  summarySheet.columns = summaryHeaders.map((_, index) => ({
    width: index === 0 ? 22 : 14
  }));

  detailSheet.mergeCells(1, 1, 1, Math.max(2, ctx.clinicColumns.length + 1));
  const detailMeta = detailSheet.getCell(1, 1);
  detailMeta.value = `דוח: ${ctx.tabLabel} | תקופה: ${ctx.dateFrom} – ${ctx.dateTo}`;
  detailMeta.font = { bold: true, size: 12 };
  detailMeta.alignment = { horizontal: 'right', vertical: 'middle' };

  const detailHeaders = ['מחלקה'].concat(
    ctx.clinicColumns.map(col => ctx.clinicColumnLabels[col] || col)
  );
  detailSheet.addRow(detailHeaders);
  styleHeaderRow(detailSheet.getRow(2));

  for (let i = 0; i < ctx.clinicRows.length; i++) {
    const clinic = ctx.clinicRows[i];
    const cells: string[] = [(clinic.Depart_Name || '').trim() || '—'];
    for (let c = 0; c < ctx.clinicColumns.length; c++) {
      cells.push(ctx.clinicCellValue(clinic, ctx.clinicColumns[c]));
    }
    styleDataRow(detailSheet.addRow(cells));
  }

  detailSheet.columns = detailHeaders.map((_, index) => ({
    width: index === 0 ? 22 : 16
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const fileName =
    'clinics_' +
    safeFilePart(ctx.tab) +
    '_' +
    safeFilePart(ctx.dateFrom) +
    '_' +
    safeFilePart(ctx.dateTo) +
    '.xlsx';
  saveAs(blob, fileName);
}
