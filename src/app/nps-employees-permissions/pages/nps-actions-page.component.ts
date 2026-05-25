import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NpsAction, NpsDepartment } from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

@Component({
  selector: 'app-nps-actions-page',
  templateUrl: './nps-actions-page.component.html',
  styleUrls: ['./nps-actions-page.component.scss'],
})
export class NpsActionsPageComponent implements OnInit {
  actions: NpsAction[] = [];
  departments: NpsDepartment[] = [];
  selectedDepartmentCode = '';
  attachedActionIds = new Set<number>();
  cols = ['ActionID', 'ActionSubject', 'Sort', 'IsActive', 'Attach', 'Actions'];
  form = {
    ActionID: null as number | null,
    ActionSubject: '',
    Sort: 0,
    IsActive: true,
  };
  private employee_id = localStorage.getItem('ID') || '';

  constructor(private api: NpsEmployeesPermissionsApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.reloadData();
  }

  reloadData(): void {
    forkJoin({
      actions: this.api.getActions(this.employee_id),
      departments: this.api.getDepartments(this.employee_id),
    }).subscribe(({ actions, departments }) => {
      this.actions = (actions || []).slice().sort((a, b) => (a.Sort ?? 0) - (b.Sort ?? 0) || a.ActionID - b.ActionID);
      this.departments = departments || [];
      if (this.selectedDepartmentCode) {
        this.loadDepartmentAttachments();
      }
    });
  }

  saveAction(): void {
    const subject = (this.form.ActionSubject || '').trim();
    if (!subject) {
      this.snack.open('נא למלא שם קבוצה', 'סגור', { duration: 3000 });
      return;
    }
    const body = {
      ActionSubject: subject,
      IsActive: this.form.IsActive,
      Sort: this.form.Sort ?? 0,
    };
    if (this.form.ActionID == null) {
      this.api.postAction(this.employee_id, body).subscribe(() => {
        this.snack.open('הקבוצה נוספה', 'סגור', { duration: 2000 });
        this.resetForm();
        this.reloadData();
      });
      return;
    }
    this.api.putAction(this.employee_id, this.form.ActionID, body).subscribe(() => {
      this.snack.open('הקבוצה עודכנה', 'סגור', { duration: 2000 });
      this.resetForm();
      this.reloadData();
    });
  }

  editAction(action: NpsAction): void {
    this.form = {
      ActionID: action.ActionID,
      ActionSubject: action.ActionSubject || '',
      Sort: action.Sort ?? 0,
      IsActive: action.IsActive,
    };
  }

  resetForm(): void {
    this.form = {
      ActionID: null,
      ActionSubject: '',
      Sort: 0,
      IsActive: true,
    };
  }

  onDepartmentChange(): void {
    this.loadDepartmentAttachments();
  }

  private loadDepartmentAttachments(): void {
    if (!this.selectedDepartmentCode) {
      this.attachedActionIds = new Set<number>();
      return;
    }
    this.api.getDepartmentActions(this.employee_id, this.selectedDepartmentCode).subscribe((rows) => {
      this.attachedActionIds = new Set((rows || []).filter((r) => r.IsActive).map((r) => r.ActionIDFK));
    });
  }

  isAttached(actionId: number): boolean {
    return this.attachedActionIds.has(actionId);
  }

  toggleAttached(actionId: number, checked: boolean): void {
    if (checked) {
      this.attachedActionIds.add(actionId);
      return;
    }
    this.attachedActionIds.delete(actionId);
  }

  saveDepartmentAttachments(): void {
    if (!this.selectedDepartmentCode) {
      this.snack.open('בחרו מחלקה לפני שמירה', 'סגור', { duration: 2500 });
      return;
    }
    const actionIds = Array.from(this.attachedActionIds.values());
    this.api.putDepartmentActions(this.employee_id, this.selectedDepartmentCode, actionIds).subscribe(() => {
      this.snack.open('שיוך הקבוצות למחלקה נשמר', 'סגור', { duration: 2000 });
      this.loadDepartmentAttachments();
    });
  }

  departmentLabel(code: string): string {
    const d = this.departments.find((x) => x.DepartnentCode === code);
    return d ? `${d.DepartnentDescripton} (${d.DepartnentCode})` : code;
  }
}
