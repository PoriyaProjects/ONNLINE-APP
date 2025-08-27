import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { GoogleChartsService } from '../services/google-charts.service';
import {
  ChargingIncomeService,
  INCOME_KIND_LABEL,
  IncomeKind,
  GroupInfo,
  DeptInfo,
  KPIs
} from '../services/charging-income.service';
import { ChargingIncomeResponse, ChargingIncomeRow } from '../services/charging-income.models';

declare const google: any;

@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html'
})
export class GoogleChartsIncomeNBComponent implements AfterViewInit {
  // data
  private payload: ChargingIncomeResponse | null = null;
  private allRows: ChargingIncomeRow[] = [];

  // selections
  incomeKind: IncomeKind = 'combined';
  selectedGroupId: number | null = null; // null = All groups (Hospital level)
  selectedDeptId:  number | null = null; // null = All depts under group (or hospital)

  // discovery
  groups: GroupInfo[] = [];
  depts:  DeptInfo[]  = [];

  // KPIs
  kpis: KPIs | null = null;

  readonly kindLabel = INCOME_KIND_LABEL;

  constructor(
    private charts: GoogleChartsService,
    private api: ChargingIncomeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.charts.load().then(() => {
      // Prefetch hospital-level (everything)
      this.api.prefetchHospital({
        fromYear: 2022, toYear: 2025, isYtd: true, incomeCategory: 'totalCharging'
      }).subscribe(res => {
        this.payload = res;
        this.allRows = res.data || [];
        this.groups = this.api.listGroups(this.allRows);
        this.depts  = this.api.listDepts(this.allRows);
        this.computeAndDraw(); // <- compute + draw once
      });
    });
  }

  // ---------- UI actions ----------
  onKindChange(kind: string) {
    this.incomeKind = (kind as IncomeKind);
    this.computeAndDraw();      // <- DO NOT call drawAll() directly
  }

  trackByGroupId = (_: number, g: { groupId: number }) => g.groupId;
  trackByDeptId  = (_: number, d: { deptId: number })  => d.deptId;

  onSelectGroup(groupId: number | null) {
    this.selectedGroupId = groupId;
    this.selectedDeptId = null; // reset dept when group changes
    this.depts = this.api.listDepts(this.allRows, groupId == null ? undefined : groupId);
    this.cdr.detectChanges();
    this.computeAndDraw();      // <- DO NOT call drawAll() directly
  }

  onSelectDept(deptId: number | null) {
    this.selectedDeptId = deptId;
    this.cdr.detectChanges();
    this.computeAndDraw();      // <- DO NOT call drawAll() directly
  }

  // ---------- KPI helpers for template (no pipes) ----------
  formatNumber(val: number | null | undefined, fractionDigits: number = 0): string {
    if (val == null || isNaN(val as any)) return '';
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  }
  formatPercentFraction(val: number | null | undefined, fractionDigits: number = 1): string {
    if (val == null || isNaN(val as any)) return '';
    return `${this.formatNumber((val as number) * 100, fractionDigits)}%`;
  }
  yoyColor(yoyPct: number | null | undefined): string {
    const v = (yoyPct == null) ? 0 : yoyPct;
    return v >= 0 ? '#2e7d32' : '#c62828';
  }

  // ---------- K/M formatting for Google tables ----------
  private kmFormat(n: number): string {
    if (n == null || isNaN(n)) return '';
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (abs >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
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
    const cols: number[] = [];
    for (let i = 1; i < data.getNumberOfColumns(); i++) cols.push(i);
    return cols;
  }
  private setDisplay(id: string, show: boolean): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? '' : 'none';
    if (!show) el.innerHTML = '';
  }

  // ---------- Compute (filter + KPIs) & Draw ----------
  private computeAndDraw(): void {
    if (!this.payload) return;

    const workingRows = this.api.filterRows(
      this.allRows, this.selectedGroupId, this.selectedDeptId
    );

    // KPIs
    const atHospital = this.selectedGroupId == null && this.selectedDeptId == null;
    const atGroup    = this.selectedGroupId != null && this.selectedDeptId == null;
    // const atDept  = this.selectedDeptId  != null;

    const title =
      atHospital ? 'כלל בית החולים' :
      atGroup    ? (this.groups.find(g => g.groupId === this.selectedGroupId)?.groupName || 'קבוצה') :
                   (this.depts.find(d => d.deptId === this.selectedDeptId)?.deptName || 'מחלקה');

    const scope: 'hospital'|'group'|'dept' = atHospital ? 'hospital' : atGroup ? 'group' : 'dept';
    this.kpis = this.api.computeKPIs(workingRows, scope, title);

    this.drawAll(workingRows); // <- draw with the computed slice
  }

