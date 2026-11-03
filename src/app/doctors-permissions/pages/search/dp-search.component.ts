import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess, DpEmployeeList, DpLookup } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

@Component({
  selector: 'app-dp-search',
  templateUrl: './dp-search.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
  styles: [`
    .dp-combo { position: relative; }
    .dp-combo__list {
      position: absolute;
      z-index: 20;
      top: 100%;
      right: 0;
      left: 0;
      margin: 4px 0 0;
      padding: 4px;
      list-style: none;
      max-height: 240px;
      overflow: auto;
      background: #fff;
      border: 1px solid #d6deea;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .dp-combo__list button {
      display: block;
      width: 100%;
      text-align: right;
      background: transparent;
      border: 0;
      border-radius: 8px;
      min-height: 40px;
      padding: 8px 10px;
      color: #0f172a;
      cursor: pointer;
    }
    .dp-combo__list button:hover,
    .dp-combo__list button.is-active { background: #eef2ff; }
    .dp-combo__list button.is-selected { color: #3730a3; font-weight: 700; }
    .dp-combo__empty { padding: 8px 10px; color: #64748b; font-size: 13px; }
    .dp-combo input:focus { outline: 2px solid #4f46e5; outline-offset: 1px; }
  `],
})
export class DpSearchComponent implements OnInit {
  access: DpAccess;
  q = '';
  departnentCode = '';
  functionId = '';
  deptText = '';
  fnText = '';
  deptOpen = false;
  fnOpen = false;
  deptIndex = -1;
  fnIndex = -1;
  jobTitleId = '';
  specialty = '';
  profileTemplateId = 0;
  status = '';
  activity = 'active';
  readonly pageSize = 50;
  skip = 0;
  total = 0;
  rows: DpEmployeeList[] = [];
  loading = false;
  error = '';
  searched = false;
  private requestId = 0;
  readonly statuses = [
    { key: '', label: 'הכל' },
    { key: 'active', label: 'פרופיל פעיל' },
    { key: 'pending', label: 'ממתין לחתימה' },
    { key: 'inactive', label: 'שיוך לא פעיל' },
    { key: 'delayed', label: 'חתימה מתעכבת' },
  ];
  readonly activities = [
    { key: 'active', label: 'פעיל' },
    { key: 'inactive', label: 'לא פעיל' },
    { key: 'all', label: 'הכל' },
  ];

