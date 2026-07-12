import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NpsEmployeeListRow,
  NpsManagerApprovalSummaryRow,
  NpsPermissionApprovalGridRow,
  NpsProfileRuleTableRow,
} from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-my-requests-page',
  templateUrl: './nps-my-requests-page.component.html',
  styleUrls: ['./nps-my-requests-page.component.scss'],
})
export class NpsMyRequestsPageComponent implements OnInit {
  summaryRows: NpsManagerApprovalSummaryRow[] = [];
  detailRows: NpsPermissionApprovalGridRow[] = [];
  selectedEmployeeId: string | null = null;
  managerCols = ['EmployeeID', 'FullName', 'NotApprovedCount', 'LastUpdateDate', 'Done'];
  cols = ['EmployeeID', 'FullName', 'PermissionName', 'Manager1Approved', 'Manager2Approved', 'EmployeeApproved', 'LastUpdateDate', 'PermissionIsActive'];
  mineOnly = true;
  statusFilter = '';
  busy = false;
  /** Loaded when a summary row is selected (per-employee grid). */
  detailBusy = false;
  loadError = false;
  detailLoadError = false;

  // Create-request panel
  formEmployeeId: string | null = null;
  formEmployeeInput = '';
  employeeSearchRows: NpsEmployeeListRow[] = [];
  ruleRows: NpsProfileRuleTableRow[] = [];
  formRuleId: number | null = null;
  formNotes = '';
  pendingApprovals: { [key: string]: boolean } = {};

