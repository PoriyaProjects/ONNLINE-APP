import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpCatalogItem } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';
import { formatStamp } from '../../utils/dp-status';

@Component({
  selector: 'app-dp-catalog',
  templateUrl: './dp-catalog.component.html',
  styleUrls: ['../../styles/dp.shared.scss'],
})
export class DpCatalogComponent implements OnInit {
  rows: DpCatalogItem[] = [];
  loading = true;
  saving = false;
  error = '';
  formError = '';
  editing = false;
  viewOnly = false;
  query = '';
  category = '';
  status = 'all';
  usage = 'all';
  form: any = this.blank();
  stamp = formatStamp;

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  blank(): any {
    return {
      id: 0,
      code: '',
      name: '',
      description: '',
      category: '',
      isActive: true,
      wasActive: true,
      defaultValidityMonths: 36,
      renewalLeadMonths: 3,
      originalValidity: 36,
      originalLead: 3,
      templateCount: 0,
      assignmentCount: 0,
      activeAssignmentCount: 0,
      createdAt: '',
      updatedAt: '',
      createdByName: '',
      updatedByName: '',
    };
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.catalog().subscribe(
      (rows) => {
        this.rows = rows || [];
        this.loading = false;
      },
      (err) => {
        this.loading = false;
        this.error = (err && err.message) || 'לא ניתן לטעון את רשימת ההרשאות כרגע.';
      }
    );
  }

  categories(): string[] {
    const names = (this.rows || []).map((row) => (row.category || '').trim()).filter((name) => !!name);
    return names.filter((name, index) => names.indexOf(name) === index).sort();
  }

  used(row: DpCatalogItem): boolean {
    return ((row && row.templateCount) || 0) + ((row && row.assignmentCount) || 0) > 0;
  }

  visible(): DpCatalogItem[] {
    const q = (this.query || '').trim().toLowerCase();
    return (this.rows || []).filter((row) => {
      if (this.status === 'active' && !row.isActive) {
        return false;
      }
      if (this.status === 'inactive' && row.isActive) {
        return false;
      }
      if (this.usage === 'used' && !this.used(row)) {
        return false;
      }
      if (this.usage === 'unused' && this.used(row)) {
        return false;
      }
      if (this.category && (row.category || '') !== this.category) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (row.name || '').toLowerCase().indexOf(q) >= 0
        || (row.code || '').toLowerCase().indexOf(q) >= 0
        || (row.description || '').toLowerCase().indexOf(q) >= 0
        || (row.category || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  open(row?: DpCatalogItem, viewOnly?: boolean): void {
    this.formError = '';
    this.viewOnly = !!viewOnly;
    this.editing = true;
    if (!row) {
      this.form = this.blank();
      return;
    }
    this.form = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      isActive: row.isActive,
      wasActive: row.isActive,
      defaultValidityMonths: row.defaultValidityMonths,
      renewalLeadMonths: row.renewalLeadMonths,
      originalValidity: row.defaultValidityMonths,
      originalLead: row.renewalLeadMonths,
      templateCount: row.templateCount || 0,
      assignmentCount: row.assignmentCount || 0,
      activeAssignmentCount: row.activeAssignmentCount || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdByName: row.createdByName,
      updatedByName: row.updatedByName,
    };
  }

  codeLocked(): boolean {
    return !!(this.form && this.form.id && ((this.form.templateCount || 0) + (this.form.assignmentCount || 0) > 0));
  }

  policyChanged(): boolean {
    return !!this.form && this.codeLocked()
      && (Number(this.form.defaultValidityMonths) !== Number(this.form.originalValidity)
        || Number(this.form.renewalLeadMonths) !== Number(this.form.originalLead));
  }

  renewalStart(): number {
    const validity = Number(this.form && this.form.defaultValidityMonths);
    const lead = Number(this.form && this.form.renewalLeadMonths);
    if (!(validity > 0) || lead < 0 || lead >= validity) {
      return 0;
    }
    return validity - lead;
  }

  save(): void {
    this.formError = '';
    if (!this.form.name || !String(this.form.name).trim()) {
      this.formError = 'יש להזין שם הרשאה.';
      return;
    }
    const validity = Number(this.form.defaultValidityMonths);
    const lead = Number(this.form.renewalLeadMonths);
    if (!(validity >= 1 && validity <= 120)) {
      this.formError = 'תוקף בחודשים חייב להיות בין 1 ל-120';
      return;
    }
    if (lead < 0 || lead > 36 || lead >= validity) {
      this.formError = 'מספר חודשי החידוש חייב להיות קטן מתקופת התוקף.';
      return;
    }
    if (this.form.id && this.form.wasActive && !this.form.isActive && !confirm('ההרשאה לא תהיה זמינה להקצאות חדשות.\nהקצאות והרשאות קיימות לא יימחקו.')) {
      return;
    }
    this.persist(true);
  }

  setActive(row: DpCatalogItem, active: boolean): void {
    if (!active && !confirm('ההרשאה לא תהיה זמינה להקצאות חדשות.\nהקצאות והרשאות קיימות לא יימחקו.')) {
      return;
    }
    if (active && !confirm('להפעיל את ההרשאה מחדש?')) {
      return;
    }
    this.form = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      isActive: active,
      wasActive: row.isActive,
      defaultValidityMonths: row.defaultValidityMonths,
      renewalLeadMonths: row.renewalLeadMonths,
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
      code: this.form.code,
      name: String(this.form.name).trim(),
      description: this.form.description,
      category: this.form.category,
      isActive: this.form.isActive,
      defaultValidityMonths: Number(this.form.defaultValidityMonths),
      renewalLeadMonths: Number(this.form.renewalLeadMonths),
    };
    this.service.saveCatalog(body).subscribe(
      () => {
        this.saving = false;
        this.editing = false;
        this.snack.open('ההרשאה נשמרה', 'סגור', { duration: 2000 });
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
}
