import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
}

export interface BloodTestItem {
  arriveTime: string;
  distributionTime: string | null;
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

export interface EmergencyRoomReportRow {
  Id_Num: string;
  Accept_Time: string;
  Entry_Date: string | null;
  Decision_Description: string;
  Consulted_Unit: string;
  ImagingList: ImagingItem[];
  BloodTestsList: BloodTestItem[];
  hasAnyBloodResult: boolean;
  Nurse_Name: string;
  Doctor_Name: string;
  Room_Name: string;
}

export const ER_DEPARTMENTS = [
  { id: 'אגף א', label: 'אגף א׳' },
  { id: 'אגף ב', label: 'אגף ב׳' },
  { id: 'מהלכים', label: 'מהלכים' },
] as const;

/** How many visible rows fit before we start scrolling */
const VISIBLE_ROW_COUNT = 8;
/** Seconds per row for scroll speed */
const SECONDS_PER_ROW = 4;

@Component({
  selector: 'app-emergency-room-report',
  templateUrl: './emergency-room-report.component.html',
  styleUrls: ['./emergency-room-report.component.css'],
  providers: [DatePipe]
})
export class EmergencyRoomReportComponent implements OnInit, OnDestroy {

  rawPatients: EmergencyRoomPatient[] = [];
  labTests: EmergencyRoomLabTest[] = [];
  mergedRows: EmergencyRoomReportRow[] = [];

  readonly departments = ER_DEPARTMENTS;
  selectedDepartment: string | null = null;

  loading = false;
  backgroundRefreshing = false;
  error: string | null = null;
  autoRefreshIntervalMinutes = 2;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private isFirstLoad = true;
  currentTime = new Date();

  /** Whether the patient list should auto-scroll (marquee style) */
  shouldScroll = false;
  /** CSS duration string for the scroll animation */
  scrollDuration = '30s';

  constructor(
    private http: HttpClient,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReport();
    this.startAutoRefresh();
    this.startElapsedTimer();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopElapsedTimer();
  }

  selectDepartment(dept: string): void {
    this.selectedDepartment = dept;
    this.applyFilterAndMerge();
  }

  trackByIdNum(_index: number, row: EmergencyRoomReportRow): string {
    return row.Id_Num;
  }

