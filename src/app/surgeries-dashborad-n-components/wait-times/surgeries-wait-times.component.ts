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
import { finalize, tap } from "rxjs/operators";
import {
    DepartmentFilterOption,
    inferSurgeryDepartmentValue,
    isValidSurgeryDepartmentValue,
    surgeryDepartmentMatchKeys,
} from "./surgery-department-contract";
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
    SurgeryByDepartmentRow,
    SurgeryCountByDeptRow,
    SurgeryCountByDoctorRow,
    SurgeryMonthRow,
} from "./surgeries-wait-times.models";
import { SurgeriesWaitTimesApiService } from "./surgeries-wait-times-api.service";

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
    private loadSessionStart = 0;
    private taskStartTimes = new Map<string, number>();
    private taskDurationHistory = new Map<string, number[]>();
    private taskLabels = new Map<string, string>();
    private loadTickTimer: ReturnType<typeof setInterval> | null = null;

    private static readonly DEFAULT_TASK_DURATION_MS: Record<string, number> =
        {
            yearlyRec: 6_000,
            recMonthly: 8_000,
            deptDetail: 18_000,
            countByDept: 22_000,
            doctorSurg: 15_000,
            surgeryMonthlyHospital: 14_000,
            surgeryMonthlyScoped: 14_000,
            surgeriesByDept: 16_000,
            recByDoctor: 12_000,
            procedures: 10_000,
            monthlyTrend: 8_000,
            backlog: 8_000,
            aging: 8_000,
        };

    selectedDepartment: DepartmentFilterOption | null = null;
    departmentOptions: DepartmentFilterOption[] = [];
    isDeptOpen = false;
    selectedDoctor: string | null = null;
    doctorFilterOptions: string[] = [];
    isDoctorOpen = false;

    showFilterSidebar = true;
    showChartFullModal = false;
    chartViewEpoch = 0;

    private yearlyRows: RecommendationYearRow[] = [];
    private monthlyRows: RecommendationMonthRow[] = [];
    private surgeryMonthlyRows: SurgeryMonthRow[] = [];
    /** ניתוחים חודשיים — תמיד כלל בית החולים (לגרף לפי חודשים) */
    private surgeryMonthlyHospitalRows: SurgeryMonthRow[] = [];
    private deptRows: RecommendationDeptRow[] = [];
    private surgeryDeptRawRows: SurgeryByDepartmentRow[] = [];
    private countByDeptRawRows: SurgeryCountByDeptRow[] = [];
    private surgeryDeptByKey = new Map<string, number>();
    private doctorRecommendationRows: RecommendationDoctorCountRow[] = [];
    private doctorSurgeryRawRows: SurgeryCountByDoctorRow[] = [];
    private procedureRows: RecommendationProcedureRow[] = [];
    private monthlyTrendRows: RecommendationMonthlyTrendRow[] = [];
    private backlogRows: RecommendationBacklogRow[] = [];
    private agingRows: RecommendationAgingBucketRow[] = [];

    private subs = new Subscription();
    private readonly baseYear = new Date().getFullYear();
    /** שנה נבחרת להשוואת המלצות מול ניתוחים (תצוגות לפי רופא/מחלקה) */
    comparisonYear = this.baseYear;

    chartType = "ColumnChart";
    chartData: any[] = [];
    chartColumns: any[] = [];
    chartOptions: any = this.createBaseChartOptions();

    yearsForChart: number[] = [];
    yearlyTotals: { [year: number]: number } = {};
    surgeryYtdTotals: { [year: number]: number } = {};
    yearlyYty: { [year: number]: RecommendationYty } = {};
    surgeryYearlyYty: { [year: number]: RecommendationYty } = {};
    /** חודש אחרון בחלון YTD (1–6) לפי נתוני GetMonthlyCounts */
    surgeryYtdCutoffMonth = 6;
    /** חודש התצוגה בגרף החודשי — חודש לוח השנה הנוכחי */
    currentChartMonth = new Date().getMonth() + 1;

    /** חודשים 01–06 בחלון YTD השנתי */
    private readonly chartMonthLimit = 6;

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
        this.subs.add(
            this.api
                .getSurgeryDepartmentOptions(false, this.baseYear)
                .subscribe((opts) => {
                this.departmentOptions = opts;
                this.cdr.markForCheck();
            }),
        );
        this.loadAll();
    }

    ngOnDestroy(): void {
        this.stopLoadTick();
        this.subs.unsubscribe();
    }

    @HostListener("document:click")
    onDocumentClick(): void {
        this.isDeptOpen = false;
        this.isDoctorOpen = false;
    }

    // ── טעינת נתונים (מקבילית + פרוגרסיבית) ──
    // כל קריאת API נטענת בנפרד — ברגע שמגיע מידע, התצוגה מתעדכנת מיד.
    loadAll(forceRefresh = false): void {
        this.loadSub?.unsubscribe();
        this.loadedKeys.clear();
        this.taskStartTimes.clear();
        this.taskLabels.clear();
        this.loadSessionStart = Date.now();
        this.isLoading = true;
        this.loadInProgress = true;
        this.startLoadTick();
        this.cdr.markForCheck();

        const deptValue = this.isDepartmentFilterEnabled
            ? this.selectedDepartmentValue
            : "";
        const monthlySurgeryDept = this.effectiveMonthlySurgeryDepartment;

        const tasks: {
            key: string;
            views: RecommendationView[];
            label: string;
            run: () => Observable<any>;
        }[] = [
            {
                key: "yearlyRec",
                views: ["yearly"],
                label: "סיכום שנתי של ההמלצות",
                run: () =>
                    this.api
                        .getRecommendationsYearly(forceRefresh)
                        .pipe(tap((d) => (this.yearlyRows = d))),
            },
            {
                key: "recMonthly",
                views: ["monthly", "yearly"],
                label: "המלצות לפי חודשים",
                run: () =>
                    this.api
                        .getRecommendationsMonthly("", forceRefresh)
                        .pipe(tap((d) => (this.monthlyRows = d))),
            },
            {
                key: "deptDetail",
                views: ["monthly", "byDept", "byDoctor"],
                label: "פירוט המלצות לפי מחלקה",
                run: () =>
                    this.api
                        .getRecommendationsByDepartment(forceRefresh)
                        .pipe(
                            tap((d) => {
                                this.deptRows = d;
                                this.rebuildDoctorFilterOptions();
                            }),
                        ),
            },
            {
                key: "countByDept",
                views: ["monthly", "byDept", "byDoctor"],
                label: "ניתוחים לפי מחלקה",
                run: () =>
                    this.api
                        .getCountByDept(this.baseYear, forceRefresh)
                        .pipe(
                            tap((d) => {
                                this.countByDeptRawRows = d;
                                this.rebuildDoctorFilterOptions();
                            }),
                        ),
            },
            {
                key: "doctorSurg",
                views: ["monthly", "byDoctor"],
                label: "ניתוחים לפי רופא",
                run: () =>
                    this.api
                        .getSurgeriesByDoctor(
                            this.baseYear,
                            monthlySurgeryDept || deptValue,
                            forceRefresh,
                        )
                        .pipe(
                            tap((d) => {
                                this.doctorSurgeryRawRows = d;
                                this.rebuildDoctorFilterOptions();
                            }),
                        ),
            },
            {
                key: "surgeryMonthlyHospital",
                views: ["monthly", "yearly"],
                label: "ניתוחים שבוצעו לפי חודש",
                run: () =>
                    this.api
                        .getMonthlySurgeryCounts(
                            this.baseYear,
                            "",
                            forceRefresh,
                        )
                        .pipe(
                            tap((hospital) => {
                                this.surgeryMonthlyHospitalRows = hospital;
                                if (!monthlySurgeryDept) {
                                    this.surgeryMonthlyRows = hospital;
                                }
                            }),
                        ),
            },
            {
                key: "surgeryMonthlyScoped",
                views: ["monthly", "yearly"],
                label: "ניתוחים לפי מחלקה",
                run: () =>
                    monthlySurgeryDept
                        ? this.api
                              .getMonthlySurgeryCounts(
                                  this.baseYear,
                                  monthlySurgeryDept,
                                  forceRefresh,
                              )
                              .pipe(
                                  tap(
                                      (scoped) =>
                                          (this.surgeryMonthlyRows = scoped),
                                  ),
                              )
                        : of(null),
            },
            {
                key: "surgeriesByDept",
                views: ["byDept"],
                label: "סיכום ניתוחים לפי מחלקה",
                run: () =>
                    this.api
                        .getSurgeriesByDepartment(this.baseYear, forceRefresh)
                        .pipe(
                            tap((d) => {
                                this.surgeryDeptRawRows = d;
                                this.rebuildSurgeryDeptLookup();
                            }),
                        ),
            },
            {
                key: "recByDoctor",
                views: ["byDoctor"],
                label: "המלצות לפי רופא",
                run: () =>
                    this.api
                        .getRecommendationsByDoctor(
                            deptValue,
                            undefined,
                            forceRefresh,
                        )
                        .pipe(
                            tap((d) => (this.doctorRecommendationRows = d)),
                        ),
            },
            {
                key: "procedures",
                views: ["procedures"],
                label: "המלצות נפוצות",
                run: () =>
                    this.api
                        .getTopRecommendedProcedures(
                            "",
                            this.selectedDepartmentValue,
                            forceRefresh,
                        )
                        .pipe(tap((d) => (this.procedureRows = d))),
            },
            {
                key: "monthlyTrend",
                views: ["conversion"],
                label: "אחוז ביצוע ההמלצות",
                run: () =>
                    this.api
                        .getRecommendationMonthlyTrend(forceRefresh)
                        .pipe(tap((d) => (this.monthlyTrendRows = d))),
            },
            {
                key: "backlog",
                views: ["waitTimes"],
                label: "ממתינים להמלצה",
                run: () =>
                    this.api
                        .getRecommendationBacklog(forceRefresh)
                        .pipe(tap((d) => (this.backlogRows = d))),
            },
            {
                key: "aging",
                views: ["aging"],
                label: "התיישנות ההמתנה",
                run: () =>
                    this.api
                        .getRecommendationAgingBuckets(forceRefresh)
                        .pipe(tap((d) => (this.agingRows = d))),
            },
        ];

        for (const t of tasks) {
            this.taskLabels.set(t.key, t.label);
        }

        const streams = tasks.map((t) => {
            this.taskStartTimes.set(t.key, Date.now());
            return t.run().pipe(
                finalize(() => this.onTaskLoaded(t.key, t.views)),
            );
        });

        this.loadSub = merge(...streams).subscribe({
            complete: () => {
                this.loadInProgress = false;
                this.stopLoadTick();
                this.updateLoadError();
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadInProgress = false;
                this.stopLoadTick();
                this.isLoading = false;
                this.loadError = "שגיאה בטעינת נתוני המלצות מהשרת.";
                this.snackBar.open(this.loadError, "סגור", { duration: 5000 });
                this.cdr.markForCheck();
            },
        });
        this.subs.add(this.loadSub);
    }

    private startLoadTick(): void {
        this.stopLoadTick();
        this.loadTickTimer = setInterval(() => this.cdr.markForCheck(), 1000);
    }

    private stopLoadTick(): void {
        if (this.loadTickTimer != null) {
            clearInterval(this.loadTickTimer);
            this.loadTickTimer = null;
        }
    }

    private recordTaskDuration(key: string, durationMs: number): void {
        const history = this.taskDurationHistory.get(key) ?? [];
        history.push(durationMs);
        if (history.length > 5) {
            history.shift();
        }
        this.taskDurationHistory.set(key, history);
    }

    private getAverageTaskDuration(key: string): number {
        const history = this.taskDurationHistory.get(key);
        if (history?.length) {
            return (
                history.reduce((sum, ms) => sum + ms, 0) / history.length
            );
        }
        return (
            SurgeriesWaitTimesComponent.DEFAULT_TASK_DURATION_MS[key] ??
            12_000
        );
    }

    private estimateTaskRemaining(key: string, elapsedMs: number): number {
        const avg = this.getAverageTaskDuration(key);
        return Math.max(2_000, avg - elapsedMs);
    }

    formatDurationMs(ms: number): string {
        const totalSec = Math.max(0, Math.round(ms / 1000));
        if (totalSec < 60) {
            return `${totalSec} שניות`;
        }
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        if (sec === 0) {
            return `${min} דקות`;
        }
        return `${min} דקות ו-${sec} שניות`;
    }

    /** נקרא בכל פעם שחתך נתונים מסוים סיים להיטען. */
    private onTaskLoaded(key: string, views: RecommendationView[]): void {
        const started = this.taskStartTimes.get(key);
        if (started) {
            this.recordTaskDuration(key, Date.now() - started);
        }
        this.loadedKeys.add(key);
        this.isLoading = false;
        const affectsCurrent =
            views.includes(this.view) ||
            this.chartDataKeys(this.view).includes(key) ||
            this.requiredKeys(this.view).includes(key);
        if (affectsCurrent) {
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

    /** ערך department לשליחה ל-API — [מנתחת מאוגד], לעולם לא label. */
    get selectedDepartmentValue(): string {
        return this.selectedDepartment?.value?.trim() ?? "";
    }

    get selectedDepartmentLabel(): string {
        return this.selectedDepartment?.label?.trim() ?? "";
    }

    isDepartmentSelected(opt: DepartmentFilterOption): boolean {
        return this.selectedDepartment?.value === opt.value;
    }

    trackByDepartmentValue(_: number, opt: DepartmentFilterOption): string {
        return opt.value;
    }

    /** מפתחות הנתונים הנדרשים לתצוגה הנוכחית — לבדיקת מצב טעינה פר-תצוגה. */
    private requiredKeys(view: RecommendationView): string[] {
        switch (view) {
            case "monthly": {
                const keys = [
                    "recMonthly",
                    "deptDetail",
                    "countByDept",
                    "doctorSurg",
                    "surgeryMonthlyHospital",
                ];
                if (this.effectiveMonthlySurgeryDepartment) {
                    keys.push("surgeryMonthlyScoped");
                }
                return keys;
            }
            case "byDept":
                return ["deptDetail", "countByDept", "surgeriesByDept"];
            case "byDoctor":
                return [
                    "deptDetail",
                    "countByDept",
                    "recByDoctor",
                    "doctorSurg",
                ];
            case "procedures":
                return ["procedures"];
            case "conversion":
                return ["monthlyTrend"];
            case "waitTimes":
                return ["backlog"];
            case "aging":
                return ["aging"];
            default:
                return ["yearlyRec", "surgeryMonthlyHospital"];
        }
    }

    /** מפתחות שמשפיעים ישירות על הגרף — לטעינה חלקית ולהודעות למשתמש. */
    private chartDataKeys(view: RecommendationView): string[] {
        switch (view) {
            case "monthly": {
                const keys: string[] =
                    this.selectedDepartment || this.selectedDoctor
                        ? ["deptDetail"]
                        : ["recMonthly"];
                if (this.effectiveMonthlySurgeryDepartment) {
                    keys.push("surgeryMonthlyScoped");
                } else {
                    keys.push("surgeryMonthlyHospital");
                }
                if (this.selectedDoctor) {
                    keys.push("countByDept", "doctorSurg");
                }
                return keys;
            }
            case "byDept":
                return ["deptDetail", "countByDept", "surgeriesByDept"];
            case "byDoctor":
                return [
                    "deptDetail",
                    "countByDept",
                    "recByDoctor",
                    "doctorSurg",
                ];
            case "procedures":
                return ["procedures"];
            case "conversion":
                return ["monthlyTrend"];
            case "waitTimes":
                return ["backlog"];
            case "aging":
                return ["aging"];
            default:
                return ["yearlyRec", "surgeryMonthlyHospital"];
        }
    }

    /** האם התצוגה הנוכחית עדיין ממתינה לנתונים שלה. */
    isViewLoading(): boolean {
        if (!this.loadInProgress) {
            return false;
        }
        return this.chartDataKeys(this.view).some(
            (k) => !this.loadedKeys.has(k),
        );
    }

    /** יש לפחות חלק מהנתונים לתצוגה הנוכחית. */
    hasViewAnyData(): boolean {
        if (!this.loadInProgress) {
            return true;
        }
        return this.chartDataKeys(this.view).some((k) =>
            this.loadedKeys.has(k),
        );
    }

    /** חוסם את הגרף עד שמגיע מידע ראשון לתצוגה. */
    shouldShowChartBlockingOverlay(): boolean {
        return this.loadInProgress && !this.hasViewAnyData();
    }

    /** מציג גרף ברגע שיש נתונים — גם בטעינה חלקית. */
    canShowChart(): boolean {
        return (
            !this.shouldShowChartBlockingOverlay() && this.chartData.length > 0
        );
    }

    /** עדיין טוענים חלקים נוספים לתצוגה הנוכחית. */
    isViewPartialLoading(): boolean {
        return (
            this.loadInProgress &&
            this.hasViewAnyData() &&
            this.isViewLoading()
        );
    }

    getLoadingHeadline(): string {
        return "מכינים את הנתונים שלך...";
    }

    getLoadingElapsedText(): string {
        const elapsed = Date.now() - this.loadSessionStart;
        return `עברו ${this.formatDurationMs(elapsed)}`;
    }

    getPendingLoadItems(): {
        label: string;
        elapsed: string;
        remaining: string;
    }[] {
        return this.chartDataKeys(this.view)
            .filter((k) => !this.loadedKeys.has(k))
            .map((key) => {
                const start =
                    this.taskStartTimes.get(key) ?? this.loadSessionStart;
                const elapsed = Date.now() - start;
                return {
                    label:
                        this.taskLabels.get(key) ?? "נתונים נוספים",
                    elapsed: this.formatDurationMs(elapsed),
                    remaining: this.formatDurationMs(
                        this.estimateTaskRemaining(key, elapsed),
                    ),
                };
            });
    }

    getPartialLoadingSummary(): string {
        const pending = this.getPendingLoadItems();
        if (!pending.length) {
            return "";
        }
        if (pending.length === 1) {
            return `מעדכנים את ${pending[0].label} — עוד בערך ${pending[0].remaining}`;
        }
        const longest = pending.reduce((a, b) =>
            this.parseDurationToSeconds(b.remaining) >
            this.parseDurationToSeconds(a.remaining)
                ? b
                : a,
        );
        return `מעדכנים עוד ${pending.length} חלקים — הערכה: עוד בערך ${longest.remaining}`;
    }

    private parseDurationToSeconds(text: string): number {
        const minMatch = text.match(/(\d+)\s*דקות/);
        const secMatch = text.match(/(\d+)\s*שניות/);
        const min = minMatch ? Number(minMatch[1]) : 0;
        const sec = secMatch ? Number(secMatch[1]) : 0;
        return min * 60 + sec;
    }

    // ── אינטראקציות ──
    onViewChange(value: RecommendationView): void {
        this.view = value;
        if (
            !this.isDepartmentFilterEnabledForView(value) &&
            !this.isDoctorFilterEnabledForView(value) &&
            (this.selectedDepartment || this.selectedDoctor)
        ) {
            this.selectedDepartment = null;
            this.selectedDoctor = null;
            this.isDeptOpen = false;
            this.isDoctorOpen = false;
            if (value === "byDept" || value === "byDoctor") {
                this.comparisonYear = this.getLatestComparisonYear();
            }
            this.loadAll();
            return;
        }
        if (!this.isDoctorFilterEnabledForView(value)) {
            this.selectedDoctor = null;
            this.isDoctorOpen = false;
        }
        if (value === "byDept" || value === "byDoctor") {
            this.comparisonYear = this.getLatestComparisonYear();
        }
        this.reloadSurgeryDataForFilters();
        this.rebuildView();
        this.cdr.markForCheck();
    }

    private isDepartmentFilterEnabledForView(
        view: RecommendationView,
    ): boolean {
        return (
            view === "monthly" ||
            view === "byDept" ||
            view === "byDoctor" ||
            view === "procedures"
        );
    }

    private isDoctorFilterEnabledForView(view: RecommendationView): boolean {
        return view === "monthly";
    }

    get isDepartmentFilterEnabled(): boolean {
        return this.isDepartmentFilterEnabledForView(this.view);
    }

    get isDoctorFilterEnabled(): boolean {
        return this.isDoctorFilterEnabledForView(this.view);
    }

    get selectedDoctorLabel(): string {
        return this.selectedDoctor?.trim() ?? "";
    }

    /** מחלקה לסינון ניתוחים חודשיים — מפורשת או מוסקת מרופא נבחר. */
    get effectiveMonthlySurgeryDepartment(): string {
        if (this.selectedDepartmentValue) {
            return this.selectedDepartmentValue;
        }
        if (this.selectedDoctorLabel) {
            return this.inferWingForDoctor(this.selectedDoctorLabel);
        }
        return "";
    }

    getDepartmentFilterDisabledReason(): string {
        switch (this.view) {
            case "yearly":
                return "סינון מחלקה אינו זמין — תצוגה שנתית של כלל בית החולים";
            case "conversion":
                return "סינון מחלקה אינו זמין בתצוגת אחוז ביצוע";
            case "waitTimes":
                return "סינון מחלקה אינו זמין בתצוגת ממתינים";
            case "aging":
                return "סינון מחלקה אינו זמין בתצוגת התיישנות";
            default:
                return "סינון מחלקה אינו זמין בתצוגה זו";
        }
    }

    toggleDoctorDropdown(event: Event): void {
        if (!this.isDoctorFilterEnabled) {
            return;
        }
        event.stopPropagation();
        this.isDoctorOpen = !this.isDoctorOpen;
        this.cdr.markForCheck();
    }

    selectDoctor(name: string, event: Event): void {
        if (!this.isDoctorFilterEnabled) {
            return;
        }
        event.stopPropagation();
        this.selectedDoctor = name;
        this.isDoctorOpen = false;
        this.onFilterChanged();
    }

    clearDoctor(event: Event): void {
        event.stopPropagation();
        this.selectedDoctor = null;
        this.isDoctorOpen = false;
        this.onFilterChanged();
    }

    isDoctorSelected(name: string): boolean {
        return this.selectedDoctor === name;
    }

    trackByDoctorName(_: number, name: string): string {
        return name;
    }

    getDoctorDisplay(): string {
        if (!this.isDoctorFilterEnabled) {
            return "רופא/ה: לא זמין בתצוגה זו";
        }
        return this.selectedDoctor
            ? `רופא/ה: ${this.selectedDoctorLabel}`
            : "רופא/ה: כולם";
    }

    toggleDeptDropdown(event: Event): void {
        if (!this.isDepartmentFilterEnabled) {
            return;
        }
        event.stopPropagation();
        this.isDeptOpen = !this.isDeptOpen;
        this.cdr.markForCheck();
    }

    selectDepartment(opt: DepartmentFilterOption, event: Event): void {
        if (!this.isDepartmentFilterEnabled) {
            return;
        }
        event.stopPropagation();
        this.selectedDepartment = opt;
        if (
            this.selectedDoctor &&
            !this.doctorBelongsToDepartment(this.selectedDoctor)
        ) {
            this.selectedDoctor = null;
        }
        this.isDeptOpen = false;
        this.onFilterChanged();
    }

    clearDepartment(event: Event): void {
        event.stopPropagation();
        this.selectedDepartment = null;
        this.isDeptOpen = false;
        this.onFilterChanged();
    }

    resetFilters(): void {
        if (
            !this.hasActiveFilters() ||
            (!this.isDepartmentFilterEnabled && !this.isDoctorFilterEnabled)
        ) {
            return;
        }
        this.selectedDepartment = null;
        this.selectedDoctor = null;
        this.isDeptOpen = false;
        this.isDoctorOpen = false;
        this.onFilterChanged();
    }

    /** עדכון מיידי מהמטמון + טעינה מחדש של נתוני ניתוחים לפי הסינון. */
    private onFilterChanged(): void {
        this.rebuildDoctorFilterOptions();
        this.rebuildView();
        this.cdr.markForCheck();
        this.reloadSurgeryDataForFilters();
    }

    private reloadSurgeryDataForFilters(): void {
        const wing = this.effectiveMonthlySurgeryDepartment;
        const deptValue = this.selectedDepartmentValue;
        const needMonthly = this.view === "monthly";
        const needByDoctor = this.view === "byDoctor";
        const needProcedures = this.view === "procedures";

        if (!needMonthly && !needByDoctor && !needProcedures) {
            return;
        }

        this.subs.add(
            forkJoin({
                scoped:
                    needMonthly && wing
                        ? this.api.getMonthlySurgeryCounts(
                              this.baseYear,
                              wing,
                              true,
                          )
                        : of(null),
                doctorSurg:
                    needMonthly || needByDoctor
                        ? this.api.getSurgeriesByDoctor(
                              this.baseYear,
                              wing || deptValue,
                              true,
                          )
                        : of(null),
                recByDoctor: needByDoctor
                    ? this.api.getRecommendationsByDoctor(
                          deptValue,
                          undefined,
                          true,
                      )
                    : of(null),
                procedures: needProcedures
                    ? this.api.getTopRecommendedProcedures(
                          "",
                          deptValue,
                          true,
                      )
                    : of(null),
            }).subscribe({
                next: ({ scoped, doctorSurg, recByDoctor, procedures }) => {
                    if (scoped) {
                        this.surgeryMonthlyRows = scoped;
                    } else if (needMonthly && !wing) {
                        this.surgeryMonthlyRows =
                            this.surgeryMonthlyHospitalRows;
                    }
                    if (doctorSurg) {
                        this.doctorSurgeryRawRows = doctorSurg;
                    }
                    if (recByDoctor) {
                        this.doctorRecommendationRows = recByDoctor;
                    }
                    if (procedures) {
                        this.procedureRows = procedures;
                    }
                    this.rebuildDoctorFilterOptions();
                    this.rebuildView();
                    this.cdr.markForCheck();
                },
            }),
        );
    }

    private doctorBelongsToDepartment(doctor: string): boolean {
        const doc = doctor.trim();
        if (!doc || !this.selectedDepartmentValue) {
            return true;
        }
        for (const r of this.deptRows) {
            if (!this.doctorNamesMatch(r.DoctorName || "", doc)) {
                continue;
            }
            if (this.deptRowMatchesSelectedDepartment(r)) {
                return true;
            }
        }
        const deptKeys = new Set(
            surgeryDepartmentMatchKeys(this.selectedDepartmentValue),
        );
        for (const r of this.countByDeptRawRows) {
            if (!this.doctorNamesMatch(r.Doctor || "", doc)) {
                continue;
            }
            const wing = (r.Wing || "").trim();
            if (
                !wing ||
                deptKeys.has(wing) ||
                surgeryDepartmentMatchKeys(wing).some((k) => deptKeys.has(k))
            ) {
                return true;
            }
        }
        return this.doctorSurgeryRawRows.some((r) =>
            this.doctorNamesMatch(r.DoctorName, doc),
        );
    }

    private countByDeptRowMatchesDepartment(
        r: SurgeryCountByDeptRow,
    ): boolean {
        const deptValue = this.selectedDepartmentValue;
        if (!deptValue) {
            return true;
        }
        const wing = (r.Wing || "").trim();
        const deptKeys = new Set(surgeryDepartmentMatchKeys(deptValue));
        return (
            !wing ||
            deptKeys.has(wing) ||
            surgeryDepartmentMatchKeys(wing).some((k) => deptKeys.has(k))
        );
    }

    refresh(): void {
        this.api.clearCache();
        this.subs.add(
            this.api
                .getSurgeryDepartmentOptions(true, this.baseYear)
                .subscribe((opts) => {
                this.departmentOptions = opts;
                if (
                    this.selectedDepartment &&
                    !opts.some(
                        (o) => o.value === this.selectedDepartment!.value,
                    )
                ) {
                    this.selectedDepartment = null;
                }
                this.cdr.markForCheck();
            }),
        );
        this.loadAll(true);
    }

    getDepartmentDisplay(): string {
        if (!this.isDepartmentFilterEnabled) {
            return "מחלקה: לא זמין בתצוגה זו";
        }
        return this.selectedDepartment
            ? `מחלקה: ${this.selectedDepartmentLabel}`
            : "מחלקה: כל בית החולים";
    }

    getActiveFiltersSummary(): string {
        if (!this.isDepartmentFilterEnabled && !this.isDoctorFilterEnabled) {
            return this.getDepartmentFilterDisabledReason();
        }
        const parts: string[] = [];
        if (this.isDepartmentFilterEnabled) {
            parts.push(
                this.selectedDepartment
                    ? `מחלקה: ${this.selectedDepartmentLabel}`
                    : "מחלקה: כל בית החולים",
            );
        }
        if (this.isDoctorFilterEnabled) {
            parts.push(
                this.selectedDoctor
                    ? `רופא/ה: ${this.selectedDoctorLabel}`
                    : "רופא/ה: כולם",
            );
        }
        return parts.join(" · ");
    }

    hasActiveFilters(): boolean {
        return (
            (this.isDepartmentFilterEnabled && !!this.selectedDepartment) ||
            (this.isDoctorFilterEnabled && !!this.selectedDoctor)
        );
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
        if (!this.chartData?.length || this.shouldShowChartBlockingOverlay()) {
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
                return `המלצות וניתוחים לפי חודש — ${this.getLatestComparisonYear()}`;
            case "byDept":
                return "המלצות וניתוחים לפי מחלקה";
            case "byDoctor":
                return "המלצות וניתוחים לפי רופא";
            case "procedures":
                return "המלצות לניתוח הנפוצות ביותר";
            case "conversion":
                return "אחוז ביצוע מהמלצה לניתוח (12 חודשים)";
            case "waitTimes":
                return "מצבת ממתינים לניתוח לפי מחלקה";
            case "aging":
                return "התיישנות ההמתנה לפי טווחי ימים";
            default:
                return "המלצות מול ניתוחים — השוואה שנתית (תקופה מקבילה)";
        }
    }

    getPeriodCaption(): string {
        switch (this.view) {
            case "monthly":
                return `לכל חודש בשנה ${this.getLatestComparisonYear()}: המלצות לניתוח מול ניתוחים שביצע כלל בית החולים.`;
            case "byDept":
                return `השוואת המלצות מול ניתוחים לפי מחלקה — שנה ${this.comparisonYear}. ניתוחים: GetSurgeriesByDepartment ([מנתחת מאוגד]).`;
            case "byDoctor":
                return this.selectedDepartmentValue
                    ? `השוואת המלצות מול ניתוחים לפי רופא — מחלקה ${this.selectedDepartmentLabel}, שנה ${this.comparisonYear}.`
                    : `השוואת המלצות מול ניתוחים לפי רופא — כל בית החולים, שנה ${this.comparisonYear}.`;
            case "procedures":
                return "הניתוחים המומלצים הנפוצים ביותר בתקופה.";
            case "conversion":
                return "מתוך ההמלצות לניתוח שניתנו בכל חודש — איזה אחוז מהן בוצע בפועל (12 חודשים אחרונים).";
            case "waitTimes":
                return "מטופלים שסומנו «מומלץ לניתוח» וטרם בוצע להם ניתוח — מספרם וממוצע ימי ההמתנה עד היום, לפי מחלקה.";
            case "aging":
                return "התפלגות הממתינים הפעילים לפי טווחי ימי המתנה.";
            default:
                return `השוואת המלצות מול ניתוחים לפי שנה — המלצות: כלל בית החולים; ניתוחים: YTD (ינו–${this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1]}).`;
        }
    }

    /** האם להציג כרטיסי בחירת שנה (שנתי/חודשי/רופא/מחלקה). */
    get showYearSummary(): boolean {
        return this.view === "yearly" || this.isEntityComparisonView;
    }

    /** שנה האחרונה בנתונים (ברירת מחדל לתצוגות מחלקה/רופא/חודשי). */
    private getLatestComparisonYear(): number {
        const years = this.distinctEntityComparisonYears();
        if (years.length) {
            return years[years.length - 1];
        }
        const fromSurgery = this.distinctSurgeryYears();
        if (fromSurgery.length) {
            return fromSurgery[fromSurgery.length - 1];
        }
        const fromRec = this.distinctYears();
        if (fromRec.length) {
            return fromRec[fromRec.length - 1];
        }
        return this.baseYear;
    }

    get doctorRecommendationsHaveYear(): boolean {
        return this.doctorRecommendationRows.some((r) => (r.Year ?? 0) > 0);
    }

    get deptRecommendationsHaveYear(): boolean {
        return this.deptRows.some((r) => (r.Year ?? 0) > 0);
    }

    get deptDetailHasDoctor(): boolean {
        return this.deptRows.some((r) => !!(r.DoctorName || "").trim());
    }

    private useDeptDetailForDoctorRecs(): boolean {
        return (
            !!this.selectedDepartmentValue &&
            this.deptDetailHasDoctor &&
            (this.view === "byDoctor" || this.view === "monthly")
        );
    }

    private deptRowMatchesSelectedDepartment(
        r: RecommendationDeptRow,
    ): boolean {
        if (!this.selectedDepartmentValue) {
            return true;
        }
        const keys = new Set(
            surgeryDepartmentMatchKeys(this.selectedDepartmentValue),
        );
        const label = this.selectedDepartmentLabel.trim();
        if (label) {
            keys.add(label);
        }
        const deptLabel = (r.Department || "").trim();
        const deptValue = (
            r.DepartmentValue ||
            inferSurgeryDepartmentValue(deptLabel) ||
            ""
        ).trim();
        const rowKeys = surgeryDepartmentMatchKeys(deptValue || deptLabel);
        return (
            keys.has(deptValue) ||
            keys.has(deptLabel) ||
            rowKeys.some((k) => keys.has(k))
        );
    }

    private deptRowMatchesYear(
        r: RecommendationDeptRow,
        year: number,
    ): boolean {
        if (!this.deptRecommendationsHaveYear) {
            return true;
        }
        return (r.Year ?? 0) === year;
    }

    selectComparisonYear(year: number): void {
        if (!this.isEntityComparisonView || year === this.comparisonYear) {
            return;
        }
        this.comparisonYear = year;
        this.rebuildView();
        this.cdr.markForCheck();
    }

    isComparisonYearSelected(year: number): boolean {
        return this.isEntityComparisonView && year === this.comparisonYear;
    }

    /** הסבר קצר על תקופת הניתוחים — מוצג בכל הגרפים. */
    getCalculationFormula(): string {
        return `YTD מינואר עד ${this.getSurgeryYtdMonthLabel()} (אלקטיבי, בוקר, אמצע שבוע).`;
    }

    getCurrentChartMonthLabel(): string {
        return (
            this.monthLabelsFull[this.currentChartMonth - 1] ||
            String(this.currentChartMonth)
        );
    }

    getSurgeryYtdMonthLabel(): string {
        const names = this.monthLabelsFull;
        const m = this.surgeryYtdCutoffMonth;
        return names[m - 1] || "יוני";
    }

    getYearCardSubtitle(year: number): string {
        if (this.view === "monthly") {
            if (this.selectedDoctorLabel) {
                const yearly = this.yearlySurgeryCountForDoctor(
                    this.selectedDoctorLabel,
                    year,
                );
                if (yearly > 0) {
                    return `${this.formatCount(yearly)} ניתוחים בשנה`;
                }
            }
            const surg = this.surgeryCountForMonth(
                year,
                this.currentChartMonth,
            );
            return `${this.formatCount(surg)} ניתוחים`;
        }
        if (this.view === "yearly") {
            const yty = this.surgeryYearlyYty[year];
            const rec = this.yearlyTotals[year] || 0;
            const surg = this.surgeryYtdTotals[year] || 0;
            if (rec > 0 && surg > 0) {
                return `${this.formatPctOfTotal((surg / rec) * 100)} ביצוע`;
            }
            if (yty?.pct != null && Number.isFinite(yty.pct)) {
                return `${this.formatPct(yty.pct)} ניתוחים מול ${year - 1}`;
            }
            return `ינו–${this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1]}`;
        }
        if (this.isEntityComparisonView) {
            return "המלצות / ניתוחים";
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
        if (this.view === "monthly") {
            return this.formatCount(
                this.recommendationForMonth(year, this.currentChartMonth),
            );
        }
        if (this.view === "yearly") {
            const rec = this.yearlyTotals[year] || 0;
            const surg = this.surgeryYtdTotals[year] || 0;
            return `${this.formatCount(rec)} / ${this.formatCount(surg)}`;
        }
        if (this.isEntityComparisonView) {
            const rec = this.view === "byDoctor"
                ? this.totalRecommendationsForYear(year)
                : this.totalDeptRecommendationsForYear(year);
            const surg = this.view === "byDoctor"
                ? this.totalSurgeriesForDoctorsYear(year)
                : this.totalSurgeriesForDepartmentsYear(year);
            return `${this.formatCount(rec)} / ${this.formatCount(surg)}`;
        }
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
        return this.view === "yearly";
    }

    get isDeptComparisonView(): boolean {
        return this.view === "byDept";
    }

    get isDoctorComparisonView(): boolean {
        return this.view === "byDoctor";
    }

    get isEntityComparisonView(): boolean {
        return (
            this.isDeptComparisonView ||
            this.isDoctorComparisonView ||
            this.view === "monthly"
        );
    }

    getTableEntityLabel(): string {
        switch (this.view) {
            case "monthly":
                return "חודש";
            case "byDept":
                return "מחלקה";
            case "byDoctor":
                return "רופא/ה";
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
        if (this.isEntityComparisonView && this.chartColumnLabel(1)) {
            return this.chartColumnLabel(1);
        }
        switch (this.view) {
            case "monthly":
                return `המלצות ${this.getLatestComparisonYear()}`;
            case "byDept":
                return this.deptRecommendationsHaveYear
                    ? `המלצות ${this.comparisonYear}`
                    : "המלצות (5 שנים)";
            case "byDoctor":
                return this.doctorRecommendationsHaveYear
                    ? `המלצות ${this.comparisonYear}`
                    : "המלצות (תקופה)";
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

    getTableConversionLabel(): string {
        return this.isEntityComparisonView ? "אחוז ביצוע" : "";
    }

    getTableColumnCount(): number {
        if (this.isCountByYearView) {
            return this.tableYears.length + 1;
        }
        if (this.isEntityComparisonView) {
            return 4;
        }
        return 3;
    }

    getTablePctLabel(): string {
        if (this.isEntityComparisonView && this.chartColumnLabel(3)) {
            return this.chartColumnLabel(3);
        }
        switch (this.view) {
            case "monthly":
                return "ניתוחים (כל ביה״ח)";
            case "byDept":
                return `ניתוחים ${this.comparisonYear}`;
            case "byDoctor":
                return `ניתוחים ${this.comparisonYear}`;
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
            case "byDoctor":
                return "מספר ההמלצות לניתוח שניתנו על ידי הרופא/ה.";
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
                return `מספר ניתוחים אלקטיביים שבוצעו (בוקר, אמצע שבוע) מתחילת שנת ${this.baseYear} — לפי [מנתחת מאוגד].`;
            case "byDoctor":
                return `מספר הניתוחים האלקטיביים שבוצעו בפועל (בוקר, אמצע שבוע) בשנה ${this.baseYear}.`;
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
        } else if (this.isEntityComparisonView) {
            lines.push(
                [
                    this.getTableEntityLabel(),
                    this.getTableValueLabel(),
                    this.getTablePctLabel(),
                    this.getTableConversionLabel(),
                ].join(","),
            );
            for (const row of this.tableRows) {
                lines.push(
                    [
                        `"${row.label}"`,
                        String(row.count ?? 0),
                        String(row.secondaryCount ?? 0),
                        row.conversionPct != null
                            ? row.conversionPct.toFixed(1)
                            : "",
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
        this.rebuildTableFromChart();
        this.rebuildKpis();
    }

    private chartColumnLabel(colIndex: number): string {
        const col = this.chartColumns[colIndex];
        if (col && typeof col === "object" && "label" in col) {
            return String((col as { label?: string }).label || "");
        }
        if (typeof col === "string") {
            return col;
        }
        return "";
    }

    private monthLabelFromChartLabel(shortLabel: string): string {
        const idx = this.monthLabelsShort.indexOf(shortLabel);
        if (idx >= 0) {
            return this.monthLabelsFull[idx] || shortLabel;
        }
        return shortLabel;
    }

    /** הטבלה נגזרת מהגרף — אותן שורות, אותם ערכים, אותן כותרות. */
    private rebuildTableFromChart(): void {
        switch (this.view) {
            case "monthly":
                this.rebuildDualMetricTableFromChart(
                    `סה״כ — ${this.getLatestComparisonYear()}`,
                    true,
                );
                break;
            case "byDept":
                this.rebuildDualMetricTableFromChart(
                    `סה״כ — ${this.comparisonYear}`,
                    false,
                );
                break;
            case "byDoctor":
                this.rebuildDualMetricTableFromChart(
                    `סה״כ — ${this.comparisonYear}`,
                    false,
                );
                break;
            case "procedures":
                this.rebuildSingleValueTableFromChart();
                break;
            case "conversion":
                this.rebuildConversionTableFromChart();
                break;
            case "waitTimes":
                this.rebuildWaitTimesTableFromChart();
                break;
            case "aging":
                this.rebuildSingleValueTableFromChart("סה״כ ממתינים");
                break;
            default:
                this.rebuildYearlyTableFromChart();
        }
    }

    private rebuildDualMetricTableFromChart(
        totalLabel: string,
        useFullMonthLabels: boolean,
    ): void {
        this.tableYears = [];
        const rows: RecommendationTableRow[] = [];
        for (const entry of this.chartData) {
            if (!Array.isArray(entry) || entry.length < 4) {
                continue;
            }
            const rawLabel = String(entry[0] ?? "");
            const label = useFullMonthLabels
                ? this.monthLabelFromChartLabel(rawLabel)
                : rawLabel;
            const rec = Number(entry[1]) || 0;
            const surg = Number(entry[3]) || 0;
            rows.push({
                label,
                count: rec,
                secondaryCount: surg,
                conversionPct: rec > 0 ? (surg / rec) * 100 : null,
            });
        }
        if (rows.length) {
            const totalRec = rows.reduce((s, r) => s + (r.count || 0), 0);
            const totalSurg = rows.reduce(
                (s, r) => s + (r.secondaryCount || 0),
                0,
            );
            rows.push({
                label: totalLabel,
                count: totalRec,
                secondaryCount: totalSurg,
                conversionPct:
                    totalRec > 0 ? (totalSurg / totalRec) * 100 : null,
                isTotal: true,
            });
        }
        this.tableRows = rows;
    }

    private rebuildYearlyTableFromChart(): void {
        const years: number[] = [];
        const recPerYear: { [year: number]: number } = {};
        const surgPerYear: { [year: number]: number } = {};
        for (const entry of this.chartData) {
            if (!Array.isArray(entry) || entry.length < 4) {
                continue;
            }
            const year = Number(entry[0]);
            if (!year) {
                continue;
            }
            years.push(year);
            recPerYear[year] = Number(entry[1]) || 0;
            surgPerYear[year] = Number(entry[3]) || 0;
        }
        this.tableYears = years;
        const recLabel =
            this.chartColumnLabel(1) || "המלצות (כל ביה״ח)";
        const surgLabel = this.chartColumnLabel(3) || "ניתוחים YTD";
        this.tableRows = [
            { label: recLabel, perYear: recPerYear },
            { label: surgLabel, perYear: surgPerYear },
        ];
    }

    private rebuildSingleValueTableFromChart(
        totalLabel = "סה״כ",
    ): void {
        this.tableYears = [];
        const rows: RecommendationTableRow[] = [];
        let total = 0;
        for (const entry of this.chartData) {
            if (!Array.isArray(entry) || entry.length < 2) {
                continue;
            }
            const count = Number(entry[1]) || 0;
            total += count;
            rows.push({
                label: String(entry[0] ?? ""),
                count,
                pctOfTotal: 0,
            });
        }
        if (rows.length) {
            rows.forEach((r) => {
                r.pctOfTotal = total ? ((r.count || 0) / total) * 100 : 0;
            });
            rows.push({
                label: totalLabel,
                count: total,
                pctOfTotal: 100,
                isTotal: true,
            });
        }
        this.tableRows = rows;
    }

    private rebuildConversionTableFromChart(): void {
        this.tableYears = [];
        const rows: RecommendationTableRow[] = [];
        let totalRecommended = 0;
        let totalPerformed = 0;
        for (const entry of this.chartData) {
            if (!Array.isArray(entry) || entry.length < 6) {
                continue;
            }
            const label = String(entry[0] ?? "");
            const recommended = Number(entry[1]) || 0;
            const performed = Number(entry[3]) || 0;
            const conversionRate = Number(entry[entry.length >= 10 ? 7 : 5]) || 0;
            totalRecommended += recommended;
            totalPerformed += performed;
            rows.push({
                label: `${label} (המלצות ${this.formatCount(recommended)})`,
                count: performed,
                pctOfTotal: conversionRate,
            });
        }
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

    private rebuildWaitTimesTableFromChart(): void {
        this.tableYears = [];
        const rows: RecommendationTableRow[] = [];
        const hasSchedule =
            this.chartColumns.length >= 3 &&
            this.chartColumnLabel(2).includes("תור");
        let totalWaiting = 0;
        for (const entry of this.chartData) {
            if (!Array.isArray(entry) || entry.length < 2) {
                continue;
            }
            const dept = String(entry[0] ?? "");
            const avgDays = Number(entry[1]) || 0;
            const backlog = this.backlogRows.find(
                (r) => (r.Department || "").trim() === dept,
            );
            const waiting = backlog?.WaitingCount ?? 0;
            totalWaiting += waiting;
            const scheduled = backlog?.ScheduledCount ?? 0;
            const suffix =
                scheduled > 0
                    ? `, מתוכם ${this.formatCount(scheduled)} מומלצים נקבע להם תור`
                    : "";
            rows.push({
                label: `${dept} (${this.formatCount(waiting)} ממתינים${suffix})`,
                count: avgDays,
                secondaryCount: hasSchedule
                    ? Number(entry[2]) || 0
                    : undefined,
                pctOfTotal: totalWaiting
                    ? (waiting / totalWaiting) * 100
                    : 0,
            });
        }
        this.tableRows = rows;
    }

    private distinctYears(): number[] {
        const fromYearly = this.yearlyRows.map((r) => r.Year);
        const fromMonthly = this.monthlyRows.map((r) => r.Year);
        return [...new Set([...fromYearly, ...fromMonthly])]
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

    private recommendationForMonth(year: number, month: number): number {
        if (this.selectedDepartment || this.selectedDoctor) {
            return this.recommendationForMonthFromDeptDetail(year, month);
        }
        return (
            this.monthlyRows.find(
                (r) => r.Year === year && r.Month === month,
            )?.Count ?? 0
        );
    }

    private recommendationForMonthFromDeptDetail(
        year: number,
        month: number,
    ): number {
        let sum = 0;
        for (const r of this.deptRows) {
            if ((r.Year ?? 0) !== year || (r.Month ?? 0) !== month) {
                continue;
            }
            if (
                this.selectedDoctor &&
                !this.doctorNamesMatch(r.DoctorName || "", this.selectedDoctor)
            ) {
                continue;
            }
            if (
                this.selectedDepartment &&
                !this.deptRowMatchesSelectedDepartment(r)
            ) {
                continue;
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    private countByDeptHasMonthlyRows(): boolean {
        return this.countByDeptRawRows.some((r) => (r.Month ?? 0) > 0);
    }

    private surgeryCountForDoctorFromApi(
        doctor: string,
        year: number,
    ): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        let sum = 0;
        for (const r of this.doctorSurgeryRawRows) {
            if (r.Year !== year) {
                continue;
            }
            if (this.doctorNamesMatch(r.DoctorName, doc)) {
                sum += r.Count || 0;
            }
        }
        return sum;
    }

    private yearlySurgeryCountForDoctor(doctor: string, year: number): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        const wing = this.effectiveMonthlySurgeryDepartment;
        let fromCountByDept = 0;
        if (this.countByDeptRawRows.length) {
            fromCountByDept = this.api.surgeryCountForDoctorFromCountByDept(
                this.countByDeptRawRows,
                doc,
                year,
                wing,
            );
        }
        const fromDoctorApi = this.surgeryCountForDoctorFromApi(doc, year);
        if (fromCountByDept > 0) {
            return fromCountByDept;
        }
        return fromDoctorApi;
    }

    /** חודשים עם המלצות לרופא/מחלקה מסוננים — לחלוקת ניתוחים שנתיים כשאין פירוט חודשי. */
    private monthsWithFilteredRecommendations(year: number): number[] {
        const months: number[] = [];
        for (let m = 1; m <= 12; m++) {
            if (this.recommendationForMonth(year, m) > 0) {
                months.push(m);
            }
        }
        return months;
    }

    private surgeryCountForMonth(year: number, month: number): number {
        const doctor = this.selectedDoctorLabel;
        const wing = this.effectiveMonthlySurgeryDepartment;

        if (doctor) {
            const hasMonthlyByDept = this.api.countByDeptHasMonthlyDoctorData(
                this.countByDeptRawRows,
                doctor,
                year,
                wing,
            );
            if (hasMonthlyByDept) {
                return this.api.surgeryCountForDoctorMonthFromCountByDept(
                    this.countByDeptRawRows,
                    doctor,
                    year,
                    month,
                    wing,
                );
            }

            const yearly = this.yearlySurgeryCountForDoctor(doctor, year);
            if (yearly <= 0) {
                return 0;
            }

            const recMonths = this.monthsWithFilteredRecommendations(year);
            if (recMonths.length > 0) {
                if (!recMonths.includes(month)) {
                    return 0;
                }
                return Math.round(yearly / recMonths.length);
            }

            if (month === this.surgeryYtdCutoffMonth) {
                return yearly;
            }
            return 0;
        }

        if (wing) {
            return (
                this.surgeryMonthlyRows.find(
                    (r) => r.Year === year && r.Month === month,
                )?.Count ?? 0
            );
        }

        return (
            this.surgeryMonthlyHospitalRows.find(
                (r) => r.Year === year && r.Month === month,
            )?.Count ?? 0
        );
    }

    private inferWingForDoctor(doctor: string): string {
        const doc = doctor.trim();
        if (!doc) {
            return "";
        }
        const wingCounts = new Map<string, number>();
        for (const r of this.deptRows) {
            if (!this.doctorNamesMatch(r.DoctorName || "", doc)) {
                continue;
            }
            const wing = (
                r.DepartmentValue ||
                inferSurgeryDepartmentValue(r.Department || "") ||
                ""
            ).trim();
            if (!wing) {
                continue;
            }
            wingCounts.set(wing, (wingCounts.get(wing) || 0) + (r.Count || 0));
        }
        if (!wingCounts.size) {
            for (const r of this.countByDeptRawRows) {
                if (!this.doctorNamesMatch(r.Doctor || "", doc)) {
                    continue;
                }
                const wing = (r.Wing || "").trim();
                if (!wing) {
                    continue;
                }
                wingCounts.set(
                    wing,
                    (wingCounts.get(wing) || 0) + (r.Count || 0),
                );
            }
        }
        let best = "";
        let bestCount = 0;
        for (const [wing, count] of wingCounts.entries()) {
            if (count > bestCount) {
                best = wing;
                bestCount = count;
            }
        }
        return best;
    }

    private rebuildDoctorFilterOptions(): void {
        const names = new Set<string>();
        const deptValue = this.selectedDepartmentValue;
        const addIfMatchesDept = (
            doctor: string,
            deptRow?: RecommendationDeptRow,
        ) => {
            const doc = doctor.trim();
            if (!doc || doc === "ללא רופא") {
                return;
            }
            if (deptValue && deptRow && !this.deptRowMatchesSelectedDepartment(deptRow)) {
                return;
            }
            if (deptValue && !deptRow) {
                const inDept = this.deptRows.some(
                    (r) =>
                        this.doctorNamesMatch(r.DoctorName || "", doc) &&
                        this.deptRowMatchesSelectedDepartment(r),
                );
                const inSurg = this.countByDeptRawRows.some(
                    (r) =>
                        this.doctorNamesMatch(r.Doctor || "", doc) &&
                        surgeryDepartmentMatchKeys(r.Wing || "").some((k) =>
                            surgeryDepartmentMatchKeys(deptValue).includes(k),
                        ),
                );
                if (!inDept && !inSurg) {
                    return;
                }
            }
            names.add(doc);
        };
        for (const r of this.deptRows) {
            if (deptValue && !this.deptRowMatchesSelectedDepartment(r)) {
                continue;
            }
            addIfMatchesDept(r.DoctorName || "", r);
        }
        for (const r of this.countByDeptRawRows) {
            if (deptValue) {
                const wing = (r.Wing || "").trim();
                const keys = surgeryDepartmentMatchKeys(deptValue);
                if (
                    wing &&
                    !keys.includes(wing) &&
                    !surgeryDepartmentMatchKeys(wing).some((k) => keys.includes(k))
                ) {
                    continue;
                }
            }
            addIfMatchesDept(r.Doctor || "");
        }
        for (const r of this.doctorSurgeryRawRows) {
            addIfMatchesDept(r.DoctorName || "");
        }
        this.doctorFilterOptions = [...names].sort((a, b) =>
            a.localeCompare(b, "he"),
        );
        if (
            this.selectedDoctor &&
            !this.doctorFilterOptions.includes(this.selectedDoctor)
        ) {
            this.selectedDoctor = null;
        }
    }

    private distinctSurgeryYears(): number[] {
        return [...new Set(this.surgeryMonthlyRows.map((r) => r.Year))]
            .filter((y) => y > 0)
            .sort((a, b) => a - b)
            .slice(-5);
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

    /** תואם limitMonth בשרת — עד סוף החודש שלפני החודש הנוכחי */
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
        this.currentChartMonth = new Date().getMonth() + 1;
        const surgeryYears = this.distinctSurgeryYears();
        const monthlyYears = this.distinctMonthlyComparisonYears();
        const entityYears = this.distinctEntityComparisonYears();
        if (this.view === "monthly") {
            this.yearsForChart = monthlyYears.length
                ? monthlyYears
                : surgeryYears.length
                  ? surgeryYears
                  : recYears;
        } else if (this.isEntityComparisonView) {
            this.yearsForChart = entityYears.length
                ? entityYears
                : surgeryYears.length
                  ? surgeryYears
                  : recYears;
            if (
                this.yearsForChart.length &&
                !this.yearsForChart.includes(this.comparisonYear)
            ) {
                this.comparisonYear =
                    this.yearsForChart[this.yearsForChart.length - 1];
            }
        } else {
            const merged = [...new Set([...surgeryYears, ...recYears])]
                .filter((y) => y > 0)
                .sort((a, b) => a - b)
                .slice(-5);
            this.yearsForChart = merged.length
                ? merged
                : surgeryYears.length
                  ? surgeryYears
                  : recYears;
        }
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
        const years = this.yearsForChart.length
            ? this.yearsForChart
            : this.distinctSurgeryYears();
        const ytdLabel = this.monthLabelsShort[this.surgeryYtdCutoffMonth - 1];
        this.chartColumns = [
            "שנה",
            { type: "number", label: "המלצות (כל ביה״ח)" },
            { type: "string", role: "annotation" },
            { type: "number", label: `ניתוחים YTD (ינו–${ytdLabel})` },
            { type: "string", role: "annotation" },
        ];
        this.chartData = years.map((y) => {
            const rec = this.yearlyTotals[y] || 0;
            const surg = this.surgeryYtdTotals[y] || 0;
            return [
                String(y),
                rec,
                rec ? this.formatCount(rec) : "",
                surg,
                surg ? this.formatCount(surg) : "",
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            colors: ["#2563eb", "#10b981"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 13, bold: true },
            },
            hAxis: {
                title: "שנה",
                textStyle: { fontSize: 13, bold: true },
            },
            vAxis: {
                ...this.createBaseChartOptions().vAxis,
                title: "כמות",
            },
        };
    }

    private buildMonthlyChart(): void {
        const year = this.getLatestComparisonYear();
        const surgLabel = this.selectedDoctorLabel
            ? `ניתוחים — ${this.selectedDoctorLabel}`
            : this.selectedDepartmentLabel
              ? `ניתוחים — ${this.selectedDepartmentLabel}`
              : "ניתוחים (כל ביה״ח)";
        const recLabel = this.selectedDoctorLabel
            ? `המלצות — ${this.selectedDoctorLabel}`
            : this.selectedDepartmentLabel
              ? `המלצות — ${this.selectedDepartmentLabel}`
              : `המלצות ${year}`;

        this.chartColumns = [
            "חודש",
            { type: "number", label: recLabel },
            { type: "string", role: "annotation" },
            { type: "number", label: surgLabel },
            { type: "string", role: "annotation" },
        ];
        this.chartData = [];
        for (let m = 1; m <= 12; m++) {
            const rec = this.recommendationForMonth(year, m);
            const surg = this.surgeryCountForMonth(year, m);
            if (!rec && !surg && (this.selectedDoctor || this.selectedDepartment)) {
                continue;
            }
            this.chartData.push([
                this.monthLabelsShort[m - 1] || String(m),
                rec,
                rec ? this.formatCount(rec) : "",
                surg,
                surg ? this.formatCount(surg) : "",
            ]);
        }
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            colors: ["#2563eb", "#10b981"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 13, bold: true },
            },
            hAxis: {
                title: `שנה ${year}`,
                textStyle: { fontSize: 13, bold: true },
            },
            vAxis: {
                ...this.createBaseChartOptions().vAxis,
                title: "כמות",
            },
        };
    }

    private surgeryCountForHospitalMonth(year: number, month: number): number {
        return (
            this.surgeryMonthlyHospitalRows.find(
                (r) => r.Year === year && r.Month === month,
            )?.Count ?? 0
        );
    }

    private buildByDeptChart(): void {
        const year = this.comparisonYear;
        const items = this.departmentsForByDeptChart(year);
        this.chartType = "BarChart";
        this.chartColumns = [
            "מחלקה",
            {
                type: "number",
                label: this.deptRecommendationsHaveYear
                    ? `המלצות ${year}`
                    : "המלצות (5 שנים)",
            },
            { type: "string", role: "annotation" },
            { type: "number", label: `ניתוחים ${year}` },
            { type: "string", role: "annotation" },
        ];
        this.chartData = items.map((item) => {
            const surg = this.surgeriesForDepartment(item.value, year);
            return [
                item.label,
                item.rec,
                item.rec ? this.formatCount(item.rec) : "",
                surg,
                surg ? this.formatCount(surg) : "",
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            colors: ["#2563eb", "#10b981"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 12, bold: true },
            },
            chartArea: { left: "34%", top: 40, width: "56%", height: "80%" },
            hAxis: {
                title: `כמות — שנה ${year}`,
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
        const year = this.comparisonYear;
        const top = this.doctorsForComparisonChart(year);
        const deptLabel = this.selectedDepartmentLabel;
        this.chartType = "BarChart";
        this.chartColumns = [
            "רופא/ה",
            {
                type: "number",
                label: this.doctorRecommendationsHaveYear
                    ? `המלצות ${year}`
                    : "המלצות (תקופה)",
            },
            { type: "string", role: "annotation" },
            { type: "number", label: `ניתוחים ${year}` },
            { type: "string", role: "annotation" },
        ];
        this.chartData = top.map((doctor) => {
            const rec = this.recommendationForDoctor(doctor, year);
            const surg = this.surgeriesForDoctor(doctor, year);
            return [
                doctor,
                rec,
                rec ? this.formatCount(rec) : "",
                surg,
                surg ? this.formatCount(surg) : "",
            ];
        });
        this.chartOptions = {
            ...this.createBaseChartOptions(),
            colors: ["#2563eb", "#10b981"],
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 12, bold: true },
            },
            chartArea: { left: "36%", top: 40, width: "56%", height: "80%" },
            hAxis: {
                title: deptLabel
                    ? `כמות — שנה ${year}, ${deptLabel}`
                    : `כמות — שנה ${year}`,
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

    private distinctEntityComparisonYears(): number[] {
        const years = new Set<number>();
        for (const r of this.doctorSurgeryRawRows) {
            if (r.Year > 0) {
                years.add(r.Year);
            }
        }
        for (const r of this.surgeryDeptRawRows) {
            if (r.Year > 0) {
                years.add(r.Year);
            }
        }
        for (const r of this.doctorRecommendationRows) {
            if ((r.Year ?? 0) > 0) {
                years.add(r.Year!);
            }
        }
        for (const r of this.deptRows) {
            if ((r.Year ?? 0) > 0) {
                years.add(r.Year!);
            }
        }
        if (!years.size) {
            for (let y = this.baseYear - 4; y <= this.baseYear; y++) {
                years.add(y);
            }
        }
        return [...years].sort((a, b) => a - b);
    }

    private filterDeptComparisonItems<T extends { label: string; value: string }>(
        items: T[],
    ): T[] {
        const deptValue = this.selectedDepartmentValue;
        if (!deptValue) {
            return items;
        }
        const keys = new Set(surgeryDepartmentMatchKeys(deptValue));
        const label = this.selectedDepartmentLabel.trim();
        if (label) {
            keys.add(label);
        }
        return items.filter((item) => {
            const itemKeys = surgeryDepartmentMatchKeys(item.value || item.label);
            return (
                keys.has(item.value) ||
                keys.has(item.label) ||
                itemKeys.some((k) => keys.has(k))
            );
        });
    }

    /** מחלקות לתצוגה לפי מחלקה — כולל מחלקה מסוננת ומחלקות עם ניתוחים בלבד. */
    private departmentsForByDeptChart(
        year: number,
    ): { label: string; value: string; rec: number }[] {
        if (this.selectedDepartmentValue && this.isDepartmentFilterEnabled) {
            const value = this.selectedDepartmentValue;
            const label = this.selectedDepartmentLabel || value;
            let rec = 0;
            for (const r of this.deptRows) {
                if (!this.deptRowMatchesSelectedDepartment(r)) {
                    continue;
                }
                if (!this.deptRowMatchesYear(r, year)) {
                    continue;
                }
                rec += r.Count || 0;
            }
            return [{ label, value, rec }];
        }

        const map = new Map<
            string,
            { label: string; value: string; rec: number }
        >();
        for (const r of this.deptRows) {
            const label = (r.Department || "").trim();
            if (!label) {
                continue;
            }
            if (!this.deptRowMatchesYear(r, year)) {
                continue;
            }
            const value = (
                r.DepartmentValue ||
                inferSurgeryDepartmentValue(label) ||
                label
            ).trim();
            const prev = map.get(value);
            map.set(value, {
                label: prev?.label || label,
                value,
                rec: (prev?.rec || 0) + (r.Count || 0),
            });
        }
        for (const r of this.countByDeptRawRows) {
            if (r.Year !== year) {
                continue;
            }
            const wing = (r.Wing || "").trim();
            if (!wing || !isValidSurgeryDepartmentValue(wing)) {
                continue;
            }
            if (map.has(wing)) {
                continue;
            }
            const opt = this.departmentOptions.find((o) => o.value === wing);
            map.set(wing, {
                label: opt?.label || wing,
                value: wing,
                rec: 0,
            });
        }
        return [...map.values()]
            .filter(
                (d) =>
                    d.rec > 0 ||
                    this.surgeriesForDepartment(d.value, year) > 0,
            )
            .sort((a, b) => {
                const scoreA =
                    a.rec + this.surgeriesForDepartment(a.value, year);
                const scoreB =
                    b.rec + this.surgeriesForDepartment(b.value, year);
                return scoreB - scoreA;
            });
    }

    /** @deprecated Use departmentsForByDeptChart */
    private topDepartmentsForYear(
        year: number,
    ): { label: string; value: string; rec: number }[] {
        return this.departmentsForByDeptChart(year).filter((d) => d.rec > 0);
    }

    private doctorsForComparisonChart(
        year: number = this.comparisonYear,
        limit = 14,
    ): string[] {
        const doctors = new Set<string>();

        if (this.useDeptDetailForDoctorRecs()) {
            for (const r of this.deptRows) {
                const doc = (r.DoctorName || "").trim();
                if (!doc || doc === "ללא רופא") {
                    continue;
                }
                if (!this.deptRowMatchesYear(r, year)) {
                    continue;
                }
                if (!this.deptRowMatchesSelectedDepartment(r)) {
                    continue;
                }
                doctors.add(doc);
            }
        } else {
            for (const r of this.doctorRecommendationRows) {
                const doc = (r.Doctor || "").trim();
                if (!doc) {
                    continue;
                }
                if (
                    this.doctorRecommendationsHaveYear &&
                    (r.Year ?? 0) !== year
                ) {
                    continue;
                }
                doctors.add(doc);
            }
            for (const r of this.deptRows) {
                const doc = (r.DoctorName || "").trim();
                if (!doc || doc === "ללא רופא") {
                    continue;
                }
                if (!this.deptRowMatchesYear(r, year)) {
                    continue;
                }
                if (
                    this.selectedDepartmentValue &&
                    !this.deptRowMatchesSelectedDepartment(r)
                ) {
                    continue;
                }
                doctors.add(doc);
            }
        }

        for (const r of this.countByDeptRawRows) {
            if (r.Year !== year) {
                continue;
            }
            if (!this.countByDeptRowMatchesDepartment(r)) {
                continue;
            }
            const doc = (r.Doctor || "").trim();
            if (!doc || doc === "ללא רופא") {
                continue;
            }
            doctors.add(doc);
        }
        for (const r of this.doctorSurgeryRawRows) {
            if (r.Year !== year) {
                continue;
            }
            const doc = (r.DoctorName || "").trim();
            if (!doc) {
                continue;
            }
            doctors.add(doc);
        }

        return [...doctors]
            .filter((doc) => {
                const rec = this.recommendationForDoctor(doc, year);
                const surg = this.surgeriesForDoctor(doc, year);
                return rec > 0 || surg > 0;
            })
            .sort((a, b) => {
                const recA = this.recommendationForDoctor(a, year);
                const recB = this.recommendationForDoctor(b, year);
                if (recB !== recA) {
                    return recB - recA;
                }
                return (
                    this.surgeriesForDoctor(b, year) -
                    this.surgeriesForDoctor(a, year)
                );
            })
            .slice(0, limit);
    }

    private recommendationForDoctor(
        doctor: string,
        year: number = this.comparisonYear,
    ): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        if (this.useDeptDetailForDoctorRecs()) {
            let sum = 0;
            for (const r of this.deptRows) {
                const name = (r.DoctorName || "").trim();
                if (!name || !this.doctorNamesMatch(name, doc)) {
                    continue;
                }
                if (!this.deptRowMatchesYear(r, year)) {
                    continue;
                }
                if (!this.deptRowMatchesSelectedDepartment(r)) {
                    continue;
                }
                sum += r.Count || 0;
            }
            return sum;
        }
        if (this.selectedDepartmentValue && this.deptDetailHasDoctor) {
            let sum = 0;
            for (const r of this.deptRows) {
                const name = (r.DoctorName || "").trim();
                if (!name || !this.doctorNamesMatch(name, doc)) {
                    continue;
                }
                if (!this.deptRowMatchesYear(r, year)) {
                    continue;
                }
                if (!this.deptRowMatchesSelectedDepartment(r)) {
                    continue;
                }
                sum += r.Count || 0;
            }
            return sum;
        }
        let sum = 0;
        const hasYear = this.doctorRecommendationsHaveYear;
        for (const r of this.doctorRecommendationRows) {
            if (!this.doctorNamesMatch(r.Doctor, doc)) {
                continue;
            }
            if (hasYear && (r.Year ?? 0) !== year) {
                continue;
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    private surgeriesForDoctor(
        doctor: string,
        year: number = this.comparisonYear,
    ): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        const wing = this.selectedDepartmentValue;
        if (this.countByDeptRawRows.length) {
            const fromCountByDept =
                this.api.surgeryCountForDoctorFromCountByDept(
                    this.countByDeptRawRows,
                    doc,
                    year,
                    wing,
                );
            if (fromCountByDept > 0) {
                return fromCountByDept;
            }
        }
        const fromApi = this.surgeryCountForDoctorFromApi(doc, year);
        if (fromApi > 0) {
            return fromApi;
        }
        let sum = 0;
        for (const r of this.doctorSurgeryRawRows) {
            if (r.Year !== year) {
                continue;
            }
            if (this.doctorNamesMatch(r.DoctorName, doc)) {
                sum += r.Count || 0;
            }
        }
        return sum;
    }

    private recommendationForDept(
        deptKey: string,
        year: number = this.comparisonYear,
    ): number {
        const key = deptKey.trim();
        if (!key) {
            return 0;
        }
        const matchKeys = new Set(surgeryDepartmentMatchKeys(key));
        let sum = 0;
        for (const r of this.deptRows) {
            const value = (
                r.DepartmentValue ||
                inferSurgeryDepartmentValue(r.Department || "") ||
                ""
            ).trim();
            const label = (r.Department || "").trim();
            const rowKeys = surgeryDepartmentMatchKeys(value || label);
            if (
                !rowKeys.some((k) => matchKeys.has(k)) &&
                value !== key &&
                label !== key
            ) {
                continue;
            }
            if (!this.deptRowMatchesYear(r, year)) {
                continue;
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    private surgeriesForDepartment(
        deptKey: string,
        year: number = this.comparisonYear,
    ): number {
        if (this.countByDeptRawRows.length) {
            return this.api.surgeryCountForWingFromCountByDept(
                this.countByDeptRawRows,
                deptKey,
                year,
            );
        }
        const keys = new Set<string>();
        for (const k of surgeryDepartmentMatchKeys(deptKey)) {
            keys.add(k);
        }
        for (const r of this.deptRows) {
            const label = (r.Department || "").trim();
            const value = (
                r.DepartmentValue ||
                inferSurgeryDepartmentValue(label) ||
                ""
            ).trim();
            if (
                value === deptKey.trim() ||
                label === deptKey.trim() ||
                deptKey.trim() === value ||
                deptKey.trim() === label
            ) {
                for (const k of surgeryDepartmentMatchKeys(value || label)) {
                    keys.add(k);
                }
            }
        }
        let sum = 0;
        for (const r of this.surgeryDeptRawRows) {
            if (r.Year !== year) {
                continue;
            }
            const d = (r.Department || "").trim();
            if (keys.has(d)) {
                sum += r.Count || 0;
            }
        }
        return sum;
    }

    private totalRecommendationsForYear(year: number): number {
        const doctors = this.doctorsForComparisonChart(year, 500);
        return doctors.reduce(
            (s, d) => s + this.recommendationForDoctor(d, year),
            0,
        );
    }

    private totalSurgeriesForDoctorsYear(year: number): number {
        return this.doctorSurgeryRawRows
            .filter((r) => r.Year === year)
            .reduce((s, r) => s + (r.Count || 0), 0);
    }

    private totalDeptRecommendationsForYear(year: number): number {
        return this.topDepartmentsForYear(year).reduce(
            (s, d) => s + d.rec,
            0,
        );
    }

    private totalSurgeriesForDepartmentsYear(year: number): number {
        return this.surgeryDeptRawRows
            .filter((r) => r.Year === year)
            .reduce((s, r) => s + (r.Count || 0), 0);
    }

    private doctorNamesMatch(a: string, b: string): boolean {
        const x = (a || "").trim();
        const y = (b || "").trim();
        if (!x || !y) {
            return false;
        }
        if (x === y) {
            return true;
        }
        return x.includes(y) || y.includes(x);
    }

    private surgeryCountForWing(wing: string): number {
        return this.surgeriesForDepartment(wing, this.comparisonYear);
    }

    private rebuildSurgeryDeptLookup(): void {
        this.surgeryDeptByKey.clear();
        for (const row of this.api.aggregateSurgeriesByDepartmentForYear(
            this.surgeryDeptRawRows,
            this.comparisonYear,
        )) {
            this.surgeryDeptByKey.set(row.Department, row.Count);
        }
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
