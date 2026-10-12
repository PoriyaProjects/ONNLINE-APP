import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess, DpEmployeeList, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

@Component({
  selector: 'app-dp-search',
  templateUrl: './dp-search.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpSearchComponent implements OnInit {
  access: DpAccess;
  templates: DpTemplate[] = [];
  q = '';
  departnentCode = '';
  functionId = '';
  jobTitleId = '';
  specialty = '';
  profileTemplateId = 0;
  status = '';
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
    { key: 'active', label: 'פעיל' },
    { key: 'pending', label: 'ממתין לאישור' },
    { key: 'rejected', label: 'נדחה' },
    { key: 'expiring', label: 'עומד לפוג' },
    { key: 'expired', label: 'פג תוקף' },
    { key: 'suspended', label: 'מושעה' },
    { key: 'delayed', label: 'אישורים בעיכוב' },
  ];

  constructor(private service: DoctorPermissionsService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.access = this.service.access;
    this.service.loadAccess().subscribe(
      (access) => { this.access = access; },
      (err) => { this.error = (err && err.message) || 'אירעה שגיאה'; }
    );
    this.service.templates().subscribe((rows) => (this.templates = (rows || []).filter((row) => row.isActive)), () => (this.templates = []));
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') || '';
      this.departnentCode = params.get('departnentCode') || '';
      this.functionId = params.get('functionId') || '';
      this.jobTitleId = params.get('jobTitleId') || '';
      this.specialty = params.get('specialty') || '';
      this.profileTemplateId = Number(params.get('profileTemplateId') || 0);
      this.status = params.get('status') || '';
      this.skip = Math.max(0, Number(params.get('skip') || 0));
      this.load();
    });
  }

  search(): void {
    this.skip = 0;
    this.go();
  }

  reset(): void {
    this.q = '';
    this.departnentCode = '';
    this.functionId = '';
    this.jobTitleId = '';
    this.specialty = '';
    this.profileTemplateId = 0;
    this.status = '';
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
    this.service.search(this.q, this.departnentCode, this.functionId, this.jobTitleId, this.specialty, this.profileTemplateId, this.status, this.skip).subscribe(
      (page) => {
        if (id !== this.requestId) {
          return;
        }
        this.rows = page.rows || [];
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
      skip: state.skip || null,
    };
  }
}
