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

@Component({
  selector: 'app-nps-rules-page',
  templateUrl: './nps-rules-page.component.html',
  styleUrls: ['./nps-rules-page.component.scss'],
})
export class NpsRulesPageComponent implements OnInit {
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

  get filteredSpecialties(): NpsSpecialtyCatalog[] {
    const edu = this.newRule.EducationID;
    if (edu == null) {
      return this.specialties;
    }
    return this.specialties.filter((s) => s.EducationID == null || s.EducationID === edu);
  }

  onEducationChange(): void {
    const fe = this.filteredSpecialties;
    if (this.newRule.SpecialtyID != null && !fe.some((s) => s.SpecialtyId === this.newRule.SpecialtyID)) {
      this.newRule.SpecialtyID = null;
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
      });
  }

  remove(id: number): void {
    this.api.deleteProfileRule(this.employee_id, id).subscribe(() => this.reload());
  }
}
