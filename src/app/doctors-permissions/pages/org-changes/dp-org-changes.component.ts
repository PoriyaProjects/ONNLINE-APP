import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DpAccess } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-org-changes',
  templateUrl: './dp-org-changes.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpOrgChangesComponent implements OnInit {
  access: DpAccess;
  q = '';
  departnentCode = '';
  changeType = '';
  detectedFrom = '';
  detectedTo = '';
  needsReview = false;
  skip = 0;
  total = 0;
  rows: any[] = [];
  loading = true;
  error = '';
  loaded = false;
  readonly pageSize = 50;
  stamp = formatStamp;
  readonly types = [
    { key: '', label: 'הכל' },
    { key: 'DEPARTMENT', label: 'שינוי מחלקה' },
    { key: 'FUNCTION', label: 'שינוי תפקיד' },
    { key: 'JOB_TITLE', label: 'שינוי משרה' },
  ];

  constructor(
    private service: DoctorPermissionsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') || '';
      this.departnentCode = params.get('departnentCode') || '';
      this.changeType = params.get('type') || '';
      this.detectedFrom = params.get('from') || '';
      this.detectedTo = params.get('to') || '';
      this.needsReview = params.get('needsReview') === '1';
      this.skip = Number(params.get('skip') || 0);
      if (this.skip < 0) {
        this.skip = 0;
      }
      this.load();
    });
  }

  typeLabel(code: string): string {
    if (code === 'DEPARTMENT') {
      return 'שינוי מחלקה';
    }
    if (code === 'FUNCTION') {
      return 'שינוי תפקיד';
    }
    if (code === 'JOB_TITLE') {
      return 'שינוי משרה';
    }
    return code || '—';
  }

  resultLabel(code: string): string {
    if (code === 'PROFILE_CREATED') {
      return 'נוצר פרופיל חדש';
    }
    if (code === 'PERMISSIONS_ADDED') {
      return 'נוספו הרשאות';
    }
    if (code === 'NO_ACTION' || code === 'PROCESSED') {
      return 'לא נדרש שינוי';
    }
    if (code === 'NO_MATCHING_PROFILE') {
      return 'הפרופיל אינו תואם למחלקה';
    }
    if (code === 'NO_TEMPLATE') {
      return 'לא נמצאה תבנית';
    }
    if (code === 'AMBIGUOUS') {
      return 'נדרשת בחירת תבנית';
    }
    return code || '—';
  }

  filtered(): boolean {
    return !!(this.q || this.departnentCode || this.changeType || this.detectedFrom || this.detectedTo || this.needsReview);
  }

  pendingResult(row: any): boolean {
    return !!row && (row.processingStatus === 'PROFILE_CREATED' || row.processingStatus === 'PERMISSIONS_ADDED');
  }

  apply(): void {
    this.go(0);
  }

  clear(): void {
    this.q = '';
    this.departnentCode = '';
    this.changeType = '';
    this.detectedFrom = '';
    this.detectedTo = '';
    this.needsReview = false;
    this.go(0);
  }

  page(delta: number): void {
    this.go(Math.max(0, this.skip + delta));
  }

  private go(skip: number): void {
    this.router.navigate(['/doctors-permissions/organizational-changes'], {
      queryParams: {
        q: this.q || null,
        departnentCode: this.departnentCode || null,
        type: this.changeType || null,
        from: this.detectedFrom || null,
        to: this.detectedTo || null,
        needsReview: this.needsReview ? '1' : null,
        skip: skip || null,
      },
    });
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.service.orgChanges({
      q: this.q,
      departnentCode: this.departnentCode,
      changeType: this.changeType,
      detectedFrom: this.detectedFrom,
      detectedTo: this.detectedTo,
      needsReview: this.needsReview ? 1 : 0,
      skip: this.skip,
    }).subscribe(
      (page) => {
        this.rows = (page && page.rows) || [];
        this.total = (page && page.total) || 0;
        this.loading = false;
        this.loaded = true;
      },
      (err) => {
        this.loading = false;
        this.loaded = true;
        this.error = err.message || 'לא ניתן לטעון את השינויים הארגוניים כרגע.';
      }
    );
  }
}
