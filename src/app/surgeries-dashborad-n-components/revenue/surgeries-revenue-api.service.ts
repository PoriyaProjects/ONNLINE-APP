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
    RevenueYtyMetrics,
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
            this.aggCache.has(
                this.cacheKey("agg", { ...params, groupBy: "site" }),
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

    private numOrNull(v: unknown): number | null {
        if (v == null || v === "") {
            return null;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    private buildYtyMetrics(
        currentAmount: number,
        prevAmount: number,
    ): RevenueYtyMetrics {
        const diff = currentAmount - prevAmount;
        let pct: number | null = null;
        if (prevAmount !== 0) {
            pct = (diff / prevAmount) * 100;
        } else if (currentAmount !== 0) {
            pct = null;
        } else {
            pct = 0;
        }
        return {
            PrevPeriodAmount: prevAmount,
            YTYDiff: diff,
            YTYPercent: pct,
        };
    }

    private readYtyFromRaw(
        raw: any,
        currentAmount: number,
        prevAmount: number,
    ): RevenueYtyMetrics {
        const fromApiPrev = this.numOrNull(
            raw?.PrevPeriodAmount ??
                raw?.prevPeriodAmount ??
                raw?.PrevYearAmount ??
                raw?.prevYearAmount ??
                raw?.PreviousAmount ??
                raw?.previousAmount,
        );
        const resolvedPrev = fromApiPrev ?? prevAmount;
        const fromApiDiff = this.numOrNull(
            raw?.YTYDiff ?? raw?.ytyDiff ?? raw?.Diff ?? raw?.diff,
        );
        const fromApiPct = this.numOrNull(
            raw?.TotalAmountYTY ??
                raw?.totalAmountYTY ??
                raw?.YTYPercent ??
                raw?.ytyPercent ??
                raw?.Pct ??
                raw?.pct ??
                raw?.ChangePercent ??
                raw?.changePercent,
        );

        if (fromApiDiff != null || fromApiPct != null || fromApiPrev != null) {
            const diff =
                fromApiDiff != null
                    ? fromApiDiff
                    : currentAmount - resolvedPrev;
            let pct = fromApiPct;
            if (pct == null && resolvedPrev !== 0) {
                pct = (diff / resolvedPrev) * 100;
            }
            return {
                PrevPeriodAmount: resolvedPrev,
                YTYDiff: diff,
                YTYPercent: pct,
            };
        }

        return this.buildYtyMetrics(currentAmount, prevAmount);
    }

    private enrichAggRowsWithYty(rows: RevenueAggRow[]): RevenueAggRow[] {
        const prevByGroupYear = new Map<string, number>();
        rows.forEach((row) => {
            prevByGroupYear.set(
                `${row.GroupKey}|${row.Year}`,
                row.TotalAmount,
            );
        });

        return rows.map((row) => {
            if (row.TotalAmountYTY != null) {
                return row;
            }
            const prevAmount =
                prevByGroupYear.get(`${row.GroupKey}|${row.Year - 1}`) ?? 0;
            const yty = this.buildYtyMetrics(row.TotalAmount, prevAmount);
            return { ...row, ...yty };
        });
    }

    private enrichMonthlyRowsWithYty(
        rows: RevenueMonthlyRow[],
    ): RevenueMonthlyRow[] {
        const prevByMonthYear = new Map<string, number>();
        rows.forEach((row) => {
            prevByMonthYear.set(`${row.Month}|${row.Year}`, row.TotalAmount);
        });

        return rows.map((row) => {
            if (row.TotalAmountYTY != null) {
                return row;
            }
            const prevAmount =
                prevByMonthYear.get(`${row.Month}|${row.Year - 1}`) ?? 0;
            const yty = this.buildYtyMetrics(row.TotalAmount, prevAmount);
            return { ...row, ...yty };
        });
    }

    private compositeStackPeriodKey(
        row: Pick<
            RevenueCompositeStackRow,
            "FundKey" | "PayerKey" | "BillingCategoryKey" | "Year"
        >,
    ): string {
        return `${row.FundKey}|${row.PayerKey}|${row.BillingCategoryKey}|${row.Year}`;
    }

    private enrichCompositeRowsWithYty(
        rows: RevenueCompositeStackRow[],
    ): RevenueCompositeStackRow[] {
        const prevByKey = new Map<string, number>();
        rows.forEach((row) => {
            prevByKey.set(this.compositeStackPeriodKey(row), row.TotalAmount);
        });

        return rows.map((row) => {
            if (row.TotalAmountYTY != null) {
                return row;
            }
            const prevKey = this.compositeStackPeriodKey({
                ...row,
                Year: row.Year - 1,
            });
            const prevAmount = prevByKey.get(prevKey) ?? 0;
            const yty = this.buildYtyMetrics(row.TotalAmount, prevAmount);
            return { ...row, ...yty };
        });
    }

    private str(v: unknown): string {
        return v != null ? String(v).trim() : "";
    }

    private normalizeAggRows(raw: unknown): RevenueAggRow[] {
        const rows = this.unwrapArray(raw).map((r: any) => {
            const totalAmount = this.num(r.TotalAmount ?? r.totalAmount);
            const year = this.num(r.Year ?? r.year);
            const groupKey = this.str(
                r.GroupKey ??
                    r.groupKey ??
                    r.Wing ??
                    r.wing ??
                    r.Site ??
                    r.site,
            );
            const prevAmount = this.num(
                r.PrevPeriodAmount ??
                    r.prevPeriodAmount ??
                    r.PrevYearAmount ??
                    r.prevYearAmount ??
                    0,
            );
            const totalAmountYty = this.numOrNull(
                r.TotalAmountYTY ?? r.totalAmountYTY,
            );
            const yty = this.readYtyFromRaw(r, totalAmount, prevAmount);
            return {
                Year: year,
                GroupKey: groupKey,
                TotalAmount: totalAmount,
                SurgeryCount: this.num(r.SurgeryCount ?? r.surgeryCount),
                InvoiceCount: this.num(r.InvoiceCount ?? r.invoiceCount),
                AvgAmount: this.num(r.AvgAmount ?? r.avgAmount),
                TotalAmountYTY: totalAmountYty,
                ...yty,
                ...(totalAmountYty != null ? { YTYPercent: totalAmountYty } : {}),
            };
        });
        return this.enrichAggRowsWithYty(rows);
    }

    private normalizeCompositeRows(raw: unknown): RevenueCompositeStackRow[] {
        const rows = this.unwrapArray(raw).map((r: any) => {
            const totalAmount = this.num(r.TotalAmount ?? r.totalAmount);
            const prevAmount = this.num(
                r.PrevPeriodAmount ??
                    r.prevPeriodAmount ??
                    r.PrevYearAmount ??
                    r.prevYearAmount ??
                    0,
            );
            const totalAmountYty = this.numOrNull(
                r.TotalAmountYTY ?? r.totalAmountYTY,
            );
            const yty = this.readYtyFromRaw(r, totalAmount, prevAmount);
            return {
                Year: this.num(r.Year ?? r.year),
                FundKey: this.str(
                    r.FundKey ??
                        r.fundKey ??
                        r.HospitalFund ??
                        r.hospitalFund ??
                        r.קרן,
                ),
                PayerKey: this.str(
                    r.PayerKey ?? r.payerKey ?? r.Payer ?? r.payer,
                ),
                BillingCategoryKey: this.str(
                    r.BillingCategoryKey ??
                        r.billingCategoryKey ??
                        r.BillingCategory ??
                        r.billingCategory ??
                        r.קטגורית_חיוב,
                ),
                TotalAmount: totalAmount,
                TotalAmountYTY: totalAmountYty,
                ...yty,
                ...(totalAmountYty != null ? { YTYPercent: totalAmountYty } : {}),
            };
        });
        return this.enrichCompositeRowsWithYty(rows);
    }

    private normalizeMonthlyRows(raw: unknown): RevenueMonthlyRow[] {
        const rows = this.unwrapArray(raw).map((r: any) => {
            const totalAmount = this.num(r.TotalAmount ?? r.totalAmount);
            const prevAmount = this.num(
                r.PrevPeriodAmount ??
                    r.prevPeriodAmount ??
                    r.PrevYearAmount ??
                    r.prevYearAmount ??
                    0,
            );
            const totalAmountYty = this.numOrNull(
                r.TotalAmountYTY ?? r.totalAmountYTY,
            );
            const yty = this.readYtyFromRaw(r, totalAmount, prevAmount);
            return {
                Year: this.num(r.Year ?? r.year),
                Month: this.num(r.Month ?? r.month),
                TotalAmount: totalAmount,
                SurgeryCount: this.num(r.SurgeryCount ?? r.surgeryCount),
                AvgAmount: this.num(r.AvgAmount ?? r.avgAmount),
                TotalAmountYTY: totalAmountYty,
                ...yty,
                ...(totalAmountYty != null ? { YTYPercent: totalAmountYty } : {}),
            };
        });
        return this.enrichMonthlyRowsWithYty(rows);
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
