import { animate, style, transition, trigger } from "@angular/animations";
import { HttpClient } from "@angular/common/http";
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    DoCheck,
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
import { NavigationEnd, Router } from "@angular/router";
import { Chart } from "chart.js";
import { Observable, Subscription } from "rxjs";
import { filter, map } from "rxjs/operators";
import { parseAsmxPayload } from "./utils/pci-asmx.util";
import { environment } from "src/environments/environment";
import { MenuPerm } from "../menu-perm";
import { PciCancellationsComponent } from "./components/cancellations/pci-cancellations.component";
import { PciRevenueComponent } from "./components/revenue/pci-revenue.component";
import { PciDashboardFilterPanel } from "./components/pci-dashboard-filter-panel";

/** שורת נתוני צינתור כפי שחוזרת מהשרת (שדות באנגלית) */
export interface PciRow {
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

/** מקטע ראשי מתחת לפס המדדים המהירים */
export type PciTopQuickMainSlot =
    | "wait"
    | "performed"
    | "revenue"
    | "cancellations";

/** משתמשים שרואים את פס המעבר בין אזורי התוכן הראשיים (זמני המתנה / הכנסות / ביטולים) */
const TOP_QUICK_MAIN_SLOT_SWITCHER_USERS = new Set([
    "ccymerman",
    "rbenmoshe",
]);

export type CompareDeptInsightTrend =
    | "up"
    | "down"
    | "flat"
    | "neutral"
    | "partial";

/** שורה בטבלת מסקנות השוואת מחלקות */
export interface CompareDeptInsightTableRow {
    label: string;
    latestVal: string;
    prevVal?: string;
    delta?: string;
    pct?: string;
    trend: CompareDeptInsightTrend;
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
    AvgEntryTime: string; // HH:MM
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
    AvgEndTime: string; // HH:MM
    AvgEndMinutes: number;
    /** ימים שבהם הצינתור האחרון הסתיים אחרי 15:00 (לחישוב מקומי אם השרת לא שולח NoLateDays) */
    CountOverflowDaysOnly?: number;
    AvgEndMinutesOverflowDaysOnly?: number;
    AvgEndTimeOverflowDaysOnly?: string;
    /** ממוצע ללא ימים "מאוחרים" (הצינתור האחרון לא הסתיים אחרי 15:00) – כפתור "ממוצע אמיתי" */
    CountNoLateDays?: number;
    AvgEndMinutesNoLateDays?: number;
    AvgEndTimeNoLateDays?: string;
}

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
    /** כשהשרת מחזיר פירוט לפי סוג מאוחד (כמו CountByDept) */
    UnifiedSurgeryType?: string;
    Shift?: string;
    WeekendType?: string;
}

/**
 * פלט GetAvgDurationYearlyFiveYears_pci_dashborad — ממוצע SQL לפי שנה/אתר/Wing/סוג צינתור מאוחד
 * (למודאל השוואת מחלקות בלבד, סדרת «זמן צינתור ממוצע — כל המשמרות והימים»).
 */
export interface AvgDurationYearlyDto {
    Year: number;
    Site: string;
    Wing: string;
    SurgeryType: string;
    Count: number;
    AvgMinutes: number;
    AvgHHMM: string;
}

type AvgDurationSiteFilter =
    | "ALL"
    | "חנ-כללי"
    | "חנ-אמבול"
    | "חנ-יולד"
    | "חנ-מחלקה"
    | "חנ-פהלסת";

/** זמן מנוצל/מאושר ממוצע (לפי שנה) לפי מחלקה – GetApprovedUtilization_pci_dashborad */
export interface ApprovedUtilizationDto {
    Year: number;
    Wing: string;
    Site: string;
    AvgApprovedMin: number;
    AvgApprovedHHMM: string;
}

/**
 * ממוצע צינתורים ליום בחדר (לפי שנה) לפי מחלקה – GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad.
 *
 * ימים «מלאים» (FullDays): ימים שבהם נרשמו גם פתיחת חדר (ראשון בוקר) וגם סגירת חדר (אחרון בוקר).
 * מספר החדרים שבאותו יום נספרים בו־זמנית כפתוחים וכסגורים אינו יכול לעלות על min(RoomsOpen, RoomsClose)
 * (למשל RoomsOpen=2 ו־RoomsClose=4 ⇒ לכל היותר 2 התאמות כאלה).
 * השרת מחזיר את FullDays ואת AvgSurgeries בהתאם ללוגיקה הזו.
 */
export interface AvgSurgeriesPerDayPerRoomDto {
    Year: number;
    Site: string;
    Department: string;
    Wing: string;
    /** ממוצע צינתורים ליום בחדר עבור המחלקה/המחלקה המאוגדת */
    AvgSurgeries: number;
    /** מספר חדרים שונים שהוקצו במהלך התקופה */
    RoomsTotal: number;
    /** סה״כ ימים שבהם נרשמה פתיחת חדר (ראשון בוקר) */
    RoomsOpen: number;
    /** סה״כ ימים שבהם נרשמה סגירת חדר (אחרון בוקר) */
    RoomsClose: number;
    /** ימים «מלאים»: ימים שבהם נרשמו גם פתיחה וגם סגירה; קשור ל־min(פתיחות, סגירות) ברמת היום */
    FullDays: number;
}

/**
 * GetDepRoomFiveYears_pci_dashborad — YTD; צינתורים ליום חדר רק בימים ללא פיצול (מודאל השוואת מחלקות).
 * שמות שדות תואמים JSON מ־ASP.NET; ייתכנו גם גרסאות camelCase.
 */
export interface RoomsStatsDepRoomDto {
    Year: number;
    Site: string;
    Department: string;
    Wing: string;
    WorkDays?: number;
    /** ימים ללא יום פיצול — משמשים לבסיס הממוצע כשאין פירוט נפרד */
    FullDays?: number;
    /** צינתורים בימים ללא פיצול בלבד */
    Surgeries?: number;
    /** ממוצע צינתורים ליום חדר מלא (ללא פיצול) */
    AvgSurgeries?: number;
    /** ממוצע צינתורים ליום פתיחת חדר — רק ימים ללא פיצול; המדד לעמודת ההשוואה */
    AvgSurgeriesPerOpenRoomDay?: number;
    /** ימי פתיחת חדר (ללא פיצול) — לאגרגציה */
    RoomsOpenDays?: number;
    /** שדות נלווים מהשרת (לסינון / תצוגות אחרות) */
    RoomsTotal?: number;
    RoomsOpen?: number;
    RoomsClose?: number;
}

/** זמן אבוד ליום לפי מחלקה ושנה – GetLossByWingYear_pci_dashborad */
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

