/**
 * חוזה department ב-API ניתוחים — ערכי [מנתחת מאוגד] מ-SurgerydashboardForRoey.
 * אין להמיר או לנחש — רק ערכים אלה חוקיים לפרמטר department.
 */
export interface DepartmentFilterOption {
    /** שם תצוגה ב-UI */
    label: string;
    /** מזהה פנימי — נשלח כ-department ל-API */
    value: string;
}

export const VALID_SURGERY_DEPARTMENT_VALUES: readonly string[] = [
    "א.א.ג.",
    "אורולוגיה",
    "אורתופדיה",
    "אחר",
    "חזה ריאות",
    "ילדים",
    "כירורגיה",
    "כירורגיה לב",
    "כלי דם",
    "נשים",
    "עיניים",
    "פה ולסת",
    "פלסטיקה",
    "קרדיולוגיה",
];

const VALID_SURGERY_DEPARTMENT_SET = new Set(VALID_SURGERY_DEPARTMENT_VALUES);

export function isValidSurgeryDepartmentValue(value: string): boolean {
    return VALID_SURGERY_DEPARTMENT_SET.has((value || "").trim());
}

/** ברירת מחדל: label = value (ללא ניחוש שמות תצוגה). */
export function defaultSurgeryDepartmentOptions(): DepartmentFilterOption[] {
    return VALID_SURGERY_DEPARTMENT_VALUES.map((value) => ({
        label: value,
        value,
    }));
}
