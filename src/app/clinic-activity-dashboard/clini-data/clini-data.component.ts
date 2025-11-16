import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
export interface ClinicSeodeActivityComparison {
  Department: string;
  ClinicName: string;
  MovementsCurrentYear: number;
  MovementsPreviousYear: number;
  MovementsPrevious2Year: number;
  ApprovedCurrentYear: number;
  NoShowCurrentYear: number;
  CanceledCurrentYear: number;
  ApprovedPreviousYear: number;
  ApprovedPrevious2Year: number;
  NoShowPreviousYear: number;
  NoShowPrevious2Year: number;
  CanceledPreviousYear: number;
  CanceledPrevious2Year: number;
}
export interface ClinicActivityComparison {
  [x: string]: any;
  Namer_ID: string;
  Department: string;
  Year: number;
  Month: number;
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
}
export interface ClinicActivityTotalMonth {
  [x: string]: any;
  YearNumber: number;
  MonthNumber: number;
  TotalMovements: number;
  AvgPatientAge: number;
  MaleCount: number;
  FemaleCount: number;
}
@Component({
  selector: 'app-clini-data',
  templateUrl: './clini-data.component.html',
  styleUrls: ['./clini-data.component.css']
})
export class CliniDataComponent implements OnInit {
  chartDataQuarterly: any[] = [];

  public chartLineData: any[] = [];
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
  ClinicActivityTotalMonthArrya: ClinicActivityComparison[] = [];
  displayedColumns: string[] = [
    'Department',
    'TotalMovementsCurrentYear',
    'TotalMovementsPreviousYear',
    'TotalMovementsPrevious2Year',
    //'ApprovedCurrentYear',
    //'ApprovedPreviousYear',
   // 'ApprovedPrevious2Year',
    // 'NoShowCurrentYear',
    // 'NoShowPreviousYear',
    // 'CanceledCurrentYear',
    // 'CanceledPreviousYear',
  ];
  chartColumnsResult = ['שנה', 'ביקורים', 'שירותים', 'אין הופעה', 'ביטולים'];
  currentDate = new Date();
  chartDataRowClick: any;
  chartOptionsRowClick: any;
  currentMonth = this.currentDate.getMonth() + 1;
  currentYear = this.currentDate.getFullYear();
  pevYear = this.currentDate.getFullYear() - 1;
  pev2Year = this.currentDate.getFullYear() - 2;
  isDataLoadedClinicActivityTotalMonthArrya = false;
  dataSource = new MatTableDataSource<ClinicSeodeActivityComparison>([]);
  monthchartData: any[] = [];

  chartTypeQuarterly = 'BarChart';
  chartColumnsQuarterly = ['רבעון', " " + this.currentYear, " " + this.pevYear, " " + this.pev2Year];
  chartOptionsQuarterly = {
    title: 'השוואה רבעונית: ' + this.currentYear + ' vs ' + this.pevYear + ' vs ' + this.pev2Year,
    chartArea: { width: '70%' },
    hAxis: {
      title: 'ביקורים',
      minValue: 0,
    },
    vAxis: {
      title: 'רבעון',
    },
    bars: 'horizontal', // For horizontal bar chart
    legend: { position: 'bottom' },
  };
  monthchartOptions = {
    title: 'ביקורים חודשיים',
    hAxis: {
      title: 'חודשים',
      gridlines: { count: 12 }
    },
    vAxis: {
      title: 'ביקורים'
    },
    legend: { position: 'top' },
    bar: { groupWidth: '75%' },
    isStacked: false
  };
  chartLineColumns: any = ['חודש', this.currentYear + " ביקורים", this.pevYear + " ביקורים", this.pev2Year + " ביקורים"]
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
  constructor(
    public dialogRef: MatDialogRef<CliniDataComponent>,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }



