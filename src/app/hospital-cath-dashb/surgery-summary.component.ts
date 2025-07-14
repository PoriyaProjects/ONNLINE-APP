import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-surgery-summary',
  templateUrl: './surgery-summary.component.html'
})
export class SurgerySummaryComponent implements OnChanges {
  @Input() tableData: any[] = [];

  summary: {
    [surgeryName: string]: { thisMonth: number; prevMonth: number; total: number }
  } = {};

  ngOnChanges(): void {
    this.buildSummary();
  }

  private buildSummary(): void {
    this.summary = {};

    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0); // last day prev month

    for (const row of this.tableData) {
      const surgery = row['תיאור'] || 'סוג לא ידוע';
      const dateStr = row['תאריך'];
      const date = this.parseDateString(dateStr);

      if (!this.summary[surgery]) {
        this.summary[surgery] = { thisMonth: 0, prevMonth: 0, total: 0 };
      }

      if (date >= startOfThisMonth) {
        this.summary[surgery].thisMonth++;
      } else if (date >= startOfPrevMonth && date <= endOfPrevMonth) {
        this.summary[surgery].prevMonth++;
      }

      this.summary[surgery].total++;
    }
  }

  private parseDateString(dateInput: any): Date {
    if (!dateInput) return new Date(NaN);
  
    // If already a Date object
    if (dateInput instanceof Date) {
      return dateInput;
    }
  
    // If input is an object with { v: '...' } structure (Google Charts cell)
    if (typeof dateInput === 'object' && 'v' in dateInput) {
      dateInput = dateInput.v;
    }
  
    // If it's a string formatted as 'dd-mm-yyyy'
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const [day, month, year] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  
    // Fallback: try native conversion
    return new Date(dateInput);
  }
  
  compareTotals = (a: any, b: any): number => b.value.total - a.value.total;
}
