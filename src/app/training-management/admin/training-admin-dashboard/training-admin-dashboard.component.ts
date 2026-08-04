import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingDashboardStatistics } from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

@Component({
  selector: 'app-training-admin-dashboard',
  templateUrl: './training-admin-dashboard.component.html',
  styleUrls: ['./training-admin-dashboard.component.scss'],
})
export class TrainingAdminDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage: string | null = null;
  stats: TrainingDashboardStatistics | null = null;
  private destroy$ = new Subject<void>();

  constructor(private api: TrainingManagementApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.api
      .getTrainingDashboardStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.loading = false;
          if (!result || !result.Success || !result.Data) {
            this.stats = null;
            this.errorMessage = trainingErrorMessage(result, 'סיכום הניהול אינו זמין כרגע.');
            return;
          }
          this.stats = result.Data;
        },
        () => {
          this.loading = false;
          this.stats = null;
          this.errorMessage = httpFailureMessage();
        }
      );
  }

  go(path: string): void {
    this.router.navigateByUrl('/training-management/' + path);
  }
}