  private employee_id: string = localStorage.getItem('ID') || '';
  private currentEmployeeId: string = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService, private snack: MatSnackBar) { }

  toDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const s = String(value).trim();
    const match = /\/Date\((\d+)\)\//.exec(s);
    if (match) {
      return new Date(Number(match[1]));
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  ngOnInit(): void {
    this.reload();
    this.api.getProfileRules(this.employee_id || '').subscribe((rows) => (this.ruleRows = rows || []));
  }

  reload(): void {
    this.busy = true;
    this.loadError = false;
    this.api
      .getManagerApprovalSummary(this.employee_id || '', {
        status: this.statusFilter || '',
        skip: 0,
        take: 200,
      })
      .subscribe(
        (summaryRows) => {
          this.summaryRows = summaryRows || [];
          if (this.selectedEmployeeId != null && !this.summaryRows.some((x) => x.EmployeeID === this.selectedEmployeeId)) {
            this.clearSelectedEmployee();
          } else if (this.selectedEmployeeId != null) {
            this.loadEmployeeDetail(this.selectedEmployeeId);
          } else {
            this.detailRows = [];
          }
          this.busy = false;
          this.loadError = false;
        },
        () => {
          this.summaryRows = [];
          this.detailRows = [];
          this.busy = false;
          this.loadError = true;
          this.snack.open('לא ניתן לטעון נתונים', 'סגור', { duration: 3000 });
        }
      );
  }

  private loadEmployeeDetail(employeeId: string): void {
    this.detailBusy = true;
    this.detailLoadError = false;
    this.api
      .getPermissionApprovalGrid(this.employee_id || '', {
        employeeId,
        mineOnly: this.mineOnly,
        status: this.statusFilter || '',
        skip: 0,
        take: 400,
      })
      .subscribe(
        (rows) => {
          this.detailRows = rows || [];
          this.pendingApprovals = {};
          this.detailBusy = false;
          this.detailLoadError = false;
        },
        () => {
          this.detailRows = [];
          this.detailBusy = false;
          this.detailLoadError = true;
          this.snack.open('לא ניתן לטעון פירוט העובד', 'סגור', { duration: 3000 });
        }
      );
  }

  selectSummaryRow(row: NpsManagerApprovalSummaryRow): void {
    this.selectedEmployeeId = row.EmployeeID;
    this.loadEmployeeDetail(row.EmployeeID);
  }

  clearSelectedEmployee(): void {
    this.selectedEmployeeId = null;
    this.detailRows = [];
    this.pendingApprovals = {};
    this.detailBusy = false;
    this.detailLoadError = false;
  }

  canApprove(row: NpsPermissionApprovalGridRow, stepNo: number): boolean {
    if (stepNo === 1) {
      return row.Manager1ApproverID === this.currentEmployeeId;
    }
    if (stepNo === 2) {
      return row.Manager2ApproverID === this.currentEmployeeId;
    }
    return row.EmployeeApproverID === this.currentEmployeeId;
  }

  private approvalKey(itemId: number, stepNo: number): string {
    return `${itemId}_${stepNo}`;
  }

  private originalStepApproved(row: NpsPermissionApprovalGridRow, stepNo: number): boolean {
    if (stepNo === 1) {
      return !!row.Manager1Approved;
    }
    if (stepNo === 2) {
      return !!row.Manager2Approved;
    }
    return !!row.EmployeeApproved;
  }

  isStepChecked(row: NpsPermissionApprovalGridRow, stepNo: number): boolean {
    const key = this.approvalKey(row.ItemID, stepNo);
    if (Object.prototype.hasOwnProperty.call(this.pendingApprovals, key)) {
      return !!this.pendingApprovals[key];
    }
    return this.originalStepApproved(row, stepNo);
  }

  onStepCheckboxChange(row: NpsPermissionApprovalGridRow, stepNo: number, checked: boolean): void {
    const key = this.approvalKey(row.ItemID, stepNo);
    const original = this.originalStepApproved(row, stepNo);
    if (checked === original) {
      delete this.pendingApprovals[key];
    } else {
      this.pendingApprovals[key] = checked;
    }
  }

  hasPendingSelections(): boolean {
    return Object.keys(this.pendingApprovals).length > 0;
  }

  private canSelectInColumn(row: NpsPermissionApprovalGridRow, stepNo: number): boolean {
    return this.canApprove(row, stepNo);
  }

  hasSelectableRows(stepNo: number): boolean {
    return this.detailRows.some((row) => this.canSelectInColumn(row, stepNo));
  }

  isColumnAllSelected(stepNo: number): boolean {
    const targets = this.detailRows.filter((row) => this.canSelectInColumn(row, stepNo));
    if (targets.length === 0) {
      return false;
    }
    return targets.every((row) => this.isStepChecked(row, stepNo));
  }

  isColumnPartiallySelected(stepNo: number): boolean {
    const targets = this.detailRows.filter((row) => this.canSelectInColumn(row, stepNo));
    if (targets.length === 0) {
      return false;
    }
    const selectedCount = targets.filter((row) => this.isStepChecked(row, stepNo)).length;
    return selectedCount > 0 && selectedCount < targets.length;
  }

  toggleSelectAll(stepNo: number, checked: boolean): void {
    for (const row of this.detailRows) {
      if (!this.canSelectInColumn(row, stepNo)) {
        continue;
      }
      const key = this.approvalKey(row.ItemID, stepNo);
      const original = this.originalStepApproved(row, stepNo);
      if (checked === original) {
        delete this.pendingApprovals[key];
      } else {
        this.pendingApprovals[key] = checked;
      }
    }
  }

  saveAllSelections(): void {
    const approvals = Object.keys(this.pendingApprovals)
      .map((k) => {
        const parts = k.split('_');
        const itemId = Number(parts[0]);
        const stepNo = Number(parts[1]);
        return { itemId, stepNo, approved: !!this.pendingApprovals[k], comments: '' };
      });

    if (approvals.length === 0) {
      return;
    }

    this.busy = true;
    this.api
      .setPermissionItemsApproval(this.employee_id || '', { approvals })
      .subscribe(
        () => {
          this.snack.open('האישורים נשמרו', 'סגור', { duration: 2200 });
          this.reload();
        },
        () => {
          this.busy = false;
          this.snack.open('שמירת האישורים נכשלה', 'סגור', { duration: 3000 });
        }
      );
  }

  onEmployeeInput(): void {
    const q = (this.formEmployeeInput || '').trim();
    if (q.length < 2) {
      this.employeeSearchRows = [];
      if (!q) {
        this.formEmployeeId = null;
      }
      return;
    }
    this.api.getEmployees(this.employee_id || '', q, '', 0, 30).subscribe((rows) => (this.employeeSearchRows = rows || []));
  }

  selectEmployee(row: NpsEmployeeListRow): void {
    this.formEmployeeId = row.EmployeeID;
    this.formEmployeeInput = `${row.FirstName} ${row.LastName} (#${row.EmployeeID})`;
    this.employeeSearchRows = [];
  }

  uniqueRuleRows(): NpsProfileRuleTableRow[] {
    const byId = new Map<number, NpsProfileRuleTableRow>();
    for (const r of this.ruleRows || []) {
      if (r.RuleID != null && !byId.has(r.RuleID)) {
        byId.set(r.RuleID, r);
      }
    }
    return Array.from(byId.values()).sort((a, b) => (a.RuleID || 0) - (b.RuleID || 0));
  }

  ruleLabel(r: NpsProfileRuleTableRow): string {
    const parts = [
      r.RuleID != null ? `#${r.RuleID}` : '',
      r.DepartnentCode || '',
      r.ProfileName || '',
      r.EducationID != null ? `Edu:${r.EducationID}` : 'Edu:General',
      r.SpecialtyID != null ? `Spec:${r.SpecialtyID}` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  createFromRule(): void {
    if (this.formEmployeeId == null || this.formRuleId == null) {
      this.snack.open('בחרו עובד וכלל', 'סגור', { duration: 2500 });
      return;
    }
    this.api
      .createPermissionRequestFromRule(this.employee_id || '', {
        employeeId: this.formEmployeeId,
        ruleId: this.formRuleId,
        notes: this.formNotes || '',
      })
      .subscribe(
        () => {
          this.snack.open('בקשת הרשאות נוצרה', 'סגור', { duration: 2200 });
          this.reload();
        },
        () => this.snack.open('יצירת בקשה נכשלה', 'סגור', { duration: 3000 })
      );
  }
}
