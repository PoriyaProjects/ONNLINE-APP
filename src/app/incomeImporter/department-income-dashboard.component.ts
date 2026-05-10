import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { environment } from "src/environments/environment";
import { DomSanitizer, SafeStyle } from "@angular/platform-browser";

export interface DepartmentComparisonDto {
  DepartmentName: string;
  Income2024: number;
  Income2025: number;
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
        trigger("graphToolbarMode", [
            transition("* => *", [
                style({ opacity: 0.88, transform: "scale(0.992)" }),
                animate(
                    "420ms cubic-bezier(0.22, 1, 0.36, 1)",
                    style({ opacity: 1, transform: "scale(1)" })
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
                    })
                ),
            ]),
            transition(":leave", [
                animate(
                    "320ms cubic-bezier(0.4, 0, 1, 1)",
                    style({
                        opacity: 0,
                        transform: "translateY(-28px)",
                    })
                ),
            ]),
        ]),
    ],
})
export class DepartmentIncomeDashboardComponent implements OnInit, OnDestroy {
    @ViewChild(MatSort) sort!: MatSort;

    /** רמז ויזואלי אחרי כל טעינת טבלה: עמודת המחלקה לחיצה לפירוט */
    showTableDepartmentClickHint = false;
    private tableDeptClickHintTimer: ReturnType<typeof setTimeout> | null = null;

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
                color: "#64748b",
                fontSize: 11,
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
                color: "#64748b",
                fontSize: 11,
            },
        },
        chartArea: {
            width: "94%",
            height: "78%",
            left: 20,
            top: 42,
        },
        colors: ["#2563eb", "#10b981"],
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

    // Boss Dashboard
    showBossDashboard = false;

    // Table data
    displayedColumns: string[] = [
        "DepartmentName",
        "Income2024",
        "Income2025",
        "Difference",
    ];
    dataSource = new MatTableDataSource<DepartmentComparisonDto>([]);

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
    private readonly loaderSpinDurationMs = 1000;
    private loadingProgressStartedAt: Record<string, number> = {};
    private loadingProgressRefreshId: ReturnType<typeof setInterval> | null = null;
    selectedViewType: string = "cash";
    showCatalogPriceColumn: boolean = false;
    showModalIncomeFilters: boolean = false;
    chartType: string = "ColumnChart"; // 'ColumnChart' or 'LineChart'

    /**
     * מצב תצוגת גרף: רדיו — כפתור אחד פעיל. מצבי פילוח משתמשים במטמון פירוט (ללא קריאה חוזרת בעת החלפה).
     */
    graphToolbarDimensionMode: "total" | "unifiedCategory" | "organization" =
        "total";

    get isBreakdownChartViewActive(): boolean {
        return this.graphToolbarDimensionMode !== "total";
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
    private readonly maxBreakdownDepartments = 35;
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
  selectedIncomeSource: string = this.incomeFilterAllValue;
  selectedIncomeClassification: string = this.incomeFilterAllValue;
  selectedOrganization: string = this.incomeFilterAllValue;
  selectedUnifiedCategory: string = this.incomeFilterAllValue;
  incomeSourceOptions: string[] = [this.incomeFilterAllValue, "מדינה", "קרן"];
  incomeClassificationOptions: string[] = [this.incomeFilterAllValue];
  organizationOptions: string[] = [this.incomeFilterAllValue];
  unifiedCategoryOptions: string[] = [this.incomeFilterAllValue];

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

    private static readonly INCOME_REPORT_HEBREW_MONTHS: readonly string[] = [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
    ];

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private sanitizer: DomSanitizer
    ) {}

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
        this.loadIncomeFilterOptions();
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
        document.body.classList.remove('department-dashboard-dark');
        this.stopLoadingProgressTicker();
        if (this.tableDeptClickHintTimer) {
            clearTimeout(this.tableDeptClickHintTimer);
            this.tableDeptClickHintTimer = null;
        }
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
    loadDepartmentIncomeData(): void {
        // console.log("loadDepartmentIncomeData called");
        // console.log("loadDepartmentIncomeData called");

        this.isDataLoaded = false;
        this.isMainDataLoading = true;
        this.startLoadingProgress("main");
        this.incomeReportAsOfLabel = null;
        this.incomeReportAsOfFetchDone = false;
        this.referencePeriodFromYearlyIncome = false;

        this.http
            .post(
                environment.url + "GetDepartmentIncomeComparison",
                this.buildIncomeFilterRequest()
            )
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        this.diagnosisApiRawRows = [];
                        this.departmentIncomeData = response.d;

                        // Sort data: Income2025 should be on top (higher values)
                        this.departmentIncomeData.sort(
                            (a, b) => b.Income2025 - a.Income2025
                        );

                        this.dataSource.data = this.departmentIncomeData;
                        this.calculateTopDepartments();
                        // Update chart columns immediately with fallback years
                        this.updateChartColumns();
                        this.updateChartTheme(); // Update chart theme after data load
                        this.updateChartData();
                        // Load yearly totals to get actual years for dynamic display (async)
                        this.loadYearlyTotalsForChart();
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
                        this.loadIncomeReportReferenceFromSampleDepartment();
                        this.refreshOpenDepartmentPopupAfterFilterReload();
                        this.invalidateBreakdownDetailCache();
                        if (this.graphToolbarDimensionMode !== "total") {
                            this.ensureBreakdownDetailCacheLoaded();
                        }
                        this.maybeShowTableDepartmentClickHint();
                        this.cdr.detectChanges();
                        this.snackBar.open("✓ נתונים נטענו בהצלחה", "סגור", {
                            duration: 3000,
                        });
                    } else {
                        this.isMainDataLoading = false;
                    }
                },
                (error) => {
                    console.error(
                        "Error loading department income data:",
                        error
                    );
                    this.incomeReportAsOfLabel = null;
                    this.incomeReportAsOfFetchDone = false;
                    this.isMainDataLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open("❌ שגיאה בטעינת הנתונים", "סגור", {
                        duration: 3000,
                    });
                }
            );
    }

    /**
     * Load department income by selected diagnosis
     */

    onDiagnosisChange(event: any): void {
        // console.log("Selection changed to:", this.selectedDiagnosis);
        // console.log("Event:", event);
        // Show loading indicator when switching departments
        this.isMainDataLoading = true;
        this.startLoadingProgress("main");
        this.isDataLoaded = false;
        this.loadDepartmentIncomeByDiagnosis();
    }

    loadDepartmentIncomeByDiagnosis(): void {
        // console.log(
        //     "loadDepartmentIncomeByDiagnosis called with:",
        //     this.selectedDiagnosis
        // );
        this.isDataLoaded = false;
        this.isMainDataLoading = true;
        this.startLoadingProgress("main");
        this.incomeReportAsOfLabel = null;
        this.incomeReportAsOfFetchDone = false;
        this.referencePeriodFromYearlyIncome = false;

        this.http
            .post(environment.url + "GetDepartmentIncomeByDiagnosis", {
                diagnosis: this.selectedDiagnosis,
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        let data = response.d;

                        if (typeof data === "string") {
                            data = JSON.parse(data);
                        }

                        const rawList = Array.isArray(data) ? data : [];
                        this.diagnosisApiRawRows =
                            this.normalizeDiagnosisComparisonRows(rawList);
                        this.departmentIncomeData =
                            this.aggregateDepartmentRowsForTable(
                                this.diagnosisApiRawRows
                            );
                        
                        this.departmentIncomeData.sort(
                            (a, b) => b.Income2025 - a.Income2025
                        );

                        this.dataSource.data = this.departmentIncomeData;
                        this.calculateTopDepartments();
                        // Update chart columns immediately with fallback years
                        this.updateChartColumns();
                        this.updateChartTheme(); // Update chart theme after data load
                        // Use updateChartData() instead of creating chartData directly
                        // This ensures consistent filtering logic
                        this.updateChartData();
                        // Load yearly totals to get actual years for dynamic display (async)
                        this.loadYearlyTotalsForChart();
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
                        this.loadIncomeReportReferenceFromSampleDepartment();
                        this.refreshOpenDepartmentPopupAfterFilterReload();
                        this.invalidateBreakdownDetailCache();
                        if (this.graphToolbarDimensionMode !== "total") {
                            this.ensureBreakdownDetailCacheLoaded();
                        }
                        this.maybeShowTableDepartmentClickHint();
                        this.cdr.detectChanges();

                        this.snackBar.open("✓ נתונים עודכנו", "סגור", {
                            duration: 3000,
                        });
                    } else {
                        console.warn("No data in response:", response);
                        this.isMainDataLoading = false;
                    }
                },
                (error) => {
                    console.error("Error:", error);
                    this.incomeReportAsOfLabel = null;
                    this.incomeReportAsOfFetchDone = false;
                    this.isMainDataLoading = false;
                    this.cdr.detectChanges();
                    this.snackBar.open("❌ שגיאה", "סגור", { duration: 3000 });
                }
            );
    }

    /**
     * Load list of all diagnoses for dropdown filter
     */
    loadDiagnosesList(): void {
        this.isDiagnosesLoading = true;
        this.startLoadingProgress("diagnoses");
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
        this.startLoadingProgress("chart");

        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
            this.chartData = [];
            this.isChartLoading = false;
            this.cdr.detectChanges();
            return;
        }

        // Align with the table: any department row with a name may appear in the chart.
        // (A strict >0 filter hid all bars when both years were 0 or non-numeric from the API.)
        const filtered = this.departmentIncomeData.filter((item) =>
            String(item?.DepartmentName ?? "").trim()
        );
        
        // console.log("Filtered departments count:", filtered.length);
        // console.log("Filtered sample:", filtered.slice(0, 3).map(d => ({
        //     name: d.DepartmentName,
        //     Income2024: d.Income2024,
        //     Income2025: d.Income2025
        // })));

        this.chartData = filtered.map((item) => {
            const safe2024 = this.toNumber(item.Income2024);
            const safe2025 = this.toNumber(item.Income2025);

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
      this.startLoadingProgress("main");
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
        envelope: Record<string, unknown> | null
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
            mRaw as string | number
        );
        if (!yearStr || monthIdx == null) {
            return false;
        }
        const yNum = parseInt(yearStr, 10);
        if (Number.isNaN(yNum) || yNum < 1900 || yNum > 2100) {
            return false;
        }
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
    loadYearlyTotalsForChart(): void {
        this.http
            .post(environment.url + "GetYearlyTotalIncome", {
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe(
            (response: any) => {
                const { rows, envelope } =
                    this.parseGetYearlyTotalIncomePayload(response);
                if (rows.length) {
                    this.yearlyTotalData = rows;
                    if (this.tryApplyBannerFromYearlyIncomeEnvelope(envelope)) {
                        this.incomeReportAsOfFetchDone = true;
                    }
                    // Only update chart if we have department data loaded
                    if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
                        // Use setTimeout to ensure chart is ready before updating
                        setTimeout(() => {
                            this.updateChartColumns(); // Update chart columns with dynamic years
                            this.updateChartTheme(); // Update chart theme
                            this.updateChartData(); // Refresh chart with new columns
                            this.cdr.detectChanges();
                        }, 100);
                    }
                }
                this.cdr.detectChanges();
            },
            (error) => {
                console.error("Error loading yearly totals for chart:", error);
                // If failed, still update chart with fallback years
                this.updateChartColumns();
            }
        );
    }

    /**
     * Load boss dashboard with yearly totals from backend
     */
    loadBossDashboard(): void {
        this.isLoading = true;
        this.startLoadingProgress("boss");
        this.showBossDashboard = true;

        this.http
            .post(environment.url + "GetYearlyTotalIncome", {
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe(
            (response: any) => {
                // console.log("Response:", response);

                if (response && response.d) {
                    const { rows, envelope } =
                        this.parseGetYearlyTotalIncomePayload(response);

                    if (rows.length) {
                        this.yearlyTotalData = rows;
                        this.tryApplyBannerFromYearlyIncomeEnvelope(envelope);

                        // Update chart columns if department data is already loaded
                        // Use setTimeout to avoid interfering with chart rendering
                        if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
                            setTimeout(() => {
                                this.updateChartColumns();
                                this.updateChartTheme(); // Update chart theme
                                this.updateChartData();
                                this.cdr.detectChanges();
                            }, 100);
                        }
                        
                        // Debug: Log the data for troubleshooting
                        // console.log("Yearly Total Data:", this.yearlyTotalData);
                        // console.log("Older Year:", this.getOlderYear(), "Total:", this.getOlderYearTotal());
                        // console.log("Latest Year:", this.getLatestYear(), "Total:", this.getLatestYearTotal());
                        // console.log("Difference:", this.getTotalDifference());
                        // console.log("Percentage Change:", this.calculateYearlyPercentageChange());

                        this.isLoading = false;
                        this.cdr.detectChanges();
                        this.snackBar.open("✓ דוח למנהל נטען בהצלחה", "סגור", {
                            duration: 2000,
                        });
                    } else {
                        console.error("Data is not an array:", rows);
                        this.isLoading = false;
                    }
                }
            },
            (error) => {
                console.error("Error loading boss dashboard:", error);
                this.isLoading = false;
                this.snackBar.open("❌ שגיאה בטעינת הנתונים", "סגור", {
                    duration: 3000,
                });
            }
        );
    }

    /**
     * Close boss dashboard
     */
    closeBossDashboard(): void {
        this.showBossDashboard = false;
        this.cdr.detectChanges();
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
                (d) => d.DepartmentName === departmentName
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
                (d) => d.DepartmentName === departmentName
            ) || null;
        if (!updatedDepartment) {
            this.detailedDataSource.data = [];
            this.catalogLoading = false;
            this.cdr.detectChanges();
            return;
        }
        this.selectedDepartment = updatedDepartment;
        this.loadDetailedDepartmentData(departmentName, false);
    }

    /**
     * Load detailed department data
     */
    loadDetailedDepartmentData(departmentName: string, resetView: boolean = true): void {
        this.catalogLoading = true;
        this.startLoadingProgress("catalog");
        this.http
            .post(environment.url + "GetDepartmentDetailedData", {
                departmentName: departmentName,
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        const parsed = this.parseDetailedIncomePayload(
                            response.d
                        );
                        const rows =
                            parsed?.rows ??
                            (Array.isArray(response.d) ? response.d : []);
                        this.detailedDataSource.data =
                            this.applyIncomeFiltersToDetailedRows(rows);
                        if (rows.length) {
                            this.applyIncomeReportAsOfFromDetailed(
                                rows,
                                parsed?.meta ?? null
                            );
                        }

                        if (resetView) {
                            this.selectedViewType = "cash";
                            this.showCatalogPriceColumn = false;
                        }
                        this.updateDisplayedCatalogColumns();

                        // Sort by Cash2025 descending (highest to lowest)
                        this.sortDetailedDataByCash2025Descending();

                        this.catalogLoading = false;
                        this.isDepartmentGraphOpen = true;
                        this.cdr.detectChanges();
                    } else {
                        this.detailedDataSource.data = [];
                        if (resetView) {
                            this.selectedViewType = "cash";
                            this.showCatalogPriceColumn = false;
                        }
                        this.updateDisplayedCatalogColumns();
                        this.catalogLoading = false;
                        this.isDepartmentGraphOpen = true;
                        this.cdr.detectChanges();
                    }
                },
                (error) => {
                    console.error("Error loading detailed data:", error);
                    this.catalogLoading = false;
                    this.snackBar.open("❌ שגיאה בטעינת הפרטים", "סגור", {
                        duration: 3000,
                    });
                }
            );
    }

    /**
     * Sort detailed data by Cash2025 descending (default view)
     */
    sortDetailedDataByCash2025Descending(): void {
        if (this.detailedDataSource.data?.length) {
            this.detailedDataSource.data.sort(
                (a, b) =>
                    this.toNumber((b as any)?.Cash2025) -
                    this.toNumber((a as any)?.Cash2025)
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
        return this.getAnimatedLoadingProgress("main");
    }

    getChartLoadingProgress(): number {
        return this.isMainDataLoading
            ? this.getMainDataLoadingProgress()
            : this.getAnimatedLoadingProgress("chart");
    }

    getCatalogLoadingProgress(): number {
        return this.getAnimatedLoadingProgress("catalog");
    }

    getBossLoadingProgress(): number {
        return this.getAnimatedLoadingProgress("boss");
    }

    getDiagnosesLoadingProgress(): number {
        return this.getAnimatedLoadingProgress("diagnoses");
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
        return Math.min(99, Math.floor((elapsed / this.loaderSpinDurationMs) * 100));
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
            ? [...columns, "CatalogUnitPrice"]
            : columns;
    }

    /**
     * טוען דגימת פירוט מחלקה אחת כדי לחשב את חודש היחוס המקסימלי בדוח (תאריך עדכון הדוח).
     */
    private loadIncomeReportReferenceFromSampleDepartment(): void {
        if (!this.departmentIncomeData?.length) {
            this.incomeReportAsOfLabel = null;
            this.incomeReportAsOfFetchDone = true;
            return;
        }
        const firstRow = this.departmentIncomeData[0] as any;
        const sampleDept =
            String(
                firstRow?.DepartmentName ??
                    firstRow?.departmentName ??
                    firstRow?.Department ??
                    ""
            ).trim();
        if (!sampleDept) {
            this.incomeReportAsOfLabel = null;
            this.incomeReportAsOfFetchDone = true;
            return;
        }
        this.http
            .post(environment.url + "GetDepartmentDetailedData", {
                departmentName: sampleDept,
                ...this.buildIncomeFilterRequest(),
            })
            .subscribe({
                next: (response: any) => {
                    const parsed = this.parseDetailedIncomePayload(response?.d);
                    if (parsed?.rows?.length) {
                        this.applyIncomeReportAsOfFromDetailed(
                            parsed.rows,
                            parsed.meta
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
    private findFirstObjectArrayInValue(
        raw: any,
        depth = 0
    ): any[] | null {
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
                    depth + 1
                );
            } catch {
                return null;
            }
        }
        if (Array.isArray(raw)) {
            return raw.length > 0 && typeof raw[0] === "object" && raw[0] != null
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
        meta: Record<string, any> | null
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
            this.extractYearMonthFromLooseMeta(meta, fy)
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanObjectsForLooseDates(meta ? [meta] : [], true)
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanObjectsForLooseDates(rows, false)
        );
        best = this.pickBetterYearMonth(
            best,
            this.scanRowStringsForYearMonthGlobally(rows)
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
        b: { y: number; m: number } | null
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
        fallbackLatestYear: number | null
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
        fallbackLatestYear: number | null
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
        scanAllKeys: boolean
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
        rows: any[]
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
        val: string | number | null | undefined
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
        val: unknown
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
            const isEpochSec =
                val > 1_000_000_000 && val < 100_000_000_000;
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
        const ymd = s.match(
            /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:[T\s].*)?$/
        );
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

    private parseIncomeReportMonthIndex(month: string | number | null | undefined): number | null {
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
                (name) => t.includes(name) || name.includes(t)
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
        this.chartOptions.title = `השוואת הכנסות מחלקות - ${olderYear} vs ${latestYear}`;
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
            this.selectedDepartment?.Income2024 ?? 0
        );
    }

    getModalLatestIncome(): number {
        return this.getModalCashTotal(
            "Cash2025",
            this.selectedDepartment?.Income2025 ?? 0
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
            2
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
                ""
        ).trim();
    }

    getCatalogUnitPrice(row: any): number | null {
        const latestYearCash = this.toNumber(row?.Cash2025);
        const latestYearUnits = this.toNumber(row?.Units2025);
        return latestYearUnits > 0 ? latestYearCash / latestYearUnits : null;
    }

    formatCatalogUnitPrice(row: any): string {
        const price = this.getCatalogUnitPrice(row);
        return price == null ? "-" : `${this.formatNumber(Math.round(price))} ₪`;
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
                .trim()
        );
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private applyIncomeFiltersToDetailedRows(
        rows: DepartmentDetailedDataDto[]
    ): DepartmentDetailedDataDto[] {
        if (!Array.isArray(rows) || !this.hasActiveIncomeFilters()) {
            return rows || [];
        }
        return rows.filter((row: any) => {
            return (
                this.matchesIncomeFilter(row, this.selectedIncomeSource, [
                    "MedicalUnitIncome",
                    "medicalUnitIncome",
                    "MedicalUnit_Income",
                    "medicalUnit_Income",
                ]) &&
                this.matchesIncomeFilter(row, this.selectedIncomeClassification, [
                    "IncomeCategory",
                    "incomeCategory",
                    "IncomeClassification",
                    "incomeClassification",
                ]) &&
                this.matchesIncomeFilter(row, this.selectedOrganization, [
                    "Organization",
                    "organization",
                    "FundCountry",
                    "fundCountry",
                ]) &&
                this.matchesIncomeFilter(row, this.selectedUnifiedCategory, [
                    "UnifiedDiagnosis",
                    "unifiedDiagnosis",
                    "UnifiedCategory",
                    "unifiedCategory",
                ])
            );
        });
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
        }
    ): DepartmentDetailedDataDto[] {
        if (!Array.isArray(rows)) {
            return [];
        }
        if (!this.hasActiveIncomeFilters()) {
            return rows;
        }
        return rows.filter((row: any) => {
            const src =
                skip.source === true ||
                this.matchesIncomeFilter(row, this.selectedIncomeSource, [
                    "MedicalUnitIncome",
                    "medicalUnitIncome",
                    "MedicalUnit_Income",
                    "medicalUnit_Income",
                ]);
            const cls =
                skip.classification === true ||
                this.matchesIncomeFilter(row, this.selectedIncomeClassification, [
                    "IncomeCategory",
                    "incomeCategory",
                    "IncomeClassification",
                    "incomeClassification",
                ]);
            const org =
                skip.organization === true ||
                this.matchesIncomeFilter(row, this.selectedOrganization, [
                    "Organization",
                    "organization",
                    "FundCountry",
                    "fundCountry",
                ]);
            const uni =
                skip.unified === true ||
                this.matchesIncomeFilter(row, this.selectedUnifiedCategory, [
                    "UnifiedDiagnosis",
                    "unifiedDiagnosis",
                    "UnifiedCategory",
                    "unifiedCategory",
                ]);
            return src && cls && org && uni;
        });
    }

    private matchesIncomeFilter(
        row: any,
        selectedValue: string,
        candidateFields: string[]
    ): boolean {
        if (!selectedValue || selectedValue === this.incomeFilterAllValue) {
            return true;
        }
        const rowValue = this.getFirstNonEmptyString(row, candidateFields);
        return !rowValue || rowValue === selectedValue;
    }

    private getFirstNonEmptyString(row: any, candidateFields: string[]): string {
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
        type: "source" | "classification" | "organization" | "unifiedCategory"
    ): void {
        const nextSource = type === "source" ? !this.isIncomeSourceOpen : false;
        const nextClassification =
            type === "classification" ? !this.isIncomeClassificationOpen : false;
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
        return (
            this.selectedIncomeSource !== this.incomeFilterAllValue ||
            this.selectedIncomeClassification !== this.incomeFilterAllValue ||
            this.selectedOrganization !== this.incomeFilterAllValue ||
            this.selectedUnifiedCategory !== this.incomeFilterAllValue
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
            return "מוצגים כל מקורות המימון, הארגונים, הקטגוריות וסיווגי ההכנסה.";
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
    }

    private reloadDepartmentIncomeWithFilters(): void {
        if (this.selectedDiagnosis) {
            this.loadDepartmentIncomeByDiagnosis();
        } else {
            this.loadDepartmentIncomeData();
        }
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
                this.selectedIncomeSource
            ),
            incomeCategory: this.mapIncomeFilterToApiParam(
                this.selectedIncomeClassification
            ),
            organization: this.mapIncomeFilterToApiParam(
                this.selectedOrganization
            ),
            unifiedCategory: this.mapIncomeFilterToApiParam(
                this.selectedUnifiedCategory
            ),
        };
    }

    private loadIncomeFilterOptions(): void {
        this.http.post(environment.url + "GetDepartmentIncomeFilterOptions", {}).subscribe({
            next: (response: any) => {
                const payload = this.parseIncomeFilterOptionsPayload(response?.d ?? response);
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
                    .filter((item) => item && item !== this.incomeFilterAllValue)
            )
        );
    }

    private scheduleChartResize(): void {
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
            if (this.isBreakdownChartViewActive) {
                this.syncBreakdownChartTheme();
            }
        }, 0);
    }

    onGraphToolbarToggleChange(value: unknown): void {
        if (
            value === "total" ||
            value === "unifiedCategory" ||
            value === "organization"
        ) {
            this.setGraphToolbarMode(value);
        }
    }

    setGraphToolbarMode(
        mode: "total" | "unifiedCategory" | "organization"
    ): void {
        if (this.graphToolbarDimensionMode === mode) {
            return;
        }
        this.graphToolbarDimensionMode = mode;
        if (mode === "total") {
            this.clearDimensionalChartDisplay();
            this.isBreakdownChartsLoading = false;
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
        if (this.graphToolbarDimensionMode === "total") {
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
                { duration: 4500 }
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
                byDept.get(departmentName) || []
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
        raw: any[]
    ): DepartmentComparisonDto[] {
        const out: DepartmentComparisonDto[] = [];
        for (const item of raw) {
            const DepartmentName = String(
                item?.DepartmentName ?? ""
            ).trim();
            if (!DepartmentName) {
                continue;
            }
            const row: DepartmentComparisonDto = {
                DepartmentName,
                Income2024: this.toNumber(item?.Income2024),
                Income2025: this.toNumber(item?.Income2025),
            };
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
        return out;
    }

    /** סכימה לטבלה / גרף סה״כ — שורה אחת למחלקה */
    private aggregateDepartmentRowsForTable(
        rows: DepartmentComparisonDto[]
    ): DepartmentComparisonDto[] {
        const m = new Map<
            string,
            { Income2024: number; Income2025: number }
        >();
        for (const r of rows) {
            const name = String(r.DepartmentName || "").trim();
            if (!name) {
                continue;
            }
            const prev = m.get(name);
            if (!prev) {
                m.set(name, {
                    Income2024: r.Income2024,
                    Income2025: r.Income2025,
                });
            } else {
                prev.Income2024 += r.Income2024;
                prev.Income2025 += r.Income2025;
            }
        }
        return Array.from(m.entries()).map(([DepartmentName, v]) => ({
            DepartmentName,
            Income2024: v.Income2024,
            Income2025: v.Income2025,
        }));
    }

    /** המרה לצורת שורת פיבוט ש־applyIncomeFiltersForPivotRows / getDetailedLatestCash מבינים */
    private comparisonRowsToPivotRows(
        rows: DepartmentComparisonDto[]
    ): any[] {
        return rows.map((r) => {
            const i24 = this.toNumber(r.Income2024);
            const i25 = this.toNumber(r.Income2025);
            const o: any = {
                DepartmentName: r.DepartmentName,
                Cash2024: i24,
                Cash2025: i25,
            };
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

        const slice = this.breakdownDetailRawResults.map((r) => r.departmentName);
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
            for (const { departmentName, rows } of this.breakdownDetailRawResults) {
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
                `סיווג הכנסה מאוחד (${latestYear}) — לפי אפשרויות המסנן`
            );
            this.dimensionalChartColumns = built.columns;
            this.dimensionalChartData = built.data;
            this.dimensionalChartOptions = built.options;
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
            for (const { departmentName, rows } of this.breakdownDetailRawResults) {
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
                `קרן / מדינה (${latestYear}) — לפי אפשרויות המסנן`
            );
            this.dimensionalChartColumns = built.columns;
            this.dimensionalChartData = built.data;
            this.dimensionalChartOptions = built.options;
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
        value: number
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

    /** כמו רשימת «סיווג הכנסה מאוחד» במסנן (ללא «הכל») */
    private getUnifiedCategoryBreakdownSegments(): string[] {
        return this.unifiedCategoryOptions.filter(
            (o) =>
                o &&
                String(o).trim() &&
                o !== this.incomeFilterAllValue
        );
    }

    /** כמו רשימת «קרן / מדינה» במסנן (ללא «הכל») */
    private getOrganizationBreakdownSegments(): string[] {
        return this.organizationOptions.filter(
            (o) =>
                o &&
                String(o).trim() &&
                o !== this.incomeFilterAllValue
        );
    }

    /**
     * ממפה ערך שורה לערך מהרשת — התאמה מדויקת או נפילה ל־«אחר» אם קיים ברשת.
     */
    private mapRowValueToFilterOption(
        raw: string,
        segmentOrder: string[]
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
        title: string
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
                if (v > 0) {
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
            for (const seg of segmentOrder) {
                const vM = parseFloat(
                    ((m.get(seg) || 0) / 1_000_000).toFixed(2)
                );
                row.push(vM);
                row.push(this.formatMillionAnnotationLabel(vM));
            }
            data.push(row);
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
            animation: { startup: true, duration: 750, easing: "out" },
            bar: { groupWidth: n > 3 ? "70%" : "52%" },
        };

        return { columns, data, options };
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
                        color:
                            opt.annotations?.stem?.color ?? "transparent",
                    },
                    textStyle: {
                        ...(opt.annotations?.textStyle || {}),
                        color: isDark ? "#f9fafb" : "#334155",
                        fontSize:
                            opt.annotations?.textStyle?.fontSize ?? 10,
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
                alwaysOutside: true,
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
                alwaysOutside: true,
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
        this.syncBreakdownChartTheme();
    }

    /**
     * Handle chart click event
     * When user clicks on a bar in the chart, show department details
     */
    onChartClick(event: any): void {
        this.handleDeptRowChartSelection(event, this.chartData);
    }

    onDimensionalChartClick(event: any): void {
        this.handleDeptRowChartSelection(event, this.dimensionalChartData);
    }

    private handleDeptRowChartSelection(
        event: any,
        rows: any[][] | null | undefined
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
                        this.loadDepartmentSpecificGraph(String(departmentName));
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


