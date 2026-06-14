import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostListener,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Observable, Subscription, forkJoin, merge, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { SurgeriesWaitTimesApiService } from "./surgeries-wait-times-api.service";
import {
    RecommendationAgingBucketRow,
    RecommendationBacklogRow,
    RecommendationDeptRow,
    RecommendationDoctorCountRow,
    RecommendationMonthRow,
    RecommendationMonthlyTrendRow,
    RecommendationProcedureRow,
    RecommendationTableRow,
    RecommendationView,
    RecommendationYearRow,
    RecommendationYty,
    SurgeryMonthRow,
} from "./surgeries-wait-times.models";
import { SurgeryDashboardFilterPanel } from "../surgery-dashboard-filter-panel";

@Component({
    selector: "app-surgeries-wait-times",
    templateUrl: "./surgeries-wait-times.component.html",
    styleUrls: ["./surgeries-wait-times.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesWaitTimesComponent
    implements OnInit, OnDestroy, SurgeryDashboardFilterPanel
{
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
    private surgeryMonthlyRows: SurgeryMonthRow[] = [];
    private surgeryMonthlyByDept = new Map<string, SurgeryMonthRow[]>();
    private deptSurgeryMonthlyLoading = false;
    private deptSurgeryMonthlySub?: Subscription;
    private deptRows: RecommendationDeptRow[] = [];
    private doctorCountRows: RecommendationDoctorCountRow[] = [];
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
    surgeryYtdTotals: { [year: number]: number } = {};
    trendYtdRecommendedTotals: { [year: number]: number } = {};
    trendYtdPerformedTotals: { [year: number]: number } = {};
    trendYtdTotalSurgeriesTotals: { [year: number]: number } = {};
    yearlyYty: { [year: number]: RecommendationYty } = {};
    surgeryYearlyYty: { [year: number]: RecommendationYty } = {};
    trendRecommendedYty: { [year: number]: RecommendationYty } = {};
    surgeryYtdCutoffMonth = 6;
    trendYtdCutoffMonth = 6;
    currentChartMonth = new Date().getMonth() + 1;

    private readonly chartMonthLimit = 6;
    private readonly agingBucketLimit = ["0-30", "31-90", "91-180"];
    private readonly maxWaitingDaysShown = 180;

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
        this.deptSurgeryMonthlySub?.unsubscribe();
        this.subs.unsubscribe();
    }

    // ── API ציבורי לדשבורד הראשי (סיידבר סינון) ──
    public hasActiveFilters(): boolean {
        return (
            (this.isDepartmentFilterApplicable() && !!this.selectedDepartment) ||
            (this.isDoctorFilterApplicable() && !!this.selectedDoctor)
        );
    }

    public isFilterSidebarOpen(): boolean {
        return this.showFilterSidebar;
    }

    public openFilterSidebar(): void {
        if (this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = true;
        this.notifyLayoutResize();
    }

    public closeFilterSidebar(): void {
        if (!this.showFilterSidebar) {
            return;
        }
        this.showFilterSidebar = false;
        this.notifyLayoutResize();
    }

    public toggleFilterSidebar(): void {
        this.showFilterSidebar = !this.showFilterSidebar;
        this.notifyLayoutResize();
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
                views: ["monthly"],
                run: () =>
                    this.api
                        .getRecommendationsMonthly(dept, forceRefresh)
                        .pipe(tap((d) => (this.monthlyRows = d))),
            },
            {
                key: "surgeryMonthly",
                views: ["yearly", "monthly"],
                run: () =>
                    this.api
                        .getMonthlySurgeryCounts(
                            this.baseYear,
                            dept,
                            forceRefresh,
                        )
                        .pipe(tap((d) => (this.surgeryMonthlyRows = d))),
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
                key: "byDoctor",
                views: ["byDoctor"],
                run: () =>
                    this.api
                        .getRecommendationsByDoctor(forceRefresh)
                        .pipe(tap((d) => (this.doctorCountRows = d))),
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
                views: ["conversion", "monthly", "yearly"],
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
            t.run().pipe(
                catchError((err) => {
                    console.error(
                        `Error loading wait-times dataset "${t.key}":`,
                        err,
                    );
                    return of(null);
                }),
                tap(() => this.onTaskLoaded(t.key, t.views)),
            ),
        );

        this.loadSub = merge(...streams).subscribe({
            complete: () => {
                this.loadInProgress = false;
                this.updateLoadError();
                if (this.view === "yearly" || this.view === "monthly") {
                    this.rebuildView();
                }
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
        if (key === "byDept" || key === "backlog") {
            this.ensureDeptSurgeryMonthlyLoaded();
        }
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

    /** מפתחות הנתונים הנדרשים לתצוגה הנוכחית — לבדיקת מצב טעינה פר-תצוגה. */
    private requiredKeys(view: RecommendationView): string[] {
        switch (view) {
            case "monthly":
                return ["surgeryMonthly"];
            case "byDept":
                return ["byDept"];
            case "byDoctor":
                return ["byDoctor"];
            case "procedures":
                return ["procedures"];
            case "conversion":
                return ["monthlyTrend"];
            case "waitTimes":
                return ["backlog"];
            case "aging":
                return ["aging"];
            default:
                return ["surgeryMonthly"];
        }
    }

    /** האם התצוגה הנוכחית עדיין ממתינה לנתונים שלה. */
    isViewLoading(): boolean {
        if (this.deptSurgeryMonthlyLoading && this.needsDeptSurgeryMonthly()) {
            return true;
        }
        if (!this.loadInProgress) {
            return false;
        }
        return this.requiredKeys(this.view).some(
            (k) => !this.loadedKeys.has(k),
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

    /** פילטר מחלקה — משפיע רק על תצוגת «לפי חודשים». */
    isDepartmentFilterApplicable(): boolean {
        return this.view === "monthly";
    }

    /** פילטר רופא ממליץ — משפיע רק על תצוגת «ניתוחים נפוצים». */
    isDoctorFilterApplicable(): boolean {
        return this.view === "procedures";
    }

    // ── אינטראקציות ──
    onViewChange(value: RecommendationView): void {
        this.view = value;
        this.isDeptOpen = false;
        this.isDoctorOpen = false;
        if (value === "byDept" && !this.deptRows.length) {
            this.reloadByDept();
            return;
        }
        if (value === "byDept" || value === "waitTimes") {
            this.ensureDeptSurgeryMonthlyLoaded();
        }
        this.rebuildView();
        this.cdr.markForCheck();
    }

    /** טעינה מחדש של המלצות לפי מחלקה בלבד */
    private reloadByDept(forceRefresh = true): void {
        this.loadedKeys.delete("byDept");
        if (this.view === "byDept") {
            this.isLoading = true;
            this.cdr.markForCheck();
        }
        this.api.getRecommendationsByDepartment(forceRefresh).subscribe({
            next: (rows) => {
                this.deptRows = rows;
                this.onTaskLoaded("byDept", ["byDept"]);
            },
            error: () => {
                this.deptRows = [];
                this.onTaskLoaded("byDept", ["byDept"]);
            },
        });
    }

    toggleDeptDropdown(event: Event): void {
        event.stopPropagation();
        if (!this.isDepartmentFilterApplicable()) {
            return;
        }
        this.isDoctorOpen = false;
        this.isDeptOpen = !this.isDeptOpen;
        this.cdr.markForCheck();
    }

    selectDepartment(dept: string, event: Event): void {
        event.stopPropagation();
        if (!this.isDepartmentFilterApplicable()) {
            return;
        }
        this.selectedDepartment = dept;
        this.isDeptOpen = false;
        this.loadAll();
    }

    clearDepartment(event: Event): void {
        event.stopPropagation();
        if (!this.isDepartmentFilterApplicable()) {
            return;
        }
        this.selectedDepartment = "";
        this.isDeptOpen = false;
        this.loadAll();
    }

    toggleDoctorDropdown(event: Event): void {
        event.stopPropagation();
        if (!this.isDoctorFilterApplicable() || this.doctorsLoading) {
            return;
        }
        this.isDeptOpen = false;
        this.isDoctorOpen = !this.isDoctorOpen;
        this.cdr.markForCheck();
    }

    selectDoctor(doctor: string, event: Event): void {
        event.stopPropagation();
        if (!this.isDoctorFilterApplicable()) {
            return;
        }
        this.selectedDoctor = doctor;
        this.isDoctorOpen = false;
        this.reloadProcedures();
    }

    clearDoctor(event: Event): void {
        event.stopPropagation();
        if (!this.isDoctorFilterApplicable()) {
            return;
        }
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
        if (!this.isDepartmentFilterApplicable()) {
            return "מחלקה: לא רלוונטי לתצוגה זו";
        }
        return this.selectedDepartment
            ? `מחלקה: ${this.selectedDepartment}`
            : "מחלקה: כל בית החולים";
    }

    getDoctorDisplay(): string {
        if (!this.isDoctorFilterApplicable()) {
            return "רופא ממליץ: לא רלוונטי לתצוגה זו";
        }
        return this.selectedDoctor
            ? `רופא ממליץ: ${this.selectedDoctor}`
            : "רופא ממליץ: כל הרופאים";
    }

    getDepartmentFilterTooltip(): string {
        return this.isDepartmentFilterApplicable()
            ? this.getDepartmentDisplay()
            : "פילטר מחלקה פעיל רק בתצוגת «לפי חודשים»";
    }

    getDoctorFilterTooltip(): string {
        if (!this.isDoctorFilterApplicable()) {
            return "פילטר רופא ממליץ פעיל רק בתצוגת «ניתוחים נפוצים»";
        }
        if (this.doctorsLoading) {
            return "טוען רשימת רופאים...";
        }
        return this.getDoctorDisplay();
    }

    getActiveFiltersSummary(): string {
        const parts: string[] = [];
        if (this.isDepartmentFilterApplicable() && this.selectedDepartment) {
            parts.push(`מחלקה: ${this.selectedDepartment}`);
        }
        if (this.isDoctorFilterApplicable() && this.selectedDoctor) {
            parts.push(`רופא ממליץ: ${this.selectedDoctor}`);
        }
        if (parts.length) {
            return parts.join(" · ");
        }
        if (!this.isDepartmentFilterApplicable() && !this.isDoctorFilterApplicable()) {
            return "אין פילטרי סיידבר פעילים בתצוגה זו";
        }
        return "כל בית החולים";
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
                return `ניתוחים שבוצעו — ${this.baseYear} (ינו–יוני)`;
            case "byDept":
                return "המלצות וניתוחים לפי מחלקה";
            case "byDoctor":
                return "המלצות לפי רופא ממליץ";
            case "procedures":
                return "ניתוחים מומלצים נפוצים";
            case "conversion":
                return "אחוז ביצוע מהמלצה לניתוח (12 חודשים)";
            case "waitTimes":
                return "מצבת ממתינים לניתוח לפי מחלקה";
            case "aging":
                return "התיישנות ההמתנה לפי טווחי ימים";
            default:
                return "ניתוחים שבוצעו — השוואה שנתית (ינו–יוני)";
        }
    }

    getPeriodCaption(): string {
        switch (this.view) {
            case "monthly":
                return `לשנה ${this.baseYear}, חודשים ינואר–יוני: כמה ניתוחים בוצעו בכל חודש.`;
            case "byDept":
                return "לכל מחלקה: כמה המלצות לניתוח נרשמו, וכמה ניתוחים בוצעו באותה שנה (ינו–יוני).";
            case "byDoctor":
                return "פילוח ההמלצות לניתוח לפי הרופא הממליץ.";
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
                return `לכל שנה — סיכום ינואר עד יוני: כמה ניתוחים בוצעו, בהשוואה בין חמש השנים האחרונות.`;
        }
    }

    /** האם להציג את כרטיסי הסיכום השנתי (רלוונטי רק לתצוגות שנתי/חודשי). */
    get showYearSummary(): boolean {
        return this.view === "yearly";
    }

    /** הסבר קצר על אופן החישוב — בשפה פשוטה למשתמש. */
    getCalculationFormula(): string {
        switch (this.view) {
            case "monthly":
                return `בכל חודש (ינואר–יוני ${this.baseYear}): כמה ניתוחים בוצעו.`;
            case "byDept":
                return "לכל מחלקה: כמה המלצות לניתוח נרשמו, וכמה ניתוחים בוצעו באותה תקופה.";
            case "byDoctor":
                return "כמה המלצות לניתוח נתנו על ידי כל רופא ממליץ.";
            case "procedures":
                return this.selectedDoctor
                    ? `אילו ניתוחים הכי הרבה המליץ ${this.selectedDoctor}.`
                    : "אילו סוגי ניתוחים הומלצו הכי הרבה.";
            case "conversion":
                return "בכל חודש: כמה מטופלים קיבלו המלצה, וכמה מהם באמת עברו ניתוח.";
            case "waitTimes":
                return "לכל מחלקה (עד 180 יום המתנה): ממוצע ימי ההמתנה, וכמה ניתוחים בוצעו באותה שנה (ינו–יוני).";
            case "aging":
                return "כמה ממתינים לניתוח יש בטווחי המתנה של עד 180 יום.";
            default:
                return "השוואה בין שנים (ינואר–יוני): כמה ניתוחים בוצעו בכל שנה.";
        }
    }

    /** מקור המידע — בשפה פשוטה למשתמש. */
    getCalculationSource(): string {
        switch (this.view) {
            case "monthly":
            case "yearly":
                return "רישום הניתוחים בבית החולים";
            case "byDept":
                return "רישום המלצות ורישום הניתוחים לפי מחלקה";
            case "byDoctor":
                return "רישום המלצות לפי רופא ממליץ";
            case "procedures":
                return "רישום ההמלצות לפי סוג ניתוח";
            case "conversion":
                return "מעקב המלצות וביצוע ניתוחים";
            case "waitTimes":
                return "רשימת הממתינים ורישום הניתוחים לפי מחלקה";
            case "aging":
                return "רשימת הממתינים לניתוח";
            default:
                return "מערכת ההמלצות לניתוח ורישום הניתוחים";
        }
    }

    getCurrentChartMonthLabel(): string {
        return (
            this.monthLabelsFull[this.currentChartMonth - 1] ||
            String(this.currentChartMonth)
        );
    }

    getSurgeryYtdMonthLabel(): string {
        const m = this.surgeryYtdCutoffMonth;
        return this.monthLabelsFull[m - 1] || "יוני";
    }

    getYearCardSubtitle(year: number): string {
        if (this.view === "yearly") {
            const yty = this.surgeryYearlyYty[year];
            if (yty?.pct != null && Number.isFinite(yty.pct)) {
                return `${this.formatPct(yty.pct)} מול ${year - 1}`;
            }
            return `ינו–${this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1]}`;
        }
        return this.getYearSubtitle(year);
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
        if (this.view === "yearly") {
            return this.formatCount(this.surgeryYtdTotals[year] || 0);
        }
        return this.formatCount(this.yearlyTotals[year] || 0);
    }

    getTableColumnHeader(col: number): string {
        if (this.view === "monthly") {
            return this.monthLabelsShort[col - 1] || String(col);
        }
        return String(col);
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
            case "byDoctor":
                return "רופא ממליץ";
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
            case "byDept":
                return "המלצות";
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
            case "byDept":
                return "ניתוחים שבוצעו";
            case "aging":
                return "אחוז";
            default:
                return "אחוז";
        }
    }

    formatTableSecondaryValue(row: RecommendationTableRow): string {
        if (this.view === "byDept" || this.view === "waitTimes") {
            return this.formatCount(row.pctOfTotal || 0);
        }
        return this.formatPctOfTotal(row.pctOfTotal);
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
            case "byDoctor":
                return "מספר ההמלצות לניתוח שרשם הרופא הממליץ.";
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
                return "כמה ניתוחים בוצעו במחלקה השנה (ינו–יוני).";
            case "byDept":
                return "כמה ניתוחים בוצעו במחלקה השנה (ינו–יוני).";
            case "aging":
                return "אחוז הממתינים בטווח זה מתוך כלל הממתינים (עד 180 יום).";
            case "byDoctor":
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

    private distinctSurgeryYears(): number[] {
        return [...new Set(this.surgeryMonthlyRows.map((r) => r.Year))]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private distinctMonthlyComparisonYears(): number[] {
        const month = this.currentChartMonth;
        const fromRec = this.monthlyRows
            .filter((r) => r.Month === month)
            .map((r) => r.Year);
        const fromSurg = this.surgeryMonthlyRows
            .filter((r) => r.Month === month)
            .map((r) => r.Year);
        return [...new Set([...fromRec, ...fromSurg])]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private distinctTrendYears(): number[] {
        const cutoff = this.trendYtdCutoffMonth;
        return [
            ...new Set(
                this.monthlyTrendRows
                    .filter(
                        (r) => r.Month >= 1 && r.Month <= cutoff && r.Year > 0,
                    )
                    .map((r) => r.Year),
            ),
        ]
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private monthlyChartMonths(): number[] {
        return Array.from({ length: this.chartMonthLimit }, (_, i) => i + 1);
    }

    private sumRecommendedTrendYtd(
        year: number,
        cutoffMonth: number,
    ): number {
        return this.monthlyTrendRows
            .filter(
                (r) =>
                    r.Year === year &&
                    r.Month >= 1 &&
                    r.Month <= cutoffMonth,
            )
            .reduce((sum, r) => sum + (r.RecommendedCount || 0), 0);
    }

    private sumPerformedTrendYtd(year: number, cutoffMonth: number): number {
        return this.monthlyTrendRows
            .filter(
                (r) =>
                    r.Year === year &&
                    r.Month >= 1 &&
                    r.Month <= cutoffMonth,
            )
            .reduce((sum, r) => sum + (r.PerformedCount || 0), 0);
    }

    private sumTotalSurgeriesTrendYtd(
        year: number,
        cutoffMonth: number,
    ): number {
        let sum = 0;
        for (let month = 1; month <= cutoffMonth; month++) {
            sum += this.totalSurgeriesForMonth(year, month);
        }
        return sum;
    }

    private totalSurgeriesForMonth(year: number, month: number): number {
        const trendTotal = this.trendRowForMonth(year, month)?.TotalSurgeries ?? 0;
        if (trendTotal > 0) {
            return trendTotal;
        }
        return this.surgeryCountForMonth(year, month);
    }

    private surgeriesForDepartment(department: string): number {
        const dept = department.trim();
        if (!dept) {
            return 0;
        }
        const rows = this.surgeryMonthlyByDept.get(dept) ?? [];
        return this.sumSurgeryYtdForRows(
            rows,
            this.baseYear,
            this.chartMonthLimit,
        );
    }

    private sumSurgeryYtdForRows(
        rows: SurgeryMonthRow[],
        year: number,
        cutoffMonth: number,
    ): number {
        return rows
            .filter(
                (r) =>
                    r.Year === year &&
                    r.Month >= 1 &&
                    r.Month <= cutoffMonth,
            )
            .reduce((sum, r) => sum + (r.Count || 0), 0);
    }

    private departmentsWithSurgeries(): { Department: string; Count: number }[] {
        const names = this.departmentNamesForSurgeryLoad();
        return names
            .map((Department) => ({
                Department,
                Count: this.surgeriesForDepartment(Department),
            }))
            .filter((r) => r.Count > 0)
            .sort((a, b) => b.Count - a.Count);
    }

    private departmentNamesForSurgeryLoad(): string[] {
        const names = new Set<string>();
        this.deptRows.forEach((r) => {
            if (r.Department) {
                names.add(r.Department.trim());
            }
        });
        this.backlogRows.forEach((r) => {
            if (r.Department) {
                names.add(r.Department.trim());
            }
        });
        return [...names];
    }

    private needsDeptSurgeryMonthly(): boolean {
        return this.view === "byDept" || this.view === "waitTimes";
    }

    private ensureDeptSurgeryMonthlyLoaded(forceRefresh = false): void {
        if (!this.needsDeptSurgeryMonthly()) {
            return;
        }
        const needed = this.departmentNamesForSurgeryLoad().filter(
            (dept) => forceRefresh || !this.surgeryMonthlyByDept.has(dept),
        );
        if (!needed.length) {
            return;
        }
        this.deptSurgeryMonthlySub?.unsubscribe();
        this.deptSurgeryMonthlyLoading = true;
        this.cdr.markForCheck();
        this.deptSurgeryMonthlySub = forkJoin(
            needed.map((dept) =>
                this.api.getMonthlySurgeryCounts(this.baseYear, dept).pipe(
                    tap((rows) => this.surgeryMonthlyByDept.set(dept, rows)),
                    catchError(() => {
                        this.surgeryMonthlyByDept.set(dept, []);
                        return of([] as SurgeryMonthRow[]);
                    }),
                ),
            ),
        ).subscribe({
            complete: () => {
                this.deptSurgeryMonthlyLoading = false;
                if (this.needsDeptSurgeryMonthly()) {
                    this.rebuildView();
                }
                this.cdr.markForCheck();
            },
            error: () => {
                this.deptSurgeryMonthlyLoading = false;
                this.cdr.markForCheck();
            },
        });
        this.subs.add(this.deptSurgeryMonthlySub);
    }

    private distinctMonthlyTrendYears(): number[] {
        const month = this.currentChartMonth;
        return [
            ...new Set(
                this.monthlyTrendRows
                    .filter((r) => r.Month === month)
                    .map((r) => r.Year),
            ),
        ]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
    }

    private trendRowForMonth(
        year: number,
        month: number,
    ): RecommendationMonthlyTrendRow | undefined {
        return this.monthlyTrendRows.find(
            (r) => r.Year === year && r.Month === month,
        );
    }

    private recommendedTrendForMonth(year: number, month: number): number {
        return this.trendRowForMonth(year, month)?.RecommendedCount ?? 0;
    }

    private performedFromRecommendationForMonth(
        year: number,
        month: number,
    ): number {
        return this.trendRowForMonth(year, month)?.PerformedCount ?? 0;
    }

    private conversionRateForMonth(year: number, month: number): number {
        const row = this.trendRowForMonth(year, month);
        if (!row) {
            return 0;
        }
        if (row.ConversionRate > 0) {
            return row.ConversionRate;
        }
        return row.RecommendedCount > 0
            ? (row.PerformedCount / row.RecommendedCount) * 100
            : 0;
    }

    private recommendationForMonth(year: number, month: number): number {
        return (
            this.monthlyRows.find(
                (r) => r.Year === year && r.Month === month,
            )?.Count ?? 0
        );
    }

    private computeSurgeryYtdCutoffMonth(): number {
        const rows = this.surgeryMonthlyRows;
        if (!rows.length) {
            return Math.min(
                this.chartMonthLimit,
                this.getCalendarYtdCutoffMonth(),
            );
        }
        const baseYear = this.baseYear;
        const currentYearRows = rows.filter(
            (r) => r.Year === baseYear && (r.Count || 0) > 0,
        );
        let maxMonth = 0;
        for (const r of currentYearRows) {
            if (r.Month > maxMonth) {
                maxMonth = r.Month;
            }
        }
        if (maxMonth > 0) {
            return Math.min(maxMonth, this.chartMonthLimit);
        }
        let bestYear = -1;
        let bestMonth = -1;
        for (const r of rows) {
            if ((r.Count || 0) <= 0) {
                continue;
            }
            if (
                r.Year > bestYear ||
                (r.Year === bestYear && r.Month > bestMonth)
            ) {
                bestYear = r.Year;
                bestMonth = r.Month;
            }
        }
        if (bestMonth > 0) {
            return Math.min(bestMonth, this.chartMonthLimit);
        }
        return Math.min(
            this.chartMonthLimit,
            this.getCalendarYtdCutoffMonth(),
        );
    }

    private getCalendarYtdCutoffMonth(): number {
        const cal = new Date().getMonth();
        return cal === 0 ? 12 : cal;
    }

    private sumSurgeryYtdForYear(year: number, cutoffMonth: number): number {
        return this.surgeryMonthlyRows
            .filter(
                (r) =>
                    r.Year === year &&
                    r.Month >= 1 &&
                    r.Month <= cutoffMonth,
            )
            .reduce((sum, r) => sum + (r.Count || 0), 0);
    }

    private surgeryCountForMonth(year: number, month: number): number {
        return (
            this.surgeryMonthlyRows.find(
                (r) => r.Year === year && r.Month === month,
            )?.Count ?? 0
        );
    }

    private rebuildYearSummaries(): void {
        const recYears = this.distinctYears();
        this.yearlyTotals = {};
        this.yearlyYty = {};
        recYears.forEach((y) => {
            this.yearlyTotals[y] =
                this.yearlyRows.find((r) => r.Year === y)?.Count ?? 0;
        });
        recYears.forEach((y) => {
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

        this.surgeryYtdCutoffMonth = this.computeSurgeryYtdCutoffMonth();
        this.trendYtdCutoffMonth = this.chartMonthLimit;
        this.currentChartMonth = new Date().getMonth() + 1;
        const surgeryYears = this.distinctSurgeryYears();
        this.yearsForChart =
            this.view === "monthly"
                ? [this.baseYear]
                : surgeryYears.length
                  ? surgeryYears
                  : recYears;
        this.surgeryYtdTotals = {};
        this.surgeryYearlyYty = {};
        surgeryYears.forEach((y) => {
            this.surgeryYtdTotals[y] = this.sumSurgeryYtdForYear(
                y,
                this.surgeryYtdCutoffMonth,
            );
        });
        surgeryYears.forEach((y) => {
            const total = this.surgeryYtdTotals[y] ?? 0;
            const prevTotal = this.surgeryYtdTotals[y - 1];
            if (prevTotal == null) {
                this.surgeryYearlyYty[y] = { diff: 0, pct: null };
                return;
            }
            const diff = total - prevTotal;
            const pct = prevTotal !== 0 ? (diff / prevTotal) * 100 : null;
            this.surgeryYearlyYty[y] = { diff, pct };
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
            case "byDoctor":
                this.buildByDoctorChart();
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
        const years = this.distinctSurgeryYears();
        const cutoffLabel =
            this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1] || "יוני";
        this.chartColumns = [
            "שנה",
            {
                type: "number",
                label: "ניתוחים שבוצעו (ינו–" + cutoffLabel + ")",
            },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = years.map((y, i) => {
            const total = this.surgeryYtdTotals[y] || 0;
            return [
                String(y),
                total,
                total ? this.formatCount(total) : "",
                `color: ${this.palette[i % this.palette.length]}`,
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            hAxis: {
                title: `תקופה מקבילה: ינואר–${cutoffLabel}`,
                textStyle: { fontSize: 13, bold: true },
            },
            vAxis: {
                ...this.createBaseChartOptions().vAxis,
                title: "ניתוחים שבוצעו",
            },
        };
    }

    private buildMonthlyChart(): void {
        const year = this.baseYear;
        const months = this.monthlyChartMonths();
        this.chartColumns = [
            "חודש",
            { type: "number", label: "ניתוחים שבוצעו" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = months.map((month, i) => {
            const total = this.surgeryCountForMonth(year, month);
            return [
                this.monthLabelsShort[month - 1] || String(month),
                total,
                total ? this.formatCount(total) : "",
                `color: ${this.palette[i % this.palette.length]}`,
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            legend: { position: "none" },
            hAxis: {
                title: `שנה ${year}`,
                textStyle: { fontSize: 13, bold: true },
            },
            vAxis: {
                ...this.createBaseChartOptions().vAxis,
                title: "ניתוחים שבוצעו",
            },
        };
    }

    private buildByDeptChart(): void {
        this.ensureDeptSurgeryMonthlyLoaded();
        const top = [...this.deptRows]
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 14);
        this.chartType = "BarChart";
        this.chartColumns = [
            "מחלקה",
            { type: "number", label: "המלצות" },
            { type: "string", role: "annotation" },
            { type: "number", label: "ניתוחים שבוצעו" },
            { type: "string", role: "annotation" },
        ];
        this.chartData = top.map((r) => {
            const surgeries = this.surgeriesForDepartment(r.Department);
            return [
                r.Department,
                r.Count,
                this.formatCount(r.Count),
                surgeries,
                surgeries ? this.formatCount(surgeries) : "",
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            colors: ["#2563eb", "#f59e0b"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 12, bold: true },
            },
            chartArea: { left: "34%", top: 40, width: "58%", height: "80%" },
            hAxis: {
                title: "כמות",
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

    private buildByDoctorChart(): void {
        const top = [...this.doctorCountRows]
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 14);
        this.chartType = "BarChart";
        this.chartColumns = [
            "רופא ממליץ",
            { type: "number", label: "המלצות" },
            { type: "string", role: "annotation" },
            { type: "string", role: "style" },
        ];
        this.chartData = top.map((r, i) => [
            r.Doctor,
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
        this.ensureDeptSurgeryMonthlyLoaded();
        const top = [...this.backlogRows]
            .filter(
                (r) =>
                    r.WaitingCount > 0 &&
                    r.AvgWaitingDays <= this.maxWaitingDaysShown,
            )
            .sort((a, b) => b.AvgWaitingDays - a.AvgWaitingDays)
            .slice(0, 14);
        this.chartType = "BarChart";
        this.chartColumns = [
            "מחלקה",
            { type: "number", label: "ימי המתנה (ממוצע)" },
            { type: "string", role: "annotation" },
            { type: "number", label: "ניתוחים שבוצעו" },
            { type: "string", role: "annotation" },
        ];
        this.chartData = top.map((r) => {
            const days = Math.round(r.AvgWaitingDays);
            const surgeries = this.surgeriesForDepartment(r.Department);
            return [
                r.Department,
                days,
                `${this.formatCount(days)} ימים`,
                surgeries,
                surgeries ? this.formatCount(surgeries) : "",
            ];
        });
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
                title: "ימים / ניתוחים",
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
        return [...this.agingRows]
            .filter((r) => this.agingBucketLimit.includes(r.BucketName.trim()))
            .sort(
                (a, b) =>
                    this.bucketOrder(a.BucketName, this.agingBucketLimit) -
                    this.bucketOrder(b.BucketName, this.agingBucketLimit),
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
                this.rebuildByDeptTable();
                break;
            case "byDoctor":
                this.rebuildSingleValueTable(
                    this.doctorCountRows.map((r) => ({
                        label: r.Doctor,
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
        const years = this.distinctSurgeryYears();
        this.tableYears = years;

        const totalPerYear: { [year: number]: number } = {};
        years.forEach((y) => {
            totalPerYear[y] = this.surgeryYtdTotals[y] || 0;
        });

        const cutoffLabel =
            this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1] || "יוני";
        this.tableRows = [
            {
                label: `ניתוחים שבוצעו (ינו–${cutoffLabel})`,
                perYear: totalPerYear,
                isTotal: true,
            },
        ];
    }

    private rebuildMonthlyTable(): void {
        const year = this.baseYear;
        const months = this.monthlyChartMonths();
        this.tableYears = months;

        const totalPerMonth: { [year: number]: number } = {};
        months.forEach((month) => {
            totalPerMonth[month] = this.surgeryCountForMonth(year, month);
        });

        this.tableRows = [
            {
                label: `ניתוחים שבוצעו (${year})`,
                perYear: totalPerMonth,
                isTotal: true,
            },
        ];
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

    private rebuildByDeptTable(): void {
        this.ensureDeptSurgeryMonthlyLoaded();
        this.tableYears = [];
        const sorted = [...this.deptRows].sort((a, b) => b.Count - a.Count);
        this.tableRows = sorted.map((r) => ({
            label: r.Department,
            count: r.Count,
            pctOfTotal: this.surgeriesForDepartment(r.Department),
        }));
    }

    private rebuildWaitTimesTable(): void {
        this.ensureDeptSurgeryMonthlyLoaded();
        this.tableYears = [];
        const sorted = [...this.backlogRows]
            .filter(
                (r) =>
                    r.WaitingCount > 0 &&
                    r.AvgWaitingDays <= this.maxWaitingDaysShown,
            )
            .sort((a, b) => b.AvgWaitingDays - a.AvgWaitingDays);
        this.tableRows = sorted.map((r) => {
            const scheduled = r.ScheduledCount ?? 0;
            const suffix = scheduled > 0
                ? `, מתוכם ${this.formatCount(scheduled)} נקבעו לתור`
                : "";
            return {
                label: `${r.Department} (${this.formatCount(r.WaitingCount)} ממתינים${suffix})`,
                count: Math.round(r.AvgWaitingDays),
                pctOfTotal: this.surgeriesForDepartment(r.Department),
            };
        });
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
        const surgeryYears = this.distinctSurgeryYears();
        if (surgeryYears.length) {
            const latest = surgeryYears[surgeryYears.length - 1];
            const latestTotal = this.surgeryYtdTotals[latest] || 0;
            this.kpiLatestYearTotal =
                latestTotal > 0 ? this.formatCount(latestTotal) : "—";
            const yty = this.surgeryYearlyYty[latest];
            this.kpiYoYPct = yty?.pct != null ? this.formatPct(yty.pct) : "—";
        } else {
            const years = this.yearsForChart;
            if (years.length) {
                const latest = years[years.length - 1];
                const latestTotal = this.yearlyTotals[latest] || 0;
                this.kpiLatestYearTotal =
                    latestTotal > 0 ? this.formatCount(latestTotal) : "—";
                const yty = this.yearlyYty[latest];
                this.kpiYoYPct =
                    yty?.pct != null ? this.formatPct(yty.pct) : "—";
            } else {
                this.kpiLatestYearTotal = "—";
                this.kpiYoYPct = "—";
            }
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
