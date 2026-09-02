/** מסננים משותפים */
export interface RecommendationFilterParams {
    baseYear: string;
    /** ערך [מנתחת מאוגד] — מזהה פנימי, לא שם תצוגה */
    department?: string;
}

export type { DepartmentFilterOption } from "./pci-department-contract";

/** תצוגות הגרף בדשבורד המלצות לצינתור */
export type RecommendationView =
    | "yearly"
    | "monthly"
    | "byDept"
    | "byDoctor"
    | "procedures"
    | "conversion"
    | "waitTimes"
    | "aging";

/** מדדי תקופה מול תקופה (YTY) — חישוב צד-לקוח */
export interface RecommendationYty {
    diff: number;
    pct: number | null;
}

/** מספר המלצות שנתי — GetRecommendationsYearly */
export interface RecommendationYearRow {
    Year: number;
    Count: number;
}

/** מספר המלצות חודשי — GetRecommendationsMonthly / GetDepartmentMonthlyRecommendations */
export interface RecommendationMonthRow {
    Year: number;
    Month: number;
    Count: number;
}

/** צינתורים שבוצעו לפי חודש — GetMonthlyCounts_pci_dashborad */
export interface SurgeryMonthRow {
    Year: number;
    Month: number;
    Count: number;
}

/** המלצות לפי מחלקה — GetRecommendationsByDepartment (שורות מפורטות) */
export interface RecommendationDeptRow {
    /** שם תצוגה (UnitName / מחלקה מפנה) */
    Department: string;
    Count: number;
    /** ערך [מנתחת מאוגד] מהשרת — לספירת צינתורים (department=value) */
    DepartmentValue?: string;
    Year?: number;
    Month?: number;
    DoctorName?: string;
}

/** שורה — GetCountByDept_pci_dashborad */
export interface SurgeryCountByDeptRow {
    Year: number;
    Site: string;
    Department: string;
    Wing: string;
    Doctor?: string;
    Count: number;
    MatchCount?: number;
    MismatchCount?: number;
    UnifiedSurgeryType?: string;
    Shift?: string;
    SurgeryRoom?: string;
    WeekPart?: string;
    FundType?: string;
    Month?: number;
}

/** צינתורים שבוצעו לפי מחלקה ושנה — GetSurgeriesByDepartment_pci_dashborad */
export interface SurgeryByDepartmentRow {
    Year: number;
    /** ערך [מנתחת מאוגד] */
    Department: string;
    Count: number;
}

/** סיכום צינתורים שבוצעו לפי מחלקה (אחרי סינון בוקר / אמצע שבוע / אלקטיבי) */
export interface SurgeryDeptAggregateRow {
    Department: string;
    Count: number;
}

/** שורה — GetSurgeriesByDoctor_pci_dashborad / GetCountByDoctor_pci_dashborad */
export interface SurgeryCountByDoctorRow {
    Year: number;
    DoctorName: string;
    Count: number;
}

/** סיכום צינתורים שבוצעו לפי רופא */
export interface SurgeryDoctorAggregateRow {
    DoctorName: string;
    Count: number;
}

/** המלצות לפי רופא ממליץ — GetRecommendationsByDoctor */
export interface RecommendationDoctorCountRow {
    Doctor: string;
    Count: number;
    /** אם השרת מחזיר פירוט שנתי */
    Year?: number;
}

/** הצינתורים המומלצים הנפוצים — GetTopRecommendedProcedures */
export interface RecommendationProcedureRow {
    Procedure: string;
    Count: number;
}

/** האם נכנס צינתור דחוף במקום מבוטל — GetEmergencyReplacementAnalysis */
export interface EmergencyReplacementRow {
    Department: string;
    CancelledCount: number;
    EmergencyReplacedCount: number;
    EmergencyReplacementRate: number;
}

/**
 * מגמת המרה חודשית — GetRecommendationMonthlyTrend
 * מתוך ההמלצות שניתנו בחודש — כמה מהן בוצעו בפועל (12 חודשים אחרונים).
 */
export interface RecommendationMonthlyTrendRow {
    Year: number;
    Month: number;
    /** המלצות שניתנו */
    RecommendedCount: number;
    /** מתוכן — בוצעו בפועל */
    PerformedCount: number;
    /** אחוז המרה (PerformedCount / RecommendedCount) */
    ConversionRate: number;
    /** סך כל הצינתורים שבוצעו באותו חודש (לא רק מומלצים) — אופציונלי */
    TotalSurgeries?: number;
    /** אחוז הצינתורים שבוצעו שמקורם בהמלצה (PerformedCount / TotalSurgeries) — אופציונלי */
    RecommendedShareOfPerformed?: number;
}

/**
 * מצבת ממתינים — GetRecommendationBacklog
 * מטופלים שסומנו "מומלץ לצינתור" וטרם בוצע להם צינתור, לפי מחלקה.
 */
export interface RecommendationBacklogRow {
    Department: string;
    /** מספר ממתינים פעילים */
    WaitingCount: number;
    /** ממוצע ימי המתנה עד היום */
    AvgWaitingDays: number;
    /** מתוך הממתינים — כמה כבר נקבע להם תאריך לצינתור — אופציונלי */
    ScheduledCount?: number;
    /** ממוצע ימים מההמלצה ועד קביעת התור לצינתור — אופציונלי */
    AvgDaysToSchedule?: number;
}

/**
 * התיישנות ההמתנה — GetRecommendationAgingBuckets
 * התפלגות הממתינים לפי טווחי ימי המתנה.
 */
export interface RecommendationAgingBucketRow {
    BucketName: string;
    CasesCount: number;
}

/** שורת טבלה גנרית הנבנית בצד-לקוח */
export interface RecommendationTableRow {
    label: string;
    /** ערכים לפי שנה — לתצוגות שנתי/חודשי */
    perYear?: { [year: number]: number };
    /** ערך בודד — לתצוגות מחלקה/צינתור/דחוף */
    count?: number;
    /** אחוז מסך הכל — לתצוגות מחלקה/צינתור/דחוף */
    pctOfTotal?: number;
    total?: number;
    diff?: number | null;
    pct?: number | null;
    /** ערך משני — לתצוגת השוואה לפי מחלקה (צינתורים שבוצעו) */
    secondaryCount?: number;
    /** אחוז ביצוע — צינתורים שבוצעו ÷ המלצות */
    conversionPct?: number;
    isTotal?: boolean;
}
