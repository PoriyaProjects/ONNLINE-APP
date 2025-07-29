import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-room-summary',
  templateUrl: './room-summary.component.html'
})
export class RoomSummaryComponent implements OnChanges {
  @Input() tableData: any[] = [];

  summary: {
    [room: string]: { thisMonth: number; prevMonth: number; total: number }
  } = {};

  ngOnChanges(): void {
    this.buildSummary();
  }

  private buildSummary(): void {
    this.summary = {};

    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    for (const row of this.tableData) {
      const room = row['מספר חדר'] || 'חדר לא ידוע';
      const dateStr = row['תאריך'];
      const date = this.parseDateString(dateStr);

      if (!this.summary[room]) {
        this.summary[room] = { thisMonth: 0, prevMonth: 0, total: 0 };
      }

      if (date >= startOfThisMonth) {
        this.summary[room].thisMonth++;
      } else if (date >= startOfPrevMonth && date <= endOfPrevMonth) {
        this.summary[room].prevMonth++;
      }

      this.summary[room].total++;
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