/** השוואה YoY לפי מחלקה – צינתורים לחדר, זמן צינתור, הכנסה (ואחוזי שינוי) */
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
    Doctor?: string;
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
    selector: "app-pci-dashborad",
    templateUrl: "./pci-dashborad.component.html",
    styleUrls: [
        "./pci-dashborad.component.css",
        "./pci-subpanel-mock.ngdeep.css",
    ],
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
    ],
})
export class PciDashboradComponent
    implements OnInit, OnDestroy, DoCheck, AfterViewInit
{
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild("yoyCombinedChart")
    yoyCombinedChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild("yoyCombinedChartInline")
    yoyCombinedChartInlineRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild("tableBodyEl") tableBodyEl?: ElementRef<HTMLDivElement>;
    @ViewChild("compareMetricsDropdownWrap")
    compareMetricsDropdownWrap?: ElementRef<HTMLElement>;
    @ViewChild("compareSurgeryTypesDropdownWrap")
    compareSurgeryTypesDropdownWrap?: ElementRef<HTMLElement>;
    @ViewChild("filterSidebarRoot") filterSidebarRoot?: ElementRef<HTMLElement>;
    @ViewChild("revenuePanel") revenuePanel?: PciRevenueComponent;
    @ViewChild("cancellationsPanel")
    cancellationsPanel?: PciCancellationsComponent;
    @ViewChild("waitTimesPanel") waitTimesPanel?: PciDashboardFilterPanel;

    showTableExtra = false;

    private yoyCombinedChart: Chart | null = null;
    private yoyCombinedInlineChart: Chart | null = null;
    /** שמירת אפשרויות Google Chart לפני מעבר למדד משולב (Chart.js) */
    private savedGoogleChartOptionsBeforeYoy: any | null = null;
    /** מאלץ יצירה מחדש של google-chart אחרי יציאה ממדד משולב */
    showMainGoogleChart = true;

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
    /** רשימת נתוני צינתורים מהשרת (מבנה כפי שהמשתמש ציין) */
    surgeryData: PciRow[] = [];
    departmentDetailedData: DepartmentDetailedDataDto[] = [];
    diagnosesList: string[] = [];
    yearlyTotalData: YearlyIncomeDto[] = [];
    topDepartments: TopDepartmentDto[] = [];

    // Aggregated counts by department from new API
    countByDeptData: CountByDeptRow[] = [];

    // Aggregated counts by month from new API
    monthlyCountsData: MonthlyCountRow[] = [];

    /** חודש ושנה מקסימליים בנתוני GetMonthlyCounts (לכותרת — לא לפי לוח שנה מקומי) */
    monthlyCountsLatestPeriod: { year: number; month: number } | null = null;

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
        label: string; // שם ישות השורה (מחלקה / אתר / משמרת / סוג מימון / סה"כ / חודש)
        total: number; // סה"כ לכל השנים
        perYear: { [year: number]: number }; // כמות לכל שנה
        diff?: number; // הפרש בין השנה האחרונה לקודמת
        pct?: string; // אחוז שינוי בין השנה האחרונה לקודמת
        isFuture?: boolean; // לחודשים שטרם התרחשו בשנה הנוכחית – אין להציג הפרש/אחוז
    }[] = [];

    /**
     * פורמט ערכים בטבלה הצדדית ובכרטיסי table-extra (מתעדכן לפי סוג הגרף המוצג).
     */
    sideTableValueFormat: "count" | "decimal2" | "durationHm" | "clock" =
        "count";

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
            title: "מספר צינתורים",
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
            width: "90%",
            height: "60%", // הקטנו מ-78% כדי לתת מקום לטקסט למעלה
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
        return this.chartTableRows.reduce(
            (sum, row) => sum + (row.total || 0),
            0,
        );
    }

    /** השנה המוקדמת ביותר בטווח השנים המוצג (הראשונה במערך — מהישן לחדש) */
    get kpiBaseYear(): number | null {
        return this.yearsForChart && this.yearsForChart.length
            ? this.yearsForChart[0]
            : null;
    }

    /** השנה שמיד לפני השנה האחרונה בטווח (להשוואה שנה-מול-שנה שעברה) */
    get kpiPriorYear(): number | null {
        if (!this.yearsForChart || this.yearsForChart.length < 2) {
            return null;
        }
        return this.yearsForChart[this.yearsForChart.length - 2];
    }

    /** השנה האחרונה המוצגת בגרף / בטבלה */
    get kpiLastYear(): number | null {
        return this.yearsForChart && this.yearsForChart.length
            ? this.yearsForChart[this.yearsForChart.length - 1]
            : null;
    }

    /** כרטיסי סיכום שנה: חדשה משמאל, ישנה מימין */
    get yearsForChartNewestFirst(): number[] {
        if (!this.yearsForChart?.length) {
            return [];
        }
        return [...this.yearsForChart].reverse();
    }

    private getYearTotalSafe(year: number | null): number | null {
        if (year == null) {
            return null;
        }
        const totals = this.yearlySurgeryTotals || {};
        const value = totals[year];
        return typeof value === "number" ? value : null;
    }

    /** סה"כ צינתורים בשנת הבסיס (המוקדמת בטווח) */
    get kpiBaseTotal(): number | null {
        return this.getYearTotalSafe(this.kpiBaseYear);
    }

    /** סה"כ צינתורים בשנה שעברה ביחס לשנה האחרונה מוצגת (שנה לפני האחרונה) */
    get kpiPriorYearTotal(): number | null {
        return this.getYearTotalSafe(this.kpiPriorYear);
    }

    /** סה"כ צינתורים בשנה האחרונה */
    get kpiLastTotal(): number | null {
        return this.getYearTotalSafe(this.kpiLastYear);
    }

    /** הפרש כמותי בין השנה האחרונה לשנה שעברה המוצגת */
    get kpiLastDiff(): number | null {
        const prior = this.kpiPriorYearTotal;
        const last = this.kpiLastTotal;
        if (prior == null || last == null) {
            return null;
        }
        return last - prior;
    }

    /** אחוז שינוי מול השנה שעברה (בסיס: סה"כ שנת השוואה) */
    get kpiLastDiffPct(): number | null {
        const prior = this.kpiPriorYearTotal;
        const diff = this.kpiLastDiff;
        if (prior == null || prior === 0 || diff == null) {
            return null;
        }
        return (diff / prior) * 100;
    }

    /** ישות מובילה בטבלה המצטברת: לפי השנה האחרונה המוצגת (או סה"כ כשאין שנה) */
    get kpiTopEntityLabel(): string | null {
        if (!this.chartTableRows || !this.chartTableRows.length) {
            return null;
        }
        const ly = this.kpiLastYear;
        const rows = this.chartTableRows.filter((r) => !r.isFuture);
        if (!rows.length) {
            return null;
        }
        const sorted = [...rows].sort((a, b) => {
            if (ly != null) {
                return (b.perYear[ly] || 0) - (a.perYear[ly] || 0);
            }
            return (b.total || 0) - (a.total || 0);
        });
        return sorted[0].label;
    }

    get kpiTopEntityTotal(): number | null {
        if (!this.chartTableRows || !this.chartTableRows.length) {
            return null;
        }
        const ly = this.kpiLastYear;
        const rows = this.chartTableRows.filter((r) => !r.isFuture);
        if (!rows.length) {
            return null;
        }
        const sorted = [...rows].sort((a, b) => {
            if (ly != null) {
                return (b.perYear[ly] || 0) - (a.perYear[ly] || 0);
            }
            return (b.total || 0) - (a.total || 0);
        });
        const top = sorted[0];
        if (ly != null) {
            const v = top.perYear[ly];
            return typeof v === "number" ? v : null;
        }
        return top.total ?? null;
    }

    /** תובנות טקסטואליות לתצוגת ה‑table-extra מתחת לטבלה */
    get tableExtraInsights(): string[] {
        const insights: string[] = [];
        const unitPhrase = this.getTableExtraMeasureNounPhrase();
        const fmt = (n: number) => this.formatAggregatedSideTableValue(n);

        const priorYear = this.kpiPriorYear;
        const lastYear = this.kpiLastYear;
        const priorTotal = this.kpiPriorYearTotal;
        const lastTotal = this.kpiLastTotal;
        const pct = this.kpiLastDiffPct;

        if (
            priorYear != null &&
            lastYear != null &&
            priorTotal != null &&
            lastTotal != null &&
            pct != null
        ) {
            const trend =
                pct > 0
                    ? `עלייה של ${Math.round(Math.abs(pct))}%`
                    : pct < 0
                      ? `ירידה של ${Math.round(Math.abs(pct))}%`
                      : "ללא שינוי מול השנה שעברה";
            insights.push(
                `ב־${lastYear} ${unitPhrase} הוא ${fmt(lastTotal)}, לעומת ${fmt(priorTotal)} ב־${priorYear} (${trend}).`,
            );
        } else if (lastYear != null && lastTotal != null) {
            insights.push(
                `ב־${lastYear} ${unitPhrase} הוא ${fmt(lastTotal)}. אין בטווח המוצג שנה נוספת להשוואה שנה-מול-שנה.`,
            );
        }

        const label = this.kpiTopEntityLabel;
        const total = this.kpiTopEntityTotal;
        if (label && total != null) {
            if (label === 'סה"כ') {
                insights.push(
                    `בסיכום לכל השנים והמסננים בתצוגה הנוכחית: ${fmt(total)}.`,
                );
            } else {
                insights.push(
                    `לפי התצוגה הנוכחית, הרשומה המובילה בשנה האחרונה היא \"${label}\" (${fmt(total)}).`,
                );
            }
        }

        return insights;
    }

    showTableExtraKpiStrip(): boolean {
        if (
            this.chartViewMode === "yoy-combined" ||
            this.mainMetricMode === "compare-departments"
        ) {
            return false;
        }
        return !!(this.yearsForChart?.length && this.chartTableRows?.length);
    }

    getTableExtraContextTitle(): string {
        if (this.mainMetricMode === "room-times") {
            switch (this.roomTimesView) {
                case "avgDuration":
                    return "משך צינתור ממוצע";
                case "firstStart":
                    return "כניסה לצינתור ראשון";
                case "lastEnd":
                    return "סיום צינתור אחרון";
                case "perDay":
                    return "צינתורים ליום בחדר";
                case "lossPerDay":
                    return "זמן אבוד ליום";
                case "approvedPerDay":
                    return "זמן מנוצל ליום";
                default:
                    return "זמני חדר";
            }
        }
        if (this.mainMetricMode === "room-utilization") {
            return this.roomUtilizationSubChart === "surgeriesPerDay"
                ? "צינתורים ליום בחדר"
                : "ניצול חדר צינתור";
        }
        switch (this.chartViewMode) {
            case "month":
                return "צינתורים לפי חודש";
            case "department":
                return "צינתורים לפי מחלקה";
            case "site":
                return "צינתורים לפי אתר";
            case "shift":
                return "צינתורים לפי משמרת";
            case "fund":
                return "צינתורים לפי סוג מימון";
            case "year-total":
            default:
                return "נפח צינתורים";
        }
    }

    getTableExtraKpiPrimaryLabel(): string {
        if (this.sideTableValueFormat === "durationHm") {
            return "מדד ממוצע בשנה האחרונה (משך)";
        }
        if (this.sideTableValueFormat === "clock") {
            return "ממוצע בשנה האחרונה (שעה)";
        }
        if (this.isSurgeriesPerDayDecimalTable()) {
            return "סכום ממוצעי צינתורים ליום — השנה האחרונה";
        }
        if (this.isRoomUtilDecimalTable()) {
            return "סכום ערכי הגרף — השנה האחרונה";
        }
        if (this.sideTableValueFormat === "decimal2") {
            return "סכום ערכי הגרף — השנה האחרונה";
        }
        return 'סה"כ בשנה האחרונה';
    }

    getTableExtraKpiPrimaryDisplay(): string {
        const t = this.kpiLastTotal;
        if (t == null) {
            return "—";
        }
        return this.formatAggregatedSideTableValue(t);
    }

    getTableExtraKpiPrimarySub(): string {
        const y = this.kpiLastYear;
        if (y == null) {
            return "";
        }
        if (this.isSurgeriesPerDayDecimalTable()) {
            return `שנת ${y} — סכום ממוצעי כל האגפים (כמו בטבלה ובגרף)`;
        }
        if (this.sideTableValueFormat === "count") {
            return `שנת ${y} — סה"כ צינתורים מסוכמים מכל השורות`;
        }
        if (this.sideTableValueFormat === "decimal2") {
            return `שנת ${y} — סכום כל השורות כפי שמוצג בגרף`;
        }
        return `שנת ${y} — סכום ערכי כל השורות בגרף`;
    }

    getTableExtraKpiChangeLabel(): string {
        const p = this.kpiPriorYear;
        return p != null ? `שינוי מול ${p}` : "שינוי מול שנה קודמת";
    }

    getTableExtraKpiChangeUnitPhrase(): string {
        if (this.sideTableValueFormat === "durationHm") {
            return "דקות (הפרש בממוצע משוקלל) מול";
        }
        if (this.sideTableValueFormat === "clock") {
            return "דקות (הפרש בממוצע) מול";
        }
        if (this.isSurgeriesPerDayDecimalTable()) {
            return "צינתורים ליום (סכום אגפים), לעומת";
        }
        if (this.sideTableValueFormat === "decimal2") {
            return "בערכי הגרף, לעומת";
        }
        return "צינתורים לעומת";
    }

    getTableExtraTopEntityLabel(): string {
        if (this.isSurgeriesPerDayDecimalTable()) {
            return "אגף עם ממוצע צינתורים ליום הגבוה ביותר";
        }
        if (this.isRoomUtilDecimalTable()) {
            return "אגף עם הערך הגבוה ביותר בשנה האחרונה";
        }
        if (this.sideTableValueFormat === "decimal2") {
            return "שורה עם הערך הגבוה ביותר בשנה האחרונה";
        }
        return "קטגוריה עם הנפח הגבוה ביותר";
    }

    getTableExtraTopEntityUnit(): string {
        if (this.sideTableValueFormat === "durationHm") {
            return "דקות (ממוצע משך)";
        }
        if (this.sideTableValueFormat === "clock") {
            return "שעה ממוצעת";
        }
        if (this.isSurgeriesPerDayDecimalTable()) {
            return "ממוצע צינתורים ליום (מעוגל למספר שלם)";
        }
        if (this.sideTableValueFormat === "decimal2") {
            return "אותו מדד כמו בעמודות הגרף (מספר שלם)";
        }
        return "צינתורים";
    }

    formatAggregatedSideTableValue(v: number): string {
        if (v == null || !Number.isFinite(v)) {
            return "—";
        }
        if (this.sideTableValueFormat === "durationHm") {
            return this.formatMinutesToHM(Math.round(v));
        }
        if (this.sideTableValueFormat === "clock") {
            return this.minutesToTime(Math.round(v));
        }
        if (this.sideTableValueFormat === "decimal2") {
            return this.formatNumber(Math.round(v));
        }
        return this.formatNumber(Math.round(v));
    }

    /** טבלת צד במדד «צינתורים ליום בחדר» (מספרים עשרוניים במקור — מוצגים כשלמים) */
    private isSurgeriesPerDayDecimalTable(): boolean {
        return (
            this.sideTableValueFormat === "decimal2" &&
            ((this.mainMetricMode === "room-utilization" &&
                this.roomUtilizationSubChart === "surgeriesPerDay") ||
                (this.mainMetricMode === "room-times" &&
                    this.roomTimesView === "perDay"))
        );
    }

    /** טבלת צד במדדי ניצול חדר (לא צינתורים ליום) */
    private isRoomUtilDecimalTable(): boolean {
        return (
            this.sideTableValueFormat === "decimal2" &&
            this.mainMetricMode === "room-utilization" &&
            this.roomUtilizationSubChart !== "surgeriesPerDay"
        );
    }

    private getTableExtraMeasureNounPhrase(): string {
        if (
            this.mainMetricMode === "room-times" &&
            this.roomTimesView === "lossPerDay"
        ) {
            return "זמן אבוד ממוצע (דקות)";
        }
        if (
            this.mainMetricMode === "room-times" &&
            this.roomTimesView === "approvedPerDay"
        ) {
            return "זמן מנוצל ממוצע (דקות)";
        }
        if (this.sideTableValueFormat === "durationHm") {
            return "משך צינתור ממוצע משוקלל";
        }
        if (this.sideTableValueFormat === "clock") {
            return "זמן ממוצע (דקות מחצות)";
        }
        if (this.isSurgeriesPerDayDecimalTable()) {
            return "סכום ממוצעי צינתורים ליום בחדר (כל האגפים בגרף)";
        }
        if (this.isRoomUtilDecimalTable()) {
            return "סכום ערכי ניצול החדר בגרף";
        }
        if (this.sideTableValueFormat === "decimal2") {
            return "סכום ערכי הגרף";
        }
        return "מספר הצינתורים המצטבר";
    }

    /** סכימת ערכי השורות בטבלת הצד לכל שנה — מזין את yearlySurgeryTotals לכרטיסי KPI */
    private syncYearlyTotalsFromChartTableRows(): void {
        this.yearlySurgeryTotals = {};
        if (!this.yearsForChart?.length || !this.chartTableRows?.length) {
            return;
        }
        for (const y of this.yearsForChart) {
            this.yearlySurgeryTotals[y] = this.chartTableRows.reduce(
                (sum, r) => sum + (r.perYear[y] || 0),
                0,
            );
        }
    }

    /**
     * מחלץ Wing × שנים מגרף עמודות (עמודת קטגוריה + זוגות ערך/אנוטציה, ואופציונלית עמודת tooltip אחרי כל זוג).
     * לפני התיקון היה מניח רק [מספר, אנוטציה] ברצף; אחרי patchGoogleChartHtmlTooltips נשבר אחרי שנה אחת.
     */
    private parseWingMultiYearGridFromChart(
        columns: any[],
        data: any[][],
    ): {
        years: number[];
        rows: {
            label: string;
            total: number;
            perYear: { [year: number]: number };
            diff?: number;
            pct?: string;
        }[];
    } | null {
        if (!columns?.length || !data?.length || columns.length < 2) {
            return null;
        }
        const yearCols: { year: number; colIndex: number }[] = [];
        for (let i = 1; i < columns.length; i++) {
            const c = columns[i] as any;
            if (!c || typeof c !== "object" || c.type !== "number" || c.role) {
                continue;
            }
            const y = parseInt(String(c.label ?? ""), 10);
            if (!Number.isFinite(y) || y < 1900 || y > 2100) {
                continue;
            }
            yearCols.push({ year: y, colIndex: i });
        }
        if (!yearCols.length) {
            return null;
        }
        const years = yearCols.map((x) => x.year);
        const rows = data.map((row) => {
            const label = String(row[0] ?? "");
            const perYear: { [year: number]: number } = {};
            let total = 0;
            for (const { year, colIndex } of yearCols) {
                const cell = row[colIndex];
                const mag = this.tooltipNumericMagnitude(cell);
                const num = mag != null && Number.isFinite(mag) ? mag : 0;
                perYear[year] = num;
                total += num;
            }
            const { diff, pct } = this.computeDiffAndPct(perYear, years);
            return { label, total, perYear, diff, pct };
        });
        return { years, rows };
    }

    private applySideTableFromWingYearChart(
        columns: any[],
        data: any[][],
        valueFormat: "count" | "decimal2" | "durationHm" | "clock",
    ): void {
        const parsed = this.parseWingMultiYearGridFromChart(columns, data);
        if (!parsed) {
            this.chartTableRows = [];
            this.yearsForChart = [];
            this.yearlySurgeryTotals = {};
            return;
        }
        this.yearsForChart = parsed.years;
        this.chartTableRows = parsed.rows;
        this.sideTableValueFormat = valueFormat;
        this.syncYearlyTotalsFromChartTableRows();
    }

    private refreshRoomTimesSideTableFromCurrentView(): void {
        if (this.mainMetricMode !== "room-times") {
            return;
        }
        switch (this.roomTimesView) {
            case "avgDuration":
                this.applySideTableFromWingYearChart(
                    this.avgDurationChartColumns,
                    this.avgDurationChartData,
                    "durationHm",
                );
                break;
            case "perDay":
                this.applySideTableFromWingYearChart(
                    this.surgeriesPerDayChartColumns,
                    this.surgeriesPerDayChartData,
                    "decimal2",
                );
                break;
            case "firstStart":
                this.applySideTableFromWingYearChart(
                    this.firstStartTimeChartColumns,
                    this.firstStartTimeChartData,
                    "clock",
                );
                break;
            case "lastEnd":
                this.applySideTableFromWingYearChart(
                    this.lastEndTimeChartColumns,
                    this.lastEndTimeChartData,
                    "clock",
                );
                break;
            case "lossPerDay":
                this.applySideTableFromWingYearChart(
                    this.lossByWingChartColumns,
                    this.lossByWingChartData,
                    "durationHm",
                );
                break;
            case "approvedPerDay":
                this.applySideTableFromWingYearChart(
                    this.approvedUtilizationChartColumns,
                    this.approvedUtilizationChartData,
                    "durationHm",
                );
                break;
            default:
                break;
        }
    }

    yearsForChart: number[] = [];
    yearlySurgeryTotals: { [year: number]: number } = {};
    yearColorMap: { year: number; color: string }[] = [];
    stackedCategoryLegend: { label: string; color: string }[] = [];

    /** מדד מוצג לגרף חדרים לפי מחלקה: total / open / close / fullDays */
    roomStatsMetric: "total" | "open" | "close" | "fullDays" = "total";

    /** מצב תצוגה לגרף חדרים: לפי מחלקה (ברירת מחדל) או סה"כ חדרים לשנה */
    roomStatsViewMode: "byWing" | "yearTotal" = "byWing";

    /**
     * במצב ניצולת חדר: גרף מדדי חדרים (פתוחות/סוגרות וכו') לעומת גרף «צינתורים ליום» (עמודות לפי Wing – אותו נתון כמו בזמני חדר).
     */
    roomUtilizationSubChart: "roomStats" | "surgeriesPerDay" = "roomStats";

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
    // 'month'       – צינתורים לפי חודשים (5 שנים אחרונות)
    chartViewMode:
        | "year-total"
        | "fund"
        | "site"
        | "shift"
        | "department"
        | "month"
        | "yoy-combined" = "year-total";

    /** מצב מדד ראשי: צינתורים (כמות), זמני חדר, ניצולת חדר, או תצוגת הכנסות (placeholder) */
    mainMetricMode:
        | "surgery-volume"
        | "room-times"
        | "room-utilization"
        | "revenue"
        | "cancellations"
        | "compare-departments" = "surgery-volume";

    /** פס מדדים עליון — קובע מה מוצג באזור התוכן הראשי */
    topQuickMainSlot: PciTopQuickMainSlot = "performed";

    get topQuickMainSlotToggleValue(): PciTopQuickMainSlot {
        return this.topQuickMainSlot;
    }

    /** פס מעבר בין אזורי תוכן ראשיים — גישה מוגבלת (בטא) */
    get showTopQuickMainSlotSwitcher(): boolean {
        const u = (this.employeeUserName || "").trim().toLowerCase();
            // return TOP_QUICK_MAIN_SLOT_SWITCHER_USERS.has(u);
            return true;
    }

    // When true, the משמרת filter dropdown in the sidebar is visually disabled
    // because the main chart itself is grouped by משמרת.
    isShiftGroupedView: boolean = false;

    // Boss Dashboard
    showBossDashboard = false;

    /** שורת צינתור נבחרת למודל פרטים (מעקב צינתורים) */
    selectedSurgery: PciRow | null = null;

    // Table data – עמודות טבלת צינתורים
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
    dataSource = new MatTableDataSource<PciRow | DepartmentComparisonDto>(
        [],
    );

    // Detailed table data with MatSort
    detailedDataSource = new MatTableDataSource<DepartmentDetailedDataDto>([]);
    detailedSort!: MatSort;

    onTopQuickMainSlotChange(value: PciTopQuickMainSlot | string): void {
        const v = value as PciTopQuickMainSlot;
        if (
            v !== "wait" &&
            v !== "performed" &&
            v !== "revenue" &&
            v !== "cancellations"
        ) {
            return;
        }
        if (!this.showTopQuickMainSlotSwitcher && v !== "performed") {
            return;
        }
        this.topQuickMainSlot = v;
    }

    // UI State
    isDataLoaded = false;
    /** האם גרף הראשי מוכן להצגה (אחרי שכל הנתונים והצבעים חושבו) */
    isChartViewReady = false;

    selectedDepartment: DepartmentComparisonDto | null = null;
    /** ברירת מחדל: ללא סינון אתר (תואם `buildKpiFilterParams` — `site` ריק) */
    selectedDiagnosis: string = "כל האתרים";
    isDepartmentGraphOpen = false;
    departmentGraphTitle = "";
    // Fake loading percents (מדומים) שמוצגים ליד/בתוך `<mat-spinner>`
    globalLoadingPercent = 0;
    mainChartLoadingPercent = 0;
    diagnosesLoadingPercent = 0;
    catalogLoadingPercent = 0;

    avgDurationLoadingPercent = 0;
    surgeriesPerDayLoadingPercent = 0;
    firstStartTimeLoadingPercent = 0;
    lastEndTimeLoadingPercent = 0;
    lossByWingLoadingPercent = 0;
    approvedUtilizationLoadingPercent = 0;

    compareAvgDurationYearlyLoadingPercent = 0;
    compareDepRoomLoadingPercent = 0;

    private fakeProgressIntervals: Record<string, any> = {};
    private fakeProgressTokens: Record<string, number> = {};
    /** משך דימוי אחוזי הטעינה עד 100% — תחושת התקדמות למשתמש */
    private readonly fakeLoaderProgressDurationMs = 7000;

    private _isLoading = false;
    get isLoading(): boolean {
        return this._isLoading;
    }
    set isLoading(v: boolean) {
        if (this._isLoading === v) return;
        this._isLoading = v;
        if (v) this.startFakeProgress("global");
        else this.stopFakeProgress("global");
    }

    private _catalogLoading = false;
    get catalogLoading(): boolean {
        return this._catalogLoading;
    }
    set catalogLoading(v: boolean) {
        if (this._catalogLoading === v) return;
        this._catalogLoading = v;
        if (v) this.startFakeProgress("catalog");
        else this.stopFakeProgress("catalog");
    }

    isMainDataLoading = false; // Loading for main data table

    private _isDiagnosesLoading = false;
    get isDiagnosesLoading(): boolean {
        return this._isDiagnosesLoading;
    }
    set isDiagnosesLoading(v: boolean) {
        if (this._isDiagnosesLoading === v) return;
        this._isDiagnosesLoading = v;
        if (v) this.startFakeProgress("diagnoses");
        else this.stopFakeProgress("diagnoses");
    }

    private _isChartLoading = false;
    get isChartLoading(): boolean {
        return this._isChartLoading;
    }
    set isChartLoading(v: boolean) {
        if (this._isChartLoading === v) return;
        this._isChartLoading = v;
        if (v) this.startFakeProgress("mainChart");
        else this.stopFakeProgress("mainChart");
    }

    private anyLoadingPrev = false;

    /** באנר בטא צף — מוצג מחדש בכל טעינת רכיב / כניסה מחדש לדשבורד (ניווט SPA); X מסתיר עד יציאה וחזרה */
    showFloatingBetaBanner = true;

    private betaBannerNavSub?: Subscription;

    dismissFloatingBetaBanner(): void {
        this.showFloatingBetaBanner = false;
        this.cdr.detectChanges();
    }

    /**
     * Returns the correct percent for the main chart overlay spinner.
     * (בחר מהטעינות שרלוונטיות לתנאי ה-`*ngIf` ב-HTML)
     */
    getMainChartLoadingPercent(): number {
        // room-utilization: surgeries per day uses the dedicated loader percent
        if (
            this.isSurgeriesPerDayLoading &&
            this.mainMetricMode === "room-utilization" &&
            this.roomUtilizationSubChart === "surgeriesPerDay"
        ) {
            return this.surgeriesPerDayLoadingPercent;
        }
        if (this.isChartLoading) return this.mainChartLoadingPercent;
        if (this.isLoading || this.isMainDataLoading)
            return this.globalLoadingPercent;
        return this.mainChartLoadingPercent;
    }

    /** טעינת אזור הגרף הראשי (Google / מדד משולב) */
    get isMainPanelChartAreaLoading(): boolean {
        return (
            this.isChartLoading ||
            this.isMainDataLoading ||
            (this.isRoomUtilizationMode() &&
                this.roomUtilizationSubChart === "surgeriesPerDay" &&
                this.isSurgeriesPerDayLoading)
        );
    }

    /** Returns the correct percent for the room-times overlay spinner */
    getRoomTimesLoadingPercent(): number {
        const candidates: number[] = [];
        if (this.isAvgDurationLoading)
            candidates.push(this.avgDurationLoadingPercent);
        if (this.isSurgeriesPerDayLoading)
            candidates.push(this.surgeriesPerDayLoadingPercent);
        if (this.isFirstStartTimeLoading)
            candidates.push(this.firstStartTimeLoadingPercent);
        if (this.isLastEndTimeLoading)
            candidates.push(this.lastEndTimeLoadingPercent);
        if (this.isLossByWingLoading)
            candidates.push(this.lossByWingLoadingPercent);
        if (this.isApprovedUtilizationLoading)
            candidates.push(this.approvedUtilizationLoadingPercent);
        return candidates.length ? Math.max(...candidates) : 0;
    }

    /** Returns the correct percent for the compare departments spinner */
    getCompareDepartmentsModalLoadingPercent(): number {
        const candidates: number[] = [];
        if (this.isSurgeriesPerDayLoading)
            candidates.push(this.surgeriesPerDayLoadingPercent);
        if (this.isCompareAvgDurationYearlyLoading)
            candidates.push(this.compareAvgDurationYearlyLoadingPercent);
        if (this.isCompareDepRoomLoading)
            candidates.push(this.compareDepRoomLoadingPercent);
        return candidates.length ? Math.max(...candidates) : 0;
    }

    private setLoadingPercentByKey(key: string, value: number): void {
        switch (key) {
            case "global":
                this.globalLoadingPercent = value;
                break;
            case "mainChart":
                this.mainChartLoadingPercent = value;
                break;
            case "diagnoses":
                this.diagnosesLoadingPercent = value;
                break;
            case "catalog":
                this.catalogLoadingPercent = value;
                break;

            case "avgDuration":
                this.avgDurationLoadingPercent = value;
                break;
            case "surgeriesPerDay":
                this.surgeriesPerDayLoadingPercent = value;
                break;
            case "firstStartTime":
                this.firstStartTimeLoadingPercent = value;
                break;
            case "lastEndTime":
                this.lastEndTimeLoadingPercent = value;
                break;
            case "lossByWing":
                this.lossByWingLoadingPercent = value;
                break;
            case "approvedUtilization":
                this.approvedUtilizationLoadingPercent = value;
                break;

            case "compareAvgDurationYearly":
                this.compareAvgDurationYearlyLoadingPercent = value;
                break;
            case "compareDepRoom":
                this.compareDepRoomLoadingPercent = value;
                break;
        }
    }

    private startFakeProgress(key: string): void {
        // Restart timer from 0 on each new start.
        this.stopFakeProgress(key);
        const token = (this.fakeProgressTokens[key] ?? 0) + 1;
        this.fakeProgressTokens[key] = token;
        const startMs = Date.now();
        this.setLoadingPercentByKey(key, 0);

        const tick = (): void => {
            if (this.fakeProgressTokens[key] !== token) return;
            const elapsed = Date.now() - startMs;
            const t = Math.min(1, elapsed / this.fakeLoaderProgressDurationMs);
            // ease-out quadratic: התקדמות ברורה בהתחלה, האטה טבעית לקראת 100%
            const eased = 1 - (1 - t) * (1 - t);
            const pct = Math.min(100, Math.floor(eased * 100));
            this.setLoadingPercentByKey(key, pct);
            this.cdr.detectChanges();
            if (t >= 1) {
                const running = this.fakeProgressIntervals[key];
                if (running) {
                    clearInterval(running);
                    delete this.fakeProgressIntervals[key];
                }
            }
        };

        tick();
        const interval = setInterval(tick, 100);
        this.fakeProgressIntervals[key] = interval;
    }

    private stopFakeProgress(key: string): void {
        const interval = this.fakeProgressIntervals[key];
        if (interval) {
            clearInterval(interval);
            delete this.fakeProgressIntervals[key];
        }
        this.setLoadingPercentByKey(key, 100);
        this.cdr.detectChanges();
    }
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

    /** אתרים לצינתורים */
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
    private avgDurationFiveYearsRawByBaseYear = new Map<
        string,
        AvgDurationFiveYearsDto[]
    >();
    /** ממוצע משך צינתור שנתי (SQL) — רק למודאל השוואת מחלקות; טעינה חד-פעמית לכל baseYear */
    private compareAvgDurationYearlyRawByBaseYear = new Map<
        string,
        AvgDurationYearlyDto[]
    >();
    private compareAvgDurationYearlyFetchInFlight = false;
    /** GetDepRoomFiveYears — רק לסדרת «צינתורים לחדר» במודאל השוואה */
    private compareDepRoomRawByBaseYear = new Map<
        string,
        RoomsStatsDepRoomDto[]
    >();
    private compareDepRoomFetchInFlight = false;
    private lossByWingYearRawByBaseYear = new Map<
        string,
        LossByWingYearDto[]
    >();
    private approvedUtilizationRawByBaseYear = new Map<
        string,
        ApprovedUtilizationDto[]
    >();

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
    showTopDepartmentsSidebar: boolean = true;

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

    // Modals for group‑2 KPIs (זמני צינתור לפי מחלקה)
    /** מודל אחד מאוחד של "זמני חדר צינתור" עם מבטים שונים לפי כפתור */
    showRoomTimesModal = false;
    roomTimesView:
        | "avgDuration"
        | "firstStart"
        | "lastEnd"
        | "perDay"
        | "lossPerDay"
        | "approvedPerDay" = "avgDuration";
    // שמירה על flags ישנים לטובת הקוד הקיים (פתיחה/סגירה לפי מודלים נפרדים)
    showAvgDurationModal = false;
    showTimesModal = false;
    /** מיזוג אופציות למודאל זמני חדר — מטמון לפי אובייקט options (מניעת אובייקט חדש בכל CD) */
    private roomTimesModalChartOptionsMemo = new WeakMap<object, any>();
    showFirstStartTimeModal = false;
    showLastEndTimeModal = false;
    showSurgeriesPerDayModal = false;
    // 2.3 זמן סיום צינתור אחרון לפי מחלקה
    /** כשפעיל: מציג ממוצע ללא ימי גלישה (נטרל ימים עם גלישה מהממוצע) */
    lastEndTimeExcludeOverflowDays = false;
    /** נתונים גולמיים אחרי סינון קרדיולוגיה ואגף – מאפשר החלפת תצוגה (כל הימים / רק ימים עם גלישה) בלי קריאת API */
    private lastEndTimeRows: AvgLastEndRow[] = [];

    // Full‑screen view for YoY combined metric chart
    showYoyCombinedFullModal = false;
    showCompareDepartmentsModal = false;

    // Comparison modal (department focus)
    compareDepartmentSelected: string | null = null;
    /** סוגי צינתור לבחירה מרובה (מדדי סוג מסומנים בגרף ההשוואה) */
    compareSurgeryTypesSelected: string[] = [];
    /** צ'קבוקסים – כל דגל מוסיף קו נוסף לגרף ההשוואה (ברירת מחדל: ללא קווים – המשתמש בוחר מדד אחר מדד) */
    compareShowRoomsPerYear = false;
    compareShowSurgeriesPerYear = false;
    compareShowAvgDurationPerYear = false;
    compareShowSurgeriesPerRoom = false;
    compareShowTypeCountPerYear = false;
    compareShowTypeAvgDurationPerYear = false;
    /** מחלקה נבחרה ויש שנים בנתונים, אך עדיין לא סומן אף מדד לגרף */
    compareDepartmentsAwaitingMetricSelection = false;
    isCompareMetricsDropdownOpen = false;
    isCompareSurgeryTypesDropdownOpen = false;
    compareDepartmentsLineChartColumns: any[] = [];
    compareDepartmentsLineChartData: any[] = [];
    compareDepartmentsLineChartOptions: any = {};
    /** מקרא צבעים מתחת לגרף השוואת מחלקות (תואם ל-options.colors) */
    compareDepartmentsColorLegend: {
        label: string;
        color: string;
        axisHint: string;
    }[] = [];
    /** טקסט מסכמים לפי שני השנים האחרונות בגרף השוואת מחלקות */
    compareDepartmentsGraphInsightBlock: {
        mode: "twoYears" | "singleYear";
        yearPrev: number | null;
        yearLatest: number;
        rows: CompareDeptInsightTableRow[];
    } | null = null;

    readonly compareMetricOptions: {
        key: string;
        label: string;
        tooltip?: string;
    }[] = [
        /** מוצג: ימי פתיחת חדר (מדד פתיחות) למחלקה — נתוני API מסוננים למשמרת בוקר ולאמצע שבוע בלבד */
        {
            key: "rooms",
            label: "חדרים — בוקר, אמצע שבוע; ימי פתיחה למחלקה (לא סה״כ חדרים)",
        },
        /** מוצג: סה״כ צינתורים למחלקה מ־GetCountByDept — סיכום כל שורות הספירה: כל ימי השבוע וכל המשמרות */
        {
            key: "surgeries",
            label: "צינתורים למחלקה — כל ימי השבוע וכל המשמרות (סה״כ שבוצעו)",
        },
        {
            key: "avgDuration",
            label: "זמן צינתור ממוצע (דקות) — כל המשמרות והימים",
        },
        {
            key: "surgeriesPerRoom",
            label: "צינתורים ליום חדר — ללא פיצול (YTD)",
            tooltip:
                "\u200Fמדד מ־GetDepRoomFiveYears: צינתורים ליום חדר רק בימים ללא פיצול — יום שבו מסומן פיצול מוחרג מהמונה ומהמכנה.\n\n" +
                "\u200Fממוצע צינתורים ליום פתיחת חדר בימים «מלאים» ללא פיצול, עד חודש נוכחי בשנה (YTD).\n\n" +
                "\u200Fאגרגציה על כמה אתרים: יחס סכום צינתורים לסכום ימי פתיחה (ללא פיצול), או ממוצע משוקלל לפי השדות מהשרת.",
        },
        { key: "typeCount", label: "כמות צינתורים מסוג נבחר " },
        {
            key: "typeAvgDuration",
            label: "זמן צינתור ממוצע לסוג נבחר",
            tooltip:
                "\u200Fחישוב זמן צינתור ממוצע לפי סוג הצינתור שנבחר:\n\n" +
                "\u200Fדחוף או אלקטיבי — נכללים רק צינתורים במשמרת בוקר, באמצע שבוע, וללא צינתורים גולשים.\n\n" +
                "\u200Fססיה — נכללים כל הצינתורים של הסוג (כל המשמרות והימים) לחישוב הממוצע.",
        },
    ];

    /**
     * צבעי סדרות בגרף «השוואת מחלקות» — אותו סדר כמו ב־addSeries ב־refreshCompareDepartmentsLineChart,
     * ותואם לרקע עדין ברשימת המדדים (compare-metrics-item).
     */
    private static readonly COMPARE_DEPT_SERIES_BASE = {
        rooms: "#5B8DEF",
        surgeries: "#34B87A",
        avgDuration: "#E07C6C",
        surgeriesPerRoom: "#E8A849",
        /** מדדי סוג — צבע מייצג בשורת הצ'קבוקס; בגרף נעשה שימוש במחזור לפי סדר סוגי הצינתור */
        typeCount: "#9B7ED9",
        typeAvgDuration: "#4A90C9",
    } as const;

    private static readonly COMPARE_DEPT_TYPE_COUNT_CYCLE = [
        "#9B7ED9",
        "#2BB0C4",
        "#C97AB8",
        "#7A9E2E",
        "#D9A441",
        "#6B7FD7",
        "#E07C6C",
    ];

    private static readonly COMPARE_DEPT_TYPE_AVG_CYCLE = [
        "#4A90C9",
        "#B86B9A",
        "#2A9D8F",
        "#E76F51",
        "#8B7EC8",
        "#C9A227",
        "#457B9D",
    ];

    private _isAvgDurationLoading = false;
    get isAvgDurationLoading(): boolean {
        return this._isAvgDurationLoading;
    }
    set isAvgDurationLoading(v: boolean) {
        if (this._isAvgDurationLoading === v) return;
        this._isAvgDurationLoading = v;
        if (v) this.startFakeProgress("avgDuration");
        else this.stopFakeProgress("avgDuration");
    }

    /** טעינת GetAvgDurationYearlyFiveYears עבור סדרת ממוצע משך במודאל השוואת מחלקות */
    private _isCompareAvgDurationYearlyLoading = false;
    get isCompareAvgDurationYearlyLoading(): boolean {
        return this._isCompareAvgDurationYearlyLoading;
    }
    set isCompareAvgDurationYearlyLoading(v: boolean) {
        if (this._isCompareAvgDurationYearlyLoading === v) return;
        this._isCompareAvgDurationYearlyLoading = v;
        if (v) this.startFakeProgress("compareAvgDurationYearly");
        else this.stopFakeProgress("compareAvgDurationYearly");
    }

    private _isCompareDepRoomLoading = false;
    get isCompareDepRoomLoading(): boolean {
        return this._isCompareDepRoomLoading;
    }
    set isCompareDepRoomLoading(v: boolean) {
        if (this._isCompareDepRoomLoading === v) return;
        this._isCompareDepRoomLoading = v;
        if (v) this.startFakeProgress("compareDepRoom");
        else this.stopFakeProgress("compareDepRoom");
    }

    private _isFirstStartTimeLoading = false;
    get isFirstStartTimeLoading(): boolean {
        return this._isFirstStartTimeLoading;
    }
    set isFirstStartTimeLoading(v: boolean) {
        if (this._isFirstStartTimeLoading === v) return;
        this._isFirstStartTimeLoading = v;
        if (v) this.startFakeProgress("firstStartTime");
        else this.stopFakeProgress("firstStartTime");
    }

    private _isLastEndTimeLoading = false;
    get isLastEndTimeLoading(): boolean {
        return this._isLastEndTimeLoading;
    }
    set isLastEndTimeLoading(v: boolean) {
        if (this._isLastEndTimeLoading === v) return;
        this._isLastEndTimeLoading = v;
        if (v) this.startFakeProgress("lastEndTime");
        else this.stopFakeProgress("lastEndTime");
    }

    private _isSurgeriesPerDayLoading = false;
    get isSurgeriesPerDayLoading(): boolean {
        return this._isSurgeriesPerDayLoading;
    }
    set isSurgeriesPerDayLoading(v: boolean) {
        if (this._isSurgeriesPerDayLoading === v) return;
        this._isSurgeriesPerDayLoading = v;
        if (v) this.startFakeProgress("surgeriesPerDay");
        else this.stopFakeProgress("surgeriesPerDay");
    }

    private _isApprovedUtilizationLoading = false;
    get isApprovedUtilizationLoading(): boolean {
        return this._isApprovedUtilizationLoading;
    }
    set isApprovedUtilizationLoading(v: boolean) {
        if (this._isApprovedUtilizationLoading === v) return;
        this._isApprovedUtilizationLoading = v;
        if (v) this.startFakeProgress("approvedUtilization");
        else this.stopFakeProgress("approvedUtilization");
    }

    avgDurationData: DeptTimeMetricRow[] = [];
    firstStartTimeData: DeptTimeMetricRow[] = [];
    lastEndTimeData: DeptTimeMetricRow[] = [];
    surgeriesPerDayData: DeptTimeMetricRow[] = [];
    /** סינון לפי אתר עבור גרף משך צינתור ממוצע – ALL = כל האתרים */
    avgDurationSiteFilter: AvgDurationSiteFilter = "ALL";
    /**
     * סינון אתר/חדר לגרף «זמן מנוצל ליום» (GetApprovedUtilization).
     * ברירת מחדל: חדר צינתור כללי בלבד.
     */
    approvedUtilizationSiteFilter: AvgDurationSiteFilter = "חנ-כללי";
    /** אפשרויות ל־mat-select — ערכי Site כפי שמוחזרים מה־API */
    readonly approvedUtilizationSiteSelectOptions: {
        value: AvgDurationSiteFilter;
        label: string;
    }[] = [
        { value: "חנ-כללי", label: "חדר צינתור כללי" },
        { value: "חנ-אמבול", label: "אמבולטורי" },
        { value: "חנ-יולד", label: "יולדות" },
        { value: "חנ-מחלקה", label: "חדר מחלקה" },
        { value: "חנ-פהלסת", label: "פה ולסת" },
        { value: "ALL", label: "כל חדרי הצינתור" },
    ];
    avgDurationChartColumns: any[] = [];
    avgDurationChartData: any[] = [];
    avgDurationChartOptions: any = {};
    surgeriesPerDayChartColumns: any[] = [];
    surgeriesPerDayChartData: any[] = [];
    surgeriesPerDayChartOptions: any = {};
    lastEndTimeChartOptions: any = {};
    /** צבעים למקרא שנים (תואם לסדר העמודות ב-Google ColumnChart) */
    readonly kpiChartYearColors: string[] = [
        "#3366cc",
        "#dc3912",
        "#ff9900",
        "#109618",
        "#990099",
    ];
    firstStartTimeChartYears: number[] = [];
    lastEndTimeChartYears: number[] = [];
    avgDurationChartYears: number[] = [];
    surgeriesPerDayChartYears: number[] = [];

    // ================= Comparison mode (Avg Duration) =================
    avgDurationCompareEnabled = false;
    avgDurationCompareDimension: "SurgeryType" | "Shift" | "Site" =
        "SurgeryType";
    /** צד ימין (מקור) – יכול להיות 'הכל' או ערך ספציפי */
    avgDurationCompareRightValue: string | null = "הכל";
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
        which: "wing" | "dimension" | "right" | "left",
    ): void {
        const next =
            (which === "wing" && !this.isAvgDurationCompareWingOpen) ||
            (which === "dimension" &&
                !this.isAvgDurationCompareDimensionOpen) ||
            (which === "right" && !this.isAvgDurationCompareRightOpen) ||
            (which === "left" && !this.isAvgDurationCompareLeftOpen);

        this.closeAvgDurationCompareDropdowns();
        if (!next) return;

        if (which === "wing") this.isAvgDurationCompareWingOpen = true;
        if (which === "dimension")
            this.isAvgDurationCompareDimensionOpen = true;
        if (which === "right") this.isAvgDurationCompareRightOpen = true;
        if (which === "left") this.isAvgDurationCompareLeftOpen = true;
    }

    getAvgDurationCompareDimensionLabel(): string {
        if (this.avgDurationCompareDimension === "Shift") return "משמרת";
        if (this.avgDurationCompareDimension === "Site") return "אתר";
        return "סוג צינתור";
    }

    setAvgDurationCompareWing(v: string | null): void {
        this.avgDurationCompareWing = v;
        this.avgDurationCompareEnabled = true;
        this.closeAvgDurationCompareDropdowns();
        this.onAvgDurationCompareSettingsChanged();
    }

    setAvgDurationCompareDimension(v: "SurgeryType" | "Shift" | "Site"): void {
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
        const baseYear = this.getBaseYearForRoomTimes?.() ?? "";
        const raw = baseYear
            ? this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []
            : [];
        const filtered = raw
            .filter((r) => this.matchesRoomTimesFilters?.(r as any) ?? true)
            .filter(
                (r) =>
                    !this.avgDurationSiteFilter ||
                    this.avgDurationSiteFilter === "ALL" ||
                    r.Site === this.avgDurationSiteFilter,
            );

        const wings = Array.from(
            new Set(filtered.map((r) => (r.Wing || "").trim()).filter(Boolean)),
        );
        const list = wings.length ? wings : this.orderedWings || [];
        return Array.from(
            new Set(list.map((x: string) => (x || "").trim()).filter(Boolean)),
        );
    }

    getAvgDurationCompareValueOptions(): string[] {
        const baseYear = this.getBaseYearForRoomTimes?.() ?? "";
        const raw = baseYear
            ? this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []
            : [];
        const field = this.avgDurationCompareDimension;
        const filtered = raw
            .filter((r) => this.matchesRoomTimesFilters?.(r as any) ?? true)
            // If comparison is "by site", do NOT pre-filter by the global site filter,
            // otherwise you can't compare between sites.
            .filter(
                (r) =>
                    field === "Site" ||
                    !this.avgDurationSiteFilter ||
                    this.avgDurationSiteFilter === "ALL" ||
                    r.Site === this.avgDurationSiteFilter,
            )
            .filter(
                (r) =>
                    !this.avgDurationCompareWing ||
                    (r.Wing || "").trim() ===
                        (this.avgDurationCompareWing || "").trim(),
            );

        const values = filtered
            .map((r) => {
                if (field === "Site") return (r.Site || "").trim();
                if (field === "Shift") return (r.Shift || "").trim();
                return (r.SurgeryType || "").trim();
            })
            .filter((v) => v.length > 0);

        const uniq = Array.from(new Set(values)).sort((a, b) =>
            a.localeCompare(b, "he"),
        );
        return ["הכל", ...uniq];
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

        const baseYear = this.getBaseYearForRoomTimes?.() ?? "";
        const raw = baseYear
            ? this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || []
            : [];

        const field = this.avgDurationCompareDimension;
        const byWing = raw
            .filter((r) => this.matchesRoomTimesFilters?.(r as any) ?? true)
            .filter(
                (r) =>
                    field === "Site" ||
                    !this.avgDurationSiteFilter ||
                    this.avgDurationSiteFilter === "ALL" ||
                    r.Site === this.avgDurationSiteFilter,
            )
            .filter(
                (r) =>
                    (r.Wing || "").trim() ===
                    (this.avgDurationCompareWing || "").trim(),
            );
        const matchValue = (
            r: AvgDurationFiveYearsDto,
            v: string | null,
        ): boolean => {
            const vv = (v || "").trim();
            if (!vv || vv === "הכל") return true;
            if (field === "Site") return (r.Site || "").trim() === vv;
            if (field === "Shift") return (r.Shift || "").trim() === vv;
            return (r.SurgeryType || "").trim() === vv;
        };

        const rightRows = byWing.filter((r) =>
            matchValue(r, this.avgDurationCompareRightValue),
        );
        const leftRows = byWing.filter((r) =>
            matchValue(r, this.avgDurationCompareLeftValue),
        );

        const dedupeCtx = this.getAvgDurationCompareDedupeCtx();
        const rightModel = this.buildAvgDurationFiveYearsChartModel(
            rightRows,
            dedupeCtx,
        );
        const leftModel = this.buildAvgDurationFiveYearsChartModel(
            leftRows,
            dedupeCtx,
        );

        this.avgDurationCompareRightChartColumns = rightModel.columns;
        this.avgDurationCompareRightChartData = rightModel.data;
        this.avgDurationCompareLeftChartColumns = leftModel.columns;
        this.avgDurationCompareLeftChartData = leftModel.data;

        // ===== Combined LINE chart (Year x Right/Left) =====
        const toWeightedAvgByYear = (
            rows: AvgDurationFiveYearsDto[],
        ): Map<number, number> => {
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
                out.set(y, v.sumCount ? v.sumMin / v.sumCount : 0);
            }
            return out;
        };

        const yearSiteKey = (r: AvgDurationFiveYearsDto) =>
            `${r.Year}|${(r.Site || "").trim()}`;
        const rightDeduped = this.filterAvgDurationRowsNoApiDoubleCount(
            rightRows,
            yearSiteKey,
            (r) => this.isAvgDurationCoarseRow(r, dedupeCtx),
        );
        const leftDeduped = this.filterAvgDurationRowsNoApiDoubleCount(
            leftRows,
            yearSiteKey,
            (r) => this.isAvgDurationCoarseRow(r, dedupeCtx),
        );

        const allYears = Array.from(
            new Set<number>([
                ...rightDeduped
                    .map((r) => r.Year)
                    .filter((y): y is number => y != null),
                ...leftDeduped
                    .map((r) => r.Year)
                    .filter((y): y is number => y != null),
            ]),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.avgDurationCompareYears = years;

        const rightByYear = toWeightedAvgByYear(rightDeduped);
        const leftByYear = toWeightedAvgByYear(leftDeduped);

        const rightLabel = `: ${(this.avgDurationCompareRightValue || "הכל").trim() || "הכל"}`;
        const leftLabel = `: ${(this.avgDurationCompareLeftValue || "הכל").trim() || "הכל"}`;

        this.avgDurationCompareCombinedChartColumns = [
            { type: "string", label: "שנה" },
            { type: "number", label: rightLabel },
            { type: "string", role: "annotation" },
            { type: "number", label: leftLabel },
            { type: "string", role: "annotation" },
        ];

        this.avgDurationCompareCombinedChartData = years.map((y) => {
            const rv = rightByYear.get(y);
            const lv = leftByYear.get(y);
            const rLabel =
                rv != null && rv > 0 ? this.formatMinutesToHM(rv) : "";
            const lLabel =
                lv != null && lv > 0 ? this.formatMinutesToHM(lv) : "";
            return [
                y.toString(),
                rv != null && rv > 0 ? { v: rv, f: rLabel } : null,
                rLabel || null,
                lv != null && lv > 0 ? { v: lv, f: lLabel } : null,
                lLabel || null,
            ];
        });

        const axisTextColor = this.isDark ? "#e5e7eb" : "#334155";
        const gridColor = this.isDark
            ? "rgba(255,255,255,.14)"
            : "rgba(15,23,42,.10)";

        this.avgDurationCompareCombinedChartOptions = {
            title: "",
            backgroundColor: "transparent",
            legend: {
                position: "top",
                alignment: "end",
                textStyle: { fontSize: 12, bold: true, color: axisTextColor },
            },
            chartArea: { width: "86%", height: "62%", left: 44, top: 46 },
            pointSize: 5,
            lineWidth: 3,
            interpolateNulls: true,
            vAxis: {
                title: "משך צינתור ממוצע (דק')",
                textStyle: { fontSize: 11, bold: true, color: axisTextColor },
                titleTextStyle: {
                    fontSize: 11,
                    bold: true,
                    color: axisTextColor,
                },
                gridlines: { color: gridColor },
                minorGridlines: { color: "transparent" },
            },
            hAxis: {
                title: "שנה",
                textStyle: { fontSize: 11, bold: true, color: axisTextColor },
                titleTextStyle: {
                    fontSize: 11,
                    bold: true,
                    color: axisTextColor,
                },
            },
            annotations: {
                textStyle: { fontSize: 10, bold: true, color: axisTextColor },
                stem: { color: gridColor, length: 3 },
            },
            series: {
                0: { color: this.isDark ? "#60a5fa" : "#2563eb" },
                1: { color: this.isDark ? "#4ade80" : "#16a34a" },
            },
        };

        // Use same look & feel as avgDuration, but keep labels vertical for readability
        const baseOpts =
            this.avgDurationChartOptions &&
            Object.keys(this.avgDurationChartOptions).length
                ? this.avgDurationChartOptions
                : {
                      title: "",
                      legend: {
                          position: "top",
                          alignment: "end",
                          textStyle: { fontSize: 14, bold: true },
                      },
                      chartArea: {
                          width: "90%",
                          height: "60%",
                          left: 50,
                          top: 100,
                      },
                      vAxis: {
                          title: "משך צינתור ממוצע (דק')",
                          textStyle: { fontSize: 14, bold: true },
                      },
                  };

        const axis = {
            ...(baseOpts.hAxis || {}),
            slantedText: true,
            slantedTextAngle: 90,
            textStyle: {
                ...(baseOpts.hAxis?.textStyle || {}),
                fontSize: 14,
                bold: true,
                color: "#334155",
            },
        };

        this.avgDurationCompareRightChartOptions = {
            ...baseOpts,
            hAxis: axis,
        };
        this.avgDurationCompareLeftChartOptions = {
            ...baseOpts,
            hAxis: axis,
        };

        const wingYearTip = {
            multiYearValueSuffix: "",
            multiYearShowTotal: false as boolean,
        };
        const pr = this.patchGoogleChartHtmlTooltips(
            this.avgDurationCompareRightChartColumns,
            this.avgDurationCompareRightChartData,
            this.avgDurationCompareRightChartOptions,
            wingYearTip,
        );
        this.avgDurationCompareRightChartColumns = pr.columns;
        this.avgDurationCompareRightChartData = pr.data;
        this.avgDurationCompareRightChartOptions = pr.options;

        const pl = this.patchGoogleChartHtmlTooltips(
            this.avgDurationCompareLeftChartColumns,
            this.avgDurationCompareLeftChartData,
            this.avgDurationCompareLeftChartOptions,
            wingYearTip,
        );
        this.avgDurationCompareLeftChartColumns = pl.columns;
        this.avgDurationCompareLeftChartData = pl.data;
        this.avgDurationCompareLeftChartOptions = pl.options;

        const pc = this.patchGoogleChartHtmlTooltips(
            this.avgDurationCompareCombinedChartColumns,
            this.avgDurationCompareCombinedChartData,
            this.avgDurationCompareCombinedChartOptions,
            wingYearTip,
        );
        this.avgDurationCompareCombinedChartColumns = pc.columns;
        this.avgDurationCompareCombinedChartData = pc.data;
        this.avgDurationCompareCombinedChartOptions = pc.options;
    }

    /** מניעת טעינה כפולה: קוראים לשרת רק כשאין עדיין נתונים או כשהפרמטרים השתנו */
    private lastCountByDeptYear: number | null = null;
    private lastMonthlyCountsParams: string | null = null;
    /** מונע שליחת קריאות כפולות ל-GetMonthlyCounts כל עוד יש בקשה בתהליך */
    private monthlyCountsRequestInFlight = false;
    private lastSurgeriesPerDayYear: string | null = null;
    /** מפתח מטמון לגרף «צינתורים ליום בחדר» — GetDepRoomFiveYears (לפי baseYear) */
    private lastSurgeriesPerDayCacheKey: string | null = null;
    /** מפתח מטמון לגרף מדדי חדרים — GetAvgSurgeriesPerDayPerRoomFiveYears */
    private lastRoomUtilizationStatsCacheKey: string | null = null;
    /** GetDepRoomFiveYears — גרף צינתורים ליום בחדר (ימים ללא פיצול) */
    private surgeriesPerDayDepRoomRaw: RoomsStatsDepRoomDto[] = [];
    /** GetAvgSurgeriesPerDayPerRoomFiveYears — מדדי חדרים בפאנל ניצולת */
    private roomUtilizationRoomStatsRaw: AvgSurgeriesPerDayPerRoomDto[] = [];
    private lastAvgDurationYear: string | null = null;
    /** מפתח פרמטרים אחרון (לפי buildKpiFilterParams) – למודלים שמשתמשים בפילטרים */
    private lastAvgFirstMorningEntryParams: string | null = null;
    private lastAvgLastMorningEndParams: string | null = null;
    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private mMenuPerm: MenuPerm,
    ) {
        // הגבלת גישה לדשבורד הצינתורים לפי הרשאות תפריט
        const userName = localStorage.getItem("loginUserName") || "";
        if (userName) {
            this.mMenuPerm.setUserName(userName);
        }
        // השם חייב להתאים ל־RoutName המוגדר בצד השרת להרשאה זו
        this.mMenuPerm.setRoutName("pciDashboard");
        setTimeout(() => {
            if (!this.mMenuPerm.getHasPerm()) {
                localStorage.clear();
                this.router.navigate(["login"]);
            }
        }, 2000);
    }

    /**
     * כשמצב טעינה גלובלי נסגר – מרענן תצוגת טבלה (ריווח/גלילה).
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
            if (!anyLoading) {
                this.scheduleTableExtraCheck();
            }
        }
    }

    ngAfterViewInit(): void {
        this.scheduleTableExtraCheck();
        this.scheduleYoyCombinedInlineBuild();
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
        const ctx = canvas.getContext("2d");
        const rows = this.getFilteredDepartmentYoyData();
        if (!ctx || !rows.length) {
            return;
        }

        // השמדת גרף קודם (אם קיים)
        if (this.yoyCombinedChart) {
            this.yoyCombinedChart.destroy();
            this.yoyCombinedChart = null;
        }

        const labels = rows.map((d) => d.Department || "");
        const surgeries = rows.map((d) => d.SurgeriesPerRoom_Pct ?? 0);
        const times = rows.map((d) => d.AvgSurgeryTime_Pct ?? 0);
        const revenues = rows.map((d) => d.AvgRevenue_Pct ?? 0);

        const isDark = this.isDark;
        const textColor = isDark ? "#e5e7eb" : "#0f172a";

        this.yoyCombinedChart = new Chart(ctx, {
            type: "horizontalBar",
            data: {
                labels,
                datasets: [
                    {
                        label: "צינתורים לחדר (% שינוי)",
                        data: surgeries,
                        backgroundColor: "#22c55e",
                    },
                    {
                        label: "זמן צינתור ממוצע (% שינוי)",
                        data: times,
                        backgroundColor: "#f97316",
                    },
                    {
                        label: "הכנסה ממוצעת (% שינוי)",
                        data: revenues,
                        backgroundColor: "#0ea5e9",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: "bottom",
                    labels: {
                        fontColor: textColor,
                        fontSize: 11,
                    },
                },
                scales: {
                    xAxes: [
                        {
                            ticks: {
                                fontColor: textColor,
                                callback: (v: any) => v + "%",
                            },
                            scaleLabel: {
                                display: true,
                                labelString: "% שינוי",
                                fontColor: textColor,
                            },
                            gridLines: {
                                color: isDark
                                    ? "rgba(148,163,184,.3)"
                                    : "rgba(148,163,184,.4)",
                            },
                        },
                    ],
                    yAxes: [
                        {
                            ticks: {
                                fontColor: textColor,
                                mirror: false,
                            },
                            gridLines: {
                                display: false,
                            },
                        },
                    ],
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
                            const sign = val > 0 ? "+" : "";
                            return `${ds.label}: ${sign}${val.toFixed(1)}%`;
                        },
                    },
                },
            },
            plugins: [
                {
                    // קווי "רשת" דקים לכל מחלקה + תוויות אחוזים בקצה כל עמודה
                    beforeDatasetsDraw: (chart: any) => {
                        const ctx2 = chart.ctx;
                        const chartArea = chart.chartArea;
                        const firstDatasetMeta = chart.getDatasetMeta(0);
                        if (!firstDatasetMeta || !firstDatasetMeta.data) {
                            return;
                        }

                        ctx2.save();
                        ctx2.strokeStyle = isDark
                            ? "rgba(148,163,184,.35)"
                            : "rgba(148,163,184,.35)";
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
                        ctx2.font = Chart.helpers.fontString(
                            11,
                            "normal",
                            Chart.defaults.global.defaultFontFamily,
                        );
                        ctx2.fillStyle = textColor;

                        chart.data.datasets.forEach(
                            (dataset: any, dsIndex: number) => {
                                const meta = chart.getDatasetMeta(dsIndex);
                                meta.data.forEach((bar: any, index: number) => {
                                    const raw = dataset.data[index];
                                    if (raw == null) {
                                        return;
                                    }
                                    const value = Number(raw);
                                    const sign = value > 0 ? "+" : "";
                                    const label = `${sign}${value.toFixed(1)}%`;
                                    const padding = 4;

                                    const x =
                                        value >= 0
                                            ? bar._model.x + padding
                                            : bar._model.x - padding;
                                    const y = bar._model.y + 4; // תיקון קטן לגובה

                                    ctx2.textAlign =
                                        value >= 0 ? "left" : "right";
                                    ctx2.textBaseline = "middle";
                                    ctx2.fillText(label, x, y);
                                });
                            },
                        );

                        ctx2.restore();
                    },
                },
            ],
        } as any);
    }

    private buildYoyCombinedInlineChart(): void {
        const ref = this.yoyCombinedChartInlineRef;
        if (!ref) {
            return;
        }
        const canvas = ref.nativeElement;
        const ctx = canvas.getContext("2d");
        const rows = this.getFilteredDepartmentYoyData();
        if (!ctx || !rows.length) {
            return;
        }

        if (this.yoyCombinedInlineChart) {
            this.yoyCombinedInlineChart.destroy();
            this.yoyCombinedInlineChart = null;
        }

        const labels = rows.map((d) => d.Department || "");
        const surgeries = rows.map((d) => d.SurgeriesPerRoom_Pct ?? 0);
        const times = rows.map((d) => d.AvgSurgeryTime_Pct ?? 0);
        const revenues = rows.map((d) => d.AvgRevenue_Pct ?? 0);

        const isDark = this.isDark;
        const textColor = isDark ? "#e5e7eb" : "#0f172a";

        this.yoyCombinedInlineChart = new Chart(ctx, {
            type: "horizontalBar",
            data: {
                labels,
                datasets: [
                    {
                        label: "צינתורים לחדר (% שינוי)",
                        data: surgeries,
                        backgroundColor: "#22c55e",
                    },
                    {
                        label: "זמן צינתור ממוצע (% שינוי)",
                        data: times,
                        backgroundColor: "#f97316",
                    },
                    {
                        label: "הכנסה ממוצעת (% שינוי)",
                        data: revenues,
                        backgroundColor: "#0ea5e9",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: "bottom",
                    labels: { fontColor: textColor, fontSize: 11 },
                },
                scales: {
                    xAxes: [
                        {
                            ticks: {
                                fontColor: textColor,
                                callback: (v: any) => v + "%",
                            },
                            scaleLabel: {
                                display: true,
                                labelString: "% שינוי",
                                fontColor: textColor,
                            },
                            gridLines: {
                                color: isDark
                                    ? "rgba(148,163,184,.3)"
                                    : "rgba(148,163,184,.4)",
                            },
                        },
                    ],
                    yAxes: [
                        {
                            ticks: { fontColor: textColor, mirror: false },
                            gridLines: { display: false },
                        },
                    ],
                },
                layout: {
                    padding: { left: 40, right: 40, top: 10, bottom: 10 },
                },
                tooltips: {
                    callbacks: {
                        label: (tooltipItem: any, data: any) => {
                            const ds = data.datasets[tooltipItem.datasetIndex];
                            const val = tooltipItem.xLabel as number;
                            const sign = val > 0 ? "+" : "";
                            return `${ds.label}: ${sign}${val.toFixed(1)}%`;
                        },
                    },
                },
            },
            plugins: [
                {
                    beforeDatasetsDraw: (chart: any) => {
                        const ctx2 = chart.ctx;
                        const chartArea = chart.chartArea;
                        const firstDatasetMeta = chart.getDatasetMeta(0);
                        if (!firstDatasetMeta || !firstDatasetMeta.data) return;
                        ctx2.save();
                        ctx2.strokeStyle = isDark
                            ? "rgba(148,163,184,.35)"
                            : "rgba(148,163,184,.35)";
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
                        ctx2.font = Chart.helpers.fontString(
                            11,
                            "normal",
                            Chart.defaults.global.defaultFontFamily,
                        );
                        ctx2.fillStyle = textColor;
                        chart.data.datasets.forEach(
                            (dataset: any, dsIndex: number) => {
                                const meta = chart.getDatasetMeta(dsIndex);
                                meta.data.forEach((bar: any, index: number) => {
                                    const raw = dataset.data[index];
                                    if (raw == null) return;
                                    const value = Number(raw);
                                    const sign = value > 0 ? "+" : "";
                                    const label = `${sign}${value.toFixed(1)}%`;
                                    const padding = 4;
                                    const x =
                                        value >= 0
                                            ? bar._model.x + padding
                                            : bar._model.x - padding;
                                    const y = bar._model.y + 4;
                                    ctx2.textAlign =
                                        value >= 0 ? "left" : "right";
                                    ctx2.textBaseline = "middle";
                                    ctx2.fillText(label, x, y);
                                });
                            },
                        );
                        ctx2.restore();
                    },
                },
            ],
        } as any);
    }

    private scheduleYoyCombinedInlineBuild(): void {
        if (this.chartViewMode !== "yoy-combined") {
            return;
        }
        if (this.yoyCombinedInlineChart) {
            this.yoyCombinedInlineChart.destroy();
            this.yoyCombinedInlineChart = null;
        }
        // wait for DOM to render the canvas
        setTimeout(() => this.buildYoyCombinedInlineChart(), 0);
    }

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
        if (!this.showTopQuickMainSlotSwitcher) {
            this.topQuickMainSlot = "performed";
        }

        if (this.employeeUserName) {
            this.loadEmployeeInfo(this.employeeUserName);
        }

        // Initialize chart theme and body class for select panel (dark mode)
        this.updateChartTheme();
        this.syncBodyDarkClass();
        this.updateChartOptionsForType();
        // Load main 5‑year counts by department from new API
        this.loadCountByDept();
        // טעינת נתוני חודשים מוקדמת (אותם פרמטרים כמו KPI ברירת מחדל) — לכותרת תקופה ומטמון לפני מעבר לתצוגת חודשים
        this.loadMonthlyCounts({ prefetchSilent: true });
        this.loadDiagnosesList();
        // Load data after diagnoses list is loaded
        setTimeout(() => {
            this.loadDepartmentIncomeByDiagnosis();
        }, 500);
        this.displayedCatalogColumns = this.cashColumns;

        // רישום מאזין resize כדי שהגרף יתעדכן בכל שינוי גודל מסך
        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.onWindowResize);
        }

        // באנר בטא: בכל כניסה לדשבורד (אחרי יציאה לנתיב אחר) — גם אם הרכיב לא נהרס
        let wasOnSurgeriesDashboard =
            this.router.url.includes("pciDashboard");
        this.betaBannerNavSub = this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe((e) => {
                const url = e.urlAfterRedirects || e.url;
                const on = url.includes("pciDashboard");
                if (on && !wasOnSurgeriesDashboard) {
                    this.showFloatingBetaBanner = true;
                    this.cdr.detectChanges();
                }
                wasOnSurgeriesDashboard = on;
            });
    }

    ngOnDestroy(): void {
        this.betaBannerNavSub?.unsubscribe();
        this.betaBannerNavSub = undefined;
        document.body.classList.remove("pci-dashborad-dark");
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.onWindowResize);
        }
    }

    /**
     * ממפה שורת תגובה מהשרת ל-PciRow (תמיכה במפתחות בעברית/אנגלית)
     */
    private normalizePciRow(row: any): PciRow {
        if (!row || typeof row !== "object") return {};
        const r = row as Record<string, any>;
        return {
            date:
                r["תאריך ניתוח"] ??
                r["תאריך"] ??
                r["Date"] ??
                r["date"],
            caseNumber:
                r["מספר מקרה"] ??
                r["מספר_מקרה"] ??
                r["CaseNumber"] ??
                r["caseNumber"],
            surgeryNumber:
                r["מספר ניתוח"] ??
                r["מספר צינתור"] ??
                r["מספר_ניתוח"] ??
                r["מספר_צינתור"] ??
                r["SurgeryNumber"],
            site: r["אתר"] ?? r["Site"] ?? r["site"],
            surgeryRoom:
                r["חדר ניתוח"] ??
                r["חדר צינתור"] ??
                r["חדר_ניתוח"] ??
                r["חדר_צינתור"] ??
                r["SurgeryRoom"] ??
                r["surgeryRoom"],
            surgeryDurationMinutes: this.toNumber(
                r["זמן חדר"] ??
                    r["זמן צינתור בדקות"] ??
                    r["זמן_ניתוח_בדקות"] ??
                    r["SurgeryDurationMinutes"],
            ),
            surgeryType:
                r["סוג ניתוח"] ??
                r["סוג צינתור"] ??
                r["סוג_ניתוח"] ??
                r["סוג_צינתור"] ??
                r["SurgeryType"],
            unifiedSurgeryType:
                r["סוג ניתוח קמיליון"] ??
                r["סוג צינתור מאוחד"] ??
                r["סוג_ניתוח_מאוחד"],
            surgeon:
                r["מנתח אחראי"] ??
                r["מנתחת"] ??
                r["Surgeon"] ??
                r["surgeon"],
            requestingUnit:
                r["יחידה"] ??
                r["יחידה מזמינה"] ??
                r["יחידה_מזמינה"] ??
                r["RequestingUnit"],
            procedure:
                r["פרוצדורה"] ??
                r["שם שירות לחיוב"] ??
                r["Procedure"] ??
                r["procedure"],
            totalAmount: this.toNumber(
                r["סך הכנסות נטו נומינלי"] ??
                    r["סכום כולל"] ??
                    r["סכום_כולל"] ??
                    r["TotalAmount"],
            ),
            shift: r["משמרת"] ?? r["StartTimeOnly"] ?? r["shift"],
            department: r["מחלקה"] ?? r["S_DEPARTMENT"] ?? r["department"],
            departmentMapped: r["MappedDept"] ?? r["department_mapped"],
            weekdayOrWeekend:
                r["סוף / אמצע שבוע"] ??
                r["יום_או_סופש"] ??
                r["weekday_or_weekend"],
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
    private parseDateParts(
        dateStr: string | undefined | null,
    ): { year: number; month: number; day: number } | null {
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
     * Legacy hook: previously POSTed GetPciDashborad (surgery rows or department income).
     * That ASMX method is unused; charts/table rely on GetCountByDept and other endpoints.
     * Call sites unchanged — no HTTP; clears cached rows on forceRefresh.
     */
    loadDepartmentIncomeData(
        forceRefresh = false,
        opts?: { keepDashboardVisible?: boolean },
    ): void {
        const keepDv = !!opts?.keepDashboardVisible;
        if (
            !forceRefresh &&
            (this.surgeryData.length > 0 ||
                this.departmentIncomeData.length > 0)
        ) {
            this.isDataLoaded = true;
            this.isMainDataLoading = false;
            this.dataSource.data =
                this.surgeryData.length > 0
                    ? this.applySurgeryFilter(this.surgeryData)
                    : this.departmentIncomeData;
            this.updateChartData();
            this.cdr.detectChanges();
            return;
        }
        if (forceRefresh) {
            this.surgeryData = [];
            this.departmentIncomeData = [];
        }
        if (!forceRefresh && !keepDv) {
            this.isDataLoaded = false;
            this.isLoading = true;
        }
        this.isMainDataLoading = true;

        this.isMainDataLoading = false;
        this.isLoading = false;
        this.isDataLoaded = true;
        this.dataSource.data = [];
        this.computeFilterOptions();
        this.updateChartData();
        this.cdr.detectChanges();
    }

    /** ASMX string WebMethods return XML-wrapped JSON — fetch as text and unwrap. */
    private asmxGet(
        url: string,
        options?: { params?: Record<string, string | string[]> },
    ): Observable<unknown> {
        return this.http
            .get(url, { ...options, responseType: "text" })
            .pipe(map((text) => parseAsmxPayload(text)));
    }

    /**
     * Load 5‑year aggregated counts by department from new API GetCountByDept
     * קורא לשרת רק אם עדיין אין נתונים לשנה הנוכחית.
     */
    private loadCountByDept(): void {
        const baseYear = this.currentYear;
        if (
            this.countByDeptData.length > 0 &&
            this.lastCountByDeptYear === baseYear
        ) {
            this.updateChartData();
            return;
        }
        this.isChartLoading = true;

        this.asmxGet(
                environment.url + "GetCountByDept_pci_dashborad",
                {
                    params: { baseYear: baseYear.toString() },
                },
            )
            .subscribe(
                (rows) => {
                    if (Array.isArray(rows)) {
                        this.countByDeptData = rows;
                        this.lastCountByDeptYear = baseYear;
                    } else {
                        this.countByDeptData = [];
                    }
                    // עדכון אופציות פילטרים (כולל חדרי צינתור) גם כשעובדים רק עם CountByDept
                    this.computeFilterOptions();
                    this.updateChartData();
                    this.initializeCompareDepartmentDefaults();
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error("Error loading GetCountByDept data:", error);
                    this.countByDeptData = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                },
            );
    }

    /**
     * Load 5‑year aggregated counts by month from GetMonthlyCounts_pci_dashborad.
     * שולח את אותם פרמטרי סינון כמו מדדי KPI (סוג צינתור, משמרת, אתר, סופ״ש, מחלקה, עבודת בוקר, חדרים).
     */
    private loadMonthlyCounts(options?: { prefetchSilent?: boolean }): void {
        const prefetchSilent = options?.prefetchSilent === true;
        const apiParams = this.buildMonthlyCountsApiParams();
        const paramsKey = this.monthlyCountsParamsCacheKey(apiParams);
        // כולל תוצאה ריקה מהשרת — אחרת מתחילים לולאת קריאות (ריק → updateChartData → loadMonthlyCounts שוב)
        if (
            this.lastMonthlyCountsParams === paramsKey &&
            !this.monthlyCountsRequestInFlight
        ) {
            if (
                !prefetchSilent ||
                this.chartViewMode === "month" ||
                this.chartViewMode === "year-total"
            ) {
                this.updateChartData();
            }
            return;
        }
        if (this.monthlyCountsRequestInFlight) {
            return;
        }
        this.monthlyCountsRequestInFlight = true;
        if (!prefetchSilent) {
            this.isChartLoading = true;
        }

        this.asmxGet(
                environment.url + "GetMonthlyCounts_pci_dashborad",
                {
                    params: apiParams,
                },
            )
            .subscribe({
                next: (response: any) => {
                    this.monthlyCountsRequestInFlight = false;
                    const rows = Array.isArray(response) ? response : [];
                    this.monthlyCountsData = rows;
                    this.lastMonthlyCountsParams = paramsKey;
                    this.recomputeMonthlyCountsLatestPeriod(rows);
                    if (
                        !prefetchSilent ||
                        this.chartViewMode === "month" ||
                        this.chartViewMode === "year-total"
                    ) {
                        this.updateChartData();
                    } else {
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    this.monthlyCountsRequestInFlight = false;
                    console.error("Error loading GetMonthlyCounts data:", err);
                    this.monthlyCountsData = [];
                    this.monthlyCountsLatestPeriod = null;
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    const status = err && (err as any).status;
                    this.snackBar.open(
                        status === 500
                            ? "❌ השרת החזיר שגיאה (500) בטעינת צינתורים לפי חודשים. יש לבדוק את GetMonthlyCounts_pci_dashborad בצד השרת."
                            : "❌ שגיאה בטעינת צינתורים לפי חודשים מהשרת.",
                        "סגור",
                        { duration: 6000 },
                    );
                    // נשארים בלי נתוני חודש — חוזרים לתצוגת שנה כדי שלא יישאר גרף ריק / לולאת קריאות
                    if (this.chartViewMode === "month") {
                        this.setChartViewMode("year-total");
                    } else {
                        this.cdr.detectChanges();
                    }
                },
            });
    }

    /**
     * קובע את חודש/שנה המאוחרים ביותר בנתוני GetMonthlyCounts (מעדיף שורות עם Count > 0).
     */
    private recomputeMonthlyCountsLatestPeriod(rows: MonthlyCountRow[]): void {
        if (!rows || rows.length === 0) {
            this.monthlyCountsLatestPeriod = null;
            return;
        }
        const pickMax = (list: MonthlyCountRow[]) => {
            let bestY = -1;
            let bestM = -1;
            for (const r of list) {
                const y = Number((r as any).Year ?? (r as any).year);
                const m = Number((r as any).Month ?? (r as any).month);
                if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
                    continue;
                }
                if (y > bestY || (y === bestY && m > bestM)) {
                    bestY = y;
                    bestM = m;
                }
            }
            return bestY >= 0 ? { year: bestY, month: bestM } : null;
        };
        const withCount = rows.filter(
            (r) => (Number((r as any).Count ?? (r as any).count) || 0) > 0,
        );
        this.monthlyCountsLatestPeriod = pickMax(
            withCount.length > 0 ? withCount : rows,
        );
    }

    /**
     * טוען נתוני השוואה YoY לפי מחלקה (מדד משולב) – צינתורים לחדר, זמן צינתור, הכנסה
     * קורא לשרת רק אם עדיין אין נתונים.
     */
    private loadDepartmentYoY(): void {
        if (this.departmentYoyData.length > 0) {
            this.purgeExcludedFromDepartmentYoyData();
            this.updateChartData();
            if (this.showYoyCombinedFullModal) {
                setTimeout(() => this.buildYoyCombinedChart(), 0);
            }
            this.scheduleYoyCombinedInlineBuild();
            return;
        }
        this.isChartLoading = true;
        this.http
            .get<any>(environment.url + "GetDepartmentYoY_pci_dashborad")
            .subscribe(
                (response) => {
                    const raw =
                        response && response.d != null ? response.d : response;
                    const list = Array.isArray(raw) ? raw : [];
                    this.departmentYoyData = list.map((r: any) => ({
                        Department: r.Department ?? r.department ?? "",
                        SurgeriesPerRoom_Current: Number(
                            r.SurgeriesPerRoom_Current ??
                                r.surgeriesPerRoom_Current ??
                                0,
                        ),
                        AvgSurgeryTime_Current: Number(
                            r.AvgSurgeryTime_Current ??
                                r.avgSurgeryTime_Current ??
                                0,
                        ),
                        AvgRevenue_Current: Number(
                            r.AvgRevenue_Current ?? r.avgRevenue_Current ?? 0,
                        ),
                        SurgeriesPerRoom_Prev: Number(
                            r.SurgeriesPerRoom_Prev ??
                                r.surgeriesPerRoom_Prev ??
                                0,
                        ),
                        AvgSurgeryTime_Prev: Number(
                            r.AvgSurgeryTime_Prev ?? r.avgSurgeryTime_Prev ?? 0,
                        ),
                        AvgRevenue_Prev: Number(
                            r.AvgRevenue_Prev ?? r.avgRevenue_Prev ?? 0,
                        ),
                        SurgeriesPerRoom_Pct:
                            r.SurgeriesPerRoom_Pct != null
                                ? Number(r.SurgeriesPerRoom_Pct)
                                : r.surgeriesPerRoom_Pct != null
                                  ? Number(r.surgeriesPerRoom_Pct)
                                  : null,
                        AvgSurgeryTime_Pct:
                            r.AvgSurgeryTime_Pct != null
                                ? Number(r.AvgSurgeryTime_Pct)
                                : r.avgSurgeryTime_Pct != null
                                  ? Number(r.avgSurgeryTime_Pct)
                                  : null,
                        AvgRevenue_Pct:
                            r.AvgRevenue_Pct != null
                                ? Number(r.AvgRevenue_Pct)
                                : r.avgRevenue_Pct != null
                                  ? Number(r.avgRevenue_Pct)
                                  : null,
                    }))
                        .filter(
                            (d) =>
                                !this.isExcludedPciDepartment(
                                    d.Department || "",
                                ),
                        );
                    this.updateChartData();
                    // במידה והמודל הגדול של מדד משולב פתוח – בונה גם את גרף Chart.js
                    if (this.showYoyCombinedFullModal) {
                        setTimeout(() => this.buildYoyCombinedChart(), 0);
                    }
                    this.scheduleYoyCombinedInlineBuild();
                },
                (error) => {
                    console.error(
                        "Error loading GetDepartmentYoY data:",
                        error,
                    );
                    this.departmentYoyData = [];
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    this.cdr.detectChanges();
                },
            );
    }

    private isPciRow(row: any): boolean {
        if (!row || typeof row !== "object") return false;
        const r = row as Record<string, any>;
        return (
            r["תאריך"] != null ||
            r["Date"] != null ||
            r["חדר_צינתור"] != null ||
            r["חדר צינתור"] != null ||
            r["SurgeryRoom"] != null ||
            r["מספר_מקרה"] != null ||
            r["CaseNumber"] != null
        );
    }

    private getUniqueSites(): string[] {
        const sites = [
            ...new Set(this.surgeryData.map((s) => s.site).filter(Boolean)),
        ] as string[];
        return ["כל האתרים", ...sites];
    }

    private computeFilterOptions(): void {
        // חדרים מתוך נתוני צינתורים מפורטים (אם קיימים)
        const roomsFromSurgeries = this.surgeryData
            .map((s) => s.surgeryRoom)
            .filter(Boolean) as string[];

        // חדרים מתוך נתוני CountByDept (SurgeryRoom) – כשעובדים רק עם ה‑API האגרגטיבי
        const roomsFromCountByDept = this.countByDeptData
            .map((r) => (r as any).SurgeryRoom as string | undefined)
            .filter(Boolean) as string[];

        const rooms = [
            ...new Set([...roomsFromSurgeries, ...roomsFromCountByDept]),
        ];
        this.roomOptions = rooms;

        const depts = [
            ...new Set(
                this.surgeryData
                    .map((s) => s.departmentMapped || s.department)
                    .filter(Boolean),
            ),
        ] as string[];
        this.departmentOptions = depts;

        const sites = [
            ...new Set(this.surgeryData.map((s) => s.site).filter(Boolean)),
        ] as string[];
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

    private applySurgeryFilter(list: PciRow[]): PciRow[] {
        let filtered = list;

        // אין סינון לפי אגף / אתר בדשבורד הצינתורים, אלא רק לפי מחלקות ופרמטרים אחרים

        // סוג צינתור – מולטי, לפי "סוג צינתור מאוחד"
        // אם אין ערך מאוחד (וגם לא מסוג צינתור רגיל) – מתייחסים אליו כברירת מחדל כ"אלקטיבי"
        if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
            filtered = filtered.filter((s) => {
                let unified = (s.unifiedSurgeryType || s.surgeryType) as
                    | string
                    | undefined;
                if (!unified || unified.trim() === "") {
                    unified = "אלקטיבי";
                }
                return this.selectedSurgeryTypes.includes(unified);
            });
        }

        // משמרת – מולטי
        if (this.selectedShifts && this.selectedShifts.length > 0) {
            filtered = filtered.filter((s) => {
                const label = this.getShiftLabel(s.shift as string | undefined);
                return !!label && this.selectedShifts.includes(label);
            });
        }

        // חדר – מולטי
        if (this.selectedRooms && this.selectedRooms.length > 0) {
            filtered = filtered.filter((s) =>
                this.selectedRooms.includes(s.surgeryRoom as string),
            );
        }

        // מחלקה – מולטי
        if (this.selectedDepartments && this.selectedDepartments.length > 0) {
            filtered = filtered.filter((s) =>
                this.selectedDepartments.includes(
                    (s.departmentMapped || s.department) as string,
                ),
            );
        }

        // יום (אמצע שבוע / סופ"ש) – מולטי
        if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
            filtered = filtered.filter((s) =>
                this.selectedWeekdays.includes(s.weekdayOrWeekend as string),
            );
        }

        // אתר – מולטי
        if (this.selectedSites && this.selectedSites.length > 0) {
            filtered = filtered.filter((s) =>
                this.selectedSites.includes(s.site as string),
            );
        }

        // עבודת בוקר (כן/לא)
        if (this.morningWorkFilter === "yes") {
            filtered = filtered.filter((s) => {
                const shiftLabel = this.getShiftLabel(
                    s.shift as string | undefined,
                );
                const isMorning = shiftLabel === "בוקר";
                const isMidweek = s.weekdayOrWeekend === "אמצע שבוע";
                // הנחת עבודה: ימי חג אינם מסומנים כ"אמצע שבוע" במאפיין weekdayOrWeekend
                const isNotHoliday = isMidweek;
                return isMorning && isMidweek && isNotHoliday;
            });
        } else if (this.morningWorkFilter === "no") {
            filtered = filtered.filter((s) => {
                const shiftLabel = this.getShiftLabel(
                    s.shift as string | undefined,
                );
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
        this.surgeryData.forEach((s) => {
            const room = s.surgeryRoom || "לא צוין";
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
        this.isLoading = true;
        this.isDataLoaded = false;
        this.loadDepartmentIncomeByDiagnosis();
    }

    loadDepartmentIncomeByDiagnosis(): void {
        if (this.surgeryData.length > 0) {
            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
            this.updateChartData();
            this.isDataLoaded = true;
            this.isMainDataLoading = false;
            this.isLoading = false;
            this.cdr.detectChanges();
            this.snackBar.open("✓ נתונים עודכנו", "סגור", { duration: 2000 });
            return;
        }
        /**
         * בכניסה ראשונה: אם אין נתוני הכנסה/צינתורים בזיכרון — `loadDepartmentIncomeData` רק מסנכרן מצב מקומי
         * (אין POST ל-ASMX); הגרפים והאגרגציה מגיעים מ-GetCountByDept ושאר ה-APIs.
         */
        if (this.departmentIncomeData.length > 0) {
            this.dataSource.data = this.departmentIncomeData;
            this.updateChartData();
            this.isDataLoaded = true;
            this.isMainDataLoading = false;
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.isDataLoaded = true;
        this.isLoading = false;
        this.loadDepartmentIncomeData(false, { keepDashboardVisible: true });
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
        this.http.post(environment.url + "GetUniqueDiagnoses_pci_dashborad", {}).subscribe(
            (response: any) => {
                if (response && response.d) {
                    this.diagnosesList = response.d;
                    // Set default diagnosis if not set
                    if (
                        !this.selectedDiagnosis &&
                        this.diagnosesList.length > 0
                    ) {
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
            },
        );
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
            error: () => {
                this.employeeLoading = false;
                this.employeeError = true;
                this.cdr.detectChanges();
            },
        });
    }

    private cloneGoogleChartOptions(opts: any): any {
        try {
            return JSON.parse(JSON.stringify(opts ?? {}));
        } catch {
            return { ...(opts ?? {}) };
        }
    }

    private saveGoogleChartOptionsBeforeYoy(): void {
        if (!this.savedGoogleChartOptionsBeforeYoy) {
            this.savedGoogleChartOptionsBeforeYoy = this.cloneGoogleChartOptions(
                this.chartOptions,
            );
        }
    }

    private restoreGoogleChartOptionsAfterYoy(): void {
        if (this.savedGoogleChartOptionsBeforeYoy) {
            this.chartOptions = this.cloneGoogleChartOptions(
                this.savedGoogleChartOptionsBeforeYoy,
            );
            this.savedGoogleChartOptionsBeforeYoy = null;
        }
    }

    /** יציאה ממדד משולב — משחזר Google Chart ומאלץ רינדור נקי */
    private remountMainGoogleChartAfterYoy(): void {
        this.showMainGoogleChart = false;
        this.cdr.detectChanges();
        setTimeout(() => {
            this.showMainGoogleChart = true;
            this.cdr.detectChanges();
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore
            }
            this.chartOptions = { ...this.chartOptions };
        }, 0);
    }

    /**
     * Update chart options based on chart type
     */
    updateChartOptionsForType(): void {
        if (this.chartViewMode === "yoy-combined") {
            return;
        }
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

    private monthlyRowYear(row: MonthlyCountRow | Record<string, unknown>): number {
        return Number((row as any).Year ?? (row as any).year) || 0;
    }

    private monthlyRowCount(row: MonthlyCountRow | Record<string, unknown>): number {
        return Number((row as any).Count ?? (row as any).count) || 0;
    }

    private monthlyRowMonth(row: MonthlyCountRow | Record<string, unknown>): number {
        return Number((row as any).Month ?? (row as any).month) || 0;
    }

    /** שנת סיום לגרף סה"כ לפי שנה — מהנתונים, לא רק לוח שנה מקומי */
    private getYearTotalChartEndYear(): number {
        if (this.monthlyCountsLatestPeriod?.year > 0) {
            return this.monthlyCountsLatestPeriod.year;
        }
        const yearsFromData = (this.monthlyCountsData || [])
            .map((r) => this.monthlyRowYear(r))
            .filter((y) => y > 0);
        if (yearsFromData.length > 0) {
            return Math.max(...yearsFromData);
        }
        const baseYear = Number(this.buildMonthlyCountsApiParams().baseYear);
        if (!isNaN(baseYear) && baseYear > 0) {
            return baseYear;
        }
        return this.currentYear;
    }

    private getLastFiveChartYears(): number[] {
        const end = this.getYearTotalChartEndYear();
        return Array.from({ length: 5 }, (_, i) => end - (4 - i));
    }

    /** סה"כ צינתורים לשנה — עמודה לכל שנה (5 שנים אחרונות) מ-GetMonthlyCounts */
    private applyYearTotalChart(years: number[]): void {
        this.chartColumns = [
            "שנה",
            { type: "number", label: 'סה"כ צינתורים' },
            { type: "string", role: "annotation" },
        ];
        this.chartData = years.map((y) => {
            const val = this.yearlySurgeryTotals[y] || 0;
            return [y.toString(), val, val > 0 ? this.formatNumber(val) : ""];
        });

        this.yearColorMap = [];
        this.stackedCategoryLegend = [];

        const perYear: { [year: number]: number } = {};
        let grandTotal = 0;
        years.forEach((y) => {
            const v = this.yearlySurgeryTotals[y] || 0;
            perYear[y] = v;
            grandTotal += v;
        });

        const { diff, pct } = this.computeDiffAndPct(perYear, years);
        this.chartTableRows = [
            { label: 'סה"כ', perYear, total: grandTotal, diff, pct },
        ];
        this.syncYearlyTotalsFromChartTableRows();

        const grandTotalLabel = this.formatNumber(this.getCurrentChartGrandTotal());
        const prevOptsRaw: any = this.chartOptions || {};
        this.chartOptions = {
            ...prevOptsRaw,
            title: `סה\"כ מכל הגרף: ${grandTotalLabel}`,
            focusTarget: "category",
            isStacked: false,
            legend: { position: "none" },
            hAxis: { ...(prevOptsRaw.hAxis || {}), title: "שנה" },
            vAxis: { ...(prevOptsRaw.vAxis || {}), title: "מספר צינתורים" },
            chartArea: {
                ...(prevOptsRaw.chartArea || {}),
                top: 56,
                height: "68%",
            },
        };
        this.applyClearTooltipsToGoogleChart();
        this.isChartLoading = false;
        this.isChartViewReady = true;
        this.cdr.detectChanges();
    }

    /**
     * @returns true אם טופל מצב year-total (כולל המתנה לטעינת GetMonthlyCounts)
     */
    private updateYearTotalChartFromMonthlyCounts(): boolean {
        if (this.chartViewMode !== "year-total") {
            return false;
        }

        const years = this.getLastFiveChartYears();
        const paramsKey = this.monthlyCountsParamsCacheKey(
            this.buildMonthlyCountsApiParams(),
        );

        if (!this.monthlyCountsData?.length) {
            if (this.monthlyCountsRequestInFlight) {
                return true;
            }
            if (this.lastMonthlyCountsParams !== paramsKey) {
                this.loadMonthlyCounts();
                return true;
            }
        }

        this.yearlySurgeryTotals = {};
        years.forEach((y) => {
            this.yearlySurgeryTotals[y] = 0;
        });
        (this.monthlyCountsData || []).forEach((row) => {
            const y = this.monthlyRowYear(row);
            const c = this.monthlyRowCount(row);
            if (y > 0 && years.includes(y)) {
                this.yearlySurgeryTotals[y] =
                    (this.yearlySurgeryTotals[y] || 0) + c;
            }
        });
        this.yearsForChart = years;
        this.applyYearTotalChart(years);
        return true;
    }

    /**
     * Update chart data with numbers formatted in millions with 1 decimal place
     */
    updateChartData(): void {
        // במצב ניצולת חדר צינתור – טוענים גרף מיוחד ממוצע צינתורים ליום בחדר
        if (this.mainMetricMode === "room-utilization") {
            // נתיב ניצול חדר מדלג על האיפוס הכללי; אובייקט חדש בלי series — נדרש ל-google-chart (OnPush)
            // כדי ש-ngOnChanges יקרא setOptions אחרי מצבים מוערמים בדשבורד הראשי.
            const ruCo: any = this.chartOptions || {};
            const { series: _ruSeries, ...ruRest } = ruCo;
            this.chartOptions = { ...ruRest };
            if (this.roomUtilizationSubChart === "surgeriesPerDay") {
                this.loadSurgeriesPerDay();
            } else {
                this.loadRoomUtilizationMainChart();
            }
            return;
        }

        // מתחילים מחזור חישוב חדש לגרף הראשי
        this.isChartLoading = true;
        this.isChartViewReady = false;
        this.yearsForChart = [];
        this.yearlySurgeryTotals = {};
        this.yearColorMap = [];
        this.chartTableRows = [];
        this.sideTableValueFormat = "count";

        // מדד משולב – גרף YoY לפי מחלקה (צינתורים לחדר, זמן צינתור, הכנסה – % שינוי)
        if (this.chartViewMode === "yoy-combined") {
            const yoySource = this.getFilteredDepartmentYoyData();
            this.chartColumns = [
                "מחלקה",
                { type: "number", label: "צינתורים לחדר" },
                { type: "string", role: "annotation" },
                { type: "number", label: "זמן צינתור" },
                { type: "string", role: "annotation" },
                { type: "number", label: "הכנסה ממוצעת" },
                { type: "string", role: "annotation" },
            ];
            this.chartData = yoySource.map((d) => {
                const s =
                    d.SurgeriesPerRoom_Pct != null ? d.SurgeriesPerRoom_Pct : 0;
                const t =
                    d.AvgSurgeryTime_Pct != null ? d.AvgSurgeryTime_Pct : 0;
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
            // מדד משולב מוצג ב-Chart.js (canvas) — לא משנים chartOptions של Google Chart
            this.yearColorMap = [];
            this.stackedCategoryLegend = [];
            this.chartTableRows = yoySource.map((d) => ({
                label: d.Department || "",
                total: 0,
                perYear: {},
                pct: [
                    d.SurgeriesPerRoom_Pct,
                    d.AvgSurgeryTime_Pct,
                    d.AvgRevenue_Pct,
                ]
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

        if (this.updateYearTotalChartFromMonthlyCounts()) {
            return;
        }

        // לכל שאר המצבים – להחזיר צירים לגרף כמותי רגיל (לא אחוזים)
        // ברירת מחדל: focus על קטגוריה. כשנוסיף עמודות tooltip מותאמות (HTML) – נעבור ל-'datum' ב-applyClearTooltipsToGoogleChart
        // אובייקט חדש בלי series/stem — מוטציה על אותו reference לא מעדכנת את google-chart (OnPush).
        const prevOptsRaw: any = this.chartOptions || {};
        const {
            series: _dropStackedSeries,
            annotations: prevAnnotationsRaw,
            ...prevOptsNoSeries
        } = prevOptsRaw;
        const prevAnn: any =
            prevAnnotationsRaw && typeof prevAnnotationsRaw === "object"
                ? prevAnnotationsRaw
                : {};
        const { stem: _dropStem, ...prevAnnRest } = prevAnn;
        this.chartOptions = {
            ...prevOptsNoSeries,
            focusTarget: "category",
            isStacked: false,
            legend: {
                position: "top",
                alignment: "end",
                textStyle: {
                    fontSize: 14,
                    bold: true,
                },
            },
            hAxis: {
                ...(prevOptsNoSeries.hAxis || {}),
                viewWindow: undefined,
                format: undefined,
                title: prevOptsNoSeries.hAxis?.title || "",
            },
            vAxis: {
                ...(prevOptsNoSeries.vAxis || {}),
                viewWindow: undefined,
                title: prevOptsNoSeries.vAxis?.title || "",
            },
            chartArea: {
                ...(prevOptsNoSeries.chartArea || {}),
                left: prevOptsNoSeries.chartArea?.left ?? 40,
                top: prevOptsNoSeries.chartArea?.top ?? 50,
                bottom: prevOptsNoSeries.chartArea?.bottom ?? 40,
                width: prevOptsNoSeries.chartArea?.width ?? "90%",
                height: prevOptsNoSeries.chartArea?.height ?? "60%",
            },
            annotations: {
                ...prevAnnRest,
                alwaysOutside: false,
                textStyle: {
                    ...(prevAnnRest.textStyle || {}),
                    fontSize: prevAnnRest.textStyle?.fontSize ?? 16,
                    bold: true,
                    rotation: -90,
                },
            },
        };

        // 1) מקור ראשי לגרף: GetCountByDept (5 שנים אחרונות לפי מחלקה)
        //    מכאן נגזרים כל מצבי התצוגה שמבוססים על ספירות (שנה, מחלקה, אתר, משמרת).
        if (this.countByDeptData && this.countByDeptData.length > 0) {
            let source: CountByDeptRow[] = this.countByDeptData;

            // פילטרים כלליים: סוג צינתור, חדר, מחלקה, יום בשבוע, עבודת בוקר
            if (
                this.selectedSurgeryTypes &&
                this.selectedSurgeryTypes.length > 0
            ) {
                source = source.filter((r) => {
                    let unified = (r.UnifiedSurgeryType || "").trim();
                    if (!unified) unified = "אלקטיבי";
                    return this.selectedSurgeryTypes.includes(unified);
                });
            }

            // במשמרת – לא מפלטרים כאשר הגרף עצמו מוצג לפי משמרת
            if (
                !this.isShiftGroupedView &&
                this.selectedShifts &&
                this.selectedShifts.length > 0
            ) {
                source = source.filter(
                    (r) =>
                        !!r.Shift &&
                        this.selectedShifts.includes(r.Shift.trim()),
                );
            }

            if (this.selectedRooms && this.selectedRooms.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.SurgeryRoom &&
                        this.selectedRooms.includes(r.SurgeryRoom.trim()),
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
                    (r) => (r.Wing || "").trim() === this.chartDepartmentFilter,
                );
            } else if (
                this.selectedDepartments &&
                this.selectedDepartments.length > 0
            ) {
                source = source.filter(
                    (r) =>
                        !!r.Wing &&
                        this.selectedDepartments.includes(r.Wing.trim()),
                );
            }

            // פילטר אתר (Site) – מולטי
            if (this.selectedSites && this.selectedSites.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.Site && this.selectedSites.includes(r.Site.trim()),
                );
            }

            if (this.selectedWeekdays && this.selectedWeekdays.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.WeekPart &&
                        this.selectedWeekdays.includes(r.WeekPart.trim()),
                );
            }

            if (!source || source.length === 0) {
                // במצב "חודשים" הנתונים לגרף מגיעים מ־GetMonthlyCounts — לא מפילטרים כאן את התצוגה
                if (this.chartViewMode !== "month") {
                    this.chartData = [];
                    this.chartTableRows = [];
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    this.cdr.detectChanges();
                    return;
                }
            }

            // זיהוי שנים ייחודיות מתוך הנתונים, ממוינות מהישן לחדש
            const years = Array.from(new Set(source.map((r) => r.Year))).sort(
                (a, b) => a - b,
            );

            if (years.length === 0) {
                if (this.chartViewMode !== "month") {
                    this.chartData = [];
                    this.chartTableRows = [];
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                    return;
                }
            }

            // חישוב סה"כ לפי שנה (בשימוש גם לכרטיסי הסיכום מעל הגרף)
            years.forEach((y) => {
                const sum = source
                    .filter((r) => r.Year === y)
                    .reduce((acc, r) => acc + (r.Count || 0), 0);
                this.yearlySurgeryTotals[y] = sum;
            });
            this.yearsForChart = years;

            // מיפוי Wing בלבד -> שנה -> כמות (בשימוש במצב 'department'; ללא גיבוי ל-Department)
            const byWingYear = new Map<string, Map<number, number>>();
            source.forEach((row) => {
                const wing = (row.Wing || "").trim() || "לא צוין";
                if (!byWingYear.has(wing)) {
                    byWingYear.set(wing, new Map<number, number>());
                }
                const inner = byWingYear.get(wing)!;
                inner.set(
                    row.Year,
                    (inner.get(row.Year) || 0) + (row.Count || 0),
                );
            });

            // === מצב 2: סה"כ לפי מחלקה (הגרף הקיים, ממוין מהגדול לקטן) ===
            const yearsForDept = years;
            if (this.chartViewMode === "department") {
                const dynamicColumns: any[] = ["מחלקה"];
                yearsForDept.forEach((y) => {
                    dynamicColumns.push({
                        type: "number",
                        label: y.toString(),
                    });
                    dynamicColumns.push({ type: "string", role: "annotation" });
                });
                this.chartColumns = dynamicColumns;

                const rows: {
                    label: string;
                    total: number;
                    row: any[];
                    perYear: { [year: number]: number };
                }[] = [];

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

                // מיון מהגדול לקטן לפי סה"כ צינתורים
                rows.sort((a, b) => b.total - a.total);

                this.chartData = rows.map((r) => r.row);

                // טבלה: אותה ישות כמו בגרף, עם הפרש / אחוז בין שתי השנים האחרונות
                this.chartTableRows = rows.map((r) => {
                    const { diff, pct } = this.computeDiffAndPct(
                        r.perYear,
                        yearsForDept,
                    );
                    return {
                        label: r.label,
                        total: r.total,
                        perYear: r.perYear,
                        diff,
                        pct,
                    };
                });
                this.syncYearlyTotalsFromChartTableRows();

                this.updateColorsForYears(yearsForDept);
                this.stackedCategoryLegend = [];
                const firstYear = yearsForDept[0];
                const lastYear = yearsForDept[yearsForDept.length - 1];
                const grandTotalLabelDept = this.formatNumber(
                    this.getCurrentChartGrandTotal(),
                );
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelDept}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "מחלקה מנתחת מאוגד",
                };
                this.chartOptions.isStacked = false;
                this.chartOptions.chartArea = {
                    ...(this.chartOptions.chartArea || {}),
                    top: 56,
                    height: "68%",
                };

                this.applyClearTooltipsToGoogleChart();
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
                    inner.set(
                        r.Year,
                        (inner.get(r.Year) || 0) + (r.Count || 0),
                    );
                });

                const sitesUnsorted = Array.from(bySiteYear.keys());
                const sites = sitesUnsorted.slice().sort((a, b) => {
                    const totalA = years.reduce(
                        (sum, y) => sum + (bySiteYear.get(a)?.get(y) || 0),
                        0,
                    );
                    const totalB = years.reduce(
                        (sum, y) => sum + (bySiteYear.get(b)?.get(y) || 0),
                        0,
                    );
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
                columns.push({ type: "number", role: "data" }); // buffer
                columns.push({ type: "string", role: "annotation" });
                columns.push({ type: "number", role: "data" }); // total
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
                            sumForSite > 0
                                ? this.formatNumber(sumForSite)
                                : null,
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
                    const { diff, pct } = this.computeDiffAndPct(
                        perYear,
                        years,
                    );
                    return {
                        label: site,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });
                this.syncYearlyTotalsFromChartTableRows();

                const grandTotalLabelSite = this.formatNumber(
                    this.getCurrentChartGrandTotal(),
                );
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelSite}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר צינתורים",
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

                this.applyClearTooltipsToGoogleChart();
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
                    inner.set(
                        r.Year,
                        (inner.get(r.Year) || 0) + (r.Count || 0),
                    );
                });

                const shiftsUnsorted = Array.from(byShiftYear.keys());
                const shifts = shiftsUnsorted.slice().sort((a, b) => {
                    const totalA = years.reduce(
                        (sum, y) => sum + (byShiftYear.get(a)?.get(y) || 0),
                        0,
                    );
                    const totalB = years.reduce(
                        (sum, y) => sum + (byShiftYear.get(b)?.get(y) || 0),
                        0,
                    );
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
                columns.push({ type: "number", role: "data" }); // buffer
                columns.push({ type: "string", role: "annotation" });
                columns.push({ type: "number", role: "data" }); // total
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
                            sumForShift > 0
                                ? this.formatNumber(sumForShift)
                                : null,
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
                    const { diff, pct } = this.computeDiffAndPct(
                        perYear,
                        years,
                    );
                    return {
                        label: shift,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });
                this.syncYearlyTotalsFromChartTableRows();
                const grandTotalLabelShift = this.formatNumber(
                    this.getCurrentChartGrandTotal(),
                );
                this.chartOptions.title = `סה\"כ מכל הגרף: ${grandTotalLabelShift}`;
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר צינתורים",
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

                this.applyClearTooltipsToGoogleChart();
                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }
            if (this.chartViewMode === "fund") {
                const byFundYear = new Map<string, Map<number, number>>();

                source.forEach((r) => {
                    const fund = (r.FundType || "לא ידוע").trim() || "לא ידוע";
                    if (!byFundYear.has(fund)) byFundYear.set(fund, new Map());
                    const m = byFundYear.get(fund)!;
                    m.set(r.Year, (m.get(r.Year) || 0) + (r.Count || 0));
                });

                const fundTypesUnsorted = Array.from(byFundYear.keys());
                const preferredFundOrder: string[] = [
                    'ביה\"ח',
                    "קרן",
                    "לא ידוע",
                ];
                const remainingFundTypes = fundTypesUnsorted.filter(
                    (ft) => !preferredFundOrder.includes(ft),
                );
                const fundTypes: string[] = [
                    ...preferredFundOrder.filter((ft) =>
                        fundTypesUnsorted.includes(ft),
                    ),
                    ...remainingFundTypes,
                ];
                const columns: any[] = ["שנה"];
                fundTypes.forEach((ft) => {
                    columns.push({ type: "number", label: ft });
                    columns.push({ type: "string", role: "annotation" });
                });
                // עמודת buffer שקופה + עמודת סה"כ וירטואלית מעל העמודה
                columns.push({ type: "number", role: "data" }); // buffer
                columns.push({ type: "string", role: "annotation" });
                columns.push({ type: "number", role: "data" }); // total
                columns.push({ type: "string", role: "annotation" });
                this.chartColumns = columns;

                this.chartData = years.map((y) => {
                    const row: any[] = [y.toString()];
                    let yearGrandTotal = 0;

                    // חישוב סה"כ שנתי לכל שנה
                    fundTypes.forEach((ft) => {
                        yearGrandTotal += byFundYear.get(ft)?.get(y) || 0;
                    });

                    fundTypes.forEach((ft) => {
                        const val = byFundYear.get(ft)?.get(y) || 0;
                        row.push(val, val > 0 ? this.formatNumber(val) : null);
                    });

                    const buffer = yearGrandTotal * 0.02;
                    row.push(buffer, null);

                    // סה"כ לכל השנה – ערך 0 כדי לא להוסיף גובה, רק תווית למעלה
                    row.push(0, this.formatNumber(yearGrandTotal));
                    return row;
                });

                this.chartTableRows = fundTypes.map((fund) => {
                    const perYear: { [y: number]: number } = {};
                    let total = 0;
                    years.forEach((y) => {
                        const v = byFundYear.get(fund)?.get(y) || 0;
                        perYear[y] = v;
                        total += v;
                    });
                    const { diff, pct } = this.computeDiffAndPct(
                        perYear,
                        years,
                    );
                    return { label: fund, total, perYear, diff, pct };
                });
                this.syncYearlyTotalsFromChartTableRows();

                const grandTotalLabelFund = this.formatNumber(
                    this.getCurrentChartGrandTotal(),
                );
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

                this.applyClearTooltipsToGoogleChart();
                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }
            // === מצב 5: קרן/מדינה – ייבנה מתוך רשימת צינתורים גולמיים (אם קיימת) ===
            // כאן לא משתמשים ב‑CountByDept, ולכן אם הגענו לכאן, נעבור לענף הבא.
        }

        // 2) נתוני צינתורים גולמיים – משמשים:
        //    א. כ‑fallback כללי כאשר אין נתוני CountByDept
        //    ב. לתצוגת קרן/מדינה (chartViewMode === 'fund')
        // 2) במצב "חודשים" נעדיף תמיד את ה‑API החדש GetMonthlyCounts_pci_dashborad
        if (this.chartViewMode === "month") {
            const monthlyApiParams = this.buildMonthlyCountsApiParams();
            const monthlyParamsKey =
                this.monthlyCountsParamsCacheKey(monthlyApiParams);

            if (
                !this.monthlyCountsData ||
                this.monthlyCountsData.length === 0
            ) {
                if (this.monthlyCountsRequestInFlight) {
                    return;
                }
                // כבר התקבלה תשובה מהשרת למפתח הפרמטרים הנוכחי (כולל מערך ריק) — לא קוראים שוב ל־API
                if (this.lastMonthlyCountsParams === monthlyParamsKey) {
                    this.chartColumns = ["חודש"];
                    this.chartData = [];
                    this.chartTableRows = [];
                    this.yearsForChart = [];
                    this.stackedCategoryLegend = [];
                    this.chartOptions.title = "";
                    this.chartOptions.hAxis = {
                        ...(this.chartOptions.hAxis || {}),
                        title: "חודש",
                    };
                    this.chartOptions.vAxis = {
                        ...(this.chartOptions.vAxis || {}),
                        title: "מספר צינתורים",
                    };
                    this.chartOptions.isStacked = false;
                    this.applyClearTooltipsToGoogleChart();
                    this.isChartLoading = false;
                    this.isChartViewReady = true;
                    this.cdr.detectChanges();
                    return;
                }
                this.loadMonthlyCounts();
                return;
            }

            // שנים רלוונטיות וחודשים 1–12
            const years = Array.from(
                new Set(
                    this.monthlyCountsData
                        .map((r) => this.monthlyRowYear(r))
                        .filter((y) => y > 0),
                ),
            ).sort((a, b) => a - b);
            this.yearsForChart = years;
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

            // מיפוי חודש -> שנה -> כמות צינתורים
            const byMonthYear = new Map<number, Map<number, number>>();
            this.monthlyCountsData.forEach((row) => {
                const y = this.monthlyRowYear(row);
                const m = this.monthlyRowMonth(row);
                const c = this.monthlyRowCount(row);
                if (!years.includes(y) || m < 1 || m > 12) {
                    return;
                }
                if (!byMonthYear.has(m)) {
                    byMonthYear.set(m, new Map<number, number>());
                }
                const inner = byMonthYear.get(m)!;
                inner.set(y, (inner.get(y) || 0) + c);
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
                const monthMap =
                    byMonthYear.get(m) || new Map<number, number>();

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
                const monthMap =
                    byMonthYear.get(m) || new Map<number, number>();
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
            this.sideTableValueFormat = "count";
            this.syncYearlyTotalsFromChartTableRows();
            this.updateColorsForYears(years);
            this.stackedCategoryLegend = [];
            this.chartOptions.title = "";
            this.chartOptions.hAxis = {
                ...(this.chartOptions.hAxis || {}),
                title: "חודש",
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                title: "מספר צינתורים",
            };
            this.chartOptions.isStacked = false;
            this.chartOptions.chartArea = {
                ...(this.chartOptions.chartArea || {}),
                top: 56,
                height: "68%",
            };

            this.applyClearTooltipsToGoogleChart();
            this.isChartLoading = false;
            this.isChartViewReady = true;
            this.cdr.detectChanges();
            return;
        }

        if (this.surgeryData.length > 0) {
            const list = this.dataSource.data as PciRow[];

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
                const dept = (
                    s.departmentMapped ||
                    s.department ||
                    "לא צוין"
                ).trim();
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
                    const fund: string =
                        (fundRaw || "לא ידוע").toString().trim() || "לא ידוע";

                    if (!fundByYear.has(year)) {
                        fundByYear.set(year, new Map<string, number>());
                    }
                    const inner = fundByYear.get(year)!;
                    inner.set(fund, (inner.get(fund) || 0) + 1);
                    fundTypesSet.add(fund);
                });

                const yearsArr = Array.from(fundByYear.keys()).sort(
                    (a, b) => a - b,
                );
                const fundTypesUnsorted = Array.from(fundTypesSet.values());
                const preferredFundOrder: string[] = [
                    'ביה\"ח',
                    "קרן",
                    "לא ידוע",
                ];
                const remainingFundTypes = fundTypesUnsorted
                    .filter((ft) => !preferredFundOrder.includes(ft))
                    .sort();
                const fundTypes: string[] = [
                    ...preferredFundOrder.filter((ft) =>
                        fundTypesUnsorted.includes(ft),
                    ),
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
                    const { diff, pct } = this.computeDiffAndPct(
                        perYear,
                        yearsArr,
                    );
                    return {
                        label: fund,
                        total,
                        perYear,
                        diff,
                        pct,
                    };
                });
                this.sideTableValueFormat = "count";
                this.syncYearlyTotalsFromChartTableRows();
                this.chartOptions.title = "";
                this.chartOptions.hAxis = {
                    ...(this.chartOptions.hAxis || {}),
                    title: "שנה",
                };
                this.chartOptions.vAxis = {
                    ...(this.chartOptions.vAxis || {}),
                    title: "מספר צינתורים",
                };
                // תצוגה: עמודה אחת לשנה, מחולקת לצבעים לפי סוג מימון (stacked)
                this.chartOptions.isStacked = true;

                this.applyClearTooltipsToGoogleChart();
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

            const rows: {
                label: string;
                total: number;
                row: any[];
                perYear: { [year: number]: number };
            }[] = [];

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
            this.sideTableValueFormat = "count";
            this.syncYearlyTotalsFromChartTableRows();

            const firstYear = years[0];
            const lastYear = years[years.length - 1];
            this.chartOptions.title = "";

            this.applyClearTooltipsToGoogleChart({
                wingTooltipSubtitle:
                    "מספר צינתורים לפי שנה (מחלקה – נתונים מרשימת הצינתורים)",
                wingTotalCaption: "סה״כ צינתורים בכל השנים במחלקה זו",
                multiYearValueSuffix: "צינתורים",
                multiYearShowTotal: true,
            });
            this.isChartLoading = false;
            this.isChartViewReady = true;
            this.cdr.detectChanges();
            return;
        }

        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
            this.chartData = [];
            this.isChartLoading = false;
            this.isChartViewReady = true;
            return;
        }

        // Filter: include departments that have at least one year with positive income
        // This prevents the chart from disappearing when some departments have zero values
        const filtered = this.departmentIncomeData.filter((item) => {
            const has2024 =
                item.Income2024 &&
                !isNaN(item.Income2024) &&
                item.Income2024 > 0;
            const has2025 =
                item.Income2025 &&
                !isNaN(item.Income2025) &&
                item.Income2025 > 0;
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
        this.applyClearTooltipsToGoogleChart({
            multiYearValueSuffix: "מיליון ₪ (בקירוב)",
            wingTooltipSubtitle: "ערך פעילות לפי שנה (מיליון ש״ח, בקירוב)",
            wingTotalCaption: "סה״כ פעילות בשנים המוצגות",
        });

        this.isChartLoading = false;
        this.cdr.detectChanges();
    }

    private escapeHtmlForChartTooltip(text: string): string {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    private getDataTableCategoryHeader(columns: any[]): string | null {
        const c0 = columns[0];
        if (typeof c0 === "string") {
            return c0;
        }
        if (c0 && typeof c0 === "object" && c0.label != null) {
            return String(c0.label);
        }
        return null;
    }

    private formatTooltipCellValue(v: any, isPctChart: boolean): string {
        if (v == null || v === "") {
            return "—";
        }
        if (
            typeof v === "object" &&
            v !== null &&
            "f" in v &&
            (v as any).f != null &&
            String((v as any).f).trim() !== ""
        ) {
            return String((v as any).f);
        }
        if (typeof v === "object" && v !== null && "v" in v) {
            const n = Number((v as any).v);
            if (!Number.isFinite(n)) {
                return "—";
            }
            if (isPctChart) {
                const sign = n > 0 ? "+" : "";
                return `${sign}${n.toFixed(1)}%`;
            }
            return this.formatNumber(n);
        }
        const n = Number(v);
        if (!Number.isFinite(n)) {
            return String(v ?? "");
        }
        if (isPctChart) {
            const sign = n > 0 ? "+" : "";
            return `${sign}${n.toFixed(1)}%`;
        }
        return this.formatNumber(n);
    }

    private tooltipNumericMagnitude(v: any): number | null {
        if (v == null || v === "") {
            return null;
        }
        if (typeof v === "object" && v !== null && "v" in v) {
            const n = Number((v as any).v);
            return Number.isFinite(n) ? n : null;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    /** ציר קטגוריה (לא "שנה") וכל סדרות המספרים מתויגות כ־YYYY */
    private isWingStyleMultiYearTooltip(
        columns: any[],
        numericSeries: { colIndex: number; label: string }[],
    ): boolean {
        const h = this.getDataTableCategoryHeader(columns);
        if (!h || h === "שנה") {
            return false;
        }
        return (
            numericSeries.length > 0 &&
            numericSeries.every((s) => /^\d{4}$/.test(String(s.label).trim()))
        );
    }

    /** ציר קטגוריה "שנה" ומספר סדרות מספריות (מדדים) – פתק משולב לכל שנה */
    private isYearAxisMultiSeriesTooltip(
        columns: any[],
        numericSeries: { colIndex: number; label: string }[],
    ): boolean {
        const h = this.getDataTableCategoryHeader(columns);
        return h === "שנה" && numericSeries.length > 0;
    }

    private buildMultiYearCategoryTooltipHtml(
        category: string,
        dataRow: any[],
        numericSeries: { colIndex: number; label: string }[],
        formatVal: (v: any) => string,
        valueSuffixPlain: string,
        showTotalRow: boolean,
        copy?: { subtitle?: string; totalCaption?: string },
    ): string {
        const currentYear = new Date().getFullYear();
        const muted = this.isDark ? "#94a3b8" : "#64748b";
        const border = this.isDark ? "#475569" : "#e2e8f0";
        const lineColor = this.isDark ? "#e5e7eb" : "#0f172a";
        const suffixEsc = valueSuffixPlain
            ? ` ${this.escapeHtmlForChartTooltip(valueSuffixPlain.trim())}`
            : "";
        const subtitle =
            copy?.subtitle != null && String(copy.subtitle).trim() !== ""
                ? this.escapeHtmlForChartTooltip(String(copy.subtitle))
                : "סדר: מהחדשה (למעלה) לישנה (למטה)";
        const totalCaption =
            copy?.totalCaption != null &&
            String(copy.totalCaption).trim() !== ""
                ? this.escapeHtmlForChartTooltip(String(copy.totalCaption))
                : "סה״כ בכל השנים בשורה זו";

        const entries = numericSeries
            .map((s) => ({
                year: parseInt(String(s.label).trim(), 10),
                value: dataRow[s.colIndex],
            }))
            .filter((e) => !isNaN(e.year));
        entries.sort((a, b) => b.year - a.year);

        let rowSum = 0;
        for (const e of entries) {
            const mag = this.tooltipNumericMagnitude(e.value);
            if (mag != null) {
                rowSum += mag;
            }
        }

        const title = this.escapeHtmlForChartTooltip(category);
        const yearBlocks = entries
            .map((e) => {
                const isCurrent = e.year === currentYear;
                const badge = isCurrent
                    ? `<span style="font-size:11px;font-weight:600;color:${muted}"> (שנת נוכחית)</span>`
                    : "";
                return `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:baseline;gap:14px;font-size:13px;color:${lineColor}">
                    <span>שנה <b>${e.year}</b>${badge}</span>
                    <span style="white-space:nowrap"><b>${formatVal(e.value)}</b>${suffixEsc}</span>
                </div>`;
            })
            .join("");

        const wrap = [
            "direction:rtl",
            "text-align:right",
            "padding:10px 12px",
            "min-width:200px",
            "max-width:320px",
            `color:${lineColor}`,
        ].join(";");

        const totalBlock =
            showTotalRow && entries.length > 0
                ? `<div style="font-size:12px;margin-bottom:8px">
                ${totalCaption}: <b>${formatVal(rowSum)}</b>${suffixEsc}
            </div>`
                : "";

        return `<div style="${wrap}">
            <div style="font-size:15px;font-weight:800;margin-bottom:2px">${title}</div>
            <div style="font-size:11px;color:${muted};padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${border}">
                ${subtitle}
            </div>
            ${totalBlock}
            ${yearBlocks}
        </div>`;
    }

    private buildYearAxisMultiSeriesTooltipHtml(
        yearLabel: string,
        dataRow: any[],
        numericSeries: { colIndex: number; label: string }[],
        formatDatum: (v: any, seriesLabel: string) => string,
        copy?: { subtitle?: string; titlePrefix?: string },
    ): string {
        const muted = this.isDark ? "#94a3b8" : "#64748b";
        const border = this.isDark ? "#475569" : "#e2e8f0";
        const lineColor = this.isDark ? "#e5e7eb" : "#0f172a";
        const title = this.escapeHtmlForChartTooltip(yearLabel);
        const titlePrefix =
            copy?.titlePrefix != null && String(copy.titlePrefix).trim() !== ""
                ? this.escapeHtmlForChartTooltip(
                      String(copy.titlePrefix).trim(),
                  )
                : "שנה";
        const subtitle =
            copy?.subtitle != null && String(copy.subtitle).trim() !== ""
                ? this.escapeHtmlForChartTooltip(String(copy.subtitle))
                : "כל המדדים לשנה זו";

        const lines = numericSeries
            .map((s) => {
                const lab = this.escapeHtmlForChartTooltip(s.label);
                const val = dataRow[s.colIndex];
                return `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:baseline;gap:14px;font-size:13px;color:${lineColor}">
                    <span><b>${lab}</b></span>
                    <span style="white-space:nowrap"><b>${formatDatum(val, s.label)}</b></span>
                </div>`;
            })
            .join("");

        const wrap = [
            "direction:rtl",
            "text-align:right",
            "padding:10px 12px",
            "min-width:220px",
            "max-width:360px",
            `color:${lineColor}`,
        ].join(";");

        return `<div style="${wrap}">
            <div style="font-size:15px;font-weight:800;margin-bottom:2px">${titlePrefix} ${title}</div>
            <div style="font-size:11px;color:${muted};padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${border}">
                ${subtitle}
            </div>
            ${lines}
        </div>`;
    }

    /**
     * מוסיף עמודות tooltip (HTML) ל־Google Chart ומחזיר עותקים + מיזוג לאפשרויות (focusTarget וכו').
     */
    private patchGoogleChartHtmlTooltips(
        columnsIn: any[] | null | undefined,
        dataIn: any[] | null | undefined,
        chartOptionsIn: any,
        ctx: {
            isPctChart?: boolean;
            /** סיומת טקסט אחרי ערך בגרף "ישות × שנים" (למשל "צינתורים") */
            multiYearValueSuffix?: string;
            multiYearShowTotal?: boolean;
            wingTooltipSubtitle?: string;
            wingTotalCaption?: string;
            yearAxisSubtitle?: string;
            yearAxisTitlePrefix?: string;
            /** לגרף שבו ציר הקטגוריה הוא שנה (מדדי השוואת מחלקות) */
            formatCell?: (value: any, seriesLabel: string) => string;
        } = {},
    ): { columns: any[]; data: any[]; options: any } {
        const baseOpts =
            chartOptionsIn && typeof chartOptionsIn === "object"
                ? chartOptionsIn
                : {};
        if (
            baseOpts.tooltip === "none" ||
            baseOpts.tooltip?.trigger === "none"
        ) {
            return {
                columns: Array.isArray(columnsIn)
                    ? [...columnsIn]
                    : columnsIn || [],
                data: Array.isArray(dataIn)
                    ? dataIn.map((r) => (Array.isArray(r) ? [...r] : r))
                    : dataIn || [],
                options: { ...baseOpts },
            };
        }
        if (!columnsIn?.length || !dataIn?.length) {
            return {
                columns: columnsIn || [],
                data: dataIn || [],
                options: { ...baseOpts },
            };
        }

        const columns = [...columnsIn];
        const rows = Array.isArray(dataIn) ? [...dataIn] : [];
        if (!Array.isArray(rows)) {
            return {
                columns: columnsIn,
                data: dataIn || [],
                options: { ...baseOpts },
            };
        }

        const isPctChart = !!ctx.isPctChart;
        const tooltipCol = {
            type: "string",
            role: "tooltip",
            p: { html: true },
        };

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
        if (numericSeries.length === 0) {
            return {
                columns: columnsIn,
                data: dataIn || [],
                options: { ...baseOpts },
            };
        }

        const useWingMultiYear =
            !isPctChart &&
            this.isWingStyleMultiYearTooltip(columns, numericSeries);
        const useYearAxisCombined =
            !isPctChart &&
            !useWingMultiYear &&
            this.isYearAxisMultiSeriesTooltip(columns, numericSeries);

        /** אחרי עמודת ערך ייתכן עמודת annotation; ה-tooltip תמיד מיד אחריה */
        const tooltipInsertions: { insertPos: number; valueColIdx: number }[] =
            [];
        for (let k = 0; k < numericSeries.length; k++) {
            const idx = numericSeries[k].colIndex;
            let insertPos = idx + 1;
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
                tooltipInsertions.push({ insertPos, valueColIdx: idx });
            }
        }
        if (tooltipInsertions.length === 0) {
            return {
                columns: columnsIn,
                data: dataIn || [],
                options: { ...baseOpts },
            };
        }

        const labelByColIndex = new Map<number, string>();
        for (const s of numericSeries) {
            labelByColIndex.set(s.colIndex, s.label);
        }

        tooltipInsertions
            .sort((a, b) => b.insertPos - a.insertPos)
            .forEach(({ insertPos }) =>
                columns.splice(insertPos, 0, tooltipCol),
            );

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

        const suffixPlain =
            ctx.multiYearValueSuffix !== undefined &&
            ctx.multiYearValueSuffix !== null
                ? String(ctx.multiYearValueSuffix).trim()
                : "צינתורים";
        const showTotal = ctx.multiYearShowTotal !== false;
        const wingCopy = {
            subtitle: ctx.wingTooltipSubtitle,
            totalCaption: ctx.wingTotalCaption,
        };
        const yearAxisCopy = {
            subtitle: ctx.yearAxisSubtitle,
            titlePrefix: ctx.yearAxisTitlePrefix,
        };

        const formatDefault = (v: any) =>
            this.formatTooltipCellValue(v, isPctChart);

        const formatDatum = (v: any, seriesLabel: string) => {
            if (ctx.formatCell && useYearAxisCombined) {
                return ctx.formatCell(v, seriesLabel);
            }
            return formatDefault(v);
        };

        const dataOut = rows.map((r: any[]) => {
            if (!Array.isArray(r)) {
                return r;
            }
            const nextRow = [...r];
            const category = String(nextRow[0] ?? "");

            let combinedHtml: string | null = null;
            if (useWingMultiYear) {
                combinedHtml = this.buildMultiYearCategoryTooltipHtml(
                    category,
                    nextRow,
                    numericSeries,
                    formatDefault,
                    suffixPlain,
                    showTotal,
                    wingCopy,
                );
            } else if (useYearAxisCombined) {
                combinedHtml = this.buildYearAxisMultiSeriesTooltipHtml(
                    category,
                    nextRow,
                    numericSeries,
                    formatDatum,
                    yearAxisCopy,
                );
            }

            tooltipInsertions
                .sort((a, b) => b.insertPos - a.insertPos)
                .forEach(({ insertPos, valueColIdx }) => {
                    const seriesLabel =
                        labelByColIndex.get(valueColIdx) ?? "ערך";
                    const value = nextRow[valueColIdx];
                    const html =
                        combinedHtml ??
                        `<div style="${style}"><div><b>${this.escapeHtmlForChartTooltip(category)}</b></div><div style="${subStyle}">${this.escapeHtmlForChartTooltip(seriesLabel)}: ${formatDatum(value, seriesLabel)}</div></div>`;
                    nextRow.splice(insertPos, 0, html);
                });
            return nextRow;
        });

        const useWideCombined = useWingMultiYear || useYearAxisCombined;
        return {
            columns,
            data: dataOut,
            options: {
                ...baseOpts,
                focusTarget: "datum",
                tooltip: {
                    ...(baseOpts.tooltip || {}),
                    isHtml: true,
                    trigger: "focus",
                    showColorCode: !useWideCombined,
                },
            },
        };
    }

    /** טקסטים לפי מצב הטוגל של הגרף הראשי (כמות צינתורים) */
    private getMainChartTooltipPatchContext(): {
        isPctChart: boolean;
        multiYearValueSuffix: string;
        multiYearShowTotal: boolean;
        wingTooltipSubtitle?: string;
        wingTotalCaption?: string;
        yearAxisSubtitle?: string;
        yearAxisTitlePrefix?: string;
    } {
        const isPctChart =
            this.chartViewMode === "yoy-combined" ||
            (typeof (this.chartOptions as any)?.hAxis?.format === "string" &&
                (this.chartOptions as any).hAxis.format.includes("%"));

        if (isPctChart) {
            return {
                isPctChart: true,
                multiYearValueSuffix: "",
                multiYearShowTotal: false,
            };
        }

        switch (this.chartViewMode) {
            case "department":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: true,
                    wingTooltipSubtitle: "מספר צינתורים לפי שנה במחלקה המאוגדת",
                    wingTotalCaption: "סה״כ צינתורים בכל השנים במחלקה זו",
                };
            case "year-total":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: false,
                    yearAxisSubtitle: "סה״כ צינתורים בשנה זו",
                };
            case "site":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: false,
                    yearAxisSubtitle: "צינתורים לפי אתר בשנה זו (מוערם בגרף)",
                };
            case "shift":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: false,
                    yearAxisSubtitle: "צינתורים לפי משמרת בשנה זו (מוערם בגרף)",
                };
            case "fund":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: false,
                    yearAxisSubtitle:
                        "צינתורים לפי סוג מימון בשנה זו (מוערם בגרף או עמודות לפי סדרה)",
                };
            case "month":
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: true,
                    wingTooltipSubtitle:
                        "צינתורים לפי שנה בחודש זה (חודשי עתיד בשנה הנוכחית מוסתרים)",
                    wingTotalCaption: "סה״כ צינתורים בכל השנים בחודש זה",
                };
            default:
                return {
                    isPctChart: false,
                    multiYearValueSuffix: "צינתורים",
                    multiYearShowTotal: true,
                };
        }
    }

    /** כיתובי tooltip לגרף ניצול חדרים (פאנל ראשי) לפי טוגל המדד והתצוגה */
    private getRoomUtilizationTooltipPatchContext(): {
        multiYearValueSuffix: string;
        multiYearShowTotal: boolean;
        wingTooltipSubtitle?: string;
        wingTotalCaption?: string;
        yearAxisSubtitle?: string;
    } {
        const metricPhrase =
            this.roomStatsMetric === "open"
                ? "חדרים פתוחים"
                : this.roomStatsMetric === "close"
                  ? "חדרים סוגרים"
                  : this.roomStatsMetric === "fullDays"
                    ? "ימים מלאים (ללא פיצול)"
                    : "סה״כ חדרים (מצטבר)";
        if (this.roomStatsViewMode === "yearTotal") {
            return {
                multiYearValueSuffix: "",
                multiYearShowTotal: false,
                yearAxisSubtitle: `${metricPhrase} – ערך לשנה (ניצול חדר צינתור)`,
            };
        }
        return {
            multiYearValueSuffix: "",
            multiYearShowTotal: true,
            wingTooltipSubtitle: `${metricPhrase} לפי שנה (מחלקה מאוגדת)`,
            wingTotalCaption: `סה״כ ${metricPhrase} בכל השנים בשורה זו`,
        };
    }

    private applyClearTooltipsToGoogleChart(
        override?: Partial<{
            isPctChart: boolean;
            multiYearValueSuffix: string;
            multiYearShowTotal: boolean;
            wingTooltipSubtitle: string;
            wingTotalCaption: string;
            yearAxisSubtitle: string;
            yearAxisTitlePrefix: string;
            formatCell: (value: any, seriesLabel: string) => string;
        }>,
    ): void {
        if (
            (this.chartOptions as any)?.tooltip === "none" ||
            (this.chartOptions as any)?.tooltip?.trigger === "none"
        ) {
            return;
        }
        if (
            !this.chartColumns ||
            !this.chartData ||
            this.chartData.length === 0
        ) {
            return;
        }

        const base = this.getMainChartTooltipPatchContext();
        const p = this.patchGoogleChartHtmlTooltips(
            this.chartColumns,
            this.chartData,
            this.chartOptions,
            {
                ...base,
                ...override,
            },
        );
        this.chartColumns = p.columns;
        this.chartData = p.data;
        this.chartOptions = p.options;
    }

    /**
     * בודק אם יש פילטרים פעילים בדשבורד הצינתורים
     * (סוג צינתור / משמרת / חדר / מחלקה / יום)
     */
    hasActiveSurgeryFilters(): boolean {
        if (this.mainMetricMode === "compare-departments") {
            return false;
        }
        return (
            (this.selectedDiagnosis &&
                this.selectedDiagnosis !== "כל האתרים" &&
                this.selectedDiagnosis !== "אגף כירורגי") ||
            (this.selectedSurgeryTypes &&
                this.selectedSurgeryTypes.length > 0) ||
            (this.selectedShifts && this.selectedShifts.length > 0) ||
            (this.selectedRooms && this.selectedRooms.length > 0) ||
            (this.selectedDepartments && this.selectedDepartments.length > 0) ||
            (this.selectedWeekdays && this.selectedWeekdays.length > 0) ||
            (this.selectedSites && this.selectedSites.length > 0) ||
            this.morningWorkFilter !== "all" ||
            !!(this.chartDepartmentFilter && this.chartDepartmentFilter.trim())
        );
    }

    /** שורת תקופה: ינואר עד חודש גבול (כמו בשרת) — לכותרת גרף נפח צינתורים */
    showChartYtdPeriodLine(): boolean {
        return this.mainMetricMode === "surgery-volume";
    }

    /**
     * תאריך גבול התקופה כפי שמוצג בגרף — MM/YY (תואם limitMonth בשרת: עד סוף החודש שלפני החודש הנוכחי).
     */
    getHelpPeriodCutoffMmYy(): string {
        const now = new Date();
        const cal = now.getMonth();
        const y = now.getFullYear();
        const month1Based = cal === 0 ? 12 : cal;
        const year = cal === 0 ? y - 1 : y;
        const mm = String(month1Based).padStart(2, "0");
        const yy = String(year % 100).padStart(2, "0");
        return `${mm}/${yy}`;
    }

    /** רענון מלא: מנקה מטמונים וטוען מחדש מכל ה־APIs הרלוונטיים לדשבורד */
    refreshDashboardData(): void {
        this.countByDeptData = [];
        this.lastCountByDeptYear = null;
        this.monthlyCountsData = [];
        this.monthlyCountsLatestPeriod = null;
        this.lastMonthlyCountsParams = null;
        this.surgeriesPerDayDepRoomRaw = [];
        this.roomUtilizationRoomStatsRaw = [];
        this.lastSurgeriesPerDayYear = null;
        this.lastSurgeriesPerDayCacheKey = null;
        this.lastRoomUtilizationStatsCacheKey = null;
        this.clearRoomTimesServerCaches();
        this.loadCountByDept();
        this.loadMonthlyCounts();
        const hasMainDataset =
            this.surgeryData.length > 0 || this.departmentIncomeData.length > 0;
        /**
         * `loadDepartmentIncomeData` לא קורא לשרת; אם יש מאגר צינתורים/הכנסה בזיכרון — נשארים עליו,
         * אחרת מנקים ומסנכרנים לטבלה ריקה. שאר הרענון — GetCountByDept ו-APIs נלווים.
         */
        if (hasMainDataset) {
            this.loadDepartmentIncomeData(false);
        } else {
            this.loadDepartmentIncomeData(true);
        }
        if (this.mainMetricMode === "room-utilization") {
            if (this.roomUtilizationSubChart === "surgeriesPerDay") {
                this.loadSurgeriesPerDay();
            } else {
                this.loadRoomUtilizationMainChart();
            }
        }
        if (this.mainMetricMode === "room-times") {
            this.loadAvgDuration();
            this.loadAvgFirstMorningEntry();
            this.loadAvgLastMorningEnd();
            this.loadLossByWingPerDay();
            this.loadApprovedUtilizationPerDay();
            if (this.roomTimesView === "perDay") {
                this.loadSurgeriesPerDay();
            }
        }
        if (this.mainMetricMode === "compare-departments") {
            this.loadSurgeriesPerDay();
            this.loadAvgDuration();
        }
        this.snackBar.open("מרענן נתונים מהשרת…", "סגור", { duration: 2500 });
        this.cdr.detectChanges();
    }

    /** מאפס מטמוני API של מדדי זמנים / אבוד כדי שרענון יפגע בשרת מחדש */
    private clearRoomTimesServerCaches(): void {
        this.avgDurationFiveYearsRawByBaseYear.clear();
        this.lastAvgFirstMorningEntryParams = null;
        this.firstStartTimeChartData = [];
        this.lastAvgLastMorningEndParams = null;
        this.lastEndTimeRows = [];
        this.lossByWingYearRawByBaseYear.clear();
        this.approvedUtilizationRawByBaseYear.clear();
    }

    private updateColorsForYears(years: number[]): void {
        if (!years || years.length === 0) {
            this.chartOptions.colors =
                this.chartOptions.colors || this.yearPalette.slice(0, 2);
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
        years: number[],
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
        const pct = Math.round((diff / olderVal) * 100) + "%";
        return { diff, pct };
    }

    // מצב תצוגה מלאה לגרף הראשי
    showMainChartFullModal = false;

    openMainChartFullModal(): void {
        const utilizationSpd =
            this.mainMetricMode === "room-utilization" &&
            this.roomUtilizationSubChart === "surgeriesPerDay" &&
            this.surgeriesPerDayChartData &&
            this.surgeriesPerDayChartData.length > 0;
        if (utilizationSpd) {
            this.showMainChartFullModal = true;
            this.cdr.detectChanges();
            setTimeout(() => this.cdr.detectChanges(), 150);
            return;
        }
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
        year: number,
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

        const pct = Math.round((diff / olderVal) * 100) + "%";
        return { diff, pct };
    }

    /**
     * קובע את מחלקת הצבע לתא ספציפי בטבלה לפי כיוון השינוי.
     */
    getYearDiffClass(
        row: { perYear: { [year: number]: number }; isFuture?: boolean },
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
        this.isLoading = true;
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
                        ? ((dept.Income2025 - dept.Income2024) /
                              dept.Income2024) *
                          100
                        : 0,
                managerName: (dept as any).managerName,
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
    setChartViewMode(
        mode:
            | "year-total"
            | "fund"
            | "site"
            | "shift"
            | "department"
            | "month"
            | "yoy-combined",
    ): void {
        if (this.chartViewMode === mode && mode !== "yoy-combined") {
            // עבור רוב המצבים, אם כבר במצב הזה – אין מה לעשות
            return;
        }

        const leavingYoy =
            this.chartViewMode === "yoy-combined" && mode !== "yoy-combined";

        // leaving YoY combined: cleanup inline chart + שחזור Google Chart
        if (leavingYoy) {
            if (this.yoyCombinedInlineChart) {
                this.yoyCombinedInlineChart.destroy();
                this.yoyCombinedInlineChart = null;
            }
            this.restoreGoogleChartOptionsAfterYoy();
        }

        if (mode === "yoy-combined") {
            this.saveGoogleChartOptionsBeforeYoy();
        }

        this.chartViewMode = mode;
        this.isShiftGroupedView = mode === "shift";
        this.syncSidebarFilterDropdownOpenState();

        // מדד משולב = Chart.js; שאר המצבים = ColumnChart (Google)
        if (mode !== "yoy-combined" && this.chartType !== "LineChart") {
            this.chartType = "ColumnChart";
        }
        this.updateChartOptionsForType();

        // מצב חודשים / סה"כ לפי שנה תלויים ב‑GetMonthlyCounts
        if (
            this.chartViewMode === "month" ||
            this.chartViewMode === "year-total"
        ) {
            this.loadMonthlyCounts();
        } else if (this.chartViewMode === "yoy-combined") {
            this.loadDepartmentYoY();
        } else {
            this.updateChartData();
        }
        this.cdr.detectChanges();
        this.scheduleYoyCombinedInlineBuild();

        if (leavingYoy) {
            this.remountMainGoogleChartAfterYoy();
            return;
        }

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
     * לחיצה על "מדד משולב" – מצב תצוגה בלבד (הרחבה דרך כפתור fullscreen)
     */
    onYoyCombinedClick(): void {
        this.setChartViewMode("yoy-combined");
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
        if (this.mainMetricMode === "compare-departments") {
            return "השוואת מחלקות – צינתורים ליום בחדר";
        }
        if (this.mainMetricMode === "revenue") {
            return "הכנסות";
        }
        if (this.mainMetricMode === "cancellations") {
            return "ביטולי צינתורים";
        }
        if (this.mainMetricMode === "room-utilization") {
            if (this.roomUtilizationSubChart === "surgeriesPerDay") {
                return "ממוצע צינתורים ליום בחדר לפי מחלקה";
            }
            if (this.roomStatsViewMode === "yearTotal") {
                switch (this.roomStatsMetric) {
                    case "open":
                        return "סיכום ימי פתיחת חדר (ראשון בוקר) לפי שנה";
                    case "close":
                        return "סיכום ימי סגירת חדר (אחרון בוקר) לפי שנה";
                    case "fullDays":
                        return "סיכום ימים ללא פיצול לפי שנה";
                    case "total":
                    default:
                        return "סיכום חדרים שונים (מצטבר ממחלקות) לפי שנה";
                }
            }
            switch (this.roomStatsMetric) {
                case "open":
                    return "חדרים פותחים לפי מחלקה ושנה";
                case "close":
                    return "חדרים סוגרים לפי מחלקה ושנה";
                case "fullDays":
                    return "ימים מלאים (ללא פיצול) לפי מחלקה ושנה";
                case "total":
                default:
                    return "סה״כ חדרים לפי מחלקה ושנה";
            }
        }
        if (this.mainMetricMode === "room-times") {
            switch (this.roomTimesView) {
                case "avgDuration":
                    return "משך צינתור ממוצע לפי מחלקה מאוגדת (Wing)";
                case "firstStart":
                    return "זמן כניסה ממוצע של צינתור ראשון בבוקר לפי מחלקה";
                case "lastEnd":
                    return "זמן סיום ממוצע של הצינתור האחרון לפי מחלקה";
                case "perDay":
                    return "ממוצע צינתורים ליום בחדר לפי מחלקה";
                case "lossPerDay":
                    return "זמן אבוד ליום לפי מחלקה";
                case "approvedPerDay":
                    return "זמן מנוצל ליום לפי מחלקה";
                default:
                    return "זמני חדר צינתור לפי מחלקה";
            }
        }
        switch (this.chartViewMode) {
            case "year-total":
                return 'סה"כ צינתורים לפי שנה';
            case "department":
                return 'סה"כ צינתורים לפי מחלקה';
            case "site":
                return 'סה"כ צינתורים לפי אתר';
            case "shift":
                return 'סה"כ צינתורים לפי משמרת';
            case "fund":
                return 'סה"כ צינתורים לפי סוג מימון';
            case "month":
                return "צינתורים לפי חודשים (5 שנים אחרונות)";
            case "yoy-combined":
                return "מדד משולב – השוואה לשנה שעברה (%)";
            default:
                return 'סה"כ צינתורים';
        }
    }

    /**
     * חודש עברי: סוף חלון התקופה בתיאור למשתמש (תואם limitMonth בשרת — עד סוף החודש שקדם לחודש הנוכחי).
     */
    getHelpPeriodCutoffMonthLabel(): string {
        const cal = new Date().getMonth();
        const limit1 = cal === 0 ? 12 : cal;
        const names = [
            "",
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
        return names[limit1] || "";
    }

    /** MM/YY של סוף התקופה לפי נתוני GetMonthlyCounts (לא לפי תאריך מקומי) */
    getMonthlyCountsPeriodMmYy(): string {
        const p = this.monthlyCountsLatestPeriod;
        if (!p) {
            return "\u2026";
        }
        const mm = String(p.month).padStart(2, "0");
        const yy = String(p.year % 100).padStart(2, "0");
        return `${mm}/${yy}`;
    }

    /** שם חודש עברי לפי `monthlyCountsLatestPeriod` */
    getMonthlyCountsPeriodMonthLabel(): string {
        const p = this.monthlyCountsLatestPeriod;
        const names = [
            "",
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
        if (!p) {
            return "\u2026";
        }
        return names[p.month] || "\u2026";
    }

    /**
     * טקסט קצר לחלון (?) — ניצולת חדר (מדדי חדרים), באותו סגנון כמו שאר הגרפים.
     */
    getRoomUtilizationChartHelpPopupText(): string {
        if (
            this.mainMetricMode !== "room-utilization" ||
            this.roomUtilizationSubChart === "surgeriesPerDay"
        ) {
            return "";
        }
        const m = this.getHelpPeriodCutoffMonthLabel();
        const byYear = this.roomStatsViewMode === "yearTotal";
        const what = byYear
            ? 'סיכום לפי שנה — כל עמודה מייצגת שנה; הערך משקף את סוג המדד שבחרת (פתיחות בוקר, סגירות, ימים מלאים או סה"כ לפי דיווח).'
            : "מחלקה בכל שורה ושנים בצבעים שונים — ניתן להשוות בין מחלקות ולבין שנים על אותו מדד ניצולת.";

        let how: string;
        switch (this.roomStatsMetric) {
            case "open":
                how =
                    "נספרים ימי עבודה שבהם נרשמה לפחות פעם אחת «פתיחת בוקר» בחדר (אין כאן נטו ספירת חדרים פיזיים).";
                break;
            case "close":
                how =
                    "נספרים ימי עבודה שבהם נרשם «סיום בוקר» בחדר — מתאים למעקב אחר ימים שנסגרו מבחינת משמרת הבוקר.";
                break;
            case "fullDays":
                how =
                    "נספרים ימים שבהם אין בנתונים סימון «פיצול יום», כלומר יום שנחשב יום מלא לחדר.";
                break;
            case "total":
            default:
                how =
                    "סיכום חדרי־יום לפי דיווח המערכת; אותו חדר שמקושר לשתי מחלקות עלול להופיע פעמיים (פעם לכל מחלקה).";
                break;
        }

        return (
            "מה מראה?\n" +
            what +
            "\n\nאיך מחושב?\n" +
            how +
            "\n\nתקופה מקבילה: לרוב עד סוף " +
            m +
            " בכל שנה, לפי אותם כללים כמו בגורמים אחרים בדשבורד, לפי השאילתה בשרת למדד זה.\n\n" +
            "סינון: בעיקר האגף / האתר שבחרת בראש המסך."
        );
    }

    /**
     * הסבר לחלון (?): מה מסמל הגרף ואיך הוא מחושב — לכל מצבי הדשבורד הראשי.
     */
    getMainChartHelpPopupText(): string {
        const m = this.getHelpPeriodCutoffMonthLabel();
        if (this.mainMetricMode === "revenue") {
            return (
                "מה מראה?\n" +
                "תצוגת הכנסות / היקף כספי לפי מחלקות או ישויות אחרות — תופעל כשיוזן מקור נתוני הכנסות לשירות.\n\n" +
                "איך מחושב?\n" +
                "טרם חובר מנוע חישוב להכנסות בדשבורד זה; לאחר החיבור יוצג כאן נוסחת החישוב המדויקת (למשל לפי שנה או לפי תקופה מקבילה)."
            );
        }
        if (this.mainMetricMode === "cancellations") {
            return (
                "מה מראה?\n" +
                "תצוגת ביטולי צינתורים — ספירות/מגמות לפי מחלקה או תקופה, לאחר שיחובר מקור הנתונים.\n\n" +
                "איך מחושב?\n" +
                "טרם הוגדרה שאילתת שרת לביטולים; לאחר החיבור יוצגו כאן כללי הסינון והאגרגציה."
            );
        }
        if (this.mainMetricMode === "compare-departments") {
            return (
                "מה מראה?\n" +
                "השוואת מחלקות: צינתורים ליום בחדר, מספר חדרים/מדדי עומס נלווים וכו׳ — לפי המחלקה והשנים שבחרת במסך ההשוואה.\n\n" +
                "איך מחושב?\n" +
                "לכל שנה ומחלקה הנתונים מגיעים מהשרת, בדרך־כלל על בסיס ימי עבודה «מלאים» (ללא חלוקת יום), בתקופה המקבילה עד סוף " +
                m +
                ", בהתאם למדדים שהפעלת שם.\n\n" +
                "סינון: כפי שמוגדר במסך ההשוואה ובאגף/אתר."
            );
        }
        if (this.mainMetricMode === "room-utilization") {
            if (this.roomUtilizationSubChart === "surgeriesPerDay") {
                return (
                    "מה מראה?\n" +
                    "כמות צינתורים שנתית (YTD) באופן יחסי לחדר — מחלקה בעמודה, שנה בצבע.\n\n" +
                    "איך מחושב?\n" +
                    'סה"כ צינתורים מתחילת השנה עד סוף ' +
                    m +
                    " חלקי מספר חדר־יום מלאים (ללא פיצול), רק בימים שבהם המחלקה עבדה בחדר יום מלא.\n\n" +
                    "הערה: שאר פילטרי הסיידבר לרוב לא נשלחים ל־API של גרף זה; ראו גם את שורת ההקשר מתחת לכותרת."
                );
            }
            const roomStatsHelp = this.getRoomUtilizationChartHelpPopupText();
            if (roomStatsHelp) {
                return roomStatsHelp;
            }
        }
        if (this.mainMetricMode === "room-times") {
            return this.getRoomTimesChartHelpPopupText();
        }
        return this.getSurgeryVolumeChartHelpPopupText();
    }

    /** הסבר למודאל «משך ממוצע – מקורי מול השוואה» */
    getAvgDurationCompareModalHelpPopupText(): string {
        const m = this.getHelpPeriodCutoffMonthLabel();
        return (
            "מה מראה?\n" +
            "משך צינתור ממוצע בדקות — שתי סדרות (ערך מקורי מול ערך השוואה) לפי שנה.\n\n" +
            "איך מחושב?\n" +
            "ממוצע משך כל הצינתורים הרלוונטיים בתקופה המקבילה עד סוף " +
            m +
            " בכל שנה; בתווית מעל העמודות מוצג גם פירוט בשעות:דקות.\n\n" +
            "סינון: לפי מה שהוגדר בדשבורד לפני פתיחת החלון."
        );
    }

    private getRoomTimesChartHelpPopupText(): string {
        const m = this.getHelpPeriodCutoffMonthLabel();
        const tail =
            "\n\nסינון: לפי מה שסימנת בחלון הסינון המתקדם ובכפתור הסינון בראש המסך; חלק מהמדדים מצמצמים את השאילתה (בוקר / אמצע שבוע וכו׳).";
        switch (this.roomTimesView) {
            case "avgDuration":
                return (
                    "מה מראה?\n" +
                    "משך צינתור ממוצע בדקות — כל שורה היא מחלקה (או ישות דומה), וכל צבע הוא שנה.\n\n" +
                    "איך מחושב?\n" +
                    "ממוצע אריתמטי של משכי הצינתורים שנכללו בפילטר, לתקופה המקבילה עד סוף " +
                    m +
                    " בכל שנה." +
                    tail
                );
            case "firstStart":
                return (
                    "מה מראה?\n" +
                    "שעת כניסה ממוצעת לצינתור הראשון בבוקר — לפי מחלקה ושנה.\n\n" +
                    "איך מחושב?\n" +
                    "ממוצע שעת הכניסה שנרשמה לצינתור הראשון ביום, לתקופה מקבילה עד סוף " +
                    m +
                    "." +
                    tail
                );
            case "lastEnd":
                return (
                    "מה מראה?\n" +
                    "שעת סיום ממוצעת לצינתור האחרון בבוקר — לפי מחלקה ושנה.\n\n" +
                    "איך מחושב?\n" +
                    "ממוצע שעת הסיום האחרונה במשמרת הבוקר, לתקופה מקבילה עד סוף " +
                    m +
                    "." +
                    tail
                );
            case "perDay":
                return (
                    "מה מראה?\n" +
                    "ממוצע צינתורים ליום בחדר — עומס יומי יחסי.\n\n" +
                    "איך מחושב?\n" +
                    "בשאילתת השרת לרוב אמצע שבוע, משמרת בוקר ועבודת בוקר; ממוצע יומי לתקופה מקבילה עד סוף " +
                    m +
                    "." +
                    tail
                );
            case "lossPerDay":
                return (
                    "מה מראה?\n" +
                    "זמן אבוד משוער ליום עבודה בחדר — הפרש בין זמן חדר «אידיאלי» לבין זמן בשימוש בפועל.\n\n" +
                    "איך מחושב?\n" +
                    "נגזר מה־API של זמן אבוד לשנה בסיס; סינון אתר/מחלקה מתבצע בצד הלקוח לאחר קבלת הנתונים." +
                    tail
                );
            case "approvedPerDay":
                return (
                    "מה מראה?\n" +
                    "זמן מנוצל ממוצע ליום — כמה מזמן החדר נוצל בפועל ביחס ליום עבודה.\n\n" +
                    "איך מחושב?\n" +
                    "ממוצע ליום לפי שנה בסיס בתשובת השרת, לתקופה מקבילה עד סוף " +
                    m +
                    "; פירוט המדד המדויק תואם את הגדרות השירות." +
                    tail
                );
            default:
                return (
                    "מה מראה?\n" +
                    "מדדי זמן ועומס בחדרי צינתור — בחר את סוג המדד מהרשימה.\n\n" +
                    "איך מחושב?\n" +
                    "לפי סוג המדד שנבחר ולתקופה מקבילה עד סוף " +
                    m +
                    ", עם הפילטרים הפעילים בדשבורד." +
                    tail
                );
        }
    }

    private getSurgeryVolumeChartHelpPopupText(): string {
        const m = this.getHelpPeriodCutoffMonthLabel();
        const fil =
            "\n\nסינון: נספרים רק צינתורים שעומדים בכל תנאי הסינון מהסרגל ומחלון הסינון המתקדם (אגף, סוג צינתור, חדר, יום בשבוע וכו׳).";
        switch (this.chartViewMode) {
            case "year-total":
                return (
                    "מה מראה?\n" +
                    'סה"כ צינתורים בכל שנה — טור או נקודה לכל שנה בתצוגת הגרף.\n\n' +
                    "איך מחושב?\n" +
                    "ספירת כל הרשומות הרלוונטיות מתחילת ינואר ועד סוף " +
                    m +
                    " בכל שנה (תקופה מקבילה בין השנים, כדי שההשוואה תהיה הוגנת)." +
                    fil
                );
            case "department":
                return (
                    "מה מראה?\n" +
                    "כמה צינתורים לפי מחלקה (או ציר לוגי דומה) ולפי שנה — מאפשר לראות מחלקות כבדות יחסית לאורך זמן.\n\n" +
                    "איך מחושב?\n" +
                    'אותה ספירת צינתורים כמו במצב סה"כ שנתי, אך מפורקת לפי עמודת המחלקה בנתונים, לתקופה עד סוף ' +
                    m +
                    "." +
                    fil
                );
            case "site":
                return (
                    "מה מראה?\n" +
                    "חלוקת צינתורים לפי אתר / אגף — השוואה בין ישויות גאוגרפיות־ארגוניות.\n\n" +
                    "איך מחושב?\n" +
                    "ספירה לפי שדה האתר/אגף ברשומת הצינתור, לתקופה מקבילה עד סוף " +
                    m +
                    "." +
                    fil
                );
            case "shift":
                return (
                    "מה מראה?\n" +
                    "חלוקה לפי משמרת (בוקר / צהריים / לילה וכו׳ לפי הקידוד בנתונים).\n\n" +
                    "איך מחושב?\n" +
                    "ספירה לפי משמרת מדווחת לצינתור, לתקופה עד סוף " +
                    m +
                    "; בתצוגת פיצול משמרות בגרף חלק מהסינון הכללי מוטמע בעמודות." +
                    fil
                );
            case "fund":
                return (
                    "מה מראה?\n" +
                    "חלוקת צינתורים לפי סוג מימון (ציבורי / מבטח / אחר — לפי מיפוי השרת).\n\n" +
                    "איך מחושב?\n" +
                    "ספירה לפי קטגוריית המימון של הרשומה, לתקופה מקבילה עד סוף " +
                    m +
                    "." +
                    fil
                );
            case "month":
                return (
                    "מה מראה?\n" +
                    "נפח צינתורים לפי חודש — כל חודש מוצג מול אותו חודש בשנים קודמות.\n\n" +
                    "איך מחושב?\n" +
                    "לכל חודש נספרים צינתורים מתחילת השנה העדכנית ועד חודש הגבול " +
                    m +
                    " (ובשנים אחרות באותה לוגיקת חודש), כך שהגרף משווה חודשים מקבילים." +
                    fil
                );
            case "yoy-combined":
                return (
                    "מה מראה?\n" +
                    "מדד משולב: אחוז שינוי לעומת אותה תקופה בשנה הקודמת — לפי מחלקה.\n\n" +
                    "איך מחושב?\n" +
                    "השרת מחזיר מדדי צינתורים/זמן/הכנסה לשנה נוכחית ולשנה קודמת; מחושב אחוז שינוי בין התקופות המקבילות, לא סכימה גולמית של כל השנה."
                );
            default:
                return (
                    "מה מראה?\n" +
                    "כמות צינתורים — תצוגת ברירת המחדל של נפח הפעילות.\n\n" +
                    "איך מחושב?\n" +
                    "ספירת צינתורים לתקופה המקבילה עד סוף " +
                    m +
                    " בכל שנה המוצגת בגרף." +
                    fil
                );
        }
    }

    /**
     * האם להציג את בלוק הכותרת מעל הגרף — כולל זמני חדר שאינם משתמשים ב־chartData.
     */
    shouldShowChartModeHeading(): boolean {
        if (this.isMainDataLoading) {
            return false;
        }
        if (this.mainMetricMode === "compare-departments") {
            return true;
        }
        if (this.mainMetricMode === "revenue") {
            return true;
        }
        if (this.mainMetricMode === "cancellations") {
            return true;
        }
        if (this.mainMetricMode === "room-times") {
            return (
                this.isRoomTimesChartLoading() || this.hasRoomTimesChartData()
            );
        }
        if (this.mainMetricMode === "room-utilization") {
            if (this.roomUtilizationSubChart === "surgeriesPerDay") {
                return (
                    this.isSurgeriesPerDayLoading ||
                    !!(
                        this.surgeriesPerDayChartData &&
                        this.surgeriesPerDayChartData.length > 0
                    )
                );
            }
            return (
                this.isChartLoading ||
                !!(this.chartData && this.chartData.length > 0)
            );
        }
        if (this.chartViewMode === "yoy-combined") {
            return (
                this.isChartLoading ||
                this.getFilteredDepartmentYoyData().length > 0
            );
        }
        return (
            this.isChartLoading ||
            !!(this.chartData && this.chartData.length > 0)
        );
    }

    private isRoomTimesChartLoading(): boolean {
        return (
            this.isAvgDurationLoading ||
            this.isFirstStartTimeLoading ||
            this.isLastEndTimeLoading ||
            this.isSurgeriesPerDayLoading ||
            this.isLossByWingLoading ||
            this.isApprovedUtilizationLoading
        );
    }

    private hasRoomTimesChartData(): boolean {
        switch (this.roomTimesView) {
            case "avgDuration":
                return !!(
                    this.avgDurationChartData &&
                    this.avgDurationChartData.length > 0
                );
            case "perDay":
                return !!(
                    this.surgeriesPerDayChartData &&
                    this.surgeriesPerDayChartData.length > 0
                );
            case "firstStart":
                return !!(
                    this.firstStartTimeChartData &&
                    this.firstStartTimeChartData.length > 0
                );
            case "lastEnd":
                return !!(
                    this.lastEndTimeChartData &&
                    this.lastEndTimeChartData.length > 0
                );
            case "lossPerDay":
                return !!(
                    this.lossByWingChartData &&
                    this.lossByWingChartData.length > 0
                );
            case "approvedPerDay":
                return !!(
                    this.approvedUtilizationChartData &&
                    this.approvedUtilizationChartData.length > 0
                );
            default:
                return false;
        }
    }

    /** אתר / אגף כפי שנספר בגרף (סיידבר) */
    getSiteChartContextLine(): string {
        if (this.sidebarFiltersNonApplicableForRoomCharts()) {
            return "היקף קבוע בשרת: משמרת בוקר, אמצע שבוע, חדר צינתור כללי — ללא סינון מהסיידבר.";
        }
        if (this.selectedSites && this.selectedSites.length > 0) {
            return `אתר (סיידבר): ${this.selectedSites.join(", ")}`;
        }
        if (this.selectedDiagnosis && this.selectedDiagnosis !== "כל האתרים") {
            return `אגף / אתר ראשי: ${this.selectedDiagnosis}`;
        }
        return "אתר: כל האתרים (ללא סינון אתר)";
    }

    /**
     * פירוט פרמטרים וסינונים בפועל — כדי שהמשתמש יבין מה נכנס לגרף בלי לשאול את המתכנת.
     */
    getChartViewFilterParametersLine(): string {
        if (this.mainMetricMode === "compare-departments") {
            return (
                "בחירת מחלקה ומדדים בפאנל הגרף בלבד. פילטרי הסיידבר אינם משפיעים על גרף ההשוואה — אגרגציה מלאה לפי מחלקה; " +
                "מדדי חדרים וצינתורים ליום מבוססים על ימים «מלאים»."
            );
        }
        if (this.mainMetricMode === "revenue") {
            return "כרגע אין שאילתת נתונים להכנסות; פילטרי הסיידבר יחולו כשיתווסף חיבור לשרת.";
        }
        if (this.mainMetricMode === "cancellations") {
            return "תצוגת ביטולים — טרם חובר מקור נתונים; פילטרי הסיידבר יחולו לאחר החיבור.";
        }
        if (this.mainMetricMode === "room-utilization") {
            return this.getSiteChartContextLine();
        }

        if (this.mainMetricMode === "room-times") {
            const base = this.getSiteChartContextLine();
            if (
                this.roomTimesView === "lastEnd" &&
                this.lastEndTimeExcludeOverflowDays
            ) {
                return `${base} מצב תצוגה: ממוצע ללא ימי «גלישה» מאוחרת (אחרי 15:00).`;
            }
            return base;
        }

        if (this.chartViewMode === "yoy-combined") {
            return "המדד המשולב נטען מהשרת ללא פרמטרי הסיידבר; הצגה לפי מחלקה.";
        }
        if (this.chartViewMode === "month") {
            return "צינתורים לפי חודשים: נטען מהשרת ללא סינון מתקדם מהסיידבר (היקף מלא).";
        }

        const parts: string[] = [
            this.getSiteChartContextLine(),
            this.getSurgeryTypeDisplay(),
        ];
        if (!(this.isShiftGroupedView && this.chartViewMode === "shift")) {
            parts.push(this.getShiftDisplay());
        } else {
            parts.push("משמרת: מוצגת כפיצול בעמודות הגרף");
        }
        parts.push(
            this.getRoomDisplay(),
            this.getDepartmentDisplay(),
            this.getWeekdayDisplay(),
            this.getMorningWorkDisplay(),
        );
        if (this.chartDepartmentFilter) {
            parts.push(`מחלקה בגרף: ${this.chartDepartmentFilter}`);
        }
        return "סינון פעיל על הנתונים: " + parts.join(" · ");
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
    getChartViewTooltip(
        mode:
            | "year-total"
            | "fund"
            | "site"
            | "shift"
            | "department"
            | "month"
            | "yoy-combined",
    ): string {
        switch (mode) {
            case "year-total":
                return "כמות צינתורים לכל שנה";
            case "department":
                return "השוואת מחלקות מהגבוה לנמוך";
            case "site":
                return "פיזור צינתורים לפי אתר";
            case "shift":
                return "פיזור צינתורים לפי משמרת";
            case "fund":
                return "פיזור צינתורים לפי סוג מימון";
            case "month":
                return "השוואת צינתורים לפי חודשים ולפי שנה";
            case "yoy-combined":
                return "אחוז שינוי לעומת אותה תקופה בשנה שעברה – צינתורים לחדר, זמן צינתור, הכנסה ממוצעת";
            default:
                return "";
        }
    }

    /** האם מצב התצוגה הנוכחי הוא ניצולת חדר צינתור (צינתורים ליום בחדר) */
    isRoomUtilizationMode(): boolean {
        return this.mainMetricMode === "room-utilization";
    }

    /**
     * במצבי ניצולת חדר וזמני חדר — פילטרי הסיידבר אינם משפיעים; החישוב בשרת לפי בוקר, אמצע שבוע וחדר צינתור כללי.
     */
    sidebarFiltersNonApplicableForRoomCharts(): boolean {
        return (
            this.mainMetricMode === "room-utilization" ||
            this.mainMetricMode === "room-times"
        );
    }

    /** מדדי צינתורים — תצוגת «צינתורים לפי חודשים»: פילטרי הסיידבר אינם משפיעים על הגרף */
    /** פילטרי הסיידבר מושבתים ב-UI (זמני/ניצולת חדר, או השוואת מחלקות — שם הגרף לא מסונן מהסיידבר) */
    sidebarAdvancedFiltersDisabledForCurrentChart(): boolean {
        return (
            this.sidebarFiltersNonApplicableForRoomCharts() ||
            this.mainMetricMode === "compare-departments"
        );
    }

    /** ערך הטוגל העליון (מתאים ל־mat-button-toggle-group) */
    mainMetricToggleGroupValue(): string {
        switch (this.mainMetricMode) {
            case "room-utilization":
                return "utilization";
            case "room-times":
                return "duration";
            case "revenue":
                return "revenue";
            case "cancellations":
                return "cancellations";
            case "compare-departments":
                return "compare-departments";
            case "surgery-volume":
            default:
                return "count";
        }
    }

    /** החלפת מצב המדד הראשי לפי כפתורי הטוגל מעל הגרף */
    onMainMetricToggle(value: string): void {
        if (value !== "compare-departments") {
            this.showCompareDepartmentsModal = false;
        }
        if (value === "utilization") {
            this.mainMetricMode = "room-utilization";
            this.roomUtilizationSubChart = "roomStats";
            this.updateChartData();
        } else if (value === "duration") {
            this.mainMetricMode = "room-times";
            // טוען נתוני זמני צינתור (משך) אם טרם נטענו או אם הפילטרים השתנו
            this.loadAvgDuration();
        } else if (value === "count") {
            this.mainMetricMode = "surgery-volume";
            this.updateChartData();
        } else if (value === "revenue") {
            this.mainMetricMode = "revenue";
        } else if (value === "cancellations") {
            this.mainMetricMode = "cancellations";
        } else if (value === "compare-departments") {
            this.enterCompareDepartmentsPanel();
        }
        this.syncSidebarFilterDropdownOpenState();
    }

    /** מסך השוואת מחלקות פעיל — בתוך הפאנל הראשי או במודאל מוגדל */
    isCompareDepartmentsViewActive(): boolean {
        return (
            this.mainMetricMode === "compare-departments" ||
            this.showCompareDepartmentsModal
        );
    }

    private initializeCompareDepartmentsSession(): void {
        this.roomTimesView = "perDay";
        this.compareDepartmentSelected = null;
        this.compareSurgeryTypesSelected = [];
        this.loadSurgeriesPerDay();
        this.loadAvgDuration();
        if (!this.countByDeptData || this.countByDeptData.length === 0) {
            this.loadCountByDept();
        }
        this.initializeCompareDepartmentDefaults();
        this.refreshCompareDepartmentsLineChart();
    }

    /**
     * כניסה למצב השוואת מחלקות: קודם נפתח המודאל הגדול;
     * אחרי שסוגרים אותו נשארת התצוגה הקטנה בפאנל הגרף.
     */
    enterCompareDepartmentsPanel(): void {
        this.mainMetricMode = "compare-departments";
        this.showCompareDepartmentsModal = true;
        this.initializeCompareDepartmentsSession();
        this.scheduleCompareDeptChartRelayout();
    }

    /** מודאל מלא מעל אותו תוכן (כמו «הרחב מסך» בגרפים אחרים) */
    openCompareDepartmentsFullscreen(): void {
        this.showCompareDepartmentsModal = true;
        this.cdr.detectChanges();
        setTimeout(() => this.cdr.detectChanges(), 150);
        this.scheduleCompareDeptChartRelayout();
    }

    closeCompareDepartmentsModal(): void {
        this.showCompareDepartmentsModal = false;
        this.closeCompareMetricsDropdown();
        this.closeCompareSurgeryTypesDropdown();
    }

    /**
     * ספינר מודאל השוואת מחלקות: צינתורים ליום בחדר, ממוצע שנתי, ו-GetDepRoomFiveYears כשמסומן «צינתורים לחדר».
     */
    /** שורת הגרף בהשוואת מחלקות (מדדים נבחרו ויש נתונים) — לתבנית ולפאנל טבלה */
    showCompareDepartmentsChartRow(): boolean {
        const dep = (this.compareDepartmentSelected || "").trim();
        if (!dep) {
            return false;
        }
        if (this.compareDepartmentsModalChartLoading()) {
            return false;
        }
        if (this.compareDepartmentsAwaitingMetricSelection) {
            return false;
        }
        const data = this.compareDepartmentsLineChartData;
        return !!(data && data.length > 0);
    }

    compareDepartmentsModalChartLoading(): boolean {
        if (
            !this.isCompareDepartmentsViewActive() ||
            !this.compareDepartmentSelected
        ) {
            return false;
        }
        if (this.isSurgeriesPerDayLoading) {
            return true;
        }
        const baseY = this.getBaseYearForRoomTimes();
        const needsYearly =
            this.compareShowAvgDurationPerYear ||
            (this.compareShowTypeAvgDurationPerYear &&
                this.compareSurgeryTypesSelected.length > 0);
        if (
            needsYearly &&
            !this.compareAvgDurationYearlyRawByBaseYear.has(baseY) &&
            this.isCompareAvgDurationYearlyLoading
        ) {
            return true;
        }
        if (
            this.compareShowSurgeriesPerRoom &&
            !this.compareDepRoomRawByBaseYear.has(baseY) &&
            this.isCompareDepRoomLoading
        ) {
            return true;
        }
        return false;
    }

    /**
     * טוען פעם אחת לכל baseYear את GetAvgDurationYearlyFiveYears_pci_dashborad (מטמון מקומי).
     */
    private ensureCompareAvgDurationYearlyLoaded(): void {
        const baseYear = this.getBaseYearForRoomTimes();
        if (this.compareAvgDurationYearlyRawByBaseYear.has(baseYear)) {
            return;
        }
        if (this.compareAvgDurationYearlyFetchInFlight) {
            return;
        }
        this.compareAvgDurationYearlyFetchInFlight = true;
        this.isCompareAvgDurationYearlyLoading = true;
        this.cdr.detectChanges();

        this.asmxGet(
                environment.url +
                    "GetAvgDurationYearlyFiveYears_pci_dashborad",
                {
                    params: { baseYear },
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    this.compareAvgDurationYearlyRawByBaseYear.set(
                        baseYear,
                        list,
                    );
                    this.compareAvgDurationYearlyFetchInFlight = false;
                    this.isCompareAvgDurationYearlyLoading = false;
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
                (err) => {
                    console.error(
                        "GetAvgDurationYearlyFiveYears_pci_dashborad:",
                        err,
                    );
                    this.compareAvgDurationYearlyRawByBaseYear.set(
                        baseYear,
                        [],
                    );
                    this.compareAvgDurationYearlyFetchInFlight = false;
                    this.isCompareAvgDurationYearlyLoading = false;
                    this.snackBar.open(
                        "❌ שגיאה בטעינת ממוצע משך צינתור (מודאל השוואה)",
                        "סגור",
                        { duration: 4000 },
                    );
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
            );
    }

    /**
     * טוען פעם אחת לכל baseYear את GetDepRoomFiveYears_pci_dashborad (מטמון — סדרת צינתורים לחדר במודאל השוואה).
     */
    private ensureCompareDepRoomLoaded(): void {
        const baseYear = this.getBaseYearForRoomTimes();
        if (this.compareDepRoomRawByBaseYear.has(baseYear)) {
            return;
        }
        if (this.compareDepRoomFetchInFlight) {
            return;
        }
        this.compareDepRoomFetchInFlight = true;
        this.isCompareDepRoomLoading = true;
        this.cdr.detectChanges();

        this.asmxGet(
                environment.url + "GetDepRoomFiveYears_pci_dashborad",
                {
                    params: { baseYear },
                },
            )
            .subscribe(
                (response) => {
                    const list =
                        this.parseDepRoomFiveYearsApiResponse(response);
                    this.compareDepRoomRawByBaseYear.set(baseYear, list);
                    this.compareDepRoomFetchInFlight = false;
                    this.isCompareDepRoomLoading = false;
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
                (err) => {
                    console.error(
                        "GetDepRoomFiveYears_pci_dashborad:",
                        err,
                    );
                    this.compareDepRoomRawByBaseYear.set(baseYear, []);
                    this.compareDepRoomFetchInFlight = false;
                    this.isCompareDepRoomLoading = false;
                    this.snackBar.open(
                        "❌ שגיאה בטעינת צינתורים לחדר (מודאל השוואה)",
                        "סגור",
                        { duration: 4000 },
                    );
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
            );
    }

    private readDepRoomNumber(
        row: Record<string, unknown>,
        ...keys: string[]
    ): number | null {
        for (const k of keys) {
            const v = row[k];
            if (v == null || v === "") {
                continue;
            }
            const n = Number(v);
            if (Number.isFinite(n)) {
                return n;
            }
        }
        return null;
    }

    /**
     * צינתורים ליום פתיחת חדר לפי שנה — רק ימים ללא פיצול (GetDepRoomFiveYears); אגרגציה על אתרים.
     */
    private buildCompareSurgeriesPerRoomByYearFromDepRoom(
        dep: string,
        baseYearKey: string,
    ): Map<number, number> {
        const list = this.compareDepRoomRawByBaseYear.get(baseYearKey) || [];
        let rows = list.filter(
            (r) => (r.Wing || "").trim() === (dep || "").trim(),
        );
        if (this.avgDurationSiteFilter !== "ALL") {
            rows = rows.filter(
                (r) => (r.Site || "").trim() === this.avgDurationSiteFilter,
            );
        }

        type Acc = {
            sumSurg: number;
            sumOpen: number;
            sumWeightedAvg: number;
            weight: number;
            avgOnlySum: number;
            avgOnlyN: number;
        };
        const acc = new Map<number, Acc>();

        for (const r of rows) {
            const raw = r as unknown as Record<string, unknown>;
            const yRaw = raw["Year"] ?? raw["year"];
            const y = Number(yRaw);
            if (!Number.isFinite(y)) {
                continue;
            }

            const surg =
                this.readDepRoomNumber(raw, "Surgeries", "surgeries") ?? 0;
            const open =
                this.readDepRoomNumber(raw, "RoomsOpenDays", "roomsOpenDays") ??
                this.readDepRoomNumber(
                    raw,
                    "WorkDays",
                    "workDays",
                    "work_days",
                ) ??
                0;
            const avgPod = this.readDepRoomNumber(
                raw,
                "AvgSurgeriesPerOpenRoomDay",
                "avgSurgeriesPerOpenRoomDay",
            );

            const p = acc.get(y) || {
                sumSurg: 0,
                sumOpen: 0,
                sumWeightedAvg: 0,
                weight: 0,
                avgOnlySum: 0,
                avgOnlyN: 0,
            };
            p.sumSurg += surg;
            p.sumOpen += open;
            if (open > 0 && avgPod != null) {
                p.sumWeightedAvg += avgPod * open;
                p.weight += open;
            }
            if (avgPod != null) {
                p.avgOnlySum += avgPod;
                p.avgOnlyN += 1;
            }
            acc.set(y, p);
        }

        const out = new Map<number, number>();
        acc.forEach((p, y) => {
            let v: number | null = null;
            if (p.sumOpen > 0) {
                v = p.sumSurg / p.sumOpen;
            } else if (p.weight > 0) {
                v = p.sumWeightedAvg / p.weight;
            } else if (p.avgOnlyN > 0) {
                v = p.avgOnlySum / p.avgOnlyN;
            }
            if (v != null && Number.isFinite(v)) {
                out.set(y, v);
            }
        });
        return out;
    }

    /**
     * ממוצע משך לפי שנה מה-API השנתי — כל הסוגים (ללא unifiedSurgeryType) או סוג מאוחד בודד.
     */
    private buildCompareAvgDurationByYearFromYearlyApi(
        dep: string,
        baseYearKey: string,
        unifiedSurgeryType?: string | null,
    ): Map<number, number> {
        const list =
            this.compareAvgDurationYearlyRawByBaseYear.get(baseYearKey) || [];
        const w = (dep || "").trim();
        let rows = list.filter((r) => (r.Wing || "").trim() === w);
        if (this.avgDurationSiteFilter !== "ALL") {
            rows = rows.filter(
                (r) => (r.Site || "").trim() === this.avgDurationSiteFilter,
            );
        }
        const typeTrim = (unifiedSurgeryType || "").trim();
        if (typeTrim) {
            rows = rows.filter(
                (r) => (r.SurgeryType || "").trim() === typeTrim,
            );
        }
        const acc = new Map<number, { sum: number; cnt: number }>();
        for (const r of rows) {
            const y = r.Year;
            if (y == null) {
                continue;
            }
            const c = r.Count ?? 0;
            const avg = Number(r.AvgMinutes);
            if (!Number.isFinite(avg) || c <= 0) {
                continue;
            }
            const p = acc.get(y) || { sum: 0, cnt: 0 };
            p.sum += avg * c;
            p.cnt += c;
            acc.set(y, p);
        }
        const out = new Map<number, number>();
        acc.forEach((v, y) => {
            if (v.cnt > 0) {
                out.set(y, v.sum / v.cnt);
            }
        });
        return out;
    }

    private fillCompareAvgDurationByYearFromLegacyDeduped(
        target: Map<number, number>,
        dedupedRows: AvgDurationFiveYearsDto[],
    ): void {
        const avgAcc = new Map<number, { sumMin: number; sumCount: number }>();
        for (const r of dedupedRows) {
            const y = r.Year;
            const prev = avgAcc.get(y) || { sumMin: 0, sumCount: 0 };
            const cnt = r.Count ?? 0;
            prev.sumMin += (r.AvgDurationMin ?? 0) * cnt;
            prev.sumCount += cnt;
            avgAcc.set(y, prev);
        }
        avgAcc.forEach((v, y) => {
            if (v.sumCount > 0) {
                target.set(y, v.sumMin / v.sumCount);
            }
        });
    }

    /** נפילה למודאל השוואה: ממוצע משך לפי סוג מ-GetAvgDurationFiveYears / שורות צינתור */
    private buildCompareTypeAvgDurationMapLegacy(
        st: string,
        dep: string,
        avgDurationRows: AvgDurationFiveYearsDto[],
    ): Map<number, number> {
        const rowsForType = avgDurationRows.filter((r) => {
            const rowType = (
                (r.SurgeryType || "").trim() ||
                (r.UnifiedSurgeryType || "").trim()
            ).trim();
            return !!rowType && rowType === st;
        });
        const typeRowsDeduped = this.filterAvgDurationRowsNoApiDoubleCount(
            rowsForType,
            (r) => String(r.Year),
            (r) =>
                this.isAvgDurationCoarseRow(r, {
                    treatSurgeryTypeAsLocked: true,
                }),
        );
        const typeDurAcc = new Map<
            number,
            { sumMin: number; sumCount: number }
        >();
        for (const r of typeRowsDeduped) {
            const y = r.Year;
            const prev = typeDurAcc.get(y) || { sumMin: 0, sumCount: 0 };
            const cnt = r.Count ?? 0;
            prev.sumMin += (r.AvgDurationMin ?? 0) * cnt;
            prev.sumCount += cnt;
            typeDurAcc.set(y, prev);
        }
        const durMap = new Map<number, number>();
        typeDurAcc.forEach((v, y) => {
            if (v.sumCount > 0) {
                durMap.set(y, v.sumMin / v.sumCount);
            }
        });
        if (durMap.size === 0) {
            const typeAcc = new Map<number, { sum: number; count: number }>();
            (this.surgeryData || [])
                .filter((s) => this.surgeryRowMatchesCompareWing(s, dep))
                .filter(
                    (s) =>
                        (s.unifiedSurgeryType || s.surgeryType || "").trim() ===
                        st,
                )
                .forEach((s) => {
                    const dateParts = this.parseDateParts(s.date);
                    if (!dateParts || s.surgeryDurationMinutes == null) {
                        return;
                    }
                    const y = dateParts.year;
                    const prev = typeAcc.get(y) || { sum: 0, count: 0 };
                    prev.sum += Number(s.surgeryDurationMinutes);
                    prev.count += 1;
                    typeAcc.set(y, prev);
                });
            typeAcc.forEach((v, y) => {
                if (v.count > 0) {
                    durMap.set(y, v.sum / v.count);
                }
            });
        }
        return durMap;
    }

    getCompareDepartmentOptions(): string[] {
        const fromPerDay = [
            ...(this.roomUtilizationRoomStatsRaw || []),
            ...(this.surgeriesPerDayDepRoomRaw || []),
        ]
            .map((r) => (r.Wing || "").trim())
            .filter(Boolean);
        const fromCount = (this.countByDeptData || [])
            .map((r) => (r.Wing || "").trim())
            .filter(Boolean);
        const all = Array.from(new Set([...fromPerDay, ...fromCount])).filter(
            (w) => w !== "אחר" && w !== "קרדיולוגיה",
        );
        if (!all.length) {
            return [...this.orderedWings];
        }
        return all.sort((a, b) => {
            const ia = this.orderedWings.indexOf(a);
            const ib = this.orderedWings.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b, "he");
        });
    }

    getCompareSurgeryTypeOptions(): string[] {
        if (!this.compareDepartmentSelected) {
            return [];
        }
        const dep = (this.compareDepartmentSelected || "").trim();
        const set = new Set<string>();
        (this.countByDeptData || []).forEach((r) => {
            if ((r.Wing || "").trim() !== dep) return;
            const t = (r.UnifiedSurgeryType || "").trim();
            if (t) set.add(t);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
    }

    onCompareDepartmentChanged(value: string | null): void {
        this.compareDepartmentSelected = value;
        const typeOptions = this.getCompareSurgeryTypeOptions();
        if (typeOptions.length === 0) {
            this.compareSurgeryTypesSelected = [];
        } else {
            const allowed = new Set(typeOptions);
            this.compareSurgeryTypesSelected =
                this.compareSurgeryTypesSelected.filter((t) => allowed.has(t));
        }
        this.refreshCompareDepartmentsLineChart();
    }

    toggleCompareSurgeryTypesDropdown(): void {
        if (!this.compareDepartmentSelected) {
            return;
        }
        this.isCompareSurgeryTypesDropdownOpen =
            !this.isCompareSurgeryTypesDropdownOpen;
    }

    closeCompareSurgeryTypesDropdown(): void {
        this.isCompareSurgeryTypesDropdownOpen = false;
    }

    isCompareSurgeryTypePicked(type: string): boolean {
        return this.compareSurgeryTypesSelected.includes(type);
    }

    setCompareSurgeryTypePicked(type: string, checked: boolean): void {
        const t = (type || "").trim();
        if (!t) {
            return;
        }
        if (checked) {
            if (!this.compareSurgeryTypesSelected.includes(t)) {
                this.compareSurgeryTypesSelected = [
                    ...this.compareSurgeryTypesSelected,
                    t,
                ];
            }
        } else {
            this.compareSurgeryTypesSelected =
                this.compareSurgeryTypesSelected.filter((x) => x !== t);
        }
        this.refreshCompareDepartmentsLineChart();
    }

    getCompareSurgeryTypesDropdownText(): string {
        const sel = this.compareSurgeryTypesSelected;
        if (!sel.length) {
            return "בחר סוגי צינתור (אחד או יותר)";
        }
        if (sel.length <= 2) {
            return sel.join(" | ");
        }
        return `${sel.length} סוגי צינתור נבחרו`;
    }

    toggleCompareMetricsDropdown(): void {
        if (!this.compareDepartmentSelected) {
            return;
        }
        this.isCompareMetricsDropdownOpen = !this.isCompareMetricsDropdownOpen;
    }

    closeCompareMetricsDropdown(): void {
        this.isCompareMetricsDropdownOpen = false;
    }

    @HostListener("document:click", ["$event"])
    onDocumentClickCloseCompareMetricsDropdown(ev: MouseEvent): void {
        const t = ev.target;
        if (!(t instanceof Node)) {
            return;
        }
        if (this.isCompareMetricsDropdownOpen) {
            const rootM = this.compareMetricsDropdownWrap?.nativeElement;
            if (!rootM || !rootM.contains(t)) {
                this.closeCompareMetricsDropdown();
            }
        }
        if (this.isCompareSurgeryTypesDropdownOpen) {
            const rootT = this.compareSurgeryTypesDropdownWrap?.nativeElement;
            if (!rootT || !rootT.contains(t)) {
                this.closeCompareSurgeryTypesDropdown();
            }
        }
        if (this.isAnySidebarFilterDropdownOpen()) {
            const sidebarEl = this.filterSidebarRoot?.nativeElement;
            if (!sidebarEl || !sidebarEl.contains(t)) {
                this.closeSidebarFilterDropdowns();
            } else {
                const hostEl =
                    t instanceof Element ? t : (t.parentElement ?? null);
                const clickedDropdown = hostEl?.closest(
                    ".top-departments-sidebar--filters .custom-dropdown.filter-dropdown",
                );
                if (!clickedDropdown || !sidebarEl.contains(clickedDropdown)) {
                    this.closeSidebarFilterDropdowns();
                }
            }
        }
    }

    isCompareMetricSelected(key: string): boolean {
        if (key === "rooms") return this.compareShowRoomsPerYear;
        if (key === "surgeries") return this.compareShowSurgeriesPerYear;
        if (key === "avgDuration") return this.compareShowAvgDurationPerYear;
        if (key === "surgeriesPerRoom") return this.compareShowSurgeriesPerRoom;
        if (key === "typeCount") return this.compareShowTypeCountPerYear;
        if (key === "typeAvgDuration")
            return this.compareShowTypeAvgDurationPerYear;
        return false;
    }

    setCompareMetricSelected(key: string, checked: boolean): void {
        if (key === "rooms") this.compareShowRoomsPerYear = checked;
        if (key === "surgeries") this.compareShowSurgeriesPerYear = checked;
        if (key === "avgDuration") this.compareShowAvgDurationPerYear = checked;
        if (key === "surgeriesPerRoom")
            this.compareShowSurgeriesPerRoom = checked;
        if (key === "typeCount") this.compareShowTypeCountPerYear = checked;
        if (key === "typeAvgDuration")
            this.compareShowTypeAvgDurationPerYear = checked;
        this.refreshCompareDepartmentsLineChart();
    }

    getCompareMetricsDropdownText(): string {
        const selected = this.compareMetricOptions
            .filter((o) => this.isCompareMetricSelected(o.key))
            .map((o) => o.label);
        if (!selected.length) return "בחר מדדים להשוואה";
        if (selected.length <= 2) return selected.join(" | ");
        return `${selected.length} מדדים נבחרו`;
    }

    /** צבע עמודה בגרף / מסגרת שורה בפאנל מדדים */
    getCompareMetricChartColorHex(key: string): string {
        const B = PciDashboradComponent.COMPARE_DEPT_SERIES_BASE;
        switch (key) {
            case "rooms":
                return B.rooms;
            case "surgeries":
                return B.surgeries;
            case "avgDuration":
                return B.avgDuration;
            case "surgeriesPerRoom":
                return B.surgeriesPerRoom;
            case "typeCount":
                return B.typeCount;
            case "typeAvgDuration":
                return B.typeAvgDuration;
            default:
                return "#7c3aed";
        }
    }

    /** רקע עדין ופס צבע לשורה נבחרת ברשימת המדדים */
    getCompareMetricsItemNgStyle(key: string): Record<string, string> {
        if (!this.isCompareMetricSelected(key)) {
            return {};
        }
        const hex = this.getCompareMetricChartColorHex(key);
        const alpha = this.isDark ? 0.24 : 0.14;
        return {
            borderInlineStart: `3px solid ${hex}`,
            backgroundColor: this.hexToRgba(hex, alpha),
        };
    }

    private hexToRgba(hex: string, alpha: number): string {
        const h = (hex || "").replace("#", "").trim();
        if (h.length !== 6) {
            return `rgba(124, 58, 237, ${alpha})`;
        }
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    /**
     * סדר סוגי הצינתור בגרף ההשוואה — כמו ב־refreshCompareDepartmentsLineChart (סדר בחירה, ללא כפילויות, רק מותרים).
     */
    private getCompareSurgeryTypesSelectedOrderedForChart(): string[] {
        const typeOptionsForCompare = this.getCompareSurgeryTypeOptions();
        const allowedTypes = new Set(typeOptionsForCompare);
        return this.compareSurgeryTypesSelected
            .map((t) => t.trim())
            .filter((t) => t && allowedTypes.has(t))
            .filter((t, i, arr) => arr.indexOf(t) === i);
    }

    /** צבע עמודת «כמות לשנה» לסוג זה בגרף (או null אם המדד כבוי) */
    getCompareSurgeryTypeCountChartHex(typeName: string): string | null {
        if (!this.compareShowTypeCountPerYear) {
            return null;
        }
        const list = this.getCompareSurgeryTypesSelectedOrderedForChart();
        const i = list.indexOf((typeName || "").trim());
        if (i < 0) {
            return null;
        }
        const tc = PciDashboradComponent.COMPARE_DEPT_TYPE_COUNT_CYCLE;
        return tc[i % tc.length];
    }

    /** צבע עמודת «ממוצע דקות» לסוג זה בגרף (או null אם המדד כבוי) */
    getCompareSurgeryTypeAvgChartHex(typeName: string): string | null {
        if (!this.compareShowTypeAvgDurationPerYear) {
            return null;
        }
        const list = this.getCompareSurgeryTypesSelectedOrderedForChart();
        const i = list.indexOf((typeName || "").trim());
        if (i < 0) {
            return null;
        }
        const ta = PciDashboradComponent.COMPARE_DEPT_TYPE_AVG_CYCLE;
        return ta[i % ta.length];
    }

    /** עיצוב שורה בבוחר סוגי צינתור — תואם צבעי העמודות בגרף */
    getCompareSurgeryTypesItemNgStyle(
        typeName: string,
    ): Record<string, string> {
        if (!this.isCompareSurgeryTypePicked(typeName)) {
            return {};
        }
        const cHex = this.getCompareSurgeryTypeCountChartHex(typeName);
        const aHex = this.getCompareSurgeryTypeAvgChartHex(typeName);
        const alpha = this.isDark ? 0.24 : 0.14;
        if (cHex && aHex) {
            return {
                backgroundColor: this.hexToRgbaAverage(cHex, aHex, alpha),
                backgroundImage: `linear-gradient(to bottom, ${cHex} 0%, ${cHex} 50%, ${aHex} 50%, ${aHex} 100%)`,
                backgroundSize: "6px 100%",
                backgroundPosition: "right center",
                backgroundRepeat: "no-repeat",
            };
        }
        const one = cHex || aHex;
        if (!one) {
            return {};
        }
        return {
            borderInlineStart: `3px solid ${one}`,
            backgroundColor: this.hexToRgba(one, alpha),
        };
    }

    private hexToRgbaAverage(
        hexA: string,
        hexB: string,
        alpha: number,
    ): string {
        const a = (hexA || "").replace("#", "").trim();
        const b = (hexB || "").replace("#", "").trim();
        if (a.length !== 6 || b.length !== 6) {
            return this.hexToRgba(hexA, alpha);
        }
        const r = Math.round(
            (parseInt(a.slice(0, 2), 16) + parseInt(b.slice(0, 2), 16)) / 2,
        );
        const g = Math.round(
            (parseInt(a.slice(2, 4), 16) + parseInt(b.slice(2, 4), 16)) / 2,
        );
        const blue = Math.round(
            (parseInt(a.slice(4, 6), 16) + parseInt(b.slice(4, 6), 16)) / 2,
        );
        return `rgba(${r},${g},${blue},${alpha})`;
    }

    private buildCompareDepartmentsSeriesColors(
        selectedTypesList: string[],
    ): string[] {
        const B = PciDashboradComponent.COMPARE_DEPT_SERIES_BASE;
        const tc = PciDashboradComponent.COMPARE_DEPT_TYPE_COUNT_CYCLE;
        const ta = PciDashboradComponent.COMPARE_DEPT_TYPE_AVG_CYCLE;
        const colors: string[] = [];
        if (this.compareShowRoomsPerYear) {
            colors.push(B.rooms);
        }
        if (this.compareShowSurgeriesPerYear) {
            colors.push(B.surgeries);
        }
        if (this.compareShowAvgDurationPerYear) {
            colors.push(B.avgDuration);
        }
        if (this.compareShowSurgeriesPerRoom) {
            colors.push(B.surgeriesPerRoom);
        }
        if (this.compareShowTypeCountPerYear) {
            for (let i = 0; i < selectedTypesList.length; i++) {
                colors.push(tc[i % tc.length]);
            }
        }
        if (this.compareShowTypeAvgDurationPerYear) {
            for (let i = 0; i < selectedTypesList.length; i++) {
                colors.push(ta[i % ta.length]);
            }
        }
        return colors;
    }

    private initializeCompareDepartmentDefaults(): void {
        const deptOptions = this.getCompareDepartmentOptions();
        if (
            this.compareDepartmentSelected &&
            !deptOptions.includes(this.compareDepartmentSelected)
        ) {
            this.compareDepartmentSelected = null;
        }
        const typeOptions = this.getCompareSurgeryTypeOptions();
        const allowed = new Set(typeOptions);
        this.compareSurgeryTypesSelected =
            this.compareSurgeryTypesSelected.filter((x) => allowed.has(x));
    }

    /** השוואת מחלקות נשענת על Wing; שורות צינתור בודדות לעיתים תואמות MappedDept / Department בלבד */
    private surgeryRowMatchesCompareWing(s: PciRow, wing: string): boolean {
        const w = (wing || "").trim();
        if (!w) {
            return false;
        }
        const candidates = [
            s.Wing,
            s.wing,
            s.departmentMapped,
            s.department,
            (s as Record<string, unknown>)["MappedDept"],
            (s as Record<string, unknown>)["S_DEPARTMENT"],
        ];
        return candidates.some((c) => c != null && String(c).trim() === w);
    }

    /**
     * ימי פתיחה/דיווח חדר למחלקה (Wing) לפי שנה — למודאל השוואת מחלקות.
     * קודם: roomUtilizationRoomStatsRaw; אם ריק — surgeriesPerDayDepRoomRaw (ימי פתיחה / FullDays / WorkDays).
     */
    private buildCompareDeptRoomsOpenByYear(dep: string): Map<number, number> {
        const out = new Map<number, number>();
        const w = (dep || "").trim();
        if (!w) {
            return out;
        }
        const fromAvg = this.filterBySelectedDiagnosis(
            this.roomUtilizationRoomStatsRaw || [],
        ).filter((r) => (r.Wing || "").trim() === w);
        if (fromAvg.length > 0) {
            for (const r of fromAvg) {
                const y = r.Year;
                out.set(y, (out.get(y) || 0) + (r.RoomsOpen ?? 0));
            }
            return out;
        }
        const fromDepRoom = this.filterBySelectedDiagnosis(
            this.surgeriesPerDayDepRoomRaw || [],
        ).filter((r) => (r.Wing || "").trim() === w);
        for (const r of fromDepRoom) {
            const y = r.Year;
            let add = 0;
            if (
                r.RoomsOpenDays != null &&
                Number.isFinite(r.RoomsOpenDays) &&
                r.RoomsOpenDays > 0
            ) {
                add = r.RoomsOpenDays;
            } else if (
                r.RoomsOpen != null &&
                Number.isFinite(r.RoomsOpen) &&
                r.RoomsOpen > 0
            ) {
                add = r.RoomsOpen;
            } else if (
                r.FullDays != null &&
                Number.isFinite(r.FullDays) &&
                r.FullDays > 0
            ) {
                add = r.FullDays;
            } else if (
                r.WorkDays != null &&
                Number.isFinite(r.WorkDays) &&
                r.WorkDays > 0
            ) {
                add = r.WorkDays;
            }
            if (add > 0) {
                out.set(y, (out.get(y) || 0) + add);
            }
        }
        return out;
    }

    private refreshCompareDepartmentsLineChart(): void {
        if (!this.isCompareDepartmentsViewActive()) {
            return;
        }
        const dep = (this.compareDepartmentSelected || "").trim();
        if (!dep) {
            this.compareDepartmentsLineChartColumns = [];
            this.compareDepartmentsLineChartData = [];
            this.compareDepartmentsColorLegend = [];
            this.compareDepartmentsGraphInsightBlock = null;
            this.compareDepartmentsAwaitingMetricSelection = false;
            return;
        }

        const baseYear = this.getBaseYearForRoomTimes();
        if (
            this.compareShowAvgDurationPerYear ||
            (this.compareShowTypeAvgDurationPerYear &&
                this.compareSurgeryTypesSelected.length > 0)
        ) {
            this.ensureCompareAvgDurationYearlyLoaded();
        }
        if (this.compareShowSurgeriesPerRoom) {
            this.ensureCompareDepRoomLoaded();
        }
        const avgDurationRaw =
            this.avgDurationFiveYearsRawByBaseYear.get(baseYear) || [];

        const countRows = (this.countByDeptData || []).filter(
            (r) => (r.Wing || "").trim() === dep,
        );
        // ממוצע משך צינתור במודאל השוואה: כל הצינתורים, כל המשמרות, כל הימים כולל סופ״ש — בלי פילטרי הסיידבר
        // (סוג משמרת / חלק שבוע / סוג צינתור / מחלקה בגרף הראשי), תואם לאגרגציה של Count לשנה.
        const avgDurationRows = avgDurationRaw
            .filter(
                (r) =>
                    this.avgDurationSiteFilter === "ALL" ||
                    r.Site === this.avgDurationSiteFilter,
            )
            .filter((r) => (r.Wing || "").trim() === dep);
        const avgDurationRowsDeduped =
            this.filterAvgDurationRowsNoApiDoubleCount(
                avgDurationRows,
                (r) => String(r.Year),
                (r) => this.isAvgDurationCoarseRow(r),
            );

        const roomsByYear = this.buildCompareDeptRoomsOpenByYear(dep);
        const surgeriesByYear = new Map<number, number>();
        const avgDurationByYear = new Map<number, number>();
        const surgeryTypeCountByTypeYear = new Map<
            string,
            Map<number, number>
        >();
        const surgeryTypeAvgDurationByTypeYear = new Map<
            string,
            Map<number, number>
        >();

        // מדד חדרים: ראה buildCompareDeptRoomsOpenByYear (ממוצע לחדר או DepRoom לפי מה שנטען)
        // צינתורים: כל שורות Count למחלקה — אגרגציה על כל WeekPart וכל Shift (לא מסננים כמו בגרף הראשי)
        for (const r of countRows) {
            const y = r.Year;
            surgeriesByYear.set(
                y,
                (surgeriesByYear.get(y) || 0) + (r.Count ?? 0),
            );
        }
        // סדרת «זמן צינתור ממוצע — כל המשמרות והימים»: רק GetAvgDurationYearlyFiveYears (מטמון); אם אין נתונים — נפילה ל-API הישן
        if (this.compareShowAvgDurationPerYear) {
            if (this.compareAvgDurationYearlyRawByBaseYear.has(baseYear)) {
                const fromYearly =
                    this.buildCompareAvgDurationByYearFromYearlyApi(
                        dep,
                        baseYear,
                    );
                if (fromYearly.size > 0) {
                    fromYearly.forEach((v, y) => avgDurationByYear.set(y, v));
                } else {
                    this.fillCompareAvgDurationByYearFromLegacyDeduped(
                        avgDurationByYear,
                        avgDurationRowsDeduped,
                    );
                }
            }
        }

        const selectedTypesList =
            this.getCompareSurgeryTypesSelectedOrderedForChart();

        for (const st of selectedTypesList) {
            const cntMap = new Map<number, number>();
            countRows
                .filter((r) => (r.UnifiedSurgeryType || "").trim() === st)
                .forEach((r) => {
                    cntMap.set(
                        r.Year,
                        (cntMap.get(r.Year) || 0) + (r.Count ?? 0),
                    );
                });
            surgeryTypeCountByTypeYear.set(st, cntMap);

            let durMap = new Map<number, number>();
            if (this.compareShowTypeAvgDurationPerYear) {
                if (this.compareAvgDurationYearlyRawByBaseYear.has(baseYear)) {
                    const fromYearly =
                        this.buildCompareAvgDurationByYearFromYearlyApi(
                            dep,
                            baseYear,
                            st,
                        );
                    durMap =
                        fromYearly.size > 0
                            ? fromYearly
                            : this.buildCompareTypeAvgDurationMapLegacy(
                                  st,
                                  dep,
                                  avgDurationRows,
                              );
                }
            }
            surgeryTypeAvgDurationByTypeYear.set(st, durMap);
        }

        const compareDepRoomSprByYear =
            this.compareShowSurgeriesPerRoom &&
            this.compareDepRoomRawByBaseYear.has(baseYear)
                ? this.buildCompareSurgeriesPerRoomByYearFromDepRoom(
                      dep,
                      baseYear,
                  )
                : new Map<number, number>();

        const years = Array.from(
            new Set([
                ...Array.from(roomsByYear.keys()),
                ...Array.from(surgeriesByYear.keys()),
                ...Array.from(avgDurationByYear.keys()),
                ...Array.from(compareDepRoomSprByYear.keys()),
                ...Array.from(surgeryTypeCountByTypeYear.values()).reduce<
                    number[]
                >((acc, m) => acc.concat(Array.from(m.keys())), []),
                ...Array.from(surgeryTypeAvgDurationByTypeYear.values()).reduce<
                    number[]
                >((acc, m) => acc.concat(Array.from(m.keys())), []),
            ]),
        )
            .sort((a, b) => a - b)
            .slice(-5);

        if (!years.length) {
            this.compareDepartmentsLineChartColumns = [];
            this.compareDepartmentsLineChartData = [];
            this.compareDepartmentsColorLegend = [];
            this.compareDepartmentsGraphInsightBlock = null;
            this.compareDepartmentsAwaitingMetricSelection = false;
            return;
        }

        const hasTypeSeries =
            selectedTypesList.length > 0 &&
            (this.compareShowTypeCountPerYear ||
                this.compareShowTypeAvgDurationPerYear);
        const hasAnyCompareSeries =
            this.compareShowRoomsPerYear ||
            this.compareShowSurgeriesPerYear ||
            this.compareShowAvgDurationPerYear ||
            this.compareShowSurgeriesPerRoom ||
            hasTypeSeries;

        if (!hasAnyCompareSeries) {
            this.compareDepartmentsLineChartColumns = [];
            this.compareDepartmentsLineChartData = [];
            this.compareDepartmentsColorLegend = [];
            this.compareDepartmentsGraphInsightBlock = null;
            this.compareDepartmentsAwaitingMetricSelection = true;
            return;
        }
        this.compareDepartmentsAwaitingMetricSelection = false;

        // צינתורים ליום חדר ללא פיצול: עדיפות ל-GetDepRoomFiveYears; אחרת נסיגה לצינתורים÷RoomsOpen מהנתונים הישנים
        const surgeriesPerRoomByYear = new Map<number, number>();
        years.forEach((y) => {
            if (compareDepRoomSprByYear.has(y)) {
                surgeriesPerRoomByYear.set(y, compareDepRoomSprByYear.get(y)!);
                return;
            }
            const rooms = roomsByYear.get(y) ?? 0;
            const surgs = surgeriesByYear.get(y) ?? 0;
            if (rooms > 0 && surgs > 0) {
                surgeriesPerRoomByYear.set(y, surgs / rooms);
            }
        });

        const columns: any[] = ["שנה"];
        const seriesMeta: { axis: 0 | 1 }[] = [];
        const addSeries = (label: string, axis: 0 | 1): void => {
            columns.push({ type: "number", label });
            seriesMeta.push({ axis });
        };

        // כל דגל מוסיף סדרת עמודות אחת
        if (this.compareShowRoomsPerYear) {
            addSeries("חדרים — בוקר, אמצע שבוע; ימי פתיחה למחלקה", 0);
        }
        if (this.compareShowSurgeriesPerYear) {
            addSeries("צינתורים — כל הימים וכל המשמרות (לשנה)", 0);
        }
        if (this.compareShowAvgDurationPerYear) {
            addSeries("זמן צינתור ממוצע — כל המשמרות והימים (דק')", 1);
        }
        if (this.compareShowSurgeriesPerRoom) {
            addSeries("צינתורים ליום חדר — ללא פיצול", 0);
        }
        if (this.compareShowTypeCountPerYear) {
            for (const st of selectedTypesList) {
                addSeries(`כמות "${st}" לשנה`, 0);
            }
        }
        if (this.compareShowTypeAvgDurationPerYear) {
            for (const st of selectedTypesList) {
                addSeries(`זמן ממוצע "${st}" (דק')`, 1);
            }
        }

        const rows = years.map((year) => {
            const row: any[] = [year.toString()];
            if (this.compareShowRoomsPerYear) {
                row.push(roomsByYear.get(year) ?? null);
            }
            if (this.compareShowSurgeriesPerYear) {
                row.push(surgeriesByYear.get(year) ?? null);
            }
            if (this.compareShowAvgDurationPerYear) {
                row.push(avgDurationByYear.get(year) ?? null);
            }
            if (this.compareShowSurgeriesPerRoom) {
                row.push(surgeriesPerRoomByYear.get(year) ?? null);
            }
            if (this.compareShowTypeCountPerYear) {
                for (const st of selectedTypesList) {
                    row.push(
                        surgeryTypeCountByTypeYear.get(st)?.get(year) ?? null,
                    );
                }
            }
            if (this.compareShowTypeAvgDurationPerYear) {
                for (const st of selectedTypesList) {
                    row.push(
                        surgeryTypeAvgDurationByTypeYear.get(st)?.get(year) ??
                            null,
                    );
                }
            }
            return row;
        });

        this.compareDepartmentsLineChartColumns = columns;
        this.compareDepartmentsLineChartData = rows;

        const series: any = {};
        seriesMeta.forEach((s, i) => {
            series[i] = { targetAxisIndex: s.axis };
        });

        const seriesColors =
            this.buildCompareDepartmentsSeriesColors(selectedTypesList);

        const colorLegend: {
            label: string;
            color: string;
            axisHint: string;
        }[] = [];
        for (let si = 0; si < seriesMeta.length; si++) {
            const col = columns[si + 1] as
                | { label?: string }
                | string
                | undefined;
            const label =
                col != null && typeof col === "object" && "label" in col
                    ? String(col.label || "")
                    : "";
            const color = seriesColors[si] || "#64748b";
            const axisHint =
                seriesMeta[si].axis === 1 ? "ציר דקות" : "ציר כמויות";
            colorLegend.push({ label, color, axisHint });
        }
        this.compareDepartmentsColorLegend = colorLegend;

        this.compareDepartmentsLineChartOptions = {
            title: "",
            /* צבעים קבועים — תואמים לפאנל «מדדי השוואה» כדי לקשר עמודה למדד */
            ...(seriesColors.length ? { colors: seriesColors } : {}),
            chartArea: { width: "88%", height: "58%", left: "8%", top: 48 },
            legend: { position: "none" },
            axisTitlesPosition: "none",
            hAxis: {
                textStyle: {
                    fontSize: 13,
                    bold: true,
                    color: this.isDark ? "#e5e7eb" : "#334155",
                },
            },
            vAxes: {
                0: { minValue: 0, viewWindowMode: "pretty" },
                1: { minValue: 0, viewWindowMode: "pretty" },
            },
            series,
            dataOpacity: 0.95,
            annotations: {
                alwaysOutside: false,
                textStyle: {
                    fontSize: 16,
                    bold: true,
                    rotation: -90,
                    /* טקסט כהה — קריא על עמודות צבעוניות ורקע בהיר */
                    color: "#0f172a",
                },
            },
            explorer: {
                actions: ["dragToZoom", "rightClickToReset"],
                axis: "horizontal",
            },
            animation: { startup: true, duration: 500, easing: "out" },
            backgroundColor: "transparent",
        };
        this.recomputeCompareDepartmentsGraphInsights();
        const withBarLabels = this.injectCompareDeptColumnAnnotations(
            this.compareDepartmentsLineChartColumns,
            this.compareDepartmentsLineChartData,
        );
        const cPatch = this.patchGoogleChartHtmlTooltips(
            withBarLabels.columns,
            withBarLabels.data,
            this.compareDepartmentsLineChartOptions,
            {
                multiYearShowTotal: false,
                multiYearValueSuffix: "",
                formatCell: (v, seriesLabel) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) {
                        return "—";
                    }
                    return this.formatCompareDeptSeriesValue(seriesLabel, n);
                },
            },
        );
        this.compareDepartmentsLineChartColumns = cPatch.columns;
        this.compareDepartmentsLineChartData = cPatch.data;
        this.compareDepartmentsLineChartOptions = cPatch.options;
        if (
            this.showCompareDepartmentsModal &&
            dep &&
            this.compareDepartmentsLineChartData.length > 0
        ) {
            this.scheduleCompareDeptChartRelayout();
        }
    }

    /** אחרי פתיחת מודאל השוואה / שינוי נתונים — google-chart לפעמים צריכים resize ו-reference חדש ל-options */
    private scheduleCompareDeptChartRelayout(): void {
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                /* noop */
            }
            if (
                this.compareDepartmentsLineChartOptions &&
                typeof this.compareDepartmentsLineChartOptions === "object"
            ) {
                this.compareDepartmentsLineChartOptions = {
                    ...this.compareDepartmentsLineChartOptions,
                };
            }
            this.cdr.detectChanges();
        }, 220);
    }

    /**
     * עמודת annotation אחרי כל סדרת מספרים — תווית מעל העמודה (אותו עיצוב כמו בטבלת המסקנות).
     * נקרא לפני patchGoogleChartHtmlTooltips; recomputeCompareDepartmentsGraphInsights רץ לפני זה על טבלה ללא annotation.
     */
    private injectCompareDeptColumnAnnotations(
        columnsIn: any[],
        rowsIn: any[][],
    ): { columns: any[]; data: any[][] } {
        const columns = [...columnsIn];
        const data = rowsIn.map((r) => (Array.isArray(r) ? [...r] : r));
        const numericIndices: number[] = [];
        for (let i = 1; i < columns.length; i++) {
            const c = columns[i] as any;
            const isNumberCol =
                (typeof c === "object" && c?.type === "number") ||
                c === "number";
            const isRole = typeof c === "object" && !!c?.role;
            if (isNumberCol && !isRole) {
                numericIndices.push(i);
            }
        }
        for (let j = numericIndices.length - 1; j >= 0; j--) {
            const i = numericIndices[j];
            const c = columns[i] as any;
            const label =
                typeof c === "object" && c?.label ? String(c.label) : "";
            columns.splice(i + 1, 0, { type: "string", role: "annotation" });
            for (const row of data) {
                const text = this.formatCompareDeptBarAnnotationText(
                    label,
                    row[i],
                );
                row.splice(i + 1, 0, text);
            }
        }
        return { columns, data };
    }

    /** תווית קומפקטית מעל עמודה — קצרה יותר מהטולטיפ כדי להישאר בתוך רוחב הקבוצה */
    private formatCompareDeptBarAnnotationText(
        seriesLabel: string,
        v: any,
    ): string {
        if (v === null || v === undefined || v === "") {
            return "";
        }
        const n = Number(v);
        if (!Number.isFinite(n)) {
            return "";
        }
        if (/דק/.test(seriesLabel)) {
            return this.formatDecimalMinutesAsHhMmOrMmSs(n);
        }
        if (this.isCompareDeptSurgeriesPerRoomSeriesLabel(seriesLabel)) {
            return n.toFixed(1);
        }
        return Math.round(n).toLocaleString("he-IL");
    }

    /** סדרת «צינתורים ליום חדר» / «צינתורים לחדר» במודאל השוואה — ערך עשרוני */
    private isCompareDeptSurgeriesPerRoomSeriesLabel(
        seriesLabel: string,
    ): boolean {
        return (
            seriesLabel.includes("צינתורים ליום חדר") ||
            seriesLabel.includes("צינתורים לחדר")
        );
    }

    /**
     * דקות עשרוניות → מעל 60 דק׳ מוצג כ־H:MM או H:MM:SS (שעות:דקות),
     * מתחת ל־60 דק׳ כ־MM:SS (דקות:שניות) כדי שיהיה ברור מה המספר מייצג.
     */
    private formatDecimalMinutesAsHhMmOrMmSs(minutes: number): string {
        if (!Number.isFinite(minutes)) {
            return "—";
        }
        if (Math.abs(minutes) < 1e-9) {
            return "0:00";
        }
        const sign = minutes < 0 ? "-" : "";
        const absMin = Math.abs(minutes);
        const totalSec = Math.round(absMin * 60);
        if (absMin >= 60 - 1e-9) {
            const h = Math.floor(totalSec / 3600);
            const rem = totalSec % 3600;
            const m = Math.floor(rem / 60);
            const s = rem % 60;
            const mm = String(m).padStart(2, "0");
            if (s > 0) {
                return `${sign}${h}:${mm}:${String(s).padStart(2, "0")}`;
            }
            return `${sign}${h}:${mm}`;
        }
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    private formatCompareDeptSeriesValue(
        seriesLabel: string,
        v: number,
    ): string {
        if (!Number.isFinite(v)) {
            return "—";
        }
        if (/דק/.test(seriesLabel)) {
            return this.formatDecimalMinutesAsHhMmOrMmSs(v);
        }
        if (this.isCompareDeptSurgeriesPerRoomSeriesLabel(seriesLabel)) {
            return v.toFixed(2);
        }
        return Math.round(v).toLocaleString("he-IL");
    }

    private formatCompareDeptSeriesDelta(
        seriesLabel: string,
        delta: number,
    ): string {
        const sign = delta > 0 ? "+" : "";
        if (/דק/.test(seriesLabel)) {
            if (Math.abs(delta) < 1e-9) {
                return this.formatDecimalMinutesAsHhMmOrMmSs(0);
            }
            const body = this.formatDecimalMinutesAsHhMmOrMmSs(delta);
            return delta > 0 ? `+${body}` : body;
        }
        if (this.isCompareDeptSurgeriesPerRoomSeriesLabel(seriesLabel)) {
            return `${sign}${delta.toFixed(2)}`;
        }
        return `${sign}${Math.round(delta).toLocaleString("he-IL")}`;
    }

    private formatCompareDeptPercent(pct: number): string {
        const rounded = Math.abs(pct) >= 10 ? pct.toFixed(0) : pct.toFixed(1);
        return `${pct >= 0 ? "+" : ""}${rounded}%`;
    }

    private recomputeCompareDepartmentsGraphInsights(): void {
        const columns = this.compareDepartmentsLineChartColumns;
        const data = this.compareDepartmentsLineChartData;
        if (!columns?.length || columns.length < 2 || !data?.length) {
            this.compareDepartmentsGraphInsightBlock = null;
            return;
        }

        const seriesLabels: string[] = [];
        for (let i = 1; i < columns.length; i++) {
            const c = columns[i];
            const lab =
                typeof c === "string"
                    ? c
                    : c &&
                        typeof c === "object" &&
                        "label" in c &&
                        (c as { label?: string }).label
                      ? String((c as { label: string }).label)
                      : `מדד ${i}`;
            seriesLabels.push(lab);
        }

        type RowParsed = { year: number; vals: (number | null)[] };
        const parsed: RowParsed[] = [];
        for (const row of data) {
            if (!row || row.length < 2) {
                continue;
            }
            const y = parseInt(String(row[0]), 10);
            if (!Number.isFinite(y)) {
                continue;
            }
            const vals = seriesLabels.map((_, idx) => {
                const raw = row[idx + 1];
                if (raw === null || raw === undefined || raw === "") {
                    return null;
                }
                const n = Number(raw);
                return Number.isFinite(n) ? n : null;
            });
            parsed.push({ year: y, vals });
        }
        parsed.sort((a, b) => a.year - b.year);
        if (!parsed.length) {
            this.compareDepartmentsGraphInsightBlock = null;
            return;
        }

        const em = "—";
        const rows: CompareDeptInsightTableRow[] = [];

        if (parsed.length === 1) {
            const row0 = parsed[0];
            for (let si = 0; si < seriesLabels.length; si++) {
                const v = row0.vals[si];
                if (v === null) {
                    continue;
                }
                const lab = seriesLabels[si];
                rows.push({
                    label: lab,
                    latestVal: this.formatCompareDeptSeriesValue(lab, v),
                    trend: "neutral",
                });
            }
            this.compareDepartmentsGraphInsightBlock = rows.length
                ? {
                      mode: "singleYear",
                      yearPrev: null,
                      yearLatest: row0.year,
                      rows,
                  }
                : null;
            return;
        }

        const prev = parsed[parsed.length - 2];
        const latest = parsed[parsed.length - 1];

        for (let si = 0; si < seriesLabels.length; si++) {
            const v0 = prev.vals[si];
            const v1 = latest.vals[si];
            const label = seriesLabels[si];
            if (v1 === null && v0 === null) {
                continue;
            }
            if (v0 === null && v1 !== null) {
                rows.push({
                    label,
                    prevVal: em,
                    latestVal: this.formatCompareDeptSeriesValue(label, v1),
                    delta: em,
                    pct: em,
                    trend: "partial",
                });
                continue;
            }
            if (v0 !== null && v1 === null) {
                rows.push({
                    label,
                    prevVal: this.formatCompareDeptSeriesValue(label, v0),
                    latestVal: em,
                    delta: em,
                    pct: em,
                    trend: "partial",
                });
                continue;
            }
            const v0n = v0 as number;
            const v1n = v1 as number;
            const delta = v1n - v0n;
            const val0s = this.formatCompareDeptSeriesValue(label, v0n);
            const val1s = this.formatCompareDeptSeriesValue(label, v1n);
            if (Math.abs(delta) < 1e-9) {
                rows.push({
                    label,
                    prevVal: val0s,
                    latestVal: val1s,
                    delta: this.formatCompareDeptSeriesDelta(label, 0),
                    pct: "0%",
                    trend: "flat",
                });
                continue;
            }
            const absFmt = this.formatCompareDeptSeriesDelta(label, delta);
            if (Math.abs(v0n) < 1e-9) {
                rows.push({
                    label,
                    prevVal: val0s,
                    latestVal: val1s,
                    delta: absFmt,
                    pct: em,
                    trend: delta > 0 ? "up" : "down",
                });
                continue;
            }
            const pct = (delta / v0n) * 100;
            rows.push({
                label,
                prevVal: val0s,
                latestVal: val1s,
                delta: absFmt,
                pct: this.formatCompareDeptPercent(pct),
                trend: delta > 0 ? "up" : "down",
            });
        }

        this.compareDepartmentsGraphInsightBlock = rows.length
            ? {
                  mode: "twoYears",
                  yearPrev: prev.year,
                  yearLatest: latest.year,
                  rows,
              }
            : null;
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

    /** ערך הטוגל המאוחד בשורת מצבי ניצולת חדר (כולל «צינתורים ליום»). */
    getRoomStatsToggleValue():
        | "yearTotal"
        | "total"
        | "open"
        | "close"
        | "fullDays"
        | "surgeriesPerDay" {
        if (this.roomUtilizationSubChart === "surgeriesPerDay") {
            return "surgeriesPerDay";
        }
        return this.roomStatsViewMode === "yearTotal"
            ? "yearTotal"
            : this.roomStatsMetric;
    }

    /** החלפת מצב כפתורי ניצולת חדר לפי ערך הטוגל המאוחד ב-UI */
    onRoomStatsModeChange(
        value:
            | "yearTotal"
            | "total"
            | "open"
            | "close"
            | "fullDays"
            | "surgeriesPerDay",
    ): void {
        if (value === "surgeriesPerDay") {
            this.roomUtilizationSubChart = "surgeriesPerDay";
            this.loadSurgeriesPerDay();
            this.cdr.detectChanges();
            return;
        }
        this.roomUtilizationSubChart = "roomStats";
        if (value === "yearTotal") {
            this.setRoomStatsViewMode("yearTotal");
        } else {
            this.setRoomStatsViewMode("byWing");
            this.setRoomStatsMetric(value);
        }
        this.cdr.detectChanges();
    }

    /** חישוב ערך המדד הנוכחי עבור רשומת חדרים */
    private getRoomStatsMetricValue(info: {
        roomsTotal: number;
        roomsOpen: number;
        roomsClose: number;
        fullDays: number;
    }): number | null {
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
        this.closeSidebarFilterDropdowns();
        if (this.chartViewMode === "month") {
            this.loadMonthlyCounts();
        } else {
            this.updateChartData();
        }
        if (this.chartViewMode === "yoy-combined") {
            this.scheduleYoyCombinedInlineBuild();
        }
        this.cdr.detectChanges();
    }

    /** מחלקות שלא רלוונטיות לדשבורד צינתורים (למשל קרדיולוגיה) */
    private isExcludedPciDepartment(name: string): boolean {
        const n = (name || "").trim().replace(/\s+/g, " ");
        if (!n) {
            return false;
        }
        const lower = n.toLowerCase();
        return (
            n === "קרדיולוגיה" ||
            n.includes("קרדיולוגיה") ||
            lower.includes("cardiology") ||
            lower === "cardio"
        );
    }

    private purgeExcludedFromDepartmentYoyData(): void {
        if (!this.departmentYoyData?.length) {
            return;
        }
        this.departmentYoyData = this.departmentYoyData.filter(
            (d) => !this.isExcludedPciDepartment(d.Department || ""),
        );
    }

    /** נתוני YoY מסוננים לפי פילטר המחלקה של הגרף (לשימוש בטבלה ובתצוגות) */
    getFilteredDepartmentYoyData(): DepartmentYoyDto[] {
        if (!this.departmentYoyData || !this.departmentYoyData.length) {
            return [];
        }
        const withoutCardiology = this.departmentYoyData.filter(
            (d) => !this.isExcludedPciDepartment(d.Department || ""),
        );
        if (!this.chartDepartmentFilter) {
            return withoutCardiology;
        }
        return withoutCardiology.filter(
            (d) => (d.Department || "").trim() === this.chartDepartmentFilter,
        );
    }

    /**
     * Load yearly totals silently for chart year detection
     */
    loadYearlyTotalsForChart(): void {
        // בדשבורד הצינתורים החדש אין שימוש יותר ב־API של GetYearlyTotalIncome
        return;
    }

    /**
     * Load boss dashboard with yearly totals from backend
     */
    loadBossDashboard(): void {
        // מודול "דוח למנהל" הישן התבסס על API של הכנסות – הוסר בדשבורד הצינתורים
        this.showBossDashboard = false;
        this.isLoading = false;
        this.snackBar.open("מודול הכנסות הוסר מדשבורד הצינתורים", "סגור", {
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
     * לחיצה על שורה: צינתור – פתיחת מודל פרטים; מחלקה – גרף מחלקה
     */
    onRowClick(row: any): void {
        if (this.surgeryData.length > 0) {
            this.selectedSurgery = row as PciRow;
            this.selectedDepartment = null;
            this.departmentGraphTitle = "פרטי צינתור";
            this.isDepartmentGraphOpen = true;
            this.cdr.detectChanges();
            return;
        }
        this.loadDepartmentSpecificGraph(row.DepartmentName);
    }

    /**
     * ערך תא עבור טבלה (תמיכה ב-PciRow ובמחלקות)
     */
    getCellVal(row: any, col: string): any {
        if (!row) return "";
        const v = row[col];
        return v != null ? v : "";
    }

    /**
     * Load department specific graph
     */
    loadDepartmentSpecificGraph(departmentName: string): void {
        this.selectedSurgery = null;
        this.selectedDepartment =
            this.departmentIncomeData.find(
                (d) => d.DepartmentName === departmentName,
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
                (a, b) => (b.Cash2025 || 0) - (a.Cash2025 || 0),
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
            // Assume current year - 1 as older year (most common case)
            return (this.currentYear - 1).toString();
        }
        return "";
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
        return "";
    }

    /**
     * Update chart columns dynamically based on years
     */
    updateChartColumns(): void {
        // Only update if we have data
        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
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

    /** CSV cell quoting for Excel (UTF-8). */
    private csvCell(v: unknown): string {
        if (v == null || v === "") {
            return '""';
        }
        const str = String(v);
        return `"${str.replace(/"/g, '""')}"`;
    }

    /**
     * Export to CSV for Excel:
     * 1) One row per surgery when surgeryData is populated (legacy / future source).
     * 2) Else department income summary when departmentIncomeData exists.
     * 3) Else one row per GetCountByDept row (aggregate dimensions, not each surgery).
     */
    exportToCSV(): void {
        const bom = "\uFEFF";
        let body = "";
        let fileName = "dashboard_export.csv";
        let snack = "✓ הדוח יוצא בהצלחה";

        if (this.surgeryData.length > 0) {
            const list = this.dataSource.data as PciRow[];
            body =
                [
                    this.csvCell("תאריך הצינתור"),
                    this.csvCell("מספר מקרה"),
                    this.csvCell("חדר צינתור"),
                    this.csvCell("משך הצינתור בדקות"),
                    this.csvCell("סוג צינתור"),
                    this.csvCell("מנתח"),
                    this.csvCell("פרוצדורה / תיאור"),
                    this.csvCell("סכום כולל (אם קיים בנתונים)"),
                ].join(",") + "\n";
            list.forEach((row) => {
                body +=
                    [
                        this.csvCell(row.date),
                        this.csvCell(row.caseNumber),
                        this.csvCell(row.surgeryRoom),
                        this.csvCell(row.surgeryDurationMinutes),
                        this.csvCell(row.surgeryType),
                        this.csvCell(row.surgeon),
                        this.csvCell(row.procedure),
                        this.csvCell(row.totalAmount),
                    ].join(",") + "\n";
            });
            fileName = "surgeries_report.csv";
            snack += " (צינתורים שורה-שורה)";
        } else if (this.departmentIncomeData.length > 0) {
            const olderYear = this.getOlderYearFromDeptData();
            const latestYear = this.getLatestYearFromDeptData();
            body =
                [
                    this.csvCell("שם מחלקה"),
                    this.csvCell(`סך פעילות / הכנסה בשנת ${olderYear}`),
                    this.csvCell(`סך פעילות / הכנסה בשנת ${latestYear}`),
                    this.csvCell(
                        `הפרש בין ${latestYear} ל-${olderYear} (מספר)`,
                    ),
                    this.csvCell(`אחוז שינוי בין השנים (%)`),
                ].join(",") + "\n";
            this.departmentIncomeData.forEach((item) => {
                const difference = this.calculateDifference(item);
                const percentage = this.calculatePercentageChange(item);
                body +=
                    [
                        this.csvCell(item.DepartmentName),
                        this.csvCell(item.Income2024),
                        this.csvCell(item.Income2025),
                        this.csvCell(difference),
                        this.csvCell(percentage),
                    ].join(",") + "\n";
            });
            fileName = "surgery_activity_by_department.csv";
            snack += " (סיכום הכנסות)";
        } else if (this.countByDeptData.length > 0) {
            body =
                [
                    this.csvCell("שנה (לפי תאריך הצינתור בטבלת המקור)"),
                    this.csvCell("אתר"),
                    this.csvCell('מחלקה (שדה "מנתחת" במקור)'),
                    this.csvCell('אגף מאוגד (שדה "מנתחת מאוגד")'),
                    this.csvCell("מספר צינתורים בקבוצה (ספירה באגרגציה)"),
                    this.csvCell('סוג צינתור מאוחד (שדה "סוג צינתור ")'),
                    this.csvCell("משמרת"),
                    this.csvCell("חדר צינתור"),
                    this.csvCell('אמצע/סוף שבוע (שדה "אמצע/סוף שבוע")'),
                    this.csvCell(
                        "\u05e7\u05e8\u05df / \u05d1\u05d9\u05d4\u0022\u05d7 (\u05e9\u05d3\u05d4 \u05e7\u05e8\u05df/\u05d1\u05d9\u05d4\u0022\u05d7 \u05d1\u05de\u05e1\u05d3 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd)",
                    ),
                ].join(",") + "\n";
            this.countByDeptData.forEach((r) => {
                body +=
                    [
                        this.csvCell(r.Year),
                        this.csvCell(r.Site),
                        this.csvCell(r.Department),
                        this.csvCell(r.Wing),
                        this.csvCell(r.Count),
                        this.csvCell(r.UnifiedSurgeryType),
                        this.csvCell(r.Shift),
                        this.csvCell(r.SurgeryRoom),
                        this.csvCell(r.WeekPart),
                        this.csvCell(r.FundType),
                    ].join(",") + "\n";
            });
            fileName = "surgery_counts_by_dept_rows.csv";
            snack += " (שורות GetCountByDept)";
        } else {
            this.snackBar.open("אין נתונים לייצוא", "סגור", { duration: 2000 });
            return;
        }

        const href =
            "data:text/csv;charset=utf-8," + encodeURIComponent(bom + body);
        const link = document.createElement("a");
        link.setAttribute("href", href);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.snackBar.open(snack, "סגור", { duration: 2500 });
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
                return "מטרת דשבורד הצינתורים";
            case "notes":
                return "הערות חשובות";
            case "structure":
                return "מבנה הדשבורד";
            default:
                return "מדריך דשבורד הצינתורים";
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
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "revenue" &&
            this.revenuePanel
        ) {
            if (!this.revenuePanel.isFilterSidebarOpen()) {
                this.revenuePanel.openFilterSidebar();
            } else {
                this.revenuePanel.closeFilterSidebar();
            }
            this.notifyMainLayoutResizeAfterSidebarChange();
            return;
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "cancellations" &&
            this.cancellationsPanel
        ) {
            this.cancellationsPanel.toggleFilterSidebar();
            this.notifyMainLayoutResizeAfterSidebarChange();
            return;
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "wait" &&
            this.waitTimesPanel
        ) {
            this.waitTimesPanel.toggleFilterSidebar();
            this.notifyMainLayoutResizeAfterSidebarChange();
            return;
        }
        this.showTopDepartmentsSidebar = !this.showTopDepartmentsSidebar;
        this.notifyMainLayoutResizeAfterSidebarChange();
    }

    showTopbarFilterActive(): boolean {
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "revenue" &&
            this.revenuePanel
        ) {
            return this.revenuePanel.hasActiveFilters();
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "cancellations" &&
            this.cancellationsPanel
        ) {
            return this.cancellationsPanel.hasActiveFilters();
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "wait" &&
            this.waitTimesPanel
        ) {
            return this.waitTimesPanel.hasActiveFilters();
        }
        return this.hasActiveSurgeryFilters();
    }

    getTopbarFilterTooltip(): string {
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "revenue"
        ) {
            return this.revenuePanel?.hasActiveFilters()
                ? "פילטרים פעילים – לחץ לעריכת סינון"
                : "סינון מתקדם להכנסות";
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "cancellations"
        ) {
            return this.cancellationsPanel?.hasActiveFilters()
                ? "פילטרים פעילים – לחץ לעריכת סינון"
                : "סינון מתקדם לביטולים";
        }
        if (
            this.showTopQuickMainSlotSwitcher &&
            this.topQuickMainSlot === "wait"
        ) {
            return this.waitTimesPanel?.hasActiveFilters()
                ? "פילטרים פעילים – לחץ לעריכת סינון"
                : "סינון מתקדם להמלצות לצינתור";
        }
        return this.hasActiveSurgeryFilters()
            ? "פילטרים פעילים – לחץ לעריכת סינון"
            : "סינון מתקדם לדשבורד הצינתורים";
    }

    getTopbarFilterIcon(): string {
        return this.showTopbarFilterActive() ? "filter_alt" : "tune";
    }

    private notifyMainLayoutResizeAfterSidebarChange(): void {
        setTimeout(() => {
            try {
                window.dispatchEvent(new Event("resize"));
            } catch {
                // ignore if window is not available (SSR safeguard)
            }

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
        return exists ? list.filter((v) => v !== value) : [...list, value];
    }

    setSurgeryTypeFilter(value: string): void {
        this.selectedSurgeryTypes = this.toggleFromMulti(
            this.selectedSurgeryTypes,
            value,
        );
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    setShiftFilter(value: string): void {
        this.selectedShifts = this.toggleFromMulti(this.selectedShifts, value);
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    setMorningWorkFilter(value: "all" | "yes" | "no"): void {
        this.morningWorkFilter = value;
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    setRoomFilter(value: string): void {
        this.selectedRooms = this.toggleFromMulti(this.selectedRooms, value);
        this.applyAllSurgeryFilters();
    }

    setDepartmentFilter(value: string): void {
        this.selectedDepartments = this.toggleFromMulti(
            this.selectedDepartments,
            value,
        );
        this.applyAllSurgeryFilters();
    }

    setWeekdayFilter(value: string): void {
        this.selectedWeekdays = this.toggleFromMulti(
            this.selectedWeekdays,
            value,
        );
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    setSiteFilter(value: string): void {
        this.selectedSites = this.toggleFromMulti(this.selectedSites, value);
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    /** איפוס בחירת אתרים מפאנל הסינון + סגירת הדרופדאון */
    clearSiteFilter(): void {
        this.selectedSites = [];
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    /** סוגר את כל הדרופדאונים בפאנל הסינון הצדדי (לא כולל מודלים / השוואות אחרות) */
    private closeSidebarFilterDropdowns(): void {
        this.isDropdownOpen = false;
        this.isChartDeptDropdownOpen = false;
        this.isSurgeryTypeOpen = false;
        this.isShiftOpen = false;
        this.isWeekdayOpen = false;
        this.isMorningWorkOpen = false;
        this.isSiteOpen = false;
        this.isRoomOpen = false;
        this.isDeptOpen = false;
    }

    toggleSidebarFilterDropdown(
        which:
            | "chartDepartment"
            | "surgeryType"
            | "shift"
            | "weekPart"
            | "morningWork"
            | "site"
            | "diagnosis"
            | "room"
            | "department",
    ): void {
        const shouldOpen =
            (which === "chartDepartment" && !this.isChartDeptDropdownOpen) ||
            (which === "surgeryType" && !this.isSurgeryTypeOpen) ||
            (which === "shift" && !this.isShiftOpen) ||
            (which === "weekPart" && !this.isWeekdayOpen) ||
            (which === "morningWork" && !this.isMorningWorkOpen) ||
            (which === "site" && !this.isSiteOpen) ||
            (which === "diagnosis" && !this.isDropdownOpen) ||
            (which === "room" && !this.isRoomOpen) ||
            (which === "department" && !this.isDeptOpen);

        this.closeSidebarFilterDropdowns();

        if (!shouldOpen) {
            return;
        }

        if (which === "chartDepartment") this.isChartDeptDropdownOpen = true;
        if (which === "surgeryType") this.isSurgeryTypeOpen = true;
        if (which === "shift") this.isShiftOpen = true;
        if (which === "weekPart") this.isWeekdayOpen = true;
        if (which === "morningWork") this.isMorningWorkOpen = true;
        if (which === "site") this.isSiteOpen = true;
        if (which === "diagnosis") this.isDropdownOpen = true;
        if (which === "room") this.isRoomOpen = true;
        if (which === "department") this.isDeptOpen = true;
    }

    private isAnySidebarFilterDropdownOpen(): boolean {
        return (
            this.isDropdownOpen ||
            this.isChartDeptDropdownOpen ||
            this.isSurgeryTypeOpen ||
            this.isShiftOpen ||
            this.isWeekdayOpen ||
            this.isMorningWorkOpen ||
            this.isSiteOpen ||
            this.isRoomOpen ||
            this.isDeptOpen
        );
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
        this.closeSidebarFilterDropdowns();
        this.applyAllSurgeryFilters();
    }

    applyAllSurgeryFilters(): void {
        // טבלת הצינתורים מפולטרת רק אם יש לנו נתוני צינתורים גולמיים
        if (this.surgeryData.length > 0) {
            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
        }

        // הגרף הראשי תמיד מתעדכן לפי הפילטרים (גם כשאין surgeryData ויש רק CountByDept)
        // במצב "צינתורים לפי חודשים" – רענון מה-API עם אותם פרמטרי סינון כמו שאר המדדים
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
        if (
            this.mainMetricMode === "room-utilization" &&
            this.roomUtilizationSubChart === "surgeriesPerDay"
        ) {
            this.loadSurgeriesPerDay();
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
        if (this.sidebarFiltersNonApplicableForRoomCharts()) {
            return "פילטרי הסיידבר אינם רלוונטיים — הנתונים לפי בוקר, אמצע שבוע וחדר צינתור כללי.";
        }
        if (this.mainMetricMode === "compare-departments") {
            return "במצב השוואת מחלקות פילטרי הסיידבר אינם משפיעים על גרף ההשוואה; בוחרים מחלקה ומדדים בפאנל הגרף.";
        }
        const parts: string[] = [];

        // אגף / אתר נבחר (לא ברירת מחדל "כל האתרים")
        if (this.selectedDiagnosis && this.selectedDiagnosis !== "כל האתרים") {
            parts.push(`אגף / אתר: ${this.selectedDiagnosis}`);
        }

        if (this.selectedSurgeryTypes && this.selectedSurgeryTypes.length > 0) {
            parts.push(`סוג צינתור: ${this.selectedSurgeryTypes.join(", ")}`);
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
                    : "עבודת בוקר: לא",
            );
        }

        if (parts.length === 0) {
            return "אין סינון פעיל (הכל)";
        }

        return parts.join(" · ");
    }

    // תצוגת טקסט לכל פילטר (כולל "הכל" וקומה) – בשורה קצרה שלא פורצת את העיצוב
    getSurgeryTypeDisplay(): string {
        if (
            !this.selectedSurgeryTypes ||
            this.selectedSurgeryTypes.length === 0
        ) {
            return "קטגורית צינתור: הכל";
        }
        if (this.selectedSurgeryTypes.length === 1) {
            return `קטגורית צינתור: ${this.selectedSurgeryTypes[0]}`;
        }
        const first = this.selectedSurgeryTypes[0];
        const restCount = this.selectedSurgeryTypes.length - 1;
        // מציגים ערך ראשון + כמות נוספת, הפירוט המלא כבר מופיע בתקציר התחתון
        return `קטגורית צינתור: ${first} ועוד ${restCount}`;
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
        if (
            !this.selectedDepartments ||
            this.selectedDepartments.length === 0
        ) {
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
            document.body.classList.add("department-dashboard-dark");
        } else {
            document.body.classList.remove("department-dashboard-dark");
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
                    fontSize:
                        this.chartOptions.hAxis?.textStyle?.fontSize ?? 13,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.hAxis?.titleTextStyle?.fontSize ?? 14,
                    bold: true,
                },
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.vAxis?.textStyle?.fontSize ?? 13,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.vAxis?.titleTextStyle?.fontSize ?? 14,
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
                },
            };
            this.chartOptions.annotations = {
                ...(this.chartOptions.annotations || {}),
                textStyle: {
                    ...(this.chartOptions.annotations?.textStyle || {}),
                    color: "#f9fafb",
                    fontSize:
                        this.chartOptions.annotations?.textStyle?.fontSize ??
                        12,
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
                    color: "#555",
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
                    color: "#555",
                },
            };
            this.chartOptions.annotations = {
                ...this.chartOptions.annotations,
                textStyle: {
                    ...(this.chartOptions.annotations?.textStyle || {}),
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

            if (
                event &&
                event.selection &&
                Array.isArray(event.selection) &&
                event.selection.length > 0
            ) {
                // Standard format: { selection: [{ row: number, column: number }] }
                selectedRow = event.selection[0].row;
            } else if (event && event.row !== undefined) {
                // Direct format: { row: number, column: number }
                selectedRow = event.row;
            } else if (Array.isArray(event) && event.length > 0) {
                // Array format: [{ row: number, column: number }]
                selectedRow = event[0].row;
            }

            if (this.surgeryData.length > 0) return; // במצב צינתורים לא פותחים מודל מחלקה
            if (selectedRow !== null && selectedRow !== undefined) {
                if (this.chartData && this.chartData.length > selectedRow) {
                    const departmentName = this.chartData[selectedRow][0];
                    if (departmentName)
                        this.loadDepartmentSpecificGraph(departmentName);
                }
            }
        } catch (error) {
            console.error("Error handling chart click:", error);
        }
    }

    isDropdownOpen = false;

    toggleDropdown() {
        if (!this.isDiagnosesLoading && this.diagnosesList.length > 0) {
            this.toggleSidebarFilterDropdown("diagnosis");
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
        this.setRoomTimesView("avgDuration");
    }

    openFirstStartTimeModal(): void {
        this.showFirstStartTimeModal = true;
        this.loadAvgFirstMorningEntry();
    }

    openLastEndTimeModal(): void {
        this.showLastEndTimeModal = true;
        this.loadAvgLastMorningEnd();
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

    /**
     * מודאל «זמני חדר צינתור»: chartArea מאוזן — מקום לציר X משופע, לכותרת ציר Y ולקו סף (SETUP),
     * בלי לשנות את אובייקטי ה־options בגרף הראשי.
     */
    roomTimesModalChartOptions(base: any): any {
        if (!base || typeof base !== "object") {
            return base;
        }
        const cached = this.roomTimesModalChartOptionsMemo.get(base);
        if (cached) {
            return cached;
        }
        const prev =
            base.chartArea && typeof base.chartArea === "object"
                ? base.chartArea
                : {};
        const merged: any = {
            ...base,
            chartArea: {
                ...prev,
                left: 48,
                top: 44,
                width: "92%",
                height: "72%",
            },
        };

        const hasThresholdLine =
            merged.series &&
            typeof merged.series === "object" &&
            Object.values(merged.series).some(
                (s: any) => s && Array.isArray(s.lineDashStyle),
            );
        if (hasThresholdLine) {
            const v0 = merged.vAxis || {};
            merged.vAxis = {
                ...v0,
                viewWindow: {
                    ...(v0.viewWindow || {}),
                    min: 0,
                },
            };
            const series = { ...(merged.series || {}) };
            for (const key of Object.keys(series)) {
                const s = series[key];
                if (s && Array.isArray(s.lineDashStyle)) {
                    series[key] = {
                        ...s,
                        lineWidth: 3,
                        pointSize: 4,
                        visibleInLegend: true,
                    };
                }
            }
            merged.series = series;
        }

        this.roomTimesModalChartOptionsMemo.set(base, merged);
        return merged;
    }

    // Unified "זמני חדר צינתור" modal that מחזיק את כל תתי‑הגרפים תחת אותה כותרת
    openRoomTimesModal(
        initialView:
            | "avgDuration"
            | "firstStart"
            | "lastEnd"
            | "perDay"
            | "lossPerDay"
            | "approvedPerDay" = "avgDuration",
    ): void {
        this.showRoomTimesModal = true;
        this.setRoomTimesView(initialView);
    }

    closeRoomTimesModal(): void {
        this.showRoomTimesModal = false;
        this.showTimesModal = false;
    }

    private syncSidebarFilterDropdownOpenState(): void {
        if (this.isFilterDisabled("chartDepartment"))
            this.isChartDeptDropdownOpen = false;
        if (this.isFilterDisabled("surgeryType"))
            this.isSurgeryTypeOpen = false;
        if (this.isFilterDisabled("shift")) this.isShiftOpen = false;
        if (this.isFilterDisabled("weekPart")) this.isWeekdayOpen = false;
        if (this.isFilterDisabled("morningWork"))
            this.isMorningWorkOpen = false;
        if (this.isFilterDisabled("site")) this.isSiteOpen = false;
        if (this.isFilterDisabled("room")) this.isRoomOpen = false;
    }

    setRoomTimesView(
        view:
            | "avgDuration"
            | "firstStart"
            | "lastEnd"
            | "perDay"
            | "lossPerDay"
            | "approvedPerDay",
    ): void {
        this.roomTimesView = view;

        this.syncSidebarFilterDropdownOpenState();

        switch (view) {
            case "avgDuration":
                this.loadAvgDuration();
                break;
            case "firstStart":
                this.loadAvgFirstMorningEntry();
                break;
            case "lastEnd":
                this.loadAvgLastMorningEnd();
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
        this.cdr.detectChanges();
    }

    toggleLastEndTimeExcludeOverflow(): void {
        this.lastEndTimeExcludeOverflowDays =
            !this.lastEndTimeExcludeOverflowDays;
        this.applyLastEndTimeDisplay();
    }

    /**
     * מחזיר ממוצע "ללא ימים מאוחרים" (last surgery not after 15:00).
     * מעדיף שדות מהשרת: CountNoLateDays, AvgEndMinutesNoLateDays; אם חסרים – מחשב מ־CountOverflowDaysOnly וכו'.
     */
    private getLastEndExcludingOverflow(r: AvgLastEndRow): {
        count: number;
        avgMinutes: number | null;
    } {
        if (
            r.CountNoLateDays != null &&
            r.CountNoLateDays > 0 &&
            r.AvgEndMinutesNoLateDays != null
        ) {
            return {
                count: r.CountNoLateDays,
                avgMinutes: r.AvgEndMinutesNoLateDays,
            };
        }
        const total = r.Count ?? 0;
        const overflowCount = r.CountOverflowDaysOnly ?? 0;
        const countExcl = Math.max(0, total - overflowCount);
        if (countExcl <= 0) {
            return { count: 0, avgMinutes: null };
        }
        const totalMin = (r.AvgEndMinutes ?? 0) * total;
        const overflowMin =
            (r.AvgEndMinutesOverflowDaysOnly ?? 0) * overflowCount;
        const exclSum = totalMin - overflowMin;
        const avgMinutes = exclSum / countExcl;
        return {
            count: countExcl,
            avgMinutes: Number.isFinite(avgMinutes) ? avgMinutes : null,
        };
    }

    /** כשבמצב "ללא גלישה" אין אף שורה עם ימים בלי גלישה – נציג ממוצע רגיל כדי שהמסך לא יישאר ריק */
    lastEndTimeExcludeNoData = false;

    /** מעדכן תצוגה וגרף: כשהכפתור פעיל – ממוצע ללא ימי גלישה (חישוב מקומי או משדות השרת), אחרת ממוצע רגיל */
    applyLastEndTimeDisplay(): void {
        const rows = this.lastEndTimeRows;
        let useExcluding = this.lastEndTimeExcludeOverflowDays;
        this.lastEndTimeExcludeNoData = false;

        const hasAnyExcluding =
            useExcluding &&
            rows.some((r) => this.getLastEndExcludingOverflow(r).count > 0);
        if (useExcluding && !hasAnyExcluding) {
            useExcluding = false;
            this.lastEndTimeExcludeNoData = true;
        }

        this.lastEndTimeData = rows.map((r) => {
            let valueDisplay: string;
            if (useExcluding) {
                const { avgMinutes } = this.getLastEndExcludingOverflow(r);
                valueDisplay =
                    avgMinutes != null
                        ? this.minutesToTime(avgMinutes)
                        : (r.AvgEndTimeNoLateDays ?? "-");
            } else {
                valueDisplay =
                    r.AvgEndTime ??
                    (r.AvgEndMinutes != null
                        ? this.minutesToTime(r.AvgEndMinutes)
                        : "-");
            }
            return {
                departmentName: (r.Wing || "").trim() || "לא צוין",
                valueDisplay,
            };
        });

        this.buildLastEndTimeChart(rows, useExcluding);
        this.cdr.detectChanges();
    }

    openSurgeriesPerDayModal(): void {
        this.showSurgeriesPerDayModal = true;
        this.loadSurgeriesPerDay();
    }

    closeSurgeriesPerDayModal(): void {
        this.showSurgeriesPerDayModal = false;
    }

    /** אפשרויות Google Charts ל«צינתורים ליום» במודאל זמני חדר / השוואות — עיצוב מקורי */
    private getRoomTimesSurgeriesPerDayGoogleOptionsBase(): Record<
        string,
        unknown
    > {
        return {
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
                title: "צינתורים ליום בחדר",
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
                    fontSize: 16,
                    bold: true,
                },
            },
        };
    }

    /**
     * כשמציגים «צינתורים ליום» תחת ניצולת חדר — אותם צבעי שנה, אזור תרשים, אנימציה ותוויות כמו שאר גרפי הניצולת.
     */
    private applyUtilizationSurgeriesPerDayChartLook(): void {
        if (!this.surgeriesPerDayChartData?.length) {
            return;
        }
        const years = this.surgeriesPerDayChartYears || [];
        const colors =
            years.length > 0
                ? years.map(
                      (_, i) => this.yearPalette[i % this.yearPalette.length],
                  )
                : this.yearPalette.slice(0, 2);

        this.surgeriesPerDayChartOptions = {
            ...this.chartOptions,
            title: "",
            colors,
            isStacked: false,
            bars: "vertical",
            vAxis: {
                ...(this.chartOptions.vAxis || {}),
                title: "צינתורים ליום בחדר",
                minValue: 0,
            },
            hAxis: {
                ...(this.chartOptions.hAxis || {}),
                title: "מחלקה מאוגדת (Wing)",
            },
            bar: { ...(this.chartOptions.bar || {}), groupWidth: "60%" },
            legend: { ...(this.chartOptions.legend || {}) },
            chartArea: { ...(this.chartOptions.chartArea || {}) },
            animation: { ...(this.chartOptions.animation || {}) },
            backgroundColor: { ...(this.chartOptions.backgroundColor || {}) },
            dataOpacity: this.chartOptions.dataOpacity,
            annotations: { ...(this.chartOptions.annotations || {}) },
            tooltip: { ...(this.chartOptions.tooltip || {}) },
            enableInteractivity: true,
            focusTarget: "category",
        };

        const spdTip = this.patchGoogleChartHtmlTooltips(
            this.surgeriesPerDayChartColumns,
            this.surgeriesPerDayChartData,
            this.surgeriesPerDayChartOptions,
            {
                multiYearValueSuffix: "ממוצע ליום בחדר",
                multiYearShowTotal: false,
                wingTooltipSubtitle:
                    "ממוצע צינתורים ליום בחדר לפי שנה (מחלקה מאוגדת)",
                wingTotalCaption: "סה״כ ממוצע ליום בחדר בכל השנים בשורה זו",
            },
        );
        this.surgeriesPerDayChartColumns = spdTip.columns;
        this.surgeriesPerDayChartData = spdTip.data;
        this.surgeriesPerDayChartOptions = spdTip.options;
    }

    /** לאחר בניית נתוני העמודות — עיצוב לפי מצב הדשבורד (ניצולת חדר מול זמני חדר). */
    private finalizeSurgeriesPerDayChartPresentation(): void {
        if (
            this.mainMetricMode === "room-utilization" &&
            this.roomUtilizationSubChart === "surgeriesPerDay"
        ) {
            this.applyUtilizationSurgeriesPerDayChartLook();
            this.applySideTableFromWingYearChart(
                this.surgeriesPerDayChartColumns,
                this.surgeriesPerDayChartData,
                "decimal2",
            );
            return;
        }
        this.surgeriesPerDayChartOptions =
            this.getRoomTimesSurgeriesPerDayGoogleOptionsBase() as any;
        const spdTip = this.patchGoogleChartHtmlTooltips(
            this.surgeriesPerDayChartColumns,
            this.surgeriesPerDayChartData,
            this.surgeriesPerDayChartOptions,
            {
                multiYearValueSuffix: "ממוצע ליום בחדר",
                multiYearShowTotal: false,
            },
        );
        this.surgeriesPerDayChartColumns = spdTip.columns;
        this.surgeriesPerDayChartData = spdTip.data;
        this.surgeriesPerDayChartOptions = spdTip.options;
        if (this.mainMetricMode === "room-times") {
            this.refreshRoomTimesSideTableFromCurrentView();
        }
    }

    private loadSurgeriesPerDay(): void {
        const baseYear =
            this.getLatestYearFromDeptData() || this.currentYear.toString();
        const depCacheKey = this.depRoomSurgeriesChartCacheKey(
            baseYear.toString(),
        );
        // אם כבר יש לנו נתונים גולמיים לאותה שנה – נבנה רק את הגרף מחדש בלי קריאת API
        if (
            this.surgeriesPerDayDepRoomRaw.length > 0 &&
            this.lastSurgeriesPerDayCacheKey === depCacheKey
        ) {
            const filteredCached = this.filterBySelectedDiagnosis(
                this.surgeriesPerDayDepRoomRaw,
            );
            this.buildSurgeriesPerDayChart(filteredCached);
            this.finalizeSurgeriesPerDayChartPresentation();
            this.isSurgeriesPerDayLoading = false;
            this.initializeCompareDepartmentDefaults();
            this.refreshCompareDepartmentsLineChart();
            this.cdr.detectChanges();
            return;
        }

        // מניעה בסיסית נוספת: אם הגרף עצמו כבר בנוי לאותה שנה ואין צורך ברענון
        if (
            this.surgeriesPerDayChartData.length > 0 &&
            this.lastSurgeriesPerDayCacheKey === depCacheKey
        ) {
            this.finalizeSurgeriesPerDayChartPresentation();
            this.isSurgeriesPerDayLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.isSurgeriesPerDayLoading = true;
        this.surgeriesPerDayData = [];
        this.surgeriesPerDayChartColumns = [];
        this.surgeriesPerDayChartData = [];

        this.asmxGet(
                environment.url + "GetDepRoomFiveYears_pci_dashborad",
                {
                    params: { baseYear: baseYear.toString() },
                },
            )
            .subscribe(
                (response) => {
                    const list =
                        this.parseDepRoomFiveYearsApiResponse(response);
                    this.surgeriesPerDayDepRoomRaw = list;
                    const filtered = this.filterBySelectedDiagnosis(list);
                    this.buildSurgeriesPerDayChart(filtered);
                    this.finalizeSurgeriesPerDayChartPresentation();
                    this.lastSurgeriesPerDayYear = baseYear;
                    this.lastSurgeriesPerDayCacheKey = depCacheKey;
                    this.isSurgeriesPerDayLoading = false;
                    this.initializeCompareDepartmentDefaults();
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetDepRoomFiveYears_pci_dashborad:",
                        error,
                    );
                    this.isSurgeriesPerDayLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת צינתורים ליום בחדר",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }

    private buildSurgeriesPerDayChart(rows: RoomsStatsDepRoomDto[]): void {
        if (!rows || rows.length === 0) {
            this.surgeriesPerDayChartColumns = [];
            this.surgeriesPerDayChartData = [];
            this.surgeriesPerDayChartYears = [];
            return;
        }
        const allYears = Array.from(
            new Set(rows.map((r) => r.Year).filter((y) => y != null)),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.surgeriesPerDayChartYears = years;

        this.surgeriesPerDayChartColumns = ["מחלקה מאוגדת (Wing)"];
        years.forEach((y) => {
            this.surgeriesPerDayChartColumns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });

        // GetDepRoomFiveYears: weighted average per Wing+year (FullDays / WorkDays); several departments may share a wing.
        type Agg = {
            sumWeighted: number;
            weight: number;
            simpleSum: number;
            simpleCount: number;
        };
        const wingYearAgg = new Map<string, Agg>();

        for (const r of rows) {
            const wing = (r.Wing || "לא צוין").trim();
            const year = r.Year;
            if (!years.includes(year)) {
                continue;
            }
            const avgVal = this.pickSurgeriesPerDayAvgFromDepRoomRow(r);
            if (avgVal == null || !Number.isFinite(avgVal)) {
                continue;
            }
            const wgt = this.depRoomWeightForAggregation(r);
            const key = `${wing}\t${year}`;
            const prev = wingYearAgg.get(key) ?? {
                sumWeighted: 0,
                weight: 0,
                simpleSum: 0,
                simpleCount: 0,
            };
            if (wgt > 0) {
                prev.sumWeighted += avgVal * wgt;
                prev.weight += wgt;
            } else {
                prev.simpleSum += avgVal;
                prev.simpleCount += 1;
            }
            wingYearAgg.set(key, prev);
        }

        const wingSet = new Set<string>();
        for (const r of rows) {
            wingSet.add((r.Wing || "לא צוין").trim());
        }

        const dataMap = new Map<string, any[]>();
        for (const wing of wingSet) {
            const newRow: any[] = [wing];
            years.forEach(() => newRow.push(null, null));
            dataMap.set(wing, newRow);
        }

        for (const wing of wingSet) {
            for (let yi = 0; yi < years.length; yi++) {
                const year = years[yi];
                const a = wingYearAgg.get(`${wing}\t${year}`);
                let finalAvg: number | null = null;
                if (a) {
                    if (a.weight > 0) {
                        finalAvg = a.sumWeighted / a.weight;
                    } else if (a.simpleCount > 0) {
                        finalAvg = a.simpleSum / a.simpleCount;
                    }
                }
                if (finalAvg == null || !Number.isFinite(finalAvg)) {
                    continue;
                }
                const rounded = Math.round(finalAvg * 100) / 100;
                const formatted = rounded.toFixed(2);
                const row = dataMap.get(wing)!;
                const valueColIndex = 1 + yi * 2;
                const annotationColIndex = valueColIndex + 1;
                row[valueColIndex] = { v: rounded, f: formatted };
                row[annotationColIndex] = formatted;
            }
        }

        const wings = Array.from(dataMap.keys())
            .filter((w) => w !== "אחר" && w !== "קרדיולוגיה")
            .sort((a, b) => {
                const ia = this.orderedWings.indexOf(a);
                const ib = this.orderedWings.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b, "he");
            });

        this.surgeriesPerDayChartData = wings.map((wing) => dataMap.get(wing)!);
    }

    /** טעינת גרף ניצולת חדר צינתור (צינתורים ליום בחדר) לפאנל הראשי */
    private loadRoomUtilizationMainChart(): void {
        this.isChartLoading = true;
        this.chartData = [];
        this.chartColumns = [];
        this.chartTableRows = [];

        const baseYear =
            this.getLatestYearFromDeptData() || this.currentYear.toString();
        const ruSpdKey = this.surgeriesPerDayRequestCacheKey(
            baseYear.toString(),
        );

        // אם כבר טענו את הנתונים לשנת בסיס זו – נשתמש במטמון בלבד בלי קריאת API
        if (
            this.roomUtilizationRoomStatsRaw.length > 0 &&
            this.lastRoomUtilizationStatsCacheKey === ruSpdKey
        ) {
            const cachedFiltered = this.filterBySelectedDiagnosis(
                this.roomUtilizationRoomStatsRaw,
            );
            this.buildRoomUtilizationMainChartFromRows(cachedFiltered);
            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.asmxGet(
                environment.url +
                    "GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad",
                {
                    params: this.buildSurgeriesPerDayFiveYearsParams(
                        baseYear.toString(),
                    ),
                },
            )
            .subscribe(
                (response) => {
                    const list =
                        this.parseAvgSurgeriesPerDayApiResponse(response);
                    this.roomUtilizationRoomStatsRaw = list;
                    this.lastSurgeriesPerDayYear = baseYear.toString();
                    this.lastRoomUtilizationStatsCacheKey = ruSpdKey;

                    const filtered = this.filterBySelectedDiagnosis(list);
                    this.buildRoomUtilizationMainChartFromRows(filtered);

                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading main room utilization chart:",
                        error,
                    );
                    this.isChartLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת ניצולת חדר צינתור",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }

    /** בניית גרף ניצולת חדר צינתור (פאנל ראשי) מתוך רשומות שכבר נטענו – ללא קריאת API */
    private buildRoomUtilizationMainChartFromRows(
        filtered: AvgSurgeriesPerDayPerRoomDto[],
    ): void {
        if (!filtered || filtered.length === 0) {
            this.chartData = [];
            this.chartColumns = [];
            this.chartTableRows = [];
            return;
        }

        const allYears = Array.from(
            new Set(filtered.map((r) => r.Year).filter((y) => y != null)),
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
                totalsByYear.set(
                    year,
                    (totalsByYear.get(year) || 0) + openRooms,
                );
            }

            this.chartColumns = [
                "שנה",
                { type: "number", label: 'סה"כ חדרים לשנה' },
                { type: "string", role: "annotation" },
            ];

            this.chartData = years.map((year) => {
                const value = totalsByYear.get(year) || 0;
                const intVal = Math.round(value);
                const formatted = String(intVal);
                return [
                    year.toString(),
                    { v: intVal, f: formatted },
                    formatted,
                ];
            });

            // טבלה: שורה אחת "סה\"כ חדרים לשנה" עם ערכים לכל שנה + שינוי ביחס לשנה הקודמת
            const perYear: { [year: number]: number } = {};
            let grandTotal = 0;
            years.forEach((y) => {
                const v = totalsByYear.get(y) || 0;
                perYear[y] = v;
                grandTotal += v;
            });

            const { diff, pct } = this.computeDiffAndPct(perYear, years);
            this.chartTableRows = [
                {
                    label: 'סה"כ חדרים לשנה',
                    total: grandTotal,
                    perYear,
                    diff,
                    pct,
                },
            ];
            this.sideTableValueFormat = "decimal2";
            this.syncYearlyTotalsFromChartTableRows();

            this.chartType = "ColumnChart";
            this.chartOptions = {
                ...this.chartOptions,
                title: "",
                vAxis: {
                    ...(this.chartOptions.vAxis || {}),
                    title: 'סה"כ חדרים לשנה',
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

            const ruYearTip = this.patchGoogleChartHtmlTooltips(
                this.chartColumns,
                this.chartData,
                this.chartOptions,
                this.getRoomUtilizationTooltipPatchContext(),
            );
            this.chartColumns = ruYearTip.columns;
            this.chartData = ruYearTip.data;
            this.chartOptions = ruYearTip.options;

            return;
        }

        // מצב 2 (קיים): חדרים לפי מחלקה מאוגדת (Wing) ושנה
        const columns: any[] = ["מחלקה מאוגדת (Wing)"];
        years.forEach((y) => {
            columns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });
        this.chartColumns = columns;

        // אגרגציה מחדש לפי מחלקה מאוגדת ושנה: חדרים, חדרים פתוחים/סוגרים וימים מלאים
        const wingYearMap = new Map<
            string,
            Map<
                number,
                {
                    roomsTotal: number;
                    roomsOpen: number;
                    roomsClose: number;
                    fullDays: number;
                }
            >
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
            const prev = yearMap.get(year) || {
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
                const intVal = Math.round(value);
                const formatted = String(intVal);
                series.push({ v: intVal, f: formatted }, formatted);
                perYear[year] = intVal;
                total += intVal;
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
        this.sideTableValueFormat = "decimal2";
        this.syncYearlyTotalsFromChartTableRows();

        this.chartType = "ColumnChart";
        this.chartOptions = {
            ...this.chartOptions,
            title: "",
            vAxis: {
                ...(this.chartOptions.vAxis || {}),
                title: this.getRoomStatsChartVAxisTitle(),
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

        const ruWingTip = this.patchGoogleChartHtmlTooltips(
            this.chartColumns,
            this.chartData,
            this.chartOptions,
            this.getRoomUtilizationTooltipPatchContext(),
        );
        this.chartColumns = ruWingTip.columns;
        this.chartData = ruWingTip.data;
        this.chartOptions = ruWingTip.options;
    }

    /**
     * פרמטרים ל-APIs קבוצה 2 (כניסה בוקר / סיום / SETUP): במצב זמני חדר ללא פילטרי סיידבר.
     */
    private buildGroup2KpiParamsForCurrentView(): { [key: string]: string } {
        if (this.mainMetricMode === "room-times") {
            const baseYearForKpi =
                this.getLatestYearFromDeptData() || this.currentYear.toString();
            return {
                baseYear: baseYearForKpi,
                surgeryType: "",
                shift: "",
                site: "",
                weekend: "",
                morningWork: "",
                department: "",
            };
        }
        return this.buildKpiFilterParams();
    }

    /**
     * פרמטרים ל־GetMonthlyCounts_pci_dashborad — זהים ללוגיקת buildKpiFilterParams + רשימת חדרים (כמו סינון ב־updateChartData).
     */
    private buildMonthlyCountsApiParams(): { [key: string]: string } {
        const kpi = this.buildKpiFilterParams();
        const rooms =
            this.selectedRooms && this.selectedRooms.length > 0
                ? this.selectedRooms.join(",")
                : "";
        return {
            ...kpi,
            rooms,
        };
    }

    /** מפתח מטמון דטרמיניסטי לקריאות חודשיות (משתנה כשמשנים פילטר / שנת בסיס). */
    private monthlyCountsParamsCacheKey(params: {
        [key: string]: string;
    }): string {
        return Object.keys(params)
            .sort()
            .map((k) => `${k}=${params[k] ?? ""}`)
            .join("|");
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
                this.selectedSurgeryTypes &&
                this.selectedSurgeryTypes.length > 0
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
            department: this.chartDepartmentFilter
                ? this.chartDepartmentFilter
                : this.selectedDepartments &&
                    this.selectedDepartments.length > 0
                  ? this.selectedDepartments.join(",")
                  : "",
        };

        // weekend – אם סונן ל"אמצע שבוע" / "סופ״ש" נדרוס את ברירת המחדל הריקה
        if (this.selectedWeekdays && this.selectedWeekdays.length === 1) {
            const only = this.selectedWeekdays[0];
            if (only === "אמצע שבוע") {
                params.weekend = "false";
            } else if (only === "סופ״ש") {
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
        } else if (
            this.selectedDiagnosis &&
            this.selectedDiagnosis !== "כל האתרים"
        ) {
            params.site = this.selectedDiagnosis;
        } else {
            params.site = "";
        }

        return params;
    }

    /**
     * פרמטרים ל־GetAvgSurgeriesPerDayPerRoomFiveYears: בוקר + אמצע שבוע + עבודת בוקר (כמו מדדי זמן בקבוצה 2).
     * אם השרת מתעלם מפרמטרים — הסינון נשאר בצד הלקוח ע״י שימוש ב־RoomsOpen ובתווית המדד.
     */
    private surgeriesPerDayRequestCacheKey(baseYear: string): string {
        return JSON.stringify(
            this.buildSurgeriesPerDayFiveYearsParams(baseYear),
        );
    }

    private buildSurgeriesPerDayFiveYearsParams(baseYear: string): {
        [key: string]: string;
    } {
        const params: { [key: string]: string } = {
            baseYear: baseYear.toString(),
            weekend: "false",
            morningWork: "true",
            shift: "בוקר",
        };
        if (!this.sidebarFiltersNonApplicableForRoomCharts()) {
            if (this.selectedSites && this.selectedSites.length > 0) {
                params.site = this.selectedSites.join(",");
            } else if (
                this.selectedDiagnosis &&
                this.selectedDiagnosis !== "כל האתרים"
            ) {
                params.site = this.selectedDiagnosis;
            }
        }
        return params;
    }

    /**
     * תגובת ASMX: לעיתים `{ d: [...] }` או מחרוזת JSON; השדות ב-PascalCase או ב-camelCase.
     */
    private parseAvgSurgeriesPerDayApiResponse(
        response: unknown,
    ): AvgSurgeriesPerDayPerRoomDto[] {
        let raw: any = response;
        if (raw && typeof raw === "object" && raw.d != null) {
            raw = raw.d;
        }
        if (typeof raw === "string") {
            try {
                raw = JSON.parse(raw);
            } catch {
                return [];
            }
        }
        if (!Array.isArray(raw)) {
            return [];
        }
        const out: AvgSurgeriesPerDayPerRoomDto[] = [];
        for (const item of raw) {
            if (!item || typeof item !== "object") {
                continue;
            }
            const y = item.Year ?? item.year;
            if (y == null || y === "") {
                continue;
            }
            const year = Number(y);
            if (!Number.isFinite(year)) {
                continue;
            }
            const avgRaw = item.AvgSurgeries ?? item.avgSurgeries;
            const avgNum =
                avgRaw == null || avgRaw === "" ? NaN : Number(avgRaw);
            out.push({
                Year: year,
                Site: String(item.Site ?? item.site ?? ""),
                Department: String(item.Department ?? item.department ?? ""),
                Wing: String(item.Wing ?? item.wing ?? ""),
                AvgSurgeries: Number.isFinite(avgNum) ? avgNum : NaN,
                RoomsTotal:
                    Number(item.RoomsTotal ?? item.roomsTotal ?? 0) || 0,
                RoomsOpen: Number(item.RoomsOpen ?? item.roomsOpen ?? 0) || 0,
                RoomsClose:
                    Number(item.RoomsClose ?? item.roomsClose ?? 0) || 0,
                FullDays: Number(item.FullDays ?? item.fullDays ?? 0) || 0,
            });
        }
        return out;
    }

    /**
     * GetDepRoomFiveYears_pci_dashborad — תגובת ASMX (d / JSON / camelCase).
     */
    private parseDepRoomFiveYearsApiResponse(
        response: unknown,
    ): RoomsStatsDepRoomDto[] {
        let raw: any = response;
        if (raw && typeof raw === "object" && raw.d != null) {
            raw = raw.d;
        }
        if (typeof raw === "string") {
            try {
                raw = JSON.parse(raw);
            } catch {
                return [];
            }
        }
        if (!Array.isArray(raw)) {
            return [];
        }
        const out: RoomsStatsDepRoomDto[] = [];
        for (const item of raw) {
            if (!item || typeof item !== "object") {
                continue;
            }
            const row = item as Record<string, unknown>;
            const y = this.readDepRoomNumber(row, "Year", "year");
            if (y == null) {
                continue;
            }
            out.push({
                Year: y,
                Site: String(row["Site"] ?? row["site"] ?? ""),
                Department: String(
                    row["Department"] ?? row["department"] ?? "",
                ),
                Wing: String(row["Wing"] ?? row["wing"] ?? ""),
                WorkDays:
                    this.readDepRoomNumber(row, "WorkDays", "workDays") ??
                    undefined,
                FullDays:
                    this.readDepRoomNumber(row, "FullDays", "fullDays") ??
                    undefined,
                Surgeries:
                    this.readDepRoomNumber(row, "Surgeries", "surgeries") ??
                    undefined,
                AvgSurgeries:
                    this.readDepRoomNumber(
                        row,
                        "AvgSurgeries",
                        "avgSurgeries",
                    ) ?? undefined,
                AvgSurgeriesPerOpenRoomDay:
                    this.readDepRoomNumber(
                        row,
                        "AvgSurgeriesPerOpenRoomDay",
                        "avgSurgeriesPerOpenRoomDay",
                    ) ?? undefined,
                RoomsOpenDays:
                    this.readDepRoomNumber(
                        row,
                        "RoomsOpenDays",
                        "roomsOpenDays",
                    ) ?? undefined,
                RoomsTotal:
                    this.readDepRoomNumber(row, "RoomsTotal", "roomsTotal") ??
                    undefined,
                RoomsOpen:
                    this.readDepRoomNumber(row, "RoomsOpen", "roomsOpen") ??
                    undefined,
                RoomsClose:
                    this.readDepRoomNumber(row, "RoomsClose", "roomsClose") ??
                    undefined,
            });
        }
        return out;
    }

    private depRoomSurgeriesChartCacheKey(baseYear: string): string {
        return JSON.stringify({
            source: "GetDepRoomFiveYears",
            baseYear: baseYear.toString(),
        });
    }

    /** ממוצע צינתורים ליום בחדר משורת GetDepRoomFiveYears */
    private pickSurgeriesPerDayAvgFromDepRoomRow(
        r: RoomsStatsDepRoomDto,
    ): number | null {
        if (r.AvgSurgeries != null && Number.isFinite(r.AvgSurgeries)) {
            return r.AvgSurgeries;
        }
        if (
            r.AvgSurgeriesPerOpenRoomDay != null &&
            Number.isFinite(r.AvgSurgeriesPerOpenRoomDay)
        ) {
            return r.AvgSurgeriesPerOpenRoomDay;
        }
        const surg = r.Surgeries;
        const denom =
            r.FullDays != null && r.FullDays > 0
                ? r.FullDays
                : r.WorkDays != null && r.WorkDays > 0
                  ? r.WorkDays
                  : 0;
        if (surg != null && Number.isFinite(surg) && denom > 0) {
            return surg / denom;
        }
        return null;
    }

    /** משקל לאגרגציה לפי Wing+שנה — ימים ללא פיצול או ימי עבודה */
    private depRoomWeightForAggregation(r: RoomsStatsDepRoomDto): number {
        const fd = r.FullDays ?? 0;
        if (fd > 0) {
            return fd;
        }
        const wd = r.WorkDays ?? 0;
        return wd > 0 ? wd : 0;
    }

    /** כותרת ציר ערכים לגרף מדדי חדרים (לא ממוצע צינתורים) */
    private getRoomStatsChartVAxisTitle(): string {
        if (this.roomStatsViewMode === "yearTotal") {
            return 'סה"כ חדרים לשנה';
        }
        switch (this.roomStatsMetric) {
            case "open":
                return "חדרים פתוחים (ימי דיווח)";
            case "close":
                return "חדרים סוגרים (ימי דיווח)";
            case "fullDays":
                return "ימים מלאים (ללא פיצול)";
            case "total":
            default:
                return 'סה"כ חדרים (מצטבר)';
        }
    }

    /**
     * Build query parameters for GetAvgDurationFiveYears_pci_dashborad (room-times KPI)
     * based on dashboard filters. Backend expects single values; when multi-selected we skip that filter.
     */
    private buildAvgDurationFiveYearsParams(): { [key: string]: string } {
        const baseYearForKpi =
            this.getLatestYearFromDeptData() || this.currentYear.toString();

        if (this.mainMetricMode === "room-times") {
            return { baseYear: baseYearForKpi };
        }

        const params: { [key: string]: string } = {
            baseYear: baseYearForKpi,
        };

        if (this.selectedSites && this.selectedSites.length === 1) {
            params.site = this.selectedSites[0];
        }

        if (this.selectedRooms && this.selectedRooms.length === 1) {
            params.room = this.selectedRooms[0];
        }

        if (
            this.selectedSurgeryTypes &&
            this.selectedSurgeryTypes.length === 1
        ) {
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
        return (
            this.getLatestYearFromDeptData() || this.currentYear.toString()
        ).toString();
    }

    /**
     * שורה "גסה" = ללא פירוט שמייצר כפילות מול שורת סה״כ (חדר / משמרת / סופ״ש / סוג צינתור).
     * כשמשווים לפי משמרת או סוג — המימד הזה כבר חלק מהסלייס ולא נחשב כפירוט.
     */
    private isAvgDurationCoarseRow(
        r: AvgDurationFiveYearsDto,
        ctx?: {
            treatShiftAsLocked?: boolean;
            treatWeekendAsLocked?: boolean;
            treatSurgeryTypeAsLocked?: boolean;
        },
    ): boolean {
        const c = ctx || {};
        if ((r.Room ?? "").trim()) {
            return false;
        }
        if (!(c.treatShiftAsLocked ?? false) && (r.Shift ?? "").trim()) {
            return false;
        }
        if (
            !(c.treatWeekendAsLocked ?? false) &&
            (r.WeekendType ?? "").trim()
        ) {
            return false;
        }
        if (!(c.treatSurgeryTypeAsLocked ?? false)) {
            const st =
                (r.SurgeryType ?? "").trim() ||
                (r.UnifiedSurgeryType ?? "").trim();
            if (st) {
                return false;
            }
        }
        return true;
    }

    /**
     * לכל מקבץ (מפתח), אם יש שורות גסות — משתמשים רק בהן; אחרת מניחים שהפירוט מחלק את הצינתורים בלי כפל.
     */
    private filterAvgDurationRowsNoApiDoubleCount(
        rows: AvgDurationFiveYearsDto[],
        groupKey: (r: AvgDurationFiveYearsDto) => string,
        isCoarse: (r: AvgDurationFiveYearsDto) => boolean,
    ): AvgDurationFiveYearsDto[] {
        const groups = new Map<string, AvgDurationFiveYearsDto[]>();
        for (const r of rows) {
            const k = groupKey(r);
            if (!groups.has(k)) {
                groups.set(k, []);
            }
            groups.get(k)!.push(r);
        }
        const out: AvgDurationFiveYearsDto[] = [];
        for (const list of groups.values()) {
            const coarseList = list.filter(isCoarse);
            out.push(...(coarseList.length > 0 ? coarseList : list));
        }
        return out;
    }

    private getAvgDurationCompareDedupeCtx():
        | { treatShiftAsLocked?: boolean; treatSurgeryTypeAsLocked?: boolean }
        | undefined {
        const f = this.avgDurationCompareDimension;
        if (f === "Shift") {
            return { treatShiftAsLocked: true };
        }
        if (f === "SurgeryType") {
            return { treatSurgeryTypeAsLocked: true };
        }
        return undefined;
    }

    private matchesRoomTimesFilters(row: {
        Site?: string | null;
        Wing?: string | null;
        Room?: string | null;
        SurgeryType?: string | null;
        Shift?: string | null;
        WeekendType?: string | null;
    }): boolean {
        if (this.sidebarFiltersNonApplicableForRoomCharts()) {
            return true;
        }

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
            | "room",
    ): boolean {
        if (this.sidebarAdvancedFiltersDisabledForCurrentChart()) {
            return true;
        }

        // Default (main surgeries metrics) – all current filters are enabled.
        return false;
    }

    private filterBySelectedDiagnosis<
        T extends { Site?: string; Wing?: string },
    >(rows: T[]): T[] {
        let result = rows;

        // סינון לפי אתר (Site) מתוך הסיידבר – רלוונטי במיוחד ל‑GetAvgSurgeriesPerDayPerRoomFiveYears_pci_dashborad
        if (
            !this.sidebarFiltersNonApplicableForRoomCharts() &&
            this.selectedSites &&
            this.selectedSites.length > 0
        ) {
            result = result.filter(
                (r) => r.Site && this.selectedSites.includes(r.Site.trim()),
            );
        }

        if (!this.selectedDiagnosis || this.selectedDiagnosis === "כל האתרים") {
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
                .filter((r) => this.matchesRoomTimesFilters(r))
                .filter(
                    (r) =>
                        !this.avgDurationSiteFilter ||
                        this.avgDurationSiteFilter === "ALL" ||
                        r.Site === this.avgDurationSiteFilter,
                );

            this.buildAvgDurationFiveYearsChart(filtered);
            const avgDurCachedTip = this.patchGoogleChartHtmlTooltips(
                this.avgDurationChartColumns,
                this.avgDurationChartData,
                this.avgDurationChartOptions,
                { multiYearValueSuffix: "", multiYearShowTotal: false },
            );
            this.avgDurationChartColumns = avgDurCachedTip.columns;
            this.avgDurationChartData = avgDurCachedTip.data;
            this.avgDurationChartOptions = avgDurCachedTip.options;
            this.isAvgDurationLoading = false;
            this.refreshCompareDepartmentsLineChart();
            this.cdr.detectChanges();
            return;
        }

        // Only one API call per baseYear. Everything else happens in client.
        this.isAvgDurationLoading = true;
        this.avgDurationData = [];
        this.avgDurationChartColumns = [];
        this.avgDurationChartData = [];

        this.asmxGet(
                environment.url + "GetAvgDurationFiveYears_pci_dashborad",
                {
                    params: { baseYear },
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    this.avgDurationFiveYearsRawByBaseYear.set(baseYear, list);

                    const filtered = list
                        .filter((r) => this.matchesRoomTimesFilters(r))
                        .filter(
                            (r) =>
                                !this.avgDurationSiteFilter ||
                                this.avgDurationSiteFilter === "ALL" ||
                                r.Site === this.avgDurationSiteFilter,
                        );

                    this.buildAvgDurationFiveYearsChart(filtered);
                    this.avgDurationChartOptions = {
                        title: "",
                        titleTextStyle: {
                            fontSize: 18,
                            bold: true,
                            color: "#1e293b",
                        },
                        chartArea: {
                            width: "90%",
                            height: "60%",
                            left: 50,
                            top: 100, // קריטי! משאיר מקום למספרים המסובבים למעלה
                        },
                        legend: {
                            position: "top",
                            alignment: "end",
                            textStyle: { fontSize: 14, bold: true },
                        },
                        hAxis: {
                            textStyle: {
                                fontSize: 18,
                                bold: true,
                                color: "#334155",
                            },

                            slantedText: true, // ביטלתי את השיפוע למטה כדי שלא יתערבב לך
                            slantedTextAngle: 25,
                            titleTextStyle: {
                                fontSize: 16,
                                bold: true,
                                italic: false,
                            },
                        },
                        vAxis: {
                            title: "משך צינתור ממוצע (דק')",
                            textStyle: { fontSize: 16, bold: true },
                            titleTextStyle: {
                                fontSize: 16,
                                bold: true,
                                italic: false,
                            },
                            viewWindowMode: "maximized",
                        },
                        bar: { groupWidth: "75%" }, //   chartArea: {
                        //     width: '90%',
                        //     height: '60%',
                        //     left: 40,
                        //     top: 50
                        //   },
                        animation: {
                            startup: true,
                            duration: 800,
                            easing: "out",
                        },
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
                                color: "#cbd5e1",
                            },
                        },
                    };
                    const avgDurTip = this.patchGoogleChartHtmlTooltips(
                        this.avgDurationChartColumns,
                        this.avgDurationChartData,
                        this.avgDurationChartOptions,
                        { multiYearValueSuffix: "", multiYearShowTotal: false },
                    );
                    this.avgDurationChartColumns = avgDurTip.columns;
                    this.avgDurationChartData = avgDurTip.data;
                    this.avgDurationChartOptions = avgDurTip.options;
                    this.isAvgDurationLoading = false;
                    this.refreshCompareDepartmentsLineChart();
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetAvgDurationFiveYears_pci_dashborad:",
                        error,
                    );
                    this.isAvgDurationLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת משך צינתור ממוצע",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }
    private formatMinutesToHM(totalMinutes: number): string {
        if (!totalMinutes || totalMinutes <= 0) return "0:00";
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
    }

    private buildAvgDurationFiveYearsChartModel(
        rows: AvgDurationFiveYearsDto[],
        dedupeCtx?: {
            treatShiftAsLocked?: boolean;
            treatWeekendAsLocked?: boolean;
            treatSurgeryTypeAsLocked?: boolean;
        },
    ): { columns: any[]; data: any[]; years: number[] } {
        if (!rows || rows.length === 0) {
            return { columns: [], data: [], years: [] };
        }

        const filteredRows =
            this.avgDurationSiteFilter === "ALL"
                ? rows
                : rows.filter((r) => r.Site === this.avgDurationSiteFilter);

        const dedupedRows = this.filterAvgDurationRowsNoApiDoubleCount(
            filteredRows,
            (r) =>
                `${(r.Wing || "").trim()}|${r.Year}|${(r.Site || "").trim()}`,
            (r) => this.isAvgDurationCoarseRow(r, dedupeCtx),
        );

        const allYears = Array.from(
            new Set(dedupedRows.map((r) => r.Year).filter((y) => y != null)),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);

        const columns: any[] = ["מחלקה מאוגדת (Wing)"];
        years.forEach((y) => {
            columns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });

        const wingYearMap = new Map<
            string,
            Map<number, { sumMin: number; sumCount: number }>
        >();
        for (const r of dedupedRows) {
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

        const data = wings.map((wing) => {
            const yearMap = wingYearMap.get(wing)!;
            const row: any[] = [wing];
            years.forEach((year) => {
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

    private buildAvgDurationFiveYearsChart(
        rows: AvgDurationFiveYearsDto[],
    ): void {
        if (!rows || rows.length === 0) {
            this.avgDurationChartColumns = [];
            this.avgDurationChartData = [];
            this.avgDurationChartYears = [];
            this.refreshRoomTimesSideTableFromCurrentView();
            return;
        }
        // סינון לפי אתר במידת הצורך (ALL = כל האתרים)
        const filteredRows =
            this.avgDurationSiteFilter === "ALL"
                ? rows
                : rows.filter((r) => r.Site === this.avgDurationSiteFilter);

        const dedupedForAvg = this.filterAvgDurationRowsNoApiDoubleCount(
            filteredRows,
            (r) =>
                `${(r.Wing || "").trim()}|${r.Year}|${(r.Site || "").trim()}`,
            (r) => this.isAvgDurationCoarseRow(r),
        );

        const allYears = Array.from(
            new Set(dedupedForAvg.map((r) => r.Year).filter((y) => y != null)),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.avgDurationChartYears = years;

        this.avgDurationChartColumns = ["מחלקה מאוגדת (Wing)"];
        years.forEach((y) => {
            this.avgDurationChartColumns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });

        // אגרגציה מחדש ברמת Wing+Year: ממוצע משוקלל לפי Count מכל האתרים/מקורות
        const wingYearMap = new Map<
            string,
            Map<number, { sumMin: number; sumCount: number }>
        >();
        for (const r of dedupedForAvg) {
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
        wings.forEach((wing) => {
            const yearMap = wingYearMap.get(wing)!;
            const row: any[] = [wing];
            years.forEach((year) => {
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

        this.avgDurationChartData = wings.map((wing) => dataMap.get(wing)!);
        this.refreshRoomTimesSideTableFromCurrentView();
    }

    private loadAvgFirstMorningEntry(): void {
        const kpi = this.buildGroup2KpiParamsForCurrentView();
        const paramsKey = `${kpi.baseYear}|${kpi.surgeryType}|${kpi.shift}|${kpi.site}|${kpi.weekend}|${kpi.department}`;
        if (
            this.firstStartTimeChartData.length > 0 &&
            this.lastAvgFirstMorningEntryParams === paramsKey
        ) {
            this.isFirstStartTimeLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.isFirstStartTimeLoading = true;
        this.firstStartTimeData = [];

        this.asmxGet(
                environment.url + "GetAvgFirstMorningEntry_pci_dashborad",
                {
                    params: kpi,
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    const filtered = this.filterBySelectedDiagnosis(list);

                    // טבלה – תצוגה טקסטואלית (נשמרת למקרה שימוש עתידי, גם אם כרגע לא מוצגת ב-UI)
                    this.firstStartTimeData = filtered.map((r) => ({
                        departmentName: (r.Wing || "").trim() || "לא צוין",
                        valueDisplay:
                            r.AvgEntryTime ||
                            (r.AvgEntryMinutes != null
                                ? this.minutesToTime(r.AvgEntryMinutes)
                                : "-"),
                    }));

                    // גרף רב-שנתי לפי מחלקה (עד 5 שנים אחרונות)
                    this.buildFirstStartTimeChart(filtered);
                    this.lastAvgFirstMorningEntryParams = paramsKey;
                    this.isFirstStartTimeLoading = false;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetAvgFirstMorningEntry_pci_dashborad:",
                        error,
                    );
                    this.isFirstStartTimeLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת זמן כניסה ממוצע",
                        "סגור",
                        { duration: 3000 },
                    );
                },
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
            width: "90%",
            height: "60%",
            left: 40,
            top: 50,
        },
        animation: { startup: true, duration: 800, easing: "out" },
        annotations: {
            alwaysOutside: true,
            textStyle: {
                fontSize: 16,
                bold: true,
                // color: "#000000",
                // auraColor: "none",
            },
        },
    };

    private buildFirstStartTimeChart(rows: AvgFirstEntryRow[]): void {
        if (!rows || rows.length === 0) {
            this.firstStartTimeChartColumns = [];
            this.firstStartTimeChartData = [];
            this.firstStartTimeChartYears = [];
            this.refreshRoomTimesSideTableFromCurrentView();
            return;
        }

        // לוקחים עד 5 שנים אחרונות
        const allYears = Array.from(
            new Set(rows.map((r) => r.Year).filter((y) => y != null)),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.firstStartTimeChartYears = years;

        // עמודה ראשונה = מחלקה, אח"כ עבור כל שנה:
        // עמודת ערך + עמודת אנוטציה (טקסט מעל העמודה)
        const firstStartColumns: any[] = ["מחלקה"];
        years.forEach((y) => {
            firstStartColumns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });
        this.firstStartTimeChartColumns = firstStartColumns;

        // ממוצע משוקלל לפי Count עבור כל מחלקה ושנה
        const deptYearMap = new Map<
            string,
            Map<number, { sumMinutes: number; sumCount: number }>
        >();

        for (const r of rows) {
            if (r.AvgEntryMinutes == null || r.Count == null || r.Count <= 0) {
                continue;
            }
            const dept = (r.Wing || "").trim() || "לא צוין";
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

        this.firstStartTimeChartData = departments.map((dept) => {
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
                series.push({ v: avgMinutes, f: formatted }, formatted);
            }

            return [dept, ...series];
        });

        const fst = this.patchGoogleChartHtmlTooltips(
            this.firstStartTimeChartColumns,
            this.firstStartTimeChartData,
            this.firstStartTimeChartOptions,
            { multiYearValueSuffix: "", multiYearShowTotal: false },
        );
        this.firstStartTimeChartColumns = fst.columns;
        this.firstStartTimeChartData = fst.data;
        this.firstStartTimeChartOptions = fst.options;
        this.refreshRoomTimesSideTableFromCurrentView();
    }

    // נתונים לגרף עמודות רב-שנתי של זמן סיום צינתור אחרון
    lastEndTimeChartColumns: any[] = [];
    lastEndTimeChartData: any[] = [];

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
    private _isLossByWingLoading = false;
    get isLossByWingLoading(): boolean {
        return this._isLossByWingLoading;
    }
    set isLossByWingLoading(v: boolean) {
        if (this._isLossByWingLoading === v) return;
        this._isLossByWingLoading = v;
        if (v) this.startFakeProgress("lossByWing");
        else this.stopFakeProgress("lossByWing");
    }
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
        const kpi = this.buildGroup2KpiParamsForCurrentView();
        const paramsKey = `${kpi.baseYear}|${kpi.surgeryType}|${kpi.shift}|${kpi.site}|${kpi.weekend}|${kpi.department}`;
        if (
            this.lastEndTimeRows.length > 0 &&
            this.lastAvgLastMorningEndParams === paramsKey
        ) {
            this.applyLastEndTimeDisplay();
            this.isLastEndTimeLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.isLastEndTimeLoading = true;
        this.lastEndTimeData = [];

        this.asmxGet(
                environment.url + "GetAvgLastMorningEnd_pci_dashborad",
                {
                    params: kpi,
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    const noCardiology = list.filter(
                        (r) =>
                            (r.Wing || "").trim() !== "קרדיולוגיה" &&
                            (r.Department || "").trim() !== "קרדיולוגיה",
                    );
                    const filtered =
                        this.filterBySelectedDiagnosis(noCardiology);
                    this.lastEndTimeRows = filtered;
                    this.lastAvgLastMorningEndParams = paramsKey;
                    this.applyLastEndTimeDisplay();

                    this.isLastEndTimeLoading = false;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetAvgLastMorningEnd_pci_dashborad:",
                        error,
                    );
                    this.isLastEndTimeLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת זמן סיום ממוצע",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }

    private buildLastEndTimeChart(
        rows: AvgLastEndRow[],
        useExcludingOverflow = false,
    ): void {
        if (!rows || rows.length === 0) {
            this.lastEndTimeChartColumns = [];
            this.lastEndTimeChartData = [];
            this.lastEndTimeChartYears = [];
            this.refreshRoomTimesSideTableFromCurrentView();
            return;
        }

        const getMinutes = (r: AvgLastEndRow): number | null | undefined =>
            useExcludingOverflow
                ? this.getLastEndExcludingOverflow(r).avgMinutes
                : r.AvgEndMinutes;
        const getCount = (r: AvgLastEndRow): number =>
            useExcludingOverflow
                ? this.getLastEndExcludingOverflow(r).count
                : (r.Count ?? 0);

        // לוקחים עד 5 שנים אחרונות
        const allYears = Array.from(
            new Set(rows.map((r) => r.Year).filter((y) => y != null)),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.lastEndTimeChartYears = years;

        const lastEndColumns: any[] = ["מחלקה"];
        years.forEach((y) => {
            lastEndColumns.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });
        this.lastEndTimeChartColumns = lastEndColumns;

        // ממוצע משוקלל לפי Count (או ימים ללא גלישה) עבור כל מחלקה ושנה
        const deptYearMap = new Map<
            string,
            Map<number, { sumMinutes: number; sumCount: number }>
        >();

        for (const r of rows) {
            const minutes = getMinutes(r);
            const count = getCount(r);
            if (minutes == null || count <= 0) {
                continue;
            }
            const dept = (r.Wing || "").trim() || "לא צוין";
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

        this.lastEndTimeChartData = departments.map((dept) => {
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
                series.push({ v: avgMinutes, f: formatted }, formatted);
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
                textStyle: { fontSize: 14, bold: true },
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
                title: "ממוצע זמן סיום צינתור אחרון (שעה)",
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
                width: "90%",
                height: "60%",
                left: 40,
                top: 50,
            },
            animation: { startup: true, duration: 800, easing: "out" },
            annotations: {
                alwaysOutside: true,
                textStyle: {
                    fontSize: 14,
                    rotation: -90,
                    bold: true,
                },
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
        const letip = this.patchGoogleChartHtmlTooltips(
            this.lastEndTimeChartColumns,
            this.lastEndTimeChartData,
            this.lastEndTimeChartOptions,
            { multiYearValueSuffix: "", multiYearShowTotal: false },
        );
        this.lastEndTimeChartColumns = letip.columns;
        this.lastEndTimeChartData = letip.data;
        this.lastEndTimeChartOptions = letip.options;
        this.refreshRoomTimesSideTableFromCurrentView();
    }

    private loadLossByWingPerDay(): void {
        const baseYear = this.getBaseYearForRoomTimes();

        const raw = this.lossByWingYearRawByBaseYear.get(baseYear);
        if (raw && raw.length > 0) {
            const filtered = raw.filter((r) =>
                this.matchesRoomTimesFilters({
                    Site: r.Site,
                    Wing: r.Wing,
                    Room: r.Room,
                    SurgeryType: r.SurgeryType,
                    Shift: r.Shift,
                    WeekendType: r.WeekendType,
                }),
            );

            this.lossByWingRowsCache = filtered;
            this.buildLossByWingChart(filtered);
            this.isLossByWingLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.isLossByWingLoading = true;

        // Only one API call per baseYear; filter locally afterwards.
        this.asmxGet(
                environment.url + "GetLossByWingYear_pci_dashborad",
                {
                    params: { baseYear },
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    this.lossByWingYearRawByBaseYear.set(baseYear, list);

                    const filtered = list.filter((r) =>
                        this.matchesRoomTimesFilters({
                            Site: r.Site,
                            Wing: r.Wing,
                            Room: r.Room,
                            SurgeryType: r.SurgeryType,
                            Shift: r.Shift,
                            WeekendType: r.WeekendType,
                        }),
                    );

                    this.lossByWingRowsCache = filtered;
                    this.buildLossByWingChart(filtered);
                    this.isLossByWingLoading = false;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetLossByWingYear_pci_dashborad:",
                        error,
                    );
                    this.isLossByWingLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת זמן אבוד ליום",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }

    private buildLossByWingChart(rows: LossByWingYearDto[]): void {
        if (!rows || rows.length === 0) {
            this.lossByWingChartColumns = [];
            this.lossByWingChartData = [];
            this.lossByWingChartYears = [];
            this.refreshRoomTimesSideTableFromCurrentView();
            return;
        }

        // כל השנים בדיוק כפי שהשרת החזיר – מומרים למספרים
        const years = Array.from(new Set(rows.map((r) => Number(r.Year)))).sort(
            (a, b) => a - b,
        );
        this.lossByWingChartYears = years;

        // מחלקות (Wing) ממוינות לפי סדר ידוע אם קיים
        const wings = Array.from(
            new Set(rows.map((r) => (r.Wing || "לא צוין").trim())),
        ).sort((a, b) => {
            const ia = this.orderedWings.indexOf(a);
            const ib = this.orderedWings.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b, "he");
        });

        // כותרות: מחלקה + (לכל שנה: value + annotation)
        const cols: any[] = ["מחלקה"];
        years.forEach((y) => {
            cols.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });
        this.lossByWingChartColumns = cols;

        const byWingYear = new Map<
            string,
            Map<number, { min: number; label: string }>
        >();
        rows.forEach((r) => {
            const wing = (r.Wing || "").trim() || "לא צוין";
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
                byWingYear.set(
                    wing,
                    new Map<number, { min: number; label: string }>(),
                );
            }

            const label =
                (r.AvgLossTime && r.AvgLossTime.trim()) ||
                this.minutesToTime(val);

            // אם יש כמה רשומות לאותה מחלקה/שנה – האחרונה גוברת; לא עושים ממוצע מחדש
            byWingYear.get(wing)!.set(year, { min: val, label });
        });

        this.lossByWingChartData = wings.map((wing) => {
            const yearMap =
                byWingYear.get(wing) ||
                new Map<number, { min: number; label: string }>();
            const series: any[] = [];

            years.forEach((y) => {
                const entry = yearMap.get(y);
                if (!entry || entry.min == null || isNaN(entry.min)) {
                    series.push(null, null);
                    return;
                }

                const intVal = Math.round(entry.min);
                const label = entry.label || this.minutesToTime(intVal);

                series.push({ v: intVal, f: label }, label);
            });

            return [wing, ...series];
        });

        const lbw = this.patchGoogleChartHtmlTooltips(
            this.lossByWingChartColumns,
            this.lossByWingChartData,
            this.lossByWingChartOptions,
            { multiYearValueSuffix: "דקות", multiYearShowTotal: false },
        );
        this.lossByWingChartColumns = lbw.columns;
        this.lossByWingChartData = lbw.data;
        this.lossByWingChartOptions = lbw.options;
        this.refreshRoomTimesSideTableFromCurrentView();
    }

    private filterApprovedUtilizationBySelectedRoom(
        rows: ApprovedUtilizationDto[],
    ): ApprovedUtilizationDto[] {
        if (
            !this.approvedUtilizationSiteFilter ||
            this.approvedUtilizationSiteFilter === "ALL"
        ) {
            return rows;
        }
        const want = (this.approvedUtilizationSiteFilter as string).trim();
        return rows.filter((r) => (r.Site || "").trim() === want);
    }

    /** סינון סיידבר + אבחנה + חדר צינתור (לגרף מאושר) */
    private pipelineApprovedUtilizationRows(
        rows: ApprovedUtilizationDto[],
    ): ApprovedUtilizationDto[] {
        const a = rows.filter((r) =>
            this.matchesRoomTimesFilters({
                Site: r.Site,
                Wing: r.Wing,
            }),
        );
        const b = this.filterBySelectedDiagnosis(a);
        return this.filterApprovedUtilizationBySelectedRoom(b);
    }

    onApprovedUtilizationSiteFilterChange(value: AvgDurationSiteFilter): void {
        this.approvedUtilizationSiteFilter = value;
        this.refreshApprovedUtilizationChartFromCache();
    }

    /** בונה מחדש מהמטמון; אם אין מטמון — טוען מהשרת */
    private refreshApprovedUtilizationChartFromCache(): void {
        if (this.roomTimesView !== "approvedPerDay") {
            return;
        }
        const baseYear = this.getBaseYearForRoomTimes();
        const raw = this.approvedUtilizationRawByBaseYear.get(baseYear);
        if (!raw || raw.length === 0) {
            this.loadApprovedUtilizationPerDay();
            return;
        }
        this.buildApprovedUtilizationChart(
            this.pipelineApprovedUtilizationRows(raw),
        );
        this.cdr.detectChanges();
    }

    private loadApprovedUtilizationPerDay(): void {
        const baseYear = this.getBaseYearForRoomTimes();

        const raw = this.approvedUtilizationRawByBaseYear.get(baseYear);
        if (raw && raw.length > 0) {
            this.buildApprovedUtilizationChart(
                this.pipelineApprovedUtilizationRows(raw),
            );
            this.isApprovedUtilizationLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.isApprovedUtilizationLoading = true;
        this.approvedUtilizationChartColumns = [];
        this.approvedUtilizationChartData = [];
        this.approvedUtilizationChartYears = [];

        this.asmxGet(
                environment.url + "GetApprovedUtilization_pci_dashborad",
                {
                    params: { baseYear },
                },
            )
            .subscribe(
                (rows) => {
                    const list = Array.isArray(rows) ? rows : [];
                    this.approvedUtilizationRawByBaseYear.set(baseYear, list);

                    this.buildApprovedUtilizationChart(
                        this.pipelineApprovedUtilizationRows(list),
                    );
                    this.isApprovedUtilizationLoading = false;
                    this.cdr.detectChanges();
                },
                (error) => {
                    console.error(
                        "Error loading GetApprovedUtilization_pci_dashborad:",
                        error,
                    );
                    this.isApprovedUtilizationLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open(
                        "❌ שגיאה בטעינת זמן מנוצל ליום",
                        "סגור",
                        { duration: 3000 },
                    );
                },
            );
    }

    private buildApprovedUtilizationChart(
        rows: ApprovedUtilizationDto[],
    ): void {
        if (!rows || rows.length === 0) {
            this.approvedUtilizationChartColumns = [];
            this.approvedUtilizationChartData = [];
            this.approvedUtilizationChartYears = [];
            this.refreshRoomTimesSideTableFromCurrentView();
            return;
        }

        const allYears = Array.from(
            new Set(rows.map((r) => Number(r.Year)).filter((y) => !isNaN(y))),
        ).sort((a, b) => a - b);
        const years = allYears.slice(-5);
        this.approvedUtilizationChartYears = years;

        const siteSet = new Set(
            rows
                .map((r) => (r.Site || "").trim())
                .filter((s) => s.length > 0),
        );
        const singleSiteInData = siteSet.size === 1;
        const cols: any[] = [singleSiteInData ? "מחלקה" : "אתר / מחלקה"];
        years.forEach((y) => {
            cols.push(
                { type: "number", label: y.toString() },
                { type: "string", role: "annotation", label: y.toString() },
            );
        });
        this.approvedUtilizationChartColumns = cols;

        const byWingYear = new Map<
            string,
            Map<number, { min: number; label: string }>
        >();
        for (const r of rows) {
            const site = (r.Site || "").trim() || "לא צוין";
            const wing = (r.Wing || "").trim() || "לא צוין";
            const key = `${site}|${wing}`;
            const year = Number(r.Year);
            if (!years.includes(year)) continue;
            const min = r.AvgApprovedMin;
            if (min == null || !Number.isFinite(min)) continue;
            const label = r.AvgApprovedHHMM
                ? r.AvgApprovedHHMM
                : this.formatMinutesToHM(min);
            if (!byWingYear.has(key)) byWingYear.set(key, new Map());
            byWingYear.get(key)!.set(year, { min, label });
        }

        const parseSiteWingKey = (
            k: string,
        ): { site: string; wing: string } => {
            const i = k.indexOf("|");
            if (i === -1) return { site: "", wing: k };
            return { site: k.slice(0, i), wing: k.slice(i + 1) };
        };

        const wings = Array.from(byWingYear.keys())
            .filter((k) => {
                const { wing } = parseSiteWingKey(k);
                return wing !== "אחר" && wing !== "קרדיולוגיה";
            })
            .sort((a, b) => {
                const { site: siteA, wing: wingA } = parseSiteWingKey(a);
                const { site: siteB, wing: wingB } = parseSiteWingKey(b);
                const ia = this.orderedWings.indexOf(wingA);
                const ib = this.orderedWings.indexOf(wingB);
                if (ia !== -1 && ib !== -1) {
                    if (ia !== ib) return ia - ib;
                    return siteA.localeCompare(siteB, "he");
                }
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                const wcmp = wingA.localeCompare(wingB, "he");
                if (wcmp !== 0) return wcmp;
                return siteA.localeCompare(siteB, "he");
            });

        this.approvedUtilizationChartData = wings.map((key) => {
            const { site, wing } = parseSiteWingKey(key);
            const rowLabel = singleSiteInData ? wing : `${site} – ${wing}`;
            const yearMap =
                byWingYear.get(key) ||
                new Map<number, { min: number; label: string }>();
            const series: any[] = [];

            years.forEach((y) => {
                const v = yearMap.get(y);
                if (!v) {
                    series.push(null, null);
                    return;
                }
                series.push({ v: v.min, f: v.label }, v.label);
            });

            return [rowLabel, ...series];
        });

        const appr = this.patchGoogleChartHtmlTooltips(
            this.approvedUtilizationChartColumns,
            this.approvedUtilizationChartData,
            this.approvedUtilizationChartOptions,
            { multiYearValueSuffix: "", multiYearShowTotal: false },
        );
        this.approvedUtilizationChartColumns = appr.columns;
        this.approvedUtilizationChartData = appr.data;
        this.approvedUtilizationChartOptions = appr.options;
        this.refreshRoomTimesSideTableFromCurrentView();
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
