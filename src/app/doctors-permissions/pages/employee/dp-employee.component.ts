import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { DpAccess, DpEmployeeDetail, DpHistory, DpNote, DpProfile, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatDay, formatStamp, statusClass, statusLabel } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-employee',
  templateUrl: './dp-employee.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
  styles: [`
    .dp-profile-pick__btn,
    .dp-profile-pick__list button {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: 100%;
      white-space: normal;
      text-align: right;
      border: 1px solid #d6deea;
      background: #fff;
      border-radius: 12px;
      min-height: 44px;
      padding: 8px 12px;
      color: #0f172a;
      cursor: pointer;
      font: inherit;
    }
    .dp-profile-pick__panel { margin-top: 6px; }
    .dp-profile-pick__list {
      list-style: none;
      margin: 6px 0 0;
      padding: 0;
      width: 100%;
      max-height: 240px;
      overflow: auto;
    }
    .dp-profile-pick__list li + li { margin-top: 6px; }
    .dp-profile-pick__empty { color: #64748b; padding: 8px 12px; }
    .dp-profile-pick__btn span,
    .dp-profile-pick__list button span {
      display: block;
      overflow-wrap: anywhere;
    }
    .dp-profile-pick__list button.is-selected { outline: 2px solid #4f46e5; }
  `],
})
export class DpEmployeeComponent implements OnInit {
  tab = 'profiles';
  loading = true;
  error = '';
  detail: DpEmployeeDetail;
  access: DpAccess;
  profiles: DpTemplate[] = [];
  notes: DpNote[] = [];
  notesLoading = false;
  notesLoaded = false;
  notesError = '';
  noteBusy = false;
  noteError = '';
  noteText = '';
  noteId = 0;
  history: DpHistory[] = [];
  historyLoading = false;
  historyLoaded = false;
  historyError = '';
  historyTotal = 0;
  historySkip = 0;
  historyCategory = '';
  historyFrom = '';
  historyTo = '';
  historySearch = '';
  readonly historyPageSize = 50;
  employeeId = '';
  showAssign = false;
  profileListOpen = false;
  profileQuery = '';
  assignProfileId = 0;
  saving = false;
  formError = '';
  busyKey = '';
  label = statusLabel;
  chip = statusClass;
  day = formatDay;
  stamp = formatStamp;
  readonly historyFilters = [
    { key: '', label: 'הכל' },
    { key: 'profiles', label: 'פרופילים' },
    { key: 'signatures', label: 'חתימות' },
    { key: 'notes', label: 'הערות' },
    { key: 'org', label: 'ארגון' },
  ];

  constructor(
    private service: DoctorPermissionsService,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.route.paramMap.subscribe((params) => {
      this.employeeId = params.get('employeeId') || '';
      this.tab = 'profiles';
      this.notesLoaded = false;
      this.historyLoaded = false;
      this.load(this.employeeId);
    });
  }

  load(employeeId: string): void {
    this.loading = true;
    this.error = '';
    this.service.employee(employeeId).subscribe(
      (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.detail = null;
        this.error = (err && err.message) || 'לא ניתן לטעון את העובד.';
      }
    );
  }

  back(): void {
    this.location.back();
  }

  initials(): string {
    const employee = this.detail && this.detail.employee;
    if (!employee) {
      return '';
    }
    return ((employee.firstName || '').charAt(0) + (employee.lastName || '').charAt(0)) || '•';
  }

  activeProfiles(): DpProfile[] {
    return ((this.detail && this.detail.profiles) || []).filter((row) => row.doctorActive || row.isActive);
  }

  signState(value: string): string {
    return value ? 'חתם' : 'טרם חתם';
  }

  openAssign(): void {
    this.showAssign = true;
    this.profileListOpen = false;
    this.profileQuery = '';
    this.formError = '';
    this.assignProfileId = 0;
    this.service.templates().subscribe(
      (rows) => (this.profiles = (rows || []).filter((row) => row.isActive)),
      (err) => (this.formError = (err && err.message) || 'לא ניתן לטעון פרופילים')
    );
  }

  closeAssign(): void {
    this.showAssign = false;
    this.profileListOpen = false;
    this.profileQuery = '';
  }

  toggleProfileList(): void {
    this.profileListOpen = !this.profileListOpen;
    if (this.profileListOpen) {
      this.profileQuery = '';
    }
  }

  pickProfile(id: number): void {
    this.assignProfileId = id;
    this.profileListOpen = false;
    this.profileQuery = '';
  }

