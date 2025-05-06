import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-container',
  template: `
    <mat-card>
      <ng-container *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </ng-container>
      <ng-container *ngIf="error">
        <p>Error loading chart.</p>
      </ng-container>
      <ng-content *ngIf="!loading && !error"></ng-content>
    </mat-card>
  `
})
export class ChartContainerComponent {
  @Input() loading: boolean;
  @Input() error: boolean;
}
