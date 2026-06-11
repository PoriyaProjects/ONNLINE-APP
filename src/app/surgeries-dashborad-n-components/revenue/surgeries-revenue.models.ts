/** Query filters shared by all revenue dashboard endpoints */
export interface SurgeriesRevenueFilterParams {
    baseYear: string;
    groupBy?: RevenueGroupBy;
    department?: string;
    billingDepartment?: string;
    surgeryType?: string;
    shift?: string;
    site?: string;
    weekend?: string;
    payer?: string;
}

export type RevenueGroupBy =
    | "wing"
    | "billingDept"
    | "payer"
    | "surgeryType"
    | "site"
    | "procedure";

/** תקופה מול תקופה — שנה קודמת (YTY) */
export interface RevenueYtyMetrics {
    PrevPeriodAmount: number;
    YTYDiff: number;
    YTYPercent: number | null;
    /** אחוז YTY מהשרת — TotalAmountYTY (מועדף לכרטיסי שנה) */
    TotalAmountYTY?: number | null;
}

/** Aggregated revenue row — GetRevenueByDeptFiveYears_surgeries_revenue_dashborad */
export interface RevenueAggRow extends RevenueYtyMetrics {
    Year: number;
    GroupKey: string;
    TotalAmount: number;
    SurgeryCount: number;
    InvoiceCount: number;
    AvgAmount: number;
}

/** Monthly revenue row — GetRevenueByMonth_surgeries_revenue_dashborad */
export interface RevenueMonthlyRow extends RevenueYtyMetrics {
    Year: number;
    Month: number;
    TotalAmount: number;
    SurgeryCount: number;
    AvgAmount: number;
}

/** Filter dropdown options — GetRevenueFilterOptions_surgeries_revenue_dashborad */
export interface RevenueFilterOptionsDto {
    wings: string[];
    billingDepartments: string[];
    surgeryTypes: string[];
    shifts: string[];
    sites: string[];
    payers: string[];
}

/** Table row built client-side from aggregated data */
export interface RevenueTableRow {
    label: string;
    perYear: { [year: number]: number };
    total: number;
    diff: number | null;
    pct: number | null;
    isFuture?: boolean;
}

export type RevenueMainMetric =
    | "byDept"
    | "byPayer"
    | "bySurgeryType"
    | "byServiceType"
    | "byBillingCategory";
export type RevenueChartViewMode =
    | "year-total"
    | "year-grouped"
    | "month";

/** שורת ערימה — GetRevenueStackedComposite_surgeries_revenue_dashborad */
export interface RevenueCompositeStackRow extends RevenueYtyMetrics {
    Year: number;
    FundKey: string;
    PayerKey: string;
    BillingCategoryKey: string;
    TotalAmount: number;
}
