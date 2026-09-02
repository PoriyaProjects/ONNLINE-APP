import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map, switchMap, tap, timeout } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { parseAsmxPayload } from "../../pci-dashborad-n/utils/pci-asmx.util";
import {
    EmergencyReplacementRow,
    RecommendationAgingBucketRow,
    RecommendationBacklogRow,
    RecommendationDeptRow,
    RecommendationDoctorCountRow,
    RecommendationMonthRow,
    RecommendationMonthlyTrendRow,
    RecommendationProcedureRow,
    RecommendationYearRow,
    SurgeryCountByDeptRow,
    SurgeryCountByDoctorRow,
    SurgeryByDepartmentRow,
    SurgeryDeptAggregateRow,
    SurgeryDoctorAggregateRow,
    SurgeryMonthRow,
} from "./pci-wait-times.models";
import {
    defaultPciDepartmentOptions,
    DepartmentFilterOption,
    inferPciDepartmentValue,
    isValidPciDepartmentValue,
    pciDepartmentMatchKeys,
} from "./pci-department-contract";

@Injectable({ providedIn: "root" })
export class PciWaitTimesApiService {
    private yearlyCache = new Map<string, RecommendationYearRow[]>();
    private monthlyCache = new Map<string, RecommendationMonthRow[]>();
    private deptCache = new Map<string, RecommendationDeptRow[]>();
    private procedureCache = new Map<string, RecommendationProcedureRow[]>();
    private emergencyCache = new Map<string, EmergencyReplacementRow[]>();
    private monthlyTrendCache = new Map<
        string,
        RecommendationMonthlyTrendRow[]
    >();
    private backlogCache = new Map<string, RecommendationBacklogRow[]>();
    private agingCache = new Map<string, RecommendationAgingBucketRow[]>();
    private surgeryMonthlyCache = new Map<string, SurgeryMonthRow[]>();
    private surgeryDeptCache = new Map<string, SurgeryByDepartmentRow[]>();
    private surgeryDoctorCache = new Map<string, SurgeryCountByDoctorRow[]>();
    private countByDeptCache = new Map<string, SurgeryCountByDeptRow[]>();
    private doctorRecommendationCache = new Map<
        string,
        RecommendationDoctorCountRow[]
    >();
    private departmentOptionsCache: DepartmentFilterOption[] | null = null;

    /** סינון קבוע לצינתורים אלקטיביים — בוקר, אמצע שבוע (נשלח לשרת) */
    private readonly electiveMorningSurgeryParams = {
        surgeryType: "אלקטיבי",
        shift: "בוקר",
        site: "",
        weekend: "false",
        morningWork: "",
        rooms: "",
    };

    private readonly hospitalKey = "__all__";

    /** Guard: a single slow analytics query must not freeze the panel. */
    private readonly analyticsTimeoutMs = 20000;

    constructor(private http: HttpClient) {}

    private asmxGet(
        url: string,
        options?: { params?: HttpParams },
    ) {
        return this.http.get(url, { ...options, responseType: "text" }).pipe(
            map((text) => parseAsmxPayload(text)),
        );
    }

    /** Clears all locally cached API responses (explicit refresh only). */
    clearCache(): void {
        this.yearlyCache.clear();
        this.monthlyCache.clear();
        this.deptCache.clear();
        this.procedureCache.clear();
        this.emergencyCache.clear();
        this.monthlyTrendCache.clear();
        this.backlogCache.clear();
        this.agingCache.clear();
        this.surgeryMonthlyCache.clear();
        this.surgeryDeptCache.clear();
        this.surgeryDoctorCache.clear();
        this.countByDeptCache.clear();
        this.doctorRecommendationCache.clear();
        this.departmentOptionsCache = null;
    }

    isBundleCached(department: string): boolean {
        const monthKey = department || this.hospitalKey;
        return (
            this.yearlyCache.has(this.hospitalKey) &&
            this.monthlyCache.has(monthKey) &&
            this.deptCache.has(this.hospitalKey) &&
            this.procedureCache.has(this.hospitalKey) &&
            this.emergencyCache.has(this.hospitalKey) &&
            this.monthlyTrendCache.has(this.hospitalKey) &&
            this.backlogCache.has(this.hospitalKey) &&
            this.agingCache.has(this.hospitalKey)
        );
    }

