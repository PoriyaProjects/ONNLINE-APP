import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { GoogleChartsService } from '../services/google-charts.service';
import { environment } from 'src/environments/environment';
import { sanitizeSoapResponse, sanitizeSoapChartData } from 'src/app/shared/sanitizesoapresponce';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChangeDetectorRef, Input } from '@angular/core';

import {
  CHART_SERIES_PALETTE,
  PERIOD_TYPE_MAP,
  DEPARTMENT_BASE_PALETTE,
  DepartmentColorService,
  translateDataSource,
  translateTimeframe,
  formatToHHMM,
  buildTimeTicksFromRaw,
  buildColumnOptions,
  buildDeptDrilldown,
  stickyByMarker, PaletteService
} from '../../shared/charts-config';

interface DepartmentMetricEntry {
  period: string;
  source: string;
  aggregateDays?: number;
  avgMinutes?: number; // raw numeric (minutes or seconds)
}
interface DepartmentData {
  departName: string;
  metrics: DepartmentMetricEntry[];
}


export interface Surgery {
  surgeryId: string;
  patientNumber: string;
  surgeryName: string;
  surgeryCode: string;
  department: string;
  status: 'Planned' | 'InProgress' | 'Completed';
  timeEntrance: string;
  timeExit: string;
  surgeryDate: string;
}

export interface RoomData {
  roomId: string;
  date: string | null; 
  surgeries: Surgery[];  
}

export type LateMeta = {
  isLate: boolean;
  overrunMin: number;        // minutes past shift end
  predictedEnd: Date | null; // first late planned case end
  turnoverUsed: number;      // per-gap turnover (min), from getTurnoverSummary or 20
};


export type HeaderProgressOpts = {
  defaultTurnoverMin?: number; // default if summary is '--:--' (defaults to 20)
};

export type DisplayPreset = 'default' | 'all' | 'custom';
export type ColorMode = 'border' | 'background';
export interface DisplaySettings {
  
  showHeaderBadge: boolean;
  showHeaderIcon: boolean;
  showHeaderProgress: boolean;
  showTurnoverLines: boolean;
  showPlannedSection: boolean;
  showSurgeryName: boolean;
  showSurgeryCode: boolean;
  showDepartment: boolean;
  showTimes: boolean;
  showStatus: boolean;
  colorize: boolean;
  blinkOnUnacked: boolean;   
  showLegend: boolean;
  showHeaderMetrics?: boolean; 
  showStartChip?: boolean;
  showTurnoverChip?: boolean;
  showEndChip?: boolean;
  showStatusDot?: boolean;     // right-side status dot
  showUrgencyIcon?: boolean;   // icon near surgeryId
  colorMode: ColorMode;  
 showLateChip?: boolean;
}

export const DEFAULT_SETTINGS: DisplaySettings = {  
  showHeaderBadge: true,
  showHeaderIcon: true,
  showHeaderProgress: true,
  showTurnoverLines: true,
  showPlannedSection: true,
  showSurgeryName: true,
  showSurgeryCode: true,
  showDepartment: true,
  showTimes: true,
  showStatus: true,
  colorize: true,
  blinkOnUnacked: true, 
  showLegend: true,
  showHeaderMetrics: true,
  showStartChip: true,
  showTurnoverChip: true,
  showEndChip: true,
  showStatusDot: true,
  showUrgencyIcon: true,
  colorMode: 'border', 
};



export const ALL_ON_SETTINGS: DisplaySettings = { ...DEFAULT_SETTINGS };



@Component({
  selector: 'app-google-charts-time',
  templateUrl: './google-charts.component.html',
  styleUrls: ['./google-charts.component.css'],
  animations: [
    trigger('slideToggle', [
      state('closed', style({ height: '0', opacity: 0, overflow: 'hidden', padding: '0' })),
      state('open',   style({ height: '*', opacity: 1, overflow: 'hidden', padding: '*' })),
      transition('closed <=> open', animate('300ms ease-in-out'))
    ])
  ]
})
export class RoomTimeRTmDashboardComponent implements OnInit, AfterViewInit {
  legendMinimized = false;
  private resizeTimeout: any;
  private destroy$ = new Subject<void>();
  private ackedRooms = new Set<string>();

  departmentMap = new Map<string, DepartmentData>();
  selectedDepartmentCharts: any[] = [];

  selectedDate: string = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
  roomsData: RoomData[] = [];
  openRoom: string | null = null; // track which widget is expanded


  // --- fields ---
private _userId: string | null = null;
@Input()
get userId(): string | null { return this._userId; }
set userId(val: string | null) {
  if (this._userId === val) return;
  this._userId = val;
  this.loadDisplaySettings();   // reload per-user
  this.cdr.markForCheck();      // repaint (safe even without OnPush)
}

displayPreset: DisplayPreset = 'default';
settings: DisplaySettings = { ...DEFAULT_SETTINGS };
showDisplayPanel = false;
  
  constructor(
    public googleChartsService: GoogleChartsService,
    private deptColors: DepartmentColorService,
    public palette: PaletteService,
    private cdr: ChangeDetectorRef
  ) {}


refreshInterval: any;
countdownInterval: any;
private intervalId: any;
nextRefreshIn: number = 300; 
autoRefreshPaused = false;
lastLoaded: Date | null = null;



// storage key
private settingsKey(uid: string) { return `rtmdashb.display.${uid}`; }

// load/save
initDisplaySettings(): void { this.loadDisplaySettings(); }
private loadDisplaySettings(): void {
  if (!this.userId) {
    this.displayPreset = 'default';
    this.settings = { ...DEFAULT_SETTINGS };
    this.showDisplayPanel = false;
    return;
  }
  const raw = localStorage.getItem(this.settingsKey(this.userId));
  if (!raw) {
    this.displayPreset = 'default';
    this.settings = { ...DEFAULT_SETTINGS };
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    const saved = (parsed.settings as Partial<DisplaySettings>) || {};
    this.displayPreset = (parsed.preset as DisplayPreset) || 'custom';
    this.settings = { ...DEFAULT_SETTINGS, ...saved }; // merge with defaults
  } catch {
    this.displayPreset = 'default';
    this.settings = { ...DEFAULT_SETTINGS };
  }
}

private persistDisplaySettings(): void {
  if (!this.userId) return;
  const payload = {
    preset: this.displayPreset,
    settings: { ...this.settings } // write snapshot
  };
  localStorage.setItem(this.settingsKey(this.userId), JSON.stringify(payload));
}

// --- presets ---
applyPreset(p: DisplayPreset): void {
  this.displayPreset = p;
  this.settings =
    p === 'default' ? { ...DEFAULT_SETTINGS } :
    p === 'all'     ? { ...ALL_ON_SETTINGS } :
                      { ...this.settings }; // 'custom' keeps current values
  this.persistDisplaySettings();
  this.cdr.markForCheck();
}

// --- individual toggles ---
onSettingChange(key: keyof DisplaySettings, value: boolean): void {
  this.settings = { ...this.settings, [key]: value };
  this.displayPreset = 'custom';
  this.persistDisplaySettings();
  this.cdr.markForCheck();
}


toggleSetting(key: keyof DisplaySettings): void {
  const next = { ...this.settings } as any;
  next[key] = !this.settings[key];
  this.settings = next;
  this.displayPreset = 'custom';
  this.persistDisplaySettings();
}

// helper: card classes
getCardClasses(room: RoomData): (string | null | undefined)[] {
  return [
    this.settings.colorize ? this.getRoomStatusClassWithSettings(room) : null,
    (this.settings.colorize && this.settings.colorMode === 'background') ? 'status-mode-bg' : null,
    this.isRoomExpanded(room.roomId) ? 'active' : '',
    (!this.isRoomExpanded(room.roomId) && !this.allExpanded && this.activeRoomId && room.roomId !== this.activeRoomId) ? 'blurred' : ''
  ];
}

ngOnInit(): void {
   this.userId = (localStorage.getItem('ID') || '').trim() || null; // <-- read ID from localStorage
  this.initDisplaySettings(); 
  this.legendMinimized = localStorage.getItem('legendMinimized') === 'true';
  this.deptColors.setPalette(this.palette.getDepartmentPalette(), this.palette.name);

  // initial load
  this.loadRoomsData();
  this.startAutoRefresh();

  // auto refresh every 5 minutes
  this.refreshInterval = setInterval(() => {
    this.loadRoomsData();
    this.nextRefreshIn = 300; // reset countdown
  }, 5 * 60 * 1000);

  // countdown updater (every second)
  this.countdownInterval = setInterval(() => {
    if (this.nextRefreshIn > 0) {
      this.nextRefreshIn--;
    }
  }, 1000);
  const saved = localStorage.getItem('rooms_allExpanded');
  if (saved === 'true') this.allExpanded = true;
  if (saved === 'false') this.allExpanded = false;

   this.googleChartsService.ackAllRooms$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => this.markAllRoomsAcknowledged());

}

