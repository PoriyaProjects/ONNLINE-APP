import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { parseAsmxPayload } from "../../utils/pci-asmx.util";
import {
    CancellationFilterParams,
    CancellationMonthRow,
    CancellationReasonDeptRow,
    CancellationReasonRow,
    CancellationYearRow,
    RoomOutcomeRow,
} from "./pci-cancellations.models";

@Injectable({ providedIn: "root" })
export class PciCancellationsApiService {
    private yearlyCache = new Map<string, CancellationYearRow[]>();
    private monthlyCache = new Map<string, CancellationMonthRow[]>();
    private reasonsCache = new Map<string, CancellationReasonRow[]>();
    private reasonsByDeptCache = new Map<string, CancellationReasonDeptRow[]>();
    private roomOutcomeCache = new Map<string, RoomOutcomeRow[]>();

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
        this.reasonsCache.clear();
        this.reasonsByDeptCache.clear();
        this.roomOutcomeCache.clear();
    }

    isBundleCached(params: CancellationFilterParams): boolean {
        const key = this.cacheKey(params);
        return (
            this.yearlyCache.has(key) &&
            this.monthlyCache.has(key) &&
            this.reasonsCache.has(key) &&
            this.reasonsByDeptCache.has(key) &&
            this.roomOutcomeCache.has(key)
        );
    }

    getCancellationsYearly(
        params: CancellationFilterParams,
        forceRefresh = false,
    ): Observable<CancellationYearRow[]> {
        return this.getCachedOrFetch(
            this.yearlyCache,
            this.cacheKey(params),
            forceRefresh,
            () =>
                this.asmxGet(environment.url + "GetCancellationsYearly_pci_dashborad", {
                        params: this.toHttpParams(params),
                    })
                    .pipe(
                        map((r) => this.normalizeYearly(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    getCancellationsMonthly(
        params: CancellationFilterParams,
        forceRefresh = false,
    ): Observable<CancellationMonthRow[]> {
        return this.getCachedOrFetch(
            this.monthlyCache,
            this.cacheKey(params),
            forceRefresh,
            () =>
                this.asmxGet(environment.url + "GetCancellationsMonthly_pci_dashborad", {
                        params: this.toHttpParams(params),
                    })
                    .pipe(
                        map((r) => this.normalizeMonthly(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    getTopCancellationReasons(
        params: CancellationFilterParams,
        forceRefresh = false,
    ): Observable<CancellationReasonRow[]> {
        return this.getCachedOrFetch(
            this.reasonsCache,
            this.cacheKey(params),
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url + "GetTopCancellationReasons_pci_dashborad",
                        { params: this.toHttpParams(params) },
                    )
                    .pipe(
                        map((r) => this.normalizeReasons(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    getCancellationReasonsByDepartment(
        params: CancellationFilterParams,
        forceRefresh = false,
    ): Observable<CancellationReasonDeptRow[]> {
        return this.getCachedOrFetch(
            this.reasonsByDeptCache,
            this.cacheKey(params),
            forceRefresh,
            () =>
                this.asmxGet(
                        environment.url +
                            "GetCancellationReasonsByDepartment_pci_dashborad",
                        { params: this.toHttpParams(params) },
                    )
                    .pipe(
                        map((r) => this.normalizeReasonsByDept(r)),
                        catchError(() => of([])),
                    ),
        );
    }

    getRoomOutcome(
        params: CancellationFilterParams,
        forceRefresh = false,
    ): Observable<RoomOutcomeRow[]> {
        return this.getCachedOrFetch(
            this.roomOutcomeCache,
            this.cacheKey(params),
            forceRefresh,
            () =>
                this.asmxGet(environment.url + "GetRoomOutcome_pci_dashborad", {
                        params: this.toHttpParams(params),
                    })
                    .pipe(
                        map((r) => this.normalizeRoomOutcome(r)),
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

    private cacheKey(params: CancellationFilterParams): string {
        return `${params.baseYear ?? ""}|${params.department ?? ""}`;
    }

    private toHttpParams(params: CancellationFilterParams): HttpParams {
        return new HttpParams()
            .set("baseYear", params.baseYear ?? "")
            .set("department", params.department ?? "");
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

    private normalizeYearly(raw: unknown): CancellationYearRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Count: this.num(r.Count ?? r.count ?? r.cnt),
            }))
            .filter((r) => r.Year > 0);
    }

    private normalizeMonthly(raw: unknown): CancellationMonthRow[] {
        return this.unwrapArray(raw)
            .map((r: any) => ({
                Year: this.num(r.Year ?? r.year ?? r.yr),
                Month: this.num(r.Month ?? r.month ?? r.mn),
                Count: this.num(r.Count ?? r.count ?? r.cnt),
            }))
            .filter((r) => r.Year > 0 && r.Month >= 1 && r.Month <= 12);
    }

    private normalizeReasons(raw: unknown): CancellationReasonRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Reason: this.str(r.Reason ?? r.reason),
            Count: this.num(r.Count ?? r.count ?? r.cnt),
        }));
    }

    private normalizeReasonsByDept(
        raw: unknown,
    ): CancellationReasonDeptRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Department: this.str(r.Department ?? r.department ?? r.Dept ?? r.dept),
            Reason: this.str(r.Reason ?? r.reason),
            Count: this.num(r.Count ?? r.count ?? r.cnt),
        }));
    }

    private normalizeRoomOutcome(raw: unknown): RoomOutcomeRow[] {
        return this.unwrapArray(raw).map((r: any) => ({
            Outcome: this.str(r.Outcome ?? r.outcome),
            Count: this.num(r.Count ?? r.count ?? r.cnt),
        }));
    }
}
