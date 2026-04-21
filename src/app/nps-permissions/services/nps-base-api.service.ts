import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  NpsAction,
  NpsActionWriteBody,
  NpsAuditRow,
  NpsDashboardSummary,
  NpsDepartment,
  NpsDepartmentActionRow,
  NpsEducationCatalog,
  NpsEducationRow,
  NpsEmployeeDetail,
  NpsEmployeeListRow,
  NpsEmployeeProfileAssignmentRow,
  NpsPermission,
  NpsPermissionCard,
  NpsProfile,
  NpsProfilePermission,
  NpsProfileRule,
  NpsProfileRuleTableRow,
  NpsProfileWriteBody,
  NpsRequestDetail,
  NpsRequestSummary,
  NpsSpecialtyCatalog,
} from '../models/nps.models';

/**
 * NPS calls RFC `WebService.asmx/<MethodName>` with JSON body (ASP.NET AJAX shape `{ d: ... }`).
 * Set `environment.npsUserId` to the signed-in EP EmployeeID string.
 */
@Injectable({ providedIn: 'root' })
export class NpsBaseApiService {
  constructor(private http: HttpClient) {}

  private jsonHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
    };
  }

  /** Base: `.../WebService.asmx/` */
  private wsBase(): string {
    const u = environment.url || '';
    return u.endsWith('/') ? u : `${u}/`;
  }

  private methodUrl(name: string): string {
    return `${this.wsBase()}${name}`;
  }

  private userId(): string {
    return environment.npsUserId != null && String(environment.npsUserId).length > 0
      ? String(environment.npsUserId)
      : '';
  }

  /** Unwraps ASP.NET ScriptService `{ d: T }` when present. */
  private unwrap<T>(): (r: unknown) => T {
    return (r: unknown) => {
      const x = r as { d?: T };
      return (x && x.d !== undefined ? x.d : r) as T;
    };
  }

  private post<T>(method: string, body: Record<string, unknown>): Observable<T> {
    const uid = this.userId();
    if (!uid) {
      console.warn('NPS: set environment.npsUserId (EP EmployeeID) for WebService calls.');
    }
    return this.http
      .post<{ d: T }>(this.methodUrl(method), { user_id: uid, ...body }, this.jsonHeaders())
      .pipe(map(this.unwrap<T>()));
  }

  private normalizeEducationRow(raw: Record<string, unknown>): NpsEducationCatalog {
    const id = (raw.EducationID ?? raw.educationID) as string;
    return {
      EducationID: id,
      EducationSubject: String(raw.EducationSubject ?? raw.educationSubject ?? ''),
    };
  }

  private normalizeSpecialtyRow(raw: Record<string, unknown>): NpsSpecialtyCatalog {
    const sid = (raw.SpecialtyID ?? raw.specialtyID) as number;
    const eid = raw.EducationID ?? raw.educationID;
    return {
      SpecialtyID: String(sid),
      EducationID: eid === undefined || eid === null ? null : (eid as string),
      Speciality: String(raw.Speciality ?? raw.speciality ?? ''),
      SpecialtyCode: (raw.SpecialtyCode ?? raw.specialtyCode) as string | undefined,
      IsActive: (raw.IsActive ?? raw.isActive ?? true) as boolean,
    };
  }

  private profileDto(body: NpsProfileWriteBody): Record<string, unknown> {
    return {
      name: body.name,
      description: body.description ?? '',
      isActive: body.isActive,
      priority: body.priority ?? 0,
      // Match C# `NpsProfileBodyDto` property names (PascalCase).
      DepartnentCode: body.departnentCode ?? '',
      EducationID: body.educationID ?? '',
      SpecialityID: body.specialityID ?? '',
    };
  }

  private actionDto(body: NpsActionWriteBody): Record<string, unknown> {
    return {
      ActionSubject: body.ActionSubject,
      IsActive: body.IsActive,
      Sort: body.Sort ?? 0,
    };
  }

  getDashboardSummary(employee_id: string): Observable<NpsDashboardSummary> {
    return this.post<NpsDashboardSummary>('NpsGetDashboardSummary', { user_id:  employee_id || '' });
  }

  getEmployees(user_id: string, q?: string, DepartnentCode?: string, skip = 0, take = 50): Observable<NpsEmployeeListRow[]> {
    return this.post<NpsEmployeeListRow[]>('NpsGetEmployees', {
      user_id: user_id || '',
      q: q || '',
      DepartnentCode: DepartnentCode || '',
      skip,
      take,
    });
  }

  getEmployee(user_id: string, id: number): Observable<NpsEmployeeDetail> {
    return this.post<NpsEmployeeDetail>('NpsGetEmployee', { user_id: user_id || '', employeeId: id });
  }

  getEmployeeEducations(user_id: string, id: number): Observable<NpsEducationRow[]> {
    return this.post<NpsEducationRow[]>('NpsGetEmployeeEducations', { user_id: user_id || '', employeeId: id });
  }

  getEmployeeCurrentProfile(user_id: string, id: number): Observable<any> {
    return this.post<any>('NpsGetEmployeeCurrentProfile', { user_id: user_id || '', employeeId: id });
  }

  getEmployeeRequests(user_id: string, id: number): Observable<NpsRequestSummary[]> {
    return this.post<NpsRequestSummary[]>('NpsGetEmployeeRequests', { user_id: user_id || '', employeeId: id });
  }

  getEmployeeAssignments(user_id: string, id: number): Observable<NpsEmployeeProfileAssignmentRow[]> {
    return this.post<NpsEmployeeProfileAssignmentRow[]>('NpsGetEmployeeAssignments', {
      user_id: user_id || '',
      employeeId: id,
      skip: 0,
      take: 100,
    });
  }

  resolveEmployeeProfile(user_id: string, id: number): Observable<{ ProfileID: number; ProfileName: string }> {
    return this.post<{ ProfileID: number; ProfileName: string }>('NpsResolveEmployeeProfile', { user_id: user_id || '',   employeeId: id });
  }

  createEmployeeRequest(user_id: string, id: number): Observable<{ RequestID: number }> {
    return this.post<{ RequestID: number }>('NpsCreateEmployeeRequest', { user_id: user_id || '', employeeId: id });
  }

  getEducations(user_id: string): Observable<NpsEducationCatalog[]> {
    return this.post<NpsEducationCatalog[]>('NpsGetEducations', { user_id: user_id || '' });
  }

  getSpecialties(user_id: string, educationId?: string): Observable<NpsSpecialtyCatalog[]> {
    return this.post<NpsSpecialtyCatalog[]>('NpsGetSpecialties', { user_id: user_id || '', educationId: educationId || '' });
  }

  getPermissions(user_id: string): Observable<NpsPermission[]> {
    return this.post<NpsPermission[]>('NpsGetPermissions', { user_id: user_id || '' });
  }

  getActions(user_id: string): Observable<NpsAction[]> {
    return this.post<NpsAction[]>('NpsGetActions', { user_id: user_id || '' });
  }

  getDepartmentActions(user_id: string, DepartnentCode: string): Observable<NpsDepartmentActionRow[]> {
    return this.post<NpsDepartmentActionRow[]>('NpsGetDepartmentActions', {
      user_id: user_id || '',
      DepartnentCode: DepartnentCode || '',
    });
  }

  putDepartmentActions(user_id: string, DepartnentCode: string, actionIds: number[]): Observable<any> {
    return this.post<any>('NpsPutDepartmentActions', {
      user_id: user_id || '',
      DepartnentCode: DepartnentCode || '',
      body: actionIds || [],
    });
  }

  getProfiles(user_id: string): Observable<NpsProfile[]> {
    return this.post<NpsProfile[]>('NpsGetProfiles', { user_id: user_id || '' });
  }

  getProfile(user_id: string, id: number): Observable<NpsProfile> {
    return this.post<NpsProfile>('NpsGetProfile', { user_id: user_id || '', id });
  }

  getProfilePermissions(user_id: string, id: number): Observable<NpsProfilePermission[]> {
    return this.post<NpsProfilePermission[]>('NpsGetProfilePermissions', { user_id: user_id || '', id });
  }

  getProfilePermissionsByRuleContext(
    user_id: string,
    body: {
      ProfileID: number;
      departmentCode: string;
      EducationID: string | null;
      SpecialtyID: string | null;
    }
  ): Observable<NpsPermissionCard[]> {
    return this.post<NpsPermissionCard[]>('NpsGetProfilePermissionsByRuleContext', {
      user_id: user_id || '',
      body: {
        ProfileID: body.ProfileID,
        departmentCode: body.departmentCode,
        EducationID: body.EducationID,
        SpecialtyID: body.SpecialtyID,
      },
    });
  }

  putProfilePermissions(user_id: string, id: number, body: { PermissionID: number; IsGranted: boolean }[]): Observable<any> {
    return this.post<any>('NpsPutProfilePermissions', { user_id: user_id || '', id, body });
  }

  getProfileRules(user_id: string): Observable<NpsProfileRuleTableRow[]> {
    return this.post<NpsProfileRuleTableRow[]>('NpsGetProfileRules', { user_id: user_id || '' });
  }

  getRequests(user_id: string, status?: string, skip = 0, take = 50): Observable<NpsRequestSummary[]> {
    return this.post<NpsRequestSummary[]>('NpsGetRequests', { user_id: user_id || '', status: status || '', skip, take });
  }

  getRequest(user_id: string, id: number): Observable<NpsRequestDetail> {
    return this.post<NpsRequestDetail>('NpsGetRequest', { user_id: user_id || '',   RequestID: id });
  }

  getMyApprovals(user_id: string): Observable<NpsRequestSummary[]> {
    return this.post<NpsRequestSummary[]>('NpsGetMyApprovals', { user_id: user_id || '' });
  }

  getMyRequests(user_id: string): Observable<NpsRequestSummary[]> {
    return this.post<NpsRequestSummary[]>('NpsGetMyRequests', { user_id: user_id || '' });
  }

  approveRequest(user_id: string, id: number, comments?: string): Observable<any> {
    return this.post<any>('NpsApproveRequest', { user_id: user_id || '',    RequestID: id, body: { comments: comments || '' } });
  }

  rejectRequest(user_id: string, id: number, comments?: string): Observable<any> {
    return this.post<any>('NpsRejectRequest', { user_id: user_id || '',   RequestID: id, body: { comments: comments || '' } });
  }

  getAssignments(user_id: string, employeeId?: number, activeOnly = false): Observable<NpsEmployeeProfileAssignmentRow[]> {
    return this.post<NpsEmployeeProfileAssignmentRow[]>('NpsGetAssignments', {
      user_id: user_id || '',
      employeeId: employeeId != null ? String(employeeId) : '',
      activeOnly,
      skip: 0,
      take: 100,
    });
  }

  applyEmployeeProfileAssignment(
    user_id: string,
    body: { employeeId: number; profileId: number; ruleId: number | null }
  ): Observable<{ success: boolean }> {
    return this.post<{ success: boolean }>('NpsApplyEmployeeProfileAssignment', {
      user_id: user_id || '',
      body: {
        employeeId: body.employeeId,
        profileId: body.profileId,
        ruleId: body.ruleId,
      },
    });
  }

  getAudit(user_id: string, entityType?: string, skip = 0, take = 100): Observable<NpsAuditRow[]> {
    return this.post<NpsAuditRow[]>('NpsGetAudit', { user_id: user_id || '',    entityType: entityType || '', skip, take });
  }

  processQueue(user_id: string, maxItems = 50): Observable<any> {
    return this.post<any>('NpsProcessQueue', { user_id: user_id || '',   maxItems });
  }
  
  postProfile(user_id: string, body: NpsProfileWriteBody): Observable<{ ProfileID: number }> {
    return this.post<{ ProfileID: number }>('NpsPostProfile', { user_id: user_id || '', body: this.profileDto(body) });
  }

  putProfile(user_id: string, id: number, body: NpsProfileWriteBody): Observable<any> {
    return this.post<any>('NpsPutProfile', { user_id: user_id || '', id, body: this.profileDto(body) });
  }

  postEducation(user_id: string, body: { EducationName: string; EducationCode: string; IsActive: boolean }): Observable<{ EducationID: number }> {
    return this.post<{ EducationID: number }>('NpsPostEducation', { user_id: user_id || '',   body });
  }

  putEducation(user_id: string, id: number, body: { EducationName: string; EducationCode: string; IsActive: boolean }): Observable<any> {
    return this.post<any>('NpsPutEducation', { user_id: user_id || '',   id, body });
  }

  postSpecialty(user_id: string, body: { SpecialtyName: string; IsActive: boolean }): Observable<{ SpecialtyID: number }> {
    return this.post<{ SpecialtyID: number }>('NpsPostSpecialty', { user_id: user_id || '',     body });
  }

  putSpecialty(user_id: string, id: number, body: { SpecialtyName: string; IsActive: boolean }): Observable<any> {
    return this.post<any>('NpsPutSpecialty', { user_id: user_id || '',   SpecialtyID: id, body });
  }

  postPermission(
    user_id: string,
    body: { PermissionName: string; PermissionDescription: string; IsActive: boolean; ActionIDFK: string | null }
  ): Observable<{ PermissionID: number }> {
    const dto = {
      PermissionName: body.PermissionName,
      PermissionDescription: body.PermissionDescription,
      IsActive: body.IsActive,
      ActionIDFK: body.ActionIDFK,
    };
    return this.post<{ PermissionID: number }>('NpsPostPermission', { user_id: user_id || '', body: dto });
  }

  putPermission(
    user_id: string,
    id: number,
    body: { PermissionName: string; PermissionDescription: string; IsActive: boolean; ActionIDFK: string | null }
  ): Observable<any> {
    const dto = {
      PermissionName: body.PermissionName,
      PermissionDescription: body.PermissionDescription,
      IsActive: body.IsActive,
      ActionIDFK: body.ActionIDFK,
    };
    return this.post<any>('NpsPutPermission', { user_id: user_id || '', PermissionID: id, body: dto });
  }

  postAction(user_id: string, body: NpsActionWriteBody): Observable<{ ActionID: number }> {
    return this.post<{ ActionID: number }>('NpsPostAction', { user_id: user_id || '', body: this.actionDto(body) });
  }

  putAction(user_id: string, id: number, body: NpsActionWriteBody): Observable<any> {
    return this.post<any>('NpsPutAction', { user_id: user_id || '', id, body: this.actionDto(body) });
  }

  postProfileRule(
    user_id: string,
    body: {
      ProfileID: number;
      departmentCode: string;
      EducationID: string | null;
      SpecialtyID: string | null;
      isActive: boolean;
    }
  ): Observable<{ RuleID?: number; ruleId?: number }> {
    const dto = {
      ProfileID: body.ProfileID,
      departmentCode: body.departmentCode,
      EducationID: body.EducationID,
      SpecialtyID: body.SpecialtyID,
      isActive: body.isActive,
    };
    return this.post<{ RuleID?: number; ruleId?: number }>('NpsPostProfileRule', { user_id: user_id || '', body: dto });
  }

  putProfileRule(
    user_id: string,
    id: number,
    body: {
      ProfileID: number;
      departmentCode: string;
      EducationID: number | null;
      specialtyId: number | null;
      isActive: boolean;
    }
  ): Observable<any> {
    const dto = {
      ProfileID: body.ProfileID,
      departmentCode: body.departmentCode,
      EducationID: body.EducationID,
      specialtyId: body.specialtyId,
      isActive: body.isActive,
    };
    return this.post<any>('NpsPutProfileRule', { user_id: user_id || '', id, body: dto });
  }

  deleteProfileRule(user_id: string, id: number): Observable<any> {
    return this.post<any>('NpsDeleteProfileRule', { user_id: user_id || '', id });
  }

  getDepartments( user_id: string): Observable<NpsDepartment[]> {
    return this.post<NpsDepartment[]>('NpsGetDepartments', { user_id: user_id || '' });
  }
}
