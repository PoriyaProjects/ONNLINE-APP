import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  DpAccess,
  DpCatalogItem,
  DpDashboard,
  DpEmployeeDetail,
  DpEmployeeList,
  DpHistory,
  DpPage,
  DpPermission,
  DpSettings,
  DpTemplate,
} from '../models/dp.models';

@Injectable({ providedIn: 'root' })
export class DoctorPermissionsService {
  private readonly accessSubject = new BehaviorSubject<DpAccess>(null);

  constructor(private http: HttpClient) {}

  get access(): DpAccess {
    return this.accessSubject.value;
  }

  loadAccess(force?: boolean): Observable<DpAccess> {
    if (!force && this.accessSubject.value) {
      return of(this.accessSubject.value);
    }
    return this.post<DpAccess>('DpGetAccessContext', {}).pipe(
      tap((access) => this.accessSubject.next(access))
    );
  }

  search(q: string, departnentCode: string, functionId: string, jobTitleId: string, specialty: string, profileTemplateId: number, status: string, skip: number): Observable<DpPage<DpEmployeeList>> {
    return this.post<DpPage<DpEmployeeList>>('DpSearchEmployees', {
      q: q || '',
      departnentCode: departnentCode || '',
      functionId: functionId || '',
      jobTitleId: jobTitleId || '',
      specialty: specialty || '',
      profileTemplateId: profileTemplateId || 0,
      status: status || '',
      skip,
      take: 50,
    });
  }

  employee(employeeId: string): Observable<DpEmployeeDetail> {
    return this.post<DpEmployeeDetail>('DpGetEmployee', { employeeId });
  }

  mine(): Observable<DpEmployeeDetail> {
    return this.post<DpEmployeeDetail>('DpGetMyPermissions', {});
  }

  pending(skip: number, filters?: any): Observable<DpPage<DpPermission>> {
    const body = filters || {};
    return this.post<DpPage<DpPermission>>('DpGetPendingApprovals', {
      q: body.q || '',
      departnentCode: body.departnentCode || '',
      permissionId: body.permissionId || 0,
      profileName: body.profileName || '',
      minWaitDays: body.minWaitDays || 0,
      maxWaitDays: body.maxWaitDays || 0,
      kind: body.kind || '',
      skip,
      take: 50,
    });
  }

  orgChanges(body: any): Observable<any> {
    return this.post('DpGetOrganizationalChanges', {
      q: (body && body.q) || '',
      departnentCode: (body && body.departnentCode) || '',
      changeType: (body && body.changeType) || '',
      detectedFrom: (body && body.detectedFrom) || '',
      detectedTo: (body && body.detectedTo) || '',
      needsReview: body && body.needsReview ? 1 : 0,
      skip: (body && body.skip) || 0,
      take: 50,
    });
  }

  notifications(filters?: any): Observable<any> {
    const body = filters || {};
    return this.post<any>('DpGetNotifications', {
      q: body.q || '',
      channel: body.channel || '',
      status: body.status || '',
      eventType: body.eventType || '',
      fromDate: body.fromDate || '',
      toDate: body.toDate || '',
      skip: body.skip || 0,
      take: body.take || 50,
    });
  }

  retryNotification(id: number): Observable<any> {
    return this.post<any>('DpRetryNotification', { id });
  }

  approve(permissionId: number): Observable<any> {
    return this.post('DpApprovePermission', { permissionId });
  }

  reject(permissionId: number, reason: string): Observable<any> {
    return this.post('DpRejectPermission', { permissionId, reason });
  }

  bulkApprove(permissionIds: number[]): Observable<any> {
    return this.post('DpBulkApprove', { permissionIds: permissionIds.join(',') });
  }

  resubmit(permissionId: number, comment: string): Observable<any> {
    return this.post('DpResubmitPermission', { permissionId, comment: comment || '' });
  }

  override(permissionId: number, newStatus: string, reason: string): Observable<any> {
    return this.post('DpAdminOverride', { permissionId, newStatus, reason });
  }

  catalog(): Observable<DpCatalogItem[]> {
    return this.post<DpCatalogItem[]>('DpGetPermissionCatalog', {});
  }

  saveCatalog(payload: any): Observable<any> {
    return this.post('DpSavePermission', { payload: JSON.stringify(payload) });
  }

  templates(): Observable<DpTemplate[]> {
    return this.post<DpTemplate[]>('DpGetProfileTemplates', {});
  }

  saveTemplate(payload: any): Observable<any> {
    return this.post('DpSaveProfileTemplate', { payload: JSON.stringify(payload) });
  }

  saveProfile(payload: any): Observable<any> {
    return this.post('DpSaveEmployeeProfile', { payload: JSON.stringify(payload) });
  }

  addPermission(employeeProfileId: number, permissionId: number): Observable<any> {
    return this.post('DpAddProfilePermission', { employeeProfileId, permissionId });
  }

  removePermission(permissionId: number): Observable<any> {
    return this.post('DpRemoveProfilePermission', { permissionId });
  }

  dashboard(filters: any): Observable<DpDashboard> {
    return this.post<DpDashboard>('DpGetDashboard', {
      departnentCode: filters.departnentCode || '',
      managerId: filters.managerId || '',
      permissionId: filters.permissionId || 0,
      status: filters.status || '',
      expFrom: filters.expFrom || '',
      expTo: filters.expTo || '',
      metric: filters.metric || '',
      skip: filters.skip || 0,
      take: filters.take || 25,
    });
  }

  notes(employeeId: string): Observable<any[]> {
    return this.post<any[]>('DpGetNotes', { employeeId });
  }

  saveNote(payload: any): Observable<any> {
    return this.post('DpSaveNote', { payload: JSON.stringify(payload) });
  }

  history(employeeId: string, filters?: any): Observable<DpPage<DpHistory>> {
    const body = filters || {};
    return this.post<DpPage<DpHistory>>('DpGetHistory', {
      employeeId,
      category: body.category || '',
      fromDate: body.fromDate || '',
      toDate: body.toDate || '',
      search: body.search || '',
      skip: body.skip || 0,
      take: body.take || 50,
      facing: !!body.facing,
    });
  }

  settings(): Observable<DpSettings> {
    return this.post<DpSettings>('DpGetSettings', {});
  }

  saveRole(payload: any): Observable<any> {
    return this.post('DpSaveUserRole', { payload: JSON.stringify(payload) });
  }

  private dpUrl(method: string): string {
    var base = environment.url || '';
    if (base.indexOf('WebService.asmx') >= 0) {
      base = base.replace('WebService.asmx', 'DoctorPermissions.asmx');
    }
    return base + method;
  }

  private post<T>(method: string, body: any): Observable<T> {
    return this.http.post(this.dpUrl(method), body, { withCredentials: true }).pipe(
      map((res: any) => {
        var body = res && res.d !== undefined ? res.d : res;
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        if (body && typeof body.d === 'string') {
          body = JSON.parse(body.d);
        }
        if (!body || body.ok === false) {
          throw new Error((body && body.error) || 'אירעה שגיאה');
        }
        if (body.ok === true) {
          return body.data as T;
        }
        return body as T;
      })
    );
  }
}
