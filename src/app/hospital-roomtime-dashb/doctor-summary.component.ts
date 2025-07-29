import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-doctor-summary',
  templateUrl: './doctor-summary.component.html'
})
export class DoctorSummaryComponent implements OnChanges {
  @Input() tableData: any[] = [];

  doctorStats: {
    name: string;
    total: number;
    thisMonth: number;
    lastMonth: number;
  }[] = [];

  ngOnChanges(): void {
    this.calculateDoctorStats();
  }

  private calculateDoctorStats(): void {
    if (!this.tableData?.length) {
      this.doctorStats = [];
      return;
    }

    const statsMap: { [doctor: string]: { total: number; thisMonth: number; lastMonth: number } } = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastYear = lastMonthDate.getFullYear();

    for (const row of this.tableData) {
      const doctor = row['שם רופא'] || 'לא ידוע';
      const dateStr = row['תאריך'] || row['SF_DATE'];
      const date = this.parseDate(dateStr);

      if (!date || isNaN(date.getTime())) continue;

      if (!statsMap[doctor]) {
        statsMap[doctor] = { total: 0, thisMonth: 0, lastMonth: 0 };
      }

      statsMap[doctor].total++;

      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        statsMap[doctor].thisMonth++;
      } else if (date.getFullYear() === lastYear && date.getMonth() === lastMonth) {
        statsMap[doctor].lastMonth++;
      }
    }

    this.doctorStats = Object.entries(statsMap)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.total - a.total);
  }

  private parseDate(value: any): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const [day, month, year] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(NaN);
  }
}
