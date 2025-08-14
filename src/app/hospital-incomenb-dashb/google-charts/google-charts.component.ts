import { Component, AfterViewInit } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import { ChargingIncomeService, INCOME_KIND_LABEL, IncomeKind } from '../services/charging-income.service';
import { ChargingIncomeResponse } from '../services/charging-income.models';

declare const google: any;

@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html'
})
export class GoogleChartsIncomeNBComponent implements AfterViewInit {
  private payload: ChargingIncomeResponse | null = null;

  incomeKind: IncomeKind = 'combined';      // default
  readonly kindLabel = INCOME_KIND_LABEL;   // for titles

  constructor(private charts: GoogleChartsService, private api: ChargingIncomeService) {}

  ngAfterViewInit(): void {
    this.charts.load().then(() => {
      this.api.getChargingIncome({
        //groupId: 543,
        deptId: 572,
        incomeCategory: 'totalCharging',
        fromYear: 2022,
        toYear: 2025,
        isYtd: true
      }).subscribe(res => { this.payload = res; this.drawAll(); });
    });
  }

  onKindChange(kind: IncomeKind) {
    this.incomeKind = kind;
    this.drawAll();
  }

  private drawAll(): void {
    if (!this.payload) return;
    const res = this.payload;
  
    // ✅ detect multi-department
    const uniqueDeptCount = Array.from(new Set(res.data.map(r => r.deptId))).length;
    const showGroupCharts = uniqueDeptCount > 1;
  
    const years = res.totals.byYear.map(y => y.year).sort();
    const latestYear = years[years.length - 1];
  
    const byYearTable =
      this.incomeKind === 'bySource'
        ? this.api.toByYearStackedBySource(res.data)
        : this.api.toByYearTableForKind(res.data, this.incomeKind);
  
    const deptTable  = this.api.toDeptTableForKind(res.data, latestYear, this.incomeKind);
    const pieTable   = this.api.toDeptPieForKind(res.data, latestYear, this.incomeKind);
    const groupsBar  = this.api.toGroupsBarLatestYearForKind(res.data, this.incomeKind);
    const sourcePie  = this.api.toSourcePieForKind(res.data, latestYear, this.incomeKind);
  
    // --- #bar_chart ---
    this.charts.draw(() => {
      const el = document.getElementById('bar_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(byYearTable);
      this.applyKMToColumns(data, this.numericColumns(data));
      const stacked = this.incomeKind === 'bySource';
      new google.visualization.ColumnChart(el).draw(data, {
        isStacked: stacked,
        legend: stacked ? { position: 'top' } : { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: {
          title: stacked ? 'סה״כ לפי מקור' : `סה״כ (${this.kindLabel[this.incomeKind as any] || 'סה״כ'})`,
          format: 'short'
        }
      });
    });
  
    // --- #tabled_chart ---
    this.charts.draw(() => {
      const el = document.getElementById('tabled_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(deptTable);
      this.applyKMToColumns(data, [1, 2]);
      new google.visualization.Table(el).draw(data, {
        showRowNumber: false, allowHtml: true, width: '100%', height: '100%'
      });
    });
  
    // --- #arc_chart (only if multiple depts) ---
    this.charts.draw(() => {
      this.setDisplay('arc_chart', showGroupCharts);
      this.setDisplay('arc_chart_title', showGroupCharts);
      if (!showGroupCharts) return;
  
      const el = document.getElementById('arc_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(pieTable);
      this.applyKMToColumns(data, [1]);
      new google.visualization.PieChart(el).draw(data, {
        pieHole: 0.45, legend: { position: 'right' }, chartArea: { width: '90%', height: '80%' }
      });
    });
  
    // --- #income_source_pie ---
    this.charts.draw(() => {
      const el = document.getElementById('income_source_pie');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(sourcePie);
      this.applyKMToColumns(data, [1]);
      new google.visualization.PieChart(el).draw(data, {
        pieHole: 0.45,
        legend: { position: 'right', textStyle: { fontSize: 12 } },
        chartArea: { width: '90%', height: '80%' }
      });
    });
  
    // --- #incomedeptslastmonthv (only if multiple depts) ---
    this.charts.draw(() => {
      this.setDisplay('incomedeptslastmonthv', showGroupCharts);
      this.setDisplay('group_chart_title', showGroupCharts);
      if (!showGroupCharts) return;
  
      const el = document.getElementById('incomedeptslastmonthv');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(groupsBar);
      this.applyKMToColumns(data, [1]);
      new google.visualization.BarChart(el).draw(data, {
        legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'קבוצת מחלקות' },
        vAxis: { title: 'הכנסות', format: 'short' }
      });
    });
  
    // --- #bar_chart2 (only if multiple depts) ---
    this.charts.draw(() => {
      this.setDisplay('bar_chart2', showGroupCharts);
      this.setDisplay('bar_chart2_title', showGroupCharts);
      if (!showGroupCharts) return;
  
      const el = document.getElementById('bar_chart2');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(this.api.toDeptByYearBar(res.data));
      this.applyKMToColumns(data, this.numericColumns(data));
      new google.visualization.ColumnChart(el).draw(data, {
        isStacked: false, legend: { position: 'top' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'סה״כ הכנסות', format: 'short' }
      });
    });
  
    // --- #growth_trend_chart ---
    this.charts.draw(() => {
      const el = document.getElementById('growth_trend_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(
        this.api.toByYearTableForKind(res.data, 'combined')
      );
      this.applyKMToColumns(data, [1]);
      new google.visualization.LineChart(el).draw(data, {
        legend: { position: 'none' }, chartArea: { width: '85%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'סה״כ הכנסות', format: 'short' }
      });
    });
  }
  
 
  
  // helper to hide/show containers (and clear old SVG when hidden)
  private setDisplay(id: string, show: boolean): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? '' : 'none';
    if (!show) el.innerHTML = '';
  }
  

  // ---------- K/M formatting helpers ----------
  private kmFormat(n: number): string {
    if (n == null || isNaN(n)) return '';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }

  private applyKMToColumns(data: any, colIndexes: number[]): void {
    const rows = data.getNumberOfRows();
    for (let r = 0; r < rows; r++) {
      for (const c of colIndexes) {
        const v = data.getValue(r, c);
        if (typeof v === 'number') {
          data.setFormattedValue(r, c, this.kmFormat(v));
        }
      }
    }
  }

  private numericColumns(data: any): number[] {
    // all numeric columns after the first label column (index 0)
    const cols: number[] = [];
    for (let i = 1; i < data.getNumberOfColumns(); i++) cols.push(i);
    return cols;
  }
}
