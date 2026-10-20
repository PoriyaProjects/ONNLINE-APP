import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subscription } from 'rxjs';
import {
  InvasiveCaseRow,
  isSignatureSigned,
  scoreLevel,
  signatureDisplayText
} from '../invasive-procedures.models';
import { InvasiveProceduresService } from '../invasive-procedures.service';

@Component({
  selector: 'app-invasive-procedures-cases',
  templateUrl: './invasive-procedures-cases.component.html',
  styleUrls: [
    '../invasive-procedures-shared.scss',
    './invasive-procedures-cases.component.scss'
  ]
})
export class InvasiveProceduresCasesComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  readonly groupHeaders = [
    'Department',
    'Admission_No',
    'Medical_Record',
    'signInGroup',
    'timeOutGroup',
    'signOutGroup',
    'overallGroup',
    'sigGroup'
  ];

  readonly leafHeaders = [
    'SignIn_Filled',
    'SignIn_NotFilled',
    'SignIn_Score',
    'TimeOut_Filled',
    'TimeOut_NotFilled',
    'TimeOut_Score',
    'SignOut_Filled',
    'SignOut_NotFilled',
    'SignOut_Score',
    'Total_Filled',
    'Total_NotFilled',
    'Total_Score',
    'SignIn_Doctor_Status',
    'SignIn_Nurse_Status',
    'TimeOut_Doctor_Status',
    'TimeOut_Nurse_Status',
    'SignOut_Doctor_Status',
    'SignOut_Nurse_Status'
  ];

  readonly displayedColumns = [
    'Department',
    'Admission_No',
    'Medical_Record'
  ].concat(this.leafHeaders);

  dataSource = new MatTableDataSource<InvasiveCaseRow>([]);
  hasRows = false;
  loading = false;
  hasLoadedOnce = false;

  @ViewChild(MatSort) sort: MatSort;

  private subs: Subscription[] = [];

  constructor(private api: InvasiveProceduresService) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => {
      const hay = (
        row.Department + ' ' +
        row.Admission_No + ' ' +
        row.Medical_Record
      ).toLowerCase();
      return hay.indexOf(filter) >= 0;
    };
    this.subs.push(
      this.api.cases$.subscribe(rows => {
        this.dataSource.data = rows || [];
        this.hasRows = this.dataSource.data.length > 0;
        this.applyFilter(this.api.search$.value);
      }),
      this.api.search$.subscribe(value => this.applyFilter(value)),
      this.api.loading$.subscribe(loading => this.loading = loading),
      this.api.hasLoadedOnce$.subscribe(value => this.hasLoadedOnce = value)
    );
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

  signed(value: string): boolean {
    return isSignatureSigned(value);
  }

  sigText(value: string): string {
    return signatureDisplayText(value);
  }

  hasMissingSignature(row: InvasiveCaseRow): boolean {
    return !this.signed(row.SignIn_Doctor_Status)
      || !this.signed(row.SignIn_Nurse_Status)
      || !this.signed(row.TimeOut_Doctor_Status)
      || !this.signed(row.TimeOut_Nurse_Status)
      || !this.signed(row.SignOut_Doctor_Status)
      || !this.signed(row.SignOut_Nurse_Status);
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
