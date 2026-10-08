import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess, DpCatalogItem, DpEmployeeDetail, DpHistory, DpNote, DpPermission, DpProfile, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { actionLabel, canRemoveStatus, canResubmitStatus, daysUntil, displayStatus, formatDay, formatStamp, statusClass, statusLabel, waitDays } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-employee',
  templateUrl: './dp-employee.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpEmployeeComponent implements OnInit {
  tab = 'overview';
  loading = true;
  error = '';
  detail: DpEmployeeDetail;
  access: DpAccess;
  notes: DpNote[] = [];
  notesLoading = false;
  notesLoaded = false;
  notesError = '';
  noteBusy = false;
  noteError = '';
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
  catalog: DpCatalogItem[] = [];
  templates: DpTemplate[] = [];
  noteText = '';
  noteId = 0;
  permFilter = '';
  profileFilter = 0;
  profileView = 'active';
  employeeId = '';
  showProfile = false;
  saving = false;
  formError = '';
  nameDirty = false;
  permQuery = '';
  originalTemplateId = 0;
  profile: any = this.blankProfile();
  addPermissionId: { [profileId: number]: number } = {};
  overrideId = 0;
  resubmitId = 0;
  overrideStatus = 'APPROVED';
  overrideReason = '';
  label = statusLabel;
  actionText = actionLabel;
  chip = statusClass;
  shown = displayStatus;
  day = formatDay;
  stamp = formatStamp;
  canRemove = canRemoveStatus;
  canResubmit = canResubmitStatus;
  readonly permFilters = [
    { key: '', label: 'הכל' },
    { key: 'active', label: 'פעילות' },
    { key: 'pending', label: 'ממתינות' },
    { key: 'rejected', label: 'נדחו' },
    { key: 'expiring', label: 'עומדות לפוג' },
    { key: 'expired', label: 'פגו' },
    { key: 'suspended', label: 'מושעה' },
  ];
  readonly historyFilters = [
    { key: '', label: 'הכל' },
    { key: 'permissions', label: 'הרשאות' },
    { key: 'profiles', label: 'פרופילים' },
    { key: 'renewals', label: 'חידושים' },
    { key: 'org', label: 'שינויים ארגוניים' },
    { key: 'notes', label: 'הערות' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private service: DoctorPermissionsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.route.paramMap.subscribe((params) => this.load(params.get('employeeId')));
  }

  load(employeeId: string): void {
    this.employeeId = employeeId;
    this.loading = true;
    this.error = '';
    this.notes = [];
    this.notesLoaded = false;
    this.notesLoading = false;
    this.notesError = '';
    this.noteText = '';
    this.noteId = 0;
    this.noteError = '';
    this.history = [];
    this.historyLoaded = false;
    this.historyLoading = false;
    this.historyError = '';
    this.historyTotal = 0;
    this.historySkip = 0;
    this.service.employee(employeeId).subscribe(
      (detail) => {
        this.detail = detail;
        const profileId = Number(this.route.snapshot.queryParamMap.get('profile')) || 0;
        if (profileId) {
          this.profileFilter = profileId;
          this.tab = 'permissions';
        }
        this.loading = false;
        if (this.tab === 'notes') {
          this.loadNotes();
        }
        if (this.tab === 'history') {
          this.loadHistory();
        }
        if (detail.canManage) {
          this.service.catalog().subscribe((rows) => (this.catalog = (rows || []).filter((r) => r.isActive)));
          this.service.templates().subscribe((rows) => (this.templates = (rows || []).filter((r) => r.isActive)));
        }
      },
      (err) => {
        this.loading = false;
        this.error = err.message || 'לא ניתן לטעון את פרטי העובד כרגע.';
      }
    );
  }

  back(): void {
    const state = window.history.state;
    if (state && state.navigationId > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/doctors-permissions/search']);
  }

  initials(): string {
    const employee = this.detail && this.detail.employee;
    if (!employee) {
      return '•';
    }
    return ((employee.firstName || '').trim().charAt(0) + (employee.lastName || '').trim().charAt(0)) || '•';
  }

  specialty(): string {
    const profiles = (this.detail && this.detail.profiles) || [];
    const row = profiles.filter((profile) => profile.isActive && profile.specialty)[0];
    return row ? row.specialty : '';
  }

  activeProfiles(): number {
    return ((this.detail && this.detail.profiles) || []).filter((profile) => profile.isActive).length;
  }

  permissionTotal(): number {
    return this.allPermissions().length;
  }

  blankProfile(): any {
    return { id: 0, profileName: '', departmentCode: '', functionId: '', jobTitleId: '', specialty: '', profileTemplateId: null, isActive: true };
  }

  openProfile(row?: DpProfile): void {
    this.formError = '';
    this.nameDirty = !!row;
    this.originalTemplateId = row ? (Number(row.profileTemplateId) || 0) : 0;
    if (!row) {
      this.profile = this.blankProfile();
      this.profile.departmentCode = (this.detail && this.detail.employee && this.detail.employee.departnentCode) || '';
      this.applyDefaultName();
    } else {
      this.profile = {
        id: row.id,
        profileName: row.profileName,
        departmentCode: row.departmentCode,
        functionId: row.functionId || '',
        jobTitleId: row.jobTitleId || '',
        specialty: row.specialty || '',
        profileTemplateId: row.profileTemplateId,
        isActive: row.isActive,
      };
    }
    this.showProfile = true;
  }

  markName(): void {
    this.nameDirty = true;
  }

  onProfileContextChange(): void {
    if (!this.nameDirty) {
      this.applyDefaultName();
    }
  }

  applyDefaultName(): void {
    const template = this.selectedTemplate();
    const dept = this.lookupName((this.access && this.access.departments) || [], this.profile.departmentCode);
    if (template) {
      this.profile.profileName = dept ? template.name + ' — ' + dept : template.name;
      return;
    }
    const job = this.lookupName((this.access && this.access.functions) || [], this.profile.functionId);
    this.profile.profileName = job && dept ? job + ' — ' + dept : (dept || '');
  }

  selectedTemplate(): DpTemplate {
    const id = Number(this.profile && this.profile.profileTemplateId) || 0;
    if (!id) {
      return null;
    }
    return (this.templates || []).filter((row) => row.id === id)[0] || null;
  }

  templateAdds(): any[] {
    const template = this.selectedTemplate();
    const items = (template && template.items) || [];
    const held = this.heldPermissionIds();
    return items.filter((item) => held.indexOf(item.permissionId) < 0);
  }

  templateStays(): any[] {
    const template = this.selectedTemplate();
    const items = (template && template.items) || [];
    const held = this.heldPermissionIds();
    return items.filter((item) => held.indexOf(item.permissionId) >= 0);
  }

  templateLeft(): DpPermission[] {
    if (!this.profile || !this.profile.id) {
      return [];
    }
    const template = this.selectedTemplate();
    const ids = ((template && template.items) || []).map((item) => item.permissionId);
    const row = this.profileRow(this.profile.id);
    return ((row && row.permissions) || []).filter((perm) => ids.indexOf(perm.permissionId) < 0);
  }

  closeProfile(row: DpProfile): void {
    if (!confirm('האם לסגור את הפרופיל?\nהפרופיל וההיסטוריה שלו יישמרו, אך הוא לא ייחשב כפרופיל פעיל.')) {
      return;
    }
    this.profile = this.profileBody(row, false);
    this.saveProfile();
  }

  reopenProfile(row: DpProfile): void {
    if (!confirm('להפעיל את הפרופיל מחדש?')) {
      return;
    }
    this.profile = this.profileBody(row, true);
    this.saveProfile();
  }

  matchesProfileView(row: DpProfile): boolean {
    if (this.profileView === 'closed') {
      return !row.isActive;
    }
    if (this.profileView === 'all') {
      return true;
    }
    return row.isActive;
  }

  templateChanged(): boolean {
    return !!(this.profile && this.profile.id) && (Number(this.profile.profileTemplateId) || 0) !== this.originalTemplateId;
  }

  lookupName(list: { id: string; name: string }[], id: string): string {
    const row = (list || []).filter((item) => item.id === id)[0];
    return row ? row.name : '';
  }

  profileRow(id: number): DpProfile {
    return ((this.detail && this.detail.profiles) || []).filter((row) => row.id === id)[0];
  }

  held(row: DpProfile): number[] {
    const blocked = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'REJECTED'];
    return ((row && row.permissions) || []).filter((perm) => blocked.indexOf(perm.status) >= 0).map((perm) => perm.permissionId);
  }

  heldPermissionIds(): number[] {
    if (!this.profile || !this.profile.id) {
      return [];
    }
    return this.held(this.profileRow(this.profile.id));
  }

  profileBody(row: DpProfile, active: boolean): any {
    return {
      id: row.id,
      profileName: row.profileName,
      departmentCode: row.departmentCode,
      functionId: row.functionId || '',
      jobTitleId: row.jobTitleId || '',
      specialty: row.specialty || '',
      profileTemplateId: row.profileTemplateId,
      isActive: active,
    };
  }

  summary(): any {
    const profiles = ((this.detail && this.detail.profiles) || []).filter((row) => row.isActive);
    const perms: DpPermission[] = [];
    profiles.forEach((row) => (row.permissions || []).forEach((perm) => perms.push(perm)));
    return {
      profiles: profiles.length,
      active: perms.filter((perm) => this.isCurrent(perm)).length,
      pending: perms.filter((perm) => perm.status === 'PENDING_APPROVAL').length,
      rejected: perms.filter((perm) => perm.status === 'REJECTED').length,
      expiring: perms.filter((perm) => this.expiring(perm)).length,
      expired: perms.filter((perm) => this.isExpired(perm)).length,
      suspended: perms.filter((perm) => perm.status === 'SUSPENDED').length,
    };
  }

  counts(profile: DpProfile): any {
    const perms = (profile && profile.permissions) || [];
    return {
      active: perms.filter((perm) => this.isCurrent(perm)).length,
      pending: perms.filter((perm) => perm.status === 'PENDING_APPROVAL').length,
      rejected: perms.filter((perm) => perm.status === 'REJECTED').length,
      expiring: perms.filter((perm) => this.expiring(perm)).length,
      expired: perms.filter((perm) => this.isExpired(perm)).length,
      suspended: perms.filter((perm) => perm.status === 'SUSPENDED').length,
    };
  }

  health(): string {
    const totals = this.summary();
    if (!totals.profiles) {
      return '';
    }
    if (totals.pending || totals.rejected || totals.expired || totals.suspended) {
      return 'נדרש טיפול';
    }
    if (!totals.active) {
      return 'אין הרשאות פעילות';
    }
    return 'תקין';
  }

  openPermissions(profileId: number): void {
    this.profileFilter = profileId;
    this.permFilter = '';
    this.tab = 'permissions';
  }

  showProfileCard(profile: DpProfile): boolean {
    if (this.tab === 'profiles') {
      return this.matchesProfileView(profile);
    }
    if (this.tab !== 'permissions') {
      return false;
    }
    return !this.profileFilter || profile.id === this.profileFilter;
  }

  visiblePermissions(profile: DpProfile): DpPermission[] {
    return ((profile && profile.permissions) || []).filter((perm) => this.matchesPerm(perm));
  }

  isCurrent(perm: DpPermission): boolean {
    return !!(perm && perm.isCurrent);
  }

  isExpired(perm: DpPermission): boolean {
    return !!(perm && perm.isExpired);
  }

  expiring(perm: DpPermission): boolean {
    return !!(perm && perm.isExpiring);
  }

  remain(perm: DpPermission): number {
    if (!this.isCurrent(perm) || !perm.expirationDate) {
      return 0;
    }
    return daysUntil(perm.expirationDate);
  }

  waiting(perm: DpPermission): number {
    if (!perm || (perm.status !== 'PENDING_APPROVAL' && perm.status !== 'DRAFT')) {
      return 0;
    }
    return waitDays(perm.submittedAt || perm.createdAt);
  }

  rejectReason(perm: DpPermission): string {
    const reason = ((perm && (perm.rejectionReason || perm.priorRejectComment)) || '').trim();
    return reason || 'לא צוינה סיבת דחייה.';
  }

  rejectActor(perm: DpPermission): string {
    const name = ((perm && (perm.rejectedByName || perm.priorRejectByName)) || '').trim();
    return name || 'משתמש מערכת';
  }

  openHistory(): void {
    this.tab = 'history';
    if (!this.historyLoaded && !this.historyLoading) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    if (!this.employeeId) {
      return;
    }
    this.historyLoading = true;
    this.historyError = '';
    this.service.history(this.employeeId, {
      category: this.historyCategory,
      fromDate: this.historyFrom,
      toDate: this.historyTo,
      search: (this.historySearch || '').trim(),
      skip: this.historySkip,
      take: this.historyPageSize,
    }).subscribe(
      (page) => {
        this.history = (page && page.rows) || [];
        this.historyTotal = (page && page.total) || 0;
        this.historyLoaded = true;
        this.historyLoading = false;
      },
      () => {
        this.historyLoading = false;
        this.historyError = 'לא ניתן לטעון את היסטוריית העובד כרגע.';
      }
    );
  }

  setHistoryCategory(key: string): void {
    this.historyCategory = key;
    this.historySkip = 0;
    this.loadHistory();
  }

  applyHistory(): void {
    this.historySkip = 0;
    this.loadHistory();
  }

  clearHistory(): void {
    this.historyCategory = '';
    this.historyFrom = '';
    this.historyTo = '';
    this.historySearch = '';
    this.historySkip = 0;
    this.loadHistory();
  }

  historyPage(delta: number): void {
    const next = this.historySkip + delta;
    if (next < 0 || next >= this.historyTotal) {
      return;
    }
    this.historySkip = next;
    this.loadHistory();
  }

  historyFiltered(): boolean {
    return !!(this.historyCategory || this.historyFrom || this.historyTo || (this.historySearch || '').trim());
  }

  markHistoryStale(): void {
    this.historyLoaded = false;
    if (this.tab === 'history') {
      this.loadHistory();
    }
  }

  historyIcon(row: DpHistory): string {
    if (!row) {
      return 'fa-circle';
    }
    if (row.action === 'APPROVE') {
      return 'fa-check-circle';
    }
    if (row.action === 'REJECT' || row.action === 'REMOVE') {
      return 'fa-times-circle';
    }
    if (row.action === 'RESUBMIT' || row.action === 'RENEWAL_STARTED') {
      return 'fa-sync';
    }
    if (row.action === 'EXPIRE') {
      return 'fa-calendar-times';
    }
    if (row.action === 'ADMIN_OVERRIDE') {
      return 'fa-cog';
    }
    if (row.category === 'org') {
      return 'fa-exchange-alt';
    }
    if (row.category === 'notes') {
      return 'fa-sticky-note';
    }
    if (row.category === 'profiles') {
      return 'fa-id-badge';
    }
    return 'fa-shield-alt';
  }

  historyTone(row: DpHistory): string {
    if (!row) {
      return 'dp-chip--muted';
    }
    if (row.action === 'APPROVE') {
      return 'dp-chip--ok';
    }
    if (row.action === 'REJECT' || row.action === 'EXPIRE' || row.action === 'REMOVE') {
      return 'dp-chip--bad';
    }
    if (row.action === 'RESUBMIT' || row.action === 'RENEWAL_STARTED') {
      return 'dp-chip--wait';
    }
    return 'dp-chip--muted';
  }

  private allPermissions(): DpPermission[] {
    const perms: DpPermission[] = [];
    ((this.detail && this.detail.profiles) || []).forEach((row) => (row.permissions || []).forEach((perm) => perms.push(perm)));
    return perms;
  }

  private matchesPerm(perm: DpPermission): boolean {
    if (this.permFilter === 'active') {
      return this.isCurrent(perm);
    }
    if (this.permFilter === 'pending') {
      return perm.status === 'PENDING_APPROVAL';
    }
    if (this.permFilter === 'rejected') {
      return perm.status === 'REJECTED';
    }
    if (this.permFilter === 'expiring') {
      return this.expiring(perm);
    }
    if (this.permFilter === 'expired') {
      return this.isExpired(perm);
    }
    if (this.permFilter === 'suspended') {
      return perm.status === 'SUSPENDED';
    }
    return true;
  }

  saveProfile(): void {
    this.formError = '';
    if (!this.profile.profileName || !String(this.profile.profileName).trim()) {
      this.formError = 'יש להזין שם פרופיל.';
      this.showProfile = true;
      return;
    }
    if (!this.profile.departmentCode) {
      this.formError = 'יש לבחור מחלקה.';
      this.showProfile = true;
      return;
    }
    if (this.templateChanged() && this.templateAdds().length && !confirm('החלפת התבנית תוסיף הרשאות חדשות. ההרשאות הקיימות יישמרו.')) {
      return;
    }
    if (this.saving) {
      return;
    }
    this.saving = true;
    const editing = this.showProfile;
    const body = Object.assign({ employeeId: this.detail.employee.employeeId }, this.profile);
    this.service.saveProfile(body).subscribe(
      () => {
        this.saving = false;
        this.showProfile = false;
        this.snack.open('הפרופיל נשמר', 'סגור', { duration: 2500 });
        this.load(this.detail.employee.employeeId);
      },
      (err) => {
        this.saving = false;
        if (editing) {
          this.formError = err.message;
          this.showProfile = true;
        } else {
          this.error = err.message;
        }
      }
    );
  }

  addPermission(profileId: number): void {
    const permissionId = Number(this.addPermissionId[profileId]);
    if (!permissionId) {
      return;
    }
    const row = this.profileRow(profileId);
    if (row && this.held(row).indexOf(permissionId) >= 0) {
      this.error = 'ההרשאה כבר קיימת בפרופיל או שאינה פעילה';
      return;
    }
    this.service.addPermission(profileId, permissionId).subscribe(
      () => {
        this.addPermissionId[profileId] = 0;
        this.permQuery = '';
        this.load(this.detail.employee.employeeId);
      },
      (err) => (this.error = err.message)
    );
  }

  catalogMatches(profileId: number): DpCatalogItem[] {
    const q = (this.permQuery || '').trim().toLowerCase();
    const row = this.profileRow(profileId);
    const held = row ? this.held(row) : [];
    return (this.catalog || []).filter((item) => {
      if (held.indexOf(item.id) >= 0) {
        return false;
      }
      if (!q) {
        return false;
      }
      return (item.name || '').toLowerCase().indexOf(q) >= 0
        || (item.code || '').toLowerCase().indexOf(q) >= 0
        || (item.category || '').toLowerCase().indexOf(q) >= 0;
    }).slice(0, 12);
  }

  choosePermission(profileId: number, id: number): void {
    this.addPermissionId[profileId] = id;
  }

  chosenName(profileId: number): string {
    const row = (this.catalog || []).filter((item) => item.id === Number(this.addPermissionId[profileId]))[0];
    return row ? row.name + (row.code ? ' · ' + row.code : '') + (row.category ? ' · ' + row.category : '') : '';
  }

  remove(permissionId: number): void {
    if (!confirm('להסיר את ההרשאה מהפרופיל?')) {
      return;
    }
    this.service.removePermission(permissionId).subscribe(
      () => this.load(this.detail.employee.employeeId),
      (err) => (this.error = err.message)
    );
  }

  resubmit(permissionId: number): void {
    const comment = window.prompt('להגיש את ההרשאה מחדש לאישור?\n\nההרשאה תחזור לסטטוס "ממתין לאישור" ותופיע שוב בתור האישורים.\n\nהערה (לא חובה):');
    if (comment === null || this.resubmitId) {
      return;
    }
    this.resubmitId = permissionId;
    this.service.resubmit(permissionId, comment.trim()).subscribe(
      () => {
        this.snack.open('ההרשאה הוגשה מחדש לאישור.', 'סגור', { duration: 2500 });
        this.service.employee(this.detail.employee.employeeId).subscribe(
          (detail) => {
            this.detail = detail;
            this.resubmitId = 0;
            this.markHistoryStale();
          },
          (err) => {
            this.resubmitId = 0;
            this.error = err.message;
          }
        );
      },
      (err) => {
        this.resubmitId = 0;
        this.error = err.message;
      }
    );
  }

  saveOverride(): void {
    this.service.override(this.overrideId, this.overrideStatus, this.overrideReason).subscribe(
      () => {
        this.overrideId = 0;
        this.overrideReason = '';
        this.snack.open('החריגה נשמרה ביומן', 'סגור', { duration: 2500 });
        this.load(this.detail.employee.employeeId);
      },
      (err) => (this.error = err.message)
    );
  }

  openNotes(): void {
    this.tab = 'notes';
    if (!this.notesLoaded && !this.notesLoading) {
      this.loadNotes();
    }
  }

  loadNotes(): void {
    if (!this.employeeId) {
      return;
    }
    this.notesLoading = true;
    this.notesError = '';
    this.service.notes(this.employeeId).subscribe(
      (notes) => {
        this.notes = notes || [];
        this.notesLoaded = true;
        this.notesLoading = false;
      },
      () => {
        this.notesLoading = false;
        this.notesError = 'לא ניתן לטעון את ההערות כרגע.';
      }
    );
  }

  editNote(note: DpNote): void {
    this.noteId = note.id;
    this.noteText = note.noteText;
    this.noteError = '';
  }

  cancelNote(): void {
    this.noteId = 0;
    this.noteText = '';
    this.noteError = '';
  }

  saveNote(): void {
    const text = (this.noteText || '').trim();
    if (!text) {
      this.noteError = 'יש להזין תוכן להערה.';
      return;
    }
    if (text.length > 4000) {
      this.noteError = 'ההערה ארוכה מדי. האורך המרבי הוא 4000 תווים.';
      return;
    }
    if (this.noteBusy || !this.detail) {
      return;
    }
    const editing = this.noteId > 0;
    this.noteBusy = true;
    this.noteError = '';
    this.service.saveNote({ id: this.noteId, employeeId: this.detail.employee.employeeId, noteText: text }).subscribe(
      () => {
        this.noteBusy = false;
        this.noteText = '';
        this.noteId = 0;
        this.snack.open(editing ? 'ההערה עודכנה בהצלחה.' : 'ההערה נוספה בהצלחה.', 'סגור', { duration: 2500 });
        this.loadNotes();
        this.markHistoryStale();
      },
      (err) => {
        this.noteBusy = false;
        this.noteError = (err && err.message) || 'לא ניתן לטעון את ההערות כרגע.';
      }
    );
  }

  removeNote(note: DpNote): void {
    if (!note || this.noteBusy || !this.detail) {
      return;
    }
    if (!window.confirm('להסיר את ההערה?\n\nההערה תוסתר מהרשימה ותישמר ביומן.')) {
      return;
    }
    this.noteBusy = true;
    this.noteError = '';
    this.service.saveNote({ id: note.id, employeeId: this.detail.employee.employeeId, noteText: note.noteText, isActive: false }).subscribe(
      () => {
        this.noteBusy = false;
        if (this.noteId === note.id) {
          this.cancelNote();
        }
        this.snack.open('ההערה הוסרה.', 'סגור', { duration: 2500 });
        this.loadNotes();
        this.markHistoryStale();
      },
      (err) => {
        this.noteBusy = false;
        this.noteError = (err && err.message) || 'לא ניתן לטעון את ההערות כרגע.';
      }
    );
  }

  templatesFor(dept: string): DpTemplate[] {
    return (this.templates || []).filter((t) => !dept || t.departmentCode === dept);
  }
}
