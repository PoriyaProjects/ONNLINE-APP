import { animate, style, transition, trigger } from "@angular/animations";
import { HttpClient } from "@angular/common/http";
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    ViewChild,
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { DomSanitizer, SafeStyle } from "@angular/platform-browser";
import { environment } from "src/environments/environment";
import { DepartmentIncomeLocalCacheService } from "./department-income-local-cache.service";
import {
    getIncomeChartTooltipContext,
    INCOME_DASHBOARD_YEAR_CHART_COLORS,
    patchIncomeGoogleChartHtmlTooltips,
} from "./department-income-dashboard-chart-tooltips";

export interface DepartmentComparisonDto {
    DepartmentName: string;
    /** נגזר מ-Year1 — תאימות לאחור */
    Income2024: number;
    /** נגזר מ-CurrentYear — תאימות לאחור */
    Income2025: number;
    Year4?: number;
    Year3?: number;
    Year2?: number;
    Year1?: number;
    CurrentYear?: number;
    /** מ־GetDepartmentIncomeByDiagnosis — שנים דינמיות */
    YearlyIncome?: Record<string, number>;
    /** שדות פירוט מ־GetDepartmentIncomeByDiagnosis — כמה שורות למחלקה */
    IncomeCategory?: string;
    Organization?: string;
    UnifiedCategory?: string;
    MedicalUnitIncome?: string;
    SubMedicalUnitDescription?: string;
}

export interface DepartmentDetailedDataDto {
    DepartmentName: string;
    Year: string;
    Month: string;
    UnifiedDiagnosis: string;
    IncomeCategory: string;
    MedicalUnitIncome: string;
    RealValue: number;
    ChargedUnits: string;
    CatalogName: string;
    CatalogName2: string;
    Cash2021: number;
    Cash2022: number;
    Cash2023: number;
    Cash2024: number;
    Cash2025: number;
    Units2021: number;
    Units2022: number;
    Units2023: number;
    Units2024: number;
    Units2025: number;
}

export interface YearlyIncomeDto {
    Year: string;
    TotalRealValue: number;
}

export interface TopDepartmentDto {
    DepartmentName: string;
    Income2024: number;
    Income2025: number;
    difference: number;
    percentage: number;
    managerName?: string;
}

export interface BossPayerInsightRow {
    payer: string;
    currentTotal: number;
    priorTotal: number;
    diff: number;
    percent: number | null;
    sharePercent: number;
    hospitalSharePercent: number;
    isOutlier: boolean;
}

export type BossViewMode = "table" | "pie" | "monthly";
export type BossFilterLoadingKey =
    | "wing"
    | "organization"
    | "unifiedCategory"
    | "month"
    | null;

interface BossFilterBaseline {
    diagnosis: string;
    organization: string;
    unifiedCategory: string;
    incomeMonth: string;
}

interface BossFilterRestoreResult {
    restored: boolean;
    wingWillChange: boolean;
    yearlyApiWillChange: boolean;
    monthWillChange: boolean;
    restoreAllWings: boolean;
}

export interface DepartmentIncomeYearlyRow {
    UnifiedDiagnosis?: string;
    PatientSummary?: string;
    UnifiedCategory?: string;
    Organization?: string;
    UnifiedPayer?: string;
    PayerType?: string;
    IncomeCategory?: string;
    Year4: number;
    Year3: number;
    Year2: number;
    Year1: number;
    CurrentYear: number;
    Month?: string;
    YTYDiff?: number;
    YTYPercent?: number;
}

/** שורת טבלה/גרף לפי UnifiedPayer בתוך סוג PayerType נבחר */
export interface PayerIncomeTableRow {
    UnifiedPayer: string;
    Year4: number;
    Year3: number;
    Year2: number;
    Year1: number;
    CurrentYear: number;
    Income2024: number;
    Income2025: number;
    YTYDiff: number;
    YTYPercent: number;
    Month?: string;
}

export interface FiveYearColumnDef {
    id: string;
    label: string;
    field: string;
}

interface EmployeeInfo {
    userName: string;
    gender: string;
    employeeID: string;
    profilePicture: string;
    departnentCode: string | null;
    departmentName: string | null;
}