  loadReport(isBackgroundRefresh = false): void {
    if (this.isFirstLoad) {
      this.loading = true;
      this.isFirstLoad = false;
    } else if (isBackgroundRefresh) {
      this.backgroundRefreshing = true;
    }
    if (!isBackgroundRefresh) {
      this.error = null;
    }

    const baseUrl = (environment.url || '').replace(/\/?$/, '/');
    const patientsUrl = baseUrl + 'GetEmergencyRoomPatients';
    const labUrl = baseUrl + 'GetEmergencyRoomLabTests';

    const headers = new HttpHeaders({
      'Accept': 'application/json; charset=utf-8',
      'Content-Type': 'application/json; charset=utf-8'
    });

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
        if (!isBackgroundRefresh) this.error = this.error || (err?.message || 'שגיאה בטעינת בדיקות המעבדה');
        return of([]);
      })
    );

    forkJoin({ patients: patients$, lab: lab$ }).subscribe({
      next: ({ patients, lab }) => {
        this.rawPatients = patients;
        this.labTests = lab;
        this.applyFilterAndMerge();
        this.loading = false;
        this.backgroundRefreshing = false;
      },
      error: () => {
        this.loading = false;
        this.backgroundRefreshing = false;
      }
    });
  }

  private applyFilterAndMerge(): void {
    if (this.selectedDepartment == null || this.selectedDepartment === '') {
      this.mergedRows = [];
      this.shouldScroll = false;
      return;
    }
    const list = this.rawPatients.filter(p => (p.Room_Name || '').trim() === this.selectedDepartment);
    this.mergedRows = this.buildMergedRows(list);
    this.updateScrollState();
  }

  private updateScrollState(): void {
    const count = this.mergedRows.length;
    if (count > VISIBLE_ROW_COUNT) {
      this.shouldScroll = true;
      const totalSeconds = count * SECONDS_PER_ROW;
      this.scrollDuration = totalSeconds + 's';
    } else {
      this.shouldScroll = false;
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

      // Build imaging list — deduplicate by ERBOE name
      var imagingMap = new Map<string, ImagingItem>();
      for (var pat of group) {
        var erboe = (pat.ERBOE || '').trim();
        if (!erboe || erboe.indexOf('דימ-') === -1) continue;
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
      var bloodTestsList: BloodTestItem[] = [];
      for (var l of labForPatient) {
        var arriveMin = l.Arrive_Min != null && String(l.Arrive_Min).trim() !== '' ? String(l.Arrive_Min).trim() : null;
        if (arriveMin == null) continue;
        var arriveTime = this.formatTimeHHMM(arriveMin);
        if (arriveTime === '00:00') continue;
        var distRaw = l.Distribution_Time != null && String(l.Distribution_Time).trim() !== '' ? String(l.Distribution_Time).trim() : null;
        var distributionTime = distRaw ? this.formatTimeHHMM(distRaw) : null;
        bloodTestsList.push({
          arriveTime: arriveTime,
          distributionTime: distributionTime,
          hasResult: distributionTime != null
        });
      }
      var hasAnyBloodResult = bloodTestsList.some(function(b) { return b.hasResult; });

      var entryDate = this.getEntryDateFromGroup(group);
      rows.push({
        Id_Num: idNum,
        Accept_Time: (first.Accept_Time || '').trim() || '—',
        Entry_Date: entryDate,
        Decision_Description: (first.Decision_Description || '').trim() || '—',
        Consulted_Unit: this.buildConsultedUnitText(group),
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

  /** Elapsed time from imaging send time (HH:MM today) to now. Ticks every second via currentTime. */
  getImagingElapsed(sendTime: string | null): string {
    if (!sendTime) return '—';
    var parts = sendTime.split(':');
    if (parts.length < 2) return '—';
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return '—';

    var now = this.currentTime;
    var sendDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    var diffMs = now.getTime() - sendDate.getTime();
    if (diffMs < 0) return '—';

    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMins / 60);
    var mins = diffMins % 60;
    if (diffHours > 0) {
      return diffHours + ':' + this.padStart(String(mins), 2, '0');
    }
    return diffMins <= 0 ? '0 דק׳' : diffMins + ' דק׳';
  }

  private getEntryDateFromGroup(group: EmergencyRoomPatient[]): string | null {
    for (var p of group) {
      var raw = p as Record<string, unknown>;
      var v = raw['Entry_Date'] || raw['entry_Date'] || raw['EntryDate'] || p.Entry_Date || p.Admission_Date;
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    var first = group[0];
    if (first && first.Admission_Date != null && String(first.Admission_Date).trim() !== '') {
      return String(first.Admission_Date).trim();
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

  /** Returns CSS class for elapsed time coloring: warning > 2h, critical > 4h */
  getElapsedClass(entryDate: string | null | undefined): string {
    if (!entryDate || !String(entryDate).trim()) return '';
    var date = new Date(entryDate);
    if (isNaN(date.getTime())) return '';
    var diffMs = this.currentTime.getTime() - date.getTime();
    if (diffMs < 0) return '';
    var diffHours = diffMs / 3600000;
    if (diffHours >= 4) return 'critical';
    if (diffHours >= 2) return 'warning';
    return '';
  }

  /** Returns CSS class for decision badge styling */
  getDecisionClass(decision: string): string {
    if (!decision || decision === '—') return '';
    // אשפוז = hospitalize, שחרור = release
    if (decision.indexOf('אשפוז') !== -1 || decision.indexOf('חדר') !== -1) return 'hospitalize';
    if (decision.indexOf('שחרור') !== -1) return 'release';
    return '';
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
    var self = this;
    this.autoRefreshTimer = setInterval(function() { self.silentRefresh(); }, ms);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }
}