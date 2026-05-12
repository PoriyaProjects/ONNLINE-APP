import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NpsDepartment,
  NpsEducationCatalog,
  NpsPermission,
  NpsPermissionCard,
  NpsProfile,
  NpsProfilePermission,
  NpsProfileRule,
  NpsProfileRuleTableRow,
  NpsSpecialtyCatalog,
} from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

/** Sentinel for mat-option "כללי" rows (distinct from real DB ids). */
const NPS_GENERAL = '__nps_general__';

@Component({
  selector: 'app-nps-rules-page',
  templateUrl: './nps-rules-page.component.html',
  styleUrls: ['./nps-rules-page.component.scss'],
})
export class NpsRulesPageComponent implements OnInit {
  readonly generalToken = NPS_GENERAL;

  rules: NpsProfileRuleTableRow[] = [];
  profiles: NpsProfile[] = [];
  departments: NpsDepartment[] = [];
  educations: NpsEducationCatalog[] = [];
  /** All specialties (no filter) — used to resolve names in the rules table. */
  specialtyLookup: NpsSpecialtyCatalog[] = [];
  /** Specialties for the “new rule” form; loaded from the server when an education is chosen. */
  formSpecialties: NpsSpecialtyCatalog[] = [];
  cols = ['profileName', 'actionSubject', 'grantedCount', 'edit', 'del'];
  newRule = {
    ProfileID: null as number | null,
    DepartnentCode: '',
    EducationID: '',
    SpecialtyID: '',
    IsActive: true,
  };
  /** Bound to autocomplete inputs (display / filter text). */
  profileInput = '';
  deptInput = '';
  eduInput = '';
  specInput = '';

  /** Permission matrix: shown only after “attach”, scoped visually to full rule context (saved per profile on server). */
  perms: NpsPermission[] = [];
  matrixCards: NpsPermissionCard[] = [];
  pp: NpsProfilePermission[] = [];
  matrixAttached = false;
  /** Snapshot when user attached; if rule fields diverge, matrix is cleared. */
  private attachedContext: {
    profileId: number;
    departmentCode: string;
    educationId: string | null;
    specialtyId: string | null;
  } | null = null;
  private matrix: { PermissionID: number; IsGranted: boolean }[] = [];
  /** Table row edit: separate state from new-rule attach flow. */
  editingRule: NpsProfileRule | null = null;
  editMatrixCards: NpsPermissionCard[] = [];
  editPp: NpsProfilePermission[] = [];
  private editMatrix: { PermissionID: number; IsGranted: boolean }[] = [];
  /** Ignores stale responses when education changes quickly. */
  private specialtiesRequestSerial = 0;

  private employee_id = localStorage.getItem('ID') || '';

  constructor(private api: NpsEmployeesPermissionsApiService, private snack: MatSnackBar) { }

  ngOnInit(): void {
    forkJoin({
      profiles: this.api.getProfiles(this.employee_id),
      departments: this.api.getDepartments(this.employee_id),
      educations: this.api.getEducations(this.employee_id),
      specialtyLookup: this.api.getSpecialties(this.employee_id, ''),
      permissions: this.api.getPermissions(this.employee_id),
    }).subscribe(({ profiles, departments, educations, specialtyLookup, permissions }) => {
      this.profiles = profiles;
      this.departments = departments;
      this.educations = educations;
      this.specialtyLookup = specialtyLookup;
      this.perms = permissions.filter((z) => z.IsActive);
      this.loadFormSpecialties();
    });
    this.reload();
  }

  get filteredProfiles(): NpsProfile[] {
    const q = (this.profileInput || '').trim().toLowerCase();
    if (!q) {
      return this.profiles;
    }
    return this.profiles.filter(
      (p) =>
        p.ProfileName.toLowerCase().includes(q) ||
        String(p.ProfileID).includes(q)
    );
  }

