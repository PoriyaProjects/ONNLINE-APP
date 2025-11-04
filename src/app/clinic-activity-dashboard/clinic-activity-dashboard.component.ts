import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MenuPerm } from '../menu-perm';
import { MatDialog } from '@angular/material/dialog';
import { environment } from "src/environments/environment";
import { MatTableDataSource } from '@angular/material/table';
import { CliniDataComponent } from './clini-data/clini-data.component';
export interface ClinicActivityComparisonResult {
  [x: string]: any;
  Year: number;
  Approved: number;
  NoShow: number;
  Canceled: number;
}
export interface ClinicActivityTotal {
  [x: string]: any;
  YearNumber: number;
  TotalMovements: number;
  TotalMovementsWithInvoices: number;
  AvgPatientAge: number;
  MaleCount: number;
  FemaleCount: number;
}
export interface ClinicActivityTotalMonth {
  [x: string]: any;
  YearNumber: number;
  MonthNumber: number;
  TotalMovements: number;
  TotalPatients: number;
  AvgPatientAge: number;
  MaleCount: number;
  FemaleCount: number;
}
export interface ClinicActivityComparison {
  [x: string]: any;
  Namer_ID: string;
  Department: string;
  TotalMovementsCurrentYear: number;
  TotalMovementsPreviousYear: number;
  TotalMovementsPrevious2Year: number;
  ApprovedCurrentYear: number | null;
  ApprovedPreviousYear: number | null;
  ApprovedPrevious2Year: number | null;
  NoShowCurrentYear: number;
  NoShowPreviousYear: number;
  NoShowPrevious2Year: number;
  CanceledCurrentYear: number;
  CanceledPreviousYear: number;
  CanceledPrevious2Year: number;
  RoomNumber: string;
}
@Component({
  selector: 'app-clinic-activity-dashboard',
  templateUrl: './clinic-activity-dashboard.component.html',
  styleUrls: ['./clinic-activity-dashboard.component.css']
})
export class ClinicActivityDashboardComponent implements OnInit {


  public chartLineData: any[] = [];
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth() + 1;
  currentYear = this.currentDate.getFullYear();
  pevYear = this.currentDate.getFullYear() - 1;
  pev2Year = this.pevYear - 1;
  Months = [
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
    "דצמבר"
  ];
  displayedColumns: string[] = [
    'Department',
    'TotalMovementsCurrentYear',
    'TotalMovementsPreviousYear',
    'TotalMovementsPrevious2Year',
    'ApprovedCurrentYear',
    'ApprovedPreviousYear',
    'ApprovedPrevious2Year',
    'NoShowCurrentYear',
    'NoShowPreviousYear',
    'NoShowPrevious2Year',
    'CanceledCurrentYear',
    'CanceledPreviousYear',
    'CanceledPrevious2Year',
  ];
  chartColumnsQuarterly = ['רבעון', " " + this.currentYear, " " + this.pevYear, " " + this.pev2Year];
  chartOptionsQuarterly = {
    title: 'השוואה רבעונית: ' + this.currentYear + ' , ' + this.pevYear + ' , ' + this.pev2Year,
    chartArea: { width: '70%' },
    hAxis: {
      title: 'ביקורים',
      minValue: 0,
    },
    vAxis: {
      title: 'רבעון',
    },
    bars: 'horizontal', // For horizontal bar chart
    legend: { position: 'bottom' }
  };
  chartDataResult: any[] = [];
  chartResultOptions = {
    title: 'ביקורים ,שירותים, ביטולים שנתית',
    chartArea: { width: '70%' },
    hAxis: {
      title: 'סכ"ה',

      minValue: 0
    },
    vAxis: {
      title: 'שנה'
    },
    bars: 'horizontal',
    legend: { position: 'bottom' }
  };
  dataSource = new MatTableDataSource<ClinicActivityComparison>([]);
  isDataLoadedClinicActivityTotalArrya = false
  isDataLoadedClinicActivityTotalMonthArrya = false

