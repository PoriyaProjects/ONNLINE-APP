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
import { SurgeriesWaitTimesApiService } from "./surgeries-wait-times-api.service";
import {
    EmergencyReplacementRow,
    RecommendationDeptRow,
    RecommendationMonthRow,
    RecommendationProcedureRow,
    RecommendationTableRow,
    RecommendationView,
    RecommendationYearRow,
    RecommendationYty,
} from "./surgeries-wait-times.models";

@Component({
    selector: "app-surgeries-wait-times",
    templateUrl: "./surgeries-wait-times.component.html",
    styleUrls: ["./surgeries-wait-times.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesWaitTimesComponent implements OnInit, OnDestroy {
    readonly pageTitle = "המלצות לניתוח";

    view: RecommendationView = "yearly";

    isLoading = true;
    isChartLoading = false;
    loadError = "";

    selectedDepartment = "";
    departmentOptions: string[] = [];
    isDeptOpen = false;

    showFilterSidebar = true;
    showChartFullModal = false;
    chartViewEpoch = 0;

    private yearlyRows: RecommendationYearRow[] = [];
    private monthlyRows: RecommendationMonthRow[] = [];
    private deptRows: RecommendationDeptRow[] = [];
    private procedureRows: RecommendationProcedureRow[] = [];
    private emergencyRows: EmergencyReplacementRow[] = [];

    private subs = new Subscription();
    private readonly baseYear = new Date().getFullYear();

    chartType = "ColumnChart";
    chartData: any[] = [];
    chartColumns: any[] = [];
    chartOptions: any = this.createBaseChartOptions();

    yearsForChart: number[] = [];
    yearlyTotals: { [year: number]: number } = {};
    yearlyYty: { [year: number]: RecommendationYty } = {};

    tableRows: RecommendationTableRow[] = [];
    tableYears: number[] = [];

    kpiLatestYearTotal = "—";
    kpiYoYPct = "—";
    kpiTopDept = "—";
    kpiTopProcedure = "—";

    private readonly monthLabelsFull = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
    ];

    private readonly monthLabelsShort = [
        "ינו", "פבר", "מרץ", "אפר", "מאי", "יונ",
        "יול", "אוג", "ספט", "אוק", "נוב", "דצמ",
    ];

    private readonly palette = [
        "#2563eb", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
        "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
        "#14b8a6", "#a855f7", "#eab308", "#0ea5e9", "#64748b",
    ];

    constructor(
        private api: SurgeriesWaitTimesApiService,
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
        this.isDeptOpen = false;
    }

    // ── טעינת נתונים ──
    loadAll(forceRefresh = false): void {
        const cached =
            !forceRefresh && this.api.isBundleCached(this.selectedDepartment);
        if (!cached) {
            this.isChartLoading = true;
        }
        this.cdr.markForCheck();

        const sub = forkJoin({
            yearly: this.api.getRecommendationsYearly(forceRefresh),
            monthly: this.api.getRecommendationsMonthly(
                this.selectedDepartment,
                forceRefresh,
            ),
            byDept: this.api.getRecommendationsByDepartment(forceRefresh),
            procedures: this.api.getTopRecommendedProcedures(forceRefresh),
            emergency: this.api.getEmergencyReplacementAnalysis(forceRefresh),
        }).subscribe({
            next: ({ yearly, monthly, byDept, procedures, emergency }) => {
                this.yearlyRows = yearly;
                this.monthlyRows = monthly;
                this.deptRows = byDept;
                this.procedureRows = procedures;
                this.emergencyRows = emergency;
                this.isLoading = false;
                this.isChartLoading = false;
                this.hydrateDepartmentOptions();
                if (
                    !yearly.length &&
                    !monthly.length &&
                    !byDept.length &&
                    !procedures.length
                ) {
                    this.loadError =
                        "לא התקבלו נתוני המלצות מהשרת. ודא ש-GetRecommendationsYearly פעיל.";
                } else {
                    this.loadError = "";
                }
                this.rebuildView();
                this.cdr.markForCheck();
            },
            error: () => {
                this.yearlyRows = [];
                this.monthlyRows = [];
                this.deptRows = [];
                this.procedureRows = [];
                this.emergencyRows = [];
                this.isLoading = false;
                this.isChartLoading = false;
                this.loadError = "שגיאה בטעינת נתוני המלצות מהשרת.";
                this.snackBar.open(this.loadError, "סגור", { duration: 5000 });
                this.rebuildView();
                this.cdr.markForCheck();
            },
        });
        this.subs.add(sub);
    }

    /** רשימת מחלקות לסינון — נשמרת מהמשיכה הכלל-בית-חולימית */
    private hydrateDepartmentOptions(): void {
        if (this.selectedDepartment) {
            return;
        }
        const depts = [
            ...new Set(this.deptRows.map((r) => r.Department).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b, "he"));
        if (depts.length) {
            this.departmentOptions = depts;
        }
    }

    // ── אינטראקציות ──
    onViewChange(value: RecommendationView): void {
        this.view = value;
        this.rebuildView();
        this.cdr.markForCheck();
    }

    toggleDeptDropdown(event: Event): void {
        event.stopPropagation();
        this.isDeptOpen = !this.isDeptOpen;
        this.cdr.markForCheck();
    }

    selectDepartment(dept: string, event: Event): void {
        event.stopPropagation();
        this.selectedDepartment = dept;
        this.isDeptOpen = false;
        this.loadAll();
    }

    clearDepartment(event: Event): void {
        event.stopPropagation();
        this.selectedDepartment = "";
        this.isDeptOpen = false;
        this.loadAll();
    }

    resetFilters(): void {
        if (!this.selectedDepartment) {
            return;
        }
        this.selectedDepartment = "";
        this.isDeptOpen = false;
        this.loadAll();
    }

    refresh(): void {
        this.api.clearCache();
        this.loadAll(true);
    }

    getDepartmentDisplay(): string {
        return this.selectedDepartment
            ? `מחלקה: ${this.selectedDepartment}`
            : "מחלקה: כל בית החולים";
    }

    getActiveFiltersSummary(): string {
        return this.selectedDepartment
            ? `מחלקה: ${this.selectedDepartment}`
            : "כל בית החולים";
    }

    hasActiveFilters(): boolean {
        return !!this.selectedDepartment;
    }

    // ── ניהול סיידבר (נקרא גם מהדשבורד הראשי) ──
    isFilterSidebarOpen(): boolean {
        return this.showFilterSidebar;
    }

    openFilterSidebar(): void {
        if (this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = true;
        this.notifyLayoutResize();
    }

    closeFilterSidebar(): void {
        if (!this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = false;
        this.notifyLayoutResize();
    }

    toggleFilterSidebar(): void {
        this.showFilterSidebar = !this.showFilterSidebar;
        this.notifyLayoutResize();
    }

    private notifyLayoutResize(): void {
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

    // ── כותרות תצוגה ──
    getChartHeading(): string {
        switch (this.view) {
            case "monthly":
                return "המלצות לפי חודש";
            case "byDept":
                return "המלצות לפי מחלקה";
            case "procedures":
                return "ניתוחים מומלצים נפוצים";
            case "emergency":
                return "כניסת ניתוח דחוף במקום מבוטל";
            default:
                return "מספר המלצות שנתי";
        }
    }

    getPeriodCaption(): string {
        switch (this.view) {
            case "monthly":
                return "השוואת חודשים לאורך חמש השנים האחרונות.";
            case "byDept":
                return "פילוח ההמלצות לניתוח לפי מחלקה מפנה.";
            case "procedures":
                return "הניתוחים המומלצים הנפוצים ביותר בתקופה.";
            case "emergency":
                return "שיעור ניתוחי החירום שנכנסו במקום ניתוחים שבוטלו.";
            default:
                return "מגמת המלצות שנתית והשוואה לשנה קודמת (YTY).";
        }
    }

    getYearSubtitle(year: number): string {
        const yty = this.yearlyYty[year];
        if (yty?.pct != null && Number.isFinite(yty.pct)) {
            return `${this.formatPct(yty.pct)} מול ${year - 1}`;
        }
        const firstYear = this.yearsForChart[0];
        if (firstYear != null && year === firstYear) {
            return "נקודת בסיס";
        }
        return "—";
    }

    getYearCardCount(year: number): string {
        return this.formatCount(this.yearlyTotals[year] || 0);
    }

    // ── עזרי תצוגה לטבלה ──
    getYearDiff(
        row: RecommendationTableRow,
        year: number,
    ): { diff: number; pct: string } | null {
        if (!this.tableYears || this.tableYears.length < 2 || !row.perYear) {
            return null;
        }
        const idx = this.tableYears.indexOf(year);
        if (idx <= 0) {
            return null;
        }
        const prevYear = this.tableYears[idx - 1];
        const newer = row.perYear[year] || 0;
        const older = row.perYear[prevYear] || 0;
        const diff = newer - older;
        if (!older) {
            return { diff, pct: newer ? "∞%" : "0%" };
        }
        return { diff, pct: Math.round((diff / older) * 100) + "%" };
    }

    getYearDiffClass(
        row: RecommendationTableRow,
        year: number,
    ): { [klass: string]: boolean } {
        const d = this.getYearDiff(row, year);
        if (!d) {
            return {};
        }
        // מגמת המלצות: עלייה = חיובי (ירוק), ירידה = שלילי (אדום)
        return {
            "agg-positive": d.diff > 0,
            "agg-negative": d.diff < 0,
        };
    }

    isTotalTableRow(row: RecommendationTableRow): boolean {
        return !!row.isTotal;
    }

    getYearValue(row: RecommendationTableRow, year: number): number {
        return row.perYear ? row.perYear[year] || 0 : 0;
    }

    formatCount(value: number | null | undefined): string {
        const n = Number(value) || 0;
        return n.toLocaleString("he-IL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    formatPct(value: number | null | undefined): string {
        if (value == null || isNaN(value)) {
            return "—";
        }
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(1)}%`;
    }

    formatPctOfTotal(value: number | null | undefined): string {
        if (value == null || isNaN(value)) {
            return "—";
        }
        return `${value.toFixed(1)}%`;
    }

    get isCountByYearView(): boolean {
        return this.view === "yearly" || this.view === "monthly";
    }

    getTableEntityLabel(): string {
        switch (this.view) {
            case "monthly":
                return "חודש";
            case "byDept":
                return "מחלקה";
            case "procedures":
                return "ניתוח";
            case "emergency":
                return "מחלקה";
            default:
                return "שנה";
        }
    }

    getTableValueLabel(): string {
        return this.view === "emergency" ? "ניתוח דחוף" : "כמות";
    }

    getTablePctLabel(): string {
        return this.view === "emergency" ? "שיעור החלפה" : "אחוז";
    }

    trackByLabel(_: number, row: RecommendationTableRow): string {
        return row.label;
    }

    trackByYear(_: number, y: number): number {
        return y;
    }

    trackByChartEpoch(_: number, epoch: number): number {
        return epoch;
    }

    exportTableCsv(): void {
        if (!this.tableRows.length) {
            this.snackBar.open("אין נתונים לייצוא", "סגור", { duration: 3000 });
            return;
        }
        const lines: string[] = [];
        if (this.isCountByYearView) {
            lines.push(
                [this.getTableEntityLabel(), ...this.tableYears.map(String)].join(","),
            );
            for (const row of this.tableRows) {
                lines.push(
                    [
                        `"${row.label}"`,
                        ...this.tableYears.map((y) => String(row.perYear?.[y] ?? 0)),
                    ].join(","),
                );
            }
        } else {
            lines.push(
                [
                    this.getTableEntityLabel(),
                    this.getTableValueLabel(),
                    this.getTablePctLabel(),
                ].join(","),
            );
            for (const row of this.tableRows) {
                lines.push(
                    [
                        `"${row.label}"`,
                        String(row.count ?? 0),
                        row.pctOfTotal != null ? row.pctOfTotal.toFixed(1) : "",
                    ].join(","),
                );
            }
        }
        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "surgeries-recommendations.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ── בניית תצוגה ──
    private rebuildView(): void {
        this.chartViewEpoch++;
        this.rebuildYearSummaries();
        this.rebuildChart();
        this.rebuildTable();
        this.rebuildKpis();
    }

    private distinctYears(): number[] {
        const fromYearly = this.yearlyRows.map((r) => r.Year);
        const fromMonthly = this.monthlyRows.map((r) => r.Year);
        return [...new Set([...fromYearly, ...fromMonthly])]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private rebuildYearSummaries(): void {
        const years = this.distinctYears();
        this.yearsForChart = years;
        this.yearlyTotals = {};
        this.yearlyYty = {};

        years.forEach((y) => {
            this.yearlyTotals[y] =
                this.yearlyRows.find((r) => r.Year === y)?.Count ?? 0;
        });

        years.forEach((y) => {
            const total = this.yearlyTotals[y] ?? 0;
            const prevTotal = this.yearlyTotals[y - 1];
            if (prevTotal == null) {
                this.yearlyYty[y] = { diff: 0, pct: null };
                return;
            }
            const diff = total - prevTotal;
            const pct = prevTotal !== 0 ? (diff / prevTotal) * 100 : null;
            this.yearlyYty[y] = { diff, pct };
        });
    }

    private createBaseChartOptions(): any {
        return {
            legend: {
                position: "top",
                alignment: "end",
                maxLines: 4,
                textStyle: { fontSize: 13, bold: true },
            },
            chartArea: { left: 64, top: 50, width: "82%", height: "62%" },
            hAxis: { title: "", textStyle: { fontSize: 13, bold: true } },
            vAxis: {
                title: "מספר המלצות",
                format: "#",
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
            colors: this.palette,
            tooltip: { trigger: "focus" },
        };
    }

    private resetChartState(): void {
        this.chartType = "ColumnChart";
        this.chartOptions = this.createBaseChartOptions();
        this.chartColumns = [];
        this.chartData = [];
    }

    private rebuildChart(): void {
        this.resetChartState();
        switch (this.view) {
            case "monthly":
                this.buildMonthlyChart();
                break;
            case "byDept":
                this.buildByDeptChart();
                break;
            case "procedures":
                this.buildProceduresChart();
                break;
            case "emergency":
                this.buildEmergencyChart();
                break;
            default:
                this.buildYearlyChart();
        }
    }

    private buildYearlyChart(): void {
        const years = this.yearsForChart;
        this.chartColumns = [
            "שנה",
            { type: "number", label: "המלצות" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = years.map((y) => {
            const val = this.yearlyTotals[y] || 0;
            return [String(y), val, this.formatCount(val), "color: #2563eb"];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
        };
    }

    private buildMonthlyChart(): void {
        const years = [...new Set(this.monthlyRows.map((r) => r.Year))].sort(
            (a, b) => a - b,
        );
        const cols: any[] = ["חודש"];
        years.forEach((y) => {
            cols.push({ type: "number", label: String(y) });
            cols.push({ type: "string", role: "annotation" });
        });
        this.chartColumns = cols;
        this.chartData = this.monthLabelsShort.map((label, idx) => {
            const month = idx + 1;
            const row: any[] = [label];
            years.forEach((y) => {
                const val =
                    this.monthlyRows.find(
                        (r) => r.Year === y && r.Month === month,
                    )?.Count ?? 0;
                row.push(val, val ? this.formatCount(val) : "");
            });
            return row;
        });
    }

    private buildByDeptChart(): void {
        const top = [...this.deptRows]
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 14);
        this.chartType = "BarChart";
        this.chartColumns = [
            "מחלקה",
            { type: "number", label: "המלצות" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = top.map((r, i) => [
            r.Department,
            r.Count,
            this.formatCount(r.Count),
            `color: ${this.palette[i % this.palette.length]}`,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            chartArea: { left: "34%", top: 16, width: "58%", height: "86%" },
            hAxis: {
                title: "מספר המלצות",
                format: "#",
                minValue: 0,
                textStyle: { fontSize: 12 },
            },
            vAxis: { textStyle: { fontSize: 12, bold: true } },
            annotations: {
                alwaysOutside: true,
                textStyle: { fontSize: 12, bold: true },
            },
        };
    }

    private buildProceduresChart(): void {
        const top = [...this.procedureRows]
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 14);
        this.chartType = "BarChart";
        this.chartColumns = [
            "ניתוח",
            { type: "number", label: "המלצות" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = top.map((r, i) => [
            r.Procedure,
            r.Count,
            this.formatCount(r.Count),
            `color: ${this.palette[i % this.palette.length]}`,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            chartArea: { left: "40%", top: 16, width: "52%", height: "86%" },
            hAxis: {
                title: "מספר המלצות",
                format: "#",
                minValue: 0,
                textStyle: { fontSize: 12 },
            },
            vAxis: { textStyle: { fontSize: 11, bold: true } },
            annotations: {
                alwaysOutside: true,
                textStyle: { fontSize: 12, bold: true },
            },
        };
    }

    private buildEmergencyChart(): void {
        const top = [...this.emergencyRows]
            .sort((a, b) => b.CancelledCount - a.CancelledCount)
            .slice(0, 12);
        this.chartType = "ColumnChart";
        this.chartColumns = [
            "מחלקה",
            { type: "number", label: "בוטלו" },
            { type: "number", label: "הוחלפו בדחוף" },
        ];
        this.chartData = top.map((r) => [
            r.Department,
            r.CancelledCount,
            r.EmergencyReplacedCount,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            isStacked: false,
            colors: ["#ef4444", "#10b981"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 12, bold: true },
            },
            chartArea: { left: 64, top: 56, width: "84%", height: "58%" },
            hAxis: {
                slantedText: true,
                slantedTextAngle: 30,
                textStyle: { fontSize: 11 },
            },
        };
    }

    // ── טבלה ──
    private rebuildTable(): void {
        switch (this.view) {
            case "monthly":
                this.rebuildMonthlyTable();
                break;
            case "byDept":
                this.rebuildSingleValueTable(
                    this.deptRows.map((r) => ({
                        label: r.Department,
                        count: r.Count,
                    })),
                );
                break;
            case "procedures":
                this.rebuildSingleValueTable(
                    this.procedureRows.map((r) => ({
                        label: r.Procedure,
                        count: r.Count,
                    })),
                );
                break;
            case "emergency":
                this.rebuildEmergencyTable();
                break;
            default:
                this.rebuildYearlyTable();
        }
    }

    private rebuildYearlyTable(): void {
        this.tableYears = this.yearsForChart;
        const perYear: { [year: number]: number } = {};
        this.tableYears.forEach((y) => (perYear[y] = this.yearlyTotals[y] || 0));
        this.tableRows = [
            {
                label: "סה״כ המלצות",
                perYear,
                isTotal: true,
            },
        ];
    }

    private rebuildMonthlyTable(): void {
        const years = [...new Set(this.monthlyRows.map((r) => r.Year))].sort(
            (a, b) => a - b,
        );
        this.tableYears = years;

        this.tableRows = this.monthLabelsFull.map((label, idx) => {
            const month = idx + 1;
            const perYear: { [year: number]: number } = {};
            years.forEach((y) => {
                perYear[y] =
                    this.monthlyRows.find(
                        (r) => r.Year === y && r.Month === month,
                    )?.Count ?? 0;
            });
            return { label, perYear, isTotal: false };
        });
    }

    private rebuildSingleValueTable(
        items: { label: string; count: number }[],
    ): void {
        this.tableYears = [];
        const sorted = [...items].sort((a, b) => b.count - a.count);
        const total = sorted.reduce((s, r) => s + r.count, 0);
        const rows: RecommendationTableRow[] = sorted.map((r) => ({
            label: r.label,
            count: r.count,
            pctOfTotal: total ? (r.count / total) * 100 : 0,
        }));
        if (rows.length) {
            rows.push({
                label: "סה״כ",
                count: total,
                pctOfTotal: 100,
                isTotal: true,
            });
        }
        this.tableRows = rows;
    }

    private rebuildEmergencyTable(): void {
        this.tableYears = [];
        const sorted = [...this.emergencyRows].sort(
            (a, b) => b.EmergencyReplacementRate - a.EmergencyReplacementRate,
        );
        this.tableRows = sorted.map((r) => ({
            label: `${r.Department} (בוטלו ${this.formatCount(r.CancelledCount)})`,
            count: r.EmergencyReplacedCount,
            pctOfTotal: r.EmergencyReplacementRate,
        }));
    }

    private rebuildKpis(): void {
        const years = this.yearsForChart;
        if (years.length) {
            const latest = years[years.length - 1];
            const latestTotal = this.yearlyTotals[latest] || 0;
            this.kpiLatestYearTotal =
                latestTotal > 0 ? this.formatCount(latestTotal) : "—";
            const yty = this.yearlyYty[latest];
            this.kpiYoYPct = yty?.pct != null ? this.formatPct(yty.pct) : "—";
        } else {
            this.kpiLatestYearTotal = "—";
            this.kpiYoYPct = "—";
        }

        const topDept = [...this.deptRows].sort((a, b) => b.Count - a.Count)[0];
        this.kpiTopDept = topDept
            ? `${topDept.Department} (${this.formatCount(topDept.Count)})`
            : "—";

        const topProcedure = [...this.procedureRows].sort(
            (a, b) => b.Count - a.Count,
        )[0];
        this.kpiTopProcedure = topProcedure
            ? `${topProcedure.Procedure} (${this.formatCount(topProcedure.Count)})`
            : "—";
    }
}
