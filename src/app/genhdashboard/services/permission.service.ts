import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  hasFinancialAccess(): boolean {
    const role = localStorage.getItem('FunctionDescription');
    return role?.includes('Finance') || false;
  }
}