@Component({
    selector: "app-department-income-dashboard",
    templateUrl: "./department-income-dashboard.component.html",
    styleUrls: ["./department-income-dashboard.component.css"],
    animations: [
        trigger("fadeInOut", [
            transition(":enter", [
                style({ opacity: 0, transform: "scale(0.95)" }),
                animate(
                    "300ms ease-in",
                    style({ opacity: 1, transform: "scale(1)" }),
                ),
            ]),
            transition(":leave", [
                animate(
                    "300ms ease-out",
                    style({ opacity: 0, transform: "scale(0.95)" }),
                ),
            ]),
        ]),
        trigger("graphToolbarMode", [
            transition("* => *", [
                style({ opacity: 0.88, transform: "scale(0.992)" }),
                animate(
                    "420ms cubic-bezier(0.22, 1, 0.36, 1)",
                    style({ opacity: 1, transform: "scale(1)" }),
                ),
            ]),
        ]),
        trigger("tableDeptHintBanner", [
            transition(":enter", [
                style({
                    opacity: 0,
                    transform: "translateY(calc(-100% - 18px))",
                }),
                animate(
                    "520ms cubic-bezier(0.22, 1, 0.36, 1)",
                    style({
                        opacity: 1,
                        transform: "translateY(0)",
                    }),
                ),
            ]),
            transition(":leave", [
                animate(
                    "320ms cubic-bezier(0.4, 0, 1, 1)",
                    style({
                        opacity: 0,
                        transform: "translateY(-28px)",
                    }),
                ),
            ]),
        ]),
    ],
})
export class DepartmentIncomeDashboardComponent
    implements OnInit, OnDestroy, AfterViewInit
{
    @ViewChild("mainSort") mainSort?: MatSort;
    @ViewChild("payerSort") payerSort?: MatSort;
    @ViewChild("graphBody") graphBodyRef?: ElementRef<HTMLElement>;

    private graphBodyLastWidth = 0;
    private graphLayoutResizeTimer: ReturnType<typeof setTimeout> | null = null;
    private graphResizeObserver: {
        disconnect(): void;
        observe(target: Element): void;
    } | null = null;
    private graphLayoutSignature = "";
    graphChartPixelWidth: number | string = "100%";
    graphChartPixelHeight = 320;

    departmentTableSearch = "";
    payerTableSearch = "";

    /** רמז ויזואלי אחרי כל טעינת טבלה: עמודת המחלקה לחיצה לפירוט */
    showTableDepartmentClickHint = false;
    private tableDeptClickHintTimer: ReturnType<typeof setTimeout> | null =
        null;

    // Guide Avatar
    showGuideAvatar = true;
    dontShowGuideAgain = false; // checkbox "אל תציג יותר"
    showArticleShowcase = false;
    currentArticle: string = "";

    // Data arrays
    departmentIncomeData: DepartmentComparisonDto[] = [];
    departmentDetailedData: DepartmentDetailedDataDto[] = [];
    diagnosesList: string[] = [];
    yearlyTotalData: YearlyIncomeDto[] = [];
    topDepartments: TopDepartmentDto[] = [];

    // Chart data - with numbers in millions
    // Chart data - with numbers in millions
    // Chart data - with numbers in millions
    chartData: any[] = [];
    chartColumns: any[] = [
        "מחלקה",
        { type: "number", label: "" }, // Will be updated dynamically
        { type: "string", role: "annotation" },
        { type: "number", label: "" }, // Will be updated dynamically
        { type: "string", role: "annotation" },
    ];

    chartOptions: any = {
        title: "השוואת הכנסות מחלקות", // Will be updated dynamically
        titleTextStyle: {
            color: "#0f172a",
            fontSize: 16,
            bold: true,
        },
        hAxis: {
            title: "",
            textStyle: {
                color: "#0f172a",
                fontSize: 14,
                bold: true,
                fontName: "Segoe UI",
            },
            slantedText: true,
            slantedTextAngle: 35,
        },
        vAxis: {
            title: "הכנסות (מיליוני ₪)",
            minValue: 0,
            gridlines: {
                color: "#e2e8f0",
            },
            textStyle: {
                color: "#64748b",
                fontSize: 11,
            },
            titleTextStyle: {
                color: "#0f172a",
                fontSize: 12,
                bold: true,
            },
        },
        bars: "vertical",
        legend: {
            position: "top",
            alignment: "end",
            textStyle: {
                color: "#0f172a",
                fontSize: 13,
                bold: true,
                fontName: "Segoe UI",
            },
        },
        chartArea: {
            width: "94%",
            height: "78%",
            left: 20,
            top: 42,
        },
        colors: [...INCOME_DASHBOARD_YEAR_CHART_COLORS],
        backgroundColor: {
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
        },
        dataOpacity: 0.95,
        annotations: {
            alwaysOutside: true,
            stem: { color: "transparent", length: 2 },
            textStyle: {
                fontSize: 10,
                bold: true,
                color: "#0f172a",
                fontName: "Segoe UI",
            },
        },
        bar: {
            groupWidth: "72%",
        },
        tooltip: {
            isHtml: true,
            trigger: "focus",
            textStyle: {
                color: "#0f172a",
                fontSize: 12,
            },
            showColorCode: true,
        },
        enableInteractivity: true,
        animation: {
            startup: true,
            duration: 900,
            easing: "out",
        },
        // Make bars clickable
        focusTarget: "category",
        // Modern styling for line mode
        pointSize: 6,
        lineWidth: 3,
        curveType: "function",
        pointShape: "circle",
    };

    // Boss Dashboard
    showBossDashboard = false;
    bossViewMode: BossViewMode = "table";
    bossInitialLoading = false;
    bossFilterLoadingKey: BossFilterLoadingKey = null;
    bossMonthlyChartData: any[][] = [];
    bossMonthlyChartColumns: any[] = [];
    bossMonthlyChartOptions: any = {
        title: "",
        legend: { position: "top", alignment: "end" },
        chartArea: { width: "92%", height: "72%" },
        bars: "vertical",
        bar: { groupWidth: "72%" },
        hAxis: { slantedText: true, slantedTextAngle: 35 },
        vAxis: { title: "הכנסות (מיליוני ₪)", minValue: 0 },
        fontName: "Heebo, Arial, sans-serif",
    };
    isBossWingFilterOpen = false;
    isBossOrganizationFilterOpen = false;
    isBossUnifiedCategoryFilterOpen = false;
    isBossMonthFilterOpen = false;
    private bossFiltersBaseline: BossFilterBaseline | null = null;
    bossExecutiveSummary = "";
    bossPayerInsights: BossPayerInsightRow[] = [];
    bossPayerOutliers: BossPayerInsightRow[] = [];
    bossPayerPieData: any[][] = [];
    bossPayerPieColumns: any[] = ["גורם משלם", "הכנסות YTD"];
    bossPayerPieOptions: any = {
        pieHole: 0.42,
        legend: {
            position: "labeled",
            alignment: "center",
            textStyle: { fontSize: 28, bold: true },
        },
        pieSliceTextStyle: { fontSize: 24, bold: true },
        chartArea: { width: "92%", height: "82%" },
        tooltip: { text: "both", textStyle: { fontSize: 20, bold: true } },
        sliceVisibilityThreshold: 0.015,
        fontName: "Heebo, Arial, sans-serif",
    };
    bossPayerTotalCurrent = 0;
    bossSelectedWingDeclineDiff = 0;
    bossWorstDeclineWingName = "";
    bossLoadingDisplayProgress = 0;
    bossTablePage = 0;
    readonly bossTablePageSize = 8;
    private readonly bossExcludedPayerLabels = ["לא קיים"];
    private readonly bossPayerPieTopSlices = 8;
    private readonly bossPayerOutlierMinPrior = 500_000;
    private readonly bossPayerOutlierPercentThreshold = -8;
    private bossLoadingProgressInterval: ReturnType<typeof setInterval> | null =
        null;
    private bossLoadingFinishing = false;
    private bossLoadingFinishCallback: (() => void) | null = null;
    private readonly bossLoaderTickMs = 130;

    // Table data
    displayedColumns: string[] = ["DepartmentName", "Difference"];
    fiveYearColumnDefs: FiveYearColumnDef[] = [];
    dataSource = new MatTableDataSource<DepartmentComparisonDto>([]);
    payerDataSource = new MatTableDataSource<PayerIncomeTableRow>([]);
    payerDisplayedColumns: string[] = ["UnifiedPayer", "Difference"];
    private readonly fiveYearFieldKeys = [
        "Year4",
        "Year3",
        "Year2",
        "Year1",
        "CurrentYear",
    ] as const;

    // Detailed table data with MatSort
    detailedDataSource = new MatTableDataSource<DepartmentDetailedDataDto>([]);
    detailedSort!: MatSort;

    // UI State
    isDataLoaded = false;

    selectedDepartment: DepartmentComparisonDto | null = null;
    /** «סה"כ» = כל האגפים — תצוגת דוח למנהל */
    readonly diagnosisAllValue = 'סה"כ';
    selectedDiagnosis: string = "אגף כירורגי";
    isDepartmentGraphOpen = false;
    departmentGraphTitle = "";
    isLoading = false;
    catalogLoading = false;
    isMainDataLoading = false; // Loading for main data table
    isDiagnosesLoading = false; // Loading for diagnoses list
    isChartLoading = false; // Loading for chart data
    private readonly loaderSpinDurationMs = 1000;
    private loadingProgressStartedAt: Record<string, number> = {};
    private loadingProgressRefreshId: ReturnType<typeof setInterval> | null =
        null;
    private simulatedLoadingProgress: Record<string, number> = {};
    private simulatedLoadingFinishing: Record<string, boolean> = {};
    private simulatedLoadingCallbacks: Record<
        string,
        (() => void) | undefined
    > = {};
    private simulatedLoadingIntervals: Record<
        string,
        ReturnType<typeof setInterval> | null
    > = {};
    selectedViewType: string = "cash";
    showCatalogPriceColumn: boolean = false;
    showModalIncomeFilters: boolean = false;
    chartType: string = "ColumnChart"; // 'ColumnChart' or 'LineChart'

    /** מצב תצוגה ראשי מעל הגרף: הכנסות מחלקות / גורם משלם */
    graphPrimaryView: "income" | "payer" = "income";
    isPayerYearlyLoading = false;
    private payerYearlyRawRows: DepartmentIncomeYearlyRow[] = [];
    /** מטמון גורם משלם לפי אגף — ללא מסנני UI; סינון מקומי בלבד */
    private readonly payerYearlyByScopeCache = new Map<
        string,
        DepartmentIncomeYearlyRow[]
    >();
    /** שורות גולמיות מ־API לפי אגף (ללא מסנני UI) */
    private readonly incomeRawByScopeCache = new Map<
        string,
        DepartmentComparisonDto[]
    >();
    private yearlyTotalsRaw: YearlyIncomeDto[] = [];
    private yearlyTotalsFetched = false;
    private readonly maxPayerChartBars = 18;
    private readonly defaultPayerType = "קופת חולים";
    private readonly excludedPayerLabel = "לא ידוע";
    readonly payerDepartmentAllValue = "הכל";
    selectedPayerType: string = this.defaultPayerType;
    payerTypeOptions: string[] = [this.defaultPayerType];
    selectedPayerDepartment: string = this.payerDepartmentAllValue;
    payerDepartmentOptions: string[] = [this.payerDepartmentAllValue];

    /**
     * מצב תצוגת גרף: רדיו — כפתור אחד פעיל. מצבי פילוח משתמשים במטמון פירוט (ללא קריאה חוזרת בעת החלפה).
     */
    graphToolbarDimensionMode:
        | "total"
        | "unifiedCategory"
        | "organization"
        | "departmentMonthly" = "total";

    readonly monthlyDepartmentPlaceholder = "בחר מחלקה";
    selectedMonthlyDepartment = "";
    monthlyDepartmentOptions: string[] = [];
    isMonthlyDepartmentOpen = false;
    private monthlyDepartmentYoYStats = new Map<
        string,
        { percent: number | null; priorYearLabel: string }
    >();
    private payerDepartmentYoYStats = new Map<
        string,
        { percent: number | null; priorYearLabel: string }
    >();

    get isBreakdownChartViewActive(): boolean {
        return (
            this.graphPrimaryView === "income" &&
            this.graphToolbarDimensionMode !== "total" &&
            this.graphToolbarDimensionMode !== "departmentMonthly"
        );
    }

    get isDepartmentMonthlyChartActive(): boolean {
        return (
            this.graphPrimaryView === "income" &&
            this.graphToolbarDimensionMode === "departmentMonthly"
        );
    }

    get graphPanelTitle(): string {
        if (this.graphPrimaryView === "payer") {
            return "השוואת הכנסות לפי גורם משלם";
        }
        if (this.isDepartmentMonthlyChartActive) {
            return "סה״כ הכנסה למחלקה לפי חודש";
        }
        return "השוואת הכנסות מחלקות";
    }

    get tablePanelTitle(): string {
        return this.graphPrimaryView === "payer"
            ? "טבלת הכנסות לפי גורם משלם"
            : "טבלת הכנסות מחלקות";
    }

    get graphChartContextText(): string {
        const labels = this.getFiveYearLabels();
        const yearSpan =
            labels.length >= 5
                ? `${labels[0]}–${labels[4]}`
                : labels.length >= 2
                  ? `${labels[0]}–${labels[labels.length - 1]}`
                  : "";
        const yearSuffix = yearSpan ? ` (${yearSpan})` : "";

        if (this.graphPrimaryView === "payer") {
            const wingLabel = this.selectedDiagnosis || "אגף";
            const deptLabel =
                this.selectedPayerDepartment === this.payerDepartmentAllValue
                    ? "כל המחלקות"
                    : this.selectedPayerDepartment;
            const payerTypeLabel = this.selectedPayerType || "גורם משלם";
            const filterHint = this.hasActivePayerIncomeFilters()
                ? " · מסונן לפי פילטרים"
                : "";
            return `אגף «${wingLabel}» · ${deptLabel} · ${payerTypeLabel}${yearSuffix}${filterHint} — גרף וטבלה מסונכרנים`;
        }

        if (
            this.isDepartmentMonthlyChartActive &&
            this.selectedMonthlyDepartment
        ) {
            const wingLabel = this.selectedDiagnosis || "אגף";
            const filterHint = this.hasActiveIncomeFilters()
                ? " · מסונן לפי פילטרים"
                : "";
            return `מחלקה «${this.selectedMonthlyDepartment}» · ${wingLabel}${yearSuffix}${filterHint}`;
        }

        const wingLabel = this.selectedDiagnosis
            ? ` · אגף «${this.selectedDiagnosis}»`
            : "";
        const filterHint = this.hasActiveIncomeFilters()
            ? " · מסונן לפי פילטרים"
            : "";
        return `השוואת מחלקות${wingLabel}${yearSuffix}${filterHint}`;
    }

    get activeIncomeFilterNotice(): string {
        return "שים לב: יש פילטר פעיל";
    }

    /** «סיווג הכנסה» — לא נתמך בדשבורד (מקור: GetDepartmentIncomeYearly) */
    get isIncomeClassificationFilterDisabled(): boolean {
        return true;
    }

    getIncomeClassificationDisabledTooltip(): string {
        return "לא רלוונטי בדשבורד זה — סינון לפי סיווג מאוחד וקרן / מדינה בלבד";
    }

    getIncomeFiltersSidebarHint(): string {
        if (this.graphPrimaryView === "payer") {
            return "סיווג מאוחד וקרן / מדינה מסננים את גרף גורם משלם";
        }
        if (this.isDepartmentMonthlyChartActive) {
            return "סיווג מאוחד וקרן / מדינה מסננים את הגרף החודשי";
        }
        return "סיווג מאוחד וקרן / מדינה מסננים את הגרף והטבלה";
    }

    isBreakdownChartsLoading = false;
    dimensionalChartColumns: any[] = [];
    dimensionalChartData: any[] = [];
    dimensionalChartOptions: any = {};

    /** קבוצות שורות לפי מחלקה לפילוח גרף — נבנה מ־GetDepartmentIncomeByDiagnosis (ללא קריאת GetDepartmentDetailedData) */
    private breakdownDetailRawResults: Array<{
        departmentName: string;
        rows: DepartmentDetailedDataDto[];
    }> | null = null;
    private breakdownDetailCacheKey: string | null = null;
    /** כל השורות מהתשובה האחרונה של GetDepartmentIncomeByDiagnosis (לפני אגרגציה לטבלה) */
    private diagnosisApiRawRows: DepartmentComparisonDto[] = [];
    /** מטמון גולמי לפי אגף — ללא סינון; פילטרים מיושמים מקומית על IncomeCategory / Organization / UnifiedCategory */
    private readonly incomeRawUnfilteredByScope = new Map<
        string,
        DepartmentComparisonDto[]
    >();

    /** מטמון GetDepartmentDetailedData — מפתח: שם מחלקה בלבד; סינון מקומי */
    private departmentDetailedDataCache = new Map<
        string,
        {
            rows: DepartmentDetailedDataDto[];
            meta: Record<string, any> | null;
        }
    >();
    private yearlyTotalCacheKey: string | null = null;
    private readonly maxBreakdownDepartments = 35;
    /** מינימום הכנסה (₪) לעמודה בגרפי פילוח — מתחת ל-0.5M רק בטבלה */
    private readonly breakdownChartMinCash = 500_000;
    private readonly breakdownPalette = [
        "#2563eb",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#ec4899",
        "#06b6d4",
        "#84cc16",
        "#f97316",
        "#6366f1",
        "#14b8a6",
        "#a855f7",
    ];

    // Catalog columns - updated for sorting
    cashColumns: string[] = [
        "CatalogName2",
        "Cash2021",
        "Cash2022",
        "Cash2023",
        "Cash2024",
        "Cash2025",
        "CashDiff",
    ];

    bothColumns: string[] = [
        "CatalogName2",
        "Cash2021",
        "Units2021",
        "Cash2022",
        "Units2022",
        "Cash2023",
        "Units2023",
        "Cash2024",
        "Units2024",
        "Cash2025",
        "Units2025",
        "CashDiff",
    ];

    unitsColumns: string[] = [
        "CatalogName2",
        "Units2021",
        "Units2022",
        "Units2023",
        "Units2024",
        "Units2025",
    ];

    displayedCatalogColumns: string[] = this.cashColumns;

    // Top 5 Departments - Feature
    topDepartmentsViewType: string = "difference"; // 'difference' or 'percentage'
    showTopDepartmentsSidebar: boolean = false;

    // Income filters sidebar
    readonly incomeFilterAllValue = "הכל";
    showIncomeFiltersSidebar: boolean = false;
    isIncomeSourceOpen: boolean = false;
    isIncomeClassificationOpen: boolean = false;
    isOrganizationOpen: boolean = false;
    isUnifiedCategoryOpen: boolean = false;
    isIncomeMonthOpen: boolean = false;
    selectedIncomeSource: string = this.incomeFilterAllValue;
    selectedIncomeClassification: string = this.incomeFilterAllValue;
    selectedOrganization: string = this.incomeFilterAllValue;
    selectedUnifiedCategory: string = this.incomeFilterAllValue;
    selectedIncomeMonth: string = this.incomeFilterAllValue;
    incomeSourceOptions: string[] = [this.incomeFilterAllValue, "מדינה", "קרן"];
    incomeClassificationOptions: string[] = [this.incomeFilterAllValue];
    organizationOptions: string[] = [this.incomeFilterAllValue];
    unifiedCategoryOptions: string[] = [this.incomeFilterAllValue];
    incomeMonthOptions: string[] = [
        this.incomeFilterAllValue,
        ...DepartmentIncomeDashboardComponent.INCOME_REPORT_HEBREW_MONTHS,
    ];

    // Theme
    isDark: boolean = false;

    // Employee info
    employeeInfo: EmployeeInfo | null = null;
    employeeLoading = false;
    employeeError = false;
    employeeUserName: string | null = null;
    employeeFirstName: string | null = null;
    employeeLastName: string | null = null;
    employeeFunctionDescription: string | null = null;
    employeeLocalDepartment: string | null = null;

    /** משפט מוכן להצגה: חודש היחוס העדכני בדוח ההכנסות (מפורטי מחלקה בדגימה) */
    incomeReportAsOfLabel: string | null = null;

    /** נקבע אחרי ניסיון טעינת פירוט לדוגמה (כדי להבדיל «טוען» מ«אין חודש בנתונים») */
    incomeReportAsOfFetchDone = false;

    /** נקבע כאשר חודש היחוס מגיע מ־GetYearlyTotalIncome (referenceYear/referenceMonth) */
    referencePeriodFromYearlyIncome = false;

    /** שנת הסיום בחלון 5 השנים (מ־referenceYear / סיכומים שנתיים — לא תמיד שווה לשנה הקלנדרית) */
    private incomeFiveYearEndYear: number | null = null;
    private yearlyTotalsLoading = false;
    private readonly yearlyTotalsReadyCallbacks: Array<() => void> = [];

    private static readonly INCOME_REPORT_HEBREW_MONTHS: readonly string[] = [
        "ינואר",
        "פברואר",
        "מרץ",
        "אפריל",
        "מאי",
        "יוני",
        "יולי",
        "אוגוסט",
        "ספטמבר",
        "אוקטובר",
        "נובמבר",
        "דצמבר",
    ];

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private sanitizer: DomSanitizer,
        private localDataCache: DepartmentIncomeLocalCacheService,
    ) {}

    ngOnInit(): void {
        // console.log("gOnInit called");
        // Open guide on every visit unless user checked "אל תציג יותר"
        const dontShowAgain = localStorage.getItem(
            "dashboardGuideDontShowAgain",
        );
        if (dontShowAgain === "true") {
            this.showGuideAvatar = false;
        }
        // else: showGuideAvatar stays true → guide opens automatically

        // Load employee info from localStorage + API
        this.employeeUserName = localStorage.getItem("loginUserName");
        this.employeeFirstName = localStorage.getItem("FirstName");
        this.employeeLastName = localStorage.getItem("LastName");
        this.employeeFunctionDescription = localStorage.getItem(
            "FunctionDescription",
        );
        this.employeeLocalDepartment = localStorage.getItem("Depart");

        if (this.employeeUserName) {
            this.loadEmployeeInfo(this.employeeUserName);
        }

        // Initialize chart theme and body class for select panel (dark mode)
        this.updateChartTheme();
        this.syncBodyDarkClass();
        this.updateChartOptionsForType();
        this.refreshFiveYearColumnDefs();
        this.loadIncomeFilterOptions();
        this.loadDiagnosesList();
        this.loadYearlyTotalsForChart();
        // Load data after diagnoses list is loaded
        setTimeout(() => {
            if (this.selectedDiagnosis) {
                this.loadDepartmentIncomeByDiagnosis();
            } else {
                this.loadDepartmentIncomeData();
            }
        }, 500);
        this.displayedCatalogColumns = this.cashColumns;
    }

    ngAfterViewInit(): void {
        this.initMainTableDataSource();
        this.initPayerTableDataSource();
        this.queueTableSortSync();
        this.initGraphResizeObserver();
    }

    ngOnDestroy(): void {
        document.body.classList.remove("department-dashboard-dark");
        this.stopLoadingProgressTicker();
        this.stopBossLoadingAnimation();
        this.stopAllSimulatedLoadingProgress();
        this.graphResizeObserver?.disconnect();
        this.graphResizeObserver = null;
        if (this.graphLayoutResizeTimer) {
            clearTimeout(this.graphLayoutResizeTimer);
            this.graphLayoutResizeTimer = null;
        }
        if (this.tableDeptClickHintTimer) {
            clearTimeout(this.tableDeptClickHintTimer);
            this.tableDeptClickHintTimer = null;
        }
    }

    @HostListener("window:resize")
    onWindowResize(): void {
        this.graphLayoutSignature = "";
        this.scheduleResponsiveChartLayout(
            this.graphBodyLastWidth ||
                this.graphBodyRef?.nativeElement?.clientWidth ||
                720,
        );
    }

    private initMainTableDataSource(): void {
        this.dataSource.sortingDataAccessor = (row, columnId) =>
            this.getMainTableSortValue(row, columnId);
        this.dataSource.filterPredicate = (row, filter) => {
            const term = filter.trim().toLowerCase();
            if (!term) {
                return true;
            }
            return String(row?.DepartmentName ?? "")
                .toLowerCase()
                .includes(term);
        };
    }

    private initPayerTableDataSource(): void {
        this.payerDataSource.sortingDataAccessor = (row, columnId) =>
            this.getPayerTableSortValue(row, columnId);
        this.payerDataSource.filterPredicate = (row, filter) => {
            const term = filter.trim().toLowerCase();
            if (!term) {
                return true;
            }
            return String(row?.UnifiedPayer ?? "")
                .toLowerCase()
                .includes(term);
        };
    }

    private getMainTableSortValue(
        row: DepartmentComparisonDto,
        columnId: string,
    ): string | number {
        if (columnId === "DepartmentName") {
            return String(row?.DepartmentName ?? "").toLocaleLowerCase("he");
        }
        if (columnId === "Difference") {
            return this.getLatestPriorYearDiff(row);
        }
        const yearCol = this.fiveYearColumnDefs.find((c) => c.id === columnId);
        if (yearCol) {
            return this.getRowFiveYearValue(row, yearCol.field);
        }
        return 0;
    }

    private getPayerTableSortValue(
        row: PayerIncomeTableRow,
        columnId: string,
    ): string | number {
        if (columnId === "UnifiedPayer") {
            return String(row?.UnifiedPayer ?? "").toLocaleLowerCase("he");
        }
        if (columnId === "Difference") {
            return this.getPayerYtyDiff(row);
        }
        const yearCol = this.fiveYearColumnDefs.find((c) => c.id === columnId);
        if (yearCol) {
            return this.getRowFiveYearValue(row, yearCol.field);
        }
        return 0;
    }

    private syncMainTableSort(): void {
        if (!this.mainSort) {
            return;
        }
        this.dataSource.sort = this.mainSort;
        const currentYearCol = this.fiveYearColumnDefs.find(
            (c) => c.field === "CurrentYear",
        );
        const defaultCol = currentYearCol?.id ?? "Difference";
        if (!this.mainSort.active) {
            this.mainSort.active = defaultCol;
            this.mainSort.direction = "desc";
        }
        this.mainSort.sortChange.emit({
            active: this.mainSort.active,
            direction: this.mainSort.direction,
        });
    }

    private syncPayerTableSort(): void {
        if (!this.payerSort) {
            return;
        }
        this.payerDataSource.sort = this.payerSort;
        const currentYearCol = this.fiveYearColumnDefs.find(
            (c) => c.field === "CurrentYear",
        );
        const defaultCol = currentYearCol?.id ?? "Difference";
        if (!this.payerSort.active) {
            this.payerSort.active = defaultCol;
            this.payerSort.direction = "desc";
        }
        this.payerSort.sortChange.emit({
            active: this.payerSort.active,
            direction: this.payerSort.direction,
        });
    }

    private queueTableSortSync(): void {
        setTimeout(() => {
            if (this.graphPrimaryView === "income") {
                this.syncMainTableSort();
            } else {
                this.syncPayerTableSort();
            }
        }, 0);
    }

    applyDepartmentTableSearch(): void {
        this.dataSource.filter = this.departmentTableSearch
            .trim()
            .toLowerCase();
    }

    applyPayerTableSearch(): void {
        this.payerDataSource.filter = this.payerTableSearch
            .trim()
            .toLowerCase();
    }

    clearDepartmentTableSearch(): void {
        this.departmentTableSearch = "";
        this.applyDepartmentTableSearch();
    }

    clearPayerTableSearch(): void {
        this.payerTableSearch = "";
        this.applyPayerTableSearch();
    }

    private maybeShowTableDepartmentClickHint(): void {
        if (!this.dataSource.data?.length) {
            return;
        }
        this.showTableDepartmentClickHint = true;
        if (this.tableDeptClickHintTimer) {
            clearTimeout(this.tableDeptClickHintTimer);
        }
        /* ~520ms כניסה מלמעלה, ואז ~3s להצגה לפני סגירה */
        this.tableDeptClickHintTimer = setTimeout(() => {
            this.dismissTableDepartmentClickHint();
        }, 3520);
        this.cdr.detectChanges();
    }

    dismissTableDepartmentClickHint(): void {
        if (this.tableDeptClickHintTimer) {
            clearTimeout(this.tableDeptClickHintTimer);
            this.tableDeptClickHintTimer = null;
        }
        this.showTableDepartmentClickHint = false;
        this.cdr.detectChanges();
    }

    /**
     * Load department income comparison data
     */
    loadDepartmentIncomeData(forceRefresh = false): void {
        const scopeKey = this.getIncomeScopeKey();
        if (!forceRefresh) {
            const cachedRaw = this.readIncomeScopeFromCache(scopeKey);
            if (cachedRaw?.length) {
                this.applyIncomeFiltersAndRefreshViews(cachedRaw, true);
                return;
            }
        }

        this.isDataLoaded = false;
        this.isMainDataLoading = true;
        this.startSimulatedLoadingProgress("main");
        this.incomeReportAsOfLabel = null;
        this.incomeReportAsOfFetchDone = false;
        this.referencePeriodFromYearlyIncome = false;

        this.http
            .post(
                environment.url + "GetDepartmentIncomeComparison",
                this.buildUnfilteredIncomeFilterPayload(),
            )
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        const rawList = Array.isArray(response.d)
                            ? response.d
                            : [];
                        const normalized =
                            this.normalizeDiagnosisComparisonRows(rawList);
                        this.writeIncomeScopeToCache(scopeKey, normalized);
                        this.applyIncomeFiltersAndRefreshViews(
                            normalized,
                            true,
                        );
                        this.snackBar.open("✓ נתונים נטענו בהצלחה", "סגור", {
                            duration: 3000,
                        });
                    } else {
                        this.completeMainDataLoading(true);
                    }
                },
                (error) => {
                    console.error(
                        "Error loading department income data:",
                        error,
                    );
                    this.incomeReportAsOfLabel = null;
                    this.incomeReportAsOfFetchDone = false;
                    this.completeMainDataLoading(true);
                    this.cdr.detectChanges();
                    this.snackBar.open("❌ שגיאה בטעינת הנתונים", "סגור", {
                        duration: 3000,
                    });
                },
            );
    }

    /**
     * Load department income by selected diagnosis
     */

    onDiagnosisChange(event: any): void {
        this.invalidateDepartmentDetailedCache();
        this.selectedPayerDepartment = this.payerDepartmentAllValue;
        if (this.graphPrimaryView === "payer") {
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
                this.refreshPayerViewsFromCache();
            });
            return;
        }
        if (this.isDepartmentMonthlyChartActive) {
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshMonthlyDepartmentOptions();
                this.updateDepartmentMonthlyChartData();
            });
            return;
        }
        this.loadDepartmentIncomeByDiagnosis();
    }

    setGraphPrimaryView(mode: "income" | "payer"): void {
        if (this.graphPrimaryView === mode) {
            return;
        }
        this.graphPrimaryView = mode;
        if (mode === "income") {
            if (this.graphToolbarDimensionMode === "departmentMonthly") {
                this.ensurePayerYearlyRawLoaded(() => {
                    this.refreshMonthlyDepartmentOptions();
                    this.updateDepartmentMonthlyChartData();
                });
            } else if (this.graphToolbarDimensionMode !== "total") {
                this.ensureBreakdownDetailCacheLoaded();
            } else {
                this.updateChartColumns();
                this.updateChartData();
            }
            this.updateChartTheme();
        } else {
            this.graphToolbarDimensionMode = "total";
            this.clearDimensionalChartDisplay();
            this.selectedPayerDepartment = this.payerDepartmentAllValue;
            if (
                this.selectedIncomeClassification !== this.incomeFilterAllValue
            ) {
                this.selectedIncomeClassification = this.incomeFilterAllValue;
            }
            this.closeIncomeFilterDropdowns();
            this.loadYearlyTotalsForChart();
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
                this.refreshPayerViewsFromCache(true);
            });
        }
        this.queueTableSortSync();
        this.graphLayoutSignature = "";
        this.scheduleChartResize();
        this.cdr.detectChanges();
    }

    refreshDashboardData(): void {
        this.clearDashboardDataCaches();
        if (this.graphPrimaryView === "payer") {
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
                this.refreshPayerViewsFromCache(true);
            });
            return;
        }
        if (this.selectedDiagnosis) {
            this.loadDepartmentIncomeByDiagnosis(true);
        } else {
            this.loadDepartmentIncomeData(true);
        }
    }

    loadDepartmentIncomeYearly(): void {
        this.ensurePayerYearlyRawLoaded(() => {
            this.refreshPayerYearlyFilterOptions();
            this.refreshPayerTypeOptions();
            this.refreshPayerDepartmentOptions();
            this.refreshPayerViewsFromCache(true);
        });
    }

    /** מפתח מטמון לפי אגף בלבד — מסנני UI מיושמים מקומית */
    private getIncomeScopeKey(): string {
        if (this.isAllWingsSelected()) {
            return "__comparison__";
        }
        return String(this.selectedDiagnosis ?? "").trim() || "__comparison__";
    }

    isAllWingsSelected(): boolean {
        const d = String(this.selectedDiagnosis ?? "").trim();
        return !d || d === this.diagnosisAllValue;
    }

    isSpecificWingSelected(): boolean {
        return !this.isAllWingsSelected();
    }

    getWingDisplayLabel(): string {
        if (this.isAllWingsSelected()) {
            return this.diagnosisAllValue;
        }
        return this.selectedDiagnosis || "בחר אגף";
    }

    getBossWingFilterOptions(): string[] {
        return this.getBossWingFilterOptionsFromRaw(this.diagnosesList ?? []);
    }

    private buildIncomeDataCacheKey(): string {
        return JSON.stringify({
            scope: this.getIncomeScopeKey(),
            filters: this.buildIncomeFilterRequest(),
        });
    }

    private buildPayerYearlyCacheKey(): string {
        return JSON.stringify({
            scope: this.getIncomeScopeKey(),
            filters: this.buildIncomeFilterRequest(),
        });
    }

    private clearDashboardDataCaches(): void {
        this.incomeRawByScopeCache.clear();
        this.incomeRawUnfilteredByScope.clear();
        this.payerYearlyByScopeCache.clear();
        this.payerYearlyRawRows = [];
        this.yearlyTotalsRaw = [];
        this.yearlyTotalsFetched = false;
        this.yearlyTotalCacheKey = null;
        this.incomeFiveYearEndYear = null;
        this.invalidateBreakdownDetailCache();
        this.localDataCache.clearAll();
    }

    private incomeScopeStorageKey(scopeKey: string): string {
        return `incomeScope:${encodeURIComponent(scopeKey)}`;
    }

    private payerYearlyStorageKey(scopeKey: string): string {
        return `payerYearly:${encodeURIComponent(scopeKey)}`;
    }

    private buildYearlyTotalsStorageKey(
        filters = this.buildIncomeFilterRequest(),
    ): string {
        return `yearlyTotals:${encodeURIComponent(JSON.stringify(filters))}`;
    }

    private readIncomeScopeFromCache(
        scopeKey: string,
    ): DepartmentComparisonDto[] | null {
        const inMemory = this.incomeRawUnfilteredByScope.get(scopeKey);
        if (inMemory?.length) {
            return inMemory;
        }
        const local = this.localDataCache.get<DepartmentComparisonDto[]>(
            this.incomeScopeStorageKey(scopeKey),
        );
        if (local?.length) {
            this.incomeRawUnfilteredByScope.set(scopeKey, local);
            return local;
        }
        return null;
    }

    private writeIncomeScopeToCache(
        scopeKey: string,
        rows: DepartmentComparisonDto[],
    ): void {
        this.incomeRawUnfilteredByScope.set(scopeKey, rows);
        this.localDataCache.set(this.incomeScopeStorageKey(scopeKey), rows);
    }

    private readPayerYearlyFromCache(
        scopeKey: string,
    ): DepartmentIncomeYearlyRow[] | null {
        const inMemory = this.payerYearlyByScopeCache.get(scopeKey);
        if (inMemory?.length) {
            return inMemory;
        }
        const local = this.localDataCache.get<DepartmentIncomeYearlyRow[]>(
            this.payerYearlyStorageKey(scopeKey),
        );
        if (local?.length) {
            this.payerYearlyByScopeCache.set(scopeKey, local);
            return local;
        }
        return null;
    }

    private writePayerYearlyToCache(
        scopeKey: string,
        rows: DepartmentIncomeYearlyRow[],
    ): void {
        this.payerYearlyByScopeCache.set(scopeKey, rows);
        this.localDataCache.set(this.payerYearlyStorageKey(scopeKey), rows);
    }

    private readYearlyTotalsFromCache(
        storageKey: string,
    ): {
        rows: YearlyIncomeDto[];
        envelope: Record<string, unknown> | null;
    } | null {
        return this.localDataCache.get<{
            rows: YearlyIncomeDto[];
            envelope: Record<string, unknown> | null;
        }>(storageKey);
    }

    private writeYearlyTotalsToCache(
        storageKey: string,
        rows: YearlyIncomeDto[],
        envelope: Record<string, unknown> | null,
    ): void {
        this.localDataCache.set(storageKey, { rows, envelope });
    }

    private readDepartmentDetailedFromCache(cacheKey: string): {
        rows: DepartmentDetailedDataDto[];
        meta: Record<string, any> | null;
    } | null {
        const inMemory = this.departmentDetailedDataCache.get(cacheKey);
        if (inMemory) {
            return inMemory;
        }
        const local = this.localDataCache.get<{
            rows: DepartmentDetailedDataDto[];
            meta: Record<string, any> | null;
        }>(`deptDetailed:${encodeURIComponent(cacheKey)}`);
        if (local) {
            this.departmentDetailedDataCache.set(cacheKey, local);
            return local;
        }
        return null;
    }

    private writeDepartmentDetailedToCache(
        cacheKey: string,
        payload: {
            rows: DepartmentDetailedDataDto[];
            meta: Record<string, any> | null;
        },
    ): void {
        this.departmentDetailedDataCache.set(cacheKey, payload);
        this.localDataCache.set(
            `deptDetailed:${encodeURIComponent(cacheKey)}`,
            payload,
        );
    }

    private applyStoredIncomeFilterOptions(payload: {
        medicalUnitIncome: string[];
        incomeCategory: string[];
        organization: string[];
        unifiedCategory: string[];
    }): void {
        if (payload.medicalUnitIncome.length) {
            this.incomeSourceOptions = [
                this.incomeFilterAllValue,
                ...payload.medicalUnitIncome,
            ];
        }
        if (payload.incomeCategory.length) {
            this.incomeClassificationOptions = [
                this.incomeFilterAllValue,
                ...payload.incomeCategory,
            ];
        }
        if (payload.organization.length) {
            this.organizationOptions = [
                this.incomeFilterAllValue,
                ...payload.organization,
            ];
        }
        if (payload.unifiedCategory.length) {
            this.unifiedCategoryOptions = [
                this.incomeFilterAllValue,
                ...payload.unifiedCategory,
            ];
        }
    }

    /**
     * גוף/פרמטרים ל-ASMX — כל שדות הסינון חובה (null = ללא סינון בשרת).
     */
    private buildUnfilteredIncomeFilterPayload(
        extra: Record<string, string | null> = {},
    ): Record<string, string | null> {
        return {
            medicalUnitIncome: null,
            incomeCategory: null,
            organization: null,
            unifiedCategory: null,
            ...extra,
        };
    }

    /** פרמטרי query ל־GET — ASMX דורש את כל השדות (ריק = ללא סינון) */
    private buildPayerYearlyQueryParams(): Record<string, string> {
        const params: Record<string, string> = {
            medicalUnitIncome: "",
            incomeCategory: "",
            organization: "",
            unifiedCategory: "",
        };
        const diagnosis = String(this.selectedDiagnosis ?? "").trim();
        if (diagnosis && !this.isAllWingsSelected()) {
            params.diagnosis = diagnosis;
        }
        const filters = this.buildIncomeFilterRequest();
        if (filters.medicalUnitIncome) {
            params.medicalUnitIncome = filters.medicalUnitIncome;
        }
        if (filters.incomeCategory) {
            params.incomeCategory = filters.incomeCategory;
        }
        if (filters.organization) {
            params.organization = filters.organization;
        }
        if (filters.unifiedCategory) {
            params.unifiedCategory = filters.unifiedCategory;
        }
        return params;
    }

    private ensurePayerYearlyRawLoaded(onReady?: () => void): void {
        const scopeKey = this.getIncomeScopeKey();
        const cachedRows = this.readPayerYearlyFromCache(scopeKey);
        if (cachedRows?.length) {
            this.payerYearlyRawRows = cachedRows;
            onReady?.();
            return;
        }

        const blockChartUi = this.graphPrimaryView === "payer";
        if (blockChartUi) {
            this.isPayerYearlyLoading = true;
            this.isChartLoading = true;
            this.startSimulatedLoadingProgress("chart");
        }

        const queryParams: Record<string, string> = {
            medicalUnitIncome: "",
            incomeCategory: "",
            organization: "",
            unifiedCategory: "",
        };
        const diagnosis = String(this.selectedDiagnosis ?? "").trim();
        if (diagnosis && !this.isAllWingsSelected()) {
            queryParams.diagnosis = diagnosis;
        }

        this.http
            .get(environment.url + "GetDepartmentIncomeYearly", {
                params: queryParams,
            })
            .subscribe({
                next: (response: any) => {
                    const rows =
                        this.parseDepartmentIncomeYearlyPayload(response);
                    this.writePayerYearlyToCache(scopeKey, rows);
                    this.payerYearlyRawRows = rows;
                    this.refreshPayerYearlyFilterOptions();
                    this.clearPayerYearlyChartLoadingState();
                    onReady?.();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error("Error loading payer yearly income:", err);
                    this.payerYearlyRawRows = [];
                    this.payerYearlyByScopeCache.delete(scopeKey);
                    if (this.graphPrimaryView === "payer") {
                        this.chartData = [];
                    }
                    this.clearPayerYearlyChartLoadingState();
                    if (this.showBossDashboard) {
                        this.bossFilterLoadingKey = null;
                    }
                    onReady?.();
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת נתוני גורם משלם",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            });
    }

    private clearPayerYearlyChartLoadingState(): void {
        const finish = () => {
            this.isPayerYearlyLoading = false;
            this.isChartLoading = false;
            this.cdr.detectChanges();
        };
        if (
            (this.simulatedLoadingProgress["chart"] ?? 0) > 0 ||
            this.simulatedLoadingFinishing["chart"]
        ) {
            this.finishSimulatedLoadingProgress("chart", finish);
            return;
        }
        finish();
    }

    private refreshPayerViewsFromCache(showChartLoading = false): void {
        this.ensureFiveYearLabelsReady(() => {
            this.updatePayerChartData(showChartLoading);
            this.applyPayerTableSearch();
            this.queueTableSortSync();
            this.cdr.detectChanges();
        }, showChartLoading);
    }

    private hasResolvedFiveYearEndYear(): boolean {
        return (
            this.incomeFiveYearEndYear != null &&
            this.incomeFiveYearEndYear >= 1900 &&
            this.incomeFiveYearEndYear <= 2100
        );
    }

    /** טוען שנת ייחוס לפני רינדור — מונע הצגת רק 2 שנים ואז עדכון */
    private ensureFiveYearLabelsReady(
        onReady: () => void,
        showChartLoading = false,
    ): void {
        if (this.hasResolvedFiveYearEndYear()) {
            onReady();
            return;
        }
        if (showChartLoading && this.graphPrimaryView === "payer") {
            this.isChartLoading = true;
            this.startSimulatedLoadingProgress("chart");
        }
        this.loadYearlyTotalsForChart(onReady);
    }

    private parseDepartmentIncomeYearlyPayload(
        response: any,
    ): DepartmentIncomeYearlyRow[] {
        let raw = response?.d ?? response;
        if (typeof raw === "string") {
            try {
                raw = JSON.parse(raw);
            } catch {
                return [];
            }
        }
        if (Array.isArray(raw)) {
            return raw as DepartmentIncomeYearlyRow[];
        }
        const items = raw?.items ?? raw?.Items ?? raw?.data ?? raw?.Data;
        return Array.isArray(items)
            ? (items as DepartmentIncomeYearlyRow[])
            : [];
    }

    onPayerTypeChange(payerType: string): void {
        this.selectedPayerType = String(payerType ?? "").trim();
        this.updatePayerChartData();
    }

    onPayerDepartmentChange(department: string): void {
        this.selectedPayerDepartment = String(department ?? "").trim();
        this.updatePayerChartData();
    }

    onPayerDepartmentSelectOpened(opened: boolean): void {
        if (opened) {
            this.refreshPayerDepartmentYoYStats();
            this.cdr.detectChanges();
        }
    }

    private isExcludedPayerLabel(value: string | undefined | null): boolean {
        return String(value ?? "").trim() === this.excludedPayerLabel;
    }

    private refreshPayerTypeOptions(): void {
        const types = new Set<string>();
        for (const row of this.payerYearlyRawRows) {
            const t = String(row?.PayerType ?? "").trim();
            if (t && !this.isExcludedPayerLabel(t)) {
                types.add(t);
            }
        }
        this.payerTypeOptions = [...types].sort((a, b) =>
            a.localeCompare(b, "he"),
        );
        if (this.payerTypeOptions.includes(this.defaultPayerType)) {
            this.selectedPayerType = this.defaultPayerType;
        } else if (
            this.payerTypeOptions.length &&
            !this.payerTypeOptions.includes(this.selectedPayerType)
        ) {
            this.selectedPayerType = this.payerTypeOptions[0];
        }
    }

    private refreshPayerDepartmentOptions(): void {
        const wing = String(this.selectedDiagnosis ?? "").trim();
        const depts = new Set<string>();
        for (const row of this.payerYearlyRawRows) {
            const rowWing = String(row?.UnifiedDiagnosis ?? "").trim();
            if (wing && rowWing && rowWing !== wing) {
                continue;
            }
            const dept = String(row?.PatientSummary ?? "").trim();
            if (dept && !this.isExcludedPayerLabel(dept)) {
                depts.add(dept);
            }
        }
        this.payerDepartmentOptions = [
            this.payerDepartmentAllValue,
            ...[...depts].sort((a, b) => a.localeCompare(b, "he")),
        ];
        if (
            !this.payerDepartmentOptions.includes(this.selectedPayerDepartment)
        ) {
            this.selectedPayerDepartment = this.payerDepartmentAllValue;
        }
        this.refreshPayerDepartmentYoYStats();
    }

    private refreshPayerDepartmentYoYStats(): void {
        this.payerDepartmentYoYStats.clear();
        const labels = this.getFiveYearLabels();
        const priorYearLabel =
            labels[3] || this.getOlderYearFromDeptData() || "";
        const rows = this.getPayerYearlyRowsForDepartmentChart();
        for (const dept of this.payerDepartmentOptions) {
            if (dept === this.payerDepartmentAllValue) {
                continue;
            }
            let priorTotal = 0;
            let currentTotal = 0;
            for (const row of rows) {
                if (String(row?.PatientSummary ?? "").trim() !== dept) {
                    continue;
                }
                priorTotal += this.getRowFiveYearValue(row, "Year1");
                currentTotal += this.getRowFiveYearValue(row, "CurrentYear");
            }
            let percent: number | null = null;
            if (priorTotal === 0 && currentTotal === 0) {
                percent = null;
            } else if (priorTotal === 0) {
                percent = Number.POSITIVE_INFINITY;
            } else {
                percent = ((currentTotal - priorTotal) / priorTotal) * 100;
            }
            this.payerDepartmentYoYStats.set(dept, {
                percent,
                priorYearLabel,
            });
        }
    }

    getPayerDepartmentYoYPercentText(department: string): string | null {
        return this.formatDepartmentYoYPercentText(
            this.payerDepartmentYoYStats.get(department),
        );
    }

    getPayerDepartmentYoYYearHint(department: string): string | null {
        const stat = this.payerDepartmentYoYStats.get(department);
        if (!stat || stat.percent === null || !stat.priorYearLabel) {
            return null;
        }
        return `לעומת ${stat.priorYearLabel}`;
    }

    isPayerDepartmentYoYPositive(department: string): boolean | null {
        const stat = this.payerDepartmentYoYStats.get(department);
        if (!stat || stat.percent === null) {
            return null;
        }
        if (!Number.isFinite(stat.percent)) {
            return true;
        }
        return stat.percent >= 0;
    }

    private formatDepartmentYoYPercentText(
        stat: { percent: number | null } | undefined,
    ): string | null {
        if (!stat || stat.percent === null) {
            return null;
        }
        if (!Number.isFinite(stat.percent)) {
            return "∞% עליה";
        }
        const absPct = Math.abs(stat.percent).toFixed(1);
        if (stat.percent > 0.05) {
            return `${absPct}% עליה`;
        }
        if (stat.percent < -0.05) {
            return `-${absPct}% ירידה`;
        }
        return "0% ללא שינוי";
    }

    private getPayerYearlyRowsFiltered(): DepartmentIncomeYearlyRow[] {
        const wing = String(this.selectedDiagnosis ?? "").trim();
        let rows = this.payerYearlyRawRows;
        if (wing) {
            rows = rows.filter(
                (row) => String(row?.UnifiedDiagnosis ?? "").trim() === wing,
            );
        }
        const dept = String(this.selectedPayerDepartment ?? "").trim();
        if (dept && dept !== this.payerDepartmentAllValue) {
            rows = rows.filter(
                (row) => String(row?.PatientSummary ?? "").trim() === dept,
            );
        }
        const type = String(this.selectedPayerType ?? "").trim();
        if (type) {
            rows = rows.filter(
                (row) => String(row?.PayerType ?? "").trim() === type,
            );
        }
        rows = rows.filter(
            (row) =>
                !this.isExcludedPayerLabel(row?.PayerType) &&
                !this.isExcludedPayerLabel(row?.PatientSummary) &&
                !this.isExcludedPayerLabel(row?.UnifiedPayer),
        );
        return this.applyIncomeFiltersToPayerYearlyRows(rows);
    }

    private applyIncomeFiltersToPayerYearlyRows(
        rows: DepartmentIncomeYearlyRow[],
        options: { includeMonth?: boolean } = {},
    ): DepartmentIncomeYearlyRow[] {
        const includeMonth = options.includeMonth !== false;
        const hasFilters =
            this.selectedUnifiedCategory !== this.incomeFilterAllValue ||
            this.selectedOrganization !== this.incomeFilterAllValue ||
            (includeMonth &&
                this.selectedIncomeMonth !== this.incomeFilterAllValue);
        if (!Array.isArray(rows) || !hasFilters) {
            return rows || [];
        }
        return rows.filter(
            (row) =>
                this.matchesUnifiedCategoryIncomeFilter(
                    row,
                    this.selectedUnifiedCategory,
                    true,
                ) &&
                this.matchesIncomeFilter(row, this.selectedOrganization, [
                    "Organization",
                    "organization",
                ]) &&
                (!includeMonth ||
                    this.matchesIncomeFilter(row, this.selectedIncomeMonth, [
                        "Month",
                        "month",
                    ])),
        );
    }

    /** שורות לגרף החודשי בדוח למנהל — אגף + קרן + סוג פעילות (+ חודש אם נבחר) */
    private getBossMonthlyChartSourceRows(): DepartmentIncomeYearlyRow[] {
        let rows = this.payerYearlyRawRows;
        if (!this.isAllWingsSelected()) {
            const wing = String(this.selectedDiagnosis ?? "").trim();
            rows = rows.filter(
                (row) => String(row?.UnifiedDiagnosis ?? "").trim() === wing,
            );
        }
        rows = rows.filter(
            (row) =>
                !this.isExcludedPayerLabel(row?.PatientSummary) &&
                !this.isExcludedPayerLabel(row?.UnifiedPayer),
        );
        rows = this.applyIncomeFiltersToPayerYearlyRows(rows, {
            includeMonth: false,
        });
        if (this.selectedIncomeMonth !== this.incomeFilterAllValue) {
            rows = rows.filter((row) =>
                this.matchesIncomeFilter(row, this.selectedIncomeMonth, [
                    "Month",
                    "month",
                ]),
            );
        }
        return rows;
    }

    /** שורות GetDepartmentIncomeYearly לגרף/טבלת מחלקות (לפי אגף + פילטרים) */
    private getPayerYearlyRowsForDepartmentChart(): DepartmentIncomeYearlyRow[] {
        let rows = this.payerYearlyRawRows;
        if (!this.isAllWingsSelected()) {
            const wing = String(this.selectedDiagnosis ?? "").trim();
            rows = rows.filter(
                (row) => String(row?.UnifiedDiagnosis ?? "").trim() === wing,
            );
        }
        rows = rows.filter(
            (row) =>
                !this.isExcludedPayerLabel(row?.PatientSummary) &&
                !this.isExcludedPayerLabel(row?.UnifiedPayer),
        );
        return this.applyIncomeFiltersToPayerYearlyRows(rows);
    }

    /** אגרגציה לפי מחלקה (PatientSummary) מנתוני GetDepartmentIncomeYearly */
    private buildDepartmentComparisonFromPayerYearly(
        rows: DepartmentIncomeYearlyRow[],
    ): DepartmentComparisonDto[] {
        const m = new Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
            }
        >();
        for (const row of rows) {
            const name = String(row?.PatientSummary ?? "").trim();
            if (!name || this.isExcludedPayerLabel(name)) {
                continue;
            }
            const entry = m.get(name) || {
                Year4: 0,
                Year3: 0,
                Year2: 0,
                Year1: 0,
                CurrentYear: 0,
            };
            entry.Year4 += this.toNumber(row.Year4);
            entry.Year3 += this.toNumber(row.Year3);
            entry.Year2 += this.toNumber(row.Year2);
            entry.Year1 += this.toNumber(row.Year1);
            entry.CurrentYear += this.toNumber(row.CurrentYear);
            m.set(name, entry);
        }
        return [...m.entries()]
            .map(([DepartmentName, v]) => ({
                DepartmentName,
                Year4: v.Year4,
                Year3: v.Year3,
                Year2: v.Year2,
                Year1: v.Year1,
                CurrentYear: v.CurrentYear,
                Income2024: v.Year1,
                Income2025: v.CurrentYear,
            }))
            .sort(
                (a, b) =>
                    this.getRowFiveYearValue(b, "CurrentYear") -
                    this.getRowFiveYearValue(a, "CurrentYear"),
            );
    }

    /** פילטרי סיווג מאוחד / קרן·מדינה — מקור הנתונים הוא GetDepartmentIncomeYearly */
    private shouldUseYearlyDataForDepartmentChart(): boolean {
        return this.hasActivePayerIncomeFilters();
    }

    private resolveDepartmentChartRows(): DepartmentComparisonDto[] {
        if (
            this.shouldUseYearlyDataForDepartmentChart() &&
            this.payerYearlyRawRows.length
        ) {
            return this.buildDepartmentComparisonFromPayerYearly(
                this.getPayerYearlyRowsForDepartmentChart(),
            );
        }
        return this.departmentIncomeData ?? [];
    }

    /** מסננים רלוונטיים לגרף גורם משלם — UnifiedCategory + Organization בלבד */
    private hasActivePayerIncomeFilters(): boolean {
        return (
            this.selectedUnifiedCategory !== this.incomeFilterAllValue ||
            this.selectedOrganization !== this.incomeFilterAllValue ||
            this.selectedIncomeMonth !== this.incomeFilterAllValue
        );
    }

    /** אפשרויות מסנן מנתוני GetDepartmentIncomeYearly (UnifiedCategory / Organization) */
    private refreshPayerYearlyFilterOptions(): void {
        const wing = this.isAllWingsSelected()
            ? ""
            : String(this.selectedDiagnosis ?? "").trim();
        const unified = new Set<string>();
        const orgs = new Set<string>();
        for (const row of this.payerYearlyRawRows) {
            const rowWing = String(row?.UnifiedDiagnosis ?? "").trim();
            if (wing && rowWing && rowWing !== wing) {
                continue;
            }
            const uc = String(row?.UnifiedCategory ?? "").trim();
            if (uc) {
                unified.add(uc);
            }
            const org = String(row?.Organization ?? "").trim();
            if (org) {
                orgs.add(org);
            }
        }
        if (unified.size) {
            this.unifiedCategoryOptions = [
                this.incomeFilterAllValue,
                ...[...unified].sort((a, b) => a.localeCompare(b, "he")),
            ];
        }
        if (orgs.size) {
            this.organizationOptions = [
                this.incomeFilterAllValue,
                ...[...orgs].sort((a, b) => a.localeCompare(b, "he")),
            ];
        }
        if (
            this.selectedUnifiedCategory !== this.incomeFilterAllValue &&
            !this.unifiedCategoryOptions.includes(this.selectedUnifiedCategory)
        ) {
            this.selectedUnifiedCategory = this.incomeFilterAllValue;
        }
        if (
            this.selectedOrganization !== this.incomeFilterAllValue &&
            !this.organizationOptions.includes(this.selectedOrganization)
        ) {
            this.selectedOrganization = this.incomeFilterAllValue;
        }
    }

    /** סינון לפי 3 השדות מ-GetDepartmentIncomeByDiagnosis / GetDepartmentIncomeYearly */
    private applyIncomeFiltersToDetailRows(rows: any[]): any[] {
        if (!Array.isArray(rows) || !this.hasActiveIncomeFilters()) {
            return rows || [];
        }
        return rows.filter((row: any) => {
            return (
                this.matchesIncomeFilter(
                    row,
                    this.selectedIncomeClassification,
                    ["IncomeCategory", "incomeCategory"],
                ) &&
                this.matchesIncomeFilter(row, this.selectedOrganization, [
                    "Organization",
                    "organization",
                ]) &&
                this.matchesIncomeFilter(row, this.selectedIncomeMonth, [
                    "Month",
                    "month",
                ]) &&
                this.matchesUnifiedCategoryIncomeFilter(
                    row,
                    this.selectedUnifiedCategory,
                )
            );
        });
    }

    private buildPayerTableRows(
        aggregated: Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
                YTYDiff: number;
                Month: string;
            }
        >,
    ): PayerIncomeTableRow[] {
        return [...aggregated.entries()]
            .map(([unifiedPayer, vals]) => {
                const ytyDiff =
                    vals.YTYDiff !== 0
                        ? vals.YTYDiff
                        : vals.CurrentYear - vals.Year1;
                const ytyPercent =
                    vals.Year1 > 0 ? (ytyDiff / vals.Year1) * 100 : 0;
                return {
                    UnifiedPayer: unifiedPayer,
                    Year4: vals.Year4,
                    Year3: vals.Year3,
                    Year2: vals.Year2,
                    Year1: vals.Year1,
                    CurrentYear: vals.CurrentYear,
                    Income2024: vals.Year1,
                    Income2025: vals.CurrentYear,
                    YTYDiff: ytyDiff,
                    YTYPercent: ytyPercent,
                    Month: vals.Month || undefined,
                };
            })
            .sort((a, b) => b.CurrentYear - a.CurrentYear);
    }

    getPayerYtyDiff(row: PayerIncomeTableRow): number {
        return this.getLatestPriorYearDiff(row);
    }

    getPayerYtyPercentLabel(row: PayerIncomeTableRow): string {
        return this.getLatestPriorYearPercentLabel(row);
    }

    private updatePayerChartData(showChartLoading = false): void {
        if (showChartLoading) {
            this.isChartLoading = true;
            this.startSimulatedLoadingProgress("chart");
        }
        this.refreshFiveYearColumnDefs();

        const filteredRows = this.getPayerYearlyRowsFiltered();
        const aggregated =
            this.aggregatePayerYearlyByUnifiedPayer(filteredRows);
        const tableRows = this.buildPayerTableRows(aggregated);
        this.payerDataSource.data = tableRows;

        const sorted = [...aggregated.entries()].sort(
            (a, b) => b[1].CurrentYear - a[1].CurrentYear,
        );
        const top = sorted
            .filter(([, vals]) => this.isChartVisibleFiveYearRow(vals))
            .slice(0, this.maxPayerChartBars);

        this.chartColumns = this.buildFiveYearChartColumns("גורם משלם");

        this.applyFiveYearChartColors();

        this.chartData = top.map(([payer, vals]) =>
            this.buildFiveYearChartDataRow(payer, vals),
        );
        this.applyIncomeChartHtmlTooltips();
        this.finalizeChartOptionsRefresh();

        this.isChartLoading = false;
        this.applyPayerTableSearch();
        this.queueTableSortSync();
        this.cdr.detectChanges();
    }

    private refreshMonthlyDepartmentOptions(): void {
        const depts = new Set<string>();
        for (const row of this.getPayerYearlyRowsForDepartmentChart()) {
            const dept = String(row?.PatientSummary ?? "").trim();
            if (dept && !this.isExcludedPayerLabel(dept)) {
                depts.add(dept);
            }
        }
        this.monthlyDepartmentOptions = [...depts].sort((a, b) =>
            a.localeCompare(b, "he"),
        );
        this.refreshMonthlyDepartmentYoYStats();
        if (
            !this.selectedMonthlyDepartment ||
            !this.monthlyDepartmentOptions.includes(
                this.selectedMonthlyDepartment,
            )
        ) {
            this.selectedMonthlyDepartment =
                this.monthlyDepartmentOptions[0] ?? "";
        }
    }

    onMonthlyDepartmentChange(department: string): void {
        this.selectedMonthlyDepartment = String(department ?? "").trim();
        this.updateDepartmentMonthlyChartData();
    }

    getMonthlyDepartmentDisplay(): string {
        return (
            this.selectedMonthlyDepartment || this.monthlyDepartmentPlaceholder
        );
    }

    toggleMonthlyDepartmentDropdown(): void {
        if (!this.monthlyDepartmentOptions.length) {
            return;
        }
        const willOpen = !this.isMonthlyDepartmentOpen;
        this.closeIncomeFilterDropdowns();
        if (willOpen) {
            this.refreshMonthlyDepartmentYoYStats();
        }
        this.isMonthlyDepartmentOpen = willOpen;
    }

    setMonthlyDepartmentFromPicker(department: string): void {
        this.isMonthlyDepartmentOpen = false;
        this.onMonthlyDepartmentChange(department);
    }

    private refreshMonthlyDepartmentYoYStats(): void {
        this.monthlyDepartmentYoYStats.clear();
        const labels = this.getFiveYearLabels();
        const priorYearLabel =
            labels[3] || this.getOlderYearFromDeptData() || "";
        for (const dept of this.monthlyDepartmentOptions) {
            const rows = this.getMonthlyChartRowsForDepartment(dept);
            let priorTotal = 0;
            let currentTotal = 0;
            for (const row of rows) {
                priorTotal += this.toNumber(row.Year1);
                currentTotal += this.toNumber(row.CurrentYear);
            }
            let percent: number | null = null;
            if (priorTotal === 0 && currentTotal === 0) {
                percent = null;
            } else if (priorTotal === 0) {
                percent = Number.POSITIVE_INFINITY;
            } else {
                percent = ((currentTotal - priorTotal) / priorTotal) * 100;
            }
            this.monthlyDepartmentYoYStats.set(dept, {
                percent,
                priorYearLabel,
            });
        }
    }

    getMonthlyDepartmentYoYPercentText(department: string): string | null {
        return this.formatDepartmentYoYPercentText(
            this.monthlyDepartmentYoYStats.get(department),
        );
    }

    getMonthlyDepartmentYoYYearHint(department: string): string | null {
        const stat = this.monthlyDepartmentYoYStats.get(department);
        if (!stat || stat.percent === null || !stat.priorYearLabel) {
            return null;
        }
        return `לעומת ${stat.priorYearLabel}`;
    }

    isMonthlyDepartmentYoYPositive(department: string): boolean | null {
        const stat = this.monthlyDepartmentYoYStats.get(department);
        if (!stat || stat.percent === null) {
            return null;
        }
        if (!Number.isFinite(stat.percent)) {
            return true;
        }
        return stat.percent >= 0;
    }

    private getMonthlyChartRowsForDepartment(
        department: string,
    ): DepartmentIncomeYearlyRow[] {
        const dept = String(department ?? "").trim();
        if (!dept) {
            return [];
        }
        return this.getPayerYearlyRowsForDepartmentChart().filter(
            (row) => String(row?.PatientSummary ?? "").trim() === dept,
        );
    }

    private aggregateMonthlyIncomeByMonth(
        rows: DepartmentIncomeYearlyRow[],
    ): Map<
        string,
        {
            Year4: number;
            Year3: number;
            Year2: number;
            Year1: number;
            CurrentYear: number;
        }
    > {
        const map = new Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
            }
        >();
        for (const row of rows) {
            const month = String(row?.Month ?? "").trim();
            if (!month) {
                continue;
            }
            const entry = map.get(month) || {
                Year4: 0,
                Year3: 0,
                Year2: 0,
                Year1: 0,
                CurrentYear: 0,
            };
            entry.Year4 += this.toNumber(row.Year4);
            entry.Year3 += this.toNumber(row.Year3);
            entry.Year2 += this.toNumber(row.Year2);
            entry.Year1 += this.toNumber(row.Year1);
            entry.CurrentYear += this.toNumber(row.CurrentYear);
            map.set(month, entry);
        }
        return map;
    }

    private sortHebrewMonths(months: string[]): string[] {
        const order =
            DepartmentIncomeDashboardComponent.INCOME_REPORT_HEBREW_MONTHS;
        return [...months].sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            if (ia >= 0 && ib >= 0) {
                return ia - ib;
            }
            if (ia >= 0) {
                return -1;
            }
            if (ib >= 0) {
                return 1;
            }
            return a.localeCompare(b, "he");
        });
    }

    private updateDepartmentMonthlyChartData(): void {
        this.refreshFiveYearColumnDefs();
        const dept = String(this.selectedMonthlyDepartment ?? "").trim();
        if (!dept) {
            this.chartData = [];
            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        const byMonth = this.aggregateMonthlyIncomeByMonth(
            this.getMonthlyChartRowsForDepartment(dept),
        );
        const months = this.sortHebrewMonths([...byMonth.keys()]);

        this.chartColumns = this.buildFiveYearChartColumns("חודש");
        this.applyFiveYearChartColors();

        this.chartData = months
            .filter((month) =>
                this.isChartVisibleFiveYearRow(byMonth.get(month)),
            )
            .map((month) =>
                this.buildFiveYearChartDataRow(month, byMonth.get(month)),
            );

        this.applyIncomeChartHtmlTooltips();
        this.finalizeChartOptionsRefresh();
        this.isChartLoading = false;
        this.cdr.detectChanges();
    }

    private aggregatePayerYearlyByUnifiedPayer(
        rows: DepartmentIncomeYearlyRow[],
    ): Map<
        string,
        {
            Year4: number;
            Year3: number;
            Year2: number;
            Year1: number;
            CurrentYear: number;
            YTYDiff: number;
            Month: string;
        }
    > {
        const map = new Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
                YTYDiff: number;
                Month: string;
            }
        >();
        for (const row of rows) {
            const payer = String(row?.UnifiedPayer ?? "").trim();
            if (!payer || this.isExcludedPayerLabel(payer)) {
                continue;
            }
            const entry = map.get(payer) || {
                Year4: 0,
                Year3: 0,
                Year2: 0,
                Year1: 0,
                CurrentYear: 0,
                YTYDiff: 0,
                Month: "",
            };
            entry.Year4 += this.toNumber(row.Year4);
            entry.Year3 += this.toNumber(row.Year3);
            entry.Year2 += this.toNumber(row.Year2);
            entry.Year1 += this.toNumber(row.Year1);
            entry.CurrentYear += this.toNumber(row.CurrentYear);
            entry.YTYDiff += this.toNumber(row.YTYDiff);
            const month = String(row?.Month ?? "").trim();
            if (month && (!entry.Month || month > entry.Month)) {
                entry.Month = month;
            }
            map.set(payer, entry);
        }
        return map;
    }

    loadDepartmentIncomeByDiagnosis(forceRefresh = false): void {
        if (this.isAllWingsSelected()) {
            this.loadDepartmentIncomeData(forceRefresh);
            return;
        }
        const scopeKey = this.getIncomeScopeKey();
        if (!forceRefresh) {
            const cachedRaw = this.readIncomeScopeFromCache(scopeKey);
            if (cachedRaw?.length) {
                this.applyIncomeFiltersAndRefreshViews(cachedRaw, true);
                return;
            }
        }

        this.isDataLoaded = false;
        this.isMainDataLoading = true;
        this.startSimulatedLoadingProgress("main");
        this.incomeReportAsOfLabel = null;
        this.incomeReportAsOfFetchDone = false;
        this.referencePeriodFromYearlyIncome = false;

        this.http
            .post(
                environment.url + "GetDepartmentIncomeByDiagnosis",
                this.buildUnfilteredIncomeFilterPayload({
                    diagnosis: this.selectedDiagnosis || null,
                    medicalUnitIncome: null,
                    incomeCategory: null,
                    organization: null,
                    unifiedCategory: null,
                }),
            )
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        let data = response.d;

                        if (typeof data === "string") {
                            data = JSON.parse(data);
                        }

                        const rawList = Array.isArray(data) ? data : [];
                        const normalized =
                            this.normalizeDiagnosisComparisonRows(rawList);
                        this.writeIncomeScopeToCache(scopeKey, normalized);
                        this.applyIncomeFiltersAndRefreshViews(
                            normalized,
                            true,
                        );
                        this.ensurePayerYearlyRawLoaded(() => {
                            this.refreshPayerYearlyFilterOptions();
                        });
                        this.snackBar.open("✓ נתונים עודכנו", "סגור", {
                            duration: 3000,
                        });
                    } else {
                        console.warn("No data in response:", response);
                        this.completeMainDataLoading(true);
                        this.isChartLoading = false;
                        this.chartData = [];
                        this.cdr.detectChanges();
                    }
                },
                (error) => {
                    console.error("Error:", error);
                    this.incomeReportAsOfLabel = null;
                    this.incomeReportAsOfFetchDone = false;
                    this.completeMainDataLoading(true);
                    this.isChartLoading = false;
                    this.chartData = [];
                    this.cdr.detectChanges();
                    this.snackBar.open("❌ שגיאה", "סגור", { duration: 3000 });
                },
            );
    }

    /**
     * Load list of all diagnoses for dropdown filter
     */
    loadDiagnosesList(): void {
        if (this.diagnosesList.length > 0) {
            return;
        }

        const cached = this.localDataCache.get<string[]>("diagnosesList");
        if (cached?.length) {
            this.diagnosesList = this.getBossWingFilterOptionsFromRaw(cached);
            if (!this.selectedDiagnosis && this.diagnosesList.length > 0) {
                this.selectedDiagnosis = this.diagnosesList[0];
            }
            this.applyEmployeeDepartmentFilter();
            return;
        }

        this.isDiagnosesLoading = true;
        this.startSimulatedLoadingProgress("diagnoses");
        this.http.post(environment.url + "GetUniqueDiagnoses", {}).subscribe(
            (response: any) => {
                if (response && response.d) {
                    const rawList = (response.d as string[]).filter(
                        (d) => d && d !== this.diagnosisAllValue,
                    );
                    this.localDataCache.set("diagnosesList", rawList);
                    this.diagnosesList =
                        this.getBossWingFilterOptionsFromRaw(rawList);
                    // Set default diagnosis if not set
                    if (
                        !this.selectedDiagnosis &&
                        this.diagnosesList.length > 0
                    ) {
                        this.selectedDiagnosis = this.diagnosesList[0];
                    }
                    // Try to align with employee department if available
                    this.applyEmployeeDepartmentFilter();
                    this.completeDiagnosesLoading();
                } else {
                    this.completeDiagnosesLoading();
                }
            },
            (error) => {
                console.error("Error loading diagnoses list:", error);
                this.completeDiagnosesLoading();
                this.cdr.detectChanges();
            },
        );
    }

    private getBossWingFilterOptionsFromRaw(list: string[]): string[] {
        const cleaned = (list ?? []).filter(
            (d) => d && d !== this.diagnosisAllValue,
        );
        return [this.diagnosisAllValue, ...cleaned];
    }

    /**
     * Toggle chart type between Column and Line
     */
    toggleChartType(): void {
        this.chartType =
            this.chartType === "ColumnChart" ? "LineChart" : "ColumnChart";
        this.updateChartOptionsForType();
        this.cdr.detectChanges();
    }

    setChartType(type: "ColumnChart" | "LineChart"): void {
        if (this.chartType === type) {
            return;
        }
        this.chartType = type;
        this.updateChartOptionsForType();
        this.cdr.detectChanges();
    }

    private loadEmployeeInfo(userName: string): void {
        this.employeeLoading = true;
        this.employeeError = false;

        const url = `http://srv-apps-prod:5769/api/ServiceCRM/GetEmployeeInfo?username=${encodeURIComponent(userName)}`;

        this.http.get<EmployeeInfo>(url).subscribe({
            next: (info) => {
                this.employeeInfo = info;
                this.employeeLoading = false;

                // Try to apply department filter if we already have diagnoses list
                this.applyEmployeeDepartmentFilter();
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error("Error loading employee info", err);
                this.employeeLoading = false;
                this.employeeError = true;
                this.cdr.detectChanges();
            },
        });
    }

    /**
     * Update chart options based on chart type
     */
    updateChartOptionsForType(): void {
        if (this.chartType === "LineChart") {
            // Line chart specific options
            this.chartOptions.bars = undefined;
            this.chartOptions.pointSize = 6;
            this.chartOptions.lineWidth = 3;
            this.chartOptions.curveType = "function";
        } else {
            // Column chart specific options
            this.chartOptions.bars = "vertical";
            this.chartOptions.bar = {
                groupWidth: "75%",
            };
            this.chartOptions.pointSize = undefined;
            this.chartOptions.lineWidth = undefined;
            this.chartOptions.curveType = undefined;
        }
    }

    /** שנת הסיום לתוויות Year4…CurrentYear — מ־referenceYear / GetYearlyTotalIncome, לא מ־Date */
    private resolveFiveYearEndYear(): number {
        if (
            this.incomeFiveYearEndYear != null &&
            this.incomeFiveYearEndYear >= 1900 &&
            this.incomeFiveYearEndYear <= 2100
        ) {
            return this.incomeFiveYearEndYear;
        }
        if (this.yearlyTotalData.length > 0) {
            const y = parseInt(this.getLatestYear(), 10);
            if (!Number.isNaN(y) && y >= 1900 && y <= 2100) {
                return y;
            }
        }
        // דוח הכנסות לרוב מעודכן לשנה קודמת (לא לשנה קלנדרית עתידית)
        return this.currentYear - 1;
    }

    private setFiveYearEndYear(year: number): void {
        if (Number.isFinite(year) && year >= 1900 && year <= 2100) {
            this.incomeFiveYearEndYear = year;
        }
    }

    private refreshFiveYearLabelsFromYearlyTotals(): void {
        if (!this.yearlyTotalData.length) {
            return;
        }
        const sorted = [...this.yearlyTotalData].sort(
            (a, b) => parseInt(a.Year, 10) - parseInt(b.Year, 10),
        );
        const latest = parseInt(sorted[sorted.length - 1]?.Year ?? "", 10);
        if (!Number.isNaN(latest)) {
            this.setFiveYearEndYear(latest);
        }
    }

    getFiveYearLabels(): string[] {
        const end = this.resolveFiveYearEndYear();
        return [end - 4, end - 3, end - 2, end - 1, end].map(String);
    }

    refreshFiveYearColumnDefs(): void {
        const labels = this.getFiveYearLabels();
        this.fiveYearColumnDefs = labels.map((label, i) => ({
            id: `incomeYear_${label}`,
            label: `הכנסות ${label}`,
            field: this.fiveYearFieldKeys[i],
        }));
        const yearIds = this.fiveYearColumnDefs.map((c) => c.id);
        this.displayedColumns = ["DepartmentName", ...yearIds, "Difference"];
        this.payerDisplayedColumns = ["UnifiedPayer", ...yearIds, "Difference"];
    }

    getRowFiveYearValue(row: any, field: string): number {
        if (row?.[field] != null && row[field] !== "") {
            return this.toNumber(row[field]);
        }
        const yearly = row?.YearlyIncome;
        if (yearly && typeof yearly === "object") {
            const labels = this.getFiveYearLabels();
            const idx = (this.fiveYearFieldKeys as readonly string[]).indexOf(
                field,
            );
            if (idx >= 0 && labels[idx]) {
                return this.toNumber(
                    yearly[labels[idx]] ?? yearly[String(labels[idx])],
                );
            }
        }
        if (field === "Year1") {
            return this.toNumber(row?.Income2024 ?? row?.Year1);
        }
        if (field === "CurrentYear") {
            return this.toNumber(row?.Income2025 ?? row?.CurrentYear);
        }
        return 0;
    }

    /** סכום 5 שנות הכנסה — תואם מיון API */
    getRowFiveYearTotal(row: any): number {
        return this.fiveYearFieldKeys.reduce(
            (sum, field) => sum + this.getRowFiveYearValue(row, field),
            0,
        );
    }

    /** אחוז שינוי מהשנה הקודמת — null לעמודת השנה הראשונה (אין בסיס להשוואה) */
    getFiveYearYoYPercentLabel(row: any, field: string): string | null {
        const idx = (this.fiveYearFieldKeys as readonly string[]).indexOf(
            field,
        );
        if (idx <= 0) {
            return null;
        }
        const prior = this.getRowFiveYearValue(
            row,
            this.fiveYearFieldKeys[idx - 1],
        );
        const current = this.getRowFiveYearValue(row, field);
        if (prior === 0) {
            return current === 0 ? null : "∞%";
        }
        const pct = ((current - prior) / prior) * 100;
        return pct.toFixed(2) + "%";
    }

    getFiveYearYoYIsPositive(row: any, field: string): boolean | null {
        const idx = (this.fiveYearFieldKeys as readonly string[]).indexOf(
            field,
        );
        if (idx <= 0) {
            return null;
        }
        const prior = this.getRowFiveYearValue(
            row,
            this.fiveYearFieldKeys[idx - 1],
        );
        const current = this.getRowFiveYearValue(row, field);
        if (prior === 0 && current === 0) {
            return null;
        }
        return current >= prior;
    }

    getLatestPriorYearDiff(row: any): number {
        const prior = this.getRowFiveYearValue(row, "Year1");
        const latest = this.getRowFiveYearValue(row, "CurrentYear");
        const yty = this.toNumber(row?.YTYDiff);
        if (yty !== 0) {
            return yty;
        }
        return latest - prior;
    }

    getLatestPriorYearPercentLabel(row: any): string {
        const ytyPct = row?.YTYPercent;
        if (ytyPct != null && ytyPct !== "") {
            const pct = this.toNumber(ytyPct);
            if (row?.Income2024 === 0 && pct === 0) {
                return "∞%";
            }
            return pct.toFixed(2) + "%";
        }
        const prior = this.getRowFiveYearValue(row, "Year1");
        const latest = this.getRowFiveYearValue(row, "CurrentYear");
        return this.calculatePercentageChange({
            Income2024: prior,
            Income2025: latest,
        });
    }

    private buildFiveYearChartColumns(categoryLabel: string): any[] {
        const cols: any[] = [categoryLabel];
        for (const label of this.getFiveYearLabels()) {
            cols.push({ type: "number", label });
            cols.push({ type: "string", role: "annotation" });
        }
        return cols;
    }

    /** ממוצע 5 שנים במיליונים (אותה עיגול כמו בגרף) */
    getFiveYearAverageMillions(row: any): number {
        let sum = 0;
        for (const field of this.fiveYearFieldKeys) {
            sum += this.getRowFiveYearValue(row, field);
        }
        return parseFloat((sum / 5 / 1000000).toFixed(1));
    }

    /** שורות עם ממוצע 0M — רק בטבלה, לא בגרף */
    isChartVisibleFiveYearRow(row: any): boolean {
        return this.getFiveYearAverageMillions(row) !== 0;
    }

    private buildFiveYearChartDataRow(label: string, row: any): any[] {
        const out: any[] = [label];
        for (const field of this.fiveYearFieldKeys) {
            const raw = this.getRowFiveYearValue(row, field);
            const val = parseFloat((raw / 1000000).toFixed(1));
            out.push(val, val.toString() + "M");
        }
        return out;
    }

    /** ערך משנה — מעדיף מקור עם נתון (לא דורס אפסים מ־GetDepartmentIncomeYearly) */
    private pickFiveYearFieldValue(
        fromDept: number,
        fromYearly: number | undefined,
    ): number {
        const yearly = fromYearly ?? 0;
        return yearly !== 0 ? yearly : fromDept;
    }

    private syncDepartmentRowFiveYearAliases(
        row: DepartmentComparisonDto,
    ): void {
        row.Year4 = this.getRowFiveYearValue(row, "Year4");
        row.Year3 = this.getRowFiveYearValue(row, "Year3");
        row.Year2 = this.getRowFiveYearValue(row, "Year2");
        row.Year1 = this.getRowFiveYearValue(row, "Year1");
        row.CurrentYear = this.getRowFiveYearValue(row, "CurrentYear");
        row.Income2024 = row.Year1;
        row.Income2025 = row.CurrentYear;
    }

    private ensurePayerYearlyForFiveYearView(onReady?: () => void): void {
        const scopeKey = this.getIncomeScopeKey();
        const cached = this.payerYearlyByScopeCache.get(scopeKey);
        if (cached?.length) {
            this.payerYearlyRawRows = cached;
            if (this.graphPrimaryView === "payer") {
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
            }
            this.enrichDepartmentFiveYearsFromYearly();
            onReady?.();
            this.cdr.detectChanges();
            return;
        }
        this.ensurePayerYearlyRawLoaded(() => {
            if (this.graphPrimaryView === "payer") {
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
            }
            this.enrichDepartmentFiveYearsFromYearly();
            onReady?.();
            this.cdr.detectChanges();
        });
    }

    private enrichDepartmentFiveYearsFromYearly(): void {
        if (!this.payerYearlyRawRows.length) {
            return;
        }
        const wing = String(this.selectedDiagnosis ?? "").trim();
        const byDept = new Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
            }
        >();

        for (const row of this.payerYearlyRawRows) {
            if (wing && String(row?.UnifiedDiagnosis ?? "").trim() !== wing) {
                continue;
            }
            const name = String(row?.PatientSummary ?? "").trim();
            if (!name) {
                continue;
            }
            const entry = byDept.get(name) || {
                Year4: 0,
                Year3: 0,
                Year2: 0,
                Year1: 0,
                CurrentYear: 0,
            };
            entry.Year4 += this.toNumber(row.Year4);
            entry.Year3 += this.toNumber(row.Year3);
            entry.Year2 += this.toNumber(row.Year2);
            entry.Year1 += this.toNumber(row.Year1);
            entry.CurrentYear += this.toNumber(row.CurrentYear);
            byDept.set(name, entry);
        }

        if (!byDept.size) {
            return;
        }

        const merged: DepartmentComparisonDto[] = [];
        const seen = new Set<string>();

        for (const d of this.departmentIncomeData) {
            const name = String(d.DepartmentName ?? "").trim();
            if (!name) {
                continue;
            }
            const y = byDept.get(name);
            const row: DepartmentComparisonDto = {
                ...d,
                Year4: this.pickFiveYearFieldValue(
                    this.getRowFiveYearValue(d, "Year4"),
                    y?.Year4,
                ),
                Year3: this.pickFiveYearFieldValue(
                    this.getRowFiveYearValue(d, "Year3"),
                    y?.Year3,
                ),
                Year2: this.pickFiveYearFieldValue(
                    this.getRowFiveYearValue(d, "Year2"),
                    y?.Year2,
                ),
                Year1: this.pickFiveYearFieldValue(
                    this.getRowFiveYearValue(d, "Year1"),
                    y?.Year1,
                ),
                CurrentYear: this.pickFiveYearFieldValue(
                    this.getRowFiveYearValue(d, "CurrentYear"),
                    y?.CurrentYear,
                ),
            };
            this.syncDepartmentRowFiveYearAliases(row);
            merged.push(row);
            seen.add(name);
        }

        for (const [name, y] of byDept.entries()) {
            if (seen.has(name)) {
                continue;
            }
            const row: DepartmentComparisonDto = {
                DepartmentName: name,
                Year4: y.Year4,
                Year3: y.Year3,
                Year2: y.Year2,
                Year1: y.Year1,
                CurrentYear: y.CurrentYear,
                Income2024: y.Year1,
                Income2025: y.CurrentYear,
            };
            merged.push(row);
        }

        merged.sort(
            (a, b) =>
                this.getRowFiveYearValue(b, "CurrentYear") -
                this.getRowFiveYearValue(a, "CurrentYear"),
        );
        this.departmentIncomeData = merged;
        this.dataSource.data = merged;
        if (
            this.graphPrimaryView !== "payer" &&
            !this.isBreakdownChartViewActive
        ) {
            this.updateChartColumns();
            this.updateChartData(false);
        }
    }

    /**
     * Update chart data with numbers formatted in millions with 1 decimal place
     */
    updateChartData(showChartLoading = false): void {
        if (this.graphPrimaryView === "payer") {
            return;
        }
        if (this.isDepartmentMonthlyChartActive) {
            if (showChartLoading) {
                this.isChartLoading = true;
                this.startSimulatedLoadingProgress("chart");
            }
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshMonthlyDepartmentOptions();
                this.updateDepartmentMonthlyChartData();
            });
            return;
        }

        if (showChartLoading) {
            this.isChartLoading = true;
            this.startSimulatedLoadingProgress("chart");
        }
        this.refreshFiveYearColumnDefs();

        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
            this.chartData = [];
            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        const filtered = this.resolveDepartmentChartRows()
            .filter((item) => String(item?.DepartmentName ?? "").trim())
            .filter((item) => this.isChartVisibleFiveYearRow(item));

        this.chartColumns = this.buildFiveYearChartColumns("מחלקה");
        this.applyFiveYearChartColors();

        this.chartData = filtered.map((item) =>
            this.buildFiveYearChartDataRow(item.DepartmentName, item),
        );
        this.applyIncomeChartHtmlTooltips();
        this.finalizeChartOptionsRefresh();

        this.isChartLoading = false;
        this.cdr.detectChanges();
    }

    private applyEmployeeDepartmentFilter(): void {
        if (!this.diagnosesList || this.diagnosesList.length === 0) {
            return;
        }

        const deptFromApi = this.employeeInfo?.departmentName?.trim();
        const deptFromLocal = this.employeeLocalDepartment?.trim();

        const targetDept =
            deptFromApi && this.diagnosesList.includes(deptFromApi)
                ? deptFromApi
                : deptFromLocal && this.diagnosesList.includes(deptFromLocal)
                  ? deptFromLocal
                  : null;

        if (!targetDept) {
            return;
        }

        if (this.selectedDiagnosis === targetDept) {
            return;
        }

        this.selectedDiagnosis = targetDept;
        this.isMainDataLoading = true;
        this.startSimulatedLoadingProgress("main");
        this.isDataLoaded = false;
        this.loadDepartmentIncomeByDiagnosis();
    }

    /**
     * Calculate top 5 departments by growth (difference or percentage)
     * Requirements: 2025 values must be higher than 2024
     */
    calculateTopDepartments(): void {
        // רק מחלקות עם צמיחה חיובית בהכנסות
        this.topDepartments = this.departmentIncomeData
            .filter(
                (dept) =>
                    this.getRowFiveYearValue(dept, "CurrentYear") >
                    this.getRowFiveYearValue(dept, "Year1"),
            )
            .map((dept) => {
                const prior = this.getRowFiveYearValue(dept, "Year1");
                const latest = this.getRowFiveYearValue(dept, "CurrentYear");
                return {
                    DepartmentName: dept.DepartmentName,
                    Income2024: prior,
                    Income2025: latest,
                    difference: latest - prior,
                    percentage:
                        prior > 0 ? ((latest - prior) / prior) * 100 : 0,
                    managerName: (dept as any).managerName,
                };
            })
            .sort((a, b) => b.difference - a.difference);
    }

    /**
     * Change top departments view (by difference or percentage)
     */
    onTopDepartmentsViewChange(viewType: string): void {
        this.topDepartmentsViewType = viewType;
        if (viewType === "percentage") {
            this.topDepartments.sort((a, b) => b.percentage - a.percentage);
        } else {
            this.topDepartments.sort((a, b) => b.difference - a.difference);
        }
        this.cdr.detectChanges();
    }

    /**
     * עיבוד מעטפת JSON מ־GetYearlyTotalIncome: מערך שנים + שדות referenceYear/referenceMonth (אם קיימים).
     */
    private parseGetYearlyTotalIncomePayload(response: any): {
        rows: YearlyIncomeDto[];
        envelope: Record<string, unknown> | null;
    } {
        if (!response?.d) {
            return { rows: [], envelope: null };
        }
        let root: any = response.d;
        if (typeof root === "string") {
            try {
                root = JSON.parse(root);
            } catch {
                return { rows: [], envelope: null };
            }
        }
        if (Array.isArray(root)) {
            return { rows: root as YearlyIncomeDto[], envelope: null };
        }
        if (root && typeof root === "object") {
            if ("error" in root && !Array.isArray(root.d)) {
                return { rows: [], envelope: null };
            }
            const arr = root.d;
            const rows = Array.isArray(arr) ? (arr as YearlyIncomeDto[]) : [];
            return { rows, envelope: root as Record<string, unknown> };
        }
        return { rows: [], envelope: null };
    }

    /**
     * בונה את פס חודש היחוס מנתוני השירות השנתי (Excel_QuarterlyIncome).
     */
    private tryApplyBannerFromYearlyIncomeEnvelope(
        envelope: Record<string, unknown> | null,
    ): boolean {
        if (!envelope) {
            return false;
        }
        const yRaw = envelope["referenceYear"] ?? envelope["ReferenceYear"];
        const mRaw = envelope["referenceMonth"] ?? envelope["ReferenceMonth"];
        if (yRaw == null || mRaw == null) {
            return false;
        }
        const yearStr = String(yRaw).trim();
        const monthIdx = this.parseIncomeReportMonthIndex(
            mRaw as string | number,
        );
        if (!yearStr || monthIdx == null) {
            return false;
        }
        const yNum = parseInt(yearStr, 10);
        if (Number.isNaN(yNum) || yNum < 1900 || yNum > 2100) {
            return false;
        }
        this.setFiveYearEndYear(yNum);
        const monthName =
            DepartmentIncomeDashboardComponent.INCOME_REPORT_HEBREW_MONTHS[
                monthIdx - 1
            ] || String(monthIdx);
        const older = this.getOlderYearFromDeptData();
        const latest = this.getLatestYearFromDeptData();
        this.incomeReportAsOfLabel =
            older && latest && older !== latest
                ? `נתוני הדוח מעודכנים עד חודש ${monthName} ${yearStr} כולל — השוואת הכנסות ${latest} מול ${older} לאותה תקופת יחוס`
                : `נתוני הדוח מעודכנים עד חודש ${monthName} ${yearStr} כולל`;
        this.referencePeriodFromYearlyIncome = true;
        return true;
    }

    /**
     * Load yearly totals silently for chart year detection
     */
    loadYearlyTotalsForChart(onReady?: () => void): void {
        if (onReady) {
            this.yearlyTotalsReadyCallbacks.push(onReady);
        }

        const finish = () => {
            const callbacks = [...this.yearlyTotalsReadyCallbacks];
            this.yearlyTotalsReadyCallbacks.length = 0;
            if (callbacks.length) {
                for (const cb of callbacks) {
                    cb();
                }
            } else {
                this.refreshChartsAfterYearLabelsUpdate();
            }
        };

        if (this.yearlyTotalsFetched && this.yearlyTotalsRaw.length > 0) {
            this.yearlyTotalData = this.yearlyTotalsRaw;
            this.refreshFiveYearLabelsFromYearlyTotals();
            finish();
            return;
        }

        const unfilteredYearlyKey = this.buildYearlyTotalsStorageKey({
            medicalUnitIncome: null,
            incomeCategory: null,
            organization: null,
            unifiedCategory: null,
        });
        const cachedYearly = this.readYearlyTotalsFromCache(unfilteredYearlyKey);
        if (cachedYearly?.rows?.length) {
            this.yearlyTotalsRaw = cachedYearly.rows;
            this.yearlyTotalsFetched = true;
            this.yearlyTotalData = cachedYearly.rows;
            this.yearlyTotalCacheKey = "loaded";
            this.refreshFiveYearLabelsFromYearlyTotals();
            if (
                cachedYearly.envelope &&
                this.tryApplyBannerFromYearlyIncomeEnvelope(
                    cachedYearly.envelope,
                )
            ) {
                this.incomeReportAsOfFetchDone = true;
            }
            finish();
            return;
        }

        if (this.yearlyTotalsLoading) {
            return;
        }
        this.yearlyTotalsLoading = true;

        this.http
            .post(
                environment.url + "GetYearlyTotalIncome",
                this.buildUnfilteredIncomeFilterPayload(),
            )
            .subscribe(
                (response: any) => {
                    const { rows, envelope } =
                        this.parseGetYearlyTotalIncomePayload(response);
                    if (rows.length) {
                        this.yearlyTotalsRaw = rows;
                        this.yearlyTotalsFetched = true;
                        this.yearlyTotalData = rows;
                        this.yearlyTotalCacheKey = "loaded";
                        this.writeYearlyTotalsToCache(
                            unfilteredYearlyKey,
                            rows,
                            envelope,
                        );
                        this.refreshFiveYearLabelsFromYearlyTotals();
                        if (
                            this.tryApplyBannerFromYearlyIncomeEnvelope(
                                envelope,
                            )
                        ) {
                            this.incomeReportAsOfFetchDone = true;
                        }
                    }
                    this.yearlyTotalsLoading = false;
                    finish();
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading yearly totals for chart:",
                        error,
                    );
                    this.yearlyTotalsLoading = false;
                    finish();
                },
            );
    }

    /** רענון גרף/טבלה אחרי שנת הייחוס נקבעה — הכנסות וגורם משלם */
    private refreshChartsAfterYearLabelsUpdate(): void {
        this.refreshFiveYearColumnDefs();
        if (this.graphPrimaryView === "payer") {
            if (this.payerYearlyRawRows.length) {
                this.updatePayerChartData(false);
            }
            return;
        }
        if (this.isDepartmentMonthlyChartActive) {
            if (this.payerYearlyRawRows.length) {
                this.refreshMonthlyDepartmentOptions();
                this.updateDepartmentMonthlyChartData();
            }
            return;
        }
        if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
            if (this.isBreakdownChartViewActive) {
                this.ensureBreakdownDetailCacheLoaded();
            } else {
                this.updateChartColumns();
                this.updateChartData(false);
            }
            this.applyFiveYearChartColors();
            if (this.chartData?.length) {
                this.applyIncomeChartHtmlTooltips();
            }
            this.chartOptions = { ...this.chartOptions };
        }
    }

    /**
     * Load boss dashboard with yearly totals from backend
     */
    loadBossDashboard(): void {
        this.showBossDashboard = true;
        this.bossViewMode = "table";
        this.captureBossFiltersBaseline();
        this.closeBossFilterDropdowns();
        this.refreshBossDashboard(true);
    }

    private captureBossFiltersBaseline(): void {
        this.bossFiltersBaseline = {
            diagnosis: this.selectedDiagnosis,
            organization: this.selectedOrganization,
            unifiedCategory: this.selectedUnifiedCategory,
            incomeMonth: this.selectedIncomeMonth,
        };
    }

    private refreshBossDashboard(
        isInitial = false,
        filterKey: Exclude<BossFilterLoadingKey, null> | null = null,
    ): void {
        const hasExisting = !!(this.yearlyTotalData?.length);
        if (isInitial || !hasExisting) {
            this.bossInitialLoading = true;
            this.startBossLoadingAnimation();
        }
        this.bossTablePage = 0;
        if (isInitial) {
            this.bossExecutiveSummary = "";
            this.bossPayerInsights = [];
            this.bossPayerOutliers = [];
            this.bossPayerPieData = [];
            this.bossSelectedWingDeclineDiff = 0;
            this.bossWorstDeclineWingName = "";
        }

        if (this.canReuseYearlyTotalsCache() && this.yearlyTotalsRaw.length) {
            this.yearlyTotalData = this.yearlyTotalsRaw;
            this.proceedBossDashboardAfterYearlyData(null, isInitial, filterKey);
            return;
        }

        const yearlyStorageKey = this.buildYearlyTotalsStorageKey();
        const cachedYearly = this.readYearlyTotalsFromCache(yearlyStorageKey);
        if (cachedYearly?.rows?.length) {
            this.yearlyTotalData = cachedYearly.rows;
            if (this.canReuseYearlyTotalsCache()) {
                this.yearlyTotalsRaw = cachedYearly.rows;
                this.yearlyTotalsFetched = true;
            }
            this.proceedBossDashboardAfterYearlyData(
                cachedYearly.envelope,
                isInitial,
                filterKey,
            );
            return;
        }

        if (filterKey) {
            this.bossFilterLoadingKey = filterKey;
        }

        this.http
            .post(environment.url + "GetYearlyTotalIncome", {
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        const { rows, envelope } =
                            this.parseGetYearlyTotalIncomePayload(response);

                        if (rows.length) {
                            this.yearlyTotalData = rows;
                            this.writeYearlyTotalsToCache(
                                yearlyStorageKey,
                                rows,
                                envelope,
                            );
                            if (this.canReuseYearlyTotalsCache()) {
                                this.yearlyTotalsRaw = rows;
                                this.yearlyTotalsFetched = true;
                            }
                            this.proceedBossDashboardAfterYearlyData(
                                envelope,
                                isInitial,
                                filterKey,
                            );
                            return;
                        }

                        console.error("Data is not an array:", rows);
                    }
                    this.stopBossLoadingAnimation();
                    this.bossInitialLoading = false;
                    this.bossFilterLoadingKey = null;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error("Error loading boss dashboard:", error);
                    this.stopBossLoadingAnimation();
                    this.bossInitialLoading = false;
                    this.bossFilterLoadingKey = null;
                    this.snackBar.open("❌ שגיאה בטעינת הנתונים", "סגור", {
                        duration: 3000,
                    });
                },
            );
    }

    private canReuseYearlyTotalsCache(): boolean {
        if (!this.yearlyTotalsFetched) {
            return false;
        }
        const filters = this.buildIncomeFilterRequest();
        return (
            !filters.medicalUnitIncome &&
            !filters.incomeCategory &&
            !filters.organization &&
            !filters.unifiedCategory
        );
    }

    private proceedBossDashboardAfterYearlyData(
        envelope: Record<string, unknown> | null,
        showSuccessNotice = true,
        filterKey: Exclude<BossFilterLoadingKey, null> | null = null,
    ): void {
        if (envelope) {
            this.tryApplyBannerFromYearlyIncomeEnvelope(envelope);
        }

        if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
            setTimeout(() => {
                this.updateChartColumns();
                this.updateChartTheme();
                this.updateChartData();
                this.cdr.detectChanges();
            }, 100);
        }

        const finish = () => {
            this.refreshBossPayerInsights();
            const done = () => {
                this.bossInitialLoading = false;
                this.bossFilterLoadingKey = null;
                this.cdr.detectChanges();
                if (this.bossViewMode === "monthly") {
                    this.updateBossMonthlyChartData();
                }
                if (showSuccessNotice) {
                    this.snackBar.open("✓ דוח למנהל נטען בהצלחה", "סגור", {
                        duration: 2000,
                    });
                }
            };

            if (this.bossInitialLoading && this.bossLoadingProgressInterval) {
                this.finishBossLoadingAnimation(done);
            } else {
                done();
            }
        };

        const scopeKey = this.getIncomeScopeKey();
        const payerCached = this.readPayerYearlyFromCache(scopeKey);
        if (payerCached?.length) {
            this.payerYearlyRawRows = payerCached;
            finish();
            return;
        }
        if (this.payerYearlyRawRows.length) {
            finish();
            return;
        }

        if (filterKey) {
            this.bossFilterLoadingKey = filterKey;
        }
        this.ensurePayerYearlyRawLoaded(() => finish());
    }

    private isBossExcludedPayer(value: string | undefined | null): boolean {
        const label = String(value ?? "").trim();
        if (!label || this.isExcludedPayerLabel(label)) {
            return true;
        }
        return this.bossExcludedPayerLabels.some(
            (excluded) => label === excluded,
        );
    }

    private refreshBossPayerInsights(): void {
        const rows = this.getPayerYearlyRowsForDepartmentChart();
        const aggregated = this.aggregatePayerYearlyByUnifiedPayer(rows);
        const tableRows = this.buildPayerTableRows(aggregated).filter(
            (row) => !this.isBossExcludedPayer(String(row.UnifiedPayer ?? "")),
        );
        const overallPct = this.parsePercentLabel(
            this.calculateYearlyPercentageChange(),
        );

        let totalCurrent = 0;
        const hospitalCurrent = this.getLatestYearTotal();
        const insights: BossPayerInsightRow[] = tableRows.map((row) => {
            const currentTotal = this.getRowFiveYearValue(row, "CurrentYear");
            const priorTotal = this.getRowFiveYearValue(row, "Year1");
            totalCurrent += currentTotal;
            const diff = this.getLatestPriorYearDiff(row);
            let percent: number | null = null;
            if (priorTotal === 0 && currentTotal === 0) {
                percent = null;
            } else if (priorTotal === 0) {
                percent = Number.POSITIVE_INFINITY;
            } else {
                percent = (diff / priorTotal) * 100;
            }
            return {
                payer: String(row.UnifiedPayer ?? "").trim(),
                currentTotal,
                priorTotal,
                diff,
                percent,
                sharePercent: 0,
                hospitalSharePercent:
                    hospitalCurrent > 0
                        ? (currentTotal / hospitalCurrent) * 100
                        : 0,
                isOutlier: false,
            };
        });

        for (const insight of insights) {
            insight.sharePercent =
                totalCurrent > 0
                    ? (insight.currentTotal / totalCurrent) * 100
                    : 0;
            insight.isOutlier = this.isBossPayerOutlier(insight, overallPct);
        }

        insights.sort((a, b) => b.currentTotal - a.currentTotal);
        this.bossPayerInsights = insights;
        this.bossPayerTotalCurrent = totalCurrent;
        this.refreshBossWingDeclineStats();
        this.bossPayerOutliers = insights
            .filter((row) => row.isOutlier)
            .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
            .slice(0, 5);
        this.buildBossPayerPieChart(insights, totalCurrent);
        this.buildBossExecutiveSummary();
        this.updateBossPayerPieTheme();
    }

    private getBossWingAggregationRows(): DepartmentIncomeYearlyRow[] {
        let rows = this.payerYearlyRawRows.filter(
            (row) =>
                !this.isExcludedPayerLabel(row?.PatientSummary) &&
                !this.isExcludedPayerLabel(row?.UnifiedPayer),
        );
        return this.applyIncomeFiltersToPayerYearlyRows(rows);
    }

    private refreshBossWingDeclineStats(): void {
        const wingMap = new Map<string, { current: number; prior: number }>();
        for (const row of this.getBossWingAggregationRows()) {
            const wing = String(row?.UnifiedDiagnosis ?? "").trim();
            if (!wing) {
                continue;
            }
            const entry = wingMap.get(wing) ?? { current: 0, prior: 0 };
            entry.current += this.getRowFiveYearValue(row, "CurrentYear");
            entry.prior += this.getRowFiveYearValue(row, "Year1");
            wingMap.set(wing, entry);
        }

        const wingStats = [...wingMap.entries()]
            .map(([wing, totals]) => ({
                wing,
                diff: totals.current - totals.prior,
            }))
            .sort((a, b) => a.diff - b.diff);

        this.bossWorstDeclineWingName =
            wingStats.length && wingStats[0].diff < 0 ? wingStats[0].wing : "";

        const selectedWing = String(this.selectedDiagnosis ?? "").trim();
        const selectedStat = wingStats.find(
            (item) => item.wing === selectedWing,
        );
        this.bossSelectedWingDeclineDiff =
            selectedStat?.diff ?? this.getTotalDifference();
    }

    private isBossPayerOutlier(
        row: BossPayerInsightRow,
        overallPct: number,
    ): boolean {
        if (row.priorTotal < this.bossPayerOutlierMinPrior) {
            return false;
        }
        if (row.percent === null || !Number.isFinite(row.percent)) {
            return false;
        }
        if (row.percent <= this.bossPayerOutlierPercentThreshold) {
            return true;
        }
        if (
            Number.isFinite(overallPct) &&
            row.percent < 0 &&
            overallPct < 0 &&
            row.percent <= overallPct - 5
        ) {
            return true;
        }
        return false;
    }

    private buildBossExecutiveSummary(): void {
        const latest = this.getLatestYear();
        const older = this.getOlderYear();
        const wing = this.selectedDiagnosis || "כל האגף";
        const diff = this.getTotalDifference();
        const pctLabel = this.calculateYearlyPercentageChange();
        const trendWord = diff >= 0 ? "עליה" : "ירידה";

        let summary = `${wing}: ${trendWord} כללית של ${pctLabel} בהשוואת YTD ${latest} מול ${older}.`;

        if (this.bossPayerOutliers.length) {
            const worst = this.bossPayerOutliers[0];
            summary += ` ${this.bossPayerOutliers.length} חריגים — החריג ביותר: «${worst.payer}» (${this.formatBossPayerYoYLabel(worst)}).`;
        } else if (this.bossPayerInsights.length) {
            summary += ` ${this.bossPayerInsights.length} גורמי משלם — ללא חריגות YTD.`;
        } else {
            summary += " אין נתוני גורם משלם.";
        }

        this.bossExecutiveSummary = summary;
    }

    private buildBossPayerPieChart(
        insights: BossPayerInsightRow[],
        totalCurrent: number,
    ): void {
        if (!totalCurrent || !insights.length) {
            this.bossPayerPieData = [];
            return;
        }

        const top = insights.slice(0, this.bossPayerPieTopSlices);
        const topSum = top.reduce((sum, row) => sum + row.currentTotal, 0);
        const other = totalCurrent - topSum;
        const pieRows: any[][] = top.map((row) => [
            row.payer,
            row.currentTotal,
        ]);
        if (other > 0) {
            pieRows.push(["אחר", other]);
        }
        this.bossPayerPieData = pieRows;
    }

    private parsePercentLabel(label: string): number {
        if (!label || label.includes("∞")) {
            return Number.NaN;
        }
        return parseFloat(label.replace("%", "").trim());
    }

    formatBossPayerYoYLabel(row: BossPayerInsightRow): string {
        if (row.percent === null) {
            return "";
        }
        if (!Number.isFinite(row.percent)) {
            return "∞% עליה";
        }
        const absPct = Math.abs(row.percent).toFixed(1);
        if (row.percent > 0.05) {
            return `${absPct}% עליה`;
        }
        if (row.percent < -0.05) {
            return `-${absPct}% ירידה`;
        }
        return "0% ללא שינוי";
    }

    formatBossPayerShare(row: BossPayerInsightRow): string {
        return `${row.sharePercent.toFixed(1)}% מהסך`;
    }

    formatBossHospitalShare(row: BossPayerInsightRow): string {
        return `${row.hospitalSharePercent.toFixed(1)}% מכלל ההכנסות בית החולים`;
    }

    getBossParallelPeriodLabel(): string {
        return `תקופה מקבילה ${this.getLatestYear()} מול ${this.getOlderYear()}`;
    }

    getBossPayerChangeTitle(row: BossPayerInsightRow): string {
        return `שינוי בהכנסות ${row.payer} (${this.getBossParallelPeriodLabel()}):`;
    }

    isBossSelectedWingWorstDecline(): boolean {
        const wing = String(this.selectedDiagnosis ?? "").trim();
        return !!wing && wing === this.bossWorstDeclineWingName;
    }

    getBossWingDeclineContextLabel(): string {
        const wing = this.getBossSummaryWingLabel();
        if (this.isBossSelectedWingWorstDecline()) {
            return `מתוך ירידת ${wing} שהוא האגף עם הירידה הגדולה ביותר`;
        }
        return `מתוך ירידת ${wing}`;
    }

    getBossDeclineContributionPercent(row: BossPayerInsightRow): number | null {
        const wingDiff = this.bossSelectedWingDeclineDiff;
        if (wingDiff >= 0 || row.diff >= 0) {
            return null;
        }
        const totalDecline = Math.abs(wingDiff);
        if (totalDecline === 0) {
            return null;
        }
        return (Math.abs(row.diff) / totalDecline) * 100;
    }

    formatBossDeclineContributionAmount(
        row: BossPayerInsightRow,
    ): string | null {
        const pct = this.getBossDeclineContributionPercent(row);
        if (pct === null) {
            return null;
        }
        const totalDecline = Math.abs(this.bossSelectedWingDeclineDiff);
        return `${this.formatNumber(Math.abs(row.diff))} ₪ מתוך ${this.formatNumber(totalDecline)} ₪`;
    }

    formatBossDeclineContributionPercentOnly(
        row: BossPayerInsightRow,
    ): string | null {
        const pct = this.getBossDeclineContributionPercent(row);
        return pct === null ? null : `${pct.toFixed(1)}%`;
    }

    getBossSummaryWingLabel(): string {
        return this.selectedDiagnosis || "כל האגף";
    }

    getBossSummaryTrendWord(): string {
        return this.getTotalDifference() >= 0 ? "עליה" : "ירידה";
    }

    getBossOutliersSummaryText(): string {
        if (!this.bossPayerOutliers.length) {
            return "";
        }
        return `${this.bossPayerOutliers.length} חריגים: ${this.bossPayerOutliers.map((row) => `«${row.payer}»`).join(", ")}`;
    }

    setBossViewMode(mode: BossViewMode): void {
        if (mode === "pie" && !this.bossPayerPieData.length) {
            return;
        }
        this.bossViewMode = mode;
        if (mode === "table") {
            this.bossTablePage = 0;
        }
        if (mode === "pie") {
            this.updateBossPayerPieTheme();
        }
        if (mode === "monthly") {
            this.ensureBossMonthlyChartReady();
            return;
        }
        this.cdr.detectChanges();
    }

    openBossMonthlyChart(): void {
        this.closeBossFilterDropdowns();
        this.bossViewMode = "monthly";
        this.ensureBossMonthlyChartReady();
    }

    private ensureBossMonthlyChartReady(): void {
        const scopeKey = this.getIncomeScopeKey();
        const payerCached = this.readPayerYearlyFromCache(scopeKey);
        if (payerCached?.length) {
            this.payerYearlyRawRows = payerCached;
            this.refreshBossPayerInsights();
            this.updateBossMonthlyChartData();
            this.cdr.detectChanges();
            return;
        }
        if (this.payerYearlyRawRows.length) {
            this.updateBossMonthlyChartData();
            this.cdr.detectChanges();
            return;
        }

        this.bossFilterLoadingKey = "month";
        this.ensurePayerYearlyRawLoaded(() => {
            this.refreshBossPayerInsights();
            this.updateBossMonthlyChartData();
            this.bossFilterLoadingKey = null;
            this.cdr.detectChanges();
        });
    }

    getBossMonthlyChartTitle(): string {
        const latest = this.getLatestYear();
        const older = this.getOlderYear();
        if (this.selectedIncomeMonth !== this.incomeFilterAllValue) {
            return `הכנסות — ${this.selectedIncomeMonth} · ${latest} מול ${older}`;
        }
        return `הכנסות לפי חודש — YTD ${latest} מול ${older}`;
    }

    getBossMonthlyChartSubtitle(): string {
        const parts = [
            `אגף: ${this.getWingDisplayLabel()}`,
            `קרן / מדינה: ${this.getOrganizationDisplay()}`,
            `סוג פעילות: ${this.getUnifiedCategoryDisplay()}`,
        ];
        if (this.selectedIncomeMonth !== this.incomeFilterAllValue) {
            parts.push(`חודש: ${this.getIncomeMonthDisplay()}`);
        }
        return parts.join(" · ");
    }

    private refreshBossViewsFromFilters(): void {
        this.bossTablePage = 0;
        this.refreshBossPayerInsights();
        if (this.bossViewMode === "monthly") {
            this.updateBossMonthlyChartData();
        }
        this.cdr.detectChanges();
    }

    isBossFilterLoading(key: Exclude<BossFilterLoadingKey, null>): boolean {
        return this.bossFilterLoadingKey === key;
    }

    hasActiveBossFilters(): boolean {
        if (!this.bossFiltersBaseline) {
            return false;
        }
        const baseline = this.bossFiltersBaseline;
        return (
            this.bossViewMode !== "table" ||
            this.selectedDiagnosis !== baseline.diagnosis ||
            this.selectedOrganization !== baseline.organization ||
            this.selectedUnifiedCategory !== baseline.unifiedCategory ||
            this.selectedIncomeMonth !== baseline.incomeMonth
        );
    }

    getBossToolbarContextText(): string {
        const viewLabel =
            this.bossViewMode === "table"
                ? "טבלת גורמי משלם"
                : this.bossViewMode === "pie"
                  ? "גרף פאי — נתח לפי גורם משלם"
                  : "גרף חודשי — מגמת הכנסות";
        return `מציג: ${viewLabel} · אגף: ${this.getWingDisplayLabel()} · קרן / מדינה: ${this.getOrganizationDisplay()} · סוג פעילות: ${this.getUnifiedCategoryDisplay()} · חודש: ${this.getIncomeMonthDisplay()}`;
    }

    getBossFilterPanelHint(
        kind: "wing" | "organization" | "unifiedCategory" | "month",
    ): string {
        switch (kind) {
            case "wing":
                return "מגביל את סיכומי YTD לפי אגף ביה״ח (או כל הביה״ח ב«סה״כ»)";
            case "organization":
                return "מסנן לפי קרן / מדינה — משפיע על סיכומי YTD, הטבלה והגרפים";
            case "unifiedCategory":
                return "מסנן לפי סוג פעילות — משפיע על סיכומי YTD, הטבלה והגרפים";
            case "month":
                return "מצמצם את הטבלה/גרפים לחודש ספציפי (או כל השנה ב«הכל»)";
            default:
                return "";
        }
    }

    resetBossFilters(): void {
        if (
            !this.hasActiveBossFilters() ||
            this.bossFilterLoadingKey ||
            !this.bossFiltersBaseline
        ) {
            return;
        }

        const restoreResult = this.restoreBossFiltersFromBaseline();
        if (!restoreResult.restored) {
            return;
        }

        this.refreshAfterBossFilterRestore(restoreResult, "boss");
        this.cdr.detectChanges();
    }

    private restoreBossFiltersFromBaseline(): BossFilterRestoreResult {
        const unchanged: BossFilterRestoreResult = {
            restored: false,
            wingWillChange: false,
            yearlyApiWillChange: false,
            monthWillChange: false,
            restoreAllWings: false,
        };

        if (!this.bossFiltersBaseline) {
            return unchanged;
        }

        const baseline = this.bossFiltersBaseline;
        const wingWillChange = this.selectedDiagnosis !== baseline.diagnosis;
        const yearlyApiWillChange =
            this.selectedOrganization !== baseline.organization ||
            this.selectedUnifiedCategory !== baseline.unifiedCategory;
        const monthWillChange = this.selectedIncomeMonth !== baseline.incomeMonth;
        const viewChanged = this.bossViewMode !== "table";

        if (
            !wingWillChange &&
            !yearlyApiWillChange &&
            !monthWillChange &&
            !viewChanged
        ) {
            return unchanged;
        }

        const restoreAllWings =
            !String(baseline.diagnosis ?? "").trim() ||
            baseline.diagnosis === this.diagnosisAllValue;

        this.selectedDiagnosis = baseline.diagnosis;
        this.selectedOrganization = baseline.organization;
        this.selectedUnifiedCategory = baseline.unifiedCategory;
        this.selectedIncomeMonth = baseline.incomeMonth;
        this.bossViewMode = "table";
        this.bossTablePage = 0;
        this.closeBossFilterDropdowns();

        return {
            restored: true,
            wingWillChange,
            yearlyApiWillChange,
            monthWillChange,
            restoreAllWings,
        };
    }

    private refreshAfterBossFilterRestore(
        result: BossFilterRestoreResult,
        target: "boss" | "main",
    ): void {
        const { wingWillChange, yearlyApiWillChange, monthWillChange, restoreAllWings } =
            result;

        if (wingWillChange) {
            this.payerYearlyByScopeCache.clear();
            this.payerYearlyRawRows = [];
            if (restoreAllWings) {
                this.loadDepartmentIncomeData(true);
            } else {
                this.loadDepartmentIncomeByDiagnosis(true);
            }
        }

        if (target === "boss") {
            if (yearlyApiWillChange || wingWillChange) {
                this.yearlyTotalsFetched = false;
                this.refreshBossDashboard(false, "wing");
            } else {
                this.refreshBossViewsFromFilters();
            }
            return;
        }

        if (!wingWillChange && (yearlyApiWillChange || monthWillChange)) {
            this.reloadDepartmentIncomeWithFilters();
        }
    }

    private updateBossMonthlyChartData(): void {
        this.refreshFiveYearColumnDefs();
        const rows = this.getBossMonthlyChartSourceRows();
        const byMonth = this.aggregateMonthlyIncomeByMonth(rows);
        const months = this.sortHebrewMonths([...byMonth.keys()]);
        this.bossMonthlyChartColumns = this.buildFiveYearChartColumns("חודש");
        this.bossMonthlyChartData = months
            .filter((month) =>
                this.isChartVisibleFiveYearRow(byMonth.get(month)),
            )
            .map((month) =>
                this.buildFiveYearChartDataRow(month, byMonth.get(month)),
            );
        this.applyBossMonthlyChartTheme();
        this.cdr.detectChanges();
    }

    private applyBossMonthlyChartTheme(): void {
        const text = this.isDark ? "#e2e8f0" : "#0f172a";
        const muted = this.isDark ? "#94a3b8" : "#64748b";
        const grid = this.isDark ? "#334155" : "#e2e8f0";
        this.bossMonthlyChartOptions = {
            ...this.bossMonthlyChartOptions,
            title: this.getBossMonthlyChartSubtitle(),
            backgroundColor: "transparent",
            colors: INCOME_DASHBOARD_YEAR_CHART_COLORS.slice(
                0,
                this.getFiveYearLabels().length,
            ),
            legend: {
                ...this.bossMonthlyChartOptions.legend,
                textStyle: { color: text, fontSize: 12, bold: true },
            },
            hAxis: {
                ...this.bossMonthlyChartOptions.hAxis,
                textStyle: { color: text, fontSize: 11 },
            },
            vAxis: {
                ...this.bossMonthlyChartOptions.vAxis,
                gridlines: { color: grid },
                textStyle: { color: muted, fontSize: 11 },
                titleTextStyle: { color: text, fontSize: 12, bold: true },
            },
        };
    }

    getBossPayerTablePageRows(): BossPayerInsightRow[] {
        const start = this.bossTablePage * this.bossTablePageSize;
        return this.bossPayerInsights.slice(
            start,
            start + this.bossTablePageSize,
        );
    }

    getBossTablePageCount(): number {
        if (!this.bossPayerInsights.length) {
            return 1;
        }
        return Math.ceil(
            this.bossPayerInsights.length / this.bossTablePageSize,
        );
    }

    getBossTablePageLabel(): string {
        return `${this.bossTablePage + 1} / ${this.getBossTablePageCount()}`;
    }

    bossTablePrevPage(): void {
        if (this.bossTablePage > 0) {
            this.bossTablePage--;
        }
    }

    bossTableNextPage(): void {
        if (this.bossTablePage < this.getBossTablePageCount() - 1) {
            this.bossTablePage++;
        }
    }

    openPayerViewFromBoss(): void {
        this.closeBossDashboard();
        this.setGraphPrimaryView("payer");
        this.ensurePayerYearlyRawLoaded(() => {
            this.updatePayerChartData(false);
            this.scheduleChartResize();
        });
    }

    private updateBossPayerPieTheme(): void {
        const pieColors = [
            "#2563eb",
            "#0ea5e9",
            "#22c55e",
            "#fbbf24",
            "#a855f7",
            "#f97316",
            "#14b8a6",
            "#ec4899",
            "#64748b",
        ];
        if (this.isDark) {
            this.bossPayerPieOptions = {
                ...this.bossPayerPieOptions,
                backgroundColor: "transparent",
                legend: {
                    ...this.bossPayerPieOptions.legend,
                    textStyle: {
                        ...(this.bossPayerPieOptions.legend?.textStyle || {}),
                        color: "#e2e8f0",
                        fontSize: 28,
                        bold: true,
                    },
                },
                pieSliceTextStyle: {
                    fontSize: 24,
                    bold: true,
                    color: "#f8fafc",
                },
                titleTextStyle: { color: "#e2e8f0" },
                colors: pieColors,
            };
        } else {
            this.bossPayerPieOptions = {
                ...this.bossPayerPieOptions,
                backgroundColor: "transparent",
                legend: {
                    ...this.bossPayerPieOptions.legend,
                    textStyle: {
                        ...(this.bossPayerPieOptions.legend?.textStyle || {}),
                        color: "#334155",
                        fontSize: 28,
                        bold: true,
                    },
                },
                pieSliceTextStyle: {
                    fontSize: 24,
                    bold: true,
                    color: "#1e293b",
                },
                titleTextStyle: { color: "#1e293b" },
                colors: pieColors,
            };
        }
        this.bossPayerPieOptions = { ...this.bossPayerPieOptions };
    }

    /**
     * Close boss dashboard and restore filters captured at open time.
     */
    closeBossDashboard(): void {
        const restoreResult = this.restoreBossFiltersFromBaseline();

        this.showBossDashboard = false;
        this.bossInitialLoading = false;
        this.bossFilterLoadingKey = null;
        this.bossFiltersBaseline = null;
        this.stopBossLoadingAnimation();

        if (restoreResult.restored) {
            this.refreshAfterBossFilterRestore(restoreResult, "main");
        }

        this.cdr.detectChanges();
    }

    toggleBossFilterDropdown(
        type: "wing" | "organization" | "unifiedCategory" | "month",
    ): void {
        const nextWing = type === "wing" ? !this.isBossWingFilterOpen : false;
        const nextOrganization =
            type === "organization" ? !this.isBossOrganizationFilterOpen : false;
        const nextUnifiedCategory =
            type === "unifiedCategory"
                ? !this.isBossUnifiedCategoryFilterOpen
                : false;
        const nextMonth = type === "month" ? !this.isBossMonthFilterOpen : false;
        this.isBossWingFilterOpen = nextWing;
        this.isBossOrganizationFilterOpen = nextOrganization;
        this.isBossUnifiedCategoryFilterOpen = nextUnifiedCategory;
        this.isBossMonthFilterOpen = nextMonth;
    }

    closeBossFilterDropdowns(): void {
        this.isBossWingFilterOpen = false;
        this.isBossOrganizationFilterOpen = false;
        this.isBossUnifiedCategoryFilterOpen = false;
        this.isBossMonthFilterOpen = false;
    }

    setBossWingFilter(option: string): void {
        if (this.selectedDiagnosis === option) {
            this.closeBossFilterDropdowns();
            return;
        }
        this.selectedDiagnosis = option;
        this.closeBossFilterDropdowns();
        this.payerYearlyByScopeCache.clear();
        this.payerYearlyRawRows = [];
        if (this.isAllWingsSelected()) {
            this.loadDepartmentIncomeData(true);
        } else {
            this.loadDepartmentIncomeByDiagnosis(true);
        }
        this.refreshBossDashboard(false, "wing");
    }

    setBossOrganizationFilter(option: string): void {
        this.selectedOrganization = option || this.incomeFilterAllValue;
        this.closeBossFilterDropdowns();
        this.refreshBossViewsFromFilters();
        this.yearlyTotalsFetched = false;
        this.refreshBossDashboard(false, "organization");
    }

    setBossUnifiedCategoryFilter(option: string): void {
        this.selectedUnifiedCategory = option || this.incomeFilterAllValue;
        this.closeBossFilterDropdowns();
        this.refreshBossViewsFromFilters();
        this.yearlyTotalsFetched = false;
        this.refreshBossDashboard(false, "unifiedCategory");
    }

    setBossMonthFilter(option: string): void {
        this.selectedIncomeMonth = option || this.incomeFilterAllValue;
        this.closeBossFilterDropdowns();
        this.bossTablePage = 0;
        this.refreshBossPayerInsights();
        if (
            this.selectedIncomeMonth !== this.incomeFilterAllValue ||
            this.bossViewMode === "monthly"
        ) {
            this.bossViewMode = "monthly";
            this.updateBossMonthlyChartData();
        }
        this.cdr.detectChanges();
    }

    getIncomeMonthDisplay(): string {
        return this.selectedIncomeMonth || this.incomeFilterAllValue;
    }

    /**
     * Load department specific graph
     */
    loadDepartmentSpecificGraph(departmentName: string): void {
        if (this.showTableDepartmentClickHint) {
            this.dismissTableDepartmentClickHint();
        }
        this.selectedDepartment =
            this.departmentIncomeData.find(
                (d) => d.DepartmentName === departmentName,
            ) || null;
        if (!this.selectedDepartment) {
            this.snackBar.open("❌ לא נמצאה מחלקה", "סגור", { duration: 2000 });
            return;
        }
        this.departmentGraphTitle = `פרטי מחלקה: ${departmentName}`;
        this.isDepartmentGraphOpen = true; // Open modal immediately
        this.loadDetailedDepartmentData(departmentName);
    }

    private refreshOpenDepartmentPopupAfterFilterReload(): void {
        if (!this.isDepartmentGraphOpen || !this.selectedDepartment) {
            return;
        }
        const departmentName = this.selectedDepartment.DepartmentName;
        const updatedDepartment =
            this.departmentIncomeData.find(
                (d) => d.DepartmentName === departmentName,
            ) || null;
        if (!updatedDepartment) {
            this.detailedDataSource.data = [];
            this.catalogLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.selectedDepartment = updatedDepartment;
        const cacheKey = this.buildDepartmentDetailedCacheKey(departmentName);
        const cached = this.readDepartmentDetailedFromCache(cacheKey);
        if (cached) {
            this.applyDepartmentDetailedPayload(
                cached.rows,
                cached.meta,
                false,
            );
            return;
        }
        this.loadDetailedDepartmentData(departmentName, false);
    }

    /**
     * Load detailed department data (מטמון מקומי — ללא קריאת שרת חוזרת לאותה מחלקה+מסננים)
     */
    loadDetailedDepartmentData(
        departmentName: string,
        resetView: boolean = true,
    ): void {
        const cacheKey = this.buildDepartmentDetailedCacheKey(departmentName);
        const cached = this.readDepartmentDetailedFromCache(cacheKey);
        if (cached) {
            this.applyDepartmentDetailedPayload(
                cached.rows,
                cached.meta,
                resetView,
            );
            return;
        }

        this.catalogLoading = true;
        this.startSimulatedLoadingProgress("catalog");
        this.http
            .post(environment.url + "GetDepartmentDetailedData", {
                departmentName: departmentName,
                ...this.buildUnfilteredIncomeFilterPayload(),
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        const parsed = this.parseDetailedIncomePayload(
                            response.d,
                        );
                        const rows =
                            parsed?.rows ??
                            (Array.isArray(response.d) ? response.d : []);
                        this.writeDepartmentDetailedToCache(cacheKey, {
                            rows,
                            meta: parsed?.meta ?? null,
                        });
                        this.finishSimulatedLoadingProgress("catalog", () => {
                            this.applyDepartmentDetailedPayload(
                                rows,
                                parsed?.meta ?? null,
                                resetView,
                            );
                        });
                    } else {
                        this.writeDepartmentDetailedToCache(cacheKey, {
                            rows: [],
                            meta: null,
                        });
                        this.finishSimulatedLoadingProgress("catalog", () => {
                            this.applyDepartmentDetailedPayload(
                                [],
                                null,
                                resetView,
                            );
                        });
                    }
                },
                (error) => {
                    console.error("Error loading detailed data:", error);
                    this.stopSimulatedLoadingProgress("catalog");
                    this.catalogLoading = false;
                    this.snackBar.open("❌ שגיאה בטעינת הפרטים", "סגור", {
                        duration: 3000,
                    });
                },
            );
    }

    private buildDepartmentDetailedCacheKey(departmentName: string): string {
        return String(departmentName ?? "").trim();
    }

    private applyDepartmentDetailedPayload(
        rows: DepartmentDetailedDataDto[],
        meta: Record<string, any> | null,
        resetView: boolean,
    ): void {
        this.detailedDataSource.data =
            this.applyIncomeFiltersToDetailedRows(rows);
        if (rows.length) {
            this.applyIncomeReportAsOfFromDetailed(rows, meta);
        }

        if (resetView) {
            this.selectedViewType = "cash";
            this.showCatalogPriceColumn = false;
        }
        this.updateDisplayedCatalogColumns();
        this.sortDetailedDataByCash2025Descending();
        this.catalogLoading = false;
        this.isDepartmentGraphOpen = true;
        this.cdr.detectChanges();
    }

    private invalidateDepartmentDetailedCache(): void {
        this.departmentDetailedDataCache.clear();
        this.yearlyTotalCacheKey = null;
    }

    /**
     * Sort detailed data by Cash2025 descending (default view)
     */
    sortDetailedDataByCash2025Descending(): void {
        if (this.detailedDataSource.data?.length) {
            this.detailedDataSource.data.sort(
                (a, b) =>
                    this.toNumber((b as any)?.Cash2025) -
                    this.toNumber((a as any)?.Cash2025),
            );
        }
    }

    /**
     * Handle column sort in detailed table
     */
    onDetailedTableSort(event: Sort): void {
        if (!event.active || event.direction === "") {
            this.sortDetailedDataByCash2025Descending();
            return;
        }

        const data = (this.detailedDataSource.data || []).slice();
        if (data.length === 0) {
            return;
        }
        data.sort((a: any, b: any) => {
            const aVal =
                event.active === "CatalogUnitPrice"
                    ? this.getCatalogUnitPrice(a)
                    : a[event.active];
            const bVal =
                event.active === "CatalogUnitPrice"
                    ? this.getCatalogUnitPrice(b)
                    : b[event.active];

            const aNum = this.toNumber(aVal);
            const bNum = this.toNumber(bVal);

            return event.direction === "asc" ? aNum - bNum : bNum - aNum;
        });

        this.detailedDataSource.data = data;
        this.cdr.detectChanges();
    }

    /**
     * Close department graph
     */
    closeDepartmentGraph(): void {
        this.isDepartmentGraphOpen = false;
        this.selectedDepartment = null;
        this.detailedDataSource.data = [];
        this.selectedViewType = "cash";
        this.showCatalogPriceColumn = false;
        this.showModalIncomeFilters = false;
        this.closeIncomeFilterDropdowns();
        this.updateDisplayedCatalogColumns();
        this.cdr.detectChanges();
    }

    /**
     * Change catalog view type (cash/units/both)
     */
    onViewTypeChange(viewType: string): void {
        this.selectedViewType = viewType;
        this.updateDisplayedCatalogColumns();
        this.cdr.detectChanges();
    }

    toggleCatalogPriceColumn(): void {
        this.showCatalogPriceColumn = !this.showCatalogPriceColumn;
        this.updateDisplayedCatalogColumns();
        this.cdr.detectChanges();
    }

    toggleModalIncomeFilters(): void {
        this.showModalIncomeFilters = !this.showModalIncomeFilters;
        if (!this.showModalIncomeFilters) {
            this.closeIncomeFilterDropdowns();
        }
        this.cdr.detectChanges();
    }

    getMainDataLoadingProgress(): number {
        return this.getSimulatedLoadingProgress("main");
    }

    getChartLoadingProgress(): number {
        return this.isMainDataLoading
            ? this.getMainDataLoadingProgress()
            : this.getSimulatedLoadingProgress("chart");
    }

    getCatalogLoadingProgress(): number {
        return this.getSimulatedLoadingProgress("catalog");
    }

    getBossLoadingProgress(): number {
        return this.bossLoadingDisplayProgress;
    }

    private startBossLoadingAnimation(): void {
        this.stopBossLoadingAnimation();
        this.bossLoadingDisplayProgress = 0;
        this.bossLoadingFinishing = false;
        this.bossLoadingFinishCallback = null;
        this.bossLoadingProgressInterval = setInterval(() => {
            this.tickBossLoadingProgress();
            this.cdr.detectChanges();
        }, this.bossLoaderTickMs);
    }

    private tickBossLoadingProgress(): void {
        if (this.bossLoadingDisplayProgress >= 100) {
            if (this.bossLoadingFinishCallback) {
                const callback = this.bossLoadingFinishCallback;
                this.bossLoadingFinishCallback = null;
                callback();
            }
            this.stopBossLoadingAnimation();
            return;
        }

        if (this.bossLoadingFinishing) {
            this.bossLoadingDisplayProgress = Math.min(
                100,
                this.bossLoadingDisplayProgress + 5,
            );
            return;
        }

        const progress = this.bossLoadingDisplayProgress;
        let step = 1;
        if (progress < 50 && Math.random() > 0.55) {
            step = 2;
        } else if (progress >= 85) {
            step = 1;
        }

        this.bossLoadingDisplayProgress = Math.min(98, progress + step);
    }

    private finishBossLoadingAnimation(onDone: () => void): void {
        this.bossLoadingFinishing = true;
        this.bossLoadingFinishCallback = onDone;
    }

    private stopBossLoadingAnimation(): void {
        if (this.bossLoadingProgressInterval) {
            clearInterval(this.bossLoadingProgressInterval);
            this.bossLoadingProgressInterval = null;
        }
        this.bossLoadingFinishing = false;
        this.bossLoadingFinishCallback = null;
    }

    getDiagnosesLoadingProgress(): number {
        return this.getSimulatedLoadingProgress("diagnoses");
    }

    private completeMainDataLoading(immediate = false): void {
        if (!this.isMainDataLoading) {
            return;
        }
        if (immediate) {
            this.stopSimulatedLoadingProgress("main");
            this.isMainDataLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.finishSimulatedLoadingProgress("main", () => {
            this.isMainDataLoading = false;
            this.cdr.detectChanges();
        });
    }

    private completeDiagnosesLoading(): void {
        this.finishSimulatedLoadingProgress("diagnoses", () => {
            this.isDiagnosesLoading = false;
            this.cdr.detectChanges();
        });
    }

    private getSimulatedLoadingProgress(key: string): number {
        return this.simulatedLoadingProgress[key] ?? 0;
    }

    private startSimulatedLoadingProgress(key: string): void {
        this.stopSimulatedLoadingProgress(key);
        this.simulatedLoadingProgress[key] = 0;
        this.simulatedLoadingFinishing[key] = false;
        this.simulatedLoadingCallbacks[key] = undefined;
        this.simulatedLoadingIntervals[key] = setInterval(() => {
            this.tickSimulatedLoadingProgress(key);
            this.cdr.detectChanges();
        }, 130);
    }

    private tickSimulatedLoadingProgress(key: string): void {
        const progress = this.simulatedLoadingProgress[key] ?? 0;
        if (progress >= 100) {
            const callback = this.simulatedLoadingCallbacks[key];
            this.simulatedLoadingCallbacks[key] = undefined;
            this.stopSimulatedLoadingProgress(key);
            callback?.();
            return;
        }

        if (this.simulatedLoadingFinishing[key]) {
            this.simulatedLoadingProgress[key] = Math.min(100, progress + 5);
            return;
        }

        let step = 1;
        if (progress < 50 && Math.random() > 0.55) {
            step = 2;
        }
        this.simulatedLoadingProgress[key] = Math.min(98, progress + step);
    }

    private finishSimulatedLoadingProgress(
        key: string,
        onDone?: () => void,
    ): void {
        if (onDone) {
            this.simulatedLoadingCallbacks[key] = onDone;
        }
        if ((this.simulatedLoadingProgress[key] ?? 0) <= 0) {
            onDone?.();
            return;
        }
        this.simulatedLoadingFinishing[key] = true;
    }

    private stopSimulatedLoadingProgress(key: string): void {
        if (this.simulatedLoadingIntervals[key]) {
            clearInterval(this.simulatedLoadingIntervals[key]!);
            this.simulatedLoadingIntervals[key] = null;
        }
        delete this.simulatedLoadingFinishing[key];
        delete this.simulatedLoadingCallbacks[key];
        delete this.simulatedLoadingProgress[key];
    }

    private stopAllSimulatedLoadingProgress(): void {
        for (const key of Object.keys(this.simulatedLoadingIntervals)) {
            this.stopSimulatedLoadingProgress(key);
        }
    }

    getLoadingRingBackground(progress: number): SafeStyle {
        const css = `conic-gradient(from -90deg, #2563eb 0 ${progress}%, rgba(148, 163, 184, 0.24) ${progress}% 100%)`;
        return this.sanitizer.bypassSecurityTrustStyle(css);
    }

    private startLoadingProgress(key: string): void {
        this.loadingProgressStartedAt[key] = Date.now();
        this.ensureLoadingProgressTicker();
    }

    private getAnimatedLoadingProgress(key: string): number {
        if (!this.loadingProgressStartedAt[key]) {
            this.startLoadingProgress(key);
        }

        const elapsed = Date.now() - this.loadingProgressStartedAt[key];
        return Math.min(
            99,
            Math.floor((elapsed / this.loaderSpinDurationMs) * 100),
        );
    }

    private ensureLoadingProgressTicker(): void {
        if (this.loadingProgressRefreshId) {
            return;
        }

        this.loadingProgressRefreshId = setInterval(() => {
            if (this.hasActiveLoadingIndicator()) {
                this.cdr.detectChanges();
                return;
            }

            this.loadingProgressStartedAt = {};
            this.stopLoadingProgressTicker();
        }, 80);
    }

    private stopLoadingProgressTicker(): void {
        if (!this.loadingProgressRefreshId) {
            return;
        }

        clearInterval(this.loadingProgressRefreshId);
        this.loadingProgressRefreshId = null;
    }

    private hasActiveLoadingIndicator(): boolean {
        return (
            this.isLoading ||
            this.isMainDataLoading ||
            this.isDiagnosesLoading ||
            this.isPayerYearlyLoading ||
            this.catalogLoading ||
            this.isChartLoading
        );
    }

    private updateDisplayedCatalogColumns(): void {
        let columns: string[];
        if (this.selectedViewType === "units") {
            columns = this.unitsColumns;
        } else if (this.selectedViewType === "both") {
            columns = this.bothColumns;
        } else {
            columns = this.cashColumns;
        }
        this.displayedCatalogColumns = this.showCatalogPriceColumn
            ? ["CatalogUnitPrice", ...columns]
            : columns;
    }

    /**
     * טוען דגימת פירוט מחלקה אחת כדי לחשב את חודש היחוס המקסימלי בדוח (תאריך עדכון הדוח).
     */
    private loadIncomeReportReferenceFromSampleDepartment(): void {
        if (
            this.incomeReportAsOfFetchDone &&
            (this.incomeReportAsOfLabel || this.referencePeriodFromYearlyIncome)
        ) {
            return;
        }
        if (!this.departmentIncomeData?.length) {
            this.incomeReportAsOfLabel = null;
            this.incomeReportAsOfFetchDone = true;
            return;
        }
        const firstRow = this.departmentIncomeData[0] as any;
        const sampleDept = String(
            firstRow?.DepartmentName ??
                firstRow?.departmentName ??
                firstRow?.Department ??
                "",
        ).trim();
        if (!sampleDept) {
            this.incomeReportAsOfLabel = null;
            this.incomeReportAsOfFetchDone = true;
            return;
        }

        const cacheKey = this.buildDepartmentDetailedCacheKey(sampleDept);
        const cached = this.readDepartmentDetailedFromCache(cacheKey);
        if (cached) {
            if (cached.rows.length) {
                this.applyIncomeReportAsOfFromDetailed(
                    cached.rows,
                    cached.meta,
                );
            }
            this.incomeReportAsOfFetchDone = true;
            this.cdr.detectChanges();
            return;
        }

        this.http
            .post(environment.url + "GetDepartmentDetailedData", {
                departmentName: sampleDept,
                ...this.buildUnfilteredIncomeFilterPayload(),
            })
            .subscribe({
                next: (response: any) => {
                    const parsed = this.parseDetailedIncomePayload(response?.d);
                    const rows = parsed?.rows ?? [];
                    this.writeDepartmentDetailedToCache(cacheKey, {
                        rows,
                        meta: parsed?.meta ?? null,
                    });
                    if (rows.length) {
                        this.applyIncomeReportAsOfFromDetailed(
                            rows,
                            parsed?.meta ?? null,
                        );
                    }
                    this.incomeReportAsOfFetchDone = true;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.incomeReportAsOfFetchDone = true;
                    this.cdr.detectChanges();
                },
            });
    }

    /**
     * פענוח תשובת GetDepartmentDetailedData: מערך, מחרוזת JSON, אובייקט עם rows/Data,
     * ומטא־דאטה לצד השורות (חודש יחוס וכו').
     */
    private parseDetailedIncomePayload(raw: any): {
        rows: DepartmentDetailedDataDto[];
        meta: Record<string, any> | null;
    } | null {
        if (raw == null) {
            return null;
        }
        if (typeof raw === "string") {
            const t = raw.trim();
            if (!t) {
                return null;
            }
            try {
                return this.parseDetailedIncomePayload(JSON.parse(t));
            } catch {
                return null;
            }
        }
        if (Array.isArray(raw)) {
            return { rows: raw as DepartmentDetailedDataDto[], meta: null };
        }
        if (typeof raw !== "object") {
            return null;
        }
        const arrayKeys = [
            "rows",
            "Rows",
            "items",
            "Items",
            "Data",
            "data",
            "Table",
            "Result",
            "list",
            "List",
            "d",
        ];
        for (const k of arrayKeys) {
            if (Array.isArray((raw as any)[k])) {
                const meta = { ...(raw as any) };
                delete (meta as any)[k];
                const keys = Object.keys(meta);
                return {
                    rows: (raw as any)[k] as DepartmentDetailedDataDto[],
                    meta: keys.length ? meta : null,
                };
            }
        }
        if ((raw as any).d != null) {
            const inner = this.parseDetailedIncomePayload((raw as any).d);
            if (inner) {
                const outer = { ...(raw as any) };
                delete (outer as any).d;
                const merged = { ...outer, ...(inner.meta || {}) };
                const mk = Object.keys(merged);
                return {
                    rows: inner.rows,
                    meta: mk.length ? merged : inner.meta,
                };
            }
        }
        const deepRows = this.findFirstObjectArrayInValue(raw);
        if (deepRows?.length) {
            return {
                rows: deepRows as DepartmentDetailedDataDto[],
                meta: raw as Record<string, any>,
            };
        }
        return null;
    }

    /**
     * חיפוש מערך אובייקטים (שורות דוח) בתוך מבנה JSON שרירותי מהשרת.
     */
    private findFirstObjectArrayInValue(raw: any, depth = 0): any[] | null {
        if (raw == null || depth > 12) {
            return null;
        }
        if (typeof raw === "string") {
            const t = raw.trim();
            if (!t || (!t.startsWith("[") && !t.startsWith("{"))) {
                return null;
            }
            try {
                return this.findFirstObjectArrayInValue(
                    JSON.parse(t),
                    depth + 1,
                );
            } catch {
                return null;
            }
        }
        if (Array.isArray(raw)) {
            return raw.length > 0 &&
                typeof raw[0] === "object" &&
                raw[0] != null
                ? raw
                : null;
        }
        if (typeof raw !== "object") {
            return null;
        }
        let best: any[] | null = null;
        let bestScore = -1;
        for (const v of Object.values(raw)) {
            if (
                Array.isArray(v) &&
                v.length > 0 &&
                typeof v[0] === "object" &&
                v[0] != null
            ) {
                const sc = this.scoreIncomeDetailRowArray(v);
                if (sc > bestScore) {
                    bestScore = sc;
                    best = v;
                }
            }
        }
        if (best) {
            return best;
        }
        for (const v of Object.values(raw)) {
            if (v && typeof v === "object" && !Array.isArray(v)) {
                const inner = this.findFirstObjectArrayInValue(v, depth + 1);
                if (inner?.length) {
                    return inner;
                }
            }
        }
        return null;
    }

    private scoreIncomeDetailRowArray(arr: any[]): number {
        const s = arr[0] || {};
        const keys = Object.keys(s);
        let score = 0;
        for (const k of keys) {
            const lk = k.toLowerCase();
            if (lk.includes("catalog")) {
                score += 3;
            }
            if (/^cash\d+$/i.test(k) || /^units\d+$/i.test(k)) {
                score += 2;
            }
            if (lk === "month" || lk === "year" || lk.includes("yearmonth")) {
                score += 4;
            }
        }
        return score;
    }

    private applyIncomeReportAsOfFromDetailed(
        rows: any[],
        meta: Record<string, any> | null,
    ): void {
        if (this.referencePeriodFromYearlyIncome) {
            return;
        }
        if (!rows?.length) {
            return;
        }
        const fallbackLatest = parseInt(this.getLatestYearFromDeptData(), 10);
        const fy =
            !Number.isNaN(fallbackLatest) && fallbackLatest > 0
                ? fallbackLatest
                : null;

        let best = this.computeMaxYearMonthFromDetailedRows(rows, fy);
        best = this.pickBetterYearMonth(
            best,
            this.extractYearMonthFromLooseMeta(meta, fy),
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanObjectsForLooseDates(meta ? [meta] : [], true),
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanObjectsForLooseDates(rows, false),
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanRowStringsForYearMonthGlobally(rows),
        );

        if (!best || best.y < 1900 || best.m < 1 || best.m > 12) {
            return;
        }
        const monthName =
            DepartmentIncomeDashboardComponent.INCOME_REPORT_HEBREW_MONTHS[
                best.m - 1
            ] || String(best.m);
        const older = this.getOlderYearFromDeptData();
        const latest = this.getLatestYearFromDeptData();
        this.incomeReportAsOfLabel =
            older && latest && older !== latest
                ? `נתוני הדוח מעודכנים עד חודש ${monthName} ${best.y} כולל — השוואת הכנסות ${latest} מול ${older} לאותה תקופת יחוס`
                : `נתוני הדוח מעודכנים עד חודש ${monthName} ${best.y} כולל`;
    }

    /** מציג את פס היחוס לאחר שהדף נטען (גם כשאין חודש מפורש מהשרת) */
    get showIncomeReportAsOfStrip(): boolean {
        return this.isDataLoaded && !this.isMainDataLoading;
    }

    /**
     * טקסט הפס: עדכון מדויק מפירוט מחלקה, או מצב טעינה, או הסבר עם שנות ההשוואה.
     */
    get reportAsOfBannerText(): string {
        if (!this.showIncomeReportAsOfStrip) {
            return "";
        }
        if (this.incomeReportAsOfLabel) {
            return this.incomeReportAsOfLabel;
        }
        if (!this.incomeReportAsOfFetchDone) {
            return "טוען חודש יחוס אחרון מנתוני הפירוט…";
        }
        const older = this.getOlderYearFromDeptData();
        const latest = this.getLatestYearFromDeptData();
        if (older && latest) {
            return `הדוח משווה הכנסות ${latest} מול ${older}. חודש היחוס האחרון לא הופיע בנתוני הפירוט מהשרת — לחצו על שם מחלקה בטבלה (פירוט מלא) כדי לעדכן, או הוסיפו בשירות שדות תאריך/חודש.`;
        }
        return "דוח הכנסות מחלקות";
    }

    private pickBetterYearMonth(
        a: { y: number; m: number } | null,
        b: { y: number; m: number } | null,
    ): { y: number; m: number } | null {
        if (!a) {
            return b;
        }
        if (!b) {
            return a;
        }
        if (a.y !== b.y) {
            return a.y > b.y ? a : b;
        }
        return a.m >= b.m ? a : b;
    }

    private computeMaxYearMonthFromDetailedRows(
        rows: any[],
        fallbackLatestYear: number | null,
    ): { y: number; m: number } | null {
        let best: { y: number; m: number } | null = null;
        const yearKeys = [
            "Year",
            "year",
            "ReportYear",
            "reportYear",
            "DataYear",
            "dataYear",
            "FiscalYear",
            "ReferenceYear",
        ];
        const monthKeys = [
            "Month",
            "month",
            "ReportMonth",
            "reportMonth",
            "DataMonth",
            "dataMonth",
            "PeriodMonth",
            "CalendarMonth",
        ];
        for (const r of rows) {
            if (!r || typeof r !== "object") {
                continue;
            }
            let y = -1;
            for (const k of yearKeys) {
                const p = parseInt(String((r as any)[k]), 10);
                if (!Number.isNaN(p) && p > 1900 && p < 2100) {
                    y = p;
                    break;
                }
            }
            if (y < 0 && fallbackLatestYear) {
                y = fallbackLatestYear;
            }
            let mi: number | null = null;
            for (const k of monthKeys) {
                mi = this.parseIncomeReportMonthIndex((r as any)[k]);
                if (mi != null) {
                    break;
                }
            }
            if (y > 0 && mi != null) {
                best = this.pickBetterYearMonth(best, { y, m: mi });
            }
            for (const rk of [
                "YearMonth",
                "yearMonth",
                "year_month",
                "PeriodYm",
                "periodYm",
            ]) {
                const compact = this.tryParseYearMonthCompact((r as any)[rk]);
                if (compact) {
                    best = this.pickBetterYearMonth(best, compact);
                }
            }
        }
        return best;
    }

    private extractYearMonthFromLooseMeta(
        meta: Record<string, any> | null,
        fallbackLatestYear: number | null,
    ): { y: number; m: number } | null {
        if (!meta) {
            return null;
        }
        let best: { y: number; m: number } | null = null;
        for (const [key, val] of Object.entries(meta)) {
            const d = this.tryParseAnyDateToYearMonth(val);
            if (d) {
                best = this.pickBetterYearMonth(best, d);
            }
            const ym = this.tryParseYearMonthCompact(val);
            if (ym) {
                best = this.pickBetterYearMonth(best, ym);
            }
            const lk = key.toLowerCase();
            if (!lk.includes("month") || lk.includes("yearmonth")) {
                continue;
            }
            const m = this.parseIncomeReportMonthIndex(val);
            if (m == null) {
                continue;
            }
            let y = fallbackLatestYear ?? -1;
            const yRaw =
                meta.ReportYear ??
                meta.Year ??
                meta.year ??
                meta.DataYear ??
                meta.ReferenceYear;
            const yp = parseInt(String(yRaw), 10);
            if (!Number.isNaN(yp) && yp > 1900) {
                y = yp;
            }
            if (y > 1900) {
                best = this.pickBetterYearMonth(best, { y, m });
            }
        }
        return best;
    }

    private scanObjectsForLooseDates(
        objects: any[],
        scanAllKeys: boolean,
    ): { y: number; m: number } | null {
        let best: { y: number; m: number } | null = null;
        const keyPattern =
            /date|time|period|asof|through|thru|end|month|year|reference|report|data|updated|עד|תאריך/i;
        for (const obj of objects) {
            if (!obj || typeof obj !== "object") {
                continue;
            }
            for (const [key, val] of Object.entries(obj)) {
                if (!scanAllKeys && !keyPattern.test(key)) {
                    continue;
                }
                const d = this.tryParseAnyDateToYearMonth(val);
                if (d) {
                    best = this.pickBetterYearMonth(best, d);
                }
                if (typeof val === "string" || typeof val === "number") {
                    const ym = this.tryParseYearMonthCompact(val);
                    if (ym) {
                        best = this.pickBetterYearMonth(best, ym);
                    }
                }
            }
        }
        return best;
    }

    /** חילוץ yyyy-mm / טקסט עם תאריך מתוך כל תכני המחרוזת בשורות הפירוט */
    private scanRowStringsForYearMonthGlobally(
        rows: any[],
    ): { y: number; m: number } | null {
        let best: { y: number; m: number } | null = null;
        for (const r of rows) {
            if (!r || typeof r !== "object") {
                continue;
            }
            for (const val of Object.values(r)) {
                if (typeof val !== "string") {
                    continue;
                }
                const t = val.trim();
                if (t.length < 4) {
                    continue;
                }
                const d = this.tryParseAnyDateToYearMonth(t);
                if (d) {
                    best = this.pickBetterYearMonth(best, d);
                }
                const yfm = t.match(/(\d{4})[./\s-](\d{1,2})(?!\d)/);
                if (yfm) {
                    const y = parseInt(yfm[1], 10);
                    const m = parseInt(yfm[2], 10);
                    if (y > 1900 && m >= 1 && m <= 12) {
                        best = this.pickBetterYearMonth(best, { y, m });
                    }
                }
                const mfy = t.match(/\b(\d{1,2})[./\s-](\d{4})\b/);
                if (mfy) {
                    const mo = parseInt(mfy[1], 10);
                    const y = parseInt(mfy[2], 10);
                    if (mo >= 1 && mo <= 12 && y > 1900) {
                        best = this.pickBetterYearMonth(best, { y, m: mo });
                    }
                }
            }
        }
        return best;
    }

    private tryParseYearMonthCompact(
        val: string | number | null | undefined,
    ): { y: number; m: number } | null {
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val === "number" && Number.isFinite(val)) {
            const n = Math.trunc(val);
            if (n >= 190001 && n <= 210012) {
                const y = Math.floor(n / 100);
                const m = n % 100;
                if (m >= 1 && m <= 12) {
                    return { y, m };
                }
            }
            return null;
        }
        const digits = String(val).replace(/\D/g, "");
        if (digits.length === 6) {
            return this.tryParseYearMonthCompact(parseInt(digits, 10));
        }
        return null;
    }

    private tryParseAnyDateToYearMonth(
        val: unknown,
    ): { y: number; m: number } | null {
        if (val == null) {
            return null;
        }
        if (val instanceof Date && !Number.isNaN(val.getTime())) {
            return { y: val.getFullYear(), m: val.getMonth() + 1 };
        }
        if (typeof val === "number" && Number.isFinite(val)) {
            const compact = this.tryParseYearMonthCompact(val);
            if (compact) {
                return compact;
            }
            const isEpochMs = val > 1_000_000_000_000;
            const isEpochSec = val > 1_000_000_000 && val < 100_000_000_000;
            if (isEpochMs || isEpochSec) {
                const ms = isEpochMs ? val : val * 1000;
                const d = new Date(ms);
                if (!Number.isNaN(d.getTime())) {
                    return { y: d.getFullYear(), m: d.getMonth() + 1 };
                }
            }
        }
        const s = String(val).trim();
        if (!s) {
            return null;
        }
        const iso = Date.parse(s);
        if (!Number.isNaN(iso)) {
            const d = new Date(iso);
            return { y: d.getFullYear(), m: d.getMonth() + 1 };
        }
        const ymd = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:[T\s].*)?$/);
        if (ymd) {
            const y = parseInt(ymd[1], 10);
            const m = parseInt(ymd[2], 10);
            if (m >= 1 && m <= 12) {
                return { y, m };
            }
        }
        const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (dmy) {
            const day = parseInt(dmy[1], 10);
            const month = parseInt(dmy[2], 10);
            const y = parseInt(dmy[3], 10);
            if (
                month >= 1 &&
                month <= 12 &&
                day >= 1 &&
                day <= 31 &&
                y > 1900 &&
                y < 2100
            ) {
                return { y, m: month };
            }
        }
        return null;
    }

    private parseIncomeReportMonthIndex(
        month: string | number | null | undefined,
    ): number | null {
        if (month === null || month === undefined) {
            return null;
        }
        const t = String(month).trim();
        if (!t) {
            return null;
        }
        const n = parseInt(t, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 12) {
            return n;
        }
        const lower = t.toLowerCase();
        const fromHebrew =
            DepartmentIncomeDashboardComponent.INCOME_REPORT_HEBREW_MONTHS.findIndex(
                (name) => t.includes(name) || name.includes(t),
            );
        if (fromHebrew >= 0) {
            return fromHebrew + 1;
        }
        const english: Record<string, number> = {
            jan: 1,
            feb: 2,
            mar: 3,
            apr: 4,
            may: 5,
            jun: 6,
            jul: 7,
            aug: 8,
            sep: 9,
            sept: 9,
            oct: 10,
            nov: 11,
            dec: 12,
        };
        for (const [key, val] of Object.entries(english)) {
            if (lower.startsWith(key)) {
                return val;
            }
        }
        return null;
    }

    /**
     * Calculate difference between years
     */
    calculateDifference(item: {
        Income2024: number;
        Income2025: number;
    }): number {
        return item.Income2025 - item.Income2024;
    }

    /**
     * Get percentage change - percentage sign on LEFT (RTL support)
     */
    calculatePercentageChange(item: {
        Income2024: number;
        Income2025: number;
    }): string {
        if (item.Income2024 === 0) return "∞%";
        const percentage =
            ((item.Income2025 - item.Income2024) / item.Income2024) * 100;
        // Percentage sign will be on left due to RTL CSS
        return percentage.toFixed(2) + "%";
    }

    /**
     * Calculate percentage change for yearly data
     */
    calculateYearlyPercentageChange(): string {
        if (this.yearlyTotalData.length < 2) return "0%";
        const olderYear = this.getOlderYearTotal();
        const latestYear = this.getLatestYearTotal();

        if (olderYear === 0) return "∞%";
        const percentage = ((latestYear - olderYear) / olderYear) * 100;
        return percentage.toFixed(2) + "%";
    }

    /**
     * Format number with locale formatting
     */
    formatNumber(value: number): string {
        return value.toLocaleString("he-IL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    // במקום getTotal2024() / getTotal2025(), עשה דינמי:

    getOlderYearTotal(): number {
        if (this.yearlyTotalData.length < 2) return 0;
        // Sort and get the second-to-last year (previous year)
        const sorted = [...this.yearlyTotalData].sort(
            (a, b) => parseInt(a.Year) - parseInt(b.Year),
        );
        // Get the second-to-last year (previous year before latest)
        return sorted[sorted.length - 2]?.TotalRealValue || 0;
    }

    getLatestYearTotal(): number {
        if (this.yearlyTotalData.length === 0) return 0;
        // Sort and get the latest year (last item after sort)
        const sorted = [...this.yearlyTotalData].sort(
            (a, b) => parseInt(a.Year) - parseInt(b.Year),
        );
        return sorted[sorted.length - 1]?.TotalRealValue || 0;
    }

    getOlderYear(): string {
        if (this.yearlyTotalData.length < 2) return "";
        const sorted = [...this.yearlyTotalData].sort(
            (a, b) => parseInt(a.Year) - parseInt(b.Year),
        );
        // Get the second-to-last year (previous year before latest)
        return sorted[sorted.length - 2]?.Year || "";
    }

    getLatestYear(): string {
        if (this.yearlyTotalData.length === 0) return "";
        const sorted = [...this.yearlyTotalData].sort(
            (a, b) => parseInt(a.Year) - parseInt(b.Year),
        );
        return sorted[sorted.length - 1]?.Year || "";
    }

    getTotalDifference(): number {
        return this.getLatestYearTotal() - this.getOlderYearTotal();
    }

    /**
     * Get the older year from department income data (Income2024)
     * The server dynamically assigns years, so Income2024 is always the older year
     */
    getOlderYearFromDeptData(): string {
        // First try to get from yearlyTotalData if available
        if (this.yearlyTotalData.length >= 2) {
            return this.getOlderYear();
        }
        // Fallback: if we have department data, try to infer from current year
        // The server always compares the two latest years
        if (this.departmentIncomeData.length > 0) {
            return String(this.resolveFiveYearEndYear() - 1);
        }
        return "";
    }

    /**
     * Get the latest year from department income data (Income2025)
     * The server dynamically assigns years, so Income2025 is always the newer year
     */
    getLatestYearFromDeptData(): string {
        if (this.yearlyTotalData.length >= 1) {
            return this.getLatestYear();
        }
        if (this.departmentIncomeData.length > 0) {
            return String(this.resolveFiveYearEndYear());
        }
        return "";
    }

    /**
     * Update chart columns dynamically based on years
     */
    updateChartColumns(): void {
        this.refreshFiveYearColumnDefs();
        const category =
            this.graphPrimaryView === "payer" ? "גורם משלם" : "מחלקה";
        this.chartColumns = this.buildFiveYearChartColumns(category);

        if (this.chartOptions) {
            this.chartOptions.title = "";
            this.chartOptions = { ...this.chartOptions };
        }
        this.scheduleResponsiveChartLayout(this.graphBodyLastWidth || 720);
    }

    /**
     * Export data to CSV
     */
    exportToCSV(): void {
        let csvContent = "data:text/csv;charset=utf-8,";
        const olderYear = this.getOlderYearFromDeptData();
        const latestYear = this.getLatestYearFromDeptData();
        csvContent += `מחלקה,הכנסות ${olderYear},הכנסות ${latestYear},הפרש,אחוז שינוי\n`;

        this.departmentIncomeData.forEach((item) => {
            const difference = this.calculateDifference(item);
            const percentage = this.calculatePercentageChange(item);
            csvContent += `"${item.DepartmentName}",${item.Income2024},${item.Income2025},${difference},${percentage}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "department_income_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.snackBar.open("✓ הדוח יוצא בהצלחה", "סגור", { duration: 2000 });
    }

    /**
     * Dismiss the guide avatar. If "don't show again" is checked, remember for next visits.
     */
    dismissGuideAvatar(): void {
        this.showGuideAvatar = false;
        if (this.dontShowGuideAgain) {
            localStorage.setItem("dashboardGuideDontShowAgain", "true");
        } else {
            localStorage.removeItem("dashboardGuideDontShowAgain");
        }
    }

    /**
     * Open article showcase modal
     */
    openArticleShowcase(article: string): void {
        this.currentArticle = article;
        this.showArticleShowcase = true;
    }

    /**
     * Close article showcase modal
     */
    closeArticleShowcase(): void {
        this.showArticleShowcase = false;
        this.currentArticle = "";
    }

    /**
     * Get icon for current article
     */
    getArticleIcon(): string {
        switch (this.currentArticle) {
            case "purpose":
                return "📋";
            case "notes":
                return "⚠️";
            case "structure":
                return "🗂️";
            default:
                return "📖";
        }
    }

    /**
     * Get title for current article
     */
    getArticleTitle(): string {
        switch (this.currentArticle) {
            case "purpose":
                return "מטרת הדוח";
            case "notes":
                return "הערות חשובות";
            case "structure":
                return "מבנה הדוח";
            default:
                return "מדריך הדוח";
        }
    }

    /**
     * Scroll to a specific section in the explanation
     */
    scrollToSection(section: string): void {
        let targetId = "";

        switch (section) {
            case "purpose":
                targetId = "section-purpose";
                break;
            case "notes":
                targetId = "section-notes";
                break;
            case "structure":
                targetId = "section-structure";
                break;
        }

        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
                element.classList.add("section-highlight");
                setTimeout(() => {
                    element.classList.remove("section-highlight");
                }, 2000);
            }
        }
    }
    cashDiff(e: any): number {
        const a = this.toNumber(e?.Cash2025);
        const b = this.toNumber(e?.Cash2024);
        return a - b;
    }

    cashPct(e: any): string {
        const a = this.toNumber(e?.Cash2025);
        const b = this.toNumber(e?.Cash2024);
        if (!b) return a ? "∞" : "0%";
        return `${(((a - b) / b) * 100).toFixed(1)}%`;
    }

    getModalOlderIncome(): number {
        return this.getModalCashTotal(
            "Cash2024",
            this.selectedDepartment?.Income2024 ?? 0,
        );
    }

    getModalLatestIncome(): number {
        return this.getModalCashTotal(
            "Cash2025",
            this.selectedDepartment?.Income2025 ?? 0,
        );
    }

    getModalDifference(): number {
        return this.getModalLatestIncome() - this.getModalOlderIncome();
    }

    getModalPercentageChange(): string {
        const olderIncome = this.getModalOlderIncome();
        const latestIncome = this.getModalLatestIncome();
        if (!olderIncome) {
            return latestIncome ? "∞" : "0%";
        }
        return `${(((latestIncome - olderIncome) / olderIncome) * 100).toFixed(
            2,
        )}%`;
    }

    private getModalCashTotal(field: string, fallback: number): number {
        const rows = this.detailedDataSource.data || [];
        if (this.catalogLoading && rows.length === 0) {
            return fallback;
        }
        return rows.reduce((total, row: any) => {
            return total + this.toNumber(row?.[field]);
        }, 0);
    }

    getCatalogServiceName(row: any): string {
        return String(
            row?.CatalogName2 ??
                row?.CatalogName ??
                row?.catalogName2 ??
                row?.catalogName ??
                row?.ServiceName ??
                row?.serviceName ??
                "",
        ).trim();
    }

    getCatalogUnitPrice(row: any): number | null {
        const latestYearCash = this.toNumber(row?.Cash2025);
        const latestYearUnits = this.toNumber(row?.Units2025);
        return latestYearUnits > 0 ? latestYearCash / latestYearUnits : null;
    }

    formatCatalogUnitPrice(row: any): string {
        const price = this.getCatalogUnitPrice(row);
        return price == null
            ? "-"
            : `${this.formatNumber(Math.round(price))} ₪`;
    }

    private sumNumericFields(row: any, fields: string[]): number {
        return fields.reduce((total, field) => {
            return total + this.toNumber(row?.[field]);
        }, 0);
    }

    private toNumber(value: any): number {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }
        const parsed = Number(
            String(value ?? "")
                .replace(/[^\d.-]/g, "")
                .trim(),
        );
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private applyIncomeFiltersToDetailedRows(
        rows: DepartmentDetailedDataDto[],
    ): DepartmentDetailedDataDto[] {
        return this.applyIncomeFiltersToDetailRows(
            rows || [],
        ) as DepartmentDetailedDataDto[];
    }

    /**
     * סינון שורות פירוט כמו בסרגל הפילטרים, עם אפשרות לדלג על ממד הציר (לפילוח עמודות).
     */
    private applyIncomeFiltersForPivotRows(
        rows: DepartmentDetailedDataDto[],
        skip: {
            unified?: boolean;
            organization?: boolean;
            classification?: boolean;
            source?: boolean;
        },
    ): DepartmentDetailedDataDto[] {
        if (!Array.isArray(rows)) {
            return [];
        }
        if (!this.hasActiveIncomeFilters()) {
            return rows;
        }
        return rows.filter((row: any) => {
            const cls =
                skip.classification === true ||
                this.matchesIncomeFilter(
                    row,
                    this.selectedIncomeClassification,
                    ["IncomeCategory", "incomeCategory"],
                );
            const org =
                skip.organization === true ||
                this.matchesIncomeFilter(row, this.selectedOrganization, [
                    "Organization",
                    "organization",
                ]);
            const uni =
                skip.unified === true ||
                this.matchesUnifiedCategoryIncomeFilter(
                    row,
                    this.selectedUnifiedCategory,
                );
            return cls && org && uni;
        });
    }

    private matchesIncomeFilter(
        row: any,
        selectedValue: string,
        candidateFields: string[],
    ): boolean {
        if (!selectedValue || selectedValue === this.incomeFilterAllValue) {
            return true;
        }
        const rowValue = this.getFirstNonEmptyString(row, candidateFields);
        return rowValue === selectedValue;
    }

    /** התאמת «סוג פעילות» — כולל מיפוי ל«אחר» כמו בגרף הפילוח */
    private matchesUnifiedCategoryIncomeFilter(
        row: any,
        selectedValue: string,
        payerYearlyOnly = false,
    ): boolean {
        if (!selectedValue || selectedValue === this.incomeFilterAllValue) {
            return true;
        }
        const allSegments = this.unifiedCategoryOptions.filter(
            (o) => o && String(o).trim() && o !== this.incomeFilterAllValue,
        );
        const raw = this.getFirstNonEmptyString(
            row,
            payerYearlyOnly
                ? ["UnifiedCategory", "unifiedCategory"]
                : [
                      "UnifiedCategory",
                      "unifiedCategory",
                      "UnifiedDiagnosis",
                      "unifiedDiagnosis",
                  ],
        );
        const mapped = this.mapRowValueToFilterOption(raw, allSegments);
        if (mapped === selectedValue) {
            return true;
        }
        return raw === selectedValue;
    }

    /** מחבר מסנן סרגל לכפתור מצב גרף (סיווג מאוחד / קרן·מדינה) */
    private syncGraphToolbarToIncomeFilters(): void {
        const hasUnified =
            this.selectedUnifiedCategory !== this.incomeFilterAllValue;
        const hasOrg = this.selectedOrganization !== this.incomeFilterAllValue;
        if (hasUnified) {
            this.graphToolbarDimensionMode = "unifiedCategory";
            return;
        }
        if (hasOrg) {
            this.graphToolbarDimensionMode = "organization";
            return;
        }
        if (this.graphToolbarDimensionMode !== "total") {
            this.graphToolbarDimensionMode = "total";
            this.clearDimensionalChartDisplay();
        }
    }

    private getFirstNonEmptyString(
        row: any,
        candidateFields: string[],
    ): string {
        for (const field of candidateFields) {
            const value = String(row?.[field] ?? "").trim();
            if (value) {
                return value;
            }
        }
        return "";
    }

    get currentYear() {
        return new Date().getFullYear();
    }

    /**
     * Check if the latest year is the current year (YTD comparison)
     */
    isLatestYearCurrentYear(): boolean {
        const latestYear = this.getLatestYear();
        return latestYear && parseInt(latestYear) === this.currentYear;
    }

    /**
     * Get YTD comparison description
     */
    getYTDDescription(): string {
        if (this.isLatestYearCurrentYear()) {
            return `YTD — אותם חודשים ב-${this.getLatestYear()} מול ${this.getOlderYear()}`;
        }
        return `השוואת שנים שלמות: ${this.getOlderYear()} מול ${this.getLatestYear()}`;
    }

    get diffTooltip(): string {
        return `השוואה בין ${this.currentYear - 1} ל־${this.currentYear - 2}: הפרש כספי ואחוז שינוי`;
    }

    /**
     * Toggle dark/light theme
     */
    toggleTheme(): void {
        this.isDark = !this.isDark;
        this.updateChartTheme();
        this.updateBossPayerPieTheme();
        this.syncBodyDarkClass();
        this.cdr.detectChanges();
    }

    /**
     * Toggle Top Departments sidebar and force chart to resize with new layout
     */
    toggleTopDepartmentsSidebar(): void {
        this.showTopDepartmentsSidebar = !this.showTopDepartmentsSidebar;

        // Give grid a tick to recalculate, then trigger chart redraw/resize
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore if window is not available (SSR safeguard)
            }

            // New reference so angular-google-charts will detect changes
            this.chartOptions = { ...this.chartOptions };

            if (this.chartData && this.chartData.length > 0) {
                this.updateChartData();
            }
            if (this.isBreakdownChartViewActive) {
                this.syncBreakdownChartTheme();
            }
        }, 0);
    }

    toggleIncomeFiltersSidebar(): void {
        this.showIncomeFiltersSidebar = !this.showIncomeFiltersSidebar;
        if (!this.showIncomeFiltersSidebar) {
            this.closeIncomeFilterDropdowns();
        }
        this.scheduleChartResize();
    }

    toggleIncomeFilterDropdown(
        type: "source" | "classification" | "organization" | "unifiedCategory",
    ): void {
        if (
            type === "classification" &&
            this.isIncomeClassificationFilterDisabled
        ) {
            return;
        }
        const nextSource = type === "source" ? !this.isIncomeSourceOpen : false;
        const nextClassification =
            type === "classification"
                ? !this.isIncomeClassificationOpen
                : false;
        const nextOrganization =
            type === "organization" ? !this.isOrganizationOpen : false;
        const nextUnifiedCategory =
            type === "unifiedCategory" ? !this.isUnifiedCategoryOpen : false;
        this.isIncomeSourceOpen = nextSource;
        this.isIncomeClassificationOpen = nextClassification;
        this.isOrganizationOpen = nextOrganization;
        this.isUnifiedCategoryOpen = nextUnifiedCategory;
    }

    setIncomeSourceFilter(option: string): void {
        this.selectedIncomeSource = option || this.incomeFilterAllValue;
        this.closeIncomeFilterDropdowns();
        this.reloadDepartmentIncomeWithFilters();
    }

    setIncomeClassificationFilter(option: string): void {
        this.selectedIncomeClassification = option || this.incomeFilterAllValue;
        this.closeIncomeFilterDropdowns();
        this.reloadDepartmentIncomeWithFilters();
    }

    setOrganizationFilter(option: string): void {
        this.selectedOrganization = option || this.incomeFilterAllValue;
        this.closeIncomeFilterDropdowns();
        this.reloadDepartmentIncomeWithFilters();
    }

    setUnifiedCategoryFilter(option: string): void {
        this.selectedUnifiedCategory = option || this.incomeFilterAllValue;
        this.closeIncomeFilterDropdowns();
        this.reloadDepartmentIncomeWithFilters();
    }

    resetIncomeFilters(): void {
        if (!this.hasActiveIncomeFilters()) {
            return;
        }
        this.selectedIncomeSource = this.incomeFilterAllValue;
        this.selectedIncomeClassification = this.incomeFilterAllValue;
        this.selectedOrganization = this.incomeFilterAllValue;
        this.selectedUnifiedCategory = this.incomeFilterAllValue;
        this.closeIncomeFilterDropdowns();
        this.reloadDepartmentIncomeWithFilters();
    }

    hasActiveIncomeFilters(): boolean {
        if (this.graphPrimaryView === "payer") {
            return this.hasActivePayerIncomeFilters();
        }
        return (
            this.selectedIncomeClassification !== this.incomeFilterAllValue ||
            this.selectedOrganization !== this.incomeFilterAllValue ||
            this.selectedUnifiedCategory !== this.incomeFilterAllValue ||
            this.selectedIncomeMonth !== this.incomeFilterAllValue
        );
    }

    getIncomeSourceDisplay(): string {
        return this.selectedIncomeSource || this.incomeFilterAllValue;
    }

    getIncomeClassificationDisplay(): string {
        return this.selectedIncomeClassification || this.incomeFilterAllValue;
    }

    getOrganizationDisplay(): string {
        return this.selectedOrganization || this.incomeFilterAllValue;
    }

    getUnifiedCategoryDisplay(): string {
        return this.selectedUnifiedCategory || this.incomeFilterAllValue;
    }

    getIncomeFiltersSummary(): string {
        if (!this.hasActiveIncomeFilters()) {
            return this.graphPrimaryView === "payer"
                ? "מוצגים כל סיווגי ההכנסה המאוחדים והארגונים."
                : "מוצגים כל מקורות המימון, הארגונים, הקטגוריות וסיווגי ההכנסה.";
        }
        if (this.graphPrimaryView === "payer") {
            const parts: string[] = [];
            if (this.selectedUnifiedCategory !== this.incomeFilterAllValue) {
                parts.push(`סוג פעילות: ${this.getUnifiedCategoryDisplay()}`);
            }
            if (this.selectedOrganization !== this.incomeFilterAllValue) {
                parts.push(`קרן / מדינה: ${this.getOrganizationDisplay()}`);
            }
            return parts.join(" · ");
        }
        const parts = [
            `קרן / מדינה: ${this.getIncomeSourceDisplay()}`,
            `סיווג הכנסה: ${this.getIncomeClassificationDisplay()}`,
            `ארגון: ${this.getOrganizationDisplay()}`,
            `קטגוריה אחודה: ${this.getUnifiedCategoryDisplay()}`,
        ];
        return parts.join(" · ");
    }

    private closeIncomeFilterDropdowns(): void {
        this.isIncomeSourceOpen = false;
        this.isIncomeClassificationOpen = false;
        this.isOrganizationOpen = false;
        this.isUnifiedCategoryOpen = false;
        this.isIncomeMonthOpen = false;
        this.isMonthlyDepartmentOpen = false;
    }

    private reloadDepartmentIncomeWithFilters(): void {
        if (this.graphPrimaryView === "payer") {
            const scopeKey = this.getIncomeScopeKey();
            const renderPayer = () => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshPayerTypeOptions();
                this.refreshPayerDepartmentOptions();
                if (this.hasResolvedFiveYearEndYear()) {
                    this.updatePayerChartData(false);
                    this.applyPayerTableSearch();
                    this.queueTableSortSync();
                    this.cdr.detectChanges();
                    return;
                }
                this.refreshPayerViewsFromCache(false);
            };
            if (this.payerYearlyByScopeCache.has(scopeKey)) {
                this.payerYearlyRawRows =
                    this.payerYearlyByScopeCache.get(scopeKey) ?? [];
                renderPayer();
                return;
            }
            this.ensurePayerYearlyRawLoaded(renderPayer);
            return;
        }

        const scopeKey = this.getIncomeScopeKey();
        const cachedRaw = this.incomeRawUnfilteredByScope.get(scopeKey);
        const runIncomeRefresh = () => {
            if (this.isDepartmentMonthlyChartActive) {
                this.refreshPayerYearlyFilterOptions();
                this.refreshMonthlyDepartmentOptions();
                this.updateDepartmentMonthlyChartData();
                return;
            }
            if (cachedRaw?.length) {
                this.applyIncomeFiltersAndRefreshViews(cachedRaw, false);
                return;
            }
            if (this.selectedDiagnosis) {
                this.loadDepartmentIncomeByDiagnosis();
            } else {
                this.loadDepartmentIncomeData();
            }
        };
        if (
            this.hasActivePayerIncomeFilters() ||
            this.isDepartmentMonthlyChartActive
        ) {
            this.ensurePayerYearlyRawLoaded(runIncomeRefresh);
            return;
        }
        runIncomeRefresh();
    }

    private applyIncomeFiltersToComparisonRows(
        rows: DepartmentComparisonDto[],
    ): DepartmentComparisonDto[] {
        return this.applyIncomeFiltersToDetailRows(
            rows || [],
        ) as DepartmentComparisonDto[];
    }

    /**
     * מיישם את 3 הפילטרים מהסרגל על שורות גולמיות ומרענן גרף+טבלה מיד (ללא המתנה ל-API).
     */
    private applyIncomeFiltersAndRefreshViews(
        rawRows: DepartmentComparisonDto[],
        showDeptClickHint = false,
    ): void {
        const filtered = this.applyIncomeFiltersToComparisonRows(rawRows);
        this.diagnosisApiRawRows = filtered;
        this.syncFiveYearEndYearFromDiagnosisRows(filtered);

        if (
            this.shouldUseYearlyDataForDepartmentChart() &&
            this.payerYearlyRawRows.length
        ) {
            this.departmentIncomeData =
                this.buildDepartmentComparisonFromPayerYearly(
                    this.getPayerYearlyRowsForDepartmentChart(),
                );
        } else {
            this.departmentIncomeData =
                this.aggregateDepartmentRowsForTable(filtered);
        }
        this.departmentIncomeData.sort(
            (a, b) => this.getRowFiveYearTotal(b) - this.getRowFiveYearTotal(a),
        );
        this.dataSource.data = [...this.departmentIncomeData];
        this.isDataLoaded = true;
        this.completeMainDataLoading();

        this.invalidateBreakdownDetailCache();
        this.refreshFiveYearColumnDefs();
        this.calculateTopDepartments();
        this.updateChartColumns();

        if (this.graphPrimaryView === "payer") {
            this.refreshPayerViewsFromCache(false);
        } else if (this.isDepartmentMonthlyChartActive) {
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshMonthlyDepartmentOptions();
                this.updateDepartmentMonthlyChartData();
            });
        } else if (this.isBreakdownChartViewActive) {
            this.ensureBreakdownDetailCacheLoaded();
        } else {
            this.ensureFiveYearLabelsReady(() => {
                this.updateChartData(false);
            });
        }
        this.isChartLoading = false;

        this.updateChartTheme();
        this.loadIncomeReportReferenceFromSampleDepartment();
        this.applyDepartmentTableSearch();
        this.queueTableSortSync();
        if (showDeptClickHint) {
            this.maybeShowTableDepartmentClickHint();
        }
        this.refreshOpenDepartmentPopupAfterFilterReload();
        this.cdr.detectChanges();

        this.ensurePayerYearlyForFiveYearView(() => {
            this.enrichDepartmentFiveYearsFromYearly();
            this.dataSource.data = [...this.departmentIncomeData];
            this.cdr.detectChanges();
        });
    }

    /** עדכון טבלה/גרף מהמטמון המקומי — ללא קריאת API */
    private rebuildIncomeDashboardFromCache(
        showDeptClickHint = false,
        _dataAlreadyFiltered = false,
    ): void {
        const scopeKey = this.getIncomeScopeKey();
        const cached =
            this.incomeRawUnfilteredByScope.get(scopeKey) ??
            this.incomeRawByScopeCache.get(
                JSON.stringify({
                    scope: scopeKey,
                    filters: this.buildIncomeFilterRequest(),
                }),
            );
        if (!cached?.length) {
            return;
        }
        this.applyIncomeFiltersAndRefreshViews(cached, showDeptClickHint);
        this.loadYearlyTotalsForChart();
        this.loadIncomeReportReferenceFromSampleDepartment();
        this.refreshOpenDepartmentPopupAfterFilterReload();
    }

    /**
     * מיפוי ערך מהמסך ל־API: «הכל» / ריק → null (ב־JSON), ערך נבחר → המחרוזת.
     * בצד השרת: פרמטר NULL ב-SQL = ללא סינון — `(@p IS NULL OR Column = @p)`.
     * חשוב: לא לשלוח "" — זה גורם ל־`Column = N''` ומסנן שגוי.
     */
    private mapIncomeFilterToApiParam(uiValue: string): string | null {
        const v = String(uiValue ?? "").trim();
        if (!v || v === this.incomeFilterAllValue) {
            return null;
        }
        return v;
    }

    /**
     * גוף בקשה ל־ASMX: ארבעת ממדי הסינון; null = אין סינון (כמו בפילטר בצד).
     */
    private buildIncomeFilterRequest(): {
        medicalUnitIncome: string | null;
        incomeCategory: string | null;
        organization: string | null;
        unifiedCategory: string | null;
    } {
        return {
            medicalUnitIncome: this.mapIncomeFilterToApiParam(
                this.selectedIncomeSource,
            ),
            incomeCategory: this.mapIncomeFilterToApiParam(
                this.selectedIncomeClassification,
            ),
            organization: this.mapIncomeFilterToApiParam(
                this.selectedOrganization,
            ),
            unifiedCategory: this.mapIncomeFilterToApiParam(
                this.selectedUnifiedCategory,
            ),
        };
    }

    private loadIncomeFilterOptions(): void {
        if (this.incomeClassificationOptions.length > 1) {
            return;
        }

        const cached = this.localDataCache.get<{
            medicalUnitIncome: string[];
            incomeCategory: string[];
            organization: string[];
            unifiedCategory: string[];
        }>("filterOptions");
        if (cached) {
            this.applyStoredIncomeFilterOptions(cached);
            this.cdr.detectChanges();
            return;
        }

        this.http
            .post(environment.url + "GetDepartmentIncomeFilterOptions", {})
            .subscribe({
                next: (response: any) => {
                    const payload = this.parseIncomeFilterOptionsPayload(
                        response?.d ?? response,
                    );
                    this.localDataCache.set("filterOptions", payload);
                    this.applyStoredIncomeFilterOptions(payload);
                    this.cdr.detectChanges();
                },
                error: () => {
                    // Server endpoint is optional until the backend filter contract is deployed.
                },
            });
    }

    private parseIncomeFilterOptionsPayload(raw: any): {
        medicalUnitIncome: string[];
        incomeCategory: string[];
        organization: string[];
        unifiedCategory: string[];
    } {
        if (typeof raw === "string") {
            try {
                return this.parseIncomeFilterOptionsPayload(JSON.parse(raw));
            } catch {
                return {
                    medicalUnitIncome: [],
                    incomeCategory: [],
                    organization: [],
                    unifiedCategory: [],
                };
            }
        }
        const source =
            raw?.medicalUnitIncome ??
            raw?.MedicalUnitIncome ??
            raw?.medicalUnit_Income ??
            raw?.MedicalUnit_Income ??
            raw?.funds ??
            raw?.Funds ??
            [];
        const category =
            raw?.incomeCategory ??
            raw?.IncomeCategory ??
            raw?.classifications ??
            raw?.Classifications ??
            [];
        const organization =
            raw?.organization ??
            raw?.Organization ??
            raw?.organizations ??
            raw?.Organizations ??
            [];
        const unifiedCategory =
            raw?.unifiedCategory ??
            raw?.UnifiedCategory ??
            raw?.unifiedCategories ??
            raw?.UnifiedCategories ??
            [];
        return {
            medicalUnitIncome: this.normalizeIncomeFilterOptions(source),
            incomeCategory: this.normalizeIncomeFilterOptions(category),
            organization: this.normalizeIncomeFilterOptions(organization),
            unifiedCategory: this.normalizeIncomeFilterOptions(unifiedCategory),
        };
    }

    private normalizeIncomeFilterOptions(raw: any): string[] {
        if (!Array.isArray(raw)) {
            return [];
        }
        return Array.from(
            new Set(
                raw
                    .map((item) => String(item ?? "").trim())
                    .filter(
                        (item) => item && item !== this.incomeFilterAllValue,
                    ),
            ),
        );
    }

    private scheduleChartResize(): void {
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore if window is not available (SSR safeguard)
            }
            this.graphLayoutSignature = "";
            this.scheduleResponsiveChartLayout(
                this.graphBodyLastWidth ||
                    this.graphBodyRef?.nativeElement?.clientWidth ||
                    720,
            );
            this.chartOptions = { ...this.chartOptions };
            if (this.chartData?.length) {
                this.applyIncomeChartHtmlTooltips();
            }
            if (this.isBreakdownChartViewActive) {
                this.syncBreakdownChartTheme();
            }
            this.cdr.detectChanges();
        }, 0);
    }

    onGraphToolbarToggleChange(value: unknown): void {
        if (
            value === "total" ||
            value === "unifiedCategory" ||
            value === "organization" ||
            value === "departmentMonthly"
        ) {
            this.setGraphToolbarMode(value);
        }
    }

    setGraphToolbarMode(
        mode:
            | "total"
            | "unifiedCategory"
            | "organization"
            | "departmentMonthly",
    ): void {
        if (this.graphToolbarDimensionMode === mode) {
            return;
        }
        this.graphToolbarDimensionMode = mode;
        if (mode === "total") {
            this.clearDimensionalChartDisplay();
            this.isBreakdownChartsLoading = false;
            this.ensureFiveYearLabelsReady(() => {
                this.updateChartData(false);
            });
            this.scheduleChartResize();
            this.cdr.detectChanges();
            return;
        }
        if (mode === "departmentMonthly") {
            this.clearDimensionalChartDisplay();
            this.isBreakdownChartsLoading = false;
            if (
                this.selectedIncomeClassification !== this.incomeFilterAllValue
            ) {
                this.selectedIncomeClassification = this.incomeFilterAllValue;
            }
            this.ensurePayerYearlyRawLoaded(() => {
                this.refreshPayerYearlyFilterOptions();
                this.refreshMonthlyDepartmentOptions();
                this.ensureFiveYearLabelsReady(() => {
                    this.updateDepartmentMonthlyChartData();
                });
            });
            this.scheduleChartResize();
            this.cdr.detectChanges();
            return;
        }
        if (
            this.breakdownDetailRawResults &&
            this.breakdownDetailCacheKey === this.computeBreakdownCacheKey()
        ) {
            this.applyActiveDimensionChartFromCache();
            this.syncBreakdownChartTheme();
            this.scheduleChartResize();
            this.cdr.detectChanges();
            return;
        }
        this.ensureBreakdownDetailCacheLoaded();
    }

    private computeBreakdownCacheKey(): string {
        const names = (this.departmentIncomeData || [])
            .map((d) => String(d.DepartmentName || "").trim())
            .filter(Boolean);
        return JSON.stringify({
            diagnosis: this.selectedDiagnosis || "",
            filters: this.buildIncomeFilterRequest(),
            depts: names,
        });
    }

    private invalidateBreakdownDetailCache(): void {
        this.breakdownDetailRawResults = null;
        this.breakdownDetailCacheKey = null;
        if (this.graphToolbarDimensionMode !== "total") {
            this.clearDimensionalChartDisplay();
        }
    }

    private clearDimensionalChartDisplay(): void {
        this.dimensionalChartColumns = [];
        this.dimensionalChartData = [];
        this.dimensionalChartOptions = {};
    }

    /**
     * מטמון פילוח גרף — רק מנתוני GetDepartmentIncomeByDiagnosis (אין GetDepartmentDetailedData).
     * החלפת כפתור מצב גרף לא מפעילה רשת.
     */
    private ensureBreakdownDetailCacheLoaded(): void {
        if (
            this.graphToolbarDimensionMode === "total" ||
            this.graphToolbarDimensionMode === "departmentMonthly"
        ) {
            return;
        }
        if (!this.departmentIncomeData?.length) {
            this.clearDimensionalChartDisplay();
            this.breakdownDetailRawResults = null;
            this.breakdownDetailCacheKey = null;
            this.isBreakdownChartsLoading = false;
            this.cdr.detectChanges();
            return;
        }
        if (
            this.breakdownDetailRawResults &&
            this.breakdownDetailCacheKey === this.computeBreakdownCacheKey()
        ) {
            this.applyActiveDimensionChartFromCache();
            this.syncBreakdownChartTheme();
            this.isBreakdownChartsLoading = false;
            this.scheduleChartResize();
            this.cdr.detectChanges();
            return;
        }

        if (!this.diagnosisApiRawRows.length) {
            this.breakdownDetailRawResults = null;
            this.breakdownDetailCacheKey = null;
            this.clearDimensionalChartDisplay();
            this.isBreakdownChartsLoading = false;
            this.cdr.detectChanges();
            return;
        }

        const ordered = this.departmentIncomeData
            .map((d) => String(d.DepartmentName || "").trim())
            .filter(Boolean);
        const slice = ordered.slice(0, this.maxBreakdownDepartments);
        if (ordered.length > slice.length) {
            this.snackBar.open(
                `במצב פילוח מוצגות ${slice.length} מחלקות ראשונות (סדר הטבלה)`,
                "סגור",
                { duration: 4500 },
            );
        }

        const byDept = new Map<string, DepartmentComparisonDto[]>();
        for (const r of this.diagnosisApiRawRows) {
            const d = String(r.DepartmentName || "").trim();
            if (!d) {
                continue;
            }
            if (!byDept.has(d)) {
                byDept.set(d, []);
            }
            byDept.get(d)!.push(r);
        }

        const results = slice.map((departmentName) => ({
            departmentName,
            rows: this.comparisonRowsToPivotRows(
                byDept.get(departmentName) || [],
            ) as DepartmentDetailedDataDto[],
        }));

        this.breakdownDetailRawResults = results;
        this.breakdownDetailCacheKey = this.computeBreakdownCacheKey();
        this.isBreakdownChartsLoading = false;
        this.applyActiveDimensionChartFromCache();
        this.syncBreakdownChartTheme();
        this.scheduleChartResize();
        this.cdr.detectChanges();
    }

    private normalizeDiagnosisComparisonRows(
        raw: any[],
    ): DepartmentComparisonDto[] {
        const out: DepartmentComparisonDto[] = [];
        for (const item of raw) {
            const DepartmentName = String(item?.DepartmentName ?? "").trim();
            if (!DepartmentName) {
                continue;
            }
            const yearlyIncome = this.parseYearlyIncomeMap(
                item?.YearlyIncome ?? item?.yearlyIncome,
            );
            const row: DepartmentComparisonDto = {
                DepartmentName,
                Year4: 0,
                Year3: 0,
                Year2: 0,
                Year1: 0,
                CurrentYear: 0,
                Income2024: 0,
                Income2025: 0,
                YearlyIncome:
                    Object.keys(yearlyIncome).length > 0
                        ? yearlyIncome
                        : undefined,
            };
            if (Object.keys(yearlyIncome).length > 0) {
                this.applyYearlyIncomeToRowFiveYearFields(row, yearlyIncome);
            } else {
                row.Year4 = this.toNumber(item?.Year4);
                row.Year3 = this.toNumber(item?.Year3);
                row.Year2 = this.toNumber(item?.Year2);
                row.Year1 = this.toNumber(item?.Year1 ?? item?.Income2024);
                row.CurrentYear = this.toNumber(
                    item?.CurrentYear ?? item?.Income2025,
                );
                this.syncDepartmentRowFiveYearAliases(row);
            }
            const ic = item?.IncomeCategory;
            if (ic != null && String(ic).trim()) {
                row.IncomeCategory = String(ic).trim();
            }
            const org = item?.Organization;
            if (org != null && String(org).trim()) {
                row.Organization = String(org).trim();
            }
            const uc = item?.UnifiedCategory;
            if (uc != null && String(uc).trim()) {
                row.UnifiedCategory = String(uc).trim();
            }
            const mu = item?.MedicalUnitIncome;
            if (mu != null && String(mu).trim()) {
                row.MedicalUnitIncome = String(mu).trim();
            }
            const sub = item?.SubMedicalUnitDescription;
            if (sub != null && String(sub).trim()) {
                row.SubMedicalUnitDescription = String(sub).trim();
            }
            out.push(row);
        }
        this.syncFiveYearEndYearFromDiagnosisRows(out);
        return out;
    }

    /** YearlyIncome מ־API (Dictionary) → מפת שנה→סכום */
    private parseYearlyIncomeMap(raw: unknown): Record<string, number> {
        if (raw == null) {
            return {};
        }
        let source: unknown = raw;
        if (typeof source === "string") {
            try {
                source = JSON.parse(source);
            } catch {
                return {};
            }
        }
        if (typeof source !== "object" || Array.isArray(source)) {
            return {};
        }
        const out: Record<string, number> = {};
        for (const [key, val] of Object.entries(
            source as Record<string, unknown>,
        )) {
            const year = String(key ?? "").trim();
            if (!/^\d{4}$/.test(year)) {
                continue;
            }
            out[year] = this.toNumber(val);
        }
        return out;
    }

    private getSortedYearlyIncomeYears(map: Record<string, number>): number[] {
        return Object.keys(map)
            .map((y) => parseInt(y, 10))
            .filter((y) => Number.isFinite(y) && y >= 1900 && y <= 2100)
            .sort((a, b) => a - b);
    }

    /** ממפה YearlyIncome לשדות Year4…CurrentYear (5 השנים האחרונות) */
    private applyYearlyIncomeToRowFiveYearFields(
        row: DepartmentComparisonDto,
        yearlyIncome: Record<string, number>,
    ): void {
        const years = this.getSortedYearlyIncomeYears(yearlyIncome);
        const lastFive = years.slice(-5);
        for (let i = 0; i < this.fiveYearFieldKeys.length; i++) {
            const field = this.fiveYearFieldKeys[i];
            const year = lastFive[i];
            (row as any)[field] =
                year != null ? this.toNumber(yearlyIncome[String(year)]) : 0;
        }
        row.YearlyIncome = { ...yearlyIncome };
        this.syncDepartmentRowFiveYearAliases(row);
    }

    /** קובע שנת סיום לתוויות לפי YearlyIncome מהשרת */
    private syncFiveYearEndYearFromDiagnosisRows(
        rows: DepartmentComparisonDto[],
    ): void {
        let maxYear = 0;
        for (const row of rows) {
            const years = this.getSortedYearlyIncomeYears(
                row.YearlyIncome ?? {},
            );
            if (years.length) {
                maxYear = Math.max(maxYear, years[years.length - 1]);
            }
        }
        if (maxYear >= 1900 && maxYear <= 2100) {
            this.setFiveYearEndYear(maxYear);
        }
    }

    /** סכימה לטבלה / גרף סה״כ — שורה אחת למחלקה */
    private aggregateDepartmentRowsForTable(
        rows: DepartmentComparisonDto[],
    ): DepartmentComparisonDto[] {
        const m = new Map<
            string,
            {
                Year4: number;
                Year3: number;
                Year2: number;
                Year1: number;
                CurrentYear: number;
                YearlyIncome: Record<string, number>;
            }
        >();
        for (const r of rows) {
            const name = String(r.DepartmentName || "").trim();
            if (!name) {
                continue;
            }
            const prev = m.get(name);
            if (!prev) {
                m.set(name, {
                    Year4: this.getRowFiveYearValue(r, "Year4"),
                    Year3: this.getRowFiveYearValue(r, "Year3"),
                    Year2: this.getRowFiveYearValue(r, "Year2"),
                    Year1: this.getRowFiveYearValue(r, "Year1"),
                    CurrentYear: this.getRowFiveYearValue(r, "CurrentYear"),
                    YearlyIncome: { ...(r.YearlyIncome ?? {}) },
                });
            } else {
                prev.Year4 += this.getRowFiveYearValue(r, "Year4");
                prev.Year3 += this.getRowFiveYearValue(r, "Year3");
                prev.Year2 += this.getRowFiveYearValue(r, "Year2");
                prev.Year1 += this.getRowFiveYearValue(r, "Year1");
                prev.CurrentYear += this.getRowFiveYearValue(r, "CurrentYear");
                for (const [year, val] of Object.entries(
                    r.YearlyIncome ?? {},
                )) {
                    prev.YearlyIncome[year] =
                        (prev.YearlyIncome[year] || 0) + this.toNumber(val);
                }
            }
        }
        return Array.from(m.entries()).map(([DepartmentName, v]) => {
            const row: DepartmentComparisonDto = {
                DepartmentName,
                Year4: v.Year4,
                Year3: v.Year3,
                Year2: v.Year2,
                Year1: v.Year1,
                CurrentYear: v.CurrentYear,
                Income2024: v.Year1,
                Income2025: v.CurrentYear,
                YearlyIncome:
                    Object.keys(v.YearlyIncome).length > 0
                        ? v.YearlyIncome
                        : undefined,
            };
            return row;
        });
    }

    /** המרה לצורת שורת פיבוט ש־applyIncomeFiltersForPivotRows / getDetailedLatestCash מבינים */
    private comparisonRowsToPivotRows(rows: DepartmentComparisonDto[]): any[] {
        return rows.map((r) => {
            const o: any = {
                DepartmentName: r.DepartmentName,
            };
            const yearly = r.YearlyIncome ?? {};
            if (Object.keys(yearly).length > 0) {
                for (const [year, val] of Object.entries(yearly)) {
                    o[`Cash${year}`] = this.toNumber(val);
                }
            } else {
                const latestYear = this.getLatestYearFromDeptData();
                const y = parseInt(String(latestYear || "").trim(), 10);
                const iPrior = this.getRowFiveYearValue(r, "Year1");
                const iLatest = this.getRowFiveYearValue(r, "CurrentYear");
                o.Cash2024 = iPrior;
                o.Cash2025 = iLatest;
                if (Number.isFinite(y)) {
                    o[`Cash${y - 1}`] = iPrior;
                    o[`Cash${y}`] = iLatest;
                }
                for (let i = 0; i < this.fiveYearFieldKeys.length; i++) {
                    const label = this.getFiveYearLabels()[i];
                    if (label) {
                        o[`Cash${label}`] = this.getRowFiveYearValue(
                            r,
                            this.fiveYearFieldKeys[i],
                        );
                    }
                }
            }
            if (r.UnifiedCategory != null) {
                o.UnifiedCategory = r.UnifiedCategory;
                o.unifiedCategory = r.UnifiedCategory;
                o.UnifiedDiagnosis = r.UnifiedCategory;
                o.unifiedDiagnosis = r.UnifiedCategory;
            }
            if (r.Organization != null) {
                o.Organization = r.Organization;
                o.organization = r.Organization;
                o.FundCountry = r.Organization;
                o.fundCountry = r.Organization;
            }
            if (r.IncomeCategory != null) {
                o.IncomeCategory = r.IncomeCategory;
                o.incomeCategory = r.IncomeCategory;
            }
            if (r.MedicalUnitIncome != null) {
                o.MedicalUnitIncome = r.MedicalUnitIncome;
                o.medicalUnitIncome = r.MedicalUnitIncome;
                o.MedicalUnit_Income = r.MedicalUnitIncome;
                o.medicalUnit_Income = r.MedicalUnitIncome;
            }
            return o;
        });
    }

    /** בונה את הגרף הפעיל מהמטמון — ללא רשת */
    private applyActiveDimensionChartFromCache(): void {
        if (
            !this.breakdownDetailRawResults?.length ||
            this.graphToolbarDimensionMode === "total"
        ) {
            this.clearDimensionalChartDisplay();
            return;
        }

        const slice = this.breakdownDetailRawResults.map(
            (r) => r.departmentName,
        );
        const latestYear = this.getLatestYearFromDeptData() || "";

        if (this.graphToolbarDimensionMode === "unifiedCategory") {
            const agg = new Map<string, Map<string, number>>();
            const fields = [
                "UnifiedDiagnosis",
                "unifiedDiagnosis",
                "UnifiedCategory",
                "unifiedCategory",
            ];
            const segments = this.getUnifiedCategoryBreakdownSegments();
            for (const d of slice) {
                agg.set(d, new Map());
            }
            for (const { departmentName, rows } of this
                .breakdownDetailRawResults) {
                const filtered = this.applyIncomeFiltersForPivotRows(rows, {
                    unified: true,
                });
                for (const row of filtered) {
                    const v = this.getDetailedLatestCash(row as any);
                    const raw =
                        this.getFirstNonEmptyString(row as any, fields) || "";
                    const seg = this.mapRowValueToFilterOption(raw, segments);
                    if (seg) {
                        this.addBreakdownSegment(agg, departmentName, seg, v);
                    }
                }
            }
            const built = this.buildGroupedBreakdownModel(
                agg,
                slice,
                segments,
                this.buildBreakdownChartTitle(
                    "סוג פעילות",
                    latestYear,
                    this.selectedUnifiedCategory,
                ),
            );
            this.dimensionalChartColumns = [...built.columns];
            this.dimensionalChartData = built.data.map((row) => [...row]);
            this.dimensionalChartOptions = { ...built.options };
            return;
        }

        if (this.graphToolbarDimensionMode === "organization") {
            const agg = new Map<string, Map<string, number>>();
            const fields = [
                "Organization",
                "organization",
                "FundCountry",
                "fundCountry",
            ];
            const segments = this.getOrganizationBreakdownSegments();
            for (const d of slice) {
                agg.set(d, new Map());
            }
            for (const { departmentName, rows } of this
                .breakdownDetailRawResults) {
                const filtered = this.applyIncomeFiltersForPivotRows(rows, {
                    organization: true,
                });
                for (const row of filtered) {
                    const v = this.getDetailedLatestCash(row as any);
                    const raw =
                        this.getFirstNonEmptyString(row as any, fields) || "";
                    const seg = this.mapRowValueToFilterOption(raw, segments);
                    if (seg) {
                        this.addBreakdownSegment(agg, departmentName, seg, v);
                    }
                }
            }
            const built = this.buildGroupedBreakdownModel(
                agg,
                slice,
                segments,
                this.buildBreakdownChartTitle(
                    "קרן / מדינה",
                    latestYear,
                    this.selectedOrganization,
                ),
            );
            this.dimensionalChartColumns = [...built.columns];
            this.dimensionalChartData = built.data.map((row) => [...row]);
            this.dimensionalChartOptions = { ...built.options };
        }
    }

    hasRenderableDimensionalChart(): boolean {
        return (
            this.graphToolbarDimensionMode !== "total" &&
            (this.dimensionalChartData?.length ?? 0) > 0
        );
    }

    private getDetailedLatestCash(row: any): number {
        const yStr = this.getLatestYearFromDeptData();
        const y = parseInt(String(yStr || "").trim(), 10);
        if (Number.isFinite(y) && row != null) {
            const dyn = row[`Cash${y}`];
            if (dyn !== undefined && dyn !== null && dyn !== "") {
                return this.toNumber(dyn);
            }
        }
        return this.toNumber(row?.Cash2025 ?? row?.Cash2024);
    }

    private addBreakdownSegment(
        agg: Map<string, Map<string, number>>,
        dept: string,
        segment: string,
        value: number,
    ): void {
        if (!dept || !Number.isFinite(value) || value === 0) {
            return;
        }
        if (!agg.has(dept)) {
            agg.set(dept, new Map());
        }
        const m = agg.get(dept)!;
        m.set(segment, (m.get(segment) || 0) + value);
    }

    /** כמו רשימת «סוג פעילות» במסנן (ללא «הכל»); מצמצם לערך נבחר כשיש פילטר פעיל */
    private getUnifiedCategoryBreakdownSegments(): string[] {
        const all = this.unifiedCategoryOptions.filter(
            (o) => o && String(o).trim() && o !== this.incomeFilterAllValue,
        );
        if (this.selectedUnifiedCategory !== this.incomeFilterAllValue) {
            return [this.selectedUnifiedCategory];
        }
        return all;
    }

    /** כמו רשימת «קרן / מדינה» במסנן (ללא «הכל»); מצמצם לערך נבחר כשיש פילטר פעיל */
    private getOrganizationBreakdownSegments(): string[] {
        const all = this.organizationOptions.filter(
            (o) => o && String(o).trim() && o !== this.incomeFilterAllValue,
        );
        if (this.selectedOrganization !== this.incomeFilterAllValue) {
            return [this.selectedOrganization];
        }
        return all;
    }

    /**
     * ממפה ערך שורה לערך מהרשת — התאמה מדויקת או נפילה ל־«אחר» אם קיים ברשת.
     */
    private mapRowValueToFilterOption(
        raw: string,
        segmentOrder: string[],
    ): string | null {
        if (!segmentOrder.length) {
            return null;
        }
        const k = String(raw ?? "").trim();
        if (k && segmentOrder.includes(k)) {
            return k;
        }
        for (const opt of segmentOrder) {
            if (
                opt &&
                k &&
                opt.localeCompare(k, "he", { sensitivity: "base" }) === 0
            ) {
                return opt;
            }
        }
        if (segmentOrder.includes("אחר")) {
            return "אחר";
        }
        return null;
    }

    /**
     * גרף עמודות מקובצות: לכל מחלקה עמודה נפרדת לכל ערך מסנן (לא מוערם).
     */
    private buildGroupedBreakdownModel(
        agg: Map<string, Map<string, number>>,
        deptOrder: string[],
        segmentOrder: string[],
        title: string,
    ): { columns: any[]; data: any[][]; options: any } {
        if (!segmentOrder.length) {
            return { columns: [], data: [], options: {} };
        }

        let anyVal = false;
        for (const d of deptOrder) {
            const m = agg.get(d);
            if (!m) {
                continue;
            }
            for (const v of m.values()) {
                if (v >= this.breakdownChartMinCash) {
                    anyVal = true;
                    break;
                }
            }
            if (anyVal) {
                break;
            }
        }
        if (!anyVal) {
            return { columns: [], data: [], options: {} };
        }

        const columns: any[] = ["מחלקה"];
        for (const label of segmentOrder) {
            columns.push({ type: "number", label });
            columns.push({ type: "string", role: "annotation" });
        }
        const data: any[][] = [];

        for (const dept of deptOrder) {
            const m = agg.get(dept) || new Map();
            const row: any[] = [dept];
            let rowHasChartValue = false;
            for (const seg of segmentOrder) {
                const raw = m.get(seg) || 0;
                if (raw < this.breakdownChartMinCash) {
                    row.push(null);
                    row.push("");
                    continue;
                }
                const vM = parseFloat((raw / 1_000_000).toFixed(2));
                row.push(vM);
                row.push(this.formatMillionAnnotationLabel(vM));
                rowHasChartValue = true;
            }
            if (rowHasChartValue) {
                data.push(row);
            }
        }

        if (!data.length) {
            return { columns: [], data: [], options: {} };
        }

        const n = segmentOrder.length;
        const options: any = {
            title,
            isStacked: false,
            titleTextStyle: {
                color: "#0f172a",
                fontSize: 14,
                bold: true,
            },
            annotations: {
                alwaysOutside: true,
                stem: { color: "transparent", length: 3 },
                textStyle: {
                    fontSize: 10,
                    bold: true,
                    color: "#334155",
                    fontName: "Segoe UI, sans-serif",
                },
            },
            chartArea: {
                width: "86%",
                height: "48%",
                left: 52,
                top: 52,
            },
            hAxis: {
                title: "",
                slantedText: true,
                slantedTextAngle: 35,
                textStyle: { color: "#64748b", fontSize: 10 },
            },
            vAxis: {
                title: "הכנסות (מיליוני ₪)",
                minValue: 0,
                format: "0.0",
                textStyle: { color: "#64748b", fontSize: 10 },
                titleTextStyle: {
                    color: "#0f172a",
                    fontSize: 11,
                    bold: true,
                },
            },
            legend: {
                position: "bottom",
                alignment: "center",
                maxLines: 4,
                textStyle: { color: "#64748b", fontSize: 10 },
            },
            colors: this.breakdownPalette.slice(0, n),
            backgroundColor: {
                fill: "transparent",
                stroke: "transparent",
                strokeWidth: 0,
            },
            tooltip: {
                isHtml: true,
                textStyle: { fontSize: 12 },
                showColorCode: true,
            },
            focusTarget: "category",
            animation: { startup: false, duration: 0, easing: "out" },
            bar: { groupWidth: n > 3 ? "70%" : "52%" },
        };

        return { columns, data, options };
    }

    private buildBreakdownChartTitle(
        dimensionLabel: string,
        latestYear: string,
        selectedFilter: string,
    ): string {
        const yearPart = latestYear ? ` (${latestYear})` : "";
        if (selectedFilter && selectedFilter !== this.incomeFilterAllValue) {
            return `${dimensionLabel}${yearPart} — ${selectedFilter}`;
        }
        return `${dimensionLabel}${yearPart} — לפי אפשרויות המסנן`;
    }

    /** תווית מעל עמודה בגרף (מיליוני ₪) — ריק אם אין ערך להצגה */
    private formatMillionAnnotationLabel(valueM: number): string {
        if (!Number.isFinite(valueM) || valueM <= 0) {
            return "";
        }
        return `${parseFloat(valueM.toFixed(2))} מ׳`;
    }

    private syncBreakdownChartTheme(): void {
        const patch = (opt: any): any => {
            if (!opt || typeof opt !== "object") {
                return opt;
            }
            const isDark = this.isDark;
            const axisText = isDark ? "#e5e7eb" : "#64748b";
            const titleC = isDark ? "#f9fafb" : "#0f172a";
            const leg = isDark ? "#e5e7eb" : "#64748b";
            return {
                ...opt,
                titleTextStyle: {
                    ...(opt.titleTextStyle || {}),
                    color: titleC,
                    fontSize: opt.titleTextStyle?.fontSize ?? 14,
                    bold: true,
                },
                hAxis: {
                    ...(opt.hAxis || {}),
                    textStyle: {
                        ...(opt.hAxis?.textStyle || {}),
                        color: axisText,
                    },
                    titleTextStyle: {
                        ...(opt.hAxis?.titleTextStyle || {}),
                        color: titleC,
                    },
                },
                vAxis: {
                    ...(opt.vAxis || {}),
                    textStyle: {
                        ...(opt.vAxis?.textStyle || {}),
                        color: axisText,
                    },
                    titleTextStyle: {
                        ...(opt.vAxis?.titleTextStyle || {}),
                        color: titleC,
                    },
                },
                legend: {
                    ...(opt.legend || {}),
                    position: "bottom",
                    textStyle: {
                        ...(opt.legend?.textStyle || {}),
                        color: leg,
                    },
                },
                backgroundColor: isDark
                    ? {
                          fill: "#0f172a",
                          stroke: "rgba(255, 255, 255, 0.15)",
                          strokeWidth: 1,
                      }
                    : {
                          fill: "#ffffff",
                          stroke: "#dddddd",
                          strokeWidth: 1,
                      },
                tooltip: {
                    ...(opt.tooltip || {}),
                    textStyle: {
                        ...(opt.tooltip?.textStyle || {}),
                        color: isDark ? "#f9fafb" : "#0f172a",
                    },
                },
                annotations: {
                    ...(opt.annotations || {}),
                    alwaysOutside:
                        opt.annotations?.alwaysOutside !== undefined
                            ? opt.annotations.alwaysOutside
                            : true,
                    stem: {
                        ...(opt.annotations?.stem || {}),
                        color: opt.annotations?.stem?.color ?? "transparent",
                    },
                    textStyle: {
                        ...(opt.annotations?.textStyle || {}),
                        color: isDark ? "#f9fafb" : "#334155",
                        fontSize: opt.annotations?.textStyle?.fontSize ?? 10,
                        bold: opt.annotations?.textStyle?.bold !== false,
                    },
                },
            };
        };

        if (this.dimensionalChartOptions) {
            this.dimensionalChartOptions = patch(this.dimensionalChartOptions);
        }
    }

    /**
     * מחזיר את שנת הלוח לפי "כמה שנים לאחור" מהשנה הנוכחית.
     * @param yearsAgo 0 = השנה הנוכחית, 1 = שנה שעברה, 2 = לפני שנתיים וכו'
     */
    getFullYear(yearsAgo: number): string {
        const current = new Date().getFullYear();
        if (yearsAgo == null || yearsAgo === 0) {
            return current.toString();
        }
        return (current - yearsAgo).toString();
    }

    private syncBodyDarkClass(): void {
        if (this.isDark) {
            document.body.classList.add("department-dashboard-dark");
        } else {
            document.body.classList.remove("department-dashboard-dark");
        }
    }

    private getIncomeChartTooltipHost() {
        return {
            isDark: this.isDark,
            graphPrimaryView: this.graphPrimaryView,
            formatNumber: (n: number) => this.formatNumber(n),
        };
    }

    private applyFiveYearChartColors(): void {
        if (!this.chartOptions) {
            return;
        }
        const n = this.getFiveYearLabels().length;
        this.chartOptions.colors = INCOME_DASHBOARD_YEAR_CHART_COLORS.slice(
            0,
            Math.max(n, 1),
        );
    }

    private finalizeChartOptionsRefresh(): void {
        if (this.chartOptions) {
            this.chartOptions.title = "";
        }
        this.chartOptions = { ...this.chartOptions };
        this.scheduleResponsiveChartLayout(this.graphBodyLastWidth || 720);
    }

    private initGraphResizeObserver(): void {
        const el = this.graphBodyRef?.nativeElement;
        const ResizeObserverCtor = (window as any).ResizeObserver as
            | (new (
                  callback: (
                      entries: Array<{ contentRect: { width: number } }>,
                  ) => void,
              ) => { disconnect(): void; observe(target: Element): void })
            | undefined;
        if (!el || !ResizeObserverCtor) {
            this.scheduleResponsiveChartLayout(720);
            return;
        }
        this.graphResizeObserver = new ResizeObserverCtor((entries) => {
            const width = entries[0]?.contentRect?.width ?? 0;
            if (width > 0) {
                this.scheduleResponsiveChartLayout(width);
            }
        });
        this.graphResizeObserver.observe(el);
        this.scheduleResponsiveChartLayout(el.clientWidth || 720);
    }

    private scheduleResponsiveChartLayout(width: number): void {
        this.graphBodyLastWidth = width;
        if (this.graphLayoutResizeTimer) {
            clearTimeout(this.graphLayoutResizeTimer);
        }
        this.graphLayoutResizeTimer = setTimeout(() => {
            this.graphLayoutResizeTimer = null;
            this.applyResponsiveChartLayout(width);
        }, 120);
    }

    private applyResponsiveChartLayout(width: number): void {
        if (!this.chartOptions || width <= 0) {
            return;
        }

        const viewportH = window.innerHeight || 800;
        const compactViewport = viewportH < 760;
        let axisFontSize = 11;
        let hAxisFontSize = 15;
        let legendFontSize = 13;
        let annotationFontSize = 10;
        let chartAreaLeft = 56;
        let chartAreaTop = 24;
        let chartAreaWidth = "90%";
        let chartAreaHeight = "68%";
        let slantedTextAngle = 35;
        let annotationsVisible = true;
        let legendPosition: "top" | "bottom" = "top";
        let chartHeight = 360;

        if (width < 420 || (compactViewport && width < 520)) {
            axisFontSize = 10;
            hAxisFontSize = 12;
            legendFontSize = 12;
            annotationFontSize = 0;
            chartAreaLeft = 40;
            chartAreaTop = 8;
            chartAreaWidth = "84%";
            chartAreaHeight = "62%";
            slantedTextAngle = 55;
            annotationsVisible = false;
            legendPosition = "bottom";
            chartHeight = Math.max(
                220,
                Math.min(260, Math.round(viewportH * 0.3)),
            );
        } else if (width < 640 || compactViewport) {
            axisFontSize = 10;
            hAxisFontSize = 13;
            legendFontSize = 13;
            annotationFontSize = 8;
            chartAreaLeft = 46;
            chartAreaTop = 12;
            chartAreaWidth = "86%";
            chartAreaHeight = "64%";
            slantedTextAngle = 45;
            annotationsVisible = false;
            legendPosition = "bottom";
            chartHeight = Math.max(
                260,
                Math.min(320, Math.round(viewportH * 0.34)),
            );
        } else if (width < 900) {
            axisFontSize = 11;
            hAxisFontSize = 14;
            legendFontSize = 13;
            chartAreaLeft = 52;
            chartAreaTop = 18;
            chartAreaWidth = "88%";
            chartAreaHeight = "66%";
            slantedTextAngle = 38;
            legendPosition = compactViewport ? "bottom" : "top";
            chartHeight = Math.max(
                300,
                Math.min(380, Math.round(viewportH * 0.38)),
            );
        } else {
            hAxisFontSize = 15;
            legendFontSize = 14;
            chartHeight = Math.max(
                340,
                Math.min(560, Math.round(viewportH * 0.42)),
            );
        }

        this.graphChartPixelWidth = Math.max(Math.round(width), 240);
        this.graphChartPixelHeight = chartHeight;

        const signature = [
            width < 420 ? "xs" : width < 640 ? "sm" : width < 900 ? "md" : "lg",
            compactViewport ? "cv" : "nv",
            annotationsVisible ? "ann" : "noann",
            legendPosition,
            chartHeight,
            hAxisFontSize,
        ].join("|");
        if (signature === this.graphLayoutSignature) {
            return;
        }
        this.graphLayoutSignature = signature;

        this.chartOptions = {
            ...this.chartOptions,
            title: "",
            hAxis: {
                ...(this.chartOptions.hAxis || {}),
                slantedText: true,
                slantedTextAngle,
                showTextEvery: width < 420 ? 2 : 1,
                textStyle: {
                    ...(this.chartOptions.hAxis?.textStyle || {}),
                    fontSize: hAxisFontSize,
                    bold: true,
                    fontName: "Segoe UI",
                    color: this.isDark ? "#f9fafb" : "#0f172a",
                },
            },
            vAxis: {
                ...(this.chartOptions.vAxis || {}),
                textStyle: {
                    ...(this.chartOptions.vAxis?.textStyle || {}),
                    fontSize: axisFontSize,
                },
                titleTextStyle: {
                    ...(this.chartOptions.vAxis?.titleTextStyle || {}),
                    fontSize: Math.max(axisFontSize, 10),
                },
            },
            legend: {
                ...(this.chartOptions.legend || {}),
                position: legendPosition,
                alignment: legendPosition === "bottom" ? "center" : "end",
                maxLines: width < 640 ? 3 : 2,
                textStyle: {
                    ...(this.chartOptions.legend?.textStyle || {}),
                    fontSize: legendFontSize,
                    bold: true,
                    fontName: "Segoe UI",
                    color: this.isDark ? "#e5e7eb" : "#0f172a",
                },
            },
            chartArea: {
                ...(this.chartOptions.chartArea || {}),
                left: chartAreaLeft,
                top: chartAreaTop,
                width: chartAreaWidth,
                height: chartAreaHeight,
            },
            annotations: {
                ...(this.chartOptions.annotations || {}),
                alwaysOutside: true,
                textStyle: {
                    ...(this.chartOptions.annotations?.textStyle || {}),
                    fontSize: annotationsVisible ? annotationFontSize : 0,
                },
            },
        };
        this.cdr.markForCheck();
    }

    private applyIncomeChartHtmlTooltips(): void {
        if (
            (this.chartOptions as any)?.tooltip === "none" ||
            (this.chartOptions as any)?.tooltip?.trigger === "none"
        ) {
            return;
        }
        if (!this.chartColumns?.length || !this.chartData?.length) {
            return;
        }
        const host = this.getIncomeChartTooltipHost();
        const p = patchIncomeGoogleChartHtmlTooltips(
            host,
            this.chartColumns,
            this.chartData,
            this.chartOptions,
            getIncomeChartTooltipContext(host),
        );
        this.chartColumns = p.columns;
        this.chartData = p.data;
        this.chartOptions = p.options;
    }

    /**
     * Update chart colors and styles based on theme
     */
    updateChartTheme(): void {
        if (this.isDark) {
            // Dark theme: force all chart texts (axes, legend, annotations, tooltip) to bright color
            this.chartOptions.titleTextStyle = {
                ...this.chartOptions.titleTextStyle,
                color: "#f9fafb",
            };
            this.chartOptions.hAxis = {
                ...(this.chartOptions.hAxis || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.hAxis?.textStyle?.fontSize ?? 14,
                    bold: true,
                    fontName: "Segoe UI",
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.hAxis?.titleTextStyle?.fontSize ?? 11,
                    bold: true,
                },
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.vAxis?.textStyle?.fontSize ?? 11,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.vAxis?.titleTextStyle?.fontSize ?? 12,
                    bold: true,
                },
                gridlines: {
                    color: "rgba(148, 163, 184, 0.45)",
                },
            };
            this.chartOptions.legend = {
                ...(this.chartOptions.legend || {}),
                textStyle: {
                    color: "#e5e7eb",
                    fontSize:
                        this.chartOptions.legend?.textStyle?.fontSize ?? 13,
                    bold: true,
                    fontName: "Segoe UI",
                },
            };
            this.chartOptions.annotations = {
                ...(this.chartOptions.annotations || {}),
                alwaysOutside: true,
                textStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.annotations?.textStyle?.fontSize ??
                        10,
                    bold: true,
                },
            };
            this.chartOptions.tooltip = {
                ...(this.chartOptions.tooltip || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.tooltip?.textStyle?.fontSize ?? 12,
                },
            };
            this.chartOptions.backgroundColor = {
                fill: "#0f172a",
                stroke: "rgba(255, 255, 255, 0.15)",
                strokeWidth: 1,
            };
            this.applyFiveYearChartColors();
        } else {
            // Light theme colors
            this.chartOptions.titleTextStyle = {
                ...this.chartOptions.titleTextStyle,
                color: "#333",
            };
            this.chartOptions.hAxis = {
                ...this.chartOptions.hAxis,
                textStyle: {
                    ...this.chartOptions.hAxis?.textStyle,
                    color: "#0f172a",
                    bold: true,
                    fontName: "Segoe UI",
                },
                titleTextStyle: {
                    ...this.chartOptions.hAxis?.titleTextStyle,
                    color: "#333",
                },
            };
            this.chartOptions.vAxis = {
                ...this.chartOptions.vAxis,
                textStyle: {
                    ...this.chartOptions.vAxis?.textStyle,
                    color: "#555",
                },
                titleTextStyle: {
                    ...this.chartOptions.vAxis?.titleTextStyle,
                    color: "#333",
                },
            };
            this.chartOptions.legend = {
                ...this.chartOptions.legend,
                textStyle: {
                    ...this.chartOptions.legend?.textStyle,
                    color: "#0f172a",
                    bold: true,
                    fontName: "Segoe UI",
                },
            };
            this.chartOptions.annotations = {
                ...this.chartOptions.annotations,
                alwaysOutside: true,
                textStyle: {
                    ...this.chartOptions.annotations?.textStyle,
                    color: "#333",
                },
            };
            this.chartOptions.tooltip = {
                ...this.chartOptions.tooltip,
                textStyle: {
                    ...this.chartOptions.tooltip?.textStyle,
                    color: "#333",
                },
            };
            this.chartOptions.backgroundColor = {
                fill: "#ffffff",
                stroke: "#ddd",
                strokeWidth: 1,
            };
            this.applyFiveYearChartColors();
        }
        this.chartOptions = { ...this.chartOptions };
        if (
            this.chartData?.length &&
            !this.isChartLoading &&
            !this.isMainDataLoading &&
            !this.isPayerYearlyLoading
        ) {
            this.applyIncomeChartHtmlTooltips();
        }
        this.syncBreakdownChartTheme();
        this.graphLayoutSignature = "";
        this.scheduleResponsiveChartLayout(
            this.graphBodyLastWidth ||
                this.graphBodyRef?.nativeElement?.clientWidth ||
                720,
        );
        this.cdr.detectChanges();
    }

    /**
     * Handle chart click event
     * When user clicks on a bar in the chart, show department details
     */
    onChartClick(event: any): void {
        if (this.graphPrimaryView === "payer") {
            return;
        }
        this.handleDeptRowChartSelection(event, this.chartData);
    }

    onDimensionalChartClick(event: any): void {
        this.handleDeptRowChartSelection(event, this.dimensionalChartData);
    }

    private handleDeptRowChartSelection(
        event: any,
        rows: any[][] | null | undefined,
    ): void {
        try {
            let selectedRow: number | null = null;

            if (
                event &&
                event.selection &&
                Array.isArray(event.selection) &&
                event.selection.length > 0
            ) {
                selectedRow = event.selection[0].row;
            } else if (event && event.row !== undefined) {
                selectedRow = event.row;
            } else if (Array.isArray(event) && event.length > 0) {
                selectedRow = event[0].row;
            }

            if (selectedRow !== null && selectedRow !== undefined && rows) {
                if (rows.length > selectedRow) {
                    const departmentName = rows[selectedRow][0];
                    if (departmentName) {
                        this.loadDepartmentSpecificGraph(
                            String(departmentName),
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Error handling chart click:", error);
        }
    }
    isDropdownOpen = false;

    toggleDropdown() {
        if (!this.isDiagnosesLoading && this.diagnosesList.length > 0) {
            this.isDropdownOpen = !this.isDropdownOpen;
        }
    }

    selectOption(option: any) {
        this.selectedDiagnosis = option;
        this.isDropdownOpen = false;
        this.onDiagnosisChange({ value: option }); // קריאה לפונקציה הקיימת שלך
    }
}
