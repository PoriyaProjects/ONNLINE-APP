import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NpsEmployeeListRow,
  NpsEmployeeProfileAssignmentRow,
  NpsProfile,
  NpsProfileRuleTableRow,
} from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-employee-assignments-page',
  templateUrl: './nps-employee-assignments-page.component.html',
  styleUrls: ['./nps-employee-assignments-page.component.scss'],
})
export class NpsEmployeeAssignmentsPageComponent implements OnInit {
  assignments: NpsEmployeeProfileAssignmentRow[] = [];
  cols = ['assignmentId', 'employeeId', 'profile', 'ruleId', 'requestId', 'current', 'status', 'from', 'to'];
  activeOnly = false;
  busy = false;

  profiles: NpsProfile[] = [];
  allRuleRows: NpsProfileRuleTableRow[] = [];

  formEmployeeId: string | null = null;
  formEmployeeInput = '';
  formProfileId: number | null = null;
  /** null = פרופיל בלבד (ללא RuleID); אחרת מזהה כלל מ־EP_NursePermissionProfileRules */
  formRuleId: number | null = null;

  employeeSearchRows: NpsEmployeeListRow[] = [];

  private employee_id = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.reloadList();
    this.api.getProfiles(this.employee_id).subscribe((p) => (this.profiles = p));
    this.api.getProfileRules(this.employee_id).subscribe((r) => (this.allRuleRows = r));
  }

  reloadList(): void {
    this.busy = true;
    this.api.getAssignments(this.employee_id, undefined, this.activeOnly).subscribe(
      (rows) => {
        this.assignments = rows || [];
        this.busy = false;
      },
      () => {
        this.busy = false;
        this.assignments = [];
        this.snack.open('לא ניתן לטעון את הרשימה (דרושה הרשאת מנהל כללית)', 'סגור', { duration: 4000 });
      }
    );
  }

  rulesForSelectedProfile(): NpsProfileRuleTableRow[] {
    const pid = this.formProfileId;
    if (pid == null) {
      return [];
    }
    const m = new Map<number, NpsProfileRuleTableRow>();
    for (const row of this.allRuleRows) {
      const rid = row.RuleID;
      if (row.ProfileID === pid && rid != null && !m.has(rid)) {
        m.set(rid, row);
      }
    }
    return Array.from(m.values()).sort((a, b) => (a.RuleID || 0) - (b.RuleID || 0));
  }

  ruleOptionLabel(r: NpsProfileRuleTableRow): string {
    const edu = r.EducationID != null && String(r.EducationID) !== '' ? `השכלה:${r.EducationID}` : 'כללי';
    const spec = r.SpecialtyID != null && String(r.SpecialtyID) !== '' ? `התמחות:${r.SpecialtyID}` : '';
    const parts = [r.RuleID != null ? `#${r.RuleID}` : '', r.DepartnentCode || '', edu, spec].filter(Boolean);
    return parts.join(' · ') || `כלל ${r.RuleID}`;
  }

  onEmployeeInput(): void {
    const t = (this.formEmployeeInput || '').trim();
    if (t.length < 2) {
      this.employeeSearchRows = [];
      if (!t) {
        this.formEmployeeId = null;
      }
      return;
    }
    this.api.getEmployees(this.employee_id, t, '', 0, 30).subscribe((rows) => (this.employeeSearchRows = rows));
  }

  selectEmployee(e: NpsEmployeeListRow): void {
    this.formEmployeeId = e.EmployeeID;
    this.formEmployeeInput = `${e.FirstName} ${e.LastName} (#${e.EmployeeID})`;
    this.employeeSearchRows = [];
  }

  onProfileChange(): void {
    this.formRuleId = null;
  }

  submitApply(): void {
    if (this.formEmployeeId == null || this.formProfileId == null) {
      this.snack.open('בחרו עובד ופרופיל', 'סגור', { duration: 2500 });
      return;
    }
    this.busy = true;
    this.api
      .applyEmployeeProfileAssignment(this.employee_id, {
        employeeId: this.formEmployeeId,
        profileId: this.formProfileId,
        ruleId: this.formRuleId,
      })
      .subscribe(
        () => {
          this.snack.open('השיוך עודכן', 'סגור', { duration: 2000 });
          this.busy = false;
          this.reloadList();
        },
        () => {
          this.busy = false;
          this.snack.open('שמירה נכשלה (בדקו התאמת פרופיל–כלל או הרשאות)', 'סגור', { duration: 4500 });
        }
      );
  }
}
