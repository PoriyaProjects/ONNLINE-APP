import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { environment } from "src/environments/environment";

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
        { type: "number", label: "" }, // Will be updated dynamically
        { type: "string", role: "annotation" },
        { type: "number", label: "" }, // Will be updated dynamically
        { type: "string", role: "annotation" },
    ];

    chartOptions: any = {
        title: "השוואת הכנסות מחלקות", // Will be updated dynamically
        titleTextStyle: {
            color: "#333",
            fontSize: 16,
            bold: true,
        },
        hAxis: {
            title: "מחלקה",
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
            titleTextStyle: {
                color: "#333",
                fontSize: 12,
                bold: true,
            },
            slantedText: true,
            slantedTextAngle: 45,
        },
        vAxis: {
            title: "סכום הכנסות (מיליוני ₪)",
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
        bars: "vertical",
        legend: {
            position: "top",
            textStyle: {
                color: "#555",
                fontSize: 11,
            },
        },
        chartArea: {
            width: "75%",
            height: "75%",
            left: 80,
            top: 50,
        },
        colors: ["#667eea", "#f5576c"],
        backgroundColor: {
            fill: "#ffffff",
            stroke: "#ddd",
            strokeWidth: 1,
        },
        dataOpacity: 0.9,
        annotations: {
            alwaysOutside: false,
            textStyle: {
                fontSize: 10,
                bold: true,
                color: "#333",
                fontName: "Arial",
            },
        },
        bar: {
            groupWidth: "75%",
        },
        tooltip: {
            isHtml: true,
            trigger: "focus",
            textStyle: {
                color: "#333",
                fontSize: 12,
            },
        },
        enableInteractivity: true,
        animation: {
            startup: true,
            duration: 1000,
            easing: "out",
        },
        // Make bars clickable
        focusTarget: "category",
        // Modern styling
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
    selectedViewType: string = "cash";
    chartType: string = "ColumnChart"; // 'ColumnChart' or 'LineChart'

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

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        console.log("gOnInit called");
        // Check if guide was previously dismissed
        const guideDismissed = localStorage.getItem("dashboardGuideAvatarDismissed");
        if (guideDismissed === "true") {
            this.showGuideAvatar = false;
        }

       // Load employee info from localStorage + API
       this.employeeUserName = localStorage.getItem("loginUserName");
       this.employeeFirstName = localStorage.getItem("FirstName");
       this.employeeLastName = localStorage.getItem("LastName");
       this.employeeFunctionDescription = localStorage.getItem("FunctionDescription");
       this.employeeLocalDepartment = localStorage.getItem("Depart");

       if (this.employeeUserName) {
           this.loadEmployeeInfo(this.employeeUserName);
       }

        // Initialize chart theme
        this.updateChartTheme();
        this.updateChartOptionsForType();
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
                        this.updateChartTheme(); // Update chart theme after data load
                        this.updateChartData();
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
        // Show loading indicator when switching departments
        this.isMainDataLoading = true;
        this.isDataLoaded = false;
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
                        console.log("Sample Income2025 values:", this.departmentIncomeData.slice(0, 3).map(d => d.Income2025));
                        
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
        console.log("updateChartData called");
        console.log("departmentIncomeData:", this.departmentIncomeData);

        this.isChartLoading = true;

        if (
            !this.departmentIncomeData ||
            this.departmentIncomeData.length === 0
        ) {
            this.chartData = [];
            this.isChartLoading = false;
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
        const filtered = this.departmentIncomeData.filter((item) => {
            const has2024 = item.Income2024 && !isNaN(item.Income2024) && item.Income2024 > 0;
            const has2025 = item.Income2025 && !isNaN(item.Income2025) && item.Income2025 > 0;
            return has2024 || has2025; // Show if at least one year has data
        });
        
        console.log("Filtered departments count:", filtered.length);
        console.log("Filtered sample:", filtered.slice(0, 3).map(d => ({
            name: d.DepartmentName,
            Income2024: d.Income2024,
            Income2025: d.Income2025
        })));

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

        console.log("Final chartData:", this.chartData);
        console.log("Chart data length:", this.chartData.length);
        if (this.chartData.length > 0) {
            console.log("First chart row:", this.chartData[0]);
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
      this.isDataLoaded = false;
      this.loadDepartmentIncomeByDiagnosis();
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
                                this.updateChartTheme(); // Update chart theme
                                this.updateChartData(); // Refresh chart with new columns
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
                                this.updateChartTheme(); // Update chart theme
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
        this.cdr.detectChanges();
    }

    /**
     * Update chart colors and styles based on theme
     */
    updateChartTheme(): void {
        if (this.isDark) {
            // Dark theme colors
            this.chartOptions.titleTextStyle.color = "#e5e7eb";
            this.chartOptions.hAxis.textStyle.color = "rgba(229, 231, 235, 0.85)";
            this.chartOptions.hAxis.titleTextStyle.color = "#e5e7eb";
            this.chartOptions.vAxis.textStyle.color = "rgba(229, 231, 235, 0.85)";
            this.chartOptions.vAxis.titleTextStyle.color = "#e5e7eb";
            this.chartOptions.legend.textStyle.color = "rgba(229, 231, 235, 0.85)";
            this.chartOptions.annotations.textStyle.color = "#e5e7eb";
            this.chartOptions.tooltip.textStyle.color = "#0f172a";
            this.chartOptions.backgroundColor.fill = "rgba(255, 255, 255, 0.06)";
            this.chartOptions.backgroundColor.stroke = "rgba(255, 255, 255, 0.10)";
        } else {
            // Light theme colors
            this.chartOptions.titleTextStyle.color = "#333";
            this.chartOptions.hAxis.textStyle.color = "#555";
            this.chartOptions.hAxis.titleTextStyle.color = "#333";
            this.chartOptions.vAxis.textStyle.color = "#555";
            this.chartOptions.vAxis.titleTextStyle.color = "#333";
            this.chartOptions.legend.textStyle.color = "#555";
            this.chartOptions.annotations.textStyle.color = "#333";
            this.chartOptions.tooltip.textStyle.color = "#333";
            this.chartOptions.backgroundColor.fill = "#ffffff";
            this.chartOptions.backgroundColor.stroke = "#ddd";
        }
        // Force chart update
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
            console.log("Chart select event:", event);
            
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
            
            if (selectedRow !== null && selectedRow !== undefined) {
                console.log("Selected row:", selectedRow);
                
                if (this.chartData && this.chartData.length > selectedRow) {
                    const departmentName = this.chartData[selectedRow][0]; // First column is department name
                    console.log("Department name:", departmentName);
                    
                    if (departmentName) {
                        this.loadDepartmentSpecificGraph(departmentName);
                    }
                }
            }
        } catch (error) {
            console.error("Error handling chart click:", error);
        }
    }
}


