import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router, ActivatedRoute } from '@angular/router';

type ErResizeObserver = {
  disconnect(): void;
  observe(target: Element): void;
  unobserve(target: Element): void;
};
type ErResizeObserverCtor = new (callback: () => void) => ErResizeObserver;

export interface EmergencyRoomPatient {
  Id_Num?: string;
  Admission_No?: string;
  Admission_Date?: string | null;
  Room_Name?: string;
  Send_Time?: string;
  Accept_Time?: string;
  ERBOE?: string;
  Doctor_Name?: string;
  Nurse_Name?: string;
  Decision_Description?: string;
  Consulted_Unit?: string;
  Entry_Date?: string | null;
  /** First letters of Patient_First_Name + Patient_Last_Name from API (`Initials` in JSON — PascalCase typical from ASMX). */
  Initials?: string | null;
  /** Consilium answer date; ISO 8601. Backend may send Answer_Date or answer_Date */
  answer_Date?: string | null;
  /** Text value from API: only exactly 1 (number or \"1\") maps to green success in ייעוצים; 2/other/null/0 do not. */
  final_Answer?: string | null;
  /** 1 = final answer (green), 2 = not final. Backend may send Answer_Type or answer_Type. If missing, derived from answer_Date + final_Answer */
  answer_Type?: number | string | null;
}

export interface EmergencyRoomLabTest {
  Id_Num?: string;
  CaseNumbers?: string;
  Orderr?: string;
  Distribution_Hour?: string;
  Distribution_Time?: string;
  Arrive_Hour?: string;
  Arrive_Min?: string;
  ODATE?: string;
  OTIME?: string;
  NDESCRIP?: string;
}

export interface BloodTestItem {
  labName: string;
  arriveTime: string;
  distributionTime: string |null;
  hasResult: boolean;
}

export interface ImagingItem {
  name: string;
  /** Accept time formatted HH:MM, or null if not yet accepted */
  time: string | null;
  /** Send time formatted HH:MM, used for elapsed counter when no accept time */
  sendTime: string | null;
  /** Whether imaging has been accepted (has result) */
  hasResult: boolean;
}

/** Consilium answer display: 1 = final (green), 2 = not final (warning), null = no answer */
export type ConsiliumAnswerStatus = 1 | 2 | null;

export type ConsultChipVariant = 'done' | 'not_final' | 'pending';

/** One chip in the ייעוצים column — unit + answer status indicator (see template) */
export interface ConsultedChipItem {
  unitName: string;
  chipVariant: ConsultChipVariant;
  time: string;
  entryDate: string | null;
}

export interface EmergencyRoomReportRow {
  Id_Num: string;
  /** Derived from GET patient row(s); same as EmergencyRoomPatient.Initials. */
  Initials: string | null;
  Accept_Time: string;
  Entry_Date: string | null;
  Decision_Description: string;
  Consulted_Unit: string;
  /** Chips for ייעוצים column — unit names + ✓ / — / ⋯ */
  ConsultedChips: ConsultedChipItem[];  ImagingList: ImagingItem[];
  BloodTestsList: BloodTestItem[];
  hasAnyBloodResult: boolean;
  Nurse_Name: string;
  Doctor_Name: string;
  Room_Name: string;
}

export const ER_DEPARTMENTS = [
  { id: 'אגף א', label: 'אגף א׳' , route: "wing-a"   },
  { id: 'אגף ב', label: 'אגף ב׳', route: "wing-b" },
  { id: 'מהלכים', label: 'מהלכים', route: "flow" },
  { id: 'אגף א', label: 'אגף ג', route: "wing-c" }
] as const;

/** Seconds per row when marquee is active (only if list overflows the viewport) */
const SECONDS_PER_ROW = 4;
/** Minimum marquee duration when the list is tall enough to scroll */
const MIN_SCROLL_SECONDS = 28;

