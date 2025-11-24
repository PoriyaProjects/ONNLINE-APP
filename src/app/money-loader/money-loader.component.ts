import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-money-loader',
  templateUrl: './money-loader.component.html',
  styleUrls: ['./money-loader.component.css']
})
export class MoneyLoaderComponent {
  @Input() isLoading: boolean = true;
  @Input() message: string = 'טוען נתונים...';
}