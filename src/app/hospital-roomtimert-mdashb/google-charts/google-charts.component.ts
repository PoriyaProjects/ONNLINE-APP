import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { GoogleChartsService } from '../services/google-charts.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChangeDetectorRef, Input } from '@angular/core';
import { interval } from 'rxjs';
import { startWith, shareReplay } from 'rxjs/operators';



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
  avgMinutes?: number; 
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
  SurgeryRoom: string;
  SurgeryDate: string; // 'YYYY-MM-DD'
  TimeEntranceToTheOperatingRoom: string | null; // 'HH:mm' or null
  TimeExitingTheOperatingRoom: string | null;    // 'HH:mm' or null
  SurgeryStatus: 'Completed' | 'InProgress' | 'Planned' | string;
  TimeSurgeryToDo: string | number | null;
}

export interface RoomData {
  roomId: string;
  date: string | null;
  surgeries: Surgery[];
}

export type LateMeta = {
  isLate: boolean;
  overrunMin: number;        
  predictedEnd: Date | null; 
  turnoverUsed: number;      
  hasOverlapBacklog: boolean;  
  backlogCount?: number;       
  overlapUntil?: Date | null;  
};


export type HeaderProgressOpts = {
  defaultTurnoverMin?: number; 
};

export type DisplayPreset = 'default' | 'all' | 'custom' | 'minimal';
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
  showStatusDot?: boolean;
  showUrgencyIcon?: boolean;
  colorMode: ColorMode;
  showLateChip?: boolean;
  showExpandBtn?: boolean;
  showDateControls?: boolean;
  backgroundMode?: boolean;
  showIdleSeconds?: boolean;
  hideIdleWhenNoPlanned?: boolean;
  continueIdleAfter1500WhenPlanned?: boolean;
  showSummaryCard?: boolean;
  showSurgeriesRts?: boolean;
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
    colorMode: "background",
    showExpandBtn: true,
    showDateControls: true,
    backgroundMode: false,
    showIdleSeconds: true,
    hideIdleWhenNoPlanned: true,
    continueIdleAfter1500WhenPlanned: true,
    showSummaryCard: false,
    showSurgeriesRts: true,
};



export const ALL_ON_SETTINGS: DisplaySettings = { ...DEFAULT_SETTINGS };

export const MINIMAL_SETTINGS: DisplaySettings = {
  ...DEFAULT_SETTINGS,
  showExpandBtn: true,
  showDateControls: false,
  backgroundMode: true,
  colorMode: 'border',
};


@Component({
    selector: "app-google-charts-time",
    templateUrl: "./google-charts.component.html",
    styleUrls: ["./google-charts.component.css"],
    animations: [
        trigger("slideToggle", [
            state(
                "closed",
                style({
                    height: "0",
                    opacity: 0,
                    overflow: "hidden",
                    padding: "0",
                })
            ),
            state(
                "open",
                style({
                    height: "*",
                    opacity: 1,
                    overflow: "hidden",
                    padding: "*",
                })
            ),
            transition("closed <=> open", animate("300ms ease-in-out")),
        ]),
    ],
})
export class RoomTimeRTmDashboardComponent implements OnInit, AfterViewInit {
    legendMinimized = false;
    private resizeTimeout: any;
    private destroy$ = new Subject<void>();
    private ackedRooms = new Set<string>();

    departmentMap = new Map<string, DepartmentData>();
    selectedDepartmentCharts: any[] = [];

    selectedDate: string = new Date().toISOString().split("T")[0]; // yyyy-MM-dd

    selectedDateObj: Date | null = this.selectedDate
        ? new Date(this.selectedDate)
        : null;

    roomsData: RoomData[] = [];
    openRoom: string | null = null;

    private _userId: string | null = null;
    @Input()
    get userId(): string | null {
        return this._userId;
    }
    set userId(val: string | null) {
        if (this._userId === val) return;
        this._userId = val;
        this.loadDisplaySettings();
        this.cdr.markForCheck();
    }

    displayPreset: DisplayPreset = "default";
    settings: DisplaySettings = { ...DEFAULT_SETTINGS };
    showDisplayPanel = false;
    refreshInterval: any;
    countdownInterval: any;
    private intervalId: any;
    nextRefreshIn: number = 300;
    autoRefreshPaused = false;
    lastLoaded: Date | null = null;

    constructor(
        public googleChartsService: GoogleChartsService,
        private deptColors: DepartmentColorService,
        public palette: PaletteService,
        private cdr: ChangeDetectorRef
    ) {}

    busiestRooms: Array<{
        room: string;
        totalMinutes: number;
        totalHMM: string;
        cases: number;
        hasInProgress: boolean;
        completed: number;
        inProgress: number;
        planned: number;
        latestExit: string | null;
        roomData: RoomData;
    }> = [];

    private settingsKey(uid: string) {
        return `rtmdashb.display.${uid}`;
    }