  ngOnInit(): void {
    this.getClincSeodeData();
    this.getClinicActivityMonthTotal()
    let test = [
      ["" + this.currentYear, this.data.TotalMovementsCurrentYear, Number(this.data.ApprovedCurrentYear), Number(this.data.NoShowCurrentYear), Number(this.data.CanceledCurrentYear)],
      ["" + this.pevYear, this.data.TotalMovementsPreviousYear, Number(this.data.ApprovedPreviousYear), Number(this.data.NoShowPreviousYear), Number(this.data.CanceledPreviousYear)],
      ["" + (this.pevYear - 1), this.data.TotalMovementsPrevious2Year, Number(this.data.ApprovedPrevious2Year), Number(this.data.NoShowPrevious2Year), Number(this.data.CanceledPrevious2Year)],
    ];
    let test2 = {
      title: `${this.data.Department}`,
      chartArea: { width: '70%' },
      hAxis: {
        title: 'סכ"ה',
        minValue: 0
      },
      vAxis: {
        title: 'שנה'
      },
      bars: 'horizontal',
      legend: { position: 'bottom' },

    }
    let that = this
    setTimeout(() => {
      that.chartDataRowClick = test;

      // Set chart options dynamically
      that.chartOptionsRowClick = test2;
      console.log(that.chartDataRowClick)
    }, 500);

  }
  getClinicActivityMonthTotal() {
    this.http
      .post(environment.url + "GetClinicActivityComparisonByYear", {
        year: this.currentYear,
        depart: this.data.Namer_ID
      })
      .subscribe((Response: ClinicActivityComparison) => {
        this.ClinicActivityTotalMonthArrya.push(Response["d"])
        console.log(this.ClinicActivityTotalMonthArrya)
        this.http
          .post(environment.url + "GetClinicActivityComparisonByYear", {
            year: this.pevYear,
            depart: this.data.Namer_ID
          })
          .subscribe((Response: ClinicActivityComparison) => {
            this.ClinicActivityTotalMonthArrya.push(Response["d"])
            console.log(this.ClinicActivityTotalMonthArrya)
            this.http
              .post(environment.url + "GetClinicActivityComparisonByYear", {
                year: this.pev2Year,
                depart: this.data.Namer_ID
              })
              .subscribe((Response: ClinicActivityComparison) => {
                debugger
                this.ClinicActivityTotalMonthArrya.push(Response["d"])
                console.log(this.ClinicActivityTotalMonthArrya)
                this.updateMonthChartData();
                this.prepareQuarterlyData();
                this.isDataLoadedClinicActivityTotalMonthArrya = true;
              })
          })
      })

  }
  updateMonthChartData(): void {
    debugger
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
    const dataMap: { [key: string]: { [key: number]: number } } = {};

    // Process the data and populate the dataMap
    this.ClinicActivityTotalMonthArrya.forEach((yearData, yearIndex) => {
      const year = this.currentYear - yearIndex; // Calculate the year
      yearData.forEach((monthData: any) => {
        const month = months[monthData.Month - 1];
        dataMap[month] = dataMap[month] || {};
        dataMap[month][year] = monthData.TotalMovementsCurrentYear;
      });
    });

    // Create the chart data array
    months.forEach(month => {
      this.chartLineData.push([
        month,
        dataMap[month][this.currentYear] || 0,  // Use 0 if no data for the year
        dataMap[month][this.pevYear] || 0,
        dataMap[month][this.pev2Year] || 0
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

    const groupByQuarter = (data: ClinicActivityComparison[], index: number): number[] => {
      return quarters.map((q) => {
        const quarterMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
        return data[index]
          .filter((item) => quarterMonths.includes(item.Month))
          .reduce((sum, item) => sum + item.TotalMovementsCurrentYear, 0);
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
  closeDialog(): void {
    this.dialogRef.close();
  }
  getClincSeodeData() {
    this.http
      .post(environment.url + "GetClinicSeodeActivityComparisonByYear", {
        year: this.currentYear,
        depart: this.data.Namer_ID
      })
      .subscribe((Response: ClinicSeodeActivityComparison[]) => {
        let test = [];
        console.log(Response["d"])
        //debugger
        this.dataSource.data = Response["d"];
        // debugger 
        this.cdr.detectChanges();
        /*this.chartDataResult = [
         // ['Year', 'Approved', 'No Show', 'Canceled'], // Header row
          ['2023', Number(242767), Number(29096), Number(19706)],
          ['2024', Number(221398), Number(55727), Number(34971)]
        ];*/


      })
  }


}
