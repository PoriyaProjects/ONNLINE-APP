import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpCatalogItem } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

@Component({
  selector: 'app-dp-catalog',
  templateUrl: './dp-catalog.component.html',
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
    .dp-catalog-dialog {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }
    .dp-catalog-dialog__head { padding: 18px 20px 0; }
    .dp-catalog-dialog__head h2 { margin: 0; }
    .dp-catalog-dialog__body {
      overflow: auto;
      min-height: 0;
      flex: 1 1 auto;
      padding: 16px 20px;
    }
    .dp-catalog-dialog__wide { margin-bottom: 12px; }
    .dp-catalog-dialog__wide textarea { min-height: 72px; }
    .dp-catalog-dialog__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
    }
    .dp-catalog-dialog .dp-field { min-width: 0; flex: none; }
    .dp-catalog-dialog__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-top: 1px solid #e6eaf2;
    }
    @media (max-width: 640px) {
      .dp-catalog-dialog__grid { grid-template-columns: 1fr; }
    }
  `],
})
export class DpCatalogComponent implements OnInit {
  rows: DpCatalogItem[] = [];
  loading = true;
  saving = false;
  error = '';
  formError = '';
  editing = false;
  query = '';
  status = 'all';
  form: any = this.blank();

  constructor(private service: DoctorPermissionsService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  blank(): any {
    return {
      doctorAuthorizationId: 0,
      mainAuthorizationDesc: '',
      specificAuthorizationDesc: '',
      specificAuthorization: '',
      specialty: '',
      mainFunction: '',
      secondaryFunction: '',
      departmentList: '',
      recruitment: '',
      isActive: true,
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
        this.error = (err && err.message) || 'לא ניתן לטעון את הקטלוג.';
      }
    );
  }

  visible(): DpCatalogItem[] {
    const q = (this.query || '').trim();
    return this.rows.filter((row) => {
      if (this.status === 'active' && !row.isActive) {
        return false;
      }
      if (this.status === 'inactive' && row.isActive) {
        return false;
      }
      if (!q) {
        return true;
      }
      const blob = [row.mainAuthorizationDesc, row.specificAuthorizationDesc, row.specialty, row.mainFunction, row.secondaryFunction, String(row.doctorAuthorizationId || row.id)].join(' ');
      return blob.indexOf(q) >= 0;
    });
  }

  open(row?: DpCatalogItem): void {
    this.formError = '';
    this.editing = true;
    this.form = row
      ? {
          doctorAuthorizationId: row.doctorAuthorizationId || row.id,
          mainAuthorizationDesc: row.mainAuthorizationDesc || '',
          specificAuthorizationDesc: row.specificAuthorizationDesc || '',
          specificAuthorization: row.specificAuthorization || '',
          specialty: row.specialty || '',
          mainFunction: row.mainFunction || '',
          secondaryFunction: row.secondaryFunction || '',
          departmentList: row.departmentList || '',
          recruitment: row.recruitment || '',
          isActive: row.isActive,
        }
      : this.blank();
  }

  save(): void {
    this.saving = true;
    this.formError = '';
    this.service.saveCatalog(this.form).subscribe(
      () => {
        this.saving = false;
        this.editing = false;
        this.snack.open('ההרשאה נשמרה', null, { duration: 2500 });
        this.load();
      },
      (err) => {
        this.saving = false;
        this.formError = (err && err.message) || 'השמירה נכשלה';
      }
    );
  }
}