  get filteredDepartments(): NpsDepartment[] {
    const q = (this.deptInput || '').trim().toLowerCase();
    if (!q) {
      return this.departments;
    }
    return this.departments.filter(
      (d) =>
        (d.DepartnentDescripton || '').toLowerCase().includes(q) ||
        (d.DepartnentCode || '').toLowerCase().includes(q)
    );
  }

  get filteredEducations(): NpsEducationCatalog[] {
    const q = (this.eduInput || '').trim().toLowerCase();
    if (!q) {
      return this.educations;
    }
    return this.educations.filter(
      (e) =>
        e.EducationSubject.toLowerCase().includes(q) ||
        String(e.EducationID).includes(q) ||
        (e.EducationSubject && e.EducationSubject.toLowerCase().includes(q))
    );
  }

  /**
   * Loads specialties for the new-rule form: server filter by `educationId`, or full catalog when education is “כללי”.
   */
  private loadFormSpecialties(): void {
    if (this.newRule.EducationID == null) {
      this.formSpecialties = this.specialtyLookup.length ? [...this.specialtyLookup] : [];
      this.pruneSpecialtyIfInvalid();
      return;
    }
    const educationId = String(this.newRule.EducationID);
    const serial = ++this.specialtiesRequestSerial;
    this.api.getSpecialties(this.employee_id, educationId).subscribe((list) => {
      if (serial !== this.specialtiesRequestSerial) {
        return;
      }
      this.formSpecialties = list;
      this.pruneSpecialtyIfInvalid();
    });
  }

  private pruneSpecialtyIfInvalid(): void {
    const fe = this.formSpecialties;
    if (this.newRule.SpecialtyID != null && !fe.some((s) => s.SpecialtyID === String(this.newRule.SpecialtyID))) {
      this.newRule.SpecialtyID = null;
      this.specInput = '';
    }
  }

  get filteredSpecialtiesForAutocomplete(): NpsSpecialtyCatalog[] {
    const base = this.formSpecialties;
    const q = (this.specInput || '').trim().toLowerCase();
    if (!q) {
      return base;
    }
    return base.filter(
      (s) =>
        s.Speciality.toLowerCase().includes(q) ||
        String(s.SpecialtyID).includes(q) ||
        (s.SpecialtyCode && s.SpecialtyCode.toLowerCase().includes(q))
    );
  }

  /** Profile + department + education + specialty (כללי counts as chosen). */
  canAttachPermissionMatrix(): boolean {
    if (this.newRule.ProfileID == null || !String(this.newRule.DepartnentCode || '').trim()) {
      return false;
    }
    const eduOk = this.eduInput?.trim().length > 0;
    const specOk = this.specInput?.trim().length > 0;
    return eduOk && specOk;
  }

  /** Loads the matrix when the rule context is complete. Pass `true` to show validation snack (e.g. legacy manual trigger). */
  attachPermissionMatrix(showValidationSnack = false): void {
    if (!this.canAttachPermissionMatrix()) {
      if (showValidationSnack) {
        this.snack.open('מלאו פרופיל, מחלקה, השכלה והתמחות (או כללי) ואז צרפו את המטריצה', 'סגור', { duration: 3500 });
      }
      return;
    }
    const pid = this.newRule.ProfileID;
    if (pid == null) {
      return;
    }
    this.clearEditRule();
    this.matrixAttached = true;
    this.attachedContext = this.captureRuleContext();
    this.matrix = [];
    this.api
      .getProfilePermissionsByRuleContext(this.employee_id, {
        ProfileID: pid,
        departmentCode: String(this.newRule.DepartnentCode || ''),
        EducationID: this.newRule.EducationID ?? null,
        SpecialtyID: this.newRule.SpecialtyID ?? null,
      })
      .subscribe((x) => {
        this.matrixCards = x || [];
        this.pp = this.flattenCardsToProfilePermissions(this.matrixCards, pid);
      });
  }