  filteredProfiles(): DpTemplate[] {
    const query = (this.profileQuery || '').trim().toLowerCase();
    if (!query) {
      return this.profiles;
    }
    return this.profiles.filter((row) => this.profileSearchText(row).indexOf(query) >= 0);
  }

  profileSearchText(row: DpTemplate): string {
    return [
      row.profileId || row.id,
      row.departmentName,
      row.departmentNames,
      row.specialty,
      row.doctorAuthorizationGroupDesc,
      row.name,
      row.permissionName,
    ].join(' ').toLowerCase();
  }

  selectedProfile(): DpTemplate {
    if (!this.assignProfileId) {
      return null;
    }
    return this.profiles.find((row) => (row.profileId || row.id) === this.assignProfileId) || null;
  }

  assign(): void {
    if (!this.assignProfileId) {
      this.formError = 'יש לבחור פרופיל';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.service.saveProfile({ employeeId: this.employeeId, profileId: this.assignProfileId, doctorActive: true }).subscribe(
      () => {
        this.saving = false;
        this.closeAssign();
        this.snack.open('הפרופיל שויך', null, { duration: 2500 });
        this.load(this.employeeId);
      },
      (err) => {
        this.saving = false;
        this.formError = (err && err.message) || 'השיוך נכשל';
      }
    );
  }

  unassign(row: DpProfile): void {
    this.busyKey = 'u' + row.profileId;
    this.service.saveProfile({ employeeId: this.employeeId, profileId: row.profileId || row.id, doctorActive: false }).subscribe(
      () => {
        this.busyKey = '';
        this.load(this.employeeId);
      },
      (err) => {
        this.busyKey = '';
        this.snack.open((err && err.message) || 'הפעולה נכשלה', null, { duration: 3000 });
      }
    );
  }

  sign(row: DpProfile): void {
    this.busyKey = 's' + row.profileId;
    this.service.approve(this.employeeId, row.profileId || row.id, 'doctor').subscribe(
      () => {
        this.busyKey = '';
        this.load(this.employeeId);
      },
      (err) => {
        this.busyKey = '';
        this.snack.open((err && err.message) || 'החתימה נכשלה', null, { duration: 3000 });
      }
    );
  }

  openHistory(): void {
    this.tab = 'history';
    if (!this.historyLoaded) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.historyError = '';
    this.service.history(this.employeeId, {
      category: this.historyCategory,
      fromDate: this.historyFrom,
      toDate: this.historyTo,
      search: this.historySearch,
      skip: this.historySkip,
      take: this.historyPageSize,
    }).subscribe(
      (page) => {
        this.history = (page && page.rows) || [];
        this.historyTotal = (page && page.total) || 0;
        this.historyLoading = false;
        this.historyLoaded = true;
      },
      () => {
        this.historyLoading = false;
        this.historyError = 'לא ניתן לטעון את ההיסטוריה.';
      }
    );
  }

  setHistoryCategory(key: string): void {
    this.historyCategory = key;
    this.historySkip = 0;
    this.loadHistory();
  }

  historyPage(delta: number): void {
    this.historySkip = Math.max(0, this.historySkip + delta);
    this.loadHistory();
  }

  openNotes(): void {
    this.tab = 'notes';
    if (!this.notesLoaded) {
      this.loadNotes();
    }
  }

  loadNotes(): void {
    this.notesLoading = true;
    this.notesError = '';
    this.service.notes(this.employeeId).subscribe(
      (rows) => {
        this.notes = rows || [];
        this.notesLoading = false;
        this.notesLoaded = true;
      },
      () => {
        this.notesLoading = false;
        this.notesError = 'לא ניתן לטעון הערות.';
      }
    );
  }

  editNote(note: DpNote): void {
    this.noteId = note.id;
    this.noteText = note.noteText;
  }

  saveNote(): void {
    this.noteBusy = true;
    this.noteError = '';
    this.service.saveNote({ id: this.noteId, employeeId: this.employeeId, noteText: this.noteText, isActive: true }).subscribe(
      () => {
        this.noteBusy = false;
        this.noteId = 0;
        this.noteText = '';
        this.loadNotes();
      },
      (err) => {
        this.noteBusy = false;
        this.noteError = (err && err.message) || 'שמירת ההערה נכשלה';
      }
    );
  }

  removeNote(note: DpNote): void {
    this.service.saveNote({ id: note.id, employeeId: this.employeeId, isActive: false }).subscribe(
      () => this.loadNotes(),
      (err) => this.snack.open((err && err.message) || 'הפעולה נכשלה', null, { duration: 3000 })
    );
  }
}