  monthchartType = 'ColumnChart';
  monthchartData: any[] = [];
  monthchartOptions = {
    title: 'ביקורים חודשיים',
    hAxis: {
      title: 'חודשים',
      gridlines: { count: 12 }
    },
    vAxis: {
      title: 'ביקורים'
    },
    seriesType: 'bars',
    series: {
      3: { type: 'line' }, // Make the third column (Profit) a line
      4: { type: 'line' }, // Make the third column (Profit) a line
      5: { type: 'line' }, // Make the third column (Profit) a line
    },
    legend: { position: 'top' },
    bar: { groupWidth: '75%' },
    isStacked: false,
  };
  chartColumnsResult = ['שנה', 'שירותים', 'אין הופעה', 'ביטולים'];
  // Google Chart options
  yearlyChartOptions = {
    title: 'ביקורים שנתיים',
    pieHole: 0.4,
    is3D: true
  };
  // Chart Data
  chartTypeQuarterly = 'BarChart';
  chartDataQuarterly: any[] = [];

  chartTypeFM = 'PieChart';
  chartDataFM: any[] = [];
  chartColumnsFM = ['Gender', 'Count'];
  chartOptionsFM = {
    title: 'Gender Distribution for Current Year',
    pieHole: 0.4,
    legend: { position: 'bottom' },
  };
  colorMap: { [key: string]: string } = {};
  chartLineColumns: any = ['חודש', this.currentYear + " מבקרים", this.pevYear + " מבקרים", this.pev2Year + " מבקרים", this.currentYear + " ביקורים", this.pevYear + " ביקורים", this.pev2Year + " ביקורים"]
  //chartLineData: any[] = [];
  chartLineOptions: any = {
    title: 'ביקורים חודשיים',
    curveType: 'function',
    legend: { position: 'bottom' },
    hAxis: {
      title: 'חודש',
      textStyle: { fontSize: 12 },
      titleTextStyle: { italic: false, bold: true }
    },
    vAxis: {
      title: 'ביקורים',
      textStyle: { fontSize: 12 },
      titleTextStyle: { italic: false, bold: true }
    },
    chartArea: { width: '80%', height: '70%' }
  };

  yearlychartType = 'PieChart';
  yearlychartData: any[] = [];
  ClinicActivityTotalArrya: ClinicActivityTotal[] = [];
  ClinicActivityTotalMonthArrya: ClinicActivityTotalMonth[] = [];
  pieCharts: { year: number, data: any[], options: any }[] = [];
  constructor(
    private _snackBarUsers: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private formBuilderUsers: FormBuilder,
    private mMenuPerm: MenuPerm,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    mMenuPerm.setRoutName("clinicactivitydashboard");
    setTimeout(() => {
      // if (!mMenuPerm.getHasPerm()) {
      //   localStorage.clear();
      //   this.router.navigate(["login"]);
      // }
    }, 2000);
    this.getClinicActivityTotal();
    this.getClinicActivityMonthTotal();
    this.getClinicActivityComparison();
    this.GetClinicActivityDoingComparisonByYear();
    this.GetClinicPatientKobaDataYearNumber();
  }
  addColorToMap(key: string, color: string): void {
    if (!(key in this.colorMap)) {
      this.colorMap[key] = color; // Add the key-value pair only if the key does not exist
    }
  }
  groupDataByYear(data: any[]): any {
    const predefinedColors = [
      '#FF5733', // Red
      '#33FF57', // Green
      '#3357FF', // Blue
      '#FF33A1', // Pink
      '#A1FF33', // Lime
      '#33FFF6', // Cyan
      '#FFC733', // Orange
      '#8D33FF', // Purple
      '#FF3333', // Bright Red
      '#33FFA1', // Mint
      '#B833FF', // Violet
      '#FFD433', // Gold
      '#339BFF'  // Sky Blue
    ];
    let colorIndex = 0;
    data.forEach((chart) => {
      // //debugger
      //chart.data.forEach(([kobaName]: any) => {
      if (!this.colorMap[chart.kobaName]) {
        //this.colorMap.push()
        this.addColorToMap(chart.KobaName, predefinedColors[colorIndex])
        ////debugger
        //[chart.kobaName] = predefinedColors[colorIndex];
        colorIndex++;
      }
      //});
    });
    console.log("colorMap")
    console.log(this.colorMap)
    return data.reduce((acc, item) => {
      acc[item.YearNumber] = acc[item.YearNumber] || [];
      acc[item.YearNumber].push([item.KobaName, item.PatientCount]);
      return acc;
    }, {});
  }