  private drawAll(workingRows: ChargingIncomeRow[]): void {
    // ----- guards -----
    if (!workingRows || !workingRows.length) {
      ['bar_chart','income_source_pie','tabled_chart','arc_chart','incomedeptslastmonthv',
       'bar_chart2','growth_trend_chart','treemap_groups','group_100_stack',
       'group_contrib_growth','cumulative_line','pareto_group','dept_contrib_growth'
      ].forEach(id => this.setDisplay(id, false));
      return;
    }

    // ----- slice diagnostics -----
    const uniqueDeptCount  = Array.from(new Set(workingRows.map(r => r.deptId))).length;
    const uniqueGroupCount = Array.from(new Set(workingRows.map(r => r.groupId))).length;
    const showDeptCharts   = uniqueDeptCount > 1;
    const showGroupCharts  = uniqueGroupCount > 1 && this.selectedDeptId == null;

    const atHospital = this.selectedGroupId == null && this.selectedDeptId == null;
    const atGroup    = this.selectedGroupId != null && this.selectedDeptId == null;

    // ----- years & latest -----
    const years = Array.from(new Set(workingRows.map(r => r.year))).sort();
    const latestYear = years.length ? years[years.length - 1] : (new Date().getFullYear());

    // ----- data tables for charts -----
    const byYearTable =
      this.incomeKind === 'bySource'
        ? this.api.toByYearStackedBySource(workingRows)
        : this.api.toByYearTableForKind(workingRows, this.incomeKind);

    const deptTable  = this.api.toDeptTableForKind(workingRows, latestYear, this.incomeKind);
    const pieTable   = this.api.toDeptPieForKind(workingRows, latestYear, this.incomeKind);
    const groupsBar  = this.api.toGroupsBarLatestYearForKind(workingRows, this.incomeKind);
    const sourcePie  = this.api.toSourcePieForKind(workingRows, latestYear, this.incomeKind);

    // ----- Yearly totals OR stacked by source -----
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
        vAxis: { title: stacked ? 'סה״כ לפי מקור' : `סה״כ (${this.kindLabel[this.incomeKind as any] || 'סה״כ'})`, format: 'short' }
      });
    });

    // ----- Source pie (reacts to dropdown) -----
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

    // ----- Per-dept table (latest year) -----
    this.charts.draw(() => {
      const el = document.getElementById('tabled_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(deptTable);
      this.applyKMToColumns(data, [1, 2]);
      new google.visualization.Table(el).draw(data, {
        showRowNumber: false, allowHtml: true, width: '100%', height: '100%'
      });
    });

    // ----- Dept pie (only if multiple depts) -----
    this.charts.draw(() => {
      this.setDisplay('arc_chart', showDeptCharts);
      this.setDisplay('arc_chart_title', showDeptCharts);
      if (!showDeptCharts) return;

      const el = document.getElementById('arc_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(pieTable);
      this.applyKMToColumns(data, [1]);
      new google.visualization.PieChart(el).draw(data, {
        pieHole: 0.45, legend: { position: 'right' }, chartArea: { width: '90%', height: '80%' }
      });
    });

    // ----- Groups bar (only if multiple groups and not at dept level) -----
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

    // ----- Dept by year (only if multiple depts) -----
    this.charts.draw(() => {
      this.setDisplay('bar_chart2', showDeptCharts);
      this.setDisplay('bar_chart2_title', showDeptCharts);
      if (!showDeptCharts) return;

      const el = document.getElementById('bar_chart2');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(this.api.toDeptByYearBar(workingRows));
      this.applyKMToColumns(data, this.numericColumns(data));
      new google.visualization.ColumnChart(el).draw(data, {
        isStacked: false, legend: { position: 'top' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'סה״כ הכנסות', format: 'short' }
      });
    });

    // ----- Growth trend (combined) -----
    this.charts.draw(() => {
      const el = document.getElementById('growth_trend_chart');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(
        this.api.toByYearTableForKind(workingRows, 'combined')
      );
      this.applyKMToColumns(data, [1]);
      new google.visualization.LineChart(el).draw(data, {
        legend: { position: 'none' }, chartArea: { width: '85%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'סה״כ הכנסות', format: 'short' }
      });
    });

    // ===================== HOSPITAL-LEVEL EXTRAS =====================
    this.charts.draw(() => {
      this.setDisplay('treemap_groups', atHospital);
      this.setDisplay('treemap_groups_title', atHospital);
      if (!atHospital) return;

      const el = document.getElementById('treemap_groups');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(this.api.toTreemapGroups(workingRows));
      const chart = new google.visualization.TreeMap(el);
      chart.draw(data, {
        minColor: '#f9f9f9', midColor: '#c6e48b', maxColor: '#196127',
        headerHeight: 22, showScale: true, fontSize: 12
      });
    });

    this.charts.draw(() => {
      this.setDisplay('group_100_stack', atHospital);
      this.setDisplay('group_100_stack_title', atHospital);
      if (!atHospital) return;

      const el = document.getElementById('group_100_stack');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(this.api.toByYearByGroup100(workingRows));
      const rows = data.getNumberOfRows(); const cols = data.getNumberOfColumns();
      for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) {
        const v = data.getValue(r, c);
        data.setFormattedValue(r, c, (v * 100).toFixed(1) + '%');
      }
      new google.visualization.ColumnChart(el).draw(data, {
        isStacked: 'percent',
        legend: { position: 'top' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'חלק יחסי', format: 'percent' }
      });
    });

    this.charts.draw(() => {
      this.setDisplay('group_contrib_growth', atHospital);
      this.setDisplay('group_contrib_growth_title', atHospital);
      if (!atHospital) return;

      const el = document.getElementById('group_contrib_growth');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(
        this.api.toContributionToGrowth(workingRows, 'group')
      );
      this.applyKMToColumns(data, [1]);
      new google.visualization.ColumnChart(el).draw(data, {
        legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'קבוצה' },
        vAxis: { title: 'תרומה לשינוי', format: 'short' }
      });
    });

    // ===================== ANY LEVEL EXTRAS =====================
    this.charts.draw(() => {
      const el = document.getElementById('cumulative_line');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(
        this.api.toCumulativeByYear(workingRows, this.incomeKind)
      );
      this.applyKMToColumns(data, [1]);
      new google.visualization.LineChart(el).draw(data, {
        legend: { position: 'none' },
        chartArea: { width: '85%', height: '70%' },
        hAxis: { title: 'שנה' },
        vAxis: { title: 'מצטבר', format: 'short' }
      });
    });

    // ===================== GROUP-LEVEL EXTRAS =====================
    this.charts.draw(() => {
      const show = atGroup && this.selectedGroupId != null;
      this.setDisplay('pareto_group', show);
      this.setDisplay('pareto_group_title', show);
      if (!show) return;

      const el = document.getElementById('pareto_group');
      if (!el) return;
      const data = google.visualization.arrayToDataTable(
        this.api.toParetoForGroup(workingRows, this.selectedGroupId!, latestYear)
      );
      const view = new google.visualization.DataView(data);
      view.setColumns([0, 1, { calc:'stringify', sourceColumn:1, type: 'string', role:'annotation' }, 2]);
      new google.visualization.ComboChart(el).draw(view, {
        seriesType: 'bars',
        series: { 1: { type: 'line', targetAxisIndex: 1 } },
        vAxes: {
          0: { title: 'הכנסות', format: 'short' },
          1: { title: 'מצטבר %', format: 'percent' }
        },
        legend: { position: 'none' },
        chartArea: { width: '85%', height: '70%' }
      });
    });

    this.charts.draw(() => {
      const show = atGroup && this.selectedGroupId != null;
      this.setDisplay('dept_contrib_growth', show);
      this.setDisplay('dept_contrib_growth_title', show);
      if (!show) return;

      const el = document.getElementById('dept_contrib_growth');
      if (!el) return;
      const filtered = this.api.filterRows(workingRows, this.selectedGroupId!, null);
      const data = google.visualization.arrayToDataTable(
        this.api.toContributionToGrowth(filtered, 'dept', this.selectedGroupId!)
      );
      this.applyKMToColumns(data, [1]);
      new google.visualization.ColumnChart(el).draw(data, {
        legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'מחלקה' },
        vAxis: { title: 'תרומה לשינוי', format: 'short' }
      });
    });
  }
}
