import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  InvasiveDepartmentRow,
  scoreLevel
} from '../invasive-procedures.models';
import { InvasiveProceduresService } from '../invasive-procedures.service';

@Component({
  selector: 'app-invasive-procedures-departments',
  templateUrl: './invasive-procedures-departments.component.html',
  styleUrls: [
    '../invasive-procedures-shared.scss',
    './invasive-procedures-departments.component.scss'
  ]
})
export class InvasiveProceduresDepartmentsComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  readonly displayedColumns = [
    'Name',
    'Unit',
    'Total_Cases',
    'Avg_SignIn_Score',
    'SignIn_Doctor_Percentage',
    'SignIn_Nurse_Percentage',
    'SignIn_Anesthetist_Percentage',
    'Avg_TimeOut_Score',
    'TimeOut_Doctor_Percentage',
    'TimeOut_Nurse_Percentage',
    'Avg_SignOut_Score',
    'SignOut_Doctor_Percentage',
    'SignOut_Nurse_Percentage',
    'Avg_Total_Score',
    'Total_Filled',
    'Total_NotFilled',
    'Overall_Fill_Percentage'
  ];

  dataSource = new MatTableDataSource<InvasiveDepartmentRow>([]);
  hasRows = false;
  loading = false;
  hasLoadedOnce = false;

  @ViewChild(MatSort) sort: MatSort;

  private subs: Subscription[] = [];

  constructor(private api: InvasiveProceduresService, private router: Router) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => {
      const hay = (row.Name + ' ' + row.Unit).toLowerCase();
      return hay.indexOf(filter) >= 0;
    };
    this.subs.push(
      this.api.displayDepartments$.subscribe(rows => {
        this.dataSource.data = rows || [];
        this.hasRows = this.dataSource.data.length > 0;
        this.applyFilter(this.api.search$.value);
      }),
      this.api.search$.subscribe(value => this.applyFilter(value)),
      this.api.loading$.subscribe(loading => this.loading = loading),
      this.api.hasLoadedOnce$.subscribe(value => this.hasLoadedOnce = value)
    );
  }

  get isHome(): boolean {
    return this.router.url.indexOf('/invasive-procedures/departments') < 0
      && this.router.url.indexOf('/invasive-procedures/cases') < 0;
  }

  ngAfterViewInit(): void {
    this.bindSort();
  }

  ngAfterViewChecked(): void {
    this.bindSort();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  scoreClass(score: number): string {
    return 'ipd-score--' + scoreLevel(score);
  }

  barClass(score: number): string {
    return 'ipd-bar__fill--' + scoreLevel(score);
  }

  private bindSort(): void {
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (row, column) => {
        const value = (row as any)[column];
        if (typeof value === 'number') {
          return value;
        }
        return (value || '').toString().toLowerCase();
      };
    }
  }

  private applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
  }
}
