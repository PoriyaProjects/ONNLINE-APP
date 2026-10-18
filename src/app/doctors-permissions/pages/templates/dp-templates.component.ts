import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpAccess, DpCatalogItem, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

@Component({
  selector: 'app-dp-templates',
  templateUrl: './dp-templates.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
  styles: [`
    .dp-table-wrap { overflow: visible; }
    table.dp-table.dp-table--fit {
      width: 100%;
      table-layout: fixed;
    }
    table.dp-table.dp-table--fit th,
    table.dp-table.dp-table--fit td {
      white-space: normal;
      overflow-wrap: anywhere;
      vertical-align: middle;
    }
    .dp-cell-clip {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .dp-row-menu { position: relative; }
    .dp-row-menu--open { z-index: 20; }
    .dp-row-menu__anchor {
      position: relative;
      display: inline-block;
      vertical-align: middle;
    }
    .dp-row-menu__btn {
      border: 0;
      background: transparent;
      width: 36px;
      height: 36px;
      margin-right: 4px;
      padding: 0;
      border-radius: 8px;
      cursor: pointer;
      color: #0f172a;
      vertical-align: middle;
    }
    .dp-row-menu__btn .material-icons {
      font-family: "Material Icons";
      font-size: 22px;
      line-height: 36px;
    }
    .dp-row-menu__list {
      position: absolute;
      z-index: 21;
      top: 100%;
      left: 0;
      min-width: 140px;
      margin-top: 4px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid #e6eaf2;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .dp-row-menu__list button {
      border: 0;
      background: transparent;
      text-align: right;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      color: #0f172a;
    }
    .dp-profile-dialog {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }
    .dp-profile-dialog__head { padding: 18px 20px 0; }
    .dp-profile-dialog__head h2 { margin: 0; }
    .dp-profile-dialog__head p { margin: 6px 0 0; color: #64748b; }
    .dp-profile-dialog__body {
      overflow: auto;
      min-height: 0;
      flex: 1 1 auto;
      padding: 16px 20px;
    }
    .dp-profile-dialog__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
    }
    .dp-profile-dialog__grid .dp-field { min-width: 0; }
    .dp-profile-dialog__grid select { width: 100%; max-width: 100%; }
    .dp-perm-full {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.45;
    }
    .dp-profile-dialog__depts { margin-top: 14px; }
    .dp-profile-dialog__depts-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .dp-profile-dialog__depts-head span { color: #64748b; font-size: 13px; }
    .dp-profile-dialog__list {
      max-height: 220px;
      overflow: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px 12px;
    }
    .dp-profile-dialog__list label {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
    }
    .dp-profile-dialog__summary {
      margin-top: 14px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 12px;
      color: #334155;
    }
    .dp-profile-dialog__summary p { margin: 0; }
    .dp-profile-dialog__summary p + p { margin-top: 4px; }
    .dp-profile-dialog__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-top: 1px solid #e6eaf2;
    }
    @media (max-width: 640px) {
      .dp-profile-dialog__grid { grid-template-columns: 1fr; }
    }
  `],
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
  menuKey = '';
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

  menuId(row: DpTemplate): string {
    return String(row.profileId || row.id);
  }

  toggleMenu(row: DpTemplate): void {
    const key = this.menuId(row);
    this.menuKey = this.menuKey === key ? '' : key;
  }

  closeMenu(): void {
    this.menuKey = '';
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

  permOption(item: DpCatalogItem): string {
    const name = ((item && item.name) || '').replace(/\s+/g, ' ').trim();
    const short = name.length > 48 ? name.substring(0, 48) + '…' : name;
    return (item.doctorAuthorizationId || item.id) + ' · ' + short;
  }

  selectedPermissionName(): string {
    const id = Number(this.form && this.form.doctorAuthorizationId);
    if (!id) {
      return '';
    }
    const matches = (this.catalog || []).filter((row) => (row.doctorAuthorizationId || row.id) === id);
    const name = matches.length ? (matches[0].name || '').trim() : '';
    return name.length > 48 ? name : '';
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