@Component({
  selector: 'app-emergency-room-report',
  templateUrl: './emergency-room-report.component.html',
  styleUrls: ['./emergency-room-report.component.css'],
  providers: []
})
export class EmergencyRoomReportComponent implements OnInit, AfterViewInit, OnDestroy {

  rawPatients: EmergencyRoomPatient[] = [];
  labTests: EmergencyRoomLabTest[] = [];
  mergedRows: EmergencyRoomReportRow[] = [];

  readonly departments = ER_DEPARTMENTS;
  selectedDepartment: string | null = null;

  loading = false;
  /** Patients are shown but lab GET has not merged yet — blood column fills when false. */
  labPending = false;
  /** Lab failures should not hide the patients table. */
  labError: string | null = null;
  backgroundRefreshing = false;
  error: string | null = null;
  autoRefreshIntervalMinutes = 3;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private isFirstLoad = true;
  /** In-flight patient HTTP; cancelled when a new patient fetch starts. */
  private patientsLoadSubscription = new Subscription();
  /** In-flight lab HTTP; only cancelled on full reload — not during background refresh while lab is pending. */
  private labLoadSubscription = new Subscription();
  private reportRequestGeneration = 0;
  private labRequestGeneration = 0;
  currentTime = new Date();

  @ViewChild('tableBodyWrap', { read: ElementRef }) tableBodyWrap?: ElementRef<HTMLElement>;

  /** ResizeObserver watches the clip area; clears when component is destroyed */
  private marqueeResizeObserver: ErResizeObserver | null = null;
  private marqueeMeasureTimer: ReturnType<typeof setTimeout> | null = null;
  private marqueeObservedWrap: HTMLElement | null = null;
  /** Avoid endless timers if the table viewport is briefly missing */
  private marqueeStaleWrapRetries = 0;

  /** True when list overflows the table body and seamless scroll is running */
  shouldScroll = false;
  /** CSS duration string for the scroll animation */
  scrollDuration = '30s';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

ngOnInit(): void {
  console.log('ngOnInit fired');

  const routeDepartment = this.route.snapshot.paramMap.get('department');

  if (routeDepartment) {
    const department = ER_DEPARTMENTS.find(d => d.route === routeDepartment);

    if (department) {
      this.selectedDepartment = department.id;
    } else {
      this.selectedDepartment = ER_DEPARTMENTS[0].id;
    }
  } else {
    this.selectedDepartment = ER_DEPARTMENTS[0].id;
  }

  this.loadReport();
  this.startAutoRefresh();
  this.startElapsedTimer();
}

  ngOnDestroy(): void {
    this.patientsLoadSubscription.unsubscribe();
    this.labLoadSubscription.unsubscribe();
    this.stopAutoRefresh();
    this.stopElapsedTimer();
    if (this.marqueeMeasureTimer != null) {
      clearTimeout(this.marqueeMeasureTimer);
      this.marqueeMeasureTimer = null;
    }
    if (this.marqueeResizeObserver != null) {
      this.marqueeResizeObserver.disconnect();
      this.marqueeResizeObserver = null;
    }
    this.marqueeObservedWrap = null;
  }

  ngAfterViewInit(): void {
    var g = globalThis as unknown as { ResizeObserver?: ErResizeObserverCtor };
    var RO = g.ResizeObserver;
    if (typeof RO !== 'undefined') {
      var self = this;
      this.marqueeResizeObserver = new RO(function() {
        self.scheduleMarqueeOverflowCheck();
      });
    }
  }

selectDepartment(dept: string): void {
  this.selectedDepartment = dept;
  this.applyFilterAndMerge();

  const department = ER_DEPARTMENTS.find(d => d.id === dept);

  if (department) {
    this.router.navigate(
      ['/EmergencyRoomReport', department.route],
      { replaceUrl: true }
    );
  }
}

  trackByIdNum(_index: number, row: EmergencyRoomReportRow): string {
    return row.Id_Num;
  }