ngAfterViewInit(): void {


  
  
}

ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
     this.destroy$.next();
  this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
    }, 300);
  }







  toggleLegend(): void {
    this.legendMinimized = !this.legendMinimized;
    localStorage.setItem('legendMinimized', String(this.legendMinimized));
  }



  


isLoading = false;
allExpanded: boolean = false;
activeRoomId: string | null = null;

toggleAll(): void {
  this.allExpanded = !this.allExpanded;
  localStorage.setItem('rooms_allExpanded', String(this.allExpanded));

  // When globally expanded, single selection is irrelevant
  if (this.allExpanded) {
    this.activeRoomId = null;
  }
}

/** Is this room currently expanded? */
isRoomExpanded(roomId: string): boolean {
  return this.allExpanded || this.activeRoomId === roomId;
}

/** Toggle a single room only when not in global mode */
toggleRoom(roomId: string): void {
  if (this.allExpanded) return; // global override: ignore individual clicks

  this.activeRoomId = (this.activeRoomId === roomId) ? null : roomId;

  if (this.activeRoomId) {
    // Keep your side-effect
    this.acknowledgeRoomEvent(roomId);
  }
}

/** Helpful for *ngFor performance */
trackByRoomId(index: number, room: any) {
  return room.roomId;
}


private readonly ACK_NS = 'ack_'; // storage prefix
private ackCache = new Map<string, string>(); // roomId -> lastEventKey

private ackStorageKey(roomId: string): string {
  return `${this.ACK_NS}${this.storageDateKey()}:${roomId}`;
}
private legacyAckStorageKey(roomId: string): string {
  // backward compat with older versions
  return `${this.ACK_NS}${roomId}`;
}
private storageDateKey(): string {
  const d = this.selectedDate ? new Date(this.selectedDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
private lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
private lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch {}
}
private lsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

/** Compute a stable "event key" for the last surgery in a room. */
private lastEventKeyForRoom(roomId: string): string {
  const room = this.roomsData.find(r => r.roomId === roomId);
  if (!room || !room.surgeries.length) return 'empty';
  const last = room.surgeries[room.surgeries.length - 1];
  return `${last.surgeryId}_${last.status}`;
}


/** Mark a single room as acknowledged (persist + cache). */
private acknowledgeRoomEvent(roomId: string): void {
  const key = this.lastEventKeyForRoom(roomId);
  const storeKey = this.ackStorageKey(roomId);

  this.lsSet(storeKey, key);
  // clean old format if present
  this.lsRemove(this.legacyAckStorageKey(roomId));

  this.ackCache.set(roomId, key);
  // nudge change detection (esp. OnPush)
  this.roomsData = [...(this.roomsData ?? [])];
}

/** Blinking is simply "not acknowledged yet" on weekdays. */
isBlinking(room: RoomData): boolean {
  return !this.isRoomAcked(room);
}




loadRoomsData(): void {
  this.isLoading = true;
  this.googleChartsService.getSurgeryRooms(this.selectedDate).subscribe(result => {
    const rows = result.surgeries;

    const grouped = rows.reduce((acc, row) => {
      const roomId = row.SurgeryRoom;
      if (!acc[roomId]) acc[roomId] = [];
      acc[roomId].push({
        surgeryId: row.SurgeryID,
        patientNumber: row.PatientNumber,
        surgeryName: row.SurgeryName,
        surgeryCode: row.SurgeryCode,
        department: row.DepartName,
        status: row.SurgeryStatus,
        timeEntrance: row.TimeEntranceToTheOperatingRoom,
        timeExit: row.TimeExitingTheOperatingRoom,
        surgeryDate: row.SurgeryDate,
        urgency: row.Urgency
      });
      return acc;
    }, {} as Record<string, Surgery[]>);



this.roomsData = Object.keys(grouped).map(roomId => {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function sortKey(self: any, s: any, fallbackDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || fallbackDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = self.parseClockWithDate(eClock, base);
    var exit     = self.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    // Cross-midnight ⇒ make it sort as if it started yesterday
    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS;

    // Fallback by raw clocks (in case base dates are odd)
    if (xClockRaw) {
      var ep = String(eClock).split(':'), xp = String(xClockRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0]) * 60 + (+ep[1]);
        var xMin = (+xp[0]) * 60 + (+xp[1]);
        if (xMin < eMin) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  var self = this;
  var list = grouped[roomId].slice().sort(function(a, b) {
    return sortKey(self, a, self.selectedDate) - sortKey(self, b, self.selectedDate);
  });

    const roomDate = list.length ? (list[0].surgeryDate || this.selectedDate) : this.selectedDate;
  return { roomId, surgeries: list, date: roomDate };
});


 this.refreshAckCache();

    this.isLoading = false;
    this.lastLoaded = new Date();
  }, err => {
    console.error(err);
    this.isLoading = false;
  });
}



getTurnoverTime(room: RoomData): string {
  if (!room?.surgeries?.length) return '--:--';

  // חיפוש הניתוח האחרון שהסתיים
  const lastCompleted = [...room.surgeries].reverse().find(s =>
    s.status === 'Completed' && (s.timeExit || s.timeExit === '00:00:00')
  );

  if (!lastCompleted) return '--:--';

  // אם זמן סיום הוא 00:00:00 נשתמש בזמן התחלה
  const exitTime = lastCompleted.timeExit && lastCompleted.timeExit !== '00:00:00'
    ? lastCompleted.timeExit
    : lastCompleted.timeEntrance;

  const exit = this.parseClock(exitTime);
  if (!exit) return '--:--';

  // הגבלת זמן עד 15:00
  const limit = new Date(exit);
  limit.setHours(15, 0, 0, 0);
  const now = new Date();
  const endTime = now < limit ? now : limit;

  const diffMin = Math.floor((endTime.getTime() - exit.getTime()) / 60000);

  if (diffMin > 20) {
    return this.formatHM(diffMin - 20);
  }

  return '--:--';
}




getTurnoverSummary(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length || !room.date) return '--:--';

  var dayStart = this.workingStart(room.date);  // 07:30
  var dayEnd   = this.workingEnd(room.date);    // 15:00
  var DAY_MS   = 24 * 60 * 60 * 1000;

  function statusKind(raw: any): 'completed' | 'inprogress' | 'other' {
    var s = (raw == null ? '' : String(raw)).toLowerCase();
    if (s.indexOf('complete') >= 0 || s.indexOf('finished') >= 0 || s.indexOf('הסת') >= 0) return 'completed';
    if (s.indexOf('inprogress') >= 0 || s.indexOf('in progress') >= 0 || s.indexOf('ongoing') >= 0 || s.indexOf('בתהל') >= 0) return 'inprogress';
    return 'other';
  }

  // Parse "HH:mm[:ss]" anchored to a base date (no reliance on parseClockWithDate)
  function clockToDate(clock: string, baseDate: string | Date): Date | null {
    if (!clock) return null;
    var parts = String(clock).split(':');
    if (parts.length < 2) return null;
    var d = new Date(baseDate);
    var hh = +parts[0], mm = +parts[1], ss = parts.length > 2 ? +parts[2] : 0;
    if (isNaN(hh) || isNaN(mm) || isNaN(ss)) return null;
    d.setHours(hh, mm, ss, 0);
    return d;
  }

  // Build normalized intervals, handle cross-midnight, and keep only real cases overlapping the window
  var intervals: { entrance: Date; exit: Date; kind: 'completed' | 'inprogress'; sortStart: Date; }[] = [];

  for (var i = 0; i < room.surgeries.length; i++) {
    var s: any = room.surgeries[i];

    var kind = statusKind(s && s.status);
    if (kind === 'other') continue; // exclude Planned/Cancelled/etc.

    var eClock = s ? (s.timeEntrance != null ? s.timeEntrance : (s as any).TimeEntranceToTheOperatingRoom) : null;
    var xRaw   = s ? (s.timeExit     != null ? s.timeExit     : (s as any).TimeExitingTheOperatingRoom) : null;
    if (!eClock) continue;

    var base   = s ? (s.surgeryDate  != null ? s.surgeryDate  : (s as any).SurgeryDate) : null;
    var anchor = base || room.date;

    var entrance = clockToDate(eClock, anchor);
    var exit     = clockToDate((xRaw && xRaw !== '00:00:00') ? xRaw : eClock, anchor);
    if (!entrance || !exit) continue;

    // Cross-midnight: finished after midnight → push exit +1 day
    if (exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

    // Overlap with work window?
    var overlaps = (entrance < dayEnd) && (exit > dayStart);
    if (!overlaps) continue;

    // Sort key: if raw clocks imply exit<entrance (cross-midnight), pretend the start was "yesterday"
    var sortStart = entrance;
    if (xRaw && xRaw !== '00:00:00') {
      var ep = String(eClock).split(':'), xp = String(xRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0]) * 60 + (+ep[1]);
        var xMin = (+xp[0]) * 60 + (+xp[1]);
        if (xMin < eMin) sortStart = new Date(entrance.getTime() - DAY_MS);
      }
    }

    intervals.push({ entrance: entrance, exit: exit, kind: kind, sortStart: sortStart });
  }

  // Nothing to compute?
  if (!intervals.length) return '--:--';

  // Correct order (cross-midnight first)
  intervals.sort(function(a, b){ return a.sortStart.getTime() - b.sortStart.getTime(); });

  // Sum turnover gaps (>20 min) between consecutive intervals inside the window
  var total = 0;
  for (var j = 0; j < intervals.length - 1; j++) {
    var curEnd   = clampToWindow(intervals[j].exit,   dayStart, dayEnd);
    var nextBeg  = clampToWindow(intervals[j+1].entrance, dayStart, dayEnd);
    var gap = Math.max(0, Math.floor((nextBeg.getTime() - curEnd.getTime()) / 60000));
    if (gap > 20) total += (gap - 20);
  }

  // If the last *entry* is Completed (not InProgress), add idle from its exit to now/end-of-day
  var last = intervals[intervals.length - 1];
  if (last.kind === 'completed') {
    var lastExit = clampToWindow(last.exit, dayStart, dayEnd);
    var now = new Date();
    var end = clampToWindow(now < dayEnd ? now : dayEnd, dayStart, dayEnd);
    var idle = Math.max(0, Math.floor((end.getTime() - lastExit.getTime()) / 60000));
    if (idle > 20) total += (idle - 20);
  }

  return total > 0 ? this.formatHM(total) : '--:--';

  // use the instance method if you prefer; keeping a local to be explicit
  function clampToWindow(d: Date, start: Date, end: Date): Date {
    return new Date(Math.min(end.getTime(), Math.max(start.getTime(), d.getTime())));
  }
}



