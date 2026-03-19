import { animate, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Chart } from 'chart.js';
import { environment } from "src/environments/environment";
import { MenuPerm } from "../menu-perm";


/** שורת נתוני ניתוח כפי שחוזרת מהשרת (שדות באנגלית) */
export interface SurgeryRow {
  date?: string;
  caseNumber?: string;
  surgeryNumber?: string;
  site?: string;
  surgeryRoom?: string;
  surgeryDurationMinutes?: number;
  surgeryType?: string;
  unifiedSurgeryType?: string;
  surgeon?: string;
  requestingUnit?: string;
  procedure?: string;
  totalAmount?: number;
  // שדות נוספים לפילטור
  shift?: string;
  department?: string;
  departmentMapped?: string;
  weekdayOrWeekend?: string;
  [key: string]: any;
}

export interface DepartmentComparisonDto {
  DepartmentName: string;
  Income2024: number;
  Income2025: number;
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

// מדדי זמן לפי מחלקה (קבוצה 2)
export interface DeptTimeMetricRow {
  departmentName: string;
  valueDisplay: string;
}

export interface AvgDurationRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgDurationMin: number;
  TotalDurationMin: number;
}

export interface AvgFirstEntryRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgEntryTime: string;    // HH:MM
  AvgEntryMinutes: number;
}

/**
 * Last-surgery end time API (GetAvgLastMorningEnd):
 * Average finish time of the last surgery in the morning shift per department.
 * Each row = Year + Site + Department + Wing.
 * Count / AvgEndMinutes / AvgEndTime = all days.
 * CountNoLateDays / AvgEndMinutesNoLateDays / AvgEndTimeNoLateDays = same metrics excluding days where last surgery finished after 15:00.
 * Default view → AvgEndTime. "Real average" toggle → AvgEndTimeNoLateDays. If CountNoLateDays === 0, fallback to regular average.
 */
export interface AvgLastEndRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgEndTime: string;      // HH:MM
  AvgEndMinutes: number;
  /** ימים שבהם הניתוח האחרון הסתיים אחרי 15:00 (לחישוב מקומי אם השרת לא שולח NoLateDays) */
  CountOverflowDaysOnly?: number;
  AvgEndMinutesOverflowDaysOnly?: number;
  AvgEndTimeOverflowDaysOnly?: string;
  /** ממוצע ללא ימים "מאוחרים" (הניתוח האחרון לא הסתיים אחרי 15:00) – כפתור "ממוצע אמיתי" */
  CountNoLateDays?: number;
  AvgEndMinutesNoLateDays?: number;
  AvgEndTimeNoLateDays?: string;
}

export interface AvgSetupRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgSetupMin: number;
}

/** ממוצע משך ניתוח (לפי שנה) לפי מחלקה – GetAvgDurationFiveYears */
export interface AvgDurationFiveYearsDto {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgDurationMin: number;
  AvgDurationHHMM: string;
  // Server may already return additional fields; keep optional for client-side filtering without breaking typing.
  Room?: string;
  SurgeryType?: string;
  Shift?: string;
  WeekendType?: string;
}

type AvgDurationSiteFilter = "ALL" | "חנ-כללי" | "חנ-אמבול" | "חנ-יולד" | "חנ-מחלקה" | "חנ-פהלסת";

/** זמן מנוצל/מאושר ממוצע (לפי שנה) לפי מחלקה – GetApprovedUtilization_surgeries_dashborad */
export interface ApprovedUtilizationDto {
  Year: number;
  Wing: string;
  Site: string;
  AvgApprovedMin: number;
  AvgApprovedHHMM: string;
}

/** ממוצע ניתוחים ליום בחדר (לפי שנה) לפי מחלקה – GetAvgSurgeriesPerDayPerRoomFiveYears */
export interface AvgSurgeriesPerDayPerRoomDto {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  /** ממוצע ניתוחים ליום בחדר עבור המחלקה/המחלקה המאוגדת */
  AvgSurgeries: number;
  /** מספר חדרים שונים שהוקצו במהלך התקופה */
  RoomsTotal: number;
  /** מספר הימים שבהם החדר היה פתוח (ראשון בוקר) */
  RoomsOpen: number;
  /** מספר הימים שבהם החדר נסגר (אחרון בוקר) */
  RoomsClose: number;
  /** מספר הימים המלאים (ללא פיצול) */
  FullDays: number;
}

/** זמן אבוד ליום לפי מחלקה ושנה – GetLossByWingYear_surgeries_dashborad */
export interface LossByWingYearDto {
  Year: number;
  Wing: string;
  /** זמן אבוד ליום בדקות – במידה והשרת שולח ערך מספרי */
  Loss: number | null;
  /** זמן אבוד ליום בפורמט HH:mm – במידה והשרת לא מחזיר Loss מספרי */
  AvgLossTime?: string | null;
  // Optional fields for client-side filtering
  Site?: string;
  Room?: string;
  SurgeryType?: string;
  Shift?: string;
  WeekendType?: string;
}

export interface TopDepartmentDto {
  DepartmentName: string;
  Income2024: number;
  Income2025: number;
  difference: number;
  percentage: number;
  managerName?: string;
}

/** השוואה YoY לפי מחלקה – ניתוחים לחדר, זמן ניתוח, הכנסה (ואחוזי שינוי) */
export interface DepartmentYoyDto {
  Department: string;
  SurgeriesPerRoom_Current: number;
  AvgSurgeryTime_Current: number;
  AvgRevenue_Current: number;
  SurgeriesPerRoom_Prev: number;
  AvgSurgeryTime_Prev: number;
  AvgRevenue_Prev: number;
  SurgeriesPerRoom_Pct?: number | null;
  AvgSurgeryTime_Pct?: number | null;
  AvgRevenue_Pct?: number | null;
}

// === New APIs – typed rows ===
export interface CountByDeptRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  MatchCount: number;
  MismatchCount: number;
  UnifiedSurgeryType?: string;
  Shift?: string;
  SurgeryRoom?: string;
  WeekPart?: string;
  FundType?: string; // ← חדש

}

export interface MonthlyCountRow {
  Year: number;
  Month: number; // 1–12
  Count: number;
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
    selector: "app-surgeries-dashborad",
    templateUrl: "./surgeries-dashborad.component.html",
    styleUrls: ["./surgeries-dashborad.component.css"],
    animations: [
        trigger("fadeInOut", [
            transition(":enter", [
                style({ opacity: 0, transform: "scale(0.95)" }),
                animate(
                    "300ms ease-in",
                    style({ opacity: 1, transform: "scale(1)" })
                ),
            ]),
            transition(":leave", [
                animate(
                    "300ms ease-out",
                    style({ opacity: 0, transform: "scale(0.95)" })
                ),
            ]),
        ]),
    ],
})
export class SurgeriesDashboradComponent implements OnInit, OnDestroy, DoCheck, AfterViewInit {
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild('yoyCombinedChart') yoyCombinedChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('yoyCombinedChartInline') yoyCombinedChartInlineRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('tableBodyEl') tableBodyEl?: ElementRef<HTMLDivElement>;

    showTableExtra = false;

    private yoyCombinedChart: Chart | null = null;
    private yoyCombinedInlineChart: Chart | null = null;

    // Guide Avatar
    showGuideAvatar = true;
    dontShowGuideAgain = false; // checkbox "אל תציג יותר"
    showArticleShowcase = false;
    currentArticle: string = "";

    /** מאזין רספונסיביות לגרף – טריגר לרינדור מחדש ב־resize */
    private onWindowResize = () => {
        try {
            this.chartOptions = { ...this.chartOptions };
            this.scheduleTableExtraCheck();
            this.scheduleYoyCombinedInlineBuild();
        } catch {
            // ignore
        }
    };

    // Data arrays
    departmentIncomeData: DepartmentComparisonDto[] = [];
    /** רשימת נתוני ניתוחים מהשרת (מבנה כפי שהמשתמש ציין) */
    surgeryData: SurgeryRow[] = [];
    departmentDetailedData: DepartmentDetailedDataDto[] = [];
    diagnosesList: string[] = [];
    yearlyTotalData: YearlyIncomeDto[] = [];
    topDepartments: TopDepartmentDto[] = [];

    // Aggregated counts by department from new API
    countByDeptData: CountByDeptRow[] = [];

    // Aggregated counts by month from new API
    monthlyCountsData: MonthlyCountRow[] = [];

    /** נתוני השוואה YoY לפי מחלקה (מדד משולב) */
    departmentYoyData: DepartmentYoyDto[] = [];

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

    /** נתוני הטבלה המייצגת את נתוני הגרף (כמו הגרף אבל בטבלה) */
    chartTableRows: {
        label: string;                              // שם ישות השורה (מחלקה / אתר / משמרת / סוג מימון / סה"כ / חודש)
        total: number;                              // סה"כ לכל השנים
        perYear: { [year: number]: number };        // כמות לכל שנה
        diff?: number;                              // הפרש בין השנה האחרונה לקודמת
        pct?: string;                               // אחוז שינוי בין השנה האחרונה לקודמת
        isFuture?: boolean;                         // לחודשים שטרם התרחשו בשנה הנוכחית – אין להציג הפרש/אחוז
    }[] = [];

    chartOptions: any = {
        title: "", // הכותרת מוצגת ב-.chart-mode-heading בלבד (getChartViewTitle())
        titleTextStyle: {
            fontSize: 20,
            bold: true,
            color: "#1e293b",
        },
        hAxis: {
            title: "",
            textStyle: {
                fontSize: 14,
                bold: true,
                color: "#334155",
            },
            titleTextStyle: {
                fontSize: 16,
                bold: true,
                italic: false,
            },
            // תוויות בציר X יוצגו אופקית כדי לראות את כל השנים (YYYY)
            // slantedText: false,
        },
        vAxis: {
            title: "מספר ניתוחים",
            minValue: 0,
            gridlines: {
                color: "#e2e8f0",
            },
            textStyle: {
                fontSize: 14,
                bold: true,
            },
            titleTextStyle: {
                fontSize: 16,
                bold: true,
                italic: false,
            },
        },
        bars: "vertical",
        legend: {
            position: "top",
            alignment: "end",
            textStyle: {
                fontSize: 14,
                bold: true,
            },
        },
        chartArea: {
            width: '90%',
            height: '60%', // הקטנו מ-78% כדי לתת מקום לטקסט למעלה
            left: 40,
            top: 50, // הגדלנו מ-12 כדי שהטקסט המסובב לא ייחתך
        },
        colors: ["#2563eb", "#10b981"],
        backgroundColor: {
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
        },
        dataOpacity: 0.95,
        // תוויות על העמודות – גדולות, קריאות ובתוך הגרף עצמו
        annotations: {
            // מאפשר להציב את הטקסט בתוך העמודה כשיש מספיק מקום
            alwaysOutside: false,
            textStyle: {
                fontSize: 16, // פונט גדול וברור על העמודות
                bold: true,

                // rotation: -90, // <--- להוסיף כאן
                // color: "#000000",
                // auraColor: "none",
            },
        },
        bar: {
            groupWidth: "55%",
        },
        tooltip: {
            isHtml: true,
            trigger: "focus",
            textStyle: {
                color: "#0f172a",
                fontSize: 16,
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

    /** סה"כ מכל הגרף הנוכחי (סכום totals של כל השורות בטבלת הגרף) */
    private getCurrentChartGrandTotal(): number {
        if (!this.chartTableRows || this.chartTableRows.length === 0) {
            return 0;
        }
        return this.chartTableRows.reduce((sum, row) => sum + (row.total || 0), 0);
    }

    /** שנת בסיס (הראשונה בציר השנים של הגרף / הטבלה) */
    get kpiBaseYear(): number | null {
        return this.yearsForChart && this.yearsForChart.length
            ? this.yearsForChart[0]
            : null;
    }

    /** השנה האחרונה המוצגת בגרף / בטבלה */
    get kpiLastYear(): number | null {
        return this.yearsForChart && this.yearsForChart.length
            ? this.yearsForChart[this.yearsForChart.length - 1]
            : null;
    }

    private getYearTotalSafe(year: number | null): number | null {
        if (year == null) {
            return null;
        }
        const totals = this.yearlySurgeryTotals || {};
        const value = totals[year];
        return typeof value === "number" ? value : null;
    }

    /** סה"כ ניתוחים בשנת הבסיס */
    get kpiBaseTotal(): number | null {
        return this.getYearTotalSafe(this.kpiBaseYear);
    }

    /** סה"כ ניתוחים בשנה האחרונה */
    get kpiLastTotal(): number | null {
        return this.getYearTotalSafe(this.kpiLastYear);
    }

    /** הפרש כמותי בין השנה האחרונה לשנת הבסיס */
    get kpiLastDiff(): number | null {
        const base = this.kpiBaseTotal;
        const last = this.kpiLastTotal;
        if (base == null || last == null) {
            return null;
        }
        return last - base;
    }

    /** אחוז שינוי בין השנה האחרונה לשנת הבסיס */
    get kpiLastDiffPct(): number | null {
        const base = this.kpiBaseTotal;
        const diff = this.kpiLastDiff;
        if (base == null || base === 0 || diff == null) {
            return null;
        }
        return (diff / base) * 100;
    }

    /** ישות מובילה בכמות ניתוחים בטבלה המצטברת (ללא חודשים עתידיים) */
    get kpiTopEntityLabel(): string | null {
        if (!this.chartTableRows || !this.chartTableRows.length) {
            return null;
        }
        const rows = this.chartTableRows
            .filter(r => !r.isFuture)
            .sort((a, b) => (b.total || 0) - (a.total || 0));
        return rows.length ? rows[0].label : null;
    }

    get kpiTopEntityTotal(): number | null {
        if (!this.chartTableRows || !this.chartTableRows.length) {
            return null;
        }
        const rows = this.chartTableRows
            .filter(r => !r.isFuture)
            .sort((a, b) => (b.total || 0) - (a.total || 0));
        return rows.length ? rows[0].total || 0 : null;
    }

    /** תובנות טקסטואליות לתצוגת ה‑table-extra מתחת לטבלה */
    get tableExtraInsights(): string[] {
        const insights: string[] = [];

        const baseYear = this.kpiBaseYear;
        const lastYear = this.kpiLastYear;
        const baseTotal = this.kpiBaseTotal;
        const lastTotal = this.kpiLastTotal;
        const pct = this.kpiLastDiffPct;

        if (
            baseYear != null &&
            lastYear != null &&
            baseTotal != null &&
            lastTotal != null &&
            pct != null
        ) {
            const direction = pct >= 0 ? "עלייה" : "ירידה";
            insights.push(
                `סה\"כ ניתוחים עלו מ־${baseTotal.toLocaleString("he-IL")} בשנת ${baseYear} ל־${lastTotal.toLocaleString("he-IL")} בשנת ${lastYear} (${direction} של ${pct.toFixed(1)}%).`
            );
        }

        const label = this.kpiTopEntityLabel;
        const total = this.kpiTopEntityTotal;
        if (label && total != null) {
            // When the "total" row is the top value, avoid calling it an "entity"
            if (label === 'סה"כ') {
                insights.push(
                    `סה\"כ הניתוחים בתצוגה הנוכחית הוא ${total.toLocaleString("he-IL")} ניתוחים בסך הכול.`
                );
            } else {
                insights.push(
                    `הישות המובילה בניתוחים בתצוגה הנוכחית היא \"${label}\" עם ${total.toLocaleString("he-IL")} ניתוחים בסך הכול.`
                );
            }
        }

        return insights;
    }

    yearsForChart: number[] = [];
    yearlySurgeryTotals: { [year: number]: number } = {};
    yearColorMap: { year: number; color: string }[] = [];
    stackedCategoryLegend: { label: string; color: string }[] = [];

    /** מדד מוצג לגרף חדרים לפי מחלקה: total / open / close / fullDays */
    roomStatsMetric: "total" | "open" | "close" | "fullDays" = "total";

    /** מצב תצוגה לגרף חדרים: לפי מחלקה (ברירת מחדל) או סה"כ חדרים לשנה */
    roomStatsViewMode: "byWing" | "yearTotal" = "byWing";

    private readonly orderedWings: string[] = [
        "א.א.ג.",
        "כירורגיה לב",
        "כירורגיה",
        "כירורגיה חזה",
        "אורתופדיה",
        "נשים",
        "פה ולסת",
        "אורולוגיה",
        "עיניים",
        "פלסטיקה",
        "ילדים",
        "כלי דם",
    ];

    private readonly yearPalette: string[] = [
        "#2563eb", // כחול עמוק
        "#0ea5e9", // תכלת
        "#22c55e", // ירוק
        "#fbbf24", // צהוב זהב
        "#a855f7", // סגול רך
    ];

    // Chart main view mode:
    // 'year-total'  – total surgeries per year (default)
    // 'fund'        – total per year split by קרן/מדינה
    // 'site'        – total per year split by אתר
    // 'shift'       – total per year split by משמרת
    // 'department'  – multi‑year per מחלקה (existing behaviour)
    // 'month'       – ניתוחים לפי חודשים (5 שנים אחרונות)
    chartViewMode: "year-total" | "fund" | "site" | "shift" | "department" | "month" | "yoy-combined" = "year-total";

    /** מצב מדד ראשי: ניתוחים (כמות), זמני חדר, או ניצולת חדר ניתוח (ניתוחים ליום בחדר) */
    mainMetricMode: "surgery-volume" | "room-times" | "room-utilization" = "surgery-volume";

    // When true, the משמרת filter dropdown in the sidebar is visually disabled
    // because the main chart itself is grouped by משמרת.
    isShiftGroupedView: boolean = false;

    // Boss Dashboard
    showBossDashboard = false;

    /** שורת ניתוח נבחרת למודל פרטים (מעקב ניתוחים) */
    selectedSurgery: SurgeryRow | null = null;

    // Table data – עמודות טבלת ניתוחים
    displayedColumns: string[] = [
        "date",
        "caseNumber",
        "surgeryRoom",
        "surgeryDurationMinutes",
        "surgeryType",
        "surgeon",
        "procedure",
        "totalAmount",
    ];
    dataSource = new MatTableDataSource<SurgeryRow | DepartmentComparisonDto>([]);

    // Detailed table data with MatSort
    detailedDataSource = new MatTableDataSource<DepartmentDetailedDataDto>([]);
    detailedSort!: MatSort;

    // UI State
    isDataLoaded = false;
    /** האם גרף הראשי מוכן להצגה (אחרי שכל הנתונים והצבעים חושבו) */
    isChartViewReady = false;
  
    selectedDepartment: DepartmentComparisonDto | null = null;
    selectedDiagnosis: string = "אגף כירורגי";
    isDepartmentGraphOpen = false;
    departmentGraphTitle = "";
    isLoading = false;
    catalogLoading = false;
    isMainDataLoading = false; // Loading for main data table
    isDiagnosesLoading = false; // Loading for diagnoses list
    isChartLoading = false; // Loading for chart data
  // Fake global loader progress (0‑100%) for user feedback
  loadingProgress = 0;
  private loadingProgressTimer: any = null;
  private anyLoadingPrev = false;
    selectedViewType: string = "cash";
    chartType: string = "ColumnChart"; // 'ColumnChart' or 'LineChart'

    // Filters for surgeries dashboard (multi‑select)
    surgeryTypeOptions: string[] = ["אלקטיבי", "ססיה", "דחוף"];
    selectedSurgeryTypes: string[] = []; // ריק = הכל

    shiftOptions: string[] = ["בוקר", "ערב", "לילה"];
    selectedShifts: string[] = []; // ריק = הכל

    /** פילטר "עבודת בוקר" – all/yes/no */
    morningWorkFilter: "all" | "yes" | "no" = "all";

    roomOptions: string[] = [];
    selectedRooms: string[] = []; // ריק = הכל

    /** אתרים לניתוחים */
    siteOptions: string[] = [];
    selectedSites: string[] = []; // ריק = הכל

    departmentOptions: string[] = [];
    selectedDepartments: string[] = []; // ריק = הכל

    /** פילטר מחלקה לאזור הגרף והטבלה – null = הכל */
    chartDepartmentFilter: string | null = null;
    isChartDeptDropdownOpen = false;

    // שים לב: השרת מחזיר WeekPart כ"סופ״ש" (גרשיים עבריים U+05F4), לכן משתמשים באותה מחרוזת כאן
    weekdayOptions: string[] = ["אמצע שבוע", "סופ״ש"];
    selectedWeekdays: string[] = []; // ריק = הכל

    showMoreFilters: boolean = false;

    // פתיחה/סגירה של דרופדאונים
    isSurgeryTypeOpen = false;
    isShiftOpen = false;
    isRoomOpen = false;
    isDeptOpen = false;
    isWeekdayOpen = false;
    isMorningWorkOpen = false;
    isSiteOpen = false;

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

    // Raw "one call per baseYear" caches – filter in client without additional API calls.
    private avgDurationFiveYearsRawByBaseYear = new Map<string, AvgDurationFiveYearsDto[]>();
    private lossByWingYearRawByBaseYear = new Map<string, LossByWingYearDto[]>();
    private approvedUtilizationRawByBaseYear = new Map<string, ApprovedUtilizationDto[]>();

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

  // Modals for group‑2 KPIs (זמני ניתוח לפי מחלקה)
  /** מודל אחד מאוחד של "זמני חדר ניתוח" עם מבטים שונים לפי כפתור */
  showRoomTimesModal = false;
  roomTimesView: 'avgDuration' | 'firstStart' | 'lastEnd' | 'avgSetup' | 'perDay' | 'lossPerDay' | 'approvedPerDay' = 'avgDuration';
  // שמירה על flags ישנים לטובת הקוד הקיים (פתיחה/סגירה לפי מודלים נפרדים)
  showAvgDurationModal = false;
  showTimesModal = false;
  showFirstStartTimeModal = false;
  showLastEndTimeModal = false;
  showAvgSetupModal = false;
  showSurgeriesPerDayModal = false;
  // 2.3 זמן סיום ניתוח אחרון לפי מחלקה
  /** כשפעיל: מציג ממוצע ללא ימי גלישה (נטרל ימים עם גלישה מהממוצע) */
  lastEndTimeExcludeOverflowDays = false;
  /** נתונים גולמיים אחרי סינון קרדיולוגיה ואגף – מאפשר החלפת תצוגה (כל הימים / רק ימים עם גלישה) בלי קריאת API */
  private lastEndTimeRows: AvgLastEndRow[] = [];

  // Full‑screen view for YoY combined metric chart
  showYoyCombinedFullModal = false;

  isAvgDurationLoading = false;
  isFirstStartTimeLoading = false;
  isLastEndTimeLoading = false;
  isAvgSetupLoading = false;
  isSurgeriesPerDayLoading = false;
  isApprovedUtilizationLoading = false;

  avgDurationData: DeptTimeMetricRow[] = [];
  firstStartTimeData: DeptTimeMetricRow[] = [];
  lastEndTimeData: DeptTimeMetricRow[] = [];
  avgSetupData: DeptTimeMetricRow[] = [];
  surgeriesPerDayData: DeptTimeMetricRow[] = [];
  /** סינון לפי אתר עבור גרף משך ניתוח ממוצע – ALL = כל האתרים */
  avgDurationSiteFilter: AvgDurationSiteFilter = "ALL";
  avgDurationChartColumns: any[] = [];
  avgDurationChartData: any[] = [];
  avgDurationChartOptions: any = {};
  surgeriesPerDayChartColumns: any[] = [];
  surgeriesPerDayChartData: any[] = [];
  surgeriesPerDayChartOptions: any = {};
  avgSetupChartOptions: any = {};
  lastEndTimeChartOptions: any = {};
  /** צבעים למקרא שנים (תואם לסדר העמודות ב-Google ColumnChart) */
  readonly kpiChartYearColors: string[] = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099'];
  firstStartTimeChartYears: number[] = [];
  lastEndTimeChartYears: number[] = [];
  avgSetupChartYears: number[] = [];
  avgDurationChartYears: number[] = [];
  surgeriesPerDayChartYears: number[] = [];

  // ================= Comparison mode (Avg Duration) =================
  avgDurationCompareEnabled = false;
  avgDurationCompareDimension: 'SurgeryType' | 'Shift' | 'Site' = 'SurgeryType';
  /** צד ימין (מקור) – יכול להיות 'הכל' או ערך ספציפי */
  avgDurationCompareRightValue: string | null = 'הכל';
  /** צד שמאל (השוואה) – יכול להיות 'הכל' או ערך ספציפי */
  avgDurationCompareLeftValue: string | null = null;
  showAvgDurationCompareModal = false;
  /** בוחר Wing אחד להצגה בהשוואה (חובה כדי שהגרף יהיה קריא) */
  avgDurationCompareWing: string | null = null;
  /** תצוגה מוטמעת (קטנה) בתחתית הטבלה */
  avgDurationCompareInlineOpen = false;

  avgDurationCompareRightChartColumns: any[] = [];
  avgDurationCompareRightChartData: any[] = [];
  avgDurationCompareRightChartOptions: any = {};

  avgDurationCompareLeftChartColumns: any[] = [];
  avgDurationCompareLeftChartData: any[] = [];
  avgDurationCompareLeftChartOptions: any = {};

  /** גרף השוואה מאוחד (קו): X=שנה, סדרות=ימין/שמאל */
  avgDurationCompareCombinedChartColumns: any[] = [];
  avgDurationCompareCombinedChartData: any[] = [];
  avgDurationCompareCombinedChartOptions: any = {};
  avgDurationCompareYears: number[] = [];

  // Dropdown UI state for compare controls (reuse custom-dropdown look)
  isAvgDurationCompareWingOpen = false;
  isAvgDurationCompareDimensionOpen = false;
  isAvgDurationCompareRightOpen = false;
  isAvgDurationCompareLeftOpen = false;

  private closeAvgDurationCompareDropdowns(): void {
    this.isAvgDurationCompareWingOpen = false;
    this.isAvgDurationCompareDimensionOpen = false;
    this.isAvgDurationCompareRightOpen = false;
    this.isAvgDurationCompareLeftOpen = false;
  }

  toggleAvgDurationCompareDropdown(
    which: 'wing' | 'dimension' | 'right' | 'left'
  ): void {
    const next =
      (which === 'wing' && !this.isAvgDurationCompareWingOpen) ||
      (which === 'dimension' && !this.isAvgDurationCompareDimensionOpen) ||
      (which === 'right' && !this.isAvgDurationCompareRightOpen) ||
      (which === 'left' && !this.isAvgDurationCompareLeftOpen);

    this.closeAvgDurationCompareDropdowns();
    if (!next) return;

    if (which === 'wing') this.isAvgDurationCompareWingOpen = true;
    if (which === 'dimension') this.isAvgDurationCompareDimensionOpen = true;
    if (which === 'right') this.isAvgDurationCompareRightOpen = true;
    if (which === 'left') this.isAvgDurationCompareLeftOpen = true;
  }

  getAvgDurationCompareDimensionLabel(): string {
    if (this.avgDurationCompareDimension === 'Shift') return 'משמרת';
    if (this.avgDurationCompareDimension === 'Site') return 'אתר';
    return 'סוג ניתוח';
  }

  setAvgDurationCompareWing(v: string | null): void {
    this.avgDurationCompareWing = v;
    this.avgDurationCompareEnabled = true;
    this.closeAvgDurationCompareDropdowns();
    this.onAvgDurationCompareSettingsChanged();
  }

  setAvgDurationCompareDimension(v: 'SurgeryType' | 'Shift' | 'Site'): void {
    this.avgDurationCompareDimension = v;
    this.avgDurationCompareEnabled = true;
    this.closeAvgDurationCompareDropdowns();
    this.onAvgDurationCompareSettingsChanged();
  }

  setAvgDurationCompareRightValue(v: string | null): void {
    this.avgDurationCompareRightValue = v;
    this.avgDurationCompareEnabled = true;
    this.closeAvgDurationCompareDropdowns();
    this.onAvgDurationCompareSettingsChanged();
  }

  setAvgDurationCompareLeftValue(v: string | null): void {
    this.avgDurationCompareLeftValue = v;
    this.avgDurationCompareEnabled = true;
    this.closeAvgDurationCompareDropdowns();
    this.onAvgDurationCompareSettingsChanged();
  }

  openAvgDurationCompareModal(): void {
    this.avgDurationCompareEnabled = true;
    this.showAvgDurationCompareModal = true;
    this.onAvgDurationCompareSettingsChanged();
  }

  closeAvgDurationCompareModal(): void {
    this.showAvgDurationCompareModal = false;
  }

  openAvgDurationCompareInline(): void {
    this.avgDurationCompareEnabled = true;
    this.avgDurationCompareInlineOpen = true;
    this.onAvgDurationCompareSettingsChanged();
  }

  closeAvgDurationCompareInline(): void {
    this.avgDurationCompareInlineOpen = false;
  }

  getAvgDurationCompareWingOptions(): string[] {
    const baseYear = this.getBaseYearForRoomTimes?.() ?? '';
    const raw = baseYear ? (this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []) : [];
    const filtered = raw
      .filter(r => this.matchesRoomTimesFilters?.(r as any) ?? true)
      .filter(r => !this.avgDurationSiteFilter || this.avgDurationSiteFilter === "ALL" || r.Site === this.avgDurationSiteFilter);

    const wings = Array.from(new Set(filtered.map(r => (r.Wing || '').trim()).filter(Boolean)));
    const list = wings.length ? wings : (this.orderedWings || []);
    return Array.from(new Set(list.map((x: string) => (x || '').trim()).filter(Boolean)));
  }

  getAvgDurationCompareValueOptions(): string[] {
    const baseYear = this.getBaseYearForRoomTimes?.() ?? '';
    const raw = baseYear ? (this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []) : [];
    const field = this.avgDurationCompareDimension;
    const filtered = raw
      .filter(r => this.matchesRoomTimesFilters?.(r as any) ?? true)
      // If comparison is "by site", do NOT pre-filter by the global site filter,
      // otherwise you can't compare between sites.
      .filter(r => field === 'Site' || !this.avgDurationSiteFilter || this.avgDurationSiteFilter === "ALL" || r.Site === this.avgDurationSiteFilter)
      .filter(r => !this.avgDurationCompareWing || (r.Wing || '').trim() === (this.avgDurationCompareWing || '').trim());

    const values = filtered
      .map(r => {
        if (field === 'Site') return (r.Site || '').trim();
        if (field === 'Shift') return (r.Shift || '').trim();
        return (r.SurgeryType || '').trim();
      })
      .filter(v => v.length > 0);

    const uniq = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'he'));
    return ['הכל', ...uniq];
  }

  onAvgDurationCompareSettingsChanged(): void {
    if (!this.avgDurationCompareEnabled || !this.avgDurationCompareWing) {
      this.avgDurationCompareRightChartColumns = [];
      this.avgDurationCompareRightChartData = [];
      this.avgDurationCompareLeftChartColumns = [];
      this.avgDurationCompareLeftChartData = [];
      this.avgDurationCompareCombinedChartColumns = [];
      this.avgDurationCompareCombinedChartData = [];
      this.avgDurationCompareYears = [];
      return;
    }

    const baseYear = this.getBaseYearForRoomTimes?.() ?? '';
    const raw = baseYear ? (this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []) : [];

    const field = this.avgDurationCompareDimension;
    const byWing = raw
      .filter(r => this.matchesRoomTimesFilters?.(r as any) ?? true)
      .filter(r => field === 'Site' || !this.avgDurationSiteFilter || this.avgDurationSiteFilter === "ALL" || r.Site === this.avgDurationSiteFilter)
      .filter(r => (r.Wing || '').trim() === (this.avgDurationCompareWing || '').trim());
    const matchValue = (r: AvgDurationFiveYearsDto, v: string | null): boolean => {
      const vv = (v || '').trim();
      if (!vv || vv === 'הכל') return true;
      if (field === 'Site') return (r.Site || '').trim() === vv;
      if (field === 'Shift') return (r.Shift || '').trim() === vv;
      return (r.SurgeryType || '').trim() === vv;
    };

    const rightRows = byWing.filter(r => matchValue(r, this.avgDurationCompareRightValue));
    const leftRows = byWing.filter(r => matchValue(r, this.avgDurationCompareLeftValue));

    const rightModel = this.buildAvgDurationFiveYearsChartModel(rightRows);
    const leftModel = this.buildAvgDurationFiveYearsChartModel(leftRows);

    this.avgDurationCompareRightChartColumns = rightModel.columns;
    this.avgDurationCompareRightChartData = rightModel.data;
    this.avgDurationCompareLeftChartColumns = leftModel.columns;
    this.avgDurationCompareLeftChartData = leftModel.data;

    // ===== Combined LINE chart (Year x Right/Left) =====
    const toWeightedAvgByYear = (rows: AvgDurationFiveYearsDto[]): Map<number, number> => {
      const map = new Map<number, { sumMin: number; sumCount: number }>();
      for (const r of rows || []) {
        const y = r.Year;
        if (y == null) continue;
        const cnt = r.Count ?? 0;
        const avgMin = r.AvgDurationMin ?? 0;
        const prev = map.get(y) || { sumMin: 0, sumCount: 0 };
        prev.sumMin += avgMin * cnt;
        prev.sumCount += cnt;
        map.set(y, prev);
      }
      const out = new Map<number, number>();
      for (const [y, v] of map.entries()) {
        out.set(y, v.sumCount ? (v.sumMin / v.sumCount) : 0);
      }
      return out;
    };

    const allYears = Array.from(
      new Set<number>([
        ...rightRows.map(r => r.Year).filter((y): y is number => y != null),
        ...leftRows.map(r => r.Year).filter((y): y is number => y != null),
      ])
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.avgDurationCompareYears = years;

    const rightByYear = toWeightedAvgByYear(rightRows);
    const leftByYear = toWeightedAvgByYear(leftRows);

    const rightLabel = `: ${(this.avgDurationCompareRightValue || 'הכל').trim() || 'הכל'}`;
    const leftLabel = `: ${(this.avgDurationCompareLeftValue || 'הכל').trim() || 'הכל'}`;

    this.avgDurationCompareCombinedChartColumns = [
      { type: 'string', label: 'שנה' },
      { type: 'number', label: rightLabel },
      { type: 'string', role: 'annotation' },
      { type: 'number', label: leftLabel },
      { type: 'string', role: 'annotation' },
    ];

    this.avgDurationCompareCombinedChartData = years.map(y => {
      const rv = rightByYear.get(y);
      const lv = leftByYear.get(y);
      const rLabel = rv != null && rv > 0 ? this.formatMinutesToHM(rv) : '';
      const lLabel = lv != null && lv > 0 ? this.formatMinutesToHM(lv) : '';
      return [
        y.toString(),
        rv != null && rv > 0 ? { v: rv, f: rLabel } : null,
        rLabel || null,
        lv != null && lv > 0 ? { v: lv, f: lLabel } : null,
        lLabel || null,
      ];
    });

    const axisTextColor = this.isDark ? '#e5e7eb' : '#334155';
    const gridColor = this.isDark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.10)';

    this.avgDurationCompareCombinedChartOptions = {
      title: '',
      backgroundColor: 'transparent',
      legend: { position: 'top', alignment: 'end', textStyle: { fontSize: 12, bold: true, color: axisTextColor } },
      chartArea: { width: '86%', height: '62%', left: 44, top: 46 },
      pointSize: 5,
      lineWidth: 3,
      interpolateNulls: true,
      vAxis: {
        title: "משך ניתוח ממוצע (דק')",
        textStyle: { fontSize: 11, bold: true, color: axisTextColor },
        titleTextStyle: { fontSize: 11, bold: true, color: axisTextColor },
        gridlines: { color: gridColor },
        minorGridlines: { color: 'transparent' },
      },
      hAxis: {
        title: 'שנה',
        textStyle: { fontSize: 11, bold: true, color: axisTextColor },
        titleTextStyle: { fontSize: 11, bold: true, color: axisTextColor },
      },
      annotations: {
        textStyle: { fontSize: 10, bold: true, color: axisTextColor },
        stem: { color: gridColor, length: 3 },
      },
      series: {
        0: { color: this.isDark ? '#60a5fa' : '#2563eb' },
        1: { color: this.isDark ? '#4ade80' : '#16a34a' },
      },
    };

    // Use same look & feel as avgDuration, but keep labels vertical for readability
    const baseOpts = this.avgDurationChartOptions && Object.keys(this.avgDurationChartOptions).length
      ? this.avgDurationChartOptions
      : {
          title: "",
          legend: { position: "top", alignment: "end", textStyle: { fontSize: 14, bold: true } },
          chartArea: { width: '90%', height: '60%', left: 50, top: 100 },
          vAxis: { title: "משך ניתוח ממוצע (דק')", textStyle: { fontSize: 14, bold: true } },
        };

    const axis = {
      ...(baseOpts.hAxis || {}),
      slantedText: true,
      slantedTextAngle: 90,
      textStyle: { ...(baseOpts.hAxis?.textStyle || {}), fontSize: 14, bold: true, color: "#334155" },
    };

    this.avgDurationCompareRightChartOptions = {
      ...baseOpts,
      hAxis: axis,
    };
    this.avgDurationCompareLeftChartOptions = {
      ...baseOpts,
      hAxis: axis,
    };
  }

  /** מניעת טעינה כפולה: קוראים לשרת רק כשאין עדיין נתונים או כשהפרמטרים השתנו */
  private lastCountByDeptYear: number | null = null;
  private lastMonthlyCountsParams: string | null = null;
  /** מונע שליחת קריאות כפולות ל-GetMonthlyCounts כל עוד יש בקשה בתהליך */
  private monthlyCountsRequestInFlight = false;
  private lastSurgeriesPerDayYear: string | null = null;
  /** שמירת הנתונים הגולמיים לניתוחים ליום בחדר (ללא שימוש ב-Map) */
  private surgeriesPerDayRaw: AvgSurgeriesPerDayPerRoomDto[] = [];
  private lastAvgDurationYear: string | null = null;
  /** מפתח פרמטרים אחרון (לפי buildKpiFilterParams) – למודלים שמשתמשים בפילטרים */
  private lastAvgFirstMorningEntryParams: string | null = null;
  private lastAvgLastMorningEndParams: string | null = null;
  private lastAvgSetupParams: string | null = null;

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private mMenuPerm: MenuPerm
    ) {
        // הגבלת גישה לדשבורד הניתוחים לפי הרשאות תפריט
        const userName = localStorage.getItem("loginUserName") || "";
        if (userName) {
            this.mMenuPerm.setUserName(userName);
        }
        // השם חייב להתאים ל־RoutName המוגדר בצד השרת להרשאה זו
        this.mMenuPerm.setRoutName("surgeriesDashboard");
        setTimeout(() => {
            if (!this.mMenuPerm.getHasPerm()) {
                localStorage.clear();
                this.router.navigate(["login"]);
            }
        }, 2000);
    }