  loadReport(isBackgroundRefresh = false): void {
    console.log('loadReport called, isBackgroundRefresh =', isBackgroundRefresh);
    if (this.isFirstLoad) {
      this.loading = true;
      this.labPending = false;
      this.isFirstLoad = false;
    } else if (isBackgroundRefresh) {
      this.backgroundRefreshing = true;
    }
    if (!isBackgroundRefresh) {
      this.error = null;
      this.labError = null;
    }

    const baseUrl = (environment.url || '').replace(/\/?$/, '/');
    const patientsUrl = baseUrl + 'GetEmergencyRoomPatients';
    const labUrl = baseUrl + 'GetEmergencyRoomLabTests';

    const headers = new HttpHeaders({
      'Accept': 'application/json; charset=utf-8',
      'Content-Type': 'application/json; charset=utf-8'
    });
    let labRequestFailed = false;

    const patients$ = this.http.get<EmergencyRoomPatient[] | { d: EmergencyRoomPatient[] }>(patientsUrl, {
      headers,
      responseType: 'json'
    }).pipe(
      map(res => Array.isArray(res) ? res : (res?.d ?? [])),
      catchError(err => {
        if (!isBackgroundRefresh) this.error = this.error || (err?.message || 'שגיאה בטעינת מטופלי מיון');
        return of([]);
      })
    );

    const lab$ = this.http.get<EmergencyRoomLabTest[] | { d: EmergencyRoomLabTest[] }>(labUrl, {
      headers,
      responseType: 'json'
    }).pipe(
      map(res => Array.isArray(res) ? res : (res?.d ?? [])),
      catchError(err => {
        labRequestFailed = true;
        this.labError = err?.message || 'שגיאה בטעינת בדיקות המעבדה';
        return of([]);
      })
    );

    const skipLabRestart = isBackgroundRefresh && this.labPending;

    this.patientsLoadSubscription.unsubscribe();
    this.patientsLoadSubscription = new Subscription();

    const gen = ++this.reportRequestGeneration;
    let pendingLab: EmergencyRoomLabTest[] | null = null;
    let patientsReceived = false;
    let labHttpSettledForGen = skipLabRestart;

    this.patientsLoadSubscription.add(
      patients$.subscribe(patients => {
        if (gen !== this.reportRequestGeneration) {
          return;
        }
        patientsReceived = true;
        this.rawPatients = patients;
        if (pendingLab != null && !labRequestFailed) {
          this.labError = null;
        }
        if (pendingLab != null && (!labRequestFailed || this.labTests.length === 0)) {
          this.labTests = pendingLab;
        }
        if (pendingLab != null) {
          pendingLab = null;
        }
        this.labPending = skipLabRestart ? this.labPending : !labHttpSettledForGen;
        this.applyFilterAndMerge();
        this.loading = false;
        this.backgroundRefreshing = false;
      })
    );

    if (!skipLabRestart) {
      this.labLoadSubscription.unsubscribe();
      this.labLoadSubscription = new Subscription();
      labHttpSettledForGen = false;
      this.labPending = true;
      const labGen = ++this.labRequestGeneration;

      this.labLoadSubscription.add(
        lab$.subscribe(lab => {
          if (labGen !== this.labRequestGeneration) {
            return;
          }
          if (!labRequestFailed) {
            this.labError = null;
          }
          if (!labRequestFailed || this.labTests.length === 0) {
            this.labTests = lab;
          }
          this.labPending = false;
          if (this.rawPatients.length > 0) {
            this.applyFilterAndMerge();
          } else {
            pendingLab = lab;
          }
        })
      );
    }
  }

  private applyFilterAndMerge(): void {
    if (this.selectedDepartment == null || this.selectedDepartment === '') {
      this.mergedRows = [];
      this.shouldScroll = false;
      this.scheduleMarqueeOverflowCheck();
      return;
    }
    const list = this.rawPatients.filter(p => (p.Room_Name || '').trim() === this.selectedDepartment);
    this.marqueeStaleWrapRetries = 0;
    this.mergedRows = this.buildMergedRows(list);
    this.updateScrollState();
    this.scheduleMarqueeOverflowCheck();
  }