private workingStart(): Date;
private workingStart(baseDate: string | Date): Date;
private workingStart(baseDate?: string | Date): Date {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(7, 30, 0, 0);  // 07:30
  return d;
}

private workingEnd(): Date;
private workingEnd(baseDate: string | Date): Date;
private workingEnd(baseDate?: string | Date): Date {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(15, 0, 0, 0); // 15:00
  return d;
}
private clampToWindow(d: Date, start: Date, end: Date): Date {
  return new Date(Math.min(end.getTime(), Math.max(start.getTime(), d.getTime())));
}


getTurnoverClass(room: RoomData): string {
  const t = this.getTurnoverTime(room);
  if (!t || t === '--:--') return '';
  const [h, m] = t.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red-strong';
  if (minutes > 60) return 'metric-red';
  if (minutes > 45) return 'metric-orange';
  if (minutes > 20) return 'metric-yellow';
  return 'metric-ok';
}

getTurnoverTimeClass(room: RoomData): string {
  const value = this.getTurnoverTime(room);
  if (!value || value === '--:--') return 'neutral';

  const [h, m] = value.split(':').map(Number);
  const minutes = h * 60 + m;

   if (minutes >= 120) return 'severe';    // 🔴 pulsing red
  if (minutes >= 60)  return 'critical';  // 🔴
  if (minutes >= 45)  return 'bad';       // 🟠/🔴
  if (minutes > 20)   return 'warning';   // 🟡
  return 'ok';
}


