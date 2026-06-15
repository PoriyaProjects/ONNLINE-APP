import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map, switchMap, tap, timeout } from "rxjs/operators";
import { environment } from "src/environments/environment";
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
} from "./surgeries-wait-times.models";
import {
    defaultSurgeryDepartmentOptions,
    DepartmentFilterOption,
    isValidSurgeryDepartmentValue,
} from "./surgery-department-contract";

@Injectable({ providedIn: "root" })
export class SurgeriesWaitTimesApiService {
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
    private doctorRecommendationCache = new Map<
        string,
        RecommendationDoctorCountRow[]
    >();
    private departmentOptionsCache: DepartmentFilterOption[] | null = null;

    /** סינון קבוע לניתוחים אלקטיביים — בוקר, אמצע שבוע (נשלח לשרת) */
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
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationsYearly",
                    )
                    .pipe(
                        map((r) => this.normalizeYearly(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /** חתך חודשי — department = ערך [מנתחת מאוגד] (מזהה פנימי, לא label). */
    getRecommendationsMonthly(
        department = "",
        forceRefresh = false,
    ): Observable<RecommendationMonthRow[]> {
        const dept = department?.trim() ?? "";
        if (dept && !isValidSurgeryDepartmentValue(dept)) {
            return of([]);
        }
        const key = dept || this.hospitalKey;
        return this.getCachedOrFetch(
            this.monthlyCache,
            key,
            forceRefresh,
            () => {
                const endpoint = dept
                    ? environment.url +
                      "GetDepartmentMonthlyRecommendations"
                    : environment.url + "GetRecommendationsMonthly";
                const options = dept
                    ? {
                          params: new HttpParams().set("department", dept),
                      }
                    : {};
                return this.http.get<unknown>(endpoint, options).pipe(
                    map((r) => this.normalizeMonthly(r)),
                    catchError(() => of([])),
                );
            },
        );
    }

    /**
     * אפשרויות סינון מחלקה — { label, value } מ-API קיימים בלבד.
     * ערכים מ-GetSurgeriesByDepartment_surgeries_dashborad; תוויות מ-GetRecommendationsByDepartment.
     */
    getSurgeryDepartmentOptions(
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
                opts.length ? opts : defaultSurgeryDepartmentOptions(),
            ),
            tap((opts) => {
                this.departmentOptionsCache = opts;
            }),
            catchError(() => {
                const fallback = defaultSurgeryDepartmentOptions();
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
            const value = (r.DepartmentValue || "").trim();
            const label = (r.Department || "").trim();
            if (value && label && isValidSurgeryDepartmentValue(value)) {
                labelByValue.set(value, label);
            }
        }

        const seen = new Set<string>();
        const out: DepartmentFilterOption[] = [];
        for (const r of surgeryRows) {
            const value = (r.Department || "").trim();
            if (!value || !isValidSurgeryDepartmentValue(value) || seen.has(value)) {
                continue;
            }
            seen.add(value);
            out.push({ label: labelByValue.get(value) || value, value });
        }

        if (out.length === 0) {
            for (const r of recommendationRows) {
                const value = (r.DepartmentValue || "").trim();
                if (!value || !isValidSurgeryDepartmentValue(value) || seen.has(value)) {
                    continue;
                }
                seen.add(value);
                out.push({
                    label: (r.Department || "").trim() || value,
                    value,
                });
            }
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
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationsByDepartment",
                    )
                    .pipe(
                        map((r) => this.normalizeDept(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * המלצות לפי רופא ממליץ — GetRecommendationsByDoctor
     * (מנסה מספר שמות endpoint; אופציונלי baseYear לפירוט שנתי).
     */
    getRecommendationsByDoctor(
        baseYear?: number,
        forceRefresh = false,
    ): Observable<RecommendationDoctorCountRow[]> {
        const key =
            baseYear != null && baseYear > 0
                ? String(baseYear)
                : this.hospitalKey;
        return this.getCachedOrFetch(
            this.doctorRecommendationCache,
            key,
            forceRefresh,
            () => this.fetchRecommendationsByDoctorFromServer(baseYear),
        );
    }

    private fetchRecommendationsByDoctorFromServer(
        baseYear?: number,
    ): Observable<RecommendationDoctorCountRow[]> {
        const endpoints = [
            "GetRecommendationsByDoctor",
            "GetRecommendationsByRecommendingDoctor",
        ];
        return this.fetchRecommendationsByDoctorFromEndpoint(
            endpoints,
            0,
            baseYear,
        );
    }

    private fetchRecommendationsByDoctorFromEndpoint(
        endpoints: string[],
        index: number,
        baseYear?: number,
    ): Observable<RecommendationDoctorCountRow[]> {
        if (index >= endpoints.length) {
            return of([]);
        }
        const name = endpoints[index];
        const options =
            baseYear != null && baseYear > 0
                ? {
                      params: new HttpParams().set(
                          "baseYear",
                          String(baseYear),
                      ),
                  }
                : {};
        return this.http.get<unknown>(environment.url + name, options).pipe(
            map((r) => this.normalizeDoctorRecommendations(r)),
            switchMap((rows) =>
                rows.length
                    ? of(rows)
                    : this.fetchRecommendationsByDoctorFromEndpoint(
                          endpoints,
                          index + 1,
                          baseYear,
                      ),
            ),
            catchError(() =>
                this.fetchRecommendationsByDoctorFromEndpoint(
                    endpoints,
                    index + 1,
                    baseYear,
                ),
            ),
        );
    }

    getTopRecommendedProcedures(
        forceRefresh = false,
    ): Observable<RecommendationProcedureRow[]> {
        return this.getCachedOrFetch(
            this.procedureCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.http
                    .get<unknown>(
                        environment.url + "GetTopRecommendedProcedures",
                    )
                    .pipe(
                        map((r) => this.normalizeProcedures(r)),
                        catchError(() => of([])),
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
                this.http
                    .get<unknown>(
                        environment.url + "GetEmergencyReplacementAnalysis",
                    )
                    .pipe(
                        map((r) => this.normalizeEmergency(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * מגמת המרה חודשית — GetRecommendationMonthlyTrend
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
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationMonthlyTrend",
                    )
                    .pipe(
                        map((r) => this.normalizeMonthlyTrend(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * מצבת ממתינים לפי מחלקה — GetRecommendationBacklog
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
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationBacklog",
                    )
                    .pipe(
                        map((r) => this.normalizeBacklog(r)),
                        timeout(this.analyticsTimeoutMs),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * התיישנות ההמתנה לפי טווחי ימים — GetRecommendationAgingBuckets
     * שדות: BucketName, CasesCount
     */
    /**
     * ניתוחים שבוצעו לפי חודש — GetMonthlyCounts_surgeries_dashborad
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
        if (dept && !isValidSurgeryDepartmentValue(dept)) {
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
                let params = new HttpParams()
                    .set("baseYear", String(baseYear))
                    .set("surgeryType", p.surgeryType)
                    .set("shift", p.shift)
                    .set("site", p.site)
                    .set("weekend", p.weekend)
                    .set("morningWork", p.morningWork)
                    .set("rooms", p.rooms);
                if (dept) {
                    params = params.set("department", dept);
                }
                return this.http
                    .get<unknown>(
                        environment.url +
                            "GetMonthlyCounts_surgeries_dashborad",
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
     * ניתוחים שבוצעו לפי מחלקה ושנה — GetSurgeriesByDepartment_surgeries_dashborad
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
                this.http
                    .get<unknown>(
                        environment.url +
                            "GetSurgeriesByDepartment_surgeries_dashborad",
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

    /** מצטבר ניתוחים שבוצעו לפי [מנתחת מאוגד] לשנה נתונה. */
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
     * ניתוחים שבוצעו לפי רופא ושנה — GetSurgeriesByDoctor_surgeries_dashborad
     * (סינון אלקטיבי / בוקר / אמצע שבוע נשלח לשרת).
     */
    getSurgeriesByDoctor(
        baseYear: number,
        forceRefresh = false,
    ): Observable<SurgeryCountByDoctorRow[]> {
        const p = this.electiveMorningSurgeryParams;
        const key = [
            baseYear,
            p.surgeryType,
            p.shift,
            p.weekend,
        ].join("|");
        return this.getCachedOrFetch(
            this.surgeryDoctorCache,
            key,
            forceRefresh,
            () =>
                this.http
                    .get<unknown>(
                        environment.url +
                            "GetSurgeriesByDoctor_surgeries_dashborad",
                        { params: this.buildSurgeryDashboardParams(baseYear) },
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
        forceRefresh = false,
    ): Observable<SurgeryCountByDoctorRow[]> {
        return this.getSurgeriesByDoctor(baseYear, forceRefresh);
    }

    /** מצטבר ניתוחים שבוצעו לפי רופא (סכום לכל השנים בחלון). */
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
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationAgingBuckets",
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
        let data: unknown = raw;
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
                        r.Count ??
                        r.count,
                ),
            }))
            .filter((r) => r.Year > 0);
    }

    private normalizeSurgeryMonthly(raw: unknown): SurgeryMonthRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year),
                Month: this.num(r.Month ?? r.month),
                Count: this.num(r.Count ?? r.count),
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
                Count: this.num(r.Count ?? r.count),
            }))
            .filter((r) => r.Year > 0 && !!r.Department);
    }

    private buildSurgeryDashboardParams(baseYear: number): HttpParams {
        const p = this.electiveMorningSurgeryParams;
        return new HttpParams()
            .set("baseYear", String(baseYear))
            .set("surgeryType", p.surgeryType)
            .set("shift", p.shift)
            .set("site", p.site)
            .set("weekend", p.weekend)
            .set("morningWork", p.morningWork)
            .set("rooms", p.rooms);
    }

    /** @deprecated legacy GetCountByDept shape */
    private normalizeSurgeryDept(raw: unknown): SurgeryCountByDeptRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year),
                Site: this.str(r.Site ?? r.site),
                Department: this.str(r.Department ?? r.department),
                Wing: this.str(r.Wing ?? r.wing),
                Count: this.num(r.Count ?? r.count),
                UnifiedSurgeryType: this.str(
                    r.UnifiedSurgeryType ?? r.unifiedSurgeryType,
                ),
                Shift: this.str(r.Shift ?? r.shift),
                WeekPart: this.str(r.WeekPart ?? r.weekPart),
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
                const departmentValue = this.str(
                    r.DepartmentValue ??
                        r.departmentValue ??
                        r.Wing ??
                        r.wing ??
                        r.SurgeryDepartment ??
                        r.surgeryDepartment ??
                        r["מנתחת מאוגד"],
                );
                return {
                    Department: this.str(
                        r.DepartmentName ??
                            r.departmentName ??
                            r.Department ??
                            r.department ??
                            r.UnitName ??
                            r.unitName ??
                            r.Label ??
                            r.label,
                    ),
                    Count: this.num(
                        r.Recommendations ??
                            r.recommendations ??
                            r.Count ??
                            r.count,
                    ),
                    DepartmentValue:
                        departmentValue &&
                        isValidSurgeryDepartmentValue(departmentValue)
                            ? departmentValue
                            : undefined,
                    Year: (() => {
                        const y = this.num(r.Year ?? r.year ?? r.yr);
                        return y > 0 ? y : undefined;
                    })(),
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
