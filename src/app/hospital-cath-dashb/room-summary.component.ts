import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-room-summary',
  templateUrl: './room-summary.component.html'
})
export class RoomSummaryComponent implements OnChanges {
  @Input() tableData: any[] = [];
  roomSummary: { key: string, value: number }[] = [];

  ngOnChanges(): void {
    const counts: { [key: string]: number } = {};

    this.tableData.forEach(row => {
      const room = row['מספר חדר'] || 'לא ידוע';
      counts[room] = (counts[room] || 0) + 1;
    });

    this.roomSummary = Object.entries(counts)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }
}
