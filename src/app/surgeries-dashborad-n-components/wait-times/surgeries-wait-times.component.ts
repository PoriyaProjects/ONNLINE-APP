import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Observable, Subscription, merge } from "rxjs";
import { tap } from "rxjs/operators";
import { SurgeriesWaitTimesApiService } from "./surgeries-wait-times-api.service";
import {
    RecommendationAgingBucketRow,
    RecommendationBacklogRow,
    RecommendationDeptRow,
    RecommendationMonthRow,
    RecommendationMonthlyTrendRow,
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
    loadError = "";

    /** Datasets that finished loading — drives progressive (per-view) rendering. */
    private loadedKeys = new Set<string>();
    /** True while the sequential load chain is still running. */
    private loadInProgress = false;
    private loadSub?: Subscription;

    selectedDepartment = "";
    departmentOptions: string[] = [];
    isDeptOpen = false;

    selectedDoctor = "";
    doctorOptions: string[] = [];
    isDoctorOpen = false;
    doctorsLoading = true;

    showFilterSidebar = true;
    showChartFullModal = false;
    chartViewEpoch = 0;

    private yearlyRows: RecommendationYearRow[] = [];
    private monthlyRows: RecommendationMonthRow[] = [];
    private deptRows: RecommendationDeptRow[] = [];
    private procedureRows: RecommendationProcedureRow[] = [];
    private monthlyTrendRows: RecommendationMonthlyTrendRow[] = [];
    private backlogRows: RecommendationBacklogRow[] = [];
    private agingRows: RecommendationAgingBucketRow[] = [];

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
        this.isDoctorOpen = false;
    }

    // ── טעינת נתונים (מקבילית + פרוגרסיבית) ──
    // מפעילים את כל ה-endpoints במקביל ומציגים כל חתך ברגע שהגיע — כך שזמן הטעינה
    // הכולל = הקריאה האיטית ביותר (ולא סכום כולן), והתצוגה הראשונה (שנתי) מופיעה מיד.
    loadAll(forceRefresh = false): void {
        this.loadSub?.unsubscribe();
        this.loadedKeys.clear();
        this.isLoading = true;
        this.loadInProgress = true;
        this.doctorsLoading = true;
        this.cdr.markForCheck();

        const dept = this.selectedDepartment;

        const tasks: {
            key: string;
            views: RecommendationView[];
            run: () => Observable<any>;
        }[] = [
            {
                key: "yearly",
                views: ["yearly"],
                run: () =>
                    this.api
                        .getRecommendationsYearly(forceRefresh)
                        .pipe(tap((d) => (this.yearlyRows = d))),
            },
            {
                key: "monthly",
                views: ["monthly", "yearly"],
                run: () =>
                    this.api
                        .getRecommendationsMonthly(dept, forceRefresh)
                        .pipe(tap((d) => (this.monthlyRows = d))),
            },
            {
                key: "byDept",
                views: ["byDept"],
                run: () =>
                    this.api
                        .getRecommendationsByDepartment(forceRefresh)
                        .pipe(tap((d) => (this.deptRows = d))),
            },
            {
                key: "doctors",
                views: [],
                run: () =>
                    this.api
                        .getRecommendationDoctorsList(forceRefresh)
                        .pipe(
                            tap((d) => {
                                this.doctorOptions = d;
                                this.doctorsLoading = false;
                            }),
                        ),
            },
            {
                key: "procedures",
                views: ["procedures"],
                run: () =>
                    this.api
                        .getTopRecommendedProcedures(
                            this.selectedDoctor,
                            forceRefresh,
                        )
                        .pipe(tap((d) => (this.procedureRows = d))),
            },
            {
                key: "monthlyTrend",
                views: ["conversion"],
                run: () =>
                    this.api
                        .getRecommendationMonthlyTrend(forceRefresh)
                        .pipe(tap((d) => (this.monthlyTrendRows = d))),
            },
            {
                key: "backlog",
                views: ["waitTimes"],
                run: () =>
                    this.api
                        .getRecommendationBacklog(forceRefresh)
                        .pipe(tap((d) => (this.backlogRows = d))),
            },
            {
                key: "aging",
                views: ["aging"],
                run: () =>
                    this.api
                        .getRecommendationAgingBuckets(forceRefresh)
                        .pipe(tap((d) => (this.agingRows = d))),
            },
        ];

        const streams = tasks.map((t) =>
            t.run().pipe(tap(() => this.onTaskLoaded(t.key, t.views))),
        );

        this.loadSub = merge(...streams).subscribe({
            complete: () => {
                this.loadInProgress = false;
                this.updateLoadError();
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadInProgress = false;
                this.isLoading = false;
                this.doctorsLoading = false;
                this.loadError = "שגיאה בטעינת נתוני המלצות מהשרת.";
                this.snackBar.open(this.loadError, "סגור", { duration: 5000 });
                this.cdr.markForCheck();
            },
        });
        this.subs.add(this.loadSub);
    }

    /** נקרא בכל פעם שחתך נתונים מסוים סיים להיטען. */
    private onTaskLoaded(key: string, views: RecommendationView[]): void {
        this.loadedKeys.add(key);
        this.isLoading = false;
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
            !this.deptRows.length &&
            !this.procedureRows.length
        ) {
            this.loadError =
                "לא התקבלו נתוני המלצות מהשרת. ודא ש-GetRecommendationsYearly פעיל.";
        } else {
            this.loadError = "";
        }
    }

    /** מפתח הנתון הנדרש לתצוגה הנוכחית — לבדיקת מצב טעינה פר-תצוגה. */
    private requiredKey(view: RecommendationView): string {
        switch (view) {
            case "monthly":
                return "monthly";
            case "byDept":
                return "byDept";
            case "procedures":
                return "procedures";
            case "conversion":
                return "monthlyTrend";
            case "waitTimes":
                return "backlog";
            case "aging":
                return "aging";
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

    toggleDoctorDropdown(event: Event): void {
        event.stopPropagation();
        this.isDeptOpen = false;
        this.isDoctorOpen = !this.isDoctorOpen;
        this.cdr.markForCheck();
    }

    selectDoctor(doctor: string, event: Event): void {
        event.stopPropagation();
        this.selectedDoctor = doctor;
        this.isDoctorOpen = false;
        this.reloadProcedures();
    }

    clearDoctor(event: Event): void {
        event.stopPropagation();
        this.selectedDoctor = "";
        this.isDoctorOpen = false;
        this.reloadProcedures();
    }

    resetFilters(): void {
        if (!this.hasActiveFilters()) {
            return;
        }
        this.selectedDepartment = "";
        this.selectedDoctor = "";
        this.isDeptOpen = false;
        this.isDoctorOpen = false;
        this.loadAll();
    }

    /** טעינה מחדש של ניתוחים מומלצים בלבד (לפי רופא ממליץ). */
    private reloadProcedures(forceRefresh = false): void {
        this.loadedKeys.delete("procedures");
        if (this.view === "procedures") {
            this.isLoading = true;
            this.cdr.markForCheck();
        }
        this.api
            .getTopRecommendedProcedures(this.selectedDoctor, forceRefresh)
            .subscribe({
                next: (rows) => {
                    this.procedureRows = rows;
                    this.onTaskLoaded("procedures", ["procedures"]);
                },
                error: () => {
                    this.procedureRows = [];
                    this.onTaskLoaded("procedures", ["procedures"]);
                },
            });
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

    getDoctorDisplay(): string {
        return this.selectedDoctor
            ? `רופא ממליץ: ${this.selectedDoctor}`
            : "רופא ממליץ: כל הרופאים";
    }

    getActiveFiltersSummary(): string {
        const parts: string[] = [];
        if (this.selectedDepartment) {
            parts.push(`מחלקה: ${this.selectedDepartment}`);
        }
        if (this.selectedDoctor) {
            parts.push(`רופא ממליץ: ${this.selectedDoctor}`);
        }
        return parts.length ? parts.join(" · ") : "כל בית החולים";
    }

    hasActiveFilters(): boolean {
        return !!this.selectedDepartment || !!this.selectedDoctor;
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
        if (!this.chartData?.length || this.isViewLoading()) {
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
            case "conversion":
                return "אחוז ביצוע מהמלצה לניתוח (12 חודשים)";
            case "waitTimes":
                return "מצבת ממתינים לניתוח לפי מחלקה";
            case "aging":
                return "התיישנות ההמתנה לפי טווחי ימים";
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
                return this.selectedDoctor
                    ? `הניתוחים שהמליץ עליהם ${this.selectedDoctor} — לפי מספר ההמלצות.`
                    : "הניתוחים המומלצים הנפוצים ביותר בתקופה.";
            case "conversion":
                return "מתוך ההמלצות לניתוח שניתנו בכל חודש — איזה אחוז מהן בוצע בפועל (12 חודשים אחרונים).";
            case "waitTimes":
                return "מטופלים שסומנו «מומלץ לניתוח» וטרם בוצע להם ניתוח — מספרם וממוצע ימי ההמתנה עד היום, לפי מחלקה.";
            case "aging":
                return "התפלגות הממתינים הפעילים לפי טווחי ימי המתנה.";
            default:
                return "מגמת המלצות שנתית והשוואה לשנה קודמת (YTY).";
        }
    }

    /** האם להציג את כרטיסי הסיכום השנתי (רלוונטי רק לתצוגות שנתי/חודשי). */
    get showYearSummary(): boolean {
        return this.view === "yearly" || this.view === "monthly";
    }

    /** נוסחת החישוב המדויקת של התצוגה הנוכחית — מוצגת בקובית ההסבר. */
    getCalculationFormula(): string {
        switch (this.view) {
            case "monthly":
                return "סך ההמלצות לניתוח שניתנו בכל חודש, בפילוח לפי שנה. כל עמודה = מספר ההמלצות באותו חודש ושנה.";
            case "byDept":
                return "סך ההמלצות לניתוח לפי המחלקה המַפנה. אחוז = המלצות המחלקה ÷ סך כל ההמלצות × 100.";
            case "procedures":
                return this.selectedDoctor
                    ? `מספר ההמלצות לכל סוג ניתוח שרשם הרופא ${this.selectedDoctor}. אחוז = ספירת הניתוח ÷ סך ההמלצות של הרופא × 100.`
                    : "מספר ההמלצות לכל סוג ניתוח. אחוז = ספירת הניתוח ÷ סך כל ההמלצות × 100.";
            case "conversion":
                return "לכל חודש: «המלצות שנתנו» (עמודה כחולה) = כמה מטופלים סומנו «מומלץ לניתוח» באותו חודש. «המלצות שנותחו» (עמודה ירוקה) = מתוך אותם מטופלים, כמה באמת עברו ניתוח אחר כך — אותם אנשים, לא ניתוחים אחרים. הקו האדום = אחוז הביצוע — כמה נותחו מתוך שהומלצו. הקו הכתום (אם מופיע) = מתוך כל הניתוחים שבוצעו בבית החולים באותו חודש, כמה אחוז הגיעו מהמלצה.";
            case "waitTimes":
                return "ממוצע ימי המתנה לכל מחלקה = ממוצע(היום − תאריך ההמלצה), עבור מטופלים שסומנו «מומלץ לניתוח» וטרם בוצע להם ניתוח. הסדרה הכתומה (כשקיימת) = ממוצע הימים מההמלצה ועד שנקבע תור לניתוח; בטבלה מוצג גם כמה מהמומלצים כבר נקבע להם תור לניתוח.";
            case "aging":
                return "מספר הממתינים שהומלצו לניתוח וטרם נותחו, מקובצים לפי טווח ימי המתנה (היום − תאריך ההמלצה): 0-30, 31-90, 91-180, 181-365, 365+.";
            default:
                return "סך ההמלצות לניתוח שניתנו בכל שנה (חמש שנים אחרונות). שינוי שנתי (YTY) = (שנה נוכחית − שנה קודמת) ÷ שנה קודמת × 100.";
        }
    }

    /** שם ה-endpoint שממנו נשלפים נתוני התצוגה הנוכחית. */
    getCalculationSource(): string {
        switch (this.view) {
            case "monthly":
                return this.selectedDepartment
                    ? "GetDepartmentMonthlyRecommendations"
                    : "GetRecommendationsMonthly";
            case "byDept":
                return "GetRecommendationsByDepartment";
            case "procedures":
                return this.selectedDoctor
                    ? `GetTopRecommendedProcedures (רופא: ${this.selectedDoctor})`
                    : "GetTopRecommendedProcedures";
            case "conversion":
                return "GetRecommendationMonthlyTrend (12 חודשים אחרונים)";
            case "waitTimes":
                return "GetRecommendationBacklog";
            case "aging":
                return "GetRecommendationAgingBuckets";
            default:
                return "GetRecommendationsYearly";
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
            case "waitTimes":
                return "מחלקה";
            case "conversion":
                return "חודש";
            case "aging":
                return "טווח ימים";
            default:
                return "שנה";
        }
    }

    getTableValueLabel(): string {
        switch (this.view) {
            case "conversion":
                return "בוצעו";
            case "waitTimes":
                return "ימי המתנה (ממוצע)";
            case "aging":
                return "מקרים";
            default:
                return "כמות";
        }
    }

    getTablePctLabel(): string {
        switch (this.view) {
            case "conversion":
                return "אחוז ביצוע";
            case "waitTimes":
                return "% מהממתינים";
            case "aging":
                return "אחוז";
            default:
                return "אחוז";
        }
    }

    /** הסבר על עמודת הערך בטבלה — מוצג כטולטיפ על הכותרת. */
    getTableValueTooltip(): string {
        switch (this.view) {
            case "conversion":
                return "מספר המטופלים שהומלצו לניתוח באותו חודש ובוצע להם ניתוח בפועל במועד מאוחר יותר.";
            case "waitTimes":
                return "ממוצע הימים מאז סימון «מומלץ לניתוח» ועד היום — רק עבור מטופלים שהומלצו וטרם בוצע להם ניתוח (לא כולל תורים אחרים).";
            case "aging":
                return "מספר הממתינים (שהומלצו לניתוח וטרם נותחו) שנמצאים בטווח ימי ההמתנה.";
            case "byDept":
                return "מספר ההמלצות לניתוח שמקורן במחלקה.";
            case "procedures":
                return "מספר ההמלצות לסוג הניתוח.";
            default:
                return "";
        }
    }

    /** הסבר על עמודת האחוז בטבלה — מוצג כטולטיפ על הכותרת. */
    getTablePctTooltip(): string {
        switch (this.view) {
            case "conversion":
                return "אחוז הביצוע = המלצות שנותחו ÷ המלצות שנתנו באותו חודש × 100.";
            case "waitTimes":
                return "חלק המחלקה מסך כל הממתינים לניתוח בבית החולים (מטופלים שהומלצו וטרם נותחו) = ממתיני המחלקה ÷ סך כל הממתינים × 100.";
            case "aging":
                return "אחוז הממתינים בטווח זה מתוך כלל הממתינים לניתוח.";
            case "byDept":
            case "procedures":
                return "אחוז מסך כל ההמלצות לניתוח.";
            default:
                return "";
        }
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
            case "conversion":
                this.buildConversionChart();
                break;
            case "waitTimes":
                this.buildWaitTimesChart();
                break;
            case "aging":
                this.buildAgingChart();
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

    /**
     * מגמת המרה חודשית — עמודות כמות + קו אחוז המרה (ציר משני).
     * אם השרת מחזיר TotalSurgeries מתווספים: עמודת «סך ניתוחים» וקו «% מומלצים מהניתוחים».
     */
    private buildConversionChart(): void {
        const rows = this.sortedTrendRows();
        const hasShare = rows.some(
            (r) =>
                (r.TotalSurgeries ?? 0) > 0 ||
                (r.RecommendedShareOfPerformed ?? 0) > 0,
        );
        this.chartType = "ComboChart";

        // Each numeric column is followed by an annotation column so every bar
        // shows its value; annotation/role columns are not counted as series.
        const columns: any[] = [
            "חודש",
            { type: "number", label: "המלצות שנתנו" },
            { type: "string", role: "annotation" },
            { type: "number", label: "המלצות שנותחו" },
            { type: "string", role: "annotation" },
        ];
        if (hasShare) {
            columns.push({ type: "number", label: "סך ניתוחים" });
            columns.push({ type: "string", role: "annotation" });
        }
        columns.push({ type: "number", label: "אחוז ביצוע" });
        columns.push({ type: "string", role: "annotation" });
        if (hasShare) {
            columns.push({ type: "number", label: "% מומלצים מהניתוחים" });
            columns.push({ type: "string", role: "annotation" });
        }
        this.chartColumns = columns;

        this.chartData = rows.map((r) => {
            const row: any[] = [
                this.trendMonthLabel(r),
                r.RecommendedCount,
                this.formatCount(r.RecommendedCount),
                r.PerformedCount,
                this.formatCount(r.PerformedCount),
            ];
            if (hasShare) {
                const total = r.TotalSurgeries ?? 0;
                row.push(total, this.formatCount(total));
            }
            row.push(r.ConversionRate, `${Math.round(r.ConversionRate)}%`);
            if (hasShare) {
                const share = this.recommendedShare(r);
                row.push(share, `${Math.round(share)}%`);
            }
            return row;
        });

        const convIdx = hasShare ? 3 : 2;
        const series: any = {
            0: { targetAxisIndex: 0, color: "#2563eb" },
            1: { targetAxisIndex: 0, color: "#10b981" },
        };
        if (hasShare) {
            series[2] = { targetAxisIndex: 0, color: "#cbd5e1" };
        }
        series[convIdx] = {
            type: "line",
            targetAxisIndex: 1,
            color: "#ef4444",
            lineWidth: 3,
            pointSize: 5,
        };
        if (hasShare) {
            series[convIdx + 1] = {
                type: "line",
                targetAxisIndex: 1,
                color: "#f59e0b",
                lineWidth: 3,
                pointSize: 5,
                lineDashStyle: [5, 4],
            };
        }

        this.chartOptions = {
            ...this.createBaseChartOptions(),
            seriesType: "bars",
            series,
            vAxes: {
                0: { title: "כמות", minValue: 0 },
                1: {
                    title: "אחוז",
                    format: "#'%'",
                    minValue: 0,
                    maxValue: 100,
                },
            },
            vAxis: {},
            chartArea: { left: 64, top: 56, width: "80%", height: "62%" },
            annotations: { textStyle: { fontSize: 11, bold: true } },
        };
    }

    /** אחוז הניתוחים שבוצעו שמקורם בהמלצה (עם חישוב גיבוי בצד-לקוח). */
    private recommendedShare(r: RecommendationMonthlyTrendRow): number {
        if ((r.RecommendedShareOfPerformed ?? 0) > 0) {
            return r.RecommendedShareOfPerformed as number;
        }
        const total = r.TotalSurgeries ?? 0;
        return total > 0 ? (r.PerformedCount / total) * 100 : 0;
    }

    /**
     * מצבת ממתינים — ממוצע ימי המתנה לפי מחלקה.
     * אם השרת מחזיר AvgDaysToSchedule מתווספת סדרה «ימים עד קביעת תור».
     */
    private buildWaitTimesChart(): void {
        const top = [...this.backlogRows]
            .filter((r) => r.WaitingCount > 0)
            .sort((a, b) => b.AvgWaitingDays - a.AvgWaitingDays)
            .slice(0, 14);
        this.chartType = "BarChart";

        const hasSchedule = top.some((r) => (r.AvgDaysToSchedule ?? 0) > 0);

        if (hasSchedule) {
            // Two grouped series → use a legend instead of per-bar styling.
            this.chartColumns = [
                "מחלקה",
                { type: "number", label: "ימי המתנה (טרם נותחו)" },
                { type: "number", label: "ימים עד קביעת תור" },
            ];
            this.chartData = top.map((r) => [
                r.Department,
                Math.round(r.AvgWaitingDays),
                Math.round(r.AvgDaysToSchedule ?? 0),
            ]);
            this.chartOptions = {
                ...this.createBaseChartOptions(),
                colors: ["#2563eb", "#f59e0b"],
                legend: {
                    position: "top",
                    alignment: "end",
                    textStyle: { fontSize: 12, bold: true },
                },
                chartArea: { left: "34%", top: 40, width: "56%", height: "80%" },
                hAxis: {
                    title: "ימים (ממוצע)",
                    format: "#",
                    minValue: 0,
                    textStyle: { fontSize: 12 },
                },
                vAxis: { textStyle: { fontSize: 12, bold: true } },
            };
            return;
        }

        this.chartColumns = [
            "מחלקה",
            { type: "number", label: "ימי המתנה" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = top.map((r, i) => [
            r.Department,
            Math.round(r.AvgWaitingDays),
            `${this.formatCount(Math.round(r.AvgWaitingDays))} ימים`,
            `color: ${this.palette[i % this.palette.length]}`,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            chartArea: { left: "34%", top: 16, width: "56%", height: "86%" },
            hAxis: {
                title: "ממוצע ימי המתנה",
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

    /** התיישנות ההמתנה — התפלגות הממתינים לפי טווחי ימים */
    private buildAgingChart(): void {
        const rows = this.sortedAgingRows();
        this.chartType = "ColumnChart";
        this.chartColumns = [
            "טווח ימים",
            { type: "number", label: "מקרים" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = rows.map((r, i) => [
            r.BucketName,
            r.CasesCount,
            this.formatCount(r.CasesCount),
            `color: ${this.palette[i % this.palette.length]}`,
        ]);
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            vAxis: {
                title: "מספר ממתינים",
                format: "#",
                minValue: 0,
                textStyle: { fontSize: 13, bold: true },
            },
            annotations: {
                alwaysOutside: true,
                textStyle: { fontSize: 12, bold: true },
            },
        };
    }

    /** סדר עולה לפי שנה/חודש למגמת ההמרה */
    private sortedTrendRows(): RecommendationMonthlyTrendRow[] {
        return [...this.monthlyTrendRows].sort(
            (a, b) => a.Year - b.Year || a.Month - b.Month,
        );
    }

    private trendMonthLabel(r: RecommendationMonthlyTrendRow): string {
        const m = this.monthLabelsShort[r.Month - 1] ?? String(r.Month);
        return `${m} ${String(r.Year).slice(-2)}`;
    }

    /** סדר קבוע לטווחי ההתיישנות */
    private sortedAgingRows(): RecommendationAgingBucketRow[] {
        const order = ["0-30", "31-90", "91-180", "181-365", "365+"];
        return [...this.agingRows].sort(
            (a, b) =>
                this.bucketOrder(a.BucketName, order) -
                this.bucketOrder(b.BucketName, order),
        );
    }

    private bucketOrder(name: string, order: string[]): number {
        const idx = order.indexOf(name);
        return idx === -1 ? order.length : idx;
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
            case "conversion":
                this.rebuildConversionTable();
                break;
            case "waitTimes":
                this.rebuildWaitTimesTable();
                break;
            case "aging":
                this.rebuildAgingTable();
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

    private rebuildConversionTable(): void {
        this.tableYears = [];
        const sorted = this.sortedTrendRows();
        const totalRecommended = sorted.reduce(
            (s, r) => s + r.RecommendedCount,
            0,
        );
        const totalPerformed = sorted.reduce(
            (s, r) => s + r.PerformedCount,
            0,
        );
        const rows: RecommendationTableRow[] = sorted.map((r) => ({
            label: `${this.trendMonthLabel(r)} (המלצות ${this.formatCount(r.RecommendedCount)})`,
            count: r.PerformedCount,
            pctOfTotal: r.ConversionRate,
        }));
        if (rows.length) {
            rows.push({
                label: "סה״כ 12 חודשים",
                count: totalPerformed,
                pctOfTotal: totalRecommended
                    ? (totalPerformed / totalRecommended) * 100
                    : 0,
                isTotal: true,
            });
        }
        this.tableRows = rows;
    }

    private rebuildWaitTimesTable(): void {
        this.tableYears = [];
        const sorted = [...this.backlogRows]
            .filter((r) => r.WaitingCount > 0)
            .sort((a, b) => b.AvgWaitingDays - a.AvgWaitingDays);
        const totalWaiting = sorted.reduce((s, r) => s + r.WaitingCount, 0);
        const rows: RecommendationTableRow[] = sorted.map((r) => {
            const scheduled = r.ScheduledCount ?? 0;
            const suffix = scheduled > 0
                ? `, מתוכם ${this.formatCount(scheduled)} מומלצים נקבע להם תור`
                : "";
            return {
                label: `${r.Department} (${this.formatCount(r.WaitingCount)} ממתינים${suffix})`,
                count: Math.round(r.AvgWaitingDays),
                pctOfTotal: totalWaiting
                    ? (r.WaitingCount / totalWaiting) * 100
                    : 0,
            };
        });
        this.tableRows = rows;
    }

    private rebuildAgingTable(): void {
        this.tableYears = [];
        const sorted = this.sortedAgingRows();
        const total = sorted.reduce((s, r) => s + r.CasesCount, 0);
        const rows: RecommendationTableRow[] = sorted.map((r) => ({
            label: r.BucketName,
            count: r.CasesCount,
            pctOfTotal: total ? (r.CasesCount / total) * 100 : 0,
        }));
        if (rows.length) {
            rows.push({
                label: "סה״כ ממתינים",
                count: total,
                pctOfTotal: 100,
                isTotal: true,
            });
        }
        this.tableRows = rows;
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
