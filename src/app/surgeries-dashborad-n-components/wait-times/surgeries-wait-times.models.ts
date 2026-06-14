/** מסננים משותפים — השרת מקבל department לחתך החודשי בלבד */
export interface RecommendationFilterParams {
    baseYear: string;
    department?: string;
}

/** תצוגות הגרף בדשבורד המלצות לניתוח */
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

/** ניתוחים שבוצעו לפי חודש — GetMonthlyCounts_surgeries_dashborad */
export interface SurgeryMonthRow {
    Year: number;
    Month: number;
    Count: number;
}

/** המלצות לפי מחלקה — GetRecommendationsByDepartment */
export interface RecommendationDeptRow {
    Department: string;
    Count: number;
}

/** שורה גולמית — GetCountByDept_surgeries_dashborad */
export interface SurgeryCountByDeptRow {
    Year: number;
    Site: string;
    Department: string;
    Wing: string;
    Count: number;
    UnifiedSurgeryType?: string;
    Shift?: string;
    WeekPart?: string;
}

/** סיכום ניתוחים שבוצעו לפי מחלקה (אחרי סינון בוקר / אמצע שבוע / אלקטיבי) */
export interface SurgeryDeptAggregateRow {
    Department: string;
    Count: number;
}

/** שורה — GetCountByDoctor_surgeries_dashborad */
export interface SurgeryCountByDoctorRow {
    Year: number;
    DoctorName: string;
    Count: number;
}

/** סיכום ניתוחים שבוצעו לפי רופא */
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

/** הניתוחים המומלצים הנפוצים — GetTopRecommendedProcedures */
export interface RecommendationProcedureRow {
    Procedure: string;
    Count: number;
}

/** האם נכנס ניתוח דחוף במקום מבוטל — GetEmergencyReplacementAnalysis */
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
    /** סך כל הניתוחים שבוצעו באותו חודש (לא רק מומלצים) — אופציונלי */
    TotalSurgeries?: number;
    /** אחוז הניתוחים שבוצעו שמקורם בהמלצה (PerformedCount / TotalSurgeries) — אופציונלי */
    RecommendedShareOfPerformed?: number;
}

/**
 * מצבת ממתינים — GetRecommendationBacklog
 * מטופלים שסומנו "מומלץ לניתוח" וטרם בוצע להם ניתוח, לפי מחלקה.
 */
export interface RecommendationBacklogRow {
    Department: string;
    /** מספר ממתינים פעילים */
    WaitingCount: number;
    /** ממוצע ימי המתנה עד היום */
    AvgWaitingDays: number;
    /** מתוך הממתינים — כמה כבר נקבע להם תאריך לניתוח — אופציונלי */
    ScheduledCount?: number;
    /** ממוצע ימים מההמלצה ועד קביעת התור לניתוח — אופציונלי */
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
    /** ערך בודד — לתצוגות מחלקה/ניתוח/דחוף */
    count?: number;
    /** אחוז מסך הכל — לתצוגות מחלקה/ניתוח/דחוף */
    pctOfTotal?: number;
    total?: number;
    diff?: number | null;
    pct?: number | null;
    /** ערך משני — לתצוגת השוואה לפי מחלקה (ניתוחים שבוצעו) */
    secondaryCount?: number;
    /** אחוז ביצוע — ניתוחים שבוצעו ÷ המלצות */
    conversionPct?: number;
    isTotal?: boolean;
}
