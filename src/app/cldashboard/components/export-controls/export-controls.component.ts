import { Component } from '@angular/core';

@Component({
  selector: 'app-export-controls',
  templateUrl: './export-controls.component.html',
  styleUrls: ['./export-controls.component.scss']
})
export class ExportControlsComponent {
  export(format: 'pdf' | 'excel') {
    console.log(`Exporting dashboard as ${format}`);
  }

  scheduleReport() {
    console.log('Opening scheduling modal...');
  }
}