    getRecommendationsYearly(
        forceRefresh = false,
    ): Observable<RecommendationYearRow[]> {
        return this.getCachedOrFetch(
            this.yearlyCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationsYearly_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeYearly(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /** חתך חודשי — GetRecommendationsMonthly_pci_dashborad (5 שנים). סינון מחלקה אינו נתמך בשרת. */
    getRecommendationsMonthly(
        _department = "",
        forceRefresh = false,
    ): Observable<RecommendationMonthRow[]> {
        return this.getCachedOrFetch(
            this.monthlyCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationsMonthly_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeMonthly(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * אפשרויות סינון מחלקה — { label, value } מ-API קיימים בלבד.
     * ערכים מ-GetSurgeriesByDepartment_pci_dashborad; תוויות מ-GetRecommendationsByDepartment_pci_dashborad.
     */
    getPciDepartmentOptions(
        forceRefresh = false,
        baseYear: number = new Date().getFullYear(),
    ): Observable<DepartmentFilterOption[]> {
        if (!forceRefresh && this.departmentOptionsCache?.length) {
            return of(this.departmentOptionsCache);
        }
        return forkJoin({
            surgery: this.getSurgeriesByDepartment(baseYear, forceRefresh),
            recommendations: this.getRecommendationsByDepartment(forceRefresh),
        }).pipe(
            map(({ surgery, recommendations }) =>
                this.buildDepartmentFilterOptions(surgery, recommendations),
            ),
            map((opts) =>
                opts.length ? opts : defaultPciDepartmentOptions(),
            ),
            tap((opts) => {
                this.departmentOptionsCache = opts;
            }),
            catchError(() => {
                const fallback = defaultPciDepartmentOptions();
                this.departmentOptionsCache = fallback;
                return of(fallback);
            }),
        );
    }

    private buildDepartmentFilterOptions(
        surgeryRows: SurgeryByDepartmentRow[],
        recommendationRows: RecommendationDeptRow[],
    ): DepartmentFilterOption[] {
        const labelByValue = new Map<string, string>();

        for (const r of recommendationRows) {
            const label = (r.Department || "").trim();
            const value = (
                r.DepartmentValue ||
                inferPciDepartmentValue(label) ||
                ""
            ).trim();
            if (value && label && isValidPciDepartmentValue(value)) {
                labelByValue.set(value, label);
            }
        }

        const seen = new Set<string>();
        const out: DepartmentFilterOption[] = [];
        for (const r of surgeryRows) {
            const value = (r.Department || "").trim();
            if (!value || !isValidPciDepartmentValue(value) || seen.has(value)) {
                continue;
            }
            seen.add(value);
            out.push({ label: labelByValue.get(value) || value, value });
        }

        for (const r of recommendationRows) {
            const label = (r.Department || "").trim();
            const value = (
                r.DepartmentValue ||
                inferPciDepartmentValue(label) ||
                ""
            ).trim();
            if (!value || !isValidPciDepartmentValue(value) || seen.has(value)) {
                continue;
            }
            seen.add(value);
            out.push({ label: label || value, value });
        }

        return out.sort((a, b) => a.label.localeCompare(b.label, "he"));
    }

    getRecommendationsByDepartment(
        forceRefresh = false,
    ): Observable<RecommendationDeptRow[]> {
        return this.getCachedOrFetch(
            this.deptCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationsByDepartment_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeDept(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * המלצות לפי רופא ממליץ — GetRecommendationsByDoctor_pci_dashborad
     * department = ערך [מנתחת מאוגד] (ריק = כל בית החולים).
     */
    getRecommendationsByDoctor(
        department = "",
        baseYear?: number,
        forceRefresh = false,
    ): Observable<RecommendationDoctorCountRow[]> {
        const dept = department?.trim() ?? "";
        const yearKey =
            baseYear != null && baseYear > 0
                ? String(baseYear)
                : this.hospitalKey;
        const key = [dept || this.hospitalKey, yearKey].join("|");
        return this.getCachedOrFetch(
            this.doctorRecommendationCache,
            key,
            forceRefresh,
            () => this.fetchRecommendationsByDoctorFromServer(dept, baseYear),
        );
    }

    private fetchRecommendationsByDoctorFromServer(
        department = "",
        baseYear?: number,
    ): Observable<RecommendationDoctorCountRow[]> {
        const endpoints = [
            "GetRecommendationsByDoctor_pci_dashborad",
            "GetRecommendationsByRecommendingDoctor_pci_dashborad",
        ];
        return this.fetchRecommendationsByDoctorFromEndpoint(
            endpoints,
            0,
            department,
            baseYear,
        );
    }

    private fetchRecommendationsByDoctorFromEndpoint(
        endpoints: string[],
        index: number,
        department = "",
        baseYear?: number,
    ): Observable<RecommendationDoctorCountRow[]> {
        if (index >= endpoints.length) {
            return of([]);
        }
        const name = endpoints[index];
        let params = new HttpParams();
        const dept = department?.trim() ?? "";
        if (dept) {
            params = params.set("department", dept);
        }
        if (baseYear != null && baseYear > 0) {
            params = params.set("baseYear", String(baseYear));
        }
        const options = params.keys().length ? { params } : {};
        return this.asmxGet(environment.url + name, options).pipe(
            map((r) => this.normalizeDoctorRecommendations(r)),
            switchMap((rows) =>
                rows.length
                    ? of(rows)
                    : this.fetchRecommendationsByDoctorFromEndpoint(
                          endpoints,
                          index + 1,
                          department,
                          baseYear,
                      ),
            ),
            catchError(() =>
                this.fetchRecommendationsByDoctorFromEndpoint(
                    endpoints,
                    index + 1,
                    department,
                    baseYear,
                ),
            ),
        );
    }

    getTopRecommendedProcedures(
        doctor = "",
        department = "",
        forceRefresh = false,
    ): Observable<RecommendationProcedureRow[]> {
        const doc = doctor?.trim() ?? "";
        const dept = department?.trim() ?? "";
        const key = [doc || "__all__", dept || "__all__"].join("|");
        return this.getCachedOrFetch(
            this.procedureCache,
            key,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetTopRecommendedProcedures_pci_dashborad",
                        {
                            params: new HttpParams()
                                .set("doctor", doc)
                                .set("department", dept),
                        },
                    )
                    .pipe(
                        map((r) => this.normalizeProcedures(r)),
                        catchError(() => of([])),
                        timeout(this.analyticsTimeoutMs),
                    ),
        );
    }

    getEmergencyReplacementAnalysis(
        forceRefresh = false,
    ): Observable<EmergencyReplacementRow[]> {
        return this.getCachedOrFetch(
            this.emergencyCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetEmergencyReplacementAnalysis_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeEmergency(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * מגמת המרה חודשית — GetRecommendationMonthlyTrend_pci_dashborad
     * שדות: Yr, Mn, RecommendedCount, PerformedCount, ConversionRate
     */
    getRecommendationMonthlyTrend(
        forceRefresh = false,
    ): Observable<RecommendationMonthlyTrendRow[]> {
        return this.getCachedOrFetch(
            this.monthlyTrendCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationMonthlyTrend_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeMonthlyTrend(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * מצבת ממתינים לפי מחלקה — GetRecommendationBacklog_pci_dashborad
     * שדות: DepartmentName, WaitingCount, AvgWaitingDays
     */
    getRecommendationBacklog(
        forceRefresh = false,
    ): Observable<RecommendationBacklogRow[]> {
        return this.getCachedOrFetch(
            this.backlogCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationBacklog_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeBacklog(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * התיישנות ההמתנה לפי טווחי ימים — GetRecommendationAgingBuckets_pci_dashborad
     * שדות: BucketName, CasesCount
     */
    /**
     * צינתורים שבוצעו לפי חודש — GetMonthlyCounts_pci_dashborad
     * (אותה תקופה בכל שנה — YTD לפי חודשי הנתונים).
     *
     * פרמטר `department` = ערך [מנתחת מאוגד] בדיוק כפי שב-SurgerydashboardForRoey.
     */
    getMonthlySurgeryCounts(
        baseYear: number,
        department = "",
        forceRefresh = false,
    ): Observable<SurgeryMonthRow[]> {
        const dept = department?.trim() ?? "";
        if (dept && !isValidPciDepartmentValue(dept)) {
            return of([]);
        }
        const p = this.electiveMorningSurgeryParams;
        const key = [
            baseYear,
            dept || this.hospitalKey,
            p.surgeryType,
            p.shift,
            p.weekend,
        ].join("|");
        return this.getCachedOrFetch(
            this.surgeryMonthlyCache,
            key,
            forceRefresh,
            () => {
                const params = new HttpParams()
                    .set("baseYear", String(baseYear))
                    .set("surgeryType", p.surgeryType)
                    .set("shift", p.shift)
                    .set("site", p.site)
                    .set("weekend", p.weekend)
                    .set("morningWork", p.morningWork)
                    .set("rooms", p.rooms)
                    .set("department", dept);
                return this.asmxGet(
                        environment.url +
                            "GetMonthlyCounts_pci_dashborad",
                        { params },
                    )
                    .pipe(
                        map((r) => this.normalizeSurgeryMonthly(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    );
            },
        );
    }

    /**
     * צינתורים שבוצעו לפי מחלקה ושנה — GetSurgeriesByDepartment_pci_dashborad
     * Department = ערך [מנתחת מאוגד]; סינון אלקטיבי/בוקר/אמצע שבוע בשרת.
     */
    getSurgeriesByDepartment(
        baseYear: number,
        forceRefresh = false,
    ): Observable<SurgeryByDepartmentRow[]> {
        const p = this.electiveMorningSurgeryParams;
        const key = [
            baseYear,
            p.surgeryType,
            p.shift,
            p.weekend,
        ].join("|");
        return this.getCachedOrFetch(
            this.surgeryDeptCache,
            key,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url +
                            "GetSurgeriesByDepartment_pci_dashborad",
                        { params: this.buildSurgeryDashboardParams(baseYear) },
                    )
                    .pipe(
                        map((r) => this.normalizeSurgeriesByDepartment(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /** @deprecated Use getSurgeriesByDepartment */
    getSurgeryCountByDept(
        baseYear: number,
        forceRefresh = false,
    ): Observable<SurgeryByDepartmentRow[]> {
        return this.getSurgeriesByDepartment(baseYear, forceRefresh);
    }

    /**
     * צינתורים מפורטים לפי מחלקה/רופא/שנה — GetCountByDept_pci_dashborad
     * (YTD לפי חודש; כולל Doctor, Wing, סוג צינתור, משמרת).
     */
    getCountByDept(
        baseYear: number,
        forceRefresh = false,
    ): Observable<SurgeryCountByDeptRow[]> {
        return this.getCachedOrFetch(
            this.countByDeptCache,
            String(baseYear),
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url +
                            "GetCountByDept_pci_dashborad",
                        {
                            params: new HttpParams().set(
                                "baseYear",
                                String(baseYear),
                            ),
                        },
                    )
                    .pipe(
                        map((r) => this.normalizeSurgeryDept(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /** סינון אלקטיבי + בוקר + אמצע שבוע על שורות GetCountByDept. */
    filterCountByDeptElectiveMorning(
        rows: SurgeryCountByDeptRow[],
    ): SurgeryCountByDeptRow[] {
        const surgeryType = this.electiveMorningSurgeryParams.surgeryType;
        return rows.filter((r) => {
            let unified = (r.UnifiedSurgeryType || "").trim();
            if (!unified) {
                unified = "אלקטיבי";
            }
            if (unified !== surgeryType) {
                return false;
            }
            const shift = (r.Shift || "").trim();
            const weekPart = (r.WeekPart || "").trim();
            if (shift && shift !== "בוקר") {
                return false;
            }
            if (weekPart && weekPart !== "אמצע שבוע") {
                return false;
            }
            return true;
        });
    }

    countByDeptHasMonthlyDoctorData(
        rows: SurgeryCountByDeptRow[],
        doctor: string,
        year: number,
        wingFilter = "",
    ): boolean {
        const doc = doctor.trim();
        if (!doc) {
            return false;
        }
        const wing = wingFilter.trim();
        return this.filterCountByDeptElectiveMorning(rows).some((r) => {
            if (r.Year !== year) {
                return false;
            }
            if ((r.Month ?? 0) < 1 || (r.Month ?? 0) > 12) {
                return false;
            }
            const name = (r.Doctor || "").trim();
            if (!name || !this.doctorNamesLooseMatch(name, doc)) {
                return false;
            }
            if (wing) {
                const rowWing = (r.Wing || "").trim();
                const wingKeys = new Set(pciDepartmentMatchKeys(wing));
                const rowKeys = pciDepartmentMatchKeys(rowWing);
                if (
                    !rowKeys.some((k) => wingKeys.has(k)) &&
                    rowWing !== wing
                ) {
                    return false;
                }
            }
            return true;
        });
    }

    surgeryCountForDoctorFromCountByDept(
        rows: SurgeryCountByDeptRow[],
        doctor: string,
        year: number,
        wingFilter = "",
    ): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        const wing = wingFilter.trim();
        let sum = 0;
        for (const r of this.filterCountByDeptElectiveMorning(rows)) {
            if (r.Year !== year) {
                continue;
            }
            const name = (r.Doctor || "").trim();
            if (!name || !this.doctorNamesLooseMatch(name, doc)) {
                continue;
            }
            if (wing) {
                const rowWing = (r.Wing || "").trim();
                const wingKeys = new Set(pciDepartmentMatchKeys(wing));
                const rowKeys = pciDepartmentMatchKeys(rowWing);
                if (
                    !rowKeys.some((k) => wingKeys.has(k)) &&
                    rowWing !== wing
                ) {
                    continue;
                }
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    surgeryCountForWingFromCountByDept(
        rows: SurgeryCountByDeptRow[],
        wingKey: string,
        year: number,
    ): number {
        const keys = new Set<string>([wingKey.trim()]);
        const inferred = inferPciDepartmentValue(wingKey);
        if (inferred) {
            keys.add(inferred);
        }
        let sum = 0;
        for (const r of this.filterCountByDeptElectiveMorning(rows)) {
            if (r.Year !== year) {
                continue;
            }
            const wing = (r.Wing || "").trim();
            if (!wing) {
                continue;
            }
            if (
                !keys.has(wing) &&
                !pciDepartmentMatchKeys(wing).some((k) => keys.has(k))
            ) {
                continue;
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    surgeryCountForDoctorMonthFromCountByDept(
        rows: SurgeryCountByDeptRow[],
        doctor: string,
        year: number,
        month: number,
        wingFilter = "",
    ): number {
        const doc = doctor.trim();
        if (!doc) {
            return 0;
        }
        const wing = wingFilter.trim();
        const eligible = this.filterCountByDeptElectiveMorning(rows).filter(
            (r) => r.Year === year,
        );
        const monthlyEligible = eligible.filter(
            (r) => (r.Month ?? 0) >= 1 && (r.Month ?? 0) <= 12,
        );
        const source = monthlyEligible.length ? monthlyEligible : [];
        if (!source.length) {
            return 0;
        }
        let sum = 0;
        for (const r of source) {
            if (r.Month !== month) {
                continue;
            }
            const name = (r.Doctor || "").trim();
            if (!name || !this.doctorNamesLooseMatch(name, doc)) {
                continue;
            }
            if (wing) {
                const rowWing = (r.Wing || "").trim();
                const wingKeys = new Set(pciDepartmentMatchKeys(wing));
                const rowKeys = pciDepartmentMatchKeys(rowWing);
                if (
                    !rowKeys.some((k) => wingKeys.has(k)) &&
                    rowWing !== wing
                ) {
                    continue;
                }
            }
            sum += r.Count || 0;
        }
        return sum;
    }

    private doctorNamesLooseMatch(a: string, b: string): boolean {
        const x = (a || "").trim();
        const y = (b || "").trim();
        if (!x || !y) {
            return false;
        }
        if (x === y) {
            return true;
        }
        return x.includes(y) || y.includes(x);
    }

    /** מצטבר צינתורים שבוצעו לפי [מנתחת מאוגד] לשנה נתונה. */
    aggregateSurgeriesByDepartmentForYear(
        rows: SurgeryByDepartmentRow[],
        year: number,
    ): SurgeryDeptAggregateRow[] {
        const map = new Map<string, number>();
        for (const r of rows) {
            if (r.Year !== year) {
                continue;
            }
            const dept = (r.Department || "").trim();
            if (!dept) {
                continue;
            }
            map.set(dept, (map.get(dept) || 0) + (r.Count || 0));
        }
        return [...map.entries()]
            .map(([Department, Count]) => ({ Department, Count }))
            .sort((a, b) => b.Count - a.Count);
    }

    /** @deprecated Server filters now; use aggregateSurgeriesByDepartmentForYear */
    aggregateSurgeryCountsByDept(
        rows: SurgeryByDepartmentRow[],
        baseYear?: number,
    ): SurgeryDeptAggregateRow[] {
        return this.aggregateSurgeriesByDepartmentForYear(
            rows,
            baseYear ?? 0,
        );
    }

    /** @deprecated Server filters now */
    filterElectiveMorningMidweek(
        rows: SurgeryByDepartmentRow[],
        baseYear?: number,
    ): SurgeryByDepartmentRow[] {
        if (baseYear == null || baseYear <= 0) {
            return rows;
        }
        return rows.filter((r) => r.Year === baseYear);
    }

    /**
     * צינתורים שבוצעו לפי רופא ושנה — GetCountByDoctor_pci_dashborad
     * (סינון אלקטיבי / בוקר / אמצע שבוע נשלח לשרת; department אופציונלי).
     */
    getSurgeriesByDoctor(
        baseYear: number,
        department = "",
        forceRefresh = false,
    ): Observable<SurgeryCountByDoctorRow[]> {
        const p = this.electiveMorningSurgeryParams;
        const dept = department?.trim() ?? "";
        const key = [
            baseYear,
            dept || this.hospitalKey,
            p.surgeryType,
            p.shift,
            p.weekend,
        ].join("|");
        return this.getCachedOrFetch(
            this.surgeryDoctorCache,
            key,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url +
                            "GetCountByDoctor_pci_dashborad",
                        {
                            params: this.buildSurgeryDashboardParams(
                                baseYear,
                                dept,
                            ),
                        },
                    )
                    .pipe(
                        map((r) => this.normalizeSurgeryDoctor(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /** @deprecated Use getSurgeriesByDoctor */
    getSurgeryCountByDoctor(
        baseYear: number,
        department = "",
        forceRefresh = false,
    ): Observable<SurgeryCountByDoctorRow[]> {
        return this.getSurgeriesByDoctor(baseYear, department, forceRefresh);
    }

    /** מצטבר צינתורים שבוצעו לפי רופא (סכום לכל השנים בחלון). */
    aggregateSurgeryCountsByDoctor(
        rows: SurgeryCountByDoctorRow[],
    ): SurgeryDoctorAggregateRow[] {
        const map = new Map<string, number>();
        for (const r of rows) {
            const name = (r.DoctorName || "").trim();
            if (!name) {
                continue;
            }
            map.set(name, (map.get(name) || 0) + (r.Count || 0));
        }
        return [...map.entries()]
            .map(([DoctorName, Count]) => ({ DoctorName, Count }))
            .sort((a, b) => b.Count - a.Count);
    }

    getRecommendationAgingBuckets(
        forceRefresh = false,
    ): Observable<RecommendationAgingBucketRow[]> {
        return this.getCachedOrFetch(
            this.agingCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetRecommendationAgingBuckets_pci_dashborad",
                    )
                    .pipe(
                        map((r) => this.normalizeAging(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    private getCachedOrFetch<T>(
        cache: Map<string, T>,
        key: string,
        forceRefresh: boolean,
        fetch: () => Observable<T>,
    ): Observable<T> {
        if (!forceRefresh && cache.has(key)) {
            return of(cache.get(key)!);
        }
        return fetch().pipe(tap((data) => cache.set(key, data)));
    }

    private unwrapArray(raw: unknown): unknown[] {
        let data: unknown = parseAsmxPayload(raw);
        if (
            data &&
            typeof data === "object" &&
            (data as { d?: unknown }).d != null
        ) {
            data = (data as { d: unknown }).d;
        }
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                return [];
            }
        }
        if (Array.isArray(data)) {
            return data;
        }
        if (data && typeof data === "object") {
            const vals = Object.values(data as Record<string, unknown>);
            if (vals.length && vals.every((v) => v && typeof v === "object")) {
                return vals;
            }
        }
        return [];
    }

    private num(v: unknown): number {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }

    private str(v: unknown): string {
        return v != null ? String(v).trim() : "";
    }

    private normalizeYearly(raw: unknown): RecommendationYearRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Count: this.num(
                    r.Recommendations ??
                        r.recommendations ??
                        r.TotalCount ??
                        r.totalCount ??
                        r.Count ??
                        r.count,
                ),
            }))
            .filter((r) => r.Year > 0);
    }

    private normalizeSurgeryMonthly(raw: unknown): SurgeryMonthRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Month: this.num(r.Month ?? r.month ?? r.mo),
                Count: this.num(r.Count ?? r.count ?? r.cnt),
            }))
            .filter((r) => r.Year > 0 && r.Month >= 1 && r.Month <= 12);
    }

    private normalizeSurgeriesByDepartment(
        raw: unknown,
    ): SurgeryByDepartmentRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year),
                Department: this.str(
                    r.Department ??
                        r.department ??
                        r.Wing ??
                        r.wing ??
                        r["מנתחת מאוגד"],
                ),
                Count: this.num(
                    r.Count ?? r.count ?? r.TotalCount ?? r.totalCount,
                ),
            }))
            .filter((r) => r.Year > 0 && !!r.Department);
    }

    private buildSurgeryDashboardParams(
        baseYear: number,
        department = "",
    ): HttpParams {
        const p = this.electiveMorningSurgeryParams;
        let params = new HttpParams()
            .set("baseYear", String(baseYear))
            .set("surgeryType", p.surgeryType)
            .set("shift", p.shift)
            .set("site", p.site)
            .set("weekend", p.weekend)
            .set("morningWork", p.morningWork)
            .set("rooms", p.rooms);
        const dept = department?.trim() ?? "";
        if (dept) {
            params = params.set("department", dept);
        }
        return params;
    }

    /** שורות GetCountByDept_pci_dashborad */
    private normalizeSurgeryDept(raw: unknown): SurgeryCountByDeptRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Site: this.str(r.Site ?? r.site),
                Department: this.str(r.Department ?? r.department),
                Wing: this.str(r.Wing ?? r.wing),
                Doctor: this.str(r.Doctor ?? r.doctor),
                Count: this.num(r.Count ?? r.count ?? r.cnt),
                MatchCount: this.num(r.MatchCount ?? r.match_count),
                MismatchCount: this.num(r.MismatchCount ?? r.mismatch_count),
                UnifiedSurgeryType: this.str(
                    r.UnifiedSurgeryType ?? r.unified_surgery_type,
                ),
                Shift: this.str(r.Shift ?? r.shift),
                SurgeryRoom: this.str(r.SurgeryRoom ?? r.surgery_room),
                WeekPart: this.str(r.WeekPart ?? r.week_part),
                FundType: this.str(r.FundType ?? r.fund_type),
                Month: (() => {
                    const mo = this.num(r.Month ?? r.month ?? r.mo);
                    return mo >= 1 && mo <= 12 ? mo : undefined;
                })(),
            }))
            .filter((r) => r.Year > 0 && (!!r.Department || !!r.Wing));
    }

    private normalizeSurgeryDoctor(raw: unknown): SurgeryCountByDoctorRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year),
                DoctorName: this.str(
                    r.DoctorName ??
                        r.doctorName ??
                        r.Doctor ??
                        r.doctor,
                ),
                Count: this.num(
                    r.Count ?? r.count ?? r.TotalCount ?? r.totalCount,
                ),
            }))
            .filter((r) => r.Year > 0 && !!r.DoctorName);
    }

    private normalizeMonthly(raw: unknown): RecommendationMonthRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Month: this.num(r.Month ?? r.month ?? r.mn),
                Count: this.num(
                    r.Recommendations ??
                        r.recommendations ??
                        r.Count ??
                        r.count,
                ),
            }))
            .filter((r) => r.Year > 0 && r.Month >= 1 && r.Month <= 12);
    }

    private normalizeDoctorRecommendations(
        raw: unknown,
    ): RecommendationDoctorCountRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => {
                const year = this.num(r.Year ?? r.year ?? r.yr);
                return {
                    Doctor: this.str(
                        r.DoctorName ??
                            r.doctorName ??
                            r.RecommendingDoctor ??
                            r.recommendingDoctor ??
                            r.Doctor ??
                            r.doctor ??
                            r.Name ??
                            r.name,
                    ),
                    Count: this.num(
                        r.Recommendations ??
                            r.recommendations ??
                            r.TotalCount ??
                            r.totalCount ??
                            r.Count ??
                            r.count,
                    ),
                    Year: year > 0 ? year : undefined,
                };
            })
            .filter((r) => !!r.Doctor && r.Count > 0);
    }

    private normalizeDept(raw: unknown): RecommendationDeptRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => {
                const label = this.str(
                    r.DepartmentName ??
                        r.departmentName ??
                        r.Department ??
                        r.department ??
                        r.UnitName ??
                        r.unitName ??
                        r.Label ??
                        r.label,
                );
                const departmentValue = this.str(
                    r.DepartmentValue ??
                        r.departmentValue ??
                        r.Wing ??
                        r.wing ??
                        r.PciDepartment ??
                        r.pciDepartment ??
                        r["מנתחת מאוגד"],
                );
                const inferred = inferPciDepartmentValue(label);
                const resolvedValue =
                    departmentValue &&
                    isValidPciDepartmentValue(departmentValue)
                        ? departmentValue
                        : inferred;
                const year = this.num(r.Year ?? r.year ?? r.yr);
                const month = this.num(r.Month ?? r.month ?? r.mo);
                const doctorName = this.str(
                    r.DoctorName ??
                        r.doctorName ??
                        r.RecommendingDoctor ??
                        r.recommendingDoctor,
                );
                return {
                    Department: label,
                    Count: this.num(
                        r.Recommendations ??
                            r.recommendations ??
                            r.TotalCount ??
                            r.totalCount ??
                            r.Count ??
                            r.count,
                    ),
                    DepartmentValue: resolvedValue,
                    Year: year > 0 ? year : undefined,
                    Month:
                        month >= 1 && month <= 12 ? month : undefined,
                    DoctorName: doctorName || undefined,
                };
            })
            .filter((r) => !!r.Department);
    }

    private normalizeProcedures(raw: unknown): RecommendationProcedureRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Procedure: this.str(
                    r.ProcedureName ??
                        r.procedureName ??
                        r.Procedure ??
                        r.procedure,
                ),
                Count: this.num(
                    r.TotalCount ?? r.totalCount ?? r.Count ?? r.count,
                ),
            }))
            .filter((r) => !!r.Procedure);
    }

    private normalizeEmergency(raw: unknown): EmergencyReplacementRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Department: this.str(
                    r.DepartmentName ??
                        r.departmentName ??
                        r.Department ??
                        r.department,
                ),
                CancelledCount: this.num(
                    r.CancelledCount ?? r.cancelledCount,
                ),
                EmergencyReplacedCount: this.num(
                    r.EmergencyReplacedCount ?? r.emergencyReplacedCount,
                ),
                EmergencyReplacementRate: this.num(
                    r.EmergencyReplacementRate ?? r.emergencyReplacementRate,
                ),
            }))
            .filter((r) => !!r.Department);
    }

