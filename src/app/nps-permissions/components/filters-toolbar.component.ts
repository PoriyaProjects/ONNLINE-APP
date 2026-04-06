import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NpsDepartment } from '../models/nps.models';

@Component({
  selector: 'app-nps-filters-toolbar',
  templateUrl: './filters-toolbar.component.html',
  styleUrls: ['./filters-toolbar.component.scss'],
})
export class NpsFiltersToolbarComponent {
  @Input() departments: NpsDepartment[] = [];
  @Output() filterChange = new EventEmitter<{ q: string; DepartnentCode: string }>();

  searchText = '';
  DepartnentCode = '';

  emit(): void {
    this.filterChange.emit({ q: this.searchText.trim(), DepartnentCode: this.DepartnentCode });
  }
}