    initDisplaySettings(): void {
        this.loadDisplaySettings();
    }
    private loadDisplaySettings(): void {
        if (!this.userId) {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
            this.showDisplayPanel = false;
            return;
        }
        const raw = localStorage.getItem(this.settingsKey(this.userId));
        if (!raw) {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            const saved = (parsed.settings as Partial<DisplaySettings>) || {};
            this.displayPreset = (parsed.preset as DisplayPreset) || "custom";
            this.settings = { ...DEFAULT_SETTINGS, ...saved };
        } catch {
            this.displayPreset = "default";
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    private persistDisplaySettings(): void {
        if (!this.userId) return;
        const payload = {
            preset: this.displayPreset,
            settings: { ...this.settings },
        };
        localStorage.setItem(
            this.settingsKey(this.userId),
            JSON.stringify(payload)
        );
    }

    applyPreset(p: DisplayPreset): void {
        this.displayPreset = p;
        this.settings =
            p === "default"
                ? { ...DEFAULT_SETTINGS }
                : p === "all"
                ? { ...ALL_ON_SETTINGS }
                : p === "minimal"
                ? { ...MINIMAL_SETTINGS }
                : { ...this.settings };
        this.persistDisplaySettings();
        this.cdr.markForCheck();
    }

    onSettingChange(key: keyof DisplaySettings, value: boolean): void {
        this.settings = { ...this.settings, [key]: value };
        this.displayPreset = "custom";
        this.persistDisplaySettings();
        this.cdr.markForCheck();
    }

    toggleSetting(key: keyof DisplaySettings): void {
        const next = { ...this.settings } as any;
        next[key] = !this.settings[key];
        this.settings = next;
        this.displayPreset = "custom";
        this.persistDisplaySettings();
    }

    getCardClasses(room: RoomData): (string | null | undefined)[] {
        return [
            this.settings.colorize
                ? this.getRoomStatusClassWithSettings(room)
                : null,
            this.settings.colorize && this.settings.colorMode === "border"
                ? "status-mode-bg"
                : null,
            this.isRoomExpanded(room.roomId) ? "active" : "",
            !this.isRoomExpanded(room.roomId) &&
            !this.allExpanded &&
            this.activeRoomId &&
            room.roomId !== this.activeRoomId
                ? "blurred"
                : "",
        ];
    }

    ngOnInit(): void {
        this.userId = (localStorage.getItem("ID") || "").trim() || null;
        this.initDisplaySettings();
        this.lastLoaded = new Date();
        this.legendMinimized =
            localStorage.getItem("legendMinimized") === "true";
        this.deptColors.setPalette(
            this.palette.getDepartmentPalette(),
            this.palette.name
        );

        this.loadRoomsData();
        this.startAutoRefresh();

        this.refreshInterval = setInterval(() => {
            this.loadRoomsData();
            this.nextRefreshIn = 300;
        }, 5 * 60 * 1000);

        this.countdownInterval = setInterval(() => {
            if (this.nextRefreshIn > 0) {
                this.nextRefreshIn--;
            }
        }, 1000);
        const saved = localStorage.getItem("rooms_allExpanded");
        if (saved === "true") this.allExpanded = true;
        if (saved === "false") this.allExpanded = false;

        this.googleChartsService.ackAllRooms$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.markAllRoomsAcknowledged());
    }

    ngAfterViewInit(): void {}

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    @HostListener("window:resize")
    onResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {}, 300);
    }

    toggleLegend(): void {
        this.legendMinimized = !this.legendMinimized;
        localStorage.setItem("legendMinimized", String(this.legendMinimized));
    }

    isLoading = false;
    allExpanded: boolean = false;
    activeRoomId: string | null = null;

    toggleAll(): void {
        this.allExpanded = !this.allExpanded;
        localStorage.setItem("rooms_allExpanded", String(this.allExpanded));

        if (this.allExpanded) {
            this.activeRoomId = null;
        }
    }

    isRoomExpanded(roomId: string): boolean {
        return this.allExpanded || this.activeRoomId === roomId;
    }

    toggleRoom(roomId: string): void {
        if (this.allExpanded) return;

        this.activeRoomId = this.activeRoomId === roomId ? null : roomId;

        if (this.activeRoomId) {
            this.acknowledgeRoomEvent(roomId);
        }
    }

    trackByRoomId(index: number, room: any) {
        return room.roomId;
    }

    private readonly ACK_NS = "ack_"; // storage prefix
    private ackCache = new Map<string, string>();

    private ackStorageKey(roomId: string): string {
        return `${this.ACK_NS}${this.storageDateKey()}:${roomId}`;
    }
    private legacyAckStorageKey(roomId: string): string {
        return `${this.ACK_NS}${roomId}`;
    }
    private storageDateKey(): string {
        const d = this.selectedDate ? new Date(this.selectedDate) : new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }
    private lsGet(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    private lsSet(key: string, val: string): void {
        try {
            localStorage.setItem(key, val);
        } catch {}
    }
    private lsRemove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {}
    }

    private lastEventKeyForRoom(roomId: string): string {
        const room = this.roomsData.find((r) => r.roomId === roomId);
        if (!room || !room.surgeries.length) return "empty";
        const last = room.surgeries[room.surgeries.length - 1];
        return `${last.surgeryId}_${last.status}`;
    }

    private acknowledgeRoomEvent(roomId: string): void {
        const key = this.lastEventKeyForRoom(roomId);
        const storeKey = this.ackStorageKey(roomId);

        this.lsSet(storeKey, key);
        this.lsRemove(this.legacyAckStorageKey(roomId));

        this.ackCache.set(roomId, key);
        this.roomsData = [...(this.roomsData ?? [])];
    }

    isBlinking(room: RoomData): boolean {
        return !this.isRoomAcked(room);
    }

    loadRoomsData(): void {
        this.lastLoaded = new Date();
        this.isLoading = true;
        this.googleChartsService.getSurgeryRooms(this.selectedDate).subscribe(
            (result) => {
                const rows = result.surgeries || [];

                const grouped = rows.reduce((acc, row) => {
                    const roomId = row.SurgeryRoom;
                    if (!acc[roomId]) acc[roomId] = [];
                    acc[roomId].push({
                        surgeryId: row.CaseNumber,
                        patientNumber: row.PatientNumber,
                        surgeryName: row.SurgeryName,
                        surgeryCode: row.SurgeryCode,
                        department: row.DepartName,
                        status: row.SurgeryStatus, // 'Completed' | 'InProgress' | 'Planned' | ...
                        timeEntrance: row.TimeEntranceToTheOperatingRoom, // 'HH:mm'
                        timeExit: row.TimeExitingTheOperatingRoom, // 'HH:mm'
                        surgeryDate: row.SurgeryDate, // 'YYYY-MM-DD'
                        urgency: row.Urgency,
                        timeSurgeryToDo: row.TimeSurgeryToDo, // minutes (string or number)
                    });
                    return acc;
                }, {} as Record<string, any[]>);

                const self = this;

                function two(n: number) {
                    return (n < 10 ? "0" : "") + n;
                }
                function parseMinutes(v: any): number | null {
                    if (v === null || v === undefined || v === "") return null;
                    const n =
                        typeof v === "number" ? v : parseInt(String(v), 10);
                    return isFinite(n) && n > 0 ? n : null;
                }
                function addMinutes(d: Date, m: number): Date {
                    return new Date(d.getTime() + m * 60000);
                }

                function schedDate(item: any, baseDate: string): Date | null {
                    if (!item.timeEntrance) return null;
                    return self.parseClockWithDate(item.timeEntrance, baseDate);
                }

                function sortByPredicted(list: any[], baseDate: string): any[] {
                    if (!list || !list.length) return [];

                    const DAY_MS = 24 * 60 * 60 * 1000;
                    function sortKeyScheduled(s: any): number {
                        const eClock = s.timeEntrance;
                        const xClock = s.timeExit;
                        if (!eClock) return Number.POSITIVE_INFINITY;
                        const ent = self.parseClockWithDate(eClock, baseDate);
                        const exi = self.parseClockWithDate(
                            xClock && xClock !== "00:00:00" ? xClock : eClock,
                            baseDate
                        );
                        if (!ent || !exi) return Number.POSITIVE_INFINITY;
                        if (exi.getTime() < ent.getTime())
                            return ent.getTime() - DAY_MS;
                        return ent.getTime();
                    }
                    list = list.slice().sort(function (a, b) {
                        return sortKeyScheduled(a) - sortKeyScheduled(b);
                    });

                    const MIN_TURNOVER = 20;
                    let active: any = null;
                    for (let i = 0; i < list.length; i++) {
                        const st = String(list[i].status || "").toLowerCase();
                        if (st === "inprogress" && list[i].timeEntrance) {
                            if (!active) active = list[i];
                            else {
                                const aEnt = self.parseClockWithDate(
                                    active.timeEntrance,
                                    baseDate
                                );
                                const bEnt = self.parseClockWithDate(
                                    list[i].timeEntrance,
                                    baseDate
                                );
                                if (
                                    aEnt &&
                                    bEnt &&
                                    bEnt.getTime() >= aEnt.getTime()
                                )
                                    active = list[i];
                            }
                        }
                    }

                    let cursor: Date | null = null;
                    if (active) {
                        const aStart = self.parseClockWithDate(
                            active.timeEntrance,
                            baseDate
                        );
                        let aDur = parseMinutes(active.timeSurgeryToDo);
                        if (aDur === null) aDur = 60;
                        cursor = aStart ? addMinutes(aStart, aDur) : null;
                    } else {
                        let firstPending: any = null;
                        for (let i = 0; i < list.length; i++) {
                            const st = String(
                                list[i].status || ""
                            ).toLowerCase();
                            if (st !== "completed") {
                                firstPending = list[i];
                                break;
                            }
                        }
                        if (firstPending && firstPending.timeEntrance) {
                            const firstSched = self.parseClockWithDate(
                                firstPending.timeEntrance,
                                baseDate
                            );
                            cursor = firstSched
                                ? addMinutes(firstSched, MIN_TURNOVER)
                                : null;
                        }
                    }

                    for (let i = 0; i < list.length; i++) {
                        const it = list[i];
                        const st = String(it.status || "").toLowerCase();
                        const sched = schedDate(it, baseDate);
                        let dur = parseMinutes(it.timeSurgeryToDo);
                        if (dur === null) dur = 60;

                        if (st === "completed") {
                            it._displayStart = sched || null;
                            it._displayEnd = it.timeExit
                                ? self.parseClockWithDate(it.timeExit, baseDate)
                                : null;
                        } else if (active && it === active) {
                            it._displayStart = sched || null;
                            it._displayEnd = cursor;
                        } else {
                            if (!cursor) {
                                it._displayStart = sched || null;
                                it._displayEnd = it._displayStart
                                    ? addMinutes(it._displayStart, dur)
                                    : null;
                            } else {
                                const earliest = addMinutes(
                                    cursor,
                                    MIN_TURNOVER
                                );
                                const start =
                                    sched &&
                                    sched.getTime() > earliest.getTime()
                                        ? sched
                                        : earliest;
                                it._displayStart = start;
                                it._displayEnd = addMinutes(start, dur);
                                cursor = it._displayEnd;
                            }
                        }

                        it._displayStartMs = it._displayStart
                            ? it._displayStart.getTime()
                            : Number.POSITIVE_INFINITY;
                    }

                    list.sort(function (a, b) {
                        if (a._displayStartMs !== b._displayStartMs)
                            return a._displayStartMs - b._displayStartMs;
                        const aSched = schedDate(a, baseDate),
                            bSched = schedDate(b, baseDate);
                        if (
                            aSched &&
                            bSched &&
                            aSched.getTime() !== bSched.getTime()
                        )
                            return aSched.getTime() - bSched.getTime();
                        const aid = String(a.surgeryId || ""),
                            bid = String(b.surgeryId || "");
                        return aid < bid ? -1 : aid > bid ? 1 : 0;
                    });

                    return list;
                }

                this.roomsData = Object.keys(grouped).map((roomId) => {
                    const list = grouped[roomId];
                    const roomDate = list.length
                        ? list[0].surgeryDate || this.selectedDate
                        : this.selectedDate;
                    const sorted = sortByPredicted(list, roomDate);
                    return { roomId, surgeries: sorted, date: roomDate };
                });

                this.isLoading = false;
            },
            (_) => {
                this.isLoading = false;
            }
        );
    }

    getTurnoverTime(room: RoomData): string {
        if (!room?.surgeries?.length) return ""  ;

        const lastCompleted = [...room.surgeries]
            .reverse()
            .find(
                (s) =>
                    s.status === "Completed" &&
                    (s.timeExit || s.timeExit === "00:00:00")
            );

        if (!lastCompleted) return "";

        const exitTime =
            lastCompleted.timeExit && lastCompleted.timeExit !== "00:00:00"
                ? lastCompleted.timeExit
                : lastCompleted.timeEntrance;

        const exit = this.parseClock(exitTime);
        if (!exit) return "";

        const limit = new Date(exit);
        limit.setHours(15, 0, 0, 0);
        const now = new Date();
        const endTime = now < limit ? now : limit;

        const diffMin = Math.floor(
            (endTime.getTime() - exit.getTime()) / 60000
        );

        if (diffMin > 20) {
            return this.formatHM(diffMin - 20);
        }

        return "";
    }

    getTurnoverSummary(room: RoomData): string {
        if (!room?.surgeries?.length || !room.date) return "";

        const dayStart = this.workingStart(room.date);
        const dayEnd = this.workingEnd(room.date);
        const clamp = (d: Date) =>
            new Date(
                Math.min(
                    dayEnd.getTime(),
                    Math.max(dayStart.getTime(), d.getTime())
                )
            );

        // 1. נרמול הנתונים לרשימת אינטרוולים רלוונטיים
        const intervals = room.surgeries
            .map((s) => {
                const status = String(
                    s.status || s.SurgeryStatus || ""
                ).toLowerCase();
                const isCompleted = /complete|finish|הסת/.test(status);
                const isInProgress = /progress|ongoing|בתהל/.test(status);

                if (!isCompleted && !isInProgress) return null;

                const ent = this.parseClockWithDate(
                    s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom,
                    room.date
                );
                let ext = this.parseClockWithDate(
                    s.timeExit ?? s.TimeExitingTheOperatingRoom,
                    room.date
                );

                if (!ent) return null;
                if (!ext || ext.getTime() === ent.getTime())
                    ext = new Date(ent.getTime() + 1); // למנוע 00:00:00
                if (ext < ent) ext = new Date(ext.getTime() + 86400000); // תיקון חציית חצות

                if (ent >= dayEnd || ext <= dayStart) return null; // מחוץ למשמרת

                return { ent, ext, isCompleted };
            })
            .filter((i): i is NonNullable<typeof i> => !!i)
            .sort((a, b) => a.ent.getTime() - b.ent.getTime());

        if (!intervals.length) return "";

        let totalIdle = 0;

        // 2. חישוב פערים בין ניתוחים
        for (let i = 0; i < intervals.length - 1; i++) {
            const gap =
                (clamp(intervals[i + 1].ent).getTime() -
                    clamp(intervals[i].ext).getTime()) /
                60000;
            if (gap > 20) totalIdle += gap - 20;
        }

        // 3. חישוב זמן מת לאחר הניתוח האחרון (אם הסתיים)
        const last = intervals[intervals.length - 1];
        if (last.isCompleted) {
            const now = new Date();
            const endTime = clamp(now < dayEnd ? now : dayEnd);
            const idle =
                (endTime.getTime() - clamp(last.ext).getTime()) / 60000;
            if (idle > 20) totalIdle += idle - 20;
        }

        return totalIdle > 0 ? this.formatHM(Math.floor(totalIdle)) : "";
    }

    getTurnoverMinutes(room: RoomData): number {

        const s = this.getTurnoverSummary(room); // "HH:MM" או """"
        if (!s || s === ""  ) return 0;
        const [h, m] = s.split(":").map((x) => +x);
        if (Number.isNaN(h) || Number.isNaN(m)) return 0;
        return h * 60 + m;
    }

    isTurnoverLong(room: RoomData): boolean {
        return this.getTurnoverMinutes(room) > 20;
    }

    private workingStart(): Date;
    private workingStart(baseDate: string | Date): Date;
    private workingStart(baseDate?: string | Date): Date {
        const d = baseDate ? new Date(baseDate) : new Date();
        d.setHours(7, 30, 0, 0); // 07:30
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
        return new Date(
            Math.min(end.getTime(), Math.max(start.getTime(), d.getTime()))
        );
    }

    getTurnoverClass(room: RoomData): string {
        const t = this.getTurnoverTime(room);
        if (!t || t === ""  ) return "";
        const [h, m] = t.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 120) return "metric-red-strong";
        if (minutes > 60) return "metric-red";
        if (minutes > 45) return "metric-orange";
        if (minutes > 20) return "metric-yellow";
        return "metric-ok";
    }

    getTurnoverTimeClass(room: RoomData): string {
        if (this.isRoomClosedForColoring(room)) return "metric-neutral";

        var s = this.getTurnoverSummary(room); // 'HH:MM' or '"  "'
        var m = (function hmToMin(v: string): number {
            if (!v || v === ""  ) return 0;
            var p = v.split(":");
            if (p.length < 2) return 0;
            var hh = +p[0],
                mm = +p[1];
            return isNaN(hh) || isNaN(mm) ? 0 : hh * 60 + mm;
        })(s);

        if (m >= 90) return "metric-bad"; // red
        if (m > 0) return "metric-warn"; // amber
        return "metric-ok"; // green/ok
    }

    sortByChronologicalStart(a: any, b: any, roomDate: string | Date): number {
        var DAY_MS = 24 * 60 * 60 * 1000;

        function clockToDate(clk: string, base: any) {
            return this.parseClockWithDate(clk, base);
        }

        function sortKey(s: any, baseDate: any): number {
            var eClock =
                s &&
                (s.timeEntrance != null
                    ? s.timeEntrance
                    : s.TimeEntranceToTheOperatingRoom);
            var xClockRaw =
                s &&
                (s.timeExit != null
                    ? s.timeExit
                    : s.TimeExitingTheOperatingRoom);
            var base =
                (s &&
                    (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
                baseDate;
            if (!eClock) return Number.POSITIVE_INFINITY;

            var entrance = this.parseClockWithDate(eClock, base);
            var exit = this.parseClockWithDate(
                xClockRaw && xClockRaw !== "00:00:00" ? xClockRaw : eClock,
                base
            );
            if (!entrance || !exit) return Number.POSITIVE_INFINITY;

            if (exit.getTime() < entrance.getTime())
                return entrance.getTime() - DAY_MS;

            if (xClockRaw) {
                var eParts = String(eClock).split(":"),
                    xParts = String(xClockRaw).split(":");
                if (eParts.length >= 2 && xParts.length >= 2) {
                    var eNum = +eParts[0] * 60 + +eParts[1];
                    var xNum = +xParts[0] * 60 + +xParts[1];
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
            var eClock =
                s &&
                (s.timeEntrance != null
                    ? s.timeEntrance
                    : s.TimeEntranceToTheOperatingRoom);
            var xClockRaw =
                s &&
                (s.timeExit != null
                    ? s.timeExit
                    : s.TimeExitingTheOperatingRoom);
            var base =
                (s &&
                    (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
                baseDate;
            if (!eClock) return Number.POSITIVE_INFINITY;

            var entrance = self.parseClockWithDate(eClock, base);
            var exit = self.parseClockWithDate(
                xClockRaw && xClockRaw !== "00:00:00" ? xClockRaw : eClock,
                base
            );
            if (!entrance || !exit) return Number.POSITIVE_INFINITY;

            if (exit.getTime() < entrance.getTime())
                return entrance.getTime() - DAY_MS;

            if (xClockRaw) {
                var ep = String(eClock).split(":"),
                    xp = String(xClockRaw).split(":");
                if (ep.length >= 2 && xp.length >= 2) {
                    var eMin = +ep[0] * 60 + +ep[1];
                    var xMin = +xp[0] * 60 + +xp[1];
                    if (xMin < eMin) return entrance.getTime() - DAY_MS;
                }
            }
            return entrance.getTime();
        }

        var self = this;
        return (surgeries || []).slice().sort(function (a, b) {
            return sortKey(self, a, roomDate) - sortKey(self, b, roomDate);
        });
    }

    getRoomStatusClass(room: RoomData): string {
        if (!room || !room.surgeries?.length) return "grey";

        const isWeekend = this.isWeekend(room.date);

        if (room.surgeries.some((s) => s.status === "InProgress")) {
            return isWeekend ? "green" : "green-blink";
        }

        const lastCompleted = [...room.surgeries]
            .reverse()
            .find(
                (s) =>
                    s.status === "Completed" &&
                    s.timeExit &&
                    s.timeExit !== "00:00:00"
            );
        if (!lastCompleted) return "grey";

        const exitAt = this.parseClockWithDate(
            lastCompleted.timeExit,
            room.date
        );

        if (!exitAt) return "grey";

        const diffMin = Math.max(0, (Date.now() - exitAt.getTime()) / 60000);

        if (isWeekend) {
            if (diffMin > 120) return "red-120-ack";
            if (diffMin > 60) return "red-60-ack";
            if (diffMin > 45) return "red-45-ack";
            return "grey";
        }

        const isAcked = this.isRoomAcked(room);
        if (diffMin > 120) return isAcked ? "red-120-ack" : "red-120";
        if (diffMin > 60) return isAcked ? "red-60-ack" : "red-60";
        if (diffMin > 45) return isAcked ? "red-45-ack" : "red-45";
        return "grey";
    }

    private isWeekend(dateLike?: string | Date): boolean {
        const d = dateLike ? new Date(dateLike) : new Date();
        const day = d.getDay();
        return day === 5 || day === 6;
    }

    getStartDiffClass(room: RoomData): string {
        const val = this.getStartDiff(room);
        if (!val || val === ""  ) return ;
        const [h, m] = val.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 60) return "metric-red";
        if (minutes > 30) return "metric-orange";
        if (minutes > 15) return "metric-yellow";
        return "metric-ok";
    }

    private isRealCase(s?: Surgery): boolean {
        return !!s && (s.status === "Completed" || s.status === "InProgress");
    }

    private toInterval(s: Surgery, baseDate?: string | Date) {
        const eClock = s.timeEntrance;
        const xClock =
            s.timeExit && s.timeExit !== "00:00:00"
                ? s.timeExit
                : s.timeEntrance;

        const entrance = eClock
            ? this.parseClockWithDate(eClock, baseDate ?? s.surgeryDate)
            : null;
        let exit = xClock
            ? this.parseClockWithDate(xClock, baseDate ?? s.surgeryDate)
            : null;

        if (entrance && exit && exit.getTime() < entrance.getTime()) {
            exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
        }
        return { entrance, exit: exit ?? entrance };
    }

    private overlapsWindow(
        entrance: Date | null,
        exit: Date | null,
        start: Date,
        end: Date
    ): boolean {
        if (!entrance || !exit) return false;
        return entrance < end && exit > start;
    }

    getTurnoverBetween(prev: Surgery, next: Surgery): string | null {
        if (!this.isRealCase(prev) || !this.isRealCase(next)) return null;

        const baseDate =
            next.surgeryDate ?? prev.surgeryDate ?? this.selectedDate;
        const dayStart = this.workingStart(baseDate);
        const dayEnd = this.workingEnd(baseDate);

        const p = this.toInterval(prev, baseDate);
        const n = this.toInterval(next, baseDate);
        if (!p.entrance || !p.exit || !n.entrance || !n.exit) return null;

        if (!this.overlapsWindow(p.entrance, p.exit, dayStart, dayEnd))
            return null;
        if (!this.overlapsWindow(n.entrance, n.exit, dayStart, dayEnd))
            return null;

        const prevEnd = this.clampToWindow(p.exit, dayStart, dayEnd);
        const nextStart = this.clampToWindow(n.entrance, dayStart, dayEnd);

        const gap = this.minutesBetween(prevEnd, nextStart);
        if (gap <= 20) return null;
        return this.formatHM(gap - 20);
    }

    getTurnoverBetweenClass(prev: Surgery, next: Surgery): string {
        const raw = this.getTurnoverBetween(prev, next);
        if (!raw) return ;

        const [h, m] = raw.split(":").map(Number);
        const minutes = h * 60 + m;

        if (minutes > 120) return "metric-red blink";
        if (minutes > 60) return "metric-red";
        if (minutes > 45) return "metric-orange";
        return "metric-yellow";
    }

    private isInProgress(raw: any): boolean {
        var s = (raw == null ? "" : String(raw)).toLowerCase();
        return (
            s === "inprogress" || s === "in progress" || s.indexOf("בתהל") >= 0
        );
    }

    private getSurgeryIdFromAny(s: any): string {
        if (!s) return "";
        if (s.surgeryId != null && s.surgeryId !== "")
            return String(s.surgeryId);
        if (s.SurgeryID != null && s.SurgeryID !== "")
            return String(s.SurgeryID);
        return "";
    }

    private entranceMillisForSort(s: any, roomDate: string | Date): number {
        var eClock =
            s &&
            (s.timeEntrance != null
                ? s.timeEntrance
                : s.TimeEntranceToTheOperatingRoom);
        var base =
            (s && (s.surgeryDate != null ? s.surgeryDate : s.SurgeryDate)) ||
            roomDate;
        var d = eClock ? this.parseClockWithDate(eClock, base) : null;
        return d ? d.getTime() : -Infinity;
    }

    getHeaderInProgressId(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "";

        var inProg: any[] = [];
        for (var i = 0; i < room.surgeries.length; i++) {
            var s = room.surgeries[i];
            var status = s && s.status != null ? s.status : s && s.status;
            if (this.isInProgress(status)) inProg.push(s);
        }

        if (!inProg.length) return "";

        var picked = inProg
            .slice()
            .sort(
                (a, b) =>
                    this.entranceMillisForSort(
                        b,
                        room.date || this.selectedDate
                    ) -
                    this.entranceMillisForSort(
                        a,
                        room.date || this.selectedDate
                    )
            )[0];

        return this.getSurgeryIdFromAny(picked) || "";
    }

    private parseClock(t: string): Date | null {
        if (!t || typeof t !== "string") return null;
        const parts = t.split(":").map((n) => Number(n));
        if (parts.length < 2 || parts.some(isNaN)) return null;
        const [h, m, s = 0] = parts;
        const d = new Date();
        d.setHours(h, m, s, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    private parseClockWithDate(
        clock: string,
        baseDate?: string | Date
    ): Date | null {
        const t = this.parseClock(clock);
        if (!t) return null;
        if (!baseDate) return t;

        const base = new Date(baseDate);
        base.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
        return base;
    }

    private formatDiff(ms: number): string {
        if (isNaN(ms)) return ""  ;
        const sign = ms < 0 ? "-" : "";
        const abs = Math.abs(ms);
        const h = Math.floor(abs / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        return `${sign}${("0" + h).slice(-2)}:${("0" + m).slice(-2)}`;
    }

    getStartDiff(room: RoomData): string {
        const safeStart = this.parseClock("07:00");
        const safeEnd = this.parseClock("07:30");
        if (!safeStart || !safeEnd) return "";

        if (!room.surgeries || room.surgeries.length === 0) return   "";

        const sortedSurgeries = room.surgeries
            .map((s) => ({ ...s, entrance: this.parseClock(s.timeEntrance) }))
            .filter((s) => s.entrance)
            .sort((a, b) => a.entrance!.getTime() - b.entrance!.getTime());

        const firstInSafeZone = sortedSurgeries.find(
            (s) => s.entrance! >= safeStart && s.entrance! <= safeEnd
        );
        if (firstInSafeZone) return "00:00";

        const firstAfterSafeZone = sortedSurgeries.find(
            (s) => s.entrance! > safeEnd
        );

        if (!firstAfterSafeZone) return   "";

        const diffMs =
            firstAfterSafeZone.entrance!.getTime() - safeEnd.getTime();
        return this.formatDiff(diffMs);
    }

    getEndDiff(room: RoomData): string {
        const opening = this.parseClock("07:30");
        const closing = this.parseClock("14:40");
        if (!closing || !opening) return  "";

        const exits = room.surgeries
            .map((s) => {
                const exitStr =
                    s.timeExit && s.timeExit !== "00:00:00"
                        ? s.timeExit
                        : s.timeEntrance;
                return this.parseClock(exitStr);
            })
            .filter((d): d is Date => !!d && d >= opening)
            .sort((a, b) => a.getTime() - b.getTime());

        if (exits.length === 0) return this.formatDiff(0);

        const lastExit = exits[exits.length - 1];

        if (lastExit >= closing) return this.formatDiff(0);

        const diffMs = closing.getTime() - lastExit.getTime();
        return this.formatDiff(diffMs);
    }

    getEndDiffClass(room: RoomData): string {
        if (this.isRoomClosedForColoring(room)) return "metric-neutral";

        var s = this.getEndDiff(room);
        if (!s || s ===  "") return "metric-ok";
        var p = s.split(":");
        if (p.length < 2) return "metric-ok";
        var mins = +p[0] * 60 + +p[1];
        if (isNaN(mins)) return "metric-ok";
        if (mins <= 15) return "metric-warn";
        return "metric-ok";
    }

    plannedSurgeries(room: RoomData): Surgery[] {
        return room.surgeries.filter((s) => s.status === "Planned");
    }

    activeSurgeries(room: RoomData): Surgery[] {
        return room.surgeries.filter((s) => s.status !== "Planned");
    }

    formatCountdown(sec: number): string {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    manualRefresh(): void {
        this.loadRoomsData();
        this.nextRefreshIn = 300;
        this.lastLoaded = new Date();
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
        if (!this.autoRefreshPaused) {
            this.autoRefreshPaused = true;
            this.clearIntervals();
        }

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
        return `${("0" + h).slice(-2)}:${("0" + m).slice(-2)}`;
    }

    statusTranslations: Record<string, string> = {
        Completed: "✔️ הסתיים",
        InProgress: "🟢 ניתוח פעיל",
        Scheduled: "🕓 מתוזמן",
        Cancelled: "❌ בוטל",
        Planned: "📆 מתוכנן",
    };

    translateStatus(status: string): string {
        return this.statusTranslations[status] || status;
    }

    acknowledgeAllRooms(): void {
        this.googleChartsService.triggerAcknowledgeAllRooms();

        for (const r of this.roomsData ?? []) {
            if (!r || !r.roomId) continue;

            const storeKey = this.ackStorageKey(r.roomId);
            const compositeKey = this.currentAckKeyForRoom(r);

            this.lsSet(storeKey, compositeKey);
            this.lsRemove(this.legacyAckStorageKey(r.roomId));
            this.ackCache.set(r.roomId, compositeKey);

            if (this.ackedRooms) this.ackedRooms.add(r.roomId);
        }

        this.roomsData = [...(this.roomsData ?? [])];
        console.log("acknowledged all rooms");
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
    private markAllRoomsAcknowledged(): void {
        for (const r of this.roomsData ?? []) {
            if (r?.roomId) this.ackedRooms.add(r.roomId);
        }
        this.roomsData = [...(this.roomsData ?? [])];
    }

    public isRoomAcked(room: RoomData): boolean {
        if (!room || !room.roomId) return false;

        const baseKey = this.lastEventKeyForRoom(room.roomId);
        const compositeKey = this.currentAckKeyForRoom(room);

        const storedKey =
            this.ackCache.get(room.roomId) ??
            this.lsGet(this.ackStorageKey(room.roomId)) ??
            this.lsGet(this.legacyAckStorageKey(room.roomId));

        if (!storedKey) return false;

        if (storedKey === compositeKey) return true;
        if (storedKey === baseKey) {
            const lateNow = this.predictedLateEndHHmm(room);
            return !lateNow;
        }
        return false;
    }

    acknowledgeRoomLate(room: RoomData): void {
        if (!room || !room.roomId) return;

        const storeKey = this.ackStorageKey(room.roomId);
        const compositeKey = this.currentAckKeyForRoom(room);

        this.lsSet(storeKey, compositeKey);
        this.lsRemove(this.legacyAckStorageKey(room.roomId));
        this.ackCache.set(room.roomId, compositeKey);

        if (this.ackedRooms) this.ackedRooms.add(room.roomId);

        this.roomsData = [...(this.roomsData ?? [])];
    }

    private readonly PLANNED_SET = new Set(["Planned", "Scheduled"]);

    trackBySurgeryId = (_: number, s: Surgery) => s?.surgeryId ?? _;

    private roomNameOverrides: Record<string, string> = {
        "פז01-201": "חדר ניתוח 1",
        "פז01-202": "חדר ניתוח 2",
        "פז01-203": "חדר ניתוח 3",
        "פז01-204": "חדר ניתוח 4",
        "פז01-205": "חדר ניתוח 5",
        "פז01-206": "חדר ניתוח 6",
        "פז01-207": "חדר ניתוח 7",
    };

    translateRoomId(id?: string): string {
        if (!id) return "";

        const hit = this.roomNameOverrides[id];
        if (hit) return hit;

        const norm = String(id).trim();
        const firstSeg = norm.split(/[-–—]/)[0];
        let numStr: string | null = null;

        const m1 = firstSeg.match(/(\d{1,2})(?!.*\d)/);
        if (m1) numStr = m1[1];

        if (!numStr) {
            const m2 = norm.match(/\b(0?[1-9]|[1-9]\d)\b/);
            if (m2) numStr = m2[1];
        }

        if (numStr) {
            const n = parseInt(numStr, 10);
            if (!Number.isNaN(n)) return `חדר ניתוח ${n}`;
        }

        return norm;
    }

    hasActionAfterWorkingStart(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        const ws = this.workingStart(room.date);
        return room.surgeries.some((s) => {
            if (!s?.timeEntrance) return false;
            const entrance = this.parseClockWithDate(s.timeEntrance, room.date);
            if (!entrance || entrance < ws) return false;
            return s.status === "InProgress" || s.status === "Completed";
        });
    }

    private isBeforeToday(dateLike?: string | Date): boolean {
        if (!dateLike) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateLike);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < today.getTime();
    }

    shouldShowStartDiff(room: RoomData): boolean {
        const baseDate = room?.date ?? this.selectedDate;
        if (this.isBeforeToday(baseDate)) return true;
        return !this.hasActionAfterWorkingStart(room);
    }

    private isInProgressStatus(raw: any): boolean {
        var s = (raw == null ? "" : String(raw)).toLowerCase().trim();
        return (
            s === "inprogress" || s === "in progress" || s.indexOf("בתהל") >= 0
        );
    }

    private getSurgeryIdSafe(s: any): string {
        if (s && s.surgeryId != null && s.surgeryId !== "")
            return String(s.surgeryId);
        var rawId = s ? (s as any).SurgeryID : null;
        return rawId != null && rawId !== "" ? String(rawId) : "—";
    }

    private entranceMillisForSortSafe(s: any, roomDate: string | Date): number {
        var eClock = s
            ? s.timeEntrance != null
                ? s.timeEntrance
                : (s as any).TimeEntranceToTheOperatingRoom
            : null;
        var base = s
            ? s.surgeryDate != null
                ? s.surgeryDate
                : (s as any).SurgeryDate
            : null;
        var anchor = base || roomDate;
        var d = eClock ? this.parseClockWithDate(eClock, anchor) : null;
        return d ? d.getTime() : -Infinity;
    }

    getHeaderInProgressLabel(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "פנוי";

        var inProg: any[] = [];
        for (var i = 0; i < room.surgeries.length; i++) {
            var s = room.surgeries[i];
            if (s && this.isInProgressStatus(s.status)) inProg.push(s);
        }
        if (!inProg.length) return "פנוי";

        var picked = inProg
            .slice()
            .sort(
                (a, b) =>
                    this.entranceMillisForSortSafe(
                        b,
                        room.date || this.selectedDate
                    ) -
                    this.entranceMillisForSortSafe(
                        a,
                        room.date || this.selectedDate
                    )
            )[0];

        return this.getSurgeryIdSafe(picked);
    }

    // פונקציות עזר מחוץ ללופ הראשי (או כמתודות פרטיות)
    private getUrgencyRank(s: any): number {
        const u = String(s.Urgency || s.urgency || "").trim();
        if (u.includes("דחוף")) return 0;
        if (u.includes("ססיה")) return 1;
        return 2;
    }

    getHeaderProgressText(room: RoomData, opts?: HeaderProgressOpts): string {
        if (!room?.surgeries?.length) return "0 מתוך 0";

        const baseDate = room.date || this.selectedDate;
        const shiftStart = this.workingStart(baseDate);
        const shiftEnd = this.workingEnd(baseDate);

        // הגדרות וערכי עזר
        const turnoverMin = Math.max(
            20,
            this.hmToMin(this.getTurnoverSummary(room)) ??
                opts?.defaultTurnoverMin ??
                20
        );
        const isProgress = (s: string) =>
            ["inprogress", "in progress", "in_progress"].includes(
                s.toLowerCase()
            );
        const isCompleted = (s: string) => s.toLowerCase() === "completed";

        // 1. נרמול וסינון נתונים במעבר אחד
        const list = room.surgeries
            .map((s) => {
                const entrance = this.parseClockWithDate(
                    s.timeEntrance ?? s.TimeEntranceToTheOperatingRoom,
                    baseDate
                );
                if (!entrance) return null;

                const xRaw = s.timeExit ?? s.TimeExitingTheOperatingRoom;
                let exit =
                    xRaw && xRaw !== "00:00"
                        ? this.parseClockWithDate(xRaw, baseDate)
                        : null;
                if (exit && exit < entrance)
                    exit = new Date(exit.getTime() + 86400000);

                const status = (
                    s.status ??
                    s.SurgeryStatus ??
                    ""
                ).toLowerCase();
                const expectedMin =
                    Number(s.TimeSurgeryToDo ?? s.TimeSurgeryToDo) ||
                    (exit
                        ? Math.round(
                              (exit.getTime() - entrance.getTime()) / 60000
                          )
                        : 60);

                return {
                    entrance,
                    exit,
                    status,
                    expectedMin,
                    raw: s,
                    sortKey:
                        entrance.getTime() -
                        (exit && exit.getDate() !== entrance.getDate()
                            ? 86400000
                            : 0),
                };
            })
            .filter(Boolean) as any[];

        // 2. מיון (לפי זמן, דחיפות וסטטוס)
        list.sort(
            (a, b) =>
                a.sortKey - b.sortKey ||
                this.getUrgencyRank(a.raw) - this.getUrgencyRank(b.raw)
        );

        // 3. חישוב מונים וסימולציית זמנים (Warn Late)
        let nInShift = 0,
            xInShift = 0,
            xOnDay = 0;
        let cursor = new Date(shiftStart);
        let warnLate = false;

        const dayStart = new Date(baseDate).setHours(0, 0, 0, 0);
        const dayEnd = new Date(baseDate).setHours(23, 59, 59, 999);

        list.forEach((s) => {
            const endForCount = s.exit ?? s.entrance;
            const overlapsDay = s.entrance < dayEnd && endForCount > dayStart;
            const overlapsShift =
                s.entrance < shiftEnd && endForCount > shiftStart;

            if (overlapsDay) xOnDay++;
            if (overlapsShift) {
                xInShift++;
                if (isCompleted(s.status) || isProgress(s.status)) nInShift++;
            }

            // סימולציית "האם נצא מהמשמרת"
            const startPred = new Date(
                Math.max(s.entrance.getTime(), cursor.getTime())
            );
            const endPred = new Date(
                startPred.getTime() + s.expectedMin * 60000
            );
            cursor = new Date(endPred.getTime() + turnoverMin * 60000);

            if (
                s.status === "planned" &&
                endPred > shiftEnd &&
                !this.isLateExemptByUrgency?.(s.raw)
            ) {
                warnLate = true;
            }
        });

        const outOfShift = Math.max(0, xOnDay - xInShift);
        return `${nInShift} מתוך ${xInShift}${
            outOfShift > 0 ? ` (+${outOfShift}*)` : ""
        }`;
    }

    private isSameLocalDay(a: Date, b: Date): boolean {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    isRoomToday(room: RoomData): boolean {
        const base =
            room && room.date
                ? new Date(room.date)
                : new Date(this.selectedDate);
        const now = new Date();
        return this.isSameLocalDay(base, now);
    }

    private urgencyIconRaw(u: any): string {
        var s = (u == null ? "" : String(u)).trim();
        if (!s) return "";
        var low = s.toLowerCase();

        if (s.indexOf("דחוף") >= 0 || low.indexOf("urgent") >= 0) return "🚑"; // or '⚠️'
        if (
            s.indexOf("ססיה") >= 0 ||
            s.indexOf("אשפוז") >= 0 ||
            low.indexOf("inpatient") >= 0
        )
            return "🏥";
        if (s.indexOf("אלקטיב") >= 0 || low.indexOf("elect") >= 0) return "📖";
        if (
            s.indexOf("ללא עדיפות") >= 0 ||
            low.indexOf("no priority") >= 0 ||
            low.indexOf("none") >= 0 ||
            low.indexOf("routine") >= 0
        )
            return "⬇️";
        if (
            s.indexOf("אמבולטורי") >= 0 ||
            low.indexOf("ambulatory") >= 0 ||
            low.indexOf("outpatient") >= 0
        )
            return "🚶";
        return "";
    }

    getUrgencyIconFromSurgery(s: any): string {
        if (!s) return "";
        var u = s.urgency != null ? s.urgency : (s as any).Urgency;
        return this.urgencyIconRaw(u);
    }

    getHeaderProgressIcon(room: RoomData): string {
        if (!room?.surgeries?.length) return "";

        const anchor = room.date || this.selectedDate;
        const dayStart = this.workingStart(anchor);
        const dayEnd = this.workingEnd(anchor);
        const DAY_MS = 24 * 60 * 60 * 1000;

        const parse = (clk?: string, base?: any): Date | null =>
            clk ? this.parseClockWithDate(clk, base) : null;

        const overlaps = (e: Date, x: Date): boolean =>
            e < dayEnd && x > dayStart;

        const startTs = (s: any): number => {
            const base = s.surgeryDate || anchor;
            let e = parse(s.timeEntrance, base);
            let x = parse(
                s.timeExit && s.timeExit !== "00:00:00"
                    ? s.timeExit
                    : s.timeEntrance,
                base
            );
            if (!e || !x) return Number.POSITIVE_INFINITY;
            if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
            return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
        };

        let bestInProg: any = null,
            bestTs = -Infinity;
        for (const s of room.surgeries) {
            if (!s || !this.isInProgressStatus(s.status)) continue;
            const ts = startTs(s);
            if (ts !== Number.POSITIVE_INFINITY && ts > bestTs) {
                bestInProg = s;
                bestTs = ts;
            }
        }
        if (bestInProg) return this.getUrgencyIconFromSurgery(bestInProg);

        let next: any = null,
            nextTs = Number.POSITIVE_INFINITY;
        for (const t of room.surgeries) {
            if (t && !this.isCompletedStatus(t.status)) {
                const ts2 = startTs(t);
                if (ts2 < nextTs) {
                    next = t;
                    nextTs = ts2;
                }
            }
        }
        if (next) return this.getUrgencyIconFromSurgery(next);

        let last: any = null,
            lastTs = -Infinity;
        for (const c of room.surgeries) {
            if (!c || !this.isCompletedStatus(c.status)) continue;
            const ts3 = startTs(c);
            if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) {
                last = c;
                lastTs = ts3;
            }
        }
        if (last) return this.getUrgencyIconFromSurgery(last);

        return "";
    }

    hasInProgress(room: RoomData): boolean {
        if (!room?.surgeries?.length) return false;
        return room.surgeries.some(
            (s) => s && this.isInProgressStatus(s.status)
        );
    }

    private isCompletedStatus(raw: any): boolean {
        const s = (raw == null ? "" : String(raw)).toLowerCase().trim();
        return (
            s === "completed" ||
            s === "done" ||
            s === "סגור" ||
            s.includes("הושל") ||
            s.includes("בוצע")
        );
    }

    getUrgencyTextFromSurgery(s: any): string {
        if (!s) return "";
        var u = s.urgency != null ? s.urgency : (s as any).Urgency;
        return u != null ? String(u) : "";
    }

    getHeaderProgressTitle(room: RoomData): string {
        if (!room || !room.surgeries || !room.surgeries.length) return "";

        var anchor = room.date || this.selectedDate;
        var dayStart = this.workingStart(anchor);
        var dayEnd = this.workingEnd(anchor);
        var DAY_MS = 24 * 60 * 60 * 1000;

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
            var x = parse(
                self,
                s.timeExit && s.timeExit !== "00:00:00"
                    ? s.timeExit
                    : s.timeEntrance,
                base
            );
            if (!e || !x) return Number.POSITIVE_INFINITY;
            if (x.getTime() < e.getTime()) x = new Date(x.getTime() + DAY_MS);
            return overlaps(e, x) ? e.getTime() : Number.POSITIVE_INFINITY;
        }

        for (var i = 0; i < room.surgeries.length; i++) {
            var s1 = room.surgeries[i];
            if (s1.status !== "InProgress") continue;
            var ts1 = startTs(this, s1);
            if (ts1 !== Number.POSITIVE_INFINITY && ts1 > chosenTs) {
                chosen = s1;
                chosenTs = ts1;
            }
        }

        if (!chosen) {
            var next: any = null,
                nextTs = Number.POSITIVE_INFINITY;
            for (var j = 0; j < room.surgeries.length; j++) {
                var s2 = room.surgeries[j];
                if (s2.status === "Completed") continue;
                var ts2 = startTs(this, s2);
                if (ts2 < nextTs) {
                    next = s2;
                    nextTs = ts2;
                }
            }
            chosen = next;
        }

        if (!chosen) {
            var last: any = null,
                lastTs = -Infinity;
            for (var k = 0; k < room.surgeries.length; k++) {
                var s3 = room.surgeries[k];
                if (s3.status !== "Completed") continue;
                var ts3 = startTs(this, s3);
                if (ts3 !== Number.POSITIVE_INFINITY && ts3 > lastTs) {
                    last = s3;
                    lastTs = ts3;
                }
            }
            chosen = last;
        }

        return chosen ? this.getUrgencyTextFromSurgery(chosen) : "";
    }

    getRoomStatusClassWithSettings(room: RoomData): string {
        const base =
            this.getRoomStatusClass && room
                ? this.getRoomStatusClass(room) || ""
                : "";

        if (!this.settings) return base;

        if (this.settings.colorize === false) return "";

        if (this.settings.blinkOnUnacked === false) {
            return base
                .replace(/\bgreen-blink\b/g, "green")
                .replace(/\bblink\b/g, "");
        }

        return base;
    }

    private hmToMin(s?: string | null): number | null {
        if (!s || s ===   "") return null;
        var p = s.split(":");
        if (p.length < 2) return null;
        var hh = +p[0],
            mm = +p[1];
        if (isNaN(hh) || isNaN(mm)) return null;
        return hh * 60 + mm;
    }

    getRoomLateMeta(room: RoomData): LateMeta | null {
        if (!room) return null;

        if (this.isRoomPastDay(room)) {
            var summary = this.getTurnoverSummary(room);
            var parsed = this.hmToMin(summary);
            var turnoverUsed = Math.max(20, parsed == null ? 20 : parsed);
            return {
                isLate: false,
                predictedEnd: null,
                overrunMin: 0,
                turnoverUsed: turnoverUsed,
                hasOverlapBacklog: false,
                backlogCount: 0,
                overlapUntil: null,
            };
        }

        var baseDate = room.date || this.selectedDate;
        var cutoff = new Date(String(baseDate) + "T15:00:00");

        var EXEMPT_AFTER_CLOCK = "14:30:00";
        var exemptStart = new Date(String(baseDate) + "T" + EXEMPT_AFTER_CLOCK);

        var summary = this.getTurnoverSummary(room);
        var parsed = this.hmToMin(summary);
        var TURNOVER_MIN = Math.max(20, parsed == null ? 20 : parsed);

        var list: any[] = [];
        for (var i = 0; i < (room.surgeries || []).length; i++) {
            var r = room.surgeries[i];
            if (!r) continue;
            var rdate = r.surgeryDate
                ? String(r.surgeryDate)
                : String(baseDate);
            if (String(rdate).slice(0, 10) !== String(baseDate).slice(0, 10))
                continue;

            var st = String(r.status || "").toLowerCase();
            var dur =
                r.TimeSurgeryToDo != null && !isNaN(+r.TimeSurgeryToDo)
                    ? Math.max(0, Math.round(+r.TimeSurgeryToDo))
                    : null;

            var ent = r.timeEntrance
                ? new Date(
                      String(rdate).slice(0, 10) +
                          "T" +
                          String(r.timeEntrance).slice(0, 5) +
                          ":00"
                  )
                : null;
            var exi = r.timeExit
                ? new Date(
                      String(rdate).slice(0, 10) +
                          "T" +
                          String(r.timeExit).slice(0, 5) +
                          ":00"
                  )
                : null;

            list.push({
                raw: r,
                status: st,
                entrance: ent,
                exit: exi,
                minutes: dur,
            });
        }

        list.sort(function (a, b) {
            if (!a.entrance && !b.entrance) return 0;
            if (!a.entrance) return 1;
            if (!b.entrance) return -1;
            return a.entrance.getTime() - b.entrance.getTime();
        });

        var active: any = null;
        for (var j = 0; j < list.length; j++) {
            var c = list[j];
            if (
                (c.status === "inprogress" ||
                    c.status === "in progress" ||
                    c.status === "in_progress") &&
                c.entrance
            ) {
                if (
                    !active ||
                    c.entrance.getTime() >= active.entrance.getTime()
                )
                    active = c;
            }
        }

        var cursor: Date | null = null;

        if (active) {
            if (active.entrance.getTime() < exemptStart.getTime()) {
                var actMin = active.minutes != null ? active.minutes : 60;
                cursor = new Date(active.entrance.getTime() + actMin * 60000);
            } else {
                cursor = null; // active started ≥ 14:30 → ignore for late
            }
        } else {
            var firstPending: any = null;
            for (var k = 0; k < list.length; k++) {
                if (
                    list[k].status !== "completed" &&
                    list[k].entrance &&
                    list[k].entrance.getTime() < exemptStart.getTime()
                ) {
                    firstPending = list[k];
                    break;
                }
            }
            if (firstPending && firstPending.entrance) {
                cursor = new Date(
                    firstPending.entrance.getTime() + TURNOVER_MIN * 60000
                );
            }
        }

        var predictedEnd: Date | null = null;
        if (cursor) {
            for (var m = 0; m < list.length; m++) {
                var it = list[m];
                if (it.status === "completed") continue;
                if (active && it === active) continue;

                var durMin = it.minutes != null ? it.minutes : 60;
                var sched = it.entrance ? it.entrance : cursor;

                var earliest = new Date(
                    cursor.getTime() + TURNOVER_MIN * 60000
                );
                var start =
                    sched.getTime() > earliest.getTime() ? sched : earliest;

                if (start.getTime() >= exemptStart.getTime()) break;

                cursor = new Date(start.getTime() + durMin * 60000);
            }
            predictedEnd = cursor;
        }

        var isLate =
            !!predictedEnd && predictedEnd.getTime() > cutoff.getTime();
        var overrunMin = predictedEnd
            ? Math.max(
                  0,
                  Math.round(
                      (predictedEnd.getTime() - cutoff.getTime()) / 60000
                  )
              )
            : 0;

        var ol = this.computeOverlapBacklog(room, TURNOVER_MIN);

        return {
            isLate: isLate,
            predictedEnd: predictedEnd,
            overrunMin: overrunMin,
            turnoverUsed: TURNOVER_MIN,
            hasOverlapBacklog: ol.hasOverlap,
            backlogCount: ol.count,
            overlapUntil: ol.until,
        };
    }

    computeOverlapBacklog(
        room: RoomData,
        TURNOVER_MIN: number
    ): { hasOverlap: boolean; count: number; until: Date | null } {
        if (!room || !room.surgeries || !room.surgeries.length)
            return { hasOverlap: false, count: 0, until: null };
        if (this.isRoomPastDay(room))
            return { hasOverlap: false, count: 0, until: null };

        var baseDate = room.date || this.selectedDate;

        var active: any = null;
        for (var i = 0; i < room.surgeries.length; i++) {
            var r: any = room.surgeries[i];
            var st = String(r.SurgeryStatus || r.status || "").toLowerCase();
            if (
                st.indexOf("inprogress") === -1 &&
                st !== "in progress" &&
                st !== "in_progress"
            )
                continue;
            var entClock =
                r.TimeEntranceToTheOperatingRoom != null
                    ? r.TimeEntranceToTheOperatingRoom
                    : r.timeEntrance;
            if (!entClock) continue;
            var ent = new Date(
                String(r.SurgeryDate || baseDate).slice(0, 10) +
                    "T" +
                    String(entClock).slice(0, 5) +
                    ":00"
            );
            if (!active || ent.getTime() >= active._ent.getTime()) {
                active = { row: r, _ent: ent };
            }
        }

        if (!active) return { hasOverlap: false, count: 0, until: null };

        var ttd: any =
            active.row.TimeSurgeryToDo != null
                ? active.row.TimeSurgeryToDo
                : active.row.timeSurgeryToDo;
        var dur =
            ttd != null && !isNaN(+ttd) ? Math.max(0, Math.round(+ttd)) : 60;
        var activeEnd = new Date(active._ent.getTime() + dur * 60000);
        var overlapUntil = new Date(activeEnd.getTime() + TURNOVER_MIN * 60000);

        var count = 0;
        for (var j = 0; j < room.surgeries.length; j++) {
            var s: any = room.surgeries[j];
            if (s === active.row) continue;
            var st2 = String(s.SurgeryStatus || s.status || "").toLowerCase();
            if (st2 === "completed") continue;

            var ec =
                s.TimeEntranceToTheOperatingRoom != null
                    ? s.TimeEntranceToTheOperatingRoom
                    : s.timeEntrance;
            if (!ec) continue;
            var ent2 = new Date(
                String(s.SurgeryDate || baseDate).slice(0, 10) +
                    "T" +
                    String(ec).slice(0, 5) +
                    ":00"
            );
            if (ent2.getTime() < overlapUntil.getTime()) count++;
        }

        return { hasOverlap: count > 0, count: count, until: overlapUntil };
    }

    private predictFirstLatePlanned(
        room: RoomData,
        TURNOVER_MIN: number
    ): { predictedEnd: Date } | null {
        if (!room || !room.surgeries || !room.surgeries.length) return null;

        if (this.isRoomPastDay(room)) return null;
        const baseDate = room.date || this.selectedDate;
        const shiftStart = this.workingStart(baseDate);
        const shiftEnd = this.workingEnd(baseDate);
        const DAY_MS = 24 * 60 * 60 * 1000;

        function statusOf(row: any): string {
            const raw =
                row && (row.status != null ? row.status : row.SurgeryStatus);
            return String(raw == null ? "" : raw).toLowerCase();
        }
        function getEClock(row: any): string | null {
            return row
                ? row.timeEntrance != null
                    ? row.timeEntrance
                    : row.TimeEntranceToTheOperatingRoom
                : null;
        }
        function getXClock(row: any): string | null {
            return row
                ? row.timeExit != null
                    ? row.timeExit
                    : row.TimeExitingTheOperatingRoom
                : null;
        }
        function getBase(row: any): string | Date {
            return (
                (row &&
                    (row.surgeryDate != null
                        ? row.surgeryDate
                        : row.SurgeryDate)) ||
                baseDate
            );
        }
        function isZeroClock(v?: string | null): boolean {
            return v === "00:00" || v === "00:00:00";
        }
        function normalizeUrgencyVal(u: any): string {
            var s = (u == null ? "" : String(u)).trim();
            s = s.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
            return s;
        }
        function urgencyRankOf(row: any): number {
            var raw = row && (row.Urgency != null ? row.Urgency : row.urgency);
            var n = normalizeUrgencyVal(raw);
            if (n === "דחוף") return 0;
            if (n === "ססיה-אשפוז") return 1;
            return 2;
        }
        function statusRankOf(st: string): number {
            if (st === "completed") return 0;
            if (
                st === "inprogress" ||
                st === "in progress" ||
                st === "in_progress"
            )
                return 1;
            if (st === "planned") return 2;
            return 3;
        }

        const list: {
            entrance: Date | null;
            exit: Date | null;
            expectedMin: number | null;
            status: string;
            exemptLate: boolean;

            sortStartMs: number;
            urgencyRank: number;
            statusRank: number;
            idKey: string;
        }[] = [];

        for (let i = 0; i < room.surgeries.length; i++) {
            const row: any = room.surgeries[i];

            const eClock = getEClock(row);
            if (!eClock) continue;

            const base = getBase(row);
            const xRaw = getXClock(row);

            let entrance = this.parseClockWithDate(eClock, base);
            let exit =
                xRaw && !isZeroClock(xRaw)
                    ? this.parseClockWithDate(xRaw, base)
                    : null;
            if (!entrance) continue;
            if (exit && exit.getTime() < entrance.getTime())
                exit = new Date(exit.getTime() + DAY_MS);

            let expectedMin: number | null = null;
            const ttd =
                row &&
                (row.TimeSurgeryToDo != null
                    ? row.TimeSurgeryToDo
                    : row.timeSurgeryToDo);
            if (ttd != null && !isNaN(+ttd))
                expectedMin = Math.max(0, Math.round(+ttd));
            if (expectedMin == null && exit)
                expectedMin = Math.max(
                    0,
                    Math.round((exit.getTime() - entrance.getTime()) / 60000)
                );

            const status = statusOf(row);
            const exemptLate = this.isLateExemptByUrgency
                ? this.isLateExemptByUrgency(row)
                : false;

            let sortStartMs = entrance.getTime();
            if (exit && entrance && exit.getDate() !== entrance.getDate()) {
                sortStartMs = sortStartMs - DAY_MS;
            }
            const urgRank = urgencyRankOf(row);
            const statRank = statusRankOf(status);
            const idKey =
                row.SurgeryID != null
                    ? String(row.SurgeryID)
                    : row.CaseNumber != null
                    ? String(row.CaseNumber)
                    : "";

            list.push({
                entrance,
                exit,
                expectedMin,
                status,
                exemptLate,
                sortStartMs,
                urgencyRank: urgRank,
                statusRank: statRank,
                idKey,
            });
        }

        list.sort(function (a, b) {
            if (a.sortStartMs !== b.sortStartMs)
                return a.sortStartMs - b.sortStartMs;
            if (a.urgencyRank !== b.urgencyRank)
                return a.urgencyRank - b.urgencyRank;
            if (a.statusRank !== b.statusRank)
                return a.statusRank - b.statusRank;
            if (a.idKey !== b.idKey) return a.idKey < b.idKey ? -1 : 1;
            return 0;
        });

        const now = new Date();
        let cursor: Date | null = null; // room-free time including turnover
        let activeIdx = -1;

        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (
                (it.status === "inprogress" ||
                    it.status === "in progress" ||
                    it.status === "in_progress") &&
                it.entrance &&
                it.entrance <= now
            ) {
                if (
                    activeIdx === -1 ||
                    list[activeIdx].entrance!.getTime() < it.entrance.getTime()
                ) {
                    activeIdx = i;
                }
            }
        }

        if (activeIdx >= 0) {
            const cur = list[activeIdx];
            const expMinForCur =
                cur.expectedMin != null
                    ? cur.expectedMin
                    : cur.exit && cur.entrance
                    ? Math.max(
                          0,
                          Math.round(
                              (cur.exit.getTime() - cur.entrance.getTime()) /
                                  60000
                          )
                      )
                    : 60;

            const elapsedMin = Math.max(
                0,
                Math.round((now.getTime() - cur.entrance!.getTime()) / 60000)
            );
            const remainingMin = Math.max(0, expMinForCur - elapsedMin);
            const endOfCur =
                remainingMin > 0
                    ? new Date(now.getTime() + remainingMin * 60000)
                    : now;

            cursor = new Date(endOfCur.getTime() + TURNOVER_MIN * 60000);
        }

        for (let j = 0; j < list.length; j++) {
            if (j === activeIdx) continue;
            const item = list[j];

            if (!cursor)
                cursor = item.entrance
                    ? new Date(item.entrance)
                    : new Date(shiftStart);

            const startPred = item.entrance
                ? new Date(Math.max(item.entrance.getTime(), cursor.getTime()))
                : new Date(cursor);

            let durMin: number;
            if (item.exit && item.entrance && item.status === "completed") {
                durMin = Math.max(
                    0,
                    Math.round(
                        (item.exit.getTime() - item.entrance.getTime()) / 60000
                    )
                );
            } else {
                durMin =
                    item.expectedMin != null
                        ? item.expectedMin
                        : item.exit && item.entrance
                        ? Math.max(
                              0,
                              Math.round(
                                  (item.exit.getTime() -
                                      item.entrance.getTime()) /
                                      60000
                              )
                          )
                        : 60;
            }

            const endSurgeryPred = new Date(
                startPred.getTime() + durMin * 60000
            );
            cursor = new Date(endSurgeryPred.getTime() + TURNOVER_MIN * 60000);
            if (
                item.status === "planned" &&
                endSurgeryPred > shiftEnd &&
                !item.exemptLate
            ) {
                return { predictedEnd: endSurgeryPred };
            }
        }

        return null;
    }

    private toHHmm(dt: Date): string {
        const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
        return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
    }

    private predictedLateEndHHmm(room: RoomData): string | null {
        const meta = this.getRoomLateMeta(room);
        return meta && meta.isLate && meta.predictedEnd
            ? this.toHHmm(meta.predictedEnd)
            : null;
    }

    private currentAckKeyForRoom(room: RoomData): string {
        const base = this.lastEventKeyForRoom(room.roomId);
        const late = this.predictedLateEndHHmm(room) || "OK";
        return base + "|" + late;
    }

    private normalizeUrgency(u: any): string {
        var s = (u == null ? "" : String(u)).trim();
        s = s.replace(/\s*-\s*/g, "-");
        s = s.replace(/\s+/g, " ");
        s = s.replace(/[.!?，,؛;]+/g, "");
        return s;
    }

    private isLateExemptByUrgency(row: any): boolean {
        if (!row) return false;
        var raw = row.Urgency != null ? row.Urgency : row.urgency;
        var n = this.normalizeUrgency(raw);
        var nNoSpaces = n.replace(/\s+/g, "");
        if (nNoSpaces === "ססיה-אשפוז") return true;
        if (n === "דחוף") return true;
        return false;
    }

    public isRoomPastDay(room: RoomData): boolean {
        if (!room || !room.date) return false;
        var d = new Date(room.date);
        var end = new Date(d);
        end.setHours(23, 59, 59, 999);
        var today = new Date();
        var startToday = new Date(today);
        startToday.setHours(0, 0, 0, 0);
        return end.getTime() < startToday.getTime();
    }

    private isSameDay(a: Date, b: Date): boolean {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    public isRoomClosedForColoring(room: RoomData): boolean {
        if (!room || !room.date) return false;
        if (this.isRoomPastDay(room)) return true;
        var d = new Date(room.date);
        var now = new Date();
        if (!this.isSameDay(d, now)) return false;
        var shiftEnd = this.workingEnd(d);
        return now.getTime() >= shiftEnd.getTime();
    }

    onMatDateChange(d: Date | null) {
        if (!d || isNaN(d.getTime())) {
            this.selectedDate = null as any;
            return;
        }
        const yyyy = d.getFullYear();
        const mm = ("0" + (d.getMonth() + 1)).slice(-2);
        const dd = ("0" + d.getDate()).slice(-2);
        this.selectedDate = `${yyyy}-${mm}-${dd}`;
        this.onDateChange();
    }

    ticker$ = interval(1000).pipe(startWith(0), shareReplay(1));

    getRoomIdleCounter(
        room: any,
        showSeconds = false
    ): { display: string; title: string } | null {
        try {
            if (!this.isRoomToday(room)) return null;
            if (this.hasInProgress(room)) return null;

            const plannedLeft =
                (this.plannedSurgeries && this.plannedSurgeries(room))?.length >
                0;
            if (this.settings?.hideIdleWhenNoPlanned && !plannedLeft)
                return null;
            const nowRaw = this._nowInSelectedDay();
            const now =
                this.settings?.continueIdleAfter1500WhenPlanned && plannedLeft
                    ? nowRaw
                    : this._clampTo1500(nowRaw);
            const dayStart = this._parseOnSelectedDay("07:30");
            const active =
                (this.activeSurgeries && this.activeSurgeries(room)) || [];
            let lastExit: Date | null = null;
            for (const s of active) {
                const status = (s?.status ?? s?.SurgeryStatus) as string;
                const exitStr =
                    s?.timeExit ??
                    s?.TimeExitingTheOperatingRoom ??
                    s?.timeEntrance ??
                    null;
                if (!exitStr) continue;
                const exitAt = this._parseOnSelectedDay(exitStr);
                if (!exitAt || exitAt > now) continue;
                if (status === "Completed") {
                    if (!lastExit || exitAt > lastExit) lastExit = exitAt;
                }
            }

            const gapStart = lastExit
                ? new Date(lastExit.getTime() + 20 * 60 * 1000)
                : dayStart;
            if (now <= gapStart) return null;

            const diffMs = now.getTime() - gapStart.getTime();
            if (diffMs <= 0) return null;

            const display = showSeconds
                ? this._formatHMMSS(diffMs)
                : this._formatHMM(diffMs);
            const title = `זמן פנוי מאז ${this._formatClock(
                gapStart
            )} (כולל 20׳ הכנה)`;
            return { display, title };
        } catch {
            return null;
        }
    }

    private _nowInSelectedDay(): Date {
        const base = this.selectedDateObj
            ? new Date(this.selectedDateObj)
            : new Date();
        const now = new Date();
        base.setHours(
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
        );
        return base;
    }
    private _clampTo1500(d: Date): Date {
        const cap = new Date(d);
        cap.setHours(15, 0, 0, 0);
        return d > cap ? cap : d;
    }
    private _parseOnSelectedDay(hhmm?: string | null): Date | null {
        if (!hhmm) return null;
        const [hh, mm] = hhmm.split(":").map((x) => +x);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        const d = this.selectedDateObj
            ? new Date(this.selectedDateObj)
            : new Date();
        d.setHours(hh, mm, 0, 0);
        return d;
    }
    private _formatHMM(ms: number): string {
        const totalMin = Math.max(0, Math.floor(ms / 60000));
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}:${m.toString().padStart(2, "0")}`;
    }
    private _formatHMMSS(ms: number): string {
        const total = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${h}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`;
    }
    private _formatClock(d: Date): string {
        return `${d.getHours().toString().padStart(2, "0")}:${d
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
    }

    showSummaryCardDefault = true;
    getSummaryForToday(): any | null {
        const surgeries = this._getSurgeriesArray();
        if (!surgeries?.length) return null;

        const selectedDateISO = this.selectedDateObj
            ? this._toISODate(this.selectedDateObj)
            : surgeries[0]?.SurgeryDate ?? this._toISODate(new Date());

        const todays = surgeries.filter(
            (s) => s?.SurgeryDate === selectedDateISO
        );
        if (!todays.length) return null;

        const completed = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "Completed"
        );
        const inProg = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "InProgress"
        );
        const planned = todays.filter(
            (s) => (s.SurgeryStatus ?? s.status) === "Planned"
        );

        const rooms = Array.from(
            new Set(todays.map((s) => s.SurgeryRoom))
        ).sort();
        const inProgRooms = new Set(inProg.map((s) => s.SurgeryRoom));
        const activeRooms = inProgRooms.size;
        const freeRooms = rooms.length - activeRooms;

        const sumCompletedMinutes = completed.reduce((acc, s) => {
            const m = this._num(s.TimeSurgeryToDo);
            if (!Number.isNaN(m)) return acc + m;
            const ms = this._diffMinutesSafe(
                selectedDateISO,
                s.TimeEntranceToTheOperatingRoom,
                s.TimeExitingTheOperatingRoom
            );
            return acc + (ms ?? 0);
        }, 0);

        const avgCaseMinutes = completed.length
            ? Math.round(sumCompletedMinutes / completed.length)
            : 0;

        const byRoom = rooms.map((room) => {
            const rCases = todays.filter((s) => s.SurgeryRoom === room);
            const rCompleted = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "Completed"
            );
            const rInProg = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "InProgress"
            );
            const rPlanned = rCases.filter(
                (s) => (s.SurgeryStatus ?? s.status) === "Planned"
            );

            const rMinutes = rCompleted.reduce(
                (acc, s) => acc + this._completedMinutes(s, selectedDateISO),
                0
            );

            const latestExit =
                rCompleted
                    .map((s) => s.TimeExitingTheOperatingRoom ?? s.timeExit)
                    .filter(Boolean)
                    .sort()
                    .slice(-1)[0] || null;

            return {
                room,
                completed: rCompleted.length,
                inProgress: rInProg.length,
                planned: rPlanned.length,
                totalMinutes: rMinutes,
                latestExit,
                cases: rCases.length,
                hasInProgress: rInProg.length > 0,
                roomData: {
                    roomId: room,
                    date: selectedDateISO,
                    surgeries: rCases,
                } as RoomData,
            };
        });

        function formatMinutesToHMM(totalMinutes: number): string {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}:${minutes.toString().padStart(2, "0")}`;
        }

        const busiest =
            byRoom.reduce((best, r) => {
                if (!best) return r;
                if (r.totalMinutes > best.totalMinutes) return r;
                if (r.totalMinutes === best.totalMinutes) {
                    if (r.completed > best.completed) return r;
                    if (
                        r.completed === best.completed &&
                        r.room.localeCompare(best.room) < 0
                    )
                        return r;
                }
                return best;
            }, null as any) || null;

        if (busiest) {
            busiest.totalHMM = formatMinutesToHMM(busiest.totalMinutes);
        }

        const maxMinutes = Math.max(...byRoom.map((r) => r.totalMinutes));

        this.busiestRooms = byRoom
            .filter((r) => r.totalMinutes === maxMinutes)
            .map((r) => ({
                ...r,
                totalHMM: formatMinutesToHMM(r.totalMinutes),
            }));

        const inProgressList = inProg
            .slice()
            .sort((a, b) =>
                (
                    a.TimeEntranceToTheOperatingRoom ??
                    a.timeEntrance ??
                    ""
                ).localeCompare(
                    b.TimeEntranceToTheOperatingRoom ?? b.timeEntrance ?? ""
                )
            )

            .map((s) => ({
                room: s.SurgeryRoom ?? s.roomId ?? s.surgeryRoom ?? s.room,
                title: this._pickTitleCompat(s),
                depart: (s.DepartName ?? s.department ?? "").toString().trim(),
                start: s.TimeEntranceToTheOperatingRoom ?? s.timeEntrance ?? "",
                end: s.TimeExitingTheOperatingRoom ?? s.timeExit ?? "",
                plannedMinutes: this._num(
                    s.TimeSurgeryToDo ?? s.timeToDo ?? s.duration
                ),
            }));

        const urgencyLabels = {
            urgent: "דחוף",
            sessionInpatient: "ססיה - אשפוז",
            elective: "אלקטיב",
            ambulatory: "אמבולטורי",
            noPriority: "ללא עדיפות",
            unknown: "דחיפות לא מוגדרת",
        };
        const urgencyIcons = {
            urgent: "🚑",
            sessionInpatient: "🏥",
            elective: "📖",
            ambulatory: "🚶",
            noPriority: "⬇️",
            unknown: "❔",
        };

        const counts = {
            urgent: 0,
            sessionInpatient: 0,
            elective: 0,
            ambulatory: 0,
            noPriority: 0,
            unknown: 0,
        };
        const lists = {
            urgent: [] as any[],
            sessionInpatient: [] as any[],
            elective: [] as any[],
            ambulatory: [] as any[],
            noPriority: [] as any[],
            unknown: [] as any[],
        };

        for (const s of todays) {
            const key = this._readUrgencyKey(s);
            counts[key] = (counts[key] ?? 0) + 1;
            lists[key].push(s);
        }

        return {
            dateISO: selectedDateISO,
            totals: {
                surgeries: todays.length,
                completed: completed.length,
                inProgress: inProg.length,
                planned: planned.length,
            },
            urgency: {
                labels: urgencyLabels,
                icons: urgencyIcons,
                counts,
                lists,
            },
            rooms: {
                total: rooms.length,
                active: activeRooms,
                free: freeRooms,
            },
            time: {
                totalMinutes: sumCompletedMinutes,
                avgMinutes: avgCaseMinutes,
                totalHMM: this._formatHMM_fromMinutes(sumCompletedMinutes),
                avgHMM: this._formatHMM_fromMinutes(avgCaseMinutes),
            },
            busiest: busiest
                ? {
                      room: busiest.room,
                      totalHMM: this._formatHMM(busiest.totalMinutes),
                      cases: busiest.completed,
                      hasInProgress:
                          byRoom.find((r) => r.room === busiest.room)
                              ?.inProgress > 0,
                  }
                : null,
            byRoom,
            inProgressList,
        };
    }

    getUrgencyKeys(urgency: any): string[] {
        return [
            "urgent",
            "sessionInpatient",
            "elective",
            "ambulatory",
            "noPriority",
            "unknown",
        ];
    }

    private _getSurgeriesArray(): any[] {
        const top = (this as any).surgeries || (this as any).data?.surgeries;
        if (Array.isArray(top) && top.length) return top;
        if (Array.isArray(this.roomsData) && this.roomsData.length) {
            const out: any[] = [];
            for (const r of this.roomsData) {
                if (!r?.surgeries) continue;
                for (const s of r.surgeries) {
                    out.push({
                        ...s,
                        SurgeryRoom: s.SurgeryRoom ?? r.roomId,
                        SurgeryDate:
                            s.SurgeryDate ??
                            s.surgeryDate ??
                            r.date ??
                            this.selectedDate,
                        TimeEntranceToTheOperatingRoom:
                            s.TimeEntranceToTheOperatingRoom ??
                            s.timeEntrance ??
                            null,
                        TimeExitingTheOperatingRoom:
                            s.TimeExitingTheOperatingRoom ?? s.timeExit ?? null,
                        SurgeryStatus: s.SurgeryStatus ?? s.status ?? "",
                    });
                }
            }
            return out;
        }
        return [];
    }

    private _num(v: any): number {
        const n = parseInt(v as any, 10);
        return Number.isFinite(n) ? n : NaN;
    }
    private _toISODate(d: Date): string {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    private _timeToDate(dateISO: string, hhmm?: string | null): Date | null {
        if (!hhmm) return null;
        const [h, m] = hhmm.split(":").map((x) => +x);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        const d = new Date(dateISO + "T00:00:00");
        d.setHours(h, m, 0, 0);
        return d;
    }
    private _diffMinutesSafe(
        dateISO: string,
        start?: string | null,
        end?: string | null
    ): number | null {
        const s = this._timeToDate(dateISO, start);
        const e = this._timeToDate(dateISO, end);
        if (!s || !e) return null;
        return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
    }

    private _pickTitleCompat(s: any): string {
        const name = (s.SurgeryName ?? s.surgeryName ?? "").toString().trim();
        const code = (s.SurgeryCode ?? s.surgeryCode ?? "").toString().trim();
        if (name && code) return `${name} (${code})`;
        if (name) return name;
        if (code) return code;
        return "—";
    }

    private _formatHMM_fromMinutes(
        totalMinutes: number | string | null | undefined
    ): string {
        const tNum = this._toNumber(totalMinutes, 0);
        const t = Math.max(0, Math.round(tNum));
        const h = Math.floor(t / 60);
        const m = t % 60;
        return `${h}:${m.toString().padStart(2, "0")}`;
    }

    private _completedMinutes(s: any, dateISO: string): number {
        const start = this._get<string>(
            s,
            "TimeEntranceToTheOperatingRoom",
            "timeEntrance"
        );
        const end = this._get<string>(
            s,
            "TimeExitingTheOperatingRoom",
            "timeExit"
        );

        const diff = this._diffMinutesSafe(dateISO, start, end);
        if (diff != null && Number.isFinite(diff)) {
            return diff >= 0 ? diff : diff + 24 * 60;
        }

        const declared = this._toNumber(
            this._get(s, "TimeSurgeryToDo", "timeToDo", "duration"),
            NaN
        );
        return Number.isFinite(declared) ? declared : 0;
    }

    private _get<T = any>(obj: any, ...keys: string[]): T | null {
        for (const k of keys) {
            const v = obj?.[k];
            if (v !== undefined && v !== null && v !== "") return v as T;
        }
        return null;
    }

    private _toNumber(v: any, fallback = 0): number {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
            const n = Number(v.trim());
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    }

    summaryDrilldownUrgency:
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "noPriority"
        | "unknown"
        | null = null;

    private _readUrgencyKey(
        s: any
    ):
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "noPriority"
        | "unknown" {
        const raw =
            s?.Urgency ??
            s?.urgency ??
            s?.Priority ??
            s?.priority ??
            s?.Triage ??
            s?.triage ??
            "";
        return this._normalizeUrgency(raw);
    }

    private _normalizeUrgency(
        u: any
    ):
        | "urgent"
        | "sessionInpatient"
        | "elective"
        | "ambulatory"
        | "noPriority"
        | "unknown" {
        const s = (u ?? "").toString().trim().toLowerCase();
        if (!s) return "unknown";

        if (s.includes("דחוף")) return "urgent";
        if (s.includes("ססיה")) return "sessionInpatient";
        if (s.includes("אלקט")) return "elective";
        if (s.includes("אמבול")) return "ambulatory";
        if (s.includes("ללא עדיפ")) return "noPriority";

        if (s.includes("emerg")) return "urgent";
        if (s.includes("session") || s.includes("inpatient"))
            return "sessionInpatient";
        if (s.includes("elective")) return "elective";
        if (s.includes("ambul")) return "ambulatory";
        if (
            s.includes("no prior") ||
            s.includes("no-prior") ||
            s.includes("no priority")
        )
            return "noPriority";

        return "unknown";
    }
    getRoomShortStatus(room: RoomData): "פנוי" | "בניתוח" {
        return !this.hasInProgress(room) ? "פנוי" : "בניתוח";
    }
}