  private updateScrollState(): void {
    const count = this.mergedRows.length;
    if (count === 0) {
      this.shouldScroll = false;
      return;
    }
    var totalSeconds = Math.max(count * SECONDS_PER_ROW, MIN_SCROLL_SECONDS);
    this.scrollDuration = totalSeconds + 's';
  }

  /** Run after layout: enable marquee only when the primary row block is taller than the viewport. */
  private scheduleMarqueeOverflowCheck(): void {
    var self = this;
    if (this.marqueeMeasureTimer != null) {
      clearTimeout(this.marqueeMeasureTimer);
    }
    this.marqueeMeasureTimer = setTimeout(function() {
      self.marqueeMeasureTimer = null;
      self.applyMarqueeOverflowCheck();
    }, 0);
  }

  private observeTableBodyWrap(): void {
    var ro = this.marqueeResizeObserver;
    if (ro == null) {
      return;
    }
    var el = this.tableBodyWrap?.nativeElement ?? null;
    if (this.marqueeObservedWrap !== null && this.marqueeObservedWrap !== el) {
      try {
        ro.unobserve(this.marqueeObservedWrap);
      } catch {
        /* noop */
      }
      this.marqueeObservedWrap = null;
    }
    if (el != null) {
      if (this.marqueeObservedWrap !== el) {
        try {
          ro.observe(el);
          this.marqueeObservedWrap = el;
        } catch {
          /* noop */
        }
      }
    } else if (this.marqueeObservedWrap !== null) {
      try {
        ro.unobserve(this.marqueeObservedWrap);
      } catch {
        /* noop */
      }
      this.marqueeObservedWrap = null;
    }
  }

  /**
   * Uses the height of the first N patient rows (primary list) so we do not treat
   * the duplicated marquee block as mandatory overflow.
   */
  private applyMarqueeOverflowCheck(): void {
    var count = this.mergedRows.length;

    if (count === 0) {
      this.observeTableBodyWrap();
      var was = this.shouldScroll;
      this.shouldScroll = false;
      if (was !== this.shouldScroll) {
        this.cdr.markForCheck();
      }
      return;
    }

    var wrap = this.tableBodyWrap?.nativeElement ?? null;
    if (wrap == null) {
      if (count > 0) {
        this.marqueeStaleWrapRetries++;
        this.observeTableBodyWrap();
        if (this.marqueeStaleWrapRetries < 24) {
          this.scheduleMarqueeOverflowCheck();
        }
      } else {
        this.marqueeStaleWrapRetries = 0;
      }
      return;
    }
    this.marqueeStaleWrapRetries = 0;

    this.observeTableBodyWrap();

    var inner = wrap.querySelector('.table-body-scroll') as HTMLElement | null;
    if (inner == null) {
      this.shouldScroll = false;
      return;
    }

    var rowEls = inner.querySelectorAll(':scope > .grid-row.patient-row');
    var max = Math.min(count, rowEls.length);
    var blockHeight = 0;
    for (var i = 0; i < max; i++) {
      var r = rowEls.item(i) as HTMLElement;
      blockHeight += r.getBoundingClientRect().height;
    }
    if (blockHeight === 0) {
      blockHeight = inner.scrollHeight;
    }

    var viewport = wrap.clientHeight;
    var needsMarquee = viewport > 0 && blockHeight > viewport + 2;
    if (needsMarquee !== this.shouldScroll) {
      this.shouldScroll = needsMarquee;
      this.cdr.markForCheck();
      var self = this;
      setTimeout(function() {
        self.applyMarqueeOverflowCheck();
      }, 0);
    }
  }

