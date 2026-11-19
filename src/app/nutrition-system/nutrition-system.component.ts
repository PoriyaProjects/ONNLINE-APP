import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-nutrition-system',
  templateUrl: './nutrition-system.component.html',
  styleUrls: ['./nutrition-system.component.css']
})
export class NutritionSystemComponent implements OnInit {


  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  nutritionHosData = [];
  nutritionCliData = [];
  departmentsData = [];
  clinicsData = [];
  dataSourceHos = new MatTableDataSource(this.nutritionHosData);
  dataSourceCli = new MatTableDataSource(this.nutritionCliData);
  searchGroup: FormGroup;
  departmentsFormControl = new FormControl([]);
  clinicsFormControl = new FormControl([]);
  numberOfDepartments: number;
  numberOfClinics: number;

  displayedColumns: string[] = ['IDNumber', 'FirstName', 'FatherName', 'DepartName', 'RoomNumber', 'CurrentAllergy'
    , 'OldAllergy', 'FoodType', 'NutritionAnamnezes', 'FoodTexture', 'LiquidCertification', 'EatingNotes'];

  applyFilter(event) {
    let filterValue;
    if (event == undefined) {
      filterValue = "";
    } else if (event.isTrusted == undefined) {
      filterValue = event;
    } else {
      filterValue = (event.target as HTMLInputElement).value;
    }
    this.dataSourceHos.filter = filterValue.trim().toLowerCase();
  }

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.searchGroup = this.fb.group({
      Departments: new FormControl([], null),
      Clinics: new FormControl([], null)
    });
    this.getNutritionsPatietnsList([]);
  }

  searchPatients() {
    let searchString = [...this.searchGroup.controls['Departments'].value, ...this.searchGroup.controls['Clinics'].value];
    this.getNutritionsPatietnsList(searchString);
  }

  selectAllDepartments() {
    if (this.departmentsFormControl.value.length === this.numberOfDepartments) {
      this.searchGroup.controls['Departments'].setValue([]);
      this.departmentsFormControl.setValue([]);
    } else {
      this.searchGroup.controls['Departments'].setValue(this.departmentsData);
      this.departmentsFormControl.setValue(this.departmentsData);
    }
  }

  selectAllClinics() {
    if (this.clinicsFormControl.value.length === this.numberOfClinics) {
      this.searchGroup.controls['Clinics'].setValue([]);
      this.clinicsFormControl.setValue([]);
    } else {
      this.searchGroup.controls['Clinics'].setValue(this.clinicsData);
      this.clinicsFormControl.setValue(this.clinicsData);
    }
  }

  deselectAllDepartments() {
    this.departmentsFormControl.setValue([]);
  }

  deselectAllClinics() {
    this.clinicsFormControl.setValue([]);
  }

  // onDepartmentChange(event: MatSelectionListChange) {
  //   if (event.option[0].selected) {
  //     this.departmentsFormControl.setValue(this.departmentsData);
  //   } else {
  //     this.departmentsFormControl.setValue(event.source.selectedOptions.filter(option => option.value));
  //   }
  // }

  async getNutritionsPatietnsList(searchDepts) {
    this.http
      .post(environment.url + "GetNutritionsPatietnsList", {
        _searchArr: searchDepts
      })
      .subscribe((Response) => {
        this.nutritionHosData = Response["d"].filter(x => x.UnitType == 'h');
        this.nutritionCliData = Response["d"].filter(x => x.UnitType == 'v');
        this.dataSourceHos = new MatTableDataSource([...this.nutritionHosData, ...this.nutritionCliData]);
        // enter the departments to seperate array
        this.nutritionHosData.forEach(element => {
          this.departmentsData.push(element.DepartName);
        });
        this.nutritionCliData.forEach(element => {
          this.clinicsData.push(element.DepartName);
        });
        this.dataSourceHos.paginator = this.paginator;
        this.dataSourceHos.sort = this.sort;
        // distinct the duplicates from departments array
        this.departmentsData = Array.from(this.departmentsData.reduce((m, t) => m.set(t, t), new Map()).values());
        this.clinicsData = Array.from(this.clinicsData.reduce((m, t) => m.set(t, t), new Map()).values());
        this.numberOfDepartments = this.departmentsData.length;
        this.numberOfClinics = this.clinicsData.length;
      });
  }

  fileName = 'דוח הזנה.xlsx';

  private getExportDateTime(): string {
    return new Date().toLocaleString('he-IL');
  }

  private getSingleSelectedDepartment(): string | null {
    const depts = (this.searchGroup?.controls['Departments']?.value || [])
      .filter((d: string) => !!d);
    return depts.length === 1 ? depts[0] : null;
  }

  private getExportHeaderLines(): string[] {
    const lines: string[] = [];
    const dept = this.getSingleSelectedDepartment();
    if (dept) {
      lines.push(`מחלקה: ${dept}`);
    }
    lines.push(`תאריך ושעה: ${this.getExportDateTime()}`);
    return lines;
  }

  private prepareExportTable(source: HTMLTableElement): HTMLTableElement {
    const tableClone = source.cloneNode(true) as HTMLTableElement;
    tableClone.removeAttribute('id');
    tableClone.style.display = 'table';
    tableClone.style.borderCollapse = 'collapse';
    tableClone.style.border = '1px solid #000';
    tableClone.style.backgroundColor = '#ffffff';
    tableClone.style.direction = 'rtl';
    tableClone.style.fontSize = '11px';
    tableClone.style.fontFamily = 'Arial, sans-serif';
    tableClone.style.margin = '0';
    tableClone.style.width = '100%';
    tableClone.style.height = 'auto';
    tableClone.style.tableLayout = 'fixed';

    tableClone.querySelectorAll('th, td').forEach(node => {
      const cell = node as HTMLElement;
      cell.style.whiteSpace = 'normal';
      cell.style.overflowWrap = 'anywhere';
      cell.style.wordBreak = 'break-word';
      cell.style.height = 'auto';
      cell.style.overflow = 'visible';
      cell.style.verticalAlign = 'top';
      cell.style.padding = '4px';
      cell.style.boxSizing = 'border-box';
    });

    if (this.getSingleSelectedDepartment()) {
      tableClone.querySelectorAll('.department-col').forEach(el => el.remove());
    }

    return tableClone;
  }

  private prependExportHeaderRows(ws: XLSX.WorkSheet, lines: string[]): void {
    if (!lines.length) {
      return;
    }

    const ref = ws['!ref'];
    if (!ref) {
      return;
    }

    const range = XLSX.utils.decode_range(ref);
    const shift = lines.length;

    for (let row = range.e.r; row >= range.s.r; row--) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const from = XLSX.utils.encode_cell({ r: row, c: col });
        const to = XLSX.utils.encode_cell({ r: row + shift, c: col });
        if (ws[from]) {
          ws[to] = ws[from];
          delete ws[from];
        } else if (ws[to]) {
          delete ws[to];
        }
      }
    }

    if (!ws['!merges']) {
      ws['!merges'] = [];
    }

    lines.forEach((text, i) => {
      const addr = XLSX.utils.encode_cell({ r: i, c: 0 });
      ws[addr] = { t: 's', v: text };
      ws['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: range.e.c } });
    });

    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: range.s.c },
      e: { r: range.e.r + shift, c: range.e.c }
    });
  }

  private styleExcelWorksheet(ws: XLSX.WorkSheet, headerRow = 0): void {
    const ref = ws['!ref'];
    if (!ref) {
      return;
    }

    const range = XLSX.utils.decode_range(ref);
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell: any = ws[addr];
        if (!cell) {
          continue;
        }

        cell.s = {
          ...(cell.s || {}),
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          font: {
            ...((cell.s && cell.s.font) || {}),
            bold: row === headerRow
          }
        };
      }
    }
  }

  // export the table to excel file
  exportToExcel() {
    const sourceTable = document.getElementById('excel-table') as HTMLTableElement;
    if (!sourceTable) {
      return;
    }

    const headerLines = this.getExportHeaderLines();
    const tableClone = this.prepareExportTable(sourceTable);
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableClone);
    this.prependExportHeaderRows(ws, headerLines);
    this.styleExcelWorksheet(ws, headerLines.length);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.fileName);
  }

  private createExportMeasureRoot(widthPx: number): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.width = widthPx + 'px';
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflow = 'visible';
    return wrapper;
  }

  private appendExportHeaderLines(parent: HTMLElement, lines: string[]): void {
    lines.forEach(text => {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.direction = 'rtl';
      el.style.textAlign = 'right';
      el.style.fontSize = '12px';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.marginBottom = '6px';
      el.style.color = '#000000';
      parent.appendChild(el);
    });
  }

  private createExportPageTable(headerRow: HTMLTableRowElement | undefined, bodyRows: HTMLTableRowElement[]): HTMLTableElement {
    const pageTable = document.createElement('table');
    pageTable.setAttribute('dir', 'rtl');
    pageTable.style.display = 'table';
    pageTable.style.borderCollapse = 'collapse';
    pageTable.style.border = '1px solid #000';
    pageTable.style.backgroundColor = '#ffffff';
    pageTable.style.direction = 'rtl';
    pageTable.style.fontSize = '11px';
    pageTable.style.fontFamily = 'Arial, sans-serif';
    pageTable.style.margin = '0';
    pageTable.style.width = '100%';
    pageTable.style.height = 'auto';
    pageTable.style.tableLayout = 'fixed';
    if (headerRow) {
      pageTable.appendChild(headerRow.cloneNode(true));
    }
    bodyRows.forEach(row => pageTable.appendChild(row.cloneNode(true)));
    return pageTable;
  }

  private packExportRows(
    bodyRows: HTMLTableRowElement[],
    headerRowHeight: number,
    lineBlockHeight: number,
    pageHeightPx: number
  ): HTMLTableRowElement[][] {
    const pages: HTMLTableRowElement[][] = [];
    let current: HTMLTableRowElement[] = [];
    let used = lineBlockHeight + headerRowHeight;

    bodyRows.forEach(row => {
      const rowHeight = Math.ceil(row.getBoundingClientRect().height);
      if (current.length > 0 && used + rowHeight > pageHeightPx) {
        pages.push(current);
        current = [];
        used = headerRowHeight;
      }
      current.push(row);
      used += rowHeight;
    });

    if (current.length || !pages.length) {
      pages.push(current);
    }
    return pages;
  }

  private rowsHeight(rows: HTMLTableRowElement[]): number {
    return rows.reduce((sum, row) => sum + Math.ceil(row.getBoundingClientRect().height), 0);
  }

  private captureExportNode(target: HTMLElement): Promise<HTMLCanvasElement> {
    return html2canvas(target, {
      scale: 1,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (element) => {
        return element !== target && !target.contains(element) && !element.contains(target);
      }
    });
  }

  private jpegFromCanvas(source: HTMLCanvasElement, regions: { top: number; height: number }[]): { data: string; width: number; height: number } {
    const width = source.width;
    const height = Math.max(1, regions.reduce((sum, region) => sum + Math.max(1, Math.round(region.height)), 0));
    const slice = document.createElement('canvas');
    slice.width = width;
    slice.height = height;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    let destY = 0;
    regions.forEach(region => {
      const srcY = Math.max(0, Math.round(region.top));
      const srcH = Math.max(1, Math.round(region.height));
      ctx.drawImage(source, 0, srcY, width, srcH, 0, destY, width, srcH);
      destY += srcH;
    });
    const data = slice.toDataURL('image/jpeg', 0.92);
    const result = { data, width: slice.width, height: slice.height };
    slice.width = 0;
    slice.height = 0;
    return result;
  }

  private removeNode(node: HTMLElement): void {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  async exportToPdf() {
    const sourceTable = document.getElementById('excel-table') as HTMLTableElement;
    if (!sourceTable) {
      return;
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const contentWidthMm = pageWidth - (margin * 2);
    const contentHeightMm = pageHeight - (margin * 2);
    const contentWidthPx = Math.round((contentWidthMm / 25.4) * 96);
    const pageHeightPx = Math.max(1, Math.floor((contentHeightMm / 25.4) * 96) - 8);
    const maxChunkPx = 8000;

    const tableClone = this.prepareExportTable(sourceTable);
    const headerLines = this.getExportHeaderLines();
    const measureRoot = this.createExportMeasureRoot(contentWidthPx);
    const linesHost = document.createElement('div');
    this.appendExportHeaderLines(linesHost, headerLines);
    measureRoot.appendChild(linesHost);
    measureRoot.appendChild(tableClone);
    document.body.appendChild(measureRoot);

    let chunkRoot: HTMLElement = null;

    try {
      const allRows = Array.from(tableClone.rows);
      const headerRow = allRows[0];
      const bodyRows = allRows.slice(1);
      const headerRowHeight = headerRow ? Math.ceil(headerRow.getBoundingClientRect().height) : 0;
      const lineBlockHeight = Math.ceil(linesHost.getBoundingClientRect().height);
      const pages = this.packExportRows(bodyRows, headerRowHeight, lineBlockHeight, pageHeightPx);
      const pageBodyHeights = pages.map(rows => this.rowsHeight(rows));
      this.removeNode(measureRoot);

      let pdfPageCount = 0;
      let start = 0;
      while (start < pages.length) {
        let end = start + 1;
        let bodyHeight = pageBodyHeights[start];
        while (end < pages.length) {
          const nextBody = pageBodyHeights[end];
          const chrome = (start === 0 ? lineBlockHeight : 0) + headerRowHeight;
          if (chrome + bodyHeight + nextBody > maxChunkPx) {
            break;
          }
          bodyHeight += nextBody;
          end++;
        }

        const chunkPages = pages.slice(start, end);
        const chunkRows = chunkPages.reduce((acc, rows) => acc.concat(rows), [] as HTMLTableRowElement[]);
        chunkRoot = this.createExportMeasureRoot(contentWidthPx);
        if (start === 0) {
          const pageLines = document.createElement('div');
          this.appendExportHeaderLines(pageLines, headerLines);
          chunkRoot.appendChild(pageLines);
        }
        chunkRoot.appendChild(this.createExportPageTable(headerRow, chunkRows));
        document.body.appendChild(chunkRoot);

        const canvas = await this.captureExportNode(chunkRoot);
        const scale = canvas.height / Math.max(1, chunkRoot.scrollHeight);
        const chunkRect = chunkRoot.getBoundingClientRect();
        const chunkTable = chunkRoot.querySelector('table');
        const chunkHeader = chunkTable ? chunkTable.rows[0] : null;
        const headerRect = chunkHeader ? chunkHeader.getBoundingClientRect() : null;
        const headerTop = headerRect ? (headerRect.top - chunkRect.top) * scale : 0;
        const headerHeight = headerRect ? headerRect.height * scale : 0;
        const paintedRows = chunkTable ? Array.from(chunkTable.rows).slice(1) : [];
        let cursor = 0;

        chunkPages.forEach((pageRows, indexInChunk) => {
          let image: { data: string; width: number; height: number };
          if (!pageRows.length || !paintedRows.length) {
            image = this.jpegFromCanvas(canvas, [{ top: 0, height: headerTop + headerHeight }]);
          } else {
            const first = paintedRows[cursor].getBoundingClientRect();
            const last = paintedRows[cursor + pageRows.length - 1].getBoundingClientRect();
            const bodyTop = (first.top - chunkRect.top) * scale;
            const bodyBottom = (last.bottom - chunkRect.top) * scale;
            cursor += pageRows.length;
            if (indexInChunk === 0) {
              image = this.jpegFromCanvas(canvas, [{ top: 0, height: bodyBottom }]);
            } else {
              image = this.jpegFromCanvas(canvas, [
                { top: headerTop, height: headerHeight },
                { top: bodyTop, height: bodyBottom - bodyTop }
              ]);
            }
          }

          if (pdfPageCount > 0) {
            pdf.addPage();
          }
          const imgHeight = (image.height * contentWidthMm) / image.width;
          pdf.addImage(image.data, 'JPEG', margin, margin, contentWidthMm, imgHeight);
          pdfPageCount++;
        });

        canvas.width = 0;
        canvas.height = 0;
        this.removeNode(chunkRoot);
        chunkRoot = null;
        start = end;
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      pdf.save(this.fileName.replace('.xlsx', '.pdf'));
    } catch {
      // leave the failed export without a partial download
    } finally {
      this.removeNode(measureRoot);
      if (chunkRoot) {
        this.removeNode(chunkRoot);
      }
    }
  }

  // filter the table where is not null or empty by the type recieved
  async filterTypes(event) {
    /*
    1 - סוג כלכלה
    2 - סוג מרקם
    3 - רגישויות אשפוז נוכחי
    4 - רגישויות בעבר
    */
    if (event == 1) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.FoodType !== '');
    if (event == 2) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.FoodTexture !== '');
    if (event == 3) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.CurrentAllergy !== '');
    if (event == 4) this.dataSourceHos.data = this.nutritionHosData.filter(f => f.OldAllergy !== '');
  }

  resetData() {
    this.dataSourceHos.data = this.nutritionHosData;
    this.dataSourceCli.data = this.nutritionCliData;
    this.dataSourceHos = new MatTableDataSource([...this.nutritionHosData, ...this.nutritionCliData]);
  }

}
