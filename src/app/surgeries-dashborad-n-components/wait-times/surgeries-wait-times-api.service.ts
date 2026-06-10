import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, tap, timeout } from "rxjs/operators";
import { environment } from "src/environments/environment";
import {
    EmergencyReplacementRow,
    RecommendationAgingBucketRow,
    RecommendationBacklogRow,
    RecommendationDeptRow,
    RecommendationMonthRow,
    RecommendationMonthlyTrendRow,
    RecommendationProcedureRow,
    RecommendationYearRow,
} from "./surgeries-wait-times.models";

@Injectable({ providedIn: "root" })
export class SurgeriesWaitTimesApiService {
    private yearlyCache = new Map<string, RecommendationYearRow[]>();
    private monthlyCache = new Map<string, RecommendationMonthRow[]>();
    private deptCache = new Map<string, RecommendationDeptRow[]>();
    private procedureCache = new Map<string, RecommendationProcedureRow[]>();
    private doctorsCache = new Map<string, string[]>();
    private emergencyCache = new Map<string, EmergencyReplacementRow[]>();
    private monthlyTrendCache = new Map<
        string,
        RecommendationMonthlyTrendRow[]
    >();
    private backlogCache = new Map<string, RecommendationBacklogRow[]>();
    private agingCache = new Map<string, RecommendationAgingBucketRow[]>();

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
        this.doctorsCache.clear();
        this.emergencyCache.clear();
        this.monthlyTrendCache.clear();
        this.backlogCache.clear();
        this.agingCache.clear();
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

    /** חתך חודשי — כלל בית החולים או מחלקה ספציפית */
    getRecommendationsMonthly(
        department = "",
        forceRefresh = false,
    ): Observable<RecommendationMonthRow[]> {
        const dept = department?.trim() ?? "";
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

    /** רשימת רופאים ממליצים — GetRecommendationDoctorsList */
    getRecommendationDoctorsList(
        forceRefresh = false,
    ): Observable<string[]> {
        return this.getCachedOrFetch(
            this.doctorsCache,
            this.hospitalKey,
            forceRefresh,
            () =>
                this.http
                    .get<unknown>(
                        environment.url + "GetRecommendationDoctorsList",
                    )
                    .pipe(
                        map((r) => this.normalizeDoctors(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    /**
     * ניתוחים מומלצים נפוצים — GetTopRecommendedProcedures
     * @param doctor שם רופא ממליץ (ריק = כל הרופאים)
     */
    getTopRecommendedProcedures(
        doctor = "",
        forceRefresh = false,
    ): Observable<RecommendationProcedureRow[]> {
        const doc = doctor?.trim() ?? "";
        const key = doc || this.hospitalKey;
        return this.getCachedOrFetch(
            this.procedureCache,
            key,
            forceRefresh,
            () => {
                const options = doc
                    ? { params: new HttpParams().set("doctor", doc) }
                    : {};
                return this.http
                    .get<unknown>(
                        environment.url + "GetTopRecommendedProcedures",
                        options,
                    )
                    .pipe(
                        map((r) => this.normalizeProcedures(r)),
                        catchError(() => of([])),
                    );
            },
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

    private normalizeDept(raw: unknown): RecommendationDeptRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Department: this.str(
                    r.DepartmentName ??
                        r.departmentName ??
                        r.Department ??
                        r.department ??
                        r.UnitName ??
                        r.unitName,
                ),
                Count: this.num(
                    r.Recommendations ??
                        r.recommendations ??
                        r.Count ??
                        r.count,
                ),
            }))
            .filter((r) => !!r.Department);
    }

    private normalizeDoctors(raw: unknown): string[] {
        return this.unwrapArray(raw)
            .map((r: any) => {
                if (typeof r === "string") {
                    return this.str(r);
                }
                return this.str(
                    r.DoctorName ??
                        r.doctorName ??
                        r.RecommendingDoctor ??
                        r.recommendingDoctor ??
                        r.Name ??
                        r.name,
                );
            })
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "he"));
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