  prepareCharts(groupedData: any): void {

    let testArr = []
    Object.keys(groupedData).forEach((year) => {
      testArr.push({
        year: +year,
        title: `חלוקה לפי קופ"ח ${year}`,
        data: groupedData[year],
        options: {}// this.getChartOptions(groupedData[year], `חלוקה לפי קופ"ח ${year}`) //{
        //   title: `חלוקה לפי קופ"ח ${year}`,
        //   pieHole: 0.4,
        //   colors: this.getChartOptions(data: any, title: any),
        //   is3D: true,
        //   legend: { position: 'bottom' }
        // }
      });
    });
    testArr.forEach((item) => {
      //debugger
      item.options = this.getChartOptions(item.data, item.title)
      ////debugger
    })
    this.pieCharts = testArr;
  }
  getChartOptions(data: any, title: any): any {
    //debugger
    /*
     
      options: {
            title: `חלוקה לפי קופ"ח ${year}`,
            pieHole: 0.4,
            colors: this.colorMap,
            is3D: true,
            legend: { position: 'bottom' }
          }
    */
    const colors = data.map(item => this.colorMap[item[0]] || '#000000'); // Default to black if no color is found

    return {
      title: title, // You might want to make this dynamic as well
      pieHole: 0.4,
      colors: colors,
      is3D: true,
      legend: { position: 'bottom' }
    };
  }
  ngOnInit(): void {
  }
  onRowClick(row: any): void {
    console.log('Row clicked:', row);
    // Open the dialog and pass the row data as dialog input
    const dialogRef = this.dialog.open(CliniDataComponent, {
      // Ensure it stretches to full height
      panelClass: 'huge-dialog', // Custom CSS class for further styling    
      data: {
        ...row, // Pass the row data
        currentYear: this.currentYear, // Add currentYear to the data
        previousYear: this.pevYear // Add previousYear to the data
      }
    });

    // Optional: Handle dialog close event
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed:', result);
    });
    // Add your logic here
    // For example: Navigate to another page or open a dialog
    //alert(`You clicked on Department: ${row.Department}`);
  }
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  GetClinicActivityDoingComparisonByYear(): void {
    this.http
      .post(environment.url + "GetClinicActivityDoingComparisonByYear", {
        year: this.currentYear
      })
      .subscribe((Response: ClinicActivityComparisonResult[]) => {
        let test = [];
        Response["d"].forEach((item) => {
          test.push(["" + item.Year, Number(item.Approved), Number(item.NoShow), Number(item.Canceled)]);
        });

        /*this.chartDataResult = [
         // ['Year', 'Approved', 'No Show', 'Canceled'], // Header row
          ['2023', Number(242767), Number(29096), Number(19706)],
          ['2024', Number(221398), Number(55727), Number(34971)]
        ];*/
        let that = this;
        setTimeout(() => {
          this.chartDataResult = test;
          that.cdr.detectChanges();

          console.log("chartDataResult")
          console.log(this.chartDataResult)
        }, 500);

      })
  }
  getClinicActivityComparison(): void {
    this.http
      .post(environment.url + "GetClinicActivityComparisonByYear", {
        year: this.currentYear,
        depart: ''
      })
      .subscribe((Response: ClinicActivityComparison[]) => {
        //////debugger
        this.dataSource.data = Response["d"];
        // ////debugger 
        this.cdr.detectChanges();
      })
  }

  getClinicActivityTotal() {

    this.http
      .post(environment.url + "GetClinicActivityByYear", {
        year: this.currentYear
      })
      .subscribe((Response: ClinicActivityTotal) => {
        this.ClinicActivityTotalArrya.push(Response["d"])
        console.log(this.ClinicActivityTotalArrya)
        this.http
          .post(environment.url + "GetClinicActivityByYear", {
            year: this.pevYear
          })
          .subscribe((Response: ClinicActivityTotal) => {
            this.ClinicActivityTotalArrya.push(Response["d"])
            console.log(this.ClinicActivityTotalArrya)
            this.http
              .post(environment.url + "GetClinicActivityByYear", {
                year: this.pevYear - 1
              })
              .subscribe((Response: ClinicActivityTotal) => {
                this.ClinicActivityTotalArrya.push(Response["d"])
                console.log(this.ClinicActivityTotalArrya)
                this.isDataLoadedClinicActivityTotalArrya = true;
                this.updateChartData();
                this.calculateGenderTotalsForCurrentYear()
              })
          })
      })

  }

  GetClinicPatientKobaDataYearNumber() {

    this.http
      .post(environment.url + "GetClinicPatientKobaDataYearNumber", {
        years: [this.currentYear, this.pevYear, this.pevYear - 1]
      })
      .subscribe((Response: ClinicActivityTotal) => {
        const groupedData = this.groupDataByYear(Response["d"]);
        this.prepareCharts(groupedData);

        console.log(groupedData)
        //debugger

      })

  }
  getClinicActivityMonthTotal() {
    this.http
      .post(environment.url + "GetClinicActivityByYearMonth", {
        year: this.currentYear
      })
      .subscribe((Response: ClinicActivityTotalMonth) => {
        this.ClinicActivityTotalMonthArrya.push(Response["d"])
        console.log(this.ClinicActivityTotalMonthArrya)
        this.http
          .post(environment.url + "GetClinicActivityByYearMonth", {
            year: this.pevYear
          })
          .subscribe((Response: ClinicActivityTotalMonth) => {
            this.ClinicActivityTotalMonthArrya.push(Response["d"])
            console.log(this.ClinicActivityTotalMonthArrya)
            this.http
              .post(environment.url + "GetClinicActivityByYearMonth", {
                year: this.pev2Year
              })
              .subscribe((Response: ClinicActivityTotalMonth) => {
                this.ClinicActivityTotalMonthArrya.push(Response["d"])
                console.log(this.ClinicActivityTotalMonthArrya)
                this.updateMonthChartData();
                this.prepareQuarterlyData();
                this.isDataLoadedClinicActivityTotalMonthArrya = true;
              })
          })
      })

  }
  updateChartData(): void {
    this.ClinicActivityTotalArrya.map(item => console.log(item))
    this.yearlychartData = this.ClinicActivityTotalArrya.map(item => [item[0].YearNumber + "", item[0].TotalMovements]);
    console.log(this.yearlychartData)
  }
  updateMonthChartData(): void {
    if (this.ClinicActivityTotalMonthArrya.length < 2) {
      return; // Ensure both years' data are loaded
    }
    const months = [
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
      "דצמבר"
    ];

    // Initialize with the header row
    this.chartLineData = [
      //  ['חודשים', 'ביקורים ' + this.currentYear, 'ביקורים ' + this.pevYear, 'ביקורים ' + this.pev2Year]
    ];

    // Create a map to store data by month and year
    const dataMap: { [key: string]: { [key: number]: any } } = {};

    // Process the data and populate the dataMap
    this.ClinicActivityTotalMonthArrya.forEach((yearData, yearIndex) => {
      const year = this.currentYear - yearIndex; // Calculate the year
      yearData.forEach((monthData: any) => {
        const month = months[monthData.MonthNumber - 1];
        dataMap[month] = dataMap[month] || {};
        dataMap[month][year] = { TotalMovements: monthData.TotalMovements, TotalPatients: monthData.TotalPatients };
      });
    });

    // Create the chart data array
    months.forEach(month => {
      this.chartLineData.push([
        month,

        dataMap[month][this.currentYear]?.TotalPatients || 0,
        dataMap[month][this.pevYear]?.TotalPatients || 0,
        dataMap[month][this.pev2Year]?.TotalPatients || 0,
        dataMap[month][this.currentYear]?.TotalMovements || 0,  // Use 0 if no data for the year
        dataMap[month][this.pevYear]?.TotalMovements || 0,
        dataMap[month][this.pev2Year]?.TotalMovements || 0,
      ]);
    });
    this.monthchartData = this.chartLineData;
    ////debugger;
  }
  prepareQuarterlyData(): void {
    /*let data2024 = [];
    let data2023 = [];
    let data2022 = [];
    this.ClinicActivityTotalMonthArrya.forEach((i, index) => {
      i.forEach((ele) => {
        if (index == 0) {
          data2024.push({
            MonthNumber: ele.MonthNumber, TotalMovements: ele.TotalMovements
          })
        } else if (index == 1) {
          data2023.push({
            MonthNumber: ele.MonthNumber, TotalMovements: ele.TotalMovements
          })
        } else {
          data2022.push({
            MonthNumber: ele.MonthNumber, TotalMovements: ele.TotalMovements
          })
        }
      })
    })
    //////debugger
    const months = [
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
      "דצמבר"
    ];
    
    let testLine = [
    //  ['חודש', ''+ this.currentYear, ''+ this.pevYear, ''+ this.pev2Year]
    ];
    ////debugger
    for (let i = 0; i < 12; i++) {
      testLine.push([
        months[i],
        data2024[i].TotalMovements,
        data2023[i].TotalMovements,
        data2022[i].TotalMovements
      ]);
    }
      ////debugger;
    this.chartLineData = testLine;*/
    const quarters = [1, 2, 3, 4];

    const groupByQuarter = (data: ClinicActivityTotalMonth[], index: number): number[] => {
      return quarters.map((q) => {
        const quarterMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
        return data[index]
          .filter((item) => quarterMonths.includes(item.MonthNumber))
          .reduce((sum, item) => sum + item.TotalMovements, 0);
      });
    };

    const totals2024 = groupByQuarter(this.ClinicActivityTotalMonthArrya, 0);
    const totals2023 = groupByQuarter(this.ClinicActivityTotalMonthArrya, 1);
    const totals2022 = groupByQuarter(this.ClinicActivityTotalMonthArrya, 2);

    this.chartDataQuarterly = quarters.map((q, index) => [
      `Q${q}`, // Quarter label
      totals2024[index], // Total for 2024
      totals2023[index], // Total for 2023
      totals2022[index], // Total for 2023
    ]);
    console.log("chartDataQuarterly")
    console.log(this.chartDataQuarterly)
  }
  calculateGenderTotalsForCurrentYear(): void {
    return ;
    const currentYear = new Date().getFullYear(); // Get the current year dynamically

    // Filter the array for the current year
    const currentYearData = this.ClinicActivityTotalArrya.filter(item => item[0].YearNumber === currentYear);

    // Calculate totals for MaleCount and FemaleCount
    const totalMaleCount = currentYearData.reduce((sum, item) => sum + item[0].MaleCount, 0);
    const totalFemaleCount = currentYearData.reduce((sum, item) => sum + item[0].FemaleCount, 0);

    // Prepare chart data
    this.chartDataFM = [
      ['Male', totalMaleCount],
      ['Female', totalFemaleCount],
    ];

    console.log('Total Male Count for Current Year:', totalMaleCount);
    console.log('Total Female Count for Current Year:', totalFemaleCount);
  }
}