  private buildMergedRows(patients: EmergencyRoomPatient[]): EmergencyRoomReportRow[] {
    var byKey = new Map<string, EmergencyRoomPatient[]>();
    for (var p of patients) {
      var id = (p.Id_Num || '').toString().trim();
      if (!id) continue;
      if (!byKey.has(id)) byKey.set(id, []);
      byKey.get(id)!.push(p);
    }

    var rows: EmergencyRoomReportRow[] = [];
    for (var entry of Array.from(byKey)) {
      var group = entry[1];
      var first = group[0];

      // Build imaging list — deduplicate by ERBOE name (any non-empty ERBOE, e.g. דימ-*, מע-*, מעאנדר)
      var imagingMap = new Map<string, ImagingItem>();
      for (var pat of group) {
        var erboe = (pat.ERBOE || '').trim();
        if (!erboe) continue;
        // Skip if we already have this ERBOE name
        if (imagingMap.has(erboe)) continue;

        var rawAcceptTime = (pat.Accept_Time || '').trim();
        var acceptTime = rawAcceptTime ? this.formatTimeHHMM(rawAcceptTime) : null;
        var rawSendTime = (pat.Send_Time || '').trim();
        var sendTime = rawSendTime ? this.formatTimeHHMM(rawSendTime) : null;

        // Only include if we have at least a send time or accept time
        if (!acceptTime && !sendTime) continue;

        imagingMap.set(erboe, {
          name: erboe,
          time: acceptTime,
          sendTime: sendTime,
          hasResult: acceptTime != null && acceptTime !== ''
        });
      }
      var imagingList: ImagingItem[] = [];
      imagingMap.forEach(function(val) { imagingList.push(val); });
      imagingList.sort(function(a, b) { return a.name.localeCompare(b.name); });

      var idNum = (first.Id_Num || '').toString();
      var labForPatient = this.labTests.filter(function(l) { return (l.Id_Num || '').toString().trim() === idNum; });
      const bloodMap = new Map<string, BloodTestItem>();
      for (var l of labForPatient) {
        var arriveMin = l.Arrive_Min != null && String(l.Arrive_Min).trim() !== '' ? String(l.Arrive_Min).trim() : null;
        if (arriveMin == null) continue;
        var arriveTime = this.formatTimeHHMM(arriveMin);
        if (arriveTime === '00:00') continue;
        var distRaw = l.Distribution_Time != null && String(l.Distribution_Time).trim() !== '' ? String(l.Distribution_Time).trim() : null;
        var distributionTime = distRaw ? this.formatTimeHHMM(distRaw) : null;

        const labName = (l.NDESCRIP || '').trim();

        if (!bloodMap.has(labName)) {
          bloodMap.set(labName, {
            labName,
            arriveTime,
            distributionTime,
            hasResult: distributionTime != null
          });
        } else {
          const existing = bloodMap.get(labName)!;

          if (!existing.hasResult && distributionTime != null) {
            existing.hasResult = true;
            existing.distributionTime = distributionTime;
          }
        }


      }

      const bloodTestsList = Array.from(bloodMap.values());
      var hasAnyBloodResult = bloodTestsList.some(function(b) { return b.hasResult; });

      var entryDate = this.getEntryDateFromGroup(group);
      var consultedChips = this.buildConsultedChips(group);
      rows.push({
        Id_Num: idNum,
        Initials: this.pickInitialsFromGroup(group),
        Accept_Time: (first.Accept_Time || '').trim() || '—',
        Entry_Date: entryDate,
        Decision_Description: (first.Decision_Description || '').trim() || '—',
        Consulted_Unit: this.buildConsultedUnitText(group),
        ConsultedChips: consultedChips,
        ImagingList: imagingList,
        BloodTestsList: bloodTestsList,
        hasAnyBloodResult: hasAnyBloodResult,
        Nurse_Name: (first.Nurse_Name || '').trim() || '—',
        Doctor_Name: (first.Doctor_Name || '').trim() || '—',
        Room_Name: (first.Room_Name || '').trim()
      });
    }
    return rows;
  }

