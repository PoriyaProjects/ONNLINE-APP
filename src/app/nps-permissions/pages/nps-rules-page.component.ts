import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NpsDepartment,
  NpsEducationCatalog,
  NpsProfile,
  NpsProfileRule,
  NpsSpecialtyCatalog,
} from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

/** Sentinel for mat-option "כללי" rows (distinct from real DB ids). */
const NPS_GENERAL = '__nps_general__';

@Component({
  selector: 'app-nps-rules-page',
  templateUrl: './nps-rules-page.component.html',
  styleUrls: ['./nps-rules-page.component.scss'],
})
export class NpsRulesPageComponent implements OnInit {
  readonly generalToken = NPS_GENERAL;

  rules: NpsProfileRule[] = [];
  profiles: NpsProfile[] = [];
  departments: NpsDepartment[] = [];
  educations: NpsEducationCatalog[] = [];
  specialties: NpsSpecialtyCatalog[] = [];
  cols = ['rid', 'pid', 'dept', 'edu', 'spec', 'del'];
  newRule = {
    ProfileID: null as number | null,
    DepartnentCode: '',
    EducationID: null as number | null,
    SpecialtyID: null as number | null,
    IsActive: true,
  };
  /** Bound to autocomplete inputs (display / filter text). */
  profileInput = '';
  deptInput = '';
  eduInput = '';
  specInput = '';

  private employee_id = localStorage.getItem('ID') || '';

  constructor(private api: NpsBaseApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    forkJoin({
      profiles: this.api.getProfiles(this.employee_id),
      departments: this.api.getDepartments(this.employee_id),
      educations: this.api.getEducations(this.employee_id),
      specialties: this.api.getSpecialties(this.employee_id),
    }).subscribe(({ profiles, departments, educations, specialties }) => {
      this.profiles = profiles;
      this.departments = departments;
      this.educations = educations;
      this.specialties = specialties;
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
        String(p.ProfileID).includes(q) ||
        (p.ProfileCode && p.ProfileCode.toLowerCase().includes(q))
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
        e.Name.toLowerCase().includes(q) ||
        String(e.EducationID).includes(q) ||
        (e.Code && e.Code.toLowerCase().includes(q))
    );
  }

  specialtiesFilteredByEdu(): NpsSpecialtyCatalog[] {
    const edu = this.newRule.EducationID;
    if (edu == null) {
      return this.specialties;
    }
    return this.specialties.filter((s) => s.EducationID == null || s.EducationID === edu);
  }

  get filteredSpecialtiesForAutocomplete(): NpsSpecialtyCatalog[] {
    const base = this.specialtiesFilteredByEdu();
    const q = (this.specInput || '').trim().toLowerCase();
    if (!q) {
      return base;
    }
    return base.filter(
      (s) =>
        s.Name.toLowerCase().includes(q) ||
        String(s.SpecialtyId).includes(q) ||
        (s.SpecialtyCode && s.SpecialtyCode.toLowerCase().includes(q))
    );
  }

  onProfileInput(): void {
    if (!this.profileInput?.trim()) {
      this.newRule.ProfileID = null;
    }
  }

  onDeptInput(): void {
    if (!this.deptInput?.trim()) {
      this.newRule.DepartnentCode = '';
    }
  }

  onEduInput(): void {
    if (!this.eduInput?.trim()) {
      this.newRule.EducationID = null;
      this.onEducationChange();
    }
  }

  onSpecInput(): void {
    if (!this.specInput?.trim()) {
      this.newRule.SpecialtyID = null;
    }
  }

  selectProfile(id: number): void {
    const p = this.profiles.find((x) => x.ProfileID === id);
    if (p) {
      this.newRule.ProfileID = id;
      this.profileInput = p.ProfileName;
    }
  }

  selectDepartment(code: string): void {
    const d = this.departments.find((x) => x.DepartnentCode === code);
    if (d) {
      this.newRule.DepartnentCode = code;
      this.deptInput = d.DepartnentDescripton;
    }
  }

  selectEducation(value: number | string): void {
    if (value === NPS_GENERAL) {
      this.newRule.EducationID = null;
      this.eduInput = '(כללי)';
    } else if (typeof value === 'number') {
      this.newRule.EducationID = value;
      const e = this.educations.find((x) => x.EducationID === value);
      this.eduInput = e ? e.Name : '';
    }
    this.onEducationChange();
  }

  selectSpecialty(value: number | string): void {
    if (value === NPS_GENERAL) {
      this.newRule.SpecialtyID = null;
      this.specInput = '(כללי)';
    } else if (typeof value === 'number') {
      this.newRule.SpecialtyID = value;
      const s = this.specialties.find((x) => x.SpecialtyId === value);
      this.specInput = s ? s.Name : '';
    }
  }

  onEducationChange(): void {
    const fe = this.specialtiesFilteredByEdu();
    if (this.newRule.SpecialtyID != null && !fe.some((s) => s.SpecialtyId === this.newRule.SpecialtyID)) {
      this.newRule.SpecialtyID = null;
      this.specInput = '';
    }
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
    const e = this.educations.find((x) => x.EducationID === id);
    return e ? e.Name : String(id);
  }

  ruleSpecialtyId(r: NpsProfileRule): number | null | undefined {
    return r.SpecialtyID ?? r.SpecialtyId;
  }

  specialtyLabel(id: number | null | undefined): string {
    if (id == null) {
      return 'כללי';
    }
    const s = this.specialties.find((x) => x.SpecialtyId === id);
    return s ? s.Name : String(id);
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
        EducationID: this.newRule.EducationID ?? null,
        specialtyId: this.newRule.SpecialtyID ?? null,
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
  }

  remove(id: number): void {
    this.api.deleteProfileRule(this.employee_id, id).subscribe(() => this.reload());
  }
}
