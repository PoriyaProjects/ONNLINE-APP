import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DpCatalogItem } from '../../models/dp.models';
import { DoctorPermissionsService } from '../../services/doctor-permissions.service';

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
