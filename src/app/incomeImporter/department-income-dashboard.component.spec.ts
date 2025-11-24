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

  // Main Chart Configuration
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
    chartArea: { width: '70%' },
    // Enable click events
    pointSize: 7
  };

  // Department-Specific Chart (shown after click)
  departmentChartData: any[] = [];
  departmentChartColumns: string[] = ['חודש', 'הכנסות'];
  departmentChartOptions = {
    title: '',
    hAxis: {
      title: 'חודש'
    },
    vAxis: {
      title: 'הכנסות'
    },
    chartArea: { width: '80%', height: '70%' },
    legend: { position: 'bottom' }
  };

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
  
  // NEW: Track if department graph is showing
  isDepartmentGraphOpen = false;
  departmentGraphTitle: string = '';

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
   * Handle row click to view detailed data
   */
  onDepartmentRowClick(row: DepartmentComparisonDto): void {
    this.selectedDepartment = row;
    this.isDetailedViewOpen = true;
    this.loadDetailedDepartmentData(row.DepartmentName);
  }

  /**
   * NEW: Handle department graph click
   * User clicks on a department in the main chart
   */
  onDepartmentChartClick(event: any): void {
    if (event.targetID && event.targetID.startsWith('row')) {
      const rowIndex = parseInt(event.targetID.replace('row', ''));
      if (rowIndex > 0 && rowIndex <= this.departmentIncomeData.length) {
        const selectedDept = this.departmentIncomeData[rowIndex - 1];
        console.log('Clicked department:', selectedDept.DepartmentName);
        
        // Load department-specific graph
        this.loadDepartmentSpecificGraph(selectedDept.DepartmentName);
      }
    }
  }

  /**
   * NEW: Load department-specific graph
   * Shows monthly income breakdown for selected department
   */
  loadDepartmentSpecificGraph(departmentName: string): void {
    this.selectedDepartment = this.departmentIncomeData.find(
      d => d.DepartmentName === departmentName
    ) || null;

    if (!this.selectedDepartment) {
      this.snackBar.open('❌ לא נמצאה מחלקה', 'סגור', { duration: 2000 });
      return;
    }

    // Load detailed data for this department
    this.loadDetailedDepartmentData(departmentName);

    // Prepare data for department graph
    this.prepareDepartmentGraph(departmentName);
  }

  /**
   * NEW: Prepare department graph data from detailed data
   * Groups data by month for the selected department
   */
  prepareDepartmentGraph(departmentName: string): void {
    // Map to track monthly totals
    const monthlyData: { [key: string]: number } = {};

    // Hebrew month names
    const months = [
      "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ];

    // Group detailed data by month and sum
    this.departmentDetailedData.forEach(item => {
      const key = item.Month;
      if (monthlyData[key]) {
        monthlyData[key] += item.RealValue;
      } else {
        monthlyData[key] = item.RealValue;
      }
    });

    // Convert to chart format
    this.departmentChartData = [];
    
    // Add data in month order
    months.forEach(month => {
      if (monthlyData[month]) {
        this.departmentChartData.push([month, monthlyData[month]]);
      }
    });

    // Update chart title
    this.departmentGraphTitle = `הכנסות חודשיות - ${departmentName}`;
    this.departmentChartOptions = {
      ...this.departmentChartOptions,
      title: this.departmentGraphTitle
    };

    // Show the graph
    this.isDepartmentGraphOpen = true;
    this.cdr.detectChanges();

    this.snackBar.open(`✓ גרף עבור ${departmentName} נטען`, 'סגור', { duration: 2000 });
  }

  /**
   * Load detailed data for specific department
   */
  loadDetailedDepartmentData(departmentName: string): void {
    this.http
      .post(environment.url + "GetDepartmentDetailedData", {
        departmentName: departmentName
      })
      .subscribe(
        (response: any) => {
          if (response && response.d) {
            this.departmentDetailedData = response.d;
            this.detailedDataSource.data = response.d;
            this.cdr.detectChanges();
            
            // If department graph is open, update it with new data
            if (this.isDepartmentGraphOpen && this.selectedDepartment) {
              this.prepareDepartmentGraph(this.selectedDepartment.DepartmentName);
            }
          }
        },
        (error) => {
          console.error('Error loading detailed data:', error);
          this.snackBar.open('❌ שגיאה בטעינת הפרטים', 'סגור', { duration: 3000 });
        }
      );
  }

  /**
   * Close department graph view
   */
  closeDepartmentGraph(): void {
    this.isDepartmentGraphOpen = false;
    this.departmentChartData = [];
    this.selectedDepartment = null;
    this.cdr.detectChanges();
  }

  /**
   * Close detailed view modal
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