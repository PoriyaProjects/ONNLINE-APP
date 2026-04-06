import { Component, Input } from '@angular/core';
import { NpsEmployeeDetail } from '../models/nps.models';

@Component({
  selector: 'app-nps-employee-header-card',
  templateUrl: './employee-header-card.component.html',
})
export class NpsEmployeeHeaderCardComponent {
  @Input() employee: NpsEmployeeDetail;
}
