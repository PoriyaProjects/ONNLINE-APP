import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
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
}

export interface YearlyIncomeDto {
  Year: string;
  TotalRealValue: number;
}

@Component({
  selector: 'app-department-income-dashboard',
  templateUrl: './department-income-dashboard.component.html',
  styleUrls: ['./department-income-dashboard.component.css']
})
export class DepartmentIncomeDashboardComponent implements OnInit {

  // Data arrays
  departmentIncomeData: DepartmentComparisonDto[] = [];
  departmentDetailedData: DepartmentDetailedDataDto[] = [];
  diagnosesList: string[] = [];
  allDepartmentsData: DepartmentComparisonDto[] = [];
  yearlyTotalData: YearlyIncomeDto[] = [];

  // Chart data
  chartData: any[] = [];
  chartColumns: string[] = ['מחלקה', '2024', '2025'];
  chartOptions = {
    title: 'השוואת הכנסות מחלקות - 2024 vs 2025',
    hAxis: {
      title: 'סכום הכנסות'
    },
    vAxis: {
      title: 'מחלקה'
    },
    bars: 'horizontal',
    legend: { position: 'bottom' },
    chartArea: { width: '70%' }
  };

  
  // Boss Dashboard
  showBossDashboard = false;
  bossDashboardDataSource = new MatTableDataSource<DepartmentComparisonDto>([]);
  bossDashboardColumns: string[] = ['DepartmentName', 'Income2024', 'Income2025'];
  total2024 = 0;
  total2025 = 0;
  // Table data
  displayedColumns: string[] = [
    'DepartmentName',
    'Income2024',
    'Income2025',
    'Difference'
  ];
  dataSource = new MatTableDataSource<DepartmentComparisonDto>([]);

  // Detailed table data
  detailedDisplayedColumns: string[] = [
    'Year',
    'Month',
    'IncomeCategory',
    'RealValue',
    'ChargedUnits',
    'CatalogName'
  ];
  detailedDataSource = new MatTableDataSource<DepartmentDetailedDataDto>([]);

  // UI State
  isDataLoaded = false;
  selectedDepartment: DepartmentComparisonDto | null = null;
  selectedDiagnosis: string = 'אגף כירורגי';
  isDetailedViewOpen = false;
  isLoading = false;
  

  
  // Department Details
  isDepartmentGraphOpen = false;
  departmentGraphTitle = '';
  catalogLoading = false;
  selectedViewType: string = 'cash';
  cashColumns: string[] = ['CatalogName2', 'Cash2021', 'Cash2022', 'Cash2023', 'Cash2024', 'Cash2025'];
  unitsColumns: string[] = ['CatalogName2', 'Units2021', 'Units2022', 'Units2023', 'Units2024', 'Units2025'];
  bothColumns: string[] = ['CatalogName2', 'Cash2021', 'Units2021', 'Cash2022', 'Units2022', 'Cash2023', 'Units2023', 'Cash2024', 'Units2024', 'Cash2025', 'Units2025'];
  displayedCatalogColumns: string[] = this.cashColumns;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDepartmentIncomeData();
    this.loadDiagnosesList();
  }

  /**
   * Load department income comparison data
   */
  loadDepartmentIncomeData(): void {
    this.isDataLoaded = false;

    this.http
      .post(environment.url + "GetDepartmentIncomeComparison", {})
      .subscribe(
        (response: any) => {
          if (response && response.d) {
            this.departmentIncomeData = response.d;
            this.dataSource.data = response.d;
            this.updateChartData();
            this.isDataLoaded = true;
            this.cdr.detectChanges();
            this.snackBar.open('✓ נתונים נטענו בהצלחה', 'סגור', { duration: 3000 });
          }
        },
        (error) => {
          console.error('Error loading department income data:', error);
          this.snackBar.open('❌ שגיאה בטעינת הנתונים', 'סגור', { duration: 3000 });
        }
      );
  }

  /**
   * Load department income by selected diagnosis
   */
  loadDepartmentIncomeByDiagnosis(): void {
    this.isDataLoaded = false;

    this.http
      .post(environment.url + "GetDepartmentIncomeByDiagnosis", {
        diagnosis: this.selectedDiagnosis
      })
      .subscribe(
        (response: any) => {
          if (response && response.d) {
            this.departmentIncomeData = response.d;
            this.dataSource.data = response.d;
            this.updateChartData();
            this.isDataLoaded = true;
            this.cdr.detectChanges();
            this.snackBar.open('✓ נתונים עדכנו בהצלחה', 'סגור', { duration: 3000 });
          }
        },
        (error) => {
          console.error('Error loading diagnosis data:', error);
          this.snackBar.open('❌ שגיאה בטעינת הנתונים', 'סגור', { duration: 3000 });
        }
      );
  }

  /**
   * Load list of all diagnoses for dropdown filter
   */
  loadDiagnosesList(): void {
    this.http
      .post(environment.url + "GetUniqueDiagnoses", {})
      .subscribe(
        (response: any) => {
          if (response && response.d) {
            this.diagnosesList = response.d;
            this.cdr.detectChanges();
          }
        },
        (error) => {
          console.error('Error loading diagnoses list:', error);
        }
      );
  }

  /**
   * Update chart data from department income data
   */
  updateChartData(): void {
    this.chartData = this.departmentIncomeData.map(item => [
      item.DepartmentName,
      item.Income2024,
      item.Income2025
    ]);
  }

/**
 * Load boss dashboard with yearly totals from backend
 */