    private normalizeMonthlyTrend(
        raw: unknown,
    ): RecommendationMonthlyTrendRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => {
                const recommended = this.num(
                    r.RecommendedCount ?? r.recommendedCount,
                );
                const performed = this.num(
                    r.PerformedCount ?? r.performedCount,
                );
                const rate = this.num(r.ConversionRate ?? r.conversionRate);
                const total = this.num(r.TotalSurgeries ?? r.totalSurgeries);
                const shareRaw = this.num(
                    r.RecommendedShareOfPerformed ??
                        r.recommendedShareOfPerformed,
                );
                return {
                    Year: this.num(r.Yr ?? r.yr ?? r.Year ?? r.year),
                    Month: this.num(r.Mn ?? r.mn ?? r.Month ?? r.month),
                    RecommendedCount: recommended,
                    PerformedCount: performed,
                    // recompute client-side as a safeguard when the rate is missing
                    ConversionRate:
                        rate > 0
                            ? rate
                            : recommended > 0
                            ? (performed / recommended) * 100
                            : 0,
                    TotalSurgeries: total,
                    RecommendedShareOfPerformed:
                        shareRaw > 0
                            ? shareRaw
                            : total > 0
                            ? (performed / total) * 100
                            : 0,
                };
            })
            .filter((r) => r.Year > 0 && r.Month >= 1 && r.Month <= 12);
    }

    private normalizeBacklog(raw: unknown): RecommendationBacklogRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Department: this.str(
                    r.DepartmentName ??
                        r.departmentName ??
                        r.Department ??
                        r.department,
                ),
                WaitingCount: this.num(r.WaitingCount ?? r.waitingCount),
                AvgWaitingDays: this.num(
                    r.AvgWaitingDays ?? r.avgWaitingDays,
                ),
                ScheduledCount: this.num(
                    r.ScheduledCount ?? r.scheduledCount,
                ),
                AvgDaysToSchedule: this.num(
                    r.AvgDaysToSchedule ?? r.avgDaysToSchedule,
                ),
            }))
            .filter((r) => !!r.Department);
    }

    private normalizeAging(raw: unknown): RecommendationAgingBucketRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                BucketName: this.str(r.BucketName ?? r.bucketName),
                CasesCount: this.num(r.CasesCount ?? r.casesCount),
            }))
            .filter((r) => !!r.BucketName);
    }
}
