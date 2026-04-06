import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, forkJoin } from 'rxjs';
import { NpsPermission, NpsProfile, NpsProfilePermission } from '../models/nps.models';
import { NpsBaseApiService } from '../services/nps-base-api.service';

@Component({
  selector: 'app-nps-profile-edit-page',
  templateUrl: './nps-profile-edit-page.component.html',
  styleUrls: ['./nps-profile-edit-page.component.scss'],
})
export class NpsProfileEditPageComponent implements OnInit {
  profile: NpsProfile | null = null;
  perms: NpsPermission[] = [];
  pp: NpsProfilePermission[] = [];
  isNew = false;
  private matrix: { PermissionID: number; IsGranted: boolean }[] = [];
  private id: number | null = null;
  private employee_id: string = localStorage.getItem('ID') || '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: NpsBaseApiService,
    private snack: MatSnackBar
  ) {}

  get showPermissionSection(): boolean {
    return !this.isNew && this.id != null && Number.isFinite(this.id);
  }

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.paramMap]).subscribe(([data, params]) => {
      this.isNew = data.profileMode === 'create';
      if (this.isNew) {
        this.id = null;
        this.initNewProfile();
        this.loadPermissionsOnly();
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
    this.pp = [];
    this.matrix = [];
  }

  private loadPermissionsOnly(): void {
    this.api.getPermissions(this.employee_id || '').subscribe((x) => (this.perms = x.filter((z) => z.IsActive)));
  }

  private loadExisting(): void {
    if (this.id == null || !Number.isFinite(this.id)) {
      return;
    }
    forkJoin({
      profile: this.api.getProfile(this.employee_id || '', this.id),
      perms: this.api.getPermissions(this.employee_id || ''),
      pp: this.api.getProfilePermissions(this.employee_id || '', this.id),
    }).subscribe(({ profile, perms, pp }) => {
      this.profile = { ...profile };
      this.perms = perms.filter((z) => z.IsActive);
      this.pp = pp;
    });
  }

  onMatrix(v: { PermissionID: number; IsGranted: boolean }[]): void {
    this.matrix = v;
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

  savePerms(): void {
    if (this.id == null) {
      return;
    }
    const body = this.matrix.length ? this.matrix : this.pp.map((x) => ({ PermissionID: x.PermissionID, IsGranted: x.IsGranted }));
    this.api.putProfilePermissions(this.employee_id || '', this.id, body).subscribe(() => this.snack.open('הרשאות נשמרו', 'סגור', { duration: 2000 }));
  }
}
