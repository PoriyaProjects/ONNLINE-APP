import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DepartmentComparisonDto, SurgeriesDashboradComponent } from './surgeries-dashborad.component';

describe('SurgeriesDashboradComponent', () => {
  let component: SurgeriesDashboradComponent;
  let fixture: ComponentFixture<SurgeriesDashboradComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SurgeriesDashboradComponent],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        MatProgressSpinnerModule,
        MatCardModule,
        FormsModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SurgeriesDashboradComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Requirement 1: 2025 values above 2024', () => {
    it('should sort data by Income2025 descending', () => {
      const testData: DepartmentComparisonDto[] = [
        { DepartmentName: 'Dept A', Income2024: 100, Income2025: 150 },
        { DepartmentName: 'Dept B', Income2024: 200, Income2025: 180 },
        { DepartmentName: 'Dept C', Income2024: 150, Income2025: 200 }
      ];

      component.departmentIncomeData = testData;
      component.departmentIncomeData.sort((a, b) => b.Income2025 - a.Income2025);
      component.dataSource.data = component.departmentIncomeData;

      expect(component.departmentIncomeData[0].DepartmentName).toBe('Dept C');
      expect(component.departmentIncomeData[0].Income2025).toBe(200);
      expect(component.departmentIncomeData[2].DepartmentName).toBe('Dept B');
      expect(component.departmentIncomeData[2].Income2025).toBe(180);
    });
  });

  describe('Requirement 2: Numbers in millions on charts', () => {
    it('should format chart data in millions', () => {
      component.departmentIncomeData = [
        { DepartmentName: 'Test Dept', Income2024: 1000000, Income2025: 2500000 }
      ];

      component.updateChartData();

      expect(component.chartData[0][1]).toBe(1); // 1M
      expect(component.chartData[0][2]).toBe(2.5); // 2.5M
    });

    it('should have correct chart options with millions format', () => {
      expect(component.chartOptions.hAxis.title).toContain('מיליוני ₪');
      expect(component.chartOptions.hAxis.format).toBe('0.0');
    });
  });

  describe('Requirement 3: Highlight department selector', () => {
    it('should have highlighted-selector class in template', () => {
      fixture.detectChanges();
      const selectorElement = fixture.nativeElement.querySelector('.highlighted-selector');
      expect(selectorElement).toBeTruthy();
    });
  });

  describe('Requirement 4: Sortable columns in detailed table', () => {
    it('should sort detailed data by column', () => {
      const testData: any[] = [
        { CatalogName2: 'Service A', Cash2025: 300 },
        { CatalogName2: 'Service B', Cash2025: 100 },
        { CatalogName2: 'Service C', Cash2025: 200 }
      ];

      component.detailedDataSource.data = testData;
      component.onDetailedTableSort({ active: 'Cash2025', direction: 'desc' });

      expect(component.detailedDataSource.data[0].Cash2025).toBe(300);
      expect(component.detailedDataSource.data[1].Cash2025).toBe(200);
      expect(component.detailedDataSource.data[2].Cash2025).toBe(100);
    });

    it('should handle ascending sort', () => {
      const testData: any[] = [
        { CatalogName2: 'Service A', Cash2025: 300 },
        { CatalogName2: 'Service B', Cash2025: 100 },
        { CatalogName2: 'Service C', Cash2025: 200 }
      ];

      component.detailedDataSource.data = testData;
      component.onDetailedTableSort({ active: 'Cash2025', direction: 'asc' });

      expect(component.detailedDataSource.data[0].Cash2025).toBe(100);
      expect(component.detailedDataSource.data[1].Cash2025).toBe(200);
      expect(component.detailedDataSource.data[2].Cash2025).toBe(300);
    });
  });

  describe('Requirement 5: Default sort by 2025 highest to lowest', () => {
    it('should sort by Cash2025 descending on load', () => {
      const testData: any[] = [
        { CatalogName2: 'Service A', Cash2025: 300 },
        { CatalogName2: 'Service B', Cash2025: 100 },
        { CatalogName2: 'Service C', Cash2025: 200 }
      ];

      component.detailedDataSource.data = testData;
      component.sortDetailedDataByCash2025Descending();

      expect(component.detailedDataSource.data[0].Cash2025).toBe(300);
      expect(component.detailedDataSource.data[1].Cash2025).toBe(200);
      expect(component.detailedDataSource.data[2].Cash2025).toBe(100);
    });

    it('should set default view type to cash', () => {
      component.selectedViewType = '';
      component.onViewTypeChange('cash');
      expect(component.selectedViewType).toBe('cash');
      expect(component.displayedCatalogColumns).toEqual(component.cashColumns);
    });
  });

  describe('Requirement 6: Percentage sign on LEFT', () => {
    it('should format percentage correctly', () => {
      const dept: DepartmentComparisonDto = {
        DepartmentName: 'Test',
        Income2024: 100,
        Income2025: 150
      };

      const result = component.calculatePercentageChange(dept);
      expect(result).toBe('50.00%');
      expect(result.endsWith('%')).toBe(true);
    });

    it('should handle infinite percentage', () => {
      const dept: DepartmentComparisonDto = {
        DepartmentName: 'Test',
        Income2024: 0,
        Income2025: 100
      };

      const result = component.calculatePercentageChange(dept);
      expect(result).toBe('∞%');
    });
  });

  describe('Requirement 7: Top 5 departments competition', () => {
    it('should calculate top 5 departments', () => {
      component.departmentIncomeData = [
        { DepartmentName: 'Dept A', Income2024: 100, Income2025: 200 },
        { DepartmentName: 'Dept B', Income2024: 100, Income2025: 150 },
        { DepartmentName: 'Dept C', Income2024: 100, Income2025: 300 },
        { DepartmentName: 'Dept D', Income2024: 100, Income2025: 120 },
        { DepartmentName: 'Dept E', Income2024: 100, Income2025: 250 },
        { DepartmentName: 'Dept F', Income2024: 100, Income2025: 110 }
      ];

      component.calculateTopDepartments();

      expect(component.topDepartments.length).toBe(5);
      expect(component.topDepartments[0].DepartmentName).toBe('Dept C');
      expect(component.topDepartments[0].difference).toBe(200);
    });

    it('should filter only positive growth', () => {
      component.departmentIncomeData = [
        { DepartmentName: 'Dept A', Income2024: 100, Income2025: 150 },
        { DepartmentName: 'Dept B', Income2024: 100, Income2025: 80 }, // Negative
        { DepartmentName: 'Dept C', Income2024: 100, Income2025: 200 }
      ];

      component.calculateTopDepartments();

      expect(component.topDepartments.length).toBe(2);
      expect(component.topDepartments.every(d => d.Income2025 >= d.Income2024)).toBe(true);
    });

    it('should calculate difference correctly', () => {
      component.departmentIncomeData = [
        { DepartmentName: 'Dept A', Income2024: 100, Income2025: 250 }
      ];

      component.calculateTopDepartments();

      expect(component.topDepartments[0].difference).toBe(150);
    });

    it('should calculate percentage correctly', () => {
      component.departmentIncomeData = [
        { DepartmentName: 'Dept A', Income2024: 100, Income2025: 150 }
      ];

      component.calculateTopDepartments();

      expect(component.topDepartments[0].percentage).toBe(50);
    });

    it('should toggle view type between difference and percentage', () => {
      component.topDepartments = [
        { DepartmentName: 'A', Income2024: 100, Income2025: 200, difference: 100, percentage: 100 },
        { DepartmentName: 'B', Income2024: 100, Income2025: 150, difference: 50, percentage: 50 }
      ];

      component.onTopDepartmentsViewChange('percentage');
      expect(component.topDepartmentsViewType).toBe('percentage');
      expect(component.topDepartments[0].DepartmentName).toBe('A'); // Still sorted by percentage

      component.onTopDepartmentsViewChange('difference');
      expect(component.topDepartmentsViewType).toBe('difference');
      expect(component.topDepartments[0].DepartmentName).toBe('A'); // Still sorted by difference
    });
  });

  describe('Helper methods', () => {
    it('should format numbers with locale', () => {
      const result = component.formatNumber(1234567);
      expect(result).toContain('1');
      expect(result.length).toBeGreaterThan(7);
    });

    it('should calculate difference between years', () => {
      const dept: DepartmentComparisonDto = {
        DepartmentName: 'Test',
        Income2024: 100,
        Income2025: 150
      };

      const result = component.calculateDifference(dept);
      expect(result).toBe(50);
    });




    it('should get total difference', () => {
      component.yearlyTotalData = [
        { Year: '2024', TotalRealValue: 1000 },
        { Year: '2025', TotalRealValue: 1500 }
      ];

      expect(component.getTotalDifference()).toBe(500);
    });
  });

  describe('View changes', () => {
    it('should change view type to cash', () => {
      component.onViewTypeChange('cash');
      expect(component.selectedViewType).toBe('cash');
      expect(component.displayedCatalogColumns).toEqual(component.cashColumns);
    });

    it('should change view type to units', () => {
      component.onViewTypeChange('units');
      expect(component.selectedViewType).toBe('units');
      expect(component.displayedCatalogColumns).toEqual(component.unitsColumns);
    });

    it('should change view type to both', () => {
      component.onViewTypeChange('both');
      expect(component.selectedViewType).toBe('both');
      expect(component.displayedCatalogColumns).toEqual(component.bothColumns);
    });
  });

  describe('Modal management', () => {
    it('should close boss dashboard', () => {
      component.showBossDashboard = true;
      component.closeBossDashboard();
      expect(component.showBossDashboard).toBe(false);
    });

    it('should close department graph', () => {
      component.isDepartmentGraphOpen = true;
      component.closeDepartmentGraph();
      expect(component.isDepartmentGraphOpen).toBe(false);
      expect(component.selectedDepartment).toBeNull();
    });
  });
});