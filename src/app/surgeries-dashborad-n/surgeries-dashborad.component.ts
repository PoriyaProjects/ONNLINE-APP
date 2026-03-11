import { animate, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
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

export interface AvgLastEndRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgEndTime: string;      // HH:MM
  AvgEndMinutes: number;
}

export interface AvgSetupRow {
  Year: number;
  Site: string;
  Department: string;
  Wing: string;
  Count: number;
  AvgSetupMin: number;
}

export interface TopDepartmentDto {
  DepartmentName: string;
  Income2024: number;
  Income2025: number;
  difference: number;
  percentage: number;
  managerName?: string;
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
export class SurgeriesDashboradComponent implements OnInit, OnDestroy {
    @ViewChild(MatSort) sort!: MatSort;

    // Guide Avatar
    showGuideAvatar = true;
    dontShowGuideAgain = false; // checkbox "אל תציג יותר"
    showArticleShowcase = false;
    currentArticle: string = "";

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
        title: "מעקב ניתוחים לפי חדר",
        titleTextStyle: {
            color: "#0f172a",
            fontSize: 16,
            bold: true,
        },
        hAxis: {
            title: "",
            textStyle: {
                color: "#64748b",
                fontSize: 11,
            },
            slantedText: true,
            slantedTextAngle: 35,
        },
        vAxis: {
            title: "מספר ניתוחים",
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
                color: "#64748b",
                fontSize: 11,
            },
        },
        chartArea: {
            width: "94%",
            height: "80%",
            left: 20,
            top: 30,
        },
        colors: ["#2563eb", "#10b981"],
        backgroundColor: {
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
        },
        dataOpacity: 0.95,
        annotations: {
            alwaysOutside: false,
            textStyle: {
                fontSize: 10,
                bold: true,
                color: "#0f172a",
                fontName: "Segoe UI",
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

    yearsForChart: number[] = [];
    yearlySurgeryTotals: { [year: number]: number } = {};
    yearColorMap: { year: number; color: string }[] = [];
    stackedCategoryLegend: { label: string; color: string }[] = [];

    private readonly orderedWings: string[] = [
        "א.א.ג.",
        "כירורגיה לב",
        "כירורגיה",
        "כירורגיה חזה",
        "אורתופדיה",
        "נשים",
        "קרדיולוגיה",
        "פה ולסת",
        "אורולוגיה",
        "עיניים",
        "פלסטיקה",
        "ילדים",
        "אחר",
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
    chartViewMode: "year-total" | "fund" | "site" | "shift" | "department" | "month" = "year-total";

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
  
    selectedDepartment: DepartmentComparisonDto | null = null;
    selectedDiagnosis: string = "אגף כירורגי";
    isDepartmentGraphOpen = false;
    departmentGraphTitle = "";
    isLoading = false;
    catalogLoading = false;
    isMainDataLoading = false; // Loading for main data table
    isDiagnosesLoading = false; // Loading for diagnoses list
    isChartLoading = false; // Loading for chart data
    selectedViewType: string = "cash";
    chartType: string = "ColumnChart"; // 'ColumnChart' or 'LineChart'

    // Filters for surgeries dashboard (multi‑select)
    surgeryTypeOptions: string[] = ["אלקטיבי", "ססיה", "דחוף"];
    selectedSurgeryTypes: string[] = []; // ריק = הכל

    shiftOptions: string[] = ["בוקר", "ערב", "לילה"];
    selectedShifts: string[] = []; // ריק = הכל

    roomOptions: string[] = [];
    selectedRooms: string[] = []; // ריק = הכל

    departmentOptions: string[] = [];
    selectedDepartments: string[] = []; // ריק = הכל

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
  showAvgDurationModal = false;          // 2.1 משך ניתוח ממוצע לפי מחלקה
  showFirstStartTimeModal = false;       // 2.2 זמן כניסה ממוצע ניתוח ראשון בבוקר לפי מחלקה
  showLastEndTimeModal = false;          // 2.3 זמן סיום ניתוח אחרון לפי מחלקה
  showAvgSetupModal = false;             // 2.4 SETUP ממוצע לפי מחלקה

  isAvgDurationLoading = false;
  isFirstStartTimeLoading = false;
  isLastEndTimeLoading = false;
  isAvgSetupLoading = false;

  avgDurationData: DeptTimeMetricRow[] = [];
  firstStartTimeData: DeptTimeMetricRow[] = [];
  lastEndTimeData: DeptTimeMetricRow[] = [];
  avgSetupData: DeptTimeMetricRow[] = [];

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
    }

    ngOnDestroy(): void {
        document.body.classList.remove('surgeries-dashborad-dark');
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
     */
    loadDepartmentIncomeData(): void {
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
                            this.chartOptions.title = "מעקב ניתוחים לפי חדר";
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
     */
    private loadCountByDept(): void {
        const baseYear = this.currentYear;
        this.isChartLoading = true;

        this.http
            .get<CountByDeptRow[]>(environment.url + "GetCountByDept_surgeries_dashborad", {
                params: { baseYear: baseYear.toString() },
            })
            .subscribe(
                (rows) => {
                    if (Array.isArray(rows)) {
                        this.countByDeptData = rows;
                    } else {
                        this.countByDeptData = [];
                    }
                    this.updateChartData();
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
     * Load 5‑year aggregated counts by month from new API GetMonthlyCounts
     */
    private loadMonthlyCounts(): void {
        const baseYear = this.currentYear;
        this.isChartLoading = true;

        const kpiParams = this.buildKpiFilterParams();

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
            .subscribe(
                (rows) => {
                    if (Array.isArray(rows)) {
                        this.monthlyCountsData = rows;
                    } else {
                        this.monthlyCountsData = [];
                    }
                    this.updateChartData();
                },
                (error) => {
                    console.error("Error loading GetMonthlyCounts data:", error);
                    this.monthlyCountsData = [];
                    this.isChartLoading = false;
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
        const rooms = [...new Set(this.surgeryData.map(s => s.surgeryRoom).filter(Boolean))] as string[];
        this.roomOptions = rooms;

        const depts = [...new Set(this.surgeryData.map(s => (s.departmentMapped || s.department)).filter(Boolean))] as string[];
        this.departmentOptions = depts;
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
     */
    loadDiagnosesList(): void {
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
            this.chartOptions.isStacked = true;
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
            this.chartOptions.pointSize = undefined;
            this.chartOptions.lineWidth = undefined;
            this.chartOptions.curveType = undefined;
        }
    }

    /**
     * Update chart data with numbers formatted in millions with 1 decimal place
     */
    updateChartData(): void {
        // console.log("updateChartData called");
        // console.log("departmentIncomeData:", this.departmentIncomeData);

        this.isChartLoading = true;
        this.yearsForChart = [];
        this.yearlySurgeryTotals = {};
        this.yearColorMap = [];
        this.chartTableRows = [];

        // 1) מקור ראשי לגרף: GetCountByDept (5 שנים אחרונות לפי מחלקה)
        //    מכאן נגזרים כל מצבי התצוגה שמבוססים על ספירות (שנה, מחלקה, אתר, משמרת).
        if (this.countByDeptData && this.countByDeptData.length > 0) {
            let source: CountByDeptRow[] = this.countByDeptData;

            // פילטרים כלליים: סוג ניתוח, חדר, מחלקה, יום בשבוע
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

            if (this.selectedDepartments && this.selectedDepartments.length > 0) {
                source = source.filter(
                    (r) =>
                        !!r.Wing &&
                        this.selectedDepartments.includes(r.Wing.trim())
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

                this.chartOptions.title = "סה\"כ ניתוחים לפי שנה";
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
                this.chartOptions.title = `מספר ניתוחים לפי מחלקה מנתחת מאוגד ל-${lastYear - firstYear + 1} השנים האחרונות (${firstYear}-${lastYear})`;
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
                const sites = Array.from(
                    new Set(
                        source
                            .map((r) => (r.Site || "").trim())
                            .filter((s) => !!s)
                    )
                );

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
                this.chartColumns = columns;

                // גרף: שנה × אתר
                this.chartData = years.map((y) => {
                    const row: any[] = [y.toString()];
                    sites.forEach((site) => {
                        const sumForSite = source
                            .filter((r) => r.Year === y && (r.Site || "").trim() === site)
                            .reduce((acc, r) => acc + (r.Count || 0), 0);
                        row.push(sumForSite, sumForSite > 0 ? String(sumForSite) : "");
                    });
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

                this.chartOptions.title = "סה\"כ ניתוחים לפי שנה ואתר";
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

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }

            // === מצב 4: לפי משמרת – שנה מול משמרת (בוקר/ערב/לילה) ===
            if (this.chartViewMode === "shift") {
                const shifts = Array.from(
                    new Set(
                        source
                            .map((r) => (r.Shift || "").trim())
                            .filter((s) => !!s)
                    )
                );

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
                this.chartColumns = columns;

                // גרף: שנה × משמרת
                this.chartData = years.map((y) => {
                    const row: any[] = [y.toString()];
                    shifts.forEach((shift) => {
                        const sumForShift = source
                            .filter((r) => r.Year === y && (r.Shift || "").trim() === shift)
                            .reduce((acc, r) => acc + (r.Count || 0), 0);
                        row.push(sumForShift, sumForShift > 0 ? String(sumForShift) : "");
                    });
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
                this.chartOptions.title = "סה\"כ ניתוחים לפי שנה ומשמרת";
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

                this.isChartLoading = false;
                this.cdr.detectChanges();
                return;
            }
            if (this.chartViewMode === 'fund') {
                const fundTypesSet = new Set<string>();
                const byFundYear = new Map<string, Map<number, number>>();
              
                source.forEach(r => {
                  const fund = (r.FundType || 'אחר').trim() || 'אחר';
                  fundTypesSet.add(fund);
                  if (!byFundYear.has(fund)) byFundYear.set(fund, new Map());
                  const m = byFundYear.get(fund)!;
                  m.set(r.Year, (m.get(r.Year) || 0) + (r.Count || 0));
                });
              
                const fundTypes = Array.from(fundTypesSet).sort();
                const columns: any[] = ['שנה'];
                fundTypes.forEach(ft => {
                    columns.push({ type: 'number', label: ft });
                    columns.push({ type: 'string', role: 'annotation' });
                });
                this.chartColumns = columns;
                this.chartData = years.map(y => {
                  const row: any[] = [y.toString()];
                  fundTypes.forEach(ft => {
                    const val = byFundYear.get(ft)?.get(y) || 0;
                    row.push(val, val > 0 ? String(val) : '');
                  });
                  return row;
                });
              
                this.chartTableRows = fundTypes.map(fund => {
                  const perYear: { [y: number]: number } = {};
                  let total = 0;
                  years.forEach(y => { const v = byFundYear.get(fund)?.get(y) || 0; perYear[y] = v; total += v; });
                  const { diff, pct } = this.computeDiffAndPct(perYear, years);
                  return { label: fund, total, perYear, diff, pct };
                });
              
                this.chartOptions.title = 'סה"כ ניתוחים לפי שנה וסוג מימון (קרן / מדינה)';

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
                // אם משום מה אין נתונים טעונים (למשל שינוי פילטרים), נטען אותם מחדש
                this.loadMonthlyCounts();
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
            this.chartOptions.title = "ניתוחים לפי חודשים (5 שנים אחרונות)";
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
                    const fund: string = (fundRaw || "אחר").toString().trim() || "אחר";

                    if (!fundByYear.has(year)) {
                        fundByYear.set(year, new Map<string, number>());
                    }
                    const inner = fundByYear.get(year)!;
                    inner.set(fund, (inner.get(fund) || 0) + 1);
                    fundTypesSet.add(fund);
                });

                const yearsArr = Array.from(fundByYear.keys()).sort((a, b) => a - b);
                const fundTypes = Array.from(fundTypesSet.values()).sort();

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
                this.chartOptions.title = "סה\"כ ניתוחים לפי שנה וסוג מימון (קרן / מדינה)";
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
            this.chartOptions.title = `מספר ניתוחים לפי מחלקה ל-${lastYear - firstYear + 1} השנים האחרונות (${firstYear}-${lastYear})`;

            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        if (!this.departmentIncomeData || this.departmentIncomeData.length === 0) {
            this.chartData = [];
            this.isChartLoading = false;
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
        this.isChartLoading = false;
        this.cdr.detectChanges();
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
            (this.selectedWeekdays && this.selectedWeekdays.length > 0)
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
    setChartViewMode(mode: "year-total" | "fund" | "site" | "shift" | "department" | "month"): void {
        if (this.chartViewMode === mode) {
            return;
        }
        this.chartViewMode = mode;
        this.isShiftGroupedView = mode === "shift";

        // כל המצבים יוצגו כתרשים עמודות אנכי (ColumnChart),
        // כאשר במצבי fund/site/shift ההגדרה isStacked תישלט דרך updateChartData.
        if (this.chartType !== "LineChart") {
            this.chartType = "ColumnChart";
        }
        this.updateChartOptionsForType();

        // מצב חודשים תלוי ב‑API ייעודי – טוענים אותו לפני עיבוד נתונים
        if (this.chartViewMode === "month") {
            this.loadMonthlyCounts();
        } else {
            this.updateChartData();
        }
        this.cdr.detectChanges();

        // כפיית רענון / ריסייז של הגרף מיד אחרי החלפת מצב,
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
     * כותרת דינמית מעל הגרף הראשי לפי מצב התצוגה הנוכחי
     */
    getChartViewTitle(): string {
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
            default:
                return "סה\"כ ניתוחים";
        }
    }

    /**
     * טקסט טולטיפ קצר וברור לכל כפתור מצב תצוגה
     */
    getChartViewTooltip(mode: "year-total" | "fund" | "site" | "shift" | "department" | "month"): string {
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
            default:
                return "";
        }
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
        this.chartOptions.title = `השוואת פעילות ניתוחית בין מחלקות - ${olderYear} מול ${latestYear}`;
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

    resetSurgeryFilters(): void {
        this.selectedSurgeryTypes = [];
        this.selectedShifts = [];
        this.selectedRooms = [];
        this.selectedDepartments = [];
        this.selectedWeekdays = [];
        this.applyAllSurgeryFilters();
    }

    private applyAllSurgeryFilters(): void {
        // טבלת הניתוחים מפולטרת רק אם יש לנו נתוני ניתוחים גולמיים
        if (this.surgeryData.length > 0) {
            this.dataSource.data = this.applySurgeryFilter(this.surgeryData);
        }

        // הגרף הראשי תמיד מתעדכן לפי הפילטרים (גם כשאין surgeryData ויש רק CountByDept)
        this.updateChartData();
        this.cdr.detectChanges();
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
                    fontSize: this.chartOptions.hAxis?.textStyle?.fontSize ?? 11,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.hAxis?.titleTextStyle?.fontSize ?? 11,
                    bold: true,
                },
            };
            this.chartOptions.vAxis = {
                ...(this.chartOptions.vAxis || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.vAxis?.textStyle?.fontSize ?? 11,
                },
                titleTextStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.vAxis?.titleTextStyle?.fontSize ?? 12,
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
                    fontSize: this.chartOptions.legend?.textStyle?.fontSize ?? 11,
                },
            };
            this.chartOptions.annotations = {
                ...(this.chartOptions.annotations || {}),
                textStyle: {
                    color: "#f9fafb",
                    fontSize: this.chartOptions.annotations?.textStyle?.fontSize ?? 10,
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

closeAvgSetupModal(): void {
  this.showAvgSetupModal = false;
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
    site:
      this.selectedDiagnosis && this.selectedDiagnosis !== "כל האתרים"
        ? this.selectedDiagnosis
        : "",
    weekend: "",
    department:
      this.selectedDepartments && this.selectedDepartments.length > 0
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

  return params;
}

private filterBySelectedDiagnosis<T extends { Site?: string; Wing?: string }>(rows: T[]): T[] {
  if (!this.selectedDiagnosis || this.selectedDiagnosis === 'כל האתרים') {
    return rows;
  }
  // ה‑API כבר מקבל את הפרמטר site (אגף / אתר) דרך buildKpiFilterParams,
  // לכן אין צורך לבצע סינון נוסף בצד הקליינט – אחרת אנו עלולים להעלים שורות תקינות.
  // מחזירים את כל השורות כפי שהשרת החזיר אותן.
  return rows;
}

private loadAvgDuration(): void {
  const baseYear = this.currentYear;
  this.isAvgDurationLoading = true;
  this.avgDurationData = [];

  this.http
    .get<AvgDurationRow[]>(environment.url + "GetAvgDuration_surgeries_dashborad_filtered", {
      params: this.buildKpiFilterParams(),
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const filtered = this.filterBySelectedDiagnosis(list);
        this.avgDurationData = filtered.map(r => ({
          departmentName: r.Department || r.Wing || "לא צוין",
          valueDisplay: r.AvgDurationMin != null ? r.AvgDurationMin.toFixed(1) : "-",
        }));
        this.isAvgDurationLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error loading GetAvgDuration_surgeries_dashborad:", error);
        this.isAvgDurationLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open("❌ שגיאה בטעינת משך ניתוח ממוצע", "סגור", { duration: 3000 });
      }
    );
}

private loadAvgFirstMorningEntry(): void {
  const baseYear = this.currentYear;
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
  private firstStartTimeYears: number[] = [];

  firstStartTimeChartOptions: any = {
    title: "",
    legend: { position: "top", alignment: "end", textStyle: { fontSize: 11 } },
    hAxis: { textStyle: { fontSize: 10 }, slantedText: true, slantedTextAngle: 25 },
    vAxis: { title: "זמן כניסה ממוצע (HH:MM)", textStyle: { fontSize: 10 } },
    bar: { groupWidth: "60%" },
    chartArea: { width: "90%", height: "80%", left: 40, top: 4 },
    animation: { startup: true, duration: 800, easing: "out" },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 10,
        auraColor: "none",
        color: "#111827",
      },
    },
  };

  private buildFirstStartTimeChart(rows: AvgFirstEntryRow[]): void {
    if (!rows || rows.length === 0) {
      this.firstStartTimeChartColumns = [];
      this.firstStartTimeChartData = [];
      this.firstStartTimeYears = [];
      return;
    }

    // לוקחים עד 5 שנים אחרונות
    const allYears = Array.from(
      new Set(rows.map(r => r.Year).filter(y => y != null))
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.firstStartTimeYears = years;

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
      const yearA = this.firstStartTimeYears[this.firstStartTimeYears.length - 1];
      const yearB = yearA;
      const infoA = deptYearMap.get(a)?.get(yearA);
      const infoB = deptYearMap.get(b)?.get(yearB);
      const avgA = infoA && infoA.sumCount > 0 ? infoA.sumMinutes / infoA.sumCount : -Infinity;
      const avgB = infoB && infoB.sumCount > 0 ? infoB.sumMinutes / infoB.sumCount : -Infinity;
      return avgB - avgA; // מגדול לקטן
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
  private lastEndTimeYears: number[] = [];

  // נתונים לגרף עמודות רב-שנתי של זמן SETUP ממוצע
  avgSetupChartColumns: any[] = [];
  avgSetupChartData: any[] = [];
  private avgSetupYears: number[] = [];

private loadAvgLastMorningEnd(): void {
  const baseYear = this.currentYear;
  this.isLastEndTimeLoading = true;
  this.lastEndTimeData = [];

  this.http
    .get<AvgLastEndRow[]>(environment.url + "GetAvgLastMorningEnd_surgeries_dashborad", {
      params: this.buildKpiFilterParams(),
    })
    .subscribe(
      (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const filtered = this.filterBySelectedDiagnosis(list);
        this.lastEndTimeData = filtered.map(r => ({
          departmentName: r.Wing || r.Department || "לא צוין",
          valueDisplay: r.AvgEndTime || (r.AvgEndMinutes != null ? this.minutesToTime(r.AvgEndMinutes) : "-"),
        }));

        // בניית גרף רב-שנתי לפי מחלקה
        this.buildLastEndTimeChart(filtered);

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

  private buildLastEndTimeChart(rows: AvgLastEndRow[]): void {
    if (!rows || rows.length === 0) {
      this.lastEndTimeChartColumns = [];
      this.lastEndTimeChartData = [];
      this.lastEndTimeYears = [];
      return;
    }

    // לוקחים עד 5 שנים אחרונות
    const allYears = Array.from(
      new Set(rows.map(r => r.Year).filter(y => y != null))
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.lastEndTimeYears = years;

    const lastEndColumns: any[] = ["מחלקה"];
    years.forEach(y => {
      lastEndColumns.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });
    this.lastEndTimeChartColumns = lastEndColumns;

    // ממוצע משוקלל לפי Count עבור כל מחלקה ושנה
    const deptYearMap = new Map<string, Map<number, { sumMinutes: number; sumCount: number }>>();

    for (const r of rows) {
      if (r.AvgEndMinutes == null || r.Count == null || r.Count <= 0) {
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
      prev.sumMinutes += r.AvgEndMinutes * r.Count;
      prev.sumCount += r.Count;
      yearMap.set(year, prev);
    }

    const departments = Array.from(deptYearMap.keys()).sort((a, b) => {
      const yearA = this.lastEndTimeYears[this.lastEndTimeYears.length - 1];
      const yearB = yearA;
      const infoA = deptYearMap.get(a)?.get(yearA);
      const infoB = deptYearMap.get(b)?.get(yearB);
      const avgA = infoA && infoA.sumCount > 0 ? infoA.sumMinutes / infoA.sumCount : -Infinity;
      const avgB = infoB && infoB.sumCount > 0 ? infoB.sumMinutes / infoB.sumCount : -Infinity;
      return avgB - avgA;
    });

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
  }

private loadAvgSetup(): void {
  const baseYear = this.currentYear;
  this.isAvgSetupLoading = true;
  this.avgSetupData = [];

  this.http
    .get<AvgSetupRow[]>(environment.url + "GetAvgSetup_surgeries_dashborad", {
      params: this.buildKpiFilterParams(),
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
      this.avgSetupYears = [];
      return;
    }

    // לוקחים עד 5 שנים אחרונות
    const allYears = Array.from(
      new Set(rows.map(r => r.Year).filter(y => y != null))
    ).sort((a, b) => a - b);
    const years = allYears.slice(-5);
    this.avgSetupYears = years;

    const avgSetupColumns: any[] = ["מחלקה"];
    years.forEach(y => {
      avgSetupColumns.push(
        { type: "number", label: y.toString() },
        { type: "string", role: "annotation", label: y.toString() },
      );
    });
    this.avgSetupChartColumns = avgSetupColumns;

    // ממוצע משוקלל לפי Count עבור כל מחלקה ושנה
    const deptYearMap = new Map<string, Map<number, { sumSetup: number; sumCount: number }>>();

    for (const r of rows) {
      if (r.AvgSetupMin == null || r.Count == null || r.Count <= 0) {
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
      const prev = yearMap.get(year) || { sumSetup: 0, sumCount: 0 };
      prev.sumSetup += r.AvgSetupMin * r.Count;
      prev.sumCount += r.Count;
      yearMap.set(year, prev);
    }

    const departments = Array.from(deptYearMap.keys()).sort((a, b) => {
      const yearA = this.avgSetupYears[this.avgSetupYears.length - 1];
      const yearB = yearA;
      const infoA = deptYearMap.get(a)?.get(yearA);
      const infoB = deptYearMap.get(b)?.get(yearB);
      const avgA = infoA && infoA.sumCount > 0 ? infoA.sumSetup / infoA.sumCount : -Infinity;
      const avgB = infoB && infoB.sumCount > 0 ? infoB.sumSetup / infoB.sumCount : -Infinity;
      return avgB - avgA;
    });

    this.avgSetupChartData = departments.map(dept => {
      const yearMap = deptYearMap.get(dept)!;
      const series: any[] = [];

      for (const year of years) {
        const info = yearMap.get(year);
        if (!info || info.sumCount === 0) {
          series.push(null, null);
          continue;
        }
        const avg = info.sumSetup / info.sumCount;
        const formatted = `${avg.toFixed(1)} דק'`;
        series.push(
          { v: avg, f: avg.toFixed(1) },
          formatted,
        );
      }

      return [dept, ...series];
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


