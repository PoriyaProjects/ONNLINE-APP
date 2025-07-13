
import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-doctor-summary',
  templateUrl: './doctor-summary.component.html'
})

export class DoctorSummaryComponent implements OnChanges {
    @Input() tableData: any[] = [];
  
    doctorTotals: { [doctorName: string]: number } = {};
    sortedDoctorTotals: { key: string, value: number }[] = [];
  
    ngOnChanges(): void {
      this.groupByDoctor();
    }
  
    private groupByDoctor(): void {
      this.doctorTotals = {};
  
      this.tableData.forEach(row => {
        const doctor = row['שם רופא'] || 'לא ידוע';
        this.doctorTotals[doctor] = (this.doctorTotals[doctor] || 0) + 1;
      });
  
      // 🔽 Convert to sorted array
      this.sortedDoctorTotals = Object.entries(this.doctorTotals)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value); // Descending sort
    }
  }
  