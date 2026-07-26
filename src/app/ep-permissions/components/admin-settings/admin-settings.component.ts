import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import {
  EpLookupItem,
  EpPermission,
  EpPermissionGroup,
  EpProfile,
} from '../../models/nurse-permissions.models';
import { NursePermissionsService } from '../../services/nurse-permissions.service';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent implements OnInit {
  loading = true;
  saving = false;

  permissions: EpPermission[] = [];
  groups: EpPermissionGroup[] = [];
  profiles: EpProfile[] = [];
  departments: EpLookupItem[] = [];
  educations: EpLookupItem[] = [];
  specialties: EpLookupItem[] = [];
  private allSpecialtyRows: any[] = [];

  permissionForm: Partial<EpPermission> = { IsActive: true };
  groupForm: Partial<EpPermissionGroup> = { IsActive: true, PermissionIds: [] };
  profileForm: Partial<EpProfile> = { IsActive: true, GroupIds: [] };

  selectedGroupId: number | null = null;
  selectedProfileId: number | null = null;

  permissionColumns = ['code', 'name', 'description', 'active', 'actions'];
  groupColumns = ['name', 'description', 'active', 'actions'];
  profileColumns = ['name', 'department', 'education', 'specialty', 'active', 'actions'];
  groupPermissionPickerColumns = ['select', 'code', 'name', 'description'];
  profileGroupPickerColumns = ['select', 'name', 'description'];

  permissionDataSource = new MatTableDataSource<EpPermission>([]);
  groupDataSource = new MatTableDataSource<EpPermissionGroup>([]);
  profileDataSource = new MatTableDataSource<EpProfile>([]);
  groupPermissionPickerSource = new MatTableDataSource<EpPermission>([]);
  profileGroupPickerSource = new MatTableDataSource<EpPermissionGroup>([]);

  constructor(private service: NursePermissionsService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;

    this.service.manageAdminSetup('GET_ALL').subscribe(
      (result) => {
        if (result?.Success === false) {
          this.loading = false;
          this.showError(result?.Message || 'שגיאה בטעינת הגדרות מערכת');
          return;
        }

        const data = result?.Data || {};
        this.permissions = this.extractNamedList<any>(data, 'Permissions')
          .map((row) => this.normalizePermission(row))
          .sort((a, b) => a.PermissionName.localeCompare(b.PermissionName, 'he'));
        this.groups = this.extractNamedList<any>(data, 'Groups')
          .map((row) => this.normalizeGroup(row))
          .sort((a, b) => a.GroupName.localeCompare(b.GroupName, 'he'));
        this.profiles = this.extractNamedList<any>(data, 'Profiles')
          .map((row) => this.normalizeProfile(row))
          .sort((a, b) => a.ProfileName.localeCompare(b.ProfileName, 'he'));
        this.departments = this.extractLookups(this.extractNamedList<any>(data, 'Departments'));
        this.educations = this.extractLookups(this.extractNamedList<any>(data, 'Educations'));
        this.allSpecialtyRows = this.extractNamedList<any>(data, 'Specialties');
        this.specialties = this.filterSpecialties(this.profileForm.EducationID);

        this.permissionDataSource.data = this.permissions;
        this.groupDataSource.data = this.groups;
        this.profileDataSource.data = this.profiles;
        this.groupPermissionPickerSource.data = this.permissions;
        this.profileGroupPickerSource.data = this.groups;
        this.loading = false;
      },
      () => {
        this.loading = false;
        this.showError('שגיאה בטעינת הגדרות מערכת');
      },
    );
  }

  savePermission(): void {
    if (!this.permissionForm.PermissionName) {
      this.showError('יש להזין שם הרשאה');
      return;
    }

    this.saving = true;
    this.service.manageAdminSetup('SavePermission', this.permissionForm).subscribe(
      (result) => {
        this.saving = false;
        if (result?.Success !== false) {
          this.showMessage('הרשאה נשמרה');
          this.permissionForm = { IsActive: true };
          this.loadAll();
        } else {
          this.showError(result?.Message || 'שגיאה בשמירת הרשאה');
        }
      },
      () => {
        this.saving = false;
        this.showError('שגיאה בשמירת הרשאה');
      },
    );
  }

  editPermission(permission: EpPermission): void {
    this.permissionForm = { ...permission };
  }

  deletePermission(permission: EpPermission): void {
    if (!confirm(`למחוק את ההרשאה "${permission.PermissionName}"?`)) {
      return;
    }

    this.service
      .manageAdminSetup('DeletePermission', {
        PermissionID: permission.PermissionID,
        PermissionCode: permission.PermissionCode,
        PermissionName: permission.PermissionName,
        Description: permission.Description,
        IsActive: false,
      })
      .subscribe(
        (result) => {
          if (result?.Success !== false) {
            this.showMessage('הרשאה נמחקה');
            this.loadAll();
          } else {
            this.showError(result?.Message || 'שגיאה במחיקת הרשאה');
          }
        },
        () => this.showError('שגיאה במחיקת הרשאה'),
      );
  }

  saveGroup(): void {
    if (!this.groupForm.GroupName) {
      this.showError('יש להזין שם קבוצה');
      return;
    }

    this.saving = true;
    this.service
      .manageAdminSetup('SaveGroup', {
        ...this.groupForm,
        PermissionIds: this.groupForm.PermissionIds || [],
      })
      .subscribe(
        (result) => {
          this.saving = false;
          if (result?.Success !== false) {
            this.showMessage('קבוצה נשמרה');
            this.groupForm = { IsActive: true, PermissionIds: [] };
            this.selectedGroupId = null;
            this.loadAll();
          } else {
            this.showError(result?.Message || 'שגיאה בשמירת קבוצה');
          }
        },
        () => {
          this.saving = false;
          this.showError('שגיאה בשמירת קבוצה');
        },
      );
  }

  editGroup(group: EpPermissionGroup): void {
    this.groupForm = {
      ...group,
      PermissionIds: [...(group.PermissionIds || [])],
    };
    this.selectedGroupId = group.GroupID;
  }

  deleteGroup(group: EpPermissionGroup): void {
    if (!confirm(`למחוק את הקבוצה "${group.GroupName}"?`)) {
      return;
    }

    this.service
      .manageAdminSetup('DeleteGroup', {
        GroupID: group.GroupID,
        GroupName: group.GroupName,
        Description: group.Description,
        PermissionIds: group.PermissionIds || [],
        IsActive: false,
      })
      .subscribe(
        (result) => {
          if (result?.Success !== false) {
            this.showMessage('קבוצה נמחקה');
            this.loadAll();
          } else {
            this.showError(result?.Message || 'שגיאה במחיקת קבוצה');
          }
        },
        () => this.showError('שגיאה במחיקת קבוצה'),
      );
  }

  toggleGroupPermission(permissionId: number, checked: boolean): void {
    const ids = new Set(this.groupForm.PermissionIds || []);
    if (checked) {
      ids.add(permissionId);
    } else {
      ids.delete(permissionId);
    }
    this.groupForm.PermissionIds = Array.from(ids);
  }

  isGroupPermissionChecked(permissionId: number): boolean {
    return (this.groupForm.PermissionIds || []).includes(permissionId);
  }

  onEducationChange(educationId: number): void {
    this.profileForm.EducationID = educationId;
    this.profileForm.SpecialtyID = 0;
    this.specialties = this.filterSpecialties(educationId);
  }

  saveProfile(): void {
    if (!this.profileForm.ProfileName) {
      this.showError('יש להזין שם פרופיל');
      return;
    }

    this.saving = true;
    this.service
      .manageAdminSetup('SaveProfile', {
        ...this.profileForm,
        GroupIds: this.profileForm.GroupIds || [],
      })
      .subscribe(
        (result) => {
          this.saving = false;
          if (result?.Success !== false) {
            this.showMessage('פרופיל נשמר');
            this.profileForm = { IsActive: true, GroupIds: [] };
            this.selectedProfileId = null;
            this.loadAll();
          } else {
            this.showError(result?.Message || 'שגיאה בשמירת פרופיל');
          }
        },
        () => {
          this.saving = false;
          this.showError('שגיאה בשמירת פרופיל');
        },
      );
  }

  editProfile(profile: EpProfile): void {
    this.profileForm = {
      ...profile,
      GroupIds: [...(profile.GroupIds || [])],
    };
    this.selectedProfileId = profile.ProfileID;
    this.specialties = this.filterSpecialties(profile.EducationID);
  }

  deleteProfile(profile: EpProfile): void {
    if (!confirm(`למחוק את הפרופיל "${profile.ProfileName}"?`)) {
      return;
    }

    this.service
      .manageAdminSetup('DeleteProfile', {
        ProfileID: profile.ProfileID,
        ProfileName: profile.ProfileName,
        DepartnentCode: profile.DepartnentCode,
        EducationID: profile.EducationID,
        SpecialtyID: profile.SpecialtyID,
        GroupIds: profile.GroupIds || [],
        IsActive: false,
      })
      .subscribe(
        (result) => {
          if (result?.Success !== false) {
            this.showMessage('פרופיל נמחק');
            this.loadAll();
          } else {
            this.showError(result?.Message || 'שגיאה במחיקת פרופיל');
          }
        },
        () => this.showError('שגיאה במחיקת פרופיל'),
      );
  }

  toggleProfileGroup(groupId: number, checked: boolean): void {
    const ids = new Set(this.profileForm.GroupIds || []);
    if (checked) {
      ids.add(groupId);
    } else {
      ids.delete(groupId);
    }
    this.profileForm.GroupIds = Array.from(ids);
  }

  isProfileGroupChecked(groupId: number): boolean {
    return (this.profileForm.GroupIds || []).includes(groupId);
  }

  departmentName(code: string): string {
    if (!code) {
      return '';
    }
    return (
      this.departments.find((d) => String(d.Id) === String(code))?.Name || String(code)
    );
  }

  educationName(id: number): string {
    if (!id) {
      return '';
    }
    return this.educations.find((e) => String(e.Id) === String(id))?.Name || String(id);
  }

  specialtyName(id: number): string {
    if (!id) {
      return '';
    }
    const row = this.allSpecialtyRows.find(
      (s) => String(s.Id ?? s.SpecialtyID ?? '') === String(id),
    );
    return row ? String(row.Name ?? row.Speciality ?? id) : String(id);
  }

  profileDepartmentLabel(row: EpProfile): string {
    return row.DepartnentDescripton || this.departmentName(row.DepartnentCode) || '';
  }

  profileEducationLabel(row: EpProfile): string {
    return row.EducationSubject || this.educationName(row.EducationID) || '';
  }

  profileSpecialtyLabel(row: EpProfile): string {
    return row.Speciality || this.specialtyName(row.SpecialtyID) || '';
  }

  private normalizePermission(row: any): EpPermission {
    return {
      PermissionID: Number(row.PermissionID ?? row.ID ?? 0),
      PermissionCode: String(row.PermissionCode ?? row.Code ?? ''),
      PermissionName: String(row.PermissionName ?? row.Name ?? ''),
      Description: String(row.Description ?? ''),
      IsActive: this.toBool(row.IsActive),
    };
  }

  private normalizeGroup(row: any): EpPermissionGroup {
    return {
      GroupID: Number(row.GroupID ?? row.ID ?? 0),
      GroupName: String(row.GroupName ?? row.Name ?? ''),
      Description: String(row.Description ?? ''),
      IsActive: this.toBool(row.IsActive),
      PermissionIds: this.toIntArray(row.PermissionIds ?? row.PermissionIDs),
    };
  }

  private normalizeProfile(row: any): EpProfile {
    return {
      ProfileID: Number(row.ProfileID ?? row.ID ?? 0),
      ProfileName: String(row.ProfileName ?? row.Name ?? ''),
      DepartnentCode: String(row.DepartnentCode ?? row.DepartmentCode ?? '').trim(),
      DepartnentDescripton: String(row.DepartnentDescripton ?? row.DepartmentDescription ?? '').trim(),
      EducationID: Number(row.EducationID ?? 0),
      EducationSubject: String(row.EducationSubject ?? row.EducationName ?? '').trim(),
      SpecialtyID: Number(row.SpecialtyID ?? row.SpecialityID ?? 0),
      Speciality: String(row.Speciality ?? row.Specialty ?? row.SpecialtyName ?? '').trim(),
      IsActive: this.toBool(row.IsActive),
      GroupIds: this.toIntArray(row.GroupIds ?? row.GroupIDs),
    };
  }

  private toBool(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value == null || value === '') {
      return false;
    }
    const text = String(value).toLowerCase();
    return text === 'true' || text === '1';
  }

  private toIntArray(value: any): number[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => !Number.isNaN(item));
    }
    return [];
  }

  private filterSpecialties(educationId?: number): EpLookupItem[] {
    // Specialty rows usually have no EducationID in EP_Specialities; show all when absent.
    const rows = !educationId
      ? this.allSpecialtyRows
      : this.allSpecialtyRows.filter((row) => {
          const rowEducationId = row.EducationID;
          if (rowEducationId == null || rowEducationId === '') {
            return true;
          }
          return String(rowEducationId) === String(educationId);
        });

    return this.extractLookups(rows);
  }

  private extractNamedList<T>(data: any, key: string): T[] {
    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data as T[];
    }

    const named = data[key] ?? data[key.toLowerCase()] ?? data[key.toUpperCase()];
    return Array.isArray(named) ? (named as T[]) : [];
  }

  private extractLookups(data: any): EpLookupItem[] {
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row) => ({
        Id: String(
          row.Id ??
            row.DepartnentCode ??
            row.EducationID ??
            row.SpecialtyID ??
            row.SpecialityID ??
            '',
        ).trim(),
        Name: String(
          row.Name ??
            row.DepartnentDescripton ??
            row.EducationSubject ??
            row.Speciality ??
            row.Specialty ??
            '',
        ).trim(),
      }))
      .filter((item) => !!item.Id && !!item.Name);
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 3000, direction: 'rtl' });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'סגור', { duration: 5000, direction: 'rtl', panelClass: ['snack-error'] });
  }
}
