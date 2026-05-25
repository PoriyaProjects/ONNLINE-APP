import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { environment } from "src/environments/environment";
import {
    RevenueAggRow,
    RevenueCompositeStackRow,
    RevenueFilterOptionsDto,
    RevenueGroupBy,
    RevenueMonthlyRow,
    SurgeriesRevenueFilterParams,
} from "./surgeries-revenue.models";

@Injectable({ providedIn: "root" })
export class SurgeriesRevenueApiService {
    private filterOptionsCache: RevenueFilterOptionsDto | null = null;
    private aggCache = new Map<string, RevenueAggRow[]>();
    private monthlyCache = new Map<string, RevenueMonthlyRow[]>();
    private compositeCache = new Map<string, RevenueCompositeStackRow[]>();

    constructor(private http: HttpClient) {}

    /** Clears all locally cached API responses (explicit refresh only). */
    clearCache(): void {
        this.filterOptionsCache = null;
        this.aggCache.clear();
        this.monthlyCache.clear();
        this.compositeCache.clear();
    }

    hasFilterOptionsCache(): boolean {
        return this.filterOptionsCache != null;
    }

    isRevenueBundleCached(params: SurgeriesRevenueFilterParams): boolean {
        return (
            this.aggCache.has(this.cacheKey("agg", params)) &&
            this.monthlyCache.has(this.cacheKey("month", params)) &&
            this.aggCache.has(
                this.cacheKey("agg", { ...params, groupBy: "billingDept" }),
            ) &&
            this.aggCache.has(
                this.cacheKey("agg", { ...params, groupBy: "payer" }),
            ) &&
            this.compositeCache.has(this.cacheKey("composite", params))
        );
    }

    getRevenueByGroupFiveYears(
        params: SurgeriesRevenueFilterParams,
        groupBy: RevenueGroupBy,
        forceRefresh = false,
    ): Observable<RevenueAggRow[]> {
        return this.getRevenueByDeptFiveYears(
            { ...params, groupBy },
            forceRefresh,
        );
    }

