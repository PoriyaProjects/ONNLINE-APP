/**
 * מיפוי שם מחלקה מפנה (UnitName בהמלצות) → Wing בנתוני ניתוחים ([מנתחת מאוגד]).
 * GetMonthlyCounts / GetCountByDept משתמשים ב-Wing; GetDepartmentMonthlyRecommendations ב-UnitName.
 */
export const KNOWN_SURGERY_WINGS = [
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
] as const;

/** מיפוי מפורש לשמות ידועים במערכת */
const EXACT_UNIT_TO_WING: Record<string, string> = {
    "מרפאה אף אוזן גרון": "א.א.ג.",
    "מרפאת עיניים": "עיניים",
    "מרפאות כירורגיה כללית": "כירורגיה",
    "מרפאת קולורקטלית ופרקטולוגיה": "כירורגיה",
    "מרפאה אורתופדית עמוד שדרה": "אורתופדיה",
    "מרפאת אורוגיניקולוגית": "אורולוגיה",
    "מכון ריאות": "חזה ריאות",
};

function normalizeClinicName(name: string): string {
    return (name || "")
        .replace(/^מרפא(?:ה|ת)\s+/u, "")
        .replace(/^מרפאות\s+/u, "")
        .replace(/^מכון\s+/u, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** כל ה-Wings האפשריים ליחידת מפנה (לסכימה ב-GetCountByDept). */
export function surgeryWingsForReferringUnit(unitName: string): string[] {
    const exact = referringUnitToSurgeryWing(unitName);
    if (!exact) {
        return [];
    }
    const n = (unitName || "").trim();
    const norm = normalizeClinicName(n);
    const wings = new Set<string>([exact]);

    if (/כירורגיה/u.test(n) && !/לב|חזה/u.test(n)) {
        wings.add("כירורגיה");
    }
    if (/אורוגינ|גיניק/u.test(n)) {
        wings.add("נשים");
    }
    if (/שדרה|אורתופד/u.test(norm)) {
        wings.add("אורתופדיה");
    }

    return [...wings];
}

/**
 * מחזיר Wing יחיד לשליחה ל-GetMonthlyCounts (פרמטר department = מנתחת מאוגד).
 */
export function referringUnitToSurgeryWing(unitName: string): string | null {
    const n = (unitName || "").trim();
    if (!n) {
        return null;
    }

    if (EXACT_UNIT_TO_WING[n]) {
        return EXACT_UNIT_TO_WING[n];
    }

    const norm = normalizeClinicName(n);

    if (/אף|אוזן|גרון|א\.א\.ג/u.test(n) || /אף|גרון/u.test(norm)) {
        return "א.א.ג.";
    }
    if (/עיניים/u.test(n) || norm.includes("עיניים")) {
        return "עיניים";
    }
    if (/אורתופד|שדרה/u.test(n) || /אורתופד|שדרה/u.test(norm)) {
        return "אורתופדיה";
    }
    if (/אורולוג|אורוגינ|גיניק/u.test(n)) {
        return "אורולוגיה";
    }
    if (/קולורקט|פרקטול|כירורגיה כללית/u.test(n)) {
        return "כירורגיה";
    }
    if (/כירורגיה לב/u.test(n)) {
        return "כירורגיה לב";
    }
    if (/כירורגיה חזה|חזה ריאות|ריאות/u.test(n)) {
        return "חזה ריאות";
    }
    if (/כירורגיה/u.test(n) || norm.includes("כירורגיה")) {
        return "כירורגיה";
    }
    if (/פה|לסת/u.test(n)) {
        return "פה ולסת";
    }
    if (/ילדים/u.test(n)) {
        return "ילדים";
    }
    if (/פלסטיק/u.test(n)) {
        return "פלסטיקה";
    }
    if (/כלי דם/u.test(n)) {
        return "כלי דם";
    }
    if (/קרדיולוג|לב/u.test(n)) {
        return "קרדיולוגיה";
    }
    if (/נשים/u.test(n)) {
        return "נשים";
    }

    const wingHit = KNOWN_SURGERY_WINGS.find(
        (w) => w === n || w === norm || n.includes(w) || w.includes(norm),
    );
    return wingHit ?? null;
}

export function referringUnitMatchesSurgeryKey(
    unitName: string,
    surgeryKey: string,
): boolean {
    const key = (surgeryKey || "").trim();
    if (!key) {
        return false;
    }
    const wings = surgeryWingsForReferringUnit(unitName);
    if (wings.includes(key)) {
        return true;
    }
    const n = (unitName || "").trim();
    if (n === key) {
        return true;
    }
    const norm = normalizeClinicName(n);
    const normKey = normalizeClinicName(key);
    return (
        n.includes(key) ||
        key.includes(n) ||
        (!!norm &&
            !!normKey &&
            (norm.includes(normKey) || normKey.includes(norm)))
    );
}
