import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  NpsDepartment,
  NpsEducationCatalog,
  NpsProfile,
  NpsSpecialtyCatalog,
} from '../models/nps.models';
import { NpsEmployeesPermissionsApiService } from '../services/nps-employees-permissions-api.service';

@Component({
  selector: 'app-nps-profiles-page',
  templateUrl: './nps-profiles-page.component.html',
  styleUrls: ['./nps-profiles-page.component.scss'],
})
export class NpsProfilesPageComponent implements OnInit {
  profiles: NpsProfile[] = [];
  cols = ['ProfileID', 'ProfileName', 'Description', 'DepartnentCode', 'EducationID', 'SpecialityID', 'Actions'];
  private departments: NpsDepartment[] = [];
  private educations: NpsEducationCatalog[] = [];
  private specialties: NpsSpecialtyCatalog[] = [];
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(private api: NpsEmployeesPermissionsApiService, private router: Router) {}

  ngOnInit(): void {
    forkJoin({
      profiles: this.api.getProfiles(this.employee_id || ''),
      departments: this.api.getDepartments(this.employee_id || ''),
      educations: this.api.getEducations(this.employee_id || ''),
      specialties: this.api.getSpecialties(this.employee_id || '', ''),
    }).subscribe(({ profiles, departments, educations, specialties }) => {
      this.profiles = (profiles || []).map((p) => this.normalizeProfileListRow(p));
      this.departments = departments;
      this.educations = educations;
      this.specialties = specialties || [];
    });
  }

  private normalizeProfileListRow(p: NpsProfile): NpsProfile {
    const x = p as unknown as Record<string, unknown>;
    const dept = p.DepartnentCode ?? x['departnentCode'];
    const edu = p.EducationID ?? x['educationID'];
    const spec = p.SpecialityID ?? x['specialityID'];
    return {
      ...p,
      DepartnentCode: dept != null && String(dept).trim() !== '' ? String(dept) : '',
      EducationID: edu != null && String(edu).trim() !== '' ? String(edu) : '',
      SpecialityID: spec != null && String(spec).trim() !== '' ? String(spec) : '',
    };
  }

  deptLabel(code: string | null | undefined): string {
    if (code == null || String(code).trim() === '') {
      return '—';
    }
    const c = String(code);
    const d = this.departments.find((x) => x.DepartnentCode === c);
    return d ? d.DepartnentDescripton : c;
  }

  educationLabel(id: string | null | undefined): string {
    if (id == null || String(id).trim() === '') {
      return '—';
    }
    const s = String(id);
    const e = this.educations.find((x) => x.EducationID === s);
    return e ? e.EducationSubject : s;
  }

  specialtyLabel(id: string | null | undefined): string {
    if (id == null || String(id).trim() === '') {
      return '—';
    }
    const sid = String(id);
    const sp = this.specialties.find((x) => x.SpecialtyID === sid);
    return sp ? sp.Speciality : sid;
  }

  edit(id: number): void {
    this.router.navigate(['/nps-employees-permissions/profiles', id, 'edit']);
  }
 
  view(id: number): void {
    this.router.navigate(['/nps-employees-permissions/profiles', id, 'view']);
  }

  create(): void {
    this.router.navigate(['/nps-employees-permissions/profiles/new']);
  }
}