loadBossDashboard(): void {
  this.isLoading = true;
  
  this.http.post(environment.url + "GetYearlyTotalIncome", {})
    .subscribe(
      (response: any) => {
        console.log('Response:', response); // DEBUG
        
        if (response && response.d) {
          // Parse the JSON string if it's a string
          let data = response.d;
          if (typeof data === 'string') {
            data = JSON.parse(data);
            data = data.d; // Backend returns {d: [...]}
          }
          
          console.log('Parsed data:', data); // DEBUG
          
          // Make sure it's an array
          if (Array.isArray(data)) {
            this.yearlyTotalData = data;
            
            // Calculate totals from response
            this.total2024 = this.yearlyTotalData.find(y => y.Year === '2024')?.TotalRealValue || 0;
            this.total2025 = this.yearlyTotalData.find(y => y.Year === '2025')?.TotalRealValue || 0;
            
            this.isLoading = false;
            this.showBossDashboard = true;
            this.cdr.detectChanges();
            this.snackBar.open('✓ דוח למנהל נטען בהצלחה', 'סגור', { duration: 2000 });
          } else {
            console.error('Data is not an array:', data);
          }
        }
      },
      (error) => {
        console.error('Error loading boss dashboard:', error);
        this.isLoading = false;
        this.snackBar.open('❌ שגיאה בטעינת הנתונים', 'סגור', { duration: 3000 });
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
    this.selectedDepartment = this.departmentIncomeData.find(d => d.DepartmentName === departmentName) || null;
    if (!this.selectedDepartment) {
      this.snackBar.open('❌ לא נמצאה מחלקה', 'סגור', { duration: 2000 });
      return;
    }
    this.departmentGraphTitle = `פרטי מחלקה: ${departmentName}`;
    this.loadDetailedDepartmentData(departmentName);
  }

  /**
   * Load detailed department data
   */
  loadDetailedDepartmentData(departmentName: string): void {
    this.catalogLoading = true;
    this.http.post(environment.url + "GetDepartmentDetailedData", { departmentName: departmentName })
      .subscribe(
        (response: any) => {
          if (response && response.d) {
            this.detailedDataSource.data = response.d;
            this.catalogLoading = false;
            this.isDepartmentGraphOpen = true;
            this.cdr.detectChanges();
          }
        },
        (error) => {
          console.error('Error loading detailed data:', error);
          this.catalogLoading = false;
          this.snackBar.open('❌ שגיאה בטעינת הפרטים', 'סגור', { duration: 3000 });
        }
      );
  }

  /**
   * Close department graph
   */
  closeDepartmentGraph(): void {
    this.isDepartmentGraphOpen = false;
    this.selectedDepartment = null;
    this.detailedDataSource.data = [];
    this.selectedViewType = 'cash';
    this.displayedCatalogColumns = this.cashColumns;
    this.cdr.detectChanges();
  }

  /**
   * Change catalog view type (cash/units/both)
   */
  onViewTypeChange(viewType: string): void {
    this.selectedViewType = viewType;
    
    if (viewType === 'cash') {
      this.displayedCatalogColumns = this.cashColumns;
    } else if (viewType === 'units') {
      this.displayedCatalogColumns = this.unitsColumns;
    } else if (viewType === 'both') {
      this.displayedCatalogColumns = this.bothColumns;
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Handle row click to view detailed data
   */
  onDepartmentRowClick(row: DepartmentComparisonDto): void {
    this.selectedDepartment = row;
    this.isDetailedViewOpen = true;
    this.loadDetailedDepartmentData(row.DepartmentName);
  }

  /**
   * Close detailed view
   */
  closeDetailedView(): void {
    this.isDetailedViewOpen = false;
    this.selectedDepartment = null;
    this.departmentDetailedData = [];
    this.detailedDataSource.data = [];
  }

  /**
   * Calculate difference between years
   */
  calculateDifference(item: DepartmentComparisonDto): number {
    return item.Income2025 - item.Income2024;
  }

  /**
   * Get percentage change
   */
  calculatePercentageChange(item: DepartmentComparisonDto): string {
    if (item.Income2024 === 0) return '∞';
    const percentage = ((item.Income2025 - item.Income2024) / item.Income2024) * 100;
    return percentage.toFixed(2) + '%';
  }

  /**
   * Calculate percentage change for yearly data
   */
  calculateYearlyPercentageChange(): string {
    if (this.yearlyTotalData.length < 2) return '0%';
    const year2024 = this.yearlyTotalData.find(y => y.Year === '2024')?.TotalRealValue || 0;
    const year2025 = this.yearlyTotalData.find(y => y.Year === '2025')?.TotalRealValue || 0;
    
    if (year2024 === 0) return '∞';
    const percentage = ((year2025 - year2024) / year2024) * 100;
    return percentage.toFixed(2) + '%';
  }

  /**
   * Get 2024 total
   */
  getTotal2024(): number {
    return this.yearlyTotalData.find(y => y.Year === '2024')?.TotalRealValue || 0;
  }

  /**
   * Get 2025 total
   */
  getTotal2025(): number {
    return this.yearlyTotalData.find(y => y.Year === '2025')?.TotalRealValue || 0;
  }

  /**
   * Get difference between years
   */
  getTotalDifference(): number {
    return this.getTotal2025() - this.getTotal2024();
  }

  /**
   * Format number with commas
   */
  formatNumber(value: number): string {
    return value.toLocaleString('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  /**
   * Filter detailed table
   */
  applyDetailedFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.detailedDataSource.filter = filterValue.trim().toLowerCase();
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
    
    // Add headers
    csvContent += "מחלקה,הכנסות 2024,הכנסות 2025,הפרש,אחוז שינוי\n";
    
    // Add data rows
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

    this.snackBar.open('✓ הדוח יוצא בהצלחה', 'סגור', { duration: 2000 });
  }
}