    /** קרן/ביה"ח × גורם משלם × קטגורית חיוב — endpoint יופעל בשרת */
    getRevenueCompositeStack(
        params: SurgeriesRevenueFilterParams,
        forceRefresh = false,
    ): Observable<RevenueCompositeStackRow[]> {
        const key = this.cacheKey("composite", params);
        return this.getCachedOrFetch(
            this.compositeCache,
            key,
            forceRefresh,
            () =>
                this.http
                    .get<unknown>(
                        environment.url +
                            "GetRevenueStackedComposite_surgeries_revenue_dashborad",
                        { params: this.toHttpParams(params) },
                    )
                    .pipe(
                        map((r) => this.normalizeCompositeRows(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    getFilterOptions(forceRefresh = false): Observable<RevenueFilterOptionsDto> {
        if (!forceRefresh && this.filterOptionsCache) {
            return of(this.filterOptionsCache);
        }
        return this.http
            .get<unknown>(
                environment.url +
                    "GetRevenueFilterOptions_surgeries_revenue_dashborad",
            )
            .pipe(
                map((r) => this.normalizeFilterOptions(r)),
                tap((opts) => {
                    this.filterOptionsCache = opts;
                }),
                catchError(() => of(this.emptyFilterOptions())),
            );
    }

    getRevenueByDeptFiveYears(
        params: SurgeriesRevenueFilterParams,
        forceRefresh = false,
    ): Observable<RevenueAggRow[]> {
        const key = this.cacheKey("agg", params);
        return this.getCachedOrFetch(this.aggCache, key, forceRefresh, () =>
            this.http
                .get<unknown>(
                    environment.url +
                        "GetRevenueByDeptFiveYears_surgeries_revenue_dashborad",
                    { params: this.toHttpParams(params) },
                )
                .pipe(
                    map((r) => this.normalizeAggRows(r)),
                    catchError(() => of([])),
                ),
        );
    }

    getRevenueByMonth(
        params: SurgeriesRevenueFilterParams,
        forceRefresh = false,
    ): Observable<RevenueMonthlyRow[]> {
        const key = this.cacheKey("month", params);
        const monthlyParams = { ...params };
        delete monthlyParams.groupBy;
        return this.getCachedOrFetch(this.monthlyCache, key, forceRefresh, () =>
            this.http
                .get<unknown>(
                    environment.url +
                        "GetRevenueByMonth_surgeries_revenue_dashborad",
                    { params: this.toHttpParams(monthlyParams) },
                )
                .pipe(
                    map((r) => this.normalizeMonthlyRows(r)),
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

    private cacheKey(prefix: string, params: SurgeriesRevenueFilterParams): string {
        const entries = this.filterParamEntries(params);
        const sorted = Object.keys(entries)
            .sort()
            .map((k) => `${k}=${entries[k]}`)
            .join("|");
        return `${prefix}:${sorted}`;
    }

    private filterParamEntries(
        params: SurgeriesRevenueFilterParams,
    ): Record<string, string> {
        return {
            baseYear: params.baseYear ?? "",
            groupBy: params.groupBy ?? "wing",
            department: params.department ?? "",
            billingDepartment: params.billingDepartment ?? "",
            surgeryType: params.surgeryType ?? "",
            shift: params.shift ?? "",
            site: params.site ?? "",
            weekend: params.weekend ?? "",
            payer: params.payer ?? "",
        };
    }

    private toHttpParams(params: SurgeriesRevenueFilterParams): HttpParams {
        let hp = new HttpParams();
        for (const [k, v] of Object.entries(this.filterParamEntries(params))) {
            hp = hp.set(k, v);
        }
        return hp;
    }

    private unwrapArray(raw: unknown): unknown[] {
        let data: unknown = raw;
        if (data && typeof data === "object" && (data as { d?: unknown }).d != null) {
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
        // WriteJsonResponse may wrap a single object on some hosts
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

    private normalizeAggRows(raw: unknown): RevenueAggRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Year: this.num(r.Year ?? r.year),
            GroupKey: this.str(r.GroupKey ?? r.groupKey ?? r.Wing ?? r.wing),
            TotalAmount: this.num(r.TotalAmount ?? r.totalAmount),
            SurgeryCount: this.num(r.SurgeryCount ?? r.surgeryCount),
            InvoiceCount: this.num(r.InvoiceCount ?? r.invoiceCount),
            AvgAmount: this.num(r.AvgAmount ?? r.avgAmount),
        }));
    }

    private normalizeCompositeRows(raw: unknown): RevenueCompositeStackRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Year: this.num(r.Year ?? r.year),
            FundKey: this.str(
                r.FundKey ??
                    r.fundKey ??
                    r.HospitalFund ??
                    r.hospitalFund ??
                    r.קרן,
            ),
            PayerKey: this.str(r.PayerKey ?? r.payerKey ?? r.Payer ?? r.payer),
            BillingCategoryKey: this.str(
                r.BillingCategoryKey ??
                    r.billingCategoryKey ??
                    r.BillingCategory ??
                    r.billingCategory ??
                    r.קטגורית_חיוב,
            ),
            TotalAmount: this.num(r.TotalAmount ?? r.totalAmount),
        }));
    }

    private normalizeMonthlyRows(raw: unknown): RevenueMonthlyRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Year: this.num(r.Year ?? r.year),
            Month: this.num(r.Month ?? r.month),
            TotalAmount: this.num(r.TotalAmount ?? r.totalAmount),
            SurgeryCount: this.num(r.SurgeryCount ?? r.surgeryCount),
            AvgAmount: this.num(r.AvgAmount ?? r.avgAmount),
        }));
    }

    private normalizeFilterOptions(raw: unknown): RevenueFilterOptionsDto {
        let data: any = raw;
        if (data && typeof data === "object" && data.d != null) {
            data = data.d;
        }
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                data = {};
            }
        }
        const pick = (key: string, alt: string) => {
            const arr = data?.[key] ?? data?.[alt];
            return Array.isArray(arr) ? arr.map((x) => this.str(x)).filter(Boolean) : [];
        };
        return {
            wings: pick("wings", "Wings"),
            billingDepartments: pick("billingDepartments", "BillingDepartments"),
            surgeryTypes: pick("surgeryTypes", "SurgeryTypes"),
            shifts: pick("shifts", "Shifts"),
            sites: pick("sites", "Sites"),
            payers: pick("payers", "Payers"),
        };
    }

    private emptyFilterOptions(): RevenueFilterOptionsDto {
        return {
            wings: [],
            billingDepartments: [],
            surgeryTypes: [],
            shifts: [],
            sites: [],
            payers: [],
        };
    }
}