  /**
   * Builds consultation chips.
   * Success (green + ✓) applies only when Final_Answer equals 1 (number or string \"1\").
   * All other states use the existing pending / not_final (amber) styling.
   */
  private buildConsultedChips(group: EmergencyRoomPatient[]): ConsultedChipItem[] {
    var seen = new Set<string>();
    var chips: ConsultedChipItem[] = [];
    for (var p of group) {
      var unit = (p.Consulted_Unit || '').trim();
      if (!unit || seen.has(unit)) continue;
      seen.add(unit);
      var raw = p as Record<string, unknown>;
      var entryRaw = raw['Entry_Date'] ?? raw['entry_Date'] ?? raw['EntryDate'] ?? p.Entry_Date ?? p.Admission_Date;
      var entryDate = entryRaw != null && String(entryRaw).trim() !== '' ? String(entryRaw).trim() : null;
      var ad = raw['answer_Date'] ?? raw['Answer_Date'] ?? p.answer_Date;
      var fa = raw['final_Answer'] ?? raw['Final_Answer'] ?? p.final_Answer;
      var at = raw['answer_Type'] ?? raw['Answer_Type'] ?? p.answer_Type;
      var answerDate = ad != null && String(ad).trim() !== '' ? String(ad).trim() : null;
      var finalAnswer = fa != null && String(fa).trim() !== '' ? String(fa).trim() : null;
      var finalAnswerIsTwo = finalAnswer != null && (finalAnswer === '2' || finalAnswer.trim() === '2');
      var answerType: ConsiliumAnswerStatus = null;
      if (at !== undefined && at !== null && at !== '') {
        var n = typeof at === 'number' ? at : parseInt(String(at), 10);
        if (n === 1) answerType = 1;
        else if (n === 2) answerType = 2;
      }
      var hasAnswerDate = answerDate != null;
      var finalAnswerIsOne = EmergencyRoomReportComponent.isFinalAnswerOne(fa);

      var chipVariant: ConsultChipVariant;
      if (finalAnswerIsOne) {
        chipVariant = 'done';
      } else if (answerType === null && !hasAnswerDate && !finalAnswer) {
        chipVariant = 'pending';
      } else if (answerType === 2 || finalAnswerIsTwo || !hasAnswerDate) {
        chipVariant = 'not_final';
      } else if (answerType === 1 && hasAnswerDate && !finalAnswerIsTwo) {
        chipVariant = 'not_final';
      } else {
        chipVariant = 'not_final';
      }
      chips.push({
        unitName: unit,
        chipVariant: chipVariant,
        time: '',
        entryDate: entryDate
      });
    }
    return chips;
  }

  /** True only when Final_Answer indicates completed success (exactly 1). */
  private static isFinalAnswerOne(fa: unknown): boolean {
    if (fa === null || fa === undefined || fa === '') {
      return false;
    }
    if (typeof fa === 'number') {
      return fa === 1;
    }
    var s = String(fa).trim();
    if (s === '') {
      return false;
    }
    return s === '1';
  }

  /** Combine all unique Consulted_Unit values for a patient group */
  private buildConsultedUnitText(group: EmergencyRoomPatient[]): string {
    var units: string[] = [];
    for (var p of group) {
      var u = (p.Consulted_Unit || '').trim();
      if (u && units.indexOf(u) === -1) {
        units.push(u);
      }
    }
    return units.length > 0 ? units.join(', ') : '—';
  }

  formatTimeHHMM(raw: string | null | undefined): string {
    if (raw == null || raw === '') return '';
    var s = (raw + '').trim().replace(/\D/g, '');
    if (s.length === 0) return '';
    var padded = s.length <= 4 ? this.padStart(s, 4, '0') : s.slice(-4);
    return padded.slice(0, 2) + ':' + padded.slice(2);
  }

  private padStart(str: string, targetLength: number, padChar: string): string {
    while (str.length < targetLength) {
      str = padChar + str;
    }
    return str;
  }

