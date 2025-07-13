import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-surgery-summary',
  templateUrl: './surgery-summary.component.html'
})
export class SurgerySummaryComponent implements OnChanges {
  @Input() tableData: any[] = [];

  public surgeryCounts: { key: string; value: number }[] = [];

  ngOnChanges(): void {
    this.groupBySurgeryType();
  }

  private groupBySurgeryType(): void {
    const summary: { [key: string]: number } = {};

    this.tableData.forEach(row => {
        const type = row['תיאור'] || 'לא ידוע';
      summary[type] = (summary[type] || 0) + 1;
    });

    this.surgeryCounts = Object.entries(summary)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value); // Descending order
  }
}
