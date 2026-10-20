import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  InvasiveKpis,
  emptyKpis,
  scoreLevel
} from '../invasive-procedures.models';
import { InvasiveProceduresService } from '../invasive-procedures.service';

@Component({
  selector: 'app-invasive-procedures-dashboard',
  templateUrl: './invasive-procedures-dashboard.component.html',
  styleUrls: ['./invasive-procedures-dashboard.component.scss']
})
export class InvasiveProceduresDashboardComponent implements OnInit, OnDestroy {
  dateFromModel: Date | null = null;
  dateToModel: Date | null = null;
  kpis: InvasiveKpis = emptyKpis();
  loading = false;
  errorMessage: string | null = null;
  lastUpdated = '';
  hasLoadedOnce = false;
  searchText = '';
  activeView: 'departments' | 'cases' = 'departments';

  private subs: Subscription[] = [];

  constructor(private api: InvasiveProceduresService, private router: Router) {}

  ngOnInit(): void {
    this.searchText = this.api.search$.value;
    this.syncActiveView(this.router.url);
    this.subs.push(
      this.api.kpis$.subscribe(kpis => this.kpis = kpis),
      this.api.loading$.subscribe(loading => this.loading = loading),
      this.api.error$.subscribe(err => this.errorMessage = err),
      this.api.lastUpdated$.subscribe(value => this.lastUpdated = value),
      this.router.events.subscribe(e => {
        if (e instanceof NavigationEnd) {
          this.syncActiveView(e.urlAfterRedirects || e.url);
        }
      })
    );
    this.applyDefaultDateRange();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadData(): void {
    if (!this.dateFromModel || !this.dateToModel) {
      this.errorMessage = 'נא לבחור טווח תאריכים';
      return;
    }
    if (this.dateFromModel.getTime() > this.dateToModel.getTime()) {
      this.errorMessage = 'תאריך ההתחלה לא יכול להיות מאוחר מתאריך הסיום';
      return;
    }
    this.errorMessage = null;
    this.api.markLoadRequested();
    this.hasLoadedOnce = true;
    this.api.applyDates(this.dateFromModel, this.dateToModel);
    this.subs.push(
      this.api.loadSummary(true).subscribe(
        () => this.subs.push(this.api.loadCases(true).subscribe()),
        () => { /* error$ already set by the service */ }
      )
    );
  }

  private applyDefaultDateRange(): void {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to.getFullYear(), to.getMonth() - 1, to.getDate());
    this.dateFromModel = from;
    this.dateToModel = to;
  }

  shiftDatesOneMonth(direction: number): void {
    if (!this.dateFromModel || !this.dateToModel) {
      return;
    }
    this.dateFromModel = this.addMonths(this.dateFromModel, direction);
    this.dateToModel = this.addMonths(this.dateToModel, direction);
  }

  onSearchChange(value: string): void {
    this.searchText = value || '';
    this.api.search$.next(this.searchText);
  }

  scoreClass(score: number): string {
    return 'ipd-kpi--' + scoreLevel(score);
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date.getTime());
    const day = next.getDate();
    next.setMonth(next.getMonth() + months);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    if (day > lastDay) {
      next.setDate(lastDay);
    }
    return next;
  }

  private syncActiveView(url: string): void {
    this.activeView = url.indexOf('/invasive-procedures/cases') >= 0 ? 'cases' : 'departments';
  }
}
