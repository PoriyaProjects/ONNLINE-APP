import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { environment } from "src/environments/environment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

export interface TopDepartmentDto {
  DepartmentName: string;
  Income2024: number;
  Income2025: number;
  difference: number;
  percentage: number;
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
    ],
})
export class DepartmentIncomeDashboardComponent implements OnInit {
    @ViewChild(MatSort) sort!: MatSort;

    // Guide Avatar
    showGuideAvatar = true;
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
        { type: "number", label: "" }, // Latest year - Will be updated dynamically
        { type: "string", role: "annotation" },
        { type: "number", label: "" }, // Older year - Will be updated dynamically
        { type: "string", role: "annotation" },
        { type: "number", label: "צפי גידול שנתי" }, // Forecast line (red, dashed)
    ];

    // Main departments comparison chart (horizontal bars: departments on Y, values on X)
    chartOptions: any = {
        title: "השוואת הכנסות מחלקות",
        titleTextStyle: {
            color: "#333",
            fontSize: 18,
            bold: true,
        },
        hAxis: {
            title: "סכום הכנסות (מיליוני ₪)",
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
            titleTextStyle: {
                color: "#333",
                fontSize: 13,
                bold: true,
            },
            minValue: 0,
        },
        vAxis: {
            title: "מחלקה",
            textStyle: {
                color: "#555",
                fontSize: 12,
            },
            titleTextStyle: {
                color: "#333",
                fontSize: 13,
                bold: true,
            },
            textPosition: "out",
        },
        legend: {
            position: "bottom",
            textStyle: {
                color: "#555",
                fontSize: 12,
            },
        },
        chartArea: {
            width: "78%",
            height: "72%",
            top: 28,
        },
        // בסיס: שנת בסיס, שנה קודמת, צפי גידול שנתי (קו אדום מקוקו)
        colors: ["#0ea5e9", "#8b5cf6", "#ef4444"],
        backgroundColor: {
            fill: "#fafafa",
            stroke: "#e5e7eb",
            strokeWidth: 1,
        },
        dataOpacity: 0.92,
        annotations: {
            alwaysOutside: true,
            textStyle: {
                fontSize: 10,
                bold: true,
                color: "#374151",
                fontName: "Arial",
            },
        },
        bar: {
            groupWidth: "75%",
        },
        // קווים חלקים ונעימים بیشتر
        curveType: "function",
        lineWidth: 3,
        pointSize: 6,
        tooltip: {
            isHtml: true,
            trigger: "both",
            textStyle: {
                color: "#333",
                fontSize: 12,
            },
        },
        focusTarget: "category",
        aggregationTarget: "category",
        seriesType: "bars", // ברירת מחדל: עמודות
        bars: "horizontal", // שמות המחלקות בציר Y (ימין), סכומים בציר X
        series: {
            // עמודות/קווים לשנים (0 = שנה נוכחית, 1 = שנה קודמת)
            0: { type: "bars", color: "#0ea5e9" },
            1: { type: "bars", color: "#8b5cf6" },
            // צפי גידול שנתי – קו אדום מקווקו עם חצים בסוף הגרף
            2: {
                type: "line",
                lineDashStyle: [6, 6],
                color: "#ef4444",
                pointSize: 8,
                pointShape: "triangle",
                lineWidth: 3,
                visibleInLegend: true,
                tooltip:
                    "צפי גידול שנתי: תחזית לשנה הבאה המבוססת על גידול ממוצע ב־5 השנים האחרונות בכלל הארגון, כשהיעד מחושב עבור כל מחלקה בנפרד.",
            },
        },
    };

    // Department yearly chart inside details modal
    departmentYearlyChartData: any[] = [];
    departmentYearlyChartColumns: any[] = [
        "שנה",
        { type: "number", label: "" }, // יתעדכן לפי סוג מדידה (כסף / יחידות)
        { type: "string", role: "annotation" },
        { type: "number", label: "צפי גידול שנתי (יעד)" },
    ];
    departmentYearlyChartOptions: any = {
        title: "מגמת פעילות מחלקה לפי שנים",
        titleTextStyle: {
            color: "#333",
            fontSize: 14,
            bold: true,
        },
        hAxis: {
            title: "",
            minValue: 0,
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
            titleTextStyle: {
                color: "#333",
                fontSize: 12,
                bold: true,
            },
        },
        vAxis: {
            title: "שנה",
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
            titleTextStyle: {
                color: "#333",
                fontSize: 12,
                bold: true,
            },
        },
        legend: {
            position: "bottom",
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
        },
        chartArea: {
            width: "78%",
            height: "65%",
            top: 24,
        },
        colors: ["#0ea5e9", "#ef4444"],
        backgroundColor: {
            fill: "#fafafa",
            stroke: "#e5e7eb",
            strokeWidth: 1,
        },
        dataOpacity: 0.95,
        annotations: {
            alwaysOutside: true,
            textStyle: {
                fontSize: 9,
                bold: true,
                color: "#374151",
                fontName: "Arial",
            },
        },
        seriesType: "bars",
        bars: "horizontal",
        series: {
            0: { type: "bars", color: "#0ea5e9" },
            1: {
                type: "line",
                lineDashStyle: [6, 6],
                color: "#ef4444",
                pointSize: 6,
                pointShape: "triangle",
                lineWidth: 2,
                visibleInLegend: true,
            },
        },
    };

    departmentChartType: "columns" | "line" = "columns";

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
    selectedViewType: string = "cash";

    // In department modal: 'table' | 'chart'
    catalogViewMode: string = "table";
    catalogZoomLevel: number = 1; // Zoom level: 1 = normal, >1 = zoom in, <1 = zoom out
    catalogChartData: any[] = [];
    catalogChartColumns: any[] = ["שירות", { type: "number", label: "2025 (מיליוני ₪)" }];
    catalogChartOptions: any = {
        title: "שירותים מובילים במחלקה",
        // ב-BarChart: ציר X = סכומים, ציר Y = שמות שירותים
        hAxis: { title: "סכום ב-2025 (מיליוני ₪)", minValue: 0 },
        vAxis: { title: "שירות" },
        chartArea: { width: "70%", height: "70%" },
        colors: ["#0ea5e9"],
        legend: { position: "none" },
        bars: "horizontal",
    };

    // Main dashboard view selector (which section to show)
    // 'chart' | 'table' | 'top5'
    activeView: string = "chart";

    // Chart type: 'columns' | 'line'
    chartType: string = "columns";

    // Podium TOP 5 chart (replaces KPI cubes): names at bottom, amount at top
    podiumChartData: any[] = [];
    podiumChartColumns: any[] = ["מחלקה", { type: "number", label: "הכנסה (מיליוני ₪)" }];
    podiumChartOptions: any = {
        title: "🏆 TOP 5 מחלקות (לחץ לפרטים)",
        titleTextStyle: { color: "#333", fontSize: 14, bold: true },
        hAxis: { title: "מיליוני ₪", minValue: 0, textStyle: { fontSize: 11 } },
        vAxis: { title: "מחלקה", textStyle: { fontSize: 11 } },
        legend: { position: "none" },
        chartArea: { width: "70%", height: "75%" },
        bars: "horizontal",
        backgroundColor: "#fff",
        dataOpacity: 0.9,
    };
    sidebarCollapsed = false;

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
        "UnitsDiff",
    ];

    unitsColumns: string[] = [
        "CatalogName2",
        "Units2021",
        "Units2022",
        "Units2023",
        "Units2024",
        "Units2025",
        "UnitsDiff",
    ];

    displayedCatalogColumns: string[] = this.cashColumns;

    // Top 5 Departments - Feature
    topDepartmentsViewType: string = "difference"; // 'difference' or 'percentage'

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        console.log("gOnInit called");
        this.loadDepartmentIncomeData();
        this.loadDiagnosesList();
        this.displayedCatalogColumns = this.cashColumns;
    }

    /**
     * Load department income comparison data
     */
    loadDepartmentIncomeData(): void {
        console.log("loadDepartmentIncomeData called");
        console.log("loadDepartmentIncomeData called");

        this.isDataLoaded = false;
        this.isMainDataLoading = true;

        this.http
            .post(environment.url + "GetDepartmentIncomeComparison", {})
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        this.departmentIncomeData = response.d;

                        // Sort data: Income2025 should be on top (higher values)
                        this.departmentIncomeData.sort(
                            (a, b) => b.Income2025 - a.Income2025
                        );

                        this.dataSource.data = this.departmentIncomeData;
                        this.calculateTopDepartments();
                        // Update chart columns immediately with fallback years
                        this.updateChartColumns();
                        this.updateChartData();
                        this.updateChartOptions(); // עדכן את אפשרויות הגרף (כולל series)
                        // Load yearly totals to get actual years for dynamic display (async)
                        this.loadYearlyTotalsForChart();
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
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
        console.log("Selection changed to:", this.selectedDiagnosis);
        console.log("Event:", event);
        this.loadDepartmentIncomeByDiagnosis();
    }

    loadDepartmentIncomeByDiagnosis(): void {
        console.log(
            "loadDepartmentIncomeByDiagnosis called with:",
            this.selectedDiagnosis
        );
        this.isDataLoaded = false;
        this.isMainDataLoading = true;

        this.http
            .post(environment.url + "GetDepartmentIncomeByDiagnosis", {
                diagnosis: this.selectedDiagnosis,
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        let data = response.d;

                        if (typeof data === "string") {
                            data = JSON.parse(data);
                        }

                        console.log("Raw data from GetDepartmentIncomeByDiagnosis:", data);
                        console.log("Data length:", Array.isArray(data) ? data.length : "Not an array");

                        const uniqueDepts = [];
                        const seen = new Set();

                        if (Array.isArray(data)) {
                            for (let item of data) {
                                if (!seen.has(item.DepartmentName)) {
                                    seen.add(item.DepartmentName);
                                    uniqueDepts.push(item);
                                    // Log first few items to see the structure
                                    if (uniqueDepts.length <= 3) {
                                        console.log("Sample item:", {
                                            DepartmentName: item.DepartmentName,
                                            Income2024: item.Income2024,
                                            Income2025: item.Income2025
                                        });
                                    }
                                }
                            }
                        }

                        this.departmentIncomeData = uniqueDepts;
                        console.log("After deduplication, departmentIncomeData length:", this.departmentIncomeData.length);
                        
                        // Check if we have any data
                        if (this.departmentIncomeData.length === 0) {
                            console.warn("No departments found for diagnosis:", this.selectedDiagnosis);
                            this.dataSource.data = [];
                            this.topDepartments = [];
                            this.chartData = [];
                            this.isDataLoaded = true;
                            this.isMainDataLoading = false;
                            this.cdr.detectChanges();
                            this.snackBar.open("⚠️ לא נמצאו נתונים עבור אגף זה", "סגור", {
                                duration: 4000,
                            });
                            return;
                        }
                        
                        console.log("Sample Income2025 values:", this.departmentIncomeData.slice(0, 3).map(d => d.Income2025));
                        
                        this.departmentIncomeData.sort(
                            (a, b) => b.Income2025 - a.Income2025
                        );

                        this.dataSource.data = this.departmentIncomeData;
                        this.calculateTopDepartments();
                        // Update chart columns immediately with fallback years
                        this.updateChartColumns();
                        // Use updateChartData() instead of creating chartData directly
                        // This ensures consistent filtering logic
                        this.updateChartData();
                        this.updateChartOptions(); // עדכן את אפשרויות הגרף (כולל series)
                        // Load yearly totals to get actual years for dynamic display (async)
                        this.loadYearlyTotalsForChart();
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
                        this.cdr.detectChanges();

                        this.snackBar.open("✓ נתונים עודכנו", "סגור", {
                            duration: 3000,
                        });
                    } else {
                        console.warn("No data in response:", response);
                        this.departmentIncomeData = [];
                        this.dataSource.data = [];
                        this.topDepartments = [];
                        this.chartData = [];
                        this.isDataLoaded = true;
                        this.isMainDataLoading = false;
                        this.cdr.detectChanges();
                        this.snackBar.open("⚠️ לא נמצאו נתונים עבור אגף זה", "סגור", {
                            duration: 4000,
                        });
                    }
                },
                (error) => {
                    console.error("Error:", error);
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
        this.http.post(environment.url + "GetUniqueDiagnoses", {}).subscribe(
            (response: any) => {
                if (response && response.d) {
                    this.diagnosesList = response.d;
                    this.cdr.detectChanges();
                }
            },
            (error) => {
                console.error("Error loading diagnoses list:", error);
            }
        );
    }

    /**
     * Update chart data with numbers formatted in millions with 1 decimal place
     */
    updateChartData(): void {
        console.log("updateChartData called");
        console.log("departmentIncomeData:", this.departmentIncomeData);

        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
            this.chartData = [];
            console.log("No data to chart");
            return;
        }

        // Log income values for debugging
        console.log("Income values sample:", this.departmentIncomeData.slice(0, 3).map(d => ({
            name: d.DepartmentName,
            Income2024: d.Income2024,
            Income2025: d.Income2025
        })));

        // Filter: include departments that have at least one year with positive income
        // This prevents the chart from disappearing when some departments have zero values
        // Also handle case when department has no data at all (null/undefined/NaN)
        const filtered = this.departmentIncomeData.filter((item) => {
            if (!item) return false;
            const has2024 = item.Income2024 != null && !isNaN(item.Income2024) && item.Income2024 > 0;
            const has2025 = item.Income2025 != null && !isNaN(item.Income2025) && item.Income2025 > 0;
            return has2024 || has2025; // Show if at least one year has data
        });
        
        // If no departments have data, return empty array to prevent chart errors
        if (filtered.length === 0) {
            this.chartData = [];
            console.log("No departments with data to chart");
            return;
        }
        
        console.log("Filtered departments count:", filtered.length);
        console.log("Filtered sample:", filtered.slice(0, 3).map(d => ({
            name: d.DepartmentName,
            Income2024: d.Income2024,
            Income2025: d.Income2025
        })));

        const avgFiveYearGrowthRate = this.getAverageFiveYearGrowthRate();

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

            // צפי גידול שנתי: יעד לשנה הבאה לפי גידול ממוצע ב־5 השנים האחרונות (אם זמין),
            // עם נפילה חכמה לגידול בין השנה הקודמת לנוכחית עבור מחלקה זו.
            let growthRate = avgFiveYearGrowthRate;
            // אם אין ממוצע גידול שנתי, חשב לפי הגידול של המחלקה עצמה
            if (!growthRate || growthRate === 0) {
                if (safe2024 > 0) {
                    growthRate = (safe2025 - safe2024) / safe2024;
                } else {
                    growthRate = 0.05; // ברירת מחדל: 5% גידול אם אין נתונים
                }
            }
            // הצפי הוא השנה הנוכחית + גידול שנתי ממוצע
            const forecastAbs = safe2025 * (1 + growthRate);
            let forecast = parseFloat((forecastAbs / 1000000).toFixed(1));
            
            // ודא שהצפי שונה מהשנה הנוכחית (לפחות 1% הבדל) כדי שהקו יופיע
            if (Math.abs(forecast - val2025) < 0.01) {
                // אם הצפי זהה לשנה הנוכחית, הוסף גידול מינימלי של 5%
                forecast = parseFloat((safe2025 * 1.05 / 1000000).toFixed(1));
            }

            return [
                item.DepartmentName,
                val2025,
                label2025,
                val2024,
                label2024,
                forecast, // Forecast line (red, dashed)
            ];
        });

        console.log("Final chartData:", this.chartData);
        console.log("Chart data length:", this.chartData.length);
        if (this.chartData.length > 0) {
            console.log("First chart row:", this.chartData[0]);
        }
        this.cdr.detectChanges();
    }

    /**
     * Calculate top 5 departments by growth (difference or percentage)
     * Requirements: 2025 values must be higher than 2024
     */
    calculateTopDepartments(): void {
        this.topDepartments = this.departmentIncomeData
            .filter((dept) => dept.Income2025 >= dept.Income2024) // Only show positive growth
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
            }))
            .sort((a, b) => b.difference - a.difference)
            .slice(0, 5);
    }

    /**
     * Olympic podium order: 2nd, 1st, 3rd, 4th, 5th (1st in center, highest)
     */
    get podiumOrder(): { place: number; dept: TopDepartmentDto; medal: string; height: number }[] {
        if (!this.topDepartments || this.topDepartments.length === 0) return [];
        const d = this.topDepartments;
        const medals = ["🥇", "🥈", "🥉", "4", "5"];
        const heights = [62, 100, 62, 38, 38]; // 1st center highest, sides a bit lower
        const order = [1, 0, 2, 3, 4]; // display: 2nd, 1st, 3rd, 4th, 5th
        return order.slice(0, d.length).map((idx, i) => ({
            place: idx + 1,
            dept: d[idx],
            medal: medals[idx],
            height: heights[idx],
        }));
    }

    /**
     * Open department details from podium click
     */
    onPodiumDepartmentClick(departmentName: string): void {
        this.loadDepartmentSpecificGraph(departmentName);
    }

    /** Open department details when user clicks a bar/point on main chart */
    onMainChartSelect(event: any): void {
        const sel = event?.selection?.[0];
        const row = sel?.row;
        if (row != null && this.chartData && this.chartData[row] && this.chartData[row][0]) {
            const departmentName = this.chartData[row][0] as string;
            this.loadDepartmentSpecificGraph(departmentName);
        }
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
     * Load yearly totals silently for chart year detection
     */
    loadYearlyTotalsForChart(): void {
        this.http.post(environment.url + "GetYearlyTotalIncome", {}).subscribe(
            (response: any) => {
                if (response && response.d) {
                    let data = response.d;
                    if (typeof data === "string") {
                        data = JSON.parse(data);
                        data = data.d;
                    }

                    if (Array.isArray(data)) {
                        this.yearlyTotalData = data;
                        // Only update chart if we have department data loaded
                        if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
                            // Use setTimeout to ensure chart is ready before updating
                            setTimeout(() => {
                                this.updateChartColumns(); // Update chart columns with dynamic years
                                this.updateChartData(); // Refresh chart with new columns
                                this.updateChartOptions(); // Update chart options (series configuration)
                                this.cdr.detectChanges();
                            }, 100);
                        }
                    }
                }
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
        this.showBossDashboard = true;

        this.http.post(environment.url + "GetYearlyTotalIncome", {}).subscribe(
            (response: any) => {
                console.log("Response:", response);

                if (response && response.d) {
                    let data = response.d;
                    if (typeof data === "string") {
                        data = JSON.parse(data);
                        data = data.d;
                    }

                    console.log("Parsed data:", data);

                    if (Array.isArray(data)) {
                        this.yearlyTotalData = data;
                        
                        // Update chart columns if department data is already loaded
                        // Use setTimeout to avoid interfering with chart rendering
                        if (this.departmentIncomeData && this.departmentIncomeData.length > 0) {
                            setTimeout(() => {
                                this.updateChartColumns();
                                this.updateChartData();
                                this.cdr.detectChanges();
                            }, 100);
                        }
                        
                        // Debug: Log the data for troubleshooting
                        console.log("Yearly Total Data:", this.yearlyTotalData);
                        console.log("Older Year:", this.getOlderYear(), "Total:", this.getOlderYearTotal());
                        console.log("Latest Year:", this.getLatestYear(), "Total:", this.getLatestYearTotal());
                        console.log("Difference:", this.getTotalDifference());
                        console.log("Percentage Change:", this.calculateYearlyPercentageChange());

                        this.isLoading = false;
                        this.cdr.detectChanges();
                        this.snackBar.open("✓ דוח למנהל נטען בהצלחה", "סגור", {
                            duration: 2000,
                        });
                    } else {
                        console.error("Data is not an array:", data);
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

    /**
     * Load detailed department data
     */
    loadDetailedDepartmentData(departmentName: string): void {
        this.catalogLoading = true;
        this.http
            .post(environment.url + "GetDepartmentDetailedData", {
                departmentName: departmentName,
            })
            .subscribe(
                (response: any) => {
                    if (response && response.d) {
                        // Set data source
                        this.detailedDataSource.data = response.d;

                        // Set default view to cash and sort by 2025 (descending)
                        this.selectedViewType = "cash";
                        this.displayedCatalogColumns = this.cashColumns;

                        // Sort by Cash2025 descending (highest to lowest)
                        this.sortDetailedDataByCash2025Descending();
                        this.updateCatalogChartData();
                        this.updateDepartmentYearlyChart();

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
        this.detailedDataSource.data = [];
        this.selectedViewType = "cash";
        this.catalogViewMode = "table";
        this.catalogZoomLevel = 1; // Reset zoom when closing
        this.displayedCatalogColumns = this.cashColumns;
        this.cdr.detectChanges();
    }

    /**
     * Zoom in/out for catalog table
     */
    zoomInCatalog(): void {
        this.catalogZoomLevel = Math.min(this.catalogZoomLevel + 0.1, 2); // Max zoom 2x
        this.cdr.detectChanges();
    }

    zoomOutCatalog(): void {
        this.catalogZoomLevel = Math.max(this.catalogZoomLevel - 0.1, 0.5); // Min zoom 0.5x
        this.cdr.detectChanges();
    }

    resetCatalogZoom(): void {
        this.catalogZoomLevel = 1;
        this.cdr.detectChanges();
    }

    /** Build chart data for catalog (services by year) in department modal */
    updateCatalogChartData(): void {
        const data = this.detailedDataSource.data;
        if (!data || data.length === 0) {
            this.catalogChartData = [];
            this.cdr.detectChanges();
            return;
        }
        const top = data.slice(0, 20);
        this.catalogChartData = top.map((r: any) => [
            (r.CatalogName2 || "").substring(0, 25),
            parseFloat(((r.Cash2025 || 0) / 1000000).toFixed(2)),
        ]);
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

        this.updateDepartmentYearlyChart();
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
    
    // Update chart columns (ללא ממוצע לפי שנים – רק צפי גידול שנתי)
    // שים לב: עמודת הצפי היא עמודת מספר רגילה (ללא role),
    // כדי שתהפוך לסדרת קו אדומה בגרף (series index 2).
    this.chartColumns = [
        "מחלקה",
        { type: "number", label: latestYear || "שנה נוכחית" },
        { type: "string", role: "annotation" },
        { type: "number", label: olderYear || "שנה קודמת" },
        { type: "string", role: "annotation" },
        { type: "number", label: "צפי גידול שנתי" },
    ];
    
    // Update chart options title with formatted text
    if (this.chartOptions && olderYear && latestYear) {
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
     * Export main department table to Excel
     */
    exportMainTableToExcel(): void {
        const olderYear = this.getOlderYearFromDeptData();
        const latestYear = this.getLatestYearFromDeptData();
        const rows = [
            ["מחלקה", `הכנסות ${olderYear}`, `הכנסות ${latestYear}`, "הפרש", "אחוז שינוי"],
            ...this.departmentIncomeData.map((item) => [
                item.DepartmentName,
                item.Income2024,
                item.Income2025,
                this.calculateDifference(item),
                this.calculatePercentageChange(item),
            ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "הכנסות מחלקות");
        XLSX.writeFile(wb, `הכנסות_מחלקות_${olderYear}_${latestYear}.xlsx`);
        this.snackBar.open("✓ יוצא לאקסל בהצלחה", "סגור", { duration: 2000 });
    }

    /**
     * Export catalog (services by year) table to Excel
     */
    exportCatalogToExcel(): void {
        if (!this.detailedDataSource.data || this.detailedDataSource.data.length === 0) {
            this.snackBar.open("אין נתונים לייצוא", "סגור", { duration: 2000 });
            return;
        }
        const data = this.detailedDataSource.data;
        const headers = ["שירות", "2021 (₪)", "2022 (₪)", "2023 (₪)", "2024 (₪)", "2025 (₪)", "הפרש ₪", "% שינוי"];
        const rows = [
            headers,
            ...data.map((e: any) => [
                e.CatalogName2,
                e.Cash2021,
                e.Cash2022,
                e.Cash2023,
                e.Cash2024,
                e.Cash2025,
                this.cashDiff(e),
                this.cashPct(e),
            ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "שירותים לפי שנה");
        const name = this.selectedDepartment ? this.selectedDepartment.DepartmentName : "מחלקה";
        XLSX.writeFile(wb, `שירותים_לפי_שנה_${name}.xlsx`);
        this.snackBar.open("✓ יוצא לאקסל בהצלחה", "סגור", { duration: 2000 });
    }

    /**
     * Export boss dashboard to Excel
     */
    exportBossToExcel(): void {
        const rows = [
            ["דוח הכנסות כללי"],
            ["שנה", "סך הכנסות (₪)"],
            ...this.yearlyTotalData.map((y) => [y.Year, y.TotalRealValue]),
            [],
            [this.getOlderYear(), this.getOlderYearTotal()],
            [this.getLatestYear(), this.getLatestYearTotal()],
            ["הפרש", this.getTotalDifference()],
            ["אחוז שינוי", this.calculateYearlyPercentageChange()],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "דוח למנהל");
        XLSX.writeFile(wb, `דוח_הכנסות_כללי.xlsx`);
        this.snackBar.open("✓ יוצא לאקסל בהצלחה", "סגור", { duration: 2000 });
    }

    /**
     * Download summary document (HTML) for main screen
     */
    exportSummaryDocMain(): void {
        const olderYear = this.getOlderYearFromDeptData();
        const latestYear = this.getLatestYearFromDeptData();
        const html = `
<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>סיכום דוח הכנסות מחלקות</title></head><body style="font-family: Arial; padding: 20px;">
<h1>סיכום דוח הכנסות מחלקות</h1>
<p><strong>תאריך:</strong> ${new Date().toLocaleDateString("he-IL")}</p>
<p><strong>אגף:</strong> ${this.selectedDiagnosis}</p>
<p><strong>הכנסה ${olderYear}:</strong> ${this.formatNumber(this.getOlderYearTotal())} ₪</p>
<p><strong>הכנסה ${latestYear}:</strong> ${this.formatNumber(this.getLatestYearTotal())} ₪</p>
<p><strong>הפרש:</strong> ${this.formatNumber(this.getTotalDifference())} ₪ (${this.calculateYearlyPercentageChange()})</p>
<h2>TOP 5 מחלקות</h2>
<ul>${(this.topDepartments || []).map((d) => `<li>${d.DepartmentName}: ${this.formatNumber(d.Income2025)} ₪</li>`).join("")}</ul>
</body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        saveAs(blob, `סיכום_דוח_מחלקות_${new Date().toISOString().slice(0, 10)}.html`);
        this.snackBar.open("✓ מסמך סיכום הורד", "סגור", { duration: 2000 });
    }

    /**
     * Download summary document for catalog (department details) modal
     */
    exportSummaryDocCatalog(): void {
        if (!this.selectedDepartment) return;
        const olderYear = this.getOlderYearFromDeptData();
        const latestYear = this.getLatestYearFromDeptData();
        const html = `
<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>סיכום מחלקה ${this.selectedDepartment.DepartmentName}</title></head><body style="font-family: Arial; padding: 20px;">
<h1>סיכום מחלקה: ${this.selectedDepartment.DepartmentName}</h1>
<p><strong>הכנסות ${olderYear}:</strong> ${this.formatNumber(this.selectedDepartment.Income2024)} ₪</p>
<p><strong>הכנסות ${latestYear}:</strong> ${this.formatNumber(this.selectedDepartment.Income2025)} ₪</p>
<p><strong>הפרש:</strong> ${this.formatNumber(this.calculateDifference(this.selectedDepartment))} ₪ (${this.calculatePercentageChange(this.selectedDepartment)})</p>
<p><strong>מספר שורות בטבלת שירותים:</strong> ${this.detailedDataSource.data?.length || 0}</p>
</body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        saveAs(blob, `סיכום_${this.selectedDepartment.DepartmentName}.html`);
        this.snackBar.open("✓ מסמך סיכום הורד", "סגור", { duration: 2000 });
    }

    /**
     * Download summary document for boss dashboard
     */
    exportSummaryDocBoss(): void {
        const html = `
<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>סיכום דוח למנהל</title></head><body style="font-family: Arial; padding: 20px;">
<h1>סיכום דוח הכנסות כללי</h1>
<p><strong>תאריך:</strong> ${new Date().toLocaleDateString("he-IL")}</p>
<p><strong>סך הכנסות ${this.getOlderYear()}:</strong> ${this.formatNumber(this.getOlderYearTotal())} ₪</p>
<p><strong>סך הכנסות ${this.getLatestYear()}:</strong> ${this.formatNumber(this.getLatestYearTotal())} ₪</p>
<p><strong>הפרש:</strong> ${this.formatNumber(this.getTotalDifference())} ₪ (${this.calculateYearlyPercentageChange()})</p>
</body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        saveAs(blob, `סיכום_דוח_מנהל_${new Date().toISOString().slice(0, 10)}.html`);
        this.snackBar.open("✓ מסמך סיכום הורד", "סגור", { duration: 2000 });
    }

    /**
     * Dismiss the guide avatar
     */
    dismissGuideAvatar(): void {
        this.showGuideAvatar = false;
        localStorage.setItem("dashboardGuideAvatarDismissed", "true");
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

    unitsDiff(e: any): number {
        const a = Number(e?.Units2025 ?? 0);
        const b = Number(e?.Units2024 ?? 0);
        return a - b;
    }

    unitsPct(e: any): string {
        const a = Number(e?.Units2025 ?? 0);
        const b = Number(e?.Units2024 ?? 0);
        if (!b) return a ? "∞" : "0%";
        return `${(((a - b) / b) * 100).toFixed(1)}%`;
    }
    get currentYear() {
        return new Date().getFullYear();
    }

    /**
     * מחזיר תווית שנה דינמית עבור טבלת פרטי מחלקה,
     * כאשר offset 0 = השנה האחרונה, 1 = שנה אחורה, עד 4 = לפני 4 שנים.
     * עובד תקין גם אם השנה האחרונה היא 2030 ומעלה.
     */
    getYearLabelForOffset(offsetFromLatest: number): string {
        const latestYearStr = this.getLatestYearFromDeptData();
        if (!latestYearStr) {
            return "";
        }
        const latest = parseInt(latestYearStr, 10);
        if (isNaN(latest)) {
            return latestYearStr;
        }
        return (latest - offsetFromLatest).toString();
    }

    /**
     * ממוצע גידול שנתי ב־5 השנים האחרונות בכלל הארגון (לשימוש כבסיס לצפי)
     */
    getAverageFiveYearGrowthRate(): number {
        if (!this.yearlyTotalData || this.yearlyTotalData.length < 2) {
            return 0;
        }

        const sorted = [...this.yearlyTotalData]
            .sort((a, b) => parseInt(a.Year) - parseInt(b.Year))
            .slice(-5); // עד חמש השנים האחרונות

        if (sorted.length < 2) {
            return 0;
        }

        let totalRate = 0;
        let periods = 0;

        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1].TotalRealValue;
            const curr = sorted[i].TotalRealValue;
            if (prev > 0) {
                totalRate += (curr - prev) / prev;
                periods++;
            }
        }

        return periods > 0 ? totalRate / periods : 0;
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
        const older = this.getOlderYearFromDeptData() || (this.currentYear - 1).toString();
        const latest = this.getLatestYearFromDeptData() || this.currentYear.toString();
        return `השוואה בין ${older} ל־${latest}: הפרש כספי ואחוז שינוי`;
    }

    /**
     * KPI helpers for new dashboard layout
     */
    getMonthlyRecurringRevenue(): number {
        const latest = this.getLatestYearTotal();
        if (!latest) {
            return 0;
        }
        // Approximate monthly recurring revenue as yearly / 12
        return latest / 12;
    }

    getArpuPerDepartment(): number {
        if (!this.departmentIncomeData || this.departmentIncomeData.length === 0) {
            return 0;
        }
        const latest = this.getLatestYearTotal();
        return latest / this.departmentIncomeData.length;
    }

    /**
     * כיתוב מסביר לפי מה נמדד גרף פרטי מחלקה (כסף / יחידות)
     */
    getDepartmentChartUnitLabel(): string {
        if (this.selectedViewType === "units") {
            return "הגרף נמדד במספר יחידות שירות (כמות פעולות) לכל שנה במחלקה";
        }
        if (this.selectedViewType === "both") {
            return "הגרף נמדד בסך ההכנסות במיליוני ₪ (מחירי 2025 ריאליים) לכל שנה במחלקה";
        }
        return "הגרף נמדד בסך ההכנסות במיליוני ₪ (מחירי 2025 ריאליים) לכל שנה במחלקה";
    }

    /**
     * Change main dashboard view (chart / table / top5)
     */
    setActiveView(view: string): void {
        this.activeView = view;
    }

    /**
     * עדכון גרף שנתי בפרטי מחלקה (כסף / יחידות + יעד גידול שנתי)
     */
    updateDepartmentYearlyChart(): void {
        if (!this.detailedDataSource?.data || this.detailedDataSource.data.length === 0) {
            this.departmentYearlyChartData = [];
            return;
        }

        // סיכום לפי שנים מתוך טבלת השירותים
        const sum = {
            cash: { "2021": 0, "2022": 0, "2023": 0, "2024": 0, "2025": 0 },
            units: { "2021": 0, "2022": 0, "2023": 0, "2024": 0, "2025": 0 },
        };

        for (const row of this.detailedDataSource.data) {
            sum.cash["2021"] += Number(row.Cash2021 || 0);
            sum.cash["2022"] += Number(row.Cash2022 || 0);
            sum.cash["2023"] += Number(row.Cash2023 || 0);
            sum.cash["2024"] += Number(row.Cash2024 || 0);
            sum.cash["2025"] += Number(row.Cash2025 || 0);

            sum.units["2021"] += Number(row.Units2021 || 0);
            sum.units["2022"] += Number(row.Units2022 || 0);
            sum.units["2023"] += Number(row.Units2023 || 0);
            sum.units["2024"] += Number(row.Units2024 || 0);
            sum.units["2025"] += Number(row.Units2025 || 0);
        }

        const yearsOrder = ["2021", "2022", "2023", "2024", "2025"];
        const metricIsUnits = this.selectedViewType === "units";

        const valuesPerYear: { year: string; value: number }[] = [];
        yearsOrder.forEach((y) => {
            const raw = metricIsUnits ? sum.units[y] : sum.cash[y];
            if (raw && !isNaN(raw)) {
                const val = metricIsUnits ? raw : parseFloat((raw / 1000000).toFixed(1));
                valuesPerYear.push({ year: y, value: val });
            }
        });

        if (valuesPerYear.length === 0) {
            this.departmentYearlyChartData = [];
            return;
        }

        // יעד גידול שנתי – לפי קצב גידול ממוצע (כללי), ואם אין אז לפי המחלקה עצמה
        const avgOrgGrowth = this.getAverageFiveYearGrowthRate();

        this.departmentYearlyChartColumns = [
            "שנה",
            {
                type: "number",
                label: metricIsUnits
                    ? "מספר יחידות"
                    : "הכנסות (מיליוני ₪)",
            },
            { type: "string", role: "annotation" },
            { type: "number", label: "צפי גידול שנתי (יעד)" },
        ];

        const rows: any[] = [];
        for (let i = 0; i < valuesPerYear.length; i++) {
            const curr = valuesPerYear[i];
            const prev = i > 0 ? valuesPerYear[i - 1] : null;

            let diffLabel = "";
            if (prev) {
                const diff = curr.value - prev.value;
                const pct = prev.value !== 0 ? (diff / prev.value) * 100 : 0;
                const sign = diff >= 0 ? "+" : "";
                diffLabel =
                    metricIsUnits
                        ? `${sign}${diff.toFixed(0)} (${pct.toFixed(1)}%)`
                        : `${sign}${diff.toFixed(1)}M (${pct.toFixed(1)}%)`;
            }

            // יעד לשנה הבאה על בסיס השנה הנוכחית
            let growthRate = avgOrgGrowth;
            if (!growthRate || growthRate === 0) {
                if (prev && prev.value > 0) {
                    growthRate = (curr.value - prev.value) / prev.value;
                } else {
                    growthRate = 0.05;
                }
            }
            let forecast = curr.value * (1 + growthRate);
            if (Math.abs(forecast - curr.value) < (metricIsUnits ? 1 : 0.01)) {
                forecast = curr.value * 1.05;
            }

            rows.push([curr.year, curr.value, diffLabel, parseFloat(forecast.toFixed(metricIsUnits ? 0 : 1))]);
        }

        this.departmentYearlyChartData = rows;

        // עדכון אופציות (סוג תרשים: קו / עמודות) + ציר X לפי סוג מדידה
        this.departmentYearlyChartOptions.hAxis.title = metricIsUnits
            ? "מספר יחידות שירות"
            : "הכנסות (מיליוני ₪)";

        if (this.departmentChartType === "line") {
            this.departmentYearlyChartOptions.seriesType = "line";
            this.departmentYearlyChartOptions.series = {
                0: { type: "line", color: "#0ea5e9", lineWidth: 3, pointSize: 5 },
                1: {
                    type: "line",
                    lineDashStyle: [6, 6],
                    color: "#ef4444",
                    pointSize: 6,
                    pointShape: "triangle",
                    lineWidth: 2,
                    visibleInLegend: true,
                },
            };
            delete this.departmentYearlyChartOptions.bars;
        } else {
            this.departmentYearlyChartOptions.seriesType = "bars";
            this.departmentYearlyChartOptions.bars = "horizontal";
            this.departmentYearlyChartOptions.series = {
                0: { type: "bars", color: "#0ea5e9" },
                1: {
                    type: "line",
                    lineDashStyle: [6, 6],
                    color: "#ef4444",
                    pointSize: 6,
                    pointShape: "triangle",
                    lineWidth: 2,
                    visibleInLegend: true,
                },
            };
        }

        this.departmentYearlyChartOptions = { ...this.departmentYearlyChartOptions };
        this.cdr.detectChanges();
    }

    /**
     * Update chart options based on chart type (columns/line)
     */
    updateChartOptions(): void {
        const olderYear = this.getOlderYearFromDeptData();
        const latestYear = this.getLatestYearFromDeptData();
        
        // Update column labels (ללא ממוצע שנתי לפי שנים – רק צפי גידול)
        this.chartColumns = [
            "מחלקה",
            { type: "number", label: latestYear || "שנה נוכחית" },
            { type: "string", role: "annotation" },
            { type: "number", label: olderYear || "שנה קודמת" },
            { type: "string", role: "annotation" },
            { type: "number", label: "צפי גידול שנתי" },
        ];

        // עדכן את כותרת הגרף עם עיצוב
        const titleText = `השוואת הכנסות מחלקות - ${olderYear} vs ${latestYear}`;
        this.chartOptions.title = titleText;
        
        // צבעים מודרניים; צפי גידול שנתי מסומן כקו אדום מקווקו וברור
        // עבור ComboChart: עמודות 0 ו-1, קו אדום 2
        if (this.chartType === "line") {
            this.chartOptions.seriesType = "line";
            this.chartOptions.series = {
                0: { type: "line", color: "#0ea5e9", lineWidth: 3, pointSize: 5 },
                1: { type: "line", color: "#8b5cf6", lineWidth: 3, pointSize: 5 },
                // צפי גידול שנתי – קו מקווקו אדום, דק ובהיר, עם נקודות בצורת חץ
                2: {
                    type: "line",
                    lineDashStyle: [6, 6],
                    color: "#ef4444",
                    pointSize: 8,
                    pointShape: "triangle",
                    lineWidth: 3,
                    visibleInLegend: true,
                },
            };
        } else {
            // תצוגת עמודות: עמודות 0 ו-1, קו אדום 2 (אופקי)
            this.chartOptions.seriesType = "bars";
            this.chartOptions.bars = "horizontal";
            this.chartOptions.series = {
                0: { type: "bars", color: "#0ea5e9" },
                1: { type: "bars", color: "#8b5cf6" },
                // קו צפי גידול שנתי – תמיד מקווקו אדום ובהיר
                2: {
                    type: "line",
                    lineDashStyle: [6, 6],
                    color: "#ef4444",
                    pointSize: 8,
                    pointShape: "triangle",
                    lineWidth: 3,
                    visibleInLegend: true,
                },
            };
        }
        
        // עדכן את chartOptions כדי ש-Google Charts יזהה את השינויים
        this.chartOptions = { ...this.chartOptions };
        this.cdr.detectChanges();
    }
}


