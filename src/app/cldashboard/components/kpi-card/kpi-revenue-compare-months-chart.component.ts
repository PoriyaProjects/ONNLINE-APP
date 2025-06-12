import {
    Component,
    Input,
    ElementRef,
    ViewChild,
    OnChanges,
    SimpleChanges,
    AfterViewInit
} from '@angular/core';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { BaseRevenueChartComponent } from '../../components/base-revenue-chart.component';
import { getChartOptions } from '../../utils/chart-options.util';

declare var google: any;



@Component({
    selector: 'app-revenue-compare-months-chart',
    templateUrl: './kpi-revenue-compare-months-chart.component.html',
    styleUrls: []
})
export class RevenueCompareMonthsChartComponent extends BaseRevenueChartComponent implements AfterViewInit, OnChanges {

    @ViewChild('chart') chartContainer!: ElementRef;

    constructor(private chartService: ChartLoaderService) {
        super();
        this.chartType = 'bar';
    }

    @Input() chartTitle = 'הכנסות';
    @Input() showAnnotations = true;
    @Input() shortFormat = true;
    @Input() isDarkMode = false;
    @Input() isRtl = false;
    @Input() locale = 'he';
    @Input() currency = '₪';
    @Input() isStacked = false;
    @Input() showLegend = true;
    @Input() showTrendline = true;
    @Input() usePercent = false;
    @Input() showHtmlTooltip = true;

    
    ngAfterViewInit(): void {
       // console.log('[CompareMonthsChart ngAfterViewInit] Force initial draw');
        this.chartService.onReady(() => this.draw());
    }

    ngOnChanges(changes: SimpleChanges): void {
        const redrawKeys = ['rawChartData', 'isLoading', 'selectedDeptGroupId'];
        const triggered = redrawKeys.filter(key => key in changes);
        if (triggered.length > 0) {
           // console.log('[CompareMonthsChart ngOnChanges] REDRAW triggered by:', triggered);
            this.draw();
        }
    }

    onControlChange(): void {
        this.draw();
    }

    protected draw(): void {
        if (!this.rawChartData?.length || !this.chartContainer?.nativeElement) return;

       // console.log('[CompareMonthsChart draw] rawChartData:', this.rawChartData);

        const chartData = this.prepareCompareChartData();
       // console.log('[CompareMonthsChart draw] chartData:', chartData);

        const dataTable = google.visualization.arrayToDataTable(chartData);



        const vAxisFormat = this.shortFormat ? 'short' : undefined;

const options = getChartOptions({
    title: this.chartTitle,
    chartType: this.chartType,
    showLegend: this.showLegend,
    isDarkMode: this.isDarkMode,
    isStacked: this.isStacked ?? false,
    isRtl: this.isRtl,
    locale: this.locale,
    height: 400,
    showAnnotations: this.showAnnotations,
 
});
        const chart = new google.visualization.BarChart(this.chartContainer.nativeElement);
        chart.draw(dataTable, options);
    }



   
    
    protected prepareCompareChartData(): any[] {
        const chartData: any[] = [['תקופה', 'הכנסה', { role: 'annotation' }]];
    
        // Dates
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();
    
        const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
        const prevYearDate = new Date(currentYear - 1, currentMonth - 1, 1);
    
        const extractMonthYear = (label: string): { month: number, year: number } => {
            const parts = label.split(',');
            if (parts.length < 2) return { month: 0, year: 0 };
    
            const monthStr = parts[0].trim().split(' ')[0];
            const yearStr = parts[1].trim();
    
            const monthMap: { [key: string]: number } = {
                'ינו': 1, 'פבר': 2, 'מרץ': 3, 'אפר': 4, 'מאי': 5, 'יונ': 6,
                'יול': 7, 'אוג': 8, 'ספט': 9, 'אוק': 10, 'נוב': 11, 'דצמ': 12
            };
    
            const month = monthMap[monthStr] || 0;
            const year = parseInt(yearStr);
    
            return { month, year };
        };
    
        const findValue = (targetMonth: number, targetYear: number): number => {
            const match = this.rawChartData.find(row => {
                const { month, year } = extractMonthYear(row.label);
                return month === targetMonth && year === targetYear &&
                    (this.selectedDeptGroupId === 0 || row.deptGroupId === this.selectedDeptGroupId);
            });
            return match ? match.value : 0;
        };
    
        const formatAnnotation = (value: number): string => {
            if (this.shortFormat) {
                if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
                if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
                if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
            }
            return value.toFixed(0);
        };
    
        const valueCurrent = findValue(currentMonth, currentYear);
        const valuePrevMonth = findValue(prevMonthDate.getMonth() + 1, prevMonthDate.getFullYear());
        const valuePrevYear = findValue(currentMonth, currentYear - 1);
    
       // console.log('🟢 CompareMonths → Dates:');
       // console.log('Current:', currentMonth, currentYear, '→ Value:', valueCurrent);
       // console.log('Previous Month:', prevMonthDate.getMonth() + 1, prevMonthDate.getFullYear(), '→ Value:', valuePrevMonth);
       // console.log('Previous Year:', currentMonth, currentYear - 1, '→ Value:', valuePrevYear);
    
        chartData.push(['חודש נוכחי', valueCurrent, formatAnnotation(valueCurrent)]);
        chartData.push(['חודש קודם', valuePrevMonth, formatAnnotation(valuePrevMonth)]);
        chartData.push(['חודש זה שנה קודמת', valuePrevYear, formatAnnotation(valuePrevYear)]);
    
       // console.log('[CompareMonthsChartData] FINAL:', chartData);
        return chartData;
    }
    
    
    private extractMonthYear(label: string): { month: number, year: number } {
        // Example: "ינו 01, 2024 - ינו 31, 2024"
        const parts = label.split(',');
        if (parts.length < 2) return { month: 0, year: 0 };
    
        const monthStr = parts[0].trim().split(' ')[0];
        const yearStr = parts[1].trim();
    
        const monthMap: { [key: string]: number } = {
            'ינו': 1, 'פבר': 2, 'מרץ': 3, 'אפר': 4, 'מאי': 5, 'יונ': 6,
            'יול': 7, 'אוג': 8, 'ספט': 9, 'אוק': 10, 'נוב': 11, 'דצמ': 12
        };
    
        const month = monthMap[monthStr] || 0;
        const year = parseInt(yearStr);
    
        return { month, year };
    }
    
    private findValue(targetMonth: number, targetYear: number): number {
        const match = this.rawChartData.find(row => {
            const { month, year } = this.extractMonthYear(row.label);
            return month === targetMonth && year === targetYear &&
                   (this.selectedDeptGroupId === 0 || row.deptGroupId === this.selectedDeptGroupId);
        });
        return match ? match.value : 0;
    }
    
    private getPreviousMonthName(currentMonth: string): string {
        const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
        const index = months.indexOf(currentMonth);
        if (index === -1) return currentMonth;
        const prevIndex = (index - 1 + months.length) % months.length;
        return months[prevIndex];
    }
}
