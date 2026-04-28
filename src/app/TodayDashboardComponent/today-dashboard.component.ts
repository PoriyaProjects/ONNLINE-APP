import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
  } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { MatTableDataSource } from '@angular/material/table';
  import { environment } from 'src/environments/environment';
  
  export interface TodaySummary {
    totalAppointments: number;
    arrived: number;
    notArrived: number;
    date: string;
  }
  
  export interface TodayDepartStat {
    depart: string;
    depart_ID: string;
  clinicName?: string;
    roomNumber: string;
    total: number;
    arrived: number;
    notArrived: number;
    startTime: string;
    endTime: string;
  }

interface TodayDepartGroup {
  depart: string;
  depart_ID: string;
  total: number;
  arrived: number;
  notArrived: number;
  startTime: string;
  endTime: string;
  splits: TodayDepartStat[];
}
  
  export interface TodayPatient {
    patientNumber: string;
    patientId: string;
    patientFirstName: string;
    patientLastName: string;
    serviceDescription: string;
    appointmentTime: string;
    /** Preferred display from API (GetTodayPatients / GetTodayPatientsByDepartId). */
    clinicName: string;
    /** Legacy alias; same value as clinicName when API provides both. */
    depart: string;
    roomNumber: string;
    arrived: boolean;
    caseNumber: string;
  }
  
  @Component({
    selector: 'app-today-dashboard',
    templateUrl: './today-dashboard.component.html',
    styleUrls: ['./today-dashboard.component.css'],
  })
  export class TodayDashboardComponent implements OnInit, OnDestroy {
    summary: TodaySummary = {
      totalAppointments: 0,
      arrived: 0,
      notArrived: 0,
      date: '',
    };
  
    departments: TodayDepartStat[] = [];
    departmentGroups: TodayDepartGroup[] = [];
    allPatients: TodayPatient[] = [];
    filteredPatients: TodayPatient[] = [];
  
    selectedDepart: string | null = null;
    selectedDepartGroup: TodayDepartGroup | null = null;
    selectedSplit: TodayDepartStat | null = null;
    showDepartModal = false;
    modalPatients: TodayPatient[] = [];
    modalPatientsLoading = false;
    filterStatus: 'all' | 'arrived' | 'notArrived' = 'all';
    searchQuery = '';
    deptSearchQuery = '';
  
    displayedColumns = [
      'status',
      'appointmentTime',
      'patientFirstName',
      'patientLastName',
      'patientId',
      'serviceDescription',
      'depart',
      'roomNumber',
    ];
  
    dataSource = new MatTableDataSource<TodayPatient>([]);
    loading = true;
    lastRefresh: Date = new Date();
  
    private refreshInterval: any;
    private readonly REFRESH_MS = 45000; // 45 seconds
  
    constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}
  
    ngOnInit(): void {
      this.loadDashboard();
      this.refreshInterval = setInterval(() => {
        this.loadDashboard(true);
      }, this.REFRESH_MS);
    }
  
    ngOnDestroy(): void {
      if (this.refreshInterval) clearInterval(this.refreshInterval);
    }
  
    loadDashboard(silent = false): void {
      if (!silent) this.loading = true;
  
      this.http
        .post(environment.url + 'GetTodayDashboard', {})
        .subscribe((res: any) => {
          const d = res?.d ?? {};
          const summary = d.Summary ?? d.summary ?? {};
          const departments = d.Departments ?? d.departments ?? [];
          this.summary = {
            totalAppointments: summary.TotalAppointments ?? summary.totalAppointments ?? 0,
            arrived: summary.Arrived ?? summary.arrived ?? 0,
            notArrived: summary.NotArrived ?? summary.notArrived ?? 0,
            date: summary.Date ?? summary.date ?? '',
          };
          this.departments = (departments as any[]).map((dep) => ({
            depart: dep.Depart ?? dep.depart,
            depart_ID: dep.Depart_ID ?? dep.depart_ID,
            clinicName:
              this.readPatientString(dep as any, 'ClinicName', 'clinicName') ||
              this.clinicNameFromDashboardRow(dep),
            roomNumber: dep.RoomNumber ?? dep.roomNumber,
            total: dep.Total ?? dep.total,
            arrived: dep.Arrived ?? dep.arrived,
            notArrived: dep.NotArrived ?? dep.notArrived,
            startTime: dep.StartTime ?? dep.startTime,
            endTime: dep.EndTime ?? dep.endTime,
          }));
          this.groupDepartments();
          this.loading = false;
          this.lastRefresh = new Date();
          this.loadPatients();
          this.cdr.detectChanges();
        });
    }
  
    loadPatients(departId: string | null = null): void {
      const endpoint = departId ? 'GetTodayPatientsByDepartId' : 'GetTodayPatients';
      const body = departId ? { departId } : {};
      this.http
        .post(environment.url + endpoint, body)
        .subscribe((res: any) => {
          const arr = this.parseSoapJsonArray(res);
          this.allPatients = arr.map((p) => this.mapTodayPatientFromApi(p));
          this.applyFilters();
          /** GetTodayPatients* uses short ClinicName; GetTodayDashboard often only has long Depart on splits. */
          this.syncSplitClinicNamesFromLoadedPatients();
          this.cdr.detectChanges();
        });
    }
  
    selectDepart(depart: TodayDepartGroup | null): void {
      if (this.selectedDepart === depart?.depart_ID) {
        this.selectedDepart = null;
        this.selectedDepartGroup = null;
        this.selectedSplit = null;
        this.modalPatients = [];
        this.showDepartModal = false;
        this.loadPatients();
      } else {
        this.selectedDepart = depart?.depart_ID ?? null;
        this.selectedDepartGroup = depart;
        this.selectedSplit = null;
        this.modalPatients = [];
        this.showDepartModal = !!depart;
        this.loadPatients(this.selectedDepart);
      }
    }

    closeDepartModal(): void {
      this.showDepartModal = false;
      this.selectedSplit = null;
      this.modalPatients = [];
    }

    selectSplit(split: TodayDepartStat): void {
      this.selectedSplit = split;
      this.modalPatientsLoading = true;

      if (!this.selectedDepart) {
        this.modalPatients = [];
        this.modalPatientsLoading = false;
        return;
      }

      // Reuse selected department API and slice by split room to avoid page scrolling.
      this.http
        .post(environment.url + 'GetTodayPatientsByDepartId', { departId: this.selectedDepart })
        .subscribe((res: any) => {
          const arr = this.parseSoapJsonArray(res);
          const patients = arr.map((p) => this.mapTodayPatientFromApi(p));

          this.modalPatients = patients.filter((p) => p.roomNumber === split.roomNumber);
          this.modalPatientsLoading = false;
          this.cdr.detectChanges();
        });
    }
  
    setFilter(status: 'all' | 'arrived' | 'notArrived'): void {
      this.filterStatus = status;
      this.applyFilters();
    }
  
    onSearch(): void {
      this.applyFilters();
    }
  
    applyFilters(): void {
      let result = [...this.allPatients];
  
      if (this.filterStatus === 'arrived') {
        result = result.filter((p) => p.arrived);
      } else if (this.filterStatus === 'notArrived') {
        result = result.filter((p) => !p.arrived);
      }
  
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        result = result.filter(
          (p) =>
            p.patientFirstName.toLowerCase().includes(q) ||
            p.patientLastName.toLowerCase().includes(q) ||
            p.patientId.includes(q) ||
            p.patientNumber.includes(q) ||
            (p.clinicName || '').toLowerCase().includes(q) ||
            (p.depart || '').toLowerCase().includes(q)
        );
      }
  
      this.filteredPatients = result;
      this.dataSource.data = result;
    }
  
    /** Department cards filtered by dept search (name, id, room, clinic). */
    get filteredDepartmentGroups(): TodayDepartGroup[] {
      const raw = this.deptSearchQuery.trim().toLowerCase();
      if (!raw) return this.departmentGroups;
      return this.departmentGroups.filter((g) => {
        if ((g.depart || '').toLowerCase().includes(raw)) return true;
        if ((g.depart_ID || '').toLowerCase().includes(raw)) return true;
        return g.splits.some(
          (s) =>
            (s.clinicName || '').toLowerCase().includes(raw) ||
            String(s.roomNumber || '')
              .toLowerCase()
              .includes(raw)
        );
      });
    }

    /** Message when department grid is empty / no search matches */
    get deptSectionEmptyMessage(): string | null {
      if (this.loading) return null;
      if (this.filteredDepartmentGroups.length > 0) return null;
      if (this.departmentGroups.length === 0) return 'אין נתוני מחלקות';
      return 'לא נמצאו מחלקות התואמות לחיפוש';
    }

    get arrivedPercent(): number {
      if (!this.summary.totalAppointments) return 0;
      return Math.round((this.summary.arrived / this.summary.totalAppointments) * 100);
    }
  
    get secondsUntilRefresh(): number {
      const elapsed = (new Date().getTime() - this.lastRefresh.getTime()) / 1000;
      return Math.max(0, Math.round(this.REFRESH_MS / 1000 - elapsed));
    }
  
    private groupDepartments(): void {
      const grouped = new Map<string, TodayDepartGroup>();

      this.departments.forEach((dep) => {
        const key = dep.depart_ID || dep.depart;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            depart: dep.depart,
            depart_ID: dep.depart_ID,
            total: dep.total || 0,
            arrived: dep.arrived || 0,
            notArrived: dep.notArrived || 0,
            startTime: dep.startTime,
            endTime: dep.endTime,
            splits: [dep],
          });
          return;
        }

        existing.total += dep.total || 0;
        existing.arrived += dep.arrived || 0;
        existing.notArrived += dep.notArrived || 0;
        existing.startTime = this.pickStartTime(existing.startTime, dep.startTime);
        existing.endTime = this.pickEndTime(existing.endTime, dep.endTime);
        existing.splits.push(dep);
      });

      this.departmentGroups = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    }

    private pickStartTime(first: string, second: string): string {
      if (!first) return second;
      if (!second) return first;
      return first <= second ? first : second;
    }

    private pickEndTime(first: string, second: string): string {
      if (!first) return second;
      if (!second) return first;
      return first >= second ? first : second;
    }

    /** ASMX often returns `{ d: [...] }` or `{ d: "[...]" }` (string). */
    private parseSoapJsonArray(res: any): any[] {
      let raw: any = res?.d ?? res?.D ?? res;
      if (raw == null || raw === '') {
        return [];
      }
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          return [];
        }
      }
      return Array.isArray(raw) ? raw : [];
    }

    /**
     * Modal split rows come from GetTodayDashboard — often `Depart` is the long dept title and `ClinicName`
     * is missing. After GetTodayPatientsByDepartId loads, copy each row's ClinicName onto the split for
     * the same RoomNumber (matches your TodayPatientRow.ClinicName like "כירור.פה.לסת").
     */
    private syncSplitClinicNamesFromLoadedPatients(): void {
      if (!this.selectedDepart || !this.selectedDepartGroup?.splits?.length) {
        return;
      }
      if (!this.allPatients.length) {
        return;
      }
      for (const split of this.selectedDepartGroup.splits) {
        const room = this.normalizeRoomKey(split.roomNumber);
        if (!room) {
          continue;
        }
        const match = this.allPatients.find(
          (patient) => this.normalizeRoomKey(patient.roomNumber) === room
        );
        if (!match) {
          continue;
        }
        const label = (match.clinicName || match.depart || '').trim();
        if (label) {
          split.clinicName = label;
        }
      }
    }

    private normalizeRoomKey(r: string | null | undefined): string {
      return String(r ?? '').trim();
    }

    /** Maps GetTodayPatients / GetTodayPatientsByDepartId row (ClinicName + Depart from API). */
    private mapTodayPatientFromApi(p: any): TodayPatient {
      const clinicName = this.readPatientString(p, 'ClinicName', 'clinicName');
      const depart = this.readPatientString(p, 'Depart', 'depart');
      return {
        patientNumber: p.PatientNumber ?? p.patientNumber ?? '',
        patientId: p.PatientId ?? p.patientId ?? '',
        patientFirstName: p.PatientFirstName ?? p.patientFirstName ?? '',
        patientLastName: p.PatientLastName ?? p.patientLastName ?? '',
        serviceDescription: p.ServiceDescription ?? p.serviceDescription ?? '',
        appointmentTime: p.AppointmentTime ?? p.appointmentTime ?? '',
        clinicName,
        depart,
        roomNumber: p.RoomNumber ?? p.roomNumber ?? '',
        arrived: !!(p.Arrived ?? p.arrived),
        caseNumber: p.CaseNumber ?? p.caseNumber ?? '',
      };
    }

    private readPatientString(row: any, pascal: string, camel: string): string {
      if (!row || typeof row !== 'object') {
        return '';
      }
      const v = row[pascal] ?? row[camel];
      if (v === undefined || v === null) {
        return '';
      }
      const s = String(v).trim();
      return s;
    }

    formatTime(t: string): string {
      if (!t) return t;
      if (t.includes(':')) {
        const parts = t.split(':');
        return `${parts[0]}:${parts[1] ?? '00'}`;
      }
      if (t.length >= 4) {
        return t.substring(0, 2) + ':' + t.substring(2, 4);
      }
      return t;
    }

    /**
     * Display name for a split row: top-level ClinicName from GetTodayDashboard first (same as patient API),
     * then OutpatientClinic.ClinicName. Depart is not used here — template falls back to depart when needed.
     */
    private clinicNameFromDashboardRow(dep: any): string {
      const top = dep?.ClinicName ?? dep?.clinicName;
      if (top !== undefined && top !== null && String(top).trim() !== '') {
        return String(top).trim();
      }
      const oc = dep?.OutpatientClinic ?? dep?.outpatientClinic ?? null;
      if (oc && typeof oc === 'object') {
        const nested = oc.ClinicName ?? oc.clinicName;
        if (nested !== undefined && nested !== null && String(nested).trim() !== '') {
          return String(nested).trim();
        }
      }
      return '';
    }
  }