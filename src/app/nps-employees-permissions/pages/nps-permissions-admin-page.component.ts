import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NpsAction, NpsPermission } from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

@Component({
  selector: 'app-nps-permissions-admin-page',
  templateUrl: './nps-permissions-admin-page.component.html',
  styleUrls: ['./nps-permissions-admin-page.component.scss'],
})
export class NpsPermissionsAdminPageComponent implements OnInit {
  permissions: NpsPermission[] = [];
  actions: NpsAction[] = [];
  cols = ['PermissionID', 'PermissionName', 'Description', 'Action', 'IsActive', 'Actions'];
  form = {
    PermissionID: null as number | null,
    PermissionName: '',
    PermissionDescription: '',
    IsActive: true,
    ActionIDFK: '' as string | null,
  };
  private employee_id = localStorage.getItem('ID') || '';

  constructor(private api: NpsEmployeesPermissionsApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.reloadData();
  }

  reloadData(): void {
    forkJoin({
      permissions: this.api.getPermissions(this.employee_id),
      actions: this.api.getActions(this.employee_id),
    }).subscribe(({ permissions, actions }) => {
      this.permissions = permissions || [];
      this.actions = (actions || []).slice().sort((a, b) => (a.Sort ?? 0) - (b.Sort ?? 0) || a.ActionID - b.ActionID);
    });
  }

  savePermission(): void {
    const name = (this.form.PermissionName || '').trim();
    if (!name) {
      this.snack.open('נא למלא שם הרשאה', 'סגור', { duration: 3000 });
      return;
    }
    if (!this.form.ActionIDFK) {
      this.snack.open('נא לבחור קבוצה להרשאה', 'סגור', { duration: 3000 });
      return;
    }
    const body = {
      PermissionName: name,
      PermissionDescription: this.form.PermissionDescription || '',
      IsActive: this.form.IsActive,
      ActionIDFK: this.form.ActionIDFK,
    };
    if (this.form.PermissionID == null) {
      this.api.postPermission(this.employee_id, body).subscribe(() => {
        this.snack.open('ההרשאה נוספה', 'סגור', { duration: 2000 });
        this.resetForm();
        this.reloadData();
      });
      return;
    }
    this.api.putPermission(this.employee_id, this.form.PermissionID, body).subscribe(() => {
      this.snack.open('ההרשאה עודכנה', 'סגור', { duration: 2000 });
      this.resetForm();
      this.reloadData();
    });
  }

  editPermission(row: NpsPermission): void {
    const description = row.Description ?? row.PermissionDescription ?? '';
    this.form = {
      PermissionID: row.PermissionID,
      PermissionName: row.PermissionName || '',
      PermissionDescription: description,
      IsActive: row.IsActive,
      ActionIDFK: row.ActionIDFK ? String(row.ActionIDFK) : null,
    };
  }

  resetForm(): void {
    this.form = {
      PermissionID: null,
      PermissionName: '',
      PermissionDescription: '',
      IsActive: true,
      ActionIDFK: null,
    };
  }

  actionLabel(actionIDFK: string | null | undefined): string {
    if (!actionIDFK) {
      return '—';
    }
    const actionId = String(actionIDFK);
    const action = this.actions.find((x) => String(x.ActionID) === actionId);
    return action ? action.ActionSubject : actionId;
  }

  rowDescription(row: NpsPermission): string {
    return row.Description ?? row.PermissionDescription ?? '';
  }
}
