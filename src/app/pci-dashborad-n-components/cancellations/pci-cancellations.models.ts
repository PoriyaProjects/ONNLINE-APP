/** מסננים משותפים לכל קצוות הביטולים — השרת מקבל baseYear + department בלבד */
export interface CancellationFilterParams {
    baseYear: string;
    department?: string;
}

/** תצוגות הגרף בדשבורד ביטולים */
export type CancellationView =
    | "yearly"
    | "monthly"
    | "reasons"
    | "room"
    | "reasons-by-dept";

/** מדדי תקופה מול תקופה (YTY) — חישוב צד-לקוח */
export interface CancellationYty {
    diff: number;
    pct: number | null;
}

/** מספר ביטולים שנתי — GetCancellationsYearly */
export interface CancellationYearRow {
    Year: number;
    Count: number;
}

/** מספר ביטולים חודשי — GetCancellationsMonthly */
export interface CancellationMonthRow {
    Year: number;
    Month: number;
    Count: number;
}

/** סיבות ביטול נפוצות — GetTopCancellationReasons */
export interface CancellationReasonRow {
    Reason: string;
    Count: number;
}

/** סיבות ביטול לפי מחלקה — GetCancellationReasonsByDepartment */
export interface CancellationReasonDeptRow {
    Department: string;
    Reason: string;
    Count: number;
}

/** האם החדר נשאר ריק או נכנס צינתור דחוף — GetRoomOutcome */
export interface RoomOutcomeRow {
    Outcome: string;
    Count: number;
}

/** שורת טבלה גנרית הנבנית בצד-לקוח */
export interface CancellationTableRow {
    label: string;
    /** ערכים לפי שנה — לתצוגות שנתי/חודשי */
    perYear?: { [year: number]: number };
    /** ערך בודד — לתצוגות סיבות/תוצאת חדר */
    count?: number;
    /** אחוז מסך הכל — לתצוגות סיבות/תוצאת חדר */
    pctOfTotal?: number;
    total?: number;
    diff?: number | null;
    pct?: number | null;
    isTotal?: boolean;
}
