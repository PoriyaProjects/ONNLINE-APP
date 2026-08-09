import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { HttpRequestPriorityService } from './http-request-priority.service';

@Injectable()
export class HttpRequestPriorityInterceptor implements HttpInterceptor {
  constructor(private readonly priority: HttpRequestPriorityService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isCriticalDepartmentSend(request.url)) {
      return this.runCritical(request, next);
    }

    if (this.isLowPriorityBilling(request.url)) {
      return this.runLowPriorityBilling(request, next);
    }

    return this.runNormal(request, next);
  }

  private runCritical(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.priority.enterCritical();
    return next.handle(request).pipe(
      finalize(() => this.priority.leaveCritical())
    );
  }

  private runNormal(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.priority.enterNormal();
    return next.handle(request).pipe(
      finalize(() => this.priority.leaveNormal())
    );
  }

  private runLowPriorityBilling(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return this.priority.waitForBillingSlot().pipe(
      switchMap(() => next.handle(request))
    );
  }

  private isLowPriorityBilling(url: string): boolean {
    return url.includes('BillingPipelineResolveServiceCode')
      || url.includes('/billing-pipeline/api/text-to-icd9')
      || url.includes('/billing-pipeline/api/icd9-to-drg');
  }

  private isCriticalDepartmentSend(url: string): boolean {
    return url.includes('SendDepartmentPlanReturnToDepartment')
      || url.includes('SentDepartmentFinalSurgeryPlan');
  }
}
