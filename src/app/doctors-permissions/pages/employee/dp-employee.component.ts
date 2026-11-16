import { Location } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
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
    .dp-card--link { cursor: pointer; }
    .dp-profile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 8px;
      align-items: stretch;
    }
    .dp-card--compact {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      margin-bottom: 0;
    }
    .dp-card--compact h2 { margin: 0 0 2px; font-size: 15px; }
    .dp-card--compact p { margin: 0; font-size: 13px; line-height: 1.35; }
    .dp-card--compact .dp-meta { margin-top: 4px; }
    .dp-card--compact .dp-actions { margin-top: auto; padding-top: 8px; }
    .dp-card--compact .dp-btn { min-height: 28px; padding: 0 10px; font-size: 12px; }
    .dp-card--compact .dp-sign {
      min-height: 26px;
      padding: 0 10px;
      border: 1px solid #c7d2fe;
      border-radius: 999px;
      background: #eef2ff;
      color: #312e81;
      font-size: 12px;
      font-weight: 600;
      line-height: 26px;
    }
    .dp-card--compact .dp-sign:hover:not(:disabled) { background: #e0e7ff; }
    .dp-card--compact .dp-sign:focus { outline: 2px solid #4f46e5; outline-offset: 1px; }
    .dp-card--compact .dp-sign:disabled { opacity: 0.55; }
    .dp-actions .dp-btn.active {
      background: #1d4ed8;
      color: #fff;
      border-color: #1d4ed8;
    }
    .dp-folio {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 794px;
      background: #fff;
      color: #0f172a;
      padding: 28px 32px 36px;
      direction: rtl;
      text-align: right;
      font-family: "Segoe UI", Arial, sans-serif;
      box-sizing: border-box;
    }
    .dp-folio__head { border-bottom: 3px solid #3730a3; padding-bottom: 12px; margin-bottom: 14px; }
    .dp-folio__kicker { margin: 0 0 4px; color: #3730a3; font-size: 12px; font-weight: 700; }
    .dp-folio h1 { margin: 0; font-size: 26px; line-height: 1.3; }
    .dp-folio__id { margin: 4px 0 0; color: #475569; font-size: 13px; }
    .dp-folio__meta { display: flex; flex-wrap: wrap; }
    .dp-folio__meta div {
      width: 50%;
      box-sizing: border-box;
      padding: 0 8px 8px 0;
    }
    .dp-folio__meta strong, .dp-folio__meta span { display: block; }
    .dp-folio__meta div > span { color: #64748b; font-size: 11px; }
    .dp-folio__meta strong {
      margin-top: 2px;
      padding: 6px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    .dp-folio h2 { margin: 16px 0 8px; font-size: 16px; color: #1e1b4b; }
    .dp-folio__empty { margin: 0; color: #64748b; font-size: 13px; }
    .dp-folio__profile {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      margin-top: 8px;
      background: #fff;
    }
    .dp-folio__profile h3 { margin: 0 0 6px; font-size: 15px; }
    .dp-folio__profile p { margin: 2px 0; font-size: 13px; line-height: 1.45; }
    .dp-folio__profile p span { color: #64748b; }
    .dp-folio__signs { margin-top: 8px; }
    .dp-folio__signs span {
      display: inline-block;
      margin: 0 0 4px 6px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #eef2ff;
      color: #312e81;
      font-size: 12px;
    }
    .dp-folio__notes { margin-top: 18px; border-top: 2px solid #e2e8f0; padding-top: 4px; }
    .dp-folio__note { margin-top: 8px; padding: 8px 10px; background: #f8fafc; border-radius: 8px; }
    .dp-folio__note p { margin: 0; font-size: 13px; line-height: 1.45; white-space: pre-wrap; }
    .dp-folio__note-meta { margin-top: 4px; color: #64748b; font-size: 11px; }
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
  pdfBusy = false;
  @ViewChild('folio', { static: false }) folio: ElementRef;
  formError = '';
  busyKey = '';
  label = statusLabel;
  chip = statusClass;
  day = formatDay;
  stamp = formatStamp;
  activity = 'active';
  readonly activities = [
    { key: 'active', label: 'פעיל' },
    { key: 'inactive', label: 'לא פעיל' },
    { key: 'all', label: 'הכל' },
  ];
  profileFilter: '' | 'pending' | 'approved' = '';
  readonly profileFilters: { key: '' | 'pending' | 'approved'; label: string }[] = [
    { key: '', label: 'הכל' },
    { key: 'pending', label: 'ממתין לאישור' },
    { key: 'approved', label: 'מאושר' },
  ];
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
    private router: Router,
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

  isProfilePending(row: DpProfile): boolean {
    return !!(row && row.waitingFor);
  }

  isProfileApproved(row: DpProfile): boolean {
    return !!(row && row.doctorSignature && row.directManagerSignature && row.headManagerSignature);
  }

  profilesForActivity(): DpProfile[] {
    const rows = (this.detail && this.detail.profiles) || [];
    if (this.activity === 'all') {
      return rows;
    }
    if (this.activity === 'inactive') {
      return rows.filter((row) => !(row.doctorActive || row.isActive));
    }
    return rows.filter((row) => !!(row.doctorActive || row.isActive));
  }

  filteredEmployeeProfiles(): DpProfile[] {
    const rows = this.profilesForActivity();
    if (this.profileFilter === 'pending') {
      return rows.filter((row) => this.isProfilePending(row));
    }
    if (this.profileFilter === 'approved') {
      return rows.filter((row) => this.isProfileApproved(row));
    }
    return rows;
  }

  openApproval(_row: DpProfile): void {
    this.router.navigate(['/doctors-permissions/approvals'], { queryParams: { q: this.employeeId } });
  }

  signState(value: string): string {
    return value ? 'חתם' : 'טרם חתם';
  }

  draftNote(): string {
    const text = (this.noteText || '').trim();
    return text && !this.noteId ? text : '';
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

  exportPdf(): void {
    if (!this.folio || this.pdfBusy) {
      return;
    }
    this.pdfBusy = true;
    if (this.notesLoaded) {
      this.writePdf();
      return;
    }
    this.service.notes(this.employeeId).subscribe(
      (rows) => {
        this.notes = rows || [];
        this.notesLoaded = true;
        setTimeout(() => this.writePdf());
      },
      () => {
        this.pdfBusy = false;
        this.snack.open('ייצוא ה-PDF נכשל', null, { duration: 3000 });
      }
    );
  }

  writePdf(): void {
    const node = this.folio && this.folio.nativeElement;
    if (!node) {
      this.pdfBusy = false;
      return;
    }
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      const pagePx = ((pageHeight - margin * 2) / imgHeight) * canvas.height;
      const root = node.getBoundingClientRect();
      const scaleY = root.height ? canvas.height / root.height : 1;
      const blocks = Array.prototype.map.call(node.querySelectorAll('.dp-folio__block'), (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const top = (rect.top - root.top) * scaleY;
        return { top: top, bottom: top + rect.height * scaleY, keep: el.getAttribute('data-keep') === '1' };
      });
      let start = 0;
      let first = true;
      while (start < canvas.height - 1) {
        let end = Math.min(canvas.height, start + pagePx);
        const crossing = blocks.filter((block) => {
          return block.top > start + 4 && block.top < end && block.bottom > end && (block.bottom - block.top) <= pagePx;
        });
        if (crossing.length) {
          end = crossing[0].top;
        }
        const placed = blocks.filter((block) => block.top >= start - 1 && block.bottom <= end + 1);
        const last = placed[placed.length - 1];
        const next = blocks.filter((block) => block.top >= end - 1)[0];
        if (last && last.keep && last.top > start + 4 && (!next || next.bottom - last.top <= pagePx)) {
          end = last.top;
        }
        if (end <= start + 1) {
          end = Math.min(canvas.height, start + pagePx);
        }
        const sliceHeight = Math.max(1, Math.round(end - start));
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const ctx = slice.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, Math.round(start), canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (!first) {
          pdf.addPage();
        }
        first = false;
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, margin, pageWidth, (sliceHeight / canvas.height) * imgHeight);
        start = end;
      }
      pdf.save('folio-' + this.employeeId + '.pdf');
      this.pdfBusy = false;
    }).catch(() => {
      this.pdfBusy = false;
      this.snack.open('ייצוא ה-PDF נכשל', null, { duration: 3000 });
    });
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

  sign(row: DpProfile, slot: string = 'doctor'): void {
    this.busyKey = slot + (row.profileId || row.id);
    this.service.approve(this.employeeId, row.profileId || row.id, slot).subscribe(
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
