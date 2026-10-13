import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpAccess, DpCatalogItem, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

@Component({
  selector: 'app-dp-templates',
  templateUrl: './dp-templates.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpTemplatesComponent implements OnInit {
  access: DpAccess;
  rows: DpTemplate[] = [];
  catalog: DpCatalogItem[] = [];
  loading = true;
  saving = false;
  error = '';
  formError = '';
  editing = false;
  viewOnly = false;
  q = '';
  dept = '';
  status = 'all';
  selected: DpTemplate = null;
  form: any = this.blank();

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.service.catalog().subscribe((rows) => (this.catalog = rows || []), () => (this.catalog = []));
    this.load();
  }

  blank(): any {
    return {
      profileId: 0,
      doctorAuthorizationGroupId: 0,
      doctorAuthorizationId: 0,
      departmentCodes: [],
      active: true,
    };
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.templates().subscribe(
      (rows) => {
        this.rows = rows || [];
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = (err && err.message) || 'לא ניתן לטעון פרופילים.';
      }
    );
  }

  visible(): DpTemplate[] {
    const q = (this.q || '').trim();
    return this.rows.filter((row) => {
      if (this.dept && (row.departmentCodes || '').split(',').indexOf(this.dept) < 0 && row.departmentCode !== this.dept) {
        return false;
      }
      if (this.status === 'active' && !row.isActive) {
        return false;
      }
      if (this.status === 'inactive' && row.isActive) {
        return false;
      }
      if (!q) {
        return true;
      }
      const blob = [String(row.profileId || row.id), row.doctorAuthorizationGroupDesc, row.permissionName, row.departmentNames].join(' ');
      return blob.indexOf(q) >= 0;
    });
  }

  codes(row: DpTemplate): string[] {
    return (row.departmentCodes || row.departmentCode || '').split(',').filter((code) => !!code);
  }

  open(row?: DpTemplate, viewOnly?: boolean): void {
    this.viewOnly = !!viewOnly;
    this.formError = '';
    this.selected = row || null;
    this.editing = true;
    this.form = row
      ? {
          profileId: row.profileId || row.id,
          doctorAuthorizationGroupId: row.doctorAuthorizationGroupId || 0,
          doctorAuthorizationId: row.doctorAuthorizationId || 0,
          departmentCodes: this.codes(row),
          active: row.isActive,
        }
      : this.blank();
  }

  toggleDept(code: string, checked: boolean): void {
    const codes = this.form.departmentCodes || [];
    const next = codes.filter((item) => item !== code);
    if (checked) {
      next.push(code);
    }
    this.form.departmentCodes = next;
  }

  hasDept(code: string): boolean {
    return (this.form.departmentCodes || []).indexOf(code) >= 0;
  }

  onDept(code: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toggleDept(code, !!(input && input.checked));
  }

  save(): void {
    this.saving = true;
    this.formError = '';
    this.service.saveTemplate({
      profileId: this.form.profileId,
      doctorAuthorizationGroupId: Number(this.form.doctorAuthorizationGroupId),
      doctorAuthorizationId: Number(this.form.doctorAuthorizationId),
      departmentCodes: this.form.departmentCodes,
      active: this.form.active,
    }).subscribe(
      () => {
        this.saving = false;
        this.editing = false;
        this.snack.open('הפרופיל נשמר', null, { duration: 2500 });
        this.load();
      },
      (err) => {
        this.saving = false;
        this.formError = (err && err.message) || 'השמירה נכשלה';
      }
    );
  }

  setActive(row: DpTemplate, active: boolean): void {
    this.service.saveTemplate({
      profileId: row.profileId || row.id,
      doctorAuthorizationGroupId: row.doctorAuthorizationGroupId,
      doctorAuthorizationId: row.doctorAuthorizationId,
      departmentCodes: this.codes(row),
      active: active,
    }).subscribe(
      () => this.load(),
      (err) => this.snack.open((err && err.message) || 'הפעולה נכשלה', null, { duration: 3000 })
    );
  }
}
