import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-in-development',
  templateUrl: './chart-in-development.component.html',
  styleUrls: ['./chart-in-development.component.css'],
})
export class ChartInDevelopmentComponent {
  @Input() title = 'גרף בפיתוח';
  @Input() hint = 'התצוגה תחובר למקור נתונים בקרוב';
  @Input() tall = false;
  @Input() compact = false;
}