// Example comparator you can use wherever you build the display list:
sortByChronologicalStart(a: any, b: any, roomDate: string | Date): number {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function clockToDate(clk: string, base: any) { return this.parseClockWithDate(clk, base); }

  function sortKey(s: any, baseDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || baseDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = this.parseClockWithDate(eClock, base);
    var exit = this.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    // cross-midnight → push start one day earlier so it sorts first
    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS;

    // also check raw clocks to be safe
    if (xClockRaw) {
      var eParts = String(eClock).split(':'), xParts = String(xClockRaw).split(':');
      if (eParts.length >= 2 && xParts.length >= 2) {
        var eNum = (+eParts[0]) * 60 + (+eParts[1]);
        var xNum = (+xParts[0]) * 60 + (+xParts[1]);
        if (xNum < eNum) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  var ka = sortKey.call(this, a, roomDate);
  var kb = sortKey.call(this, b, roomDate);
  return ka - kb;
}

sortSurgeriesForDisplay(surgeries: any[], roomDate: string | Date): any[] {
  var DAY_MS = 24 * 60 * 60 * 1000;

  function sortKey(self: any, s: any, baseDate: any): number {
    var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
    var xClockRaw = s && (s.timeExit != null ? s.timeExit : s.TimeExitingTheOperatingRoom);
    var base = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || baseDate;
    if (!eClock) return Number.POSITIVE_INFINITY;

    var entrance = self.parseClockWithDate(eClock, base);
    var exit     = self.parseClockWithDate((xClockRaw && xClockRaw !== '00:00:00') ? xClockRaw : eClock, base);
    if (!entrance || !exit) return Number.POSITIVE_INFINITY;

    if (exit.getTime() < entrance.getTime()) return entrance.getTime() - DAY_MS; // cross-midnight → first

    if (xClockRaw) { // fallback based on raw clocks
      var ep = String(eClock).split(':'), xp = String(xClockRaw).split(':');
      if (ep.length >= 2 && xp.length >= 2) {
        var eMin = (+ep[0])*60 + (+ep[1]);
        var xMin = (+xp[0])*60 + (+xp[1]);
        if (xMin < eMin) return entrance.getTime() - DAY_MS;
      }
    }
    return entrance.getTime();
  }

  // `this` needed for parseClockWithDate
  var self = this;
  return (surgeries || []).slice().sort(function(a,b){
    return sortKey(self, a, roomDate) - sortKey(self, b, roomDate);
  });
}


getRoomStatusClass(room: RoomData): string {
  if (!room || !room.surgeries?.length) return 'grey';

  const isWeekend = this.isWeekend(room.date);

  // Any surgery in progress: green (no blink on weekends)
  if (room.surgeries.some(s => s.status === 'InProgress')) {
    return isWeekend ? 'green' : 'green-blink';
  }

  // Last completed surgery with a real exit time
  const lastCompleted = [...room.surgeries].reverse().find(
    s => s.status === 'Completed' && s.timeExit && s.timeExit !== '00:00:00'
  );
  if (!lastCompleted) return 'grey';

  // Use the room's date to anchor the time so we don't miscount across days
  //const exitAt = this.parseClock(lastCompleted.timeExit, room.date);
  const exitAt = this.parseClockWithDate(lastCompleted.timeExit, room.date);

  if (!exitAt) return 'grey';

  const diffMin = Math.max(0, (Date.now() - exitAt.getTime()) / 60000);

  // Weekends: never blink, always show the -ack variants for red thresholds
  if (isWeekend) {
    if (diffMin > 120) return 'red-120-ack';
    if (diffMin > 60)  return 'red-60-ack';
    if (diffMin > 45)  return 'red-45-ack';
    return 'grey';
  }

  // Weekdays: blink only if NOT acknowledged
  const isAcked = this.isRoomAcked(room);
  if (diffMin > 120) return isAcked ? 'red-120-ack' : 'red-120';
  if (diffMin > 60)  return isAcked ? 'red-60-ack'  : 'red-60';
  if (diffMin > 45)  return isAcked ? 'red-45-ack'  : 'red-45';
  return 'grey';
}

/** Fri/Sat treated as weekend (JS getDay: Sun=0..Sat=6). */
private isWeekend(dateLike?: string | Date): boolean {
  const d = dateLike ? new Date(dateLike) : new Date();
  const day = d.getDay();
  return day === 5 || day === 6;
}






getStartDiffClass(room: RoomData): string {
  const val = this.getStartDiff(room);
  if (!val || val === '--:--') return '';
  const [h, m] = val.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 60) return 'metric-red';
  if (minutes > 30) return 'metric-orange';
  if (minutes > 15) return 'metric-yellow';
  return 'metric-ok';
}




private isRealCase(s?: Surgery): boolean {
  return !!s && (s.status === 'Completed' || s.status === 'InProgress');
}

private toInterval(s: Surgery, baseDate?: string | Date) {
  // parse entrance/exit anchored to the room date
  const eClock = s.timeEntrance;
  const xClock = s.timeExit && s.timeExit !== '00:00:00' ? s.timeExit : s.timeEntrance;

  const entrance = eClock ? this.parseClockWithDate(eClock, baseDate ?? s.surgeryDate) : null;
  let exit      = xClock ? this.parseClockWithDate(xClock, baseDate ?? s.surgeryDate) : null;

  // midnight rollover
  if (entrance && exit && exit.getTime() < entrance.getTime()) {
    exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
  }
  return { entrance, exit: exit ?? entrance };
}

private overlapsWindow(entrance: Date | null, exit: Date | null, start: Date, end: Date): boolean {
  if (!entrance || !exit) return false;
  return entrance < end && exit > start; // any overlap
}

getTurnoverBetween(prev: Surgery, next: Surgery): string | null {
  // ignore non-real (Planned/Scheduled/Cancelled) pairs
  if (!this.isRealCase(prev) || !this.isRealCase(next)) return null;

  // anchor window to the room/date of the pair
  const baseDate = next.surgeryDate ?? prev.surgeryDate ?? this.selectedDate;
  const dayStart = this.workingStart(baseDate); // 07:30 on that date
  const dayEnd   = this.workingEnd(baseDate);   // 15:00 on that date

  const p = this.toInterval(prev, baseDate);
  const n = this.toInterval(next, baseDate);
  if (!p.entrance || !p.exit || !n.entrance || !n.exit) return null;

  
  if (!this.overlapsWindow(p.entrance, p.exit, dayStart, dayEnd)) return null;
  if (!this.overlapsWindow(n.entrance, n.exit, dayStart, dayEnd)) return null;

  // inside-window endpoints
  const prevEnd   = this.clampToWindow(p.exit, dayStart, dayEnd);
  const nextStart = this.clampToWindow(n.entrance, dayStart, dayEnd);

  const gap = this.minutesBetween(prevEnd, nextStart);
  if (gap <= 20) return null;            // baseline turnover
  return this.formatHM(gap - 20);
}



getTurnoverBetweenClass(prev: Surgery, next: Surgery): string {
  const raw = this.getTurnoverBetween(prev, next);
  if (!raw) return '';

  const [h, m] = raw.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red blink';
  if (minutes > 60)  return 'metric-red';
  if (minutes > 45)  return 'metric-orange';
  return 'metric-yellow';
}


// Hebrew + English detection
private isInProgress(raw: any): boolean {
  var s = (raw == null ? '' : String(raw)).toLowerCase();
  return s === 'inprogress' || s === 'in progress' || s.indexOf('בתהל') >= 0;
}

private getSurgeryIdFromAny(s: any): string {
  if (!s) return '';
  if (s.surgeryId != null && s.surgeryId !== '') return String(s.surgeryId);
  if (s.SurgeryID != null && s.SurgeryID !== '') return String(s.SurgeryID);
  return '';
}

private entranceMillisForSort(s: any, roomDate: string | Date): number {
  var eClock = s && (s.timeEntrance != null ? s.timeEntrance : s.TimeEntranceToTheOperatingRoom);
  var base   = (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) || roomDate;
  var d = eClock ? this.parseClockWithDate(eClock, base) : null;
  return d ? d.getTime() : -Infinity;
}

/** Returns the ID of the currently InProgress surgery (latest started if >1). */
getHeaderInProgressId(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return '';

  // Collect InProgress candidates
  var inProg: any[] = [];
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    var status = (s && s.status != null ? s.status : (s && s.status));
    if (this.isInProgress(status)) inProg.push(s);
  }

  if (!inProg.length) return ''; // nothing in progress

  // If multiple, pick the one with the latest entrance time
  var picked = inProg.slice().sort((a, b) =>
    this.entranceMillisForSort(b, room.date || this.selectedDate) -
    this.entranceMillisForSort(a, room.date || this.selectedDate)
  )[0];

  return this.getSurgeryIdFromAny(picked) || '';
}



  // --------- utility helpers ----------

  private parseClock(t: string): Date | null {
  if (!t || typeof t !== 'string') return null;
  const parts = t.split(':').map(n => Number(n));
  if (parts.length < 2 || parts.some(isNaN)) return null;
  const [h, m, s = 0] = parts;
  const d = new Date();
  d.setHours(h, m, s, 0);
  return isNaN(d.getTime()) ? null : d;
}

private parseClockWithDate(clock: string, baseDate?: string | Date): Date | null {
  const t = this.parseClock(clock); // your original 1-arg function
  if (!t) return null;
  if (!baseDate) return t;

  const base = new Date(baseDate);
  base.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
  return base;
}

private formatDiff(ms: number): string {
  if (isNaN(ms)) return '--:--';
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  return `${sign}${('0'+h).slice(-2)}:${('0'+m).slice(-2)}`;
}



getStartDiff(room: RoomData): string {
  const safeStart = this.parseClock('07:00');
  const safeEnd = this.parseClock('07:30');
  if (!safeStart || !safeEnd) return '--:--';

  if (!room.surgeries || room.surgeries.length === 0) return '--:--';

  // Sort surgeries by entrance time just in case
  const sortedSurgeries = room.surgeries
    .map(s => ({ ...s, entrance: this.parseClock(s.timeEntrance) }))
    .filter(s => s.entrance) // remove invalid times
    .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

  // Check for surgery inside safe zone
  const firstInSafeZone = sortedSurgeries.find(
    s => s.entrance! >= safeStart && s.entrance! <= safeEnd
  );
  if (firstInSafeZone) return '00:00';

  // Otherwise, take first surgery after safe zone
  const firstAfterSafeZone = sortedSurgeries.find(
    s => s.entrance! > safeEnd
  );

  if (!firstAfterSafeZone) return '--:--';

  const diffMs = firstAfterSafeZone.entrance!.getTime() - safeEnd.getTime();
  return this.formatDiff(diffMs);
}

getEndDiff(room: RoomData): string {
  const opening = this.parseClock('07:30');
  const closing = this.parseClock('14:40'); 
  if (!closing || !opening) return '--:--';

  // collect exits from opening onwards (don't exclude > closing)
  const exits = room.surgeries
    .map(s => {
      const exitStr = s.timeExit && s.timeExit !== '00:00:00' ? s.timeExit : s.timeEntrance;
      return this.parseClock(exitStr);
    })
    .filter((d): d is Date => !!d && d >= opening)
    .sort((a, b) => a.getTime() - b.getTime());

  if (exits.length === 0) return this.formatDiff(0);

  const lastExit = exits[exits.length - 1];

  // later surgery ends after closing → no underutilization counted
  if (lastExit >= closing) return this.formatDiff(0);

  // otherwise: time from last exit until closing
  const diffMs = closing.getTime() - lastExit.getTime();
  return this.formatDiff(diffMs);
}

getEndDiffClass(room: RoomData): string {
  const val = this.getEndDiff(room);
  if (!val || val === '--:--') return '';
  const [h, m] = val.split(':').map(Number);
  const minutes = h * 60 + m;

  if (minutes > 120) return 'metric-red';
  if (minutes > 60)  return 'metric-orange';
  if (minutes > 30)  return 'metric-yellow';
  return 'metric-ok';
}



plannedSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status === 'Planned');
}