  constructor(private service: DoctorPermissionsService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.access = this.service.access;
    this.service.loadAccess().subscribe(
      (access) => {
        this.access = access;
        this.syncLookupText();
      },
      (err) => { this.error = (err && err.message) || 'אירעה שגיאה'; }
    );
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') || '';
      this.departnentCode = params.get('departnentCode') || '';
      this.functionId = params.get('functionId') || '';
      this.jobTitleId = params.get('jobTitleId') || '';
      this.specialty = params.get('specialty') || '';
      this.profileTemplateId = Number(params.get('profileTemplateId') || 0);
      this.status = params.get('status') || '';
      this.activity = this.normalizeActivity(params.get('activity'));
      this.skip = Math.max(0, Number(params.get('skip') || 0));
      this.syncLookupText();
      this.load();
    });
  }

  search(): void {
    this.skip = 0;
    this.go();
  }

  onActivity(value: string): void {
    this.activity = this.normalizeActivity(value);
    this.search();
  }

  reset(): void {
    this.q = '';
    this.departnentCode = '';
    this.functionId = '';
    this.deptText = '';
    this.fnText = '';
    this.deptOpen = false;
    this.fnOpen = false;
    this.jobTitleId = '';
    this.specialty = '';
    this.profileTemplateId = 0;
    this.status = '';
    this.activity = 'active';
    this.skip = 0;
    this.go();
  }

  page(delta: number): void {
    this.skip = Math.max(0, this.skip + delta);
    this.go();
  }

  initials(row: DpEmployeeList): string {
    const first = (row.firstName || '').trim().charAt(0);
    const last = (row.lastName || '').trim().charAt(0);
    return (first + last) || '•';
  }

  filteredLookups(kind: 'dept' | 'fn'): DpLookup[] {
    const rows = this.lookups(kind);
    const query = this.lookupText(kind).trim().toLowerCase();
    const selected = this.lookupName(rows, this.lookupId(kind)).trim().toLowerCase();
    if (!query || query === selected) {
      return rows;
    }
    return rows.filter((row) => {
      const name = (row.name || '').toLowerCase();
      return name.indexOf(query) >= 0 || String(row.id || '').toLowerCase().indexOf(query) >= 0;
    });
  }

  openLookup(kind: 'dept' | 'fn'): void {
    this.setLookupOpen(kind, true);
    const id = this.lookupId(kind);
    const index = this.filteredLookups(kind).findIndex((row) => String(row.id) === String(id));
    this.setLookupIndex(kind, index);
  }

  onLookupInput(kind: 'dept' | 'fn'): void {
    this.setLookupOpen(kind, true);
    const text = this.lookupText(kind).trim();
    this.setLookupIndex(kind, text ? 0 : -1);
    const selected = this.lookupName(this.lookups(kind), this.lookupId(kind)).trim().toLowerCase();
    if (text.toLowerCase() !== selected) {
      this.setLookupId(kind, '');
    }
  }

  onLookupKey(event: KeyboardEvent, kind: 'dept' | 'fn'): void {
    const rows = this.filteredLookups(kind);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.setLookupOpen(kind, true);
      this.setLookupIndex(kind, Math.min(this.lookupIndex(kind) + 1, rows.length - 1));
      this.scrollLookup(kind);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setLookupIndex(kind, Math.max(this.lookupIndex(kind) - 1, -1));
      this.scrollLookup(kind);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.restoreLookup(kind);
      return;
    }
    if (event.key === 'Enter' && this.lookupOpen(kind)) {
      event.preventDefault();
      const index = this.lookupIndex(kind);
      this.pickLookup(kind, index >= 0 && rows[index] ? rows[index].id : '');
    }
  }

  pickLookup(kind: 'dept' | 'fn', id: string): void {
    const value = id || '';
    this.setLookupId(kind, value);
    this.setLookupText(kind, value ? this.lookupName(this.lookups(kind), value) : '');
    this.setLookupOpen(kind, false);
  }

  commitLookup(kind: 'dept' | 'fn'): void {
    const text = this.lookupText(kind).trim().toLowerCase();
    if (!text) {
      this.pickLookup(kind, '');
      return;
    }
    const exact = this.lookups(kind).filter((row) => (row.name || '').trim().toLowerCase() === text);
    if (exact.length === 1) {
      this.pickLookup(kind, exact[0].id);
      return;
    }
    this.restoreLookup(kind);
  }

  private matchesActivity(row: DpEmployeeList): boolean {
    const active = Number(row && row.activePermissions) > 0;
    if (this.activity === 'all') {
      return true;
    }
    if (this.activity === 'inactive') {
      return !active;
    }
    return active;
  }

  private syncLookupText(): void {
    if (!this.deptOpen) {
      this.deptText = this.lookupName(this.lookups('dept'), this.departnentCode);
    }
    if (!this.fnOpen) {
      this.fnText = this.lookupName(this.lookups('fn'), this.functionId);
    }
  }

  private restoreLookup(kind: 'dept' | 'fn'): void {
    this.setLookupText(kind, this.lookupName(this.lookups(kind), this.lookupId(kind)));
    this.setLookupOpen(kind, false);
  }

  private lookups(kind: 'dept' | 'fn'): DpLookup[] {
    if (!this.access) {
      return [];
    }
    return (kind === 'dept' ? this.access.departments : this.access.functions) || [];
  }

  private lookupName(rows: DpLookup[], id: string): string {
    const hit = (rows || []).find((row) => String(row.id) === String(id || ''));
    return hit ? hit.name || '' : '';
  }

  private lookupText(kind: 'dept' | 'fn'): string {
    return kind === 'dept' ? this.deptText : this.fnText;
  }

  private lookupId(kind: 'dept' | 'fn'): string {
    return kind === 'dept' ? this.departnentCode : this.functionId;
  }

  private lookupOpen(kind: 'dept' | 'fn'): boolean {
    return kind === 'dept' ? this.deptOpen : this.fnOpen;
  }

  private lookupIndex(kind: 'dept' | 'fn'): number {
    return kind === 'dept' ? this.deptIndex : this.fnIndex;
  }

  private setLookupText(kind: 'dept' | 'fn', value: string): void {
    if (kind === 'dept') {
      this.deptText = value;
    } else {
      this.fnText = value;
    }
  }

  private setLookupId(kind: 'dept' | 'fn', value: string): void {
    if (kind === 'dept') {
      this.departnentCode = value;
    } else {
      this.functionId = value;
    }
  }

  private setLookupOpen(kind: 'dept' | 'fn', value: boolean): void {
    if (kind === 'dept') {
      this.deptOpen = value;
    } else {
      this.fnOpen = value;
    }
  }

  private setLookupIndex(kind: 'dept' | 'fn', value: number): void {
    if (kind === 'dept') {
      this.deptIndex = value;
    } else {
      this.fnIndex = value;
    }
  }

  private scrollLookup(kind: 'dept' | 'fn'): void {
    const index = this.lookupIndex(kind);
    const id = (kind === 'dept' ? 'dp-search-dept-opt-' : 'dp-search-fn-opt-') + (index < 0 ? 'all' : index);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private normalizeActivity(value: string): string {
    if (value === 'inactive' || value === 'all') {
      return value;
    }
    return 'active';
  }

  private go(): void {
    const next = this.current();
    if (this.same(next, this.fromRoute())) {
      this.load();
      return;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: this.toQuery(next) });
  }

  load(): void {
    const id = ++this.requestId;
    this.loading = true;
    this.error = '';
    this.searched = true;
    this.service.search(this.q, this.departnentCode, this.functionId, this.jobTitleId, this.specialty, this.profileTemplateId, this.status, this.activity, this.skip).subscribe(
      (page) => {
        if (id !== this.requestId) {
          return;
        }
        this.rows = (page.rows || []).filter((row) => this.matchesActivity(row));
        this.total = page.total || 0;
        this.loading = false;
      },
      () => {
        if (id !== this.requestId) {
          return;
        }
        this.rows = [];
        this.loading = false;
        this.error = 'לא ניתן לטעון את רשימת העובדים כרגע.';
      }
    );
  }

  private current(): any {
    return {
      q: this.q || '',
      departnentCode: this.departnentCode || '',
      functionId: this.functionId || '',
      jobTitleId: this.jobTitleId || '',
      specialty: this.specialty || '',
      profileTemplateId: Number(this.profileTemplateId) || 0,
      status: this.status || '',
      activity: this.activity || 'active',
      skip: this.skip || 0,
    };
  }

  private fromRoute(): any {
    const params = this.route.snapshot.queryParamMap;
    return {
      q: params.get('q') || '',
      departnentCode: params.get('departnentCode') || '',
      functionId: params.get('functionId') || '',
      jobTitleId: params.get('jobTitleId') || '',
      specialty: params.get('specialty') || '',
      profileTemplateId: Number(params.get('profileTemplateId') || 0),
      status: params.get('status') || '',
      activity: this.normalizeActivity(params.get('activity')),
      skip: Number(params.get('skip') || 0),
    };
  }

  private same(left: any, right: any): boolean {
    return left.q === right.q
      && left.departnentCode === right.departnentCode
      && left.functionId === right.functionId
      && left.jobTitleId === right.jobTitleId
      && left.specialty === right.specialty
      && left.profileTemplateId === right.profileTemplateId
      && left.status === right.status
      && left.activity === right.activity
      && left.skip === right.skip;
  }

  private toQuery(state: any): any {
    return {
      q: state.q || null,
      departnentCode: state.departnentCode || null,
      functionId: state.functionId || null,
      jobTitleId: state.jobTitleId || null,
      specialty: state.specialty || null,
      profileTemplateId: state.profileTemplateId || null,
      status: state.status || null,
      activity: state.activity === 'active' ? null : state.activity,
      skip: state.skip || null,
    };
  }
}
