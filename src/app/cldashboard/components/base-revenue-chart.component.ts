import {
Directive,
  Input,
  OnChanges,
  SimpleChanges,
  AfterViewInit
} from '@angular/core';
import { SupportedChartType } from '../utils/chart-options.util';


@Directive()

export abstract class BaseRevenueChartComponent implements OnChanges {
    @Input() rawChartData: { label: string; value: number; deptGroupId?: number; deptGroupName?: string }[] = [];
    @Input() selectedDeptGroupId: number = 0;
    @Input() isLoading: boolean = false;
    @Input() granularity: string = 'month';
    @Input() chartType: 'column' | 'line' | 'bar' | 'pie' = 'column';
    @Input() shortFormat: boolean = true; 

    @Input() chartTitle = '';

granularityOptions = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quartal', label: 'Quartal' },
  { value: 'year', label: 'Year' }
];

onControlChange(): void {
  this.draw();
}


    ngOnChanges(changes: SimpleChanges): void {
        const redrawKeys = [
            'rawChartData',
            'isLoading',
            'selectedDeptGroupId',
            'granularity',
            'shortFormat' 
        ];
        const keysTriggered = Object.keys(changes).filter(k => redrawKeys.includes(k));

        if (keysTriggered.length) {
           // console.log('[Chart ngOnChanges] REDRAW triggered by:', keysTriggered);
            this.draw();
        }
    }

    protected abstract draw(): void;


protected prepareChartData(): any[] {
   // console.log('[prepareChartData] chartType:', this.chartType);
   // console.log('[prepareChartData] selectedDeptGroupId:', this.selectedDeptGroupId);
   // console.log('[prepareChartData] shortFormat:', this.shortFormat);
   // console.log('[prepareChartData] rawChartData:', this.rawChartData);

    let chartData: any[] = [];

    const formatAnnotation = (value: number): string => {
        if (this.shortFormat) {
            // Example: format as K, M, B
            if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
            if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
            if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
        }
        return value.toFixed(0);
    };

    if (this.chartType === 'pie') {
        const uniqueDeptIds = new Set(this.rawChartData.map(row => row.deptGroupId));

        if (uniqueDeptIds.size > 1) {
           // console.log('[prepareChartData] Pie → MULTI DEPT → group by DeptGroupName');
            chartData = [['Department', 'Revenue', { role: 'annotation' }]];

            const deptSums = new Map<string, number>();

            for (const row of this.rawChartData) {
                const deptName = (row.deptGroupName || 'Unknown').trim();
                const current = deptSums.get(deptName) || 0;
                deptSums.set(deptName, current + row.value);
            }

            deptSums.forEach((value, deptName) => {
                chartData.push([deptName, value, formatAnnotation(value)]);
            });

        } else {
           // console.log('[prepareChartData] Pie → SINGLE DEPT → group by Month');
            chartData = [['Month', 'Revenue', { role: 'annotation' }]];

            const monthSums = new Map<number, number>();

            for (const row of this.rawChartData) {
                const monthDate = this.extractMonthDate(row.label);
                const timestamp = monthDate.getTime();
                const current = monthSums.get(timestamp) || 0;
                monthSums.set(timestamp, current + row.value);
            }

            const sortedMonths = Array.from(monthSums.entries()).sort((a, b) => a[0] - b[0]);

            sortedMonths.forEach(([timestamp, value]) => {
                const label = this.formatMonthLabel(new Date(timestamp));
                chartData.push([label, value, formatAnnotation(value)]);
            });
        }

       // console.log('[prepareChartData] Final PIE chartData:', chartData);
        return chartData;
    }

    // --- COLUMN / LINE / BAR ---
    chartData = [['Month', 'Revenue', { role: 'annotation' }]];

    const monthSums = new Map<number, number>();

    for (const row of this.rawChartData) {
        const monthDate = this.extractMonthDate(row.label);
        const timestamp = monthDate.getTime();
        const current = monthSums.get(timestamp) || 0;
        monthSums.set(timestamp, current + row.value);
    }

    const sortedMonths = Array.from(monthSums.entries()).sort((a, b) => a[0] - b[0]);

    sortedMonths.forEach(([timestamp, value]) => {
        const label = this.formatMonthLabel(new Date(timestamp));
        chartData.push([label, value, formatAnnotation(value)]);
    });

   // console.log('[prepareChartData] Final chartData:', chartData);
    return chartData;
}




protected formatValueForAnnotation(value: number): string {
    if (this.shortFormat) {
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
}

// eof//

    protected extractMonthDate(fullLabel: string): Date {
        const firstDateStr = fullLabel.split('-')[0].trim();
        const parts = firstDateStr.split(' ');

        let month = 0;
        let year = 0;

        if (parts.length === 3) {
            const monthName = parts[0];
            const yearStr = parts[2];

            year = parseInt(yearStr, 10);

            const monthMap: { [key: string]: number } = {
                'ינו': 0, 'פבר': 1, 'מרץ': 2, 'אפר': 3, 'מאי': 4, 'יונ': 5,
                'יול': 6, 'אוג': 7, 'ספט': 8, 'אוק': 9, 'נוב': 10, 'דצמ': 11
            };

            month = monthMap[monthName] ?? 0;
        }

        return new Date(year, month, 1);
    }

    protected formatMonthLabel(date: Date): string {
        if (this.shortFormat) {
            // ✅ SHORT format: e.g. "01/2024"
            return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } else {
            // ✅ LONG format: "2024-01"
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
    }
    
}