activeSurgeries(room: RoomData): Surgery[] {
  return room.surgeries.filter(s => s.status !== 'Planned');
}




formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

manualRefresh(): void {
  this.loadRoomsData();
  this.nextRefreshIn = 300; // reset countdown
}

toggleAutoRefresh(): void {
  this.autoRefreshPaused = !this.autoRefreshPaused;
  if (this.autoRefreshPaused) {
    this.clearIntervals();
  } else {
    this.startAutoRefresh();
  }
}

private startAutoRefresh(): void {
  this.clearIntervals();
  this.nextRefreshIn = 300;

  this.refreshInterval = setInterval(() => {
    if (!this.autoRefreshPaused) {
      this.loadRoomsData();
      this.nextRefreshIn = 300;
    }
  }, 5 * 60 * 1000);

  this.countdownInterval = setInterval(() => {
    if (!this.autoRefreshPaused && this.nextRefreshIn > 0) {
      this.nextRefreshIn--;
    }
  }, 1000);
}

private clearIntervals(): void {
  if (this.refreshInterval) clearInterval(this.refreshInterval);
  if (this.countdownInterval) clearInterval(this.countdownInterval);
}

onDateChange(): void {
  // pause auto refresh
  if (!this.autoRefreshPaused) {
    this.autoRefreshPaused = true;
    this.clearIntervals();
  }

  // load data for the selected date
  this.loadRoomsData();
}


private openingOfDay(): Date {
  const d = new Date();
  d.setHours(7, 30, 0, 0);
  return d;
}

private closingOfDay(): Date {
  const d = new Date();
  d.setHours(15, 0, 0, 0);
  return d;
}

private clampToDay(d: Date): Date {
  const open = this.openingOfDay().getTime();
  const close = this.closingOfDay().getTime();
  return new Date(Math.min(close, Math.max(open, d.getTime())));
}

private minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60000));
}

private formatHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}`;
}



statusTranslations: Record<string, string> = {
  'Completed': 'הסתיים',
  'InProgress': 'בתהליך',
  'Scheduled': 'מתוכנן',
  'Cancelled': 'בוטל', 
  'Planned' : 'מתוכנן'
};

translateStatus(status: string): string {
  return this.statusTranslations[status] || status;
}


acknowledgeAllRooms(): void {
  this.googleChartsService.triggerAcknowledgeAllRooms();

  for (const r of this.roomsData ?? []) {
    if (!r?.roomId) continue;
    const key = this.lastEventKeyForRoom(r.roomId);
    const storeKey = this.ackStorageKey(r.roomId);
    this.lsSet(storeKey, key);
    this.lsRemove(this.legacyAckStorageKey(r.roomId));
    this.ackCache.set(r.roomId, key);
  }

  // trigger change detection if using OnPush
  this.roomsData = [...(this.roomsData ?? [])];
  console.log('acknowledged all rooms');
}


private refreshAckCache(): void {
  this.ackCache.clear();
  for (const r of this.roomsData ?? []) {
    const stored =
      this.lsGet(this.ackStorageKey(r.roomId)) ??
      this.lsGet(this.legacyAckStorageKey(r.roomId));
    if (stored) this.ackCache.set(r.roomId, stored);
  }
}
// actually mark them
private markAllRoomsAcknowledged(): void {
  for (const r of this.roomsData ?? []) {
    if (r?.roomId) this.ackedRooms.add(r.roomId);
  }
  // trigger change detection if using OnPush
  this.roomsData = [...(this.roomsData ?? [])];
}

// helper
private isRoomAcked(room: RoomData): boolean {
  if (!room?.roomId) return false;

  const currentKey = this.lastEventKeyForRoom(room.roomId);
  // prefer cache, then storage (new), then legacy storage (old key)
  const storedKey =
    this.ackCache.get(room.roomId) ??
    this.lsGet(this.ackStorageKey(room.roomId)) ??
    this.lsGet(this.legacyAckStorageKey(room.roomId));

  return !!storedKey && storedKey === currentKey;
}


private readonly PLANNED_SET = new Set(['Planned', 'Scheduled']);

trackBySurgeryId = (_: number, s: Surgery) => s?.surgeryId ?? _;



// Optional explicit mappings take priority over heuristics:
private roomNameOverrides: Record<string, string> = {
  'פז01-201': 'חדר ניתוח 1',  
  'פז01-202': 'חדר ניתוח 2',
  'פז01-203': 'חדר ניתוח 3',
  'פז01-204': 'חדר ניתוח 4',
  'פז01-205': 'חדר ניתוח 5',
  'פז01-206': 'חדר ניתוח 6',
  'פז01-207': 'חדר ניתוח 7',
};

translateRoomId(id?: string): string {
  if (!id) return '';

  // Exact override first
  const hit = this.roomNameOverrides[id];
  if (hit) return hit;

  // Heuristic: take the first segment before '-' and extract 1–2 digit room number
  const norm = String(id).trim();
  const firstSeg = norm.split(/[-–—]/)[0]; // handles '-', en/em dashes
  let numStr: string | null = null;

  // Prefer the last 1–2 digit sequence in the first segment (e.g., "פז01" -> "01")
  const m1 = firstSeg.match(/(\d{1,2})(?!.*\d)/);
  if (m1) numStr = m1[1];

  // Fallback: any standalone 1–2 digit number in the whole string
  if (!numStr) {
    const m2 = norm.match(/\b(0?[1-9]|[1-9]\d)\b/);
    if (m2) numStr = m2[1];
  }

  if (numStr) {
    const n = parseInt(numStr, 10);
    if (!Number.isNaN(n)) return `חדר ניתוח ${n}`;
  }

  // Last resort: show the original code
  return norm;
}



hasActionAfterWorkingStart(room: RoomData): boolean {
  if (!room?.surgeries?.length) return false;
  const ws = this.workingStart(room.date);
  return room.surgeries.some(s => {
    if (!s?.timeEntrance) return false;
    const entrance = this.parseClockWithDate(s.timeEntrance, room.date);
    if (!entrance || entrance < ws) return false;
    return s.status === 'InProgress' || s.status === 'Completed';
  });
}


private isBeforeToday(dateLike?: string | Date): boolean {
  if (!dateLike) return false;                // no date => treat as today
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateLike); d.setHours(0,0,0,0);
  return d.getTime() < today.getTime();
}

/** Show start delay if date is in the past, or if no action has started yet today */
shouldShowStartDiff(room: RoomData): boolean {
  const baseDate = room?.date ?? this.selectedDate;  // prefer room date; fallback to selected date
  if (this.isBeforeToday(baseDate)) return true;
  return !this.hasActionAfterWorkingStart(room);
}



// Recognize "InProgress" in EN/Hebrew without touching SurgeryStatus
private isInProgressStatus(raw: any): boolean {
  var s = (raw == null ? '' : String(raw)).toLowerCase().trim();
  return s === 'inprogress' || s === 'in progress' || s.indexOf('בתהל') >= 0;
}

private getSurgeryIdSafe(s: any): string {
  // Use the typed field first; fall back to raw only via `any` cast to avoid TS errors
  if (s && s.surgeryId != null && s.surgeryId !== '') return String(s.surgeryId);
  var rawId = s ? (s as any).SurgeryID : null;
  return rawId != null && rawId !== '' ? String(rawId) : '—';
}

private entranceMillisForSortSafe(s: any, roomDate: string | Date): number {
  var eClock = s ? (s.timeEntrance != null ? s.timeEntrance : (s as any).TimeEntranceToTheOperatingRoom) : null;
  var base   = s ? (s.surgeryDate != null ? s.surgeryDate : (s as any).SurgeryDate) : null;
  var anchor = base || roomDate;
  var d = eClock ? this.parseClockWithDate(eClock, anchor) : null;
  return d ? d.getTime() : -Infinity;
}

/** Returns "ID" of the latest-started InProgress surgery, or "פנוי" if none. */
getHeaderInProgressLabel(room: RoomData): string {
  if (!room || !room.surgeries || !room.surgeries.length) return 'פנוי';

  // Filter only by the typed `status` field (no SurgeryStatus)
  var inProg: any[] = [];
  for (var i = 0; i < room.surgeries.length; i++) {
    var s = room.surgeries[i];
    // if (this.isInProgressStatus(s && s.status)) inProg.push(s);
    if (s && this.isInProgressStatus(s.status)) inProg.push(s);
  }
  if (!inProg.length) return 'פנוי';

  // If multiple InProgress, pick the one with the latest entrance time
  var picked = inProg.slice().sort((a, b) =>
    this.entranceMillisForSortSafe(b, room.date || this.selectedDate) -
    this.entranceMillisForSortSafe(a, room.date || this.selectedDate)
  )[0];

  return this.getSurgeryIdSafe(picked);
}







// getHeaderProgressText(room: RoomData): string {
//   let nInShift = 0;   // completed/in-progress within shift
//   let xInShift = 0;   // total within shift
//   let xOnDay   = 0;   // total on the calendar day (00:00–23:59:59.999)

//   if (!room || !room.surgeries?.length) return '0 מתוך 0';

//   const baseDate   = room.date || this.selectedDate;
//   const day        = new Date(baseDate);
//   const dayStart   = new Date(day); dayStart.setHours(0, 0, 0, 0);
//   const dayEnd     = new Date(day); dayEnd.setHours(23, 59, 59, 999);
//   const shiftStart = this.workingStart(baseDate); // 07:30
//   const shiftEnd   = this.workingEnd(baseDate);   // 15:00
//   const DAY_MS     = 24 * 60 * 60 * 1000;

//   // Fixed turnover/setup time between cases (minutes)
//   const TURNOVER_MIN = 20;

//   const isZeroClock = (v?: string) => v === '00:00' || v === '00:00:00';

//   type Norm = {
//     entrance: Date | null;
//     exit: Date | null;            // actual/scheduled exit if present
//     expectedMin: number | null;   // TimeSurgeryToDo or fallback
//     status: string;               // lowercased
//     raw: any;
//   };

//   const list: Norm[] = [];

//   for (const sAny of room.surgeries as any[]) {
//     const s = sAny || {};

//     // Accept both camelCase and server PascalCase keys
//     const eClock = s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom;
//     if (!eClock) continue;

//     const xRaw = s.timeExit ?? s.TimeExitingTheOperatingRoom;
//     const base = s.surgeryDate ?? s.SurgeryDate ?? baseDate;

//     let entrance = this.parseClockWithDate(eClock, base);
//     let exit     = xRaw && !isZeroClock(xRaw) ? this.parseClockWithDate(xRaw, base) : null;

//     if (!entrance) continue;
//     if (exit && exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

//     const status = String(s.status ?? s.SurgeryStatus ?? '').toLowerCase();

//     // Expected duration (minutes): prefer TimeSurgeryToDo, else scheduled diff if both ends exist
//     let expectedMin: number | null = null;
//     const ttd = s.TimeSurgeryToDo ?? s.timeSurgeryToDo;
//     if (ttd != null && !isNaN(+ttd)) expectedMin = Math.max(0, Math.round(+ttd));
//     if (expectedMin == null && exit) {
//       expectedMin = Math.max(0, Math.round((exit.getTime() - entrance.getTime()) / 60000));
//     }

//     list.push({ entrance, exit, expectedMin, status, raw: s });

//     // ---------- Counting for header ----------
//     const endForCount = exit ?? entrance; // if no exit, treat as instant at entrance
//     const overlapsDay   = (entrance < dayEnd)   && (endForCount > dayStart);
//     const overlapsShift = (entrance < shiftEnd) && (endForCount > shiftStart);

//     if (overlapsDay)   xOnDay++;
//     if (overlapsShift) {
//       xInShift++;
//       if (status === 'completed' || status === 'inprogress' || status === 'in progress' || status === 'in_progress') {
//         nInShift++;
//       }
//     }
//   }

//   // ---------- Late-finish prediction (propagate delays across this room’s queue) ----------
//   list.sort((a, b) => {
//     if (!a.entrance && !b.entrance) return 0;
//     if (!a.entrance) return 1;
//     if (!b.entrance) return -1;
//     return a.entrance.getTime() - b.entrance.getTime();
//   });

//   let cursor: Date | null = null;
//   let warnLate = false;

//   for (const s of list) {
//     if (!cursor) cursor = s.entrance ? new Date(s.entrance) : new Date(shiftStart);

//     // predicted start = max(scheduled entrance, when the room actually becomes free)
//     const startPred = s.entrance ? new Date(Math.max(s.entrance.getTime(), cursor.getTime())) : new Date(cursor);

//     // Use actual duration when both entrance & exit exist; otherwise expected; default 60
//     let durMin: number;
//     if (s.exit && s.entrance) {
//       durMin = Math.max(0, Math.round((s.exit.getTime() - s.entrance.getTime()) / 60000));
//     } else {
//       durMin = s.expectedMin ?? 60;
//     }

//     const endPred = new Date(startPred.getTime() + (durMin + TURNOVER_MIN) * 60000);

//     // room becomes free (including turnover) for the next case
//     cursor = endPred;

//     // Alert if any Planned case is predicted to finish past shift end
//     if (s.status === 'planned' && endPred > shiftEnd) {
//       warnLate = true;
//     }
//   }

//   const outOfShift = Math.max(0, xOnDay - xInShift);
//   let result = `${nInShift} מתוך ${xInShift}`;
//   if (outOfShift > 0) result += ` (${outOfShift} מחוץ לשעות העבודה)`;
//   if (warnLate) result = `⚠️ ${result}`;

//   return result;
// }



// Optional options if you later want to override behavior without changing code


getHeaderProgressText(room: RoomData, opts?: HeaderProgressOpts): string {
  let nInShift = 0;   // completed/in-progress within shift
  let xInShift = 0;   // total within shift
  let xOnDay   = 0;   // total on the calendar day (00:00–23:59:59.999)

  if (!room || !room.surgeries?.length) return '0 מתוך 0';

  const baseDate   = room.date || this.selectedDate;
  const day        = new Date(baseDate);
  const dayStart   = new Date(day); dayStart.setHours(0, 0, 0, 0);
  const dayEnd     = new Date(day); dayEnd.setHours(23, 59, 59, 999);
  const shiftStart = this.workingStart(baseDate); // 07:30
  const shiftEnd   = this.workingEnd(baseDate);   // 15:00
  const DAY_MS     = 24 * 60 * 60 * 1000;

  // -------- Turnover from your code --------
  const DEFAULT_TURNOVER = Math.max(0, opts?.defaultTurnoverMin ?? 20);
  const summaryStr = this.getTurnoverSummary(room);   // e.g. '01:27' or '--:--'
  const parsedMin  = hmToMin(summaryStr);
  const TURNOVER_MIN = Math.max(20, parsedMin ?? DEFAULT_TURNOVER); // clamp to >=20

  const isZeroClock = (v?: string) => v === '00:00' || v === '00:00:00';

  type Norm = {
    entrance: Date | null;
    exit: Date | null;            // actual/scheduled exit if present
    expectedMin: number | null;   // TimeSurgeryToDo or fallback
    status: string;               // lowercased
    raw: any;
  };

  const list: Norm[] = [];

  // --- Normalize and collect rows ---
  for (const sAny of room.surgeries as any[]) {
    const s = sAny || {};

    // Accept both camelCase and server PascalCase keys
    const eClock = s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom;
    if (!eClock) continue;

    const xRaw = s.timeExit ?? s.TimeExitingTheOperatingRoom;
    const base = s.surgeryDate ?? s.SurgeryDate ?? baseDate;

    let entrance = this.parseClockWithDate(eClock, base);
    let exit     = xRaw && !isZeroClock(xRaw) ? this.parseClockWithDate(xRaw, base) : null;

    if (!entrance) continue;
    if (exit && exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

    const status = String(s.status ?? s.SurgeryStatus ?? '').toLowerCase();

    // Expected duration (minutes): prefer TimeSurgeryToDo, else scheduled diff if both ends exist
    let expectedMin: number | null = null;
    const ttd = s.TimeSurgeryToDo ?? s.timeSurgeryToDo;
    if (ttd != null && !isNaN(+ttd)) expectedMin = Math.max(0, Math.round(+ttd));
    if (expectedMin == null && exit) {
      expectedMin = Math.max(0, Math.round((exit.getTime() - entrance.getTime()) / 60000));
    }

    list.push({ entrance, exit, expectedMin, status, raw: s });

    // ---- Counting for header (shift window only) ----
    const endForCount = exit ?? entrance; // if no exit, treat as instant at entrance
    const overlapsDay   = (entrance < dayEnd)   && (endForCount > dayStart);
    const overlapsShift = (entrance < shiftEnd) && (endForCount > shiftStart);

    if (overlapsDay)   xOnDay++;
    if (overlapsShift) {
      xInShift++;
      if (status === 'completed' || status === 'inprogress' || status === 'in progress' || status === 'in_progress') {
        nInShift++;
      }
    }
  }

  // --- Propagate delays to predict late finishes ---
  list.sort((a, b) => {
    if (!a.entrance && !b.entrance) return 0;
    if (!a.entrance) return 1;
    if (!b.entrance) return -1;
    return a.entrance.getTime() - b.entrance.getTime();
  });

  let cursor: Date | null = null; // "room free at" time including turnover
  let warnLate = false;

  for (const s of list) {
    if (!cursor) cursor = s.entrance ? new Date(s.entrance) : new Date(shiftStart);

    // predicted start = max(scheduled entrance, room-next-free)
    const startPred = s.entrance ? new Date(Math.max(s.entrance.getTime(), cursor.getTime())) : new Date(cursor);

    // duration:
    // - actual if entrance+exit exist
    // - else expected (TimeSurgeryToDo), default 60 if missing
    let durMin: number;
    if (s.exit && s.entrance) {
      durMin = Math.max(0, Math.round((s.exit.getTime() - s.entrance.getTime()) / 60000));
    } else {
      durMin = s.expectedMin ?? 60;
    }

    const endSurgeryPred = new Date(startPred.getTime() + durMin * 60000);           // surgery end
    const roomFreeAt     = new Date(endSurgeryPred.getTime() + TURNOVER_MIN * 60000); // + turnover
    cursor = roomFreeAt;

    // Planned surgery finishing after shift → raise alert
    if (s.status === 'planned' && endSurgeryPred > shiftEnd) {
      warnLate = true;
    }
  }

  // --- Compose header text ---
  const outOfShift = Math.max(0, xOnDay - xInShift);
  let result = `${nInShift} מתוך ${xInShift}`;
  if (outOfShift > 0) result += ` (${outOfShift} מחוץ לשעות העבודה)`;
  //if (warnLate) result = `⚠️ ${result}`;
  if (warnLate) result = `${result}`;

  return result;

  // ---- helpers ----
  function hmToMin(s?: string | null): number | null {
    if (!s || s === '--:--') return null;
    const p = s.split(':').map(Number);
    if (p.length < 2 || p.some(isNaN)) return null;
    return p[0] * 60 + p[1];
  }
}



/** Compare two dates by local Y/M/D (no timezone surprises). */
private isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth() &&
         a.getDate()     === b.getDate();
}

/** True if this room’s date is today (fallback to selectedDate if missing). */
isRoomToday(room: RoomData): boolean {
  const base = room && room.date ? new Date(room.date) : new Date(this.selectedDate);
  const now  = new Date();
  return this.isSameLocalDay(base, now);
}


// Map raw 'Urgency' text to an icon
private urgencyIconRaw(u: any): string {
  var s = (u == null ? '' : String(u)).trim();
  if (!s) return '';
  var low = s.toLowerCase();

  // Hebrew / English hints
  if (s.indexOf('דחוף') >= 0 || low.indexOf('urgent') >= 0) return '🚑';     // or '⚠️'
  if (s.indexOf('ססיה') >= 0 || s.indexOf('אשפוז') >= 0 || low.indexOf('inpatient') >= 0) return '🏥';
  if (s.indexOf('אלקטיב') >= 0 || low.indexOf('elect') >= 0) return '📖';
  if (s.indexOf('ללא עדיפות') >= 0 || low.indexOf('no priority') >= 0 || low.indexOf('none') >= 0 || low.indexOf('routine') >= 0) return '⬇️';
  if (s.indexOf('אמבולטורי') >= 0 || low.indexOf('ambulatory') >= 0 || low.indexOf('outpatient') >= 0) return '🚶';
  return '';
}


getUrgencyIconFromSurgery(s: any): string {
  if (!s) return '';
  var u = (s.urgency != null ? s.urgency : (s as any).Urgency);
  return this.urgencyIconRaw(u);
}




getHeaderProgressIcon(room: RoomData): string {
  if (!room?.surgeries?.length) return '';

  const anchor = room.date || this.selectedDate;
  const dayStart = this.workingStart(anchor);
  const dayEnd   = this.workingEnd(anchor);
  const DAY_MS   = 24 * 60 * 60 * 1000;

  const parse = (clk?: string, base?: any): Date | null =>
    clk ? this.parseClockWithDate(clk, base) : null;

  const overlaps = (e: Date, x: Date): boolean => e < dayEnd && x > dayStart;

  const startTs = (s: any): number => {
    const base = s.surgeryDate || anchor;
    let e = parse(s.timeEntrance, base);
    let x = parse((s.timeExit && s.timeExit !== '00:00:00') ? s.timeExit : s.timeEntrance, base);
    if (!e || !x) return Number.POSITIVE_INFINITY;
    if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
    return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
  };

  // 1) InProgress
  let bestInProg: any = null, bestTs = -Infinity;
  for (const s of room.surgeries) {
    if (!s || !this.isInProgressStatus(s.status)) continue;
    const ts = startTs(s);
    if (ts !== Number.POSITIVE_INFINITY && ts > bestTs) { bestInProg = s; bestTs = ts; }
  }
  if (bestInProg) return this.getUrgencyIconFromSurgery(bestInProg);

  // 2) Next upcoming non-completed today
  let next: any = null, nextTs = Number.POSITIVE_INFINITY;
  for (const t of room.surgeries) {
    if (t && !this.isCompletedStatus(t.status)) {
      const ts2 = startTs(t);
      if (ts2 < nextTs) { next = t; nextTs = ts2; }
    }
  }
  if (next) return this.getUrgencyIconFromSurgery(next);

  // 3) Last completed today
  let last: any = null, lastTs = -Infinity;
  for (const c of room.surgeries) {
    if (!c || !this.isCompletedStatus(c.status)) continue;
    const ts3 = startTs(c);
    if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) { last = c; lastTs = ts3; }
  }
  if (last) return this.getUrgencyIconFromSurgery(last);

  return '';
}


hasInProgress(room: RoomData): boolean {
  if (!room?.surgeries?.length) return false;
  return room.surgeries.some(s => s && this.isInProgressStatus(s.status));
}

private isCompletedStatus(raw: any): boolean {
  const s = (raw == null ? '' : String(raw)).toLowerCase().trim();
  return s === 'completed' || s === 'done' || s === 'סגור' || s.includes('הושל') || s.includes('בוצע');
  // tailor the Hebrew/variants to your real data, or keep only 'completed' if that's all you use
}


/** Get the raw urgency string from a surgery object (handles both shapes). */
getUrgencyTextFromSurgery(s: any): string {
  if (!s) return '';
  var u = (s.urgency != null ? s.urgency : (s as any).Urgency);
  return u != null ? String(u) : '';
}

/** Pick the same surgery your header icon represents and return its urgency text. */
getHeaderProgressTitle(room: RoomData): string {
  // mirror your getHeaderProgressIcon selection:
  if (!room || !room.surgeries || !room.surgeries.length) return '';

  var anchor = room.date || this.selectedDate;
  var dayStart = this.workingStart(anchor);
  var dayEnd   = this.workingEnd(anchor);
  var DAY_MS   = 24 * 60 * 60 * 1000;

  var chosen: any = null;
  var chosenTs = -Infinity;

  function parse(self: any, clk: string, base: any): Date | null {
    return clk ? self.parseClockWithDate(clk, base) : null;
  }
  function overlaps(e: Date, x: Date): boolean {
    return e < dayEnd && x > dayStart;
  }
  function startTs(self: any, s: any): number {
    var base = s.surgeryDate || anchor;
    var e = parse(self, s.timeEntrance, base);
    var x = parse(self, (s.timeExit && s.timeExit !== '00:00:00') ? s.timeExit : s.timeEntrance, base);
    if (!e || !x) return Number.POSITIVE_INFINITY;
    if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
    return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
  }

  
  for (var i = 0; i < room.surgeries.length; i++) {
    var s1 = room.surgeries[i];
    if (s1.status !== 'InProgress') continue;
    var ts1 = startTs(this, s1);
    if (ts1 !== Number.POSITIVE_INFINITY && ts1 > chosenTs) { chosen = s1; chosenTs = ts1; }
  }
  
  if (!chosen) {
    var next: any = null, nextTs = Number.POSITIVE_INFINITY;
    for (var j = 0; j < room.surgeries.length; j++) {
      var s2 = room.surgeries[j];
      if (s2.status === 'Completed') continue;
      var ts2 = startTs(this, s2);
      if (ts2 < nextTs) { next = s2; nextTs = ts2; }
    }
    chosen = next;
  }
  
  if (!chosen) {
    var last: any = null, lastTs = -Infinity;
    for (var k = 0; k < room.surgeries.length; k++) {
      var s3 = room.surgeries[k];
      if (s3.status !== 'Completed') continue;
      var ts3 = startTs(this, s3);
      if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) { last = s3; lastTs = ts3; }
    }
    chosen = last;
  }

  return chosen ? this.getUrgencyTextFromSurgery(chosen) : '';
}


/** Room status class with user display settings applied. */
getRoomStatusClassWithSettings(room: RoomData): string {
  // keep original behavior if settings not wired yet
  const base = (this.getRoomStatusClass && room) ? (this.getRoomStatusClass(room) || '') : '';

  // If you haven’t defined `settings`, just return the base classes
  if (!this.settings) return base;

  // Turn off colors completely
  if (this.settings.colorize === false) return '';

  // Turn off blinking (convert "green-blink" → "green", strip generic "blink")
  if (this.settings.blinkOnUnacked === false) {
    return base
      .replace(/\bgreen-blink\b/g, 'green')
      .replace(/\bblink\b/g, ''); // just in case other places add "blink"
  }

  return base;
}



// Parse 'HH:MM' (or '--:--') into minutes
private hmToMin(s?: string | null): number | null {
  if (!s || s === '--:--') return null;
  var p = s.split(':');
  if (p.length < 2) return null;
  var hh = +p[0], mm = +p[1];
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

/** Computes {isLate, overrunMin, predictedEnd, turnoverUsed} for template */
getRoomLateMeta(room: RoomData): LateMeta | null {
  if (!room) return null;

  var sum = this.getTurnoverSummary(room);     // e.g. '01:27' or '--:--'
  var parsed = this.hmToMin(sum);
  var turnoverUsed = Math.max(20, parsed == null ? 20 : parsed); // per your instruction

  var pred = this.predictFirstLatePlanned(room, turnoverUsed);
  var shiftEnd = this.workingEnd(room.date || this.selectedDate);

  if (!pred) {
    return { isLate: false, overrunMin: 0, predictedEnd: null, turnoverUsed: turnoverUsed };
  }
  var overrun = Math.max(0, Math.round((pred.predictedEnd.getTime() - shiftEnd.getTime()) / 60000));
  return { isLate: true, overrunMin: overrun, predictedEnd: pred.predictedEnd, turnoverUsed: turnoverUsed };
}

/** Finds the first Planned case predicted to finish after shift end. */
private predictFirstLatePlanned(room: RoomData, TURNOVER_MIN: number):
  { predictedEnd: Date } | null {

  if (!room || !room.surgeries || !room.surgeries.length) return null;

  const baseDate  = room.date || this.selectedDate;
  const shiftStart = this.workingStart(baseDate);
  const shiftEnd   = this.workingEnd(baseDate);
  const DAY_MS     = 24 * 60 * 60 * 1000;

  function statusOf(row: any): string {
    const raw = row && (row.status != null ? row.status : row.SurgeryStatus);
    return String(raw == null ? '' : raw).toLowerCase();
  }
  function getEClock(row: any): string | null {
    return row ? (row.timeEntrance != null ? row.timeEntrance : row.TimeEntranceToTheOperatingRoom) : null;
  }
  function getXClock(row: any): string | null {
    return row ? (row.timeExit != null ? row.timeExit : row.TimeExitingTheOperatingRoom) : null;
  }
  function getBase(row: any): string | Date {
    return (row && (row.surgeryDate != null ? row.surgeryDate : row.SurgeryDate)) || baseDate;
  }
  function isZeroClock(v?: string | null): boolean {
    return v === '00:00' || v === '00:00:00';
  }

  // Normalize rows
  const list: { entrance: Date | null; exit: Date | null; expectedMin: number | null; status: string }[] = [];

  for (let i = 0; i < room.surgeries.length; i++) {
    const row: any = room.surgeries[i];

    const eClock = getEClock(row);
    if (!eClock) continue;

    const base = getBase(row);
    const xRaw = getXClock(row);

    let entrance = this.parseClockWithDate(eClock, base);
    let exit     = (xRaw && !isZeroClock(xRaw)) ? this.parseClockWithDate(xRaw, base) : null;
    if (!entrance) continue;
    if (exit && exit.getTime() < entrance.getTime()) exit = new Date(exit.getTime() + DAY_MS);

    let expectedMin: number | null = null;
    const ttd = row && (row.TimeSurgeryToDo != null ? row.TimeSurgeryToDo : row.timeSurgeryToDo);
    if (ttd != null && !isNaN(+ttd)) expectedMin = Math.max(0, Math.round(+ttd));
    if (expectedMin == null && exit) expectedMin = Math.max(0, Math.round((exit.getTime() - entrance.getTime()) / 60000));

    const status = statusOf(row);
    list.push({ entrance: entrance, exit: exit, expectedMin: expectedMin, status: status });
  }

  // Sort by scheduled entrance (missing go last)
  list.sort(function(a, b) {
    if (!a.entrance && !b.entrance) return 0;
    if (!a.entrance) return 1;
    if (!b.entrance) return -1;
    return a.entrance.getTime() - b.entrance.getTime();
  });

  // Propagate delays
  let cursor: Date | null = null; // room free time (including turnover)
  for (let j = 0; j < list.length; j++) {
    const item = list[j];

    if (!cursor) cursor = item.entrance ? new Date(item.entrance) : new Date(shiftStart);
    const startPred = item.entrance
      ? new Date(Math.max(item.entrance.getTime(), cursor.getTime()))
      : new Date(cursor);

    let durMin: number;
    if (item.exit && item.entrance) {
      durMin = Math.max(0, Math.round((item.exit.getTime() - item.entrance.getTime()) / 60000));
    } else {
      durMin = item.expectedMin != null ? item.expectedMin : 60;
    }

    const endSurgeryPred = new Date(startPred.getTime() + durMin * 60000);
    cursor = new Date(endSurgeryPred.getTime() + TURNOVER_MIN * 60000);

    if (item.status === 'planned' && endSurgeryPred > shiftEnd) {
      return { predictedEnd: endSurgeryPred };
    }
  }

  return null;
}



}
