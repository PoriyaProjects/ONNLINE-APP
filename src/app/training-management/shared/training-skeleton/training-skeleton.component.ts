import { Component, Input } from '@angular/core';

export type TrainingSkeletonVariant = 'cards' | 'kpi' | 'table' | 'form';

@Component({
  selector: 'app-training-skeleton',
  templateUrl: './training-skeleton.component.html',
  styleUrls: ['./training-skeleton.component.scss'],
})
export class TrainingSkeletonComponent {
  @Input() variant: TrainingSkeletonVariant = 'cards';
  @Input() count = 3;
  @Input() label = 'טוען…';

  get items(): number[] {
    const n = this.count > 0 ? this.count : 1;
    return Array.from({ length: n }, (_, i) => i);
  }
}
