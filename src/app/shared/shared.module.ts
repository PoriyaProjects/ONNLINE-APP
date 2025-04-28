import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartComponent } from './components/google-chart/google-chart.component';

@NgModule({
  declarations: [GoogleChartComponent],
  imports: [CommonModule],
  exports: [GoogleChartComponent]  // <-- Make it usable outside
})
export class SharedModule {}
