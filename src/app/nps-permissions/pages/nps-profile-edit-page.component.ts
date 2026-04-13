import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest } from 'rxjs';
import { NpsProfile } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-profile-edit-page',
  templateUrl: './nps-profile-edit-page.component.html',
  styleUrls: ['./nps-profile-edit-page.component.scss'],
})
export class NpsProfileEditPageComponent implements OnInit {
  profile: NpsProfile | null = null;
  isNew = false;
  private id: number | null = null;
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: NpsBaseApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
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

  private initNewProfile(): void {
    this.profile = {
      ProfileID: 0,
      ProfileCode: '',
      ProfileName: '',
      Description: '',
      IsActive: true,
      Priority: 0,
    };
  }

  private loadExisting(): void {
    if (this.id == null || !Number.isFinite(this.id)) {
      return;
    }
    this.api.getProfile(this.employee_id || '', this.id).subscribe((profile) => {
      this.profile = { ...profile };
    });
  }

  private writeBody() {
    if (!this.profile) {
      return null;
    }
    return {
      name: this.profile.ProfileName,
      profileCode: this.profile.ProfileCode || undefined,
      description: this.profile.Description || '',
      isActive: this.profile.IsActive,
      priority: this.profile.Priority ?? 0,
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
