import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, forkJoin } from 'rxjs';
import {
  NpsDepartment,
  NpsEducationCatalog,
  NpsProfile,
  NpsSpecialtyCatalog,
} from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-profile-edit-page',
  templateUrl: './nps-profile-edit-page.component.html',
  styleUrls: ['./nps-profile-edit-page.component.scss'],
})
export class NpsProfileEditPageComponent implements OnInit {
  profile: NpsProfile | null = null;
  isNew = false;
  departments: NpsDepartment[] = [];
  educations: NpsEducationCatalog[] = [];
  profileSpecialties: NpsSpecialtyCatalog[] = [];
  private id: number | null = null;
  private employee_id: string = localStorage.getItem('ID') || '';
  private specialtiesRequestSerial = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: NpsBaseApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    combineLatest([this.route.data, this.route.paramMap]).subscribe(([data, params]) => {
      this.isNew = data.profileMode === 'create';
      if (this.isNew) {
        this.id = null;
        this.initNewProfile();
      } else {
        const sid = params.get('id');
        if (!sid) {
          return;
        }
        this.id = +sid;
        this.loadExisting();
      }
    });
  }

  private loadLookups(): void {
    forkJoin({
      departments: this.api.getDepartments(this.employee_id || ''),
      educations: this.api.getEducations(this.employee_id || ''),
    }).subscribe(({ departments, educations }) => {
      this.departments = departments;
      this.educations = educations;
    });
  }

  private initNewProfile(): void {
    this.profile = {
      ProfileID: 0,
      ProfileName: '',
      Description: '',
      IsActive: true,
      Priority: 0,
      DepartnentCode: '',
      EducationID: '',
      SpecialityID: '',
    };
    this.profileSpecialties = [];
  }

  private loadExisting(): void {
    if (this.id == null || !Number.isFinite(this.id)) {
      return;
    }
    this.api.getProfile(this.employee_id || '', this.id).subscribe((profile) => {
      this.profile = { ...profile };
      this.normalizeProfileContextFields();
      this.loadProfileSpecialties();
    });
  }

  /** Normalize API keys if serializer uses different casing. */
  private normalizeProfileContextFields(): void {
    if (!this.profile) {
      return;
    }
    const p = this.profile as unknown as Record<string, unknown>;
    if (this.profile.DepartnentCode == null && p['departnentCode'] != null) {
      this.profile.DepartnentCode = String(p['departnentCode']);
    }
    if (this.profile.EducationID == null && p['educationID'] != null) {
      this.profile.EducationID = String(p['educationID']);
    }
    if (this.profile.SpecialityID == null && p['specialityID'] != null) {
      this.profile.SpecialityID = String(p['specialityID']);
    }
    if (this.profile.DepartnentCode != null && this.profile.DepartnentCode !== '') {
      this.profile.DepartnentCode = String(this.profile.DepartnentCode);
    } else {
      this.profile.DepartnentCode = '';
    }
    if (this.profile.EducationID != null && this.profile.EducationID !== '') {
      this.profile.EducationID = String(this.profile.EducationID);
    } else {
      this.profile.EducationID = '';
    }
    if (this.profile.SpecialityID != null && this.profile.SpecialityID !== '') {
      this.profile.SpecialityID = String(this.profile.SpecialityID);
    } else {
      this.profile.SpecialityID = '';
    }
  }

  onProfileEducationChange(): void {
    if (!this.profile) {
      return;
    }
    this.profile.SpecialityID = '';
    this.loadProfileSpecialties();
  }

  private loadProfileSpecialties(): void {
    if (!this.profile) {
      return;
    }
    const edu = (this.profile.EducationID || '').trim();
    const serial = ++this.specialtiesRequestSerial;
    this.api.getSpecialties(this.employee_id || '', edu).subscribe((list) => {
      if (serial !== this.specialtiesRequestSerial) {
        return;
      }
      this.profileSpecialties = list || [];
    });
  }

  private writeBody() {
    if (!this.profile) {
      return null;
    }
    return {
      name: this.profile.ProfileName,
      description: this.profile.Description || '',
      isActive: this.profile.IsActive,
      priority: this.profile.Priority ?? 0,
      departnentCode: (this.profile.DepartnentCode || '').trim() || null,
      educationID: (this.profile.EducationID || '').trim() || null,
      specialityID: (this.profile.SpecialityID || '').trim() || null,
    };
  }

  saveMeta(): void {
    const body = this.writeBody();
    if (!body || !this.profile) {
      return;
    }
    if (!String(body.name || '').trim()) {
      this.snack.open('נא למלא שם פרופיל', 'סגור', { duration: 3000 });
      return;
    }
    if (this.isNew) {
      this.api.postProfile(this.employee_id || '', body).subscribe((r) => {
        this.snack.open('נשמר', 'סגור', { duration: 2000 });
        this.router.navigate(['/nps-permissions/profiles', r.ProfileID, 'edit']);
      });
      return;
    }
    if (this.id == null) {
      return;
    }
    this.api.putProfile(this.employee_id || '', this.id, body).subscribe(() => this.snack.open('נשמר', 'סגור', { duration: 2000 }));
  }
}
