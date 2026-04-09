import { Component, Input } from '@angular/core';
import { NpsRequestStep } from '../models/nps.models';

@Component({
  selector: 'app-nps-approval-timeline',
  templateUrl: './approval-timeline.component.html',
  styleUrls: ['./approval-timeline.component.scss'],
})
export class NpsApprovalTimelineComponent {
  @Input() steps: NpsRequestStep[];
}
