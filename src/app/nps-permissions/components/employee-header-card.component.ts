import { Component, Input } from '@angular/core';
import { NpsEmployeeDetail } from '../models/nps.models';

@Component({
  selector: 'app-nps-employee-header-card',
  templateUrl: './employee-header-card.component.html',
  styleUrls: ['./employee-header-card.component.scss'],
})
export class NpsEmployeeHeaderCardComponent {
  @Input() employee: NpsEmployeeDetail;
}