    /**
     * מעקב כללי אחרי מצב טעינה כדי לעדכן את ה‑progress המדומה בלודר העליון
     */
    ngDoCheck(): void {
        const anyLoading =
            this.isLoading ||
            this.isMainDataLoading ||
            this.isDiagnosesLoading ||
            this.catalogLoading ||
            this.isChartLoading;

        if (anyLoading !== this.anyLoadingPrev) {
            this.anyLoadingPrev = anyLoading;
            this.handleGlobalLoadingStateChange(anyLoading);
        }
    }

    ngAfterViewInit(): void {
        this.scheduleTableExtraCheck();
        this.scheduleYoyCombinedInlineBuild();
    }

    private handleGlobalLoadingStateChange(isLoading: boolean): void {
        if (isLoading) {
            // התחלת מחזור טעינה חדש – אפס אחוזים והפעל טיימר
            this.loadingProgress = 0;
            if (this.loadingProgressTimer) {
                clearInterval(this.loadingProgressTimer);
            }
            this.loadingProgressTimer = setInterval(() => {
                // אם בינתיים אין טעינה – נעצור
                if (!this.anyLoadingPrev) {
                    return;
                }
                // מתקדמים יחסית לאט עד 90%, ואז קצת יותר לאט עד 97%
                if (this.loadingProgress < 90) {
                    this.loadingProgress += 1;
                } else if (this.loadingProgress < 97) {
                    this.loadingProgress += 0.5;
                } else {
                    // לא לעבור את 97% לפני שהטעינה באמת מסתיימת
                    this.loadingProgress = 97;
                }
            }, 120);
        } else {
            // הטעינה הסתיימה – קפיצה ל‑100% ואז איפוס קצר
            this.loadingProgress = 100;
            if (this.loadingProgressTimer) {
                clearInterval(this.loadingProgressTimer);
                this.loadingProgressTimer = null;
            }
            setTimeout(() => {
                this.loadingProgress = 0;
            }, 400);
            this.scheduleTableExtraCheck();
        }
    }

    private scheduleTableExtraCheck(): void {
        // keep it cheap; avoid doing DOM measurement in tight loops
        requestAnimationFrame(() => this.updateTableExtraVisibility());
    }

    private updateTableExtraVisibility(): void {
        const el = this.tableBodyEl?.nativeElement;
        if (!el) {
            this.showTableExtra = false;
            return;
        }

        // "empty space" means no vertical scroll inside table-body
        const sparePx = el.clientHeight - el.scrollHeight;
        const next = sparePx > 12; // tolerance for borders/padding
        if (next !== this.showTableExtra) {
            this.showTableExtra = next;
            this.cdr.detectChanges();
        }
    }

    /**
     * בונה את גרף ה‑"מדד משולב" במודל המסך הגדול באמצעות Chart.js
     * עם תוויות אחוזים בקצה העמודות: ימינה לחיובי, שמאלה לשלילי.
     */
    private buildYoyCombinedChart(): void {
        if (!this.yoyCombinedChartRef) {
            return;
        }
        const canvas = this.yoyCombinedChartRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx || !this.departmentYoyData || this.departmentYoyData.length === 0) {
            return;
        }

        // השמדת גרף קודם (אם קיים)
        if (this.yoyCombinedChart) {
            this.yoyCombinedChart.destroy();
            this.yoyCombinedChart = null;
        }

        const labels = this.departmentYoyData.map(d => d.Department || '');
        const surgeries = this.departmentYoyData.map(d => d.SurgeriesPerRoom_Pct ?? 0);
        const times = this.departmentYoyData.map(d => d.AvgSurgeryTime_Pct ?? 0);
        const revenues = this.departmentYoyData.map(d => d.AvgRevenue_Pct ?? 0);

        const isDark = this.isDark;
        const textColor = isDark ? '#e5e7eb' : '#0f172a';

