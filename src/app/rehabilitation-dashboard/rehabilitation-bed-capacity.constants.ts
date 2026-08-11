/**
 * קיבולת מיטות קבועה לפי שנה – מקור: טבלת Excel (עדכון ידני בקוד).
 * כמעט לא משתנה; יוחלף בטבלה דינמית בעתיד.
 */

export interface DepartmentBedCapacity {
  department: string;
  beds: number;
}

/** קיבולת מיטות לפי שנה ומחלקה */
export const REHAB_BED_CAPACITY_BY_YEAR: Record<number, DepartmentBedCapacity[]> = {
  2024: [
    { department: 'גריאטריה שיקומית', beds: 18 },
  ],
  2025: [
    { department: 'גריאטריה שיקומית', beds: 18 },
    { department: 'שיקום כללי', beds: 18 },
    { department: 'שיקום ילדים', beds: 14 },
  ],
  2026: [
    { department: 'גריאטריה שיקומית', beds: 18 },
    { department: 'שיקום כללי', beds: 35 },
    { department: 'שיקום ילדים', beds: 14 },
  ],
};

/** מספר ימים בחודש לפי שנה (לחישובי תפוסה מצטברים) */
export const DAYS_IN_MONTH: Record<number, number[]> = {
  2024: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  2025: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  2026: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
};

export function getBedCapacityForYear(year: number): DepartmentBedCapacity[] {
  if (REHAB_BED_CAPACITY_BY_YEAR[year]) {
    return REHAB_BED_CAPACITY_BY_YEAR[year].map((d) => ({ ...d }));
  }
  const years = Object.keys(REHAB_BED_CAPACITY_BY_YEAR).map(Number).sort((a, b) => b - a);
  const fallbackYear = years.find((y) => y <= year) || years[0];
  return REHAB_BED_CAPACITY_BY_YEAR[fallbackYear].map((d) => ({ ...d }));
}

export function getTotalBedsForYear(year: number): number {
  return getBedCapacityForYear(year).reduce((sum, d) => sum + d.beds, 0);
}

export function getBedsForDepartment(year: number, department: string): number {
  const row = getBedCapacityForYear(year).find((d) => d.department === department);
  return row ? row.beds : 0;
}

export function getInpatientDepartmentsWithBeds(year: number): string[] {
  return getBedCapacityForYear(year).map((d) => d.department);
}

/** שמות מחלקה כפי שמוחזרים מ-Chameleon → שם תצוגה בדשבורד */
export const REHAB_OCCUPANCY_DEPARTMENT_ALIASES: Record<string, string> = {
  'המחלקה לגריאטריה שיקומית': 'גריאטריה שיקומית',
  'מחלקה לגריאטריה שיקומית': 'גריאטריה שיקומית',
  'גריאטריה שיקומית': 'גריאטריה שיקומית',
  'מחלקת שיקום כללי': 'שיקום כללי',
  'שיקום כללי': 'שיקום כללי',
  'מחלקת שיקום ילדים': 'שיקום ילדים',
  'שיקום ילדים': 'שיקום ילדים',
};

/** סדר תצוגה קבוע — רק מחלקות אלו מוצגות בתפוסה */
export const REHAB_OCCUPANCY_DEPARTMENT_ORDER: readonly string[] = [
  'גריאטריה שיקומית',
  'שיקום כללי',
  'שיקום ילדים',
];

export function mapToOccupancyDepartment(apiName: string): string | null {
  const normalized = apiName.trim().replace(/\s+/g, ' ');
  return REHAB_OCCUPANCY_DEPARTMENT_ALIASES[normalized] ?? null;
}

export function getOccupancyDepartmentsForYear(
  year: number,
  selectedDepartments: string[] = [],
): DepartmentBedCapacity[] {
  const capacity = getBedCapacityForYear(year).filter((row) =>
    REHAB_OCCUPANCY_DEPARTMENT_ORDER.includes(row.department));
  const ordered = REHAB_OCCUPANCY_DEPARTMENT_ORDER
    .map((name) => capacity.find((row) => row.department === name))
    .filter((row): row is DepartmentBedCapacity => !!row);
  if (!selectedDepartments.length) {
    return ordered;
  }
  const selected = new Set(selectedDepartments);
  return ordered.filter((row) => selected.has(row.department));
}
