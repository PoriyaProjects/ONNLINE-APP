import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  EpAdminSetupResult,
  EpDashboardSummary,
  EpEmployee,
  EpEmployeePermissionGrid,
  EpOperationResult,
  EpProfile,
  EpUserRole,
} from '../models/nurse-permissions.models';

@Injectable({
  providedIn: 'root',
})
export class NursePermissionsService {
  private readonly base = environment.url;
  private readonly userRole$ = new BehaviorSubject<EpUserRole>('Employee');
  private readonly adminUserIds = new Set(['312312424', '025996026', '029286432']);

  constructor(private http: HttpClient) {}

  get currentUserRole(): EpUserRole {
    return this.userRole$.value;
  }

  get userRoleChanges(): Observable<EpUserRole> {
    return this.userRole$.asObservable();
  }

  setUserRole(role: EpUserRole): void {
    this.userRole$.next(role || 'Employee');
  }

  private getUserId(): string {
    return localStorage.getItem('ID') || '';
  }

  private isAdminUser(): boolean {
    const userId = this.getUserId().trim();
    return !!userId && this.adminUserIds.has(userId);
  }

  private resolveRoleForRequest(explicitRole?: string): string {
    if (explicitRole) {
      return explicitRole;
    }

    if (this.isAdminUser()) {
      return 'Admin';
    }

    return this.userRole$.value || 'Employee';
  }

  private unwrap<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(map((response) => (response && response.d !== undefined ? response.d : response)));
  }

  getDashboardSummary(role?: string): Observable<EpDashboardSummary> {
    const resolvedRole = this.resolveRoleForRequest(role);

    return this.unwrap<EpDashboardSummary>(
      this.http.post(this.base + 'EpGetDashboardSummary', {
        userId: this.getUserId(),
        role: resolvedRole,
      }),
    ).pipe(
      tap((summary) => {
        if (summary?.UserRole) {
          this.setUserRole(summary.UserRole);
        } else if (this.isAdminUser()) {
          this.setUserRole('Admin');
        }
      }),
    );
  }

  getEmployees(role?: string): Observable<EpEmployee[]> {
    const resolvedRole = this.resolveRoleForRequest(role);

    return this.unwrap<EpEmployee[]>(
      this.http.post(this.base + 'EpGetEmployees', {
        userId: this.getUserId(),
        role: resolvedRole,
      }),
    );
  }

  getProfiles(): Observable<EpProfile[]> {
    return this.unwrap<EpProfile[]>(this.http.post(this.base + 'EpListProfiles', {}));
  }

  manageAdminSetup(action: string, payload: any = {}): Observable<EpAdminSetupResult> {
    return this.unwrap<EpAdminSetupResult>(
      this.http.post(this.base + 'EpManageAdminSetup', {
        action: this.mapAdminSetupAction(action),
        payloadJson: JSON.stringify(this.mapAdminSetupPayload(action, payload || {})),
      }),
    );
  }

  private mapAdminSetupAction(action: string): string {
    switch (action) {
      case 'ListPermissions':
      case 'ListGroups':
      case 'ListProfiles':
      case 'GetDepartments':
      case 'GetEducations':
      case 'GetSpecialties':
        return 'GET_ALL';
      case 'SavePermission':
      case 'DeletePermission':
        return 'SAVE_PERMISSION';
      case 'SaveGroup':
      case 'SetGroupPermissions':
      case 'DeleteGroup':
        return 'SAVE_GROUP';
      case 'SaveProfile':
      case 'SetProfileGroups':
      case 'DeleteProfile':
        return 'SAVE_PROFILE';
      default:
        return action;
    }
  }

  private mapAdminSetupPayload(action: string, payload: any): Record<string, any> {
    const mapped: Record<string, any> = { ...(payload || {}) };

    const id = payload.PermissionID ?? payload.GroupID ?? payload.ProfileID ?? payload.ID ?? payload.Id;
    if (id != null && id !== '') {
      mapped.ID = id;
    }

    if (payload.PermissionCode != null) {
      mapped.Code = payload.PermissionCode;
    }
    if (payload.PermissionName != null || payload.GroupName != null || payload.ProfileName != null) {
      mapped.Name = payload.PermissionName ?? payload.GroupName ?? payload.ProfileName;
    }

    if (payload.Description != null) {
      mapped.Description = payload.Description;
    }
    if (payload.DepartnentCode != null) {
      mapped.DepartnentCode = payload.DepartnentCode;
    }
    if (payload.EducationID != null && payload.EducationID !== '') {
      mapped.EducationID = payload.EducationID;
    }
    if (payload.SpecialtyID != null && payload.SpecialtyID !== '') {
      mapped.SpecialtyID = payload.SpecialtyID;
    }

    if (payload.IsActive != null) {
      mapped.IsActive = payload.IsActive;
    } else if (!action.startsWith('Delete')) {
      mapped.IsActive = true;
    }

    const ids = payload.PermissionIds || payload.GroupIds || payload.PermissionIDs || payload.GroupIDs;
    if (Array.isArray(ids)) {
      mapped.CSVList = ids.join(',');
    } else if (typeof ids === 'string' && ids) {
      mapped.CSVList = ids;
    } else if (payload.CSVList || payload.PermissionIDsCSV || payload.GroupIDsCSV) {
      mapped.CSVList = payload.CSVList || payload.PermissionIDsCSV || payload.GroupIDsCSV;
    }

    if (action.startsWith('Delete')) {
      mapped.IsActive = false;
    }

    return mapped;
  }

  assignProfile(employeeId: string, profileId: number): Observable<EpOperationResult> {
    return this.unwrap<EpOperationResult>(
      this.http.post(this.base + 'EpAssignProfileToEmployee', {
        employeeId,
        profileId,
      }),
    );
  }

  getPermissionGrid(employeeId: string): Observable<EpEmployeePermissionGrid> {
    return this.unwrap<EpEmployeePermissionGrid>(
      this.http.post(this.base + 'EpGetEmployeePermissionGrid', {
        employeeId,
        viewerUserId: this.getUserId(),
      }),
    ).pipe(
      tap((grid) => {
        if (grid?.UserRole) {
          this.setUserRole(grid.UserRole);
        }
      }),
    );
  }

  updateCheck(
    employeeId: string,
    permissionId: number,
    checkType: string,
    value: boolean,
  ): Observable<EpOperationResult> {
    return this.unwrap<EpOperationResult>(
      this.http.post(this.base + 'EpUpdateSingleCheck', {
        employeeId,
        permissionId,
        checkType,
        value,
      }),
    );
  }

  bulkGrantDirect(employeeId: string): Observable<EpOperationResult> {
    return this.unwrap<EpOperationResult>(
      this.http.post(this.base + 'EpBulkUpdateDirectChecks', {
        employeeId,
      }),
    );
  }

  bulkGrantPermissions(employeeIds: string[], permissionIds: number[]): Observable<EpOperationResult> {
    return this.unwrap<EpOperationResult>(
      this.http.post(this.base + 'EpBulkGrantPermissions', {
        userId: this.getUserId(),
        employeeIds: employeeIds || [],
        permissionIds: permissionIds || [],
      }),
    );
  }
}
