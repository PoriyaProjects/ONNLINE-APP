import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpAccess, DpCatalogItem, DpTemplate } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp } from '../../utils/dp-status';

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
  nameDirty = false;
  q = '';
  dept = '';
  status = 'all';
  permQuery = '';
  form: any = this.blank();
  stamp = formatStamp;

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.service.loadAccess().subscribe((access) => (this.access = access));
    this.service.catalog().subscribe((rows) => (this.catalog = (rows || []).filter((r) => r.isActive)));
    this.load();
  }

  blank(): any {
    return {
      id: 0,
      name: '',
      departmentCode: '',
      functionId: '',
      jobTitleId: '',
      specialty: '',
      description: '',
      isActive: true,
      wasActive: true,
      activeProfileCount: 0,
      items: [],
    };
  }

  load(): void {
    this.loading = true;
    this.service.templates().subscribe(
      (rows) => {
        this.rows = rows || [];
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = err.message;
      }
    );
  }

  filtered(): boolean {
    return !!(this.q || this.dept || (this.status && this.status !== 'all'));
  }

  clearFilters(): void {
    this.q = '';
    this.dept = '';
    this.status = 'all';
  }

  visible(): DpTemplate[] {
    const q = (this.q || '').trim().toLowerCase();
    return (this.rows || []).filter((row) => {
      if (this.status === 'active' && !row.isActive) {
        return false;
      }
      if (this.status === 'inactive' && row.isActive) {
        return false;
      }
      if (this.dept && row.departmentCode !== this.dept) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (row.name || '').toLowerCase().indexOf(q) >= 0
        || (row.departmentName || '').toLowerCase().indexOf(q) >= 0
        || (row.description || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  open(row?: DpTemplate, viewOnly?: boolean): void {
    this.formError = '';
    this.permQuery = '';
    this.viewOnly = !!viewOnly;
    this.nameDirty = !!row;
    this.editing = true;
    if (!row) {
      this.form = this.blank();
      const departments = (this.access && this.access.departments) || [];
      if (departments.length === 1) {
        this.form.departmentCode = departments[0].id;
      }
      this.applySuggestedName();
      return;
    }
    this.form = {
      id: row.id,
      name: row.name,
      departmentCode: row.departmentCode,
      functionId: row.functionId || '',
      jobTitleId: row.jobTitleId || '',
      specialty: row.specialty || '',
      description: row.description || '',
      isActive: row.isActive,
      wasActive: row.isActive,
      activeProfileCount: row.activeProfileCount || 0,
      items: (row.items || []).map((item) => ({
        permissionId: item.permissionId,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        name: item.name,
        code: item.code,
        category: item.category,
        permissionActive: item.permissionActive !== false,
      })),
    };
  }

  markName(): void {
    this.nameDirty = true;
  }

  onContextChange(): void {
    if (!this.nameDirty && !this.viewOnly) {
      this.applySuggestedName();
    }
  }

  applySuggestedName(): void {
    const dept = this.lookup((this.access && this.access.departments) || [], this.form.departmentCode);
    const job = this.lookup((this.access && this.access.functions) || [], this.form.functionId);
    this.form.name = job && dept ? job + ' — ' + dept : (dept || '');
  }

  lookup(list: { id: string; name: string }[], id: string): string {
    const row = (list || []).filter((item) => item.id === id)[0];
    return row ? row.name : '';
  }

  selected(): any[] {
    return ((this.form && this.form.items) || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }

  requiredItems(): any[] {
    return this.selected().filter((item) => item.isRequired);
  }

  optionalItems(): any[] {
    return this.selected().filter((item) => !item.isRequired);
  }

  catalogMatches(): DpCatalogItem[] {
    const q = (this.permQuery || '').trim().toLowerCase();
    if (!q) {
      return [];
    }
    const held = ((this.form && this.form.items) || []).map((item) => item.permissionId);
    return (this.catalog || []).filter((item) => {
      if (held.indexOf(item.id) >= 0) {
        return false;
      }
      return (item.name || '').toLowerCase().indexOf(q) >= 0
        || (item.code || '').toLowerCase().indexOf(q) >= 0
        || (item.category || '').toLowerCase().indexOf(q) >= 0;
    }).slice(0, 12);
  }

  addPermission(item: DpCatalogItem): void {
    const items = this.form.items as any[];
    if (items.some((row) => row.permissionId === item.id)) {
      this.formError = 'הרשאה זו כבר קיימת בתבנית.';
      return;
    }
    this.formError = '';
    items.push({
      permissionId: item.id,
      isRequired: true,
      sortOrder: items.length,
      name: item.name,
      code: item.code,
      category: item.category,
      permissionActive: true,
    });
    this.permQuery = '';
  }

  removePermission(permissionId: number): void {
    const items = this.form.items as any[];
    const index = items.findIndex((item) => item.permissionId === permissionId);
    if (index >= 0) {
      items.splice(index, 1);
    }
    this.reindex();
  }

  toggleRequired(permissionId: number): void {
    const row = (this.form.items as any[]).filter((item) => item.permissionId === permissionId)[0];
    if (row) {
      row.isRequired = !row.isRequired;
    }
  }

  move(permissionId: number, delta: number): void {
    const items = this.selected();
    const index = items.findIndex((item) => item.permissionId === permissionId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= items.length) {
      return;
    }
    const current = items[index];
    items[index] = items[next];
    items[next] = current;
    items.forEach((item, order) => (item.sortOrder = order));
    this.form.items = items;
  }

  reindex(): void {
    this.selected().forEach((item, index) => (item.sortOrder = index));
  }

  save(): void {
    this.formError = '';
    if (!this.form.name || !String(this.form.name).trim()) {
      this.formError = 'יש להזין שם תבנית.';
      return;
    }
    if (!this.form.departmentCode) {
      this.formError = 'יש לבחור מחלקה.';
      return;
    }
    if (!(this.form.items || []).length && !confirm('לתבנית זו אין הרשאות. ניתן לשמור אותה, אך פרופיל חדש לא יקבל הרשאות אוטומטית.')) {
      return;
    }
    if (this.form.id && this.form.wasActive && !this.form.isActive && !confirm('התבנית לא תהיה זמינה לפרופילים חדשים.\nפרופילים קיימים לא ישתנו.')) {
      return;
    }
    this.persist(true);
  }

  setActive(row: DpTemplate, active: boolean): void {
    if (!active && !confirm('התבנית לא תהיה זמינה לפרופילים חדשים.\nפרופילים קיימים לא ישתנו.')) {
      return;
    }
    if (active && !confirm('להפעיל את התבנית מחדש?')) {
      return;
    }
    this.form = {
      id: row.id,
      name: row.name,
      departmentCode: row.departmentCode,
      functionId: row.functionId || '',
      jobTitleId: row.jobTitleId || '',
      specialty: row.specialty || '',
      description: row.description || '',
      isActive: active,
      wasActive: row.isActive,
      activeProfileCount: row.activeProfileCount || 0,
      items: (row.items || []).map((item) => ({
        permissionId: item.permissionId,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
      })),
    };
    this.persist(false);
  }

  persist(fromModal: boolean): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    const body = {
      id: this.form.id,
      name: String(this.form.name).trim(),
      departmentCode: this.form.departmentCode,
      functionId: this.form.functionId,
      jobTitleId: this.form.jobTitleId,
      specialty: this.form.specialty,
      description: this.form.description,
      isActive: this.form.isActive,
      items: (this.form.items || []).map((item) => ({
        permissionId: item.permissionId,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
      })),
    };
    this.service.saveTemplate(body).subscribe(
      () => {
        this.saving = false;
        this.editing = false;
        this.snack.open('התבנית נשמרה', 'סגור', { duration: 2000 });
        this.load();
      },
      (err) => {
        this.saving = false;
        if (fromModal) {
          this.formError = err.message;
          this.editing = true;
        } else {
          this.error = err.message;
        }
      }
    );
  }

  canEdit(row: DpTemplate): boolean {
    return !!this.access && (this.access.isAdmin || (this.access.departmentCodes || []).indexOf(row.departmentCode) >= 0);
  }
}
