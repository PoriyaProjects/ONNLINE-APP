import { Pipe, PipeTransform } from '@angular/core';
import { BirthSummaryRow } from './newborn-dashboard-data.service';

@Pipe({ name: 'birthsForCity', pure: true })
export class BirthsForCityPipe implements PipeTransform {
  transform(rows: BirthSummaryRow[] | null, cityName: string): BirthSummaryRow[] {
    if (!rows || !cityName) return [];
    const trimmed = cityName.trim();
    return rows.filter((r) => (r.Yishuv || '').trim() === trimmed);
  }
}
