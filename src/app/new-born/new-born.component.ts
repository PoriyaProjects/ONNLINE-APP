import {
    Component,
    OnInit,
    ViewChild,
    AfterViewInit,
    Input,
    ElementRef,
    HostListener,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";
import {
    NgbModal,
    NgbModalOptions,
    NgbActiveModal,
} from "@ng-bootstrap/ng-bootstrap";
import * as $ from "jquery";
import { formatDate } from "@angular/common";
import {
    FormControl,
    FormBuilder,
    FormGroup,
    Validators,
} from "@angular/forms";
import { Observable, forkJoin } from "rxjs";
import { map, startWith } from "rxjs/operators";
import { environment } from "src/environments/environment";
import {
    BirthDetailRow,
    BirthSummaryRow,
    HomeSliceCard,
    NewBornDashboardFilters,
    NewBornDashboardKpis,
    NewBornDataService,
    PregnancyMonitoringRow,
    WeeklyBirthStats,
    WeeklyTrendPoint,
} from "./new-born-data.service";

export interface NewBorn {
    RowID: number;
    MotherCaseNumber: string;
    MotherID: string;
    MotherFirstName: string;
    MotherLastName: string;
    NewBornDOB: string;
    NewBornTime: string;
    BornProcedure: string;
    NewBornGender: string;
    NewBornWeight: string;
    NewBornWeightInProgress: string;
    NewBornWeekOfPregnancy: string;
    MultipleBirth: string;
    NumberOfBirths: string;
    BirthNumber: string;
    BirthIsDie: string;
    hospitalizedAt: string;
    UserName: string;
    UserFllName: string;
    UserTell: string;
    DateTimeInsert: string;
    TotalRows: string;
    NewBornPondkyat: string;
}

export interface NewBornUsers {
    UserID: string;
    UserName: string;
    UserFullName: string;
    CellNumber: string;
}

type ViewMode = "home" | "summary" | "details" | "monitoring" | "registry";

const MONTH_LABELS = [
    "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

@Component({
    selector: "app-new-born",
    templateUrl: "./new-born.component.html",
    styleUrls: ["./new-born.component.css"],
})
export class NewBornComponent implements OnInit, AfterViewInit {
    readonly dashboardTitle = "לידות";
    readonly monthLabels = MONTH_LABELS;
    readonly statusOptions = ["", "לידה", "ללא לידה", "עדיין במעקב"];

    @ViewChild("newBornBtn") newBornBtn: ElementRef;
    @ViewChild(MatTable, { static: true }) table: MatTable<any>;
    @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: true }) sort: MatSort;

    viewMode: ViewMode = "home";
    isDark = false;
    dashLoading = false;
    showFiltersSidebar = false;
    tableSearch = "";
    lastUpdateDate = "";

    /** מסך כניסה */
    weeklyStats: WeeklyBirthStats = { currentWeekBirths: 0, weeklyAverage: 0, deltaPercent: 0, weekLabel: "" };
    homeSlices: HomeSliceCard[] = [];
    weeklyTrend: WeeklyTrendPoint[] = [];
    selectedDrillMonth: number | null = null;
    yearRangeFrom: number;
    yearRangeTo: number;
    availableYears: number[] = [];

    weeklyChartType = "ComboChart";
    weeklyChartColumns: (string | Record<string, unknown>)[] = [];
    weeklyChartRows: (string | number)[][] = [];
    weeklyChartOptions: Record<string, unknown> = {};

    monthlyDrillChartType = "ColumnChart";
    monthlyDrillColumns: (string | Record<string, unknown>)[] = ["שנה", "לידות"];
    monthlyDrillRows: (string | number)[][] = [];
    monthlyDrillOptions: Record<string, unknown> = {};

    allSummaryRows: BirthSummaryRow[] = [];

    filters: NewBornDashboardFilters = {
        startDate: "2022-01-01",
        endDate: "2027-01-01",
        year: null,
        month: null,
        yishuv: "",
        status: "",
    };

    yishuvOptions: string[] = [];
    yearOptions: number[] = [];
    kpis: NewBornDashboardKpis = {
        totalBirths: 0,
        uniqueCities: 0,
        avgPregnancyWeek: 0,
        monitoringActive: 0,
        monitoringDelivered: 0,
        monitoringMissed: 0,
    };

    summaryDataSource = new MatTableDataSource<BirthSummaryRow>([]);
    detailDataSource = new MatTableDataSource<BirthDetailRow>([]);
    monitoringDataSource = new MatTableDataSource<PregnancyMonitoringRow>([]);

    summaryColumns = ["Year", "Month", "Yishuv", "Births"];
    detailColumns = [
        "Year", "PatientId", "MotherAgeAtBirth", "NewbornDob", "City",
        "HealthFund", "Nationality", "PregnancyWeek", "BirthNumberAtHospital",
    ];
    monitoringColumns = [
        "MonthYear", "PatientId", "City", "HealthFund", "VisitDate",
        "PregnancyWeekLabel", "EstimatedBirthDate", "Status",
    ];

    chartType = "ColumnChart";
    chartColumns: (string | Record<string, unknown>)[] = ["חודש", "לידות"];
    chartRows: (string | number)[][] = [];
    chartOptions: Record<string, unknown> = {};
    chartWidth = 900;
    chartHeight = 360;

    horizontalPosition: MatSnackBarHorizontalPosition = "center";
    verticalPosition: MatSnackBarVerticalPosition = "top";
    displayedColumns: string[] = [
        "MotherCaseNumber",
        "MotherID",
        "MotherFirstName",
        "MotherLastName",
        "NewBornDOB",
        "hospitalizedAt",
        "Click",
    ];

    modalOptions: NgbModalOptions = {
        windowClass: "marg-t-60",
        backdrop: "static",
        keyboard: false,
    };
    ShowSubmit: Boolean = true;
    closeResult: string;
    TABLE_DATA: NewBorn[] = [];
    NewBornUsersList: NewBornUsers[] = [];
    dataSource = new MatTableDataSource(this.TABLE_DATA);
    loader: Boolean;
    resultsLength = 0;
    fliterValPatient = "";
    patientForm: FormGroup;
    submitted = false;
    ShowFormNewBorn = false;
    activeModal: NgbActiveModal;
    filteredOptions: Observable<NewBornUsers[]>;
    @Input() foo: string = "bar";
    startdateVal: string;
    enddateVal: string;
    NewBornDOB: string;
    NewBornTime: string;
    Sdate: FormControl;
    Edate: FormControl;
    UserFrom: string;
    myControl = new FormControl("");
    casenumber = "";
    opendCounter = 0;

    constructor(
        private _snackBar: MatSnackBar,
        private router: Router,
        private http: HttpClient,
        private modalServiceresearchespatients: NgbModal,
        private formBuilder: FormBuilder,
        activeModal: NgbActiveModal,
        private _Activatedroute: ActivatedRoute,
        private dataService: NewBornDataService
    ) {
        this.activeModal = activeModal;
    }

    ngOnInit(): void {
        const currentYear = new Date().getFullYear();
        this.yearRangeFrom = currentYear - 4;
        this.yearRangeTo = currentYear;
        this.availableYears = this.dataService.getAvailableYears();

        this.isDark = localStorage.getItem("newbornDash.theme") === "dark";
        this.applyTableFilterPredicate();
        this.selectNewBornUsers();
        this.UserFrom = localStorage.getItem("loginUserName");
        this.loader = false;
        this.dataSource = new MatTableDataSource(this.TABLE_DATA);
        this.Sdate = new FormControl(new Date());
        this.Edate = new FormControl(new Date());
        this.startdateVal = this.Sdate.value;
        this.enddateVal = this.Edate.value;

        this.loadDashboard();
        this.buildHomeView();
        this.getReportresearchespatients(this);

        this.filteredOptions = this.myControl.valueChanges.pipe(
            startWith(""),
            map((value) => (typeof value === "string" ? value : value?.name)),
            map((name) =>
                name ? this._filter(name) : this.NewBornUsersList.slice()
            )
        );

        this._Activatedroute.queryParams.subscribe((params) => {
            if (params["casenumber"]) {
                this.casenumber = params["casenumber"];
                this.setViewMode("registry");
                setTimeout(() => {
                    document.getElementById("rolesDetailsBtn")?.click();
                    this.getMotherDetails(null);
                });
            }
        });
    }

    ngAfterViewInit(): void {}

    @HostListener("window:resize")
    onResize(): void {
        this.recalcChart();
        this.recalcHomeCharts();
    }

    setViewMode(mode: ViewMode): void {
        this.viewMode = mode;
        if (mode === "home") {
            this.selectedDrillMonth = null;
            this.buildHomeCharts();
            return;
        }
        if (mode === "registry") {
            this.getTableFromServer(
                this.paginator?.pageIndex || 0,
                this.paginator?.pageSize || 10,
                this.fliterValPatient
            );
            return;
        }
        this.tableSearch = "";
        this.applyTableSearch();
        this.buildChart();
        this.recalcChart();
    }

    toggleTheme(): void {
        this.isDark = !this.isDark;
        localStorage.setItem("newbornDash.theme", this.isDark ? "dark" : "light");
        this.recalcChart();
        this.recalcHomeCharts();
    }

    toggleFiltersSidebar(): void {
        this.showFiltersSidebar = !this.showFiltersSidebar;
    }

    refreshDashboard(): void {
        if (this.viewMode === "registry") {
            this.getReportresearchespatients(this);
            return;
        }
        if (this.viewMode === "home") {
            this.buildHomeView();
            return;
        }
        this.loadDashboard();
    }

    applyFilters(): void {
        this.loadDashboard();
        this.showFiltersSidebar = false;
    }

    resetFilters(): void {
        this.filters = {
            startDate: "2022-01-01",
            endDate: "2027-01-01",
            year: null,
            month: null,
            yishuv: "",
            status: "",
        };
        this.loadDashboard();
    }

    applyTableSearch(): void {
        const q = (this.tableSearch || "").trim().toLowerCase();
        this.summaryDataSource.filter = q;
        this.detailDataSource.filter = q;
        this.monitoringDataSource.filter = q;
    }

    clearTableSearch(): void {
        this.tableSearch = "";
        this.applyTableSearch();
    }

    get activeFilterCount(): number {
        let count = 0;
        if (this.filters.year != null) count++;
        if (this.filters.month != null) count++;
        if (this.filters.yishuv) count++;
        if (this.filters.status) count++;
        return count;
    }

    get filterSummaryText(): string {
        const parts: string[] = [];
        if (this.filters.year != null) parts.push(`שנה: ${this.filters.year}`);
        if (this.filters.month != null) parts.push(`חודש: ${this.monthLabel(this.filters.month)}`);
        if (this.filters.yishuv) parts.push(`יישוב: ${this.filters.yishuv}`);
        if (this.filters.status) parts.push(`סטטוס: ${this.filters.status}`);
        parts.push(`טווח: ${this.filters.startDate} — ${this.filters.endDate}`);
        return parts.join(" · ");
    }

    get graphPanelTitle(): string {
        if (this.viewMode === "home") return "";
        if (this.viewMode === "summary") return "לידות לפי חודש";
        if (this.viewMode === "details") return "פילוח לידות לפי יישוב";
        if (this.viewMode === "monitoring") return "סטטוס מעקב הריון";
        return "";
    }

    get tablePanelTitle(): string {
        if (this.viewMode === "home") return "";
        if (this.viewMode === "summary") return "סיכום לידות לפי יישוב";
        if (this.viewMode === "details") return "פירוט לידות";
        if (this.viewMode === "monitoring") return "מעקב הריון — ביקורים";
        return "רישום לידות";
    }

    monthLabel(month: number): string {
        return MONTH_LABELS[month] || String(month);
    }

    statusClass(status: string): string {
        if (status === "לידה") return "status-chip status-chip--delivered";
        if (status === "ללא לידה") return "status-chip status-chip--missed";
        return "status-chip status-chip--active";
    }

    openMonthDrill(month: number): void {
        this.selectedDrillMonth = month;
        this.buildMonthlyDrillChart();
    }

    closeMonthDrill(): void {
        this.selectedDrillMonth = null;
    }

    onYearRangeChange(): void {
        if (this.yearRangeFrom > this.yearRangeTo) {
            const tmp = this.yearRangeFrom;
            this.yearRangeFrom = this.yearRangeTo;
            this.yearRangeTo = tmp;
        }
        if (this.selectedDrillMonth != null) {
            this.buildMonthlyDrillChart();
        }
    }

    get weeklyDeltaClass(): string {
        if (this.weeklyStats.deltaPercent > 0) return "delta-up";
        if (this.weeklyStats.deltaPercent < 0) return "delta-down";
        return "delta-flat";
    }

    get monthlyDrillTitle(): string {
        if (this.selectedDrillMonth == null) return "";
        return `${this.monthLabel(this.selectedDrillMonth)} — השוואה שנתית`;
    }

    private buildHomeView(): void {
        this.allSummaryRows = this.dataService.getAllSummaryRows();
        this.weeklyStats = this.dataService.computeWeeklyStats(this.allSummaryRows);
        this.homeSlices = this.dataService.computeHomeSlices(this.allSummaryRows);
        this.weeklyTrend = this.dataService.getWeeklyTrend();
        this.availableYears = this.dataService.getAvailableYears(this.allSummaryRows);
        this.buildHomeCharts();
        this.lastUpdateDate = this.now();
    }

    private buildHomeCharts(): void {
        const avg = this.weeklyStats.weeklyAverage;
        this.weeklyChartColumns = [
            "שבוע",
            "לידות",
            { type: "number", role: "annotation" },
            "ממוצע שבועי",
        ];
        this.weeklyChartRows = this.weeklyTrend.map((p) => [
            p.weekLabel,
            p.births,
            String(p.births),
            avg,
        ]);

        if (this.selectedDrillMonth != null) {
            this.buildMonthlyDrillChart();
        }
        this.recalcHomeCharts();
    }

    private buildMonthlyDrillChart(): void {
        if (this.selectedDrillMonth == null) return;
        const points = this.dataService.computeMonthlyByYear(
            this.allSummaryRows,
            this.selectedDrillMonth,
            this.yearRangeFrom,
            this.yearRangeTo
        );
        this.monthlyDrillColumns = ["שנה", "לידות", { role: "annotation", type: "string" }];
        this.monthlyDrillRows = points.map((p) => [String(p.year), p.births, String(p.births)]);
        this.recalcHomeCharts();
    }

    private recalcHomeCharts(): void {
        const textColor = this.isDark ? "#e5e7eb" : "#0f172a";
        const gridColor = this.isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0";

        this.weeklyChartOptions = {
            legend: { position: "top", alignment: "center", textStyle: { color: textColor, fontName: "Arial" } },
            backgroundColor: "transparent",
            seriesType: "bars",
            series: {
                0: { color: "#ec4899", targetAxisIndex: 0 },
                1: { type: "line", color: "#2563eb", lineWidth: 2, pointSize: 0, targetAxisIndex: 0 },
            },
            bar: { groupWidth: "55%" },
            hAxis: {
                textStyle: { fontSize: 10, color: textColor, fontName: "Arial" },
                slantedText: true,
                slantedTextAngle: 35,
            },
            vAxis: {
                minValue: 0,
                gridlines: { color: gridColor },
                textStyle: { color: textColor, fontName: "Arial" },
            },
            chartArea: { width: "90%", height: "62%", top: 40, left: 50 },
            annotations: {
                alwaysOutside: true,
                textStyle: { fontSize: 10, color: textColor, auraColor: "none" },
            },
            animation: { startup: true, duration: 450, easing: "out" },
        };

        const bars = Math.max(this.monthlyDrillRows.length, 1);
        this.monthlyDrillOptions = {
            legend: "none",
            backgroundColor: "transparent",
            colors: ["#db2777"],
            bar: { groupWidth: bars <= 3 ? "40%" : "55%" },
            hAxis: {
                textStyle: { fontSize: 12, color: textColor, fontName: "Arial" },
            },
            vAxis: {
                minValue: 0,
                gridlines: { color: gridColor },
                textStyle: { color: textColor, fontName: "Arial" },
            },
            chartArea: { width: "88%", height: "68%", top: 24, left: 56 },
            annotations: {
                alwaysOutside: true,
                textStyle: { fontSize: 12, color: textColor, auraColor: "none" },
            },
            animation: { startup: true, duration: 450, easing: "out" },
        };
    }

    private loadDashboard(): void {
        this.dashLoading = true;
        forkJoin({
            summary: this.dataService.getBirthSummary(this.filters),
            details: this.dataService.getBirthDetails(this.filters),
            monitoring: this.dataService.getPregnancyMonitoring(this.filters),
        }).subscribe({
            next: ({ summary, details, monitoring }) => {
                this.summaryDataSource.data = summary || [];
                this.detailDataSource.data = details || [];
                this.monitoringDataSource.data = monitoring || [];

                this.yishuvOptions = this.dataService.getYishuvOptions(summary || []);
                this.yearOptions = this.dataService.getYearOptions(
                    summary || [],
                    details || [],
                    monitoring || []
                );
                this.kpis = this.dataService.computeKpis(
                    summary || [],
                    monitoring || [],
                    details || []
                );

                this.applyTableSearch();
                if (this.viewMode === "home") {
                    this.buildHomeView();
                } else {
                    this.buildChart();
                    this.recalcChart();
                }
                this.lastUpdateDate = this.now();
                this.dashLoading = false;
            },
            error: () => {
                this.dashLoading = false;
            },
        });
    }

    private buildChart(): void {
        if (this.viewMode === "summary") {
            const byMonth = new Map<string, number>();
            this.summaryDataSource.data.forEach((r) => {
                const key = `${r.Year}-${String(r.Month).padStart(2, "0")}`;
                byMonth.set(key, (byMonth.get(key) || 0) + r.Births);
            });
            this.chartColumns = ["חודש", "לידות"];
            this.chartRows = Array.from(byMonth.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, births]) => [key, births]);
            return;
        }

        if (this.viewMode === "details") {
            const byCity = new Map<string, number>();
            this.detailDataSource.data.forEach((r) => {
                const city = (r.City || "לא ידוע").trim();
                byCity.set(city, (byCity.get(city) || 0) + 1);
            });
            this.chartColumns = ["יישוב", "לידות"];
            this.chartRows = Array.from(byCity.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([city, count]) => [city, count]);
            return;
        }

        if (this.viewMode === "monitoring") {
            const statusOrder = ["לידה", "עדיין במעקב", "ללא לידה"];
            this.chartColumns = ["סטטוס", "מטופלות"];
            this.chartRows = statusOrder.map((status) => [
                status,
                this.monitoringDataSource.data.filter((r) => r.Status === status).length,
            ]);
        }
    }

    private recalcChart(): void {
        const vw = window.innerWidth;
        this.chartWidth = Math.max(Math.min(vw - 80, 1200), 320);
        this.chartHeight = vw < 768 ? 280 : 360;
        const textColor = this.isDark ? "#e5e7eb" : "#0f172a";
        const gridColor = this.isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0";
        const bars = Math.max(this.chartRows.length, 1);

        this.chartOptions = {
            legend: "none",
            backgroundColor: "transparent",
            bar: { groupWidth: bars > 8 ? "72%" : "55%" },
            colors: this.viewMode === "monitoring"
                ? ["#22c55e", "#3b82f6", "#f97316"]
                : ["#ec4899"],
            hAxis: {
                textStyle: { fontSize: bars > 10 ? 10 : 12, color: textColor, fontName: "Arial" },
                slantedText: bars > 6,
                slantedTextAngle: 35,
            },
            vAxis: {
                minValue: 0,
                gridlines: { color: gridColor },
                textStyle: { color: textColor, fontName: "Arial" },
            },
            chartArea: { width: "88%", height: "68%", top: 24, left: 56 },
            animation: { startup: true, duration: 450, easing: "out" },
        };
    }

    private applyTableFilterPredicate(): void {
        const predicate = (data: unknown, filter: string) => {
            if (!filter) return true;
            return Object.values(data as Record<string, unknown>).some((v) =>
                String(v ?? "").toLowerCase().includes(filter)
            );
        };
        this.summaryDataSource.filterPredicate = predicate;
        this.detailDataSource.filterPredicate = predicate;
        this.monitoringDataSource.filterPredicate = predicate;
    }

    private now(): string {
        const d = new Date();
        const p = (n: number) => n.toString().padStart(2, "0");
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    private _filter(value: string): NewBornUsers[] {
        const filterValue = value.toLowerCase();
        return this.NewBornUsersList.filter((e) =>
            e.UserFullName.toLowerCase().includes(filterValue)
        );
    }

    updateUser(option) {
        this.patientForm.value.UserName = option.option.value.UserName;
        this.patientForm.patchValue({
            UserName: option.option.value.UserName,
            UserTell: option.option.value.CellNumber,
            UserFllName: option.option.value.UserFullName,
        });
        this.UserFrom = option.option.value.UserName;
        this.ShowFormNewBorn = true;
    }

    displayFn(user: any): string {
        return user && user.UserFullName ? user.UserFullName : "";
    }

    openSnackBar() {
        this._snackBar.open("נשמר בהצלחה", "", {
            duration: 2500,
            direction: "rtl",
            panelClass: "success",
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
        });
    }

    onSubmit() {
        this.submitted = true;
        if (this.patientForm.invalid) return;

        this.patientForm.value.UserName = this.UserFrom;
        this.patientForm.value.NewBornDOB = formatDate(
            this.patientForm.value.NewBornDOB,
            "yyyy-MM-dd",
            "en-US"
        );
        const dateNow = new Date();

        if (dateNow.getHours() - 2 > this.patientForm.value.NewBornTime._d.getHours()) {
            this._snackBar.open("עברו שעתיים מאז שעת הלידה!", "", {
                duration: 15000,
                direction: "rtl",
                panelClass: "error",
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
            });
            this.opendCounter++;
            return;
        } else if (dateNow.getTime() < this.patientForm.value.NewBornTime._d.getTime()) {
            this._snackBar.open("שעת הרישום לא נכונה!", "", {
                duration: 15000,
                direction: "rtl",
                panelClass: "error",
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
            });
            return;
        }

        this.patientForm.value.NewBornTime = formatDate(
            this.patientForm.value.NewBornTime,
            "HH:mm",
            "en-US"
        );
        if (this.patientForm.value.NewBornWeightInProgress == "") {
            this.patientForm.value.NewBornWeightInProgress = "לא";
        }
        if (this.patientForm.value.MultipleBirth == "") {
            this.patientForm.value.MultipleBirth = "לא";
        }
        if (this.patientForm.value.BirthIsDie == "") {
            this.patientForm.value.BirthIsDie = "לא";
        }

        if ($("#loader").hasClass("d-none")) {
            $("#loader").removeClass("d-none");
        }
        this.http
            .post("http://srv-ipracticom:8080/WebService.asmx/SaveNewBornForm", {
                _patientForm: this.patientForm.value,
            })
            .subscribe(() => {
                this.applyFilterresearchespatients(this.fliterValPatient);
                this.openSnackBar();
                $("#loader").addClass("d-none");
                this.patientForm.value.UserName = "";
                this.ShowFormNewBorn = false;
                this.modalServiceresearchespatients.dismissAll();
                this.opendCounter = 0;
                window.self.close();
            });
    }

    getMotherDetails(event) {
        let dataCasenumber = "";
        if (event == null) {
            dataCasenumber = this.casenumber;
        } else {
            dataCasenumber = event.target.value;
        }
        this.http
            .post(environment.urlipracticom + "GetPersonalDetails", {
                CaseNumber: dataCasenumber,
            })
            .subscribe((Response) => {
                const json = Response["d"];
                this.patientForm.patchValue({
                    MotherFirstName: json["FirstName"],
                    MotherLastName: json["LastName"],
                    MotherID: json["PersonID"].replace("-", ""),
                });
            });
    }

    selectNewBornUsers() {
        this.http
            .post("http://srv-ipracticom:8080/WebService.asmx/selectNewBornUsers", {})
            .subscribe((Response) => {
                this.NewBornUsersList = Response["d"];
            });
    }

    showRow(content, _type, _element) {
        this.ShowFormNewBorn = true;
        this.ShowSubmit = false;
        if (_element.NewBornWeightInProgress == "לא") _element.NewBornWeightInProgress = "";
        if (_element.MultipleBirth == "לא") _element.MultipleBirth = "";
        if (_element.BirthIsDie == "לא") _element.BirthIsDie = "";
        this.NewBornDOB = _element.NewBornDOB;
        this.NewBornTime = _element.NewBornTime;
        this.patientForm = this.formBuilder.group({
            MotherCaseNumber: [_element.MotherCaseNumber],
            MotherID: [_element.MotherID],
            MotherFirstName: [_element.MotherFirstName],
            MotherLastName: [_element.MotherLastName],
            NewBornDOB: [_element.NewBornDOB],
            NewBornTime: [_element.NewBornTime],
            BornProcedure: [_element.BornProcedure],
            NewBornGender: [_element.NewBornGender],
            NewBornWeight: [_element.NewBornWeight],
            NewBornWeightInProgress: [_element.NewBornWeightInProgress],
            NewBornWeekOfPregnancy: [_element.NewBornWeekOfPregnancy],
            MultipleBirth: [_element.MultipleBirth],
            NumberOfBirths: [_element.NumberOfBirths],
            BirthNumber: [_element.BirthNumber],
            BirthIsDie: [_element.BirthIsDie],
            hospitalizedAt: [_element.hospitalizedAt],
            UserName: [_element.UserFllName + " - " + _element.UserTell],
            NewBornPondkyat: [_element.NewBornPondkyat],
            RowID: [_element.RowID],
        });
        this.modalServiceresearchespatients.open(content, this.modalOptions).result.then(
            () => {},
            () => {
                this.patientForm.value.UserName = "";
                this.ShowFormNewBorn = false;
                this.myControl = new FormControl("");
            }
        );
    }

    open(content, _type, _element) {
        this.ShowSubmit = true;
        this.patientForm = this.formBuilder.group({
            MotherCaseNumber: [this.casenumber, [Validators.required]],
            MotherID: ["", [Validators.required]],
            MotherFirstName: ["", Validators.required],
            MotherLastName: ["", Validators.required],
            NewBornDOB: [new Date(), Validators.required],
            NewBornTime: ["", Validators.required],
            BornProcedure: ["", Validators.required],
            NewBornGender: ["", Validators.required],
            NewBornWeight: ["0", [Validators.required, Validators.pattern(/^[0-9]{1,4}$/)]],
            NewBornWeightInProgress: ["", null],
            NewBornPondkyat: ["", null],
            NewBornWeekOfPregnancy: ["", [Validators.required, Validators.pattern(/^[0-9]{1,2}$/)]],
            MultipleBirth: ["", null],
            NumberOfBirths: ["1", [Validators.required, Validators.pattern(/^[0-9]{1,1}$/)]],
            BirthNumber: ["1", [Validators.required, Validators.pattern(/^[0-9]{1,1}$/)]],
            BirthIsDie: ["", null],
            hospitalizedAt: ["", Validators.required],
            UserName: ["", Validators.required],
            UserFllName: ["", Validators.required],
            UserTell: ["", Validators.required],
            RowID: [0, null],
        });
        this.modalServiceresearchespatients.open(content, this.modalOptions).result.then(
            () => {},
            () => {
                this.patientForm.value.UserName = "";
                this.ShowFormNewBorn = false;
                this.myControl = new FormControl("");
            }
        );
    }

    getReportresearchespatients($event: any): void {
        this.getTableFromServer(
            this.paginator?.pageIndex || 0,
            this.paginator?.pageSize || 10,
            this.fliterValPatient
        );
    }

    applyFilterresearchespatients(filterValue: string) {
        this.fliterValPatient = filterValue;
        this.getTableFromServer(
            this.paginator?.pageIndex || 0,
            this.paginator?.pageSize || 10,
            this.fliterValPatient
        );
    }

    getPaginatorData(event: PageEvent) {
        this.getTableFromServer(
            this.paginator.pageIndex,
            this.paginator.pageSize,
            this.fliterValPatient
        );
    }

    getTableFromServer(_pageIndex: number, _pageSize: number, _FreeText: string) {
        let tableLoader = false;
        if ($("#loader").hasClass("d-none")) {
            tableLoader = true;
            $("#loader").removeClass("d-none");
        }
        this.http
            .post("http://srv-ipracticom:8080/WebService.asmx/GetNewBornTable", {
                _pageIndex: _pageIndex,
                _pageSize: _pageSize,
                _freeText: _FreeText,
                _fromDate: this.startdateVal,
                _toDate: this.enddateVal,
            })
            .subscribe((Response) => {
                this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
                const json = Response["d"];
                this.TABLE_DATA = json;
                this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
                this.resultsLength = json.length > 0 ? parseInt(json[0]["TotalRows"]) : 0;
                setTimeout(() => {
                    if (tableLoader) $("#loader").addClass("d-none");
                });
            });
    }
}
