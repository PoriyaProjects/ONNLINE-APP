/**
 * חוזה department ב-API צינתורים — ערכי [מנתחת מאוגד] מ-SurgerydashboardForRoey.
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

export function isValidPciDepartmentValue(value: string): boolean {
    return VALID_SURGERY_DEPARTMENT_SET.has((value || "").trim());
}

/**
 * קישור שם יחידה (UnitName) לערך [מנתחת מאוגד] — רק כשאין DepartmentValue מהשרת.
 * נדרש כי GetRecommendationsByDepartment מחזיר UnitName ולא Wing.
 */
export function inferPciDepartmentValue(unitName: string): string | undefined {
    const name = (unitName || "").trim();
    if (!name) {
        return undefined;
    }
    if (isValidPciDepartmentValue(name)) {
        return name;
    }

    for (const wing of VALID_SURGERY_DEPARTMENT_VALUES) {
        if (wing === "אחר") {
            continue;
        }
        if (name === wing || name.includes(wing)) {
            return wing;
        }
    }

    const hints: { test: (s: string) => boolean; wing: string }[] = [
        { test: (s) => /אף|אוזן|גרון|א\.א\.ג/.test(s), wing: "א.א.ג." },
        { test: (s) => /אורולוג/.test(s), wing: "אורולוגיה" },
        { test: (s) => /אורתופ/.test(s), wing: "אורתופדיה" },
        { test: (s) => /כירורגיה\s*לב|לב\s*וחזה/.test(s), wing: "כירורגיה לב" },
        { test: (s) => /חזה|ריאות/.test(s), wing: "חזה ריאות" },
        { test: (s) => /כלי\s*דם/.test(s), wing: "כלי דם" },
        { test: (s) => /ילד/.test(s), wing: "ילדים" },
        { test: (s) => /נשים|גינ|מיילד/.test(s), wing: "נשים" },
        { test: (s) => /עינ/.test(s), wing: "עיניים" },
        { test: (s) => /פה|לסת/.test(s), wing: "פה ולסת" },
        { test: (s) => /פלסט/.test(s), wing: "פלסטיקה" },
        { test: (s) => /קרדיו/.test(s), wing: "קרדיולוגיה" },
        { test: (s) => /כירורג/.test(s), wing: "כירורגיה" },
    ];

    for (const { test, wing } of hints) {
        if (test(name)) {
            return wing;
        }
    }
    return undefined;
}

/** כל המפתחות האפשריים לחיפוש צינתורים לפי שם יחידה / wing */
export function pciDepartmentMatchKeys(labelOrValue: string): string[] {
    const raw = (labelOrValue || "").trim();
    if (!raw) {
        return [];
    }
    const keys = new Set<string>([raw]);
    const inferred = inferPciDepartmentValue(raw);
    if (inferred) {
        keys.add(inferred);
    }
    if (isValidPciDepartmentValue(raw)) {
        keys.add(raw);
    }
    return [...keys];
}

/** ברירת מחדל: label = value (ללא ניחוש שמות תצוגה). */
export function defaultPciDepartmentOptions(): DepartmentFilterOption[] {
    return VALID_SURGERY_DEPARTMENT_VALUES.map((value) => ({
        label: value,
        value,
    }));
}