        this.yoyCombinedChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'ניתוחים לחדר (% שינוי)',
                        data: surgeries,
                        backgroundColor: '#22c55e',
                    },
                    {
                        label: 'זמן ניתוח ממוצע (% שינוי)',
                        data: times,
                        backgroundColor: '#f97316',
                    },
                    {
                        label: 'הכנסה ממוצעת (% שינוי)',
                        data: revenues,
                        backgroundColor: '#0ea5e9',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: 'bottom',
                    labels: {
                        fontColor: textColor,
                        fontSize: 11,
                    },
                },
                scales: {
                    xAxes: [{
                        ticks: {
                            fontColor: textColor,
                            callback: (v: any) => v + '%',
                        },
                        scaleLabel: {
                            display: true,
                            labelString: '% שינוי',
                            fontColor: textColor,
                        },
                        gridLines: {
                            color: isDark ? 'rgba(148,163,184,.3)' : 'rgba(148,163,184,.4)',
                        },
                    }],
                    yAxes: [{
                        ticks: {
                            fontColor: textColor,
                            mirror: false,
                        },
                        gridLines: {
                            display: false,
                        },
                    }],
                },
                layout: {
                    padding: {
                        left: 40,
                        right: 40,
                        top: 10,
                        bottom: 10,
                    },
                },
                tooltips: {
                    callbacks: {
                        label: (tooltipItem: any, data: any) => {
                            const ds = data.datasets[tooltipItem.datasetIndex];
                            const val = tooltipItem.xLabel as number;
                            const sign = val > 0 ? '+' : '';
                            return `${ds.label}: ${sign}${val.toFixed(1)}%`;
                        },
                    },
                },
            },
            plugins: [{
                // קווי "רשת" דקים לכל מחלקה + תוויות אחוזים בקצה כל עמודה
                beforeDatasetsDraw: (chart: any) => {
                    const ctx2 = chart.ctx;
                    const chartArea = chart.chartArea;
                    const firstDatasetMeta = chart.getDatasetMeta(0);
                    if (!firstDatasetMeta || !firstDatasetMeta.data) {
                        return;
                    }

                    ctx2.save();
                    ctx2.strokeStyle = isDark ? 'rgba(148,163,184,.35)' : 'rgba(148,163,184,.35)';
                    ctx2.lineWidth = 0.5;

                    // לכל עמודה (מחלקה) מציירים קו עדין לרוחב הגרף
                    firstDatasetMeta.data.forEach((bar: any) => {
                        const y = bar._model.y;
                        ctx2.beginPath();
                        ctx2.moveTo(chartArea.left, y);
                        ctx2.lineTo(chartArea.right, y);
                        ctx2.stroke();
                    });

                    ctx2.restore();
                },
                afterDatasetsDraw: (chart: any) => {
                    const ctx2 = chart.ctx;
                    ctx2.save();
                    ctx2.font = Chart.helpers.fontString(11, 'normal', Chart.defaults.global.defaultFontFamily);
                    ctx2.fillStyle = textColor;

                    chart.data.datasets.forEach((dataset: any, dsIndex: number) => {
                        const meta = chart.getDatasetMeta(dsIndex);
                        meta.data.forEach((bar: any, index: number) => {
                            const raw = dataset.data[index];
                            if (raw == null) {
                                return;
                            }
                            const value = Number(raw);
                            const sign = value > 0 ? '+' : '';
                            const label = `${sign}${value.toFixed(1)}%`;
                            const padding = 4;

                            const x = value >= 0
                                ? bar._model.x + padding
                                : bar._model.x - padding;
                            const y = bar._model.y + 4; // תיקון קטן לגובה

                            ctx2.textAlign = value >= 0 ? 'left' : 'right';
                            ctx2.textBaseline = 'middle';
                            ctx2.fillText(label, x, y);
                        });
                    });

                    ctx2.restore();
                },
            }],
        } as any);
    }

    private buildYoyCombinedInlineChart(): void {
        const ref = this.yoyCombinedChartInlineRef;
        if (!ref) {
            return;
        }
        const canvas = ref.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx || !this.departmentYoyData || this.departmentYoyData.length === 0) {
            return;
        }

        if (this.yoyCombinedInlineChart) {
            this.yoyCombinedInlineChart.destroy();
            this.yoyCombinedInlineChart = null;
        }

        const labels = this.departmentYoyData.map(d => d.Department || '');
        const surgeries = this.departmentYoyData.map(d => d.SurgeriesPerRoom_Pct ?? 0);
        const times = this.departmentYoyData.map(d => d.AvgSurgeryTime_Pct ?? 0);
        const revenues = this.departmentYoyData.map(d => d.AvgRevenue_Pct ?? 0);

        const isDark = this.isDark;
        const textColor = isDark ? '#e5e7eb' : '#0f172a';

        this.yoyCombinedInlineChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels,
                datasets: [
                    { label: 'ניתוחים לחדר (% שינוי)', data: surgeries, backgroundColor: '#22c55e' },
                    { label: 'זמן ניתוח ממוצע (% שינוי)', data: times, backgroundColor: '#f97316' },
                    { label: 'הכנסה ממוצעת (% שינוי)', data: revenues, backgroundColor: '#0ea5e9' },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: 'bottom',
                    labels: { fontColor: textColor, fontSize: 11 },
                },
                scales: {
                    xAxes: [{
                        ticks: { fontColor: textColor, callback: (v: any) => v + '%' },
                        scaleLabel: { display: true, labelString: '% שינוי', fontColor: textColor },
                        gridLines: { color: isDark ? 'rgba(148,163,184,.3)' : 'rgba(148,163,184,.4)' },
                    }],
                    yAxes: [{
                        ticks: { fontColor: textColor, mirror: false },
                        gridLines: { display: false },
                    }],
                },
                layout: { padding: { left: 40, right: 40, top: 10, bottom: 10 } },
                tooltips: {
                    callbacks: {
                        label: (tooltipItem: any, data: any) => {
                            const ds = data.datasets[tooltipItem.datasetIndex];
                            const val = tooltipItem.xLabel as number;
                            const sign = val > 0 ? '+' : '';
                            return `${ds.label}: ${sign}${val.toFixed(1)}%`;
                        },
                    },
                },
            },
            plugins: [{
                beforeDatasetsDraw: (chart: any) => {
                    const ctx2 = chart.ctx;
                    const chartArea = chart.chartArea;
                    const firstDatasetMeta = chart.getDatasetMeta(0);
                    if (!firstDatasetMeta || !firstDatasetMeta.data) return;
                    ctx2.save();
                    ctx2.strokeStyle = isDark ? 'rgba(148,163,184,.35)' : 'rgba(148,163,184,.35)';
                    ctx2.lineWidth = 0.5;
                    firstDatasetMeta.data.forEach((bar: any) => {
                        const y = bar._model.y;
                        ctx2.beginPath();
                        ctx2.moveTo(chartArea.left, y);
                        ctx2.lineTo(chartArea.right, y);
                        ctx2.stroke();
                    });
                    ctx2.restore();
                },
                afterDatasetsDraw: (chart: any) => {
                    const ctx2 = chart.ctx;
                    ctx2.save();
                    ctx2.font = Chart.helpers.fontString(11, 'normal', Chart.defaults.global.defaultFontFamily);
                    ctx2.fillStyle = textColor;
                    chart.data.datasets.forEach((dataset: any, dsIndex: number) => {
                        const meta = chart.getDatasetMeta(dsIndex);
                        meta.data.forEach((bar: any, index: number) => {
                            const raw = dataset.data[index];
                            if (raw == null) return;
                            const value = Number(raw);
                            const sign = value > 0 ? '+' : '';
                            const label = `${sign}${value.toFixed(1)}%`;
                            const padding = 4;
                            const x = value >= 0 ? bar._model.x + padding : bar._model.x - padding;
                            const y = bar._model.y + 4;
                            ctx2.textAlign = value >= 0 ? 'left' : 'right';
                            ctx2.textBaseline = 'middle';
                            ctx2.fillText(label, x, y);
                        });
                    });
                    ctx2.restore();
                },
            }],
        } as any);
    }

    private scheduleYoyCombinedInlineBuild(): void {
        if (this.chartViewMode !== 'yoy-combined') {
            return;
        }
        // wait for DOM to render the canvas
        setTimeout(() => this.buildYoyCombinedInlineChart(), 0);
    }


    ngOnInit(): void {
        // console.log("gOnInit called");
        // Open guide on every visit unless user checked "אל תציג יותר"
        const dontShowAgain = localStorage.getItem("dashboardGuideDontShowAgain");
        if (dontShowAgain === "true") {
            this.showGuideAvatar = false;
        }
        // else: showGuideAvatar stays true → guide opens automatically

       // Load employee info from localStorage + API
       this.employeeUserName = localStorage.getItem("loginUserName");
       this.employeeFirstName = localStorage.getItem("FirstName");
       this.employeeLastName = localStorage.getItem("LastName");
       this.employeeFunctionDescription = localStorage.getItem("FunctionDescription");
       this.employeeLocalDepartment = localStorage.getItem("Depart");

       if (this.employeeUserName) {
           this.loadEmployeeInfo(this.employeeUserName);
       }

        // Initialize chart theme and body class for select panel (dark mode)
        this.updateChartTheme();
        this.syncBodyDarkClass();
        this.updateChartOptionsForType();
        // Load main 5‑year counts by department from new API
        this.loadCountByDept();
        this.loadDiagnosesList();
        // Load data after diagnoses list is loaded
        setTimeout(() => {
            if (this.selectedDiagnosis) {
                this.loadDepartmentIncomeByDiagnosis();
            } else {
                this.loadDepartmentIncomeData();
            }
        }, 500);
        this.displayedCatalogColumns = this.cashColumns;

        // רישום מאזין resize כדי שהגרף יתעדכן בכל שינוי גודל מסך
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.onWindowResize);
        }
    }

    ngOnDestroy(): void {
        document.body.classList.remove('surgeries-dashborad-dark');
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.onWindowResize);
        }
        if (this.loadingProgressTimer) {
            clearInterval(this.loadingProgressTimer);
            this.loadingProgressTimer = null;
        }
    }

    /**
     * ממפה שורת תגובה מהשרת ל-SurgeryRow (תמיכה במפתחות בעברית/אנגלית)
     */
    private normalizeSurgeryRow(row: any): SurgeryRow {
        if (!row || typeof row !== 'object') return {};
        const r = row as Record<string, any>;
        return {
            date: r['תאריך'] ?? r['Date'] ?? r['date'],
            caseNumber: r['מספר מקרה'] ?? r['מספר_מקרה'] ?? r['CaseNumber'] ?? r['caseNumber'],
            surgeryNumber: r['מספר ניתוח'] ?? r['מספר_ניתוח'] ?? r['SurgeryNumber'],
            site: r['אתר'] ?? r['Site'] ?? r['site'],
            surgeryRoom: r['חדר ניתוח'] ?? r['חדר_ניתוח'] ?? r['SurgeryRoom'] ?? r['surgeryRoom'],
            surgeryDurationMinutes: this.toNumber(r['זמן ניתוח בדקות'] ?? r['זמן_ניתוח_בדקות'] ?? r['SurgeryDurationMinutes']),
            surgeryType: r['סוג ניתוח'] ?? r['סוג_ניתוח'] ?? r['SurgeryType'],
            unifiedSurgeryType: r['סוג ניתוח מאוחד'] ?? r['סוג_ניתוח_מאוחד'],
            surgeon: r['מנתחת'] ?? r['Surgeon'] ?? r['surgeon'],
            requestingUnit: r['יחידה מזמינה'] ?? r['יחידה_מזמינה'] ?? r['RequestingUnit'],
            procedure: r['פרוצדורה'] ?? r['Procedure'] ?? r['procedure'],
            totalAmount: this.toNumber(r['סכום כולל'] ?? r['סכום_כולל'] ?? r['TotalAmount']),
            shift: r['StartTimeOnly'] ?? r['shift'],
            department: r['S_DEPARTMENT'] ?? r['department'],
            departmentMapped: r['MappedDept'] ?? r['department_mapped'],
            weekdayOrWeekend: r['יום_או_סופש'] ?? r['weekday_or_weekend'],
            ...r,
        };
    }

    private toNumber(val: any): number | undefined {
        if (val == null) return undefined;
        const n = Number(val);
        return isNaN(n) ? undefined : n;
    }

    /**
     * מנסה לפרש מחרוזת תאריך ומחזירה שנה/חודש/יום לצורך השוואת תקופה (YTD)
     */
    private parseDateParts(dateStr: string | undefined | null): { year: number; month: number; day: number } | null {
        if (!dateStr) {
            return null;
        }

        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return {
                year: parsed.getFullYear(),
                month: parsed.getMonth(), // 0‑based
                day: parsed.getDate(),
            };
        }

        // נסיון שני: פירוק ידני לפי מפרידים נפוצים (dd/MM/yyyy, dd-MM-yyyy וכו')
        const parts = dateStr.split(/[\/\-\.]/).map((p) => p.trim());
        if (parts.length < 3) {
            return null;
        }

        // רוב הדוחות בארץ בפורמט dd/MM/yyyy
        const dNum = parseInt(parts[0], 10);
        const mNum = parseInt(parts[1], 10);
        const yNum = parseInt(parts[2], 10);

        if (isNaN(dNum) || isNaN(mNum) || isNaN(yNum)) {
            return null;
        }

        return {
            year: yNum,
            month: mNum - 1, // 0‑based
            day: dNum,
        };
    }

    /**
     * Load department income comparison data / נתוני ניתוחים
     * קורא לשרת רק אם עדיין אין נתונים (מניעת טעינה כפולה).
     */
    loadDepartmentIncomeData(): void {
        if (this.surgeryData.length > 0 || this.departmentIncomeData.length > 0) {
            this.isDataLoaded = true;
            this.isMainDataLoading = false;
            this.dataSource.data = this.surgeryData.length > 0
                ? this.applySurgeryFilter(this.surgeryData)
                : this.departmentIncomeData;
            this.updateChartData();
            this.cdr.detectChanges();
            return;
        }
        this.isDataLoaded = false;
        this.isMainDataLoading = true;

        this.http
            .post(environment.url + "GetSurgeriesDashborad", {})
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        const raw = response.d;
                        const isSurgeryRows = Array.isArray(raw) && raw.length > 0 && this.isSurgeryRow(raw[0]);

                        if (isSurgeryRows) {
                            this.surgeryData = raw.map((r: any) => this.normalizeSurgeryRow(r));
                            if (!this.selectedDiagnosis || this.selectedDiagnosis === 'אגף כירורגי') this.selectedDiagnosis = 'כל האתרים';
                            this.computeFilterOptions();
                            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
                            this.diagnosesList = this.getUniqueSites();
                            this.calculateTopDepartmentsFromSurgeries();
                            this.chartColumns = ["חדר ניתוח", "מספר ניתוחים", { type: "string", role: "annotation" }];
                            this.chartOptions.title = "";
                            this.updateChartTheme();
                            this.updateChartData();
                        } else {
                            this.departmentIncomeData = raw;
                            this.displayedColumns = ['DepartmentName', 'Income2024', 'Income2025', 'Difference'];
                            this.departmentIncomeData.sort((a, b) => b.Income2025 - a.Income2025);
                            this.dataSource.data = this.departmentIncomeData;
                            this.calculateTopDepartments();
                            this.updateChartColumns();
                            this.updateChartTheme();
                            this.updateChartData();
                            this.loadYearlyTotalsForChart();
                        }
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
                        this.cdr.detectChanges();
                        this.snackBar.open("✓ נתונים נטענו בהצלחה", "סגור", { duration: 3000 });
                    } else {
                        this.isMainDataLoading = false;
                    }
                },
                (error) => {
                    console.error("Error loading surgeries dashboard data:", error);
                    this.isMainDataLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open("❌ שגיאה בטעינת הנתונים", "סגור", { duration: 3000 });
                }
            );
    }

    /**
     * Load 5‑year aggregated counts by department from new API GetCountByDept
     * קורא לשרת רק אם עדיין אין נתונים לשנה הנוכחית.
     */
    private loadCountByDept(): void {
        const baseYear = this.currentYear;
        if (this.countByDeptData.length > 0 && this.lastCountByDeptYear === baseYear) {
            this.updateChartData();
            return;
        }
        this.isChartLoading = true;

        this.http
            .get<CountByDeptRow[]>(environment.url + "GetCountByDept_surgeries_dashborad", {
                params: { baseYear: baseYear.toString() },
            })
            .subscribe(
                (rows) => {
                    if (Array.isArray(rows)) {
                        this.countByDeptData = rows;
                        this.lastCountByDeptYear = baseYear;
                    } else {
                        this.countByDeptData = [];
                    }
                    // עדכון אופציות פילטרים (כולל חדרי ניתוח) גם כשעובדים רק עם CountByDept
                    this.computeFilterOptions();
                    this.updateChartData();
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error("Error loading GetCountByDept data:", error);
                    this.countByDeptData = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                }
            );
    }

    /**
     * Load 5‑year aggregated counts by month from new API GetMonthlyCounts.
     * שולח את פרמטר department (מהדרופדאון "מחלקה" או מהסיידבר) – השרת מסנן לפי מחלקה.
     * קורא לשרת רק אם עדיין אין נתונים או שפרמטרי הפילטר השתנו.
     */
    private loadMonthlyCounts(): void {
        const baseYear = this.currentYear;
        const kpiParams = this.buildKpiFilterParams();
        const paramsKey = `${baseYear}|${kpiParams.surgeryType}|${kpiParams.shift}|${kpiParams.site}|${kpiParams.weekend}|${kpiParams.department}`;
        if (this.monthlyCountsData.length > 0 && this.lastMonthlyCountsParams === paramsKey) {
            this.updateChartData();
            return;
        }
        if (this.monthlyCountsRequestInFlight) {
            return;
        }
        this.monthlyCountsRequestInFlight = true;
        this.isChartLoading = true;

        this.http
            .get<MonthlyCountRow[]>(environment.url + "GetMonthlyCounts_surgeries_dashborad", {
                params: {
                    baseYear: baseYear.toString(),
                    surgeryType: kpiParams.surgeryType,
                    shift: kpiParams.shift,
                    site: kpiParams.site,
                    weekend: kpiParams.weekend,
                    department: kpiParams.department,
                },
            })
            .subscribe({
                next: (response: any) => {
                    this.monthlyCountsRequestInFlight = false;
                    const raw = response && response.d != null ? response.d : response;
                    const rows = Array.isArray(raw) ? raw : [];
                    this.monthlyCountsData = rows;
                    this.lastMonthlyCountsParams = paramsKey;
                    this.updateChartData();
                },
                error: (err) => {
                    this.monthlyCountsRequestInFlight = false;
                    console.error("Error loading GetMonthlyCounts data:", err);
                    this.monthlyCountsData = [];
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    this.cdr.detectChanges();
                },
            });
    }

    /**
     * טוען נתוני השוואה YoY לפי מחלקה (מדד משולב) – ניתוחים לחדר, זמן ניתוח, הכנסה
     * קורא לשרת רק אם עדיין אין נתונים.
     */
    private loadDepartmentYoY(): void {
        if (this.departmentYoyData.length > 0) {
            this.updateChartData();
            if (this.showYoyCombinedFullModal) {
                setTimeout(() => this.buildYoyCombinedChart(), 0);
            }
            this.scheduleYoyCombinedInlineBuild();
            return;
        }
        this.isChartLoading = true;
        this.http
            .get<any>(environment.url + "GetDepartmentYoY_surgeries_dashborad")
            .subscribe(
                (response) => {
                    const raw = response && response.d != null ? response.d : response;
                    const list = Array.isArray(raw) ? raw : [];
                    this.departmentYoyData = list.map((r: any) => ({
                        Department: r.Department ?? r.department ?? "",
                        SurgeriesPerRoom_Current: Number(r.SurgeriesPerRoom_Current ?? r.surgeriesPerRoom_Current ?? 0),
                        AvgSurgeryTime_Current: Number(r.AvgSurgeryTime_Current ?? r.avgSurgeryTime_Current ?? 0),
                        AvgRevenue_Current: Number(r.AvgRevenue_Current ?? r.avgRevenue_Current ?? 0),
                        SurgeriesPerRoom_Prev: Number(r.SurgeriesPerRoom_Prev ?? r.surgeriesPerRoom_Prev ?? 0),
                        AvgSurgeryTime_Prev: Number(r.AvgSurgeryTime_Prev ?? r.avgSurgeryTime_Prev ?? 0),
                        AvgRevenue_Prev: Number(r.AvgRevenue_Prev ?? r.avgRevenue_Prev ?? 0),
                        SurgeriesPerRoom_Pct: r.SurgeriesPerRoom_Pct != null ? Number(r.SurgeriesPerRoom_Pct) : (r.surgeriesPerRoom_Pct != null ? Number(r.surgeriesPerRoom_Pct) : null),
                        AvgSurgeryTime_Pct: r.AvgSurgeryTime_Pct != null ? Number(r.AvgSurgeryTime_Pct) : (r.avgSurgeryTime_Pct != null ? Number(r.avgSurgeryTime_Pct) : null),
                        AvgRevenue_Pct: r.AvgRevenue_Pct != null ? Number(r.AvgRevenue_Pct) : (r.avgRevenue_Pct != null ? Number(r.avgRevenue_Pct) : null),
                    }));
                    this.updateChartData();
                    // במידה והמודל הגדול של מדד משולב פתוח – בונה גם את גרף Chart.js
                    if (this.showYoyCombinedFullModal) {
                        setTimeout(() => this.buildYoyCombinedChart(), 0);
                    }
                    this.scheduleYoyCombinedInlineBuild();
                },
                (error) => {
                    console.error("Error loading GetDepartmentYoY data:", error);
                    this.departmentYoyData = [];
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    this.cdr.detectChanges();
                }
            );
    }

    private isSurgeryRow(row: any): boolean {
        if (!row || typeof row !== 'object') return false;
        const r = row as Record<string, any>;
        return (
            r['תאריך'] != null || r['Date'] != null || r['חדר_ניתוח'] != null ||
            r['חדר ניתוח'] != null || r['SurgeryRoom'] != null || r['מספר_מקרה'] != null || r['CaseNumber'] != null
        );
    }

    private getUniqueSites(): string[] {
        const sites = [...new Set(this.surgeryData.map(s => s.site).filter(Boolean))] as string[];
        return ['כל האתרים', ...sites];
    }

    private computeFilterOptions(): void {
        // חדרים מתוך נתוני ניתוחים מפורטים (אם קיימים)
        const roomsFromSurgeries = this.surgeryData
            .map(s => s.surgeryRoom)
            .filter(Boolean) as string[];

        // חדרים מתוך נתוני CountByDept (SurgeryRoom) – כשעובדים רק עם ה‑API האגרגטיבי
        const roomsFromCountByDept = this.countByDeptData
            .map(r => (r as any).SurgeryRoom as string | undefined)
            .filter(Boolean) as string[];

        const rooms = [...new Set([...roomsFromSurgeries, ...roomsFromCountByDept])];
        this.roomOptions = rooms;

        const depts = [...new Set(this.surgeryData.map(s => (s.departmentMapped || s.department)).filter(Boolean))] as string[];
        this.departmentOptions = depts;

        const sites = [...new Set(this.surgeryData.map(s => s.site).filter(Boolean))] as string[];
        this.siteOptions = sites;
    }

    /**
     * ממפה ערך משמרת גולמי (שעה בפורמט HH:MM או טקסט) לתווית משמרת בעברית
     * כך שנוכל לסנן לפי "בוקר" / "ערב" / "לילה" גם אם בנתונים מופיעה שעה בלבד.
     */
    private getShiftLabel(rawShift: string | undefined | null): string | null {
        if (!rawShift) {
            return null;
        }

        const v = rawShift.trim();
        if (!v) {
            return null;
        }

        // אם כבר נשלח טקסט של משמרת – משתמש בו ישירות
        if (v === "בוקר" || v === "ערב" || v === "לילה") {
            return v;
        }

        // נסיון לפענח שעה בפורמט HH:MM
        const timeParts = v.split(":");
        if (timeParts.length >= 1) {
            const hour = parseInt(timeParts[0], 10);
            if (!isNaN(hour)) {
                if (hour >= 7 && hour < 15) {
                    return "בוקר";
                }
                if (hour >= 15 && hour < 23) {
                    return "ערב";
                }
                return "לילה";
            }
        }

        return null;
    }

    private applySurgeryFilter(list: SurgeryRow[]): SurgeryRow[] {
        let filtered = list;

        // אין סינון לפי אגף / אתר בדשבורד הניתוחים, אלא רק לפי מחלקות ופרמטרים אחרים

        // סוג ניתוח – מולטי, לפי "סוג ניתוח מאוחד"
        // אם אין ערך מאוחד (וגם לא מסוג ניתוח רגיל) – מתייחסים אליו כברירת מחדל כ"אלקטיבי"
        if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
            filtered = filtered.filter(s => {
                let unified = (s.unifiedSurgeryType || s.surgeryType) as string | undefined;
                if (!unified || unified.trim() === "") {
                    unified = "אלקטיבי";
                }
                return this.selectedSurgeryTypes.includes(unified);
            });
        }

        // משמרת – מולטי
        if (this.selectedShifts && this.selectedShifts.length > 0) {
            filtered = filtered.filter(s => {
                const label = this.getShiftLabel(s.shift as string | undefined);
                return !!label && this.selectedShifts.includes(label);
            });
        }

        // חדר – מולטי
        if (this.selectedRooms && this.selectedRooms.length > 0) {
            filtered = filtered.filter(s => this.selectedRooms.includes(s.surgeryRoom as string));
        }

        // מחלקה – מולטי
        if (this.selectedDepartments && this.selectedDepartments.length > 0) {
            filtered = filtered.filter(s =>
                this.selectedDepartments.includes((s.departmentMapped || s.department) as string)
            );
        }

        // יום (אמצע שבוע / סופ"ש) – מולטי
        if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
            filtered = filtered.filter(s => this.selectedWeekdays.includes(s.weekdayOrWeekend as string));
        }

        // אתר – מולטי
        if (this.selectedSites && this.selectedSites.length > 0) {
            filtered = filtered.filter(s => this.selectedSites.includes(s.site as string));
        }

        // עבודת בוקר (כן/לא)
        if (this.morningWorkFilter === "yes") {
            filtered = filtered.filter(s => {
                const shiftLabel = this.getShiftLabel(s.shift as string | undefined);
                const isMorning = shiftLabel === "בוקר";
                const isMidweek = s.weekdayOrWeekend === "אמצע שבוע";
                // הנחת עבודה: ימי חג אינם מסומנים כ"אמצע שבוע" במאפיין weekdayOrWeekend
                const isNotHoliday = isMidweek;
                return isMorning && isMidweek && isNotHoliday;
            });
        } else if (this.morningWorkFilter === "no") {
            filtered = filtered.filter(s => {
                const shiftLabel = this.getShiftLabel(s.shift as string | undefined);
                const isMorning = shiftLabel === "בוקר";
                const isMidweek = s.weekdayOrWeekend === "אמצע שבוע";
                const isNotHoliday = isMidweek;
                return !(isMorning && isMidweek && isNotHoliday);
            });
        }

        return filtered;
    }

    private calculateTopDepartmentsFromSurgeries(): void {
        const byRoom = new Map<string, number>();
        this.surgeryData.forEach(s => {
            const room = s.surgeryRoom || 'לא צוין';
            byRoom.set(room, (byRoom.get(room) || 0) + 1);
        });
        this.topDepartments = [...byRoom.entries()]
            .map(([name, count]) => ({
                DepartmentName: name,
                Income2024: 0,
                Income2025: count,
                difference: count,
                percentage: 0,
            }))
            .sort((a, b) => b.Income2025 - a.Income2025)
            .slice(0, 10);
    }

    /**
     * Load department income by selected diagnosis
     */

    onDiagnosisChange(event: any): void {
        // console.log("Selection changed to:", this.selectedDiagnosis);
        // console.log("Event:", event);
        // Show loading indicator when switching departments
        this.isMainDataLoading = true;
        this.isDataLoaded = false;
        this.loadDepartmentIncomeByDiagnosis();
    }

    loadDepartmentIncomeByDiagnosis(): void {
        if (this.surgeryData.length > 0) {
            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
            this.updateChartData();
            this.cdr.detectChanges();
            this.snackBar.open("✓ נתונים עודכנו", "סגור", { duration: 2000 });
            return;
        }
        // מצב ללא נתוני ניתוחים מפורטים – אין קריאה יותר ל־API של הכנסות
        this.isDataLoaded = true;
        this.isMainDataLoading = false;
    }

    /**
     * Load list of all diagnoses for dropdown filter
     * קורא לשרת רק אם עדיין אין רשימת אבחנות.
     */
    loadDiagnosesList(): void {
        if (this.diagnosesList.length > 0) {
            return;
        }
        this.isDiagnosesLoading = true;
        this.http.post(environment.url + "GetUniqueDiagnoses", {}).subscribe(
            (response: any) => {
                if (response && response.d) {
                    this.diagnosesList = response.d;
                    // Set default diagnosis if not set
                    if (!this.selectedDiagnosis && this.diagnosesList.length > 0) {
                        this.selectedDiagnosis = this.diagnosesList[0];
                    }
                  // Try to align with employee department if available
                  this.applyEmployeeDepartmentFilter();
                    this.isDiagnosesLoading = false;
                    this.cdr.detectChanges();
                } else {
                    this.isDiagnosesLoading = false;
                }
            },
            (error) => {
                console.error("Error loading diagnoses list:", error);
                this.isDiagnosesLoading = false;
                this.cdr.detectChanges();
            }
        );
    }

    /**
     * Toggle chart type between Column and Line
     */
    toggleChartType(): void {
        this.chartType = this.chartType === "ColumnChart" ? "LineChart" : "ColumnChart";
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
        } else if (this.chartType === "BarChart") {
            // Horizontal stacked columns
            this.chartOptions.bars = "horizontal";
            this.chartOptions.isStacked = false;
            this.chartOptions.bar = {
                groupWidth: "75%",
            };
            this.chartOptions.pointSize = undefined;
            this.chartOptions.lineWidth = undefined;
            this.chartOptions.curveType = undefined;
        } else {
            // Column chart specific options
            this.chartOptions.bars = "vertical";
            this.chartOptions.bar = {
                groupWidth: "75%",
            };
            this.chartOptions.isStacked = false;
            this.chartOptions.pointSize = undefined;
            this.chartOptions.lineWidth = undefined;
            this.chartOptions.curveType = undefined;
        }
    }

    /**
     * Update chart data with numbers formatted in millions with 1 decimal place
     */
    updateChartData(): void {
        // במצב ניצולת חדר ניתוח – טוענים גרף מיוחד ממוצע ניתוחים ליום בחדר
        if (this.mainMetricMode === "room-utilization") {
            this.loadRoomUtilizationMainChart();
            return;
        }

        // מתחילים מחזור חישוב חדש לגרף הראשי
        this.isChartLoading = true;
        this.isChartViewReady = false;
        this.yearsForChart = [];
        this.yearlySurgeryTotals = {};
        this.yearColorMap = [];
        this.chartTableRows = [];

        // מדד משולב – גרף YoY לפי מחלקה (ניתוחים לחדר, זמן ניתוח, הכנסה – % שינוי)
        if (this.chartViewMode === "yoy-combined") {
            let yoySource = this.departmentYoyData;
            if (this.chartDepartmentFilter) {
                yoySource = yoySource.filter(
                    (d) => (d.Department || "").trim() === this.chartDepartmentFilter
                );
            }
            this.chartColumns = [
                "מחלקה",
                { type: "number", label: "ניתוחים לחדר" },
                { type: "string", role: "annotation" },
                { type: "number", label: "זמן ניתוח" },
                { type: "string", role: "annotation" },
                { type: "number", label: "הכנסה ממוצעת" },
                { type: "string", role: "annotation" },
            ];
            this.chartData = yoySource.map((d) => {
                const s = d.SurgeriesPerRoom_Pct != null ? d.SurgeriesPerRoom_Pct : 0;
                const t = d.AvgSurgeryTime_Pct != null ? d.AvgSurgeryTime_Pct : 0;
                const r = d.AvgRevenue_Pct != null ? d.AvgRevenue_Pct : 0;
                return [
                    d.Department || "",
                    s,
                    this.formatPctShort(d.SurgeriesPerRoom_Pct),
                    t,
                    this.formatPctShort(d.AvgSurgeryTime_Pct),
                    r,
                    this.formatPctShort(d.AvgRevenue_Pct),
                ];
            });
            this.chartType = "BarChart";
            this.chartOptions = {
                ...this.chartOptions,
                title: "מדד משולב – השוואה לשנה שעברה (%)",
                bars: "horizontal",
                isStacked: false,
                colors: ["#228B22", "#FF8C00", "#008B8B"],
                // תוויות אחוזים בקצה כל עמודה – ימינה לחיובי, שמאלה לשלילי
                annotations: {
                    alwaysOutside: true,
                    textStyle: {
                        fontSize: 10,
                        rotation: -90, 
                        bold: true
                    }
                },
                hAxis: {
                    viewWindow: { min: -100, max: 200 },
                    format: "#\'%\'",
                    title: "% שינוי",
                    textStyle: this.chartOptions?.hAxis?.textStyle || {},
                },
                vAxis: {
                    title: "מחלקה",
                    textStyle: this.chartOptions?.vAxis?.textStyle || {},
                },
                legend: {
                    position: "bottom",
                    alignment: "center",
                },
                chartArea: {
                    width: '90%',
                    height: '60%', // הקטנו מ-78% כדי לתת מקום לטקסט למעלה
                    left: 40,
                    top: 50, // הגדלנו מ-12 כדי שהטקסט המסובב לא ייחתך
                },
            };
            this.yearColorMap = [];
            this.stackedCategoryLegend = [];
            this.chartTableRows = yoySource.map((d) => ({
                label: d.Department || "",
                total: 0,
                perYear: {},
                pct: [d.SurgeriesPerRoom_Pct, d.AvgSurgeryTime_Pct, d.AvgRevenue_Pct]
                    .filter((v) => v != null)
                    .map((v) => v + "%")
                    .join(" / "),
            }));
            // Note: in the main panel, YoY-combined is rendered with Chart.js (canvas),
            // so Google-chart tooltips are not relevant here.
            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        // לכל שאר המצבים – להחזיר צירים לגרף כמותי רגיל (לא אחוזים)
        this.chartOptions = {
            ...this.chartOptions,
            hAxis: {
                ...(this.chartOptions.hAxis || {}),
                viewWindow: undefined,
                format: undefined,
                title: this.chartOptions.hAxis?.title || "",
            },
            vAxis: {
                ...(this.chartOptions.vAxis || {}),
                title: this.chartOptions.vAxis?.title || "",
            },
            chartArea: {
                ...(this.chartOptions.chartArea || {}),
                left: this.chartOptions.chartArea?.left ?? 60,
                top: this.chartOptions.chartArea?.top ?? 40,
                bottom: this.chartOptions.chartArea?.bottom ?? 40,
                width: this.chartOptions.chartArea?.width ?? "70%",
                height: this.chartOptions.chartArea?.height ?? "70%",
            },
        };

        // 1) מקור ראשי לגרף: GetCountByDept (5 שנים אחרונות לפי מחלקה)
        //    מכאן נגזרים כל מצבי התצוגה שמבוססים על ספירות (שנה, מחלקה, אתר, משמרת).
        if (this.countByDeptData && this.countByDeptData.length > 0) {
            let source: CountByDeptRow[] = this.countByDeptData;

            // פילטרים כלליים: סוג ניתוח, חדר, מחלקה, יום בשבוע, עבודת בוקר
            if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
                source = source.filter((r) => {
                    let unified = (r.UnifiedSurgeryType || "").trim();
                    if (!unified) unified = "אלקטיבי";
                    return this.selectedSurgeryTypes.includes(unified);
                });
            }

            // במשמרת – לא מפלטרים כאשר הגרף עצמו מוצג לפי משמרת
            if (!this.isShiftGroupedView && this.selectedShifts && this.selectedShifts.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.Shift &&
                        this.selectedShifts.includes(r.Shift.trim())
                );
            }

            if (this.selectedRooms && this.selectedRooms.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.SurgeryRoom &&
                        this.selectedRooms.includes(r.SurgeryRoom.trim())
                );
            }

            // עבודת בוקר (כן/לא) – לפי Shift + WeekPart גם בנתוני CountByDept
            if (this.morningWorkFilter === "yes") {
                source = source.filter((r) => {
                    const shift = (r.Shift || "").trim();
                    const weekPart = (r.WeekPart || "").trim();
                    const isMorning = shift === "בוקר";
                    const isMidweek = weekPart === "אמצע שבוע";
                    return isMorning && isMidweek;
                });
            } else if (this.morningWorkFilter === "no") {
                source = source.filter((r) => {
                    const shift = (r.Shift || "").trim();
                    const weekPart = (r.WeekPart || "").trim();
                    const isMorning = shift === "בוקר";
                    const isMidweek = weekPart === "אמצע שבוע";
                    return !(isMorning && isMidweek);
                });
            }

            // פילטר מחלקה לאזור הגרף: קודם פילטר ייעודי לגרף, אחרת פילטר מהסיידבר
            if (this.chartDepartmentFilter) {
                source = source.filter(
                    (r) => (r.Wing || "").trim() === this.chartDepartmentFilter
                );
            } else if (this.selectedDepartments && this.selectedDepartments.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.Wing &&
                        this.selectedDepartments.includes(r.Wing.trim())
                );
            }

            // פילטר אתר (Site) – מולטי
            if (this.selectedSites && this.selectedSites.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.Site &&
                        this.selectedSites.includes(r.Site.trim())
                );
            }

            if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.WeekPart &&
                        this.selectedWeekdays.includes(r.WeekPart.trim())
                );
            }

            if (!source || source.length === 0) {
                this.chartData = [];
                this.chartTableRows = [];
                this.isChartLoading = false;
                this.isChartViewReady = true;
                this.cdr.detectChanges();
                return;
            }

            // זיהוי שנים ייחודיות מתוך הנתונים, ממוינות מהישן לחדש
            const years = Array.from(new Set(source.map((r) => r.Year))).sort(
                (a, b) => a - b
            );

            if (years.length === 0) {
                this.chartData = [];
                this.chartTableRows = [];
                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }

            // חישוב סה"כ לפי שנה (בשימוש גם לכרטיסי הסיכום מעל הגרף)
            years.forEach((y) => {
                const sum = source
                    .filter((r) => r.Year === y)
                    .reduce((acc, r) => acc + (r.Count || 0), 0);
                this.yearlySurgeryTotals[y] = sum;
            });
            this.yearsForChart = years;

            // === מצב 1: סה"כ ניתוחים לפי שנה (ברירת מחדל) ===
            if (this.chartViewMode === "year-total") {
                // גרף: שנה × סה"כ
                this.chartColumns = [
                    "שנה",
                    { type: "number", label: "סה\"כ ניתוחים" },
                    { type: "string", role: "annotation" },
                ];
                this.chartData = years.map((y) => {
                    const val = this.yearlySurgeryTotals[y] || 0;
                    return [
                        y.toString(),
                        val,
                        val > 0 ? this.formatNumber(val) : "",
                    ];
                });

                this.yearColorMap = []; // אין מקרא צבעים לפי שנה במצב זה
                this.stackedCategoryLegend = [];

                // טבלה: שורה אחת "סה\"כ", עמודות שנים + סה"כ + הפרש / אחוז
                const perYear: { [year: number]: number } = {};
                let grandTotal = 0;
                years.forEach((y) => {
                    const v = this.yearlySurgeryTotals[y] || 0;
                    perYear[y] = v;
                    grandTotal += v;
                });

                const { diff, pct } = this.computeDiffAndPct(perYear, years);
                this.chartTableRows = [
                    {
                        label: "סה\"כ",
                        perYear,
                        total: grandTotal,
                        diff,
                        pct,
                    },
                ];

                const grandTotalLabel = this.formatNumber(this.getCurrentChartGrandTotal());
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabel}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר ניתוחים",
                };
                this.chartOptions.isStacked = false;
                this.isChartLoading = false;
                this.isChartViewReady = true;
                this.cdr.detectChanges();
                return;
            }

            // מיפוי מחלקה מנתחת מאוגד (Wing) -> שנה -> כמות (בשימוש במצב 'department')
            const byWingYear = new Map<string, Map<number, number>>();
            source.forEach((row) => {
                const wing = (row.Wing || row.Department || "לא צוין").trim();
                if (!byWingYear.has(wing)) {
                    byWingYear.set(wing, new Map<number, number>());
                }
                const inner = byWingYear.get(wing)!;
                inner.set(row.Year, (inner.get(row.Year) || 0) + (row.Count || 0));
            });

            // === מצב 2: סה"כ לפי מחלקה (הגרף הקיים, ממוין מהגדול לקטן) ===
            const yearsForDept = years;
            if (this.chartViewMode === "department") {
                const dynamicColumns: any[] = ["מחלקה"];
                yearsForDept.forEach((y) => {
                    dynamicColumns.push({ type: "number", label: y.toString() });
                    dynamicColumns.push({ type: "string", role: "annotation" });
                });
                this.chartColumns = dynamicColumns;

                const rows: { label: string; total: number; row: any[]; perYear: { [year: number]: number } }[] = [];

                byWingYear.forEach((yearMap, wing) => {
                    const row: any[] = [wing];
                    let total = 0;
                    const perYear: { [year: number]: number } = {};
                    yearsForDept.forEach((y) => {
                        const cnt = yearMap.get(y) || 0;
                        total += cnt;
                        perYear[y] = cnt;
                        row.push(cnt, cnt > 0 ? String(cnt) : "");
                    });
                    rows.push({ label: wing, total, row, perYear });
                });

                // מיון מהגדול לקטן לפי סה"כ ניתוחים
                rows.sort((a, b) => b.total - a.total);

                this.chartData = rows.map((r) => r.row);

                // טבלה: אותה ישות כמו בגרף, עם הפרש / אחוז בין שתי השנים האחרונות
                this.chartTableRows = rows.map((r) => {
                    const { diff, pct } = this.computeDiffAndPct(r.perYear, yearsForDept);
                    return {
                        label: r.label,
                        total: r.total,
                        perYear: r.perYear,
                        diff,
                        pct,
                    };
                });

                this.updateColorsForYears(yearsForDept);
                this.stackedCategoryLegend = [];
                const firstYear = yearsForDept[0];
                const lastYear = yearsForDept[yearsForDept.length - 1];
                const grandTotalLabelDept = this.formatNumber(this.getCurrentChartGrandTotal());
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelDept}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "מחלקה מנתחת מאוגד",
                };
                this.chartOptions.isStacked = false;

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }

            // === מצב 3: לפי אתר – שנה מול אתרים (stacked אופקי עם מקרא מותאם) ===
            if (this.chartViewMode === "site") {
                const bySiteYear = new Map<string, Map<number, number>>();
                source.forEach((r) => {
                    const site = (r.Site || "").trim();
                    if (!site) return;
                    if (!bySiteYear.has(site)) {
                        bySiteYear.set(site, new Map<number, number>());
                    }
                    const inner = bySiteYear.get(site)!;
                    inner.set(r.Year, (inner.get(r.Year) || 0) + (r.Count || 0));
                });

                const sitesUnsorted = Array.from(bySiteYear.keys());
                const sites = sitesUnsorted.slice().sort((a, b) => {
                    const totalA = years.reduce((sum, y) => sum + (bySiteYear.get(a)?.get(y) || 0), 0);
                    const totalB = years.reduce((sum, y) => sum + (bySiteYear.get(b)?.get(y) || 0), 0);
                    return totalB - totalA;
                });

                if (sites.length === 0) {
                    this.chartData = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                    return;
                }

                const columns: any[] = ["שנה"];
                sites.forEach((site) => {
                    columns.push({ type: "number", label: site });
                    columns.push({ type: "string", role: "annotation" });
                });
                // עמודת buffer שקופה + עמודת סה"כ וירטואלית מעל העמודה
                columns.push({ type: "number", role: "data" });    // buffer
                columns.push({ type: "string", role: "annotation" });
                columns.push({ type: "number", role: "data" });    // total
                columns.push({ type: "string", role: "annotation" });
                this.chartColumns = columns;

                // גרף: שנה × אתר (גדול למטה – הסדר ממוין לפי סה"כ יורד)
                this.chartData = years.map((y) => {
                    const row: any[] = [y.toString()];
                    let yearGrandTotal = 0;

                    // חישוב סה"כ שנתי לכל שנה
                    sites.forEach((site) => {
                        yearGrandTotal += bySiteYear.get(site)?.get(y) || 0;
                    });

                    sites.forEach((site) => {
                        const sumForSite = bySiteYear.get(site)?.get(y) || 0;
                        row.push(
                            sumForSite,
                            sumForSite > 0 ? this.formatNumber(sumForSite) : null
                        );
                    });

                    // buffer שקוף קטן ליצירת רווח בין ראש העמודה לסה"כ
                    const buffer = yearGrandTotal * 0.02;
                    row.push(buffer, null);

                    // סה"כ לכל השנה – ערך 0 כדי לא להוסיף גובה, רק תווית למעלה
                    row.push(0, this.formatNumber(yearGrandTotal));
                    return row;
                });

                this.yearColorMap = [];

                // צבעים קבועים לכל אתר + מקרא קטגוריות
                const palette = this.yearPalette;
                const colors: string[] = [];
                this.stackedCategoryLegend = sites.map((site, idx) => {
                    const color = palette[idx % palette.length];
                    colors.push(color);
                    return { label: site, color };
                });
                this.chartOptions.colors = colors;

                // טבלה: שורות לפי אתרים, עמודות שנים ועמודת הפרש / אחוז שינוי בין השנים האחרונות
                this.chartTableRows = sites.map((site) => {
                    const perYear: { [year: number]: number } = {};
                    let total = 0;
                    years.forEach((y) => {
                        const yearMap = bySiteYear.get(site);
                        const cnt = yearMap ? yearMap.get(y) || 0 : 0;
                        perYear[y] = cnt;
                        total += cnt;
                    });
                    const { diff, pct } = this.computeDiffAndPct(perYear, years);
                    return {
                        label: site,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });

                const grandTotalLabelSite = this.formatNumber(this.getCurrentChartGrandTotal());
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelSite}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר ניתוחים",
                };
                // תצוגה: עמודה אחת לשנה, מחולקת לצבעים לפי אתר (stacked)
                this.chartOptions.isStacked = true;
                // תצוגת תוויות: פונט גדול וברור, Google יחליט אם בפנים או בחוץ
                this.chartOptions.annotations = {
                    ...(this.chartOptions.annotations || {}),
                    alwaysOutside: false,
                    textStyle: {
                        fontSize: 22,
                        bold: true,
                        auraColor: "none",
                        ...(this.chartOptions.annotations?.textStyle || {}),
                    },
                    stem: {
                        color: "#64748b",
                        length: 12,
                    },
                };
                // תצוגה פר-סדרה: חלקי הערימה + buffer + סה"כ וירטואלי
                const siteSeries: Record<number, any> = {};
                // חלקי הערימה – טקסט לבן עם highContrast בתוך העמודה
                sites.forEach((_, idx) => {
                    siteSeries[idx] = {
                        annotations: {
                            textStyle: { color: "#ffffff" },
                            highContrast: true,
                        },
                    };
                });
                const bufferIndex = sites.length;
                const totalIndex = sites.length + 1;
                // buffer – שקוף לחלוטין
                siteSeries[bufferIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                };
                // סה"כ – שקוף, אבל תווית מודגשת מעל עם רווח
                siteSeries[totalIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                    tooltip: "none",
                    annotations: {
                        alwaysOutside: true,
                        stem: { length: 0 },
                        textStyle: {
                            fontSize: 16,
                            bold: true,
                            color: "#1e293b",
                        },
                    },
                };
                this.chartOptions.series = {
                    ...(this.chartOptions.series || {}),
                    ...siteSeries,
                };

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }

            // === מצב 4: לפי משמרת – שנה מול משמרת (בוקר/ערב/לילה) ===
            if (this.chartViewMode === "shift") {
                const byShiftYear = new Map<string, Map<number, number>>();
                source.forEach((r) => {
                    const shift = (r.Shift || "").trim();
                    if (!shift) return;
                    if (!byShiftYear.has(shift)) {
                        byShiftYear.set(shift, new Map<number, number>());
                    }
                    const inner = byShiftYear.get(shift)!;
                    inner.set(r.Year, (inner.get(r.Year) || 0) + (r.Count || 0));
                });

                const shiftsUnsorted = Array.from(byShiftYear.keys());
                const shifts = shiftsUnsorted.slice().sort((a, b) => {
                    const totalA = years.reduce((sum, y) => sum + (byShiftYear.get(a)?.get(y) || 0), 0);
                    const totalB = years.reduce((sum, y) => sum + (byShiftYear.get(b)?.get(y) || 0), 0);
                    return totalB - totalA;
                });

                if (shifts.length === 0) {
                    this.chartData = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                    return;
                }

                const columns: any[] = ["שנה"];
                shifts.forEach((shift) => {
                    columns.push({ type: "number", label: shift });
                    columns.push({ type: "string", role: "annotation" });
                });
                // עמודת buffer שקופה + עמודת סה"כ וירטואלית מעל העמודה
                columns.push({ type: "number", role: "data" });    // buffer
                columns.push({ type: "string", role: "annotation" });
                columns.push({ type: "number", role: "data" });    // total
                columns.push({ type: "string", role: "annotation" });
                this.chartColumns = columns;

                // גרף: שנה × משמרת (גדול למטה – הסדר ממוין לפי סה"כ יורד)
                this.chartData = years.map((y) => {
                    const row: any[] = [y.toString()];
                    let yearGrandTotal = 0;

                    // חישוב סה"כ שנתי לכל שנה
                    shifts.forEach((shift) => {
                        yearGrandTotal += byShiftYear.get(shift)?.get(y) || 0;
                    });

                    shifts.forEach((shift) => {
                        const sumForShift = byShiftYear.get(shift)?.get(y) || 0;
                        row.push(
                            sumForShift,
                            sumForShift > 0 ? this.formatNumber(sumForShift) : null
                        );
                    });

                    const buffer = yearGrandTotal * 0.02;
                    row.push(buffer, null);

                    // סה"כ לכל השנה – ערך 0 כדי לא להוסיף גובה, רק תווית למעלה
                    row.push(0, this.formatNumber(yearGrandTotal));
                    return row;
                });

                this.yearColorMap = [];

                // צבעים קבועים לכל משמרת + מקרא קטגוריות
                const palette = this.yearPalette;
                const colors: string[] = [];
                this.stackedCategoryLegend = shifts.map((shift, idx) => {
                    const color = palette[idx % palette.length];
                    colors.push(color);
                    return { label: shift, color };
                });
                this.chartOptions.colors = colors;

                // טבלה: שורות לפי משמרת, עמודות שנים ועמודת הפרש / אחוז
                this.chartTableRows = shifts.map((shift) => {
                    const perYear: { [year: number]: number } = {};
                    let total = 0;
                    years.forEach((y) => {
                        const yearMap = byShiftYear.get(shift);
                        const cnt = yearMap ? yearMap.get(y) || 0 : 0;
                        perYear[y] = cnt;
                        total += cnt;
                    });
                    const { diff, pct } = this.computeDiffAndPct(perYear, years);
                    return {
                        label: shift,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });
                const grandTotalLabelShift = this.formatNumber(this.getCurrentChartGrandTotal());
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelShift}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר ניתוחים",
                };
                // תצוגה: עמודה אחת לשנה, מחולקת לצבעים לפי משמרת (stacked)
                this.chartOptions.isStacked = true;
                this.chartOptions.annotations = {
                    ...(this.chartOptions.annotations || {}),
                    alwaysOutside: false,
                    textStyle: {
                        fontSize: 22,
                        bold: true,
                        auraColor: "none",
                        ...(this.chartOptions.annotations?.textStyle || {}),
                    },
                    stem: {
                        color: "#64748b",
                        length: 12,
                    },
                };
                const shiftSeries: Record<number, any> = {};
                shifts.forEach((_, idx) => {
                    shiftSeries[idx] = {
                        annotations: {
                            textStyle: { color: "#ffffff" },
                            highContrast: true,
                        },
                    };
                });
                const shiftBufferIndex = shifts.length;
                const shiftTotalIndex = shifts.length + 1;
                shiftSeries[shiftBufferIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                };
                shiftSeries[shiftTotalIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                    tooltip: "none",
                    annotations: {
                        alwaysOutside: true,
                        stem: { length: 0 },
                        textStyle: {
                            fontSize: 16,
                            bold: true,
                            color: "#1e293b",
                        },
                    },
                };
                this.chartOptions.series = {
                    ...(this.chartOptions.series || {}),
                    ...shiftSeries,
                };

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }
            if (this.chartViewMode === 'fund') {
                const byFundYear = new Map<string, Map<number, number>>();
              
                source.forEach(r => {
                  const fund = (r.FundType || 'לא ידוע').trim() || 'לא ידוע';
                  if (!byFundYear.has(fund)) byFundYear.set(fund, new Map());
                  const m = byFundYear.get(fund)!;
                  m.set(r.Year, (m.get(r.Year) || 0) + (r.Count || 0));
                });
              
                const fundTypesUnsorted = Array.from(byFundYear.keys());
                const preferredFundOrder: string[] = ['ביה\"ח', 'קרן', 'לא ידוע'];
                const remainingFundTypes = fundTypesUnsorted.filter(ft => !preferredFundOrder.includes(ft));
                const fundTypes: string[] = [
                    ...preferredFundOrder.filter(ft => fundTypesUnsorted.includes(ft)),
                    ...remainingFundTypes,
                ];
                const columns: any[] = ['שנה'];
                fundTypes.forEach(ft => {
                    columns.push({ type: 'number', label: ft });
                    columns.push({ type: 'string', role: 'annotation' });
                });
                // עמודת buffer שקופה + עמודת סה"כ וירטואלית מעל העמודה
                columns.push({ type: 'number', role: 'data' });    // buffer
                columns.push({ type: 'string', role: 'annotation' });
                columns.push({ type: 'number', role: 'data' });    // total
                columns.push({ type: 'string', role: 'annotation' });
                this.chartColumns = columns;

                this.chartData = years.map(y => {
                  const row: any[] = [y.toString()];
                  let yearGrandTotal = 0;

                  // חישוב סה"כ שנתי לכל שנה
                  fundTypes.forEach(ft => {
                    yearGrandTotal += byFundYear.get(ft)?.get(y) || 0;
                  });

                  fundTypes.forEach(ft => {
                    const val = byFundYear.get(ft)?.get(y) || 0;
                    row.push(
                      val,
                      val > 0 ? this.formatNumber(val) : null
                    );
                  });

                  const buffer = yearGrandTotal * 0.02;
                  row.push(buffer, null);

                  // סה"כ לכל השנה – ערך 0 כדי לא להוסיף גובה, רק תווית למעלה
                  row.push(0, this.formatNumber(yearGrandTotal));
                  return row;
                });
              
                this.chartTableRows = fundTypes.map(fund => {
                  const perYear: { [y: number]: number } = {};
                  let total = 0;
                  years.forEach(y => { const v = byFundYear.get(fund)?.get(y) || 0; perYear[y] = v; total += v; });
                  const { diff, pct } = this.computeDiffAndPct(perYear, years);
                  return { label: fund, total, perYear, diff, pct };
                });
              
                const grandTotalLabelFund = this.formatNumber(this.getCurrentChartGrandTotal());
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelFund}`;

                // צבעים קבועים לכל סוג מימון + מקרא קטגוריות
                const palette = this.yearPalette;
                const colors: string[] = [];
                this.stackedCategoryLegend = fundTypes.map((fund, idx) => {
                    const color = palette[idx % palette.length];
                    colors.push(color);
                    return { label: fund, color };
                });
                this.chartOptions.colors = colors;
                this.chartOptions.isStacked = true;
                this.chartOptions.annotations = {
                    ...(this.chartOptions.annotations || {}),
                    alwaysOutside: false,
                    textStyle: {
                        fontSize: 14,
                        bold: true,
                        auraColor: "none",
                        ...(this.chartOptions.annotations?.textStyle || {}),
                    },
                    stem: {
                        color: "#64748b",
                        length: 12,
                    },
                };
                const fundSeries: Record<number, any> = {};
                fundTypes.forEach((_, idx) => {
                    fundSeries[idx] = {
                        annotations: {
                            textStyle: { color: "#ffffff" },
                            highContrast: true,
                        },
                    };
                });
                const fundBufferIndex = fundTypes.length;
                const fundTotalIndex = fundTypes.length + 1;
                fundSeries[fundBufferIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                };
                fundSeries[fundTotalIndex] = {
                    color: "transparent",
                    enableInteractivity: false,
                    visibleInLegend: false,
                    tooltip: "none",
                    annotations: {
                        alwaysOutside: true,
                        stem: { length: 0 },
                        textStyle: {
                            fontSize: 16,
                            bold: true,
                            color: "#1e293b",
                        },
                    },
                };
                this.chartOptions.series = {
                    ...(this.chartOptions.series || {}),
                    ...fundSeries,
                };

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
              }
            // === מצב 5: קרן/מדינה – ייבנה מתוך רשימת ניתוחים גולמיים (אם קיימת) ===
            // כאן לא משתמשים ב‑CountByDept, ולכן אם הגענו לכאן, נעבור לענף הבא.
        }

        // 2) נתוני ניתוחים גולמיים – משמשים:
        //    א. כ‑fallback כללי כאשר אין נתוני CountByDept
        //    ב. לתצוגת קרן/מדינה (chartViewMode === 'fund')
        // 2) במצב "חודשים" נעדיף תמיד את ה‑API החדש GetMonthlyCounts_surgeries_dashborad
        if (this.chartViewMode === "month") {
            if (!this.monthlyCountsData || this.monthlyCountsData.length === 0) {
                if (!this.monthlyCountsRequestInFlight) {
                    this.loadMonthlyCounts();
                }
                return;
            }

            // שנים רלוונטיות וחודשים 1–12
            const years = Array.from(
                new Set(this.monthlyCountsData.map((r) => r.Year))
            ).sort((a, b) => a - b);
            const months = Array.from({ length: 12 }, (_, idx) => idx + 1);

            const monthNames = [
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

            // מיפוי חודש -> שנה -> כמות ניתוחים
            const byMonthYear = new Map<number, Map<number, number>>();
            this.monthlyCountsData.forEach((row) => {
                if (!years.includes(row.Year)) {
                    return;
                }
                if (!byMonthYear.has(row.Month)) {
                    byMonthYear.set(row.Month, new Map<number, number>());
                }
                const inner = byMonthYear.get(row.Month)!;
                inner.set(row.Year, (inner.get(row.Year) || 0) + (row.Count || 0));
            });

            // עמודות: חודש + עבור כל שנה ערך + אנוטציה
            const cols: any[] = ["חודש"];
            years.forEach((y) => {
                cols.push({ type: "number", label: y.toString() });
                cols.push({ type: "string", role: "annotation" });
            });
            this.chartColumns = cols;

            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonthIdx = today.getMonth(); // 0‑based

            this.chartData = months.map((m) => {
                const label = monthNames[m - 1];
                const row: any[] = [label];
                const monthMap = byMonthYear.get(m) || new Map<number, number>();

                // ממוצע היסטורי לחודש זה (ללא השנה הנוכחית)
                const prevYears = years.filter((y) => y !== currentYear);
                let histSum = 0;
                let histCount = 0;
                prevYears.forEach((y) => {
                    const v = monthMap.get(y) || 0;
                    if (v > 0) {
                        histSum += v;
                        histCount++;
                    }
                });
                const histAvg = histCount > 0 ? histSum / histCount : 0;

                years.forEach((y) => {
                    let val = monthMap.get(y) || 0;
                    let annotation = "";

                    const isFutureMonthOfCurrentYear =
                        y === currentYear && m - 1 > currentMonthIdx;

                    if (isFutureMonthOfCurrentYear) {
                        // לא מציגים ערך בפועל, רק ממוצע היסטורי כאנוטציה
                        val = 0;
                        if (histAvg > 0) {
                            annotation = `≈ ${this.formatNumber(Math.round(histAvg))}`;
                        }
                    } else if (val > 0) {
                        annotation = this.formatNumber(val);
                    }

                    row.push(val, annotation);
                });

                return row;
            });

            // טבלה: שורות לפי חודש, עמודות שנים והפרש / אחוז שינוי
            const tableRows: {
                label: string;
                perYear: { [year: number]: number };
                total: number;
                diff: number;
                pct: string;
                isFuture?: boolean;
            }[] = [];

            months.forEach((m) => {
                const label = monthNames[m - 1];
                const monthMap = byMonthYear.get(m) || new Map<number, number>();
                const perYear: { [year: number]: number } = {};
                let total = 0;
                years.forEach((y) => {
                    const v = monthMap.get(y) || 0;
                    perYear[y] = v;
                    total += v;
                });
                    const { diff, pct } = this.computeDiffAndPct(perYear, years);

                    const isFuture =
                        years.includes(currentYear) && m - 1 > currentMonthIdx;

                    tableRows.push({
                        label,
                        perYear,
                        total,
                        diff: isFuture ? 0 : diff,
                        pct: isFuture ? "" : pct,
                        isFuture,
                    });
            });

            this.chartTableRows = tableRows;
            this.updateColorsForYears(years);
            this.stackedCategoryLegend = [];
            this.chartOptions.title = "";
            this.chartOptions.hAxis = {
                ...(this.chartOptions.hAxis || {}),
                title: "חודש",
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                title: "מספר ניתוחים",
            };
            this.chartOptions.isStacked = false;

            this.isChartLoading = false;
            this.isChartViewReady = true;
            this.cdr.detectChanges();
            return;
        }

        if (this.surgeryData.length > 0) {
            const list = this.dataSource.data as SurgeryRow[];

            const currentYear = new Date().getFullYear();
            const today = new Date();
            // נציג תמיד רק חודשים שהסתיימו במלואם בכל השנים (YTD לפי חודשים שלמים)
            // לדוגמה: אם עכשיו מרץ → cutoffMonth = פברואר → מוצגים ינואר+פברואר בכל השנים
            let cutoffMonth = today.getMonth() - 1;
            if (cutoffMonth < 0) {
                cutoffMonth = 0;
            }
            const years: number[] = [];
            for (let i = 4; i >= 0; i--) {
                years.push(currentYear - i);
            }

            const byDeptYear = new Map<string, Map<number, number>>();

            list.forEach((s) => {
                const dept = (s.departmentMapped || s.department || "לא צוין").trim();
                const parts = this.parseDateParts(s.date);
                if (!parts) {
                    return;
                }

                const { year, month } = parts;

                // רק שנים בחלון 5 השנים האחרונות
                if (!years.includes(year)) {
                    return;
                }

                // יישור תקופה לפי חודשים שלמים:
                // אם החודש גדול מחודש החיתוך (cutoffMonth) → אותו חודש עדיין "בעתיד" ביחס לשנת הבסיס
                if (month > cutoffMonth) {
                    return;
                }

                if (!byDeptYear.has(dept)) {
                    byDeptYear.set(dept, new Map<number, number>());
                }
                const inner = byDeptYear.get(dept)!;
                inner.set(year, (inner.get(year) || 0) + 1);
            });

            // אם מצב התצוגה הוא "קרן/מדינה" – נבנה את הגרף לפי שנה מול סוג מימון.
            if (this.chartViewMode === "fund") {
                // נניח שקיים שדה "קרן/מדינה" או FundType כלשהו במבנה הדינמי של הנתונים.
                // אם לא קיים – פשוט לא יוצג גרף (ללא שבירה).
                const fundByYear = new Map<number, Map<string, number>>();
                const fundTypesSet = new Set<string>();

                list.forEach((s) => {
                    const parts = this.parseDateParts(s.date);
                    if (!parts) return;
                    const year = parts.year;

                    // נסיון לקרוא סוג מימון ממפתחות אפשריים, ואם לא – "אחר"
                    const raw: any = s as any;
                    const fundRaw =
                        raw["קרן/מדינה"] ??
                        raw["FundType"] ??
                        raw["Fund"] ??
                        raw["FundingType"];
                    const fund: string = (fundRaw || "לא ידוע").toString().trim() || "לא ידוע";

                    if (!fundByYear.has(year)) {
                        fundByYear.set(year, new Map<string, number>());
                    }
                    const inner = fundByYear.get(year)!;
                    inner.set(fund, (inner.get(fund) || 0) + 1);
                    fundTypesSet.add(fund);
                });

                const yearsArr = Array.from(fundByYear.keys()).sort((a, b) => a - b);
                const fundTypesUnsorted = Array.from(fundTypesSet.values());
                const preferredFundOrder: string[] = ['ביה\"ח', 'קרן', 'לא ידוע'];
                const remainingFundTypes = fundTypesUnsorted.filter(ft => !preferredFundOrder.includes(ft)).sort();
                const fundTypes: string[] = [
                    ...preferredFundOrder.filter(ft => fundTypesUnsorted.includes(ft)),
                    ...remainingFundTypes,
                ];

                if (yearsArr.length === 0 || fundTypes.length === 0) {
                    this.chartData = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                    return;
                }

                this.yearsForChart = yearsArr;
                this.chartColumns = ["שנה", ...fundTypes];

                // גרף: שנה × סוג מימון (קרן / מדינה / אחר)
                this.chartData = yearsArr.map((y) => {
                    const row: any[] = [y.toString()];
                    const inner = fundByYear.get(y)!;
                    fundTypes.forEach((ft) => {
                        row.push(inner.get(ft) || 0);
                    });
                    return row;
                });

                this.yearColorMap = [];

                // טבלה: שורות לפי סוגי מימון, עמודות שנים ועמודת הפרש / אחוז
                const byFundYear = new Map<string, Map<number, number>>();
                fundByYear.forEach((inner, year) => {
                    inner.forEach((cnt, fund) => {
                        if (!byFundYear.has(fund)) {
                            byFundYear.set(fund, new Map<number, number>());
                        }
                        const m = byFundYear.get(fund)!;
                        m.set(year, (m.get(year) || 0) + cnt);
                    });
                });

                this.chartTableRows = fundTypes.map((fund) => {
                    const perYear: { [year: number]: number } = {};
                    let total = 0;
                    yearsArr.forEach((y) => {
                        const yearMap = byFundYear.get(fund);
                        const cnt = yearMap ? yearMap.get(y) || 0 : 0;
                        perYear[y] = cnt;
                        total += cnt;
                    });
                    const { diff, pct } = this.computeDiffAndPct(perYear, yearsArr);
                    return {
                        label: fund,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });
                this.chartOptions.title = "";
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר ניתוחים",
                };
                // תצוגה: עמודה אחת לשנה, מחולקת לצבעים לפי סוג מימון (stacked)
                this.chartOptions.isStacked = true;

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }

            // Fallback כללי – התנהגות קודמת: מחלקות לאורך הציר, ממוין מהגדול לקטן
            const dynamicColumns: any[] = ["מחלקה"];
            years.forEach((y) => {
                dynamicColumns.push({ type: "number", label: y.toString() });
                dynamicColumns.push({ type: "string", role: "annotation" });
            });
            this.chartColumns = dynamicColumns;

            const rows: { label: string; total: number; row: any[]; perYear: { [year: number]: number } }[] = [];

            byDeptYear.forEach((yearMap, dept) => {
                const row: any[] = [dept];
                let total = 0;
                const perYear: { [year: number]: number } = {};

                years.forEach((y) => {
                    const cnt = yearMap.get(y) || 0;
                    total += cnt;
                    perYear[y] = cnt;
                    row.push(cnt, cnt > 0 ? String(cnt) : "");
                });

                rows.push({ label: dept, total, row, perYear });
            });

            rows.sort((a, b) => b.total - a.total);
            this.chartData = rows.map((r) => r.row);
            this.yearsForChart = years;
            this.updateColorsForYears(years);

            this.chartTableRows = rows.map((r) => {
                const { diff, pct } = this.computeDiffAndPct(r.perYear, years);
                return {
                    label: r.label,
                    total: r.total,
                    perYear: r.perYear,
                    diff,
                    pct,
                };
            });

            const firstYear = years[0];
            const lastYear = years[years.length - 1];
            this.chartOptions.title = "";

            this.isChartLoading = false;
            this.isChartViewReady = true;
            this.cdr.detectChanges();
            return;
        }

        if (!this.departmentIncomeData || this.departmentIncomeData.length === 0) {
            this.chartData = [];
            this.isChartLoading = false;
            this.isChartViewReady = true;
            return;
        }

        // Filter: include departments that have at least one year with positive income
        // This prevents the chart from disappearing when some departments have zero values
        const filtered = this.departmentIncomeData.filter((item) => {
            const has2024 = item.Income2024 && !isNaN(item.Income2024) && item.Income2024 > 0;
            const has2025 = item.Income2025 && !isNaN(item.Income2025) && item.Income2025 > 0;
            return has2024 || has2025; // Show if at least one year has data
        });
        
        // console.log("Filtered departments count:", filtered.length);
        // console.log("Filtered sample:", filtered.slice(0, 3).map(d => ({
        //     name: d.DepartmentName,
        //     Income2024: d.Income2024,
        //     Income2025: d.Income2025
        // })));

        this.chartData = filtered.map((item) => {
            const safe2024 =
                item.Income2024 && !isNaN(item.Income2024)
                    ? item.Income2024
                    : 0;
            const safe2025 =
                item.Income2025 && !isNaN(item.Income2025)
                    ? item.Income2025
                    : 0;

            const val2024 = parseFloat((safe2024 / 1000000).toFixed(1));
            const val2025 = parseFloat((safe2025 / 1000000).toFixed(1));

            const label2024 = val2024.toString() + "M";
            const label2025 = val2025.toString() + "M";

            return [
                item.DepartmentName,
                val2025,
                label2025,
                val2024,
                label2024,
            ];
        });

        // console.log("Final chartData:", this.chartData);
        // console.log("Chart data length:", this.chartData.length);
        if (this.chartData.length > 0) {
            // console.log("First chart row:", this.chartData[0]);
        }
        // Enhance Google-chart hover: show "what it means" + numeric value (avoid annotation noise)
        this.applyClearTooltipsToGoogleChart();

        this.isChartLoading = false;
        this.cdr.detectChanges();
    }

    private applyClearTooltipsToGoogleChart(): void {
        // Respect places where tooltip is explicitly disabled
        if ((this.chartOptions as any)?.tooltip === "none" || (this.chartOptions as any)?.tooltip?.trigger === "none") {
            return;
        }
        if (!this.chartColumns || !this.chartData || this.chartData.length === 0) {
            return;
        }

        const columns = Array.isArray(this.chartColumns) ? [...this.chartColumns] : this.chartColumns;
        const rows = Array.isArray(this.chartData) ? [...this.chartData] : this.chartData;
        if (!Array.isArray(columns) || !Array.isArray(rows)) {
            return;
        }

        const isPctChart = this.chartViewMode === "yoy-combined" ||
            (typeof (this.chartOptions as any)?.hAxis?.format === "string" && (this.chartOptions as any).hAxis.format.includes("%"));

        // Insert a tooltip column after each numeric series column (before its annotation, if exists).
        // This guarantees hover shows only: category + series label + value.
        const tooltipCol = { type: "string", role: "tooltip", p: { html: true } };

        // Build list of numeric series column indices in the *current* columns array.
        // We skip role-columns like annotations/tooltip.
        const numericSeries: { colIndex: number; label: string }[] = [];
        for (let i = 1; i < columns.length; i++) {
            const c = columns[i] as any;
            const isNumberCol = (typeof c === "object" && c?.type === "number") || c === "number";
            const isRole = typeof c === "object" && !!c?.role;
            if (isNumberCol && !isRole) {
                numericSeries.push({ colIndex: i, label: (typeof c === "object" && c?.label) ? String(c.label) : `Series ${i}` });
            }
        }
        if (numericSeries.length === 0) {
            return;
        }

        // Apply insertions from right to left to keep indices stable
        const insertAt: number[] = [];
        for (let k = 0; k < numericSeries.length; k++) {
            const idx = numericSeries[k].colIndex;
            const next = columns[idx + 1] as any;
            const nextIsTooltip = typeof next === "object" && next?.role === "tooltip";
            if (!nextIsTooltip) {
                insertAt.push(idx + 1);
            }
        }
        if (insertAt.length === 0) {
            return;
        }

        // Create a map from original numeric column index -> series label (before insertions)
        const labelByColIndex = new Map<number, string>();
        for (const s of numericSeries) {
            labelByColIndex.set(s.colIndex, s.label);
        }

        // Insert tooltip columns (right to left)
        insertAt.sort((a, b) => b - a).forEach((pos) => columns.splice(pos, 0, tooltipCol));

        // Update each row: insert tooltip strings at the same positions.
        const style = [
            "direction:rtl",
            "text-align:right",
            "padding:8px 10px",
            "font-weight:700",
            "font-size:13px",
        ].join(";");
        const subStyle = [
            "margin-top:4px",
            "font-weight:800",
            "font-size:12px",
            `color:${this.isDark ? "#e5e7eb" : "#0f172a"}`,
        ].join(";");

        const formatVal = (v: any) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return String(v ?? "");
            if (isPctChart) {
                const sign = n > 0 ? "+" : "";
                return `${sign}${n.toFixed(1)}%`;
            }
            return this.formatNumber(n);
        };

        this.chartData = rows.map((r: any[]) => {
            if (!Array.isArray(r)) return r;
            const nextRow = [...r];
            // category label is always column 0
            const category = String(nextRow[0] ?? "");

            // Because we inserted columns, we need to insert tooltip values at the same positions (right->left).
            // For each insertion position, the "value column" is pos-1 (numeric series).
            insertAt.sort((a, b) => b - a).forEach((pos) => {
                const valueColIdx = pos - 1;
                const seriesLabel = labelByColIndex.get(valueColIdx) ?? "ערך";
                const value = nextRow[valueColIdx];
                const html = `<div style="${style}"><div><b>${category}</b></div><div style="${subStyle}">${seriesLabel}: ${formatVal(value)}</div></div>`;
                nextRow.splice(pos, 0, html);
            });
            return nextRow;
        });

        this.chartColumns = columns;
        this.chartOptions = {
            ...this.chartOptions,
            tooltip: {
                ...(this.chartOptions?.tooltip || {}),
                isHtml: true,
                trigger: "focus",
                showColorCode: true,
            },
        };
    }

    /**
     * בודק אם יש פילטרים פעילים בדשבורד הניתוחים
     * (סוג ניתוח / משמרת / חדר / מחלקה / יום)
     */
    hasActiveSurgeryFilters(): boolean {
        return (
            (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) ||
            (this.selectedShifts && this.selectedShifts.length > 0) ||
            (this.selectedRooms && this.selectedRooms.length > 0) ||
            (this.selectedDepartments && this.selectedDepartments.length > 0) ||
            (this.selectedWeekdays && this.selectedWeekdays.length > 0) ||
            (this.selectedSites && this.selectedSites.length > 0) ||
            this.morningWorkFilter !== "all"
        );
    }

    private updateColorsForYears(years: number[]): void {
        if (!years || years.length === 0) {
            this.chartOptions.colors = this.chartOptions.colors || this.yearPalette.slice(0, 2);
            this.yearColorMap = [];
            return;
        }
        const colors: string[] = [];
        const map: { year: number; color: string }[] = [];
        years.forEach((y, idx) => {
            const color = this.yearPalette[idx % this.yearPalette.length];
            colors.push(color);
            map.push({ year: y, color });
        });
        this.chartOptions.colors = colors;
        this.yearColorMap = map;
    }

    /**
     * מחשב הפרש ואחוז שינוי בין השנה האחרונה לשנה הקודמת עבור שורת טבלה נתונה.
     */
    private computeDiffAndPct(
        perYear: { [year: number]: number },
        years: number[]
    ): { diff: number; pct: string } {
        if (!years || years.length < 2) {
            return { diff: 0, pct: "0%" };
        }
        const sorted = [...years].sort((a, b) => a - b);
        const latestYear = sorted[sorted.length - 1];
        const olderYear = sorted[sorted.length - 2];

        const newerVal = perYear[latestYear] || 0;
        const olderVal = perYear[olderYear] || 0;
        const diff = newerVal - olderVal;

        if (!olderVal) {
            return { diff, pct: newerVal ? "∞%" : "0%" };
        }
        const pct = ((diff / olderVal) * 100).toFixed(1) + "%";
        return { diff, pct };
    }

    // מצב תצוגה מלאה לגרף הראשי
    showMainChartFullModal = false;

    openMainChartFullModal(): void {
        if (!this.chartData || this.chartData.length === 0) {
            return;
        }
        this.showMainChartFullModal = true;
        this.cdr.detectChanges();
        setTimeout(() => {
            this.updateChartData();
            this.cdr.detectChanges();
        }, 150);
    }

    closeMainChartFullModal(): void {
        this.showMainChartFullModal = false;
    }

    /**
     * מחזיר הפרש ואחוז שינוי עבור שנה ספציפית בשורה (מול השנה הקודמת בעמודה).
     * אם אין שנה קודמת (העמודה הראשונה) או אם מדובר בחודש עתידי בשנה הנוכחית – מחזיר null.
     */
    getYearDiff(
        row: { perYear: { [year: number]: number }; isFuture?: boolean },
        year: number
    ): { diff: number; pct: string } | null {
        if (!this.yearsForChart || this.yearsForChart.length < 2) {
            return null;
        }

        const years = this.yearsForChart;
        const idx = years.indexOf(year);
        if (idx <= 0) {
            // אין שנה קודמת להשוואה (עמודה ראשונה)
            return null;
        }

        // בחודשים עתידיים בשנה הנוכחית לא מציגים הפרש / אחוז – נשאר עם הערך הבסיסי
        if (
            this.chartViewMode === "month" &&
            row.isFuture &&
            year === this.currentYear
        ) {
            return null;
        }

        const prevYear = years[idx - 1];
        const newerVal = row.perYear[year] || 0;
        const olderVal = row.perYear[prevYear] || 0;
        const diff = newerVal - olderVal;

        if (!olderVal) {
            return { diff, pct: newerVal ? "∞%" : "0%" };
        }

        const pct = ((diff / olderVal) * 100).toFixed(1) + "%";
        return { diff, pct };
    }

    /**
     * קובע את מחלקת הצבע לתא ספציפי בטבלה לפי כיוון השינוי.
     */
    getYearDiffClass(
        row: { perYear: { [year: number]: number }; isFuture?: boolean },
        year: number
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
            .filter((dept) => dept.Income2025 > dept.Income2024)
            .map((dept) => ({
                DepartmentName: dept.DepartmentName,
                Income2024: dept.Income2024,
                Income2025: dept.Income2025,
                difference: dept.Income2025 - dept.Income2024,
                percentage:
                    dept.Income2024 > 0
                        ? ((dept.Income2025 - dept.Income2024) / dept.Income2024) * 100
                        : 0,
                managerName: (dept as any).managerName
            }))
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
     * שינוי מצב תצוגת הגרף הראשי (סה"כ / קרן‑מדינה / אתר / משמרת / מחלקה)
     */
    setChartViewMode(mode: "year-total" | "fund" | "site" | "shift" | "department" | "month" | "yoy-combined"): void {
        if (this.chartViewMode === mode && mode !== "yoy-combined") {
            // עבור רוב המצבים, אם כבר במצב הזה – אין מה לעשות
            return;
        }

        // leaving YoY combined: cleanup inline chart instance
        if (this.chartViewMode === "yoy-combined" && mode !== "yoy-combined") {
            if (this.yoyCombinedInlineChart) {
                this.yoyCombinedInlineChart.destroy();
                this.yoyCombinedInlineChart = null;
            }
        }
        this.chartViewMode = mode;
        this.isShiftGroupedView = mode === "shift";

        // מדד משולב = גרף אופקי (BarChart); שאר המצבים = ColumnChart
        if (mode === "yoy-combined") {
            this.chartType = "BarChart";
        } else if (this.chartType !== "LineChart") {
            this.chartType = "ColumnChart";
        }
        this.updateChartOptionsForType();

        // מצב חודשים תלוי ב‑API ייעודי – טוענים אותו לפני עיבוד נתונים
        if (this.chartViewMode === "month") {
            this.loadMonthlyCounts();
        } else if (this.chartViewMode === "yoy-combined") {
            this.loadDepartmentYoY();
        } else {
            this.updateChartData();
        }
        this.cdr.detectChanges();
        this.scheduleYoyCombinedInlineBuild();

        // כפיית רענון / ריסייז של הגף מיד אחרי החלפת מצב,
        // כדי שלא יהיה צורך בלחיצה נוספת (כפתור סיידבר וכד').
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore if window is not available
            }
            this.chartOptions = { ...this.chartOptions };
        }, 0);
    }

    /**
     * לחיצה על "מדד משולב" – גם מחליפה מצב תצוגה וגם פותחת פופ‑אפ גדול
     */
    onYoyCombinedClick(): void {
        this.setChartViewMode("yoy-combined");
        this.openYoyCombinedFullModal();
    }

    openYoyCombinedFullModal(): void {
        this.showYoyCombinedFullModal = true;
        // נותן לאנגולר לצייר את ה-canvas ואז בונה את הגרף
        setTimeout(() => this.buildYoyCombinedChart(), 0);
    }

    closeYoyCombinedFullModal(): void {
        this.showYoyCombinedFullModal = false;
        if (this.yoyCombinedChart) {
            this.yoyCombinedChart.destroy();
            this.yoyCombinedChart = null;
        }
        // טריגר ריסייז קטן כדי שהגרף הרגיל יחזור להתאים את עצמו
        try {
            window.dispatchEvent(new Event("resize"));
        } catch {
            // ignore
        }
    }

    /**
     * כותרת דינמית מעל הגרף הראשי לפי מצב התצוגה הנוכחי
     */
    getChartViewTitle(): string {
        if (this.mainMetricMode === "room-utilization") {
            return "ניצולת חדר ניתוח – ניתוחים ליום בחדר לפי מחלקה מאוגדת (Wing)";
        }
        if (this.mainMetricMode === "room-times") {
            switch (this.roomTimesView) {
                case "avgDuration":
                    return "משך ניתוח ממוצע לפי מחלקה מאוגדת (Wing)";
                case "firstStart":
                    return "זמן כניסה ממוצע של ניתוח ראשון בבוקר לפי מחלקה";
                case "lastEnd":
                    return "זמן סיום ממוצע של הניתוח האחרון לפי מחלקה";
                case "avgSetup":
                    return "זמן SETUP ממוצע לפי מחלקה";
                case "perDay":
                    return "ממוצע ניתוחים ליום בחדר לפי מחלקה";
                case "lossPerDay":
                    return "זמן אבוד ליום לפי מחלקה";
                case "approvedPerDay":
                    return "זמן מנוצל ליום לפי מחלקה";
                default:
                    return "זמני חדר ניתוח לפי מחלקה";
            }
        }
        switch (this.chartViewMode) {
            case "year-total":
                return "סה\"כ ניתוחים לפי שנה";
            case "department":
                return "סה\"כ ניתוחים לפי מחלקה";
            case "site":
                return "סה\"כ ניתוחים לפי אתר";
            case "shift":
                return "סה\"כ ניתוחים לפי משמרת";
            case "fund":
                return "סה\"כ ניתוחים לפי סוג מימון";
            case "month":
                return "ניתוחים לפי חודשים (5 שנים אחרונות)";
            case "yoy-combined":
                return "מדד משולב – השוואה לשנה שעברה (%)";
            default:
                return "סה\"כ ניתוחים";
        }
    }

    /** פורמט קצר לאחוזים עבור תווית על עמודת הגרף (למשל +12.3%) */
    private formatPctShort(v: number | null | undefined): string {
        if (v == null) {
            return "";
        }
        const sign = v > 0 ? "+" : "";
        return sign + v.toFixed(1) + "%";
    }

    /** פורמט לתא בטבלה (מדד משולב) */
    formatPctCell(v: number | null | undefined): string {
        if (v == null) {
            return "-";
        }
        const sign = v > 0 ? "+" : "";
        return sign + v.toFixed(1) + "%";
    }

    /** מחזיר מחלקת CSS חיובית/שלילית לפי סימן האחוז */
    getPctClass(v: number | null | undefined): string {
        if (v == null || v === 0) {
            return "";
        }
        return v > 0 ? "agg-positive" : "agg-negative";
    }

    /**
     * טקסט טולטיפ קצר וברור לכל כפתור מצב תצוגה
     */
    getChartViewTooltip(mode: "year-total" | "fund" | "site" | "shift" | "department" | "month" | "yoy-combined"): string {
        switch (mode) {
            case "year-total":
                return "כמות ניתוחים לכל שנה";
            case "department":
                return "השוואת מחלקות מהגבוה לנמוך";
            case "site":
                return "פיזור ניתוחים לפי אתר";
            case "shift":
                return "פיזור ניתוחים לפי משמרת";
            case "fund":
                return "פיזור ניתוחים לפי סוג מימון";
            case "month":
                return "השוואת ניתוחים לפי חודשים ולפי שנה";
            case "yoy-combined":
                return "אחוז שינוי לעומת אותה תקופה בשנה שעברה – ניתוחים לחדר, זמן ניתוח, הכנסה ממוצעת";
            default:
                return "";
        }
    }

    /** האם מצב התצוגה הנוכחי הוא ניצולת חדר ניתוח (ניתוחים ליום בחדר) */
    isRoomUtilizationMode(): boolean {
        return this.mainMetricMode === "room-utilization";
    }

  /** החלפת מצב המדד הראשי לפי כפתורי הטוגל מעל הגרף */
  onMainMetricToggle(value: string): void {
    if (value === "utilization") {
      this.mainMetricMode = "room-utilization";
      this.updateChartData();
    } else if (value === "duration") {
      this.mainMetricMode = "room-times";
      // טוען נתוני זמני ניתוח (משך) אם טרם נטענו או אם הפילטרים השתנו
      this.loadAvgDuration();
    } else if (value === "count") {
      this.mainMetricMode = "surgery-volume";
      this.updateChartData();
    }
  }

  /** שינוי מדד החדרים לגרף ניצולת (סה"כ / פתוחות / סוגרות / ימים מלאים) – תמיד במצב לפי מחלקה */
  setRoomStatsMetric(metric: "total" | "open" | "close" | "fullDays"): void {
    this.roomStatsMetric = metric;
    this.roomStatsViewMode = "byWing";
    if (this.isRoomUtilizationMode()) {
      this.updateChartData();
    }
  }

  /** שינוי מצב תצוגת גרף החדרים: לפי מחלקה / סה"כ חדרים לשנה */
  setRoomStatsViewMode(mode: "byWing" | "yearTotal"): void {
    this.roomStatsViewMode = mode;
    if (this.isRoomUtilizationMode()) {
      this.updateChartData();
    }
  }

  /** החלפת מצב כפתורי ניצולת חדר לפי ערך הטוגל המאוחד ב-UI */
  onRoomStatsModeChange(value: "yearTotal" | "total" | "open" | "close" | "fullDays"): void {
    if (value === "yearTotal") {
      this.setRoomStatsViewMode("yearTotal");
    } else {
      this.setRoomStatsViewMode("byWing");
      this.setRoomStatsMetric(value);
    }
  }

  /** חישוב ערך המדד הנוכחי עבור רשומת חדרים */
  private getRoomStatsMetricValue(info: { roomsTotal: number; roomsOpen: number; roomsClose: number; fullDays: number }): number | null {
    switch (this.roomStatsMetric) {
      case "total":
        return info.roomsTotal;
      case "open":
        return info.roomsOpen;
      case "close":
        return info.roomsClose;
      case "fullDays":
        return info.fullDays;
      default:
        return null;
    }
  }

    /** רשימת מחלקות (Wing) לפילטר הגרף – ייחודי מ־countByDeptData, ממוין */
    getChartDepartmentOptions(): string[] {
        if (!this.countByDeptData || this.countByDeptData.length === 0) {
            return [];
        }
        const set = new Set<string>();
        this.countByDeptData.forEach((r) => {
            const w = (r.Wing || "").trim();
            if (w) set.add(w);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
    }

    setChartDepartmentFilter(dept: string | null): void {
        this.chartDepartmentFilter = dept;
        this.isChartDeptDropdownOpen = false;
        // במצב "ניתוחים לפי חודשים" הנתונים מגיעים מה-API – צריך לטעון מחדש עם פרמטר department
        if (this.chartViewMode === "month") {
            this.loadMonthlyCounts();
        } else {
            this.updateChartData();
        }
        this.cdr.detectChanges();
    }

    /** נתוני YoY מסוננים לפי פילטר המחלקה של הגרף (לשימוש בטבלה ובתצוגות) */
    getFilteredDepartmentYoyData(): DepartmentYoyDto[] {
        if (!this.departmentYoyData || !this.departmentYoyData.length) {
            return [];
        }
        if (!this.chartDepartmentFilter) {
            return this.departmentYoyData;
        }
        return this.departmentYoyData.filter(
            (d) => (d.Department || "").trim() === this.chartDepartmentFilter
        );
    }

    /**
     * Load yearly totals silently for chart year detection
     */
    loadYearlyTotalsForChart(): void {
        // בדשבורד הניתוחים החדש אין שימוש יותר ב־API של GetYearlyTotalIncome
        return;
    }

    /**
     * Load boss dashboard with yearly totals from backend
     */
    loadBossDashboard(): void {
        // מודול "דוח למנהל" הישן התבסס על API של הכנסות – הוסר בדשבורד הניתוחים
        this.showBossDashboard = false;
        this.isLoading = false;
        this.snackBar.open("מודול הכנסות הוסר מדשבורד הניתוחים", "סגור", {
            duration: 3000,
        });
    }

    /**
     * Close boss dashboard
     */
    closeBossDashboard(): void {
        this.showBossDashboard = false;
        this.cdr.detectChanges();
    }

    /**
     * לחיצה על שורה: ניתוח – פתיחת מודל פרטים; מחלקה – גרף מחלקה
     */
    onRowClick(row: any): void {
        if (this.surgeryData.length > 0) {
            this.selectedSurgery = row as SurgeryRow;
            this.selectedDepartment = null;
            this.departmentGraphTitle = 'פרטי ניתוח';
            this.isDepartmentGraphOpen = true;
            this.cdr.detectChanges();
            return;
        }
        this.loadDepartmentSpecificGraph(row.DepartmentName);
    }

    /**
     * ערך תא עבור טבלה (תמיכה ב-SurgeryRow ובמחלקות)
     */
    getCellVal(row: any, col: string): any {
        if (!row) return '';
        const v = row[col];
        return v != null ? v : '';
    }

    /**
     * Load department specific graph
     */
    loadDepartmentSpecificGraph(departmentName: string): void {
        this.selectedSurgery = null;
        this.selectedDepartment =
            this.departmentIncomeData.find(
                (d) => d.DepartmentName === departmentName
            ) || null;
        if (!this.selectedDepartment) {
            this.snackBar.open("❌ לא נמצאה מחלקה", "סגור", { duration: 2000 });
            return;
        }
        this.departmentGraphTitle = `פרטי מחלקה: ${departmentName}`;
        this.isDepartmentGraphOpen = true;
        this.loadDetailedDepartmentData(departmentName);
    }

    /**
     * Load detailed department data
     */
    loadDetailedDepartmentData(departmentName: string): void {
        // בעבר פונקציה זו השתמשה ב־GetDepartmentDetailedData (הכנסות) – כעת אינה קוראת ל־API כלל
        this.catalogLoading = false;
        this.detailedDataSource.data = [];
        this.cdr.detectChanges();
    }

    /**
     * Sort detailed data by Cash2025 descending (default view)
     */
    sortDetailedDataByCash2025Descending(): void {
        if (this.detailedDataSource.data) {
            this.detailedDataSource.data.sort(
                (a, b) => (b.Cash2025 || 0) - (a.Cash2025 || 0)
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

        const data = this.detailedDataSource.data.slice();
        data.sort((a: any, b: any) => {
            const aVal = a[event.active];
            const bVal = b[event.active];

            const aNum =
                typeof aVal === "number" ? aVal : parseFloat(aVal) || 0;
            const bNum =
                typeof bVal === "number" ? bVal : parseFloat(bVal) || 0;

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
        this.selectedSurgery = null;
        this.detailedDataSource.data = [];
        this.selectedViewType = "cash";
        this.displayedCatalogColumns = this.cashColumns;
        this.cdr.detectChanges();
    }

    /**
     * Change catalog view type (cash/units/both)
     */
    onViewTypeChange(viewType: string): void {
        this.selectedViewType = viewType;

        if (viewType === "cash") {
            this.displayedCatalogColumns = this.cashColumns;
        } else if (viewType === "units") {
            this.displayedCatalogColumns = this.unitsColumns;
        } else if (viewType === "both") {
            this.displayedCatalogColumns = this.bothColumns;
        }

        this.cdr.detectChanges();
    }

    /**
     * Calculate difference between years
     */
    calculateDifference(item: DepartmentComparisonDto): number {
        return item.Income2025 - item.Income2024;
    }

    /**
     * Get percentage change - percentage sign on LEFT (RTL support)
     */
    calculatePercentageChange(item: DepartmentComparisonDto): string {
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
    formatNumber(value: number | string | null | undefined): string {
        if (value === null || value === undefined) {
            return "0";
        }

        let numericValue: number;

        if (typeof value === "number") {
            numericValue = value;
        } else {
            const cleaned = value.replace(/,/g, "");
            const parsed = parseFloat(cleaned);
            numericValue = isNaN(parsed) ? 0 : parsed;
        }

        return numericValue.toLocaleString("he-IL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

  // במקום getTotal2024() / getTotal2025(), עשה דינמי:

getOlderYearTotal(): number {
    if (this.yearlyTotalData.length < 2) return 0;
    // Sort and get the second-to-last year (previous year)
    const sorted = [...this.yearlyTotalData].sort((a, b) => 
        parseInt(a.Year) - parseInt(b.Year)
    );
    // Get the second-to-last year (previous year before latest)
    return sorted[sorted.length - 2]?.TotalRealValue || 0;
}

getLatestYearTotal(): number {
    if (this.yearlyTotalData.length === 0) return 0;
    // Sort and get the latest year (last item after sort)
    const sorted = [...this.yearlyTotalData].sort((a, b) => 
        parseInt(a.Year) - parseInt(b.Year)
    );
    return sorted[sorted.length - 1]?.TotalRealValue || 0;
}

getOlderYear(): string {
    if (this.yearlyTotalData.length < 2) return '';
    const sorted = [...this.yearlyTotalData].sort((a, b) => 
        parseInt(a.Year) - parseInt(b.Year)
    );
    // Get the second-to-last year (previous year before latest)
    return sorted[sorted.length - 2]?.Year || '';
}

getLatestYear(): string {
    if (this.yearlyTotalData.length === 0) return '';
    const sorted = [...this.yearlyTotalData].sort((a, b) => 
        parseInt(a.Year) - parseInt(b.Year)
    );
    return sorted[sorted.length - 1]?.Year || '';
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
        // Assume current year - 1 as older year (most common case)
        return (this.currentYear - 1).toString();
    }
    return '';
}

/**
 * Get the latest year from department income data (Income2025)
 * The server dynamically assigns years, so Income2025 is always the newer year
 */
getLatestYearFromDeptData(): string {
    // First try to get from yearlyTotalData if available
    if (this.yearlyTotalData.length >= 1) {
        return this.getLatestYear();
    }
    // Fallback: if we have department data, use current year
    if (this.departmentIncomeData.length > 0) {
        return this.currentYear.toString();
    }
    return '';
}

/**
 * Update chart columns dynamically based on years
 */
updateChartColumns(): void {
    // Only update if we have data
    if (!this.departmentIncomeData || this.departmentIncomeData.length === 0) {
        return;
    }
    
    const olderYear = this.getOlderYearFromDeptData();
    const latestYear = this.getLatestYearFromDeptData();
    
    // Only update if years are valid
    if (!olderYear || !latestYear) {
        return;
    }
    
    // Update chart columns
    this.chartColumns = [
        "מחלקה",
        { type: "number", label: latestYear },
        { type: "string", role: "annotation" },
        { type: "number", label: olderYear },
        { type: "string", role: "annotation" },
    ];
    
    // Update chart options title without creating new object (to preserve Google Charts reference)
    if (this.chartOptions) {
        this.chartOptions.title = "";
    }
}
   
    /**
     * Filter main table
     */
    applyMainFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    /**
     * Export data to CSV
     */
    exportToCSV(): void {
        let csvContent = "data:text/csv;charset=utf-8,";
        if (this.surgeryData.length > 0) {
            const list = this.dataSource.data as SurgeryRow[];
            csvContent += "תאריך,מספר מקרה,חדר ניתוח,זמן ניתוח (דק'),סוג ניתוח,מנתחת,פרוצדורה,סכום כולל\n";
            list.forEach((s) => {
                csvContent += `"${s.date ?? ''}","${s.caseNumber ?? ''}","${s.surgeryRoom ?? ''}",${s.surgeryDurationMinutes ?? ''},"${s.surgeryType ?? ''}","${s.surgeon ?? ''}","${s.procedure ?? ''}",${s.totalAmount ?? ''}\n`;
            });
        } else {
            const olderYear = this.getOlderYearFromDeptData();
            const latestYear = this.getLatestYearFromDeptData();
            csvContent += `מחלקה,ערך פעילות ${olderYear},ערך פעילות ${latestYear},שינוי,אחוז שינוי\n`;
            this.departmentIncomeData.forEach((item) => {
                const difference = this.calculateDifference(item);
                const percentage = this.calculatePercentageChange(item);
                csvContent += `"${item.DepartmentName}",${item.Income2024},${item.Income2025},${difference},${percentage}\n`;
            });
        }
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", this.surgeryData.length > 0 ? "surgeries_report.csv" : "surgery_activity_by_department.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.snackBar.open("✓ הדוח יוצא בהצלחה (נתוני ניתוחים)", "סגור", { duration: 2000 });
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
                return "מטרת דשבורד הניתוחים";
            case "notes":
                return "הערות חשובות";
            case "structure":
                return "מבנה הדשבורד";
            default:
                return "מדריך דשבורד הניתוחים";
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
        const a = Number(e?.Cash2025 ?? 0);
        const b = Number(e?.Cash2024 ?? 0);
        return a - b;
    }

    cashPct(e: any): string {
        const a = Number(e?.Cash2025 ?? 0);
        const b = Number(e?.Cash2024 ?? 0);
        if (!b) return a ? "∞" : "0%";
        return `${(((a - b) / b) * 100).toFixed(1)}%`;
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
            return `השוואה YTD: החודשים הקיימים ב-${this.getLatestYear()} מול אותם החודשים ב-${this.getOlderYear()}`;
        }
        return `השוואה בין שנים שלמות: ${this.getOlderYear()} מול ${this.getLatestYear()}`;
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
        }, 0);
    }

    // שינוי פילטרים
    toggleMoreFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    private toggleFromMulti(list: string[], value: string): string[] {
        if (!list) {
            return [value];
        }
        const exists = list.includes(value);
        return exists ? list.filter(v => v !== value) : [...list, value];
    }

    setSurgeryTypeFilter(value: string): void {
        this.selectedSurgeryTypes = this.toggleFromMulti(this.selectedSurgeryTypes, value);
        this.applyAllSurgeryFilters();
    }

    setShiftFilter(value: string): void {
        this.selectedShifts = this.toggleFromMulti(this.selectedShifts, value);
        this.applyAllSurgeryFilters();
    }

    setMorningWorkFilter(value: "all" | "yes" | "no"): void {
        this.morningWorkFilter = value;
        this.applyAllSurgeryFilters();
    }

    setRoomFilter(value: string): void {
        this.selectedRooms = this.toggleFromMulti(this.selectedRooms, value);
        this.applyAllSurgeryFilters();
    }

    setDepartmentFilter(value: string): void {
        this.selectedDepartments = this.toggleFromMulti(this.selectedDepartments, value);
        this.applyAllSurgeryFilters();
    }

    setWeekdayFilter(value: string): void {
        this.selectedWeekdays = this.toggleFromMulti(this.selectedWeekdays, value);
        this.applyAllSurgeryFilters();
    }

    setSiteFilter(value: string): void {
        this.selectedSites = this.toggleFromMulti(this.selectedSites, value);
        this.applyAllSurgeryFilters();
    }

    resetSurgeryFilters(): void {
        this.selectedSurgeryTypes = [];
        this.selectedShifts = [];
        this.morningWorkFilter = "all";
        this.selectedRooms = [];
        this.selectedSites = [];
        this.selectedDepartments = [];
        this.selectedWeekdays = [];
        this.chartDepartmentFilter = null;
        this.isChartDeptDropdownOpen = false;
        this.applyAllSurgeryFilters();
    }

    applyAllSurgeryFilters(): void {
        // טבלת הניתוחים מפולטרת רק אם יש לנו נתוני ניתוחים גולמיים
        if (this.surgeryData.length > 0) {
            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
        }

        // הגרף הראשי תמיד מתעדכן לפי הפילטרים (גם כשאין surgeryData ויש רק CountByDept)
        // במצב "ניתוחים לפי חודשים" – טוען מחדש מה-API עם סוג ניתוח, משמרת, יום (אמצע שבוע/סופ״ש), אתר, מחלקה
        if (this.chartViewMode === "month") {
            this.loadMonthlyCounts();
        } else if (this.chartViewMode === "yoy-combined") {
            // כרגע ה‑API של מדד משולב לא מקבל פילטרים, ולכן אין טעם לטעון אותו מחדש
            // אם בעתיד יתווספו פילטרים ל‑GetDepartmentYoY, נוכל לקרוא כאן ל‑loadDepartmentYoY().
            this.updateChartData();
        } else {
            this.updateChartData();
        }

        // במצב "זמני חדר" – צריך לטעון מחדש את ה‑KPI הנוכחי לפי הפילטרים
        if (this.mainMetricMode === "room-times") {
            this.reloadRoomTimesViewIfActive();
        }
        this.cdr.detectChanges();
    }

    private reloadRoomTimesViewIfActive(): void {
        // הגנה מפני רינדור לפני שהקומפוננטה מוכנה
        if (!this.roomTimesView) {
            return;
        }

        switch (this.roomTimesView) {
            case "avgDuration":
                this.loadAvgDuration();
                break;
            case "firstStart":
                this.loadAvgFirstMorningEntry();
                break;
            case "lastEnd":
                this.loadAvgLastMorningEnd();
                break;
            case "avgSetup":
                this.loadAvgSetup();
                break;
            case "perDay":
                this.loadSurgeriesPerDay();
                break;
            case "lossPerDay":
                this.loadLossByWingPerDay();
                break;
            case "approvedPerDay":
                this.loadApprovedUtilizationPerDay();
                break;
        }
    }

    /**
     * Summary string of all active (non‑default) filters for UI display
     */
    getActiveFiltersSummary(): string {
        const parts: string[] = [];

        // אגף / אתר נבחר (לא ברירת מחדל "כל האתרים")
        if (this.selectedDiagnosis && this.selectedDiagnosis !== "כל האתרים") {
            parts.push(`אגף / אתר: ${this.selectedDiagnosis}`);
        }

        if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
            parts.push(`סוג ניתוח: ${this.selectedSurgeryTypes.join(", ")}`);
        }

        if (this.selectedShifts && this.selectedShifts.length > 0) {
            parts.push(`משמרת: ${this.selectedShifts.join(", ")}`);
        }

        if (this.selectedRooms && this.selectedRooms.length > 0) {
            parts.push(`חדר: ${this.selectedRooms.join(", ")}`);
        }

        if (this.selectedDepartments && this.selectedDepartments.length > 0) {
            parts.push(`מחלקה: ${this.selectedDepartments.join(", ")}`);
        }

        if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
            parts.push(`יום: ${this.selectedWeekdays.join(", ")}`);
        }

        if (this.selectedSites && this.selectedSites.length > 0) {
            parts.push(`אתר: ${this.selectedSites.join(", ")}`);
        }

        if (this.morningWorkFilter !== "all") {
            parts.push(
                this.morningWorkFilter === "yes"
                    ? "עבודת בוקר: כן"
                    : "עבודת בוקר: לא"
            );
        }

        if (parts.length === 0) {
            return "אין סינון פעיל (הכל)";
        }

        return parts.join(" · ");
    }

    // תצוגת טקסט לכל פילטר (כולל "הכל" וקומה) – בשורה קצרה שלא פורצת את העיצוב
    getSurgeryTypeDisplay(): string {
        if (!this.selectedSurgeryTypes || this.selectedSurgeryTypes.length === 0) {
            return "סוג ניתוח: הכל";
        }
        if (this.selectedSurgeryTypes.length === 1) {
            return `סוג ניתוח: ${this.selectedSurgeryTypes[0]}`;
        }
        const first = this.selectedSurgeryTypes[0];
        const restCount = this.selectedSurgeryTypes.length - 1;
        // מציגים ערך ראשון + כמות נוספת, הפירוט המלא כבר מופיע בתקציר התחתון
        return `סוג ניתוח: ${first} ועוד ${restCount}`;
    }

    getShiftDisplay(): string {
        if (!this.selectedShifts || this.selectedShifts.length === 0) {
            return "משמרת: הכל";
        }
        if (this.selectedShifts.length === 1) {
            return `משמרת: ${this.selectedShifts[0]}`;
        }
        return `משמרת: ${this.selectedShifts.join(", ")}`;
    }

    getRoomDisplay(): string {
        if (!this.selectedRooms || this.selectedRooms.length === 0) {
            return "חדר: הכל";
        }
        if (this.selectedRooms.length === 1) {
            return `חדר: ${this.selectedRooms[0]}`;
        }
        return `חדר: ${this.selectedRooms.join(", ")}`;
    }

    getDepartmentDisplay(): string {
        if (!this.selectedDepartments || this.selectedDepartments.length === 0) {
            return "מחלקה: הכל";
        }
        if (this.selectedDepartments.length === 1) {
            return `מחלקה: ${this.selectedDepartments[0]}`;
        }
        return `מחלקה: ${this.selectedDepartments.join(", ")}`;
    }

    getWeekdayDisplay(): string {
        if (!this.selectedWeekdays || this.selectedWeekdays.length === 0) {
            return "יום: הכל";
        }
        if (this.selectedWeekdays.length === 1) {
            return `יום: ${this.selectedWeekdays[0]}`;
        }
        return `יום: ${this.selectedWeekdays.join(", ")}`;
    }

    getMorningWorkDisplay(): string {
        if (this.morningWorkFilter === "all") {
            return "עבודת בוקר: הכל";
        }
        if (this.morningWorkFilter === "yes") {
            return "עבודת בוקר: כן";
        }
        return "עבודת בוקר: לא";
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
            document.body.classList.add('department-dashboard-dark');
        } else {
            document.body.classList.remove('department-dashboard-dark');
        }
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
                    fontSize: this.chartOptions.hAxis?.textStyle?.fontSize ?? 13,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.hAxis?.titleTextStyle?.fontSize ?? 14,
                    bold: true,
                },
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.vAxis?.textStyle?.fontSize ?? 13,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.vAxis?.titleTextStyle?.fontSize ?? 14,
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
                    fontSize: this.chartOptions.legend?.textStyle?.fontSize ?? 13,
                },
            };
            this.chartOptions.annotations = {
                ...(this.chartOptions.annotations || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.annotations?.textStyle?.fontSize ?? 12,
                    bold: true,
                },
            };
            this.chartOptions.tooltip = {
                ...(this.chartOptions.tooltip || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.tooltip?.textStyle?.fontSize ?? 12,
                },
            };
            this.chartOptions.backgroundColor = {
                fill: "#0f172a",
                stroke: "rgba(255, 255, 255, 0.15)",
                strokeWidth: 1,
            };
        } else {
            // Light theme colors
            this.chartOptions.titleTextStyle = { ...this.chartOptions.titleTextStyle, color: "#333" };
            this.chartOptions.hAxis = {
                ...this.chartOptions.hAxis,
                textStyle: { ...this.chartOptions.hAxis?.textStyle, color: "#555" },
                titleTextStyle: { ...this.chartOptions.hAxis?.titleTextStyle, color: "#333" },
            };
            this.chartOptions.vAxis = {
                ...this.chartOptions.vAxis,
                textStyle: { ...this.chartOptions.vAxis?.textStyle, color: "#555" },
                titleTextStyle: { ...this.chartOptions.vAxis?.titleTextStyle, color: "#333" },
            };
            this.chartOptions.legend = {
                ...this.chartOptions.legend,
                textStyle: { ...this.chartOptions.legend?.textStyle, color: "#555" },
            };
            this.chartOptions.annotations = {
                ...this.chartOptions.annotations,
                textStyle: { ...this.chartOptions.annotations?.textStyle, color: "#333" },
            };
            this.chartOptions.tooltip = {
                ...this.chartOptions.tooltip,
                textStyle: { ...this.chartOptions.tooltip?.textStyle, color: "#333" },
            };
            this.chartOptions.backgroundColor = {
                fill: "#ffffff",
                stroke: "#ddd",
                strokeWidth: 1,
            };
        }
        // New reference so angular-google-charts detects change and redraws with dark background
        this.chartOptions = { ...this.chartOptions };
        if (this.chartData && this.chartData.length > 0) {
            this.updateChartData();
        }
    }

    /**
     * Handle chart click event
     * When user clicks on a bar in the chart, show department details
     */
    onChartClick(event: any): void {
        try {
            // console.log("Chart select event:", event);
            
            // angular-google-charts select event structure: { selection: [{ row: number, column: number }] }
            let selectedRow: number | null = null;
            
            if (event && event.selection && Array.isArray(event.selection) && event.selection.length > 0) {
                // Standard format: { selection: [{ row: number, column: number }] }
                selectedRow = event.selection[0].row;
            } else if (event && event.row !== undefined) {
                // Direct format: { row: number, column: number }
                selectedRow = event.row;
            } else if (Array.isArray(event) && event.length > 0) {
                // Array format: [{ row: number, column: number }]
                selectedRow = event[0].row;
            }
            
            if (this.surgeryData.length > 0) return; // במצב ניתוחים לא פותחים מודל מחלקה
            if (selectedRow !== null && selectedRow !== undefined) {
                if (this.chartData && this.chartData.length > selectedRow) {
                    const departmentName = this.chartData[selectedRow][0];
                    if (departmentName) this.loadDepartmentSpecificGraph(departmentName);
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

// ===== Group‑2 KPIs modals – open / close + API calls =====

openAvgDurationModal(): void {
  this.showAvgDurationModal = true;
  this.loadAvgDuration();
}
openTimesModal(): void {
  this.showTimesModal = true;
  this.setRoomTimesView('avgDuration');
}

openFirstStartTimeModal(): void {
  this.showFirstStartTimeModal = true;
  this.loadAvgFirstMorningEntry();
}

openLastEndTimeModal(): void {
  this.showLastEndTimeModal = true;
  this.loadAvgLastMorningEnd();
}

openAvgSetupModal(): void {
  this.showAvgSetupModal = true;
  this.loadAvgSetup();
}

closeAvgDurationModal(): void {
  this.showAvgDurationModal = false;
}

closeFirstStartTimeModal(): void {
  this.showFirstStartTimeModal = false;
}

closeLastEndTimeModal(): void {
  this.showLastEndTimeModal = false;
}

// Unified "זמני חדר ניתוח" modal that מחזיק את כל תתי‑הגרפים תחת אותה כותרת
openRoomTimesModal(initialView: 'avgDuration' | 'firstStart' | 'lastEnd' | 'avgSetup' | 'perDay' | 'lossPerDay' | 'approvedPerDay' = 'avgDuration'): void {
  this.showRoomTimesModal = true;
  this.setRoomTimesView(initialView);
}

closeRoomTimesModal(): void {
  this.showRoomTimesModal = false;
  this.showTimesModal = false;
}

setRoomTimesView(view: 'avgDuration' | 'firstStart' | 'lastEnd' | 'avgSetup' | 'perDay' | 'lossPerDay' | 'approvedPerDay'): void {
  this.roomTimesView = view;

  // If a filter becomes irrelevant for the selected room-times view,
  // close its dropdown immediately to prevent "open but disabled" UI states.
  if (this.isFilterDisabled("chartDepartment")) this.isChartDeptDropdownOpen = false;
  if (this.isFilterDisabled("surgeryType")) this.isSurgeryTypeOpen = false;
  if (this.isFilterDisabled("shift")) this.isShiftOpen = false;
  if (this.isFilterDisabled("weekPart")) this.isWeekdayOpen = false;
  if (this.isFilterDisabled("morningWork")) this.isMorningWorkOpen = false;
  if (this.isFilterDisabled("site")) this.isSiteOpen = false;
  if (this.isFilterDisabled("room")) this.isRoomOpen = false;

  switch (view) {
    case 'avgDuration':
      this.loadAvgDuration();
      break;
    case 'firstStart':
      this.loadAvgFirstMorningEntry();
      break;
    case 'lastEnd':
      this.loadAvgLastMorningEnd();
      break;
    case 'avgSetup':
      this.loadAvgSetup();
      break;
    case 'perDay':
      this.loadSurgeriesPerDay();
      break;
    case 'lossPerDay':
      this.loadLossByWingPerDay();
      break;
    case 'approvedPerDay':
      this.loadApprovedUtilizationPerDay();
      break;
  }
}

toggleLastEndTimeExcludeOverflow(): void {
  this.lastEndTimeExcludeOverflowDays = !this.lastEndTimeExcludeOverflowDays;
  this.applyLastEndTimeDisplay();
}

/**
 * מחזיר ממוצע "ללא ימים מאוחרים" (last surgery not after 15:00).
 * מעדיף שדות מהשרת: CountNoLateDays, AvgEndMinutesNoLateDays; אם חסרים – מחשב מ־CountOverflowDaysOnly וכו'.
 */
private getLastEndExcludingOverflow(r: AvgLastEndRow): { count: number; avgMinutes: number | null } {
  if (r.CountNoLateDays != null && r.CountNoLateDays > 0 && r.AvgEndMinutesNoLateDays != null) {
    return { count: r.CountNoLateDays, avgMinutes: r.AvgEndMinutesNoLateDays };
  }
  const total = r.Count ?? 0;
  const overflowCount = r.CountOverflowDaysOnly ?? 0;
  const countExcl = Math.max(0, total - overflowCount);
  if (countExcl <= 0) {
    return { count: 0, avgMinutes: null };
  }
  const totalMin = (r.AvgEndMinutes ?? 0) * total;
  const overflowMin = (r.AvgEndMinutesOverflowDaysOnly ?? 0) * overflowCount;
  const exclSum = totalMin - overflowMin;
  const avgMinutes = exclSum / countExcl;
  return { count: countExcl, avgMinutes: Number.isFinite(avgMinutes) ? avgMinutes : null };
}

/** כשבמצב "ללא גלישה" אין אף שורה עם ימים בלי גלישה – נציג ממוצע רגיל כדי שהמסך לא יישאר ריק */
lastEndTimeExcludeNoData = false;

/** מעדכן תצוגה וגרף: כשהכפתור פעיל – ממוצע ללא ימי גלישה (חישוב מקומי או משדות השרת), אחרת ממוצע רגיל */
applyLastEndTimeDisplay(): void {
  const rows = this.lastEndTimeRows;
  let useExcluding = this.lastEndTimeExcludeOverflowDays;
  this.lastEndTimeExcludeNoData = false;

  const hasAnyExcluding = useExcluding && rows.some((r) => this.getLastEndExcludingOverflow(r).count > 0);
  if (useExcluding && !hasAnyExcluding) {
    useExcluding = false;
    this.lastEndTimeExcludeNoData = true;
  }

  this.lastEndTimeData = rows.map((r) => {
    let valueDisplay: string;
    if (useExcluding) {
      const { avgMinutes } = this.getLastEndExcludingOverflow(r);
      valueDisplay = avgMinutes != null ? this.minutesToTime(avgMinutes) : (r.AvgEndTimeNoLateDays ?? "-");
    } else {
      valueDisplay = r.AvgEndTime ?? (r.AvgEndMinutes != null ? this.minutesToTime(r.AvgEndMinutes) : "-");
    }
    return {
      departmentName: r.Wing || r.Department || "לא צוין",
      valueDisplay,
    };
  });

  this.buildLastEndTimeChart(rows, useExcluding);
  this.cdr.detectChanges();
}

closeAvgSetupModal(): void {
  this.showAvgSetupModal = false;
}

openSurgeriesPerDayModal(): void {
  this.showSurgeriesPerDayModal = true;
  this.loadSurgeriesPerDay();
}

closeSurgeriesPerDayModal(): void {
  this.showSurgeriesPerDayModal = false;
}

private loadSurgeriesPerDay(): void {
  const baseYear = this.getLatestYearFromDeptData() || this.currentYear.toString();
  // אם כבר יש לנו נתונים גולמיים לאותה שנה – נבנה רק את הגרף מחדש בלי קריאת API
  if (this.surgeriesPerDayRaw.length > 0 && this.lastSurgeriesPerDayYear === baseYear) {
    const filteredCached = this.filterBySelectedDiagnosis(this.surgeriesPerDayRaw);
    this.buildSurgeriesPerDayChart(filteredCached);
    this.isSurgeriesPerDayLoading = false;
    this.cdr.detectChanges();
    return;
  }

  // מניעה בסיסית נוספת: אם הגרף עצמו כבר בנוי לאותה שנה ואין צורך ברענון
  if (this.surgeriesPerDayChartData.length > 0 && this.lastSurgeriesPerDayYear === baseYear) {
    this.isSurgeriesPerDayLoading = false;
    this.cdr.detectChanges();
    return;
  }

  this.isSurgeriesPerDayLoading = true;
  this.surgeriesPerDayData = [];
  this.surgeriesPerDayChartColumns = [];
  this.surgeriesPerDayChartData = [];

  this.http
    .get<AvgSurgeriesPerDayPerRoomDto[]>(environment.url + "GetAvgSurgeriesPerDayPerRoomFiveYears_surgeries_dashborad", {
      params: { baseYear: baseYear.toString() },
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        // שומרים את המערך הגולמי לטעינות חוזרות ללא API
        this.surgeriesPerDayRaw = list;
        const filtered = this.filterBySelectedDiagnosis(list);
        this.buildSurgeriesPerDayChart(filtered);
        this.surgeriesPerDayChartOptions = {
          title: "",
          titleTextStyle: {
            fontSize: 18,
            bold: true,
            color: "#1e293b",
          },
          legend: {
            position: "top",
            alignment: "end",
            textStyle: { fontSize: 14, bold: true }
          },
          hAxis: {
            textStyle: { fontSize: 18, bold: true },
            slantedText: true,
            slantedTextAngle: 25,
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              italic: false,
            },
          },
          vAxis: {
            title: "ניתוחים ליום בחדר",
            textStyle: { fontSize: 16, bold: true },
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              italic: false,
            },
            viewWindowMode: "maximized",
          },
          bar: { groupWidth: "60%" },
          chartArea: {
            width: '90%',
            height: '60%', // הקטנו מ-78% כדי לתת מקום לטקסט למעלה
            left: 40,
            top: 50 // הגדלנו מ-12 כדי שהטקסט המסובב לא ייחתך
          },
          animation: { startup: true, duration: 800, easing: "out" },
          annotations: {
            alwaysOutside: true,
            textStyle: {
              fontSize: 16,
            //   rotation: -90, 
              bold: true,
            //   color: "#000000",
            //   auraColor: "none",
            }
          },
        };
        this.lastSurgeriesPerDayYear = baseYear;
        this.isSurgeriesPerDayLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgSurgeriesPerDayPerRoomFiveYears_surgeries_dashborad:", error);
        this.isSurgeriesPerDayLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת ניתוחים ליום בחדר", "סגור", { duration: 3000 });
      }
    );
}

private buildSurgeriesPerDayChart(rows: AvgSurgeriesPerDayPerRoomDto[]): void {
  if (!rows || rows.length === 0) {
    this.surgeriesPerDayChartColumns = [];
    this.surgeriesPerDayChartData = [];
    this.surgeriesPerDayChartYears = [];
    return;
  }
  const allYears = Array.from(new Set(rows.map(r => r.Year).filter(y => y != null))).sort((a, b) => a - b);
  const years = allYears.slice(-5);
  this.surgeriesPerDayChartYears = years;

  this.surgeriesPerDayChartColumns = ["מחלקה מאוגדת (Wing)"];
  years.forEach(y => {
    this.surgeriesPerDayChartColumns.push(
      { type: "number", label: y.toString() },
      { type: "string", role: "annotation", label: y.toString() },
    );
  });

  // בניית שורות הגרף לפי מחלקה מאוגדת (Wing) ושנה, ללא סיכום כפול – שימוש בערך הממוצע מה-API
  const dataMap = new Map<string, any[]>();

  rows.forEach(r => {
    const wing = (r.Wing || "לא צוין").trim();

    if (!dataMap.has(wing)) {
      const newRow: any[] = [wing];
      years.forEach(() => newRow.push(null, null));
      dataMap.set(wing, newRow);
    }

    const yearIndex = years.indexOf(r.Year);
    if (yearIndex === -1) {
      return;
    }

    const avgValue = r.AvgSurgeries ?? null;
    if (avgValue == null) {
      return;
    }

    const rounded = Math.round(avgValue * 100) / 100;
    const formatted = rounded.toFixed(2);

    const row = dataMap.get(wing)!;
    const valueColIndex = 1 + (yearIndex * 2);
    const annotationColIndex = valueColIndex + 1;

    row[valueColIndex] = { v: rounded, f: formatted };
    row[annotationColIndex] = formatted;
  });

  const wings = Array.from(dataMap.keys())
    .filter(w => w !== "אחר" && w !== "קרדיולוגיה")
    .sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

  this.surgeriesPerDayChartData = wings.map(wing => dataMap.get(wing)!);
}

/** טעינת גרף ניצולת חדר ניתוח (ניתוחים ליום בחדר) לפאנל הראשי */
private loadRoomUtilizationMainChart(): void {
  this.isChartLoading = true;
  this.chartData = [];
  this.chartColumns = [];
  this.chartTableRows = [];

  const baseYear = this.getLatestYearFromDeptData() || this.currentYear.toString();

  // אם כבר טענו את הנתונים לשנת בסיס זו – נשתמש במטמון בלבד בלי קריאת API
  if (this.surgeriesPerDayRaw.length > 0 && this.lastSurgeriesPerDayYear === baseYear.toString()) {
    const cachedFiltered = this.filterBySelectedDiagnosis(this.surgeriesPerDayRaw);
    this.buildRoomUtilizationMainChartFromRows(cachedFiltered);
    this.isChartLoading = false;
    this.cdr.detectChanges();
    return;
  }

  this.http
    .get<AvgSurgeriesPerDayPerRoomDto[]>(environment.url + "GetAvgSurgeriesPerDayPerRoomFiveYears_surgeries_dashborad", {
      params: { baseYear: baseYear.toString() },
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        // שמירת הנתונים במטמון עבור שימוש חוזר (כולל כפתורי מצבי החדרים)
        this.surgeriesPerDayRaw = list;
        this.lastSurgeriesPerDayYear = baseYear.toString();

        const filtered = this.filterBySelectedDiagnosis(list);
        this.buildRoomUtilizationMainChartFromRows(filtered);

        this.isChartLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading main room utilization chart:", error);
        this.isChartLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת ניצולת חדר ניתוח", "סגור", { duration: 3000 });
      }
    );
}

/** בניית גרף ניצולת חדר ניתוח (פאנל ראשי) מתוך רשומות שכבר נטענו – ללא קריאת API */
private buildRoomUtilizationMainChartFromRows(filtered: AvgSurgeriesPerDayPerRoomDto[]): void {
  if (!filtered || filtered.length === 0) {
    this.chartData = [];
    this.chartColumns = [];
    this.chartTableRows = [];
    return;
  }

  const allYears = Array.from(
    new Set(filtered.map((r) => r.Year).filter((y) => y != null))
  ).sort((a, b) => a - b);
  const years = allYears.slice(-5);
  this.yearsForChart = years;
  this.updateColorsForYears(years);

  // מצב 1: סה"כ חדרים לשנה – ציר X שנים, ערך = סך החדרים הפתוחים (RoomsOpen) בשנה
  if (this.roomStatsViewMode === "yearTotal") {
    const totalsByYear = new Map<number, number>();

    for (const r of filtered) {
      const year = r.Year;
      if (!years.includes(year)) continue;
      const openRooms = r.RoomsOpen ?? 0;
      totalsByYear.set(year, (totalsByYear.get(year) || 0) + openRooms);
    }

    this.chartColumns = [
      "שנה",
      { type: "number", label: "סה\"כ חדרים לשנה" },
      { type: "string", role: "annotation" },
    ];

    this.chartData = years.map((year) => {
      const value = totalsByYear.get(year) || 0;
      const rounded = Math.round(value * 100) / 100;
      const formatted = rounded.toFixed(2);
      return [year.toString(), { v: rounded, f: formatted }, formatted];
    });

    // טבלה: שורה אחת "סה\"כ חדרים לשנה" עם ערכים לכל שנה + שינוי ביחס לשנה הקודמת
    const perYear: { [year: number]: number } = {};
    let grandTotal = 0;
    years.forEach((y) => {
      const v = (totalsByYear.get(y) || 0);
      perYear[y] = v;
      grandTotal += v;
    });

    const { diff, pct } = this.computeDiffAndPct(perYear, years);
    this.chartTableRows = [
      {
        label: "סה\"כ חדרים לשנה",
        total: grandTotal,
        perYear,
        diff,
        pct,
      },
    ];

    this.chartType = "ColumnChart";
    this.chartOptions = {
      ...this.chartOptions,
      title: "",
      vAxis: {
        ...(this.chartOptions.vAxis || {}),
        title: "סה\"כ חדרים לשנה",
      },
      hAxis: {
        ...(this.chartOptions.hAxis || {}),
        title: "שנה",
      },
      isStacked: false,
      bar: {
        ...(this.chartOptions.bar || {}),
        groupWidth: "60%",
      },
    };

    return;
  }

  // מצב 2 (קיים): חדרים לפי מחלקה מאוגדת (Wing) ושנה
  const columns: any[] = ["מחלקה מאוגדת (Wing)"];
  years.forEach((y) => {
    columns.push(
      { type: "number", label: y.toString() },
      { type: "string", role: "annotation", label: y.toString() }
    );
  });
  this.chartColumns = columns;

  // אגרגציה מחדש לפי מחלקה מאוגדת ושנה: חדרים, חדרים פתוחים/סוגרים וימים מלאים
  const wingYearMap = new Map<
    string,
    Map<number, { roomsTotal: number; roomsOpen: number; roomsClose: number; fullDays: number }>
  >();

  for (const r of filtered) {
    const wing = (r.Wing || "לא צוין").trim();
    const year = r.Year;
    if (!years.includes(year)) continue;

    const roomsTotal = r.RoomsTotal ?? 0;
    const openRooms = r.RoomsOpen ?? 0;
    const closeRooms = r.RoomsClose ?? 0;
    const fullDays = r.FullDays ?? 0;

    if (!wingYearMap.has(wing)) wingYearMap.set(wing, new Map());
    const yearMap = wingYearMap.get(wing)!;
    const prev =
      yearMap.get(year) || {
        roomsTotal: 0,
        roomsOpen: 0,
        roomsClose: 0,
        fullDays: 0,
      };

    prev.roomsTotal += roomsTotal;
    prev.roomsOpen += openRooms;
    prev.roomsClose += closeRooms;
    prev.fullDays += fullDays;

    yearMap.set(year, prev);
  }

  const wings = Array.from(wingYearMap.keys())
    .filter((w) => w !== "אחר" && w !== "קרדיולוגיה")
    .sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

  const rowsForTable: {
    label: string;
    total: number;
    perYear: { [year: number]: number };
  }[] = [];

  this.chartData = wings.map((wing) => {
    const yearMap = wingYearMap.get(wing)!;
    const series: any[] = [];
    const perYear: { [year: number]: number } = {};
    let total = 0;

    for (const year of years) {
      const info = yearMap.get(year);
      if (!info) {
        series.push(null, null);
        perYear[year] = 0;
        continue;
      }
      const value = this.getRoomStatsMetricValue(info);
      if (value == null) {
        series.push(null, null);
        perYear[year] = 0;
        continue;
      }
      const rounded = Math.round(value * 100) / 100;
      const formatted = rounded.toFixed(2);
      series.push({ v: rounded, f: formatted }, formatted);
      perYear[year] = rounded;
      total += rounded;
    }

    rowsForTable.push({ label: wing, total, perYear });
    return [wing, ...series];
  });

  this.chartTableRows = rowsForTable.map((r) => {
    const { diff, pct } = this.computeDiffAndPct(r.perYear, years);
    return {
      label: r.label,
      total: r.total,
      perYear: r.perYear,
      diff,
      pct,
    };
  });

  this.chartType = "ColumnChart";
  this.chartOptions = {
    ...this.chartOptions,
    title: "",
    vAxis: {
      ...(this.chartOptions.vAxis || {}),
      title: "ניתוחים ליום בחדר",
    },
    hAxis: {
      ...(this.chartOptions.hAxis || {}),
      title: "מחלקה מאוגדת (Wing)",
    },
    isStacked: false,
    bar: {
      ...(this.chartOptions.bar || {}),
      groupWidth: "60%",
    },
  };
}

/**
 * Build query parameters for filtered KPIs (group‑2 APIs)
 * based on the currently selected dashboard filters.
 */
private buildKpiFilterParams(): { [key: string]: string } {
  const baseYearForKpi =
    this.getLatestYearFromDeptData() || this.currentYear.toString();

  const params: { [key: string]: string } = {
    baseYear: baseYearForKpi,
    // תמיד שולחים את כל הפרמטרים שה‑ASMX מצפה להם
    surgeryType:
      this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0
        ? this.selectedSurgeryTypes.join(",")
        : "",
    shift:
      this.selectedShifts && this.selectedShifts.length > 0
        ? this.selectedShifts.join(",")
        : "",
    site: "",
    weekend: "",
    morningWork: "",
    // פילטר מחלקה: קודם הדרופדאון "מחלקה" ליד הגרף, אחרת פילטר המחלקות מהסיידבר
    department:
      this.chartDepartmentFilter
        ? this.chartDepartmentFilter
        : this.selectedDepartments && this.selectedDepartments.length > 0
          ? this.selectedDepartments.join(",")
          : "",
  };

  // weekend – אם סונן ל"אמצע שבוע" / "סופ״ש" נדרוס את ברירת המחדל הריקה
  if (this.selectedWeekdays && this.selectedWeekdays.length === 1) {
    const only = this.selectedWeekdays[0];
    if (only === 'אמצע שבוע') {
      params.weekend = "false";
    } else if (only === 'סופ״ש') {
      params.weekend = "true";
    }
  }

  // morningWork – רק בוקר + אמצע שבוע + לא חג
  // מיפוי מהפילטר הלוגי שלנו:
  //   yes -> "true"
  //   no  -> "false"
  //   all -> ""
  if (this.morningWorkFilter === "yes") {
    params.morningWork = "true";
  } else if (this.morningWorkFilter === "no") {
    params.morningWork = "false";
  }

  // site / siteFilter – עדיפות לפילטר אתר מהסיידבר; אם ריק, משתמשים בבחירת האגף/אתר הראשית
  if (this.selectedSites && this.selectedSites.length > 0) {
    params.site = this.selectedSites.join(",");
  } else if (this.selectedDiagnosis && this.selectedDiagnosis !== "כל האתרים") {
    params.site = this.selectedDiagnosis;
  } else {
    params.site = "";
  }

  return params;
}

/**
 * Build query parameters for GetAvgDurationFiveYears_surgeries_dashborad (room-times KPI)
 * based on dashboard filters. Backend expects single values; when multi-selected we skip that filter.
 */
private buildAvgDurationFiveYearsParams(): { [key: string]: string } {
  const baseYearForKpi =
    this.getLatestYearFromDeptData() || this.currentYear.toString();

  const params: { [key: string]: string } = {
    baseYear: baseYearForKpi,
  };

  if (this.selectedSites && this.selectedSites.length === 1) {
    params.site = this.selectedSites[0];
  }

  if (this.selectedRooms && this.selectedRooms.length === 1) {
    params.room = this.selectedRooms[0];
  }

  if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length === 1) {
    params.surgeryType = this.selectedSurgeryTypes[0];
  }

  if (this.selectedShifts && this.selectedShifts.length === 1) {
    params.shift = this.selectedShifts[0];
  }

  if (this.chartDepartmentFilter) {
    // backend DTO uses Wing, and this filter UI is "מחלקה" == Wing
    params.wing = this.chartDepartmentFilter;
  }

  // day filter in this dashboard is "אמצע שבוע" / "סופ״ש". Backend returns WeekendType with those labels.
  // To maximize compatibility, we send both weekendType (string label) and weekend (true/false) when possible.
  if (this.selectedWeekdays && this.selectedWeekdays.length === 1) {
    const only = this.selectedWeekdays[0];
    if (only === "אמצע שבוע" || only === "סופ״ש") {
      params.weekendType = only;
      params.weekend = only === "סופ״ש" ? "true" : "false";
    }
  }

  // morningWork – "כן/לא" as boolean string (if backend supports it)
  if (this.morningWorkFilter === "yes") {
    params.morningWork = "true";
  } else if (this.morningWorkFilter === "no") {
    params.morningWork = "false";
  }

  return params;
}

private getBaseYearForRoomTimes(): string {
  return (this.getLatestYearFromDeptData() || this.currentYear.toString()).toString();
}

private matchesRoomTimesFilters(row: {
  Site?: string | null;
  Wing?: string | null;
  Room?: string | null;
  SurgeryType?: string | null;
  Shift?: string | null;
  WeekendType?: string | null;
}): boolean {
  // Site
  if (this.selectedSites && this.selectedSites.length > 0) {
    const s = (row.Site || "").trim();
    if (!this.selectedSites.includes(s)) return false;
  }

  // Wing (chartDepartmentFilter == Wing)
  if (this.chartDepartmentFilter) {
    const w = (row.Wing || "").trim();
    if (w !== this.chartDepartmentFilter.trim()) return false;
  }

  // SurgeryType (multi-select allowed)
  if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
    const t = (row.SurgeryType || "").trim();
    if (!this.selectedSurgeryTypes.includes(t)) return false;
  }

  // Shift (multi-select allowed)
  if (this.selectedShifts && this.selectedShifts.length > 0) {
    const sh = (row.Shift || "").trim();
    if (!this.selectedShifts.includes(sh)) return false;
  }

  // WeekendType (אמצע שבוע / סופ״ש)
  if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
    const wd = (row.WeekendType || "").trim();
    if (!this.selectedWeekdays.includes(wd)) return false;
  }

  // Room (currently UI is "(לביצוע)", but if present we still support it)
  if (this.selectedRooms && this.selectedRooms.length > 0) {
    const r = (row.Room || "").trim();
    if (!this.selectedRooms.includes(r)) return false;
  }

  return true;
}

/**
 * UI-level enable/disable per filter based on current dashboard mode.
 * "Disabled" means: visually disabled + click ignored, to avoid confusing users.
 */
isFilterDisabled(
  filterKey:
    | "chartDepartment"
    | "surgeryType"
    | "shift"
    | "weekPart"
    | "morningWork"
    | "site"
    | "room"
): boolean {
  // Existing behavior: in room utilization mode, most filters are disabled (handled earlier),
  // but we also keep it consistent here for any new uses.
  if (this.isRoomUtilizationMode()) {
    // Keep "site" enabled (there is a note telling user to use it for room-utilization).
    return filterKey !== "site";
  }

  // In room-times KPI charts, we currently support: site, surgeryType (single), shift (single),
  // weekPart (אמצע שבוע/סופ״ש), chartDepartment (wing) and sometimes morningWork (depending on sub-view).
  if (this.mainMetricMode === "room-times") {
    if (filterKey === "room") {
      return true; // UI "room" filter is marked "(לביצוע)"
    }

    // "ניתוחים ליום" (perDay) is based on GetAvgSurgeriesPerDayPerRoomFiveYears and we currently only
    // apply site filtering client-side. Other filters are misleading here → disable them.
    if (this.roomTimesView === "perDay") {
      return filterKey !== "site";
    }

    // "זמן מנוצל ליום" (approvedPerDay) is based on GetApprovedUtilization_surgeries_dashborad (baseYear only)
    // and we currently only apply site filtering client-side.
    if (this.roomTimesView === "approvedPerDay") {
      return filterKey !== "site";
    }

    // Morning work is relevant only for the KPIs that use buildKpiFilterParams() (group‑2 APIs).
    // Avg duration + loss per day are filtered locally from raw caches and do NOT support morningWork.
    if (filterKey === "morningWork") {
      return !(
        this.roomTimesView === "firstStart" ||
        this.roomTimesView === "lastEnd" ||
        this.roomTimesView === "avgSetup"
      );
    }

    return false;
  }

  // Default (main surgeries metrics) – all current filters are enabled.
  return false;
}

private filterBySelectedDiagnosis<T extends { Site?: string; Wing?: string }>(rows: T[]): T[] {
  let result = rows;

  // סינון לפי אתר (Site) מתוך הסיידבר – רלוונטי במיוחד ל‑GetAvgSurgeriesPerDayPerRoomFiveYears_surgeries_dashborad
  if (this.selectedSites && this.selectedSites.length > 0) {
    result = result.filter(r => r.Site && this.selectedSites.includes(r.Site.trim()));
  }

  if (!this.selectedDiagnosis || this.selectedDiagnosis === 'כל האתרים') {
    return result;
  }
  // ה‑API כבר מקבל את הפרמטר site (אגף / אתר) דרך buildKpiFilterParams,
  // לכן אין צורך לבצע סינון נוסף בצד הקליינט לפי selectedDiagnosis – אחרת אנו עלולים להעלים שורות תקינות.
  return result;
}

loadAvgDuration(): void {
  const baseYear = this.getBaseYearForRoomTimes();

  // If we already loaded the full dataset for this baseYear, filter locally and rebuild chart.
  const raw = this.avgDurationFiveYearsRawByBaseYear.get(baseYear);
  if (raw && raw.length > 0) {
    const filtered = raw
      .filter(r => this.matchesRoomTimesFilters(r))
      .filter(r => !this.avgDurationSiteFilter || this.avgDurationSiteFilter === "ALL" || r.Site === this.avgDurationSiteFilter);

    this.buildAvgDurationFiveYearsChart(filtered);
    this.isAvgDurationLoading = false;
    this.cdr.detectChanges();
    return;
  }

  // Only one API call per baseYear. Everything else happens in client.
  this.isAvgDurationLoading = true;
  this.avgDurationData = [];
  this.avgDurationChartColumns = [];
  this.avgDurationChartData = [];

  this.http
    .get<AvgDurationFiveYearsDto[]>(environment.url + "GetAvgDurationFiveYears_surgeries_dashborad", {
      params: { baseYear },
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.avgDurationFiveYearsRawByBaseYear.set(baseYear, list);

        const filtered = list
          .filter(r => this.matchesRoomTimesFilters(r))
          .filter(r => !this.avgDurationSiteFilter || this.avgDurationSiteFilter === "ALL" || r.Site === this.avgDurationSiteFilter);

        this.buildAvgDurationFiveYearsChart(filtered);
        this.avgDurationChartOptions = {
          title: "",
          titleTextStyle: {
            fontSize: 18,
            bold: true,
            color: "#1e293b",
          },
          chartArea: {
            width: '90%',
            height: '60%',
            left: 50,
            top: 100 // קריטי! משאיר מקום למספרים המסובבים למעלה
          },
          legend: {
            position: "top",
            alignment: "end",
            textStyle: { fontSize: 14, bold: true }
          },
          hAxis: {
            textStyle: { fontSize: 18, bold: true, color: "#334155" },

            slantedText: true, // ביטלתי את השיפוע למטה כדי שלא יתערבב לך
            slantedTextAngle: 25,
            titleTextStyle: { fontSize: 16, bold: true, italic: false },
          },
          vAxis: {
            title: "משך ניתוח ממוצע (דק')",
            textStyle: { fontSize: 16, bold: true },
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              italic: false,
            },
            viewWindowMode: "maximized",
          },
          bar: { groupWidth: "75%" }  ,        //   chartArea: {
        //     width: '90%',
        //     height: '60%',
        //     left: 40,
        //     top: 50
        //   },
          animation: { startup: true, duration: 800, easing: "out" },
          annotations: {
            alwaysOutside: true,
            textStyle: {
              fontSize: 14,
              bold: true,
            //   color: "#000000",
            //   rotation: -90 // עכשיו זה יעבוד
            },
            // ה-stem חייב להיות כאן בפנים!
            stem: {
              length: 25,
              color: "#cbd5e1"
            }
          },
    
          
        };
        this.isAvgDurationLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgDurationFiveYears_surgeries_dashborad:", error);
        this.isAvgDurationLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת משך ניתוח ממוצע", "סגור", { duration: 3000 });
      }
    );
}
private formatMinutesToHM(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) return "0:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
  }

  private buildAvgDurationFiveYearsChartModel(
    rows: AvgDurationFiveYearsDto[]
  ): { columns: any[]; data: any[]; years: number[] } {
    if (!rows || rows.length === 0) {
      return { columns: [], data: [], years: [] };
    }

    const filteredRows =
      this.avgDurationSiteFilter === "ALL"
        ? rows
        : rows.filter(r => r.Site === this.avgDurationSiteFilter);

    const allYears = Array.from(new Set(filteredRows.map(r => r.Year).filter(y => y != null))).sort((a, b) => a - b);
    const years = allYears.slice(-5);

    const columns: any[] = ["מחלקה מאוגדת (Wing)"];
    years.forEach(y => {
      columns.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });

    const wingYearMap = new Map<string, Map<number, { sumMin: number; sumCount: number }>>();
    for (const r of filteredRows) {
      const wing = (r.Wing || "לא צוין").trim();
      const year = r.Year;
      if (!years.includes(year)) continue;
      const cnt = r.Count ?? 0;
      const avgMin = r.AvgDurationMin ?? 0;
      if (!wingYearMap.has(wing)) wingYearMap.set(wing, new Map());
      const yearMap = wingYearMap.get(wing)!;
      const prev = yearMap.get(year) || { sumMin: 0, sumCount: 0 };
      prev.sumMin += avgMin * cnt;
      prev.sumCount += cnt;
      yearMap.set(year, prev);
    }

    const wings = Array.from(wingYearMap.keys()).sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

    const data = wings.map(wing => {
      const yearMap = wingYearMap.get(wing)!;
      const row: any[] = [wing];
      years.forEach(year => {
        const info = yearMap.get(year);
        if (!info || info.sumCount === 0) {
          row.push(null, null);
          return;
        }
        const avgMinutes = info.sumMin / info.sumCount;
        const label = this.formatMinutesToHM(avgMinutes);
        row.push({ v: avgMinutes, f: label }, label);
      });
      return row;
    });

    return { columns, data, years };
  }
  
private buildAvgDurationFiveYearsChart(rows: AvgDurationFiveYearsDto[]): void {
  if (!rows || rows.length === 0) {
    this.avgDurationChartColumns = [];
    this.avgDurationChartData = [];
    this.avgDurationChartYears = [];
    return;
  }
  // סינון לפי אתר במידת הצורך (ALL = כל האתרים)
  const filteredRows =
    this.avgDurationSiteFilter === "ALL"
      ? rows
      : rows.filter(r => r.Site === this.avgDurationSiteFilter);

  const allYears = Array.from(new Set(filteredRows.map(r => r.Year).filter(y => y != null))).sort((a, b) => a - b);
  const years = allYears.slice(-5);
  this.avgDurationChartYears = years;

  this.avgDurationChartColumns = ["מחלקה מאוגדת (Wing)"];
  years.forEach(y => {
    this.avgDurationChartColumns.push(
      { type: "number", label: y.toString() },
      { type: "string", role: "annotation", label: y.toString() },
    );
  });

  // אגרגציה מחדש ברמת Wing+Year: ממוצע משוקלל לפי Count מכל האתרים/מקורות
  const wingYearMap = new Map<string, Map<number, { sumMin: number; sumCount: number }>>();
  for (const r of filteredRows) {
    const wing = (r.Wing || "לא צוין").trim();
    const year = r.Year;
    if (!years.includes(year)) continue;
    const cnt = r.Count ?? 0;
    const avgMin = r.AvgDurationMin ?? 0;
    if (!wingYearMap.has(wing)) wingYearMap.set(wing, new Map());
    const yearMap = wingYearMap.get(wing)!;
    const prev = yearMap.get(year) || { sumMin: 0, sumCount: 0 };
    prev.sumMin += avgMin * cnt;
    prev.sumCount += cnt;
    yearMap.set(year, prev);
  }

  const wings = Array.from(wingYearMap.keys()).sort((a, b) => {
    const ia = this.orderedWings.indexOf(a);
    const ib = this.orderedWings.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "he");
  });

  const dataMap = new Map<string, any[]>();
  wings.forEach(wing => {
    const yearMap = wingYearMap.get(wing)!;
    const row: any[] = [wing];
    years.forEach(year => {
      const info = yearMap.get(year);
      if (!info || info.sumCount === 0) {
        row.push(null, null);
        return;
      }
      const avgMinutes = info.sumMin / info.sumCount;
      const label = this.formatMinutesToHM(avgMinutes);
      row.push({ v: avgMinutes, f: label }, label);
    });
    dataMap.set(wing, row);
  });

  this.avgDurationChartData = wings.map(wing => dataMap.get(wing)!);
}

private loadAvgFirstMorningEntry(): void {
  const kpi = this.buildKpiFilterParams();
  const paramsKey = `${kpi.baseYear}|${kpi.surgeryType}|${kpi.shift}|${kpi.site}|${kpi.weekend}|${kpi.department}`;
  if (this.firstStartTimeChartData.length > 0 && this.lastAvgFirstMorningEntryParams === paramsKey) {
    this.isFirstStartTimeLoading = false;
    this.cdr.detectChanges();
    return;
  }
  this.isFirstStartTimeLoading = true;
  this.firstStartTimeData = [];

  this.http
    .get<AvgFirstEntryRow[]>(environment.url + "GetAvgFirstMorningEntry_surgeries_dashborad", {
      params: this.buildKpiFilterParams(),
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const filtered = this.filterBySelectedDiagnosis(list);

        // טבלה – תצוגה טקסטואלית (נשמרת למקרה שימוש עתידי, גם אם כרגע לא מוצגת ב-UI)
        this.firstStartTimeData = filtered.map(r => ({
          departmentName: r.Wing || r.Department || "לא צוין",
          valueDisplay: r.AvgEntryTime || (r.AvgEntryMinutes != null ? this.minutesToTime(r.AvgEntryMinutes) : "-"),
        }));

        // גרף רב-שנתי לפי מחלקה (עד 5 שנים אחרונות)
        this.buildFirstStartTimeChart(filtered);
        this.lastAvgFirstMorningEntryParams = paramsKey;
        this.isFirstStartTimeLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgFirstMorningEntry_surgeries_dashborad:", error);
        this.isFirstStartTimeLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת זמן כניסה ממוצע", "סגור", { duration: 3000 });
      }
    );
}

  // נתונים לגרף עמודות רב-שנתי של זמן כניסה ראשון
  firstStartTimeChartColumns: any[] = [];
  firstStartTimeChartData: any[] = [];

  firstStartTimeChartOptions: any = {
    title: "",
    titleTextStyle: {
      fontSize: 18,
      bold: true,
      color: "#1e293b",
    },
    legend: {
      position: "top",
      alignment: "end",
      textStyle: { fontSize: 14, bold: true }
    },
    hAxis: {
      textStyle: { fontSize: 18, bold: true, color: "#334155" },
      slantedText: true,
      slantedTextAngle: 25,
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
    },
    vAxis: {
      title: "זמן כניסה ממוצע (HH:MM)",
      textStyle: { fontSize: 16, bold: true },
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
      viewWindowMode: "maximized",
    },
    bar: { groupWidth: "60%" },
    chartArea: {
      width: '90%',
      height: '60%',
      left: 40,
      top: 50
    },
    animation: { startup: true, duration: 800, easing: "out" },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 16,
        bold: true,
        // color: "#000000",
        // auraColor: "none",
      }
    },
  };

  private buildFirstStartTimeChart(rows: AvgFirstEntryRow[]): void {
    if (!rows || rows.length === 0) {
      this.firstStartTimeChartColumns = [];
      this.firstStartTimeChartData = [];
      this.firstStartTimeChartYears = [];
      return;
    }

    // לוקחים עד 5 שנים אחרונות
    const allYears = Array.from(
      new Set(rows.map(r => r.Year).filter(y => y != null))
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.firstStartTimeChartYears = years;

    // עמודה ראשונה = מחלקה, אח"כ עבור כל שנה:
    // עמודת ערך + עמודת אנוטציה (טקסט מעל העמודה)
    const firstStartColumns: any[] = ["מחלקה"];
    years.forEach(y => {
      firstStartColumns.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });
    this.firstStartTimeChartColumns = firstStartColumns;

    // ממוצע משוקלל לפי Count עבור כל מחלקה ושנה
    const deptYearMap = new Map<string, Map<number, { sumMinutes: number; sumCount: number }>>();

    for (const r of rows) {
      if (r.AvgEntryMinutes == null || r.Count == null || r.Count <= 0) {
        continue;
      }
      const dept = (r.Wing || r.Department || "לא צוין").trim();
      const year = r.Year;
      if (!years.includes(year)) {
        continue;
      }

      if (!deptYearMap.has(dept)) {
        deptYearMap.set(dept, new Map());
      }
      const yearMap = deptYearMap.get(dept)!;
      const prev = yearMap.get(year) || { sumMinutes: 0, sumCount: 0 };
      prev.sumMinutes += r.AvgEntryMinutes * r.Count;
      prev.sumCount += r.Count;
      yearMap.set(year, prev);
    }

    const departments = Array.from(deptYearMap.keys()).sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

    this.firstStartTimeChartData = departments.map(dept => {
      const yearMap = deptYearMap.get(dept)!;
      const series: any[] = [];

      for (const year of years) {
        const info = yearMap.get(year);
        if (!info || info.sumCount === 0) {
          series.push(null, null);
          continue;
        }
        const avgMinutes = info.sumMinutes / info.sumCount;
        const formatted = this.minutesToTime(avgMinutes);
        series.push(
          { v: avgMinutes, f: formatted },
          formatted,
        );
      }

      return [dept, ...series];
    });
  }

  // נתונים לגרף עמודות רב-שנתי של זמן סיום ניתוח אחרון
  lastEndTimeChartColumns: any[] = [];
  lastEndTimeChartData: any[] = [];

  // נתונים לגרף עמודות רב-שנתי של זמן SETUP ממוצע
  avgSetupChartColumns: any[] = [];
  avgSetupChartData: any[] = [];

  // זמן אבוד ליום לפי מחלקה – נתונים ו־options
  lossByWingChartColumns: any[] = [];
  lossByWingChartData: any[] = [];
  lossByWingChartYears: number[] = [];
  lossByWingChartOptions: any = {
    title: "",
    titleTextStyle: {
      fontSize: 18,
      bold: true,
      color: "#1e293b",
    },
    legend: {
      position: "top",
      alignment: "end",
      textStyle: { fontSize: 14, bold: true }
    },
    hAxis: {
      textStyle: { fontSize: 18, bold: true, color: "#334155" },
      slantedText: true,
      slantedTextAngle: 25,
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
    },
    vAxis: {
      title: "זמן אבוד ליום (דקות)",
      textStyle: { fontSize: 16, bold: true },
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
      viewWindowMode: "maximized",
    },
    bar: { groupWidth: "60%" },
    chartArea: {
      width: '90%',
      height: '60%',
      left: 40,
      top: 50
    },
    animation: { startup: true, duration: 800, easing: "out" },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 13.5,
        bold: true,
        // rotation: -90,
        // make sure text is readable on the bar colors
        // color: "#000000",
        auraColor: "none",
      },
      stem: {
        length: 25,
        color: "#cbd5e1",
      },
    },
  };
  isLossByWingLoading = false;
  private lastLossByWingBaseYear: string | null = null;
  private lossByWingRowsCache: LossByWingYearDto[] = [];

  // זמן מנוצל/מאושר ליום לפי מחלקה – נתונים ו־options
  approvedUtilizationChartColumns: any[] = [];
  approvedUtilizationChartData: any[] = [];
  approvedUtilizationChartYears: number[] = [];
  approvedUtilizationChartOptions: any = {
    title: "",
    titleTextStyle: {
      fontSize: 18,
      bold: true,
      color: "#1e293b",
    },
    legend: {
      position: "top",
      alignment: "end",
      textStyle: { fontSize: 14, bold: true },
    },
    hAxis: {
      textStyle: { fontSize: 18, bold: true, color: "#334155" },
      slantedText: true,
      slantedTextAngle: 25,
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
    },
    vAxis: {
      title: "זמן מנוצל ליום (דקות)",
      textStyle: { fontSize: 16, bold: true },
      titleTextStyle: {
        fontSize: 16,
        bold: true,
        italic: false,
      },
      viewWindowMode: "maximized",
    },
    bar: { groupWidth: "60%" },
    chartArea: {
      width: "90%",
      height: "60%",
      left: 40,
      top: 50,
    },
    animation: { startup: true, duration: 800, easing: "out" },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 13.5,
                bold: true,
        auraColor: "none",
      },
      stem: {
        length: 25,
        color: "#cbd5e1",
      },
    },
  };

private loadAvgLastMorningEnd(): void {
  const kpi = this.buildKpiFilterParams();
  const paramsKey = `${kpi.baseYear}|${kpi.surgeryType}|${kpi.shift}|${kpi.site}|${kpi.weekend}|${kpi.department}`;
  if (this.lastEndTimeRows.length > 0 && this.lastAvgLastMorningEndParams === paramsKey) {
    this.applyLastEndTimeDisplay();
    this.isLastEndTimeLoading = false;
    this.cdr.detectChanges();
    return;
  }
  this.isLastEndTimeLoading = true;
  this.lastEndTimeData = [];

  this.http
    .get<AvgLastEndRow[]>(environment.url + "GetAvgLastMorningEnd_surgeries_dashborad", {
      params: kpi,
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const noCardiology = list.filter(
          (r) =>
            (r.Wing || '').trim() !== 'קרדיולוגיה' &&
            (r.Department || '').trim() !== 'קרדיולוגיה'
        );
        const filtered = this.filterBySelectedDiagnosis(noCardiology);
        this.lastEndTimeRows = filtered;
        this.lastAvgLastMorningEndParams = paramsKey;
        this.applyLastEndTimeDisplay();

        this.isLastEndTimeLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgLastMorningEnd_surgeries_dashborad:", error);
        this.isLastEndTimeLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת זמן סיום ממוצע", "סגור", { duration: 3000 });
      }
    );
}

  private buildLastEndTimeChart(rows: AvgLastEndRow[], useExcludingOverflow = false): void {
    if (!rows || rows.length === 0) {
      this.lastEndTimeChartColumns = [];
      this.lastEndTimeChartData = [];
      this.lastEndTimeChartYears = [];
      return;
    }

    const getMinutes = (r: AvgLastEndRow): number | null | undefined =>
      useExcludingOverflow ? this.getLastEndExcludingOverflow(r).avgMinutes : r.AvgEndMinutes;
    const getCount = (r: AvgLastEndRow): number =>
      useExcludingOverflow ? this.getLastEndExcludingOverflow(r).count : (r.Count ?? 0);

    // לוקחים עד 5 שנים אחרונות
    const allYears = Array.from(
      new Set(rows.map(r => r.Year).filter(y => y != null))
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.lastEndTimeChartYears = years;

    const lastEndColumns: any[] = ["מחלקה"];
    years.forEach(y => {
      lastEndColumns.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });
    this.lastEndTimeChartColumns = lastEndColumns;

    // ממוצע משוקלל לפי Count (או ימים ללא גלישה) עבור כל מחלקה ושנה
    const deptYearMap = new Map<string, Map<number, { sumMinutes: number; sumCount: number }>>();

    for (const r of rows) {
      const minutes = getMinutes(r);
      const count = getCount(r);
      if (minutes == null || count <= 0) {
        continue;
      }
      const dept = (r.Wing || r.Department || "לא צוין").trim();
      const year = r.Year;
      if (!years.includes(year)) {
        continue;
      }

      if (!deptYearMap.has(dept)) {
        deptYearMap.set(dept, new Map());
      }
      const yearMap = deptYearMap.get(dept)!;
      const prev = yearMap.get(year) || { sumMinutes: 0, sumCount: 0 };
      prev.sumMinutes += minutes * count;
      prev.sumCount += count;
      yearMap.set(year, prev);
    }

    const departments = Array.from(deptYearMap.keys()).sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

    // במצב "ללא גלישה" אם אין אף נתון (כל הימים גלשו) – מציגים גרף רגיל כדי שהמסך לא יישאר ריק
    if (useExcludingOverflow && departments.length === 0) {
      this.lastEndTimeExcludeNoData = true;
      this.buildLastEndTimeChart(rows, false);
      return;
    }

    this.lastEndTimeChartData = departments.map(dept => {
      const yearMap = deptYearMap.get(dept)!;
      const series: any[] = [];

      for (const year of years) {
        const info = yearMap.get(year);
        if (!info || info.sumCount === 0) {
          series.push(null, null);
          continue;
        }
        const avgMinutes = info.sumMinutes / info.sumCount;
        const formatted = this.minutesToTime(avgMinutes);
        series.push(
          { v: avgMinutes, f: formatted },
          formatted,
        );
      }

      return [dept, ...series];
    });

    // Move legend (מקרא) to the top for this chart only.
    // Keep the rest as Google Charts defaults to avoid side effects.
    // this.lastEndTimeChartOptions = {
    //   legend: { position: "top", alignment: "end" },
    // };
    this.lastEndTimeChartOptions = {
        title: "",
        titleTextStyle: {
          fontSize: 18,
          bold: true,
          color: "#1e293b",
        },
        legend: {
          position: "top",
          alignment: "end",
          textStyle: { fontSize: 14, bold: true }
        },
        hAxis: {
          textStyle: { fontSize: 28, bold: true, color: "#334155" },
          slantedText: true,
          slantedTextAngle: 25,
          titleTextStyle: {
            fontSize: 16,
            bold: true,
            italic: false,
          },
        },
        vAxis: {
          title: "ממוצע זמן סיום ניתוח אחרון (שעה)",
          textStyle: { fontSize: 16, bold: true },
          titleTextStyle: {
            fontSize: 16,
            bold: true,
            italic: false,
          },
          viewWindowMode: "maximized",
          // טווח טיפוסי ל‑SETUP (0–120) + טיק מודגש ב‑20 דקות
        //   ticks: [0, 20, 40, 60, 80, 100, 120],
        },
        bar: { groupWidth: "60%" },
        chartArea: {
          width: '90%',
          height: '60%',
          left: 40,
          top: 50
        },
        animation: { startup: true, duration: 800, easing: "out" },
        annotations: {
          alwaysOutside: true,
          textStyle: {
            fontSize: 14,
            rotation: -90,
            bold: true,
          }
        },
        // series: {
        //   [thresholdSeriesIndex]: {
        //     type: "line",
        //     color: "#ff0000",
        //     lineWidth: 2,
        //     // קו מקוקו כדי שיבדל מהעמודות
        //     lineDashStyle: [6, 4],
        //     visibleInLegend: true
        //   }
        // }
      };
  }

private loadAvgSetup(): void {
  const kpi = this.buildKpiFilterParams();
  const paramsKey = `${kpi.baseYear}|${kpi.surgeryType}|${kpi.shift}|${kpi.site}|${kpi.weekend}|${kpi.department}`;
  if (this.avgSetupChartData.length > 0 && this.lastAvgSetupParams === paramsKey) {
    this.isAvgSetupLoading = false;
    this.cdr.detectChanges();
    return;
  }
  this.isAvgSetupLoading = true;
  this.avgSetupData = [];

  this.http
    .get<AvgSetupRow[]>(environment.url + "GetAvgSetup_surgeries_dashborad", {
      params: kpi,
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const filtered = this.filterBySelectedDiagnosis(list);
        this.avgSetupData = filtered.map(r => ({
          departmentName: r.Wing || r.Department || "לא צוין",
          valueDisplay: r.AvgSetupMin != null ? r.AvgSetupMin.toFixed(1) : "-",
        }));

        // בניית גרף רב-שנתי לפי מחלקה
        this.buildAvgSetupChart(filtered);
        this.lastAvgSetupParams = paramsKey;

        // קונפיגורציית הגרף כולל קו סף אדום ב-20 דקות
        const thresholdSeriesIndex = this.avgSetupChartYears.length; // הסדרה האחרונה היא קו הסף
        this.avgSetupChartOptions = {
          title: "",
          titleTextStyle: {
            fontSize: 18,
            bold: true,
            color: "#1e293b",
          },
          legend: {
            position: "top",
            alignment: "end",
            textStyle: { fontSize: 14, bold: true }
          },
          hAxis: {
            textStyle: { fontSize: 18, bold: true, color: "#334155" },
            slantedText: true,
            slantedTextAngle: 25,
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              italic: false,
            },
          },
          vAxis: {
            title: "זמן SETUP ממוצע (דק')",
            textStyle: { fontSize: 16, bold: true },
            titleTextStyle: {
              fontSize: 16,
              bold: true,
              italic: false,
            },
            viewWindowMode: "maximized",
          },
          bar: { groupWidth: "60%" },
          chartArea: {
            width: '90%',
            height: '60%',
            left: 40,
            top: 50
          },
          animation: { startup: true, duration: 800, easing: "out" },
          annotations: {
            alwaysOutside: true,
            textStyle: {
              fontSize: 14,
              rotation: -90,
              bold: true,
            }
          },
          series: {
            [thresholdSeriesIndex]: {
              type: "line",
              color: "#ff0000",
              lineWidth: 2,
              // קו מקוקו כדי שיבדל מהעמודות
              lineDashStyle: [6, 4],
              visibleInLegend: true
            }
          }
        };

        this.isAvgSetupLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgSetup_surgeries_dashborad:", error);
        this.isAvgSetupLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת זמן SETUP ממוצע", "סגור", { duration: 3000 });
      }
    );
}

  private buildAvgSetupChart(rows: AvgSetupRow[]): void {
    if (!rows || rows.length === 0) {
      this.avgSetupChartColumns = [];
      this.avgSetupChartData = [];
      this.avgSetupChartYears = [];
      return;
    }

    // כל השנים כפי שהשרת החזיר – בלי חישוב מחדש
    const years = Array.from(new Set(rows.map(r => r.Year))).sort((a, b) => a - b);
    this.avgSetupChartYears = years;

    // מיפוי מחלקה -> שנה -> ערך SETUP כפי שחזר מהשרת (ללא AVG נוסף בצד הקליינט)
    const deptMap = new Map<string, Map<number, number | null>>();

    rows.forEach(r => {
      const dept = (r.Wing || r.Department || "לא צוין").trim();
      const year = r.Year;
      const val = r.AvgSetupMin ?? null;

      if (!deptMap.has(dept)) {
        deptMap.set(dept, new Map<number, number | null>());
      }

      // אם יש כמה רשומות לאותה מחלקה/שנה – האחרונה גוברת, בלי חישוב משוכלל נוסף
      deptMap.get(dept)!.set(year, val);
    });

    // כותרות: מחלקה + (לכל שנה: מספר + annotation) + סדרה לקו הסף
    const cols: any[] = ["מחלקה"];
    years.forEach(y => {
      cols.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });
    // עמודת מספר + annotation עבור קו סף 20 דקות
    cols.push(
      { type: "number", label: "20 דק'" },
      { type: "string", role: "annotation", label: "20 דק'" },
    );
    this.avgSetupChartColumns = cols;

    // נתונים: לכל מחלקה ערך כפי שהשרת החזיר + טקסט מעל כל עמודה
    this.avgSetupChartData = Array.from(deptMap.keys())
      .sort((a, b) => {
        const ia = this.orderedWings.indexOf(a);
        const ib = this.orderedWings.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b, "he");
      })
      .map(dept => {
        const yearMap = deptMap.get(dept)!;
        const series: any[] = [];

        years.forEach(y => {
            const val = yearMap.get(y);
            if (val == null) {
              // חובה לשמור על זוגות [value, annotation]
              series.push(null, null);
            } else {
              const formatted = `${Math.trunc(val)} `;
              series.push(
                { v: val, f: Math.trunc(val).toString() },
                formatted,
              );
            }
          });
          

        // קו יעד קבוע – 20 דקות SETUP, בלי טקסט שחוזר בכל מחלקה
        series.push(
          { v: 20, f: "20" },
          null
        );

        return [dept, ...series];
      });
  }

private loadLossByWingPerDay(): void {
  const baseYear = this.getBaseYearForRoomTimes();

  const raw = this.lossByWingYearRawByBaseYear.get(baseYear);
  if (raw && raw.length > 0) {
    const filtered = raw.filter(r => this.matchesRoomTimesFilters({
      Site: r.Site,
      Wing: r.Wing,
      Room: r.Room,
      SurgeryType: r.SurgeryType,
      Shift: r.Shift,
      WeekendType: r.WeekendType,
    }));

    this.lossByWingRowsCache = filtered;
    this.buildLossByWingChart(filtered);
    this.isLossByWingLoading = false;
    this.cdr.detectChanges();
    return;
  }

  this.isLossByWingLoading = true;

  // Only one API call per baseYear; filter locally afterwards.
  this.http
    .get<LossByWingYearDto[]>(environment.url + "GetLossByWingYear_surgeries_dashborad", {
      params: { baseYear },
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.lossByWingYearRawByBaseYear.set(baseYear, list);

        const filtered = list.filter(r => this.matchesRoomTimesFilters({
          Site: r.Site,
          Wing: r.Wing,
          Room: r.Room,
          SurgeryType: r.SurgeryType,
          Shift: r.Shift,
          WeekendType: r.WeekendType,
        }));

        this.lossByWingRowsCache = filtered;
        this.buildLossByWingChart(filtered);
        this.isLossByWingLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetLossByWingYear_surgeries_dashborad:", error);
        this.isLossByWingLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת זמן אבוד ליום", "סגור", { duration: 3000 });
      }
    );
}

private buildLossByWingChart(rows: LossByWingYearDto[]): void {
  if (!rows || rows.length === 0) {
    this.lossByWingChartColumns = [];
    this.lossByWingChartData = [];
    this.lossByWingChartYears = [];
    return;
  }

  // כל השנים בדיוק כפי שהשרת החזיר – מומרים למספרים
  const years = Array.from(new Set(rows.map(r => Number(r.Year)))).sort((a, b) => a - b);
  this.lossByWingChartYears = years;

  // מחלקות (Wing) ממוינות לפי סדר ידוע אם קיים
  const wings = Array.from(new Set(rows.map(r => (r.Wing || "לא צוין").trim()))).sort((a, b) => {
    const ia = this.orderedWings.indexOf(a);
    const ib = this.orderedWings.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "he");
  });

  // כותרות: מחלקה + (לכל שנה: value + annotation)
  const cols: any[] = ["מחלקה"];
  years.forEach(y => {
    cols.push(
      { type: "number", label: y.toString() },
      { type: "string", role: "annotation", label: y.toString() },
    );
  });
  this.lossByWingChartColumns = cols;

  const byWingYear = new Map<string, Map<number, { min: number; label: string }>>();
  rows.forEach(r => {
    const wing = (r.Wing || "לא צוין").trim();
    const year = Number(r.Year);
    // אם השנה אינה מספר תקין – נדלג
    if (isNaN(year)) {
      return;
    }

    let val: number | null = r.Loss ?? null;

    // אם Loss ריק אבל קיבלנו AvgLossTime כטקסט "HH:mm" – נמיר לדקות
    if ((val == null || isNaN(val)) && r.AvgLossTime) {
      const parts = r.AvgLossTime.split(":");
      if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          val = h * 60 + m;
        }
      }
    }

    if (val == null || isNaN(val)) {
      return;
    }

    if (!byWingYear.has(wing)) {
      byWingYear.set(wing, new Map<number, { min: number; label: string }>());
    }

    const label =
      (r.AvgLossTime && r.AvgLossTime.trim()) ||
      this.minutesToTime(val);

    // אם יש כמה רשומות לאותה מחלקה/שנה – האחרונה גוברת; לא עושים ממוצע מחדש
    byWingYear.get(wing)!.set(year, { min: val, label });
  });

  this.lossByWingChartData = wings.map(wing => {
    const yearMap = byWingYear.get(wing) || new Map<number, { min: number; label: string }>();
    const series: any[] = [];

    years.forEach(y => {
      const entry = yearMap.get(y);
      if (!entry || entry.min == null || isNaN(entry.min)) {
        series.push(null, null);
        return;
      }

      const intVal = Math.round(entry.min);
      const label = entry.label || this.minutesToTime(intVal);

      series.push(
        { v: intVal, f: label },
        label,
      );
    });

    return [wing, ...series];
  });
}

private loadApprovedUtilizationPerDay(): void {
  const baseYear = this.getBaseYearForRoomTimes();

  const raw = this.approvedUtilizationRawByBaseYear.get(baseYear);
  if (raw && raw.length > 0) {
    const filtered = raw.filter(r => this.matchesRoomTimesFilters({
      Site: r.Site,
      Wing: r.Wing,
    }));
    const filteredBySite = this.filterBySelectedDiagnosis(filtered);
    this.buildApprovedUtilizationChart(filteredBySite);
    this.isApprovedUtilizationLoading = false;
    this.cdr.detectChanges();
    return;
  }

  this.isApprovedUtilizationLoading = true;
  this.approvedUtilizationChartColumns = [];
  this.approvedUtilizationChartData = [];
  this.approvedUtilizationChartYears = [];

  this.http
    .get<ApprovedUtilizationDto[]>(environment.url + "GetApprovedUtilization_surgeries_dashborad", {
      params: { baseYear },
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.approvedUtilizationRawByBaseYear.set(baseYear, list);

        const filtered = list.filter(r => this.matchesRoomTimesFilters({
          Site: r.Site,
          Wing: r.Wing,
        }));
        const filteredBySite = this.filterBySelectedDiagnosis(filtered);

        this.buildApprovedUtilizationChart(filteredBySite);
        this.isApprovedUtilizationLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetApprovedUtilization_surgeries_dashborad:", error);
        this.isApprovedUtilizationLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת זמן מנוצל ליום", "סגור", { duration: 3000 });
      }
    );
}

private buildApprovedUtilizationChart(rows: ApprovedUtilizationDto[]): void {
  if (!rows || rows.length === 0) {
    this.approvedUtilizationChartColumns = [];
    this.approvedUtilizationChartData = [];
    this.approvedUtilizationChartYears = [];
    return;
  }

  const allYears = Array.from(new Set(rows.map(r => Number(r.Year)).filter(y => !isNaN(y)))).sort((a, b) => a - b);
  const years = allYears.slice(-5);
  this.approvedUtilizationChartYears = years;

  const cols: any[] = ["מחלקה"];
  years.forEach(y => {
    cols.push(
      { type: "number", label: y.toString() },
      { type: "string", role: "annotation", label: y.toString() },
    );
  });
  this.approvedUtilizationChartColumns = cols;

  const byWingYear = new Map<string, Map<number, { min: number; label: string }>>();
  for (const r of rows) {
    const wing = (r.Wing || "לא צוין").trim();
    const year = Number(r.Year);
    if (!years.includes(year)) continue;
    const min = r.AvgApprovedMin;
    if (min == null || !Number.isFinite(min)) continue;
    const label = r.AvgApprovedHHMM ? r.AvgApprovedHHMM : this.formatMinutesToHM(min);
    if (!byWingYear.has(wing)) byWingYear.set(wing, new Map());
    byWingYear.get(wing)!.set(year, { min, label });
  }

  const wings = Array.from(byWingYear.keys())
    .filter(w => w !== "אחר" && w !== "קרדיולוגיה")
    .sort((a, b) => {
      const ia = this.orderedWings.indexOf(a);
      const ib = this.orderedWings.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "he");
    });

  this.approvedUtilizationChartData = wings.map(wing => {
    const yearMap = byWingYear.get(wing) || new Map<number, { min: number; label: string }>();
    const series: any[] = [];

    years.forEach(y => {
      const v = yearMap.get(y);
      if (!v) {
        series.push(null, null);
        return;
      }
      series.push({ v: v.min, f: v.label }, v.label);
    });

    return [wing, ...series];
  });
}

private minutesToTime(totalMinutes: number): string {
  if (totalMinutes == null || isNaN(totalMinutes)) {
    return "-";
  }
  const minutes = Math.round(totalMinutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
}