  /** Opens the matrix as soon as all required fields are set; skips redundant refetch for the same context. */
  private tryAutoAttachPermissionMatrix(): void {
    if (!this.canAttachPermissionMatrix() || this.editingRule != null) {
      return;
    }
    const cur = this.captureRuleContext();
    if (this.matrixAttached && this.attachedContext && this.contextsEqual(this.attachedContext, cur)) {
      return;
    }
    this.attachPermissionMatrix(false);
  }

  cancelMatrixAttachment(): void {
    this.clearMatrixAttachment();
  }

  private captureRuleContext() {
    return {
      profileId: this.newRule.ProfileID as number,
      departmentCode: String(this.newRule.DepartnentCode || ''),
      educationId: this.newRule.EducationID,
      specialtyId: this.newRule.SpecialtyID,
    };
  }

  private contextsEqual(
    a: { profileId: number; departmentCode: string; educationId: string | null; specialtyId: string | null },
    b: { profileId: number; departmentCode: string; educationId: string | null; specialtyId: string | null }
  ): boolean {
    return (
      a.profileId === b.profileId &&
      a.departmentCode === b.departmentCode &&
      a.educationId === b.educationId &&
      a.specialtyId === b.specialtyId
    );
  }

  private maybeInvalidateMatrixAttachment(): void {
    if (!this.matrixAttached || !this.attachedContext) {
      return;
    }
    const cur = this.captureRuleContext();
    if (!this.contextsEqual(this.attachedContext, cur)) {
      this.clearMatrixAttachment();
      this.snack.open('שיניתם את הקשר — מטריצת ההרשאות מתעדכנת', 'סגור', { duration: 3000 });
    }
  }

  private clearMatrixAttachment(): void {
    this.matrixAttached = false;
    this.attachedContext = null;
    this.matrixCards = [];
    this.pp = [];
    this.matrix = [];
  }

  private flattenCardsToProfilePermissions(cards: NpsPermissionCard[], profileId: number): NpsProfilePermission[] {
    const list: NpsProfilePermission[] = [];
    (cards || []).forEach((card) => {
      (card.Permissions || []).forEach((perm) => {
        list.push({
          ProfileID: profileId,
          PermissionID: perm.PermissionID,
          IsGranted: !!perm.IsGranted,
        });
      });
    });
    return list;
  }

  private ensureRuleForContext(
    profileID: number,
    departmentCode: string,
    educationID: string | null,
    specialtyID: string | null,
    isActive = true
  ): Observable<void> {
    return this.api.postProfileRule(this.employee_id, {
      ProfileID: profileID,
      departmentCode: String(departmentCode || ''),
      EducationID: educationID,
      SpecialtyID: specialtyID,
      isActive,
    }).pipe(map(() => void 0));
  }

  onMatrix(v: { PermissionID: number; IsGranted: boolean }[]): void {
    this.matrix = v;
  }

  onEditMatrix(v: { PermissionID: number; IsGranted: boolean }[]): void {
    this.editMatrix = v;
  }

  startEditRule(r: NpsProfileRule): void {
    this.clearMatrixAttachment();
    this.editingRule = r;
    this.editMatrixCards = [];
    this.editMatrix = [];
    this.api.getProfilePermissionsByRuleContext(this.employee_id, {
      ProfileID: r.ProfileID,
      departmentCode: String(r.DepartnentCode || r.DepartmentCode || ''),
      EducationID: String(r.EducationID),
      SpecialtyID: String(this.ruleSpecialtyId(r)),
    }).subscribe((cards) => {
      this.editMatrixCards = cards || [];
      this.editPp = this.flattenCardsToProfilePermissions(this.editMatrixCards, r.ProfileID);
    });
  }

  cancelEditRule(): void {
    this.clearEditRule();
  }

  private clearEditRule(): void {
    this.editingRule = null;
    this.editMatrixCards = [];
    this.editPp = [];
    this.editMatrix = [];
  }

