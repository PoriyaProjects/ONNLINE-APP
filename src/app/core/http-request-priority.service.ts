import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

type BillingWaiter = () => void;

/**
 * Coordinates HTTP priority so expensive billing-pipeline lookups run only when
 * the app is idle, and department-plan email sends preempt them.
 */
@Injectable({ providedIn: 'root' })
export class HttpRequestPriorityService {
  private normalActive = 0;
  private criticalActive = 0;
  private billingBlocked = false;
  private billingWaiters: BillingWaiter[] = [];

  enterNormal(): void {
    this.normalActive++;
  }

  leaveNormal(): void {
    this.normalActive = Math.max(0, this.normalActive - 1);
    this.tryDrainBillingWaiters();
  }

  enterCritical(): void {
    this.criticalActive++;
    this.billingBlocked = true;
  }

  leaveCritical(): void {
    this.criticalActive = Math.max(0, this.criticalActive - 1);
    if (this.criticalActive === 0) {
      this.billingBlocked = false;
    }
    this.tryDrainBillingWaiters();
  }

  waitForBillingSlot(): Observable<void> {
    return new Observable<void>((subscriber: Subscriber<void>) => {
      const tryAcquire = () => {
        if (subscriber.closed) {
          return;
        }

        if (this.canRunBilling()) {
          subscriber.next();
          subscriber.complete();
          return;
        }

        this.billingWaiters.push(tryAcquire);
      };

      tryAcquire();

      return () => this.removeBillingWaiter(tryAcquire);
    });
  }

  private canRunBilling(): boolean {
    return !this.billingBlocked && this.normalActive === 0 && this.criticalActive === 0;
  }

  private tryDrainBillingWaiters(): void {
    if (!this.canRunBilling() || this.billingWaiters.length === 0) {
      return;
    }

    const waiters = this.billingWaiters.slice();
    this.billingWaiters = [];
    waiters.forEach((waiter) => waiter());
  }

  private removeBillingWaiter(waiter: BillingWaiter): void {
    const index = this.billingWaiters.indexOf(waiter);
    if (index >= 0) {
      this.billingWaiters.splice(index, 1);
    }
  }
}
