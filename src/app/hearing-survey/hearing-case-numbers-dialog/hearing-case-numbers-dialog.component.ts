import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface HearingCaseNumbersDialogData {
  type: string;
  caseNumbers: string[];
}

@Component({
  selector: 'app-hearing-case-numbers-dialog',
  templateUrl: './hearing-case-numbers-dialog.component.html',
  styleUrls: ['./hearing-case-numbers-dialog.component.css']
})
export class HearingCaseNumbersDialogComponent implements OnInit, OnDestroy {
  searchInput = '';
  filtered: string[] = [];
  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<HearingCaseNumbersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HearingCaseNumbersDialogData
  ) {
    this.filtered = [...(data.caseNumbers || [])];
  }

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.applyFilter(term);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.search$.next((value || '').trim());
  }

  private applyFilter(term: string): void {
    const list = this.data.caseNumbers || [];
    if (!term) {
      this.filtered = [...list];
      return;
    }
    const t = term.toLowerCase();
    this.filtered = list.filter(id => id.toLowerCase().includes(t));
  }

  close(): void {
    this.dialogRef.close();
  }
}
