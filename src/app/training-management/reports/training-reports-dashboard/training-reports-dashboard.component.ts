import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart } from 'chart.js';
import {
  TrainingDashboardChartSeries,
  TrainingDashboardStatistics,
  TrainingReportFilter,
} from '../../models';
import { TrainingManagementApiService } from '../../services/training-management-api.service';
import { httpFailureMessage, trainingErrorMessage } from '../../utils/training-error-message.util';

@Component({
  selector: 'app-training-reports-dashboard',
  templateUrl: './training-reports-dashboard.component.html',
  styleUrls: ['./training-reports-dashboard.component.scss'],
})
export class TrainingReportsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  loading = false;
  errorMessage: string | null = null;
  stats: TrainingDashboardStatistics | null = null;
  charts: TrainingDashboardChartSeries[] = [];
  chartsUnavailable = false;
  filter: TrainingReportFilter | null = null;
  private destroy$ = new Subject<void>();
  private chartInstances: Chart[] = [];
  @ViewChild('chartHost', { static: false }) chartHost: ElementRef<HTMLDivElement>;

  constructor(private api: TrainingManagementApiService, private router: Router) {}

  ngOnInit(): void {
    const year = new Date().getFullYear();
    this.filter = { FromDate: `${year}-01-01`, ToDate: `${year}-12-31`, Skip: 0, Take: 50 };
    this.load();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterApply(f: TrainingReportFilter): void {
    this.filter = f;
    this.load();
  }

  onFilterClear(): void {
    const year = new Date().getFullYear();
    this.filter = { FromDate: `${year}-01-01`, ToDate: `${year}-12-31`, Skip: 0, Take: 50 };
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.stats = null;
    this.charts = [];
    this.chartsUnavailable = false;
    this.destroyCharts();
    const f = this.filter || {};
    let pending = 2;
    let hadError = false;

    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading = false;
        if (hadError && !this.stats) {
          this.errorMessage = this.errorMessage || 'נתוני לוח הבקרה אינם זמינים כרגע.';
        }
        setTimeout(() => this.renderCharts(), 0);
      }
    };

    this.api
      .getTrainingDashboardStatistics({
        FromDate: f.FromDate,
        ToDate: f.ToDate,
        CourseId: f.CourseId,
        CourseType: f.CourseType,
        DepartmentCode: f.DepartmentCode,
        SessionStatus: f.SessionStatus,
        MandatoryOnly: f.MandatoryOnly,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success || !result.Data) {
            hadError = true;
            this.errorMessage = trainingErrorMessage(result, 'נתוני לוח הבקרה אינם זמינים כרגע.');
          } else {
            this.stats = result.Data;
          }
          done();
        },
        () => {
          hadError = true;
          this.errorMessage = httpFailureMessage();
          done();
        }
      );

    this.api
      .getTrainingDashboardCharts({
        FromDate: f.FromDate,
        ToDate: f.ToDate,
        CourseId: f.CourseId,
        CourseType: f.CourseType,
        DepartmentCode: f.DepartmentCode,
        SessionStatus: f.SessionStatus,
        MandatoryOnly: f.MandatoryOnly,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          if (!result || !result.Success || !result.Data) {
            this.chartsUnavailable = true;
            this.charts = [];
          } else {
            this.charts = result.Data.Series || [];
            this.chartsUnavailable = this.charts.length === 0;
          }
          done();
        },
        () => {
          this.chartsUnavailable = true;
          this.charts = [];
          done();
        }
      );
  }

  goOps(): void {
    this.router.navigateByUrl('/training-management/admin/notification-errors');
  }

  private destroyCharts(): void {
    this.chartInstances.forEach((c) => {
      try {
        c.destroy();
      } catch (_e) {
        /* ignore */
      }
    });
    this.chartInstances = [];
  }

  private renderCharts(): void {
    this.destroyCharts();
    if (!this.chartHost || !this.charts.length) {
      return;
    }
    const host = this.chartHost.nativeElement;
    host.innerHTML = '';
    this.charts.forEach((series) => {
      const wrap = document.createElement('div');
      wrap.className = 'chart-card';
      const title = document.createElement('h4');
      title.textContent = series.Title || series.ChartKey;
      wrap.appendChild(title);
      if (series.TextSummary) {
        const sum = document.createElement('p');
        sum.className = 'chart-summary';
        sum.textContent = series.TextSummary;
        wrap.appendChild(sum);
      }
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', series.Title || series.ChartKey);
      wrap.appendChild(canvas);
      host.appendChild(wrap);
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: series.Labels || [],
          datasets: [
            {
              label: series.Title,
              data: series.Values || [],
              backgroundColor: 'rgba(21, 101, 192, 0.55)',
              borderColor: '#1565c0',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          legend: { display: false },
          tooltips: { enabled: true },
          scales: {
            yAxes: [{ ticks: { beginAtZero: true } }],
          },
        },
      });
      this.chartInstances.push(chart);
    });
  }
}