  saveEditRuleMatrix(): void {
    if (this.editingRule == null) {
      return;
    }
    const rule = this.editingRule;
    const pid = rule.ProfileID;
    const fallback = this.editMatrixCards.length
      ? this.flattenCardsToProfilePermissions(this.editMatrixCards, pid)
      : this.editPp;
    const body = this.editMatrix.length
      ? this.editMatrix
      : fallback.map((x) => ({ PermissionID: x.PermissionID, IsGranted: x.IsGranted }));
    this.ensureRuleForContext(
      pid,
      String(rule.DepartnentCode || rule.DepartmentCode || ''),
      String(rule.EducationID),
      String(this.ruleSpecialtyId(rule)),
      true
    ).pipe(
      switchMap(() => this.api.putProfilePermissions(this.employee_id, pid, body))
    ).subscribe(() =>
      this.snack.open('הרשאות נשמרו', 'סגור', { duration: 2000 })
    );
  }

  saveMatrixPerms(): void {
    if (!this.matrixAttached || this.newRule.ProfileID == null) {
      return;
    }
    const pid = this.newRule.ProfileID;
    const body = this.matrix.length
      ? this.matrix
      : this.flattenCardsToProfilePermissions(this.matrixCards, pid).map((x) => ({ PermissionID: x.PermissionID, IsGranted: x.IsGranted }));
    this.ensureRuleForContext(
      pid,
      this.newRule.DepartnentCode,
      this.newRule.EducationID,
      this.newRule.SpecialtyID,
      this.newRule.IsActive
    ).pipe(
      switchMap(() => this.api.putProfilePermissions(this.employee_id, pid, body))
    ).subscribe(() => {
      this.snack.open('הרשאות נשמרו', 'סגור', { duration: 2000 });
      this.reload();
      this.clearMatrixAttachment();
    }, error => {
      this.snack.open('אירעה שגיאה בשמירת הרשאות', 'סגור', { duration: 2000 });
    });
  }

