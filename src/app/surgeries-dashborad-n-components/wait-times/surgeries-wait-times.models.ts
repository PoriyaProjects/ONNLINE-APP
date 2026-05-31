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
    | "procedures"
    | "emergency";

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

/** המלצות לפי מחלקה — GetRecommendationsByDepartment */
export interface RecommendationDeptRow {
    Department: string;
    Count: number;
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
    isTotal?: boolean;
}