  refresh(): void {
    this.loadReport(false);
  }

silentRefresh(): void {
  console.log('silentRefresh called, labPending =', this.labPending, 'labError =', this.labError);
  
  // If lab has been pending since initial load and never resolved, force reset it
  if (this.labPending) {
    this.labPending = false;
  }
  
  this.loadReport(true);
}

  retry(): void {
    this.error = null;
    this.loadReport(false);
  }

  getLast4Digits(idNum: string | null | undefined): string {
    if (!idNum) return '—';
    var s = idNum.toString().trim();
    if (s.length <= 4) return s;
    return s.slice(-4);
  }

  /** First non-empty Initials from merged patient rows (JSON may use `Initials` or camelCase `initials`). */
  private pickInitialsFromGroup(group: EmergencyRoomPatient[]): string | null {
    for (var i = 0; i < group.length; i++) {
      var v = EmergencyRoomReportComponent.readInitialsFromPatient(group[i]);
      if (v) {
        return v;
      }
    }
    return null;
  }

  private static readInitialsFromPatient(p: EmergencyRoomPatient): string | null {
    var r = p as Record<string, unknown>;
    var raw = r['Initials'] ?? r['initials'] ?? p.Initials;
    if (raw == null || raw === '') {
      return null;
    }
    var s = String(raw).trim();
    return s || null;
  }

private getEntryDateFromGroup(group: EmergencyRoomPatient[]): string | null {
  for (const p of group) {
    if (p.Admission_Date && String(p.Admission_Date).trim() !== '') {
      return String(p.Admission_Date).trim();
    }
  }
  return null;
}

  getElapsedFromEntry(entryDate: string | null | undefined): string {
    if (!entryDate || !String(entryDate).trim()) return '—';
    var date = new Date(entryDate);
    if (isNaN(date.getTime())) return '—';
    var now = this.currentTime;
    var diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return '—';
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMins / 60);
    var mins = diffMins % 60;
    if (diffHours > 0) {
      return mins > 0 ? diffHours + ' שעות ' + mins + ' דקות' : diffHours + ' שעות';
    }
    return diffMins <= 0 ? 'פחות מדקה' : diffMins + ' דקות';
  }

  getConsultStatusTitle(variant: ConsultChipVariant): string {
    switch (variant) {
      case 'done':
        return 'התקבלה תשובה סופית';
      case 'pending':
        return 'טרם נענה בקשת הייעוץ';
      default:
        return 'תשובה זמנית או שעדיין לא הוחלטה סופית';
    }
  }

  /** Returns CSS class for decision badge styling */
  getDecisionClass(decision: string): string {
    if (!decision || decision === '—') return '';
    var d = (decision + '').trim();
    if (d === 'לא ידוע') return '';
    // אשפוז = hospitalize, שחרור = release
    if (decision.indexOf('אשפוז') !== -1 || decision.indexOf('חדר') !== -1) return 'hospitalize';
    if (decision.indexOf('שחרור') !== -1) return 'release';
    return '';
  }

  /** Patient-facing label: map backend "לא ידוע" to "טרם הוחלט" */
  getDecisionDisplayText(decision: string | null | undefined): string {
    var d = (decision || '').trim();
    if (d === '' || d === '—') return '—';
    if (d === 'לא ידוע') return 'טרם הוחלט';
    return d;
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    var self = this;
    this.elapsedTimer = setInterval(function() {
      self.currentTime = new Date();
      self.cdr.detectChanges();
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null; 
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    var ms = this.autoRefreshIntervalMinutes * 60 * 1000;
    console.log('Auto refresh set for', ms, 'ms =', this.autoRefreshIntervalMinutes, 'minutes');
    var self = this;
    this.autoRefreshTimer = setInterval(function() { 
      console.log('Auto refresh tick firing');
      self.silentRefresh(); 
    }, ms);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }
}