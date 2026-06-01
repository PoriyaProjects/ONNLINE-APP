import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Observable, Subscription, concat } from "rxjs";
import { tap } from "rxjs/operators";
import { SurgeriesCancellationsApiService } from "./surgeries-cancellations-api.service";
import {
    CancellationFilterParams,
    CancellationMonthRow,
    CancellationReasonDeptRow,
    CancellationReasonRow,
    CancellationTableRow,
    CancellationView,
    CancellationYearRow,
    CancellationYty,
    RoomOutcomeRow,
} from "./surgeries-cancellations.models";

@Component({
    selector: "app-surgeries-cancellations",
    templateUrl: "./surgeries-cancellations.component.html",
    styleUrls: ["./surgeries-cancellations.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesCancellationsComponent implements OnInit, OnDestroy {
    readonly pageTitle = "ביטולים";

    view: CancellationView = "yearly";

    isLoading = true;
    isChartLoading = false;
    loadError = "";

    /** Datasets that finished loading — drives progressive (per-view) rendering. */
    private loadedKeys = new Set<string>();
    /** True while the sequential load chain is still running. */
    private loadInProgress = false;
    private loadSub?: Subscription;

    selectedDepartment = "";
    departmentOptions: string[] = [];
    isDeptOpen = false;

    showFilterSidebar = true;
    showChartFullModal = false;
    chartViewEpoch = 0;

    private yearlyRows: CancellationYearRow[] = [];
    private monthlyRows: CancellationMonthRow[] = [];
    private reasonRows: CancellationReasonRow[] = [];
    private reasonDeptRows: CancellationReasonDeptRow[] = [];
    private roomRows: RoomOutcomeRow[] = [];

    private subs = new Subscription();
    private readonly baseYear = new Date().getFullYear();

    chartType = "ColumnChart";
    chartData: any[] = [];
    chartColumns: any[] = [];
    chartOptions: any = this.createBaseChartOptions();

    yearsForChart: number[] = [];
    yearlyTotals: { [year: number]: number } = {};
    yearlyYty: { [year: number]: CancellationYty } = {};

    tableRows: CancellationTableRow[] = [];
    tableYears: number[] = [];

    kpiLatestYearTotal = "—";
    kpiYoYPct = "—";
    kpiTopReason = "—";
    kpiUrgentRate = "—";

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
        private api: SurgeriesCancellationsApiService,
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

    // ── טעינת נתונים (סדרתית + פרוגרסיבית) ──
    // טוענים endpoint אחד אחרי השני לפי סדר התצוגות, ומציגים כל חתך ברגע שהגיע —
    // כך שהמשתמש רואה את התצוגה הראשונה (שנתי) מיד, בלי להמתין לכל הקריאות.
    loadAll(forceRefresh = false): void {
        this.loadSub?.unsubscribe();
        this.loadedKeys.clear();
        this.isLoading = true;
        this.loadInProgress = true;
        this.cdr.markForCheck();

        const params = this.buildParams();

        const tasks: {
            key: string;
            views: CancellationView[];
            run: () => Observable<any>;
        }[] = [
            {
                key: "yearly",
                views: ["yearly"],
                run: () =>
                    this.api
                        .getCancellationsYearly(params, forceRefresh)
                        .pipe(tap((d) => (this.yearlyRows = d))),
            },
            {
                key: "monthly",
                views: ["monthly", "yearly"],
                run: () =>
                    this.api
                        .getCancellationsMonthly(params, forceRefresh)
                        .pipe(tap((d) => (this.monthlyRows = d))),
            },
            {
                key: "reasons",
                views: ["reasons"],
                run: () =>
                    this.api
                        .getTopCancellationReasons(params, forceRefresh)
                        .pipe(tap((d) => (this.reasonRows = d))),
            },
            {
                key: "reasonsByDept",
                views: ["reasons-by-dept"],
                run: () =>
                    this.api
                        .getCancellationReasonsByDepartment(params, forceRefresh)
                        .pipe(tap((d) => (this.reasonDeptRows = d))),
            },
            {
                key: "room",
                views: ["room"],
                run: () =>
                    this.api
                        .getRoomOutcome(params, forceRefresh)
                        .pipe(tap((d) => (this.roomRows = d))),
            },
        ];

        const streams = tasks.map((t) =>
            t.run().pipe(tap(() => this.onTaskLoaded(t.key, t.views))),
        );

        this.loadSub = concat(...streams).subscribe({
            complete: () => {
                this.loadInProgress = false;
                this.isChartLoading = false;
                this.updateLoadError();
                this.cdr.markForCheck();
            },
            error: () => {
                this.yearlyRows = [];
                this.monthlyRows = [];
                this.reasonRows = [];
                this.reasonDeptRows = [];
                this.roomRows = [];
                this.loadInProgress = false;
                this.isLoading = false;
                this.isChartLoading = false;
                this.loadError = "שגיאה בטעינת נתוני ביטולים מהשרת.";
                this.snackBar.open(this.loadError, "סגור", { duration: 5000 });
                this.rebuildView();
                this.cdr.markForCheck();
            },
        });
        this.subs.add(this.loadSub);
    }

    /** נקרא בכל פעם שחתך נתונים מסוים סיים להיטען. */
    private onTaskLoaded(key: string, views: CancellationView[]): void {
        this.loadedKeys.add(key);
        this.isLoading = false;
        this.isChartLoading = false;
        this.hydrateDepartmentOptions();
        // מרעננים את הגרף רק אם הנתון שהגיע שייך לתצוגה הנוכחית (מונע ריצוד),
        // אחרת מספיק לעדכן את כרטיסי ה-KPI.
        if (views.includes(this.view)) {
            this.rebuildView();
        } else {
            this.rebuildKpis();
        }
        this.cdr.markForCheck();
    }

    private updateLoadError(): void {
        if (
            !this.yearlyRows.length &&
            !this.monthlyRows.length &&
            !this.reasonRows.length &&
            !this.roomRows.length
        ) {
            this.loadError =
                "לא התקבלו נתוני ביטולים מהשרת. ודא ש-GetCancellationsYearly פעיל.";
        } else {
            this.loadError = "";
        }
    }

    /** מפתח הנתון הנדרש לתצוגה הנוכחית — לבדיקת מצב טעינה פר-תצוגה. */
    private requiredKey(view: CancellationView): string {
        switch (view) {
            case "monthly":
                return "monthly";
            case "reasons":
                return "reasons";
            case "reasons-by-dept":
                return "reasonsByDept";
            case "room":
                return "room";
            default:
                return "yearly";
        }
    }

    /** האם התצוגה הנוכחית עדיין ממתינה לנתונים שלה. */
    isViewLoading(): boolean {
        return (
            this.loadInProgress &&
            !this.loadedKeys.has(this.requiredKey(this.view))
        );
    }

    private buildParams(): CancellationFilterParams {
        return {
            baseYear: String(this.baseYear),
            department: this.selectedDepartment ?? "",
        };
    }

    /** רשימת מחלקות לסינון — נשמרת מהמשיכה הכלל-בית-חולימית */
    private hydrateDepartmentOptions(): void {
        if (this.selectedDepartment) {
            return;
        }
        const depts = [
            ...new Set(
                this.reasonDeptRows.map((r) => r.Department).filter(Boolean),
            ),
        ].sort((a, b) => a.localeCompare(b, "he"));
        if (depts.length) {
            this.departmentOptions = depts;
        }
    }

    // ── אינטראקציות ──
    onViewChange(value: CancellationView): void {
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
                return "ביטולים לפי חודש";
            case "reasons":
                return "סיבות ביטול נפוצות";
            case "room":
                return "תוצאת החדר לאחר ביטול";
            case "reasons-by-dept":
                return "סיבות ביטול לפי מחלקה";
            default:
                return "מספר ביטולים שנתי";
        }
    }

    getPeriodCaption(): string {
        switch (this.view) {
            case "monthly":
                return "השוואת חודשים לאורך חמש השנים האחרונות.";
            case "reasons":
                return "הסיבות הנפוצות ביותר לביטול בתקופה.";
            case "room":
                return "האם החדר נשאר ריק או נכנס ניתוח דחוף במקום.";
            case "reasons-by-dept":
                return "פילוח סיבות הביטול המובילות לפי מחלקה.";
            default:
                return "מגמת ביטולים שנתית והשוואה לשנה קודמת (YTY).";
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
        row: CancellationTableRow,
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
        row: CancellationTableRow,
        year: number,
    ): { [klass: string]: boolean } {
        const d = this.getYearDiff(row, year);
        if (!d) {
            return {};
        }
        // מגמת ביטולים: עלייה = שלילי (אדום), ירידה = חיובי (ירוק)
        return {
            "agg-negative": d.diff > 0,
            "agg-positive": d.diff < 0,
        };
    }

    isTotalTableRow(row: CancellationTableRow): boolean {
        return !!row.isTotal;
    }

    getYearValue(row: CancellationTableRow, year: number): number {
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
            case "reasons":
                return "סיבת ביטול";
            case "room":
                return "תוצאה";
            case "reasons-by-dept":
                return "מחלקה / סיבה";
            default:
                return "שנה";
        }
    }

    trackByLabel(_: number, row: CancellationTableRow): string {
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
            lines.push([this.getTableEntityLabel(), ...this.tableYears.map(String)].join(","));
            for (const row of this.tableRows) {
                lines.push(
                    [
                        `"${row.label}"`,
                        ...this.tableYears.map((y) => String(row.perYear?.[y] ?? 0)),
                    ].join(","),
                );
            }
        } else {
            lines.push(["ישות", "כמות", "אחוז"].join(","));
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
        a.download = "surgeries-cancellations.csv";
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
                title: "מספר ביטולים",
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
            case "reasons":
                this.buildReasonsChart();
                break;
            case "room":
                this.buildRoomChart();
                break;
            case "reasons-by-dept":
                this.buildReasonsByDeptChart();
                break;
            default:
                this.buildYearlyChart();
        }
    }

    private buildYearlyChart(): void {
        const years = this.yearsForChart;
        this.chartColumns = [
            "שנה",
            { type: "number", label: "ביטולים" },
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

    private buildReasonsChart(): void {
        const top = [...this.reasonRows]
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 12);
        this.chartType = "BarChart";
        this.chartColumns = [
            "סיבה",
            { type: "number", label: "ביטולים" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = top.map((r, i) => [
            r.Reason || "לא צוינה סיבה",
            r.Count,
            this.formatCount(r.Count),
            `color: ${this.palette[i % this.palette.length]}`,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            chartArea: { left: "34%", top: 16, width: "58%", height: "86%" },
            hAxis: {
                title: "מספר ביטולים",
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

    private buildRoomChart(): void {
        const total = this.roomRows.reduce((s, r) => s + r.Count, 0);
        this.chartType = "PieChart";
        this.chartColumns = ["תוצאה", "כמות"];
        this.chartData = this.roomRows.map((r) => [r.Outcome, r.Count]);
        const colorByOutcome: Record<string, string> = {
            "נכנס ניתוח דחוף": "#10b981",
            "חדר נשאר ריק": "#ef4444",
        };
        const slices: any = {};
        this.roomRows.forEach((r, i) => {
            slices[i] = {
                color:
                    colorByOutcome[r.Outcome] ||
                    this.palette[i % this.palette.length],
            };
        });
        this.chartOptions = {
            pieHole: 0.42,
            legend: {
                position: "top",
                alignment: "center",
                textStyle: { fontSize: 13, bold: true },
            },
            chartArea: { left: 10, top: 50, width: "90%", height: "78%" },
            slices,
            pieSliceText: "value-and-percentage",
            pieSliceTextStyle: { fontSize: 13, bold: true },
            tooltip: { trigger: "focus", text: "both" },
            title: total ? "" : undefined,
        };
    }

    private buildReasonsByDeptChart(): void {
        const depts = [
            ...new Set(this.reasonDeptRows.map((r) => r.Department).filter(Boolean)),
        ];
        // Top reasons overall become the stacks; remainder folded into "אחר".
        const reasonTotals = new Map<string, number>();
        this.reasonDeptRows.forEach((r) => {
            reasonTotals.set(
                r.Reason,
                (reasonTotals.get(r.Reason) || 0) + r.Count,
            );
        });
        const topReasons = [...reasonTotals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([k]) => k);
        const reasonSet = new Set(topReasons);
        const stacks = [...topReasons, "אחר"];

        // Order departments by total cancellations (desc), cap to 12 for readability.
        const deptTotals = new Map<string, number>();
        this.reasonDeptRows.forEach((r) => {
            deptTotals.set(
                r.Department,
                (deptTotals.get(r.Department) || 0) + r.Count,
            );
        });
        const orderedDepts = depts
            .sort((a, b) => (deptTotals.get(b) || 0) - (deptTotals.get(a) || 0))
            .slice(0, 12);

        const cols: any[] = ["מחלקה"];
        stacks.forEach((s) => cols.push({ type: "number", label: s }));
        this.chartColumns = cols;
        this.chartData = orderedDepts.map((dept) => {
            const row: any[] = [dept];
            stacks.forEach((stack) => {
                if (stack === "אחר") {
                    const val = this.reasonDeptRows
                        .filter(
                            (r) =>
                                r.Department === dept && !reasonSet.has(r.Reason),
                        )
                        .reduce((s, r) => s + r.Count, 0);
                    row.push(val);
                } else {
                    const val = this.reasonDeptRows
                        .filter(
                            (r) => r.Department === dept && r.Reason === stack,
                        )
                        .reduce((s, r) => s + r.Count, 0);
                    row.push(val);
                }
            });
            return row;
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            isStacked: true,
            legend: {
                position: "top",
                alignment: "end",
                maxLines: 3,
                textStyle: { fontSize: 11, bold: true },
            },
            chartArea: { left: 64, top: 70, width: "84%", height: "56%" },
            hAxis: { slantedText: true, slantedTextAngle: 30, textStyle: { fontSize: 11 } },
        };
    }

    // ── טבלה ──
    private rebuildTable(): void {
        switch (this.view) {
            case "monthly":
                this.rebuildMonthlyTable();
                break;
            case "reasons":
                this.rebuildSingleValueTable(
                    this.reasonRows.map((r) => ({
                        label: r.Reason || "לא צוינה סיבה",
                        count: r.Count,
                    })),
                );
                break;
            case "room":
                this.rebuildSingleValueTable(
                    this.roomRows.map((r) => ({
                        label: r.Outcome,
                        count: r.Count,
                    })),
                );
                break;
            case "reasons-by-dept":
                this.rebuildReasonsByDeptTable();
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
                label: "סה״כ ביטולים",
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
        const rows: CancellationTableRow[] = sorted.map((r) => ({
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

    private rebuildReasonsByDeptTable(): void {
        this.tableYears = [];
        const sorted = [...this.reasonDeptRows].sort((a, b) => {
            if (a.Department !== b.Department) {
                return a.Department.localeCompare(b.Department, "he");
            }
            return b.Count - a.Count;
        });
        const total = sorted.reduce((s, r) => s + r.Count, 0);
        this.tableRows = sorted.slice(0, 60).map((r) => ({
            label: `${r.Department} · ${r.Reason || "לא צוינה סיבה"}`,
            count: r.Count,
            pctOfTotal: total ? (r.Count / total) * 100 : 0,
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

        const topReason = [...this.reasonRows].sort(
            (a, b) => b.Count - a.Count,
        )[0];
        this.kpiTopReason = topReason
            ? `${topReason.Reason || "לא צוינה סיבה"} (${this.formatCount(topReason.Count)})`
            : "—";

        const roomTotal = this.roomRows.reduce((s, r) => s + r.Count, 0);
        const urgent =
            this.roomRows.find((r) => r.Outcome.includes("דחוף"))?.Count ?? 0;
        this.kpiUrgentRate =
            roomTotal > 0
                ? `${((urgent / roomTotal) * 100).toFixed(1)}%`
                : "—";
    }
}
