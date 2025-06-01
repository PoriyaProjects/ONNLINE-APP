import { Component } from '@angular/core';

@Component({
  selector: 'app-alert-threshold',
  templateUrl: './alert-threshold.component.html',
  styleUrls: ['./alert-threshold.component.scss']
})
export class AlertThresholdComponent {
  thresholdValue: number = 10;

  saveThreshold() {
    console.log(`Saved threshold: ${this.thresholdValue}`);
  }
}