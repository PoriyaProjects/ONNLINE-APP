import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Subscription, forkJoin } from "rxjs";
import { SurgeriesRevenueApiService } from "./surgeries-revenue-api.service";
import {
    RevenueAggRow,
    RevenueChartViewMode,
    RevenueFilterOptionsDto,
    RevenueGroupBy,
    RevenueMainMetric,
    RevenueMonthlyRow,
    RevenueTableRow,
    SurgeriesRevenueFilterParams,
} from "./surgeries-revenue.models";

@Component({
    selector: "app-surgeries-revenue",
    templateUrl: "./surgeries-revenue.component.html",
    styleUrls: ["./surgeries-revenue.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesRevenueComponent implements OnInit, OnDestroy {
    readonly pageTitle = "הכנסות";

    mainMetric: RevenueMainMetric = "byDept";
    chartViewMode: RevenueChartViewMode = "year-grouped";

    isLoading = true;
    isChartLoading = false;
    loadError = "";

    filterOptions: RevenueFilterOptionsDto = {
        wings: [],
        billingDepartments: [],
        surgeryTypes: [],
        shifts: [],
        sites: [],
        payers: [],
    };

    readonly surgeryTypeOptions: string[] = ["אלקטיבי", "ססיה", "דחוף"];
    readonly shiftOptions: string[] = ["בוקר", "ערב", "לילה"];
    readonly weekdayOptions: string[] = ["אמצע שבוע", "סופ״ש"];

    selectedDepartments: string[] = [];
    selectedSurgeryTypes: string[] = [];
    selectedShifts: string[] = [];
    selectedSites: string[] = [];
    selectedPayers: string[] = [];
    selectedWeekdays: string[] = [];

    isDeptOpen = false;
    isSurgeryTypeOpen = false;
    isShiftOpen = false;
    isSiteOpen = false;
    isPayerOpen = false;
    isWeekdayOpen = false;

    private aggRows: RevenueAggRow[] = [];
    private monthlyRows: RevenueMonthlyRow[] = [];
    private subs = new Subscription();
    private readonly baseYear = new Date().getFullYear();

    chartType = "ColumnChart";
    chartData: any[] = [];
    chartColumns: any[] = [];
    chartOptions: any = {
        legend: {
            position: "top",
            alignment: "end",
            maxLines: 4,
            textStyle: { fontSize: 13, bold: true },
        },
        chartArea: { left: 70, top: 50, width: "82%", height: "58%" },
        hAxis: {
            title: "",
            textStyle: { fontSize: 13, bold: true },
        },
        vAxis: {
            title: "₪ (M)",
            format: "#.#",
            minValue: 0,
            textStyle: { fontSize: 13, bold: true },
        },
        annotations: {
            alwaysOutside: false,
            textStyle: { fontSize: 12, bold: true },
        },
        bar: { groupWidth: "72%" },
        isStacked: false,
        focusTarget: "category",
        tooltip: {
            isHtml: true,
            trigger: "focus",
        },
    };

    showChartFullModal = false;

    yearsForChart: number[] = [];
    yearlyRevenueTotals: { [year: number]: number } = {};

    tableRows: RevenueTableRow[] = [];
    tableYears: number[] = [];

    kpiTotalLatestYear = "—";
    kpiYoYPct = "—";
    kpiAvgPerSurgery = "—";

    showFilterSidebar = false;
    chartViewEpoch = 0;

    private readonly monthLabelsFull = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
    ];

    constructor(
        private api: SurgeriesRevenueApiService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.loadAll();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    @HostListener("document:click")
    onDocumentClick(): void {
        this.closeSidebarFilterDropdowns();
    }

    /** כרטיסי סיכום שנה: בסדר עולה — 2026 מימין (עם direction:ltr בשורה) */
    get yearsForChartSummaryOrder(): number[] {
        return [...this.yearsForChart];
    }

    get chartFullModalOptions(): any {
        return {
            ...this.chartOptions,
            legend: {
                ...(this.chartOptions?.legend || {}),
                position: "top",
                alignment: "end",
            },
            chartArea: {
                left: 80,
                top: 64,
                width: "88%",
                height: "72%",
            },
        };
    }

    getDepartmentOptions(): string[] {
        return this.filterOptions.wings.length
            ? this.filterOptions.wings
            : [];
    }

    getSurgeryTypeOptions(): string[] {
        return this.filterOptions.surgeryTypes.length
            ? this.filterOptions.surgeryTypes
            : this.surgeryTypeOptions;
    }

    getDepartmentDisplay(): string {
        if (!this.selectedDepartments.length) {
            return "מחלקה: הכל";
        }
        return `מחלקה: ${this.selectedDepartments[0]}`;
    }

    getSurgeryTypeDisplay(): string {
        if (!this.selectedSurgeryTypes.length) {
            return "קטגורית ניתוח: הכל";
        }
        if (this.selectedSurgeryTypes.length === 1) {
            return `קטגורית ניתוח: ${this.selectedSurgeryTypes[0]}`;
        }
        return `קטגורית ניתוח: ${this.selectedSurgeryTypes[0]} ועוד ${this.selectedSurgeryTypes.length - 1}`;
    }

    getShiftDisplay(): string {
        if (!this.selectedShifts.length) {
            return "משמרת: הכל";
        }
        return `משמרת: ${this.selectedShifts[0]}`;
    }

    getWeekdayDisplay(): string {
        if (!this.selectedWeekdays.length) {
            return "יום: הכל";
        }
        return `יום: ${this.selectedWeekdays[0]}`;
    }

    getPayerDisplay(): string {
        if (!this.selectedPayers.length) {
            return "גורם משלם: הכל";
        }
        return `גורם משלם: ${this.selectedPayers[0]}`;
    }

    getActiveFiltersSummary(): string {
        const parts: string[] = [];
        if (this.selectedDepartments.length) {
            parts.push(this.getDepartmentDisplay());
        }
        if (this.selectedSurgeryTypes.length) {
            parts.push(this.getSurgeryTypeDisplay());
        }
        if (this.selectedShifts.length) {
            parts.push(this.getShiftDisplay());
        }
        if (this.selectedWeekdays.length) {
            parts.push(this.getWeekdayDisplay());
        }
        if (this.selectedSites.length) {
            parts.push(`אתר: ${this.selectedSites.join(", ")}`);
        }
        if (this.selectedPayers.length) {
            parts.push(this.getPayerDisplay());
        }
        return parts.length ? parts.join(" · ") : "ללא סינון";
    }

    getYearRevenueSubtitle(year: number): string {
        const amount = this.yearlyRevenueTotals[year] || 0;
        const prev = this.yearlyRevenueTotals[year - 1];
        if (prev != null && prev > 0) {
            const pct = ((amount - prev) / prev) * 100;
            return `${this.formatPct(pct)} מול ${year - 1}`;
        }
        if (amount === 0) {
            return "ללא נתונים";
        }
        return "סה״כ הכנסות בשנה";
    }

    loadAll(forceRefresh = false): void {
        this.isLoading = true;
        this.loadError = "";
        this.cdr.markForCheck();

        const filterSub = this.api.getFilterOptions(forceRefresh).subscribe({
            next: (opts) => {
                this.filterOptions = opts;
                this.refreshData(forceRefresh);
            },
            error: () => {
                this.filterOptions = {
                    wings: [],
                    billingDepartments: [],
                    surgeryTypes: [],
                    shifts: [],
                    sites: [],
                    payers: [],
                };
                this.refreshData(forceRefresh);
            },
        });
        this.subs.add(filterSub);
    }

    refreshData(forceRefresh = false): void {
        this.isChartLoading = true;
        this.cdr.markForCheck();

        const params = this.buildFilterParams();
        const dataSub = forkJoin({
            agg: this.api.getRevenueByDeptFiveYears(params, forceRefresh),
            monthly: this.api.getRevenueByMonth(params, forceRefresh),
        }).subscribe({
            next: ({ agg, monthly }) => {
                this.aggRows = agg;
                this.monthlyRows = monthly;
                this.isLoading = false;
                this.isChartLoading = false;
                if (!agg.length && !monthly.length) {
                    this.loadError =
                        "לא התקבלו נתונים מהשרת. ודא ש-GetRevenueByDeptFiveYears_surgeries_revenue_dashborad פעיל.";
                } else {
                    this.loadError = "";
                    this.hydrateFilterOptionsFromAgg();
                }
                this.rebuildView();
                this.cdr.markForCheck();
            },
            error: () => {
                this.aggRows = [];
                this.monthlyRows = [];
                this.isLoading = false;
                this.isChartLoading = false;
                this.loadError = "שגיאה בטעינת נתוני הכנסות מהשרת.";
                this.snackBar.open(this.loadError, "סגור", { duration: 5000 });
                this.rebuildView();
                this.cdr.markForCheck();
            },
        });
        this.subs.add(dataSub);
    }

    onMainMetricChange(value: RevenueMainMetric): void {
        this.mainMetric = value;
        this.refreshData();
    }

    onChartViewModeChange(value: RevenueChartViewMode): void {
        this.chartViewMode = value;
        this.rebuildView();
        this.cdr.markForCheck();
    }

    resetFilters(): void {
        this.selectedDepartments = [];
        this.selectedSurgeryTypes = [];
        this.selectedShifts = [];
        this.selectedSites = [];
        this.selectedPayers = [];
        this.selectedWeekdays = [];
        this.closeSidebarFilterDropdowns();
        this.api.clearCache();
        this.refreshData(true);
    }

    toggleSidebarFilterDropdown(
        which:
            | "dept"
            | "surgeryType"
            | "shift"
            | "weekPart"
            | "site"
            | "payer",
        event: Event,
    ): void {
        event.stopPropagation();
        const shouldOpen =
            (which === "dept" && !this.isDeptOpen) ||
            (which === "surgeryType" && !this.isSurgeryTypeOpen) ||
            (which === "shift" && !this.isShiftOpen) ||
            (which === "weekPart" && !this.isWeekdayOpen) ||
            (which === "site" && !this.isSiteOpen) ||
            (which === "payer" && !this.isPayerOpen);

        this.closeSidebarFilterDropdowns();
        if (!shouldOpen) {
            return;
        }

        switch (which) {
            case "dept":
                this.isDeptOpen = true;
                break;
            case "surgeryType":
                this.isSurgeryTypeOpen = true;
                break;
            case "shift":
                this.isShiftOpen = true;
                break;
            case "weekPart":
                this.isWeekdayOpen = true;
                break;
            case "site":
                this.isSiteOpen = true;
                break;
            case "payer":
                this.isPayerOpen = true;
                break;
        }
        this.cdr.markForCheck();
    }

    private closeSidebarFilterDropdowns(): void {
        this.isDeptOpen = false;
        this.isSurgeryTypeOpen = false;
        this.isShiftOpen = false;
        this.isWeekdayOpen = false;
        this.isSiteOpen = false;
        this.isPayerOpen = false;
    }

    clearDepartmentFilter(event: Event): void {
        event.stopPropagation();
        this.selectedDepartments = [];
        this.applyFilterChange();
    }

    clearPayerFilter(event: Event): void {
        event.stopPropagation();
        this.selectedPayers = [];
        this.applyFilterChange();
    }

    clearSiteFilter(event: Event): void {
        event.stopPropagation();
        this.selectedSites = [];
        this.applyFilterChange();
    }

    setSiteFilter(site: string, event: Event): void {
        event.stopPropagation();
        this.selectedSites = this.toggleFromSingle(this.selectedSites, site);
        this.applyFilterChange();
    }

    toggleWeekdayFilter(value: string, event: Event): void {
        event.stopPropagation();
        this.selectedWeekdays = this.toggleFromSingle(this.selectedWeekdays, value);
        this.applyFilterChange();
    }

    private toggleFromSingle(list: string[], value: string): string[] {
        const idx = list.indexOf(value);
        return idx >= 0 ? [] : [value];
    }

    private applyFilterChange(): void {
        this.closeSidebarFilterDropdowns();
        this.api.clearCache();
        this.refreshData(true);
    }

    /** Server filters accept a single value per dimension (=), not comma lists. */
    toggleSingleFilter(list: string[], value: string, event: Event): void {
        event.stopPropagation();
        const idx = list.indexOf(value);
        list.length = 0;
        if (idx < 0) {
            list.push(value);
        }
        this.applyFilterChange();
    }

    getChartHeading(): string {
        if (this.chartViewMode === "month") {
            return "הכנסות לפי חודשים";
        }
        if (this.chartViewMode === "year-total") {
            return "סיכום הכנסות שנתי";
        }
        switch (this.mainMetric) {
            case "byPayer":
                return "הכנסות לפי גורם משלם";
            case "bySurgeryType":
                return "הכנסות לפי סוג ניתוח";
            default:
                return "הכנסות לפי מחלקה";
        }
    }

    getChartHeadingIcon(): string {
        if (this.chartViewMode === "month") {
            return "calendar_month";
        }
        if (this.chartViewMode === "year-total") {
            return "summarize";
        }
        switch (this.mainMetric) {
            case "byPayer":
                return "payments";
            case "bySurgeryType":
                return "category";
            default:
                return "local_hospital";
        }
    }

    getPeriodCaption(): string {
        if (this.chartViewMode === "month") {
            return "השוואת תקופות מקבילות — חמש השנים האחרונות לפי חודש.";
        }
        return "השוואת תקופות והפרשים בין שנים — נתונים מ־SurgerydashboardForRoey.";
    }

    hasActiveFilters(): boolean {
        return this.getActiveFiltersSummary() !== "ללא סינון";
    }

    isFilterSidebarOpen(): boolean {
        return this.showFilterSidebar;
    }

    openFilterSidebar(): void {
        if (this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = true;
        this.notifyLayoutResizeAfterSidebarChange();
    }

    closeFilterSidebar(): void {
        if (!this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = false;
        this.notifyLayoutResizeAfterSidebarChange();
    }

    toggleFilterSidebar(): void {
        this.showFilterSidebar = !this.showFilterSidebar;
        this.notifyLayoutResizeAfterSidebarChange();
    }

    private notifyLayoutResizeAfterSidebarChange(): void {
        this.cdr.markForCheck();
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore
            }
        }, 0);
    }

    openChartFullModal(): void {
        if (!this.chartData?.length || this.isLoading || this.isChartLoading) {
            return;
        }
        this.showChartFullModal = true;
        this.cdr.markForCheck();
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore
            }
            this.cdr.markForCheck();
        }, 150);
    }

    closeChartFullModal(): void {
        this.showChartFullModal = false;
        this.cdr.markForCheck();
    }

    getYearDiff(
        row: RevenueTableRow,
        year: number,
    ): { diff: number; pct: string } | null {
        if (!this.tableYears || this.tableYears.length < 2) {
            return null;
        }
        const idx = this.tableYears.indexOf(year);
        if (idx <= 0) {
            return null;
        }
        if (
            this.chartViewMode === "month" &&
            row.isFuture &&
            year === new Date().getFullYear()
        ) {
            return null;
        }
        const prevYear = this.tableYears[idx - 1];
        const newerVal = row.perYear[year] || 0;
        const olderVal = row.perYear[prevYear] || 0;
        const diff = newerVal - olderVal;
        if (!olderVal) {
            return { diff, pct: newerVal ? "∞%" : "0%" };
        }
        return { diff, pct: Math.round((diff / olderVal) * 100) + "%" };
    }

    getYearDiffClass(
        row: RevenueTableRow,
        year: number,
    ): { [klass: string]: boolean } {
        const d = this.getYearDiff(row, year);
        if (!d) {
            return {};
        }
        return {
            "agg-positive": d.diff > 0,
            "agg-negative": d.diff < 0,
        };
    }

    formatMoney(value: number | null | undefined): string {
        const n = Number(value) || 0;
        return (
            "₪" +
            n.toLocaleString("he-IL", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })
        );
    }

    /** טבלת צד — במצב חודשים כמו הדשבורד הראשי; אחרת סכומים בקיצור M/K */
    formatSideTableValue(value: number | null | undefined): string {
        if (value == null || !Number.isFinite(value)) {
            return "—";
        }
        if (this.chartViewMode === "month") {
            return this.formatSideTableNumber(Math.round(value));
        }
        return this.formatTableMoney(value);
    }

    private formatSideTableNumber(value: number): string {
        return value.toLocaleString("he-IL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    /** טבלת צד — סכומים במיליונים (M) כדי להתאים לעמודה צרה */
    formatTableMoney(value: number | null | undefined): string {
        if (value == null || !Number.isFinite(value)) {
            return "—";
        }
        const abs = Math.abs(value);
        if (abs >= 1_000_000) {
            const millions = abs / 1_000_000;
            const formatted = millions.toLocaleString("he-IL", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
            });
            return value < 0 ? `-₪${formatted}M` : `₪${formatted}M`;
        }
        if (abs >= 1_000) {
            const thousands = abs / 1_000;
            const formatted = thousands.toLocaleString("he-IL", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
            return value < 0 ? `-₪${formatted}K` : `₪${formatted}K`;
        }
        return this.formatMoney(value);
    }

    getDiffClass(value: number | null | undefined): string {
        if (value == null || !Number.isFinite(value) || value === 0) {
            return "";
        }
        return value > 0 ? "agg-positive" : "agg-negative";
    }

    isTotalTableRow(row: RevenueTableRow): boolean {
        return row.label === 'סה"כ';
    }

    private toChartMillions(value: number): number {
        return Math.round((value / 1_000_000) * 10) / 10;
    }

    private chartMoneyAxisOptions(): { title: string; format: string } {
        return { title: "₪ (M)", format: "#.#" };
    }

    private chartMoneyAnnotation(value: number): string {
        if (value == null || !Number.isFinite(value)) {
            return "";
        }
        return this.formatTableMoney(value);
    }

    private isDarkTheme(): boolean {
        return (
            typeof document !== "undefined" &&
            !!document.querySelector(".dash.dark")
        );
    }

    private escapeHtmlForChartTooltip(text: string): string {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    private formatTooltipMoneyFromChartValue(v: any): string {
        const n = Number(v);
        if (!Number.isFinite(n)) {
            return "—";
        }
        return this.formatTableMoney(Math.round(n * 1_000_000));
    }

    private getChartCategoryHeader(columns: any[]): string {
        const c0 = columns[0];
        if (typeof c0 === "string") {
            return c0;
        }
        if (c0 && typeof c0 === "object" && c0.label != null) {
            return String(c0.label);
        }
        return "";
    }

    private collectNumericSeries(
        columns: any[],
    ): { colIndex: number; label: string }[] {
        const numericSeries: { colIndex: number; label: string }[] = [];
        for (let i = 1; i < columns.length; i++) {
            const c = columns[i] as any;
            const isNumberCol =
                (typeof c === "object" && c?.type === "number") ||
                c === "number";
            const isRole = typeof c === "object" && !!c?.role;
            if (isNumberCol && !isRole) {
                numericSeries.push({
                    colIndex: i,
                    label:
                        typeof c === "object" && c?.label
                            ? String(c.label)
                            : `Series ${i}`,
                });
            }
        }
        return numericSeries;
    }

    private isMultiYearCategoryChart(
        columns: any[],
        numericSeries: { colIndex: number; label: string }[],
    ): boolean {
        const header = this.getChartCategoryHeader(columns);
        if (!header || header === "שנה") {
            return false;
        }
        return (
            numericSeries.length > 0 &&
            numericSeries.every((s) =>
                /^\d{4}$/.test(String(s.label).trim()),
            )
        );
    }

    private buildRevenueMultiYearTooltipHtml(
        category: string,
        dataRow: any[],
        numericSeries: { colIndex: number; label: string }[],
        copy: { subtitle: string; totalCaption: string },
    ): string {
        const muted = this.isDarkTheme() ? "#94a3b8" : "#64748b";
        const border = this.isDarkTheme() ? "#475569" : "#e2e8f0";
        const lineColor = this.isDarkTheme() ? "#e5e7eb" : "#0f172a";
        const currentYear = new Date().getFullYear();

        const entries = numericSeries
            .map((s) => ({
                year: parseInt(String(s.label).trim(), 10),
                value: dataRow[s.colIndex],
            }))
            .filter((e) => !isNaN(e.year))
            .sort((a, b) => b.year - a.year);

        let rowSumMillions = 0;
        for (const e of entries) {
            const n = Number(e.value);
            if (Number.isFinite(n)) {
                rowSumMillions += n;
            }
        }

        const title = this.escapeHtmlForChartTooltip(category);
        const subtitle = this.escapeHtmlForChartTooltip(copy.subtitle);
        const totalCaption = this.escapeHtmlForChartTooltip(copy.totalCaption);

        const yearBlocks = entries
            .map((e) => {
                const badge =
                    e.year === currentYear
                        ? `<span style="font-size:11px;font-weight:600;color:${muted}"> (שנת נוכחית)</span>`
                        : "";
                return `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:baseline;gap:14px;font-size:13px;color:${lineColor}">
                    <span>שנה <b>${e.year}</b>${badge}</span>
                    <span style="white-space:nowrap"><b>${this.formatTooltipMoneyFromChartValue(e.value)}</b></span>
                </div>`;
            })
            .join("");

        return `<div style="direction:rtl;text-align:right;padding:10px 12px;min-width:220px;max-width:340px;color:${lineColor}">
            <div style="font-size:15px;font-weight:800;margin-bottom:2px">${title}</div>
            <div style="font-size:11px;color:${muted};padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${border}">${subtitle}</div>
            <div style="font-size:12px;margin-bottom:8px">${totalCaption}: <b>${this.formatTooltipMoneyFromChartValue(rowSumMillions)}</b></div>
            ${yearBlocks}
        </div>`;
    }

    private buildRevenueSinglePointTooltipHtml(
        category: string,
        seriesLabel: string,
        value: any,
    ): string {
        const lineColor = this.isDarkTheme() ? "#e5e7eb" : "#0f172a";
        const muted = this.isDarkTheme() ? "#94a3b8" : "#64748b";
        return `<div style="direction:rtl;text-align:right;padding:10px 12px;min-width:180px;color:${lineColor}">
            <div style="font-size:15px;font-weight:800;margin-bottom:4px">${this.escapeHtmlForChartTooltip(category)}</div>
            <div style="font-size:13px;color:${muted}">${this.escapeHtmlForChartTooltip(seriesLabel)}</div>
            <div style="font-size:14px;font-weight:800;margin-top:6px">${this.formatTooltipMoneyFromChartValue(value)}</div>
        </div>`;
    }

    private applyRevenueChartTooltips(
        copy?: Partial<{ subtitle: string; totalCaption: string }>,
    ): void {
        if (!this.chartColumns?.length || !this.chartData?.length) {
            return;
        }

        const columns = [...this.chartColumns];
        const rows = this.chartData.map((r) =>
            Array.isArray(r) ? [...r] : r,
        );
        const numericSeries = this.collectNumericSeries(columns);
        if (!numericSeries.length) {
            return;
        }

        const useMultiYear = this.isMultiYearCategoryChart(
            columns,
            numericSeries,
        );
        const tooltipCol = {
            type: "string",
            role: "tooltip",
            p: { html: true },
        };

        const tooltipInsertions: { insertPos: number; valueColIdx: number }[] =
            [];
        for (const s of numericSeries) {
            let insertPos = s.colIndex + 1;
            if (
                insertPos < columns.length &&
                typeof columns[insertPos] === "object" &&
                (columns[insertPos] as any).role === "annotation"
            ) {
                insertPos++;
            }
            const next = columns[insertPos] as any;
            const nextIsTooltip =
                typeof next === "object" && next?.role === "tooltip";
            if (!nextIsTooltip) {
                tooltipInsertions.push({
                    insertPos,
                    valueColIdx: s.colIndex,
                });
            }
        }
        if (!tooltipInsertions.length) {
            return;
        }

        const labelByColIndex = new Map<number, string>();
        for (const s of numericSeries) {
            labelByColIndex.set(s.colIndex, s.label);
        }

        tooltipInsertions
            .sort((a, b) => b.insertPos - a.insertPos)
            .forEach(({ insertPos }) => columns.splice(insertPos, 0, tooltipCol));

        const tooltipCopy = {
            subtitle:
                copy?.subtitle ??
                "הכנסות לפי שנה — מהחדשה (למעלה) לישנה (למטה)",
            totalCaption:
                copy?.totalCaption ?? 'סה"כ הכנסות בכל השנים בשורה זו',
        };

        const dataOut = rows.map((row: any[]) => {
            if (!Array.isArray(row)) {
                return row;
            }
            const nextRow = [...row];
            const category = String(nextRow[0] ?? "");
            const combinedHtml = useMultiYear
                ? this.buildRevenueMultiYearTooltipHtml(
                      category,
                      nextRow,
                      numericSeries,
                      tooltipCopy,
                  )
                : null;

            tooltipInsertions
                .sort((a, b) => b.insertPos - a.insertPos)
                .forEach(({ insertPos, valueColIdx }) => {
                    const seriesLabel =
                        labelByColIndex.get(valueColIdx) ?? "ערך";
                    const value = nextRow[valueColIdx];
                    const html =
                        combinedHtml ??
                        this.buildRevenueSinglePointTooltipHtml(
                            category,
                            seriesLabel,
                            value,
                        );
                    nextRow.splice(insertPos, 0, html);
                });
            return nextRow;
        });

        this.chartColumns = columns;
        this.chartData = dataOut;
        this.chartOptions = {
            ...this.chartOptions,
            focusTarget: "category",
            tooltip: {
                ...(this.chartOptions?.tooltip || {}),
                isHtml: true,
                trigger: "focus",
                showColorCode: !useMultiYear,
            },
        };
    }

    formatPct(value: number | null | undefined): string {
        if (value == null || isNaN(value)) {
            return "—";
        }
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(1)}%`;
    }

    exportTableCsv(): void {
        if (!this.tableRows.length) {
            this.snackBar.open("אין נתונים לייצוא", "סגור", { duration: 3000 });
            return;
        }
        const header = ["ישות", ...this.tableYears.map(String), "סה״כ", "הפרש", "אחוז"];
        const lines = [header.join(",")];
        for (const row of this.tableRows) {
            lines.push(
                [
                    `"${row.label}"`,
                    ...this.tableYears.map((y) => String(row.perYear[y] ?? 0)),
                    String(row.total),
                    row.diff != null ? String(row.diff) : "",
                    row.pct != null ? String(row.pct) : "",
                ].join(","),
            );
        }
        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "surgeries-revenue.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    }

    trackByLabel(_: number, row: RevenueTableRow): string {
        return row.label;
    }

    trackByYear(_: number, y: number): number {
        return y;
    }

    private buildFilterParams(): SurgeriesRevenueFilterParams {
        return {
            baseYear: String(this.baseYear),
            groupBy: this.groupByForMetric(),
            department: this.selectedDepartments[0] ?? "",
            billingDepartment: "",
            surgeryType: this.selectedSurgeryTypes[0] ?? "",
            shift: this.selectedShifts[0] ?? "",
            site: this.selectedSites[0] ?? "",
            payer: this.selectedPayers[0] ?? "",
            weekend: this.buildWeekendParam(),
        };
    }

    private buildWeekendParam(): string {
        if (this.selectedWeekdays.length !== 1) {
            return "";
        }
        return this.selectedWeekdays[0] === "סופ״ש" ? "true" : "false";
    }

    /** Fallback when GetRevenueFilterOptions is not deployed yet. */
    private hydrateFilterOptionsFromAgg(): void {
        const keys = [
            ...new Set(this.aggRows.map((r) => r.GroupKey).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b, "he"));
        if (!keys.length) {
            return;
        }
        const groupBy = this.groupByForMetric();
        if (groupBy === "wing" && !this.filterOptions.wings.length) {
            this.filterOptions = { ...this.filterOptions, wings: keys };
        } else if (groupBy === "payer" && !this.filterOptions.payers.length) {
            this.filterOptions = { ...this.filterOptions, payers: keys };
        } else if (
            groupBy === "surgeryType" &&
            !this.filterOptions.surgeryTypes.length
        ) {
            this.filterOptions = {
                ...this.filterOptions,
                surgeryTypes: keys,
            };
        } else if (
            groupBy === "billingDept" &&
            !this.filterOptions.billingDepartments.length
        ) {
            this.filterOptions = {
                ...this.filterOptions,
                billingDepartments: keys,
            };
        }
    }

    private groupByForMetric(): RevenueGroupBy {
        switch (this.mainMetric) {
            case "byPayer":
                return "payer";
            case "bySurgeryType":
                return "surgeryType";
            default:
                return "wing";
        }
    }

    private rebuildView(): void {
        this.chartViewEpoch++;
        this.rebuildYearSummaries();
        this.rebuildChart();
        this.rebuildTable();
        this.rebuildKpis();
    }

    private rebuildYearSummaries(): void {
        const years = this.distinctYearsFromAgg();
        this.yearsForChart = years;
        this.yearlyRevenueTotals = {};
        years.forEach((y) => {
            this.yearlyRevenueTotals[y] = this.aggRows
                .filter((r) => r.Year === y)
                .reduce((s, r) => s + r.TotalAmount, 0);
        });
    }

    private rebuildChart(): void {
        if (this.chartViewMode === "month") {
            this.buildMonthlyChart();
            return;
        }
        if (this.chartViewMode === "year-total") {
            this.buildYearTotalChart();
            return;
        }
        this.buildGroupedYearChart();
    }

    private buildYearTotalChart(): void {
        const years = this.yearsForChart;
        this.chartColumns = [
            "שנה",
            { type: "number", label: 'סה"כ הכנסות' },
            { type: "string", role: "annotation" },
        ];
        this.chartData = years.map((y) => {
            const val = Math.round(this.yearlyRevenueTotals[y] || 0);
            return [y.toString(), this.toChartMillions(val), this.chartMoneyAnnotation(val)];
        });
        this.chartOptions = {
            ...this.chartOptions,
            isStacked: false,
            vAxis: this.chartMoneyAxisOptions(),
        };
        this.applyRevenueChartTooltips({
            subtitle: "סה״כ הכנסות בשנה זו",
            totalCaption: 'סה"כ הכנסות',
        });
    }

    private buildGroupedYearChart(): void {
        const years = this.yearsForChart;
        const groups = [
            ...new Set(
                this.aggRows.map((r) => r.GroupKey).filter(Boolean),
            ),
        ].slice(0, 12);

        const cols: any[] = ["קבוצה"];
        years.forEach((y) => {
            cols.push({ type: "number", label: String(y) });
            cols.push({ type: "string", role: "annotation" });
        });
        this.chartColumns = cols;

        this.chartData = groups.map((g) => {
            const row: any[] = [g];
            years.forEach((y) => {
                const match = this.aggRows.find(
                    (r) => r.GroupKey === g && r.Year === y,
                );
                const val = Math.round(match?.TotalAmount ?? 0);
                row.push(this.toChartMillions(val), this.chartMoneyAnnotation(val));
            });
            return row;
        });

        this.chartOptions = {
            ...this.chartOptions,
            isStacked: false,
            vAxis: this.chartMoneyAxisOptions(),
        };
        this.applyRevenueChartTooltips({
            subtitle: "הכנסות לפי שנה בקבוצה זו",
            totalCaption: 'סה"כ הכנסות בכל השנים בקבוצה זו',
        });
    }

    private buildMonthlyChart(): void {
        const years = [
            ...new Set(this.monthlyRows.map((r) => r.Year)),
        ].sort((a, b) => a - b);
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const monthLabels = [
            "ינו", "פבר", "מרץ", "אפר", "מאי", "יונ",
            "יול", "אוג", "ספט", "אוק", "נוב", "דצמ",
        ];

        const cols: any[] = ["חודש"];
        years.forEach((y) => {
            cols.push({ type: "number", label: String(y) });
            cols.push({ type: "string", role: "annotation" });
        });
        this.chartColumns = cols;

        this.chartData = months.map((m, idx) => {
            const row: any[] = [monthLabels[idx]];
            years.forEach((y) => {
                const match = this.monthlyRows.find(
                    (r) => r.Year === y && r.Month === m,
                );
                const val = Math.round(match?.TotalAmount ?? 0);
                row.push(
                    this.toChartMillions(val),
                    this.chartMoneyAnnotation(val),
                );
            });
            return row;
        });

        this.chartOptions = {
            ...this.chartOptions,
            isStacked: false,
            vAxis: this.chartMoneyAxisOptions(),
        };
        this.applyRevenueChartTooltips({
            subtitle: "הכנסות לפי שנה בחודש זה",
            totalCaption: 'סה"כ הכנסות בכל השנים בחודש זה',
        });
    }

    private rebuildTable(): void {
        if (this.chartViewMode === "month") {
            this.rebuildMonthlyTable();
            return;
        }
        this.rebuildEntityYearTable();
    }

    private rebuildEntityYearTable(): void {
        const years = this.yearsForChart;
        this.tableYears = years;
        const groups = [
            ...new Set(
                this.aggRows.map((r) => r.GroupKey).filter(Boolean),
            ),
        ];

        const rows: RevenueTableRow[] = groups.map((g) => {
            const perYear: { [year: number]: number } = {};
            let total = 0;
            years.forEach((y) => {
                const v =
                    this.aggRows
                        .filter((r) => r.GroupKey === g && r.Year === y)
                        .reduce((s, r) => s + r.TotalAmount, 0) || 0;
                perYear[y] = v;
                total += v;
            });
            const { diff, pct } = this.computeDiffAndPct(perYear, years);
            return { label: g, perYear, total, diff, pct };
        });

        rows.sort((a, b) => b.total - a.total);
        this.tableRows = rows.slice(0, 15);

        if (years.length) {
            const totalRow: RevenueTableRow = {
                label: 'סה"כ',
                perYear: {},
                total: 0,
                diff: null,
                pct: null,
            };
            years.forEach((y) => {
                totalRow.perYear[y] = this.yearlyRevenueTotals[y] || 0;
                totalRow.total += totalRow.perYear[y];
            });
            const { diff, pct } = this.computeDiffAndPct(totalRow.perYear, years);
            totalRow.diff = diff;
            totalRow.pct = pct;
            this.tableRows = [totalRow, ...this.tableRows];
        }
    }

    private rebuildMonthlyTable(): void {
        const years = [
            ...new Set(this.monthlyRows.map((r) => r.Year)),
        ].sort((a, b) => a - b);
        this.tableYears = years;
        const currentYear = new Date().getFullYear();
        const currentMonthIdx = new Date().getMonth();

        this.tableRows = this.monthLabelsFull.map((label, idx) => {
            const month = idx + 1;
            const perYear: { [year: number]: number } = {};
            years.forEach((y) => {
                perYear[y] =
                    this.monthlyRows.find(
                        (r) => r.Year === y && r.Month === month,
                    )?.TotalAmount ?? 0;
            });
            return {
                label,
                perYear,
                total: 0,
                diff: null,
                pct: null,
                isFuture:
                    years.includes(currentYear) && idx > currentMonthIdx,
            };
        });
    }

    private rebuildKpis(): void {
        const years = this.yearsForChart;
        if (!years.length) {
            this.kpiTotalLatestYear = "—";
            this.kpiYoYPct = "—";
            this.kpiAvgPerSurgery = "—";
            return;
        }
        const latest = years[years.length - 1];
        const prev = years[years.length - 2];
        const latestTotal = this.yearlyRevenueTotals[latest] || 0;
        const prevTotal = prev != null ? this.yearlyRevenueTotals[prev] || 0 : 0;

        this.kpiTotalLatestYear =
            latestTotal > 0 ? this.formatMoney(latestTotal) : "—";

        if (prevTotal > 0) {
            this.kpiYoYPct = this.formatPct(
                ((latestTotal - prevTotal) / prevTotal) * 100,
            );
        } else {
            this.kpiYoYPct = "—";
        }

        const surgeryCount = this.aggRows
            .filter((r) => r.Year === latest)
            .reduce((s, r) => s + r.SurgeryCount, 0);
        this.kpiAvgPerSurgery =
            surgeryCount > 0
                ? this.formatMoney(latestTotal / surgeryCount)
                : "—";
    }

    private distinctYearsFromAgg(): number[] {
        const fromAgg = [...new Set(this.aggRows.map((r) => r.Year))];
        const fromMonthly = this.monthlyRows.map((r) => r.Year);
        return [...new Set([...fromAgg, ...fromMonthly])]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private computeDiffAndPct(
        perYear: { [year: number]: number },
        years: number[],
    ): { diff: number | null; pct: number | null } {
        if (years.length < 2) {
            return { diff: null, pct: null };
        }
        const yLatest = years[years.length - 1];
        const yPrev = years[years.length - 2];
        const latest = perYear[yLatest] ?? 0;
        const prev = perYear[yPrev] ?? 0;
        const diff = latest - prev;
        const pct = prev !== 0 ? (diff / prev) * 100 : null;
        return { diff, pct };
    }
}