  onProfileInput(): void {
    if (!this.profileInput) {
      this.newRule.ProfileID = null;
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  onDeptInput(): void {
    if (!this.deptInput?.trim()) {
      this.newRule.DepartnentCode = '';
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  onEduInput(): void {
    if (!this.eduInput?.trim()) {
      this.newRule.EducationID = null;
      this.loadFormSpecialties();
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  onSpecInput(): void {
    if (!this.specInput) {
      this.newRule.SpecialtyID = null;
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  selectProfile(id: number): void {
    const p = this.profiles.find((x) => x.ProfileID === id);
    if (p) {
      this.newRule.ProfileID = id;
      this.newRule.DepartnentCode = p.DepartnentCode;
      this.newRule.EducationID = p.EducationID;
      this.newRule.SpecialtyID = p.SpecialityID;
      this.profileInput = p.ProfileName;
      this.selectDepartment(p.DepartnentCode);
      this.selectEducation(p.EducationID);
      this.selectSpecialty(p.SpecialityID);
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  selectDepartment(code: string): void {
    const d = this.departments.find((x) => x.DepartnentCode === code);
    if (d) {
      this.newRule.DepartnentCode = code;
      this.deptInput = d.DepartnentDescripton;
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  selectEducation(value: number | string): void {
    if (value === NPS_GENERAL) {
      this.newRule.EducationID = null;
      this.eduInput = '(כללי)';
    } else {
      const idStr = String(value);
      const n = Number(idStr);
      this.newRule.EducationID = String(Number.isFinite(n) ? n : null);
      const e = this.educations.find((x) => x.EducationID === idStr);
      this.eduInput = e ? e.EducationSubject : '';
    }
    this.loadFormSpecialties();
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  selectSpecialty(value: number | string): void {
    if (value === NPS_GENERAL) {
      this.newRule.SpecialtyID = null;
      this.specInput = '(כללי)';
    } else {
      const idStr = String(value);
      const n = Number(idStr);
      this.newRule.SpecialtyID = String(Number.isFinite(n) ? n : null);
      const s = this.formSpecialties.find((x) => x.SpecialtyID == idStr);
      this.specInput = s ? s.Speciality : '';
    }
    this.maybeInvalidateMatrixAttachment();
    this.tryAutoAttachPermissionMatrix();
  }

  reload(): void {
    this.api.getProfileRules(this.employee_id).subscribe((r) => (this.rules = r));
  }

  profileName(pid: number): string {
    const p = this.profiles.find((x) => x.ProfileID === pid);
    return p ? p.ProfileName : String(pid);
  }

  deptLabel(r: NpsProfileRule): string {
    const code = r.DepartnentCode || r.DepartmentCode || '';
    const d = this.departments.find((x) => x.DepartnentCode === code);
    return d ? d.DepartnentDescripton : code;
  }

  educationLabel(id: number | null | undefined): string {
    if (id == null) {
      return 'כללי';
    }
    const e = this.educations.find((x) => x.EducationID === String(id));
    return e ? e.EducationSubject : String(id);
  }

  ruleSpecialtyId(r: NpsProfileRule): number | null | undefined {
    return r.SpecialtyID ?? r.SpecialtyId;
  }

  specialtyLabel(id: number | null | undefined): string {
    if (id == null) {
      return 'כללי';
    }
    const s = this.specialtyLookup.find((x) => x.SpecialtyID === String(id));
    return s ? s.Speciality : String(id);
  }

  private toNullableNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private summaryToRule(row: NpsProfileRuleTableRow): NpsProfileRule | null {
    const ruleId = this.toNullableNumber(row.RuleID);
    const profileId = this.toNullableNumber(row.ProfileID);
    if (ruleId == null || profileId == null) {
      return null;
    }
    const educationId = this.toNullableNumber(row.EducationID);
    const specialtyId = this.toNullableNumber(row.SpecialtyID);
    return {
      RuleID: ruleId,
      ProfileID: profileId,
      DepartnentCode: row.DepartnentCode || '',
      EducationID: educationId == null ? undefined : educationId,
      SpecialtyID: specialtyId == null ? undefined : specialtyId,
      IsActive: true,
      EffectiveFrom: '',
      EffectiveTo: '',
      RuleDescription: '',
    };
  }

  editSummaryRule(row: NpsProfileRuleTableRow): void {
    const fullRule = this.summaryToRule(row);
    if (!fullRule) {
      this.snack.open('אין מזהה כלל לשורת הסיכום הזו', 'סגור', { duration: 2500 });
      return;
    }
    this.startEditRule(fullRule);
  }

  removeSummaryRule(row: NpsProfileRuleTableRow): void {
    const ruleId = this.toNullableNumber(row.RuleID);
    if (ruleId == null) {
      this.snack.open('אין מזהה כלל לשורת הסיכום הזו', 'סגור', { duration: 2500 });
      return;
    }
    this.remove(ruleId);
  }

  add(): void {
    if (this.newRule.ProfileID == null || !String(this.newRule.DepartnentCode || '').trim()) {
      this.snack.open('בחרו פרופיל ומחלקה', 'סגור', { duration: 2500 });
      return;
    }
    this.api
      .postProfileRule(this.employee_id, {
        ProfileID: this.newRule.ProfileID,
        departmentCode: this.newRule.DepartnentCode,
        EducationID: this.newRule.EducationID,
        SpecialtyID: this.newRule.SpecialtyID,
        isActive: this.newRule.IsActive,
      })
      .subscribe(() => {
        this.snack.open('נוסף', 'סגור', { duration: 2000 });
        this.reload();
        this.resetNewRuleForm();
      });
  }

  private resetNewRuleForm(): void {
    this.newRule = {
      ProfileID: null,
      DepartnentCode: '',
      EducationID: null,
      SpecialtyID: null,
      IsActive: true,
    };
    this.profileInput = '';
    this.deptInput = '';
    this.eduInput = '';
    this.specInput = '';
    this.loadFormSpecialties();
    this.clearMatrixAttachment();
  }

  remove(id: number): void {
    if (this.editingRule?.RuleID === id) {
      this.clearEditRule();
    }
    this.api.deleteProfileRule(this.employee_id, id).subscribe(() => this.reload());
  }
}
