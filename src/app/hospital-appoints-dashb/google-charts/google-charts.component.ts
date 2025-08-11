import { AfterViewInit, Component, HostListener, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { GoogleChartsService, HmpcRow } from '../services/google-charts.service';

type Tab = 'treemap' | 'combo' | 'leaders' | 'multi';
type LeaderSubTab = 'doctors' | 'departments';
type HmpcMode = 'kpi' | 'buckets' | 'deptDocs';

@Component({
  selector: 'app-google-charts',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css']
})
export class AppointsDashboardComponent implements AfterViewInit, OnDestroy {
  activeApptTab: Tab = 'treemap';
  leaderSubTab: LeaderSubTab = 'doctors';

  loading = true;
  error: string | null = null;

  // HorizontalMultiPeriodChart state
  hmpcMode: HmpcMode = 'kpi';
  hmpcRows: HmpcRow[] = [];

  private destroyed = false;
  private rafId: number | null = null;
  @ViewChild('hmpcRef', { static: false, read: ElementRef }) hmpcElRef!: ElementRef<any>;

  // optional: debug badge on the multi tab
  hmpcDebugCount = 0;

  constructor(private charts: GoogleChartsService, private zone: NgZone) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.charts.loadData();
      await (this.charts as any)['loadGoogleCharts']?.(); // or expose a public ensure method
      this.loading = false;
      this.drawCurrentTab();
    } catch {
      this.error = 'שגיאה בטעינת הנתונים';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.rafId != null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  onApptTabChange(tab: Tab) {
    if (this.activeApptTab === tab) return;
    this.activeApptTab = tab;
    this.redraw();
  }

  onLeaderSubTabChange(tab: LeaderSubTab) {
    if (this.leaderSubTab === tab) return;
    this.leaderSubTab = tab;
    this.redraw();
  }

  async refreshData(): Promise<void> {
    try {
      this.loading = true; this.error = null;
      await this.charts.loadData();
      if (this.destroyed) return;
      this.loading = false;
      this.redraw();
    } catch {
      if (this.destroyed) return;
      this.error = 'שגיאה ברענון הנתונים';
      this.loading = false;
    }
  }

  // sort directions for leaderboards
  dirDoctors: 'asc'|'desc' = 'desc';
  dirDepts:   'asc'|'desc' = 'desc';

  drawDoctors() {
    this.charts.drawLeaderboardDoctors('apptLeadersDoctors', this.dirDoctors);
  }
  drawDepts() {
    this.charts.drawLeaderboardDepartments('apptLeadersDepts', this.dirDepts);
  }

  private async drawCurrentTab() {
    if (this.loading || this.error) return;

    // Which containers must exist for the active tab?
    const ids =
      this.activeApptTab === 'treemap' ? ['apptTreemap'] :
      this.activeApptTab === 'combo'   ? ['apptCombo']   :
      this.activeApptTab === 'leaders'
        ? (this.leaderSubTab === 'doctors'
            ? ['apptLeadersDoctors']
            : ['apptLeadersDepts'])
        : ['hmpcHost'];

    // Wait for containers to appear in the DOM
    let tries = 0;
    while (tries++ < 40) {
      const allPresent = ids.every(id => document.getElementById(id));
      if (allPresent) break;
      await new Promise(r => setTimeout(r, 25));
    }

    // Let layout settle (avoid zero-height)
    await new Promise(r => requestAnimationFrame(() => r(null)));

    this.charts.runOutsideAngular(async () => {
      if (this.activeApptTab === 'treemap') {
        await this.charts.drawTreemap('apptTreemap');
      } else if (this.activeApptTab === 'combo') {
        await this.charts.drawComboDept('apptCombo');
      } else if (this.activeApptTab === 'leaders') {
        if (this.leaderSubTab === 'doctors') {
          this.drawDoctors();
        } else {
          this.drawDepts();
        }
      } else {
        // 'multi' (if/when you add content)
      }
    });
  }

  redraw() {
    requestAnimationFrame(() => { this.drawCurrentTab(); });
  }

  formatValue = (v: number, label?: string) => {
    if (label === 'Q') return String(v);
    if (label === 'SLA Δ') return '+' + v;
    return String(Math.round(v));
  };

  @HostListener('window:resize')
  onResize() { this.redraw(); }
}
